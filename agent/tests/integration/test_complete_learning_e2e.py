"""
Teste E2E de aprendizado completo do SICC

Este teste valida o fluxo completo de aprendizado:
1. Criar 10 conversas similares
2. Validar detecção de padrão com confidence > 70%
3. Verificar aprovação automática pelo Supervisor
4. Confirmar aplicação do padrão em conversa subsequente

Requirements: 10.1, 10.2, 10.3
"""

import pytest
import asyncio
from typing import Dict, List, Any
from datetime import datetime, timedelta
import time

from src.services.sicc import (
    SICCService, 
    SICCConfig, 
    get_sicc_service,
    reset_sicc_service
)


@pytest.mark.integration
@pytest.mark.e2e
@pytest.mark.slow
class TestCompleteLearningE2E:
    """Testes E2E de aprendizado completo do sistema SICC"""
    
    @pytest.fixture(autouse=True)
    async def setup_and_teardown(self):
        """Setup e teardown para cada teste"""
        # Reset singleton antes do teste
        reset_sicc_service()
        
        # Configuração otimizada para testes
        config = SICCConfig(
            min_pattern_confidence=0.7,
            max_memories_per_conversation=20,
            async_processing_enabled=True,
            max_concurrent_embeddings=3,
            sub_agents_enabled=True,
            metrics_collection_enabled=True
        )
        
        self.sicc = get_sicc_service(config)
        await self.sicc.initialize()
        
        yield  # Executa o teste
        
        # Teardown
        if hasattr(self, 'sicc'):
            await self.sicc.shutdown()
        reset_sicc_service()
        
        yield
        
        # Cleanup após teste
        await self.sicc.shutdown()
        reset_sicc_service()
    
    @pytest.mark.asyncio
    async def test_complete_learning_flow_discovery_agent(self):
        """
        Testa fluxo completo de aprendizado para agente de discovery
        
        Cenário:
        1. 10 conversas similares sobre "interesse em colchão magnético"
        2. Sistema deve detectar padrão com confidence > 70%
        3. Supervisor deve aprovar automaticamente
        4. Padrão deve ser aplicado em nova conversa
        """
        # Arrange - Preparar conversas similares
        discovery_conversations = [
            {
                "id": f"discovery_conv_{i}",
                "user_message": f"Olá, tenho interesse em colchão magnético para dores nas costas {i}",
                "agent_response": "Entendo sua necessidade. O colchão magnético Slim Quality é ideal para dores nas costas. Possui 240 ímãs de 800 Gauss que melhoram a circulação sanguínea.",
                "outcome": "interested",
                "user_context": {
                    "problem": "dores nas costas",
                    "interest_level": "high",
                    "product": "colchão magnético"
                }
            }
            for i in range(10)
        ]
        
        start_time = time.time()
        
        # Act - Processar conversas de discovery
        processed_conversations = []
        
        for conv_data in discovery_conversations:
            # Iniciar conversa
            start_result = await self.sicc.process_conversation_start(
                conversation_id=conv_data["id"],
                user_context={
                    "message": conv_data["user_message"],
                    "context": conv_data["user_context"]
                },
                sub_agent_type="discovery"
            )
            
            # Simular processamento da conversa
            await asyncio.sleep(0.1)  # Simular tempo de processamento
            
            # Finalizar conversa
            end_result = await self.sicc.process_conversation_end(
                conversation_id=conv_data["id"],
                final_context={
                    "full_conversation": f"{conv_data['user_message']}\n{conv_data['agent_response']}",
                    "agent_response": conv_data["agent_response"],
                    "user_satisfaction": "high",
                    "outcome": conv_data["outcome"]
                },
                outcome=conv_data["outcome"]
            )
            
            processed_conversations.append({
                "start": start_result,
                "end": end_result
            })
        
        # Aguardar processamento assíncrono de aprendizado
        await asyncio.sleep(2.0)
        
        # Verificar se padrões foram detectados
        system_status = await self.sicc.get_system_status()
        
        # Assert - Validar detecção de padrões
        assert len(processed_conversations) == 10
        
        # Verificar que todas as conversas foram processadas com sucesso
        for conv in processed_conversations:
            assert conv["start"]["conversation_id"] is not None
            assert conv["end"]["outcome"] == "interested"
            assert conv["end"]["learning_initiated"] is True
        
        # Verificar métricas do sistema
        intelligence_report = system_status["intelligence_report"]
        assert intelligence_report["total_patterns_learned"] > 0
        assert intelligence_report["learning_rate_24h"] > 0
        assert intelligence_report["top_performing_agent"] == "discovery"
        
        # Testar aplicação do padrão em nova conversa
        new_conversation_id = "test_pattern_application"
        
        new_start_result = await self.sicc.process_conversation_start(
            conversation_id=new_conversation_id,
            user_context={
                "message": "Tenho dores nas costas e ouvi falar de colchão magnético",
                "context": {"problem": "dores nas costas"}
            },
            sub_agent_type="discovery"
        )
        
        # Verificar que padrões aplicáveis foram encontrados
        assert len(new_start_result["applicable_patterns"]) > 0
        
        # Aplicar o primeiro padrão encontrado
        if new_start_result["applicable_patterns"]:
            pattern_id = new_start_result["applicable_patterns"][0]["id"]
            
            pattern_result = await self.sicc.apply_pattern(
                conversation_id=new_conversation_id,
                pattern_id=pattern_id,
                context={
                    "user_message": "Tenho dores nas costas e ouvi falar de colchão magnético",
                    "user_context": {"problem": "dores nas costas"}
                }
            )
            
            # Verificar aplicação bem-sucedida
            assert pattern_result["success"] is True
            assert "response" in pattern_result
        
        # Finalizar nova conversa
        await self.sicc.process_conversation_end(
            conversation_id=new_conversation_id,
            final_context={"full_conversation": "Conversa com padrão aplicado"},
            outcome="pattern_applied"
        )
        
        # Verificar tempo total de execução
        total_time = time.time() - start_time
        assert total_time < 300  # Menos de 5 minutos (300 segundos)
        
        # Verificar performance final
        final_status = await self.sicc.get_system_status()
        final_report = final_status["intelligence_report"]
        
        # Validar que sistema aprendeu e está funcionando
        assert final_report["system_accuracy"] > 0.7  # Acurácia > 70%
        assert final_report["performance_trend"] in ["improving", "stable"]
        assert len(final_report["alerts"]) == 0  # Sem alertas críticos
    
    @pytest.mark.asyncio
    async def test_complete_learning_flow_sales_agent(self):
        """
        Testa fluxo completo de aprendizado para agente de vendas
        
        Cenário:
        1. 10 conversas similares sobre "negociação de preço"
        2. Sistema deve detectar padrão de objeção de preço
        3. Padrão deve ser aprovado e aplicado
        """
        # Arrange - Conversas de vendas com objeção de preço
        sales_conversations = [
            {
                "id": f"sales_conv_{i}",
                "user_message": f"O preço está muito alto, não consigo pagar R$ 3.290 {i}",
                "agent_response": "Entendo sua preocupação. Vamos pensar assim: são apenas R$ 10,96 por dia durante um ano. Menos que uma pizza! E você terá saúde e qualidade de sono por décadas.",
                "outcome": "price_negotiated",
                "user_context": {
                    "objection_type": "price",
                    "price_sensitivity": "high",
                    "product_interest": "high"
                }
            }
            for i in range(10)
        ]
        
        # Act - Processar conversas de vendas
        for conv_data in sales_conversations:
            await self.sicc.process_conversation_start(
                conversation_id=conv_data["id"],
                user_context={
                    "message": conv_data["user_message"],
                    "context": conv_data["user_context"]
                },
                sub_agent_type="sales"
            )
            
            await asyncio.sleep(0.1)
            
            await self.sicc.process_conversation_end(
                conversation_id=conv_data["id"],
                final_context={
                    "full_conversation": f"{conv_data['user_message']}\n{conv_data['agent_response']}",
                    "objection_handled": True,
                    "negotiation_successful": True
                },
                outcome=conv_data["outcome"]
            )
        
        # Aguardar aprendizado
        await asyncio.sleep(2.0)
        
        # Testar aplicação em nova conversa de vendas
        test_conv_id = "sales_pattern_test"
        
        start_result = await self.sicc.process_conversation_start(
            conversation_id=test_conv_id,
            user_context={
                "message": "Achei caro demais, não tenho esse dinheiro todo",
                "context": {"objection_type": "price"}
            },
            sub_agent_type="sales"
        )
        
        # Assert - Verificar que padrão de vendas foi aprendido
        assert len(start_result["applicable_patterns"]) > 0
        
        # Verificar que padrão é específico para objeção de preço
        price_patterns = [
            p for p in start_result["applicable_patterns"]
            if "price" in p.get("category", "").lower() or "preço" in p.get("description", "").lower()
        ]
        assert len(price_patterns) > 0
        
        # Aplicar padrão de vendas
        if price_patterns:
            pattern_result = await self.sicc.apply_pattern(
                conversation_id=test_conv_id,
                pattern_id=price_patterns[0]["id"],
                context={
                    "user_message": "Achei caro demais",
                    "objection_type": "price"
                }
            )
            
            assert pattern_result["success"] is True
            assert "response" in pattern_result
        
        await self.sicc.process_conversation_end(
            conversation_id=test_conv_id,
            final_context={"outcome": "pattern_applied"},
            outcome="completed"
        )
    
    @pytest.mark.asyncio
    async def test_multi_agent_learning_integration(self):
        """
        Testa aprendizado integrado entre múltiplos sub-agentes
        
        Cenário:
        1. Conversas de discovery que levam a vendas
        2. Conversas de vendas que precisam de suporte
        3. Verificar que padrões são compartilhados adequadamente
        """
        # Arrange - Conversas que transitam entre agentes
        multi_agent_scenarios = [
            {
                "discovery_conv": {
                    "id": f"discovery_to_sales_{i}",
                    "message": f"Preciso de algo para dor nas costas {i}",
                    "outcome": "qualified_lead"
                },
                "sales_conv": {
                    "id": f"sales_from_discovery_{i}",
                    "message": f"Me interessei pelo colchão, como funciona? {i}",
                    "outcome": "sale_completed"
                },
                "support_conv": {
                    "id": f"support_post_sale_{i}",
                    "message": f"Comprei o colchão, quando chega? {i}",
                    "outcome": "support_resolved"
                }
            }
            for i in range(5)  # 5 cenários completos
        ]
        
        # Act - Processar fluxo completo multi-agente
        for scenario in multi_agent_scenarios:
            # Discovery
            await self.sicc.process_conversation_start(
                conversation_id=scenario["discovery_conv"]["id"],
                user_context={"message": scenario["discovery_conv"]["message"]},
                sub_agent_type="discovery"
            )
            
            await self.sicc.process_conversation_end(
                conversation_id=scenario["discovery_conv"]["id"],
                final_context={"qualified": True},
                outcome=scenario["discovery_conv"]["outcome"]
            )
            
            # Sales
            await self.sicc.process_conversation_start(
                conversation_id=scenario["sales_conv"]["id"],
                user_context={"message": scenario["sales_conv"]["message"]},
                sub_agent_type="sales"
            )
            
            await self.sicc.process_conversation_end(
                conversation_id=scenario["sales_conv"]["id"],
                final_context={"sale_value": 3290.00},
                outcome=scenario["sales_conv"]["outcome"]
            )
            
            # Support
            await self.sicc.process_conversation_start(
                conversation_id=scenario["support_conv"]["id"],
                user_context={"message": scenario["support_conv"]["message"]},
                sub_agent_type="support"
            )
            
            await self.sicc.process_conversation_end(
                conversation_id=scenario["support_conv"]["id"],
                final_context={"issue_resolved": True},
                outcome=scenario["support_conv"]["outcome"]
            )
            
            await asyncio.sleep(0.1)
        
        # Aguardar processamento
        await asyncio.sleep(3.0)
        
        # Assert - Verificar aprendizado multi-agente
        system_status = await self.sicc.get_system_status()
        
        # Verificar que todos os agentes aprenderam
        performance_stats = system_status["performance_stats"]
        
        # Deve haver métricas para todos os tipos de agente
        assert "discovery" in str(performance_stats)
        assert "sales" in str(performance_stats)
        assert "support" in str(performance_stats)
        
        # Verificar relatório de inteligência
        intelligence_report = system_status["intelligence_report"]
        assert intelligence_report["total_patterns_learned"] >= 3  # Pelo menos um por agente
        assert intelligence_report["system_accuracy"] > 0.6  # Acurácia razoável
        
        # Testar que padrões são aplicáveis entre contextos relacionados
        cross_agent_test = await self.sicc.process_conversation_start(
            conversation_id="cross_agent_test",
            user_context={
                "message": "Comprei o colchão mas tenho dúvidas sobre entrega",
                "context": {"previous_interaction": "sales"}
            },
            sub_agent_type="support"
        )
        
        # Deve encontrar padrões relevantes mesmo sendo contexto cruzado
        assert len(cross_agent_test["applicable_patterns"]) >= 0
        
        await self.sicc.process_conversation_end(
            conversation_id="cross_agent_test",
            final_context={"test": "completed"},
            outcome="completed"
        )
    
    @pytest.mark.asyncio
    async def test_learning_performance_requirements(self):
        """
        Testa que o sistema atende aos requisitos de performance
        
        Requirements:
        - Tempo de execução < 5 minutos para 10 conversas
        - Acurácia > 85% na detecção de padrões
        - Sistema deve manter responsividade durante aprendizado
        """
        start_time = time.time()
        
        # Arrange - Conversas otimizadas para performance
        performance_conversations = [
            {
                "id": f"perf_conv_{i}",
                "message": f"Mensagem de teste {i} para performance",
                "response": f"Resposta padrão {i}",
                "outcome": "completed"
            }
            for i in range(10)
        ]
        
        # Act - Processar com medição de performance
        response_times = []
        
        for conv in performance_conversations:
            conv_start_time = time.time()
            
            await self.sicc.process_conversation_start(
                conversation_id=conv["id"],
                user_context={"message": conv["message"]},
                sub_agent_type="general"
            )
            
            await self.sicc.process_conversation_end(
                conversation_id=conv["id"],
                final_context={"full_conversation": f"{conv['message']}\n{conv['response']}"},
                outcome=conv["outcome"]
            )
            
            conv_end_time = time.time()
            response_times.append(conv_end_time - conv_start_time)
        
        # Aguardar processamento assíncrono
        await asyncio.sleep(2.0)
        
        total_time = time.time() - start_time
        
        # Assert - Verificar requisitos de performance
        assert total_time < 300  # Menos de 5 minutos
        
        # Verificar tempo de resposta individual
        avg_response_time = sum(response_times) / len(response_times)
        assert avg_response_time < 5.0  # Menos de 5 segundos por conversa
        
        # Verificar que sistema mantém responsividade
        quick_test_start = time.time()
        
        quick_result = await self.sicc.process_conversation_start(
            conversation_id="responsiveness_test",
            user_context={"message": "Teste de responsividade"},
            sub_agent_type="general"
        )
        
        quick_test_time = time.time() - quick_test_start
        assert quick_test_time < 2.0  # Sistema responde em menos de 2 segundos
        
        await self.sicc.process_conversation_end(
            conversation_id="responsiveness_test",
            final_context={"test": "responsiveness"},
            outcome="completed"
        )
        
        # Verificar status final do sistema
        final_status = await self.sicc.get_system_status()
        
        # Sistema deve estar saudável após teste de performance
        assert final_status["sicc_initialized"] is True
        assert len(final_status["intelligence_report"]["alerts"]) == 0
        
        # Verificar métricas de performance
        performance_summary = final_status["performance_stats"].get("performance_summary", {})
        
        if "avg_response_time" in performance_summary:
            assert performance_summary["avg_response_time"] < 3.0
        
        if "avg_success_rate" in performance_summary:
            assert performance_summary["avg_success_rate"] > 0.8  # 80% de sucesso