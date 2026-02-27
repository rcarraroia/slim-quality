# Tasks Document - ETAPA 5: Monetização (Adesão e Mensalidade)

## Metadata

**Spec Name:** etapa-5-monetizacao  
**Version:** 2.0.0  
**Status:** draft  
**Created:** 2026-02-25  
**Updated:** 2026-02-26  
**Dependencies:** 
- ETAPA 1 concluída (campo `affiliate_type` existente)
- ETAPA 3 concluída (campo `show_row` e diferenciação de perfil)
- ETAPA 4 concluída (vitrine pública de logistas funcionando)
- Integração com Asaas API configurada
- Validação de CPF/CNPJ implementada (`document-utils.ts`)
- Sistema de comissões existente (`commission-calculator.service.ts`)

## Task Breakdown

### Phase 1: Database - Migrations e Estrutura

#### Task 1.1: Migration - Atualizar ENUM product_category

**Description:** Adicionar categoria `adesao_afiliado` e corrigir inconsistências existentes no ENUM.

**Acceptance Criteria:**
- Criar arquivo `supabase/migrations/YYYYMMDDHHMMSS_update_product_category_enum.sql`
- Adicionar categoria `adesao_afiliado` ao ENUM `product_category`
- Adicionar categorias `pillow` e `accessory` (existem no frontend mas não no banco)
- Validar que ENUM contém: `colchao`, `ferramenta_ia`, `servico_digital`, `show_row`, `adesao_afiliado`, `pillow`, `accessory`
- Aplicar migration no Supabase via Power
- Validar que migration foi aplicada corretamente

**Implementation Notes:**
- Usar Supabase Power para executar SQL
- Usar `ALTER TYPE product_category ADD VALUE IF NOT EXISTS`
- Validar ordem dos valores no ENUM


---

#### Task 1.2: Migration - Adicionar Campos de Assinatura em products

**Description:** Adicionar campos necessários para produtos de assinatura na tabela `products`.

**Acceptance Criteria:**
- Criar arquivo `supabase/migrations/YYYYMMDDHHMMSS_add_product_subscription_fields.sql`
- Adicionar campo `entry_fee_cents INTEGER CHECK (entry_fee_cents >= 0)`
- Adicionar campo `monthly_fee_cents INTEGER CHECK (monthly_fee_cents >= 0)`
- Adicionar campo `has_entry_fee BOOLEAN DEFAULT FALSE`
- Adicionar campo `billing_cycle VARCHAR(20) DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'quarterly', 'yearly'))`
- Adicionar campo `eligible_affiliate_type VARCHAR(20) CHECK (eligible_affiliate_type IN ('individual', 'logista', 'ambos'))`
- Adicionar comentários nos campos
- Aplicar migration no Supabase via Power
- Validar que campos foram criados corretamente

**Implementation Notes:**
- Usar Supabase Power para executar SQL
- Campos são opcionais (nullable) para produtos existentes
- Validar constraints CHECK

---

#### Task 1.3: Migration - Criar Tabela affiliate_payments

**Description:** Criar tabela para registrar pagamentos de taxas e mensalidades.

**Acceptance Criteria:**
- Criar arquivo `supabase/migrations/YYYYMMDDHHMMSS_create_affiliate_payments.sql`
- Implementar tabela `affiliate_payments` com campos:
  - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
  - `affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE`
  - `payment_type TEXT NOT NULL CHECK (payment_type IN ('membership_fee', 'monthly_subscription'))`
  - `amount_cents INTEGER NOT NULL CHECK (amount_cents > 0)`
  - `status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled'))`
  - `asaas_payment_id TEXT UNIQUE`
  - `asaas_subscription_id TEXT`
  - `due_date DATE NOT NULL`
  - `paid_at TIMESTAMPTZ`
  - `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
  - `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- Criar índices: `affiliate_id`, `status`, `due_date`
- Criar trigger para atualizar `updated_at`
- Aplicar migration no Supabase via Power
- Validar que tabela foi criada corretamente

**Implementation Notes:**
- Usar Supabase Power para executar SQL
- Validar constraints (CHECK, UNIQUE, FOREIGN KEY)
- Criar índices para queries frequentes

---

#### Task 1.4: Migration - Adicionar Campos em affiliates

**Description:** Adicionar campos `payment_status` e `asaas_customer_id` na tabela `affiliates`.

**Acceptance Criteria:**
- Criar arquivo `supabase/migrations/YYYYMMDDHHMMSS_add_affiliate_payment_fields.sql`
- Adicionar campo `payment_status TEXT DEFAULT 'active' CHECK (payment_status IN ('active', 'overdue', 'suspended'))`
- Adicionar campo `asaas_customer_id TEXT UNIQUE`
- Criar índice em `payment_status`
- Criar índice em `asaas_customer_id`
- Adicionar comentários nos campos
- Aplicar migration no Supabase via Power
- Validar que campos foram criados corretamente

