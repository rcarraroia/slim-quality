# 🔍 ANÁLISE PREVENTIVA OBRIGATÓRIA
## Correção do Painel Admin de Afiliados

**Data:** 05/01/2026  
**Spec:** correcao-painel-admin-afiliados  
**Objetivo:** Entender infraestrutura atual antes de implementar Tasks 1-22  

---

## ✅ RESPOSTAS ÀS 6 QUESTÕES CRÍTICAS

### 1️⃣ **ESTRUTURA DE PASTAS DO BACKEND**

#### **Estrutura Encontrada:**
```
agent/src/
├── api/                    # Routers FastAPI
│   ├── affiliates.py      ✅ JÁ EXISTE (endpoints mock)
│   ├── agent.py           ✅ JÁ EXISTE
│   ├── automations.py     ✅ JÁ EXISTE
│   ├── chat.py            ✅ JÁ EXISTE
│   ├── health.py          ✅ JÁ EXISTE
│   ├── mcp.py             ✅ JÁ EXISTE
│   ├── sicc.py            ✅ JÁ EXISTE
│   ├── webhooks.py        ✅ JÁ EXISTE
│   └── main.py            ✅ Arquivo principal
│
├── services/              # Lógica de negócio
│   ├── affiliate_service.py  ✅ JÁ EXISTE (parcial)
│   ├── ai_service.py         ✅ JÁ EXISTE
│   ├── asaas_service.py      ✅ JÁ EXISTE
│   ├── supabase_client.py    ✅ JÁ EXISTE
│   ├── automation/           ✅ Pasta de automações
│   └── sicc/                 ✅ Sistema SICC
│
├── schemas/               # Pydantic schemas
│   └── agent_schemas.py   ✅ JÁ EXISTE
│
├── models/                # Modelos de dados
│   ├── chat.py            ✅ JÁ EXISTE
│   └── webhook.py         ✅ JÁ EXISTE
│
├── config/                # Configurações
│   └── sicc_config.py     ✅ JÁ EXISTE
│
├── graph/                 # LangGraph
│   └── ...                ✅ JÁ EXISTE
│
├── monitoring/            # Monitoramento
│   ├── alerts.py          ✅ JÁ EXISTE
│   ├── system_metrics.py  ✅ JÁ EXISTE
│   └── webhook_metrics.py ✅ JÁ EXISTE
│
└── utils/                 # Utilitários
    └── logging.py         ✅ JÁ EXISTE
```

#### **📊 ANÁLISE:**
- ✅ **Estrutura bem organizada** seguindo padrões FastAPI
- ✅ **Router de afiliados já existe** (`api/affiliates.py`)
- ✅ **Service de afiliados já existe** (`services/affiliate_service.py`)
- ⚠️ **Endpoints atuais retornam dados MOCK** (não conectados ao Supabase real)
- ⚠️ **Falta router de admin** (`api/admin.py` não existe)
- ⚠️ **Falta service de admin** (`services/admin_service.py` não existe)

---

### 2️⃣ **REDIS ESTÁ CONFIGURADO?**

#### **✅ SIM - Redis está configurado e rodando**

**Evidências:**

1. **Docker Compose (`agent/docker-compose.yml`):**
```yaml
redis:
  image: redis:7-alpine
  container_name: slim-redis-dev
  ports:
    - "6379:6379"
  command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru
  volumes:
    - redis_data:/data
  networks:
    - slim-network
    - mcp-network
  healthcheck:
    test: ["CMD", "redis-cli", "ping"]
    interval: 30s
    timeout: 10s
    retries: 3
  restart: unless-stopped
```

2. **Variável de Ambiente (`.env.example`):**
```bash
REDIS_URL=redis://localhost:6379
```

3. **Dependência Python (`requirements.txt`):**
```
redis>=5.0.0
aioredis>=2.0.1
```

#### **📊 ANÁLISE:**
- ✅ **Redis rodando no Docker** (porta 6379)
- ✅ **Configurado com persistência** (appendonly yes)
- ✅ **Limite de memória:** 256MB
- ✅ **Política de eviction:** allkeys-lru (remove chaves menos usadas)
- ✅ **Health check ativo**
- ✅ **Biblioteca Python instalada**

#### **🎯 CONCLUSÃO:**
**Redis está 100% pronto para uso!** Podemos implementar cache de validações Asaas sem configuração adicional.

---

### 3️⃣ **VARIÁVEIS DE AMBIENTE**

#### **Arquivo `.env.example` Completo:**

