# Design Document

## Overview

O Subscription Payment Flow implementa uma arquitetura robusta baseada no padrão "Payment First" para processar assinaturas, onde a primeira mensalidade é processada como pagamento avulso antes de criar a assinatura recorrente. Esta solução resolve problemas críticos identificados no sistema atual e implementa as melhores práticas baseadas no sistema Comademig.

**Princípio Fundamental:** Total isolamento do sistema de pagamento de produtos físicos existente, garantindo que nenhuma funcionalidade atual seja afetada.

### Arquitetura Geral

```mermaid
graph TB
    subgraph "Frontend (Preservado)"
        UI[Interface Usuário]
        PF[Produtos Físicos - Existente]
        AS[Assinaturas - Novo]
    end
    
    subgraph "Backend - Isolamento Total"
        subgraph "Sistema Existente (Intocável)"
            PE[Payment Existing API]
            OE[Orders Existing]
        end
        
        subgraph "Sistema Novo (Isolado)"
            PO[Payment Orchestrator]
            EF1[Edge Function: Create Payment]
            EF2[Edge Function: Polling Service]
            EF3[Edge Function: Webhook Handler]
            EF4[Edge Function: Subscription Creator]
            EF5[Edge Function: User Activator]
        end
    end
    
    subgraph "Asaas API"
        AP[/v3/payments]
        AS_API[/v3/subscriptions]
        WH[Webhooks]
    end
    
    UI --> PF
    UI --> AS
    PF --> PE
    AS --> PO
    PO --> EF1
    EF1 --> EF2
    EF2 --> EF4
    EF4 --> EF5
    WH --> EF3
    
    EF1 --> AP
    EF4 --> AS_API
```

## Architecture

### Componentes Principais

#### 1. Payment Orchestrator Service (PaymentFirstFlowService)
**Localização:** `src/services/subscriptions/payment-orchestrator.service.ts`
**Responsabilidade:** Coordenar todo o fluxo de pagamento de assinaturas
**Isolamento:** Namespace `subscriptions/` separado do sistema existente
**Baseado em:** Arquitetura comprovada do sistema Comademig

```typescript
interface PaymentFirstFlowService {
  // Método principal - único ponto de entrada (baseado em Comademig)
  processRegistration(data: SubscriptionRegistrationData): Promise<RegistrationResult>
  
  // Coordenação de Edge Functions (padrão Comademig)
  createAsaasCustomer(customerData: CustomerData): Promise<CustomerCreationResult>
  createInitialPayment(paymentData: PaymentData): Promise<PaymentCreationResult>
  pollPaymentStatus(paymentId: string, timeout: number): Promise<PollingResult>
  createSupabaseAccount(userData: UserData): Promise<AccountCreationResult>
  createProfileAndSubscription(profileData: ProfileData): Promise<ProfileResult>
  createRecurringSubscription(subscriptionData: SubscriptionData): Promise<SubscriptionResult>
  
  // Controle de estado (melhorado com base em Comademig)
  getFlowState(flowId: string): Promise<FlowState>
  updateFlowState(flowId: string, state: FlowState): Promise<void>
  
  // Rollback e recovery (robusto como Comademig)
  rollbackFlow(flowId: string, targetState: FlowState): Promise<RollbackResult>
  
  // Validações críticas (aprendidas do Comademig)
  validateOrderItems(items: OrderItem[]): ValidationResult
  validateWalletIds(walletIds: string[]): Promise<ValidationResult>
  calculateNextBillingDate(cycle: BillingCycle): Date
}

// Estados do fluxo obrigatórios (baseado na sequência Comademig)
enum FlowState {
  INITIATED = 'initiated',
  CUSTOMER_CREATED = 'customer_created',
  PAYMENT_CREATED = 'payment_created',
  PAYMENT_PROCESSING = 'payment_processing',
  PAYMENT_CONFIRMED = 'payment_confirmed',
  ACCOUNT_CREATED = 'account_created',
  PROFILE_CREATED = 'profile_created',
  SUBSCRIPTION_CREATED = 'subscription_created',
  USER_ACTIVATED = 'user_activated',
  COMPLETED = 'completed',
  FAILED = 'failed',
  ROLLED_BACK = 'rolled_back'
}

// Interface de dados de registro (padrão Comademig)
interface SubscriptionRegistrationData {
  // Dados do usuário
  userData: {
    name: string
    email: string
    phone: string
    cpf: string
  }
  
  // Dados do plano
  planData: {
    id: string
    name: string
    value: number
    cycle: 'MONTHLY' | 'YEARLY'
  }
  
  // Dados de pagamento
  paymentData: {
    billingType: 'CREDIT_CARD' | 'PIX'
    creditCard?: CreditCardData
    creditCardHolderInfo?: CardHolderInfo
  }
  
  // Order Items (CRÍTICO - não pode estar vazio)
  orderItems: OrderItem[]
  
  // Dados de afiliação (se houver)
  affiliateData?: {
    referralCode: string
    affiliateId: string
  }
}
```

### Sequência de Execução Obrigatória (Baseada no Comademig)

