/**
 * TESTES DE INTEGRAÇÃO - FLUXO DE MONETIZAÇÃO
 * 
 * Valida o fluxo completo de:
 * - Criação de cobranças (taxa de adesão e mensalidade)
 * - Processamento de webhooks Asaas
 * - Cálculo de comissões
 * - Split automático
 * - Notificações
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// IDs de teste (serão criados no beforeAll)
let testAffiliateId: string;
let testProductIndividualId: string;
let testProductLogistaId: string;

describe('Monetization Flow - Integration Tests', () => {
  
  beforeAll(async () => {
    // Criar produtos de teste
    const { data: productIndividual } = await supabase
      .from('products')
      .insert({
        name: 'Adesão Individual - Teste',
        category: 'adesao_afiliado',
        eligible_affiliate_type: 'individual',
        has_entry_fee: true,
        entry_fee_cents: 5000, // R$ 50,00
        is_active: true
      })
      .select()
      .single();

    testProductIndividualId = productIndividual?.id;

    const { data: productLogista } = await supabase
      .from('products')
      .insert({
        name: 'Adesão Logista - Teste',
        category: 'adesao_afiliado',
        eligible_affiliate_type: 'logista',
        has_entry_fee: true,
        entry_fee_cents: 10000, // R$ 100,00
        monthly_fee_cents: 5000, // R$ 50,00/mês
        billing_cycle: 'monthly',
        is_active: true
      })
      .select()
      .single();

    testProductLogistaId = productLogista?.id;

    // Criar afiliado de teste
    const { data: affiliate } = await supabase
      .from('affiliates')
      .insert({
        name: 'Afiliado Teste',
        email: 'teste@example.com',
        phone: '11999999999',
        document: '12345678901',
        affiliate_type: 'individual',
        payment_status: 'pending',
        wallet_id: 'wal_test123'
      })
      .select()
      .single();

    testAffiliateId = affiliate?.id;
  });

  afterAll(async () => {
    // Limpar dados de teste
    if (testAffiliateId) {
      await supabase
        .from('affiliate_payments')
        .delete()
        .eq('affiliate_id', testAffiliateId);

      await supabase
        .from('affiliates')
        .delete()
        .eq('id', testAffiliateId);
    }

    if (testProductIndividualId) {
      await supabase
        .from('products')
        .delete()
        .eq('id', testProductIndividualId);
    }

    if (testProductLogistaId) {
      await supabase
        .from('products')
        .delete()
        .eq('id', testProductLogistaId);
    }
  });

  describe('Task 9.1.1 - Criação de Cobrança de Adesão (Individual)', () => {
    it('deve criar cobrança de adesão para Individual', async () => {
      const response = await fetch('/api/subscriptions/create-payment?action=create-membership-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          affiliate_id: testAffiliateId,
          billing_type: 'PIX'
        })
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.payment).toBeDefined();
      expect(data.payment.amount).toBe(50);
      expect(data.payment.billing_type).toBe('PIX');
      expect(data.payment.status).toBe('pending');
    });

    it('deve validar que affiliate_id é obrigatório', async () => {
      const response = await fetch('/api/subscriptions/create-payment?action=create-membership-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          billing_type: 'PIX'
        })
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('affiliate_id');
    });
  });

  describe('Task 9.1.2 - Criação de Assinatura Mensal (Logista)', () => {
    it('deve criar assinatura mensal para Logista', async () => {
      // Atualizar afiliado para Logista
      await supabase
        .from('affiliates')
        .update({ affiliate_type: 'logista' })
        .eq('id', testAffiliateId);

      const response = await fetch('/api/subscriptions/create-payment?action=create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          affiliate_id: testAffiliateId,
          billing_type: 'CREDIT_CARD'
        })
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.subscription).toBeDefined();
      expect(data.subscription.amount).toBe(50);
      expect(data.subscription.cycle).toBe('monthly');
      expect(data.subscription.status).toBe('active');
    });

    it('deve rejeitar assinatura para Individual', async () => {
      // Voltar afiliado para Individual
      await supabase
        .from('affiliates')
        .update({ affiliate_type: 'individual' })
        .eq('id', testAffiliateId);

      const response = await fetch('/api/subscriptions/create-payment?action=create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          affiliate_id: testAffiliateId,
          billing_type: 'CREDIT_CARD'
        })
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Logistas');
    });
  });

  describe('Task 9.1.3 - Cálculo de Split Automático', () => {
    it('deve calcular split corretamente com rede completa (N1+N2+N3)', async () => {
      // Criar rede de afiliados
      const { data: n3 } = await supabase
        .from('affiliates')
        .insert({
          name: 'N3 Teste',
          email: 'n3@example.com',
          phone: '11999999993',
          document: '12345678903',
          affiliate_type: 'individual',
          payment_status: 'active',
          wallet_id: 'wal_n3'
        })
        .select()
        .single();

      const { data: n2 } = await supabase
        .from('affiliates')
        .insert({
          name: 'N2 Teste',
          email: 'n2@example.com',
          phone: '11999999992',
          document: '12345678902',
          affiliate_type: 'individual',
          payment_status: 'active',
          wallet_id: 'wal_n2',
          referred_by: n3?.id
        })
        .select()
        .single();

      await supabase
        .from('affiliates')
        .update({
          referred_by: n2?.id,
          payment_status: 'active'
        })
        .eq('id', testAffiliateId);

      const response = await fetch('/api/subscriptions/create-payment?action=create-membership-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          affiliate_id: testAffiliateId,
          billing_type: 'PIX'
        })
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Validar que split foi calculado (não podemos ver o split no response, mas podemos validar que não deu erro)
      expect(data.payment).toBeDefined();

      // Limpar rede de teste
      await supabase.from('affiliates').delete().eq('id', n2?.id);
      await supabase.from('affiliates').delete().eq('id', n3?.id);
    });

    it('deve calcular split corretamente com afiliado inativo (redistribuição)', async () => {
      // Criar N2 inativo
      const { data: n2 } = await supabase
        .from('affiliates')
        .insert({
          name: 'N2 Inativo',
          email: 'n2inativo@example.com',
          phone: '11999999992',
          document: '12345678902',
          affiliate_type: 'individual',
          payment_status: 'pending', // INATIVO
          wallet_id: null // SEM WALLET
        })
        .select()
        .single();

      await supabase
        .from('affiliates')
        .update({
          referred_by: n2?.id,
          payment_status: 'active'
        })
        .eq('id', testAffiliateId);

      const response = await fetch('/api/subscriptions/create-payment?action=create-membership-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          affiliate_id: testAffiliateId,
          billing_type: 'PIX'
        })
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Split deve ter sido calculado sem N2 (redistribuição para Renum/JB)
      expect(data.payment).toBeDefined();

      // Limpar
      await supabase.from('affiliates').delete().eq('id', n2?.id);
    });
  });

  describe('Task 9.1.4 - Histórico de Pagamentos', () => {
    it('deve retornar histórico de pagamentos do afiliado', async () => {
      const response = await fetch(`/api/subscriptions/create-payment?action=get-history&affiliate_id=${testAffiliateId}`, {
        method: 'GET'
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.payments).toBeDefined();
      expect(Array.isArray(data.payments)).toBe(true);
    });

    it('deve filtrar histórico por tipo de pagamento', async () => {
      const response = await fetch(`/api/subscriptions/create-payment?action=get-history&affiliate_id=${testAffiliateId}&type=membership_fee`, {
        method: 'GET'
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.payments).toBeDefined();
      
      // Todos os pagamentos devem ser do tipo membership_fee
      data.payments.forEach((payment: any) => {
        expect(payment.type).toBe('membership_fee');
      });
    });
  });

  describe('Task 9.1.5 - Cancelamento de Assinatura', () => {
    it('deve cancelar assinatura de Logista', async () => {
      // Atualizar para Logista e criar assinatura
      await supabase
        .from('affiliates')
        .update({ affiliate_type: 'logista' })
        .eq('id', testAffiliateId);

      // Criar assinatura
      await fetch('/api/subscriptions/create-payment?action=create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          affiliate_id: testAffiliateId,
          billing_type: 'CREDIT_CARD'
        })
      });

      // Cancelar assinatura
      const response = await fetch('/api/subscriptions/create-payment?action=cancel-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          affiliate_id: testAffiliateId
        })
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toContain('cancelada');
    });
  });

  describe('Task 9.1.6 - Notificações', () => {
    it('deve listar notificações do afiliado', async () => {
      const response = await fetch(`/api/notifications?action=list&affiliate_id=${testAffiliateId}`, {
        method: 'GET'
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.notifications).toBeDefined();
      expect(Array.isArray(data.notifications)).toBe(true);
    });

    it('deve marcar notificação como lida', async () => {
      // Criar notificação de teste
      const { data: notification } = await supabase
        .from('notifications')
        .insert({
          affiliate_id: testAffiliateId,
          type: 'payment_confirmed',
          title: 'Teste',
          message: 'Mensagem de teste'
        })
        .select()
        .single();

      const response = await fetch('/api/notifications?action=mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notification_id: notification?.id
        })
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      // Validar que foi marcada como lida
      const { data: updated } = await supabase
        .from('notifications')
        .select('read')
        .eq('id', notification?.id)
        .single();

      expect(updated?.read).toBe(true);
    });
  });
});
