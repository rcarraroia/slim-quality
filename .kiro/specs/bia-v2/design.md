# DESIGN — BIA v2
**Data:** 14/03/2026  
**Projeto:** Slim Quality - Sistema de Afiliados  
**Objetivo:** Especificar decisões técnicas e arquitetura do BIA v2

---

## 1. DECISÕES ARQUITETURAIS

### 1.1 Stack Tecnológico

**Backend (agent_v2/):**
- Python 3.11
- FastAPI (framework web)
- Uvicorn (servidor ASGI)
- Pydantic (validação de dados)
- httpx (cliente HTTP assíncrono)
- supabase-py (cliente Supabase)
- openai (cliente OpenAI)
- redis-py (cliente Redis)

**Frontend (src/):**
- React 18 + TypeScript
- Vite (build tool)
- React Router (roteamento)
- shadcn/ui (componentes)
- Tailwind CSS (estilização)
- Supabase JS (autenticação)

**Infraestrutura:**
- VPS EasyPanel (Docker)
- Redis dedicado: `bia-redis` (rede interna Docker)
- Supabase PostgreSQL (banco de dados)
- Evolution API (WhatsApp)
- OpenAI API (LLM, Whisper, TTS)


### 1.2 Arquitetura Geral

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Vercel)                        │
│  React/Vite → https://slimquality.com.br                   │
│  - Dashboard Afiliado                                       │
│  - Página "Meu Agente"                                      │
│  - Autenticação JWT Supabase                                │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTPS
                     ↓
┌─────────────────────────────────────────────────────────────┐
│              BACKEND BIA v2 (VPS EasyPanel)                 │
│  FastAPI → https://api.slimquality.com.br/v2/              │
│  - Endpoints REST                                           │
│  - Webhook Evolution API                                    │
│  - Processamento de mensagens                               │
│  - Skills e Sub-agents                                      │
└──────┬──────────────┬──────────────┬────────────────────────┘
       │              │              │
       ↓              ↓              ↓
┌──────────┐   ┌──────────┐   ┌──────────────┐
│ Supabase │   │ Redis    │   │ Evolution API│
│ Postgres │   │ bia-redis│   │ WhatsApp     │
└──────────┘   └──────────┘   └──────────────┘
       │
       ↓
┌──────────────┐
│  OpenAI API  │
│ gpt-4o-mini  │
│ Whisper, TTS │
└──────────────┘
```

### 1.3 Decisões Críticas

**1. Zero Serverless Functions no Vercel**
- Frontend fala diretamente com FastAPI na VPS
- URL base: `https://api.slimquality.com.br/v2/`
- CORS configurado no FastAPI
- Razão: Limite de 12/12 funções atingido

**2. Redis Dedicado (bia-redis)**
- Novo serviço no EasyPanel
- URL interna: `redis://bia-redis:6379`
- Persistência: AOF habilitado
- Uso: cache de sessões, rate limiting, fila de mensagens
- Razão: Isolamento do Redis do agent/ atual

**3. Áudio em Memória**
- Whisper: recebe bytes, transcreve, descarta
- TTS: gera mp3 em memória, envia para Evolution, descarta
- Sem Supabase Storage
- Razão: Performance e custo

**4. QR Code no Campo Existente**
- Usa `qr_code_base64` em `multi_agent_tenants`
- Não criar campo em `bia_evolution_instances`
- Razão: Reutilizar estrutura existente

**5. OpenAI API Key Centralizada**
- Chave única no `.env` do `agent_v2/`
- Campo `openai_api_key` em `multi_agent_tenants` ignorado
- Razão: Slim Quality banca custos centralizados


---

## 2. ESTRUTURA DE PASTAS

