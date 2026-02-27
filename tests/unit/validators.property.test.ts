/**
 * Property-Based Tests - Validators (CPF/CNPJ)
 * ETAPA 1: Base de Dados e Tipos de Afiliados
 * 
 * Testes baseados em propriedades usando fast-check para validação de documentos
 * 
 * Tags: Feature: etapa-1-tipos-afiliados, Property 1, Property 2, Property 3
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  parseDocument,
  formatCPF,
  formatCNPJ,
  validateCPF,
  validateCNPJ,
} from '@/utils/validators';

/**
 * Gera um CPF válido com dígitos verificadores corretos
 */
function generateValidCPF(): fc.Arbitrary<string> {
  return fc.tuple(
    fc.integer({ min: 0, max: 999999999 })
  ).map(([base]) => {
    const baseStr = base.toString().padStart(9, '0');
    
    // Calcular primeiro dígito verificador
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(baseStr.charAt(i)) * (10 - i);
    }
    let digit1 = 11 - (sum % 11);
    if (digit1 >= 10) digit1 = 0;
    
    // Calcular segundo dígito verificador
    sum = 0;
    const withDigit1 = baseStr + digit1;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(withDigit1.charAt(i)) * (11 - i);
    }
    let digit2 = 11 - (sum % 11);
    if (digit2 >= 10) digit2 = 0;
    
    return baseStr + digit1 + digit2;
  }).filter(cpf => {
    // Filtrar CPFs com todos os dígitos iguais
    return !/^(\d)\1{10}$/.test(cpf);
  });
}

/**
 * Gera um CNPJ válido com dígitos verificadores corretos
 */
function generateValidCNPJ(): fc.Arbitrary<string> {
  return fc.tuple(
    fc.integer({ min: 0, max: 999999999999 })
  ).map(([base]) => {
    const baseStr = base.toString().padStart(12, '0');
    
    // Pesos para cálculo do primeiro dígito
    const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    
    // Calcular primeiro dígito verificador
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(baseStr.charAt(i)) * weights1[i];
    }
    let digit1 = sum % 11;
    digit1 = digit1 < 2 ? 0 : 11 - digit1;
    
    // Pesos para cálculo do segundo dígito
    const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    
    // Calcular segundo dígito verificador
    sum = 0;
    const withDigit1 = baseStr + digit1;
    for (let i = 0; i < 13; i++) {
      sum += parseInt(withDigit1.charAt(i)) * weights2[i];
    }
    let digit2 = sum % 11;
    digit2 = digit2 < 2 ? 0 : 11 - digit2;
    
    return baseStr + digit1 + digit2;
  }).filter(cnpj => {
    // Filtrar CNPJs com todos os dígitos iguais
    return !/^(\d)\1{13}$/.test(cnpj);
  });
}

/**
 * Gera um CPF inválido (dígitos verificadores incorretos)
 */
function generateInvalidCPF(): fc.Arbitrary<string> {
  return fc.tuple(
    fc.integer({ min: 0, max: 999999999 }),
    fc.integer({ min: 0, max: 99 })
  ).map(([base, wrongDigits]) => {
    const baseStr = base.toString().padStart(9, '0');
    const wrongDigitsStr = wrongDigits.toString().padStart(2, '0');
    return baseStr + wrongDigitsStr;
  }).filter(cpf => {
    // Filtrar CPFs com todos os dígitos iguais e CPFs válidos por acaso
    return !/^(\d)\1{10}$/.test(cpf) && !validateCPF(cpf);
  });
}

/**
 * Gera um CNPJ inválido (dígitos verificadores incorretos)
 */
function generateInvalidCNPJ(): fc.Arbitrary<string> {
  return fc.tuple(
    fc.integer({ min: 0, max: 999999999999 }),
    fc.integer({ min: 0, max: 99 })
  ).map(([base, wrongDigits]) => {
    const baseStr = base.toString().padStart(12, '0');
    const wrongDigitsStr = wrongDigits.toString().padStart(2, '0');
    return baseStr + wrongDigitsStr;
  }).filter(cnpj => {
    // Filtrar CNPJs com todos os dígitos iguais e CNPJs válidos por acaso
    return !/^(\d)\1{13}$/.test(cnpj) && !validateCNPJ(cnpj);
  });
}

