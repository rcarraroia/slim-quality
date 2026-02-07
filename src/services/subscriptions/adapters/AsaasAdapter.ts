/**
 * AsaasAdapter - Converte dados para formato Asaas e integra com Edge Functions
 * Baseado no padrão Comademig com adapter pattern + Edge Functions modulares
 * 
 * Funcionalidade:
 * - Conversão de dados de cliente para formato Asaas
 * - Conversão de dados de pagamento para formato Asaas
 * - Integração com Edge Functions para isolamento total
 * - Validação e sanitização de dados
 * - Tratamento de campos obrigatórios
 */

import { SubscriptionOrderData } from '@/types/subscription.types';

export class AsaasAdapter {
  private readonly edgeFunctionsUrl = 'https://vtynmmtuvxreiwcxxlma.supabase.co/functions/v1';
  private readonly supabaseAnonKey: string;

  constructor() {
    // Priorizar SUPABASE_ANON_KEY para ambiente Node.js (testes)
    this.supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
    if (!this.supabaseAnonKey) {
      throw new Error('SUPABASE_ANON_KEY is required for Edge Functions');
    }
  }

  private getHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.supabaseAnonKey}`,
      'User-Agent': 'SlimQuality-Subscription/1.0'
    };
  }

  /**
   * Cria pagamento via Edge Function create-payment
   */
  async createPayment(params: {
    customerId: string;
    value: number;
    dueDate: string;
    billingType: string;
    creditCard: any;
    creditCardHolderInfo: any;
    description: string;
    externalReference: string;
    remoteIp?: string;
  }): Promise<any> {
    try {
      console.log(`[AsaasAdapter] Creating payment via Edge Function for correlation_id: ${params.externalReference}`);

      // Mapear para formato da Edge Function
      const edgeRequest = {
        customer: {
          name: params.creditCardHolderInfo.name,
          email: params.creditCardHolderInfo.email,
          cpfCnpj: this.sanitizeCpf(params.creditCardHolderInfo.cpfCnpj),
          phone: this.sanitizePhone(params.creditCardHolderInfo.phone)
        },
        billingType: params.billingType,
        value: params.value,
        description: params.description,
        dueDate: params.dueDate,
        creditCard: {
          holderName: params.creditCard.holderName,
          number: params.creditCard.number,
          expiryMonth: params.creditCard.expiryMonth,
          expiryYear: params.creditCard.expiryYear,
          ccv: params.creditCard.ccv
        },
        creditCardHolderInfo: {
          name: params.creditCardHolderInfo.name,
          email: params.creditCardHolderInfo.email,
          cpfCnpj: this.sanitizeCpf(params.creditCardHolderInfo.cpfCnpj),
          postalCode: params.creditCardHolderInfo.postalCode,
          addressNumber: params.creditCardHolderInfo.addressNumber,
          phone: this.sanitizePhone(params.creditCardHolderInfo.phone)
        },
        correlationId: params.externalReference
      };

      const response = await fetch(`${this.edgeFunctionsUrl}/create-payment`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(edgeRequest)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[AsaasAdapter] Edge Function payment creation failed: ${response.status} - ${errorText}`);
        throw new Error(`Edge Function error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(`Payment creation failed: ${result.error}`);
      }

      console.log(`[AsaasAdapter] Payment created successfully via Edge Function: ${result.payment.id}`);

      return {
        id: result.payment.id,
        status: result.payment.status,
        value: result.payment.value,
        billingType: result.payment.billingType,
        dueDate: result.payment.dueDate,
        paymentLink: result.payment.paymentLink,
        invoiceUrl: result.payment.invoiceUrl,
        pixTransaction: result.payment.pixTransaction,
        externalReference: result.payment.correlationId
      };
    } catch (error) {
      console.error('[AsaasAdapter] Error creating payment via Edge Function:', error);
      throw error;
    }
  }

  /**
   * Verifica status do pagamento via Edge Function poll-payment-status
   */
  async pollPaymentStatus(paymentId: string, correlationId: string, timeoutSeconds = 15): Promise<{ confirmed: boolean; payment?: any; timeout?: boolean }> {
    try {
      console.log(`[AsaasAdapter] Polling payment status via Edge Function: ${paymentId}`);

      const edgeRequest = {
        paymentId,
        correlationId,
        timeoutSeconds,
        intervalSeconds: 1
      };

      const response = await fetch(`${this.edgeFunctionsUrl}/poll-payment-status`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(edgeRequest)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[AsaasAdapter] Edge Function polling failed: ${response.status} - ${errorText}`);
        throw new Error(`Edge Function error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(`Payment polling failed: ${result.error}`);
      }

      console.log(`[AsaasAdapter] Polling completed - Confirmed: ${result.confirmed}, Timeout: ${result.timeout}`);

      return {
        confirmed: result.confirmed,
        payment: result.payment,
        timeout: result.timeout
      };
    } catch (error) {
      console.error('[AsaasAdapter] Error polling payment status via Edge Function:', error);
      throw error;
    }
  }

  /**
   * Cria assinatura via Edge Function create-subscription
   */
  async createSubscription(params: {
    customerId: string;
    value: number;
    cycle: string;
    description: string;
    creditCardToken: string;
    nextDueDate: string;
    orderItems: Array<{ productId: string; quantity: number; unitPrice: number; totalPrice: number }>;
    correlationId: string;
  }): Promise<any> {
    try {
      console.log(`[AsaasAdapter] Creating subscription via Edge Function for customer: ${params.customerId}`);

      const edgeRequest = {
        paymentId: params.creditCardToken, // ID do pagamento CONFIRMADO
        customerId: params.customerId,
        planId: params.orderItems?.[0]?.productId || 'default-plan', // Pegar do order items se possível
        correlationId: params.correlationId,
        orderItems: params.orderItems,
        nextDueDate: params.nextDueDate
      };

      const response = await fetch(`${this.edgeFunctionsUrl}/create-subscription`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(edgeRequest)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[AsaasAdapter] Edge Function subscription creation failed: ${response.status} - ${errorText}`);
        throw new Error(`Edge Function error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(`Subscription creation failed: ${result.error}`);
      }

      console.log(`[AsaasAdapter] Subscription created successfully via Edge Function: ${result.subscription.id}`);

      return {
        id: result.subscription.asaasSubscriptionId,
        status: result.subscription.status,
        customerId: result.subscription.customerId,
        planId: result.subscription.planId,
        value: result.subscription.value,
        billingCycle: result.subscription.billingCycle,
        nextDueDate: result.subscription.nextDueDate,
        paymentLink: result.subscription.paymentLink,
        externalReference: result.subscription.correlationId
      };
    } catch (error) {
      console.error('[AsaasAdapter] Error creating subscription via Edge Function:', error);
      throw error;
    }
  }

  /**
   * Converte dados do cliente para formato Asaas
   */
  convertToAsaasCustomer(customerData: SubscriptionOrderData['customer']): any {
    return {
      name: customerData.name,
      email: customerData.email,
      phone: this.sanitizePhone(customerData.phone),
      cpfCnpj: this.sanitizeCpf(customerData.cpf),
      postalCode: customerData.address?.postalCode,
      address: customerData.address?.street,
      addressNumber: customerData.address?.number,
      complement: customerData.address?.complement,
      province: customerData.address?.neighborhood,
      city: customerData.address?.city,
      state: customerData.address?.state,
      country: 'Brasil',
      externalReference: `subscription-${Date.now()}`
    };
  }

  /**
   * Converte dados de pagamento para formato Asaas
   * CRÍTICO: Para primeira mensalidade via /v3/payments
   */
  convertToAsaasPayment(params: {
    customerId: string;
    value: number;
    dueDate: string;
    billingType: string;
    creditCard: any;
    creditCardHolderInfo: any;
    description: string;
    externalReference: string;
    remoteIp?: string;
  }): any {
    const { customerId, value, dueDate, billingType, creditCard, creditCardHolderInfo, description, externalReference } = params;

    return {
      customer: customerId,
      billingType,
      value,
      dueDate,
      description,
      externalReference,
      // Dados do cartão para primeira mensalidade
      creditCard: {
        holderName: creditCard.holderName,
        number: creditCard.number,
        expiryMonth: creditCard.expiryMonth,
        expiryYear: creditCard.expiryYear,
        ccv: creditCard.ccv
      },
      creditCardHolderInfo: {
        name: creditCardHolderInfo.name,
        email: creditCardHolderInfo.email,
        cpfCnpj: this.sanitizeCpf(creditCardHolderInfo.cpfCnpj),
        postalCode: creditCardHolderInfo.postalCode,
        addressNumber: creditCardHolderInfo.addressNumber,
        addressComplement: creditCardHolderInfo.addressComplement,
        phone: this.sanitizePhone(creditCardHolderInfo.phone)
      },
      // Configurações importantes
      remoteIp: params.remoteIp || '127.0.0.1',
      // Não cobrar taxa de antecipação na primeira mensalidade
      discount: {
        value: 0,
        dueDateLimitDays: 0
      }
    };
  }

  /**
   * Converte dados de assinatura para formato Asaas
   * Para assinatura recorrente via /v3/subscriptions
   */
  convertToAsaasSubscription(params: {
    customerId: string;
    value: number;
    cycle: string;
    description: string;
    creditCardToken: string;
    nextDueDate: string;
  }): any {
    const { customerId, value, cycle, description, creditCardToken, nextDueDate } = params;

    return {
      customer: customerId,
      billingType: 'CREDIT_CARD',
      value,
      nextDueDate,
      cycle, // 'MONTHLY'
      description,
      creditCardToken, // Token do cartão da primeira mensalidade
      // Configurações da assinatura
      maxPayments: null, // Indefinido
      endDate: null, // Sem data de fim
      // Não enviar dados do cartão novamente, usar apenas token
      externalReference: `subscription-recurring-${Date.now()}`
    };
  }

  /**
   * Sanitiza número de telefone
   */
  private sanitizePhone(phone?: string): string {
    if (!phone) return '';

    // Remove tudo que não é número
    const cleaned = phone.replace(/\D/g, '');

    // Adiciona código do país se necessário
    if (cleaned.length === 10 || cleaned.length === 11) {
      return `+55${cleaned}`;
    }

    return cleaned;
  }

  /**
   * Sanitiza CPF
   */
  private sanitizeCpf(cpf?: string): string {
    if (!cpf) return '';

    // Remove tudo que não é número
    return cpf.replace(/\D/g, '');
  }

  /**
   * Valida dados obrigatórios do cliente
   */
  validateCustomerData(customerData: SubscriptionOrderData['customer']): string[] {
    const errors: string[] = [];

    if (!customerData.name?.trim()) {
      errors.push('Nome do cliente é obrigatório');
    }

    if (!customerData.email?.trim()) {
      errors.push('Email do cliente é obrigatório');
    }

    if (!this.isValidEmail(customerData.email)) {
      errors.push('Email do cliente inválido');
    }

    if (!customerData.phone?.trim()) {
      errors.push('Telefone do cliente é obrigatório');
    }

    if (!customerData.cpf?.trim()) {
      errors.push('CPF do cliente é obrigatório');
    }

    if (!this.isValidCpf(customerData.cpf)) {
      errors.push('CPF do cliente inválido');
    }

    return errors;
  }

  /**
   * Valida dados obrigatórios do cartão
   */
  validateCreditCardData(creditCard: any, holderInfo: any): string[] {
    const errors: string[] = [];

    if (!creditCard.holderName?.trim()) {
      errors.push('Nome do portador é obrigatório');
    }

    if (!creditCard.number?.trim()) {
      errors.push('Número do cartão é obrigatório');
    }

    if (!creditCard.expiryMonth) {
      errors.push('Mês de vencimento é obrigatório');
    }

    if (!creditCard.expiryYear) {
      errors.push('Ano de vencimento é obrigatório');
    }

    if (!creditCard.ccv?.trim()) {
      errors.push('CCV é obrigatório');
    }

    if (!holderInfo.name?.trim()) {
      errors.push('Nome do portador (holder info) é obrigatório');
    }

    if (!holderInfo.cpfCnpj?.trim()) {
      errors.push('CPF do portador é obrigatório');
    }

    return errors;
  }

  /**
   * Valida email
   */
  private isValidEmail(email?: string): boolean {
    if (!email) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Valida CPF (algoritmo básico)
   */
  private isValidCpf(cpf?: string): boolean {
    if (!cpf) return false;

    const cleaned = cpf.replace(/\D/g, '');

    // Verifica se tem 11 dígitos
    if (cleaned.length !== 11) return false;

    // Verifica se não são todos iguais
    if (/^(\d)\1{10}$/.test(cleaned)) return false;

    // Validação básica dos dígitos verificadores
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cleaned.charAt(i)) * (10 - i);
    }
    let remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cleaned.charAt(9))) return false;

    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cleaned.charAt(i)) * (11 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cleaned.charAt(10))) return false;

    return true;
  }
}