```
agent_v2/
├── src/
│   ├── api/
│   │   ├── main.py              # FastAPI app principal
│   │   ├── routes/
│   │   │   ├── agent.py         # Endpoints do agente
│   │   │   ├── webhook.py       # Webhook Evolution API
│   │   │   └── health.py        # Health check
│   │   └── middleware/
│   │       ├── auth.py          # Validação JWT Supabase
│   │       └── cors.py          # CORS config
│   ├── core/
│   │   ├── config.py            # Configurações (env vars)
│   │   ├── database.py          # Cliente Supabase
│   │   ├── redis.py             # Cliente Redis
│   │   └── openai_client.py    # Cliente OpenAI
│   ├── services/
│   │   ├── agent_service.py     # Lógica do agente
│   │   ├── evolution_service.py # Integração Evolution API
│   │   ├── audio_service.py     # Whisper + TTS
│   │   └── napkin_service.py    # Gerenciamento napkin
│   ├── skills/
│   │   ├── base.py              # Classe base Skill
│   │   ├── commissions.py       # Skill comissões
│   │   ├── network.py           # Skill rede
│   │   └── sales.py             # Skill vendas
│   ├── subagents/
│   │   ├── base.py              # Classe base SubAgent
│   │   ├── sales_specialist.py  # Sub-agent vendas
│   │   └── support_specialist.py# Sub-agent suporte
│   ├── models/
│   │   ├── tenant.py            # Pydantic models
│   │   ├── message.py
│   │   ├── conversation.py
│   │   └── config.py
│   └── utils/
│       ├── logger.py            # Logging estruturado
│       └── validators.py        # Validações
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
├── .env.example
└── README.md
```

---

## 3. BANCO DE DADOS

### 3.1 Tabelas Novas (Prefixo bia_*)

**bia_agent_config**
```sql
CREATE TABLE bia_agent_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES multi_agent_tenants(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL DEFAULT 'BIA',
  agent_personality TEXT,
  tone TEXT NOT NULL DEFAULT 'amigavel', -- amigavel, formal, casual, tecnico
  knowledge_enabled BOOLEAN NOT NULL DEFAULT true,
  tts_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id)
);
```

**bia_napkin**
```sql
CREATE TABLE bia_napkin (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES multi_agent_tenants(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  last_updated_by TEXT NOT NULL DEFAULT 'agent', -- agent, affiliate
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  INDEX idx_napkin_tenant_created (tenant_id, created_at DESC)
);
```

**bia_conversations**
```sql
CREATE TABLE bia_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES multi_agent_tenants(id) ON DELETE CASCADE,
  contact_phone TEXT NOT NULL,
  contact_name TEXT,
  status TEXT NOT NULL DEFAULT 'active', -- active, closed
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  INDEX idx_conv_tenant_phone (tenant_id, contact_phone),
  INDEX idx_conv_last_message (tenant_id, last_message_at DESC)
);
```

**bia_messages**
```sql
CREATE TABLE bia_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES bia_conversations(id) ON DELETE CASCADE,
  direction TEXT NOT NULL, -- incoming, outgoing
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text', -- text, audio
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  INDEX idx_msg_conversation (conversation_id, created_at DESC)
);
```

**bia_metrics**
```sql
CREATE TABLE bia_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES multi_agent_tenants(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_messages_received INT NOT NULL DEFAULT 0,
  total_messages_sent INT NOT NULL DEFAULT 0,
  total_conversations INT NOT NULL DEFAULT 0,
  active_conversations INT NOT NULL DEFAULT 0,
  failed_messages INT NOT NULL DEFAULT 0,
  avg_response_time_ms INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, period_start)
);
```

### 3.2 RLS Policies

Todas as tabelas `bia_*` terão RLS habilitado:
```sql
ALTER TABLE bia_agent_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE bia_napkin ENABLE ROW LEVEL SECURITY;
ALTER TABLE bia_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE bia_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE bia_metrics ENABLE ROW LEVEL SECURITY;

-- Policy: tenant só acessa seus próprios dados
CREATE POLICY tenant_isolation ON bia_agent_config
  USING (tenant_id IN (
    SELECT id FROM multi_agent_tenants WHERE affiliate_id = auth.uid()
  ));
-- (Repetir para todas as tabelas bia_*)
```


---

## 4. ENDPOINTS API

**Base URL:** `https://api.slimquality.com.br/v2/`

### 4.1 Agente

