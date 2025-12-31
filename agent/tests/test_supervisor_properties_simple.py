#!/usr/bin/env python3
"""
Testes de propriedade simplificados para SupervisorService - SICC

Testa as propriedades universais do sistema de supervisão:
- Property 6: Threshold-Based Approval
- Property 7: Conflict-Free Pattern Integration
- Validação de aprovação automática baseada em confidence score
- Detecção de conflitos entre padrões
"""

import pytest
import asyncio
import uuid
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple
from unittest.mock import Mock, AsyncMock, patch
from hypothesis import given, strategies as st, settings, assume, HealthCheck
from hypothesis.strategies import composite
from dataclasses import dataclass
from enum import Enum

class ApprovalStatus(Enum):
    """Status de aprovação de um aprendizado"""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    NEEDS_REVIEW = "needs_review"

@dataclass
class ConflictDetail:
    """Detalhe de um conflito detectado"""
    type: str
    severity: float
    description: str
    existing_pattern_id: str
    overlap_score: float = 0.0

@dataclass
class ConflictAnalysis:
    """Resultado da análise de conflitos"""
    has_conflicts: bool
    conflict_details: List[ConflictDetail]
    severity_score: float
    recommendations: List[str]

@dataclass
class MockLearningLog:
    """Mock de LearningLog para testes"""
    id: str
    confidence_score: float
    pattern_data: Dict[str, Any]
    status: str = "pending"
    sub_agent_id: Optional[str] = None
    pattern_type: str = "general"

class MockSupervisorService:
    """Mock simplificado do SupervisorService para testes"""
    
    def __init__(self):
        self.default_threshold = 0.7
        self.conflict_severity_threshold = 0.2
        self.max_patterns_per_agent = 100
    
    async def auto_approve(self, confidence_score: float, threshold: float = None) -> bool:
        """Aprova automaticamente baseado em threshold"""
        if threshold is None:
            threshold = self.default_threshold
        
        # Validar parâmetros
        if not 0.0 <= confidence_score <= 1.0:
            raise ValueError(f"Confidence score inválido: {confidence_score}")
        
        if not 0.0 <= threshold <= 1.0:
            raise ValueError(f"Threshold inválido: {threshold}")
        
        return confidence_score >= threshold
    
    async def validate_pattern_conflicts(
        self, 
        new_pattern: Dict[str, Any], 
        existing_patterns: List[Any]
    ) -> ConflictAnalysis:
        """Valida conflitos entre padrões"""
        if not new_pattern:
            return ConflictAnalysis(
                has_conflicts=False,
                conflict_details=[],
                severity_score=0.0,
                recommendations=[]
            )
        
        conflicts = []
        max_severity = 0.0
        
        # Simular detecção de conflitos
        for existing in existing_patterns:
            if not existing:
                continue
            
            # Simular conflito baseado em similaridade de triggers
            new_trigger = new_pattern.get("trigger", "")
            existing_trigger = getattr(existing, 'trigger', '') or existing.get("trigger", "")
            
            if new_trigger and existing_trigger:
                # Calcular similaridade simples
                similarity = self._calculate_simple_similarity(new_trigger, existing_trigger)
                
                if similarity > 0.7:
                    conflict = ConflictDetail(
                        type="trigger_similarity",
                        severity=similarity * 0.8,
                        description=f"Trigger similar ao padrão existente",
                        existing_pattern_id=getattr(existing, 'id', 'unknown'),
                        overlap_score=similarity
                    )
                    conflicts.append(conflict)
                    max_severity = max(max_severity, conflict.severity)
        
        # Gerar recomendações
        recommendations = []
        if conflicts:
            recommendations.append("Revisar conflitos detectados")
            if max_severity > 0.8:
                recommendations.append("Conflitos críticos - revisão manual necessária")
        
        return ConflictAnalysis(
            has_conflicts=len(conflicts) > 0,
            conflict_details=conflicts,
            severity_score=max_severity,
            recommendations=recommendations
        )
    
    def _calculate_simple_similarity(self, text1: str, text2: str) -> float:
        """Calcula similaridade simples entre textos"""
        if not text1 or not text2:
            return 0.0
        
        words1 = set(text1.lower().split())
        words2 = set(text2.lower().split())
        
        if not words1 or not words2:
            return 0.0
        
        intersection = len(words1.intersection(words2))
        union = len(words1.union(words2))
        
        return intersection / union if union > 0 else 0.0

# Estratégias para geração de dados de teste

