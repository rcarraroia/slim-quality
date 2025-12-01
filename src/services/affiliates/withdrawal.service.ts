/**
 * Withdrawal Service
 * Sprint 7: Correções Críticas
 *
 * Service para gestão de saques de afiliados
 * - Solicitação de saques
 * - Validação de saldo
 * - Processamento administrativo
 * - Integração com Asaas
 * - Logs de auditoria
 */

import { supabase } from '@/config/supabase';
import { Logger } from '@/utils/logger';
import type {
  ServiceResponse,
  PaginatedResponse,
} from '@/types/affiliate.types';

// Tipos locais para Withdrawal Service
export interface Withdrawal {
  id: string;
  affiliate_id: string;
  requested_amount_cents: number;
  fee_amount_cents: number;
  net_amount_cents: number;
  status: 'pending' | 'approved' | 'processing' | 'completed' | 'failed' | 'rejected' | 'cancelled';
  status_reason?: string;
  bank_code: string;
  bank_name: string;
  agency: string;
  account: string;
  account_type: 'checking' | 'savings';
  account_holder_name: string;
  account_holder_document: string;
  asaas_transfer_id?: string;
  asaas_transfer_response?: any;
  available_balance_before_cents: number;
  available_balance_after_cents: number;
  requested_at: string;
  processed_at?: string;
  completed_at?: string;
  requested_by: string;
  approved_by?: string;
  rejected_by?: string;
  created_at: string;
  updated_at: string;
}

export interface WithdrawalQueryParams {
  page?: number;
  limit?: number;
  status?: string;
  affiliateId?: string;
  startDate?: string;
  endDate?: string;
}

export interface CreateWithdrawalData {
  affiliate_id: string;
  requested_amount_cents: number;
  bank_code: string;
  bank_name: string;
  agency: string;
  account: string;
  account_type: 'checking' | 'savings';
  account_holder_name: string;
  account_holder_document: string;
}