```mermaid
sequenceDiagram
    participant Client as Cliente
    participant PFS as PaymentFirstFlowService
    participant EF1 as Edge Function: Create Customer
    participant EF2 as Edge Function: Create Payment
    participant EF3 as Edge Function: Poll Status
    participant EF4 as Edge Function: Create Account
    participant EF5 as Edge Function: Create Subscription
    participant Asaas as Asaas API
    participant Supabase as Supabase Auth
    
    Client->>PFS: processRegistration(data)
    PFS->>PFS: setState(INITIATED)
    
    Note over PFS: 1. Criar cliente no Asaas
    PFS->>EF1: createAsaasCustomer(customerData)
    EF1->>Asaas: POST /v3/customers
    Asaas-->>EF1: customer created
    EF1-->>PFS: CustomerCreationResult
    PFS->>PFS: setState(CUSTOMER_CREATED)
    
    Note over PFS: 2. Criar pagamento inicial (primeira mensalidade)
    PFS->>EF2: createInitialPayment(paymentData)
    EF2->>Asaas: POST /v3/payments (NÃO /v3/subscriptions)
    Asaas-->>EF2: payment created
    EF2-->>PFS: PaymentCreationResult
    PFS->>PFS: setState(PAYMENT_CREATED)
    
    Note over PFS: 3. Polling para aguardar confirmação (15s timeout)
    PFS->>EF3: pollPaymentStatus(paymentId, 15000)
    loop Polling (max 15s, interval 1s)
        EF3->>Asaas: GET /v3/payments/{id}
        Asaas-->>EF3: payment status
        alt Payment Confirmed
            EF3-->>PFS: PAYMENT_CONFIRMED
            PFS->>PFS: setState(PAYMENT_CONFIRMED)
        else Timeout
            EF3-->>PFS: TIMEOUT
            PFS->>PFS: setState(FAILED)
        end
    end
    
    alt Payment Confirmed
        Note over PFS: 4. Criar conta no Supabase
        PFS->>EF4: createSupabaseAccount(userData)
        EF4->>Supabase: Create User
        Supabase-->>EF4: user created
        EF4-->>PFS: AccountCreationResult
        PFS->>PFS: setState(ACCOUNT_CREATED)
        
        Note over PFS: 5. Criar perfil e dados iniciais
        PFS->>EF4: createProfileAndSubscription(profileData)
        EF4->>EF4: create profile & subscription record
        EF4-->>PFS: ProfileResult
        PFS->>PFS: setState(PROFILE_CREATED)
        
        Note over PFS: 6. Criar assinatura recorrente (SÓ DEPOIS)
        PFS->>EF5: createRecurringSubscription(subscriptionData)
        EF5->>Asaas: POST /v3/subscriptions (com creditCardToken)
        Asaas-->>EF5: subscription created
        EF5-->>PFS: SubscriptionResult
        PFS->>PFS: setState(SUBSCRIPTION_CREATED)
        
        PFS->>PFS: setState(USER_ACTIVATED)
        PFS->>PFS: setState(COMPLETED)
    end
    
    PFS-->>Client: RegistrationResult
```

#### 2. Edge Functions (Supabase) - Arquitetura Comademig
**Localização:** `supabase/functions/subscriptions/`
**Isolamento:** Pasta dedicada `subscriptions/` para evitar conflitos
**Padrão:** Uma função por responsabilidade (como no Comademig)

- `asaas-create-customer/` - Cria cliente no Asaas
- `asaas-create-payment/` - Cria pagamento inicial (primeira mensalidade)
- `asaas-poll-payment/` - Verifica status do pagamento com polling
- `asaas-create-subscription/` - Cria assinatura recorrente (após confirmação)
- `asaas-webhook/` - Processa webhooks com idempotência
- `supabase-create-account/` - Cria conta de usuário no Supabase
- `supabase-create-profile/` - Cria perfil e dados iniciais

#### 3. Polling Service (Melhorado com base no Comademig)
**Localização:** `src/services/subscriptions/polling.service.ts`
**Responsabilidade:** Aguardar confirmação de pagamento com timeout robusto
**Melhorias:** Baseado na implementação comprovada do Comademig

```typescript
interface PollingService {
  // Método principal (baseado no Comademig)
  pollPaymentStatus(config: PollingConfig): Promise<PollingResult>
  
  // Controle de polling
  startPolling(paymentId: string): Promise<void>
  stopPolling(paymentId: string): void
  
  // Logging e auditoria (crítico para debug)
  logPollingAttempt(paymentId: string, attempt: number, status: string): Promise<void>
  
  // Validação de timeout (15s máximo)
  validateTimeout(timeoutMs: number): boolean
}

interface PollingConfig {
  paymentId: string
  timeout: number // 15000ms (15 segundos)
  interval: number // 1000ms (1 segundo)
  maxAttempts: number // 15 tentativas
  onProgress?: (attempt: number, status: string) => void
  onTimeout?: () => void
  onSuccess?: (result: PaymentStatus) => void
}

interface PollingResult {
  success: boolean
  status: 'CONFIRMED' | 'PENDING' | 'FAILED' | 'TIMEOUT'
  attempts: number
  duration: number
  paymentData?: AsaasPaymentResponse
  error?: string
}
```

#### 4. Webhook Handler Service (Robusto como Comademig)
**Localização:** `src/services/subscriptions/webhook-handler.service.ts`
**Responsabilidade:** Processar webhooks de forma idempotente e robusta
**Melhorias:** Implementação baseada no sistema Comademig comprovado

