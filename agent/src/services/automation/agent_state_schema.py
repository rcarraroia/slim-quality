"""
Extensões do AgentState para suporte a automações

Este módulo define os campos adicionais necessários no AgentState
para integração com o sistema de automações.
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from datetime import datetime


class AutomationStateFields(BaseModel):
    """
    Campos adicionais para o AgentState suportar automações
    
    Estes campos devem ser adicionados ao AgentState existente
    """
    
    # Regras disparadas durante a conversa
    triggered_rules: List[str] = Field(
        default_factory=list,
        description="IDs das regras de automação disparadas"
    )
    
    # Ações executadas com detalhes
    executed_actions: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="Lista de ações executadas pelas regras"
    )
    
    # Contexto adicional de automação
    automation_context: Dict[str, Any] = Field(
        default_factory=dict,
        description="Contexto e metadados de automação"
    )
    
    # Contador de mensagens para detectar novas mensagens
    last_message_count: int = Field(
        default=0,
        description="Contador para detectar novas mensagens"
    )
    
    # Flag para indicar se lead foi processado
    lead_processed: bool = Field(
        default=False,
        description="Indica se o lead já foi processado pelas automações"
    )


def get_agent_state_extensions() -> Dict[str, type]:
    """
    Retorna os campos que devem ser adicionados ao AgentState
    
    Returns:
        Dicionário com nome do campo e tipo
        
    Usage:
        # No arquivo onde AgentState é definido:
        from services.automation.agent_state_schema import get_agent_state_extensions
        
        class AgentState(TypedDict):
            # Campos existentes...
            messages: List[BaseMessage]
            customer_info: Dict[str, Any]
            
            # Adicionar campos de automação:
            **get_agent_state_extensions()
    """
    return {
        "triggered_rules": List[str],
        "executed_actions": List[Dict[str, Any]], 
        "automation_context": Dict[str, Any],
        "last_message_count": int,
        "lead_processed": bool
    }


def initialize_automation_state(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Inicializa campos de automação no estado se não existirem
    
    Args:
        state: Estado atual da conversa
        
    Returns:
        Estado com campos de automação inicializados
    """
    if "triggered_rules" not in state:
        state["triggered_rules"] = []
    
    if "executed_actions" not in state:
        state["executed_actions"] = []
    
    if "automation_context" not in state:
        state["automation_context"] = {}
    
    if "last_message_count" not in state:
        state["last_message_count"] = 0
    
    if "lead_processed" not in state:
        state["lead_processed"] = False
    
    return state


def update_message_count(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Atualiza contador de mensagens para detectar novas mensagens
    
    Args:
        state: Estado atual da conversa
        
    Returns:
        Estado com contador atualizado
    """
    messages = state.get("messages", [])
    state["last_message_count"] = len(messages)
    return state


def mark_lead_processed(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Marca lead como processado pelas automações
    
    Args:
        state: Estado atual da conversa
        
    Returns:
        Estado com lead marcado como processado
    """
    state["lead_processed"] = True
    return state


def get_automation_summary(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Extrai resumo das automações executadas
    
    Args:
        state: Estado atual da conversa
        
    Returns:
        Resumo das automações executadas
    """
    return {
        "rules_triggered": len(state.get("triggered_rules", [])),
        "actions_executed": len(state.get("executed_actions", [])),
        "last_evaluation": state.get("automation_context", {}).get("last_evaluation"),
        "has_errors": "last_error" in state.get("automation_context", {}),
        "lead_processed": state.get("lead_processed", False)
    }


# Exemplo de uso para documentação
AGENT_STATE_EXAMPLE = """
# Exemplo de como integrar com AgentState existente:

from typing import TypedDict, List, Dict, Any
from langchain_core.messages import BaseMessage
from services.automation.agent_state_schema import get_agent_state_extensions

class AgentState(TypedDict):
    # Campos existentes do LangGraph
    messages: List[BaseMessage]
    customer_info: Dict[str, Any]
    session_id: str
    conversation_started_at: str
    order_info: Dict[str, Any]
    
    # Campos de automação (adicionar estes)
    triggered_rules: List[str]
    executed_actions: List[Dict[str, Any]]
    automation_context: Dict[str, Any]
    last_message_count: int
    lead_processed: bool

# Ou usando a função helper:
class AgentState(TypedDict):
    # Campos existentes...
    messages: List[BaseMessage]
    customer_info: Dict[str, Any]
    
    # Adicionar automaticamente:
    **get_agent_state_extensions()
"""