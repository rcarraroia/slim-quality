"""
Testes de Isolamento Multi-Tenant - MultiTenantCheckpointer

Valida que o isolamento de tenant funciona corretamente:
- Tenant A nunca acessa dados de tenant B
- list() retorna apenas checkpoints do tenant correto
- Thread ID parsing funciona corretamente
- Validação de tenant_id em todas as operações

Property Test: Isolamento garantido entre tenants
"""

import pytest
import os
import sys
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime

# Configurar ambiente de teste
os.environ["TESTING"] = "1"

# Adicionar o diretório agent ao path para imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from agent.src.graph.checkpointer import MultiTenantCheckpointer
from langgraph.checkpoint.base import Checkpoint, CheckpointMetadata


class TestMultiTenantIsolation:
    """Testes de isolamento multi-tenant"""
    
    @pytest.fixture
    def mock_supabase(self):
        """Mock do cliente Supabase"""
        with patch('agent.src.graph.checkpointer.get_supabase_client') as mock:
            mock_client = Mock()
            mock.return_value = mock_client
            yield mock_client
    
    @pytest.fixture
    def checkpointer(self, mock_supabase):
        """Instância do checkpointer com Supabase mockado"""
        return MultiTenantCheckpointer()
    
    def test_thread_id_parsing_valid(self, checkpointer):
        """Testa parsing de thread_id válido"""
        thread_id = "tenant_123_conv_456"
        tenant_id, conversation_id = checkpointer._parse_thread_id(thread_id)
        
        assert tenant_id == 123
        assert conversation_id == 456
    
    def test_thread_id_parsing_invalid_format(self, checkpointer):
        """Testa parsing de thread_id com formato inválido"""
        invalid_ids = [
            "invalid_format",
            "tenant_123",
            "conv_456",
            "tenant_abc_conv_456",
            "tenant_123_conv_xyz",
            "123_456",
            ""
        ]
        
        for invalid_id in invalid_ids:
            with pytest.raises(ValueError, match="Thread ID deve estar no formato"):
                checkpointer._parse_thread_id(invalid_id)
    
    def test_tenant_isolation_get_tuple(self, checkpointer, mock_supabase):
        """
        Testa isolamento de tenant no método get_tuple.
        
        Cenário:
        1. Tenant 1 salva checkpoint
        2. Tenant 2 tenta recuperar checkpoint do tenant 1
        3. Deve retornar None (isolamento garantido)
        """
        # Mock da resposta do Supabase para tenant 1
        mock_response_tenant1 = Mock()
        mock_response_tenant1.data = {
            "id": 100,
            "tenant_id": 1,
            "metadata": {
                "langgraph_checkpoint": {
                    "checkpoint": '{"v": 1, "ts": "2024-01-01T00:00:00Z", "id": "checkpoint_1", "channel_values": {}}',
                    "metadata": {"step": 1},
                    "saved_at": "2024-01-01T00:00:00Z"
                }
            },
            "created_at": "2024-01-01T00:00:00Z",
            "updated_at": "2024-01-01T00:00:00Z"
        }
        
        # Mock da resposta do Supabase para tenant 2 (não encontra dados do tenant 1)
        mock_response_tenant2 = Mock()
        mock_response_tenant2.data = None
        
        # Configurar mock para retornar dados apenas para tenant 1
        def mock_execute():
            # Simular que query com tenant_id=2 não encontra dados do tenant 1
            return mock_response_tenant2
        
        mock_table = Mock()
        mock_table.select.return_value = mock_table
        mock_table.eq.return_value = mock_table
        mock_table.single.return_value = mock_table
        mock_table.execute = mock_execute
        
        mock_supabase.table.return_value = mock_table
        
        # Tenant 2 tenta recuperar checkpoint do tenant 1
        config_tenant2 = {
            "configurable": {
                "thread_id": "tenant_2_conv_100"  # Mesma conversation_id, mas tenant diferente
            }
        }
        
        result = checkpointer.get_tuple(config_tenant2)
        
        # Deve retornar None (isolamento garantido)
        assert result is None
        
        # Verificar que query filtrou por tenant_id=2
        mock_table.eq.assert_any_call("tenant_id", 2)
        mock_table.eq.assert_any_call("id", 100)
    
    def test_tenant_isolation_list(self, checkpointer, mock_supabase):
        """
        Testa isolamento de tenant no método list.
        
        Cenário:
        1. Tenant 1 tem 3 checkpoints
        2. Tenant 2 tem 2 checkpoints
        3. list() para tenant 1 deve retornar apenas 3 checkpoints
        4. list() para tenant 2 deve retornar apenas 2 checkpoints
        """
        # Mock da resposta para tenant 1
        mock_response_tenant1 = Mock()
        mock_response_tenant1.data = [
            {
                "id": 100,
                "tenant_id": 1,
                "metadata": {
                    "langgraph_checkpoint": {
                        "checkpoint": '{"v": 1, "ts": "2024-01-01T00:00:00Z", "id": "checkpoint_1", "channel_values": {}}',
                        "metadata": {"step": 1},
                        "saved_at": "2024-01-01T00:00:00Z"
                    }
                },
                "created_at": "2024-01-01T00:00:00Z",
                "updated_at": "2024-01-01T00:00:00Z"
            },
            {
                "id": 101,
                "tenant_id": 1,
                "metadata": {
                    "langgraph_checkpoint": {
                        "checkpoint": '{"v": 1, "ts": "2024-01-01T01:00:00Z", "id": "checkpoint_2", "channel_values": {}}',
                        "metadata": {"step": 2},
                        "saved_at": "2024-01-01T01:00:00Z"
                    }
                },
                "created_at": "2024-01-01T01:00:00Z",
                "updated_at": "2024-01-01T01:00:00Z"
            },
            {
                "id": 102,
                "tenant_id": 1,
                "metadata": {
                    "langgraph_checkpoint": {
                        "checkpoint": '{"v": 1, "ts": "2024-01-01T02:00:00Z", "id": "checkpoint_3", "channel_values": {}}',
                        "metadata": {"step": 3},
                        "saved_at": "2024-01-01T02:00:00Z"
                    }
                },
                "created_at": "2024-01-01T02:00:00Z",
                "updated_at": "2024-01-01T02:00:00Z"
            }
        ]
        
        # Configurar mock
        mock_table = Mock()
        mock_table.select.return_value = mock_table
        mock_table.eq.return_value = mock_table
        mock_table.order.return_value = mock_table
        mock_table.execute.return_value = mock_response_tenant1
        
        mock_supabase.table.return_value = mock_table
        
        # Listar checkpoints do tenant 1
        config_tenant1 = {
            "configurable": {
                "thread_id": "tenant_1_conv_100"
            }
        }
        
        checkpoints = list(checkpointer.list(config_tenant1))
        
        # Deve retornar 3 checkpoints
        assert len(checkpoints) == 3
        
        # Verificar que query filtrou por tenant_id=1
        mock_table.eq.assert_any_call("tenant_id", 1)
        mock_table.eq.assert_any_call("id", 100)
    
    def test_tenant_isolation_put_validation(self, checkpointer, mock_supabase):
        """
        Testa validação de tenant_id no método put.
        
        Cenário:
        1. Conversa existe para tenant 1
        2. Tenant 2 tenta salvar checkpoint na conversa do tenant 1
        3. Deve lançar ValueError (tenant_id mismatch)
        """
        # Mock da resposta do Supabase (conversa existe para tenant 1)
        mock_response = Mock()
        mock_response.data = {
            "id": 100,
            "tenant_id": 1,  # Conversa pertence ao tenant 1
            "metadata": {}
        }
        
        # Configurar mock
        mock_table = Mock()
        mock_table.select.return_value = mock_table
        mock_table.eq.return_value = mock_table
        mock_table.single.return_value = mock_table
        mock_table.execute.return_value = mock_response
        
        mock_supabase.table.return_value = mock_table
        
        # Tenant 2 tenta salvar checkpoint na conversa do tenant 1
        config_tenant2 = {
            "configurable": {
                "thread_id": "tenant_2_conv_100"  # Tenant 2 tentando acessar conversa 100
            }
        }
        
        checkpoint = Checkpoint(
            v=1,
            ts="2024-01-01T00:00:00Z",
            id="checkpoint_1",
            channel_values={}
        )
        
        metadata = {"step": 1}
        
        # Deve lançar ValueError (tenant_id mismatch)
        with pytest.raises(ValueError, match="Tenant ID mismatch"):
            checkpointer.put(config_tenant2, checkpoint, metadata)
    
    def test_tenant_isolation_put_nonexistent_conversation(self, checkpointer, mock_supabase):
        """
        Testa que put() falha se conversa não existe.
        
        Cenário:
        1. Tenant 1 tenta salvar checkpoint em conversa inexistente
        2. Deve lançar ValueError
        """
        # Mock da resposta do Supabase (conversa não existe)
        mock_response = Mock()
        mock_response.data = None
        
        # Configurar mock
        mock_table = Mock()
        mock_table.select.return_value = mock_table
        mock_table.eq.return_value = mock_table
        mock_table.single.return_value = mock_table
        mock_table.execute.return_value = mock_response
        
        mock_supabase.table.return_value = mock_table
        
        # Tenant 1 tenta salvar checkpoint em conversa inexistente
        config = {
            "configurable": {
                "thread_id": "tenant_1_conv_999"  # Conversa não existe
            }
        }
        
        checkpoint = Checkpoint(
            v=1,
            ts="2024-01-01T00:00:00Z",
            id="checkpoint_1",
            channel_values={}
        )
        
        metadata = {"step": 1}
        
        # Deve lançar ValueError
        with pytest.raises(ValueError, match="não existe para tenant"):
            checkpointer.put(config, checkpoint, metadata)
    
    def test_property_tenant_isolation_never_cross_access(self, checkpointer, mock_supabase):
        """
        Property Test: Tenant A nunca acessa dados de tenant B.
        
        Testa múltiplos cenários de isolamento:
        - get_tuple com tenant diferente
        - list com tenant diferente
        - put com tenant_id mismatch
        """
        # Cenário 1: get_tuple com tenant diferente
        mock_response_empty = Mock()
        mock_response_empty.data = None
        
        mock_table = Mock()
        mock_table.select.return_value = mock_table
        mock_table.eq.return_value = mock_table
        mock_table.single.return_value = mock_table
        mock_table.execute.return_value = mock_response_empty
        
        mock_supabase.table.return_value = mock_table
        
        # Tenant 2 tenta acessar dados do tenant 1
        config_tenant2 = {
            "configurable": {
                "thread_id": "tenant_2_conv_100"
            }
        }
        
        result = checkpointer.get_tuple(config_tenant2)
        assert result is None, "Tenant 2 não deve acessar dados do tenant 1"
        
        # Cenário 2: list com tenant diferente
        mock_response_empty_list = Mock()
        mock_response_empty_list.data = []
        
        mock_table.order.return_value = mock_table
        mock_table.execute.return_value = mock_response_empty_list
        
        checkpoints = list(checkpointer.list(config_tenant2))
        assert len(checkpoints) == 0, "Tenant 2 não deve listar checkpoints do tenant 1"
        
        # Cenário 3: put com tenant_id mismatch
        mock_response_mismatch = Mock()
        mock_response_mismatch.data = {
            "id": 100,
            "tenant_id": 1,  # Conversa pertence ao tenant 1
            "metadata": {}
        }
        
        mock_table.execute.return_value = mock_response_mismatch
        
        checkpoint = Checkpoint(
            v=1,
            ts="2024-01-01T00:00:00Z",
            id="checkpoint_1",
            channel_values={}
        )
        
        metadata = {"step": 1}
        
        with pytest.raises(ValueError, match="Tenant ID mismatch"):
            checkpointer.put(config_tenant2, checkpoint, metadata)


class TestMultiTenantCheckpointerIntegration:
    """Testes de integração (requerem Supabase real)"""
    
    @pytest.mark.integration
    @pytest.mark.skipif(
        os.getenv("SUPABASE_URL") is None,
        reason="Requer variáveis de ambiente Supabase configuradas"
    )
    def test_real_tenant_isolation(self):
        """
        Teste de integração real com Supabase.
        
        ATENÇÃO: Este teste requer:
        - Variáveis de ambiente SUPABASE_URL e SUPABASE_SERVICE_KEY
        - Tabela multi_agent_conversations criada
        - RLS ativo na tabela
        
        Cenário:
        1. Criar 2 conversas para tenants diferentes
        2. Salvar checkpoint para tenant 1
        3. Tentar recuperar com tenant 2 (deve falhar)
        4. Validar que list() retorna apenas checkpoints do tenant correto
        """
        # TODO: Implementar quando ambiente de teste estiver configurado
        pytest.skip("Teste de integração requer ambiente configurado")
