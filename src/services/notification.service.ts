/**
 * Serviço de Notificações
 * BLOCO 5 - Integrações
 * Estendido com funcionalidades de CPF/CNPJ
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
  documentRegularization: boolean; // Novo
}

// Novos tipos para notificações de CPF/CNPJ
export interface RegularizationNotificationData {
  affiliateId: string;
  affiliateName: string;
  affiliateEmail: string;
  daysRemaining: number;
  expiresAt: string;
  reminderCount: number;
}

export interface DocumentValidationNotificationData {
  affiliateId: string;
  affiliateName: string;
  affiliateEmail: string;
  document: string;
  documentType: 'CPF' | 'CNPJ';
  validationResult: 'success' | 'failed';
  asaasResult?: any;
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

  // ========================================
  // NOVAS FUNCIONALIDADES CPF/CNPJ
  // ========================================

  /**
   * Enviar notificação inicial de regularização
   * Enviada quando processo de regularização é iniciado
   */
  async notifyRegularizationStarted(data: RegularizationNotificationData): Promise<ApiResponse<{ message: string }>> {
    return apiService.post<{ message: string }>('/notifications/regularization-started', {
      ...data,
      template: 'regularization-started',
      subject: 'Ação Necessária: Regularize seu documento CPF/CNPJ'
    });
  }

  /**
   * Enviar lembrete de regularização
   * Enviado periodicamente até regularização ser concluída
   */
  async notifyRegularizationReminder(data: RegularizationNotificationData): Promise<ApiResponse<{ message: string }>> {
    const urgencyLevel = data.daysRemaining <= 7 ? 'urgent' : 
                        data.daysRemaining <= 15 ? 'warning' : 'normal';
    
    return apiService.post<{ message: string }>('/notifications/regularization-reminder', {
      ...data,
      urgencyLevel,
      template: `regularization-reminder-${urgencyLevel}`,
      subject: data.daysRemaining <= 7 
        ? `URGENTE: ${data.daysRemaining} dias para regularizar seu documento`
        : `Lembrete: Regularize seu documento CPF/CNPJ`
    });
  }

  /**
   * Enviar notificação de prazo expirado
   * Enviada quando prazo de regularização expira
   */
  async notifyRegularizationExpired(data: RegularizationNotificationData): Promise<ApiResponse<{ message: string }>> {
    return apiService.post<{ message: string }>('/notifications/regularization-expired', {
      ...data,
      template: 'regularization-expired',
      subject: 'Conta Suspensa: Prazo de regularização expirado'
    });
  }

  /**
   * Enviar notificação de regularização concluída
   * Enviada quando afiliado cadastra documento com sucesso
   */
  async notifyRegularizationCompleted(data: DocumentValidationNotificationData): Promise<ApiResponse<{ message: string }>> {
    return apiService.post<{ message: string }>('/notifications/regularization-completed', {
      ...data,
      template: 'regularization-completed',
      subject: 'Parabéns! Seu documento foi regularizado com sucesso'
    });
  }

  /**
   * Enviar notificação de validação Asaas concluída
   * Enviada quando validação assíncrona com Asaas é finalizada
   */
  async notifyAsaasValidationCompleted(data: DocumentValidationNotificationData): Promise<ApiResponse<{ message: string }>> {
    const isSuccess = data.validationResult === 'success';
    
    return apiService.post<{ message: string }>('/notifications/asaas-validation-completed', {
      ...data,
      template: isSuccess ? 'asaas-validation-success' : 'asaas-validation-failed',
      subject: isSuccess 
        ? 'Validação Asaas: Documento confirmado pela Receita Federal'
        : 'Validação Asaas: Problema na validação do documento'
    });
  }

  /**
   * Enviar notificação de conta reativada
   * Enviada quando conta suspensa é reativada após regularização
   */
  async notifyAccountReactivated(affiliateId: string, affiliateEmail: string, affiliateName: string): Promise<ApiResponse<{ message: string }>> {
    return apiService.post<{ message: string }>('/notifications/account-reactivated', {
      affiliateId,
      affiliateEmail,
      affiliateName,
      template: 'account-reactivated',
      subject: 'Conta Reativada: Bem-vindo de volta!'
    });
  }

  /**
   * Agendar lembretes automáticos de regularização
   * Configura job scheduler para enviar lembretes periódicos
   */
  async scheduleRegularizationReminders(affiliateId: string, expiresAt: string): Promise<ApiResponse<{ jobIds: string[] }>> {
    return apiService.post<{ jobIds: string[] }>('/notifications/schedule-regularization-reminders', {
      affiliateId,
      expiresAt,
      reminderSchedule: [
        { days: 7, type: 'warning' },   // 7 dias antes
        { days: 3, type: 'urgent' },    // 3 dias antes
        { days: 1, type: 'final' },     // 1 dia antes
        { days: 0, type: 'expired' }    // No dia do vencimento
      ]
    });
  }

  /**
   * Processar job de lembrete de regularização
   * Chamado pelo job scheduler para enviar lembretes automáticos
   */
  async processRegularizationReminderJob(jobData: {
    affiliateId: string;
    reminderType: 'normal' | 'warning' | 'urgent' | 'expired';
    daysRemaining: number;
  }): Promise<ApiResponse<{ message: string }>> {
    return apiService.post<{ message: string }>('/notifications/process-regularization-reminder-job', jobData);
  }

  /**
   * Verificar e processar lembretes pendentes
   * Executado periodicamente para verificar lembretes que devem ser enviados
   */
  async processScheduledReminders(): Promise<ApiResponse<{ 
    processed: number; 
    failed: number; 
    details: Array<{ affiliateId: string; status: 'sent' | 'failed'; error?: string }> 
  }>> {
    return apiService.post<any>('/notifications/process-scheduled-reminders', {});
  }

  /**
   * Obter próximos lembretes agendados
   * Para dashboard administrativo e monitoramento
   */
  async getScheduledReminders(limit: number = 50): Promise<ApiResponse<Array<{
    id: string;
    affiliateId: string;
    affiliateName: string;
    reminderType: string;
    scheduledFor: string;
    daysRemaining: number;
    status: 'pending' | 'sent' | 'failed';
  }>>> {
    return apiService.get<any>(`/notifications/scheduled-reminders?limit=${limit}`);
  }

  /**
   * Reprocessar lembrete falhado
   * Para casos onde o envio falhou e precisa ser reenviado
   */
  async retryFailedReminder(reminderId: string): Promise<ApiResponse<{ message: string }>> {
    return apiService.post<{ message: string }>(`/notifications/retry-reminder/${reminderId}`, {});
  }

  /**
   * Cancelar lembretes de regularização
   * Cancela jobs agendados quando regularização é concluída
   */
  async cancelRegularizationReminders(affiliateId: string): Promise<ApiResponse<{ message: string }>> {
    return apiService.delete<{ message: string }>(`/notifications/regularization-reminders/${affiliateId}`);
  }

  /**
   * Obter estatísticas de notificações de regularização
   * Para dashboard administrativo
   */
  async getRegularizationNotificationStats(startDate?: string, endDate?: string): Promise<ApiResponse<{
    total: number;
    sent: number;
    failed: number;
    opened: number;
    clicked: number;
    byType: Record<string, number>;
  }>> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    return apiService.get<any>(`/notifications/regularization-stats?${params.toString()}`);
  }

  /**
   * Testar template de regularização
   * Para validar templates antes de usar em produção
   */
  async testRegularizationTemplate(templateType: string, email: string, mockData: any): Promise<ApiResponse<{ message: string }>> {
    return apiService.post<{ message: string }>('/notifications/test-regularization-template', {
      templateType,
      email,
      mockData
    });
  }

  // ========================================
  // MÉTODOS EXISTENTES (mantidos)
  // ========================================

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