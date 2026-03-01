"""
Personality Module - Carregamento de personality customizada por tenant

Este módulo implementa:
- Carregamento de personality de multi_agent_tenants.agent_personality
- Fallback para personality padrão da Slim Quality (BIA)
- Cache com TTL de 5 minutos para performance
- Invalidação manual de cache por tenant_id

Estrutura de Personality:
{
    "agent_name": "BIA",
    "system_prompt": "Você é a BIA, consultora especializada...",
    "greeting": "Olá! Sou a BIA...",
    "tone": "consultiva, empática, educativa",
    "focus": "resolver problemas de saúde e sono"
}
"""

import structlog
from typing import Dict, Optional, Any
from datetime import datetime, timedelta
import asyncio
import json

logger = structlog.get_logger(__name__)


# ============================================================================
# FALLBACK PERSONALITY - SLIM QUALITY (BIA)
# ============================================================================

FALLBACK_PERSONALITY = {
    "agent_name": "BIA",
    "system_prompt": """Você é a BIA, consultora especializada em colchões magnéticos terapêuticos da Slim Quality.

PRODUTOS DISPONÍVEIS:
- Solteiro (88x188x28cm): R$ 4.259,00
- Padrão (138x188x28cm): R$ 4.400,00 (MAIS VENDIDO)
- Queen (158x198x30cm): R$ 4.890,00
- King (193x203x30cm): R$ 5.899,00

TECNOLOGIAS (todos os modelos):
- Sistema Magnético (240 ímãs de 800 Gauss)
- Infravermelho Longo
- Energia Bioquântica
- Vibromassagem (8 motores)
- Densidade Progressiva
- Cromoterapia
- Perfilado High-Tech
- Tratamento Sanitário

ABORDAGEM:
- Seja consultiva, não vendedora
- Foque em resolver problemas de saúde
- Pergunte sobre dores, sono, circulação
- Apresente preço como "menos que uma pizza por dia"
- Seja empática e educativa""",
    
    "greeting": """Olá! Sou a BIA, consultora especializada em colchões magnéticos terapêuticos da Slim Quality! 😊

Como posso ajudá-lo hoje? Tem alguma dor, problema de sono ou circulação que gostaria de resolver?""",
    
    "tone": "consultiva, empática, educativa",
    "focus": "resolver problemas de saúde e sono",
    "approach": "não transacional, focada em educação"
}


# ============================================================================
# CACHE DE PERSONALITY
# ============================================================================

class PersonalityCache:
    """
    Cache em memória para personalities de tenants
    
    Features:
    - TTL de 5 minutos
    - Invalidação manual por tenant_id
    - Thread-safe com asyncio.Lock
    """
    
    def __init__(self, ttl_seconds: int = 300):
        """
        Inicializa cache
        
        Args:
            ttl_seconds: Tempo de vida do cache em segundos (default: 300 = 5 min)
        """
        self._cache: Dict[int, tuple[Dict[str, Any], datetime]] = {}
        self._ttl = timedelta(seconds=ttl_seconds)
        self._lock = asyncio.Lock()
        logger.info("PersonalityCache inicializado", ttl_seconds=ttl_seconds)
    
    async def get(self, tenant_id: int) -> Optional[Dict[str, Any]]:
        """
        Busca personality no cache
        
        Args:
            tenant_id: ID do tenant
            
        Returns:
            Personality se encontrada e válida, None caso contrário
        """
        async with self._lock:
            if tenant_id in self._cache:
                personality, timestamp = self._cache[tenant_id]
                
                # Verificar se cache ainda é válido
                if datetime.now() - timestamp < self._ttl:
                    logger.debug("Cache hit", tenant_id=tenant_id)
                    return personality
                else:
                    # Cache expirado
                    logger.debug("Cache expired", tenant_id=tenant_id)
                    del self._cache[tenant_id]
            
            logger.debug("Cache miss", tenant_id=tenant_id)
            return None
    
    async def set(self, tenant_id: int, personality: Dict[str, Any]) -> None:
        """
        Armazena personality no cache
        
        Args:
            tenant_id: ID do tenant
            personality: Personality a ser armazenada
        """
        async with self._lock:
            self._cache[tenant_id] = (personality, datetime.now())
            logger.debug("Cache set", tenant_id=tenant_id)
    
    async def invalidate(self, tenant_id: int) -> None:
        """
        Invalida cache de um tenant específico
        
        Args:
            tenant_id: ID do tenant a invalidar
        """
        async with self._lock:
            if tenant_id in self._cache:
                del self._cache[tenant_id]
                logger.info("Cache invalidated", tenant_id=tenant_id)
    
    async def clear(self) -> None:
        """Limpa todo o cache"""
        async with self._lock:
            self._cache.clear()
            logger.info("Cache cleared")


# Singleton global
_personality_cache: Optional[PersonalityCache] = None


def get_personality_cache() -> PersonalityCache:
    """Retorna instância singleton do cache"""
    global _personality_cache
    if _personality_cache is None:
        _personality_cache = PersonalityCache()
    return _personality_cache


# ============================================================================
# FUNÇÕES PRINCIPAIS
# ============================================================================