describe('Property Tests - Validators', () => {
  describe('Property 1: Round-trip preservation', () => {
    it('deve preservar CPF após parse → format → parse', () => {
      fc.assert(
        fc.property(generateValidCPF(), (cpf) => {
          const formatted = formatCPF(cpf);
          const parsed = parseDocument(formatted);
          expect(parsed).toBe(cpf);
        }),
        { numRuns: 100 }
      );
    });

    it('deve preservar CNPJ após parse → format → parse', () => {
      fc.assert(
        fc.property(generateValidCNPJ(), (cnpj) => {
          const formatted = formatCNPJ(cnpj);
          const parsed = parseDocument(formatted);
          expect(parsed).toBe(cnpj);
        }),
        { numRuns: 100 }
      );
    });

    it('parseDocument deve ser idempotente', () => {
      fc.assert(
        fc.property(fc.string(), (str) => {
          const parsed1 = parseDocument(str);
          const parsed2 = parseDocument(parsed1);
          expect(parsed1).toBe(parsed2);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 2: CPF validation correctness', () => {
    it('deve aceitar todos os CPFs válidos gerados', () => {
      fc.assert(
        fc.property(generateValidCPF(), (cpf) => {
          expect(validateCPF(cpf)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('deve rejeitar todos os CPFs inválidos gerados', () => {
      fc.assert(
        fc.property(generateInvalidCPF(), (cpf) => {
          expect(validateCPF(cpf)).toBe(false);
        }),
        { numRuns: 100 }
      );
    });

    it('deve rejeitar CPFs com comprimento diferente de 11', () => {
      fc.assert(
        fc.property(
          fc.string().filter(s => parseDocument(s).length !== 11),
          (str) => {
            expect(validateCPF(str)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('formatCPF deve retornar vazio para CPFs com comprimento errado', () => {
      fc.assert(
        fc.property(
          fc.string().filter(s => {
            const parsed = parseDocument(s);
            return parsed.length > 0 && parsed.length !== 11;
          }),
          (str) => {
            expect(formatCPF(str)).toBe('');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 3: CNPJ validation correctness', () => {
    it('deve aceitar todos os CNPJs válidos gerados', () => {
      fc.assert(
        fc.property(generateValidCNPJ(), (cnpj) => {
          expect(validateCNPJ(cnpj)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('deve rejeitar todos os CNPJs inválidos gerados', () => {
      fc.assert(
        fc.property(generateInvalidCNPJ(), (cnpj) => {
          expect(validateCNPJ(cnpj)).toBe(false);
        }),
        { numRuns: 100 }
      );
    });

    it('deve rejeitar CNPJs com comprimento diferente de 14', () => {
      fc.assert(
        fc.property(
          fc.string().filter(s => parseDocument(s).length !== 14),
          (str) => {
            expect(validateCNPJ(str)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('formatCNPJ deve retornar vazio para CNPJs com comprimento errado', () => {
      fc.assert(
        fc.property(
          fc.string().filter(s => {
            const parsed = parseDocument(s);
            return parsed.length > 0 && parsed.length !== 14;
          }),
          (str) => {
            expect(formatCNPJ(str)).toBe('');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property: Formatting consistency', () => {
    it('formatCPF deve sempre retornar formato XXX.XXX.XXX-XX ou vazio', () => {
      fc.assert(
        fc.property(fc.string(), (str) => {
          const formatted = formatCPF(str);
          if (formatted === '') {
            expect(formatted).toBe('');
          } else {
            expect(formatted).toMatch(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('formatCNPJ deve sempre retornar formato XX.XXX.XXX/XXXX-XX ou vazio', () => {
      fc.assert(
        fc.property(fc.string(), (str) => {
          const formatted = formatCNPJ(str);
          if (formatted === '') {
            expect(formatted).toBe('');
          } else {
            expect(formatted).toMatch(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/);
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property: parseDocument behavior', () => {
    it('parseDocument deve remover todos os caracteres não numéricos', () => {
      fc.assert(
        fc.property(fc.string(), (str) => {
          const parsed = parseDocument(str);
          expect(parsed).toMatch(/^\d*$/);
        }),
        { numRuns: 100 }
      );
    });

    it('parseDocument não deve alterar strings que já são apenas números', () => {
      fc.assert(
        fc.property(
          fc.string().filter(s => /^\d+$/.test(s)),
          (str) => {
            expect(parseDocument(str)).toBe(str);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
