/**
 * Serviço de Afiliados Admin
 * Usando Supabase diretamente
 */

import { supabase } from '@/config/supabase';

export interface AffiliateMetrics {
  totalAffiliates: number;
  activeAffiliates: number;
  pendingAffiliates: number;
  totalCommissionsPaid: number;
  totalSalesGenerated: number;
  conversionRate: number;
  averageCommissionPerAffiliate: number;
  topPerformers: Array<{
    id: string;
    name: string;
    totalCommissions: number;
    totalSales: number;
  }>;
}

export interface Affiliate {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  wallet_id: string;
  referral_code: string;
  status: 'pending' | 'active' | 'inactive' | 'rejected';
  level: number;
  available_balance: number;
  pending_balance: number;
  total_commissions: number;
  total_sales: number;
  pix_key: string;
  created_at: string;
  updated_at: string;
  approved_at?: string;
  rejected_at?: string;
  rejection_reason?: string;
}

export interface AffiliateListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export interface AffiliateListResponse {
  affiliates: Affiliate[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

class AdminAffiliatesService {
  /**
   * Buscar métricas do dashboard
   */
  async getMetrics(): Promise<ApiResponse<AffiliateMetrics>> {
    try {
      // Buscar todos os afiliados
      const { data: affiliates, error } = await supabase
        .from('affiliates')
        .select('id, status, total_conversions')
        .is('deleted_at', null);

      if (error) throw error;

      // Buscar comissões pagas
      const { data: commissions } = await supabase
        .from('commissions')
        .select('commission_value_cents, status');

      const totalAffiliates = affiliates?.length || 0;
      const activeAffiliates = affiliates?.filter(a => a.status === 'active').length || 0;
      const pendingAffiliates = affiliates?.filter(a => a.status === 'pending').length || 0;
      
      const paidCommissions = commissions?.filter(c => c.status === 'paid') || [];
      const totalCommissionsPaid = paidCommissions.reduce((sum, c) => sum + (c.commission_value_cents || 0), 0) / 100;
      
      const totalSalesGenerated = affiliates?.reduce((sum, a) => sum + (a.total_conversions || 0), 0) || 0;

      return {
        success: true,
        data: {
          totalAffiliates,
          activeAffiliates,
          pendingAffiliates,
          totalCommissionsPaid,
          totalSalesGenerated,
          conversionRate: 0,
          averageCommissionPerAffiliate: totalAffiliates > 0 ? totalCommissionsPaid / totalAffiliates : 0,
          topPerformers: []
        }
      };
    } catch (error: any) {
      console.error('Erro ao buscar métricas:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Listar afiliados com filtros e paginação
   */
  async getAll(params: AffiliateListParams = {}): Promise<ApiResponse<AffiliateListResponse>> {
    try {
      const page = params.page || 1;
      const limit = params.limit || 50;
      const offset = (page - 1) * limit;

      let query = supabase
        .from('affiliates')
        .select('*', { count: 'exact' })
        .is('deleted_at', null);

      // Filtro por status
      if (params.status) {
        query = query.eq('status', params.status);
      }

      // Filtro por busca
      if (params.search) {
        query = query.or(`name.ilike.%${params.search}%,email.ilike.%${params.search}%`);
      }

      // Ordenação
      const orderBy = params.orderBy || 'created_at';
      const ascending = params.orderDirection === 'asc';
      query = query.order(orderBy, { ascending });

      // Paginação
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) throw error;

      // Mapear dados para o formato esperado
      const affiliates: Affiliate[] = (data || []).map(a => ({
        id: a.id,
        name: a.name || '',
        email: a.email || '',
        phone: a.phone || '',
        city: a.city || '',
        state: a.state || '',
        wallet_id: a.wallet_id || '',
        referral_code: a.referral_code || '',
        status: a.status || 'pending',
        level: 1,
        available_balance: 0,
        pending_balance: 0,
        total_commissions: 0,
        total_sales: a.total_conversions || 0,
        pix_key: a.pix_key || '',
        created_at: a.created_at,
        updated_at: a.updated_at
      }));

      return {
        success: true,
        data: {
          affiliates,
          pagination: {
            page,
            limit,
            total: count || 0,
            totalPages: Math.ceil((count || 0) / limit)
          }
        }
      };
    } catch (error: any) {
      console.error('Erro ao listar afiliados:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Buscar afiliado por ID
   */
  async getById(id: string): Promise<ApiResponse<Affiliate>> {
    try {
      const { data, error } = await supabase
        .from('affiliates')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      return { success: true, data: data as Affiliate };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Ativar afiliado
   */
  async activate(id: string): Promise<ApiResponse<{ message: string }>> {
    try {
      const { error } = await supabase
        .from('affiliates')
        .update({ status: 'active', updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      return { success: true, data: { message: 'Afiliado ativado com sucesso' } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Desativar afiliado
   */
  async deactivate(id: string): Promise<ApiResponse<{ message: string }>> {
    try {
      const { error } = await supabase
        .from('affiliates')
        .update({ status: 'inactive', updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      return { success: true, data: { message: 'Afiliado desativado com sucesso' } };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Exportar CSV (gera download no browser)
   */
  async exportCSV(params: AffiliateListParams = {}): Promise<ApiResponse<void>> {
    try {
      const response = await this.getAll({ ...params, limit: 10000 });
      
      if (!response.success || !response.data) {
        throw new Error('Erro ao buscar dados');
      }

      const affiliates = response.data.affiliates;
      
      // Gerar CSV
      const headers = ['ID', 'Nome', 'Email', 'Telefone', 'Status', 'Código Referência', 'Data Cadastro'];
      const rows = affiliates.map(a => [
        a.id,
        a.name,
        a.email,
        a.phone,
        a.status,
        a.referral_code,
        new Date(a.created_at).toLocaleDateString('pt-BR')
      ]);

      const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
      
      // Download
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `afiliados_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}

export const adminAffiliatesService = new AdminAffiliatesService();
export default adminAffiliatesService;
