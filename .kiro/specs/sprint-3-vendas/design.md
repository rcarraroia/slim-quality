# Design Document - Sprint 3: Sistema de Vendas

## Overview

Este documento detalha o design técnico para o Sprint 3 do projeto Slim Quality Backend. O foco é implementar um sistema completo de vendas com integração ao gateway de pagamento Asaas, suportando PIX e Cartão de Crédito.

**Características principais:**
- Criação e gestão de pedidos
- Integração completa com Asaas (clientes, cobranças, webhooks)
- Suporte a PIX e Cartão de Crédito
- **Split automático de comissões configurado na criação da cobrança**
- Atualização automática de estoque
- APIs públicas e administrativas

**⚠️ Ajustes baseados na documentação oficial Asaas:**
- Split é configurado NA CRIAÇÃO da cobrança (não depois)
- Webhooks validados via `authToken` no header `asaas-access-token`
- Campos corretos: `cpfCnpj`, `postalCode`, `mobilePhone`
- `remoteIp` obrigatório para pagamentos com cartão

## Architecture

### Sales System Flow

```
┌─────────────┐
│   Cliente   │
└──────┬──────┘
       │ 1. Criar Pedido
       ↓
┌─────────────────────────────────────┐
│     Order Service                   │
│  • Validar produtos                 │
│  • Calcular total                   │
│  • Criar pedido (status: pending)   │
└──────┬──────────────────────────────┘
       │ 2. Gerar Pagamento
       ↓
┌─────────────────────────────────────┐
│     Asaas Service                   │
│  • Criar/buscar customer            │
│  • Criar cobrança (PIX/Cartão)      │
│  • Retornar dados de pagamento      │
└──────┬──────────────────────────────┘
       │ 3. Cliente Paga
       ↓
┌─────────────────────────────────────┐
│     Asaas (Externo)                 │
│  • Processar pagamento              │
│  • Enviar webhook                   │
└──────┬──────────────────────────────┘
       │ 4. Webhook
       ↓
┌─────────────────────────────────────┐
│     Webhook Handler                 │
│  • Validar authToken                │
│  • Verificar idempotência           │
│  • Atualizar status pedido          │
│  • Reduzir estoque                  │
│  • Registrar log                    │
└─────────────────────────────────────┘

NOTA: Split é configurado NA CRIAÇÃO da cobrança
      e executado AUTOMATICAMENTE pelo Asaas
```


## Database Schema

### 1. Tabela: orders

**Objetivo:** Armazenar pedidos dos clientes

```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificação
  order_number TEXT NOT NULL UNIQUE, -- Número do pedido (ex: ORD-2025-0001)
  
  -- Cliente
  customer_id UUID NOT NULL REFERENCES profiles(id),
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  customer_cpf TEXT,
  
  -- Valores
  subtotal_cents INTEGER NOT NULL CHECK (subtotal_cents > 0),
  shipping_cents INTEGER DEFAULT 0,
  discount_cents INTEGER DEFAULT 0,
  total_cents INTEGER NOT NULL CHECK (total_cents > 0),
  
  -- Status
  status TEXT NOT NULL CHECK (status IN (
    'pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'
  )),
  
  -- Integração Asaas
  asaas_customer_id TEXT, -- ID do customer no Asaas
  remote_ip TEXT, -- IP do cliente (obrigatório para cartão)
  
  -- ⭐ Preparação para Sprint 4 (Afiliados)
  referral_code TEXT, -- Código de indicação usado (se houver)
  affiliate_n1_id UUID REFERENCES profiles(id), -- Afiliado direto
  affiliate_n2_id UUID REFERENCES profiles(id), -- Afiliado nível 2
  affiliate_n3_id UUID REFERENCES profiles(id), -- Afiliado nível 3
  
  -- Observações
  notes TEXT,
  
  -- Metadados
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  deleted_at TIMESTAMPTZ
);


-- Índices
CREATE INDEX idx_orders_customer ON orders(customer_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_orders_status ON orders(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_orders_order_number ON orders(order_number) WHERE deleted_at IS NULL;
CREATE INDEX idx_orders_created_at ON orders(created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_orders_referral_code ON orders(referral_code) WHERE referral_code IS NOT NULL;

-- Trigger
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Função para gerar order_number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
DECLARE
  year_part TEXT;
  sequence_num INTEGER;
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    year_part := TO_CHAR(NOW(), 'YYYY');
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 10) AS INTEGER)), 0) + 1
    INTO sequence_num
    FROM orders
    WHERE order_number LIKE 'ORD-' || year_part || '-%';
    
    NEW.order_number := 'ORD-' || year_part || '-' || LPAD(sequence_num::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_order_number_trigger
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION generate_order_number();
```

