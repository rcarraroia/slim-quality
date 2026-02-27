# 📊 ANÁLISE: REGRAS ESPECIAIS PARA PRODUTOS SHOW ROOM

**Data:** 27/02/2026  
**Autor:** Kiro AI  
**Status:** ANÁLISE COMPLETA - AGUARDANDO APROVAÇÃO

---

## 🎯 REQUISITOS IDENTIFICADOS

### 1. CONTROLE DE ESTOQUE
**Regra:** Produtos da categoria `show_room` terão apenas 1 unidade disponível para compra por logistas.

### 2. COMISSIONAMENTO DIFERENCIADO
**Regra:** Produtos `show_room` NÃO pagam comissão para rede de afiliados (N1, N2, N3).  
**Comissão:** Apenas Renum e JB recebem 5% cada (total 10% de comissão).

---

## 🔍 ANÁLISE DA ESTRUTURA ATUAL

### ✅ O QUE JÁ EXISTE

#### 1. **ENUM `product_category`**
**Localização:** `supabase/migrations/20260225000000_add_affiliate_types.sql`

```sql
CREATE TYPE product_category AS ENUM ('colchao', 'ferramenta_ia', 'servico_digital', 'show_row');
```

**Status:** ✅ Categoria `show_row` já existe no banco de dados

#### 2. **Coluna `category` na tabela `products`**
**Localização:** `supabase/migrations/20260128132204_add_product_category_and_subscriptions.sql`

```sql
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS category product_category DEFAULT 'colchao';
```

**Status:** ✅ Coluna já existe e aceita o valor `show_row`

#### 3. **Sistema de Estoque**
**Localização:** `supabase/migrations/20250124000000_products_system.sql`

**Tabelas existentes:**
- ✅ `inventory_logs` - Histórico de movimentações
- ✅ `product_inventory` (VIEW) - Estoque atual calculado

**Status:** ✅ Sistema de estoque completo já implementado

#### 4. **Sistema de Comissões**
**Localização:** `api/webhook-asaas.js`

**Função:** `processCommissions()`
- ✅ Calcula comissões N1 (15%), N2 (3%), N3 (2%)
- ✅ Calcula comissões Renum e JB (5% cada + redistribuição)
- ✅ Suporta redistribuição quando rede incompleta
- ✅ Já tem lógica diferenciada para `ferramenta_ia`

**Status:** ✅ Sistema de comissões robusto e extensível

#### 5. **RLS (Row Level Security)**
**Localização:** `supabase/migrations/20260225105755_add_show_row_rls.sql`

```sql
CREATE POLICY "Public can view non-show-row products or Logista can view all"
ON products FOR SELECT
USING (
  category != 'show_row'
  OR
  (
    category = 'show_row'
    AND
    EXISTS (
      SELECT 1 FROM affiliates
      WHERE user_id = auth.uid()
      AND affiliate_type = 'logista'
    )
  )
);
```

**Status:** ✅ Apenas logistas podem ver produtos `show_row`

---

## 🛠️ IMPLEMENTAÇÃO PROPOSTA

### FASE 1: CONTROLE DE ESTOQUE (SIMPLES)

#### 1.1 **Validação no Frontend**
**Arquivo:** `src/pages/afiliados/dashboard/ShowRow.tsx`

**Implementação:**
```typescript
// Verificar estoque antes de permitir adicionar ao carrinho
const { data: inventory } = await supabase
  .from('product_inventory')
  .select('quantity_available')
  .eq('product_id', productId)
  .single();

if (inventory.quantity_available < 1) {
  toast.error('Produto esgotado');
  return;
}

// Limitar quantidade máxima a 1
<Input 
  type="number" 
  min={1} 
  max={1} 
  value={1}
  disabled
/>
```

#### 1.2 **Validação no Backend**
**Arquivo:** `api/checkout.js` (action: `create-order`)

**Implementação:**
```javascript
// Verificar categoria do produto
const { data: product } = await supabase
  .from('products')
  .select('category')
  .eq('id', productId)
  .single();

if (product.category === 'show_row') {
  // Verificar estoque
  const { data: inventory } = await supabase
    .from('product_inventory')
    .select('quantity_available')
    .eq('product_id', productId)
    .single();

  if (inventory.quantity_available < 1) {
    return res.status(400).json({ 
      error: 'Produto esgotado' 
    });
  }

  // Limitar quantidade a 1
  if (quantity > 1) {
    return res.status(400).json({ 
      error: 'Apenas 1 unidade disponível por logista' 
    });
  }
}
```

