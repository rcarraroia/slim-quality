/**
 * Calculadora de Comissões Multinível
 * Task 4: Correção Sistema Pagamentos
 * 
 * IMPORTANTE: O split é apenas 30% do valor total.
 * Os 70% da fábrica são retidos automaticamente via API Key do Asaas.
 */

import { supabase } from '@/config/supabase';

export interface CommissionInput {
  orderId: string;
  totalAmount: number;
  affiliateId?: string;
}

export interface CommissionOutput {
  success: boolean;
  data?: {
    orderId: string;
    totalValue: number;
    splitPercentage: number;
    totalCommission: number;
    breakdown: {
      n1?: { affiliateId: string; percentage: number; value: number };
      n2?: { affiliateId: string; percentage: number; value: number };
      n3?: { affiliateId: string; percentage: number; value: number };
      renum: { percentage: number; value: number };
      jb: { percentage: number; value: number };
    };
    redistributionApplied: boolean;
  };
  error?: string;
}

export interface AffiliateNetwork {
  n1?: { id: string; walletId: string };
  n2?: { id: string; walletId: string };
  n3?: { id: string; walletId: string };
}

export class CommissionCalculatorService {
  // Percentuais do sistema (apenas split de 30%)
  private readonly SPLIT_PERCENTAGE = 30;
  private readonly N1_PERCENTAGE = 15;
  private readonly N2_PERCENTAGE = 3;
  private readonly N3_PERCENTAGE = 2;
  private readonly RENUM_BASE_PERCENTAGE = 5;
  private readonly JB_BASE_PERCENTAGE = 5;