**Implementation Notes:**
- Usar Supabase Power para executar SQL
- Campo `payment_status` controla acesso a recursos
- Campo `asaas_customer_id` armazena ID do customer no Asaas

---

#### Task 1.5: Migration - Adicionar Constraint UNIQUE em document

**Description:** Adicionar constraint UNIQUE no campo `document` da tabela `affiliates` para prevenir duplicação de CPF/CNPJ.

**Acceptance Criteria:**
- Criar arquivo `supabase/migrations/YYYYMMDDHHMMSS_add_document_unique_constraint.sql`
- Adicionar constraint UNIQUE: `UNIQUE (document) WHERE (document IS NOT NULL AND deleted_at IS NULL)`
- Substituir índice HASH existente por índice UNIQUE
- Validar que constraint funciona corretamente
- Testar tentativa de inserção duplicada (deve falhar)
- Aplicar migration no Supabase via Power

**Implementation Notes:**
- Usar Supabase Power para executar SQL
- Constraint considera soft delete (`deleted_at IS NULL`)
- Remover índice HASH antigo: `DROP INDEX IF EXISTS idx_affiliates_document_hash`
- Criar índice UNIQUE: `CREATE UNIQUE INDEX idx_affiliates_document_unique ON affiliates(document) WHERE (document IS NOT NULL AND deleted_at IS NULL)`

---

#### Task 1.6: Criar Políticas RLS para affiliate_payments

**Description:** Criar políticas Row Level Security para controlar acesso à tabela de pagamentos.

**Acceptance Criteria:**
- Habilitar RLS em `affiliate_payments`
- Criar política para afiliados verem apenas próprios pagamentos
- Criar política para admin ver todos os pagamentos
- Validar que políticas funcionam corretamente
- Testar com diferentes usuários

**Implementation Notes:**
- Usar função `has_role('admin')` para verificar admin
- Usar `auth.uid()` para verificar afiliado
- Testar com usuário afiliado e admin


---

### Phase 2: Módulo de Produtos - Atualizar Formulário

#### Task 2.1: Atualizar Select de Categorias

**Description:** Atualizar Select de categorias no formulário de produtos para incluir todas as categorias do ENUM.

**Acceptance Criteria:**
- Modificar arquivo `src/pages/dashboard/Produtos.tsx`
- Adicionar categoria `adesao_afiliado` ao Select
- Adicionar categorias `servico_digital` e `show_row` ao Select (existem no banco mas não no frontend)
- Manter categorias existentes: `colchao`, `pillow`, `accessory`, `ferramenta_ia`
- Validar que Select exibe todas as 7 categorias
- Executar getDiagnostics para validar TypeScript

**Implementation Notes:**
- Seguir padrão existente do Select
- Usar labels amigáveis (ex: "Adesão de Afiliado" para `adesao_afiliado`)
- Manter ordem lógica das categorias

---

#### Task 2.2: Implementar Lógica Condicional para adesao_afiliado

**Description:** Adicionar lógica condicional no formulário para categoria `adesao_afiliado`.

**Acceptance Criteria:**
- Modificar arquivo `src/pages/dashboard/Produtos.tsx`
- Criar variável `isAdesaoAfiliado = formData.category === 'adesao_afiliado'`
- Quando `isAdesaoAfiliado = true`:
  - Ocultar campos físicos (dimensões, peso, estoque, etc.)
  - Exibir campos de assinatura: `entry_fee_cents`, `monthly_fee_cents`, `has_entry_fee`, `billing_cycle`, `eligible_affiliate_type`
  - Forçar `product_type = 'service'`
  - Forçar valores `null` para campos físicos
- Seguir padrão da lógica `isDigital` já implementada
- Executar getDiagnostics para validar TypeScript

**Implementation Notes:**
- Reaproveitar estrutura da lógica `isDigital`
- Usar componentes shadcn/ui para campos de assinatura
- Validar que valores são positivos
- Formatar valores em reais (R$)

---

#### Task 2.3: Criar Produtos de Adesão

**Description:** Criar produtos de adesão Individual e Logista no módulo de produtos.

**Acceptance Criteria:**
- Criar produto "Taxa de Adesão Individual":
  - `category = 'adesao_afiliado'`
  - `eligible_affiliate_type = 'individual'`
  - `has_entry_fee = true`
  - `entry_fee_cents` = Definir valor no formulário do módulo de produtos conforme configuração do negócio
  - `monthly_fee_cents = null`
  - `is_active = true`