```typescript
interface WebhookHandlerService {
  // Processamento principal com idempotência (padrão Comademig)
  processWebhook(payload: AsaasWebhookPayload): Promise<WebhookResult>
  
  // Validação de assinatura (segurança crítica)
  validateWebhookSignature(payload: string, signature: string): boolean
  
  // Idempotência (evita processamento duplo)
  isEventProcessed(eventId: string): Promise<boolean>
  markEventAsProcessed(eventId: string, payload: any): Promise<void>
  
  // Retry automático (robusto como Comademig)
  retryFailedWebhook(eventId: string, maxRetries: number): Promise<RetryResult>
  
  // Processamento de splits (para afiliados)
  processSplitConfirmation(splitData: SplitData): Promise<SplitResult>
  
  // Ativação de usuários (confirmação de indicações)
  confirmAffiliateReferral(referralData: ReferralData): Promise<ReferralResult>
}

interface WebhookResult {
  success: boolean
  eventId: string
  eventType: string
  processed: boolean
  actions: WebhookAction[]
  error?: string
}

interface WebhookAction {
  type: 'PAYMENT_CONFIRMED' | 'SUBSCRIPTION_CREATED' | 'SPLIT_PROCESSED' | 'USER_ACTIVATED'
  entityId: string
  result: 'SUCCESS' | 'FAILED' | 'SKIPPED'
  details?: any
}
```

#### 5. Adapter Pattern para Conversão de Dados (Padrão Comademig)
**Localização:** `src/services/subscriptions/adapters/`
**Responsabilidade:** Converter dados entre formatos internos e Asaas API
**Baseado em:** Implementação robusta do sistema Comademig

```typescript
interface AsaasPaymentAdapter {
  // Conversão para Asaas (validação rigorosa)
  toAsaasCustomerPayload(internal: InternalCustomerData): AsaasCustomerPayload
  toAsaasPaymentPayload(internal: InternalPaymentData): AsaasPaymentPayload
  toAsaasSubscriptionPayload(internal: InternalSubscriptionData): AsaasSubscriptionPayload
  
  // Conversão do Asaas (parsing seguro)
  fromAsaasCustomerResponse(asaas: AsaasCustomerResponse): InternalCustomerResult
  fromAsaasPaymentResponse(asaas: AsaasPaymentResponse): InternalPaymentResult
  fromAsaasSubscriptionResponse(asaas: AsaasSubscriptionResponse): InternalSubscriptionResult
  
  // Validação crítica (aprendida do Comademig)
  validateCustomerPayload(payload: AsaasCustomerPayload): ValidationResult
  validatePaymentPayload(payload: AsaasPaymentPayload): ValidationResult
  validateSubscriptionPayload(payload: AsaasSubscriptionPayload): ValidationResult
  
  // Cálculo de datas (lógica do Comademig)
  calculateNextBillingDate(cycle: BillingCycle, startDate?: Date): Date
  calculateDueDate(immediate: boolean): string
}

interface DataValidationAdapter {
  // Validação de Order Items (CRÍTICO para detecção IA)
  validateOrderItems(items: OrderItem[]): ValidationResult
  
  // Validação de dados do cliente (CPF, email, telefone)
  validateCustomerData(data: CustomerData): ValidationResult
  
  // Validação de método de pagamento (cartão, PIX)
  validatePaymentMethod(method: PaymentMethod): ValidationResult
  
  // Validação de Wallet IDs (para afiliados)
  validateWalletIds(walletIds: string[]): Promise<ValidationResult>
}

// Tipos específicos baseados no Comademig
interface AsaasCustomerPayload {
  name: string
  email: string
  phone: string
  mobilePhone: string
  cpfCnpj: string
  postalCode?: string
  address?: string
  addressNumber?: string
  complement?: string
  province?: string
  city?: string
  state?: string
}

interface AsaasPaymentPayload {
  customer: string // ID do cliente criado anteriormente
  billingType: 'CREDIT_CARD' | 'PIX'
  value: number
  dueDate: string // Data de hoje para processamento imediato
  description: string
  orderItems: AsaasOrderItem[] // CRÍTICO: não pode estar vazio
  creditCard?: {
    holderName: string
    number: string
    expiryMonth: string
    expiryYear: string
    ccv: string
  }
  creditCardHolderInfo?: {
    name: string
    email: string
    cpfCnpj: string
    postalCode: string
    addressNumber: string
    addressComplement?: string
    phone: string
    mobilePhone: string
  }
}

interface AsaasSubscriptionPayload {
  customer: string // ID do cliente
  billingType: 'CREDIT_CARD'
  value: number
  nextDueDate: string // Próxima cobrança (mês seguinte)
  cycle: 'MONTHLY' | 'YEARLY'
  description: string
  creditCardToken?: string // Token do cartão da primeira mensalidade
  // NÃO incluir creditCard nem creditCardHolderInfo aqui
}
```
**Localização:** `src/services/subscriptions/webhook-handler.service.ts`
**Responsabilidade:** Processar webhooks de forma idempotente

```typescript
interface WebhookHandlerService {
  processWebhook(payload: AsaasWebhookPayload): Promise<WebhookResult>
  validateWebhookSignature(payload: string, signature: string): boolean
  isEventProcessed(eventId: string): Promise<boolean>
}
```

## Critical Improvements Based on Comademig Analysis

### Principais Descobertas da Análise Comparativa

A análise detalhada do sistema Comademig revelou diferenças arquiteturais críticas que explicam por que nosso sistema atual falha. Esta seção documenta as correções obrigatórias baseadas na implementação comprovada do Comademig.

#### 1. Arquitetura Fundamental Corrigida

**PROBLEMA IDENTIFICADO:**
- Slim Quality atual: API única tentando fazer tudo atomicamente
- Comademig (funciona): Edge Functions separadas para cada operação

