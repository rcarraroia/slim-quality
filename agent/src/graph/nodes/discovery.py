"""
Discovery Node - Qualificação de leads
"""
import re
import structlog
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import SystemMessage, AIMessage

from ..state import AgentState
from ...config import get_settings

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
    Qualifica lead e captura dados essenciais.
    
    Responsabilidades:
    - Capturar nome, email, telefone
    - Identificar problema de saúde
    - Manter conversação natural (uma pergunta por vez)
    
    Args:
        state: Estado atual da conversação
        
    Returns:
        Estado atualizado com lead_data e nova mensagem
    """
    logger.info("discovery_node: Qualificando lead")
    
    # Extrair dados das mensagens
    extracted_data = extract_lead_data(state["messages"])
    
    # Mesclar com dados existentes
    current_lead_data = state.get("lead_data", {})
    updated_lead_data = {**current_lead_data, **extracted_data}
    
    logger.info(f"discovery_node: Dados capturados: {list(updated_lead_data.keys())}")
    
    # Inicializar Claude
    llm = ChatAnthropic(
        model=settings.claude_model,
        api_key=settings.claude_api_key,
        temperature=0.7  # Temperatura média para conversação natural
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
    
    system_prompt = f"""Você é BIA, assistente de vendas da Slim Quality, especializada em colchões ortopédicos.

Seu objetivo: qualificar o lead capturando as seguintes informações:
- Nome completo
- Email
- Telefone
- Problema de saúde (dor nas costas, insônia, etc)

Dados já capturados: {', '.join(updated_lead_data.keys()) if updated_lead_data else 'nenhum'}
Dados faltantes: {', '.join(missing_fields) if missing_fields else 'nenhum'}

REGRAS IMPORTANTES:
1. Seja amigável, empática e natural
2. Faça APENAS UMA pergunta por vez
3. Se todos os dados já foram capturados, agradeça e pergunte como pode ajudar
4. Não force o lead a dar todas as informações de uma vez
5. Use emojis moderadamente para ser mais humana

Exemplo de abordagem:
- "Olá! Sou a BIA 😊 Como posso te chamar?"
- "Ótimo, [Nome]! Para te ajudar melhor, qual seu email?"
- "Perfeito! E qual problema você está enfrentando? Dor nas costas, insônia...?"
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
