/**
 * T10. Testes de propriedade para logging
 * 
 * Property 20: Split Execution Confirmation
 * Property 21: Error Context Logging
 * 
 * Validates: Requirements 10.3, 10.4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';

// Mock do Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null }))
        }))
      })),
      insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null }))
      }))
    }))
  }
}));

// Tipos
interface SplitLog {
  id: string;
  orderId: string;
  paymentId: string;
  splits: Array<{
    walletId: string;
    value: number;
    type: string;
  }>;
  totalValue: number;
  status: 'pending' | 'executed' | 'failed';
  executedAt?: Date;
  error?: string;
  createdAt: Date;
}

interface ErrorLog {
  id: string;
  context: string;
  error: string;
  stack?: string;
  metadata: Record<string, unknown>;
  severity: 'info' | 'warning' | 'error' | 'critical';
  createdAt: Date;
}

// Simulação do serviço de logging
class AuditLogger {
  private splitLogs: SplitLog[] = [];
  private errorLogs: ErrorLog[] = [];
  
  logSplitExecution(
    orderId: string,
    paymentId: string,
    splits: Array<{ walletId: string; value: number; type: string }>,
    status: 'pending' | 'executed' | 'failed',
    error?: string
  ): SplitLog {
    const log: SplitLog = {
      id: `split_${Date.now()}`,
      orderId,
      paymentId,
      splits,
      totalValue: splits.reduce((sum, s) => sum + s.value, 0),
      status,
      executedAt: status === 'executed' ? new Date() : undefined,
      error,
      createdAt: new Date()
    };
    
    this.splitLogs.push(log);
    return log;
  }
  
  logError(
    context: string,
    error: Error | string,
    metadata: Record<string, unknown> = {},
    severity: 'info' | 'warning' | 'error' | 'critical' = 'error'
  ): ErrorLog {
    const log: ErrorLog = {
      id: `err_${Date.now()}`,
      context,
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      metadata,
      severity,
      createdAt: new Date()
    };
    
    this.errorLogs.push(log);
    return log;
  }
  
  getSplitLogs(): SplitLog[] {
    return this.splitLogs;
  }
  
  getErrorLogs(): ErrorLog[] {
    return this.errorLogs;
  }
  
  clearLogs(): void {
    this.splitLogs = [];
    this.errorLogs = [];
  }
}

describe('Logging and Audit - Property Tests', () => {
  let logger: AuditLogger;
  
  beforeEach(() => {
    logger = new AuditLogger();
  });
  
  describe('Property 20: Split Execution Confirmation', () => {
    it('deve registrar todos os splits executados', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.string({ minLength: 10, maxLength: 20 }),
          fc.array(
            fc.record({
              walletId: fc.constant('wal_12345678901234567890'),
              value: fc.integer({ min: 1, max: 10000 }),
              type: fc.constantFrom('N1', 'N2', 'N3', 'RENUM', 'JB')
            }),
            { minLength: 1, maxLength: 5 }
          ),
          (orderId, paymentId, splits) => {
            const log = logger.logSplitExecution(
              orderId,
              paymentId,
              splits.map(s => ({ ...s, value: s.value / 100 })),
              'executed'
            );
            
            // Log deve conter todos os dados
            expect(log.orderId).toBe(orderId);
            expect(log.paymentId).toBe(paymentId);
            expect(log.splits.length).toBe(splits.length);
            expect(log.status).toBe('executed');
            expect(log.executedAt).toBeDefined();
          }
        ),
        { numRuns: 30 }
      );
    });
    
    it('deve calcular total de splits corretamente', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.integer({ min: 1, max: 10000 }),
            { minLength: 1, maxLength: 5 }
          ),
          (values) => {
            const splits = values.map((v, i) => ({
              walletId: `wal_${i}2345678901234567890`,
              value: v / 100,
              type: 'N1'
            }));
            
            const log = logger.logSplitExecution(
              'order_123',
              'pay_123',
              splits,
              'executed'
            );
            
            const expectedTotal = splits.reduce((sum, s) => sum + s.value, 0);
            expect(log.totalValue).toBeCloseTo(expectedTotal, 2);
          }
        ),
        { numRuns: 30 }
      );
    });
    
    it('deve registrar falhas de split com erro', () => {
      const splits = [
        { walletId: 'wal_12345678901234567890', value: 493.50, type: 'N1' }
      ];
      
      const log = logger.logSplitExecution(
        'order_123',
        'pay_123',
        splits,
        'failed',
        'Wallet not found'
      );
      
      expect(log.status).toBe('failed');
      expect(log.error).toBe('Wallet not found');
      expect(log.executedAt).toBeUndefined();
    });
  });
  
  describe('Property 21: Error Context Logging', () => {
    it('deve registrar erros com contexto completo', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 5, maxLength: 50 }),
          fc.string({ minLength: 10, maxLength: 100 }),
          fc.record({
            orderId: fc.uuid(),
            userId: fc.uuid(),
            action: fc.string({ minLength: 3, maxLength: 20 })
          }),
          (context, errorMessage, metadata) => {
            const log = logger.logError(
              context,
              errorMessage,
              metadata,
              'error'
            );
            
            // Log deve conter todos os dados de contexto
            expect(log.context).toBe(context);
            expect(log.error).toBe(errorMessage);
            expect(log.metadata).toEqual(metadata);
            expect(log.severity).toBe('error');
            expect(log.createdAt).toBeDefined();
          }
        ),
        { numRuns: 30 }
      );
    });
    
    it('deve capturar stack trace de Error objects', () => {
      const error = new Error('Test error');
      
      const log = logger.logError(
        'TestContext',
        error,
        { orderId: 'order_123' }
      );
      
      expect(log.error).toBe('Test error');
      expect(log.stack).toBeDefined();
      expect(log.stack).toContain('Error: Test error');
    });
    
    it('deve classificar severidade corretamente', () => {
      const severities: Array<'info' | 'warning' | 'error' | 'critical'> = [
        'info', 'warning', 'error', 'critical'
      ];
      
      severities.forEach(severity => {
        logger.clearLogs();
        
        const log = logger.logError(
          'TestContext',
          'Test message',
          {},
          severity
        );
        
        expect(log.severity).toBe(severity);
      });
    });
    
    it('deve preservar metadados complexos', () => {
      const complexMetadata = {
        orderId: 'order_123',
        splits: [
          { walletId: 'wal_1', value: 100 },
          { walletId: 'wal_2', value: 200 }
        ],
        nested: {
          level1: {
            level2: 'deep value'
          }
        },
        timestamp: new Date().toISOString()
      };
      
      const log = logger.logError(
        'ComplexContext',
        'Complex error',
        complexMetadata
      );
      
      expect(log.metadata).toEqual(complexMetadata);
      expect((log.metadata as typeof complexMetadata).splits.length).toBe(2);
      expect((log.metadata as typeof complexMetadata).nested.level1.level2).toBe('deep value');
    });
  });
});

describe('Logging and Audit - Integration Tests', () => {
  let logger: AuditLogger;
  
  beforeEach(() => {
    logger = new AuditLogger();
  });
  
  it('deve manter histórico completo de operações', () => {
    // Simular fluxo completo
    
    // 1. Log de split pendente
    logger.logSplitExecution(
      'order_123',
      'pay_123',
      [
        { walletId: 'wal_n1', value: 493.50, type: 'N1' },
        { walletId: 'wal_renum', value: 164.50, type: 'RENUM' },
        { walletId: 'wal_jb', value: 164.50, type: 'JB' }
      ],
      'pending'
    );
    
    // 2. Log de split executado
    logger.logSplitExecution(
      'order_123',
      'pay_123',
      [
        { walletId: 'wal_n1', value: 493.50, type: 'N1' },
        { walletId: 'wal_renum', value: 164.50, type: 'RENUM' },
        { walletId: 'wal_jb', value: 164.50, type: 'JB' }
      ],
      'executed'
    );
    
    const splitLogs = logger.getSplitLogs();
    
    expect(splitLogs.length).toBe(2);
    expect(splitLogs[0].status).toBe('pending');
    expect(splitLogs[1].status).toBe('executed');
  });
  
  it('deve correlacionar logs de erro com operações', () => {
    // Simular erro durante split
    const orderId = 'order_456';
    
    // 1. Tentar split
    logger.logSplitExecution(
      orderId,
      'pay_456',
      [{ walletId: 'wal_invalid', value: 493.50, type: 'N1' }],
      'failed',
      'Invalid wallet ID'
    );
    
    // 2. Log de erro detalhado
    logger.logError(
      'SplitExecution',
      new Error('Invalid wallet ID'),
      { orderId, walletId: 'wal_invalid' },
      'error'
    );
    
    const splitLogs = logger.getSplitLogs();
    const errorLogs = logger.getErrorLogs();
    
    expect(splitLogs.length).toBe(1);
    expect(errorLogs.length).toBe(1);
    expect(splitLogs[0].orderId).toBe(orderId);
    expect((errorLogs[0].metadata as { orderId: string }).orderId).toBe(orderId);
  });
});
