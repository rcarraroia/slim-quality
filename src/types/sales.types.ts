/**
 * Tipos TypeScript para Sistema de Vendas
 * Sprint 3: Sistema de Vendas
 * 
 * Baseado na documentação oficial do Asaas
 */

// ============================================
// ENUMS
// ============================================

export enum OrderStatus {
  PENDING = 'pending',
  PAID = 'paid',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

export enum PaymentMethod {
  PIX = 'pix',
  CREDIT_CARD = 'credit_card',
}

export enum PaymentStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  RECEIVED = 'received',
  OVERDUE = 'overdue',
  REFUNDED = 'refunded',
  CANCELLED = 'cancelled',
  AUTHORIZED = 'authorized',
}

export enum AsaasTransactionType {
  CREATE_CUSTOMER = 'create_customer',
  CREATE_PAYMENT = 'create_payment',
  GET_PAYMENT = 'get_payment',
  WEBHOOK = 'webhook',
}

export enum SplitStatus {
  PENDING = 'pending',
  AWAITING_CREDIT = 'awaiting_credit',
  DONE = 'done',
  CANCELLED = 'cancelled',
  REFUSED = 'refused',
  REFUNDED = 'refunded',
}

// ============================================
// INTERFACES - PEDIDOS
// ============================================

export interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  customer_cpf?: string;
  subtotal_cents: number;
  shipping_cents: number;
  discount_cents: number;
  total_cents: number;
  status: OrderStatus;
  asaas_customer_id?: string;
  remote_ip?: string;
  referral_code?: string;
  affiliate_n1_id?: string;
  affiliate_n2_id?: string;
  affiliate_n3_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  product_sku: string;
  quantity: number;
  unit_price_cents: number;
  total_price_cents: number;
  created_at: string;
}

export interface OrderStatusHistory {
  id: string;
  order_id: string;
  from_status?: string;
  to_status: string;
  changed_by?: string;
  notes?: string;
  created_at: string;
}

export interface ShippingAddress {
  id: string;
  order_id: string;
  recipient_name: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  postal_code: string;
  phone: string;
  created_at: string;
}

// ============================================
// INTERFACES - PAGAMENTOS
// ============================================

export interface Payment {
  id: string;
  order_id: string;
  payment_method: PaymentMethod;
  amount_cents: number;
  status: PaymentStatus;
  asaas_payment_id?: string;
  asaas_charge_id?: string;
  pix_qr_code?: string;
  pix_copy_paste?: string;
  pix_expires_at?: string;
  card_brand?: string;
  card_last_digits?: string;
  installments: number;
  paid_at?: string;
  confirmed_at?: string;
  created_at: string;
  updated_at: string;
}

// ============================================
// INTERFACES - INTEGRAÇÃO ASAAS
// ============================================

export interface AsaasTransaction {
  id: string;
  order_id?: string;
  payment_id?: string;
  transaction_type: AsaasTransactionType;
  request_payload?: any;
  response_payload?: any;
  success: boolean;
  error_message?: string;
  http_status?: number;
  asaas_customer_id?: string;
  asaas_payment_id?: string;
  created_at: string;
}

export interface AsaasWebhookLog {
  id: string;
  asaas_event_id: string;
  event_type: string;
  payload: any;
  token_valid: boolean;
  processed: boolean;
  processed_at?: string;
  error_message?: string;
  asaas_payment_id?: string;
  payment_id?: string;
  order_id?: string;
  created_at: string;
}

export interface AsaasSplit {
  id: string;
  payment_id: string;
  order_id: string;
  split_config: any;
  total_amount_cents: number;
  net_amount_cents: number;
  status?: SplitStatus;
  created_at: string;
  updated_at: string;
}

// ============================================
// INTERFACES - DETALHES COMPLETOS
// ============================================

export interface OrderDetail extends Order {
  items: OrderItem[];
  payment?: Payment;
  shipping_address?: ShippingAddress;
  status_history: OrderStatusHistory[];
}

export interface OrderList {
  orders: Order[];
  total: number;
  limit: number;
  offset: number;
}

