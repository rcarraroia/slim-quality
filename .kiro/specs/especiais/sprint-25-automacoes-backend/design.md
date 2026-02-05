# Documento de Design: Sistema de Automações Backend

## Visão Geral

O Sistema de Automações Backend implementa funcionalidade completa para execução de regras automatizadas durante conversas do agente. O sistema integra com o frontend existente em `src/pages/dashboard/Automacoes.tsx` e executa dentro do fluxo LangGraph sem impactar performance das conversas.

### Componentes Principais

- **AutomationService**: Gerenciamento CRUD de regras de automação
- **RulesExecutor**: Avaliação e execução de regras durante conversas
- **ActionExecutor**: Execução de ações específicas (email, tag, task, etc.)
- **LangGraph Node**: Node `rules_evaluator` integrado ao fluxo de conversas
- **API Controllers**: Endpoints REST para integração com frontend

## Arquitetura

### Arquitetura do Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Layer                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Automacoes   │  │ Dashboard    │  │ Logs         │      │
│  │ .tsx         │  │ Stats        │  │ Viewer       │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼ HTTP/REST
┌─────────────────────────────────────────────────────────────┐
│                      API Layer                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Automation   │  │ Logs         │  │ Stats        │      │
│  │ Controller   │  │ Controller   │  │ Controller   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼ Service Layer
┌─────────────────────────────────────────────────────────────┐
│                   Business Logic Layer                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Automation   │  │ Rules        │  │ Action       │      │
│  │ Service      │  │ Executor     │  │ Executor     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼ LangGraph Integration
┌─────────────────────────────────────────────────────────────┐
│                   LangGraph Layer                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ rules_       │  │ Agent        │  │ Conversation │      │
│  │ evaluator    │  │ State        │  │ Flow         │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼ Database
┌─────────────────────────────────────────────────────────────┐
│                    Data Layer                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ automation_  │  │ rule_        │  │ Supabase     │      │
│  │ rules        │  │ execution_   │  │ RLS          │      │
│  │              │  │ logs         │  │ Policies     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### Fluxo de Execução de Regras

```
1. Conversa do Agente Inicia
   │
   ▼
2. LangGraph executa node rules_evaluator
   │
   ▼
3. RulesExecutor busca regras ativas
   │
   ▼
4. Para cada regra ativa:
   │
   ├─▶ Avalia condições da regra
   │   │
   │   ├─▶ Se condições atendidas: continua
   │   └─▶ Se condições não atendidas: pula regra
   │
   ├─▶ ActionExecutor executa ações sequencialmente
   │   │
   │   ├─▶ Executa ação 1 (ex: send_email)
   │   ├─▶ Executa ação 2 (ex: apply_tag)
   │   └─▶ Executa ação N
   │
   └─▶ Registra log de execução
   │
   ▼
5. Atualiza AgentState com triggered_rules
   │
   ▼
6. Continua fluxo da conversa (não bloqueia)
```

## Componentes e Interfaces

### AutomationService

**Responsabilidade**: Gerenciar CRUD de regras de automação

**Interface**:
```python
class AutomationService:
    async def create_rule(self, rule_data: AutomationRuleCreate) -> AutomationRule:
        """Cria nova regra de automação"""
        
    async def get_rules(self, user_id: str, active_only: bool = True) -> List[AutomationRule]:
        """Lista regras do usuário"""
        
    async def get_rule(self, rule_id: str, user_id: str) -> AutomationRule:
        """Busca regra específica"""
        
    async def update_rule(self, rule_id: str, rule_data: AutomationRuleUpdate, user_id: str) -> AutomationRule:
        """Atualiza regra existente"""
        
    async def delete_rule(self, rule_id: str, user_id: str) -> bool:
        """Soft delete de regra"""
        
    async def toggle_rule_status(self, rule_id: str, user_id: str) -> AutomationRule:
        """Alterna status ativa/inativa"""
        
    async def get_stats(self, user_id: str) -> AutomationStats:
        """Retorna estatísticas de automações"""
```

**Métodos Principais**:
- `create_rule`: Valida dados e cria nova regra no banco
- `get_rules`: Lista regras com filtros e paginação
- `update_rule`: Atualiza configuração preservando histórico
- `toggle_rule_status`: Ativa/desativa regra imediatamente

