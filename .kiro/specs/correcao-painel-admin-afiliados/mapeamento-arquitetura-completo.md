# 🗺️ MAPEAMENTO COMPLETO DA ARQUITETURA
## Sistema Slim Quality - Análise Técnica Definitiva

**Data:** 05/01/2026  
**Objetivo:** Mapear arquitetura real para implementar endpoints admin  

---

## 📋 RESPOSTAS ÀS QUESTÕES TÉCNICAS

### 1️⃣ **ESTRUTURA COMPLETA DO PROJETO**

```
slim-quality/
├── agent/                    ← Backend Python (FastAPI + LangGraph + SICC)
│   ├── src/
│   │   ├── api/             ← Routers FastAPI
│   │   ├── services/        ← Lógica de negócio
│   │   ├── schemas/         ← Pydantic models
│   │   ├── models/          ← Data models
│   │   ├── graph/           ← LangGraph
│   │   ├── monitoring/      ← Métricas
│   │   └── utils/           ← Utilitários
│   ├── docker-compose.yml   ← Redis + MCP servers
│   ├── Dockerfile
│   └── requirements.txt
│
├── src/                      ← Frontend React/TypeScript + Backend Express
│   ├── api/                 ← Backend Express (Node.js)
│   │   └── routes/          ← Routers Express
│   ├── components/          ← Componentes React
│   ├── pages/               ← Páginas React
│   ├── services/            ← Services frontend
│   ├── lib/                 ← Utilitários
│   ├── config/              ← Configurações
│   └── server.ts            ← Servidor Express principal
│
├── supabase/                 ← Migrations e Edge Functions
│   ├── migrations/          ← SQL migrations
│   └── functions/           ← Edge Functions (Deno)
│
├── public/                   ← Assets estáticos
├── dist/                     ← Build do frontend
├── docs/                     ← Documentação
├── scripts/                  ← Scripts utilitários
├── tests/                    ← Testes
│
├── package.json              ← Dependências frontend
├── vite.config.ts            ← Config Vite
├── tsconfig.json             ← Config TypeScript
└── vercel.json               ← Config Vercel
```

---

### 2️⃣ **BACKEND DO SITE - ARQUITETURA HÍBRIDA**

#### **✅ EXISTEM 2 BACKENDS:**

#### **Backend 1: Express.js (Node.js/TypeScript)**
- **Localização:** `src/server.ts` + `src/api/routes/`
- **Framework:** Express.js
- **Porta:** 3333 (padrão)
- **Função:** API REST para site (afiliados, webhooks, admin)
- **Deploy:** Vercel (junto com frontend)

**Rotas existentes:**
```typescript
// src/server.ts
app.use('/api/affiliates', affiliatesRoutes);
app.use('/api/referral', referralTrackingRoutes);
app.use('/api/webhooks', asaasWebhookRoutes);
app.use('/api/admin/affiliates', adminAffiliatesRoutes);  // ✅ JÁ EXISTE!
app.use('/api/mcp', mcpRoutes);
app.post('/api/chat', chatHandler);
```

#### **Backend 2: FastAPI (Python)**
- **Localização:** `agent/src/api/main.py`
- **Framework:** FastAPI
- **Porta:** 8000 (padrão)
- **Função:** Agente IA (LangGraph + SICC + MCP)
- **Deploy:** EasyPanel (VPS)

**Routers existentes:**
```python
# agent/src/api/main.py
from .api import affiliates, agent, automations, chat, health, mcp, sicc, webhooks
```

---

### 3️⃣ **FRONTEND SE CONECTA A QUAL BACKEND?**

#### **Configuração Atual:**

**Arquivo:** `src/lib/api.ts`
```typescript
const getApiBaseUrl = (): string => {
  // Em produção (build)
  if (import.meta.env.PROD) {
    return 'https://api.slimquality.com.br';  // ← Backend Express
  }
  
  // Em desenvolvimento
  return import.meta.env.VITE_API_URL || 'http://localhost:8000';  // ← Backend FastAPI
};
```

**Proxy Vite (desenvolvimento):**
```typescript
// vite.config.ts
proxy: {
  '/api': {
    target: process.env.VITE_API_URL || 'http://localhost:8000',
    changeOrigin: true,
  },
}
```

#### **📊 ANÁLISE:**

**EM PRODUÇÃO:**
- Frontend chama: `https://api.slimquality.com.br/api/*`
- Isso aponta para: **Backend Express (Vercel)**

