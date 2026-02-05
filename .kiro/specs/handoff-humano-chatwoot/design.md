# Design: Sistema de Handoff Humano com Chatwoot

## ⚠️ ATENÇÃO - DOCUMENTO EM PORTUGUÊS-BR

---

## 📋 Informações do Projeto

**Data de Criação:** 16/01/2026  
**Feature:** Sistema de Handoff Humano (IA → Humano → IA)  
**Arquitetura:** Chatwoot + MCP Server + Supabase  
**Tecnologias:** Docker, Python/FastAPI, TypeScript/React, Chatwoot API  

---

## 🎯 Visão Geral

### Objetivo

Implementar sistema de handoff (transferência de atendimento) entre IA e humano, permitindo que admins assumam conversas e a IA pare de responder automaticamente, utilizando Chatwoot como plataforma de gerenciamento e MCP Server para simplificar a integração.

### Arquitetura de Alto Nível

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENTE (WhatsApp/Site)                   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│                      CHATWOOT INBOX                          │
│  - Recebe mensagens de todos os canais                      │
│  - Gerencia status (bot/open/pending/resolved)              │
│  - Envia webhooks para AgentBot                             │
│  - Armazena histórico de conversas                          │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        ↓                         ↓
┌───────────────────┐     ┌──────────────────────────┐
│   AGENTE IA (BIA) │     │  DASHBOARD SLIM QUALITY  │
│                   │     │                          │
│ - Recebe webhook  │     │ - Usa MCP Server         │
│ - Verifica status │     │ - Lista conversas        │
│ - Se bot: responde│     │ - Assume atendimento     │
│ - Se open: ignora │     │ - Envia mensagens        │
│                   │     │ - Devolve para IA        │
└───────────────────┘     └──────────────────────────┘
                                   │
                                   ↓
                          ┌────────────────┐
                          │    SUPABASE    │
                          │  - Conversas   │
                          │  - Mensagens   │
                          │  - Customers   │
                          └────────────────┘
```

---

## 🗄️ Modelo de Dados

### Alterações no Banco Supabase

#### Tabela `conversations` (Alterações)

```sql
-- Adicionar campos para integração Chatwoot
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS chatwoot_conversation_id INTEGER,
ADD COLUMN IF NOT EXISTS handoff_status VARCHAR DEFAULT 'ai',
ADD COLUMN IF NOT EXISTS handoff_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS handoff_reason TEXT;

-- Criar índice para queries rápidas
CREATE INDEX IF NOT EXISTS idx_conversations_chatwoot_id 
ON conversations(chatwoot_conversation_id);

CREATE INDEX IF NOT EXISTS idx_conversations_handoff_status 
ON conversations(handoff_status) 
WHERE deleted_at IS NULL;

-- Adicionar constraint para handoff_status
ALTER TABLE conversations 
ADD CONSTRAINT chk_handoff_status 
CHECK (handoff_status IN ('ai', 'human', 'pending'));
```

#### Tabela `messages` (Alterações)

```sql
-- Verificar se enum 'human' existe em sender_type
-- Se não existir, adicionar
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'human' 
        AND enumtypid = (
            SELECT oid FROM pg_type WHERE typname = 'message_sender_type'
        )
    ) THEN
        ALTER TYPE message_sender_type ADD VALUE 'human';
    END IF;
END $$;
```

---

## 🏗️ Componentes da Arquitetura

### 1. Chatwoot (Plataforma de Atendimento)

**Responsabilidades:**
- Receber mensagens de todos os canais (WhatsApp, Site, Email)
- Gerenciar status das conversas (bot, open, pending, resolved)
- Enviar webhooks para AgentBot quando eventos ocorrem
- Armazenar histórico completo de conversas
- Fornecer API REST para integração

**Configuração:**
- Deploy via Docker Compose
- PostgreSQL para armazenamento
- Redis para cache e filas
- Domínio: `chatwoot.slimquality.com.br`

**Inboxes Criados:**
- WhatsApp Slim Quality (canal: api)
- Site Slim Quality (canal: api)

**AgentBot Configurado:**
- Nome: "BIA - Assistente IA"
- Webhook URL: `https://api.slimquality.com.br/chatwoot/webhook`
- Status inicial: bot

