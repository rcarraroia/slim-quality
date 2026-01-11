# 🔧 SOLUÇÕES PRONTAS - BUGS SISTEMA AFILIADOS
## Código Real Pronto para Implementar

---

## 🐛 BUG 01 - SOLUÇÃO COMPLETA

### Arquivo: `api/checkout.js`

**ADICIONAR nova função (após linha 470):**

```javascript
/**
 * Busca rede de afiliados pelo referral code
 * Retorna IDs de N1, N2 e N3
 */
async function getAffiliateNetwork(referralCode, supabase) {
  try {
    if (!referralCode) {
      return { n1: null, n2: null, n3: null };
    }
    
    // Buscar N1 pelo referral_code
    const { data: n1, error: n1Error } = await supabase
      .from('affiliates')
      .select('id, referred_by')
      .eq('referral_code', referralCode)
      .eq('status', 'active')
      .is('deleted_at', null)
      .single();
    
    if (n1Error || !n1) {
      console.log('N1 não encontrado:', referralCode);
      return { n1: null, n2: null, n3: null };
    }
    
    let n2Id = null;
    let n3Id = null;
    
    // Buscar N2 (quem indicou o N1)
    if (n1.referred_by) {
      const { data: n2 } = await supabase
        .from('affiliates')
        .select('id, referred_by')
        .eq('id', n1.referred_by)
        .eq('status', 'active')
        .is('deleted_at', null)
        .single();
      
      if (n2) {
        n2Id = n2.id;
        
        // Buscar N3 (quem indicou o N2)
        if (n2.referred_by) {
          const { data: n3 } = await supabase
            .from('affiliates')
            .select('id')
            .eq('id', n2.referred_by)
            .eq('status', 'active')
            .is('deleted_at', null)
            .single();
          
          if (n3) {
            n3Id = n3.id;
          }
        }
      }
    }
    
    console.log('Rede encontrada:', { n1: n1.id, n2: n2Id, n3: n3Id });
    
    return {
      n1: n1.id,
      n2: n2Id,
      n3: n3Id
    };
  } catch (error) {
    console.error('Erro ao buscar rede de afiliados:', error);
    return { n1: null, n2: null, n3: null };
  }
}
```

**MODIFICAR função savePaymentToDatabase (linha 379):**

```javascript
async function savePaymentToDatabase(data) {
  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase não configurado para salvar pagamento');
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // NOVO: Buscar rede de afiliados se houver referralCode
    const affiliateNetwork = await getAffiliateNetwork(data.referralCode, supabase);
    
    // NOVO: Atualizar pedido com dados dos afiliados
    if (data.referralCode) {
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          referral_code: data.referralCode,
          affiliate_n1_id: affiliateNetwork.n1,
          affiliate_n2_id: affiliateNetwork.n2,
          affiliate_n3_id: affiliateNetwork.n3,
          updated_at: new Date().toISOString()
        })
        .eq('id', data.orderId);
      
      if (updateError) {
        console.error('Erro ao atualizar afiliados do pedido:', updateError);
      } else {
        console.log(`Pedido ${data.orderId} vinculado aos afiliados:`, affiliateNetwork);
      }
    }

    // ... resto do código existente (payments, asaas_transactions) ...
  } catch (error) {
    console.error('Erro ao salvar pagamento no banco:', error);
  }
}
```

**MODIFICAR chamadas para savePaymentToDatabase (adicionar referralCode):**

Linha ~314:
```javascript
await savePaymentToDatabase({
  orderId,
  asaasPaymentId: paymentData.id,
  asaasCustomerId,
  billingType,
  amount,
  status: isConfirmed ? 'confirmed' : 'pending',
  installments: installments || 1,
  cardBrand: cardPaymentData.creditCard?.creditCardBrand,
  cardLastDigits: creditCard.number?.slice(-4),
  referralCode: referralCode || null  // ADICIONAR
});
```

