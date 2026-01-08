/**
 * Serviço de Saques Admin
 * Usando Supabase diretamente
 */

import { supabase } from '@/config/supabase';

export interface Withdrawal {
  id: string;
  affiliate_id: string;
  amount: number;
  status: 'pending' | 'processing' | 'approved' | 'rejected';
  pix_key: string;
  payment_method: string;
  created_at: string;
  processed_at?: string;
  rejection_reason?: string;
  affiliate?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface WithdrawalListParams {
  page?: number;
  limit?: number;
  status?: string;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export interface WithdrawalListResponse {
  withdrawals: Withdrawal[];
  summary: {
    totalPending: number;
    totalApproved: number;
    pendingCount: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

class AdminWithdrawalsService {
  /**
   * Listar saques com filtros
   */
  async getAll(params: WithdrawalListParams = {}): Promise<ApiResponse<WithdrawalListResponse>> {
    try {
      let query = supabase
        .from('withdrawals')
        .select(`
          *,
          affiliates:affiliate_id (id, name, email)
        `)
        .order(params.orderBy || 'created_at', { 
          ascending: params.orderDirection === 'asc' 
        });

      // Filtro por status
      if (params.status) {
        query = query.eq('status', params.status);
      }

      // Limite
      if (params.limit) {
        query = query.limit(params.limit);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Mapear dados
      const withdrawals: Withdrawal[] = (data || []).map(w => ({
        id: w.id,
        affiliate_id: w.affiliate_id,
        amount: w.amount_cents ? w.amount_cents / 100 : w.amount || 0,
        status: w.status,
        pix_key: w.pix_key || '',
        payment_method: w.payment_method || 'PIX',
        created_at: w.created_at,
        processed_at: w.processed_at,
        rejection_reason: w.rejection_reason,
        affiliate: w.affiliates ? {
          id: w.affiliates.id,
          name: w.affiliates.name,
          email: w.affiliates.email
        } : undefined
      }));

      // Calcular sumário
      const summary = {
        totalPending: withdrawals.filter(w => w.status === 'pending').reduce((sum, w) => sum + w.amount, 0),
        totalApproved: withdrawals.filter(w => w.status === 'approved').reduce((sum, w) => sum + w.amount, 0),
        pendingCount: withdrawals.filter(w => w.status === 'pending').length
      };

      return {
        success: true,
        data: { withdrawals, summary }
      };
    } catch (error: any) {
      console.error('Erro ao listar saques:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Aprovar saque
   */
  async approve(id: string): Promise<ApiResponse<{ message: string }>> {
    try {
      const { error } = await supabase
        .from('withdrawals')
        .update({ 
          status: 'approved',
          processed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      return { success: true, data: { message: 'Saque aprovado com sucesso' } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Rejeitar saque
   */
  async reject(id: string, reason: string): Promise<ApiResponse<{ message: string }>> {
    try {
      const { error } = await supabase
        .from('withdrawals')
        .update({ 
          status: 'rejected',
          rejection_reason: reason,
          processed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      return { success: true, data: { message: 'Saque rejeitado' } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}

export const adminWithdrawalsService = new AdminWithdrawalsService();
export default adminWithdrawalsService;
