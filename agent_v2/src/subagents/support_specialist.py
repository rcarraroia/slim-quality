"""Sub-agent especialista em suporte"""
from ..core.openai_client import openai_client


async def support_specialist(query: str, context: str = "") -> str:
    """Sub-agent especializado em suporte técnico"""
    system_prompt = """Você é um especialista em suporte técnico e atendimento ao cliente.
Ajude o afiliado com dúvidas sobre o sistema, problemas técnicos e orientações gerais.
Seja claro e didático."""
    
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": f"{context}\n\n{query}" if context else query}
    ]
    
    response = await openai_client.chat_completion(messages, temperature=0.5)
    return response
