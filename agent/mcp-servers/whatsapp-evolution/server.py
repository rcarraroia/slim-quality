"""
MCP Server - WhatsApp Evolution API

Ferramentas:
- send_message_evolution: Envia mensagem via Evolution
- get_instance_status: Verifica status da instância
"""
import os
import httpx
from mcp.server import Server

# Configuração (URL fixa VPS)
EVOLUTION_URL = os.getenv("EVOLUTION_URL", "https://slimquality-evolution-api.wpjtfd.easypanel.host")
API_KEY = os.getenv("EVOLUTION_API_KEY")
INSTANCE = os.getenv("EVOLUTION_INSTANCE", "Slim Quality")

# Criar servidor MCP
mcp = Server("whatsapp-evolution")


@mcp.tool()
async def send_message_evolution(phone: str, message: str) -> str:
    """
    Envia mensagem via Evolution API.
    
    Args:
        phone: Número do destinatário (ex: 5511999999999)
        message: Conteúdo da mensagem
        
    Returns:
        ID da mensagem enviada
    """
    url = f"{EVOLUTION_URL}/message/sendText/{INSTANCE}"
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            url,
            headers={"apikey": API_KEY},
            json={
                "number": phone,
                "text": message
            }
        )
        response.raise_for_status()
        
        data = response.json()
        return data.get("key", {}).get("id", "unknown")


@mcp.tool()
async def get_instance_status() -> dict:
    """
    Verifica status da instância Evolution.
    
    Returns:
        Status da conexão (connected/disconnected)
    """
    url = f"{EVOLUTION_URL}/instance/connectionState/{INSTANCE}"
    
    async with httpx.AsyncClient() as client:
        response = await client.get(
            url,
            headers={"apikey": API_KEY}
        )
        response.raise_for_status()
        
        return response.json()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(mcp.app, host="0.0.0.0", port=3000)
