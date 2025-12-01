/**
 * Commission Service
 * Sprint 4: Sistema de Afiliados Multinível
 * 
 * Service para gestão de comissões
 * - Consulta de comissões por afiliado
 * - Relatórios administrativos
 * - Gestão de pagamentos
 * - Logs de auditoria
 */

import { supabase } from '@/config/supabase';
import { Logger } from '@/utils/logger';
import type {
  ServiceResponse,
  PaginatedResponse,
} from '@/types/affiliate.types';

// Local types for Commission Service
export interface Commission {
  id: string;
  order_id: string;
  order_number: string;
  affiliate_id: string;
  affiliate_name: string;
  level: number;
  percentage: number;
  base_value_cents: number;
  commission_value_cents: number;
  status: 'calculated' | 'pending' | 'paid' | 'failed';
  asaas_split_id?: string;
  paid_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CommissionQueryParams {
  page?: number;
  limit?: number;
  status?: string;
  affiliateId?: string;
  startDate?: string;
  endDate?: string;
  level?: number;
}

export interface MonthlyStats {
  newAffiliates: number;
  totalSales: number;
  totalCommissions: number;
  conversionRate: number;
}

export interface TopPerformer {
  affiliate: {
    id: string;
    name: string;
    email: string;
    referralCode: string;
  };
  conversions: number;
  commissions: number;
}

export interface CommissionSummaryItem {
  date: string;
  totalCommissions: number;
  totalValue: number;
  commissionsCount: number;
  avgCommission: number;
}

export interface AuditLogItem {
  logId: string;
  orderId: string;
  orderNumber: string;
  operationType: string;
  operationDetails: any;
  totalValueCents: number;
  commissionValueCents: number;
  success: boolean;
  errorMessage?: string;
  userEmail?: string;
  createdAt: string;
}

export class CommissionService {
  /**
    * Obtém comissão por ID
    */
   async getById(id: string): Promise<ServiceResponse<Commission>> {
     try {
       const { data: commission, error } = await supabase
         .from('commissions')
         .select(`
           *,
           affiliates!inner(
             id,
             name,
             email,
             referral_code
           ),
           orders!inner(
             order_number,
             customer_name,
             total_cents
           )
         `)
         .eq('id', id)
         .single();

       if (error || !commission) {
         Logger.error('CommissionService', 'Commission not found', error || new Error('Commission not found'), { commissionId: id });
         return {
           success: false,
           error: 'Comissão não encontrada',
           code: 'COMMISSION_NOT_FOUND',
         };
       }

       return { success: true, data: commission };

     } catch (error) {
       Logger.error('CommissionService', 'Error getting commission by ID', error as Error);
       return {
         success: false,
         error: 'Erro interno ao obter comissão',
         code: 'INTERNAL_ERROR',
       };
     }
   }

  /**
    * Obtém comissões de um afiliado (alias para getByAffiliateId)
    */
   async getByAffiliateId(
     affiliateId: string,
     params: CommissionQueryParams = {}
   ): Promise<ServiceResponse<PaginatedResponse<Commission>>> {
     return this.getAffiliateCommissions(affiliateId, params);
   }

  /**
    * Obtém estatísticas de comissões (alias para getMonthlyStats)
    */
   async getStats(params?: any): Promise<ServiceResponse<MonthlyStats>> {
     return this.getMonthlyStats();
   }

  /**
    * Obtém comissões de um afiliado
    */
   async getAffiliateCommissions(
     affiliateId: string,
     params: CommissionQueryParams = {}
   ): Promise<ServiceResponse<PaginatedResponse<Commission>>> {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        startDate,
        endDate,
        level,
      } = params;

      Logger.info('CommissionService', 'Getting affiliate commissions', {
        affiliateId,
        params,
      });

      const { data: commissions, error } = await supabase
        .rpc('get_affiliate_commissions', {
          p_affiliate_id: affiliateId,
          p_limit: limit,
          p_offset: (page - 1) * limit,
          p_status: status,
        });