#### 1.3 **Registro de Movimentação**
**Arquivo:** `api/webhook-asaas.js` (quando pagamento confirmado)

**Implementação:**
```javascript
// Após confirmar pagamento, registrar saída de estoque
await supabase
  .from('inventory_logs')
  .insert({
    product_id: productId,
    type: 'venda',
    quantity: -1, // Saída
    quantity_before: currentStock,
    quantity_after: currentStock - 1,
    reference_type: 'order',
    reference_id: orderId,
    notes: 'Venda Show Room para logista'
  });
```

---

### FASE 2: COMISSIONAMENTO DIFERENCIADO (MODERADO)

#### 2.1 **Atualizar Função `processCommissions()`**
**Arquivo:** `api/webhook-asaas.js`

**Implementação:**
```javascript
async function processCommissions(supabase, orderId, paymentValue) {
  // ... código existente ...

  // Buscar categoria do produto
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select(`
      affiliate_n1_id, 
      affiliate_n2_id, 
      affiliate_n3_id, 
      total_cents, 
      referral_code,
      order_items (
        product_id, 
        product_name, 
        product_sku,
        products (category)  -- ✅ NOVO: Buscar categoria
      )
    `)
    .eq('id', orderId)
    .single();

  // ✅ NOVO: Verificar se é produto Show Room
  const isShowRoom = order.order_items?.some(item =>
    item.products?.category === 'show_row'
  ) || false;

  // ✅ NOVO: Lógica diferenciada para Show Room
  if (isShowRoom) {
    // Show Room: APENAS Renum e JB (5% cada)
    const renumValue = Math.round(baseValue * 0.05); // 5%
    const jbValue = Math.round(baseValue * 0.05); // 5%
    const totalCommission = renumValue + jbValue; // 10% total

    // Inserir comissões APENAS para gestores
    const commissions = [
      {
        order_id: orderId,
        affiliate_id: null,
        level: 0,
        percentage: 0.05,
        base_value_cents: baseValue,
        commission_value_cents: renumValue,
        status: 'pending',
        metadata: { 
          level: 'manager_renum', 
          manager_name: 'Renum',
          is_show_room: true 
        }
      },
      {
        order_id: orderId,
        affiliate_id: null,
        level: 0,
        percentage: 0.05,
        base_value_cents: baseValue,
        commission_value_cents: jbValue,
        status: 'pending',
        metadata: { 
          level: 'manager_jb', 
          manager_name: 'JB',
          is_show_room: true 
        }
      }
    ];

    // Inserir split consolidado
    const split = {
      order_id: orderId,
      total_order_value_cents: baseValue,
      factory_percentage: 0.90, // ✅ 90% para fábrica (não 70%)
      factory_value_cents: Math.round(baseValue * 0.90),
      commission_percentage: 0.10, // ✅ 10% comissão (não 30%)
      commission_value_cents: totalCommission,

      n1_affiliate_id: null, // ✅ Sem afiliados
      n1_percentage: 0,
      n1_value_cents: 0,

      n2_affiliate_id: null,
      n2_percentage: 0,
      n2_value_cents: 0,

      n3_affiliate_id: null,
      n3_percentage: 0,
      n3_value_cents: 0,

      renum_percentage: 0.05,
      renum_value_cents: renumValue,

      jb_percentage: 0.05,
      jb_value_cents: jbValue,

      redistribution_applied: false,
      redistribution_details: { is_show_room: true },
      status: 'pending',
      asaas_response: {
        is_show_room: true,
        factory_beneficiary: 'Slim Quality',
        commission_note: 'Show Room: Apenas gestores'
      }
    };

    // Inserir no banco
    await supabase.from('commissions').insert(commissions);
    await supabase.from('commission_splits').insert(split);

    console.log(`✅ Comissões Show Room calculadas: Renum ${renumValue}, JB ${jbValue}`);
    return;
  }

  // ... código existente para produtos normais ...
}
```

