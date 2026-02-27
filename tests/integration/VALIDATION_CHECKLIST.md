# ✅ CHECKLIST DE VALIDAÇÃO MANUAL - MONETIZAÇÃO DE AFILIADOS

## 📋 PHASE 9 - TASK 9.2: VALIDAÇÃO MANUAL

### Objetivo
Validar todas as funcionalidades implementadas no ambiente real antes de aprovar a ETAPA 5.

---

## 🔧 PRÉ-REQUISITOS

### Variáveis de Ambiente Configuradas
- [ ] `ASAAS_API_KEY` configurada no Vercel
- [ ] `ASAAS_WALLET_SLIM` configurada no Vercel
- [ ] `ASAAS_WALLET_RENUM` configurada no Vercel
- [ ] `ASAAS_WALLET_JB` configurada no Vercel
- [ ] `SUPABASE_URL` configurada no Vercel
- [ ] `SUPABASE_SERVICE_KEY` configurada no Vercel

### Produtos de Adesão Criados
- [ ] Produto "Adesão Individual" criado no painel admin
  - Categoria: `adesao_afiliado`
  - Tipo elegível: `individual`
  - Taxa de adesão: R$ 50,00 (ou valor definido)
  - Status: Ativo
- [ ] Produto "Adesão Logista" criado no painel admin
  - Categoria: `adesao_afiliado`
  - Tipo elegível: `logista`
  - Taxa de adesão: R$ 100,00 (ou valor definido)
  - Mensalidade: R$ 50,00 (ou valor definido)
  - Ciclo: Mensal
  - Status: Ativo

### Afiliados de Teste
- [ ] Afiliado Individual criado com wallet_id válida
- [ ] Afiliado Logista criado com wallet_id válida
- [ ] Rede de afiliados criada (N1 → N2 → N3) para testar comissionamento

---

## 🧪 TESTES FUNCIONAIS

### 1. CADASTRO DE AFILIADO COM PAYWALL

#### 1.1 Cadastro Individual
- [ ] Acessar `/afiliados/cadastro`
- [ ] Selecionar tipo "Individual"
- [ ] Preencher formulário completo
- [ ] Validar que Paywall aparece após cadastro
- [ ] Validar que mostra valor da taxa de adesão (R$ 50,00)
- [ ] Validar que mostra opções de pagamento (PIX, Boleto)
- [ ] Clicar em "Pagar com PIX"
- [ ] Validar que QR Code é exibido
- [ ] Validar que código Pix Copia e Cola é exibido
- [ ] Validar que link do boleto é exibido

#### 1.2 Cadastro Logista
- [ ] Acessar `/afiliados/cadastro`
- [ ] Selecionar tipo "Logista"
- [ ] Preencher formulário completo (incluindo CNPJ)
- [ ] Validar que Paywall aparece após cadastro
- [ ] Validar que mostra valor da taxa de adesão (R$ 100,00)
- [ ] Validar que mostra valor da mensalidade (R$ 50,00/mês)
- [ ] Validar que explica que primeira cobrança é imediata
- [ ] Clicar em "Pagar com Cartão"
- [ ] Validar que redireciona para página de pagamento Asaas

---

### 2. PAINEL DE PAGAMENTOS

#### 2.1 Página de Pagamentos
- [ ] Fazer login como afiliado
- [ ] Acessar `/afiliados/dashboard/pagamentos`
- [ ] Validar que página carrega sem erros
- [ ] Validar que mostra status do pagamento atual
- [ ] Validar que mostra histórico de pagamentos
- [ ] Validar que mostra próximo vencimento (se houver assinatura)

#### 2.2 Banner de Inadimplência
- [ ] Simular pagamento em atraso (alterar status no banco para `overdue`)
- [ ] Validar que banner vermelho aparece no topo do dashboard
- [ ] Validar que mensagem de inadimplência é clara
- [ ] Validar que link para página de pagamentos funciona
- [ ] Validar que vitrine de Logista é desativada automaticamente

#### 2.3 Histórico de Pagamentos
- [ ] Validar que lista todos os pagamentos do afiliado
- [ ] Validar que mostra tipo (Taxa de Adesão / Mensalidade)
- [ ] Validar que mostra valor
- [ ] Validar que mostra status (Pendente / Pago / Vencido)
- [ ] Validar que mostra data de vencimento
- [ ] Validar que mostra data de pagamento (se pago)
- [ ] Clicar em "Ver Comprovante" (se pago)
- [ ] Validar que comprovante é exibido

---

### 3. WEBHOOK ASAAS

#### 3.1 Pagamento Confirmado (PAYMENT_CONFIRMED)
- [ ] Fazer pagamento de teste via Asaas Sandbox
- [ ] Aguardar webhook ser recebido
- [ ] Validar que evento foi registrado em `subscription_webhook_events`
- [ ] Validar que evento foi processado (`processed = true`)
- [ ] Validar que status do pagamento foi atualizado para `paid` em `affiliate_payments`
- [ ] Validar que `payment_status` do afiliado foi atualizado para `active`
- [ ] Validar que notificação foi criada em `notifications`
- [ ] Validar que comissões foram calculadas e salvas em `commissions`

