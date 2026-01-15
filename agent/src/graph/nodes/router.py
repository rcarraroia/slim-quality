"""
Router Node - Detecta intenção da mensagem
"""
import structlog
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import SystemMessage, HumanMessage

from ..state import AgentState
from ...config import get_settings

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
    
    # Obter configurações
    settings = get_settings()
    
    # Inicializar Claude
    llm = ChatAnthropic(
        model=settings.claude_model,
        api_key=settings.claude_api_key,
        temperature=0.3
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
    
    system_prompt = f"""Você é um classificador de intenções para vendas de colchões da Slim Quality.

{context_info}

Classifique a mensagem do usuário em UMA das seguintes categorias:

1. **discovery**: 
   - Lead novo fazendo primeiro contato
   - Perguntas gerais sobre produtos
   - Qualificação inicial
   - Exemplos: "Olá", "Quero saber sobre colchões", "Tenho dor nas costas"

2. **sales**: 
   - Interesse claro em comprar
   - Negociação de preço ou condições
   - Comparação de produtos
   - Exemplos: "Quanto custa?", "Qual o melhor colchão para mim?", "Aceita parcelamento?"

3. **support**: 
   - Dúvidas sobre garantia, frete, troca
   - Suporte pós-venda
   - Problemas com pedido
   - Exemplos: "Como funciona a garantia?", "Onde está meu pedido?", "Posso trocar?"

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

