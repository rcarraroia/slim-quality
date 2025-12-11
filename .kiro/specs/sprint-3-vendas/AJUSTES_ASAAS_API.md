# Ajustes Necessários - Integração Asaas API

## 📋 Análise da Documentação Oficial

Baseado na documentação oficial do Asaas, aqui estão os ajustes necessários na spec do Sprint 3.

---

## ✅ Pontos Confirmados Corretos

1. **Base URL:**
   - Produção: `https://api.asaas.com/v3/`
   - Sandbox: `https://api-sandbox.asaas.com/v3/`

2. **Autenticação:**
   - Header: `access_token: $ASAAS_API_KEY`

3. **Endpoints principais:**
   - `POST /v3/customers` - Criar cliente
   - `POST /v3/payments` - Criar cobrança
   - `GET /v3/payments/{id}/pixQrCode` - Obter QR Code PIX
   - `GET /v3/payments/{id}/status` - Consultar status

---

## ⚠️ Ajustes Necessários

### 1. Campos de Customer (Cliente)

**Documentação oficial usa:**
```json
{
  "name": "string",
  "cpfCnpj": "string",  // ❗ Não é "customer_cpf"
  "email": "string",
  "phone": "string",
  "mobilePhone": "string",  // ❗ Campo adicional
  "address": "string",
  "addressNumber": "string",
  "complement": "string",
  "province": "string",
  "postalCode": "string",  // ❗ Não é "postal_code"
  "externalReference": "string",
  "notificationDisabled": boolean,
  "additionalEmails": "string",
  "municipalInscription": "string",
  "stateInscription": "string",
  "observations": "string",
  "groupName": "string",
  "company": "string",
  "foreignCustomer": boolean
}
```

**Ajustar em:**
- `AsaasService.getOrCreateCustomer()`
- Validações Zod
- Interfaces TypeScript

---

### 2. Campos de Payment (Cobrança)

**Campos obrigatórios:**
```json
{
  "customer": "string",  // ID do customer
  "billingType": "UNDEFINED" | "BOLETO" | "CREDIT_CARD" | "PIX",
  "value": number,
  "dueDate": "YYYY-MM-DD"
}
```

**Campos importantes:**
```json
{
  "description": "string",
  "externalReference": "string",
  "installmentCount": number,  // Para parcelamento
  "installmentValue": number,  // Ou totalValue
  "totalValue": number,
  "discount": { ... },
  "interest": { ... },
  "fine": { ... },
  "split": [  // ❗ SPLIT É CONFIGURADO NA CRIAÇÃO
    {
      "walletId": "string",
      "fixedValue": number,  // OU
      "percentualValue": number
    }
  ]
}
```

**Para Cartão de Crédito adicionar:**
```json
{
  "creditCard": {
    "holderName": "string",
    "number": "string",
    "expiryMonth": "string",
    "expiryYear": "string",
    "ccv": "string"
  },
  "creditCardHolderInfo": {
    "name": "string",
    "email": "string",
    "cpfCnpj": "string",
    "postalCode": "string",
    "addressNumber": "string",
    "addressComplement": "string",
    "phone": "string",
    "mobilePhone": "string"
  },
  "remoteIp": "string"  // ❗ OBRIGATÓRIO para cartão
}
```

**Ou usar tokenização:**
```json
{
  "creditCardToken": "string",  // Substitui creditCard + creditCardHolderInfo
  "remoteIp": "string"
}
```

---

### 3. Status de Pagamento

**Status corretos:**
- `PENDING` - Aguardando pagamento
- `CONFIRMED` - Pagamento confirmado (pode ter bloqueio cautelar em PF por até 72h)
- `RECEIVED` - Valor recebido na conta
- `OVERDUE` - Vencido
- `REFUNDED` - Estornado
- `AUTHORIZED` - Pré-autorizado (cartão)

**Ajustar em:**
- Enum `PaymentStatus`
- `WebhookService` event handlers
- Tabela `payments.status`

---

### 4. Split de Pagamentos

**✅ INFORMAÇÕES COMPLETAS SOBRE SPLIT**

**❗ IMPORTANTE: Split é configurado NA CRIAÇÃO da cobrança!**

**Como funciona:**
1. Split é configurado no array `splits` ao criar cobrança
2. Split é calculado sobre o **valor líquido** (após taxas Asaas)
3. Split é executado **automaticamente** quando pagamento é confirmado
4. Não precisa de ação adicional após configurar