#### 2.2 **Atualizar Função SQL `calculate_commission_split()`**
**Arquivo:** `supabase/migrations/[NOVA]_update_split_show_room.sql`

**Implementação:**
```sql
CREATE OR REPLACE FUNCTION calculate_commission_split(p_order_id UUID)
RETURNS UUID AS $
DECLARE
  -- ... variáveis existentes ...
  v_is_show_room BOOLEAN := FALSE;
BEGIN
  -- 1. Buscar Categoria do Produto
  SELECT 
    o.total_cents, 
    o.affiliate_n1_id,
    p.category,
    (p.category = 'show_row') -- ✅ NOVO: Flag Show Room
  INTO v_order_total_cents, v_n1_id, v_product_category, v_is_show_room
  FROM orders o
  JOIN order_items oi ON oi.order_id = o.id
  JOIN products p ON p.id = oi.product_id
  WHERE o.id = p_order_id AND o.deleted_at IS NULL
  LIMIT 1;

  -- ✅ NOVO: Lógica Show Room
  IF v_is_show_room THEN
    -- Show Room: 90% fábrica + 5% Renum + 5% JB
    v_factory_percentage := 90.00;
    v_commission_percentage := 10.00;
    
    v_slim_val := ROUND(v_order_total_cents * 0.05);
    v_jb_val := ROUND(v_order_total_cents * 0.05);
    
    -- Sem afiliados
    v_n1_id := NULL;
    v_n2_id := NULL;
    v_n3_id := NULL;
    v_n1_val := 0;
    v_n2_val := 0;
    v_n3_val := 0;
    
    v_redistribution_details := jsonb_build_object(
      'is_show_room', true,
      'commission_note', 'Show Room: Apenas gestores'
    );
    
    -- Registrar split
    INSERT INTO commission_splits (...) VALUES (...);
    RETURN v_split_id;
  END IF;

  -- ... código existente para produtos normais ...
END;
$ LANGUAGE plpgsql;
```

---

## 📊 IMPACTO E RISCOS

### ✅ PONTOS POSITIVOS

1. **Estrutura já existe:** Categoria `show_row` já está no banco
2. **Sistema extensível:** Código atual já suporta lógica diferenciada por categoria
3. **RLS implementado:** Apenas logistas veem produtos Show Room
4. **Estoque controlado:** Sistema de inventory já funciona
5. **Não quebra nada:** Implementação isolada, não afeta produtos existentes

### ⚠️ PONTOS DE ATENÇÃO

1. **Validação dupla necessária:** Frontend + Backend para evitar burlar limite
2. **Estoque inicial:** Precisa cadastrar 1 unidade de cada produto Show Room
3. **Testes necessários:** Validar fluxo completo de compra + comissão
4. **Documentação:** Atualizar docs sobre regras especiais Show Room

### 🚨 RISCOS IDENTIFICADOS

1. **BAIXO:** Código bem isolado, não afeta fluxo normal
2. **BAIXO:** Sistema de estoque já testado e funcionando
3. **MÉDIO:** Precisa testar cálculo de comissões Show Room
4. **BAIXO:** RLS já implementado, apenas logistas acessam

---

## 📋 CHECKLIST DE IMPLEMENTAÇÃO

### FASE 1: CONTROLE DE ESTOQUE
- [ ] Adicionar validação de estoque no frontend (`ShowRow.tsx`)
- [ ] Limitar quantidade máxima a 1 no input
- [ ] Adicionar validação de estoque no backend (`api/checkout.js`)
- [ ] Adicionar registro de movimentação no webhook (`api/webhook-asaas.js`)
- [ ] Cadastrar 1 unidade de cada produto Show Room no estoque
- [ ] Testar fluxo completo de compra

### FASE 2: COMISSIONAMENTO DIFERENCIADO
- [ ] Atualizar função `processCommissions()` em `api/webhook-asaas.js`
- [ ] Criar migration para atualizar função SQL `calculate_commission_split()`
- [ ] Adicionar flag `is_show_room` nos logs de comissão
- [ ] Testar cálculo de comissões Show Room
- [ ] Validar que N1/N2/N3 não recebem comissão
- [ ] Validar que Renum e JB recebem 5% cada
- [ ] Validar que fábrica recebe 90% (não 70%)

