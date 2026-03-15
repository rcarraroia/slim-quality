"""Skill: Buscar vendas do afiliado"""
from ..core.database import db


async def get_sales_skill(tenant_id: str) -> str:
    """Busca últimas 10 vendas do afiliado"""
    # Buscar affiliate_id
    tenant = await db.client.table("multi_agent_tenants")\
        .select("affiliate_id")\
        .eq("id", tenant_id)\
        .single()\
        .execute()
    
    if not tenant.data:
        return "Não foi possível buscar suas vendas."
    
    affiliate_id = tenant.data["affiliate_id"]
    
    # Buscar conversões (vendas)
    response = db.client.table("referral_conversions")\
        .select("order_value, created_at, status")\
        .eq("affiliate_id", affiliate_id)\
        .order("created_at", desc=True)\
        .limit(10)\
        .execute()
    
    if not response.data:
        return "Você ainda não possui vendas registradas."
    
    # Formatar resposta
    total = sum(s["order_value"] for s in response.data)
    result = f"Suas últimas {len(response.data)} vendas (Total: R$ {total:.2f}):\n\n"
    
    for s in response.data:
        result += f"- R$ {s['order_value']:.2f} - {s['status']}\n"
    
    return result
