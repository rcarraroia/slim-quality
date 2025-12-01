/**
 * Affiliate Service - Frontend
 * Sprint 4: Sistema de Afiliados Multinível
 * 
 * Serviço de integração frontend/backend para afiliados
 */

import apiClient from '@/lib/api-client';

// Tipos
export interface AffiliateRegistrationData {
  name: string;
  email: string;
  phone: string;
  cpf_cnpj: string;
  wallet_id: string;
  referral_code?: string;
}

export interface AffiliateValidationResponse {
  valid: boolean;
  active?: boolean;
  name?: string;
  error?: string;
}

export interface AffiliateDashboardData {
  metrics: {
    total_clicks: number;
    total_conversions: number;
    total_commissions_cents: number;
    pending_commissions_cents: number;
    conversion_rate: number;
  };
  recent_activity: Array<{
    type: 'click' | 'conversion' | 'commission';
    date: string;
    description: string;
    value?: number;
  }>;
}

export interface AffiliateNetwork {
  n1_affiliates: Array<{
    id: string;
    name: string;
    email: string;
    status: string;
    created_at: string;
    total_commissions_cents: number;
  }>;
  my_upline: {
    n2?: { name: string; email: string };
    n3?: { name: string; email: string };
  };
}

export interface AffiliateCommission {
  id: string;
  order_id: string;
  order_number: string;
  level: number;
  percentage: number;
  commission_value_cents: number;
  status: 'calculated' | 'pending' | 'paid' | 'failed';
  paid_at?: string;
  created_at: string;
}

export interface ReferralLink {
  code: string;
  url: string;
  qr_code?: string;
}

export interface ClickStats {
  daily_clicks: Array<{
    date: string;
    clicks: number;
    conversions: number;
  }>;
  total_clicks: number;
  total_conversions: number;
  conversion_rate: number;
}

