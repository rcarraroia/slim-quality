# Design Document - ETAPA 5: Monetização (Adesão e Mensalidade)

## Overview

Este documento especifica o design técnico para implementação da ETAPA 5 do sistema de diferenciação de perfis de afiliados. A solução implementa cobrança de taxa de adesão para Individuais (única) e taxa de adesão + mensalidade recorrente para Logistas, com controle automático de inadimplência que bloqueia visibilidade na vitrine.

### Objetivos

1. Cobrar taxa de adesão de todos os afiliados no cadastro (paywall)
2. Cobrar mensalidade recorrente apenas de Logistas
3. Gerenciar valores através do módulo de produtos existente
4. Processar webhooks Asaas para atualizar status
5. Controlar inadimplência com bloqueio automático de vitrine
6. Enviar notificações de pagamento
7. Exibir histórico de pagamentos
8. Integrar com sistema de comissões (10% Slim + rede + gestores)

### Escopo

**Incluído nesta ETAPA:**
- ✅ Taxa de adesão no cadastro (paywall)
- ✅ Mensalidade recorrente via Asaas
- ✅ Categoria `adesao_afiliado` no módulo de produtos
- ✅ Correção de inconsistências no ENUM de categorias
- ✅ Campos de assinatura na tabela `products`
- ✅ Webhook Asaas (reaproveitar `webhook-assinaturas.js`)
- ✅ Controle de inadimplência
- ✅ Notificações por email e painel
- ✅ Histórico de pagamentos
- ✅ Comissionamento de taxas (10% + rede + gestores)
- ✅ CNPJ obrigatório para Logistas
- ✅ Subcontas Asaas sempre com CPF
- ✅ Constraint UNIQUE no campo `document`

**Não incluído (futuro):**
- ❌ Relatórios financeiros avançados
- ❌ Outros gateways de pagamento
- ❌ Sistema de cupons
- ❌ Parcelamento
- ❌ Painel admin de configuração de valores (valores vêm do módulo de produtos)


## Architecture

### System Context

**Frontend:** React/Vite + TypeScript
**Backend:** Vercel Serverless Functions (JavaScript/ESM)
**Database:** Supabase PostgreSQL
**Payment Gateway:** Asaas API
**Notifications:** Email service

### Architectural Decisions

**AD-1: Asaas Assinaturas para Mensalidade**
- Decisão: Usar recurso de assinaturas recorrentes do Asaas
- Razão: Cobrança automática, sem necessidade de cron jobs
- Impacto: Simplifica implementação, reduz complexidade
- Nota: Requer criação de customer no Asaas antes da assinatura
- Nota: Primeira cobrança é imediata (sem carência)

**AD-2: Webhook para Atualização de Status**
- Decisão: Reaproveitar `webhook-assinaturas.js` existente
- Razão: Atualização em tempo real, menor carga no servidor
- Impacto: Requer validação de assinatura e processamento de eventos

**AD-3: Bloqueio Automático de Vitrine**
- Decisão: Bloquear vitrine automaticamente quando inadimplente
- Razão: Garante que apenas adimplentes aparecem na vitrine
- Impacto: Logista precisa regularizar para desbloquear

**AD-4: Valores via Módulo de Produtos**
- Decisão: Armazenar valores em tabela `products` com categoria `adesao_afiliado`
- Razão: Flexibilidade para ajustar preços sem deploy, reaproveita módulo existente
- Impacto: Admin gerencia valores via módulo de produtos

**AD-5: Comissionamento de Taxas**
- Decisão: Taxas são receitas comissionáveis (10% Slim + rede + gestores)
- Razão: Incentiva indicação de novos afiliados
- Impacto: Integração com sistema de comissões existente (`commission-calculator.service.ts`)

**AD-6: Subcontas Asaas com CPF**
- Decisão: Criar subcontas Asaas sempre com CPF (nunca CNPJ)
- Razão: Simplifica integração e evita problemas com validação
- Impacto: Logistas fornecem CNPJ para cadastro mas subconta usa CPF

**AD-7: CNPJ Obrigatório para Logistas**
- Decisão: Validar CNPJ matematicamente no cadastro de Logistas
- Razão: Garantir dados corretos para emissão de notas fiscais
- Impacto: Reaproveita validação existente em `document-utils.ts`

**AD-8: Constraint UNIQUE no Campo Document**
- Decisão: Adicionar constraint UNIQUE no campo `document` da tabela `affiliates`
- Razão: Prevenir duplicação de CPF/CNPJ no nível do banco
- Impacto: Proteção contra race conditions e inserções diretas


## Components and Interfaces

### Database Schema

#### Tabela `affiliate_payments`

