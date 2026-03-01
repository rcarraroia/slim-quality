# 🚀 PLANO DE IMPLEMENTAÇÃO - SISTEMA MULTI-TENANT

**Data:** 01/03/2026  
**Projeto:** Slim Quality - Agente BIA Multi-Tenant  
**Estratégia:** Reaproveitar infraestrutura existente (98% pronta)  
**Tempo Estimado:** 1-2 semanas  
**Risco:** Baixo  

---

## 📋 SUMÁRIO EXECUTIVO

### ✅ SITUAÇÃO ATUAL

**Infraestrutura no Banco:**
- ✅ 98% das tabelas prontas para multi-tenant
- ✅ 2 tenants já cadastrados (`multi_agent_tenants`)
- ✅ Sistema de isolamento por `tenant_id` implementado
- ✅ Relacionamento `tenant → affiliate` funcional

**Agente BIA Atual:**
- ❌ Single-tenant por design
- ❌ Usa `lead_id` (telefone) como identificador global
- ❌ Sem isolamento de contexto por tenant
- ❌ Configuração hardcoded (não personalizada)

### 🎯 OBJETIVO

Adaptar o agente BIA atual para usar a infraestrutura multi-tenant existente, permitindo que cada afiliado tenha seu próprio agente isolado com:
- Contexto separado por tenant
- Memórias isoladas
- Personalidade configurável
- Conhecimento específico
- Métricas individuais

---

## 🔍 ANÁLISE DE GAP

### 1. ARMAZENAMENTO DE CONTEXTO

**ATUAL:**
```python
# agent/src/services/sicc/memory_service.py
# Usa tabela legada sem tenant_id
async def store_memory(self, lead_id: str, content: str):
    # Armazena em 'memory_chunks' (legado)
    # SEM tenant_id
```

**NECESSÁRIO:**
```python
async def store_memory(self, tenant_id: str, conversation_id: str, content: str):
    # Armazenar em 'sicc_memory_chunks' (multi-tenant)
    # COM tenant_id + conversation_id
```

**IMPACTO:** Médio - Refatorar MemoryService completo

---

### 2. IDENTIFICAÇÃO DE CONVERSAS

**ATUAL:**
```python
# agent/src/graph/state.py
class AgentState(TypedDict):
    lead_id: str  # Telefone WhatsApp
    messages: list
    # SEM tenant_id
```

**NECESSÁRIO:**
```python
class AgentState(TypedDict):
    tenant_id: str  # ID do afiliado
    conversation_id: str  # ID da conversa
    lead_id: str  # Telefone (mantém compatibilidade)
    messages: list
```

**IMPACTO:** Alto - Modificar state em todo o grafo

---

### 3. CHECKPOINTER (PERSISTÊNCIA)

**ATUAL:**
```python
# agent/src/graph/checkpointer.py
# Usa apenas lead_id como chave
thread_id = f"lead_{lead_id}"
```

**NECESSÁRIO:**
```python
# Usar tenant_id + conversation_id como chave
thread_id = f"tenant_{tenant_id}_conv_{conversation_id}"
```

**IMPACTO:** Baixo - Ajustar formato da chave

---

### 4. CONFIGURAÇÃO DE PERSONALIDADE

**ATUAL:**
```python
# agent/src/services/sicc/sicc_service.py
# Prompt hardcoded no código
SYSTEM_PROMPT = "Você é a BIA..."
```

**NECESSÁRIO:**
```python
# Buscar configuração do tenant
async def get_tenant_config(self, tenant_id: str):
    # Buscar de multi_agent_tenants
    # Retornar personality, knowledge_base, etc.
```

**IMPACTO:** Médio - Criar sistema de configuração

---

### 5. WEBHOOK E ROTEAMENTO

**ATUAL:**
```python
# agent/src/api/webhooks.py
# Recebe mensagem WhatsApp
# Processa direto sem verificar tenant
```

