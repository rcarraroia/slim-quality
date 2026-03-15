"""Cliente Supabase para BIA v2"""
from supabase import create_client, Client
from typing import Optional, Dict, Any, List
from .config import settings


class DatabaseClient:
    """Cliente Supabase com funções helper"""
    
    def __init__(self):
        self.client: Client = create_client(
            settings.supabase_url,
            settings.supabase_service_role_key
        )
    
    async def get_tenant_by_affiliate_id(self, affiliate_id: str) -> Optional[Dict[str, Any]]:
        """Busca tenant pelo affiliate_id"""
        response = self.client.table("multi_agent_tenants")\
            .select("*")\
            .eq("affiliate_id", affiliate_id)\
            .eq("status", "active")\
            .single()\
            .execute()
        return response.data if response.data else None
    
    async def get_agent_config(self, tenant_id: str) -> Optional[Dict[str, Any]]:
        """Busca configuração do agente"""
        response = self.client.table("bia_agent_config")\
            .select("*")\
            .eq("tenant_id", tenant_id)\
            .single()\
            .execute()
        return response.data if response.data else None
    
    async def get_napkin(self, tenant_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Lista aprendizados do napkin"""
        response = self.client.table("bia_napkin")\
            .select("*")\
            .eq("tenant_id", tenant_id)\
            .order("created_at", desc=True)\
            .limit(limit)\
            .execute()
        return response.data if response.data else []

    
    async def add_napkin(self, tenant_id: str, content: str, updated_by: str = "agent") -> Dict[str, Any]:
        """Adiciona aprendizado ao napkin"""
        response = self.client.table("bia_napkin")\
            .insert({
                "tenant_id": tenant_id,
                "content": content,
                "last_updated_by": updated_by
            })\
            .execute()
        return response.data[0] if response.data else None
    
    async def delete_napkin(self, napkin_id: str) -> bool:
        """Deleta aprendizado do napkin"""
        response = self.client.table("bia_napkin")\
            .delete()\
            .eq("id", napkin_id)\
            .execute()
        return True
    
    async def get_conversation_history(self, tenant_id: str, contact_phone: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Busca histórico de conversa"""
        # Buscar conversation_id
        conv_response = self.client.table("bia_conversations")\
            .select("id")\
            .eq("tenant_id", tenant_id)\
            .eq("contact_phone", contact_phone)\
            .single()\
            .execute()
        
        if not conv_response.data:
            return []
        
        conversation_id = conv_response.data["id"]
        
        # Buscar mensagens
        msg_response = self.client.table("bia_messages")\
            .select("*")\
            .eq("conversation_id", conversation_id)\
            .order("created_at", desc=True)\
            .limit(limit)\
            .execute()
        
        return list(reversed(msg_response.data)) if msg_response.data else []
    
    async def save_message(self, conversation_id: str, direction: str, content: str, message_type: str = "text") -> Dict[str, Any]:
        """Salva mensagem no banco"""
        response = self.client.table("bia_messages")\
            .insert({
                "conversation_id": conversation_id,
                "direction": direction,
                "content": content,
                "message_type": message_type
            })\
            .execute()
        return response.data[0] if response.data else None


# Instância global
db = DatabaseClient()
