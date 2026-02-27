/**
 * Testes Unitários - Validadores de Wallet (ETAPA 2)
 * 
 * Testa funções de validação e formatação de Wallet ID, CEP e telefone
 */

import { describe, it, expect } from 'vitest';
import {
  validateWalletIdFormat,
  validateCEP,
  validateBrazilianPhone,
  formatCEP,
  formatBrazilianPhone
} from '@/utils/validators';

describe('Validators - Wallet ID (ETAPA 2)', () => {
  describe('validateWalletIdFormat', () => {
    it('deve aceitar UUID válido em lowercase', () => {
      expect(validateWalletIdFormat('c0c1688f-636b-42c0-b6ee-7339182276b7')).toBe(true);
      expect(validateWalletIdFormat('a1b2c3d4-e5f6-7890-abcd-ef1234567890')).toBe(true);
      expect(validateWalletIdFormat('00000000-0000-0000-0000-000000000000')).toBe(true);
    });

    it('deve rejeitar UUID em uppercase', () => {
      expect(validateWalletIdFormat('C0C1688F-636B-42C0-B6EE-7339182276B7')).toBe(false);
      expect(validateWalletIdFormat('A1B2C3D4-E5F6-7890-ABCD-EF1234567890')).toBe(false);
    });

    it('deve rejeitar UUID sem hífens', () => {
      expect(validateWalletIdFormat('c0c1688f636b42c0b6ee7339182276b7')).toBe(false);
      expect(validateWalletIdFormat('a1b2c3d4e5f67890abcdef1234567890')).toBe(false);
    });

    it('deve rejeitar formato antigo wal_XXXX', () => {
      expect(validateWalletIdFormat('wal_12345678901234567890')).toBe(false);
      expect(validateWalletIdFormat('wal_abcdefghijklmnopqrst')).toBe(false);
    });

    it('deve rejeitar UUID com caracteres especiais', () => {
      expect(validateWalletIdFormat('c0c1688f-636b-42c0-b6ee-733918227@b7')).toBe(false);
      expect(validateWalletIdFormat('c0c1688f-636b-42c0-b6ee-733918227#b7')).toBe(false);
    });

    it('deve rejeitar UUID com comprimento incorreto', () => {
      expect(validateWalletIdFormat('c0c1688f-636b-42c0-b6ee-7339182276')).toBe(false);
      expect(validateWalletIdFormat('c0c1688f-636b-42c0-b6ee-7339182276b7aa')).toBe(false);
    });

    it('deve rejeitar UUID com hífens em posições erradas', () => {
      expect(validateWalletIdFormat('c0c1688f636b-42c0-b6ee-7339182276b7')).toBe(false);
      expect(validateWalletIdFormat('c0c1688f-636b42c0-b6ee-7339182276b7')).toBe(false);
    });

    it('deve rejeitar strings vazias e null', () => {
      expect(validateWalletIdFormat('')).toBe(false);
      expect(validateWalletIdFormat('   ')).toBe(false);
    });
  });

  describe('validateCEP', () => {
    it('deve aceitar CEP com 8 dígitos', () => {
      expect(validateCEP('12345678')).toBe(true);
      expect(validateCEP('01310100')).toBe(true);
      expect(validateCEP('00000000')).toBe(true);
    });

    it('deve aceitar CEP formatado com hífen', () => {
      expect(validateCEP('12345-678')).toBe(true);
      expect(validateCEP('01310-100')).toBe(true);
    });

    it('deve rejeitar CEP com menos de 8 dígitos', () => {
      expect(validateCEP('1234567')).toBe(false);
      expect(validateCEP('123-456')).toBe(false);
    });

    it('deve rejeitar CEP com mais de 8 dígitos', () => {
      expect(validateCEP('123456789')).toBe(false);
      expect(validateCEP('12345-6789')).toBe(false);
    });

    it('deve rejeitar CEP com letras', () => {
      expect(validateCEP('1234567a')).toBe(false);
      expect(validateCEP('abcdefgh')).toBe(false);
    });

    it('deve rejeitar strings vazias', () => {
      expect(validateCEP('')).toBe(false);
      expect(validateCEP('   ')).toBe(false);
    });
  });

  describe('validateBrazilianPhone', () => {
    it('deve aceitar telefone com 10 dígitos (fixo)', () => {
      expect(validateBrazilianPhone('1133334444')).toBe(true);
      expect(validateBrazilianPhone('2122223333')).toBe(true);
    });

    it('deve aceitar telefone com 11 dígitos (celular)', () => {
      expect(validateBrazilianPhone('11999887766')).toBe(true);
      expect(validateBrazilianPhone('21987654321')).toBe(true);
    });

    it('deve aceitar telefone formatado', () => {
      expect(validateBrazilianPhone('(11) 3333-4444')).toBe(true);
      expect(validateBrazilianPhone('(11) 99988-7766')).toBe(true);
    });

    it('deve aceitar telefone com código do país +55', () => {
      expect(validateBrazilianPhone('+5511999887766')).toBe(true);
      expect(validateBrazilianPhone('5511999887766')).toBe(true);
      expect(validateBrazilianPhone('+55 11 99988-7766')).toBe(true);
    });

    it('deve rejeitar telefone com menos de 10 dígitos', () => {
      expect(validateBrazilianPhone('119998877')).toBe(false);
      expect(validateBrazilianPhone('1199988')).toBe(false);
    });

    it('deve rejeitar telefone com mais de 13 dígitos (com +55)', () => {
      expect(validateBrazilianPhone('551199988776655')).toBe(false);
    });

    it('deve rejeitar telefone com código de país diferente de 55', () => {
      expect(validateBrazilianPhone('+1234567890123')).toBe(false);
    });

    it('deve rejeitar strings vazias', () => {
      expect(validateBrazilianPhone('')).toBe(false);
      expect(validateBrazilianPhone('   ')).toBe(false);
    });
  });

  describe('formatCEP', () => {
    it('deve formatar CEP sem hífen', () => {
      expect(formatCEP('12345678')).toBe('12345-678');
      expect(formatCEP('01310100')).toBe('01310-100');
    });

    it('deve manter CEP já formatado', () => {
      expect(formatCEP('12345-678')).toBe('12345-678');
      expect(formatCEP('01310-100')).toBe('01310-100');
    });

    it('deve retornar string vazia para CEP inválido', () => {
      expect(formatCEP('1234567')).toBe('');
      expect(formatCEP('123456789')).toBe('');
      expect(formatCEP('abcdefgh')).toBe('');
      expect(formatCEP('')).toBe('');
    });
  });

  describe('formatBrazilianPhone', () => {
    it('deve formatar telefone fixo (10 dígitos)', () => {
      expect(formatBrazilianPhone('1133334444')).toBe('+55 (11) 3333-4444');
      expect(formatBrazilianPhone('2122223333')).toBe('+55 (21) 2222-3333');
    });

    it('deve formatar telefone celular (11 dígitos)', () => {
      expect(formatBrazilianPhone('11999887766')).toBe('+55 (11) 99988-7766');
      expect(formatBrazilianPhone('21987654321')).toBe('+55 (21) 98765-4321');
    });

    it('deve remover código do país se presente', () => {
      expect(formatBrazilianPhone('5511999887766')).toBe('+55 (11) 99988-7766');
      expect(formatBrazilianPhone('+5511999887766')).toBe('+55 (11) 99988-7766');
    });

    it('deve manter formatação de telefone já formatado', () => {
      expect(formatBrazilianPhone('(11) 99988-7766')).toBe('+55 (11) 99988-7766');
      expect(formatBrazilianPhone('+55 (11) 99988-7766')).toBe('+55 (11) 99988-7766');
    });

    it('deve retornar string vazia para telefone inválido', () => {
      expect(formatBrazilianPhone('119998877')).toBe('');
      expect(formatBrazilianPhone('11999887766554433')).toBe('');
      expect(formatBrazilianPhone('abcdefghij')).toBe('');
      expect(formatBrazilianPhone('')).toBe('');
    });
  });
});