- Criar produto "Adesão + Mensalidade Logista":
  - `category = 'adesao_afiliado'`
  - `eligible_affiliate_type = 'logista'`
  - `has_entry_fee = true`
  - `entry_fee_cents` = Definir valor no formulário do módulo de produtos conforme configuração do negócio
  - `monthly_fee_cents` = Definir valor no formulário do módulo de produtos conforme configuração do negócio
  - `billing_cycle = 'monthly'`
  - `is_active = true`
- Validar que produtos foram criados corretamente
- Testar formulário com ambos os produtos
**Implementation Notes:**
- Usar painel admin para criar produtos via interface
- Valores monetários devem ser definidos pelo admin no formulário
- A documentação não especifica valores — eles são configuração do negócio
- Validar que valores estão corretos após cadastro
- Testar edição de produtos


---

### Phase 3: Backend - API de Pagamentos

#### Task 3.1: Criar Serverless Function subscriptions/create-payment

**Description:** Criar Vercel Serverless Function para gerenciar pagamentos de adesão e assinaturas.

**Acceptance Criteria:**
- Criar arquivo `api/subscriptions/create-payment.js`
- Implementar roteamento via query parameter `action`
- Implementar action `create-membership-payment` (criar cobrança de adesão)
- Implementar action `create-subscription` (criar assinatura mensal para Logista)
- Implementar action `cancel-subscription` (cancelar assinatura)
- Implementar action `get-history` (obter histórico de pagamentos)
- Implementar action `get-receipt` (obter comprovante)
- Configurar CORS para todas as actions
- Validar autenticação para actions privadas
- Validar tipo de afiliado quando necessário
- Tratamento de erros adequado
- Logs estruturados

**Implementation Notes:**
- Seguir padrão de `api/affiliates.js`
- Usar Supabase Client para queries
- Integrar com Asaas API para cobranças
- Validar inputs com validações inline

---

#### Task 3.2: Implementar Action create-membership-payment

**Description:** Implementar action para criar cobrança de taxa de adesão (paywall).

**Acceptance Criteria:**
- Implementar action `create-membership-payment` em `api/subscriptions/create-payment.js`
- Buscar produto de adesão conforme `affiliate_type` do afiliado
- Validar que produto está ativo
- Criar customer no Asaas se não existir (POST /v3/customers)
- Salvar `asaas_customer_id` na tabela `affiliates`
- Criar cobrança via POST /v3/payments
- Payload: `customer`, `billingType`, `value`, `dueDate`
- Registrar pagamento em `affiliate_payments` com status `pending`
- Retornar dados da cobrança (QR Code PIX ou link de pagamento)
- Tratamento de erros adequado
- Logs estruturados

**Implementation Notes:**
- Endpoint Asaas: `POST https://api.asaas.com/v3/customers`
- Endpoint Asaas: `POST https://api.asaas.com/v3/payments`
- Header: `access_token: process.env.ASAAS_API_KEY`
- Validar response da API
- Usar CPF do afiliado para criar customer (nunca CNPJ)

---

#### Task 3.3: Implementar Action create-subscription

**Description:** Implementar action para criar assinatura mensal (apenas Logista).

**Acceptance Criteria:**
- Implementar action `create-subscription` em `api/subscriptions/create-payment.js`
- Validar que afiliado é Logista
- Validar que afiliado possui `asaas_customer_id`
- Se não possuir, criar customer via POST /v3/customers
- Buscar produto de adesão Logista
- Validar que produto tem `monthly_fee_cents`
- Criar assinatura via POST /v3/subscriptions
- Payload: `customer`, `billingType`, `value`, `cycle`, `nextDueDate` (data atual - sem carência)
- Registrar assinatura em `affiliate_payments`
- Retornar dados da assinatura
- Tratamento de erros adequado
- Logs estruturados

**Implementation Notes:**
- Endpoint Asaas: `POST https://api.asaas.com/v3/subscriptions`
- Header: `access_token: process.env.ASAAS_API_KEY`
- Primeira cobrança é imediata: `nextDueDate = new Date().toISOString().split('T')[0]`
- Validar response da API

---

#### Task 3.4: Implementar Action cancel-subscription

**Description:** Implementar action para cancelar assinatura mensal.

**Acceptance Criteria:**
- Implementar action `cancel-subscription` em `api/subscriptions/create-payment.js`
- Validar que afiliado é Logista
- Buscar assinatura ativa do afiliado
- Cancelar assinatura via DELETE /v3/subscriptions/{id}
- Atualizar status em `affiliate_payments` para `cancelled`
- Desativar switch "Aparecer na Vitrine"
- Retornar confirmação de cancelamento
- Tratamento de erros adequado
- Logs estruturados

**Implementation Notes:**
- Endpoint Asaas: `DELETE https://api.asaas.com/v3/subscriptions/{id}`
- Header: `access_token: process.env.ASAAS_API_KEY`
- Validar response da API

---

#### Task 3.5: Implementar Actions get-history e get-receipt

