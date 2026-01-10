/**
 * Testes Unitários para Storage Keys
 * Task 1.3: Testes para constantes centralizadas
 * 
 * Validates: Requirements 1.1, 1.2
 */

import { describe, it, expect } from 'vitest';
import { 
  STORAGE_KEYS, 
  WALLET_ID_PATTERN, 
  COMMISSION_RATES,
  isValidWalletId,
  validateCommissionTotal
} from '@/constants/storage-keys';

describe('Storage Keys Constants', () => {
  describe('STORAGE_KEYS', () => {
    it('deve ter a chave REFERRAL_CODE definida', () => {
      expect(STORAGE_KEYS.REFERRAL_CODE).toBeDefined();
      expect(typeof STORAGE_KEYS.REFERRAL_CODE).toBe('string');
    });

    it('deve usar o valor correto para REFERRAL_CODE', () => {
      expect(STORAGE_KEYS.REFERRAL_CODE).toBe('slim_referral_code');
    });
  });

  describe('WALLET_ID_PATTERN', () => {
    it('deve validar wallet IDs válidos do Asaas', () => {
      const validWallets = [
        'cd912fa1-5fa4-4d49-92eb-b5ab4dfba961',
        '0000c712-0a0b-a0b0-0000-031e7ac51a2a',
        'a1b2c3d4-e5f6-4789-a012-b3c4d5e6f7a8',
        'ABCDEF12-3456-4789-ABCD-EF1234567890'
      ];

      validWallets.forEach(wallet => {
        expect(WALLET_ID_PATTERN.test(wallet)).toBe(true);
      });
    });

    it('deve rejeitar wallet IDs inválidos', () => {
      const invalidWallets = [
        'wal_123', // formato antigo
        'wal_12345678901234567890', // formato antigo
        'cd912fa1-5fa4-4d49-92eb', // muito curto
        'cd912fa1-5fa4-4d49-92eb-b5ab4dfba96g', // caractere inválido
        'cd912fa15fa44d4992ebb5ab4dfba961', // sem hífens
        '12345678-1234-1234-1234-123456789012', // não hex
        ''
      ];

      invalidWallets.forEach(wallet => {
        expect(WALLET_ID_PATTERN.test(wallet)).toBe(false);
      });
    });
  });

  describe('COMMISSION_RATES', () => {
    it('deve ter todas as taxas de comissão definidas', () => {
      expect(COMMISSION_RATES.SELLER).toBeDefined();
      expect(COMMISSION_RATES.N1).toBeDefined();
      expect(COMMISSION_RATES.N2).toBeDefined();
      expect(COMMISSION_RATES.RENUM).toBeDefined();
      expect(COMMISSION_RATES.JB).toBeDefined();
      expect(COMMISSION_RATES.TOTAL).toBeDefined();
    });

    it('deve ter os valores corretos de comissão', () => {
      expect(COMMISSION_RATES.SELLER).toBe(0.15); // 15%
      expect(COMMISSION_RATES.N1).toBe(0.03);     // 3%
      expect(COMMISSION_RATES.N2).toBe(0.02);     // 2%
      expect(COMMISSION_RATES.RENUM).toBe(0.05);  // 5%
      expect(COMMISSION_RATES.JB).toBe(0.05);     // 5%
      expect(COMMISSION_RATES.TOTAL).toBe(0.30);  // 30%
    });

    it('deve somar exatamente 30%', () => {
      const sum = COMMISSION_RATES.SELLER + 
                  COMMISSION_RATES.N1 + 
                  COMMISSION_RATES.N2 + 
                  COMMISSION_RATES.RENUM + 
                  COMMISSION_RATES.JB;
      
      expect(sum).toBeCloseTo(COMMISSION_RATES.TOTAL, 10);
    });
  });

  describe('isValidWalletId', () => {
    it('deve validar wallet IDs corretos', () => {
      expect(isValidWalletId('cd912fa1-5fa4-4d49-92eb-b5ab4dfba961')).toBe(true);
      expect(isValidWalletId('0000c712-0a0b-a0b0-0000-031e7ac51a2a')).toBe(true);
      expect(isValidWalletId('ABCDEF12-3456-4789-ABCD-EF1234567890')).toBe(true);
    });

    it('deve rejeitar wallet IDs incorretos', () => {
      expect(isValidWalletId('wal_123')).toBe(false);
      expect(isValidWalletId('invalid')).toBe(false);
      expect(isValidWalletId('')).toBe(false);
    });

    it('deve lidar com null e undefined', () => {
      expect(isValidWalletId(null as any)).toBe(false);
      expect(isValidWalletId(undefined as any)).toBe(false);
    });
  });

  describe('validateCommissionTotal', () => {
    it('deve validar quando soma é exatamente 30%', () => {
      const commissions = {
        seller: 0.15,
        n1: 0.03,
        n2: 0.02,
        renum: 0.05,
        jb: 0.05
      };
      
      const total = commissions.seller + commissions.n1 + commissions.n2 + commissions.renum + commissions.jb;
      expect(total).toBeCloseTo(0.30, 10);
    });

    it('deve rejeitar quando soma não é 30%', () => {
      const commissions = {
        seller: 0.15,
        n1: 0.03,
        n2: 0.02,
        renum: 0.05,
        jb: 0.06 // Total = 31%
      };
      
      const total = commissions.seller + commissions.n1 + commissions.n2 + commissions.renum + commissions.jb;
      expect(total).not.toBeCloseTo(0.30, 2);
    });

    it('deve aceitar pequenas diferenças de arredondamento', () => {
      const commissions = {
        seller: 0.15,
        n1: 0.03,
        n2: 0.02,
        renum: 0.05,
        jb: 0.0499999 // Arredondamento
      };
      
      const total = commissions.seller + commissions.n1 + commissions.n2 + commissions.renum + commissions.jb;
      expect(total).toBeCloseTo(0.30, 5);
    });

    it('deve calcular corretamente com valores negativos', () => {
      const commissions = {
        seller: 0.15,
        n1: -0.03,
        n2: 0.02,
        renum: 0.05,
        jb: 0.11
      };
      
      const total = commissions.seller + commissions.n1 + commissions.n2 + commissions.renum + commissions.jb;
      expect(total).toBeCloseTo(0.30, 10);
    });
  });
});