Linha ~344:
```javascript
await savePaymentToDatabase({
  orderId,
  asaasPaymentId: paymentData.id,
  asaasCustomerId,
  billingType,
  amount,
  status: 'pending',
  installments: 1,
  pixQrCode: pixQrCode,
  pixCopyPaste: pixCopyPaste,
  pixExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  referralCode: referralCode || null  // ADICIONAR
});
```

---

## 🐛 BUG 04 - SOLUÇÃO COMPLETA

### Arquivo: `src/api/routes/webhooks/asaas-webhook.ts`

**SUBSTITUIR função processOrderCommissions (linha 397-470):**

```typescript
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
    // Buscar pedido com IDs dos afiliados
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, referral_code, affiliate_n1_id, affiliate_n2_id, affiliate_n3_id')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.error('[AsaasWebhook] Erro ao buscar pedido:', orderError);
      return { calculated: false };
    }

    if (!order.affiliate_n1_id) {
      console.log(`[AsaasWebhook] Pedido ${orderId} sem afiliado`);
      return { calculated: false };
    }

    // Chamar função SQL para calcular e criar comissões
    const { data: splitId, error: splitError } = await supabase
      .rpc('calculate_commission_split', { p_order_id: orderId });

    if (splitError) {
      console.error('[AsaasWebhook] Erro ao calcular comissões:', splitError);
      
      // Registrar erro no log
      await supabase.from('commission_logs').insert({
        order_id: orderId,
        action: 'COMMISSION_ERROR',
        details: JSON.stringify({
          error: splitError.message,
          order_value: orderValue,
          affiliate_n1_id: order.affiliate_n1_id,
          error_at: new Date().toISOString()
        })
      });
      
      return { calculated: false };
    }

    // Buscar nome do afiliado N1
    const { data: affiliate } = await supabase
      .from('affiliates')
      .select('id, user_id')
      .eq('id', order.affiliate_n1_id)
      .single();

    let affiliateName = 'Desconhecido';
    if (affiliate) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', affiliate.user_id)
        .single();
      
      affiliateName = profile?.full_name || 'Desconhecido';
    }

    const totalCommission = orderValue * 0.30;

    console.log(`[AsaasWebhook] ✅ Comissões calculadas: Split ID ${splitId} | Total: R$ ${totalCommission.toFixed(2)}`);

    return {
      calculated: true,
      affiliateId: order.affiliate_n1_id,
      affiliateName,
      totalCommission
    };
  } catch (error) {
    console.error('[AsaasWebhook] Erro ao processar comissões:', error);
    return { calculated: false };
  }
}
```

---

## 🐛 BUG 05 - SOLUÇÃO COMPLETA

### Migration SQL para Supabase

**Criar migration:** `20260111000000_fix_commission_split_function.sql`