**NECESSÁRIO:**
```python
# Identificar tenant pelo número WhatsApp
# Buscar tenant_id do afiliado
# Rotear para contexto correto
```

**IMPACTO:** Alto - Lógica de roteamento crítica

---

## 🏗️ ARQUITETURA PROPOSTA

### FLUXO MULTI-TENANT

```
1. Mensagem WhatsApp chega
   ↓
2. Webhook identifica número do afiliado
   ↓
3. Busca tenant_id em multi_agent_tenants (via affiliate_id)
   ↓
4. Busca/cria conversation_id em multi_agent_conversations
   ↓
5. Carrega contexto do tenant (memórias, config, knowledge)
   ↓
6. Processa mensagem com contexto isolado
   ↓
7. Salva resposta em multi_agent_messages
   ↓
8. Atualiza memórias em sicc_memory_chunks
   ↓
9. Registra métricas em sicc_metrics
```

### COMPONENTES A MODIFICAR

```
agent/
├── src/
│   ├── api/
│   │   ├── webhooks.py          ⚠️ MODIFICAR (roteamento)
│   │   └── chat.py              ⚠️ MODIFICAR (tenant_id)
│   ├── graph/
│   │   ├── state.py             ⚠️ MODIFICAR (adicionar tenant_id)
│   │   ├── builder.py           ⚠️ MODIFICAR (contexto)
│   │   └── checkpointer.py      ⚠️ MODIFICAR (chave)
│   ├── services/
│   │   ├── sicc/
│   │   │   ├── sicc_service.py  ⚠️ MODIFICAR (config por tenant)
│   │   │   └── memory_service.py ⚠️ MODIFICAR (tabela multi-tenant)
│   │   ├── supabase_client.py   ✅ MANTER (já funciona)
│   │   └── ai_service.py        ⚠️ MODIFICAR (contexto)
│   └── config.py                ✅ MANTER
```

---

## 📝 PLANO DE IMPLEMENTAÇÃO

### 🔴 FASE 1: PREPARAÇÃO DO BANCO (1 dia)

#### Task 1.1: Adicionar tenant_id em Automações
**Prioridade:** Alta  
**Tempo:** 2 horas  

**Ações:**
- [ ] Criar migration `20260301_add_tenant_to_automations.sql`
- [ ] Adicionar coluna `tenant_id UUID REFERENCES multi_agent_tenants(id)`
- [ ] Adicionar constraint `NOT NULL` após popular dados
- [ ] Criar índice `idx_automation_rules_tenant`
- [ ] Aplicar migration no Supabase

**SQL:**
```sql
-- Migration: Adicionar tenant_id em automações
BEGIN;

ALTER TABLE automation_rules 
ADD COLUMN tenant_id UUID REFERENCES multi_agent_tenants(id);

ALTER TABLE rule_execution_logs 
ADD COLUMN tenant_id UUID REFERENCES multi_agent_tenants(id);

CREATE INDEX idx_automation_rules_tenant ON automation_rules(tenant_id);
CREATE INDEX idx_rule_execution_logs_tenant ON rule_execution_logs(tenant_id);

COMMIT;
```

#### Task 1.2: Validar Estrutura Multi-Tenant
**Prioridade:** Alta  
**Tempo:** 1 hora  

**Ações:**
- [ ] Conectar via Supabase Power
- [ ] Validar que `multi_agent_tenants` tem 2 registros
- [ ] Validar relacionamento `tenant → affiliate`
- [ ] Validar políticas RLS ativas
- [ ] Documentar tenant_ids existentes

---

### 🟡 FASE 2: ADAPTAÇÃO DO STATE (2 dias)

#### Task 2.1: Modificar AgentState
**Prioridade:** Crítica  
**Tempo:** 3 horas  

**Arquivo:** `agent/src/graph/state.py`

**Antes:**
```python
class AgentState(TypedDict):
    lead_id: str
    messages: list[BaseMessage]
    context: dict
```

