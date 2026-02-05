/**
 * Property Test 13: Input Validation and Error Reporting
 * Validates: Requirements 9.2
 * 
 * Testa que o sistema de validação de entrada para assinaturas funciona corretamente
 * com validadores específicos, mensagens de erro claras e tratamento robusto
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ErrorHandlerService, CommonValidators } from '@/services/subscriptions/ErrorHandlerService';

describe('Property Test 13: Input Validation and Error Reporting', () => {
  let errorHandler: ErrorHandlerService;
  let correlationId: string;

  beforeEach(() => {
    correlationId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    errorHandler = new ErrorHandlerService(correlationId);

    // Mock console.log para capturar logs
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  describe('Required Field Validation', () => {
    it('deve validar campos obrigatórios corretamente', async () => {
      const testCases = [
        { value: null, shouldFail: true },
        { value: undefined, shouldFail: true },
        { value: '', shouldFail: true },
        { value: '   ', shouldFail: false }, // Espaços são válidos
        { value: 'valid value', shouldFail: false },
        { value: 0, shouldFail: false }, // Zero é válido
        { value: false, shouldFail: false } // Boolean false é válido
      ];

      const validator = CommonValidators.required('testField');

      testCases.forEach(({ value, shouldFail }) => {
        const result = validator(value);
        
        if (shouldFail) {
          expect(result).not.toBeNull();
          expect(result?.message).toBe('testField is required');
          expect(result?.field).toBe('testField');
        } else {
          expect(result).toBeNull();
        }
      });
    });
  });

  describe('Email Validation', () => {
    it('deve validar formato de email corretamente', async () => {
      const validEmails = [
        'user@example.com',
        'test.email@domain.co.uk',
        'user+tag@example.org',
        'user123@test-domain.com',
        'a@b.co'
      ];

      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'user@',
        'user@.com',
        'user..double@example.com',
        'user@example',
        '',
        null,
        undefined,
        123,
        {}
      ];

      // Testar emails válidos
      validEmails.forEach(email => {
        const result = CommonValidators.email(email);
        expect(result).toBeNull();
      });

      // Testar emails inválidos
      invalidEmails.forEach(email => {
        const result = CommonValidators.email(email);
        expect(result).not.toBeNull();
        expect(result?.message).toBe('Invalid email format');
        expect(result?.field).toBe('email');
      });
    });
  });

  describe('Positive Number Validation', () => {
    it('deve validar números positivos corretamente', async () => {
      const validator = CommonValidators.positiveNumber('amount');

      const validNumbers = [0.01, 1, 100, 999.99, Number.MAX_SAFE_INTEGER];
      const invalidNumbers = [0, -1, -0.01, '10', null, undefined, NaN, Infinity, -Infinity, {}];

      // Testar números válidos
      validNumbers.forEach(number => {
        const result = validator(number);
        expect(result).toBeNull();
      });

      // Testar números inválidos
      invalidNumbers.forEach(number => {
        const result = validator(number);
        expect(result).not.toBeNull();
        expect(result?.message).toBe('amount must be a positive number');
        expect(result?.field).toBe('amount');
      });
    });
  });

  describe('Non-Empty Array Validation', () => {
    it('deve validar arrays não-vazios corretamente', async () => {
      const validator = CommonValidators.nonEmptyArray('items');

      const validArrays = [
        [1],
        ['item'],
        [1, 2, 3],
        [{ id: 1 }],
        [null], // Array com null é válido
        [undefined] // Array com undefined é válido
      ];

      const invalidArrays = [
        [],
        null,
        undefined,
        'not an array',
        123,
        {},
        'string'
      ];

      // Testar arrays válidos
      validArrays.forEach(array => {
        const result = validator(array);
        expect(result).toBeNull();
      });

      // Testar arrays inválidos
      invalidArrays.forEach(array => {
        const result = validator(array);
        expect(result).not.toBeNull();
        expect(result?.message).toBe('items must be a non-empty array');
        expect(result?.field).toBe('items');
      });
    });
  });

  describe('UUID Validation', () => {
    it('deve validar UUIDs corretamente', async () => {
      const validator = CommonValidators.uuid('id');

      const validUUIDs = [
        '123e4567-e89b-12d3-a456-426614174000',
        '00000000-0000-0000-0000-000000000000',
        'ffffffff-ffff-ffff-ffff-ffffffffffff',
        'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
      ];

      const invalidUUIDs = [
        '123e4567-e89b-12d3-a456-42661417400', // Muito curto
        '123e4567-e89b-12d3-a456-4266141740000', // Muito longo
        '123e4567-e89b-12d3-a456-42661417400g', // Caractere inválido
        '123e4567e89b12d3a456426614174000', // Sem hífens
        'not-a-uuid',
        '',
        null,
        undefined,
        123
      ];

      // Testar UUIDs válidos
      validUUIDs.forEach(uuid => {
        const result = validator(uuid);
        expect(result).toBeNull();
      });

      // Testar UUIDs inválidos
      invalidUUIDs.forEach(uuid => {
        const result = validator(uuid);
        expect(result).not.toBeNull();
        expect(result?.message).toBe('id must be a valid UUID');
        expect(result?.field).toBe('id');
      });
    });
  });

  describe('Wallet ID Validation', () => {
    it('deve validar Wallet IDs do Asaas corretamente', async () => {
      const validWalletIds = [
        'wal_12345678901234567890',
        'wal_abcdefghijklmnopqrst',
        'wal_ABCDEFGHIJKLMNOPQRST',
        'wal_1a2B3c4D5e6F7g8H9i0J'
      ];

      const invalidWalletIds = [
        'wal_123456789012345678901', // Muito longo
        'wal_1234567890123456789', // Muito curto
        'wallet_12345678901234567890', // Prefixo errado
        'wal_123456789012345678!0', // Caractere especial
        'wal_',
        'wal',
        '',
        null,
        undefined,
        123
      ];

      // Testar Wallet IDs válidos
      validWalletIds.forEach(walletId => {
        const result = CommonValidators.walletId(walletId);
        expect(result).toBeNull();
      });

      // Testar Wallet IDs inválidos
      invalidWalletIds.forEach(walletId => {
        const result = CommonValidators.walletId(walletId);
        expect(result).not.toBeNull();
        expect(result?.message).toBe('Invalid Asaas Wallet ID format');
        expect(result?.field).toBe('walletId');
      });
    });
  });

  describe('Complex Validation Scenarios', () => {
    it('deve validar dados de assinatura completos', async () => {
      const validSubscriptionData = {
        email: 'user@example.com',
        amount: 29.90,
        planId: '123e4567-e89b-12d3-a456-426614174000',
        orderItems: [
          { id: 'item1', quantity: 1, price: 29.90 }
        ],
        walletId: 'wal_12345678901234567890'
      };

      const validationRules = {
        email: CommonValidators.email,
        amount: CommonValidators.positiveNumber('amount'),
        planId: CommonValidators.uuid('planId'),
        orderItems: CommonValidators.nonEmptyArray('orderItems'),
        walletId: CommonValidators.walletId
      };

      const result = errorHandler.validateInput(
        validSubscriptionData,
        validationRules,
        'create-subscription'
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validSubscriptionData);
        expect(result.context.correlationId).toBe(correlationId);
      }
    });

    it('deve reportar múltiplos erros de validação', async () => {
      const invalidSubscriptionData = {
        email: 'invalid-email',
        amount: -10,
        planId: 'not-a-uuid',
        orderItems: [],
        walletId: 'invalid-wallet'
      };

      const validationRules = {
        email: CommonValidators.email,
        amount: CommonValidators.positiveNumber('amount'),
        planId: CommonValidators.uuid('planId'),
        orderItems: CommonValidators.nonEmptyArray('orderItems'),
        walletId: CommonValidators.walletId
      };

      const result = errorHandler.validateInput(
        invalidSubscriptionData,
        validationRules,
        'create-subscription'
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('VALIDATION_ERROR');
        expect(result.validationErrors).toHaveLength(5);
        expect(result.retryable).toBe(false);

        // Verificar que todos os campos falharam
        const errorFields = result.validationErrors!.map(e => e.field);
        expect(errorFields).toContain('email');
        expect(errorFields).toContain('amount');
        expect(errorFields).toContain('planId');
        expect(errorFields).toContain('orderItems');
        expect(errorFields).toContain('walletId');
      }
    });
  });

  describe('Property: Validation Consistency', () => {
    it('deve aplicar validação consistente para o mesmo valor', async () => {
      const testValue = 'test@example.com';
      const validator = CommonValidators.email;

      // Executar validação múltiplas vezes
      for (let i = 0; i < 10; i++) {
        const result = validator(testValue);
        expect(result).toBeNull(); // Sempre deve passar
      }

      const invalidValue = 'invalid-email';
      for (let i = 0; i < 10; i++) {
        const result = validator(invalidValue);
        expect(result).not.toBeNull(); // Sempre deve falhar
        expect(result?.message).toBe('Invalid email format');
      }
    });
  });

  describe('Property: Error Message Clarity', () => {
    it('deve fornecer mensagens de erro claras e específicas', async () => {
      const testCases = [
        {
          validator: CommonValidators.required('name'),
          value: null,
          expectedMessage: 'name is required'
        },
        {
          validator: CommonValidators.email,
          value: 'invalid',
          expectedMessage: 'Invalid email format'
        },
        {
          validator: CommonValidators.positiveNumber('price'),
          value: -10,
          expectedMessage: 'price must be a positive number'
        },
        {
          validator: CommonValidators.nonEmptyArray('items'),
          value: [],
          expectedMessage: 'items must be a non-empty array'
        },
        {
          validator: CommonValidators.uuid('id'),
          value: 'not-uuid',
          expectedMessage: 'id must be a valid UUID'
        },
        {
          validator: CommonValidators.walletId,
          value: 'invalid',
          expectedMessage: 'Invalid Asaas Wallet ID format'
        }
      ];

      testCases.forEach(({ validator, value, expectedMessage }) => {
        const result = validator(value);
        expect(result).not.toBeNull();
        expect(result?.message).toBe(expectedMessage);
      });
    });
  });

  describe('Property: Validation Performance', () => {
    it('deve executar validação em tempo aceitável', async () => {
      const largeData = {
        email: 'user@example.com',
        items: Array.from({ length: 1000 }, (_, i) => ({ id: i, name: `Item ${i}` }))
      };

      const validationRules = {
        email: CommonValidators.email,
        items: CommonValidators.nonEmptyArray('items')
      };

      const startTime = Date.now();
      const result = errorHandler.validateInput(
        largeData,
        validationRules,
        'performance-test'
      );
      const elapsedTime = Date.now() - startTime;

      // Validação deve ser rápida (< 100ms)
      expect(elapsedTime).toBeLessThan(100);
      expect(result.success).toBe(true);
    });
  });

  describe('Property: Null Safety', () => {
    it('deve lidar com valores null/undefined sem quebrar', async () => {
      const validators = [
        CommonValidators.email,
        CommonValidators.positiveNumber('test'),
        CommonValidators.nonEmptyArray('test'),
        CommonValidators.uuid('test'),
        CommonValidators.walletId,
        CommonValidators.required('test')
      ];

      const testValues = [null, undefined];

      validators.forEach(validator => {
        testValues.forEach(value => {
          // Não deve lançar exceção
          expect(() => validator(value)).not.toThrow();
          
          const result = validator(value);
          expect(result).not.toBeNull(); // Todos devem falhar para null/undefined
          expect(result?.message).toBeDefined();
          expect(result?.field).toBeDefined();
        });
      });
    });
  });

  describe('Integration with ErrorHandlerService', () => {
    it('deve integrar validação com logs estruturados', async () => {
      const invalidData = { email: 'invalid' };
      const validationRules = { email: CommonValidators.email };

      const result = errorHandler.validateInput(
        invalidData,
        validationRules,
        'integration-test'
      );

      expect(result.success).toBe(false);

      // Verificar que logs foram gerados
      const logCalls = (console.log as any).mock.calls;
      const validationLogs = logCalls.filter((call: any) => {
        const logEntry = JSON.parse(call[0]);
        return logEntry.message.includes('validation');
      });

      expect(validationLogs.length).toBeGreaterThan(0);
    });
  });
});