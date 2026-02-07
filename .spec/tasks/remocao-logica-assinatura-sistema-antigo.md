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

**2. SISTEMA ANTIGO (checkout.js) - VERIFICAÇÃO INDEPENDENTE:**
- ❌ **CONTÉM** ~450 linhas de lógica de assinatura ATIVA (9 blocos principais)
- ❌ **VIOLA** Requirement 2.1 da spec em 3 pontos críticos
- ❌ **PRECISA** de remoção completa + guard clause de proteção
- **Achados:**
  - Linha 281: Usa `/subscriptions/` em vez de `/payments` (VIOLA Requirement 2.1)
  - Linhas 590-702: Bloco de 112 linhas com fluxo "Subscription First" (oposto da spec)
  - 11 referências a `isSubscription`, 3 a `COL-707D80`, 3 a `/subscriptions/`
- **Relatório completo:** `VERIFICACAO_CHECKOUT_JS.md` (verificação independente - Antigravity)

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

## 🛠️ SOLUÇÃO PROPOSTA EM 2 FASES

---

## 📦 **FASE 1: Remoção de Código de Assinatura + Guard Clause**

**Estimativa:** 2-4 horas  
**Risco:** ALTO (código entrelaçado com produtos físicos)  
**Objetivo:** Remover ~450 linhas de lógica de assinatura e adicionar proteção no endpoint `/api/checkout`

### **1.1 - Remover Blocos de Código de Assinatura**

**Arquivo:** `api/checkout.js`

**Blocos a remover/modificar:**

1. **Linhas 260-263:** Detecção de produto IA
   ```javascript
   // REMOVER:
   const orderItems = body.orderItems || [];
   const isIAProduct = orderItems.some(item => item.product_sku === 'COL-707D80' || item.sku === 'COL-707D80');
   const isSubscription = isIAProduct;
   ```

2. **Linhas 269-270:** Flag `isIAProduct` passada para split
   ```javascript
   // REMOVER flag isIAProduct (deixar só produtos físicos):
   const splits = await calculateAffiliateSplit(referralCode, ASAAS_WALLET_RENUM, ASAAS_WALLET_JB);
   ```

3. **Linhas 273:** Log de target Asaas
   ```javascript
   // REMOVER linha de log sobre subscription
   ```

4. **Linhas 279-366:** Bloco completo Payment First com cartão (88 linhas)
   ```javascript
   // REMOVER TODO o bloco if (isSubscription && billingType === 'CREDIT_CARD' && creditCard)
   ```

5. **Linhas 369-396:** Ramificação subscription para PIX/Boleto
   ```javascript
   // MODIFICAR: Remover verificação isSubscription, manter só /payments
   asaasEndpoint = '/payments';
   ```

6. **Linhas 454-482:** Buscar primeira cobrança de subscription
   ```javascript
   // REMOVER TODO o bloco if (isSubscription && !(billingType === 'CREDIT_CARD'))
   ```

7. **Linhas 483-491:** Tratamento especial Payment First
   ```javascript
   // REMOVER bloco else if (isSubscription && billingType === 'CREDIT_CARD')
   ```

8. **Linhas 590-702:** Processamento forçado do cartão (112 linhas!)
   ```javascript
   // REMOVER TODO o bloco if (isSubscription && billingType === 'CREDIT_CARD' && creditCard)
   ```

9. **Linhas 957-1134:** Lógica de split invertido
   ```javascript
   // MODIFICAR função calculateAffiliateSplit:
   // - Remover parâmetro isIAProduct
   // - Remover todos os blocos if (isIAProduct)
   // - Manter apenas lógica de produtos físicos
   ```

**Total:** ~450 linhas a remover/modificar

---

### **1.2 - Adicionar Guard Clause no checkout.js**

Após remover toda a lógica de assinatura, adicionar proteção explícita contra produtos IA.

**Arquivo:** `api/checkout.js`

**Localização:** No início da função handler, após o parse do body (aproximadamente linha 30-40)

**Código a adicionar:**

