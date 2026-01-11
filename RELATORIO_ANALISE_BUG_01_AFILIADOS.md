# 🔍 RELATÓRIO DE ANÁLISE TÉCNICA - BUG 01: AFILIADOS NÃO PREENCHIDOS

**Data:** 10/01/2026  
**Tipo:** Análise Técnica (Não Implementação)  
**Objetivo:** Mapear fluxo real do sistema para identificar causa do BUG 01  

---

## 📋 SUMÁRIO EXECUTIVO

**BUG IDENTIFICADO:** Os campos `affiliate_n1_id`, `affiliate_n2_id` e `affiliate_n3_id` na tabela `orders` **NÃO estão sendo preenchidos** durante o checkout, mesmo quando há um `referral_code` válido.

**EVIDÊNCIA:**
```sql
-- Amostra de pedidos recentes (10/01/2026)
SELECT id, referral_code, affiliate_n1_id, affiliate_n2_id, affiliate_n3_id 
FROM orders 
ORDER BY created_at DESC LIMIT 4;

-- RESULTADO:
-- Todos os pedidos têm affiliate_n1_id, affiliate_n2_id, affiliate_n3_id = NULL
-- Mesmo quando referral_code está presente
```

**IMPACTO:** Sistema de comissões de afiliados **NÃO FUNCIONA** porque:
1. Webhook do Asaas não consegue identificar afiliados N2 e N3
2. Split de comissões é calculado incorretamente
3. Afiliados N2 e N3 não recebem suas comissões

---

## 🗄️ ESTRUTURA DA TABELA `orders`

### Campos Relacionados a Afiliados:

| Campo | Tipo | Nullable | Descrição |
|-------|------|----------|-----------|
| `referral_code` | varchar | YES | Código de referência do afiliado N1 |
| `affiliate_n1_id` | uuid | YES | **ID do afiliado N1 (vendedor direto)** |
| `affiliate_n2_id` | uuid | YES | **ID do afiliado N2 (indicado do N1)** |
| `affiliate_n3_id` | uuid | YES | **ID do afiliado N3 (indicado do N2)** |

### Status Atual dos Dados:

✅ **`referral_code`**: Sendo salvo corretamente (quando presente)  
❌ **`affiliate_n1_id`**: **SEMPRE NULL** (BUG)  
❌ **`affiliate_n2_id`**: **SEMPRE NULL** (BUG)  
❌ **`affiliate_n3_id`**: **SEMPRE NULL** (BUG)  

---

## 🔄 FLUXO ATUAL DO SISTEMA

### 1. CADASTRO DE AFILIADO

**Arquivo:** `src/services/frontend/affiliate.service.ts`  
**Método:** `registerAffiliate()`

```typescript
// ✅ CORRETO: Afiliado é criado com referred_by
const affiliateData = {
  user_id: user.id,
  name: data.name,
  email: data.email,
  referral_code: referralCode, // Gerado automaticamente
  referred_by: parentAffiliateId, // ID de quem indicou (se houver)
  status: 'pending'
};
```

**RESULTADO:** Campo `referred_by` é preenchido corretamente na tabela `affiliates`.

---

### 2. RASTREAMENTO DE CLIQUE

**Arquivo:** `src/services/frontend/affiliate.service.ts`  
**Método:** `trackReferralClick()`

```typescript
// ✅ CORRETO: Código é salvo no localStorage
const referralData = {
  code: referralCode,
  timestamp: Date.now(),
  expiry: Date.now() + (30 * 24 * 60 * 60 * 1000) // 30 dias
};
localStorage.setItem(STORAGE_KEYS.REFERRAL_CODE, JSON.stringify(referralData));
```

**RESULTADO:** `referral_code` fica disponível para uso no checkout.

---

### 3. CHECKOUT (ONDE O BUG OCORRE)

**Arquivo:** `src/services/checkout.service.ts`  
**Método:** `createOrder()`

#### 3.1. Código Atual (CORRETO):

```typescript
private async createOrder(customerId: string, data: CheckoutData): Promise<Order> {
  // ✅ Busca rede de afiliados
  let affiliateN1Id = data.affiliate?.affiliate_id;
  let affiliateN2Id = null;
  let affiliateN3Id = null;

  if (data.affiliate?.referral_code) {
    const network = await this.buildAffiliateNetwork(data.affiliate.referral_code);
    affiliateN1Id = network.n1?.id;
    affiliateN2Id = network.n2?.id || null;
    affiliateN3Id = network.n3?.id || null;
  }

  // ✅ Cria pedido com IDs dos afiliados
  const orderData: CreateOrderData = {
    customer_id: customerId,
    affiliate_n1_id: affiliateN1Id,
    affiliate_n2_id: affiliateN2Id,
    affiliate_n3_id: affiliateN3Id,
    referral_code: data.affiliate?.referral_code,
    // ... outros campos
  };

  const { data: order, error } = await supabase
    .from('orders')
    .insert(orderData)
    .select()
    .single();
}
```

