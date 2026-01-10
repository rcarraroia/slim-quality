/**
 * Affiliate Commission Flow Integration Tests
 * Sprint 4: Sistema de Afiliados Multinível
 * 
 * Testes de integração para o fluxo completo:
 * 1. Cadastro de afiliados
 * 2. Rastreamento de cliques
 * 3. Criação de pedido
 * 4. Webhook de pagamento confirmado
 * 5. Cálculo automático de comissões
 * 6. Split no Asaas
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { supabase } from '@/config/supabase';
import { affiliateService } from '@/services/affiliates/affiliate.service';
import { referralTrackerService } from '@/services/affiliates/referral-tracker.service';
import { webhookService } from '@/services/asaas/webhook.service';
import type { CreateAffiliateRequest } from '@/types/affiliate.types';

// Mock das APIs externas
vi.mock('@/config/supabase');
vi.mock('@/utils/logger');

describe('Affiliate Commission Flow Integration', () => {
  let testData: {
    affiliateN3: any;
    affiliateN2: any;
    affiliateN1: any;
    order: any;
    payment: any;
  };

  beforeEach(async () => {
    // Limpar dados de teste
    await cleanupTestData();
    
    // Preparar dados de teste
    testData = await setupTestData();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('Fluxo Completo: Rede de 3 Níveis', () => {
    it('deve processar comissão completa do cadastro ao pagamento', async () => {
      // 1. Verificar que afiliados foram cadastrados corretamente
      expect(testData.affiliateN1).toBeDefined();
      expect(testData.affiliateN2).toBeDefined();
      expect(testData.affiliateN3).toBeDefined();

      // 2. Simular clique no link do afiliado N1
      const clickResult = await referralTrackerService.trackClick({
        referralCode: testData.affiliateN1.referral_code,
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 Test Browser',
        utmSource: 'facebook',
        utmMedium: 'social',
        utmCampaign: 'test_campaign',
      });

      expect(clickResult.success).toBe(true);
      expect(clickResult.data?.referralCode).toBe(testData.affiliateN1.referral_code);

      // 3. Simular conversão (pedido criado)
      const conversionResult = await referralTrackerService.trackConversion({
        orderId: testData.order.id,
        referralCode: testData.affiliateN1.referral_code,
      });

      expect(conversionResult.success).toBe(true);
      expect(conversionResult.data?.orderId).toBe(testData.order.id);

      // 4. Simular webhook de pagamento confirmado
      const webhookPayload = {
        id: 'evt_test_123',
        event: 'PAYMENT_CONFIRMED' as const,
        payment: {
          id: testData.payment.asaas_payment_id,
          value: 3290.00,
          netValue: 3150.00,
          status: 'CONFIRMED',
        },
      };

      const webhookResult = await webhookService.processWebhook(
        webhookPayload,
        'valid_webhook_token'
      );

      expect(webhookResult.success).toBe(true);

      // 5. Verificar que comissões foram calculadas
      await new Promise(resolve => setTimeout(resolve, 1000)); // Aguardar processamento assíncrono

      const { data: commissions } = await supabase
        .from('commissions')
        .select('*')
        .eq('order_id', testData.order.id);

      expect(commissions).toHaveLength(3); // N1, N2, N3

      // Verificar comissão N1 (15%)
      const n1Commission = commissions.find(c => c.level === 1);
      expect(n1Commission).toBeDefined();
      expect(n1Commission.percentage).toBe(15.00);
      expect(n1Commission.commission_value_cents).toBe(49350); // 15% de R$ 329,00

      // Verificar comissão N2 (3%)
      const n2Commission = commissions.find(c => c.level === 2);
      expect(n2Commission).toBeDefined();
      expect(n2Commission.percentage).toBe(3.00);
      expect(n2Commission.commission_value_cents).toBe(9870); // 3% de R$ 329,00

      // Verificar comissão N3 (2%)
      const n3Commission = commissions.find(c => c.level === 3);
      expect(n3Commission).toBeDefined();
      expect(n3Commission.percentage).toBe(2.00);
      expect(n3Commission.commission_value_cents).toBe(6580); // 2% de R$ 329,00

      // 6. Verificar que split foi criado
      const { data: commissionSplit } = await supabase
        .from('commission_splits')
        .select('*')
        .eq('order_id', testData.order.id)
        .single();

      expect(commissionSplit).toBeDefined();
      expect(commissionSplit.total_order_value_cents).toBe(329000);
      expect(commissionSplit.factory_percentage).toBe(70.00);
      expect(commissionSplit.commission_percentage).toBe(30.00);

      // Verificar distribuição sem redistribuição (rede completa)
      expect(commissionSplit.n1_percentage).toBe(15.00);
      expect(commissionSplit.n2_percentage).toBe(3.00);
      expect(commissionSplit.n3_percentage).toBe(2.00);
      expect(commissionSplit.renum_percentage).toBe(5.00);
      expect(commissionSplit.jb_percentage).toBe(5.00);
      expect(commissionSplit.redistribution_applied).toBe(false);

      // 7. Verificar logs de auditoria
      const { data: logs } = await supabase
        .from('commission_logs')
        .select('*')
        .eq('order_id', testData.order.id);

      expect(logs.length).toBeGreaterThan(0);
      
      const calculationLog = logs.find(l => l.operation_type === 'commission_calculated');
      expect(calculationLog).toBeDefined();
      expect(calculationLog.success).toBe(true);
    });
  });

  describe('Fluxo com Redistribuição: Apenas N1', () => {
    it('deve aplicar redistribuição quando apenas N1 existe', async () => {
      // Criar apenas um afiliado (sem rede)
      const soloAffiliate = await createTestAffiliate({
        name: 'Afiliado Solo',
        email: 'solo@test.com',
        walletId: 'wal_solo12345678901234567890',
      });

      // Simular fluxo completo
      await referralTrackerService.trackClick({
        referralCode: soloAffiliate.referral_code,
        ipAddress: '192.168.1.101',
      });

      await referralTrackerService.trackConversion({
        orderId: testData.order.id,
        referralCode: soloAffiliate.referral_code,
      });

      const webhookPayload = {
        id: 'evt_solo_123',
        event: 'PAYMENT_CONFIRMED' as const,
        payment: {
          id: testData.payment.asaas_payment_id,
          value: 3290.00,
          status: 'CONFIRMED',
        },
      };

      await webhookService.processWebhook(webhookPayload, 'valid_webhook_token');
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verificar redistribuição
      const { data: commissionSplit } = await supabase
        .from('commission_splits')
        .select('*')
        .eq('order_id', testData.order.id)
        .single();

      expect(commissionSplit.redistribution_applied).toBe(true);
      expect(commissionSplit.n1_percentage).toBe(15.00);
      expect(commissionSplit.n2_percentage).toBeNull();
      expect(commissionSplit.n3_percentage).toBeNull();
      expect(commissionSplit.renum_percentage).toBe(7.50); // 5% + 2.5%
      expect(commissionSplit.jb_percentage).toBe(7.50);    // 5% + 2.5%

      // Verificar que apenas uma comissão foi criada (N1)
      const { data: commissions } = await supabase
        .from('commissions')
        .select('*')
        .eq('order_id', testData.order.id);

      expect(commissions).toHaveLength(1);
      expect(commissions[0].level).toBe(1);
      expect(commissions[0].percentage).toBe(15.00);
    });
  });

  describe('Fluxo sem Afiliados', () => {
    it('deve processar pedido sem afiliados corretamente', async () => {
      // Criar pedido sem afiliado
      const directOrder = await createTestOrder(null);

      const webhookPayload = {
        id: 'evt_direct_123',
        event: 'PAYMENT_CONFIRMED' as const,
        payment: {
          id: directOrder.payment.asaas_payment_id,
          value: 3290.00,
          status: 'CONFIRMED',
        },
      };

      await webhookService.processWebhook(webhookPayload, 'valid_webhook_token');
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verificar que nenhuma comissão foi criada
      const { data: commissions } = await supabase
        .from('commissions')
        .select('*')
        .eq('order_id', directOrder.order.id);

      expect(commissions).toHaveLength(0);

      // Verificar que split não foi criado (sem comissões)
      const { data: commissionSplit } = await supabase
        .from('commission_splits')
        .select('*')
        .eq('order_id', directOrder.order.id)
        .single();

      expect(commissionSplit).toBeNull();
    });
  });

  describe('Tratamento de Erros', () => {
    it('deve tratar erro de Wallet ID inválida graciosamente', async () => {
      const invalidAffiliateData: CreateAffiliateRequest = {
        name: 'Afiliado Inválido',
        email: 'invalid@test.com',
        walletId: 'wal_invalid_wallet_id', // Wallet inválida
      };

      const result = await affiliateService.createAffiliate(invalidAffiliateData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Wallet ID');
    });

    it('deve tratar erro de código de referência inválido', async () => {
      const invalidReferralData: CreateAffiliateRequest = {
        name: 'Afiliado com Referência Inválida',
        email: 'invalid_ref@test.com',
        walletId: 'wal_valid12345678901234567890',
        referralCode: 'INVALID_CODE', // Código inexistente
      };

      const result = await affiliateService.createAffiliate(invalidReferralData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Código de indicação');
    });

    it('deve tratar falha no cálculo de comissões', async () => {
      // Mock falha na Edge Function
      vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
        data: { success: false, error: 'Calculation failed' },
        error: null,
      });

      const webhookPayload = {
        id: 'evt_error_123',
        event: 'PAYMENT_CONFIRMED' as const,
        payment: {
          id: testData.payment.asaas_payment_id,
          value: 3290.00,
          status: 'CONFIRMED',
        },
      };

      const result = await webhookService.processWebhook(webhookPayload, 'valid_webhook_token');

      // Webhook deve continuar funcionando mesmo com erro de comissão
      expect(result.success).toBe(true);

      // Verificar que erro foi registrado nos logs
      const { data: logs } = await supabase
        .from('commission_logs')
        .select('*')
        .eq('order_id', testData.order.id)
        .eq('success', false);

      expect(logs.length).toBeGreaterThan(0);
    });
  });

  describe('Performance e Concorrência', () => {
    it('deve processar múltiplos webhooks do mesmo pedido (idempotência)', async () => {
      const webhookPayload = {
        id: 'evt_duplicate_123',
        event: 'PAYMENT_CONFIRMED' as const,
        payment: {
          id: testData.payment.asaas_payment_id,
          value: 3290.00,
          status: 'CONFIRMED',
        },
      };

      // Processar o mesmo webhook múltiplas vezes
      const results = await Promise.all([
        webhookService.processWebhook(webhookPayload, 'valid_webhook_token'),
        webhookService.processWebhook(webhookPayload, 'valid_webhook_token'),
        webhookService.processWebhook(webhookPayload, 'valid_webhook_token'),
      ]);

      // Todos devem retornar sucesso (idempotência)
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      // Verificar que comissões não foram duplicadas
      const { data: commissions } = await supabase
        .from('commissions')
        .select('*')
        .eq('order_id', testData.order.id);

      expect(commissions).toHaveLength(3); // Apenas uma vez
    });
  });
});

// ============================================
// FUNÇÕES AUXILIARES DE TESTE
// ============================================

async function setupTestData() {
  // Criar afiliados em cadeia (N3 → N2 → N1)
  const affiliateN3 = await createTestAffiliate({
    name: 'Afiliado N3',
    email: 'n3@test.com',
    walletId: 'wal_n3_12345678901234567890',
  });

  const affiliateN2 = await createTestAffiliate({
    name: 'Afiliado N2',
    email: 'n2@test.com',
    walletId: 'wal_n2_12345678901234567890',
    referralCode: affiliateN3.referral_code,
  });

  const affiliateN1 = await createTestAffiliate({
    name: 'Afiliado N1',
    email: 'n1@test.com',
    walletId: 'wal_n1_12345678901234567890',
    referralCode: affiliateN2.referral_code,
  });

  // Criar pedido e pagamento
  const { order, payment } = await createTestOrder(affiliateN1.user_id);

  return {
    affiliateN3,
    affiliateN2,
    affiliateN1,
    order,
    payment,
  };
}

async function createTestAffiliate(data: CreateAffiliateRequest) {
  // Mock validação de Wallet ID
  vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
    data: {
      isValid: true,
      isActive: true,
      name: `Test Wallet ${data.name}`,
    },
    error: null,
  });

  const result = await affiliateService.createAffiliate(data);
  
  if (!result.success) {
    throw new Error(`Failed to create test affiliate: ${result.error}`);
  }

  // Ativar afiliado automaticamente para testes
  await affiliateService.updateAffiliateStatus(
    result.data!.id,
    { status: 'active' },
    'test_admin'
  );

  return result.data!;
}

async function createTestOrder(affiliateUserId?: string) {
  // Criar pedido de teste
  const { data: order } = await supabase
    .from('orders')
    .insert({
      order_number: `TEST-${Date.now()}`,
      customer_id: 'test_customer_id',
      customer_name: 'Cliente Teste',
      customer_email: 'cliente@test.com',
      total_cents: 329000, // R$ 3.290,00
      status: 'pending',
      affiliate_n1_id: affiliateUserId,
    })
    .select()
    .single();

  // Criar pagamento associado
  const { data: payment } = await supabase
    .from('payments')
    .insert({
      order_id: order.id,
      payment_method: 'pix',
      amount_cents: 329000,
      status: 'pending',
      asaas_payment_id: `pay_test_${Date.now()}`,
    })
    .select()
    .single();

  return { order, payment };
}

async function cleanupTestData() {
  // Limpar dados de teste em ordem reversa de dependência
  await supabase.from('commission_logs').delete().like('order_id', 'test_%');
  await supabase.from('commission_splits').delete().like('order_id', 'test_%');
  await supabase.from('commissions').delete().like('order_id', 'test_%');
  await supabase.from('referral_conversions').delete().like('order_id', 'test_%');
  await supabase.from('referral_clicks').delete().like('referral_code', 'TEST%');
  await supabase.from('payments').delete().like('asaas_payment_id', 'pay_test_%');
  await supabase.from('orders').delete().like('order_number', 'TEST-%');
  // affiliate_network deprecada - view materializada é atualizada automaticamente via trigger
  await supabase.from('affiliates').delete().like('email', '%@test.com');
}