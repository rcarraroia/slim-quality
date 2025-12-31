"""
Graph Builder - Monta StateGraph completo
"""
import structlog
from langgraph.graph import StateGraph, END

from .state import AgentState
from .nodes import router_node, discovery_node, sales_node, support_node
from .edges import route_intent
from .checkpointer import SupabaseCheckpointer

logger = structlog.get_logger(__name__)


def build_graph() -> StateGraph:
    """
    Monta StateGraph completo com todos os nodes e edges.
    
    Estrutura:
        START → router → [discovery | sales | support] → END
    
    Returns:
        StateGraph compilado com checkpointer
    """
    logger.info("build_graph: Montando StateGraph")
    
    # Criar workflow
    workflow = StateGraph(AgentState)
    
    # Adicionar nodes
    workflow.add_node("router", router_node)
    workflow.add_node("discovery", discovery_node)
    workflow.add_node("sales", sales_node)
    workflow.add_node("support", support_node)
    
    # Entry point
    workflow.set_entry_point("router")
    
    # Conditional edges do router
    workflow.add_conditional_edges(
        "router",
        route_intent,
        {
            "discovery": "discovery",
            "sales": "sales",
            "support": "support"
        }
    )
    
    # Todos os nodes terminam em END
    workflow.add_edge("discovery", END)
    workflow.add_edge("sales", END)
    workflow.add_edge("support", END)
    
    # Compilar com checkpointer
    checkpointer = SupabaseCheckpointer()
    graph = workflow.compile(checkpointer=checkpointer)
    
    logger.info("build_graph: StateGraph compilado com sucesso")
    
    return graph
