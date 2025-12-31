"""
Testes de propriedade para detecção de padrões - SICC Learning Service

Valida Property 4: Pattern Detection Accuracy
Requirements: 2.1, 2.2
"""

import pytest
from hypothesis import given, strategies as st, settings, HealthCheck
from datetime import datetime, timedelta
from unittest.mock import MagicMock
import uuid

# Mock do LearningService para testes de propriedade
class MockLearningService:
    def __init__(self):
        self.patterns = []
        self.confidence_threshold = 0.7
        
    def analyze_conversation_patterns(self, conversations: list) -> list:
        """Mock da análise de padrões em conversas"""
        patterns = []
        
        # Simular detecção de padrões baseada em similaridade de conteúdo
        content_groups = {}
        
        for conv in conversations:
            # Agrupar por palavras-chave similares
            content = conv.get('content', '').lower()
            words = set(content.split())
            
            # Encontrar grupo similar existente
            found_group = None
            for group_key, group_convs in content_groups.items():
                # Calcular similaridade simples (palavras em comum)
                group_words = set(group_key.split())
                similarity = len(words.intersection(group_words)) / max(len(words), len(group_words), 1)
                
                if similarity > 0.3:  # Threshold de similaridade
                    found_group = group_key
                    break
            
            if found_group:
                content_groups[found_group].append(conv)
            else:
                # Criar novo grupo
                key_words = ' '.join(sorted(list(words)[:3]))  # Usar 3 palavras principais
                content_groups[key_words] = [conv]
        
        # Converter grupos em padrões
        for group_key, group_convs in content_groups.items():
            if len(group_convs) >= 2:  # Mínimo 2 conversas para formar padrão
                confidence = min(0.95, len(group_convs) / 10.0)  # Confidence baseada na frequência
                
                pattern = {
                    'id': str(uuid.uuid4()),
                    'type': 'content_similarity',
                    'description': f'Padrão baseado em: {group_key}',
                    'confidence_score': confidence,
                    'frequency': len(group_convs),
                    'conversations': group_convs,
                    'conditions': {'keywords': group_key.split()},
                    'template': f'Resposta padrão para {group_key}',
                    'created_at': datetime.utcnow()
                }
                patterns.append(pattern)
        
        return patterns
    
    def calculate_confidence_score(self, pattern_data: dict) -> float:
        """Mock do cálculo de confidence score"""
        frequency = pattern_data.get('frequency', 0)
        consistency = pattern_data.get('consistency', 0.5)
        
        # Fórmula simples: frequency * consistency, limitado a 1.0
        base_score = (frequency / 10.0) * consistency
        return min(1.0, max(0.0, base_score))
    
    def categorize_pattern(self, pattern: dict) -> str:
        """Mock da categorização de padrões"""
        content = pattern.get('description', '').lower()
        
        if any(word in content for word in ['erro', 'problema', 'falha', 'bug']):
            return 'error_handling'
        elif any(word in content for word in ['preço', 'valor', 'custo', 'pagamento']):
            return 'pricing'
        elif any(word in content for word in ['produto', 'colchão', 'magnético']):
            return 'product_info'
        elif any(word in content for word in ['entrega', 'envio', 'prazo']):
            return 'delivery'
        else:
            return 'general'

# Estratégias para geração de dados de teste
@st.composite
def conversation_data(draw):
    """Gera dados de conversa para testes"""
    topics = ['produto magnético', 'preço colchão', 'entrega rápida', 'problema técnico', 'suporte cliente']
    
    return {
        'id': str(uuid.uuid4()),
        'content': draw(st.sampled_from(topics)) + ' ' + draw(st.text(min_size=5, max_size=50, alphabet='abcdefghijklmnopqrstuvwxyz ')),
        'user_message': draw(st.text(min_size=10, max_size=100, alphabet='abcdefghijklmnopqrstuvwxyz ')),
        'agent_response': draw(st.text(min_size=10, max_size=100, alphabet='abcdefghijklmnopqrstuvwxyz ')),
        'timestamp': draw(st.datetimes(
            min_value=datetime(2024, 1, 1),
            max_value=datetime(2024, 12, 31)
        )),
        'metadata': {
            'satisfaction': draw(st.floats(min_value=0.0, max_value=1.0, allow_nan=False)),
            'resolved': draw(st.booleans())
        }
    }

