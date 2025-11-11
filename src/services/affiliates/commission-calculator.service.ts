/**
 * Commission Calculator Service - REFATORADO
 * Sprint 4: Sistema de Afiliados Multinível
 * 
 * ORQUESTRADOR DO SISTEMA DE COMISSÕES
 * - Orquestra cálculo via função SQL (fonte única da verdade)
 * - Validações de entrada e saída
 * - Logs completos para auditoria
 * - Interface TypeScript para o sistema
 * 
 * NOTA: Lógica de cálculo movida para calculate_commission_split() no banco
 * para garantir atomicidade, integridade e performance.
 */

import { supabase } from '@/config/supabase';
import { Logger } from '@/utils/logger';
import type {
  CommissionCalculationInput,
  CommissionCalculationResult,
  ServiceResponse,
} from '@/types/affiliate.types';

export class CommissionCalculatorService {
  /**
   * Calcula comissões para um pedido
   * ORQUESTRADOR - Delega cálculo para função SQL
   */
  async calculateCommissions(input: CommissionCalculationInput): Promise<ServiceResponse<CommissionCalculationResult>> {
    try {
      Logger.info('CommissionCalculator', 'Starting commission calculation orchestration', {
        orderId: input.orderId,
        orderValueCents: input.orderValueCents,
        hasAffiliate: !!input.affiliateId,
      });

      // 1. Validar entrada
      const validationResult = await this.validateInput(input);
      if (!validationResult.success) {
        return validationResult;
      }

      // 2. Executar cálculo via função SQL (fonte única da verdade)
      const { data: splitId, error } = await supabase
        .rpc('calculate_commission_split', { p_order_id: input.orderId })
        .single();

      if (error) {
        Logger.error('CommissionCalculator', 'Error in SQL calculation', error, {
          orderId: input.orderId,
        });
        return {
          success: false,
          error: 'Erro ao calcular comissões no banco',
          code: 'SQL_CALCULATION_ERROR',
        };
      }

      // 3. Buscar resultado calculado
      const resultResponse = await this.getCalculationResult(input.orderId);
      if (!resultResponse.success) {
        return resultResponse;
      }

      // 4. Log de auditoria
      await this.logCalculationOrchestration(input.orderId, splitId);

      Logger.info('CommissionCalculator', 'Commission calculation orchestration completed', {
        orderId: input.orderId,
        splitId,
        result: resultResponse.data,
      });

      return resultResponse;

    } catch (error) {
      Logger.error('CommissionCalculator', 'Error in calculation orchestration', error as Error, {
        orderId: input.orderId,
      });

      return {
        success: false,
        error: 'Erro interno no cálculo de comissões',
        code: 'ORCHESTRATION_ERROR',
      };
    }
  }

  /**
   * Valida entrada do cálculo
   */
  private async validateInput(input: CommissionCalculationInput): Promise<ServiceResponse<boolean>> {
    try {
      // Validar se pedido existe
      const { data: order, error } = await supabase
        .from('orders')
        .select('id, total_cents, status')
        .eq('id', input.orderId)
        .is('deleted_at', null)
        .single();

      if (error || !order) {
        return {
          success: false,
          error: 'Pedido não encontrado',
          code: 'ORDER_NOT_FOUND',
        };
      }

      // Validar valor do pedido
      if (order.total_cents !== input.orderValueCents) {
        return {
          success: false,
          error: 'Valor do pedido não confere',
          code: 'ORDER_VALUE_MISMATCH',
        };
      }

      // Validar se já existe split
      const { data: existingSplit } = await supabase
        .from('commission_splits')
        .select('id')
        .eq('order_id', input.orderId)
        .single();

      if (existingSplit) {
        return {
          success: false,
          error: 'Comissões já calculadas para este pedido',
          code: 'SPLIT_ALREADY_EXISTS',
        };
      }

      return { success: true, data: true };

    } catch (error) {
      Logger.error('CommissionCalculator', 'Error validating input', error as Error);
      return {
        success: false,
        error: 'Erro ao validar entrada',
        code: 'VALIDATION_ERROR',
      };
    }
  }