**EM DESENVOLVIMENTO:**
- Frontend chama: `http://localhost:8000/api/*`
- Isso aponta para: **Backend FastAPI (agent/)**

#### **⚠️ PROBLEMA IDENTIFICADO:**

**INCONSISTÊNCIA DE BACKENDS!**
- Produção usa Express (Node.js)
- Desenvolvimento usa FastAPI (Python)
- **Endpoints precisam existir em AMBOS!**

---

### 4️⃣ **ROTAS EXISTENTES - MAPEAMENTO COMPLETO**

#### **Backend Express (src/api/routes/)**

**Arquivo:** `src/api/routes/affiliates.ts`
```typescript
POST   /api/affiliates/register
POST   /api/affiliates/validate-wallet
GET    /api/affiliates/dashboard
GET    /api/affiliates/referral-link
GET    /api/affiliates/network
```

**Arquivo:** `src/api/routes/admin/affiliates.ts` ✅ **JÁ EXISTE!**
```typescript
GET    /api/admin/affiliates                    // Listar todos
GET    /api/admin/affiliates/:id                // Detalhes
PUT    /api/admin/affiliates/:id/status         // Atualizar status
GET    /api/admin/affiliates/:id/network        // Rede genealógica
GET    /api/admin/affiliates/stats/overview     // Estatísticas
POST   /api/admin/affiliates/:id/recalculate-commissions
```

**Arquivo:** `src/api/routes/referral-tracking.ts`
```typescript
POST   /api/affiliates/track-click
POST   /api/affiliates/track-conversion
GET    /api/affiliates/referral-stats/:code
```

#### **Backend FastAPI (agent/src/api/)**

**Arquivo:** `agent/src/api/affiliates.py`
```python
GET    /api/affiliates/dashboard
GET    /api/affiliates/referral-link
POST   /api/affiliates/validate-wallet
```

**Arquivo:** `agent/src/api/agent.py`
```python
GET    /api/agent/status
GET    /api/agent/conversations
GET    /api/agent/config
POST   /api/agent/config
POST   /api/agent/test-prompt
GET    /api/agent/metrics
```

---

### 5️⃣ **DEPLOY ATUAL - INFRAESTRUTURA**

#### **VPS EasyPanel:**

**Containers rodando:**
```
CONTAINER         IMAGE                  PORTS                STATUS
slim-redis-dev    redis:7-alpine         6379:6379            Up 9 hours (healthy)
mcp-supabase      agent-mcp-supabase     3005:3000            Up 9 hours (unhealthy)
mcp-gateway       agent-mcp-gateway      8085:8080            Up 9 hours (unhealthy)
```

**O que está no EasyPanel:**
- ✅ Redis (cache)
- ✅ MCP Gateway (integração)
- ✅ MCP Supabase Server
- ❌ **Backend FastAPI NÃO está rodando!** (apenas containers auxiliares)

#### **Vercel:**

**O que está na Vercel:**
- ✅ Frontend React (build do Vite)
- ✅ Backend Express (src/server.ts)
- ✅ Serverless Functions (api/)

**URL:** `https://slimquality.com.br`

---

### 6️⃣ **BANCO DE DADOS SUPABASE - ESTRUTURA REAL**

#### **Projeto Supabase:**
- **ID:** `vtynmmtuvxreiwcxxlma`
- **Nome:** `Slim_n8n`
- **Região:** `sa-east-1` (São Paulo)
- **Status:** `ACTIVE_HEALTHY`
- **PostgreSQL:** 17.4.1

#### **Tabelas Principais (Schema public):**

**Autenticação:**
- `profiles` (2 registros) - Perfis de usuários
- `user_roles` (2 registros) - Roles RBAC
- `auth_logs` (10 registros) - Logs de autenticação

**Produtos:**
- `products` (1 registro) - Catálogo de colchões
- `product_images` (1 registro)
- `product_technologies` (0 registros)
- `technologies` (0 registros)
- `inventory_logs` (0 registros)

**Vendas:**
- `orders` (0 registros)
- `order_items` (0 registros)
- `order_status_history` (0 registros)
- `payments` (0 registros)
- `shipping_addresses` (0 registros)

**Afiliados (CRÍTICO):**
- `affiliates` (1 registro) - ✅ **RLS DESABILITADO!**
- `affiliate_network` (0 registros)
- `referral_codes` (0 registros)
- `referral_clicks` (0 registros)
- `referral_conversions` (0 registros)
- `commissions` (0 registros)
- `commission_splits` (0 registros)
- `commission_logs` (0 registros)
- `asaas_wallets` (0 registros)
- `notification_logs` (0 registros)
- `withdrawals` (0 registros)
- `withdrawal_logs` (0 registros)