---

### 2. MCP Server Chatwoot

**Responsabilidades:**
- Fornecer ferramentas prontas para integração com Chatwoot
- Gerenciar autenticação com API Chatwoot
- Abstrair complexidade da API REST
- Fornecer retry automático e error handling

**Ferramentas Disponíveis:**

1. `chatwoot_setup` - Configura conexão inicial
2. `chatwoot_list_inboxes` - Lista todas as caixas de entrada
3. `chatwoot_list_conversations` - Lista conversas (com filtros)
4. `chatwoot_send_message` - Envia mensagem em uma conversa
5. `chatwoot_update_conversation` - Atualiza status/assignee

**Configuração:**
```json
{
  "mcpServers": {
    "chatwoot": {
      "command": "node",
      "args": ["./node_modules/chatwoot_mcp/dist/index.js"],
      "env": {
        "CHATWOOT_URL": "https://chatwoot.slimquality.com.br",
        "CHATWOOT_API_KEY": "${CHATWOOT_API_KEY}",
        "CHATWOOT_ACCOUNT_ID": "${CHATWOOT_ACCOUNT_ID}"
      },
      "disabled": false,
      "autoApprove": [
        "chatwoot_list_conversations",
        "chatwoot_send_message"
      ]
    }
  }
}
```

---

### 3. Backend - Agente IA (Python/FastAPI)

**Arquivo:** `agent/src/api/main.py`

**Responsabilidades:**
- Receber webhooks do Chatwoot
- Verificar status da conversa antes de responder
- Gerar resposta da IA quando status = 'bot'
- Ignorar mensagens quando status != 'bot'
- Enviar respostas via API Chatwoot
- Registrar logs de todas as ações

**Endpoints Novos:**

#### POST `/chatwoot/webhook`
Recebe eventos do Chatwoot.

**Eventos Tratados:**
- `message_created` - Nova mensagem do cliente
- `conversation_status_changed` - Mudança de status

**Lógica:**
```python
if conversation['status'] != 'bot':
    return {"status": "ignored", "reason": "human_handoff"}

# Processar mensagem e responder
response = await generate_ai_response(message['content'])
await send_chatwoot_message(conversation['id'], response)
```

---

### 4. Frontend - Dashboard (TypeScript/React)

**Arquivos Principais:**
- `src/services/chatwoot-mcp.service.ts` - Service usando MCP
- `src/pages/dashboard/Conversas.tsx` - Lista de conversas
- `src/pages/dashboard/ConversaDetalhes.tsx` - Detalhes e chat

**Responsabilidades:**
- Listar conversas do Chatwoot via MCP Server
- Exibir status visual (bot vs humano)
- Permitir assumir atendimento (handoff IA → Humano)
- Permitir devolver para IA (handoff Humano → IA)
- Enviar mensagens via MCP Server
- Atualizar UI em tempo real

**Service MCP:**
```typescript
class ChatwootMCPService {
  async listConversations(status?: string)
  async takeOverConversation(conversationId: number, agentId: number)
  async returnToBot(conversationId: number)
  async sendMessage(conversationId: number, message: object)
}
```

---

## 🔄 Fluxos de Dados

### Fluxo 1: Conversa Iniciada (IA Atendendo)

```
1. Cliente envia mensagem via WhatsApp/Site
   ↓
2. Chatwoot recebe e cria conversa (status: bot)
   ↓
3. Chatwoot envia webhook para Agente IA
   {
     event: 'message_created',
     conversation: { id: 123, status: 'bot' },
     message: { content: 'Olá' }
   }
   ↓
4. Agente IA verifica: status == 'bot'? ✅
   ↓
5. Agente IA gera resposta usando LLM
   ↓
6. Agente IA envia resposta via API Chatwoot
   POST /api/v1/accounts/{id}/conversations/123/messages
   ↓
7. Chatwoot envia mensagem para cliente
   ↓
8. Cliente recebe resposta da IA
```

