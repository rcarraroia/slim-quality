# Slim Quality Agent

Backend conversacional inteligente para o sistema Slim Quality, construído com **FastAPI**, **LangGraph** e integração com **Claude AI**.

## 🎯 Objetivo

Este agente conversacional é responsável por:
- Atendimento automatizado via WhatsApp (BIA)
- Qualificação de leads
- Recomendação de produtos
- Integração com sistema de vendas e afiliados
- Agendamento via Google Calendar/Meet

## 🏗️ Arquitetura

- **Framework:** FastAPI (Python 3.11)
- **IA:** LangGraph + Claude AI (Anthropic)
- **Cache:** Redis
- **Banco:** Supabase (PostgreSQL)
- **Integrações:** Evolution API (WhatsApp), Uazapi (WhatsApp), Google Workspace

## 📁 Estrutura

```
agent/
├── src/
│   ├── graph/              # LangGraph StateGraph
│   │   ├── state.py        # AgentState TypedDict
│   │   ├── nodes/          # 4 nodes (router, discovery, sales, support)
│   │   ├── edges.py        # Conditional edges
│   │   ├── checkpointer.py # Supabase Checkpointer
│   │   └── builder.py      # Graph builder
│   ├── api/                # FastAPI endpoints
│   │   ├── main.py         # FastAPI app
│   │   ├── webhooks.py     # POST /api/webhooks/whatsapp
│   │   ├── chat.py         # POST /api/chat
│   │   └── health.py       # GET /health
│   ├── services/           # Serviços externos
│   │   ├── mcp_gateway.py  # MCP Gateway client
│   │   ├── supabase_client.py
│   │   └── claude_client.py
│   ├── models/             # Pydantic models
│   ├── config.py           # Configurações
│   └── main.py             # Entry point
├── mcp-servers/
│   ├── whatsapp-uazapi/    # MCP Server Uazapi
│   ├── whatsapp-evolution/ # MCP Server Evolution
│   └── google/             # MCP Server Google Workspace
├── migrations/
│   └── 001_create_conversations_table.sql
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
└── .env.example
```

## 🚀 Comandos Básicos

### Desenvolvimento Local

```bash
# 1. Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com suas credenciais reais

# 2. Instalar dependências
pip install -r requirements.txt

# 3. Criar tabela conversations no Supabase
# Executar: migrations/001_create_conversations_table.sql

# 4. Rodar localmente
uvicorn src.main:app --reload --port 8000
```

### Docker

```bash
# Build e run completo
docker-compose up --build

# Apenas o agente
docker-compose up agent

# Logs
docker-compose logs -f agent
```

## 🔧 Configuração

### Variáveis de Ambiente Obrigatórias

Copie `.env.example` para `.env` e configure:

**Claude AI:**
- `CLAUDE_API_KEY`: Chave da API Anthropic

**Supabase:**
- `SUPABASE_URL`: URL do projeto Supabase
- `SUPABASE_SERVICE_KEY`: Service role key

**WhatsApp - Evolution API:**
- `EVOLUTION_URL`: https://slimquality-evolution-api.wpjtfd.easypanel.host (fixo)
- `EVOLUTION_API_KEY`: Obter do Easypanel
- `EVOLUTION_INSTANCE`: "Slim Quality" (fixo)

**WhatsApp - Uazapi:**
- `UAZAPI_URL`: URL da API Uazapi
- `UAZAPI_INSTANCE_ID`: ID da instância
- `UAZAPI_API_KEY`: Chave de API

**Google Workspace:**
- `GOOGLE_CLIENT_ID`: Client ID OAuth
- `GOOGLE_CLIENT_SECRET`: Client Secret OAuth
- `GOOGLE_CREDENTIALS_JSON`: Credenciais OAuth em JSON

## 📊 Status Atual

### ✅ IMPLEMENTADO (Sprint 2):

**LangGraph StateGraph:**
- ✅ Estado global (`AgentState`)
- ✅ Router Node (detecção de intenção via Claude)
- ✅ Discovery Node (qualificação de leads)
- ✅ Sales Node (recomendação de produtos)
- ✅ Support Node (suporte e FAQ)
- ✅ Checkpointer Supabase (persistência de estado)
- ✅ Graph Builder (montagem completa)

