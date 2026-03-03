# Design Document - Modelo de 3 Planos com Vitrine e Agente IA

## Introduction

Este documento detalha o design técnico para implementação do novo modelo de 3 planos no sistema Slim Quality, permitindo que afiliados individuais optem por ter vitrine pública e agente IA mediante pagamento de mensalidade recorrente.

**Modelo de 3 Planos:**
1. **Individual SEM Mensalidade** (atual): Apenas adesão, sem vitrine, sem agente IA, programa de afiliados normal
2. **Individual COM Mensalidade** (NOVO): Adesão + mensalidade → Vitrine + Agente IA (sem Show Room)
3. **Logista** (inalterado): Adesão + mensalidade → Vitrine + Agente IA + Show Room (exclusivo)

**Princípios de Design:**
- Alterações pontuais e isoladas (baixo risco)
- Zero impacto em logistas existentes
- Reutilização máxima de código existente
- Valores dinâmicos (configuráveis via admin)
- Agente IA incluso em planos com mensalidade
- Campo `has_subscription` indica se afiliado paga mensalidade

## Architecture Overview

### Current Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    SLIM QUALITY SYSTEM                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐      ┌──────────────┐                     │
│  │   Frontend   │      │   Backend    │                     │
│  │  React/Vite  │◄────►│  Serverless  │                     │
│  │              │      │  Functions   │                     │
│  └──────────────┘      └──────────────┘                     │
│         │                      │                             │
│         │                      │                             │
│         ▼                      ▼                             │
│  ┌──────────────────────────────────────┐                   │
│  │         Supabase PostgreSQL          │                   │
│  │  ┌────────────┐  ┌────────────────┐ │                   │
│  │  │ affiliates │  │ store_profiles │ │                   │
│  │  │ (logistas) │  │ (logistas)     │ │                   │
│  │  └────────────┘  └────────────────┘ │                   │
│  │  ┌──────────────────────────────┐   │                   │
│  │  │  multi_agent_tenants         │   │                   │
│  │  │  (logistas)                  │   │                   │
│  │  └──────────────────────────────┘   │                   │
│  └──────────────────────────────────────┘                   │
│                      │                                       │
│                      │                                       │
│                      ▼                                       │
│  ┌──────────────────────────────────────┐                   │
│  │      Webhook Asaas (Payment)         │                   │
│  │  ┌────────────────────────────────┐  │                   │
│  │  │  detectBundlePayment()         │  │                   │
│  │  │  activateTenantAndVitrine()    │  │                   │
│  │  └────────────────────────────────┘  │                   │
│  └──────────────────────────────────────┘                   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Target Architecture (After Changes)

```
┌─────────────────────────────────────────────────────────────┐
│                    SLIM QUALITY SYSTEM                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐      ┌──────────────┐                     │
│  │   Frontend   │      │   Backend    │                     │
│  │  React/Vite  │◄────►│  Serverless  │                     │
│  │              │      │  Functions   │                     │
│  │  ✅ Checkbox │      │              │                     │
│  │  Cadastro    │      │              │                     │
│  │  ✅ Upgrade  │      │              │                     │
│  │  Page        │      │              │                     │
│  └──────────────┘      └──────────────┘                     │
│         │                      │                             │
│         │                      │                             │
│         ▼                      ▼                             │
│  ┌──────────────────────────────────────┐                   │
│  │         Supabase PostgreSQL          │                   │
│  │  ┌────────────┐  ┌────────────────┐ │                   │
│  │  │ affiliates │  │ store_profiles │ │                   │
│  │  │ ✅ has_    │  │ (individuais + │ │                   │
│  │  │ subscription│  │  logistas)     │ │                   │
│  │  └────────────┘  └────────────────┘ │                   │
│  │  ┌──────────────────────────────┐   │                   │
│  │  │  multi_agent_tenants         │   │                   │
│  │  │  ✅ For has_subscription=true│   │                   │
│  │  └──────────────────────────────┘   │                   │
│  └──────────────────────────────────────┘                   │
│                      │                                       │
│                      │                                       │
│                      ▼                                       │
│  ┌──────────────────────────────────────┐                   │
│  │      Webhook Asaas (Payment)         │                   │
│  │  ┌────────────────────────────────┐  │                   │
│  │  │  detectBundlePayment()         │  │                   │
│  │  │  ✅ Check has_subscription     │  │                   │
│  │  │  activateBundle()              │  │                   │
│  │  │  ✅ is_visible_in_showcase     │  │                   │
│  │  └────────────────────────────────┘  │                   │
│  └──────────────────────────────────────┘                   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```


## Component Design

### 1. Database Layer

#### 1.1 RLS Policies Update

**File:** `supabase/migrations/20260303000000_enable_vitrine_for_individuals.sql`

**Current State:**
```sql
CREATE POLICY "Logistas can view own profile"
  ON store_profiles FOR SELECT
  USING (
    affiliate_id IN (
      SELECT id FROM affiliates 
      WHERE user_id = auth.uid() 
      AND affiliate_type = 'logista'  -- ❌ ONLY LOGISTAS
      AND deleted_at IS NULL
    )
  );
```

**Target State:**
```sql
CREATE POLICY "Affiliates can view own profile"
  ON store_profiles FOR SELECT
  USING (
    affiliate_id IN (
      SELECT id FROM affiliates 
      WHERE user_id = auth.uid() 
      AND affiliate_type IN ('individual', 'logista')  -- ✅ BOTH TYPES
      AND has_subscription = true  -- ✅ ONLY WITH SUBSCRIPTION
      AND deleted_at IS NULL
    )
  );
```

**Changes Required:**
1. DROP existing policies (SELECT, INSERT, UPDATE)
2. CREATE new policies with IN ('individual', 'logista')
3. ADD condition `has_subscription = true`
4. Rename policies from "Logistas..." to "Affiliates..."
5. Keep DELETE policy unchanged (admin only)

**Risk:** 🟢 LOW - Only policy updates, no schema changes

