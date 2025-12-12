/**
 * Serviço principal para gestão de afiliados
 * Task 3.1: Criar AffiliateService base
 */

import { supabase } from '@/config/supabase';
import { walletValidator, WalletValidation } from '@/services/asaas/wallet-validator.service';

export interface CreateAffiliateRequest {
  name: string;
  email: string;
  phone?: string;
  document?: string;
  walletId: string;
  referralCode?: string; // Código de quem indicou
}

export interface Affiliate {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone?: string;
  document?: string;
  referralCode: string;
  walletId: string;
  walletValidatedAt?: string;
  status: 'pending' | 'active' | 'inactive' | 'suspended' | 'rejected';
  approvedBy?: string;
  approvedAt?: string;
  totalClicks: number;
  totalConversions: number;
  totalCommissions: number;
  createdAt: string;
  updatedAt: string;
}

export interface AffiliateStats {
  totalClicks: number;
  totalConversions: number;
  totalCommissions: number;
  conversionRate: number;
  avgCommission: number;
  lastConversionAt?: string;
}

export interface NetworkTree {
  affiliate: Affiliate;
  children: NetworkTree[];
  level: number;
  path: string;
}

export class AffiliateService {
  /**
   * Cria novo afiliado com validações completas
   * Task 3.1: Implementar createAffiliate() com validações completas
   */
  async createAffiliate(data: CreateAffiliateRequest, userId: string): Promise<Affiliate> {
    try {
      // 1. Validar Wallet ID via Asaas
      const walletValidation = await walletValidator.validateWallet(data.walletId);
      if (!walletValidation.isValid) {
        throw new Error(`Wallet ID inválida: ${walletValidation.error}`);
      }

      if (!walletValidation.isActive) {
        throw new Error('Wallet ID não está ativa no Asaas');
      }

      // 2. Verificar se email já existe
      const { data: existingAffiliate } = await supabase
        .from('affiliates')
        .select('id')
        .eq('email', data.email)
        .eq('deleted_at', null)
        .single();

      if (existingAffiliate) {
        throw new Error('Email já cadastrado como afiliado');
      }

      // 3. Verificar se Wallet ID já existe
      const { data: existingWallet } = await supabase
        .from('affiliates')
        .select('id')
        .eq('wallet_id', data.walletId)
        .eq('deleted_at', null)
        .single();

      if (existingWallet) {
        throw new Error('Wallet ID já cadastrada por outro afiliado');
      }

      // 4. Gerar código de indicação único
      const referralCode = await this.generateReferralCode();

      // 5. Criar afiliado
      const affiliateData = {
        user_id: userId,
        name: data.name,
        email: data.email,
        phone: data.phone,
        document: data.document,
        referral_code: referralCode,
        wallet_id: data.walletId,
        wallet_validated_at: new Date().toISOString(),
        status: 'pending' as const
      };

      const { data: newAffiliate, error } = await supabase
        .from('affiliates')
        .insert(affiliateData)
        .select()
        .single();

      if (error) {
        throw new Error(`Erro ao criar afiliado: ${error.message}`);
      }

      // 6. Construir rede genealógica se há código de indicação
      if (data.referralCode) {
        await this.buildNetwork(newAffiliate.id, data.referralCode);
      }

      return this.mapAffiliateFromDB(newAffiliate);

    } catch (error) {
      console.error('Erro ao criar afiliado:', error);
      throw error;
    }
  }

  /**
   * Gera código de indicação único
   * Task 3.1: Implementar generateReferralCode() único
   */
  async generateReferralCode(): Promise<string> {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let attempts = 0;
    const maxAttempts = 100;

    while (attempts < maxAttempts) {
      let code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      // Verificar se código já existe
      const { data } = await supabase
        .from('affiliates')
        .select('id')
        .eq('referral_code', code)
        .eq('deleted_at', null)
        .single();

      if (!data) {
        return code;
      }

      attempts++;
    }

    throw new Error('Não foi possível gerar código único após 100 tentativas');
  }

  /**
   * Busca afiliado por código de indicação
   * Task 3.1: Implementar getAffiliateByCode() otimizado
   */
  async getAffiliateByCode(code: string): Promise<Affiliate | null> {
    try {
      const { data, error } = await supabase
        .from('affiliates')
        .select('*')
        .eq('referral_code', code.toUpperCase())
        .eq('deleted_at', null)
        .single();

      if (error || !data) {
        return null;
      }

      return this.mapAffiliateFromDB(data);
    } catch (error) {
      console.error('Erro ao buscar afiliado por código:', error);
      return null;
    }
  }

  /**
   * Busca estatísticas do afiliado
   * Task 3.1: Implementar getAffiliateStats() com métricas
   */
  async getAffiliateStats(affiliateId: string): Promise<AffiliateStats> {
    try {
      // Usar função SQL otimizada
      const { data, error } = await supabase
        .rpc('get_affiliate_stats', { affiliate_uuid: affiliateId });

      if (error) {
        throw new Error(`Erro ao buscar estatísticas: ${error.message}`);
      }

      const stats = data[0] || {};

      return {
        totalClicks: Number(stats.total_clicks) || 0,
        totalConversions: Number(stats.total_conversions) || 0,
        totalCommissions: Number(stats.total_commissions_cents) / 100 || 0,
        conversionRate: Number(stats.conversion_rate) || 0,
        avgCommission: Number(stats.avg_commission_cents) / 100 || 0,
        lastConversionAt: stats.last_conversion_at
      };
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      return {
        totalClicks: 0,
        totalConversions: 0,
        totalCommissions: 0,
        conversionRate: 0,
        avgCommission: 0
      };
    }
  }