### 2. Tabela: order_items

**Objetivo:** Itens individuais de cada pedido

```sql
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  
  -- Produto
  product_id UUID NOT NULL REFERENCES products(id),
  product_name TEXT NOT NULL, -- Snapshot do nome
  product_sku TEXT NOT NULL, -- Snapshot do SKU
  
  -- Valores
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents > 0),
  total_price_cents INTEGER NOT NULL CHECK (total_price_cents > 0),
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Índices
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);
```

### 3. Tabela: order_status_history

**Objetivo:** Histórico de mudanças de status dos pedidos

```sql
CREATE TABLE order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  
  -- Status
  from_status TEXT,
  to_status TEXT NOT NULL,
  
  -- Responsável
  changed_by UUID REFERENCES profiles(id),
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Índices
CREATE INDEX idx_order_status_history_order ON order_status_history(order_id);
CREATE INDEX idx_order_status_history_created_at ON order_status_history(created_at DESC);
```

### 4. Tabela: payments

**Objetivo:** Pagamentos associados aos pedidos

```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  
  -- Tipo e método
  payment_method TEXT NOT NULL CHECK (payment_method IN ('pix', 'credit_card')),
  
  -- Valores
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  
  -- Status (baseado na documentação oficial Asaas)
  status TEXT NOT NULL CHECK (status IN (
    'pending',      -- Aguardando pagamento
    'confirmed',    -- Pagamento confirmado (pode ter bloqueio cautelar 72h)
    'received',     -- Valor recebido na conta
    'overdue',      -- Vencido
    'refunded',     -- Estornado
    'cancelled',    -- Cancelado
    'authorized'    -- Pré-autorizado (cartão)
  )),
  
  -- Integração Asaas
  asaas_payment_id TEXT UNIQUE, -- ID do payment no Asaas
  asaas_charge_id TEXT, -- ID da cobrança no Asaas
  
  -- Dados PIX
  pix_qr_code TEXT,
  pix_copy_paste TEXT,
  pix_expires_at TIMESTAMPTZ,
  
  -- Dados Cartão
  card_brand TEXT,
  card_last_digits TEXT,
  installments INTEGER DEFAULT 1,
  
  -- Datas
  paid_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Índices
CREATE INDEX idx_payments_order ON payments(order_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_asaas_payment_id ON payments(asaas_payment_id) WHERE asaas_payment_id IS NOT NULL;

-- Trigger
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### 5. Tabela: shipping_addresses

**Objetivo:** Endereços de entrega dos pedidos

```sql
CREATE TABLE shipping_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  
  -- Endereço
  recipient_name TEXT NOT NULL,
  street TEXT NOT NULL,
  number TEXT NOT NULL,
  complement TEXT,
  neighborhood TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  
  -- Contato
  phone TEXT NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  UNIQUE(order_id)
);

-- Índices
CREATE INDEX idx_shipping_addresses_order ON shipping_addresses(order_id);
CREATE INDEX idx_shipping_addresses_postal_code ON shipping_addresses(postal_code);
```

### 6. Tabela: asaas_transactions

**Objetivo:** Log de todas as transações com Asaas

```sql
CREATE TABLE asaas_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Referência
  order_id UUID REFERENCES orders(id),
  payment_id UUID REFERENCES payments(id),
  
  -- Tipo de transação
  transaction_type TEXT NOT NULL CHECK (transaction_type IN (
    'create_customer', 'create_payment', 'get_payment', 'webhook'
  )),
  
  -- Request/Response
  request_payload JSONB,
  response_payload JSONB,
  
  -- Status
  success BOOLEAN NOT NULL,
  error_message TEXT,
  http_status INTEGER,
  
  -- Asaas IDs
  asaas_customer_id TEXT,
  asaas_payment_id TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Índices
