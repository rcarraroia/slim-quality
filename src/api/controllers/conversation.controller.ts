/**
 * Conversation Controller
 * Sprint 5: Sistema de CRM e Gestão de Clientes
 * 
 * Controller REST para operações de conversas e mensagens
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import { conversationService, messageService } from '@/services/crm/conversation.service';
import { logger } from '@/utils/logger';

// ============================================
// SCHEMAS DE VALIDAÇÃO PARA API
// ============================================

const ConversationParamsSchema = z.object({
  id: z.string().uuid('ID da conversa deve ser um UUID válido')
});

const MessageParamsSchema = z.object({
  conversationId: z.string().uuid('ID da conversa deve ser um UUID válido'),
  messageId: z.string().uuid('ID da mensagem deve ser um UUID válido').optional()
});

const ConversationQuerySchema = z.object({
  customer_id: z.string().uuid().optional(),
  channel: z.enum(['whatsapp', 'email', 'phone', 'chat', 'sms']).optional(),
  status: z.enum(['open', 'pending', 'resolved', 'closed']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  assigned_to: z.string().uuid().optional(),
  unassigned: z.string().transform(val => val === 'true').optional(),
  search: z.string().optional(),
  page: z.string().transform(val => parseInt(val) || 1).optional(),
  limit: z.string().transform(val => Math.min(parseInt(val) || 20, 100)).optional(),
  sort_by: z.enum(['created_at', 'updated_at', 'priority']).optional(),
  sort_order: z.enum(['asc', 'desc']).optional()
});

// ============================================
// CONVERSATION CONTROLLER
// ============================================

export class ConversationController {
  /**
   * GET /api/conversations
   * Listar conversas com filtros
   */
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const queryResult = ConversationQuerySchema.safeParse(req.query);
      if (!queryResult.success) {
        res.status(400).json({
          error: 'Parâmetros inválidos',
          details: queryResult.error.issues
        });
        return;
      }

      const query = queryResult.data;
      
      logger.info('Listando conversas via API', { 
        query, 
        userId: req.user?.id 
      });

      const filters = {
        customer_id: query.customer_id,
        channel: query.channel,
        status: query.status,
        priority: query.priority,
        assigned_to: query.assigned_to,
        unassigned: query.unassigned,
        search: query.search,
        page: query.page || 1,
        limit: query.limit || 20,
        sort_by: query.sort_by || 'updated_at',
        sort_order: query.sort_order || 'desc'
      };

      // Aplicar RLS - vendedores só veem conversas atribuídas a eles
      if (req.user?.role === 'vendedor') {
        filters.assigned_to = req.user.id;
      }

      const result = await conversationService.list(filters);

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination
      });

    } catch (error) {
      logger.error('Erro ao listar conversas', { 
        error: error.message, 
        userId: req.user?.id 
      });
      
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Não foi possível listar as conversas'
      });
    }
  }

  /**
   * GET /api/conversations/:id
   * Buscar conversa por ID
   */
  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const paramsResult = ConversationParamsSchema.safeParse(req.params);
      if (!paramsResult.success) {
        res.status(400).json({
          error: 'ID da conversa inválido',
          details: paramsResult.error.issues
        });
        return;
      }

      const { id } = paramsResult.data;
      
      logger.info('Buscando conversa por ID via API', { 
        conversationId: id, 
        userId: req.user?.id 
      });

      const conversation = await conversationService.getById(id);

      if (!conversation) {
        res.status(404).json({
          error: 'Conversa não encontrada'
        });
        return;
      }

      // Verificar permissões RLS
      if (req.user?.role === 'vendedor' && conversation.assigned_to !== req.user.id) {
        res.status(403).json({
          error: 'Acesso negado',
          message: 'Você não tem permissão para acessar esta conversa'
        });
        return;
      }

      res.json({
        success: true,
        data: conversation
      });

    } catch (error) {
      logger.error('Erro ao buscar conversa por ID', { 
        error: error.message, 
        conversationId: req.params.id,
        userId: req.user?.id 
      });
      
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Não foi possível buscar a conversa'
      });
    }
  }

  /**
   * POST /api/conversations
   * Criar nova conversa
   */
  static async create(req: Request, res: Response): Promise<void> {
    try {
      logger.info('Criando conversa via API', { 
        userId: req.user?.id,
        body: req.body
      });

      const conversation = await conversationService.create(req.body);

      res.status(201).json({
        success: true,
        data: conversation,
        message: 'Conversa criada com sucesso'
      });

    } catch (error) {
      logger.error('Erro ao criar conversa', { 
        error: error.message, 
        userId: req.user?.id,
        body: req.body 
      });

      if (error.message.includes('não encontrado')) {
        res.status(404).json({
          error: 'Cliente não encontrado'
        });
        return;
      }
      
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Não foi possível criar a conversa'
      });
    }
  }

  /**
   * PUT /api/conversations/:id
   * Atualizar conversa
   */
  static async update(req: Request, res: Response): Promise<void> {
    try {
      const paramsResult = ConversationParamsSchema.safeParse(req.params);
      if (!paramsResult.success) {
        res.status(400).json({
          error: 'ID da conversa inválido',
          details: paramsResult.error.issues
        });
        return;
      }

      const { id } = paramsResult.data;
      
      logger.info('Atualizando conversa via API', { 
        conversationId: id, 
        userId: req.user?.id,
        fields: Object.keys(req.body)
      });

      // Verificar se conversa existe e permissões
      const existingConversation = await conversationService.getById(id);
      if (!existingConversation) {
        res.status(404).json({
          error: 'Conversa não encontrada'
        });
        return;
      }

      if (req.user?.role === 'vendedor' && existingConversation.assigned_to !== req.user.id) {
        res.status(403).json({
          error: 'Acesso negado',
          message: 'Você não tem permissão para editar esta conversa'
        });
        return;
      }

      const updateData = { ...req.body, id };
      const conversation = await conversationService.update(updateData);

      res.json({
        success: true,
        data: conversation,
        message: 'Conversa atualizada com sucesso'
      });

    } catch (error) {
      logger.error('Erro ao atualizar conversa', { 
        error: error.message, 
        conversationId: req.params.id,
        userId: req.user?.id 
      });
      
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Não foi possível atualizar a conversa'
      });
    }
  }

  /**
   * POST /api/conversations/:id/assign
   * Atribuir conversa a um usuário
   */
  static async assign(req: Request, res: Response): Promise<void> {
    try {
      const paramsResult = ConversationParamsSchema.safeParse(req.params);
      if (!paramsResult.success) {
        res.status(400).json({
          error: 'ID da conversa inválido',
          details: paramsResult.error.issues
        });
        return;
      }

      const { id } = paramsResult.data;
      const { user_id } = req.body;

      if (!user_id) {
        res.status(400).json({
          error: 'ID do usuário é obrigatório'
        });
        return;
      }
      
      logger.info('Atribuindo conversa via API', { 
        conversationId: id, 
        assignedTo: user_id,
        userId: req.user?.id 
      });

      await conversationService.assign(id, user_id);

      res.json({
        success: true,
        message: 'Conversa atribuída com sucesso'
      });

    } catch (error) {
      logger.error('Erro ao atribuir conversa', { 
        error: error.message, 
        conversationId: req.params.id,
        userId: req.user?.id 
      });

      if (error.message.includes('não encontrado')) {
        res.status(404).json({
          error: 'Conversa ou usuário não encontrado'
        });
        return;
      }
      
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Não foi possível atribuir a conversa'
      });
    }
  }

  /**
   * DELETE /api/conversations/:id/assign
   * Remover atribuição da conversa
   */
  static async unassign(req: Request, res: Response): Promise<void> {
    try {
      const paramsResult = ConversationParamsSchema.safeParse(req.params);
      if (!paramsResult.success) {
        res.status(400).json({
          error: 'ID da conversa inválido',
          details: paramsResult.error.issues
        });
        return;
      }

      const { id } = paramsResult.data;
      
      logger.info('Removendo atribuição da conversa via API', { 
        conversationId: id, 
        userId: req.user?.id 
      });

      await conversationService.unassign(id);

      res.json({
        success: true,
        message: 'Atribuição removida com sucesso'
      });

    } catch (error) {
      logger.error('Erro ao remover atribuição da conversa', { 
        error: error.message, 
        conversationId: req.params.id,
        userId: req.user?.id 
      });
      
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Não foi possível remover a atribuição'
      });
    }
  }

  /**
   * POST /api/conversations/:id/close
   * Fechar conversa
   */
  static async close(req: Request, res: Response): Promise<void> {
    try {
      const paramsResult = ConversationParamsSchema.safeParse(req.params);
      if (!paramsResult.success) {
        res.status(400).json({
          error: 'ID da conversa inválido',
          details: paramsResult.error.issues
        });
        return;
      }

      const { id } = paramsResult.data;
      const { reason } = req.body;
      
      logger.info('Fechando conversa via API', { 
        conversationId: id, 
        reason,
        userId: req.user?.id 
      });

      await conversationService.close(id, reason);

      res.json({
        success: true,
        message: 'Conversa fechada com sucesso'
      });

    } catch (error) {
      logger.error('Erro ao fechar conversa', { 
        error: error.message, 
        conversationId: req.params.id,
        userId: req.user?.id 
      });
      
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Não foi possível fechar a conversa'
      });
    }
  }

  /**
   * GET /api/conversations/:id/messages
   * Listar mensagens da conversa
   */
  static async getMessages(req: Request, res: Response): Promise<void> {
    try {
      const paramsResult = ConversationParamsSchema.safeParse(req.params);
      if (!paramsResult.success) {
        res.status(400).json({
          error: 'ID da conversa inválido',
          details: paramsResult.error.issues
        });
        return;
      }

      const { id } = paramsResult.data;
      const { page = '1', limit = '50' } = req.query;
      
      logger.info('Listando mensagens da conversa via API', { 
        conversationId: id, 
        userId: req.user?.id 
      });

      // Verificar se conversa existe e permissões
      const conversation = await conversationService.getById(id);
      if (!conversation) {
        res.status(404).json({
          error: 'Conversa não encontrada'
        });
        return;
      }

      if (req.user?.role === 'vendedor' && conversation.assigned_to !== req.user.id) {
        res.status(403).json({
          error: 'Acesso negado',
          message: 'Você não tem permissão para acessar esta conversa'
        });
        return;
      }

      const pagination = {
        page: parseInt(page as string) || 1,
        limit: Math.min(parseInt(limit as string) || 50, 100)
      };

      const result = await messageService.listByConversation(id, pagination);

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination
      });

    } catch (error) {
      logger.error('Erro ao listar mensagens da conversa', { 
        error: error.message, 
        conversationId: req.params.id,
        userId: req.user?.id 
      });
      
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Não foi possível listar as mensagens'
      });
    }
  }

  /**
   * POST /api/conversations/:id/messages
   * Enviar mensagem na conversa
   */
  static async sendMessage(req: Request, res: Response): Promise<void> {
    try {
      const paramsResult = ConversationParamsSchema.safeParse(req.params);
      if (!paramsResult.success) {
        res.status(400).json({
          error: 'ID da conversa inválido',
          details: paramsResult.error.issues
        });
        return;
      }

      const { id } = paramsResult.data;
      const { content, message_type = 'text' } = req.body;

      if (!content) {
        res.status(400).json({
          error: 'Conteúdo da mensagem é obrigatório'
        });
        return;
      }
      
      logger.info('Enviando mensagem via API', { 
        conversationId: id, 
        messageType: message_type,
        userId: req.user?.id 
      });

      // Verificar se conversa existe e permissões
      const conversation = await conversationService.getById(id);
      if (!conversation) {
        res.status(404).json({
          error: 'Conversa não encontrada'
        });
        return;
      }

      if (req.user?.role === 'vendedor' && conversation.assigned_to !== req.user.id) {
        res.status(403).json({
          error: 'Acesso negado',
          message: 'Você não tem permissão para enviar mensagens nesta conversa'
        });
        return;
      }

      const messageData = {
        conversation_id: id,
        content,
        message_type,
        direction: 'outbound' as const,
        sender_type: 'agent' as const,
        sender_id: req.user!.id
      };

      const message = await messageService.create(messageData);

      res.status(201).json({
        success: true,
        data: message,
        message: 'Mensagem enviada com sucesso'
      });

    } catch (error) {
      logger.error('Erro ao enviar mensagem', { 
        error: error.message, 
        conversationId: req.params.id,
        userId: req.user?.id 
      });
      
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Não foi possível enviar a mensagem'
      });
    }
  }

  /**
   * PUT /api/conversations/:conversationId/messages/:messageId/read
   * Marcar mensagem como lida
   */
  static async markMessageAsRead(req: Request, res: Response): Promise<void> {
    try {
      const paramsResult = MessageParamsSchema.safeParse(req.params);
      if (!paramsResult.success) {
        res.status(400).json({
          error: 'IDs inválidos',
          details: paramsResult.error.issues
        });
        return;
      }

      const { conversationId, messageId } = paramsResult.data;
      
      logger.info('Marcando mensagem como lida via API', { 
        conversationId, 
        messageId,
        userId: req.user?.id 
      });

      if (messageId) {
        await messageService.markAsRead(messageId);
      } else {
        await messageService.markConversationAsRead(conversationId);
      }

      res.json({
        success: true,
        message: 'Mensagem(ns) marcada(s) como lida(s)'
      });

    } catch (error) {
      logger.error('Erro ao marcar mensagem como lida', { 
        error: error.message, 
        conversationId: req.params.conversationId,
        messageId: req.params.messageId,
        userId: req.user?.id 
      });
      
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Não foi possível marcar como lida'
      });
    }
  }

  /**
   * GET /api/conversations/stats
   * Estatísticas de conversas
   */
  static async getStats(req: Request, res: Response): Promise<void> {
    try {
      const { user_id } = req.query;
      
      logger.info('Buscando estatísticas de conversas via API', { 
        userId: req.user?.id,
        targetUserId: user_id
      });

      // Vendedores só podem ver suas próprias estatísticas
      const targetUserId = req.user?.role === 'vendedor' ? req.user.id : (user_id as string);

      const stats = await messageService.getMessageStats(undefined, targetUserId);

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      logger.error('Erro ao buscar estatísticas de conversas', { 
        error: error.message, 
        userId: req.user?.id 
      });
      
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Não foi possível buscar as estatísticas'
      });
    }
  }
}

export default ConversationController;