async def load_personality(tenant_id: int) -> Dict[str, Any]:
    """
    Carrega personality de um tenant com fallback
    
    Estratégia:
    1. Tentar buscar no cache
    2. Se não encontrar, buscar no banco (multi_agent_tenants)
    3. Se personality IS NULL no banco → usar FALLBACK_PERSONALITY
    4. Se personality IS NOT NULL → parsear JSON e retornar
    5. Se banco falhar → usar FALLBACK_PERSONALITY
    
    Args:
        tenant_id: ID do tenant (affiliate_id)
        
    Returns:
        Dict com personality (customizada ou fallback)
        
    Example:
        >>> personality = await load_personality(123)
        >>> print(personality["agent_name"])
        "BIA"
    """
    try:
        cache = get_personality_cache()
        
        # 1. Tentar buscar no cache
        cached_personality = await cache.get(tenant_id)
        if cached_personality:
            logger.debug("Usando personality do cache", tenant_id=tenant_id)
            return cached_personality
        
        # 2. Buscar no banco
        logger.info("Buscando personality no banco", tenant_id=tenant_id)
        personality = await _fetch_personality_from_database(tenant_id)
        
        # 3. Se personality é None (NULL no banco), usar fallback
        if personality is None:
            logger.info("Personality NULL no banco, usando fallback", tenant_id=tenant_id)
            personality = FALLBACK_PERSONALITY.copy()
        
        # 4. Armazenar no cache
        await cache.set(tenant_id, personality)
        
        logger.info("Personality carregada", 
                   tenant_id=tenant_id, 
                   agent_name=personality.get("agent_name", "Unknown"),
                   is_fallback=(personality == FALLBACK_PERSONALITY))
        
        return personality
        
    except Exception as e:
        logger.error("Erro ao carregar personality, usando fallback", 
                    tenant_id=tenant_id, error=str(e))
        # Fallback em caso de erro
        return FALLBACK_PERSONALITY.copy()


async def _fetch_personality_from_database(tenant_id: int) -> Optional[Dict[str, Any]]:
    """
    Busca personality no banco de dados
    
    Args:
        tenant_id: ID do tenant
        
    Returns:
        Personality parseada ou None se NULL no banco
        
    Raises:
        Exception: Se houver erro na query
    """
    try:
        from ..services.supabase_client import get_supabase_client
        
        client = get_supabase_client()
        
        # Query na tabela multi_agent_tenants
        response = client.table("multi_agent_tenants").select(
            "id,agent_name,personality"
        ).eq("id", tenant_id).limit(1).execute()
        
        if not response.data or len(response.data) == 0:
            logger.warning("Tenant não encontrado no banco", tenant_id=tenant_id)
            return None
        
        tenant_data = response.data[0]
        personality_data = tenant_data.get("personality")
        
        # Se personality é NULL, retornar None (usará fallback)
        if personality_data is None:
            logger.debug("personality é NULL no banco", tenant_id=tenant_id)
            return None
        
        # Se personality é string JSON, parsear
        if isinstance(personality_data, str):
            try:
                personality = json.loads(personality_data)
                logger.debug("Personality parseada de JSON", tenant_id=tenant_id)
            except json.JSONDecodeError as e:
                logger.error("Erro ao parsear personality JSON, usando fallback", 
                           tenant_id=tenant_id, error=str(e))
                return None
        elif isinstance(personality_data, dict):
            # Já é dict (JSONB do Postgres)
            personality = personality_data
            logger.debug("Personality já é dict", tenant_id=tenant_id)
        else:
            logger.warning("Tipo de personality inválido, usando fallback", 
                         tenant_id=tenant_id, type=type(personality_data))
            return None
        
        # Validar estrutura mínima
        if not isinstance(personality, dict):
            logger.warning("Personality não é dict, usando fallback", tenant_id=tenant_id)
            return None
        
        # Garantir campos obrigatórios (merge com fallback)
        final_personality = FALLBACK_PERSONALITY.copy()
        final_personality.update(personality)
        
        logger.debug("Personality customizada carregada", 
                    tenant_id=tenant_id, 
                    agent_name=final_personality.get("agent_name"))
        
        return final_personality
        
    except Exception as e:
        logger.error("Erro ao buscar personality no banco", tenant_id=tenant_id, error=str(e))
        raise


async def invalidate_personality_cache(tenant_id: int) -> None:
    """
    Invalida cache de personality de um tenant
    
    Use quando:
    - Personality for atualizada no banco
    - Tenant for reconfigurado
    - Forçar reload de personality
    
    Args:
        tenant_id: ID do tenant
    """
    cache = get_personality_cache()
    await cache.invalidate(tenant_id)
    logger.info("Cache de personality invalidado", tenant_id=tenant_id)


async def get_fallback_personality() -> Dict[str, Any]:
    """
    Retorna personality de fallback (Slim Quality - BIA)
    
    Returns:
        Dict com personality padrão
    """
    return FALLBACK_PERSONALITY.copy()


# ============================================================================
# FUNÇÕES AUXILIARES
# ============================================================================

def get_agent_name(personality: Dict[str, Any]) -> str:
    """
    Extrai nome do agente da personality
    
    Args:
        personality: Dict de personality
        
    Returns:
        Nome do agente (default: "BIA")
    """
    return personality.get("agent_name", "BIA")


def get_system_prompt(personality: Dict[str, Any]) -> str:
    """
    Extrai system prompt da personality
    
    Args:
        personality: Dict de personality
        
    Returns:
        System prompt completo
    """
    return personality.get("system_prompt", FALLBACK_PERSONALITY["system_prompt"])


def get_greeting(personality: Dict[str, Any]) -> str:
    """
    Extrai saudação da personality
    
    Args:
        personality: Dict de personality
        
    Returns:
        Saudação padrão
    """
    return personality.get("greeting", FALLBACK_PERSONALITY["greeting"])