**SOLUÇÃO IMPLEMENTADA:**
```typescript
// ❌ PADRÃO ATUAL (QUEBRADO)
// Uma função tentando fazer tudo
async function checkout(data) {
  // Tenta criar assinatura + processar cartão atomicamente
  const subscription = await asaas.createSubscription({
    customer: customerId,
    billingType: 'CREDIT_CARD',
    creditCard: { ... } // ❌ Asaas NÃO processa automaticamente!
  });
}

// ✅ PADRÃO COMADEMIG (FUNCIONA)
// Sequência separada e controlada
async function processRegistration(data) {
  // 1. Criar cliente
  const customer = await createAsaasCustomer(data.customerData);
  
  // 2. Criar PAYMENT avulso (primeira mensalidade)
  const payment = await createInitialPayment({
    customer: customer.id,
    billingType: 'CREDIT_CARD',
    value: data.planData.value,
    dueDate: new Date().toISOString().split('T')[0], // HOJE
    creditCard: data.paymentData.creditCard
  });
  
  // 3. Aguardar confirmação via polling
  const confirmed = await pollPaymentStatus(payment.id, 15000);
  
  // 4. SÓ DEPOIS criar assinatura recorrente
  if (confirmed.success) {
    const subscription = await createRecurringSubscription({
      customer: customer.id,
      creditCardToken: payment.creditCardToken, // Token da primeira mensalidade
      nextDueDate: calculateNextBillingDate('MONTHLY')
    });
  }
}
```

#### 2. Correção do Endpoint de Primeira Mensalidade

**PROBLEMA CRÍTICO:**
- Nosso sistema usa `/v3/subscriptions/` para primeira mensalidade
- Asaas NÃO processa cartão automaticamente neste endpoint
- Resultado: Fica PENDING indefinidamente

**CORREÇÃO OBRIGATÓRIA:**
```typescript
// ❌ INCORRETO (nosso sistema atual)
const response = await fetch(`${asaasBaseUrl}/subscriptions/`, {
  method: 'POST',
  body: JSON.stringify({
    customer: customerId,
    billingType: 'CREDIT_CARD',
    creditCard: { ... } // ❌ NÃO é processado automaticamente!
  })
});

// ✅ CORRETO (padrão Comademig)
// Primeira mensalidade como PAYMENT avulso
const paymentResponse = await fetch(`${asaasBaseUrl}/payments/`, {
  method: 'POST',
  body: JSON.stringify({
    customer: customerId,
    billingType: 'CREDIT_CARD',
    value: planValue,
    dueDate: new Date().toISOString().split('T')[0], // HOJE
    orderItems: orderItems, // CRÍTICO: não pode estar vazio
    creditCard: { ... },
    creditCardHolderInfo: { ... }
  })
});

// Aguardar confirmação
const pollingResult = await pollPaymentStatus(paymentResponse.id, 15000);

// SÓ DEPOIS criar assinatura recorrente
if (pollingResult.success) {
  const subscriptionResponse = await fetch(`${asaasBaseUrl}/subscriptions/`, {
    method: 'POST',
    body: JSON.stringify({
      customer: customerId,
      billingType: 'CREDIT_CARD',
      value: planValue,
      nextDueDate: calculateNextBillingDate('MONTHLY'),
      cycle: 'MONTHLY',
      creditCardToken: paymentResponse.creditCardToken // Token da primeira mensalidade
    })
  });
}
```

#### 3. Implementação de Polling Robusto

**BASEADO EM:** Implementação comprovada do Comademig
```typescript
interface PollingService {
  async pollPaymentStatus(config: {
    paymentId: string,
    timeout: number, // 15000ms
    interval: number // 1000ms
  }): Promise<PollingResult> {
    const startTime = Date.now();
    const maxAttempts = Math.floor(config.timeout / config.interval);
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await fetch(`${asaasBaseUrl}/payments/${config.paymentId}`);
        const payment = await response.json();
        
        // Log da tentativa (auditoria)
        await this.logPollingAttempt(config.paymentId, attempt, payment.status);
        
        if (payment.status === 'CONFIRMED') {
          return {
            success: true,
            status: 'CONFIRMED',
            attempts: attempt,
            duration: Date.now() - startTime,
            paymentData: payment
          };
        }
        
        if (payment.status === 'FAILED') {
          return {
            success: false,
            status: 'FAILED',
            attempts: attempt,
            duration: Date.now() - startTime,
            error: payment.failureReason
          };
        }
        
        // Aguardar próxima tentativa
        await new Promise(resolve => setTimeout(resolve, config.interval));
        
      } catch (error) {
        console.error(`Polling attempt ${attempt} failed:`, error);
      }
    }
    
    // Timeout atingido
    return {
      success: false,
      status: 'TIMEOUT',
      attempts: maxAttempts,
      duration: Date.now() - startTime,
      error: 'Polling timeout after 15 seconds'
    };
  }
}
```

#### 4. Webhook Idempotente e Robusto