### RulesExecutor

**Responsabilidade**: Avaliar e executar regras durante conversas

**Interface**:
```python
class RulesExecutor:
    async def evaluate_rules(self, trigger_type: str, context: Dict[str, Any]) -> List[RuleExecution]:
        """Avalia todas as regras ativas para o tipo de gatilho"""
        
    async def execute_rule(self, rule: AutomationRule, context: Dict[str, Any]) -> RuleExecution:
        """Executa uma regra específica"""
        
    async def evaluate_conditions(self, conditions: List[RuleCondition], context: Dict[str, Any]) -> bool:
        """Avalia condições da regra"""
        
    async def log_execution(self, rule_id: str, execution_result: RuleExecution) -> None:
        """Registra log de execução"""
```

**Tipos de Gatilhos Suportados**:
- `conversation_started`: Início de conversa com agente
- `message_received`: Mensagem recebida do cliente
- `lead_created`: Novo lead adicionado ao CRM
- `order_completed`: Pedido finalizado com pagamento
- `scheduled`: Execução agendada (cron)

**Operadores de Condição**:
- `equals`: Igualdade exata
- `contains`: Contém substring
- `greater_than`: Maior que (numérico)
- `less_than`: Menor que (numérico)
- `in_list`: Valor está na lista
- `not_empty`: Campo não está vazio

### ActionExecutor

**Responsabilidade**: Executar ações específicas

**Interface**:
```python
class ActionExecutor:
    async def execute_actions(self, actions: List[RuleAction], context: Dict[str, Any]) -> List[ActionResult]:
        """Executa todas as ações de uma regra"""
        
    async def execute_action(self, action: RuleAction, context: Dict[str, Any]) -> ActionResult:
        """Executa uma ação específica"""
        
    async def retry_action(self, action: RuleAction, context: Dict[str, Any], attempt: int) -> ActionResult:
        """Tenta novamente ação que falhou"""
```

**Tipos de Ações Suportadas**:

1. **send_email**:
   ```python
   {
       "type": "send_email",
       "config": {
           "template": "welcome_email",
           "recipient": "{{customer.email}}",
           "subject": "Bem-vindo à Slim Quality!"
       }
   }
   ```

2. **apply_tag**:
   ```python
   {
       "type": "apply_tag",
       "config": {
           "tag": "Novo Cliente",
           "target": "customer"
       }
   }
   ```

3. **create_task**:
   ```python
   {
       "type": "create_task",
       "config": {
           "title": "Acompanhar cliente {{customer.name}}",
           "assignee": "vendedor@slimquality.com",
           "due_date": "+3 days"
       }
   }
   ```

4. **send_notification**:
   ```python
   {
       "type": "send_notification",
       "config": {
           "message": "Novo lead: {{customer.name}}",
           "recipients": ["admin@slimquality.com"]
       }
   }
   ```

5. **send_whatsapp**:
   ```python
   {
       "type": "send_whatsapp",
       "config": {
           "template": "follow_up",
           "phone": "{{customer.phone}}",
           "variables": ["{{customer.name}}"]
       }
   }
   ```

### LangGraph Node - rules_evaluator

**Responsabilidade**: Integrar avaliação de regras no fluxo de conversas

**Interface**:
```python
async def rules_evaluator_node(state: AgentState) -> AgentState:
    """
    Node do LangGraph que avalia regras durante conversas
    
    Args:
        state: Estado atual da conversa
        
    Returns:
        Estado atualizado com regras executadas
    """
    
    # Determinar tipo de gatilho baseado no estado
    trigger_type = determine_trigger_type(state)
    
    # Preparar contexto para avaliação
    context = prepare_context(state)
    
    # Executar regras assincronamente
    executions = await rules_executor.evaluate_rules(trigger_type, context)
    
    # Atualizar estado com resultados
    state.triggered_rules = [exec.rule_id for exec in executions]
    state.executed_actions = [action for exec in executions for action in exec.actions]
    
    return state
```

**Integração com AgentState**:
```python
class AgentState(TypedDict):
    # Estados existentes...
    messages: List[BaseMessage]
    customer_info: Dict[str, Any]
    conversation_context: Dict[str, Any]
    
    # Novos campos para automações
    triggered_rules: List[str]  # IDs das regras disparadas
    executed_actions: List[Dict[str, Any]]  # Ações executadas
    automation_context: Dict[str, Any]  # Contexto adicional
```

