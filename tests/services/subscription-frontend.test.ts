/**
 * Testes para SubscriptionFrontendService
 * Task 14.1: Validar serviços frontend para assinaturas
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SubscriptionFrontendService } from '../../src/services/frontend/subscription.service';

// Mock do fetch global
global.fetch = vi.fn();

// Mock do supabase
vi.mock('@/config/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: {
            access_token: 'mock-token'
          }
        }
      })
    }
  }
}));

describe('SubscriptionFrontendService', () => {
  let service: SubscriptionFrontendService;

  beforeEach(() => {
    service = new SubscriptionFrontendService();
    vi.clearAllMocks();
  });

  describe('createSubscriptionPayment', () => {
    it('should create subscription payment successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          paymentId: 'pay_123456789',
          status: 'PENDING',
          amount: 99.90,
          correlationId: 'corr_123',
          pollingUrl: '/api/subscriptions/status/pay_123456789'
        }
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const paymentData = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        planId: 'plan_monthly',
        amount: 99.90,
        orderItems: [
          {
            id: 'product_ai_assistant',
            name: 'Assistente IA Premium',
            quantity: 1,
            value: 99.90,
            metadata: { hasAI: true }
          }
        ],
        customerData: {
          name: 'João Silva',
          email: 'joao@example.com',
          phone: '+5511999999999',
          cpf: '12345678901',
          address: {
            zipCode: '01234567',
            street: 'Rua Teste',
            number: '123',
            neighborhood: 'Centro',
            city: 'São Paulo',
            state: 'SP'
          }
        },
        paymentMethod: {
          type: 'CREDIT_CARD' as const,
          creditCard: {
            holderName: 'JOAO SILVA',
            number: '1234567890123456',
            expiryMonth: '12',
            expiryYear: '2025',
            ccv: '123'
          }
        }
      };

      const result = await service.createSubscriptionPayment(paymentData);

      expect(result.success).toBe(true);
      expect(result.data?.paymentId).toBe('pay_123456789');
      expect(result.data?.status).toBe('PENDING');
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/subscriptions/create-payment',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-token'
          })
        })
      );
    });

    it('should reject payment with empty Order Items', async () => {
      const paymentData = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        planId: 'plan_monthly',
        amount: 99.90,
        orderItems: [], // EMPTY
        customerData: {
          name: 'João Silva',
          email: 'joao@example.com',
          phone: '+5511999999999',
          cpf: '12345678901',
          address: {
            zipCode: '01234567',
            street: 'Rua Teste',
            number: '123',
            neighborhood: 'Centro',
            city: 'São Paulo',
            state: 'SP'
          }
        },
        paymentMethod: {
          type: 'PIX' as const
        }
      };

      const result = await service.createSubscriptionPayment(paymentData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Order Items é obrigatório');
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should handle API errors gracefully', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({
          error: 'Dados inválidos',
          details: [{ field: 'email', message: 'Email inválido' }]
        })
      });

      const paymentData = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        planId: 'plan_monthly',
        amount: 99.90,
        orderItems: [{ id: 'test', name: 'Test', quantity: 1, value: 99.90 }],
        customerData: {
          name: 'João Silva',
          email: 'invalid-email',
          phone: '+5511999999999',
          cpf: '12345678901',
          address: {
            zipCode: '01234567',
            street: 'Rua Teste',
            number: '123',
            neighborhood: 'Centro',
            city: 'São Paulo',
            state: 'SP'
          }
        },
        paymentMethod: { type: 'PIX' as const }
      };

      const result = await service.createSubscriptionPayment(paymentData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Dados inválidos');
      expect(result.details).toHaveLength(1);
    });
  });

  describe('checkPaymentStatus', () => {
    it('should check payment status successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          paymentId: 'pay_123456789',
          status: 'CONFIRMED',
          confirmedAt: '2025-02-04T23:00:00Z',
          subscriptionId: 'sub_987654321',
          correlationId: 'corr_123'
        }
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await service.checkPaymentStatus('pay_123456789');

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('CONFIRMED');
      expect(result.data?.subscriptionId).toBe('sub_987654321');
    });

    it('should reject invalid payment ID', async () => {
      const result = await service.checkPaymentStatus('invalid');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Payment ID inválido');
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('pollPaymentStatus', () => {
    it('should poll until payment is confirmed', async () => {
      // Primeira chamada: PENDING
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: { paymentId: 'pay_123', status: 'PENDING' }
        })
      });

      // Segunda chamada: CONFIRMED
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: { paymentId: 'pay_123', status: 'CONFIRMED' }
        })
      });

      const progressCallback = vi.fn();
      const result = await service.pollPaymentStatus('pay_123456789', progressCallback);

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('CONFIRMED');
      expect(progressCallback).toHaveBeenCalledWith(1, 15);
      expect(progressCallback).toHaveBeenCalledWith(2, 15);
    });

    it('should timeout after max attempts', async () => {
      // Configurar polling rápido para teste
      service.configurePolling({ maxAttempts: 2, intervalMs: 10 });

      // Sempre retornar PENDING
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: { paymentId: 'pay_123', status: 'PENDING' }
        })
      });

      const result = await service.pollPaymentStatus('pay_123456789');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Timeout na verificação');
    });
  });

  describe('cancelSubscription', () => {
    it('should cancel subscription successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          subscriptionId: 'sub_987654321',
          cancelledAt: '2025-02-04T23:00:00Z',
          effectiveDate: '2025-03-04T23:00:00Z',
          refundAmount: 0,
          correlationId: 'corr_456'
        }
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await service.cancelSubscription(
        'sub_987654321',
        'Não preciso mais do serviço',
        false
      );

      expect(result.success).toBe(true);
      expect(result.data?.subscriptionId).toBe('sub_987654321');
      expect(result.data?.refundAmount).toBe(0);
    });

    it('should reject short cancellation reason', async () => {
      const result = await service.cancelSubscription('sub_1234567890', 'Curto', false);

      expect(result.success).toBe(false);
      expect(result.error).toContain('pelo menos 10 caracteres');
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('validatePaymentData', () => {
    it('should validate complete payment data', () => {
      const validData = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        planId: 'plan_monthly',
        amount: 99.90,
        orderItems: [
          { id: 'test', name: 'Test Product', quantity: 1, value: 99.90 }
        ],
        customerData: {
          name: 'João Silva',
          email: 'joao@example.com',
          phone: '+5511999999999',
          cpf: '11144477735', // CPF válido
          address: {
            zipCode: '01234567',
            street: 'Rua Teste',
            number: '123',
            neighborhood: 'Centro',
            city: 'São Paulo',
            state: 'SP'
          }
        },
        paymentMethod: {
          type: 'CREDIT_CARD' as const,
          creditCard: {
            holderName: 'JOAO SILVA',
            number: '1234567890123456',
            expiryMonth: '12',
            expiryYear: '2025',
            ccv: '123'
          }
        }
      };

      const result = service.validatePaymentData(validData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect validation errors', () => {
      const invalidData = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        planId: 'plan_monthly',
        amount: 0, // INVALID
        orderItems: [], // EMPTY
        customerData: {
          name: 'Jo', // TOO SHORT
          email: 'invalid-email', // INVALID
          phone: '+5511999999999',
          cpf: '123', // INVALID
          address: {
            zipCode: '01234567',
            street: 'Rua Teste',
            number: '123',
            neighborhood: 'Centro',
            city: 'São Paulo',
            state: 'SP'
          }
        },
        paymentMethod: {
          type: 'CREDIT_CARD' as const,
          creditCard: {
            holderName: 'JOAO SILVA',
            number: '123', // TOO SHORT
            expiryMonth: '12',
            expiryYear: '2025',
            ccv: '12' // TOO SHORT
          }
        }
      };

      const result = service.validatePaymentData(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors).toContain('É necessário selecionar pelo menos um produto');
      expect(result.errors).toContain('Nome deve ter pelo menos 3 caracteres');
      expect(result.errors).toContain('Email inválido');
      expect(result.errors).toContain('CPF inválido');
      expect(result.errors).toContain('Valor deve ser maior que zero');
    });
  });

  describe('loading states', () => {
    it('should manage loading states correctly', async () => {
      expect(service.isLoading()).toBe(false);

      // Mock para simular operação lenta
      (global.fetch as any).mockImplementationOnce(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: {} })
        }), 100))
      );

      const paymentPromise = service.createSubscriptionPayment({
        userId: '123',
        planId: 'test',
        amount: 100,
        orderItems: [{ id: 'test', name: 'Test', quantity: 1, value: 100 }],
        customerData: {
          name: 'Test User',
          email: 'test@example.com',
          phone: '+5511999999999',
          cpf: '12345678901',
          address: {
            zipCode: '01234567',
            street: 'Rua Teste',
            number: '123',
            neighborhood: 'Centro',
            city: 'São Paulo',
            state: 'SP'
          }
        },
        paymentMethod: { type: 'PIX' as const }
      });

      // Durante a operação, deve estar em loading
      expect(service.getLoadingStates().creatingPayment).toBe(true);
      expect(service.isLoading()).toBe(true);

      await paymentPromise;

      // Após a operação, não deve estar em loading
      expect(service.getLoadingStates().creatingPayment).toBe(false);
      expect(service.isLoading()).toBe(false);
    });

    it('should reset loading states', () => {
      // Simular estado de loading
      service['loadingStates'].creatingPayment = true;
      service['loadingStates'].polling = true;

      expect(service.isLoading()).toBe(true);

      service.resetLoadingStates();

      expect(service.isLoading()).toBe(false);
      expect(service.getLoadingStates().creatingPayment).toBe(false);
      expect(service.getLoadingStates().polling).toBe(false);
    });
  });

  describe('error formatting', () => {
    it('should format technical errors to user-friendly messages', () => {
      expect(service.formatErrorMessage('Order Items cannot be empty'))
        .toBe('É necessário selecionar pelo menos um produto para continuar');
      
      expect(service.formatErrorMessage('Payment ID inválido'))
        .toBe('Identificador do pagamento é inválido');
      
      expect(service.formatErrorMessage('Usuário não autenticado'))
        .toBe('Você precisa estar logado para continuar');
      
      expect(service.formatErrorMessage('Some unknown error'))
        .toBe('Some unknown error');
    });
  });

  describe('health check', () => {
    it('should check service health successfully', async () => {
      const mockResponse = {
        success: true,
        service: 'subscription-api',
        status: 'healthy',
        timestamp: '2025-02-04T23:00:00Z',
        version: '1.0.0'
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await service.checkHealth();

      expect(result.success).toBe(true);
      expect(result.status).toBe('healthy');
      expect(result.service).toBe('subscription-api');
    });

    it('should handle unhealthy service', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false
      });

      const result = await service.checkHealth();

      expect(result.success).toBe(false);
      expect(result.status).toBe('unhealthy');
    });
  });
});