      if (error) {
        Logger.error('CommissionService', 'Error getting affiliate commissions', error);
        return {
          success: false,
          error: 'Erro ao obter comissões do afiliado',
          code: 'GET_COMMISSIONS_ERROR',
        };
      }

      // Aplicar filtros adicionais se necessário
      let filteredCommissions = commissions || [];

      if (startDate) {
        filteredCommissions = filteredCommissions.filter(
          (c: any) => new Date(c.created_at) >= new Date(startDate)
        );
      }

      if (endDate) {
        filteredCommissions = filteredCommissions.filter(
          (c: any) => new Date(c.created_at) <= new Date(endDate)
        );
      }

      if (level) {
        filteredCommissions = filteredCommissions.filter(
          (c: any) => c.level === level
        );
      }

      const total = filteredCommissions.length;
      const totalPages = Math.ceil(total / limit);

      return {
        success: true,
        data: {
          data: filteredCommissions,
          pagination: {
            page,
            limit,
            total,
            totalPages,
            hasMore: page < totalPages,
          },
        },
      };

    } catch (error) {
      Logger.error('CommissionService', 'Error in getAffiliateCommissions', error as Error);
      return {
        success: false,
        error: 'Erro interno ao obter comissões',
        code: 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Obtém todas as comissões (admin)
   */
  async getAllCommissions(
    params: CommissionQueryParams = {}
  ): Promise<ServiceResponse<PaginatedResponse<Commission>>> {
    try {
      const {
        page = 1,
        limit = 50,
        status,
        affiliateId,
        startDate,
        endDate,
        level,
      } = params;

      const offset = (page - 1) * limit;

      let query = supabase
        .from('commissions')
        .select(`
          *,
          affiliates!inner(
            id,
            name,
            email,
            referral_code
          ),
          orders!inner(
            order_number,
            customer_name,
            total_cents
          )
        `, { count: 'exact' })
        .order('created_at', { ascending: false });

      // Filtros
      if (status) {
        query = query.eq('status', status);
      }

      if (affiliateId) {
        query = query.eq('affiliate_id', affiliateId);
      }

      if (level) {
        query = query.eq('level', level);
      }

      if (startDate) {
        query = query.gte('created_at', startDate);
      }

      if (endDate) {
        query = query.lte('created_at', endDate);
      }

      // Paginação
      query = query.range(offset, offset + limit - 1);

      const { data: commissions, error, count } = await query;

      if (error) {
        Logger.error('CommissionService', 'Error getting all commissions', error);
        return {
          success: false,
          error: 'Erro ao obter comissões',
          code: 'GET_ALL_COMMISSIONS_ERROR',
        };
      }

      const totalPages = Math.ceil((count || 0) / limit);

      return {
        success: true,
        data: {
          data: commissions || [],
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
      Logger.error('CommissionService', 'Error in getAllCommissions', error as Error);
      return {
        success: false,
        error: 'Erro interno ao obter comissões',
        code: 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Marca comissão como paga
   */
  async markCommissionAsPaid(
    commissionId: string,
    adminUserId: string
  ): Promise<ServiceResponse<Commission>> {
    try {
      Logger.info('CommissionService', 'Marking commission as paid', {
        commissionId,
        adminUserId,
      });

      const { data: commission, error } = await supabase
        .from('commissions')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', commissionId)
        .select()
        .single();

      if (error) {
        Logger.error('CommissionService', 'Error marking commission as paid', error);
        return {
          success: false,
          error: 'Erro ao marcar comissão como paga',
          code: 'MARK_PAID_ERROR',
        };
      }

      // Registrar log de auditoria
      await supabase.rpc('log_commission_operation', {
        p_order_id: commission.order_id,
        p_operation_type: 'manual_adjustment',
        p_operation_details: {
          action: 'mark_as_paid',
          commission_id: commissionId,
          admin_user_id: adminUserId,
        },
        p_after_state: commission,
        p_commission_value_cents: commission.commission_value_cents,
        p_success: true,
      });

      return { success: true, data: commission };

    } catch (error) {
      Logger.error('CommissionService', 'Error in markCommissionAsPaid', error as Error);
      return {
        success: false,
        error: 'Erro interno ao marcar comissão como paga',
        code: 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Obtém estatísticas mensais
   */
  async getMonthlyStats(): Promise<ServiceResponse<MonthlyStats>> {
    try {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const endOfMonth = new Date();
      endOfMonth.setMonth(endOfMonth.getMonth() + 1);
      endOfMonth.setDate(0);
      endOfMonth.setHours(23, 59, 59, 999);

      // Buscar estatísticas em paralelo
      const [
        newAffiliatesResult,
        totalSalesResult,
        totalCommissionsResult,
        clicksResult,
        conversionsResult,
      ] = await Promise.all([
        // Novos afiliados no mês
        supabase
          .from('affiliates')
          .select('id', { count: 'exact' })
          .gte('created_at', startOfMonth.toISOString())
          .lte('created_at', endOfMonth.toISOString())
          .is('deleted_at', null),

        // Total de vendas no mês
        supabase
          .from('orders')
          .select('total_cents')
          .gte('created_at', startOfMonth.toISOString())
          .lte('created_at', endOfMonth.toISOString())
          .eq('status', 'paid')
          .is('deleted_at', null),

        // Total de comissões no mês
        supabase
          .from('commissions')
          .select('commission_value_cents')
          .gte('created_at', startOfMonth.toISOString())
          .lte('created_at', endOfMonth.toISOString()),

        // Total de cliques no mês
        supabase
          .from('referral_clicks')
          .select('id', { count: 'exact' })
          .gte('clicked_at', startOfMonth.toISOString())
          .lte('clicked_at', endOfMonth.toISOString()),

        // Total de conversões no mês
        supabase
          .from('referral_conversions')
          .select('id', { count: 'exact' })
          .gte('created_at', startOfMonth.toISOString())
          .lte('created_at', endOfMonth.toISOString()),
      ]);

      const newAffiliates = newAffiliatesResult.count || 0;
      const totalSales = (totalSalesResult.data || [])
        .reduce((sum, order) => sum + order.total_cents, 0);
      const totalCommissions = (totalCommissionsResult.data || [])
        .reduce((sum, commission) => sum + commission.commission_value_cents, 0);
      const totalClicks = clicksResult.count || 0;
      const totalConversions = conversionsResult.count || 0;
      const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;

      const stats: MonthlyStats = {
        newAffiliates,
        totalSales,
        totalCommissions,
        conversionRate: Math.round(conversionRate * 100) / 100,
      };

      return { success: true, data: stats };

    } catch (error) {
      Logger.error('CommissionService', 'Error getting monthly stats', error as Error);
      return {
        success: false,
        error: 'Erro ao obter estatísticas mensais',
        code: 'GET_MONTHLY_STATS_ERROR',
      };
    }
  }

  /**
   * Obtém top performers
   */
  async getTopPerformers(limit: number = 10): Promise<ServiceResponse<TopPerformer[]>> {
    try {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: performers, error } = await supabase
        .from('commissions')
        .select(`
          affiliate_id,
          commission_value_cents,
          affiliates!inner(
            id,
            name,
            email,
            referral_code
          )
        `)
        .gte('created_at', startOfMonth.toISOString())
        .eq('status', 'paid');

      if (error) {
        Logger.error('CommissionService', 'Error getting top performers', error);
        return {
          success: false,
          error: 'Erro ao obter top performers',
          code: 'GET_TOP_PERFORMERS_ERROR',
        };
      }

      // Agrupar por afiliado
      const performerMap = new Map<string, {
        affiliate: any;
        conversions: number;
        commissions: number;
      }>();

      (performers || []).forEach(item => {
        const affiliateId = item.affiliate_id;
        
        if (!performerMap.has(affiliateId)) {
          performerMap.set(affiliateId, {
            affiliate: item.affiliates,
            conversions: 0,
            commissions: 0,
          });
        }

        const performer = performerMap.get(affiliateId)!;
        performer.conversions++;
        performer.commissions += item.commission_value_cents;
      });

      // Converter para array e ordenar por comissões
      const topPerformers = Array.from(performerMap.values())
        .sort((a, b) => b.commissions - a.commissions)
        .slice(0, limit);

      return { success: true, data: topPerformers };

    } catch (error) {
      Logger.error('CommissionService', 'Error in getTopPerformers', error as Error);
      return {
        success: false,
        error: 'Erro interno ao obter top performers',
        code: 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Obtém resumo de comissões por período
   */
  async getCommissionSummary(params: {
    startDate?: string;
    endDate?: string;
    groupBy?: 'day' | 'week' | 'month';
  }): Promise<ServiceResponse<CommissionSummaryItem[]>> {
    try {
      const { startDate, endDate, groupBy = 'day' } = params;

      const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate) : new Date();

      const { data: commissions, error } = await supabase
        .from('commissions')
        .select('created_at, commission_value_cents, base_value_cents')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .eq('status', 'paid');

      if (error) {
        Logger.error('CommissionService', 'Error getting commission summary', error);
        return {
          success: false,
          error: 'Erro ao obter resumo de comissões',
          code: 'GET_COMMISSION_SUMMARY_ERROR',
        };
      }

      // Agrupar por período
      const summaryMap = new Map<string, {
        totalCommissions: number;
        totalValue: number;
        commissionsCount: number;
      }>();

      (commissions || []).forEach(commission => {
        const date = new Date(commission.created_at);
        let key: string;

        switch (groupBy) {
          case 'week':
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - date.getDay());
            key = weekStart.toISOString().split('T')[0];
            break;
          case 'month':
            key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            break;
          default:
            key = date.toISOString().split('T')[0];
        }

        if (!summaryMap.has(key)) {
          summaryMap.set(key, {
            totalCommissions: 0,
            totalValue: 0,
            commissionsCount: 0,
          });
        }

        const summary = summaryMap.get(key)!;
        summary.totalCommissions += commission.commission_value_cents;
        summary.totalValue += commission.base_value_cents;
        summary.commissionsCount++;
      });

      // Converter para array
      const summaryArray = Array.from(summaryMap.entries()).map(([date, summary]) => ({
        date,
        totalCommissions: summary.totalCommissions,
        totalValue: summary.totalValue,
        commissionsCount: summary.commissionsCount,
        avgCommission: summary.commissionsCount > 0 
          ? Math.round(summary.totalCommissions / summary.commissionsCount)
          : 0,
      })).sort((a, b) => a.date.localeCompare(b.date));

      return { success: true, data: summaryArray };

    } catch (error) {
      Logger.error('CommissionService', 'Error in getCommissionSummary', error as Error);
      return {
        success: false,
        error: 'Erro interno ao obter resumo',
        code: 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Obtém logs de auditoria
   */
  async getAuditLogs(params: {
    orderId?: string;
    affiliateId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<ServiceResponse<AuditLogItem[]>> {
    try {
      const { orderId, affiliateId, startDate, endDate, limit = 100 } = params;

      const { data: logs, error } = await supabase
        .rpc('get_commission_audit_trail', {
          p_order_id: orderId,
          p_affiliate_id: affiliateId,
          p_start_date: startDate,
          p_end_date: endDate,
          p_limit: limit,
        });

      if (error) {
        Logger.error('CommissionService', 'Error getting audit logs', error);
        return {
          success: false,
          error: 'Erro ao obter logs de auditoria',
          code: 'GET_AUDIT_LOGS_ERROR',
        };
      }

      return { success: true, data: logs || [] };

    } catch (error) {
      Logger.error('CommissionService', 'Error in getAuditLogs', error as Error);
      return {
        success: false,
        error: 'Erro interno ao obter logs',
        code: 'INTERNAL_ERROR',
      };
    }
  }
}

export const commissionService = new CommissionService();