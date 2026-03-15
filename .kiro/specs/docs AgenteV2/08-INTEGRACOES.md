# INTEGRAÇÕES — BIA v2

## Visão Geral

| Integração | Propósito | Status | Crítica? |
|------------|-----------|--------|----------|
| Evolution API v2 | WhatsApp — envio/recebimento | Existente na VPS | ✅ Sim |
| OpenAI API | gpt-4o-mini, Whisper, TTS | Existente no projeto | ✅ Sim |
| Supabase | Banco de dados + Auth | Existente no projeto | ✅ Sim |
| Redis | Cache e sessões | Existente na VPS | ✅ Sim |
| Asaas | Webhooks de pagamento | Existente (não modifica) | Leitura apenas |

---

## 1. Evolution API v2

**Propósito:** Gerenciar instâncias WhatsApp por tenant — criar, conectar, enviar e receber mensagens.

**URL base:** `https://slimquality-evolution-api.wpjtfd.easypanel.host`

**Autenticação:** Header `apikey: {EVOLUTION_API_KEY}`

**Credenciais necessárias:**
- `EVOLUTION_URL`
- `EVOLUTION_API_KEY`
- `EVOLUTION_WEBHOOK_TOKEN` (segredo para validar webhooks recebidos)

**Endpoints utilizados:**

| Ação | Método | Path |
|------|--------|------|
| Criar instância | POST | `/instance/create` |
| Conectar (gerar QR) | GET | `/instance/connect/{instance_name}` |
| Status da conexão | GET | `/instance/connectionState/{instance_name}` |
| Enviar texto | POST | `/message/sendText/{instance_name}` |
| Enviar áudio | POST | `/message/sendWhatsAppAudio/{instance_name}` |
| Deletar instância | DELETE | `/instance/delete/{instance_name}` |

**Nomenclatura de instâncias:**
```
lojista_{affiliate_id}
```
Onde `affiliate_id` é o UUID do afiliado sem hífens (ou os primeiros 8 chars para brevidade).

**Configuração de webhook por instância:**
Ao criar a instância, configurar webhook para:
```
https://agent.slimquality.com.br/webhooks/evolution/{instance_name}
```
Com header: `X-Evolution-Token: {EVOLUTION_WEBHOOK_TOKEN}`

**Eventos monitorados:**
- `messages.upsert` → nova mensagem recebida
- `connection.update` → status da conexão mudou (open/close/connecting)
- `qrcode.updated` → novo QR Code disponível

**Custos:** Infraestrutura própria na VPS — sem custo por mensagem.

**Fallback:** Se Evolution API estiver indisponível, logar erro. Não há fallback de provedor no MVP.

**Retry strategy:** Não implementar retry no envio de resposta — se falhar, logar e seguir. Evolution tem sua própria fila de entrega.

---

## 2. OpenAI API

**Propósito:** Três usos distintos — geração de resposta (gpt-4o-mini), transcrição de áudio (Whisper), síntese de voz (TTS).

**Autenticação:** Header `Authorization: Bearer {OPENAI_API_KEY}`

**Credenciais necessárias:**
- `OPENAI_API_KEY`
- `OPENAI_MODEL` = `gpt-4o-mini`
- `OPENAI_TTS_MODEL` = `tts-1`
- `OPENAI_TTS_VOICE` = `nova` (voz em português com boa performance)

### 2.1 Chat Completion (gpt-4o-mini)

**Endpoint:** `POST https://api.openai.com/v1/chat/completions`

**Configuração:**
```json
{
  "model": "gpt-4o-mini",
  "messages": [
    { "role": "system", "content": "{system_prompt_montado}" },
    { "role": "user", "content": "{mensagem_do_cliente}" }
  ],
  "max_tokens": 500,
  "temperature": 0.7
}
```

**Custo:** ~$0.15/1M tokens input, ~$0.60/1M tokens output. Com prompt de ~800 tokens + resposta de ~200 tokens por interação e 500 interações/mês/tenant: ~$0.09/tenant/mês.

### 2.2 Whisper (transcrição de áudio)

**Endpoint:** `POST https://api.openai.com/v1/audio/transcriptions`

**Configuração:**
```
file: {arquivo_audio}
model: whisper-1
language: pt
response_format: text
```

**Formatos suportados:** mp3, mp4, mpeg, mpga, m4a, wav, webm

**Nota:** Evolution API entrega áudios em formato ogg/opus. Converter para mp3/wav antes de enviar ao Whisper se necessário.

**Custo:** $0.006/minuto. Com 150 áudios de 2 min/mês/tenant: ~$1.80/tenant/mês.

**Fallback:** Se Whisper falhar, responder ao cliente: "Recebi seu áudio mas não consegui processar. Pode me enviar sua mensagem em texto?"

### 2.3 TTS (síntese de voz)

**Endpoint:** `POST https://api.openai.com/v1/audio/speech`

