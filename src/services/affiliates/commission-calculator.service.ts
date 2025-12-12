/**
 * Calculadora de Comissões Multinível
 * Task 5: Implementar CommissionCalculator (núcleo crítico)
 */

import { supabase } from '@/config/supabase';

export interface CommissionResult {
  orderId: string;
  totalValue: number;
  
  // Distribuição
  factory: { percentage: number; value: number };
  n1?: { affiliateId: string; percentage: number; value: number };
  n2?: { affiliateId: string; percentage: number; value: number };
  n3?: { affiliateId: string; percentage: number; value: number };
  renum: { percentage: number; value: number };
  jb: { percentage: number; value: number };
  
  // Controle
  redistributionApplied: boolean;
  totalPercentage: number; // Deve ser sempre 100%
}

export interface AffiliateNetwork {
  n1?: { id: string; walletId: string };
  n2?: { id: string; walletId: string };
  n3?: { id: string; walletId: string };
}

export interface RedistributionResult {
  renumBonus: number;
  jbBonus: number;
  details: {
    availablePercentage: number;
    distributionMethod: string;
  };
}

export class CommissionCalculatorService {
  // Percentuais fixos do sistema
  private readonly FACTORY_PERCENTAGE = 70;
  private readonly COMMISSION_PERCENTAGE = 30;
  private readonly N1_PERCENTAGE = 15;
  private readonly N2_PERCENTAGE = 3;
  private readonly N3_PERCENTAGE = 2;
  private readonly RENUM_BASE_PERCENTAGE = 5;
  private readonly JB_BASE_PERCENTAGE = 5;

  // Wallet IDs dos gestores (do .env)
  private readonly RENUM_WALLET_ID = process.env.ASAAS_WALLET_RENUM!;
  private readonly JB_WALLET_ID = process.env.ASAAS_WALLET_JB!;

  /**
   * Calcula comissões para um pedido
   * Task 5.1: Implementar calculateCommissions() principal
   */
  async calculateCommissions(orderId: string): Promise<CommissionResult> {
    try {
      // 1. Buscar dados do pedido
      const order = await this.getOrderData(orderId);
      if (!order) {
        throw new Error(`Pedido ${orderId} não encontrado`);
      }

      // 2. Buscar rede genealógica (se houver afiliado)
      const network = await this.getNetworkForOrder(orderId);

      // 3. Calcular valores base
      const totalValue = order.total_cents / 100;
      const factoryValue = totalValue * (this.FACTORY_PERCENTAGE / 100);
      const commissionValue = totalValue * (this.COMMISSION_PERCENTAGE / 100);

      // 4. Calcular comissões por nível
      const n1Value = network.n1 ? commissionValue * (this.N1_PERCENTAGE / 100) : 0;
      const n2Value = network.n2 ? commissionValue * (this.N2_PERCENTAGE / 100) : 0;
      const n3Value = network.n3 ? commissionValue * (this.N3_PERCENTAGE / 100) : 0;

      // 5. Calcular redistribuição
      const redistribution = this.calculateRedistribution(network);
      const renumValue = commissionValue * ((this.RENUM_BASE_PERCENTAGE + redistribution.renumBonus) / 100);
      const jbValue = commissionValue * ((this.JB_BASE_PERCENTAGE + redistribution.jbBonus) / 100);

      // 6. Validar integridade (soma deve ser 100%)
      const totalCalculated = factoryValue + n1Value + n2Value + n3Value + renumValue + jbValue;
      const percentageCheck = (totalCalculated / totalValue) * 100;

      if (Math.abs(percentageCheck - 100) > 0.01) {
        throw new Error(`Erro de integridade: soma = ${percentageCheck.toFixed(2)}%, esperado 100%`);
      }

      // 7. Construir resultado
      const result: CommissionResult = {
        orderId,
        totalValue,
        factory: {
          percentage: this.FACTORY_PERCENTAGE,
          value: factoryValue
        },
        renum: {
          percentage: this.RENUM_BASE_PERCENTAGE + redistribution.renumBonus,
          value: renumValue
        },
        jb: {
          percentage: this.JB_BASE_PERCENTAGE + redistribution.jbBonus,
          value: jbValue
        },
        redistributionApplied: redistribution.renumBonus > 0 || redistribution.jbBonus > 0,
        totalPercentage: 100
      };

      // Adicionar afiliados se existirem
      if (network.n1) {
        result.n1 = {
          affiliateId: network.n1.id,
          percentage: this.N1_PERCENTAGE,
          value: n1Value
        };
      }

      if (network.n2) {
        result.n2 = {
          affiliateId: network.n2.id,
          percentage: this.N2_PERCENTAGE,
          value: n2Value
        };
      }

      if (network.n3) {
        result.n3 = {
          affiliateId: network.n3.id,
          percentage: this.N3_PERCENTAGE,
          value: n3Value
        };
      }

      // 8. Salvar cálculo no banco para auditoria
      await this.saveCommissionCalculation(result);

      return result;

    } catch (error) {
      console.error('Erro ao calcular comissões:', error);
      throw error;
    }
  }

