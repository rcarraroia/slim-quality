"""
MCP Server - WhatsApp Uazapi

Ferramentas:
- send_message: Envia mensagem via Uazapi
- get_messages: Busca últimas mensagens
"""
import os
import httpx
from mcp.server import Server

# Configuração
UAZAPI_URL = os.getenv("UAZAPI_URL")
INSTANCE_ID = os.getenv("UAZAPI_INSTANCE_ID")
API_KEY = os.getenv("UAZAPI_API_KEY")

# Criar servidor MCP
mcp = Server("whatsapp-uazapi")


@mcp.tool()
async def send_message(phone: str, message: str) -> str:
    """
    Envia mensagem via Uazapi.
    
    Args:
        phone: Número do destinatário (ex: 5511999999999)
        message: Conteúdo da mensagem
        
    Returns:
        ID da mensagem enviada
    """
    url = f"{UAZAPI_URL}/instances/{INSTANCE_ID}/messages"
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            url,
            headers={"Authorization": f"Bearer {API_KEY}"},
            json={
                "phone": phone,
                "message": message
            }
        )
        response.raise_for_status()
        
        data = response.json()
        return data.get("message_id", "unknown")


@mcp.tool()
async def get_messages(limit: int = 50) -> list:
    """
    Busca últimas mensagens recebidas.
    
    Args:
        limit: Número máximo de mensagens (padrão: 50)
        
    Returns:
        Lista de mensagens
    """
    url = f"{UAZAPI_URL}/instances/{INSTANCE_ID}/messages"
    
    async with httpx.AsyncClient() as client:
        response = await client.get(
            url,
            headers={"Authorization": f"Bearer {API_KEY}"},
            params={"limit": limit}
        )
        response.raise_for_status()
        
        data = response.json()
        return data.get("messages", [])


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(mcp.app, host="0.0.0.0", port=3000)