CREATE INDEX idx_asaas_transactions_order ON asaas_transactions(order_id);
CREATE INDEX idx_asaas_transactions_payment ON asaas_transactions(payment_id);
CREATE INDEX idx_asaas_transactions_type ON asaas_transactions(transaction_type);
CREATE INDEX idx_asaas_transactions_created_at ON asaas_transactions(created_at DESC);
```

### 7. Tabela: asaas_splits (OPCIONAL - Apenas Auditoria)

**Objetivo:** Log/auditoria de splits configurados (OPCIONAL)

**⚠️ IMPORTANTE:** Split é configurado NA CRIAÇÃO da cobrança via array `splits` e executado AUTOMATICAMENTE pelo Asaas. Esta tabela é apenas para auditoria/log, não para "preparar" splits.

```sql
CREATE TABLE asaas_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Referência
  payment_id UUID NOT NULL REFERENCES payments(id),
  order_id UUID NOT NULL REFERENCES orders(id),
  
  -- Configuração do split enviada para Asaas
  split_config JSONB NOT NULL, -- Array de splits enviado na criação
  
  -- Valores calculados
  total_amount_cents INTEGER NOT NULL,
  net_amount_cents INTEGER NOT NULL, -- Valor líquido (após taxas Asaas)
  
  -- Status (do Asaas)
  status TEXT CHECK (status IN (
    'pending',          -- Aguardando processamento
    'awaiting_credit',  -- Aguardando crédito
    'done',             -- Concluído
    'cancelled',        -- Cancelado
    'refused',          -- Recusado
    'refunded'          -- Estornado
  )),
  
  -- Metadados
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Índices
CREATE INDEX idx_asaas_splits_payment ON asaas_splits(payment_id);
CREATE INDEX idx_asaas_splits_order ON asaas_splits(order_id);
CREATE INDEX idx_asaas_splits_status ON asaas_splits(status);

-- Trigger
CREATE TRIGGER update_asaas_splits_updated_at
  BEFORE UPDATE ON asaas_splits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

**Nota:** Esta tabela é OPCIONAL. O split funciona sem ela, pois é configurado diretamente na criação da cobrança no Asaas.

### 8. Tabela: asaas_webhook_logs

**Objetivo:** Log de todos os webhooks recebidos do Asaas + Idempotência

**⚠️ CRÍTICO:** Campo `asaas_event_id` é UNIQUE para garantir idempotência (webhooks podem ser enviados mais de uma vez)

```sql
CREATE TABLE asaas_webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Webhook (Idempotência)
  asaas_event_id TEXT UNIQUE NOT NULL, -- ⭐ UNIQUE para idempotência
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  
  -- Validação
  token_valid BOOLEAN NOT NULL, -- Validação do authToken
  
  -- Processamento
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  
  -- Asaas IDs
  asaas_payment_id TEXT,
  
  -- Referências locais
  payment_id UUID REFERENCES payments(id),
  order_id UUID REFERENCES orders(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Índices
CREATE INDEX idx_asaas_webhook_logs_event_type ON asaas_webhook_logs(event_type);
CREATE INDEX idx_asaas_webhook_logs_processed ON asaas_webhook_logs(processed);
CREATE INDEX idx_asaas_webhook_logs_asaas_payment_id ON asaas_webhook_logs(asaas_payment_id);
CREATE INDEX idx_asaas_webhook_logs_created_at ON asaas_webhook_logs(created_at DESC);
```



## Services

### OrderService

```typescript
class OrderService {
  /**
   * Cria novo pedido
   */
  async createOrder(data: CreateOrderInput, userId: string): Promise<Order> {
    // 1. Validar produtos existem e estão ativos
    // 2. Calcular valores (subtotal, shipping, total)
    // 3. Criar pedido com status 'pending'
    // 4. Criar order_items
    // 5. Criar shipping_address
    // 6. Registrar em order_status_history
    // 7. Retornar pedido criado
  }
  
  /**
   * Busca pedido por ID
   */
  async getOrderById(orderId: string, userId?: string): Promise<OrderDetail | null> {
    // 1. Buscar pedido
    // 2. Incluir order_items, payment, shipping_address
    // 3. Validar ownership se userId fornecido
    // 4. Retornar detalhes completos
  }
  
  /**
   * Lista pedidos do usuário
   */
  async getMyOrders(userId: string, filters: OrderFilters): Promise<OrderList> {
    // 1. Buscar pedidos do usuário
    // 2. Aplicar filtros (status, data)
    // 3. Incluir informações básicas
    // 4. Paginar resultados
  }
  
  /**
   * Atualiza status do pedido
   */
  async updateOrderStatus(
    orderId: string,
    newStatus: OrderStatus,
    userId: string,
    notes?: string
  ): Promise<Order> {
    // 1. Buscar pedido
    // 2. Validar transição de status
    // 3. Atualizar status
    // 4. Registrar em history
    // 5. Executar ações (ex: atualizar estoque)
  }
  
  /**
   * Cancela pedido
   */
  async cancelOrder(orderId: string, userId: string, reason: string): Promise<void> {
    // 1. Validar pode cancelar
    // 2. Atualizar status para 'cancelled'
    // 3. Devolver estoque
    // 4. Cancelar pagamento no Asaas (se aplicável)
  }
}
```

