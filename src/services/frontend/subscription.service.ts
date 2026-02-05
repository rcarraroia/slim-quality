/**
 * Serviço Frontend para Assinaturas
 * Task 14.1: Criar serviços frontend para assinaturas
 * 
 * Consome APIs REST isoladas de assinaturas (/api/subscriptions/*)
 * Implementa estados de loading, polling e tratamento de erros
 */

import { supabase } from '@/config/supabase';

export interface CreateSubscriptionPaymentData {
  userId: string;
  planId: string;
  amount: number;
  orderItems: OrderItem[];
  customerData: CustomerData;
  paymentMethod: PaymentMethod;
  affiliateData?: AffiliateData;
}

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  value: number;
  description?: string;
  metadata?: {
    hasAI?: boolean;
    aiFeatures?: string[];
  };
}

export interface CustomerData {
  name: string;
  email: string;
  phone: string;
  cpf: string;
  address: {
    zipCode: string;
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
  };
}

export interface PaymentMethod {
  type: 'CREDIT_CARD' | 'PIX';
  creditCard?: {
    holderName: string;
    number: string;
    expiryMonth: string;
    expiryYear: string;
    ccv: string;
  };
}

export interface AffiliateData {
  referralCode?: string;
  affiliateId?: string;
}

export interface SubscriptionPaymentResult {
  success: boolean;
  data?: {
    paymentId: string;
    status: string;
    amount: number;
    correlationId: string;
    pollingUrl: string;
  };
  error?: string;
  details?: Array<{
    field: string;
    message: string;
  }>;
}

export interface PaymentStatus {
  success: boolean;
  data?: {
    paymentId: string;
    status: 'PENDING' | 'CONFIRMED' | 'FAILED' | 'CANCELLED';
    confirmedAt?: string;
    subscriptionId?: string;
    correlationId: string;
  };
  error?: string;
}

export interface CancellationResult {
  success: boolean;
  data?: {
    subscriptionId: string;
    cancelledAt: string;
    effectiveDate: string;
    refundAmount: number;
    correlationId: string;
  };
  error?: string;
  details?: Array<{
    field: string;
    message: string;
  }>;
}

export interface HealthStatus {
  success: boolean;
  service: string;
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  version: string;
}

/**
 * Estados de loading para feedback visual
 */
export interface LoadingStates {
  creatingPayment: boolean;
  checkingStatus: boolean;
  cancelling: boolean;
  polling: boolean;
}

/**
 * Configuração de polling
 */
export interface PollingConfig {
  maxAttempts: number;
  intervalMs: number;
  timeoutMs: number;
}

export class SubscriptionFrontendService {
  private baseUrl = '/api/subscriptions';
  private loadingStates: LoadingStates = {
    creatingPayment: false,
    checkingStatus: false,
    cancelling: false,
    polling: false
  };
  
  private pollingConfig: PollingConfig = {
    maxAttempts: 15, // 15 tentativas
    intervalMs: 1000, // 1 segundo entre tentativas
    timeoutMs: 15000 // 15 segundos total
  };

