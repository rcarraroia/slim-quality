"""
Webhook endpoints para integração com Evolution API
"""
import asyncio
import hashlib
import hmac
import json
import time
from datetime import datetime, timezone
from typing import Dict, Any, Optional

import structlog
from fastapi import APIRouter, Request, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field

from ..config import get_settings
from ..utils.logging import (
    get_logger,
    log_webhook_received,
    log_webhook_processed,
    log_error,
    log_performance
)

logger = structlog.get_logger(__name__)
router = APIRouter()

# Métricas de webhook
webhook_metrics = {
    "received": 0,
    "processed": 0,
    "failed": 0,
    "avg_processing_time": 0.0
}


class WebhookMessage(BaseModel):
    """Modelo para mensagem de webhook da Evolution API"""
    key: Dict[str, Any]
    message: Dict[str, Any]
    messageTimestamp: Optional[int] = None
    pushName: Optional[str] = None
    participant: Optional[str] = None


class EvolutionWebhookPayload(BaseModel):
    """Payload completo do webhook Evolution API"""
    event: str = Field(..., description="Tipo do evento")
    instance: str = Field(..., description="Nome da instância")
    data: Dict[str, Any] = Field(..., description="Dados do evento")
    destination: Optional[str] = Field(None, description="Destino da mensagem")
    date_time: Optional[str] = Field(None, description="Timestamp do evento")


def verify_webhook_signature(payload: bytes, signature: str, secret: str) -> bool:
    """
    Verifica assinatura HMAC do webhook.
    
    Args:
        payload: Payload bruto do webhook
        signature: Assinatura recebida no header
        secret: Chave secreta para validação
        
    Returns:
        True se assinatura válida, False caso contrário
    """
    try:
        # Calcular HMAC esperado
        expected_signature = hmac.new(
            secret.encode('utf-8'),
            payload,
            hashlib.sha256
        ).hexdigest()
        
        # Comparar assinaturas de forma segura
        return hmac.compare_digest(f"sha256={expected_signature}", signature)
        
    except Exception as e:
        logger.error(f"verify_webhook_signature: Erro ao verificar: {e}")
        return False


async def process_message_webhook(payload: EvolutionWebhookPayload, request_id: str) -> Dict[str, Any]:
    """
    Processa webhook de mensagem recebida.
    
    Args:
        payload: Dados do webhook
        request_id: ID único da requisição
        
    Returns:
        Resultado do processamento
    """
    start_time = time.time()
    
    try:
        logger.info(
            "process_message_webhook: Processando mensagem",
            request_id=request_id,
            event=payload.event,
            instance=payload.instance
        )
        
        # Extrair dados da mensagem
        message_data = payload.data
        
        # Verificar se é mensagem de texto
        if not message_data.get('message', {}).get('conversation'):
            logger.info(
                "process_message_webhook: Mensagem não é texto, ignorando",
                request_id=request_id,
                message_type=type(message_data.get('message', {}))
            )
            return {"status": "ignored", "reason": "not_text_message"}
        
        # Extrair informações da mensagem
        phone_number = message_data.get('key', {}).get('remoteJid', '').replace('@s.whatsapp.net', '')
        message_text = message_data.get('message', {}).get('conversation', '')
        sender_name = message_data.get('pushName', 'Usuário')
        
        if not phone_number or not message_text:
            logger.warning(
                "process_message_webhook: Dados incompletos",
                request_id=request_id,
                phone=phone_number,
                message_length=len(message_text)
            )
            return {"status": "error", "reason": "incomplete_data"}
        
        logger.info(
            "process_message_webhook: Mensagem extraída",
            request_id=request_id,
            phone=phone_number[:4] + "****",  # Mascarar telefone
            sender=sender_name,
            message_length=len(message_text)
        )
        
        # Processar com SICC
        try:
            from ..services.sicc.sicc_service import SICCService
            
            sicc = SICCService()
            
            # Processar mensagem
            response = await asyncio.wait_for(
                sicc.process_message(
                    message=message_text,
                    user_id=phone_number,
                    context={
                        "sender_name": sender_name,
                        "platform": "whatsapp",
                        "instance": payload.instance,
                        "request_id": request_id
                    }
                ),
                timeout=30.0  # 30 segundos timeout
            )
            
            # Enviar resposta via Evolution API
            if response and response.get('response'):
                await send_whatsapp_message(
                    phone_number=phone_number,
                    message=response['response'],
                    instance=payload.instance,
                    request_id=request_id
                )
            
            processing_time = (time.time() - start_time) * 1000
            
            logger.info(
                "process_message_webhook: Processamento concluído",
                request_id=request_id,
                processing_time_ms=processing_time,
                response_sent=bool(response and response.get('response'))
            )
            
            return {
                "status": "success",
                "processing_time_ms": processing_time,
                "response_sent": bool(response and response.get('response'))
            }
            
        except asyncio.TimeoutError:
            logger.error(
                "process_message_webhook: Timeout no processamento SICC",
                request_id=request_id
            )
            return {"status": "timeout", "reason": "sicc_timeout"}
            
        except Exception as e:
            logger.error(
                "process_message_webhook: Erro no SICC",
                request_id=request_id,
                error=str(e),
                exc_info=True
            )
            return {"status": "error", "reason": f"sicc_error: {str(e)}"}
        
    except Exception as e:
        processing_time = (time.time() - start_time) * 1000
        logger.error(
            "process_message_webhook: Erro geral",
            request_id=request_id,
            error=str(e),
            processing_time_ms=processing_time,
            exc_info=True
        )
        return {"status": "error", "reason": f"general_error: {str(e)}"}