  /**
   * Calcula comissões para um pedido
   * Retorna apenas o split de 30% (fábrica recebe 70% automaticamente)
   */
  async calculateCommissions(input: CommissionInput): Promise<CommissionOutput> {
    try {
      const { orderId, totalAmount } = input;
      
      console.log(`[CommissionCalculator] Calculando comissões para pedido: ${orderId}`);

      // 1. Buscar rede genealógica
      const network = await this.getNetworkForOrder(orderId);

      // 2. Calcular valor total do split (30%)
      const totalCommission = totalAmount * (this.SPLIT_PERCENTAGE / 100);

      // 3. Calcular redistribuição baseada na rede
      const redistribution = this.calculateRedistribution(network);

      // 4. Calcular valores por nível
      const n1Value = network.n1 ? totalAmount * (this.N1_PERCENTAGE / 100) : 0;
      const n2Value = network.n2 ? totalAmount * (this.N2_PERCENTAGE / 100) : 0;
      const n3Value = network.n3 ? totalAmount * (this.N3_PERCENTAGE / 100) : 0;
      
      const renumPercentage = this.RENUM_BASE_PERCENTAGE + redistribution.renumBonus;
      const jbPercentage = this.JB_BASE_PERCENTAGE + redistribution.jbBonus;
      
      const renumValue = totalAmount * (renumPercentage / 100);
      const jbValue = totalAmount * (jbPercentage / 100);

      // 5. Validar integridade (soma deve ser 30%)
      const calculatedTotal = n1Value + n2Value + n3Value + renumValue + jbValue;
      const calculatedPercentage = (calculatedTotal / totalAmount) * 100;

      if (Math.abs(calculatedPercentage - this.SPLIT_PERCENTAGE) > 0.01) {
        throw new Error(`Erro de integridade: soma = ${calculatedPercentage.toFixed(2)}%, esperado ${this.SPLIT_PERCENTAGE}%`);
      }

      // 6. Construir resultado
      const breakdown: CommissionOutput['data']['breakdown'] = {
        renum: { percentage: renumPercentage, value: renumValue },
        jb: { percentage: jbPercentage, value: jbValue }
      };

      if (network.n1) {
        breakdown.n1 = { affiliateId: network.n1.id, percentage: this.N1_PERCENTAGE, value: n1Value };
      }
      if (network.n2) {
        breakdown.n2 = { affiliateId: network.n2.id, percentage: this.N2_PERCENTAGE, value: n2Value };
      }
      if (network.n3) {
        breakdown.n3 = { affiliateId: network.n3.id, percentage: this.N3_PERCENTAGE, value: n3Value };
      }

      const result: CommissionOutput = {
        success: true,
        data: {
          orderId,
          totalValue: totalAmount,
          splitPercentage: this.SPLIT_PERCENTAGE,
          totalCommission,
          breakdown,
          redistributionApplied: redistribution.renumBonus > 0 || redistribution.jbBonus > 0
        }
      };

      // 7. Salvar no banco para auditoria
      await this.saveCommissionCalculation(result.data!);

      console.log(`[CommissionCalculator] ✅ Comissões calculadas: R$ ${totalCommission.toFixed(2)} (${this.SPLIT_PERCENTAGE}%)`);

      return result;

    } catch (error) {
      console.error('[CommissionCalculator] ❌ Erro:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  /**
   * Busca rede genealógica para um pedido
   */
  async getNetworkForOrder(orderId: string): Promise<AffiliateNetwork> {
    try {
      // 1. Buscar pedido com referral_code
      const { data: order } = await supabase
        .from('orders')
        .select('referral_code, affiliate_n1_id')
        .eq('id', orderId)
        .single();

      if (!order?.referral_code && !order?.affiliate_n1_id) {
        return {}; // Sem afiliado
      }

      // 2. Buscar N1 pelo referral_code ou affiliate_n1_id
      let n1Query = supabase
        .from('affiliates')
        .select('id, wallet_id, referred_by')
        .eq('status', 'active');

      if (order.referral_code) {
        n1Query = n1Query.eq('referral_code', order.referral_code);
      } else if (order.affiliate_n1_id) {
        n1Query = n1Query.eq('id', order.affiliate_n1_id);
      }

      const { data: n1Data } = await n1Query.single();

      if (!n1Data) {
        return {}; // N1 não encontrado ou inativo
      }

      const network: AffiliateNetwork = {
        n1: { id: n1Data.id, walletId: n1Data.wallet_id }
      };

      // 3. Buscar N2 (quem indicou o N1)
      if (n1Data.referred_by) {
        const { data: n2Data } = await supabase
          .from('affiliates')
          .select('id, wallet_id, referred_by')
          .eq('id', n1Data.referred_by)
          .eq('status', 'active')
          .single();

        if (n2Data?.wallet_id) {
          network.n2 = { id: n2Data.id, walletId: n2Data.wallet_id };

          // 4. Buscar N3 (quem indicou o N2)
          if (n2Data.referred_by) {
            const { data: n3Data } = await supabase
              .from('affiliates')
              .select('id, wallet_id')
              .eq('id', n2Data.referred_by)
              .eq('status', 'active')
              .single();

            if (n3Data?.wallet_id) {
              network.n3 = { id: n3Data.id, walletId: n3Data.wallet_id };
            }
          }
        }
      }

      console.log(`[CommissionCalculator] Rede encontrada: N1=${!!network.n1}, N2=${!!network.n2}, N3=${!!network.n3}`);
      return network;

    } catch (error) {
      console.error('[CommissionCalculator] Erro ao buscar rede:', error);
      return {};
    }
  }

  /**
   * Calcula redistribuição para gestores quando rede incompleta
   * 
   * Regras:
   * - Sem afiliado: 15% + 15% para gestores
   * - Apenas N1: 7.5% + 7.5% para gestores (5% base + 2.5% bônus)
   * - N1+N2: 6% + 6% para gestores (5% base + 1% bônus)
   * - Rede completa: 5% + 5% para gestores (sem bônus)
   */
  private calculateRedistribution(network: AffiliateNetwork): { renumBonus: number; jbBonus: number } {
    let availablePercentage = 0;

    if (!network.n1) {
      // Sem rede: 15% + 3% + 2% = 20% disponível (mas N1 base é 15%, então 10% extra)
      availablePercentage = this.N1_PERCENTAGE + this.N2_PERCENTAGE + this.N3_PERCENTAGE - this.RENUM_BASE_PERCENTAGE - this.JB_BASE_PERCENTAGE;
      // Na verdade, sem afiliado, gestores recebem 15% cada = 30% total
      // Então bônus = 15% - 5% = 10% cada
      return { renumBonus: 10, jbBonus: 10 };
    } else if (!network.n2) {
      // Apenas N1: 3% + 2% = 5% disponível
      availablePercentage = this.N2_PERCENTAGE + this.N3_PERCENTAGE;
    } else if (!network.n3) {
      // N1 + N2: 2% disponível
      availablePercentage = this.N3_PERCENTAGE;
    } else {
      // Rede completa: sem redistribuição
      availablePercentage = 0;
    }

    // Dividir igualmente entre Renum e JB
    const bonusPerGestor = availablePercentage / 2;

    return {
      renumBonus: bonusPerGestor,
      jbBonus: bonusPerGestor
    };
  }

  /**
   * Salva cálculo de comissão para auditoria
   */
  private async saveCommissionCalculation(data: NonNullable<CommissionOutput['data']>): Promise<void> {
    try {
      // 1. Salvar comissões individuais
      const commissions = [];

      if (data.breakdown.n1) {
        commissions.push({
          order_id: data.orderId,
          affiliate_id: data.breakdown.n1.affiliateId,
          level: 1,
          percentage: data.breakdown.n1.percentage,
          base_value: data.totalValue,
          commission_value: data.breakdown.n1.value,
          status: 'pending'
        });
      }

      if (data.breakdown.n2) {
        commissions.push({
          order_id: data.orderId,
          affiliate_id: data.breakdown.n2.affiliateId,
          level: 2,
          percentage: data.breakdown.n2.percentage,
          base_value: data.totalValue,
          commission_value: data.breakdown.n2.value,
          status: 'pending'
        });
      }

      if (data.breakdown.n3) {
        commissions.push({
          order_id: data.orderId,
          affiliate_id: data.breakdown.n3.affiliateId,
          level: 3,
          percentage: data.breakdown.n3.percentage,
          base_value: data.totalValue,
          commission_value: data.breakdown.n3.value,
          status: 'pending'
        });
      }

      if (commissions.length > 0) {
        await supabase.from('commissions').insert(commissions);
      }

      // 2. Salvar log de auditoria
      await supabase.from('commission_logs').insert({
        order_id: data.orderId,
        action: 'COMMISSION_CALCULATED',
        details: JSON.stringify({
          totalValue: data.totalValue,
          splitPercentage: data.splitPercentage,
          totalCommission: data.totalCommission,
          breakdown: data.breakdown,
          redistributionApplied: data.redistributionApplied,
          calculated_at: new Date().toISOString()
        })
      });

      console.log(`[CommissionCalculator] 📝 Auditoria salva para pedido: ${data.orderId}`);

    } catch (error) {
      console.error('[CommissionCalculator] Erro ao salvar auditoria:', error);
      // Não propagar erro para não quebrar o fluxo principal
    }
  }
}

// Instância singleton
export const commissionCalculator = new CommissionCalculatorService();
