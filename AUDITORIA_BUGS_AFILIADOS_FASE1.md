# 🔍 AUDITORIA FASE 1 - BUGS SISTEMA AFILIADOS
## Data: 11/01/2026 | Executor: Kiro AI

---

## 📋 RESUMO EXECUTIVO

**Objetivo:** Verificar COMO os 8 bugs se manifestam no código real  
**Status:** ✅ AUDITORIA CONCLUÍDA  
**Bugs Auditados:** 5 de 8 (conforme solicitação)  
**Achados Críticos:** 5 problemas confirmados no código

---

## 🐛 BUG 01 - affiliate_nX_id NULL

### 📍 LOCALIZAÇÃO
**Arquivo:** `api/checkout.js`  
**Função:** `savePaymentToDatabase()`  
**Linhas:** 379-470

### 🔍 CÓDIGO ATUAL (PROBLEMA CONFIRMADO)

```javascript
// Linha 379-470
async function savePaymentToDatabase(data) {
  // ... código de conexão Supabase ...
  
  // 1. Criar registro na tabela payments
  const paymentRecord = {
    order_id: data.orderId,
    payment_method: paymentMethodMap[data.billingType] || 'pix',
    amount_cents: Math.round(data.amount * 100),
    status: data.status,
    asaas_payment_id: data.asaasPaymentId,
    installments: data.installments || 1,
    pix_qr_code: data.pixQrCode || null,
    pix_copy_paste: data.pixCopyPaste || null,
    pix_expires_at: data.pixExpiresAt || null,
    card_brand: data.cardBrand || null,
    card_last_digits: data.cardLastDigits || null
  };
  
  // ❌ PROBLEMA: Não atualiza affiliate_n1_id, affiliate_n2_id, affiliate_n3_id
  // ❌ PROBLEMA: Não atualiza referral_code na tabela orders
}
```

### ⚠️ PROBLEMA IDENTIFICADO
A função `savePaymentToDatabase()` **NÃO atualiza** os campos de afiliados na tabela `orders`:
- `affiliate_n1_id` → Permanece NULL
- `affiliate_n2_id` → Permanece NULL  
- `affiliate_n3_id` → Permanece NULL
- `referral_code` → Permanece NULL

### 💡 CAUSA RAIZ
O `referralCode` é recebido no checkout mas **não é persistido** no banco de dados.


### ✅ SOLUÇÃO SUGERIDA

```javascript
async function savePaymentToDatabase(data) {
  // ... código existente ...
  
  // ADICIONAR: Buscar rede de afiliados se houver referralCode
  let affiliateIds = { n1: null, n2: null, n3: null };
  
  if (data.referralCode) {
    affiliateIds = await getAffiliateNetwork(data.referralCode);
  }
  
  // ADICIONAR: Atualizar pedido com dados dos afiliados
  await supabase
    .from('orders')
    .update({
      referral_code: data.referralCode || null,
      affiliate_n1_id: affiliateIds.n1,
      affiliate_n2_id: affiliateIds.n2,
      affiliate_n3_id: affiliateIds.n3,
      updated_at: new Date().toISOString()
    })
    .eq('id', data.orderId);
  
  // ... resto do código ...
}

// ADICIONAR: Nova função para buscar rede
async function getAffiliateNetwork(referralCode) {
  const { data: n1 } = await supabase
    .from('affiliates')
    .select('id, referred_by')
    .eq('referral_code', referralCode)
    .eq('status', 'active')
    .single();
  
  if (!n1) return { n1: null, n2: null, n3: null };
  
  // Buscar N2 e N3...
  // (implementação completa)
}
```

---

## 🐛 BUG 04 - Webhook Comissões

### 📍 LOCALIZAÇÃO
**Arquivo:** `src/api/routes/webhooks/asaas-webhook.ts`  
**Função:** `processOrderCommissions()`  
**Linhas:** 397-470

### 🔍 CÓDIGO ATUAL (PROBLEMA CONFIRMADO)

