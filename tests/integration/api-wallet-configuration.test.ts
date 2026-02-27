/**
 * Testes de Integração - Configuração de Wallet (ETAPA 2)
 * 
 * Testa endpoints de criação de conta Asaas e configuração de wallet
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const API_BASE_URL = process.env.VITE_API_URL || 'http://localhost:3000/api';

describe('API Integration - Wallet Configuration (ETAPA 2)', () => {
  let authToken: string;
  let affiliateId: string;
  let testEmail: string;

  beforeAll(async () => {
    // Criar usuário de teste
    testEmail = `test-wallet-${Date.now()}@example.com`;
    
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: testEmail,
      password: 'Test123!@#'
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('Usuário não criado');

    authToken = authData.session?.access_token || '';

    // Criar afiliado de teste
    const { data: affiliate, error: affiliateError } = await supabase
      .from('affiliates')
      .insert({
        user_id: authData.user.id,
        name: 'Test Wallet User',
        email: testEmail,
        document: '12345678910',
        document_type: 'CPF',
        affiliate_type: 'individual',
        financial_status: 'financeiro_pendente',
        referral_code: `TEST${Date.now()}`
      })
      .select()
      .single();

    if (affiliateError) throw affiliateError;
    affiliateId = affiliate.id;
  });

  afterAll(async () => {
    // Limpar dados de teste
    if (affiliateId) {
      await supabase
        .from('affiliates')
        .delete()
        .eq('id', affiliateId);
    }

    // Deletar usuário de teste
    const { data: { user } } = await supabase.auth.getUser(authToken);
    if (user) {
      await supabase.auth.admin.deleteUser(user.id);
    }
  });

  describe('POST /api/affiliates?action=configure-wallet', () => {
    it('deve retornar 401 sem autenticação', async () => {
      const response = await fetch(`${API_BASE_URL}/affiliates?action=configure-wallet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          walletId: 'c0c1688f-636b-42c0-b6ee-7339182276b7'
        })
      });

      expect(response.status).toBe(401);
    });

    it('deve retornar 400 para formato UUID inválido', async () => {
      const response = await fetch(`${API_BASE_URL}/affiliates?action=configure-wallet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          walletId: 'wal_invalidformat12345'
        })
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Formato de Wallet ID inválido');
    });

    it('deve retornar 400 para UUID em uppercase', async () => {
      const response = await fetch(`${API_BASE_URL}/affiliates?action=configure-wallet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          walletId: 'C0C1688F-636B-42C0-B6EE-7339182276B7'
        })
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
    });

    it('deve configurar wallet com UUID válido', async () => {
      const validWalletId = `a${Date.now().toString(16).padStart(7, '0')}-636b-42c0-b6ee-7339182276b7`;
      
      const response = await fetch(`${API_BASE_URL}/affiliates?action=configure-wallet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          walletId: validWalletId
        })
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.walletId).toBe(validWalletId);
      expect(data.data.financial_status).toBe('ativo');

      // Verificar no banco
      const { data: affiliate } = await supabase
        .from('affiliates')
        .select('wallet_id, financial_status, wallet_configured_at, onboarding_completed')
        .eq('id', affiliateId)
        .single();

      expect(affiliate?.wallet_id).toBe(validWalletId);
      expect(affiliate?.financial_status).toBe('ativo');
      expect(affiliate?.wallet_configured_at).not.toBeNull();
      expect(affiliate?.onboarding_completed).toBe(true);
    });

    it('deve retornar 400 ao tentar alterar wallet já configurada', async () => {
      const response = await fetch(`${API_BASE_URL}/affiliates?action=configure-wallet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          walletId: 'b0c1688f-636b-42c0-b6ee-7339182276b7'
        })
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('já possui uma wallet configurada');
    });
  });

  describe('POST /api/affiliates?action=create-asaas-account', () => {
    let newAuthToken: string;
    let newAffiliateId: string;

    beforeAll(async () => {
      // Criar novo usuário para teste de criação de conta
      const newEmail = `test-create-${Date.now()}@example.com`;
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newEmail,
        password: 'Test123!@#'
      });

      if (authError) throw authError;
      newAuthToken = authData.session?.access_token || '';

      // Criar afiliado sem wallet
      const { data: affiliate, error: affiliateError } = await supabase
        .from('affiliates')
        .insert({
          user_id: authData.user!.id,
          name: 'Test Create Account',
          email: newEmail,
          document: '98765432100',
          document_type: 'CPF',
          affiliate_type: 'individual',
          financial_status: 'financeiro_pendente',
          referral_code: `CREATE${Date.now()}`
        })
        .select()
        .single();

      if (affiliateError) throw affiliateError;
      newAffiliateId = affiliate.id;
    });

    afterAll(async () => {
      // Limpar dados
      if (newAffiliateId) {
        await supabase
          .from('affiliates')
          .delete()
          .eq('id', newAffiliateId);
      }
    });

    it('deve retornar 400 para campos obrigatórios faltando', async () => {
      const response = await fetch(`${API_BASE_URL}/affiliates?action=create-asaas-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${newAuthToken}`
        },
        body: JSON.stringify({
          name: 'Test User'
          // Faltando outros campos obrigatórios
        })
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('obrigatório');
    });

    it('deve retornar 400 para CPF/CNPJ inválido', async () => {
      const response = await fetch(`${API_BASE_URL}/affiliates?action=create-asaas-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${newAuthToken}`
        },
        body: JSON.stringify({
          name: 'Test User',
          email: 'test@example.com',
          cpfCnpj: '123', // Inválido
          mobilePhone: '11999887766',
          incomeValue: 5000,
          address: 'Rua Teste',
          addressNumber: '123',
          province: 'Centro',
          postalCode: '12345678'
        })
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
    });

    it('deve retornar 400 para CEP inválido', async () => {
      const response = await fetch(`${API_BASE_URL}/affiliates?action=create-asaas-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${newAuthToken}`
        },
        body: JSON.stringify({
          name: 'Test User',
          email: 'test@example.com',
          cpfCnpj: '12345678910',
          mobilePhone: '11999887766',
          incomeValue: 5000,
          address: 'Rua Teste',
          addressNumber: '123',
          province: 'Centro',
          postalCode: '123' // Inválido
        })
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('CEP');
    });

    it('deve retornar 400 para renda/faturamento inválido', async () => {
      const response = await fetch(`${API_BASE_URL}/affiliates?action=create-asaas-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${newAuthToken}`
        },
        body: JSON.stringify({
          name: 'Test User',
          email: 'test@example.com',
          cpfCnpj: '12345678910',
          mobilePhone: '11999887766',
          incomeValue: -100, // Inválido
          address: 'Rua Teste',
          addressNumber: '123',
          province: 'Centro',
          postalCode: '12345678'
        })
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
    });
  });

  describe('GET /api/affiliates?action=referral-link', () => {
    it('deve retornar 403 para afiliado com status pendente', async () => {
      // Criar novo afiliado com status pendente
      const pendingEmail = `test-pending-${Date.now()}@example.com`;
      
      const { data: authData } = await supabase.auth.signUp({
        email: pendingEmail,
        password: 'Test123!@#'
      });

      const pendingToken = authData.session?.access_token || '';

      await supabase
        .from('affiliates')
        .insert({
          user_id: authData.user!.id,
          name: 'Pending User',
          email: pendingEmail,
          document: '11122233344',
          document_type: 'CPF',
          affiliate_type: 'individual',
          financial_status: 'financeiro_pendente',
          referral_code: `PEND${Date.now()}`
        });

      const response = await fetch(`${API_BASE_URL}/affiliates?action=referral-link`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${pendingToken}`
        }
      });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.code).toBe('FINANCIAL_STATUS_PENDING');
      expect(data.error).toContain('Configure sua carteira digital');
    });

    it('deve retornar link para afiliado com status ativo', async () => {
      const response = await fetch(`${API_BASE_URL}/affiliates?action=referral-link`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.link).toContain('slimquality.com.br');
      expect(data.data.referralCode).toBeTruthy();
    });
  });
});
