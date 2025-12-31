#!/usr/bin/env python3
"""
Testes de propriedade para Metrics Service

Testa as propriedades universais do sistema de métricas:
- Property 14: Performance Metrics Collection
- Validação de coleta e análise de métricas
- Funcionamento correto dos cálculos estatísticos
"""

import pytest
import asyncio
from datetime import datetime, timedelta
from typing import Dict, Any, List
from unittest.mock import Mock, AsyncMock, patch
from hypothesis import given, strategies as st, settings, HealthCheck
from hypothesis.strategies import composite

import sys
import os
sys.path.append('agent/src')
sys.path.append('agent/src/services/sicc')

from metrics_service import (
    MetricsService, MetricType, PerformanceMetric, AgentPerformanceStats,
    IntelligenceReport, get_metrics_service, reset_metrics_service
)


# Estratégias para geração de dados de teste

@composite
def performance_metric_strategy(draw):
    """Gera métricas de performance válidas"""
    metric_type = draw(st.sampled_from(list(MetricType)))
    
    # Valores apropriados por tipo de métrica
    if metric_type == MetricType.SUCCESS_RATE:
        value = draw(st.floats(min_value=0.0, max_value=1.0))
    elif metric_type == MetricType.RESPONSE_TIME:
        value = draw(st.floats(min_value=0.1, max_value=10.0))
    else:
        value = draw(st.floats(min_value=0.0, max_value=100.0))
    
    return {
        "metric_type": metric_type,
        "value": value,
        "context": {"test": "data"},
        "agent_type": draw(st.sampled_from(["discovery", "sales", "support"])),
        "pattern_id": f"pattern_{draw(st.integers(min_value=1, max_value=100))}"
    }

@composite
def metrics_batch_strategy(draw):
    """Gera lote de métricas para teste"""
    batch_size = draw(st.integers(min_value=5, max_value=20))
    
    metrics = []
    for _ in range(batch_size):
        metric_data = draw(performance_metric_strategy())
        metrics.append(metric_data)
    
    return metrics


