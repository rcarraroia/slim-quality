"""Sub-agent especialista em vendas"""
from ..core.openai_client import openai_client


async def sales_specialist(query: str, context: str = "") -> str:
    """Sub-agent especializado em vendas"""
    system_prompt = """Você é um especialista em vendas e estratégias comerciais.
Ajude o afiliado com técnicas de vendas, abordagem de clientes e fechamento de negócios.
Seja prático e objetivo."""
    
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": f"{context}\n\n{query}" if context else query}
    ]
    
    response = await openai_client.chat_completion(messages, temperature=0.6)
    return response
