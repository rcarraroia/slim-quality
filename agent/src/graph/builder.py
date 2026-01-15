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
    Monta StateGraph completo com todos os nodes e edges, incluindo SICC.
    
    Estrutura com SICC integrado:
        START → sicc_lookup → router → [discovery | sales | support] → sicc_learn → supervisor_approve → END
    
    Returns:
        StateGraph compilado com checkpointer
    """
    logger.info("build_graph: Montando StateGraph com SICC integrado")
    
    # Criar workflow
    workflow = StateGraph(AgentState)
    
    # Importar nodes SICC
    from .nodes.sicc_lookup import sicc_lookup_node
    from .nodes.sicc_learn import sicc_learn_node
    from .nodes.supervisor_approve import supervisor_approve_node
    
    # Adicionar nodes SICC
    workflow.add_node("sicc_lookup", sicc_lookup_node)
    workflow.add_node("sicc_learn", sicc_learn_node)
    workflow.add_node("supervisor_approve", supervisor_approve_node)
    
    # Adicionar nodes principais
    workflow.add_node("router", router_node)
    workflow.add_node("discovery", discovery_node)
    workflow.add_node("sales", sales_node)
    workflow.add_node("support", support_node)
    
    # NOVO FLUXO COM SICC:
    # Entry point: SICC Lookup (busca contexto primeiro)
    workflow.set_entry_point("sicc_lookup")
    
    # SICC Lookup → Router
    workflow.add_edge("sicc_lookup", "router")
    
    # Router → Sub-agentes (conditional edges)
    workflow.add_conditional_edges(
        "router",
        route_intent,
        {
            "discovery": "discovery",
            "sales": "sales",
            "support": "support"
        }
    )
    
    # Sub-agentes → SICC Learn (todos convergem para aprendizado)
    workflow.add_edge("discovery", "sicc_learn")
    workflow.add_edge("sales", "sicc_learn")
    workflow.add_edge("support", "sicc_learn")
    
    # SICC Learn → Supervisor Approve
    workflow.add_edge("sicc_learn", "supervisor_approve")
    
    # Supervisor Approve → END
    workflow.add_edge("supervisor_approve", END)
    
    # Compilar com checkpointer
    checkpointer = SupabaseCheckpointer()
    graph = workflow.compile(checkpointer=checkpointer)
    
    logger.info("build_graph: StateGraph compilado com sucesso (SICC integrado)")
    
    return graph
