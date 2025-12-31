from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional, Union
from datetime import datetime
from enum import Enum
import re

# ============================================
# ENUMS
# ============================================

class RuleStatus(str, Enum):
    ATIVA = "ativa"
    INATIVA = "inativa"

class TriggerType(str, Enum):
    CONVERSATION_STARTED = "conversation_started"
    MESSAGE_RECEIVED = "message_received"
    LEAD_CREATED = "lead_created"
    ORDER_COMPLETED = "order_completed"
    SCHEDULED = "scheduled"

class ActionType(str, Enum):
    SEND_EMAIL = "send_email"
    APPLY_TAG = "apply_tag"
    CREATE_TASK = "create_task"
    SEND_NOTIFICATION = "send_notification"
    SEND_WHATSAPP = "send_whatsapp"

class ConditionOperator(str, Enum):
    EQUALS = "equals"
    CONTAINS = "contains"
    GREATER_THAN = "greater_than"
    LESS_THAN = "less_than"
    IN_LIST = "in_list"
    NOT_EMPTY = "not_empty"

class ExecutionStatus(str, Enum):
    SUCCESS = "success"
    FAILED = "failed"
    PARTIAL = "partial"

# ============================================
# MODELOS DE CONDIÇÕES E AÇÕES
# ============================================

class RuleCondition(BaseModel):
    field: str = Field(..., description="Campo a ser avaliado")
    operator: ConditionOperator = Field(..., description="Operador de comparação")
    value: Any = Field(..., description="Valor para comparação")
    logic: Optional[str] = Field("AND", description="Lógica com próxima condição")

class RuleAction(BaseModel):
    type: ActionType = Field(..., description="Tipo da ação")
    config: Dict[str, Any] = Field(..., description="Configuração da ação")
    order: int = Field(1, description="Ordem de execução", ge=1)

# ============================================
# MODELOS BASE DE REGRAS
# ============================================

class AutomationRuleBase(BaseModel):
    nome: str = Field(..., min_length=3, max_length=255)
    descricao: Optional[str] = Field(None)
    gatilho: TriggerType = Field(...)
    gatilho_config: Dict[str, Any] = Field(default_factory=dict)
    condicoes: List[RuleCondition] = Field(default_factory=list)
    acoes: List[RuleAction] = Field(..., min_items=1)

class AutomationRuleCreate(AutomationRuleBase):
    status: RuleStatus = Field(RuleStatus.INATIVA)

class AutomationRuleUpdate(BaseModel):
    nome: Optional[str] = Field(None, min_length=3, max_length=255)
    descricao: Optional[str] = None
    gatilho: Optional[TriggerType] = None
    gatilho_config: Optional[Dict[str, Any]] = None
    condicoes: Optional[List[RuleCondition]] = None
    acoes: Optional[List[RuleAction]] = None
    status: Optional[RuleStatus] = None

class AutomationRule(AutomationRuleBase):
    id: str = Field(...)
    status: RuleStatus = Field(...)
    created_by: str = Field(...)
    created_at: datetime = Field(...)
    updated_at: datetime = Field(...)
    deleted_at: Optional[datetime] = Field(None)
    disparos_mes: int = Field(0, ge=0)
    taxa_abertura_percent: float = Field(0.0, ge=0, le=100)

    class Config:
        from_attributes = True

# ============================================
# MODELOS DE EXECUÇÃO
# ============================================

class ActionResult(BaseModel):
    action_type: str = Field(...)
    status: str = Field(...)
    error: Optional[str] = Field(None)
    executed_at: datetime = Field(...)
    duration_ms: int = Field(..., ge=0)
    result_data: Optional[Dict[str, Any]] = Field(None)

class RuleExecution(BaseModel):
    rule_id: str = Field(...)
    trigger_type: str = Field(...)
    trigger_data: Dict[str, Any] = Field(...)
    conditions_met: bool = Field(...)
    conditions_result: Optional[Dict[str, Any]] = Field(None)
    actions_executed: List[ActionResult] = Field(default_factory=list)
    execution_status: ExecutionStatus = Field(...)
    error_message: Optional[str] = Field(None)
    duration_ms: int = Field(..., ge=0)
    executed_at: datetime = Field(...)

