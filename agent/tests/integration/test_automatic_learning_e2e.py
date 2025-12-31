"""
Teste E2E de aprendizado automático do SICC

Este teste valida o aprendizado automático completo:
- Simular fluxo completo de aprendizado
- Validar tempo de execução < 5 minutos
- Verificar acurácia > 85% na detecção de padrões

Requirements: 10.4, 10.5
"""

import pytest
import asyncio
from typing import Dict, List, Any, Tuple
from datetime import datetime, timedelta
import time
import random
import string

from agent.src.services.sicc import (
    SICCService, 
    SICCConfig, 
    get_sicc_service,
    reset_sicc_service
)


@pytest.mark.integration
@pytest.mark.e2e
@pytest.mark.slow
class TestAutomaticLearningE2E:
    """Testes E2E de aprendizado automático do sistema SICC"""
    
    @pytest.fixture(autouse=True)
    async def setup_and_teardown(self):
        """Setup e teardown para cada teste"""
        # Reset singleton antes do teste
        reset_sicc_service()
        
        # Configuração otimizada para aprendizado automático
        config = SICCConfig(
            min_pattern_confidence=0.75,  # Threshold mais alto para precisão
            max_memories_per_conversation=30,
            async_processing_enabled=True,
            max_concurrent_embeddings=5,
            sub_agents_enabled=True,
            metrics_collection_enabled=True,
            performance_monitoring_enabled=True
        )
        
        self.sicc = get_sicc_service(config)
        await self.sicc.initialize()
        
        yield
        
        # Cleanup após teste
        await self.sicc.shutdown()
        reset_sicc_service()
    
    def _generate_conversation_variations(
        self, 
        base_template: str, 
        variations: List[str], 
        count: int
    ) -> List[Dict[str, Any]]:
        """
        Gera variações de conversas baseadas em template
        
        Args:
            base_template: Template base da conversa
            variations: Lista de variações para inserir no template
            count: Número de conversas a gerar
            
        Returns:
            Lista de dados de conversas
        """
        conversations = []
        
        for i in range(count):
            variation = random.choice(variations)
            message = base_template.format(variation=variation, index=i)
            
            conversations.append({
                "id": f"auto_conv_{i}_{random.randint(1000, 9999)}",
                "message": message,
                "variation": variation,
                "index": i,
                "timestamp": datetime.now() + timedelta(seconds=i)
            })
        
        return conversations
    
    @pytest.mark.asyncio
    async def test_automatic_pattern_detection_accuracy(self):
        """
        Testa acurácia da detecção automática de padrões
        
        Cenário:
        1. Gerar 3 grupos de conversas com padrões distintos
        2. Processar todas as conversas
        3. Verificar que sistema detecta exatamente 3 padrões
        4. Validar acurácia > 85%
        """
        start_time = time.time()
        
        # Arrange - Gerar 3 grupos de padrões distintos
        
        # Grupo 1: Interesse em colchão para dor nas costas
        back_pain_conversations = self._generate_conversation_variations(
            "Olá, tenho {variation} e preciso de uma solução para dormir melhor {index}",
            ["dor nas costas", "dores na coluna", "problemas na lombar", "dor ciática"],
            8
        )
        
        # Grupo 2: Interesse em colchão para insônia
        insomnia_conversations = self._generate_conversation_variations(
            "Oi, sofro com {variation} e não consigo ter uma boa noite de sono {index}",
            ["insônia", "dificuldade para dormir", "sono agitado", "acordar várias vezes"],
            8
        )
        
        # Grupo 3: Interesse em colchão para circulação
        circulation_conversations = self._generate_conversation_variations(
            "Preciso de ajuda com {variation}, ouvi falar que colchão magnético ajuda {index}",
            ["má circulação", "pernas inchadas", "formigamento", "problemas circulatórios"],
            8
        )
        
        all_conversations = back_pain_conversations + insomnia_conversations + circulation_conversations
        random.shuffle(all_conversations)  # Embaralhar para simular ordem real
        
        # Act - Processar todas as conversas
        processed_count = 0
        processing_times = []
        
        for conv in all_conversations:
            conv_start = time.time()
            
            # Iniciar conversa
            await self.sicc.process_conversation_start(
                conversation_id=conv["id"],
                user_context={
                    "message": conv["message"],
                    "context": {
                        "problem_type": conv["variation"],
                        "timestamp": conv["timestamp"].isoformat()
                    }
                },
                sub_agent_type="discovery"
            )
            
            # Simular resposta do agente
            agent_response = self._generate_agent_response(conv["variation"])
            
            # Finalizar conversa
            await self.sicc.process_conversation_end(
                conversation_id=conv["id"],
                final_context={
                    "full_conversation": f"{conv['message']}\n{agent_response}",
                    "agent_response": agent_response,
                    "user_problem": conv["variation"],
                    "outcome": "interested"
                },
                outcome="qualified_lead"
            )
            
            conv_end = time.time()
            processing_times.append(conv_end - conv_start)
            processed_count += 1
            
            # Pequena pausa para não sobrecarregar
            await asyncio.sleep(0.05)
        
        # Aguardar processamento assíncrono completo
        await asyncio.sleep(5.0)
        
        total_processing_time = time.time() - start_time
        
        # Assert - Verificar resultados do aprendizado automático
        
        # 1. Verificar tempo de execução
        assert total_processing_time < 300  # Menos de 5 minutos
        assert processed_count == 24  # Todas as conversas processadas
        
        # 2. Verificar performance individual
        avg_processing_time = sum(processing_times) / len(processing_times)
        assert avg_processing_time < 3.0  # Menos de 3 segundos por conversa
        
        # 3. Obter status do sistema
        system_status = await self.sicc.get_system_status()
        intelligence_report = system_status["intelligence_report"]
        
        # 4. Verificar detecção de padrões
        patterns_learned = intelligence_report["total_patterns_learned"]
        assert patterns_learned >= 3  # Pelo menos 3 padrões distintos
        
        # 5. Verificar acurácia do sistema
        system_accuracy = intelligence_report["system_accuracy"]
        assert system_accuracy > 0.85  # Acurácia > 85%
        
        # 6. Verificar que sistema está aprendendo
        learning_rate = intelligence_report["learning_rate_24h"]
        assert learning_rate > 0  # Sistema está ativo
        
        # 7. Testar aplicação dos padrões aprendidos
        accuracy_tests = await self._test_pattern_application_accuracy()
        
        # Verificar que padrões são aplicados corretamente
        assert accuracy_tests["correct_applications"] / accuracy_tests["total_tests"] > 0.85
        
        print(f"\\n=== RESULTADOS DO TESTE DE APRENDIZADO AUTOMÁTICO ===")
        print(f"Conversas processadas: {processed_count}")
        print(f"Tempo total: {total_processing_time:.2f}s")
        print(f"Tempo médio por conversa: {avg_processing_time:.2f}s")
        print(f"Padrões aprendidos: {patterns_learned}")
        print(f"Acurácia do sistema: {system_accuracy:.3f}")
        print(f"Taxa de aprendizado: {learning_rate:.2f} padrões/hora")
        print(f"Acurácia de aplicação: {accuracy_tests['correct_applications']}/{accuracy_tests['total_tests']}")
    
    def _generate_agent_response(self, problem_type: str) -> str:
        """Gera resposta do agente baseada no tipo de problema"""
        responses = {
            "dor nas costas": "O colchão magnético Slim Quality é ideal para dores nas costas. Os 240 ímãs de 800 Gauss melhoram a circulação e reduzem inflamações.",
            "dores na coluna": "Para problemas na coluna, nosso colchão magnético oferece suporte adequado e terapia magnética que alivia tensões.",
            "problemas na lombar": "A região lombar se beneficia muito da terapia magnética. Nosso colchão tem densidade progressiva ideal para suporte lombar.",
            "dor ciática": "A dor ciática pode ser aliviada com a melhora da circulação que os ímãs proporcionam, reduzindo a compressão do nervo.",
            "insônia": "Para insônia, o colchão magnético promove relaxamento através da melhora da circulação e redução do estresse.",
            "dificuldade para dormir": "A terapia magnética ajuda a relaxar o sistema nervoso, facilitando o adormecer natural.",
            "sono agitado": "Os ímãs ajudam a estabilizar o sistema nervoso, proporcionando sono mais profundo e reparador.",
            "acordar várias vezes": "A melhora da circulação e oxigenação promovida pelos ímãs resulta em sono mais contínuo.",
            "má circulação": "Nosso colchão magnético é especialmente eficaz para problemas circulatórios, com 240 ímãs estrategicamente posicionados.",
            "pernas inchadas": "A terapia magnética melhora o retorno venoso, reduzindo o inchaço nas pernas durante o sono.",
            "formigamento": "O formigamento geralmente indica problemas circulatórios que são tratados eficazmente pela terapia magnética.",
            "problemas circulatórios": "A terapia magnética é reconhecida por melhorar a microcirculação e oxigenação dos tecidos."
        }
        
        return responses.get(problem_type, "Nosso colchão magnético Slim Quality pode ajudar com seu problema de saúde.")
    
    async def _test_pattern_application_accuracy(self) -> Dict[str, int]:
        """
        Testa acurácia da aplicação de padrões aprendidos
        
        Returns:
            Dicionário com resultados dos testes
        """
        test_cases = [
            {
                "message": "Tenho dor nas costas crônica",
                "expected_category": "back_pain",
                "context": {"problem": "dor nas costas"}
            },
            {
                "message": "Não consigo dormir direito, tenho insônia",
                "expected_category": "sleep_issues", 
                "context": {"problem": "insônia"}
            },
            {
                "message": "Minhas pernas ficam inchadas",
                "expected_category": "circulation",
                "context": {"problem": "circulação"}
            },
            {
                "message": "Sinto formigamento nas pernas",
                "expected_category": "circulation",
                "context": {"problem": "circulação"}
            },
            {
                "message": "Acordo várias vezes durante a noite",
                "expected_category": "sleep_issues",
                "context": {"problem": "sono"}
            }
        ]
        
        correct_applications = 0
        total_tests = len(test_cases)
        
        for i, test_case in enumerate(test_cases):
            test_id = f"accuracy_test_{i}"
            
            # Testar aplicação de padrão
            result = await self.sicc.process_conversation_start(
                conversation_id=test_id,
                user_context={
                    "message": test_case["message"],
                    "context": test_case["context"]
                },
                sub_agent_type="discovery"
            )
            
            # Verificar se padrões aplicáveis foram encontrados
            applicable_patterns = result["applicable_patterns"]
            
            if applicable_patterns:
                # Verificar se pelo menos um padrão é relevante
                relevant_pattern_found = False
                
                for pattern in applicable_patterns:
                    pattern_description = pattern.get("description", "").lower()
                    pattern_category = pattern.get("category", "").lower()
                    
                    # Verificar relevância baseada na categoria esperada
                    if test_case["expected_category"] == "back_pain":
                        if any(keyword in pattern_description or keyword in pattern_category 
                               for keyword in ["dor", "costas", "coluna", "lombar"]):
                            relevant_pattern_found = True
                            break
                    
                    elif test_case["expected_category"] == "sleep_issues":
                        if any(keyword in pattern_description or keyword in pattern_category
                               for keyword in ["sono", "insônia", "dormir", "acordar"]):
                            relevant_pattern_found = True
                            break
                    
                    elif test_case["expected_category"] == "circulation":
                        if any(keyword in pattern_description or keyword in pattern_category
                               for keyword in ["circulação", "inchaço", "formigamento", "pernas"]):
                            relevant_pattern_found = True
                            break
                
                if relevant_pattern_found:
                    correct_applications += 1
            
            # Finalizar teste
            await self.sicc.process_conversation_end(
                conversation_id=test_id,
                final_context={"test": "accuracy"},
                outcome="test_completed"
            )
        
        return {
            "correct_applications": correct_applications,
            "total_tests": total_tests
        }
    
    @pytest.mark.asyncio
    async def test_automatic_learning_scalability(self):
        """
        Testa escalabilidade do aprendizado automático
        
        Cenário:
        1. Processar 50 conversas em paralelo
        2. Verificar que sistema mantém performance
        3. Validar que aprendizado continua funcionando
        """
        start_time = time.time()
        
        # Arrange - Gerar muitas conversas para teste de escala
        scalability_conversations = []
        
        templates = [
            "Preciso de {variation} para meu problema de saúde {index}",
            "Tenho {variation} e busco uma solução {index}",
            "Sofro com {variation}, podem me ajudar? {index}",
            "Meu problema é {variation}, o que recomendam? {index}"
        ]
        
        problems = [
            "dor nas costas", "insônia", "má circulação", "dor na coluna",
            "sono agitado", "pernas inchadas", "dor lombar", "formigamento",
            "dificuldade para dormir", "problemas circulatórios"
        ]
        
        for i in range(50):
            template = random.choice(templates)
            problem = random.choice(problems)
            
            scalability_conversations.append({
                "id": f"scale_conv_{i}",
                "message": template.format(variation=problem, index=i),
                "problem": problem,
                "template": template
            })
        
        # Act - Processar conversas em lotes para simular carga real
        batch_size = 10
        batches = [
            scalability_conversations[i:i + batch_size] 
            for i in range(0, len(scalability_conversations), batch_size)
        ]
        
        batch_times = []
        
        for batch_idx, batch in enumerate(batches):
            batch_start = time.time()
            
            # Processar lote de conversas
            tasks = []
            for conv in batch:
                task = self._process_single_conversation(conv)
                tasks.append(task)
            
            # Aguardar conclusão do lote
            await asyncio.gather(*tasks)
            
            batch_end = time.time()
            batch_time = batch_end - batch_start
            batch_times.append(batch_time)
            
            print(f"Lote {batch_idx + 1}/5 processado em {batch_time:.2f}s")
            
            # Pequena pausa entre lotes
            await asyncio.sleep(0.5)
        
        # Aguardar processamento assíncrono final
        await asyncio.sleep(3.0)
        
        total_time = time.time() - start_time
        
        # Assert - Verificar escalabilidade
        
        # 1. Tempo total deve ser aceitável
        assert total_time < 300  # Menos de 5 minutos para 50 conversas
        
        # 2. Tempo por lote deve ser consistente (não degradar)
        avg_batch_time = sum(batch_times) / len(batch_times)
        max_batch_time = max(batch_times)
        
        # Variação entre lotes não deve ser excessiva
        assert max_batch_time < avg_batch_time * 2  # Máximo 2x a média
        
        # 3. Sistema deve continuar responsivo
        responsiveness_start = time.time()
        
        quick_test = await self.sicc.process_conversation_start(
            conversation_id="responsiveness_after_scale",
            user_context={"message": "Teste de responsividade pós-escala"},
            sub_agent_type="general"
        )
        
        responsiveness_time = time.time() - responsiveness_start
        assert responsiveness_time < 2.0  # Ainda responde rapidamente
        
        await self.sicc.process_conversation_end(
            conversation_id="responsiveness_after_scale",
            final_context={"test": "responsiveness"},
            outcome="completed"
        )
        
        # 4. Verificar que aprendizado ainda funciona
        system_status = await self.sicc.get_system_status()
        intelligence_report = system_status["intelligence_report"]
        
        assert intelligence_report["total_patterns_learned"] > 0
        assert intelligence_report["system_accuracy"] > 0.7
        assert len(intelligence_report["alerts"]) == 0  # Sem alertas críticos
        
        print(f"\\n=== RESULTADOS DO TESTE DE ESCALABILIDADE ===")
        print(f"Conversas processadas: 50")
        print(f"Tempo total: {total_time:.2f}s")
        print(f"Tempo médio por lote: {avg_batch_time:.2f}s")
        print(f"Tempo máximo por lote: {max_batch_time:.2f}s")
        print(f"Responsividade pós-escala: {responsiveness_time:.2f}s")
        print(f"Padrões aprendidos: {intelligence_report['total_patterns_learned']}")
        print(f"Acurácia final: {intelligence_report['system_accuracy']:.3f}")
    
    async def _process_single_conversation(self, conv_data: Dict[str, Any]):
        """Processa uma única conversa"""
        try:
            # Iniciar conversa
            await self.sicc.process_conversation_start(
                conversation_id=conv_data["id"],
                user_context={
                    "message": conv_data["message"],
                    "context": {"problem": conv_data["problem"]}
                },
                sub_agent_type="discovery"
            )
            
            # Simular processamento
            await asyncio.sleep(0.1)
            
            # Finalizar conversa
            await self.sicc.process_conversation_end(
                conversation_id=conv_data["id"],
                final_context={
                    "full_conversation": f"{conv_data['message']}\\nResposta do agente",
                    "problem_identified": conv_data["problem"]
                },
                outcome="processed"
            )
            
        except Exception as e:
            print(f"Erro ao processar conversa {conv_data['id']}: {e}")
    
    @pytest.mark.asyncio
    async def test_learning_quality_over_time(self):
        """
        Testa qualidade do aprendizado ao longo do tempo
        
        Cenário:
        1. Processar conversas em ondas
        2. Verificar que acurácia melhora com mais dados
        3. Validar que padrões ficam mais refinados
        """
        # Arrange - Preparar ondas de conversas
        wave_1_conversations = self._generate_conversation_variations(
            "Tenho {variation} e preciso de ajuda {index}",
            ["dor nas costas", "dor na coluna"],
            5
        )
        
        wave_2_conversations = self._generate_conversation_variations(
            "Sofro com {variation}, o colchão magnético pode ajudar? {index}",
            ["dor nas costas", "dor na coluna", "dor lombar"],
            5
        )
        
        wave_3_conversations = self._generate_conversation_variations(
            "Meu problema é {variation}, ouvi falar do colchão da Slim Quality {index}",
            ["dor nas costas", "dor na coluna", "dor lombar", "dor ciática"],
            5
        )
        
        waves = [wave_1_conversations, wave_2_conversations, wave_3_conversations]
        accuracy_progression = []
        
        # Act - Processar ondas sequencialmente
        for wave_idx, wave in enumerate(waves):
            print(f"\\nProcessando onda {wave_idx + 1}/3...")
            
            # Processar conversa da onda
            for conv in wave:
                await self.sicc.process_conversation_start(
                    conversation_id=conv["id"],
                    user_context={
                        "message": conv["message"],
                        "context": {"wave": wave_idx + 1}
                    },
                    sub_agent_type="discovery"
                )
                
                await self.sicc.process_conversation_end(
                    conversation_id=conv["id"],
                    final_context={
                        "full_conversation": f"{conv['message']}\\nResposta especializada",
                        "wave": wave_idx + 1
                    },
                    outcome="completed"
                )
            
            # Aguardar processamento
            await asyncio.sleep(2.0)
            
            # Medir acurácia atual
            system_status = await self.sicc.get_system_status()
            current_accuracy = system_status["intelligence_report"]["system_accuracy"]
            accuracy_progression.append(current_accuracy)
            
            print(f"Acurácia após onda {wave_idx + 1}: {current_accuracy:.3f}")
        
        # Assert - Verificar melhoria ao longo do tempo
        
        # 1. Acurácia deve melhorar ou se manter estável
        for i in range(1, len(accuracy_progression)):
            # Permitir pequena variação, mas tendência deve ser positiva
            assert accuracy_progression[i] >= accuracy_progression[i-1] - 0.05
        
        # 2. Acurácia final deve ser alta
        final_accuracy = accuracy_progression[-1]
        assert final_accuracy > 0.8
        
        # 3. Testar qualidade dos padrões aprendidos
        quality_test = await self.sicc.process_conversation_start(
            conversation_id="quality_test",
            user_context={
                "message": "Tenho dor nas costas crônica há anos",
                "context": {"test": "quality"}
            },
            sub_agent_type="discovery"
        )
        
        # Deve encontrar padrões relevantes e específicos
        patterns = quality_test["applicable_patterns"]
        assert len(patterns) > 0
        
        # Padrões devem ter alta confiança
        high_confidence_patterns = [
            p for p in patterns 
            if p.get("confidence", 0) > 0.8
        ]
        assert len(high_confidence_patterns) > 0
        
        await self.sicc.process_conversation_end(
            conversation_id="quality_test",
            final_context={"test": "quality"},
            outcome="completed"
        )
        
        print(f"\\n=== PROGRESSÃO DA QUALIDADE DO APRENDIZADO ===")
        for i, accuracy in enumerate(accuracy_progression):
            print(f"Onda {i + 1}: {accuracy:.3f}")
        print(f"Melhoria total: {accuracy_progression[-1] - accuracy_progression[0]:.3f}")
        print(f"Padrões de alta confiança encontrados: {len(high_confidence_patterns)}")