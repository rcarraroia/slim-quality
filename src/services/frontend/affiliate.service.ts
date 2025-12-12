/**
 * Serviço Frontend para Afiliados
 * Integração Frontend - Task 8: APIs REST
 */

import { supabase } from '@/config/supabase';

export interface CreateAffiliateData {
  name: string;
  email: string;
  phone?: string;
  document?: string;
  walletId: string;
  referralCode?: string;
}

export interface AffiliateData {
  id: string;
  name: string;
  email: string;
  phone?: string;
  referralCode: string;
  walletId: string;
  status: 'pending' | 'active' | 'inactive' | 'suspended' | 'rejected';
  totalClicks: number;
  totalConversions: number;
  totalCommissions: number;
  createdAt: string;
}

export interface AffiliateStats {
  totalClicks: number;
  totalConversions: number;
  totalCommissions: number;
  conversionRate: number;
  avgCommission: number;
  lastConversionAt?: string;
}

export interface DashboardData {
  affiliate: AffiliateData;
  stats: AffiliateStats;
  network: AffiliateData[];
  commissions: any[];
  referralLink: string;
}

export interface WalletValidation {
  isValid: boolean;
  isActive: boolean;
  name?: string;
  error?: string;
}

export class AffiliateFrontendService {
  private baseUrl = '/api/affiliates';

  /**
   * Registra novo afiliado
   * API: POST /api/affiliates/register
   */
  async registerAffiliate(data: CreateAffiliateData): Promise<AffiliateData> {
    try {
      const response = await fetch(`${this.baseUrl}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao cadastrar afiliado');
      }

      return result.data;
    } catch (error) {
      console.error('Erro ao registrar afiliado:', error);
      throw error;
    }
  }

  /**
   * Valida Wallet ID do Asaas
   * API: POST /api/affiliates/validate-wallet
   */
  async validateWallet(walletId: string): Promise<WalletValidation> {
    try {
      const response = await fetch(`${this.baseUrl}/validate-wallet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ walletId }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao validar wallet');
      }

      return result.data;
    } catch (error) {
      console.error('Erro ao validar wallet:', error);
      throw error;
    }
  }

  /**
   * Busca dados do dashboard do afiliado
   * API: GET /api/affiliates/dashboard
   */
  async getDashboard(): Promise<DashboardData> {
    try {
      const response = await fetch(`${this.baseUrl}/dashboard`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao buscar dashboard');
      }

      return result.data;
    } catch (error) {
      console.error('Erro ao buscar dashboard:', error);
      throw error;
    }
  }

  /**
   * Busca link de indicação do afiliado
   * API: GET /api/affiliates/referral-link
   */
  async getReferralLink(): Promise<{ link: string; qrCode: string; referralCode: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/referral-link`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao buscar link');
      }

      return result.data;
    } catch (error) {
      console.error('Erro ao buscar link de indicação:', error);
      throw error;
    }
  }

  /**
   * Busca rede do afiliado
   * API: GET /api/affiliates/network
   */
  async getNetwork(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/network`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao buscar rede');
      }

      return result.data;
    } catch (error) {
      console.error('Erro ao buscar rede:', error);
      throw error;
    }
  }

  /**
   * Busca comissões do afiliado (alias para compatibilidade)
   */
  async getMyCommissions(page = 1, limit = 20) {
    return this.getCommissions(page, limit);
  }

  /**
   * Busca comissões do afiliado
   * Usando Supabase diretamente para queries mais complexas
   */
  async getCommissions(page = 1, limit = 20) {
    try {
      // Buscar afiliado atual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data: affiliate } = await supabase
        .from('affiliates')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!affiliate) throw new Error('Afiliado não encontrado');

      // Buscar comissões
      const offset = (page - 1) * limit;
      const { data, error, count } = await supabase
        .from('commissions')
        .select(`
          *,
          order:orders(
            id,
            total_cents,
            status,
            created_at,
            customer_name
          )
        `, { count: 'exact' })
        .eq('affiliate_id', affiliate.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      return {
        commissions: data || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        }
      };
    } catch (error) {
      console.error('Erro ao buscar comissões:', error);
      throw error;
    }
  }

  /**
   * Verifica se usuário atual é afiliado
   */
  async checkAffiliateStatus(): Promise<{ isAffiliate: boolean; affiliate?: AffiliateData }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { isAffiliate: false };

      const { data: affiliate } = await supabase
        .from('affiliates')
        .select('*')
        .eq('user_id', user.id)
        .eq('deleted_at', null)
        .single();

      if (!affiliate) {
        return { isAffiliate: false };
      }

      return {
        isAffiliate: true,
        affiliate: {
          id: affiliate.id,
          name: affiliate.name,
          email: affiliate.email,
          phone: affiliate.phone,
          referralCode: affiliate.referral_code,
          walletId: affiliate.wallet_id,
          status: affiliate.status,
          totalClicks: affiliate.total_clicks,
          totalConversions: affiliate.total_conversions,
          totalCommissions: (affiliate.total_commissions_cents || 0) / 100,
          createdAt: affiliate.created_at
        }
      };
    } catch (error) {
      console.error('Erro ao verificar status de afiliado:', error);
      return { isAffiliate: false };
    }
  }

  /**
   * Rastreia clique em link de afiliado
   */
  async trackReferralClick(referralCode: string): Promise<void> {
    try {
      // Salvar código no localStorage para rastreamento
      localStorage.setItem('referralCode', referralCode);
      localStorage.setItem('referralClickedAt', new Date().toISOString());

      // Registrar clique no banco
      const { error } = await supabase
        .from('referral_clicks')
        .insert({
          referral_code: referralCode,
          affiliate_id: await this.getAffiliateIdByCode(referralCode),
          ip_address: await this.getClientIP(),
          user_agent: navigator.userAgent,
          referer: document.referrer,
          clicked_at: new Date().toISOString()
        });

      if (error) {
        console.warn('Erro ao registrar clique:', error);
      }
    } catch (error) {
      console.warn('Erro ao rastrear clique:', error);
    }
  }

  /**
   * Busca ID do afiliado pelo código
   */
  private async getAffiliateIdByCode(code: string): Promise<string | null> {
    try {
      const { data } = await supabase
        .from('affiliates')
        .select('id')
        .eq('referral_code', code)
        .eq('status', 'active')
        .single();

      return data?.id || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Obtém IP do cliente (aproximado)
   */
  private async getClientIP(): Promise<string> {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch (error) {
      return 'unknown';
    }
  }

  /**
   * Obtém código de referência salvo
   */
  getSavedReferralCode(): string | null {
    return localStorage.getItem('referralCode');
  }

  /**
   * Remove código de referência salvo
   */
  clearReferralCode(): void {
    localStorage.removeItem('referralCode');
    localStorage.removeItem('referralClickedAt');
  }
}

// Instância singleton
export const affiliateFrontendService = new AffiliateFrontendService();