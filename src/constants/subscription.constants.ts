// Subscription Constants - Isolated Domain Constants
// All constants related to subscription payment processing
// Based on Comademig architecture patterns

// ============================================
// API Endpoints (Isolated from existing)
// ============================================

export const SUBSCRIPTION_API_ROUTES = {
  // Subscription-specific routes (isolated)
  CREATE_PAYMENT: '/api/subscriptions/create-payment',
  WEBHOOK: '/api/subscriptions/webhook',
  STATUS: '/api/subscriptions/status',
  CANCEL: '/api/subscriptions/cancel',
  
  // Asaas API endpoints (Payment First pattern)
  ASAAS_CUSTOMERS: '/customers',
  ASAAS_PAYMENTS: '/payments', // For first payment (NOT /subscriptions)
  ASAAS_SUBSCRIPTIONS: '/subscriptions', // Only for recurring after confirmation
  ASAAS_WEBHOOKS: '/webhooks'
} as const;

// ============================================
// Flow States (Comademig Sequence)
// ============================================

export const FLOW_STATES = {
  INITIATED: 'initiated',
  CUSTOMER_CREATED: 'customer_created',
  PAYMENT_CREATED: 'payment_created',
  PAYMENT_PROCESSING: 'payment_processing',
  PAYMENT_CONFIRMED: 'payment_confirmed',
  ACCOUNT_CREATED: 'account_created',
  PROFILE_CREATED: 'profile_created',
  SUBSCRIPTION_CREATED: 'subscription_created',
  USER_ACTIVATED: 'user_activated',
  COMPLETED: 'completed',
  FAILED: 'failed',
  ROLLED_BACK: 'rolled_back'
} as const;

// ============================================
// Subscription Status
// ============================================

export const SUBSCRIPTION_STATUS = {
  PENDING: 'pending',
  PAYMENT_PROCESSING: 'payment_processing',
  PAYMENT_CONFIRMED: 'payment_confirmed',
  SUBSCRIPTION_CREATED: 'subscription_created',
  ACTIVE: 'active',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
} as const;

// ============================================
// Payment Status (Asaas)
// ============================================

export const PAYMENT_STATUS = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  RECEIVED: 'RECEIVED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED'
} as const;

// ============================================
// Webhook Event Types
// ============================================

export const WEBHOOK_EVENTS = {
  PAYMENT_CREATED: 'PAYMENT_CREATED',
  PAYMENT_CONFIRMED: 'PAYMENT_CONFIRMED',
  PAYMENT_RECEIVED: 'PAYMENT_RECEIVED',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  SUBSCRIPTION_CREATED: 'SUBSCRIPTION_CREATED',
  SUBSCRIPTION_UPDATED: 'SUBSCRIPTION_UPDATED',
  SUBSCRIPTION_CANCELLED: 'SUBSCRIPTION_CANCELLED'
} as const;

// ============================================
// Polling Configuration (Comademig Pattern)
// ============================================

export const POLLING_CONFIG = {
  DEFAULT_TIMEOUT: 15000, // 15 seconds
  DEFAULT_INTERVAL: 1000, // 1 second
  MAX_ATTEMPTS: 15,
  MIN_INTERVAL: 500, // Minimum 500ms
  MAX_TIMEOUT: 30000 // Maximum 30 seconds
} as const;

// ============================================
// Retry Configuration (Exponential Backoff)
// ============================================

export const RETRY_CONFIG = {
  MAX_ATTEMPTS: 3,
  BASE_DELAY: 1000, // 1 second
  MAX_DELAY: 10000, // 10 seconds
  BACKOFF_MULTIPLIER: 2,
  JITTER: true // Add randomness to prevent thundering herd
} as const;

// ============================================
// Validation Rules
// ============================================

export const VALIDATION_RULES = {
  ORDER_ITEMS: {
    MIN_ITEMS: 1, // Cannot be empty
    MAX_ITEMS: 50,
    REQUIRED_FIELDS: ['id', 'name', 'quantity', 'value']
  },
  
  CUSTOMER_DATA: {
    NAME_MIN_LENGTH: 2,
    NAME_MAX_LENGTH: 100,
    CPF_LENGTH: 11,
    PHONE_MIN_LENGTH: 10,
    EMAIL_MAX_LENGTH: 255
  },
  
  PAYMENT_DATA: {
    MIN_VALUE: 0.01,
    MAX_VALUE: 999999.99,
    SUPPORTED_BILLING_TYPES: ['CREDIT_CARD', 'PIX']
  }
} as const;

// ============================================
// Error Codes (Subscription-specific)
// ============================================

