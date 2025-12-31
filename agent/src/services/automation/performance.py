"""
Sistema de Performance e Otimizações para Automações

Implementa cache, otimizações de queries e monitoramento de performance.
"""

import structlog
import time
import asyncio
from typing import Dict, Any, List, Optional, Callable
from datetime import datetime, timedelta
from functools import wraps
import json

logger = structlog.get_logger(__name__)


# ============================================
# CACHE EM MEMÓRIA (FALLBACK SEM REDIS)
# ============================================

class MemoryCache:
    """Cache em memória como fallback quando Redis não está disponível"""
    
    def __init__(self):
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._expiry: Dict[str, datetime] = {}
        logger.info("MemoryCache inicializado")
    
    async def get(self, key: str) -> Optional[Any]:
        """Obtém valor do cache"""
        if key in self._cache:
            if key in self._expiry and datetime.now() > self._expiry[key]:
                # Expirado
                del self._cache[key]
                del self._expiry[key]
                return None
            return self._cache[key].get('value')
        return None
    
    async def set(self, key: str, value: Any, ttl: int = 300) -> bool:
        """Define valor no cache com TTL em segundos"""
        try:
            self._cache[key] = {'value': value}
            self._expiry[key] = datetime.now() + timedelta(seconds=ttl)
            return True
        except Exception as e:
            logger.error(f"MemoryCache.set: Erro ao definir {key}: {e}")
            return False
    
    async def delete(self, key: str) -> bool:
        """Remove valor do cache"""
        if key in self._cache:
            del self._cache[key]
            if key in self._expiry:
                del self._expiry[key]
            return True
        return False
    
    async def clear(self) -> bool:
        """Limpa todo o cache"""
        self._cache.clear()
        self._expiry.clear()
        return True
    
    def get_stats(self) -> Dict[str, Any]:
        """Retorna estatísticas do cache"""
        now = datetime.now()
        active_keys = sum(1 for key in self._expiry if self._expiry[key] > now)
        
        return {
            "type": "memory",
            "total_keys": len(self._cache),
            "active_keys": active_keys,
            "expired_keys": len(self._cache) - active_keys
        }


# ============================================
# GERENCIADOR DE CACHE
# ============================================

class CacheManager:
    """Gerenciador de cache com fallback Redis -> Memory"""
    
    def __init__(self):
        self._redis_client = None
        self._memory_cache = MemoryCache()
        self._redis_available = False
        self._init_redis()
    
    def _init_redis(self):
        """Inicializa conexão Redis se disponível"""
        try:
            import redis.asyncio as redis
            from ..config import get_settings
            
            settings = get_settings()
            self._redis_client = redis.from_url(settings.redis_url)
            self._redis_available = True
            logger.info("Redis cache inicializado")
            
        except ImportError:
            logger.warning("Redis não disponível - usando cache em memória")
        except Exception as e:
            logger.warning(f"Erro ao conectar Redis: {e} - usando cache em memória")
    
    async def get(self, key: str) -> Optional[Any]:
        """Obtém valor do cache (Redis ou Memory)"""
        try:
            if self._redis_available and self._redis_client:
                value = await self._redis_client.get(key)
                if value:
                    return json.loads(value)
            
            # Fallback para memory cache
            return await self._memory_cache.get(key)
            
        except Exception as e:
            logger.error(f"CacheManager.get: Erro ao obter {key}: {e}")
            return None
    
    async def set(self, key: str, value: Any, ttl: int = 300) -> bool:
        """Define valor no cache com TTL"""
        try:
            if self._redis_available and self._redis_client:
                serialized = json.dumps(value, default=str)
                await self._redis_client.setex(key, ttl, serialized)
                return True
            
            # Fallback para memory cache
            return await self._memory_cache.set(key, value, ttl)
            
        except Exception as e:
            logger.error(f"CacheManager.set: Erro ao definir {key}: {e}")
            return False
    
    async def delete(self, key: str) -> bool:
        """Remove valor do cache"""
        try:
            if self._redis_available and self._redis_client:
                await self._redis_client.delete(key)
            
            await self._memory_cache.delete(key)
            return True
            
        except Exception as e:
            logger.error(f"CacheManager.delete: Erro ao remover {key}: {e}")
            return False
    
    async def get_stats(self) -> Dict[str, Any]:
        """Retorna estatísticas do cache"""
        if self._redis_available and self._redis_client:
            try:
                info = await self._redis_client.info()
                return {
                    "type": "redis",
                    "connected_clients": info.get("connected_clients", 0),
                    "used_memory": info.get("used_memory_human", "0B"),
                    "keyspace_hits": info.get("keyspace_hits", 0),
                    "keyspace_misses": info.get("keyspace_misses", 0)
                }
            except Exception:
                pass
        
        return self._memory_cache.get_stats()


