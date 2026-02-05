/**
 * Property Test 12: Resilient Error Handling
 * Validates: Requirements 9.1, 9.3, 9.4, 9.5
 * 
 * Testa que o sistema de tratamento de erros para assinaturas funciona corretamente
 * com retry, backoff exponencial, validação de entrada e consistência de estado
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ErrorHandlerService, CommonValidators, RetryConfig } from '@/services/subscriptions/ErrorHandlerService';

describe('Property Test 12: Resilient Error Handling', () => {
  let errorHandler: ErrorHandlerService;
  let correlationId: string;

  beforeEach(() => {
    correlationId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    errorHandler = new ErrorHandlerService(correlationId);

    // Mock console.log para capturar logs
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  describe('Retry with Exponential Backoff', () => {
    it('deve executar retry com backoff exponencial para erros retryable', async () => {
      let attempts = 0;
      const maxAttempts = 3;
      const baseDelay = 100;

      const failingOperation = vi.fn().mockImplementation(() => {
        attempts++;
        if (attempts < maxAttempts) {
          throw new Error('Network timeout');
        }
        return { success: true, data: 'operation completed' };
      });

      const startTime = Date.now();
      const result = await errorHandler.executeWithRetry(
        failingOperation,
        'test-operation',
        { maxAttempts, baseDelayMs: baseDelay, backoffMultiplier: 2 }
      );
      const elapsedTime = Date.now() - startTime;

      // Validar resultado
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ success: true, data: 'operation completed' });
        expect(result.context.correlationId).toBe(correlationId);
        expect(result.context.attempt).toBe(maxAttempts);
      }

      // Validar que tentativas foram feitas
      expect(failingOperation).toHaveBeenCalledTimes(maxAttempts);

      // Validar que backoff foi aplicado (tempo mínimo esperado)
      const expectedMinTime = baseDelay + (baseDelay * 2); // 100ms + 200ms
      expect(elapsedTime).toBeGreaterThanOrEqual(expectedMinTime - 50); // Tolerância de 50ms
    });

    it('deve falhar após esgotar todas as tentativas', async () => {
      const maxAttempts = 3;
      let attempts = 0;

      const alwaysFailingOperation = vi.fn().mockImplementation(() => {
        attempts++;
        throw new Error('Persistent network error');
      });

      const result = await errorHandler.executeWithRetry(
        alwaysFailingOperation,
        'failing-operation',
        { maxAttempts, baseDelayMs: 50 }
      );

      // Validar resultado de falha
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Persistent network error');
        expect(result.code).toBe('NETWORK_ERROR');
        expect(result.retryable).toBe(true);
        expect(result.context.attempt).toBe(maxAttempts);
        expect(result.nextRetryAt).toBeDefined();
      }

      // Validar que todas as tentativas foram feitas
      expect(alwaysFailingOperation).toHaveBeenCalledTimes(maxAttempts);
    });

    it('deve parar imediatamente para erros não-retryable', async () => {
      const nonRetryableOperation = vi.fn().mockImplementation(() => {
        throw new Error('400 Bad Request - Invalid input');
      });

      const result = await errorHandler.executeWithRetry(
        nonRetryableOperation,
        'validation-error',
        { maxAttempts: 3 }
      );

      // Validar que parou na primeira tentativa
      expect(nonRetryableOperation).toHaveBeenCalledTimes(1);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.retryable).toBe(false);
        expect(result.code).toBe('BAD_REQUEST');
        expect(result.nextRetryAt).toBeUndefined();
      }
    });
  });

  describe('Input Validation', () => {
    it('deve validar entrada com erros específicos', async () => {
      const invalidData = {
        email: 'invalid-email',
        amount: -100,
        orderItems: [],
        walletId: 'invalid-wallet'
      };

      const validationRules = {
        email: CommonValidators.email,
        amount: CommonValidators.positiveNumber('amount'),
        orderItems: CommonValidators.nonEmptyArray('orderItems'),
        walletId: CommonValidators.walletId
      };

      const result = errorHandler.validateInput(
        invalidData,
        validationRules,
        'create-subscription'
      );

      // Validar que falhou na validação
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('VALIDATION_ERROR');
        expect(result.validationErrors).toHaveLength(4);
        expect(result.retryable).toBe(false);

        // Verificar erros específicos
        const errors = result.validationErrors!;
        expect(errors.find(e => e.field === 'email')?.message).toBe('Invalid email format');
        expect(errors.find(e => e.field === 'amount')?.message).toBe('amount must be a positive number');
        expect(errors.find(e => e.field === 'orderItems')?.message).toBe('orderItems must be a non-empty array');
        expect(errors.find(e => e.field === 'walletId')?.message).toBe('Invalid Asaas Wallet ID format');
      }
    });

    it('deve passar validação com dados válidos', async () => {
      const validData = {
        email: 'user@example.com',
        amount: 29.90,
        orderItems: [{ id: 1, name: 'Product' }],
        walletId: 'wal_12345678901234567890'
      };

      const validationRules = {
        email: CommonValidators.email,
        amount: CommonValidators.positiveNumber('amount'),
        orderItems: CommonValidators.nonEmptyArray('orderItems'),
        walletId: CommonValidators.walletId
      };

      const result = errorHandler.validateInput(
        validData,
        validationRules,
        'create-subscription'
      );

      // Validar sucesso
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validData);
        expect(result.context.correlationId).toBe(correlationId);
      }
    });
  });

  describe('Timeout Handling', () => {
    it('deve tratar timeout de operações corretamente', async () => {
      const slowOperation = vi.fn().mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => resolve('completed'), 200);
        });
      });

      const result = await errorHandler.executeWithTimeout(
        slowOperation,
        100, // timeout menor que a operação
        'slow-operation'
      );

      // Validar que deu timeout
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('timed out');
        expect(result.code).toBe('TIMEOUT_ERROR');
        expect(result.retryable).toBe(true);
      }
    });

    it('deve completar operação dentro do timeout', async () => {
      const fastOperation = vi.fn().mockResolvedValue('completed quickly');

      const result = await errorHandler.executeWithTimeout(
        fastOperation,
        1000, // timeout maior que a operação
        'fast-operation'
      );

      // Validar sucesso
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('completed quickly');
        expect(result.context.elapsedTime).toBeLessThan(1000);
      }
    });
  });

  describe('Rollback Mechanism', () => {
    it('deve executar rollback em caso de falha', async () => {
      const rollbackOperation = vi.fn().mockResolvedValue(undefined);
      const failingOperation = vi.fn().mockRejectedValue(new Error('Operation failed'));

      const result = await errorHandler.executeWithRollback(
        failingOperation,
        rollbackOperation,
        'rollback-test'
      );

      // Validar que falhou e rollback foi executado
      expect(result.success).toBe(false);
      expect(failingOperation).toHaveBeenCalledTimes(1);
      expect(rollbackOperation).toHaveBeenCalledTimes(1);

      if (!result.success) {
        expect(result.error).toBe('Operation failed');
      }
    });

    it('deve completar sem rollback em caso de sucesso', async () => {
      const rollbackOperation = vi.fn().mockResolvedValue(undefined);
      const successfulOperation = vi.fn().mockResolvedValue('success');

      const result = await errorHandler.executeWithRollback(
        successfulOperation,
        rollbackOperation,
        'success-test'
      );

      // Validar sucesso sem rollback
      expect(result.success).toBe(true);
      expect(successfulOperation).toHaveBeenCalledTimes(1);
      expect(rollbackOperation).not.toHaveBeenCalled();

      if (result.success) {
        expect(result.data).toBe('success');
      }
    });

    it('deve logar erro de rollback mas não falhar por isso', async () => {
      const failingRollback = vi.fn().mockRejectedValue(new Error('Rollback failed'));
      const failingOperation = vi.fn().mockRejectedValue(new Error('Operation failed'));

      const result = await errorHandler.executeWithRollback(
        failingOperation,
        failingRollback,
        'rollback-failure-test'
      );

      // Validar que operação falhou mas rollback não impediu o resultado
      expect(result.success).toBe(false);
      expect(failingOperation).toHaveBeenCalledTimes(1);
      expect(failingRollback).toHaveBeenCalledTimes(1);

      if (!result.success) {
        expect(result.error).toBe('Operation failed'); // Erro original, não do rollback
      }
    });
  });

  describe('Error Classification', () => {
    it('deve classificar corretamente diferentes tipos de erro', async () => {
      const testCases = [
        { error: 'Network timeout', expectedCode: 'TIMEOUT_ERROR', expectedRetryable: true },
        { error: '500 Internal Server Error', expectedCode: 'INTERNAL_SERVER_ERROR', expectedRetryable: true },
        { error: '400 Bad Request', expectedCode: 'BAD_REQUEST', expectedRetryable: false },
        { error: '401 Unauthorized', expectedCode: 'UNAUTHORIZED', expectedRetryable: false },
        { error: '404 Not Found', expectedCode: 'NOT_FOUND', expectedRetryable: false },
        { error: '429 Rate Limited', expectedCode: 'RATE_LIMITED', expectedRetryable: true },
        { error: 'Connection reset', expectedCode: 'NETWORK_ERROR', expectedRetryable: true },
        { error: 'Unknown error type', expectedCode: 'UNKNOWN_ERROR', expectedRetryable: true }
      ];

      for (const testCase of testCases) {
        const failingOperation = vi.fn().mockRejectedValue(new Error(testCase.error));

        const result = await errorHandler.executeWithRetry(
          failingOperation,
          'error-classification-test',
          { maxAttempts: 1 }
        );

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.code).toBe(testCase.expectedCode);
          expect(result.retryable).toBe(testCase.expectedRetryable);
        }
      }
    });
  });

  describe('Structured Logging', () => {
    it('deve gerar logs estruturados para todas as operações', async () => {
      const operation = vi.fn().mockResolvedValue('success');

      await errorHandler.executeWithRetry(operation, 'logging-test', { maxAttempts: 1 });

      // Verificar que logs foram gerados
      const logCalls = (console.log as any).mock.calls;
      expect(logCalls.length).toBeGreaterThan(0);

      // Verificar estrutura dos logs
      logCalls.forEach((call: any) => {
        const logEntry = JSON.parse(call[0]);
        
        expect(logEntry).toHaveProperty('timestamp');
        expect(logEntry).toHaveProperty('level');
        expect(logEntry).toHaveProperty('service', 'ErrorHandlerService');
        expect(logEntry).toHaveProperty('correlationId', correlationId);
        expect(logEntry).toHaveProperty('message');
      });
    });
  });

  describe('Property: Backoff Timing Consistency', () => {
    it('deve aplicar backoff exponencial consistente', async () => {
      const baseDelay = 100;
      const multiplier = 2;
      const maxAttempts = 4;
      let attempts = 0;
      const attemptTimes: number[] = [];

      const failingOperation = vi.fn().mockImplementation(() => {
        attempts++;
        attemptTimes.push(Date.now());
        if (attempts < maxAttempts) {
          throw new Error('Network error');
        }
        return 'success';
      });

      await errorHandler.executeWithRetry(
        failingOperation,
        'backoff-timing-test',
        { maxAttempts, baseDelayMs: baseDelay, backoffMultiplier: multiplier }
      );

      // Verificar que os intervalos seguem o padrão exponencial
      for (let i = 1; i < attemptTimes.length; i++) {
        const actualDelay = attemptTimes[i] - attemptTimes[i - 1];
        const expectedDelay = baseDelay * Math.pow(multiplier, i - 1);
        
        // Tolerância de ±50ms para timing
        expect(actualDelay).toBeGreaterThanOrEqual(expectedDelay - 50);
        expect(actualDelay).toBeLessThanOrEqual(expectedDelay + 100);
      }
    });
  });

  describe('Property: State Consistency', () => {
    it('deve manter consistência de correlation ID em todas as operações', async () => {
      const operations = [
        () => errorHandler.executeWithRetry(() => Promise.resolve('test'), 'test1'),
        () => errorHandler.validateInput({}, {}, 'test2'),
        () => errorHandler.executeWithTimeout(() => Promise.resolve('test'), 1000, 'test3')
      ];

      for (const operation of operations) {
        const result = await operation();
        expect(result.context.correlationId).toBe(correlationId);
      }
    });
  });
});