## Modelos de Dados

### Tabela automation_rules

```sql
CREATE TABLE automation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    status VARCHAR(20) DEFAULT 'inativa' CHECK (status IN ('ativa', 'inativa')),
    gatilho VARCHAR(100) NOT NULL,
    gatilho_config JSONB DEFAULT '{}',
    condicoes JSONB DEFAULT '[]',
    acoes JSONB DEFAULT '[]',
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);

-- Índices para performance
CREATE INDEX idx_automation_rules_status ON automation_rules(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_automation_rules_gatilho ON automation_rules(gatilho) WHERE status = 'ativa' AND deleted_at IS NULL;
CREATE INDEX idx_automation_rules_user ON automation_rules(created_by) WHERE deleted_at IS NULL;
CREATE INDEX idx_automation_rules_updated ON automation_rules(updated_at DESC) WHERE deleted_at IS NULL;

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_automation_rules_updated_at 
    BEFORE UPDATE ON automation_rules 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Tabela rule_execution_logs

```sql
CREATE TABLE rule_execution_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id UUID NOT NULL REFERENCES automation_rules(id),
    trigger_type VARCHAR(100) NOT NULL,
    trigger_data JSONB NOT NULL,
    conditions_met BOOLEAN NOT NULL,
    conditions_result JSONB,
    actions_executed JSONB DEFAULT '[]',
    execution_status VARCHAR(50) NOT NULL CHECK (execution_status IN ('success', 'failed', 'partial')),
    error_message TEXT,
    duration_ms INTEGER,
    executed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para consultas de logs
CREATE INDEX idx_rule_execution_logs_rule ON rule_execution_logs(rule_id, executed_at DESC);
CREATE INDEX idx_rule_execution_logs_status ON rule_execution_logs(execution_status, executed_at DESC);
CREATE INDEX idx_rule_execution_logs_trigger ON rule_execution_logs(trigger_type, executed_at DESC);
CREATE INDEX idx_rule_execution_logs_date ON rule_execution_logs(executed_at DESC);

-- Particionamento por data (opcional para alta volumetria)
-- CREATE TABLE rule_execution_logs_y2024m01 PARTITION OF rule_execution_logs
-- FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
```

### Políticas RLS (Row Level Security)

```sql
-- Habilitar RLS nas tabelas
ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE rule_execution_logs ENABLE ROW LEVEL SECURITY;

-- Política para automation_rules
CREATE POLICY "Users can view own automation rules"
    ON automation_rules FOR SELECT
    USING (auth.uid() = created_by AND deleted_at IS NULL);

CREATE POLICY "Users can insert own automation rules"
    ON automation_rules FOR INSERT
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own automation rules"
    ON automation_rules FOR UPDATE
    USING (auth.uid() = created_by AND deleted_at IS NULL)
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can delete own automation rules"
    ON automation_rules FOR UPDATE
    USING (auth.uid() = created_by AND deleted_at IS NULL);

-- Política para rule_execution_logs
CREATE POLICY "Users can view logs of own rules"
    ON rule_execution_logs FOR SELECT
    USING (
        rule_id IN (
            SELECT id FROM automation_rules 
            WHERE created_by = auth.uid() AND deleted_at IS NULL
        )
    );

-- Política para sistema inserir logs (service role)
CREATE POLICY "System can insert execution logs"
    ON rule_execution_logs FOR INSERT
    WITH CHECK (true);
```

### Schemas Pydantic

```python
from pydantic import BaseModel, Field, validator
from typing import List, Dict, Any, Optional
from datetime import datetime
from enum import Enum

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

class RuleCondition(BaseModel):
    field: str = Field(..., description="Campo a ser avaliado (ex: customer.name)")
    operator: ConditionOperator = Field(..., description="Operador de comparação")
    value: Any = Field(..., description="Valor para comparação")
    logic: Optional[str] = Field("AND", description="Lógica com próxima condição (AND/OR)")

