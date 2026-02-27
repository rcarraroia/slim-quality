/**
 * Testes de Integração - Restrições de Status Financeiro
 * 
 * Feature: etapa-1-tipos-afiliados
 * Phase: 5 - Status Restrictions
 * Task: 5.4
 * 
 * Testa que afiliados com status financeiro pendente:
 * - Não recebem comissões
 * - Não podem gerar link de indicação
 * - Veem banner de status no dashboard
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { CommissionCalculatorService } from '@/services/affiliates/commission-calculator.service';

// Configuração do Supabase para testes
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// URL base da API
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

// IDs criados durante os testes (para cleanup)
const createdUserIds: string[] = [];
const createdAffiliateIds: string[] = [];
const createdOrderIds: string[] = [];

describe('Restrições de Status Financeiro', () => {
  
  // Cleanup após todos os testes
  afterAll(async () => {
    // Deletar pedidos criados
    if (createdOrderIds.length > 0) {
      await supabase
        .from('orders')
        .delete()
        .in('id', createdOrderIds);
    }

    // Deletar afiliados criados
    if (createdAffiliateIds.length > 0) {
      await supabase
        .from('affiliates')
        .delete()
        .in('id', createdAffiliateIds);
    }

    // Deletar usuários criados no Auth
    for (const userId of createdUserIds) {
      try {
        await supabase.auth.admin.deleteUser(userId);
      } catch (error) {
        console.error(`Erro ao deletar usuário ${userId}:`, error);
      }
    }
  });

  describe('Comissões', () => {
    
    it('deve pular afiliado com status financeiro_pendente no cálculo de comissões', async () => {
      // Criar afiliado com status pendente
      const { data: authData } = await supabase.auth.admin.createUser({
        email: `pendente.${Date.now()}@test.com`,
        password: 'senha123',
        email_confirm: true
      });

      const userId = authData.user!.id;
      createdUserIds.push(userId);

      const { data: affiliate } = await supabase
        .from('affiliates')
        .insert({
          user_id: userId,
          name: 'Afiliado Pendente',
          email: `pendente.${Date.now()}@test.com`,
          affiliate_type: 'individual',
          financial_status: 'financeiro_pendente',
          referral_code: `PEND${Date.now()}`,
          status: 'active'
        })
        .select()
        .single();

      createdAffiliateIds.push(affiliate!.id);

      // Criar pedido
      const { data: order } = await supabase
        .from('orders')
        .insert({
          total_cents: 329000,
          status: 'paid',
          customer_id: userId
        })
        .select()
        .single();

      createdOrderIds.push(order!.id);

      // Calcular comissões
      const calculator = new CommissionCalculatorService();
      const result = await calculator.calculateCommissions({
        orderId: order!.id,
        orderValue: 329000,
        affiliateN1Id: affiliate!.id
      });

      // Verificar que N1 não recebe comissão (affiliateId é null)
      expect(result.n1.affiliateId).toBeNull();
      expect(result.n1.value).toBe(0);
      
      // Verificar que redistribuição foi aplicada
      expect(result.redistributionApplied).toBe(true);
      expect(result.redistributionDetails?.reason).toBe('inactive_affiliates_or_missing_network');
      
      // Verificar que gestores receberam redistribuição
      expect(result.renum.percentage).toBeGreaterThan(0.05);
      expect(result.jb.percentage).toBeGreaterThan(0.05);
    });

    it('deve permitir comissão para afiliado com status ativo', async () => {
      // Criar afiliado com status ativo
      const { data: authData } = await supabase.auth.admin.createUser({
        email: `ativo.${Date.now()}@test.com`,
        password: 'senha123',
        email_confirm: true
      });

      const userId = authData.user!.id;
      createdUserIds.push(userId);

      const { data: affiliate } = await supabase
        .from('affiliates')
        .insert({
          user_id: userId,
          name: 'Afiliado Ativo',
          email: `ativo.${Date.now()}@test.com`,
          affiliate_type: 'individual',
          financial_status: 'ativo',
          referral_code: `ATIV${Date.now()}`,
          status: 'active'
        })
        .select()
        .single();

      createdAffiliateIds.push(affiliate!.id);

      // Criar pedido
      const { data: order } = await supabase
        .from('orders')
        .insert({
          total_cents: 329000,
          status: 'paid',
          customer_id: userId
        })
        .select()
        .single();

      createdOrderIds.push(order!.id);

      // Calcular comissões
      const calculator = new CommissionCalculatorService();
      const result = await calculator.calculateCommissions({
        orderId: order!.id,
        orderValue: 329000,
        affiliateN1Id: affiliate!.id
      });

      // Verificar que N1 recebe comissão
      expect(result.n1.affiliateId).toBe(affiliate!.id);
      expect(result.n1.value).toBeGreaterThan(0);
      expect(result.n1.percentage).toBe(0.15);
    });

    it('deve pular N2 com status pendente e redistribuir', async () => {
      // Criar N2 com status pendente
      const { data: authDataN2 } = await supabase.auth.admin.createUser({
        email: `n2.pendente.${Date.now()}@test.com`,
        password: 'senha123',
        email_confirm: true
      });

      const userIdN2 = authDataN2.user!.id;
      createdUserIds.push(userIdN2);

      const { data: affiliateN2 } = await supabase
        .from('affiliates')
        .insert({
          user_id: userIdN2,
          name: 'N2 Pendente',
          email: `n2.pendente.${Date.now()}@test.com`,
          affiliate_type: 'individual',
          financial_status: 'financeiro_pendente',
          referral_code: `N2PD${Date.now()}`,
          status: 'active'
        })
        .select()
        .single();

      createdAffiliateIds.push(affiliateN2!.id);

      // Criar N1 com status ativo, referenciando N2
      const { data: authDataN1 } = await supabase.auth.admin.createUser({
        email: `n1.ativo.${Date.now()}@test.com`,
        password: 'senha123',
        email_confirm: true
      });

      const userIdN1 = authDataN1.user!.id;
      createdUserIds.push(userIdN1);

      const { data: affiliateN1 } = await supabase
        .from('affiliates')
        .insert({
          user_id: userIdN1,
          name: 'N1 Ativo',
          email: `n1.ativo.${Date.now()}@test.com`,
          affiliate_type: 'individual',
          financial_status: 'ativo',
          referral_code: `N1AT${Date.now()}`,
          referred_by: affiliateN2!.id,
          status: 'active'
        })
        .select()
        .single();

      createdAffiliateIds.push(affiliateN1!.id);

      // Criar pedido
      const { data: order } = await supabase
        .from('orders')
        .insert({
          total_cents: 329000,
          status: 'paid',
          customer_id: userIdN1
        })
        .select()
        .single();

      createdOrderIds.push(order!.id);

      // Calcular comissões
      const calculator = new CommissionCalculatorService();
      const result = await calculator.calculateCommissions({
        orderId: order!.id,
        orderValue: 329000,
        affiliateN1Id: affiliateN1!.id
      });

      // Verificar que N1 recebe comissão
      expect(result.n1.affiliateId).toBe(affiliateN1!.id);
      expect(result.n1.value).toBeGreaterThan(0);
      
      // Verificar que N2 não recebe comissão
      expect(result.n2.affiliateId).toBeNull();
      expect(result.n2.value).toBe(0);
      
      // Verificar redistribuição
      expect(result.redistributionApplied).toBe(true);
    });
  });

  describe('Link de Indicação', () => {
    
    it('deve bloquear geração de link para afiliado com status pendente', async () => {
      // Criar afiliado com status pendente
      const { data: authData } = await supabase.auth.admin.createUser({
        email: `link.pendente.${Date.now()}@test.com`,
        password: 'senha123',
        email_confirm: true
      });

      const userId = authData.user!.id;
      createdUserIds.push(userId);

      const { data: affiliate } = await supabase
        .from('affiliates')
        .insert({
          user_id: userId,
          name: 'Link Pendente',
          email: `link.pendente.${Date.now()}@test.com`,
          affiliate_type: 'individual',
          financial_status: 'financeiro_pendente',
          referral_code: `LINK${Date.now()}`,
          status: 'active'
        })
        .select()
        .single();

      createdAffiliateIds.push(affiliate!.id);

      // Obter token de autenticação
      const { data: session } = await supabase.auth.signInWithPassword({
        email: `link.pendente.${Date.now()}@test.com`,
        password: 'senha123'
      });

      // Tentar gerar link de indicação
      const response = await fetch(`${API_BASE_URL}/api/affiliates?action=referral-link`, {
        headers: {
          'Authorization': `Bearer ${session.session?.access_token}`
        }
      });

      const data = await response.json();

      // Verificar que foi bloqueado
      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Configure sua carteira digital');
      expect(data.code).toBe('FINANCIAL_STATUS_PENDING');
    });

    it('deve permitir geração de link para afiliado com status ativo', async () => {
      // Criar afiliado com status ativo
      const { data: authData } = await supabase.auth.admin.createUser({
        email: `link.ativo.${Date.now()}@test.com`,
        password: 'senha123',
        email_confirm: true
      });

      const userId = authData.user!.id;
      createdUserIds.push(userId);

      const { data: affiliate } = await supabase
        .from('affiliates')
        .insert({
          user_id: userId,
          name: 'Link Ativo',
          email: `link.ativo.${Date.now()}@test.com`,
          affiliate_type: 'individual',
          financial_status: 'ativo',
          referral_code: `LKAT${Date.now()}`,
          status: 'active'
        })
        .select()
        .single();

      createdAffiliateIds.push(affiliate!.id);

      // Obter token de autenticação
      const { data: session } = await supabase.auth.signInWithPassword({
        email: `link.ativo.${Date.now()}@test.com`,
        password: 'senha123'
      });

      // Gerar link de indicação
      const response = await fetch(`${API_BASE_URL}/api/affiliates?action=referral-link`, {
        headers: {
          'Authorization': `Bearer ${session.session?.access_token}`
        }
      });

      const data = await response.json();

      // Verificar que foi permitido
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.link).toBeDefined();
      expect(data.data.referralCode).toBe(affiliate!.referral_code);
    });
  });
});
