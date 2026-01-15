"""
Estado global da conversação
"""
from typing import TypedDict, List, Dict, Any, Optional
from langchain_core.messages import BaseMessage


class AgentState(TypedDict):
    """
    Estado global da conversação do agente.
    
    Attributes:
        messages: Histórico completo de mensagens da conversação
        lead_id: Identificador único do lead (phone number)
        context: Contexto adicional flexível
        current_intent: Intenção detectada (discovery | sales | support)
        next_action: Próxima ação a executar
        lead_data: Dados capturados do lead (nome, email, telefone, problema)
        products_recommended: Lista de produtos recomendados
        
        # CAMPOS SICC (Fase 2 - Integração):
        sicc_context: Contexto SICC (memórias + padrões aplicáveis)
        sicc_patterns: Padrões aplicáveis detectados
        sicc_learnings: Novos aprendizados detectados na conversa
        sicc_approved: Status de aprovação dos aprendizados
        customer_context: Contexto do cliente (histórico, compras, etc)
    """
    messages: List[BaseMessage]
    lead_id: Optional[str]
    context: Dict[str, Any]
    current_intent: str
    next_action: str
    lead_data: Dict[str, Any]
    products_recommended: List[Dict[str, Any]]
    
    # CAMPOS SICC
    sicc_context: Optional[Dict[str, Any]]
    sicc_patterns: Optional[List[Dict[str, Any]]]
    sicc_learnings: Optional[List[Dict[str, Any]]]
    sicc_approved: Optional[bool]
    customer_context: Optional[Dict[str, Any]]