class RuleAction(BaseModel):
    type: ActionType = Field(..., description="Tipo da ação")
    config: Dict[str, Any] = Field(..., description="Configuração específica da ação")
    order: int = Field(1, description="Ordem de execução")

class AutomationRuleBase(BaseModel):
    nome: str = Field(..., min_length=3, max_length=255, description="Nome da regra")
    descricao: Optional[str] = Field(None, description="Descrição detalhada")
    gatilho: TriggerType = Field(..., description="Tipo de gatilho")
    gatilho_config: Dict[str, Any] = Field(default_factory=dict, description="Configuração do gatilho")
    condicoes: List[RuleCondition] = Field(default_factory=list, description="Condições para execução")
    acoes: List[RuleAction] = Field(..., min_items=1, description="Ações a executar")

class AutomationRuleCreate(AutomationRuleBase):
    status: RuleStatus = Field(RuleStatus.INATIVA, description="Status inicial")

class AutomationRuleUpdate(BaseModel):
    nome: Optional[str] = Field(None, min_length=3, max_length=255)
    descricao: Optional[str] = None
    gatilho: Optional[TriggerType] = None
    gatilho_config: Optional[Dict[str, Any]] = None
    condicoes: Optional[List[RuleCondition]] = None
    acoes: Optional[List[RuleAction]] = None
    status: Optional[RuleStatus] = None

class AutomationRule(AutomationRuleBase):
    id: str = Field(..., description="ID único da regra")
    status: RuleStatus = Field(..., description="Status atual")
    created_by: str = Field(..., description="ID do usuário criador")
    created_at: datetime = Field(..., description="Data de criação")
    updated_at: datetime = Field(..., description="Data de atualização")
    
    # Campos calculados para frontend
    disparosMes: int = Field(0, description="Número de disparos no mês")
    taxaAbertura: str = Field("0%", description="Taxa de abertura/sucesso")

class ExecutionStatus(str, Enum):
    SUCCESS = "success"
    FAILED = "failed"
    PARTIAL = "partial"

class ActionResult(BaseModel):
    action_type: str = Field(..., description="Tipo da ação executada")
    status: str = Field(..., description="Status da execução (success/failed)")
    error: Optional[str] = Field(None, description="Mensagem de erro se falhou")
    executed_at: datetime = Field(..., description="Timestamp da execução")
    duration_ms: int = Field(..., description="Duração em milissegundos")

class RuleExecution(BaseModel):
    rule_id: str = Field(..., description="ID da regra executada")
    trigger_type: str = Field(..., description="Tipo de gatilho")
    trigger_data: Dict[str, Any] = Field(..., description="Dados do gatilho")
    conditions_met: bool = Field(..., description="Se condições foram atendidas")
    conditions_result: Optional[Dict[str, Any]] = Field(None, description="Resultado da avaliação")
    actions_executed: List[ActionResult] = Field(default_factory=list, description="Ações executadas")
    execution_status: ExecutionStatus = Field(..., description="Status geral da execução")
    error_message: Optional[str] = Field(None, description="Mensagem de erro geral")
    duration_ms: int = Field(..., description="Duração total em milissegundos")
    executed_at: datetime = Field(..., description="Timestamp da execução")

class AutomationStats(BaseModel):
    fluxos_ativos: int = Field(..., description="Número de regras ativas")
    mensagens_enviadas_hoje: int = Field(..., description="Mensagens enviadas hoje")
    taxa_media_abertura: str = Field(..., description="Taxa média de abertura")

class RuleExecutionLog(BaseModel):
    id: str = Field(..., description="ID do log")
    rule_id: str = Field(..., description="ID da regra")
    rule_name: str = Field(..., description="Nome da regra")
    trigger_type: str = Field(..., description="Tipo de gatilho")
    execution_status: ExecutionStatus = Field(..., description="Status da execução")
    actions_count: int = Field(..., description="Número de ações executadas")
    duration_ms: int = Field(..., description="Duração em milissegundos")
    executed_at: datetime = Field(..., description="Timestamp da execução")
    error_message: Optional[str] = Field(None, description="Mensagem de erro se houver")

# Validadores customizados
@validator('acoes')
def validate_actions_order(cls, v):
    """Valida que ações têm ordem sequencial"""
    if not v:
        return v
    
    orders = [action.order for action in v]
    if len(set(orders)) != len(orders):
        raise ValueError("Ações devem ter ordens únicas")
    
    return sorted(v, key=lambda x: x.order)

