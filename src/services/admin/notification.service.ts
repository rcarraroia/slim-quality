/**
 * Serviço de Notificações Admin
 * FASE 3 - Sistema de Notificações
 * Consumo dos endpoints backend de notificações
 */

import { apiService, ApiResponse } from '../api.service';

// ========================================
// TIPOS E INTERFACES
// ========================================

export interface NotificationLog {
  id: string;
  affiliate_id: string | null;
  type: 'commission_paid' | 'withdrawal_processed' | 'broadcast';
  title: string;
  message: string;
  read_at: string | null;
  created_at: string;
  metadata?: Record<string, any>;
}

export interface CreateBroadcastRequest {
  title: string;
  message: string;
  target_affiliates?: string[]; // Se vazio, envia para todos
}

export interface BroadcastSent {
  id: string;
  title: string;
  message: string;
  sent_count: number;
  created_at: string;
  created_by: string;
}

export interface UnreadCountResponse {
  count: number;
}

// ========================================
// SERVIÇO
// ========================================

class AdminNotificationService {
  /**
   * Listar notificações enviadas (broadcasts)
   * GET /api/admin/notifications?action=sent
   */
  async listSentNotifications(
    page: number = 1,
    limit: number = 20
  ): Promise<ApiResponse<{ notifications: BroadcastSent[]; total: number; page: number; limit: number }>> {
    return apiService.get<any>(`/admin/notifications?action=sent&page=${page}&limit=${limit}`);
  }

  /**
   * Criar notificação broadcast
   * POST /api/admin/notifications?action=create
   */
  async createBroadcast(data: CreateBroadcastRequest): Promise<ApiResponse<{ message: string; sent_count: number }>> {
    return apiService.post<any>('/admin/notifications?action=create', data);
  }

  /**
   * Obter estatísticas de notificações
   * Para dashboard admin
   */
  async getNotificationStats(): Promise<ApiResponse<{
    total_sent: number;
    total_read: number;
    read_rate: number;
    by_type: Record<string, number>;
  }>> {
    return apiService.get<any>('/admin/notifications/stats');
  }
}

export const adminNotificationService = new AdminNotificationService();
export default adminNotificationService;
