/**
 * Teste básico para validar configuração
 */

import { describe, it, expect } from 'vitest';

describe('Configuração Básica', () => {
  it('deve executar teste simples', () => {
    expect(1 + 1).toBe(2);
  });

  it('deve ter variáveis de ambiente configuradas', () => {
    expect(process.env.NODE_ENV).toBe('test');
    expect(process.env.VITEST).toBe('true');
  });
});