---

#### 1.2 Tabela Affiliates - Campo has_subscription

**Migration:** `supabase/migrations/20260303000001_add_has_subscription.sql`

**Schema Changes:**
```sql
-- Add has_subscription field
ALTER TABLE affiliates 
ADD COLUMN has_subscription BOOLEAN DEFAULT false;

-- Update existing logistas (already have subscription)
UPDATE affiliates 
SET has_subscription = true 
WHERE affiliate_type = 'logista' 
AND deleted_at IS NULL;

-- Create index for performance
CREATE INDEX idx_affiliates_has_subscription 
ON affiliates(has_subscription) 
WHERE deleted_at IS NULL;

-- Add comment
COMMENT ON COLUMN affiliates.has_subscription IS 
  'Indicates if affiliate pays monthly subscription (vitrine + agent IA)';
```

**Lógica de Uso:**
- `has_subscription = false`: Individual SEM mensalidade (plano básico)
- `has_subscription = true`: Individual COM mensalidade OU Logista

**Verificação de Acesso:**
```javascript
// Webhook: Ativar bundle
if (affiliate.has_subscription && affiliate.payment_status === 'active') {
  await activateBundle(affiliateId);
}

// Frontend: Exibir menu "Loja"
if (affiliate.has_subscription) {
  showLojaMenu();
}

// RLS: Permitir acesso a store_profiles
WHERE has_subscription = true AND payment_status = 'active'
```

**Risk:** 🟢 LOW - Campo booleano simples, zero impacto em dados existentes

---

#### 1.3 Product Configuration

**Table:** `products`

**Current State:**
```sql
-- Individual product (no monthly fee)
category = 'adesao_afiliado'
eligible_affiliate_type = 'individual'
has_monthly_fee = false
monthly_fee_cents = NULL
is_subscription = false
```

**Target State - 2 Produtos Individuais:**

**Produto 1: Individual SEM Mensalidade (existente)**
```sql
id: 4922aa8c-3ade-4f34-878b-6c4e785a54da
name: "Adesão Individual - Renum"
category: adesao_afiliado
eligible_affiliate_type: individual
entry_fee_cents: 50000 (R$ 500,00)
monthly_fee_cents: NULL
has_entry_fee: true
is_subscription: false  -- ✅ SEM mensalidade
```

**Produto 2: Individual COM Mensalidade (NOVO)**
```sql
-- Criar via Admin Panel ou SQL
name: "Adesão Individual Premium - Renum"
category: adesao_afiliado
eligible_affiliate_type: individual
entry_fee_cents: 50000 (R$ 500,00)
monthly_fee_cents: 6900 (R$ 69,00 sugerido)
has_entry_fee: true
is_subscription: true  -- ✅ COM mensalidade
```

**Produto 3: Logista (inalterado)**
```sql
id: ba0de318-661f-4d42-890c-5ba62e0530e1
name: "Adesão Logista - Renum"
category: adesao_afiliado
eligible_affiliate_type: logista
entry_fee_cents: 50000 (R$ 500,00)
monthly_fee_cents: 12900 (R$ 129,00)
has_entry_fee: true
is_subscription: true
```

**Implementation:**
- Create via Admin Panel (preferred)
- OR via SQL INSERT (if needed)
- NO hardcoded values in code

**Risk:** 🟢 LOW - Simple product creation

---

### 2. Backend Layer

#### 2.1 Webhook Asaas - Bundle Activation

**File:** `api/webhook-assinaturas.js`

**Function 1: detectBundlePayment()**

**Current Implementation:**
```javascript
async function detectBundlePayment(supabase, payment) {
  const affiliateId = payment.externalReference.replace('affiliate_', '');
  
  const { data: affiliate } = await supabase
    .from('affiliates')
    .select('affiliate_type')
    .eq('id', affiliateId)
    .single();
  
  return affiliate.affiliate_type === 'logista';  // ❌ ONLY LOGISTAS
}
```

**Target Implementation:**
```javascript
async function detectBundlePayment(supabase, payment) {
  const affiliateId = payment.externalReference.replace('affiliate_', '');
  
  console.log('[Bundle] 🔍 Detecting bundle payment:', {
    affiliateId,
    paymentId: payment.id,
    value: payment.value
  });
  
  const { data: affiliate, error } = await supabase
    .from('affiliates')
    .select('has_subscription, payment_status, affiliate_type')
    .eq('id', affiliateId)
    .single();
  
  if (error || !affiliate) {
    console.error('[Bundle] ❌ Affiliate not found:', affiliateId);
    return false;
  }
  
  // ✅ Check has_subscription AND payment_status
  const isBundle = affiliate.has_subscription === true && 
                   affiliate.payment_status === 'active';
  
  console.log('[Bundle] 📊 Detection result:', {
    affiliateId,
    affiliateType: affiliate.affiliate_type,
    hasSubscription: affiliate.has_subscription,
    paymentStatus: affiliate.payment_status,
    isBundle
  });
  
  return isBundle;
}
```

**Rationale:**
- Bundle activation should depend on `has_subscription` AND `payment_status`
- Allows both individual premium and logista to activate bundle
- Individual básico (has_subscription = false) will NOT activate bundle
- Maintains same logic for both types with subscription

---

**Function 2: activateTenantAndVitrine() → activateBundle()**

**Current Implementation:**
```javascript
async function activateTenantAndVitrine(supabase, affiliateId) {
  // 1. Create/update tenant
  await supabase.from('multi_agent_tenants').upsert({
    affiliate_id: affiliateId,
    status: 'active',
    whatsapp_status: 'inactive'
  });
  
  // 2. Activate vitrine
  await supabase.from('store_profiles').update({ 
    is_visible: true  // ❌ WRONG FIELD
  }).eq('affiliate_id', affiliateId);
}
```

