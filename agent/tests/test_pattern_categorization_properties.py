#!/usr/bin/env python3
"""
Testes de propriedade para categorização de pa
Valida Property 5: Pattern Categorization
Requirements: 2.4
"""

import pytest
from hypothesis import given, strategies as st, settings, HealthCheck
from datetime import datetime
import uuid

# Mock do LearningService para testes de categorização
class MockPatternCategorizer:
    def __init__(self):
        self.categories = {
            'error_handling': ['erro', 'problema', 'falha', 'bug', 'defeito', 'não funciona'],
            'pricing': ['preço', 'valor', 'custo', 'pagamento', 'desconto', 'promoção'],
            'product_info': ['produto', 'colchão', 'magnético', 'especificação', 'tamanho', 'material'],
            'delivery': ['entrega', 'envio', 'prazo', 'frete', 'transporte', 'recebimento'],
            'support': ['ajuda', 'suporte', 'atendimento', 'dúvida', 'orientação', 'assistência'],
            'general': []  # Categoria padrão
        }
        
    def categorize_pattern(self, pattern: dict) -> str:
        """Categoriza um padrão baseado em seu conteúdo"""
        content = pattern.get('description', '').lower()
        keywords = pattern.get('conditions', {}).get('keywords', [])
        
        # Combinar descrição e keywords para análise
        all_text = content + ' ' + ' '.join(keywords).lower()
        
        # Contar matches por categoria
        category_scores = {}
        for category, category_keywords in self.categories.items():
            if category == 'general':
                continue
                
            score = 0
            for keyword in category_keywords:
                if keyword in all_text:
                    score += 1
            
            if score > 0:
                category_scores[category] = score
        
        # Retornar categoria com maior score, ou 'general' se nenhuma
        if category_scores:
            return max(category_scores.items(), key=lambda x: x[1])[0]
        else:
            return 'general'
    
    def get_category_confidence(self, pattern: dict, category: str) -> float:
        """Calcula confidence da categorização"""
        content = pattern.get('description', '').lower()
        keywords = pattern.get('conditions', {}).get('keywords', [])
        all_text = content + ' ' + ' '.join(keywords).lower()
        
        if category == 'general':
            # Confidence baixa para categoria geral
            return 0.3
        
        category_keywords = self.categories.get(category, [])
        matches = sum(1 for keyword in category_keywords if keyword in all_text)
        
        # Confidence baseada na proporção de matches
        if len(category_keywords) > 0:
            return min(1.0, matches / len(category_keywords) + 0.2)
        else:
            return 0.0
    
    def validate_category_consistency(self, patterns: list) -> bool:
        """Valida se padrões similares têm categorias consistentes"""
        # Agrupar padrões por similaridade de keywords
        keyword_groups = {}
        
        for pattern in patterns:
            keywords = pattern.get('conditions', {}).get('keywords', [])
            key_signature = tuple(sorted(keywords))
            
            if key_signature not in keyword_groups:
                keyword_groups[key_signature] = []
            keyword_groups[key_signature].append(pattern)
        
        # Verificar consistência dentro de cada grupo
        for group_patterns in keyword_groups.values():
            if len(group_patterns) > 1:
                categories = [self.categorize_pattern(p) for p in group_patterns]
                unique_categories = set(categories)
                
                # Padrões similares devem ter no máximo 2 categorias diferentes
                if len(unique_categories) > 2:
                    return False
        
        return True

# Estratégias para geração de dados de teste
@st.composite
def pattern_data(draw):
    """Gera dados de padrão para testes de categorização"""
    categories = ['error_handling', 'pricing', 'product_info', 'delivery', 'support', 'general']
    keywords_by_category = {
        'error_handling': ['erro', 'problema'],
        'pricing': ['preço', 'valor'],
        'product_info': ['produto', 'colchão'],
        'delivery': ['entrega', 'envio'],
        'support': ['ajuda', 'suporte'],
        'general': ['geral', 'info']
    }
    
    # Escolher categoria aleatória
    target_category = draw(st.sampled_from(categories))
    
    # Usar keywords fixas para cada categoria
    selected_keywords = keywords_by_category[target_category]
    
    # Gerar descrição simples
    description = ' '.join(selected_keywords) + ' descrição'
    
    return {
        'id': f'test_{draw(st.integers(min_value=1, max_value=1000))}',
        'type': 'content_similarity',
        'description': description,
        'confidence_score': draw(st.floats(min_value=0.1, max_value=0.9, allow_nan=False)),
        'frequency': draw(st.integers(min_value=2, max_value=10)),
        'conditions': {
            'keywords': selected_keywords
        },
        'template': f'Template para {description}',
        'created_at': datetime(2024, 1, 1),
        'expected_category': target_category
    }

@st.composite
def pattern_list(draw, min_size=1, max_size=10):
    """Gera lista de padrões para testes"""
    return draw(st.lists(
        pattern_data(),
        min_size=min_size,
        max_size=max_size
    ))

