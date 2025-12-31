"""
Testes unitários para Memory Service - SICC

Testes isolados que não dependem de conexões externas.
"""

import pytest
import asyncio
import os
import sys
from unittest.mock import Mock, patch, AsyncMock

# Configurar ambiente de teste
os.environ["TESTING"] = "1"

# Adicionar o diretório agent ao path para imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from agent.src.services.sicc.memory_service import MemoryService, Memory

class TestMemoryServiceUnit:
    """Testes unitários para MemoryService"""
    
    @patch('agent.src.services.sicc.memory_service.get_supabase_client')
    def test_memory_service_initialization(self, mock_supabase):
        """Testa inicialização do MemoryService"""
        # Mock do cliente Supabase
        mock_client = Mock()
        mock_supabase.return_value = mock_client
        
        # Criar serviço
        service = MemoryService()
        
        # Verificar inicialização
        assert service.supabase == mock_client
        assert service.embedding_dimensions == 384
        assert service.max_memories_per_conversation == 100
        assert service.retention_days == 90
    
    @patch('agent.src.services.sicc.memory_service.get_supabase_client')
    @pytest.mark.asyncio
    async def test_generate_embedding_validation(self, mock_supabase):
        """Testa validação de entrada para geração de embeddings"""
        # Mock do cliente Supabase
        mock_client = Mock()
        mock_supabase.return_value = mock_client
        
        # Criar serviço
        service = MemoryService()
        
        # Teste com texto vazio
        with pytest.raises(ValueError, match="Texto não pode estar vazio"):
            await service.generate_embedding("")
        
        # Teste com apenas whitespace
        with pytest.raises(ValueError, match="Texto não pode estar vazio"):
            await service.generate_embedding("   \n\t   ")
        
        # Teste com None
        with pytest.raises(ValueError, match="Texto não pode estar vazio"):
            await service.generate_embedding(None)
    
    @patch('agent.src.services.sicc.memory_service.get_supabase_client')
    @patch('agent.src.services.sicc.memory_service.SentenceTransformer')
    @pytest.mark.asyncio
    async def test_generate_embedding_success(self, mock_transformer, mock_supabase):
        """Testa geração bem-sucedida de embedding"""
        # Mock do cliente Supabase
        mock_client = Mock()
        mock_supabase.return_value = mock_client
        
        # Mock do modelo de embedding
        mock_model = Mock()
        mock_embedding = [0.1] * 384  # 384 dimensões
        mock_model.encode.return_value = mock_embedding
        mock_transformer.return_value = mock_model
        
        # Criar serviço
        service = MemoryService()
        
        # Testar geração
        result = await service.generate_embedding("Texto de teste")
        
        # Verificar resultado
        assert len(result) == 384
        assert all(isinstance(dim, (int, float)) for dim in result)
    
    @patch('agent.src.services.sicc.memory_service.get_supabase_client')
    @pytest.mark.asyncio
    async def test_store_memory_validation(self, mock_supabase):
        """Testa validação de entrada para armazenamento de memória"""
        # Mock do cliente Supabase
        mock_client = Mock()
        mock_supabase.return_value = mock_client
        
        # Criar serviço
        service = MemoryService()
        
        # Teste com conversation_id vazio
        with pytest.raises(ValueError, match="conversation_id e content são obrigatórios"):
            await service.store_memory("", "conteúdo")
        
        # Teste com content vazio
        with pytest.raises(ValueError, match="conversation_id e content são obrigatórios"):
            await service.store_memory("conv_123", "")
    
    @patch('agent.src.services.sicc.memory_service.get_supabase_client')
    @pytest.mark.asyncio
    async def test_search_similar_validation(self, mock_supabase):
        """Testa validação de entrada para busca similar"""
        # Mock do cliente Supabase
        mock_client = Mock()
        mock_supabase.return_value = mock_client
        
        # Criar serviço
        service = MemoryService()
        
        # Teste com query vazia
        with pytest.raises(ValueError, match="Query não pode estar vazia"):
            await service.search_similar("")
        
        # Teste com limit inválido
        with pytest.raises(ValueError, match="Limit deve estar entre 1 e 100"):
            await service.search_similar("query", limit=0)
        
        with pytest.raises(ValueError, match="Limit deve estar entre 1 e 100"):
            await service.search_similar("query", limit=101)
    
    def test_memory_class(self):
        """Testa a classe Memory"""
        from datetime import datetime
        
        # Criar memória
        memory = Memory(
            id="mem_123",
            conversation_id="conv_456",
            content="Conteúdo de teste",
            embedding=[0.1, 0.2, 0.3],
            metadata={"tipo": "teste"},
            relevance_score=0.8,
            created_at=datetime.now()
        )
        
        # Testar propriedades
        assert memory.id == "mem_123"
        assert memory.conversation_id == "conv_456"
        assert memory.content == "Conteúdo de teste"
        assert memory.relevance_score == 0.8
        
        # Testar conversão para dict
        memory_dict = memory.to_dict()
        assert memory_dict["id"] == "mem_123"
        assert memory_dict["conversation_id"] == "conv_456"
        assert memory_dict["content"] == "Conteúdo de teste"
        assert memory_dict["relevance_score"] == 0.8
        assert "created_at" in memory_dict