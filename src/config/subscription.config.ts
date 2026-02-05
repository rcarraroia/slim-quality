// Subscription Configuration - Isolated Settings
// Configuration for subscription payment flow
// Based on Comademig architecture patterns

import { SubscriptionConfig } from '../types/subscription.types';

// Environment variables with fallbacks
const getEnvVar = (key: string, defaultValue?: string): string => {
  const value = process.env[key] || import.meta.env?.[key];
  if (!value && !defaultValue) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value || defaultValue!;
};

const getEnvNumber = (key: string, defaultValue: number): number => {
  const value = getEnvVar(key, defaultValue.toString());
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Invalid number for environment variable ${key}: ${value}`);
  }
  return parsed;
};

const getEnvBoolean = (key: string, defaultValue: boolean): boolean => {
  const value = getEnvVar(key, defaultValue.toString());
  return value.toLowerCase() === 'true';
};

// Subscription Configuration (Isolated from existing system)
export const subscriptionConfig: SubscriptionConfig = {
  asaas: {
    apiKey: getEnvVar('ASAAS_API_KEY'),
    baseUrl: getEnvVar('ASAAS_ENVIRONMENT') === 'production' 
      ? getEnvVar('ASAAS_API_URL_PRODUCTION', 'https://api.asaas.com/v3')
      : getEnvVar('ASAAS_API_URL_SANDBOX', 'https://api-sandbox.asaas.com/v3'),
    webhookToken: getEnvVar('SUBSCRIPTION_WEBHOOK_TOKEN', getEnvVar('ASAAS_WEBHOOK_TOKEN'))
  },
  
  supabase: {
    url: getEnvVar('VITE_SUPABASE_URL'),
    anonKey: getEnvVar('VITE_SUPABASE_ANON_KEY')
  },
  
  polling: {
    timeoutMs: getEnvNumber('SUBSCRIPTION_POLLING_TIMEOUT', 15000), // 15 seconds
    intervalMs: getEnvNumber('SUBSCRIPTION_POLLING_INTERVAL', 1000), // 1 second
    maxAttempts: getEnvNumber('SUBSCRIPTION_POLLING_MAX_ATTEMPTS', 15)
  },
  
  retry: {
    maxAttempts: getEnvNumber('SUBSCRIPTION_RETRY_MAX_ATTEMPTS', 3),
    baseDelayMs: getEnvNumber('SUBSCRIPTION_RETRY_BASE_DELAY', 1000),
    maxDelayMs: getEnvNumber('SUBSCRIPTION_RETRY_MAX_DELAY', 10000),
    backoffMultiplier: getEnvNumber('SUBSCRIPTION_RETRY_BACKOFF_MULTIPLIER', 2)
  }
};

// Feature Flags (Control and Rollback)
export const subscriptionFeatureFlags = {
  enabled: getEnvBoolean('SUBSCRIPTION_FLOW_ENABLED', true),
  fallbackEnabled: getEnvBoolean('SUBSCRIPTION_FALLBACK_ENABLED', true),
  debugLogs: getEnvBoolean('SUBSCRIPTION_DEBUG_LOGS', false),
  metricsEnabled: getEnvBoolean('SUBSCRIPTION_METRICS_ENABLED', true),
  alertsEnabled: getEnvBoolean('SUBSCRIPTION_ALERTS_ENABLED', true)
};

// Database Configuration (Isolated)
export const subscriptionDbConfig = {
  schema: getEnvVar('SUBSCRIPTION_DB_SCHEMA', 'public'),
  tablePrefix: getEnvVar('SUBSCRIPTION_TABLE_PREFIX', 'subscription_'),
  tables: {
    orders: 'subscription_orders',
    webhookEvents: 'subscription_webhook_events',
    pollingLogs: 'subscription_polling_logs'
  }
};

// Performance Thresholds
export const subscriptionPerformance = {
  maxResponseTime: getEnvNumber('SUBSCRIPTION_MAX_RESPONSE_TIME', 2000),
  minSuccessRate: parseFloat(getEnvVar('SUBSCRIPTION_MIN_SUCCESS_RATE', '0.95')),
  maxErrorRate: parseFloat(getEnvVar('SUBSCRIPTION_MAX_ERROR_RATE', '0.05'))
};

// Webhook Configuration (Isolated)
export const subscriptionWebhookConfig = {
  token: getEnvVar('SUBSCRIPTION_WEBHOOK_TOKEN', getEnvVar('ASAAS_WEBHOOK_TOKEN')),
  url: getEnvVar('SUBSCRIPTION_WEBHOOK_URL', '/api/subscriptions/webhook'),
  timeout: getEnvNumber('SUBSCRIPTION_WEBHOOK_TIMEOUT', 30000)
};

// Validation
export const validateSubscriptionConfig = (): void => {
  // Validate critical configuration
  if (!subscriptionConfig.asaas.apiKey) {
    throw new Error('ASAAS_API_KEY is required for subscription flow');
  }
  
  if (!subscriptionConfig.asaas.webhookToken) {
    throw new Error('SUBSCRIPTION_WEBHOOK_TOKEN or ASAAS_WEBHOOK_TOKEN is required');
  }
  
  // Validate polling configuration
  if (subscriptionConfig.polling.timeoutMs < 1000) {
    throw new Error('SUBSCRIPTION_POLLING_TIMEOUT must be at least 1000ms');
  }
  
  if (subscriptionConfig.polling.intervalMs < 500) {
    throw new Error('SUBSCRIPTION_POLLING_INTERVAL must be at least 500ms');
  }
  
  // Validate retry configuration
  if (subscriptionConfig.retry.maxAttempts < 1) {
    throw new Error('SUBSCRIPTION_RETRY_MAX_ATTEMPTS must be at least 1');
  }
  
  console.log('✅ Subscription configuration validated successfully');
};

// Export default configuration
export default {
  ...subscriptionConfig,
  featureFlags: subscriptionFeatureFlags,
  database: subscriptionDbConfig,
  performance: subscriptionPerformance,
  webhook: subscriptionWebhookConfig,
  validate: validateSubscriptionConfig
};