### FASE 3: TESTES E VALIDAÇÃO
- [ ] Criar produto Show Room de teste
- [ ] Cadastrar 1 unidade no estoque
- [ ] Fazer compra como logista
- [ ] Validar que estoque zerou
- [ ] Validar que comissões foram calculadas corretamente
- [ ] Validar que apenas Renum e JB receberam
- [ ] Tentar comprar novamente (deve falhar - sem estoque)

### FASE 4: DOCUMENTAÇÃO
- [ ] Atualizar `.kiro/steering/product.md` com regras Show Room
- [ ] Documentar diferenças de comissionamento
- [ ] Atualizar STATUS.md com implementação

---

## 💰 EXEMPLO DE CÁLCULO

### PRODUTO NORMAL (Colchão Padrão - R$ 3.290,00)

**Split:**
- 70% Fábrica: R$ 2.303,00
- 15% N1: R$ 493,50
- 3% N2: R$ 98,70
- 2% N3: R$ 65,80
- 5% Renum: R$ 164,50
- 5% JB: R$ 164,50
- **Total comissão: 30% (R$ 987,00)**

### PRODUTO SHOW ROOM (Colchão King - R$ 4.890,00)

**Split:**
- 90% Fábrica: R$ 4.401,00
- 0% N1: R$ 0,00
- 0% N2: R$ 0,00
- 0% N3: R$ 0,00
- 5% Renum: R$ 244,50
- 5% JB: R$ 244,50
- **Total comissão: 10% (R$ 489,00)**

**Diferença:** Fábrica recebe 20% a mais (90% vs 70%)

---

## 🎯 RECOMENDAÇÃO

### ✅ VIABILIDADE: ALTA

**Motivos:**
1. Estrutura já existe no banco de dados
2. Sistema de comissões é extensível
3. Sistema de estoque já funciona
4. RLS já implementado
5. Não quebra funcionalidades existentes

### 📅 ESTIMATIVA DE IMPLEMENTAÇÃO

**Fase 1 (Estoque):** 2-3 horas
- Frontend: 30 min
- Backend: 1 hora
- Testes: 1 hora

**Fase 2 (Comissões):** 3-4 horas
- Webhook: 1 hora
- Migration SQL: 1 hora
- Testes: 2 horas

**Total:** 5-7 horas de desenvolvimento + testes

---

## 🚀 PRÓXIMOS PASSOS

1. **AGUARDAR APROVAÇÃO** do usuário para implementar
2. **CONFIRMAR** se há alguma regra adicional não mencionada
3. **DEFINIR** preços dos produtos Show Room
4. **CADASTRAR** produtos Show Room no banco
5. **IMPLEMENTAR** Fase 1 (Estoque)
6. **IMPLEMENTAR** Fase 2 (Comissões)
7. **TESTAR** fluxo completo
8. **DOCUMENTAR** regras especiais

---

## ✅ RESPOSTAS DO USUÁRIO (27/02/2026)

1. **Preços dos produtos Show Room:** ✅ Valores diferentes, já cadastrados no banco
2. **Reposição de estoque:** ✅ SEM reposição - cada logista pode comprar 1 peça de cada modelo e pronto
3. **Limite por logista:** ✅ 1 unidade de CADA modelo (não total)
4. **Frete:** ✅ FRETE GRÁTIS
5. **Prazo de entrega:** ✅ Mesmo prazo dos produtos normais

---

## 🎯 REGRAS FINAIS CONFIRMADAS

### CONTROLE DE ESTOQUE
- ✅ Cada logista pode comprar 1 unidade de CADA modelo Show Room
- ✅ Sem reposição de estoque
- ✅ Após compra, aquele modelo fica indisponível para aquele logista
- ✅ Precisa rastrear compras por logista + produto

### COMISSIONAMENTO
- ✅ 90% Fábrica (Slim Quality)
- ✅ 5% Renum
- ✅ 5% JB
- ✅ 0% para N1, N2, N3

### FRETE
- ✅ Frete grátis para produtos Show Room
- ✅ Prazo de entrega: mesmo dos produtos normais

---

## 🔄 AJUSTES NA IMPLEMENTAÇÃO

### NOVA NECESSIDADE: RASTREAMENTO DE COMPRAS POR LOGISTA