**Formato do Split:**
```typescript
POST /v3/payments
{
  "customer": "cus_123",
  "billingType": "PIX",
  "value": 3290.00,
  "dueDate": "2025-01-30",
  "splits": [  // ❗ Note: é "splits" (plural)
    {
      "walletId": "48548710-9baa-4ec1-a11f-9010193527c6",
      "percentualValue": 70  // 70% do valor líquido
    },
    {
      "walletId": "0b763922-aa88-4cbe-a567-e3fe8511fa06",
      "fixedValue": 100.00  // Ou valor fixo
    }
  ]
}
```

**Opções de Valor:**
- `percentualValue`: Percentual do valor líquido (até 4 casas decimais: 92.3444)
- `fixedValue`: Valor fixo em reais (até 2 casas decimais: 9.32)
- `totalFixedValue`: Para parcelamentos - divide automaticamente entre parcelas
- **Pode misturar** percentualValue e fixedValue no mesmo split

**Regras Importantes:**
1. **Não incluir a própria wallet** - O saldo restante fica automaticamente com o emissor
2. **Soma máxima:**
   - Valores percentuais: até 100%
   - Valores fixos: até o valor líquido da cobrança
3. **Sem limite de wallets** - Pode ter quantos splits quiser
4. **Base de cálculo:** Sempre sobre valor líquido (valor - taxas Asaas)

**Exemplo Prático (Slim Quality):**
```typescript
// Venda de R$ 3.290,00
// Taxa Asaas PIX: ~R$ 3,90
// Valor líquido: R$ 3.286,10

{
  "value": 3290.00,
  "billingType": "PIX",
  "splits": [
    // Não incluir fábrica - ela fica com o restante automaticamente
    {
      "walletId": "wal_afiliado_n1",
      "percentualValue": 15  // R$ 492,92 (15% de 3.286,10)
    },
    {
      "walletId": "wal_afiliado_n2",
      "percentualValue": 3   // R$ 98,58 (3% de 3.286,10)
    },
    {
      "walletId": "wal_afiliado_n3",
      "percentualValue": 2   // R$ 65,72 (2% de 3.286,10)
    },
    {
      "walletId": "wal_renum",
      "percentualValue": 5   // R$ 164,31 (5% de 3.286,10)
    },
    {
      "walletId": "wal_jb",
      "percentualValue": 5   // R$ 164,31 (5% de 3.286,10)
    }
  ]
  // Total split: 30% (R$ 985,84)
  // Fábrica recebe: 70% (R$ 2.300,26) automaticamente
}
```

**Status de Split:**
- `PENDING` - Aguardando processamento
- `AWAITING_CREDIT` - Aguardando crédito
- `DONE` - Concluído
- `CANCELLED` - Cancelado
- `REFUSED` - Recusado
- `REFUNDED` - Estornado

**Bloqueio por Divergência:**
- Se split > valor líquido: bloqueio automático
- Prazo de 2 dias úteis para ajustar
- Webhook: `PAYMENT_SPLIT_DIVERGENCE_BLOCK`
- Se não ajustar: split cancelado automaticamente
- Webhook: `PAYMENT_SPLIT_DIVERGENCE_BLOCK_FINISHED`

**Atualizar Split:**
```typescript
PUT /v3/payments/{id}
{
  "splits": [
    // Novo array de splits
  ]
}
```
⚠️ **Atenção:** Se enviar `splits: null` ou `splits: []`, o split é DESATIVADO!

**Consultar Splits:**
- `GET /v3/payments/{id}` - Retorna splits no objeto payment
- `GET /v3/payments/splits/paid` - Lista splits pagos
- `GET /v3/payments/splits/received` - Lista splits recebidos

**Mudanças necessárias na spec:**
1. ✅ Split é configurado NA CRIAÇÃO (não depois)
2. ✅ Remover `SplitService.prepareSplit()` do webhook
3. ✅ Adicionar array `splits` em `createPixPayment()` e `createCreditCardPayment()`
4. ✅ Tabela `asaas_splits` vira apenas log/auditoria (opcional)
5. ✅ Calcular splits ANTES de criar cobrança
6. ✅ Não incluir wallet da fábrica no array (ela recebe o restante automaticamente)

---

### 5. PIX QR Code

**Endpoint:**
```
GET /v3/payments/{id}/pixQrCode
```