  /**
   * Constrói rede genealógica
   * Task 3.2: Implementar buildNetwork() para vincular afiliados
   */
  async buildNetwork(affiliateId: string, parentReferralCode: string): Promise<void> {
    try {
      // 1. Buscar afiliado pai pelo código
      const parentAffiliate = await this.getAffiliateByCode(parentReferralCode);
      if (!parentAffiliate) {
        throw new Error('Código de indicação não encontrado');
      }

      // 2. Verificar se pai está ativo
      if (parentAffiliate.status !== 'active') {
        throw new Error('Afiliado indicador não está ativo');
      }

      // 3. Verificar se não criaria loop
      const wouldCreateLoop = await this.wouldCreateLoop(affiliateId, parentAffiliate.id);
      if (wouldCreateLoop) {
        throw new Error('Vinculação criaria loop na rede');
      }

      // 4. Criar entrada na rede
      const { error } = await supabase
        .from('affiliate_network')
        .insert({
          affiliate_id: affiliateId,
          parent_id: parentAffiliate.id
        });

      if (error) {
        throw new Error(`Erro ao criar rede: ${error.message}`);
      }

    } catch (error) {
      console.error('Erro ao construir rede:', error);
      throw error;
    }
  }

  /**
   * Verifica se vinculação criaria loop
   * Task 3.2: Implementar validateNetworkIntegrity() para detectar loops
   */
  private async wouldCreateLoop(affiliateId: string, parentId: string): Promise<boolean> {
    try {
      // Verificar se o parentId é descendente do affiliateId
      const { data, error } = await supabase
        .rpc('get_network_ancestors', { affiliate_uuid: parentId });

      if (error) {
        console.warn('Erro ao verificar loop:', error);
        return false; // Em caso de erro, permitir (será validado pelo trigger)
      }

      // Se affiliateId está entre os ancestrais de parentId, seria loop
      return data?.some((ancestor: any) => ancestor.affiliate_id === affiliateId) || false;

    } catch (error) {
      console.warn('Erro ao verificar loop:', error);
      return false;
    }
  }

  /**
   * Busca árvore genealógica do afiliado
   * Task 3.2: Implementar getNetworkTree() com estrutura hierárquica
   */
  async getNetworkTree(affiliateId: string): Promise<NetworkTree | null> {
    try {
      const { data, error } = await supabase
        .rpc('get_network_tree', { 
          root_affiliate_id: affiliateId,
          max_levels: 3 
        });

      if (error || !data || data.length === 0) {
        return null;
      }

      return this.buildTreeStructure(data);
    } catch (error) {
      console.error('Erro ao buscar árvore:', error);
      return null;
    }
  }

  /**
   * Busca rede direta do afiliado (apenas filhos diretos)
   * Task 3.2: Implementar getMyNetwork() para dashboard
   */
  async getMyNetwork(affiliateId: string): Promise<Affiliate[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_direct_children', { parent_affiliate_id: affiliateId });

      if (error || !data) {
        return [];
      }

      return data.map((child: any) => ({
        id: child.affiliate_id,
        userId: '', // Não necessário para listagem
        name: child.name,
        email: '', // Não expor email na listagem
        referralCode: child.referral_code,
        walletId: '', // Não expor wallet na listagem
        status: child.status,
        totalClicks: 0,
        totalConversions: child.total_conversions || 0,
        totalCommissions: 0,
        createdAt: child.created_at,
        updatedAt: child.created_at
      }));
    } catch (error) {
      console.error('Erro ao buscar rede:', error);
      return [];
    }
  }

  /**
   * Busca afiliado por ID
   */
  async getById(affiliateId: string): Promise<Affiliate | null> {
    try {
      const { data, error } = await supabase
        .from('affiliates')
        .select('*')
        .eq('id', affiliateId)
        .eq('deleted_at', null)
        .single();

      if (error || !data) {
        return null;
      }

      return this.mapAffiliateFromDB(data);
    } catch (error) {
      console.error('Erro ao buscar afiliado:', error);
      return null;
    }
  }

  /**
   * Atualiza status do afiliado
   */
  async updateStatus(
    affiliateId: string, 
    status: Affiliate['status'], 
    adminId: string
  ): Promise<Affiliate> {
    try {
      const { data, error } = await supabase
        .from('affiliates')
        .update({
          status,
          approved_by: status === 'active' ? adminId : null,
          approved_at: status === 'active' ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', affiliateId)
        .select()
        .single();

      if (error) {
        throw new Error(`Erro ao atualizar status: ${error.message}`);
      }

      return this.mapAffiliateFromDB(data);
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      throw error;
    }
  }

  /**
   * Constrói estrutura de árvore a partir dos dados do banco
   */
  private buildTreeStructure(data: any[]): NetworkTree {
    const root = data[0];
    
    const tree: NetworkTree = {
      affiliate: this.mapAffiliateFromDB(root),
      children: [],
      level: root.level,
      path: root.path
    };

    // Construir filhos recursivamente
    const children = data.filter(item => item.parent_id === root.affiliate_id);
    tree.children = children.map(child => this.buildTreeStructure(
      data.filter(item => item.path.startsWith(child.path))
    ));

    return tree;
  }

  /**
   * Mapeia dados do banco para interface Affiliate
   */
  private mapAffiliateFromDB(data: any): Affiliate {
    return {
      id: data.id,
      userId: data.user_id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      document: data.document,
      referralCode: data.referral_code,
      walletId: data.wallet_id,
      walletValidatedAt: data.wallet_validated_at,
      status: data.status,
      approvedBy: data.approved_by,
      approvedAt: data.approved_at,
      totalClicks: data.total_clicks || 0,
      totalConversions: data.total_conversions || 0,
      totalCommissions: (data.total_commissions_cents || 0) / 100,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }
}

// Instância singleton
export const affiliateService = new AffiliateService();