import axios from 'axios';

interface WalletValidationResult {
  isValid: boolean;
  isActive: boolean;
  walletId: string;
  accountName?: string;
  error?: string;
}

export class AsaasValidator {
  private baseUrl: string;
  private apiKey: string;
  private cache: Map<string, { result: WalletValidationResult; timestamp: number }>;
  private cacheTTL: number = 24 * 60 * 60 * 1000; // 24 horas

  constructor() {
    this.baseUrl = process.env.ASAAS_ENVIRONMENT === 'production' 
      ? 'https://api.asaas.com/v3' 
      : 'https://api-sandbox.asaas.com/v3';
    this.apiKey = process.env.ASAAS_API_KEY || '';
    this.cache = new Map();
  }

  async validateWallet(walletId: string): Promise<WalletValidationResult> {
    // Verificar cache
    const cached = this.cache.get(walletId);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.result;
    }

    try {
      const response = await axios.get(`${this.baseUrl}/wallets/${walletId}`, {
        headers: {
          'access_token': this.apiKey,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      const result: WalletValidationResult = {
        isValid: true,
        isActive: response.data.status === 'ACTIVE',
        walletId,
        accountName: response.data.name
      };

      // Salvar no cache
      this.cache.set(walletId, { result, timestamp: Date.now() });

      return result;
    } catch (error: any) {
      if (error.response?.status === 404) {
        const result: WalletValidationResult = {
          isValid: false,
          isActive: false,
          walletId,
          error: 'Wallet ID not found'
        };
        
        // Cache resultado negativo por menos tempo (1 hora)
        this.cache.set(walletId, { 
          result, 
          timestamp: Date.now() - (this.cacheTTL - 60 * 60 * 1000) 
        });
        
        return result;
      }

      return {
        isValid: false,
        isActive: false,
        walletId,
        error: error.message || 'Validation failed'
      };
    }
  }

  async getWalletInfo(walletId: string): Promise<WalletValidationResult> {
    return this.validateWallet(walletId);
  }

  clearCache(): void {
    this.cache.clear();
  }

  getCacheSize(): number {
    return this.cache.size;
  }

  // Método para limpar cache expirado
  cleanExpiredCache(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.cacheTTL) {
        this.cache.delete(key);
      }
    }
  }
}

// Singleton
export const asaasValidator = new AsaasValidator();

// Limpar cache expirado a cada hora
setInterval(() => {
  asaasValidator.cleanExpiredCache();
}, 60 * 60 * 1000);