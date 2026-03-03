# 🔍 ANÁLISE TÉCNICA: MODELO DE 3 PLANOS

**Data:** 03/03/2026  
**Analista:** Kiro AI  
**Solicitante:** Renato Carraro

---

## 📋 CONTEXTO

Renato propôs mudança estratégica no modelo de negócio:

### **Modelo Atual (Spec Criada):**
- Individual: Adesão + Mensalidade → Vitrine + Agente IA
- Logista: Adesão + Mensalidade → Vitrine + Agente IA + Show Room

### **Novo Modelo Proposto (3 Planos):**
1. **Individual SEM mensalidade** (manter como está): Só adesão, SEM vitrine, SEM agente, programa de afiliados normal
2. **Individual COM mensalidade** (NOVO): Adesão + mensalidade → Vitrine + Agente IA (sem Show Room)
3. **Logista** (inalterado): Adesão + mensalidade → Vitrine + Agente IA + Show Room

---

## 🎯 RESPOSTAS DO USUÁRIO

1. **Upgrade posterior?** ✅ SIM - Permitir upgrade de Individual SEM → Individual COM mensalidade
2. **Campo no banco?** 🤔 Decisão técnica (análise abaixo)
3. **UI do cadastro?** ✅ Checkbox simples
4. **Comissionamento?** ✅ SIM - Mensalidade gera comissão (10% Slim + 90% Renum/JB quando sem rede)
5. **Individuais existentes?** ✅ Oferecer upgrade

---

## 🗄️ ANÁLISE DO BANCO DE DADOS REAL

### **1. Estrutura da Tabela `affiliates`**

**Campos Relevantes Identificados:**
```sql
affiliate_type          TEXT (ENUM)    DEFAULT 'individual'  -- individual | logista
payment_status          TEXT           DEFAULT 'active'      -- active | pending | overdue | suspended
asaas_customer_id       TEXT           NULL                  -- ID do customer no Asaas
```

**Observações Críticas:**
- ✅ Campo `payment_status` JÁ EXISTE e é usado para controlar assinaturas
- ✅ Campo `affiliate_type` JÁ EXISTE (individual | logista)
- ⚠️ **PROBLEMA:** `payment_status` tem valor padrão `'active'` para TODOS os afiliados
- ⚠️ **PROBLEMA:** Não há distinção entre "individual sem mensalidade" e "individual com mensalidade"

### **2. Produtos de Adesão Atuais**

**Produtos Encontrados:**
```sql
-- Individual (SEM mensalidade atualmente)
id: 4922aa8c-3ade-4f34-878b-6c4e785a54da
name: "Adesão Individual - Teste"
category: adesao_afiliado
eligible_affiliate_type: individual
entry_fee_cents: 500 (R$ 5,00)
monthly_fee_cents: NULL
has_entry_fee: true
is_subscription: false

-- Logista (COM mensalidade)
id: ba0de318-661f-4d42-890c-5ba62e0530e1
name: "Adesão Logista - Teste"
category: adesao_afiliado
eligible_affiliate_type: logista
entry_fee_cents: 1000 (R$ 10,00)
monthly_fee_cents: 999 (R$ 9,99)
has_entry_fee: true
is_subscription: true
```

### **3. Afiliados Existentes**

**Dados Reais:**
```
Total de Individuais: 25
  - Com payment_status = 'active': 25 (100%)
  
Total de Logistas: 1
  - Com payment_status = 'active': 1 (100%)
```

**⚠️ PROBLEMA CRÍTICO IDENTIFICADO:**
- TODOS os 25 individuais têm `payment_status = 'active'`
- Mas o produto individual NÃO tem mensalidade (`monthly_fee_cents = NULL`)
- Isso significa que o campo `payment_status` está sendo usado incorretamente
- Individuais não deveriam ter `payment_status = 'active'` se não pagam mensalidade

---

## 🎯 DECISÃO TÉCNICA: MELHOR ABORDAGEM

### **❌ OPÇÃO 1: Usar `payment_status` Existente (NÃO RECOMENDADO)**

