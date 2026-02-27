/**
 * Unit Tests - Validators (CPF/CNPJ)
 * ETAPA 1: Base de Dados e Tipos de Afiliados
 * 
 * Testes unitários para funções de validação e formatação de documentos
 */

import { describe, it, expect } from 'vitest';
import {
  parseDocument,
  formatCPF,
  formatCNPJ,
  validateCPF,
  validateCNPJ,
} from '@/utils/validators';

describe('Validators - Document Parsing and Formatting', () => {
  describe('parseDocument', () => {
    it('deve remover formatação de CPF', () => {
      expect(parseDocument('123.456.789-10')).toBe('12345678910');
    });

    it('deve remover formatação de CNPJ', () => {
      expect(parseDocument('12.345.678/0001-90')).toBe('12345678000190');
    });

    it('deve retornar apenas números', () => {
      expect(parseDocument('abc123def456')).toBe('123456');
    });

    it('deve lidar com string vazia', () => {
      expect(parseDocument('')).toBe('');
    });
  });

  describe('formatCPF', () => {
    it('deve formatar CPF sem formatação', () => {
      expect(formatCPF('12345678910')).toBe('123.456.789-10');
    });

    it('deve manter formatação de CPF já formatado', () => {
      expect(formatCPF('123.456.789-10')).toBe('123.456.789-10');
    });

    it('deve retornar string vazia para CPF com comprimento errado', () => {
      expect(formatCPF('123456789')).toBe('');
      expect(formatCPF('123456789101')).toBe('');
    });

    it('deve retornar string vazia para string vazia', () => {
      expect(formatCPF('')).toBe('');
    });
  });

  describe('formatCNPJ', () => {
    it('deve formatar CNPJ sem formatação', () => {
      expect(formatCNPJ('12345678000190')).toBe('12.345.678/0001-90');
    });

    it('deve manter formatação de CNPJ já formatado', () => {
      expect(formatCNPJ('12.345.678/0001-90')).toBe('12.345.678/0001-90');
    });

    it('deve retornar string vazia para CNPJ com comprimento errado', () => {
      expect(formatCNPJ('1234567800019')).toBe('');
      expect(formatCNPJ('123456780001901')).toBe('');
    });

    it('deve retornar string vazia para string vazia', () => {
      expect(formatCNPJ('')).toBe('');
    });
  });
});

describe('Validators - CPF Validation', () => {
  describe('validateCPF - Valid CPFs', () => {
    it('deve aceitar CPF válido sem formatação', () => {
      expect(validateCPF('19100000000')).toBe(true);
    });

    it('deve aceitar CPF válido com formatação', () => {
      expect(validateCPF('191.000.000-00')).toBe(true);
    });

    it('deve aceitar múltiplos CPFs válidos conhecidos', () => {
      const validCPFs = [
        '11144477735',
        '111.444.777-35',
        '52998224725',
        '529.982.247-25',
      ];
      
      validCPFs.forEach(cpf => {
        expect(validateCPF(cpf)).toBe(true);
      });
    });
  });

  describe('validateCPF - Invalid CPFs', () => {
    it('deve rejeitar CPF com todos os dígitos iguais', () => {
      const invalidCPFs = [
        '00000000000',
        '11111111111',
        '22222222222',
        '33333333333',
        '44444444444',
        '55555555555',
        '66666666666',
        '77777777777',
        '88888888888',
        '99999999999',
      ];
      
      invalidCPFs.forEach(cpf => {
        expect(validateCPF(cpf)).toBe(false);
      });
    });

    it('deve rejeitar CPF com dígitos verificadores inválidos', () => {
      expect(validateCPF('12345678910')).toBe(false);
      expect(validateCPF('123.456.789-10')).toBe(false);
    });

    it('deve rejeitar CPF com comprimento errado', () => {
      expect(validateCPF('123456789')).toBe(false);
      expect(validateCPF('123456789101')).toBe(false);
    });

    it('deve rejeitar string vazia', () => {
      expect(validateCPF('')).toBe(false);
    });

    it('deve rejeitar CPF com apenas letras', () => {
      expect(validateCPF('abcdefghijk')).toBe(false);
    });
  });
});

describe('Validators - CNPJ Validation', () => {
  describe('validateCNPJ - Valid CNPJs', () => {
    it('deve aceitar CNPJ válido sem formatação', () => {
      expect(validateCNPJ('11222333000181')).toBe(true);
    });

    it('deve aceitar CNPJ válido com formatação', () => {
      expect(validateCNPJ('11.222.333/0001-81')).toBe(true);
    });

    it('deve aceitar múltiplos CNPJs válidos conhecidos', () => {
      const validCNPJs = [
        '11222333000181',
        '11.222.333/0001-81',
        '06990590000123',
        '06.990.590/0001-23',
      ];
      
      validCNPJs.forEach(cnpj => {
        expect(validateCNPJ(cnpj)).toBe(true);
      });
    });
  });

  describe('validateCNPJ - Invalid CNPJs', () => {
    it('deve rejeitar CNPJ com todos os dígitos iguais', () => {
      const invalidCNPJs = [
        '00000000000000',
        '11111111111111',
        '22222222222222',
        '33333333333333',
        '44444444444444',
        '55555555555555',
        '66666666666666',
        '77777777777777',
        '88888888888888',
        '99999999999999',
      ];
      
      invalidCNPJs.forEach(cnpj => {
        expect(validateCNPJ(cnpj)).toBe(false);
      });
    });

    it('deve rejeitar CNPJ com dígitos verificadores inválidos', () => {
      expect(validateCNPJ('12345678000190')).toBe(false);
      expect(validateCNPJ('12.345.678/0001-90')).toBe(false);
    });

    it('deve rejeitar CNPJ com comprimento errado', () => {
      expect(validateCNPJ('1234567800019')).toBe(false);
      expect(validateCNPJ('123456780001901')).toBe(false);
    });

    it('deve rejeitar string vazia', () => {
      expect(validateCNPJ('')).toBe(false);
    });

    it('deve rejeitar CNPJ com apenas letras', () => {
      expect(validateCNPJ('abcdefghijklmn')).toBe(false);
    });
  });
});

describe('Validators - Round-trip Property', () => {
  it('deve preservar CPF após parse → format → parse', () => {
    const cpf = '11144477735';
    const formatted = formatCPF(cpf);
    const parsed = parseDocument(formatted);
    expect(parsed).toBe(cpf);
  });

  it('deve preservar CNPJ após parse → format → parse', () => {
    const cnpj = '11222333000181';
    const formatted = formatCNPJ(cnpj);
    const parsed = parseDocument(formatted);
    expect(parsed).toBe(cnpj);
  });
});
