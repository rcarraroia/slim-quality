"""
Testes de propriedade para Memory Service - SICC
Property 20: Standardized Embedding Generation
Validates: Requirements 9.2, 9.3
"""

import pytest
import asyncio
import sys
import os
import numpy as np
from hypothesis import given, strategies as st, settings, HealthCheck
from typing import List

# Adicionar o diretório agent ao path para imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from src.services.sicc.memory_service import MemoryService

class TestMemoryServiceProperties:
    """Testes de propriedade para MemoryService"""
    
    @given(text=st.text(min_size=1, max_size=1000))
    @settings(
        max_examples=100, 
        deadline=30000,
        suppress_health_check=[HealthCheck.function_scoped_fixture]
    )
    def test_embedding_generation_property(self, text):
        """
        Feature: sicc-sistema-inteligencia-corporativa, Property 20: Standardized Embedding Generation
        
        Para qualquer texto válido, o sistema deve gerar embeddings normalizados 
        de exatamente 384 dimensões usando o modelo GTE-small.
        
        Validates: Requirements 9.2, 9.3
        """
        # Filtrar textos que são apenas whitespace
        if not text.strip():
            return
        
        # Criar instância do serviço para cada teste
        memory_service = MemoryService()
        
        # Executar geração de embedding
        embedding = asyncio.run(memory_service.generate_embedding(text))
        
        # Propriedade 1: Deve ter exatamente 384 dimensões
        assert len(embedding) == 384, f"Embedding deve ter 384 dimensões, mas tem {len(embedding)}"
        
        # Propriedade 2: Todos os valores devem ser números válidos
        assert all(isinstance(dim, (int, float)) for dim in embedding), "Todos os valores devem ser numéricos"
        assert all(not np.isnan(dim) and not np.isinf(dim) for dim in embedding), "Não deve conter NaN ou Inf"
        
        # Propriedade 3: Deve estar normalizado (vetor unitário para similaridade coseno)
        embedding_array = np.array(embedding)
        norm = np.linalg.norm(embedding_array)
        assert abs(norm - 1.0) < 1e-6, f"Embedding deve estar normalizado (norma ≈ 1.0), mas norma = {norm}"
        
        # Propriedade 4: Valores devem estar em range razoável [-1, 1]
        assert all(-1.0 <= dim <= 1.0 for dim in embedding), "Valores devem estar entre -1 e 1"
    
    @given(
        text1=st.text(min_size=1, max_size=500),
        text2=st.text(min_size=1, max_size=500)
    )
    @settings(
        max_examples=50, 
        deadline=60000,
        suppress_health_check=[HealthCheck.function_scoped_fixture]
    )
    def test_embedding_consistency_property(self, text1, text2):
        """
        Propriedade: Embeddings devem ser consistentes e determinísticos
        
        Para qualquer par de textos:
        - Textos idênticos devem produzir embeddings idênticos
        - Textos diferentes devem produzir embeddings diferentes (na maioria dos casos)
        """
        # Filtrar textos vazios
        if not text1.strip() or not text2.strip():
            return
        
        # Criar instância do serviço
        memory_service = MemoryService()
        
        # Gerar embeddings
        embedding1_first = asyncio.run(memory_service.generate_embedding(text1))
        embedding1_second = asyncio.run(memory_service.generate_embedding(text1))
        embedding2 = asyncio.run(memory_service.generate_embedding(text2))
        
        # Propriedade 1: Consistência - mesmo texto deve produzir mesmo embedding
        assert embedding1_first == embedding1_second, "Mesmo texto deve produzir embedding idêntico"
        
        # Propriedade 2: Discriminação - textos diferentes devem produzir embeddings diferentes
        # (exceto em casos raros de colisão)
        if text1.strip() != text2.strip():
            similarity = np.dot(embedding1_first, embedding2)
            # Não deve ser idêntico (similaridade < 0.99)
            assert similarity < 0.99, f"Textos diferentes não devem ter embeddings quase idênticos (sim={similarity})"
    
    @given(
        texts=st.lists(
            st.text(min_size=1, max_size=200), 
            min_size=2, 
            max_size=10,
            unique=True
        )
    )
    @settings(
        max_examples=20, 
        deadline=120000,
        suppress_health_check=[HealthCheck.function_scoped_fixture]
    )
    def test_embedding_batch_property(self, texts):
        """
        Propriedade: Geração em lote deve manter as mesmas propriedades
        
        Para qualquer lista de textos únicos, todos os embeddings gerados
        devem manter as propriedades de dimensionalidade e normalização.
        """
        # Filtrar textos vazios
        valid_texts = [text for text in texts if text.strip()]
        if len(valid_texts) < 2:
            return
        
        # Criar instância do serviço
        memory_service = MemoryService()
        
        # Gerar embeddings para todos os textos
        embeddings = []
        for text in valid_texts:
            embedding = asyncio.run(memory_service.generate_embedding(text))
            embeddings.append(embedding)
        
        # Propriedade 1: Todos devem ter 384 dimensões
        assert all(len(emb) == 384 for emb in embeddings), "Todos embeddings devem ter 384 dimensões"
        
        # Propriedade 2: Todos devem estar normalizados
        for i, embedding in enumerate(embeddings):
            norm = np.linalg.norm(embedding)
            assert abs(norm - 1.0) < 1e-6, f"Embedding {i} não está normalizado (norma = {norm})"
        
        # Propriedade 3: Embeddings devem ser distintos (não idênticos)
        for i in range(len(embeddings)):
            for j in range(i + 1, len(embeddings)):
                similarity = np.dot(embeddings[i], embeddings[j])
                assert similarity < 0.99, f"Embeddings {i} e {j} são muito similares (sim={similarity})"
    
    def test_embedding_error_handling_property(self):
        """
        Propriedade: Tratamento de erros deve ser consistente
        
        Para entradas inválidas, o sistema deve sempre levantar ValueError
        """
        memory_service = MemoryService()
        
        # Teste com string vazia
        with pytest.raises(ValueError, match="Texto não pode estar vazio"):
            asyncio.run(memory_service.generate_embedding(""))
        
        # Teste com apenas whitespace
        with pytest.raises(ValueError, match="Texto não pode estar vazio"):
            asyncio.run(memory_service.generate_embedding("   \n\t   "))
        
        # Teste com None (se passado como string)
        with pytest.raises(ValueError, match="Texto não pode estar vazio"):
            asyncio.run(memory_service.generate_embedding(None))
    
    @given(text=st.text(min_size=1, max_size=100))
    @settings(
        max_examples=30, 
        deadline=60000,
        suppress_health_check=[HealthCheck.function_scoped_fixture]
    )
    def test_embedding_similarity_property(self, text):
        """
        Propriedade: Similaridade deve ser reflexiva e simétrica
        
        Para qualquer texto válido:
        - Similaridade consigo mesmo deve ser máxima (≈ 1.0)
        - Similaridade deve ser simétrica: sim(A,B) = sim(B,A)
        """
        if not text.strip():
            return
        
        # Criar instância do serviço
        memory_service = MemoryService()
        
        # Gerar embedding
        embedding = asyncio.run(memory_service.generate_embedding(text))
        
        # Propriedade 1: Similaridade reflexiva (consigo mesmo)
        self_similarity = np.dot(embedding, embedding)
        assert abs(self_similarity - 1.0) < 1e-6, f"Similaridade consigo mesmo deve ser 1.0, mas é {self_similarity}"
        
        # Propriedade 2: Teste com texto ligeiramente modificado
        modified_text = text + " extra"
        if modified_text.strip() != text.strip():
            modified_embedding = asyncio.run(memory_service.generate_embedding(modified_text))
            
            # Similaridade deve ser simétrica
            sim_ab = np.dot(embedding, modified_embedding)
            sim_ba = np.dot(modified_embedding, embedding)
            
            assert abs(sim_ab - sim_ba) < 1e-10, f"Similaridade deve ser simétrica: {sim_ab} != {sim_ba}"
            
            # Similaridade deve ser menor que 1.0 (textos diferentes)
            assert sim_ab < 0.99, f"Textos diferentes devem ter similaridade < 0.99, mas é {sim_ab}"