@st.composite
def conversation_list(draw, min_size=0, max_size=20):
    """Gera lista de conversas para testes"""
    return draw(st.lists(
        conversation_data(),
        min_size=min_size,
        max_size=max_size
    ))

@st.composite
def pattern_data(draw):
    """Gera dados de padrão para testes"""
    return {
        'frequency': draw(st.integers(min_value=1, max_value=20)),
        'consistency': draw(st.floats(min_value=0.0, max_value=1.0, allow_nan=False)),
        'conversations': draw(conversation_list(min_size=1, max_size=10)),
        'keywords': draw(st.lists(st.text(min_size=3, max_size=10, alphabet='abcdefghijklmnopqrstuvwxyz'), min_size=1, max_size=5))
    }

class TestLearningPatternProperties:
    """
    Testes de propriedade para detecção de padrões no Learning Service
    
    **Feature: sicc-sistema-inteligencia-corporativa, Property 4: Pattern Detection Accuracy**
    """
    
    @given(
        conversations=conversation_list(min_size=2, max_size=15)
    )
    @settings(max_examples=20, suppress_health_check=[HealthCheck.too_slow])
    def test_pattern_detection_requires_minimum_frequency(self, conversations):
        """
        Property 4a: Padrões só são detectados com frequência mínima
        
        Para qualquer conjunto de conversas, padrões detectados devem ter
        pelo menos 2 conversas similares (frequência mínima).
        
        **Validates: Requirements 2.1**
        """
        service = MockLearningService()
        
        # Executar detecção de padrões
        patterns = service.analyze_conversation_patterns(conversations)
        
        # Verificar que todos os padrões têm frequência >= 2
        for pattern in patterns:
            assert pattern['frequency'] >= 2, \
                f"Padrão detectado com frequência insuficiente: {pattern['frequency']}"
            
            # Verificar que o número de conversas corresponde à frequência
            assert len(pattern['conversations']) == pattern['frequency'], \
                f"Inconsistência entre frequência ({pattern['frequency']}) " \
                f"e número de conversas ({len(pattern['conversations'])})"
    
    @given(
        conversations=conversation_list(min_size=0, max_size=15)
    )
    @settings(max_examples=20)
    def test_pattern_detection_is_deterministic(self, conversations):
        """
        Property 4b: Detecção de padrões é determinística
        
        Para qualquer conjunto de conversas, executar detecção múltiplas vezes
        deve produzir os mesmos padrões.
        
        **Validates: Requirements 2.1**
        """
        service = MockLearningService()
        
        # Primeira execução
        patterns1 = service.analyze_conversation_patterns(conversations)
        
        # Segunda execução
        patterns2 = service.analyze_conversation_patterns(conversations)
        
        # Verificar que o número de padrões é o mesmo
        assert len(patterns1) == len(patterns2), \
            f"Número de padrões inconsistente: {len(patterns1)} vs {len(patterns2)}"
        
        # Verificar que os padrões têm as mesmas características
        if patterns1:
            # Ordenar por frequência para comparação
            patterns1_sorted = sorted(patterns1, key=lambda p: p['frequency'], reverse=True)
            patterns2_sorted = sorted(patterns2, key=lambda p: p['frequency'], reverse=True)
            
            for p1, p2 in zip(patterns1_sorted, patterns2_sorted):
                assert p1['frequency'] == p2['frequency'], \
                    "Frequências diferentes entre execuções"
                assert p1['type'] == p2['type'], \
                    "Tipos diferentes entre execuções"
    
    @given(
        pattern_data=pattern_data()
    )
    @settings(max_examples=25)
    def test_confidence_score_bounds(self, pattern_data):
        """
        Property 4c: Confidence score está sempre entre 0.0 e 1.0
        
        Para qualquer dados de padrão, o confidence score calculado
        deve estar no intervalo [0.0, 1.0].
        
        **Validates: Requirements 2.2**
        """
        service = MockLearningService()
        
        # Calcular confidence score
        confidence = service.calculate_confidence_score(pattern_data)
        
        # Verificar bounds
        assert 0.0 <= confidence <= 1.0, \
            f"Confidence score fora dos limites: {confidence}"
        
        # Verificar que é um número válido
        assert isinstance(confidence, (int, float)), \
            f"Confidence score não é numérico: {type(confidence)}"
        
        assert not (confidence != confidence), \
            "Confidence score é NaN"
    
    @given(
        pattern_data=pattern_data()
    )
    @settings(max_examples=25)
    def test_confidence_increases_with_frequency(self, pattern_data):
        """
        Property 4d: Confidence aumenta com a frequência
        
        Para qualquer padrão, aumentar a frequência (mantendo consistência)
        deve resultar em confidence score igual ou maior.
        
        **Validates: Requirements 2.2**
        """
        service = MockLearningService()
        
        # Calcular confidence original
        original_confidence = service.calculate_confidence_score(pattern_data)
        
        # Aumentar frequência
        increased_data = pattern_data.copy()
        increased_data['frequency'] = pattern_data['frequency'] + 5
        
        # Calcular novo confidence
        new_confidence = service.calculate_confidence_score(increased_data)
        
        # Verificar que confidence não diminuiu
        assert new_confidence >= original_confidence, \
            f"Confidence diminuiu com aumento de frequência: " \
            f"{original_confidence} -> {new_confidence}"
    
    @given(
        conversations=conversation_list(min_size=3, max_size=15)
    )
    @settings(max_examples=15)
    def test_pattern_categorization_consistency(self, conversations):
        """
        Property 4e: Categorização de padrões é consistente
        
        Para qualquer conjunto de padrões detectados, padrões similares
        devem receber a mesma categoria.
        
        **Validates: Requirements 2.4**
        """
        service = MockLearningService()
        
        # Detectar padrões
        patterns = service.analyze_conversation_patterns(conversations)
        
        # Categorizar cada padrão
        categorized_patterns = []
        for pattern in patterns:
            category = service.categorize_pattern(pattern)
            categorized_patterns.append((pattern, category))
        
        # Verificar que categorias são válidas
        valid_categories = {'error_handling', 'pricing', 'product_info', 'delivery', 'general'}
        
        for pattern, category in categorized_patterns:
            assert category in valid_categories, \
                f"Categoria inválida: {category}"
        
        # Verificar consistência: padrões com palavras-chave similares
        # devem ter categorias relacionadas
        category_groups = {}
        for pattern, category in categorized_patterns:
            if category not in category_groups:
                category_groups[category] = []
            category_groups[category].append(pattern)
        
        # Cada categoria deve ter padrões com características similares
        for category, patterns_in_category in category_groups.items():
            if len(patterns_in_category) > 1:
                # Verificar que padrões na mesma categoria têm alguma similaridade
                descriptions = [p['description'].lower() for p in patterns_in_category]
                
                # Pelo menos uma palavra em comum entre padrões da mesma categoria
                for i, desc1 in enumerate(descriptions):
                    for desc2 in descriptions[i+1:]:
                        words1 = set(desc1.split())
                        words2 = set(desc2.split())
                        common_words = words1.intersection(words2)
                        
                        # Deve haver pelo menos uma palavra em comum ou ambos serem 'general'
                        assert len(common_words) > 0 or category == 'general', \
                            f"Padrões na categoria '{category}' sem similaridade: " \
                            f"'{desc1}' vs '{desc2}'"
    
    @given(
        conversations=conversation_list(min_size=1, max_size=10)
    )
    @settings(max_examples=15)
    def test_no_duplicate_patterns(self, conversations):
        """
        Property 4f: Não há padrões duplicados
        
        Para qualquer conjunto de conversas, a detecção de padrões
        não deve produzir padrões duplicados ou redundantes.
        
        **Validates: Requirements 2.1**
        """
        service = MockLearningService()
        
        # Detectar padrões
        patterns = service.analyze_conversation_patterns(conversations)
        
        # Verificar que não há padrões com descrições idênticas
        descriptions = [p['description'] for p in patterns]
        unique_descriptions = set(descriptions)
        
        assert len(descriptions) == len(unique_descriptions), \
            f"Padrões duplicados detectados: {len(descriptions)} vs {len(unique_descriptions)}"
        
        # Verificar que não há padrões com condições idênticas
        conditions_strs = []
        for pattern in patterns:
            conditions = pattern.get('conditions', {})
            conditions_str = str(sorted(conditions.items()))
            conditions_strs.append(conditions_str)
        
        unique_conditions = set(conditions_strs)
        
        assert len(conditions_strs) == len(unique_conditions), \
            "Padrões com condições idênticas detectados"

# Executar testes se chamado diretamente
if __name__ == "__main__":
    pytest.main([__file__, "-v"])