```typescript
// Linha 397-470
async function processOrderCommissions(
  orderId: string, 
  orderValue: number
): Promise<{
  calculated: boolean;
  affiliateId?: string;
  affiliateName?: string;
  totalCommission?: number;
}> {
  try {
    // ❌ PROBLEMA: Busca apenas referral_code e affiliate_n1_id
    const { data: order } = await supabase
      .from('orders')
      .select('*, referral_code, affiliate_n1_id')
      .eq('id', orderId)
      .single();

    if (!order?.referral_code) {
      console.log(`[AsaasWebhook] Pedido ${orderId} sem afiliado`);
      return { calculated: false };
    }

    // ❌ PROBLEMA: Busca afiliado pelo referral_code novamente
    // (deveria usar affiliate_n1_id, affiliate_n2_id, affiliate_n3_id)
    const { data: affiliate } = await supabase
      .from('affiliates')
      .select('id, user_id, wallet_id, referral_code, referred_by')
      .eq('referral_code', order.referral_code)
      .eq('status', 'active')
      .single();

    // ❌ PROBLEMA: Calcula apenas total, não cria registros de comissões
    const totalCommission = orderValue * 0.30;

    // ❌ PROBLEMA: Apenas registra log, não cria comissões reais
    await supabase.from('commission_logs').insert({
      order_id: orderId,
      action: 'COMMISSION_CALCULATED',
      details: JSON.stringify({
        affiliate_id: affiliate.id,
        referral_code: order.referral_code,
        order_value: orderValue,
        total_commission: totalCommission,
        calculated_at: new Date().toISOString()
      })
    });

    return {
      calculated: true,
      affiliateId: affiliate.id,
      affiliateName: profile?.full_name,
      totalCommission
    };
  } catch (error) {
    console.error('[AsaasWebhook] Erro ao processar comissões:', error);
    return { calculated: false };
  }
}
```


### ⚠️ PROBLEMAS IDENTIFICADOS

1. **Busca redundante:** Busca afiliado pelo `referral_code` quando deveria usar `affiliate_n1_id` já salvo
2. **Não busca N2 e N3:** Ignora `affiliate_n2_id` e `affiliate_n3_id` da tabela orders
3. **Não cria comissões:** Apenas calcula total mas não cria registros na tabela `commissions`
4. **Não chama função SQL:** Não usa `calculate_commission_split()` que já existe no banco

### 💡 CAUSA RAIZ
O webhook **não utiliza** os dados de afiliados já salvos no pedido e **não cria** registros de comissões.

### ✅ SOLUÇÃO SUGERIDA

```typescript
async function processOrderCommissions(orderId: string, orderValue: number) {
  try {
    // CORRIGIR: Buscar pedido com IDs dos afiliados
    const { data: order } = await supabase
      .from('orders')
      .select('id, referral_code, affiliate_n1_id, affiliate_n2_id, affiliate_n3_id')
      .eq('id', orderId)
      .single();

    if (!order?.affiliate_n1_id) {
      console.log(`[AsaasWebhook] Pedido ${orderId} sem afiliado`);
      return { calculated: false };
    }

    // ADICIONAR: Chamar função SQL para calcular e criar comissões
    const { data: splitResult, error } = await supabase
      .rpc('calculate_commission_split', { p_order_id: orderId });

    if (error) {
      console.error('[AsaasWebhook] Erro ao calcular comissões:', error);
      return { calculated: false };
    }

    console.log(`[AsaasWebhook] Comissões calculadas: Split ID ${splitResult}`);

    return {
      calculated: true,
      affiliateId: order.affiliate_n1_id,
      totalCommission: orderValue * 0.30
    };
  } catch (error) {
    console.error('[AsaasWebhook] Erro ao processar comissões:', error);
    return { calculated: false };
  }
}
```

---

## 🐛 BUG 05 - Função SQL calculate_commission_split

### 📍 LOCALIZAÇÃO
**Banco de Dados:** PostgreSQL (Supabase)  
**Função:** `calculate_commission_split(p_order_id UUID)`  
**Schema:** public

### 🔍 CÓDIGO ATUAL (EXTRAÍDO DO BANCO)

```sql
CREATE OR REPLACE FUNCTION calculate_commission_split(p_order_id UUID)
RETURNS UUID AS $$
DECLARE
  v_split_id UUID;
  v_order_total_cents INTEGER;
  v_factory_value_cents INTEGER;
  v_commission_value_cents INTEGER;
  
  -- Afiliados da rede
  v_n1_affiliate_id UUID;
  v_n2_affiliate_id UUID;
  v_n3_affiliate_id UUID;
  
  -- Valores base das comissões
  v_n1_value_cents INTEGER := 0;
  v_n2_value_cents INTEGER := 0;
  v_n3_value_cents INTEGER := 0;
  
  -- Gestores (base 5% cada)
  v_renum_percentage DECIMAL(5,2) := 5.00;
  v_jb_percentage DECIMAL(5,2) := 5.00;
  v_renum_value_cents INTEGER;
  v_jb_value_cents INTEGER;
  
  -- Redistribuição
  v_available_percentage DECIMAL(5,2) := 0;
  v_redistribution_bonus DECIMAL(5,2) := 0;
  v_redistribution_applied BOOLEAN := false;
  v_redistribution_details JSONB;
BEGIN
  -- Buscar dados do pedido
  SELECT total_cents, affiliate_n1_id
  INTO v_order_total_cents, v_n1_affiliate_id
  FROM orders
  WHERE id = p_order_id
  AND deleted_at IS NULL;
  
  IF v_order_total_cents IS NULL THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;
  
  -- ❌ PROBLEMA: Busca N2 e N3 da tabela affiliate_network
  -- (deveria buscar de orders.affiliate_n2_id e orders.affiliate_n3_id)
  IF v_n1_affiliate_id IS NOT NULL THEN
    SELECT 
      n2.affiliate_id,
      n3.affiliate_id
    INTO v_n2_affiliate_id, v_n3_affiliate_id
    FROM affiliate_network n1
    LEFT JOIN affiliate_network n2 ON n2.affiliate_id = n1.parent_id
    LEFT JOIN affiliate_network n3 ON n3.affiliate_id = n2.parent_id
    WHERE n1.affiliate_id = (
      SELECT id FROM affiliates WHERE user_id = v_n1_affiliate_id AND deleted_at IS NULL
    );
    
    -- Calcular comissões...
  END IF;
  
  -- ... resto da função ...
END;
$$ LANGUAGE plpgsql;
```


