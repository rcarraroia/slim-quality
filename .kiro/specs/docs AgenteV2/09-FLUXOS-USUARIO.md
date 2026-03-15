# FLUXOS DE USUÁRIO — BIA v2

## Fluxo 1 — Primeiro Acesso: Afiliado Conecta WhatsApp

**Ator:** Ana (Individual Premium, `has_subscription = true`, tenant já criado pelo `activateBundle()`)

```
1. Ana acessa /afiliados/dashboard/meu-agente
   → Sistema verifica has_subscription = true ✅
   → GET /api/agent/status → whatsapp_status = 'inactive'
   → Exibe tela de boas-vindas com CTA "Conectar WhatsApp"

2. Ana clica em "Conectar WhatsApp"
   → POST /api/agent/connect
   → Backend cria instância na Evolution API (instance_name: lojista_{affiliate_id})
   → Backend salva em bia_evolution_instances (status = 'connecting')
   → Backend busca QR Code da Evolution
   → Frontend exibe QR Code com instrução de scan

3. Ana escaneia o QR Code com o celular
   → Evolution detecta conexão → envia webhook connection.update { state: "open" }
   → Backend atualiza bia_evolution_instances (status = 'active', phone_number preenchido)
   → Backend atualiza multi_agent_tenants (whatsapp_status = 'active')
   → Redis: invalida cache do tenant

4. Frontend (polling a cada 3s) detecta mudança
   → GET /api/agent/whatsapp-status → { status: "active" }
   → Exibe: "WhatsApp conectado! Seu agente está ativo."
   → Redireciona para Overview
```

**Edge cases:**
- QR Code expira (60s): botão "Gerar novo QR Code"
- Evolution indisponível: mensagem de erro + botão tentar novamente

---

## Fluxo 2 — Cliente Envia Texto, Recebe Texto

**Ator:** João (cliente final)

```
1. João manda: "Boa tarde, quero saber sobre os colchões"
   → Evolution recebe → webhook POST /webhooks/evolution/lojista_{id}

2. Backend processa
   → Valida X-Evolution-Token ✅
   → Identifica tenant via instance_name (Redis ou Supabase)
   → Verifica status: 'active' ✅
   → Tipo: texto → sem transcrição

3. Carrega contexto
   → Redis: config do tenant (nome, tom, personalidade)
   → Redis: Napkin do tenant
   → Redis: histórico recente da conversa com João

4. Classifica intenção → "informacao"

5. Sub-agent monta resposta
   → System prompt: Rules + skill_produtos.md + Napkin + histórico
   → gpt-4o-mini gera resposta

6. Envia resposta em texto
   → POST /message/sendText/lojista_{id}
   → João recebe resposta em < 5 segundos

7. Background tasks
   → Salva conversa e mensagens no Supabase
   → Atualiza métricas
   → Atualiza Napkin se aprendeu algo novo
```

---

## Fluxo 3 — Cliente Envia Áudio, Recebe Áudio

**Ator:** Maria (cliente), `tts_enabled = true`

```
1. Maria manda áudio de 40 segundos

2. Backend identifica tipo: audioMessage
   → Download do arquivo de áudio via URL da Evolution

3. Whisper transcreve
   → POST /audio/transcriptions → "Quero saber o preço e parcelamento no cartão"

4. Pipeline processa texto transcrito
   → Classifica: "vendas"
   → Sub-agent de vendas gera resposta em texto

5. TTS gera áudio da resposta
   → tts_enabled = true ✅ + cliente mandou áudio ✅
   → POST /audio/speech → arquivo mp3

6. Envia áudio como resposta
   → POST /message/sendWhatsAppAudio/lojista_{id}
   → Maria recebe resposta em áudio

7. Persistência: salva transcrição + URL dos áudios
```

**Edge case — Whisper falha:**
```
→ Responde: "Recebi seu áudio mas não consegui processar. Pode me enviar em texto?"
→ tts_enabled = true → essa mensagem de erro também vai em áudio TTS
```

---

## Fluxo 4 — Afiliado Configura o Agente

**Ator:** Carlos (Lojista)

```
1. Carlos acessa /meu-agente/configuracoes
   → GET /api/agent/config → formulário preenchido com valores atuais

2. Carlos altera:
   - Nome: "Assistente do Carlos"
   - Tom: "formal"
   - TTS: desativado

3. Carlos clica "Salvar"
   → PUT /api/agent/config
   → Backend salva + invalida Redis
   → Toast: "Configuração salva!"

4. Próxima mensagem usa nova configuração automaticamente
```

---

## Fluxo 5 — Afiliado Edita o Napkin

**Ator:** Ana

```
1. Ana acessa /meu-agente/napkin
   → GET /api/agent/napkin → editor com conteúdo atual

2. Ana corrige informação incorreta

3. Ana clica "Salvar"
   → PUT /api/agent/napkin
   → Backend salva (last_updated_by = 'affiliate') + invalida Redis
   → Toast: "Memória atualizada!"

4. Próxima interação usa Napkin corrigido
```

---

## Fluxo 6 — Suspensão por Inadimplência (automático)

```
1. Mensalidade vence sem pagamento
   → Webhook Asaas (handler existente) atualiza:
     affiliates.payment_status = 'overdue'
     multi_agent_tenants.status = 'suspended'

2. Próxima mensagem de cliente chega
   → BIA v2 verifica: status = 'suspended'
   → Ignora silenciosamente

3. Ana acessa dashboard
   → Banner vermelho: "Conta suspensa por inadimplência"
   → Agente mostra status "Suspenso"

4. Ana regulariza pagamento
   → Webhook Asaas reativa: multi_agent_tenants.status = 'active'
   → Agente volta automaticamente na próxima mensagem
```

---

## Fluxo 7 — Admin Gerencia Tenants

**Ator:** Renato (Super Admin)

```
1. Renato acessa /dashboard/agentes
   → GET /api/admin/tenants → lista todos com status

2. Renato suspende tenant manualmente
   → PUT /api/admin/tenants/{id}/status { status: "suspended" }
   → Próximas mensagens do tenant ignoradas

3. Para atualizar Skills globais
   → Edita arquivo .md no repositório → deploy do agent_v2
   → Todos os tenants recebem atualização imediatamente
```

---

## Diagrama de Sequência — Fluxo Principal (Áudio)

```
Cliente     Evolution API     BIA v2          Redis       Supabase     OpenAI
  │               │               │               │             │           │
  │── áudio ─────→│               │               │             │           │
  │               │── webhook ───→│               │             │           │
  │               │               │── get config ─→             │           │
  │               │               │←─────────────  │             │           │
  │               │               │── transcribe ─────────────────────────→ │
  │               │               │←── texto ─────────────────────────────  │
  │               │               │── completion ─────────────────────────→ │
  │               │               │←── resposta ──────────────────────────  │
  │               │               │── TTS ────────────────────────────────→ │
  │               │               │←── mp3 ───────────────────────────────  │
  │               │←── send audio─│               │             │           │
  │←── áudio ─────│               │               │             │           │
  │               │               │── save ──────────────────→  │           │
  │               │               │── cache update→             │           │
```