#### 3.2 Pagamento Vencido (PAYMENT_OVERDUE)
- [ ] Simular pagamento vencido via Asaas Sandbox
- [ ] Aguardar webhook ser recebido
- [ ] Validar que evento foi registrado em `subscription_webhook_events`
- [ ] Validar que evento foi processado (`processed = true`)
- [ ] Validar que status do pagamento foi atualizado para `overdue` em `affiliate_payments`
- [ ] Validar que `payment_status` do afiliado foi atualizado para `overdue`
- [ ] Validar que vitrine de Logista foi desativada (se aplicável)
- [ ] Validar que notificação de inadimplência foi criada

---

### 4. COMISSIONAMENTO

#### 4.1 Cálculo de Comissões - Rede Completa (N1+N2+N3)
- [ ] Criar rede de afiliados: N3 → N2 → N1
- [ ] Todos com `payment_status = 'active'` e `wallet_id` válida
- [ ] Fazer pagamento de taxa de adesão para N1
- [ ] Aguardar webhook processar
- [ ] Validar que 3 comissões foram criadas em `commissions`:
  - [ ] N1: 15% do valor (level = 1)
  - [ ] N2: 3% do valor (level = 2)
  - [ ] N3: 2% do valor (level = 3)
- [ ] Validar que `calculation_details` contém informações corretas
- [ ] Validar que `status = 'pending'`

#### 4.2 Cálculo de Comissões - Rede Parcial (apenas N1)
- [ ] Criar afiliado N1 sem `referred_by`
- [ ] N1 com `payment_status = 'active'` e `wallet_id` válida
- [ ] Fazer pagamento de taxa de adesão para N1
- [ ] Aguardar webhook processar
- [ ] Validar que apenas 1 comissão foi criada:
  - [ ] N1: 15% do valor (level = 1)
- [ ] Validar que redistribuição foi aplicada (5% não utilizados vão para Renum/JB)

#### 4.3 Cálculo de Comissões - Afiliado Inativo
- [ ] Criar rede: N2 (inativo) → N1 (ativo)
- [ ] N2 com `payment_status = 'pending'` ou sem `wallet_id`
- [ ] Fazer pagamento de taxa de adesão para N1
- [ ] Aguardar webhook processar
- [ ] Validar que apenas 1 comissão foi criada (N1)
- [ ] Validar que N2 NÃO recebeu comissão (inativo)
- [ ] Validar que redistribuição foi aplicada

---

### 5. SPLIT AUTOMÁTICO VIA ASAAS

#### 5.1 Split na Criação do Pagamento
- [ ] Criar rede de afiliados: N3 → N2 → N1
- [ ] Todos com `payment_status = 'active'` e `wallet_id` válida
- [ ] Criar cobrança de taxa de adesão para N1
- [ ] Validar no Asaas Dashboard que split foi configurado:
  - [ ] Slim: 10%
  - [ ] N1: 15%
  - [ ] N2: 3%
  - [ ] N3: 2%
  - [ ] Renum: 5%
  - [ ] JB: 5%
  - [ ] Total: 100%

#### 5.2 Split com Afiliado Inativo
- [ ] Criar rede: N2 (inativo) → N1 (ativo)
- [ ] Criar cobrança de taxa de adesão para N1
- [ ] Validar no Asaas Dashboard que split foi configurado:
  - [ ] Slim: 10%
  - [ ] N1: 15%
  - [ ] N2: NÃO aparece (inativo)
  - [ ] Renum: 6,5% (5% + 1,5% redistribuído)
  - [ ] JB: 6,5% (5% + 1,5% redistribuído)
  - [ ] Total: 100%

---

### 6. NOTIFICAÇÕES

#### 6.1 Notificações no Painel
- [ ] Fazer login como afiliado
- [ ] Validar que sino de notificações aparece no header
- [ ] Validar que badge mostra contador de não lidas
- [ ] Clicar no sino
- [ ] Validar que dropdown abre com lista de notificações
- [ ] Validar que notificações mais recentes aparecem primeiro
- [ ] Clicar em uma notificação
- [ ] Validar que marca como lida
- [ ] Validar que contador diminui
- [ ] Validar que link da notificação funciona

#### 6.2 Tipos de Notificações
- [ ] Pagamento Confirmado:
  - [ ] Título: "Pagamento confirmado!"
  - [ ] Mensagem: "Seu pagamento de R$ X foi confirmado com sucesso."
  - [ ] Link: `/afiliados/dashboard/pagamentos`
- [ ] Pagamento Vencido:
  - [ ] Título: "Pagamento em atraso"
  - [ ] Mensagem: "Seu pagamento de R$ X está em atraso há X dias..."
  - [ ] Link: `/afiliados/dashboard/pagamentos`

#### 6.3 Polling Automático
- [ ] Deixar painel aberto por 30 segundos
- [ ] Criar notificação manualmente no banco
- [ ] Validar que notificação aparece automaticamente (polling)
- [ ] Validar que contador é atualizado

