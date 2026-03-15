"""Skill: Buscar rede do afiliado"""
from ..core.database import db


async def get_network_skill(tenant_id: str) -> str:
    """Busca rede do afiliado (N1 e N2)"""
    # Buscar affiliate_id
    tenant = await db.client.table("multi_agent_tenants")\
        .select("affiliate_id")\
        .eq("id", tenant_id)\
        .single()\
        .execute()
    
    if not tenant.data:
        return "Não foi possível buscar sua rede."
    
    affiliate_id = tenant.data["affiliate_id"]
    
    # Buscar rede N1
    n1_response = db.client.table("affiliate_network")\
        .select("referred_id, level")\
        .eq("referrer_id", affiliate_id)\
        .eq("level", 1)\
        .execute()
    
    n1_count = len(n1_response.data) if n1_response.data else 0
    
    # Buscar rede N2
    n2_response = db.client.table("affiliate_network")\
        .select("referred_id, level")\
        .eq("referrer_id", affiliate_id)\
        .eq("level", 2)\
        .execute()
    
    n2_count = len(n2_response.data) if n2_response.data else 0
    
    result = f"""Sua rede de afiliados:

📊 Nível 1 (Diretos): {n1_count} afiliados
📊 Nível 2 (Indiretos): {n2_count} afiliados
📊 Total: {n1_count + n2_count} afiliados na sua rede
"""
    
    return result
