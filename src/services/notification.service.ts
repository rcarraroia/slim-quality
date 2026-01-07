/**
 * Serviço de Notificações
 * BLOCO 5 - Integrações
 */

import { apiService, ApiResponse } from './api.service';

export interface EmailNotification {
  to: string;
  subject: string;
  template: string;
  data: Record<string, any>;
}

export interface NotificationPreferences {
  emailEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;
  affiliateApproval: boolean;
  commissionPaid: boolean;
  withdrawalProcessed: boolean;
}

class NotificationService {
  /**
   * Enviar notificação de afiliado aprovado
   */
  async notifyAffiliateApproved(affiliateId: string, affiliateEmail: string, affiliateName: string): Promise<ApiResponse<{ message: string }>> {
    return apiService.post<{ message: string }>('/notifications/affiliate-approved', {
      affiliateId,
      affiliateEmail,
      affiliateName
    });
  }

  /**
   * Enviar notificação de afiliado rejeitado
   */
  async notifyAffiliateRejected(affiliateId: string, affiliateEmail: string, reason: string): Promise<ApiResponse<{ message: string }>> {
    return apiService.post<{ message: string }>('/notifications/affiliate-rejected', {
      affiliateId,
      affiliateEmail,
      reason
    });
  }

  /**
   * Enviar notificação de comissão aprovada
   */
  async notifyCommissionApproved(commissionId: string, affiliateEmail: string, amount: number): Promise<ApiResponse<{ message: string }>> {
    return apiService.post<{ message: string }>('/notifications/commission-approved', {
      commissionId,
      affiliateEmail,
      amount
    });
  }

  /**
   * Enviar notificação de comissão paga
   */
  async notifyCommissionPaid(commissionId: string, affiliateEmail: string, amount: number): Promise<ApiResponse<{ message: string }>> {
    return apiService.post<{ message: string }>('/notifications/commission-paid', {
      commissionId,
      affiliateEmail,
      amount
    });
  }

  /**
   * Enviar notificação de saque aprovado
   */
  async notifyWithdrawalApproved(withdrawalId: string, affiliateEmail: string, amount: number): Promise<ApiResponse<{ message: string }>> {
    return apiService.post<{ message: string }>('/notifications/withdrawal-approved', {
      withdrawalId,
      affiliateEmail,
      amount
    });
  }

  /**
   * Enviar notificação de saque rejeitado
   */
  async notifyWithdrawalRejected(withdrawalId: string, affiliateEmail: string, reason: string): Promise<ApiResponse<{ message: string }>> {
    return apiService.post<{ message: string }>('/notifications/withdrawal-rejected', {
      withdrawalId,
      affiliateEmail,
      reason
    });
  }

  /**
   * Enviar email customizado
   */
  async sendCustomEmail(notification: EmailNotification): Promise<ApiResponse<{ message: string }>> {
    return apiService.post<{ message: string }>('/notifications/custom-email', notification);
  }

  /**
   * Buscar preferências de notificação
   */
  async getPreferences(userId: string): Promise<ApiResponse<NotificationPreferences>> {
    return apiService.get<NotificationPreferences>(`/notifications/preferences/${userId}`);
  }

  /**
   * Atualizar preferências de notificação
   */
  async updatePreferences(userId: string, preferences: Partial<NotificationPreferences>): Promise<ApiResponse<{ message: string }>> {
    return apiService.put<{ message: string }>(`/notifications/preferences/${userId}`, preferences);
  }

  /**
   * Testar envio de notificação
   */
  async testNotification(type: string, email: string): Promise<ApiResponse<{ message: string }>> {
    return apiService.post<{ message: string }>('/notifications/test', {
      type,
      email
    });
  }
}

export const notificationService = new NotificationService();
export default notificationService;