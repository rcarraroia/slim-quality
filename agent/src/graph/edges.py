"""
Conditional edges para roteamento do StateGraph
"""
from .state import AgentState


def route_intent(state: AgentState) -> str:
    """
    Roteia para o node apropriado baseado na intenção detectada.
    
    Args:
        state: Estado atual da conversação
        
    Returns:
        Nome do próximo node: "discovery", "sales" ou "support"
    """
    intent = state.get("current_intent", "discovery")
    
    # Mapear intent para node
    intent_to_node = {
        "discovery": "discovery",
        "sales": "sales",
        "support": "support"
    }
    
    return intent_to_node.get(intent, "discovery")