@validator('gatilho_config')
def validate_trigger_config(cls, v, values):
    """Valida configuração específica do gatilho"""
    if 'gatilho' not in values:
        return v
    
    trigger_type = values['gatilho']
    
    if trigger_type == TriggerType.SCHEDULED:
        if 'cron' not in v and 'interval' not in v:
            raise ValueError("Gatilho scheduled requer 'cron' ou 'interval'")
    
    return v
```

## Propriedades de Correção

*Uma propriedade é uma característica ou comportamento que deve ser verdadeiro em todas as execuções válidas de um sistema - essencialmente, uma declaração formal sobre o que o sistema deve fazer. As propriedades servem como ponte entre especificações legíveis por humanos e garantias de correção verificáveis por máquina.*

### Propriedade 1: Armazenamento Completo de Regras

*Para qualquer* solicitação de criação de regra com dados válidos, a regra armazenada deve conter todos os campos obrigatórios (nome, gatilho, ações).

**Valida: Requisitos 1.1**

### Propriedade 2: Persistência de Atualização de Regras

*Para qualquer* regra e dados de atualização válidos, após atualizar a regra, recuperá-la deve retornar os valores atualizados.

**Valida: Requisitos 2.2**

### Propriedade 3: Soft Delete Previne Execução

*Para qualquer* regra deletada, quando um evento de gatilho correspondente ocorrer, a regra não deve executar.

**Valida: Requisitos 2.3**

### Propriedade 4: Ativação Habilita Execução

*Para qualquer* regra inativa, após ativação, quando um evento de gatilho correspondente ocorrer, a regra deve executar.

**Valida: Requisitos 2.5**

### Propriedade 5: Avaliação de Condições Antes de Ações

*Para qualquer* regra com condições, as condições devem ser avaliadas antes de qualquer ação executar.

**Valida: Requisitos 3.2**

### Propriedade 6: Correção de Operadores de Comparação

*Para qualquer* condição numérica com operadores (>, <, ==, !=), a condição deve avaliar corretamente de acordo com a semântica do operador.

**Valida: Requisitos 3.3**

### Propriedade 7: Ordem de Execução de Ações

*Para qualquer* regra com múltiplas ações, as ações devem executar na ordem definida pelo campo order.

**Valida: Requisitos 4.1**

### Propriedade 8: Integração de Serviços de Ação

*Para qualquer* ação (email, tag, task), o serviço apropriado deve ser chamado com parâmetros corretos.

**Valida: Requisitos 4.2, 4.3, 4.4**

### Propriedade 9: Isolamento de Erros

*Para qualquer* regra onde uma ação falha, as ações restantes devem ainda executar e o erro deve ser registrado.

**Valida: Requisitos 4.5**

### Propriedade 10: Integração LangGraph Sem Bloqueio

*Para qualquer* execução de regra no node rules_evaluator, o fluxo da conversa não deve ser bloqueado.

**Valida: Requisitos 5.3**

### Propriedade 11: Atualização de AgentState

*Para qualquer* regra executada, o AgentState deve ser atualizado com triggered_rules e executed_actions.

**Valida: Requisitos 5.4**

### Propriedade 12: Formato de API Consistente

*Para qualquer* resposta da API, o formato deve corresponder exatamente ao esperado pelo frontend.

**Valida: Requisitos 6.1, 9.1, 9.2**

### Propriedade 13: Completude de Log de Execução

*Para qualquer* execução de regra, um registro de log deve ser criado com dados do gatilho, resultado das condições, ações executadas e timestamp.

**Valida: Requisitos 7.4**

### Propriedade 14: Performance de Avaliação

*Para qualquer* conjunto de regras ativas, a avaliação deve completar em menos de 200ms.

**Valida: Requisitos 8.1**

### Propriedade 15: Processamento Assíncrono

*Para qualquer* execução de ação, o processamento deve ser assíncrono para evitar bloquear o fluxo da conversa.

**Valida: Requisitos 8.2**

### Propriedade 16: Lógica de Retry

*Para qualquer* ação que falha, o sistema deve tentar novamente até 3 vezes com backoff exponencial antes de marcar como falhada.

**Valida: Requisitos 8.4**

### Propriedade 17: Validação de Campos Obrigatórios

*Para qualquer* criação de regra, todos os campos obrigatórios devem ser validados usando schemas Pydantic.

**Valida: Requisitos 10.1**

### Propriedade 18: Controle de Acesso RLS

*Para qualquer* usuário listando regras, apenas regras criadas por esse usuário devem ser retornadas.

**Valida: Requisitos 10.2**

### Propriedade 19: Sanitização de Entrada

*Para qualquer* processamento de gatilho, os dados de entrada devem ser sanitizados para prevenir ataques de injeção.

**Valida: Requisitos 10.4**

### Propriedade 20: Alertas de Falha Repetida

*Para qualquer* regra que falha repetidamente, o sistema deve criar alerta para revisão do admin.

**Valida: Requisitos 11.1**

### Propriedade 21: Avaliação de Gatilhos Suportados

*Para qualquer* tipo de gatilho suportado (lead_created, conversation_started, etc.), o sistema deve executar regras correspondentes.

**Valida: Requisitos 12.1, 12.2, 12.3, 12.4, 12.5**

### Propriedade 22: Execução de Ações Suportadas

*Para qualquer* tipo de ação suportado (send_email, apply_tag, etc.), o sistema deve executar a ação corretamente.

**Valida: Requisitos 13.1, 13.2, 13.3, 13.4, 13.5**

### Propriedade 23: Avaliação de Condições Suportadas

*Para qualquer* tipo de condição suportado (field_equals, field_contains, etc.), o sistema deve avaliar corretamente.

**Valida: Requisitos 14.1, 14.2, 14.3**

### Propriedade 24: Lógica AND/OR

*Para qualquer* conjunto de condições com operadores AND/OR, a avaliação deve seguir a lógica booleana correta.

**Valida: Requisitos 14.4**

### Propriedade 25: Auditoria Completa

*Para qualquer* operação de regra (criar, modificar, executar), um evento de auditoria deve ser registrado.

**Valida: Requisitos 15.1, 15.2, 15.3, 15.4**

## Tratamento de Erros

### Categorias de Erro

1. **Erros de Validação**: Configuração de regra inválida, campos obrigatórios ausentes
2. **Erros de Execução**: Falhas na execução de ações, indisponibilidade de serviços
3. **Erros de Sistema**: Falhas de banco de dados, timeouts, erros de rede

### Estratégia de Tratamento de Erros

**Erros de Validação**:
- Retornar 400 Bad Request com mensagens de erro detalhadas em português
- Não criar/atualizar regra
- Registrar falha de validação nos logs

**Erros de Execução**:
- Tentar ação novamente até 3 vezes com backoff exponencial (1s, 2s, 4s)
- Se todas as tentativas falharem, marcar ação como falhada
- Continuar executando ações restantes
- Registrar erro com stack trace completo

**Erros de Sistema**:
- Retornar 500 Internal Server Error
- Registrar erro com contexto completo
- Alertar administradores do sistema
- Implementar circuit breaker para serviços externos

### Configuração de Retry

```python
@dataclass
class RetryConfig:
    max_attempts: int = 3
    backoff_multiplier: float = 2.0
    initial_delay: float = 1.0  # segundos
    max_delay: float = 30.0     # segundos
    
    def get_delay(self, attempt: int) -> float:
        """Calcula delay para tentativa específica"""
        delay = self.initial_delay * (self.backoff_multiplier ** (attempt - 1))
        return min(delay, self.max_delay)