  /**
   * Busca resultado do cálculo já executado no banco
   */
  private async getCalculationResult(orderId: string): Promise<ServiceResponse<CommissionCalculationResult>> {
    try {
      const { data: split, error } = await supabase
        .from('commission_splits')
        .select(`
          *,
          n1_affiliate:n1_affiliate_id(id, wallet_id),
          n2_affiliate:n2_affiliate_id(id, wallet_id),
          n3_affiliate:n3_affiliate_id(id, wallet_id)
        `)
        .eq('order_id', orderId)
        .single();

      if (error || !split) {
        Logger.error('CommissionCalculator', 'Split not found after calculation', error);
        return {
          success: false,
          error: 'Resultado do cálculo não encontrado',
          code: 'CALCULATION_RESULT_NOT_FOUND',
        };
      }

      // Converter resultado do banco para formato TypeScript
      const result: CommissionCalculationResult = {
        orderId: split.order_id,
        totalValueCents: split.total_order_value_cents,
        factory: {
          percentage: split.factory_percentage,
          valueCents: split.factory_value_cents,
        },
        renum: {
          percentage: split.renum_percentage,
          valueCents: split.renum_value_cents,
        },
        jb: {
          percentage: split.jb_percentage,
          valueCents: split.jb_value_cents,
        },
        redistributionApplied: split.redistribution_applied,
        redistributionDetails: split.redistribution_details,
        totalPercentage: 100.00, // Sempre 100% por design
      };

      // Adicionar afiliados se existirem
      if (split.n1_affiliate_id && split.n1_value_cents) {
        result.n1 = {
          affiliateId: split.n1_affiliate_id,
          percentage: split.n1_percentage,
          valueCents: split.n1_value_cents,
        };
      }

      if (split.n2_affiliate_id && split.n2_value_cents) {
        result.n2 = {
          affiliateId: split.n2_affiliate_id,
          percentage: split.n2_percentage,
          valueCents: split.n2_value_cents,
        };
      }

      if (split.n3_affiliate_id && split.n3_value_cents) {
        result.n3 = {
          affiliateId: split.n3_affiliate_id,
          percentage: split.n3_percentage,
          valueCents: split.n3_value_cents,
        };
      }

      return { success: true, data: result };

    } catch (error) {
      Logger.error('CommissionCalculator', 'Error getting calculation result', error as Error);
      return {
        success: false,
        error: 'Erro ao buscar resultado do cálculo',
        code: 'GET_RESULT_ERROR',
      };
    }
  }

  /**
   * Registra log de auditoria da orquestração
   */
  private async logCalculationOrchestration(orderId: string, splitId: string): Promise<void> {
    try {
      const operationDetails = {
        calculation_method: 'sql_function_orchestration',
        sql_function: 'calculate_commission_split',
        split_id: splitId,
        orchestrator: 'CommissionCalculatorService',
      };

      await supabase.rpc('log_commission_operation', {
        p_order_id: orderId,
        p_operation_type: 'commission_orchestrated',
        p_operation_details: operationDetails,
        p_after_state: { splitId },
        p_total_value_cents: null,
        p_commission_value_cents: null,
        p_n1_affiliate_id: null,
        p_n2_affiliate_id: null,
        p_n3_affiliate_id: null,
        p_success: true,
      });

    } catch (error) {
      Logger.error('CommissionCalculator', 'Error logging orchestration', error as Error);
      // Não falhar por erro de log
    }
  }

  /**
   * Salva resultado do cálculo no banco
   * DEPRECATED: Agora o cálculo é feito diretamente no banco
   */
  async saveCalculationResult(result: CommissionCalculationResult): Promise<ServiceResponse<string>> {
    Logger.warn('CommissionCalculator', 'saveCalculationResult is deprecated - calculation now done in SQL');
    
    // Buscar split já criado
    const { data: split } = await supabase
      .from('commission_splits')
      .select('id')
      .eq('order_id', result.orderId)
      .single();

    if (split) {
      return { success: true, data: split.id };
    }

    return {
      success: false,
      error: 'Split não encontrado - use calculateCommissions() em vez de saveCalculationResult()',
      code: 'DEPRECATED_METHOD',
    };
  }
}

export const commissionCalculatorService = new CommissionCalculatorService();