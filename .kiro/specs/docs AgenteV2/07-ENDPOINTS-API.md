# ENDPOINTS API — BIA v2

## Convenções

- Base URL: `https://agent.slimquality.com.br` (ou porta configurada no EasyPanel)
- Autenticação: `Authorization: Bearer {supabase_jwt}` em todos os endpoints `/api/*`
- Webhooks: sem JWT, validados por `X-Evolution-Token` (header secreto)
- Versionamento: sem versão no MVP — todos os endpoints em `/api/` e `/webhooks/`
- Todos os responses em JSON
- Erros seguem formato: `{ "error": "mensagem", "code": "ERROR_CODE" }`

---

## Webhooks (sem autenticação JWT)

### POST /webhooks/evolution/{instance_name}

Recebe eventos da Evolution API para uma instância específica.

**Header obrigatório:**
```
X-Evolution-Token: {EVOLUTION_WEBHOOK_TOKEN}
```

**Payload (Evolution API v2):**
```json
{
  "event": "messages.upsert",
  "instance": "lojista_abc123",
  "data": {
    "key": {
      "remoteJid": "5511999999999@s.whatsapp.net",
      "fromMe": false,
      "id": "MSG_ID"
    },
    "message": {
      "conversation": "Olá, quero saber sobre os colchões"
    },
    "messageTimestamp": 1710000000,
    "messageType": "conversation"
  }
}
```

**Eventos tratados:**
- `messages.upsert` → processar mensagem recebida
- `connection.update` → atualizar `whatsapp_status` no tenant
- `qrcode.updated` → armazenar QR Code temporariamente no Redis

**Response:** `200 OK` sempre (evita reenvios desnecessários da Evolution)

---

## Agent Endpoints (autenticados)

### GET /api/agent/status

Retorna status completo do agente do tenant autenticado.

**Response 200:**
```json
{
  "tenant_id": "uuid",
  "agent_name": "BIA",
  "whatsapp_status": "active",
  "instance_name": "lojista_abc123",
  "phone_number": "5511999999999",
  "is_active": true,
  "total_conversations_today": 12,
  "last_conversation_at": "2026-03-14T10:30:00Z"
}
```

---

### GET /api/agent/config

Retorna configuração atual (Rules) do agente.

**Response 200:**
```json
{
  "agent_name": "BIA",
  "tone": "amigavel",
  "personality": "Sou assistente da Ana, especialista em colchões terapêuticos...",
  "tts_enabled": true,
  "is_active": true
}
```

---

### PUT /api/agent/config

Salva configuração (Rules) do agente.

**Request Body:**
```json
{
  "agent_name": "Assistente da Ana",
  "tone": "amigavel",
  "personality": "Sou a assistente virtual da Ana...",
  "tts_enabled": false
}
```

**Validações:**
- `agent_name`: 1-50 caracteres
- `tone`: enum `["amigavel", "formal", "casual", "tecnico"]`
- `personality`: máximo 1000 caracteres
- `tts_enabled`: boolean

**Response 200:**
```json
{ "success": true, "message": "Configuração salva com sucesso" }
```

---

### POST /api/agent/connect

Inicia o provisionamento da instância WhatsApp. Cria instância na Evolution API e retorna QR Code.

**Response 200:**
```json
{
  "instance_name": "lojista_abc123",
  "status": "connecting",
  "qr_code": "data:image/png;base64,..."
}
```

**Response 400 (já conectado):**
```json
{ "error": "WhatsApp já está conectado", "code": "ALREADY_CONNECTED" }
```

---

### GET /api/agent/whatsapp-status

Retorna status atual da conexão WhatsApp (usado para polling no frontend).

**Response 200:**
```json
{
  "status": "active",
  "phone_number": "5511999999999",
  "connected_at": "2026-03-14T09:00:00Z"
}
```

**Valores possíveis de `status`:** `pending` | `connecting` | `active` | `disconnected`

---

### GET /api/agent/qrcode

Retorna QR Code atual (se status = connecting).

**Response 200:**
```json
{
  "qr_code": "data:image/png;base64,...",
  "expires_at": "2026-03-14T09:05:00Z"
}
```

**Response 404 (não há QR Code ativo):**
```json
{ "error": "QR Code não disponível", "code": "NO_QR_CODE" }
```

---

### GET /api/agent/napkin

Retorna conteúdo atual do Napkin.

**Response 200:**
```json
{
  "content": "## Padrões do Negócio\n- Clientes preferem PIX...",
  "last_updated_by": "agent",
  "updated_at": "2026-03-14T08:00:00Z"
}
```

---

### PUT /api/agent/napkin

Salva conteúdo editado do Napkin pelo afiliado.

**Request Body:**
```json
{
  "content": "## Padrões do Negócio\n- Clientes desta região preferem PIX..."
}
```