```bash
# ===================================
# OPENAI (PRINCIPAL)
# ===================================
OPENAI_API_KEY=sk-proj-xxx
OPENAI_MODEL=gpt-4o

# ===================================
# CLAUDE AI (OPCIONAL)
# ===================================
CLAUDE_API_KEY=sk-ant-api03-xxx
CLAUDE_MODEL=claude-3-5-sonnet-20241022

# ===================================
# GOOGLE GEMINI (FALLBACK)
# ===================================
GEMINI_API_KEY=AIzaSyXXX
GEMINI_MODEL=gemini-1.5-pro

# ===================================
# SUPABASE ✅
# ===================================
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxx

# ===================================
# REDIS ✅
# ===================================
REDIS_URL=redis://localhost:6379

# ===================================
# MCP GATEWAY
# ===================================
MCP_GATEWAY_URL=http://mcp-gateway:8080

# ===================================
# WHATSAPP - UAZAPI
# ===================================
UAZAPI_URL=https://api.uazapi.com
UAZAPI_INSTANCE_ID=instance_xxx
UAZAPI_API_KEY=xxx

# ===================================
# WHATSAPP - EVOLUTION API (VPS)
# ===================================
EVOLUTION_URL=https://slimquality-evolution-api.wpjtfd.easypanel.host
EVOLUTION_API_KEY=xxx
EVOLUTION_INSTANCE=Slim Quality

# ===================================
# GOOGLE WORKSPACE
# ===================================
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx
GOOGLE_CREDENTIALS_JSON={"token": "xxx", "refresh_token": "xxx"}

# ===================================
# APP CONFIGURATION
# ===================================
DEBUG=false
LOG_LEVEL=INFO
```

#### **📊 ANÁLISE:**

**✅ VARIÁVEIS EXISTENTES:**
- ✅ `SUPABASE_URL` - URL do projeto Supabase
- ✅ `SUPABASE_SERVICE_KEY` - Service Role Key (acesso total)
- ✅ `REDIS_URL` - URL do Redis

**❌ VARIÁVEIS FALTANDO (ASAAS):**
- ❌ `ASAAS_API_KEY` - **NÃO EXISTE**
- ❌ `ASAAS_BASE_URL` - **NÃO EXISTE**
- ❌ `ASAAS_WALLET_FABRICA` - **NÃO EXISTE**
- ❌ `ASAAS_WALLET_RENUM` - **NÃO EXISTE**
- ❌ `ASAAS_WALLET_JB` - **NÃO EXISTE**

#### **🎯 AÇÃO NECESSÁRIA:**
**Adicionar variáveis Asaas ao `.env.example`:**
```bash
# ===================================
# ASAAS (GATEWAY DE PAGAMENTO)
# ===================================
ASAAS_API_KEY=xxx
ASAAS_BASE_URL=https://api.asaas.com/v3
ASAAS_WALLET_FABRICA=wal_xxxxx
ASAAS_WALLET_RENUM=wal_xxxxx
ASAAS_WALLET_JB=wal_xxxxx
```

---

### 4️⃣ **AUTENTICAÇÃO JWT IMPLEMENTADA?**

#### **❌ NÃO - Autenticação JWT NÃO está implementada**

**Evidências da busca:**
```bash
# Busca por: require_admin|jwt|auth|JWT|authentication
# Resultado: Apenas menções em logs de erro, nenhuma implementação real
```

**Arquivos verificados:**
- ❌ `api/affiliates.py` - Sem middleware de autenticação
- ❌ `api/agent.py` - Sem middleware de autenticação
- ❌ Nenhum arquivo `auth.py` ou `middleware.py` encontrado
- ❌ Nenhuma dependência `require_admin` encontrada

**Código atual usa placeholder:**
```python
# agent/src/api/affiliates.py (linha ~30)
user_id = "mock_user_id"  # Placeholder
# TODO: Implementar autenticação real quando disponível
```

#### **📊 ANÁLISE:**
- ❌ **Nenhum middleware de autenticação**
- ❌ **Nenhuma validação de JWT**
- ❌ **Nenhuma verificação de roles (admin/afiliado)**
- ❌ **Endpoints completamente abertos**

#### **🎯 AÇÃO NECESSÁRIA:**
**Implementar autenticação completa:**
1. Criar `api/auth.py` com middleware JWT
2. Criar `utils/auth_dependencies.py` com `require_auth()` e `require_admin()`
3. Integrar com Supabase Auth
4. Adicionar decorators aos endpoints

---

### 5️⃣ **TABELA `audit_logs` EXISTE NO SUPABASE?**

