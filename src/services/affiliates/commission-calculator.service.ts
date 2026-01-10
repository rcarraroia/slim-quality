/**
 * Serviço de Cálculo de Comissões Multinível
 * Task 4.1: Implementar calculateCommissions() com redistribuição
 * 
 * Regras de Negócio:
 * - Vendedor (N1): 15%
 * - Ascendente N2: 3%
 * - Ascendente N3: 2%
 * - Gestores (Renum + JB): 5% cada (base)
 * - Total SEMPRE = 30%
 * - Redistribuição: percentuais não utilizados vão para gestores
 */

import { supabase } from '@/config/supabase';
import { COMMISSION_RATES, validateCommissionTotal } from '@/constants/storage-keys';

export interface CommissionCalculationInput {
  orderId: string;
  orderValue: number; // em centavos
  affiliateN1Id: string; // Vendedor direto
}

export interface CommissionResult {
  orderId: string;
  orderValue: number;
  
  // Comissões calculadas (em centavos)
  n1: {
    affiliateId: string;
    percentage: number;
    value: number;
  };
  
  n2: {
    affiliateId: string | null;
    percentage: number;
    value: number;
  };
  
  n3: {
    affiliateId: string | null;
    percentage: number;
    value: number;
  };
  
  renum: {
    percentage: number;
    value: number;
  };
  
  jb: {
    percentage: number;
    value: number;
  };
  
  // Metadados
  totalCommission: number;
  redistributionApplied: boolean;
  redistributionDetails?: {
    unusedPercentage: number;
    redistributedToRenum: number;
    redistributedToJB: number;
  };
}

export class CommissionCalculatorService {
  /**
   * Calcula comissões multinível para uma venda
   * 
   * @param input - Dados da venda e afiliado
   * @returns Comissões calculadas para cada nível
   * @throws {Error} Se order não for encontrado
   * @throws {Error} Se soma de comissões != 30%
   */
  async calculateCommissions(input: CommissionCalculationInput): Promise<CommissionResult> {
    try {
      // 1. Buscar afiliado N1 (vendedor)
      const { data: n1Affiliate, error: n1Error } = await supabase
        .from('affiliates')
        .select('id, referred_by, name')
        .eq('id', input.affiliateN1Id)
        .is('deleted_at', null)
        .single();

      if (n1Error || !n1Affiliate) {
        throw new Error(`Afiliado N1 não encontrado: ${input.affiliateN1Id}`);
      }

      // 2. Buscar ascendentes (N2 e N3) usando referred_by
      let n2Affiliate = null;
      let n3Affiliate = null;

      if (n1Affiliate.referred_by) {
        const { data: n2Data } = await supabase
          .from('affiliates')
          .select('id, referred_by, name')
          .eq('id', n1Affiliate.referred_by)
          .is('deleted_at', null)
          .single();

        n2Affiliate = n2Data;

        // Se N2 existe, buscar N3
        if (n2Affiliate?.referred_by) {
          const { data: n3Data } = await supabase
            .from('affiliates')
            .select('id, referred_by, name')
            .eq('id', n2Affiliate.referred_by)
            .is('deleted_at', null)
            .single();

          n3Affiliate = n3Data;
        }
      }

      // 3. Calcular valores base
      const n1Value = Math.round(input.orderValue * COMMISSION_RATES.SELLER);
      const n2Value = n2Affiliate ? Math.round(input.orderValue * COMMISSION_RATES.N1) : 0;
      const n3Value = n3Affiliate ? Math.round(input.orderValue * COMMISSION_RATES.N2) : 0;

      // 4. Calcular redistribuição para gestores
      let renumPercentage = COMMISSION_RATES.RENUM;
      let jbPercentage = COMMISSION_RATES.JB;
      let redistributionApplied = false;
      let redistributionDetails = undefined;

      // Calcular percentual não utilizado
      const usedPercentage = COMMISSION_RATES.SELLER +
        (n2Affiliate ? COMMISSION_RATES.N1 : 0) +
        (n3Affiliate ? COMMISSION_RATES.N2 : 0);
      
      const unusedPercentage = COMMISSION_RATES.SELLER + COMMISSION_RATES.N1 + COMMISSION_RATES.N2 - usedPercentage;

      if (unusedPercentage > 0) {
        // Redistribuir igualmente entre gestores
        const redistributionPerGestor = unusedPercentage / 2;
        renumPercentage += redistributionPerGestor;
        jbPercentage += redistributionPerGestor;
        redistributionApplied = true;
        
        redistributionDetails = {
          unusedPercentage,
          redistributedToRenum: redistributionPerGestor,
          redistributedToJB: redistributionPerGestor
        };
      }

      const renumValue = Math.round(input.orderValue * renumPercentage);
      const jbValue = Math.round(input.orderValue * jbPercentage);

      // 5. Validar que soma = 30%
      const totalPercentage = COMMISSION_RATES.SELLER +
        (n2Affiliate ? COMMISSION_RATES.N1 : 0) +
        (n3Affiliate ? COMMISSION_RATES.N2 : 0) +
        renumPercentage +
        jbPercentage;

      if (!validateCommissionTotal(
        COMMISSION_RATES.SELLER,
        n2Affiliate ? COMMISSION_RATES.N1 : 0,
        n3Affiliate ? COMMISSION_RATES.N2 : 0,
        renumPercentage,
        jbPercentage
      )) {
        throw new Error(
          `Soma de comissões inválida: ${totalPercentage.toFixed(4)} (esperado: 0.30)`
        );
      }

      // 6. Montar resultado
      const result: CommissionResult = {
        orderId: input.orderId,
        orderValue: input.orderValue,
        
        n1: {
          affiliateId: n1Affiliate.id,
          percentage: COMMISSION_RATES.SELLER,
          value: n1Value
        },
        
        n2: {
          affiliateId: n2Affiliate?.id || null,
          percentage: n2Affiliate ? COMMISSION_RATES.N1 : 0,
          value: n2Value
        },
        
        n3: {
          affiliateId: n3Affiliate?.id || null,
          percentage: n3Affiliate ? COMMISSION_RATES.N2 : 0,
          value: n3Value
        },
        
        renum: {
          percentage: renumPercentage,
          value: renumValue
        },
        
        jb: {
          percentage: jbPercentage,
          value: jbValue
        },
        
        totalCommission: n1Value + n2Value + n3Value + renumValue + jbValue,
        redistributionApplied,
        redistributionDetails
      };

      // 7. Validar total de comissão = 30% do pedido
      const expectedTotal = Math.round(input.orderValue * COMMISSION_RATES.TOTAL);
      const diff = Math.abs(result.totalCommission - expectedTotal);
      
      if (diff > 1) { // Tolerância de 1 centavo para arredondamento
        throw new Error(
          `Total de comissões inválido: R$ ${(result.totalCommission / 100).toFixed(2)} ` +
          `(esperado: R$ ${(expectedTotal / 100).toFixed(2)})`
        );
      }

      return result;

    } catch (error) {
      console.error('Erro ao calcular comissões:', error);
      throw error;
    }
  }

