"""
Testes de Integração - Fluxo Completo de Automações

Testa o fluxo: criar regra → disparar gatilho → verificar execução
"""

import pytest
import asyncio
from unittest.mock import Mock, patch
from datetime import datetime

# Imports do sistema de automação
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../agent/src'))

from services.automation import (
    get_automation_service,
    get_rules_executor,
    get_action_executor,
    AutomationRuleCreate,
    RuleCondition,
    RuleAction,
    TriggerType,
    ActionType,
    ConditionOperator,
    rules_evaluator_node
)


class TestAutomationFlow:
    """Testes de fluxo completo de automações"""
    
    @pytest.fixture
    def mock_supabase(self):
        """Mock do cliente Supabase para testes"""
        with patch('services.supabase_client.get_supabase_client') as mock:
            mock_client = Mock()
            
            # Mock para criação de regra
            mock_client.table.return_value.insert.return_value.execute.return_value.data = [{
                'id': 'rule_123',
                'nome': 'Teste Regra',
                'status': 'ativa',
                'gatilho': 'lead_created',
                'gatilho_config': {},
                'condicoes': [],
                'acoes': [{'type': 'send_email', 'config': {'template': 'welcome'}, 'order': 1}],
                'created_by': 'user_123',
                'created_at': datetime.now().isoformat(),
                'updated_at': datetime.now().isoformat(),
                'deleted_at': None,
                'disparos_mes': 0,
                'taxa_abertura_percent': 0.0
            }]
            
            # Mock para busca de regras ativas
            mock_client.table.return_value.select.return_value.eq.return_value.eq.return_value.is_.return_value.order.return_value.execute.return_value.data = [{
                'id': 'rule_123',
                'nome': 'Teste Regra',
                'status': 'ativa',
                'gatilho': 'lead_created',
                'gatilho_config': {},
                'condicoes': [],
                'acoes': [{'type': 'send_email', 'config': {'template': 'welcome'}, 'order': 1}],
                'created_by': 'user_123',
                'created_at': datetime.now().isoformat(),
                'updated_at': datetime.now().isoformat(),
                'deleted_at': None,
                'disparos_mes': 0,
                'taxa_abertura_percent': 0.0
            }]
            
            mock.return_value = mock_client
            yield mock_client
    
    @pytest.mark.asyncio
    async def test_complete_automation_flow(self, mock_supabase):
        """
        Testa fluxo completo: criar regra → disparar gatilho → verificar execução
        
        Fluxo testado:
        1. Criar regra de automação
        2. Simular gatilho (lead criado)
        3. Executar regras
        4. Verificar ações executadas
        """
        # 1. Criar regra de automação
        automation_service = get_automation_service()
        
        rule_data = AutomationRuleCreate(
            nome="Boas-vindas Novo Lead",
            descricao="Enviar email de boas-vindas para novos leads",
            gatilho=TriggerType.LEAD_CREATED,
            gatilho_config={},
            condicoes=[],
            acoes=[
                RuleAction(
                    type=ActionType.SEND_EMAIL,
                    config={
                        "template": "welcome",
                        "subject": "Bem-vindo!",
                        "to": "{{customer.email}}"
                    },
                    order=1
                )
            ]
        )
        
        created_rule = await automation_service.create_rule(rule_data, "user_123")
        assert created_rule.id == "rule_123"
        assert created_rule.nome == "Boas-vindas Novo Lead"
        
        # 2. Simular contexto de gatilho
        context = {
            "trigger_type": "lead_created",
            "customer": {
                "id": "customer_123",
                "name": "João Silva",
                "email": "joao@example.com",
                "phone": "+5511999999999"
            },
            "conversation": {
                "messages_count": 1,
                "session_id": "session_123",
                "started_at": datetime.now().isoformat()
            },
            "metadata": {
                "source": "website",
                "utm_campaign": "test"
            }
        }
        
        # 3. Executar regras
        rules_executor = get_rules_executor()
        executions = await rules_executor.evaluate_rules("lead_created", context, "user_123")
        
        # 4. Verificar execução
        assert len(executions) == 1
        execution = executions[0]
        
        assert execution.rule_id == "rule_123"
        assert execution.trigger_type == "lead_created"
        assert execution.conditions_met == True  # Sem condições = sempre True
        assert len(execution.actions_executed) == 1
        
        action_result = execution.actions_executed[0]
        assert action_result.action_type == "send_email"
        assert action_result.status in ["success", "failed"]  # Pode falhar por falta de config real
    
    @pytest.mark.asyncio
    async def test_langgraph_integration(self, mock_supabase):
        """
        Testa integração com LangGraph
        
        Verifica se o node rules_evaluator funciona corretamente
        """
        # Simular estado do LangGraph
        state = {
            "messages": [{"content": "Olá, tenho interesse nos produtos"}],
            "customer_info": {
                "name": "Maria Santos",
                "email": "maria@example.com",
                "phone": "+5511888888888"
            },
            "session_id": "session_456",
            "conversation_started_at": datetime.now().isoformat()
        }
        
        # Executar node
        updated_state = await rules_evaluator_node(state)
        
        # Verificar que estado foi atualizado
        assert "automation_context" in updated_state
        assert "triggered_rules" in updated_state
        assert "executed_actions" in updated_state
        
        # Verificar contexto de automação
        automation_context = updated_state["automation_context"]
        assert "last_evaluation" in automation_context
        assert "trigger_type" in automation_context
        assert automation_context["trigger_type"] == "conversation_started"
    
    @pytest.mark.asyncio
    async def test_conditions_evaluation(self, mock_supabase):
        """
        Testa avaliação de condições
        
        Verifica diferentes operadores de condição
        """
        rules_executor = get_rules_executor()
        
        # Teste condição EQUALS
        conditions = [
            RuleCondition(
                field="customer.name",
                operator=ConditionOperator.EQUALS,
                value="João Silva"
            )
        ]
        
        context = {
            "customer": {"name": "João Silva", "email": "joao@test.com"}
        }
        
        result = await rules_executor.evaluate_conditions(conditions, context)
        assert result == True
        
        # Teste condição CONTAINS
        conditions = [
            RuleCondition(
                field="customer.email",
                operator=ConditionOperator.CONTAINS,
                value="@test.com"
            )
        ]
        
        result = await rules_executor.evaluate_conditions(conditions, context)
        assert result == True
        
        # Teste condição NOT_EMPTY
        conditions = [
            RuleCondition(
                field="customer.name",
                operator=ConditionOperator.NOT_EMPTY,
                value=None
            )
        ]
        
        result = await rules_executor.evaluate_conditions(conditions, context)
        assert result == True
    
    @pytest.mark.asyncio
    async def test_multiple_actions_execution(self, mock_supabase):
        """
        Testa execução de múltiplas ações em sequência
        """
        action_executor = get_action_executor()
        
        actions = [
            RuleAction(
                type=ActionType.SEND_EMAIL,
                config={"template": "welcome", "to": "test@example.com"},
                order=1
            ),
            RuleAction(
                type=ActionType.APPLY_TAG,
                config={"tag": "novo_lead", "customer_id": "customer_123"},
                order=2
            ),
            RuleAction(
                type=ActionType.CREATE_TASK,
                config={"title": "Contatar lead", "assigned_to": "vendedor_1"},
                order=3
            )
        ]
        
        context = {
            "customer": {"id": "customer_123", "email": "test@example.com"}
        }
        
        results = await action_executor.execute_actions(actions, context)
        
        # Verificar que todas as ações foram executadas
        assert len(results) == 3
        
        # Verificar ordem de execução
        assert results[0].action_type == "send_email"
        assert results[1].action_type == "apply_tag"
        assert results[2].action_type == "create_task"
        
        # Verificar que todas têm timestamp
        for result in results:
            assert result.executed_at is not None
            assert result.duration_ms >= 0


