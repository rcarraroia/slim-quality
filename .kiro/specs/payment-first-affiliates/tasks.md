# Tasks - Payment First + Tratamento de Afiliados Existentes

## FRENTE A - Afiliados Existentes

### Phase A1: Deleção de Afiliados de Teste
- [x] A1.1 Verificar dependências em outras tabelas (commissions, affiliate_payments, affiliate_network, store_profiles)
- [x] A1.2 Executar script de deleção em cascata via Supabase Power
- [x] A1.3 Confirmar deleção com queries de verificação
- [x] A1.4 Registrar logs de auditoria

### Phase A2: Liberar Acesso Total
- [x] A2.1 Executar query de verificação (ANTES) - listar 11 afiliados com wallet_id
- [x] A2.2 Atualizar status e payment_status para 'active'
- [x] A2.3 Executar query de verificação (DEPOIS) - confirmar atualização
- [x] A2.4 Gerar relatório de verificação

### Phase A3: Sistema de Notificações
- [ ]* A3.1 Criar tabela `payment_sessions` via migration (IGNORADO - pertence à Frente B)
- [x] A3.2 Criar função `cleanup_expired_sessions()`
- [x] A3.3 Habilitar extensão pg_cron
- [x] A3.4 Criar Job 1: Lembrete 7 dias antes (24/03/2026 12:00 UTC)
- [x] A3.5 Criar Job 2: Lembrete 3 dias antes (28/03/2026 12:00 UTC)
- [x] A3.6 Criar Job 3: Lembrete final 1 dia antes (30/03/2026 12:00 UTC)
- [x] A3.7 Criar Job 4: Bloqueio automático (31/03/2026 03:00 UTC)
- [x] A3.8 Criar Job 5: Verificação diária de desbloqueio (todo dia 03:05 UTC)
- [x] A3.9 Verificar jobs criados com query
- [x] A3.10 Testar execução manual (se possível)

---

## FRENTE B - Payment First

### Phase B1: Database
- [x] B1.1 Criar migration para tabela `payment_sessions`
- [x] B1.2 Criar função `cleanup_expired_sessions()`
- [x] B1.3 Criar índices (session_token, expires_at)
- [x] B1.4 Aplicar migration via Supabase Power
- [x] B1.5 Verificar estrutura criada

### Phase B2: Backend - Validação Prévia
- [x] B2.1 Atualizar `api/affiliates.js`
- [x] B2.2 Implementar action `payment-first-validate`
- [x] B2.3 Implementar validação de CPF/CNPJ (reutilizar lógica existente)
- [x] B2.4 Implementar verificação de duplicatas (email, document)
- [x] B2.5 Implementar validação de referral_code
- [x] B2.6 Implementar criptografia de senha (bcrypt)
- [x] B2.7 Implementar criação de sessão temporária
- [ ] B2.8 Testar endpoint com Postman/Thunder Client
- [x] B2.9 Validar getDiagnostics (0 erros)

### Phase B3: Backend - Criação de Pagamento
- [x] B3.1 Atualizar `api/subscriptions/create-payment.js`
- [x] B3.2 Implementar action `create-affiliate-membership`
- [x] B3.3 Implementar busca de sessão temporária
- [x] B3.4 Implementar busca de produto de adesão
- [x] B3.5 Implementar criação de customer no Asaas
- [x] B3.6 Implementar criação de pagamento no Asaas
- [x] B3.7 Implementar geração de externalReference (`affiliate_pre_`)
- [ ] B3.8 Testar endpoint com Postman/Thunder Client
- [x] B3.9 Validar getDiagnostics (0 erros)

### Phase B4: Backend - Webhook Handler
- [x] B4.1 Atualizar `api/webhook-assinaturas.js`
- [x] B4.2 Implementar roteamento para `affiliate_pre_` prefix
- [x] B4.3 Implementar função `handlePreRegistrationPayment`
- [x] B4.4 Implementar busca de sessão temporária
- [x] B4.5 Implementar criação de usuário Supabase Auth (service_role)
- [x] B4.6 Implementar geração de referral_code único
- [x] B4.7 Implementar criação de registro em affiliates
- [x] B4.8 Implementar criação de rede genealógica (se houver referral_code)
- [x] B4.9 Implementar registro em affiliate_payments
- [x] B4.10 Implementar cálculo e registro de comissões
- [x] B4.11 Implementar deleção de sessão temporária
- [x] B4.12 Implementar envio de notificação de boas-vindas
- [ ] B4.13 Testar webhook com payload simulado
- [x] B4.14 Validar getDiagnostics (0 erros)

