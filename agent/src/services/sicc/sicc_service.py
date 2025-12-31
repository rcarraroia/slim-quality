"""
SICC Service - Orquestrador principal do Sistema de Inteligência Corporativa Contínua

Este serviço integra todos os componentes SICC:
- Memory Service: Armazenamento e busca de memórias vetoriais
- Learning Service: Detecção e categorização de padrões
- Behavior Service: Aplicação de padrões aprendidos
- Supervisor Service: Aprovação automática de aprendizados
- Metrics Service: Coleta e análise de métricas de performance
- Async Processor: Processamento assíncrono de embeddings
"""

import structlog
from typing import Dict, List, Optional, Any, Union, TYPE_CHECKING
from dataclasses import dataclass
from datetime import datetime
import asyncio

# Imports tardios para evitar circularidade
if TYPE_CHECKING:
    from .memory_service import MemoryService
    from .learning_service import LearningService
    from .behavior_service import BehaviorService
    from .supervisor_service import SupervisorService
    from .metrics_service import MetricsService, MetricType
    from .async_processor_service import AsyncProcessorService

logger = structlog.get_logger(__name__)


@dataclass
class SICCConfig:
    """Configuração do sistema SICC"""
    # Configurações de aprendizado
    min_pattern_confidence: float = 0.7
    max_memories_per_conversation: int = 50
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    
    # Configurações de performance
    async_processing_enabled: bool = True
    max_concurrent_embeddings: int = 5
    memory_cleanup_interval_hours: int = 24
    
    # Configurações de sub-agentes
    sub_agents_enabled: bool = True
    default_sub_agent: str = "general"
    
    # Configurações de métricas
    metrics_collection_enabled: bool = True
    performance_monitoring_enabled: bool = True


