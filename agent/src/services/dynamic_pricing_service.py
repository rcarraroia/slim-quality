"""
Dynamic Pricing Service - Busca preços atualizados do banco de dados

Este serviço implementa:
- Cache de preços com TTL de 5 minutos
- Timeout de 2 segundos para queries Supabase
- Fallback para cache local quando Supabase falhar
- Integração com MCP Supabase e client direto
"""

import structlog
from typing import Dict, Optional, Any
import asyncio
import time
from datetime import datetime, timedelta
import json

from .supabase_client import get_supabase_client
from .mcp_gateway import get_mcp_gateway
from .metrics_service import get_metrics_service

logger = structlog.get_logger(__name__)

# Cache global de preços
_price_cache: Dict[str, Any] = {
    "data": {},
    "last_update": None,
    "ttl_seconds": 300  # 5 minutos
}

# Fallback cache local (usado quando tudo falhar)
_fallback_prices = {
    "solteiro": 425900,  # R$ 4.259,00 em centavos
    "padrao": 440000,    # R$ 4.400,00 em centavos  
    "queen": 489000,     # R$ 4.890,00 em centavos
    "king": 589900       # R$ 5.899,00 em centavos
}


class DynamicPricingService:
    """
    Serviço de preços dinâmicos com cache e fallbacks
    """
    
    def __init__(self):
        self.timeout_seconds = 2
        self.cache_ttl_seconds = 300  # 5 minutos
        
    async def get_current_prices(self) -> Dict[str, int]:
        """
        Busca preços atuais com cache e fallbacks
        
        Returns:
            Dict com preços em centavos por tipo de produto
            
        Example:
            >>> prices = await service.get_current_prices()
            >>> print(prices["padrao"])  # 329000 (R$ 3.290,00)
        """
        try:
            # Verificar cache primeiro
            if self._is_cache_valid():
                logger.debug("Usando preços do cache")
                return _price_cache["data"]
            
            # Cache expirado, buscar do banco
            logger.info("Cache expirado, buscando preços do banco")
            prices = await self._fetch_prices_from_database()
            
            if prices:
                # Atualizar cache
                _price_cache["data"] = prices
                _price_cache["last_update"] = time.time()
                logger.info("Cache de preços atualizado", count=len(prices))
                return prices
            else:
                # Fallback para cache expirado se banco falhar
                logger.warning("Banco falhou, usando cache expirado se disponível")
                if _price_cache["data"]:
                    return _price_cache["data"]
                else:
                    # Último fallback - preços hardcoded
                    logger.error("Usando fallback de preços hardcoded")
                    return _fallback_prices
                    
        except Exception as e:
            logger.error("Erro ao buscar preços", error=str(e))
            # Fallback final
            return _fallback_prices
    
    async def get_product_price(self, product_type: str) -> Optional[int]:
        """
        Busca preço de um produto específico
        
        Args:
            product_type: Tipo do produto (solteiro, padrao, queen, king)
            
        Returns:
            Preço em centavos ou None se não encontrado
        """
        try:
            prices = await self.get_current_prices()
            return prices.get(product_type.lower())
        except Exception as e:
            logger.error("Erro ao buscar preço específico", product_type=product_type, error=str(e))
            return _fallback_prices.get(product_type.lower())
    
    def _is_cache_valid(self) -> bool:
        """Verifica se cache ainda é válido"""
        if not _price_cache["last_update"] or not _price_cache["data"]:
            return False
            
        elapsed = time.time() - _price_cache["last_update"]
        return elapsed < self.cache_ttl_seconds
    
    async def _fetch_prices_from_database(self) -> Optional[Dict[str, int]]:
        """
        Busca preços do banco com timeout e fallbacks
        
        Returns:
            Dict com preços ou None se falhar
        """
        # Tentar MCP primeiro, depois client direto
        methods = [
            self._fetch_via_mcp,
            self._fetch_via_direct_client
        ]
        
        for method in methods:
            try:
                result = await asyncio.wait_for(
                    method(),
                    timeout=self.timeout_seconds
                )
                if result:
                    logger.info(f"Preços obtidos via {method.__name__}")
                    return result
            except asyncio.TimeoutError:
                logger.warning(f"Timeout em {method.__name__}")
                continue
            except Exception as e:
                logger.warning(f"Erro em {method.__name__}", error=str(e))
                continue
        
        logger.error("Todos os métodos de busca falharam")
        return None
    
    async def _fetch_via_mcp(self) -> Optional[Dict[str, int]]:
        """Busca preços via MCP Gateway"""
        try:
            mcp_gateway = get_mcp_gateway()
            
            # Executar query via MCP
            response = await mcp_gateway.execute_tool(
                tool="get_products",
                parameters={}
            )
            
            if response and "data" in response:
                return self._parse_products_to_prices(response["data"])
            
        except Exception as e:
            logger.warning("Erro ao buscar via MCP", error=str(e))
            raise
    
    async def _fetch_via_direct_client(self) -> Optional[Dict[str, int]]:
        """Busca preços via client direto do Supabase"""
        try:
            client = get_supabase_client()
            
            # Query direta na tabela products - incluir name e width_cm para inferência
            response = client.table("products").select("product_type,price_cents,name,width_cm").eq("is_active", True).execute()
            
            if response.data:
                return self._parse_products_to_prices(response.data)
                
        except Exception as e:
            logger.warning("Erro ao buscar via client direto", error=str(e))
            raise
    
    def _parse_products_to_prices(self, products: list) -> Dict[str, int]:
        """
        Converte lista de produtos em dict de preços
        
        Args:
            products: Lista de produtos do banco
            
        Returns:
            Dict com preços por tipo
        """
        prices = {}
        
        for product in products:
            product_type = product.get("product_type", "").lower()
            price_cents = product.get("price_cents", 0)
            
            # Mapear tipos do banco para tipos do cache
            type_mapping = {
                "mattress": self._infer_mattress_type(product),
                "solteiro": "solteiro",
                "padrao": "padrao", 
                "queen": "queen",
                "king": "king"
            }
            
            mapped_type = type_mapping.get(product_type, product_type)
            if mapped_type and price_cents > 0:
                prices[mapped_type] = price_cents
        
        logger.debug("Preços parseados", prices=prices)
        return prices
    
    def _infer_mattress_type(self, product: Dict[str, Any]) -> str:
        """
        Infere tipo do colchão baseado no nome ou dimensões
        """
        name = product.get("name", "").lower()
        width = product.get("width_cm", 0)
        
        if "solteiro" in name or width == 88:
            return "solteiro"
        elif "queen" in name or width == 158:
            return "queen"
        elif "king" in name or width == 193:
            return "king"
        elif "padrão" in name or "padrao" in name or width == 138:
            return "padrao"
        else:
            # Fallback baseado em largura
            if width <= 90:
                return "solteiro"
            elif width <= 140:
                return "padrao"
            elif width <= 160:
                return "queen"
            else:
                return "king"
    
    def format_price_for_display(self, price_cents: int) -> str:
        """
        Formata preço para exibição
        
        Args:
            price_cents: Preço em centavos
            
        Returns:
            Preço formatado (ex: "R$ 3.290,00")
        """
        price_reais = price_cents / 100
        return f"R$ {price_reais:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


# Singleton global
_pricing_service: Optional[DynamicPricingService] = None


def get_pricing_service() -> DynamicPricingService:
    """
    Retorna instância singleton do Dynamic Pricing Service
    
    Returns:
        Instância configurada do serviço
    """
    global _pricing_service
    
    if _pricing_service is None:
        _pricing_service = DynamicPricingService()
        logger.info("Dynamic Pricing Service inicializado")
    
    return _pricing_service