**Asaas:**
- `asaas_transactions` (0 registros)
- `asaas_splits` (0 registros)
- `asaas_webhook_logs` (0 registros)

**CRM:**
- `customers` (1 registro)
- `customer_tags` (0 registros)
- `customer_tag_assignments` (1 registro)
- `customer_timeline` (2 registros)
- `conversations` (1 registro)
- `messages` (29 registros)
- `appointments` (0 registros)

**SICC (Agente IA):**
- `memory_chunks` (2 registros)
- `sub_agents` (3 registros)
- `behavior_patterns` (0 registros)
- `learning_logs` (0 registros)
- `agent_performance_metrics` (7 registros)
- `agent_config` (1 registro)
- `sicc_config` (1 registro)

**Automações:**
- `automation_rules` (0 registros)
- `rule_execution_logs` (0 registros)

**Webhooks:**
- `webhook_logs` (0 registros)

#### **⚠️ PROBLEMAS IDENTIFICADOS NO BANCO:**

1. **RLS DESABILITADO em `affiliates`:**
   ```sql
   "rls_enabled": false  ← CRÍTICO!
   ```

2. **Tabela `audit_logs` NÃO EXISTE:**
   - Nenhuma tabela de auditoria de ações admin
   - Precisamos criar

3. **Dados de teste mínimos:**
   - Apenas 1 afiliado cadastrado
   - 0 comissões
   - 0 conversões

---

## 🎯 RECOMENDAÇÃO FINAL

### **ONDE IMPLEMENTAR ENDPOINTS ADMIN?**

#### **✅ OPÇÃO RECOMENDADA: Backend Express (src/api/routes/admin/)**

**JUSTIFICATIVA:**

1. **✅ Já existe estrutura:**
   - `src/api/routes/admin/affiliates.ts` já tem 6 endpoints
   - Padrão estabelecido

2. **✅ Produção usa Express:**
   - Frontend em produção chama `https://api.slimquality.com.br`
   - Isso aponta para Express na Vercel

3. **✅ Integração com Supabase:**
   - Express já usa `@supabase/supabase-js`
   - Conexão configurada em `src/server.ts`

4. **✅ Deploy simplificado:**
   - Vercel faz deploy automático
   - Sem necessidade de rebuild Docker

5. **✅ Consistência:**
   - Todos os endpoints de afiliados já estão no Express
   - Manter tudo no mesmo backend

#### **❌ NÃO RECOMENDADO: Backend FastAPI (agent/)**

**MOTIVOS:**

1. ❌ **Produção não usa:**
   - FastAPI roda apenas em desenvolvimento
   - EasyPanel não tem FastAPI rodando

2. ❌ **Foco diferente:**
   - FastAPI é para agente IA (LangGraph + SICC)
   - Não para CRUD de admin

3. ❌ **Deploy complexo:**
   - Precisa rebuild Docker
   - Precisa configurar no EasyPanel

---