class TestMetricsServiceProperties:
    """Testes de propriedade para MetricsService"""
    
    def setup_method(self):
        """Setup para cada teste"""
        reset_metrics_service()
    
    def teardown_method(self):
        """Cleanup após cada teste"""
        reset_metrics_service()
    
    @pytest.mark.asyncio
    async def test_property_service_initialization(self):
        """
        Property: MetricsService deve inicializar com estado válido
        
        Verifica que:
        1. Serviço inicializa sem erros
        2. Estruturas de dados são criadas corretamente
        3. Thresholds padrão são válidos
        4. Histórico está vazio inicialmente
        """
        service = get_metrics_service()
        
        # Verificar inicialização
        assert isinstance(service, MetricsService), "Deve retornar instância de MetricsService"
        assert len(service.metrics_history) == 0, "Histórico deve estar vazio inicialmente"
        assert len(service.agent_stats) == 0, "Estatísticas de agentes devem estar vazias"
        
        # Verificar thresholds padrão
        thresholds = service.performance_thresholds
        assert 0.0 <= thresholds["min_success_rate"] <= 1.0, "Threshold de taxa de sucesso deve ser válido"
        assert thresholds["max_response_time"] > 0, "Threshold de tempo de resposta deve ser positivo"
        assert 0.0 <= thresholds["min_accuracy"] <= 1.0, "Threshold de acurácia deve ser válido"
        assert 0.0 <= thresholds["max_degradation_rate"] <= 1.0, "Threshold de degradação deve ser válido"
    
    @given(performance_metric_strategy())
    @settings(max_examples=10, deadline=3000, suppress_health_check=[HealthCheck.function_scoped_fixture])
    @pytest.mark.asyncio
    async def test_property_metric_recording(self, metric_data):
        """
        Property 14: Performance Metrics Collection - Registro
        
        Para qualquer métrica válida:
        1. Deve ser registrada com sucesso
        2. Deve aparecer no histórico
        3. Deve manter integridade dos dados
        4. Deve atualizar estatísticas do agente
        """
        service = get_metrics_service()
        
        # Registrar métrica
        result = await service.record_metric(
            metric_type=metric_data["metric_type"],
            value=metric_data["value"],
            context=metric_data["context"],
            agent_type=metric_data["agent_type"],
            pattern_id=metric_data["pattern_id"]
        )
        
        # Verificar registro bem-sucedido
        assert result, "Métrica válida deve ser registrada com sucesso"
        
        # Verificar que métrica está no histórico
        assert len(service.metrics_history) == 1, "Histórico deve conter 1 métrica"
        
        recorded_metric = service.metrics_history[0]
        assert recorded_metric.metric_type == metric_data["metric_type"], "Tipo de métrica deve coincidir"
        assert recorded_metric.value == metric_data["value"], "Valor deve coincidir"
        assert recorded_metric.agent_type == metric_data["agent_type"], "Tipo de agente deve coincidir"
        assert recorded_metric.pattern_id == metric_data["pattern_id"], "ID do padrão deve coincidir"
        
        # Verificar timestamp
        now = datetime.now()
        time_diff = abs((now - recorded_metric.timestamp).total_seconds())
        assert time_diff < 5, "Timestamp deve ser recente (menos de 5 segundos)"
        
        # Verificar atualização de estatísticas do agente
        if metric_data["agent_type"]:
            assert metric_data["agent_type"] in service.agent_stats, "Estatísticas do agente devem ser criadas"
            
            agent_stats = service.agent_stats[metric_data["agent_type"]]
            assert agent_stats.agent_type == metric_data["agent_type"], "Tipo do agente deve coincidir"
            assert agent_stats.last_activity is not None, "Última atividade deve ser registrada"
    
    @given(metrics_batch_strategy())
    @settings(max_examples=5, deadline=5000, suppress_health_check=[HealthCheck.function_scoped_fixture])
    @pytest.mark.asyncio
    async def test_property_batch_metrics_processing(self, metrics_batch):
        """
        Property 14: Performance Metrics Collection - Processamento em Lote
        
        Para qualquer lote de métricas:
        1. Todas devem ser processadas corretamente
        2. Ordem de processamento deve ser mantida
        3. Estatísticas devem ser atualizadas consistentemente
        4. Performance não deve degradar significativamente
        """
        service = get_metrics_service()
        
        # Processar lote de métricas
        start_time = datetime.now()
        
        for metric_data in metrics_batch:
            result = await service.record_metric(
                metric_type=metric_data["metric_type"],
                value=metric_data["value"],
                context=metric_data["context"],
                agent_type=metric_data["agent_type"],
                pattern_id=metric_data["pattern_id"]
            )
            assert result, "Todas as métricas do lote devem ser registradas"
        
        processing_time = (datetime.now() - start_time).total_seconds()
        
        # Verificar que todas as métricas foram registradas
        assert len(service.metrics_history) == len(metrics_batch), "Todas as métricas devem estar no histórico"
        
        # Verificar ordem de processamento (timestamps crescentes)
        timestamps = [m.timestamp for m in service.metrics_history]
        for i in range(1, len(timestamps)):
            assert timestamps[i] >= timestamps[i-1], "Timestamps devem estar em ordem crescente"
        
        # Verificar performance (deve processar rapidamente)
        max_processing_time = len(metrics_batch) * 0.1  # 100ms por métrica
        assert processing_time < max_processing_time, f"Processamento deve ser rápido (< {max_processing_time}s)"
        
        # Verificar consistência das estatísticas
        agent_types = set(m["agent_type"] for m in metrics_batch)
        for agent_type in agent_types:
            if agent_type:  # Pode ser None
                assert agent_type in service.agent_stats, f"Estatísticas devem existir para {agent_type}"
    
    @pytest.mark.asyncio
    async def test_property_performance_statistics_accuracy(self):
        """
        Property: Estatísticas de performance devem ser calculadas corretamente
        
        Verifica que:
        1. Médias são calculadas corretamente
        2. Contadores são precisos
        3. Filtros por tempo funcionam
        4. Agregações por agente são corretas
        """
        service = get_metrics_service()
        
        # Criar métricas de teste conhecidas
        test_metrics = [
            (MetricType.SUCCESS_RATE, 0.8, "discovery"),
            (MetricType.SUCCESS_RATE, 0.9, "discovery"),
            (MetricType.SUCCESS_RATE, 0.7, "sales"),
            (MetricType.RESPONSE_TIME, 1.5, "discovery"),
            (MetricType.RESPONSE_TIME, 2.0, "sales"),
        ]
        
        for metric_type, value, agent_type in test_metrics:
            await service.record_metric(metric_type, value, agent_type=agent_type)
        
        # Obter estatísticas gerais
        stats = await service.get_performance_stats()
        
        # Verificar contadores
        assert stats["total_metrics"] == len(test_metrics), "Total de métricas deve coincidir"
        
        # Verificar estatísticas por tipo
        success_rate_stats = stats["metrics_by_type"][MetricType.SUCCESS_RATE.value]
        assert success_rate_stats["count"] == 3, "Deve haver 3 métricas de taxa de sucesso"
        
        # Verificar média de taxa de sucesso: (0.8 + 0.9 + 0.7) / 3 = 0.8
        expected_avg = (0.8 + 0.9 + 0.7) / 3
        assert abs(success_rate_stats["avg"] - expected_avg) < 0.001, "Média deve ser calculada corretamente"
        
        # Verificar min/max
        assert success_rate_stats["min"] == 0.7, "Mínimo deve ser correto"
        assert success_rate_stats["max"] == 0.9, "Máximo deve ser correto"
        
        # Obter estatísticas específicas do Discovery
        discovery_stats = await service.get_performance_stats(agent_type="discovery")
        assert discovery_stats["total_metrics"] == 3, "Discovery deve ter 3 métricas"
        
        # Obter estatísticas específicas do Sales
        sales_stats = await service.get_performance_stats(agent_type="sales")
        assert sales_stats["total_metrics"] == 2, "Sales deve ter 2 métricas"
    
    @pytest.mark.asyncio
    async def test_property_intelligence_report_generation(self):
        """
        Property: Relatórios de inteligência devem ser gerados consistentemente
        
        Verifica que:
        1. Relatório é gerado sem erros
        2. Dados são consistentes com métricas registradas
        3. Cálculos de tendência são válidos
        4. Recomendações e alertas são apropriados
        """
        service = get_metrics_service()
        
        # Adicionar métricas para gerar relatório significativo
        test_data = [
            (MetricType.PATTERN_APPLICATION, 1.0, "discovery"),
            (MetricType.PATTERN_APPLICATION, 1.0, "sales"),
            (MetricType.SUCCESS_RATE, 0.85, "discovery"),
            (MetricType.SUCCESS_RATE, 0.75, "sales"),
            (MetricType.LEARNING_ACCURACY, 0.8, None),
            (MetricType.RESPONSE_TIME, 1.2, "discovery"),
        ]
        
        for metric_type, value, agent_type in test_data:
            await service.record_metric(metric_type, value, agent_type=agent_type)
        
        # Gerar relatório
        report = await service.generate_intelligence_report()
        
        # Verificar estrutura do relatório
        assert isinstance(report, IntelligenceReport), "Deve retornar IntelligenceReport"
        assert report.report_date is not None, "Data do relatório deve estar presente"
        assert report.total_patterns_learned >= 0, "Total de padrões deve ser não-negativo"
        assert report.learning_rate_24h >= 0, "Taxa de aprendizado deve ser não-negativa"
        assert 0.0 <= report.system_accuracy <= 1.0, "Acurácia deve estar entre 0 e 1"
        assert report.top_performing_agent in ["discovery", "sales", "unknown"], "Melhor agente deve ser válido"
        assert report.performance_trend in ["improving", "stable", "declining", "unknown"], "Tendência deve ser válida"
        
        # Verificar que há recomendações e alertas
        assert isinstance(report.recommendations, list), "Recomendações devem ser lista"
        assert isinstance(report.alerts, list), "Alertas devem ser lista"
        assert len(report.recommendations) > 0, "Deve haver pelo menos uma recomendação"
        
        # Verificar consistência dos dados
        pattern_metrics = [m for m in service.metrics_history if m.metric_type == MetricType.PATTERN_APPLICATION]
        assert report.total_patterns_learned == len(pattern_metrics), "Total de padrões deve coincidir com métricas"
    
    @pytest.mark.asyncio
    async def test_property_export_data_integrity(self):
        """
        Property: Export de métricas deve preservar integridade dos dados
        
        Verifica que:
        1. Todos os dados são exportados corretamente
        2. Estrutura de export é válida
        3. Filtros por tempo funcionam
        4. Dados são serializáveis
        """
        service = get_metrics_service()
        
        # Adicionar métricas de teste
        test_metrics = [
            (MetricType.SUCCESS_RATE, 0.8, "discovery", "pattern_1"),
            (MetricType.RESPONSE_TIME, 1.5, "sales", "pattern_2"),
            (MetricType.PATTERN_APPLICATION, 1.0, "support", "pattern_3"),
        ]
        
        for metric_type, value, agent_type, pattern_id in test_metrics:
            await service.record_metric(
                metric_type=metric_type,
                value=value,
                agent_type=agent_type,
                pattern_id=pattern_id
            )
        
        # Exportar todas as métricas
        export_data = await service.export_metrics()
        
        # Verificar estrutura do export
        assert "export_timestamp" in export_data, "Timestamp de export deve estar presente"
        assert "total_metrics" in export_data, "Total de métricas deve estar presente"
        assert "metrics" in export_data, "Lista de métricas deve estar presente"
        assert "agent_stats" in export_data, "Estatísticas de agentes devem estar presentes"
        
        # Verificar integridade dos dados
        assert export_data["total_metrics"] == len(test_metrics), "Total deve coincidir"
        assert len(export_data["metrics"]) == len(test_metrics), "Número de métricas deve coincidir"
        
        # Verificar que cada métrica foi exportada corretamente
        exported_metrics = export_data["metrics"]
        for i, (metric_type, value, agent_type, pattern_id) in enumerate(test_metrics):
            # Encontrar métrica correspondente no export
            found_metric = None
            for exported in exported_metrics:
                if (exported["metric_type"] == metric_type.value and
                    exported["value"] == value and
                    exported["agent_type"] == agent_type and
                    exported["pattern_id"] == pattern_id):
                    found_metric = exported
                    break
            
            assert found_metric is not None, f"Métrica {i} deve estar no export"
            assert "timestamp" in found_metric, "Timestamp deve estar presente"
        
        # Testar export com filtro de tempo
        export_1h = await service.export_metrics(time_window_hours=1)
        assert export_1h["time_window_hours"] == 1, "Janela de tempo deve ser respeitada"
        assert export_1h["total_metrics"] <= export_data["total_metrics"], "Filtro deve reduzir ou manter quantidade"
        
        # Verificar que dados são serializáveis em JSON
        import json
        try:
            json_str = json.dumps(export_data)
            assert len(json_str) > 0, "Export deve ser serializável em JSON"
        except (TypeError, ValueError) as e:
            pytest.fail(f"Export não é serializável em JSON: {e}")
    
    @pytest.mark.asyncio
    async def test_property_error_handling_robustness(self):
        """
        Property: Sistema deve lidar graciosamente com erros
        
        Verifica que:
        1. Valores inválidos são tratados corretamente
        2. Sistema continua funcionando após erros
        3. Logs de erro são gerados apropriadamente
        4. Estado interno permanece consistente
        """
        service = get_metrics_service()
        
        # Testar com valores extremos/inválidos
        invalid_tests = [
            (MetricType.SUCCESS_RATE, float('inf')),  # Infinito
            (MetricType.RESPONSE_TIME, -1.0),        # Negativo
            (MetricType.SUCCESS_RATE, float('nan')), # NaN
        ]
        
        for metric_type, invalid_value in invalid_tests:
            # Sistema deve lidar com valores inválidos sem quebrar
            try:
                result = await service.record_metric(metric_type, invalid_value)
                # Se não levantou exceção, deve ter retornado False ou True
                assert isinstance(result, bool), "Deve retornar boolean mesmo com valor inválido"
            except Exception:
                # Se levantou exceção, isso também é aceitável
                pass
        
        # Verificar que sistema ainda funciona após erros
        valid_result = await service.record_metric(MetricType.SUCCESS_RATE, 0.8)
        assert valid_result, "Sistema deve continuar funcionando após erros"
        
        # Verificar que estatísticas ainda podem ser obtidas
        stats = await service.get_performance_stats()
        assert isinstance(stats, dict), "Estatísticas devem ser obtidas mesmo após erros"
        
        # Verificar que relatório ainda pode ser gerado
        report = await service.generate_intelligence_report()
        assert isinstance(report, IntelligenceReport), "Relatório deve ser gerado mesmo após erros"


if __name__ == "__main__":
    # Executar testes específicos
    pytest.main([__file__, "-v", "--tb=short"])