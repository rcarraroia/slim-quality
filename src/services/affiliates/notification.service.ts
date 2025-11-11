/**
 * Notification Service
 * Sprint 4: Sistema de Afiliados Multinível
 * 
 * Service para notificações de afiliados
 * - Notificações de comissões recebidas
 * - Email de boas-vindas
 * - Mudanças de status
 * - Templates dinâmicos
 */

import { supabase } from '@/config/supabase';
import { Logger } from '@/utils/logger';
import type {
  Affiliate,
  Commission,
  CommissionNotification,
  NotificationPreferences,
  ServiceResponse,
} from '@/types/affiliate.types';

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export interface NotificationContext {
  affiliate: Affiliate;
  commission?: Commission;
  order?: any;
  customData?: Record<string, any>;
}

export class NotificationService {
  private readonly fromEmail = process.env.NOTIFICATION_FROM_EMAIL || 'noreply@slimquality.com.br';
  private readonly fromName = process.env.NOTIFICATION_FROM_NAME || 'Slim Quality';

  /**
   * Envia notificação de comissão recebida
   */
  async sendCommissionNotification(
    affiliateId: string,
    commissionId: string
  ): Promise<ServiceResponse<void>> {
    try {
      Logger.info('NotificationService', 'Sending commission notification', {
        affiliateId,
        commissionId,
      });

      // 1. Buscar dados do afiliado e comissão
      const [affiliateResult, commissionResult] = await Promise.all([
        this.getAffiliateById(affiliateId),
        this.getCommissionById(commissionId),
      ]);

      if (!affiliateResult.success || !commissionResult.success) {
        return {
          success: false,
          error: 'Afiliado ou comissão não encontrados',
          code: 'DATA_NOT_FOUND',
        };
      }

      const affiliate = affiliateResult.data!;
      const commission = commissionResult.data!;

      // 2. Verificar preferências de notificação
      if (!affiliate.notificationEmail) {
        Logger.info('NotificationService', 'Email notifications disabled for affiliate', {
          affiliateId,
        });
        return { success: true }; // Não é erro, apenas preferência
      }

      // 3. Buscar dados do pedido
      const orderResult = await this.getOrderById(commission.orderId);
      if (!orderResult.success) {
        Logger.warn('NotificationService', 'Order not found for commission', {
          commissionId,
          orderId: commission.orderId,
        });
      }

      // 4. Preparar contexto da notificação
      const context: NotificationContext = {
        affiliate,
        commission,
        order: orderResult.data,
      };

      // 5. Gerar template de email
      const emailTemplate = this.generateCommissionEmailTemplate(context);

      // 6. Enviar email
      const emailResult = await this.sendEmail(
        affiliate.email,
        affiliate.name,
        emailTemplate.subject,
        emailTemplate.html,
        emailTemplate.text
      );

      if (!emailResult.success) {
        return emailResult;
      }

      // 7. Registrar notificação enviada
      await this.logNotification(affiliateId, 'commission_received', {
        commissionId,
        orderId: commission.orderId,
        commissionValueCents: commission.commissionValueCents,
        level: commission.level,
      });

      Logger.info('NotificationService', 'Commission notification sent successfully', {
        affiliateId,
        commissionId,
        email: affiliate.email,
      });

      return { success: true };

    } catch (error) {
      Logger.error('NotificationService', 'Error sending commission notification', error as Error);
      return {
        success: false,
        error: 'Erro ao enviar notificação',
        code: 'NOTIFICATION_ERROR',
      };
    }
  }