**Target Implementation:**
```javascript
async function activateBundle(supabase, affiliateId) {
  console.log('[Bundle] 🚀 Activating bundle:', affiliateId);
  
  // 1. Create/update tenant (agent IA)
  const { data: tenant, error: tenantError } = await supabase
    .from('multi_agent_tenants')
    .upsert({
      affiliate_id: affiliateId,
      status: 'active',
      whatsapp_status: 'inactive',
      activated_at: new Date().toISOString(),
      personality: null  // Use fallback
    }, {
      onConflict: 'affiliate_id'
    })
    .select('id')
    .single();
  
  if (tenantError) {
    console.error('[Bundle] ❌ Error creating tenant:', tenantError);
    throw tenantError;
  }
  
  console.log('[Bundle] ✅ Tenant activated:', tenant.id);
  
  // 2. Activate vitrine
  const { error: vitrineError } = await supabase
    .from('store_profiles')
    .update({ 
      is_visible_in_showcase: true,  // ✅ CORRECT FIELD
      updated_at: new Date().toISOString()
    })
    .eq('affiliate_id', affiliateId);
  
  if (vitrineError) {
    console.error('[Bundle] ⚠️ Error activating vitrine:', vitrineError);
    // Don't block - vitrine can be activated manually
  } else {
    console.log('[Bundle] ✅ Vitrine activated:', affiliateId);
  }
  
  return tenant.id;
}
```