#### 3.2. Método `buildAffiliateNetwork()` (CORRETO):

```typescript
private async buildAffiliateNetwork(referralCode: string): Promise<{
  n1?: { id: string; walletId: string };
  n2?: { id: string; walletId: string };
  n3?: { id: string; walletId: string };
}> {
  // ✅ Busca N1 pelo referral_code
  const { data: n1Affiliate } = await supabase
    .from('affiliates')
    .select('id, wallet_id, referred_by')
    .eq('referral_code', referralCode)
    .eq('status', 'active')
    .single();

  if (!n1Affiliate) return {};

  network.n1 = { id: n1Affiliate.id, walletId: n1Affiliate.wallet_id };

  // ✅ Busca N2 (quem indicou o N1)
  if (n1Affiliate.referred_by) {
    const { data: n2Affiliate } = await supabase
      .from('affiliates')
      .select('id, wallet_id, referred_by')
      .eq('id', n1Affiliate.referred_by)
      .eq('status', 'active')
      .single();

    if (n2Affiliate) {
      network.n2 = { id: n2Affiliate.id, walletId: n2Affiliate.wallet_id };

      // ✅ Busca N3 (quem indicou o N2)
      if (n2Affiliate.referred_by) {
        const { data: n3Affiliate } = await supabase
          .from('affiliates')
          .select('id, wallet_id')
          .eq('id', n2Affiliate.referred_by)
          .eq('status', 'active')
          .single();

        if (n3Affiliate) {
          network.n3 = { id: n3Affiliate.id, walletId: n3Affiliate.wallet_id };
        }
      }
    }
  }

  return network;
}
```

**ANÁLISE:** O código está **CORRETO** e deveria funcionar!

---

### 4. BACKEND CHECKOUT (Vercel Edge Function)

**Arquivo:** `api/checkout.js`  
**Método:** `calculateAffiliateSplit()`

```javascript
// ✅ CORRETO: Busca rede completa
async function calculateAffiliateSplit(referralCode, walletRenum, walletJB) {
  // Buscar N1 pelo referral_code
  const { data: n1Affiliate } = await supabase
    .from('affiliates')
    .select('id, wallet_id, referred_by')
    .eq('referral_code', referralCode)
    .eq('status', 'active')
    .single();

  // Buscar N2 (quem indicou o N1)
  if (n1Affiliate.referred_by) {
    const { data: n2Data } = await supabase
      .from('affiliates')
      .select('id, wallet_id, referred_by')
      .eq('id', n1Affiliate.referred_by)
      .eq('status', 'active')
      .single();
    
    // Buscar N3 (quem indicou o N2)
    if (n2Affiliate?.referred_by) {
      const { data: n3Data } = await supabase
        .from('affiliates')
        .select('id, wallet_id')
        .eq('id', n2Affiliate.referred_by)
        .eq('status', 'active')
        .single();
    }
  }
}
```

**ANÁLISE:** O código está **CORRETO** e calcula o split baseado na rede completa.

**PROBLEMA:** O backend **NÃO salva** os IDs dos afiliados na tabela `orders`!

---

### 5. WEBHOOK ASAAS (Processamento de Pagamento)

**Arquivo:** `src/api/routes/webhooks/asaas-webhook.ts`  
**Método:** `processOrderCommissions()`

```typescript
async function processOrderCommissions(orderId: string, orderValue: number) {
  // ❌ PROBLEMA: Busca apenas referral_code e affiliate_n1_id
  const { data: order } = await supabase
    .from('orders')
    .select('*, referral_code, affiliate_n1_id')
    .eq('id', orderId)
    .single();

  if (!order?.referral_code) {
    return { calculated: false };
  }

  // ❌ PROBLEMA: Busca afiliado novamente ao invés de usar affiliate_n1_id
  const { data: affiliate } = await supabase
    .from('affiliates')
    .select('id, user_id, wallet_id, referral_code, referred_by')
    .eq('referral_code', order.referral_code)
    .eq('status', 'active')
    .single();

  // ❌ PROBLEMA: Não busca N2 e N3, não calcula comissões completas
  const totalCommission = orderValue * 0.30;
  
  // ❌ PROBLEMA: Apenas registra log, não cria registros de comissões
}
```

