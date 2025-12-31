"""
Integração LangGraph - Node rules_evaluator

Integra o sistema de automações com o fluxo LangGraph sem bloquear conversas.
"""

import structlog
from typing import Dict, Any, List
import asyncio
from datetime import datetime
import time

from .schemas import (
    AutomationRule,
    RuleExecution,
    TriggerType,
    AutomationContext
)
from .rules_executor import get_rules_executor

logger = structlog.get_logger(__name__)

# Métricas de performance do node
NODE_METRICS = {
    "total_executions": 0,
    "total_duration_ms": 0,
    "rules_triggered_count": 0,
    "actions_executed_count": 0,
    "errors_count": 0,
    "last_execution": None
}


class LangGraphIntegrationError(Exception):
    """Exceção para erros de integração LangGraph"""
    pass


async def rules_evaluator_node(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Node do LangGraph que avalia regras de automação durante conversas
    
    Args:
        state: Estado atual da conversa (AgentState)
        
    Returns:
        Estado atualizado com regras executadas
        
    Características:
    - Execução assíncrona (não bloqueia conversa)
    - Determina tipo de gatilho automaticamente
    - Atualiza estado com regras disparadas
    - Trata erros sem interromper fluxo
    - Coleta métricas de performance
    """
    start_time = time.time()
    session_id = state.get("session_id", "unknown")
    
    logger.info(
        "rules_evaluator_node: Iniciando avaliação de regras",
        session_id=session_id,
        state_keys=list(state.keys()),
        messages_count=len(state.get("messages", []))
    )
    
    try:
        # Atualizar métricas globais
        NODE_METRICS["total_executions"] += 1
        NODE_METRICS["last_execution"] = datetime.now().isoformat()
        
        # Determinar tipo de gatilho baseado no estado
        trigger_type = determine_trigger_type(state)
        
        if not trigger_type:
            logger.debug(
                "rules_evaluator_node: Nenhum gatilho identificado",
                session_id=session_id,
                state_keys=list(state.keys())
            )
            return state
        
        logger.info(
            "rules_evaluator_node: Gatilho identificado",
            session_id=session_id,
            trigger_type=trigger_type
        )
        
        # Preparar contexto para avaliação
        context = prepare_automation_context(state, trigger_type)
        
        # Executar regras assincronamente (não bloquear)
        rules_executor = get_rules_executor()
        executions = await rules_executor.evaluate_rules(trigger_type, context)
        
        # Processar resultados
        rules_triggered = 0
        actions_executed = 0
        
        # Atualizar estado com resultados
        if executions:
            # Inicializar campos se não existem
            if "triggered_rules" not in state:
                state["triggered_rules"] = []
            if "executed_actions" not in state:
                state["executed_actions"] = []
            if "automation_context" not in state:
                state["automation_context"] = {}
            
            # Adicionar regras executadas
            for execution in executions:
                if execution.conditions_met:
                    rules_triggered += 1
                    state["triggered_rules"].append(execution.rule_id)
                    
                    # Adicionar ações executadas
                    for action in execution.actions_executed:
                        actions_executed += 1
                        state["executed_actions"].append({
                            "rule_id": execution.rule_id,
                            "action_type": action.action_type,
                            "status": action.status,
                            "executed_at": action.executed_at.isoformat(),
                            "duration_ms": action.duration_ms
                        })
            
            # Atualizar contexto de automação
            execution_duration = int((time.time() - start_time) * 1000)
            state["automation_context"] = {
                "last_evaluation": datetime.now().isoformat(),
                "trigger_type": trigger_type,
                "rules_evaluated": len(executions),
                "rules_triggered": rules_triggered,
                "actions_executed": actions_executed,
                "execution_duration_ms": execution_duration,
                "session_id": session_id
            }
            
            # Atualizar métricas globais
            NODE_METRICS["rules_triggered_count"] += rules_triggered
            NODE_METRICS["actions_executed_count"] += actions_executed
            NODE_METRICS["total_duration_ms"] += execution_duration
            
            logger.info(
                "rules_evaluator_node: Avaliação concluída com sucesso",
                session_id=session_id,
                trigger_type=trigger_type,
                rules_evaluated=len(executions),
                rules_triggered=rules_triggered,
                actions_executed=actions_executed,
                duration_ms=execution_duration
            )
        else:
            logger.debug(
                "rules_evaluator_node: Nenhuma regra ativa encontrada",
                session_id=session_id,
                trigger_type=trigger_type
            )
        
        return state
        
    except Exception as e:
        execution_duration = int((time.time() - start_time) * 1000)
        NODE_METRICS["errors_count"] += 1
        NODE_METRICS["total_duration_ms"] += execution_duration
        
        logger.error(
            "rules_evaluator_node: Erro na avaliação",
            session_id=session_id,
            error=str(e),
            duration_ms=execution_duration,
            exc_info=True
        )
        
        # Não interromper fluxo da conversa por erro de automação
        # Apenas registrar erro no contexto
        if "automation_context" not in state:
            state["automation_context"] = {}
        
        state["automation_context"]["last_error"] = {
            "message": str(e),
            "timestamp": datetime.now().isoformat(),
            "session_id": session_id,
            "duration_ms": execution_duration
        }
        
        return state


def determine_trigger_type(state: Dict[str, Any]) -> str:
    """
    Determina o tipo de gatilho baseado no estado da conversa
    
    Args:
        state: Estado atual da conversa
        
    Returns:
        Tipo de gatilho ou None se não identificado
    """
    try:
        # Verificar se é início de conversa
        messages = state.get("messages", [])
        if len(messages) <= 1:
            return TriggerType.CONVERSATION_STARTED
        
        # Verificar se há nova mensagem
        if messages and len(messages) > state.get("last_message_count", 0):
            return TriggerType.MESSAGE_RECEIVED
        
        # Verificar se há novo lead criado
        customer_info = state.get("customer_info", {})
        if customer_info and not state.get("lead_processed", False):
            return TriggerType.LEAD_CREATED
        
        # Verificar se há pedido finalizado
        order_info = state.get("order_info", {})
        if order_info and order_info.get("status") == "completed":
            return TriggerType.ORDER_COMPLETED
        
        # Nenhum gatilho identificado
        return None
        
    except Exception as e:
        logger.error(f"determine_trigger_type: Erro ao determinar gatilho: {e}")
        return None


def prepare_automation_context(state: Dict[str, Any], trigger_type: str) -> Dict[str, Any]:
    """
    Prepara contexto para avaliação de regras
    
    Args:
        state: Estado da conversa
        trigger_type: Tipo de gatilho identificado
        
    Returns:
        Contexto formatado para automações
    """
    try:
        context = AutomationContext(
            trigger_type=trigger_type,
            customer=state.get("customer_info"),
            conversation={
                "messages_count": len(state.get("messages", [])),
                "session_id": state.get("session_id"),
                "started_at": state.get("conversation_started_at")
            },
            order=state.get("order_info"),
            message=None,
            metadata={
                "agent_state_keys": list(state.keys()),
                "evaluation_timestamp": datetime.now().isoformat()
            }
        )
        
        # Adicionar última mensagem se disponível
        messages = state.get("messages", [])
        if messages:
            last_message = messages[-1]
            context.message = {
                "content": getattr(last_message, "content", ""),
                "type": type(last_message).__name__,
                "timestamp": datetime.now().isoformat()
            }
        
        return context.dict()
        
    except Exception as e:
        logger.error(f"prepare_automation_context: Erro ao preparar contexto: {e}")
        
        # Retornar contexto mínimo em caso de erro
        return {
            "trigger_type": trigger_type,
            "customer": state.get("customer_info"),
            "conversation": {"messages_count": len(state.get("messages", []))},
            "metadata": {"error": str(e)}
        }


def get_automation_metrics(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Extrai métricas de automação do estado
    
    Args:
        state: Estado da conversa
        
    Returns:
        Métricas de automação
    """
    automation_context = state.get("automation_context", {})
    triggered_rules = state.get("triggered_rules", [])
    executed_actions = state.get("executed_actions", [])
    
    return {
        "rules_triggered_count": len(triggered_rules),
        "actions_executed_count": len(executed_actions),
        "last_evaluation": automation_context.get("last_evaluation"),
        "last_trigger_type": automation_context.get("trigger_type"),
        "execution_duration_ms": automation_context.get("execution_duration_ms"),
        "has_errors": "last_error" in automation_context,
        "session_id": automation_context.get("session_id")
    }


def get_node_performance_metrics() -> Dict[str, Any]:
    """
    Retorna métricas de performance do node rules_evaluator
    
    Returns:
        Métricas globais de performance
    """
    avg_duration = 0
    if NODE_METRICS["total_executions"] > 0:
        avg_duration = NODE_METRICS["total_duration_ms"] / NODE_METRICS["total_executions"]
    
    return {
        "total_executions": NODE_METRICS["total_executions"],
        "total_duration_ms": NODE_METRICS["total_duration_ms"],
        "average_duration_ms": round(avg_duration, 2),
        "rules_triggered_total": NODE_METRICS["rules_triggered_count"],
        "actions_executed_total": NODE_METRICS["actions_executed_count"],
        "errors_total": NODE_METRICS["errors_count"],
        "last_execution": NODE_METRICS["last_execution"],
        "success_rate": round(
            (NODE_METRICS["total_executions"] - NODE_METRICS["errors_count"]) / 
            max(NODE_METRICS["total_executions"], 1) * 100, 2
        )
    }


def reset_node_metrics():
    """
    Reseta métricas de performance do node (útil para testes)
    """
    global NODE_METRICS
    NODE_METRICS = {
        "total_executions": 0,
        "total_duration_ms": 0,
        "rules_triggered_count": 0,
        "actions_executed_count": 0,
        "errors_count": 0,
        "last_execution": None
    }
    logger.info("rules_evaluator_node: Métricas resetadas")


def log_conversation_automation_summary(state: Dict[str, Any]):
    """
    Registra resumo das automações executadas durante a conversa
    
    Args:
        state: Estado final da conversa
    """
    session_id = state.get("session_id", "unknown")
    triggered_rules = state.get("triggered_rules", [])
    executed_actions = state.get("executed_actions", [])
    automation_context = state.get("automation_context", {})
    
    if triggered_rules or executed_actions:
        logger.info(
            "Resumo de automações da conversa",
            session_id=session_id,
            rules_triggered=len(triggered_rules),
            actions_executed=len(executed_actions),
            trigger_types=list(set([
                action.get("trigger_type") 
                for action in [automation_context] 
                if action.get("trigger_type")
            ])),
            conversation_duration=automation_context.get("execution_duration_ms"),
            has_errors="last_error" in automation_context
        )
    else:
        logger.debug(
            "Conversa finalizada sem automações",
            session_id=session_id
        )


# Função auxiliar para integração com LangGraph
def create_rules_evaluator_node():
    """
    Cria node configurado para LangGraph
    
    Returns:
        Função do node pronta para uso no grafo
    """
    return rules_evaluator_node


# Função para atualizar AgentState (se necessário)
def update_agent_state_schema():
    """
    Retorna campos adicionais necessários no AgentState
    
    Returns:
        Dicionário com novos campos para AgentState
    """
    return {
        "triggered_rules": List[str],  # IDs das regras disparadas
        "executed_actions": List[Dict[str, Any]],  # Ações executadas
        "automation_context": Dict[str, Any]  # Contexto adicional
    }