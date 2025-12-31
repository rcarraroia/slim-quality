"""
Metrics Service - Sistema de coleta e análise de métricas para SICC

Coleta e analisa métricas de performance do sistema:
- Métricas de padrões aplicados e eficácia
- Tempo de resposta e performance geral
- Taxa de sucesso por sub-agente
- Relatórios de evolução da inteligência
- Alertas para degradação de performance
"""

import structlog
from typing import Dict, List, Optional, Any, Union
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
import statistics
from collections import defaultdict, deque

logger = structlog.get_logger(__name__)


class MetricType(Enum):
    """Tipos de métricas coletadas"""
    PATTERN_APPLICATION = "pattern_application"
    RESPONSE_TIME = "response_time"
    SUCCESS_RATE = "success_rate"
    LEARNING_ACCURACY = "learning_accuracy"
    AGENT_PERFORMANCE = "agent_performance"
    SYSTEM_HEALTH = "system_health"


@dataclass
class PerformanceMetric:
    """Métrica individual de performance"""
    metric_type: MetricType
    value: float
    timestamp: datetime
    context: Dict[str, Any] = field(default_factory=dict)
    agent_type: Optional[str] = None
    pattern_id: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Converte métrica para dicionário"""
        return {
            "metric_type": self.metric_type.value,
            "value": self.value,
            "timestamp": self.timestamp.isoformat(),
            "context": self.context,
            "agent_type": self.agent_type,
            "pattern_id": self.pattern_id
        }


@dataclass
class AgentPerformanceStats:
    """Estatísticas de performance de um sub-agente"""
    agent_type: str
    total_patterns_applied: int
    success_rate: float
    avg_response_time: float
    avg_confidence: float
    patterns_per_hour: float
    last_activity: datetime
    
    def to_dict(self) -> Dict[str, Any]:
        """Converte estatísticas para dicionário"""
        return {
            "agent_type": self.agent_type,
            "total_patterns_applied": self.total_patterns_applied,
            "success_rate": round(self.success_rate, 3),
            "avg_response_time": round(self.avg_response_time, 3),
            "avg_confidence": round(self.avg_confidence, 3),
            "patterns_per_hour": round(self.patterns_per_hour, 2),
            "last_activity": self.last_activity.isoformat()
        }


@dataclass
class IntelligenceReport:
    """Relatório de evolução da inteligência"""
    report_date: datetime
    total_patterns_learned: int
    learning_rate_24h: float
    system_accuracy: float
    top_performing_agent: str
    performance_trend: str  # "improving", "stable", "declining"
    recommendations: List[str]
    alerts: List[str]
    
    def to_dict(self) -> Dict[str, Any]:
        """Converte relatório para dicionário"""
        return {
            "report_date": self.report_date.isoformat(),
            "total_patterns_learned": self.total_patterns_learned,
            "learning_rate_24h": round(self.learning_rate_24h, 2),
            "system_accuracy": round(self.system_accuracy, 3),
            "top_performing_agent": self.top_performing_agent,
            "performance_trend": self.performance_trend,
            "recommendations": self.recommendations,
            "alerts": self.alerts
        }


class MetricsService:
    """
    Serviço para coleta e análise de métricas de performance do SICC
    
    Funcionalidades:
    - Registrar métricas de performance em tempo real
    - Calcular estatísticas de sub-agentes
    - Gerar relatórios de evolução da inteligência
    - Detectar degradação de performance
    - Alertas automáticos para problemas
    """
    
    def __init__(self, max_metrics_history: int = 10000):
        """
        Inicializa o serviço de métricas
        
        Args:
            max_metrics_history: Máximo de métricas a manter em memória
        """
        self.metrics_history: deque = deque(maxlen=max_metrics_history)
        self.agent_stats: Dict[str, AgentPerformanceStats] = {}
        self.performance_thresholds = {
            "min_success_rate": 0.7,
            "max_response_time": 2.0,  # segundos
            "min_accuracy": 0.75,
            "max_degradation_rate": 0.1  # 10% de degradação
        }
        
        logger.info(f"MetricsService inicializado com histórico máximo de {max_metrics_history} métricas")
    
    async def record_metric(
        self,
        metric_type: MetricType,
        value: float,
        context: Optional[Dict[str, Any]] = None,
        agent_type: Optional[str] = None,
        pattern_id: Optional[str] = None
    ) -> bool:
        """
        Registra uma métrica de performance
        
        Args:
            metric_type: Tipo da métrica
            value: Valor da métrica
            context: Contexto adicional
            agent_type: Tipo do sub-agente (se aplicável)
            pattern_id: ID do padrão (se aplicável)
            
        Returns:
            True se métrica foi registrada com sucesso
        """
        try:
            metric = PerformanceMetric(
                metric_type=metric_type,
                value=value,
                timestamp=datetime.now(),
                context=context or {},
                agent_type=agent_type,
                pattern_id=pattern_id
            )
            
            self.metrics_history.append(metric)
            
            # Atualizar estatísticas do agente se aplicável
            if agent_type:
                await self._update_agent_stats(agent_type, metric)
            
            logger.debug(f"Métrica registrada: {metric_type.value} = {value} (agent: {agent_type})")
            return True
            
        except Exception as e:
            logger.error(f"Erro ao registrar métrica {metric_type.value}: {e}")
            return False
    
    async def _update_agent_stats(self, agent_type: str, metric: PerformanceMetric):
        """
        Atualiza estatísticas do sub-agente baseado na métrica
        
        Args:
            agent_type: Tipo do sub-agente
            metric: Métrica registrada
        """
        try:
            if agent_type not in self.agent_stats:
                self.agent_stats[agent_type] = AgentPerformanceStats(
                    agent_type=agent_type,
                    total_patterns_applied=0,
                    success_rate=0.0,
                    avg_response_time=0.0,
                    avg_confidence=0.0,
                    patterns_per_hour=0.0,
                    last_activity=datetime.now()
                )
            
            stats = self.agent_stats[agent_type]
            stats.last_activity = datetime.now()
            
            # Atualizar baseado no tipo de métrica
            if metric.metric_type == MetricType.PATTERN_APPLICATION:
                stats.total_patterns_applied += 1
                
            elif metric.metric_type == MetricType.SUCCESS_RATE:
                # Calcular média móvel da taxa de sucesso
                current_rate = stats.success_rate
                stats.success_rate = (current_rate * 0.8) + (metric.value * 0.2)
                
            elif metric.metric_type == MetricType.RESPONSE_TIME:
                # Calcular média móvel do tempo de resposta
                current_time = stats.avg_response_time
                stats.avg_response_time = (current_time * 0.8) + (metric.value * 0.2)
            
            # Calcular padrões por hora
            await self._calculate_patterns_per_hour(agent_type)
            
        except Exception as e:
            logger.error(f"Erro ao atualizar estatísticas do agente {agent_type}: {e}")
    
    async def _calculate_patterns_per_hour(self, agent_type: str):
        """
        Calcula padrões aplicados por hora para um agente
        
        Args:
            agent_type: Tipo do sub-agente
        """
        try:
            # Contar padrões aplicados na última hora
            one_hour_ago = datetime.now() - timedelta(hours=1)
            
            patterns_last_hour = 0
            for metric in self.metrics_history:
                if (metric.agent_type == agent_type and 
                    metric.metric_type == MetricType.PATTERN_APPLICATION and
                    metric.timestamp >= one_hour_ago):
                    patterns_last_hour += 1
            
            if agent_type in self.agent_stats:
                self.agent_stats[agent_type].patterns_per_hour = patterns_last_hour
                
        except Exception as e:
            logger.error(f"Erro ao calcular padrões por hora para {agent_type}: {e}")
    
    async def get_performance_stats(
        self,
        agent_type: Optional[str] = None,
        time_window_hours: int = 24
    ) -> Dict[str, Any]:
        """
        Obtém estatísticas de performance
        
        Args:
            agent_type: Tipo do sub-agente (None para todos)
            time_window_hours: Janela de tempo em horas
            
        Returns:
            Dicionário com estatísticas de performance
        """
        try:
            cutoff_time = datetime.now() - timedelta(hours=time_window_hours)
            
            # Filtrar métricas por janela de tempo
            recent_metrics = [
                m for m in self.metrics_history 
                if m.timestamp >= cutoff_time
            ]
            
            if agent_type:
                recent_metrics = [
                    m for m in recent_metrics 
                    if m.agent_type == agent_type
                ]
            
            # Calcular estatísticas
            stats = {
                "time_window_hours": time_window_hours,
                "total_metrics": len(recent_metrics),
                "agent_type": agent_type or "all",
                "metrics_by_type": {},
                "performance_summary": {}
            }
            
            # Agrupar por tipo de métrica
            metrics_by_type = defaultdict(list)
            for metric in recent_metrics:
                metrics_by_type[metric.metric_type].append(metric.value)
            
            # Calcular estatísticas por tipo
            for metric_type, values in metrics_by_type.items():
                if values:
                    stats["metrics_by_type"][metric_type.value] = {
                        "count": len(values),
                        "avg": round(statistics.mean(values), 3),
                        "min": round(min(values), 3),
                        "max": round(max(values), 3),
                        "median": round(statistics.median(values), 3)
                    }
            
            # Resumo de performance
            if MetricType.SUCCESS_RATE in metrics_by_type:
                success_rates = metrics_by_type[MetricType.SUCCESS_RATE]
                stats["performance_summary"]["avg_success_rate"] = round(statistics.mean(success_rates), 3)
            
            if MetricType.RESPONSE_TIME in metrics_by_type:
                response_times = metrics_by_type[MetricType.RESPONSE_TIME]
                stats["performance_summary"]["avg_response_time"] = round(statistics.mean(response_times), 3)
            
            return stats
            
        except Exception as e:
            logger.error(f"Erro ao obter estatísticas de performance: {e}")
            return {"error": str(e)}
    
    async def generate_intelligence_report(self) -> IntelligenceReport:
        """
        Gera relatório de evolução da inteligência do sistema
        
        Returns:
            Relatório completo de inteligência
        """
        try:
            now = datetime.now()
            
            # Calcular métricas gerais
            total_patterns = len([
                m for m in self.metrics_history 
                if m.metric_type == MetricType.PATTERN_APPLICATION
            ])
            
            # Taxa de aprendizado nas últimas 24h
            yesterday = now - timedelta(hours=24)
            patterns_24h = len([
                m for m in self.metrics_history 
                if (m.metric_type == MetricType.PATTERN_APPLICATION and 
                    m.timestamp >= yesterday)
            ])
            learning_rate_24h = patterns_24h / 24.0  # padrões por hora
            
            # Acurácia do sistema
            accuracy_metrics = [
                m.value for m in self.metrics_history 
                if m.metric_type == MetricType.LEARNING_ACCURACY
            ]
            system_accuracy = statistics.mean(accuracy_metrics) if accuracy_metrics else 0.0
            
            # Melhor agente performante
            top_agent = "unknown"
            best_performance = 0.0
            
            for agent_type, stats in self.agent_stats.items():
                # Score baseado em taxa de sucesso e atividade
                performance_score = stats.success_rate * (1 + stats.patterns_per_hour / 10)
                if performance_score > best_performance:
                    best_performance = performance_score
                    top_agent = agent_type
            
            # Tendência de performance
            performance_trend = await self._calculate_performance_trend()
            
            # Recomendações e alertas
            recommendations = await self._generate_recommendations()
            alerts = await self._generate_alerts()
            
            report = IntelligenceReport(
                report_date=now,
                total_patterns_learned=total_patterns,
                learning_rate_24h=learning_rate_24h,
                system_accuracy=system_accuracy,
                top_performing_agent=top_agent,
                performance_trend=performance_trend,
                recommendations=recommendations,
                alerts=alerts
            )
            
            logger.info(f"Relatório de inteligência gerado: {total_patterns} padrões, acurácia {system_accuracy:.3f}")
            return report
            
        except Exception as e:
            logger.error(f"Erro ao gerar relatório de inteligência: {e}")
            # Retornar relatório de erro
            return IntelligenceReport(
                report_date=now,
                total_patterns_learned=0,
                learning_rate_24h=0.0,
                system_accuracy=0.0,
                top_performing_agent="unknown",
                performance_trend="unknown",
                recommendations=[f"Erro na geração do relatório: {str(e)}"],
                alerts=["Sistema de métricas com problemas"]
            )
    
    async def _calculate_performance_trend(self) -> str:
        """
        Calcula tendência de performance do sistema
        
        Returns:
            "improving", "stable", ou "declining"
        """
        try:
            # Comparar últimas 24h com 24h anteriores
            now = datetime.now()
            last_24h = now - timedelta(hours=24)
            previous_24h = now - timedelta(hours=48)
            
            # Métricas das últimas 24h
            recent_success = [
                m.value for m in self.metrics_history 
                if (m.metric_type == MetricType.SUCCESS_RATE and 
                    m.timestamp >= last_24h)
            ]
            
            # Métricas das 24h anteriores
            previous_success = [
                m.value for m in self.metrics_history 
                if (m.metric_type == MetricType.SUCCESS_RATE and 
                    previous_24h <= m.timestamp < last_24h)
            ]
            
            if not recent_success or not previous_success:
                return "stable"
            
            recent_avg = statistics.mean(recent_success)
            previous_avg = statistics.mean(previous_success)
            
            change_rate = (recent_avg - previous_avg) / previous_avg
            
            if change_rate > 0.05:  # 5% de melhoria
                return "improving"
            elif change_rate < -0.05:  # 5% de degradação
                return "declining"
            else:
                return "stable"
                
        except Exception as e:
            logger.error(f"Erro ao calcular tendência de performance: {e}")
            return "unknown"
    
    async def _generate_recommendations(self) -> List[str]:
        """
        Gera recomendações baseadas nas métricas
        
        Returns:
            Lista de recomendações
        """
        recommendations = []
        
        try:
            # Analisar performance dos agentes
            for agent_type, stats in self.agent_stats.items():
                if stats.success_rate < self.performance_thresholds["min_success_rate"]:
                    recommendations.append(
                        f"Ajustar threshold de confiança do {agent_type} - taxa de sucesso baixa ({stats.success_rate:.2f})"
                    )
                
                if stats.avg_response_time > self.performance_thresholds["max_response_time"]:
                    recommendations.append(
                        f"Otimizar performance do {agent_type} - tempo de resposta alto ({stats.avg_response_time:.2f}s)"
                    )
                
                if stats.patterns_per_hour < 1.0:
                    recommendations.append(
                        f"Aumentar atividade do {agent_type} - baixa aplicação de padrões ({stats.patterns_per_hour:.1f}/h)"
                    )
            
            # Recomendações gerais
            total_agents = len(self.agent_stats)
            if total_agents < 3:
                recommendations.append("Considerar ativar mais sub-agentes para melhor cobertura")
            
            # Se não há recomendações, sistema está bem
            if not recommendations:
                recommendations.append("Sistema operando dentro dos parâmetros ideais")
                
        except Exception as e:
            logger.error(f"Erro ao gerar recomendações: {e}")
            recommendations.append(f"Erro na análise de recomendações: {str(e)}")
        
        return recommendations
    
    async def _generate_alerts(self) -> List[str]:
        """
        Gera alertas para problemas críticos
        
        Returns:
            Lista de alertas
        """
        alerts = []
        
        try:
            # Verificar degradação crítica
            for agent_type, stats in self.agent_stats.items():
                if stats.success_rate < 0.5:  # Crítico: menos de 50% de sucesso
                    alerts.append(f"CRÍTICO: {agent_type} com taxa de sucesso muito baixa ({stats.success_rate:.2f})")
                
                if stats.avg_response_time > 5.0:  # Crítico: mais de 5 segundos
                    alerts.append(f"CRÍTICO: {agent_type} com tempo de resposta excessivo ({stats.avg_response_time:.2f}s)")
            
            # Verificar inatividade
            inactive_threshold = datetime.now() - timedelta(hours=2)
            for agent_type, stats in self.agent_stats.items():
                if stats.last_activity < inactive_threshold:
                    alerts.append(f"ALERTA: {agent_type} inativo há mais de 2 horas")
            
            # Verificar se há métricas suficientes
            if len(self.metrics_history) < 10:
                alerts.append("ALERTA: Poucas métricas coletadas - sistema pode estar com problemas")
                
        except Exception as e:
            logger.error(f"Erro ao gerar alertas: {e}")
            alerts.append(f"Erro na geração de alertas: {str(e)}")
        
        return alerts


# Singleton instance
_metrics_service_instance: Optional[MetricsService] = None


def get_metrics_service() -> MetricsService:
    """
    Obtém instância singleton do MetricsService
    
    Returns:
        Instância do MetricsService
    """
    global _metrics_service_instance
    
    if _metrics_service_instance is None:
        _metrics_service_instance = MetricsService()
        logger.info("MetricsService singleton criado")
    
    return _metrics_service_instance


# Função auxiliar para reset (útil para testes)
def reset_metrics_service():
    """Reset da instância singleton (usado principalmente em testes)"""
    global _metrics_service_instance
    _metrics_service_instance = None
    logger.debug("MetricsService singleton resetado")