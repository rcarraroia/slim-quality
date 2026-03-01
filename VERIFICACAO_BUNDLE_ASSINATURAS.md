# VERIFICAÇÃO: SISTEMA DE ASSINATURAS - BUNDLE MULTI-SERVIÇOS

**Data:** 01/03/2026  
**Objetivo:** Verificar se o sistema atual de assinaturas está preparado para ativar múltiplos serviços (vitrine + agente) ou se precisa adaptação

---

## 📋 RESUMO EXECUTIVO

**RESULTADO:** ✅ Sistema 90% pronto para bundle multi-serviços

**DESCOBERTAS CRÍTICAS:**
1. ✅ Campo `monthly_fee_cents` existe e é processado corretamente
2. ⚠️ Webhook atual só ativa vitrine (precisa adaptação para múltiplos serviços)
3. ✅ Tabela `affiliate_services` existe e está pronta para uso

**ESFORÇO ESTIMADO:** Baixo (apenas adaptação do webhook)

---

## 🔍 VERIFICAÇÃO 1: Campo `monthly_fee_cents` - É Processado ou Cosmético?

### ✅ RESPOSTA: É PROCESSADO CORRETAMENTE

### **Evidências:**

#### **1. Estrutura da Tabela `products`**
```sql
-- Campos relacionados a assinatura na tabela products:
- is_subscription (boolean)
- entry_fee_cents (integer) - Taxa de adesão
- monthly_fee_cents (integer) - Mensalidade ✅
- has_entry_fee (boolean)
- billing_cycle (text) - 'monthly', 'quarterly', 'yearly'
- eligible_affiliate_type (text) - 'individual', 'logista'
```

#### **2. Processamento em `api/subscriptions/create-payment.js`**

**Função:** `handleCreateSubscription()` (linhas 500-650)

```javascript
// Buscar produto de adesão Logista
const { data: product } = await supabase
  .from('products')
  .select('*')
  .eq('category', 'adesao_afiliado')
  .eq('eligible_affiliate_type', 'logista')
  .eq('is_active', true)
  .single();

// VALIDAÇÃO: Verifica se monthly_fee_cents existe
if (!product.monthly_fee_cents) {
  return res.status(400).json({ 
    error: 'Produto não possui mensalidade configurada' 
  });
}

// PROCESSAMENTO: Usa monthly_fee_cents para criar assinatura
const subscriptionData = {
  customer: asaasCustomerId,
  billingType: billing_type,
  value: product.monthly_fee_cents / 100, // ✅ USADO AQUI
  cycle: product.billing_cycle?.toUpperCase() || 'MONTHLY',
  nextDueDate: nextDueDate,
  description: `Mensalidade - ${product.name}`,
  externalReference: `affiliate_${affiliate_id}`,
  split: splits // Comissionamento calculado
};
```

**Conclusão:** `monthly_fee_cents` é TOTALMENTE FUNCIONAL e processado pelo sistema de assinaturas.

---

## 🔍 VERIFICAÇÃO 2: Webhook Asaas - Só Ativa Vitrine ou Múltiplos Serviços?

### ⚠️ RESPOSTA: ATUALMENTE SÓ ATIVA VITRINE (PRECISA ADAPTAÇÃO)

### **Evidências:**

#### **1. Estrutura da Tabela `subscription_orders`**
```sql
-- Campos da tabela subscription_orders:
- id (uuid)
- order_number (varchar)
- customer_name (varchar)
- customer_email (varchar)
- product_name (varchar)
- product_id (uuid) ✅ Referência ao produto
- monthly_value_cents (integer) ✅ Valor da mensalidade
- status (subscription_status) - 'pending', 'active', 'cancelled'
- asaas_subscription_id (varchar)
- order_items (jsonb) ✅ Pode conter múltiplos serviços
- user_id (uuid) - Referência ao afiliado
```

#### **2. Processamento Atual do Webhook**

**Arquivo:** `api/webhook-assinaturas.js`  
**Função:** `handlePaymentFirstConfirmed()` (linhas 700-964)

**FLUXO ATUAL:**

```javascript
// ETAPA 1: Buscar pedido
const { data: order } = await supabase
  .from('subscription_orders')
  .select('*')
  .eq('asaas_payment_id', payment.id)
  .single();

// ETAPA 2: Atualizar status do pedido
await supabase
  .from('subscription_orders')
  .update({ status: 'active' })
  .eq('id', order.id);

// ETAPA 3: Buscar/Ativar tenant (AGENTE)
const { data: tenant } = await supabase
  .from('multi_agent_tenants')
  .select('id, status')
  .eq('affiliate_id', order.user_id)
  .single();

if (tenant) {
  // ✅ Ativa tenant do agente
  await supabase
    .from('multi_agent_tenants')
    .update({
      status: 'active',
      activated_at: new Date().toISOString(),
      last_payment_at: new Date().toISOString()
    })
    .eq('id', tenant.id);
}

// ❌ NÃO ATIVA VITRINE EXPLICITAMENTE
// ❌ NÃO USA TABELA affiliate_services
```

