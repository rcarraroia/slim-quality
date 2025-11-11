/**
 * Commission Service - Frontend
 * Sprint 4: Sistema de Afiliados Multinível
 * 
 * Serviço de integração frontend/backend para comissões
 */

import apiClient from '@/lib/api-client';

// Tipos
export interface Commission {
  id: string;
  order_id: string;
  order_number: string;
  affiliate_id: string;
  affiliate_name: string;
  level: number;
  percentage: number;
  base_value_cents: number;
  commission_value_cents: number;
  status: 'calculated' | 'pending' | 'paid' | 'failed';
  asaas_split_id?: string;
  paid_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CommissionSplit {
  id: string;
  order_id: string;
  order_number: string;
  total_order_value_cents: number;
  factory_percentage: number;
  factory_value_cents: number;
  n1_affiliate?: {
    id: string;
    name: string;
    percentage: number;
    value_cents: number;
  };
  n2_affiliate?: {
    id: string;
    name: string;
    percentage: number;
    value_cents: number;
  };
  n3_affiliate?: {
    id: string;
    name: string;
    percentage: number;
    value_cents: number;
  };
  renum_percentage: number;
  renum_value_cents: number;
  jb_percentage: number;
  jb_value_cents: number;
  redistribution_applied: boolean;
  redistribution_details?: any;
  status: 'calculated' | 'processing' | 'completed' | 'failed';
  asaas_split_id?: string;
  created_at: string;
}

export interface CommissionStats {
  total_commissions: number;
  total_value_cents: number;
  pending_commissions: number;
  pending_value_cents: number;
  paid_commissions: number;
  paid_value_cents: number;
  failed_commissions: number;
  failed_value_cents: number;
  monthly_evolution: Array<{
    month: string;
    commissions: number;
    value_cents: number;
  }>;
  top_affiliates: Array<{
    affiliate_id: string;
    affiliate_name: string;
    total_commissions: number;
    total_value_cents: number;
  }>;
}

export const commissionService = {
  // ============================================
  // ADMIN (requer role admin)
  // ============================================

  /**
   * Listar todas as comissões (admin)
   */
  async getAllCommissions(params?: {
    status?: string;
    affiliate_id?: string;
    start_date?: string;
    end_date?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ commissions: Commission[]; total: number }> {
    const response = await apiClient.get('/api/admin/commissions', { params });
    return response.data.data;
  },

  /**
   * Buscar comissão por ID (admin)
   */
  async getCommissionById(id: string): Promise<Commission> {
    const response = await apiClient.get(`/api/admin/commissions/${id}`);
    return response.data.data;
  },

  /**
   * Marcar comissão como paga (admin)
   */
  async markAsPaid(id: string) {
    const response = await apiClient.post(`/api/admin/commissions/${id}/pay`);
    return response.data;
  },

  /**
   * Buscar split completo de um pedido (admin)
   */
  async getCommissionSplit(orderId: string): Promise<CommissionSplit> {
    const response = await apiClient.get(`/api/admin/commissions/split/${orderId}`);
    return response.data.data;
  },

  /**
   * Reprocessar comissão (admin)
   */
  async reprocessCommission(orderId: string) {
    const response = await apiClient.post(`/api/admin/commissions/reprocess`, {
      order_id: orderId,
    });
    return response.data;
  },

  /**
   * Buscar estatísticas de comissões (admin)
   */
  async getCommissionStats(params?: {
    start_date?: string;
    end_date?: string;
  }): Promise<CommissionStats> {
    const response = await apiClient.get('/api/admin/commissions/stats', { params });
    return response.data.data;
  },

  /**
   * Exportar relatório de comissões (admin)
   */
  async exportCommissions(params?: {
    status?: string;
    start_date?: string;
    end_date?: string;
    format?: 'csv' | 'xlsx';
  }) {
    const response = await apiClient.get('/api/admin/commissions/export', {
      params,
      responseType: 'blob',
    });
    return response.data;
  },

  /**
   * Buscar comissões pendentes de pagamento (admin)
   */
  async getPendingCommissions(): Promise<{ commissions: Commission[]; total_value_cents: number }> {
    const response = await apiClient.get('/api/admin/commissions/pending');
    return response.data.data;
  },

  /**
   * Processar pagamento em lote (admin)
   */
  async processBatchPayment(commissionIds: string[]) {
    const response = await apiClient.post('/api/admin/commissions/batch-pay', {
      commission_ids: commissionIds,
    });
    return response.data;
  },
};