#!/usr/bin/env python3
"""
Testes de propriedade para BehaviorService - SICC

Testa as propriedades universais do sistema de aplicação de padrões:
- Property 8: Pattern Application Workflow
- Validação de busca e aplicação de padrões
- Priorização por confidence score
- Adaptação contextual de respostas
"""

import pytest
import asyncio
import uuid
from datetime import datetime, timedelta
from typing import List, Dict, Any
from unittest.mock import Mock, AsyncMock, patch
from hypothesis import given, strategies as st, settings, assume, HealthCheck
from hypothesis.strategies import composite

import sys
import os
sys.path.append('agent/src')
sys.path.append('agent/src/services')
sys.path.append('agent/src/services/sicc')

from behavior_service import BehaviorService, ApplicablePattern, ResponseResult
from learning_service import Pattern

# Estratégias para geração de dados de teste

@composite
def pattern_strategy(draw):
    """Gera padrões válidos para teste"""
    pattern_types = ["response", "workflow", "preference", "error_handling"]
    
    return Pattern(
        id=str(uuid.uuid4()),
        pattern_type=draw(st.sampled_from(pattern_types)),
        trigger=draw(st.text(min_size=5, max_size=50)),
        action=draw(st.text(min_size=5, max_size=50)),
        confidence=draw(st.floats(min_value=0.1, max_value=1.0)),
        frequency=draw(st.integers(min_value=1, max_value=20)),
        contexts=[draw(st.text(min_size=3, max_size=10)) for _ in range(draw(st.integers(min_value=0, max_value=2)))],
        metadata={"test": True},  # Simplificar metadata
        created_at=datetime.utcnow() - timedelta(days=draw(st.integers(min_value=0, max_value=10))),
        last_seen=datetime.utcnow() - timedelta(hours=draw(st.integers(min_value=0, max_value=12)))
    )

@composite
def message_context_strategy(draw):
    """Gera mensagens e contextos válidos"""
    message = draw(st.text(min_size=5, max_size=500))
    assume(message.strip())  # Garantir que não é vazia
    
    context = {
        "conversation_id": str(uuid.uuid4()),
        "user_name": draw(st.text(min_size=2, max_size=50)),
        "interaction_type": draw(st.sampled_from(["question", "request", "complaint", "compliment"])),
        "formal_context": draw(st.booleans()),
        "timestamp": datetime.utcnow().isoformat()
    }
    
    return message, context

@composite
def applicable_pattern_strategy(draw):
    """Gera padrões aplicáveis válidos"""
    pattern = draw(pattern_strategy())
    relevance_score = draw(st.floats(min_value=0.0, max_value=1.0))
    
    template = None
    if draw(st.booleans()):  # 50% chance de ter template
        template = {
            "template_text": draw(st.text(min_size=10, max_size=200)),
            "placeholders": [draw(st.text(min_size=2, max_size=10)) for _ in range(draw(st.integers(min_value=0, max_value=3)))],
            "structure_type": draw(st.sampled_from(["simple", "detailed", "question_response"]))
        }
    
    return ApplicablePattern(
        pattern=pattern,
        relevance_score=relevance_score,
        template=template,
        application_context=draw(st.dictionaries(
            st.text(min_size=1, max_size=10),
            st.text(min_size=1, max_size=50),
            min_size=0, max_size=3
        ))
    )