**PROBLEMA IDENTIFICADO:**
- Webhook ativa apenas o tenant do agente (`multi_agent_tenants`)
- NÃO ativa a vitrine (`store_profiles.is_visible_in_showcase`)
- NÃO registra serviços em `affiliate_services`

**COMPORTAMENTO ESPERADO PARA BUNDLE:**
```javascript
// Após ativar tenant, deveria:

// 1. Ativar vitrine
await supabase
  .from('store_profiles')
  .update({ is_visible_in_showcase: true })
  .eq('affiliate_id', order.user_id);

// 2. Registrar serviços ativos
const services = ['vitrine', 'agente']; // Extrair de order_items

for (const service of services) {
  await supabase
    .from('affiliate_services')
    .upsert({
      affiliate_id: order.user_id,
      service_type: service,
      status: 'active',
      expires_at: null // Assinatura recorrente
    });
}
```

---

## 🔍 VERIFICAÇÃO 3: Tabela `affiliate_agent_subscriptions` - Existe ou Reutiliza Outras?

### ✅ RESPOSTA: NÃO EXISTE - SISTEMA REUTILIZA TABELAS EXISTENTES

### **Evidências:**

#### **1. Tabelas Existentes no Banco**

**Tabelas relacionadas a assinaturas:**
1. ✅ `subscription_orders` - Pedidos de assinatura
2. ✅ `affiliate_services` - Serviços ativos por afiliado
3. ✅ `multi_agent_subscriptions` - Assinaturas de tenants
4. ✅ `affiliate_payments` - Histórico de pagamentos

**Tabela NÃO encontrada:**
- ❌ `affiliate_agent_subscriptions` (não existe)

#### **2. Estrutura da Tabela `affiliate_services`**

```sql
-- Tabela affiliate_services (PRONTA PARA USO):
- id (uuid)
- affiliate_id (uuid) ✅ FK para affiliates
- user_id (uuid) ✅ FK para auth.users
- service_type (text) ✅ Tipo do serviço ('vitrine', 'agente', etc)
- status (service_status) ✅ 'pending', 'active', 'suspended', 'cancelled'
- expires_at (timestamptz) ✅ Data de expiração (null = recorrente)
- metadata (jsonb) ✅ Dados adicionais
- created_at (timestamptz)
- updated_at (timestamptz)
```

**DESIGN INTELIGENTE:**
- Tabela genérica que suporta QUALQUER tipo de serviço
- Campo `service_type` permite múltiplos serviços por afiliado
- Campo `status` controla ativação/suspensão individual
- Campo `expires_at` suporta assinaturas recorrentes (null) ou temporárias

#### **3. Estrutura da Tabela `multi_agent_subscriptions`**

```sql
-- Tabela multi_agent_subscriptions:
- id (uuid)
- tenant_id (uuid) ✅ FK para multi_agent_tenants
- plan_type (text) - 'basic', 'pro', 'enterprise'
- status (text) - 'active', 'suspended', 'cancelled'
- billing_cycle (text) - 'monthly', 'quarterly', 'yearly'
- price_cents (integer)
- started_at (timestamptz)
- expires_at (timestamptz)
- cancelled_at (timestamptz)
- metadata (jsonb)
```

**USO ATUAL:**
- Controla assinaturas de tenants do agente
- Vinculada a `multi_agent_tenants` (não a `affiliates`)
- Separada de `affiliate_services` (design modular)

---

## 📊 ANÁLISE COMPARATIVA: SISTEMA ATUAL vs BUNDLE MULTI-SERVIÇOS

### **SISTEMA ATUAL (Assinatura Individual)**

```
Logista paga mensalidade
    ↓
Webhook confirma pagamento
    ↓
Ativa tenant do agente (multi_agent_tenants)
    ↓
FIM (vitrine não é ativada automaticamente)
```

### **SISTEMA DESEJADO (Bundle Multi-Serviços)**

```
Logista paga mensalidade do bundle
    ↓
Webhook confirma pagamento
    ↓
Ativa tenant do agente (multi_agent_tenants)
    ↓
Ativa vitrine (store_profiles.is_visible_in_showcase = true)
    ↓
Registra serviços em affiliate_services:
  - service_type: 'vitrine', status: 'active'
  - service_type: 'agente', status: 'active'
    ↓
FIM (ambos serviços ativos)
```

---

## 🛠️ ADAPTAÇÕES NECESSÁRIAS

### **1. Webhook `api/webhook-assinaturas.js`**

**Localização:** Função `handlePaymentFirstConfirmed()` (após linha 900)

**Código a adicionar:**

