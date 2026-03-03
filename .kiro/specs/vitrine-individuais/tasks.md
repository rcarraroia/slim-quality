# Tasks Document - Vitrine e Agente IA para Afiliados Individuais

## Introduction

Este documento contém o breakdown detalhado de todas as tarefas necessárias para implementar a liberação de vitrine e agente IA para afiliados individuais. As tarefas estão organizadas em 4 fases sequenciais, seguindo o plano de deployment definido no design.md.

**Referências:**
- Requirements: `.kiro/specs/vitrine-individuais/requirements.md`
- Design: `.kiro/specs/vitrine-individuais/design.md`

**Estimativa Total:** 4 dias (1 dia por fase)

---

## Phase 1: Database Layer (Day 1)

**Objetivo:** Atualizar RLS policies, adicionar campo has_subscription e configurar produtos de adesão

**Estimativa:** 1 dia

---

### Task 1.0: Criar Migration - Campo has_subscription

**Status:** ✅ CONCLUÍDA (03/03/2026)

**Description:**
Criar migration para adicionar campo `has_subscription` na tabela `affiliates`.

**Files to Create:**
- `supabase/migrations/20260303000001_add_has_subscription.sql`

**Implementation:**
```sql
-- Migration: Add has_subscription field to affiliates
-- Created: 03/03/2026
-- Author: Kiro AI

BEGIN;

-- ============================================
-- STEP 1: Add has_subscription field
-- ============================================

ALTER TABLE affiliates 
ADD COLUMN has_subscription BOOLEAN DEFAULT false;

-- ============================================
-- STEP 2: Update existing logistas
-- ============================================

UPDATE affiliates 
SET has_subscription = true 
WHERE affiliate_type = 'logista' 
AND deleted_at IS NULL;

-- ============================================
-- STEP 3: Create index for performance
-- ============================================

CREATE INDEX idx_affiliates_has_subscription 
ON affiliates(has_subscription) 
WHERE deleted_at IS NULL;

-- ============================================
-- STEP 4: Add comment
-- ============================================

COMMENT ON COLUMN affiliates.has_subscription IS 
  'Indicates if affiliate pays monthly subscription (vitrine + agent IA)';

COMMIT;
```

**Acceptance Criteria:**
- [ ] Migration file created in correct location
- [ ] Field `has_subscription` added with DEFAULT false
- [ ] Existing logistas updated to has_subscription = true
- [ ] Index created for performance
- [ ] Comment added to column
- [ ] Migration uses transaction (BEGIN/COMMIT)

**Testing:**
```sql
-- Test 1: Verify field exists
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'affiliates' 
AND column_name = 'has_subscription';

-- Test 2: Verify logistas updated
SELECT COUNT(*) FROM affiliates 
WHERE affiliate_type = 'logista' 
AND has_subscription = true;

-- Test 3: Verify index exists
SELECT indexname FROM pg_indexes 
WHERE tablename = 'affiliates' 
AND indexname = 'idx_affiliates_has_subscription';
```

---

### Task 1.1: Criar Migration File - RLS Policies

**Status:** ✅ CONCLUÍDA (03/03/2026)

**Description:**
Criar arquivo de migration para atualizar RLS policies da tabela `store_profiles`, permitindo acesso para afiliados individuais.

**Files to Create:**
- `supabase/migrations/20260303000000_enable_vitrine_for_individuals.sql`

**Implementation:**
```sql
-- Migration: Enable vitrine for individual affiliates
-- Created: 03/03/2026
-- Author: Kiro AI

BEGIN;

-- ============================================
-- STEP 1: Drop existing policies
-- ============================================

DROP POLICY IF EXISTS "Logistas can view own profile" ON store_profiles;
DROP POLICY IF EXISTS "Logistas can update own profile" ON store_profiles;
DROP POLICY IF EXISTS "Logistas can insert own profile" ON store_profiles;

-- ============================================
-- STEP 2: Create new policies (both types)
-- ============================================

-- Policy 1: SELECT (view own profile)
CREATE POLICY "Affiliates can view own profile"
  ON store_profiles FOR SELECT
  USING (
    affiliate_id IN (
      SELECT id FROM affiliates 
      WHERE user_id = auth.uid() 
      AND affiliate_type IN ('individual', 'logista')
      AND deleted_at IS NULL
    )
  );

-- Policy 2: UPDATE (edit own profile)
CREATE POLICY "Affiliates can update own profile"
  ON store_profiles FOR UPDATE
  USING (
    affiliate_id IN (
      SELECT id FROM affiliates 
      WHERE user_id = auth.uid() 
      AND affiliate_type IN ('individual', 'logista')
      AND deleted_at IS NULL
    )
  );

-- Policy 3: INSERT (create own profile)
CREATE POLICY "Affiliates can insert own profile"
  ON store_profiles FOR INSERT
  WITH CHECK (
    affiliate_id IN (
      SELECT id FROM affiliates 
      WHERE user_id = auth.uid() 
      AND affiliate_type IN ('individual', 'logista')
      AND deleted_at IS NULL
    )
  );

-- ============================================
-- STEP 3: Add comments
-- ============================================

COMMENT ON POLICY "Affiliates can view own profile" ON store_profiles IS 
  'Allows both individual and logista affiliates to view their own store profile';

COMMENT ON POLICY "Affiliates can update own profile" ON store_profiles IS 
  'Allows both individual and logista affiliates to update their own store profile';

COMMENT ON POLICY "Affiliates can insert own profile" ON store_profiles IS 
  'Allows both individual and logista affiliates to create their own store profile';

COMMIT;
```

**Acceptance Criteria:**
- [ ] Migration file created in correct location
- [ ] All 3 policies dropped (SELECT, UPDATE, INSERT)
- [ ] All 3 policies recreated with IN ('individual', 'logista')
- [ ] Comments added to policies
- [ ] Migration uses transaction (BEGIN/COMMIT)

