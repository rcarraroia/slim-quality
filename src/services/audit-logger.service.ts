import { supabase } from '../config/supabase';

interface AuditLogData {
  adminId: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
}

export class AuditLogger {
  async logAction(data: AuditLogData): Promise<void> {
    try {
      const { error } = await supabase.from('audit_logs').insert({
        admin_id: data.adminId,
        action: data.action,
        resource_type: data.resourceType,
        resource_id: data.resourceId,
        details: data.details,
        ip_address: data.ipAddress,
        user_agent: data.userAgent,
        created_at: new Date().toISOString()
      });

      if (error) {
        console.error('Failed to log audit action:', error);
        // Não lançar erro para não quebrar fluxo principal
      }
    } catch (error) {
      console.error('Failed to log audit action:', error);
      // Não lançar erro para não quebrar fluxo principal
    }
  }

  async getAuditLogs(filters?: {
    adminId?: string;
    action?: string;
    resourceType?: string;
    resourceId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }): Promise<any[]> {
    try {
      let query = supabase
        .from('audit_logs')
        .select('*, admin:admins(name, email)')
        .order('created_at', { ascending: false });

      if (filters?.adminId) {
        query = query.eq('admin_id', filters.adminId);
      }

      if (filters?.action) {
        query = query.eq('action', filters.action);
      }

      if (filters?.resourceType) {
        query = query.eq('resource_type', filters.resourceType);
      }

      if (filters?.resourceId) {
        query = query.eq('resource_id', filters.resourceId);
      }

      if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate);
      }

      if (filters?.endDate) {
        query = query.lte('created_at', filters.endDate);
      }

      if (filters?.limit) {
        const offset = filters.offset || 0;
        query = query.range(offset, offset + filters.limit - 1);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Failed to fetch audit logs:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
      return [];
    }
  }

  async getAuditStats(adminId?: string): Promise<{
    totalActions: number;
    actionsByType: Record<string, number>;
    recentActions: any[];
  }> {
    try {
      let query = supabase.from('audit_logs').select('action, created_at');

      if (adminId) {
        query = query.eq('admin_id', adminId);
      }

      const { data, error } = await query;

      if (error || !data) {
        return {
          totalActions: 0,
          actionsByType: {},
          recentActions: []
        };
      }

      const actionsByType: Record<string, number> = {};
      data.forEach(log => {
        actionsByType[log.action] = (actionsByType[log.action] || 0) + 1;
      });

      const recentActions = data
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10);

      return {
        totalActions: data.length,
        actionsByType,
        recentActions
      };
    } catch (error) {
      console.error('Failed to fetch audit stats:', error);
      return {
        totalActions: 0,
        actionsByType: {},
        recentActions: []
      };
    }
  }
}

// Singleton
export const auditLogger = new AuditLogger();