  /**
   * Envia email de boas-vindas para novo afiliado
   */
  async sendWelcomeEmail(affiliateId: string): Promise<ServiceResponse<void>> {
    try {
      Logger.info('NotificationService', 'Sending welcome email', { affiliateId });

      const affiliateResult = await this.getAffiliateById(affiliateId);
      if (!affiliateResult.success) {
        return {
          success: false,
          error: 'Afiliado não encontrado',
          code: 'AFFILIATE_NOT_FOUND',
        };
      }

      const affiliate = affiliateResult.data!;
      const context: NotificationContext = { affiliate };
      const emailTemplate = this.generateWelcomeEmailTemplate(context);

      const emailResult = await this.sendEmail(
        affiliate.email,
        affiliate.name,
        emailTemplate.subject,
        emailTemplate.html,
        emailTemplate.text
      );

      if (!emailResult.success) {
        return emailResult;
      }

      await this.logNotification(affiliateId, 'welcome', {
        status: affiliate.status,
      });

      return { success: true };

    } catch (error) {
      Logger.error('NotificationService', 'Error sending welcome email', error as Error);
      return {
        success: false,
        error: 'Erro ao enviar email de boas-vindas',
        code: 'WELCOME_EMAIL_ERROR',
      };
    }
  }

  /**
   * Envia notificação de mudança de status
   */
  async sendStatusChangeNotification(
    affiliateId: string,
    oldStatus: string,
    newStatus: string,
    reason?: string
  ): Promise<ServiceResponse<void>> {
    try {
      Logger.info('NotificationService', 'Sending status change notification', {
        affiliateId,
        oldStatus,
        newStatus,
      });

      const affiliateResult = await this.getAffiliateById(affiliateId);
      if (!affiliateResult.success) {
        return {
          success: false,
          error: 'Afiliado não encontrado',
          code: 'AFFILIATE_NOT_FOUND',
        };
      }

      const affiliate = affiliateResult.data!;
      const context: NotificationContext = {
        affiliate,
        customData: { oldStatus, newStatus, reason },
      };

      const emailTemplate = this.generateStatusChangeEmailTemplate(context);

      const emailResult = await this.sendEmail(
        affiliate.email,
        affiliate.name,
        emailTemplate.subject,
        emailTemplate.html,
        emailTemplate.text
      );

      if (!emailResult.success) {
        return emailResult;
      }

      await this.logNotification(affiliateId, 'status_change', {
        oldStatus,
        newStatus,
        reason,
      });

      return { success: true };

    } catch (error) {
      Logger.error('NotificationService', 'Error sending status change notification', error as Error);
      return {
        success: false,
        error: 'Erro ao enviar notificação de status',
        code: 'STATUS_NOTIFICATION_ERROR',
      };
    }
  }

  /**
   * Gera template de email para comissão recebida
   */
  private generateCommissionEmailTemplate(context: NotificationContext): EmailTemplate {
    const { affiliate, commission, order } = context;
    const commissionValue = (commission!.commissionValueCents / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });

    const levelNames = {
      1: 'Vendedor Direto (N1)',
      2: 'Indicação de 2º Nível (N2)',
      3: 'Indicação de 3º Nível (N3)',
    };

