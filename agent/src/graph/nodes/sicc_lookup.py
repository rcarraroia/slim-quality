"""
SICC Lookup Node - Busca contexto relevante via Memory Service
"""
import structlog
from typing import List, Dict, Any

from ..state import AgentState
from ...services.sicc.memory_service import get_memory_service

logger = structlog.get_logger(__name__)


async def sicc_lookup_node(state: AgentState) -> AgentState:
    """
    Busca contexto relevante das memórias armazenadas para enriquecer a conversação.
    
    Utiliza o Memory Service para:
    1. Buscar memórias similares baseadas na última mensagem
    2. Recuperar contexto relevante de conversas anteriores
    3. Buscar histórico do cliente (compras, interações)
    4. Buscar padrões aplicáveis
    5. Adicionar contexto ao estado para uso pelos próximos nodes
    
    Args:
        state: Estado atual da conversação
        
    Returns:
        Estado atualizado com contexto SICC completo
    """
    logger.info("sicc_lookup_node: Iniciando busca de contexto relevante")
    
    try:
        # Obter Memory Service
        memory_service = get_memory_service()
        
        # Última mensagem do usuário para busca
        if not state["messages"]:
            logger.info("sicc_lookup_node: Nenhuma mensagem para buscar contexto")
            return state
        
        last_message = state["messages"][-1]
        query_text = last_message.content
        customer_id = state.get("lead_id")
        
        logger.info(f"sicc_lookup_node: Buscando contexto para: '{query_text[:50]}...'")
        
        # 1. Buscar memórias similares
        similar_memories = await memory_service.search_similar(
            query_text=query_text,
            limit=5,
            similarity_threshold=0.7,
            filters={"customer_id": customer_id} if customer_id else {}
        )
        
        # 2. Buscar contexto relevante de conversas anteriores
        relevant_context = await memory_service.get_relevant_context(
            conversation_id=state.get("lead_id", "unknown"),
            query=query_text,
            max_memories=3
        )
        
        # 3. Buscar histórico do cliente
        customer_context = {}
        if customer_id:
            try:
                from ...services.customer_history_service import get_customer_history_service
                customer_service = get_customer_history_service()
                customer_context = await customer_service.get_customer_context(customer_id)
                logger.info(f"sicc_lookup_node: Contexto do cliente obtido - Retornando: {customer_context.get('is_returning_customer', False)}")
            except Exception as e:
                logger.warning(f"sicc_lookup_node: Erro ao buscar contexto do cliente: {e}")
                customer_context = {
                    "is_returning_customer": False,
                    "customer_name": None,
                    "has_purchase_history": False
                }
        
        # 4. Buscar padrões aplicáveis
        patterns = []
        try:
            from ...services.sicc.behavior_service import get_behavior_service
            behavior_service = get_behavior_service()
            patterns = await behavior_service.find_applicable_patterns(
                message=query_text,
                context={"user_id": customer_id, "intent": state.get("current_intent")}
            )
            logger.info(f"sicc_lookup_node: {len(patterns)} padrões aplicáveis encontrados")
        except Exception as e:
            logger.warning(f"sicc_lookup_node: Erro ao buscar padrões: {e}")
        
        # Preparar contexto SICC completo
        sicc_context = {
            "memories": similar_memories,
            "relevant_context": relevant_context,
            "patterns": patterns,
            "lookup_query": query_text,
            "memories_found": len(similar_memories),
            "context_found": len(relevant_context),
            "patterns_found": len(patterns)
        }
        
        logger.info(f"sicc_lookup_node: Contexto completo - {len(similar_memories)} memórias, {len(patterns)} padrões, cliente retornando: {customer_context.get('is_returning_customer', False)}")
        
        # Atualizar estado com contexto SICC
        return {
            **state,
            "sicc_context": sicc_context,
            "sicc_patterns": patterns,
            "customer_context": customer_context
        }
        
    except Exception as e:
        logger.error(f"sicc_lookup_node: Erro ao buscar contexto: {e}")
        
        # Em caso de erro, continuar sem contexto SICC
        return {
            **state,
            "sicc_context": {
                "error": str(e),
                "memories": [],
                "relevant_context": [],
                "patterns": [],
                "memories_found": 0,
                "context_found": 0,
                "patterns_found": 0
            },
            "sicc_patterns": [],
            "customer_context": {}
        }


async def sicc_context_formatter(memories: List[Dict[str, Any]], context: List[str]) -> str:
    """
    Formata memórias e contexto em texto legível para uso pelos nodes.
    
    Args:
        memories: Lista de memórias similares
        context: Lista de contextos relevantes
        
    Returns:
        String formatada com o contexto
    """
    if not memories and not context:
        return ""
    
    formatted_parts = []
    
    if memories:
        formatted_parts.append("=== MEMÓRIAS SIMILARES ===")
        for i, memory in enumerate(memories[:3], 1):  # Máximo 3 memórias
            content = memory.get("content", "")[:200]  # Limitar tamanho
            formatted_parts.append(f"{i}. {content}...")
    
    if context:
        formatted_parts.append("\n=== CONTEXTO RELEVANTE ===")
        for i, ctx in enumerate(context[:2], 1):  # Máximo 2 contextos
            formatted_parts.append(f"{i}. {ctx[:150]}...")
    
    return "\n".join(formatted_parts)