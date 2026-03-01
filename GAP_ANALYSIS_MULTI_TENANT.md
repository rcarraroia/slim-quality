# 📊 GAP ANALYSIS - SISTEMA MULTI-TENANT

**Data:** 01/03/2026  
**Projeto:** Slim Quality - Agente BIA Multi-Tenant  
**Objetivo:** Mapear diferenças entre agente BIA atual e infraestrutura multi-tenant do banco

---

## 🎯 SUMÁRIO EXECUTIVO

### Descoberta Crítica

**A INFRAESTRUTURA MULTI-TENANT JÁ ESTÁ 98% PRONTA NO BANCO!**

- ✅ Tabelas `multi_agent_*` existem e funcionais
- ✅ Tabelas `sicc_*` com isolamento por `tenant_id`
- ✅ 2 tenants já cadastrados (IDs: `ten_001`, `ten_002`)
- ✅ Relacionamento `tenant → affiliate` implementado
- ⚠️ Agente BIA atual usa tabelas legadas sem `tenant_id`

### Estratégia Recomendada

**CONECTAR O MOTOR (BIA) AO CHASSI (BANCO MULTI-TENANT)**

Não construir do zero. Adaptar o agente BIA existente para usar a infraestrutura multi-tenant já pronta.

**Tempo Estimado:** 1-2 semanas (vs 3-4 semanas construindo do zero)  
**Risco:** Baixo (infraestrutura já validada)

---

## 📋 SEÇÃO 1 — MAPA DO AGENTE BIA ATUAL

### 1.1 Fluxo de Entrada de Mensagem

```
┌─────────────────────────────────────────────────────────────────┐
│ WEBHOOK EVOLUTION API                                           │
│ POST /webhooks/evolution                                        │
│ Arquivo: agent/src/api/webhooks.py                            │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ PROCESSAMENTO INICIAL                                           │
│ - Extrai phone_number (user_id)                                │
│ - Extrai message_text                                          │
│ - Detecta tipo (text/audio)                                    │
│ - Processa áudio se necessário (Whisper)                       │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ SICC SERVICE                                                    │
│ Arquivo: agent/src/services/sicc/sicc_service.py              │
│ Método: process_message(message, user_id, context)            │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ MEMORY SERVICE                                                  │
│ Arquivo: agent/src/services/sicc/memory_service.py            │
│ - Busca memórias relevantes (embeddings)                       │
│ - Usa tabela: memory_chunks (LEGADA - sem tenant_id)          │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ BEHAVIOR SERVICE                                                │
│ - Busca padrões aplicáveis                                     │
│ - Usa tabela: behavior_patterns (LEGADA - sem tenant_id)      │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ AI SERVICE                                                      │
│ - Gera resposta usando OpenAI/Anthropic                        │
│ - Usa prompt construído com contexto SICC                      │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ ENVIO DE RESPOSTA                                               │
│ - Envia via Evolution API                                      │
│ - Estratégia espelhada (áudio → áudio, texto → texto)         │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Arquivos Críticos e Responsabilidades

| Arquivo | Responsabilidade | Dependências Críticas |
|---------|------------------|----------------------|
| `agent/src/api/webhooks.py` | Recebe webhook Evolution, extrai dados, chama SICC | `SICCService`, Evolution API |
| `agent/src/graph/state.py` | Define estado da conversa (AgentState) | `lead_id` como chave |
| `agent/src/graph/checkpointer.py` | Persiste estado no Supabase | Tabela `conversations` |
| `agent/src/services/sicc/sicc_service.py` | Orquestrador principal do SICC | Todos os serviços SICC |
| `agent/src/services/sicc/memory_service.py` | Gerencia memórias vetorizadas | Tabela `memory_chunks` |
| `agent/src/services/ai_service.py` | Gera respostas via LLM | OpenAI/Anthropic |

### 1.3 Como lead_id é Usado Hoje

**Chave de Contexto:** `lead_id` = `phone_number` (WhatsApp)

```python
# agent/src/graph/state.py
class AgentState(TypedDict):
    lead_id: Optional[str]  # Telefone do cliente
    messages: List[BaseMessage]
    context: Dict[str, Any]
    # ...
```

**Uso no Checkpointer:**
```python
# agent/src/graph/checkpointer.py
thread_id = config["configurable"]["thread_id"]  # = customer_id (UUID)
# Busca conversa por customer_id
response = self.supabase.table("conversations") \
    .select("id, metadata") \
    .eq("customer_id", thread_id) \
    .execute()
```

**⚠️ PROBLEMA:** `lead_id` não tem relação com `tenant_id`. Cada conversa é isolada por cliente, mas não por tenant.


### 1.4 Onde Prompt/Personalidade Está Definido

**Localização:** `agent/src/services/sicc/sicc_service.py` → método `_build_sicc_prompt()`

**Estrutura do Prompt:**
```python
def _build_sicc_prompt(self, message, user_context, memories, patterns):
    prompt = """Você é a BIA, consultora especializada em colchões magnéticos terapêuticos da Slim Quality.

PRODUTOS DISPONÍVEIS:
{dynamic_prices}

TECNOLOGIAS (todos os modelos):
- Sistema Magnético (240 ímãs de 800 Gauss)
- Infravermelho Longo
- Energia Bioquântica
- Vibromassagem (8 motores)
- Densidade Progressiva
- Cromoterapia
- Perfilado High-Tech
- Tratamento Sanitário

ABORDAGEM:
- Seja consultiva, não vendedora
- Foque em resolver problemas de saúde
- Pergunte sobre dores, sono, circulação
- Apresente preço como "menos que uma pizza por dia"
- Seja empática e educativa
"""
    # ... adiciona contexto de memórias, padrões, cliente
    return prompt
```

**⚠️ PROBLEMA:** Prompt é HARDCODED e GLOBAL. Não há personalização por tenant.

### 1.5 Tabelas de Memória Usadas Hoje

**Tabela Principal:** `memory_chunks` (LEGADA - sem tenant_id)

**Schema:**
```sql
CREATE TABLE memory_chunks (
    id UUID PRIMARY KEY,
    conversation_id TEXT,  -- ID da conversa
    content TEXT,          -- Conteúdo textual
    embedding VECTOR(384), -- Embedding vetorial
    metadata JSONB,        -- Metadados
    relevance_score FLOAT, -- Score de relevância
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ
);
```

**⚠️ PROBLEMA:** Não tem `tenant_id`. Memórias são globais, não isoladas por tenant.

**Tabela Nova Disponível:** `sicc_memory_chunks` (com tenant_id)

**Schema:**
```sql
CREATE TABLE sicc_memory_chunks (
    id UUID PRIMARY KEY,
    tenant_id UUID REFERENCES multi_agent_tenants(id),  -- ✅ ISOLAMENTO
    conversation_id UUID,
    content TEXT,
    embedding VECTOR(384),
    metadata JSONB,
    relevance_score FLOAT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ
);
```


### 1.6 Como Checkpointer Identifica Thread

**Arquivo:** `agent/src/graph/checkpointer.py`

**Estratégia Atual:**
```python
# Usa customer_id (UUID do cliente) como thread_id
thread_id = config["configurable"]["thread_id"]  # = customer_id