```

### Circuit Breaker

Implementar circuit breaker para chamadas de serviços externos:
- Abrir circuito após 5 falhas consecutivas
- Meio-aberto após 30 segundos
- Fechar circuito após 3 sucessos consecutivos

## Estratégia de Testes

### Testes Unitários

**Framework**: pytest

**Cobertura de Testes**:
- AutomationService: CRUD operations, validações, filtros
- RulesExecutor: avaliação de condições, execução de regras, logging
- ActionExecutor: todos os tipos de ação, lógica de retry, tratamento de erros
- API Controllers: endpoints, validação de entrada, formatação de resposta

**Exemplo de Teste Unitário**:
```python
import pytest
from unittest.mock import AsyncMock, patch
from automation_service import AutomationService
from schemas import AutomationRuleCreate, TriggerType, ActionType

@pytest.mark.asyncio
async def test_create_rule_success():
    """Testa criação bem-sucedida de regra"""
    service = AutomationService()
    
    rule_data = AutomationRuleCreate(
        nome="Teste Boas-vindas",
        gatilho=TriggerType.LEAD_CREATED,
        acoes=[{
            "type": ActionType.SEND_EMAIL,
            "config": {"template": "welcome"},
            "order": 1
        }]
    )
    
    with patch.object(service, '_db_create') as mock_create:
        mock_create.return_value = {"id": "test-id", **rule_data.dict()}
        
        result = await service.create_rule(rule_data)
        
        assert result.nome == "Teste Boas-vindas"
        assert result.gatilho == TriggerType.LEAD_CREATED
        assert len(result.acoes) == 1
        mock_create.assert_called_once()

