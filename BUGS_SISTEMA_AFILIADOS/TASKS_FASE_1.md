# 🔧 TASKS FASE 1 - CORREÇÃO BUGS SISTEMA AFILIADOS
## Autorizado por: Renato Carraro | Data: 11/01/2026

---

## 📋 ORDEM DE EXECUÇÃO

### BLOCO 1: Sistema de Comissões (INTERDEPENDENTES)
- ✅ Bug 01 - Salvar affiliate_nX_id no checkout
- ✅ Bug 04 - Criar comissões no webhook
- ✅ Bug 05 - Corrigir função SQL

### BLOCO 2: Queries Diretas (INDEPENDENTE)
- ✅ Bug 06 - Substituir affiliate_hierarchy

### BLOCO 3: Consolidação Trackers (INDEPENDENTE)
- ✅ Bug 03 - Consolidar ReferralTrackers

---

## 🎯 BLOCO 1 - SISTEMA DE COMISSÕES

### ⚠️ CRÍTICO: Implementar os 3 bugs JUNTOS
**Motivo:** Bug 01 salva IDs → Bug 04 lê IDs → Bug 05 calcula comissões

---

## 🐛 TASK 1.1 - BUG 01: Salvar affiliate_nX_id

### Arquivo: `api/checkout.js`

### Passo 1: Adicionar nova função (após linha 470)

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


### Passo 2: Modificar função savePaymentToDatabase (linha 379)

**LOCALIZAR a linha que cria o supabase client e ADICIONAR logo após:**

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

    // ✅ NOVO: Buscar rede de afiliados se houver referralCode
    const affiliateNetwork = await getAffiliateNetwork(data.referralCode, supabase);
    
    // ✅ NOVO: Atualizar pedido com dados dos afiliados
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

    // ... resto do código existente permanece igual ...
```

### Passo 3: Adicionar referralCode nas chamadas (2 locais)

**LOCALIZAR linha ~314 (pagamento com cartão):**

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
  referralCode: referralCode || null  // ✅ ADICIONAR ESTA LINHA
});
```

**LOCALIZAR linha ~344 (pagamento PIX):**

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
  referralCode: referralCode || null  // ✅ ADICIONAR ESTA LINHA
});
```

### ✅ Checklist Bug 01:
- [ ] Adicionar função `getAffiliateNetwork()` após linha 470
- [ ] Modificar `savePaymentToDatabase()` linha 379
- [ ] Adicionar `referralCode` na chamada linha ~314
- [ ] Adicionar `referralCode` na chamada linha ~344
- [ ] Testar com pedido real contendo referralCode

---

## 🐛 TASK 1.2 - BUG 04: Criar Comissões no Webhook

### Arquivo: `src/api/routes/webhooks/asaas-webhook.ts`

### Passo 1: Substituir função processOrderCommissions (linha 397-470)

**DELETAR a função atual e SUBSTITUIR por:**

```typescript
/**
 * Processa comissões do pedido
 * ✅ CORRIGIDO: Lê IDs dos afiliados de orders e chama função SQL
 */
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

### ✅ Checklist Bug 04:
- [ ] Substituir função `processOrderCommissions()` completa
- [ ] Verificar imports do supabase no topo do arquivo
- [ ] Testar webhook com pagamento confirmado
- [ ] Verificar se comissões são criadas na tabela commission_splits

---

## 🐛 TASK 1.3 - BUG 05: Corrigir Função SQL

### Banco de Dados: Supabase (via Power ou Migration)

### Passo 1: Criar migration SQL

**Criar arquivo:** `supabase/migrations/20260111000000_fix_commission_split_function.sql`


**OU aplicar via Supabase Power:**

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
    v_redistribution_bonus := v_available_percentage / 2;
    
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

### ✅ Checklist Bug 05:
- [ ] Criar migration SQL no Supabase
- [ ] Aplicar migration via Supabase Power ou CLI
- [ ] Testar função com pedido real: `SELECT calculate_commission_split('order_id_aqui');`
- [ ] Verificar se split é criado corretamente na tabela commission_splits

---

## ✅ VALIDAÇÃO BLOCO 1 (Bugs 01 + 04 + 05)

