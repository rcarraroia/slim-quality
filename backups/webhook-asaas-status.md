# Status do Webhook Asaas - Validação

**Data:** 11/01/2026  
**Task:** 0.2 Validar webhook Asaas existente

## ✅ WEBHOOK JÁ EXISTE E ESTÁ IMPLEMENTADO

### Localização
- **Arquivo:** `src/api/routes/webhooks/asaas-webhook.ts`
- **Rota:** `POST /api/webhooks/asaas`
- **Registrado em:** `src/server.ts` (linha 85)

### URL Configurada
```
https://api.slimquality.com.br/api/webhooks/asaas
```

### Eventos Suportados
```typescript
const SUPPORTED_EVENTS = {
  PAYMENT_RECEIVED: 'PAYMENT_RECEIVED',
  PAYMENT_CONFIRMED: 'PAYMENT_CONFIRMED',
  PAYMENT_OVERDUE: 'PAYMENT_OVERDUE',
  PAYMENT_REFUNDED: 'PAYMENT_REFUNDED',
  PAYMENT_SPLIT_ERROR: 'PAYMENT_SPLIT_ERROR'
} as const;
```

### Funcionalidades Implementadas

#### ✅ Validação de Assinatura
```typescript
function verifyAsaasSignature(payload: string, signature: string): boolean
```
- Usa `ASAAS_WEBHOOK_TOKEN` ou `ASAAS_WEBHOOK_SECRET`
- Valida header `X-Asaas-Signature`
- Em desenvolvimento: permite sem assinatura

#### ✅ Retry Exponencial
```typescript
async function processWithRetry(webhookData, maxRetries: 3)
```
- 3 tentativas com backoff exponencial
- Delays: [1s, 2s, 4s]
- Loga cada tentativa

#### ✅ Logs Completos
```typescript
async function logWebhookEvent(webhookData, result, processingTime)
```
- Registra em `asaas_webhook_logs`
- Inclui: payload, resultado, tempo de processamento
- Loga success + fail

#### ✅ Handlers por Evento

**PAYMENT_RECEIVED:**
- Atualiza status do pedido para 'paid'
- Atualiza registro de pagamento

**PAYMENT_CONFIRMED:**
- Busca pedido por `asaas_payment_id`
- Busca afiliado por `referral_code`
- **CALCULA COMISSÕES** (já implementado!)
- Registra em tabela `commissions`

**PAYMENT_SPLIT_ERROR:**
- Marca comissões como 'error'
- Notifica administradores

**PAYMENT_OVERDUE:**
- Atualiza status para 'overdue'

**PAYMENT_REFUNDED:**
- Cancela comissões
- Atualiza status para 'refunded'

### ⚠️ PROBLEMAS IDENTIFICADOS

#### 1. Cálculo de Comissões Simplificado
```typescript
// Linha 454: Calcula apenas comissão do afiliado direto
const totalCommission = orderTotal * 0.15; // 15% fixo
```
**Problema:** Não busca rede genealógica (N2, N3)  
**Não aplica redistribuição para gestores**

#### 2. Não Usa `referred_by`
```typescript
// Linha 427: Busca afiliado por referral_code
const affiliate = await supabase
  .from('affiliates')
  .select('id')
  .eq('referral_code', order.referral_code)
  .single();
```
**Problema:** Não busca ascendentes usando `referred_by`

#### 3. Não Envia Split para Asaas
**Problema:** Calcula comissões mas NÃO envia split para API Asaas  
**Resultado:** Comissões registradas mas não pagas

### 📋 AÇÕES NECESSÁRIAS (Task 4.4)

1. ✅ URL já definida: `https://api.slimquality.com.br/api/webhooks/asaas`
2. ✅ Validação de assinatura já implementada
3. ✅ Retry exponencial já implementado
4. ✅ Logs já implementados
5. ❌ **FALTA:** Chamar `calculateCommissions()` com rede completa
6. ❌ **FALTA:** Enviar split para API Asaas

### Variáveis de Ambiente Necessárias

```env
# Webhook
ASAAS_WEBHOOK_TOKEN=seu_token_aqui
# ou
ASAAS_WEBHOOK_SECRET=seu_secret_aqui

# API Asaas
ASAAS_API_KEY=sua_chave_aqui
ASAAS_WALLET_RENUM=wal_xxxxx
ASAAS_WALLET_JB=wal_xxxxx
```

### Testes Existentes

- `tests/unit/webhook-handler.test.ts` - Testes unitários
- `tests/integration/affiliate-commission-flow.test.ts` - Testes de integração

## Conclusão

✅ Webhook existe e está funcional  
✅ Estrutura básica está correta  
⚠️ Precisa ser atualizado para:
  - Usar `calculateCommissions()` com rede completa
  - Enviar split para API Asaas
  - Usar `referred_by` para buscar ascendentes

**Próximo:** Task 1.1 - Criar constantes de configuração
