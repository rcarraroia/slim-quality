# 🔍 ANÁLISE: ASSINATURAS RECORRENTES NÃO IMPLEMENTADAS

**Data:** 10/03/2026  
**Analista:** Kiro AI  
**Solicitante:** Renato Carraro

---

## 📋 RESUMO EXECUTIVO

**PROBLEMA CRÍTICO IDENTIFICADO:** O sistema de monetização de afiliados **NÃO está criando assinaturas recorrentes** no Asaas para afiliados individuais premium e logistas, apesar de usar um gateway de pagamento que suporta cobranças recorrentes.

**IMPACTO:**
- ❌ Afiliados individuais premium pagam apenas a adesão (R$ 97,00) mas **não são cobrados mensalmente** (R$ 97,00/mês)
- ❌ Logistas pagam apenas a adesão (R$ 197,00) mas **não são cobrados mensalmente** (R$ 97,00/mês)
- ❌ Sistema perde receita recorrente mensal
- ❌ Afiliados têm acesso vitalício após pagar apenas a adesão

---

## 🔎 ANÁLISE DETALHADA

### 1. PRODUTOS CONFIGURADOS NO BANCO

```sql
-- Produtos de adesão cadastrados:

1. Adesão Individual (Básico)
   - SKU: ADI-TEST-001
   - Adesão: R$ 97,00
   - Mensalidade: NULL
   - is_subscription: false ✅ CORRETO (não tem mensalidade)

2. Adesão Individual Premium
   - SKU: COL-F72843
   - Adesão: R$ 97,00
   - Mensalidade: R$ 97,00
   - is_subscription: true ⚠️ FLAG ATIVA MAS NÃO USADA

3. Adesão Logista
   - SKU: ADL-TEST-001
   - Adesão: R$ 197,00
   - Mensalidade: R$ 97,00
   - is_subscription: true ⚠️ FLAG ATIVA MAS NÃO USADA
```

### 2. FLUXO ATUAL (PAYMENT FIRST)

#### Passo 1: Usuário preenche formulário
- Escolhe plano (Individual Básico, Individual Premium ou Logista)
- Dados salvos em `payment_sessions` (temporário)

#### Passo 2: Sistema cria cobrança única no Asaas
**Arquivo:** `api/subscriptions/create-payment.js`
**Função:** `handleCreateAffiliateMembership()`

```javascript
// Cria apenas UMA cobrança (taxa de adesão)
const paymentResponse = await fetch('https://api.asaas.com/v3/payments', {
  method: 'POST',
  body: JSON.stringify({
    customer: asaasCustomerId,
    billingType: payment_method,
    value: amount, // Apenas adesão
    dueDate: dueDate,
    description: `Taxa de Adesão - ${product.name}`,
    externalReference: externalReference
    // ❌ NÃO cria subscription recorrente
  })
});
```

#### Passo 3: Webhook confirma pagamento
**Arquivo:** `api/webhook-assinaturas.js`
**Função:** `handlePreRegistrationPayment()`

```javascript
// Cria afiliado com payment_status: 'active'
const { data: affiliate } = await supabase
  .from('affiliates')
  .insert({
    user_id: userId,
    payment_status: 'active', // ✅ Ativo após pagar adesão
    status: 'active',
    // ...
  });

// ❌ NÃO cria assinatura recorrente no Asaas
// ❌ NÃO registra em multi_agent_subscriptions
```

### 3. O QUE ESTÁ FALTANDO

#### ❌ Criação de Subscription no Asaas

Após confirmar o pagamento da adesão, o sistema deveria:

```javascript
// CÓDIGO QUE DEVERIA EXISTIR (mas não existe):

if (product.is_subscription && product.monthly_fee_cents > 0) {
  // Criar assinatura recorrente no Asaas
  const subscriptionResponse = await fetch('https://api.asaas.com/v3/subscriptions', {
    method: 'POST',
    body: JSON.stringify({
      customer: asaasCustomerId,
      billingType: 'CREDIT_CARD', // ou PIX
      value: product.monthly_fee_cents / 100,
      cycle: 'MONTHLY',
      nextDueDate: calcularProximaCobranca(), // +30 dias
      description: `Mensalidade - ${product.name}`,
      externalReference: `affiliate_${affiliateId}`,
      split: splits // Comissionamento
    })
  });
  
  // Salvar assinatura em multi_agent_subscriptions
  await supabase.from('multi_agent_subscriptions').insert({
    affiliate_id: affiliateId,
    asaas_subscription_id: subscription.id,
    status: 'active',
    next_due_date: proximaCobranca
  });
}
```

