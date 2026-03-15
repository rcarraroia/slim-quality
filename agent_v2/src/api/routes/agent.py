"""Rotas do agente BIA"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional
from ..middleware.auth import security, verify_jwt
from ...services.evolution_service import evolution_service
from ...services.napkin_service import napkin_service
from ...core.database import db

router = APIRouter(prefix="/agent", tags=["agent"])


class ActivateRequest(BaseModel):
    """Request para ativar agente"""
    pass


class ConfigUpdateRequest(BaseModel):
    """Request para atualizar configuração"""
    agent_name: Optional[str] = None
    agent_personality: Optional[str] = None
    tone: Optional[str] = None
    knowledge_enabled: Optional[bool] = None
    tts_enabled: Optional[bool] = None


@router.post("/activate")
async def activate_agent(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Ativa agente e gera QR Code"""
    auth_data = await verify_jwt(credentials)
    tenant_id = auth_data["tenant_id"]
    
    # Criar instância Evolution
    instance_name = f"bia_{tenant_id}"
    
    try:
        await evolution_service.create_instance(instance_name)
        qr_code = await evolution_service.get_qr_code(instance_name)
        
        return {
            "success": True,
            "qr_code": qr_code,
            "instance_name": instance_name
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status")
async def get_agent_status(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Busca status do agente"""
    auth_data = await verify_jwt(credentials)
    tenant_id = auth_data["tenant_id"]
    
    instance_name = f"bia_{tenant_id}"
    
    try:
        status = await evolution_service.get_instance_status(instance_name)
        return {"success": True, "status": status}
    except:
        return {"success": True, "status": {"state": "disconnected"}}


@router.post("/qr-code")
async def regenerate_qr_code(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Regenera QR Code"""
    auth_data = await verify_jwt(credentials)
    tenant_id = auth_data["tenant_id"]
    
    instance_name = f"bia_{tenant_id}"
    
    try:
        qr_code = await evolution_service.get_qr_code(instance_name)
        return {"success": True, "qr_code": qr_code}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



@router.post("/disconnect")
async def disconnect_agent(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Desconecta agente"""
    auth_data = await verify_jwt(credentials)
    tenant_id = auth_data["tenant_id"]
    
    instance_name = f"bia_{tenant_id}"
    
    try:
        await evolution_service.disconnect_instance(instance_name)
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/config")
async def get_agent_config(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Busca configuração do agente"""
    auth_data = await verify_jwt(credentials)
    tenant_id = auth_data["tenant_id"]
    
    config = await db.get_agent_config(tenant_id)
    
    if not config:
        return {
            "agent_name": "BIA",
            "tone": "amigavel",
            "knowledge_enabled": True,
            "tts_enabled": True
        }
    
    return config


@router.put("/config")
async def update_agent_config(
    request: ConfigUpdateRequest,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Atualiza configuração do agente"""
    auth_data = await verify_jwt(credentials)
    tenant_id = auth_data["tenant_id"]
    
    # Atualizar no banco
    update_data = request.dict(exclude_none=True)
    
    response = db.client.table("bia_agent_config")\
        .update(update_data)\
        .eq("tenant_id", tenant_id)\
        .execute()
    
    return {"success": True, "config": response.data[0] if response.data else None}


@router.get("/napkin")
async def get_napkin(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Lista aprendizados do napkin"""
    auth_data = await verify_jwt(credentials)
    tenant_id = auth_data["tenant_id"]
    
    napkin = await napkin_service.list_napkin(tenant_id)
    return {"success": True, "napkin": napkin}


@router.delete("/napkin/{napkin_id}")
async def delete_napkin_item(
    napkin_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Deleta aprendizado do napkin"""
    await verify_jwt(credentials)
    
    await napkin_service.delete_napkin(napkin_id)
    return {"success": True}


@router.get("/metrics")
async def get_agent_metrics(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Busca métricas do agente"""
    auth_data = await verify_jwt(credentials)
    tenant_id = auth_data["tenant_id"]
    
    # Buscar métricas do último período
    response = db.client.table("bia_metrics")\
        .select("*")\
        .eq("tenant_id", tenant_id)\
        .order("period_start", desc=True)\
        .limit(1)\
        .execute()
    
    if not response.data:
        return {
            "total_messages_received": 0,
            "total_messages_sent": 0,
            "total_conversations": 0,
            "active_conversations": 0
        }
    
    return response.data[0]