// ============================================
// INTERFACES - ASAAS API
// ============================================

/**
 * Configuração de Split para Asaas
 * Baseado na documentação oficial
 */
export interface SplitConfig {
  walletId: string;
  fixedValue?: number;
  percentualValue?: number;
  totalFixedValue?: number; // Para parcelamentos
}

/**
 * Dados de Customer para Asaas
 * ⚠️ Usar campos corretos: cpfCnpj, postalCode, mobilePhone
 */
export interface AsaasCustomerData {
  name: string;
  cpfCnpj: string; // ⚠️ Não é customer_cpf
  email?: string;
  phone?: string;
  mobilePhone?: string; // ⚠️ Campo adicional
  address?: string;
  addressNumber?: string;
  complement?: string;
  province?: string;
  postalCode?: string; // ⚠️ Não é postal_code
  externalReference?: string;
  notificationDisabled?: boolean;
  additionalEmails?: string;
  observations?: string;
}

/**
 * Dados para criar cobrança PIX no Asaas
 */
export interface AsaasPixPaymentData {
  customer: string; // ID do customer no Asaas
  billingType: 'PIX';
  value: number;
  dueDate: string; // YYYY-MM-DD
  description?: string;
  externalReference?: string;
  splits?: SplitConfig[]; // ⚠️ Configurar split NA CRIAÇÃO
}

/**
 * Dados para criar cobrança com Cartão no Asaas
 * ⚠️ remoteIp é OBRIGATÓRIO
 */
export interface AsaasCreditCardPaymentData {
  customer: string;
  billingType: 'CREDIT_CARD';
  value: number;
  dueDate: string;
  description?: string;
  externalReference?: string;
  creditCard: {
    holderName: string;
    number: string;
    expiryMonth: string;
    expiryYear: string;
    ccv: string;
  };
  creditCardHolderInfo: {
    name: string;
    email: string;
    cpfCnpj: string;
    postalCode: string;
    addressNumber: string;
    addressComplement?: string;
    phone: string;
    mobilePhone?: string;
  };
  remoteIp: string; // ⚠️ OBRIGATÓRIO
  installmentCount?: number;
  splits?: SplitConfig[]; // ⚠️ Configurar split NA CRIAÇÃO
}

/**
 * Resposta de cobrança PIX do Asaas
 */
export interface AsaasPixPaymentResponse {
  id: string;
  customer: string;
  billingType: string;
  value: number;
  status: string;
  dueDate: string;
  invoiceUrl: string;
  // QR Code obtido via GET /payments/{id}/pixQrCode
}

/**
 * Resposta de QR Code PIX do Asaas
 */
export interface AsaasPixQrCodeResponse {
  encodedImage: string; // Base64 do QR Code
  payload: string; // Copia e cola
  expirationDate: string;
}

/**
 * Resposta de cobrança com Cartão do Asaas
 */
export interface AsaasCreditCardPaymentResponse {
  id: string;
  customer: string;
  billingType: string;
  value: number;
  status: string; // CONFIRMED ou PENDING
  dueDate: string;
  invoiceUrl: string;
  creditCard?: {
    creditCardNumber: string; // Últimos 4 dígitos
    creditCardBrand: string;
  };
}

/**
 * Payload de Webhook do Asaas
 */
export interface AsaasWebhookPayload {
  id: string; // ⚠️ ID do evento (usar para idempotência)
  event: string; // PAYMENT_CONFIRMED, PAYMENT_RECEIVED, etc
  dateCreated: string;
  payment: {
    object: string;
    id: string;
    dateCreated: string;
    customer: string;
    value: number;
    netValue: number;
    status: string;
    billingType: string;
    // ... outros campos
  };
}

// ============================================
// TIPOS TYPESCRIPT
// ============================================

export type CreatePaymentInput = z.infer<typeof CreatePaymentSchema>;
export type CreatePixPaymentInput = z.infer<typeof CreatePixPaymentSchema>;
export type CreateCreditCardPaymentInput = z.infer<typeof CreateCreditCardPaymentSchema>;
