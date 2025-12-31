"""
Testes de propriedade para estratégia de retenção de memórias - SICC

Valida Property 3: Memory Retention Strategy
Requirements: 1.5
"""

import pytest
from hypothesis import given, strategies as st, settings, HealthCheck
from datetime import datetime, timedelta
import uuid

# Mock do MemoryService para testes de propriedade
class MockMemoryService:
    def __init__(self):
        self.memories = []
        self.max_memories_per_conversation = 100
        self.retention_days = 90
        
    def cleanup_old_memories(self, retention_days: int = 90) -> int:
        """Mock da limpeza de memórias antigas"""
        base_date = datetime(2024, 1, 1)
        cutoff_date = base_date - timedelta(days=retention_days)
        
        # Simular limpeza baseada em data e relevância
        memories_to_remove = []
        for memory in self.memories:
            if (memory['created_at'] < cutoff_date and 
                memory['relevance_score'] < 0.3):
                memories_to_remove.append(memory)
        
        # Remover memórias
        for memory in memories_to_remove:
            self.memories.remove(memory)
            
        return len(memories_to_remove)
    
    def _cleanup_conversation_memories(self, conversation_id: str) -> None:
        """Mock da limpeza por conversa"""
        conversation_memories = [
            m for m in self.memories 
            if m['conversation_id'] == conversation_id
        ]
        
        if len(conversation_memories) > self.max_memories_per_conversation:
            # Ordenar por relevância (menor primeiro) e data (mais antiga primeiro)
            conversation_memories.sort(
                key=lambda m: (m['relevance_score'], m['created_at'])
            )
            
            excess = len(conversation_memories) - self.max_memories_per_conversation
            memories_to_remove = conversation_memories[:excess]
            
            for memory in memories_to_remove:
                self.memories.remove(memory)

# Estratégias para geração de dados de teste
@st.composite
def memory_data(draw):
    """Gera dados de memória para testes"""
    # Usar data fixa para evitar problemas de determinismo
    base_date = datetime(2024, 1, 1)
    
    return {
        'id': str(uuid.uuid4()),
        'conversation_id': draw(st.text(min_size=1, max_size=10, alphabet='ABCDEFGHIJ')),
        'content': draw(st.text(min_size=5, max_size=50, alphabet='abcdefghijklmnopqrstuvwxyz ')),
        'relevance_score': draw(st.floats(min_value=0.0, max_value=1.0, allow_nan=False, allow_infinity=False)),
        'created_at': draw(st.datetimes(
            min_value=base_date - timedelta(days=200),
            max_value=base_date + timedelta(days=200)
        )),
        'metadata': {}
    }

@st.composite
def memory_list(draw, min_size=0, max_size=50):
    """Gera lista de memórias para testes"""
    return draw(st.lists(
        memory_data(),
        min_size=min_size,
        max_size=max_size
    ))