## 📊 ARQUITETURA FINAL RECOMENDADA

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React/Vite)                     │
│                  https://slimquality.com.br                  │
│                        Deploy: Vercel                        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ API Calls
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              BACKEND EXPRESS (Node.js/TypeScript)            │
│                https://api.slimquality.com.br                │
│                        Deploy: Vercel                        │
│                                                              │
│  Routers:                                                    │
│  ├─ /api/affiliates/*          (afiliados públicos)         │
│  ├─ /api/admin/affiliates/*    (admin - IMPLEMENTAR AQUI)   │
│  ├─ /api/referral/*            (rastreamento)               │
│  ├─ /api/webhooks/*            (Asaas)                      │
│  ├─ /api/mcp/*                 (MCP Gateway)                │
│  └─ /api/chat                  (chat site)                  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ Database Queries
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   SUPABASE (PostgreSQL)                      │
│                  vtynmmtuvxreiwcxxlma                        │
│                     Região: sa-east-1                        │
│                                                              │
│  Tabelas principais:                                         │
│  ├─ affiliates (1 registro)                                 │
│  ├─ affiliate_network                                       │
│  ├─ commissions                                             │
│  ├─ orders                                                  │
│  ├─ profiles (2 registros)                                  │
│  └─ [+ 40 tabelas]                                          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              BACKEND FASTAPI (Python) - OPCIONAL             │
│                   agent/src/api/main.py                      │
│                    Deploy: EasyPanel (VPS)                   │
│                                                              │
│  Função: Agente IA (LangGraph + SICC)                       │
│  Uso: Apenas para funcionalidades de IA                     │
│  Status: NÃO usado para endpoints admin                     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    REDIS (Cache)                             │
│                   Deploy: EasyPanel (VPS)                    │
│                    Porta: 6379                               │
│                   Status: Healthy                            │
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ PLANO DE AÇÃO DEFINITIVO

### **FASE 1: Preparação (30 min)**

1. **Habilitar RLS em `affiliates`:**
   ```sql
   ALTER TABLE affiliates ENABLE ROW LEVEL SECURITY;
   ```

2. **Criar tabela `audit_logs`:**
   ```sql
   CREATE TABLE audit_logs (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID REFERENCES auth.users(id),
     action TEXT NOT NULL,
     resource_type TEXT NOT NULL,
     resource_id UUID,
     details JSONB,
     ip_address INET,
     user_agent TEXT,
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

3. **Adicionar variáveis Asaas ao `.env.example`:**
   ```bash
   ASAAS_API_KEY=xxx
   ASAAS_BASE_URL=https://api.asaas.com/v3
   ASAAS_WALLET_RENUM=wal_xxxxx
   ASAAS_WALLET_JB=wal_xxxxx
   ```

### **FASE 2: Implementação Backend Express (2-3 horas)**

**Implementar em:** `src/api/routes/admin/affiliates.ts`

**Endpoints a completar:**
```typescript
GET    /api/admin/affiliates              // ✅ Já existe (completar)
GET    /api/admin/affiliates/:id          // ✅ Já existe (completar)
PUT    /api/admin/affiliates/:id/approve  // ❌ Criar
PUT    /api/admin/affiliates/:id/reject   // ❌ Criar
PUT    /api/admin/affiliates/:id/suspend  // ❌ Criar
POST   /api/admin/affiliates/:id/validate-wallet  // ❌ Criar
GET    /api/admin/audit-logs              // ❌ Criar
```

### **FASE 3: Integração Frontend (1-2 horas)**

**Conectar páginas:**
- `src/pages/admin/afiliados/AdminAfiliados.tsx`
- `src/pages/admin/afiliados/AdminAfiliadoDetalhes.tsx`

**Substituir dados mock por chamadas reais:**
```typescript
// Antes (mock):
const data = { affiliates: [...mockData] };

// Depois (real):
const response = await fetch('/api/admin/affiliates');
const data = await response.json();
```

### **FASE 4: Testes (30 min)**

1. Testar listagem de afiliados
2. Testar aprovação/rejeição
3. Testar validação de wallet
4. Testar auditoria

---

## 📋 CHECKLIST FINAL

### **Infraestrutura:**
- [x] Redis configurado e rodando
- [x] Supabase conectado
- [x] Backend Express funcionando
- [ ] RLS habilitado em `affiliates`
- [ ] Tabela `audit_logs` criada
- [ ] Variáveis Asaas configuradas

### **Backend Express:**
- [x] Router admin/affiliates existe
- [ ] Endpoints de aprovação implementados
- [ ] Validação Asaas implementada
- [ ] Auditoria implementada
- [ ] Autenticação JWT implementada

### **Frontend:**
- [x] Páginas admin existem
- [ ] Integração com API real
- [ ] Dados mock removidos
- [ ] Loading states implementados
- [ ] Error handling implementado

---

## 🎯 CONCLUSÃO

**ARQUITETURA IDENTIFICADA:**
- ✅ **2 backends:** Express (produção) + FastAPI (desenvolvimento/IA)
- ✅ **Frontend:** React/Vite na Vercel
- ✅ **Banco:** Supabase PostgreSQL
- ✅ **Cache:** Redis no EasyPanel

**DECISÃO TÉCNICA:**
- ✅ **Implementar endpoints admin no Backend Express**
- ✅ **Localização:** `src/api/routes/admin/affiliates.ts`
- ✅ **Deploy:** Automático via Vercel

**PRÓXIMOS PASSOS:**
1. Habilitar RLS em `affiliates`
2. Criar tabela `audit_logs`
3. Implementar endpoints faltantes no Express
4. Conectar frontend com API real
5. Testar fluxo completo

---

**Mapeamento concluído em:** 05/01/2026  
**Status:** ✅ Arquitetura completamente mapeada  
**Pronto para:** Implementação dos endpoints admin
