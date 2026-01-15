"""
Router Node - Detecta intenção da mensagem
"""
import structlog
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import SystemMessage, HumanMessage

from ..state import AgentState
from ...services.config_cache import get_sub_agent_config

logger = structlog.get_logger(__name__)


async def router_node(state: AgentState) -> AgentState:
    """
    Analisa última mensagem e detecta intenção usando contexto SICC.
    
    Classifica a mensagem em uma das categorias:
    - discovery: Lead novo, qualificação inicial
    - sales: Interesse em comprar, negociação
    - support: Dúvidas, suporte pós-venda
    
    Usa contexto SICC para classificação mais precisa:
    - Histórico do cliente
    - Memórias relevantes
    - Padrões aplicáveis
    
    Args:
        state: Estado atual da conversação
        
    Returns:
        Estado atualizado com current_intent e next_action
    """
    logger.info("router_node: Analisando intenção da mensagem com contexto SICC")
    
    # Carregar configuração do banco (com cache)
    try:
        config = await get_sub_agent_config('router')
        logger.info("router_node: Config carregada", model=config.model, temperature=config.temperature)
    except Exception as e:
        logger.error("router_node: Erro ao carregar config, usando fallback", error=str(e))
        # Fallback já está implementado em get_sub_agent_config
        config = await get_sub_agent_config('router')
    
    # Inicializar Claude com config do banco
    llm = ChatAnthropic(
        model=config.model,
        temperature=config.temperature
    )
    
    # Obter contexto SICC
    sicc_context = state.get("sicc_context", {})
    customer_context = state.get("customer_context", {})
    
    # Construir prompt com contexto SICC
    context_info = f"""
CONTEXTO DO CLIENTE:
- Cliente retornando: {customer_context.get('is_returning_customer', False)}
- Nome: {customer_context.get('customer_name', 'Desconhecido')}
- Histórico de compras: {customer_context.get('has_purchase_history', False)}

CONTEXTO SICC:
- Memórias relevantes encontradas: {sicc_context.get('memories_found', 0)}
- Padrões aplicáveis: {sicc_context.get('patterns_found', 0)}
"""
    
    # Usar system_prompt do banco
    system_prompt = f"""{config.system_prompt}

{context_info}

Use o contexto do cliente para classificar melhor. Se é cliente retornando com compra, provavelmente é support.

Retorne APENAS uma palavra: discovery, sales ou support"""
    
    # Última mensagem do usuário
    last_message = state["messages"][-1]
    
    try:
        # Invocar Claude
        response = await llm.ainvoke([
            SystemMessage(content=system_prompt),
            HumanMessage(content=last_message.content)
        ])
        
        # Extrair intent
        intent = response.content.strip().lower()
        
        # Validar intent
        if intent not in ["discovery", "sales", "support"]:
            logger.warning(f"Intent inválido retornado: {intent}, usando 'discovery' como fallback")
            intent = "discovery"
        
        logger.info(f"router_node: Intent detectado: {intent} (com contexto SICC)")
        
        # Atualizar estado
        return {
            **state,
            "current_intent": intent,
            "next_action": f"{intent}_node"
        }
        
    except Exception as e:
        logger.error(f"router_node: Erro ao classificar intent: {e}")
        # Fallback para discovery em caso de erro
        return {
            **state,
            "current_intent": "discovery",
            "next_action": "discovery_node"
        }