async def send_whatsapp_message(phone_number: str, message: str, instance: str, request_id: str) -> bool:
    """
    Envia mensagem via Evolution API.
    
    Args:
        phone_number: Número do telefone
        message: Mensagem a ser enviada
        instance: Nome da instância Evolution
        request_id: ID da requisição
        
    Returns:
        True se enviado com sucesso, False caso contrário
    """
    try:
        import httpx
        
        settings = get_settings()
        
        # URL da Evolution API
        url = f"{settings.evolution_url}/message/sendText/{instance}"
        
        # Payload para envio
        payload = {
            "number": f"{phone_number}@s.whatsapp.net",
            "text": message
        }
        
        # Headers
        headers = {
            "Content-Type": "application/json",
            "apikey": settings.evolution_api_key
        }
        
        # Enviar mensagem
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(url, json=payload, headers=headers)
            
        if response.status_code == 200:
            logger.info(
                "send_whatsapp_message: Mensagem enviada",
                request_id=request_id,
                phone=phone_number[:4] + "****",
                message_length=len(message)
            )
            return True
        else:
            logger.error(
                "send_whatsapp_message: Erro no envio",
                request_id=request_id,
                status_code=response.status_code,
                response=response.text
            )
            return False
            
    except Exception as e:
        logger.error(
            "send_whatsapp_message: Exceção no envio",
            request_id=request_id,
            error=str(e),
            exc_info=True
        )
        return False


async def process_webhook_background(payload: EvolutionWebhookPayload, request_id: str):
    """
    Processa webhook em background task.
    
    Args:
        payload: Dados do webhook
        request_id: ID da requisição
    """
    start_time = time.time()
    
    try:
        # Processar baseado no tipo de evento
        if payload.event in ["messages.upsert"]:
            result = await process_message_webhook(payload, request_id)
        else:
            logger.info(
                "process_webhook_background: Evento ignorado",
                request_id=request_id,
                event=payload.event
            )
            result = {"status": "ignored", "reason": "unsupported_event"}
        
        # Atualizar métricas
        processing_time = (time.time() - start_time) * 1000
        
        if result.get("status") == "success":
            webhook_metrics["processed"] += 1
        else:
            webhook_metrics["failed"] += 1
            
        # Atualizar tempo médio
        webhook_metrics["avg_processing_time"] = (
            webhook_metrics["avg_processing_time"] + processing_time
        ) / 2
        
        # Log final
        log_webhook_processed(
            webhook_type=payload.event,
            success=(result.get("status") == "success"),
            duration_ms=int(processing_time),
            request_id=request_id
        )
        
    except Exception as e:
        webhook_metrics["failed"] += 1
        log_error(e, {"request_id": request_id, "event": payload.event})


@router.post("/webhooks/evolution")
async def evolution_webhook(
    request: Request,
    background_tasks: BackgroundTasks
) -> Dict[str, Any]:
    """
    Endpoint para receber webhooks da Evolution API.
    
    Processa mensagens do WhatsApp e responde via SICC.
    
    Returns:
        Confirmação de recebimento
    """
    import uuid
    
    request_id = str(uuid.uuid4())[:8]
    start_time = time.time()
    
    try:
        # Ler payload
        body = await request.body()
        
        # Verificar se há conteúdo
        if not body:
            raise HTTPException(status_code=400, detail="Empty payload")
        
        # Parse JSON
        try:
            payload_dict = json.loads(body.decode('utf-8'))
        except json.JSONDecodeError as e:
            logger.error(
                "evolution_webhook: JSON inválido",
                request_id=request_id,
                error=str(e)
            )
            raise HTTPException(status_code=400, detail="Invalid JSON")
        
        # Validar payload
        try:
            payload = EvolutionWebhookPayload(**payload_dict)
        except Exception as e:
            logger.error(
                "evolution_webhook: Payload inválido",
                request_id=request_id,
                error=str(e),
                payload=payload_dict
            )
            raise HTTPException(status_code=400, detail="Invalid payload structure")
        
        # Verificar assinatura (opcional, se configurado)
        settings = get_settings()
        if hasattr(settings, 'webhook_secret') and settings.webhook_secret:
            signature = request.headers.get('x-signature', '')
            if not verify_webhook_signature(body, signature, settings.webhook_secret):
                logger.warning(
                    "evolution_webhook: Assinatura inválida",
                    request_id=request_id
                )
                raise HTTPException(status_code=401, detail="Invalid signature")
        
        # Log recebimento
        log_webhook_received(
            webhook_type=payload.event,
            source="evolution_api",
            request_id=request_id
        )
        
        # Atualizar métricas
        webhook_metrics["received"] += 1
        
        # Processar em background
        background_tasks.add_task(
            process_webhook_background,
            payload,
            request_id
        )
        
        # Resposta imediata
        response_time = (time.time() - start_time) * 1000
        
        logger.info(
            "evolution_webhook: Webhook aceito",
            request_id=request_id,
            event=payload.event,
            instance=payload.instance,
            response_time_ms=response_time
        )
        
        return {
            "status": "accepted",
            "request_id": request_id,
            "event": payload.event,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "evolution_webhook: Erro inesperado",
            request_id=request_id,
            error=str(e),
            exc_info=True
        )
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/webhooks/metrics")
async def webhook_metrics_endpoint() -> Dict[str, Any]:
    """
    Endpoint para métricas de webhooks.
    
    Returns:
        Métricas atuais dos webhooks
    """
    return {
        "metrics": webhook_metrics,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "uptime_seconds": time.time()
    }