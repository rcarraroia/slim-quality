/**
 * Admin Affiliate Service
 * Sprint 7: Correções Críticas
 * 
 * Service administrativo para gestão de afiliados
 */

import { supabase } from '@/config/supabase';
import { Logger } from '@/utils/logger';
import type { ServiceResponse, PaginatedResponse } from '@/types/affiliate.types';

export interface AdminAffiliateFilters {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export class AdminAffiliateService {
  /**
   * Listar todos os afiliados com filtros (admin)
   */
  async getAllAffiliates(filters: AdminAffiliateFilters = {}): Promise<ServiceResponse<PaginatedResponse<any>>> {
    try {
      const {
        page = 1,
        limit = 50,
        status,
        search,
        sortBy = 'created_at',
        sortOrder = 'desc'
      } = filters;

      const offset = (page - 1) * limit;

      let query = supabase
        .from('affiliates')
        .select(`
          *,
          profiles!inner(
            email,
            full_name
          )
        `, { count: 'exact' })
        .is('deleted_at', null);

      // Filtros
      if (status) {
        query = query.eq('status', status);
      }

      if (search) {
        query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
      }

      // Ordenação
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // Paginação
      query = query.range(offset, offset + limit - 1);

      const { data: affiliates, error, count } = await query;

      if (error) {
        Logger.error('AdminAffiliateService', 'Error getting all affiliates', error);
        return {
          success: false,
          error: 'Erro ao obter afiliados',
          code: 'GET_AFFILIATES_ERROR',
        };
      }

      const totalPages = Math.ceil((count || 0) / limit);

      return {
        success: true,
        data: {
          data: affiliates || [],
          pagination: {
            page,
            limit,
            total: count || 0,
            totalPages,
            hasMore: page < totalPages,
          },
        },
      };
    } catch (error) {
      Logger.error('AdminAffiliateService', 'Error in getAllAffiliates', error as Error);
      return {
        success: false,
        error: 'Erro interno ao obter afiliados',
        code: 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Buscar afiliado por ID (admin)
   */
  async getAffiliateById(id: string): Promise<ServiceResponse<any>> {
    try {
      const { data: affiliate, error } = await supabase
        .from('affiliates')
        .select(`
          *,
          profiles!inner(
            email,
            full_name,
            phone
          )
        `)
        .eq('id', id)
        .is('deleted_at', null)
        .single();

      if (error || !affiliate) {
        Logger.error('AdminAffiliateService', 'Affiliate not found', error || new Error('Not found'));
        return {
          success: false,
          error: 'Afiliado não encontrado',
          code: 'AFFILIATE_NOT_FOUND',
        };
      }

      return { success: true, data: affiliate };
    } catch (error) {
      Logger.error('AdminAffiliateService', 'Error in getAffiliateById', error as Error);
      return {
        success: false,
        error: 'Erro interno ao obter afiliado',
        code: 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Atualizar status do afiliado (admin)
   */
  async updateAffiliateStatus(id: string, status: string, reason?: string): Promise<ServiceResponse<any>> {
    try {
      Logger.info('AdminAffiliateService', 'Updating affiliate status', { id, status });

      const { data: affiliate, error } = await supabase
        .from('affiliates')
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        Logger.error('AdminAffiliateService', 'Error updating status', error);
        return {
          success: false,
          error: 'Erro ao atualizar status do afiliado',
          code: 'UPDATE_STATUS_ERROR',
        };
      }

      return { success: true, data: affiliate };
    } catch (error) {
      Logger.error('AdminAffiliateService', 'Error in updateAffiliateStatus', error as Error);
      return {
        success: false,
        error: 'Erro interno ao atualizar status',
        code: 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Obter rede genealógica do afiliado (admin)
   */
  async getAffiliateNetwork(id: string): Promise<ServiceResponse<any>> {
    try {
      const { data: network, error } = await supabase
        .rpc('get_affiliate_network_tree', {
          p_affiliate_id: id
        });

      if (error) {
        Logger.error('AdminAffiliateService', 'Error getting network', error);
        return {
          success: false,
          error: 'Erro ao obter rede do afiliado',
          code: 'GET_NETWORK_ERROR',
        };
      }

      return { success: true, data: network || [] };
    } catch (error) {
      Logger.error('AdminAffiliateService', 'Error in getAffiliateNetwork', error as Error);
      return {
        success: false,
        error: 'Erro interno ao obter rede',
        code: 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Obter estatísticas gerais de afiliados (admin)
   */
  async getAffiliateStats(): Promise<ServiceResponse<any>> {
    try {
      const [
        totalResult,
        activeResult,
        pendingResult,
        inactiveResult
      ] = await Promise.all([
        supabase
          .from('affiliates')
          .select('id', { count: 'exact' })
          .is('deleted_at', null),
        supabase
          .from('affiliates')
          .select('id', { count: 'exact' })
          .eq('status', 'active')
          .is('deleted_at', null),
        supabase
          .from('affiliates')
          .select('id', { count: 'exact' })
          .eq('status', 'pending')
          .is('deleted_at', null),
        supabase
          .from('affiliates')
          .select('id', { count: 'exact' })
          .eq('status', 'inactive')
          .is('deleted_at', null),
      ]);

      const stats = {
        total: totalResult.count || 0,
        active: activeResult.count || 0,
        pending: pendingResult.count || 0,
        inactive: inactiveResult.count || 0,
      };

      return { success: true, data: stats };
    } catch (error) {
      Logger.error('AdminAffiliateService', 'Error in getAffiliateStats', error as Error);
      return {
        success: false,
        error: 'Erro interno ao obter estatísticas',
        code: 'INTERNAL_ERROR',
      };
    }
  }
}

export const adminAffiliateService = new AdminAffiliateService();