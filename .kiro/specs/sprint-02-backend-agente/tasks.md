# Sprint 2: Backend Agente - Tarefas

## 📋 Checklist de Implementação

### TAREFA 1: LangGraph StateGraph (2 dias)

#### 1.1 Estrutura Base
- [x] Criar `src/graph/__init__.py`
- [x] Criar `src/graph/state.py` com `AgentState` TypedDict
- [x] Criar `src/graph/nodes/__init__.py`
- [x] Criar `src/graph/edges.py` com função `route_intent()`

#### 1.2 Router Node
- [x] Criar `src/graph/nodes/router.py`
- [x] Implementar `router_node()` async
- [x] Integrar Claude AI (claude-3-5-sonnet-20241022)
- [x] Criar prompt de classificação (discovery/sales/support)
- [x] Retornar `current_intent` e `next_action`
- [x] Testar com 3 mensagens exemplo

#### 1.3 Discovery Node
- [x] Criar `src/graph/nodes/discovery.py`
- [x] Implementar `discovery_node()` async
- [x] Criar prompt de qualificação BIA
- [x] Implementar extração de dados (nome, email, telefone, problema)
- [x] Atualizar `lead_data` no state
- [x] Testar captura incremental

#### 1.4 Sales Node
- [x] Criar `src/graph/nodes/sales.py`
- [x] Implementar `sales_node()` async
- [x] Criar `src/services/supabase_client.py`
- [x] Implementar `get_products()` (acesso direto Supabase)
- [x] Criar lógica de recomendação (top 3 produtos)
- [x] Criar prompt de vendas BIA
- [x] Testar recomendação de produtos

#### 1.5 Support Node
- [x] Criar `src/graph/nodes/support.py`
- [x] Implementar `support_node()` async
- [x] Criar prompt de suporte BIA (garantia, frete, troca, pagamento)
- [x] Implementar `detect_human_transfer()`
- [x] Integrar com MCP Gateway para notificar humano
- [x] Testar transferência para humano

#### 1.6 Checkpointer Supabase
- [x] Criar `src/graph/checkpointer.py`
- [x] Implementar `SupabaseCheckpointer` (herda `BaseCheckpointSaver`)
- [x] Implementar `aget()` - recuperar state por lead_id
- [x] Implementar `aput()` - salvar state
- [x] Criar migration `conversations` table (Sprint 3 - apenas documentar)
- [x] Testar save/load state

#### 1.7 Graph Builder
- [x] Criar `src/graph/builder.py`
- [x] Implementar `build_graph()` 
- [x] Adicionar 4 nodes (router, discovery, sales, support)
- [x] Configurar entry point (router)
- [x] Adicionar conditional edges (route_intent)
- [x] Adicionar edges para END
- [x] Compilar com checkpointer
- [x] Testar graph completo com mock messages

---

### TAREFA 2: FastAPI Endpoints (1 dia)

#### 2.1 Estrutura Base
- [x] Criar `src/api/__init__.py`
- [x] Criar `src/api/main.py` (FastAPI app)
- [x] Criar `src/models/__init__.py`
- [x] Criar `src/config.py` (env vars)

#### 2.2 Webhook WhatsApp
- [x] Criar `src/api/webhooks.py`
- [x] Criar `src/models/webhook.py` (Pydantic models)
- [x] Implementar `POST /api/webhooks/whatsapp`
- [x] Adicionar background task para processar mensagem
- [x] Implementar `process_message()` (invoca graph)
- [x] Retornar 200 OK imediatamente
- [x] Testar com curl/Postman

#### 2.3 Chat Endpoint
- [x] Criar `src/api/chat.py`
- [x] Criar `src/models/chat.py` (Pydantic models)
- [x] Implementar `POST /api/chat`
- [x] Invocar graph com lead_id e message
- [x] Retornar response e intent em JSON
- [x] Testar com curl/Postman

#### 2.4 Health Check
- [x] Criar `src/api/health.py`
- [x] Implementar `GET /health`
- [x] Implementar `check_redis()`
- [x] Implementar `check_supabase()`
- [x] Implementar `check_claude()`
- [x] Retornar 200 se tudo OK, 503 se falhar
- [x] Testar health check

#### 2.5 Main Entry Point
- [x] Criar `src/main.py`
- [x] Configurar FastAPI app
- [x] Incluir routers (webhooks, chat, health)
- [x] Configurar CORS
- [x] Testar `uvicorn src.main:app --reload`

---

### TAREFA 3: MCP Gateway (1 dia)

#### 3.1 Gateway Client
- [x] Criar `src/services/__init__.py`
- [x] Criar `src/services/mcp_gateway.py`
- [x] Implementar `MCPGateway` class
- [x] Implementar `discover_tools()` - GET /tools
- [x] Implementar `execute_tool()` - POST /execute
- [x] Adicionar rate limit handling (429)
- [x] Adicionar cache Redis para tools
- [x] Testar descoberta de tools