---

### Fluxo 2: Admin Assume Atendimento (Handoff IA → Humano)

```
1. Admin acessa /dashboard/conversas
   ↓
2. Dashboard lista conversas via MCP Server
   chatwoot_list_conversations({ status: 'bot' })
   ↓
3. Admin clica em conversa com status 'bot'
   ↓
4. Interface exibe botão "🤖 Assumir Atendimento"
   ↓
5. Admin clica no botão
   ↓
6. Frontend chama service.takeOverConversation()
   ↓
7. Service usa MCP Server:
   chatwoot_update_conversation({
     conversation_id: 123,
     status: 'open',
     assignee_id: admin.id
   })
   ↓
8. Chatwoot atualiza status para 'open'
   ↓
9. Service envia mensagem de notificação:
   chatwoot_send_message({
     conversation_id: 123,
     content: '🤝 Você foi transferido para um atendente humano...'
   })
   ↓
10. Cliente recebe notificação
    ↓
11. Interface atualiza: badge "👤 Você está atendendo"
    ↓
12. Cliente envia nova mensagem
    ↓
13. Chatwoot envia webhook para Agente IA
    ↓
14. Agente IA verifica: status == 'bot'? ❌ (status = 'open')
    ↓
15. Agente IA ignora mensagem (NÃO responde)
    ↓
16. Admin responde manualmente via dashboard
```

---

### Fluxo 3: Admin Devolve para IA (Handoff Humano → IA)

```
1. Admin está atendendo (status: open)
   ↓
2. Interface exibe botão "Devolver para BIA"
   ↓
3. Admin clica no botão
   ↓
4. Frontend chama service.returnToBot()
   ↓
5. Service usa MCP Server:
   chatwoot_update_conversation({
     conversation_id: 123,
     status: 'bot',
     assignee_id: null
   })
   ↓
6. Chatwoot atualiza status para 'bot'
   ↓
7. Service envia mensagem de notificação:
   chatwoot_send_message({
     conversation_id: 123,
     content: '🤖 Você foi transferido de volta para a assistente BIA...'
   })
   ↓
8. Cliente recebe notificação
   ↓
9. Interface atualiza: badge "🤖 BIA (IA)"
   ↓
10. Cliente envia nova mensagem
    ↓
11. Chatwoot envia webhook para Agente IA
    ↓
12. Agente IA verifica: status == 'bot'? ✅
    ↓
13. Agente IA volta a responder automaticamente
```

---

## 🔐 Segurança

### Autenticação

**API Chatwoot:**
- Usar API Access Token (gerado no Chatwoot)
- Armazenar em variável de ambiente: `CHATWOOT_API_KEY`
- Nunca expor no frontend

**Webhook:**
- Validar assinatura do webhook (HMAC)
- Verificar origem do request
- Rate limiting: máximo 100 requests/minuto

### Permissões

**Assumir Atendimento:**
- Apenas usuários com role 'admin' ou 'atendente'
- Verificar permissão antes de atualizar status

**Visualizar Conversas:**
- Admins veem todas as conversas
- Atendentes veem apenas conversas atribuídas a eles

---

## 📊 Sincronização de Dados

### Estratégia

**Chatwoot como Fonte da Verdade:**
- Status da conversa vem do Chatwoot
- Histórico de mensagens vem do Chatwoot
- Supabase armazena apenas referência (chatwoot_conversation_id)

**Sincronização Bidirecional:**
- Mensagens enviadas pelo admin: salvar em ambos
- Status atualizado: sincronizar de Chatwoot → Supabase
- Novos clientes: criar em ambos

### Campos Sincronizados