### Phase B5: Frontend - Atualização do Cadastro
- [x] B5.1 Atualizar `src/pages/afiliados/AfiliadosCadastro.tsx`
- [x] B5.2 Adicionar campos de senha e confirmação
- [x] B5.3 Adicionar validação de senhas (mínimo 8 caracteres, iguais)
- [x] B5.4 Implementar chamada para `paymentFirstValidate`
- [x] B5.5 Implementar armazenamento de session_token em state
- [x] B5.6 Implementar exibição condicional de PaywallCadastro
- [x] B5.7 Implementar botão de voltar do paywall
- [x] B5.8 Testar fluxo de validação
- [x] B5.9 Validar getDiagnostics (0 erros)

### Phase B6: Frontend - Componente Paywall
- [x] B6.1 Criar `src/components/PaywallCadastro.tsx`
- [x] B6.2 Implementar busca de produto de adesão
- [x] B6.3 Implementar seleção de método de pagamento (PIX/Cartão)
- [x] B6.4 Implementar criação de pagamento
- [x] B6.5 Implementar exibição de QR code PIX
- [x] B6.6 Implementar botão de copiar código PIX
- [x] B6.7 Implementar link para pagamento com cartão
- [x] B6.8 Implementar polling de confirmação (5s)
- [x] B6.9 Implementar tentativa de autenticação no polling
- [x] B6.10 Implementar redirecionamento automático após sucesso
- [x] B6.11 Implementar timeout de 15 minutos
- [x] B6.12 Implementar tratamento de erros
- [x] B6.13 Testar componente isoladamente
- [x] B6.14 Validar getDiagnostics (0 erros)

### Phase B7: Services - Frontend
- [x] B7.1 Atualizar `src/services/frontend/affiliate.service.ts`
- [x] B7.2 Adicionar método `paymentFirstValidate`
- [x] B7.3 Atualizar `src/services/frontend/subscription.service.ts`
- [x] B7.4 Adicionar método `createAffiliateMembership`
- [x] B7.5 Testar services isoladamente
- [x] B7.6 Validar getDiagnostics (0 erros)

### Phase B8: Testing & Validation
- [x] B8.1 Criar testes unitários para validação prévia
- [x] B8.2 Criar testes unitários para webhook handler
- [x] B8.3 Criar testes de integração para fluxo completo
- [x] B8.4 Executar testes com `npm run test` (32/32 testes passaram - 100%)
- [⏳] B8.5 Validar cobertura > 70% (PENDENTE - Validação em produção)
- [⏳] B8.6 Testar fluxo E2E em ambiente de desenvolvimento (PENDENTE - Validação em produção)
- [⏳] B8.7 Validar comissionamento correto (PENDENTE - Validação em produção)
- [⏳] B8.8 Testar cenários de erro (PENDENTE - Validação em produção)

---

## Deployment

### Pre-Deployment
- [ ] D1 Revisar todas as tasks concluídas
- [ ] D2 Executar build local sem erros
- [ ] D3 Validar variáveis de ambiente no Vercel
- [ ] D4 Criar backup do banco de dados

### Deployment FRENTE A
- [ ] D5 Executar scripts SQL via Supabase Power (A1, A2, A3)
- [ ] D6 Verificar jobs agendados criados
- [ ] D7 Monitorar logs de execução

### Deployment FRENTE B
- [ ] D8 Deploy migrations (payment_sessions)
- [ ] D9 Deploy backend (APIs atualizadas)
- [ ] D10 Deploy webhook handler
- [ ] D11 Deploy frontend (componentes atualizados)
- [ ] D12 Testar fluxo completo em produção
- [ ] D13 Monitorar logs de webhooks

### Post-Deployment
- [ ] D14 Validar que afiliados com wallet_id têm acesso total
- [ ] D15 Validar que jobs agendados estão executando
- [ ] D16 Testar cadastro de novo afiliado com Payment First
- [ ] D17 Validar comissionamento em produção
- [ ] D18 Gerar relatório de deployment

---

## Checklist de Validação Final

### FRENTE A
- [ ] V1 4 afiliados de teste deletados
- [ ] V2 11 afiliados com wallet_id têm status = 'active' e payment_status = 'active'
- [ ] V3 5 jobs agendados criados e funcionando
- [ ] V4 Notificações sendo enviadas corretamente

### FRENTE B
- [ ] V5 Tabela payment_sessions criada
- [ ] V6 Endpoint de validação funcionando
- [ ] V7 Endpoint de criação de pagamento funcionando
- [ ] V8 Webhook processando pagamentos de pré-cadastro
- [ ] V9 Contas sendo criadas após pagamento confirmado
- [ ] V10 Polling funcionando e redirecionando automaticamente
- [ ] V11 Comissões sendo calculadas corretamente
- [ ] V12 Fluxo completo E2E funcionando

