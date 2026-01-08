/**
 * Serviço de Comissões Admin
 * Usando Supabase diretamente
 */

import { supabase } from '@/config/supabase';

export interface Commission {
  id: string;
  order_id: string;
  affiliate_id: string;
  level: number;
  percentage: number;
  base_value_cents: number;
  commission_value_cents: number;
  amount: number; // valor em reais
  status: 'calculated' | 'pending' | 'approved' | 'paid' | 'rejected';
  created_at: string;
  paid_at?: string;
  affiliate?: {
    id: string;
    name: string;
    email: string;
  };
  order?: {
    id: string;
    order_number: string;
    customer_name: string;
    product_name: string;
    total_amount: number;
  };
}

export interface CommissionListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  level?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export interface CommissionListResponse {
  commissions: Commission[];
  summary: {
    totalAmount: number;
    pendingAmount: number;
    paidAmount: number;
    rejectedAmount: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

class AdminCommissionsService {
  /**
   * Listar comissões com filtros
   */
  async getAll(params: CommissionListParams = {}): Promise<ApiResponse<CommissionListResponse>> {
    try {
      let query = supabase
        .from('commissions')
        .select(`
          *,
          affiliates:affiliate_id (id, name, email),
          orders:order_id (id, order_number, customer_name, total_cents)
        `)
        .order('created_at', { ascending: false });

      // Filtro por status
      if (params.status) {
        query = query.eq('status', params.status);
      }

      // Filtro por nível
      if (params.level) {
        query = query.eq('level', params.level);
      }

      // Limite
      if (params.limit) {
        query = query.limit(params.limit);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Mapear dados
      const commissions: Commission[] = (data || []).map(c => ({
        id: c.id,
        order_id: c.order_id,
        affiliate_id: c.affiliate_id,
        level: c.level,
        percentage: Number(c.percentage),
        base_value_cents: c.base_value_cents,
        commission_value_cents: c.commission_value_cents,
        amount: c.commission_value_cents / 100,
        status: c.status,
        created_at: c.created_at,
        paid_at: c.paid_at,
        affiliate: c.affiliates ? {
          id: c.affiliates.id,
          name: c.affiliates.name,
          email: c.affiliates.email
        } : undefined,
        order: c.orders ? {
          id: c.orders.id,
          order_number: c.orders.order_number,
          customer_name: c.orders.customer_name,
          product_name: 'Produto',
          total_amount: c.orders.total_cents / 100
        } : undefined
      }));

      // Calcular sumário
      const allCommissions = commissions;
      const summary = {
        totalAmount: allCommissions.reduce((sum, c) => sum + c.amount, 0),
        pendingAmount: allCommissions.filter(c => c.status === 'pending' || c.status === 'calculated').reduce((sum, c) => sum + c.amount, 0),
        paidAmount: allCommissions.filter(c => c.status === 'paid').reduce((sum, c) => sum + c.amount, 0),
        rejectedAmount: allCommissions.filter(c => c.status === 'rejected').reduce((sum, c) => sum + c.amount, 0)
      };

      return {
        success: true,
        data: { commissions, summary }
      };
    } catch (error: any) {
      console.error('Erro ao listar comissões:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Aprovar comissão
   */
  async approve(id: string): Promise<ApiResponse<{ message: string }>> {
    try {
      const { error } = await supabase
        .from('commissions')
        .update({ 
          status: 'approved',
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      return { success: true, data: { message: 'Comissão aprovada com sucesso' } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Rejeitar comissão
   */
  async reject(id: string, reason: string): Promise<ApiResponse<{ message: string }>> {
    try {
      const { error } = await supabase
        .from('commissions')
        .update({ 
          status: 'rejected',
          calculation_details: { rejection_reason: reason },
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      return { success: true, data: { message: 'Comissão rejeitada' } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Marcar como paga
   */
  async markAsPaid(id: string): Promise<ApiResponse<{ message: string }>> {
    try {
      const { error } = await supabase
        .from('commissions')
        .update({ 
          status: 'paid',
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      return { success: true, data: { message: 'Comissão marcada como paga' } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}

export const adminCommissionsService = new AdminCommissionsService();
export default adminCommissionsService;