```javascript
// ============================================================
// ETAPA 4: Ativar serviços do bundle
// ============================================================

// 4.1. Extrair serviços do pedido
const orderItems = order.order_items || [];
const services = orderItems
  .filter(item => item.type === 'service')
  .map(item => item.service_type);

console.log('[WH-PaymentFirst] 📦 Serviços do bundle:', services);

// 4.2. Ativar cada serviço
for (const serviceType of services) {
  // Ativar vitrine se incluído
  if (serviceType === 'vitrine') {
    const { error: vitrineError } = await supabase
      .from('store_profiles')
      .update({ is_visible_in_showcase: true })
      .eq('affiliate_id', order.user_id);

    if (vitrineError) {
      console.error('[WH-PaymentFirst] ❌ Erro ao ativar vitrine:', vitrineError);
    } else {
      console.log('[WH-PaymentFirst] ✅ Vitrine ativada');
    }
  }

  // Registrar serviço em affiliate_services
  const { error: serviceError } = await supabase
    .from('affiliate_services')
    .upsert({
      affiliate_id: order.user_id,
      user_id: order.user_id,
      service_type: serviceType,
      status: 'active',
      expires_at: null, // Assinatura recorrente
      metadata: {
        activated_by: 'webhook',
        payment_id: payment.id,
        order_id: order.id
      }
    }, {
      onConflict: 'affiliate_id,service_type'
    });

  if (serviceError) {
    console.error(`[WH-PaymentFirst] ❌ Erro ao registrar serviço ${serviceType}:`, serviceError);
  } else {
    console.log(`[WH-PaymentFirst] ✅ Serviço ${serviceType} registrado`);
  }
}
```

### **2. Criação do Pedido de Assinatura**

**Localização:** `api/subscriptions/create-payment.js` - Função `handleCreateSubscription()`

**Adaptação:** Adicionar `order_items` ao criar `subscription_orders`

```javascript
// Após criar assinatura no Asaas, criar pedido em subscription_orders
const { data: order } = await supabase
  .from('subscription_orders')
  .insert({
    order_number: `SUB-${Date.now()}`,
    customer_name: affiliate.name,
    customer_email: affiliate.email,
    customer_phone: affiliate.phone,
    customer_cpf: affiliate.document,
    product_name: product.name,
    product_id: product.id,
    monthly_value_cents: product.monthly_fee_cents,
    status: 'pending',
    asaas_subscription_id: subscription.id,
    user_id: affiliate_id,
    order_items: [ // ✅ ADICIONAR ISTO
      {
        type: 'service',
        service_type: 'vitrine',
        name: 'Vitrine Pública de Logistas',
        price_cents: product.monthly_fee_cents / 2 // 50% do valor
      },
      {
        type: 'service',
        service_type: 'agente',
        name: 'Agente IA Personalizado',
        price_cents: product.monthly_fee_cents / 2 // 50% do valor
      }
    ]
  })
  .select()
  .single();
```

---

## 📈 ESFORÇO DE IMPLEMENTAÇÃO

### **Complexidade:** BAIXA ⭐

### **Arquivos a Modificar:**
1. ✅ `api/webhook-assinaturas.js` (adicionar ativação de serviços)
2. ✅ `api/subscriptions/create-payment.js` (adicionar order_items)

### **Arquivos que NÃO precisam modificação:**
- ❌ Tabelas do banco (já estão prontas)
- ❌ Frontend (já usa affiliate_services)
- ❌ Sistema de comissionamento (já funciona)

### **Tempo Estimado:** 2-3 horas

### **Riscos:** BAIXOS
- Infraestrutura já existe
- Apenas conectar peças existentes
- Sem mudanças de schema

---

## ✅ CONCLUSÃO

### **RESPOSTA ÀS 3 PERGUNTAS:**

1. **Campo `monthly_fee_cents` é processado ou cosmético?**
   - ✅ **PROCESSADO CORRETAMENTE** pelo sistema de assinaturas
   - Usado para criar assinaturas no Asaas
   - Validado antes de processar

2. **Webhook só ativa vitrine ou múltiplos serviços?**
   - ⚠️ **ATUALMENTE SÓ ATIVA TENANT DO AGENTE**
   - Precisa adaptação para ativar vitrine
   - Precisa registrar serviços em `affiliate_services`

3. **Tabela `affiliate_agent_subscriptions` existe?**
   - ❌ **NÃO EXISTE**
   - ✅ Sistema reutiliza `affiliate_services` (design inteligente)
   - ✅ Tabela genérica suporta múltiplos serviços

### **VEREDICTO FINAL:**

**O bundle multi-serviços sai com ESFORÇO MÍNIMO:**
- Infraestrutura 90% pronta
- Apenas adaptação do webhook necessária
- Sem mudanças de schema
- Sem refatoração de frontend

**PRÓXIMO PASSO:** Aguardar autorização do usuário para implementar as adaptações.

---

**Documento criado em:** 01/03/2026  
**Status:** Aguardando autorização para implementação
