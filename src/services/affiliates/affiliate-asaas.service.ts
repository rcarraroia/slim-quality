/**
 * Affiliate Asaas Service
 * Sprint 4: Sistema de Afiliados Multinível
 * 
 * Extensão do AsaasService para funcionalidades específicas de afiliados
 * - Validação avançada de Wallet IDs
 * - Cache de validações
 * - Split automático de comissões
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { supabase } from '@/config/supabase';
import { Logger } from '@/utils/logger';
import type {
  WalletValidation,
  WalletInfo,
  SplitItem,
  SplitResponse,
  SplitStatus,
  ServiceResponse,
} from '@/types/affiliate.types';

export class AffiliateAsaasService {
  private client: AxiosInstance;
  private apiKey: string;
  private environment: 'sandbox' | 'production';
  private walletFabrica: string;
  private walletRenum: string;
  private walletJB: string;

  constructor() {
    this.apiKey = process.env.ASAAS_API_KEY || '';
    this.environment = (process.env.ASAAS_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox';
    this.walletFabrica = process.env.ASAAS_WALLET_FABRICA || '';
    this.walletRenum = process.env.ASAAS_WALLET_RENUM || '';
    this.walletJB = process.env.ASAAS_WALLET_JB || '';

    const baseURL = this.environment === 'sandbox'
      ? 'https://sandbox.asaas.com/api/v3'
      : 'https://api.asaas.com/v3';

    this.client = axios.create({
      baseURL,
      headers: {
        'access_token': this.apiKey,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    // Interceptors para logs
    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    this.client.interceptors.request.use(
      (config) => {
        Logger.info('AffiliateAsaasService', 'Request', {
          method: config.method?.toUpperCase(),
          url: config.url,
          walletId: this.extractWalletIdFromUrl(config.url),
        });
        return config;
      },
      (error) => {
        Logger.error('AffiliateAsaasService', 'Request error', error);
        return Promise.reject(error);
      }
    );

    this.client.interceptors.response.use(
      (response) => {
        Logger.info('AffiliateAsaasService', 'Response', {
          status: response.status,
          url: response.config.url,
          walletId: this.extractWalletIdFromUrl(response.config.url),
        });
        return response;
      },
      (error: AxiosError) => {
        Logger.error('AffiliateAsaasService', 'Response error', error, {
          status: error.response?.status,
          data: error.response?.data,
          walletId: this.extractWalletIdFromUrl(error.config?.url),
        });
        return Promise.reject(error);
      }
    );
  }

  private extractWalletIdFromUrl(url?: string): string | null {
    if (!url) return null;
    const match = url.match(/\/wallets\/([^\/]+)/);
    return match ? match[1] : null;
  }

  /**
   * Retry com backoff exponencial
   */
  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        
        // Não fazer retry em erros 4xx (exceto 429)
        if (axios.isAxiosError(error)) {
          const status = error.response?.status;
          if (status && status >= 400 && status < 500 && status !== 429) {
            throw error;
          }
        }

        if (attempt < maxRetries - 1) {
          const delay = baseDelay * Math.pow(2, attempt);
          Logger.info('AffiliateAsaasService', `Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  /**
   * Valida Wallet ID via API Asaas com cache
   */
  async validateWallet(walletId: string): Promise<WalletValidation> {
    try {
      Logger.info('AffiliateAsaasService', 'Validating wallet', { walletId });

      // 1. Verificar cache primeiro
      const { data: cachedValidation } = await supabase
        .rpc('validate_asaas_wallet', { p_wallet_id: walletId })
        .single();

      if (cachedValidation && cachedValidation.cached) {
        Logger.info('AffiliateAsaasService', 'Using cached validation', { 
          walletId, 
          isValid: cachedValidation.is_valid 
        });
        
        return {
          isValid: cachedValidation.is_valid,
          isActive: cachedValidation.is_active,
          name: cachedValidation.name,
          email: cachedValidation.email,
          error: cachedValidation.error_message,
        };
      }

      // 2. Validar via API Asaas
      const response = await this.retryWithBackoff(() =>
        this.client.get(`/wallets/${walletId}`)
      );

      const walletData = response.data;
      const isValid = true;
      const isActive = walletData.status === 'ACTIVE';

      // 3. Armazenar no cache
      await supabase.rpc('cache_wallet_validation', {
        p_wallet_id: walletId,
        p_validation_response: walletData,
        p_is_valid: isValid,
        p_error_message: null,
      });

      Logger.info('AffiliateAsaasService', 'Wallet validation successful', {
        walletId,
        isValid,
        isActive,
        name: walletData.name,
      });

      return {
        isValid,
        isActive,
        name: walletData.name,
        email: walletData.email,
      };

    } catch (error) {
      const axiosError = error as AxiosError;
      const errorMessage = axiosError.response?.status === 404 
        ? 'Wallet ID não encontrada'
        : axiosError.message;

      Logger.error('AffiliateAsaasService', 'Wallet validation failed', error as Error, {
        walletId,
        status: axiosError.response?.status,
      });

      // Armazenar erro no cache
      await supabase.rpc('cache_wallet_validation', {
        p_wallet_id: walletId,
        p_validation_response: axiosError.response?.data || null,
        p_is_valid: false,
        p_error_message: errorMessage,
      });

      return {
        isValid: false,
        isActive: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Obtém informações detalhadas da wallet
   */
  async getWalletInfo(walletId: string): Promise<ServiceResponse<WalletInfo>> {
    try {
      const response = await this.retryWithBackoff(() =>
        this.client.get(`/wallets/${walletId}`)
      );

      const walletData = response.data;

      return {
        success: true,
        data: {
          id: walletData.id,
          name: walletData.name,
          email: walletData.email,
          status: walletData.status,
          accountType: walletData.accountType,
          document: walletData.cpfCnpj,
          createdAt: walletData.dateCreated,
        },
      };

    } catch (error) {
      const axiosError = error as AxiosError;
      Logger.error('AffiliateAsaasService', 'Error getting wallet info', error as Error);

      return {
        success: false,
        error: axiosError.response?.status === 404 
          ? 'Wallet não encontrada'
          : 'Erro ao consultar wallet',
        code: 'WALLET_INFO_ERROR',
      };
    }
  }

  /**
   * Cria split automático no Asaas
   */
  async createSplit(paymentId: string, splits: SplitItem[]): Promise<ServiceResponse<SplitResponse>> {
    try {
      Logger.info('AffiliateAsaasService', 'Creating split', {
        paymentId,
        splitsCount: splits.length,
        totalValue: splits.reduce((sum, split) => sum + split.fixedValue, 0),
      });

      // 1. Validar integridade do split
      const validationResult = await this.validateSplitIntegrity(splits);
      if (!validationResult.success) {
        return validationResult;
      }

      // 2. Verificar se split já foi executado (idempotência)
      const { data: existingSplit } = await supabase
        .from('commission_splits')
        .select('asaas_split_id, status')
        .eq('order_id', paymentId) // Assumindo que paymentId é o order_id
        .single();

      if (existingSplit?.asaas_split_id) {
        Logger.info('AffiliateAsaasService', 'Split already exists', {
          paymentId,
          existingSplitId: existingSplit.asaas_split_id,
        });

        return {
          success: true,
          data: {
            id: existingSplit.asaas_split_id,
            status: existingSplit.status as SplitStatus,
            splits,
            totalValue: splits.reduce((sum, split) => sum + split.fixedValue, 0),
            createdAt: new Date().toISOString(),
          },
        };
      }

      // 3. Executar split no Asaas
      const response = await this.retryWithBackoff(() =>
        this.client.post(`/payments/${paymentId}/split`, { splits })
      );

      const splitData = response.data;

      // 4. Atualizar registro no banco
      await supabase
        .from('commission_splits')
        .update({
          asaas_split_id: splitData.id,
          status: 'sent',
          asaas_response: splitData,
          updated_at: new Date().toISOString(),
        })
        .eq('order_id', paymentId);

      Logger.info('AffiliateAsaasService', 'Split created successfully', {
        paymentId,
        splitId: splitData.id,
      });

      return {
        success: true,
        data: {
          id: splitData.id,
          status: 'PENDING' as SplitStatus,
          splits,
          totalValue: splits.reduce((sum, split) => sum + split.fixedValue, 0),
          createdAt: splitData.dateCreated,
        },
      };

    } catch (error) {
      const axiosError = error as AxiosError;
      Logger.error('AffiliateAsaasService', 'Error creating split', error as Error);

      // Marcar como falha no banco
      await supabase
        .from('commission_splits')
        .update({
          status: 'failed',
          asaas_response: axiosError.response?.data || { error: axiosError.message },
          updated_at: new Date().toISOString(),
        })
        .eq('order_id', paymentId);

      return {
        success: false,
        error: 'Erro ao criar split no Asaas',
        code: 'SPLIT_CREATION_ERROR',
      };
    }
  }

  /**
   * Consulta status do split
   */
  async getSplitStatus(splitId: string): Promise<ServiceResponse<SplitStatus>> {
    try {
      const response = await this.retryWithBackoff(() =>
        this.client.get(`/splits/${splitId}`)
      );

      const splitData = response.data;
      return {
        success: true,
        data: splitData.status as SplitStatus,
      };

    } catch (error) {
      Logger.error('AffiliateAsaasService', 'Error getting split status', error as Error);
      return {
        success: false,
        error: 'Erro ao consultar status do split',
        code: 'SPLIT_STATUS_ERROR',
      };
    }
  }

  /**
   * Cancela split (se possível)
   */
  async cancelSplit(splitId: string): Promise<ServiceResponse<void>> {
    try {
      await this.retryWithBackoff(() =>
        this.client.delete(`/splits/${splitId}`)
      );

      Logger.info('AffiliateAsaasService', 'Split cancelled', { splitId });
      return { success: true };

    } catch (error) {
      Logger.error('AffiliateAsaasService', 'Error cancelling split', error as Error);
      return {
        success: false,
        error: 'Erro ao cancelar split',
        code: 'SPLIT_CANCEL_ERROR',
      };
    }
  }

  /**
   * Valida integridade do split antes de enviar
   */
  async validateSplitIntegrity(splits: SplitItem[]): Promise<ServiceResponse<boolean>> {
    try {
      // 1. Verificar se todas as wallets existem
      const walletValidations = await Promise.all(
        splits.map(split => this.validateWallet(split.walletId))
      );

      const invalidWallets = walletValidations
        .map((validation, index) => ({ validation, walletId: splits[index].walletId }))
        .filter(({ validation }) => !validation.isValid);

      if (invalidWallets.length > 0) {
        Logger.error('AffiliateAsaasService', 'Invalid wallets in split', new Error('Invalid wallets'), {
          invalidWallets: invalidWallets.map(w => w.walletId),
        });

        return {
          success: false,
          error: `Wallets inválidas: ${invalidWallets.map(w => w.walletId).join(', ')}`,
          code: 'INVALID_WALLETS',
        };
      }

      // 2. Verificar se nenhum valor é negativo ou zero
      const invalidValues = splits.filter(split => split.fixedValue <= 0);
      if (invalidValues.length > 0) {
        return {
          success: false,
          error: 'Valores devem ser positivos',
          code: 'INVALID_VALUES',
        };
      }

      // 3. Verificar se não há wallets duplicadas
      const walletIds = splits.map(split => split.walletId);
      const uniqueWalletIds = new Set(walletIds);
      if (walletIds.length !== uniqueWalletIds.size) {
        return {
          success: false,
          error: 'Wallets duplicadas no split',
          code: 'DUPLICATE_WALLETS',
        };
      }

      Logger.info('AffiliateAsaasService', 'Split integrity validation passed', {
        splitsCount: splits.length,
        totalValue: splits.reduce((sum, split) => sum + split.fixedValue, 0),
      });

      return { success: true, data: true };

    } catch (error) {
      Logger.error('AffiliateAsaasService', 'Error validating split integrity', error as Error);
      return {
        success: false,
        error: 'Erro ao validar integridade do split',
        code: 'SPLIT_VALIDATION_ERROR',
      };
    }
  }

  /**
   * Prepara splits para um pedido com comissões
   */
  prepareSplitsForOrder(
    orderValue: number,
    commissionSplit: {
      factoryValue: number;
      n1?: { walletId: string; value: number };
      n2?: { walletId: string; value: number };
      n3?: { walletId: string; value: number };
      renumValue: number;
      jbValue: number;
    }
  ): SplitItem[] {
    const splits: SplitItem[] = [];

    // Fábrica (70%)
    splits.push({
      walletId: this.walletFabrica,
      fixedValue: commissionSplit.factoryValue,
      description: 'Fábrica - 70%',
    });

    // N1 (15% se houver)
    if (commissionSplit.n1) {
      splits.push({
        walletId: commissionSplit.n1.walletId,
        fixedValue: commissionSplit.n1.value,
        description: 'Afiliado N1 - 15%',
      });
    }

    // N2 (3% se houver)
    if (commissionSplit.n2) {
      splits.push({
        walletId: commissionSplit.n2.walletId,
        fixedValue: commissionSplit.n2.value,
        description: 'Afiliado N2 - 3%',
      });
    }

    // N3 (2% se houver)
    if (commissionSplit.n3) {
      splits.push({
        walletId: commissionSplit.n3.walletId,
        fixedValue: commissionSplit.n3.value,
        description: 'Afiliado N3 - 2%',
      });
    }

    // Renum (5% + redistribuição)
    splits.push({
      walletId: this.walletRenum,
      fixedValue: commissionSplit.renumValue,
      description: 'Gestor Renum',
    });

    // JB (5% + redistribuição)
    splits.push({
      walletId: this.walletJB,
      fixedValue: commissionSplit.jbValue,
      description: 'Gestor JB',
    });

    Logger.info('AffiliateAsaasService', 'Splits prepared for order', {
      orderValue,
      splitsCount: splits.length,
      totalSplitValue: splits.reduce((sum, split) => sum + split.fixedValue, 0),
    });

    return splits;
  }
}

export const affiliateAsaasService = new AffiliateAsaasService();