"""
Módulo de Automações - Sistema completo de regras e execução
"""

# Importar schemas PRIMEIRO (sem dependências)
from .schemas import (
    # Enums
    RuleStatus,
    TriggerType,
    ActionType,
    ConditionOperator,
    ExecutionStatus,
    
    # Modelos de regras
    AutomationRule,
    AutomationRuleCreate,
    AutomationRuleUpdate,
    AutomationRuleBase,
    
    # Modelos de condições e ações
    RuleCondition,
    RuleAction,
    
    # Modelos de execução
    RuleExecution,
    ActionResult,
    RuleExecutionLog,
    
    # Modelos para frontend
    AutomationStats,
    AutomationRuleForFrontend,
    AutomationRulesResponse,
    
    # Modelos de contexto
    AutomationContext,
    
    # Configuração
    RetryConfig,
    
    # Utilitários de conversão
    convert_rule_to_frontend,
    convert_stats_to_frontend
)

# DEPOIS importar services (que dependem de schemas)
from .automation_service import (
    AutomationService,
    AutomationServiceError,
    RuleNotFoundError,
    ValidationError,
    get_automation_service,
    reset_automation_service
)

from .rules_executor import (
    RulesExecutor,
    RulesExecutorError,
    ConditionEvaluationError,
    get_rules_executor,
    reset_rules_executor
)

from .action_executor import (
    ActionExecutor,
    ActionExecutorError,
    ActionConfigError,
    ActionTimeoutError,
    get_action_executor,
    reset_action_executor
)

# Integração LangGraph
from .langgraph_integration import (
    rules_evaluator_node,
    create_rules_evaluator_node,
    get_automation_metrics,
    get_node_performance_metrics,
    reset_node_metrics,
    log_conversation_automation_summary
)

# Schema do AgentState
from .agent_state_schema import (
    AutomationStateFields,
    get_agent_state_extensions,
    initialize_automation_state,
    update_message_count,
    mark_lead_processed,
    get_automation_summary
)

# Performance e Monitoramento (BLOCO 5)
from .performance import (
    MemoryCache,
    CacheManager,
    PerformanceMetrics,
    QueryOptimizer,
    ResourceMonitor,
    get_cache_manager,
    get_performance_metrics,
    get_resource_monitor
)

from .monitoring import (
    AlertLevel,
    AlertType,
    Alert,
    AlertManager,
    MetricsCollector,
    StatsDashboard,
    get_alert_manager,
    get_metrics_collector,
    get_stats_dashboard
)

from .audit import (
    AuditEventType,
    AuditLevel,
    AuditEvent,
    AuditService,
    get_audit_service
)

# Versão do módulo
__version__ = "1.0.0"

# Exportar tudo
__all__ = [
    # Services
    "AutomationService",
    "RulesExecutor", 
    "ActionExecutor",
    
    # Funções de acesso singleton
    "get_automation_service",
    "get_rules_executor",
    "get_action_executor",
    
    # Funções de reset (para testes)
    "reset_automation_service",
    "reset_rules_executor",
    "reset_action_executor",
    
    # Integração LangGraph
    "rules_evaluator_node",
    "create_rules_evaluator_node",
    "get_automation_metrics",
    "get_node_performance_metrics",
    "reset_node_metrics",
    "log_conversation_automation_summary",
    
    # Schema AgentState
    "AutomationStateFields",
    "get_agent_state_extensions",
    "initialize_automation_state",
    "update_message_count",
    "mark_lead_processed",
    "get_automation_summary",
    
    # Performance e Monitoramento (BLOCO 5)
    "MemoryCache",
    "CacheManager", 
    "PerformanceMetrics",
    "QueryOptimizer",
    "ResourceMonitor",
    "get_cache_manager",
    "get_performance_metrics",
    "get_resource_monitor",
    
    # Monitoramento
    "AlertLevel",
    "AlertType",
    "Alert",
    "AlertManager",
    "MetricsCollector",
    "StatsDashboard",
    "get_alert_manager",
    "get_metrics_collector",
    "get_stats_dashboard",
    
    # Auditoria
    "AuditEventType",
    "AuditLevel",
    "AuditEvent",
    "AuditService",
    "get_audit_service",
    
    # Exceções
    "AutomationServiceError",
    "RuleNotFoundError",
    "ValidationError",
    "RulesExecutorError",
    "ConditionEvaluationError",
    "ActionExecutorError",
    "ActionConfigError",
    "ActionTimeoutError",
    
    # Enums
    "RuleStatus",
    "TriggerType",
    "ActionType",
    "ConditionOperator",
    "ExecutionStatus",
    
    # Modelos principais
    "AutomationRule",
    "AutomationRuleCreate",
    "AutomationRuleUpdate",
    "AutomationRuleBase",
    "RuleCondition",
    "RuleAction",
    "RuleExecution",
    "ActionResult",
    "RuleExecutionLog",
    "AutomationStats",
    "AutomationRuleForFrontend",
    "AutomationRulesResponse",
    "AutomationContext",
    "RetryConfig",
    
    # Utilitários
    "convert_rule_to_frontend",
    "convert_stats_to_frontend"
]


def get_automation_system():
    """Obtém instâncias de todos os componentes do sistema de automação"""
    return (
        get_automation_service(),
        get_rules_executor(),
        get_action_executor()
    )


def reset_automation_system():
    """Reseta todas as instâncias singleton do sistema de automação"""
    reset_automation_service()
    reset_rules_executor()
    reset_action_executor()