**Changes:**
1. ✅ Rename function to `activateBundle()` (more generic)
2. ✅ Fix field: `is_visible` → `is_visible_in_showcase`
3. ✅ Add `updated_at` timestamp
4. ✅ Add detailed logging
5. ✅ Return tenant_id for tracking
6. ✅ Graceful error handling (don't block on vitrine error)

**Risk:** 🟢 LOW - Bug fix + rename

---

#### 2.2 Edge Function - Bloqueio por Inadimplência

**File:** `supabase/functions/process-affiliate-webhooks/index.ts`

**Function: handlePaymentOverdue()**

**Current Implementation:**
```typescript
async function handlePaymentOverdue(supabase, payment) {
  const { data: affiliate } = await supabase
    .from('affiliates')
    .select('affiliate_type, show_row')
    .eq('id', affiliateId)
    .single();
  
  // Only block logistas
  if (affiliate?.affiliate_type === 'logista' && affiliate.show_row) {
    await supabase
      .from('store_profiles')
      .update({
        is_visible_in_showcase: false,
        updated_at: new Date().toISOString()
      })
      .eq('affiliate_id', affiliateId);
  }
}
```

**Target Implementation:**
```typescript
async function handlePaymentOverdue(supabase, payment) {
  const affiliateId = payment.externalReference.replace('affiliate_', '');
  
  console.log('[Overdue] ⚠️ Processing overdue payment:', affiliateId);
  
  // Verify affiliate has subscription
  const { data: affiliate } = await supabase
    .from('affiliates')
    .select('has_subscription')
    .eq('id', affiliateId)
    .single();
  
  if (!affiliate?.has_subscription) {
    console.log('[Overdue] ℹ️ Affiliate has no subscription, skipping block');
    return;
  }
  
  // Block vitrine for affiliates WITH subscription
  const { error: vitrineError } = await supabase
    .from('store_profiles')
    .update({
      is_visible_in_showcase: false,
      updated_at: new Date().toISOString()
    })
    .eq('affiliate_id', affiliateId);
  
  if (vitrineError) {
    console.error('[Overdue] ❌ Error blocking vitrine:', vitrineError);
  } else {
    console.log('[Overdue] ✅ Vitrine blocked:', affiliateId);
  }
  
  // Block agent IA for affiliates WITH subscription
  const { error: tenantError } = await supabase
    .from('multi_agent_tenants')
    .update({
      status: 'inactive',
      suspended_at: new Date().toISOString()
    })
    .eq('affiliate_id', affiliateId);
  
  if (tenantError) {
    console.error('[Overdue] ❌ Error blocking agent:', tenantError);
  } else {
    console.log('[Overdue] ✅ Agent blocked:', affiliateId);
  }
  
  // Create notification
  await supabase.from('notifications').insert({
    affiliate_id: affiliateId,
    type: 'overdue',
    title: 'Pagamento em atraso',
    message: 'Sua vitrine e agente IA foram temporariamente desativados. Regularize seu pagamento para reativá-los.',
    link: '/afiliados/dashboard/pagamentos',
    created_at: new Date().toISOString()
  });
}
```

**Changes:**
1. ✅ Verify `has_subscription = true` before blocking
2. ✅ Block vitrine for affiliates WITH subscription
3. ✅ Block agent IA for affiliates WITH subscription
4. ✅ Skip blocking for Individual Básico (has_subscription = false)
5. ✅ Create notification for user
6. ✅ Detailed logging added
7. ✅ Graceful error handling

**Risk:** 🟢 LOW - Add verification, maintain blocking logic

---


### 3. Frontend Layer

#### 3.1 Menu Lateral - AffiliateDashboardLayout

**File:** `src/layouts/AffiliateDashboardLayout.tsx`

**Current Implementation:**
```typescript
const menuItems = [
  { icon: Home, label: 'Início', path: '/afiliados/dashboard' },
  { icon: Users, label: 'Rede', path: '/afiliados/dashboard/rede' },
  { icon: DollarSign, label: 'Comissões', path: '/afiliados/dashboard/comissoes' },
  { icon: CreditCard, label: 'Pagamentos', path: '/afiliados/dashboard/pagamentos' },
  
  // Only for logistas
  ...(affiliateType === 'logista' ? [{
    icon: Store,
    label: 'Loja',
    path: '/afiliados/dashboard/loja'
  }] : []),
  
  // Only for logistas
  ...(affiliateType === 'logista' ? [{
    icon: Package,
    label: 'Show Room',
    path: '/afiliados/dashboard/show-room'
  }] : [])
];
```

**Target Implementation:**
```typescript
const menuItems = [
  { icon: Home, label: 'Início', path: '/afiliados/dashboard' },
  { icon: Users, label: 'Rede', path: '/afiliados/dashboard/rede' },
  { icon: DollarSign, label: 'Comissões', path: '/afiliados/dashboard/comissoes' },
  { icon: CreditCard, label: 'Pagamentos', path: '/afiliados/dashboard/pagamentos' },
  
  // ✅ FOR AFFILIATES WITH SUBSCRIPTION
  ...(hasSubscription ? [{
    icon: Store,
    label: 'Loja',
    path: '/afiliados/dashboard/loja'
  }] : []),
  
  // ⚠️ KEEP EXCLUSIVE FOR LOGISTAS
  ...(affiliateType === 'logista' ? [{
    icon: Package,
    label: 'Show Room',
    path: '/afiliados/dashboard/show-room'
  }] : [])
];
```

**Changes:**
1. ✅ Check `hasSubscription` instead of `affiliateType === 'logista'` for "Loja" menu
2. ✅ Keep conditional for "Show Room" (exclusive for logistas)
3. ✅ Maintain menu order

**Risk:** 🟢 LOW - Simple conditional change

---

#### 3.2 Página Loja - Visual Differentiation

**File:** `src/pages/afiliados/dashboard/Loja.tsx`

**Component: Badge Visual**

**Implementation:**
```typescript
<Card>
  <CardHeader>
    <div className="flex items-center justify-between">
      <CardTitle>Configurações da Loja</CardTitle>
      
      {/* ✅ VISUAL DIFFERENTIATION */}
      {affiliateType === 'individual' && (
        <Badge variant="secondary" className="text-sm">
          Afiliado Individual
        </Badge>
      )}
      
      {affiliateType === 'logista' && (
        <Badge variant="default" className="text-sm">
          Logista
        </Badge>
      )}
    </div>
  </CardHeader>
  
  <CardContent>
    {/* Existing form fields */}
  </CardContent>
</Card>
```

**Component: Product Loading**

**Current Implementation:**
```typescript
useEffect(() => {
  async function loadSubscriptionProduct() {
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('category', 'adesao_afiliado')
      .eq('is_active', true)
      .maybeSingle();  // ❌ NO TYPE FILTER

    if (data) {
      setSubscriptionProduct(data);
    }
  }

  loadSubscriptionProduct();
}, []);
```

**Target Implementation:**
```typescript
useEffect(() => {
  async function loadSubscriptionProduct() {
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('category', 'adesao_afiliado')
      .eq('eligible_affiliate_type', affiliateType)  // ✅ FILTER BY TYPE
      .eq('is_active', true)
      .maybeSingle();

    if (data) {
      setSubscriptionProduct(data);
    } else {
      console.warn('[Loja] No subscription product found for:', affiliateType);
    }
  }

  loadSubscriptionProduct();
}, [affiliateType]);  // ✅ ADD DEPENDENCY
```

**Changes:**
1. ✅ Add badge for visual differentiation
2. ✅ Filter product by `eligible_affiliate_type`
3. ✅ Add `affiliateType` to useEffect dependencies
4. ✅ Add warning log if product not found

**Risk:** 🟢 LOW - Visual enhancement + filter

---

#### 3.3 Activation Flow - Subscription Modal

**File:** `src/pages/afiliados/dashboard/Loja.tsx`

**Current Flow:**
```typescript
const handleVisibilityToggle = async (checked: boolean) => {
  if (checked) {
    // Check if has active subscription
    if (!hasActiveSubscription) {
      setShowSubscriptionModal(true);  // Show modal
    } else {
      // Activate immediately
      setFormData({ ...formData, is_visible_in_showcase: true });
      await storeFrontendService.saveProfile({
        ...formData,
        is_visible_in_showcase: true
      });
    }
  }
};
```

**Target Flow (No Changes Required):**
- ✅ Logic already works for both types
- ✅ Checks `payment_status === 'active'`
- ✅ Shows modal if no subscription
- ✅ Activates immediately if has subscription

**Validation:**
- Ensure `hasActiveSubscription` checks `payment_status` (not `affiliate_type`)
- Ensure modal displays correct product for affiliate type

**Risk:** 🟢 LOW - No changes needed, just validation

---

### 4. Data Flow

#### 4.1 Fluxo de Cadastro com Checkbox

```
┌─────────────────────────────────────────────────────────────┐
│              FLUXO DE CADASTRO - INDIVIDUAL                  │
└─────────────────────────────────────────────────────────────┘

1. Usuário Acessa Formulário de Cadastro
   ├─ Seleciona tipo: "Afiliado Individual"
   └─ Preenche dados básicos (nome, email, CPF, etc.)

2. Escolha de Plano (NOVO)
   ├─ ✅ Checkbox: "Incluir Vitrine + Agente IA (mensalidade)"
   │  ├─ Desmarcado (padrão): Plano Básico
   │  └─ Marcado: Plano Premium
   │
   ├─ IF checkbox desmarcado:
   │  ├─ Busca produto: is_subscription = false
   │  ├─ Exibe: "Taxa de adesão: R$ 500,00"
   │  └─ has_subscription = false
   │
   └─ IF checkbox marcado:
      ├─ Busca produto: is_subscription = true
      ├─ Exibe: "Taxa de adesão: R$ 500,00 + Mensalidade: R$ 69,00"
      └─ has_subscription = true

3. Confirmação e Pagamento
   ├─ Usuário confirma cadastro
   ├─ Sistema cria affiliate com has_subscription correto
   ├─ Sistema cria pagamento via Asaas
   └─ Aguarda confirmação de pagamento

4. Webhook Asaas (PAYMENT_CONFIRMED)
   ├─ IF has_subscription = false:
   │  └─ Apenas ativa conta (sem vitrine/agente)
   │
   └─ IF has_subscription = true:
      ├─ Ativa conta
      ├─ Cria Multi_Agent_Tenant (agente IA)
      ├─ Ativa Store_Profile (vitrine)
      └─ Registra em affiliate_services

5. Resultado
   ├─ Plano Básico: Conta ativa, sem vitrine, sem agente
   └─ Plano Premium: Conta ativa, com vitrine, com agente
```

---

#### 4.2 Bundle Activation Flow

```
┌─────────────────────────────────────────────────────────────┐
│                  BUNDLE ACTIVATION FLOW                      │
└─────────────────────────────────────────────────────────────┘

1. User Action
   ├─ Individual Premium/Logista clicks "Ativar Vitrine"
   └─ Frontend checks has_subscription AND payment_status

2. IF has_subscription = false
   ├─ Show upgrade modal
   ├─ User confirms upgrade
   ├─ Create subscription via Asaas API
   └─ Wait for webhook

3. IF has_subscription = true AND payment_status !== 'active'
   ├─ Show subscription modal
   ├─ User confirms
   ├─ Create payment via Asaas API
   └─ Wait for webhook

4. Asaas Webhook (PAYMENT_CONFIRMED)
   ├─ Receive event
   ├─ Extract affiliate_id from externalReference
   ├─ Call detectBundlePayment()
   │  └─ Check has_subscription = true AND payment_status = 'active'
   ├─ IF true, call activateBundle()
   │  ├─ Create/update multi_agent_tenants
   │  │  ├─ status = 'active'
   │  │  └─ whatsapp_status = 'inactive'
   │  ├─ Update store_profiles
   │  │  └─ is_visible_in_showcase = true
   │  └─ Register in affiliate_services
   │     ├─ service_type = 'vitrine'
   │     └─ service_type = 'agente'
   └─ Return success

5. Result
   ├─ Vitrine visible in /lojas
   ├─ Agent IA ready (waiting WhatsApp connection)
   └─ User can configure store profile
```

---

#### 4.3 Fluxo de Upgrade (Individual Básico → Premium)

```
┌─────────────────────────────────────────────────────────────┐
│                    UPGRADE FLOW                              │
└─────────────────────────────────────────────────────────────┘

1. Individual Básico Acessa Painel
   ├─ Sistema detecta has_subscription = false
   └─ Exibe banner/card de upgrade

2. Usuário Clica em "Fazer Upgrade"
   ├─ Sistema exibe modal de confirmação
   ├─ Busca produto: is_subscription = true
   ├─ Exibe valor da mensalidade (R$ 69,00)
   └─ Exibe benefícios (vitrine + agente IA)

3. Usuário Confirma Upgrade
   ├─ Sistema cria assinatura via Asaas API
   ├─ externalReference: "affiliate_{id}"
   └─ Aguarda webhook

4. Webhook Asaas (PAYMENT_CONFIRMED)
   ├─ Atualiza affiliate:
   │  ├─ has_subscription = true
   │  └─ payment_status = 'active'
   ├─ Ativa Bundle:
   │  ├─ Cria Multi_Agent_Tenant
   │  └─ Ativa Store_Profile
   └─ Cria notificação de sucesso

5. Resultado
   ├─ Individual agora é Premium
   ├─ Tem acesso ao menu "Loja"
   ├─ Vitrine ativa
   └─ Agente IA ativo
```

---

#### 4.4 Bloqueio por Inadimplência Flow

```
┌─────────────────────────────────────────────────────────────┐
│              INADIMPLÊNCIA BLOCKING FLOW                     │
└─────────────────────────────────────────────────────────────┘

1. Asaas Webhook (PAYMENT_OVERDUE)
   ├─ Receive event
   ├─ Extract affiliate_id
   └─ Call handlePaymentOverdue()

2. Edge Function Processing
   ├─ Verifica has_subscription = true (só bloqueia quem tem mensalidade)
   ├─ Update store_profiles
   │  └─ is_visible_in_showcase = false
   ├─ Update multi_agent_tenants
   │  ├─ status = 'inactive'
   │  └─ suspended_at = NOW()
   └─ Create notification
      ├─ type = 'overdue'
      └─ message = "Vitrine e agente desativados"

3. Result
   ├─ Vitrine NOT visible in /lojas
   ├─ Agent IA NOT processing messages
   └─ User sees notification in panel

4. Reactivation (PAYMENT_CONFIRMED)
   ├─ Receive event
   ├─ Call activateBundle() again
   ├─ Restore is_visible_in_showcase = true
   ├─ Restore status = 'active'
   └─ Create notification (reactivated)
```

---

### 5. Security Considerations

#### 5.1 RLS Policies

**Principle:** Row Level Security ensures data isolation

**Implementation:**
```sql
-- Affiliates can only see/edit their OWN profile
CREATE POLICY "Affiliates can view own profile"
  ON store_profiles FOR SELECT
  USING (
    affiliate_id IN (
      SELECT id FROM affiliates 
      WHERE user_id = auth.uid()  -- ✅ AUTHENTICATED USER
      AND affiliate_type IN ('individual', 'logista')
      AND deleted_at IS NULL
    )
  );
```

**Security Guarantees:**
- ✅ User can only access their own store_profile
- ✅ Deleted affiliates cannot access
- ✅ Unauthenticated users cannot access
- ✅ Public can only see visible stores (separate policy)

---

#### 5.2 Payment Validation

**Principle:** Always validate payment status before activation

**Implementation:**
```javascript
// Webhook validates payment before activation
async function detectBundlePayment(supabase, payment) {
  const { data: affiliate } = await supabase
    .from('affiliates')
    .select('payment_status')
    .eq('id', affiliateId)
    .single();
  
  // ✅ ONLY ACTIVATE IF PAYMENT IS ACTIVE
  return affiliate.payment_status === 'active';
}
```

**Security Guarantees:**
- ✅ No activation without confirmed payment
- ✅ Webhook validates payment_status
- ✅ Frontend checks payment_status before showing activation
- ✅ Edge function blocks on overdue

---

### 6. Performance Considerations

#### 6.1 Database Queries

**Optimization 1: RLS Policy Performance**
```sql
-- Use IN clause instead of OR for better query planning
WHERE affiliate_type IN ('individual', 'logista')
-- vs
WHERE affiliate_type = 'individual' OR affiliate_type = 'logista'
```

**Optimization 2: Index Usage**
```sql
-- Existing indexes already support new queries
CREATE INDEX idx_store_profiles_affiliate_id ON store_profiles(affiliate_id);
CREATE INDEX idx_store_profiles_visible ON store_profiles(is_visible_in_showcase);
```

**Expected Impact:** 🟢 ZERO - Queries use existing indexes

---

#### 6.2 Webhook Processing

**Current:** Synchronous processing in webhook
**Target:** Keep synchronous (already fast)

**Rationale:**
- Bundle activation is fast (<500ms)
- No heavy processing required
- Idempotency prevents duplicate processing
- Edge function handles async notifications

**Expected Impact:** 🟢 ZERO - No performance degradation

---

### 7. Error Handling

#### 7.1 Graceful Degradation

**Principle:** Non-critical errors should not block activation

**Implementation:**
```javascript
async function activateBundle(supabase, affiliateId) {
  // 1. Critical: Create tenant (MUST succeed)
  const { data: tenant, error: tenantError } = await supabase
    .from('multi_agent_tenants')
    .upsert({...});
  
  if (tenantError) {
    throw tenantError;  // ❌ BLOCK - Critical error
  }
  
  // 2. Non-critical: Activate vitrine (CAN fail)
  const { error: vitrineError } = await supabase
    .from('store_profiles')
    .update({...});
  
  if (vitrineError) {
    console.error('[Bundle] ⚠️ Vitrine error:', vitrineError);
    // ✅ DON'T BLOCK - Can be activated manually
  }
  
  // 3. Non-critical: Register services (CAN fail)
  const { error: servicesError } = await supabase
    .from('affiliate_services')
    .insert([...]);
  
  if (servicesError) {
    console.error('[Bundle] ⚠️ Services error:', servicesError);
    // ✅ DON'T BLOCK - Can be registered manually
  }
}
```

**Error Categories:**
- 🔴 **Critical:** Tenant creation (blocks activation)
- 🟡 **Non-critical:** Vitrine, services, notifications (log and continue)

---

#### 7.2 Idempotency

**Principle:** Webhook can be called multiple times safely

**Implementation:**
```javascript
// Check if event already processed
const { data: existingEvent } = await supabase
  .from('subscription_webhook_events')
  .select('id, processed')
  .eq('asaas_event_id', payment.id)
  .eq('event_type', event.event)
  .single();

if (existingEvent) {
  console.log('[Webhook] ⚠️ Event already processed');
  return { success: true, duplicate: true };
}
```

**Guarantees:**
- ✅ Same event processed only once
- ✅ Safe to retry on failure
- ✅ No duplicate activations

---

### 8. Testing Strategy

#### 8.1 Unit Tests

**Backend:**
```javascript
describe('detectBundlePayment', () => {
  it('should return true for active individual', async () => {
    const result = await detectBundlePayment(supabase, {
      externalReference: 'affiliate_123',
      value: 69.00
    });
    expect(result).toBe(true);
  });
  
  it('should return false for inactive individual', async () => {
    const result = await detectBundlePayment(supabase, {
      externalReference: 'affiliate_456',
      value: 69.00
    });
    expect(result).toBe(false);
  });
});

describe('activateBundle', () => {
  it('should create tenant and activate vitrine', async () => {
    const tenantId = await activateBundle(supabase, 'affiliate_123');
    expect(tenantId).toBeDefined();
    
    // Verify tenant created
    const { data: tenant } = await supabase
      .from('multi_agent_tenants')
      .select('*')
      .eq('id', tenantId)
      .single();
    expect(tenant.status).toBe('active');
    
    // Verify vitrine activated
    const { data: store } = await supabase
      .from('store_profiles')
      .select('*')
      .eq('affiliate_id', 'affiliate_123')
      .single();
    expect(store.is_visible_in_showcase).toBe(true);
  });
});
```

---

#### 8.2 Integration Tests

**Frontend:**
```typescript
describe('Loja Page - Individual', () => {
  it('should display "Afiliado Individual" badge', () => {
    render(<Loja affiliateType="individual" />);
    expect(screen.getByText('Afiliado Individual')).toBeInTheDocument();
  });
  
  it('should load correct subscription product', async () => {
    render(<Loja affiliateType="individual" />);
    await waitFor(() => {
      expect(screen.getByText(/R\$ 69,00/)).toBeInTheDocument();
    });
  });
  
  it('should show subscription modal if not active', async () => {
    render(<Loja affiliateType="individual" paymentStatus="pending" />);
    fireEvent.click(screen.getByText('Ativar Vitrine'));
    expect(screen.getByText('Criar Assinatura')).toBeInTheDocument();
  });
});
```

---

#### 8.3 E2E Tests

**Scenario 1: Individual Activation**
```typescript
test('Individual can activate vitrine with subscription', async ({ page }) => {
  // 1. Login as individual
  await page.goto('/login');
  await page.fill('[name="email"]', 'individual@test.com');
  await page.fill('[name="password"]', 'password');
  await page.click('button[type="submit"]');
  
  // 2. Navigate to Loja
  await page.click('text=Loja');
  expect(page.url()).toContain('/afiliados/dashboard/loja');
  
  // 3. Verify badge
  await expect(page.locator('text=Afiliado Individual')).toBeVisible();
  
  // 4. Try to activate vitrine
  await page.click('text=Ativar Vitrine');
  
  // 5. Verify subscription modal
  await expect(page.locator('text=Criar Assinatura')).toBeVisible();
  
  // 6. Confirm subscription
  await page.click('text=Confirmar');
  
  // 7. Wait for payment processing
  await page.waitForTimeout(2000);
  
  // 8. Verify vitrine activated
  await expect(page.locator('text=Vitrine Ativa')).toBeVisible();
});
```

**Scenario 2: Logista Preservation**
```typescript
test('Logista functionality remains unchanged', async ({ page }) => {
  // 1. Login as logista
  await page.goto('/login');
  await page.fill('[name="email"]', 'logista@test.com');
  await page.fill('[name="password"]', 'password');
  await page.click('button[type="submit"]');
  
  // 2. Verify Show Room menu exists
  await expect(page.locator('text=Show Room')).toBeVisible();
  
  // 3. Navigate to Loja
  await page.click('text=Loja');
  
  // 4. Verify badge
  await expect(page.locator('text=Logista')).toBeVisible();
  
  // 5. Verify vitrine activation works
  await page.click('text=Ativar Vitrine');
  await page.waitForTimeout(2000);
  await expect(page.locator('text=Vitrine Ativa')).toBeVisible();
});
```

---

### 9. Página de Upgrade para Individuais Básicos

#### 9.1 Banner de Upgrade no Painel

**File:** `src/pages/afiliados/dashboard/Inicio.tsx`

**Component: UpgradeBanner**

**Implementation:**
```typescript
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Store, Bot, Sparkles } from 'lucide-react';

function UpgradeBanner({ onUpgrade }: { onUpgrade: () => void }) {
  return (
    <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Upgrade para Plano Premium
            </CardTitle>
            <CardDescription className="mt-2">
              Tenha sua própria vitrine pública e agente IA para atender clientes 24/7
            </CardDescription>
          </div>
          <Badge variant="secondary">Novo</Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {/* Benefits */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <Store className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-semibold text-sm">Vitrine Pública</p>
                <p className="text-sm text-muted-foreground">
                  Sua loja visível em /lojas com produtos e contatos
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Bot className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-semibold text-sm">Agente IA (Bia)</p>
                <p className="text-sm text-muted-foreground">
                  Atendimento automatizado via WhatsApp 24/7
                </p>
              </div>
            </div>
          </div>
          
          {/* Pricing */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div>
              <p className="text-sm text-muted-foreground">Mensalidade</p>
              <p className="text-2xl font-bold text-primary">R$ 69,00</p>
            </div>
            
            <Button onClick={onUpgrade} size="lg">
              Fazer Upgrade Agora
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

**Conditional Rendering:**
```typescript
// In Inicio.tsx
{!hasSubscription && (
  <UpgradeBanner onUpgrade={() => setShowUpgradeModal(true)} />
)}
```

---

#### 9.2 Modal de Upgrade

**File:** `src/components/affiliates/UpgradeModal.tsx`

**Implementation:**
```typescript
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Store, Bot, Check, AlertCircle } from 'lucide-react';
import { useState } from 'react';

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
  monthlyFee: number;
}

