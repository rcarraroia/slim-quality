/**
 * Regularization Service
 * Sistema de Validação por CPF/CNPJ para Afiliados
 * 
 * Responsável por gerenciar o processo de regularização de afiliados existentes
 * que não possuem documento cadastrado. Inclui criação de solicitações,
 * envio de lembretes e suspensão automática após prazo.
 * 
 * @example
 * ```typescript
 * const service = new RegularizationService();
 * await service.createRegularizationRequest('affiliate_123');
 * ```
 */

import { supabase } from '../config/supabase';
import { documentValidationService } from './document-validation.service';
import { regularizationSchedulerService } from './regularization-scheduler.service';
import { notificationService } from './notification.service';

export interface RegularizationRequest {
  id?: string;
  affiliate_id: string;
  status: 'pending' | 'completed' | 'expired' | 'cancelled';
  reminder_count: number;
  last_reminder_at?: string;
  expires_at: string;
  completed_at?: string;
  completion_method?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface RegularizationStatus {
  hasRequest: boolean;
  request?: RegularizationRequest;
  daysRemaining: number;
  isExpired: boolean;
  canComplete: boolean;
  affiliate: {
    id: string;
    name: string;
    email: string;
    document?: string;
    document_type?: string;
    is_active: boolean;
  };
}

export interface RegularizationStats {
  total: number;
  pending: number;
  completed: number;
  expired: number;
  expiringSoon: number; // próximos 7 dias
}

export class RegularizationService {

