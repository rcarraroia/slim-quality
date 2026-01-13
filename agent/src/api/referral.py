"""
API de Tracking de Referrals
Endpoints para registrar cliques e conversões de afiliados
"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import os
from supabase import create_client, Client

router = APIRouter(prefix="/api/referral", tags=["referral"])

# Cliente Supabase
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_KEY")
supabase: Client = create_client(supabase_url, supabase_key)


class TrackClickRequest(BaseModel):
    referral_code: str
    url: Optional[str] = None
    user_agent: Optional[str] = None
    referer: Optional[str] = None
    utm_source: Optional[str] = None
    utm_medium: Optional[str] = None
    utm_campaign: Optional[str] = None
    utm_content: Optional[str] = None
    utm_term: Optional[str] = None
    clicked_at: Optional[str] = None


class TrackConversionRequest(BaseModel):
    referral_code: str
    order_id: str
    order_value_cents: int
    utm_source: Optional[str] = None
    utm_medium: Optional[str] = None
    utm_campaign: Optional[str] = None
    utm_content: Optional[str] = None
    utm_term: Optional[str] = None
    converted_at: Optional[str] = None


@router.post("/track-click")
async def track_click(data: TrackClickRequest, request: Request):
    """
    Registra clique em link de afiliado
    """
    try:
        # Buscar affiliate_id pelo código
        affiliate_response = supabase.table("affiliates").select("id").eq(
            "referral_code", data.referral_code
        ).eq("status", "active").is_("deleted_at", "null").maybe_single().execute()
        
        if not affiliate_response.data:
            raise HTTPException(status_code=404, detail="Afiliado não encontrado")
        
        affiliate_id = affiliate_response.data["id"]
        
        # Obter IP do cliente
        client_ip = request.client.host if request.client else "unknown"
        
        # Registrar clique
        click_data = {
            "referral_code": data.referral_code,
            "affiliate_id": affiliate_id,
            "ip_address": client_ip,
            "user_agent": data.user_agent,
            "referer": data.referer,
            "utm_source": data.utm_source,
            "utm_medium": data.utm_medium,
            "utm_campaign": data.utm_campaign,
            "utm_content": data.utm_content,
            "utm_term": data.utm_term,
            "clicked_at": data.clicked_at or datetime.utcnow().isoformat()
        }
        
        result = supabase.table("referral_clicks").insert(click_data).execute()
        
        return {
            "success": True,
            "message": "Clique registrado com sucesso",
            "click_id": result.data[0]["id"] if result.data else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Erro ao registrar clique: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao registrar clique: {str(e)}")


@router.post("/track-conversion")
async def track_conversion(data: TrackConversionRequest):
    """
    Registra conversão (venda) de afiliado
    """
    try:
        # Buscar affiliate_id pelo código
        affiliate_response = supabase.table("affiliates").select("id").eq(
            "referral_code", data.referral_code
        ).eq("status", "active").is_("deleted_at", "null").maybe_single().execute()
        
        if not affiliate_response.data:
            raise HTTPException(status_code=404, detail="Afiliado não encontrado")
        
        affiliate_id = affiliate_response.data["id"]
        
        # Buscar pedido
        order_response = supabase.table("orders").select("customer_id").eq(
            "id", data.order_id
        ).maybe_single().execute()
        
        if not order_response.data:
            raise HTTPException(status_code=404, detail="Pedido não encontrado")
        
        customer_id = order_response.data["customer_id"]
        
        # Registrar conversão
        conversion_data = {
            "referral_code": data.referral_code,
            "affiliate_id": affiliate_id,
            "order_id": data.order_id,
            "order_value_cents": data.order_value_cents,
            "utm_source": data.utm_source,
            "utm_medium": data.utm_medium,
            "utm_campaign": data.utm_campaign,
            "utm_content": data.utm_content,
            "utm_term": data.utm_term,
            "converted_at": data.converted_at or datetime.utcnow().isoformat(),
            "customer_id": customer_id,
            "status": "confirmed"
        }
        
        result = supabase.table("referral_conversions").insert(conversion_data).execute()
        
        return {
            "success": True,
            "message": "Conversão registrada com sucesso",
            "conversion_id": result.data[0]["id"] if result.data else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Erro ao registrar conversão: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao registrar conversão: {str(e)}")
