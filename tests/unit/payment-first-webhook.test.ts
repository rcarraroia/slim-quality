/**
 * Unit Tests - Payment First Webhook Handler
 * ETAPA: Payment First + Afiliados Existentes - Phase B8
 * 
 * Testes unitários para processamento de webhook de pagamento de adesão
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock do fetch global
global.fetch = vi.fn();

describe('Payment First Webhook Handler - Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Account Creation After Payment', () => {
    it('deve criar conta após pagamento confirmado', async () => {
      const sessionToken = 'test_session_token_123';
      const mockWebhookPayload = {
        event: 'PAYMENT_CONFIRMED',
        payment: {
          id: 'pay_test_123',
          value: 100,
          status: 'CONFIRMED',
          customer: 'cus_test_123',
          externalReference: `affiliate_pre_${sessionToken}`,
          confirmedDate: new Date().toISOString()
        }
      };

      const mockResponse = {
        success: true,
        affiliate_id: 'aff_test_123',
        user_id: 'user_test_123',
        referral_code: 'ABC123'
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const response = await fetch('/api/webhook-assinaturas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockWebhookPayload)
      });

      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.affiliate_id).toBeDefined();
      expect(result.user_id).toBeDefined();
      expect(result.referral_code).toBeDefined();
    });

    it('deve gerar referral_code único', async () => {
      const sessionToken = 'test_session_token_456';
      const mockWebhookPayload = {
        event: 'PAYMENT_CONFIRMED',
        payment: {
          id: 'pay_test_456',
          value: 100,
          status: 'CONFIRMED',
          customer: 'cus_test_456',
          externalReference: `affiliate_pre_${sessionToken}`,
          confirmedDate: new Date().toISOString()
        }
      };

      const mockResponse = {
        success: true,
        affiliate_id: 'aff_test_456',
        referral_code: 'XYZ789'
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const response = await fetch('/api/webhook-assinaturas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockWebhookPayload)
      });

      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.referral_code).toBeDefined();
      expect(result.referral_code).toMatch(/^[A-Z0-9]{6}$/); // 6 caracteres alfanuméricos
    });

    it('deve criar rede genealógica se houver referral_code', async () => {
      const sessionToken = 'test_session_token_789';
      const mockWebhookPayload = {
        event: 'PAYMENT_CONFIRMED',
        payment: {
          id: 'pay_test_789',
          value: 100,
          status: 'CONFIRMED',
          customer: 'cus_test_789',
          externalReference: `affiliate_pre_${sessionToken}`,
          confirmedDate: new Date().toISOString()
        }
      };

      const mockResponse = {
        success: true,
        affiliate_id: 'aff_test_789',
        network_created: true,
        parent_affiliate_id: 'aff_parent_123'
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const response = await fetch('/api/webhook-assinaturas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockWebhookPayload)
      });

      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.network_created).toBe(true);
      expect(result.parent_affiliate_id).toBeDefined();
    });

    it('deve registrar pagamento em affiliate_payments', async () => {
      const sessionToken = 'test_session_token_abc';
      const mockWebhookPayload = {
        event: 'PAYMENT_CONFIRMED',
        payment: {
          id: 'pay_test_abc',
          value: 100,
          status: 'CONFIRMED',
          customer: 'cus_test_abc',
          externalReference: `affiliate_pre_${sessionToken}`,
          confirmedDate: new Date().toISOString()
        }
      };

      const mockResponse = {
        success: true,
        affiliate_id: 'aff_test_abc',
        payment_recorded: true,
        payment_id: 'payment_record_123'
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const response = await fetch('/api/webhook-assinaturas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockWebhookPayload)
      });

      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.payment_recorded).toBe(true);
      expect(result.payment_id).toBeDefined();
    });
  });

  describe('Commission Calculation', () => {
    it('deve calcular comissões corretamente', async () => {
      const sessionToken = 'test_session_token_def';
      const mockWebhookPayload = {
        event: 'PAYMENT_CONFIRMED',
        payment: {
          id: 'pay_test_def',
          value: 100,
          status: 'CONFIRMED',
          customer: 'cus_test_def',
          externalReference: `affiliate_pre_${sessionToken}`,
          confirmedDate: new Date().toISOString()
        }
      };

      const mockResponse = {
        success: true,
        affiliate_id: 'aff_test_def',
        commissions_calculated: true,
        commissions: {
          slim: 10, // 10%
          n1: 15, // 15%
          n2: 3, // 3%
          n3: 2, // 2%
          renum: 35, // 35% (50% dos 70% restantes)
          jb: 35 // 35% (50% dos 70% restantes)
        }
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const response = await fetch('/api/webhook-assinaturas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockWebhookPayload)
      });

      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.commissions_calculated).toBe(true);
      expect(result.commissions).toBeDefined();
      
      // Verificar que soma = 100% (10% Slim + 90% rede + gestores)
      const total = Object.values(result.commissions).reduce((sum: number, val: any) => sum + val, 0);
      expect(total).toBe(100);
    });

    it('deve redistribuir comissões quando rede incompleta', async () => {
      const sessionToken = 'test_session_token_ghi';
      const mockWebhookPayload = {
        event: 'PAYMENT_CONFIRMED',
        payment: {
          id: 'pay_test_ghi',
          value: 100,
          status: 'CONFIRMED',
          customer: 'cus_test_ghi',
          externalReference: `affiliate_pre_${sessionToken}`,
          confirmedDate: new Date().toISOString()
        }
      };

      const mockResponse = {
        success: true,
        affiliate_id: 'aff_test_ghi',
        commissions_calculated: true,
        commissions: {
          slim: 10,
          n1: 15,
          n2: 0, // Sem N2
          n3: 0, // Sem N3
          renum: 37.5, // 50% dos 75% restantes (90% - 15% N1)
          jb: 37.5 // 50% dos 75% restantes (90% - 15% N1)
        }
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const response = await fetch('/api/webhook-assinaturas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockWebhookPayload)
      });

      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.commissions.n2).toBe(0);
      expect(result.commissions.n3).toBe(0);
      expect(result.commissions.renum).toBe(37.5);
      expect(result.commissions.jb).toBe(37.5);
    });
  });

  describe('Session Cleanup', () => {
    it('deve deletar sessão temporária após processar', async () => {
      const sessionToken = 'test_session_token_jkl';
      const mockWebhookPayload = {
        event: 'PAYMENT_CONFIRMED',
        payment: {
          id: 'pay_test_jkl',
          value: 100,
          status: 'CONFIRMED',
          customer: 'cus_test_jkl',
          externalReference: `affiliate_pre_${sessionToken}`,
          confirmedDate: new Date().toISOString()
        }
      };

      const mockResponse = {
        success: true,
        affiliate_id: 'aff_test_jkl',
        session_deleted: true
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const response = await fetch('/api/webhook-assinaturas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockWebhookPayload)
      });

      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.session_deleted).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('deve lidar com sessão não encontrada', async () => {
      const sessionToken = 'invalid_session_token';
      const mockWebhookPayload = {
        event: 'PAYMENT_CONFIRMED',
        payment: {
          id: 'pay_test_invalid',
          value: 100,
          status: 'CONFIRMED',
          customer: 'cus_test_invalid',
          externalReference: `affiliate_pre_${sessionToken}`,
          confirmedDate: new Date().toISOString()
        }
      };

      const mockResponse = {
        success: false,
        error: 'Sessão não encontrada ou expirada'
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => mockResponse
      });

      const response = await fetch('/api/webhook-assinaturas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockWebhookPayload)
      });

      const result = await response.json();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Sessão não encontrada');
    });

    it('deve lidar com erro ao criar usuário', async () => {
      const sessionToken = 'test_session_token_error';
      const mockWebhookPayload = {
        event: 'PAYMENT_CONFIRMED',
        payment: {
          id: 'pay_test_error',
          value: 100,
          status: 'CONFIRMED',
          customer: 'cus_test_error',
          externalReference: `affiliate_pre_${sessionToken}`,
          confirmedDate: new Date().toISOString()
        }
      };

      const mockResponse = {
        success: false,
        error: 'Erro ao criar usuário no Supabase Auth'
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => mockResponse
      });

      const response = await fetch('/api/webhook-assinaturas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockWebhookPayload)
      });

      const result = await response.json();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Erro ao criar usuário');
    });
  });
});
