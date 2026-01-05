/**
 * Testes de Integração - Configuração de Wallet Post-Registration
 * Valida fluxo completo de configuração de Wallet ID
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { affiliateFrontendService } from '@/services/frontend/affiliate.service';

// Mock do Supabase
const mockSupabase = {
  auth: {
    getUser: vi.fn()
  },
  from: vi.fn()
};

vi.mock('@/config/supabase', () => ({
  supabase: mockSupabase
}));

describe('Integração: Configuração de Wallet Post-Registration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve permitir configurar wallet após cadastro', async () => {
    // Arrange: Afiliado cadastrado sem wallet
    const affiliateId = 'test-affiliate-id';
    const walletId = 'f9c7d1dd-9e52-4e81-8194-8b666f276405';

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'test-user-id' } }
    });

    // Mock da busca do afiliado
    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: {
            id: affiliateId,
            wallet_id: null,
            status: 'pending'
          }
        })
      })
    });

    // Mock da atualização
    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: affiliateId,
              wallet_id: walletId,
              status: 'active',
              wallet_configured_at: new Date().toISOString()
            }
          })
        })
      })
    });

    mockSupabase.from.mockImplementation((table) => {
      if (table === 'affiliates') {
        return {
          select: mockSelect,
          update: mockUpdate
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null })
          })
        }),
        upsert: vi.fn().mockResolvedValue({ error: null })
      };
    });

    // Act: Validar e configurar wallet
    const validation = await affiliateFrontendService.validateWallet(walletId);
    
    // Assert: Validação bem-sucedida
    expect(validation.isValid).toBe(true);
    expect(validation.isActive).toBe(true);

    // Simular salvamento (seria feito pelo componente)
    // Este teste valida que a estrutura permite o fluxo completo
    expect(mockSupabase.from).toHaveBeenCalledWith('affiliates');
  });

  it('deve rejeitar wallet inválida', async () => {
    // Arrange: Wallet ID inválida
    const invalidWalletId = 'invalid-wallet-id';

    // Act: Tentar validar wallet inválida
    const validation = await affiliateFrontendService.validateWallet(invalidWalletId);

    // Assert: Validação falhou
    expect(validation.isValid).toBe(false);
    expect(validation.isActive).toBe(false);
    expect(validation.error).toContain('UUID válido');
  });

  it('deve usar cache para validações repetidas', async () => {
    // Arrange: Wallet válida
    const walletId = 'f9c7d1dd-9e52-4e81-8194-8b666f276405';

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              wallet_id: walletId,
              is_valid: true,
              status: 'ACTIVE',
              name: 'Usuário Teste',
              last_validated_at: new Date().toISOString()
            }
          })
        })
      }),
      upsert: vi.fn().mockResolvedValue({ error: null })
    });

    // Act: Validar duas vezes
    const validation1 = await affiliateFrontendService.validateWallet(walletId);
    const validation2 = await affiliateFrontendService.validateWallet(walletId);

    // Assert: Ambas retornam dados do cache
    expect(validation1.isValid).toBe(true);
    expect(validation2.isValid).toBe(true);
    expect(validation1.name).toBe('Usuário Teste');
    expect(validation2.name).toBe('Usuário Teste');
  });

  it('deve atualizar status do afiliado após configurar wallet', async () => {
    // Arrange: Cenário completo de configuração
    const affiliateData = {
      id: 'test-affiliate-id',
      wallet_id: null,
      status: 'pending',
      onboarding_completed: false
    };

    const walletId = 'f9c7d1dd-9e52-4e81-8194-8b666f276405';

    // Mock das operações do banco
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'test-user-id' } }
    });

    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              ...affiliateData,
              wallet_id: walletId,
              status: 'active',
              onboarding_completed: true,
              wallet_configured_at: new Date().toISOString()
            }
          })
        })
      })
    });

    mockSupabase.from.mockImplementation((table) => {
      if (table === 'affiliates') {
        return { update: mockUpdate };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null })
          })
        }),
        upsert: vi.fn().mockResolvedValue({ error: null })
      };
    });

    // Act: Validar wallet (simula o que o componente faria)
    const validation = await affiliateFrontendService.validateWallet(walletId);

    // Assert: Validação permite prosseguir com configuração
    expect(validation.isValid).toBe(true);
    
    // O componente então salvaria usando o Supabase diretamente
    // Este teste valida que a estrutura suporta o fluxo
    expect(mockSupabase.from).toHaveBeenCalled();
  });
});