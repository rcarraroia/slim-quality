# ARQUITETURA BACKEND — BIA v2

## Stack Tecnológico

| Camada | Tecnologia | Justificativa |
|--------|-----------|---------------|
| Runtime | Python 3.11 | Compatível com stack existente |
| Framework Web | FastAPI | Async nativo, rápido, tipagem forte |
| IA — Texto | OpenAI gpt-4o-mini | Barato, rápido, bom em português |
| IA — Transcrição | OpenAI Whisper API | Sem infraestrutura local de ML |
| IA — Voz | OpenAI TTS API | Mesmo SDK, consistência |
| Banco de Dados | Supabase (PostgreSQL) | Projeto existente, RLS nativo |
| Cache | Redis | Instância existente na VPS |
| WhatsApp | Evolution API v2 | Instalação existente na VPS |
| Deploy | Docker + EasyPanel | Infraestrutura existente |
| Auth | Supabase JWT | Mesmo sistema do frontend |

---

## Estrutura de Módulos

```
agent_v2/
├── app/
│   ├── main.py                    ← Entry point FastAPI, inicialização
│   ├── core/
│   │   ├── config.py              ← Settings (env vars, Pydantic BaseSettings)
│   │   ├── auth.py                ← Validação JWT Supabase + extração tenant_id
│   │   ├── dependencies.py        ← FastAPI dependencies (get_tenant, get_db)
│   │   └── exceptions.py          ← Handlers de exceção padronizados
│   ├── api/
│   │   ├── webhooks.py            ← POST /webhooks/evolution/{instance_id}
│   │   ├── tenants.py             ← GET/POST /api/tenants (painel admin)
│   │   ├── agent.py               ← GET/PUT /api/agent (config, napkin, rules)
│   │   ├── conversations.py       ← GET /api/conversations (histórico)
│   │   ├── metrics.py             ← GET /api/metrics
│   │   └── health.py              ← GET /health
│   ├── agents/
│   │   ├── pipeline.py            ← Orquestrador principal: monta contexto → chama sub-agent
│   │   ├── classifier.py          ← Sub-agent classificador de intenção
│   │   ├── sales_agent.py         ← Sub-agent de vendas
│   │   └── support_agent.py       ← Sub-agent de suporte
│   ├── skills/
│   │   ├── skill_produtos.md      ← Catálogo, preços, benefícios, comparativos
│   │   ├── skill_vendas.md        ← Abordagem consultiva, objeções, fechamento
│   │   ├── skill_suporte.md       ← Pós-venda, dúvidas, garantias, trocas
│   │   └── skill_loader.py        ← Carrega e caches skills em memória
│   ├── services/
│   │   ├── evolution_service.py   ← Criar instância, QR Code, enviar mensagem
│   │   ├── openai_service.py      ← Chat completion, Whisper, TTS
│   │   ├── supabase_service.py    ← Cliente Supabase, queries, RLS
│   │   ├── redis_service.py       ← Cache de config, histórico de sessão
│   │   └── napkin_service.py      ← Ler/escrever/atualizar Napkin por tenant
│   └── models/
│       ├── tenant.py              ← Pydantic models de tenant e config
│       ├── conversation.py        ← Pydantic models de conversa e mensagem
│       └── webhook.py             ← Pydantic models de payload Evolution API
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
└── .env.example
```

---

## Arquitetura do Pipeline de Atendimento

O coração do BIA v2 é o pipeline de processamento de mensagens. Não usa grafos complexos — é uma sequência linear com contexto bem montado.

```
Webhook Evolution API chega
         ↓
[1. Identificar Tenant]
  — instância Evolution → tenant_id via tabela bia_evolution_instances
  — verificar status do tenant (active/suspended)
  — se suspenso → ignorar silenciosamente
         ↓
[2. Processar Mídia]
  — se texto → passa direto
  — se áudio → Whisper transcreve → texto transcrito
  — se imagem → texto descritivo "Cliente enviou imagem: [descrição]"
         ↓
[3. Carregar Contexto]
  — Rules do tenant (cache Redis, TTL 5min)
  — Napkin do tenant (cache Redis, TTL 2min)
  — Últimas 10 mensagens da conversa (Redis ou Supabase)
  — Skills relevantes (cache em memória, recarrega a cada deploy)
         ↓
[4. Classificar Intenção]
  — Sub-agent Classificador lê mensagem + contexto recente
  — Retorna: "vendas" | "suporte" | "informacao" | "saudacao"
         ↓
[5. Processar com Sub-agent Especializado]
  — Monta system prompt: Rules + Skill relevante + Napkin + histórico
  — Chama gpt-4o-mini com contexto completo
  — Obtém resposta em texto
         ↓
[6. Formatar e Enviar Resposta]
  — se cliente mandou áudio E tts_enabled = true → gerar áudio TTS → enviar áudio
  — caso contrário → enviar texto
         ↓
[7. Persistir e Atualizar (assíncrono)]
  — salvar mensagem e resposta no banco
  — atualizar Napkin com padrões da interação (background task)
  — atualizar métricas do tenant
```

---

## Arquitetura de Skills

Skills são arquivos Markdown carregados em memória no boot do servidor. Não há banco de dados de Skills — são arquivos versionados no repositório.