| Campo Supabase | Campo Chatwoot | Direção |
|----------------|----------------|---------|
| chatwoot_conversation_id | id | Chatwoot → Supabase |
| status | status | Chatwoot → Supabase |
| assigned_to | assignee_id | Chatwoot → Supabase |
| handoff_status | status (mapeado) | Chatwoot → Supabase |
| handoff_at | updated_at | Chatwoot → Supabase |

**Mapeamento de Status:**
- Chatwoot 'bot' → Supabase 'ai'
- Chatwoot 'open' → Supabase 'human'
- Chatwoot 'pending' → Supabase 'pending'

---

## 🧪 Estratégia de Testes

### Testes Unitários

**Backend (Python):**
- Testar lógica de verificação de status
- Testar geração de resposta da IA
- Testar envio de mensagem via API
- Mock da API Chatwoot

**Frontend (TypeScript):**
- Testar service MCP
- Testar componentes de UI
- Testar handlers de handoff
- Mock do MCP Server

### Testes de Integração

**Webhook:**
- Simular eventos do Chatwoot
- Verificar se IA responde corretamente
- Verificar se IA ignora quando status != 'bot'

**MCP Server:**
- Testar todas as ferramentas
- Verificar autenticação
- Verificar retry em caso de erro

### Testes Manuais

**Fluxo Completo:**
1. Cliente inicia conversa → IA responde
2. Admin assume → IA para de responder
3. Admin envia mensagens → Cliente recebe
4. Admin devolve → IA volta a responder

**Múltiplos Canais:**
- Testar com WhatsApp
- Testar com Site Chat

**Múltiplos Atendentes:**
- Testar com 2+ admins simultâneos
- Verificar que não há conflitos

---

## 📈 Monitoramento e Logs

### Logs Obrigatórios

**Backend:**
```python
logger.info(f"Webhook recebido: {event} - Conversa {conversation_id}")
logger.info(f"Status verificado: {status} - Responder: {should_respond}")
logger.info(f"Resposta enviada: {conversation_id}")
logger.error(f"Erro ao enviar mensagem: {error}")
```

**Frontend:**
```typescript
console.log('Assumindo atendimento:', conversationId);
console.log('Devolvendo para IA:', conversationId);
console.error('Erro no MCP Server:', error);
```

### Métricas

- Número de handoffs IA → Humano por dia
- Número de handoffs Humano → IA por dia
- Tempo médio de atendimento humano
- Taxa de sucesso de envio de mensagens
- Latência do webhook

---

## 🚀 Deploy

### Chatwoot (Docker)

```bash
# docker-compose.yml
version: '3'
services:
  chatwoot:
    image: chatwoot/chatwoot:latest
    ports:
      - "3000:3000"
    environment:
      - POSTGRES_HOST=postgres
      - REDIS_URL=redis://redis:6379
      - SECRET_KEY_BASE=${SECRET_KEY_BASE}
      - FRONTEND_URL=https://chatwoot.slimquality.com.br
    depends_on:
      - postgres
      - redis
  
  postgres:
    image: postgres:15
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=chatwoot
      - POSTGRES_USER=chatwoot
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
  
  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### MCP Server

```bash
# Instalar dependências
npm install chatwoot_mcp

# Configurar em .kiro/settings/mcp.json
# (ver seção MCP Server acima)
```

### Backend

```bash
# Adicionar endpoint webhook
# Já existe em agent/src/api/main.py
# Apenas adicionar novo endpoint /chatwoot/webhook
```

### Frontend

```bash
# Adicionar service MCP
# Atualizar componentes
# Deploy automático via Vercel
```

---

## 📝 Documentação Adicional

### Para Desenvolvedores

- Guia de configuração do MCP Server
- Guia de implementação completo
- Exemplos de uso das ferramentas MCP
- Troubleshooting comum

### Para Usuários

- Como assumir um atendimento
- Como devolver para a IA
- Boas práticas de atendimento
- FAQ

---

**Documento criado em:** 16/01/2026  
**Última atualização:** 16/01/2026  
**Status:** ✅ APROVADO PARA IMPLEMENTAÇÃO