**Description:** Implementar actions para obter histórico de pagamentos e comprovantes.

**Acceptance Criteria:**
- Implementar action `get-history` em `api/subscriptions/create-payment.js`
- Buscar todos os pagamentos do afiliado em `affiliate_payments`
- Ordenar por data (mais recente primeiro)
- Permitir filtro por tipo e status
- Implementar action `get-receipt` em `api/subscriptions/create-payment.js`
- Buscar pagamento específico
- Validar que pagamento pertence ao afiliado
- Retornar dados do comprovante
- Tratamento de erros adequado
- Logs estruturados

**Implementation Notes:**
- Usar Supabase Client para queries
- Validar autenticação
- Formatar datas e valores


---

### Phase 4: Backend - Webhook Asaas

#### Task 4.1: Atualizar Webhook webhook-assinaturas.js

**Description:** Reaproveitar webhook existente para processar eventos de pagamento de adesão e mensalidades.

**Acceptance Criteria:**
- Modificar arquivo `api/webhook-assinaturas.js`
- Adicionar processamento para pagamentos de adesão (sem assinatura tradicional)
- Implementar processamento de evento `PAYMENT_CONFIRMED`
- Implementar processamento de evento `PAYMENT_OVERDUE`
- Implementar processamento de evento `PAYMENT_RECEIVED`
- Distinguir pagamento em dia vs. após vencimento usando campo `status` do payload
- Atualizar status em `affiliate_payments`
- Atualizar `payment_status` em `affiliates`
- Bloquear/desbloquear vitrine conforme status
- Enviar notificações por email
- Implementar retry automático (máximo 3 tentativas)
- Registrar logs detalhados de webhooks
- Tratamento de erros adequado

**Implementation Notes:**
- Validar assinatura usando secret do Asaas
- Usar transações do Supabase para atomicidade
- Verificar campo `status` no payload do evento PAYMENT_RECEIVED:
  - Se `status: 'RECEIVED'` e `dueDate >= paymentDate`: Pago em dia
  - Se `status: 'RECEIVED'` e `dueDate < paymentDate`: Pago após vencimento (regularização)

---

#### Task 4.2: Implementar Bloqueio Automático de Vitrine

**Description:** Implementar lógica para bloquear vitrine automaticamente quando Logista fica inadimplente.

**Acceptance Criteria:**
- Modificar webhook para detectar inadimplência
- Quando `PAYMENT_OVERDUE`, atualizar `payment_status = 'overdue'` em `affiliates`
- Desativar switch "Aparecer na Vitrine" (`is_visible_in_showcase = false`)
- Atualizar `store_profiles.is_visible_in_showcase = false`
- Registrar log de bloqueio
- Enviar email de inadimplência
- Tratamento de erros adequado

**Implementation Notes:**
- Usar transações do Supabase
- Validar que afiliado é Logista
- Manter acesso ao painel (apenas vitrine é bloqueada)

---

#### Task 4.3: Implementar Desbloqueio Automático de Vitrine

**Description:** Implementar lógica para desbloquear vitrine automaticamente quando Logista regulariza.

**Acceptance Criteria:**
- Modificar webhook para detectar regularização
- Quando `PAYMENT_RECEIVED` após vencimento, atualizar `payment_status = 'active'` em `affiliates`
- Reativar switch "Aparecer na Vitrine" (`is_visible_in_showcase = true`)
- Atualizar `store_profiles.is_visible_in_showcase = true`
- Registrar log de desbloqueio
- Enviar email de regularização
- Tratamento de erros adequado

**Implementation Notes:**
- Usar transações do Supabase
- Validar que afiliado é Logista
- Verificar campo `status` no payload

---

#### Task 4.4: Implementar Fallback de Verificação Manual

**Description:** Implementar verificação periódica manual de pagamentos como fallback para webhooks.

**Acceptance Criteria:**
- Criar função batch para verificar pagamentos pendentes
- Verificar pagamentos com `due_date` vencida
- Consultar status na API Asaas
- Atualizar status conforme resposta
- Marcar como inadimplente se necessário
- Enviar alertas para admin se webhook falhou consistentemente
- Registrar logs de verificação

**Implementation Notes:**
- Pode ser implementado como Supabase Edge Function ou cron job
- Executar diariamente (ex: 6h da manhã)
- Processar em lotes de 50 pagamentos por vez


---

### Phase 5: Frontend - Paywall no Cadastro

#### Task 5.1: Criar Componente PaywallCadastro.tsx

**Description:** Criar componente de paywall para cobrança de taxa de adesão no cadastro.

