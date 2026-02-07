# ANÁLISE COMPLETA: Sistema de Assinaturas - Problema do Webhook

**Data:** 05/02/2026  
**Responsável:** Kiro AI  
**Status:** ANÁLISE CONCLUÍDA - Aguardando autorização para implementação  

## 🔍 ANÁLISE PREVENTIVA REALIZADA

### ✅ DESCOBERTAS CRÍTICAS DA AUDITORIA

**1. ESTADO ATUAL DO BANCO DE DADOS:**
- `subscription_orders`: 0 registros (tabela vazia)
- `multi_agent_subscriptions`: 0 registros (tabela vazia)  
- `multi_agent_tenants`: 2 registros ativos (tenants já existem)

**2. SISTEMA ANTIGO (checkout.js):**
- ✅ **NÃO CONTÉM** lógica de assinatura
- ✅ **NÃO VIOLA** Requirement 2.1 da spec
- ✅ **NÃO PRECISA** de correção
- Busca por `subscription|assinatura|COL-707D80|IA|Agent|707D80` = **0 resultados**

**3. PROBLEMA REAL IDENTIFICADO:**
- Webhook `/api/webhook-assinaturas` configurado no Asaas para `PAYMENT_CONFIRMED`
- Webhook espera `payment.subscription` (assinatura tradicional)
- Sistema novo usa Payment First: `payment.subscription = null`
- Webhook **IGNORA** pagamentos Payment First na linha 43-45
- Tenant **NUNCA É ATIVADO** para Payment First

## 🎯 PROBLEMA RAIZ CONFIRMADO

**CENÁRIO ATUAL (NÃO FUNCIONA):**
1. Frontend → `create-payment.js` → Asaas `/v3/payments` (Payment First)
2. Asaas → Webhook `PAYMENT_CONFIRMED` → `webhook-assinaturas.js`
3. Webhook: `payment.subscription = null` → **IGNORA EVENTO**
4. Tenant nunca é ativado
5. Cliente paga mas não tem acesso

## 🛠️ SOLUÇÃO PROPOSTA

### **CORREÇÃO DO WEBHOOK (ÚNICA NECESSÁRIA):**

**Modificar `api/webhook-assinaturas.js` linha 43-45:**

```javascript
// ANTES (PROBLEMÁTICO):
if (!asaasSubscriptionId) {
  console.log('[WH-Assinaturas] ⚠️ Evento ignorado: asaasSubscriptionId não encontrado');
  return res.status(200).json({ received: true, message: 'Sem ID de assinatura' });
}

// DEPOIS (CORRIGIDO):
if (!asaasSubscriptionId) {
  // Verificar se é Payment First via externalReference
  const externalRef = payment?.externalReference;
  if (externalRef && externalRef.startsWith('subscription_')) {
    console.log('[WH-Assinaturas] 🔄 Processando Payment First:', externalRef);
    await handlePaymentFirstConfirmed(supabase, payment);
    return res.status(200).json({ success: true, type: 'payment_first' });
  }
  
  console.log('[WH-Assinaturas] ⚠️ Evento ignorado: não é assinatura nem Payment First');
  return res.status(200).json({ received: true, message: 'Sem ID de assinatura' });
}
```

**Nova função `handlePaymentFirstConfirmed`:**
```javascript
async function handlePaymentFirstConfirmed(supabase, payment) {
  // 1. Atualizar subscription_orders
  const { data: order } = await supabase
    .from('subscription_orders')
    .update({ status: 'active' })
    .eq('asaas_payment_id', payment.id)
    .select('user_id, affiliate_data')
    .single();

  if (!order) return;

  // 2. Buscar/criar tenant
  const { data: tenant } = await supabase
    .from('multi_agent_tenants')
    .select('id')
    .eq('affiliate_id', order.user_id)
    .single();

  if (tenant) {
    // 3. Ativar tenant existente
    await supabase
      .from('multi_agent_tenants')
      .update({
        status: 'active',
        activated_at: new Date().toISOString()
      })
      .eq('id', tenant.id);
  }
}
```

## ✅ VALIDAÇÃO DA PROPOSTA

**CENÁRIO CORRIGIDO (VAI FUNCIONAR):**
1. Frontend → `create-payment.js` → Asaas `/v3/payments` (Payment First)
2. `create-payment.js` salva em `subscription_orders` com `asaas_payment_id`
3. Asaas → Webhook `PAYMENT_CONFIRMED` → `webhook-assinaturas.js`
4. Webhook: `payment.subscription = null` MAS `externalReference = subscription_*`
5. Webhook chama `handlePaymentFirstConfirmed`
6. Atualiza `subscription_orders.status = 'active'`
7. Ativa tenant em `multi_agent_tenants.status = 'active'`
8. ✅ Cliente tem acesso ao agente

## 📊 IMPACTO DA CORREÇÃO

**ARQUIVOS MODIFICADOS:** 1 (apenas `webhook-assinaturas.js`)
**LINHAS ALTERADAS:** ~20 linhas
**RISCO:** BAIXO (apenas adiciona lógica, não remove)
**TEMPO ESTIMADO:** 15 minutos implementação + 10 minutos teste

## 🚫 O QUE NÃO PRECISA SER FEITO

- ❌ Modificar `checkout.js` (não tem lógica de assinatura)
- ❌ Modificar Edge Functions (não estão em uso)
- ❌ Modificar `create-payment.js` (já funciona corretamente)
- ❌ Modificar estrutura de tabelas (já estão corretas)

## 🎯 PRÓXIMOS PASSOS

1. **AUTORIZAÇÃO:** Aguardar aprovação para implementar
2. **IMPLEMENTAÇÃO:** Modificar webhook conforme proposta
3. **TESTE:** Simular pagamento Payment First
4. **VALIDAÇÃO:** Confirmar ativação do tenant

## 📝 OBSERVAÇÕES IMPORTANTES

- Sistema antigo (checkout.js) está limpo - não precisa correção
- Edge Functions não estão no fluxo de produção - podem ser ignoradas
- Tabelas estão corretas - problema é apenas no webhook
- Solução é cirúrgica e de baixo risco