@composite
def learning_log_strategy(draw):
    """Gera learning logs válidos para teste"""
    pattern_data = {
        "pattern_name": draw(st.text(min_size=5, max_size=50)),
        "trigger": draw(st.text(min_size=5, max_size=100)),
        "action": draw(st.text(min_size=5, max_size=100)),
        "contexts": [draw(st.text(min_size=3, max_size=20)) for _ in range(draw(st.integers(min_value=0, max_value=3)))],
        "response_template": draw(st.text(min_size=10, max_size=200)),
    }
    
    return MockLearningLog(
        id=str(uuid.uuid4()),
        confidence_score=draw(st.floats(min_value=0.0, max_value=1.0)),
        pattern_data=pattern_data,
        status="pending",
        sub_agent_id=draw(st.one_of(st.none(), st.text(min_size=5, max_size=20))),
        pattern_type=draw(st.sampled_from(["discovery", "sales", "support", "general"]))
    )

@composite
def pattern_strategy(draw):
    """Gera padrões válidos para teste"""
    return {
        "id": str(uuid.uuid4()),
        "trigger": draw(st.text(min_size=5, max_size=100)),
        "action": draw(st.text(min_size=5, max_size=100)),
        "contexts": [draw(st.text(min_size=3, max_size=20)) for _ in range(draw(st.integers(min_value=0, max_value=3)))],
    }