**Acceptance Criteria:**
- Criar arquivo `src/components/PaywallCadastro.tsx`
- Exibir tela de pagamento após preencher formulário de cadastro
- Buscar valor do produto de adesão conforme `affiliate_type`
- Exibir valor da taxa de adesão
- Implementar opção de pagamento via PIX
- Implementar opção de pagamento via Cartão
- Exibir QR Code PIX (se PIX selecionado)
- Exibir formulário de cartão (se Cartão selecionado)
- Aguardar confirmação de pagamento (polling ou webhook)
- Exibir loading state durante processamento
- Liberar acesso ao painel após confirmação
- Exibir feedback visual (toasts, loading states)
- Seguir design system (shadcn/ui)
- Responsivo (mobile, tablet, desktop)

**Implementation Notes:**
- Usar componentes shadcn/ui (Card, Button, Dialog)
- Integrar com `api/subscriptions/create-payment.js`
- Usar polling a cada 5 segundos para verificar status
- Timeout de 15 minutos para pagamento

---

#### Task 5.2: Integrar Paywall no Fluxo de Cadastro

**Description:** Integrar componente PaywallCadastro no fluxo de cadastro de afiliados.

**Acceptance Criteria:**
- Modificar página de cadastro de afiliados
- Após preencher formulário, exibir PaywallCadastro
- Bloquear conclusão do cadastro até confirmação de pagamento
- Criar registro em `affiliates` com `payment_status = 'pending'`
- Após confirmação, atualizar `payment_status = 'active'`
- Liberar acesso ao painel
- Redirecionar para dashboard do afiliado
- Exibir mensagem de boas-vindas
- Tratamento de erros adequado

**Implementation Notes:**
- Usar estado para controlar fluxo
- Validar que formulário está completo antes de exibir paywall
- Registrar logs de cadastro

---

#### Task 5.3: Implementar Validação de CNPJ para Logistas

**Description:** Implementar validação obrigatória de CNPJ no cadastro de Logistas.

**Acceptance Criteria:**
- Modificar formulário de cadastro
- Quando `affiliate_type = 'logista'`, campo CNPJ é obrigatório
- Validar CNPJ matematicamente usando `document-utils.ts`
- Exibir erro se CNPJ inválido
- Bloquear envio do formulário se CNPJ inválido
- Salvar CNPJ no campo `document` da tabela `affiliates`
- Validar que CNPJ não está duplicado (constraint UNIQUE)
- Tratamento de erros adequado

**Implementation Notes:**
- Reaproveitar validação existente em `src/utils/document-utils.ts`
- Usar componente Input do shadcn/ui
- Formatar CNPJ com máscara (XX.XXX.XXX/XXXX-XX)


---

### Phase 6: Frontend - Painel Afiliado

#### Task 6.1: Criar Página Pagamentos.tsx

**Description:** Criar página de histórico de pagamentos no painel do afiliado.

**Acceptance Criteria:**
- Criar arquivo `src/pages/afiliados/dashboard/Pagamentos.tsx`
- Implementar lista de todos os pagamentos do afiliado
- Exibir: data, tipo (adesão/mensalidade), valor, status
- Implementar filtro por tipo (adesão, mensalidade, todos)
- Implementar filtro por status (pendente, pago, vencido, cancelado, todos)
- Implementar ordenação por data (mais recente primeiro)
- Implementar botão "Baixar Comprovante" (quando pago)
- Exibir próxima cobrança (se houver assinatura ativa)
- Exibir total pago no período
- Implementar loading state
- Implementar empty state
- Seguir design system (shadcn/ui)
- Responsivo (mobile, tablet, desktop)

**Implementation Notes:**
- Usar componentes shadcn/ui (Card, Table, Select, Button, Badge)
- Usar react-table ou implementar tabela customizada
- Formatar datas com date-fns
- Formatar valores em reais (R$)

---

#### Task 6.2: Criar Componente PaymentBanner.tsx

**Description:** Criar componente de banner para exibir inadimplência no painel do afiliado.

**Acceptance Criteria:**
- Criar arquivo `src/components/PaymentBanner.tsx`
- Exibir banner vermelho quando `payment_status='overdue'`
- Exibir mensagem clara sobre inadimplência
- Exibir link para página de pagamentos
- Implementar botão "Regularizar Pagamento"
- Implementar botão "Fechar" (temporário, reaparece no próximo login)
- Seguir design system (shadcn/ui)
- Responsivo

**Implementation Notes:**
- Usar componentes shadcn/ui (Alert, Button)
- Usar variáveis CSS para cores (destructive)
- Usar ícone AlertCircle do lucide-react

---

#### Task 6.3: Integrar Banner no Layout do Afiliado

**Description:** Integrar componente PaymentBanner no layout do painel do afiliado.

**Acceptance Criteria:**
- Importar PaymentBanner em `AffiliateDashboardLayout.tsx`
- Exibir banner no topo do conteúdo (abaixo do header)
- Banner deve aparecer apenas quando `payment_status='overdue'`
- Banner deve ser visível em todas as páginas do painel
- Testar exibição e ocultação do banner