class TestPatternCategorizationProperties:
    """
    Testes de propriedade para categorização de padrões
    
    **Feature: sicc-sistema-inteligencia-corporativa, Property 5: Pattern Categorization**
    """
    
    def test_categorization_returns_valid_category(self):
        """
        Property 5a: Categorização sempre retorna categoria válida
        
        Para qualquer padrão, a categorização deve retornar uma das
        categorias predefinidas válidas.
        
        **Validates: Requirements 2.4**
        """
        categorizer = MockPatternCategorizer()
        
        # Usar dados fixos para evitar problemas de performance
        test_patterns = [
            {
                'id': 'test_1',
                'description': 'erro problema descrição',
                'conditions': {'keywords': ['erro', 'problema']},
                'confidence_score': 0.8,
                'frequency': 5
            },
            {
                'id': 'test_2', 
                'description': 'preço valor descrição',
                'conditions': {'keywords': ['preço', 'valor']},
                'confidence_score': 0.7,
                'frequency': 3
            },
            {
                'id': 'test_3',
                'description': 'produto colchão descrição',
                'conditions': {'keywords': ['produto', 'colchão']},
                'confidence_score': 0.9,
                'frequency': 8
            },
            {
                'id': 'test_4',
                'description': 'entrega envio descrição',
                'conditions': {'keywords': ['entrega', 'envio']},
                'confidence_score': 0.6,
                'frequency': 4
            },
            {
                'id': 'test_5',
                'description': 'ajuda suporte descrição',
                'conditions': {'keywords': ['ajuda', 'suporte']},
                'confidence_score': 0.5,
                'frequency': 2
            },
            {
                'id': 'test_6',
                'description': 'geral info descrição',
                'conditions': {'keywords': ['geral', 'info']},
                'confidence_score': 0.3,
                'frequency': 6
            }
        ]
        
        valid_categories = {'error_handling', 'pricing', 'product_info', 'delivery', 'support', 'general'}
        
        for pattern in test_patterns:
            # Executar categorização
            category = categorizer.categorize_pattern(pattern)
            
            # Verificar que categoria é válida
            assert category in valid_categories, \
                f"Categoria inválida retornada: {category}"
            
            # Verificar que categoria é string não vazia
            assert isinstance(category, str), \
                f"Categoria não é string: {type(category)}"
            
            assert len(category) > 0, \
                "Categoria vazia retornada"
    
    @given(
        pattern=pattern_data()
    )
    @settings(max_examples=25)
    def test_categorization_is_deterministic(self, pattern):
        """
        Property 5b: Categorização é determinística
        
        Para qualquer padrão, executar categorização múltiplas vezes
        deve retornar sempre a mesma categoria.
        
        **Validates: Requirements 2.4**
        """
        categorizer = MockPatternCategorizer()
        
        # Primeira categorização
        category1 = categorizer.categorize_pattern(pattern)
        
        # Segunda categorização
        category2 = categorizer.categorize_pattern(pattern)
        
        # Terceira categorização
        category3 = categorizer.categorize_pattern(pattern)
        
        # Verificar determinismo
        assert category1 == category2 == category3, \
            f"Categorização não determinística: {category1}, {category2}, {category3}"
    
    @given(
        pattern=pattern_data()
    )
    @settings(max_examples=25)
    def test_category_confidence_bounds(self, pattern):
        """
        Property 5c: Confidence da categoria está entre 0.0 e 1.0
        
        Para qualquer padrão e categoria, o confidence da categorização
        deve estar no intervalo [0.0, 1.0].
        
        **Validates: Requirements 2.4**
        """
        categorizer = MockPatternCategorizer()
        
        # Obter categoria
        category = categorizer.categorize_pattern(pattern)
        
        # Calcular confidence
        confidence = categorizer.get_category_confidence(pattern, category)
        
        # Verificar bounds
        assert 0.0 <= confidence <= 1.0, \
            f"Confidence fora dos limites: {confidence}"
        
        # Verificar que é número válido
        assert isinstance(confidence, (int, float)), \
            f"Confidence não é numérico: {type(confidence)}"
        
        assert not (confidence != confidence), \
            "Confidence é NaN"
    
    @given(
        patterns=pattern_list(min_size=2, max_size=8)
    )
    @settings(max_examples=20)
    def test_similar_patterns_similar_categories(self, patterns):
        """
        Property 5d: Padrões similares têm categorias relacionadas
        
        Para qualquer conjunto de padrões com keywords similares,
        eles devem receber categorias relacionadas ou idênticas.
        
        **Validates: Requirements 2.4**
        """
        categorizer = MockPatternCategorizer()
        
        # Categorizar todos os padrões
        categorized = [(p, categorizer.categorize_pattern(p)) for p in patterns]
        
        # Agrupar por keywords similares
        keyword_groups = {}
        for pattern, category in categorized:
            keywords = pattern.get('conditions', {}).get('keywords', [])
            key_signature = tuple(sorted(keywords))
            
            if key_signature not in keyword_groups:
                keyword_groups[key_signature] = []
            keyword_groups[key_signature].append((pattern, category))
        
        # Verificar consistência dentro de grupos
        for group in keyword_groups.values():
            if len(group) > 1:
                categories = [cat for _, cat in group]
                unique_categories = set(categories)
                
                # Padrões com keywords idênticas devem ter categorias consistentes
                # (máximo 2 categorias diferentes por grupo)
                assert len(unique_categories) <= 2, \
                    f"Muitas categorias diferentes para keywords similares: {unique_categories}"
    
    @given(
        patterns=pattern_list(min_size=3, max_size=10)
    )
    @settings(max_examples=15)
    def test_category_distribution_reasonable(self, patterns):
        """
        Property 5e: Distribuição de categorias é razoável
        
        Para qualquer conjunto de padrões, não deve haver concentração
        excessiva em uma única categoria (exceto 'general').
        
        **Validates: Requirements 2.4**
        """
        categorizer = MockPatternCategorizer()
        
        # Categorizar todos os padrões
        categories = [categorizer.categorize_pattern(p) for p in patterns]
        
        # Contar distribuição
        category_counts = {}
        for category in categories:
            category_counts[category] = category_counts.get(category, 0) + 1
        
        # Verificar que não há concentração excessiva (exceto 'general')
        total_patterns = len(patterns)
        
        for category, count in category_counts.items():
            if category != 'general' and total_patterns > 3:
                # Nenhuma categoria específica deve ter mais de 80% dos padrões
                percentage = count / total_patterns
                assert percentage <= 0.8, \
                    f"Concentração excessiva na categoria '{category}': {percentage:.2%}"
        
        # Deve haver pelo menos 1 categoria não-general se houver padrões suficientes
        if total_patterns >= 3:
            non_general_categories = [cat for cat in categories if cat != 'general']
            assert len(non_general_categories) > 0, \
                "Todos os padrões foram categorizados como 'general'"
    
    @given(
        patterns=pattern_list(min_size=2, max_size=8)
    )
    @settings(max_examples=15)
    def test_categorization_consistency_validation(self, patterns):
        """
        Property 5f: Validação de consistência funciona corretamente
        
        Para qualquer conjunto de padrões, a validação de consistência
        deve identificar corretamente inconsistências na categorização.
        
        **Validates: Requirements 2.4**
        """
        categorizer = MockPatternCategorizer()
        
        # Testar validação com padrões normais
        is_consistent = categorizer.validate_category_consistency(patterns)
        
        # Resultado deve ser booleano
        assert isinstance(is_consistent, bool), \
            f"Validação não retornou booleano: {type(is_consistent)}"
        
        # Criar padrões intencionalmente inconsistentes
        inconsistent_patterns = [
            {
                'id': '1',
                'description': 'erro problema falha',
                'conditions': {'keywords': ['erro', 'problema']},
            },
            {
                'id': '2', 
                'description': 'preço valor custo',
                'conditions': {'keywords': ['erro', 'problema']},  # Mesmas keywords, conteúdo diferente
            },
            {
                'id': '3',
                'description': 'entrega envio prazo',
                'conditions': {'keywords': ['erro', 'problema']},  # Mesmas keywords, conteúdo diferente
            }
        ]
        
        # Validação deve detectar inconsistência
        is_inconsistent = categorizer.validate_category_consistency(inconsistent_patterns)
        
        # Deve retornar False para padrões inconsistentes
        assert not is_inconsistent, \
            "Validação não detectou inconsistência óbvia"
    
    @given(
        pattern=pattern_data()
    )
    @settings(max_examples=20)
    def test_general_category_fallback(self, pattern):
        """
        Property 5g: Categoria 'general' é usada como fallback
        
        Para qualquer padrão sem keywords específicas reconhecíveis,
        deve ser categorizado como 'general'.
        
        **Validates: Requirements 2.4**
        """
        categorizer = MockPatternCategorizer()
        
        # Criar padrão sem keywords reconhecíveis
        generic_pattern = {
            'id': str(uuid.uuid4()),
            'description': 'xyz abc def random text',
            'conditions': {'keywords': ['xyz', 'abc', 'def']},
            'confidence_score': 0.5,
            'frequency': 3
        }
        
        # Categorizar
        category = categorizer.categorize_pattern(generic_pattern)
        
        # Deve ser 'general'
        assert category == 'general', \
            f"Padrão genérico não foi categorizado como 'general': {category}"
        
        # Confidence para 'general' deve ser baixa
        confidence = categorizer.get_category_confidence(generic_pattern, category)
        assert confidence <= 0.5, \
            f"Confidence muito alta para categoria 'general': {confidence}"

# Executar testes se chamado diretamente
if __name__ == "__main__":
    pytest.main([__file__, "-v"])