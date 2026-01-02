"""
Metrics Service - Monitoramento de performance e saúde dos serviços
Coleta métricas de áudio, cache e sistema de forma não-intrusiva
"""

import time
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
from collections import defaultdict, deque
import threading

logger = logging.getLogger(__name__)

@dataclass
class AudioMetric:
    """Métrica de operação de áudio"""
    operation: str  # 'transcription', 'tts', 'audio_detection'
    duration_ms: float
    success: bool
    error_type: Optional[str] = None
    file_size_bytes: Optional[int] = None
    timestamp: datetime = None
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.now()

@dataclass
class CacheMetric:
    """Métrica de operação de cache"""
    service: str  # 'pricing', 'customer_history', 'tts', 'whisper'
    operation: str  # 'hit', 'miss', 'set', 'expire'
    key: str
    duration_ms: float
    timestamp: datetime = None
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.now()

@dataclass
class SystemHealth:
    """Saúde geral do sistema"""
    service: str
    status: str  # 'healthy', 'degraded', 'unhealthy'
    response_time_ms: float
    error_rate: float
    last_check: datetime = None
    
    def __post_init__(self):
        if self.last_check is None:
            self.last_check = datetime.now()

class MetricsService:
    """
    Serviço de métricas para monitoramento de performance
    Coleta e armazena métricas de forma não-intrusiva
    """
    
    def __init__(self):
        self.audio_metrics: deque = deque(maxlen=1000)  # Últimas 1000 métricas
        self.cache_metrics: deque = deque(maxlen=1000)
        self.system_health: Dict[str, SystemHealth] = {}
        self.counters: Dict[str, int] = defaultdict(int)
        self.timers: Dict[str, List[float]] = defaultdict(list)
        self.lock = threading.Lock()
        
        # Configurações de alertas
        self.alert_thresholds = {
            'audio_error_rate': 0.05,  # 5% de erro
            'cache_miss_rate': 0.3,    # 30% de miss
            'response_time_ms': 5000,  # 5 segundos
            'tts_timeout_rate': 0.02,  # 2% de timeout
            'whisper_timeout_rate': 0.02  # 2% de timeout
        }
    
    def record_audio_metric(self, operation: str, duration_ms: float, 
                           success: bool, error_type: Optional[str] = None,
                           file_size_bytes: Optional[int] = None):
        """Registra métrica de operação de áudio"""
        try:
            with self.lock:
                metric = AudioMetric(
                    operation=operation,
                    duration_ms=duration_ms,
                    success=success,
                    error_type=error_type,
                    file_size_bytes=file_size_bytes
                )
                self.audio_metrics.append(metric)
                
                # Atualizar contadores
                self.counters[f'audio_{operation}_total'] += 1
                if success:
                    self.counters[f'audio_{operation}_success'] += 1
                else:
                    self.counters[f'audio_{operation}_error'] += 1
                
                # Atualizar timers
                self.timers[f'audio_{operation}_duration'].append(duration_ms)
                if len(self.timers[f'audio_{operation}_duration']) > 100:
                    self.timers[f'audio_{operation}_duration'].pop(0)
                
                logger.debug(f"Audio metric recorded: {operation} - {duration_ms}ms - {'success' if success else 'error'}")
                
        except Exception as e:
            logger.error(f"Error recording audio metric: {e}")
    
    def record_cache_metric(self, service: str, operation: str, 
                           key: str, duration_ms: float):
        """Registra métrica de operação de cache"""
        try:
            with self.lock:
                metric = CacheMetric(
                    service=service,
                    operation=operation,
                    key=key,
                    duration_ms=duration_ms
                )
                self.cache_metrics.append(metric)
                
                # Atualizar contadores
                self.counters[f'cache_{service}_{operation}'] += 1
                self.counters[f'cache_{service}_total'] += 1
                
                logger.debug(f"Cache metric recorded: {service} - {operation} - {duration_ms}ms")
                
        except Exception as e:
            logger.error(f"Error recording cache metric: {e}")
    
    def update_system_health(self, service: str, status: str, 
                            response_time_ms: float, error_rate: float):
        """Atualiza saúde do sistema para um serviço"""
        try:
            with self.lock:
                self.system_health[service] = SystemHealth(
                    service=service,
                    status=status,
                    response_time_ms=response_time_ms,
                    error_rate=error_rate
                )
                
                logger.debug(f"System health updated: {service} - {status} - {response_time_ms}ms")
                
        except Exception as e:
            logger.error(f"Error updating system health: {e}")
    
    def get_audio_stats(self, minutes: int = 60) -> Dict[str, Any]:
        """Retorna estatísticas de áudio dos últimos N minutos"""
        try:
            cutoff = datetime.now() - timedelta(minutes=minutes)
            recent_metrics = [m for m in self.audio_metrics if m.timestamp >= cutoff]
            
            if not recent_metrics:
                return {"message": "No audio metrics in the specified period"}
            
            stats = {
                "period_minutes": minutes,
                "total_operations": len(recent_metrics),
                "operations": {}
            }
            
            # Agrupar por operação
            by_operation = defaultdict(list)
            for metric in recent_metrics:
                by_operation[metric.operation].append(metric)
            
            for operation, metrics in by_operation.items():
                success_count = sum(1 for m in metrics if m.success)
                error_count = len(metrics) - success_count
                durations = [m.duration_ms for m in metrics]
                
                stats["operations"][operation] = {
                    "total": len(metrics),
                    "success": success_count,
                    "errors": error_count,
                    "error_rate": error_count / len(metrics) if metrics else 0,
                    "avg_duration_ms": sum(durations) / len(durations) if durations else 0,
                    "max_duration_ms": max(durations) if durations else 0,
                    "min_duration_ms": min(durations) if durations else 0
                }
            
            return stats
            
        except Exception as e:
            logger.error(f"Error getting audio stats: {e}")
            return {"error": str(e)}
    
    def get_cache_stats(self, minutes: int = 60) -> Dict[str, Any]:
        """Retorna estatísticas de cache dos últimos N minutos"""
        try:
            cutoff = datetime.now() - timedelta(minutes=minutes)
            recent_metrics = [m for m in self.cache_metrics if m.timestamp >= cutoff]
            
            if not recent_metrics:
                return {"message": "No cache metrics in the specified period"}
            
            stats = {
                "period_minutes": minutes,
                "total_operations": len(recent_metrics),
                "services": {}
            }
            
            # Agrupar por serviço
            by_service = defaultdict(lambda: defaultdict(list))
            for metric in recent_metrics:
                by_service[metric.service][metric.operation].append(metric)
            
            for service, operations in by_service.items():
                service_stats = {"operations": {}}
                total_ops = sum(len(ops) for ops in operations.values())
                
                for operation, metrics in operations.items():
                    durations = [m.duration_ms for m in metrics]
                    service_stats["operations"][operation] = {
                        "count": len(metrics),
                        "avg_duration_ms": sum(durations) / len(durations) if durations else 0
                    }
                
                # Calcular hit rate se tiver hits e misses
                hits = len(operations.get('hit', []))
                misses = len(operations.get('miss', []))
                if hits + misses > 0:
                    service_stats["hit_rate"] = hits / (hits + misses)
                    service_stats["miss_rate"] = misses / (hits + misses)
                
                service_stats["total_operations"] = total_ops
                stats["services"][service] = service_stats
            
            return stats
            
        except Exception as e:
            logger.error(f"Error getting cache stats: {e}")
            return {"error": str(e)}
    
    def get_system_health_summary(self) -> Dict[str, Any]:
        """Retorna resumo da saúde do sistema"""
        try:
            with self.lock:
                if not self.system_health:
                    return {"message": "No system health data available"}
                
                summary = {
                    "timestamp": datetime.now().isoformat(),
                    "services": {},
                    "overall_status": "healthy"
                }
                
                unhealthy_count = 0
                degraded_count = 0
                
                for service, health in self.system_health.items():
                    summary["services"][service] = {
                        "status": health.status,
                        "response_time_ms": health.response_time_ms,
                        "error_rate": health.error_rate,
                        "last_check": health.last_check.isoformat()
                    }
                    
                    if health.status == "unhealthy":
                        unhealthy_count += 1
                    elif health.status == "degraded":
                        degraded_count += 1
                
                # Determinar status geral
                if unhealthy_count > 0:
                    summary["overall_status"] = "unhealthy"
                elif degraded_count > 0:
                    summary["overall_status"] = "degraded"
                
                return summary
                
        except Exception as e:
            logger.error(f"Error getting system health summary: {e}")
            return {"error": str(e)}
    
    def check_alerts(self) -> List[Dict[str, Any]]:
        """Verifica se há alertas baseados nos thresholds"""
        alerts = []
        
        try:
            # Verificar métricas de áudio dos últimos 15 minutos
            audio_stats = self.get_audio_stats(15)
            
            if "operations" in audio_stats:
                for operation, stats in audio_stats["operations"].items():
                    # Alerta de taxa de erro
                    if stats["error_rate"] > self.alert_thresholds["audio_error_rate"]:
                        alerts.append({
                            "type": "audio_error_rate",
                            "service": f"audio_{operation}",
                            "value": stats["error_rate"],
                            "threshold": self.alert_thresholds["audio_error_rate"],
                            "message": f"High error rate for {operation}: {stats['error_rate']:.2%}"
                        })
                    
                    # Alerta de tempo de resposta
                    if stats["avg_duration_ms"] > self.alert_thresholds["response_time_ms"]:
                        alerts.append({
                            "type": "response_time",
                            "service": f"audio_{operation}",
                            "value": stats["avg_duration_ms"],
                            "threshold": self.alert_thresholds["response_time_ms"],
                            "message": f"Slow response time for {operation}: {stats['avg_duration_ms']:.0f}ms"
                        })
            
            # Verificar métricas de cache
            cache_stats = self.get_cache_stats(15)
            
            if "services" in cache_stats:
                for service, stats in cache_stats["services"].items():
                    if "miss_rate" in stats and stats["miss_rate"] > self.alert_thresholds["cache_miss_rate"]:
                        alerts.append({
                            "type": "cache_miss_rate",
                            "service": f"cache_{service}",
                            "value": stats["miss_rate"],
                            "threshold": self.alert_thresholds["cache_miss_rate"],
                            "message": f"High cache miss rate for {service}: {stats['miss_rate']:.2%}"
                        })
            
            return alerts
            
        except Exception as e:
            logger.error(f"Error checking alerts: {e}")
            return [{"type": "system_error", "message": f"Error checking alerts: {e}"}]

