/**
 * Asaas Service Mock
 * Mock do serviço de integração com Asaas
 */

import { vi } from 'vitest';

// Estado do mock
export const mockAsaasState = {
  validWallets: new Set<string>(['wal_' + 'a'.repeat(26)]),
  activeWallets: new Set<string>(['wal_' + 'a'.repeat(26)]),
  shouldFail: false,
  errorMessage: '',
};

// Reset state
export const resetAsaasMockState = () => {
  mockAsaasState.validWallets = new Set(['wal_' + 'a'.repeat(26)]);
  mockAsaasState.activeWallets = new Set(['wal_' + 'a'.repeat(26)]);
  mockAsaasState.shouldFail = false;
  mockAsaasState.errorMessage = '';
};

// Mock do AffiliateAsaasService
export const mockAffiliateAsaasService = {
  validateWallet: vi.fn(async (walletId: string) => {
    if (mockAsaasState.shouldFail) {
      return {
        isValid: false,
        isActive: false,
        error: mockAsaasState.errorMessage || 'Erro ao validar Wallet ID',
      };
    }

    if (!walletId || typeof walletId !== 'string') {
      return {
        isValid: false,
        isActive: false,
        error: 'Wallet ID é obrigatório',
      };
    }

    // Validar formato
    const walletRegex = /^wal_[a-zA-Z0-9]{26}$/;
    if (!walletRegex.test(walletId)) {
      return {
        isValid: false,
        isActive: false,
        error: 'Formato de Wallet ID inválido',
      };
    }

    const isValid = mockAsaasState.validWallets.has(walletId);
    const isActive = mockAsaasState.activeWallets.has(walletId);

    if (!isValid) {
      return {
        isValid: false,
        isActive: false,
        error: 'Wallet ID não encontrada no Asaas',
      };
    }

    if (!isActive) {
      return {
        isValid: true,
        isActive: false,
        error: 'Wallet ID não está ativa',
      };
    }

    return {
      isValid: true,
      isActive: true,
      walletId,
      name: 'Test Wallet',
    };
  }),
};