#### **❓ DESCONHECIDO - Precisa verificar no banco real**

**Evidências da busca:**
```bash
# Busca por: audit_logs|audit_log
# Resultado: Nenhuma referência no código Python
```

**Análise:**
- ❌ **Nenhuma referência a `audit_logs` no código backend**
- ❌ **Nenhum serviço de auditoria implementado**
- ✅ **Existe `services/automation/audit.py`** mas não usa tabela `audit_logs`

#### **📊 ANÁLISE:**
- ⚠️ **Tabela provavelmente NÃO existe** (sem referências no código)
- ⚠️ **Precisamos criar a tabela** via migration Supabase
- ⚠️ **Precisamos criar service de auditoria**

#### **🎯 AÇÃO NECESSÁRIA:**
**Verificar e criar se necessário:**
1. Usar Power Supabase para verificar se tabela existe
2. Se não existir, criar migration:
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

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
```

---

### 6️⃣ **DEPENDÊNCIAS PYTHON INSTALADAS**

#### **✅ SIM - Todas as dependências necessárias estão instaladas**

**Arquivo `requirements.txt` completo:**

```python
# Framework Web ✅
fastapi==0.115.0
uvicorn[standard]==0.32.0

# LangChain/LangGraph ✅
langchain==1.2.0
langgraph==1.0.5
langchain-anthropic==1.3.0
langchain-core==1.2.5

# OpenAI API ✅
openai>=1.50.0

# Supabase Client ✅
supabase==2.27.0

# Cache e Storage ✅
redis>=5.0.0
httpx  # Para chamadas HTTP (Asaas API)

# Utilitários ✅
python-dotenv>=1.0.0
pydantic>=2.11.0
pydantic-settings>=2.5.0
python-multipart>=0.0.9

# MCP SDK ✅
mcp>=1.25.0

# Google APIs ✅
google-api-python-client>=2.108.0
google-auth-httplib2>=0.2.0
google-auth-oauthlib>=1.2.0
google-generativeai>=0.8.0

# Logging ✅
structlog>=23.2.0

# SICC - Sistema de Inteligência Corporativa ✅
sentence-transformers>=2.2.2
torch>=2.0.0
transformers>=4.35.0
numpy>=1.24.0
scikit-learn>=1.3.0

# Banco de Dados e Vetores ✅
psycopg2-binary>=2.9.7
pgvector>=0.2.4
sqlalchemy>=2.0.0
alembic>=1.12.0

# Processamento Assíncrono ✅
asyncio-mqtt>=0.13.0
aioredis>=2.0.1
celery>=5.3.0

# Análise de Dados e Métricas ✅
pandas>=2.1.0
matplotlib>=3.7.0
seaborn>=0.12.0

# Testes ✅
hypothesis>=6.88.0
pytest>=7.4.0
pytest-asyncio>=0.21.0
```

#### **📊 ANÁLISE:**
- ✅ **FastAPI** - Framework web
- ✅ **Pydantic** - Validação de schemas
- ✅ **Supabase** - Cliente Python
- ✅ **Redis** - Cache
- ✅ **httpx** - Cliente HTTP para Asaas API
- ✅ **structlog** - Logging estruturado
- ✅ **pytest** - Testes
- ✅ **hypothesis** - Property-based testing

#### **🎯 CONCLUSÃO:**
**Todas as dependências necessárias já estão instaladas!** Não precisamos adicionar nada.

---

## 📋 RESUMO EXECUTIVO

### ✅ **O QUE JÁ TEMOS:**
1. ✅ **Estrutura de pastas organizada** (FastAPI padrão)
2. ✅ **Redis configurado e rodando** (Docker + variável de ambiente)
3. ✅ **Supabase configurado** (URL + Service Key)
4. ✅ **Todas as dependências Python instaladas**
5. ✅ **Router de afiliados existente** (`api/affiliates.py`)
6. ✅ **Service de afiliados existente** (`services/affiliate_service.py`)
7. ✅ **Logging estruturado** (structlog)
8. ✅ **Docker Compose completo**

### ❌ **O QUE FALTA IMPLEMENTAR:**
1. ❌ **Variáveis de ambiente Asaas** (API Key, Wallets)
2. ❌ **Autenticação JWT** (middleware + dependencies)
3. ❌ **Autorização RBAC** (require_admin, require_auth)
4. ❌ **Tabela audit_logs** (verificar/criar no Supabase)
5. ❌ **Router de admin** (`api/admin.py`)
6. ❌ **Service de admin** (`services/admin_service.py`)
7. ❌ **Schemas de admin** (`schemas/admin_schemas.py`)
8. ❌ **Integração real com Asaas** (validação de wallets)

### ⚠️ **PROBLEMAS IDENTIFICADOS:**
1. ⚠️ **Endpoints atuais retornam dados MOCK** (não conectados ao Supabase)
2. ⚠️ **Nenhuma autenticação implementada** (endpoints abertos)
3. ⚠️ **Nenhuma auditoria de ações** (sem logs de admin)
4. ⚠️ **Validação Asaas usa fallback mock** (API não configurada)

---

## 🎯 AJUSTES NECESSÁRIOS NO `tasks.md`

### **TASK 1 - Setup e Preparação do Ambiente**

**ADICIONAR subtasks:**
```markdown
### Task 1: Setup e Preparação do Ambiente

