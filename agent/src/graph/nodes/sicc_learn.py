"""
SICC Learn Node - Identificação de padrões via Learning Service
"""
import structlog
from typing import List, Dict, Any

from ..state import AgentState
from ...services.sicc.learning_service import get_learning_service

logger = structlog.get_logger(__name__)


async def sicc_learn_node(state: AgentState) -> AgentState:
    """
    Analisa conversas finalizadas para identificar padrões de aprendizado.
    
    Utiliza o Learning Service para:
    1. Analisar padrões de conversação quando conversa é finalizada
    2. Detectar padrões recorrentes baseados em similaridade
    3. Extrair templates de resposta para padrões identificados
    4. Executar em background sem bloquear fluxo da conversação
    
    Args:
        state: Estado atual da conversação
        
    Returns:
        Estado atualizado com informações de aprendizado em state["context"]["sicc_learning"]
    """
    logger.info("sicc_learn_node: Iniciando análise de padrões de aprendizado")
    
    try:
        # Obter Learning Service
        learning_service = get_learning_service()
        
        # Verificar se há mensagens suficientes para análise
        if len(state["messages"]) < 3:
            logger.info("sicc_learn_node: Poucas mensagens para análise de padrões")
            return _add_learning_context(state, {
                "analysis_performed": False,
                "reason": "insufficient_messages",
                "patterns_detected": [],
                "learning_opportunities": 0
            })
        
        # Preparar dados da conversa para análise
        conversation_data = _prepare_conversation_data(state)
        
        logger.info(f"sicc_learn_node: Analisando conversa com {len(state['messages'])} mensagens")
        
        # Analisar padrões de conversação
        patterns = await learning_service.analyze_conversation_patterns(
            conversation_data=conversation_data,
            min_confidence=0.6  # Threshold mínimo para detectar padrões
        )
        
        # Calcular scores de confiança para padrões detectados
        pattern_scores = []
        for pattern in patterns:
            confidence_score = await learning_service.calculate_confidence_score(
                pattern_data=pattern,
                historical_data=conversation_data
            )
            
            pattern_scores.append({
                "pattern": pattern,
                "confidence": confidence_score,
                "actionable": confidence_score >= 0.7  # Threshold para ação
            })
        
        # Extrair templates de resposta para padrões com alta confiança
        response_templates = []
        for pattern_score in pattern_scores:
            if pattern_score["actionable"]:
                template = await learning_service.extract_response_template(
                    pattern_data=pattern_score["pattern"]
                )
                if template:
                    response_templates.append(template)
        
        # Preparar contexto de aprendizado
        learning_context = {
            "analysis_performed": True,
            "patterns_detected": len(patterns),
            "high_confidence_patterns": len([p for p in pattern_scores if p["actionable"]]),
            "response_templates_extracted": len(response_templates),
            "learning_opportunities": len(pattern_scores),
            "patterns_summary": [
                {
                    "type": p["pattern"].get("type", "unknown"),
                    "confidence": p["confidence"],
                    "actionable": p["actionable"]
                }
                for p in pattern_scores[:5]  # Máximo 5 para não sobrecarregar
            ]
        }
        
        logger.info(f"sicc_learn_node: Análise concluída - {len(patterns)} padrões detectados, {len(response_templates)} templates extraídos")
        
        return _add_learning_context(state, learning_context)
        
    except Exception as e:
        logger.error(f"sicc_learn_node: Erro na análise de padrões: {e}")
        
        # Em caso de erro, continuar sem bloquear o fluxo
        error_context = {
            "analysis_performed": False,
            "error": str(e),
            "patterns_detected": 0,
            "learning_opportunities": 0
        }
        
        return _add_learning_context(state, error_context)


def _prepare_conversation_data(state: AgentState) -> Dict[str, Any]:
    """
    Prepara dados da conversa para análise pelo Learning Service.
    
    Args:
        state: Estado atual da conversação
        
    Returns:
        Dados estruturados da conversa
    """
    messages_data = []
    
    for i, message in enumerate(state["messages"]):
        message_data = {
            "index": i,
            "content": message.content,
            "type": getattr(message, 'type', 'unknown'),
            "timestamp": getattr(message, 'additional_kwargs', {}).get('timestamp'),
            "role": "user" if hasattr(message, 'content') and i % 2 == 0 else "assistant"
        }
        messages_data.append(message_data)
    
    conversation_data = {
        "conversation_id": state.get("lead_id", "unknown"),
        "messages": messages_data,
        "intent": state.get("current_intent", "unknown"),
        "lead_data": state.get("lead_data", {}),
        "products_recommended": state.get("products_recommended", []),
        "conversation_length": len(state["messages"]),
        "metadata": {
            "next_action": state.get("next_action"),
            "context_keys": list(state.get("context", {}).keys())
        }
    }
    
    return conversation_data


def _add_learning_context(state: AgentState, learning_data: Dict[str, Any]) -> AgentState:
    """
    Adiciona contexto de aprendizado ao estado.
    
    Args:
        state: Estado atual
        learning_data: Dados de aprendizado para adicionar
        
    Returns:
        Estado atualizado
    """
    updated_context = state.get("context", {})
    updated_context["sicc_learning"] = learning_data
    
    return {
        **state,
        "context": updated_context
    }


async def sicc_trigger_learning_analysis(conversation_id: str, messages: List[Any]) -> bool:
    """
    Função auxiliar para disparar análise de aprendizado de forma assíncrona.
    
    Pode ser chamada quando uma conversa é finalizada para análise em background.
    
    Args:
        conversation_id: ID da conversa
        messages: Lista de mensagens da conversa
        
    Returns:
        True se análise foi iniciada com sucesso
    """
    try:
        logger.info(f"sicc_trigger_learning_analysis: Iniciando análise assíncrona para conversa {conversation_id}")
        
        # Esta função pode ser expandida para usar queues/workers em implementações futuras
        # Por enquanto, apenas registra que a análise deveria ser feita
        
        learning_service = get_learning_service()
        
        # Preparar dados básicos
        conversation_data = {
            "conversation_id": conversation_id,
            "messages": [{"content": msg.content if hasattr(msg, 'content') else str(msg)} for msg in messages],
            "analysis_timestamp": "now"
        }
        
        # Análise básica (pode ser expandida para processamento assíncrono real)
        patterns = await learning_service.analyze_conversation_patterns(conversation_data)
        
        logger.info(f"sicc_trigger_learning_analysis: {len(patterns)} padrões identificados para conversa {conversation_id}")
        
        return True
        
    except Exception as e:
        logger.error(f"sicc_trigger_learning_analysis: Erro na análise assíncrona: {e}")
        return False