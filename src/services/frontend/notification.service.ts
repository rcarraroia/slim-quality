import { supabase } from '@/config/supabase';

export interface Notification {
  id: string;
  affiliate_id: string;
  type: 'payment_reminder' | 'payment_confirmed' | 'overdue' | 'regularized';
  title: string;
  message: string;
  link?: string;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationListResponse {
  notifications: Notification[];
  unreadCount: number;
}

class NotificationService {
  /**
   * Lista notificações do afiliado logado
   */
  async list(): Promise<NotificationListResponse> {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('Usuário não autenticado');
    }

    const response = await fetch('/api/admin?action=list', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro ao listar notificações');
    }

    const data = await response.json();
    return {
      notifications: data.notifications,
      unreadCount: data.unreadCount
    };
  }

  /**
   * Marca uma notificação como lida
   */
  async markAsRead(notificationId: string): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('Usuário não autenticado');
    }

    const response = await fetch('/api/admin?action=mark-read', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        notification_id: notificationId
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro ao marcar notificação como lida');
    }
  }

  /**
   * Marca todas as notificações como lidas
   */
  async markAllAsRead(): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('Usuário não autenticado');
    }

    const response = await fetch('/api/admin?action=mark-all-read', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro ao marcar todas as notificações como lidas');
    }
  }

  /**
   * Formata data relativa (ex: "há 2 horas")
   */
  formatRelativeTime(date: string): string {
    const now = new Date();
    const notificationDate = new Date(date);
    const diffInSeconds = Math.floor((now.getTime() - notificationDate.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return 'agora mesmo';
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return `há ${diffInMinutes} ${diffInMinutes === 1 ? 'minuto' : 'minutos'}`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `há ${diffInHours} ${diffInHours === 1 ? 'hora' : 'horas'}`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
      return `há ${diffInDays} ${diffInDays === 1 ? 'dia' : 'dias'}`;
    }

    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4) {
      return `há ${diffInWeeks} ${diffInWeeks === 1 ? 'semana' : 'semanas'}`;
    }

    return notificationDate.toLocaleDateString('pt-BR');
  }

  /**
   * Retorna ícone baseado no tipo de notificação
   */
  getNotificationIcon(type: Notification['type']): string {
    const icons = {
      payment_reminder: 'Clock',
      payment_confirmed: 'CheckCircle',
      overdue: 'AlertCircle',
      regularized: 'CheckCircle'
    };
    return icons[type] || 'Bell';
  }

  /**
   * Retorna cor baseada no tipo de notificação
   */
  getNotificationColor(type: Notification['type']): string {
    const colors = {
      payment_reminder: 'text-yellow-600',
      payment_confirmed: 'text-green-600',
      overdue: 'text-red-600',
      regularized: 'text-green-600'
    };
    return colors[type] || 'text-muted-foreground';
  }
}

export const notificationService = new NotificationService();
