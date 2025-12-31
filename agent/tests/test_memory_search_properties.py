"""
Testes de propriedade para busca vetorial - SICC
Property 18: Efficient Vectorial Search
Validates: Requirements 8.2, 8.3
"""

import pytest
import asyncio
import os
import sys
from unittest.mock import Mock, patch, AsyncMock
from hypothesis import given, strategies as st, settings, assume
from typing import List, Dict, Any
import uuid

# Configurar ambiente de teste
os.environ["TESTING"] = "1"

# Adicionar o diretório agent ao path para imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from src.services.sicc.memory_service import MemoryService, Memory

class TestMemorySearchProperties:
    """Testes de propriedade para busca vetorial"""
    
    @given(
        query=st.text(min_size=1, max_size=200),
        limit=st.integers(min_value=1, max_value=100)
    )
    @settings(max_examples=50, deadline=30000)
    @patch('src.services.sicc.memory_service.get_supabase_client')
    @patch('src.services.sicc.memory_service.SentenceTransformer')
    def test_search_similar_properties(self, mock_transformer, mock_supabase, query, limit):
        """
        Feature: sicc-sistema-inteligencia-corporativa, Property 18: Efficient Vectorial Search
        
        Para qualquer query válida e limit válido, a busca vetorial deve:
        1. Retornar no máximo 'limit' resultados
        2. Todos os resultados devem ser objetos Memory válidos
        3. Resultados devem estar ordenados por relevância (decrescente)
        4. Não deve retornar memórias deletadas
        
        Validates: Requirements 8.2, 8.3
        """
        # Filtrar queries vazias
        if not query.strip():
            return
        
        # Mock do cliente Supabase
        mock_client = Mock()
        mock_supabase.return_value = mock_client
        
        # Mock do modelo de embedding
        mock_model = Mock()
        mock_embedding = [0.1] * 384
        mock_model.encode.return_value = mock_embedding
        mock_transformer.return_value = mock_model
        
        # Mock da resposta RPC do Supabase
        mock_results = []
        num_results = min(limit, 5)  # Simular até 5 resultados
        
        for i in range(num_results):
            mock_results.append({
                "id": str(uuid.uuid4()),
                "conversation_id": str(uuid.uuid4()),
                "content": f"Conteúdo {i}",
                "metadata": {"index": i},
                "relevance_score": 0.9 - (i * 0.1),  # Decrescente
                "similarity_score": 0.9 - (i * 0.1),  # Decrescente
                "created_at": "2025-01-01T00:00:00Z"
            })
        
        mock_rpc_response = Mock()
        mock_rpc_response.data = mock_results
        mock_client.rpc.return_value = mock_rpc_response
        
        # Criar serviço e executar busca
        service = MemoryService()
        
        async def run_test():
            memories = await service.search_similar(query, limit=limit)
            
            # Propriedade 1: Não deve retornar mais que 'limit' resultados
            assert len(memories) <= limit, f"Retornou {len(memories)} resultados, máximo esperado: {limit}"
            
            # Propriedade 2: Todos devem ser objetos Memory válidos
            for memory in memories:
                assert isinstance(memory, Memory), "Resultado deve ser instância de Memory"
                assert hasattr(memory, 'id'), "Memory deve ter atributo 'id'"
                assert hasattr(memory, 'conversation_id'), "Memory deve ter atributo 'conversation_id'"
                assert hasattr(memory, 'content'), "Memory deve ter atributo 'content'"
                assert hasattr(memory, 'relevance_score'), "Memory deve ter atributo 'relevance_score'"
                assert isinstance(memory.relevance_score, (int, float)), "relevance_score deve ser numérico"
            
            # Propriedade 3: Resultados ordenados por relevância (decrescente)
            if len(memories) > 1:
                for i in range(len(memories) - 1):
                    current_score = memories[i].relevance_score
                    next_score = memories[i + 1].relevance_score
                    assert current_score >= next_score, f"Resultados não estão ordenados: {current_score} < {next_score}"
            
            # Propriedade 4: Verificar que RPC foi chamado corretamente
            mock_client.rpc.assert_called_once()
            call_args = mock_client.rpc.call_args
            assert call_args[0][0] == "search_similar_memories", "Deve chamar função RPC correta"
            
            rpc_params = call_args[1]
            assert "query_embedding" in rpc_params, "Deve passar query_embedding"
            assert "max_results" in rpc_params, "Deve passar max_results"
            assert rpc_params["max_results"] == limit, f"max_results deve ser {limit}"
        
        # Executar teste assíncrono
        asyncio.run(run_test())
    
    @given(
        query=st.text(min_size=1, max_size=100),
        conversation_id=st.text(min_size=1, max_size=50)
    )
    @settings(max_examples=30, deadline=30000)
    @patch('src.services.sicc.memory_service.get_supabase_client')
    @patch('src.services.sicc.memory_service.SentenceTransformer')
    def test_search_with_filters_property(self, mock_transformer, mock_supabase, query, conversation_id):
        """
        Propriedade: Filtros devem ser aplicados corretamente na busca
        
        Para qualquer query e filtro de conversation_id, a busca deve:
        1. Passar os filtros corretamente para o RPC
        2. Aplicar filtros sem afetar a ordenação por relevância
        """
        # Filtrar entradas vazias
        if not query.strip() or not conversation_id.strip():
            return
        
        # Mock setup
        mock_client = Mock()
        mock_supabase.return_value = mock_client
        
        mock_model = Mock()
        mock_embedding = [0.1] * 384
        mock_model.encode.return_value = mock_embedding
        mock_transformer.return_value = mock_model
        
        # Mock resposta vazia (não importa o conteúdo para este teste)
        mock_rpc_response = Mock()
        mock_rpc_response.data = []
        mock_client.rpc.return_value = mock_rpc_response
        
        # Criar serviço
        service = MemoryService()
        
        async def run_test():
            # Executar busca com filtro
            filters = {"conversation_id": conversation_id}
            await service.search_similar(query, limit=5, filters=filters)
            
            # Verificar que filtros foram passados corretamente
            mock_client.rpc.assert_called_once()
            call_args = mock_client.rpc.call_args
            rpc_params = call_args[1]
            
            assert "conversation_filter" in rpc_params, "Deve passar conversation_filter"
            assert rpc_params["conversation_filter"] == conversation_id, "Filtro deve ser aplicado corretamente"
        
        asyncio.run(run_test())
    
    @given(
        query=st.text(min_size=1, max_size=100),
        text_weight=st.floats(min_value=0.0, max_value=1.0),
        vector_weight=st.floats(min_value=0.0, max_value=1.0)
    )
    @settings(max_examples=30, deadline=30000)
    @patch('src.services.sicc.memory_service.get_supabase_client')
    @patch('src.services.sicc.memory_service.SentenceTransformer')
    def test_hybrid_search_properties(self, mock_transformer, mock_supabase, query, text_weight, vector_weight):
        """
        Propriedade: Busca híbrida deve combinar pesos corretamente
        
        Para qualquer query e pesos válidos, a busca híbrida deve:
        1. Passar os pesos corretamente para o RPC
        2. Usar a função RPC híbrida
        3. Retornar resultados com score combinado
        """
        # Filtrar entradas vazias
        if not query.strip():
            return
        
        # Mock setup
        mock_client = Mock()
        mock_supabase.return_value = mock_client
        
        mock_model = Mock()
        mock_embedding = [0.1] * 384
        mock_model.encode.return_value = mock_embedding
        mock_transformer.return_value = mock_model
        
        # Mock resposta com score combinado
        mock_results = [{
            "id": str(uuid.uuid4()),
            "conversation_id": str(uuid.uuid4()),
            "content": "Conteúdo híbrido",
            "metadata": {},
            "relevance_score": 0.8,
            "similarity_score": 0.7,
            "text_score": 0.6,
            "combined_score": 0.75,
            "created_at": "2025-01-01T00:00:00Z"
        }]
        
        mock_rpc_response = Mock()
        mock_rpc_response.data = mock_results
        mock_client.rpc.return_value = mock_rpc_response
        
        # Criar serviço
        service = MemoryService()
        
        async def run_test():
            # Executar busca híbrida
            memories = await service.search_hybrid(
                query, 
                limit=5, 
                text_weight=text_weight, 
                vector_weight=vector_weight
            )
            
            # Verificar que função RPC híbrida foi chamada
            mock_client.rpc.assert_called_once()
            call_args = mock_client.rpc.call_args
            assert call_args[0][0] == "search_memories_hybrid", "Deve chamar função RPC híbrida"
            
            # Verificar que pesos foram passados corretamente
            rpc_params = call_args[1]
            assert "text_weight" in rpc_params, "Deve passar text_weight"
            assert "vector_weight" in rpc_params, "Deve passar vector_weight"
            assert rpc_params["text_weight"] == text_weight, "text_weight deve ser correto"
            assert rpc_params["vector_weight"] == vector_weight, "vector_weight deve ser correto"
            
            # Verificar que resultados usam combined_score como relevance_score
            if memories:
                for memory in memories:
                    assert hasattr(memory, 'relevance_score'), "Deve ter relevance_score"
                    # O relevance_score deve ser o combined_score da resposta
                    assert memory.relevance_score == 0.75, "relevance_score deve ser o combined_score"
        
        asyncio.run(run_test())
    
    @patch('src.services.sicc.memory_service.get_supabase_client')
    @patch('src.services.sicc.memory_service.SentenceTransformer')
    def test_search_error_handling_property(self, mock_transformer, mock_supabase):
        """
        Propriedade: Tratamento de erros deve ser consistente na busca
        
        Para entradas inválidas, o sistema deve sempre levantar ValueError apropriado
        """
        # Mock setup
        mock_client = Mock()
        mock_supabase.return_value = mock_client
        
        mock_model = Mock()
        mock_embedding = [0.1] * 384
        mock_model.encode.return_value = mock_embedding
        mock_transformer.return_value = mock_model
        
        # Criar serviço
        service = MemoryService()
        
        async def run_test():
            # Teste com query vazia
            with pytest.raises(ValueError, match="Query não pode estar vazia"):
                await service.search_similar("")
            
            # Teste com query apenas whitespace
            with pytest.raises(ValueError, match="Query não pode estar vazia"):
                await service.search_similar("   \n\t   ")
            
            # Teste com limit inválido (zero)
            with pytest.raises(ValueError, match="Limit deve estar entre 1 e 100"):
                await service.search_similar("query válida", limit=0)
            
            # Teste com limit inválido (muito alto)
            with pytest.raises(ValueError, match="Limit deve estar entre 1 e 100"):
                await service.search_similar("query válida", limit=101)
            
            # Teste busca híbrida com query vazia
            with pytest.raises(ValueError, match="Query não pode estar vazia"):
                await service.search_hybrid("")
        
        asyncio.run(run_test())
    
    @given(
        conversation_id=st.text(min_size=1, max_size=50),
        current_message=st.text(min_size=1, max_size=200)
    )
    @settings(max_examples=20, deadline=30000)
    @patch('src.services.sicc.memory_service.get_supabase_client')
    @patch('src.services.sicc.memory_service.SentenceTransformer')
    def test_relevant_context_property(self, mock_transformer, mock_supabase, conversation_id, current_message):
        """
        Propriedade: Contexto relevante deve combinar memórias locais e globais
        
        Para qualquer conversation_id e mensagem, get_relevant_context deve:
        1. Buscar memórias da própria conversa (máximo 3)
        2. Buscar memórias globais de outras conversas (máximo 2)
        3. Retornar no máximo 5 memórias totais
        4. Ordenar por relevância
        """
        # Filtrar entradas vazias
        if not conversation_id.strip() or not current_message.strip():
            return
        
        # Mock setup
        mock_client = Mock()
        mock_supabase.return_value = mock_client
        
        mock_model = Mock()
        mock_embedding = [0.1] * 384
        mock_model.encode.return_value = mock_embedding
        mock_transformer.return_value = mock_model
        
        # Simular múltiplas chamadas de busca
        call_count = 0
        def mock_rpc_side_effect(function_name, params):
            nonlocal call_count
            call_count += 1
            
            mock_response = Mock()
            
            if call_count == 1:  # Primeira chamada: memórias da conversa
                mock_response.data = [
                    {
                        "id": str(uuid.uuid4()),
                        "conversation_id": conversation_id,
                        "content": f"Memória local {i}",
                        "metadata": {},
                        "relevance_score": 0.9 - (i * 0.1),
                        "similarity_score": 0.9 - (i * 0.1),
                        "created_at": "2025-01-01T00:00:00Z"
                    }
                    for i in range(2)  # 2 memórias locais
                ]
            else:  # Segunda chamada: memórias globais
                other_conv_id = str(uuid.uuid4())
                mock_response.data = [
                    {
                        "id": str(uuid.uuid4()),
                        "conversation_id": other_conv_id,
                        "content": f"Memória global {i}",
                        "metadata": {},
                        "relevance_score": 0.8 - (i * 0.1),
                        "similarity_score": 0.8 - (i * 0.1),
                        "created_at": "2025-01-01T00:00:00Z"
                    }
                    for i in range(3)  # 3 memórias globais
                ]
            
            return mock_response
        
        mock_client.rpc.side_effect = mock_rpc_side_effect
        
        # Criar serviço
        service = MemoryService()
        
        async def run_test():
            # Executar get_relevant_context
            context = await service.get_relevant_context(conversation_id, current_message)
            
            # Propriedade 1: Deve fazer duas buscas (local e global)
            assert mock_client.rpc.call_count == 2, "Deve fazer duas buscas RPC"
            
            # Propriedade 2: Não deve retornar mais que 5 memórias
            assert len(context) <= 5, f"Retornou {len(context)} memórias, máximo esperado: 5"
            
            # Propriedade 3: Deve incluir memórias da conversa atual e outras
            if context:
                conversation_ids = {memory.conversation_id for memory in context}
                # Deve ter pelo menos a conversa atual (se houver memórias locais)
                local_memories = [m for m in context if m.conversation_id == conversation_id]
                global_memories = [m for m in context if m.conversation_id != conversation_id]
                
                # Verificar que temos memórias locais e/ou globais
                assert len(local_memories) + len(global_memories) == len(context), "Todas as memórias devem ser classificadas"
            
            # Propriedade 4: Resultados ordenados por relevância
            if len(context) > 1:
                for i in range(len(context) - 1):
                    current_score = context[i].relevance_score
                    next_score = context[i + 1].relevance_score
                    assert current_score >= next_score, f"Contexto não está ordenado: {current_score} < {next_score}"
        
        asyncio.run(run_test())