```sql
CREATE TABLE affiliate_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  payment_type TEXT NOT NULL CHECK (payment_type IN ('membership_fee', 'monthly_subscription')),
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  asaas_payment_id TEXT UNIQUE,
  asaas_subscription_id TEXT,
  due_date DATE NOT NULL,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_affiliate_payments_affiliate ON affiliate_payments(affiliate_id);
CREATE INDEX idx_affiliate_payments_status ON affiliate_payments(status);
CREATE INDEX idx_affiliate_payments_due_date ON affiliate_payments(due_date);
```

#### Atualizar ENUM `product_category`

```sql
-- Adicionar nova categoria
ALTER TYPE product_category ADD VALUE IF NOT EXISTS 'adesao_afiliado';

-- Corrigir inconsistências existentes
ALTER TYPE product_category ADD VALUE IF NOT EXISTS 'pillow';
ALTER TYPE product_category ADD VALUE IF NOT EXISTS 'accessory';
```

#### Adicionar campos em `products`

```sql
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS entry_fee_cents INTEGER CHECK (entry_fee_cents >= 0),
ADD COLUMN IF NOT EXISTS monthly_fee_cents INTEGER CHECK (monthly_fee_cents >= 0),
ADD COLUMN IF NOT EXISTS has_entry_fee BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS billing_cycle VARCHAR(20) DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'quarterly', 'yearly')),
ADD COLUMN IF NOT EXISTS eligible_affiliate_type VARCHAR(20) CHECK (eligible_affiliate_type IN ('individual', 'logista', 'ambos'));

COMMENT ON COLUMN products.entry_fee_cents IS 'Valor da taxa de adesão em centavos';
COMMENT ON COLUMN products.monthly_fee_cents IS 'Valor da mensalidade recorrente em centavos';
COMMENT ON COLUMN products.has_entry_fee IS 'Se cobra taxa de entrada';
COMMENT ON COLUMN products.billing_cycle IS 'Ciclo de recorrência (monthly, quarterly, yearly)';
COMMENT ON COLUMN products.eligible_affiliate_type IS 'Tipo de afiliado elegível (individual, logista, ambos)';
```

#### Adicionar campos em `affiliates`

```sql
ALTER TABLE affiliates 
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'active' CHECK (payment_status IN ('active', 'overdue', 'suspended')),
ADD COLUMN IF NOT EXISTS asaas_customer_id TEXT UNIQUE;

CREATE INDEX idx_affiliates_payment_status ON affiliates(payment_status);
CREATE INDEX idx_affiliates_asaas_customer ON affiliates(asaas_customer_id);

COMMENT ON COLUMN affiliates.payment_status IS 'Status de pagamento (active, overdue, suspended)';
COMMENT ON COLUMN affiliates.asaas_customer_id IS 'ID do customer no Asaas';
```

#### Adicionar constraint UNIQUE no campo `document`

```sql
-- Adicionar constraint UNIQUE (considera soft delete)
ALTER TABLE affiliates 
ADD CONSTRAINT affiliates_document_unique 
UNIQUE (document) 
WHERE (document IS NOT NULL AND deleted_at IS NULL);

-- Substituir índice HASH por índice UNIQUE
DROP INDEX IF EXISTS idx_affiliates_document_hash;

CREATE UNIQUE INDEX idx_affiliates_document_unique 
ON affiliates(document) 
WHERE (document IS NOT NULL AND deleted_at IS NULL);

COMMENT ON CONSTRAINT affiliates_document_unique ON affiliates IS 'Garante unicidade de CPF/CNPJ (considera soft delete)';
```

### API Endpoints

#### Serverless Function: `api/subscriptions/create-payment.js` (NOVO)

**Actions:**
1. **create-membership-payment** - Criar cobrança de adesão (paywall)
2. **create-subscription** - Criar assinatura mensal (Logista)
3. **cancel-subscription** - Cancelar assinatura
4. **get-history** - Obter histórico de pagamentos
5. **get-receipt** - Obter comprovante

#### Webhook: `api/webhook-assinaturas.js` (REAPROVEITAR EXISTENTE)

**Eventos processados:**
- `PAYMENT_CONFIRMED` - Pagamento confirmado (pago em dia)
- `PAYMENT_OVERDUE` - Pagamento vencido (não pago até a data de vencimento)
- `PAYMENT_RECEIVED` - Pagamento recebido (pode ser em dia ou após vencimento)
  - Verificar campo `status` no payload para distinguir:
    - `status: 'RECEIVED'` + `dueDate >= paymentDate` = Pago em dia
    - `status: 'RECEIVED'` + `dueDate < paymentDate` = Pago após vencimento (regularização)

