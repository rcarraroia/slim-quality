/**
 * PaymentFirstFlowService - Orquestrador do fluxo Payment First
 * Baseado na arquitetura Comademig comprovadamente funcional
 * 
 * Sequência CORRETA:
 * 1. Criar cliente Asaas
 * 2. Processar primeira mensalidade via /v3/payments
 * 3. Aguardar confirmação via polling (15s timeout)
 * 4. Se confirmado: criar assinatura recorrente via /v3/subscriptions
 */

import { SubscriptionOrderData, PaymentFirstResult, AsaasCustomerData, AsaasPaymentData } from '@/types/subscription.types';
import { subscriptionConfig } from '@/config/subscription.config';
import { PollingService } from './PollingService';
import { AsaasAdapter } from './adapters/AsaasAdapter';
import { supabase } from '@/config/supabase';

export class PaymentFirstFlowService {
  private pollingService: PollingService;
  private asaasAdapter: AsaasAdapter;

  constructor() {
    this.pollingService = new PollingService();
    this.asaasAdapter = new AsaasAdapter();
  }

  /**
   * Processa o fluxo completo Payment First
   * Sequência baseada no Comademig que comprovadamente funciona
   * ATUALIZADO: Usa Edge Functions para isolamento total
   */
  async processRegistration(orderData: SubscriptionOrderData): Promise<PaymentFirstResult> {
    const correlationId = crypto.randomUUID();
    
    try {
      console.log(`[PaymentFirst] Iniciando fluxo para ${orderData.customer.email}`, { correlationId });
      
      // 1. Processar primeira mensalidade via Edge Function create-payment
      const firstPayment = await this.asaasAdapter.createPayment({
        customerId: orderData.customer.id || 'temp-customer',
        value: orderData.monthlyValue,
        dueDate: new Date().toISOString().split('T')[0], // HOJE
        billingType: 'CREDIT_CARD',
        creditCard: orderData.payment.creditCard,
        creditCardHolderInfo: orderData.payment.creditCardHolderInfo,
        description: `${orderData.product.name} - Primeira mensalidade`,
        externalReference: correlationId,
        remoteIp: orderData.metadata?.remoteIp
      });
      
      console.log(`[PaymentFirst] Primeira mensalidade criada via Edge Function: ${firstPayment.id}`);
      
      // 2. Aguardar confirmação via Edge Function poll-payment-status
      const pollingResult = await this.asaasAdapter.pollPaymentStatus(
        firstPayment.id,
        correlationId,
        15 // 15 segundos timeout
      );
      
      if (!pollingResult.confirmed) {
        console.log(`[PaymentFirst] Polling falhou ou timeout`);
        return {
          success: false,
          error: pollingResult.timeout ? 'Timeout na confirmação do pagamento' : 'Pagamento não confirmado',
          asaasCustomerId: orderData.customer.id || 'temp-customer',
          asaasPaymentId: firstPayment.id
        };
      }
      
      console.log(`[PaymentFirst] Pagamento confirmado via Edge Function`);
      
      // 3. Criar assinatura recorrente via Edge Function create-subscription
      const subscription = await this.asaasAdapter.createSubscription({
        customerId: orderData.customer.id || 'temp-customer',
        value: orderData.monthlyValue,
        cycle: 'MONTHLY',
        description: `${orderData.product.name} - Assinatura mensal`,
        creditCardToken: firstPayment.id, // Usar payment ID como token
        nextDueDate: this.calculateNextBillingDate(),
        orderItems: orderData.orderItems?.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice
        })) || [],
        correlationId
      });
      
      console.log(`[PaymentFirst] Assinatura recorrente criada via Edge Function: ${subscription.id}`);
      
      // 4. Salvar no banco de dados
      await this.saveSubscriptionOrder({
        orderData,
        asaasCustomerId: orderData.customer.id || 'temp-customer',
        asaasPaymentId: firstPayment.id,
        asaasSubscriptionId: subscription.id,
        status: 'active'
      });
      
      return {
        success: true,
        asaasCustomerId: orderData.customer.id || 'temp-customer',
        asaasPaymentId: firstPayment.id,
        asaasSubscriptionId: subscription.id,
        nextDueDate: subscription.nextDueDate
      };
      
    } catch (error: any) {
      console.error('[PaymentFirst] Erro no fluxo:', error);
      
      return {
        success: false,
        error: error.message || 'Erro interno no processamento',
        correlationId
      };
    }
  }

  /**
   * Cria cliente no Asaas
   * Baseado no padrão Comademig
   */
  private async createAsaasCustomer(customerData: SubscriptionOrderData['customer']): Promise<AsaasCustomerData> {
    const payload = this.asaasAdapter.convertToAsaasCustomer(customerData);
    
    const response = await fetch(`${subscriptionConfig.asaas.baseUrl}/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': subscriptionConfig.asaas.apiKey
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Erro ao criar cliente Asaas: ${error.errors?.[0]?.description || response.statusText}`);
    }
    
    return await response.json();
  }

  /**
   * Processa primeira mensalidade via /v3/payments
   * CRÍTICO: NÃO usar /v3/subscriptions para primeira mensalidade
   */
  private async processFirstPayment(params: {
    customerId: string;
    orderData: SubscriptionOrderData;
    correlationId: string;
  }): Promise<AsaasPaymentData> {
    const { customerId, orderData, correlationId } = params;
    
    const payload = this.asaasAdapter.convertToAsaasPayment({
      customerId,
      value: orderData.monthlyValue,
      dueDate: new Date().toISOString().split('T')[0], // HOJE
      billingType: 'CREDIT_CARD',
      creditCard: orderData.payment.creditCard,
      creditCardHolderInfo: orderData.payment.creditCardHolderInfo,
      description: `${orderData.product.name} - Primeira mensalidade`,
      externalReference: correlationId,
      remoteIp: orderData.metadata?.remoteIp
    });
    
    const response = await fetch(`${subscriptionConfig.asaas.baseUrl}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': subscriptionConfig.asaas.apiKey
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Erro ao processar primeira mensalidade: ${error.errors?.[0]?.description || response.statusText}`);
    }
    
    return await response.json();
  }

  /**
   * Cria assinatura recorrente via /v3/subscriptions
   * SÓ DEPOIS da primeira mensalidade ser confirmada
   */
  private async createRecurringSubscription(params: {
    customerId: string;
    creditCardToken: string;
    orderData: SubscriptionOrderData;
    nextDueDate: string;
  }): Promise<any> {
    const { customerId, creditCardToken, orderData, nextDueDate } = params;
    
    const payload = {
      customer: customerId,
      billingType: 'CREDIT_CARD',
      value: orderData.monthlyValue,
      nextDueDate,
      cycle: 'MONTHLY',
      description: `${orderData.product.name} - Assinatura mensal`,
      creditCardToken, // Token do cartão da primeira mensalidade
      // NÃO enviar dados do cartão novamente, usar token
    };
    
    const response = await fetch(`${subscriptionConfig.asaas.baseUrl}/subscriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': subscriptionConfig.asaas.apiKey
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Erro ao criar assinatura recorrente: ${error.errors?.[0]?.description || response.statusText}`);
    }
    
    return await response.json();
  }

  /**
   * Calcula próxima data de cobrança (próximo mês)
   */
  private calculateNextBillingDate(): string {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    return nextMonth.toISOString().split('T')[0];
  }

  /**
   * Salva pedido de assinatura no banco
   */
  private async saveSubscriptionOrder(params: {
    orderData: SubscriptionOrderData;
    asaasCustomerId: string;
    asaasPaymentId: string;
    asaasSubscriptionId: string;
    status: string;
  }): Promise<void> {
    const { orderData, asaasCustomerId, asaasPaymentId, asaasSubscriptionId, status } = params;
    
    const orderNumber = `SUB-${Date.now()}`;
    
    const { error } = await supabase
      .from('subscription_orders')
      .insert({
        order_number: orderNumber,
        customer_name: orderData.customer.name,
        customer_email: orderData.customer.email,
        customer_phone: orderData.customer.phone,
        customer_cpf: orderData.customer.cpf,
        product_name: orderData.product.name,
        product_id: orderData.product.id,
        monthly_value_cents: Math.round(orderData.monthlyValue * 100),
        status,
        asaas_customer_id: asaasCustomerId,
        asaas_payment_id: asaasPaymentId,
        asaas_subscription_id: asaasSubscriptionId,
        billing_type: 'CREDIT_CARD',
        next_due_date: this.calculateNextBillingDate(),
        remote_ip: orderData.metadata?.remoteIp,
        referral_code: orderData.metadata?.referralCode,
        affiliate_n1_id: orderData.metadata?.affiliateId,
        order_items: orderData.orderItems || [] // OBRIGATÓRIO para detecção IA
      });
    
    if (error) {
      throw new Error(`Erro ao salvar pedido: ${error.message}`);
    }
  }
}