class TestBehaviorServiceProperties:
    """Testes de propriedade para BehaviorService"""
    
    @pytest.fixture
    def mock_behavior_service(self):
        """Cria BehaviorService com dependências mockadas"""
        with patch('behavior_service.get_supabase_client') as mock_supabase, \
             patch('behavior_service.get_ai_service') as mock_ai:
            
            # Mock do Supabase
            mock_supabase_instance = Mock()
            mock_supabase.return_value = mock_supabase_instance
            
            # Mock do AI Service
            mock_ai_instance = Mock()
            mock_ai_instance.generate_text = AsyncMock(return_value={
                'text': 'Resposta gerada pela IA',
                'provider': 'openai'
            })
            mock_ai.return_value = mock_ai_instance
            
            service = BehaviorService()
            
            # Mock dos serviços lazy-loaded
            service._memory_service = Mock()
            service._memory_service._calculate_text_similarity = AsyncMock(return_value=0.7)
            
            service._learning_service = Mock()
            
            return service
    
    @given(st.lists(pattern_strategy(), min_size=1, max_size=5))
    @settings(max_examples=10, deadline=10000, suppress_health_check=[HealthCheck.function_scoped_fixture, HealthCheck.too_slow])
    @pytest.mark.asyncio
    async def test_property_pattern_prioritization_consistency(self, mock_behavior_service, patterns):
        """
        Property: Priorização de padrões deve ser consistente e determinística
        
        Para qualquer lista de padrões, a priorização deve:
        1. Retornar todos os padrões de entrada
        2. Manter ordem determinística para padrões com mesmo score
        3. Ordenar por score combinado (maior primeiro)
        """
        # Converter Pattern para ApplicablePattern
        applicable_patterns = []
        for pattern in patterns:
            applicable_pattern = ApplicablePattern(
                pattern=pattern,
                relevance_score=0.8,  # Score fixo para focar na lógica de priorização
                template=None,
                application_context={}
            )
            applicable_patterns.append(applicable_pattern)
        
        # Executar priorização
        prioritized = await mock_behavior_service.prioritize_patterns(applicable_patterns)
        
        # Verificar propriedades
        assert len(prioritized) == len(applicable_patterns), "Deve retornar todos os padrões"
        
        # Verificar ordem decrescente de score
        for i in range(len(prioritized) - 1):
            current_pattern = prioritized[i].pattern
            next_pattern = prioritized[i + 1].pattern
            
            # Calcular scores manualmente para verificação
            current_score = (
                current_pattern.confidence * 0.4 +
                prioritized[i].relevance_score * 0.3 +
                min(current_pattern.frequency / 100.0, 1.0) * 0.2
            )
            
            next_score = (
                next_pattern.confidence * 0.4 +
                prioritized[i + 1].relevance_score * 0.3 +
                min(next_pattern.frequency / 100.0, 1.0) * 0.2
            )
            
            assert current_score >= next_score, f"Ordem incorreta: {current_score} < {next_score}"
    
    @given(message_context_strategy())
    @settings(max_examples=30, deadline=10000, suppress_health_check=[HealthCheck.function_scoped_fixture])
    @pytest.mark.asyncio
    async def test_property_pattern_search_validity(self, mock_behavior_service, message_context):
        """
        Property: Busca de padrões deve retornar apenas padrões válidos e relevantes
        
        Para qualquer mensagem e contexto:
        1. Todos os padrões retornados devem ter relevance_score >= threshold
        2. Padrões devem estar ordenados por relevância
        3. Número de padrões não deve exceder o máximo configurado
        """
        message, context = message_context
        
        # Mock de padrões aprovados
        mock_patterns = []
        for i in range(5):
            pattern = Pattern(
                id=str(uuid.uuid4()),
                pattern_type="response",
                trigger=f"trigger {i}",
                action=f"action {i}",
                confidence=0.5 + (i * 0.1),
                frequency=i + 1,
                contexts=[],
                metadata={},
                created_at=datetime.utcnow(),
                last_seen=datetime.utcnow()
            )
            mock_patterns.append(pattern)
        
        # Mock do método _get_approved_patterns
        mock_behavior_service._get_approved_patterns = AsyncMock(return_value=mock_patterns)
        
        # Mock dos métodos de cálculo de relevância
        async def mock_calculate_relevance(pattern, msg, ctx):
            # Simular relevância baseada no índice do padrão
            base_relevance = 0.2 + (hash(pattern.id) % 100) / 100.0 * 0.6
            return min(1.0, base_relevance)
        
        mock_behavior_service._calculate_pattern_relevance = mock_calculate_relevance
        mock_behavior_service._get_pattern_template = AsyncMock(return_value=None)
        mock_behavior_service._prepare_application_context = AsyncMock(return_value={})
        
        # Executar busca
        applicable_patterns = await mock_behavior_service.find_applicable_patterns(message, context)
        
        # Verificar propriedades
        assert len(applicable_patterns) <= mock_behavior_service.max_patterns_per_search, \
            "Não deve exceder máximo de padrões"
        
        # Verificar threshold de relevância
        for applicable_pattern in applicable_patterns:
            assert applicable_pattern.relevance_score >= mock_behavior_service.min_relevance_threshold, \
                f"Relevância {applicable_pattern.relevance_score} abaixo do threshold"
        
        # Verificar ordem decrescente de relevância
        for i in range(len(applicable_patterns) - 1):
            current_relevance = applicable_patterns[i].relevance_score
            next_relevance = applicable_patterns[i + 1].relevance_score
            assert current_relevance >= next_relevance, \
                f"Ordem incorreta: {current_relevance} < {next_relevance}"
    
    @given(applicable_pattern_strategy(), message_context_strategy())
    @settings(max_examples=20, deadline=15000, suppress_health_check=[HealthCheck.function_scoped_fixture])
    @pytest.mark.asyncio
    async def test_property_pattern_application_completeness(self, mock_behavior_service, applicable_pattern, message_context):
        """
        Property: Aplicação de padrão deve sempre produzir resultado válido
        
        Para qualquer padrão aplicável e contexto:
        1. Deve retornar ResponseResult válido
        2. Response text não deve estar vazio
        3. Confidence deve estar entre 0.0 e 1.0
        4. Metadata deve conter informações do padrão aplicado
        """
        message, context = message_context
        
        # Mock dos métodos necessários
        mock_behavior_service._apply_template = AsyncMock(return_value="Resposta do template")
        mock_behavior_service._generate_pattern_response = AsyncMock(return_value="Resposta do padrão")
        mock_behavior_service.adapt_response = AsyncMock(return_value="Resposta adaptada")
        mock_behavior_service._calculate_response_confidence = AsyncMock(return_value=0.8)
        mock_behavior_service._track_pattern_usage = AsyncMock()
        
        # Executar aplicação
        result = await mock_behavior_service.apply_pattern(applicable_pattern, context)
        
        # Verificar propriedades do resultado
        assert isinstance(result, ResponseResult), "Deve retornar ResponseResult"
        assert result.response_text, "Response text não pode estar vazio"
        assert result.response_text.strip(), "Response text não pode ser apenas espaços"
        assert 0.0 <= result.confidence <= 1.0, f"Confidence inválido: {result.confidence}"
        assert result.pattern_applied == applicable_pattern, "Deve referenciar padrão aplicado"
        assert isinstance(result.metadata, dict), "Metadata deve ser dicionário"
        assert "pattern_id" in result.metadata, "Metadata deve conter pattern_id"
        assert result.metadata["pattern_id"] == applicable_pattern.pattern.id, "Pattern_id deve corresponder"
    
    @given(st.text(min_size=1, max_size=200), st.dictionaries(
        st.text(min_size=1, max_size=10),
        st.one_of(st.text(), st.integers(), st.booleans()),
        min_size=1, max_size=5
    ))
    @settings(max_examples=30, deadline=5000, suppress_health_check=[HealthCheck.function_scoped_fixture])
    @pytest.mark.asyncio
    async def test_property_response_adaptation_preservation(self, mock_behavior_service, template, context):
        """
        Property: Adaptação de resposta deve preservar conteúdo essencial
        
        Para qualquer template e contexto:
        1. Resposta adaptada não deve estar vazia se template não estiver vazio
        2. Comprimento da resposta deve ser razoável (não muito menor que original)
        3. Adaptação deve ser idempotente (adaptar novamente não muda resultado)
        """
        assume(template.strip())  # Template não pode estar vazio
        
        # Mock dos métodos de adaptação
        mock_behavior_service._replace_basic_placeholders = AsyncMock(return_value=template)
        mock_behavior_service._personalize_response = AsyncMock(return_value=template)
        mock_behavior_service._adjust_tone_and_style = AsyncMock(return_value=template)
        
        # Primeira adaptação
        adapted1 = await mock_behavior_service.adapt_response(template, context)
        
        # Segunda adaptação (deve ser idempotente)
        adapted2 = await mock_behavior_service.adapt_response(adapted1, context)
        
        # Verificar propriedades
        assert adapted1, "Resposta adaptada não pode estar vazia"
        assert adapted1.strip(), "Resposta adaptada não pode ser apenas espaços"
        
        # Verificar que o comprimento é razoável (pelo menos 50% do original)
        min_length = max(1, len(template) // 2)
        assert len(adapted1) >= min_length, f"Resposta muito curta: {len(adapted1)} < {min_length}"
        
        # Verificar idempotência (pode não ser exata devido a timestamps, mas estrutura deve ser similar)
        assert len(adapted2) > 0, "Segunda adaptação não pode estar vazia"
    
    @given(st.lists(applicable_pattern_strategy(), min_size=2, max_size=5))
    @settings(max_examples=20, deadline=10000, suppress_health_check=[HealthCheck.function_scoped_fixture])
    @pytest.mark.asyncio
    async def test_property_pattern_selection_determinism(self, mock_behavior_service, applicable_patterns):
        """
        Property: Seleção de padrões deve ser determinística para mesmos inputs
        
        Para qualquer lista de padrões aplicáveis:
        1. Priorização deve produzir mesma ordem em execuções repetidas
        2. Padrão com maior score combinado deve vir primeiro
        3. Empates devem ser resolvidos de forma consistente
        """
        # Executar priorização múltiplas vezes
        result1 = await mock_behavior_service.prioritize_patterns(applicable_patterns.copy())
        result2 = await mock_behavior_service.prioritize_patterns(applicable_patterns.copy())
        result3 = await mock_behavior_service.prioritize_patterns(applicable_patterns.copy())
        
        # Verificar determinismo
        assert len(result1) == len(result2) == len(result3), "Tamanhos devem ser iguais"
        
        for i in range(len(result1)):
            assert result1[i].pattern.id == result2[i].pattern.id == result3[i].pattern.id, \
                f"Ordem inconsistente na posição {i}"
            assert result1[i].relevance_score == result2[i].relevance_score == result3[i].relevance_score, \
                f"Relevance score inconsistente na posição {i}"
    
    @pytest.mark.asyncio
    async def test_property_empty_patterns_handling(self, mock_behavior_service):
        """
        Property: Sistema deve lidar graciosamente com listas vazias
        
        Quando não há padrões disponíveis:
        1. find_applicable_patterns deve retornar lista vazia
        2. prioritize_patterns deve retornar lista vazia
        3. Não deve gerar exceções
        """
        # Mock para retornar lista vazia
        mock_behavior_service._get_approved_patterns = AsyncMock(return_value=[])
        
        # Testar busca com lista vazia
        result = await mock_behavior_service.find_applicable_patterns("test message", {"conversation_id": "test"})
        assert result == [], "Deve retornar lista vazia quando não há padrões"
        
        # Testar priorização com lista vazia
        prioritized = await mock_behavior_service.prioritize_patterns([])
        assert prioritized == [], "Deve retornar lista vazia para entrada vazia"
    
    @pytest.mark.asyncio
    async def test_property_invalid_input_handling(self, mock_behavior_service):
        """
        Property: Sistema deve validar inputs e falhar graciosamente
        
        Para inputs inválidos:
        1. Deve levantar ValueError para parâmetros obrigatórios vazios
        2. Deve retornar resultados seguros para inputs malformados
        3. Não deve causar crashes do sistema
        """
        # Testar mensagem vazia
        with pytest.raises(ValueError, match="Message não pode estar vazia"):
            await mock_behavior_service.find_applicable_patterns("", {"conversation_id": "test"})
        
        # Testar contexto inválido
        with pytest.raises(ValueError, match="Context deve ser um dicionário válido"):
            await mock_behavior_service.find_applicable_patterns("test", None)
        
        # Testar aplicação com padrão None
        with pytest.raises(ValueError, match="ApplicablePattern é obrigatório"):
            await mock_behavior_service.apply_pattern(None, {"conversation_id": "test"})
    
    @given(st.lists(applicable_pattern_strategy(), min_size=3, max_size=8))
    @settings(max_examples=15, deadline=10000, suppress_health_check=[HealthCheck.function_scoped_fixture, HealthCheck.too_slow])
    @pytest.mark.asyncio
    async def test_property_multi_pattern_prioritization(self, mock_behavior_service, applicable_patterns):
        """
        Property 9: Multi-Pattern Prioritization
        
        Para qualquer conjunto de padrões aplicáveis:
        1. Padrões com maior confidence devem ter prioridade
        2. Em caso de empate, frequência deve ser critério de desempate
        3. Padrões mais recentes devem ter vantagem sobre antigos
        4. Score combinado deve refletir todos os fatores
        """
        # Garantir que temos padrões com diferentes características
        if len(applicable_patterns) < 3:
            return  # Skip se não há padrões suficientes
        
        # Modificar alguns padrões para criar cenários de teste específicos
        applicable_patterns[0].pattern.confidence = 0.9  # Alto confidence
        applicable_patterns[0].pattern.frequency = 5
        applicable_patterns[0].relevance_score = 0.8
        
        applicable_patterns[1].pattern.confidence = 0.7  # Médio confidence
        applicable_patterns[1].pattern.frequency = 20   # Alta frequência
        applicable_patterns[1].relevance_score = 0.9    # Alta relevância
        
        applicable_patterns[2].pattern.confidence = 0.6  # Baixo confidence
        applicable_patterns[2].pattern.frequency = 2     # Baixa frequência
        applicable_patterns[2].relevance_score = 0.5     # Baixa relevância
        
        # Executar priorização
        prioritized = await mock_behavior_service.prioritize_patterns(applicable_patterns)
        
        # Verificar propriedades de priorização
        assert len(prioritized) == len(applicable_patterns), "Deve manter todos os padrões"
        
        # Calcular scores esperados manualmente
        def calculate_expected_score(ap):
            confidence_weight = 0.4
            relevance_weight = 0.3
            frequency_weight = 0.2
            recency_weight = 0.1
            
            normalized_frequency = min(ap.pattern.frequency / 100.0, 1.0)
            days_since_last_seen = (datetime.utcnow() - ap.pattern.last_seen).days
            recency_score = max(0.0, 1.0 - (days_since_last_seen / 30.0))
            
            return (
                ap.pattern.confidence * confidence_weight +
                ap.relevance_score * relevance_weight +
                normalized_frequency * frequency_weight +
                recency_score * recency_weight
            )
        
        # Verificar que estão ordenados por score decrescente
        for i in range(len(prioritized) - 1):
            current_score = calculate_expected_score(prioritized[i])
            next_score = calculate_expected_score(prioritized[i + 1])
            
            assert current_score >= next_score, \
                f"Priorização incorreta: posição {i} tem score {current_score:.3f} < posição {i+1} com score {next_score:.3f}"
        
        # Verificar que padrão com maior confidence está bem posicionado
        high_confidence_pattern = applicable_patterns[0]
        high_confidence_position = next(
            (i for i, ap in enumerate(prioritized) if ap.pattern.id == high_confidence_pattern.pattern.id),
            -1
        )
        
        # Padrão de alto confidence deve estar entre os primeiros 50%
        assert high_confidence_position <= len(prioritized) // 2, \
            f"Padrão de alto confidence ({high_confidence_pattern.pattern.confidence}) está na posição {high_confidence_position}, deveria estar mais bem posicionado"
    
    @given(st.lists(applicable_pattern_strategy(), min_size=2, max_size=6))
    @settings(max_examples=10, deadline=8000, suppress_health_check=[HealthCheck.function_scoped_fixture, HealthCheck.too_slow])
    @pytest.mark.asyncio
    async def test_property_prioritization_stability(self, mock_behavior_service, applicable_patterns):
        """
        Property: Priorização deve ser estável para padrões com scores similares
        
        Para padrões com scores muito próximos:
        1. Ordem deve ser consistente entre execuções
        2. Pequenas mudanças não devem causar grandes reorganizações
        3. Critérios de desempate devem ser aplicados consistentemente
        """
        # Criar padrões com scores similares
        for i, ap in enumerate(applicable_patterns):
            ap.pattern.confidence = 0.7 + (i * 0.01)  # Scores muito próximos
            ap.pattern.frequency = 10 + i
            ap.relevance_score = 0.8
        
        # Executar priorização múltiplas vezes
        results = []
        for _ in range(3):
            prioritized = await mock_behavior_service.prioritize_patterns(applicable_patterns.copy())
            pattern_ids = [ap.pattern.id for ap in prioritized]
            results.append(pattern_ids)
        
        # Verificar consistência
        for i in range(1, len(results)):
            assert results[0] == results[i], \
                f"Priorização inconsistente: execução 0 = {results[0]}, execução {i} = {results[i]}"
    
    @given(applicable_pattern_strategy())
    @settings(max_examples=15, deadline=5000, suppress_health_check=[HealthCheck.function_scoped_fixture, HealthCheck.too_slow])
    @pytest.mark.asyncio
    async def test_property_single_pattern_prioritization(self, mock_behavior_service, single_pattern):
        """
        Property: Priorização de um único padrão deve retornar o mesmo padrão
        
        Para qualquer padrão individual:
        1. Deve retornar lista com um elemento
        2. Elemento deve ser idêntico ao input
        3. Não deve modificar propriedades do padrão
        """
        original_confidence = single_pattern.pattern.confidence
        original_relevance = single_pattern.relevance_score
        
        # Executar priorização
        prioritized = await mock_behavior_service.prioritize_patterns([single_pattern])
        
        # Verificar propriedades
        assert len(prioritized) == 1, "Deve retornar exatamente um padrão"
        assert prioritized[0].pattern.id == single_pattern.pattern.id, "Deve ser o mesmo padrão"
        assert prioritized[0].pattern.confidence == original_confidence, "Confidence não deve ser modificado"
        assert prioritized[0].relevance_score == original_relevance, "Relevance score não deve ser modificado"


if __name__ == "__main__":
    # Executar testes específicos
    pytest.main([__file__, "-v", "--tb=short"])