**BASEADO EM:** Sistema de webhook do Comademig
```typescript
interface WebhookHandler {
  async processWebhook(payload: AsaasWebhookPayload): Promise<WebhookResult> {
    // 1. Validar assinatura (segurança)
    if (!this.validateWebhookSignature(payload.raw, payload.signature)) {
      throw new Error('Invalid webhook signature');
    }
    
    // 2. Verificar idempotência
    const eventId = payload.event.id;
    if (await this.isEventProcessed(eventId)) {
      return { success: true, processed: false, reason: 'Already processed' };
    }
    
    // 3. Processar evento
    const actions: WebhookAction[] = [];
    
    switch (payload.event.type) {
      case 'PAYMENT_CONFIRMED':
        actions.push(await this.handlePaymentConfirmed(payload.event.data));
        break;
        
      case 'SUBSCRIPTION_CREATED':
        actions.push(await this.handleSubscriptionCreated(payload.event.data));
        break;
        
      case 'SPLIT_PROCESSED':
        actions.push(await this.handleSplitProcessed(payload.event.data));
        break;
    }
    
    // 4. Marcar como processado
    await this.markEventAsProcessed(eventId, payload);
    
    return {
      success: true,
      processed: true,
      eventId,
      eventType: payload.event.type,
      actions
    };
  }
  
  private async handlePaymentConfirmed(paymentData: any): Promise<WebhookAction> {
    // Ativar usuário, confirmar indicações, etc.
    const userId = await this.findUserByPaymentId(paymentData.id);
    await this.activateUser(userId);
    await this.confirmAffiliateReferrals(paymentData);
    
    return {
      type: 'PAYMENT_CONFIRMED',
      entityId: paymentData.id,
      result: 'SUCCESS'
    };
  }
}
```

#### 5. Validação Crítica de Order Items

**PROBLEMA IDENTIFICADO:**
- Sistema atual não envia `orderItems` para Asaas
- Resultado: IA não consegue detectar produtos com funcionalidades IA
- Comissões de afiliados não são calculadas corretamente

**CORREÇÃO OBRIGATÓRIA:**
```typescript
interface OrderItemsValidator {
  validateOrderItems(items: OrderItem[]): ValidationResult {
    // 1. Verificar se não está vazio (CRÍTICO)
    if (!items || items.length === 0) {
      return {
        valid: false,
        error: 'Order items cannot be empty - required for AI detection and affiliate commissions'
      };
    }
    
    // 2. Validar cada item
    for (const item of items) {
      if (!item.id || !item.description || !item.value || !item.quantity) {
        return {
          valid: false,
          error: `Invalid order item: ${JSON.stringify(item)}`
        };
      }
      
      // 3. Validar metadados de IA (se aplicável)
      if (item.metadata?.hasAI && !item.metadata.aiFeatures?.length) {
        return {
          valid: false,
          error: `AI product must specify AI features: ${item.id}`
        };
      }
    }
    
    return { valid: true };
  }
  
  // Converter para formato Asaas
  toAsaasOrderItems(items: OrderItem[]): AsaasOrderItem[] {
    return items.map(item => ({
      id: item.id,
      description: item.description,
      value: item.value,
      quantity: item.quantity
    }));
  }
}
```

#### 6. Cálculo de Data de Cobrança

**BASEADO EM:** Lógica do Comademig
```typescript
interface BillingDateCalculator {
  calculateNextBillingDate(cycle: 'MONTHLY' | 'YEARLY', startDate?: Date): Date {
    const baseDate = startDate || new Date();
    const nextBilling = new Date(baseDate);
    
    if (cycle === 'MONTHLY') {
      nextBilling.setMonth(nextBilling.getMonth() + 1);
    } else if (cycle === 'YEARLY') {
      nextBilling.setFullYear(nextBilling.getFullYear() + 1);
    }
    
    return nextBilling;
  }
  
  calculateDueDate(immediate: boolean = true): string {
    const dueDate = immediate ? new Date() : new Date(Date.now() + 24 * 60 * 60 * 1000);
    return dueDate.toISOString().split('T')[0]; // YYYY-MM-DD
  }
}
```

### Resumo das Correções Críticas

1. **✅ Separação de responsabilidades:** Edge Functions dedicadas
2. **✅ Endpoint correto:** `/v3/payments` para primeira mensalidade
3. **✅ Polling robusto:** 15s timeout, 1s interval, logs de auditoria
4. **✅ Webhook idempotente:** Validação de assinatura, controle de duplicação
5. **✅ Order Items obrigatório:** Validação rigorosa, metadados de IA
6. **✅ Sequência correta:** Payment → Poll → Subscription → Activation
7. **✅ Adapter pattern:** Conversão segura de dados
8. **✅ Logs estruturados:** Auditoria completa para debug

Estas correções são baseadas na implementação comprovada do sistema Comademig e resolvem todos os problemas identificados no nosso sistema atual.

## Components and Interfaces

### Database Schema (Novas Tabelas - Isoladas)

```sql
-- Tabela para assinaturas (NOVA - não afeta sistema existente)
CREATE TABLE subscription_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  asaas_payment_id VARCHAR(50) NOT NULL,
  asaas_subscription_id VARCHAR(50),
  status subscription_status NOT NULL DEFAULT 'pending',
  amount DECIMAL(10,2) NOT NULL,
  order_items JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ NULL
);

-- Tabela para eventos de webhook (NOVA - idempotência)
CREATE TABLE subscription_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asaas_event_id VARCHAR(100) UNIQUE NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  payload JSONB NOT NULL
);

-- Tabela para logs de polling (NOVA - auditoria)
CREATE TABLE subscription_polling_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id VARCHAR(50) NOT NULL,
  attempt_number INTEGER NOT NULL,
  status VARCHAR(50) NOT NULL,
  response_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enum para status de assinatura (NOVO)
CREATE TYPE subscription_status AS ENUM (
  'pending',
  'payment_processing',
  'payment_confirmed',
  'subscription_created',
  'active',
  'failed',
  'cancelled'
);
```

### API Endpoints (Novos - Isolados)