  /**
   * Busca rede genealógica para um pedido
   * Task 5.1: Implementar getNetworkForOrder() para buscar árvore
   */
  async getNetworkForOrder(orderId: string): Promise<AffiliateNetwork> {
    try {
      // 1. Buscar afiliado N1 do pedido
      const { data: order } = await supabase
        .from('orders')
        .select('affiliate_n1_id')
        .eq('id', orderId)
        .single();

      if (!order?.affiliate_n1_id) {
        return {}; // Sem afiliado
      }

      // 2. Buscar dados do N1
      const { data: n1Data } = await supabase
        .from('affiliates')
        .select('id, wallet_id')
        .eq('id', order.affiliate_n1_id)
        .eq('status', 'active')
        .eq('deleted_at', null)
        .single();

      if (!n1Data) {
        return {}; // N1 não ativo
      }

      const network: AffiliateNetwork = {
        n1: { id: n1Data.id, walletId: n1Data.wallet_id }
      };

      // 3. Buscar ancestrais (N2 e N3)
      const { data: ancestors } = await supabase
        .rpc('get_network_ancestors', { affiliate_uuid: order.affiliate_n1_id });

      if (ancestors && ancestors.length > 0) {
        // Ancestrais vêm ordenados por nível DESC (N3, N2, N1)
        // Queremos N2 (level 2) e N3 (level 3)
        
        const n2 = ancestors.find((a: any) => a.level === 2);
        const n3 = ancestors.find((a: any) => a.level === 3);

        if (n2) {
          network.n2 = { id: n2.affiliate_id, walletId: n2.wallet_id };
        }

        if (n3) {
          network.n3 = { id: n3.affiliate_id, walletId: n3.wallet_id };
        }
      }

      return network;

    } catch (error) {
      console.error('Erro ao buscar rede do pedido:', error);
      return {};
    }
  }

  /**
   * Calcula redistribuição para gestores
   * Task 5.2: Implementar regras de redistribuição
   */
  calculateRedistribution(network: AffiliateNetwork): RedistributionResult {
    let availablePercentage = 0;
    let distributionMethod = '';

    // Calcular percentual disponível para redistribuição
    if (!network.n1) {
      // Sem rede: 15% + 3% + 2% = 20% disponível
      availablePercentage = this.N1_PERCENTAGE + this.N2_PERCENTAGE + this.N3_PERCENTAGE;
      distributionMethod = 'no_network';
    } else if (!network.n2) {
      // Apenas N1: 3% + 2% = 5% disponível
      availablePercentage = this.N2_PERCENTAGE + this.N3_PERCENTAGE;
      distributionMethod = 'n1_only';
    } else if (!network.n3) {
      // N1 + N2: 2% disponível
      availablePercentage = this.N3_PERCENTAGE;
      distributionMethod = 'n1_n2_only';
    } else {
      // Rede completa: sem redistribuição
      availablePercentage = 0;
      distributionMethod = 'complete_network';
    }

    // Dividir igualmente entre Renum e JB
    const bonusPerGestor = availablePercentage / 2;

    return {
      renumBonus: bonusPerGestor,
      jbBonus: bonusPerGestor,
      details: {
        availablePercentage,
        distributionMethod
      }
    };
  }