### AsaasService

```typescript
class AsaasService {
  private apiKey: string;
  private baseUrl: string;
  
  /**
   * Cria ou busca customer no Asaas
   * ⚠️ Usar campos corretos: cpfCnpj, postalCode, mobilePhone
   */
  async getOrCreateCustomer(customerData: CustomerData): Promise<string> {
    // 1. Buscar customer por email
    // 2. Se não existe, criar novo com campos corretos:
    //    - cpfCnpj (não customer_cpf)
    //    - postalCode (não postal_code)
    //    - mobilePhone (campo adicional)
    // 3. Registrar transação
    // 4. Retornar customer_id
  }
  
  /**
   * Calcula array de splits para comissões
   * ⚠️ NÃO incluir wallet da fábrica - ela recebe o restante automaticamente
   */
  private calculateSplits(order: Order): SplitConfig[] {
    const splits: SplitConfig[] = [];
    
    // Adicionar afiliados (se houver)
    if (order.affiliate_n1_wallet_id) {
      splits.push({ walletId: order.affiliate_n1_wallet_id, percentualValue: 15 });
    }
    if (order.affiliate_n2_wallet_id) {
      splits.push({ walletId: order.affiliate_n2_wallet_id, percentualValue: 3 });
    }
    if (order.affiliate_n3_wallet_id) {
      splits.push({ walletId: order.affiliate_n3_wallet_id, percentualValue: 2 });
    }
    
    // Adicionar gestores (sempre)
    splits.push({ walletId: process.env.ASAAS_WALLET_RENUM, percentualValue: 5 });
    splits.push({ walletId: process.env.ASAAS_WALLET_JB, percentualValue: 5 });
    
    // Total: 30% (fábrica recebe 70% automaticamente)
    return splits;
  }
  
  /**
   * Cria cobrança PIX com split configurado
   */
  async createPixPayment(data: CreatePixPaymentInput): Promise<PixPaymentResponse> {
    // 1. Calcular splits
    const splits = this.calculateSplits(data.order);
    
    // 2. Criar payment no Asaas COM splits
    const payload = {
      customer: data.customerId,
      billingType: 'PIX',
      value: data.amount,
      dueDate: data.dueDate,
      splits: splits  // ⭐ Configurar split NA CRIAÇÃO
    };
    
    // 3. Obter QR Code
    // 4. Registrar transação
    // 5. Retornar dados do PIX
  }
  
  /**
   * Cria cobrança Cartão com split configurado
   * ⚠️ remoteIp é OBRIGATÓRIO
   */
  async createCreditCardPayment(
    data: CreateCreditCardPaymentInput
  ): Promise<CreditCardPaymentResponse> {
    // 1. Validar remoteIp está presente
    if (!data.remoteIp) {
      throw new Error('remoteIp is required for credit card payments');
    }
    
    // 2. Calcular splits
    const splits = this.calculateSplits(data.order);
    
    // 3. Criar payment no Asaas COM splits
    const payload = {
      customer: data.customerId,
      billingType: 'CREDIT_CARD',
      value: data.amount,
      dueDate: data.dueDate,
      creditCard: data.creditCard,
      creditCardHolderInfo: data.creditCardHolderInfo,
      remoteIp: data.remoteIp,  // ⭐ OBRIGATÓRIO
      splits: splits  // ⭐ Configurar split NA CRIAÇÃO
    };
    
    // 4. Processar cartão
    // 5. Registrar transação
    // 6. Retornar status (aprovado/rejeitado)
  }
  
  /**
   * Consulta status de pagamento
   */
  async getPaymentStatus(asaasPaymentId: string): Promise<PaymentStatus> {
    // 1. Consultar payment no Asaas
    // 2. Registrar transação
    // 3. Retornar status atualizado
  }
  
  /**
   * Valida token de webhook
   * ⚠️ Asaas envia authToken no header 'asaas-access-token'
   */
  validateWebhookToken(receivedToken: string): boolean {
    const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN;
    return receivedToken === expectedToken;
  }
}
```