**Configuração:**
```json
{
  "model": "tts-1",
  "input": "{texto_da_resposta}",
  "voice": "nova",
  "response_format": "mp3"
}
```

**Custo:** $15/1M caracteres. Com resposta média de 300 chars e 150 respostas em áudio/mês/tenant: ~$0.68/tenant/mês.

**Fallback:** Se TTS falhar, enviar resposta em texto com nota: "*(Resposta em texto — áudio temporariamente indisponível)*"

**Custo total OpenAI por tenant/mês:** ~$2.57 (~R$14,50) — dentro da estimativa R$21,50 incluindo margem.

**Retry strategy:** Uma tentativa de retry com backoff de 2 segundos para erros 429 (rate limit) e 5xx.

---

## 3. Supabase

**Propósito:** Banco de dados PostgreSQL principal e autenticação.

**Autenticação:** `service_role_key` no backend (bypassa RLS) + validação manual de tenant_id.

**Credenciais necessárias:**
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `SUPABASE_JWT_SECRET` (para validar tokens Supabase no middleware)

**Uso no BIA v2:**
- Leitura de `affiliates`, `multi_agent_tenants`
- Leitura/escrita em todas as tabelas `bia_*`
- Update pontual em `multi_agent_tenants.whatsapp_status`
- Validação de JWT via `SUPABASE_JWT_SECRET`

**Custos:** Projeto existente. Sem custo adicional significativo — tabelas `bia_*` são leves (texto puro, sem vetores).

**Fallback:** Se Supabase estiver indisponível, responder ao cliente com mensagem de indisponibilidade temporária. Não processar mensagem sem banco disponível.

---

## 4. Redis

**Propósito:** Cache de configurações, Napkin, e histórico de sessão por conversa.

**URL:** `redis://localhost:6379` (instância existente na VPS)

**Credenciais necessárias:**
- `REDIS_URL`

**Keys utilizadas:**

```
tenant:config:{tenant_id}        TTL: 300s   (5 min)
tenant:napkin:{tenant_id}        TTL: 120s   (2 min)
tenant:qrcode:{tenant_id}        TTL: 60s    (1 min — QR Code expira)
conv:history:{tenant_id}:{phone} TTL: 1800s  (30 min)
evolution:instance:{name}        TTL: 600s   (10 min)
```

**Custos:** Infraestrutura própria — sem custo adicional.

**Fallback:** Se Redis estiver indisponível, buscar dados diretamente do Supabase (degradação graciosa, sem cache). Logar aviso.

---

## 5. Asaas — Leitura apenas

**Propósito:** O BIA v2 NÃO modifica os webhooks Asaas existentes. A função `activateBundle()` já cria o `multi_agent_tenants` quando o pagamento é confirmado. O BIA v2 apenas consome o resultado dessa ativação.

**Interação do BIA v2 com o ciclo Asaas:**

| Evento Asaas | Handler existente | Impacto no BIA v2 |
|---|---|---|
| `PAYMENT_CONFIRMED` (adesão) | `activateBundle()` | Cria `multi_agent_tenants` com `status = 'active'` |
| `PAYMENT_RECEIVED` (mensalidade) | `reactivateBundle()` | Atualiza `multi_agent_tenants.status = 'active'` |
| `PAYMENT_OVERDUE` | Handler existente | Atualiza `affiliates.payment_status = 'overdue'` |
| `SUBSCRIPTION_DELETED` | Handler existente | Pode suspender tenant |

O BIA v2 monitora `multi_agent_tenants.status` e `affiliates.payment_status` para decidir se o agente está ativo. **Não precisa se integrar diretamente ao Asaas.**

---

## Fluxo de Dependências

```
Cliente WhatsApp
       ↓
Evolution API → webhook → BIA v2 Backend
                               ↓
                    ┌──────────┴──────────┐
                    ↓                     ↓
                 Redis               Supabase
               (cache)              (persistência)
                    ↓
                OpenAI API
            (gpt-4o-mini + Whisper + TTS)
                    ↓
               Evolution API
              (envio resposta)
                    ↓
            Cliente WhatsApp
```

---

## Checklist de Configuração antes do Deploy

- [ ] `EVOLUTION_API_KEY` configurada no `.env`
- [ ] `EVOLUTION_WEBHOOK_TOKEN` gerado e configurado no Evolution API
- [ ] `OPENAI_API_KEY` com saldo suficiente
- [ ] `SUPABASE_URL` e `SUPABASE_SERVICE_KEY` do projeto correto
- [ ] `SUPABASE_JWT_SECRET` extraído do painel Supabase (Settings → API)
- [ ] `REDIS_URL` apontando para instância local na VPS
- [ ] Migrations `bia_*` executadas no Supabase
- [ ] Rota `/webhooks/evolution/*` acessível publicamente (não bloqueada por nginx)