**Depois:**
```python
class AgentState(TypedDict):
    tenant_id: str  # NOVO
    conversation_id: str  # NOVO
    lead_id: str  # Mantém compatibilidade
    messages: list[BaseMessage]
    context: dict
    tenant_config: dict  # NOVO - config do tenant
```

#### Task 2.2: Modificar Checkpointer
**Prioridade:** Crítica  
**Tempo:** 2 horas  

**Arquivo:** `agent/src/graph/checkpointer.py`

**Antes:**
```python
def get_thread_id(lead_id: str) -> str:
    return f"lead_{lead_id}"
```

**Depois:**
```python
def get_thread_id(tenant_id: str, conversation_id: str) -> str:
    return f"tenant_{tenant_id}_conv_{conversation_id}"
```

#### Task 2.3: Modificar StateGraph Builder
**Prioridade:** Alta  
**Tempo:** 4 horas  

**Arquivo:** `agent/src/graph/builder.py`

**Ações:**
- [ ] Adicionar `tenant_id` e `conversation_id` no state inicial
- [ ] Modificar todos os nodes para receber tenant_id
- [ ] Atualizar lógica de persistência
- [ ] Testar isolamento de contexto

---

### 🟢 FASE 3: ADAPTAÇÃO DOS SERVIÇOS (3 dias)

#### Task 3.1: Criar TenantService
**Prioridade:** Alta  
**Tempo:** 4 horas  

**Arquivo:** `agent/src/services/tenant_service.py` (NOVO)

**Funcionalidades:**
```python
class TenantService:
    async def get_tenant_by_phone(self, phone: str) -> dict:
        """Busca tenant pelo número WhatsApp do afiliado"""
        
    async def get_tenant_config(self, tenant_id: str) -> dict:
        """Busca configuração do tenant"""
        
    async def get_or_create_conversation(
        self, 
        tenant_id: str, 
        lead_phone: str
    ) -> str:
        """Busca ou cria conversation_id"""
        
    async def validate_tenant_active(self, tenant_id: str) -> bool:
        """Valida se tenant está ativo (assinatura ok)"""
```

#### Task 3.2: Refatorar MemoryService
**Prioridade:** Crítica  
**Tempo:** 6 horas  

**Arquivo:** `agent/src/services/sicc/memory_service.py`

**Mudanças:**
- [ ] Trocar tabela `memory_chunks` → `sicc_memory_chunks`
- [ ] Adicionar filtro por `tenant_id` em todas as queries
- [ ] Adicionar `conversation_id` no armazenamento
- [ ] Garantir isolamento de memórias entre tenants
- [ ] Testar que tenant A não vê memórias do tenant B

**Antes:**
```python
async def store_memory(self, lead_id: str, content: str):
    await self.supabase.table('memory_chunks').insert({
        'lead_id': lead_id,
        'content': content
    })
```

**Depois:**
```python
async def store_memory(
    self, 
    tenant_id: str, 
    conversation_id: str, 
    content: str
):
    await self.supabase.table('sicc_memory_chunks').insert({
        'tenant_id': tenant_id,
        'conversation_id': conversation_id,
        'content': content
    })
```

#### Task 3.3: Refatorar SICCService
**Prioridade:** Alta  
**Tempo:** 8 horas  

**Arquivo:** `agent/src/services/sicc/sicc_service.py`

**Mudanças:**
- [ ] Remover prompt hardcoded
- [ ] Buscar configuração do tenant (personality, tone, knowledge)
- [ ] Carregar knowledge base específica do tenant
- [ ] Aplicar personalização por tenant
- [ ] Registrar métricas em `sicc_metrics` com tenant_id

**Antes:**
```python
SYSTEM_PROMPT = "Você é a BIA, assistente da Slim Quality..."

async def process_message(self, lead_id: str, message: str):
    # Usa prompt fixo
    response = await self.ai.generate(SYSTEM_PROMPT, message)
```