**Ações do Webhook:**
- Atualizar status em `affiliate_payments`
- Atualizar `payment_status` em `affiliates`
- Bloquear/desbloquear vitrine conforme status
- Enviar notificações por email
- Registrar logs detalhados

### Frontend Components

#### 1. Produtos.tsx (ATUALIZAR EXISTENTE)

**Localização:** `src/pages/dashboard/Produtos.tsx`

**Funcionalidades a adicionar:**
- Adicionar categoria `adesao_afiliado` ao Select
- Adicionar categorias faltantes: `servico_digital`, `show_row`
- Corrigir categorias: adicionar `pillow`, `accessory` ao Select
- Adicionar lógica condicional para categoria `adesao_afiliado`:
  - Ocultar campos físicos (dimensões, peso, etc.)
  - Exibir campos específicos: `entry_fee_cents`, `monthly_fee_cents`, `has_entry_fee`, `billing_cycle`, `eligible_affiliate_type`
  - Seguir padrão da lógica `isDigital` já implementada

#### 2. Pagamentos.tsx (CRIAR NOVO)

**Localização:** `src/pages/afiliados/dashboard/Pagamentos.tsx`

**Funcionalidades:**
- Visualizar histórico de pagamentos
- Filtrar por tipo e status
- Baixar comprovantes
- Ver próxima cobrança

#### 3. PaymentBanner.tsx (CRIAR NOVO)

**Localização:** `src/components/PaymentBanner.tsx`

**Funcionalidades:**
- Exibir banner de inadimplência
- Link para regularizar
- Fechar banner temporariamente

#### 4. PaywallCadastro.tsx (CRIAR NOVO)

**Localização:** `src/components/PaywallCadastro.tsx`

**Funcionalidades:**
- Exibir tela de pagamento após cadastro
- Buscar valor do produto de adesão
- Opções de pagamento (PIX/Cartão)
- Aguardar confirmação via webhook
- Liberar acesso ao painel


## Correctness Properties

### Property 1: Membership Fee Enforcement

*For any* novo afiliado, o cadastro só deve ser concluído após confirmação de pagamento da taxa de adesão.

**Validates: Requirements 1.5, 1.8, 1.10**

### Property 2: Subscription Control

*For any* Logista, a assinatura deve ser criada ao ativar switch de vitrine e cancelada ao desativar.

**Validates: Requirements 2.5, 2.6**

### Property 3: Automatic Suspension

*For any* Logista inadimplente, o switch "Aparecer na Vitrine" deve ser desativado automaticamente.

**Validates: Requirements 5.1, 5.2**

### Property 4: Payment Status Sync

*For any* webhook recebido, o status de pagamento deve ser atualizado corretamente no banco.

**Validates: Requirements 4.4, 4.5, 4.6**

### Property 5: Commission Integration

*For any* taxa ou mensalidade paga, comissões devem ser calculadas e aplicadas conforme regras definidas.

**Validates: Requirements 8.4, 8.6, 8.7**


## Error Handling

### Payment Errors

#### 1. Pagamento Recusado

**Scenario:** Cartão recusado ou PIX não pago

**Handling:**
- Exibir mensagem clara do motivo
- Permitir tentar novamente
- Oferecer método alternativo
- Registrar tentativa em logs

#### 2. Webhook Falhou

**Scenario:** Webhook Asaas não foi recebido

**Handling:**
- Retry automático (3 tentativas)
- Verificação periódica manual (batch diário)
- Alertas para admin
- Logs detalhados

### Subscription Errors

#### 1. Falha ao Criar Assinatura

**Scenario:** API Asaas retorna erro

**Handling:**
- Exibir erro ao Logista
- Não ativar switch de vitrine
- Registrar erro em logs
- Permitir tentar novamente

#### 2. Falha ao Cancelar Assinatura

**Scenario:** API Asaas não cancela

**Handling:**
- Retry automático
- Marcar para cancelamento manual
- Alertar admin
- Não cobrar próxima mensalidade


## Testing Strategy

### Property-Based Testing

**Library:** Vitest

**Property Tests to Implement:**

#### 1. Membership Fee Property

```typescript
describe('Membership Fee', () => {
  test('cadastro só completa após pagamento', async () => {
    const affiliate = await createTestAffiliate({ payment_status: 'pending' });
    expect(affiliate.can_access_panel).toBe(false);
    
    await confirmPayment(affiliate.id);
    const updated = await getAffiliate(affiliate.id);
    expect(updated.can_access_panel).toBe(true);
  });
});
```

#### 2. Automatic Suspension Property