**Problema:** Precisa controlar que cada logista comprou 1 unidade de cada modelo.

**Solução:** Criar tabela `show_room_purchases` para rastrear compras.

#### Nova Migration Necessária:

```sql
-- Migration: Rastreamento de Compras Show Room
CREATE TABLE IF NOT EXISTS show_room_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relacionamentos
  affiliate_id UUID NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  
  -- Metadados
  purchased_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Constraint: 1 compra por logista por produto
  UNIQUE(affiliate_id, product_id)
);

-- Índices
CREATE INDEX idx_show_room_purchases_affiliate ON show_room_purchases(affiliate_id);
CREATE INDEX idx_show_room_purchases_product ON show_room_purchases(product_id);

-- RLS
ALTER TABLE show_room_purchases ENABLE ROW LEVEL SECURITY;

-- Política: Logista vê apenas suas compras
CREATE POLICY "Logistas can view own purchases"
  ON show_room_purchases FOR SELECT
  USING (
    affiliate_id IN (
      SELECT id FROM affiliates WHERE user_id = auth.uid()
    )
  );

-- Política: Sistema pode inserir
CREATE POLICY "System can insert purchases"
  ON show_room_purchases FOR INSERT
  WITH CHECK (true);

COMMENT ON TABLE show_room_purchases IS 'Rastreamento de compras Show Room por logista (1 por produto)';
```

#### Validação Atualizada no Frontend:

```typescript
// ShowRow.tsx
const checkIfAlreadyPurchased = async (productId: string) => {
  const { data: affiliate } = await supabase
    .from('affiliates')
    .select('id')
    .eq('user_id', user.id)
    .single();

  const { data: purchase } = await supabase
    .from('show_room_purchases')
    .select('id')
    .eq('affiliate_id', affiliate.id)
    .eq('product_id', productId)
    .single();

  return !!purchase;
};

// Antes de adicionar ao carrinho
const alreadyPurchased = await checkIfAlreadyPurchased(productId);
if (alreadyPurchased) {
  toast.error('Você já comprou este modelo Show Room');
  return;
}
```

#### Validação Atualizada no Backend:

```javascript
// api/checkout.js
if (product.category === 'show_row') {
  // Buscar afiliado
  const { data: affiliate } = await supabase
    .from('affiliates')
    .select('id')
    .eq('user_id', userId)
    .single();

  // Verificar se já comprou este produto
  const { data: existingPurchase } = await supabase
    .from('show_room_purchases')
    .select('id')
    .eq('affiliate_id', affiliate.id)
    .eq('product_id', productId)
    .single();

  if (existingPurchase) {
    return res.status(400).json({ 
      error: 'Você já comprou este modelo Show Room' 
    });
  }

  // Limitar quantidade a 1
  if (quantity > 1) {
    return res.status(400).json({ 
      error: 'Apenas 1 unidade disponível por logista' 
    });
  }
}
```

#### Registro de Compra no Webhook:

```javascript
// api/webhook-asaas.js
if (orderStatus === 'paid') {
  // Verificar se é Show Room
  const { data: orderItems } = await supabase
    .from('order_items')
    .select('product_id, products(category)')
    .eq('order_id', orderId);

  for (const item of orderItems) {
    if (item.products.category === 'show_row') {
      // Buscar afiliado do pedido
      const { data: order } = await supabase
        .from('orders')
        .select('customer_id')
        .eq('id', orderId)
        .single();

      const { data: affiliate } = await supabase
        .from('affiliates')
        .select('id')
        .eq('user_id', order.customer_id)
        .single();

      // Registrar compra Show Room
      await supabase
        .from('show_room_purchases')
        .insert({
          affiliate_id: affiliate.id,
          product_id: item.product_id,
          order_id: orderId
        });

      console.log(`✅ Compra Show Room registrada: Logista ${affiliate.id}, Produto ${item.product_id}`);
    }
  }
}
```

---

## 📋 CHECKLIST DE IMPLEMENTAÇÃO ATUALIZADO

### FASE 0: PREPARAÇÃO DO BANCO
- [ ] Criar migration `show_room_purchases`
- [ ] Aplicar migration no Supabase
- [ ] Validar que tabela foi criada
- [ ] Validar políticas RLS