  /**
   * Cria pagamento de assinatura (primeira mensalidade)
   * Implementa loading state e tratamento de erros
   */
  async createSubscriptionPayment(data: CreateSubscriptionPaymentData): Promise<SubscriptionPaymentResult> {
    this.loadingStates.creatingPayment = true;
    
    try {
      // 1. Obter token de autenticação
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Usuário não autenticado');
      }

      // 2. Validar Order Items localmente (feedback imediato)
      if (!data.orderItems || data.orderItems.length === 0) {
        return {
          success: false,
          error: 'Order Items é obrigatório - necessário para detecção de produtos IA e cálculo de comissões'
        };
      }

      // 3. Chamar API de criação de pagamento
      const response = await fetch(`${this.baseUrl}/create-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.error || 'Erro ao criar pagamento de assinatura',
          details: result.details
        };
      }

      return {
        success: true,
        data: result.data
      };

    } catch (error) {
      console.error('Erro ao criar pagamento de assinatura:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro interno na criação do pagamento'
      };
    } finally {
      this.loadingStates.creatingPayment = false;
    }
  }

  /**
   * Verifica status do pagamento
   * Implementa loading state
   */
  async checkPaymentStatus(paymentId: string): Promise<PaymentStatus> {
    this.loadingStates.checkingStatus = true;
    
    try {
      // 1. Validar paymentId
      if (!paymentId || paymentId.length < 10) {
        return {
          success: false,
          error: 'Payment ID inválido'
        };
      }

      // 2. Chamar API de status
      const response = await fetch(`${this.baseUrl}/status/${paymentId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.error || 'Erro ao verificar status do pagamento'
        };
      }

      return {
        success: true,
        data: result.data
      };

    } catch (error) {
      console.error('Erro ao verificar status:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro interno na verificação de status'
      };
    } finally {
      this.loadingStates.checkingStatus = false;
    }
  }

  /**
   * Implementa polling automático para status do pagamento
   * Feedback visual de progresso durante polling
   */
  async pollPaymentStatus(paymentId: string, onProgress?: (attempt: number, maxAttempts: number) => void): Promise<PaymentStatus> {
    this.loadingStates.polling = true;
    
    try {
      let attempts = 0;
      
      while (attempts < this.pollingConfig.maxAttempts) {
        attempts++;
        
        // Callback de progresso para UI
        if (onProgress) {
          onProgress(attempts, this.pollingConfig.maxAttempts);
        }

        // Verificar status
        const statusResult = await this.checkPaymentStatus(paymentId);
        
        if (!statusResult.success) {
          // Se erro na verificação, continuar tentando
          await this.sleep(this.pollingConfig.intervalMs);
          continue;
        }

        // Se pagamento confirmado ou falhou, retornar resultado
        if (statusResult.data?.status === 'CONFIRMED' || statusResult.data?.status === 'FAILED') {
          return statusResult;
        }

        // Se ainda pendente, aguardar e tentar novamente
        if (attempts < this.pollingConfig.maxAttempts) {
          await this.sleep(this.pollingConfig.intervalMs);
        }
      }

      // Timeout - retornar último status conhecido
      return {
        success: false,
        error: 'Timeout na verificação do pagamento. Tente verificar novamente em alguns minutos.'
      };

    } catch (error) {
      console.error('Erro no polling de status:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro interno no polling'
      };
    } finally {
      this.loadingStates.polling = false;
    }
  }

  /**
   * Cancela assinatura
   * Implementa loading state e validação
   */
  async cancelSubscription(subscriptionId: string, reason: string, immediate = false): Promise<CancellationResult> {
    this.loadingStates.cancelling = true;
    
    try {
      // 1. Obter token de autenticação
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Usuário não autenticado');
      }

      // 2. Validar dados localmente
      if (!subscriptionId || subscriptionId.length < 10) {
        return {
          success: false,
          error: 'Subscription ID inválido'
        };
      }

      if (!reason || reason.length < 10) {
        return {
          success: false,
          error: 'Motivo do cancelamento deve ter pelo menos 10 caracteres'
        };
      }

      // 3. Chamar API de cancelamento
      const response = await fetch(`${this.baseUrl}/cancel/${subscriptionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ reason, immediate })
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: result.error || 'Erro ao cancelar assinatura',
          details: result.details
        };
      }

      return {
        success: true,
        data: result.data
      };

    } catch (error) {
      console.error('Erro ao cancelar assinatura:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro interno no cancelamento'
      };
    } finally {
      this.loadingStates.cancelling = false;
    }
  }

  /**
   * Verifica saúde do serviço de assinaturas
   */
  async checkHealth(): Promise<HealthStatus> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        return {
          success: false,
          service: 'subscription-api',
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          version: 'unknown'
        };
      }

      const result = await response.json();
      return result;

    } catch (error) {
      console.error('Erro ao verificar saúde do serviço:', error);
      return {
        success: false,
        service: 'subscription-api',
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        version: 'unknown'
      };
    }
  }

  /**
   * Obtém estados de loading atuais
   * Para uso em componentes React
   */
  getLoadingStates(): LoadingStates {
    return { ...this.loadingStates };
  }

  /**
   * Verifica se alguma operação está em loading
   */
  isLoading(): boolean {
    return Object.values(this.loadingStates).some(state => state);
  }

  /**
   * Reseta todos os estados de loading
   * Útil para cleanup de componentes
   */
  resetLoadingStates(): void {
    this.loadingStates = {
      creatingPayment: false,
      checkingStatus: false,
      cancelling: false,
      polling: false
    };
  }

  /**
   * Configura parâmetros de polling
   */
  configurePolling(config: Partial<PollingConfig>): void {
    this.pollingConfig = {
      ...this.pollingConfig,
      ...config
    };
  }

  /**
   * Utilitário para aguardar (sleep)
   * @private
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Formata mensagens de erro para exibição amigável
   */
  formatErrorMessage(error: string): string {
    // Mapear erros técnicos para mensagens amigáveis
    const errorMap: Record<string, string> = {
      'Order Items cannot be empty': 'É necessário selecionar pelo menos um produto para continuar',
      'Payment ID inválido': 'Identificador do pagamento é inválido',
      'Subscription ID inválido': 'Identificador da assinatura é inválido',
      'Usuário não autenticado': 'Você precisa estar logado para continuar',
      'Timeout na verificação': 'A verificação está demorando mais que o esperado. Tente novamente em alguns minutos.',
      'Erro interno': 'Ocorreu um erro interno. Nossa equipe foi notificada.'
    };

    // Buscar mensagem amigável ou retornar erro original
    for (const [key, friendlyMessage] of Object.entries(errorMap)) {
      if (error.includes(key)) {
        return friendlyMessage;
      }
    }

    return error;
  }

  /**
   * Valida dados de pagamento localmente antes de enviar
   * Feedback imediato para o usuário
   */
  validatePaymentData(data: CreateSubscriptionPaymentData): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validar Order Items
    if (!data.orderItems || data.orderItems.length === 0) {
      errors.push('É necessário selecionar pelo menos um produto');
    }

    // Validar dados do cliente
    if (!data.customerData.name || data.customerData.name.length < 3) {
      errors.push('Nome deve ter pelo menos 3 caracteres');
    }

    if (!data.customerData.email || !this.isValidEmail(data.customerData.email)) {
      errors.push('Email inválido');
    }

    if (!data.customerData.cpf || !this.isValidCPF(data.customerData.cpf)) {
      errors.push('CPF inválido');
    }

    // Validar método de pagamento
    if (data.paymentMethod.type === 'CREDIT_CARD') {
      if (!data.paymentMethod.creditCard) {
        errors.push('Dados do cartão são obrigatórios');
      } else {
        const card = data.paymentMethod.creditCard;
        if (!card.number || card.number.length !== 16) {
          errors.push('Número do cartão deve ter 16 dígitos');
        }
        if (!card.ccv || card.ccv.length < 3) {
          errors.push('CCV inválido');
        }
      }
    }

    // Validar valor
    if (!data.amount || data.amount <= 0) {
      errors.push('Valor deve ser maior que zero');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Valida email
   * @private
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Valida CPF
   * @private
   */
  private isValidCPF(cpf: string): boolean {
    // Remove formatação
    const cleanCPF = cpf.replace(/\D/g, '');
    
    // Verifica se tem 11 dígitos
    if (cleanCPF.length !== 11) return false;
    
    // Verifica se não são todos iguais
    if (/^(\d)\1{10}$/.test(cleanCPF)) return false;
    
    // Validação dos dígitos verificadores
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cleanCPF.charAt(i)) * (10 - i);
    }
    let digit1 = 11 - (sum % 11);
    if (digit1 > 9) digit1 = 0;
    
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cleanCPF.charAt(i)) * (11 - i);
    }
    let digit2 = 11 - (sum % 11);
    if (digit2 > 9) digit2 = 0;
    
    return digit1 === parseInt(cleanCPF.charAt(9)) && digit2 === parseInt(cleanCPF.charAt(10));
  }
}

// Instância singleton
export const subscriptionFrontendService = new SubscriptionFrontendService();