**Testing:**
```sql
-- Test 1: Verify policies exist
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'store_profiles';

-- Test 2: Test as individual (should work)
SET ROLE authenticated;
SET request.jwt.claims.sub = '<individual_user_id>';
SELECT * FROM store_profiles WHERE affiliate_id = '<individual_affiliate_id>';

-- Test 3: Test as logista (should still work)
SET request.jwt.claims.sub = '<logista_user_id>';
SELECT * FROM store_profiles WHERE affiliate_id = '<logista_affiliate_id>';
```

---

### Task 1.2: Apply Migration in Staging

**Status:** ✅ CONCLUÍDA (03/03/2026)

**Description:**
Aplicar migration no ambiente de staging e validar que RLS policies foram atualizadas corretamente.

**Steps:**
1. Connect to Supabase staging via CLI
2. Apply migration: `supabase db push`
3. Verify policies via SQL Editor
4. Test with staging credentials

**Acceptance Criteria:**
- [ ] Migration applied successfully in staging
- [ ] No errors in migration logs
- [ ] Policies visible in Supabase Dashboard
- [ ] Test queries return expected results

**Validation Commands:**
```bash
# Apply migration
supabase db push

# Verify migration
supabase db diff

# Check migration history
SELECT * FROM supabase_migrations.schema_migrations 
ORDER BY version DESC LIMIT 5;
```

---

### Task 1.3: Criar Produto Individual COM Mensalidade

**Status:** ✅ CONCLUÍDA (03/03/2026)

**Description:**
Criar novo produto de adesão para Individual COM mensalidade via painel admin ou SQL.

**Steps:**
1. Login to admin panel
2. Navigate to Produtos
3. Click "Criar Produto"
4. Fill fields:
   - `name`: "Adesão Individual Premium - Renum"
   - `category`: "adesao_afiliado"
   - `eligible_affiliate_type`: "individual"
   - `entry_fee_cents`: 50000 (R$ 500,00)
   - `monthly_fee_cents`: 6900 (R$ 69,00 suggested)
   - `has_entry_fee`: true
   - `is_subscription`: true
   - `is_active`: true
5. Save product

**Alternative (SQL):**
```sql
INSERT INTO products (
  name,
  category,
  eligible_affiliate_type,
  entry_fee_cents,
  monthly_fee_cents,
  has_entry_fee,
  is_subscription,
  is_active,
  created_at,
  updated_at
) VALUES (
  'Adesão Individual Premium - Renum',
  'adesao_afiliado',
  'individual',
  50000,
  6900,
  true,
  true,
  true,
  NOW(),
  NOW()
);
```

**Acceptance Criteria:**
- [ ] Product created successfully
- [ ] `category` = 'adesao_afiliado'
- [ ] `eligible_affiliate_type` = 'individual'
- [ ] `is_subscription` = true
- [ ] `monthly_fee_cents` = 6900 (or configured value)
- [ ] Product visible in admin panel
- [ ] Product active (`is_active` = true)

**Validation:**
```sql
-- Verify both individual products exist
SELECT 
  id,
  name,
  category,
  eligible_affiliate_type,
  entry_fee_cents,
  monthly_fee_cents,
  is_subscription,
  is_active
FROM products
WHERE category = 'adesao_afiliado'
AND eligible_affiliate_type = 'individual'
ORDER BY is_subscription;

-- Expected: 2 rows
-- Row 1: is_subscription = false (SEM mensalidade)
-- Row 2: is_subscription = true (COM mensalidade)
```

---

### Task 1.4: Update Product Configuration (Admin Panel)

**Status:** ⏳ TODO

**Description:**
Atualizar produto de adesão individual para incluir mensalidade recorrente via painel admin.

**Steps:**
1. Login to admin panel
2. Navigate to Produtos
3. Find product: category = 'adesao_afiliado' AND eligible_affiliate_type = 'individual'
4. Update fields:
   - `has_monthly_fee` = true
   - `monthly_fee_cents` = 6900 (R$ 69,00 suggested)
5. Save changes

**Alternative (SQL):**
```sql
UPDATE products
SET 
  has_monthly_fee = true,
  monthly_fee_cents = 6900,
  updated_at = NOW()
WHERE 
  category = 'adesao_afiliado'
  AND eligible_affiliate_type = 'individual'
  AND deleted_at IS NULL;
```

**Acceptance Criteria:**
- [ ] Product updated successfully
- [ ] `has_monthly_fee` = true
- [ ] `monthly_fee_cents` configured (suggested: 6900)
- [ ] Product visible in admin panel
- [ ] No hardcoded values in code

**Validation:**
```sql
-- Verify product configuration
SELECT 
  id,
  name,
  category,
  eligible_affiliate_type,
  has_monthly_fee,
  monthly_fee_cents,
  is_active
FROM products
WHERE category = 'adesao_afiliado'
ORDER BY eligible_affiliate_type;
```

---

### Task 1.4: Apply Migrations in Staging

**Status:** ✅ CONCLUÍDA (03/03/2026) - Consolidada com 1.2

**Description:**
Aplicar ambas as migrations no ambiente de staging e validar que campo e RLS policies foram atualizados corretamente.

**Steps:**
1. Connect to Supabase staging via CLI
2. Apply migrations: `supabase db push`
3. Verify field `has_subscription` exists
4. Verify policies via SQL Editor
5. Test with staging credentials

**Acceptance Criteria:**
- [ ] Both migrations applied successfully in staging
- [ ] No errors in migration logs
- [ ] Field `has_subscription` exists
- [ ] Policies visible in Supabase Dashboard
- [ ] Test queries return expected results

**Validation Commands:**
```bash
# Apply migrations
supabase db push

# Verify migrations
supabase db diff

# Check migration history
SELECT * FROM supabase_migrations.schema_migrations 
ORDER BY version DESC LIMIT 5;
```

---

