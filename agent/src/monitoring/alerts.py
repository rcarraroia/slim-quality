"""
Sistema de alertas automáticos
"""
import asyncio
import time
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional, Callable
from enum import Enum

import structlog

logger = structlog.get_logger(__name__)


class AlertSeverity(Enum):
    """Níveis de severidade de alertas."""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class AlertStatus(Enum):
    """Status de alertas."""
    ACTIVE = "active"
    RESOLVED = "resolved"
    ACKNOWLEDGED = "acknowledged"


class Alert:
    """Classe para representar um alerta."""
    
    def __init__(self, alert_type: str, message: str, severity: AlertSeverity, 
                 source: str = "system", metadata: Optional[Dict[str, Any]] = None):
        self.id = f"{alert_type}_{int(time.time() * 1000)}"
        self.type = alert_type
        self.message = message
        self.severity = severity
        self.source = source
        self.metadata = metadata or {}
        self.status = AlertStatus.ACTIVE
        self.created_at = time.time()
        self.updated_at = self.created_at
        self.resolved_at = None
        self.acknowledged_at = None
    
    def acknowledge(self):
        """Marca alerta como reconhecido."""
        self.status = AlertStatus.ACKNOWLEDGED
        self.acknowledged_at = time.time()
        self.updated_at = time.time()
    
    def resolve(self):
        """Marca alerta como resolvido."""
        self.status = AlertStatus.RESOLVED
        self.resolved_at = time.time()
        self.updated_at = time.time()
    
    def to_dict(self) -> Dict[str, Any]:
        """Converte alerta para dicionário."""
        return {
            'id': self.id,
            'type': self.type,
            'message': self.message,
            'severity': self.severity.value,
            'source': self.source,
            'status': self.status.value,
            'metadata': self.metadata,
            'created_at': self.created_at,
            'updated_at': self.updated_at,
            'resolved_at': self.resolved_at,
            'acknowledged_at': self.acknowledged_at,
            'created_datetime': datetime.fromtimestamp(self.created_at).isoformat(),
            'age_seconds': time.time() - self.created_at
        }


class AlertRule:
    """Regra de alerta."""
    
    def __init__(self, name: str, condition: Callable[[Dict[str, Any]], bool],
                 alert_type: str, message_template: str, severity: AlertSeverity,
                 cooldown_seconds: int = 300):
        self.name = name
        self.condition = condition
        self.alert_type = alert_type
        self.message_template = message_template
        self.severity = severity
        self.cooldown_seconds = cooldown_seconds
        self.last_triggered = 0
        self.enabled = True
    
    def check(self, metrics: Dict[str, Any]) -> Optional[Alert]:
        """
        Verifica se a regra deve disparar um alerta.
        
        Args:
            metrics: Métricas atuais
            
        Returns:
            Alert se condição atendida, None caso contrário
        """
        if not self.enabled:
            return None
        
        current_time = time.time()
        
        # Verificar cooldown
        if current_time - self.last_triggered < self.cooldown_seconds:
            return None
        
        try:
            if self.condition(metrics):
                self.last_triggered = current_time
                
                # Gerar mensagem com dados das métricas
                message = self.message_template.format(**metrics)
                
                return Alert(
                    alert_type=self.alert_type,
                    message=message,
                    severity=self.severity,
                    source="alert_rule",
                    metadata={
                        'rule_name': self.name,
                        'metrics_snapshot': metrics
                    }
                )
        except Exception as e:
            logger.error(f"AlertRule.check: Erro na regra {self.name}: {e}")
        
        return None