### FASE 1: CONTROLE DE COMPRAS POR LOGISTA
- [ ] Adicionar validação no frontend (`ShowRow.tsx`)
  - [ ] Verificar se logista já comprou o produto
  - [ ] Desabilitar botão "Comprar" se já comprou
  - [ ] Mostrar badge "Já adquirido" se já comprou
- [ ] Adicionar validação no backend (`api/checkout.js`)
  - [ ] Verificar se logista já comprou o produto
  - [ ] Retornar erro 400 se já comprou
  - [ ] Limitar quantidade a 1
- [ ] Adicionar registro de compra no webhook (`api/webhook-asaas.js`)
  - [ ] Inserir em `show_room_purchases` quando pagamento confirmado
  - [ ] Registrar log de compra

### FASE 2: COMISSIONAMENTO DIFERENCIADO
- [ ] Atualizar função `processCommissions()` em `api/webhook-asaas.js`
  - [ ] Detectar produtos Show Room
  - [ ] Calcular 90% fábrica + 5% Renum + 5% JB
  - [ ] Não calcular comissões para N1/N2/N3
  - [ ] Adicionar flag `is_show_room` nos logs
- [ ] Criar migration para atualizar função SQL `calculate_commission_split()`
  - [ ] Adicionar lógica Show Room
  - [ ] Testar função SQL

### FASE 3: FRETE GRÁTIS
- [ ] Atualizar cálculo de frete no checkout
  - [ ] Detectar produtos Show Room
  - [ ] Zerar valor do frete
  - [ ] Mostrar "Frete Grátis" na UI

### FASE 4: TESTES E VALIDAÇÃO
- [ ] Criar cenário de teste completo
  - [ ] Logista compra produto Show Room
  - [ ] Validar que compra foi registrada
  - [ ] Validar que não pode comprar novamente
  - [ ] Validar comissões (apenas Renum e JB)
  - [ ] Validar frete grátis
- [ ] Testar com múltiplos produtos
  - [ ] Logista compra modelo A
  - [ ] Logista compra modelo B
  - [ ] Validar que pode comprar ambos
  - [ ] Validar que não pode comprar A novamente

### FASE 5: DOCUMENTAÇÃO
- [ ] Atualizar `.kiro/steering/product.md` com regras Show Room
- [ ] Documentar tabela `show_room_purchases`
- [ ] Atualizar STATUS.md com implementação

---

## 💰 EXEMPLO DE CÁLCULO ATUALIZADO

### PRODUTO SHOW ROOM (Colchão King - R$ 4.890,00)

**Split:**
- 90% Fábrica: R$ 4.401,00
- 5% Renum: R$ 244,50
- 5% JB: R$ 244,50
- **Total comissão: 10% (R$ 489,00)**
- **Frete: R$ 0,00 (GRÁTIS)**

**Diferença vs Produto Normal:**
- Fábrica recebe 20% a mais (90% vs 70%)
- Sem comissão para afiliados (N1/N2/N3)
- Frete grátis

---

## 🎯 RECOMENDAÇÃO FINAL

### ✅ VIABILIDADE: ALTA

**Implementação clara e bem definida:**
1. ✅ Criar tabela `show_room_purchases` para rastrear compras
2. ✅ Validar compras duplicadas (frontend + backend)
3. ✅ Comissionamento diferenciado (90% + 5% + 5%)
4. ✅ Frete grátis automático
5. ✅ Não quebra funcionalidades existentes

### 📅 ESTIMATIVA ATUALIZADA

**Fase 0 (Preparação):** 30 min
- Migration: 20 min
- Aplicar e validar: 10 min

**Fase 1 (Controle de Compras):** 3-4 horas
- Frontend: 1 hora
- Backend: 1 hora
- Webhook: 1 hora
- Testes: 1 hora

**Fase 2 (Comissões):** 3-4 horas
- Webhook: 1 hora
- Migration SQL: 1 hora
- Testes: 2 horas

**Fase 3 (Frete Grátis):** 1 hora
- Lógica de frete: 30 min
- UI: 30 min

**Total:** 7-9 horas de desenvolvimento + testes

---

## 🚀 PRONTO PARA IMPLEMENTAR

**Todas as dúvidas esclarecidas!**  
**Aguardando sua autorização para iniciar a implementação.** ✅