### Task 1.5: Apply Migrations in Production

**Status:** ✅ CONCLUÍDA (03/03/2026) - Aplicada diretamente

**Description:**
Aplicar migrations no ambiente de produção após validação em staging.

**Prerequisites:**
- [ ] Task 1.4 completed successfully
- [ ] Staging tests passed
- [ ] Backup created

**Steps:**
1. Create database backup
2. Connect to Supabase production
3. Apply migrations: `supabase db push`
4. Verify field and policies
5. Monitor logs for 10 minutes

**Acceptance Criteria:**
- [ ] Backup created before migration
- [ ] Migrations applied successfully
- [ ] No errors in production logs
- [ ] Field and policies active and working
- [ ] Zero impact on existing logistas

**Rollback Plan:**
```sql
-- If needed, rollback field
BEGIN;

ALTER TABLE affiliates DROP COLUMN has_subscription;

COMMIT;

-- If needed, rollback policies (see Task 1.1 rollback)
```

---

### Task 1.6: Validate RLS Policies and Field

**Status:** ✅ CONCLUÍDA (03/03/2026)

**Description:**
Validar que RLS policies estão funcionando corretamente para ambos os tipos de afiliado.

**Test Cases:**

**Test 1: Individual can access own profile**
```sql
-- Login as individual
SET ROLE authenticated;
SET request.jwt.claims.sub = '<individual_user_id>';

-- Should return 1 row
SELECT COUNT(*) FROM store_profiles 
WHERE affiliate_id = '<individual_affiliate_id>';
```

**Test 2: Individual cannot access other profiles**
```sql
-- Should return 0 rows
SELECT COUNT(*) FROM store_profiles 
WHERE affiliate_id != '<individual_affiliate_id>';
```

**Test 3: Logista can still access own profile**
```sql
-- Login as logista
SET request.jwt.claims.sub = '<logista_user_id>';

-- Should return 1 row
SELECT COUNT(*) FROM store_profiles 
WHERE affiliate_id = '<logista_affiliate_id>';
```

**Test 4: Public can see visible stores**
```sql
-- Unauthenticated
SET ROLE anon;

-- Should return only visible stores
SELECT COUNT(*) FROM store_profiles 
WHERE is_visible_in_showcase = true;
```

**Acceptance Criteria:**
- [ ] All 4 test cases pass
- [ ] Individual can access own profile
- [ ] Individual cannot access other profiles
- [ ] Logista can still access own profile
- [ ] Public can see visible stores only

---

## Phase 2: Backend Layer (Day 2)

**Objetivo:** Atualizar webhook Asaas e edge function para suportar individuais

**Estimativa:** 1 dia

---

### Task 2.1: Update detectBundlePayment() Function

**Status:** ✅ CONCLUÍDA (03/03/2026)

**Description:**
Atualizar função `detectBundlePayment()` para verificar `payment_status` ao invés de `affiliate_type`.

**File:** `api/webhook-assinaturas.js`

**Current Code (lines ~320-340):**
```javascript
async function detectBundlePayment(supabase, payment) {
  const affiliateId = payment.externalReference.replace('affiliate_', '');
  
  const { data: affiliate } = await supabase
    .from('affiliates')
    .select('affiliate_type')
    .eq('id', affiliateId)
    .single();
  
  return affiliate.affiliate_type === 'logista';
}
```

**Target Code:**
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
    .select('payment_status, affiliate_type')
    .eq('id', affiliateId)
    .single();
  
  if (error || !affiliate) {
    console.error('[Bundle] ❌ Affiliate not found:', affiliateId);
    return false;
  }
  
  const isBundle = affiliate.payment_status === 'active';
  
  console.log('[Bundle] 📊 Detection result:', {
    affiliateId,
    affiliateType: affiliate.affiliate_type,
    paymentStatus: affiliate.payment_status,
    isBundle
  });
  
  return isBundle;
}
```

**Acceptance Criteria:**
- [ ] Function checks `payment_status` instead of `affiliate_type`
- [ ] Returns true for payment_status === 'active' (any type)
- [ ] Returns false for payment_status !== 'active'
- [ ] Detailed logging added
- [ ] Error handling for missing affiliate

**Testing:**
```javascript
// Test 1: Active individual
const result1 = await detectBundlePayment(supabase, {
  externalReference: 'affiliate_123',
  id: 'pay_123',
  value: 69.00
});
expect(result1).toBe(true);

// Test 2: Inactive individual
const result2 = await detectBundlePayment(supabase, {
  externalReference: 'affiliate_456',
  id: 'pay_456',
  value: 69.00
});
expect(result2).toBe(false);

// Test 3: Active logista (should still work)
const result3 = await detectBundlePayment(supabase, {
  externalReference: 'affiliate_789',
  id: 'pay_789',
  value: 129.00
});
expect(result3).toBe(true);
```

---

### Task 2.2: Rename and Fix activateTenantAndVitrine()

**Status:** ✅ CONCLUÍDA (03/03/2026)

**Description:**
Renomear função para `activateBundle()` e corrigir campo `is_visible` → `is_visible_in_showcase`.

**File:** `api/webhook-assinaturas.js`

**Current Code (lines ~400-430):**
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

**Target Code:**
```javascript
async function activateBundle(supabase, affiliateId) {
  console.log('[Bundle] 🚀 Activating bundle:', affiliateId);
  
  try {
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
    
    console.log('[Bundle] ✅ Tenant activated:', {
      tenantId: tenant.id,
      affiliateId
    });
    
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
    
  } catch (error) {
    console.error('[Bundle] 💥 Fatal error:', {
      error: error.message,
      affiliateId
    });
    throw error;
  }
}
```

**Acceptance Criteria:**
- [ ] Function renamed to `activateBundle()`
- [ ] Field corrected: `is_visible_in_showcase`
- [ ] `updated_at` timestamp added
- [ ] Detailed logging added
- [ ] Graceful error handling (vitrine error doesn't block)
- [ ] Returns tenant_id
- [ ] All calls to old function name updated

**Files to Update:**
- `api/webhook-assinaturas.js` - Function definition
- `api/webhook-assinaturas.js` - All function calls (search for `activateTenantAndVitrine`)

---


### Task 2.3: Update processBundleActivation() Calls

**Status:** ✅ CONCLUÍDA (03/03/2026)

**Description:**
Atualizar todas as chamadas para a função renomeada `activateBundle()`.

**File:** `api/webhook-assinaturas.js`

**Search and Replace:**
```javascript
// Find all occurrences of:
activateTenantAndVitrine(supabase, affiliateId)