# Singleton instance
_cache_manager: Optional[CacheManager] = None


def get_cache_manager() -> CacheManager:
    """Obtém instância singleton do CacheManager"""
    global _cache_manager
    if _cache_manager is None:
        _cache_manager = CacheManager()
    return _cache_manager


# ============================================
# DECORADORES DE PERFORMANCE
# ============================================

def measure_performance(operation_name: str):
    """
    Decorator para medir performance de funções
    
    Args:
        operation_name: Nome da operação para logging
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            start_time = time.time()
            
            try:
                result = await func(*args, **kwargs)
                duration_ms = int((time.time() - start_time) * 1000)
                
                logger.info(
                    f"Performance: {operation_name}",
                    duration_ms=duration_ms,
                    operation=operation_name,
                    success=True
                )
                
                # Registrar métrica
                await record_performance_metric(operation_name, duration_ms, True)
                
                return result
                
            except Exception as e:
                duration_ms = int((time.time() - start_time) * 1000)
                
                logger.error(
                    f"Performance: {operation_name} FAILED",
                    duration_ms=duration_ms,
                    operation=operation_name,
                    error=str(e),
                    success=False
                )
                
                # Registrar métrica de erro
                await record_performance_metric(operation_name, duration_ms, False)
                
                raise
        
        return wrapper
    return decorator


def cache_result(key_prefix: str, ttl: int = 300):
    """
    Decorator para cache de resultados de funções
    
    Args:
        key_prefix: Prefixo da chave do cache
        ttl: Time to live em segundos
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Gerar chave do cache baseada nos argumentos
            cache_key = f"{key_prefix}:{hash(str(args) + str(sorted(kwargs.items())))}"
            
            cache_manager = get_cache_manager()
            
            # Tentar obter do cache
            cached_result = await cache_manager.get(cache_key)
            if cached_result is not None:
                logger.debug(f"Cache HIT: {cache_key}")
                return cached_result
            
            # Executar função e cachear resultado
            logger.debug(f"Cache MISS: {cache_key}")
            result = await func(*args, **kwargs)
            
            # Cachear resultado
            await cache_manager.set(cache_key, result, ttl)
            
            return result
        
        return wrapper
    return decorator


# ============================================
# MÉTRICAS DE PERFORMANCE
# ============================================

