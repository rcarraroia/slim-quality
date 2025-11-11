/**
 * Notification Service
 * Sprint 5: Sistema de CRM e Gestão de Clientes
 * 
 * Serviço para gestão de notificações do sistema CRM,
 * incluindo notificações de conversas, atribuições e lembretes.
 */

import { supabase } from '@/config/supabase';
import { z } from 'zod';
import { logger } from '@/utils/logger';

// ============================================
// SCHEMAS DE VALIDAÇÃO
// ============================================

// Schema para criação de notificação
export const CreateNotificationSchema = z.object({
  user_id: z.string().uuid(),
  type: z.enum([
    'new_conversation',
    'new_message',
    'conversation_assigned',
    'conversation_unassigned',
    'appointment_reminder',
    'appointment_created',
    'customer_updated',
    'system_alert'
  ]),
  title: z.string().min(1).max(255),
  message: z.string().min(1).max(1000),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  action_url: z.string().url().optional(),
  metadata: z.record(z.any()).default({}),
  expires_at: z.string().optional() // ISO date string
});

// Schema para atualização de notificação
export const UpdateNotificationSchema = z.object({
  id: z.string().uuid(),
  is_read: z.boolean().optional(),
  is_dismissed: z.boolean().optional()
});

// Schema para filtros de notificações
export const NotificationFiltersSchema = z.object({
  user_id: z.string().uuid().optional(),
  type: z.enum([
    'new_conversation',
    'new_message', 
    'conversation_assigned',
    'conversation_unassigned',
    'appointment_reminder',
    'appointment_created',
    'customer_updated',
    'system_alert'
  ]).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  is_read: z.boolean().optional(),
  is_dismissed: z.boolean().optional(),
  created_after: z.string().optional(),
  created_before: z.string().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  sort_order: z.enum(['asc', 'desc']).default('desc')
});

// Schema para preferências de notificação
export const NotificationPreferencesSchema = z.object({
  user_id: z.string().uuid(),
  email_notifications: z.boolean().default(true),
  push_notifications: z.boolean().default(true),
  sms_notifications: z.boolean().default(false),
  notification_types: z.record(z.boolean()).default({}), // tipo -> habilitado
  quiet_hours_start: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(), // HH:MM
  quiet_hours_end: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(), // HH:MM
  timezone: z.string().default('America/Sao_Paulo')
});

// Tipos TypeScript
export type CreateNotificationData = z.infer<typeof CreateNotificationSchema>;
export type UpdateNotificationData = z.infer<typeof UpdateNotificationSchema>;
export type NotificationFilters = z.infer<typeof NotificationFiltersSchema>;
export type NotificationPreferences = z.infer<typeof NotificationPreferencesSchema>;