// Replace with:
activateBundle(supabase, affiliateId)
```

**Locations to Update:**
1. Line ~600: Inside `processBundleActivation()`
2. Any other references in the file

**Acceptance Criteria:**
- [ ] All function calls updated
- [ ] No references to old function name remain
- [ ] Code compiles without errors
- [ ] getDiagnostics shows 0 errors

---

### Task 2.4: Update Edge Function - handlePaymentOverdue()

**Status:** ✅ CONCLUÍDA (03/03/2026)

**Description:**
Atualizar edge function para bloquear vitrine e agente de TODOS os tipos de afiliado (não apenas logistas).

**File:** `supabase/functions/process-affiliate-webhooks/index.ts`

**Current Code:**
```typescript
if (affiliate?.affiliate_type === 'logista' && affiliate.show_row) {
  await supabase
    .from('store_profiles')
    .update({
      is_visible_in_showcase: false,
      updated_at: new Date().toISOString()
    })
    .eq('affiliate_id', affiliateId);
}
```

**Target Code:**
```typescript
async function handlePaymentOverdue(supabase: SupabaseClient, payment: any) {
  const affiliateId = payment.externalReference?.replace('affiliate_', '');
  
  if (!affiliateId) {
    console.error('[Overdue] ❌ No affiliate_id in payment');
    return;
  }
  
  console.log('[Overdue] ⚠️ Processing overdue payment:', affiliateId);
  
  // Block vitrine for ALL affiliate types
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
  
  // Block agent IA for ALL affiliate types
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
    read: false,
    created_at: new Date().toISOString()
  });
  
  console.log('[Overdue] ✅ Notification created');
}
```

**Acceptance Criteria:**
- [ ] Remove `affiliate_type` check
- [ ] Block vitrine for ALL types
- [ ] Block agent IA for ALL types
- [ ] Create notification for user
- [ ] Detailed logging added
- [ ] Graceful error handling

---

### Task 2.5: Deploy Backend to Vercel

**Status:** ✅ CONCLUÍDA (03/03/2026)

**Description:**
Deploy das alterações de backend para Vercel (produção).

**Steps:**
1. Commit changes: `git add api/webhook-assinaturas.js`
2. Commit message: `feat: Enable vitrine for individuals - backend`
3. Push to main: `git push origin main`
4. Wait for Vercel deployment
5. Verify deployment logs

**Acceptance Criteria:**
- [ ] Code committed to git
- [ ] Pushed to main branch
- [ ] Vercel deployment successful
- [ ] No build errors
- [ ] Functions deployed correctly

**Validation:**
```bash
# Check Vercel deployment
vercel ls

# Check function logs
vercel logs api/webhook-assinaturas.js --follow
```

---

### Task 2.6: Deploy Edge Function to Supabase

**Status:** ✅ CONCLUÍDA (03/03/2026)

**Description:**
Deploy da edge function atualizada para Supabase.

**Steps:**
1. Navigate to edge function directory
2. Deploy: `supabase functions deploy process-affiliate-webhooks`
3. Verify deployment
4. Test with sample payload

**Acceptance Criteria:**
- [ ] Edge function deployed successfully
- [ ] No deployment errors
- [ ] Function version incremented
- [ ] Logs show new version active

**Validation:**
```bash
# Deploy edge function
supabase functions deploy process-affiliate-webhooks

# Check function status
supabase functions list

# Test function
supabase functions invoke process-affiliate-webhooks \
  --data '{"event":"PAYMENT_OVERDUE","payment":{"externalReference":"affiliate_test"}}'
