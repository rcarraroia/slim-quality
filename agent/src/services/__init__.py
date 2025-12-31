"""
Serviços e clientes externos
"""
from .supabase_client import get_supabase_client, get_products
from .claude_client import get_claude_client
from .mcp_gateway import MCPGateway

__all__ = [
    "get_supabase_client",
    "get_products",
    "get_claude_client",
    "MCPGateway",
]