**Response:**
```json
{
  "encodedImage": "string",  // Base64 do QR Code
  "payload": "string",  // Copia e cola
  "expirationDate": "2025-01-30T23:59:59"
}
```

**Características:**
- QR Code dinâmico com vencimento
- Expira 12 meses após data de vencimento
- Pode ser pago apenas uma vez
- Se não tiver chave PIX cadastrada, usa chave de parceiro (válido até 23:59 do mesmo dia)

---

### 6. Cartão de Crédito

**Parcelamento:**
- Até **21x** para Visa e Mastercard
- Até **12x** para outras bandeiras

**Cartões de teste (Sandbox):**
- **Aprovado:** `5162306219378829` (Mastercard) ou `4916561358240741` (Visa)
- **Rejeitado:** `5184019740373151` (Mastercard)

**Campo obrigatório:**
- `remoteIp`: IP do cliente (não do servidor!)

**Tokenização:**
- Primeira transação retorna `creditCardToken`
- Transações seguintes podem usar apenas o token

---

### 7. Webhooks

**✅ VALIDAÇÃO DE WEBHOOK - INFORMAÇÕES COMPLETAS**

**Autenticação via Token:**
- Ao configurar webhook, você define um `authToken` (recomendado: UUID v4)
- O Asaas envia este token no header: `asaas-access-token`
- Você deve validar se o header recebido corresponde ao token configurado

**Exemplo de validação:**
```typescript
function validateWebhook(req: Request): boolean {
  const receivedToken = req.headers['asaas-access-token'];
  const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN;
  
  return receivedToken === expectedToken;
}
```

**IPs Oficiais do Asaas (para firewall):**
- `52.67.12.206`
- `18.230.8.159`
- `54.94.136.112`
- `54.94.183.101`

**Eventos de Pagamento disponíveis:**
- `PAYMENT_CREATED` - Cobrança criada
- `PAYMENT_UPDATED` - Cobrança atualizada
- `PAYMENT_CONFIRMED` - Pagamento confirmado
- `PAYMENT_RECEIVED` - Valor recebido na conta
- `PAYMENT_OVERDUE` - Pagamento vencido
- `PAYMENT_REFUNDED` - Pagamento estornado
- `PAYMENT_DELETED` - Cobrança deletada
- `PAYMENT_RESTORED` - Cobrança restaurada
- `PAYMENT_ANTICIPATED` - Pagamento antecipado
- `PAYMENT_AWAITING_RISK_ANALYSIS` - Aguardando análise de risco
- `PAYMENT_APPROVED_BY_RISK_ANALYSIS` - Aprovado pela análise
- `PAYMENT_REPROVED_BY_RISK_ANALYSIS` - Reprovado pela análise
- `PAYMENT_AUTHORIZED` - Pré-autorizado (cartão)
- `PAYMENT_AWAITING_CHARGEBACK_REVERSAL` - Aguardando reversão de chargeback
- `PAYMENT_CHARGEBACK_REQUESTED` - Chargeback solicitado
- `PAYMENT_CHARGEBACK_DISPUTE` - Disputa de chargeback
- `PAYMENT_RECEIVED_IN_CASH_UNDONE` - Recebimento em dinheiro desfeito
- `PAYMENT_REFUND_IN_PROGRESS` - Estorno em progresso
- `PAYMENT_CREDIT_CARD_CAPTURE_REFUSED` - Captura de cartão recusada
- `PAYMENT_CHECKOUT_VIEWED` - Checkout visualizado
- `PAYMENT_BANK_SLIP_VIEWED` - Boleto visualizado
- `PAYMENT_DUNNING_REQUESTED` - Negativação solicitada
- `PAYMENT_DUNNING_RECEIVED` - Negativação recebida

**Estrutura do Evento:**
```json
{
  "id": "evt_05b708f961d739ea7eba7e4db318f621&368604920",
  "event": "PAYMENT_RECEIVED",
  "dateCreated": "2024-06-12 16:45:03",
  "payment": {
    "object": "payment",
    "id": "pay_080225913252",
    ...
  }
}
```

**Boas Práticas:**
1. **Retornar 200 rapidamente** - Processar de forma assíncrona
2. **Implementar idempotência** - Usar `event.id` como chave única
3. **Validar authToken** - Sempre verificar header `asaas-access-token`
4. **Filtrar por IPs** - Aceitar apenas IPs oficiais do Asaas
5. **Gerenciar duplicatas** - Eventos podem ser enviados mais de uma vez

