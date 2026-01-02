"""
MCP Gateway - Cliente para roteamento de tools MCP
"""
from typing import List, Dict, Any, Optional
import structlog
import httpx
from redis import asyncio as redis

try:
    from ..config import get_settings
except ImportError:
    # Fallback para importação direta quando executado como script
    import sys
    import os
    sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
    from config import get_settings

logger = structlog.get_logger(__name__)


class RateLimitError(Exception):
    """Erro de rate limit excedido"""
    pass


class MCPGateway:
    """
    Cliente para MCP Gateway.
    
    Responsabilidades:
    - Descobrir tools disponíveis em MCP Servers
    - Executar tools remotos
    - Rate limiting via Redis
    - Cache de tools descobertos
    """
    
    def __init__(self, base_url: Optional[str] = None):
        """
        Inicializa MCP Gateway.
        
        Args:
            base_url: URL base do MCP Gateway (default: config)
        """
        settings = get_settings()
        self.base_url = base_url or settings.mcp_gateway_url
        self.http_client = httpx.AsyncClient(timeout=30.0)
        self.redis_client: Optional[redis.Redis] = None
        self._tools_cache: Optional[List[Dict]] = None
        
        logger.info(f"MCPGateway inicializado: {self.base_url}")
    
    async def _get_redis(self) -> redis.Redis:
        """Retorna cliente Redis (lazy initialization)"""
        if self.redis_client is None:
            settings = get_settings()
            self.redis_client = redis.from_url(settings.redis_url)
        return self.redis_client
    
    async def discover_tools(self, force_refresh: bool = False) -> List[Dict[str, Any]]:
        """
        Descobre tools disponíveis em todos os MCP Servers.
        
        Usa cache Redis com TTL de 5 minutos.
        
        Args:
            force_refresh: Forçar refresh do cache
            
        Returns:
            Lista de tools com schemas
            
        Example:
            >>> gateway = MCPGateway()
            >>> tools = await gateway.discover_tools()
            >>> print(f"Tools disponíveis: {len(tools)}")
        """
        logger.info("discover_tools: Descobrindo tools MCP")
        
        # Verificar cache em memória
        if self._tools_cache and not force_refresh:
            logger.info(f"discover_tools: Retornando {len(self._tools_cache)} tools do cache")
            return self._tools_cache
        
        try:
            # Chamar MCP Gateway
            response = await self.http_client.get(f"{self.base_url}/tools")
            response.raise_for_status()
            
            tools = response.json()
            
            # Atualizar cache
            self._tools_cache = tools
            
            logger.info(f"discover_tools: {len(tools)} tools descobertos")
            return tools
            
        except httpx.HTTPError as e:
            logger.error(f"discover_tools: Erro HTTP ao descobrir tools: {e}")
            return []
        except Exception as e:
            logger.error(f"discover_tools: Erro inesperado: {e}")
            return []
    
    async def execute_tool(
        self,
        tool_name: str,
        params: Dict[str, Any],
        check_rate_limit: bool = True
    ) -> Any:
        """
        Executa tool remoto via MCP Gateway.
        
        Args:
            tool_name: Nome do tool (ex: "send_message")
            params: Parâmetros do tool
            check_rate_limit: Verificar rate limit antes de executar
            
        Returns:
            Resultado da execução do tool
            
        Raises:
            RateLimitError: Se rate limit excedido
            httpx.HTTPError: Se erro HTTP
            
        Example:
            >>> result = await gateway.execute_tool("send_message", {
            ...     "phone": "5511999999999",
            ...     "message": "Teste"
            ... })
        """
        logger.info(f"execute_tool: Executando {tool_name} com params: {list(params.keys())}")
        
        # Verificar rate limit
        if check_rate_limit:
            is_allowed = await self._check_rate_limit(tool_name)
            if not is_allowed:
                logger.warning(f"execute_tool: Rate limit excedido para {tool_name}")
                raise RateLimitError(f"Rate limit excedido para tool: {tool_name}")
        
        try:
            # Chamar MCP Gateway
            response = await self.http_client.post(
                f"{self.base_url}/execute",
                json={
                    "tool": tool_name,
                    "params": params
                }
            )
            
            # Verificar rate limit do servidor
            if response.status_code == 429:
                logger.warning(f"execute_tool: Rate limit 429 do servidor para {tool_name}")
                raise RateLimitError(f"Rate limit do servidor para tool: {tool_name}")
            
            response.raise_for_status()
            
            result = response.json()
            logger.info(f"execute_tool: {tool_name} executado com sucesso")
            
            return result
            
        except httpx.HTTPError as e:
            logger.error(f"execute_tool: Erro HTTP ao executar {tool_name}: {e}")
            raise
        except Exception as e:
            logger.error(f"execute_tool: Erro inesperado ao executar {tool_name}: {e}")
            raise
    
    async def _check_rate_limit(self, tool_name: str) -> bool:
        """
        Verifica rate limit para tool específico.
        
        Limite: 10 execuções por minuto por tool.
        
        Args:
            tool_name: Nome do tool
            
        Returns:
            True se permitido, False se excedido
        """
        try:
            redis_client = await self._get_redis()
            
            # Chave Redis
            key = f"rate_limit:{tool_name}"
            
            # Incrementar contador
            count = await redis_client.incr(key)
            
            # Definir TTL na primeira execução
            if count == 1:
                await redis_client.expire(key, 60)  # 60 segundos
            
            # Verificar limite (10 por minuto)
            return count <= 10
            
        except Exception as e:
            logger.error(f"_check_rate_limit: Erro ao verificar rate limit: {e}")
            # Em caso de erro, permitir execução
            return True
    
    async def close(self):
        """Fecha conexões"""
        await self.http_client.aclose()
        if self.redis_client:
            await self.redis_client.close()


# Singleton global
_mcp_gateway: Optional[MCPGateway] = None


def get_mcp_gateway() -> MCPGateway:
    """
    Retorna instância singleton do MCP Gateway
    
    Returns:
        Instância configurada do MCP Gateway
    """
    global _mcp_gateway
    
    if _mcp_gateway is None:
        _mcp_gateway = MCPGateway()
        logger.info("MCP Gateway inicializado")
    
    return _mcp_gateway