    const subject = `🎉 Nova comissão recebida: ${commissionValue}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Nova Comissão - Slim Quality</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .highlight { background: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .commission-value { font-size: 24px; font-weight: bold; color: #28a745; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          .button { display: inline-block; background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Parabéns, ${affiliate.name}!</h1>
            <p>Você recebeu uma nova comissão</p>
          </div>
          
          <div class="content">
            <div class="highlight">
              <h2>Comissão Recebida</h2>
              <p class="commission-value">${commissionValue}</p>
              <p><strong>Tipo:</strong> ${levelNames[commission!.level as keyof typeof levelNames]}</p>
              <p><strong>Percentual:</strong> ${commission!.percentage}%</p>
            </div>
            
            ${order ? `
            <h3>Detalhes da Venda</h3>
            <ul>
              <li><strong>Pedido:</strong> ${order.order_number}</li>
              <li><strong>Cliente:</strong> ${order.customer_name}</li>
              <li><strong>Valor Total:</strong> ${(order.total_cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</li>
            </ul>
            ` : ''}
            
            <p>A comissão foi creditada automaticamente em sua carteira Asaas.</p>
            
            <a href="${process.env.FRONTEND_URL}/dashboard" class="button">
              Ver Dashboard
            </a>
            
            <h3>Continue Vendendo!</h3>
            <p>Compartilhe seu link de indicação e ganhe mais comissões:</p>
            <p><strong>Seu código:</strong> ${affiliate.referralCode}</p>
            <p><strong>Seu link:</strong> ${process.env.FRONTEND_URL}?ref=${affiliate.referralCode}</p>
          </div>
          
          <div class="footer">
            <p>Slim Quality - Sistema de Afiliados</p>
            <p>Este é um email automático, não responda.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Parabéns, ${affiliate.name}!
      
      Você recebeu uma nova comissão de ${commissionValue}
      
      Tipo: ${levelNames[commission!.level as keyof typeof levelNames]}
      Percentual: ${commission!.percentage}%
      
      ${order ? `
      Detalhes da Venda:
      - Pedido: ${order.order_number}
      - Cliente: ${order.customer_name}
      - Valor Total: ${(order.total_cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
      ` : ''}
      
      A comissão foi creditada automaticamente em sua carteira Asaas.
      
      Continue vendendo! Compartilhe seu link:
      ${process.env.FRONTEND_URL}?ref=${affiliate.referralCode}
      
      Slim Quality - Sistema de Afiliados
    `;

    return { subject, html, text };
  }

  /**
   * Gera template de email de boas-vindas
   */
  private generateWelcomeEmailTemplate(context: NotificationContext): EmailTemplate {
    const { affiliate } = context;

    const subject = `Bem-vindo ao programa de afiliados Slim Quality!`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Bem-vindo - Slim Quality</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .highlight { background: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .commission-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .commission-table th, .commission-table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
          .commission-table th { background: #f2f2f2; }
          .button { display: inline-block; background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Bem-vindo, ${affiliate.name}!</h1>
            <p>Você agora faz parte do programa de afiliados Slim Quality</p>
          </div>
          
          <div class="content">
            <div class="highlight">
              <h2>Seu Código de Indicação</h2>
              <p style="font-size: 24px; font-weight: bold; color: #28a745;">${affiliate.referralCode}</p>
              <p><strong>Seu link:</strong> ${process.env.FRONTEND_URL}?ref=${affiliate.referralCode}</p>
            </div>
            
            <h3>Como Funciona o Sistema de Comissões</h3>
            <table class="commission-table">
              <tr>
                <th>Nível</th>
                <th>Descrição</th>
                <th>Comissão</th>
              </tr>
              <tr>
                <td>N1</td>
                <td>Suas vendas diretas</td>
                <td>15%</td>
              </tr>
              <tr>
                <td>N2</td>
                <td>Vendas dos seus indicados</td>
                <td>3%</td>
              </tr>
              <tr>
                <td>N3</td>
                <td>Vendas dos indicados dos seus indicados</td>
                <td>2%</td>
              </tr>
            </table>
            
            <h3>Próximos Passos</h3>
            <ol>
              <li>Acesse seu dashboard para ver suas métricas</li>
              <li>Compartilhe seu link de indicação</li>
              <li>Acompanhe suas comissões em tempo real</li>
              <li>Construa sua rede de afiliados</li>
            </ol>
            
            <a href="${process.env.FRONTEND_URL}/dashboard" class="button">
              Acessar Dashboard
            </a>
            
            <h3>Suporte</h3>
            <p>Precisa de ajuda? Entre em contato conosco:</p>
            <p>📧 Email: suporte@slimquality.com.br</p>
            <p>📱 WhatsApp: (11) 99999-9999</p>
          </div>
          
          <div class="footer">
            <p>Slim Quality - Sistema de Afiliados</p>
            <p>Este é um email automático, não responda.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Bem-vindo ao programa de afiliados Slim Quality, ${affiliate.name}!
      
      Seu código de indicação: ${affiliate.referralCode}
      Seu link: ${process.env.FRONTEND_URL}?ref=${affiliate.referralCode}
      
      Sistema de Comissões:
      - N1 (suas vendas): 15%
      - N2 (vendas dos seus indicados): 3%
      - N3 (vendas dos indicados dos seus indicados): 2%
      
      Próximos passos:
      1. Acesse seu dashboard
      2. Compartilhe seu link
      3. Acompanhe suas comissões
      4. Construa sua rede
      
      Suporte: suporte@slimquality.com.br
      
      Slim Quality - Sistema de Afiliados
    `;

    return { subject, html, text };
  }

  /**
   * Gera template de email para mudança de status
   */
  private generateStatusChangeEmailTemplate(context: NotificationContext): EmailTemplate {
    const { affiliate, customData } = context;
    const { newStatus, reason } = customData!;

    const statusMessages = {
      active: {
        title: '🎉 Parabéns! Seu cadastro foi aprovado',
        message: 'Você agora pode começar a ganhar comissões!',
        color: '#28a745',
      },
      rejected: {
        title: '❌ Cadastro não aprovado',
        message: 'Infelizmente seu cadastro não foi aprovado.',
        color: '#dc3545',
      },
      suspended: {
        title: '⚠️ Conta suspensa',
        message: 'Sua conta foi temporariamente suspensa.',
        color: '#ffc107',
      },
      inactive: {
        title: '⏸️ Conta inativada',
        message: 'Sua conta foi inativada.',
        color: '#6c757d',
      },
    };

    const statusInfo = statusMessages[newStatus as keyof typeof statusMessages] || {
      title: 'Status da conta alterado',
      message: `Seu status foi alterado para: ${newStatus}`,
      color: '#007bff',
    };

    const subject = statusInfo.title;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Status da Conta - Slim Quality</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: ${statusInfo.color}; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .highlight { background: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .button { display: inline-block; background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${statusInfo.title}</h1>
            <p>${statusInfo.message}</p>
          </div>
          
          <div class="content">
            <p>Olá, ${affiliate.name}!</p>
            
            <div class="highlight">
              <p><strong>Status anterior:</strong> ${customData!.oldStatus}</p>
              <p><strong>Novo status:</strong> ${newStatus}</p>
              ${reason ? `<p><strong>Motivo:</strong> ${reason}</p>` : ''}
            </div>
            
            ${newStatus === 'active' ? `
              <h3>Agora você pode:</h3>
              <ul>
                <li>Compartilhar seu link de indicação</li>
                <li>Ganhar comissões nas vendas</li>
                <li>Construir sua rede de afiliados</li>
                <li>Acompanhar suas métricas</li>
              </ul>
              
              <p><strong>Seu código:</strong> ${affiliate.referralCode}</p>
              <p><strong>Seu link:</strong> ${process.env.FRONTEND_URL}?ref=${affiliate.referralCode}</p>
              
              <a href="${process.env.FRONTEND_URL}/dashboard" class="button">
                Acessar Dashboard
              </a>
            ` : ''}
            
            ${newStatus === 'rejected' || newStatus === 'suspended' ? `
              <h3>Precisa de Ajuda?</h3>
              <p>Entre em contato conosco para mais informações:</p>
              <p>📧 Email: suporte@slimquality.com.br</p>
              <p>📱 WhatsApp: (11) 99999-9999</p>
            ` : ''}
          </div>
          
          <div class="footer">
            <p>Slim Quality - Sistema de Afiliados</p>
            <p>Este é um email automático, não responda.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      ${statusInfo.title}
      
      Olá, ${affiliate.name}!
      
      ${statusInfo.message}
      
      Status anterior: ${customData!.oldStatus}
      Novo status: ${newStatus}
      ${reason ? `Motivo: ${reason}` : ''}
      
      ${newStatus === 'active' ? `
      Seu código: ${affiliate.referralCode}
      Seu link: ${process.env.FRONTEND_URL}?ref=${affiliate.referralCode}
      ` : ''}
      
      ${newStatus === 'rejected' || newStatus === 'suspended' ? `
      Precisa de ajuda? Entre em contato:
      Email: suporte@slimquality.com.br
      WhatsApp: (11) 99999-9999
      ` : ''}
      
      Slim Quality - Sistema de Afiliados
    `;

    return { subject, html, text };
  }

  /**
   * Envia email (implementação básica - pode ser substituída por serviço externo)
   */
  private async sendEmail(
    to: string,
    toName: string,
    subject: string,
    html: string,
    text: string
  ): Promise<ServiceResponse<void>> {
    try {
      // TODO: Implementar integração com serviço de email (SendGrid, AWS SES, etc.)
      // Por enquanto, apenas simular envio
      
      Logger.info('NotificationService', 'Email sent (simulated)', {
        to,
        toName,
        subject,
      });

      // Em produção, substituir por:
      // const result = await emailProvider.send({
      //   from: { email: this.fromEmail, name: this.fromName },
      //   to: { email: to, name: toName },
      //   subject,
      //   html,
      //   text,
      // });

      return { success: true };

    } catch (error) {
      Logger.error('NotificationService', 'Error sending email', error as Error);
      return {
        success: false,
        error: 'Erro ao enviar email',
        code: 'EMAIL_SEND_ERROR',
      };
    }
  }

  /**
   * Registra notificação enviada para auditoria
   */
  private async logNotification(
    affiliateId: string,
    type: string,
    data: Record<string, any>
  ): Promise<void> {
    try {
      await supabase
        .from('notification_logs')
        .insert({
          affiliate_id: affiliateId,
          type,
          data,
          sent_at: new Date().toISOString(),
        });

    } catch (error) {
      Logger.error('NotificationService', 'Error logging notification', error as Error);
      // Não falhar a notificação por erro de log
    }
  }

  // ============================================
  // MÉTODOS AUXILIARES
  // ============================================

  private async getAffiliateById(affiliateId: string): Promise<ServiceResponse<Affiliate>> {
    try {
      const { data: affiliate, error } = await supabase
        .from('affiliates')
        .select('*')
        .eq('id', affiliateId)
        .is('deleted_at', null)
        .single();

      if (error || !affiliate) {
        return {
          success: false,
          error: 'Afiliado não encontrado',
          code: 'AFFILIATE_NOT_FOUND',
        };
      }

      return { success: true, data: affiliate };

    } catch (error) {
      return {
        success: false,
        error: 'Erro ao buscar afiliado',
        code: 'DATABASE_ERROR',
      };
    }
  }

  private async getCommissionById(commissionId: string): Promise<ServiceResponse<Commission>> {
    try {
      const { data: commission, error } = await supabase
        .from('commissions')
        .select('*')
        .eq('id', commissionId)
        .single();

      if (error || !commission) {
        return {
          success: false,
          error: 'Comissão não encontrada',
          code: 'COMMISSION_NOT_FOUND',
        };
      }

      return { success: true, data: commission };

    } catch (error) {
      return {
        success: false,
        error: 'Erro ao buscar comissão',
        code: 'DATABASE_ERROR',
      };
    }
  }

  private async getOrderById(orderId: string): Promise<ServiceResponse<any>> {
    try {
      const { data: order, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .is('deleted_at', null)
        .single();

      if (error || !order) {
        return {
          success: false,
          error: 'Pedido não encontrado',
          code: 'ORDER_NOT_FOUND',
        };
      }

      return { success: true, data: order };

    } catch (error) {
      return {
        success: false,
        error: 'Erro ao buscar pedido',
        code: 'DATABASE_ERROR',
      };
    }
  }
}

export const notificationService = new NotificationService();