**Implementation Notes:**
- Verificar `payment_status` do afiliado logado
- Usar estado para controlar visibilidade
- Atualizar estado ao fechar banner

---

#### Task 6.4: Adicionar Rota no Painel Afiliado

**Description:** Adicionar item no menu lateral do painel afiliado e configurar rota para página de pagamentos.

**Acceptance Criteria:**
- Adicionar item "Pagamentos" no menu lateral do painel afiliado
- Item deve aparecer para todos os afiliados
- Configurar rota `/afiliados/dashboard/pagamentos` em `src/App.tsx`
- Usar ícone apropriado (CreditCard ou Receipt)
- Testar navegação via menu
- Testar navegação via URL direta

**Implementation Notes:**
- Modificar `src/layouts/AffiliateDashboardLayout.tsx`
- Seguir padrão de outros itens do menu

---

#### Task 6.5: Implementar Mensalidade ao Ativar Vitrine

**Description:** Integrar criação de assinatura mensal ao ativar switch "Aparecer na Vitrine".

**Acceptance Criteria:**
- Modificar página PerfilLoja.tsx
- Ao ativar switch "Aparecer na Vitrine", verificar se há assinatura ativa
- Verificar se afiliado possui `asaas_customer_id`
- Se não possuir, criar customer via action `create-asaas-customer`
- Criar assinatura via action `create-subscription`
- Exibir modal de confirmação antes de criar assinatura
- Exibir valor da mensalidade (buscar do produto)
- Exibir data da primeira cobrança (imediatamente - sem carência)
- Registrar assinatura em `affiliate_payments`
- Ao desativar switch, cancelar assinatura via action `cancel-subscription`
- Exibir modal de confirmação antes de cancelar
- Exibir feedback visual (toasts, loading states)
- Seguir design system (shadcn/ui)

**Implementation Notes:**
- Usar componentes shadcn/ui (Dialog, Button)
- Integrar com `api/subscriptions/create-payment.js`
- Validar que perfil está completo antes de permitir ativação
- Primeira cobrança é imediata (nextDueDate = hoje)


---

### Phase 7: Notificações

#### Task 7.1: Implementar Serviço de Email

**Description:** Implementar serviço para envio de emails de notificação.

**Acceptance Criteria:**
- Criar arquivo `src/services/email.service.ts` (ou adicionar em backend)
- Implementar método `sendPaymentReminder(affiliate, daysUntilDue)`
- Implementar método `sendPaymentConfirmation(affiliate, payment)`
- Implementar método `sendOverdueNotification(affiliate, payment)`
- Implementar método `sendRegularizationConfirmation(affiliate)`
- Integrar com serviço de email (ex: SendGrid, Resend, AWS SES)
- Usar templates HTML para emails
- Incluir links diretos para painel de pagamentos
- Tratamento de erros adequado
- Logs de envio

**Implementation Notes:**
- Usar biblioteca do serviço de email escolhido
- Criar templates HTML responsivos
- Incluir variáveis dinâmicas (nome, valor, data)

---

#### Task 7.2: Implementar Notificações no Painel

**Description:** Implementar sistema de notificações persistentes no painel do afiliado.

**Acceptance Criteria:**
- Criar tabela `notifications` no banco (se não existir)
- Criar componente NotificationBell.tsx
- Exibir badge com número de notificações não lidas
- Implementar dropdown com lista de notificações
- Marcar notificação como lida ao clicar
- Criar notificação ao receber webhook de pagamento
- Criar notificação 7 dias antes do vencimento
- Criar notificação no dia do vencimento
- Criar notificação de inadimplência
- Criar notificação de regularização
- Seguir design system (shadcn/ui)

**Implementation Notes:**
- Usar componentes shadcn/ui (Popover, Badge, Button)
- Usar ícone Bell do lucide-react
- Implementar polling ou WebSocket para atualização em tempo real


---

### Phase 8: Comissionamento

#### Task 8.1: Integrar com Sistema de Comissões

**Description:** Integrar taxas de adesão e mensalidades com sistema de comissões existente.

**Acceptance Criteria:**
- Identificar origem da indicação ao criar afiliado
- Registrar `referred_by` em `affiliates`
- Ao confirmar pagamento de taxa de adesão, calcular comissões
- Ao confirmar pagamento de mensalidade, calcular comissões
- Aplicar regras de comissionamento:
  - 10% fixo Slim Quality
  - N1 = 15%, N2 = 3%, N3 = 2% (se existirem na rede)
  - Restante dos 90% após pagar rede → Renum e JB 50/50
