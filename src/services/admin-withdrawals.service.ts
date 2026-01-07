/**
 * Serviço de Saques Admin
 * BLOCO 4 - Frontend
 */

import { apiService, ApiResponse } from './api.service';

export interface Withdrawal {
  id: string;
  affiliate_id: string;
  amount: number;
  pix_key: string;
  payment_method: 'pix' | 'bank_transfer';
  status: 'pending' | 'processing' | 'approved' | 'rejected' | 'cancelled';
  created_at: string;
  processed_at?: string;
  rejection_reason?: string;
  transaction_id?: string;
  affiliate: {
    id: string;
    name: string;
    email: string;
    available_balance: number;
  };
}

export interface WithdrawalListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export interface WithdrawalListResponse {
  withdrawals: Withdrawal[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary: {
    totalAmount: number;
    pendingAmount: number;
    approvedAmount: number;
    rejectedAmount: number;
  };
}

class AdminWithdrawalsService {
  /**
   * Listar saques com filtros e paginação
   */
  async getAll(params: WithdrawalListParams = {}): Promise<ApiResponse<WithdrawalListResponse>> {
    const queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.search) queryParams.append('search', params.search);
    if (params.status) queryParams.append('status', params.status);
    if (params.dateFrom) queryParams.append('dateFrom', params.dateFrom);
    if (params.dateTo) queryParams.append('dateTo', params.dateTo);
    if (params.orderBy) queryParams.append('orderBy', params.orderBy);
    if (params.orderDirection) queryParams.append('orderDirection', params.orderDirection);

    const url = `/admin/withdrawals${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return apiService.get<WithdrawalListResponse>(url);
  }

  /**
   * Buscar saque por ID
   */
  async getById(id: string): Promise<ApiResponse<Withdrawal>> {
    return apiService.get<Withdrawal>(`/admin/withdrawals/${id}`);
  }

  /**
   * Aprovar saque
   */
  async approve(id: string): Promise<ApiResponse<{ message: string; transactionId?: string }>> {
    return apiService.post<{ message: string; transactionId?: string }>(`/admin/withdrawals/${id}/approve`);
  }

  /**
   * Rejeitar saque
   */
  async reject(id: string, reason: string): Promise<ApiResponse<{ message: string }>> {
    return apiService.post<{ message: string }>(`/admin/withdrawals/${id}/reject`, { reason });
  }

  /**
   * Cancelar saque
   */
  async cancel(id: string, reason: string): Promise<ApiResponse<{ message: string }>> {
    return apiService.post<{ message: string }>(`/admin/withdrawals/${id}/cancel`, { reason });
  }

  /**
   * Marcar saque como processado
   */
  async markAsProcessed(id: string, transactionId: string): Promise<ApiResponse<{ message: string }>> {
    return apiService.post<{ message: string }>(`/admin/withdrawals/${id}/mark-processed`, { transactionId });
  }

  /**
   * Processar lote de saques
   */
  async processBatch(withdrawalIds: string[], action: 'approve' | 'reject', reason?: string): Promise<ApiResponse<{ processed: number; failed: number }>> {
    return apiService.post<{ processed: number; failed: number }>('/admin/withdrawals/batch', {
      withdrawalIds,
      action,
      reason
    });
  }

  /**
   * Exportar relatório de saques
   */
  async exportCSV(params: WithdrawalListParams = {}): Promise<ApiResponse<void>> {
    const queryParams = new URLSearchParams();
    
    if (params.search) queryParams.append('search', params.search);
    if (params.status) queryParams.append('status', params.status);
    if (params.dateFrom) queryParams.append('dateFrom', params.dateFrom);
    if (params.dateTo) queryParams.append('dateTo', params.dateTo);

    const url = `/admin/withdrawals/export${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `saques_${timestamp}.csv`;
    
    return apiService.download(url, filename);
  }

  /**
   * Buscar estatísticas de saques
   */
  async getStats(period: 'week' | 'month' | 'quarter' | 'year' = 'month'): Promise<ApiResponse<{
    totalWithdrawals: number;
    totalAmount: number;
    averageWithdrawal: number;
    withdrawalsByStatus: Array<{ status: string; count: number; amount: number }>;
    withdrawalsByMethod: Array<{ method: string; count: number; amount: number }>;
    topWithdrawers: Array<{ id: string; name: string; totalWithdrawals: number; totalAmount: number }>;
  }>> {
    return apiService.get(`/admin/withdrawals/stats?period=${period}`);
  }

  /**
   * Validar chave PIX
   */
  async validatePixKey(pixKey: string): Promise<ApiResponse<{ isValid: boolean; type: string; name?: string }>> {
    return apiService.post<{ isValid: boolean; type: string; name?: string }>('/admin/withdrawals/validate-pix', { pixKey });
  }
}

export const adminWithdrawalsService = new AdminWithdrawalsService();
export default adminWithdrawalsService;