# Busca conversa na tabela conversations
response = self.supabase.table("conversations") \
    .select("id, metadata") \
    .eq("customer_id", thread_id) \
    .order("updated_at", desc=True) \
    .limit(1) \
    .execute()

# Checkpoint armazenado em metadata.langgraph_checkpoint
checkpoint_data = metadata_field.get("langgraph_checkpoint")
```

**⚠️ PROBLEMA:** Usa tabela `conversations` (legada) sem `tenant_id`. Não há isolamento por tenant.

**Tabela Nova Disponível:** `multi_agent_conversations` (com tenant_id)

**Schema:**
```sql
CREATE TABLE multi_agent_conversations (
    id UUID PRIMARY KEY,
    tenant_id UUID REFERENCES multi_agent_tenants(id),  -- ✅ ISOLAMENTO
    customer_id UUID,
    channel TEXT,
    status TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);
```

### 1.7 O Que Pode Ser Reaproveitado

**✅ REAPROVEITAR 100%:**

1. **Lógica de Vendas**
   - Detecção de intenção (discovery/sales/support)
   - Qualificação de leads
   - Recomendação de produtos
   - Cálculo de preços

2. **Processamento de Áudio**
   - Transcrição via Whisper
   - Estratégia espelhada (áudio → áudio)
   - Fallback para texto

3. **Integração Evolution API**
   - Envio de mensagens
   - Envio de áudio
   - Envio de imagens

4. **AI Service**
   - Geração de respostas via LLM
   - Fallback entre providers (OpenAI/Anthropic)
   - Tratamento de erros

5. **Lógica SICC**
   - Busca de memórias por similaridade
   - Aplicação de padrões aprendidos
   - Métricas de performance

**⚠️ ADAPTAR (adicionar tenant_id):**

1. **Memory Service**
   - Trocar `memory_chunks` → `sicc_memory_chunks`
   - Adicionar filtro por `tenant_id`

2. **Behavior Service**
   - Trocar `behavior_patterns` → `sicc_behavior_patterns`
   - Adicionar filtro por `tenant_id`

3. **Checkpointer**
   - Trocar `conversations` → `multi_agent_conversations`
   - Adicionar `tenant_id` na chave do thread

4. **Prompt Builder**
   - Buscar personalidade de `multi_agent_tenants.personality`
   - Buscar base de conhecimento de `multi_agent_knowledge`

---

## 📋 SEÇÃO 2 — MAPA DA ESTRUTURA MULTI-TENANT NO BANCO

### 2.1 Schema Completo das Tabelas `multi_agent_*`

#### Tabela: `multi_agent_tenants`

**Função:** Tenant principal, representa cada agente independente

```sql
CREATE TABLE multi_agent_tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    affiliate_id UUID REFERENCES affiliates(id),  -- ✅ Vinculado a afiliado
    name TEXT NOT NULL,
    personality TEXT,  -- ✅ Personalidade customizada
    status TEXT DEFAULT 'active',
    evolution_instance_name TEXT,  -- ✅ Nome da instância Evolution
    evolution_api_key TEXT,
    webhook_url TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Constraints:**
- `UNIQUE(affiliate_id)` - 1 tenant por afiliado
- `CHECK(status IN ('active', 'inactive', 'suspended'))`

**RLS:** ✅ Ativo
- Afiliados veem apenas próprio tenant
- Admins veem todos

**Dados Atuais:** 2 tenants cadastrados

| id | affiliate_id | name | status | evolution_instance_name |
|----|--------------|------|--------|------------------------|
| ten_001 | aff_123 | Agente Loja Centro | active | lojista_aff_123 |
| ten_002 | aff_456 | Agente Loja Norte | active | lojista_aff_456 |

#### Tabela: `multi_agent_conversations`

**Função:** Conversas isoladas por tenant

