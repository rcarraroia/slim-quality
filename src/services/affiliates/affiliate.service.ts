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
   * ATUALIZADO: Usa referred_by como fonte única de verdade
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
        .is('deleted_at', null)
        .single();

      if (existingAffiliate) {
        throw new Error('Email já cadastrado como afiliado');
      }

      // 3. Verificar se Wallet ID já existe
      const { data: existingWallet } = await supabase
        .from('affiliates')
        .select('id')
        .eq('wallet_id', data.walletId)
        .is('deleted_at', null)
        .single();

      if (existingWallet) {
        throw new Error('Wallet ID já cadastrada por outro afiliado');
      }

      // 4. Validar código de indicação (se fornecido)
      let referredBy: string | null = null;
      if (data.referralCode) {
        const parent = await this.getAffiliateByCode(data.referralCode);
        if (!parent) {
          throw new Error('Código de indicação inválido');
        }
        if (parent.status !== 'active') {
          throw new Error('Afiliado indicador não está ativo');
        }
        referredBy = parent.id;
      }

      // 5. Gerar código de indicação único
      const referralCode = await this.generateReferralCode();

      // 6. Criar afiliado com referred_by (fonte única de verdade)
      const affiliateData = {
        user_id: userId,
        name: data.name,
        email: data.email,
        phone: data.phone,
        document: data.document,
        referral_code: referralCode,
        wallet_id: data.walletId,
        wallet_validated_at: new Date().toISOString(),
        referred_by: referredBy, // ⭐ FONTE ÚNICA
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

      // View materializada será atualizada automaticamente via trigger
      console.log('✅ Afiliado criado com referred_by:', referredBy || 'raiz');

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
        .is('deleted_at', null)
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
        .is('deleted_at', null)
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
   * Busca rede completa do afiliado (N1 + N2 + N3)
   * ✅ CORRIGIDO: Usa queries diretas ao invés de affiliate_hierarchy
   */
  async getNetwork(affiliateId: string): Promise<Affiliate[]> {
    try {
      const allAffiliates: Affiliate[] = [];
      
      // Buscar N1 (diretos)
      const { data: n1List, error: n1Error } = await supabase
        .from('affiliates')
        .select('*')
        .eq('referred_by', affiliateId)
        .eq('status', 'active')
        .is('deleted_at', null);
      
      if (n1Error) throw n1Error;
      if (!n1List || n1List.length === 0) return [];
      
      allAffiliates.push(...n1List);
      
      // Buscar N2 (para cada N1)
      for (const n1 of n1List) {
        const { data: n2List } = await supabase
          .from('affiliates')
          .select('*')
          .eq('referred_by', n1.id)
          .eq('status', 'active')
          .is('deleted_at', null);
        
        if (n2List && n2List.length > 0) {
          allAffiliates.push(...n2List);
          
          // Buscar N3 (para cada N2)
          for (const n2 of n2List) {
            const { data: n3List } = await supabase
              .from('affiliates')
              .select('*')
              .eq('referred_by', n2.id)
              .eq('status', 'active')
              .is('deleted_at', null);
            
            if (n3List && n3List.length > 0) {
              allAffiliates.push(...n3List);
            }
          }
        }
      }
      
      return allAffiliates;
    } catch (error) {
      console.error('[AffiliateService] Erro ao buscar rede:', error);
      throw error;
    }
  }

  /**
   * Busca árvore genealógica do afiliado
   * ✅ CORRIGIDO: Usa queries diretas ao invés de affiliate_hierarchy
   */
  async getNetworkTree(affiliateId: string): Promise<NetworkTree | null> {
    try {
      // Buscar dados do afiliado raiz
      const { data: rootAffiliate, error: rootError } = await supabase
        .from('affiliates')
        .select('*')
        .eq('id', affiliateId)
        .single();
      
      if (rootError || !rootAffiliate) return null;
      
      // Construir árvore recursivamente
      const tree: NetworkTree = {
        affiliate: rootAffiliate,
        level: 0,
        children: await this.buildTreeLevel(affiliateId, 1)
      };
      
      return tree;
    } catch (error) {
      console.error('[AffiliateService] Erro ao buscar árvore:', error);
      return null;
    }
  }

  /**
   * Constrói um nível da árvore recursivamente
   * Limita a 3 níveis (N1, N2, N3)
   */
  private async buildTreeLevel(parentId: string, level: number): Promise<NetworkTree[]> {
    if (level > 3) return []; // Limite de profundidade
    
    const { data: children } = await supabase
      .from('affiliates')
      .select('*')
      .eq('referred_by', parentId)
      .eq('status', 'active')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    
    if (!children || children.length === 0) return [];
    
    const treeNodes: NetworkTree[] = [];
    
    for (const child of children) {
      treeNodes.push({
        affiliate: child,
        level,
        children: await this.buildTreeLevel(child.id, level + 1)
      });
    }
    
    return treeNodes;
  }



  /**
   * Busca ancestrais do afiliado (N2, N3) para cálculo de split
   * NOVO: Usa referred_by recursivamente
   */
  async getAncestors(affiliateId: string, maxLevels: number = 3): Promise<{
    id: string;
    level: number;
    walletId: string;
    referralCode: string;
  }[]> {
    try {
      const ancestors: {
        id: string;
        level: number;
        walletId: string;
        referralCode: string;
      }[] = [];
      
      let currentId = affiliateId;
      
      for (let level = 1; level <= maxLevels; level++) {
        const { data } = await supabase
          .from('affiliates')
          .select('id, referred_by, wallet_id, referral_code')
          .eq('id', currentId)
          .is('deleted_at', null)
          .single();
        
        if (!data || !data.referred_by) break;
        
        // Buscar dados do pai
        const { data: parent } = await supabase
          .from('affiliates')
          .select('id, wallet_id, referral_code, referred_by')
          .eq('id', data.referred_by)
          .eq('status', 'active')
          .is('deleted_at', null)
          .single();
        
        if (!parent) break;
        
        ancestors.push({
          id: parent.id,
          level: level,
          walletId: parent.wallet_id,
          referralCode: parent.referral_code
        });
        
        currentId = parent.id;
      }
      
      return ancestors;
    } catch (error) {
      console.error('Erro ao buscar ancestrais:', error);
      return [];
    }
  }

  /**
   * Aprova afiliado e ativa na rede
   * NOVO: Método simplificado
   */
  async approveAffiliate(affiliateId: string, adminId: string): Promise<Affiliate> {
    return this.updateStatus(affiliateId, 'active', adminId);
  }

  /**
   * Constrói rede genealógica
   * REMOVIDO: Não é mais necessário - referred_by é definido na criação
   * @deprecated Use createAffiliate com referralCode
   */
  async buildNetwork(affiliateId: string, parentReferralCode: string): Promise<void> {
    console.warn('buildNetwork() está deprecated - use createAffiliate com referralCode');
    // Mantido apenas para compatibilidade
  }

  /**
   * Verifica se vinculação criaria loop
   * REMOVIDO: Validação agora é feita pelo banco (constraint + trigger)
   * @deprecated Validação automática via banco
   */
  private async wouldCreateLoop(affiliateId: string, parentId: string): Promise<boolean> {
    console.warn('wouldCreateLoop() está deprecated - validação automática via banco');
    return false;
  }



  /**
   * Busca rede direta do afiliado (apenas filhos diretos)
   * ATUALIZADO: Usa referred_by
   */
  async getMyNetwork(affiliateId: string): Promise<Affiliate[]> {
    try {
      const { data, error } = await supabase
        .from('affiliates')
        .select('*')
        .eq('referred_by', affiliateId)
        .eq('status', 'active')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error || !data) {
        return [];
      }

      return data.map(child => this.mapAffiliateFromDB(child));
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
        .is('deleted_at', null)
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