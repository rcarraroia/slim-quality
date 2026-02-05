# Sprint 2: Backend Agente - Requisitos

## 📋 Visão Geral

**Objetivo:** Implementar backend conversacional funcional com LangGraph + FastAPI + MCP Servers.

**Duração:** 5 dias

**Diretório de Trabalho:** `agent/`

## 🎯 Objetivos de Negócio

1. **Agente Conversacional Funcional**
   - Processar mensagens de entrada
   - Detectar intenções (discovery, sales, support)
   - Responder de forma contextual
   - Manter histórico de conversação

2. **Integrações WhatsApp**
   - Receber webhooks de 2 provedores (Uazapi e Evolution)
   - Enviar mensagens via APIs
   - Gerenciar status de conexão

3. **Integrações Google Workspace**
   - Criar eventos no Calendar
   - Gerar links Google Meet
   - Upload de arquivos no Drive

4. **Persistência de Estado**
   - Salvar conversações no Supabase
   - Recuperar contexto anterior
   - Permitir pausar/retomar conversas

## 📦 Funcionalidades Principais

### 1. LangGraph StateGraph

**RF-001: Estado Global da Conversação**
- O sistema DEVE manter estado com: messages, lead_id, context, current_intent, next_action
- O estado DEVE persistir entre interações
- O estado DEVE ser recuperável via lead_id

**RF-002: Router Node**
- O sistema DEVE analisar mensagens via Claude AI
- O sistema DEVE detectar intenções: discovery, sales, support
- O sistema DEVE retornar next_action baseado na intenção

**RF-003: Discovery Node**
- O sistema DEVE qualificar leads
- O sistema DEVE capturar: nome, email, telefone
- O sistema DEVE identificar problema de saúde do lead

**RF-004: Sales Node**
- O sistema DEVE consultar produtos no Supabase
- O sistema DEVE recomendar colchões baseado no perfil
- O sistema DEVE negociar condições de pagamento

**RF-005: Support Node**
- O sistema DEVE responder dúvidas frequentes
- O sistema DEVE enviar documentação quando solicitado
- O sistema DEVE transferir para humano quando necessário

**RF-006: Checkpointer Supabase**
- O sistema DEVE salvar state na tabela `conversations`
- O sistema DEVE recuperar state anterior por lead_id
- O sistema DEVE permitir pausar e retomar conversas

### 2. FastAPI Endpoints

**RF-007: Webhook WhatsApp**
- Endpoint: `POST /api/webhooks/whatsapp`
- O sistema DEVE receber mensagens de Evolution e Uazapi
- O sistema DEVE disparar StateGraph
- O sistema DEVE retornar 200 OK imediatamente

**RF-008: Chat Endpoint Genérico**
- Endpoint: `POST /api/chat`
- O sistema DEVE aceitar mensagens JSON
- O sistema DEVE processar via StateGraph
- O sistema DEVE retornar resposta em JSON

**RF-009: Health Check**
- Endpoint: `GET /health`
- O sistema DEVE verificar: Redis, Supabase, Claude API
- O sistema DEVE retornar 200 se tudo OK
- O sistema DEVE retornar 503 se algum serviço falhar

### 3. MCP Gateway

**RF-010: Descoberta de Tools**
- O sistema DEVE descobrir tools disponíveis em todos MCP Servers
- O sistema DEVE retornar lista de tools com schemas
- O sistema DEVE atualizar lista a cada 5 minutos

**RF-011: Execução de Tools**
- O sistema DEVE rotear execução para MCP Server correto
- O sistema DEVE validar parâmetros antes de executar
- O sistema DEVE retornar resultado ou erro

**RF-012: Rate Limiting**
- O sistema DEVE limitar execuções por tool
- O sistema DEVE retornar erro 429 se exceder limite
- Limite padrão: 10 execuções/minuto por tool

### 4. MCP Servers

#### 4.1 WhatsApp Uazapi

**RF-013: Enviar Mensagem Uazapi**
- Tool: `send_message(phone, message)`
- O sistema DEVE enviar via API Uazapi
- O sistema DEVE retornar message_id ou erro

**RF-014: Receber Mensagens Uazapi**
- Tool: `get_messages(limit)`
- O sistema DEVE buscar últimas mensagens
- O sistema DEVE retornar lista de mensagens

#### 4.2 WhatsApp Evolution

**RF-015: Enviar Mensagem Evolution**
- Tool: `send_message_evolution(phone, message)`
- O sistema DEVE enviar via Evolution API (VPS)
- URL fixa: `https://slimquality-evolution-api.wpjtfd.easypanel.host`
- O sistema DEVE retornar message_id ou erro

**RF-016: Status Instância Evolution**
- Tool: `get_instance_status()`
- O sistema DEVE retornar status: connected/disconnected
- O sistema DEVE verificar instância "Slim Quality"

