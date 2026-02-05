/**
 * Regularization Scheduler Service
 * Sistema de Validação por CPF/CNPJ para Afiliados
 * 
 * Gerencia agendamento automático de lembretes de regularização
 */

import { notificationService } from './notification.service';
import { emailTemplatesService } from './email-templates.service';
import { apiService } from './api.service';

export interface ScheduledReminder {
  id: string;
  affiliateId: string;
  affiliateName: string;
  affiliateEmail: string;
  reminderType: 'normal' | 'warning' | 'urgent' | 'expired';
  scheduledFor: Date;
  daysRemaining: number;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  attempts: number;
  lastAttempt?: Date;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReminderJobData {
  affiliateId: string;
  affiliateName: string;
  affiliateEmail: string;
  expiresAt: string;
  daysRemaining: number;
  reminderType: 'normal' | 'warning' | 'urgent' | 'expired';
}

class RegularizationSchedulerService {
  
  /**
   * Criar agendamento completo de lembretes para um afiliado
   * Cria todos os lembretes necessários baseado na data de expiração
   */
  async createReminderSchedule(
    affiliateId: string, 
    affiliateName: string, 
    affiliateEmail: string, 
    expiresAt: Date
  ): Promise<{ success: boolean; jobIds: string[]; error?: string }> {
    try {
      const now = new Date();
      const expiration = new Date(expiresAt);
      const totalDays = Math.ceil((expiration.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      const jobIds: string[] = [];
      
      // Definir cronograma de lembretes baseado no tempo restante
      const reminderSchedule = this.calculateReminderSchedule(totalDays, expiration);
      
      for (const reminder of reminderSchedule) {
        const jobId = await this.scheduleReminder({
          affiliateId,
          affiliateName,
          affiliateEmail,
          expiresAt: expiration.toISOString(),
          daysRemaining: reminder.daysRemaining,
          reminderType: reminder.type
        }, reminder.scheduledFor);
        
        if (jobId) {
          jobIds.push(jobId);
        }
      }
      
      return { success: true, jobIds };
    } catch (error) {
      console.error('Erro ao criar agendamento de lembretes:', error);
      return { 
        success: false, 
        jobIds: [], 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      };
    }
  }
  
  /**
   * Calcular cronograma de lembretes baseado no tempo total disponível
   */
  private calculateReminderSchedule(totalDays: number, expiresAt: Date): Array<{
    type: 'normal' | 'warning' | 'urgent' | 'expired';
    daysRemaining: number;
    scheduledFor: Date;
  }> {
    const schedule: Array<{
      type: 'normal' | 'warning' | 'urgent' | 'expired';
      daysRemaining: number;
      scheduledFor: Date;
    }> = [];
    
    const now = new Date();
    
    // Lembrete normal - se tiver mais de 15 dias, enviar no meio do período
    if (totalDays > 15) {
      const normalReminderDays = Math.floor(totalDays / 2);
      const normalDate = new Date(expiresAt);
      normalDate.setDate(normalDate.getDate() - normalReminderDays);
      
      if (normalDate > now) {
        schedule.push({
          type: 'normal',
          daysRemaining: normalReminderDays,
          scheduledFor: normalDate
        });
      }
    }
    
    // Lembrete de aviso - 7 dias antes
    if (totalDays > 7) {
      const warningDate = new Date(expiresAt);
      warningDate.setDate(warningDate.getDate() - 7);
      
      if (warningDate > now) {
        schedule.push({
          type: 'warning',
          daysRemaining: 7,
          scheduledFor: warningDate
        });
      }
    }
    
    // Lembrete urgente - 3 dias antes
    if (totalDays > 3) {
      const urgentDate = new Date(expiresAt);
      urgentDate.setDate(urgentDate.getDate() - 3);
      
      if (urgentDate > now) {
        schedule.push({
          type: 'urgent',
          daysRemaining: 3,
          scheduledFor: urgentDate
        });
      }
    }
    
    // Lembrete final - 1 dia antes
    if (totalDays > 1) {
      const finalDate = new Date(expiresAt);
      finalDate.setDate(finalDate.getDate() - 1);
      
      if (finalDate > now) {
        schedule.push({
          type: 'urgent',
          daysRemaining: 1,
          scheduledFor: finalDate
        });
      }
    }
    
    // Notificação de expiração - no dia do vencimento
    schedule.push({
      type: 'expired',
      daysRemaining: 0,
      scheduledFor: expiresAt
    });
    
    return schedule.sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime());
  }
  
  /**
   * Agendar um lembrete específico
   */
  private async scheduleReminder(jobData: ReminderJobData, scheduledFor: Date): Promise<string | null> {
    try {
      // Simular agendamento de job (em produção seria com Redis/Bull/Agenda)
      const jobId = `reminder_${jobData.affiliateId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Salvar job no banco de dados para processamento posterior
      await apiService.post('/jobs/schedule-reminder', {
        jobId,
        jobData,
        scheduledFor: scheduledFor.toISOString(),
        type: 'regularization_reminder',
        status: 'scheduled'
      });
      
      console.log(`Lembrete agendado: ${jobId} para ${scheduledFor.toISOString()}`);
      return jobId;
    } catch (error) {
      console.error('Erro ao agendar lembrete:', error);
      return null;
    }
  }
  
  /**
   * Processar lembrete agendado
   * Chamado quando o job scheduler executa um lembrete
   */
  async processScheduledReminder(jobId: string, jobData: ReminderJobData): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`Processando lembrete: ${jobId} para afiliado ${jobData.affiliateId}`);
      
      // Verificar se afiliado ainda precisa de regularização
      const affiliateStatus = await this.checkAffiliateRegularizationStatus(jobData.affiliateId);
      
      if (affiliateStatus.isRegularized) {
        console.log(`Afiliado ${jobData.affiliateId} já regularizado, cancelando lembrete`);
        await this.markJobAsCompleted(jobId, 'cancelled', 'Afiliado já regularizado');
        return { success: true };
      }
      
      if (!affiliateStatus.isActive) {
        console.log(`Afiliado ${jobData.affiliateId} inativo, cancelando lembrete`);
        await this.markJobAsCompleted(jobId, 'cancelled', 'Afiliado inativo');
        return { success: true };
      }
      
      // Recalcular dias restantes
      const now = new Date();
      const expiresAt = new Date(jobData.expiresAt);
      const daysRemaining = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      // Enviar lembrete apropriado
      let result;
      
      if (jobData.reminderType === 'expired') {
        // Processar expiração
        result = await this.processExpiredRegularization(jobData);
      } else {
        // Enviar lembrete
        result = await this.sendRegularizationReminder({
          ...jobData,
          daysRemaining: Math.max(0, daysRemaining)
        });
      }
      
      if (result.success) {
        await this.markJobAsCompleted(jobId, 'sent');
        return { success: true };
      } else {
        await this.markJobAsCompleted(jobId, 'failed', result.error);
        return { success: false, error: result.error };
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error(`Erro ao processar lembrete ${jobId}:`, error);
      await this.markJobAsCompleted(jobId, 'failed', errorMessage);
      return { success: false, error: errorMessage };
    }
  }
  
  /**
   * Enviar lembrete de regularização
   */
  private async sendRegularizationReminder(data: ReminderJobData): Promise<{ success: boolean; error?: string }> {
    try {
      const reminderData = {
        affiliateId: data.affiliateId,
        affiliateName: data.affiliateName,
        affiliateEmail: data.affiliateEmail,
        daysRemaining: data.daysRemaining,
        expiresAt: data.expiresAt,
        reminderCount: 1 // TODO: Implementar contador real
      };
      
      let response;
      
      switch (data.reminderType) {
        case 'normal':
          response = await notificationService.notifyRegularizationReminder(reminderData);
          break;
        case 'warning':
        case 'urgent':
          response = await notificationService.notifyRegularizationReminder(reminderData);
          break;
        default:
          throw new Error(`Tipo de lembrete inválido: ${data.reminderType}`);
      }
      
      if (response.success) {
        console.log(`Lembrete enviado com sucesso para ${data.affiliateEmail}`);
        return { success: true };
      } else {
        return { success: false, error: response.error || 'Erro ao enviar lembrete' };
      }
      
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      };
    }
  }
  
  /**
   * Processar expiração de regularização
   */
  private async processExpiredRegularization(data: ReminderJobData): Promise<{ success: boolean; error?: string }> {
    try {
      // Suspender afiliado
      await apiService.put(`/affiliates/${data.affiliateId}/suspend`, {
        reason: 'Prazo de regularização expirado',
        suspendedAt: new Date().toISOString()
      });
      
      // Enviar notificação de expiração
      const response = await notificationService.notifyRegularizationExpired({
        affiliateId: data.affiliateId,
        affiliateName: data.affiliateName,
        affiliateEmail: data.affiliateEmail,
        daysRemaining: 0,
        expiresAt: data.expiresAt,
        reminderCount: 0
      });
      
      if (response.success) {
        console.log(`Afiliado ${data.affiliateId} suspenso e notificado`);
        return { success: true };
      } else {
        return { success: false, error: response.error || 'Erro ao processar expiração' };
      }
      
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      };
    }
  }
  
  /**
   * Verificar status de regularização do afiliado
   */
  private async checkAffiliateRegularizationStatus(affiliateId: string): Promise<{
    isRegularized: boolean;
    isActive: boolean;
    document?: string;
    documentType?: string;
  }> {
    try {
      const response = await apiService.get(`/affiliates/${affiliateId}/regularization-status`);
      
      if (response.success && response.data) {
        return {
          isRegularized: !!response.data.document,
          isActive: response.data.isActive !== false,
          document: response.data.document,
          documentType: response.data.documentType
        };
      }
      
      return { isRegularized: false, isActive: true };
    } catch (error) {
      console.error(`Erro ao verificar status do afiliado ${affiliateId}:`, error);
      return { isRegularized: false, isActive: true };
    }
  }
  
  /**
   * Marcar job como concluído
   */
  private async markJobAsCompleted(jobId: string, status: 'sent' | 'failed' | 'cancelled', error?: string): Promise<void> {
    try {
      await apiService.put(`/jobs/${jobId}/complete`, {
        status,
        completedAt: new Date().toISOString(),
        error
      });
    } catch (err) {
      console.error(`Erro ao marcar job ${jobId} como concluído:`, err);
    }
  }
  
  /**
   * Cancelar todos os lembretes de um afiliado
   * Usado quando afiliado regulariza antes do prazo
   */
  async cancelAffiliateReminders(affiliateId: string): Promise<{ success: boolean; cancelledCount: number }> {
    try {
      const response = await apiService.delete(`/jobs/affiliate/${affiliateId}/reminders`);
      
      if (response.success) {
        console.log(`Lembretes cancelados para afiliado ${affiliateId}: ${response.data.cancelledCount}`);
        return { success: true, cancelledCount: response.data.cancelledCount || 0 };
      }
      
      return { success: false, cancelledCount: 0 };
    } catch (error) {
      console.error(`Erro ao cancelar lembretes do afiliado ${affiliateId}:`, error);
      return { success: false, cancelledCount: 0 };
    }
  }
  
  /**
   * Obter estatísticas de lembretes
   */
  async getReminderStats(startDate?: string, endDate?: string): Promise<{
    total: number;
    pending: number;
    sent: number;
    failed: number;
    cancelled: number;
    byType: Record<string, number>;
  }> {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const response = await apiService.get(`/jobs/reminder-stats?${params.toString()}`);
      
      if (response.success) {
        return response.data;
      }
      
      return {
        total: 0,
        pending: 0,
        sent: 0,
        failed: 0,
        cancelled: 0,
        byType: {}
      };
    } catch (error) {
      console.error('Erro ao obter estatísticas de lembretes:', error);
      return {
        total: 0,
        pending: 0,
        sent: 0,
        failed: 0,
        cancelled: 0,
        byType: {}
      };
    }
  }
  
  /**
   * Processar jobs pendentes
   * Executado periodicamente para processar lembretes que devem ser enviados
   */
  async processScheduledJobs(): Promise<{
    processed: number;
    successful: number;
    failed: number;
    details: Array<{ jobId: string; status: 'success' | 'failed'; error?: string }>;
  }> {
    try {
      console.log('Processando jobs de lembrete agendados...');
      
      // Buscar jobs pendentes que devem ser executados agora
      const response = await apiService.get('/jobs/pending-reminders');
      
      if (!response.success || !response.data?.jobs) {
        return { processed: 0, successful: 0, failed: 0, details: [] };
      }
      
      const jobs = response.data.jobs;
      const results = [];
      let successful = 0;
      let failed = 0;
      
      for (const job of jobs) {
        try {
          const result = await this.processScheduledReminder(job.id, job.data);
          
          if (result.success) {
            successful++;
            results.push({ jobId: job.id, status: 'success' as const });
          } else {
            failed++;
            results.push({ jobId: job.id, status: 'failed' as const, error: result.error });
          }
        } catch (error) {
          failed++;
          results.push({ 
            jobId: job.id, 
            status: 'failed' as const, 
            error: error instanceof Error ? error.message : 'Erro desconhecido' 
          });
        }
      }
      
      console.log(`Jobs processados: ${jobs.length}, Sucessos: ${successful}, Falhas: ${failed}`);
      
      return {
        processed: jobs.length,
        successful,
        failed,
        details: results
      };
      
    } catch (error) {
      console.error('Erro ao processar jobs agendados:', error);
      return { processed: 0, successful: 0, failed: 0, details: [] };
    }
  }
}

export const regularizationSchedulerService = new RegularizationSchedulerService();
export default regularizationSchedulerService;