---

### 7. VITRINE DE LOGISTAS

#### 7.1 Ativação de Vitrine com Assinatura Ativa
- [ ] Fazer login como Logista
- [ ] Acessar `/afiliados/dashboard/loja`
- [ ] Validar que switch "Aparecer na Vitrine" está disponível
- [ ] Ativar switch
- [ ] Validar que modal de confirmação aparece
- [ ] Validar que explica sobre mensalidade
- [ ] Confirmar ativação
- [ ] Validar que assinatura é criada automaticamente
- [ ] Validar que vitrine é ativada
- [ ] Acessar `/vitrine` (público)
- [ ] Validar que loja do Logista aparece

#### 7.2 Bloqueio de Vitrine por Inadimplência
- [ ] Simular inadimplência (status `overdue`)
- [ ] Validar que vitrine é desativada automaticamente
- [ ] Acessar `/vitrine` (público)
- [ ] Validar que loja do Logista NÃO aparece
- [ ] Fazer login como Logista
- [ ] Validar que banner de inadimplência aparece
- [ ] Regularizar pagamento
- [ ] Validar que vitrine é reativada automaticamente

---

### 8. CANCELAMENTO DE ASSINATURA

#### 8.1 Cancelamento pelo Logista
- [ ] Fazer login como Logista
- [ ] Acessar `/afiliados/dashboard/pagamentos`
- [ ] Clicar em "Cancelar Assinatura"
- [ ] Validar que modal de confirmação aparece
- [ ] Confirmar cancelamento
- [ ] Validar que assinatura é cancelada no Asaas
- [ ] Validar que status é atualizado para `cancelled` no banco
- [ ] Validar que switch "Aparecer na Vitrine" é desativado
- [ ] Validar que vitrine é desativada

---

## 🔍 VALIDAÇÕES TÉCNICAS

### 9. BANCO DE DADOS

#### 9.1 Tabela `affiliate_payments`
- [ ] Validar que registros são criados corretamente
- [ ] Validar que `asaas_payment_id` é preenchido
- [ ] Validar que `asaas_subscription_id` é preenchido (Logista)
- [ ] Validar que `status` é atualizado corretamente
- [ ] Validar que `paid_at` é preenchido quando pago
- [ ] Validar que políticas RLS funcionam

#### 9.2 Tabela `commissions`
- [ ] Validar que comissões são criadas corretamente
- [ ] Validar que `level` está correto (1, 2, 3)
- [ ] Validar que `percentage` está correto
- [ ] Validar que `commission_value_cents` está correto
- [ ] Validar que `calculation_details` contém informações completas

#### 9.3 Tabela `notifications`
- [ ] Validar que notificações são criadas automaticamente
- [ ] Validar que `type` está correto
- [ ] Validar que `read` é atualizado ao clicar
- [ ] Validar que políticas RLS funcionam

#### 9.4 Tabela `subscription_webhook_events`
- [ ] Validar que eventos são registrados
- [ ] Validar que `processed` é atualizado
- [ ] Validar que `processing_time_ms` é registrado
- [ ] Validar que `error_message` é preenchido em caso de erro

---

## 🚀 VALIDAÇÕES DE DEPLOY

### 10. EDGE FUNCTIONS

#### 10.1 `process-affiliate-webhooks`
- [ ] Validar que função está deployada (versão 6)
- [ ] Validar que logs aparecem no Supabase Dashboard
- [ ] Validar que não há erros de runtime
- [ ] Validar que processamento é rápido (< 5 segundos)

### 11. SERVERLESS FUNCTIONS

#### 11.1 `api/subscriptions/create-payment.js`
- [ ] Validar que função está deployada no Vercel
- [ ] Validar que todas as actions funcionam
- [ ] Validar que logs aparecem no Vercel Dashboard
- [ ] Validar que não há erros de runtime

#### 11.2 `api/notifications.js`
- [ ] Validar que função está deployada no Vercel
- [ ] Validar que todas as actions funcionam
- [ ] Validar que logs aparecem no Vercel Dashboard

---

## 📊 MÉTRICAS DE SUCESSO

### Critérios de Aprovação
- [ ] Todos os testes funcionais passaram
- [ ] Todos os testes técnicos passaram
- [ ] Nenhum erro crítico encontrado
- [ ] Performance aceitável (< 5s para processar webhook)
- [ ] UX validada e aprovada
- [ ] Documentação completa

### Bugs Conhecidos (se houver)
- [ ] Nenhum bug crítico
- [ ] Bugs menores documentados e priorizados

---

## ✅ APROVAÇÃO FINAL

- [ ] Todos os itens do checklist foram validados
- [ ] Testes de integração passaram
- [ ] Validação manual concluída
- [ ] Documentação atualizada
- [ ] Deploy em produção validado

**Aprovado por:** ___________________  
**Data:** ___/___/______  
**Observações:** ___________________

---

**ESTE CHECKLIST DEVE SER PREENCHIDO ANTES DE APROVAR A ETAPA 5!**