#### 3.2 Claude Client
- [x] Criar `src/services/claude_client.py`
- [x] Implementar wrapper para `ChatAnthropic`
- [x] Adicionar retry logic
- [x] Adicionar logging
- [x] Testar conexão Claude API

#### 3.3 Supabase Client
- [x] Criar `src/services/supabase_client.py`
- [x] Implementar wrapper para `supabase-py`
- [x] Implementar `get_products(filters)`
- [x] Implementar `save_conversation()`
- [x] Testar conexão Supabase

---

### TAREFA 4: MCP Servers (1 dia)

#### 4.1 MCP Uazapi
- [x] Criar `mcp-servers/whatsapp-uazapi/server.py`
- [x] Criar `mcp-servers/whatsapp-uazapi/requirements.txt`
- [x] Criar `mcp-servers/whatsapp-uazapi/README.md`
- [x] Implementar `@mcp.tool() send_message(phone, message)`
- [x] Implementar `@mcp.tool() get_messages(limit)`
- [x] Configurar env vars (UAZAPI_URL, INSTANCE_ID, API_KEY)
- [x] Testar envio de mensagem

#### 4.2 MCP Evolution
- [x] Criar `mcp-servers/whatsapp-evolution/server.py`
- [x] Criar `mcp-servers/whatsapp-evolution/requirements.txt`
- [x] Criar `mcp-servers/whatsapp-evolution/README.md`
- [x] Implementar `@mcp.tool() send_message_evolution(phone, message)`
- [x] Implementar `@mcp.tool() get_instance_status()`
- [x] Configurar env vars (EVOLUTION_URL fixo, API_KEY, INSTANCE)
- [x] **IMPORTANTE:** Pegar API Key do Easypanel
- [x] Testar envio de mensagem
- [x] Testar status da instância "Slim Quality"

#### 4.3 MCP Google
- [x] Criar `mcp-servers/google/server.py`
- [x] Criar `mcp-servers/google/requirements.txt`
- [x] Criar `mcp-servers/google/README.md`
- [x] Implementar `@mcp.tool() create_event(summary, start, end, attendee)`
- [x] Implementar `@mcp.tool() list_events(days_ahead)`
- [x] Implementar `@mcp.tool() upload_file(file_path, folder_id)`
- [x] Implementar `@mcp.tool() create_meeting(summary, start, duration_min)`
- [x] Configurar env vars (GOOGLE_CLIENT_ID, SECRET, CREDENTIALS_JSON)
- [x] Testar criação de evento
- [x] Testar criação de meeting com link

#### 4.4 MCP Gateway Server
- [x] Criar `mcp-servers/gateway/server.py`
- [x] Implementar roteamento de tools
- [x] Implementar `GET /tools` (descoberta)
- [x] Implementar `POST /execute` (execução)
- [x] Adicionar rate limiting (Redis)
- [x] Criar Dockerfile para gateway
- [x] Testar gateway standalone

---

### TAREFA 5: Docker & Testes (meio dia)

#### 5.1 Docker Configuration
- [x] Atualizar `agent/Dockerfile`
- [x] Atualizar `agent/docker-compose.yml` (3 services)
- [x] Criar `mcp-servers/Dockerfile`
- [x] Atualizar `agent/requirements.txt`
- [x] Criar `agent/.env.example` completo
- [x] Testar `docker-compose up --build`

#### 5.2 Testes Unitários
- [x] Criar `tests/test_graph.py`
- [x] Testar `router_node()` com 3 intents
- [x] Testar `discovery_node()` extração de dados
- [x] Testar `checkpointer` save/load
- [x] Rodar `pytest tests/test_graph.py`

#### 5.3 Testes de Integração
- [x] Criar `tests/test_api.py`
- [x] Testar `POST /api/webhooks/whatsapp`
- [x] Testar `POST /api/chat`
- [x] Testar `GET /health`
- [x] Rodar `pytest tests/test_api.py`

#### 5.4 Testes Manuais
- [x] Testar health check: `curl http://localhost:8000/health`
- [x] Testar chat endpoint com Postman
- [x] Simular webhook WhatsApp
- [x] Verificar logs StateGraph
- [x] Verificar state salvo no Supabase

#### 5.5 Testes MCP
- [x] Criar `tests/test_mcp.py`
- [x] Testar `MCPGateway.discover_tools()`
- [x] Testar `execute_tool("send_message", {...})`
- [x] Testar `execute_tool("create_meeting", {...})`
- [x] Verificar rate limiting
- [x] Rodar `pytest tests/test_mcp.py`

---

## 🎯 Critérios de Validação Final

### ✅ Checklist de Entrega

- [ ] **Docker Compose sobe sem erros**
  - Container `agent` porta 8000
  - Container `redis` porta 6379
  - Container `mcp-gateway` porta 8080

