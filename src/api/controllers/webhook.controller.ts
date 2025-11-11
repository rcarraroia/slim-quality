/**
 * Webhook Controller
 * Sprint 5: Sistema de CRM e Gestão de Clientes
 * 
 * Controller para receber webhooks do N8N/BIA com segurança robusta
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import { customerService } from '@/services/crm/customer.service';
import { conversationService, messageService } from '@/services/crm/conversation.service';
import { tagService } from '@/services/crm/tag.service';
import { timelineService } from '@/services/crm/timeline.service';
import { logger } from '@/utils/logger';
import crypto from 'crypto';

// ============================================
// SCHEMAS DE VALIDAÇÃO PARA WEBHOOK
// ============================================

// Schema para webhook N8N
const N8NWebhookSchema = z.object({
  timestamp: z.string().datetime('Timestamp deve ser uma data válida'),
  signature: z.string().min(1, 'Signature é obrigatória'),
  event_type: z.enum(['whatsapp_message', 'customer_created', 'lead_qualified']),
  data: z.object({
    // Dados da mensagem WhatsApp
    message: z.object({
      id: z.string().optional(),
      content: z.string().min(1),
      type: z.enum(['text', 'image', 'audio', 'video', 'document']).default('text'),
      from: z.string().min(1),
      timestamp: z.string().datetime()
    }).optional(),
    
    // Dados do cliente
    customer: z.object({
      name: z.string().min(1),
      phone: z.string().min(1),
      email: z.string().email().optional(),
      metadata: z.record(z.any()).default({})
    }),
    
    // Dados da conversa
    conversation: z.object({
      subject: z.string().optional(),
      channel: z.enum(['whatsapp', 'email', 'phone', 'chat', 'sms']).default('whatsapp'),
      priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium')
    }).optional(),
    
    // Metadata adicional
    metadata: z.record(z.any()).default({})
  })
});

// Lista de IPs permitidos para webhook (whitelist)
const ALLOWED_IPS = [
  '127.0.0.1',
  '::1',
  // TODO: Adicionar IPs do N8N em produção
];

// ============================================
// WEBHOOK CONTROLLER
// ============================================

export class WebhookController {
  /**
   * POST /webhooks/n8n/message
   * Receber mensagens do N8N/BIA com segurança robusta
   */
  static async receiveN8NMessage(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    
    try {
      // 1. VALIDAÇÃO DE ORIGEM IP
      const clientIP = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
      
      if (process.env.NODE_ENV === 'production' && !ALLOWED_IPS.includes(clientIP as string)) {
        logger.error('Tentativa de acesso não autorizada ao webhook', { 
          ip: clientIP,
          userAgent: req.headers['user-agent'],
          timestamp: new Date().toISOString()
        });
        
        res.status(403).json({
          error: 'Acesso negado',
          message: 'IP não autorizado'
        });
        return;
      }

      // 2. VALIDAÇÃO DE AUTENTICAÇÃO
      const authHeader = req.headers.authorization;
      const expectedToken = process.env.N8N_WEBHOOK_SECRET;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        logger.error('Webhook sem token de autenticação', { ip: clientIP });
        res.status(401).json({
          error: 'Token de autenticação obrigatório'
        });
        return;
      }

      const providedToken = authHeader.substring(7);
      
      if (!expectedToken || providedToken !== expectedToken) {
        logger.error('Token de webhook inválido', { 
          ip: clientIP,
          providedTokenHash: crypto.createHash('sha256').update(providedToken).digest('hex').substring(0, 8)
        });
        
        res.status(401).json({
          error: 'Token inválido'
        });
        return;
      }

      // 3. VALIDAÇÃO DE PAYLOAD
      const payloadResult = N8NWebhookSchema.safeParse(req.body);
      if (!payloadResult.success) {
        logger.error('Payload do webhook inválido', {
          ip: clientIP,
          errors: payloadResult.error.issues,
          body: req.body
        });
        
        res.status(400).json({
          error: 'Payload inválido',
          details: payloadResult.error.issues
        });
        return;
      }

      const payload = payloadResult.data;

      // 4. VALIDAÇÃO DE TIMESTAMP (evitar replay attacks)
      const webhookTimestamp = new Date(payload.timestamp);
      const now = new Date();
      const timeDiff = Math.abs(now.getTime() - webhookTimestamp.getTime());
      const maxTimeDiff = 5 * 60 * 1000; // 5 minutos

      if (timeDiff > maxTimeDiff) {
        logger.error('Webhook com timestamp muito antigo', {
          ip: clientIP,
          webhookTimestamp: payload.timestamp,
          currentTime: now.toISOString(),
          timeDiffMinutes: Math.round(timeDiff / 60000)
        });
        
        res.status(400).json({
          error: 'Timestamp inválido',
          message: 'Webhook muito antigo ou com timestamp futuro'
        });
        return;
      }

      // 5. VALIDAÇÃO DE SIGNATURE
      const expectedSignature = crypto
        .createHmac('sha256', expectedToken)
        .update(JSON.stringify(payload.data))
        .digest('hex');

      if (payload.signature !== expectedSignature) {
        logger.error('Signature do webhook inválida', {
          ip: clientIP,
          expectedSignature: expectedSignature.substring(0, 8),
          providedSignature: payload.signature.substring(0, 8)
        });
        
        res.status(401).json({
          error: 'Signature inválida'
        });
        return;
      }

      logger.info('Webhook N8N recebido com sucesso', {
        eventType: payload.event_type,
        customerPhone: payload.data.customer.phone,
        ip: clientIP,
        processingStarted: new Date().toISOString()
      });

      // 6. PROCESSAR WEBHOOK ASSINCRONAMENTE
      const result = await WebhookController.processN8NWebhook(payload);

      const processingTime = Date.now() - startTime;
      
      logger.info('Webhook N8N processado com sucesso', {
        eventType: payload.event_type,
        customerId: result.customer_id,
        conversationId: result.conversation_id,
        messageId: result.message_id,
        processingTimeMs: processingTime
      });

      res.status(200).json({
        success: true,
        data: result,
        processing_time_ms: processingTime
      });

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      logger.error('Erro ao processar webhook N8N', {
        error: error.message,
        stack: error.stack,
        body: req.body,
        ip: req.ip,
        processingTimeMs: processingTime
      });

      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Não foi possível processar o webhook',
        processing_time_ms: processingTime
      });
    }
  }

  /**
   * Processar webhook N8N
   */
  private static async processN8NWebhook(payload: z.infer<typeof N8NWebhookSchema>): Promise<{
    customer_id: string;
    conversation_id: string;
    message_id?: string;
    created_customer: boolean;
    created_conversation: boolean;
  }> {
    const { event_type, data } = payload;
    
    logger.info('Iniciando processamento do webhook', { eventType: event_type });

    // 1. BUSCAR OU CRIAR CLIENTE
    let customer = await customerService.getByPhone(data.customer.phone);
    let createdCustomer = false;

    if (!customer) {
      // Cliente não existe, criar novo
      logger.info('Cliente não encontrado, criando novo', { phone: data.customer.phone });
      
      customer = await customerService.create({
        name: data.customer.name,
        phone: data.customer.phone,
        email: data.customer.email,
        source: 'n8n',
        notes: `Cliente criado automaticamente via ${event_type}`,
        ...data.customer.metadata
      });
      
      createdCustomer = true;
      
      // Aplicar tags automáticas para cliente criado via N8N
      await tagService.applyAutomaticTags(customer.id, 'registration', {
        source: 'n8n',
        channel: data.conversation?.channel || 'whatsapp'
      });
    }

    // 2. BUSCAR OU CRIAR CONVERSA
    let conversation = await conversationService.getByChannelId(
      data.conversation?.channel || 'whatsapp',
      data.customer.phone,
      customer.id
    );
    let createdConversation = false;

    if (!conversation) {
      // Conversa não existe, criar nova
      logger.info('Conversa não encontrada, criando nova', { 
        customerId: customer.id,
        channel: data.conversation?.channel || 'whatsapp'
      });
      
      conversation = await conversationService.create({
        customer_id: customer.id,
        channel: data.conversation?.channel || 'whatsapp',
        channel_id: data.customer.phone,
        subject: data.conversation?.subject || `Conversa ${data.conversation?.channel || 'WhatsApp'}`,
        priority: data.conversation?.priority || 'medium',
        metadata: {
          created_via_webhook: true,
          n8n_event_type: event_type,
          ...data.metadata
        }
      });
      
      createdConversation = true;
      
      // Registrar evento na timeline
      await timelineService.recordConversationEvent(
        customer.id,
        'conversation_started',
        conversation.id,
        {
          channel: conversation.channel,
          created_via: 'n8n_webhook',
          event_type
        }
      );
    }

    // 3. CRIAR MENSAGEM (se houver)
    let messageId: string | undefined;

    if (data.message && event_type === 'whatsapp_message') {
      logger.info('Criando mensagem do webhook', { 
        conversationId: conversation.id,
        messageType: data.message.type
      });
      
      const message = await messageService.create({
        conversation_id: conversation.id,
        content: data.message.content,
        message_type: data.message.type,
        direction: 'inbound',
        sender_type: 'customer',
        external_id: data.message.id,
        metadata: {
          from_webhook: true,
          n8n_timestamp: data.message.timestamp,
          ...data.metadata
        }
      });
      
      messageId = message.id;
      
      // Registrar evento na timeline
      await timelineService.recordMessageEvent(
        customer.id,
        'message_received',
        message.id,
        conversation.id,
        {
          channel: conversation.channel,
          message_type: data.message.type,
          preview: data.message.content.substring(0, 100)
        }
      );
    }

    // 4. APLICAR TAGS AUTOMÁTICAS BASEADAS NO EVENTO
    if (event_type === 'lead_qualified') {
      await tagService.applyAutomaticTags(customer.id, 'lead_qualified', {
        qualification_score: data.metadata.qualification_score,
        interested_products: data.metadata.interested_products
      });
    }

    return {
      customer_id: customer.id,
      conversation_id: conversation.id,
      message_id: messageId,
      created_customer: createdCustomer,
      created_conversation: createdConversation
    };
  }

  /**
   * GET /webhooks/health
   * Health check para webhook
   */
  static async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      res.json({
        success: true,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        status: 'unhealthy',
        error: error.message
      });
    }
  }
}

// Middleware de rate limiting específico para webhook
export const webhookRateLimit = (req: Request, res: Response, next: Function) => {
  // TODO: Implementar rate limiting robusto
  // Por enquanto, permitir todas as requisições
  next();
};

export default WebhookController;