```javascript
// ============================================================
// GUARD: Rejeitar produtos IA (devem usar endpoint de assinaturas)
// ============================================================
const orderItems = body.orderItems || [];
const hasIAProduct = orderItems.some(item => 
  item.product_sku === 'COL-707D80' || 
  item.sku === 'COL-707D80'
);

if (hasIAProduct) {
  console.log('[Checkout] ❌ Tentativa de processar produto IA - rejeitado');
  return res.status(400).json({
    success: false,
    error: 'Produtos de assinatura (Agente IA) devem ser processados via endpoint dedicado',
    hint: 'Use POST /api/subscriptions/create-payment para produtos IA',
    documentation: 'Consulte .spec/subscription-payment-flow/ para detalhes'
  });
}
```

**Teste de Validação:**

```bash
# Teste 1: Produto IA deve ser rejeitado
curl -X POST https://slimquality.com.br/api/checkout \
  -H "Content-Type: application/json" \
  -d '{
    "orderItems": [{ "sku": "COL-707D80", "quantity": 1 }]
  }'

# Resultado esperado: HTTP 400
# {
#   "success": false,
#   "error": "Produtos de assinatura (Agente IA) devem ser processados via endpoint dedicado",
#   "hint": "Use POST /api/subscriptions/create-payment para produtos IA"
# }

# Teste 2: Produto físico deve funcionar normalmente
curl -X POST https://slimquality.com.br/api/checkout \
  -H "Content-Type: application/json" \
  -d '{
    "orderItems": [{ "sku": "PROD-FISICO-001", "quantity": 1 }]
  }'

# Resultado esperado: HTTP 200 (processamento normal)
```

---

## 🔧 **FASE 2: Correção do Webhook Payment First**

**Estimativa:** 4-6 horas  
**Risco:** MÉDIO (webhook em produção)  
**Objetivo:** Fazer webhook processar pagamentos Payment First e ativar tenants

### **2.1 - Modificar Lógica de Detecção do Webhook**

**Arquivo:** `api/webhook-assinaturas.js`

**Modificar `api/webhook-assinaturas.js` linhas 43-45:**

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

**Nova função `handlePaymentFirstConfirmed` (com idempotência e logs):**

```javascript
async function handlePaymentFirstConfirmed(supabase, payment) {
  const startTime = Date.now();
  console.log('[WH-PaymentFirst] 🚀 Iniciando processamento:', {
    paymentId: payment.id,
    externalRef: payment.externalReference,
    value: payment.value
  });

  try {
    // ============================================================
    // ETAPA 1: IDEMPOTÊNCIA - Verificar se evento já foi processado
    // ============================================================
    const { data: existingEvent } = await supabase
      .from('subscription_webhook_events')
      .select('id, processed_at')
      .eq('asaas_event_id', payment.id)
      .eq('event_type', 'PAYMENT_CONFIRMED')
      .single();

    if (existingEvent) {
      console.log('[WH-PaymentFirst] ⚠️ Evento já processado anteriormente:', {
        eventId: existingEvent.id,
        processedAt: existingEvent.processed_at
      });
      return { 
        success: true, 
        duplicate: true, 
        message: 'Evento já processado' 
      };
    }

    // ============================================================
    // ETAPA 2: Atualizar subscription_orders
    // ============================================================
    const { data: order, error: orderError } = await supabase
      .from('subscription_orders')
      .update({ 
        status: 'active',
        confirmed_at: new Date().toISOString(),
        asaas_confirmed_value: payment.value
      })
      .eq('asaas_payment_id', payment.id)
      .select('id, user_id, affiliate_data')
      .single();

    if (orderError || !order) {
      console.error('[WH-PaymentFirst] ❌ Erro ao atualizar subscription_orders:', orderError);
      throw new Error(`Pedido não encontrado para payment_id: ${payment.id}`);
    }

    console.log('[WH-PaymentFirst] ✅ subscription_orders atualizada:', {
      orderId: order.id,
      userId: order.user_id,
      status: 'active'
    });

    // ============================================================
    // ETAPA 3: Buscar/Ativar tenant
    // ============================================================
    const { data: tenant, error: tenantError } = await supabase
      .from('multi_agent_tenants')
      .select('id, status')
      .eq('affiliate_id', order.user_id)
      .single();

    if (tenantError || !tenant) {
      console.warn('[WH-PaymentFirst] ⚠️ Tenant não encontrado para user_id:', order.user_id);
      // NÃO bloqueia - pode ser criado depois manualmente
    } else {
      // Ativar tenant
      const { error: activateError } = await supabase
        .from('multi_agent_tenants')
        .update({
          status: 'active',
          activated_at: new Date().toISOString(),
          last_payment_at: new Date().toISOString()
        })
        .eq('id', tenant.id);

      if (activateError) {
        console.error('[WH-PaymentFirst] ❌ Erro ao ativar tenant:', activateError);
      } else {
        console.log('[WH-PaymentFirst] ✅ Tenant ativado:', {
          tenantId: tenant.id,
          previousStatus: tenant.status,
          newStatus: 'active'
        });
      }
    }

    // ============================================================
    // ETAPA 4: Registrar evento processado (idempotência)
    // ============================================================
    const { error: eventError } = await supabase
      .from('subscription_webhook_events')
      .insert({
        asaas_event_id: payment.id,
        event_type: 'PAYMENT_CONFIRMED',
        payload: JSON.stringify(payment),
        processed_at: new Date().toISOString(),
        processing_time_ms: Date.now() - startTime,
        order_id: order.id,
        user_id: order.user_id
      });

    if (eventError) {
      console.error('[WH-PaymentFirst] ⚠️ Erro ao registrar evento (não fatal):', eventError);
      // NÃO bloqueia - evento foi processado com sucesso
    }

    // ============================================================
    // ETAPA 5: Sucesso final
    // ============================================================
    const processingTime = Date.now() - startTime;
    console.log('[WH-PaymentFirst] ✅ Processamento concluído:', {
      paymentId: payment.id,
      orderId: order.id,
      processingTimeMs: processingTime
    });

    return {
      success: true,
      orderId: order.id,
      tenantActivated: !!tenant,
      processingTimeMs: processingTime
    };

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('[WH-PaymentFirst] 💥 ERRO FATAL:', {
      error: error.message,
      stack: error.stack,
      paymentId: payment.id,
      processingTimeMs: processingTime
    });

    // Registrar erro para auditoria
    await supabase.from('subscription_webhook_events').insert({
      asaas_event_id: payment.id,
      event_type: 'PAYMENT_CONFIRMED',
      payload: JSON.stringify(payment),
      error_message: error.message,
      processed_at: new Date().toISOString(),
      processing_time_ms: processingTime
    }).catch(err => {
      console.error('[WH-PaymentFirst] ❌ Falha ao registrar erro:', err);
    });

    throw error; // Re-lançar para tratamento upstream
  }
}
```