**ANÁLISE:** Webhook **NÃO calcula comissões corretamente** porque:
1. Não usa os campos `affiliate_n2_id` e `affiliate_n3_id` (que estão NULL)
2. Não busca a rede completa de afiliados
3. Não cria registros na tabela `commissions`
4. Apenas registra um log genérico

---

## 🐛 CAUSA RAIZ DO BUG

### PROBLEMA 1: Backend Checkout NÃO Salva IDs dos Afiliados

**Localização:** `api/checkout.js` (Vercel Edge Function)

**O que acontece:**
1. ✅ Frontend (`checkout.service.ts`) calcula corretamente N1, N2, N3
2. ✅ Frontend salva os IDs no pedido via Supabase
3. ❌ **Backend (`api/checkout.js`) cria NOVO pedido via API Asaas**
4. ❌ **Backend NÃO salva os IDs dos afiliados no banco**

**Evidência:**
```javascript
// api/checkout.js - Função savePaymentToDatabase()
const paymentRecord = {
  order_id: data.orderId,
  payment_method: paymentMethodMap[data.billingType] || 'pix',
  amount_cents: Math.round(data.amount * 100),
  status: data.status,
  asaas_payment_id: data.asaasPaymentId,
  // ❌ NÃO salva affiliate_n1_id, affiliate_n2_id, affiliate_n3_id
};
```

### PROBLEMA 2: Webhook NÃO Calcula Comissões Completas

**Localização:** `src/api/routes/webhooks/asaas-webhook.ts`

**O que acontece:**
1. ❌ Webhook busca apenas `referral_code` e `affiliate_n1_id`
2. ❌ Não usa `affiliate_n2_id` e `affiliate_n3_id` (que estão NULL)
3. ❌ Não busca rede completa de afiliados
4. ❌ Calcula apenas comissão total (30%), não divide por níveis
5. ❌ Não cria registros na tabela `commissions`

---

## 📊 FLUXO ESPERADO vs FLUXO REAL

### FLUXO ESPERADO (Como Deveria Ser):

```
1. Cliente clica em link de afiliado
   └─ referral_code salvo no localStorage

2. Cliente faz checkout
   └─ Frontend busca rede (N1, N2, N3)
   └─ Frontend cria pedido com affiliate_n1_id, affiliate_n2_id, affiliate_n3_id

3. Backend processa pagamento
   └─ Backend cria cobrança no Asaas
   └─ Backend aplica split baseado na rede
   └─ Backend MANTÉM os IDs dos afiliados no pedido

4. Webhook confirma pagamento
   └─ Webhook lê affiliate_n1_id, affiliate_n2_id, affiliate_n3_id do pedido
   └─ Webhook cria registros de comissões para cada nível
   └─ Webhook atualiza totais dos afiliados
```

### FLUXO REAL (Como Está Acontecendo):

```
1. Cliente clica em link de afiliado
   ✅ referral_code salvo no localStorage

2. Cliente faz checkout
   ✅ Frontend busca rede (N1, N2, N3)
   ✅ Frontend cria pedido com affiliate_n1_id, affiliate_n2_id, affiliate_n3_id

3. Backend processa pagamento
   ✅ Backend cria cobrança no Asaas
   ✅ Backend aplica split baseado na rede
   ❌ Backend NÃO salva os IDs dos afiliados no pedido
   ❌ Pedido fica com affiliate_n1_id, affiliate_n2_id, affiliate_n3_id = NULL

4. Webhook confirma pagamento
   ❌ Webhook não encontra affiliate_n1_id, affiliate_n2_id, affiliate_n3_id
   ❌ Webhook busca apenas N1 pelo referral_code
   ❌ Webhook calcula apenas comissão total (30%)
   ❌ Webhook NÃO cria registros de comissões
   ❌ Afiliados N2 e N3 não recebem comissões
```

---

## 🔍 ANÁLISE DETALHADA DOS COMPONENTES

### 1. Tabela `affiliates`

**Status:** ✅ **CORRETO**

```sql
-- Estrutura correta
CREATE TABLE affiliates (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  name VARCHAR NOT NULL,
  email VARCHAR NOT NULL,
  referral_code VARCHAR UNIQUE NOT NULL,
  referred_by UUID REFERENCES affiliates(id), -- ✅ Árvore genealógica
  wallet_id VARCHAR,
  status VARCHAR DEFAULT 'pending',
  total_clicks INTEGER DEFAULT 0,
  total_conversions INTEGER DEFAULT 0,
  total_commissions_cents INTEGER DEFAULT 0
);
```