export function UpgradeModal({ open, onOpenChange, onConfirm, monthlyFee }: UpgradeModalProps) {
  const [loading, setLoading] = useState(false);
  
  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upgrade para Plano Premium</DialogTitle>
          <DialogDescription>
            Tenha acesso à vitrine pública e agente IA
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Benefits List */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Check className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-semibold text-sm">Vitrine Pública</p>
                <p className="text-sm text-muted-foreground">
                  Sua loja visível em /lojas/:seu-slug
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Check className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-semibold text-sm">Agente IA (Bia)</p>
                <p className="text-sm text-muted-foreground">
                  Atendimento automatizado via WhatsApp
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Check className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-semibold text-sm">Comissionamento</p>
                <p className="text-sm text-muted-foreground">
                  Mensalidade gera comissão para sua rede
                </p>
              </div>
            </div>
          </div>
          
          {/* Pricing */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <p className="font-semibold">Valor da Mensalidade</p>
              <p className="text-2xl font-bold text-primary mt-1">
                R$ {(monthlyFee / 100).toFixed(2)}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Cobrado mensalmente via Asaas
              </p>
            </AlertDescription>
          </Alert>
          
          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirm}
              className="flex-1"
              disabled={loading}
            >
              {loading ? 'Processando...' : 'Confirmar Upgrade'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

---

#### 9.3 Lógica de Upgrade

**File:** `src/services/frontend/affiliate.service.ts`

**Function: upgradeToSubscription()**

```typescript
async upgradeToSubscription(affiliateId: string): Promise<{ success: boolean; paymentUrl?: string }> {
  try {
    // 1. Buscar produto Individual COM mensalidade
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('category', 'adesao_afiliado')
      .eq('eligible_affiliate_type', 'individual')
      .eq('is_subscription', true)
      .eq('is_active', true)
      .single();
    
    if (productError || !product) {
      throw new Error('Produto de upgrade não encontrado');
    }
    
    // 2. Criar assinatura via API
    const response = await fetch('/api/subscriptions/create-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await this.getToken()}`
      },
      body: JSON.stringify({
        action: 'create-subscription',
        affiliateId,
        productId: product.id
      })
    });
    
    if (!response.ok) {
      throw new Error('Erro ao criar assinatura');
    }
    
    const data = await response.json();
    
    return {
      success: true,
      paymentUrl: data.invoiceUrl
    };
    
  } catch (error) {
    console.error('[Upgrade] Error:', error);
    return { success: false };
  }
}
```

---

#### 9.4 Integração no Painel

**File:** `src/pages/afiliados/dashboard/Inicio.tsx`

**Usage:**
```typescript
import { useState } from 'react';
import { UpgradeModal } from '@/components/affiliates/UpgradeModal';
import { affiliateService } from '@/services/frontend/affiliate.service';
import { useToast } from '@/hooks/use-toast';

