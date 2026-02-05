/**
 * Edge Functions Integration Tests
 * Testes isolados para validar integração com Edge Functions
 */

import { describe, it, expect } from 'vitest';
import { AsaasAdapter } from '@/services/subscriptions/adapters/AsaasAdapter';

describe('Edge Functions Integration', () => {
  let adapter: AsaasAdapter;

  beforeEach(() => {
    adapter = new AsaasAdapter();
  });

  describe('AsaasAdapter Edge Functions', () => {
    it('deve ter configuração correta', () => {
      expect(adapter).toBeDefined();
      // Verificar se tem as variáveis de ambiente necessárias
      expect(process.env.SUPABASE_ANON_KEY).toBeTruthy();
    });

    it('deve conseguir fazer chamada para Edge Function (mock)', async () => {
      // Mock apenas para este teste específico
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          payment: {
            id: 'pay_test_123',
            status: 'PENDING',
            value: 100,
            billingType: 'CREDIT_CARD',
            correlationId: 'test-correlation-123'
          }
        })
      });

      // Substituir fetch apenas para este teste
      const originalFetch = global.fetch;
      global.fetch = mockFetch;

      try {
        const result = await adapter.createPayment({
          customerId: 'cus_test',
          value: 100,
          dueDate: '2025-02-15',
          billingType: 'CREDIT_CARD',
          creditCard: {
            holderName: 'Test User',
            number: '4111111111111111',
            expiryMonth: '12',
            expiryYear: '2025',
            ccv: '123'
          },
          creditCardHolderInfo: {
            name: 'Test User',
            email: 'test@test.com',
            cpfCnpj: '12345678901',
            postalCode: '01234-567',
            addressNumber: '123',
            phone: '11999999999'
          },
          description: 'Test payment',
          externalReference: 'test-correlation-123'
        });

        expect(result).toBeDefined();
        expect(result.id).toBe('pay_test_123');
        expect(result.status).toBe('PENDING');
        expect(mockFetch).toHaveBeenCalledWith(
          'https://vtynmmtuvxreiwcxxlma.supabase.co/functions/v1/create-payment',
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
              'Authorization': expect.stringContaining('Bearer')
            })
          })
        );
      } finally {
        // Restaurar fetch original
        global.fetch = originalFetch;
      }
    });

    it('deve tratar erro de Edge Function corretamente', async () => {
      // Mock de erro
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: () => Promise.resolve('Bad Request')
      });

      const originalFetch = global.fetch;
      global.fetch = mockFetch;

      try {
        await expect(adapter.createPayment({
          customerId: 'cus_test',
          value: 100,
          dueDate: '2025-02-15',
          billingType: 'CREDIT_CARD',
          creditCard: {
            holderName: 'Test User',
            number: '4111111111111111',
            expiryMonth: '12',
            expiryYear: '2025',
            ccv: '123'
          },
          creditCardHolderInfo: {
            name: 'Test User',
            email: 'test@test.com',
            cpfCnpj: '12345678901',
            postalCode: '01234-567',
            addressNumber: '123',
            phone: '11999999999'
          },
          description: 'Test payment',
          externalReference: 'test-correlation-123'
        })).rejects.toThrow('Edge Function error: 400 - Bad Request');
      } finally {
        global.fetch = originalFetch;
      }
    });
  });
});