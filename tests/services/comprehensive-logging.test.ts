/**
 * Property Test: Comprehensive Logging
 * 
 * Valida que o LoggerService implementa logging estruturado completo
 * conforme Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 17.1
 * 
 * Property 9: Comprehensive Structured Logging
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LoggerService, LogLevel, logger } from '../../src/services/subscriptions/LoggerService';

describe('Property Test: Comprehensive Logging', () => {
  let loggerService: LoggerService;
  let consoleSpy: any;

  beforeEach(() => {
    loggerService = LoggerService.getInstance();
    // Spy on console methods to capture logs
    consoleSpy = {
      debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
      info: vi.spyOn(console, 'info').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
      log: vi.spyOn(console, 'log').mockImplementation(() => {})
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Property 9.1: Correlation ID Consistency
   * Requirement 7.5: Correlation IDs para rastrear requisições
   */
  it('should maintain correlation ID consistency across all log entries', () => {
    const correlationId = loggerService.generateCorrelationId();
    
    // Test multiple log levels with same correlation ID
    loggerService.debug('TestService', 'Debug message', { correlationId });
    loggerService.info('TestService', 'Info message', { correlationId });
    loggerService.warn('TestService', 'Warn message', { correlationId });

    // Verify all logs have the same correlation ID
    expect(consoleSpy.debug).toHaveBeenCalledTimes(1);
    expect(consoleSpy.info).toHaveBeenCalledTimes(1);
    expect(consoleSpy.warn).toHaveBeenCalledTimes(1);

    const debugLog = JSON.parse(consoleSpy.debug.mock.calls[0][0]);
    const infoLog = JSON.parse(consoleSpy.info.mock.calls[0][0]);
    const warnLog = JSON.parse(consoleSpy.warn.mock.calls[0][0]);

    expect(debugLog.context.correlationId).toBe(correlationId);
    expect(infoLog.context.correlationId).toBe(correlationId);
    expect(warnLog.context.correlationId).toBe(correlationId);
  });

  /**
   * Property 9.2: Structured Log Format
   * Requirement 7.1: Logs estruturados com timestamp, nível e contexto
   */
  it('should produce structured logs with required fields', () => {
    const correlationId = loggerService.generateCorrelationId();
    const context = {
      correlationId,
      userId: 'user_123',
      paymentId: 'pay_456',
      metadata: { test: 'value' }
    };

    loggerService.info('TestService', 'Test message', context);

    expect(consoleSpy.info).toHaveBeenCalledTimes(1);
    const logEntry = JSON.parse(consoleSpy.info.mock.calls[0][0]);

    // Verify required structure
    expect(logEntry).toHaveProperty('timestamp');
    expect(logEntry).toHaveProperty('level', LogLevel.INFO);
    expect(logEntry).toHaveProperty('message', 'Test message');
    expect(logEntry).toHaveProperty('context');
    
    // Verify context structure
    expect(logEntry.context).toHaveProperty('correlationId', correlationId);
    expect(logEntry.context).toHaveProperty('service', 'TestService');
    expect(logEntry.context).toHaveProperty('operation', 'general');
    expect(logEntry.context).toHaveProperty('userId', 'user_123');
    expect(logEntry.context).toHaveProperty('paymentId', 'pay_456');
    expect(logEntry.context).toHaveProperty('metadata');
    expect(logEntry.context.metadata).toEqual({ test: 'value' });

    // Verify timestamp format (ISO string)
    expect(new Date(logEntry.timestamp).toISOString()).toBe(logEntry.timestamp);
  });

  /**
   * Property 9.3: Log Level Appropriateness
   * Requirement 7.4: Níveis de log apropriados (DEBUG, INFO, WARN, ERROR)
   */
  it('should use appropriate log levels and console methods', () => {
    const correlationId = loggerService.generateCorrelationId();

    // Test all log levels
    loggerService.debug('TestService', 'Debug message', { correlationId });
    loggerService.info('TestService', 'Info message', { correlationId });
    loggerService.warn('TestService', 'Warn message', { correlationId });
    loggerService.error('TestService', 'Error message', new Error('Test error'), { correlationId });

    // Verify correct console methods were called
    expect(consoleSpy.debug).toHaveBeenCalledTimes(1);
    expect(consoleSpy.info).toHaveBeenCalledTimes(1);
    expect(consoleSpy.warn).toHaveBeenCalledTimes(1);
    expect(consoleSpy.error).toHaveBeenCalledTimes(1);

    // Verify log levels in entries
    const debugLog = JSON.parse(consoleSpy.debug.mock.calls[0][0]);
    const infoLog = JSON.parse(consoleSpy.info.mock.calls[0][0]);
    const warnLog = JSON.parse(consoleSpy.warn.mock.calls[0][0]);
    const errorLog = JSON.parse(consoleSpy.error.mock.calls[0][0]);

    expect(debugLog.level).toBe(LogLevel.DEBUG);
    expect(infoLog.level).toBe(LogLevel.INFO);
    expect(warnLog.level).toBe(LogLevel.WARN);
    expect(errorLog.level).toBe(LogLevel.ERROR);
  });

  /**
   * Property 9.4: Error Stack Trace Completeness
   * Requirement 7.2: Stack trace completo e dados de contexto para erros
   */
  it('should capture complete stack traces and context for errors', () => {
    const correlationId = loggerService.generateCorrelationId();
    const testError = new Error('Test error message');
    testError.name = 'TestError';
    (testError as any).code = 'TEST_CODE';

    const context = {
      correlationId,
      userId: 'user_123',
      paymentId: 'pay_456',
      metadata: { errorContext: 'test' }
    };

    loggerService.error('TestService', 'Error occurred', testError, context);

    expect(consoleSpy.error).toHaveBeenCalledTimes(1);
    const errorLog = JSON.parse(consoleSpy.error.mock.calls[0][0]);

    // Verify error structure
    expect(errorLog).toHaveProperty('error');
    expect(errorLog.error).toHaveProperty('name', 'TestError');
    expect(errorLog.error).toHaveProperty('message', 'Test error message');
    expect(errorLog.error).toHaveProperty('stack');
    expect(errorLog.error).toHaveProperty('code', 'TEST_CODE');
    expect(errorLog.error.stack).toContain('TestError');
    expect(errorLog.error.stack).toContain('Test error message');

    // Verify context is preserved
    expect(errorLog.context.correlationId).toBe(correlationId);
    expect(errorLog.context.userId).toBe('user_123');
    expect(errorLog.context.metadata.errorContext).toBe('test');
  });

  /**
   * Property 9.5: Performance Metrics Tracking
   * Requirement 7.3: Métricas de performance e sucesso
   */
  it('should track and log performance metrics correctly', () => {
    const correlationId = loggerService.generateCorrelationId();
    const operation = 'test_operation';

    // Start performance tracking
    loggerService.startPerformanceTracking(operation, correlationId);

    // Simulate some work
    const startTime = Date.now();
    
    // End performance tracking
    const duration = loggerService.endPerformanceTracking(correlationId, true, 2);

    // Verify duration is reasonable
    expect(duration).toBeGreaterThanOrEqual(0);
    expect(duration).toBeLessThan(1000); // Should be very fast in test

    // Verify performance log was created
    expect(consoleSpy.info).toHaveBeenCalledTimes(1);
    const performanceLog = JSON.parse(consoleSpy.info.mock.calls[0][0]);

    expect(performanceLog.message).toContain('Operation completed: test_operation');
    expect(performanceLog.context.correlationId).toBe(correlationId);
    expect(performanceLog.context.metadata).toHaveProperty('duration', duration);
    expect(performanceLog.context.metadata).toHaveProperty('success', true);
    expect(performanceLog.context.metadata).toHaveProperty('retryCount', 2);
    expect(performanceLog.context.metadata).toHaveProperty('operationType', operation);
  });

  /**
   * Property 9.6: Audit Trail for Polling
   * Requirement 17.2: Logs de auditoria para cada tentativa de polling
   */
  it('should create comprehensive audit trail for polling operations', () => {
    const correlationId = loggerService.generateCorrelationId();
    const paymentId = 'pay_123';
    const responseData = { status: 'PENDING', amount: 100 };

    loggerService.auditPolling(correlationId, 3, paymentId, 'PENDING', responseData);

    expect(consoleSpy.info).toHaveBeenCalledTimes(1);
    const auditLog = JSON.parse(consoleSpy.info.mock.calls[0][0]);

    expect(auditLog.message).toBe('Polling attempt 3');
    expect(auditLog.context.correlationId).toBe(correlationId);
    expect(auditLog.context.service).toBe('PollingService');
    expect(auditLog.context.operation).toBe('audit_polling');
    expect(auditLog.context.paymentId).toBe(paymentId);
    expect(auditLog.context.metadata).toHaveProperty('attempt', 3);
    expect(auditLog.context.metadata).toHaveProperty('status', 'PENDING');
    expect(auditLog.context.metadata).toHaveProperty('responseData', JSON.stringify(responseData));
    expect(auditLog.context.metadata).toHaveProperty('auditType', 'polling_attempt');
  });

  /**
   * Property 9.7: Audit Trail for Webhooks
   * Requirement 17.3: Registrar todos os eventos de webhook com payloads completos
   */
  it('should create comprehensive audit trail for webhook events', () => {
    const correlationId = loggerService.generateCorrelationId();
    const eventId = 'evt_123';
    const payload = { event: 'PAYMENT_CONFIRMED', payment: { id: 'pay_123' } };

    // Test webhook received
    loggerService.auditWebhook(correlationId, eventId, 'PAYMENT_CONFIRMED', payload, false);

    // Test webhook processed
    loggerService.auditWebhook(correlationId, eventId, 'PAYMENT_CONFIRMED', payload, true);

    expect(consoleSpy.info).toHaveBeenCalledTimes(2);

    const receivedLog = JSON.parse(consoleSpy.info.mock.calls[0][0]);
    const processedLog = JSON.parse(consoleSpy.info.mock.calls[1][0]);

    // Verify received log
    expect(receivedLog.message).toBe('Webhook received');
    expect(receivedLog.context.metadata).toHaveProperty('eventId', eventId);
    expect(receivedLog.context.metadata).toHaveProperty('eventType', 'PAYMENT_CONFIRMED');
    expect(receivedLog.context.metadata).toHaveProperty('payload', JSON.stringify(payload));
    expect(receivedLog.context.metadata).toHaveProperty('processed', false);

    // Verify processed log
    expect(processedLog.message).toBe('Webhook processed');
    expect(processedLog.context.metadata).toHaveProperty('processed', true);
  });

  /**
   * Property 9.8: Retry Logging with Backoff
   * Requirement 17.4: Retry automático com backoff exponencial
   */
  it('should log retry attempts with backoff information', () => {
    const correlationId = loggerService.generateCorrelationId();
    const error = new Error('Network timeout');

    loggerService.logRetry('PaymentService', 'create_payment', correlationId, 2, 3, 4000, error);

    expect(consoleSpy.warn).toHaveBeenCalledTimes(1);
    const retryLog = JSON.parse(consoleSpy.warn.mock.calls[0][0]);

    expect(retryLog.message).toBe('Retry attempt 2/3 for create_payment');
    expect(retryLog.context.correlationId).toBe(correlationId);
    expect(retryLog.context.service).toBe('PaymentService');
    expect(retryLog.context.operation).toBe('retry_attempt');
    expect(retryLog.context.metadata).toHaveProperty('attempt', 2);
    expect(retryLog.context.metadata).toHaveProperty('maxAttempts', 3);
    expect(retryLog.context.metadata).toHaveProperty('backoffMs', 4000);
    expect(retryLog.context.metadata).toHaveProperty('originalOperation', 'create_payment');
    expect(retryLog.context.metadata.error).toEqual({
      name: 'Error',
      message: 'Network timeout'
    });
  });

  /**
   * Property 9.9: Rollback Logging
   * Requirement 9.5: Manter estado consistente em falhas parciais
   */
  it('should log rollback operations with detailed information', () => {
    const correlationId = loggerService.generateCorrelationId();
    const rollbackActions = ['cancel_payment', 'cleanup_resources', 'notify_user'];

    loggerService.logRollback(
      'PaymentOrchestrator', 
      'process_subscription', 
      correlationId, 
      'Payment timeout after 15s',
      rollbackActions
    );

    expect(consoleSpy.warn).toHaveBeenCalledTimes(1);
    const rollbackLog = JSON.parse(consoleSpy.warn.mock.calls[0][0]);

    expect(rollbackLog.message).toBe('Rollback initiated for process_subscription');
    expect(rollbackLog.context.correlationId).toBe(correlationId);
    expect(rollbackLog.context.service).toBe('PaymentOrchestrator');
    expect(rollbackLog.context.operation).toBe('rollback');
    expect(rollbackLog.context.metadata).toHaveProperty('originalOperation', 'process_subscription');
    expect(rollbackLog.context.metadata).toHaveProperty('reason', 'Payment timeout after 15s');
    expect(rollbackLog.context.metadata).toHaveProperty('rollbackActions', rollbackActions);
    expect(rollbackLog.context.metadata).toHaveProperty('rollbackType', 'automatic');
  });

  /**
   * Property 9.10: Metrics Logging
   * Requirement 7.3: Métricas de performance e sucesso
   */
  it('should log comprehensive metrics for operations', () => {
    const correlationId = loggerService.generateCorrelationId();

    // Test successful operation
    loggerService.logMetrics('PaymentService', 'create_payment', correlationId, true, 1500, 0);

    // Test failed operation with retries
    loggerService.logMetrics('PaymentService', 'create_payment', correlationId, false, 5000, 3);

    expect(consoleSpy.info).toHaveBeenCalledTimes(1);
    expect(consoleSpy.warn).toHaveBeenCalledTimes(1);

    const successLog = JSON.parse(consoleSpy.info.mock.calls[0][0]);
    const failureLog = JSON.parse(consoleSpy.warn.mock.calls[0][0]);

    // Verify success metrics
    expect(successLog.message).toBe('Operation succeeded: create_payment');
    expect(successLog.duration).toBe(1500);
    expect(successLog.metrics).toEqual({
      performance: 1500,
      success: true,
      retryCount: 0,
      operationType: 'create_payment'
    });

    // Verify failure metrics
    expect(failureLog.message).toBe('Operation failed: create_payment');
    expect(failureLog.duration).toBe(5000);
    expect(failureLog.metrics).toEqual({
      performance: 5000,
      success: false,
      retryCount: 3,
      operationType: 'create_payment'
    });
  });

  /**
   * Property 9.11: Correlation ID Generation Uniqueness
   * Requirement 7.5: Correlation IDs únicos para rastreamento
   */
  it('should generate unique correlation IDs consistently', () => {
    const correlationIds = new Set<string>();
    
    // Generate 100 correlation IDs
    for (let i = 0; i < 100; i++) {
      const id = loggerService.generateCorrelationId();
      expect(id).toMatch(/^sub_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
      correlationIds.add(id);
    }

    // Verify all IDs are unique
    expect(correlationIds.size).toBe(100);
  });

  /**
   * Property 9.12: Logger Cleanup and Stats
   * Requirement: Resource management and monitoring
   */
  it('should manage performance trackers and provide stats', () => {
    // Clear any existing trackers first
    loggerService.cleanupOldTrackers(0);
    
    const correlationId1 = loggerService.generateCorrelationId();
    const correlationId2 = loggerService.generateCorrelationId();

    // Start multiple trackers
    loggerService.startPerformanceTracking('operation1', correlationId1);
    loggerService.startPerformanceTracking('operation2', correlationId2);

    // Get stats
    let stats = loggerService.getStats();
    expect(stats.activeTrackers).toBe(2);
    expect(stats.oldestTracker).toBeDefined();

    // End one tracker
    loggerService.endPerformanceTracking(correlationId1, true);

    // Verify stats updated
    stats = loggerService.getStats();
    expect(stats.activeTrackers).toBe(1);

    // End remaining tracker
    loggerService.endPerformanceTracking(correlationId2, true);
    
    stats = loggerService.getStats();
    expect(stats.activeTrackers).toBe(0);
    expect(stats.oldestTracker).toBeUndefined();

    // Test cleanup functionality by creating a tracker and simulating age
    const testCorrelationId = loggerService.generateCorrelationId();
    loggerService.startPerformanceTracking('cleanup_test', testCorrelationId);
    
    // Simulate an old tracker by manually setting start time
    const tracker = (loggerService as any).performanceTrackers.get(testCorrelationId);
    if (tracker) {
      tracker.startTime = Date.now() - 10000; // 10 seconds ago
    }
    
    // Force cleanup with 5 second max age
    loggerService.cleanupOldTrackers(5000);
    
    // Verify cleanup was logged and tracker was removed
    expect(consoleSpy.warn).toHaveBeenCalled();
    const finalStats = loggerService.getStats();
    expect(finalStats.activeTrackers).toBe(0);
  });

  /**
   * Property 9.13: Singleton Pattern Consistency
   * Requirement: Consistent logging across application
   */
  it('should maintain singleton pattern and shared state', () => {
    const instance1 = LoggerService.getInstance();
    const instance2 = LoggerService.getInstance();
    const instance3 = logger; // exported instance

    expect(instance1).toBe(instance2);
    expect(instance1).toBe(instance3);
    expect(instance2).toBe(instance3);

    // Clear any existing trackers first
    instance1.cleanupOldTrackers(0);

    // Test shared state
    const correlationId = instance1.generateCorrelationId();
    instance1.startPerformanceTracking('test', correlationId);

    const stats = instance2.getStats();
    expect(stats.activeTrackers).toBe(1);

    instance3.endPerformanceTracking(correlationId, true);
    
    const finalStats = instance1.getStats();
    expect(finalStats.activeTrackers).toBe(0);
  });
});