### WebhookService

```typescript
class WebhookService {
  /**
   * Processa webhook do Asaas com idempotência
   * ⚠️ CRÍTICO: Implementar idempotência usando asaas_event_id
   */
  async processWebhook(payload: WebhookPayload, token: string): Promise<void> {
    // 1. Validar authToken
    const isValid = asaasService.validateWebhookToken(token);
    if (!isValid) {
      throw new Error('Invalid webhook token');
    }
    
    // 2. Verificar idempotência (asaas_event_id UNIQUE)
    try {
      await supabase
        .from('asaas_webhook_logs')
        .insert({
          asaas_event_id: payload.id,  // ⭐ UNIQUE constraint
          event_type: payload.event,
          payload: payload,
          token_valid: true,
          processed: false
        });
    } catch (error) {
      // Se já existe (unique violation), retornar sucesso
      if (error.code === '23505') {
        return { success: true, message: 'Event already processed' };
      }
      throw error;
    }
    
    // 3. Processar evento de forma assíncrona
    await this.processEventAsync(payload);
    
    // 4. Marcar como processado
    await supabase
      .from('asaas_webhook_logs')
      .update({ processed: true, processed_at: new Date() })
      .eq('asaas_event_id', payload.id);
  }
  
  /**
   * Processa confirmação de pagamento
   * ⚠️ Split já foi configurado na criação - não precisa preparar aqui
   */
  async handlePaymentConfirmed(webhookData: any): Promise<void> {
    // 1. Buscar payment por asaas_payment_id
    // 2. Atualizar status para 'confirmed'
    // 3. Atualizar order status para 'paid'
    // 4. Reduzir estoque
    // 5. Registrar em history
    // ⭐ NÃO preparar split - já foi configurado na criação da cobrança
  }
  
  /**
   * Processa recebimento de pagamento
   */
  async handlePaymentReceived(webhookData: any): Promise<void> {
    // 1. Buscar payment
    // 2. Atualizar status para 'received'
    // 3. Registrar data de recebimento
    // 4. Registrar em history
  }
  
  /**
   * Processa pagamento vencido
   */
  async handlePaymentOverdue(webhookData: any): Promise<void> {
    // 1. Buscar payment
    // 2. Atualizar status para 'overdue'
    // 3. Notificar admin
    // 4. Registrar em history
  }
}
```

**⚠️ SplitService REMOVIDO:** Split é configurado na criação da cobrança e executado automaticamente pelo Asaas. Não precisa de service separado.

## API Endpoints

### Public Endpoints

#### POST /api/orders

**Descrição:** Cria novo pedido

**Request:**
```typescript
{
  items: [
    {
      product_id: string;
      quantity: number;
    }
  ];
  shipping_address: {
    recipient_name: string;
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    postal_code: string;
    phone: string;
  };
  customer_cpf?: string;
  notes?: string;
}
```

**Response (201):**
```typescript
{
  success: true;
  data: {
    id: string;
    order_number: string;
    total: number;
    status: string;
    created_at: string;
  };
}
```

#### POST /api/orders/:id/payment

**Descrição:** Gera pagamento para pedido

**Request:**
```typescript
{
  payment_method: 'pix' | 'credit_card';
  
  // Se cartão:
  card?: {
    number: string;
    holder_name: string;
    expiry_month: string;
    expiry_year: string;
    ccv: string;
  };
  installments?: number;
}
```

**Response (200):**
```typescript
{
  success: true;
  data: {
    payment_id: string;
    payment_method: string;
    
    // Se PIX:
    pix?: {
      qr_code: string;
      copy_paste: string;
      expires_at: string;
    };
    
    // Se cartão:
    card?: {
      status: 'approved' | 'rejected';
      message: string;
    };
  };
}
```

#### GET /api/orders/my-orders

