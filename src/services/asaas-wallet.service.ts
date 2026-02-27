/**
 * Asaas Wallet Service - ETAPA 2: Configuração Financeira (Wallet)
 * 
 * Serviço para gerenciamento de Wallet IDs via API Asaas
 * Separado do asaas.service.ts para não conflitar com vendas de produtos físicos
 */

import { supabase } from '@/config/supabase';

// ============================================
// TYPES
// ============================================

export interface CreateAccountData {
  name: string;
  email: string;
  cpfCnpj: string;
  mobilePhone: string;
  incomeValue: number;
  address: string;
  addressNumber: string;
  province: string;
  postalCode: string;
}

export interface CreateAccountResponse {
  walletId: string;
  accountId: string;
  apiKey?: string;
  message: string;
}

export interface ConfigureWalletResponse {
  affiliateId: string;
  walletId: string;
  financial_status: 'ativo';
  message: string;
}

export interface AsaasError {
  success: false;
  error: string;
  field?: string;
  details?: string;
}

// ============================================
// ASAAS WALLET SERVICE CLASS
// ============================================

export class AsaasWalletService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_URL || '/api';
  }

  /**
   * Obtém token de autenticação do Supabase
   */
  private async getAuthToken(): Promise<string> {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error('Usuário não autenticado');
    }
    
    return session.access_token;
  }

  /**
   * Cria subconta no Asaas e retorna Wallet ID
   * 
   * @param data - Dados para criação da conta
   * @returns Wallet ID (UUID) e API Key da subconta criada
   * @throws Error se criação falhar
   * 
   * @example
   * ```typescript
   * const result = await asaasWalletService.createAccount({
   *   name: 'João Silva',
   *   email: 'joao@example.com',
   *   cpfCnpj: '12345678910',
   *   mobilePhone: '+5511999887766',
   *   incomeValue: 5000,
   *   address: 'Rua Exemplo',
   *   addressNumber: '123',
   *   province: 'Centro',
   *   postalCode: '12345678'
   * });
   * console.log(result.walletId); // 'c0c1688f-636b-42c0-b6ee-7339182276b7'
   * ```
   */
  async createAccount(data: CreateAccountData): Promise<CreateAccountResponse> {
    try {
      const token = await this.getAuthToken();

      const response = await fetch(`${this.baseUrl}/affiliates?action=create-asaas-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao criar conta no Asaas');
      }

      return result.data;
    } catch (error) {
      console.error('[AsaasWalletService] Erro ao criar conta:', error);
      throw error;
    }
  }

  /**
   * Configura Wallet ID do afiliado e atualiza status para ativo
   * 
   * @param walletId - Wallet ID no formato UUID
   * @returns Dados atualizados do afiliado
   * @throws Error se configuração falhar
   * 
   * @example
   * ```typescript
   * const result = await asaasWalletService.configureWallet('c0c1688f-636b-42c0-b6ee-7339182276b7');
   * console.log(result.financial_status); // 'ativo'
   * ```
   */
  async configureWallet(walletId: string): Promise<ConfigureWalletResponse> {
    try {
      const token = await this.getAuthToken();

      const response = await fetch(`${this.baseUrl}/affiliates?action=configure-wallet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ walletId })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao configurar wallet');
      }

      return result.data;
    } catch (error) {
      console.error('[AsaasWalletService] Erro ao configurar wallet:', error);
      throw error;
    }
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

export const asaasWalletService = new AsaasWalletService();