#### ❌ Webhook não processa renovações mensais

O webhook atual tem lógica para processar eventos de assinaturas recorrentes:

```javascript
// CÓDIGO EXISTE mas NUNCA É EXECUTADO (sem assinaturas criadas):

case 'PAYMENT_CONFIRMED':
  await handlePaymentConfirmed(supabase, asaasSubscriptionId);
  break;

case 'PAYMENT_OVERDUE':
  await handlePaymentOverdue(supabase, asaasSubscriptionId);
  break;
```

Mas como **nenhuma assinatura é criada**, esses eventos **nunca acontecem**.

---

## 🎯 IMPACTO FINANCEIRO

### Cenário Atual (ERRADO):

| Tipo | Adesão | Mensalidade | Total Ano 1 | Total Ano 2+ |
|------|--------|-------------|-------------|--------------|
| Individual Premium | R$ 97 | R$ 0 ❌ | R$ 97 | R$ 0 |
| Logista | R$ 197 | R$ 0 ❌ | R$ 197 | R$ 0 |

### Cenário Correto (ESPERADO):

| Tipo | Adesão | Mensalidade | Total Ano 1 | Total Ano 2+ |
|------|--------|-------------|-------------|--------------|
| Individual Premium | R$ 97 | R$ 97/mês | R$ 1.261 | R$ 1.164 |
| Logista | R$ 197 | R$ 97/mês | R$ 1.361 | R$ 1.164 |

### Perda de Receita:

- **Individual Premium:** R$ 1.164/ano por afiliado (após ano 1)
- **Logista:** R$ 1.164/ano por logista (após ano 1)

**Exemplo com 100 afiliados premium:**
- Receita atual: R$ 9.700 (apenas adesões)
- Receita esperada: R$ 126.100 (adesões + 12 meses)
- **PERDA: R$ 116.400/ano** ❌

---

## ✅ SOLUÇÃO PROPOSTA

### Fase 1: Criar Assinatura Recorrente Após Adesão

**Arquivo:** `api/webhook-assinaturas.js`
**Função:** `handlePreRegistrationPayment()`

**Adicionar após ETAPA 8 (registrar pagamento):**

```javascript
// ============================================================
// ETAPA 8.5: CRIAR ASSINATURA RECORRENTE (SE APLICÁVEL)
// ============================================================
if (session.affiliate_type === 'logista' || session.has_subscription) {
  console.log('[WH-PreReg] 🔄 Criando assinatura recorrente...');
  
  // Buscar produto para obter monthly_fee_cents
  const { data: product } = await supabase
    .from('products')
    .select('monthly_fee_cents, name')
    .eq('category', 'adesao_afiliado')
    .eq('eligible_affiliate_type', session.affiliate_type)
    .eq('is_subscription', true)
    .single();
  
  if (product && product.monthly_fee_cents > 0) {
    // Calcular próxima cobrança (+30 dias)
    const nextDueDate = new Date();
    nextDueDate.setDate(nextDueDate.getDate() + 30);
    const nextDueDateStr = nextDueDate.toISOString().split('T')[0];
    
    // Calcular split
    const splits = await calculateSplit(supabase, affiliateId, product.monthly_fee_cents / 100);
    
    // Criar assinatura no Asaas
    const subscriptionResponse = await fetch('https://api.asaas.com/v3/subscriptions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': process.env.ASAAS_API_KEY
      },
      body: JSON.stringify({
        customer: payment.customer, // Customer já existe
        billingType: 'CREDIT_CARD', // Padrão para recorrência
        value: product.monthly_fee_cents / 100,
        cycle: 'MONTHLY',
        nextDueDate: nextDueDateStr,
        description: `Mensalidade - ${product.name}`,
        externalReference: `affiliate_${affiliateId}`,
        split: splits
      })
    });
    
    if (subscriptionResponse.ok) {
      const subscription = await subscriptionResponse.json();
      
      // Salvar em multi_agent_subscriptions
      await supabase.from('multi_agent_subscriptions').insert({
        affiliate_id: affiliateId,
        asaas_subscription_id: subscription.id,
        status: 'active',
        next_due_date: nextDueDateStr,
        created_at: new Date().toISOString()
      });
      
      console.log('[WH-PreReg] ✅ Assinatura recorrente criada:', subscription.id);
    } else {
      const errorData = await subscriptionResponse.json();
      console.error('[WH-PreReg] ❌ Erro ao criar assinatura:', errorData);
      // NÃO bloqueia - assinatura pode ser criada manualmente
    }
  }
}
```

