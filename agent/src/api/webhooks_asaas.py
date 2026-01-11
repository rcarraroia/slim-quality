"""
Webhook handler para processar notificações do Asaas em Python (FastAPI)
Portado de src/api/routes/webhooks/asaas-webhook.ts
"""

from fastapi import APIRouter, Request, Header, HTTPException, BackgroundTasks
import hmac
import hashlib
import json
import os
import structlog
from datetime import datetime
from typing import Optional, Dict, Any, List
from ..services.supabase_client import get_supabase_client

router = APIRouter(prefix="/webhooks", tags=["webhooks"])
logger = structlog.get_logger(__name__)

# Eventos suportados pelo webhook
SUPPORTED_EVENTS = {
    'PAYMENT_RECEIVED': 'handle_payment_received',
    'PAYMENT_CONFIRMED': 'handle_payment_confirmed',
    'PAYMENT_SPLIT_CANCELLED': 'handle_split_error',
    'PAYMENT_SPLIT_DIVERGENCE_BLOCK': 'handle_split_error',
    'PAYMENT_OVERDUE': 'handle_payment_overdue',
    'PAYMENT_REFUNDED': 'handle_payment_refunded'
}

def verify_asaas_signature(payload: str, signature: str) -> bool:
    """
    Verifica a assinatura do webhook do Asaas
    """
    webhook_secret = os.getenv('ASAAS_WEBHOOK_TOKEN') or os.getenv('ASAAS_WEBHOOK_SECRET')
    if not webhook_secret:
        logger.warning("ASAAS_WEBHOOK_SECRET não configurado - pulando validação em dev")
        return True # Permitir se não configurado (dev)

    if not signature:
        return False

    try:
        expected_signature = hmac.new(
            webhook_secret.encode('utf-8'),
            payload.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()

        return hmac.compare_digest(signature, expected_signature)
    except Exception as e:
        logger.error("Erro ao verificar assinatura", error=str(e))
        return False

@router.post("/asaas")
async def asaas_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    x_asaas_signature: Optional[str] = Header(None)
):
    """
    Endpoint principal para o webhook do Asaas
    """
    body_bytes = await request.body()
    body_str = body_bytes.decode('utf-8')
    
    # Verificar assinatura em produção
    if os.getenv('ENVIRONMENT') == 'production' or x_asaas_signature:
        if not verify_asaas_signature(body_str, x_asaas_signature):
            logger.error("Assinatura do webhook Asaas inválida")
            raise HTTPException(status_code=401, detail="Invalid signature")

    try:
        data = json.loads(body_str)
        event = data.get('event')
        payment = data.get('payment', {})
        
        logger.info("Recebido webhook Asaas", event=event, payment_id=payment.get('id'))

        if event not in SUPPORTED_EVENTS:
            logger.info("Evento Asaas não suportado", event=event)
            return {"message": "Evento não suportado", "event": event}

        # Processar em background para responder rápido ao Asaas
        background_tasks.add_task(process_asaas_event, data)

        return {"status": "received", "event": event}

    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")
    except Exception as e:
        logger.error("Erro crítico no webhook Asaas", error=str(e))
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/asaas/health")
async def asaas_health():
    """Health check do webhook"""
    return {
        "status": "ok",
        "timestamp": datetime.now().isoformat(),
        "supported_events": list(SUPPORTED_EVENTS.keys())
    }

async def process_asaas_event(data: Dict[str, Any]):
    """
    Processa o evento do Asaas
    """
    event = data.get('event')
    payment = data.get('payment', {})
    payment_id = payment.get('id')
    external_ref = payment.get('externalReference')
    
    start_time = datetime.now()
    supabase = get_supabase_client()
    result = {"success": False}

    try:
        # Buscar Order ID
        order_id = await find_order_id(supabase, payment_id, external_ref)
        if not order_id:
            logger.error("Pedido não encontrado para webhook Asaas", payment_id=payment_id)
            result["error"] = "Order not found"
        else:
            # Dispatchers
            if event == 'PAYMENT_RECEIVED':
                result = await handle_payment_received(supabase, order_id, payment)
            elif event == 'PAYMENT_CONFIRMED':
                result = await handle_payment_confirmed(supabase, order_id, payment)
            elif event in ['PAYMENT_SPLIT_CANCELLED', 'PAYMENT_SPLIT_DIVERGENCE_BLOCK']:
                result = await handle_split_error(supabase, order_id, event, payment)
            elif event == 'PAYMENT_OVERDUE':
                result = await handle_payment_status_update(supabase, order_id, 'overdue', payment)
            elif event == 'PAYMENT_REFUNDED':
                result = await handle_payment_refunded(supabase, order_id, payment)

        # Logar o evento
        processing_time = (datetime.now() - start_time).total_seconds() * 1000
        await log_webhook_event(supabase, data, result, processing_time)

    except Exception as e:
        logger.error("Erro ao processar evento Asaas", event=event, error=str(e))

