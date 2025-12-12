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
   * Integração direta com Supabase
   */
  async registerAffiliate(data: CreateAffiliateData): Promise<AffiliateData> {
    try {
      // 1. Verificar se usuário está autenticado
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // 2. Verificar se usuário já é afiliado
      const { data: existingAffiliate } = await supabase
        .from('affiliates')
        .select('id')
        .eq('user_id', user.id)
        .eq('deleted_at', null)
        .single();

      if (existingAffiliate) {
        throw new Error('Usuário já é afiliado');
      }

      // 3. Validar Wallet ID
      const walletValidation = await this.validateWallet(data.walletId);
      if (!walletValidation.isValid) {
        throw new Error(walletValidation.error || 'Wallet ID inválida');
      }

      // 4. Gerar código de referência único
      const referralCode = await this.generateUniqueReferralCode();

      // 5. Buscar afiliado indicador (se houver)
      let parentAffiliateId = null;
      if (data.referralCode) {
        const { data: parentAffiliate } = await supabase
          .from('affiliates')
          .select('id')
          .eq('referral_code', data.referralCode)
          .eq('status', 'active')
          .single();
        
        parentAffiliateId = parentAffiliate?.id || null;
      }

      // 6. Criar afiliado
      const affiliateData = {
        user_id: user.id,
        name: data.name,
        email: data.email,
        phone: data.phone,
        document: data.document,
        wallet_id: data.walletId,
        referral_code: referralCode,
        parent_affiliate_id: parentAffiliateId,
        status: 'pending', // Aguarda aprovação
        total_clicks: 0,
        total_conversions: 0,
        total_commissions_cents: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: newAffiliate, error } = await supabase
        .from('affiliates')
        .insert(affiliateData)
        .select()
        .single();

      if (error) {
        throw new Error(`Erro ao criar afiliado: ${error.message}`);
      }

      // 7. Criar entrada na rede genealógica
      if (parentAffiliateId) {
        await this.createNetworkEntry(newAffiliate.id, parentAffiliateId);
      }

      return {
        id: newAffiliate.id,
        name: newAffiliate.name,
        email: newAffiliate.email,
        phone: newAffiliate.phone,
        referralCode: newAffiliate.referral_code,
        walletId: newAffiliate.wallet_id,
        status: newAffiliate.status,
        totalClicks: 0,
        totalConversions: 0,
        totalCommissions: 0,
        createdAt: newAffiliate.created_at
      };

    } catch (error) {
      console.error('Erro ao registrar afiliado:', error);
      throw error;
    }
  }

  /**
   * Valida Wallet ID do Asaas
   * Integração direta com API Asaas
   */
  async validateWallet(walletId: string): Promise<WalletValidation> {
    try {
      // 1. Validar formato UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(walletId)) {
        return {
          isValid: false,
          isActive: false,
          error: 'Wallet ID deve ser um UUID válido'
        };
      }

      // 2. Verificar cache primeiro
      const cached = await this.getCachedWalletValidation(walletId);
      if (cached && !this.isWalletCacheExpired(cached)) {
        return {
          isValid: cached.is_valid,
          isActive: cached.status === 'ACTIVE',
          name: cached.name,
          error: cached.is_valid ? undefined : 'Wallet ID inválida'
        };
      }

      // 3. Validar via API Asaas
      // NOTA: Por segurança, validação real deve ser feita via Edge Function
      // Por enquanto, simular validação para desenvolvimento
      const mockValidation = await this.mockWalletValidation(walletId);
      
      // 4. Atualizar cache
      await this.updateWalletCache(walletId, mockValidation);

      return mockValidation;

    } catch (error) {
      console.error('Erro ao validar wallet:', error);
      return {
        isValid: false,
        isActive: false,
        error: error instanceof Error ? error.message : 'Erro interno na validação'
      };
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

  /**
   * Gera código de referência único
   */
  private async generateUniqueReferralCode(): Promise<string> {
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const code = this.generateRandomCode();
      
      // Verificar se código já existe
      const { data } = await supabase
        .from('affiliates')
        .select('id')
        .eq('referral_code', code)
        .single();

      if (!data) {
        return code;
      }

      attempts++;
    }

    throw new Error('Não foi possível gerar código único');
  }

  /**
   * Gera código aleatório de 6 caracteres
   */
  private generateRandomCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Cria entrada na rede genealógica
   */
  private async createNetworkEntry(affiliateId: string, parentId: string): Promise<void> {
    try {
      // Buscar nível do pai
      const { data: parentNetwork } = await supabase
        .from('affiliate_network')
        .select('level')
        .eq('affiliate_id', parentId)
        .single();

      const level = parentNetwork ? parentNetwork.level + 1 : 1;

      // Criar entrada na rede
      const { error } = await supabase
        .from('affiliate_network')
        .insert({
          affiliate_id: affiliateId,
          parent_affiliate_id: parentId,
          level: Math.min(level, 3), // Máximo 3 níveis
          created_at: new Date().toISOString()
        });

      if (error) {
        console.warn('Erro ao criar entrada na rede:', error);
      }
    } catch (error) {
      console.warn('Erro ao processar rede genealógica:', error);
    }
  }

  /**
   * Busca validação de wallet no cache
   */
  private async getCachedWalletValidation(walletId: string) {
    try {
      const { data } = await supabase
        .from('asaas_wallets')
        .select('*')
        .eq('wallet_id', walletId)
        .single();

      return data;
    } catch (error) {
      return null;
    }
  }

  /**
   * Verifica se cache de wallet expirou (5 minutos)
   */
  private isWalletCacheExpired(cached: any): boolean {
    if (!cached.last_validated_at) return true;
    
    const lastValidated = new Date(cached.last_validated_at);
    const now = new Date();
    const diffMinutes = (now.getTime() - lastValidated.getTime()) / (1000 * 60);
    
    return diffMinutes > 5;
  }

  /**
   * Simulação de validação de wallet (desenvolvimento)
   * TODO: Substituir por Edge Function real
   */
  private async mockWalletValidation(walletId: string): Promise<WalletValidation> {
    // Simular delay de API
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Wallets válidas para teste
    const validWallets = [
      'f9c7d1dd-9e52-4e81-8194-8b666f276405', // RENUM
      '7c06e9d9-dbae-4a85-82f4-36716775bcb2', // JB
    ];

    const isValid = validWallets.includes(walletId) || walletId.length === 36;

    return {
      isValid,
      isActive: isValid,
      name: isValid ? 'Usuário Teste' : undefined,
      error: isValid ? undefined : 'Wallet ID não encontrada'
    };
  }

  /**
   * Atualiza cache de validação de wallet
   */
  private async updateWalletCache(walletId: string, validation: WalletValidation): Promise<void> {
    try {
      const cacheData = {
        wallet_id: walletId,
        name: validation.name || null,
        status: validation.isActive ? 'ACTIVE' : 'INACTIVE',
        last_validated_at: new Date().toISOString(),
        is_valid: validation.isValid
      };

      await supabase
        .from('asaas_wallets')
        .upsert(cacheData, { onConflict: 'wallet_id' });

    } catch (error) {
      console.warn('Erro ao atualizar cache de wallet:', error);
    }
  }
}

// Instância singleton
export const affiliateFrontendService = new AffiliateFrontendService();