### Fase 2: Atualizar Função de Upgrade

**Arquivo:** `api/webhook-assinaturas.js`
**Função:** `handleUpgradePayment()` (já existe)

**Garantir que cria assinatura recorrente ao fazer upgrade:**

```javascript
// Após confirmar pagamento de upgrade, criar assinatura
if (product.is_subscription && product.monthly_fee_cents > 0) {
  // Mesmo código da Fase 1
}
```

### Fase 3: Validar Webhook de Renovação

**Arquivo:** `api/webhook-assinaturas.js`
**Funções:** `handlePaymentConfirmed()`, `handlePaymentOverdue()`

**Já implementadas, mas nunca testadas porque não há assinaturas.**

Após implementar Fase 1 e 2, testar:
- ✅ Renovação mensal automática
- ✅ Suspensão por inadimplência
- ✅ Reativação após pagamento

---

## 📊 CHECKLIST DE IMPLEMENTAÇÃO

### Fase 1: Criar Assinatura Após Adesão
- [ ] Adicionar lógica em `handlePreRegistrationPayment()`
- [ ] Testar com afiliado individual premium
- [ ] Testar com logista
- [ ] Validar criação em `multi_agent_subscriptions`
- [ ] Validar assinatura no Asaas Dashboard

### Fase 2: Atualizar Upgrade
- [ ] Adicionar lógica em `handleUpgradePayment()`
- [ ] Testar upgrade de individual básico → premium
- [ ] Validar criação de assinatura

### Fase 3: Testar Renovação
- [ ] Aguardar 30 dias (ou usar sandbox Asaas)
- [ ] Validar cobrança mensal automática
- [ ] Validar webhook PAYMENT_CONFIRMED
- [ ] Validar comissionamento mensal

### Fase 4: Testar Inadimplência
- [ ] Simular pagamento atrasado
- [ ] Validar webhook PAYMENT_OVERDUE
- [ ] Validar suspensão de acesso
- [ ] Validar reativação após pagamento

---

## 🚨 RISCOS E CONSIDERAÇÕES

### 1. Afiliados Existentes

**Problema:** Afiliados que já pagaram adesão não têm assinatura recorrente.

**Solução:**
- Criar script de migração para criar assinaturas retroativas
- Ou: Notificar afiliados para reativar com mensalidade

### 2. Método de Pagamento

**Problema:** PIX não suporta cobrança recorrente automática no Asaas.

**Solução:**
- Forçar CREDIT_CARD para assinaturas recorrentes
- Ou: Gerar boleto mensal para PIX (manual)

### 3. Comissionamento

**Problema:** Comissões mensais precisam ser calculadas a cada renovação.

**Solução:**
- Webhook `PAYMENT_CONFIRMED` já chama `calculateAndSaveCommissions()`
- Validar que está funcionando corretamente

---

## 📝 CONCLUSÃO

O sistema atual **NÃO está cobrando mensalidades** de afiliados individuais premium e logistas, apesar de:

1. ✅ Produtos configurados com `is_subscription: true`
2. ✅ Webhook preparado para processar renovações
3. ✅ Tabela `multi_agent_subscriptions` criada
4. ❌ **FALTA:** Criar assinatura no Asaas após confirmar adesão

**AÇÃO IMEDIATA NECESSÁRIA:**
Implementar Fase 1 (criar assinatura após adesão) para começar a gerar receita recorrente.

**ESTIMATIVA DE IMPLEMENTAÇÃO:**
- Fase 1: 2-3 horas
- Fase 2: 1 hora
- Fase 3: Testes (depende de sandbox Asaas)
- Fase 4: Testes (depende de sandbox Asaas)

**PRIORIDADE:** 🔴 CRÍTICA (perda de receita recorrente)

---

**Documento gerado em:** 10/03/2026  
**Próxima ação:** Aguardar autorização para implementar