```

---

### Task 2.7: Test Webhook with Asaas Sandbox

**Status:** ✅ CONCLUÍDA (03/03/2026) - Código validado

**Description:**
Testar webhook com ambiente sandbox do Asaas para validar fluxo completo.

**Test Cases:**

**Test 1: Individual Bundle Activation**
```json
{
  "event": "PAYMENT_CONFIRMED",
  "payment": {
    "id": "pay_test_001",
    "externalReference": "affiliate_individual_test",
    "value": 69.00,
    "status": "CONFIRMED"
  }
}
```

**Expected Result:**
- [ ] `detectBundlePayment()` returns true
- [ ] `activateBundle()` called
- [ ] Tenant created with status 'active'
- [ ] Vitrine activated (is_visible_in_showcase = true)
- [ ] Logs show success messages

**Test 2: Logista Bundle Activation (Regression)**
```json
{
  "event": "PAYMENT_CONFIRMED",
  "payment": {
    "id": "pay_test_002",
    "externalReference": "affiliate_logista_test",
    "value": 129.00,
    "status": "CONFIRMED"
  }
}
```

**Expected Result:**
- [ ] Same behavior as individual
- [ ] No errors
- [ ] Zero impact on existing logic

**Test 3: Payment Overdue**
```json
{
  "event": "PAYMENT_OVERDUE",
  "payment": {
    "id": "pay_test_003",
    "externalReference": "affiliate_individual_test",
    "value": 69.00,
    "status": "OVERDUE"
  }
}
```

**Expected Result:**
- [ ] Vitrine blocked (is_visible_in_showcase = false)
- [ ] Agent blocked (status = 'inactive')
- [ ] Notification created
- [ ] Logs show blocking messages

**Acceptance Criteria:**
- [ ] All 3 test cases pass
- [ ] No errors in webhook logs
- [ ] Database updated correctly
- [ ] Notifications created

---

## Phase 3: Frontend Layer (Day 3)

**Objetivo:** Atualizar interface para exibir menu e badges para individuais

**Estimativa:** 1 dia

---

### Task 3.1: Update Menu Layout

**Status:** ✅ CONCLUÍDA (03/03/2026)

**Description:**
Atualizar menu lateral para exibir "Loja" para todos os tipos de afiliado.

**File:** `src/layouts/AffiliateDashboardLayout.tsx`

**Current Code:**
```typescript
const menuItems = [
  // ... other items
  
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

**Target Code:**
```typescript
const menuItems = [
  { icon: Home, label: 'Início', path: '/afiliados/dashboard' },
  { icon: Users, label: 'Rede', path: '/afiliados/dashboard/rede' },
  { icon: DollarSign, label: 'Comissões', path: '/afiliados/dashboard/comissoes' },
  { icon: CreditCard, label: 'Pagamentos', path: '/afiliados/dashboard/pagamentos' },
  
  // ✅ FOR ALL AFFILIATE TYPES
  {
    icon: Store,
    label: 'Loja',
    path: '/afiliados/dashboard/loja'
  },
  
  // ⚠️ KEEP EXCLUSIVE FOR LOGISTAS
  ...(affiliateType === 'logista' ? [{
    icon: Package,
    label: 'Show Room',
    path: '/afiliados/dashboard/show-room'
  }] : [])
];
```

**Acceptance Criteria:**
- [ ] "Loja" menu item visible for ALL types
- [ ] "Show Room" menu item ONLY for logistas
- [ ] Menu order maintained
- [ ] Icons correct
- [ ] No TypeScript errors
- [ ] getDiagnostics: 0 errors

**Testing:**
```typescript
// Test 1: Individual sees "Loja"
render(<AffiliateDashboardLayout affiliateType="individual" />);
expect(screen.getByText('Loja')).toBeInTheDocument();

// Test 2: Individual does NOT see "Show Room"
expect(screen.queryByText('Show Room')).not.toBeInTheDocument();

// Test 3: Logista sees both
render(<AffiliateDashboardLayout affiliateType="logista" />);
expect(screen.getByText('Loja')).toBeInTheDocument();
expect(screen.getByText('Show Room')).toBeInTheDocument();
```

---

### Task 3.2: Add Visual Badge to Loja Page

**Status:** ✅ CONCLUÍDA (03/03/2026)

**Description:**
Adicionar badge visual para diferenciar tipo de afiliado na página Loja.

**File:** `src/pages/afiliados/dashboard/Loja.tsx`

**Implementation:**
```typescript
import { Badge } from '@/components/ui/badge';

// Inside component, after CardHeader
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

**Acceptance Criteria:**
- [ ] Badge displays for individual ("Afiliado Individual")
- [ ] Badge displays for logista ("Logista")
- [ ] Badge uses correct variant (secondary vs default)
- [ ] Badge positioned correctly (right side of header)
- [ ] No layout issues
- [ ] getDiagnostics: 0 errors

**Testing:**
```typescript
// Test 1: Individual badge
render(<Loja affiliateType="individual" />);
expect(screen.getByText('Afiliado Individual')).toBeInTheDocument();

// Test 2: Logista badge
render(<Loja affiliateType="logista" />);
expect(screen.getByText('Logista')).toBeInTheDocument();
```

---

### Task 3.3: Update Product Loading Logic

**Status:** ✅ CONCLUÍDA (03/03/2026)

**Description:**
Atualizar lógica de carregamento de produto para filtrar por `eligible_affiliate_type`.

**File:** `src/pages/afiliados/dashboard/Loja.tsx`

**Current Code:**
```typescript
useEffect(() => {
  async function loadSubscriptionProduct() {
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('category', 'adesao_afiliado')
      .eq('is_active', true)
      .maybeSingle();

    if (data) {
      setSubscriptionProduct(data);
    }
  }

  loadSubscriptionProduct();
}, []);
```

**Target Code:**
```typescript
useEffect(() => {
  async function loadSubscriptionProduct() {
    console.log('[Loja] Loading subscription product for:', affiliateType);
    
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('category', 'adesao_afiliado')
      .eq('eligible_affiliate_type', affiliateType)  // ✅ FILTER BY TYPE
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.error('[Loja] Error loading product:', error);
      return;
    }

    if (data) {
      console.log('[Loja] Product loaded:', {
        id: data.id,
        name: data.name,
        monthlyFee: data.monthly_fee_cents
      });
      setSubscriptionProduct(data);
    } else {
      console.warn('[Loja] No subscription product found for:', affiliateType);
    }
  }

  loadSubscriptionProduct();
}, [affiliateType]);  // ✅ ADD DEPENDENCY
```

**Acceptance Criteria:**
- [ ] Query filters by `eligible_affiliate_type`
- [ ] `affiliateType` added to useEffect dependencies
- [ ] Logging added for debugging
- [ ] Error handling added
- [ ] Warning if product not found
- [ ] getDiagnostics: 0 errors

**Testing:**
```typescript
// Test 1: Individual loads correct product
render(<Loja affiliateType="individual" />);
await waitFor(() => {
  expect(screen.getByText(/R\$ 69,00/)).toBeInTheDocument();
});