class AlertManager:
    """Gerenciador de alertas."""
    
    def __init__(self, max_alerts: int = 1000):
        self.max_alerts = max_alerts
        self.alerts: List[Alert] = []
        self.rules: List[AlertRule] = []
        self.handlers: List[Callable[[Alert], None]] = []
        
        # Configurar regras padrão
        self._setup_default_rules()
    
    def _setup_default_rules(self):
        """Configura regras de alerta padrão."""
        
        # CPU alto
        self.add_rule(AlertRule(
            name="high_cpu_usage",
            condition=lambda m: m.get('cpu', {}).get('cpu_percent', 0) > 80,
            alert_type="high_cpu",
            message_template="CPU usage alto: {cpu[cpu_percent]:.1f}%",
            severity=AlertSeverity.WARNING,
            cooldown_seconds=300
        ))
        
        # CPU crítico
        self.add_rule(AlertRule(
            name="critical_cpu_usage",
            condition=lambda m: m.get('cpu', {}).get('cpu_percent', 0) > 95,
            alert_type="critical_cpu",
            message_template="CPU usage crítico: {cpu[cpu_percent]:.1f}%",
            severity=AlertSeverity.CRITICAL,
            cooldown_seconds=60
        ))
        
        # Memória alta
        self.add_rule(AlertRule(
            name="high_memory_usage",
            condition=lambda m: m.get('memory', {}).get('virtual_memory', {}).get('percent', 0) > 85,
            alert_type="high_memory",
            message_template="Uso de memória alto: {memory[virtual_memory][percent]:.1f}%",
            severity=AlertSeverity.WARNING,
            cooldown_seconds=300
        ))
        
        # Memória crítica
        self.add_rule(AlertRule(
            name="critical_memory_usage",
            condition=lambda m: m.get('memory', {}).get('virtual_memory', {}).get('percent', 0) > 95,
            alert_type="critical_memory",
            message_template="Uso de memória crítico: {memory[virtual_memory][percent]:.1f}%",
            severity=AlertSeverity.CRITICAL,
            cooldown_seconds=60
        ))
        
        # Disco alto
        self.add_rule(AlertRule(
            name="high_disk_usage",
            condition=lambda m: m.get('disk', {}).get('root_disk', {}).get('percent', 0) > 85,
            alert_type="high_disk",
            message_template="Uso de disco alto: {disk[root_disk][percent]:.1f}%",
            severity=AlertSeverity.WARNING,
            cooldown_seconds=600
        ))
        
        # Disco crítico
        self.add_rule(AlertRule(
            name="critical_disk_usage",
            condition=lambda m: m.get('disk', {}).get('root_disk', {}).get('percent', 0) > 95,
            alert_type="critical_disk",
            message_template="Uso de disco crítico: {disk[root_disk][percent]:.1f}%",
            severity=AlertSeverity.CRITICAL,
            cooldown_seconds=300
        ))
        
        # Pouco espaço livre
        self.add_rule(AlertRule(
            name="low_disk_space",
            condition=lambda m: m.get('disk', {}).get('root_disk', {}).get('free_gb', 100) < 2.0,
            alert_type="low_disk_space",
            message_template="Pouco espaço em disco: {disk[root_disk][free_gb]:.1f}GB livre",
            severity=AlertSeverity.CRITICAL,
            cooldown_seconds=300
        ))
        
        # Load average alto
        self.add_rule(AlertRule(
            name="high_load_average",
            condition=lambda m: m.get('cpu', {}).get('load_average', {}).get('1min', 0) > 4.0,
            alert_type="high_load",
            message_template="Load average alto: {cpu[load_average][1min]:.2f}",
            severity=AlertSeverity.WARNING,
            cooldown_seconds=300
        ))
        
        # Processo usando muita memória
        self.add_rule(AlertRule(
            name="high_process_memory",
            condition=lambda m: m.get('process', {}).get('memory_percent', 0) > 50,
            alert_type="high_process_memory",
            message_template="Processo usando muita memória: {process[memory_percent]:.1f}%",
            severity=AlertSeverity.WARNING,
            cooldown_seconds=600
        ))
        
        # Muitas conexões de rede
        self.add_rule(AlertRule(
            name="high_network_connections",
            condition=lambda m: m.get('network', {}).get('connections', {}).get('total', 0) > 1000,
            alert_type="high_connections",
            message_template="Muitas conexões de rede: {network[connections][total]}",
            severity=AlertSeverity.WARNING,
            cooldown_seconds=600
        ))
    
    def add_rule(self, rule: AlertRule):
        """Adiciona regra de alerta."""
        self.rules.append(rule)
        logger.info(f"AlertManager: Regra adicionada - {rule.name}")
    
    def remove_rule(self, rule_name: str):
        """Remove regra de alerta."""
        self.rules = [r for r in self.rules if r.name != rule_name]
        logger.info(f"AlertManager: Regra removida - {rule_name}")
    
    def add_handler(self, handler: Callable[[Alert], None]):
        """Adiciona handler de alerta."""
        self.handlers.append(handler)
        logger.info("AlertManager: Handler adicionado")
    
    def create_alert(self, alert_type: str, message: str, severity: AlertSeverity,
                    source: str = "manual", metadata: Optional[Dict[str, Any]] = None) -> Alert:
        """
        Cria um novo alerta.
        
        Args:
            alert_type: Tipo do alerta
            message: Mensagem do alerta
            severity: Severidade
            source: Fonte do alerta
            metadata: Metadados adicionais
            
        Returns:
            Alerta criado
        """
        alert = Alert(alert_type, message, severity, source, metadata)
        
        # Adicionar à lista
        self.alerts.append(alert)
        
        # Manter limite de alertas
        if len(self.alerts) > self.max_alerts:
            self.alerts.pop(0)
        
        # Executar handlers
        for handler in self.handlers:
            try:
                handler(alert)
            except Exception as e:
                logger.error(f"AlertManager: Erro no handler: {e}")
        
        logger.info(
            f"AlertManager: Alerta criado - {alert.type}",
            severity=alert.severity.value,
            message=alert.message
        )
        
        return alert
    
    def check_rules(self, metrics: Dict[str, Any]):
        """
        Verifica todas as regras contra as métricas.
        
        Args:
            metrics: Métricas atuais
        """
        for rule in self.rules:
            try:
                alert = rule.check(metrics)
                if alert:
                    self.alerts.append(alert)
                    
                    # Manter limite
                    if len(self.alerts) > self.max_alerts:
                        self.alerts.pop(0)
                    
                    # Executar handlers
                    for handler in self.handlers:
                        try:
                            handler(alert)
                        except Exception as e:
                            logger.error(f"AlertManager: Erro no handler: {e}")
                    
                    logger.warning(
                        f"AlertManager: Alerta disparado - {alert.type}",
                        rule=rule.name,
                        severity=alert.severity.value,
                        message=alert.message
                    )
            except Exception as e:
                logger.error(f"AlertManager: Erro ao verificar regra {rule.name}: {e}")
    
    def get_active_alerts(self) -> List[Alert]:
        """Obtém alertas ativos."""
        return [a for a in self.alerts if a.status == AlertStatus.ACTIVE]
    
    def get_alerts_by_severity(self, severity: AlertSeverity) -> List[Alert]:
        """Obtém alertas por severidade."""
        return [a for a in self.alerts if a.severity == severity]
    
    def get_recent_alerts(self, minutes: int = 60) -> List[Alert]:
        """Obtém alertas recentes."""
        cutoff_time = time.time() - (minutes * 60)
        return [a for a in self.alerts if a.created_at >= cutoff_time]
    
    def acknowledge_alert(self, alert_id: str) -> bool:
        """
        Reconhece um alerta.
        
        Args:
            alert_id: ID do alerta
            
        Returns:
            True se reconhecido, False se não encontrado
        """
        for alert in self.alerts:
            if alert.id == alert_id:
                alert.acknowledge()
                logger.info(f"AlertManager: Alerta reconhecido - {alert_id}")
                return True
        return False
    
    def resolve_alert(self, alert_id: str) -> bool:
        """
        Resolve um alerta.
        
        Args:
            alert_id: ID do alerta
            
        Returns:
            True se resolvido, False se não encontrado
        """
        for alert in self.alerts:
            if alert.id == alert_id:
                alert.resolve()
                logger.info(f"AlertManager: Alerta resolvido - {alert_id}")
                return True
        return False
    
    def get_alert_summary(self) -> Dict[str, Any]:
        """
        Obtém resumo dos alertas.
        
        Returns:
            Resumo dos alertas
        """
        active_alerts = self.get_active_alerts()
        
        # Contar por severidade
        severity_counts = {
            'critical': len([a for a in active_alerts if a.severity == AlertSeverity.CRITICAL]),
            'error': len([a for a in active_alerts if a.severity == AlertSeverity.ERROR]),
            'warning': len([a for a in active_alerts if a.severity == AlertSeverity.WARNING]),
            'info': len([a for a in active_alerts if a.severity == AlertSeverity.INFO])
        }
        
        # Contar por tipo
        type_counts = {}
        for alert in active_alerts:
            type_counts[alert.type] = type_counts.get(alert.type, 0) + 1
        
        return {
            'total_alerts': len(self.alerts),
            'active_alerts': len(active_alerts),
            'severity_counts': severity_counts,
            'type_counts': type_counts,
            'rules_count': len(self.rules),
            'enabled_rules': len([r for r in self.rules if r.enabled]),
            'recent_alerts': [a.to_dict() for a in self.get_recent_alerts(60)],
            'timestamp': datetime.now(timezone.utc).isoformat()
        }


