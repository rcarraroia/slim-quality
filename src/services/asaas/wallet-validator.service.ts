/**
 * Serviço para validação de Wallet IDs do Asaas
 * Task 2.1: Estender AsaasClient para validação de wallets
 */

import { supabase } from '@/config/supabase';

export interface WalletValidation {
  isValid: boolean;
  isActive: boolean;
  name?: string;
  email?: string;
  error?: string;
}

export interface WalletInfo {
  id: string;
  name: string;
  email: string;
  status: string;
  accountType: string;
}

export class WalletValidatorService {
  private readonly ASAAS_API_URL = 'https://api.asaas.com/v3';
  private readonly CACHE_TTL_MINUTES = 5;

  constructor(private apiKey: string) {}

  /**
   * Valida uma Wallet ID via API Asaas
   * Task 2.1: Implementar validateWallet() com retry policy
   */
  async validateWallet(walletId: string): Promise<WalletValidation> {
    try {
      // 1. Verificar cache primeiro
      const cached = await this.getCachedValidation(walletId);
      if (cached && !this.isCacheExpired(cached)) {
        return {
          isValid: cached.is_valid,
          isActive: cached.status === 'ACTIVE',
          name: cached.name,
          email: cached.email
        };
      }

      // 2. Validar formato UUID
      if (!this.isValidUUID(walletId)) {
        return {
          isValid: false,
          isActive: false,
          error: 'Wallet ID deve ser um UUID válido'
        };
      }

      // 3. Validar via API Asaas com retry
      const walletInfo = await this.validateWithAsaas(walletId);
      
      // 4. Atualizar cache
      await this.updateCache(walletId, walletInfo);

      return {
        isValid: true,
        isActive: walletInfo.status === 'ACTIVE',
        name: walletInfo.name,
        email: walletInfo.email
      };

    } catch (error) {
      console.error('Erro ao validar Wallet ID:', error);
      
      if (error instanceof Error) {
        return {
          isValid: false,
          isActive: false,
          error: error.message
        };
      }

      return {
        isValid: false,
        isActive: false,
        error: 'Erro interno na validação'
      };
    }
  }

  /**
   * Valida Wallet ID via API Asaas com retry
   * Task 2.1: Implementar timeout e retry policy
   */
  private async validateWithAsaas(walletId: string, retries = 3): Promise<WalletInfo> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(`${this.ASAAS_API_URL}/wallets/${walletId}`, {
          method: 'GET',
          headers: {
            'access_token': this.apiKey,
            'Content-Type': 'application/json'
          },
          signal: AbortSignal.timeout(10000) // 10s timeout
        });

        if (response.status === 404) {
          throw new Error('Wallet ID não encontrada no Asaas');
        }

        if (!response.ok) {
          throw new Error(`Erro na API Asaas: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        return {
          id: data.id,
          name: data.name,
          email: data.email,
          status: data.status,
          accountType: data.accountType || 'UNKNOWN'
        };

      } catch (error) {
        console.warn(`Tentativa ${attempt}/${retries} falhou:`, error);
        
        if (attempt === retries) {
          throw error;
        }

        // Backoff exponencial: 1s, 2s, 4s
        await this.sleep(Math.pow(2, attempt - 1) * 1000);
      }
    }

    throw new Error('Todas as tentativas de validação falharam');
  }

  /**
   * Busca validação no cache
   * Task 2.2: Implementar cache com TTL de 5 minutos
   */
  private async getCachedValidation(walletId: string) {
    try {
      const { data, error } = await supabase
        .from('asaas_wallets')
        .select('*')
        .eq('wallet_id', walletId)
        .single();

      if (error || !data) {
        return null;
      }

      return data;
    } catch (error) {
      console.warn('Erro ao buscar cache:', error);
      return null;
    }
  }

  /**
   * Atualiza cache de validação
   */
  private async updateCache(walletId: string, walletInfo: WalletInfo) {
    try {
      const cacheData = {
        wallet_id: walletId,
        name: walletInfo.name,
        email: walletInfo.email,
        status: walletInfo.status,
        account_type: walletInfo.accountType,
        last_validated_at: new Date().toISOString(),
        validation_response: walletInfo,
        is_valid: true
      };

      const { error } = await supabase
        .from('asaas_wallets')
        .upsert(cacheData, { onConflict: 'wallet_id' });

      if (error) {
        console.warn('Erro ao atualizar cache:', error);
      }
    } catch (error) {
      console.warn('Erro ao salvar cache:', error);
    }
  }

  /**
   * Verifica se cache expirou
   */
  private isCacheExpired(cached: any): boolean {
    if (!cached.last_validated_at) return true;
    
    const lastValidated = new Date(cached.last_validated_at);
    const now = new Date();
    const diffMinutes = (now.getTime() - lastValidated.getTime()) / (1000 * 60);
    
    return diffMinutes > this.CACHE_TTL_MINUTES;
  }

  /**
   * Valida formato UUID
   */
  private isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * Sleep helper para retry
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Valida múltiplas Wallet IDs
   * Útil para validar splits antes de enviar
   */
  async validateMultipleWallets(walletIds: string[]): Promise<Record<string, WalletValidation>> {
    const results: Record<string, WalletValidation> = {};
    
    // Validar em paralelo com limite de concorrência
    const promises = walletIds.map(async (walletId) => {
      const validation = await this.validateWallet(walletId);
      results[walletId] = validation;
    });

    await Promise.all(promises);
    return results;
  }

  /**
   * Limpa cache expirado
   * Deve ser executado periodicamente
   */
  async cleanExpiredCache(): Promise<number> {
    try {
      const expiredDate = new Date();
      expiredDate.setMinutes(expiredDate.getMinutes() - this.CACHE_TTL_MINUTES);

      const { data, error } = await supabase
        .from('asaas_wallets')
        .delete()
        .lt('last_validated_at', expiredDate.toISOString());

      if (error) {
        console.warn('Erro ao limpar cache:', error);
        return 0;
      }

      return data?.length || 0;
    } catch (error) {
      console.warn('Erro ao limpar cache expirado:', error);
      return 0;
    }
  }
}

// Instância singleton
export const walletValidator = new WalletValidatorService(
  process.env.ASAAS_API_KEY || ''
);