"""
Monitoramento e métricas de webhooks
"""
import time
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Any, Optional
from collections import defaultdict, deque

import structlog

logger = structlog.get_logger(__name__)


class WebhookMetricsCollector:
    """
    Coletor de métricas para webhooks.
    """
    
    def __init__(self, max_history: int = 1000):
        self.max_history = max_history
        
        # Métricas gerais
        self.total_received = 0
        self.total_processed = 0
        self.total_failed = 0
        
        # Métricas por tipo de evento
        self.events_count = defaultdict(int)
        self.events_success = defaultdict(int)
        self.events_failed = defaultdict(int)
        
        # Métricas de performance
        self.processing_times = deque(maxlen=max_history)
        self.response_times = deque(maxlen=max_history)
        
        # Histórico de eventos (últimos N)
        self.event_history = deque(maxlen=max_history)
        
        # Métricas por hora
        self.hourly_stats = defaultdict(lambda: {
            'received': 0,
            'processed': 0,
            'failed': 0,
            'avg_processing_time': 0.0
        })
        
        # Alertas
        self.alerts = []
        self.alert_thresholds = {
            'error_rate': 0.1,  # 10% de erro
            'avg_processing_time': 5000,  # 5 segundos
            'queue_size': 100  # 100 webhooks pendentes
        }
        
        # Timestamp de início
        self.start_time = time.time()
    
    def record_webhook_received(self, event_type: str, request_id: str, timestamp: Optional[float] = None):
        """
        Registra webhook recebido.
        
        Args:
            event_type: Tipo do evento
            request_id: ID da requisição
            timestamp: Timestamp do evento (opcional)
        """
        if timestamp is None:
            timestamp = time.time()
            
        self.total_received += 1
        self.events_count[event_type] += 1
        
        # Registrar no histórico
        self.event_history.append({
            'type': 'received',
            'event_type': event_type,
            'request_id': request_id,
            'timestamp': timestamp
        })
        
        # Atualizar estatísticas horárias
        hour_key = datetime.fromtimestamp(timestamp).strftime('%Y-%m-%d-%H')
        self.hourly_stats[hour_key]['received'] += 1
        
        logger.debug(
            "webhook_metrics: Webhook recebido registrado",
            event_type=event_type,
            request_id=request_id,
            total_received=self.total_received
        )
    
    def record_webhook_processed(self, event_type: str, request_id: str, 
                                success: bool, processing_time_ms: float,
                                timestamp: Optional[float] = None):
        """
        Registra webhook processado.
        
        Args:
            event_type: Tipo do evento
            request_id: ID da requisição
            success: Se processamento foi bem-sucedido
            processing_time_ms: Tempo de processamento em ms
            timestamp: Timestamp do evento (opcional)
        """
        if timestamp is None:
            timestamp = time.time()
            
        if success:
            self.total_processed += 1
            self.events_success[event_type] += 1
        else:
            self.total_failed += 1
            self.events_failed[event_type] += 1
        
        # Registrar tempo de processamento
        self.processing_times.append(processing_time_ms)
        
        # Registrar no histórico
        self.event_history.append({
            'type': 'processed',
            'event_type': event_type,
            'request_id': request_id,
            'success': success,
            'processing_time_ms': processing_time_ms,
            'timestamp': timestamp
        })
        
        # Atualizar estatísticas horárias
        hour_key = datetime.fromtimestamp(timestamp).strftime('%Y-%m-%d-%H')
        hour_stats = self.hourly_stats[hour_key]
        
        if success:
            hour_stats['processed'] += 1
        else:
            hour_stats['failed'] += 1
            
        # Atualizar tempo médio da hora
        if hour_stats['processed'] > 0:
            hour_stats['avg_processing_time'] = (
                hour_stats['avg_processing_time'] + processing_time_ms
            ) / 2
        
        # Verificar alertas
        self._check_alerts(event_type, success, processing_time_ms)
        
        logger.debug(
            "webhook_metrics: Webhook processado registrado",
            event_type=event_type,
            request_id=request_id,
            success=success,
            processing_time_ms=processing_time_ms
        )
    
    def _check_alerts(self, event_type: str, success: bool, processing_time_ms: float):
        """
        Verifica se algum alerta deve ser disparado.
        
        Args:
            event_type: Tipo do evento
            success: Se processamento foi bem-sucedido
            processing_time_ms: Tempo de processamento
        """
        current_time = time.time()
        
        # Alerta de taxa de erro alta
        if self.total_received > 10:  # Só alertar após 10 webhooks
            error_rate = self.total_failed / self.total_received
            if error_rate > self.alert_thresholds['error_rate']:
                self._add_alert(
                    'high_error_rate',
                    f"Taxa de erro alta: {error_rate:.1%}",
                    'warning',
                    current_time
                )
        
        # Alerta de processamento lento
        if processing_time_ms > self.alert_thresholds['avg_processing_time']:
            self._add_alert(
                'slow_processing',
                f"Processamento lento: {processing_time_ms:.0f}ms",
                'warning',
                current_time
            )
        
        # Alerta de falha crítica
        if not success:
            self._add_alert(
                'processing_failed',
                f"Falha no processamento do evento {event_type}",
                'error',
                current_time
            )
    
    def _add_alert(self, alert_type: str, message: str, severity: str, timestamp: float):
        """
        Adiciona alerta à lista.
        
        Args:
            alert_type: Tipo do alerta
            message: Mensagem do alerta
            severity: Severidade (info, warning, error, critical)
            timestamp: Timestamp do alerta
        """
        alert = {
            'type': alert_type,
            'message': message,
            'severity': severity,
            'timestamp': timestamp,
            'datetime': datetime.fromtimestamp(timestamp).isoformat()
        }
        
        self.alerts.append(alert)
        
        # Manter apenas últimos 100 alertas
        if len(self.alerts) > 100:
            self.alerts.pop(0)
        
        logger.warning(
            f"webhook_metrics: Alerta disparado - {message}",
            alert_type=alert_type,
            severity=severity
        )
    
    def get_current_metrics(self) -> Dict[str, Any]:
        """
        Obtém métricas atuais.
        
        Returns:
            Dicionário com métricas atuais
        """
        current_time = time.time()
        uptime_seconds = current_time - self.start_time
        
        # Calcular estatísticas de performance
        avg_processing_time = 0.0
        p95_processing_time = 0.0
        p99_processing_time = 0.0
        
        if self.processing_times:
            sorted_times = sorted(self.processing_times)
            avg_processing_time = sum(sorted_times) / len(sorted_times)
            
            if len(sorted_times) >= 20:  # Só calcular percentis com dados suficientes
                p95_index = int(len(sorted_times) * 0.95)
                p99_index = int(len(sorted_times) * 0.99)
                p95_processing_time = sorted_times[p95_index]
                p99_processing_time = sorted_times[p99_index]
        
        # Taxa de sucesso
        success_rate = 0.0
        if self.total_received > 0:
            success_rate = self.total_processed / self.total_received
        
        # Taxa de erro
        error_rate = 0.0
        if self.total_received > 0:
            error_rate = self.total_failed / self.total_received
        
        return {
            'summary': {
                'total_received': self.total_received,
                'total_processed': self.total_processed,
                'total_failed': self.total_failed,
                'success_rate': success_rate,
                'error_rate': error_rate,
                'uptime_seconds': uptime_seconds
            },
            'performance': {
                'avg_processing_time_ms': avg_processing_time,
                'p95_processing_time_ms': p95_processing_time,
                'p99_processing_time_ms': p99_processing_time,
                'total_samples': len(self.processing_times)
            },
            'events': {
                'by_type': dict(self.events_count),
                'success_by_type': dict(self.events_success),
                'failed_by_type': dict(self.events_failed)
            },
            'alerts': {
                'active_alerts': len([a for a in self.alerts if current_time - a['timestamp'] < 3600]),
                'recent_alerts': self.alerts[-10:] if self.alerts else [],
                'thresholds': self.alert_thresholds
            },
            'timestamp': datetime.now(timezone.utc).isoformat()
        }
    
    def get_hourly_stats(self, hours: int = 24) -> Dict[str, Any]:
        """
        Obtém estatísticas das últimas N horas.
        
        Args:
            hours: Número de horas para incluir
            
        Returns:
            Estatísticas horárias
        """
        current_time = datetime.now()
        stats = {}
        
        for i in range(hours):
            hour_time = current_time - timedelta(hours=i)
            hour_key = hour_time.strftime('%Y-%m-%d-%H')
            
            if hour_key in self.hourly_stats:
                stats[hour_key] = self.hourly_stats[hour_key].copy()
            else:
                stats[hour_key] = {
                    'received': 0,
                    'processed': 0,
                    'failed': 0,
                    'avg_processing_time': 0.0
                }
        
        return {
            'hourly_stats': stats,
            'period_hours': hours,
            'timestamp': datetime.now(timezone.utc).isoformat()
        }
    
    def get_recent_events(self, limit: int = 50) -> List[Dict[str, Any]]:
        """
        Obtém eventos recentes.
        
        Args:
            limit: Número máximo de eventos
            
        Returns:
            Lista de eventos recentes
        """
        events = list(self.event_history)[-limit:]
        
        # Adicionar datetime legível
        for event in events:
            event['datetime'] = datetime.fromtimestamp(event['timestamp']).isoformat()
        
        return events
    
    def reset_metrics(self):
        """
        Reseta todas as métricas.
        """
        self.total_received = 0
        self.total_processed = 0
        self.total_failed = 0
        
        self.events_count.clear()
        self.events_success.clear()
        self.events_failed.clear()
        
        self.processing_times.clear()
        self.response_times.clear()
        self.event_history.clear()
        
        self.hourly_stats.clear()
        self.alerts.clear()
        
        self.start_time = time.time()
        
        logger.info("webhook_metrics: Métricas resetadas")


# Instância global do coletor
webhook_metrics_collector = WebhookMetricsCollector()


def record_webhook_received(event_type: str, request_id: str):
    """
    Registra webhook recebido (função helper).
    """
    webhook_metrics_collector.record_webhook_received(event_type, request_id)


def record_webhook_processed(event_type: str, request_id: str, success: bool, processing_time_ms: float):
    """
    Registra webhook processado (função helper).
    """
    webhook_metrics_collector.record_webhook_processed(
        event_type, request_id, success, processing_time_ms
    )


def get_webhook_metrics() -> Dict[str, Any]:
    """
    Obtém métricas atuais (função helper).
    """
    return webhook_metrics_collector.get_current_metrics()


def get_webhook_hourly_stats(hours: int = 24) -> Dict[str, Any]:
    """
    Obtém estatísticas horárias (função helper).
    """
    return webhook_metrics_collector.get_hourly_stats(hours)


def get_recent_webhook_events(limit: int = 50) -> List[Dict[str, Any]]:
    """
    Obtém eventos recentes (função helper).
    """
    return webhook_metrics_collector.get_recent_events(limit)