  /**
   * Busca dados do pedido
   */
  private async getOrderData(orderId: string) {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('id, total_cents, status, affiliate_n1_id')
        .eq('id', orderId)
        .single();

      if (error) {
        throw new Error(`Erro ao buscar pedido: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Erro ao buscar dados do pedido:', error);
      return null;
    }
  }

  /**
   * Salva cálculo de comissão para auditoria
   * Task 5.4: Implementar logs de auditoria completos
   */
  private async saveCommissionCalculation(result: CommissionResult): Promise<void> {
    try {
      // 1. Salvar split principal
      const splitData = {
        order_id: result.orderId,
        total_order_value: result.totalValue,
        factory_percentage: result.factory.percentage,
        factory_value: result.factory.value,
        commission_percentage: this.COMMISSION_PERCENTAGE,
        commission_value: result.totalValue * (this.COMMISSION_PERCENTAGE / 100),
        
        n1_affiliate_id: result.n1?.affiliateId,
        n1_percentage: result.n1?.percentage,
        n1_value: result.n1?.value,
        
        n2_affiliate_id: result.n2?.affiliateId,
        n2_percentage: result.n2?.percentage,
        n2_value: result.n2?.value,
        
        n3_affiliate_id: result.n3?.affiliateId,
        n3_percentage: result.n3?.percentage,
        n3_value: result.n3?.value,
        
        renum_percentage: result.renum.percentage,
        renum_value: result.renum.value,
        jb_percentage: result.jb.percentage,
        jb_value: result.jb.value,
        
        redistribution_applied: result.redistributionApplied,
        redistribution_details: {
          redistributionApplied: result.redistributionApplied,
          totalPercentage: result.totalPercentage
        },
        
        status: 'calculated'
      };

      const { error: splitError } = await supabase
        .from('commission_splits')
        .insert(splitData);

      if (splitError) {
        console.error('Erro ao salvar split:', splitError);
      }

      // 2. Salvar comissões individuais
      const commissions = [];

      if (result.n1) {
        commissions.push({
          order_id: result.orderId,
          affiliate_id: result.n1.affiliateId,
          level: 1,
          percentage: result.n1.percentage,
          base_value: result.totalValue,
          commission_value: result.n1.value,
          status: 'calculated'
        });
      }

      if (result.n2) {
        commissions.push({
          order_id: result.orderId,
          affiliate_id: result.n2.affiliateId,
          level: 2,
          percentage: result.n2.percentage,
          base_value: result.totalValue,
          commission_value: result.n2.value,
          status: 'calculated'
        });
      }

      if (result.n3) {
        commissions.push({
          order_id: result.orderId,
          affiliate_id: result.n3.affiliateId,
          level: 3,
          percentage: result.n3.percentage,
          base_value: result.totalValue,
          commission_value: result.n3.value,
          status: 'calculated'
        });
      }

      if (commissions.length > 0) {
        const { error: commissionsError } = await supabase
          .from('commissions')
          .insert(commissions);

        if (commissionsError) {
          console.error('Erro ao salvar comissões:', commissionsError);
        }
      }

      // 3. Salvar log de auditoria
      const logData = {
        order_id: result.orderId,
        operation_type: 'commission_calculated',
        operation_details: {
          totalValue: result.totalValue,
          redistributionApplied: result.redistributionApplied,
          networkLevels: [
            result.n1 ? 'N1' : null,
            result.n2 ? 'N2' : null,
            result.n3 ? 'N3' : null
          ].filter(Boolean)
        },
        after_state: result
      };

      const { error: logError } = await supabase
        .from('commission_logs')
        .insert(logData);

      if (logError) {
        console.error('Erro ao salvar log:', logError);
      }

    } catch (error) {
      console.error('Erro ao salvar cálculo:', error);
      // Não propagar erro para não quebrar o fluxo principal
    }
  }

  /**
   * Valida integridade de um cálculo
   * Task 5.3: Implementar validações críticas de integridade
   */
  validateCalculation(result: CommissionResult): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 1. Verificar se soma é 100%
    const totalCalculated = 
      result.factory.value + 
      (result.n1?.value || 0) + 
      (result.n2?.value || 0) + 
      (result.n3?.value || 0) + 
      result.renum.value + 
      result.jb.value;

    const percentageCheck = (totalCalculated / result.totalValue) * 100;
    if (Math.abs(percentageCheck - 100) > 0.01) {
      errors.push(`Soma incorreta: ${percentageCheck.toFixed(2)}% (esperado 100%)`);
    }

    // 2. Verificar valores não-negativos
    if (result.factory.value < 0) errors.push('Valor da fábrica negativo');
    if (result.n1 && result.n1.value < 0) errors.push('Valor N1 negativo');
    if (result.n2 && result.n2.value < 0) errors.push('Valor N2 negativo');
    if (result.n3 && result.n3.value < 0) errors.push('Valor N3 negativo');
    if (result.renum.value < 0) errors.push('Valor Renum negativo');
    if (result.jb.value < 0) errors.push('Valor JB negativo');

    // 3. Verificar percentuais
    if (result.factory.percentage !== this.FACTORY_PERCENTAGE) {
      errors.push(`Percentual fábrica incorreto: ${result.factory.percentage}% (esperado ${this.FACTORY_PERCENTAGE}%)`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Instância singleton
export const commissionCalculator = new CommissionCalculatorService();