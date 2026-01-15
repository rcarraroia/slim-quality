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
    Responde dúvidas e fornece suporte usando contexto SICC.
    
    Responsabilidades:
    - Responder dúvidas sobre garantia, frete, troca, pagamento
    - Fornecer informações sobre políticas da empresa
    - Detectar necessidade de transferência para humano
    - Usar contexto SICC para personalização
    - Notificar via MCP quando necessário
    
    Args:
        state: Estado atual da conversação
        
    Returns:
        Estado atualizado com nova mensagem
    """
    logger.info("support_node: Fornecendo suporte com contexto SICC")
    
    # Obter contexto SICC
    sicc_context = state.get("sicc_context", {})
    customer_context = state.get("customer_context", {})
    sicc_patterns = state.get("sicc_patterns", [])
    
    # Obter configurações
    settings = get_settings()
    
    # Inicializar Claude
    llm = ChatAnthropic(
        model=settings.claude_model,
        api_key=settings.claude_api_key,
        temperature=0.5  # Temperatura baixa para respostas precisas
    )
    
    # Obter nome do lead se disponível
    lead_data = state.get("lead_data", {})
    nome = lead_data.get("nome", "")
    
    # Construir contexto personalizado
    personalization = f"""
CONTEXTO DO CLIENTE:
- Nome: {customer_context.get('customer_name', nome if nome else 'Cliente')}
- Cliente retornando: {customer_context.get('is_returning_customer', False)}
- Histórico de compras: {customer_context.get('has_purchase_history', False)}

CONTEXTO SICC:
- Memórias relevantes: {sicc_context.get('memories_found', 0)}
- Padrões aplicáveis: {len(sicc_patterns)}
"""
    
    # Formatar memórias relevantes do SICC
    memories_text = ""
    if sicc_context.get('memories'):
        memories_list = sicc_context['memories'][:3]  # Top 3 memórias
        if memories_list:
            memories_text = "\n\nMEMÓRIAS RELEVANTES (conversas anteriores):\n"
            for i, mem in enumerate(memories_list, 1):
                content = mem.get('content', '')[:150]
                memories_text += f"{i}. {content}...\n"
            memories_text += "\nUSE essas memórias para entender o histórico do cliente e personalizar o suporte!\n"
    
    # Formatar padrões aplicáveis
    patterns_text = ""
    if sicc_patterns:
        patterns_text = f"\n\nPADRÕES DETECTADOS: {len(sicc_patterns)} padrões aplicáveis"
        for pattern in sicc_patterns[:2]:  # Top 2 padrões
            pattern_desc = pattern.get('description', '')
            if pattern_desc:
                patterns_text += f"\n- {pattern_desc}"
    
    # Prompt de suporte com contexto SICC
    system_prompt = f"""Você é BIA, assistente de suporte da Slim Quality.

{personalization}

Cliente: {nome if nome else 'Cliente'}
{memories_text}
{patterns_text}

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
5. Se cliente é retornando, reconheça isso e use histórico
6. USE as memórias relevantes para entender contexto e problemas anteriores

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
- Se cliente tem histórico, mostre que você lembra dele
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