**Sistema de Penalização:**
- Após 15 falhas consecutivas, a fila é pausada
- Eventos ficam guardados por 14 dias
- Após 14 dias, eventos não processados são excluídos permanentemente

**Tipos de Envio:**
- **Sequencial:** Eventos enviados na ordem (recomendado para pagamentos)
- **Não Sequencial:** Eventos enviados sem ordem (mais rápido)

---

### 8. Sandbox

**URL:** `https://api-sandbox.asaas.com/v3/`

**Características:**
- Transações aprovadas automaticamente
- Webhooks funcionam normalmente
- Emails e SMS são enviados (usar emails/telefones reais para teste)
- Não usar dados aleatórios como (51) 9999-9999

---

## 🔧 Arquivos que Precisam de Ajustes

### Backend

1. **src/types/asaas.types.ts**
   - Ajustar interfaces de Customer (cpfCnpj, mobilePhone, postalCode)
   - Ajustar enum PaymentStatus
   - Adicionar interface Split

2. **src/services/asaas/asaas.service.ts**
   - Ajustar `getOrCreateCustomer()` com campos corretos
   - Adicionar `remoteIp` em pagamentos com cartão
   - Adicionar array `split` na criação de cobranças
   - Remover lógica de "preparar split depois"

3. **src/services/webhooks/webhook.service.ts**
   - Ajustar status para CONFIRMED, RECEIVED, etc
   - Remover chamada para `prepareSplit()`
   - Adicionar validação de assinatura (quando descobrir como)

4. **src/api/validators/order.validator.ts**
   - Ajustar validação de endereço (postalCode)
   - Adicionar validação de remoteIp para cartão

5. **supabase/migrations/**
   - Ajustar enum de status em `payments.status`
   - Simplificar tabela `asaas_splits` (apenas auditoria)

### Frontend

6. **src/services/order-frontend.service.ts**
   - Capturar IP do cliente para enviar em `remoteIp`
   - Ajustar campos de endereço

---

## 📝 Notas Importantes

### Split Automático
O split configurado na criação da cobrança é **executado automaticamente** pelo Asaas quando o pagamento é confirmado. Não precisa de ação adicional.

### Wallet ID
Não encontrei endpoint para validar Wallet ID. Opções:
1. Validar apenas formato (regex: `^wal_[a-zA-Z0-9]{20}$`)
2. Tentar criar cobrança de teste e ver se retorna erro
3. Consultar suporte Asaas sobre endpoint de validação

### Webhook Security & Idempotência

**CRÍTICO - Validação de Token:**
```typescript
// Middleware de validação
function validateWebhookToken(req: Request, res: Response, next: NextFunction) {
  const receivedToken = req.headers['asaas-access-token'];
  const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN;
  
  if (receivedToken !== expectedToken) {
    return res.status(401).json({ error: 'Invalid webhook token' });
  }
  
  next();
}
```

**CRÍTICO - Idempotência:**
Webhooks podem ser enviados mais de uma vez. DEVE implementar idempotência:

```typescript
// Tabela para controlar eventos processados
CREATE TABLE asaas_webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asaas_event_id TEXT UNIQUE NOT NULL,  -- ID do evento Asaas
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

// Handler com idempotência
async function handleWebhook(eventId: string, eventType: string, payload: any) {
  // Tentar inserir evento
  try {
    await supabase
      .from('asaas_webhook_logs')
      .insert({
        asaas_event_id: eventId,
        event_type: eventType,
        payload: payload,
        processed: false
      });
  } catch (error) {
    // Se já existe (unique violation), ignorar
    if (error.code === '23505') {
      return { success: true, message: 'Event already processed' };
    }
    throw error;
  }
  
  // Processar evento
  await processEvent(eventType, payload);
  
  // Marcar como processado
  await supabase
    .from('asaas_webhook_logs')
    .update({ processed: true, processed_at: new Date() })
    .eq('asaas_event_id', eventId);
}
```

---

## ✅ Próximos Passos

1. **Atualizar design.md** com ajustes de campos e split
2. **Atualizar tasks.md** removendo "preparar split depois"
3. **Implementar com ajustes** seguindo a ordem das tasks
4. **Testar em Sandbox** antes de qualquer produção
5. **Consultar Asaas** sobre validação de webhook antes de produção

---

**Documento criado em:** 2025-01-24
**Baseado em:** Documentação oficial Asaas (docs.asaas.com)
