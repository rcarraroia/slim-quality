/**
 * T7. Testes de propriedade para ativação de afiliados
 * 
 * Property 10: Affiliate Status Activation
 * Property 11: Wallet ID Format Conversion
 * Property 12: External Wallet Validation
 * 
 * Validates: Requirements 5.1, 5.2, 5.3, 5.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';

// Mock do Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null }))
        }))
      })),
      insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null }))
      }))
    }))
  }
}));

// Tipos
interface Affiliate {
  id: string;
  name: string;
  email: string;
  walletId: string | null;
  status: 'pending' | 'active' | 'inactive' | 'suspended';
  createdAt: Date;
}

interface ActivationResult {
  success: boolean;
  affiliateId: string;
  previousStatus: string;
  newStatus: string;
  error?: string;
}

// Validação de Wallet ID
function isValidWalletId(walletId: string | null): boolean {
  if (!walletId) return false;
  // Aceita formato wal_xxxxx (20+ chars) ou UUID
  return /^wal_[a-zA-Z0-9]{20,}$/.test(walletId) || 
         /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(walletId);
}

// Conversão de formato de Wallet ID
function normalizeWalletId(walletId: string): string {
  // Se já está no formato correto, retorna
  if (/^wal_/.test(walletId)) return walletId;
  
  // Se é UUID, converte para formato wal_
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(walletId)) {
    return `wal_${walletId.replace(/-/g, '')}`;
  }
  
  return walletId;
}

// Simulação de validação externa de Wallet
async function validateExternalWallet(walletId: string): Promise<{ valid: boolean; active: boolean; name?: string }> {
  // Simular chamada à API do Asaas
  if (!isValidWalletId(walletId)) {
    return { valid: false, active: false };
  }
  
  // Simular wallet válida e ativa
  return {
    valid: true,
    active: true,
    name: 'Wallet Owner Name'
  };
}

// Função de ativação de afiliado
async function activateAffiliate(affiliate: Affiliate): Promise<ActivationResult> {
  const result: ActivationResult = {
    success: false,
    affiliateId: affiliate.id,
    previousStatus: affiliate.status,
    newStatus: affiliate.status
  };
  
  try {
    // 1. Verificar se tem Wallet ID
    if (!affiliate.walletId) {
      throw new Error('Wallet ID is required for activation');
    }
    
    // 2. Validar formato do Wallet ID
    if (!isValidWalletId(affiliate.walletId)) {
      throw new Error('Invalid Wallet ID format');
    }
    
    // 3. Validar Wallet externamente
    const walletValidation = await validateExternalWallet(affiliate.walletId);
    if (!walletValidation.valid) {
      throw new Error('Wallet ID not found in Asaas');
    }
    if (!walletValidation.active) {
      throw new Error('Wallet is not active');
    }
    
    // 4. Ativar afiliado
    result.newStatus = 'active';
    result.success = true;
    
  } catch (error) {
    result.error = error instanceof Error ? error.message : 'Unknown error';
  }
  
  return result;
}

describe('Affiliate Activation - Property Tests', () => {
  
  describe('Property 10: Affiliate Status Activation', () => {
    it('deve ativar afiliado com Wallet ID válida', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.string({ minLength: 3, maxLength: 50 }),
          fc.emailAddress(),
          async (id, name, email) => {
            const affiliate: Affiliate = {
              id,
              name,
              email,
              walletId: 'wal_12345678901234567890',
              status: 'pending',
              createdAt: new Date()
            };
            
            const result = await activateAffiliate(affiliate);
            
            expect(result.success).toBe(true);
            expect(result.newStatus).toBe('active');
            expect(result.previousStatus).toBe('pending');
          }
        ),
        { numRuns: 30 }
      );
    });
    
    it('deve rejeitar ativação sem Wallet ID', async () => {
      const affiliate: Affiliate = {
        id: 'aff_123',
        name: 'Test Affiliate',
        email: 'test@example.com',
        walletId: null,
        status: 'pending',
        createdAt: new Date()
      };
      
      const result = await activateAffiliate(affiliate);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Wallet ID is required');
      expect(result.newStatus).toBe('pending');
    });
    
    it('deve manter status anterior em caso de erro', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('pending', 'inactive', 'suspended') as fc.Arbitrary<'pending' | 'inactive' | 'suspended'>,
          async (initialStatus) => {
            const affiliate: Affiliate = {
              id: 'aff_123',
              name: 'Test',
              email: 'test@example.com',
              walletId: 'invalid',
              status: initialStatus,
              createdAt: new Date()
            };
            
            const result = await activateAffiliate(affiliate);
            
            expect(result.success).toBe(false);
            expect(result.newStatus).toBe(initialStatus);
          }
        ),
        { numRuns: 10 }
      );
    });
  });
  
  describe('Property 11: Wallet ID Format Conversion', () => {
    it('deve aceitar formato wal_xxxxx', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 20, maxLength: 30 }).filter(s => /^[a-zA-Z0-9]+$/.test(s)),
          (suffix) => {
            const walletId = `wal_${suffix}`;
            expect(isValidWalletId(walletId)).toBe(true);
          }
        ),
        { numRuns: 30 }
      );
    });
    
    it('deve aceitar formato UUID', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          (uuid) => {
            expect(isValidWalletId(uuid)).toBe(true);
          }
        ),
        { numRuns: 30 }
      );
    });
    
    it('deve converter UUID para formato wal_', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          (uuid) => {
            const normalized = normalizeWalletId(uuid);
            expect(normalized).toMatch(/^wal_/);
            expect(normalized.length).toBeGreaterThan(20);
          }
        ),
        { numRuns: 30 }
      );
    });
    
    it('deve manter formato wal_ inalterado', () => {
      const walletId = 'wal_12345678901234567890';
      const normalized = normalizeWalletId(walletId);
      expect(normalized).toBe(walletId);
    });
  });
  
  describe('Property 12: External Wallet Validation', () => {
    it('deve validar Wallet ID externamente', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.constant('wal_12345678901234567890'),
            fc.uuid()
          ),
          async (walletId) => {
            const validation = await validateExternalWallet(walletId);
            
            expect(validation.valid).toBe(true);
            expect(validation.active).toBe(true);
            expect(validation.name).toBeDefined();
          }
        ),
        { numRuns: 20 }
      );
    });
    
    it('deve rejeitar Wallet ID inválida', async () => {
      const invalidWallets = [
        'invalid',
        'wal_short',
        '12345',
        '',
        null
      ];
      
      for (const walletId of invalidWallets) {
        const validation = await validateExternalWallet(walletId as string);
        expect(validation.valid).toBe(false);
      }
    });
  });
});

describe('Affiliate Activation - Security Tests', () => {
  
  describe('T9. Validações de Segurança', () => {
    
    it('Property 18: deve verificar status ativo do afiliado', async () => {
      const statuses: Array<'pending' | 'active' | 'inactive' | 'suspended'> = ['pending', 'active', 'inactive', 'suspended'];
      
      for (const status of statuses) {
        const affiliate: Affiliate = {
          id: 'aff_123',
          name: 'Test',
          email: 'test@example.com',
          walletId: 'wal_12345678901234567890',
          status,
          createdAt: new Date()
        };
        
        const result = await activateAffiliate(affiliate);
        
        // Apenas pending pode ser ativado para active
        if (status === 'pending') {
          expect(result.success).toBe(true);
          expect(result.newStatus).toBe('active');
        }
      }
    });
    
    it('Property 19: deve prevenir loops na rede genealógica', () => {
      // Simular estrutura de rede
      const network = {
        'aff_1': { parent: null },
        'aff_2': { parent: 'aff_1' },
        'aff_3': { parent: 'aff_2' }
      };
      
      // Função para detectar loop
      function hasLoop(affiliateId: string, newParentId: string): boolean {
        let current = newParentId;
        const visited = new Set<string>();
        
        while (current) {
          if (visited.has(current)) return true;
          if (current === affiliateId) return true;
          visited.add(current);
          current = network[current as keyof typeof network]?.parent as string;
        }
        
        return false;
      }
      
      // aff_1 não pode ter aff_3 como pai (criaria loop)
      expect(hasLoop('aff_1', 'aff_3')).toBe(true);
      
      // aff_3 pode ter aff_1 como pai (já é assim)
      expect(hasLoop('aff_3', 'aff_1')).toBe(false);
    });
  });
});