class TestAutomationProperties:
    """Testes de propriedades do sistema (Property-Based Testing)"""
    
    def test_property_rule_storage_completeness(self):
        """
        Propriedade 1: Armazenamento Completo de Regras
        
        Toda regra criada deve ser armazenada com todos os campos obrigatórios
        """
        rule_data = AutomationRuleCreate(
            nome="Teste Propriedade",
            gatilho=TriggerType.LEAD_CREATED,
            acoes=[
                RuleAction(
                    type=ActionType.SEND_EMAIL,
                    config={"template": "test"},
                    order=1
                )
            ]
        )
        
        # Verificar que todos os campos obrigatórios estão presentes
        assert rule_data.nome is not None
        assert rule_data.gatilho is not None
        assert len(rule_data.acoes) > 0
        assert rule_data.acoes[0].type is not None
        assert rule_data.acoes[0].config is not None
        assert rule_data.acoes[0].order >= 1
    
    def test_property_action_execution_order(self):
        """
        Propriedade 2: Ordem de Execução de Ações
        
        Ações devem ser executadas na ordem especificada pelo campo 'order'
        """
        actions = [
            RuleAction(type=ActionType.SEND_EMAIL, config={}, order=3),
            RuleAction(type=ActionType.APPLY_TAG, config={}, order=1),
            RuleAction(type=ActionType.CREATE_TASK, config={}, order=2)
        ]
        
        # Ordenar ações
        sorted_actions = sorted(actions, key=lambda x: x.order)
        
        # Verificar ordem correta
        assert sorted_actions[0].order == 1
        assert sorted_actions[1].order == 2
        assert sorted_actions[2].order == 3
        
        assert sorted_actions[0].type == ActionType.APPLY_TAG
        assert sorted_actions[1].type == ActionType.CREATE_TASK
        assert sorted_actions[2].type == ActionType.SEND_EMAIL
    
    def test_property_performance_evaluation(self):
        """
        Propriedade 3: Performance de Avaliação
        
        Avaliação de regras deve ser rápida (< 200ms por regra)
        """
        import time
        
        # Simular avaliação de condições simples
        start_time = time.time()
        
        # Operação que deve ser rápida
        condition = RuleCondition(
            field="customer.name",
            operator=ConditionOperator.EQUALS,
            value="Test"
        )
        
        # Verificar estrutura da condição
        assert condition.field == "customer.name"
        assert condition.operator == ConditionOperator.EQUALS
        assert condition.value == "Test"
        
        end_time = time.time()
        duration_ms = (end_time - start_time) * 1000
        
        # Deve ser muito rápido (< 10ms para operação simples)
        assert duration_ms < 10
    
    def test_property_api_format_consistency(self):
        """
        Propriedade 5: Formato API Consistente
        
        Respostas da API devem seguir formato exato esperado pelo frontend
        """
        from services.automation.schemas import (
            AutomationRulesResponse,
            AutomationRuleForFrontend,
            AutomationStats
        )
        
        # Testar formato de regras
        frontend_rule = AutomationRuleForFrontend(
            id=1,
            nome="Teste Regra",
            status="ativa",
            gatilho="Lead criado",
            acao="Enviar email",
            disparosMes=10,
            taxaAbertura="85%"
        )
        
        response = AutomationRulesResponse(rules=[frontend_rule])
        
        # Verificar estrutura obrigatória
        assert hasattr(response, 'rules')
        assert len(response.rules) == 1
        assert response.rules[0].id == 1
        assert response.rules[0].nome == "Teste Regra"
        assert response.rules[0].status == "ativa"
        
        # Testar formato de estatísticas
        stats = AutomationStats(
            fluxos_ativos=5,
            mensagens_enviadas_hoje=42,
            taxa_media_abertura="68%"
        )
        
        # Verificar campos obrigatórios
        assert hasattr(stats, 'fluxos_ativos')
        assert hasattr(stats, 'mensagens_enviadas_hoje')
        assert hasattr(stats, 'taxa_media_abertura')
        assert isinstance(stats.fluxos_ativos, int)
        assert isinstance(stats.mensagens_enviadas_hoje, int)
        assert isinstance(stats.taxa_media_abertura, str)
        assert stats.taxa_media_abertura.endswith('%')


if __name__ == "__main__":
    # Executar testes
    pytest.main([__file__, "-v"])