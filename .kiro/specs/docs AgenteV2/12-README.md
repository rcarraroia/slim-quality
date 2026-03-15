# BIA v2 — Agente Multi-Tenant Slim Quality

> Agente de atendimento WhatsApp com IA para afiliados Premium e Lojistas da Slim Quality. Atendimento 24/7 com sub-agents especializados, memória adaptativa por tenant e suporte nativo a áudio.

---

## 📦 Pacote de Documentação

**12 documentos** | Modo: Novo Projeto | Data: 14/03/2026

---

## 📖 Ordem de Leitura para o Kiro

| # | Documento | Descrição |
|---|-----------|-----------|
| 1 | `01-STEERING.md` ⭐ | **COMECE AQUI** — contexto master, decisões arquiteturais, o que NÃO fazer |
| 2 | `02-SUMARIO-EXECUTIVO.md` | Proposta de valor, personas, custos, ROI |
| 3 | `03-PRD.md` | Requisitos funcionais por prioridade, critérios de aceite |
| 4 | `04-ARQUITETURA-BACKEND.md` | Stack, estrutura de pastas, pipeline do agente, auth, deploy |
| 5 | `05-ARQUITETURA-FRONTEND.md` | Modificações no src/, menu Meu Agente, serviço de comunicação |
| 6 | `06-MODELO-DE-DADOS.md` | Schema SQL completo, RLS, relacionamentos, migrations |
| 7 | `07-ENDPOINTS-API.md` | Todos os endpoints, Pydantic models, request/response |
| 8 | `08-INTEGRACOES.md` | Evolution API, OpenAI, Supabase, Redis, Asaas |
| 9 | `09-FLUXOS-USUARIO.md` | 7 fluxos completos com diagramas de sequência |
| 10 | `10-ESPECIFICACAO-TELAS.md` | 9 telas especificadas com componentes, estados e navegação |
| 11 | `11-DESIGN-SYSTEM.md` | Tokens novos, componentes específicos do módulo, padrões |
| 12 | `12-README.md` | Este arquivo — índice e instruções |

---

## 🚀 Como usar no Kiro

1. Crie a pasta `.kiro/docs/bia-v2/` no repositório
2. Cole todos os 12 documentos nessa pasta
3. No primeiro prompt do Kiro, escreva:

```
Leia todos os documentos em `.kiro/docs/bia-v2/` começando pelo 
01-STEERING.md antes de qualquer implementação. Não escreva nenhum 
código antes de confirmar que leu todos os documentos.
```

---

## 🏗️ Resumo Técnico

**Backend novo:** `agent_v2/` — FastAPI + Python 3.11
**Frontend:** modificações em `src/` — novo menu "Meu Agente"
**Banco:** novas tabelas `bia_*` no Supabase existente
**IA:** gpt-4o-mini + Whisper + TTS (OpenAI)
**WhatsApp:** Evolution API — 1 instância por afiliado
**Deploy:** Docker + EasyPanel (substitui `agent/`)

---

## ⚡ Decisões Críticas (não negociáveis)

- **Arquitetura:** Skills + Sub-agents + Napkin (não LangGraph/SICC)
- **Código do `agent/`:** referência apenas, zero reaproveitamento
- **Custeio de LLM:** Slim Quality centraliza, afiliado não vê custo
- **Áudio:** Whisper + TTS obrigatório — espelha o cliente por padrão
- **Ativação:** herda do `activateBundle()` existente — não modificar
- **Fora do MVP:** CRM Kanban, Handoff Chatwoot, SICC, multi-provider LLM

---

## 📊 Estado Atual do Banco (referência)

| Tabela | Registros | Relevância |
|--------|-----------|------------|
| `affiliates` | 27 | Fonte de `has_subscription` e `affiliate_type` |
| `multi_agent_tenants` | 2 | Tenants já criados pelo sistema existente |
| `multi_agent_subscriptions` | 2 | Assinaturas ativas |
| `bia_*` | 0 | Todas as tabelas novas do BIA v2 (criar via migration) |

---

## ✅ Checklist Pré-Implementação

- [ ] Migrations `bia_*` executadas no Supabase
- [ ] `.env` configurado com todas as variáveis (ver `08-INTEGRACOES.md`)
- [ ] `EVOLUTION_WEBHOOK_TOKEN` gerado e configurado
- [ ] `SUPABASE_JWT_SECRET` extraído do painel Supabase
- [ ] Porta do `agent_v2` definida no EasyPanel (sem conflito com `agent/`)
- [ ] URL pública do webhook acessível: `https://agent.slimquality.com.br/webhooks/evolution/*`

---

## 🔗 Próximos Passos após Documentação

1. **Kiro analisa** todos os 12 docs e valida contra o repositório/banco atual
2. **Spec completa** gerada: `requirements.md` + `design.md` + `tasks.md`
3. **Validação conjunta** Renato + Claude — sem código antes da aprovação
4. **Execução** task por task pelo Kiro, sem estimativas de tempo

---

**Versão:** 2.0.0
**Status:** Documentação completa — aguardando validação antes de implementação
**Gerado em:** 14/03/2026