**Dados:** Campo `referred_by` está sendo preenchido corretamente.

---

### 2. Tabela `orders`

**Status:** ⚠️ **ESTRUTURA CORRETA, DADOS INCORRETOS**

```sql
-- Estrutura correta
CREATE TABLE orders (
  id UUID PRIMARY KEY,
  customer_id UUID NOT NULL,
  referral_code VARCHAR, -- ✅ Sendo preenchido
  affiliate_n1_id UUID, -- ❌ SEMPRE NULL
  affiliate_n2_id UUID, -- ❌ SEMPRE NULL
  affiliate_n3_id UUID, -- ❌ SEMPRE NULL
  total_cents INTEGER NOT NULL,
  status VARCHAR NOT NULL
);
```

**Problema:** Campos `affiliate_n1_id`, `affiliate_n2_id`, `affiliate_n3_id` não estão sendo preenchidos.

---

### 3. Frontend - `checkout.service.ts`

**Status:** ✅ **CORRETO**

**Método `createOrder()`:**
- ✅ Busca rede completa de afiliados
- ✅ Preenche `affiliate_n1_id`, `affiliate_n2_id`, `affiliate_n3_id`
- ✅ Salva pedido no Supabase com IDs corretos

**Método `buildAffiliateNetwork()`:**
- ✅ Busca N1 pelo `referral_code`
- ✅ Busca N2 via `referred_by` do N1
- ✅ Busca N3 via `referred_by` do N2
- ✅ Valida `wallet_id` de cada afiliado

**Conclusão:** Frontend está **100% correto**.

---

### 4. Backend - `api/checkout.js`

**Status:** ❌ **PROBLEMA CRÍTICO**

**Função `calculateAffiliateSplit()`:**
- ✅ Busca rede completa de afiliados
- ✅ Calcula split corretamente (15%, 3%, 2%, 5%, 5%)
- ✅ Retorna array de splits para Asaas

**Função `savePaymentToDatabase()`:**
- ✅ Salva registro na tabela `payments`
- ✅ Salva registro na tabela `asaas_transactions`
- ❌ **NÃO atualiza tabela `orders` com IDs dos afiliados**

**PROBLEMA:** Backend calcula split corretamente mas **NÃO persiste** os IDs dos afiliados no banco.

---

### 5. Webhook - `asaas-webhook.ts`

**Status:** ❌ **PROBLEMA CRÍTICO**

**Função `processOrderCommissions()`:**
- ✅ Busca pedido pelo `order_id`
- ❌ Busca apenas `referral_code` e `affiliate_n1_id`
- ❌ Não usa `affiliate_n2_id` e `affiliate_n3_id`
- ❌ Busca afiliado novamente ao invés de usar IDs do pedido
- ❌ Calcula apenas comissão total (30%)
- ❌ Não divide comissão por níveis (N1, N2, N3)
- ❌ Não cria registros na tabela `commissions`
- ❌ Apenas registra log genérico

**PROBLEMA:** Webhook **NÃO processa comissões corretamente**.

---

## 🎯 SOLUÇÕES NECESSÁRIAS

### SOLUÇÃO 1: Corrigir Backend Checkout

**Arquivo:** `api/checkout.js`  
**Função:** `savePaymentToDatabase()`

**Ação Necessária:**
1. Buscar rede de afiliados (N1, N2, N3) usando `referralCode`
2. Atualizar tabela `orders` com `affiliate_n1_id`, `affiliate_n2_id`, `affiliate_n3_id`

**Código Sugerido:**
```javascript
async function savePaymentToDatabase(data) {
  // ... código existente ...

  // NOVO: Buscar e salvar IDs dos afiliados
  if (data.referralCode) {
    const network = await buildAffiliateNetwork(data.referralCode);
    
    await supabase
      .from('orders')
      .update({
        affiliate_n1_id: network.n1?.id || null,
        affiliate_n2_id: network.n2?.id || null,
        affiliate_n3_id: network.n3?.id || null
      })
      .eq('id', data.orderId);
  }
}
```

---

### SOLUÇÃO 2: Corrigir Webhook de Comissões

**Arquivo:** `src/api/routes/webhooks/asaas-webhook.ts`  
**Função:** `processOrderCommissions()`

**Ação Necessária:**
1. Buscar `affiliate_n1_id`, `affiliate_n2_id`, `affiliate_n3_id` do pedido
2. Calcular comissões por nível (15%, 3%, 2%)
3. Criar registros na tabela `commissions` para cada nível
4. Atualizar `total_commissions_cents` de cada afiliado

