/**
 * Audit Service
 * Sprint 7: Correções Críticas
 * 
 * Serviço para logs de auditoria de operações críticas
 */

import { supabase } from '@/config/supabase';
import { Logger } from '@/utils/logger';

export interface AuditLogEntry {
  operation_type: string;
  operation_details: Record<string, any>;
  before_state?: Record<string, any>;
  after_state: Record<string, any>;
  user_id?: string;
  ip_address?: string;
  user_agent?: string;
  success: boolean;
  error_message?: string;
}

export class AuditService {
  /**
   * Log de registro de afiliado
   */
  async logAffiliateRegistration(
    affiliateId: string,
    userId: string,
    data: {
      name: string;
      email: string;
      wallet_id: string;
      referral_code?: string;
    },
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      await this.createLog({
        table_name: 'affiliates',
        record_id: affiliateId,
        operation_type: 'affiliate_registered',
        operation_details: {
          name: data.name,
          email: data.email,
          wallet_id: data.wallet_id,
          has_referral: !!data.referral_code,
        },
        after_state: data,
        user_id: userId,
        ip_address: ipAddress,
        user_agent: userAgent,
        success: true,
      });
      
      Logger.info('AuditService', 'Affiliate registration logged', {
        affiliateId,
        userId,
      });
    } catch (error) {
      Logger.error('AuditService', 'Failed to log affiliate registration', error as Error);
    }
  }

  /**
   * Log de cálculo de comissão
   */
  async logCommissionCalculation(
    commissionId: string,
    orderId: string,
    data: {
      affiliate_id: string;
      level: number;
      amount_cents: number;
      percentage: number;
    },
    userId?: string
  ): Promise<void> {
    try {
      await this.createLog({
        table_name: 'commissions',
        record_id: commissionId,
        operation_type: 'commission_calculated',
        operation_details: {
          order_id: orderId,
          affiliate_id: data.affiliate_id,
          level: data.level,
          percentage: data.percentage,
        },
        after_state: {
          amount_cents: data.amount_cents,
          status: 'pending',
        },
        user_id: userId,
        success: true,
      });
      
      Logger.info('AuditService', 'Commission calculation logged', {
        commissionId,
        orderId,
      });
    } catch (error) {
      Logger.error('AuditService', 'Failed to log commission calculation', error as Error);
    }
  }

  /**
   * Log de operação de saque
   */
  async logWithdrawalOperation(
    withdrawalId: string,
    operation: 'requested' | 'approved' | 'rejected' | 'completed' | 'failed',
    data: {
      affiliate_id: string;
      amount_cents: number;
      status: string;
      reason?: string;
    },
    userId: string,
    beforeState?: Record<string, any>,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    try {
      await this.createLog({
        table_name: 'withdrawals',
        record_id: withdrawalId,
        operation_type: `withdrawal_${operation}`,
        operation_details: {
          affiliate_id: data.affiliate_id,
          amount_cents: data.amount_cents,
          reason: data.reason,
        },
        before_state: beforeState,
        after_state: {
          status: data.status,
        },
        user_id: userId,
        ip_address: ipAddress,
        user_agent: userAgent,
        success: true,
      });
      
      Logger.info('AuditService', 'Withdrawal operation logged', {
        withdrawalId,
        operation,
      });
    } catch (error) {
      Logger.error('AuditService', 'Failed to log withdrawal operation', error as Error);
    }
  }

  /**
   * Log de atualização de status de afiliado
   */
  async logAffiliateStatusUpdate(
    affiliateId: string,
    oldStatus: string,
    newStatus: string,
    reason: string | undefined,
    userId: string
  ): Promise<void> {
    try {
      await this.createLog({
        table_name: 'affiliates',
        record_id: affiliateId,
        operation_type: 'affiliate_status_updated',
        operation_details: {
          reason,
        },
        before_state: {
          status: oldStatus,
        },
        after_state: {
          status: newStatus,
        },
        user_id: userId,
        success: true,
      });
      
      Logger.info('AuditService', 'Affiliate status update logged', {
        affiliateId,
        oldStatus,
        newStatus,
      });
    } catch (error) {
      Logger.error('AuditService', 'Failed to log affiliate status update', error as Error);
    }
  }

  /**
   * Consultar logs de auditoria
   */
  async queryLogs(filters: {
    table_name?: string;
    record_id?: string;
    operation_type?: string;
    user_id?: string;
    start_date?: Date;
    end_date?: Date;
    limit?: number;
    offset?: number;
  }): Promise<any[]> {
    try {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters.table_name) {
        query = query.eq('table_name', filters.table_name);
      }

      if (filters.record_id) {
        query = query.eq('record_id', filters.record_id);
      }

      if (filters.operation_type) {
        query = query.eq('operation_type', filters.operation_type);
      }

      if (filters.user_id) {
        query = query.eq('user_id', filters.user_id);
      }

      if (filters.start_date) {
        query = query.gte('created_at', filters.start_date.toISOString());
      }

      if (filters.end_date) {
        query = query.lte('created_at', filters.end_date.toISOString());
      }

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      if (filters.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      Logger.error('AuditService', 'Failed to query logs', error as Error);
      throw error;
    }
  }

  /**
   * Criar log de auditoria genérico
   */
  private async createLog(entry: {
    table_name: string;
    record_id: string;
    operation_type: string;
    operation_details: Record<string, any>;
    before_state?: Record<string, any>;
    after_state: Record<string, any>;
    user_id?: string;
    ip_address?: string;
    user_agent?: string;
    success: boolean;
    error_message?: string;
  }): Promise<void> {
    try {
      const { error } = await supabase
        .from('audit_logs')
        .insert({
          ...entry,
          created_at: new Date().toISOString(),
        });

      if (error) {
        throw error;
      }
    } catch (error) {
      Logger.error('AuditService', 'Failed to create audit log', error as Error, entry);
      // Não propagar erro para não quebrar operação principal
    }
  }
}

export const auditService = new AuditService();
