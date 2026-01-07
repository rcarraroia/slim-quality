/**
 * Serviço de Comissões Admin
 * BLOCO 4 - Frontend
 */

import { apiService, ApiResponse } from './api.service';

export interface Commission {
  id: string;
  affiliate_id: string;
  order_id: string;
  amount: number;
  level: number;
  percentage: number;
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  created_at: string;
  paid_at?: string;
  rejection_reason?: string;
  affiliate: {
    id: string;
    name: string;
    email: string;
  };
  order: {
    id: string;
    total_amount: number;
    customer_name: string;
    product_name: string;
  };
}

export interface CommissionListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  level?: number;
  dateFrom?: string;
  dateTo?: string;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export interface CommissionListResponse {
  commissions: Commission[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary: {
    totalAmount: number;
    pendingAmount: number;
    paidAmount: number;
    rejectedAmount: number;
  };
}

export interface CommissionExportParams {
  format: 'csv' | 'json';
  status?: string;
  level?: number;
  dateFrom?: string;
  dateTo?: string;
}

class AdminCommissionsService {
  /**
   * Listar comissões com filtros e paginação
   */
  async getAll(params: CommissionListParams = {}): Promise<ApiResponse<CommissionListResponse>> {
    const queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.search) queryParams.append('search', params.search);
    if (params.status) queryParams.append('status', params.status);
    if (params.level) queryParams.append('level', params.level.toString());
    if (params.dateFrom) queryParams.append('dateFrom', params.dateFrom);
    if (params.dateTo) queryParams.append('dateTo', params.dateTo);
    if (params.orderBy) queryParams.append('orderBy', params.orderBy);
    if (params.orderDirection) queryParams.append('orderDirection', params.orderDirection);

    const url = `/admin/commissions${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return apiService.get<CommissionListResponse>(url);
  }

  /**
   * Buscar comissão por ID
   */
  async getById(id: string): Promise<ApiResponse<Commission>> {
    return apiService.get<Commission>(`/admin/commissions/${id}`);
  }

  /**
   * Aprovar comissão
   */
  async approve(id: string): Promise<ApiResponse<{ message: string }>> {
    return apiService.post<{ message: string }>(`/admin/commissions/${id}/approve`);
  }

  /**
   * Rejeitar comissão
   */
  async reject(id: string, reason: string): Promise<ApiResponse<{ message: string }>> {
    return apiService.post<{ message: string }>(`/admin/commissions/${id}/reject`, { reason });
  }

  /**
   * Marcar comissão como paga
   */
  async markAsPaid(id: string): Promise<ApiResponse<{ message: string }>> {
    return apiService.post<{ message: string }>(`/admin/commissions/${id}/mark-paid`);
  }

  /**
   * Exportar relatório de comissões
   */
  async export(params: CommissionExportParams): Promise<ApiResponse<void>> {
    const queryParams = new URLSearchParams();
    
    queryParams.append('format', params.format);
    if (params.status) queryParams.append('status', params.status);
    if (params.level) queryParams.append('level', params.level.toString());
    if (params.dateFrom) queryParams.append('dateFrom', params.dateFrom);
    if (params.dateTo) queryParams.append('dateTo', params.dateTo);

    const url = `/admin/commissions/export?${queryParams.toString()}`;
    
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `comissoes_${timestamp}.${params.format}`;
    
    return apiService.download(url, filename);
  }

  /**
   * Processar lote de comissões
   */
  async processBatch(commissionIds: string[], action: 'approve' | 'reject', reason?: string): Promise<ApiResponse<{ processed: number; failed: number }>> {
    return apiService.post<{ processed: number; failed: number }>('/admin/commissions/batch', {
      commissionIds,
      action,
      reason
    });
  }

  /**
   * Buscar estatísticas de comissões
   */
  async getStats(period: 'week' | 'month' | 'quarter' | 'year' = 'month'): Promise<ApiResponse<{
    totalCommissions: number;
    totalAmount: number;
    averageCommission: number;
    commissionsByLevel: Array<{ level: number; count: number; amount: number }>;
    commissionsByStatus: Array<{ status: string; count: number; amount: number }>;
    topAffiliates: Array<{ id: string; name: string; totalCommissions: number; totalAmount: number }>;
  }>> {
    return apiService.get(`/admin/commissions/stats?period=${period}`);
  }
}

export const adminCommissionsService = new AdminCommissionsService();
export default adminCommissionsService;