### Teste End-to-End:
1. Criar pedido com referralCode via checkout
2. Verificar se affiliate_n1_id, n2_id, n3_id foram salvos em orders
3. Simular webhook de pagamento confirmado
4. Verificar se comissões foram criadas em commission_splits
5. Validar valores calculados (15% N1, 3% N2, 2% N3, gestores)

---

## 🎯 BLOCO 2 - QUERIES DIRETAS

## 🐛 TASK 2.1 - BUG 06: Substituir affiliate_hierarchy

### Arquivos Afetados:
- `src/services/frontend/affiliate.service.ts` (4 referências)
- `src/services/affiliates/affiliate.service.ts` (2 referências)

### Passo 1: src/services/frontend/affiliate.service.ts

#### Substituição 1 - Linha 246: Buscar rede do afiliado

**ANTES:**
```typescript
const { data: networkData } = await supabase
  .from('affiliate_hierarchy')
  .select(`id, ...`)
```

**DEPOIS:**
```typescript
// Buscar afiliados diretos (N1)
const { data: networkData } = await supabase
  .from('affiliates')
  .select('id, user_id, referral_code, referred_by, status, created_at')
  .eq('referred_by', affiliateId)
  .eq('status', 'active')
  .is('deleted_at', null)
  .order('created_at', { ascending: false });
```

#### Substituição 2 - Linha 534: Buscar descendentes

**ANTES:**
```typescript
const { data: descendants, error: hierarchyError } = await supabase
  .from('affiliate_hierarchy')
  .select('*')
  .contains('path', [currentAffiliate.id])
```

**DEPOIS:**
```typescript
// Buscar todos os descendentes (N1 + N2)
const descendants = [];
let hierarchyError = null;

try {
  // Buscar N1 (diretos)
  const { data: n1List } = await supabase
    .from('affiliates')
    .select('id, user_id, referral_code, referred_by')
    .eq('referred_by', currentAffiliate.id)
    .eq('status', 'active')
    .is('deleted_at', null);
  
  if (n1List && n1List.length > 0) {
    descendants.push(...n1List);
    
    // Buscar N2 (indiretos) para cada N1
    for (const n1 of n1List) {
      const { data: n2List } = await supabase
        .from('affiliates')
        .select('id, user_id, referral_code, referred_by')
        .eq('referred_by', n1.id)
        .eq('status', 'active')
        .is('deleted_at', null);
      
      if (n2List && n2List.length > 0) {
        descendants.push(...n2List);
      }
    }
  }
} catch (error) {
  hierarchyError = error;
}
```


#### Substituição 3 - Linha 1028-1238: Deletar função deprecada

**AÇÃO:** Deletar completamente a função `createNetworkEntry()` e seus comentários

#### Substituição 4 - Linha 1301: Buscar rede completa

**ANTES:**
```typescript
const { data: networkData, error } = await supabase
  .from('affiliate_hierarchy')
  .select('*')
  .eq('root_id', affiliateId)
```

**DEPOIS:**
```typescript
// Buscar rede completa (N1 + N2 + N3)
let networkData = [];
let error = null;

try {
  // N1 - Diretos
  const { data: n1List } = await supabase
    .from('affiliates')
    .select('id, user_id, referral_code, referred_by, status, created_at')
    .eq('referred_by', affiliateId)
    .eq('status', 'active')
    .is('deleted_at', null);
  
  if (!n1List) {
    networkData = [];
  } else {
    for (const n1 of n1List) {
      const n1Node = { ...n1, level: 1, children: [] };
      
      // N2 - Indiretos do N1
      const { data: n2List } = await supabase
        .from('affiliates')
        .select('id, user_id, referral_code, referred_by, status, created_at')
        .eq('referred_by', n1.id)
        .eq('status', 'active')
        .is('deleted_at', null);
      
      if (n2List) {
        for (const n2 of n2List) {
          const n2Node = { ...n2, level: 2, children: [] };
          
          // N3 - Indiretos do N2
          const { data: n3List } = await supabase
            .from('affiliates')
            .select('id, user_id, referral_code, referred_by, status, created_at')
            .eq('referred_by', n2.id)
            .eq('status', 'active')
            .is('deleted_at', null);
          
          if (n3List) {
            n2Node.children = n3List.map(n3 => ({ ...n3, level: 3 }));
          }
          
          n1Node.children.push(n2Node);
        }
      }
      
      networkData.push(n1Node);
    }
  }
} catch (err) {
  error = err;
}
```

