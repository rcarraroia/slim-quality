/**
 * Webhook Service
 * Sprint 4: Sistema de Afiliados Multinível
 * 
 * Processa webhooks do Asaas com:
 * - Validação de authToken
 * - Idempotência (asaas_event_id UNIQUE)
 * - Cálculo automático de comissões
 * - Split automático no Asaas
 * - Notificações automáticas
 */

import { supabase } from '../../config/database';
import { Logger } from '../../utils/logger';
import { NotificationService } from '../affiliates/notification.service';

export interface AsaasWebhookPayload {
  id: string;
  event: string;
  payment: {
    id: string;
    status: string;
    value: number;
    netValue?: number;
    externalReference?: string;
    customer: {
      id: string;
      name: string;
      email: string;
    };
  };
}

export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export class WebhookService {
  private notificationService: NotificationService;

  constructor() {
    this.notificationService = new NotificationService();
  }

  /**
   * Processa webhook do Asaas
   * 
   * Implementa:
   * - Validação de authToken
   * - Idempotência (asaas_event_id UNIQUE)
   * - Processamento assíncrono
   */
  async processWebhook(
    payload: AsaasWebhookPayload,
    authToken: string
  ): Promise<ServiceResponse<void>> {
    try {
      Logger.info('WebhookService', 'Processando webhook', {
        eventId: payload.id,
        event: payload.event,
        paymentId: payload.payment.id,
      });

      // 1. Validar authToken (implementar validação real)
      if (!authToken || authToken !== process.env.ASAAS_WEBHOOK_TOKEN) {
        Logger.error('WebhookService', 'Token inválido', new Error('Invalid token'));
        return {
          success: false,
          error: 'Token de autenticação inválido',
          code: 'INVALID_AUTH_TOKEN',
        };
      }

      // 2. Verificar idempotência (asaas_event_id UNIQUE)
      const { data: existingLog } = await supabase
        .from('asaas_webhook_logs')
        .select('id, processed')
        .eq('asaas_event_id', payload.id)
        .single();

      if (existingLog) {
        Logger.info('WebhookService', 'Webhook já processado (idempotência)', {
          eventId: payload.id,
          logId: existingLog.id,
        });
        return { success: true }; // Retornar sucesso para não reenviar
      }

      // 3. Registrar webhook log
      const { data: webhookLog, error: logError } = await supabase
        .from('asaas_webhook_logs')
        .insert({
          asaas_event_id: payload.id,
          event_type: payload.event,
          payload: payload,
          token_valid: true,
          processed: false,
          asaas_payment_id: payload.payment.id,
        })
        .select()
        .single();

      if (logError) {
        // Se erro for de UNIQUE constraint, webhook já foi processado
        if (logError.code === '23505') {
          Logger.info('WebhookService', 'Webhook já processado (race condition)', {
            eventId: payload.id,
          });
          return { success: true };
        }

        Logger.error('WebhookService', 'Erro ao registrar webhook log', logError);
        return {
          success: false,
          error: 'Erro ao registrar webhook',
          code: 'WEBHOOK_LOG_ERROR',
        };
      }

      // 4. Processar evento de forma assíncrona
      this.processEventAsync(payload, webhookLog.id).catch(error => {
        Logger.error('WebhookService', 'Erro no processamento assíncrono', error);
      });

      return { success: true };
    } catch (error) {
      Logger.error('WebhookService', 'Erro inesperado ao processar webhook', error as Error);
      return {
        success: false,
        error: 'Erro inesperado ao processar webhook',
        code: 'UNEXPECTED_ERROR',
      };
    }
  }

  /**
   * Processa evento de forma assíncrona
   */
  private async processEventAsync(
    payload: AsaasWebhookPayload,
    webhookLogId: string
  ): Promise<void> {
    try {
      Logger.info('WebhookService', 'Iniciando processamento assíncrono', {
        event: payload.event,
        paymentId: payload.payment.id,
      });

      // Buscar payment e order pelo asaas_payment_id
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .select('id, order_id, status')
        .eq('asaas_payment_id', payload.payment.id)
        .single();

      if (paymentError || !payment) {
        Logger.error('WebhookService', 'Payment não encontrado', paymentError);
        await this.updateWebhookLog(webhookLogId, false, 'Payment não encontrado');
        return;
      }

      // Processar evento baseado no tipo
      let result: ServiceResponse<void>;

      switch (payload.event) {
        case 'PAYMENT_CONFIRMED':
          result = await this.handlePaymentConfirmed(payment.order_id, payment.id, payload);
          break;

        case 'PAYMENT_RECEIVED':
          result = await this.handlePaymentReceived(payment.order_id, payment.id, payload);
          break;

        case 'PAYMENT_OVERDUE':
          result = await this.handlePaymentOverdue(payment.order_id, payment.id, payload);
          break;

        case 'PAYMENT_REFUNDED':
          result = await this.handlePaymentRefunded(payment.order_id, payment.id, payload);
          break;

        case 'PAYMENT_DELETED':
        case 'PAYMENT_CANCELLED':
          result = await this.handlePaymentCancelled(payment.order_id, payment.id, payload);
          break;

        default:
          Logger.info('WebhookService', 'Evento não tratado', { event: payload.event });
          result = { success: true };
      }

      // Atualizar webhook log
      await this.updateWebhookLog(
        webhookLogId,
        result.success,
        result.error,
        payment.id,
        payment.order_id
      );

      Logger.info('WebhookService', 'Processamento assíncrono concluído', {
        event: payload.event,
        success: result.success,
      });
    } catch (error) {
      Logger.error('WebhookService', 'Erro no processamento assíncrono', error as Error);
      await this.updateWebhookLog(webhookLogId, false, (error as Error).message);
    }
  }

  /**
   * Atualiza webhook log
   */
  private async updateWebhookLog(
    logId: string,
    processed: boolean,
    errorMessage?: string,
    paymentId?: string,
    orderId?: string
  ): Promise<void> {
    await supabase
      .from('asaas_webhook_logs')
      .update({
        processed,
        processed_at: new Date().toISOString(),
        error_message: errorMessage,
        payment_id: paymentId,
        order_id: orderId,
      })
      .eq('id', logId);
  }

  /**
   * Handler: PAYMENT_CONFIRMED
   * Pagamento confirmado (cartão autorizado ou PIX recebido)
   * 
   * ⭐ INTEGRAÇÃO SPRINT 4: Dispara cálculo automático de comissões
   */
  private async handlePaymentConfirmed(
    orderId: string,
    paymentId: string,
    payload: AsaasWebhookPayload
  ): Promise<ServiceResponse<void>> {
    try {
      Logger.info('WebhookService', 'Processando PAYMENT_CONFIRMED', {
        orderId,
        paymentId,
      });

      // 1. Atualizar status do payment
      const { error: paymentError } = await supabase
        .from('payments')
        .update({
          status: 'confirmed',
          confirmed_at: new Date().toISOString(),
        })
        .eq('id', paymentId);

      if (paymentError) {
        Logger.error('WebhookService', 'Erro ao atualizar payment', paymentError);
        return { success: false, error: 'Erro ao atualizar payment' };
      }

      // 2. Atualizar status do order para 'paid'
      const { error: orderError } = await supabase
        .from('orders')
        .update({
          status: 'paid',
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      if (orderError) {
        Logger.error('WebhookService', 'Erro ao atualizar order', orderError);
        return { success: false, error: 'Erro ao atualizar order' };
      }

      // 3. ⭐ SPRINT 4: Disparar cálculo automático de comissões
      await this.triggerCommissionCalculation(orderId, payload.payment.value);

      Logger.info('WebhookService', 'PAYMENT_CONFIRMED processado com sucesso', {
        orderId,
        paymentId,
      });

      return { success: true };
    } catch (error) {
      Logger.error('WebhookService', 'Erro ao processar PAYMENT_CONFIRMED', error as Error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Handler: PAYMENT_RECEIVED
   * Pagamento recebido (valor creditado)
   * 
   * ⭐ SPRINT 4: Notifica afiliados sobre comissões recebidas
   */
  private async handlePaymentReceived(
    orderId: string,
    paymentId: string,
    payload: AsaasWebhookPayload
  ): Promise<ServiceResponse<void>> {
    try {
      Logger.info('WebhookService', 'Processando PAYMENT_RECEIVED', {
        orderId,
        paymentId,
      });

      // 1. Atualizar status do payment
      const { error: paymentError } = await supabase
        .from('payments')
        .update({
          status: 'received',
          paid_at: new Date().toISOString(),
        })
        .eq('id', paymentId);

      if (paymentError) {
        Logger.error('WebhookService', 'Erro ao atualizar payment', paymentError);
        return { success: false, error: 'Erro ao atualizar payment' };
      }

      // 2. ⭐ SPRINT 4: Notificar afiliados sobre comissões recebidas
      await this.notifyAffiliatesAboutCommissions(orderId);

      Logger.info('WebhookService', 'PAYMENT_RECEIVED processado com sucesso', {
        orderId,
        paymentId,
      });

      return { success: true };
    } catch (error) {
      Logger.error('WebhookService', 'Erro ao processar PAYMENT_RECEIVED', error as Error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Handler: PAYMENT_OVERDUE
   * Pagamento vencido
   */
  private async handlePaymentOverdue(
    orderId: string,
    paymentId: string,
    payload: AsaasWebhookPayload
  ): Promise<ServiceResponse<void>> {
    try {
      Logger.info('WebhookService', 'Processando PAYMENT_OVERDUE', {
        orderId,
        paymentId,
      });

      // Atualizar status do payment
      const { error: paymentError } = await supabase
        .from('payments')
        .update({
          status: 'overdue',
        })
        .eq('id', paymentId);

      if (paymentError) {
        Logger.error('WebhookService', 'Erro ao atualizar payment', paymentError);
        return { success: false, error: 'Erro ao atualizar payment' };
      }

      Logger.info('WebhookService', 'PAYMENT_OVERDUE processado com sucesso', {
        orderId,
        paymentId,
      });

      return { success: true };
    } catch (error) {
      Logger.error('WebhookService', 'Erro ao processar PAYMENT_OVERDUE', error as Error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Handler: PAYMENT_REFUNDED
   * Pagamento estornado
   */
  private async handlePaymentRefunded(
    orderId: string,
    paymentId: string,
    payload: AsaasWebhookPayload
  ): Promise<ServiceResponse<void>> {
    try {
      Logger.info('WebhookService', 'Processando PAYMENT_REFUNDED', {
        orderId,
        paymentId,
      });

      // Atualizar status do payment
      const { error: paymentError } = await supabase
        .from('payments')
        .update({
          status: 'refunded',
        })
        .eq('id', paymentId);

      if (paymentError) {
        Logger.error('WebhookService', 'Erro ao atualizar payment', paymentError);
        return { success: false, error: 'Erro ao atualizar payment' };
      }

      Logger.info('WebhookService', 'PAYMENT_REFUNDED processado com sucesso', {
        orderId,
        paymentId,
      });

      return { success: true };
    } catch (error) {
      Logger.error('WebhookService', 'Erro ao processar PAYMENT_REFUNDED', error as Error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * Handler: PAYMENT_CANCELLED / PAYMENT_DELETED
   * Pagamento cancelado
   */
  private async handlePaymentCancelled(
    orderId: string,
    paymentId: string,
    payload: AsaasWebhookPayload
  ): Promise<ServiceResponse<void>> {
    try {
      Logger.info('WebhookService', 'Processando PAYMENT_CANCELLED', {
        orderId,
        paymentId,
      });

      // Atualizar status do payment
      const { error: paymentError } = await supabase
        .from('payments')
        .update({
          status: 'cancelled',
        })
        .eq('id', paymentId);

      if (paymentError) {
        Logger.error('WebhookService', 'Erro ao atualizar payment', paymentError);
        return { success: false, error: 'Erro ao atualizar payment' };
      }

      Logger.info('WebhookService', 'PAYMENT_CANCELLED processado com sucesso', {
        orderId,
        paymentId,
      });

      return { success: true };
    } catch (error) {
      Logger.error('WebhookService', 'Erro ao processar PAYMENT_CANCELLED', error as Error);
      return { success: false, error: (error as Error).message };
    }
  }

  /**
   * ⭐ SPRINT 4: Dispara cálculo automático de comissões
   * Chamado quando pagamento é confirmado
   */
  private async triggerCommissionCalculation(
    orderId: string,
    orderValueReais: number
  ): Promise<void> {
    try {
      Logger.info('WebhookService', 'Disparando cálculo de comissões', {
        orderId,
        orderValueReais,
      });

      // 1. Buscar dados do pedido para verificar se há afiliado
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('total_cents, affiliate_n1_id, referral_code')
        .eq('id', orderId)
        .is('deleted_at', null)
        .single();

      if (orderError || !order) {
        Logger.error('WebhookService', 'Pedido não encontrado para cálculo de comissões', orderError);
        return;
      }

      const orderValueCents = order.total_cents;
      const affiliateUserId = order.affiliate_n1_id;

      // 2. Verificar se há afiliado associado
      if (!affiliateUserId) {
        Logger.info('WebhookService', 'Pedido sem afiliado - sem comissões a calcular', {
          orderId,
        });
        return;
      }

      // 3. Chamar Edge Function para cálculo de comissões
      const { data, error } = await supabase.functions.invoke('calculate-commissions', {
        body: {
          orderId,
          orderValueCents,
          affiliateUserId,
        },
      });

      if (error) {
        Logger.error('WebhookService', 'Erro ao chamar Edge Function de comissões', error);
        return;
      }

      if (!data?.success) {
        Logger.error('WebhookService', 'Falha no cálculo de comissões', new Error(data?.error));
        return;
      }

      Logger.info('WebhookService', 'Comissões calculadas com sucesso', {
        orderId,
        splitId: data.splitId,
        redistributionApplied: data.calculation?.redistributionApplied,
      });

      // 4. Disparar processamento de split no Asaas
      await this.triggerAsaasSplit(orderId, data.splitId);

    } catch (error) {
      Logger.error('WebhookService', 'Erro inesperado no cálculo de comissões', error as Error);
    }
  }

  /**
   * ⭐ SPRINT 4: Dispara processamento de split no Asaas
   * Chama Edge Function process-split para executar split automático
   */
  private async triggerAsaasSplit(orderId: string, splitId: string): Promise<void> {
    try {
      Logger.info('WebhookService', 'Disparando split no Asaas', {
        orderId,
        splitId,
      });

      // Chamar Edge Function para processar split
      const { data, error } = await supabase.functions.invoke('process-split', {
        body: {
          orderId,
          splitId,
        },
      });

      if (error) {
        Logger.error('WebhookService', 'Erro ao chamar Edge Function de split', error);
        
        // Marcar split como falha para reprocessamento manual
        await supabase
          .from('commission_splits')
          .update({
            status: 'failed',
            asaas_response: { error: error.message || 'Edge Function failed' },
            updated_at: new Date().toISOString(),
          })
          .eq('id', splitId);

        return;
      }

      if (!data?.success) {
        Logger.error('WebhookService', 'Falha no processamento de split', new Error(data?.error));
        return;
      }

      Logger.info('WebhookService', 'Split processado com sucesso', {
        orderId,
        splitId,
        asaasSplitId: data.asaasSplitId,
        status: data.status,
      });

    } catch (error) {
      Logger.error('WebhookService', 'Erro inesperado no processamento de split', error as Error);
      
      // Marcar split como falha
      await supabase
        .from('commission_splits')
        .update({
          status: 'failed',
          asaas_response: { error: (error as Error).message },
          updated_at: new Date().toISOString(),
        })
        .eq('id', splitId);
    }
  }

  /**
   * ⭐ SPRINT 4: Notifica afiliados sobre comissões recebidas
   * Chamado após split ser processado com sucesso (PAYMENT_RECEIVED)
   */
  private async notifyAffiliatesAboutCommissions(orderId: string): Promise<void> {
    try {
      Logger.info('WebhookService', 'Notificando afiliados sobre comissões', { orderId });

      // Buscar comissões do pedido que foram processadas
      const { data: commissions, error } = await supabase
        .from('commissions')
        .select(`
          id,
          affiliate_id,
          level,
          commission_value_cents,
          affiliates!inner(
            id,
            user_id,
            name,
            email
          )
        `)
        .eq('order_id', orderId)
        .eq('status', 'pending'); // Comissões que foram calculadas mas ainda não notificadas

      if (error) {
        Logger.error('WebhookService', 'Erro ao buscar comissões para notificação', error);
        return;
      }

      if (!commissions || commissions.length === 0) {
        Logger.info('WebhookService', 'Nenhuma comissão encontrada para notificar', { orderId });
        return;
      }

      // Enviar notificações para cada afiliado (de forma assíncrona)
      const notificationPromises = commissions.map(async (commission: any) => {
        try {
          const result = await this.notificationService.sendCommissionNotification(
            commission.affiliate_id,
            commission.id
          );

          if (result.success) {
            Logger.info('WebhookService', 'Notificação de comissão enviada', {
              orderId,
              affiliateId: commission.affiliate_id,
              commissionId: commission.id,
              level: commission.level,
            });

            // Marcar comissão como notificada
            await supabase
              .from('commissions')
              .update({
                status: 'paid',
                paid_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq('id', commission.id);

          } else {
            Logger.warn('WebhookService', 'Falha ao enviar notificação de comissão', {
              orderId,
              affiliateId: commission.affiliate_id,
              error: result.error,
            });
          }
        } catch (error) {
          Logger.error('WebhookService', 'Erro ao enviar notificação de comissão', error as Error, {
            orderId,
            affiliateId: commission.affiliate_id,
          });
        }
      });

      // Aguardar todas as notificações (sem bloquear o webhook)
      await Promise.allSettled(notificationPromises);

      Logger.info('WebhookService', 'Notificações de comissão processadas', {
        orderId,
        commissionsCount: commissions.length,
      });

    } catch (error) {
      Logger.error('WebhookService', 'Erro inesperado ao notificar afiliados', error as Error);
      // Não falhar o webhook por erro de notificação
    }
  }
}

export const webhookService = new WebhookService();