export class WithdrawalService {
  /**
   * Solicitar saque (afiliado)
   */
  async requestWithdrawal(
    userId: string,
    data: CreateWithdrawalData
  ): Promise<ServiceResponse<Withdrawal>> {
    try {
      Logger.info('WithdrawalService', 'Requesting withdrawal', {
        userId,
        affiliateId: data.affiliate_id,
        amount: data.requested_amount_cents,
      });

      // Verificar se usuário é o afiliado
      const { data: affiliate, error: affiliateError } = await supabase
        .from('affiliates')
        .select('id, available_balance_cents')
        .eq('id', data.affiliate_id)
        .eq('user_id', userId)
        .single();

      if (affiliateError || !affiliate) {
        return {
          success: false,
          error: 'Afiliado não encontrado ou acesso negado',
          code: 'AFFILIATE_NOT_FOUND',
        };
      }

      // Validar saldo disponível
      const validation = await this.validateWithdrawalBalance(data.affiliate_id, data.requested_amount_cents);
      if (!validation.success) {
        return validation as ServiceResponse<Withdrawal>;
      }

      // Calcular valores
      const feeAmount = Math.max(100, Math.round(data.requested_amount_cents * 0.005)); // 0.5% ou mínimo R$ 1,00
      const netAmount = data.requested_amount_cents - feeAmount;

      // Criar solicitação de saque
      const { data: withdrawal, error } = await supabase
        .from('withdrawals')
        .insert({
          affiliate_id: data.affiliate_id,
          requested_amount_cents: data.requested_amount_cents,
          fee_amount_cents: feeAmount,
          net_amount_cents: netAmount,
          bank_code: data.bank_code,
          bank_name: data.bank_name,
          agency: data.agency,
          account: data.account,
          account_type: data.account_type,
          account_holder_name: data.account_holder_name,
          account_holder_document: data.account_holder_document,
          available_balance_before_cents: affiliate.available_balance_cents,
          available_balance_after_cents: affiliate.available_balance_cents - data.requested_amount_cents,
          requested_by: userId,
        })
        .select()
        .single();

      if (error) {
        Logger.error('WithdrawalService', 'Error creating withdrawal request', error);
        return {
          success: false,
          error: 'Erro ao criar solicitação de saque',
          code: 'CREATE_WITHDRAWAL_ERROR',
        };
      }

      // Log de auditoria (usando tabela withdrawal_logs diretamente)
      await supabase
        .from('withdrawal_logs')
        .insert({
          withdrawal_id: withdrawal.id,
          operation_type: 'withdrawal_requested',
          operation_details: {
            requested_amount_cents: data.requested_amount_cents,
            fee_amount_cents: feeAmount,
            net_amount_cents: netAmount,
          },
          after_state: withdrawal,
          user_id: userId,
          success: true,
        });

      return { success: true, data: withdrawal };

    } catch (error) {
      Logger.error('WithdrawalService', 'Error in requestWithdrawal', error as Error);
      return {
        success: false,
        error: 'Erro interno ao solicitar saque',
        code: 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Listar saques (admin)
   */
  async getAllWithdrawals(
    params: WithdrawalQueryParams = {}
  ): Promise<ServiceResponse<PaginatedResponse<Withdrawal>>> {
    try {
      const {
        page = 1,
        limit = 50,
        status,
        affiliateId,
        startDate,
        endDate,
      } = params;

      const offset = (page - 1) * limit;

      let query = supabase
        .from('withdrawals')
        .select(`
          *,
          affiliates!inner(
            id,
            name,
            email,
            referral_code
          )
        `, { count: 'exact' })
        .order('requested_at', { ascending: false });

      // Filtros
      if (status) {
        query = query.eq('status', status);
      }

      if (affiliateId) {
        query = query.eq('affiliate_id', affiliateId);
      }

      if (startDate) {
        query = query.gte('requested_at', startDate);
      }

      if (endDate) {
        query = query.lte('requested_at', endDate);
      }

      // Paginação
      query = query.range(offset, offset + limit - 1);

      const { data: withdrawals, error, count } = await query;

      if (error) {
        Logger.error('WithdrawalService', 'Error getting all withdrawals', error);
        return {
          success: false,
          error: 'Erro ao obter saques',
          code: 'GET_ALL_WITHDRAWALS_ERROR',
        };
      }

      const totalPages = Math.ceil((count || 0) / limit);

      return {
        success: true,
        data: {
          data: withdrawals || [],
          pagination: {
            page,
            limit,
            total: count || 0,
            totalPages,
            hasMore: page < totalPages,
          },
        },
      };

    } catch (error) {
      Logger.error('WithdrawalService', 'Error in getAllWithdrawals', error as Error);
      return {
        success: false,
        error: 'Erro interno ao obter saques',
        code: 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Obter saque por ID
   */
  async getById(id: string): Promise<ServiceResponse<Withdrawal>> {
    try {
      const { data: withdrawal, error } = await supabase
        .from('withdrawals')
        .select(`
          *,
          affiliates!inner(
            id,
            name,
            email,
            referral_code
          )
        `)
        .eq('id', id)
        .single();

      if (error || !withdrawal) {
        Logger.error('WithdrawalService', 'Withdrawal not found', error || new Error('Withdrawal not found'), { withdrawalId: id });
        return {
          success: false,
          error: 'Saque não encontrado',
          code: 'WITHDRAWAL_NOT_FOUND',
        };
      }

      return { success: true, data: withdrawal };

    } catch (error) {
      Logger.error('WithdrawalService', 'Error getting withdrawal by ID', error as Error);
      return {
        success: false,
        error: 'Erro interno ao obter saque',
        code: 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Listar saques do afiliado
   */
  async getByAffiliateId(
    affiliateId: string,
    params: WithdrawalQueryParams = {}
  ): Promise<ServiceResponse<PaginatedResponse<Withdrawal>>> {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        startDate,
        endDate,
      } = params;

      const offset = (page - 1) * limit;

      let query = supabase
        .from('withdrawals')
        .select('*', { count: 'exact' })
        .eq('affiliate_id', affiliateId)
        .order('requested_at', { ascending: false });

      // Filtros
      if (status) {
        query = query.eq('status', status);
      }

      if (startDate) {
        query = query.gte('requested_at', startDate);
      }

      if (endDate) {
        query = query.lte('requested_at', endDate);
      }

      // Paginação
      query = query.range(offset, offset + limit - 1);

      const { data: withdrawals, error, count } = await query;

      if (error) {
        Logger.error('WithdrawalService', 'Error getting affiliate withdrawals', error);
        return {
          success: false,
          error: 'Erro ao obter saques do afiliado',
          code: 'GET_AFFILIATE_WITHDRAWALS_ERROR',
        };
      }

      const totalPages = Math.ceil((count || 0) / limit);

      return {
        success: true,
        data: {
          data: withdrawals || [],
          pagination: {
            page,
            limit,
            total: count || 0,
            totalPages,
            hasMore: page < totalPages,
          },
        },
      };

    } catch (error) {
      Logger.error('WithdrawalService', 'Error in getByAffiliateId', error as Error);
      return {
        success: false,
        error: 'Erro interno ao obter saques',
        code: 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Aprovar saque (admin)
   */
  async approveWithdrawal(
    withdrawalId: string,
    adminUserId: string,
    reason?: string
  ): Promise<ServiceResponse<Withdrawal>> {
    try {
      Logger.info('WithdrawalService', 'Approving withdrawal', {
        withdrawalId,
        adminUserId,
      });

      const result = await this.processWithdrawal(withdrawalId, adminUserId, 'approve', reason);

      if (!result.success) {
        return result as ServiceResponse<Withdrawal>;
      }

      // Aqui seria integrada a API do Asaas para processar a transferência
      // Por enquanto, apenas marcamos como aprovado

      return { success: true, data: result.data };

    } catch (error) {
      Logger.error('WithdrawalService', 'Error in approveWithdrawal', error as Error);
      return {
        success: false,
        error: 'Erro interno ao aprovar saque',
        code: 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Rejeitar saque (admin)
   */
  async rejectWithdrawal(
    withdrawalId: string,
    adminUserId: string,
    reason: string
  ): Promise<ServiceResponse<Withdrawal>> {
    try {
      Logger.info('WithdrawalService', 'Rejecting withdrawal', {
        withdrawalId,
        adminUserId,
        reason,
      });

      const result = await this.processWithdrawal(withdrawalId, adminUserId, 'reject', reason);

      if (!result.success) {
        return result as ServiceResponse<Withdrawal>;
      }

      return { success: true, data: result.data };

    } catch (error) {
      Logger.error('WithdrawalService', 'Error in rejectWithdrawal', error as Error);
      return {
        success: false,
        error: 'Erro interno ao rejeitar saque',
        code: 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Validar saldo para saque
   */
  async validateWithdrawalBalance(
    affiliateId: string,
    requestedAmountCents: number
  ): Promise<ServiceResponse<{ canWithdraw: boolean; availableBalanceCents: number; errorMessage?: string }>> {
    try {
      const { data, error } = await supabase
        .rpc('validate_withdrawal_balance', {
          p_affiliate_id: affiliateId,
          p_requested_amount_cents: requestedAmountCents,
        });

      if (error) {
        Logger.error('WithdrawalService', 'Error validating withdrawal balance', error);
        return {
          success: false,
          error: 'Erro ao validar saldo',
          code: 'VALIDATION_ERROR',
        };
      }

      const [result] = data || [];

      return {
        success: true,
        data: {
          canWithdraw: result?.can_withdraw || false,
          availableBalanceCents: result?.available_balance_cents || 0,
          errorMessage: result?.error_message,
        },
      };

    } catch (error) {
      Logger.error('WithdrawalService', 'Error in validateWithdrawalBalance', error as Error);
      return {
        success: false,
        error: 'Erro interno ao validar saldo',
        code: 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Obter estatísticas de saques
   */
  async getStats(): Promise<ServiceResponse<any>> {
    try {
      const { data: stats, error } = await supabase
        .from('withdrawal_stats')
        .select('*')
        .single();

      if (error) {
        Logger.error('WithdrawalService', 'Error getting withdrawal stats', error);
        return {
          success: false,
          error: 'Erro ao obter estatísticas',
          code: 'GET_STATS_ERROR',
        };
      }

      return { success: true, data: stats };

    } catch (error) {
      Logger.error('WithdrawalService', 'Error in getStats', error as Error);
      return {
        success: false,
        error: 'Erro interno ao obter estatísticas',
        code: 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Processar saque (aprovação/rejeição)
   */
  private async processWithdrawal(
    withdrawalId: string,
    adminUserId: string,
    action: 'approve' | 'reject',
    reason?: string
  ): Promise<ServiceResponse<Withdrawal>> {
    try {
      const { data, error } = await supabase
        .rpc('process_withdrawal', {
          p_withdrawal_id: withdrawalId,
          p_admin_user_id: adminUserId,
          p_action: action,
          p_reason: reason,
        });

      if (error) {
        Logger.error('WithdrawalService', 'Error processing withdrawal', error);
        return {
          success: false,
          error: 'Erro ao processar saque',
          code: 'PROCESS_WITHDRAWAL_ERROR',
        };
      }

      const [result] = data || [];

      if (!result?.success) {
        return {
          success: false,
          error: result?.error_message || 'Erro desconhecido',
          code: 'PROCESS_WITHDRAWAL_FAILED',
        };
      }

      // Buscar saque atualizado
      const withdrawalResult = await this.getById(withdrawalId);
      if (!withdrawalResult.success) {
        return withdrawalResult;
      }

      return { success: true, data: withdrawalResult.data };

    } catch (error) {
      Logger.error('WithdrawalService', 'Error in processWithdrawal', error as Error);
      return {
        success: false,
        error: 'Erro interno ao processar saque',
        code: 'INTERNAL_ERROR',
      };
    }
  }
}

export const withdrawalService = new WithdrawalService();