```
skill_produtos.md       → injetado quando intent = "vendas" ou "informacao"
skill_vendas.md         → injetado apenas quando intent = "vendas"
skill_suporte.md        → injetado quando intent = "suporte"
```

**Atualização de Skills:** deploy do `agent_v2/` — sem hot-reload necessário, pois Skills mudam raramente.

**Admin gerencia Skills:** via arquivos no repositório, não via painel. O painel admin mostra as Skills ativas mas não as edita (fase 2 pode ter editor).

---

## Arquitetura do Napkin

O Napkin é um campo TEXT na tabela `bia_napkin` por tenant. Estrutura interna é Markdown livre, gerenciada pelo agente.

**Leitura:** a cada interação, carregado do Redis (TTL 2min). Se expirado, buscado do Supabase.

**Escrita:** background task após cada conversa. O agente avalia se algo novo deve ser adicionado/corrigido e atualiza o TEXT.

**Formato sugerido (gerenciado pelo agente, não pelo afiliado):**
```markdown
## Padrões do Negócio
- Clientes desta região preferem pagamento no PIX
- Pergunta frequente: diferença entre modelo X e modelo Y

## Correções do Afiliado
- Não mencionar prazo de 7 dias, pois trabalhamos com 15 dias
- Chamar o afiliado de "Carlos" nas respostas

## O que Funciona
- Abordar benefício do sono profundo tem boa conversão
```

**Edição pelo afiliado:** pelo painel, o afiliado pode editar o texto livremente. O agente respeita o que está escrito.

---

## Autenticação e Autorização

### Painel do Afiliado → Backend BIA v2

1. Frontend envia `Authorization: Bearer {supabase_jwt}`
2. Middleware valida o JWT com chave pública do Supabase
3. Extrai `user_id` do campo `sub` do token
4. Query: `SELECT id FROM affiliates WHERE user_id = {user_id}`
5. Query: `SELECT id, status FROM multi_agent_tenants WHERE affiliate_id = {affiliate_id}`
6. Injeta `TenantContext(tenant_id, affiliate_id, status)` em todas as rotas

### Webhook Evolution API → Backend BIA v2

Fluxo diferente — não há JWT. Identificação por instância:
1. Webhook chega com `instance_name` no payload
2. Query: `SELECT tenant_id FROM bia_evolution_instances WHERE instance_name = {instance_name}`
3. Verifica status do tenant
4. Processa ou ignora

**Segurança do webhook:** Evolution API configurada para enviar header `X-Evolution-Token` com valor secreto armazenado em env var.

---

## Workers Assíncronos

O BIA v2 usa `BackgroundTasks` do FastAPI para operações que não bloqueiam a resposta:

- **Atualização do Napkin:** análise da conversa e escrita no banco
- **Persistência de mensagens:** salvar no Supabase após enviar resposta
- **Atualização de métricas:** incrementar contadores por tenant

Não usa Celery/RQ no MVP — BackgroundTasks é suficiente para o volume esperado.

---

## Cache com Redis

| Chave | Conteúdo | TTL |
|-------|----------|-----|
| `tenant:config:{tenant_id}` | Rules + configurações do agente | 5 min |
| `tenant:napkin:{tenant_id}` | Texto completo do Napkin | 2 min |
| `conv:history:{tenant_id}:{phone}` | Últimas 10 mensagens | 30 min |
| `evolution:instance:{instance_name}` | tenant_id mapeado | 10 min |

---

## Variáveis de Ambiente

```env
# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
OPENAI_TTS_MODEL=tts-1
OPENAI_TTS_VOICE=nova

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...

# Redis
REDIS_URL=redis://localhost:6379

# Evolution API
EVOLUTION_URL=https://slimquality-evolution-api.wpjtfd.easypanel.host
EVOLUTION_API_KEY=xxx
EVOLUTION_WEBHOOK_TOKEN=xxx  ← segredo para validar webhooks recebidos

# App
APP_ENV=production
LOG_LEVEL=INFO
```

---

## Estratégia de Deploy

**Desenvolvimento local:**
```bash
cd agent_v2/
docker-compose up --build
```

**Produção (EasyPanel):**
1. Push para repositório
2. EasyPanel rebuild automático ou manual do container `agent_v2`
3. O container sobe na mesma VPS, nova porta (ex: 8001 enquanto `agent/` ainda roda na 8000)
4. Após validação, `agent/` é parado e `agent_v2` assume a porta principal
5. Nginx/proxy interno do EasyPanel redirecionado para nova porta

**Rollback:** reativar container `agent/` se necessário (mantido parado, não removido, por 30 dias após migração).

---

## Tratamento de Erros

- **OpenAI indisponível:** responder ao cliente "Estou com instabilidade técnica, tente novamente em instantes" — sem travar o webhook
- **Evolution API indisponível:** logar erro, não retentar (Evolution tem retry próprio)
- **Tenant suspenso:** silenciosamente ignorar mensagem — sem resposta ao cliente
- **Transcrição Whisper falha:** tratar áudio como "Cliente enviou um áudio [não transcrito]" e perguntar se pode reenviar em texto
- **Todos os erros:** logar com `tenant_id`, `conversation_id`, e payload original para debug
