"""Skill: Buscar comissões do afiliado"""
from typing import Dict, Any
from ..core.database import db


async def get_commissions_skill(tenant_id: str) -> str:
    """Busca últimas 10 comissões do afiliado"""
    # Buscar affiliate_id pelo tenant_id
    tenant = await db.client.table("multi_agent_tenants")\
        .select("affiliate_id")\
        .eq("id", tenant_id)\
        .single()\
        .execute()
    
    if not tenant.data:
        return "Não foi possível buscar suas comissões."
    
    affiliate_id = tenant.data["affiliate_id"]
    
    # Buscar comissões
    response = db.client.table("commissions")\
        .select("amount, level, created_at, status")\
        .eq("affiliate_id", affiliate_id)\
        .order("created_at", desc=True)\
        .limit(10)\
        .execute()
    
    if not response.data:
        return "Você ainda não possui comissões registradas."
    
    # Formatar resposta
    total = sum(c["amount"] for c in response.data)
    result = f"Suas últimas {len(response.data)} comissões (Total: R$ {total:.2f}):\n\n"
    
    for c in response.data:
        result += f"- R$ {c['amount']:.2f} (Nível {c['level']}) - {c['status']}\n"
    
    return result