function Inicio() {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const { toast } = useToast();
  
  const handleUpgrade = async () => {
    const result = await affiliateService.upgradeToSubscription(affiliateId);
    
    if (result.success && result.paymentUrl) {
      // Redirect to payment
      window.location.href = result.paymentUrl;
    } else {
      toast({
        title: 'Erro',
        description: 'Não foi possível processar o upgrade. Tente novamente.',
        variant: 'destructive'
      });
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Upgrade Banner (only for Individual Básico) */}
      {!hasSubscription && (
        <UpgradeBanner onUpgrade={() => setShowUpgradeModal(true)} />
      )}
      
      {/* Upgrade Modal */}
      <UpgradeModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        onConfirm={handleUpgrade}
        monthlyFee={6900}
      />
      
      {/* Rest of dashboard */}
    </div>
  );
}
```

---

#### 9.5 Webhook - Atualizar has_subscription

**File:** `api/webhook-assinaturas.js`

**Function: handleUpgradePayment()**

```javascript
async function handleUpgradePayment(supabase, payment) {
  const affiliateId = payment.externalReference.replace('affiliate_', '');
  
  console.log('[Upgrade] 🔄 Processing upgrade payment:', affiliateId);
  
  // 1. Update affiliate
  const { error: updateError } = await supabase
    .from('affiliates')
    .update({
      has_subscription: true,
      payment_status: 'active',
      updated_at: new Date().toISOString()
    })
    .eq('id', affiliateId);
  
  if (updateError) {
    console.error('[Upgrade] ❌ Error updating affiliate:', updateError);
    throw updateError;
  }
  
  console.log('[Upgrade] ✅ Affiliate updated to premium');
  
  // 2. Activate bundle
  const tenantId = await activateBundle(supabase, affiliateId);
  
  console.log('[Upgrade] ✅ Bundle activated:', tenantId);
  
  // 3. Create notification
  await supabase.from('notifications').insert({
    affiliate_id: affiliateId,
    type: 'upgrade_success',
    title: 'Upgrade realizado com sucesso!',
    message: 'Sua conta foi atualizada para o Plano Premium. Agora você tem acesso à vitrine e agente IA.',
    link: '/afiliados/dashboard/loja',
    read: false,
    created_at: new Date().toISOString()
  });
  
  console.log('[Upgrade] ✅ Notification created');
}
```

**Integration in webhook:**
```javascript
// In handlePaymentSuccess()
if (payment.externalReference.startsWith('affiliate_')) {
  const { data: affiliate } = await supabase
    .from('affiliates')
    .select('has_subscription')
    .eq('id', affiliateId)
    .single();
  
  // If was Individual Básico, now is Premium
  if (!affiliate.has_subscription) {
    await handleUpgradePayment(supabase, payment);
  } else {
    // Regular subscription payment
    await processBundleActivation(supabase, payment);
  }
}
```

---

### 10. Rollback Plan

#### 9.1 Database Rollback

**File:** `supabase/migrations/20260303000000_enable_vitrine_for_individuals.sql`

**Rollback SQL:**
```sql
BEGIN;

