// Subscription Types - Isolated Domain Types
// All types related to subscription payment processing
// Based on Comademig architecture patterns

// ============================================
// Core Subscription Types
// ============================================

export interface SubscriptionOrder {
  id: string;
  userId: string;
  asaasPaymentId: string;
  asaasSubscriptionId?: string;
  status: SubscriptionStatus;
  amount: number;
  orderItems: OrderItem[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export enum SubscriptionStatus {
  PENDING = 'pending',
  PAYMENT_PROCESSING = 'payment_processing',
  PAYMENT_CONFIRMED = 'payment_confirmed',
  SUBSCRIPTION_CREATED = 'subscription_created',
  ACTIVE = 'active',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

// ============================================
// Order Items (Critical for AI Detection)
// ============================================

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  value: number;
  description?: string;
  metadata?: {
    hasAI: boolean;
    aiFeatures: string[];
  };
}

// ============================================
// Payment First Flow Types (Comademig Pattern)
// ============================================

export interface SubscriptionRegistrationData {
  // User data
  userData: {
    name: string;
    email: string;
    phone: string;
    cpf: string;
  };
  
  // Plan data
  planData: {
    id: string;
    name: string;
    value: number;
    cycle: 'MONTHLY' | 'YEARLY';
  };
  
  // Payment data
  paymentData: {
    billingType: 'CREDIT_CARD' | 'PIX';
    creditCard?: CreditCardData;
    creditCardHolderInfo?: CardHolderInfo;
  };
  
  // Order Items (CRITICAL - cannot be empty)
  orderItems: OrderItem[];
  
  // Affiliate data (if any)
  affiliateData?: {
    referralCode: string;
    affiliateId: string;
  };
}

export interface CreditCardData {
  holderName: string;
  number: string;
  expiryMonth: string;
  expiryYear: string;
  ccv: string;
}

export interface CardHolderInfo {
  name: string;
  email: string;
  cpfCnpj: string;
  postalCode: string;
  addressNumber: string;
  addressComplement?: string;
  phone: string;
  mobilePhone: string;
}

// ============================================
// Flow State Management (Comademig Sequence)
// ============================================

export enum FlowState {
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

// ============================================
// Service Results
// ============================================

export interface RegistrationResult {
  success: boolean;
  flowId: string;
  finalState: FlowState;
  subscriptionId?: string;
  paymentId?: string;
  error?: string;
  duration: number;
}

export interface PaymentStatus {
  id: string;
  status: 'PENDING' | 'CONFIRMED' | 'FAILED';
  confirmedAt?: Date;
  failureReason?: string;
}

export interface PollingResult {
  success: boolean;
  status: 'CONFIRMED' | 'PENDING' | 'FAILED' | 'TIMEOUT';
  attempts: number;
  duration: number;
  paymentData?: any;
  error?: string;
}

// ============================================
// Webhook Types
// ============================================

export interface WebhookEvent {
  id: string;
  asaasEventId: string;
  eventType: string;
  processedAt: Date;
  payload: any;
}

export interface WebhookResult {
  success: boolean;
  eventId: string;
  eventType: string;
  processed: boolean;
  actions: WebhookAction[];
  error?: string;
}

export interface WebhookAction {
  type: 'PAYMENT_CONFIRMED' | 'SUBSCRIPTION_CREATED' | 'SPLIT_PROCESSED' | 'USER_ACTIVATED';
  entityId: string;
  result: 'SUCCESS' | 'FAILED' | 'SKIPPED';
  details?: any;
}

// ============================================
// Asaas API Types (Based on Comademig)
// ============================================

export interface AsaasCustomerPayload {
  name: string;
  email: string;
  phone: string;
  mobilePhone: string;
  cpfCnpj: string;
  postalCode?: string;
  address?: string;
  addressNumber?: string;
  complement?: string;
  province?: string;
  city?: string;
  state?: string;
}

export interface AsaasPaymentPayload {
  customer: string; // Customer ID created previously
  billingType: 'CREDIT_CARD' | 'PIX';
  value: number;
  dueDate: string; // Today's date for immediate processing
  description: string;
  orderItems: AsaasOrderItem[]; // CRITICAL: cannot be empty
  creditCard?: {
    holderName: string;
    number: string;
    expiryMonth: string;
    expiryYear: string;
    ccv: string;
  };
  creditCardHolderInfo?: {
    name: string;
    email: string;
    cpfCnpj: string;
    postalCode: string;
    addressNumber: string;
    addressComplement?: string;
    phone: string;
    mobilePhone: string;
  };
}

export interface AsaasSubscriptionPayload {
  customer: string; // Customer ID
  billingType: 'CREDIT_CARD';
  value: number;
  nextDueDate: string; // Next billing date (next month)
  cycle: 'MONTHLY' | 'YEARLY';
  description: string;
  creditCardToken?: string; // Token from first payment
  // DO NOT include creditCard or creditCardHolderInfo here
}

export interface AsaasOrderItem {
  id: string;
  description: string;
  value: number;
  quantity: number;
}

// ============================================
// Validation Types
// ============================================

export interface ValidationResult {
  valid: boolean;
  error?: string;
  details?: any;
}

// ============================================
// Logging Types
// ============================================

export interface LogEntry {
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

// ============================================
// PaymentFirst Flow Types (New Implementation)
// ============================================

export interface SubscriptionOrderData {
  customer: {
    name: string;
    email: string;
    phone: string;
    cpf: string;
    address?: {
      postalCode: string;
      street: string;
      number: string;
      complement?: string;
      neighborhood: string;
      city: string;
      state: string;
    };
  };
  product: {
    id: string;
    name: string;
  };
  monthlyValue: number;
  payment: {
    billingType: 'CREDIT_CARD';
    creditCard: CreditCardData;
    creditCardHolderInfo: CardHolderInfo;
  };
  orderItems: OrderItem[]; // CRITICAL - cannot be empty
  metadata?: {
    remoteIp?: string;
    referralCode?: string;
    affiliateId?: string;
  };
}

export interface PaymentFirstResult {
  success: boolean;
  asaasCustomerId?: string;
  asaasPaymentId?: string;
  asaasSubscriptionId?: string;
  nextDueDate?: string;
  correlationId?: string;
  error?: string;
}

export interface AsaasCustomerData {
  id: string;
  name: string;
  email: string;
  phone: string;
  cpfCnpj: string;
  // ... outros campos retornados pelo Asaas
}

export interface AsaasPaymentData {
  id: string;
  status: string;
  value: number;
  dueDate: string;
  creditCardToken?: string;
  // ... outros campos retornados pelo Asaas
}

// ============================================
// Configuration Types
// ============================================

export interface SubscriptionConfig {
  asaas: {
    apiKey: string;
    baseUrl: string;
    webhookToken: string;
  };
  supabase: {
    url: string;
    anonKey: string;
  };
  polling: {
    timeoutMs: number; // 15000 (15 seconds)
    intervalMs: number; // 1000 (1 second)
    maxAttempts: number; // 15
  };
  retry: {
    maxAttempts: number;
    baseDelayMs: number;
    maxDelayMs: number;
    backoffMultiplier: number;
  };
}