**Como funcionaria:**
```
Individual SEM mensalidade: payment_status = NULL ou 'inactive'
Individual COM mensalidade: payment_status = 'active'
Logista: payment_status = 'active'
```

**Problemas:**
1. ❌ Campo `payment_status` tem DEFAULT 'active' (todos começam com 'active')
2. ❌ 25 individuais existentes já têm 'active' mas não pagam mensalidade
3. ❌ Webhook verifica `payment_status === 'active'` para ativar bundle
4. ❌ Lógica atual assume que 'active' = tem assinatura ativa
5. ❌ Precisaria migrar dados de 25 individuais existentes
6. ❌ Semântica confusa: "active" não significa "tem mensalidade"

**Risco:** 🔴 ALTO - Quebra lógica existente e requer migração de dados

---

### **✅ OPÇÃO 2: Criar Campo `has_subscription` (RECOMENDADO)**

**Como funcionaria:**
```sql
-- Novo campo na tabela affiliates
has_subscription BOOLEAN DEFAULT false

-- Lógica:
Individual SEM mensalidade: has_subscription = false, payment_status = NULL
Individual COM mensalidade: has_subscription = true, payment_status = 'active'
Logista: has_subscription = true, payment_status = 'active'
```

**Vantagens:**
1. ✅ Semântica clara: `has_subscription` indica se afiliado tem mensalidade
2. ✅ `payment_status` continua indicando status do pagamento (quando aplicável)
3. ✅ Zero impacto em individuais existentes (todos ficam com `has_subscription = false`)
4. ✅ Webhook pode verificar: `has_subscription === true && payment_status === 'active'`
5. ✅ Fácil de entender e manter
6. ✅ Permite upgrade: `UPDATE affiliates SET has_subscription = true WHERE id = ?`
7. ✅ Compatível com lógica existente de logistas

**Desvantagens:**
- ⚠️ Adiciona 1 campo novo (mas é simples e claro)

**Risco:** 🟢 BAIXO - Alteração isolada, zero impacto em dados existentes

---

### **✅ OPÇÃO 3: Criar Novo Produto "Individual COM Mensalidade" (COMPLEMENTAR)**

**Como funcionaria:**
```sql
-- Criar novo produto
category: adesao_afiliado
eligible_affiliate_type: individual_premium (NOVO ENUM VALUE)
entry_fee_cents: 500
monthly_fee_cents: 6900 (R$ 69,00)
has_entry_fee: true
is_subscription: true
```

**Vantagens:**
1. ✅ Diferenciação clara via `affiliate_type`
2. ✅ Produtos separados para cada plano
3. ✅ Webhook pode verificar `affiliate_type IN ('individual_premium', 'logista')`
4. ✅ RLS policies podem usar `affiliate_type`

**Desvantagens:**
- ⚠️ Precisa adicionar valor ao ENUM `affiliate_type`
- ⚠️ Mais complexo que adicionar campo booleano
- ⚠️ Upgrade requer mudar `affiliate_type` (mais invasivo)

**Risco:** 🟡 MÉDIO - Alteração em ENUM e lógica de tipo

---

## 🏆 RECOMENDAÇÃO FINAL

### **ABORDAGEM HÍBRIDA (Opção 2 + Opção 3 Simplificada):**

**Decisão:** Usar campo `has_subscription` + manter `affiliate_type = 'individual'`

**Estrutura Proposta:**
```sql
-- Tabela affiliates
affiliate_type          TEXT           -- individual | logista (sem mudar)
has_subscription        BOOLEAN        -- false | true (NOVO CAMPO)
payment_status          TEXT           -- NULL | active | pending | overdue | suspended

-- Produtos
1. Individual SEM mensalidade:
   - eligible_affiliate_type: individual
   - has_entry_fee: true
   - is_subscription: false
   - monthly_fee_cents: NULL

2. Individual COM mensalidade (NOVO):
   - eligible_affiliate_type: individual
   - has_entry_fee: true
   - is_subscription: true
   - monthly_fee_cents: 6900

3. Logista (existente):
   - eligible_affiliate_type: logista
   - has_entry_fee: true
   - is_subscription: true
   - monthly_fee_cents: 12900
```