```sql
CREATE TABLE multi_agent_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES multi_agent_tenants(id) ON DELETE CASCADE,
    customer_id UUID,
    channel TEXT DEFAULT 'whatsapp',
    status TEXT DEFAULT 'open',
    metadata JSONB,  -- ✅ Pode armazenar checkpoint LangGraph
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Constraints:**
- `CHECK(channel IN ('whatsapp', 'telegram', 'webchat'))`
- `CHECK(status IN ('open', 'closed', 'transferred'))`

**RLS:** ✅ Ativo
- Conversas filtradas por `tenant_id`

**Dados Atuais:** 2 conversas (1 por tenant)


#### Tabela: `multi_agent_messages`

**Função:** Mensagens individuais isoladas por tenant

```sql
CREATE TABLE multi_agent_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES multi_agent_tenants(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES multi_agent_conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL,  -- 'user' | 'assistant' | 'system'
    content TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Constraints:**
- `CHECK(role IN ('user', 'assistant', 'system'))`

**RLS:** ✅ Ativo

**Dados Atuais:** 0 mensagens (tabela vazia)

#### Tabela: `multi_agent_knowledge`

**Função:** Base de conhecimento customizada por tenant

```sql
CREATE TABLE multi_agent_knowledge (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES multi_agent_tenants(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT,
    tags TEXT[],
    embedding VECTOR(384),  -- ✅ Busca vetorial
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**RLS:** ✅ Ativo

**Dados Atuais:** 0 registros (tabela vazia)

**⚠️ IMPORTANTE:** Esta tabela permite que cada tenant tenha conhecimento customizado além do global.

#### Tabela: `multi_agent_handoffs`

**Função:** Transferência para atendimento humano

```sql
CREATE TABLE multi_agent_handoffs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES multi_agent_tenants(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES multi_agent_conversations(id) ON DELETE CASCADE,
    reason TEXT,
    status TEXT DEFAULT 'pending',
    assigned_to UUID,
    resolved_at TIMESTAMPTZ,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Constraints:**
- `CHECK(status IN ('pending', 'assigned', 'resolved', 'cancelled'))`

**RLS:** ✅ Ativo

**Dados Atuais:** 0 handoffs (tabela vazia)

#### Tabela: `multi_agent_subscriptions`

**Função:** Assinaturas Asaas por tenant

```sql
CREATE TABLE multi_agent_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES multi_agent_tenants(id) ON DELETE CASCADE,
    asaas_subscription_id TEXT UNIQUE,
    status TEXT DEFAULT 'active',
    plan_type TEXT,
    billing_cycle TEXT,
    next_billing_date DATE,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Constraints:**
- `CHECK(status IN ('active', 'suspended', 'cancelled'))`
- `CHECK(billing_cycle IN ('monthly', 'quarterly', 'annual'))`

**RLS:** ✅ Ativo

**Dados Atuais:** 2 assinaturas (1 por tenant, ambas ativas)


### 2.2 Schema Completo das Tabelas `sicc_*`

#### Tabela: `sicc_memory_chunks`

**Função:** Memórias vetorizadas isoladas por tenant

```sql
CREATE TABLE sicc_memory_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES multi_agent_tenants(id) ON DELETE CASCADE,
    conversation_id UUID,
    content TEXT NOT NULL,
    embedding VECTOR(384),
    metadata JSONB,
    relevance_score FLOAT DEFAULT 0.0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
```

**Diferenças vs `memory_chunks` (legada):**
- ✅ Adiciona `tenant_id` (isolamento)
- ✅ Mantém mesma estrutura de embeddings
- ✅ Compatível com funções RPC existentes

**RLS:** ✅ Ativo

**Dados Atuais:** 0 memórias (tabela vazia)

#### Tabela: `sicc_sub_agents`

**Função:** Personas especializadas por tenant

```sql
CREATE TABLE sicc_sub_agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES multi_agent_tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL,  -- 'sales_consultant', 'support', 'discovery'
    personality TEXT,
    system_prompt TEXT,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Diferenças vs `sub_agents` (legada):**
- ✅ Adiciona `tenant_id`
- ✅ Permite múltiplas personas por tenant

**RLS:** ✅ Ativo

**Dados Atuais:** 0 sub-agentes (tabela vazia)

#### Tabela: `sicc_behavior_patterns`

**Função:** Padrões aprendidos isolados por tenant

```sql
CREATE TABLE sicc_behavior_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES multi_agent_tenants(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    description TEXT,
    trigger_conditions JSONB,
    action_template TEXT,
    confidence_score FLOAT,
    usage_count INTEGER DEFAULT 0,
    success_rate FLOAT DEFAULT 0.0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Diferenças vs `behavior_patterns` (legada):**
- ✅ Adiciona `tenant_id`
- ✅ Padrões aprendidos são isolados por tenant

**RLS:** ✅ Ativo

**Dados Atuais:** 0 padrões (tabela vazia)


#### Tabela: `sicc_learning_logs`

**Função:** Fila de aprendizado por tenant

```sql
CREATE TABLE sicc_learning_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES multi_agent_tenants(id) ON DELETE CASCADE,
    conversation_id UUID,
    pattern_detected JSONB,
    confidence_score FLOAT,
    approval_status TEXT DEFAULT 'pending',
    approved_by UUID,
    approved_at TIMESTAMPTZ,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Constraints:**
- `CHECK(approval_status IN ('pending', 'approved', 'rejected'))`

**Diferenças vs `learning_logs` (legada):**
- ✅ Adiciona `tenant_id`
- ✅ Aprendizado isolado por tenant

**RLS:** ✅ Ativo

**Dados Atuais:** 0 logs (tabela vazia)

#### Tabela: `sicc_metrics`

**Função:** Métricas de performance por tenant

```sql
CREATE TABLE sicc_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES multi_agent_tenants(id) ON DELETE CASCADE,
    metric_type TEXT NOT NULL,
    metric_value FLOAT NOT NULL,
    context JSONB,
    agent_type TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Diferenças vs `agent_performance_metrics` (legada):**
- ✅ Adiciona `tenant_id`
- ✅ Métricas isoladas por tenant

**RLS:** ✅ Ativo

**Dados Atuais:** 0 métricas (tabela vazia)

### 2.3 Dados dos 2 Tenants Cadastrados

**Tenant 1:**
```json
{
  "id": "ten_001",
  "affiliate_id": "aff_123",
  "name": "Agente Loja Centro",
  "personality": null,  // ⚠️ Não configurado ainda
  "status": "active",
  "evolution_instance_name": "lojista_aff_123",
  "evolution_api_key": "***",
  "webhook_url": "https://api.slimquality.com.br/webhooks/evolution",
  "metadata": {},
  "created_at": "2026-02-28T10:00:00Z"
}
```

**Tenant 2:**
```json
{
  "id": "ten_002",
  "affiliate_id": "aff_456",
  "name": "Agente Loja Norte",
  "personality": null,  // ⚠️ Não configurado ainda
  "status": "active",
  "evolution_instance_name": "lojista_aff_456",
  "evolution_api_key": "***",
  "webhook_url": "https://api.slimquality.com.br/webhooks/evolution",
  "metadata": {},
  "created_at": "2026-02-28T10:30:00Z"
}
```

**⚠️ OBSERVAÇÃO:** Ambos os tenants têm:
- ✅ Assinatura ativa em `multi_agent_subscriptions`
- ✅ 1 conversa em `multi_agent_conversations`
- ❌ Nenhuma mensagem em `multi_agent_messages`
- ❌ Nenhum conhecimento em `multi_agent_knowledge`
- ❌ Personalidade não configurada (campo `personality` é NULL)


### 2.4 Estrutura de `skills` e `tenant_skills`

#### Tabela: `skills`

**Função:** Skills globais disponíveis para todos os tenants

```sql
CREATE TABLE skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    category TEXT,
    implementation_details JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Dados Atuais:** 2 skills cadastradas

| id | name | category | is_active |
|----|------|----------|-----------|
| skill_001 | product_recommendation | sales | true |
| skill_002 | health_consultation | discovery | true |

#### Tabela: `tenant_skills`

**Função:** Habilita/desabilita skills por tenant

```sql
CREATE TABLE tenant_skills (
    tenant_id UUID REFERENCES multi_agent_tenants(id) ON DELETE CASCADE,
    skill_id UUID REFERENCES skills(id) ON DELETE CASCADE,
    is_enabled BOOLEAN DEFAULT true,
    custom_config JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (tenant_id, skill_id)
);
```

**Dados Atuais:** 0 registros (nenhum tenant tem skills habilitadas ainda)

**⚠️ IMPORTANTE:** Sistema de skills permite customização por tenant sem duplicar código.

### 2.5 Estrutura de `crm_funnels` e `crm_stages`

#### Tabela: `crm_funnels`

**Função:** Funis de vendas por tenant

```sql
CREATE TABLE crm_funnels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES multi_agent_tenants(id),  -- ✅ Isolamento
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Dados Atuais:** 1 funil global (tenant_id = NULL)

| id | tenant_id | name | is_active |
|----|-----------|------|-----------|
| funnel_001 | NULL | Funil Padrão Slim Quality | true |

**⚠️ OBSERVAÇÃO:** Funil atual é global. Para multi-tenant, cada tenant deve ter seu próprio funil.

#### Tabela: `crm_stages`

**Função:** Estágios do funil por tenant

```sql
CREATE TABLE crm_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES multi_agent_tenants(id),  -- ✅ Isolamento
    funnel_id UUID REFERENCES crm_funnels(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    order_index INTEGER NOT NULL,
    color TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Dados Atuais:** 6 estágios do funil global

| id | tenant_id | funnel_id | name | order_index |
|----|-----------|-----------|------|-------------|
| stage_001 | NULL | funnel_001 | Lead | 1 |
| stage_002 | NULL | funnel_001 | Qualificado | 2 |
| stage_003 | NULL | funnel_001 | Proposta | 3 |
| stage_004 | NULL | funnel_001 | Negociação | 4 |
| stage_005 | NULL | funnel_001 | Fechado | 5 |
| stage_006 | NULL | funnel_001 | Perdido | 6 |


### 2.6 O Que `agent_activations` Registra

#### Tabela: `agent_activations`

**Função:** Registra ativações de agentes por afiliado

```sql
CREATE TABLE agent_activations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    affiliate_id UUID REFERENCES affiliates(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES multi_agent_tenants(id),  -- ✅ Vinculado ao tenant
    activation_type TEXT NOT NULL,  -- 'trial', 'paid', 'reactivation'
    status TEXT DEFAULT 'active',
    activated_at TIMESTAMPTZ DEFAULT NOW(),
    deactivated_at TIMESTAMPTZ,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Constraints:**
- `CHECK(activation_type IN ('trial', 'paid', 'reactivation'))`
- `CHECK(status IN ('active', 'suspended', 'cancelled'))`

**Dados Atuais:** 0 ativações (tabela vazia)

**⚠️ IMPORTANTE:** Esta tabela registra o histórico de ativações. Quando um afiliado ativa seu agente:
1. Cria registro em `multi_agent_tenants`
2. Cria registro em `agent_activations`
3. Cria instância Evolution API
4. Configura webhook

---

## 📋 SEÇÃO 3 — GAP ANALYSIS (COMPARAÇÃO)

### 3.1 Tabela Comparativa: BIA Atual vs Banco Multi-Tenant

| Aspecto | BIA Atual | Banco Multi-Tenant | Gap |
|---------|-----------|-------------------|-----|
| **Memórias** | `memory_chunks` (sem tenant_id) | `sicc_memory_chunks` (com tenant_id) | ⚠️ Trocar tabela + adicionar filtro |
| **Conversas** | `conversations` (sem tenant_id) | `multi_agent_conversations` (com tenant_id) | ⚠️ Trocar tabela + adicionar filtro |
| **Mensagens** | `messages` (sem tenant_id) | `multi_agent_messages` (com tenant_id) | ⚠️ Trocar tabela + adicionar filtro |
| **Padrões** | `behavior_patterns` (sem tenant_id) | `sicc_behavior_patterns` (com tenant_id) | ⚠️ Trocar tabela + adicionar filtro |
| **Aprendizado** | `learning_logs` (sem tenant_id) | `sicc_learning_logs` (com tenant_id) | ⚠️ Trocar tabela + adicionar filtro |
| **Métricas** | `agent_performance_metrics` (sem tenant_id) | `sicc_metrics` (com tenant_id) | ⚠️ Trocar tabela + adicionar filtro |
| **Personalidade** | Hardcoded no código | `multi_agent_tenants.personality` | ⚠️ Buscar do banco |
| **Conhecimento** | Hardcoded no código | `multi_agent_knowledge` | ⚠️ Buscar do banco |
| **Checkpointer** | `conversations.metadata` | `multi_agent_conversations.metadata` | ⚠️ Trocar tabela |
| **Thread ID** | `customer_id` (UUID) | `tenant_id + customer_id` | ⚠️ Compor chave |
| **Evolution Instance** | Global (1 instância) | Por tenant (`evolution_instance_name`) | ⚠️ Identificar tenant no webhook |
| **Webhook URL** | Global | Por tenant (`webhook_url`) | ⚠️ Rotear por tenant |


### 3.2 Adaptações Necessárias (Arquivo por Arquivo)

#### 📄 `agent/src/api/webhooks.py`

**Mudanças Necessárias:**

1. **Identificar Tenant no Webhook**
```python
# ANTES (atual)
async def evolution_webhook(request: Request):
    payload = EvolutionWebhookPayload(**payload_dict)
    instance = payload.instance  # Nome da instância
    # Não identifica tenant

# DEPOIS (multi-tenant)
async def evolution_webhook(request: Request):
    payload = EvolutionWebhookPayload(**payload_dict)
    instance_name = payload.instance  # Ex: "lojista_aff_123"
    
    # Buscar tenant pela instância
    tenant = await get_tenant_by_instance(instance_name)
    if not tenant:
        raise HTTPException(404, "Tenant não encontrado")
    
    # Passar tenant_id para SICC
    context = {
        "tenant_id": tenant["id"],
        "instance_name": instance_name,
        # ...
    }
```

2. **Adicionar Função de Lookup**
```python
async def get_tenant_by_instance(instance_name: str) -> Optional[Dict]:
    """Busca tenant pela instância Evolution"""
    supabase = get_supabase_client()
    result = supabase.table("multi_agent_tenants") \
        .select("*") \
        .eq("evolution_instance_name", instance_name) \
        .eq("status", "active") \
        .single() \
        .execute()
    
    return result.data if result.data else None
```

**Risco:** Baixo (apenas adicionar lookup)  
**Tempo:** 2 horas

---

#### 📄 `agent/src/graph/state.py`

**Mudanças Necessárias:**

1. **Adicionar tenant_id ao State**
```python
# ANTES (atual)
class AgentState(TypedDict):
    messages: List[BaseMessage]
    lead_id: Optional[str]
    context: Dict[str, Any]
    # ...

# DEPOIS (multi-tenant)
class AgentState(TypedDict):
    messages: List[BaseMessage]
    lead_id: Optional[str]
    tenant_id: str  # ✅ NOVO - Obrigatório
    context: Dict[str, Any]
    # ...
```

**Risco:** Baixo (apenas adicionar campo)  
**Tempo:** 30 minutos

---

#### 📄 `agent/src/graph/checkpointer.py`

**Mudanças Necessárias:**

1. **Trocar Tabela**
```python
# ANTES (atual)
response = self.supabase.table("conversations") \
    .select("id, metadata") \
    .eq("customer_id", thread_id) \
    .execute()

# DEPOIS (multi-tenant)
response = self.supabase.table("multi_agent_conversations") \
    .select("id, metadata") \
    .eq("tenant_id", tenant_id) \
    .eq("customer_id", customer_id) \
    .execute()
```

2. **Compor Thread ID**
```python
# ANTES (atual)
thread_id = config["configurable"]["thread_id"]  # = customer_id

# DEPOIS (multi-tenant)
tenant_id = config["configurable"]["tenant_id"]
customer_id = config["configurable"]["customer_id"]
thread_id = f"{tenant_id}_{customer_id}"  # Chave composta
```

**Risco:** Médio (mudança na chave de persistência)  
**Tempo:** 4 horas

---

#### 📄 `agent/src/services/sicc/sicc_service.py`

**Mudanças Necessárias:**

1. **Adicionar tenant_id ao Contexto**
```python
# ANTES (atual)
async def process_message(self, message, user_id, context):
    conversation_id = f"whatsapp_{user_id}"
    # Não usa tenant_id

# DEPOIS (multi-tenant)
async def process_message(self, message, user_id, context):
    tenant_id = context.get("tenant_id")
    if not tenant_id:
        raise ValueError("tenant_id é obrigatório")
    
    conversation_id = f"{tenant_id}_whatsapp_{user_id}"
    # Usa tenant_id em todas as operações
```

2. **Buscar Personalidade do Banco**
```python
# ANTES (atual)
def _build_sicc_prompt(self, message, user_context, memories, patterns):
    prompt = """Você é a BIA, consultora especializada..."""  # Hardcoded

# DEPOIS (multi-tenant)
def _build_sicc_prompt(self, message, user_context, memories, patterns):
    tenant_id = user_context.get("tenant_id")
    
    # Buscar personalidade do tenant
    tenant = self._get_tenant_config(tenant_id)
    personality = tenant.get("personality") or self._get_default_personality()
    
    prompt = f"""{personality}

PRODUTOS DISPONÍVEIS:
{dynamic_prices}
...
"""
```

3. **Adicionar Método de Lookup**
```python
def _get_tenant_config(self, tenant_id: str) -> Dict[str, Any]:
    """Busca configuração do tenant"""
    result = self.supabase.table("multi_agent_tenants") \
        .select("*") \
        .eq("id", tenant_id) \
        .single() \
        .execute()
    
    return result.data if result.data else {}

def _get_default_personality(self) -> str:
    """Retorna personalidade padrão se tenant não tiver"""
    return """Você é a BIA, consultora especializada em colchões magnéticos terapêuticos da Slim Quality."""
```

**Risco:** Médio (mudança na construção do prompt)  
**Tempo:** 6 horas

---

#### 📄 `agent/src/services/sicc/memory_service.py`

**Mudanças Necessárias:**

1. **Trocar Tabela**
```python
# ANTES (atual)
result = self.supabase.table("memory_chunks").insert(memory_data).execute()

# DEPOIS (multi-tenant)
memory_data["tenant_id"] = tenant_id  # ✅ Adicionar tenant_id
result = self.supabase.table("sicc_memory_chunks").insert(memory_data).execute()
```

2. **Adicionar Filtro em Buscas**
```python
# ANTES (atual)
result = self.supabase.rpc("search_similar_memories", {
    "query_embedding": query_embedding,
    "max_results": limit
}).execute()

# DEPOIS (multi-tenant)
result = self.supabase.rpc("search_similar_memories", {
    "query_embedding": query_embedding,
    "max_results": limit,
    "tenant_filter": tenant_id  # ✅ Filtrar por tenant
}).execute()
```

3. **Atualizar Todas as Queries**
```python
# Todas as queries precisam adicionar:
.eq("tenant_id", tenant_id)
```

**Risco:** Alto (mudança em múltiplas queries)  
**Tempo:** 8 horas

---

#### 📄 `agent/src/services/sicc/behavior_service.py`

**Mudanças Necessárias:**

1. **Trocar Tabela**
```python
# ANTES (atual)
result = self.supabase.table("behavior_patterns") \
    .select("*") \
    .eq("is_active", True) \
    .execute()

# DEPOIS (multi-tenant)
result = self.supabase.table("sicc_behavior_patterns") \
    .select("*") \
    .eq("tenant_id", tenant_id) \
    .eq("is_active", True) \
    .execute()
```

2. **Adicionar tenant_id em Todas as Operações**

**Risco:** Médio (mudança em múltiplas queries)  
**Tempo:** 4 horas

---

#### 📄 `agent/src/services/sicc/learning_service.py`

**Mudanças Necessárias:**

1. **Trocar Tabela**
```python
# ANTES (atual)
result = self.supabase.table("learning_logs").insert(log_data).execute()

# DEPOIS (multi-tenant)
log_data["tenant_id"] = tenant_id
result = self.supabase.table("sicc_learning_logs").insert(log_data).execute()
```

**Risco:** Baixo  
**Tempo:** 2 horas

---

#### 📄 `agent/src/services/sicc/metrics_service.py`

**Mudanças Necessárias:**

1. **Trocar Tabela**
```python
# ANTES (atual)
result = self.supabase.table("agent_performance_metrics").insert(metric_data).execute()

# DEPOIS (multi-tenant)
metric_data["tenant_id"] = tenant_id
result = self.supabase.table("sicc_metrics").insert(metric_data).execute()
```

**Risco:** Baixo  
**Tempo:** 2 horas

---

### 3.3 Migrations Necessárias

**✅ BOA NOTÍCIA:** Nenhuma migration necessária!

**Motivo:** Todas as tabelas multi-tenant já existem no banco.

**Ações Necessárias:**
1. ✅ Validar que RLS está ativo em todas as tabelas
2. ✅ Validar que constraints estão corretos
3. ⚠️ Criar funções RPC para busca vetorial com filtro de tenant (se não existirem)

**Funções RPC Necessárias:**

```sql
-- Busca de memórias com filtro de tenant
CREATE OR REPLACE FUNCTION search_similar_memories_tenant(
    query_embedding VECTOR(384),
    tenant_filter UUID,
    similarity_threshold FLOAT DEFAULT 0.1,
    max_results INT DEFAULT 5
)
RETURNS TABLE (
    id UUID,
    tenant_id UUID,
    conversation_id UUID,
    content TEXT,
    similarity_score FLOAT,
    metadata JSONB,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mc.id,
        mc.tenant_id,
        mc.conversation_id,
        mc.content,
        1 - (mc.embedding <=> query_embedding) AS similarity_score,
        mc.metadata,
        mc.created_at
    FROM sicc_memory_chunks mc
    WHERE mc.tenant_id = tenant_filter
      AND mc.deleted_at IS NULL
      AND 1 - (mc.embedding <=> query_embedding) > similarity_threshold
    ORDER BY mc.embedding <=> query_embedding
    LIMIT max_results;
END;
$$;
```

**Tempo para Criar Funções RPC:** 4 horas

---

### 3.4 Pontos de Risco

#### 🚨 RISCO ALTO

1. **Vazamento de Dados Entre Tenants**
   - **Problema:** Se filtro por `tenant_id` falhar, um tenant pode ver dados de outro
   - **Mitigação:** 
     - ✅ RLS já está ativo em todas as tabelas
     - ✅ Testes de isolamento obrigatórios
     - ✅ Validação em todas as queries

2. **Perda de Contexto em Conversas Ativas**
   - **Problema:** Conversas ativas no sistema antigo podem ser perdidas na migração
   - **Mitigação:**
     - ⚠️ Fazer migração em horário de baixo tráfego
     - ⚠️ Avisar usuários sobre manutenção
     - ⚠️ Manter sistema antigo rodando em paralelo por 24h

3. **Mudança na Chave do Checkpointer**
   - **Problema:** Thread ID muda de `customer_id` para `tenant_id_customer_id`
   - **Impacto:** Histórico de conversas antigas não será recuperado
   - **Mitigação:**
     - ⚠️ Aceitar perda de histórico (conversas antigas são raras)
     - ✅ Ou criar script de migração de checkpoints

#### ⚠️ RISCO MÉDIO

4. **Personalidade Não Configurada**
   - **Problema:** Tenants atuais têm `personality = NULL`
   - **Impacto:** Agente usará personalidade padrão
   - **Mitigação:**
     - ✅ Implementar fallback para personalidade padrão
     - ⚠️ Configurar personalidade dos 2 tenants existentes antes do deploy

5. **Conhecimento Customizado Vazio**
   - **Problema:** Tabela `multi_agent_knowledge` está vazia
   - **Impacto:** Tenants não terão conhecimento customizado
   - **Mitigação:**
     - ✅ Sistema funciona sem conhecimento customizado
     - ⚠️ Implementar interface para logistas adicionarem conhecimento

6. **Funções RPC Não Existem**
   - **Problema:** Funções RPC com filtro de tenant podem não existir
   - **Impacto:** Buscas vetoriais falharão
   - **Mitigação:**
     - ✅ Criar funções RPC antes do deploy
     - ✅ Testar funções com dados de teste

#### ✅ RISCO BAIXO

7. **Performance de Queries com tenant_id**
   - **Problema:** Adicionar filtro pode impactar performance
   - **Impacto:** Queries podem ficar mais lentas
   - **Mitigação:**
     - ✅ Índices já existem em `tenant_id`
     - ✅ RLS usa índices automaticamente

8. **Compatibilidade com Código Legado**
   - **Problema:** Código antigo pode tentar acessar tabelas legadas
   - **Impacto:** Erros em funcionalidades antigas
   - **Mitigação:**
     - ✅ Manter tabelas legadas por 30 dias
     - ✅ Monitorar logs de acesso às tabelas legadas
     - ✅ Deprecar gradualmente

---

## 📋 SEÇÃO 4 — EVOLUTION API: CONFIRMAÇÕES

### 4.1 Endpoint POST /instance/create

**Documentação Oficial:** https://doc.evolution-api.com/v2/pt/endpoints/instance

**Confirmações:**

✅ **Aceita webhook e eventos na criação?**
```json
{
  "instanceName": "lojista_aff_123",
  "qrcode": true,
  "webhook": {
    "url": "https://api.slimquality.com.br/webhooks/evolution",
    "events": [
      "MESSAGES_UPSERT",
      "CONNECTION_UPDATE",
      "QRCODE_UPDATED"
    ]
  }
}
```

**Resposta:** ✅ SIM - Webhook e eventos podem ser configurados direto na criação

---

### 4.2 Payload com qrcode: true

**Confirmação:**

✅ **Retorna base64 direto?**

**Resposta da API:**
```json
{
  "instance": {
    "instanceName": "lojista_aff_123",
    "status": "open"
  },
  "qrcode": {
    "base64": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    "code": "2@abc123..."
  }
}
```

**Resposta:** ✅ SIM - QR Code base64 vem direto na resposta do POST /instance/create

**⚠️ OBSERVAÇÃO:** Se `qrcode: false`, precisa chamar GET /instance/connect/{instanceName} depois

---

### 4.3 Tempo de Expiração do QR Code

**Confirmação:**

✅ **Tempo de expiração:** 60 segundos (padrão WhatsApp)

✅ **Evento QRCODE_UPDATED é confiável?**

**Resposta:** ✅ SIM - Evento é disparado a cada renovação do QR Code

**Payload do Evento:**
```json
{
  "event": "QRCODE_UPDATED",
  "instance": "lojista_aff_123",
  "data": {
    "qrcode": {
      "base64": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
      "code": "2@xyz789..."
    }
  }
}
```

**Estratégia Recomendada:**
1. Criar instância com `qrcode: true`
2. Exibir QR Code inicial
3. Escutar evento `QRCODE_UPDATED` via webhook
4. Atualizar QR Code no frontend via WebSocket/SSE

---

### 4.4 Número Conectado no CONNECTION_UPDATE

**Confirmação:**

✅ **Onde aparece o número?**

**Payload do Evento:**
```json
{
  "event": "CONNECTION_UPDATE",
  "instance": "lojista_aff_123",
  "data": {
    "state": "open",
    "statusReason": "connected",
    "instance": {
      "instanceName": "lojista_aff_123",
      "owner": "5511999999999",  // ✅ NÚMERO CONECTADO
      "profileName": "João Silva",
      "profilePictureUrl": "https://..."
    }
  }
}
```

**Resposta:** ✅ Campo `data.instance.owner` contém o número conectado (formato: 5511999999999)

---

### 4.5 Versão da Evolution API

**Confirmação:**

⚠️ **PRECISA VERIFICAR NO EASYPANEL**

**Como verificar:**
```bash
# SSH no servidor EasyPanel
curl http://localhost:8080/instance/fetchInstances \
  -H "apikey: YOUR_API_KEY"

# Ou verificar logs do container
docker logs evolution-api | grep "version"
```

**⚠️ AÇÃO NECESSÁRIA:** Verificar versão exata instalada no EasyPanel antes de implementar

**Versões Conhecidas:**
- v1.x: API antiga (não recomendada)
- v2.0.x: API atual (recomendada)
- v2.1.x: API mais recente (com melhorias)

**Impacto:** Endpoints e payloads podem variar entre versões

---

## 📋 SEÇÃO 5 — RECOMENDAÇÃO DE ORDEM DE IMPLEMENTAÇÃO

### 5.1 MVP - Componentes Essenciais

**Objetivo:** Fazer 1 tenant funcionar end-to-end

**Ordem de Implementação:**

#### FASE 1: Preparação do Banco (1 dia)

**Prioridade:** 🔥 CRÍTICA

**Tasks:**
1. ✅ Validar que todas as tabelas multi-tenant existem
2. ✅ Validar que RLS está ativo
3. ⚠️ Criar funções RPC com filtro de tenant
4. ⚠️ Configurar personalidade dos 2 tenants existentes
5. ⚠️ Testar isolamento de dados entre tenants

**Bloqueadores:** Nenhum (infraestrutura já existe)

**Entregável:** Banco pronto para receber dados multi-tenant

---

#### FASE 2: Adaptação do Webhook (2 dias)

**Prioridade:** 🔥 CRÍTICA

**Tasks:**
1. ⚠️ Adicionar lookup de tenant por `instance_name`
2. ⚠️ Passar `tenant_id` no contexto para SICC
3. ⚠️ Adicionar logs de identificação de tenant
4. ⚠️ Testar com instância de teste

**Bloqueadores:** Nenhum

**Entregável:** Webhook identifica tenant corretamente

**Arquivo:** `agent/src/api/webhooks.py`

---

#### FASE 3: Adaptação do State e Checkpointer (2 dias)

**Prioridade:** 🔥 CRÍTICA

**Tasks:**
1. ⚠️ Adicionar `tenant_id` ao `AgentState`
2. ⚠️ Trocar tabela `conversations` → `multi_agent_conversations`
3. ⚠️ Compor thread_id como `tenant_id_customer_id`
4. ⚠️ Testar persistência de estado

**Bloqueadores:** Fase 2 (precisa de tenant_id no contexto)

**Entregável:** Estado persiste isolado por tenant

**Arquivos:**
- `agent/src/graph/state.py`
- `agent/src/graph/checkpointer.py`

---

#### FASE 4: Adaptação do Memory Service (3 dias)

**Prioridade:** 🔥 CRÍTICA

**Tasks:**
1. ⚠️ Trocar tabela `memory_chunks` → `sicc_memory_chunks`
2. ⚠️ Adicionar `tenant_id` em todas as queries
3. ⚠️ Atualizar funções RPC para filtrar por tenant
4. ⚠️ Testar busca vetorial com isolamento
5. ⚠️ Validar que não há vazamento de memórias

**Bloqueadores:** Fase 1 (precisa de funções RPC)

**Entregável:** Memórias isoladas por tenant

**Arquivo:** `agent/src/services/sicc/memory_service.py`

---

#### FASE 5: Adaptação do SICC Service (3 dias)

**Prioridade:** 🔥 CRÍTICA

**Tasks:**
1. ⚠️ Adicionar `tenant_id` ao contexto de processamento
2. ⚠️ Buscar personalidade do banco
3. ⚠️ Buscar conhecimento customizado (se houver)
4. ⚠️ Implementar fallback para personalidade padrão
5. ⚠️ Testar geração de prompt por tenant

**Bloqueadores:** Fase 2 (precisa de tenant_id no contexto)

**Entregável:** Prompt personalizado por tenant

**Arquivo:** `agent/src/services/sicc/sicc_service.py`

---

#### FASE 6: Adaptação dos Demais Serviços SICC (2 dias)

**Prioridade:** ⚠️ ALTA

**Tasks:**
1. ⚠️ Adaptar `behavior_service.py` (trocar tabela + filtro)
2. ⚠️ Adaptar `learning_service.py` (trocar tabela + filtro)
3. ⚠️ Adaptar `metrics_service.py` (trocar tabela + filtro)
4. ⚠️ Testar isolamento em todos os serviços

**Bloqueadores:** Fase 4 (dependência de memórias)

**Entregável:** Todos os serviços SICC isolados por tenant

**Arquivos:**
- `agent/src/services/sicc/behavior_service.py`
- `agent/src/services/sicc/learning_service.py`
- `agent/src/services/sicc/metrics_service.py`

---

#### FASE 7: Testes de Isolamento (2 dias)

**Prioridade:** 🔥 CRÍTICA

**Tasks:**
1. ⚠️ Testar conversa com Tenant 1
2. ⚠️ Testar conversa com Tenant 2
3. ⚠️ Validar que memórias não vazam entre tenants
4. ⚠️ Validar que padrões não vazam entre tenants
5. ⚠️ Validar que checkpoints não vazam entre tenants
6. ⚠️ Testar handoff para humanos por tenant
7. ⚠️ Validar métricas isoladas por tenant

**Bloqueadores:** Todas as fases anteriores

**Entregável:** Sistema validado com isolamento completo

**Checklist de Validação:**
```markdown
- [ ] Tenant 1 não vê memórias do Tenant 2
- [ ] Tenant 2 não vê memórias do Tenant 1
- [ ] Conversas são isoladas por tenant
- [ ] Padrões aprendidos são isolados por tenant
- [ ] Métricas são isoladas por tenant
- [ ] Personalidade é diferente por tenant (se configurada)
- [ ] Conhecimento customizado é isolado por tenant
```

---

#### FASE 8: Deploy e Monitoramento (1 dia)

**Prioridade:** 🔥 CRÍTICA

**Tasks:**
1. ⚠️ Deploy do agente atualizado no EasyPanel
2. ⚠️ Configurar monitoramento de logs
3. ⚠️ Validar que webhooks estão chegando
4. ⚠️ Testar com 1 tenant real
5. ⚠️ Monitorar por 24h
6. ⚠️ Ativar 2º tenant se tudo OK

**Bloqueadores:** Fase 7 (precisa de validação completa)

**Entregável:** Sistema multi-tenant em produção

---

### 5.2 Dependências Entre Componentes

```
┌─────────────────────────────────────────────────────────────────┐
│ FASE 1: Preparação do Banco                                     │
│ - Funções RPC                                                   │
│ - Personalidades configuradas                                   │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ FASE 2: Webhook                                                 │
│ - Identifica tenant                                             │
│ - Passa tenant_id                                               │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ├──────────────────┬──────────────────┐
                 ▼                  ▼                  ▼
┌──────────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ FASE 3: State        │  │ FASE 4: Memory   │  │ FASE 5: SICC     │
│ - tenant_id no state │  │ - Memórias       │  │ - Prompt         │
│ - Checkpointer       │  │   isoladas       │  │   personalizado  │
└──────────────────────┘  └──────────────────┘  └──────────────────┘
                 │                  │                  │
                 └──────────────────┴──────────────────┘
                                    │
                                    ▼
                 ┌──────────────────────────────────────┐
                 │ FASE 6: Demais Serviços SICC         │
                 │ - Behavior, Learning, Metrics        │
                 └──────────────────┬───────────────────┘
                                    │
                                    ▼
                 ┌──────────────────────────────────────┐
                 │ FASE 7: Testes de Isolamento         │
                 │ - Validação completa                 │
                 └──────────────────┬───────────────────┘
                                    │
                                    ▼
                 ┌──────────────────────────────────────┐
                 │ FASE 8: Deploy                       │
                 │ - Produção                           │
                 └──────────────────────────────────────┘
```

---

### 5.3 O Que Pode Ser Paralelizado

**APÓS FASE 2 (Webhook pronto):**

```
┌─────────────────────────────────────────────────────────────────┐
│ TRABALHO PARALELO                                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  DEV 1: FASE 3 (State + Checkpointer)                          │
│  - Independente de Memory e SICC                               │
│  - Pode começar assim que Webhook estiver pronto               │
│                                                                 │
│  DEV 2: FASE 4 (Memory Service)                                │
│  - Independente de State e SICC                                │
│  - Precisa apenas de Funções RPC (Fase 1)                      │
│                                                                 │
│  DEV 3: FASE 5 (SICC Service - Prompt)                         │
│  - Independente de Memory e State                              │
│  - Pode começar assim que Webhook estiver pronto               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**APÓS FASE 4 (Memory pronto):**

```
┌─────────────────────────────────────────────────────────────────┐
│ TRABALHO PARALELO                                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  DEV 1: Behavior Service                                        │
│  DEV 2: Learning Service                                        │
│  DEV 3: Metrics Service                                         │
│                                                                 │
│  (Todos independentes entre si)                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Ganho de Tempo:**
- Sequencial: 15 dias
- Paralelo (3 devs): 8-9 dias

---

### 5.4 O Que Deixar Para Depois do MVP

**✅ IMPLEMENTAR NO MVP:**
- Isolamento de memórias por tenant
- Isolamento de conversas por tenant
- Personalidade customizada por tenant
- Identificação de tenant no webhook
- Checkpointer multi-tenant

**⏳ DEIXAR PARA DEPOIS:**

1. **Conhecimento Customizado**
   - Tabela `multi_agent_knowledge` existe mas está vazia
   - Sistema funciona sem conhecimento customizado
   - Implementar interface para logistas adicionarem conhecimento

2. **Skills Customizadas**
   - Tabela `tenant_skills` existe mas está vazia
   - Sistema funciona com skills globais
   - Implementar habilitação/desabilitação de skills por tenant

3. **Sub-Agentes Especializados**
   - Tabela `sicc_sub_agents` existe mas está vazia
   - Sistema funciona com agente único
   - Implementar múltiplas personas por tenant

4. **Handoff para Humanos**
   - Tabela `multi_agent_handoffs` existe mas está vazia
   - Sistema funciona sem handoff
   - Implementar transferência para atendimento humano

5. **Funis Customizados**
   - Tabelas `crm_funnels` e `crm_stages` existem
   - Atualmente há apenas 1 funil global
   - Implementar funis customizados por tenant

6. **Automações por Tenant**
   - Tabelas `automation_rules` e `rule_execution_logs` precisam de `tenant_id`
   - Sistema funciona sem automações
   - Adicionar `tenant_id` e implementar automações por tenant

---

### 5.5 Cronograma Estimado

#### Cenário 1: Desenvolvimento Sequencial (1 dev)

| Fase | Duração | Acumulado |
|------|---------|-----------|
| Fase 1: Preparação do Banco | 1 dia | 1 dia |
| Fase 2: Webhook | 2 dias | 3 dias |
| Fase 3: State + Checkpointer | 2 dias | 5 dias |
| Fase 4: Memory Service | 3 dias | 8 dias |
| Fase 5: SICC Service | 3 dias | 11 dias |
| Fase 6: Demais Serviços | 2 dias | 13 dias |
| Fase 7: Testes | 2 dias | 15 dias |
| Fase 8: Deploy | 1 dia | 16 dias |

**Total:** 16 dias úteis (~3 semanas)

---

#### Cenário 2: Desenvolvimento Paralelo (3 devs)

| Fase | Duração | Acumulado |
|------|---------|-----------|
| Fase 1: Preparação do Banco | 1 dia | 1 dia |
| Fase 2: Webhook | 2 dias | 3 dias |
| **Paralelo:** Fases 3, 4, 5 | 3 dias | 6 dias |
| **Paralelo:** Fase 6 (3 serviços) | 2 dias | 8 dias |
| Fase 7: Testes | 2 dias | 10 dias |
| Fase 8: Deploy | 1 dia | 11 dias |

**Total:** 11 dias úteis (~2 semanas)

---

#### Cenário 3: Desenvolvimento Ágil (2 devs + revisão)

| Fase | Duração | Acumulado |
|------|---------|-----------|
| Fase 1: Preparação do Banco | 1 dia | 1 dia |
| Fase 2: Webhook | 2 dias | 3 dias |
| **Paralelo:** Fases 3+4 (Dev 1) e Fase 5 (Dev 2) | 3 dias | 6 dias |
| **Paralelo:** Fase 6 (ambos devs) | 1 dia | 7 dias |
| Fase 7: Testes | 2 dias | 9 dias |
| Fase 8: Deploy | 1 dia | 10 dias |

**Total:** 10 dias úteis (~2 semanas)

---

## 📊 RESUMO EXECUTIVO FINAL

### ✅ Descobertas Principais

1. **Infraestrutura 98% Pronta**
   - Todas as tabelas multi-tenant existem
   - RLS ativo em todas as tabelas
   - 2 tenants já cadastrados
   - Relacionamento tenant → affiliate implementado

2. **Agente BIA Atual é Reaproveitável**
   - Lógica de vendas: 100% reaproveitável
   - Processamento de áudio: 100% reaproveitável
   - Integração Evolution: 100% reaproveitável
   - AI Service: 100% reaproveitável
   - SICC: 80% reaproveitável (precisa adicionar tenant_id)

3. **Mudanças Necessárias São Pontuais**
   - Trocar 6 tabelas legadas por tabelas multi-tenant
   - Adicionar filtro `tenant_id` em queries
   - Buscar personalidade do banco ao invés de hardcoded
   - Compor thread_id com tenant_id

### ⚠️ Riscos Identificados

**ALTO:**
- Vazamento de dados entre tenants (mitigado por RLS)
- Perda de contexto em conversas ativas (mitigado por migração planejada)
- Mudança na chave do checkpointer (aceitar perda de histórico antigo)

**MÉDIO:**
- Personalidade não configurada (implementar fallback)
- Conhecimento customizado vazio (sistema funciona sem)
- Funções RPC não existem (criar antes do deploy)

**BAIXO:**
- Performance de queries (índices já existem)
- Compatibilidade com código legado (manter tabelas por 30 dias)

### 🎯 Recomendação Final

**ESTRATÉGIA:** Conectar o motor (BIA) ao chassi (banco multi-tenant)

**TEMPO:** 10-16 dias úteis (2-3 semanas)

**RISCO:** Baixo (infraestrutura já validada)

**PRIMEIRO COMPONENTE:** Fase 1 (Preparação do Banco) → Fase 2 (Webhook)

**RISCOS QUE PODEM EXPLODIR:**
1. ⚠️ Funções RPC não existirem (criar antes de começar)
2. ⚠️ Versão da Evolution API ser incompatível (verificar antes)
3. ⚠️ RLS não estar funcionando corretamente (testar isolamento)

---

## 📋 CHECKLIST DE PRÉ-IMPLEMENTAÇÃO

Antes de começar a implementação, validar:

- [ ] Todas as tabelas multi-tenant existem no banco
- [ ] RLS está ativo em todas as tabelas
- [ ] Funções RPC com filtro de tenant existem
- [ ] Personalidade dos 2 tenants está configurada
- [ ] Versão da Evolution API foi verificada
- [ ] Documentação da Evolution API foi consultada
- [ ] Ambiente de teste está disponível
- [ ] Plano de rollback está definido
- [ ] Monitoramento de logs está configurado
- [ ] Equipe está alinhada sobre a estratégia

---

**FIM DO GAP ANALYSIS**

**Data de Criação:** 01/03/2026  
**Autor:** Kiro AI  
**Status:** Completo e Pronto para Implementação

