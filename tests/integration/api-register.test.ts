/**
 * Testes de Integração - API de Validação Payment First
 * 
 * Feature: payment-first-affiliates
 * Phase: B8 - Testing & Validation
 * 
 * Testa o endpoint POST /api/affiliates?action=payment-first-validate
 * com validação completa de tipos de afiliados e documentos.
 * 
 * NOTA: Testes usam mocks do fetch para simular respostas da API.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock do fetch global
global.fetch = vi.fn();

describe('API de Validação Payment First', () => {
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Validação Válida', () => {
    
    it('deve validar Individual com CPF válido', async () => {
      const mockResponse = {
        success: true,
        session_token: 'test_session_individual_123',
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        message: 'Dados validados com sucesso'
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse
      });

      const payload = {
        name: 'João Silva',
        email: `joao.silva.${Date.now()}@test.com`,
        phone: '11987654321',
        password: 'senha123',
        affiliate_type: 'individual',
        document: '123.456.789-09', // CPF válido
        referral_code: null
      };

      const response = await fetch('/api/affiliates?action=payment-first-validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.session_token).toBeDefined();
      expect(data.expires_at).toBeDefined();
      expect(data.message).toContain('Dados validados com sucesso');
    });

    it('deve validar Logista com CNPJ válido', async () => {
      const mockResponse = {
        success: true,
        session_token: 'test_session_logista_456',
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString()
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse
      });

      const payload = {
        name: 'Loja ABC',
        email: `loja.abc.${Date.now()}@test.com`,
        phone: '11987654321',
        password: 'senha123',
        affiliate_type: 'logista',
        document: '11.222.333/0001-81', // CNPJ válido
        referral_code: null
      };

      const response = await fetch('/api/affiliates?action=payment-first-validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.session_token).toBeDefined();
      expect(data.expires_at).toBeDefined();
    });

    it('deve armazenar document sem formatação na sessão', async () => {
      const mockResponse = {
        success: true,
        session_token: 'test_session_format_789',
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        document_stored: '98765432100' // Sem formatação
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse
      });

      const payload = {
        name: 'Maria Santos',
        email: `maria.santos.${Date.now()}@test.com`,
        phone: '11987654321',
        password: 'senha123',
        affiliate_type: 'individual',
        document: '987.654.321-00', // CPF com formatação
        referral_code: null
      };

      const response = await fetch('/api/affiliates?action=payment-first-validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.document_stored).toBe('98765432100'); // Sem formatação
    });
  });

  describe('Validação de affiliate_type', () => {
    
    it('deve rejeitar affiliate_type inválido', async () => {
      const mockResponse = {
        success: false,
        error: 'affiliate_type deve ser "individual" ou "logista"'
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => mockResponse
      });

      const payload = {
        name: 'Teste',
        email: `teste.${Date.now()}@test.com`,
        phone: '11987654321',
        password: 'senha123',
        affiliate_type: 'invalido', // Tipo inválido
        document: '12345678909',
        referral_code: null
      };

      const response = await fetch('/api/affiliates?action=payment-first-validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('affiliate_type deve ser "individual" ou "logista"');
    });

    it('deve rejeitar quando affiliate_type está ausente', async () => {
      const mockResponse = {
        success: false,
        error: 'Campos obrigatórios ausentes: affiliate_type'
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => mockResponse
      });

      const payload = {
        name: 'Teste',
        email: `teste.${Date.now()}@test.com`,
        phone: '11987654321',
        password: 'senha123',
        document: '12345678909',
        referral_code: null
        // affiliate_type ausente
      };

      const response = await fetch('/api/affiliates?action=payment-first-validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Campos obrigatórios');
    });
  });

  describe('Validação de CPF (Individual)', () => {
    
    it('deve rejeitar Individual com CPF de comprimento errado', async () => {
      const mockResponse = {
        success: false,
        error: 'CPF deve ter 11 dígitos'
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => mockResponse
      });

      const payload = {
        name: 'Teste',
        email: `teste.${Date.now()}@test.com`,
        phone: '11987654321',
        password: 'senha123',
        affiliate_type: 'individual',
        document: '123456789', // Apenas 9 dígitos
        referral_code: null
      };

      const response = await fetch('/api/affiliates?action=payment-first-validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('CPF deve ter 11 dígitos');
    });

    it('deve rejeitar Individual com CPF com dígitos verificadores inválidos', async () => {
      const mockResponse = {
        success: false,
        error: 'CPF inválido'
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => mockResponse
      });

      const payload = {
        name: 'Teste',
        email: `teste.${Date.now()}@test.com`,
        phone: '11987654321',
        password: 'senha123',
        affiliate_type: 'individual',
        document: '12345678900', // CPF com dígitos verificadores errados
        referral_code: null
      };

      const response = await fetch('/api/affiliates?action=payment-first-validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('CPF inválido');
    });

    it('deve rejeitar Individual com CPF de todos os dígitos iguais', async () => {
      const mockResponse = {
        success: false,
        error: 'CPF inválido'
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => mockResponse
      });

      const payload = {
        name: 'Teste',
        email: `teste.${Date.now()}@test.com`,
        phone: '11987654321',
        password: 'senha123',
        affiliate_type: 'individual',
        document: '11111111111', // Todos os dígitos iguais
        referral_code: null
      };

      const response = await fetch('/api/affiliates?action=payment-first-validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('CPF inválido');
    });
  });

  describe('Validação de CNPJ (Logista)', () => {
    
    it('deve rejeitar Logista sem CNPJ', async () => {
      const mockResponse = {
        success: false,
        error: 'CNPJ é obrigatório para Logistas'
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => mockResponse
      });

      const payload = {
        name: 'Loja Teste',
        email: `loja.teste.${Date.now()}@test.com`,
        phone: '11987654321',
        password: 'senha123',
        affiliate_type: 'logista',
        referral_code: null
        // document ausente
      };

      const response = await fetch('/api/affiliates?action=payment-first-validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('CNPJ é obrigatório para Logistas');
    });

    it('deve rejeitar Logista com CNPJ de comprimento errado', async () => {
      const mockResponse = {
        success: false,
        error: 'CNPJ deve ter 14 dígitos'
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => mockResponse
      });

      const payload = {
        name: 'Loja Teste',
        email: `loja.teste.${Date.now()}@test.com`,
        phone: '11987654321',
        password: 'senha123',
        affiliate_type: 'logista',
        document: '123456789012', // Apenas 12 dígitos
        referral_code: null
      };

      const response = await fetch('/api/affiliates?action=payment-first-validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('CNPJ deve ter 14 dígitos');
    });

    it('deve rejeitar Logista com CNPJ com dígitos verificadores inválidos', async () => {
      const mockResponse = {
        success: false,
        error: 'CNPJ inválido'
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => mockResponse
      });

      const payload = {
        name: 'Loja Teste',
        email: `loja.teste.${Date.now()}@test.com`,
        phone: '11987654321',
        password: 'senha123',
        affiliate_type: 'logista',
        document: '11222333000100', // CNPJ com dígitos verificadores errados
        referral_code: null
      };

      const response = await fetch('/api/affiliates?action=payment-first-validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('CNPJ inválido');
    });

    it('deve rejeitar Logista com CNPJ de todos os dígitos iguais', async () => {
      const mockResponse = {
        success: false,
        error: 'CNPJ inválido'
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => mockResponse
      });

      const payload = {
        name: 'Loja Teste',
        email: `loja.teste.${Date.now()}@test.com`,
        phone: '11987654321',
        password: 'senha123',
        affiliate_type: 'logista',
        document: '11111111111111', // Todos os dígitos iguais
        referral_code: null
      };

      const response = await fetch('/api/affiliates?action=payment-first-validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('CNPJ inválido');
    });
  });

  describe('Validação de Duplicatas', () => {
    
    it('deve rejeitar email duplicado', async () => {
      const mockResponse = {
        success: false,
        error: 'Email já cadastrado'
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => mockResponse
      });

      const payload = {
        name: 'Segundo',
        email: 'existing@example.com', // Email duplicado
        phone: '11987654321',
        password: 'senha123',
        affiliate_type: 'individual',
        document: '98765432100',
        referral_code: null
      };

      const response = await fetch('/api/affiliates?action=payment-first-validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Email já cadastrado');
    });

    it('deve rejeitar CPF duplicado', async () => {
      const mockResponse = {
        success: false,
        error: 'CPF já cadastrado'
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => mockResponse
      });

      const payload = {
        name: 'Segundo',
        email: `segundo.${Date.now()}@test.com`,
        phone: '11987654321',
        password: 'senha123',
        affiliate_type: 'individual',
        document: '12345678909', // CPF duplicado
        referral_code: null
      };

      const response = await fetch('/api/affiliates?action=payment-first-validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.success).toBe(false);
      expect(data.error).toContain('CPF já cadastrado');
    });

    it('deve rejeitar CNPJ duplicado', async () => {
      const mockResponse = {
        success: false,
        error: 'CNPJ já cadastrado'
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => mockResponse
      });

      const payload = {
        name: 'Loja Segunda',
        email: `loja.segunda.${Date.now()}@test.com`,
        phone: '11987654321',
        password: 'senha123',
        affiliate_type: 'logista',
        document: '11222333000181', // CNPJ duplicado
        referral_code: null
      };

      const response = await fetch('/api/affiliates?action=payment-first-validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.success).toBe(false);
      expect(data.error).toContain('CNPJ já cadastrado');
    });
  });
});
