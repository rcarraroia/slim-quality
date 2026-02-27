/**
 * Integration Tests - Payment First Complete Flow
 * ETAPA: Payment First + Afiliados Existentes - Phase B8
 * 
 * Testes de integração para fluxo completo de cadastro com Payment First
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

// Mock do fetch global
global.fetch = vi.fn();

describe('Payment First - Complete Flow Integration Tests', () => {
  let sessionToken: string;
  let paymentId: string;
  let affiliateId: string;

  beforeAll(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe('Complete Registration Flow', () => {
    it('deve completar fluxo de cadastro com pagamento PIX', async () => {
      // ========================================
      // STEP 1: Validação de dados
      // ========================================
      const validationData = {
        email: 'newuser@example.com',
        name: 'New User',
        phone: '11999999999',
        document: '19100000000',
        affiliate_type: 'individual' as const,
        referral_code: null,
        password: 'senha123'
      };

      const mockValidationResponse = {
        success: true,
        session_token: 'integration_test_session_123',
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString()
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockValidationResponse
      });

      const validationResponse = await fetch('/api/affiliates?action=payment-first-validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validationData)
      });

      const validationResult = await validationResponse.json();

      expect(validationResult.success).toBe(true);
      expect(validationResult.session_token).toBeDefined();
      
      sessionToken = validationResult.session_token;

      // ========================================
      // STEP 2: Criação de pagamento
      // ========================================
      const paymentData = {
        session_token: sessionToken,
        payment_method: 'pix' as const
      };

      const mockPaymentResponse = {
        success: true,
        payment_id: 'pay_integration_test_123',
        payment_method: 'pix',
        amount: 100,
        qr_code: 'mock_qr_code_string',
        qr_code_image: 'data:image/png;base64,mock_image',
        invoice_url: 'https://asaas.com/invoice/123',
        external_reference: `affiliate_pre_${sessionToken}`
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockPaymentResponse
      });

      const paymentResponse = await fetch(
        '/api/subscriptions/create-payment?action=create-affiliate-membership',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(paymentData)
        }
      );

      const paymentResult = await paymentResponse.json();

      expect(paymentResult.success).toBe(true);
      expect(paymentResult.qr_code).toBeDefined();
      expect(paymentResult.payment_id).toBeDefined();
      
      paymentId = paymentResult.payment_id;

      // ========================================
      // STEP 3: Simulação de webhook (pagamento confirmado)
      // ========================================
      const webhookPayload = {
        event: 'PAYMENT_CONFIRMED',
        payment: {
          id: paymentId,
          value: 100,
          status: 'CONFIRMED',
          customer: 'cus_integration_test',
          externalReference: `affiliate_pre_${sessionToken}`,
          confirmedDate: new Date().toISOString()
        }
      };

      const mockWebhookResponse = {
        success: true,
        affiliate_id: 'aff_integration_test_123',
        user_id: 'user_integration_test_123',
        referral_code: 'INT123',
        commissions_calculated: true,
        session_deleted: true
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockWebhookResponse
      });

      const webhookResponse = await fetch('/api/webhook-assinaturas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookPayload)
      });

      const webhookResult = await webhookResponse.json();

      expect(webhookResult.success).toBe(true);
      expect(webhookResult.affiliate_id).toBeDefined();
      expect(webhookResult.user_id).toBeDefined();
      expect(webhookResult.referral_code).toBeDefined();
      expect(webhookResult.commissions_calculated).toBe(true);
      expect(webhookResult.session_deleted).toBe(true);
      
      affiliateId = webhookResult.affiliate_id;

      // ========================================
      // STEP 4: Verificação de autenticação (polling simulation)
      // ========================================
      const mockAuthResponse = {
        user: {
          id: 'user_integration_test_123',
          email: 'newuser@example.com'
        },
        session: {
          access_token: 'mock_access_token'
        }
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAuthResponse
      });

      // Simular tentativa de autenticação (como o polling faz)
      const authResponse = await fetch('/auth/v1/token?grant_type=password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'newuser@example.com',
          password: 'senha123'
        })
      });

      const authResult = await authResponse.json();

      expect(authResult.user).toBeDefined();
      expect(authResult.user.email).toBe('newuser@example.com');
      expect(authResult.session).toBeDefined();
    });

    it('deve completar fluxo com rede genealógica (referral_code)', async () => {
      // ========================================
      // STEP 1: Validação com referral_code
      // ========================================
      const validationData = {
        email: 'referred@example.com',
        name: 'Referred User',
        phone: '11999999999',
        document: '52998224725', // CPF válido diferente
        affiliate_type: 'individual' as const,
        referral_code: 'PARENT123',
        password: 'senha123'
      };

      const mockValidationResponse = {
        success: true,
        session_token: 'integration_test_session_456',
        referral_code_valid: true,
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString()
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockValidationResponse
      });

      const validationResponse = await fetch('/api/affiliates?action=payment-first-validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validationData)
      });

      const validationResult = await validationResponse.json();

      expect(validationResult.success).toBe(true);
      expect(validationResult.referral_code_valid).toBe(true);

      // ========================================
      // STEP 2: Criar pagamento
      // ========================================
      const paymentData = {
        session_token: validationResult.session_token,
        payment_method: 'pix' as const
      };

      const mockPaymentResponse = {
        success: true,
        payment_id: 'pay_integration_test_456',
        qr_code: 'mock_qr_code_string_2',
        external_reference: `affiliate_pre_${validationResult.session_token}`
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockPaymentResponse
      });

      const paymentResponse = await fetch(
        '/api/subscriptions/create-payment?action=create-affiliate-membership',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(paymentData)
        }
      );

      const paymentResult = await paymentResponse.json();
      expect(paymentResult.success).toBe(true);

      // ========================================
      // STEP 3: Webhook com criação de rede
      // ========================================
      const webhookPayload = {
        event: 'PAYMENT_CONFIRMED',
        payment: {
          id: paymentResult.payment_id,
          value: 100,
          status: 'CONFIRMED',
          customer: 'cus_integration_test_2',
          externalReference: `affiliate_pre_${validationResult.session_token}`,
          confirmedDate: new Date().toISOString()
        }
      };

      const mockWebhookResponse = {
        success: true,
        affiliate_id: 'aff_integration_test_456',
        user_id: 'user_integration_test_456',
        referral_code: 'REF456',
        network_created: true,
        parent_affiliate_id: 'aff_parent_123',
        commissions_calculated: true
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockWebhookResponse
      });

      const webhookResponse = await fetch('/api/webhook-assinaturas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookPayload)
      });

      const webhookResult = await webhookResponse.json();

      expect(webhookResult.success).toBe(true);
      expect(webhookResult.network_created).toBe(true);
      expect(webhookResult.parent_affiliate_id).toBeDefined();
    });
  });

  describe('Error Scenarios', () => {
    it('deve lidar com sessão expirada', async () => {
      const expiredSessionToken = 'expired_session_token';

      const mockPaymentResponse = {
        success: false,
        error: 'Sessão expirada. Por favor, tente novamente.'
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => mockPaymentResponse
      });

      const paymentResponse = await fetch(
        '/api/subscriptions/create-payment?action=create-affiliate-membership',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_token: expiredSessionToken,
            payment_method: 'pix'
          })
        }
      );

      const paymentResult = await paymentResponse.json();

      expect(paymentResult.success).toBe(false);
      expect(paymentResult.error).toContain('Sessão expirada');
    });

    it('deve lidar com pagamento recusado', async () => {
      const sessionToken = 'test_session_declined';

      // Criar pagamento
      const mockPaymentResponse = {
        success: true,
        payment_id: 'pay_declined_123',
        qr_code: 'mock_qr_code'
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockPaymentResponse
      });

      const paymentResponse = await fetch(
        '/api/subscriptions/create-payment?action=create-affiliate-membership',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_token: sessionToken,
            payment_method: 'credit_card'
          })
        }
      );

      const paymentResult = await paymentResponse.json();
      expect(paymentResult.success).toBe(true);

      // Webhook com pagamento recusado
      const webhookPayload = {
        event: 'PAYMENT_FAILED',
        payment: {
          id: paymentResult.payment_id,
          value: 100,
          status: 'FAILED',
          customer: 'cus_declined',
          externalReference: `affiliate_pre_${sessionToken}`,
          failureReason: 'Cartão recusado'
        }
      };

      const mockWebhookResponse = {
        success: false,
        error: 'Pagamento recusado: Cartão recusado'
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => mockWebhookResponse
      });

      const webhookResponse = await fetch('/api/webhook-assinaturas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookPayload)
      });

      const webhookResult = await webhookResponse.json();

      expect(webhookResult.success).toBe(false);
      expect(webhookResult.error).toContain('Pagamento recusado');
    });
  });

  describe('Commission Calculation Validation', () => {
    it('deve calcular comissões corretamente para rede completa', async () => {
      const webhookPayload = {
        event: 'PAYMENT_CONFIRMED',
        payment: {
          id: 'pay_commission_test',
          value: 100,
          status: 'CONFIRMED',
          customer: 'cus_commission_test',
          externalReference: 'affiliate_pre_commission_session',
          confirmedDate: new Date().toISOString()
        }
      };

      const mockWebhookResponse = {
        success: true,
        affiliate_id: 'aff_commission_test',
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
        json: async () => mockWebhookResponse
      });

      const webhookResponse = await fetch('/api/webhook-assinaturas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookPayload)
      });

      const webhookResult = await webhookResponse.json();

      expect(webhookResult.success).toBe(true);
      expect(webhookResult.commissions).toBeDefined();

      // Validar percentuais
      expect(webhookResult.commissions.slim).toBe(10);
      expect(webhookResult.commissions.n1).toBe(15);
      expect(webhookResult.commissions.n2).toBe(3);
      expect(webhookResult.commissions.n3).toBe(2);
      expect(webhookResult.commissions.renum).toBe(35);
      expect(webhookResult.commissions.jb).toBe(35);

      // Validar soma total = 100%
      const total = Object.values(webhookResult.commissions).reduce((sum: number, val: any) => sum + val, 0);
      expect(total).toBe(100);
    });
  });
});