**Depois:**
```python
async def process_message(
    self, 
    tenant_id: str, 
    conversation_id: str, 
    message: str
):
    # Busca config do tenant
    config = await self.tenant_service.get_tenant_config(tenant_id)
    
    # Monta prompt personalizado
    system_prompt = self._build_tenant_prompt(config)
    
    # Processa com contexto isolado
    response = await self.ai.generate(system_prompt, message)
```

#### Task 3.4: Modificar AIService
**Prioridade:** Média  
**Tempo:** 3 horas  

**Arquivo:** `agent/src/services/ai_service.py`

**Mudanças:**
- [ ] Adicionar `tenant_id` no contexto de geração
- [ ] Registrar uso de tokens por tenant
- [ ] Aplicar limites de rate por tenant (se necessário)

---

### 🔵 FASE 4: ADAPTAÇÃO DAS APIS (2 dias)

#### Task 4.1: Refatorar Webhook Handler
**Prioridade:** Crítica  
**Tempo:** 6 horas  

**Arquivo:** `agent/src/api/webhooks.py`

**Fluxo Novo:**
```python
@app.post("/webhook/whatsapp")
async def handle_whatsapp_message(payload: dict):
    # 1. Extrair número do afiliado
    affiliate_phone = payload['from']
    
    # 2. Buscar tenant_id
    tenant = await tenant_service.get_tenant_by_phone(affiliate_phone)
    if not tenant:
        return {"error": "Tenant não encontrado"}
    
    # 3. Validar assinatura ativa
    if not await tenant_service.validate_tenant_active(tenant['id']):
        return {"error": "Assinatura inativa"}
    
    # 4. Buscar/criar conversation
    lead_phone = payload['to']  # Cliente final
    conversation_id = await tenant_service.get_or_create_conversation(
        tenant['id'], 
        lead_phone
    )
    
    # 5. Processar com contexto isolado
    response = await sicc_service.process_message(
        tenant_id=tenant['id'],
        conversation_id=conversation_id,
        message=payload['message']
    )
    
    # 6. Salvar em multi_agent_messages
    await save_message(tenant['id'], conversation_id, response)
    
    return {"success": True}
```

#### Task 4.2: Refatorar Chat API
**Prioridade:** Média  
**Tempo:** 3 horas  

**Arquivo:** `agent/src/api/chat.py`

**Mudanças:**
- [ ] Adicionar `tenant_id` como parâmetro obrigatório
- [ ] Validar permissões do tenant
- [ ] Usar contexto isolado

---

### 🟣 FASE 5: TESTES E VALIDAÇÃO (3 dias)

#### Task 5.1: Testes de Isolamento
**Prioridade:** Crítica  
**Tempo:** 1 dia  

**Cenários:**
- [ ] Tenant A envia mensagem → contexto isolado
- [ ] Tenant B envia mensagem → contexto isolado
- [ ] Validar que Tenant A NÃO vê memórias do Tenant B
- [ ] Validar que configurações são independentes
- [ ] Validar que métricas são separadas

#### Task 5.2: Testes de Performance
**Prioridade:** Média  
**Tempo:** 4 horas  

**Cenários:**
- [ ] 10 tenants simultâneos
- [ ] 100 mensagens por minuto
- [ ] Latência < 2 segundos
- [ ] Sem vazamento de memória

#### Task 5.3: Testes de Integração
**Prioridade:** Alta  
**Tempo:** 1 dia  

**Cenários:**
- [ ] Webhook WhatsApp → Processamento → Resposta
- [ ] Handoff para humano por tenant
- [ ] Persistência de memórias
- [ ] Recuperação de contexto após restart

---

### 🟠 FASE 6: DEPLOY E MONITORAMENTO (1 dia)

#### Task 6.1: Deploy Gradual
**Prioridade:** Alta  
**Tempo:** 4 horas  

**Estratégia:**
- [ ] Deploy em ambiente de staging
- [ ] Testar com 1 tenant piloto
- [ ] Validar logs e métricas
- [ ] Deploy em produção
- [ ] Monitorar por 24h