#### 4.3 Google Workspace

**RF-017: Criar Evento Calendar**
- Tool: `create_event(summary, start, end, attendee)`
- O sistema DEVE criar evento no Google Calendar
- O sistema DEVE retornar event_id e link

**RF-018: Listar Eventos**
- Tool: `list_events(days_ahead)`
- O sistema DEVE listar eventos futuros
- Padrão: próximos 7 dias

**RF-019: Upload Drive**
- Tool: `upload_file(file_path, folder_id)`
- O sistema DEVE fazer upload no Google Drive
- O sistema DEVE retornar file_id e link compartilhável

**RF-020: Criar Meeting**
- Tool: `create_meeting(summary, start, duration_min)`
- O sistema DEVE criar evento + link Google Meet
- O sistema DEVE retornar event_id e meet_link

## 🚫 Não-Funcionalidades (Fora do Escopo Sprint 2)

- ❌ Interface de configuração de MCP Servers (Sprint 5)
- ❌ Dashboard de monitoramento de conversas (Sprint 5)
- ❌ Migrations de banco de dados (Sprint 3)
- ❌ MCP Server Supabase Produtos (opcional - avaliar Sprint 3)
- ❌ Autenticação OAuth Google (Sprint 5 - UI)
- ❌ Deploy em produção VPS (Sprint 6)

## 📊 Critérios de Aceite

### Testes Locais

**CA-001: Docker Compose Sobe**
- ✅ Container `agent` sobe na porta 8000
- ✅ Container `redis` conecta na porta 6379
- ✅ Container `mcp-gateway` sobe na porta 8080
- ✅ Health check retorna 200

**CA-002: Webhook Funciona**
```bash
curl -X POST http://localhost:8000/api/webhooks/whatsapp \
  -H "Content-Type: application/json" \
  -d '{"from": "5511999999999", "body": "Olá"}'
```
- ✅ Retorna 200 OK
- ✅ StateGraph processa mensagem
- ✅ Router identifica intent
- ✅ Node apropriado responde

**CA-003: MCP Tools Descobertos**
```python
from src.services.mcp_gateway import MCPGateway
gateway = MCPGateway()
tools = gateway.discover_tools()
```
- ✅ Retorna pelo menos 8 tools
- ✅ Inclui: send_message, send_message_evolution, create_event, create_meeting, upload_file, list_events, get_messages, get_instance_status

**CA-004: Envio WhatsApp Funciona**
```python
gateway.execute_tool("send_message", {
    "phone": "5511999999999",
    "message": "Teste MCP"
})
```
- ✅ Mensagem enviada via Uazapi
- ✅ Retorna message_id
- ✅ Sem erros de autenticação

**CA-005: StateGraph Persiste**
- ✅ Primeira mensagem cria registro em `conversations`
- ✅ Segunda mensagem recupera contexto anterior
- ✅ Estado inclui histórico completo

## 🔗 Dependências Externas

### APIs Necessárias

1. **Anthropic Claude**
   - Variável: `CLAUDE_API_KEY`
   - Uso: Router Node + análise de intenções

2. **Uazapi**
   - Variáveis: `UAZAPI_URL`, `UAZAPI_INSTANCE_ID`, `UAZAPI_API_KEY`
   - Documentação: https://docs.uazapi.com/

3. **Evolution API (VPS)**
   - Variáveis: `EVOLUTION_URL`, `EVOLUTION_API_KEY`, `EVOLUTION_INSTANCE`
   - URL fixa: `https://slimquality-evolution-api.wpjtfd.easypanel.host`
   - ⚠️ API Key: pegar do Easypanel

4. **Google Workspace**
   - Variáveis: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CREDENTIALS_JSON`
   - Documentação: 
     - Calendar: https://developers.google.com/calendar/api/guides/overview
     - Drive: https://developers.google.com/drive/api/guides/about-sdk

5. **Supabase**
   - Variáveis: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`
   - Uso: Checkpointer + consulta produtos

6. **Redis**
   - Variável: `REDIS_URL`
   - Uso: Cache de tools e rate limiting

## 📝 Notas Importantes

> [!IMPORTANT]
> **Evolution API já está rodando na VPS**
> - URL fixa (não editável pelo cliente)
> - Instância "Slim Quality" já existe
> - Apenas API Key precisa ser configurada

> [!WARNING]
> **Supabase Produtos: SEM MCP**
> - Decisão arquitetural: acesso direto via `supabase-py`
> - Sales Node consulta produtos inline
> - Menos overhead, menos dependências

> [!NOTE]
> **Google OAuth será implementado na Sprint 5**
> - Por enquanto, usar credenciais JSON diretas
> - UI de "Conectar Google" vem depois
