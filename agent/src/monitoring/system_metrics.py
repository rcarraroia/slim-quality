"""
Métricas de sistema - CPU, memória, disk, network
"""
import asyncio
import psutil
import time
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional
from collections import deque

import structlog

logger = structlog.get_logger(__name__)


class SystemMetricsCollector:
    """
    Coletor de métricas do sistema.
    """
    
    def __init__(self, max_history: int = 1000):
        self.max_history = max_history
        
        # Histórico de métricas
        self.cpu_history = deque(maxlen=max_history)
        self.memory_history = deque(maxlen=max_history)
        self.disk_history = deque(maxlen=max_history)
        self.network_history = deque(maxlen=max_history)
        
        # Contadores de rede (para calcular taxa)
        self.last_network_stats = None
        self.last_network_time = None
        
        # Alertas
        self.alerts = []
        self.alert_thresholds = {
            'cpu_percent': 80.0,      # 80% CPU
            'memory_percent': 90.0,   # 90% Memória
            'disk_percent': 90.0,     # 90% Disco
            'disk_free_gb': 1.0,      # 1GB livre mínimo
            'load_average': 4.0       # Load average
        }
        
        # Timestamp de início
        self.start_time = time.time()
    
    async def collect_cpu_metrics(self) -> Dict[str, Any]:
        """
        Coleta métricas de CPU.
        
        Returns:
            Métricas de CPU
        """
        try:
            # CPU percentual (média de 1 segundo)
            cpu_percent = psutil.cpu_percent(interval=1)
            
            # CPU por core
            cpu_per_core = psutil.cpu_percent(interval=None, percpu=True)
            
            # Load average (Unix/Linux)
            load_avg = None
            try:
                load_avg = psutil.getloadavg()
            except AttributeError:
                # Windows não tem load average
                load_avg = [0.0, 0.0, 0.0]
            
            # Contagem de cores
            cpu_count_logical = psutil.cpu_count(logical=True)
            cpu_count_physical = psutil.cpu_count(logical=False)
            
            # Frequência CPU
            cpu_freq = psutil.cpu_freq()
            
            metrics = {
                'cpu_percent': cpu_percent,
                'cpu_per_core': cpu_per_core,
                'load_average': {
                    '1min': load_avg[0],
                    '5min': load_avg[1],
                    '15min': load_avg[2]
                },
                'cpu_count': {
                    'logical': cpu_count_logical,
                    'physical': cpu_count_physical
                },
                'cpu_frequency': {
                    'current': cpu_freq.current if cpu_freq else 0,
                    'min': cpu_freq.min if cpu_freq else 0,
                    'max': cpu_freq.max if cpu_freq else 0
                },
                'timestamp': time.time()
            }
            
            # Adicionar ao histórico
            self.cpu_history.append(metrics)
            
            # Verificar alertas
            self._check_cpu_alerts(metrics)
            
            return metrics
            
        except Exception as e:
            logger.error(f"collect_cpu_metrics: Erro ao coletar: {e}")
            return {'error': str(e), 'timestamp': time.time()}
    
    async def collect_memory_metrics(self) -> Dict[str, Any]:
        """
        Coleta métricas de memória.
        
        Returns:
            Métricas de memória
        """
        try:
            # Memória virtual (RAM)
            virtual_memory = psutil.virtual_memory()
            
            # Memória swap
            swap_memory = psutil.swap_memory()
            
            metrics = {
                'virtual_memory': {
                    'total': virtual_memory.total,
                    'available': virtual_memory.available,
                    'used': virtual_memory.used,
                    'free': virtual_memory.free,
                    'percent': virtual_memory.percent,
                    'total_gb': round(virtual_memory.total / (1024**3), 2),
                    'available_gb': round(virtual_memory.available / (1024**3), 2),
                    'used_gb': round(virtual_memory.used / (1024**3), 2)
                },
                'swap_memory': {
                    'total': swap_memory.total,
                    'used': swap_memory.used,
                    'free': swap_memory.free,
                    'percent': swap_memory.percent,
                    'total_gb': round(swap_memory.total / (1024**3), 2),
                    'used_gb': round(swap_memory.used / (1024**3), 2)
                },
                'timestamp': time.time()
            }
            
            # Adicionar ao histórico
            self.memory_history.append(metrics)
            
            # Verificar alertas
            self._check_memory_alerts(metrics)
            
            return metrics
            
        except Exception as e:
            logger.error(f"collect_memory_metrics: Erro ao coletar: {e}")
            return {'error': str(e), 'timestamp': time.time()}
    
    async def collect_disk_metrics(self) -> Dict[str, Any]:
        """
        Coleta métricas de disco.
        
        Returns:
            Métricas de disco
        """
        try:
            # Uso do disco raiz
            disk_usage = psutil.disk_usage('/')
            
            # I/O do disco
            disk_io = psutil.disk_io_counters()
            
            # Partições
            partitions = []
            for partition in psutil.disk_partitions():
                try:
                    partition_usage = psutil.disk_usage(partition.mountpoint)
                    partitions.append({
                        'device': partition.device,
                        'mountpoint': partition.mountpoint,
                        'fstype': partition.fstype,
                        'total_gb': round(partition_usage.total / (1024**3), 2),
                        'used_gb': round(partition_usage.used / (1024**3), 2),
                        'free_gb': round(partition_usage.free / (1024**3), 2),
                        'percent': round((partition_usage.used / partition_usage.total) * 100, 2)
                    })
                except PermissionError:
                    # Ignorar partições sem permissão
                    continue
            
            metrics = {
                'root_disk': {
                    'total': disk_usage.total,
                    'used': disk_usage.used,
                    'free': disk_usage.free,
                    'percent': round((disk_usage.used / disk_usage.total) * 100, 2),
                    'total_gb': round(disk_usage.total / (1024**3), 2),
                    'used_gb': round(disk_usage.used / (1024**3), 2),
                    'free_gb': round(disk_usage.free / (1024**3), 2)
                },
                'disk_io': {
                    'read_count': disk_io.read_count if disk_io else 0,
                    'write_count': disk_io.write_count if disk_io else 0,
                    'read_bytes': disk_io.read_bytes if disk_io else 0,
                    'write_bytes': disk_io.write_bytes if disk_io else 0,
                    'read_time': disk_io.read_time if disk_io else 0,
                    'write_time': disk_io.write_time if disk_io else 0
                },
                'partitions': partitions,
                'timestamp': time.time()
            }
            
            # Adicionar ao histórico
            self.disk_history.append(metrics)
            
            # Verificar alertas
            self._check_disk_alerts(metrics)
            
            return metrics
            
        except Exception as e:
            logger.error(f"collect_disk_metrics: Erro ao coletar: {e}")
            return {'error': str(e), 'timestamp': time.time()}
    
    async def collect_network_metrics(self) -> Dict[str, Any]:
        """
        Coleta métricas de rede.
        
        Returns:
            Métricas de rede
        """
        try:
            current_time = time.time()
            
            # Estatísticas de rede
            network_io = psutil.net_io_counters()
            
            # Calcular taxa se temos dados anteriores
            bytes_sent_rate = 0
            bytes_recv_rate = 0
            
            if self.last_network_stats and self.last_network_time:
                time_diff = current_time - self.last_network_time
                if time_diff > 0:
                    bytes_sent_rate = (network_io.bytes_sent - self.last_network_stats.bytes_sent) / time_diff
                    bytes_recv_rate = (network_io.bytes_recv - self.last_network_stats.bytes_recv) / time_diff
            
            # Conexões de rede
            connections = psutil.net_connections()
            connection_stats = {
                'total': len(connections),
                'established': len([c for c in connections if c.status == 'ESTABLISHED']),
                'listen': len([c for c in connections if c.status == 'LISTEN']),
                'time_wait': len([c for c in connections if c.status == 'TIME_WAIT'])
            }
            
            metrics = {
                'network_io': {
                    'bytes_sent': network_io.bytes_sent,
                    'bytes_recv': network_io.bytes_recv,
                    'packets_sent': network_io.packets_sent,
                    'packets_recv': network_io.packets_recv,
                    'errin': network_io.errin,
                    'errout': network_io.errout,
                    'dropin': network_io.dropin,
                    'dropout': network_io.dropout,
                    'bytes_sent_mb': round(network_io.bytes_sent / (1024**2), 2),
                    'bytes_recv_mb': round(network_io.bytes_recv / (1024**2), 2)
                },
                'network_rates': {
                    'bytes_sent_per_sec': bytes_sent_rate,
                    'bytes_recv_per_sec': bytes_recv_rate,
                    'bytes_sent_per_sec_mb': round(bytes_sent_rate / (1024**2), 2),
                    'bytes_recv_per_sec_mb': round(bytes_recv_rate / (1024**2), 2)
                },
                'connections': connection_stats,
                'timestamp': current_time
            }
            
            # Salvar para próximo cálculo de taxa
            self.last_network_stats = network_io
            self.last_network_time = current_time
            
            # Adicionar ao histórico
            self.network_history.append(metrics)
            
            return metrics
            
        except Exception as e:
            logger.error(f"collect_network_metrics: Erro ao coletar: {e}")
            return {'error': str(e), 'timestamp': time.time()}
    
    def _check_cpu_alerts(self, metrics: Dict[str, Any]):
        """Verifica alertas de CPU."""
        cpu_percent = metrics.get('cpu_percent', 0)
        load_avg_1min = metrics.get('load_average', {}).get('1min', 0)
        
        if cpu_percent > self.alert_thresholds['cpu_percent']:
            self._add_alert(
                'high_cpu_usage',
                f"CPU usage alto: {cpu_percent:.1f}%",
                'warning'
            )
        
        if load_avg_1min > self.alert_thresholds['load_average']:
            self._add_alert(
                'high_load_average',
                f"Load average alto: {load_avg_1min:.2f}",
                'warning'
            )
    
    def _check_memory_alerts(self, metrics: Dict[str, Any]):
        """Verifica alertas de memória."""
        memory_percent = metrics.get('virtual_memory', {}).get('percent', 0)
        
        if memory_percent > self.alert_thresholds['memory_percent']:
            self._add_alert(
                'high_memory_usage',
                f"Uso de memória alto: {memory_percent:.1f}%",
                'warning'
            )
    
    def _check_disk_alerts(self, metrics: Dict[str, Any]):
        """Verifica alertas de disco."""
        disk_percent = metrics.get('root_disk', {}).get('percent', 0)
        disk_free_gb = metrics.get('root_disk', {}).get('free_gb', 0)
        
        if disk_percent > self.alert_thresholds['disk_percent']:
            self._add_alert(
                'high_disk_usage',
                f"Uso de disco alto: {disk_percent:.1f}%",
                'warning'
            )
        
        if disk_free_gb < self.alert_thresholds['disk_free_gb']:
            self._add_alert(
                'low_disk_space',
                f"Pouco espaço em disco: {disk_free_gb:.1f}GB livre",
                'critical'
            )
    
    def _add_alert(self, alert_type: str, message: str, severity: str):
        """Adiciona alerta à lista."""
        current_time = time.time()
        
        # Evitar spam de alertas (mesmo tipo em menos de 5 minutos)
        recent_alerts = [
            a for a in self.alerts 
            if a['type'] == alert_type and current_time - a['timestamp'] < 300
        ]
        
        if recent_alerts:
            return  # Não adicionar alerta duplicado recente
        
        alert = {
            'type': alert_type,
            'message': message,
            'severity': severity,
            'timestamp': current_time,
            'datetime': datetime.fromtimestamp(current_time).isoformat()
        }
        
        self.alerts.append(alert)
        
        # Manter apenas últimos 100 alertas
        if len(self.alerts) > 100:
            self.alerts.pop(0)
        
        logger.warning(
            f"system_metrics: Alerta disparado - {message}",
            alert_type=alert_type,
            severity=severity
        )
    
    async def collect_all_metrics(self) -> Dict[str, Any]:
        """
        Coleta todas as métricas do sistema.
        
        Returns:
            Todas as métricas coletadas
        """
        try:
            # Coletar todas as métricas em paralelo
            cpu_task = self.collect_cpu_metrics()
            memory_task = self.collect_memory_metrics()
            disk_task = self.collect_disk_metrics()
            network_task = self.collect_network_metrics()
            
            cpu_metrics, memory_metrics, disk_metrics, network_metrics = await asyncio.gather(
                cpu_task, memory_task, disk_task, network_task
            )
            
            # Informações do processo atual
            process = psutil.Process()
            process_info = {
                'pid': process.pid,
                'cpu_percent': process.cpu_percent(),
                'memory_percent': process.memory_percent(),
                'memory_info': {
                    'rss': process.memory_info().rss,
                    'vms': process.memory_info().vms,
                    'rss_mb': round(process.memory_info().rss / (1024**2), 2),
                    'vms_mb': round(process.memory_info().vms / (1024**2), 2)
                },
                'num_threads': process.num_threads(),
                'create_time': process.create_time(),
                'status': process.status()
            }
            
            return {
                'cpu': cpu_metrics,
                'memory': memory_metrics,
                'disk': disk_metrics,
                'network': network_metrics,
                'process': process_info,
                'alerts': {
                    'active_alerts': len([a for a in self.alerts if time.time() - a['timestamp'] < 3600]),
                    'recent_alerts': self.alerts[-5:] if self.alerts else [],
                    'thresholds': self.alert_thresholds
                },
                'uptime_seconds': time.time() - self.start_time,
                'timestamp': datetime.now(timezone.utc).isoformat()
            }
            
        except Exception as e:
            logger.error(f"collect_all_metrics: Erro geral: {e}")
            return {
                'error': str(e),
                'timestamp': datetime.now(timezone.utc).isoformat()
            }
    
    def get_historical_data(self, metric_type: str, minutes: int = 60) -> List[Dict[str, Any]]:
        """
        Obtém dados históricos de uma métrica.
        
        Args:
            metric_type: Tipo da métrica (cpu, memory, disk, network)
            minutes: Minutos de histórico
            
        Returns:
            Lista de dados históricos
        """
        current_time = time.time()
        cutoff_time = current_time - (minutes * 60)
        
        if metric_type == 'cpu':
            history = self.cpu_history
        elif metric_type == 'memory':
            history = self.memory_history
        elif metric_type == 'disk':
            history = self.disk_history
        elif metric_type == 'network':
            history = self.network_history
        else:
            return []
        
        # Filtrar por tempo
        filtered_data = [
            data for data in history 
            if data.get('timestamp', 0) >= cutoff_time
        ]
        
        return list(filtered_data)


# Instância global do coletor
system_metrics_collector = SystemMetricsCollector()


async def get_system_metrics() -> Dict[str, Any]:
    """
    Obtém métricas atuais do sistema (função helper).
    """
    return await system_metrics_collector.collect_all_metrics()


def get_system_historical_data(metric_type: str, minutes: int = 60) -> List[Dict[str, Any]]:
    """
    Obtém dados históricos do sistema (função helper).
    """
    return system_metrics_collector.get_historical_data(metric_type, minutes)