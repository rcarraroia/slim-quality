/**
 * Serviço para processar pedidos e associar com afiliados
 * Integra o sistema de vendas com o sistema de afiliados
 */

import { supabase } from '../../config/supabase';
import { ReferralTracker } from '../../middleware/referral-tracker';
import { CommissionCalculatorService } from '../affiliates/commission-calculator.service';
import { AffiliateService } from '../affiliates/affiliate.service';

export interface OrderAffiliateData {
  orderId: string;
  customerId: string;
  totalAmount: number;
  referralCode?: string;
}

export interface ProcessingResult {
  success: boolean;
  orderId: string;
  affiliateId?: string;
  affiliateName?: string;
  commissionsCalculated: boolean;
  totalCommission?: number;
  error?: string;
}

export class OrderAffiliateProcessor {
  private static commissionCalculator = new CommissionCalculatorService();
  private static affiliateService = new AffiliateService();

  /**
   * Processa um pedido e associa com afiliado se houver referência
   * Deve ser chamado após confirmação do pagamento
   */
  static async processOrder(orderData: OrderAffiliateData): Promise<ProcessingResult> {
    try {
      console.log(`[OrderAffiliateProcessor] Processando pedido: ${orderData.orderId}`);

      // 1. Verificar se já foi processado
      const existingProcessing = await this.checkExistingProcessing(orderData.orderId);
      if (existingProcessing) {
        return {
          success: true,
          orderId: orderData.orderId,
          commissionsCalculated: true,
          error: 'Pedido já processado anteriormente'
        };
      }

      // 2. Determinar código de referência
      let referralCode = orderData.referralCode;
      
      // Se não foi fornecido, tentar recuperar do rastreamento
      if (!referralCode && typeof window !== 'undefined') {
        referralCode = ReferralTracker.getReferralCode();
      }

      if (!referralCode) {
        console.log(`[OrderAffiliateProcessor] Nenhum código de referência encontrado para pedido ${orderData.orderId}`);
        return {
          success: true,
          orderId: orderData.orderId,
          commissionsCalculated: false,
          error: 'Nenhum afiliado associado'
        };
      }

      // 3. Buscar afiliado pelo código
      const affiliate = await this.affiliateService.getAffiliateByReferralCode(referralCode);
      if (!affiliate) {
        console.warn(`[OrderAffiliateProcessor] Código de referência inválido: ${referralCode}`);
        return {
          success: false,
          orderId: orderData.orderId,
          commissionsCalculated: false,
          error: 'Código de referência inválido'
        };
      }

      // 4. Associar pedido ao afiliado
      await this.associateOrderWithAffiliate(orderData.orderId, affiliate.id);

      // 5. Registrar conversão
      await this.registerConversion(orderData, affiliate);

      // 6. Calcular e criar comissões
      const commissionResult = await this.calculateAndCreateCommissions(orderData, affiliate);

      // 7. Limpar código de referência (conversão concluída)
      if (typeof window !== 'undefined') {
        ReferralTracker.clearReferralCode();
      }

      console.log(`[OrderAffiliateProcessor] Pedido processado com sucesso: ${orderData.orderId}`);

      return {
        success: true,
        orderId: orderData.orderId,
        affiliateId: affiliate.id,
        affiliateName: affiliate.name,
        commissionsCalculated: true,
        totalCommission: commissionResult.totalCommission
      };

    } catch (error) {
      console.error(`[OrderAffiliateProcessor] Erro ao processar pedido ${orderData.orderId}:`, error);
      return {
        success: false,
        orderId: orderData.orderId,
        commissionsCalculated: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  /**
   * Verifica se o pedido já foi processado
   */
  private static async checkExistingProcessing(orderId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('commissions')
      .select('id')
      .eq('order_id', orderId)
      .limit(1);

    if (error) {
      console.error('Erro ao verificar processamento existente:', error);
      return false;
    }

    return data && data.length > 0;
  }

  /**
   * Associa o pedido ao afiliado no banco de dados
   */
  private static async associateOrderWithAffiliate(orderId: string, affiliateId: string): Promise<void> {
    const { error } = await supabase
      .from('orders')
      .update({ 
        affiliate_id: affiliateId,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (error) {
      throw new Error(`Erro ao associar pedido ao afiliado: ${error.message}`);
    }
  }

  /**
   * Registra a conversão na tabela de referral_conversions
   */
  private static async registerConversion(orderData: OrderAffiliateData, affiliate: any): Promise<void> {
    const { error } = await supabase
      .from('referral_conversions')
      .insert({
        affiliate_id: affiliate.id,
        order_id: orderData.orderId,
        referral_code: affiliate.referral_code,
        conversion_value: orderData.totalAmount,
        converted_at: new Date().toISOString()
      });

    if (error) {
      console.error('Erro ao registrar conversão:', error);
      // Não falhar o processo por isso
    }
  }

  /**
   * Calcula e cria as comissões para o pedido
   */
  private static async calculateAndCreateCommissions(
    orderData: OrderAffiliateData, 
    affiliate: any
  ): Promise<{ totalCommission: number }> {
    
    // Calcular comissões usando o CommissionCalculatorService
    const result = await this.commissionCalculator.calculateCommissions({
      orderId: orderData.orderId,
      totalAmount: orderData.totalAmount,
      affiliateId: affiliate.id
    });
    
    if (!result.success) {
      throw new Error(`Erro ao calcular comissões: ${result.error}`);
    }

    return {
      totalCommission: result.data?.totalCommission || 0
    };
  }

  /**
   * Processa pedido via webhook (chamada externa)
   * Para ser usado pelo webhook do Asaas
   */
  static async processOrderFromWebhook(webhookData: {
    orderId: string;
    status: string;
    totalAmount: number;
  }): Promise<ProcessingResult> {
    
    // Verificar se o pagamento foi confirmado
    if (webhookData.status !== 'RECEIVED' && webhookData.status !== 'CONFIRMED') {
      return {
        success: false,
        orderId: webhookData.orderId,
        commissionsCalculated: false,
        error: 'Pagamento não confirmado'
      };
    }

    // Buscar dados do pedido no banco
    const { data: order, error } = await supabase
      .from('orders')
      .select('id, customer_id, total_amount, affiliate_id')
      .eq('id', webhookData.orderId)
      .single();

    if (error || !order) {
      return {
        success: false,
        orderId: webhookData.orderId,
        commissionsCalculated: false,
        error: 'Pedido não encontrado'
      };
    }

    // Se já tem afiliado associado, não processar novamente
    if (order.affiliate_id) {
      return {
        success: true,
        orderId: webhookData.orderId,
        commissionsCalculated: true,
        error: 'Pedido já possui afiliado associado'
      };
    }

    // Processar o pedido
    return await this.processOrder({
      orderId: order.id,
      customerId: order.customer_id,
      totalAmount: order.total_amount
    });
  }

  /**
   * Obtém estatísticas de processamento
   */
  static async getProcessingStats(): Promise<{
    totalOrdersProcessed: number;
    totalCommissionsPaid: number;
    totalAffiliateOrders: number;
    conversionRate: number;
  }> {
    try {
      // Total de pedidos com afiliados
      const { count: affiliateOrders } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .not('affiliate_id', 'is', null);

      // Total de comissões pagas
      const { data: commissions } = await supabase
        .from('commissions')
        .select('amount')
        .eq('status', 'paid');

      const totalCommissionsPaid = commissions?.reduce((sum, c) => sum + c.amount, 0) || 0;

      // Total de cliques
      const { count: totalClicks } = await supabase
        .from('referral_clicks')
        .select('*', { count: 'exact', head: true });

      // Taxa de conversão
      const conversionRate = totalClicks > 0 ? (affiliateOrders / totalClicks) * 100 : 0;

      return {
        totalOrdersProcessed: affiliateOrders || 0,
        totalCommissionsPaid,
        totalAffiliateOrders: affiliateOrders || 0,
        conversionRate: Math.round(conversionRate * 100) / 100
      };

    } catch (error) {
      console.error('Erro ao obter estatísticas:', error);
      return {
        totalOrdersProcessed: 0,
        totalCommissionsPaid: 0,
        totalAffiliateOrders: 0,
        conversionRate: 0
      };
    }
  }
}

export default OrderAffiliateProcessor;