### Passo 2: src/services/affiliates/affiliate.service.ts

#### Substituição 5 - Linha 246: Reescrever getNetwork()

**SUBSTITUIR função completa:**

```typescript
/**
 * Busca rede completa do afiliado (N1 + N2 + N3)
 * ✅ CORRIGIDO: Usa queries diretas ao invés de affiliate_hierarchy
 */
async getNetwork(affiliateId: string): Promise<Affiliate[]> {
  try {
    const allAffiliates: Affiliate[] = [];
    
    // Buscar N1 (diretos)
    const { data: n1List, error: n1Error } = await supabase
      .from('affiliates')
      .select('*')
      .eq('referred_by', affiliateId)
      .eq('status', 'active')
      .is('deleted_at', null);
    
    if (n1Error) throw n1Error;
    if (!n1List || n1List.length === 0) return [];
    
    allAffiliates.push(...n1List);
    
    // Buscar N2 (para cada N1)
    for (const n1 of n1List) {
      const { data: n2List } = await supabase
        .from('affiliates')
        .select('*')
        .eq('referred_by', n1.id)
        .eq('status', 'active')
        .is('deleted_at', null);
      
      if (n2List && n2List.length > 0) {
        allAffiliates.push(...n2List);
        
        // Buscar N3 (para cada N2)
        for (const n2 of n2List) {
          const { data: n3List } = await supabase
            .from('affiliates')
            .select('*')
            .eq('referred_by', n2.id)
            .eq('status', 'active')
            .is('deleted_at', null);
          
          if (n3List && n3List.length > 0) {
            allAffiliates.push(...n3List);
          }
        }
      }
    }
    
    return allAffiliates;
  } catch (error) {
    console.error('[AffiliateService] Erro ao buscar rede:', error);
    throw error;
  }
}
```

#### Substituição 6 - Linha 369: Reescrever getNetworkTree()

**SUBSTITUIR função completa:**

```typescript
/**
 * Busca árvore genealógica do afiliado
 * ✅ CORRIGIDO: Usa queries diretas ao invés de affiliate_hierarchy
 */
async getNetworkTree(affiliateId: string): Promise<NetworkTree | null> {
  try {
    // Buscar dados do afiliado raiz
    const { data: rootAffiliate, error: rootError } = await supabase
      .from('affiliates')
      .select('*')
      .eq('id', affiliateId)
      .single();
    
    if (rootError || !rootAffiliate) return null;
    
    // Construir árvore recursivamente
    const tree: NetworkTree = {
      affiliate: rootAffiliate,
      level: 0,
      children: await this.buildTreeLevel(affiliateId, 1)
    };
    
    return tree;
  } catch (error) {
    console.error('[AffiliateService] Erro ao buscar árvore:', error);
    return null;
  }
}

/**
 * Constrói um nível da árvore recursivamente
 * Limita a 3 níveis (N1, N2, N3)
 */
private async buildTreeLevel(parentId: string, level: number): Promise<NetworkTree[]> {
  if (level > 3) return []; // Limite de profundidade
  
  const { data: children } = await supabase
    .from('affiliates')
    .select('*')
    .eq('referred_by', parentId)
    .eq('status', 'active')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });
  
  if (!children || children.length === 0) return [];
  
  const treeNodes: NetworkTree[] = [];
  
  for (const child of children) {
    treeNodes.push({
      affiliate: child,
      level,
      children: await this.buildTreeLevel(child.id, level + 1)
    });
  }
  
  return treeNodes;
}
```

### ✅ Checklist Bug 06:
- [ ] Substituir 4 referências em `src/services/frontend/affiliate.service.ts`
- [ ] Deletar função `createNetworkEntry()` deprecada
- [ ] Substituir 2 referências em `src/services/affiliates/affiliate.service.ts`
- [ ] Adicionar método `buildTreeLevel()` privado
- [ ] Testar busca de rede com afiliado que tem N1+N2+N3
- [ ] Testar busca de rede com afiliado sem indicados

---

## 🎯 BLOCO 3 - CONSOLIDAÇÃO TRACKERS