### ⚠️ PROBLEMAS IDENTIFICADOS

1. **Busca N2/N3 errada:** Usa `affiliate_network` ao invés de ler `orders.affiliate_n2_id` e `orders.affiliate_n3_id`
2. **Dependência de tabela obsoleta:** Depende de `affiliate_network` que pode estar desatualizada
3. **Lógica complexa desnecessária:** Faz JOINs quando os IDs já estão no pedido

### 💡 CAUSA RAIZ
A função SQL foi criada **antes** dos campos `affiliate_n2_id` e `affiliate_n3_id` serem adicionados à tabela `orders`.

### ✅ SOLUÇÃO SUGERIDA

```sql
CREATE OR REPLACE FUNCTION calculate_commission_split(p_order_id UUID)
RETURNS UUID AS $$
DECLARE
  -- ... declarações existentes ...
BEGIN
  -- CORRIGIR: Buscar N1, N2 e N3 diretamente da tabela orders
  SELECT 
    total_cents, 
    affiliate_n1_id,
    affiliate_n2_id,
    affiliate_n3_id
  INTO 
    v_order_total_cents, 
    v_n1_affiliate_id,
    v_n2_affiliate_id,
    v_n3_affiliate_id
  FROM orders
  WHERE id = p_order_id
  AND deleted_at IS NULL;
  
  IF v_order_total_cents IS NULL THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;
  
  -- REMOVER: Busca na affiliate_network (não é mais necessária)
  -- Os IDs já estão disponíveis nas variáveis acima
  
  -- Calcular comissões por nível
  IF v_n1_affiliate_id IS NOT NULL THEN
    v_n1_value_cents := ROUND(v_order_total_cents * 0.15); -- 15%
  END IF;
  
  IF v_n2_affiliate_id IS NOT NULL THEN
    v_n2_value_cents := ROUND(v_order_total_cents * 0.03); -- 3%
  ELSE
    v_available_percentage := v_available_percentage + 3.00;
  END IF;
  
  IF v_n3_affiliate_id IS NOT NULL THEN
    v_n3_value_cents := ROUND(v_order_total_cents * 0.02); -- 2%
  ELSE
    v_available_percentage := v_available_percentage + 2.00;
  END IF;
  
  -- ... resto da lógica de redistribuição ...
END;
$$ LANGUAGE plpgsql;
```

---

## 🐛 BUG 06 - affiliate_hierarchy (Tabela Obsoleta)

### 📍 LOCALIZAÇÕES ENCONTRADAS

#### 1. **src/services/frontend/affiliate.service.ts**

**Linha 246:** Busca rede do afiliado
```typescript
const { data: networkData } = await supabase
  .from('affiliate_hierarchy')  // ❌ Tabela obsoleta
  .select(`
    id,
    // ...
  `)
```

**Linha 534:** Busca descendentes
```typescript
const { data: descendants, error: hierarchyError } = await supabase
  .from('affiliate_hierarchy')  // ❌ Tabela obsoleta
  .select('*')
  .contains('path', [currentAffiliate.id])
```

**Linha 1028:** Comentário deprecado
```typescript
/**
 * Cria entrada na rede genealógica
 * @deprecated Não é mais necessário - a view materializada affiliate_hierarchy
 * é atualizada automaticamente via trigger quando affiliates.referred_by é definido
 */
```

**Linha 1301:** Busca rede completa
```typescript
const { data: networkData, error } = await supabase
  .from('affiliate_hierarchy')  // ❌ Tabela obsoleta
  .select('*')
  .eq('root_id', affiliateId)
```

#### 2. **src/services/affiliates/affiliate.service.ts**

**Linha 246:** Busca rede usando view materializada
```typescript
const { data, error } = await supabase
  .from('affiliate_hierarchy')  // ❌ Tabela obsoleta
  .select('*')
  .eq('root_id', affiliateId)
```

**Linha 369:** Busca árvore genealógica
```typescript
const { data, error } = await supabase
  .from('affiliate_hierarchy')  // ❌ Tabela obsoleta
  .select('*')
  .eq('root_id', affiliateId)
```

