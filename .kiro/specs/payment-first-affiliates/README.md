# Payment First + Tratamento de Afiliados Existentes

## Visão Geral

Esta spec implementa duas frentes paralelas para resolver problemas críticos do sistema de afiliados:

**FRENTE A:** Tratamento dos 30 afiliados já cadastrados
**FRENTE B:** Implementação do fluxo Payment First para novos cadastros

## Contexto

### Situação Atual

O sistema possui 30 afiliados cadastrados:
- **11 afiliados** com `wallet_id` configurado (prontos para ativar)
- **19 afiliados** sem `wallet_id` (precisam configurar até 31/03/2026)
- **4 afiliados** de teste (devem ser deletados)

### Problema

1. Afiliados de teste poluindo o banco
2. Afiliados com wallet_id não têm acesso total liberado
3. Afiliados sem wallet_id não foram notificados sobre prazo
4. Novo cadastro cria conta antes do pagamento (risco de fraude)

## Solução

### FRENTE A - Afiliados Existentes

#### A1. Deleção de Afiliados de Teste
- Deletar 4 afiliados de teste: n1teste@example.com, n2teste@example.com, n3teste@example.com, logistates@example.com
- Delete em cascata respeitando foreign keys

#### A2. Liberar Acesso Total
- Atualizar 11 afiliados com wallet_id para `status = 'active'` e `payment_status = 'active'`
- Garantir acesso total ao sistema

#### A3. Sistema de Notificações Automáticas
- Usar Supabase Scheduled Jobs (pg_cron)
- **Job 1:** Lembrete 7 dias antes (24/03/2026 09:00 BRT)
- **Job 2:** Lembrete 3 dias antes (28/03/2026 09:00 BRT)
- **Job 3:** Lembrete final 1 dia antes (30/03/2026 09:00 BRT)
- **Job 4:** Bloqueio automático (31/03/2026 00:00 BRT)
- **Job 5:** Verificação diária de desbloqueio (todo dia 00:05 BRT)

### FRENTE B - Payment First

#### Fluxo Completo

```
Formulário → Validação → Pagamento Asaas → Polling confirmação → 
Webhook cria conta Supabase + affiliates → Login automático → Dashboard
```

#### Componentes Principais

1. **Validação Prévia** (`api/affiliates.js`)
   - Valida CPF/CNPJ, email, duplicatas
   - Cria sessão temporária (30 min)
   - Retorna token de sessão

2. **Criação de Pagamento** (`api/subscriptions/create-payment.js`)
   - Busca produto de adesão
   - Cria customer no Asaas
   - Gera QR code PIX ou link de cartão
   - `externalReference: affiliate_pre_{uuid}`

3. **Webhook Handler** (`api/webhook-assinaturas.js`)
   - Processa `affiliate_pre_` prefix
   - Cria usuário no Supabase Auth
   - Cria registro em affiliates
   - Calcula e registra comissões

4. **Frontend** (`AfiliadosCadastro.tsx` + `PaywallCadastro.tsx`)
   - Coleta senha (permanece em memória)
   - Exibe paywall após validação
   - Polling a cada 5s para verificar criação da conta
   - Redireciona automaticamente após sucesso

## Arquivos Modificados

### Backend
- `api/affiliates.js` - Nova action `payment-first-validate`
- `api/subscriptions/create-payment.js` - Nova action `create-affiliate-membership`
- `api/webhook-assinaturas.js` - Handler para `affiliate_pre_` prefix

### Frontend
- `src/pages/afiliados/AfiliadosCadastro.tsx` - Atualizado com campos de senha e paywall
- `src/components/PaywallCadastro.tsx` - NOVO componente
- `src/services/frontend/affiliate.service.ts` - Novo método `paymentFirstValidate`
- `src/services/frontend/subscription.service.ts` - Novo método `createAffiliateMembership`

### Database
- Nova tabela: `payment_sessions`
- Nova função: `cleanup_expired_sessions()`
- 5 scheduled jobs (pg_cron)

## Segurança

### Senha
- Permanece em memória no frontend (state do React)
- Nunca vai para localStorage ou sessionStorage
- Criptografada com bcrypt antes de armazenar na sessão temporária
- Webhook usa senha criptografada para criar conta Supabase

### Sessão
- Token UUID v4 (aleatório e único)
- Expira automaticamente após 30 minutos
- Deletada após criação da conta
- Limpeza diária de sessões expiradas

### Pagamento
- Validação de assinatura de webhooks Asaas
- HTTPS para todas as transações
- Logs de auditoria para todas as operações

## Deployment

### Ordem de Execução

1. **FRENTE A primeiro** (menor risco, impacto imediato)
   - Executar scripts SQL via Supabase Power
   - Verificar com queries de confirmação
   - Monitorar jobs agendados

2. **FRENTE B depois** (maior complexidade, requer testes completos)
   - Deploy migrations
   - Deploy backend
   - Deploy webhook
   - Deploy frontend
   - Testar fluxo completo

### Rollback

**FRENTE A:**
- Reverter status de afiliados
- Desabilitar jobs agendados

**FRENTE B:**
- Reverter deploy do frontend
- Desabilitar webhook handler para `affiliate_pre_`
- Manter fluxo antigo ativo

## Testes

### Unit Tests
- Validação de CPF/CNPJ
- Criação de sessão temporária
- Processamento de webhook

### Integration Tests
- Fluxo completo de cadastro
- Comissionamento correto
- Notificações enviadas

### E2E Tests
- Cadastro → Pagamento → Login
- Polling e redirecionamento
- Cenários de erro

## Monitoramento

### Métricas
- Taxa de conversão (validação → pagamento → conta criada)
- Tempo médio de confirmação de pagamento
- Taxa de sessões expiradas
- Taxa de falhas em webhooks

### Logs
- Criação de sessões temporárias
- Webhooks processados
- Contas criadas
- Comissões calculadas
- Execução de jobs agendados

## Dependências

### Externas
- Asaas API (customers, payments)
- Supabase Auth (service_role)
- Supabase pg_cron

### Internas
- Sistema de notificações
- Sistema de comissões
- Módulo de produtos
- Validação de CPF/CNPJ

## Variáveis de Ambiente

```bash
# Asaas
ASAAS_API_KEY=sua-chave-asaas
ASAAS_WEBHOOK_TOKEN=token-do-webhook

# Supabase
SUPABASE_URL=sua-url-supabase
SUPABASE_ANON_KEY=chave-publica
SUPABASE_SERVICE_KEY=chave-privada

# Wallets (comissionamento)
ASAAS_WALLET_SLIM=wal_xxxxx
ASAAS_WALLET_RENUM=wal_xxxxx
ASAAS_WALLET_JB=wal_xxxxx
```

## Documentação

- **Design:** `design.md` - Design técnico completo
- **Tasks:** `tasks.md` - Lista de tarefas detalhada
- **README:** Este arquivo

## Status

- **Criado:** 26/02/2026
- **Status:** Draft
- **Workflow:** Design-first
- **Tipo:** Feature

## Próximos Passos

1. Revisar design document
2. Aprovar spec
3. Executar FRENTE A (afiliados existentes)
4. Executar FRENTE B (payment first)
5. Testar fluxo completo
6. Deploy em produção

