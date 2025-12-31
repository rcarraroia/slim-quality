"""
Sistema de Monitoramento e Alertas para Automações

Implementa coleta de métricas, alertas e dashboard de estatísticas.
"""

import structlog
import asyncio
from typing import Dict, Any, List, Optional, Callable
from datetime import datetime, timedelta
from enum import Enum
import json

from .performance import get_performance_metrics, get_resource_monitor

logger = structlog.get_logger(__name__)


# ============================================
# TIPOS DE ALERTAS
# ============================================

class AlertLevel(str, Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class AlertType(str, Enum):
    PERFORMANCE_DEGRADATION = "performance_degradation"
    HIGH_ERROR_RATE = "high_error_rate"
    SYSTEM_RESOURCE = "system_resource"
    RULE_EXECUTION_FAILURE = "rule_execution_failure"
    CACHE_MISS_RATE = "cache_miss_rate"


# ============================================
# SISTEMA DE ALERTAS
# ============================================

class Alert:
    """Representa um alerta do sistema"""
    
    def __init__(
        self,
        alert_type: AlertType,
        level: AlertLevel,
        message: str,
        metadata: Optional[Dict[str, Any]] = None
    ):
        self.id = f"{alert_type}_{int(datetime.now().timestamp())}"
        self.alert_type = alert_type
        self.level = level
        self.message = message
        self.metadata = metadata or {}
        self.created_at = datetime.now()
        self.acknowledged = False
        self.acknowledged_at: Optional[datetime] = None


class AlertManager:
    """Gerenciador de alertas do sistema"""
    
    def __init__(self):
        self._alerts: List[Alert] = []
        self._alert_handlers: Dict[AlertType, List[Callable]] = {}
        self._max_alerts = 1000  # Limitar memória
        logger.info("AlertManager inicializado")
    
    async def create_alert(
        self,
        alert_type: AlertType,
        level: AlertLevel,
        message: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Alert:
        """Cria novo alerta"""
        alert = Alert(alert_type, level, message, metadata)
        
        self._alerts.append(alert)
        
        # Limitar número de alertas
        if len(self._alerts) > self._max_alerts:
            self._alerts = self._alerts[-self._max_alerts:]
        
        # Log do alerta
        logger.log(
            level.upper(),
            f"ALERT: {message}",
            alert_id=alert.id,
            alert_type=alert_type,
            metadata=metadata
        )
        
        # Executar handlers
        await self._execute_handlers(alert)
        
        return alert
    
    async def acknowledge_alert(self, alert_id: str) -> bool:
        """Marca alerta como reconhecido"""
        for alert in self._alerts:
            if alert.id == alert_id:
                alert.acknowledged = True
                alert.acknowledged_at = datetime.now()
                logger.info(f"Alerta {alert_id} reconhecido")
                return True
        return False
    
    async def get_active_alerts(self, level: Optional[AlertLevel] = None) -> List[Alert]:
        """Obtém alertas ativos (não reconhecidos)"""
        alerts = [a for a in self._alerts if not a.acknowledged]
        
        if level:
            alerts = [a for a in alerts if a.level == level]
        
        return sorted(alerts, key=lambda x: x.created_at, reverse=True)
    
    async def get_alert_stats(self) -> Dict[str, Any]:
        """Obtém estatísticas de alertas"""
        now = datetime.now()
        last_24h = now - timedelta(hours=24)
        
        recent_alerts = [a for a in self._alerts if a.created_at > last_24h]
        active_alerts = [a for a in self._alerts if not a.acknowledged]
        
        stats_by_level = {}
        for level in AlertLevel:
            stats_by_level[level] = len([a for a in recent_alerts if a.level == level])
        
        return {
            "total_alerts": len(self._alerts),
            "active_alerts": len(active_alerts),
            "alerts_last_24h": len(recent_alerts),
            "by_level": stats_by_level,
            "critical_active": len([a for a in active_alerts if a.level == AlertLevel.CRITICAL])
        }
    
    def register_handler(self, alert_type: AlertType, handler: Callable):
        """Registra handler para tipo de alerta"""
        if alert_type not in self._alert_handlers:
            self._alert_handlers[alert_type] = []
        
        self._alert_handlers[alert_type].append(handler)
        logger.info(f"Handler registrado para {alert_type}")
    
    async def _execute_handlers(self, alert: Alert):
        """Executa handlers para um alerta"""
        if alert.alert_type in self._alert_handlers:
            for handler in self._alert_handlers[alert.alert_type]:
                try:
                    await handler(alert)
                except Exception as e:
                    logger.error(f"Erro ao executar handler de alerta: {e}")


# ============================================
# MONITORAMENTO DE MÉTRICAS
# ============================================

class MetricsCollector:
    """Coleta métricas do sistema de automações"""
    
    def __init__(self):
        self._collection_interval = 60  # segundos
        self._running = False
        self._task: Optional[asyncio.Task] = None
        logger.info("MetricsCollector inicializado")
    
    async def start_collection(self):
        """Inicia coleta automática de métricas"""
        if self._running:
            return
        
        self._running = True
        self._task = asyncio.create_task(self._collection_loop())
        logger.info("Coleta de métricas iniciada")
    
    async def stop_collection(self):
        """Para coleta de métricas"""
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("Coleta de métricas parada")
    
    async def _collection_loop(self):
        """Loop principal de coleta"""
        while self._running:
            try:
                await self._collect_metrics()
                await asyncio.sleep(self._collection_interval)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Erro na coleta de métricas: {e}")
                await asyncio.sleep(self._collection_interval)
    
    async def _collect_metrics(self):
        """Coleta métricas do sistema"""
        try:
            # Métricas de performance
            perf_metrics = get_performance_metrics()
            stats = await perf_metrics.get_all_stats()
            
            # Métricas de sistema
            resource_monitor = get_resource_monitor()
            system_stats = await resource_monitor.get_system_stats()
            
            # Verificar alertas baseados nas métricas
            await self._check_performance_alerts(stats)
            await self._check_system_alerts(system_stats)
            
            logger.debug("Métricas coletadas", stats=stats, system=system_stats)
            
        except Exception as e:
            logger.error(f"Erro ao coletar métricas: {e}")
    
    async def _check_performance_alerts(self, stats: Dict[str, Any]):
        """Verifica alertas baseados em performance"""
        alert_manager = get_alert_manager()
        
        for operation, op_stats in stats.get("operations", {}).items():
            # Alerta para alta taxa de erro
            if op_stats.get("success_rate", 100) < 90:
                await alert_manager.create_alert(
                    AlertType.HIGH_ERROR_RATE,
                    AlertLevel.WARNING,
                    f"Alta taxa de erro em {operation}: {op_stats['success_rate']:.1f}%",
                    {"operation": operation, "success_rate": op_stats["success_rate"]}
                )
            
            # Alerta para degradação de performance
            if op_stats.get("avg_duration_ms", 0) > 1000:  # > 1 segundo
                await alert_manager.create_alert(
                    AlertType.PERFORMANCE_DEGRADATION,
                    AlertLevel.WARNING,
                    f"Performance degradada em {operation}: {op_stats['avg_duration_ms']:.0f}ms",
                    {"operation": operation, "avg_duration_ms": op_stats["avg_duration_ms"]}
                )
    
    async def _check_system_alerts(self, system_stats: Dict[str, Any]):
        """Verifica alertas baseados em recursos do sistema"""
        alert_manager = get_alert_manager()
        
        # Alerta para alta utilização de CPU
        cpu_percent = system_stats.get("cpu_percent", 0)
        if cpu_percent > 80:
            await alert_manager.create_alert(
                AlertType.SYSTEM_RESOURCE,
                AlertLevel.WARNING,
                f"Alta utilização de CPU: {cpu_percent:.1f}%",
                {"cpu_percent": cpu_percent}
            )
        
        # Alerta para alta utilização de memória
        memory_percent = system_stats.get("memory_percent", 0)
        if memory_percent > 85:
            await alert_manager.create_alert(
                AlertType.SYSTEM_RESOURCE,
                AlertLevel.CRITICAL if memory_percent > 95 else AlertLevel.WARNING,
                f"Alta utilização de memória: {memory_percent:.1f}%",
                {"memory_percent": memory_percent}
            )


# ============================================
# DASHBOARD DE ESTATÍSTICAS
# ============================================

class StatsDashboard:
    """Dashboard com estatísticas do sistema de automações"""
    
    async def get_dashboard_data(self) -> Dict[str, Any]:
        """Obtém dados completos do dashboard"""
        try:
            # Métricas de performance
            perf_metrics = get_performance_metrics()
            performance_stats = await perf_metrics.get_all_stats()
            
            # Métricas de sistema
            resource_monitor = get_resource_monitor()
            system_stats = await resource_monitor.get_system_stats()
            
            # Alertas
            alert_manager = get_alert_manager()
            alert_stats = await alert_manager.get_alert_stats()
            active_alerts = await alert_manager.get_active_alerts()
            
            return {
                "timestamp": datetime.now().isoformat(),
                "performance": performance_stats,
                "system": system_stats,
                "alerts": {
                    "stats": alert_stats,
                    "active": [
                        {
                            "id": alert.id,
                            "type": alert.alert_type,
                            "level": alert.level,
                            "message": alert.message,
                            "created_at": alert.created_at.isoformat()
                        }
                        for alert in active_alerts[:10]  # Últimos 10
                    ]
                },
                "health": await self._get_health_status(performance_stats, system_stats, alert_stats)
            }
            
        except Exception as e:
            logger.error(f"Erro ao obter dados do dashboard: {e}")
            return {
                "timestamp": datetime.now().isoformat(),
                "error": str(e),
                "health": "unhealthy"
            }
    
    async def _get_health_status(
        self, 
        performance_stats: Dict[str, Any],
        system_stats: Dict[str, Any],
        alert_stats: Dict[str, Any]
    ) -> str:
        """Determina status geral de saúde do sistema"""
        
        # Verificar alertas críticos
        if alert_stats.get("critical_active", 0) > 0:
            return "critical"
        
        # Verificar recursos do sistema
        memory_percent = system_stats.get("memory_percent", 0)
        cpu_percent = system_stats.get("cpu_percent", 0)
        
        if memory_percent > 90 or cpu_percent > 90:
            return "warning"
        
        # Verificar performance das operações
        operations = performance_stats.get("operations", {})
        for op_stats in operations.values():
            if op_stats.get("success_rate", 100) < 95:
                return "warning"
        
        return "healthy"


# ============================================
# SINGLETONS E FUNÇÕES HELPER
# ============================================

# Singleton instances
_alert_manager: Optional[AlertManager] = None
_metrics_collector: Optional[MetricsCollector] = None
_stats_dashboard: Optional[StatsDashboard] = None


def get_alert_manager() -> AlertManager:
    """Obtém instância singleton do AlertManager"""
    global _alert_manager
    if _alert_manager is None:
        _alert_manager = AlertManager()
    return _alert_manager


def get_metrics_collector() -> MetricsCollector:
    """Obtém instância singleton do MetricsCollector"""
    global _metrics_collector
    if _metrics_collector is None:
        _metrics_collector = MetricsCollector()
    return _metrics_collector


def get_stats_dashboard() -> StatsDashboard:
    """Obtém instância singleton do StatsDashboard"""
    global _stats_dashboard
    if _stats_dashboard is None:
        _stats_dashboard = StatsDashboard()
    return _stats_dashboard


# ============================================
# HANDLERS DE ALERTA PADRÃO
# ============================================

async def log_alert_handler(alert: Alert):
    """Handler padrão que registra alertas no log"""
    logger.log(
        alert.level.upper(),
        f"ALERT HANDLER: {alert.message}",
        alert_id=alert.id,
        alert_type=alert.alert_type,
        metadata=alert.metadata
    )


async def critical_alert_handler(alert: Alert):
    """Handler para alertas críticos"""
    if alert.level == AlertLevel.CRITICAL:
        logger.critical(
            f"CRITICAL ALERT: {alert.message}",
            alert_id=alert.id,
            alert_type=alert.alert_type,
            metadata=alert.metadata
        )
        
        # Aqui poderia enviar email, SMS, webhook, etc.
        # Por enquanto apenas log crítico


# ============================================
# INICIALIZAÇÃO DO SISTEMA DE MONITORAMENTO
# ============================================

async def initialize_monitoring():
    """Inicializa sistema de monitoramento"""
    try:
        # Registrar handlers padrão
        alert_manager = get_alert_manager()
        
        # Handler para todos os tipos de alerta
        for alert_type in AlertType:
            alert_manager.register_handler(alert_type, log_alert_handler)
        
        # Handler específico para alertas críticos
        for alert_type in AlertType:
            alert_manager.register_handler(alert_type, critical_alert_handler)
        
        # Iniciar coleta de métricas
        metrics_collector = get_metrics_collector()
        await metrics_collector.start_collection()
        
        logger.info("Sistema de monitoramento inicializado")
        
    except Exception as e:
        logger.error(f"Erro ao inicializar monitoramento: {e}")


async def shutdown_monitoring():
    """Finaliza sistema de monitoramento"""
    try:
        metrics_collector = get_metrics_collector()
        await metrics_collector.stop_collection()
        
        logger.info("Sistema de monitoramento finalizado")
        
    except Exception as e:
        logger.error(f"Erro ao finalizar monitoramento: {e}")