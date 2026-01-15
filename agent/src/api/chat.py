"""
Chat endpoint genérico
"""
import structlog
import asyncio
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
        
        # Integrar com SICC para análise de padrões (assíncrono)
        try:
            # Executar análise de padrões em background para não bloquear resposta
            asyncio.create_task(analyze_conversation_patterns_async(request.lead_id))
            logger.info(f"chat: Análise SICC iniciada para conversa {request.lead_id}")
        except Exception as sicc_error:
            # Não quebrar o chat se SICC falhar
            logger.warning(f"chat: Erro ao iniciar análise SICC: {sicc_error}")
        
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


async def analyze_conversation_patterns_async(conversation_id: str):
    """
    Executa análise de padrões SICC de forma assíncrona
    
    Args:
        conversation_id: ID da conversa para analisar
    """
    try:
        logger.info(f"SICC: Iniciando análise de padrões para conversa {conversation_id}")
        
        # Importar SICC service
        from ..services.sicc.sicc_service import get_sicc_service
        sicc_service = get_sicc_service()
        
        if not sicc_service.is_initialized:
            logger.warning("SICC: Serviço não inicializado, pulando análise")
            return
        
        # Executar análise via LearningService
        learning_service = sicc_service.learning_service
        patterns = await learning_service.analyze_conversation_patterns(conversation_id)
        
        if patterns:
            logger.info(f"SICC: {len(patterns)} padrões identificados na conversa {conversation_id}")
            
            # Gerar learning logs para padrões com alta confiança
            for pattern in patterns:
                if pattern.confidence >= 0.7:  # Apenas padrões com alta confiança
                    try:
                        # Buscar evidências (memórias relacionadas)
                        evidence = await learning_service._get_conversation_memories(conversation_id, 7)
                        
                        # Gerar learning log
                        learning_log = await learning_service.generate_learning_log(pattern, evidence)
                        
                        if learning_log:
                            logger.info(f"SICC: Learning log criado: {learning_log.id}")
                        
                    except Exception as log_error:
                        logger.error(f"SICC: Erro ao gerar learning log: {log_error}")
        else:
            logger.info(f"SICC: Nenhum padrão identificado na conversa {conversation_id}")
            
    except Exception as e:
        logger.error(f"SICC: Erro na análise de padrões: {e}")
        # Não propagar erro para não afetar o chat
