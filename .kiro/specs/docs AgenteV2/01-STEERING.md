# STEERING — BIA v2 (Agente Multi-Tenant Slim Quality)

## 🎯 Visão em Uma Frase
Agente de atendimento WhatsApp com IA para afiliados Premium e Lojistas da Slim Quality que automatiza vendas e suporte 24/7 através de sub-agents especializados com memória adaptativa por tenant.

---

## 🏗️ Stack Definida

- **Backend (novo):** Python 3.11 + FastAPI — pasta `agent_v2/` no repositório
- **Frontend (modificação):** React + TypeScript + Tailwind + shadcn/ui — pasta `src/` existente
- **Database:** Supabase (PostgreSQL) — novas tabelas prefixadas `bia_` no projeto existente
- **Cache/Sessão:** Redis — instância existente na VPS
- **IA:** OpenAI gpt-4o-mini (texto) + Whisper (transcrição áudio) + TTS (síntese voz)
- **WhatsApp:** Evolution API v2 — instância existente, 1 instância por afiliado
- **Deploy:** Docker + EasyPanel na VPS — `agent_v2/` substitui `agent/` quando pronto
- **Auth:** Supabase Auth (JWT) — mesmo sistema do Slim Quality principal
- **Integrações:** Evolution API, OpenAI, Supabase, Redis, Asaas (webhooks existentes)

---

## 🔑 Decisões Arquiteturais (não questione sem motivo)

1. **Skills + Sub-agents + Napkin em vez de LangGraph + SICC**
   Justificativa: o sistema anterior (agent/) foi descartado por acúmulo de bugs e over-engineering. A nova arquitetura usa contexto bem montado + LLM único, sem pipeline de ML, embeddings ou supervisor de aprovação.

2. **Napkin como TEXT no banco (MVP)**
   Justificativa: simplicidade máxima. O afiliado pode ler e editar a memória do agente pelo painel. Migração para pgvector na fase 2 quando necessário.

3. **gpt-4o-mini centralizado — Slim Quality banca os custos de LLM**
   Justificativa: zero fricção no onboarding. Custo estimado ~R$21,50/tenant/mês (texto + Whisper + TTS) é absorvido no preço do plano (R$97/mês).

4. **Áudio espelha o cliente por padrão (Whisper + TTS)**
   Justificativa: clientes brasileiros usam muito áudio no WhatsApp. Não suportar áudio cria fricção crítica. TTS desativável pelo afiliado nas configurações.

5. **Provisionamento de instância Evolution na primeira conexão pelo afiliado**
   Justificativa: zero acoplamento com o fluxo de ativação existente (`activateBundle()`). O tenant é criado pelo webhook Asaas; a instância Evolution é criada quando o afiliado clica "Conectar WhatsApp" no painel.

6. **Agente incluído nos planos Premium e Lojista — sem cobrança separada**
   Justificativa: `has_subscription = true` na tabela `affiliates` controla o acesso. O `activateBundle()` existente já cria o `multi_agent_tenants`. O BIA v2 apenas consome essa infraestrutura.

7. **Conhecimento global (Skills) — personalização apenas em nome, tom e personalidade (Rules)**
   Justificativa: base de produtos Slim Quality é centralizada. Afiliados não contradizem informações oficiais.

8. **Desenvolvimento em `agent_v2/` — zero reaproveitamento de código do `agent/`**
   Justificativa: sistema atual tem auth com mock hardcoded, SICC nunca funcionou de fato, arquitetura incompatível com multi-tenant. Usar como referência conceitual apenas.

---

## 🚫 O que NÃO fazer

- Não reaproveitar código do `agent/` — referência conceitual apenas
- Não implementar LangGraph, SICC, embeddings, sentence-transformers
- Não dar ao afiliado controle sobre a base de conhecimento global
- Não implementar CRM Kanban no MVP — fase 2
- Não implementar Handoff Chatwoot no MVP — fase 2
- Não criar cobrança separada para o agente
- Não modificar o fluxo `activateBundle()` existente
- Não incluir estimativas de tempo nas tasks
- Não implementar multi-provider de LLM
- Não expor custos de LLM ao afiliado

---

## 📊 Métricas de Sucesso

- Taxa de resolução pelo agente sem intervenção humana > 70%
- Tempo de resposta ao cliente < 5 segundos
- % de afiliados Premium/Lojista com WhatsApp conectado (adoção)
- Uptime do serviço > 99%
- Custo real de LLM por tenant ≤ R$25/mês

---

## 🔗 Contexto de Negócio

A Slim Quality comercializa colchões terapêuticos magnéticos via afiliados multinível. O programa tem 27 membros com planos Individual Básico (gratuito), Individual Premium (R$97/mês) e Lojista (R$97/mês). Premium e Lojista já têm infraestrutura de tenant criada automaticamente via webhook Asaas (`activateBundle()`). O BIA v2 preenche o gap representado pelo campo `whatsapp_status = 'inactive'` na tabela `multi_agent_tenants` — conecta o agente ao WhatsApp e o coloca em operação.

---

## 👥 Personas

- **Ana — Afiliada Individual Premium:** Vende colchões por indicação, não consegue responder mensagens fora do horário comercial. Quer que o agente responda por ela e avise quando precisar de atenção pessoal.
- **Carlos — Lojista:** Tem showroom físico, quer o agente para pré-qualificar clientes antes de agendar visitas presenciais.
- **Renato — Admin Slim Quality:** Gerencia a base de conhecimento global (Skills), monitora todos os tenants.

---

## 🗂️ Estrutura de Pastas

```
repositório/
├── agent/              ← agente atual (NÃO TOCAR)
├── agent_v2/           ← BIA v2 — todo o novo backend
│   ├── app/
│   │   ├── api/        ← endpoints FastAPI
│   │   ├── agents/     ← sub-agents (classificador, vendas, suporte)
│   │   ├── skills/     ← arquivos .md de conhecimento global
│   │   ├── services/   ← evolution, openai, whisper, tts, supabase
│   │   └── core/       ← config, auth, middlewares
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── requirements.txt
├── src/                ← frontend existente
│   └── pages/afiliados/dashboard/meu-agente/  ← novo menu
└── api/                ← backend serverless (NÃO TOCAR)
```