### **2.2 - Adicionar Validação de Schema do Webhook**

**Adicionar no início do handler principal (antes do switch/case de eventos):**

```javascript
// Validar estrutura mínima do payload
function validateWebhookPayload(body) {
  if (!body.event) {
    throw new Error('Campo "event" ausente no payload');
  }

  const { payment, subscription } = body;
  
  if (!payment && !subscription) {
    throw new Error('Payload sem "payment" nem "subscription"');
  }

  return true;
}

// Chamar antes de processar
try {
  validateWebhookPayload(req.body);
} catch (validationError) {
  console.error('[WH-Assinaturas] ❌ Payload inválido:', validationError.message);
  return res.status(400).json({ 
    error: 'Invalid payload', 
    message: validationError.message 
  });
}
```

### **2.3 - Atualizar Tratamento de Erros do Webhook**

**Substituir o bloco `catch` principal do webhook:**

```javascript
} catch (error) {
  console.error('[WH-Assinaturas] 💥 ERRO CRÍTICO:', {
    message: error.message,
    stack: error.stack,
    event: req.body?.event,
    timestamp: new Date().toISOString()
  });

  // IMPORTANTE: Sempre retornar 200 para Asaas (evita reenvios infinitos)
  // O erro já foi logado para investigação posterior
  return res.status(200).json({ 
    received: true, 
    error: 'Internal processing error (logged)', 
    timestamp: new Date().toISOString() 
  });
}
```

---

### **2.4 - Criar Tabela de Eventos (se não existir)**

**Migration Supabase:** `supabase/migrations/YYYYMMDDHHMMSS_create_subscription_webhook_events.sql`

