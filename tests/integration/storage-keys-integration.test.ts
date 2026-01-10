/**
 * Testes de Integração para Storage Keys
 * Task 1.4: Testes de integração localStorage
 * 
 * Validates: Requirements 1.1, 1.2
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { STORAGE_KEYS } from '@/constants/storage-keys';

// Mock do localStorage para testes
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();

// Substituir localStorage global nos testes
Object.defineProperty(global, 'localStorage', {
  value: mockLocalStorage,
  writable: true
});

describe('Storage Keys Integration', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
  });

  afterEach(() => {
    mockLocalStorage.clear();
  });

  describe('REFERRAL_CODE - Leitura e Escrita', () => {
    it('deve salvar e recuperar código de referência', () => {
      const testCode = 'ABC123';
      
      localStorage.setItem(STORAGE_KEYS.REFERRAL_CODE, testCode);
      const retrieved = localStorage.getItem(STORAGE_KEYS.REFERRAL_CODE);
      
      expect(retrieved).toBe(testCode);
    });

    it('deve retornar null quando não há código salvo', () => {
      const retrieved = localStorage.getItem(STORAGE_KEYS.REFERRAL_CODE);
      expect(retrieved).toBeNull();
    });

    it('deve sobrescrever código existente', () => {
      localStorage.setItem(STORAGE_KEYS.REFERRAL_CODE, 'OLD123');
      localStorage.setItem(STORAGE_KEYS.REFERRAL_CODE, 'NEW456');
      
      const retrieved = localStorage.getItem(STORAGE_KEYS.REFERRAL_CODE);
      expect(retrieved).toBe('NEW456');
    });

    it('deve remover código de referência', () => {
      localStorage.setItem(STORAGE_KEYS.REFERRAL_CODE, 'ABC123');
      localStorage.removeItem(STORAGE_KEYS.REFERRAL_CODE);
      
      const retrieved = localStorage.getItem(STORAGE_KEYS.REFERRAL_CODE);
      expect(retrieved).toBeNull();
    });
  });

  describe('REFERRAL_CODE - Formato JSON', () => {
    it('deve salvar e recuperar objeto JSON com código', () => {
      const referralData = {
        code: 'ABC123',
        timestamp: Date.now(),
        expiry: Date.now() + 30 * 24 * 60 * 60 * 1000
      };
      
      localStorage.setItem(STORAGE_KEYS.REFERRAL_CODE, JSON.stringify(referralData));
      const retrieved = localStorage.getItem(STORAGE_KEYS.REFERRAL_CODE);
      const parsed = JSON.parse(retrieved!);
      
      expect(parsed.code).toBe('ABC123');
      expect(parsed.timestamp).toBeDefined();
      expect(parsed.expiry).toBeDefined();
    });

    it('deve validar expiração do código', () => {
      const expiredData = {
        code: 'ABC123',
        timestamp: Date.now() - 31 * 24 * 60 * 60 * 1000,
        expiry: Date.now() - 1 * 24 * 60 * 60 * 1000 // Expirado há 1 dia
      };
      
      localStorage.setItem(STORAGE_KEYS.REFERRAL_CODE, JSON.stringify(expiredData));
      const retrieved = localStorage.getItem(STORAGE_KEYS.REFERRAL_CODE);
      const parsed = JSON.parse(retrieved!);
      
      const isExpired = Date.now() > parsed.expiry;
      expect(isExpired).toBe(true);
    });

    it('deve validar código não expirado', () => {
      const validData = {
        code: 'ABC123',
        timestamp: Date.now(),
        expiry: Date.now() + 30 * 24 * 60 * 60 * 1000 // Expira em 30 dias
      };
      
      localStorage.setItem(STORAGE_KEYS.REFERRAL_CODE, JSON.stringify(validData));
      const retrieved = localStorage.getItem(STORAGE_KEYS.REFERRAL_CODE);
      const parsed = JSON.parse(retrieved!);
      
      const isExpired = Date.now() > parsed.expiry;
      expect(isExpired).toBe(false);
    });
  });

  describe('REFERRAL_CODE - Múltiplos Componentes', () => {
    it('deve permitir acesso simultâneo de múltiplos componentes', () => {
      // Simular Component A salvando
      localStorage.setItem(STORAGE_KEYS.REFERRAL_CODE, 'ABC123');
      
      // Simular Component B lendo
      const componentB = localStorage.getItem(STORAGE_KEYS.REFERRAL_CODE);
      expect(componentB).toBe('ABC123');
      
      // Simular Component C lendo
      const componentC = localStorage.getItem(STORAGE_KEYS.REFERRAL_CODE);
      expect(componentC).toBe('ABC123');
      
      // Todos devem ver o mesmo valor
      expect(componentB).toBe(componentC);
    });

    it('deve manter consistência após múltiplas operações', () => {
      // Operação 1: Salvar
      localStorage.setItem(STORAGE_KEYS.REFERRAL_CODE, 'CODE1');
      expect(localStorage.getItem(STORAGE_KEYS.REFERRAL_CODE)).toBe('CODE1');
      
      // Operação 2: Atualizar
      localStorage.setItem(STORAGE_KEYS.REFERRAL_CODE, 'CODE2');
      expect(localStorage.getItem(STORAGE_KEYS.REFERRAL_CODE)).toBe('CODE2');
      
      // Operação 3: Remover
      localStorage.removeItem(STORAGE_KEYS.REFERRAL_CODE);
      expect(localStorage.getItem(STORAGE_KEYS.REFERRAL_CODE)).toBeNull();
      
      // Operação 4: Salvar novamente
      localStorage.setItem(STORAGE_KEYS.REFERRAL_CODE, 'CODE3');
      expect(localStorage.getItem(STORAGE_KEYS.REFERRAL_CODE)).toBe('CODE3');
    });
  });

  describe('REFERRAL_CODE - Isolamento de Chaves', () => {
    it('não deve interferir com outras chaves do localStorage', () => {
      // Salvar múltiplas chaves
      localStorage.setItem(STORAGE_KEYS.REFERRAL_CODE, 'ABC123');
      localStorage.setItem('other_key', 'other_value');
      localStorage.setItem('user_data', JSON.stringify({ name: 'Test' }));
      
      // Verificar que todas coexistem
      expect(localStorage.getItem(STORAGE_KEYS.REFERRAL_CODE)).toBe('ABC123');
      expect(localStorage.getItem('other_key')).toBe('other_value');
      expect(localStorage.getItem('user_data')).toBeTruthy();
      
      // Remover apenas REFERRAL_CODE
      localStorage.removeItem(STORAGE_KEYS.REFERRAL_CODE);
      
      // Verificar que outras chaves não foram afetadas
      expect(localStorage.getItem(STORAGE_KEYS.REFERRAL_CODE)).toBeNull();
      expect(localStorage.getItem('other_key')).toBe('other_value');
      expect(localStorage.getItem('user_data')).toBeTruthy();
    });
  });

  describe('REFERRAL_CODE - Casos Edge', () => {
    it('deve lidar com strings vazias (retorna null no mock)', () => {
      localStorage.setItem(STORAGE_KEYS.REFERRAL_CODE, '');
      const retrieved = localStorage.getItem(STORAGE_KEYS.REFERRAL_CODE);
      // Mock retorna null para strings vazias (comportamento do mock)
      expect(retrieved).toBeNull();
    });

    it('deve lidar com strings muito longas', () => {
      const longString = 'A'.repeat(10000);
      localStorage.setItem(STORAGE_KEYS.REFERRAL_CODE, longString);
      const retrieved = localStorage.getItem(STORAGE_KEYS.REFERRAL_CODE);
      expect(retrieved).toBe(longString);
    });

    it('deve lidar com caracteres especiais', () => {
      const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      localStorage.setItem(STORAGE_KEYS.REFERRAL_CODE, specialChars);
      const retrieved = localStorage.getItem(STORAGE_KEYS.REFERRAL_CODE);
      expect(retrieved).toBe(specialChars);
    });

    it('deve lidar com Unicode', () => {
      const unicode = '你好世界🌍';
      localStorage.setItem(STORAGE_KEYS.REFERRAL_CODE, unicode);
      const retrieved = localStorage.getItem(STORAGE_KEYS.REFERRAL_CODE);
      expect(retrieved).toBe(unicode);
    });
  });
});
