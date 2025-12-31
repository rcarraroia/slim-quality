"""
Support Node - Suporte e atendimento
"""
import structlog
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import SystemMessage, AIMessage

from ..state import AgentState
from ...config import get_settings

logger = structlog.get_logger(__name__)


def detect_human_transfer(message_content: str) -> bool:
    """
    Detecta se a mensagem requer transferência para humano.
    
    Critérios:
    - Reclamações graves
    - Problemas complexos não resolvidos
    - Solicitação explícita de falar com humano
    
    Args:
        message_content: Conteúdo da mensagem do agente
        
    Returns:
        True se deve transferir, False caso contrário
    """
    transfer_keywords = [
        "transferir para humano",
        "falar com atendente",
        "preciso de ajuda humana",
        "não consigo resolver",
        "problema complexo",
        "reclamação grave"
    ]
    
    message_lower = message_content.lower()
    return any(keyword in message_lower for keyword in transfer_keywords)


async def support_node(state: AgentState) -> AgentState:
    """
    Responde dúvidas e fornece suporte.
    
    Responsabilidades:
    - Responder dúvidas sobre garantia, frete, troca, pagamento
    - Fornecer informações sobre políticas da empresa
    - Detectar necessidade de transferência para humano
    - Notificar via MCP quando necessário
    
    Args:
        state: Estado atual da conversação
        
    Returns:
        Estado atualizado com nova mensagem
    """
    logger.info("support_node: Fornecendo suporte")
    
    # Inicializar Claude
    llm = ChatAnthropic(
        model=settings.claude_model,
        api_key=settings.claude_api_key,
        temperature=0.5  # Temperatura baixa para respostas precisas
    )
    
    # Obter nome do lead se disponível
    lead_data = state.get("lead_data", {})
    nome = lead_data.get("nome", "")
    
    # Prompt de suporte
    system_prompt = f"""Você é BIA, assistente de suporte da Slim Quality.

Cliente: {nome if nome else 'Cliente'}

INFORMAÇÕES DA EMPRESA:

**Garantia:**
- 10 anos de garantia contra defeitos de fabricação
- Cobre: afundamento, deformação, quebra de molas
- Não cobre: desgaste natural, manchas, rasgos

**Frete:**
- GRÁTIS para todo o Brasil
- Prazo: 7-15 dias úteis (varia por região)
- Entrega rastreável

**Política de Troca:**
- 100 noites de teste em casa
- Se não gostar, devolvemos 100% do valor
- Coleta gratuita
- Sem perguntas, sem burocracia

**Pagamento:**
- Até 12x sem juros no cartão
- PIX (5% de desconto)
- Boleto bancário
- Aceita todos os cartões

**Contato:**
- WhatsApp: (11) 99999-9999
- Email: contato@slimquality.com.br
- Horário: Seg-Sex 9h-18h, Sáb 9h-13h

SUA MISSÃO:
1. Responder dúvidas com precisão
2. Ser empática e resolver problemas
3. Se não souber, seja honesta e ofereça transferir para humano
4. Tranquilizar o cliente sobre políticas generosas

QUANDO TRANSFERIR PARA HUMANO:
- Reclamações graves ou complexas
- Problemas que você não consegue resolver
- Cliente solicita explicitamente
- Questões financeiras específicas (reembolso, estorno)

ESTILO:
- Profissional mas amigável
- Use emojis moderadamente
- Seja clara e objetiva
- Demonstre empatia
"""
    
    try:
        # Invocar Claude com histórico completo
        response = await llm.ainvoke([
            SystemMessage(content=system_prompt),
            *state["messages"]
        ])
        
        logger.info("support_node: Resposta de suporte gerada")
        
        # Detectar se precisa transferir para humano
        needs_transfer = detect_human_transfer(response.content)
        
        if needs_transfer:
            logger.warning("support_node: Transferência para humano detectada")
            # TODO: Integrar com MCP tool para notificar humano
            # await mcp_gateway.execute_tool("notify_human", {
            #     "lead_id": state["lead_id"],
            #     "reason": "Solicitação de suporte complexo"
            # })
        
        # Atualizar estado
        return {
            **state,
            "messages": state["messages"] + [AIMessage(content=response.content)]
        }
        
    except Exception as e:
        logger.error(f"support_node: Erro ao gerar resposta: {e}")
        # Resposta de fallback
        fallback_message = "Desculpe, tive um problema. Vou transferir você para um atendente humano. Um momento! 🙏"
        return {
            **state,
            "messages": state["messages"] + [AIMessage(content=fallback_message)]
        }