```typescript
// Rotas dedicadas para assinaturas (não conflitam com produtos físicos)
POST /api/subscriptions/create-payment
POST /api/subscriptions/webhook
GET /api/subscriptions/status/:paymentId
POST /api/subscriptions/cancel/:subscriptionId

// Mantém rotas existentes intocáveis
POST /api/payments/create (produtos físicos - existente)
POST /api/webhook (produtos físicos - existente)
```

### Service Interfaces

#### PaymentOrchestratorService
```typescript
interface PaymentOrchestratorService {
  // Método principal para iniciar fluxo de assinatura
  processSubscriptionPayment(data: SubscriptionPaymentData): Promise<PaymentResult>
  
  // Coordena polling e criação de assinatura
  handlePaymentConfirmation(paymentId: string): Promise<void>
  
  // Cria assinatura recorrente após confirmação
  createRecurringSubscription(paymentId: string): Promise<Subscription>
  
  // Ativa usuário no sistema
  activateUser(userId: string, subscriptionId: string): Promise<void>
}

interface SubscriptionPaymentData {
  userId: string
  planId: string
  amount: number
  orderItems: OrderItem[]
  customerData: CustomerData
  paymentMethod: PaymentMethod
}
```

#### PollingService
```typescript
interface PollingService {
  // Inicia polling com timeout configurável
  pollPaymentStatus(paymentId: string, options: PollingOptions): Promise<PaymentStatus>
  
  // Verifica status uma vez
  checkPaymentStatus(paymentId: string): Promise<PaymentStatus>
  
  // Para polling ativo
  stopPolling(paymentId: string): void
  
  // Registra tentativa de polling
  logPollingAttempt(paymentId: string, attempt: number, status: string): Promise<void>
}

interface PollingOptions {
  timeoutMs: number // 15000 (15 segundos)
  intervalMs: number // 1000 (1 segundo)
  maxAttempts: number // 15
}
```

#### WebhookHandlerService
```typescript
interface WebhookHandlerService {
  // Processa webhook com idempotência
  processWebhook(payload: AsaasWebhookPayload): Promise<WebhookResult>
  
  // Valida assinatura do webhook
  validateWebhookSignature(payload: string, signature: string): boolean
  
  // Verifica se evento já foi processado
  isEventProcessed(eventId: string): Promise<boolean>
  
  // Registra evento processado
  markEventAsProcessed(eventId: string, payload: any): Promise<void>
}
```

## Data Models

### Core Models

```typescript
// Modelo principal de assinatura
interface SubscriptionOrder {
  id: string
  userId: string
  asaasPaymentId: string
  asaasSubscriptionId?: string
  status: SubscriptionStatus
  amount: number
  orderItems: OrderItem[]
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date
}

// Item do pedido (crítico para detecção IA)
interface OrderItem {
  id: string
  name: string
  quantity: number
  value: number
  description?: string
  metadata?: {
    hasAI: boolean
    aiFeatures: string[]
  }
}

// Status do pagamento/assinatura
enum SubscriptionStatus {
  PENDING = 'pending',
  PAYMENT_PROCESSING = 'payment_processing',
  PAYMENT_CONFIRMED = 'payment_confirmed',
  SUBSCRIPTION_CREATED = 'subscription_created',
  ACTIVE = 'active',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

// Resultado do polling
interface PaymentStatus {
  id: string
  status: 'PENDING' | 'CONFIRMED' | 'FAILED'
  confirmedAt?: Date
  failureReason?: string
}

// Evento de webhook
interface WebhookEvent {
  id: string
  asaasEventId: string
  eventType: string
  processedAt: Date
  payload: any
}
```

### Asaas Integration Models

