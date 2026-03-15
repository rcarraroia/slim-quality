"""Serviço principal do agente BIA"""
from typing import Dict, Any, List
from ..core.database import db
from ..core.openai_client import openai_client
from .napkin_service import napkin_service


class AgentService:
    """Serviço principal do agente"""
    
    async def process_message(
        self,
        tenant_id: str,
        contact_phone: str,
        message_text: str,
        conversation_id: str
    ) -> str:
        """Processa mensagem recebida e gera resposta"""
        
        # 1. Carregar configuração do agente
        config = await db.get_agent_config(tenant_id)
        if not config:
            config = {
                "agent_name": "BIA",
                "tone": "amigavel",
                "knowledge_enabled": True
            }
        
        # 2. Carregar napkin (últimos 50 aprendizados)
        napkin = await napkin_service.list_napkin(tenant_id, limit=50)
        
        # 3. Carregar histórico da conversa (últimas 10 mensagens)
        history = await db.get_conversation_history(tenant_id, contact_phone, limit=10)
        
        # 4. Montar prompt
        system_prompt = self._build_system_prompt(config, napkin)
        messages = self._build_messages(system_prompt, history, message_text)
        
        # 5. Chamar OpenAI
        response_text = await openai_client.chat_completion(
            messages=messages,
            temperature=0.7 if config["tone"] == "amigavel" else 0.5,
            max_tokens=500
        )
        
        # 6. Registrar mensagens no banco
        await db.save_message(conversation_id, "inbound", message_text, "text")
        await db.save_message(conversation_id, "outbound", response_text, "text")
        
        return response_text
    
    def _build_system_prompt(self, config: Dict[str, Any], napkin: List[Dict[str, Any]]) -> str:
        """Monta prompt do sistema"""
        agent_name = config.get("agent_name", "BIA")
        tone = config.get("tone", "amigavel")
        personality = config.get("agent_personality", "")
        
        prompt = f"""Você é {agent_name}, um assistente virtual inteligente para afiliados da Slim Quality.

Tom de voz: {tone}
{f"Personalidade: {personality}" if personality else ""}

Você ajuda afiliados com:
- Informações sobre comissões e vendas
- Dados da rede de afiliados
- Suporte geral sobre o sistema

"""
        
        if napkin and config.get("knowledge_enabled", True):
            prompt += "\n## Conhecimento Aprendido:\n"
            for item in napkin[:20]:  # Últimos 20 aprendizados
                prompt += f"- {item['content']}\n"
        
        prompt += "\nResponda de forma clara, objetiva e útil."
        
        return prompt

    
    def _build_messages(
        self,
        system_prompt: str,
        history: List[Dict[str, Any]],
        current_message: str
    ) -> List[Dict[str, str]]:
        """Monta lista de mensagens para OpenAI"""
        messages = [{"role": "system", "content": system_prompt}]
        
        # Adicionar histórico
        for msg in history:
            role = "user" if msg["direction"] == "inbound" else "assistant"
            messages.append({"role": role, "content": msg["content"]})
        
        # Adicionar mensagem atual
        messages.append({"role": "user", "content": current_message})
        
        return messages


# Instância global
agent_service = AgentService()
