# MODELO DE DADOS — BIA v2

## Princípios

- Todas as tabelas novas são prefixadas com `bia_`
- Nenhuma tabela existente é modificada — o BIA v2 apenas lê de tabelas existentes
- Todas as tabelas `bia_*` têm `tenant_id` como FK obrigatória
- RLS ativado em todas as tabelas `bia_*`
- Tenant_id é sempre o `id` da tabela `multi_agent_tenants` (já existente)

---

## Tabelas Existentes Consumidas (somente leitura)

| Tabela | O que o BIA v2 lê |
|--------|-------------------|
| `affiliates` | `has_subscription`, `affiliate_type`, `user_id`, `id` |
| `multi_agent_tenants` | `id` (tenant_id), `affiliate_id`, `status`, `whatsapp_status` |
| `auth.users` | `id`, `email` (via Supabase Auth) |

O BIA v2 **escreve** apenas nas tabelas `bia_*` e em `multi_agent_tenants.whatsapp_status` (UPDATE quando WhatsApp conecta/desconecta).

---

## Tabelas Novas — BIA v2

### `bia_agent_config`
Configuração personalizada do agente por tenant (Rules).

```sql
CREATE TABLE bia_agent_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES multi_agent_tenants(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL DEFAULT 'BIA',
  tone TEXT NOT NULL DEFAULT 'amigavel',
  -- valores: 'amigavel', 'formal', 'casual', 'tecnico'
  personality TEXT,
  -- prompt livre de personalidade do afiliado
  tts_enabled BOOLEAN NOT NULL DEFAULT true,
  -- se false, sempre responde em texto mesmo quando cliente manda áudio
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id)
);
```

---

### `bia_napkin`
Memória adaptativa por tenant — campo TEXT livre.

```sql
CREATE TABLE bia_napkin (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES multi_agent_tenants(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  -- conteúdo Markdown livre, gerenciado pelo agente e editável pelo afiliado
  last_updated_by TEXT NOT NULL DEFAULT 'agent',
  -- 'agent' ou 'affiliate'
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id)
);
```

---

### `bia_evolution_instances`
Mapeamento entre instância Evolution API e tenant.

```sql
CREATE TABLE bia_evolution_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES multi_agent_tenants(id) ON DELETE CASCADE,
  instance_name TEXT NOT NULL,
  -- formato: lojista_{affiliate_id} ou similar
  phone_number TEXT,
  -- número conectado, preenchido após QR Code scaneado
  status TEXT NOT NULL DEFAULT 'pending',
  -- 'pending' | 'connecting' | 'active' | 'disconnected'
  evolution_instance_id TEXT,
  -- ID interno retornado pela Evolution API
  webhook_url TEXT,
  -- URL configurada na instância para receber eventos
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id),
  UNIQUE(instance_name)
);
```

---

### `bia_conversations`
Sessões de conversa por tenant e cliente.

```sql
CREATE TABLE bia_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES multi_agent_tenants(id) ON DELETE CASCADE,
  customer_phone TEXT NOT NULL,
  -- número do cliente no formato internacional: 5511999999999
  customer_identifier TEXT NOT NULL,
  -- agnostic: phone ou futuro BSUID/LID do WhatsApp
  customer_name TEXT,
  -- nome identificado ao longo da conversa
  status TEXT NOT NULL DEFAULT 'active',
  -- 'active' | 'closed'
  message_count INTEGER NOT NULL DEFAULT 0,
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT,
  -- preview dos últimos 100 chars da última mensagem
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, customer_phone)
  -- uma conversa ativa por cliente por tenant
);

CREATE INDEX idx_bia_conversations_tenant ON bia_conversations(tenant_id);
CREATE INDEX idx_bia_conversations_status ON bia_conversations(tenant_id, status);
CREATE INDEX idx_bia_conversations_last ON bia_conversations(tenant_id, last_message_at DESC);
```

---

### `bia_messages`
Mensagens individuais de cada conversa.