  /**
   * Cria uma solicitação de regularização para um afiliado
   * @param affiliateId ID do afiliado
   * @param daysToExpire Dias para expirar (padrão: 30)
   * @returns ID da solicitação criada
   */
  async createRegularizationRequest(
    affiliateId: string, 
    daysToExpire: number = 30
  ): Promise<string | null> {
    try {
      // Verificar se afiliado existe e não tem documento
      const { data: affiliate, error: affiliateError } = await supabase
        .from('affiliates')
        .select('id, name, email, document, document_type, is_active')
        .eq('id', affiliateId)
        .single();

      if (affiliateError || !affiliate) {
        console.error('Afiliado não encontrado:', affiliateError);
        return null;
      }

      // Se já tem documento, não precisa regularizar
      if (affiliate.document && affiliate.document_type) {
        console.log('Afiliado já possui documento cadastrado');
        return null;
      }

      // Verificar se já existe solicitação ativa
      const { data: existingRequest } = await supabase
        .from('regularization_requests')
        .select('id, status')
        .eq('affiliate_id', affiliateId)
        .in('status', ['pending'])
        .single();

      if (existingRequest) {
        console.log('Já existe solicitação ativa para este afiliado');
        return existingRequest.id;
      }

      // Calcular data de expiração
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + daysToExpire);

      // Criar solicitação
      const { data: request, error: requestError } = await supabase
        .from('regularization_requests')
        .insert([{
          affiliate_id: affiliateId,
          status: 'pending',
          reminder_count: 0,
          expires_at: expiresAt.toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select('id')
        .single();

      if (requestError) {
        console.error('Erro ao criar solicitação de regularização:', requestError);
        return null;
      }

      // Atualizar campos do afiliado
      await supabase
        .from('affiliates')
        .update({
          regularization_deadline: expiresAt.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', affiliateId);

      console.log(`Solicitação de regularização criada para afiliado ${affiliateId}`);
      
      // Agendar lembretes automáticos
      const scheduleResult = await regularizationSchedulerService.createReminderSchedule(
        affiliateId,
        affiliate.name,
        affiliate.email,
        expiresAt
      );
      
      if (scheduleResult.success) {
        console.log(`Lembretes agendados para afiliado ${affiliateId}: ${scheduleResult.jobIds.length} jobs`);
      } else {
        console.error(`Erro ao agendar lembretes para afiliado ${affiliateId}:`, scheduleResult.error);
      }
      
      // Enviar notificação inicial
      await notificationService.notifyRegularizationStarted({
        affiliateId,
        affiliateName: affiliate.name,
        affiliateEmail: affiliate.email,
        daysRemaining: daysToExpire,
        expiresAt: expiresAt.toISOString(),
        reminderCount: 0
      });
      
      return request?.id || null;

    } catch (error) {
      console.error('Erro ao criar solicitação de regularização:', error);
      return null;
    }
  }

  /**
   * Processa a regularização de um afiliado (quando ele cadastra documento)
   * @param affiliateId ID do afiliado
   * @param document Documento cadastrado
   * @param documentType Tipo do documento (CPF/CNPJ)
   * @returns true se processado com sucesso
   */
  async processRegularization(
    affiliateId: string,
    document: string,
    documentType: 'CPF' | 'CNPJ'
  ): Promise<boolean> {
    try {
      // Validar documento primeiro
      const validationResult = await documentValidationService.validateDocument(
        document, 
        affiliateId
      );

      if (!validationResult.isValid) {
        console.error('Documento inválido para regularização:', validationResult.errors);
        return false;
      }

      // Buscar solicitação ativa
      const { data: request, error: requestError } = await supabase
        .from('regularization_requests')
        .select('*')
        .eq('affiliate_id', affiliateId)
        .eq('status', 'pending')
        .single();

      if (requestError && requestError.code !== 'PGRST116') {
        console.error('Erro ao buscar solicitação:', requestError);
        return false;
      }

      const now = new Date().toISOString();

      // Atualizar afiliado com documento
      const { error: affiliateError } = await supabase
        .from('affiliates')
        .update({
          document: validationResult.document,
          document_type: documentType,
          document_validated_at: now,
          document_validation_source: 'regularization',
          regularization_deadline: null,
          updated_at: now
        })
        .eq('id', affiliateId);

      if (affiliateError) {
        console.error('Erro ao atualizar afiliado:', affiliateError);
        return false;
      }

      // Marcar solicitação como completa (se existir)
      if (request) {
        await supabase
          .from('regularization_requests')
          .update({
            status: 'completed',
            completed_at: now,
            completion_method: 'self_service',
            updated_at: now
          })
          .eq('id', request.id);
          
        // Cancelar lembretes agendados
        await regularizationSchedulerService.cancelAffiliateReminders(affiliateId);
        
        // Enviar notificação de conclusão
        await notificationService.notifyRegularizationCompleted({
          affiliateId,
          affiliateName: '', // Será preenchido pelo serviço
          affiliateEmail: '', // Será preenchido pelo serviço
          document: validationResult.document,
          documentType,
          validationResult: 'success'
        });
      }

      console.log(`Regularização processada com sucesso para afiliado ${affiliateId}`);
      return true;

    } catch (error) {
      console.error('Erro ao processar regularização:', error);
      return false;
    }
  }

  /**
   * Obtém o status de regularização de um afiliado
   * @param affiliateId ID do afiliado
   * @returns Status completo da regularização
   */
  async getRegularizationStatus(affiliateId: string): Promise<RegularizationStatus | null> {
    try {
      // Buscar dados do afiliado
      const { data: affiliate, error: affiliateError } = await supabase
        .from('affiliates')
        .select('id, name, email, document, document_type, is_active, regularization_deadline')
        .eq('id', affiliateId)
        .single();

      if (affiliateError || !affiliate) {
        console.error('Afiliado não encontrado:', affiliateError);
        return null;
      }

      // Buscar solicitação ativa
      const { data: request } = await supabase
        .from('regularization_requests')
        .select('*')
        .eq('affiliate_id', affiliateId)
        .in('status', ['pending', 'completed', 'expired'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const hasRequest = !!request;
      const now = new Date();
      let daysRemaining = 0;
      let isExpired = false;

      if (request && request.expires_at) {
        const expiresAt = new Date(request.expires_at);
        const diffTime = expiresAt.getTime() - now.getTime();
        daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        isExpired = daysRemaining <= 0;
      }

      const canComplete = hasRequest && 
                         request.status === 'pending' && 
                         !isExpired &&
                         !affiliate.document;

      return {
        hasRequest,
        request: request || undefined,
        daysRemaining: Math.max(0, daysRemaining),
        isExpired,
        canComplete,
        affiliate: {
          id: affiliate.id,
          name: affiliate.name,
          email: affiliate.email,
          document: affiliate.document,
          document_type: affiliate.document_type,
          is_active: affiliate.is_active
        }
      };

    } catch (error) {
      console.error('Erro ao obter status de regularização:', error);
      return null;
    }
  }

  /**
   * Envia lembrete de regularização para um afiliado
   * @param affiliateId ID do afiliado
   * @returns true se lembrete enviado com sucesso
   */
  async sendRegularizationReminder(affiliateId: string): Promise<boolean> {
    try {
      const status = await this.getRegularizationStatus(affiliateId);
      
      if (!status || !status.canComplete) {
        console.log('Afiliado não precisa de lembrete de regularização');
        return false;
      }

      // Atualizar contador de lembretes
      const { error: updateError } = await supabase
        .from('regularization_requests')
        .update({
          reminder_count: (status.request?.reminder_count || 0) + 1,
          last_reminder_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', status.request!.id);

      if (updateError) {
        console.error('Erro ao atualizar contador de lembretes:', updateError);
        return false;
      }

      // Registrar log de notificação
      await supabase
        .from('notification_logs')
        .insert([{
          affiliate_id: affiliateId,
          type: 'regularization_reminder',
          data: {
            days_remaining: status.daysRemaining,
            reminder_count: (status.request?.reminder_count || 0) + 1
          },
          channel: 'email',
          status: 'sent',
          recipient_email: status.affiliate.email,
          sent_at: new Date().toISOString()
        }]);

      console.log(`Lembrete de regularização enviado para afiliado ${affiliateId}`);
      return true;

    } catch (error) {
      console.error('Erro ao enviar lembrete:', error);
      return false;
    }
  }

  /**
   * Suspende afiliados que não regularizaram no prazo
   * @param dryRun Se true, apenas simula sem executar
   * @returns Lista de afiliados suspensos
   */
  async suspendUnregularizedAffiliates(dryRun: boolean = false): Promise<string[]> {
    try {
      const now = new Date().toISOString();
      
      // Buscar solicitações expiradas
      const { data: expiredRequests, error: requestsError } = await supabase
        .from('regularization_requests')
        .select(`
          id,
          affiliate_id,
          expires_at,
          affiliates!inner (
            id,
            name,
            email,
            document,
            is_active
          )
        `)
        .eq('status', 'pending')
        .lt('expires_at', now)
        .eq('affiliates.is_active', true)
        .is('affiliates.document', null);

      if (requestsError) {
        console.error('Erro ao buscar solicitações expiradas:', requestsError);
        return [];
      }

      if (!expiredRequests || expiredRequests.length === 0) {
        console.log('Nenhum afiliado para suspender');
        return [];
      }

      const suspendedAffiliates: string[] = [];

      for (const request of expiredRequests) {
        const affiliateId = request.affiliate_id;
        
        if (dryRun) {
          console.log(`[DRY RUN] Suspenderia afiliado: ${affiliateId}`);
          suspendedAffiliates.push(affiliateId);
          continue;
        }

        // Suspender afiliado
        const { error: suspendError } = await supabase
          .from('affiliates')
          .update({
            is_active: false,
            suspended_at: now,
            suspension_reason: 'Documento não regularizado no prazo',
            updated_at: now
          })
          .eq('id', affiliateId);

        if (suspendError) {
          console.error(`Erro ao suspender afiliado ${affiliateId}:`, suspendError);
          continue;
        }

        // Marcar solicitação como expirada
        await supabase
          .from('regularization_requests')
          .update({
            status: 'expired',
            updated_at: now
          })
          .eq('id', request.id);

        // Registrar log de notificação
        await supabase
          .from('notification_logs')
          .insert([{
            affiliate_id: affiliateId,
            type: 'account_suspended',
            data: {
              reason: 'document_not_regularized',
              suspended_at: now
            },
            channel: 'email',
            status: 'sent',
            recipient_email: (request as any).affiliates.email,
            sent_at: now
          }]);

        suspendedAffiliates.push(affiliateId);
        console.log(`Afiliado ${affiliateId} suspenso por não regularizar documento`);
      }

      return suspendedAffiliates;

    } catch (error) {
      console.error('Erro ao suspender afiliados:', error);
      return [];
    }
  }

  /**
   * Obtém estatísticas de regularização
   * @returns Estatísticas completas
   */
  async getRegularizationStats(): Promise<RegularizationStats> {
    try {
      const { data: requests, error } = await supabase
        .from('regularization_requests')
        .select('status, expires_at');

      if (error) {
        console.error('Erro ao buscar estatísticas:', error);
        return { total: 0, pending: 0, completed: 0, expired: 0, expiringSoon: 0 };
      }

      const now = new Date();
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(now.getDate() + 7);

      const stats = {
        total: requests?.length || 0,
        pending: 0,
        completed: 0,
        expired: 0,
        expiringSoon: 0
      };

      requests?.forEach(request => {
        switch (request.status) {
          case 'pending':
            stats.pending++;
            if (request.expires_at) {
              const expiresAt = new Date(request.expires_at);
              if (expiresAt <= sevenDaysFromNow && expiresAt > now) {
                stats.expiringSoon++;
              }
            }
            break;
          case 'completed':
            stats.completed++;
            break;
          case 'expired':
            stats.expired++;
            break;
        }
      });

      return stats;

    } catch (error) {
      console.error('Erro ao obter estatísticas:', error);
      return { total: 0, pending: 0, completed: 0, expired: 0, expiringSoon: 0 };
    }
  }

  /**
   * Processa jobs de lembrete agendados
   * Método para ser chamado periodicamente (cron job)
   * @returns Estatísticas do processamento
   */
  async processScheduledReminders(): Promise<{
    processed: number;
    successful: number;
    failed: number;
    details: Array<{ jobId: string; status: 'success' | 'failed'; error?: string }>;
  }> {
    try {
      console.log('Iniciando processamento de lembretes agendados...');
      
      const result = await regularizationSchedulerService.processScheduledJobs();
      
      console.log(`Processamento concluído: ${result.processed} jobs, ${result.successful} sucessos, ${result.failed} falhas`);
      
      return result;
    } catch (error) {
      console.error('Erro ao processar lembretes agendados:', error);
      return { processed: 0, successful: 0, failed: 0, details: [] };
    }
  }

  /**
   * Obtém estatísticas de lembretes
   * @param startDate Data inicial (opcional)
   * @param endDate Data final (opcional)
   * @returns Estatísticas de lembretes
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
      return await regularizationSchedulerService.getReminderStats(startDate, endDate);
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
   * Lista afiliados que precisam de regularização
   * @param limit Limite de resultados
   * @returns Lista de afiliados
   */
  async getAffiliatesNeedingRegularization(limit: number = 50): Promise<any[]> {
    try {
      const { data: affiliates, error } = await supabase
        .from('affiliates')
        .select(`
          id,
          name,
          email,
          created_at,
          regularization_deadline,
          regularization_requests!inner (
            id,
            status,
            expires_at,
            reminder_count
          )
        `)
        .eq('is_active', true)
        .is('document', null)
        .eq('regularization_requests.status', 'pending')
        .order('regularization_requests.expires_at', { ascending: true })
        .limit(limit);

      if (error) {
        console.error('Erro ao buscar afiliados:', error);
        return [];
      }

      return affiliates || [];

    } catch (error) {
      console.error('Erro ao buscar afiliados:', error);
      return [];
    }
  }
}

// Singleton para uso direto
export const regularizationService = new RegularizationService();

// Exportar métodos individuais para compatibilidade
export const {
  createRegularizationRequest,
  processRegularization,
  getRegularizationStatus,
  sendRegularizationReminder,
  suspendUnregularizedAffiliates,
  getRegularizationStats,
  getAffiliatesNeedingRegularization
} = regularizationService;