export const affiliateService = {
  // ============================================
  // PÚBLICOS (sem autenticação)
  // ============================================

  /**
   * Registrar novo afiliado
   */
  async register(data: AffiliateRegistrationData) {
    const response = await apiClient.post('/api/affiliates', data);
    return response.data;
  },

  /**
   * Validar Wallet ID do Asaas
   */
  async validateWalletId(walletId: string): Promise<AffiliateValidationResponse> {
    const response = await apiClient.post('/api/affiliates/validate-wallet', {
      wallet_id: walletId,
    });
    return response.data;
  },

  /**
   * Verificar se código de referência existe
   */
  async validateReferralCode(code: string) {
    const response = await apiClient.get(`/api/affiliates/validate-referral/${code}`);
    return response.data;
  },

  // ============================================
  // AFILIADO AUTENTICADO
  // ============================================

  /**
   * Buscar dashboard do afiliado
   */
  async getMyDashboard(): Promise<AffiliateDashboardData> {
    const response = await apiClient.get('/api/affiliate/dashboard');
    return response.data.data;
  },

  /**
   * Buscar minha rede genealógica
   */
  async getMyNetwork(): Promise<AffiliateNetwork> {
    const response = await apiClient.get('/api/affiliate/network');
    return response.data.data;
  },

  /**
   * Buscar minhas comissões
   */
  async getMyCommissions(params?: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ commissions: AffiliateCommission[]; total: number }> {
    const response = await apiClient.get('/api/affiliate/commissions', { params });
    return response.data.data;
  },

  /**
   * Buscar meu link de indicação
   */
  async getMyReferralLink(): Promise<ReferralLink> {
    const response = await apiClient.get('/api/affiliate/referral-link');
    return response.data.data;
  },

  /**
   * Buscar estatísticas de cliques
   */
  async getMyClicks(params?: {
    start_date?: string;
    end_date?: string;
  }): Promise<ClickStats> {
    const response = await apiClient.get('/api/affiliate/clicks', { params });
    return response.data.data;
  },

  /**
   * Buscar conversões
   */
  async getMyConversions(params?: {
    limit?: number;
    offset?: number;
  }) {
    const response = await apiClient.get('/api/affiliate/conversions', { params });
    return response.data.data;
  },

  // ============================================
  // ADMIN (requer role admin)
  // ============================================

  /**
   * Listar todos os afiliados (admin)
   */
  async getAllAffiliates(params?: {
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }) {
    const response = await apiClient.get('/api/admin/affiliates', { params });
    return response.data.data;
  },

  /**
   * Buscar afiliado por ID (admin)
   */
  async getAffiliateById(id: string) {
    const response = await apiClient.get(`/api/admin/affiliates/${id}`);
    return response.data.data;
  },

  /**
   * Atualizar status do afiliado (admin)
   */
  async updateAffiliateStatus(id: string, status: string) {
    const response = await apiClient.put(`/api/admin/affiliates/${id}/status`, {
      status,
    });
    return response.data;
  },

  /**
   * Buscar rede genealógica de um afiliado (admin)
   */
  async getAffiliateNetwork(id: string) {
    const response = await apiClient.get(`/api/admin/affiliates/${id}/network`);
    return response.data.data;
  },

  /**
   * Buscar estatísticas gerais (admin)
   */
  async getAffiliateStats() {
    const response = await apiClient.get('/api/admin/affiliates/stats');
    return response.data.data;
  },

  // ============================================
  // MÉTODOS ADMINISTRATIVOS AVANÇADOS
  // ============================================

  /**
   * Obter métricas administrativas
   */
  async getAdminMetrics(period: string = '30d') {
    const response = await apiClient.get(`/api/admin/affiliates/metrics?period=${period}`);
    return response.data.data;
  },

  /**
   * Obter top afiliados
   */
  async getTopAffiliates(period: string = '30d', limit: number = 10) {
    const response = await apiClient.get(`/api/admin/affiliates/top?period=${period}&limit=${limit}`);
    return response.data.data;
  },

  /**
   * Obter dados de crescimento da rede
   */
  async getNetworkGrowth(period: string = '12m') {
    const response = await apiClient.get(`/api/admin/affiliates/network-growth?period=${period}`);
    return response.data.data;
  },

  /**
   * Obter distribuição por profundidade da rede
   */
  async getNetworkDepth() {
    const response = await apiClient.get('/api/admin/affiliates/network-depth');
    return response.data.data;
  },

  /**
   * Obter dados do funil de conversão
   */
  async getConversionFunnel() {
    const response = await apiClient.get('/api/admin/affiliates/conversion-funnel');
    return response.data.data;
  },

  /**
   * Exportar dados de afiliados
   */
  async exportAffiliates(format: 'csv' | 'xlsx', period?: string) {
    const params = new URLSearchParams();
    if (period) params.append('period', period);
    
    const response = await apiClient.get(`/api/admin/affiliates/export/${format}?${params.toString()}`, {
      responseType: 'blob'
    });
    
    // Criar download do arquivo
    const blob = new Blob([response.data]);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `afiliados_${new Date().toISOString().split('T')[0]}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    return response.data;
  },

  /**
   * Obter detalhes completos de um afiliado
   */
  async getAffiliateDetails(affiliateId: string) {
    const response = await apiClient.get(`/api/admin/affiliates/${affiliateId}/details`);
    return response.data.data;
  },

  /**
   * Obter árvore genealógica de um afiliado
   */
  async getAffiliateNetworkTree(affiliateId: string, depth: number = 3) {
    const response = await apiClient.get(`/api/admin/affiliates/${affiliateId}/network-tree?depth=${depth}`);
    return response.data.data;
  },

  /**
   * Ações em massa para afiliados
   */
  async bulkUpdateAffiliates(affiliateIds: string[], action: string, data?: any) {
    const response = await apiClient.post('/api/admin/affiliates/bulk-update', {
      affiliate_ids: affiliateIds,
      action,
      data
    });
    return response.data;
  },

  // ============================================
  // ADMIN COMMISSIONS MANAGEMENT
  // ============================================

  /**
   * Listar todas as comissões (admin)
   */
  async getAllCommissions(params?: {
    status?: string;
    affiliate_id?: string;
    limit?: number;
    offset?: number;
  }) {
    const response = await apiClient.get('/api/admin/commissions', { params });
    return response.data.data;
  },

  /**
   * Buscar comissão por ID (admin)
   */
  async getCommissionById(id: string) {
    const response = await apiClient.get(`/api/admin/commissions/${id}`);
    return response.data.data;
  },

  /**
   * Buscar estatísticas de comissões (admin)
   */
  async getCommissionStats() {
    const response = await apiClient.get('/api/admin/commissions/stats');
    return response.data.data;
  },

  /**
   * Aprovar comissão (admin)
   */
  async approveCommission(commissionId: string) {
    const response = await apiClient.post(`/api/admin/commissions/${commissionId}/approve`);
    return response.data;
  },

  /**
   * Rejeitar comissão (admin)
   */
  async rejectCommission(commissionId: string, reason?: string) {
    const response = await apiClient.post(`/api/admin/commissions/${commissionId}/reject`, {
      reason
    });
    return response.data;
  },

  // ============================================
  // ADMIN WITHDRAWALS MANAGEMENT
  // ============================================

  /**
   * Listar todos os saques (admin)
   */
  async getAllWithdrawals(params?: {
    status?: string;
    affiliate_id?: string;
    limit?: number;
    offset?: number;
  }) {
    const response = await apiClient.get('/api/admin/withdrawals', { params });
    return response.data.data;
  },

  /**
   * Buscar saque por ID (admin)
   */
  async getWithdrawalById(id: string) {
    const response = await apiClient.get(`/api/admin/withdrawals/${id}`);
    return response.data.data;
  },

  /**
   * Buscar estatísticas de saques (admin)
   */
  async getWithdrawalStats() {
    const response = await apiClient.get('/api/admin/withdrawals/stats');
    return response.data.data;
  },

  /**
   * Aprovar saque (admin)
   */
  async approveWithdrawal(withdrawalId: string) {
    const response = await apiClient.post(`/api/admin/withdrawals/${withdrawalId}/approve`);
    return response.data;
  },

  /**
   * Rejeitar saque (admin)
   */
  async rejectWithdrawal(withdrawalId: string, reason?: string) {
    const response = await apiClient.post(`/api/admin/withdrawals/${withdrawalId}/reject`, {
      reason
    });
    return response.data;
  },
};

// Alias para compatibilidade com componentes existentes
export const affiliateFrontendService = affiliateService;