**Validações:**
- `content`: máximo 10.000 caracteres

**Response 200:**
```json
{ "success": true, "message": "Memória atualizada com sucesso" }
```

---

### GET /api/agent/metrics

Retorna métricas do agente dos últimos 7 dias.

**Query params:**
- `days`: número de dias (padrão: 7, máximo: 30)

**Response 200:**
```json
{
  "period_days": 7,
  "total_conversations": 45,
  "total_messages_received": 180,
  "total_messages_sent": 175,
  "total_audio_transcriptions": 32,
  "total_tts_generated": 28,
  "avg_response_time_ms": 2300,
  "daily": [
    { "date": "2026-03-14", "conversations": 8, "messages_received": 32 }
  ]
}
```

---

## Conversations Endpoints (autenticados)

### GET /api/conversations

Lista conversas do tenant com paginação.

**Query params:**
- `page`: número da página (padrão: 1)
- `per_page`: itens por página (padrão: 20, máximo: 50)
- `status`: filtro por status (`active` | `closed`)

**Response 200:**
```json
{
  "conversations": [
    {
      "id": "uuid",
      "customer_phone": "5511999999999",
      "customer_name": "João Silva",
      "status": "active",
      "message_count": 8,
      "last_message_at": "2026-03-14T10:30:00Z",
      "last_message_preview": "Qual o prazo de entrega?"
    }
  ],
  "total": 45,
  "page": 1,
  "per_page": 20
}
```

---

### GET /api/conversations/{conversation_id}

Retorna conversa completa com todas as mensagens.

**Response 200:**
```json
{
  "id": "uuid",
  "customer_phone": "5511999999999",
  "customer_name": "João Silva",
  "status": "active",
  "messages": [
    {
      "id": "uuid",
      "sender": "customer",
      "message_type": "audio",
      "content": "Quero saber sobre os colchões ortopédicos",
      "audio_url": "https://...",
      "created_at": "2026-03-14T10:25:00Z"
    },
    {
      "id": "uuid",
      "sender": "agent",
      "message_type": "audio",
      "content": "Olá! Temos ótimas opções de colchões terapêuticos...",
      "tts_audio_url": "https://...",
      "created_at": "2026-03-14T10:25:03Z"
    }
  ]
}
```

---

## Admin Endpoints (autenticados — somente Super Admin)

Middleware verifica se usuário tem role `admin` via tabela `profiles` existente.

### GET /api/admin/tenants

Lista todos os tenants com status.

**Response 200:**
```json
{
  "tenants": [
    {
      "tenant_id": "uuid",
      "affiliate_name": "Ana Silva",
      "affiliate_type": "individual",
      "whatsapp_status": "active",
      "phone_number": "5511999999999",
      "status": "active",
      "conversations_today": 12,
      "activated_at": "2026-01-15T00:00:00Z"
    }
  ],
  "total": 27
}
```

---

### PUT /api/admin/tenants/{tenant_id}/status

Suspende ou reativa um tenant manualmente.

**Request Body:**
```json
{ "status": "suspended", "reason": "Inadimplência manual" }
```

**Response 200:**
```json
{ "success": true, "tenant_id": "uuid", "new_status": "suspended" }
```

---

### GET /api/admin/skills

Lista as Skills globais ativas com metadados.

**Response 200:**
```json
{
  "skills": [
    {
      "name": "skill_produtos",
      "filename": "skill_produtos.md",
      "size_chars": 4500,
      "last_modified": "2026-03-01T00:00:00Z"
    }
  ]
}
```

---

## Health Check

### GET /health

**Response 200:**
```json
{
  "status": "ok",
  "version": "2.0.0",
  "services": {
    "supabase": "ok",
    "redis": "ok",
    "openai": "ok",
    "evolution": "ok"
  }
}
```

---

## Pydantic Models Principais

```python
# models/tenant.py

class AgentConfig(BaseModel):
    agent_name: str = Field(min_length=1, max_length=50)
    tone: Literal["amigavel", "formal", "casual", "tecnico"] = "amigavel"
    personality: Optional[str] = Field(None, max_length=1000)
    tts_enabled: bool = True

class NapkinUpdate(BaseModel):
    content: str = Field(max_length=10000)

class TenantStatusUpdate(BaseModel):
    status: Literal["active", "suspended"]
    reason: Optional[str] = None

# models/webhook.py

class EvolutionWebhookMessage(BaseModel):
    event: str
    instance: str
    data: Dict[str, Any]
```

---

## Rate Limiting

No MVP: sem rate limiting formal. O volume esperado é baixo.

Proteções básicas:
- Webhook Evolution: validação por `X-Evolution-Token` (rejeita sem o header)
- Endpoints admin: verificação de role no middleware
- Endpoints de afiliado: isolamento por tenant_id (não há cross-tenant)

Rate limiting formal será implementado na fase 2 se necessário.