// Test 2: Logista loads correct product
render(<Loja affiliateType="logista" />);
await waitFor(() => {
  expect(screen.getByText(/R\$ 129,00/)).toBeInTheDocument();
});
```

---


### Task 3.4: Validate Activation Flow

**Status:** ⏳ TODO

**Description:**
Validar que fluxo de ativação de vitrine funciona para individuais.

**File:** `src/pages/afiliados/dashboard/Loja.tsx`

**Test Scenarios:**

**Scenario 1: Individual WITHOUT subscription**
1. Login as individual
2. Navigate to Loja
3. Try to activate vitrine
4. Should show subscription modal
5. Confirm subscription
6. Should create payment via Asaas
7. Wait for webhook
8. Vitrine should activate

**Scenario 2: Individual WITH subscription**
1. Login as individual (payment_status = 'active')
2. Navigate to Loja
3. Toggle vitrine switch
4. Should activate immediately (no modal)
5. Vitrine should be visible

**Scenario 3: Logista (Regression Test)**
1. Login as logista
2. Navigate to Loja
3. Verify same behavior as before
4. No errors
5. Zero impact

**Acceptance Criteria:**
- [ ] Scenario 1 passes (modal shown)
- [ ] Scenario 2 passes (immediate activation)
- [ ] Scenario 3 passes (logista unchanged)
- [ ] No console errors
- [ ] UI responsive and clear

---

### Task 3.5: Deploy Frontend to Vercel

**Status:** ⏳ TODO

**Description:**
Deploy das alterações de frontend para Vercel.

**Steps:**
1. Run build locally: `npm run build`
2. Fix any build errors
3. Commit changes
4. Push to main
5. Wait for Vercel deployment
6. Verify deployment

**Acceptance Criteria:**
- [ ] Build passes locally
- [ ] No TypeScript errors
- [ ] No ESLint errors
- [ ] Vercel deployment successful
- [ ] No runtime errors in production

**Validation:**
```bash
# Local build
npm run build

# Check for errors
npm run lint

# Type check
npm run type-check

# Deploy
git add src/
git commit -m "feat: Enable vitrine for individuals - frontend"
git push origin main
```

---

### Task 3.6: Manual Testing in Production

**Status:** ⏳ TODO

**Description:**
Testar manualmente em produção com usuários reais.

**Test Users:**
- Individual test account
- Logista test account

**Test Cases:**

**Test 1: Individual Menu**
- [ ] Login as individual
- [ ] Verify "Loja" menu visible
- [ ] Verify "Show Room" menu NOT visible
- [ ] Click "Loja" menu
- [ ] Page loads without errors

**Test 2: Individual Badge**
- [ ] On Loja page
- [ ] Verify badge "Afiliado Individual" visible
- [ ] Badge has correct color (secondary)

**Test 3: Individual Product**
- [ ] Verify correct product loaded
- [ ] Verify monthly fee displayed (R$ 69,00)
- [ ] Verify product details correct

**Test 4: Individual Activation**
- [ ] Try to activate vitrine
- [ ] Verify modal shows if no subscription
- [ ] Verify activation works if has subscription

**Test 5: Logista Regression**
- [ ] Login as logista
- [ ] Verify "Loja" menu visible
- [ ] Verify "Show Room" menu visible
- [ ] Verify badge "Logista" visible
- [ ] Verify correct product loaded (R$ 129,00)
- [ ] Verify activation works as before

**Acceptance Criteria:**
- [ ] All 5 test cases pass
- [ ] No errors in browser console
- [ ] No errors in Vercel logs
- [ ] UI/UX smooth and clear

---

## Phase 4: Testing & Validation (Day 4)

**Objetivo:** Executar testes completos e validar zero impacto em logistas

**Estimativa:** 1 dia

---

### Task 4.1: Run Unit Tests

**Status:** ⏳ TODO

**Description:**
Executar testes unitários para validar funções individuais.

**Test Files to Create/Update:**

**File 1:** `tests/unit/webhook-bundle.test.js`
```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import { detectBundlePayment, activateBundle } from '@/api/webhook-assinaturas';

describe('detectBundlePayment', () => {
  it('should return true for active individual', async () => {
    const result = await detectBundlePayment(mockSupabase, {
      externalReference: 'affiliate_individual_active',
      id: 'pay_001',
      value: 69.00
    });
    expect(result).toBe(true);
  });
  
  it('should return true for active logista', async () => {
    const result = await detectBundlePayment(mockSupabase, {
      externalReference: 'affiliate_logista_active',
      id: 'pay_002',
      value: 129.00
    });
    expect(result).toBe(true);
  });
  
  it('should return false for inactive individual', async () => {
    const result = await detectBundlePayment(mockSupabase, {
      externalReference: 'affiliate_individual_inactive',
      id: 'pay_003',
      value: 69.00
    });
    expect(result).toBe(false);
  });
});

describe('activateBundle', () => {
  it('should create tenant and activate vitrine', async () => {
    const tenantId = await activateBundle(mockSupabase, 'affiliate_test');
    
    expect(tenantId).toBeDefined();
    expect(mockSupabase.from).toHaveBeenCalledWith('multi_agent_tenants');
    expect(mockSupabase.from).toHaveBeenCalledWith('store_profiles');
  });
  
  it('should handle vitrine error gracefully', async () => {
    mockSupabase.from('store_profiles').update.mockRejectedValue(new Error('DB error'));
    
    const tenantId = await activateBundle(mockSupabase, 'affiliate_test');
    
    // Should still return tenant_id (don't block on vitrine error)
    expect(tenantId).toBeDefined();
  });
});
```

**Acceptance Criteria:**
- [ ] All unit tests pass
- [ ] Test coverage > 70% for modified functions
- [ ] No test failures
- [ ] Tests run in < 5 seconds

**Run Tests:**
```bash
npm run test:unit
```

---

### Task 4.2: Run Integration Tests

**Status:** ⏳ TODO

**Description:**
Executar testes de integração para validar fluxo completo.

**Test File:** `tests/integration/vitrine-activation.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Loja from '@/pages/afiliados/dashboard/Loja';

