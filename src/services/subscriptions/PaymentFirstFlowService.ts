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

      // 1. Criar pagamento inicial via Edge Function (Primeira Mensalidade)
      // O create-payment já deve cuidar da criação/vínculo do cliente no Asaas internamente ou via adapter
      const firstPayment = await this.asaasAdapter.createPayment({
        customerId: orderData.customer.id || 'new-customer',
        value: orderData.monthlyValue,
        dueDate: new Date().toISOString().split('T')[0],
        billingType: 'CREDIT_CARD',
        creditCard: orderData.payment.creditCard,
        creditCardHolderInfo: orderData.payment.creditCardHolderInfo,
        description: `${orderData.product.name} - Primeira mensalidade`,
        externalReference: correlationId,
        remoteIp: orderData.metadata?.remoteIp
      });

      console.log(`[PaymentFirst] Pagamento criado: ${firstPayment.id}`);

      // 2. Aguardar confirmação via Polling Modular (15s timeout, 1s interval)
      const pollingResult = await this.asaasAdapter.pollPaymentStatus(
        firstPayment.id,
        correlationId,
        15
      );

      if (!pollingResult.confirmed) {
        console.warn(`[PaymentFirst] Pagamento não confirmado no prazo: ${firstPayment.id}`, { pollingResult });
        return {
          success: false,
          error: pollingResult.timeout ? 'Tempo esgotado aguardando confirmação do pagamento' : 'Pagamento não autorizado ou pendente',
          asaasCustomerId: firstPayment.customerId || 'pending',
          asaasPaymentId: firstPayment.id
        };
      }

      console.log(`[PaymentFirst] Pagamento confirmado! Criando assinatura recorrente...`);

      // 3. Criar assinatura recorrente via Edge Function (Usa o token do cartão do primeiro pagamento)
      const subscription = await this.asaasAdapter.createSubscription({
        customerId: pollingResult.payment.customer || firstPayment.customerId,
        value: orderData.monthlyValue,
        cycle: 'MONTHLY',
        description: `${orderData.product.name} - Assinatura Mensal`,
        creditCardToken: firstPayment.id, // O backend usa o ID do pagamento para recuperar o token
        nextDueDate: this.calculateNextBillingDate(),
        orderItems: orderData.orderItems || [],
        correlationId
      });

      console.log(`[PaymentFirst] Assinatura criada com sucesso: ${subscription.id}`);

      // 4. Persistir o pedido finalizado com todos os IDs
      await this.saveSubscriptionOrder({
        orderData,
        asaasCustomerId: subscription.customerId,
        asaasPaymentId: firstPayment.id,
        asaasSubscriptionId: subscription.id,
        status: 'active'
      });

      return {
        success: true,
        asaasCustomerId: subscription.customerId,
        asaasPaymentId: firstPayment.id,
        asaasSubscriptionId: subscription.id,
        nextDueDate: subscription.nextDueDate
      };

    } catch (error: any) {
      console.error('[PaymentFirst] Falha crítica no fluxo orquestrado:', error);
      return {
        success: false,
        error: error.message || 'Erro interno no processamento do fluxo',
        correlationId
      };
    }
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