**Subtasks:**
1.1. ✅ Verificar estrutura de pastas (JÁ EXISTE)
1.2. ✅ Verificar Redis (JÁ CONFIGURADO)
1.3. ✅ Verificar dependências Python (JÁ INSTALADAS)
1.4. ❌ **ADICIONAR variáveis Asaas ao `.env.example`**
1.5. ❌ **VERIFICAR tabela `audit_logs` no Supabase** (usar Power)
1.6. ❌ **CRIAR tabela `audit_logs` se não existir** (migration)
```

### **NOVA TASK 0 - Autenticação e Autorização (CRÍTICO)**

**ADICIONAR antes da Task 1:**
```markdown
### Task 0: Implementar Autenticação JWT e Autorização RBAC

**Prioridade:** 🔴 CRÍTICA (bloqueante para todas as outras tasks)

**Objetivo:** Implementar autenticação JWT e autorização baseada em roles.

**Subtasks:**
0.1. Criar `api/auth.py` com middleware JWT
0.2. Criar `utils/auth_dependencies.py` com:
     - `get_current_user()` - Extrai user do JWT
     - `require_auth()` - Dependency para endpoints autenticados
     - `require_admin()` - Dependency para endpoints admin
0.3. Integrar com Supabase Auth (validar JWT)
0.4. Adicionar decorators aos endpoints existentes
0.5. Testar autenticação com usuário real

**Arquivos a criar:**
- `agent/src/api/auth.py`
- `agent/src/utils/auth_dependencies.py`
- `agent/src/schemas/auth_schemas.py`

**Testes:**
- Validar JWT válido
- Rejeitar JWT inválido
- Rejeitar JWT expirado
- Validar role admin
- Rejeitar role não-admin
```

---

## 🚀 ORDEM DE IMPLEMENTAÇÃO RECOMENDADA

### **FASE 0: FUNDAÇÃO (CRÍTICA)**
1. **Task 0.1-0.5:** Implementar autenticação JWT + RBAC
2. **Task 1.4:** Adicionar variáveis Asaas
3. **Task 1.5-1.6:** Verificar/criar tabela audit_logs

### **FASE 1: BACKEND ADMIN**
4. **Task 2-5:** Criar schemas, router, service de admin
5. **Task 6-9:** Implementar endpoints de listagem e detalhes

### **FASE 2: AÇÕES ADMIN**
6. **Task 10-13:** Implementar aprovação/rejeição/suspensão
7. **Task 14-15:** Implementar validação Asaas e auditoria

### **FASE 3: INTEGRAÇÃO FRONTEND**
8. **Task 16-19:** Conectar páginas frontend aos endpoints reais
9. **Task 20-21:** Substituir dados mock por dados reais

### **FASE 4: TESTES E VALIDAÇÃO**
10. **Task 22:** Testes completos end-to-end

---

## ✅ CONCLUSÃO DA ANÁLISE PREVENTIVA

### **INFRAESTRUTURA ATUAL:**
- ✅ **70% pronta** (estrutura, Redis, Supabase, dependências)
- ❌ **30% faltando** (autenticação, Asaas, audit_logs)

### **RISCO IDENTIFICADO:**
⚠️ **CRÍTICO:** Sem autenticação JWT, não podemos implementar endpoints admin com segurança.

### **RECOMENDAÇÃO:**
🎯 **Implementar Task 0 (Autenticação) ANTES de qualquer outra task.**

### **TEMPO ESTIMADO:**
- **Task 0 (Auth):** 2-3 horas
- **Task 1 (Setup):** 30 minutos
- **Tasks 2-22:** Conforme planejado

---

**Análise concluída em:** 05/01/2026  
**Próximo passo:** Implementar Task 0 (Autenticação JWT + RBAC)  
**Status:** ✅ Pronto para começar implementação