@pytest.mark.asyncio
async def test_rules_executor_condition_evaluation():
    """Testa avaliação de condições"""
    executor = RulesExecutor()
    
    conditions = [
        RuleCondition(
            field="customer.name",
            operator=ConditionOperator.CONTAINS,
            value="João"
        )
    ]
    
    context = {
        "customer": {"name": "João Silva", "email": "joao@test.com"}
    }
    
    result = await executor.evaluate_conditions(conditions, context)
    assert result is True
    
    # Teste com condição não atendida
    context["customer"]["name"] = "Maria Silva"
    result = await executor.evaluate_conditions(conditions, context)
    assert result is False
```

### Testes Baseados em Propriedades

**Framework**: hypothesis (Python property-based testing library)

**Configuração**: Cada teste de propriedade deve executar mínimo 100 iterações

**Marcação de Testes**: Cada teste de propriedade deve incluir comentário com formato:
```python
# Feature: sprint-25-automacoes-backend, Property 1: Armazenamento Completo de Regras
```

**Testes de Propriedades**:

1. **Propriedade 1: Armazenamento Completo de Regras**
```python
# Feature: sprint-25-automacoes-backend, Property 1: Armazenamento Completo de Regras
@given(automation_rule_data())
@pytest.mark.asyncio
async def test_rule_storage_completeness(rule_data):
    """Testa que todas as regras criadas contêm campos obrigatórios"""
    service = AutomationService()
    
    created_rule = await service.create_rule(rule_data)
    
    assert created_rule.nome == rule_data.nome
    assert created_rule.gatilho == rule_data.gatilho
    assert len(created_rule.acoes) == len(rule_data.acoes)
    assert created_rule.id is not None
    assert created_rule.created_at is not None

# Feature: sprint-25-automacoes-backend, Property 7: Ordem de Execução de Ações
@given(actions_list())
@pytest.mark.asyncio
async def test_action_execution_order(actions):
    """Testa que ações executam na ordem definida"""
    executor = ActionExecutor()
    execution_order = []
    
    async def mock_execute(action, context):
        execution_order.append(action.order)
        return ActionResult(
            action_type=action.type,
            status="success",
            executed_at=datetime.now(),
            duration_ms=100
        )
    
    with patch.object(executor, 'execute_action', side_effect=mock_execute):
        await executor.execute_actions(actions, {})
    
    expected_order = sorted([action.order for action in actions])
    assert execution_order == expected_order

# Feature: sprint-25-automacoes-backend, Property 14: Performance de Avaliação
@given(active_rules_list())
@pytest.mark.asyncio
async def test_evaluation_performance(rules):
    """Testa que avaliação completa em menos de 200ms"""
    executor = RulesExecutor()
    
    start_time = time.time()
    
    results = await executor.evaluate_rules("conversation_started", {
        "customer": {"name": "Test", "email": "test@test.com"}
    })
    
    end_time = time.time()
    duration_ms = (end_time - start_time) * 1000
    
    assert duration_ms < 200  # Menos de 200ms
    assert isinstance(results, list)