```typescript
// Payload para criar pagamento (primeira mensalidade)
interface AsaasPaymentPayload {
  customer: string
  billingType: 'CREDIT_CARD' | 'PIX'
  value: number
  dueDate: string
  description: string
  orderItems: AsaasOrderItem[] // CRÍTICO: não pode estar vazio
  creditCard?: CreditCardData
  creditCardHolderInfo?: CardHolderInfo
}

// Item do pedido para Asaas
interface AsaasOrderItem {
  id: string
  description: string
  value: number
  quantity: number
}

// Payload para criar assinatura recorrente
interface AsaasSubscriptionPayload {
  customer: string
  billingType: 'CREDIT_CARD'
  value: number
  nextDueDate: string
  cycle: 'MONTHLY'
  description: string
  creditCard?: CreditCardData
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Converting EARS to Properties

Baseado na análise de prework dos acceptance criteria, convertendo os requisitos testáveis em propriedades universalmente quantificadas:

**Property 1: Payment First Flow Endpoint Usage**
*For any* subscription payment request, the system should use /v3/payments endpoint for the first payment (not /v3/subscriptions)
**Validates: Requirements 2.1, 15.3**

**Property 2: Order Items Validation Completeness**
*For any* payment creation request, the system should validate that Order_Items is not empty and contains all required fields (ID, name, quantity, value) before sending to Asaas
**Validates: Requirements 2.2, 10.1, 10.2, 10.4, 15.6**

**Property 3: Polling Timeout Compliance**
*For any* payment polling operation, the system should respect the 15-second timeout and 1-second interval limits with audit logging
**Validates: Requirements 2.3, 3.1, 3.3, 15.4, 17.2**

**Property 4: Payment Confirmation Triggers Subscription**
*For any* confirmed payment, the system should automatically create a recurring subscription using /v3/subscriptions only after confirmation
**Validates: Requirements 2.4, 5.1, 15.7**

**Property 5: Webhook Idempotency and Security**
*For any* webhook event received multiple times with the same asaas_event_id, the system should process it only once, validate signatures, and return success for subsequent calls
**Validates: Requirements 4.1, 4.2, 4.4, 4.5, 15.5**

**Property 6: Orchestrator Coordination Sequence**
*For any* subscription payment request, the PaymentFirstFlowService should coordinate all Edge Functions in the exact mandatory sequence and maintain flow state throughout execution
**Validates: Requirements 11.1, 11.3, 15.1, 15.2**

**Property 7: Data Conversion Accuracy**
*For any* data transformation between internal format and Asaas API, the adapters should validate schema compliance and maintain data integrity in both directions
**Validates: Requirements 13.1, 13.2, 13.3, 13.4, 15.8**

**Property 8: User Activation After Payment**
*For any* confirmed payment, the system should activate the user and grant access to subscription resources
**Validates: Requirements 6.1, 6.2, 6.4**

**Property 9: Comprehensive Structured Logging**
*For any* system operation, the system should create structured logs with appropriate levels (DEBUG, INFO, WARN, ERROR), timestamps, context, and correlation IDs
**Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 17.1**

**Property 10: Automatic Notification System**
*For any* significant state change (payment failure, subscription creation, user activation), the system should send appropriate notifications to the user
**Validates: Requirements 2.5, 5.3, 6.3**

**Property 11: Resilient Error Handling with Retry**
*For any* system failure (API unavailable, network issues, timeouts), the system should implement appropriate retry mechanisms with exponential backoff and maintain consistent state
**Validates: Requirements 9.1, 9.3, 9.4, 9.5, 17.4**

**Property 12: Input Validation and Error Reporting**
*For any* invalid input data, the system should validate and return specific error messages without processing
**Validates: Requirements 9.2**

**Property 13: AI Product Metadata Marking**
*For any* product with AI functionality, the system should include appropriate metadata markers in the order items
**Validates: Requirements 10.3**

**Property 14: Commission Calculation Accuracy**
*For any* confirmed payment with valid affiliate data, the system should calculate commissions correctly based on Order Items and process splits automatically
**Validates: Requirements 18.1, 18.2, 18.3**

**Property 15: System Isolation and Non-Regression**
*For any* new subscription functionality, the system should maintain complete isolation from existing physical product payment flows and preserve all existing API routes and database structures
**Validates: Requirements 14.2, 14.4, 14.6, 14.7, 14.8, 16.1, 16.2, 16.3, 16.4**

**Property 16: Webhook Event Audit Trail**
*For any* webhook event processed, the system should register the event in audit logs with complete payload and processing results
**Validates: Requirements 17.3**

## Error Handling

### Error Categories and Responses

#### 1. Asaas API Errors
```typescript
interface AsaasErrorHandler {
  // Retry com backoff exponencial para erros temporários
  handleTemporaryError(error: AsaasApiError): Promise<RetryResult>
  
  // Falha imediata para erros permanentes
  handlePermanentError(error: AsaasApiError): Promise<ErrorResult>
  
  // Validação de resposta da API
  validateApiResponse(response: AsaasApiResponse): ValidationResult
}

// Configuração de retry
const RETRY_CONFIG = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2
}
```

#### 2. Validation Errors
```typescript
interface ValidationErrorHandler {
  // Validação de Order_Items obrigatória
  validateOrderItems(items: OrderItem[]): ValidationResult
  
  // Validação de dados do cliente
  validateCustomerData(data: CustomerData): ValidationResult
  
  // Validação de método de pagamento
  validatePaymentMethod(method: PaymentMethod): ValidationResult
}
```

#### 3. Timeout Handling
```typescript
interface TimeoutHandler {
  // Timeout do polling (15 segundos)
  handlePollingTimeout(paymentId: string): Promise<TimeoutResult>
  
  // Timeout de API calls (30 segundos)
  handleApiTimeout(operation: string): Promise<TimeoutResult>
  
  // Cleanup de operações canceladas
  cleanupCancelledOperations(operationId: string): Promise<void>
}
```

#### 4. State Consistency
```typescript
interface StateManager {
  // Garantir consistência em falhas parciais
  ensureConsistentState(operationId: string): Promise<ConsistencyResult>
  
  // Rollback de operações falhadas
  rollbackFailedOperation(operationId: string): Promise<RollbackResult>
  