**Descrição:** Lista pedidos do usuário autenticado

**Query Params:**
- status?: string
- limit?: number (default: 10)
- offset?: number (default: 0)

**Response (200):**
```typescript
{
  success: true;
  data: {
    orders: Order[];
    total: number;
    limit: number;
    offset: number;
  };
}
```

#### GET /api/orders/:id

**Descrição:** Detalhes do pedido

**Response (200):**
```typescript
{
  success: true;
  data: {
    id: string;
    order_number: string;
    status: string;
    total: number;
    items: OrderItem[];
    payment: Payment;
    shipping_address: ShippingAddress;
    status_history: StatusHistory[];
    created_at: string;
  };
}
```

### Admin Endpoints

#### GET /api/admin/orders

**Descrição:** Lista todos os pedidos (admin)

**Query Params:**
- status?: string
- customer_email?: string
- date_from?: string
- date_to?: string
- limit?: number
- offset?: number

#### PUT /api/admin/orders/:id/status

**Descrição:** Atualiza status do pedido (admin)

**Request:**
```typescript
{
  status: OrderStatus;
  notes?: string;
}
```

#### GET /api/admin/orders/stats

**Descrição:** Estatísticas de vendas (admin)

**Response (200):**
```typescript
{
  success: true;
  data: {
    total_orders: number;
    total_revenue: number;
    orders_by_status: Record<string, number>;
    revenue_by_month: Array<{month: string; revenue: number}>;
  };
}
```

### Webhook Endpoint

#### POST /webhooks/asaas

**Descrição:** Recebe notificações do Asaas

**Headers:**
- asaas-access-token: string (para validação)

**Request:**
```typescript
{
  event: string;
  payment: {
    id: string;
    status: string;
    value: number;
    // ... outros campos
  };
}
```

**Response (200):**
```typescript
{
  success: true;
  message: "Webhook processed";
}
```



## Validation Schemas (Zod)

```typescript
// Pedido
export const CreateOrderSchema = z.object({
  items: z.array(z.object({
    product_id: z.string().uuid(),
    quantity: z.number().int().positive(),
  })).min(1),
  
  shipping_address: z.object({
    recipient_name: z.string().min(3).max(100),
    street: z.string().min(3).max(200),
    number: z.string().min(1).max(20),
    complement: z.string().max(100).optional(),
    neighborhood: z.string().min(2).max(100),
    city: z.string().min(2).max(100),
    state: z.string().length(2),
    postal_code: z.string().regex(/^\d{5}-?\d{3}$/),
    phone: z.string().regex(/^\+?[1-9]\d{1,14}$/),
  }),
  
  customer_cpf: z.string().regex(/^\d{11}$/).optional(),
  notes: z.string().max(500).optional(),
});

// Pagamento PIX
export const CreatePixPaymentSchema = z.object({
  payment_method: z.literal('pix'),
});

// Pagamento Cartão
export const CreateCreditCardPaymentSchema = z.object({
  payment_method: z.literal('credit_card'),
  card: z.object({
    number: z.string().regex(/^\d{13,19}$/),
    holder_name: z.string().min(3).max(100),
    expiry_month: z.string().regex(/^(0[1-9]|1[0-2])$/),
    expiry_year: z.string().regex(/^\d{4}$/),
    ccv: z.string().regex(/^\d{3,4}$/),
  }),
  installments: z.number().int().min(1).max(21).optional(), // ⭐ Até 21x para Visa/Master
  remote_ip: z.string().ip(), // ⭐ OBRIGATÓRIO para cartão
});

// Atualização de status
export const UpdateOrderStatusSchema = z.object({
  status: z.enum(['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled']),
  notes: z.string().max(500).optional(),
});
```

## Detailed Flows

### Fluxo 1: Criação de Pedido e Pagamento PIX

