/**
 * Affiliate Repository - Supabase Implementation
 * Sprint 7: Correções Críticas
 *
 * Implementação do Repository Pattern para desacoplar Supabase
 */

import { supabase } from '@/config/supabase';
import {
  Affiliate,
  CreateAffiliateDTO,
  UpdateAffiliateDTO,
  AffiliateFilters,
  PaginatedResponse
} from '@/types/affiliate.types';

export interface IAffiliateRepository {
  findById(id: string): Promise<Affiliate | null>;
  findByUserId(userId: string): Promise<Affiliate | null>;
  findByReferralCode(referralCode: string): Promise<Affiliate | null>;
  findByWalletId(walletId: string): Promise<Affiliate | null>;
  findAll(filters: AffiliateFilters): Promise<PaginatedResponse<Affiliate>>;
  create(data: CreateAffiliateDTO): Promise<Affiliate>;
  update(id: string, data: UpdateAffiliateDTO): Promise<Affiliate>;
  delete(id: string): Promise<void>;
  getNetworkStats(affiliateId: string): Promise<{
    totalReferrals: number;
    totalSales: number;
    totalCommissionsCents: number;
    networkDepth: number;
  }>;
}

export class SupabaseAffiliateRepository implements IAffiliateRepository {
  async findById(id: string): Promise<Affiliate | null> {
    const { data, error } = await supabase
      .from('affiliates')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error || !data) return null;

    return this.mapToAffiliate(data);
  }

  async findByUserId(userId: string): Promise<Affiliate | null> {
    const { data, error } = await supabase
      .from('affiliates')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .single();

    if (error || !data) return null;

    return this.mapToAffiliate(data);
  }

  async findByReferralCode(referralCode: string): Promise<Affiliate | null> {
    const { data, error } = await supabase
      .from('affiliates')
      .select('*')
      .eq('referral_code', referralCode)
      .is('deleted_at', null)
      .single();

    if (error || !data) return null;

    return this.mapToAffiliate(data);
  }

  async findByWalletId(walletId: string): Promise<Affiliate | null> {
    const { data, error } = await supabase
      .from('affiliates')
      .select('*')
      .eq('wallet_id', walletId)
      .is('deleted_at', null)
      .single();

    if (error || !data) return null;

    return this.mapToAffiliate(data);
  }

  async findAll(filters: AffiliateFilters): Promise<PaginatedResponse<Affiliate>> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('affiliates')
      .select('*', { count: 'exact' })
      .is('deleted_at', null);

    // Apply filters
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.level) {
      query = query.eq('level', filters.level);
    }
    if (filters.parentAffiliateId) {
      query = query.eq('parent_affiliate_id', filters.parentAffiliateId);
    }
    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
    }

    // Apply pagination and ordering
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    const affiliates = (data || []).map(item => this.mapToAffiliate(item));
    const totalPages = Math.ceil((count || 0) / limit);

    return {
      data: affiliates,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages,
        hasMore: page < totalPages
      }
    };
  }

  async create(data: CreateAffiliateDTO): Promise<Affiliate> {
    const { data: created, error } = await supabase
      .from('affiliates')
      .insert({
        user_id: data.userId,
        name: data.name,
        email: data.email,
        phone: data.phone,
        document: data.document,
        wallet_id: data.walletId,
        referral_code: data.referralCode,
        pix_key: data.pixKey,
        status: 'pending',
        level: 1,
        total_referrals: 0,
        total_sales: 0,
        total_commissions_cents: 0,
        available_balance_cents: 0
      })
      .select()
      .single();

    if (error) throw error;

    return this.mapToAffiliate(created);
  }

  async update(id: string, data: UpdateAffiliateDTO): Promise<Affiliate> {
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.pixKey !== undefined) updateData.pix_key = data.pixKey;
    if (data.status !== undefined) updateData.status = data.status;

    const { data: updated, error } = await supabase
      .from('affiliates')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return this.mapToAffiliate(updated);
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('affiliates')
      .update({
        deleted_at: new Date().toISOString(),
        status: 'inactive'
      })
      .eq('id', id);

    if (error) throw error;
  }

  async getNetworkStats(affiliateId: string): Promise<{
    totalReferrals: number;
    totalSales: number;
    totalCommissionsCents: number;
    networkDepth: number;
  }> {
    // This would require a complex query or stored procedure
    // For now, return basic stats
    const affiliate = await this.findById(affiliateId);
    if (!affiliate) {
      return {
        totalReferrals: 0,
        totalSales: 0,
        totalCommissionsCents: 0,
        networkDepth: 0
      };
    }

    return {
      totalReferrals: affiliate.totalReferrals,
      totalSales: affiliate.totalSales,
      totalCommissionsCents: affiliate.totalCommissionsCents,
      networkDepth: affiliate.level
    };
  }

  private mapToAffiliate(data: any): Affiliate {
    return {
      id: data.id,
      userId: data.user_id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      document: data.document,
      walletId: data.wallet_id,
      referralCode: data.referral_code,
      level: data.level,
      parentAffiliateId: data.parent_affiliate_id,
      totalReferrals: data.total_referrals || 0,
      totalSales: data.total_sales || 0,
      totalCommissionsCents: data.total_commissions_cents || 0,
      availableBalanceCents: data.available_balance_cents || 0,
      status: data.status,
      pixKey: data.pix_key,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }
}

export const affiliateRepository = new SupabaseAffiliateRepository();