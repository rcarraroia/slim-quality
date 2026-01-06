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
   * Gera link de indicação localmente (sem API)
   * Usa slug personalizado ou referral_code
   */
  async generateReferralLinkLocal(): Promise<{ link: string; qrCode: string; referralCode: string; slug?: string }> {
    try {
      // 1. Buscar dados do afiliado
      const { isAffiliate, affiliate } = await this.checkAffiliateStatus();
      
      if (!isAffiliate || !affiliate) {
        throw new Error('Afiliado não encontrado');
      }

      // 2. Buscar slug do banco
      const { data } = await supabase
        .from('affiliates')
        .select('slug, referral_code')
        .eq('id', affiliate.id)
        .is('deleted_at', null)
        .single();

      // 3. Usar slug se existir, senão usa referral_code
      const identifier = data?.slug || affiliate.referralCode;

      // 4. Montar link SIMPLIFICADO
      const baseUrl = window.location.origin;
      const link = `${baseUrl}/${identifier}`;

      // 5. Gerar QR Code
      const qrCode = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(link)}`;

      return {
        link,
        qrCode,
        referralCode: affiliate.referralCode,
        slug: data?.slug || undefined
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
   * Integração direta com Supabase
   */
  async getNetwork(): Promise<any> {
    try {
      // 1. Verificar se usuário está autenticado
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // 2. Buscar afiliado atual
      const { data: currentAffiliate } = await supabase
        .from('affiliates')
        .select('id, name')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .single();

      if (!currentAffiliate) {
        throw new Error('Afiliado não encontrado');
      }

      // 3. Buscar rede completa (3 níveis)
      const networkTree = await this.buildNetworkTree(currentAffiliate.id);

      return {
        success: true,
        data: networkTree
      };

    } catch (error) {
      console.error('Erro ao buscar rede:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro interno'
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
        .is('deleted_at', null)
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
          slug: affiliate.slug,  // ✅ NOVO
          walletId: affiliate.wallet_id,
          status: affiliate.status,
          totalClicks: affiliate.total_clicks,
          totalConversions: affiliate.total_conversions,
          totalCommissions: (affiliate.total_commissions_cents || 0) / 100,
          createdAt: affiliate.created_at,
          // Novos campos opcionais
          city: affiliate.city,
          state: affiliate.state,
          cep: affiliate.cep,
          birthDate: affiliate.birth_date
        }
      };
    } catch (error) {
      console.error('Erro ao verificar status de afiliado:', error);
      return { isAffiliate: false };
    }
  }

  /**
   * Rastreia clique em link de afiliado (melhorado)
   */
  async trackReferralClick(referralCode: string, utmParams?: any): Promise<void> {
    try {
      // Salvar código e UTMs no localStorage para rastreamento
      localStorage.setItem('referralCode', referralCode);
      localStorage.setItem('referralClickedAt', new Date().toISOString());
      
      if (utmParams) {
        localStorage.setItem('utmParams', JSON.stringify(utmParams));
      }

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
   */
  async getWithdrawals(page = 1, limit = 20) {
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

      // Buscar withdrawals (SEM JOIN com commissions - não há FK direto)
      const offset = (page - 1) * limit;
      const { data, error, count } = await supabase
        .from('withdrawals')
        .select('*', { count: 'exact' })
        .eq('affiliate_id', affiliate.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.warn('Erro ao buscar withdrawals:', error);
        // Retornar dados vazios se tabela não existir
        return {
          withdrawals: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0
          }
        };
      }

      return {
        withdrawals: data || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        }
      };
    } catch (error) {
      console.error('Erro ao buscar withdrawals:', error);
      // Retornar dados vazios em caso de erro
      return {
        withdrawals: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0
        }
      };
    }
  }
  private async buildNetworkTree(affiliateId: string): Promise<any[]> {
    try {
      // Buscar todos os afiliados da rede (3 níveis)
      const { data: networkData, error } = await supabase
        .from('affiliate_network')
        .select(`
          affiliate_id,
          parent_affiliate_id,
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
        .or(`parent_affiliate_id.eq.${affiliateId},affiliate_id.eq.${affiliateId}`)
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
        if (item.parent_affiliate_id === affiliateId) {
          rootNodes.push(affiliate);
        }
      });

      // Depois, organizar hierarquia
      networkData.forEach(item => {
        if (!item.affiliate || item.parent_affiliate_id === affiliateId) return;

        const child = affiliateMap.get(item.affiliate_id);
        const parent = affiliateMap.get(item.parent_affiliate_id);

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