export interface Notification {
  id: string;
  user_id: string;
  type: 'new_conversation' | 'new_message' | 'conversation_assigned' | 'conversation_unassigned' | 
        'appointment_reminder' | 'appointment_created' | 'customer_updated' | 'system_alert';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  action_url?: string;
  metadata: Record<string, any>;
  is_read: boolean;
  is_dismissed: boolean;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface NotificationWithUser extends Notification {
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export interface PaginatedNotifications {
  data: Notification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
  unread_count: number;
}

export interface NotificationStats {
  total: number;
  unread: number;
  by_type: Record<string, number>;
  by_priority: Record<string, number>;
}

// ============================================
// NOTIFICATION SERVICE
// ============================================

class NotificationService {
  /**
   * Criar nova notificação
   */
  async create(data: CreateNotificationData): Promise<Notification> {
    try {
      // Validar dados de entrada
      const validatedData = CreateNotificationSchema.parse(data);
      
      logger.info('Criando nova notificação', { 
        userId: validatedData.user_id,
        type: validatedData.type,
        priority: validatedData.priority
      });
      
      // Verificar se usuário existe
      const { data: user, error: userError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', validatedData.user_id)
        .single();
      
      if (userError || !user) {
        throw new Error(`Usuário ${validatedData.user_id} não encontrado`);
      }
      
      // Verificar preferências do usuário
      const preferences = await this.getUserPreferences(validatedData.user_id);
      const shouldNotify = this.shouldSendNotification(validatedData.type, preferences);
      
      if (!shouldNotify) {
        logger.info('Notificação bloqueada pelas preferências do usuário', {
          userId: validatedData.user_id,
          type: validatedData.type
        });
        return null; // Não criar notificação se bloqueada
      }
      
      // Inserir notificação
      const { data: notification, error } = await supabase
        .from('notifications')
        .insert(validatedData)
        .select()
        .single();
      
      if (error) {
        logger.error('Erro ao criar notificação', { error: error.message, data: validatedData });
        throw new Error(`Erro ao criar notificação: ${error.message}`);
      }
      
      logger.info('Notificação criada com sucesso', { 
        id: notification.id,
        userId: notification.user_id,
        type: notification.type
      });
      
      // Enviar notificação em tempo real (WebSocket, Push, etc.)
      await this.sendRealTimeNotification(notification);
      
      return notification;
    } catch (error) {
      logger.error('Erro no NotificationService.create', { error: error.message, data });
      throw error;
    }
  }
  
  /**
   * Buscar notificação por ID
   */
  async getById(id: string): Promise<Notification | null> {
    try {
      logger.info('Buscando notificação por ID', { id });
      
      const { data: notification, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Notificação não encontrada
        }
        logger.error('Erro ao buscar notificação', { error: error.message, id });
        throw new Error(`Erro ao buscar notificação: ${error.message}`);
      }
      
      return notification;
    } catch (error) {
      logger.error('Erro no NotificationService.getById', { error: error.message, id });
      throw error;
    }
  }
  
  /**
   * Listar notificações com filtros
   */
  async list(filters: Partial<NotificationFilters> = {}): Promise<PaginatedNotifications> {
    try {
      // Validar filtros
      const validatedFilters = NotificationFiltersSchema.parse(filters);
      
      logger.info('Listando notificações', { filters: validatedFilters });
      
      // Construir query base
      let query = supabase
        .from('notifications')
        .select('*', { count: 'exact' });
      
      // Aplicar filtros
      if (validatedFilters.user_id) {
        query = query.eq('user_id', validatedFilters.user_id);
      }
      
      if (validatedFilters.type) {
        query = query.eq('type', validatedFilters.type);
      }
      
      if (validatedFilters.priority) {
        query = query.eq('priority', validatedFilters.priority);
      }
      
      if (validatedFilters.is_read !== undefined) {
        query = query.eq('is_read', validatedFilters.is_read);
      }
      
      if (validatedFilters.is_dismissed !== undefined) {
        query = query.eq('is_dismissed', validatedFilters.is_dismissed);
      }
      
      if (validatedFilters.created_after) {
        query = query.gte('created_at', validatedFilters.created_after);
      }
      
      if (validatedFilters.created_before) {
        query = query.lte('created_at', validatedFilters.created_before);
      }
      
      // Filtrar notificações expiradas
      query = query.or('expires_at.is.null,expires_at.gt.' + new Date().toISOString());
      
      // Ordenação
      query = query.order('created_at', { ascending: validatedFilters.sort_order === 'asc' });
      
      // Paginação
      const offset = (validatedFilters.page - 1) * validatedFilters.limit;
      query = query.range(offset, offset + validatedFilters.limit - 1);
      
      const { data: notifications, error, count } = await query;
      
      if (error) {
        logger.error('Erro ao listar notificações', { error: error.message, filters: validatedFilters });
        throw new Error(`Erro ao listar notificações: ${error.message}`);
      }
      
      // Contar não lidas
      let unreadQuery = supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false)
        .eq('is_dismissed', false);
      
      if (validatedFilters.user_id) {
        unreadQuery = unreadQuery.eq('user_id', validatedFilters.user_id);
      }
      
      const { count: unreadCount } = await unreadQuery;
      
      // Calcular paginação
      const total = count || 0;
      const total_pages = Math.ceil(total / validatedFilters.limit);
      
      const result: PaginatedNotifications = {
        data: notifications || [],
        pagination: {
          page: validatedFilters.page,
          limit: validatedFilters.limit,
          total,
          total_pages,
          has_next: validatedFilters.page < total_pages,
          has_prev: validatedFilters.page > 1
        },
        unread_count: unreadCount || 0
      };
      
      logger.info('Notificações listadas com sucesso', { 
        total, 
        unread: unreadCount,
        page: validatedFilters.page, 
        returned: notifications?.length || 0
      });
      
      return result;
    } catch (error) {
      logger.error('Erro no NotificationService.list', { error: error.message, filters });
      throw error;
    }
  }
  
  /**
   * Marcar notificação como lida
   */
  async markAsRead(id: string): Promise<void> {
    try {
      logger.info('Marcando notificação como lida', { id });
      
      const { error } = await supabase
        .from('notifications')
        .update({ 
          is_read: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
      
      if (error) {
        logger.error('Erro ao marcar notificação como lida', { error: error.message, id });
        throw new Error(`Erro ao marcar notificação como lida: ${error.message}`);
      }
      
      logger.info('Notificação marcada como lida', { id });
    } catch (error) {
      logger.error('Erro no NotificationService.markAsRead', { error: error.message, id });
      throw error;
    }
  }
  
  /**
   * Marcar todas as notificações de um usuário como lidas
   */
  async markAllAsRead(userId: string): Promise<void> {
    try {
      logger.info('Marcando todas as notificações como lidas', { userId });
      
      const { error } = await supabase
        .from('notifications')
        .update({ 
          is_read: true,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('is_read', false);
      
      if (error) {
        logger.error('Erro ao marcar todas as notificações como lidas', { error: error.message, userId });
        throw new Error(`Erro ao marcar notificações como lidas: ${error.message}`);
      }
      
      logger.info('Todas as notificações marcadas como lidas', { userId });
    } catch (error) {
      logger.error('Erro no NotificationService.markAllAsRead', { error: error.message, userId });
      throw error;
    }
  }
  
  /**
   * Dispensar notificação
   */
  async dismiss(id: string): Promise<void> {
    try {
      logger.info('Dispensando notificação', { id });
      
      const { error } = await supabase
        .from('notifications')
        .update({ 
          is_dismissed: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
      
      if (error) {
        logger.error('Erro ao dispensar notificação', { error: error.message, id });
        throw new Error(`Erro ao dispensar notificação: ${error.message}`);
      }
      
      logger.info('Notificação dispensada', { id });
    } catch (error) {
      logger.error('Erro no NotificationService.dismiss', { error: error.message, id });
      throw error;
    }
  }
  
  /**
   * Buscar estatísticas de notificações
   */
  async getStats(userId?: string): Promise<NotificationStats> {
    try {
      logger.info('Buscando estatísticas de notificações', { userId });
      
      let baseQuery = supabase.from('notifications');
      
      if (userId) {
        baseQuery = baseQuery.eq('user_id', userId);
      }
      
      // Total de notificações
      const { count: total } = await baseQuery
        .select('*', { count: 'exact', head: true });
      
      // Notificações não lidas
      const { count: unread } = await baseQuery
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false)
        .eq('is_dismissed', false);
      
      // Por tipo
      const { data: byTypeData } = await baseQuery
        .select('type')
        .eq('is_dismissed', false);
      
      const byType = (byTypeData || []).reduce((acc, item) => {
        acc[item.type] = (acc[item.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      // Por prioridade
      const { data: byPriorityData } = await baseQuery
        .select('priority')
        .eq('is_dismissed', false);
      
      const byPriority = (byPriorityData || []).reduce((acc, item) => {
        acc[item.priority] = (acc[item.priority] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const stats: NotificationStats = {
        total: total || 0,
        unread: unread || 0,
        by_type: byType,
        by_priority: byPriority
      };
      
      logger.info('Estatísticas de notificações calculadas', { stats });
      
      return stats;
    } catch (error) {
      logger.error('Erro ao buscar estatísticas de notificações', { error: error.message, userId });
      return { total: 0, unread: 0, by_type: {}, by_priority: {} };
    }
  }
  
  /**
   * Buscar preferências de notificação do usuário
   */
  async getUserPreferences(userId: string): Promise<NotificationPreferences> {
    try {
      logger.info('Buscando preferências de notificação', { userId });
      
      const { data: preferences, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        logger.error('Erro ao buscar preferências', { error: error.message, userId });
        throw new Error(`Erro ao buscar preferências: ${error.message}`);
      }
      
      // Se não existir, retornar padrões
      if (!preferences) {
        return {
          user_id: userId,
          email_notifications: true,
          push_notifications: true,
          sms_notifications: false,
          notification_types: {},
          timezone: 'America/Sao_Paulo'
        };
      }
      
      return preferences;
    } catch (error) {
      logger.error('Erro no NotificationService.getUserPreferences', { error: error.message, userId });
      // Retornar padrões em caso de erro
      return {
        user_id: userId,
        email_notifications: true,
        push_notifications: true,
        sms_notifications: false,
        notification_types: {},
        timezone: 'America/Sao_Paulo'
      };
    }
  }
  
  /**
   * Atualizar preferências de notificação
   */
  async updateUserPreferences(data: NotificationPreferences): Promise<NotificationPreferences> {
    try {
      // Validar dados de entrada
      const validatedData = NotificationPreferencesSchema.parse(data);
      
      logger.info('Atualizando preferências de notificação', { userId: validatedData.user_id });
      
      // Upsert preferências
      const { data: preferences, error } = await supabase
        .from('notification_preferences')
        .upsert(validatedData)
        .select()
        .single();
      
      if (error) {
        logger.error('Erro ao atualizar preferências', { error: error.message, data: validatedData });
        throw new Error(`Erro ao atualizar preferências: ${error.message}`);
      }
      
      logger.info('Preferências atualizadas com sucesso', { userId: validatedData.user_id });
      
      return preferences;
    } catch (error) {
      logger.error('Erro no NotificationService.updateUserPreferences', { error: error.message, data });
      throw error;
    }
  }
  
  /**
   * Verificar se deve enviar notificação baseado nas preferências
   */
  private shouldSendNotification(type: string, preferences: NotificationPreferences): boolean {
    try {
      // Verificar se o tipo específico está habilitado
      if (preferences.notification_types[type] === false) {
        return false;
      }
      
      // Verificar horário de silêncio
      if (preferences.quiet_hours_start && preferences.quiet_hours_end) {
        const now = new Date();
        const currentTime = now.toLocaleTimeString('pt-BR', { 
          hour12: false, 
          hour: '2-digit', 
          minute: '2-digit',
          timeZone: preferences.timezone
        });
        
        const quietStart = preferences.quiet_hours_start;
        const quietEnd = preferences.quiet_hours_end;
        
        // Verificar se está no horário de silêncio
        if (quietStart <= quietEnd) {
          // Mesmo dia
          if (currentTime >= quietStart && currentTime <= quietEnd) {
            return false;
          }
        } else {
          // Atravessa meia-noite
          if (currentTime >= quietStart || currentTime <= quietEnd) {
            return false;
          }
        }
      }
      
      return true;
    } catch (error) {
      logger.error('Erro ao verificar se deve enviar notificação', { error: error.message, type });
      return true; // Em caso de erro, enviar por segurança
    }
  }
  
  /**
   * Enviar notificação em tempo real
   */
  private async sendRealTimeNotification(notification: Notification): Promise<void> {
    try {
      // TODO: Implementar WebSocket, Push Notifications, etc.
      logger.info('Enviando notificação em tempo real', { 
        id: notification.id,
        userId: notification.user_id,
        type: notification.type
      });
      
      // Placeholder para implementação futura de:
      // - WebSocket para notificações em tempo real
      // - Push notifications para mobile
      // - Email notifications
      // - SMS notifications
      
    } catch (error) {
      logger.error('Erro ao enviar notificação em tempo real', { 
        error: error.message, 
        notificationId: notification.id 
      });
      // Não falhar se notificação em tempo real falhar
    }
  }
  
  /**
   * Limpar notificações expiradas
   */
  async cleanupExpiredNotifications(): Promise<number> {
    try {
      logger.info('Limpando notificações expiradas');
      
      const { data: deletedNotifications, error } = await supabase
        .from('notifications')
        .delete()
        .lt('expires_at', new Date().toISOString())
        .select('id');
      
      if (error) {
        logger.error('Erro ao limpar notificações expiradas', { error: error.message });
        throw new Error(`Erro ao limpar notificações: ${error.message}`);
      }
      
      const deletedCount = deletedNotifications?.length || 0;
      
      logger.info('Notificações expiradas limpas', { count: deletedCount });
      
      return deletedCount;
    } catch (error) {
      logger.error('Erro no NotificationService.cleanupExpiredNotifications', { error: error.message });
      return 0;
    }
  }
}

export const notificationService = new NotificationService();