**FastAPI Endpoints:**
- ✅ `POST /api/webhooks/whatsapp` (webhook WhatsApp)
- ✅ `POST /api/chat` (endpoint genérico)
- ✅ `GET /health` (health check)

**MCP Servers:**
- ✅ WhatsApp Uazapi (2 tools: send_message, get_messages)
- ✅ WhatsApp Evolution (2 tools: send_message_evolution, get_instance_status)
- ✅ Google Workspace (4 tools: create_event, list_events, upload_file, create_meeting)

**Infraestrutura:**
- ✅ Docker Compose (3 services: agent, redis, mcp-gateway)
- ✅ Requirements.txt completo
- ✅ .env.example atualizado
- ✅ Migration SQL para tabela conversations

### ⏳ PENDENTE:

- ❌ MCP Gateway HTTP Server (placeholder criado)
- ❌ Testes automatizados (unitários e integração)
- ❌ Validação end-to-end
- ❌ Deploy em produção VPS

### 🚧 PRÓXIMAS SPRINTS:

- **Sprint 3:** Migrations oficiais, testes completos, MCP Gateway server
- **Sprint 4:** Sistema de qualificação de leads avançado
- **Sprint 5:** Dashboard de configuração e monitoramento
- **Sprint 6:** Deploy em produção

## 🔗 Integrações

### WhatsApp

**Evolution API (VPS):**
- URL fixa: https://slimquality-evolution-api.wpjtfd.easypanel.host
- Instância "Slim Quality" já existe
- Apenas API Key precisa ser configurada

**Uazapi:**
- Documentação: https://docs.uazapi.com/

### Google Workspace

**APIs habilitadas:**
- Google Calendar API
- Google Drive API
- Google Meet (via Calendar)

**Documentação:**
- Calendar: https://developers.google.com/calendar/api/guides/overview
- Drive: https://developers.google.com/drive/api/guides/about-sdk

## ⚠️ Importante

### Tabela `conversations`

A migration `001_create_conversations_table.sql` é **temporária** para testes da Sprint 2. Execute manualmente no Supabase SQL Editor:

```sql
-- Ver arquivo: migrations/001_create_conversations_table.sql
```

A migration oficial será criada na Sprint 3.

### Evolution API

- URL é **fixa** (VPS)
- Instância "Slim Quality" **já existe**
- **Não alterar** esses valores
- Apenas configurar `EVOLUTION_API_KEY`

### Google OAuth

Por enquanto, usar credenciais JSON diretas. O flow OAuth completo será implementado na Sprint 5 (UI dashboard).

## 📝 Endpoints

### POST /api/webhooks/whatsapp

Recebe webhook de WhatsApp (Evolution ou Uazapi).

**Request:**
```json
{
  "from": "5511999999999",
  "body": "Olá, quero comprar um colchão"
}
```

**Response:**
```json
{
  "status": "ok"
}
```

### POST /api/chat

Endpoint genérico para testar o agente.

**Request:**
```json
{
  "lead_id": "5511999999999",
  "message": "Olá, quero comprar um colchão"
}
```

**Response:**
```json
{
  "response": "Olá! Sou a BIA, assistente da Slim Quality 😊",
  "intent": "discovery",
  "lead_data": {"nome": "João"},
  "products_recommended": []
}
```

### GET /health

Health check dos serviços.

**Response (200 OK):**
```json
{
  "status": "healthy",
  "checks": {
    "redis": true,
    "supabase": true,
    "claude": true
  }
}
```

**Response (503 Service Unavailable):**
```json
{
  "status": "unhealthy",
  "checks": {
    "redis": false,
    "supabase": true,
    "claude": true
  }
}
```

## 🧪 Testes

```bash
# Testes unitários (TODO)
pytest tests/test_graph.py -v

# Testes de integração (TODO)
pytest tests/test_api.py -v

# Testes MCP (TODO)
pytest tests/test_mcp.py -v
```

## 📦 Progresso Sprint 2

**Concluído:** 20/25 subtarefas (80%)

- ✅ TAREFA 1: LangGraph StateGraph (100%)
- ✅ TAREFA 2: FastAPI Endpoints (100%)
- ✅ TAREFA 3: MCP Gateway Client (100%)
- ✅ TAREFA 4: MCP Servers (100%)
- 🚧 TAREFA 5: Docker & Testes (60%)

**Faltam:**
- MCP Gateway HTTP Server
- Testes automatizados
- Validação end-to-end