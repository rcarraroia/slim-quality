"""
Sales Node - Recomendação de produtos e vendas
"""
import structlog
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import SystemMessage, AIMessage

from ..state import AgentState
from ...config import get_settings
from ...services.supabase_client import get_products

logger = structlog.get_logger(__name__)


def format_products(products: list) -> str:
    """
    Formata lista de produtos para o prompt.
    
    Args:
        products: Lista de produtos do Supabase
        
    Returns:
        String formatada com produtos
    """
    if not products:
        return "Nenhum produto disponível no momento."
    
    formatted = []
    for i, product in enumerate(products, 1):
        # Extrair tecnologias
        technologies = []
        if product.get("technologies"):
            technologies = [
                tech["technology"]["name"] 
                for tech in product["technologies"]
            ]
        
        formatted.append(f"""
{i}. **{product['name']}**
   - Preço: R$ {product['price']:.2f}
   - Firmeza: {product.get('firmness', 'N/A')}
   - Dimensões: {product.get('dimensions', 'N/A')}
   - Tecnologias: {', '.join(technologies) if technologies else 'N/A'}
   - Descrição: {product.get('description', 'N/A')[:100]}...
""")
    
    return "\n".join(formatted)


async def sales_node(state: AgentState) -> AgentState:
    """
    Recomenda produtos e negocia vendas.
    
    Responsabilidades:
    - Consultar produtos no Supabase baseado no perfil do lead
    - Recomendar top 3 produtos
    - Negociar condições de pagamento
    - Responder dúvidas sobre produtos
    
    Args:
        state: Estado atual da conversação
        
    Returns:
        Estado atualizado com products_recommended e nova mensagem
    """
    logger.info("sales_node: Iniciando recomendação de produtos")
    
    # Obter dados do lead
    lead_data = state.get("lead_data", {})
    problema_saude = lead_data.get("problema_saude")
    
    # Consultar produtos
    filters = {}
    if problema_saude:
        filters["problem"] = problema_saude
        logger.info(f"sales_node: Filtrando por problema: {problema_saude}")
    else:
        # Sem filtro específico, pegar produtos médios
        filters["price_range"] = "medium"
    
    products = await get_products(filters)
    
    # Top 3 produtos
    top_products = products[:3] if products else []
    
    logger.info(f"sales_node: {len(top_products)} produtos selecionados para recomendação")
    
    # Inicializar Claude
    llm = ChatAnthropic(
        model=settings.claude_model,
        api_key=settings.claude_api_key,
        temperature=0.7
    )
    
    # Construir prompt de vendas
    nome = lead_data.get("nome", "")
    problem_description = {
        "dor_costas": "dor nas costas",
        "dor_coluna": "dor na coluna",
        "insonia": "insônia",
        "dor_cervical": "dor cervical",
        "dor_lombar": "dor lombar",
        "ma_postura": "má postura",
    }.get(problema_saude, "melhor qualidade de sono")
    
    system_prompt = f"""Você é BIA, vendedora especialista em colchões da Slim Quality.

Cliente: {nome if nome else 'Cliente'}
Problema identificado: {problem_description}

PRODUTOS DISPONÍVEIS:
{format_products(top_products)}

SUA MISSÃO:
1. Recomendar o MELHOR produto para o problema do cliente
2. Explicar POR QUE esse produto é ideal (tecnologias, firmeza, etc)
3. Mencionar condições de pagamento: até 12x sem juros
4. Destacar diferenciais: garantia 10 anos, frete grátis, 100 noites teste
5. Criar senso de urgência (estoque limitado, promoção)

ESTILO DE COMUNICAÇÃO:
- Consultiva, não agressiva
- Use emojis moderadamente
- Seja específica sobre benefícios
- Responda dúvidas com confiança
- Não force a venda, eduque o cliente

IMPORTANTE:
- Se o cliente perguntar sobre preço, seja transparente
- Se comparar produtos, destaque diferenças técnicas
- Se negociar, ofereça parcelamento, não desconto
"""
    
    try:
        # Invocar Claude com histórico completo
        response = await llm.ainvoke([
            SystemMessage(content=system_prompt),
            *state["messages"]
        ])
        
        logger.info("sales_node: Recomendação gerada com sucesso")
        
        # Atualizar estado
        return {
            **state,
            "messages": state["messages"] + [AIMessage(content=response.content)],
            "products_recommended": top_products
        }
        
    except Exception as e:
        logger.error(f"sales_node: Erro ao gerar recomendação: {e}")
        # Resposta de fallback
        fallback_message = "Desculpe, tive um problema ao buscar os produtos. Pode me dar um momento? 😅"
        return {
            **state,
            "messages": state["messages"] + [AIMessage(content=fallback_message)],
            "products_recommended": top_products
        }