- Reaproveitar lógica de redistribuição de `commission-calculator.service.ts`
- Quando afiliado inadimplente/suspenso, redistribuir comissão para Renum e JB
- Aplicar split automático via Asaas
- Registrar comissões na tabela `commissions`
- Exibir comissões no painel do afiliado
- Registrar logs de cálculo de comissões
- Validar que soma de comissões não excede valor do pagamento

**Implementation Notes:**
- Integrar com `src/services/affiliates/commission-calculator.service.ts`
- Usar Asaas Split API para distribuir valores
- Validar que total de comissões = 100% do valor
- Considerar status financeiro do afiliado (`financial_status`)

---

#### Task 8.2: Implementar Split Automático via Asaas

**Description:** Implementar split automático de comissões via Asaas API.

**Acceptance Criteria:**
- Criar função para aplicar split no Asaas
- Buscar wallet IDs de todos os participantes
- Validar que todas as wallets existem
- Montar payload de split conforme regras de comissionamento
- Enviar requisição POST /v3/payments/{id}/split
- Validar response da API
- Registrar split aplicado
- Tratamento de erros adequado
- Logs estruturados

**Implementation Notes:**
- Endpoint Asaas: `POST https://api.asaas.com/v3/payments/{id}/split`
- Header: `access_token: process.env.ASAAS_API_KEY`
- Payload: array de splits com `walletId` e `percentualValue`
- Validar que soma de percentuais = 100%


---

### Phase 9: Testing & Validation

#### Task 9.1: Testes de Integração

**Description:** Criar testes de integração para funcionalidades principais.

**Acceptance Criteria:**
- Testar criação de pagamento de taxa de adesão
- Testar criação de assinatura mensal
- Testar cancelamento de assinatura
- Testar processamento de webhook `PAYMENT_CONFIRMED`
- Testar processamento de webhook `PAYMENT_OVERDUE`
- Testar processamento de webhook `PAYMENT_RECEIVED`
- Testar suspensão automática de vitrine
- Testar regularização de inadimplência
- Testar envio de notificações
- Testar cálculo de comissões
- Todos os testes passando
- Cobertura > 70%

**Implementation Notes:**
- Usar Vitest
- Mockar Asaas API
- Mockar serviço de email
- Usar banco de dados de teste

---

#### Task 9.2: Testes End-to-End

**Description:** Criar testes E2E para fluxos completos.

**Acceptance Criteria:**
- Testar fluxo completo de cadastro com taxa de adesão
- Testar fluxo completo de ativação de vitrine com mensalidade
- Testar fluxo completo de inadimplência e suspensão
- Testar fluxo completo de regularização
- Testar fluxo completo de visualização de histórico
- Testar responsividade em diferentes dispositivos
- Todos os testes passando

**Implementation Notes:**
- Usar Playwright ou Cypress
- Testar em Chrome, Firefox e Safari
- Testar em mobile, tablet e desktop
- Usar ambiente de sandbox do Asaas

---

### Phase 10: Documentation & Deployment

#### Task 10.1: Atualizar Documentação

**Description:** Atualizar documentação do projeto com informações da ETAPA 5.

**Acceptance Criteria:**
- Documentar sistema de monetização
- Documentar taxa de adesão e mensalidade
- Documentar webhook Asaas
- Documentar controle de inadimplência
- Documentar notificações
- Documentar comissionamento de taxas
- Adicionar diagramas de fluxo (opcional)
- Atualizar README.md se necessário

**Implementation Notes:**
- Criar ou atualizar `docs/MONETIZATION.md`
- Incluir exemplos de uso
- Incluir troubleshooting

---

#### Task 10.2: Deploy e Validação

**Description:** Fazer deploy das alterações e validar em produção.

**Acceptance Criteria:**
- Verificar que todas as tasks anteriores estão concluídas
- Executar todos os testes (unit, integration, E2E)
- Verificar que não há erros de TypeScript/ESLint
- Fazer commit e push para repositório
- Aguardar deploy automático do Vercel
- Aplicar migrations no Supabase de produção
- Configurar webhook Asaas em produção
- Validar em produção:
  - Testar cadastro com taxa de adesão
  - Testar criação de assinatura
  - Testar webhook Asaas
  - Testar inadimplência
  - Verificar logs de erro
- Monitorar por 48 horas
- Validar que comissionamento está funcionando

**Implementation Notes:**
- Usar ambiente de sandbox do Asaas para testes iniciais
- Migrar para produção Asaas após validação
- Configurar alertas para erros críticos


---

## Task Summary

**Total Tasks:** 35 tasks organizadas em 10 fases

**By Phase:**
- Phase 1 (Database): 6 tasks
- Phase 2 (Módulo de Produtos): 3 tasks
- Phase 3 (Backend - Payments API): 5 tasks
- Phase 4 (Backend - Webhook): 4 tasks
- Phase 5 (Frontend - Paywall): 3 tasks
- Phase 6 (Frontend - Painel Afiliado): 5 tasks
- Phase 7 (Notificações): 2 tasks
- Phase 8 (Comissionamento): 2 tasks
- Phase 9 (Testing): 2 tasks
- Phase 10 (Documentation & Deployment): 2 tasks