**Código Sugerido:**
```typescript
async function processOrderCommissions(orderId: string, orderValue: number) {
  // Buscar pedido com IDs dos afiliados
  const { data: order } = await supabase
    .from('orders')
    .select('affiliate_n1_id, affiliate_n2_id, affiliate_n3_id')
    .eq('id', orderId)
    .single();

  if (!order) return { calculated: false };

  const commissions = [];

  // Calcular comissão N1 (15%)
  if (order.affiliate_n1_id) {
    const n1Commission = orderValue * 0.15;
    commissions.push({
      order_id: orderId,
      affiliate_id: order.affiliate_n1_id,
      level: 1,
      commission_value_cents: Math.round(n1Commission * 100),
      status: 'pending'
    });
  }

  // Calcular comissão N2 (3%)
  if (order.affiliate_n2_id) {
    const n2Commission = orderValue * 0.03;
    commissions.push({
      order_id: orderId,
      affiliate_id: order.affiliate_n2_id,
      level: 2,
      commission_value_cents: Math.round(n2Commission * 100),
      status: 'pending'
    });
  }

  // Calcular comissão N3 (2%)
  if (order.affiliate_n3_id) {
    const n3Commission = orderValue * 0.02;
    commissions.push({
      order_id: orderId,
      affiliate_id: order.affiliate_n3_id,
      level: 3,
      commission_value_cents: Math.round(n3Commission * 100),
      status: 'pending'
    });
  }

  // Salvar comissões no banco
  if (commissions.length > 0) {
    await supabase.from('commissions').insert(commissions);
  }

  return { calculated: true, totalCommission: orderValue * 0.30 };
}
```

---

## 📈 IMPACTO DAS CORREÇÕES

### ANTES (Situação Atual):
- ❌ Afiliados N2 e N3 não recebem comissões
- ❌ Split no Asaas está correto, mas banco não reflete
- ❌ Impossível rastrear comissões por nível
- ❌ Impossível gerar relatórios de comissões
- ❌ Dashboard de afiliados mostra dados incorretos

### DEPOIS (Após Correções):
- ✅ Afiliados N1, N2, N3 identificados corretamente
- ✅ Comissões calculadas e registradas por nível
- ✅ Rastreabilidade completa de comissões
- ✅ Relatórios precisos de comissões
- ✅ Dashboard de afiliados com dados reais

---

## 🔐 VALIDAÇÕES NECESSÁRIAS

### Após Implementar Correções:

1. **Teste de Checkout com Afiliado:**
   ```sql
   -- Verificar se IDs foram salvos
   SELECT id, referral_code, affiliate_n1_id, affiliate_n2_id, affiliate_n3_id
   FROM orders
   WHERE referral_code IS NOT NULL
   ORDER BY created_at DESC
   LIMIT 1;
   
   -- Resultado esperado: affiliate_n1_id, affiliate_n2_id, affiliate_n3_id preenchidos
   ```

2. **Teste de Webhook:**
   ```sql
   -- Verificar se comissões foram criadas
   SELECT order_id, affiliate_id, level, commission_value_cents, status
   FROM commissions
   WHERE order_id = 'order_id_do_teste'
   ORDER BY level;
   
   -- Resultado esperado: 3 registros (N1, N2, N3) com valores corretos
   ```

3. **Teste de Totais:**
   ```sql
   -- Verificar se totais foram atualizados
   SELECT id, name, total_commissions_cents, total_conversions
   FROM affiliates
   WHERE id IN (affiliate_n1_id, affiliate_n2_id, affiliate_n3_id);
   
   -- Resultado esperado: total_commissions_cents e total_conversions atualizados
   ```

---

## 📝 CONCLUSÃO

### CAUSA RAIZ:
O BUG 01 ocorre porque:
1. **Backend (`api/checkout.js`) NÃO salva** os IDs dos afiliados na tabela `orders`
2. **Webhook (`asaas-webhook.ts`) NÃO processa** comissões corretamente

### CÓDIGO FRONTEND:
✅ **100% CORRETO** - Não precisa de alterações

### CÓDIGO BACKEND:
❌ **PRECISA CORREÇÃO** em 2 arquivos:
1. `api/checkout.js` - Adicionar atualização de `affiliate_n1_id`, `affiliate_n2_id`, `affiliate_n3_id`
2. `src/api/routes/webhooks/asaas-webhook.ts` - Reescrever `processOrderCommissions()`

### PRIORIDADE:
🔴 **CRÍTICA** - Sistema de afiliados não funciona sem essas correções

---

**Relatório gerado em:** 10/01/2026  
**Próximo passo:** Implementar correções nos 2 arquivos identificados