- `POST /agent/activate` - Ativar agente (criar tenant + provisionar Evolution)
- `GET /agent/status` - Status do agente (conectado/desconectado)
- `POST /agent/qr-code` - Gerar/regenerar QR Code
- `POST /agent/disconnect` - Desconectar agente
- `GET /agent/config` - Buscar configuração
- `PUT /agent/config` - Atualizar configuração
- `GET /agent/napkin` - Listar aprendizados
- `DELETE /agent/napkin/{id}` - Deletar aprendizado
- `GET /agent/metrics` - Buscar métricas

### 4.2 Webhook

- `POST /webhook/evolution` - Receber mensagens da Evolution API

### 4.3 Health

- `GET /health` - Health check

---

## 5. INTEGRAÇÕES

### 5.1 Evolution API

**Base URL:** `https://slimquality-evolution-api.wpjtfd.easypanel.host`

**Endpoints Usados:**
- `POST /instance/create` - Criar instância
- `GET /instance/connect/{instance}` - Gerar QR Code
- `DELETE /instance/logout/{instance}` - Desconectar
- `POST /message/sendText` - Enviar texto
- `POST /message/sendMedia` - Enviar áudio

**Autenticação:** Header `apikey: {EVOLUTION_API_KEY}`

**Mapeamento Webhook → Tenant:**

Quando a Evolution API envia um webhook de mensagem recebida, o backend precisa identificar qual tenant (afiliado) deve processar a mensagem. O fluxo é:

1. Webhook recebe campo `instance_name` (ex: `bia_123`)
2. Backend faz lookup em `multi_agent_tenants` usando o campo `evolution_instance_id`
3. O padrão de nomenclatura é: `bia_{affiliate_id}`
4. Campos existentes em `multi_agent_tenants`:
   - `evolution_instance_id`: armazena o nome da instância (ex: `bia_123`)
   - `whatsapp_number`: armazena o número conectado (ex: `+5511999999999`)

**Não é necessário criar tabela adicional** - a estrutura existente já suporta o mapeamento.

### 5.2 OpenAI API

**Modelos:**
- `gpt-4o-mini` - Conversação (temperatura 0.7, max_tokens 500)
- `whisper-1` - Transcrição de áudio
- `tts-1` - Síntese de voz (voz `nova`)

**Autenticação:** Header `Authorization: Bearer {OPENAI_API_KEY}`

### 5.3 Supabase

**Cliente:** `supabase-py` com service role key
**Uso:** Queries no banco, RLS bypass para backend

### 5.4 Redis

**URL:** `redis://bia-redis:6379`
**Uso:**
- Cache de configurações (TTL 5 min)
- Rate limiting (100 req/min por tenant)
- Fila de mensagens (processamento assíncrono)

---

## 6. VARIÁVEIS DE AMBIENTE

```bash
# agent_v2/.env

# Supabase
SUPABASE_URL=https://vtynmmtuvxreiwcxxlma.supabase.co
SUPABASE_SERVICE_KEY=xxx

# OpenAI
OPENAI_API_KEY=sk-proj-xxx

# Evolution API
EVOLUTION_URL=https://slimquality-evolution-api.wpjtfd.easypanel.host
EVOLUTION_API_KEY=xxx
EVOLUTION_WEBHOOK_TOKEN=xxx

# Redis
REDIS_URL=redis://bia-redis:6379

# App
ENVIRONMENT=production
LOG_LEVEL=INFO
```

---

## 7. DOCKER

**docker-compose.yml**
```yaml
version: '3.8'

services:
  bia-redis:
    image: redis:7-alpine
    container_name: bia-redis
    command: redis-server --appendonly yes
    volumes:
      - bia-redis-data:/data
    networks:
      - bia-network
    restart: unless-stopped

  bia-api:
    build: .
    container_name: bia-api
    ports:
      - "8001:8000"
    environment:
      - REDIS_URL=redis://bia-redis:6379
    env_file:
      - .env
    depends_on:
      - bia-redis
    networks:
      - bia-network
    restart: unless-stopped

volumes:
  bia-redis-data:

networks:
  bia-network:
    driver: bridge
```

---

**Documento gerado por:** Kiro AI  
**Data:** 14/03/2026  
**Versão:** 1.0  
**Status:** Aguardando Revisão