-- Restore original policies
DROP POLICY IF EXISTS "Affiliates can view own profile" ON store_profiles;
DROP POLICY IF EXISTS "Affiliates can update own profile" ON store_profiles;
DROP POLICY IF EXISTS "Affiliates can insert own profile" ON store_profiles;

CREATE POLICY "Logistas can view own profile"
  ON store_profiles FOR SELECT
  USING (
    affiliate_id IN (
      SELECT id FROM affiliates 
      WHERE user_id = auth.uid() 
      AND affiliate_type = 'logista'
      AND deleted_at IS NULL
    )
  );

CREATE POLICY "Logistas can update own profile"
  ON store_profiles FOR UPDATE
  USING (
    affiliate_id IN (
      SELECT id FROM affiliates 
      WHERE user_id = auth.uid() 
      AND affiliate_type = 'logista'
      AND deleted_at IS NULL
    )
  );

CREATE POLICY "Logistas can insert own profile"
  ON store_profiles FOR INSERT
  WITH CHECK (
    affiliate_id IN (
      SELECT id FROM affiliates 
      WHERE user_id = auth.uid() 
      AND affiliate_type = 'logista'
      AND deleted_at IS NULL
    )
  );

COMMIT;
```

---

#### 9.2 Code Rollback

**Git Revert:**
```bash
# Revert all changes
git revert <commit-hash>