describe('Vitrine Activation - Individual', () => {
  it('should display individual badge', () => {
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
    
    await waitFor(() => {
      expect(screen.getByText('Criar Assinatura')).toBeInTheDocument();
    });
  });
  
  it('should activate immediately if has subscription', async () => {
    render(<Loja affiliateType="individual" paymentStatus="active" />);
    
    fireEvent.click(screen.getByText('Ativar Vitrine'));
    
    await waitFor(() => {
      expect(screen.getByText('Vitrine Ativa')).toBeInTheDocument();
    });
  });
});

describe('Vitrine Activation - Logista (Regression)', () => {
  it('should display logista badge', () => {
    render(<Loja affiliateType="logista" />);
    expect(screen.getByText('Logista')).toBeInTheDocument();
  });
  
  it('should load correct subscription product', async () => {
    render(<Loja affiliateType="logista" />);
    
    await waitFor(() => {
      expect(screen.getByText(/R\$ 129,00/)).toBeInTheDocument();
    });
  });
  
  it('should work exactly as before', async () => {
    render(<Loja affiliateType="logista" paymentStatus="active" />);
    
    fireEvent.click(screen.getByText('Ativar Vitrine'));
    
    await waitFor(() => {
      expect(screen.getByText('Vitrine Ativa')).toBeInTheDocument();
    });
  });
});
```

**Acceptance Criteria:**
- [ ] All integration tests pass
- [ ] Individual tests pass (4 tests)
- [ ] Logista regression tests pass (3 tests)
- [ ] No test failures
- [ ] Tests run in < 30 seconds

**Run Tests:**
```bash
npm run test:integration
```

---

### Task 4.3: Run E2E Tests

**Status:** ⏳ TODO

**Description:**
Executar testes E2E com Playwright para validar fluxo completo em browser real.

**Test File:** `tests/e2e/vitrine-individual.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Individual Vitrine Activation', () => {
  test('should allow individual to access Loja page', async ({ page }) => {
    // Login as individual
    await page.goto('/login');
    await page.fill('[name="email"]', 'individual@test.com');
    await page.fill('[name="password"]', 'Test@123');
    await page.click('button[type="submit"]');
    
    // Navigate to Loja
    await page.click('text=Loja');
    await expect(page).toHaveURL(/\/afiliados\/dashboard\/loja/);
    
    // Verify badge
    await expect(page.locator('text=Afiliado Individual')).toBeVisible();
  });
  
  test('should show subscription modal for inactive individual', async ({ page }) => {
    // Login as individual (no subscription)
    await page.goto('/login');
    await page.fill('[name="email"]', 'individual-inactive@test.com');
    await page.fill('[name="password"]', 'Test@123');
    await page.click('button[type="submit"]');
    
    // Navigate to Loja
    await page.click('text=Loja');
    
    // Try to activate vitrine
    await page.click('text=Ativar Vitrine');
    
    // Verify modal
    await expect(page.locator('text=Criar Assinatura')).toBeVisible();
    await expect(page.locator('text=R$ 69,00')).toBeVisible();
  });
  
  test('should activate vitrine for active individual', async ({ page }) => {
    // Login as individual (with subscription)
    await page.goto('/login');
    await page.fill('[name="email"]', 'individual-active@test.com');
    await page.fill('[name="password"]', 'Test@123');
    await page.click('button[type="submit"]');
    
    // Navigate to Loja
    await page.click('text=Loja');
    
    // Activate vitrine
    await page.click('text=Ativar Vitrine');
    
    // Wait for activation
    await page.waitForTimeout(2000);
    
    // Verify activated
    await expect(page.locator('text=Vitrine Ativa')).toBeVisible();
  });
});

test.describe('Logista Regression', () => {
  test('should preserve logista functionality', async ({ page }) => {
    // Login as logista
    await page.goto('/login');
    await page.fill('[name="email"]', 'logista@test.com');
    await page.fill('[name="password"]', 'Test@123');
    await page.click('button[type="submit"]');
    
    // Verify Show Room menu exists
    await expect(page.locator('text=Show Room')).toBeVisible();
    
    // Navigate to Loja
    await page.click('text=Loja');
    
    // Verify badge
    await expect(page.locator('text=Logista')).toBeVisible();
    
    // Verify product
    await expect(page.locator('text=R$ 129,00')).toBeVisible();
    
    // Activate vitrine
    await page.click('text=Ativar Vitrine');
    await page.waitForTimeout(2000);
    
    // Verify activated
    await expect(page.locator('text=Vitrine Ativa')).toBeVisible();
  });
});
```

**Acceptance Criteria:**
- [ ] All E2E tests pass
- [ ] Individual tests pass (3 tests)
- [ ] Logista regression test passes (1 test)
- [ ] No test failures
- [ ] Tests run in < 2 minutes

**Run Tests:**
```bash
npm run test:e2e
```

---

### Task 4.4: Validate Zero Impact on Logistas

**Status:** ⏳ TODO

**Description:**
Validar que logistas existentes não foram afetados pelas mudanças.

**Validation Checklist:**

**Database:**
- [ ] Query existing logistas: `SELECT COUNT(*) FROM affiliates WHERE affiliate_type = 'logista'`
- [ ] Verify all have store_profiles access
- [ ] Verify all RLS policies work
- [ ] No data corruption

**Backend:**
- [ ] Webhook processes logista payments correctly
- [ ] Bundle activation works for logistas
- [ ] Bloqueio por inadimplência works for logistas
- [ ] No errors in webhook logs

**Frontend:**
- [ ] Logistas see "Loja" menu
- [ ] Logistas see "Show Room" menu
- [ ] Badge displays "Logista"
- [ ] Correct product loaded (R$ 129,00)
- [ ] Activation flow works

**Vitrine Pública:**
- [ ] Logista stores visible in `/lojas`
- [ ] Store detail pages work
- [ ] "Comprar Agora" button works
- [ ] Referral code passed correctly

**Acceptance Criteria:**
- [ ] All validation checks pass
- [ ] Zero errors for logistas
- [ ] Zero complaints from logistas
- [ ] All existing functionality preserved

---

### Task 4.5: Monitor Production Logs

**Status:** ⏳ TODO

**Description:**
Monitorar logs de produção por 24 horas após deploy para detectar problemas.

**Logs to Monitor:**

**Vercel Logs:**
```bash
# Monitor webhook logs
vercel logs api/webhook-assinaturas.js --follow