**Critical Path:**
1. Phase 1 (Database) → DEVE ser concluída primeiro
2. Phase 2 (Módulo de Produtos) → Depende de Phase 1
3. Phase 3 (Backend - Payments) → Depende de Phases 1 e 2
4. Phase 4 (Backend - Webhook) → Depende de Phase 3
5. Phase 5 (Frontend - Paywall) → Depende de Phases 3 e 4
6. Phase 6 (Frontend - Painel) → Depende de Phases 3 e 4
7. Phase 7 (Notificações) → Depende de Phase 4
8. Phase 8 (Comissionamento) → Depende de Phases 3 e 4
9. Phase 9 (Testing) → Depende de todas as anteriores
10. Phase 10 (Deployment) → É a última fase

**Dependencies:**
- Tasks 2.x dependem de Tasks 1.x (banco deve existir)
- Tasks 3.x dependem de Tasks 1.x e 2.x (banco e produtos devem existir)
- Tasks 4.x dependem de Tasks 3.x (API de pagamentos deve existir)
- Tasks 5.x dependem de Tasks 3.x e 4.x (API e webhook devem existir)
- Tasks 6.x dependem de Tasks 3.x e 4.x (API e webhook devem existir)
- Tasks 7.x dependem de Tasks 4.x (webhook deve existir)
- Tasks 8.x dependem de Tasks 3.x e 4.x (API e webhook devem existir)
- Tasks 9.x dependem de todas as anteriores
- Tasks 10.x dependem de todas as anteriores

## Notes

- Todas as tasks devem seguir padrões do AGENTS.md
- Sempre consultar design-system.md antes de criar UI
- Sempre usar Supabase Power para análise de banco
- Sempre validar com getDiagnostics após modificações
- Nunca comentar código para fazer build passar
- Sempre corrigir problemas, não contorná-los
- **CRÍTICO:** Usar ambiente de sandbox do Asaas para testes antes de produção
- **CRÍTICO:** Validar assinatura de webhooks para segurança
- **CRÍTICO:** Implementar retry automático para webhooks
- **CRÍTICO:** Implementar fallback de verificação manual
- **CRÍTICO:** Criar customer no Asaas (POST /v3/customers) ANTES de criar assinatura
- **CRÍTICO:** Primeira cobrança da mensalidade é imediata (nextDueDate = data atual)
- **CRÍTICO:** Distinguir pagamento em dia vs. após vencimento pelo campo `status` no payload do evento PAYMENT_RECEIVED
- **CRÍTICO:** Valores gerenciados via módulo de produtos (não via system_settings)
- **CRÍTICO:** CNPJ obrigatório para Logistas no cadastro
- **CRÍTICO:** Subcontas Asaas sempre criadas com CPF (nunca CNPJ)
- **CRÍTICO:** Constraint UNIQUE no campo `document` para prevenir duplicação
- **CRÍTICO:** Reaproveitar lógica de redistribuição de `commission-calculator.service.ts`
- **CRÍTICO:** Comissionamento fixo: 10% Slim + N1(15%) + N2(3%) + N3(2%) + restante para Renum/JB 50/50

## Ordem de Implementação Recomendada

1. **Primeiro**: Banco de dados (Phase 1)
   - Migrations de ENUM, products, affiliate_payments, affiliates, document constraint
   - Políticas RLS

2. **Segundo**: Módulo de produtos (Phase 2)
   - Atualizar formulário
   - Criar produtos de adesão

3. **Terceiro**: Backend - API (Phase 3)
   - Criar endpoint `/api/subscriptions/create-payment.js`
   - Implementar actions de pagamento

4. **Quarto**: Backend - Webhook (Phase 4)
   - Atualizar `webhook-assinaturas.js`
   - Implementar bloqueio/desbloqueio de vitrine

5. **Quinto**: Frontend - Paywall (Phase 5)
   - Criar componente PaywallCadastro
   - Integrar no cadastro
   - Validação de CNPJ

6. **Sexto**: Frontend - Painel (Phase 6)
   - Criar página Pagamentos
   - Criar banner de inadimplência
   - Integrar mensalidade na vitrine

7. **Sétimo**: Notificações (Phase 7)
   - Implementar serviço de email
   - Implementar notificações no painel

8. **Oitavo**: Comissionamento (Phase 8)
   - Integrar com sistema existente
   - Implementar split automático

9. **Nono**: Testes (Phase 9)
   - Testes de integração
   - Testes E2E

10. **Décimo**: Deploy (Phase 10)
    - Documentação
    - Deploy e validação