```sql
-- Migration: Corrigir função calculate_commission_split
-- Bug: Função busca N2/N3 de affiliate_network ao invés de orders
-- Fix: Ler affiliate_n2_id e affiliate_n3_id direto da tabela orders

CREATE OR REPLACE FUNCTION calculate_commission_split(p_order_id UUID)
RETURNS UUID AS $$
DECLARE
  v_split_id UUID;
  v_order_total_cents INTEGER;
  v_factory_value_cents INTEGER;
  v_commission_value_cents INTEGER;
  
  -- Afiliados da rede (agora lidos direto de orders)
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
  -- ✅ CORRIGIDO: Buscar N1, N2 e N3 direto da tabela orders
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
  
  -- Verificar se já existe split para este pedido
  IF EXISTS (SELECT 1 FROM commission_splits WHERE order_id = p_order_id) THEN
    RAISE EXCEPTION 'Commission split already exists for order: %', p_order_id;
  END IF;
  
  -- Calcular valores base (70% fábrica, 30% comissões)
  v_factory_value_cents := ROUND(v_order_total_cents * 0.70);
  v_commission_value_cents := v_order_total_cents - v_factory_value_cents;
  
  -- Calcular comissões por nível
  IF v_n1_affiliate_id IS NOT NULL THEN
    v_n1_value_cents := ROUND(v_order_total_cents * 0.15); -- 15%
  ELSE
    v_available_percentage := v_available_percentage + 15.00;
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
  
  -- Aplicar redistribuição se necessário
  IF v_available_percentage > 0 THEN
    v_redistribution_applied := true;
    v_redistribution_bonus := v_available_percentage / 2; -- Dividir igualmente
    
    v_renum_percentage := v_renum_percentage + v_redistribution_bonus;
    v_jb_percentage := v_jb_percentage + v_redistribution_bonus;
    
    v_redistribution_details := jsonb_build_object(
      'available_percentage', v_available_percentage,
      'bonus_per_manager', v_redistribution_bonus,
      'reason', CASE 
        WHEN v_n1_affiliate_id IS NULL THEN 'no_affiliate'
        WHEN v_n2_affiliate_id IS NULL AND v_n3_affiliate_id IS NULL THEN 'only_n1'
        WHEN v_n3_affiliate_id IS NULL THEN 'n1_and_n2_only'
        ELSE 'complete_network'
      END
    );
  END IF;
  
  -- Calcular valores finais dos gestores
  v_renum_value_cents := ROUND(v_order_total_cents * v_renum_percentage / 100);
  v_jb_value_cents := ROUND(v_order_total_cents * v_jb_percentage / 100);
  
  -- Criar registro de split
  INSERT INTO commission_splits (
    order_id,
    total_order_value_cents,
    factory_percentage,
    factory_value_cents,
    commission_percentage,
    commission_value_cents,
    n1_affiliate_id,
    n1_percentage,
    n1_value_cents,
    n2_affiliate_id,
    n2_percentage,
    n2_value_cents,
    n3_affiliate_id,
    n3_percentage,
    n3_value_cents,
    renum_percentage,
    renum_value_cents,
    jb_percentage,
    jb_value_cents,
    redistribution_applied,
    redistribution_details,
    status
  ) VALUES (
    p_order_id,
    v_order_total_cents,
    70.00,
    v_factory_value_cents,
    30.00,
    v_commission_value_cents,
    v_n1_affiliate_id,
    CASE WHEN v_n1_value_cents > 0 THEN 15.00 END,
    CASE WHEN v_n1_value_cents > 0 THEN v_n1_value_cents END,
    v_n2_affiliate_id,
    CASE WHEN v_n2_value_cents > 0 THEN 3.00 END,
    CASE WHEN v_n2_value_cents > 0 THEN v_n2_value_cents END,
    v_n3_affiliate_id,
    CASE WHEN v_n3_value_cents > 0 THEN 2.00 END,
    CASE WHEN v_n3_value_cents > 0 THEN v_n3_value_cents END,
    v_renum_percentage,
    v_renum_value_cents,
    v_jb_percentage,
    v_jb_value_cents,
    v_redistribution_applied,
    v_redistribution_details,
    'calculated'
  ) RETURNING id INTO v_split_id;
  
  RETURN v_split_id;
END;
$$ LANGUAGE plpgsql;
```

---

## ✅ CHECKLIST DE IMPLEMENTAÇÃO

### BUG 01:
- [ ] Adicionar função `getAffiliateNetwork()` em `api/checkout.js`
- [ ] Modificar função `savePaymentToDatabase()`
- [ ] Adicionar `referralCode` nas 2 chamadas
- [ ] Testar com pedido real

### BUG 04:
- [ ] Substituir função `processOrderCommissions()` em `asaas-webhook.ts`
- [ ] Testar webhook com pagamento confirmado
- [ ] Verificar se comissões são criadas

### BUG 05:
- [ ] Criar migration SQL no Supabase
- [ ] Aplicar migration
- [ ] Testar função com pedido real

---

**Código pronto para implementar!**  
**Próximo passo:** Renato aprovar e Kiro implementar
