# GUIA COMPLETO DE IMPLEMENTAÇÃO - SPRINT 6: AUTOMATION AND WORKFLOW SYSTEM
## Sistema Completo de Automação de Processos de Negócio

**Data:** 11 de janeiro de 2026  
**Versão:** 1.0  
**Status:** Pronto para Implementação  
**Arquitetura:** Python + FastAPI + Supabase + Event-Driven Architecture  

---

## 📋 ÍNDICE

1. [Visão Geral](#visão-geral)
2. [Arquitetura do Sistema](#arquitetura-do-sistema)
3. [Estrutura de Arquivos](#estrutura-de-arquivos)
4. [Implementação Passo a Passo](#implementação-passo-a-passo)
5. [Integrações com Outros Módulos](#integrações-com-outros-módulos)
6. [Testes e Validação](#testes-e-validação)
7. [Deploy e Configuração](#deploy-e-configuração)
8. [Checklist de Implementação](#checklist-de-implementação)

---

## 🎯 VISÃO GERAL

### O que é o Automation and Workflow System?

O **Automation and Workflow System** é uma solução empresarial completa que:

- **Automatiza processos de negócio** através de workflows configuráveis
- **Reage a eventos** de CRM, Vendas e Afiliados em tempo real
- **Executa ações complexas** (email, tags, tarefas, notificações)
- **Avalia condições lógicas** com operadores AND/OR
- **Registra execuções** para auditoria e análise
- **Fornece templates** pré-configurados para casos comuns
- **Integra com múltiplos sistemas** de forma transparente

### Funcionalidades Principais

1. **Workflow Engine** - Motor de execução de workflows com avaliação de condições
2. **Event Emitter** - Sistema de eventos para broadcast de ações de negócio
3. **Trigger System** - Suporte a gatilhos temporais e baseados em eventos
4. **Action Execution** - Execução de múltiplas ações em sequência
5. **Template Library** - Biblioteca de workflows pré-configurados
6. **Execution Logging** - Auditoria completa de todas as execuções
7. **Visual Editor** - Interface intuitiva para criação de workflows

### Benefícios

- ✅ **Automação Completa** - Processos executam sem intervenção manual
- ✅ **Integração Multi-Sistema** - CRM, Vendas, Afiliados integrados
- ✅ **Escalabilidade** - Suporta alta carga com processamento assíncrono
- ✅ **Auditoria** - Rastreamento completo de todas as ações
- ✅ **Flexibilidade** - Workflows customizáveis por usuário
- ✅ **Confiabilidade** - Retry automático e tratamento de erros

---

## 🏗️ ARQUITETURA DO SISTEMA

### Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────┐
│              BUSINESS SYSTEMS                          │
│     CRM | Sales | Affiliates | Conversations          │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│                EVENT EMITTER                           │
│         Broadcast Business Events                      │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│              WORKFLOW ENGINE                           │
│    Trigger Detection | Condition Evaluation            │
└─────────────────────┬───────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
        ▼             ▼             ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│  Condition  │ │   Action    │ │  Execution  │
│  Evaluator  │ │  Executor   │ │   Logger    │
└─────────────┘ └─────────────┘ └─────────────┘
        │             │             │
        └─────────────┼─────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│              INTEGRATIONS                              │
│   Email | CRM | Notifications | WhatsApp              │
└─────────────────────────────────────────────────────────┘
```

### Fluxo de Execução de Workflow

```
1. Evento de negócio ocorre (customer.created, order.paid)
   ↓
2. Event Emitter broadcast evento para Workflow Engine
   ↓
3. Workflow Engine identifica workflows ativos para o trigger
   ↓
4. Para cada workflow: Condition Evaluator avalia condições
   ↓
5. Se condições atendidas: Action Executor executa ações
   ↓
6. Execution Logger registra resultado no banco
   ↓
7. Métricas são atualizadas
   ↓
8. Sistema continua processando próximos eventos
```

---

## 📁 ESTRUTURA DE ARQUIVOS

### Estrutura Completa a Implementar

```
slim-quality/
├── agent/                                # Backend Python
│   ├── src/
│   │   ├── services/
│   │   │   ├── workflows/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── workflow_engine.py         # 🆕 Motor principal
│   │   │   │   ├── event_emitter.py           # 🆕 Sistema de eventos
│   │   │   │   ├── condition_evaluator.py     # 🆕 Avaliação condições
│   │   │   │   ├── action_executor.py         # 🆕 Execução ações
│   │   │   │   ├── template_manager.py        # 🆕 Gestão templates
│   │   │   │   ├── models.py                  # 🆕 Modelos Pydantic
│   │   │   │   └── utils.py                   # 🆕 Utilitários
│   │   │   │
│   │   │   ├── integrations/
│   │   │   │   ├── email_service.py           # 🆕 Envio emails
│   │   │   │   ├── notification_service.py    # 🆕 Notificações
│   │   │   │   └── whatsapp_service.py        # 🆕 WhatsApp via N8N
│   │   │   │
│   │   │   └── crm/
│   │   │       └── crm_service.py             # ✅ Já existe
│   │   │
│   │   └── api/
│   │       └── routes/
│   │           └── workflows.py               # 🆕 Endpoints REST
│   │
│   └── tests/
│       └── workflows/
│           ├── test_workflow_engine.py        # 🆕 Testes engine
│           ├── test_condition_evaluator.py    # 🆕 Testes condições
│           └── test_action_executor.py        # 🆕 Testes ações
│
├── supabase/
│   └── migrations/
│       └── 20260111100000_create_workflows.sql  # 🆕 Migration
│
└── .kiro/specs/sprint-6-automations-workflows/
    ├── requirements.md                   # ✅ Requisitos completos
    ├── design.md                        # 🆕 Design detalhado
    ├── tasks.md                         # 🆕 Tarefas implementadas
    └── GUIA_IMPLEMENTACAO_COMPLETO.md   # 🆕 Este documento
```

---

## 🔧 IMPLEMENTAÇÃO PASSO A PASSO

### Fase 1: Preparação e Banco de Dados

#### 1.1 Migration do Banco de Dados

**Arquivo:** `supabase/migrations/20260111100000_create_workflows.sql`

```sql
-- Migration: Automation and Workflow System
-- Sprint 6: Sistema completo de automação de processos

-- Tabela de workflows
CREATE TABLE IF NOT EXISTS workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT false,
  trigger_type TEXT NOT NULL,
  trigger_config JSONB,
  conditions JSONB,  -- Array de condições com operadores AND/OR
  actions JSONB NOT NULL,  -- Array de ações a executar
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL
);

-- Tabela de execuções de workflow
CREATE TABLE IF NOT EXISTS workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES workflows(id),
  trigger_event JSONB NOT NULL,
  conditions_result BOOLEAN NOT NULL,
  actions_executed INTEGER DEFAULT 0,
  execution_status TEXT NOT NULL,  -- success, partial, failed
  error_message TEXT,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  duration_ms INTEGER
);

-- Tabela de templates de workflow
CREATE TABLE IF NOT EXISTS workflow_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  is_public BOOLEAN DEFAULT true,
  trigger_type TEXT NOT NULL,
  trigger_config JSONB,
  conditions JSONB,
  actions JSONB NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_workflows_active ON workflows(is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_workflows_trigger ON workflows(trigger_type) WHERE is_active = true;
CREATE INDEX idx_executions_workflow ON workflow_executions(workflow_id);
CREATE INDEX idx_executions_date ON workflow_executions(executed_at DESC);
CREATE INDEX idx_templates_public ON workflow_templates(is_public);

-- Políticas RLS
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_templates ENABLE ROW LEVEL SECURITY;

-- Usuários veem apenas seus próprios workflows
CREATE POLICY "Users can view own workflows"
  ON workflows FOR SELECT
  USING (auth.uid() = user_id AND deleted_at IS NULL);

CREATE POLICY "Users can create own workflows"
  ON workflows FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Usuários veem execuções de seus workflows
CREATE POLICY "Users can view own executions"
  ON workflow_executions FOR SELECT
  USING (
    workflow_id IN (
      SELECT id FROM workflows WHERE user_id = auth.uid()
    )
  );

-- Templates públicos são visíveis para todos
CREATE POLICY "Public templates are visible"
  ON workflow_templates FOR SELECT
  USING (is_public = true OR created_by = auth.uid());
```

#### 1.2 Modelos Pydantic

**Arquivo:** `agent/src/services/workflows/models.py`

```python
"""
Modelos Pydantic para Workflow System
Define schemas de validação para workflows, triggers, condições e ações
"""

from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict, Any, Literal
from datetime import datetime
from uuid import UUID

# Tipos de triggers suportados
TriggerType = Literal[
    "customer.created",
    "conversation.created",
    "order.paid",
    "commission.calculated",
    "scheduled.daily",
    "scheduled.weekly",
    "scheduled.monthly"
]

# Tipos de ações suportadas
ActionType = Literal[
    "send_email",
    "apply_tag",
    "create_appointment",
    "send_notification",
    "send_whatsapp",
    "create_note"
]

# Operadores de condição
ConditionOperator = Literal[
    "equals",
    "not_equals",
    "contains",
    "not_contains",
    "greater_than",
    "less_than",
    "in",
    "not_in"
]

# Operadores lógicos
LogicOperator = Literal["AND", "OR"]

class TriggerConfig(BaseModel):
    """Configuração de trigger"""
    type: TriggerType
    config: Dict[str, Any] = Field(default_factory=dict)

class Condition(BaseModel):
    """Condição para avaliação"""
    field: str
    operator: ConditionOperator
    value: Any
    logic: Optional[LogicOperator] = "AND"

class Action(BaseModel):
    """Ação a ser executada"""
    type: ActionType
    config: Dict[str, Any]
    
    @validator('config')
    def validate_action_config(cls, v, values):
        """Valida configuração específica por tipo"""
        action_type = values.get('type')
        
        if action_type == 'send_email':
            required = ['template', 'recipient']
            if not all(k in v for k in required):
                raise ValueError(f"send_email requires: {required}")
        
        elif action_type == 'apply_tag':
            if 'tag' not in v:
                raise ValueError("apply_tag requires 'tag'")
        
        elif action_type == 'create_appointment':
            required = ['title', 'date', 'time']
            if not all(k in v for k in required):
                raise ValueError(f"create_appointment requires: {required}")
        
        return v

class WorkflowCreate(BaseModel):
    """Schema para criação de workflow"""
    name: str = Field(..., min_length=3, max_length=100)
    description: Optional[str] = None
    is_active: bool = False
    trigger: TriggerConfig
    conditions: Optional[List[Condition]] = None
    actions: List[Action] = Field(..., min_items=1)

class WorkflowUpdate(BaseModel):
    """Schema para atualização de workflow"""
    name: Optional[str] = Field(None, min_length=3, max_length=100)
    description: Optional[str] = None
    is_active: Optional[bool] = None
    trigger: Optional[TriggerConfig] = None
    conditions: Optional[List[Condition]] = None
    actions: Optional[List[Action]] = None

class WorkflowResponse(BaseModel):
    """Schema de resposta de workflow"""
    id: UUID
    user_id: UUID
    name: str
    description: Optional[str]
    is_active: bool
    trigger: Dict[str, Any]
    conditions: Optional[List[Dict[str, Any]]]
    actions: List[Dict[str, Any]]
    executions_count: int = 0
    last_execution: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class ExecutionResult(BaseModel):
    """Resultado de execução de workflow"""
    workflow_id: UUID
    workflow_name: str
    trigger_event: Dict[str, Any]
    conditions_met: bool
    actions_executed: int
    execution_status: Literal["success", "partial", "failed"]
    error_message: Optional[str] = None
    duration_ms: int
```

---

### Fase 2: Implementação do Workflow Engine

#### 2.1 Event Emitter

**Arquivo:** `agent/src/services/workflows/event_emitter.py`

```python
"""
Event Emitter - Sistema de broadcast de eventos de negócio
Permite que módulos emitam eventos que disparam workflows
"""

import structlog
from typing import Dict, Any, List, Callable
from datetime import datetime
import asyncio

logger = structlog.get_logger(__name__)

class EventEmitter:
    """
    Sistema de eventos para broadcast de ações de negócio
    """
    
    def __init__(self):
        self._listeners: Dict[str, List[Callable]] = {}
        logger.info("EventEmitter inicializado")
    
    def on(self, event_type: str, callback: Callable):
        """
        Registra listener para tipo de evento
        
        Args:
            event_type: Tipo do evento (ex: "customer.created")
            callback: Função assíncrona a ser chamada
        """
        if event_type not in self._listeners:
            self._listeners[event_type] = []
        
        self._listeners[event_type].append(callback)
        logger.info(f"Listener registrado para {event_type}")
    
    async def emit(self, event_type: str, event_data: Dict[str, Any]):
        """
        Emite evento para todos os listeners
        
        Args:
            event_type: Tipo do evento
            event_data: Dados do evento
        """
        try:
            event_data["_event_type"] = event_type
            event_data["_timestamp"] = datetime.now().isoformat()
            
            listeners = self._listeners.get(event_type, [])
            
            if not listeners:
                logger.debug(f"Nenhum listener para {event_type}")
                return
            
            logger.info(f"Emitindo evento {event_type} para {len(listeners)} listeners")
            
            # Executar todos os listeners assincronamente
            tasks = [listener(event_data) for listener in listeners]
            await asyncio.gather(*tasks, return_exceptions=True)
            
        except Exception as e:
            logger.error(f"Erro ao emitir evento {event_type}", error=str(e))

# Singleton instance
_event_emitter_instance = None

def get_event_emitter() -> EventEmitter:
    """Retorna instância singleton do EventEmitter"""
    global _event_emitter_instance
    
    if _event_emitter_instance is None:
        _event_emitter_instance = EventEmitter()
        logger.info("EventEmitter singleton created")
    
    return _event_emitter_instance
```

#### 2.2 Workflow Engine

**Arquivo:** `agent/src/services/workflows/workflow_engine.py`

```python
"""
Workflow Engine - Motor de execução de workflows
Processa triggers, avalia condições e executa ações
"""

import structlog
from typing import List, Dict, Any, Optional
from uuid import UUID
import time
from supabase import Client

from .models import WorkflowResponse, ExecutionResult
from .condition_evaluator import ConditionEvaluator
from .action_executor import ActionExecutor
from .event_emitter import get_event_emitter

logger = structlog.get_logger(__name__)

class WorkflowEngine:
    """
    Motor principal de execução de workflows
    """
    
    def __init__(self, supabase_client: Client):
        self.supabase = supabase_client
        self.condition_evaluator = ConditionEvaluator()
        self.action_executor = ActionExecutor(supabase_client)
        self.event_emitter = get_event_emitter()
        
        # Registrar listeners para eventos
        self._register_event_listeners()
        
        logger.info("WorkflowEngine inicializado")
    
    def _register_event_listeners(self):
        """Registra listeners para todos os tipos de eventos"""
        event_types = [
            "customer.created",
            "conversation.created",
            "order.paid",
            "commission.calculated"
        ]
        
        for event_type in event_types:
            self.event_emitter.on(event_type, self._handle_event)
    
    async def _handle_event(self, event_data: Dict[str, Any]):
        """
        Handler genérico para eventos
        Busca e executa workflows correspondentes
        """
        event_type = event_data.get("_event_type")
        
        try:
            # Buscar workflows ativos para este trigger
            workflows = await self._get_active_workflows(event_type)
            
            logger.info(f"Processando {len(workflows)} workflows para {event_type}")
            
            # Executar cada workflow
            for workflow in workflows:
                await self.execute_workflow(workflow, event_data)
                
        except Exception as e:
            logger.error(f"Erro ao processar evento {event_type}", error=str(e))
    
    async def execute_workflow(
        self,
        workflow: WorkflowResponse,
        trigger_data: Dict[str, Any]
    ) -> ExecutionResult:
        """
        Executa workflow completo
        
        Returns:
            Resultado da execução
        """
        start_time = time.time()
        
        try:
            # Avaliar condições
            conditions_met = True
            if workflow.conditions:
                conditions_met = self.condition_evaluator.evaluate(
                    workflow.conditions,
                    trigger_data
                )
            
            # Executar ações se condições atendidas
            actions_executed = 0
            execution_status = "success"
            error_message = None
            
            if conditions_met:
                try:
                    action_results = await self.action_executor.execute_actions(
                        workflow.actions,
                        trigger_data
                    )
                    actions_executed = len([r for r in action_results if r.get("success")])
                    
                    if actions_executed < len(workflow.actions):
                        execution_status = "partial"
                    
                except Exception as e:
                    execution_status = "failed"
                    error_message = str(e)
            
            # Calcular duração
            duration_ms = int((time.time() - start_time) * 1000)
            
            # Criar resultado
            result = ExecutionResult(
                workflow_id=workflow.id,
                workflow_name=workflow.name,
                trigger_event=trigger_data,
                conditions_met=conditions_met,
                actions_executed=actions_executed,
                execution_status=execution_status,
                error_message=error_message,
                duration_ms=duration_ms
            )
            
            # Registrar execução
            await self._log_execution(result)
            
            logger.info(f"Workflow {workflow.name} executado",
                       status=execution_status,
                       duration_ms=duration_ms)
            
            return result
            
        except Exception as e:
            logger.error(f"Erro ao executar workflow {workflow.id}", error=str(e))
            raise
    
    async def _get_active_workflows(self, trigger_type: str) -> List[WorkflowResponse]:
        """Busca workflows ativos para tipo de trigger"""
        try:
            response = self.supabase.table("workflows")\
                .select("*")\
                .eq("is_active", True)\
                .is_("deleted_at", "null")\
                .execute()
            
            # Filtrar por trigger type
            workflows = []
            for wf in response.data:
                if wf.get("trigger", {}).get("type") == trigger_type:
                    workflows.append(WorkflowResponse(**wf, executions_count=0))
            
            return workflows
            
        except Exception as e:
            logger.error("Erro ao buscar workflows ativos", error=str(e))
            return []
    
    async def _log_execution(self, result: ExecutionResult):
        """Registra execução no banco"""
        try:
            self.supabase.table("workflow_executions").insert({
                "workflow_id": str(result.workflow_id),
                "trigger_event": result.trigger_event,
                "conditions_result": result.conditions_met,
                "actions_executed": result.actions_executed,
                "execution_status": result.execution_status,
                "error_message": result.error_message,
                "duration_ms": result.duration_ms
            }).execute()
            
        except Exception as e:
            logger.error("Erro ao registrar execução", error=str(e))
```

---

## ✅ CHECKLIST DE IMPLEMENTAÇÃO

### Fase 1: Banco de Dados ✅
- [ ] Migration criada e aplicada
- [ ] Tabelas workflows, workflow_executions, workflow_templates criadas
- [ ] Índices de performance criados
- [ ] Políticas RLS configuradas

### Fase 2: Event System ✅
- [ ] EventEmitter implementado
- [ ] Listeners registrados
- [ ] Broadcast de eventos funcionando
- [ ] Integração com módulos existentes

### Fase 3: Workflow Engine ✅
- [ ] WorkflowEngine implementado
- [ ] Condition Evaluator funcionando
- [ ] Action Executor implementado
- [ ] Logs de execução registrados

### Fase 4: Integrações ✅
- [ ] Integração com CRM
- [ ] Integração com Sales
- [ ] Integração com Affiliates
- [ ] Email service funcionando
- [ ] WhatsApp via N8N funcionando

### Fase 5: Templates e API ✅
- [ ] Template Manager implementado
- [ ] Endpoints REST criados
- [ ] Visual Editor integrado
- [ ] Testes completos executados

---

## 🎯 CONCLUSÃO

O **Automation and Workflow System** fornece automação completa de processos de negócio com integração transparente entre CRM, Vendas e Afiliados, permitindo workflows complexos e escaláveis.

### Funcionalidades Entregues ✅
- ✅ Workflow Engine completo
- ✅ Sistema de eventos robusto
- ✅ Avaliação de condições flexível
- ✅ Execução de múltiplas ações
- ✅ Templates pré-configurados
- ✅ Auditoria completa
- ✅ Integração multi-sistema

**Data:** 11/01/2026  
**Status:** ✅ PRONTO PARA IMPLEMENTAÇÃO