async def find_order_id(supabase, payment_id: str, external_ref: Optional[str]) -> Optional[str]:
    """Busca o ID do pedido vinculado ao pagamento"""
    # 1. Tentar por externalReference (UUID do pedido)
    if external_ref:
        res = supabase.table('orders').select('id').eq('id', external_ref).execute()
        if res.data:
            return res.data[0]['id']
    
    # 2. Buscar na tabela payments
    res = supabase.table('payments').select('order_id').eq('asaas_payment_id', payment_id).execute()
    if res.data:
        return res.data[0]['order_id']
    
    return None

async def handle_payment_received(supabase, order_id: str, payment: Dict[str, Any]):
    """Atualiza pedido para processing"""
    supabase.table('orders').update({
        'status': 'processing',
        'updated_at': datetime.now().isoformat()
    }).eq('id', order_id).execute()
    
    supabase.table('payments').update({
        'status': 'received',
        'updated_at': datetime.now().isoformat()
    }).eq('asaas_payment_id', payment.get('id')).execute()
    
    return {"success": True, "order_id": order_id}

async def handle_payment_confirmed(supabase, order_id: str, payment: Dict[str, Any]):
    """Confirma pagamento e dispara cálculo de split"""
    # 1. Atualizar pedido e pagamento
    supabase.table('orders').update({
        'status': 'paid',
        'paid_at': payment.get('paymentDate') or datetime.now().isoformat(),
        'updated_at': datetime.now().isoformat()
    }).eq('id', order_id).execute()
    
    supabase.table('payments').update({
        'status': 'confirmed',
        'updated_at': datetime.now().isoformat()
    }).eq('asaas_payment_id', payment.get('id')).execute()
    
    # 2. Chamar RPC de comissões
    try:
        supabase.rpc('calculate_commission_split', {'p_order_id': order_id}).execute()
        return {"success": True, "order_id": order_id, "commissions_calculated": True}
    except Exception as e:
        logger.error("Erro ao calcular comissões via RPC", order_id=order_id, error=str(e))
        return {"success": True, "order_id": order_id, "commissions_error": str(e)}

async def handle_payment_status_update(supabase, order_id: str, status: str, payment: Dict[str, Any]):
    """Atualização genérica de status"""
    supabase.table('orders').update({
        'status': status,
        'updated_at': datetime.now().isoformat()
    }).eq('id', order_id).execute()
    
    supabase.table('payments').update({
        'status': status,
        'updated_at': datetime.now().isoformat()
    }).eq('asaas_payment_id', payment.get('id')).execute()
    
    return {"success": True, "order_id": order_id}

async def handle_payment_refunded(supabase, order_id: str, payment: Dict[str, Any]):
    """Processa estorno"""
    await handle_payment_status_update(supabase, order_id, 'refunded', payment)
    
    # Cancelar comissões
    supabase.table('commissions').update({
        'status': 'cancelled',
        'updated_at': datetime.now().isoformat()
    }).eq('order_id', order_id).execute()
    
    return {"success": True, "order_id": order_id, "commissions_cancelled": True}

async def handle_split_error(supabase, order_id: str, event: str, payment: Dict[str, Any]):
    """Loga erro de split"""
    supabase.table('commission_logs').insert({
        'order_id': order_id,
        'action': 'SPLIT_ERROR',
        'details': json.dumps({
            'event': event,
            'payment_id': payment.get('id'),
            'split': payment.get('split'),
            'error_at': datetime.now().isoformat()
        })
    }).execute()
    return {"success": False, "error": f"Split error: {event}", "order_id": order_id}

async def log_webhook_event(supabase, payload: Dict[str, Any], result: Dict[str, Any], processing_time: float):
    """Grava log na tabela webhook_logs"""
    try:
        supabase.table('webhook_logs').insert({
            'provider': 'asaas',
            'event_type': payload.get('event'),
            'payment_id': payload.get('payment', {}).get('id'),
            'status': 'success' if result.get('success') else 'error',
            'payload': payload,
            'processing_result': result,
            'processing_time_ms': processing_time,
            'processed_at': datetime.now().isoformat()
        }).execute()
    except Exception as e:
        logger.error("Erro ao gravar log de webhook", error=str(e))