```
1. Cliente → POST /api/orders
   ├─ Validar produtos existem
   ├─ Calcular total
   ├─ Criar order (status: pending)
   ├─ Criar order_items
   └─ Criar shipping_address

2. Cliente → POST /api/orders/:id/payment (method: pix)
   ├─ Buscar/criar customer no Asaas (cpfCnpj, postalCode, mobilePhone)
   ├─ Calcular array de splits (afiliados + gestores)
   ├─ Criar payment no Asaas COM splits configurados ⭐
   ├─ Obter QR Code
   ├─ Salvar payment local
   └─ Retornar QR Code para cliente

3. Cliente paga via PIX

4. Asaas → POST /webhooks/asaas (event: PAYMENT_CONFIRMED)
   ├─ Validar authToken (header: asaas-access-token) ⭐
   ├─ Verificar idempotência (asaas_event_id) ⭐
   ├─ Registrar webhook_log
   ├─ Atualizar payment (status: confirmed)
   ├─ Atualizar order (status: paid)
   ├─ Reduzir estoque
   └─ Registrar status_history
   
   ⭐ Split é executado AUTOMATICAMENTE pelo Asaas

5. Sistema → Notificar cliente (email/SMS)
```

### Fluxo 2: Criação de Pedido e Pagamento Cartão

```
1. Cliente → POST /api/orders
   (mesmo fluxo PIX)

2. Cliente → POST /api/orders/:id/payment (method: credit_card)
   ├─ Validar remoteIp está presente ⭐ OBRIGATÓRIO
   ├─ Buscar/criar customer no Asaas (cpfCnpj, postalCode, mobilePhone)
   ├─ Calcular array de splits (afiliados + gestores)
   ├─ Criar payment no Asaas COM splits + remoteIp ⭐
   ├─ Asaas processa cartão (síncrono)
   ├─ Se aprovado:
   │  ├─ Salvar payment (status: confirmed)
   │  ├─ Atualizar order (status: paid)
   │  └─ Reduzir estoque
   └─ Se rejeitado:
      └─ Retornar erro
   
   ⭐ Split é executado AUTOMATICAMENTE pelo Asaas

3. Sistema → Notificar cliente
```

### Fluxo 3: Processamento de Webhook

```
1. Asaas → POST /webhooks/asaas
   ├─ Headers: asaas-access-token (authToken configurado)
   └─ Body: {id, event, dateCreated, payment}

2. WebhookHandler
   ├─ Validar authToken ⭐
   ├─ Verificar idempotência (asaas_event_id UNIQUE) ⭐
   ├─ Registrar em webhook_logs
   └─ Processar evento de forma assíncrona

3. Se PAYMENT_CONFIRMED:
   ├─ Buscar payment por asaas_payment_id
   ├─ Atualizar payment.status = 'confirmed'
   ├─ Atualizar order.status = 'paid'
   ├─ Reduzir estoque (inventory_logs)
   └─ Registrar em order_status_history
   
   ⭐ Split já foi configurado na criação - executado automaticamente

4. Se PAYMENT_RECEIVED:
   ├─ Atualizar payment.status = 'received'
   ├─ Registrar paid_at
   └─ Registrar em order_status_history

5. Se PAYMENT_OVERDUE:
   ├─ Atualizar payment.status = 'overdue'
   ├─ Notificar admin
   └─ Registrar em order_status_history

6. Marcar webhook como processado
```

### Fluxo 4: Configuração de Split (NA CRIAÇÃO)

**⚠️ IMPORTANTE:** Split é configurado NA CRIAÇÃO da cobrança, não depois!

```
1. Ao criar cobrança (PIX ou Cartão):
   
   ├─ Calcular array de splits:
   │  ├─ Se houver affiliate_n1: 15% do valor líquido
   │  ├─ Se houver affiliate_n2: 3% do valor líquido
   │  ├─ Se houver affiliate_n3: 2% do valor líquido
   │  ├─ Renum: 5% do valor líquido (sempre)
   │  └─ JB: 5% do valor líquido (sempre)
   │
   ├─ Enviar array splits na criação:
   │  POST /v3/payments
   │  {
   │    customer: "cus_123",
   │    billingType: "PIX",
   │    value: 3290.00,
   │    splits: [
   │      { walletId: "wal_n1", percentualValue: 15 },
   │      { walletId: "wal_renum", percentualValue: 5 },
   │      { walletId: "wal_jb", percentualValue: 5 }
   │    ]
   │  }
   │
   └─ Asaas executa split AUTOMATICAMENTE quando pagamento confirmado
      ├─ Calcula valores sobre valor líquido (após taxas)
      ├─ Credita cada wallet automaticamente
      └─ Fábrica recebe o restante (70%) automaticamente
```

**Nota:** Não precisa de "preparação" ou "execução" manual. O Asaas faz tudo automaticamente.

## Security Considerations