## 🐛 TASK 3.1 - BUG 03: Consolidar ReferralTrackers

### Passo 1: Padronizar chave em src/utils/referral-tracker.ts

**LOCALIZAR linha ~12:**

```typescript
export class ReferralTracker {
  // ✅ CORRIGIDO: Usar chave padrão do projeto
  private static readonly STORAGE_KEY = 'slim_referral_code';
  private static readonly EXPIRES_KEY = 'slim_referral_expires';
  private static readonly UTM_KEY = 'slim_referral_utm';
  private static readonly TTL_DAYS = 30;
```

### Passo 2: Adicionar migração de dados antigos

**LOCALIZAR função `initialize()` e ADICIONAR no início:**

```typescript
static initialize(): void {
  try {
    // Verificar se estamos no browser
    if (typeof window === 'undefined') return;
    
    // ✅ NOVO: Migrar código antigo se existir
    const oldCode = localStorage.getItem('referral_code');
    const newCode = localStorage.getItem('slim_referral_code');
    
    if (oldCode && !newCode) {
      // Migrar dados antigos
      try {
        const oldData = JSON.parse(oldCode);
        localStorage.setItem('slim_referral_code', oldCode);
        localStorage.removeItem('referral_code');
        console.log('[ReferralTracker] Código migrado: referral_code → slim_referral_code');
      } catch {
        // Se não for JSON, migrar como string simples
        localStorage.setItem('slim_referral_code', oldCode);
        localStorage.removeItem('referral_code');
      }
    }
    
    // Capturar código se presente na URL
    this.captureReferralCode();
    
    console.log('[ReferralTracker] Sistema inicializado');
  } catch (error) {
    console.error('[ReferralTracker] Erro na inicialização:', error);
  }
}
```

### Passo 3: Deletar arquivo duplicado

```bash
# Deletar arquivo middleware
rm src/middleware/referral-tracker.ts
```

### Passo 4: Atualizar imports

**Buscar todos os arquivos que importam o middleware:**

```bash
grep -r "from '@/middleware/referral-tracker'" src/
grep -r "from '../middleware/referral-tracker'" src/
```

**Para cada arquivo encontrado, SUBSTITUIR:**

```typescript
// ANTES (errado):
import { ReferralTracker } from '@/middleware/referral-tracker';
import { ReferralTracker } from '../middleware/referral-tracker';

// DEPOIS (correto):
import { ReferralTracker } from '@/utils/referral-tracker';
```

### ✅ Checklist Bug 03:
- [ ] Padronizar chave para `slim_referral_code` em utils/referral-tracker.ts
- [ ] Adicionar migração de dados antigos na função `initialize()`
- [ ] Deletar arquivo `src/middleware/referral-tracker.ts`
- [ ] Buscar e atualizar todos os imports
- [ ] Testar captura de código na URL
- [ ] Testar recuperação no checkout
- [ ] Verificar migração de dados antigos (se houver)

---

## ✅ VALIDAÇÃO FINAL FASE 1

### Testes Obrigatórios:

#### Sistema de Comissões (Bugs 01+04+05):
- [ ] Pedido com referralCode salva affiliate_n1_id, n2_id, n3_id
- [ ] Webhook cria comissões via função SQL
- [ ] Valores calculados estão corretos (15%, 3%, 2%, gestores)
- [ ] Redistribuição funciona quando falta N2 ou N3

#### Queries Diretas (Bug 06):
- [ ] Busca de rede retorna N1, N2, N3 corretamente
- [ ] Árvore genealógica é construída sem erros
- [ ] Performance < 500ms para 50 afiliados

#### Consolidação Trackers (Bug 03):
- [ ] Código capturado na URL é salvo corretamente
- [ ] Código é recuperado no checkout
- [ ] Migração de dados antigos funciona
- [ ] Não há mais conflito de chaves

---

## 📊 MÉTRICAS DE SUCESSO

- ✅ 5 bugs corrigidos
- ✅ Sistema de comissões funcionando end-to-end
- ✅ Código consolidado e sem duplicação
- ✅ Performance mantida ou melhorada
- ✅ Sem quebra de funcionalidades existentes

---

**FASE 1 PRONTA PARA IMPLEMENTAÇÃO!**  
**Próxima etapa:** FASE 2 (após validação da Fase 1)