```sql
-- Tabela para rastreamento de eventos processados (idempotência)
CREATE TABLE IF NOT EXISTS subscription_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asaas_event_id TEXT NOT NULL UNIQUE,  -- payment.id ou subscription.id do Asaas
  event_type TEXT NOT NULL,              -- PAYMENT_CONFIRMED, SUBSCRIPTION_CREATED, etc
  payload JSONB,                         -- Payload completo do webhook
  processed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  processing_time_ms INTEGER,            -- Tempo de processamento em ms
  order_id UUID REFERENCES subscription_orders(id),
  user_id UUID,
  error_message TEXT,                    -- Se houve erro durante processamento
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_webhook_events_asaas_id ON subscription_webhook_events(asaas_event_id);
CREATE INDEX idx_webhook_events_type ON subscription_webhook_events(event_type);
CREATE INDEX idx_webhook_events_processed ON subscription_webhook_events(processed_at DESC);
CREATE INDEX idx_webhook_events_order ON subscription_webhook_events(order_id);

-- Comentários
COMMENT ON TABLE subscription_webhook_events IS 'Registro de eventos processados do webhook Asaas (idempotência e auditoria)';
COMMENT ON COLUMN subscription_webhook_events.asaas_event_id IS 'ID único do evento no Asaas (garante idempotência)';
COMMENT ON COLUMN subscription_webhook_events.processing_time_ms IS 'Tempo de processamento em milissegundos (monitoramento)';
```

---

## ✅ VALIDAÇÃO COMPLETA

### **CENÁRIO FASE 1 (Guard Clause):**

```javascript
// Teste de proteção
POST /api/checkout
Body: { "orderItems": [{ "sku": "COL-707D80" }] }

// Resultado esperado:
HTTP 400 Bad Request
{
  "success": false,
  "error": "Produtos de assinatura (Agente IA) devem ser processados via endpoint dedicado",
  "hint": "Use POST /api/subscriptions/create-payment para produtos IA"
}
```

### **CENÁRIO FASE 2 (Webhook Corrigido):**

**Fluxo completo Payment First:**

1. Frontend → `create-payment.js` → Asaas `/v3/payments` (Payment First)
2. `create-payment.js` salva em `subscription_orders` com `asaas_payment_id`
3. Asaas → Webhook `PAYMENT_CONFIRMED` → `webhook-assinaturas.js`
4. Webhook: `payment.subscription = null` MAS `externalReference = subscription_*`
5. Webhook chama `handlePaymentFirstConfirmed`
6. **ETAPA 1:** Verifica idempotência em `subscription_webhook_events`
7. **ETAPA 2:** Atualiza `subscription_orders.status = 'active'`
8. **ETAPA 3:** Ativa tenant em `multi_agent_tenants.status = 'active'`
9. **ETAPA 4:** Registra evento para idempotência
10. ✅ Cliente tem acesso ao agente

---

## 🧪 PLANO DE TESTES

### **FASE 1 - Testes:**

**Teste 1.1:** Produto IA rejeitado no checkout
```bash
curl -X POST https://slimquality.com.br/api/checkout \
  -H "Content-Type: application/json" \
  -d '{"orderItems": [{"sku": "COL-707D80", "quantity": 1}]}'
```
**Resultado esperado:** HTTP 400 com mensagem de erro clara

**Teste 1.2:** Produto físico com PIX funciona
```bash
curl -X POST https://slimquality.com.br/api/checkout \
  -H "Content-Type: application/json" \
  -d '{
    "customer": {"name": "Test", "email": "test@test.com", "cpfCnpj": "12345678901"},
    "orderItems": [{"sku": "PROD-001", "quantity": 1}],
    "orderId": "TEST-001",
    "amount": 100.00,
    "billingType": "PIX"
  }'
```
**Resultado esperado:** HTTP 200 com `pixQrCode` e `pixCopyPaste`

**Teste 1.3:** Produto físico com Boleto funciona
```bash
curl -X POST https://slimquality.com.br/api/checkout \
  -H "Content-Type: application/json" \
  -d '{
    "customer": {"name": "Test", "email": "test@test.com", "cpfCnpj": "12345678901"},
    "orderItems": [{"sku": "PROD-001", "quantity": 1}],
    "orderId": "TEST-002",
    "amount": 100.00,
    "billingType": "BOLETO"
  }'
```
**Resultado esperado:** HTTP 200 com `boletoUrl`

**Teste 1.4:** Produto físico com Cartão funciona
```bash
curl -X POST https://slimquality.com.br/api/checkout \
  -H "Content-Type: application/json" \
  -d '{
    "customer": {"name": "Test", "email": "test@test.com", "cpfCnpj": "12345678901"},
    "orderItems": [{"sku": "PROD-001", "quantity": 1}],
    "orderId": "TEST-003",
    "amount": 100.00,
    "billingType": "CREDIT_CARD",
    "creditCard": {
      "holderName": "Test User",
      "number": "4111111111111111",
      "expiryMonth": "12",
      "expiryYear": "2028",
      "ccv": "123"
    }
  }'
```
**Resultado esperado:** HTTP 200 com status `CONFIRMED` ou `PENDING`