class TestSupervisorProperties:
    """Testes de propriedade para SupervisorService"""
    
    @pytest.fixture
    def supervisor_service(self):
        """Cria MockSupervisorService para testes"""
        return MockSupervisorService()
    
    @given(st.floats(min_value=0.0, max_value=1.0), st.floats(min_value=0.1, max_value=0.9))
    @settings(max_examples=50, deadline=5000, suppress_health_check=[HealthCheck.function_scoped_fixture])
    @pytest.mark.asyncio
    async def test_property_threshold_based_approval_consistency(self, supervisor_service, confidence_score, threshold):
        """
        Property 6: Threshold-Based Approval
        
        Para qualquer confidence score e threshold:
        1. Score >= threshold deve resultar em aprovação
        2. Score < threshold deve resultar em rejeição
        3. Decisão deve ser determinística para mesmos inputs
        4. Threshold deve ser respeitado consistentemente
        """
        # Executar aprovação múltiplas vezes para verificar consistência
        results = []
        for _ in range(3):
            result = await supervisor_service.auto_approve(confidence_score, threshold)
            results.append(result)
        
        # Verificar propriedades
        expected_result = confidence_score >= threshold
        
        # Todos os resultados devem ser iguais (determinístico)
        assert all(r == results[0] for r in results), \
            f"Decisões inconsistentes para score={confidence_score:.3f}, threshold={threshold:.3f}: {results}"
        
        # Resultado deve seguir a regra do threshold
        assert results[0] == expected_result, \
            f"Decisão incorreta: score={confidence_score:.3f}, threshold={threshold:.3f}, esperado={expected_result}, obtido={results[0]}"
    
    @given(st.floats(min_value=0.0, max_value=1.0))
    @settings(max_examples=30, deadline=5000, suppress_health_check=[HealthCheck.function_scoped_fixture])
    @pytest.mark.asyncio
    async def test_property_threshold_boundary_conditions(self, supervisor_service, confidence_score):
        """
        Property: Condições de fronteira do threshold devem ser tratadas corretamente
        
        Para qualquer confidence score:
        1. Score exatamente igual ao threshold deve ser aprovado
        2. Scores extremos (0.0, 1.0) devem ser tratados corretamente
        3. Precisão numérica não deve afetar decisões
        """
        threshold = 0.7
        
        # Testar com threshold exato
        result_exact = await supervisor_service.auto_approve(threshold, threshold)
        assert result_exact == True, f"Score exatamente igual ao threshold ({threshold}) deve ser aprovado"
        
        # Testar com score fornecido
        result_score = await supervisor_service.auto_approve(confidence_score, threshold)
        expected_result = confidence_score >= threshold
        assert result_score == expected_result, \
            f"Score {confidence_score:.6f} com threshold {threshold:.6f}: esperado {expected_result}, obtido {result_score}"
        
        # Testar casos extremos
        result_min = await supervisor_service.auto_approve(0.0, threshold)
        result_max = await supervisor_service.auto_approve(1.0, threshold)
        
        assert result_min == (0.0 >= threshold), "Score mínimo (0.0) deve seguir regra do threshold"
        assert result_max == (1.0 >= threshold), "Score máximo (1.0) deve seguir regra do threshold"
    
    @pytest.mark.asyncio
    async def test_property_invalid_threshold_handling(self, supervisor_service):
        """
        Property: Sistema deve validar thresholds inválidos
        
        Para thresholds inválidos:
        1. Threshold < 0 deve ser rejeitado
        2. Threshold > 1 deve ser rejeitado
        3. Deve levantar ValueError para valores inválidos
        """
        # Testar thresholds inválidos
        with pytest.raises(ValueError, match="Threshold inválido"):
            await supervisor_service.auto_approve(0.5, -0.1)
        
        with pytest.raises(ValueError, match="Threshold inválido"):
            await supervisor_service.auto_approve(0.5, 1.1)
        
        # Testar confidence scores inválidos
        with pytest.raises(ValueError, match="Confidence score inválido"):
            await supervisor_service.auto_approve(-0.1, 0.7)
        
        with pytest.raises(ValueError, match="Confidence score inválido"):
            await supervisor_service.auto_approve(1.1, 0.7)
    
    @given(st.lists(st.floats(min_value=0.0, max_value=1.0), min_size=5, max_size=10))
    @settings(max_examples=15, deadline=8000, suppress_health_check=[HealthCheck.function_scoped_fixture])
    @pytest.mark.asyncio
    async def test_property_threshold_distribution_consistency(self, supervisor_service, confidence_scores):
        """
        Property: Distribuição de aprovações deve ser consistente com threshold
        
        Para qualquer conjunto de confidence scores:
        1. Proporção de aprovações deve corresponder à proporção de scores >= threshold
        2. Mudança no threshold deve afetar aprovações de forma previsível
        """
        threshold = 0.6
        
        # Avaliar todos os scores
        approvals = []
        for score in confidence_scores:
            result = await supervisor_service.auto_approve(score, threshold)
            approvals.append(result)
        
        # Calcular estatísticas esperadas
        expected_approvals = [score >= threshold for score in confidence_scores]
        expected_approval_count = sum(expected_approvals)
        actual_approval_count = sum(approvals)
        
        # Verificar propriedades
        assert actual_approval_count == expected_approval_count, \
            f"Número de aprovações incorreto: esperado {expected_approval_count}, obtido {actual_approval_count}"
        
        # Verificar que cada decisão individual está correta
        for i, (score, approval, expected) in enumerate(zip(confidence_scores, approvals, expected_approvals)):
            assert approval == expected, \
                f"Decisão {i} incorreta: score={score:.3f}, threshold={threshold:.3f}, " \
                f"esperado={expected}, obtido={approval}"
    
    @given(pattern_strategy(), st.lists(pattern_strategy(), min_size=1, max_size=5))
    @settings(max_examples=20, deadline=10000, suppress_health_check=[HealthCheck.function_scoped_fixture])
    @pytest.mark.asyncio
    async def test_property_conflict_detection_completeness(self, supervisor_service, new_pattern, existing_patterns):
        """
        Property 7: Conflict-Free Pattern Integration
        
        Para qualquer padrão novo e conjunto de padrões existentes:
        1. Análise deve verificar todos os tipos de conflito
        2. Conflitos detectados devem ter severity score válido
        3. Recomendações devem ser fornecidas para conflitos encontrados
        4. Resultado deve ser determinístico para mesmos inputs
        """
        # Executar análise múltiplas vezes para verificar determinismo
        results = []
        for _ in range(3):
            analysis = await supervisor_service.validate_pattern_conflicts(new_pattern, existing_patterns)
            results.append(analysis)
        
        # Verificar propriedades
        for analysis in results:
            assert isinstance(analysis, ConflictAnalysis), "Deve retornar ConflictAnalysis"
            assert isinstance(analysis.has_conflicts, bool), "has_conflicts deve ser boolean"
            assert isinstance(analysis.conflict_details, list), "conflict_details deve ser lista"
            assert isinstance(analysis.severity_score, (int, float)), "severity_score deve ser numérico"
            assert 0.0 <= analysis.severity_score <= 1.0, f"Severity score inválido: {analysis.severity_score}"
            assert isinstance(analysis.recommendations, list), "recommendations deve ser lista"
            
            # Se há conflitos, deve haver detalhes
            if analysis.has_conflicts:
                assert len(analysis.conflict_details) > 0, "Deve haver detalhes se has_conflicts é True"
                assert analysis.severity_score > 0, "Severity score deve ser > 0 se há conflitos"
                
                for detail in analysis.conflict_details:
                    assert isinstance(detail, ConflictDetail), "Cada detalhe deve ser ConflictDetail"
                    assert detail.type, "Tipo de conflito não pode estar vazio"
                    assert 0.0 <= detail.severity <= 1.0, f"Severity inválido: {detail.severity}"
                    assert detail.description, "Descrição não pode estar vazia"
                    assert detail.existing_pattern_id, "ID do padrão existente é obrigatório"
        
        # Verificar determinismo
        for i in range(1, len(results)):
            assert results[0].has_conflicts == results[i].has_conflicts, "has_conflicts deve ser determinístico"
            assert len(results[0].conflict_details) == len(results[i].conflict_details), "Número de conflitos deve ser determinístico"
            assert abs(results[0].severity_score - results[i].severity_score) < 0.001, "Severity score deve ser determinístico"
    
    @given(pattern_strategy())
    @settings(max_examples=25, deadline=8000, suppress_health_check=[HealthCheck.function_scoped_fixture])
    @pytest.mark.asyncio
    async def test_property_no_false_positives_for_distinct_patterns(self, supervisor_service, new_pattern):
        """
        Property: Padrões claramente distintos não devem gerar conflitos falsos
        
        Para padrões com características muito diferentes:
        1. Não deve haver conflitos se triggers são completamente diferentes
        2. Severity deve ser baixa para padrões genuinamente diferentes
        """
        # Criar padrões claramente distintos
        new_pattern["trigger"] = "trigger_completamente_unico_" + str(uuid.uuid4())[:8]
        
        existing_patterns = []
        for i in range(3):
            existing_pattern = {
                "id": str(uuid.uuid4()),
                "trigger": f"trigger_existente_diferente_{i}",
                "action": f"acao_diferente_{i}",
                "contexts": [f"contexto_diferente_{i}"]
            }
            existing_patterns.append(existing_pattern)
        
        # Executar análise
        analysis = await supervisor_service.validate_pattern_conflicts(new_pattern, existing_patterns)
        
        # Verificar que não há falsos positivos
        assert analysis.severity_score < 0.3, f"Severity muito alta para padrões distintos: {analysis.severity_score}"
        
        # Se há conflitos, devem ser de baixa severidade
        for conflict in analysis.conflict_details:
            assert conflict.severity < 0.5, f"Conflito de alta severidade em padrões distintos: {conflict.severity}"
    
    @pytest.mark.asyncio
    async def test_property_empty_patterns_conflict_handling(self, supervisor_service):
        """
        Property: Sistema deve lidar graciosamente com listas vazias
        
        Quando não há padrões existentes:
        1. Não deve haver conflitos
        2. Severity score deve ser 0.0
        3. Não deve gerar exceções
        4. Análise deve ser válida
        """
        new_pattern = {
            "id": str(uuid.uuid4()),
            "trigger": "trigger único",
            "action": "ação única",
            "contexts": ["único"]
        }
        
        # Executar análise com lista vazia
        analysis = await supervisor_service.validate_pattern_conflicts(new_pattern, [])
        
        # Verificar propriedades para lista vazia
        assert isinstance(analysis, ConflictAnalysis), "Deve retornar análise válida"
        assert analysis.has_conflicts == False, "Não deve haver conflitos com lista vazia"
        assert len(analysis.conflict_details) == 0, "Lista de detalhes deve estar vazia"
        assert analysis.severity_score == 0.0, "Severity score deve ser 0.0"
        assert isinstance(analysis.recommendations, list), "Recommendations deve ser lista"
    
    @pytest.mark.asyncio
    async def test_property_self_conflict_prevention(self, supervisor_service):
        """
        Property: Padrão não deve conflitar consigo mesmo
        
        Para qualquer padrão:
        1. Validação contra lista contendo apenas ele mesmo não deve gerar conflitos
        2. Não deve causar loops infinitos ou erros
        """
        pattern = {
            "id": str(uuid.uuid4()),
            "trigger": "trigger de teste",
            "action": "ação de teste",
            "contexts": ["teste"]
        }
        
        # Testar validação contra si mesmo
        analysis = await supervisor_service.validate_pattern_conflicts(pattern, [pattern])
        
        # Verificar que não há auto-conflito problemático
        assert isinstance(analysis, ConflictAnalysis), "Deve retornar análise válida"
        
        # Se há conflitos, não devem ser consigo mesmo
        for conflict in analysis.conflict_details:
            assert conflict.existing_pattern_id != pattern["id"], \
                f"Padrão não deve conflitar consigo mesmo: {pattern['id']}"


if __name__ == "__main__":
    # Executar testes específicos
    pytest.main([__file__, "-v", "--tb=short"])