# Singleton instance
_metrics_service_instance = None
_metrics_service_lock = threading.Lock()

def get_metrics_service() -> MetricsService:
    """Retorna instância singleton do MetricsService"""
    global _metrics_service_instance
    
    if _metrics_service_instance is None:
        with _metrics_service_lock:
            if _metrics_service_instance is None:
                _metrics_service_instance = MetricsService()
                logger.info("MetricsService singleton created")
    
    return _metrics_service_instance

# Decorador para medir tempo de execução
def measure_time(operation: str, service: str = "system"):
    """Decorador para medir tempo de execução de funções"""
    def decorator(func):
        def wrapper(*args, **kwargs):
            start_time = time.time()
            success = True
            error_type = None
            
            try:
                result = func(*args, **kwargs)
                return result
            except Exception as e:
                success = False
                error_type = type(e).__name__
                raise
            finally:
                duration_ms = (time.time() - start_time) * 1000
                metrics_service = get_metrics_service()
                
                if service == "audio":
                    metrics_service.record_audio_metric(
                        operation=operation,
                        duration_ms=duration_ms,
                        success=success,
                        error_type=error_type
                    )
                else:
                    # Para outros serviços, usar cache metrics como fallback
                    metrics_service.record_cache_metric(
                        service=service,
                        operation=operation,
                        key=f"{func.__name__}",
                        duration_ms=duration_ms
                    )
        
        return wrapper
    return decorator