**Teste 1.5:** Validação de que NÃO há referências a subscription no código
```bash
# Verificar que não há mais referências problemáticas
grep -n "isSubscription" api/checkout.js  # Deve retornar vazio
grep -n "COL-707D80" api/checkout.js       # Deve aparecer apenas na guard clause
grep -n "/subscriptions/" api/checkout.js   # Deve retornar vazio
```
**Resultado esperado:** Apenas guard clause menciona COL-707D80

---

### **FASE 2 - Testes:**

**Teste 2.1:** Simular webhook Payment First
```bash
# Simular payload Asaas PAYMENT_CONFIRMED
curl -X POST https://slimquality.com.br/api/webhook-assinaturas \
  -H "Content-Type: application/json" \
  -H "asaas-access-token: $ASAAS_WEBHOOK_TOKEN" \
  -d '{
    "event": "PAYMENT_CONFIRMED",
    "payment": {
      "id": "pay_test_123456",
      "externalReference": "subscription_user123_1675123456789",
      "value": 4400.00,
      "status": "CONFIRMED"
    }
  }'
```
**Resultado esperado:**
- HTTP 200
- Log: `[WH-PaymentFirst] 🚀 Iniciando processamento`
- `subscription_orders` atualizada
- `multi_agent_tenants.status = 'active'`
- Evento registrado em `subscription_webhook_events`

**Teste 2.2:** Idempotência (enviar mesmo evento 2x)
```bash
# Enviar o mesmo payload novamente
curl -X POST https://slimquality.com.br/api/webhook-assinaturas \
  -H "Content-Type: application/json" \
  -H "asaas-access-token: $ASAAS_WEBHOOK_TOKEN" \
  -d '{
    "event": "PAYMENT_CONFIRMED",
    "payment": {
      "id": "pay_test_123456",
      "externalReference": "subscription_user123_1675123456789",
      "value": 4400.00
    }
  }'
```
**Resultado esperado:**
- HTTP 200
- Log: `[WH-PaymentFirst] ⚠️ Evento já processado anteriormente`
- Nenhuma atualização no banco (evento ignorado corretamente)

**Teste 2.3:** Validação de banco de dados
```sql
-- Verificar subscription_orders
SELECT id, status, confirmed_at, asaas_payment_id 
FROM subscription_orders 
WHERE asaas_payment_id = 'pay_test_123456';
-- Esperado: status = 'active', confirmed_at preenchido

-- Verificar tenant ativado
SELECT id, status, activated_at, last_payment_at
FROM multi_agent_tenants
WHERE affiliate_id = 'user123';
-- Esperado: status = 'active', timestamps preenchidos

-- Verificar evento registrado
SELECT id, asaas_event_id, event_type, processing_time_ms
FROM subscription_webhook_events
WHERE asaas_event_id = 'pay_test_123456';
-- Esperado: 1 registro com processing_time_ms populado
```

---

## 📊 IMPACTO DAS MUDANÇAS

| Aspecto | FASE 1 | FASE 2 | TOTAL |
|---------|--------|--------|-------|
| **Arquivos modificados** | 1 (checkout.js) | 1 (webhook-assinaturas.js) | **2 arquivos** |
| **Linhas modificadas** | ~450 linhas (remoção) + 15 (guard) | ~200 linhas (adição) | **~665 linhas** |
| **Migrations necessárias** | 0 | 1 (subscription_webhook_events) | **1 migration** |
| **Risco** | ALTO (código entrelaçado) | MÉDIO | **ALTO** |
| **Tempo estimado** | 2-4 horas | 4-6 horas | **6-10 horas** |
| **Testes necessários** | 5 testes | 3 testes | **8 testes** |

---

## 🚫 O QUE NÃO PRECISA SER FEITO

- ❌ Modificar `create-payment.js` (já funciona corretamente)
- ❌ Modificar Edge Functions (não estão em uso no fluxo real)
- ❌ Modificar estrutura de tabelas `subscription_orders` ou `multi_agent_tenants` (já corretas)
- ❌ Modificar roteamento do frontend (já funciona)
- ❌ Modificar webhook `/api/webhook-asaas` (é para produtos físicos)

