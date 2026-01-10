/**
 * Serviço Frontend para Afiliados
 * Integração Frontend - Task 8: APIs REST
 */

import { supabase, supabaseUrl } from '@/config/supabase';
import { STORAGE_KEYS } from '@/constants/storage-keys';

export interface CreateAffiliateData {
  name: string;
  email: string;
  phone?: string;
  document?: string;
  // walletId: removido - será configurado posteriormente
  // referralCode: removido - tracking automático via link
}

export interface AffiliateData {
  id: string;
  name: string;
  email: string;
  phone?: string;
  referralCode: string;
  slug?: string;  // ✅ NOVO - Slug personalizado
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
        .is('deleted_at', null)
        .single();

      if (existingAffiliate) {
        throw new Error('Usuário já é afiliado');
      }

      // 3. Gerar código de referência único
      const referralCode = await this.generateUniqueReferralCode();

      // 4. Limpar documento (remover formatação)
      const cleanDocument = data.document ? data.document.replace(/\D/g, '') : null;

      // 5. Criar afiliado (sem wallet_id inicialmente)
      const affiliateData = {
        user_id: user.id,
        name: data.name,
        email: data.email,
        phone: data.phone,
        document: cleanDocument, // Documento limpo (apenas números)
        wallet_id: null, // Será configurado posteriormente
        referral_code: referralCode,
        status: 'pending', // Aguarda configuração de wallet
        total_clicks: 0,
        total_conversions: 0,
        total_commissions_cents: 0,
        onboarding_completed: false, // Novo campo para controle
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

      // 7. Criar entrada na rede genealógica (se houver código de referência)
      const savedReferralCode = this.getSavedReferralCode();
      if (savedReferralCode) {
        const parentAffiliateId = await this.getAffiliateIdByCode(savedReferralCode);
        if (parentAffiliateId) {
          await this.createNetworkEntry(newAffiliate.id, parentAffiliateId);
        }
      }

      return {
        id: newAffiliate.id,
        name: newAffiliate.name,
        email: newAffiliate.email,
        phone: newAffiliate.phone,
        referralCode: newAffiliate.referral_code,
        walletId: newAffiliate.wallet_id, // null inicialmente
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
   * Usa Edge Function para validação real via API Asaas
   */
  async validateWallet(walletId: string): Promise<WalletValidation> {
    try {
      // 1. Validar formato básico
      if (!walletId || typeof walletId !== 'string' || walletId.trim().length === 0) {
        return {
          isValid: false,
          isActive: false,
          error: 'Wallet ID é obrigatório'
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

      // 3. Chamar Edge Function para validação real
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${supabaseUrl}/functions/v1/validate-asaas-wallet`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token || ''}`
          },
          body: JSON.stringify({ walletId })
        }
      );

      if (!response.ok) {
        throw new Error(`Erro na validação: ${response.status}`);
      }

      const result = await response.json();
      
      // 4. Atualizar cache
      await this.updateWalletCache(walletId, {
        isValid: result.valid,
        isActive: result.active || false,
        name: result.name,
        error: result.error
      });

      return {
        isValid: result.valid,
        isActive: result.active || false,
        name: result.name,
        error: result.error
      };

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
   * Busca dados diretamente do Supabase
   */
  async getDashboard(): Promise<DashboardData> {
    try {
      // Buscar usuário autenticado
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // Buscar dados do afiliado
      const { data: affiliateData, error: affiliateError } = await supabase
        .from('affiliates')
        .select('*')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .single();

      if (affiliateError || !affiliateData) {
        throw new Error('Afiliado não encontrado');
      }

      // Buscar rede do afiliado
      const { data: networkData } = await supabase
        .from('affiliate_network')
        .select(`
          affiliate_id,
          level,
          affiliates!affiliate_network_affiliate_id_fkey (
            id,
            name,
            email,
            status,
            total_commissions_cents,
            created_at
          )
        `)
        .eq('parent_id', affiliateData.id);

      // Buscar comissões recentes
      const { data: commissionsData } = await supabase
        .from('commissions')
        .select(`
          id,
          commission_value_cents,
          level,
          status,
          created_at,
          paid_at,
          order_id,
          orders (
            id,
            total_cents,
            status,
            customers (name)
          )
        `)
        .eq('affiliate_id', affiliateData.id)
        .order('created_at', { ascending: false })
        .limit(10);

      // Mapear dados do afiliado
      const affiliate: AffiliateData = {
        id: affiliateData.id,
        name: affiliateData.name,
        email: affiliateData.email,
        phone: affiliateData.phone,
        referralCode: affiliateData.referral_code,
        slug: affiliateData.slug,
        walletId: affiliateData.wallet_id,
        status: affiliateData.status,
        totalClicks: affiliateData.total_clicks || 0,
        totalConversions: affiliateData.total_conversions || 0,
        totalCommissions: (affiliateData.total_commissions_cents || 0) / 100,
        createdAt: affiliateData.created_at
      };

      // Calcular estatísticas
      const stats: AffiliateStats = {
        totalClicks: affiliateData.total_clicks || 0,
        totalConversions: affiliateData.total_conversions || 0,
        totalCommissions: (affiliateData.total_commissions_cents || 0) / 100,
        conversionRate: affiliateData.total_clicks > 0 
          ? ((affiliateData.total_conversions || 0) / affiliateData.total_clicks * 100)
          : 0,
        avgCommission: affiliateData.total_conversions > 0
          ? ((affiliateData.total_commissions_cents || 0) / 100) / affiliateData.total_conversions
          : 0
      };

      // Mapear rede
      const network = (networkData || []).map((item: any) => ({
        id: item.affiliates?.id,
        name: item.affiliates?.name,
        email: item.affiliates?.email,
        level: item.level,
        status: item.affiliates?.status,
        totalCommissions: (item.affiliates?.total_commissions_cents || 0) / 100,
        createdAt: item.affiliates?.created_at
      })).filter((n: any) => n.id);

      // Mapear comissões
      const commissions = (commissionsData || []).map((c: any) => ({
        id: c.id,
        amount_cents: c.commission_value_cents || 0,
        level: c.level,
        status: c.status,
        created_at: c.created_at,
        paid_at: c.paid_at,
        order: c.orders ? {
          id: c.orders.id,
          total_cents: c.orders.total_cents,
          status: c.orders.status,
          customer_name: c.orders.customers?.name || 'Cliente'
        } : null
      }));

      // Gerar link de indicação
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://slimquality.com.br';
      const identifier = affiliateData.slug || affiliateData.referral_code;
      const referralLink = `${baseUrl}/${identifier}`;

      return {
        affiliate,
        stats,
        network,
        commissions,
        referralLink
      };

    } catch (error) {
      console.error('Erro ao buscar dashboard:', error);
      throw error;
    }
  }

  /**
   * Gera link de indicação localmente (sem API)
   * Usa slug personalizado ou referral_code
   */
  async generateReferralLinkLocal(): Promise<{ link: string; qrCode: string; referralCode: string; slug?: string }> {
    try {
      // 1. Buscar dados do afiliado autenticado
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // 2. Buscar slug e referral_code DIRETAMENTE do banco (sempre atualizado)
      const { data, error } = await supabase
        .from('affiliates')
        .select('slug, referral_code')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .single();

      if (error || !data) {
        throw new Error('Afiliado não encontrado');
      }

      // 3. Usar slug se existir, senão usa referral_code
      const identifier = data.slug || data.referral_code;

      // 4. Montar link SIMPLIFICADO
      const baseUrl = window.location.origin;
      const link = `${baseUrl}/${identifier}`;

      // 5. Gerar QR Code
      const qrCode = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(link)}`;

      return {
        link,
        qrCode,
        referralCode: data.referral_code,
        slug: data.slug || undefined
      };

    } catch (error) {
      console.error('Erro ao gerar link local:', error);
      throw error;
    }
  }

  /**
   * Busca link de indicação do afiliado
   * Tenta API primeiro, fallback para geração local
   */
  async getReferralLink(): Promise<{ link: string; qrCode: string; referralCode: string; slug?: string }> {
    try {
      // Tentar API primeiro
      const response = await fetch(`${this.baseUrl}/referral-link`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        return result.data;
      }

      // Se API falhar, gerar localmente
      console.warn('API não disponível, gerando link localmente');
      return await this.generateReferralLinkLocal();

    } catch (error) {
      console.error('Erro ao buscar link, gerando localmente:', error);
      // Fallback: gerar localmente
      return await this.generateReferralLinkLocal();
    }
  }

  /**
   * Valida disponibilidade de slug
   */
  async checkSlugAvailability(slug: string): Promise<{ available: boolean; message: string }> {
    try {
      // Validar formato
      const slugRegex = /^[a-z0-9-]+$/;
      if (!slugRegex.test(slug)) {
        return {
          available: false,
          message: 'Use apenas letras minúsculas, números e hífen'
        };
      }

      // Verificar se já existe
      const { data } = await supabase
        .from('affiliates')
        .select('id')
        .eq('slug', slug)
        .is('deleted_at', null)
        .single();

      if (data) {
        return {
          available: false,
          message: 'Este slug já está em uso'
        };
      }

      return {
        available: true,
        message: 'Slug disponível!'
      };

    } catch (error) {
      // Se não encontrou, está disponível
      return {
        available: true,
        message: 'Slug disponível!'
      };
    }
  }

  /**
   * Atualiza slug do afiliado
   */
  async updateSlug(slug: string | null): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Se slug vazio, setar como null
      const cleanSlug = slug?.trim() || null;

      const { error } = await supabase
        .from('affiliates')
        .update({
          slug: cleanSlug,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .is('deleted_at', null);

      if (error) {
        throw new Error(`Erro ao atualizar slug: ${error.message}`);
      }

    } catch (error) {
      console.error('Erro ao atualizar slug:', error);
      throw error;
    }
  }

  /**
   * Busca rede do afiliado
   * Task 3.3: Usa view materializada affiliate_hierarchy
   */
  async getNetwork(): Promise<any> {
    try {
      // Buscar usuário autenticado
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // Buscar dados do afiliado atual
      const { data: currentAffiliate, error: affiliateError } = await supabase
        .from('affiliates')
        .select('*')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .single();

      if (affiliateError || !currentAffiliate) {
        throw new Error('Afiliado não encontrado');
      }

      // ✅ NOVO: Buscar rede usando view materializada affiliate_hierarchy
      const { data: hierarchyData, error: hierarchyError } = await supabase
        .from('affiliate_hierarchy')
        .select('*')
        .eq('root_id', currentAffiliate.id)
        .order('level', { ascending: true });

      if (hierarchyError) {
        console.error('Erro ao buscar hierarquia:', hierarchyError);
      }

      // Construir árvore hierárquica a partir da view
      const networkTree = this.buildTreeFromHierarchy(hierarchyData || [], currentAffiliate.id);

      // Calcular estatísticas por nível
      const stats = {
        totalN1: (hierarchyData || []).filter(n => n.level === 1).length,
        totalN2: (hierarchyData || []).filter(n => n.level === 2).length,
        totalN3: (hierarchyData || []).filter(n => n.level === 3).length,
        totalCommissions: (currentAffiliate.total_commissions_cents || 0) / 100,
        totalReferrals: (hierarchyData || []).length,
        conversionRate: currentAffiliate.total_clicks > 0 
          ? ((currentAffiliate.total_conversions || 0) / currentAffiliate.total_clicks * 100).toFixed(1)
          : 0
      };

      // Retornar no formato esperado pelo componente MinhaRede
      return {
        success: true,
        data: networkTree,
        affiliate: {
          id: currentAffiliate.id,
          name: currentAffiliate.name,
          email: currentAffiliate.email,
          level: 0,
          referralCode: currentAffiliate.referral_code,
          totalCommissions: (currentAffiliate.total_commissions_cents || 0) / 100
        },
        stats
      };

    } catch (error) {
      console.error('Erro ao buscar rede:', error);
      // Retornar estrutura de erro
      return {
        success: false,
        data: [],
        affiliate: null,
        stats: {
          totalN1: 0,
          totalN2: 0,
          totalN3: 0,
          totalCommissions: 0,
          totalReferrals: 0,
          conversionRate: 0
        }
      };
    }
  }

  /**
   * Alias para compatibilidade com o frontend existente
   */
  async getMyNetwork(): Promise<any> {
    return this.getNetwork();
  }

  /**
   * Busca comissões do afiliado (alias para compatibilidade)
   */
  async getMyCommissions(page = 1, limit = 20) {
    return this.getCommissions(page, limit);
  }

  /**
   * Busca comissões do afiliado
   * Busca dados reais do banco de dados
   */
  async getCommissions(page = 1, limit = 20) {
    try {
      // Buscar usuário autenticado
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // Buscar afiliado
      const { data: affiliate } = await supabase
        .from('affiliates')
        .select('id')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .single();

      if (!affiliate) {
        return {
          commissions: [],
          pagination: { page, limit, total: 0, totalPages: 0 },
          summary: { totalPaid: 0, totalPending: 0, totalCommissions: 0 }
        };
      }

      // Buscar comissões com paginação
      const offset = (page - 1) * limit;
      
      const { data: commissions, error, count } = await supabase
        .from('commissions')
        .select(`
          id,
          commission_value_cents,
          level,
          status,
          created_at,
          paid_at,
          order_id,
          orders (
            id,
            total_cents,
            status,
            customers (name)
          )
        `, { count: 'exact' })
        .eq('affiliate_id', affiliate.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Erro ao buscar comissões:', error);
      }

      // Mapear comissões
      const mappedCommissions = (commissions || []).map((c: any) => ({
        id: c.id,
        amount: (c.commission_value_cents || 0) / 100,
        type: `N${c.level || 1}`,
        status: c.status,
        createdAt: c.created_at,
        paidAt: c.paid_at,
        order: c.orders ? {
          id: c.orders.id,
          total_cents: c.orders.total_cents,
          status: c.orders.status,
          customer_name: c.orders.customers?.name || 'Cliente'
        } : null
      }));

      // Calcular totais
      const totalPaid = mappedCommissions
        .filter(c => c.status === 'paid')
        .reduce((sum, c) => sum + c.amount, 0);
      
      const totalPending = mappedCommissions
        .filter(c => c.status === 'pending')
        .reduce((sum, c) => sum + c.amount, 0);

      return {
        commissions: mappedCommissions,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        },
        summary: {
          totalPaid,
          totalPending,
          totalCommissions: totalPaid + totalPending
        }
      };
    } catch (error) {
      console.error('Erro ao buscar comissões:', error);
      return {
        commissions: [],
        pagination: { page, limit, total: 0, totalPages: 0 },
        summary: { totalPaid: 0, totalPending: 0, totalCommissions: 0 }
      };
    }
  }

  /**
   * Verifica se usuário atual é afiliado
   * Busca dados reais do banco de dados
   */
  async checkAffiliateStatus(): Promise<{ isAffiliate: boolean; affiliate?: AffiliateData }> {
    try {
      // Buscar usuário autenticado
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { isAffiliate: false };
      }

      // Buscar afiliado pelo user_id
      const { data: affiliateData, error } = await supabase
        .from('affiliates')
        .select('*')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .single();

      if (error || !affiliateData) {
        return { isAffiliate: false };
      }

      const affiliate: AffiliateData = {
        id: affiliateData.id,
        name: affiliateData.name,
        email: affiliateData.email,
        phone: affiliateData.phone,
        referralCode: affiliateData.referral_code,
        slug: affiliateData.slug,
        walletId: affiliateData.wallet_id,
        status: affiliateData.status,
        totalClicks: affiliateData.total_clicks || 0,
        totalConversions: affiliateData.total_conversions || 0,
        totalCommissions: (affiliateData.total_commissions_cents || 0) / 100,
        createdAt: affiliateData.created_at
      };

      return {
        isAffiliate: true,
        affiliate
      };
    } catch (error) {
      console.error('Erro ao verificar status de afiliado:', error);
      return { 
        isAffiliate: false,
        affiliate: undefined
      };
    }
  }

  /**
   * Rastreia clique em link de afiliado (melhorado)
   * Task 3.1: Salva em formato JSON com timestamp e expiração
   */
  async trackReferralClick(referralCode: string, utmParams?: any): Promise<void> {
    try {
      // Salvar código em formato JSON estruturado
      const referralData = {
        code: referralCode,
        timestamp: Date.now(),
        expiry: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 dias
        utmParams: utmParams || {}
      };
      
      localStorage.setItem(STORAGE_KEYS.REFERRAL_CODE, JSON.stringify(referralData));

      // Registrar clique no banco
      const { error } = await supabase
        .from('referral_clicks')
        .insert({
          referral_code: referralCode,
          affiliate_id: await this.getAffiliateIdByCode(referralCode),
          ip_address: await this.getClientIP(),
          user_agent: navigator.userAgent,
          referer: document.referrer,
          utm_source: utmParams?.utm_source || null,
          utm_medium: utmParams?.utm_medium || null,
          utm_campaign: utmParams?.utm_campaign || null,
          utm_content: utmParams?.utm_content || null,
          utm_term: utmParams?.utm_term || null,
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
   * Captura parâmetros de tracking da URL atual
   */
  captureTrackingParams(): { referralCode?: string; utmParams?: any } {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      
      const referralCode = urlParams.get('ref');
      const utmParams = {
        utm_source: urlParams.get('utm_source'),
        utm_medium: urlParams.get('utm_medium'),
        utm_campaign: urlParams.get('utm_campaign'),
        utm_content: urlParams.get('utm_content'),
        utm_term: urlParams.get('utm_term')
      };

      // Filtrar UTMs vazios
      const filteredUtmParams = Object.fromEntries(
        Object.entries(utmParams).filter(([_, value]) => value !== null)
      );

      return {
        referralCode: referralCode || undefined,
        utmParams: Object.keys(filteredUtmParams).length > 0 ? filteredUtmParams : undefined
      };
    } catch (error) {
      console.warn('Erro ao capturar parâmetros de tracking:', error);
      return {};
    }
  }

  /**
   * Inicializa tracking automático (chamar no carregamento da página)
   */
  async initializeTracking(): Promise<void> {
    try {
      const { referralCode, utmParams } = this.captureTrackingParams();
      
      if (referralCode) {
        await this.trackReferralClick(referralCode, utmParams);
        
        // Limpar parâmetros da URL sem recarregar a página
        const url = new URL(window.location.href);
        url.searchParams.delete('ref');
        url.searchParams.delete('utm_source');
        url.searchParams.delete('utm_medium');
        url.searchParams.delete('utm_campaign');
        url.searchParams.delete('utm_content');
        url.searchParams.delete('utm_term');
        
        window.history.replaceState({}, document.title, url.toString());
      }
    } catch (error) {
      console.warn('Erro ao inicializar tracking:', error);
    }
  }

  /**
   * Registra conversão (venda) automaticamente
   */
  async trackConversion(orderId: string, orderValue: number): Promise<void> {
    try {
      const referralCode = this.getSavedReferralCode();
      if (!referralCode) return;

      const clickedAt = localStorage.getItem('referralClickedAt');
      const utmParams = localStorage.getItem('utmParams');

      // Registrar conversão
      const { error } = await supabase
        .from('referral_conversions')
        .insert({
          referral_code: referralCode,
          affiliate_id: await this.getAffiliateIdByCode(referralCode),
          order_id: orderId,
          order_value_cents: Math.round(orderValue * 100),
          utm_source: utmParams ? JSON.parse(utmParams).utm_source : null,
          utm_medium: utmParams ? JSON.parse(utmParams).utm_medium : null,
          utm_campaign: utmParams ? JSON.parse(utmParams).utm_campaign : null,
          clicked_at: clickedAt,
          converted_at: new Date().toISOString()
        });

      if (error) {
        console.warn('Erro ao registrar conversão:', error);
      } else {
        // Limpar dados de tracking após conversão
        this.clearReferralCode();
      }
    } catch (error) {
      console.warn('Erro ao rastrear conversão:', error);
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
   * Task 3.1: Valida expiração de 30 dias
   */
  getSavedReferralCode(): string | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.REFERRAL_CODE);
      if (!stored) return null;

      // Tentar parsear como JSON (novo formato)
      try {
        const referralData = JSON.parse(stored);
        
        // Validar expiração
        if (Date.now() > referralData.expiry) {
          this.clearReferralCode();
          return null;
        }
        
        return referralData.code;
      } catch {
        // Formato antigo (string simples) - manter compatibilidade
        return stored;
      }
    } catch (error) {
      console.warn('Erro ao recuperar código de referência:', error);
      return null;
    }
  }

  /**
   * Remove código de referência salvo
   * Task 3.1: Limpa dados de rastreamento
   */
  clearReferralCode(): void {
    localStorage.removeItem(STORAGE_KEYS.REFERRAL_CODE);
    localStorage.removeItem('referralClickedAt');
    localStorage.removeItem('utmParams');
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
          parent_id: parentId,
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

  /**
   * Busca todos os afiliados (para dashboard administrativo)
   */
  async getAllAffiliates(): Promise<any> {
    try {
      // Buscar todos os afiliados com informações básicas
      const { data: affiliates, error } = await supabase
        .from('affiliates')
        .select(`
          id,
          name,
          email,
          phone,
          document,
          wallet_id,
          referral_code,
          status,
          total_clicks,
          total_conversions,
          total_commissions_cents,
          created_at,
          updated_at
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Erro ao buscar afiliados: ${error.message}`);
      }

      // Mapear dados para o formato esperado pelo frontend
      const mappedAffiliates = (affiliates || []).map(affiliate => ({
        id: affiliate.id,
        name: affiliate.name,
        email: affiliate.email,
        phone: affiliate.phone || '',
        city: 'N/A', // TODO: Adicionar campo cidade se necessário
        created_at: affiliate.created_at,
        status: affiliate.status,
        level: 1, // TODO: Calcular nível real na rede
        available_balance: (affiliate.total_commissions_cents || 0) / 100,
        pending_balance: 0, // TODO: Calcular saldo pendente
        pix_key: affiliate.wallet_id
      }));

      return {
        success: true,
        data: mappedAffiliates
      };

    } catch (error) {
      console.error('Erro ao buscar todos os afiliados:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro interno'
      };
    }
  }

  /**
   * Busca histórico de recebimentos/withdrawals do afiliado
   * TEMPORÁRIO: Mock data até implementar autenticação de afiliados
   */
  async getWithdrawals(page = 1, limit = 20) {
    try {
      console.log('🔄 Usando mock data para withdrawals de afiliados');
      
      // Simular delay de API
      await new Promise(resolve => setTimeout(resolve, 400));
      
      // Mock com formato correto (amount_cents e created_at)
      const mockWithdrawals = [
        {
          id: 'with-1',
          amount_cents: 150000,
          status: 'completed',
          method: 'pix',
          created_at: '2026-01-01T10:00:00Z',
          processed_at: '2026-01-01T14:30:00Z',
          wallet_id: 'cd912fa1-5fa4-4d49-92eb-b5ab4dfba961',
          description: 'Saque de comissões - Dezembro 2025',
          commission: {
            level: 1,
            order: { id: 'ord-001', customer_name: 'João Silva' }
          }
        },
        {
          id: 'with-2',
          amount_cents: 75050,
          status: 'processing',
          method: 'pix',
          created_at: '2025-12-28T16:20:00Z',
          wallet_id: 'cd912fa1-5fa4-4d49-92eb-b5ab4dfba961',
          description: 'Saque de comissões - Semana 52',
          commission: {
            level: 1,
            order: { id: 'ord-002', customer_name: 'Maria Santos' }
          }
        },
        {
          id: 'with-3',
          amount_cents: 225075,
          status: 'completed',
          method: 'pix',
          created_at: '2025-12-15T09:15:00Z',
          processed_at: '2025-12-15T11:45:00Z',
          wallet_id: 'cd912fa1-5fa4-4d49-92eb-b5ab4dfba961',
          description: 'Saque de comissões - Novembro 2025',
          commission: {
            level: 2,
            order: { id: 'ord-003', customer_name: 'Pedro Oliveira' }
          }
        },
        {
          id: 'with-4',
          amount_cents: 89025,
          status: 'rejected',
          method: 'pix',
          created_at: '2025-12-10T14:30:00Z',
          rejected_at: '2025-12-10T16:00:00Z',
          wallet_id: 'cd912fa1-5fa4-4d49-92eb-b5ab4dfba961',
          description: 'Saque de comissões - Semana 49',
          rejection_reason: 'Dados bancários inválidos',
          commission: {
            level: 1,
            order: { id: 'ord-004', customer_name: 'Ana Costa' }
          }
        }
      ];

      return {
        withdrawals: mockWithdrawals,
        pagination: {
          page,
          limit,
          total: mockWithdrawals.length,
          totalPages: Math.ceil(mockWithdrawals.length / limit)
        },
        summary: {
          totalCompleted: mockWithdrawals.filter(w => w.status === 'completed').reduce((sum, w) => sum + w.amount_cents, 0),
          totalPending: mockWithdrawals.filter(w => w.status === 'processing').reduce((sum, w) => sum + w.amount_cents, 0),
          totalRejected: mockWithdrawals.filter(w => w.status === 'rejected').reduce((sum, w) => sum + w.amount_cents, 0)
        }
      };
    } catch (error) {
      console.error('Erro ao buscar withdrawals:', error);
      throw new Error('Erro ao carregar histórico de saques');
    }
  }
  /**
   * Constrói árvore hierárquica a partir da view affiliate_hierarchy
   * Task 3.3: Método auxiliar para organizar dados da view em árvore
   */
  private buildTreeFromHierarchy(hierarchyData: any[], rootId: string): any[] {
    if (!hierarchyData || hierarchyData.length === 0) return [];

    // Criar mapa de afiliados por ID
    const affiliateMap = new Map();
    
    hierarchyData.forEach(item => {
      affiliateMap.set(item.id, {
        id: item.id,
        name: item.name,
        email: item.email,
        level: item.level,
        sales_count: 0, // TODO: Adicionar na view se necessário
        commission_generated: 0, // TODO: Adicionar na view se necessário
        status: item.status,
        created_at: item.created_at,
        children: []
      });
    });

    // Organizar hierarquia usando o campo path da view
    const rootNodes: any[] = [];
    
    hierarchyData.forEach(item => {
      const affiliate = affiliateMap.get(item.id);
      if (!affiliate) return;

      // Se é nível 1 (filho direto da raiz), adicionar como root node
      if (item.level === 1) {
        rootNodes.push(affiliate);
      } else {
        // Encontrar pai usando o path (penúltimo elemento é o pai)
        const parentId = item.path[item.path.length - 2];
        const parent = affiliateMap.get(parentId);
        
        if (parent) {
          parent.children.push(affiliate);
        }
      }
    });

    return rootNodes;
  }

  private async buildNetworkTree(affiliateId: string): Promise<any[]> {
    try {
      // Buscar todos os afiliados da rede (3 níveis)
      const { data: networkData, error } = await supabase
        .from('affiliate_network')
        .select(`
          affiliate_id,
          parent_id,
          level,
          affiliate:affiliates!affiliate_network_affiliate_id_fkey (
            id,
            name,
            email,
            status,
            total_conversions,
            total_commissions_cents,
            created_at
          )
        `)
        .or(`parent_id.eq.${affiliateId},affiliate_id.eq.${affiliateId}`)
        .is('affiliate.deleted_at', null)
        .order('level', { ascending: true });

      if (error) {
        console.warn('Erro ao buscar rede:', error);
        return [];
      }

      if (!networkData || networkData.length === 0) {
        return [];
      }

      // Organizar em estrutura hierárquica
      const affiliateMap = new Map();
      const rootNodes: any[] = [];

      // Primeiro, criar mapa de todos os afiliados
      networkData.forEach(item => {
        if (!item.affiliate) return;

        const affiliateData = Array.isArray(item.affiliate) ? item.affiliate[0] : item.affiliate;
        
        const affiliate = {
          id: affiliateData.id,
          name: affiliateData.name,
          email: affiliateData.email,
          level: item.level,
          sales_count: affiliateData.total_conversions || 0,
          commission_generated: (affiliateData.total_commissions_cents || 0) / 100,
          status: affiliateData.status,
          created_at: affiliateData.created_at,
          children: []
        };

        affiliateMap.set(item.affiliate_id, affiliate);

        // Se é filho direto do afiliado atual, adicionar como raiz
        if (item.parent_id === affiliateId) {
          rootNodes.push(affiliate);
        }
      });

      // Depois, organizar hierarquia
      networkData.forEach(item => {
        if (!item.affiliate || item.parent_id === affiliateId) return;

        const child = affiliateMap.get(item.affiliate_id);
        const parent = affiliateMap.get(item.parent_id);

        if (child && parent) {
          parent.children.push(child);
        }
      });

      return rootNodes;

    } catch (error) {
      console.error('Erro ao construir árvore da rede:', error);
      return [];
    }
  }
}

// Instância singleton
export const affiliateFrontendService = new AffiliateFrontendService();