class RuleExecutionLog(BaseModel):
    id: str = Field(...)
    rule_id: str = Field(...)
    rule_name: str = Field(...)
    trigger_type: str = Field(...)
    execution_status: ExecutionStatus = Field(...)
    actions_count: int = Field(..., ge=0)
    duration_ms: int = Field(..., ge=0)
    executed_at: datetime = Field(...)
    error_message: Optional[str] = Field(None)

    class Config:
        from_attributes = True

# ============================================
# MODELOS PARA FRONTEND
# ============================================

class AutomationStats(BaseModel):
    fluxos_ativos: int = Field(..., ge=0)
    mensagens_enviadas_hoje: int = Field(..., ge=0)
    taxa_media_abertura: str = Field(...)

class AutomationRuleForFrontend(BaseModel):
    id: Union[int, str] = Field(...)
    nome: str = Field(...)
    status: str = Field(...)
    gatilho: str = Field(...)
    acao: str = Field(...)
    disparosMes: int = Field(..., ge=0)
    taxaAbertura: str = Field(...)

class AutomationRulesResponse(BaseModel):
    rules: List[AutomationRuleForFrontend] = Field(...)

# ============================================
# MODELOS DE CONTEXTO
# ============================================

class AutomationContext(BaseModel):
    trigger_type: str = Field(...)
    customer: Optional[Dict[str, Any]] = Field(None)
    conversation: Optional[Dict[str, Any]] = Field(None)
    order: Optional[Dict[str, Any]] = Field(None)
    message: Optional[Dict[str, Any]] = Field(None)
    metadata: Dict[str, Any] = Field(default_factory=dict)

# ============================================
# CONFIGURAÇÃO
# ============================================

class RetryConfig(BaseModel):
    max_attempts: int = Field(3, ge=1, le=10)
    backoff_multiplier: float = Field(2.0, ge=1.0)
    initial_delay: float = Field(1.0, ge=0.1)
    max_delay: float = Field(30.0, ge=1.0)

    def get_delay(self, attempt: int) -> float:
        delay = self.initial_delay * (self.backoff_multiplier ** (attempt - 1))
        return min(delay, self.max_delay)

# ============================================
# UTILITÁRIOS DE CONVERSÃO
# ============================================

def convert_rule_to_frontend(rule: AutomationRule) -> AutomationRuleForFrontend:
    """Converte regra do banco para formato do frontend"""
    gatilho_map = {
        "conversation_started": "Conversa iniciada",
        "message_received": "Mensagem recebida", 
        "lead_created": "Lead criado",
        "order_completed": "Pedido finalizado",
        "scheduled": "Agendado"
    }
    
    if rule.acoes:
        primeira_acao = rule.acoes[0]
        acao_map = {
            "send_email": "Enviar email",
            "apply_tag": "Aplicar tag",
            "create_task": "Criar tarefa",
            "send_notification": "Enviar notificação",
            "send_whatsapp": "Enviar WhatsApp"
        }
        acao_desc = acao_map.get(primeira_acao.type, "Executar ação")
        if len(rule.acoes) > 1:
            acao_desc += f" (+{len(rule.acoes)-1} ações)"
    else:
        acao_desc = "Nenhuma ação"
    
    return AutomationRuleForFrontend(
        id=rule.id,
        nome=rule.nome,
        status=rule.status,
        gatilho=gatilho_map.get(rule.gatilho, rule.gatilho),
        acao=acao_desc,
        disparosMes=rule.disparos_mes,
        taxaAbertura=f"{int(rule.taxa_abertura_percent)}%"
    )

def convert_stats_to_frontend(fluxos_ativos: int, mensagens_hoje: int, taxa_media: float) -> AutomationStats:
    """Converte estatísticas para formato do frontend"""
    return AutomationStats(
        fluxos_ativos=fluxos_ativos,
        mensagens_enviadas_hoje=mensagens_hoje,
        taxa_media_abertura=f"{int(taxa_media)}%"
    )