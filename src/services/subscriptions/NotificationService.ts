/**
 * NotificationService para Assinaturas
 * Sistema isolado de notificações específico para fluxo de assinaturas
 * 
 * CRÍTICO: Completamente isolado do sistema de notificações de produtos físicos
 * Usa templates específicos para assinaturas e correlation IDs para rastreamento
 */

import { SubscriptionUserData, SubscriptionPlanData } from '@/types/subscription.types';

export interface SubscriptionEmailNotification {
  to: string;
  subject: string;
  template: 'subscription-payment-failed' | 'subscription-created' | 'subscription-welcome';
  data: Record<string, any>;
  correlationId: string;
}

export interface NotificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
  timestamp: string;
}

export class NotificationService {
  private correlationId: string;
  private config: any;

  constructor(correlationId: string) {
    this.correlationId = correlationId;
    // Lazy load config to avoid import-time errors in tests
    this.config = {
      frontendUrl: process.env.VITE_FRONTEND_URL || 'https://slimquality.com.br',
      supportEmail: process.env.VITE_SUPPORT_EMAIL || 'suporte@slimquality.com.br'
    };
  }

  /**
   * Notificar falha de pagamento de assinatura
   * Enviado quando pagamento inicial falha ou é rejeitado
   */
  async notifyPaymentFailed(
    userData: SubscriptionUserData,
    planData: SubscriptionPlanData,
    paymentId: string,
    reason: string
  ): Promise<NotificationResult> {
    this.log('INFO', 'Sending payment failed notification', {
      email: userData.email,
      paymentId,
      reason
    });

    const notification: SubscriptionEmailNotification = {
      to: userData.email,
      subject: `Problema no pagamento da sua assinatura ${planData.name}`,
      template: 'subscription-payment-failed',
      data: {
        userName: userData.name,
        planName: planData.name,
        planPrice: planData.price,
        paymentId,
        reason,
        retryUrl: `${this.config.frontendUrl}/subscription/retry/${paymentId}`,
        supportEmail: this.config.supportEmail
      },
      correlationId: this.correlationId
    };

    return this.sendEmail(notification);
  }

  /**
   * Notificar criação de assinatura
   * Enviado quando assinatura recorrente é criada após confirmação de pagamento
   */
  async notifySubscriptionCreated(
    userData: SubscriptionUserData,
    planData: SubscriptionPlanData,
    subscriptionId: string,
    nextBillingDate: string
  ): Promise<NotificationResult> {
    this.log('INFO', 'Sending subscription created notification', {
      email: userData.email,
      subscriptionId,
      nextBillingDate
    });

    const notification: SubscriptionEmailNotification = {
      to: userData.email,
      subject: `Assinatura ${planData.name} ativada com sucesso!`,
      template: 'subscription-created',
      data: {
        userName: userData.name,
        planName: planData.name,
        planPrice: planData.price,
        subscriptionId,
        nextBillingDate,
        manageUrl: `${this.config.frontendUrl}/subscription/manage/${subscriptionId}`,
        supportEmail: this.config.supportEmail
      },
      correlationId: this.correlationId
    };

    return this.sendEmail(notification);
  }

  /**
   * Notificar boas-vindas após ativação
   * Enviado quando usuário é ativado e ganha acesso aos recursos
   */
  async notifyWelcomeActivation(
    userData: SubscriptionUserData,
    planData: SubscriptionPlanData,
    accessUrl: string
  ): Promise<NotificationResult> {
    this.log('INFO', 'Sending welcome activation notification', {
      email: userData.email,
      accessUrl
    });

    const notification: SubscriptionEmailNotification = {
      to: userData.email,
      subject: `Bem-vindo(a) ao ${planData.name}! Seu acesso está liberado`,
      template: 'subscription-welcome',
      data: {
        userName: userData.name,
        planName: planData.name,
        planDescription: planData.description,
        accessUrl,
        featuresUrl: `${this.config.frontendUrl}/features`,
        supportEmail: this.config.supportEmail,
        activationDate: new Date().toLocaleDateString('pt-BR')
      },
      correlationId: this.correlationId
    };

    return this.sendEmail(notification);
  }

  /**
   * Enviar notificação por email
   * Método privado que integra com provedor de email
   */
  private async sendEmail(notification: SubscriptionEmailNotification): Promise<NotificationResult> {
    try {
      // Simular envio de email (integração real seria aqui)
      // Em produção, integrar com SendGrid, AWS SES, etc.
      
      this.log('DEBUG', 'Email notification prepared', {
        to: notification.to,
        template: notification.template,
        subject: notification.subject
      });

      // Simular delay de envio
      await new Promise(resolve => setTimeout(resolve, 100));

      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      this.log('INFO', 'Email notification sent successfully', {
        to: notification.to,
        template: notification.template,
        messageId
      });

      return {
        success: true,
        messageId,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      this.log('ERROR', 'Failed to send email notification', {
        to: notification.to,
        template: notification.template,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Log estruturado com correlation ID
   */
  private log(level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR', message: string, context?: any): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: 'NotificationService',
      correlationId: this.correlationId,
      message,
      context
    };

    console.log(JSON.stringify(logEntry));
  }
}