- [ ] **Health Check OK**
  ```bash
  curl http://localhost:8000/health
  # Retorna: {"status": "healthy", "checks": {...}}
  ```

- [ ] **Webhook WhatsApp funciona**
  ```bash
  curl -X POST http://localhost:8000/api/webhooks/whatsapp \
    -H "Content-Type: application/json" \
    -d '{"from": "5511999999999", "body": "Olá, quero comprar colchão"}'
  # Retorna: {"status": "ok"}
  ```

- [ ] **StateGraph processa mensagem**
  - Router identifica intent: `discovery`
  - Discovery Node responde
  - State salvo no Supabase

- [ ] **MCP Gateway descobre tools**
  ```python
  gateway = MCPGateway()
  tools = await gateway.discover_tools()
  assert len(tools) >= 8
  ```

- [ ] **Envio WhatsApp funciona**
  ```python
  # Uazapi
  await gateway.execute_tool("send_message", {
      "phone": "5511999999999",
      "message": "Teste MCP Uazapi"
  })
  
  # Evolution
  await gateway.execute_tool("send_message_evolution", {
      "phone": "5511999999999",
      "message": "Teste MCP Evolution"
  })
  ```

- [ ] **Google Calendar funciona**
  ```python
  result = await gateway.execute_tool("create_meeting", {
      "summary": "Reunião Teste",
      "start": "2025-01-15T10:00:00",
      "duration_min": 30
  })
  assert "meet_link" in result
  ```

- [ ] **Persistência de Estado**
  - Primeira mensagem cria registro em `conversations`
  - Segunda mensagem recupera contexto
  - Histórico completo mantido

- [ ] **Logs Completos**
  - Logs StateGraph visíveis
  - Logs MCP Gateway visíveis
  - Erros capturados e logados

---

## 📊 Progresso Geral

### Sprint 2 - Resumo
- **TAREFA 1:** LangGraph StateGraph (2 dias) - ✅ 8/8 subtarefas CONCLUÍDAS
- **TAREFA 2:** FastAPI Endpoints (1 dia) - ✅ 5/5 subtarefas CONCLUÍDAS
- **TAREFA 3:** MCP Gateway (1 dia) - ✅ 3/3 subtarefas CONCLUÍDAS
- **TAREFA 4:** MCP Servers (1 dia) - ✅ 4/4 subtarefas CONCLUÍDAS
- **TAREFA 5:** Docker & Testes (meio dia) - ✅ 5/5 subtarefas CONCLUÍDAS

**Total:** ✅ 25/25 subtarefas concluídas (100% COMPLETO)

---

## ⚠️ Bloqueadores Conhecidos

> [!WARNING]
> **Evolution API Key**
> - Precisa ser obtida do Easypanel
> - Dashboard: https://easypanel.io
> - Projeto: slimquality-evolution-api
> - Variável: `EVOLUTION_API_KEY`

> [!WARNING]
> **Google Credentials**
> - Precisa criar projeto Google Cloud
> - Habilitar APIs: Calendar, Drive
> - Gerar credenciais OAuth 2.0
> - Download JSON de credenciais

> [!IMPORTANT]
> **Supabase Table `conversations`**
> - Migration será criada na Sprint 3
> - Por enquanto, criar manualmente para testes:
> ```sql
> CREATE TABLE conversations (
>     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
>     lead_id TEXT NOT NULL,
>     state JSONB NOT NULL,
>     created_at TIMESTAMPTZ DEFAULT now(),
>     updated_at TIMESTAMPTZ DEFAULT now()
> );
> ```

---

## 📝 Notas de Implementação

### Ordem Recomendada

1. **Dia 1-2:** TAREFA 1 (LangGraph)
   - Começar por state.py e nodes
   - Testar cada node isoladamente
   - Montar graph completo no final

2. **Dia 3:** TAREFA 2 (FastAPI)
   - Criar endpoints básicos
   - Integrar com graph
   - Testar webhooks

3. **Dia 4:** TAREFA 3 + 4 (MCP)
   - Criar MCP Servers em paralelo
   - Implementar gateway
   - Testar integração

4. **Dia 5:** TAREFA 5 (Docker & Testes)
   - Configurar Docker Compose
   - Rodar testes completos
   - Validar entregáveis

### Dependências Entre Tarefas

- TAREFA 2 depende de TAREFA 1 (graph precisa existir)
- TAREFA 3 depende de TAREFA 4 (MCP Servers precisam existir)
- TAREFA 5 depende de todas (testes finais)

### Pontos de Atenção

- ⚠️ Testar cada componente isoladamente antes de integrar
- ⚠️ Validar credenciais de APIs externas ANTES de começar
- ⚠️ Criar tabela `conversations` manualmente para testes
- ⚠️ Logs detalhados em cada etapa para debug