class PerformanceMetrics:
    """Coleta e armazena métricas de performance"""
    
    def __init__(self):
        self._metrics: Dict[str, List[Dict[str, Any]]] = {}
        self._max_metrics_per_operation = 1000  # Limitar memória
        logger.info("PerformanceMetrics inicializado")
    
    async def record_metric(
        self, 
        operation: str, 
        duration_ms: int, 
        success: bool,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """Registra métrica de performance"""
        metric = {
            "timestamp": datetime.now().isoformat(),
            "duration_ms": duration_ms,
            "success": success,
            "metadata": metadata or {}
        }
        
        if operation not in self._metrics:
            self._metrics[operation] = []
        
        self._metrics[operation].append(metric)
        
        # Limitar tamanho para evitar vazamento de memória
        if len(self._metrics[operation]) > self._max_metrics_per_operation:
            self._metrics[operation] = self._metrics[operation][-self._max_metrics_per_operation:]
    
    async def get_operation_stats(self, operation: str) -> Dict[str, Any]:
        """Obtém estatísticas de uma operação"""
        if operation not in self._metrics:
            return {"operation": operation, "total_calls": 0}
        
        metrics = self._metrics[operation]
        durations = [m["duration_ms"] for m in metrics]
        successes = [m for m in metrics if m["success"]]
        
        if not durations:
            return {"operation": operation, "total_calls": 0}
        
        return {
            "operation": operation,
            "total_calls": len(metrics),
            "success_calls": len(successes),
            "success_rate": len(successes) / len(metrics) * 100,
            "avg_duration_ms": sum(durations) / len(durations),
            "min_duration_ms": min(durations),
            "max_duration_ms": max(durations),
            "p95_duration_ms": sorted(durations)[int(len(durations) * 0.95)] if len(durations) > 1 else durations[0]
        }
    
    async def get_all_stats(self) -> Dict[str, Any]:
        """Obtém estatísticas de todas as operações"""
        stats = {}
        for operation in self._metrics:
            stats[operation] = await self.get_operation_stats(operation)
        
        return {
            "operations": stats,
            "total_operations": len(self._metrics),
            "cache_stats": await get_cache_manager().get_stats()
        }
    
    async def clear_old_metrics(self, hours: int = 24):
        """Remove métricas antigas para liberar memória"""
        cutoff = datetime.now() - timedelta(hours=hours)
        
        for operation in self._metrics:
            self._metrics[operation] = [
                m for m in self._metrics[operation]
                if datetime.fromisoformat(m["timestamp"]) > cutoff
            ]
        
        logger.info(f"Métricas antigas removidas (> {hours}h)")


# Singleton instance
_performance_metrics: Optional[PerformanceMetrics] = None


def get_performance_metrics() -> PerformanceMetrics:
    """Obtém instância singleton do PerformanceMetrics"""
    global _performance_metrics
    if _performance_metrics is None:
        _performance_metrics = PerformanceMetrics()
    return _performance_metrics


async def record_performance_metric(
    operation: str, 
    duration_ms: int, 
    success: bool,
    metadata: Optional[Dict[str, Any]] = None
):
    """Função helper para registrar métricas"""
    metrics = get_performance_metrics()
    await metrics.record_metric(operation, duration_ms, success, metadata)


# ============================================
# OTIMIZAÇÕES DE QUERY
# ============================================

class QueryOptimizer:
    """Otimizações específicas para queries de automação"""
    
    @staticmethod
    def optimize_rules_query(
        user_id: str, 
        trigger_type: Optional[str] = None,
        active_only: bool = True
    ) -> Dict[str, Any]:
        """
        Otimiza query de busca de regras
        
        Returns:
            Parâmetros otimizados para query
        """
        # Query base otimizada com índices
        query_params = {
            "select": "id, nome, status, gatilho, gatilho_config, condicoes, acoes, disparos_mes, taxa_abertura_percent",
            "filters": [
                ("created_by", "eq", user_id),
                ("deleted_at", "is", "null")
            ],
            "order": ("updated_at", "desc"),
            "limit": 100  # Limitar para performance
        }
        
        if active_only:
            query_params["filters"].append(("status", "eq", "ativa"))
        
        if trigger_type:
            query_params["filters"].append(("gatilho", "eq", trigger_type))
        
        return query_params
    
    @staticmethod
    def optimize_logs_query(
        user_id: Optional[str] = None,
        rule_id: Optional[str] = None,
        limit: int = 50
    ) -> Dict[str, Any]:
        """
        Otimiza query de busca de logs
        
        Returns:
            Parâmetros otimizados para query
        """
        query_params = {
            "select": """
                id, rule_id, trigger_type, execution_status, 
                actions_count, duration_ms, executed_at, error_message,
                automation_rules!inner(nome)
            """,
            "filters": [],
            "order": ("executed_at", "desc"),
            "limit": min(limit, 500)  # Máximo 500 para performance
        }
        
        if rule_id:
            query_params["filters"].append(("rule_id", "eq", rule_id))
        
        if user_id:
            query_params["filters"].append(("automation_rules.created_by", "eq", user_id))
        
        return query_params


# ============================================
# MONITORAMENTO DE RECURSOS
# ============================================

class ResourceMonitor:
    """Monitor de uso de recursos do sistema"""
    
    def __init__(self):
        self._start_time = time.time()
        logger.info("ResourceMonitor inicializado")
    
    async def get_system_stats(self) -> Dict[str, Any]:
        """Obtém estatísticas do sistema"""
        try:
            import psutil
            
            # CPU e Memória
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            
            # Processo atual
            process = psutil.Process()
            process_memory = process.memory_info()
            
            return {
                "uptime_seconds": int(time.time() - self._start_time),
                "cpu_percent": cpu_percent,
                "memory_total_mb": memory.total // (1024 * 1024),
                "memory_used_mb": memory.used // (1024 * 1024),
                "memory_percent": memory.percent,
                "process_memory_mb": process_memory.rss // (1024 * 1024),
                "process_cpu_percent": process.cpu_percent()
            }
            
        except ImportError:
            logger.warning("psutil não disponível - estatísticas limitadas")
            return {
                "uptime_seconds": int(time.time() - self._start_time),
                "cpu_percent": 0,
                "memory_total_mb": 0,
                "memory_used_mb": 0,
                "memory_percent": 0,
                "process_memory_mb": 0,
                "process_cpu_percent": 0
            }
        except Exception as e:
            logger.error(f"Erro ao obter estatísticas do sistema: {e}")
            return {"error": str(e)}


# Singleton instance
_resource_monitor: Optional[ResourceMonitor] = None


def get_resource_monitor() -> ResourceMonitor:
    """Obtém instância singleton do ResourceMonitor"""
    global _resource_monitor
    if _resource_monitor is None:
        _resource_monitor = ResourceMonitor()
    return _resource_monitor