  /**
   * Salva comissões calculadas no banco de dados
   * 
   * @param result - Resultado do cálculo de comissões
   * @returns IDs das comissões criadas
   */
  async saveCommissions(result: CommissionResult): Promise<string[]> {
    try {
      const commissions = [];

      // Comissão N1 (sempre existe)
      commissions.push({
        order_id: result.orderId,
        affiliate_id: result.n1.affiliateId,
        level: 1,
        percentage: result.n1.percentage,
        base_value_cents: result.orderValue,
        commission_value_cents: result.n1.value,
        original_percentage: COMMISSION_RATES.SELLER,
        redistribution_applied: false,
        status: 'pending',
        calculation_details: {
          orderValue: result.orderValue,
          calculatedAt: new Date().toISOString()
        }
      });

      // Comissão N2 (se existir)
      if (result.n2.affiliateId) {
        commissions.push({
          order_id: result.orderId,
          affiliate_id: result.n2.affiliateId,
          level: 2,
          percentage: result.n2.percentage,
          base_value_cents: result.orderValue,
          commission_value_cents: result.n2.value,
          original_percentage: COMMISSION_RATES.N1,
          redistribution_applied: false,
          status: 'pending',
          calculation_details: {
            orderValue: result.orderValue,
            calculatedAt: new Date().toISOString()
          }
        });
      }

      // Comissão N3 (se existir)
      if (result.n3.affiliateId) {
        commissions.push({
          order_id: result.orderId,
          affiliate_id: result.n3.affiliateId,
          level: 3,
          percentage: result.n3.percentage,
          base_value_cents: result.orderValue,
          commission_value_cents: result.n3.value,
          original_percentage: COMMISSION_RATES.N2,
          redistribution_applied: false,
          status: 'pending',
          calculation_details: {
            orderValue: result.orderValue,
            calculatedAt: new Date().toISOString()
          }
        });
      }

      // Inserir comissões no banco
      const { data, error } = await supabase
        .from('commissions')
        .insert(commissions)
        .select('id');

      if (error) {
        throw new Error(`Erro ao salvar comissões: ${error.message}`);
      }

      // Salvar split consolidado
      await this.saveCommissionSplit(result);

      return data?.map(c => c.id) || [];

    } catch (error) {
      console.error('Erro ao salvar comissões:', error);
      throw error;
    }
  }

  /**
   * Salva split consolidado na tabela commission_splits
   */
  private async saveCommissionSplit(result: CommissionResult): Promise<void> {
    const split = {
      order_id: result.orderId,
      total_order_value_cents: result.orderValue,
      factory_percentage: 0.70,
      factory_value_cents: Math.round(result.orderValue * 0.70),
      commission_percentage: COMMISSION_RATES.TOTAL,
      commission_value_cents: result.totalCommission,
      
      n1_affiliate_id: result.n1.affiliateId,
      n1_percentage: result.n1.percentage,
      n1_value_cents: result.n1.value,
      
      n2_affiliate_id: result.n2.affiliateId,
      n2_percentage: result.n2.percentage,
      n2_value_cents: result.n2.value,
      
      n3_affiliate_id: result.n3.affiliateId,
      n3_percentage: result.n3.percentage,
      n3_value_cents: result.n3.value,
      
      renum_percentage: result.renum.percentage,
      renum_value_cents: result.renum.value,
      
      jb_percentage: result.jb.percentage,
      jb_value_cents: result.jb.value,
      
      redistribution_applied: result.redistributionApplied,
      redistribution_details: result.redistributionDetails || null,
      
      status: 'pending'
    };

    const { error } = await supabase
      .from('commission_splits')
      .insert(split);

    if (error) {
      throw new Error(`Erro ao salvar split: ${error.message}`);
    }
  }
}

// Instância singleton
export const commissionCalculator = new CommissionCalculatorService();