#### Task 6.2: Documentação
**Prioridade:** Média  
**Tempo:** 3 horas  

**Documentos:**
- [ ] Guia de configuração de tenant
- [ ] Guia de troubleshooting
- [ ] Documentação de APIs
- [ ] Runbook de operação

---

## 🎯 CRONOGRAMA RESUMIDO

| Fase | Duração | Dependências |
|------|---------|--------------|
| Fase 1: Preparação do Banco | 1 dia | Nenhuma |
| Fase 2: Adaptação do State | 2 dias | Fase 1 |
| Fase 3: Adaptação dos Serviços | 3 dias | Fase 2 |
| Fase 4: Adaptação das APIs | 2 dias | Fase 3 |
| Fase 5: Testes e Validação | 3 dias | Fase 4 |
| Fase 6: Deploy e Monitoramento | 1 dia | Fase 5 |
| **TOTAL** | **12 dias** | - |

**Tempo Real Estimado:** 2-3 semanas (considerando imprevistos)

---

## 🚨 RISCOS E MITIGAÇÕES

### RISCO 1: Vazamento de Dados Entre Tenants
**Probabilidade:** Média  
**Impacto:** Crítico  

**Mitigação:**
- ✅ Testes rigorosos de isolamento
- ✅ Code review focado em segurança
- ✅ Validação de RLS no Supabase
- ✅ Logs detalhados de acesso

### RISCO 2: Performance Degradada
**Probabilidade:** Baixa  
**Impacto:** Alto  

**Mitigação:**
- ✅ Testes de carga antes do deploy
- ✅ Índices otimizados no banco
- ✅ Cache de configurações de tenant
- ✅ Monitoramento de latência

### RISCO 3: Incompatibilidade com Sistema Atual
**Probabilidade:** Baixa  
**Impacto:** Médio  

**Mitigação:**
- ✅ Manter `lead_id` para compatibilidade
- ✅ Deploy gradual (1 tenant piloto)
- ✅ Rollback plan documentado
- ✅ Testes de regressão

---

## 🔄 PLANO DE ROLLBACK

### SE ALGO DER ERRADO:

**Opção 1: Rollback Completo**
1. Reverter deploy do agente
2. Restaurar código anterior
3. Validar funcionamento single-tenant
4. Investigar problema

**Opção 2: Rollback Parcial**
1. Desativar tenants problemáticos
2. Manter tenants funcionais
3. Corrigir problema específico
4. Reativar tenants

**Opção 3: Modo Híbrido**
1. Manter agente antigo rodando
2. Migrar tenants gradualmente
3. Validar cada migração
4. Desligar agente antigo quando 100% migrado

---

## ✅ CRITÉRIOS DE SUCESSO

### FUNCIONALIDADE:
- [ ] Cada tenant tem contexto isolado
- [ ] Memórias não vazam entre tenants
- [ ] Configurações são independentes
- [ ] Handoff funciona por tenant

### PERFORMANCE:
- [ ] Latência < 2 segundos
- [ ] Suporta 10+ tenants simultâneos
- [ ] Sem vazamento de memória
- [ ] Logs estruturados por tenant

### SEGURANÇA:
- [ ] RLS ativo em todas as tabelas
- [ ] Validação de tenant_id em todas as queries
- [ ] Logs de auditoria funcionando
- [ ] Testes de penetração passando

### OPERAÇÃO:
- [ ] Documentação completa
- [ ] Runbook de troubleshooting
- [ ] Monitoramento configurado
- [ ] Alertas de erro ativos

---

## 📚 REFERÊNCIAS

- **Auditoria do Banco:** `.kiro/auditoria-banco-multi-tenant.md`
- **Relatório BIA Atual:** `.kiro/relatorio-arquitetura-bia.md` (se existir)
- **Documentação Supabase:** https://supabase.com/docs
- **LangGraph Multi-Tenant:** https://langchain-ai.github.io/langgraph/

---

**PRÓXIMO PASSO:** Iniciar Fase 1 - Preparação do Banco