# Or revert specific files
git checkout HEAD~1 -- api/webhook-assinaturas.js
git checkout HEAD~1 -- src/layouts/AffiliateDashboardLayout.tsx
git checkout HEAD~1 -- src/pages/afiliados/dashboard/Loja.tsx
```

**Vercel Rollback:**
```bash
# Via Vercel Dashboard
1. Go to Deployments
2. Find previous deployment
3. Click "Promote to Production"
```

---

### 10. Deployment Plan

#### Phase 1: Database (Day 1)
1. ✅ Create migration file
2. ✅ Test migration in staging
3. ✅ Apply migration in production
4. ✅ Verify RLS policies
5. ✅ Update product via admin panel

#### Phase 2: Backend (Day 2)
1. ✅ Update webhook functions
2. ✅ Update edge function
3. ✅ Deploy to Vercel
4. ✅ Test webhook with Asaas sandbox
5. ✅ Verify logs

#### Phase 3: Frontend (Day 3)
1. ✅ Update menu layout
2. ✅ Update Loja page
3. ✅ Deploy to Vercel
4. ✅ Test activation flow
5. ✅ Verify UI/UX

#### Phase 4: Testing & Validation (Day 4)
1. ✅ Run unit tests
2. ✅ Run integration tests
3. ✅ Run E2E tests
4. ✅ Manual testing (individual + logista)
5. ✅ Monitor production logs
6. ✅ Validate zero impact on logistas

---

## Conclusion

This design provides a comprehensive technical specification for enabling vitrine and agent IA for individual affiliates. The implementation follows these key principles:

1. **Low Risk:** Isolated changes with zero impact on existing logistas
2. **Reusability:** Maximum reuse of existing code and infrastructure
3. **Simplicity:** Minimal changes to achieve the goal
4. **Security:** RLS policies ensure data isolation
5. **Performance:** No performance degradation expected
6. **Testability:** Comprehensive testing strategy
7. **Rollback:** Clear rollback plan if needed

**Next Steps:**
1. Review and approve this design
2. Create tasks.md with detailed implementation tasks
3. Begin implementation in 4 phases
4. Deploy and validate