### Webhook Security

**⚠️ CRÍTICO:** Implementar validação de authToken e idempotência

1. **Validação de authToken:**
```typescript
function validateWebhookToken(receivedToken: string): boolean {
  const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN;
  return receivedToken === expectedToken;
}

// Middleware
app.post('/webhooks/asaas', (req, res, next) => {
  const token = req.headers['asaas-access-token'];
  if (!validateWebhookToken(token)) {
    return res.status(401).json({ error: 'Invalid webhook token' });
  }
  next();
});
```

2. **Idempotência (CRÍTICO):**
```typescript
async function processWebhookWithIdempotency(eventId: string, payload: any): Promise<void> {
  // Tentar inserir evento
  try {
    await supabase
      .from('asaas_webhook_logs')
      .insert({
        asaas_event_id: eventId,  // UNIQUE constraint
        event_type: payload.event,
        payload: payload,
        token_valid: true,
        processed: false
      });
  } catch (error) {
    // Se já existe (unique violation), ignorar
    if (error.code === '23505') {
      return { success: true, message: 'Event already processed' };
    }
    throw error;
  }
  
  // Processar evento...
}
```

3. **Filtro de IPs (Opcional):**
```typescript
const ASAAS_IPS = [
  '52.67.12.206',
  '18.230.8.159',
  '54.94.136.112',
  '54.94.183.101'
];

function isAsaasIP(ip: string): boolean {
  return ASAAS_IPS.includes(ip);
}
```

### Payment Security

1. **Dados de Cartão:**
   - NUNCA armazenar número completo do cartão
   - Apenas últimos 4 dígitos
   - Enviar dados diretamente para Asaas (PCI compliance)

2. **Validação de Valores:**
   - Sempre recalcular total no backend
   - Nunca confiar em valores do frontend
   - Validar que produtos não mudaram de preço

### RLS Policies

```sql
-- Orders: usuário vê apenas próprios pedidos
CREATE POLICY "Users view own orders"
  ON orders FOR SELECT
  USING (auth.uid() = customer_id AND deleted_at IS NULL);

-- Admins veem todos
CREATE POLICY "Admins view all orders"
  ON orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
      AND deleted_at IS NULL
    )
  );

-- Payments: apenas via service role
CREATE POLICY "Service role manages payments"
  ON payments FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');
```

## Performance Optimizations

1. **Índices Críticos:**
   - orders(customer_id, status, created_at)
   - payments(asaas_payment_id)
   - asaas_webhook_logs(asaas_event_id, processed)

2. **Queries Otimizadas:**
   - Usar JOINs para incluir relacionamentos
   - Limitar campos retornados
   - Paginar listagens

3. **Caching:**
   - Cachear dados de produtos durante checkout
   - Cachear wallet_ids de configuração

4. **Async Processing:**
   - Processar webhooks de forma assíncrona
   - Não bloquear resposta do webhook

## Error Handling

### Asaas API Errors

```typescript
class AsaasError extends Error {
  constructor(
    public statusCode: number,
    public asaasCode: string,
    message: string
  ) {
    super(message);
  }
}

async function handleAsaasError(error: any): Promise<never> {
  logger.error('AsaasService', 'API Error', error);
  
  if (error.response?.status === 400) {
    throw new AsaasError(400, 'INVALID_DATA', 'Dados inválidos');
  }
  
  if (error.response?.status === 401) {
    throw new AsaasError(401, 'UNAUTHORIZED', 'Credenciais inválidas');
  }
  
  if (error.response?.status === 429) {
    throw new AsaasError(429, 'RATE_LIMIT', 'Limite de requisições excedido');
  }
  
  throw new AsaasError(500, 'UNKNOWN', 'Erro ao processar pagamento');
}
```

### Retry Strategy

```typescript
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      
      const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries exceeded');
}
```

## Testing Strategy

### Unit Tests
- OrderService methods
- AsaasService API calls (mocked)
- WebhookService event processing
- SplitService calculations
- Validation schemas

### Integration Tests
- Fluxo completo de criação de pedido
- Processamento de webhooks
- Atualização de estoque
- Preparação de splits

### E2E Tests
- Criar pedido → Gerar PIX → Simular webhook → Verificar status
- Criar pedido → Pagar cartão → Verificar aprovação
- Cancelar pedido → Verificar devolução de estoque