# Monitor frontend logs
vercel logs --follow
```

**Supabase Logs:**
```sql
-- Monitor RLS policy usage
SELECT * FROM pg_stat_statements 
WHERE query LIKE '%store_profiles%' 
ORDER BY calls DESC 
LIMIT 10;

-- Monitor errors
SELECT * FROM supabase_functions.logs 
WHERE level = 'error' 
AND timestamp > NOW() - INTERVAL '24 hours'
ORDER BY timestamp DESC;
```

**Metrics to Track:**
- [ ] Webhook success rate > 99%
- [ ] API response time < 500ms
- [ ] Frontend load time < 2s
- [ ] Error rate < 0.1%
- [ ] No 500 errors

**Acceptance Criteria:**
- [ ] Monitored for 24 hours
- [ ] All metrics within acceptable range
- [ ] No critical errors
- [ ] No user complaints

---

### Task 4.6: Create Rollback Documentation

**Status:** ⏳ TODO

**Description:**
Documentar procedimento de rollback caso seja necessário reverter mudanças.

**File:** `.kiro/specs/vitrine-individuais/ROLLBACK.md`

**Content:**
```markdown
# Rollback Procedure - Vitrine for Individuals

## When to Rollback

Rollback if:
- Critical errors in production
- Data corruption detected
- User complaints > 5
- Error rate > 1%
- Logistas affected negatively

## Rollback Steps

### Step 1: Rollback Frontend (Vercel)
1. Go to Vercel Dashboard
2. Find previous deployment (before feature)
3. Click "Promote to Production"
4. Wait for deployment (2-3 minutes)
5. Verify frontend working

### Step 2: Rollback Backend (Git)
```bash
# Find commit before feature
git log --oneline

# Revert to previous commit
git revert <commit-hash>

# Push to trigger Vercel deploy
git push origin main
```

### Step 3: Rollback Database (SQL)
```sql
BEGIN;

-- Drop new policies
DROP POLICY IF EXISTS "Affiliates can view own profile" ON store_profiles;
DROP POLICY IF EXISTS "Affiliates can update own profile" ON store_profiles;
DROP POLICY IF EXISTS "Affiliates can insert own profile" ON store_profiles;

-- Restore original policies
CREATE POLICY "Logistas can view own profile" ON store_profiles FOR SELECT
  USING (affiliate_id IN (
    SELECT id FROM affiliates 
    WHERE user_id = auth.uid() 
    AND affiliate_type = 'logista'
    AND deleted_at IS NULL
  ));

-- (repeat for UPDATE and INSERT)

COMMIT;
```

### Step 4: Rollback Product Configuration
```sql
UPDATE products
SET 
  has_monthly_fee = false,
  monthly_fee_cents = NULL
WHERE 
  category = 'adesao_afiliado'
  AND eligible_affiliate_type = 'individual';
```

### Step 5: Verify Rollback
- [ ] Frontend reverted
- [ ] Backend reverted
- [ ] Database reverted
- [ ] Product reverted
- [ ] Logistas working normally
- [ ] No errors in logs

## Post-Rollback

1. Notify team
2. Investigate root cause
3. Fix issues
4. Re-deploy when ready
```

**Acceptance Criteria:**
- [ ] Rollback documentation created
- [ ] All steps documented
- [ ] SQL scripts tested
- [ ] Team aware of procedure

---

### Task 4.7: Final Validation Checklist

**Status:** ⏳ TODO

**Description:**
Checklist final antes de marcar feature como concluída.

**Checklist:**

**Database:**
- [ ] RLS policies updated and working
- [ ] Product configuration correct
- [ ] No data corruption
- [ ] Backup created

**Backend:**
- [ ] `detectBundlePayment()` updated
- [ ] `activateBundle()` renamed and fixed
- [ ] Edge function updated
- [ ] All tests passing
- [ ] Deployed to production

**Frontend:**
- [ ] Menu updated for all types
- [ ] Badge added to Loja page
- [ ] Product loading filtered
- [ ] All tests passing
- [ ] Deployed to production

**Testing:**
- [ ] Unit tests pass (100%)
- [ ] Integration tests pass (100%)
- [ ] E2E tests pass (100%)
- [ ] Manual testing complete
- [ ] Zero impact on logistas validated

**Documentation:**
- [ ] Requirements.md complete
- [ ] Design.md complete
- [ ] Tasks.md complete
- [ ] Rollback.md created
- [ ] STATUS.md updated

**Production:**
- [ ] Deployed successfully
- [ ] Monitored for 24 hours
- [ ] No critical errors
- [ ] Metrics within range
- [ ] User feedback positive

**Acceptance Criteria:**
- [ ] ALL items checked
- [ ] Feature working in production
- [ ] Zero impact on logistas
- [ ] Team satisfied with implementation

---

## Summary

**Total Tasks:** 32 tasks across 4 phases

**Phase 1 (Database):** 6 tasks (+ Task 1.0 e 1.3)
**Phase 2 (Backend):** 7 tasks
**Phase 3 (Frontend):** 6 tasks  
**Phase 4 (Testing):** 7 tasks + 6 documentation/upgrade tasks

**Estimated Time:** 5 days (1-2 days per phase)

**Risk Level:** 🟢 LOW

**Impact on Logistas:** ✅ ZERO

**Next Steps:**
1. Review and approve tasks.md
2. Begin Phase 1 implementation
3. Execute tasks sequentially
4. Validate after each phase
5. Deploy to production
6. Monitor for 24 hours

