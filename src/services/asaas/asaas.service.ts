/**
 * Asaas Service
 * Sprint 3: Sistema de Vendas
 * 
 * Integração com API do Asaas para pagamentos e splits
 * Documentação: https://docs.asaas.com
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { supabase } from '@/config/supabase';
import { Logger } from '@/utils/logger';
import type {
  AsaasCustomer,
  AsaasPayment,
  AsaasSplit,
  AsaasPixQrCode,
  CreateAsaasCustomerRequest,
  CreateAsaasPaymentRequest,
  AsaasBillingType,
  ServiceResponse,
  PixPaymentResponse,
  CreditCardPaymentResponse,
} from '@/types/sales.types';

export class AsaasService {
  private client: AxiosInstance;
  private apiKey: string;
  private environment: 'sandbox' | 'production';
  private walletRenum: string;
  private walletJB: string;
  private webhookToken: string;

  constructor() {
    this.apiKey = process.env.ASAAS_API_KEY || '';
    this.environment = (process.env.ASAAS_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox';
    this.walletRenum = process.env.ASAAS_WALLET_RENUM || '';
    this.walletJB = process.env.ASAAS_WALLET_JB || '';
    this.webhookToken = process.env.ASAAS_WEBHOOK_TOKEN || '';

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

    // Interceptor para logs de request
    this.client.interceptors.request.use(
      (config) => {
        Logger.info('AsaasService', 'Request', {
          method: config.method?.toUpperCase(),
          url: config.url,
          data: this.sanitizeLogData(config.data),
        });
        return config;
      },
      (error) => {
        Logger.error('AsaasService', 'Request error', error);
        return Promise.reject(error);
      }
    );

    // Interceptor para logs de response
    this.client.interceptors.response.use(
      (response) => {
        Logger.info('AsaasService', 'Response', {
          status: response.status,
          url: response.config.url,
          data: this.sanitizeLogData(response.data),
        });
        return response;
      },
      (error: AxiosError) => {
        Logger.error('AsaasService', 'Response error', error, {
          status: error.response?.status,
          data: error.response?.data,
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Remove dados sensíveis dos logs
   */
  private sanitizeLogData(data: any): any {
    if (!data) return data;
    
    const sanitized = { ...data };
    
    // Remover dados sensíveis de cartão
    if (sanitized.creditCard) {
      sanitized.creditCard = {
        ...sanitized.creditCard,
        number: '****',
        ccv: '***',
      };
    }
    
    if (sanitized.creditCardHolderInfo) {
      sanitized.creditCardHolderInfo = {
        ...sanitized.creditCardHolderInfo,
        cpfCnpj: sanitized.creditCardHolderInfo.cpfCnpj?.replace(/\d(?=\d{4})/g, '*'),
      };
    }
    
    return sanitized;
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
          Logger.info('AsaasService', `Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  /**
   * Registra transação no banco
   */
  private async logTransaction(
    type: 'create_customer' | 'create_payment' | 'get_payment' | 'webhook',
    request: any,
    response: any,
    success: boolean,
    error?: string,
    metadata?: {
      orderId?: string;
      paymentId?: string;
      asaasCustomerId?: string;
      asaasPaymentId?: string;
      httpStatus?: number;
    }
  ): Promise<void> {
    try {
      await supabase.from('asaas_transactions').insert({
        order_id: metadata?.orderId,
        payment_id: metadata?.paymentId,
        transaction_type: type,
        request_payload: request,
        response_payload: response,
        success,
        error_message: error,
        http_status: metadata?.httpStatus,
        asaas_customer_id: metadata?.asaasCustomerId,
        asaas_payment_id: metadata?.asaasPaymentId,
      });
    } catch (logError) {
      Logger.error('AsaasService', 'Erro ao registrar transação', logError as Error);
    }
  }

  /**
   * Busca ou cria customer no Asaas
   */
  async getOrCreateCustomer(
    customerData: CreateAsaasCustomerRequest,
    orderId?: string
  ): Promise<ServiceResponse<AsaasCustomer>> {
    try {
      Logger.info('AsaasService', 'Buscando/criando customer', {
        email: customerData.email,
        cpfCnpj: customerData.cpfCnpj?.replace(/\d(?=\d{4})/g, '*'),
      });

      // 1. Tentar buscar customer existente por CPF/CNPJ
      const searchResponse = await this.retryWithBackoff(() =>
        this.client.get('/customers', {
          params: { cpfCnpj: customerData.cpfCnpj },
        })
      );

      if (searchResponse.data.data && searchResponse.data.data.length > 0) {
        const existingCustomer = searchResponse.data.data[0];
        Logger.info('AsaasService', 'Customer existente encontrado', {
          customerId: existingCustomer.id,
        });

        await this.logTransaction(
          'create_customer',
          customerData,
          existingCustomer,
          true,
          undefined,
          { orderId, asaasCustomerId: existingCustomer.id, httpStatus: 200 }
        );

        return { success: true, data: existingCustomer };
      }

      // 2. Criar novo customer
      const createResponse = await this.retryWithBackoff(() =>
        this.client.post('/customers', customerData)
      );

      const newCustomer = createResponse.data;
      Logger.info('AsaasService', 'Customer criado com sucesso', {
        customerId: newCustomer.id,
      });

      await this.logTransaction(
        'create_customer',
        customerData,
        newCustomer,
        true,
        undefined,
        { orderId, asaasCustomerId: newCustomer.id, httpStatus: 201 }
      );

      return { success: true, data: newCustomer };
    } catch (error) {
      const axiosError = error as AxiosError;
      const errorMessage = axiosError.response?.data
        ? JSON.stringify(axiosError.response.data)
        : axiosError.message;

      Logger.error('AsaasService', 'Erro ao buscar/criar customer', error as Error);

      await this.logTransaction(
        'create_customer',
        customerData,
        axiosError.response?.data,
        false,
        errorMessage,
        { orderId, httpStatus: axiosError.response?.status }
      );

      return {
        success: false,
        error: 'Erro ao criar customer no Asaas',
        code: 'ASAAS_CUSTOMER_ERROR',
      };
    }
  }

  /**
   * Calcula splits para o pedido
   * 
   * Regras:
   * - 70% para fábrica (não incluído - ela recebe o restante)
   * - 30% para comissões:
   *   - 15% N1 (afiliado direto)
   *   - 3% N2 (indicado do N1)
   *   - 2% N3 (indicado do N2)
   *   - 5% Renum (gestor)
   *   - 5% JB (gestor)
   * 
   * Redistribuição quando não há rede completa:
   * - Sem N2 e N3: +2.5% Renum, +2.5% JB
   * - Sem N3: +1% Renum, +1% JB
   */
  calculateSplits(
    totalAmount: number,
    affiliates?: {
      n1?: { id: string; walletId: string };
      n2?: { id: string; walletId: string };
      n3?: { id: string; walletId: string };
    }
  ): AsaasSplit[] {
    const splits: AsaasSplit[] = [];

    // Percentuais base
    let renumPercent = 5;
    let jbPercent = 5;

    // N1 - Afiliado direto (15%)
    if (affiliates?.n1) {
      splits.push({
        walletId: affiliates.n1.walletId,
        percentualValue: 15,
      });
    }

    // N2 - Indicado do N1 (3%)
    if (affiliates?.n2) {
      splits.push({
        walletId: affiliates.n2.walletId,
        percentualValue: 3,
      });
    } else if (affiliates?.n1) {
      // Redistribuir 1.5% para cada gestor
      renumPercent += 1.5;
      jbPercent += 1.5;
    }

    // N3 - Indicado do N2 (2%)
    if (affiliates?.n3) {
      splits.push({
        walletId: affiliates.n3.walletId,
        percentualValue: 2,
      });
    } else if (affiliates?.n2) {
      // Redistribuir 1% para cada gestor
      renumPercent += 1;
      jbPercent += 1;
    } else if (affiliates?.n1) {
      // Sem N2 e N3: redistribuir 2.5% para cada gestor
      renumPercent += 1; // Já somou 1.5, falta 1
      jbPercent += 1;
    }

    // Gestores (sempre presentes)
    splits.push({
      walletId: this.walletRenum,
      percentualValue: renumPercent,
    });

    splits.push({
      walletId: this.walletJB,
      percentualValue: jbPercent,
    });

    // Validar que soma = 30% (ou menos se não houver afiliados)
    const totalPercent = splits.reduce((sum, split) => sum + (split.percentualValue || 0), 0);
    
    Logger.info('AsaasService', 'Splits calculados', {
      totalAmount,
      totalPercent,
      splits: splits.map(s => ({
        walletId: s.walletId.slice(-6),
        percent: s.percentualValue,
      })),
    });

    if (totalPercent > 30) {
      Logger.error('AsaasService', 'Erro: splits excedem 30%', new Error('Invalid splits'), {
        totalPercent,
        splits,
      });
      throw new Error(`Splits excedem 30%: ${totalPercent}%`);
    }

    return splits;
  }

  /**
   * Cria cobrança PIX com splits configurados
   */
  async createPixPayment(
    orderId: string,
    customerId: string,
    amount: number,
    description: string,
    affiliates?: {
      n1?: { id: string; walletId: string };
      n2?: { id: string; walletId: string };
      n3?: { id: string; walletId: string };
    }
  ): Promise<ServiceResponse<PixPaymentResponse>> {
    try {
      Logger.info('AsaasService', 'Criando cobrança PIX', {
        orderId,
        customerId,
        amount,
        hasAffiliates: !!affiliates?.n1,
      });

      // Calcular splits
      const splits = this.calculateSplits(amount, affiliates);

      // Data de vencimento (7 dias)
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);

      const paymentData: CreateAsaasPaymentRequest = {
        customer: customerId,
        billingType: 'PIX' as AsaasBillingType,
        value: amount,
        dueDate: dueDate.toISOString().split('T')[0],
        description,
        externalReference: orderId,
        splits, // ⚠️ Configurar NA CRIAÇÃO
      };

      const response = await this.retryWithBackoff(() =>
        this.client.post('/payments', paymentData)
      );

      const payment: AsaasPayment = response.data;

      Logger.info('AsaasService', 'Cobrança PIX criada com sucesso', {
        paymentId: payment.id,
        orderId,
      });

      // Registrar transação
      await this.logTransaction(
        'create_payment',
        paymentData,
        payment,
        true,
        undefined,
        {
          orderId,
          asaasPaymentId: payment.id,
          asaasCustomerId: customerId,
          httpStatus: 201,
        }
      );

      // Registrar splits (auditoria)
      if (splits.length > 0) {
        await supabase.from('asaas_splits').insert({
          order_id: orderId,
          split_config: splits,
          total_amount_cents: Math.round(amount * 100),
          status: 'pending',
        });
      }

      // Extrair dados do PIX
      const pixQrCode = payment.pixTransaction?.qrCode;
      if (!pixQrCode) {
        return {
          success: false,
          error: 'QR Code PIX não gerado',
          code: 'PIX_QR_CODE_ERROR',
        };
      }

      return {
        success: true,
        data: {
          payment_id: '', // Será preenchido pelo controller
          asaas_payment_id: payment.id,
          qr_code: pixQrCode.encodedImage,
          copy_paste: pixQrCode.payload,
          expires_at: pixQrCode.expirationDate,
          amount,
        },
      };
    } catch (error) {
      const axiosError = error as AxiosError;
      const errorMessage = axiosError.response?.data
        ? JSON.stringify(axiosError.response.data)
        : axiosError.message;

      Logger.error('AsaasService', 'Erro ao criar cobrança PIX', error as Error);

      await this.logTransaction(
        'create_payment',
        { orderId, customerId, amount },
        axiosError.response?.data,
        false,
        errorMessage,
        { orderId, httpStatus: axiosError.response?.status }
      );

      return {
        success: false,
        error: 'Erro ao criar cobrança PIX',
        code: 'ASAAS_PIX_PAYMENT_ERROR',
      };
    }
  }

  /**
   * Cria cobrança com cartão de crédito
   */
  async createCreditCardPayment(
    orderId: string,
    customerId: string,
    amount: number,
    description: string,
    cardData: {
      holderName: string;
      number: string;
      expiryMonth: string;
      expiryYear: string;
      ccv: string;
    },
    cardHolderInfo: {
      name: string;
      email: string;
      cpfCnpj: string;
      postalCode: string;
      addressNumber: string;
      addressComplement?: string;
      phone: string;
      mobilePhone?: string;
    },
    remoteIp: string, // ⚠️ OBRIGATÓRIO
    installments: number = 1,
    affiliates?: {
      n1?: { id: string; walletId: string };
      n2?: { id: string; walletId: string };
      n3?: { id: string; walletId: string };
    }
  ): Promise<ServiceResponse<CreditCardPaymentResponse>> {
    try {
      Logger.info('AsaasService', 'Criando cobrança com cartão', {
        orderId,
        customerId,
        amount,
        installments,
        hasAffiliates: !!affiliates?.n1,
      });

      // Calcular splits
      const splits = this.calculateSplits(amount, affiliates);

      // Data de vencimento (hoje)
      const dueDate = new Date().toISOString().split('T')[0];

      const paymentData: CreateAsaasPaymentRequest = {
        customer: customerId,
        billingType: 'CREDIT_CARD' as AsaasBillingType,
        value: amount,
        dueDate,
        description,
        externalReference: orderId,
        installmentCount: installments,
        installmentValue: installments > 1 ? amount / installments : undefined,
        totalValue: amount,
        splits, // ⚠️ Configurar NA CRIAÇÃO
        creditCard: cardData,
        creditCardHolderInfo: cardHolderInfo,
        remoteIp, // ⚠️ OBRIGATÓRIO
      };

      const response = await this.retryWithBackoff(() =>
        this.client.post('/payments', paymentData)
      );

      const payment: AsaasPayment = response.data;

      Logger.info('AsaasService', 'Cobrança com cartão criada com sucesso', {
        paymentId: payment.id,
        orderId,
        status: payment.status,
      });

      // Registrar transação
      await this.logTransaction(
        'create_payment',
        { ...paymentData, creditCard: { number: '****', ccv: '***' } },
        payment,
        true,
        undefined,
        {
          orderId,
          asaasPaymentId: payment.id,
          asaasCustomerId: customerId,
          httpStatus: 201,
        }
      );

      // Registrar splits (auditoria)
      if (splits.length > 0) {
        await supabase.from('asaas_splits').insert({
          order_id: orderId,
          split_config: splits,
          total_amount_cents: Math.round(amount * 100),
          status: payment.status === 'CONFIRMED' ? 'awaiting_credit' : 'pending',
        });
      }

      // Mapear status do Asaas para nosso sistema
      const statusMap: Record<string, any> = {
        PENDING: 'pending',
        CONFIRMED: 'confirmed',
        RECEIVED: 'received',
        AUTHORIZED: 'authorized',
      };

      return {
        success: true,
        data: {
          payment_id: '', // Será preenchido pelo controller
          asaas_payment_id: payment.id,
          status: statusMap[payment.status] || 'pending',
          card_brand: payment.creditCard?.creditCardBrand,
          card_last_digits: payment.creditCard?.creditCardNumber?.slice(-4),
          installments,
          credit_card_token: payment.creditCard?.creditCardToken,
          amount,
        },
      };
    } catch (error) {
      const axiosError = error as AxiosError;
      const errorMessage = axiosError.response?.data
        ? JSON.stringify(axiosError.response.data)
        : axiosError.message;

      Logger.error('AsaasService', 'Erro ao criar cobrança com cartão', error as Error);

      await this.logTransaction(
        'create_payment',
        { orderId, customerId, amount, installments },
        axiosError.response?.data,
        false,
        errorMessage,
        { orderId, httpStatus: axiosError.response?.status }
      );

      return {
        success: false,
        error: 'Erro ao processar pagamento com cartão',
        code: 'ASAAS_CARD_PAYMENT_ERROR',
      };
    }
  }

  /**
   * Consulta status de pagamento
   */
  async getPaymentStatus(
    asaasPaymentId: string
  ): Promise<ServiceResponse<AsaasPayment>> {
    try {
      const response = await this.retryWithBackoff(() =>
        this.client.get(`/payments/${asaasPaymentId}`)
      );

      const payment: AsaasPayment = response.data;

      await this.logTransaction(
        'get_payment',
        { asaasPaymentId },
        payment,
        true,
        undefined,
        { asaasPaymentId, httpStatus: 200 }
      );

      return { success: true, data: payment };
    } catch (error) {
      const axiosError = error as AxiosError;
      const errorMessage = axiosError.response?.data
        ? JSON.stringify(axiosError.response.data)
        : axiosError.message;

      Logger.error('AsaasService', 'Erro ao consultar pagamento', error as Error);

      await this.logTransaction(
        'get_payment',
        { asaasPaymentId },
        axiosError.response?.data,
        false,
        errorMessage,
        { asaasPaymentId, httpStatus: axiosError.response?.status }
      );

      return {
        success: false,
        error: 'Erro ao consultar status do pagamento',
        code: 'ASAAS_GET_PAYMENT_ERROR',
      };
    }
  }

  /**
   * Valida token do webhook
   */
  validateWebhookToken(token: string): boolean {
    const isValid = token === this.webhookToken;
    
    Logger.info('AsaasService', 'Validação de webhook token', {
      valid: isValid,
      receivedToken: token?.slice(0, 10) + '...',
    });

    return isValid;
  }

  /**
   * Valida Wallet ID
   */
  async validateWalletId(walletId: string): Promise<ServiceResponse<boolean>> {
    try {
      const response = await this.retryWithBackoff(() =>
        this.client.get(`/wallets/${walletId}`)
      );

      Logger.info('AsaasService', 'Wallet ID válida', { walletId });
      return { success: true, data: true };
    } catch (error) {
      Logger.error('AsaasService', 'Wallet ID inválida', error as Error, { walletId });
      return {
        success: false,
        error: 'Wallet ID inválida',
        code: 'INVALID_WALLET_ID',
      };
    }
  }
}

export const asaasService = new AsaasService();