export const SUBSCRIPTION_ERROR_CODES = {
  // Validation Errors
  INVALID_ORDER_ITEMS: 'SUBSCRIPTION_INVALID_ORDER_ITEMS',
  INVALID_CUSTOMER_DATA: 'SUBSCRIPTION_INVALID_CUSTOMER_DATA',
  INVALID_PAYMENT_DATA: 'SUBSCRIPTION_INVALID_PAYMENT_DATA',
  
  // Flow Errors
  FLOW_STATE_INVALID: 'SUBSCRIPTION_FLOW_STATE_INVALID',
  FLOW_TIMEOUT: 'SUBSCRIPTION_FLOW_TIMEOUT',
  FLOW_ROLLBACK_FAILED: 'SUBSCRIPTION_FLOW_ROLLBACK_FAILED',
  
  // Polling Errors
  POLLING_TIMEOUT: 'SUBSCRIPTION_POLLING_TIMEOUT',
  POLLING_FAILED: 'SUBSCRIPTION_POLLING_FAILED',
  POLLING_MAX_ATTEMPTS: 'SUBSCRIPTION_POLLING_MAX_ATTEMPTS',
  
  // Webhook Errors
  WEBHOOK_INVALID_SIGNATURE: 'SUBSCRIPTION_WEBHOOK_INVALID_SIGNATURE',
  WEBHOOK_DUPLICATE_EVENT: 'SUBSCRIPTION_WEBHOOK_DUPLICATE_EVENT',
  WEBHOOK_PROCESSING_FAILED: 'SUBSCRIPTION_WEBHOOK_PROCESSING_FAILED',
  
  // Asaas API Errors
  ASAAS_API_ERROR: 'SUBSCRIPTION_ASAAS_API_ERROR',
  ASAAS_CUSTOMER_CREATION_FAILED: 'SUBSCRIPTION_ASAAS_CUSTOMER_CREATION_FAILED',
  ASAAS_PAYMENT_CREATION_FAILED: 'SUBSCRIPTION_ASAAS_PAYMENT_CREATION_FAILED',
  ASAAS_SUBSCRIPTION_CREATION_FAILED: 'SUBSCRIPTION_ASAAS_SUBSCRIPTION_CREATION_FAILED'
} as const;

// ============================================
// Log Levels and Categories
// ============================================

export const LOG_LEVELS = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR'
} as const;

export const LOG_CATEGORIES = {
  ORCHESTRATOR: 'PaymentOrchestrator',
  POLLING: 'PollingService',
  WEBHOOK: 'WebhookHandler',
  ADAPTER: 'DataAdapter',
  VALIDATION: 'Validation',
  ASAAS_API: 'AsaasAPI'
} as const;

// ============================================
// Database Table Names (Isolated)
// ============================================

export const DB_TABLES = {
  SUBSCRIPTION_ORDERS: 'subscription_orders',
  SUBSCRIPTION_WEBHOOK_EVENTS: 'subscription_webhook_events',
  SUBSCRIPTION_POLLING_LOGS: 'subscription_polling_logs'
} as const;

// ============================================
// Edge Function Names (Comademig Pattern)
// ============================================

export const EDGE_FUNCTIONS = {
  CREATE_CUSTOMER: 'asaas-create-customer',
  CREATE_PAYMENT: 'asaas-create-payment',
  POLL_PAYMENT: 'asaas-poll-payment',
  CREATE_SUBSCRIPTION: 'asaas-create-subscription',
  WEBHOOK_HANDLER: 'asaas-webhook',
  CREATE_ACCOUNT: 'supabase-create-account',
  CREATE_PROFILE: 'supabase-create-profile'
} as const;

// ============================================
// HTTP Status Codes
// ============================================

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504
} as const;

// ============================================
// Content Types
// ============================================

export const CONTENT_TYPES = {
  JSON: 'application/json',
  FORM_URLENCODED: 'application/x-www-form-urlencoded',
  TEXT_PLAIN: 'text/plain'
} as const;

// ============================================
// Headers
// ============================================

export const HEADERS = {
  AUTHORIZATION: 'Authorization',
  CONTENT_TYPE: 'Content-Type',
  CORRELATION_ID: 'X-Correlation-ID',
  WEBHOOK_SIGNATURE: 'asaas-access-token',
  USER_AGENT: 'User-Agent'
} as const;

// ============================================
// Timeouts (milliseconds)
// ============================================

export const TIMEOUTS = {
  API_REQUEST: 30000, // 30 seconds
  WEBHOOK_PROCESSING: 30000, // 30 seconds
  DATABASE_QUERY: 10000, // 10 seconds
  EDGE_FUNCTION: 60000 // 60 seconds
} as const;