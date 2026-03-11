# 🔍 ANÁLISE DO PROBLEMA: CADASTRO DE AFILIADOS E ADESÕES

**Data:** 11/03/2026  
**Problema Reportado:** "Produto de adesão para individual não encontrado"  
**Contexto:** Cadastro de afiliados e cobrança de adesões não funcionam

---

## 🚨 PROBLEMA IDENTIFICADO

### Erro Exibido
```
Produto de adesão para individual não encontrado
```

### Onde Ocorre
- **Endpoint:** `POST /api/affiliates?action=payment-first-validate`
- **Arquivo:** `api/affiliates.js`
- **Função:** `handlePaymentFirstValidate()`
- **Linha:** ~495

---

## 📊 ANÁLISE DO BANCO DE DADOS

### Produtos de Adesão Cadastrados

Consultei o banco via Supabase Power e encontrei **3 produtos de adesão**:

| ID | Nome | SKU | Tipo | is_subscription | is_active | Taxa Adesão | Mensalidade |
|----|------|-----|------|----------------|-----------|-------------|-------------|
| 4922aa8c... | Adesão Individual | ADI-TEST-001 | individual | **false** | true | R$ 97,00 | - |
| 18e40a4d... | Adesão Individual Premium | COL-F72843 | individual | **true** | true | R$ 97,00 | R$ 97,00 |
| ba0de318... | Adesão Logista - Teste | ADL-TEST-001 | logista | **true** | true | R$ 197,00 | R$ 97,00 |

---

## 🔍 ANÁLISE DO CÓDIGO

### 1. O que o Frontend Envia

**Arquivo:** `src/pages/afiliados/AfiliadosCadastro.tsx` (linha 223)

```typescript
has_subscription: formData.affiliateType === 'logista' ? true : formData.wantsSubscription
```

**Lógica:**
- Se `affiliateType === 'logista'` → `has_subscription = true` (forçado)
- Se `affiliateType === 'individual'` → `has_subscription = formData.wantsSubscription` (checkbox)

**Valores Possíveis:**
- `true` (boolean) - quando checkbox marcado
- `false` (boolean) - quando checkbox desmarcado
- `undefined` - se campo não existir

### 2. O que o Backend Recebe

**Arquivo:** `api/affiliates.js` (linhas 456-472)

```javascript
// Usar valor enviado pelo frontend (checkbox) ou forçar true para logistas
// IMPORTANTE: Converter para boolean explicitamente
const hasSubscriptionFromBody = has_subscription === true || has_subscription === 'true';
const hasSubscription = affiliate_type === 'logista' ? true : hasSubscriptionFromBody;

console.log('[PaymentFirstValidate] DEBUG - Valores recebidos:', {
  'has_subscription RAW': has_subscription,
  'tipo de has_subscription': typeof has_subscription,
  'hasSubscriptionFromBody': hasSubscriptionFromBody,
  'affiliate_type': affiliate_type,
  'hasSubscription FINAL': hasSubscription
});
```

**Conversão:**
1. `hasSubscriptionFromBody` = converte para boolean
2. `hasSubscription` = força `true` para logistas, senão usa valor do checkbox

### 3. Query no Banco de Dados

**Arquivo:** `api/affiliates.js` (linhas 477-482)

```javascript
const { data: products, error: productError } = await supabase
  .from('products')
  .select('id, name, sku, is_subscription')
  .eq('category', 'adesao_afiliado')
  .eq('eligible_affiliate_type', affiliate_type)
  .eq('is_subscription', hasSubscription)
  .eq('is_active', true);
```

**Filtros Aplicados:**
- `category = 'adesao_afiliado'` ✅
- `eligible_affiliate_type = 'individual'` ou `'logista'` ✅
- `is_subscription = true` ou `false` ✅
- `is_active = true` ✅

---

## 🐛 CAUSA RAIZ DO PROBLEMA

### Cenário 1: Individual SEM Checkbox Marcado

**Dados Enviados:**
```json
{
  "affiliate_type": "individual",
  "has_subscription": false
}
```

**Query Executada:**
```sql
SELECT * FROM products 
WHERE category = 'adesao_afiliado'
  AND eligible_affiliate_type = 'individual'
  AND is_subscription = false
  AND is_active = true;
```

**Resultado Esperado:**
- ✅ Deve retornar: "Adesão Individual" (ADI-TEST-001)

**Status:** ✅ **DEVE FUNCIONAR**

---

### Cenário 2: Individual COM Checkbox Marcado

**Dados Enviados:**
```json
{
  "affiliate_type": "individual",
  "has_subscription": true
}
```

**Query Executada:**
```sql
SELECT * FROM products 
WHERE category = 'adesao_afiliado'
  AND eligible_affiliate_type = 'individual'
  AND is_subscription = true
  AND is_active = true;
```

