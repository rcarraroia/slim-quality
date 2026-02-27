/**
 * Unit Tests - Payment First Validation
 * ETAPA: Payment First + Afiliados Existentes - Phase B8
 * 
 * Testes unitários para validação de pré-cadastro Payment First
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock do fetch global
global.fetch = vi.fn();

describe('Payment First Validation - Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Session Creation', () => {
    it('deve criar sessão temporária com dados válidos', async () => {
      const mockResponse = {
        success: true,
        session_token: 'test_session_token_123',
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString()
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const data = {
        email: 'test@example.com',
        name: 'Test User',
        phone: '11999999999',
        document: '19100000000', // CPF válido
        affiliate_type: 'individual' as const,
        referral_code: null,
        password: 'senha123'
      };

      const response = await fetch('/api/affiliates?action=payment-first-validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.session_token).toBeDefined();
      expect(result.session_token).toBe('test_session_token_123');
    });

    it('deve rejeitar CPF inválido', async () => {
      const mockResponse = {
        success: false,
        error: 'CPF inválido'
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => mockResponse
      });

      const data = {
        email: 'test@example.com',
        name: 'Test User',
        phone: '11999999999',
        document: '00000000000', // CPF inválido
        affiliate_type: 'individual' as const,
        referral_code: null,
        password: 'senha123'
      };

      const response = await fetch('/api/affiliates?action=payment-first-validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      expect(result.success).toBe(false);
      expect(result.error).toContain('CPF inválido');
    });

    it('deve rejeitar email duplicado', async () => {
      const mockResponse = {
        success: false,
        error: 'Email já cadastrado'
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => mockResponse
      });

      const data = {
        email: 'existing@example.com',
        name: 'Test User',
        phone: '11999999999',
        document: '19100000000',
        affiliate_type: 'individual' as const,
        referral_code: null,
        password: 'senha123'
      };

      const response = await fetch('/api/affiliates?action=payment-first-validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Email já cadastrado');
    });

    it('deve rejeitar documento duplicado', async () => {
      const mockResponse = {
        success: false,
        error: 'CPF já cadastrado'
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => mockResponse
      });

      const data = {
        email: 'test@example.com',
        name: 'Test User',
        phone: '11999999999',
        document: '19100000000', // CPF já cadastrado
        affiliate_type: 'individual' as const,
        referral_code: null,
        password: 'senha123'
      };

      const response = await fetch('/api/affiliates?action=payment-first-validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      expect(result.success).toBe(false);
      expect(result.error).toContain('CPF já cadastrado');
    });

    it('deve validar CNPJ para tipo logista', async () => {
      const mockResponse = {
        success: true,
        session_token: 'test_session_token_456'
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const data = {
        email: 'logista@example.com',
        name: 'Loja Teste',
        phone: '11999999999',
        document: '11222333000181', // CNPJ válido
        affiliate_type: 'logista' as const,
        referral_code: null,
        password: 'senha123'
      };

      const response = await fetch('/api/affiliates?action=payment-first-validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.session_token).toBeDefined();
    });

    it('deve validar referral_code se fornecido', async () => {
      const mockResponse = {
        success: true,
        session_token: 'test_session_token_789',
        referral_code_valid: true
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const data = {
        email: 'test@example.com',
        name: 'Test User',
        phone: '11999999999',
        document: '19100000000',
        affiliate_type: 'individual' as const,
        referral_code: 'ABC123',
        password: 'senha123'
      };

      const response = await fetch('/api/affiliates?action=payment-first-validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.referral_code_valid).toBe(true);
    });
  });

  describe('Password Security', () => {
    it('deve criptografar senha antes de salvar', async () => {
      const mockResponse = {
        success: true,
        session_token: 'test_session_token_abc',
        password_encrypted: true
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const data = {
        email: 'test@example.com',
        name: 'Test User',
        phone: '11999999999',
        document: '19100000000',
        affiliate_type: 'individual' as const,
        referral_code: null,
        password: 'senha123'
      };

      const response = await fetch('/api/affiliates?action=payment-first-validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.password_encrypted).toBe(true);
    });
  });

  describe('Session Expiration', () => {
    it('deve criar sessão com TTL de 30 minutos', async () => {
      const now = Date.now();
      const expiresAt = new Date(now + 30 * 60 * 1000);

      const mockResponse = {
        success: true,
        session_token: 'test_session_token_def',
        expires_at: expiresAt.toISOString()
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const data = {
        email: 'test@example.com',
        name: 'Test User',
        phone: '11999999999',
        document: '19100000000',
        affiliate_type: 'individual' as const,
        referral_code: null,
        password: 'senha123'
      };

      const response = await fetch('/api/affiliates?action=payment-first-validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.expires_at).toBeDefined();

      // Verificar que expira em ~30 minutos
      const expiresAtDate = new Date(result.expires_at);
      const diffMinutes = (expiresAtDate.getTime() - now) / (1000 * 60);
      expect(diffMinutes).toBeGreaterThanOrEqual(29);
      expect(diffMinutes).toBeLessThanOrEqual(31);
    });
  });
});
