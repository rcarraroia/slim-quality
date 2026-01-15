"""
Discovery Node - Qualificação de leads
"""
import re
import structlog
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import SystemMessage, AIMessage

from ..state import AgentState
from ...services.config_cache import get_sub_agent_config

logger = structlog.get_logger(__name__)


def extract_lead_data(messages: list) -> dict:
    """
    Extrai dados estruturados das mensagens.
    
    Busca por:
    - Nome completo
    - Email
    - Telefone
    - Problema de saúde
    
    Args:
        messages: Lista de mensagens da conversação
        
    Returns:
        Dicionário com dados extraídos
    """
    data = {}
    
    # Concatenar todas as mensagens do usuário
    user_messages = " ".join([
        msg.content for msg in messages 
        if hasattr(msg, 'type') and msg.type == 'human'
    ])
    
    # Regex para email
    email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
    email_match = re.search(email_pattern, user_messages)
    if email_match:
        data['email'] = email_match.group(0)
    
    # Regex para telefone brasileiro
    phone_pattern = r'\b(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)?\d{4,5}[-\s]?\d{4}\b'
    phone_match = re.search(phone_pattern, user_messages)
    if phone_match:
        data['telefone'] = phone_match.group(0)
    
    # Nome: buscar padrão "meu nome é X" ou "me chamo X"
    name_patterns = [
        r'(?:meu nome é|me chamo|sou o|sou a)\s+([A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç]+(?:\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç]+)*)',
        r'(?:nome:?)\s+([A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç]+(?:\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç]+)*)'
    ]
    for pattern in name_patterns:
        name_match = re.search(pattern, user_messages, re.IGNORECASE)
        if name_match:
            data['nome'] = name_match.group(1)
            break
    
    # Problemas de saúde comuns
    health_keywords = {
        'dor nas costas': 'dor_costas',
        'dor coluna': 'dor_coluna',
        'insônia': 'insonia',
        'não consigo dormir': 'insonia',
        'dor cervical': 'dor_cervical',
        'dor lombar': 'dor_lombar',
        'má postura': 'ma_postura',
    }
    
    user_messages_lower = user_messages.lower()
    for keyword, problem_code in health_keywords.items():
        if keyword in user_messages_lower:
            data['problema_saude'] = problem_code
            break
    
    return data


async def discovery_node(state: AgentState) -> AgentState:
    """
    Qualifica lead e captura dados essenciais usando contexto SICC.
    
    Responsabilidades:
    - Capturar nome, email, telefone
    - Identificar problema de saúde
    - Manter conversação natural (uma pergunta por vez)
    - Usar contexto SICC para personalização
    
    Args:
        state: Estado atual da conversação
        
    Returns:
        Estado atualizado com lead_data e nova mensagem
    """
    logger.info("discovery_node: Qualificando lead com contexto SICC")
    
    # Carregar configuração do banco (com cache)
    try:
        config = await get_sub_agent_config('discovery')
        logger.info("discovery_node: Config carregada", model=config.model, temperature=config.temperature)
    except Exception as e:
        logger.error("discovery_node: Erro ao carregar config, usando fallback", error=str(e))
        config = await get_sub_agent_config('discovery')
    
    # Obter contexto SICC
    sicc_context = state.get("sicc_context", {})
    customer_context = state.get("customer_context", {})
    sicc_patterns = state.get("sicc_patterns", [])
    
    # Extrair dados das mensagens
    extracted_data = extract_lead_data(state["messages"])
    
    # Mesclar com dados existentes
    current_lead_data = state.get("lead_data", {})
    updated_lead_data = {**current_lead_data, **extracted_data}
    
    logger.info(f"discovery_node: Dados capturados: {list(updated_lead_data.keys())}")
    
    # Inicializar Claude com config do banco
    llm = ChatAnthropic(
        model=config.model,
        temperature=config.temperature
    )
    
    # Construir prompt baseado em dados faltantes
    missing_fields = []
    if 'nome' not in updated_lead_data:
        missing_fields.append('nome')
    if 'email' not in updated_lead_data:
        missing_fields.append('email')
    if 'telefone' not in updated_lead_data:
        missing_fields.append('telefone')
    if 'problema_saude' not in updated_lead_data:
        missing_fields.append('problema de saúde')
    
    # Construir contexto personalizado
    personalization = f"""
CONTEXTO DO CLIENTE:
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
            memories_text += "\nUSE essas memórias para criar conexão e personalizar a abordagem!\n"
    
    # Formatar padrões aplicáveis
    patterns_text = ""
    if sicc_patterns:
        patterns_text = f"\n\nPADRÕES DETECTADOS: {len(sicc_patterns)} padrões aplicáveis"
        for pattern in sicc_patterns[:2]:  # Top 2 padrões
            pattern_desc = pattern.get('description', '')
            if pattern_desc:
                patterns_text += f"\n- {pattern_desc}"
    
    system_prompt = f"""{config.system_prompt}

{personalization}

Dados já capturados: {', '.join(updated_lead_data.keys()) if updated_lead_data else 'nenhum'}
Dados faltantes: {', '.join(missing_fields) if missing_fields else 'nenhum'}
{memories_text}
{patterns_text}

REGRAS IMPORTANTES:
1. Seja amigável, empática e natural
2. Faça APENAS UMA pergunta por vez
3. Se todos os dados já foram capturados, agradeça e pergunte como pode ajudar
4. Não force o lead a dar todas as informações de uma vez
5. Use emojis moderadamente para ser mais humana
6. Se cliente é retornando, reconheça isso na conversa
7. USE as memórias relevantes para criar conexão com conversas anteriores
"""
    
    try:
        # Invocar Claude com histórico completo
        response = await llm.ainvoke([
            SystemMessage(content=system_prompt),
            *state["messages"]
        ])
        
        logger.info("discovery_node: Resposta gerada com sucesso")
        
        # Atualizar estado
        return {
            **state,
            "messages": state["messages"] + [AIMessage(content=response.content)],
            "lead_data": updated_lead_data
        }
        
    except Exception as e:
        logger.error(f"discovery_node: Erro ao gerar resposta: {e}")
        # Resposta de fallback
        fallback_message = "Desculpe, tive um problema técnico. Pode repetir sua mensagem? 😅"
        return {
            **state,
            "messages": state["messages"] + [AIMessage(content=fallback_message)],
            "lead_data": updated_lead_data
        }
