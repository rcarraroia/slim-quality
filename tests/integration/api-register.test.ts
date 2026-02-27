/**
 * Testes de Integração - API de Registro de Afiliados
 * 
 * Feature: etapa-1-tipos-afiliados
 * Phase: 3 - API Update
 * Task: 3.5
 * 
 * Testa o endpoint POST /api/affiliates?action=register
 * com validação completa de tipos de afiliados e documentos.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase para testes
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// URL base da API (ajustar conforme ambiente)
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

// IDs de usuários criados durante os testes (para cleanup)
const createdUserIds: string[] = [];
const createdAffiliateIds: string[] = [];

describe('API de Registro de Afiliados', () => {
  
  // Cleanup após todos os testes
  afterAll(async () => {
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

  describe('Registro Válido', () => {
    
    it('deve registrar Individual com CPF válido', async () => {
      const payload = {
        name: 'João Silva',
        email: `joao.silva.${Date.now()}@test.com`,
        phone: '11987654321',
        password: 'senha123',
        affiliate_type: 'individual',
        document: '123.456.789-09' // CPF válido
      };

      const response = await fetch(`${API_BASE_URL}/api/affiliates?action=register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data.name).toBe(payload.name);
      expect(data.data.email).toBe(payload.email);
      expect(data.data.affiliate_type).toBe('individual');
      expect(data.data.financial_status).toBe('financeiro_pendente');
      expect(data.data.referral_code).toBeDefined();
      expect(data.data.referral_code).toHaveLength(8);
      expect(data.data.status).toBe('pending');

      // Salvar IDs para cleanup
      if (data.data.id) {
        createdAffiliateIds.push(data.data.id);
      }

      // Buscar user_id do afiliado para cleanup
      const { data: affiliate } = await supabase
        .from('affiliates')
        .select('user_id')
        .eq('email', payload.email)
        .single();

      if (affiliate?.user_id) {
        createdUserIds.push(affiliate.user_id);
      }
    });

    it('deve registrar Logista com CNPJ válido', async () => {
      const payload = {
        name: 'Loja ABC',
        email: `loja.abc.${Date.now()}@test.com`,
        phone: '11987654321',
        password: 'senha123',
        affiliate_type: 'logista',
        document: '11.222.333/0001-81' // CNPJ válido
      };

      const response = await fetch(`${API_BASE_URL}/api/affiliates?action=register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data.name).toBe(payload.name);
      expect(data.data.email).toBe(payload.email);
      expect(data.data.affiliate_type).toBe('logista');
      expect(data.data.financial_status).toBe('financeiro_pendente');
      expect(data.data.referral_code).toBeDefined();
      expect(data.data.status).toBe('pending');

      // Salvar IDs para cleanup
      if (data.data.id) {
        createdAffiliateIds.push(data.data.id);
      }

      // Buscar user_id do afiliado para cleanup
      const { data: affiliate } = await supabase
        .from('affiliates')
        .select('user_id')
        .eq('email', payload.email)
        .single();

      if (affiliate?.user_id) {
        createdUserIds.push(affiliate.user_id);
      }
    });

    it('deve armazenar document sem formatação', async () => {
      const payload = {
        name: 'Maria Santos',
        email: `maria.santos.${Date.now()}@test.com`,
        password: 'senha123',
        affiliate_type: 'individual',
        document: '987.654.321-00' // CPF com formatação
      };

      const response = await fetch(`${API_BASE_URL}/api/affiliates?action=register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      expect(response.status).toBe(201);

      // Verificar que document foi armazenado sem formatação
      const { data: affiliate } = await supabase
        .from('affiliates')
        .select('document')
        .eq('email', payload.email)
        .single();

      expect(affiliate?.document).toBe('98765432100'); // Sem formatação

      // Salvar IDs para cleanup
      if (data.data.id) {
        createdAffiliateIds.push(data.data.id);
      }

      const { data: affiliateData } = await supabase
        .from('affiliates')
        .select('user_id')
        .eq('email', payload.email)
        .single();

      if (affiliateData?.user_id) {
        createdUserIds.push(affiliateData.user_id);
      }
    });
  });

  describe('Validação de affiliate_type', () => {
    
    it('deve rejeitar affiliate_type inválido', async () => {
      const payload = {
        name: 'Teste',
        email: `teste.${Date.now()}@test.com`,
        password: 'senha123',
        affiliate_type: 'invalido', // Tipo inválido
        document: '12345678909'
      };

      const response = await fetch(`${API_BASE_URL}/api/affiliates?action=register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('affiliate_type deve ser "individual" ou "logista"');
      expect(data.field).toBe('affiliate_type');
    });

    it('deve rejeitar quando affiliate_type está ausente', async () => {
      const payload = {
        name: 'Teste',
        email: `teste.${Date.now()}@test.com`,
        password: 'senha123',
        document: '12345678909'
        // affiliate_type ausente
      };

      const response = await fetch(`${API_BASE_URL}/api/affiliates?action=register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Campos obrigatórios');
      expect(data.field).toBe('affiliate_type');
    });
  });

  describe('Validação de CPF (Individual)', () => {
    
    it('deve rejeitar Individual com CPF de comprimento errado', async () => {
      const payload = {
        name: 'Teste',
        email: `teste.${Date.now()}@test.com`,
        password: 'senha123',
        affiliate_type: 'individual',
        document: '123456789' // Apenas 9 dígitos
      };

      const response = await fetch(`${API_BASE_URL}/api/affiliates?action=register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('CPF deve ter 11 dígitos');
      expect(data.field).toBe('document');
    });

    it('deve rejeitar Individual com CPF com dígitos verificadores inválidos', async () => {
      const payload = {
        name: 'Teste',
        email: `teste.${Date.now()}@test.com`,
        password: 'senha123',
        affiliate_type: 'individual',
        document: '12345678900' // CPF com dígitos verificadores errados
      };

      const response = await fetch(`${API_BASE_URL}/api/affiliates?action=register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('CPF inválido');
      expect(data.field).toBe('document');
    });

    it('deve rejeitar Individual com CPF de todos os dígitos iguais', async () => {
      const payload = {
        name: 'Teste',
        email: `teste.${Date.now()}@test.com`,
        password: 'senha123',
        affiliate_type: 'individual',
        document: '11111111111' // Todos os dígitos iguais
      };

      const response = await fetch(`${API_BASE_URL}/api/affiliates?action=register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('CPF inválido');
      expect(data.field).toBe('document');
    });
  });

  describe('Validação de CNPJ (Logista)', () => {
    
    it('deve rejeitar Logista sem CNPJ', async () => {
      const payload = {
        name: 'Loja Teste',
        email: `loja.teste.${Date.now()}@test.com`,
        password: 'senha123',
        affiliate_type: 'logista'
        // document ausente
      };

      const response = await fetch(`${API_BASE_URL}/api/affiliates?action=register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('CNPJ é obrigatório para Logistas');
      expect(data.field).toBe('document');
    });

    it('deve rejeitar Logista com CNPJ de comprimento errado', async () => {
      const payload = {
        name: 'Loja Teste',
        email: `loja.teste.${Date.now()}@test.com`,
        password: 'senha123',
        affiliate_type: 'logista',
        document: '123456789012' // Apenas 12 dígitos
      };

      const response = await fetch(`${API_BASE_URL}/api/affiliates?action=register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('CNPJ deve ter 14 dígitos');
      expect(data.field).toBe('document');
    });

    it('deve rejeitar Logista com CNPJ com dígitos verificadores inválidos', async () => {
      const payload = {
        name: 'Loja Teste',
        email: `loja.teste.${Date.now()}@test.com`,
        password: 'senha123',
        affiliate_type: 'logista',
        document: '11222333000100' // CNPJ com dígitos verificadores errados
      };

      const response = await fetch(`${API_BASE_URL}/api/affiliates?action=register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('CNPJ inválido');
      expect(data.field).toBe('document');
    });

    it('deve rejeitar Logista com CNPJ de todos os dígitos iguais', async () => {
      const payload = {
        name: 'Loja Teste',
        email: `loja.teste.${Date.now()}@test.com`,
        password: 'senha123',
        affiliate_type: 'logista',
        document: '11111111111111' // Todos os dígitos iguais
      };

      const response = await fetch(`${API_BASE_URL}/api/affiliates?action=register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('CNPJ inválido');
      expect(data.field).toBe('document');
    });
  });

  describe('Validação de Duplicatas', () => {
    
    it('deve rejeitar email duplicado', async () => {
      const email = `duplicado.${Date.now()}@test.com`;

      // Primeiro registro
      const payload1 = {
        name: 'Primeiro',
        email,
        password: 'senha123',
        affiliate_type: 'individual',
        document: '123.456.789-09'
      };

      const response1 = await fetch(`${API_BASE_URL}/api/affiliates?action=register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload1)
      });

      const data1 = await response1.json();
      expect(response1.status).toBe(201);

      // Salvar IDs para cleanup
      if (data1.data.id) {
        createdAffiliateIds.push(data1.data.id);
      }

      const { data: affiliate1 } = await supabase
        .from('affiliates')
        .select('user_id')
        .eq('email', email)
        .single();

      if (affiliate1?.user_id) {
        createdUserIds.push(affiliate1.user_id);
      }

      // Segundo registro com mesmo email
      const payload2 = {
        name: 'Segundo',
        email, // Email duplicado
        password: 'senha123',
        affiliate_type: 'individual',
        document: '987.654.321-00'
      };

      const response2 = await fetch(`${API_BASE_URL}/api/affiliates?action=register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload2)
      });

      const data2 = await response2.json();

      expect(response2.status).toBe(409);
      expect(data2.success).toBe(false);
      expect(data2.error).toContain('Email já cadastrado');
      expect(data2.field).toBe('email');
    });

    it('deve rejeitar CPF duplicado', async () => {
      const document = '12345678909';

      // Primeiro registro
      const payload1 = {
        name: 'Primeiro',
        email: `primeiro.${Date.now()}@test.com`,
        password: 'senha123',
        affiliate_type: 'individual',
        document
      };

      const response1 = await fetch(`${API_BASE_URL}/api/affiliates?action=register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload1)
      });

      const data1 = await response1.json();
      expect(response1.status).toBe(201);

      // Salvar IDs para cleanup
      if (data1.data.id) {
        createdAffiliateIds.push(data1.data.id);
      }

      const { data: affiliate1 } = await supabase
        .from('affiliates')
        .select('user_id')
        .eq('email', payload1.email)
        .single();

      if (affiliate1?.user_id) {
        createdUserIds.push(affiliate1.user_id);
      }

      // Segundo registro com mesmo CPF
      const payload2 = {
        name: 'Segundo',
        email: `segundo.${Date.now()}@test.com`,
        password: 'senha123',
        affiliate_type: 'individual',
        document // CPF duplicado
      };

      const response2 = await fetch(`${API_BASE_URL}/api/affiliates?action=register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload2)
      });

      const data2 = await response2.json();

      expect(response2.status).toBe(409);
      expect(data2.success).toBe(false);
      expect(data2.error).toContain('CPF já cadastrado');
      expect(data2.field).toBe('document');
    });

    it('deve rejeitar CNPJ duplicado', async () => {
      const document = '11222333000181';

      // Primeiro registro
      const payload1 = {
        name: 'Loja Primeira',
        email: `loja.primeira.${Date.now()}@test.com`,
        password: 'senha123',
        affiliate_type: 'logista',
        document
      };

      const response1 = await fetch(`${API_BASE_URL}/api/affiliates?action=register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload1)
      });

      const data1 = await response1.json();
      expect(response1.status).toBe(201);

      // Salvar IDs para cleanup
      if (data1.data.id) {
        createdAffiliateIds.push(data1.data.id);
      }

      const { data: affiliate1 } = await supabase
        .from('affiliates')
        .select('user_id')
        .eq('email', payload1.email)
        .single();

      if (affiliate1?.user_id) {
        createdUserIds.push(affiliate1.user_id);
      }

      // Segundo registro com mesmo CNPJ
      const payload2 = {
        name: 'Loja Segunda',
        email: `loja.segunda.${Date.now()}@test.com`,
        password: 'senha123',
        affiliate_type: 'logista',
        document // CNPJ duplicado
      };

      const response2 = await fetch(`${API_BASE_URL}/api/affiliates?action=register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload2)
      });

      const data2 = await response2.json();

      expect(response2.status).toBe(409);
      expect(data2.success).toBe(false);
      expect(data2.error).toContain('CNPJ já cadastrado');
      expect(data2.field).toBe('document');
    });
  });

  describe('Verificação de financial_status', () => {
    
    it('deve sempre criar afiliado com financial_status=financeiro_pendente', async () => {
      const payload = {
        name: 'Teste Status',
        email: `teste.status.${Date.now()}@test.com`,
        password: 'senha123',
        affiliate_type: 'individual',
        document: '123.456.789-09'
      };

      const response = await fetch(`${API_BASE_URL}/api/affiliates?action=register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      expect(response.status).toBe(201);
      expect(data.data.financial_status).toBe('financeiro_pendente');

      // Verificar no banco de dados
      const { data: affiliate } = await supabase
        .from('affiliates')
        .select('financial_status')
        .eq('email', payload.email)
        .single();

      expect(affiliate?.financial_status).toBe('financeiro_pendente');

      // Salvar IDs para cleanup
      if (data.data.id) {
        createdAffiliateIds.push(data.data.id);
      }

      const { data: affiliateData } = await supabase
        .from('affiliates')
        .select('user_id')
        .eq('email', payload.email)
        .single();

      if (affiliateData?.user_id) {
        createdUserIds.push(affiliateData.user_id);
      }
    });
  });
});