**Resultado Esperado:**
- ✅ Deve retornar: "Adesão Individual Premium" (COL-F72843)

**Status:** ✅ **DEVE FUNCIONAR**

---

### Cenário 3: Logista (Sempre com Assinatura)

**Dados Enviados:**
```json
{
  "affiliate_type": "logista",
  "has_subscription": true
}
```

**Query Executada:**
```sql
SELECT * FROM products 
WHERE category = 'adesao_afiliado'
  AND eligible_affiliate_type = 'logista'
  AND is_subscription = true
  AND is_active = true;
```

**Resultado Esperado:**
- ✅ Deve retornar: "Adesão Logista - Teste" (ADL-TEST-001)

**Status:** ✅ **DEVE FUNCIONAR**

---

## 🔍 POSSÍVEIS CAUSAS DO ERRO

### Hipótese 1: Valor `undefined` ou `null`

Se `has_subscription` chegar como `undefined` ou `null`:

```javascript
const hasSubscriptionFromBody = undefined === true || undefined === 'true';
// Resultado: false

const hasSubscription = 'individual' === 'logista' ? true : false;
// Resultado: false
```

**Query:**
```sql
WHERE is_subscription = false
```

**Resultado:** ✅ Retorna "Adesão Individual" (ADI-TEST-001)

**Conclusão:** Não é a causa do erro.

---

### Hipótese 2: Checkbox Não Está Sendo Enviado

Se o campo `has_subscription` não existir no body:

```javascript
const has_subscription = undefined; // Campo não existe
const hasSubscriptionFromBody = undefined === true || undefined === 'true';
// Resultado: false
```

**Mesmo resultado da Hipótese 1.**

---

### Hipótese 3: Produto Inativo ou Deletado

Se o produto estiver com `is_active = false`:

```sql
WHERE is_active = true
```

**Verificação no Banco:**
- ✅ Todos os 3 produtos têm `is_active = true`

**Conclusão:** Não é a causa.

---

### Hipótese 4: Tipo de Dado Incorreto

Se `is_subscription` no banco for `NULL` ao invés de `false`:

```sql
WHERE is_subscription = false
-- NULL não é igual a false em SQL
```

**Verificação no Banco:**
- ✅ "Adesão Individual" tem `is_subscription = false` (não NULL)

**Conclusão:** Não é a causa.

---

### Hipótese 5: ⚠️ CAUSA MAIS PROVÁVEL - Checkbox Sempre Marcado

Se o checkbox `wantsSubscription` estiver **sempre marcado** (bug no frontend):

```javascript
has_subscription: formData.wantsSubscription
// Se sempre true, sempre busca produto COM assinatura
```

**Para Individual:**
- Busca: `is_subscription = true`
- Retorna: "Adesão Individual Premium" (R$ 97,00 + R$ 97,00/mês)

**Problema:** Se o usuário NÃO quer mensalidade mas o checkbox está marcado, vai buscar o produto errado.

---

### Hipótese 6: ⚠️ SEGUNDA CAUSA PROVÁVEL - Produto Não Existe

Se o usuário tentar cadastrar como **Individual SEM mensalidade** mas o produto "Adesão Individual" (is_subscription=false) foi deletado ou desativado:

**Query:**
```sql
WHERE is_subscription = false
```

**Resultado:** Nenhum produto encontrado → **ERRO!**

---

## 🧪 TESTE PARA IDENTIFICAR A CAUSA

### Passo 1: Verificar Logs do Backend

Adicionar logs detalhados em `api/affiliates.js` (já existem nas linhas 456-472):

```javascript
console.log('[PaymentFirstValidate] DEBUG - Valores recebidos:', {
  'has_subscription RAW': has_subscription,
  'tipo de has_subscription': typeof has_subscription,
  'hasSubscriptionFromBody': hasSubscriptionFromBody,
  'affiliate_type': affiliate_type,
  'hasSubscription FINAL': hasSubscription
});

console.log('[PaymentFirstValidate] Buscando produto de adesão:', { 
  affiliate_type, 
  hasSubscription,
  filtros: {
    category: 'adesao_afiliado',
    eligible_affiliate_type: affiliate_type,
    is_subscription: hasSubscription,
    is_active: true
  }
});

console.log('[PaymentFirstValidate] Produtos encontrados:', products?.length || 0, products);
```

### Passo 2: Testar Cadastro

1. Abrir console do navegador (F12)
2. Tentar cadastrar como **Individual SEM marcar checkbox**
3. Verificar logs no console
4. Verificar logs no Vercel (Runtime Logs)

### Passo 3: Verificar Produtos no Banco

```sql
SELECT id, name, sku, category, eligible_affiliate_type, is_subscription, is_active
FROM products
WHERE category = 'adesao_afiliado'
ORDER BY eligible_affiliate_type, is_subscription;
```

