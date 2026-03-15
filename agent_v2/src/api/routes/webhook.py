"""Rota de webhook Evolution API"""
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional
from ...core.config import settings
from ...core.redis import redis_client
from ...services.audio_service import audio_service

router = APIRouter(prefix="/webhook", tags=["webhook"])


class WebhookMessage(BaseModel):
    """Mensagem recebida do webhook"""
    instance: str
    data: dict


@router.post("/evolution")
async def evolution_webhook(
    message: WebhookMessage,
    x_webhook_token: Optional[str] = Header(None)
):
    """Recebe webhook da Evolution API"""
    
    # Validar token de segurança
    if x_webhook_token != settings.webhook_secret_token:
        raise HTTPException(status_code=401, detail="Token inválido")
    
    # Extrair dados
    data = message.data
    message_type = data.get("messageType")
    from_phone = data.get("key", {}).get("remoteJid", "").replace("@s.whatsapp.net", "")
    
    # Processar apenas mensagens de texto e áudio
    if message_type not in ["conversation", "audioMessage"]:
        return {"success": True, "message": "Tipo de mensagem não suportado"}
    
    # Extrair conteúdo
    if message_type == "conversation":
        content = data.get("message", {}).get("conversation", "")
    elif message_type == "audioMessage":
        audio_base64 = data.get("message", {}).get("audioMessage", {}).get("audio", "")
        # Transcrever áudio
        content = await audio_service.transcribe_audio(audio_base64)
    
    # Enfileirar para processamento assíncrono
    await redis_client.enqueue("bia_messages", {
        "instance": message.instance,
        "from_phone": from_phone,
        "content": content,
        "message_type": message_type
    })
    
    return {"success": True, "message": "Mensagem enfileirada"}
