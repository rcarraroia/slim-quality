"""Serviço de gerenciamento do napkin"""
from typing import List, Dict, Any
from ..core.database import db


class NapkinService:
    """Serviço de napkin (memória persistente)"""
    
    async def list_napkin(self, tenant_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Lista aprendizados do napkin"""
        return await db.get_napkin(tenant_id, limit)
    
    async def add_napkin(self, tenant_id: str, content: str, updated_by: str = "agent") -> Dict[str, Any]:
        """Adiciona aprendizado ao napkin"""
        # Verificar limite de 100
        current = await db.get_napkin(tenant_id, limit=100)
        
        if len(current) >= 100:
            # Remover o mais antigo (FIFO)
            oldest = current[-1]
            await db.delete_napkin(oldest["id"])
        
        return await db.add_napkin(tenant_id, content, updated_by)
    
    async def delete_napkin(self, napkin_id: str) -> bool:
        """Deleta aprendizado do napkin"""
        return await db.delete_napkin(napkin_id)


# Instância global
napkin_service = NapkinService()