  // Verificação de integridade
  validateSystemIntegrity(): Promise<IntegrityResult>
}
```

### Error Recovery Strategies

#### 1. Payment Creation Failures
- Retry automático até 3 vezes
- Fallback para método de pagamento alternativo
- Notificação ao usuário sobre falha
- Preservação do estado do carrinho

#### 2. Polling Failures
- Timeout após 15 segundos
- Fallback para webhook-only processing
- Notificação de processamento assíncrono
- Cleanup de recursos de polling

#### 3. Subscription Creation Failures
- Retry manual disponível
- Preservação do pagamento confirmado
- Notificação de problema técnico
- Escalação para suporte técnico

#### 4. User Activation Failures
- Retry automático em background
- Ativação manual como fallback
- Monitoramento de ativações pendentes
- Alertas para administradores

## Testing Strategy

### Dual Testing Approach

O sistema utilizará uma abordagem dupla de testes para garantir cobertura completa:

#### Unit Tests
- **Foco:** Exemplos específicos, casos edge, condições de erro
- **Cobertura:** Validações, transformações de dados, lógica de negócio
- **Ferramentas:** Jest/Vitest para TypeScript, Deno Test para Edge Functions
- **Isolamento:** Mocks para APIs externas (Asaas), banco de dados em memória

#### Property-Based Tests
- **Foco:** Propriedades universais que devem ser válidas para todos os inputs
- **Cobertura:** Comportamentos que devem ser consistentes independente dos dados
- **Configuração:** Mínimo 100 iterações por teste
- **Biblioteca:** fast-check para TypeScript

### Property Test Configuration

Cada propriedade de correção será implementada como um teste baseado em propriedades:

```typescript
// Exemplo de configuração de teste de propriedade
describe('Subscription Payment Flow Properties', () => {
  test('Property 1: Payment First Flow Endpoint Usage', async () => {
    await fc.assert(
      fc.asyncProperty(
        subscriptionPaymentDataArbitrary,
        async (paymentData) => {
          const result = await paymentOrchestrator.processSubscriptionPayment(paymentData);
          
          // Verificar que /v3/payments foi usado, não /v3/subscriptions
          expect(mockAsaasClient.createPayment).toHaveBeenCalled();
          expect(mockAsaasClient.createSubscription).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  }, {
    // Tag para rastreabilidade
    tags: ['Feature: subscription-payment-flow', 'Property 1: Payment First Flow Endpoint Usage']
  });
});
```

### Test Categories

#### 1. Integration Tests
- **Escopo:** Fluxo completo end-to-end
- **Ambiente:** Ambiente de teste com Asaas sandbox
- **Validação:** Integração real com APIs externas
- **Frequência:** Execução em CI/CD pipeline

#### 2. Edge Function Tests
- **Escopo:** Cada Edge Function individualmente
- **Ambiente:** Supabase local development
- **Validação:** Comportamento isolado de cada função
- **Mocking:** APIs externas mockadas

#### 3. Database Tests
- **Escopo:** Operações de banco de dados
- **Ambiente:** PostgreSQL em memória
- **Validação:** Integridade de dados, constraints, triggers
- **Isolamento:** Transações rollback após cada teste

#### 4. Regression Tests
- **Escopo:** Funcionalidades de produtos físicos existentes
- **Objetivo:** Garantir que nada foi quebrado
- **Cobertura:** Todas as APIs e fluxos existentes
- **Critério:** 100% das funcionalidades existentes devem continuar funcionando

### Test Data Management

#### Generators para Property Tests
```typescript
// Geradores de dados para testes baseados em propriedades
const subscriptionPaymentDataArbitrary = fc.record({
  userId: fc.uuid(),
  planId: fc.string({ minLength: 1, maxLength: 50 }),
  amount: fc.float({ min: 0.01, max: 10000 }),
  orderItems: fc.array(orderItemArbitrary, { minLength: 1, maxLength: 10 }),
  customerData: customerDataArbitrary,
  paymentMethod: paymentMethodArbitrary
});

const orderItemArbitrary = fc.record({
  id: fc.string({ minLength: 1 }),
  name: fc.string({ minLength: 1, maxLength: 100 }),
  quantity: fc.integer({ min: 1, max: 100 }),
  value: fc.float({ min: 0.01, max: 1000 }),
  metadata: fc.record({
    hasAI: fc.boolean(),
    aiFeatures: fc.array(fc.string(), { maxLength: 5 })
  })
});
```

#### Test Environment Isolation
```typescript
// Configuração de ambiente isolado para testes
const TEST_CONFIG = {
  database: {
    url: 'postgresql://test:test@localhost:5432/subscription_test',
    schema: 'subscription_test_schema'
  },
  asaas: {
    apiKey: 'test_api_key',
    baseUrl: 'https://sandbox.asaas.com/api/v3',
    webhookSecret: 'test_webhook_secret'
  },
  supabase: {
    url: 'http://localhost:54321',
    anonKey: 'test_anon_key',
    serviceKey: 'test_service_key'
  }
};
```

### Performance Testing

#### Load Testing
- **Ferramenta:** Artillery ou k6
- **Cenários:** Picos de tráfego, múltiplas assinaturas simultâneas
- **Métricas:** Latência, throughput, taxa de erro
- **Limites:** 95% das requisições < 2s, 99.9% uptime

#### Stress Testing
- **Objetivo:** Identificar pontos de falha
- **Cenários:** Sobrecarga de Edge Functions, timeout de polling
- **Validação:** Degradação graceful, recovery automático
- **Monitoramento:** Logs estruturados, métricas de sistema

### Monitoring and Observability

#### Structured Logging
```typescript
interface LogEntry {
  timestamp: string;
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  service: string;
  operation: string;
  correlationId: string;
  userId?: string;
  paymentId?: string;
  subscriptionId?: string;
  message: string;
  metadata?: Record<string, any>;
  error?: {
    name: string;
    message: string;
    stack: string;
  };
}
```

#### Metrics Collection
- **Payment Success Rate:** % de pagamentos confirmados
- **Polling Efficiency:** Tempo médio até confirmação
- **Error Rates:** Taxa de erro por tipo de operação
- **Performance:** Latência P95/P99 por endpoint
- **Business Metrics:** Conversão de pagamento para assinatura ativa

#### Alerting
- **Critical:** Falhas de pagamento > 5%, timeout de polling > 50%
- **Warning:** Latência > 2s, taxa de erro > 1%
- **Info:** Novos usuários ativados, assinaturas criadas
- **Channels:** Slack, email, PagerDuty para críticos