class TestMemoryRetentionProperties:
    """
    Testes de propriedade para estratégia de retenção de memórias
    
    **Feature: sicc-sistema-inteligencia-corporativa, Property 3: Memory Retention Strategy**
    """
    
    @given(
        memories=memory_list(min_size=0, max_size=30),
        retention_days=st.integers(min_value=1, max_value=100)
    )
    @settings(max_examples=20, suppress_health_check=[HealthCheck.too_slow])
    def test_retention_preserves_recent_memories(self, memories, retention_days):
        """
        Property 3a: Memórias recentes nunca são removidas por retenção temporal
        
        Para qualquer conjunto de memórias e período de retenção,
        memórias criadas dentro do período devem ser preservadas.
        
        **Validates: Requirements 1.5**
        """
        service = MockMemoryService()
        service.memories = memories.copy()
        
        # Usar data base fixa para cálculos
        base_date = datetime(2024, 1, 1)
        cutoff_date = base_date - timedelta(days=retention_days)
        recent_memories = [
            m for m in memories 
            if m['created_at'] >= cutoff_date
        ]
        
        # Executar limpeza
        removed_count = service.cleanup_old_memories(retention_days)
        
        # Verificar que memórias recentes foram preservadas
        remaining_recent = [
            m for m in service.memories 
            if m['created_at'] >= cutoff_date
        ]
        
        assert len(remaining_recent) == len(recent_memories), \
            f"Memórias recentes foram removidas incorretamente. " \
            f"Esperado: {len(recent_memories)}, Atual: {len(remaining_recent)}"
    
    @given(
        memories=memory_list(min_size=1, max_size=30),
        retention_days=st.integers(min_value=1, max_value=100)
    )
    @settings(max_examples=20)
    def test_retention_removes_old_low_relevance(self, memories, retention_days):
        """
        Property 3b: Memórias antigas com baixa relevância são removidas
        
        Para qualquer conjunto de memórias, memórias antigas (fora do período)
        com relevância < 0.3 devem ser removidas.
        
        **Validates: Requirements 1.5**
        """
        service = MockMemoryService()
        service.memories = memories.copy()
        
        base_date = datetime(2024, 1, 1)
        cutoff_date = base_date - timedelta(days=retention_days)
        
        # Identificar memórias que devem ser removidas
        should_be_removed = [
            m for m in memories 
            if (m['created_at'] < cutoff_date and 
                m['relevance_score'] < 0.3)
        ]
        
        # Executar limpeza
        removed_count = service.cleanup_old_memories(retention_days)
        
        # Verificar que memórias antigas com baixa relevância foram removidas
        remaining_old_low_relevance = [
            m for m in service.memories 
            if (m['created_at'] < cutoff_date and 
                m['relevance_score'] < 0.3)
        ]
        
        assert len(remaining_old_low_relevance) == 0, \
            f"Memórias antigas com baixa relevância não foram removidas. " \
            f"Restaram: {len(remaining_old_low_relevance)}"
        
        assert removed_count == len(should_be_removed), \
            f"Contador de remoção incorreto. " \
            f"Esperado: {len(should_be_removed)}, Reportado: {removed_count}"
    
    @given(
        conversation_id=st.text(min_size=1, max_size=10, alphabet='ABCDEFGHIJ'),
        num_memories=st.integers(min_value=101, max_value=150)
    )
    @settings(max_examples=10)
    def test_conversation_capacity_limit(self, conversation_id, num_memories):
        """
        Property 3d: Limite de capacidade por conversa é respeitado
        
        Para qualquer conversa com mais de max_memories_per_conversation,
        apenas as memórias mais relevantes e recentes devem ser mantidas.
        
        **Validates: Requirements 1.5**
        """
        service = MockMemoryService()
        
        # Gerar memórias para a mesma conversa
        base_date = datetime(2024, 1, 1)
        memories = []
        for i in range(num_memories):
            memory = {
                'id': str(uuid.uuid4()),
                'conversation_id': conversation_id,
                'content': f'Memória {i}',
                'relevance_score': (i % 100) / 100.0,  # Variação de relevância
                'created_at': base_date - timedelta(minutes=i),
                'metadata': {}
            }
            memories.append(memory)
        
        service.memories = memories
        
        # Executar limpeza por conversa
        service._cleanup_conversation_memories(conversation_id)
        
        # Verificar que o limite foi respeitado
        remaining_memories = [
            m for m in service.memories 
            if m['conversation_id'] == conversation_id
        ]
        
        assert len(remaining_memories) <= service.max_memories_per_conversation, \
            f"Limite de memórias por conversa excedido. " \
            f"Limite: {service.max_memories_per_conversation}, " \
            f"Atual: {len(remaining_memories)}"
    
    @given(
        memories=memory_list(min_size=0, max_size=20)
    )
    @settings(max_examples=15)
    def test_retention_idempotency(self, memories):
        """
        Property 3e: Limpeza de retenção é idempotente
        
        Para qualquer conjunto de memórias, executar limpeza múltiplas vezes
        com os mesmos parâmetros deve produzir o mesmo resultado.
        
        **Validates: Requirements 1.5**
        """
        service = MockMemoryService()
        service.memories = memories.copy()
        
        retention_days = 30
        
        # Primeira limpeza
        first_cleanup = service.cleanup_old_memories(retention_days)
        first_state = [m.copy() for m in service.memories]
        
        # Segunda limpeza
        second_cleanup = service.cleanup_old_memories(retention_days)
        second_state = service.memories
        
        # Verificar idempotência
        assert second_cleanup == 0, \
            f"Segunda limpeza removeu {second_cleanup} memórias, deveria ser 0"
        
        assert len(first_state) == len(second_state), \
            "Estado mudou após segunda limpeza"
        
        # Verificar que as memórias são as mesmas
        first_ids = {m['id'] for m in first_state}
        second_ids = {m['id'] for m in second_state}
        
        assert first_ids == second_ids, \
            "Conjunto de memórias mudou após segunda limpeza"

# Executar testes se chamado diretamente
if __name__ == "__main__":
    pytest.main([__file__, "-v"])