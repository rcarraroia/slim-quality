"""
Chat endpoint genérico
"""
import structlog
from fastapi import APIRouter, HTTPException
from langchain_core.messages import HumanMessage

from ..models.chat import ChatRequest, ChatResponse
from ..graph.builder import build_graph

logger = structlog.get_logger(__name__)
router = APIRouter()

# Inicializar graph (singleton)
graph = build_graph()


@router.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Endpoint genérico para testar o agente sem WhatsApp.
    
    Args:
        request: Mensagem do usuário
        
    Returns:
        Resposta do agente com intent e dados
        
    Raises:
        HTTPException: Se houver erro no processamento
    """
    logger.info(f"chat: Recebida mensagem de {request.lead_id}")
    
    try:
        # Configuração com lead_id para checkpointer
        config = {"configurable": {"lead_id": request.lead_id}}
        
        # Invocar graph
        result = await graph.ainvoke(
            {
                "messages": [HumanMessage(content=request.message)],
                "lead_id": request.lead_id,
                "context": {},
                "current_intent": "",
                "next_action": "",
                "lead_data": {},
                "products_recommended": []
            },
            config=config
        )
        
        # Extrair resposta
        response_message = result["messages"][-1].content
        intent = result.get("current_intent", "unknown")
        lead_data = result.get("lead_data", {})
        products = result.get("products_recommended", [])
        
        logger.info(f"chat: Resposta gerada com sucesso. Intent: {intent}")
        
        return ChatResponse(
            response=response_message,
            intent=intent,
            lead_data=lead_data if lead_data else None,
            products_recommended=products if products else None
        )
        
    except Exception as e:
        logger.error(f"chat: Erro ao processar mensagem: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao processar mensagem: {str(e)}"
        )
