"""
Config Cache Service - Cache em memória para configurações de sub-agentes

Sistema de cache simples com TTL (Time To Live) para evitar queries
repetidas ao banco de dados.

Padrão: Cache em memória com dict + timestamps
TTL: 5 minutos (300 segundos)
"""

import structlog
from typing import Dict, Optional, Any
from datetime import datetime, timedelta
from dataclasses import dataclass
import asyncio

logger = structlog.get_logger(__name__)


@dataclass
class SubAgentConfig:
    """Configuração de um sub-agente"""
    id: str
    agent_name: str
    domain: str
    system_prompt: str
    model: str
    temperature: float
    max_tokens: int
    learning_threshold: float
    max_patterns: int
    is_active: bool


class ConfigCache:
    """
    Cache em memória para configurações de sub-agentes
    
    Features:
    - TTL de 5 minutos
    - Invalidação manual por agent_type
    - Fallback para valores padrão se banco falhar
    """
    
    def __init__(self, ttl_seconds: int = 300):
        """
        Inicializa cache
        
        Args:
            ttl_seconds: Tempo de vida do cache em segundos (default: 300 = 5 min)
        """
        self._cache: Dict[str, tuple[SubAgentConfig, datetime]] = {}
        self._ttl = timedelta(seconds=ttl_seconds)
        self._lock = asyncio.Lock()
        logger.info("ConfigCache inicializado", ttl_seconds=ttl_seconds)
    
    async def get(self, agent_type: str) -> Optional[SubAgentConfig]:
        """
        Busca configuração no cache
        
        Args:
            agent_type: Tipo do agente (router, discovery, sales, support)
            
        Returns:
            SubAgentConfig se encontrado e válido, None caso contrário
        """
        async with self._lock:
            if agent_type in self._cache:
                config, timestamp = self._cache[agent_type]
                
                # Verificar se cache ainda é válido
                if datetime.now() - timestamp < self._ttl:
                    logger.debug("Cache hit", agent_type=agent_type)
                    return config
                else:
                    # Cache expirado
                    logger.debug("Cache expired", agent_type=agent_type)
                    del self._cache[agent_type]
            
            logger.debug("Cache miss", agent_type=agent_type)
            return None
    
    async def set(self, agent_type: str, config: SubAgentConfig) -> None:
        """
        Armazena configuração no cache
        
        Args:
            agent_type: Tipo do agente
            config: Configuração a ser armazenada
        """
        async with self._lock:
            self._cache[agent_type] = (config, datetime.now())
            logger.debug("Cache set", agent_type=agent_type)
    
    async def invalidate(self, agent_type: str) -> None:
        """
        Invalida cache de um agente específico
        
        Args:
            agent_type: Tipo do agente a invalidar
        """
        async with self._lock:
            if agent_type in self._cache:
                del self._cache[agent_type]
                logger.info("Cache invalidated", agent_type=agent_type)
    
    async def clear(self) -> None:
        """Limpa todo o cache"""
        async with self._lock:
            self._cache.clear()
            logger.info("Cache cleared")


# Singleton global
_cache_instance: Optional[ConfigCache] = None


def get_config_cache() -> ConfigCache:
    """Retorna instância singleton do cache"""
    global _cache_instance
    if _cache_instance is None:
        _cache_instance = ConfigCache()
    return _cache_instance


async def get_sub_agent_config(agent_type: str) -> SubAgentConfig:
    """
    Busca configuração de um sub-agente (com cache e fallback)
    
    Estratégia:
    1. Tentar buscar no cache
    2. Se não encontrar, buscar no banco
    3. Se banco falhar, usar valores padrão hardcoded
    
    Args:
        agent_type: Tipo do agente (router, discovery, sales, support)
        
    Returns:
        SubAgentConfig com configuração do agente
        
    Raises:
        ValueError: Se agent_type for inválido
    """
    # Validar agent_type
    valid_types = ['router', 'discovery', 'sales', 'support']
    if agent_type not in valid_types:
        raise ValueError(f"agent_type inválido: {agent_type}. Deve ser um de: {valid_types}")
    
    cache = get_config_cache()
    
    # 1. Tentar buscar no cache
    cached_config = await cache.get(agent_type)
    if cached_config:
        logger.debug("Usando config do cache", agent_type=agent_type)
        return cached_config
    
    # 2. Buscar no banco
    try:
        from ..services.supabase_client import get_supabase_client
        
        supabase = get_supabase_client()
        
        # Query no banco
        result = supabase.table('sub_agents').select('*').eq('domain', agent_type).eq('is_active', True).is_('deleted_at', 'null').execute()
        
        if result.data and len(result.data) > 0:
            data = result.data[0]
            
            config = SubAgentConfig(
                id=data['id'],
                agent_name=data['agent_name'],
                domain=data['domain'],
                system_prompt=data.get('system_prompt', ''),
                model=data.get('model', 'gpt-4o'),
                temperature=float(data.get('temperature', 0.7)),
                max_tokens=int(data.get('max_tokens', 2000)),
                learning_threshold=float(data.get('learning_threshold', 0.7)),
                max_patterns=int(data.get('max_patterns', 100)),
                is_active=data.get('is_active', True)
            )
            
            # Armazenar no cache
            await cache.set(agent_type, config)
            
            logger.info("Config carregada do banco", agent_type=agent_type, model=config.model)
            return config
        else:
            logger.warning("Agente não encontrado no banco, usando fallback", agent_type=agent_type)
            # Continuar para fallback
            
    except Exception as e:
        logger.error("Erro ao buscar config no banco, usando fallback", agent_type=agent_type, error=str(e))
        # Continuar para fallback
    
    # 3. Fallback: Valores padrão hardcoded
    fallback_configs = {
        'router': SubAgentConfig(
            id='fallback_router',
            agent_name='Router Agent (Fallback)',
            domain='router',
            system_prompt='Você é um classificador de intenções. Classifique em: discovery, sales ou support.',
            model='gpt-4o',
            temperature=0.3,
            max_tokens=500,
            learning_threshold=0.7,
            max_patterns=50,
            is_active=True
        ),
        'discovery': SubAgentConfig(
            id='fallback_discovery',
            agent_name='Discovery Agent (Fallback)',
            domain='discovery',
            system_prompt='Você é a BIA, assistente de qualificação de leads da Slim Quality.',
            model='gpt-4o',
            temperature=0.7,
            max_tokens=2000,
            learning_threshold=0.7,
            max_patterns=100,
            is_active=True
        ),
        'sales': SubAgentConfig(
            id='fallback_sales',
            agent_name='Sales Agent (Fallback)',
            domain='sales',
            system_prompt='Você é a BIA, consultora de vendas da Slim Quality.',
            model='gpt-4o',
            temperature=0.7,
            max_tokens=2000,
            learning_threshold=0.75,
            max_patterns=150,
            is_active=True
        ),
        'support': SubAgentConfig(
            id='fallback_support',
            agent_name='Support Agent (Fallback)',
            domain='support',
            system_prompt='Você é a BIA, suporte pós-venda da Slim Quality.',
            model='gpt-4o',
            temperature=0.5,
            max_tokens=2000,
            learning_threshold=0.65,
            max_patterns=80,
            is_active=True
        )
    }
    
    fallback_config = fallback_configs[agent_type]
    logger.warning("Usando configuração de fallback", agent_type=agent_type)
    
    return fallback_config