# Handler padrão para logs
def log_alert_handler(alert: Alert):
    """Handler que registra alertas nos logs."""
    logger.log(
        level=alert.severity.value.upper(),
        event=f"ALERT: {alert.message}",
        alert_id=alert.id,
        alert_type=alert.type,
        severity=alert.severity.value,
        source=alert.source
    )


# Instância global do gerenciador
alert_manager = AlertManager()

# Adicionar handler padrão
alert_manager.add_handler(log_alert_handler)


def create_alert(alert_type: str, message: str, severity: str = "warning",
                source: str = "manual", metadata: Optional[Dict[str, Any]] = None) -> Alert:
    """
    Cria um alerta (função helper).
    
    Args:
        alert_type: Tipo do alerta
        message: Mensagem
        severity: Severidade (info, warning, error, critical)
        source: Fonte
        metadata: Metadados
        
    Returns:
        Alerta criado
    """
    severity_enum = AlertSeverity(severity)
    return alert_manager.create_alert(alert_type, message, severity_enum, source, metadata)


def get_alert_summary() -> Dict[str, Any]:
    """Obtém resumo dos alertas (função helper)."""
    return alert_manager.get_alert_summary()


def check_system_alerts(metrics: Dict[str, Any]):
    """Verifica alertas do sistema (função helper)."""
    alert_manager.check_rules(metrics)