```sql
CREATE TABLE bia_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES bia_conversations(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES multi_agent_tenants(id) ON DELETE CASCADE,
  -- redundante mas necessário para RLS direto sem join
  sender TEXT NOT NULL,
  -- 'customer' | 'agent'
  message_type TEXT NOT NULL DEFAULT 'text',
  -- 'text' | 'audio' | 'image'
  content TEXT NOT NULL,
  -- para áudio: transcrição do Whisper; para imagem: descrição
  audio_url TEXT,
  -- URL do arquivo de áudio original (quando message_type = 'audio')
  tts_audio_url TEXT,
  -- URL do áudio TTS gerado pelo agente (quando resposta foi em áudio)
  evolution_message_id TEXT,
  -- ID da mensagem na Evolution API para deduplicação
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_bia_messages_conversation ON bia_messages(conversation_id, created_at);
CREATE INDEX idx_bia_messages_tenant ON bia_messages(tenant_id);
```

---

### `bia_metrics`
Métricas agregadas por tenant — atualizadas de forma incremental.

```sql
CREATE TABLE bia_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES multi_agent_tenants(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_conversations INTEGER DEFAULT 0,
  total_messages_received INTEGER DEFAULT 0,
  total_messages_sent INTEGER DEFAULT 0,
  total_audio_transcriptions INTEGER DEFAULT 0,
  total_tts_generated INTEGER DEFAULT 0,
  avg_response_time_ms INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, date)
);

CREATE INDEX idx_bia_metrics_tenant ON bia_metrics(tenant_id, date DESC);
```

---

## RLS Policies

```sql
-- Habilitar RLS em todas as tabelas bia_*
ALTER TABLE bia_agent_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE bia_napkin ENABLE ROW LEVEL SECURITY;
ALTER TABLE bia_evolution_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE bia_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE bia_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE bia_metrics ENABLE ROW LEVEL SECURITY;

-- Política: afiliado só acessa dados do seu próprio tenant
-- O tenant_id é resolvido via affiliate → multi_agent_tenants
-- O backend usa service_role_key, então RLS é para o frontend direto se necessário
-- O backend FastAPI usa service_role_key (bypassa RLS) mas valida tenant_id manualmente

-- Para acesso direto do frontend (se necessário futuro):
CREATE POLICY "tenant_isolation" ON bia_conversations
  FOR ALL USING (
    tenant_id IN (
      SELECT mat.id FROM multi_agent_tenants mat
      JOIN affiliates a ON a.id = mat.affiliate_id
      WHERE a.user_id = auth.uid()
    )
  );
-- Aplicar política equivalente para todas as tabelas bia_*
```

---

## Triggers

```sql
-- Auto-atualizar updated_at em todas as tabelas bia_*
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_bia_agent_config_updated
  BEFORE UPDATE ON bia_agent_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Aplicar para: bia_napkin, bia_evolution_instances, bia_conversations, bia_metrics
```

---

## Relacionamentos

```
auth.users (Supabase)
  └── affiliates (user_id FK)
       └── multi_agent_tenants (affiliate_id FK)  ← tabela pivot existente
            ├── bia_agent_config (tenant_id FK)   ← 1:1
            ├── bia_napkin (tenant_id FK)          ← 1:1
            ├── bia_evolution_instances (tenant_id FK) ← 1:1
            ├── bia_conversations (tenant_id FK)   ← 1:N
            │    └── bia_messages (conversation_id FK) ← 1:N
            └── bia_metrics (tenant_id FK)         ← 1:N (por dia)
```

---

## Estratégia de Migrations

- Migrations ficam em `agent_v2/migrations/`
- Nomenclatura: `001_create_bia_tables.sql`, `002_add_bia_indexes.sql`, etc.
- Executadas manualmente via Supabase SQL Editor ou script de deploy
- Nunca modificam tabelas sem prefixo `bia_` (exceto UPDATE em `multi_agent_tenants.whatsapp_status`)

---

## Observação sobre `customer_identifier`

O campo `customer_identifier` na tabela `bia_conversations` é agnóstico intencionalmente. O WhatsApp planeja migrar para Business-Scoped User IDs (BSUID/LID) em 2026. Armazenar o identificador em campo separado (não só o `customer_phone`) permite migração futura sem reescrita de schema.

No MVP: `customer_identifier = customer_phone`. Na migração futura: `customer_identifier = BSUID`.