```

### Testes de Integração

**Cenários de Teste**:
- Fluxo completo: criar regra → disparar gatilho → verificar execução
- Integração com LangGraph: node rules_evaluator no fluxo de conversa
- Integração com banco de dados: CRUD operations com RLS
- Integração com serviços externos: envio de email, aplicação de tags

**Exemplo de Teste de Integração**:
```python
@pytest.mark.integration
@pytest.mark.asyncio
async def test_complete_automation_flow():
    """Testa fluxo completo de automação"""
    # Criar regra
    rule_data = AutomationRuleCreate(
        nome="Boas-vindas Lead",
        gatilho=TriggerType.LEAD_CREATED,
        acoes=[
            RuleAction(
                type=ActionType.SEND_EMAIL,
                config={"template": "welcome", "recipient": "{{customer.email}}"},
                order=1
            ),
            RuleAction(
                type=ActionType.APPLY_TAG,
                config={"tag": "Novo Lead"},
                order=2
            )
        ]
    )
    
    service = AutomationService()
    rule = await service.create_rule(rule_data)
    await service.toggle_rule_status(rule.id, "test-user")
    
    # Simular gatilho
    executor = RulesExecutor()
    context = {
        "customer": {"name": "João", "email": "joao@test.com"},
        "trigger_type": "lead_created"
    }
    
    executions = await executor.evaluate_rules("lead_created", context)
    
    # Verificar execução
    assert len(executions) == 1
    assert executions[0].rule_id == rule.id
    assert executions[0].conditions_met is True
    assert len(executions[0].actions_executed) == 2
    assert executions[0].execution_status == "success"
    
    # Verificar logs
    logs = await service.get_execution_logs(rule.id)
    assert len(logs) == 1
    assert logs[0].execution_status == "success"
```

### Testes de Performance

**Métricas a Monitorar**:
- Tempo de avaliação de regras (meta: < 200ms)
- Throughput de execução (meta: > 100 regras/minuto)
- Performance de consultas ao banco (meta: < 100ms por query)
- Uso de memória durante alta carga

**Teste de Carga**:
- Simular 1000 gatilhos simultâneos
- Verificar que todas as regras executam com sucesso
- Verificar que não há vazamentos de memória
- Verificar que banco de dados não sobrecarrega

## Considerações de Deploy

### Migrações de Banco

Executar migrações na ordem:
1. Criar tabela automation_rules
2. Criar tabela rule_execution_logs
3. Criar índices
4. Criar políticas RLS
5. Criar triggers e functions

### Variáveis de Ambiente

```bash
# Configuração de Performance
AUTOMATION_EVALUATION_TIMEOUT=200  # ms
AUTOMATION_ACTION_TIMEOUT=5000     # ms
AUTOMATION_RETRY_MAX_ATTEMPTS=3

# Configuração de Rate Limiting
AUTOMATION_RATE_LIMIT_PER_MINUTE=100
AUTOMATION_MAX_CONCURRENT_EXECUTIONS=50

# Configuração de Logs
AUTOMATION_LOG_RETENTION_DAYS=90
AUTOMATION_LOG_LEVEL=INFO

# Integração LangGraph
LANGGRAPH_VERSION=1.0.5
AUTOMATION_NODE_ENABLED=true

# Circuit Breaker
CIRCUIT_BREAKER_FAILURE_THRESHOLD=5
CIRCUIT_BREAKER_RECOVERY_TIMEOUT=30000  # ms
```

### Monitoramento

**Métricas a Acompanhar**:
- Total de regras criadas
- Regras ativas vs inativas
- Execuções por minuto
- Taxa de sucesso
- Tempo médio de execução
- Contagem de ações falhadas
- Profundidade da fila de execução

**Alertas**:
- Taxa de falha > 10%
- Tempo médio de execução > 5 segundos
- Fila de execução > 1000 itens
- Circuit breaker aberto

### Considerações de Escala

**Escala Horizontal**:
- Múltiplos workers podem processar regras da mesma fila
- Usar Redis para coordenação distribuída
- Garantir execução idempotente de ações

**Otimização de Banco**:
- Particionar tabela rule_execution_logs por data
- Arquivar logs antigos (> 90 dias) para tabela separada
- Usar connection pooling

**Cache**:
- Cache de regras ativas no Redis (TTL: 5 minutos)
- Cache de estatísticas (TTL: 1 hora)
- Invalidar cache na atualização/exclusão de regras