---

## 🎯 PRÓXIMOS PASSOS RECOMENDADOS

### **PASSO 1: Executar FASE 1** (ALTO RISCO - Remoção de Código)
1. ✅ Remover ~450 linhas de código de assinatura do `api/checkout.js`
2. ✅ Adicionar guard clause no `api/checkout.js`
3. ✅ Testar rejeição de produto IA (Teste 1.1)
4. ✅ Validar que produtos físicos continuam funcionando:
   - PIX (Teste 1.2)
   - Boleto (Teste 1.3)
   - Cartão (Teste 1.4)
5. ✅ Validar que não há mais referências a subscription (Teste 1.5)
6. ✅ Deploy e validação em produção

**Estimativa:** 2-4 horas  
**Risco:** ALTO (código entrelaçado)

---

### **PASSO 2: Preparar FASE 2**
1. ⚠️ **Solicitar ao Kiro**: Verificar schemas no Supabase
   ```sql
   -- Verificar colunas de subscription_orders
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'subscription_orders';
   
   -- Verificar colunas de multi_agent_tenants
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'multi_agent_tenants';
   ```

2. ⚠️ **Ajustar** função `handlePaymentFirstConfirmed` se schemas forem diferentes
3. ✅ **Criar** migration para `subscription_webhook_events`

---

### **PASSO 3: Executar FASE 2** (MÉDIO RISCO)
1. ✅ Aplicar migration `subscription_webhook_events`
2. ✅ Modificar `webhook-assinaturas.js` (seções 2.1, 2.2, 2.3)
3. ✅ Adicionar função `handlePaymentFirstConfirmed`
4. ✅ Testar em sandbox (payload simulado)
5. ✅ Validar idempotência
6. ✅ Deploy e monitoramento de logs

**Estimativa:** 4-6 horas (incluindo testes)

---

### **PASSO 4: Monitoramento Pós-Deploy**
1. 📊 Monitorar logs do webhook: `[WH-PaymentFirst]`
2. 📊 Verificar taxa de ativação de tenants
3. 📊 Conferir tabela `subscription_webhook_events` para eventos duplicados
4. 📊 Validar que `processing_time_ms` está < 1000ms (1 segundo)

---

## 📝 OBSERVAÇÕES IMPORTANTES

### **Por que FASE 1 é Complexa e Arriscada:**
- Remoção de ~450 linhas de código entrelaçado com produtos físicos
- Risco de quebrar produtos físicos se não for feito cuidadosamente
- 9 blocos de código espalhados pelo arquivo (linhas 260-1134)
- Função `calculateAffiliateSplit` precisa ser modificada sem quebrar
- Testes obrigatórios em 3 formas de pagamento (PIX, Boleto, Cartão)
- Estimativa realista: 2-4 horas (não 15 minutos)

### **Por que FASE 2 Demora Mais:**
- Webhook é código crítico em produção
- Idempotência precisa funcionar 100%
- Logs estruturados exigem atenção
- Testes de integração são essenciais
- Migration do banco precisa validação

### **Sobre a Tabela `subscription_webhook_events`:**
- **Essencial** para idempotência (evita processar evento 2x)
- **Auditoria** completa de todos os webhooks recebidos
- **Monitoramento** de performance (processing_time_ms)
- **Debugging** facilitado (payload completo salvo)

---

## ✅ AUTORIZAÇÃO NECESSÁRIA

**Antes de implementar qualquer fase, aguardando:**

- [ ] Autorização para executar FASE 1 (guard clause)
- [ ] Autorização para executar FASE 2 (correção webhook)
- [ ] Resposta do Kiro sobre schemas das tabelas
- [ ] Confirmação de que migration `subscription_webhook_events` pode ser criada

---

## 📚 REFERÊNCIAS

- Spec original: `.kiro/specs/subscription-payment-flow/`
- Requirement 2.1: Payment First obrigatório
- Webhook configurado: `https://slimquality.com.br/api/webhook-assinaturas`
- Eventos monitorados: `PAYMENT_CONFIRMED`, `PAYMENT_OVERDUE`, `SUBSCRIPTION_DELETED`

---

**Status:** ⏸️ **AGUARDANDO AUTORIZAÇÃO**  
**Responsável:** Antigravity  
**Data:** 05/02/2026