class SICCService:
    """
    Serviço principal do Sistema de Inteligência Corporativa Contínua
    
    Orquestra todos os componentes SICC para fornecer:
    - Aprendizado automático de padrões conversacionais
    - Aplicação inteligente de conhecimento adquirido
    - Monitoramento de performance e evolução
    - Processamento assíncrono para não impactar conversas
    """
    
    def __init__(self, config: Optional[SICCConfig] = None):
        """
        Inicializa o serviço SICC com todos os componentes
        
        Args:
            config: Configuração personalizada (usa padrão se None)
        """
        self.config = config or SICCConfig()
        
        # Serviços serão inicializados sob demanda para evitar imports circulares
        self._memory_service: Optional['MemoryService'] = None
        self._learning_service: Optional['LearningService'] = None
        self._behavior_service: Optional['BehaviorService'] = None
        self._supervisor_service: Optional['SupervisorService'] = None
        self._metrics_service: Optional['MetricsService'] = None
        self._async_processor: Optional['AsyncProcessorService'] = None
        
        # Estado interno
        self.is_initialized = False
        self.active_conversations: Dict[str, Dict[str, Any]] = {}
        
        logger.info("SICCService inicializado com configuração", config=self.config.__dict__)
    
    @property
    def memory_service(self) -> 'MemoryService':
        """Lazy loading do Memory Service"""
        if self._memory_service is None:
            from .memory_service import get_memory_service
            self._memory_service = get_memory_service()
        return self._memory_service
    
    @property
    def learning_service(self) -> 'LearningService':
        """Lazy loading do Learning Service"""
        if self._learning_service is None:
            from .learning_service import get_learning_service
            self._learning_service = get_learning_service()
        return self._learning_service
    
    @property
    def behavior_service(self) -> 'BehaviorService':
        """Lazy loading do Behavior Service"""
        if self._behavior_service is None:
            from .behavior_service import get_behavior_service
            self._behavior_service = get_behavior_service()
        return self._behavior_service
    
    @property
    def supervisor_service(self) -> 'SupervisorService':
        """Lazy loading do Supervisor Service"""
        if self._supervisor_service is None:
            from .supervisor_service import get_supervisor_service
            self._supervisor_service = get_supervisor_service()
        return self._supervisor_service
    
    @property
    def metrics_service(self) -> 'MetricsService':
        """Lazy loading do Metrics Service"""
        if self._metrics_service is None:
            from .metrics_service import get_metrics_service
            self._metrics_service = get_metrics_service()
        return self._metrics_service
    
    @property
    def async_processor(self) -> 'AsyncProcessorService':
        """Lazy loading do Async Processor Service"""
        if self._async_processor is None:
            from .async_processor_service import get_async_processor_service
            self._async_processor = get_async_processor_service()
        return self._async_processor
    
    async def initialize(self) -> bool:
        """
        Inicializa todos os componentes SICC
        
        Returns:
            True se inicialização foi bem-sucedida
        """
        try:
            logger.info("Inicializando sistema SICC...")
            
            # Inicializar serviços em ordem de dependência
            # MemoryService não tem método initialize - já está pronto
            # await self.memory_service.initialize()
            # await self.learning_service.initialize()
            # await self.behavior_service.initialize()
            # await self.supervisor_service.initialize()
            
            logger.info("Serviços SICC carregados (lazy loading)")
            
            # Inicializar processamento assíncrono se habilitado
            if self.config.async_processing_enabled:
                await self.async_processor.start_workers(
                    max_workers=self.config.max_concurrent_embeddings
                )
            
            # Registrar métricas de inicialização
            if self.config.metrics_collection_enabled:
                from .metrics_service import MetricType
                await self.metrics_service.record_metric(
                    MetricType.SYSTEM_HEALTH,
                    1.0,
                    context={"event": "sicc_initialized"}
                )
            
            self.is_initialized = True
            logger.info("Sistema SICC inicializado com sucesso")
            return True
            
        except Exception as e:
            logger.error(f"Erro ao inicializar sistema SICC: {e}")
            return False
    
    async def process_conversation_start(
        self,
        conversation_id: str,
        user_context: Dict[str, Any],
        sub_agent_type: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Processa início de conversa e busca contexto relevante
        
        Args:
            conversation_id: ID único da conversa
            user_context: Contexto do usuário (mensagem, histórico, etc.)
            sub_agent_type: Tipo de sub-agente especializado
            
        Returns:
            Contexto relevante e padrões aplicáveis
        """
        try:
            if not self.is_initialized:
                await self.initialize()
            
            # Registrar início da conversa
            self.active_conversations[conversation_id] = {
                "start_time": datetime.now(),
                "sub_agent_type": sub_agent_type or self.config.default_sub_agent,
                "user_context": user_context,
                "patterns_applied": [],
                "memories_retrieved": []
            }
            
            # Buscar contexto relevante das memórias
            relevant_context = await self.memory_service.get_relevant_context(
                conversation_id=conversation_id,
                current_message=user_context.get("message", "")
            )
            
            # Buscar padrões aplicáveis
            applicable_patterns = await self.behavior_service.find_applicable_patterns(
                message=user_context.get("message", ""),
                context=user_context
            )
            
            # Registrar métricas
            if self.config.metrics_collection_enabled:
                from .metrics_service import MetricType
                await self.metrics_service.record_metric(
                    MetricType.PATTERN_APPLICATION,
                    len(applicable_patterns),
                    agent_type=sub_agent_type
                )
            
            # Armazenar informações da conversa
            self.active_conversations[conversation_id].update({
                "memories_retrieved": relevant_context,
                "patterns_available": applicable_patterns
            })
            
            result = {
                "conversation_id": conversation_id,
                "relevant_context": relevant_context,
                "applicable_patterns": applicable_patterns,
                "sub_agent_type": sub_agent_type or self.config.default_sub_agent
            }
            
            logger.debug(f"Conversa {conversation_id} iniciada", 
                        memories=len(relevant_context), 
                        patterns=len(applicable_patterns))
            
            return result
            
        except Exception as e:
            logger.error(f"Erro ao processar início da conversa {conversation_id}: {e}")
            return {
                "conversation_id": conversation_id,
                "relevant_context": [],
                "applicable_patterns": [],
                "error": str(e)
            }
    
    async def apply_pattern(
        self,
        conversation_id: str,
        pattern_id: str,
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Aplica um padrão específico na conversa
        
        Args:
            conversation_id: ID da conversa
            pattern_id: ID do padrão a aplicar
            context: Contexto atual da conversa
            
        Returns:
            Resultado da aplicação do padrão
        """
        try:
            if conversation_id not in self.active_conversations:
                raise ValueError(f"Conversa {conversation_id} não encontrada")
            
            # Aplicar padrão via Behavior Service
            result = await self.behavior_service.apply_pattern(
                pattern_id=pattern_id,
                context=context,
                conversation_id=conversation_id
            )
            
            # Registrar aplicação do padrão
            self.active_conversations[conversation_id]["patterns_applied"].append({
                "pattern_id": pattern_id,
                "applied_at": datetime.now(),
                "result": result
            })
            
            # Registrar métricas de sucesso
            if self.config.metrics_collection_enabled:
                from .metrics_service import MetricType
                success_rate = 1.0 if result.get("success", False) else 0.0
                await self.metrics_service.record_metric(
                    MetricType.SUCCESS_RATE,
                    success_rate,
                    context={"pattern_id": pattern_id},
                    agent_type=self.active_conversations[conversation_id]["sub_agent_type"]
                )
            
            logger.debug(f"Padrão {pattern_id} aplicado na conversa {conversation_id}")
            return result
            
        except Exception as e:
            logger.error(f"Erro ao aplicar padrão {pattern_id} na conversa {conversation_id}: {e}")
            return {"success": False, "error": str(e)}
    
    async def process_conversation_end(
        self,
        conversation_id: str,
        final_context: Dict[str, Any],
        outcome: str = "completed"
    ) -> Dict[str, Any]:
        """
        Processa fim de conversa e inicia aprendizado
        
        Args:
            conversation_id: ID da conversa
            final_context: Contexto final da conversa
            outcome: Resultado da conversa ("completed", "abandoned", etc.)
            
        Returns:
            Resultado do processamento e aprendizado
        """
        try:
            if conversation_id not in self.active_conversations:
                logger.warning(f"Conversa {conversation_id} não encontrada para finalização")
                return {"success": False, "error": "Conversation not found"}
            
            conversation_data = self.active_conversations[conversation_id]
            conversation_data.update({
                "end_time": datetime.now(),
                "final_context": final_context,
                "outcome": outcome
            })
            
            # Armazenar memória da conversa (assíncrono se habilitado)
            if self.config.async_processing_enabled:
                # Processar assincronamente
                await self.async_processor.queue_memory_storage({
                    "conversation_id": conversation_id,
                    "content": final_context.get("full_conversation", ""),
                    "metadata": {
                        "outcome": outcome,
                        "sub_agent_type": conversation_data["sub_agent_type"],
                        "patterns_applied": len(conversation_data["patterns_applied"])
                    }
                })
            else:
                # Processar sincronamente
                await self.memory_service.store_memory(
                    content=final_context.get("full_conversation", ""),
                    conversation_id=conversation_id,
                    metadata={
                        "outcome": outcome,
                        "sub_agent_type": conversation_data["sub_agent_type"]
                    }
                )
            
            # Iniciar análise de padrões (sempre assíncrono)
            learning_task = asyncio.create_task(
                self._analyze_conversation_for_learning(conversation_id, conversation_data)
            )
            
            # Calcular métricas da conversa
            duration = (conversation_data["end_time"] - conversation_data["start_time"]).total_seconds()
            
            if self.config.metrics_collection_enabled:
                from .metrics_service import MetricType
                await self.metrics_service.record_metric(
                    MetricType.RESPONSE_TIME,
                    duration,
                    context={"outcome": outcome},
                    agent_type=conversation_data["sub_agent_type"]
                )
            
            # Limpar conversa ativa
            del self.active_conversations[conversation_id]
            
            result = {
                "conversation_id": conversation_id,
                "outcome": outcome,
                "duration_seconds": duration,
                "patterns_applied": len(conversation_data["patterns_applied"]),
                "learning_initiated": True
            }
            
            logger.info(f"Conversa {conversation_id} finalizada", 
                       outcome=outcome, 
                       duration=f"{duration:.2f}s")
            
            return result
            
        except Exception as e:
            logger.error(f"Erro ao processar fim da conversa {conversation_id}: {e}")
            return {"success": False, "error": str(e)}
    
    async def _analyze_conversation_for_learning(
        self,
        conversation_id: str,
        conversation_data: Dict[str, Any]
    ):
        """
        Analisa conversa para aprendizado de padrões (execução assíncrona)
        
        Args:
            conversation_id: ID da conversa
            conversation_data: Dados completos da conversa
        """
        try:
            # Analisar padrões na conversa
            patterns_detected = await self.learning_service.analyze_conversation_patterns(
                conversation_data=conversation_data,
                sub_agent_type=conversation_data["sub_agent_type"]
            )
            
            # Processar cada padrão detectado
            for pattern in patterns_detected:
                # Avaliar se padrão deve ser aprovado
                approval_result = await self.supervisor_service.evaluate_learning(
                    pattern_data=pattern,
                    confidence_threshold=self.config.min_pattern_confidence
                )
                
                if approval_result.get("approved", False):
                    # Registrar padrão aprovado
                    await self.behavior_service.register_new_pattern(pattern)
                    
                    # Registrar métrica de aprendizado
                    if self.config.metrics_collection_enabled:
                        from .metrics_service import MetricType
                        await self.metrics_service.record_metric(
                            MetricType.LEARNING_ACCURACY,
                            pattern.get("confidence", 0.0),
                            context={"pattern_type": pattern.get("category", "unknown")},
                            agent_type=conversation_data["sub_agent_type"]
                        )
                    
                    logger.info(f"Novo padrão aprendido da conversa {conversation_id}", 
                               pattern_id=pattern.get("id"),
                               confidence=pattern.get("confidence"))
            
        except Exception as e:
            logger.error(f"Erro na análise de aprendizado da conversa {conversation_id}: {e}")
    
    async def get_system_status(self) -> Dict[str, Any]:
        """
        Obtém status completo do sistema SICC
        
        Returns:
            Status detalhado de todos os componentes
        """
        try:
            # Obter estatísticas de performance
            performance_stats = await self.metrics_service.get_performance_stats(
                time_window_hours=24
            )
            
            # Obter relatório de inteligência
            intelligence_report = await self.metrics_service.generate_intelligence_report()
            
            # Status dos serviços
            services_status = {
                "memory_service": await self.memory_service.get_status(),
                "learning_service": await self.learning_service.get_status(),
                "behavior_service": await self.behavior_service.get_status(),
                "supervisor_service": await self.supervisor_service.get_status(),
                "async_processor": await self.async_processor.get_status()
            }
            
            status = {
                "sicc_initialized": self.is_initialized,
                "active_conversations": len(self.active_conversations),
                "configuration": self.config.__dict__,
                "services_status": services_status,
                "performance_stats": performance_stats,
                "intelligence_report": intelligence_report.to_dict(),
                "timestamp": datetime.now().isoformat()
            }
            
            return status
            
        except Exception as e:
            logger.error(f"Erro ao obter status do sistema: {e}")
            return {
                "sicc_initialized": self.is_initialized,
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
    
    async def cleanup_old_data(self) -> Dict[str, Any]:
        """
        Executa limpeza de dados antigos em todos os serviços
        
        Returns:
            Resultado da limpeza
        """
        try:
            logger.info("Iniciando limpeza de dados antigos...")
            
            # Limpeza de memórias antigas
            memory_cleanup = await self.memory_service.cleanup_old_memories()
            
            # Limpeza de padrões não utilizados
            behavior_cleanup = await self.behavior_service.cleanup_unused_patterns()
            
            # Limpeza de métricas antigas
            metrics_cleanup = await self.metrics_service.cleanup_old_metrics()
            
            result = {
                "memory_cleanup": memory_cleanup,
                "behavior_cleanup": behavior_cleanup,
                "metrics_cleanup": metrics_cleanup,
                "timestamp": datetime.now().isoformat()
            }
            
            logger.info("Limpeza de dados concluída", result=result)
            return result
            
        except Exception as e:
            logger.error(f"Erro na limpeza de dados: {e}")
            return {"error": str(e)}
    
    async def process_message(
        self,
        message: str,
        user_id: str,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Processa uma mensagem usando o sistema SICC completo
        
        Args:
            message: Mensagem do usuário
            user_id: ID único do usuário
            context: Contexto adicional (plataforma, histórico, etc.)
            
        Returns:
            Resposta processada pelo sistema SICC
        """
        try:
            if not self.is_initialized:
                await self.initialize()
            
            # Usar user_id como conversation_id para WhatsApp
            conversation_id = f"whatsapp_{user_id}"
            
            # Preparar contexto da mensagem
            user_context = {
                "message": message,
                "user_id": user_id,
                "platform": context.get("platform", "whatsapp") if context else "whatsapp",
                "timestamp": datetime.now().isoformat()
            }
            
            # Se é uma nova conversa, inicializar
            if conversation_id not in self.active_conversations:
                await self.process_conversation_start(
                    conversation_id=conversation_id,
                    user_context=user_context,
                    sub_agent_type="sales_consultant"  # Tipo específico para vendas
                )
            
            # Buscar padrões aplicáveis para a mensagem atual
            applicable_patterns = await self.behavior_service.find_applicable_patterns(
                message=message,
                context=user_context
            )
            
            # Gerar resposta usando AI Service
            from ..ai_service import get_ai_service
            ai_service = get_ai_service()
            
            # Construir prompt com contexto SICC
            relevant_memories = self.active_conversations[conversation_id].get("memories_retrieved", [])
            
            prompt = self._build_sicc_prompt(
                message=message,
                user_context=user_context,
                memories=relevant_memories,
                patterns=applicable_patterns
            )
            
            # Gerar resposta
            ai_response = await ai_service.generate_text(
                prompt=prompt,
                max_tokens=500,
                temperature=0.7
            )
            
            response_text = ai_response.get('text', 'Desculpe, não consegui processar sua mensagem.')
            
            # Aplicar padrões relevantes se houver
            if applicable_patterns:
                for pattern in applicable_patterns[:2]:  # Máximo 2 padrões por mensagem
                    pattern_result = await self.apply_pattern(
                        conversation_id=conversation_id,
                        pattern_id=pattern.get('id'),
                        context=user_context
                    )
                    
                    # Se padrão modificou a resposta, usar a nova
                    if pattern_result.get('success') and pattern_result.get('modified_response'):
                        response_text = pattern_result['modified_response']
            
            # Registrar métricas
            if self.config.metrics_collection_enabled:
                from .metrics_service import MetricType
                await self.metrics_service.record_metric(
                    MetricType.RESPONSE_TIME,
                    1.0,  # Placeholder - seria tempo real de processamento
                    context={"platform": "whatsapp"},
                    agent_type="sales_consultant"
                )
            
            # Atualizar contexto da conversa
            self.active_conversations[conversation_id]["last_message"] = {
                "user_message": message,
                "bot_response": response_text,
                "timestamp": datetime.now(),
                "patterns_applied": len(applicable_patterns)
            }
            
            return {
                "response": response_text,
                "conversation_id": conversation_id,
                "patterns_applied": len(applicable_patterns),
                "ai_provider": ai_response.get('provider', 'unknown'),
                "success": True
            }
            
        except Exception as e:
            logger.error(f"Erro ao processar mensagem: {e}")
            
            # Em caso de falha técnica total, tentar IA básica sem SICC
            try:
                from ..ai_service import get_ai_service
                ai_service = get_ai_service()
                
                # Prompt básico apenas para emergência técnica
                emergency_prompt = f"""Você é a BIA, consultora de colchões magnéticos terapêuticos da Slim Quality.

Responda de forma natural e consultiva à mensagem: "{message}"

Seja empática, educativa e focada em ajudar o cliente com problemas de saúde e sono."""
                
                emergency_response = await ai_service.generate_text(
                    prompt=emergency_prompt,
                    max_tokens=300,
                    temperature=0.7
                )
                
                return {
                    "response": emergency_response.get('text', 'Desculpe, estou com dificuldades técnicas. Pode tentar novamente?'),
                    "conversation_id": f"whatsapp_{user_id}",
                    "patterns_applied": 0,
                    "ai_provider": f"emergency_{emergency_response.get('provider', 'unknown')}",
                    "success": False,
                    "error": str(e)
                }
                
            except Exception as emergency_error:
                logger.error(f"Falha total do sistema: {emergency_error}")
                
                # Apenas em caso de falha TOTAL de todos os sistemas
                return {
                    "response": "Desculpe, estou com dificuldades técnicas no momento. Pode tentar novamente em alguns instantes?",
                    "conversation_id": f"whatsapp_{user_id}",
                    "patterns_applied": 0,
                    "ai_provider": "system_failure",
                    "success": False,
                    "error": f"SICC: {str(e)}, Emergency: {str(emergency_error)}"
                }
    
    def _build_sicc_prompt(
        self,
        message: str,
        user_context: Dict[str, Any],
        memories: List[Dict[str, Any]],
        patterns: List[Dict[str, Any]]
    ) -> str:
        """
        Constrói prompt inteligente usando contexto SICC
        
        Args:
            message: Mensagem atual do usuário
            user_context: Contexto do usuário
            memories: Memórias relevantes recuperadas
            patterns: Padrões aplicáveis
            
        Returns:
            Prompt otimizado para IA
        """
        
        # Base do prompt - identidade da BIA
        prompt = """Você é a BIA, consultora especializada em colchões magnéticos terapêuticos da Slim Quality.

PRODUTOS DISPONÍVEIS:
- Solteiro (88x188x28cm): R$ 3.190,00
- Padrão (138x188x28cm): R$ 3.290,00 (MAIS VENDIDO)
- Queen (158x198x30cm): R$ 3.490,00
- King (193x203x30cm): R$ 4.890,00

TECNOLOGIAS (todos os modelos):
- Sistema Magnético (240 ímãs de 800 Gauss)
- Infravermelho Longo
- Energia Bioquântica
- Vibromassagem (8 motores)
- Densidade Progressiva
- Cromoterapia
- Perfilado High-Tech
- Tratamento Sanitário

ABORDAGEM:
- Seja consultiva, não vendedora
- Foque em resolver problemas de saúde
- Pergunte sobre dores, sono, circulação
- Apresente preço como "menos que uma pizza por dia"
- Seja empática e educativa

"""
        
        # Adicionar contexto de memórias se houver
        if memories:
            prompt += "\nCONTEXTO DE CONVERSAS ANTERIORES:\n"
            for memory in memories[:3]:  # Máximo 3 memórias
                prompt += f"- {memory.get('content', '')[:100]}...\n"
        
        # Adicionar padrões aprendidos se houver
        if patterns:
            prompt += "\nPADRÕES APRENDIDOS APLICÁVEIS:\n"
            for pattern in patterns[:2]:  # Máximo 2 padrões
                prompt += f"- {pattern.get('description', 'Padrão sem descrição')}\n"
        
        # Adicionar mensagem atual
        prompt += f"\nMENSAGEM DO CLIENTE: {message}\n\n"
        prompt += "RESPONDA de forma natural, consultiva e focada em ajudar o cliente:"
        
        return prompt
    
    async def shutdown(self):
        """
        Desliga o sistema SICC graciosamente
        """
        try:
            logger.info("Iniciando shutdown do sistema SICC...")
            
            # Finalizar conversas ativas
            for conversation_id in list(self.active_conversations.keys()):
                await self.process_conversation_end(
                    conversation_id,
                    {"full_conversation": "Sistema sendo desligado"},
                    outcome="system_shutdown"
                )
            
            # Parar processamento assíncrono
            if self.config.async_processing_enabled:
                await self.async_processor.stop_workers()
            
            # Registrar shutdown nas métricas
            if self.config.metrics_collection_enabled:
                from .metrics_service import MetricType
                await self.metrics_service.record_metric(
                    MetricType.SYSTEM_HEALTH,
                    0.0,
                    context={"event": "sicc_shutdown"}
                )
            
            self.is_initialized = False
            logger.info("Sistema SICC desligado com sucesso")
            
        except Exception as e:
            logger.error(f"Erro durante shutdown do sistema SICC: {e}")


# Singleton instance
_sicc_service_instance: Optional[SICCService] = None


def get_sicc_service(config: Optional[SICCConfig] = None) -> SICCService:
    """
    Obtém instância singleton do SICCService
    
    Args:
        config: Configuração personalizada (apenas na primeira chamada)
        
    Returns:
        Instância do SICCService
    """
    global _sicc_service_instance
    
    if _sicc_service_instance is None:
        _sicc_service_instance = SICCService(config)
        logger.info("SICCService singleton criado")
    
    return _sicc_service_instance


# Função auxiliar para reset (útil para testes)
def reset_sicc_service():
    """Reset da instância singleton (usado principalmente em testes)"""
    global _sicc_service_instance
    _sicc_service_instance = None
    logger.debug("SICCService singleton resetado")