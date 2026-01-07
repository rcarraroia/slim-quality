/**
 * Serviço de Afiliados Admin
 * BLOCO 4 - Frontend
 */

import { apiService, ApiResponse } from './api.service';

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

export interface NetworkNode {
  id: string;
  name: string;
  email: string;
  level: number;
  totalCommissions: number;
  directReferrals: number;
  children: NetworkNode[];
}

export interface NetworkStats {
  totalLevels: number;
  totalAffiliates: number;
  levelStats: Array<{
    level: number;
    count: number;
    totalCommissions: number;
  }>;
}

class AdminAffiliatesService {
  /**
   * Buscar métricas do dashboard
   */
  async getMetrics(): Promise<ApiResponse<AffiliateMetrics>> {
    return apiService.get<AffiliateMetrics>('/admin/affiliates/metrics');
  }

  /**
   * Listar afiliados com filtros e paginação
   */
  async getAll(params: AffiliateListParams = {}): Promise<ApiResponse<AffiliateListResponse>> {
    const queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.search) queryParams.append('search', params.search);
    if (params.status) queryParams.append('status', params.status);
    if (params.orderBy) queryParams.append('orderBy', params.orderBy);
    if (params.orderDirection) queryParams.append('orderDirection', params.orderDirection);

    const url = `/admin/affiliates${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return apiService.get<AffiliateListResponse>(url);
  }

  /**
   * Buscar afiliado por ID
   */
  async getById(id: string): Promise<ApiResponse<Affiliate>> {
    return apiService.get<Affiliate>(`/admin/affiliates/${id}`);
  }

  /**
   * Atualizar dados do afiliado
   */
  async update(id: string, data: Partial<Affiliate>): Promise<ApiResponse<Affiliate>> {
    return apiService.put<Affiliate>(`/admin/affiliates/${id}`, data);
  }

  /**
   * Ativar afiliado
   */
  async activate(id: string): Promise<ApiResponse<{ message: string }>> {
    return apiService.post<{ message: string }>(`/admin/affiliates/${id}/activate`);
  }

  /**
   * Desativar afiliado
   */
  async deactivate(id: string): Promise<ApiResponse<{ message: string }>> {
    return apiService.post<{ message: string }>(`/admin/affiliates/${id}/deactivate`);
  }

  /**
   * Listar solicitações pendentes
   */
  async getPendingRequests(): Promise<ApiResponse<Affiliate[]>> {
    return apiService.get<Affiliate[]>('/admin/affiliates/requests');
  }

  /**
   * Aprovar solicitação de afiliado
   */
  async approve(id: string): Promise<ApiResponse<{ message: string }>> {
    return apiService.post<{ message: string }>(`/admin/affiliates/${id}/approve`);
  }

  /**
   * Rejeitar solicitação de afiliado
   */
  async reject(id: string, reason: string): Promise<ApiResponse<{ message: string }>> {
    return apiService.post<{ message: string }>(`/admin/affiliates/${id}/reject`, { reason });
  }

  /**
   * Buscar rede genealógica
   */
  async getNetwork(): Promise<ApiResponse<{ tree: NetworkNode[]; stats: NetworkStats }>> {
    return apiService.get<{ tree: NetworkNode[]; stats: NetworkStats }>('/admin/affiliates/network');
  }

  /**
   * Exportar lista de afiliados
   */
  async exportCSV(params: AffiliateListParams = {}): Promise<ApiResponse<void>> {
    const queryParams = new URLSearchParams();
    
    if (params.search) queryParams.append('search', params.search);
    if (params.status) queryParams.append('status', params.status);

    const url = `/admin/affiliates/export${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `afiliados_${timestamp}.csv`;
    
    return apiService.download(url, filename);
  }

  /**
   * Validar Wallet ID do Asaas
   */
  async validateWallet(walletId: string): Promise<ApiResponse<{ isValid: boolean; isActive: boolean; accountName?: string }>> {
    return apiService.post<{ isValid: boolean; isActive: boolean; accountName?: string }>('/admin/affiliates/validate-wallet', { walletId });
  }
}

export const adminAffiliatesService = new AdminAffiliatesService();
export default adminAffiliatesService;