```typescript
describe('Automatic Suspension', () => {
  test('inadimplência desativa switch automaticamente', async () => {
    const logista = await createTestLogista({ is_visible_in_showcase: true });
    
    await markAsOverdue(logista.id);
    
    const profile = await getStoreProfile(logista.id);
    expect(profile.is_visible_in_showcase).toBe(false);
  });
});
```


## Implementation Plan

### Phase 1: Database (Priority: CRITICAL)

**Tasks:**
1. Criar migration para tabela `affiliate_payments`
2. Adicionar categoria `adesao_afiliado` ao ENUM `product_category`
3. Corrigir inconsistências no ENUM (pillow, accessory)
4. Adicionar campos de assinatura na tabela `products`
5. Adicionar campos `payment_status` e `asaas_customer_id` em `affiliates`
6. Adicionar constraint UNIQUE no campo `document`
7. Substituir índice HASH por índice UNIQUE no campo `document`
8. Criar índices necessários

**Deliverables:**
- ✅ Tabelas criadas
- ✅ ENUM atualizado
- ✅ Campos adicionados
- ✅ Constraint UNIQUE criado
- ✅ Índices criados

### Phase 2: Módulo de Produtos (Priority: HIGH)

**Tasks:**
1. Atualizar formulário de produtos
2. Adicionar categoria `adesao_afiliado` ao Select
3. Adicionar categorias faltantes ao Select (servico_digital, show_row)
4. Implementar lógica condicional para categoria `adesao_afiliado`
5. Criar produtos de adesão (Individual e Logista)

**Deliverables:**
- ✅ Formulário atualizado
- ✅ Lógica condicional funcionando
- ✅ Produtos de adesão criados

### Phase 3: Backend - Payments API (Priority: HIGH)

**Tasks:**
1. Criar Serverless Function `/api/subscriptions/create-payment.js`
2. Implementar action `create-membership-payment`
3. Implementar action `create-subscription`
4. Implementar action `cancel-subscription`
5. Implementar action `get-history`
6. Implementar action `get-receipt`
7. Implementar integração com Asaas

**Deliverables:**
- ✅ API funcionando
- ✅ Integração Asaas funcionando

### Phase 4: Backend - Webhook (Priority: HIGH)

**Tasks:**
1. Atualizar `webhook-assinaturas.js` existente
2. Implementar processamento de eventos de pagamento
3. Implementar bloqueio/desbloqueio de vitrine
4. Implementar retry automático

**Deliverables:**
- ✅ Webhook funcionando
- ✅ Eventos processados corretamente

### Phase 5: Frontend - Paywall (Priority: HIGH)

**Tasks:**
1. Criar componente PaywallCadastro
2. Integrar no fluxo de cadastro
3. Implementar opções de pagamento
4. Aguardar confirmação via webhook

**Deliverables:**
- ✅ Paywall funcionando
- ✅ Cadastro bloqueado até pagamento

### Phase 6: Frontend - Painel Afiliado (Priority: MEDIUM)

**Tasks:**
1. Criar página Pagamentos
2. Implementar histórico
3. Criar componente PaymentBanner
4. Implementar notificações

**Deliverables:**
- ✅ Histórico funcionando
- ✅ Banner de inadimplência funcionando

### Phase 7: Comissionamento (Priority: HIGH)

**Tasks:**
1. Integrar com `commission-calculator.service.ts`
2. Implementar cálculo de comissões (10% + rede + gestores)
3. Implementar redistribuição para inadimplentes
4. Aplicar split via Asaas

**Deliverables:**
- ✅ Comissionamento funcionando
- ✅ Split aplicado corretamente

### Phase 8: Testing & Validation (Priority: HIGH)

**Tasks:**
1. Testes de integração
2. Testes E2E
3. Validar comissionamento

**Deliverables:**
- ✅ Testes passando
- ✅ Cobertura > 70%


## Security Considerations

### Payment Security

- Validar assinatura de webhooks
- Usar HTTPS para todas as transações
- Não armazenar dados de cartão
- Validar valores antes de processar

### Access Control

- Apenas admin pode alterar valores
- Apenas afiliado pode ver próprio histórico
- Webhook endpoint com rate limiting
- Logs de auditoria para alterações

### Data Protection

- Backup de dados financeiros
- Criptografia de dados sensíveis
- Logs estruturados sem dados sensíveis
- Compliance com LGPD


## Deployment Strategy

### Deployment Order

1. **Backend First:** Deploy migrations e APIs
2. **Webhook Second:** Deploy webhook handler
3. **Frontend Third:** Deploy painéis
4. **Verification:** Testar fluxos completos

### Rollback Plan

- Reverter deploy do frontend se necessário
- Desabilitar webhook temporariamente
- Processar pagamentos manualmente
- Backend é backward compatible