**Lógica de Ativação de Bundle:**
```javascript
// Webhook: detectBundlePayment()
async function detectBundlePayment(supabase, payment) {
  const { data: affiliate } = await supabase
    .from('affiliates')
    .select('has_subscription, payment_status')
    .eq('id', affiliateId)
    .single();
  
  // ✅ Ativa bundle se tem assinatura E pagamento ativo
  return affiliate.has_subscription === true && affiliate.payment_status === 'active';
}
```

**Lógica de Upgrade:**
```javascript
// Frontend: Botão "Fazer Upgrade"
async function upgradeToSubscription(affiliateId) {
  // 1. Buscar produto individual COM mensalidade
  const { data: product } = await supabase
    .from('products')
    .select('*')
    .eq('category', 'adesao_afiliado')
    .eq('eligible_affiliate_type', 'individual')
    .eq('is_subscription', true)
    .single();
  
  // 2. Criar assinatura no Asaas
  const payment = await createSubscription(product);
  
  // 3. Atualizar afiliado (após confirmação de pagamento via webhook)
  await supabase
    .from('affiliates')
    .update({ 
      has_subscription: true,
      payment_status: 'active'
    })
    .eq('id', affiliateId);
}
```

---

## 📊 COMPARAÇÃO DAS OPÇÕES

| Critério | Opção 1 (payment_status) | Opção 2 (has_subscription) | Opção 3 (ENUM) |
|----------|--------------------------|----------------------------|----------------|
| **Clareza Semântica** | ❌ Confuso | ✅ Muito claro | ✅ Claro |
| **Impacto em Dados Existentes** | ❌ Alto (25 individuais) | ✅ Zero | 🟡 Médio |
| **Complexidade de Implementação** | 🟡 Média | ✅ Baixa | ❌ Alta |
| **Facilidade de Upgrade** | 🟡 Média | ✅ Fácil | 🟡 Média |
| **Compatibilidade com Lógica Atual** | ❌ Quebra | ✅ Mantém | 🟡 Requer ajustes |
| **Manutenibilidade** | ❌ Difícil | ✅ Fácil | 🟡 Média |
| **Risco** | 🔴 ALTO | 🟢 BAIXO | 🟡 MÉDIO |

---

## ✅ DECISÃO FINAL

**ESCOLHO OPÇÃO 2: Campo `has_subscription`**

**Motivos:**
1. ✅ Semântica clara e autoexplicativa
2. ✅ Zero impacto em dados existentes (25 individuais ficam com `false`)
3. ✅ Implementação simples (1 campo booleano)
4. ✅ Upgrade fácil (apenas `UPDATE has_subscription = true`)
5. ✅ Compatível com lógica existente de webhook e RLS
6. ✅ Baixo risco de bugs
7. ✅ Fácil de entender e manter

**Migration Necessária:**
```sql
-- Adicionar campo has_subscription
ALTER TABLE affiliates 
ADD COLUMN has_subscription BOOLEAN DEFAULT false;

-- Atualizar logistas existentes (já têm mensalidade)
UPDATE affiliates 
SET has_subscription = true 
WHERE affiliate_type = 'logista' 
AND deleted_at IS NULL;

-- Criar índice para performance
CREATE INDEX idx_affiliates_has_subscription 
ON affiliates(has_subscription) 
WHERE deleted_at IS NULL;
```

---

## 🎯 PRÓXIMOS PASSOS

1. ✅ Criar migration para adicionar campo `has_subscription`
2. ✅ Criar novo produto "Individual COM Mensalidade"
3. ✅ Atualizar webhook para verificar `has_subscription && payment_status === 'active'`
4. ✅ Atualizar frontend com checkbox no cadastro
5. ✅ Criar página/modal de upgrade para individuais existentes
6. ✅ Atualizar RLS policies (se necessário)
7. ✅ Testes completos

---

**Aguardo sua aprovação para prosseguir com a atualização da spec baseada nesta decisão técnica.**