---

## 🔧 SOLUÇÕES PROPOSTAS

### Solução 1: Verificar Estado do Checkbox

**Arquivo:** `src/pages/afiliados/AfiliadosCadastro.tsx`

Adicionar log antes do submit:

```typescript
console.log('[Cadastro] Dados do formulário:', {
  affiliateType: formData.affiliateType,
  wantsSubscription: formData.wantsSubscription,
  has_subscription_enviado: formData.affiliateType === 'logista' ? true : formData.wantsSubscription
});
```

### Solução 2: Garantir Produto Padrão

Se o produto "Adesão Individual" (sem mensalidade) não existir, criar:

```sql
INSERT INTO products (
  name, 
  sku, 
  category, 
  eligible_affiliate_type, 
  is_subscription, 
  is_active,
  entry_fee_cents,
  monthly_fee_cents
) VALUES (
  'Adesão Individual Básica',
  'ADI-BASIC-001',
  'adesao_afiliado',
  'individual',
  false,
  true,
  9700,
  NULL
);
```

### Solução 3: Fallback no Backend

Modificar `api/affiliates.js` para ter fallback:

```javascript
if (!products || products.length === 0) {
  // Tentar buscar produto sem filtro de is_subscription
  const { data: fallbackProducts } = await supabase
    .from('products')
    .select('id, name, sku, is_subscription')
    .eq('category', 'adesao_afiliado')
    .eq('eligible_affiliate_type', affiliate_type)
    .eq('is_active', true)
    .limit(1);
  
  if (fallbackProducts && fallbackProducts.length > 0) {
    console.warn('[PaymentFirstValidate] Usando produto fallback:', fallbackProducts[0]);
    products = fallbackProducts;
  }
}
```

### Solução 4: Validação Mais Robusta

Adicionar validação antes da query:

```javascript
// Garantir que hasSubscription é boolean
const hasSubscription = Boolean(
  affiliate_type === 'logista' ? true : hasSubscriptionFromBody
);

console.log('[PaymentFirstValidate] hasSubscription (garantido boolean):', hasSubscription);
```

---

## 📋 CHECKLIST DE DIAGNÓSTICO

### Verificações Imediatas

- [ ] Verificar logs do backend no Vercel
- [ ] Verificar console do navegador durante cadastro
- [ ] Confirmar que produtos existem no banco
- [ ] Testar cadastro Individual SEM checkbox
- [ ] Testar cadastro Individual COM checkbox
- [ ] Testar cadastro Logista

### Verificações no Banco

- [ ] Produto "Adesão Individual" (is_subscription=false) existe?
- [ ] Produto "Adesão Individual Premium" (is_subscription=true) existe?
- [ ] Produto "Adesão Logista" (is_subscription=true) existe?
- [ ] Todos os produtos têm `is_active = true`?
- [ ] Campo `is_subscription` é boolean (não NULL)?

### Verificações no Código

- [ ] Checkbox `wantsSubscription` está funcionando?
- [ ] Valor está sendo enviado corretamente no POST?
- [ ] Backend está recebendo o valor correto?
- [ ] Query está usando os filtros corretos?

---

## 🎯 PRÓXIMOS PASSOS

### Passo 1: Adicionar Logs Temporários

Adicionar logs detalhados em:
1. Frontend (antes do POST)
2. Backend (ao receber dados)
3. Backend (ao executar query)
4. Backend (ao retornar resultado)

### Passo 2: Testar Cenários

1. Individual SEM checkbox → Deve buscar ADI-TEST-001
2. Individual COM checkbox → Deve buscar COL-F72843
3. Logista → Deve buscar ADL-TEST-001

### Passo 3: Analisar Logs

Verificar:
- Valor de `has_subscription` recebido
- Tipo de dado (boolean, string, undefined)
- Query executada
- Produtos retornados

### Passo 4: Aplicar Correção

Baseado nos logs, aplicar uma das soluções propostas.

---

## 📊 RESUMO

### Produtos no Banco: ✅ CORRETOS

- 3 produtos de adesão cadastrados
- Todos ativos
- Tipos corretos (individual e logista)
- Valores corretos

### Código: ⚠️ POSSÍVEL PROBLEMA

- Lógica de conversão parece correta
- Mas pode haver problema no checkbox do frontend
- Ou problema na transmissão do valor

### Causa Mais Provável

1. **Checkbox sempre marcado** (bug no frontend)
2. **Valor não sendo enviado** (campo undefined)
3. **Produto específico não existe** (deletado/desativado)

### Ação Recomendada

**ADICIONAR LOGS E TESTAR** para identificar a causa exata.

---

**Análise realizada por:** Kiro AI  
**Data:** 11/03/2026  
**Status:** Aguardando testes para confirmar causa raiz

