/**
 * PaymentFirstFlowService Tests
 * Testes para validar o fluxo Payment First baseado no Comademig
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PaymentFirstFlowService } from '@/services/subscriptions/PaymentFirstFlowService';
import { SubscriptionOrderData } from '@/types/subscription.types';

// Mock das dependências
vi.mock('@/config/subscription.config', () => ({
  subscriptionConfig: {
    asaas: {
      apiKey: 'test-api-key',
      baseUrl: 'https://api-sandbox.asaas.com/v3'
    }
  }
}));

vi.mock('@/config/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => ({ error: null }))
    }))
  }
}));

// Mock do fetch global - será configurado por teste
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('PaymentFirstFlowService', () => {
  let service: PaymentFirstFlowService;
  let mockOrderData: SubscriptionOrderData;

  beforeEach(() => {
    service = new PaymentFirstFlowService();
    
    // Reset do mock
    mockFetch.mockReset();
    
    // Dados de teste válidos
    mockOrderData = {
      customer: {
        name: 'João Silva',
        email: 'joao@teste.com',
        phone: '11999999999',
        cpf: '12345678901',
        address: {
          postalCode: '01234-567',
          street: 'Rua Teste',
          number: '123',
          neighborhood: 'Centro',
          city: 'São Paulo',
          state: 'SP'
        }
      },
      product: {
        id: 'prod-123',
        name: 'Colchão Magnético Premium'
      },
      monthlyValue: 299.90,
      payment: {
        billingType: 'CREDIT_CARD',
        creditCard: {
          holderName: 'JOAO SILVA',
          number: '4111111111111111',
          expiryMonth: '12',
          expiryYear: '2025',
          ccv: '123'
        },
        creditCardHolderInfo: {
          name: 'João Silva',
          email: 'joao@teste.com',
          cpfCnpj: '12345678901',
          postalCode: '01234567',
          addressNumber: '123',
          phone: '11999999999',
          mobilePhone: '11999999999'
        }
      },
      orderItems: [
        {
          id: 'item-1',
          name: 'Colchão Magnético Premium',
          quantity: 1,
          value: 299.90,
          description: 'Colchão com tecnologia magnética',
          metadata: {
            hasAI: true,
            aiFeatures: ['BIA Assistant', 'Smart Recommendations']
          }
        }
      ],
      metadata: {
        remoteIp: '192.168.1.1',
        referralCode: 'REF123'
      }
    };

    // Reset mocks
    vi.clearAllMocks();
  });

  describe('Validação de Estrutura', () => {
    it('deve ter métodos públicos necessários', () => {
      expect(service).toHaveProperty('processRegistration');
      expect(typeof service.processRegistration).toBe('function');
    });

    it('deve ter dependências inicializadas', () => {
      expect(service).toHaveProperty('pollingService');
      expect(service).toHaveProperty('asaasAdapter');
    });
  });

  describe('Validação de Dados', () => {
    it('deve aceitar dados válidos de assinatura', () => {
      expect(mockOrderData.customer.name).toBeTruthy();
      expect(mockOrderData.customer.email).toContain('@');
      expect(mockOrderData.customer.cpf).toHaveLength(11);
      expect(mockOrderData.monthlyValue).toBeGreaterThan(0);
      expect(mockOrderData.orderItems).toHaveLength(1);
      expect(mockOrderData.orderItems[0].metadata?.hasAI).toBe(true);
    });

    it('deve ter orderItems obrigatório para detecção IA', () => {
      expect(mockOrderData.orderItems).toBeDefined();
      expect(mockOrderData.orderItems.length).toBeGreaterThan(0);
      expect(mockOrderData.orderItems[0].metadata?.hasAI).toBe(true);
      expect(mockOrderData.orderItems[0].metadata?.aiFeatures).toContain('BIA Assistant');
    });

    it('deve ter dados de cartão válidos', () => {
      const { creditCard, creditCardHolderInfo } = mockOrderData.payment;
      
      expect(creditCard.holderName).toBeTruthy();
      expect(creditCard.number).toHaveLength(16);
      expect(creditCard.expiryMonth).toMatch(/^(0[1-9]|1[0-2])$/);
      expect(creditCard.expiryYear).toMatch(/^20\d{2}$/);
      expect(creditCard.ccv).toHaveLength(3);
      
      expect(creditCardHolderInfo.name).toBeTruthy();
      expect(creditCardHolderInfo.email).toContain('@');
      expect(creditCardHolderInfo.cpfCnpj).toBeTruthy();
    });
  });

  describe('Fluxo de Processamento', () => {
    it('deve retornar erro quando dados inválidos', async () => {
      const invalidData = { ...mockOrderData };
      invalidData.customer.email = 'email-inválido';
      
      const result = await service.processRegistration(invalidData);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('deve processar fluxo completo com sucesso (mock)', async () => {
      // Mock das respostas das Edge Functions
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ 
            success: true,
            payment: {
              id: 'pay_123', 
              status: 'PENDING',
              value: 3290,
              billingType: 'CREDIT_CARD',
              correlationId: expect.any(String)
            }
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ 
            success: true,
            confirmed: true,
            payment: {
              id: 'pay_123', 
              status: 'CONFIRMED',
              creditCardToken: 'token_123'
            }
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ 
            success: true,
            subscription: {
              asaasSubscriptionId: 'sub_123',
              status: 'ACTIVE',
              nextDueDate: '2025-02-01',
              correlationId: expect.any(String)
            }
          })
        });

      const result = await service.processRegistration(mockOrderData);
      
      expect(result.success).toBe(true);
      expect(result.asaasPaymentId).toBe('pay_123');
      expect(result.asaasSubscriptionId).toBe('sub_123');
    });
  });

  describe('Sequência Correta (Comademig Pattern)', () => {
    it('deve seguir sequência: cliente → pagamento → polling → assinatura', async () => {
      const fetchCalls: string[] = [];
      
      (global.fetch as any).mockImplementation((url: string) => {
        if (url.includes('/customers')) {
          fetchCalls.push('customer');
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ id: 'cus_123' })
          });
        }
        if (url.includes('/payments/')) {
          fetchCalls.push('payment-status');
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ id: 'pay_123', status: 'CONFIRMED', creditCardToken: 'token_123' })
          });
        }
        if (url.includes('/payments')) {
          fetchCalls.push('payment');
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ id: 'pay_123', status: 'PENDING', creditCardToken: 'token_123' })
          });
        }
        if (url.includes('/subscriptions')) {
          fetchCalls.push('subscription');
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ id: 'sub_123' })
          });
        }
        return Promise.reject(new Error('URL não mockada'));
      });

      await service.processRegistration(mockOrderData);
      
      // Verificar sequência correta
      expect(fetchCalls[0]).toBe('customer');
      expect(fetchCalls[1]).toBe('payment');
      expect(fetchCalls[2]).toBe('payment-status'); // Polling
      expect(fetchCalls[3]).toBe('subscription');
    });

    it('deve usar /v3/payments para primeira mensalidade', async () => {
      let paymentUrl = '';
      
      (global.fetch as any).mockImplementation((url: string) => {
        if (url.includes('/customers')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ id: 'cus_123' })
          });
        }
        if (url.includes('/payments') && !url.includes('/payments/')) {
          paymentUrl = url;
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ id: 'pay_123', status: 'PENDING' })
          });
        }
        if (url.includes('/payments/')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ id: 'pay_123', status: 'CONFIRMED', creditCardToken: 'token_123' })
          });
        }
        if (url.includes('/subscriptions')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ id: 'sub_123' })
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: 'mock' })
        });
      });

      await service.processRegistration(mockOrderData);
      
      expect(paymentUrl).toContain('/payments');
      expect(paymentUrl).not.toContain('/subscriptions');
    }, 10000);

    it('deve usar /v3/subscriptions SÓ DEPOIS da confirmação', async () => {
      const calls: string[] = [];
      
      (global.fetch as any).mockImplementation((url: string) => {
        if (url.includes('/customers')) {
          calls.push('customer');
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ id: 'cus_123' }) });
        }
        if (url.includes('/payments/')) {
          calls.push('payment-check');
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ status: 'CONFIRMED', creditCardToken: 'token_123' }) });
        }
        if (url.includes('/payments')) {
          calls.push('payment-create');
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ id: 'pay_123', status: 'PENDING', creditCardToken: 'token_123' }) });
        }
        if (url.includes('/subscriptions')) {
          calls.push('subscription-create');
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ id: 'sub_123' }) });
        }
        return Promise.reject(new Error('URL não mockada'));
      });

      await service.processRegistration(mockOrderData);
      
      // Subscription deve ser criada DEPOIS do payment ser confirmado
      const paymentIndex = calls.indexOf('payment-create');
      const checkIndex = calls.indexOf('payment-check');
      const subscriptionIndex = calls.indexOf('subscription-create');
      
      expect(paymentIndex).toBeLessThan(checkIndex);
      expect(checkIndex).toBeLessThan(subscriptionIndex);
    });
  });

  describe('Tratamento de Erros', () => {
    it('deve tratar erro na criação do cliente', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: () => Promise.resolve({ errors: [{ description: 'Email inválido' }] })
      });

      const result = await service.processRegistration(mockOrderData);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Email inválido');
    });

    it('deve tratar timeout no polling', async () => {
      // Mock cliente e pagamento com sucesso
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ id: 'cus_123' })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ id: 'pay_123', status: 'PENDING' })
        });

      // Mock polling sempre retornando PENDING (timeout)
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 'pay_123', status: 'PENDING' })
      });

      const result = await service.processRegistration(mockOrderData);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Timeout');
    }, 20000); // Aumentar timeout para 20 segundos
  });
});