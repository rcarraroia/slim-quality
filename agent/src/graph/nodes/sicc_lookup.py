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
    3. Adicionar contexto ao estado para uso pelos próximos nodes
    
    Args:
        state: Estado atual da conversação
        
    Returns:
        Estado atualizado com contexto relevante em state["context"]["sicc_memories"]
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
        
        logger.info(f"sicc_lookup_node: Buscando contexto para: '{query_text[:50]}...'")
        
        # Buscar memórias similares
        # Usar lead_id se disponível, senão busca geral
        customer_id = state.get("lead_id")
        
        similar_memories = await memory_service.search_similar(
            query_text=query_text,
            limit=5,  # Máximo 5 memórias relevantes
            similarity_threshold=0.7,  # Apenas memórias bem similares
            filters={
                "customer_id": customer_id
            } if customer_id else {}
        )
        
        # Buscar contexto relevante de conversas anteriores
        relevant_context = await memory_service.get_relevant_context(
            conversation_id=state.get("lead_id", "unknown"),
            query=query_text,
            max_memories=3
        )
        
        # Preparar contexto para adicionar ao estado
        sicc_context = {
            "similar_memories": similar_memories,
            "relevant_context": relevant_context,
            "lookup_query": query_text,
            "memories_found": len(similar_memories),
            "context_found": len(relevant_context)
        }
        
        # Atualizar estado com contexto SICC
        updated_context = state.get("context", {})
        updated_context["sicc_memories"] = sicc_context
        
        logger.info(f"sicc_lookup_node: Contexto adicionado - {len(similar_memories)} memórias similares, {len(relevant_context)} contextos relevantes")
        
        return {
            **state,
            "context": updated_context
        }
        
    except Exception as e:
        logger.error(f"sicc_lookup_node: Erro ao buscar contexto: {e}")
        
        # Em caso de erro, continuar sem contexto SICC
        # Não bloquear o fluxo da conversação
        updated_context = state.get("context", {})
        updated_context["sicc_memories"] = {
            "error": str(e),
            "similar_memories": [],
            "relevant_context": [],
            "memories_found": 0,
            "context_found": 0
        }
        
        return {
            **state,
            "context": updated_context
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