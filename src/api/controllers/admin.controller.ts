/**
 * Admin Controller
 * Sprint 5: Sistema de CRM e Gestão de Clientes
 * 
 * Controller REST para operações administrativas (tags, relatórios, configurações)
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import { tagService } from '@/services/crm/tag.service';
import { customerService } from '@/services/crm/customer.service';
import { conversationService } from '@/services/crm/conversation.service';
import { appointmentReminderService } from '@/services/crm/appointment.service';
import { timelineManagementService } from '@/services/crm/timeline.service';
import { logger } from '@/utils/logger';

// ============================================
// SCHEMAS DE VALIDAÇÃO PARA API
// ============================================

const TagParamsSchema = z.object({
  id: z.string().uuid('ID da tag deve ser um UUID válido')
});

const ReportQuerySchema = z.object({
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  user_id: z.string().uuid().optional(),
  format: z.enum(['json', 'csv']).default('json')
});

const ExportQuerySchema = z.object({
  type: z.enum(['customers', 'conversations', 'appointments', 'timeline']),
  filters: z.string().optional(), // JSON string com filtros
  format: z.enum(['csv', 'xlsx']).default('csv')
});

// ============================================
// ADMIN CONTROLLER
// ============================================

export class AdminController {
  /**
   * GET /api/admin/tags
   * Listar todas as tags com estatísticas
   */
  static async listTags(req: Request, res: Response): Promise<void> {
    try {
      const { include_stats = 'true' } = req.query;
      
      logger.info('Listando tags via API admin', { 
        includeStats: include_stats,
        userId: req.user?.id 
      });

      const includeStatsBoolean = include_stats === 'true';
      const tags = await tagService.list(includeStatsBoolean);

      res.json({
        success: true,
        data: tags
      });

    } catch (error) {
      logger.error('Erro ao listar tags', { 
        error: error.message, 
        userId: req.user?.id 
      });
      
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Não foi possível listar as tags'
      });
    }
  }

  /**
   * GET /api/admin/tags/:id
   * Buscar tag por ID com estatísticas
   */
  static async getTagById(req: Request, res: Response): Promise<void> {
    try {
      const paramsResult = TagParamsSchema.safeParse(req.params);
      if (!paramsResult.success) {
        res.status(400).json({
          error: 'ID da tag inválido',
          details: paramsResult.error.issues
        });
        return;
      }

      const { id } = paramsResult.data;
      
      logger.info('Buscando tag por ID via API admin', { 
        tagId: id, 
        userId: req.user?.id 
      });

      const tag = await tagService.getById(id);

      if (!tag) {
        res.status(404).json({
          error: 'Tag não encontrada'
        });
        return;
      }

      res.json({
        success: true,
        data: tag
      });

    } catch (error) {
      logger.error('Erro ao buscar tag por ID', { 
        error: error.message, 
        tagId: req.params.id,
        userId: req.user?.id 
      });
      
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Não foi possível buscar a tag'
      });
    }
  }

  /**
   * POST /api/admin/tags
   * Criar nova tag
   */
  static async createTag(req: Request, res: Response): Promise<void> {
    try {
      logger.info('Criando tag via API admin', { 
        userId: req.user?.id,
        body: req.body
      });

      const tag = await tagService.create(req.body);

      res.status(201).json({
        success: true,
        data: tag,
        message: 'Tag criada com sucesso'
      });

    } catch (error) {
      logger.error('Erro ao criar tag', { 
        error: error.message, 
        userId: req.user?.id,
        body: req.body 
      });

      if (error.message.includes('já existe')) {
        res.status(409).json({
          error: 'Conflito',
          message: error.message
        });
        return;
      }
      
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Não foi possível criar a tag'
      });
    }
  }

  /**
   * PUT /api/admin/tags/:id
   * Atualizar tag
   */
  static async updateTag(req: Request, res: Response): Promise<void> {
    try {
      const paramsResult = TagParamsSchema.safeParse(req.params);
      if (!paramsResult.success) {
        res.status(400).json({
          error: 'ID da tag inválido',
          details: paramsResult.error.issues
        });
        return;
      }

      const { id } = paramsResult.data;
      
      logger.info('Atualizando tag via API admin', { 
        tagId: id, 
        userId: req.user?.id,
        fields: Object.keys(req.body)
      });

      const updateData = { ...req.body, id };
      const tag = await tagService.update(updateData);

      res.json({
        success: true,
        data: tag,
        message: 'Tag atualizada com sucesso'
      });

    } catch (error) {
      logger.error('Erro ao atualizar tag', { 
        error: error.message, 
        tagId: req.params.id,
        userId: req.user?.id 
      });

      if (error.message.includes('não encontrada')) {
        res.status(404).json({
          error: 'Tag não encontrada'
        });
        return;
      }

      if (error.message.includes('sistema não podem ser editadas')) {
        res.status(403).json({
          error: 'Operação não permitida',
          message: error.message
        });
        return;
      }

      if (error.message.includes('já está em uso')) {
        res.status(409).json({
          error: 'Conflito',
          message: error.message
        });
        return;
      }
      
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Não foi possível atualizar a tag'
      });
    }
  }

  /**
   * DELETE /api/admin/tags/:id
   * Desativar tag
   */
  static async deactivateTag(req: Request, res: Response): Promise<void> {
    try {
      const paramsResult = TagParamsSchema.safeParse(req.params);
      if (!paramsResult.success) {
        res.status(400).json({
          error: 'ID da tag inválido',
          details: paramsResult.error.issues
        });
        return;
      }

      const { id } = paramsResult.data;
      
      logger.info('Desativando tag via API admin', { 
        tagId: id, 
        userId: req.user?.id 
      });

      await tagService.deactivate(id);

      res.json({
        success: true,
        message: 'Tag desativada com sucesso'
      });

    } catch (error) {
      logger.error('Erro ao desativar tag', { 
        error: error.message, 
        tagId: req.params.id,
        userId: req.user?.id 
      });

      if (error.message.includes('não encontrada')) {
        res.status(404).json({
          error: 'Tag não encontrada'
        });
        return;
      }

      if (error.message.includes('sistema não podem ser desativadas')) {
        res.status(403).json({
          error: 'Operação não permitida',
          message: error.message
        });
        return;
      }
      
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Não foi possível desativar a tag'
      });
    }
  }

  /**
   * GET /api/admin/reports/customers
   * Relatório de clientes
   */
  static async getCustomersReport(req: Request, res: Response): Promise<void> {
    try {
      const queryResult = ReportQuerySchema.safeParse(req.query);
      if (!queryResult.success) {
        res.status(400).json({
          error: 'Parâmetros de relatório inválidos',
          details: queryResult.error.issues
        });
        return;
      }

      const { start_date, end_date, user_id, format } = queryResult.data;
      
      logger.info('Gerando relatório de clientes via API admin', { 
        startDate: start_date,
        endDate: end_date,
        userId: user_id,
        format,
        requesterId: req.user?.id 
      });

      // Buscar dados para o relatório
      const filters: any = {};
      
      if (start_date) filters.created_after = start_date;
      if (end_date) filters.created_before = end_date;
      if (user_id) filters.assigned_to = user_id;

      // Buscar todos os clientes (sem paginação para relatório)
      filters.limit = 1000;
      
      const customersData = await customerService.list(filters);

      // Calcular estatísticas
      const stats = {
        total_customers: customersData.pagination.total,
        by_source: {} as Record<string, number>,
        by_status: {} as Record<string, number>,
        by_city: {} as Record<string, number>,
        by_assigned_user: {} as Record<string, number>
      };

      customersData.data.forEach(customer => {
        // Por fonte
        stats.by_source[customer.source] = (stats.by_source[customer.source] || 0) + 1;
        
        // Por status
        stats.by_status[customer.status] = (stats.by_status[customer.status] || 0) + 1;
        
        // Por cidade
        if (customer.city) {
          stats.by_city[customer.city] = (stats.by_city[customer.city] || 0) + 1;
        }
        
        // Por usuário atribuído
        if (customer.assigned_user) {
          const userName = customer.assigned_user.name;
          stats.by_assigned_user[userName] = (stats.by_assigned_user[userName] || 0) + 1;
        }
      });

      const report = {
        period: {
          start_date,
          end_date
        },
        generated_at: new Date().toISOString(),
        generated_by: req.user?.id,
        stats,
        customers: format === 'json' ? customersData.data : undefined
      };

      if (format === 'csv') {
        // TODO: Implementar geração de CSV
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="customers-report.csv"');
        
        // Por enquanto, retornar JSON
        res.json({
          success: true,
          message: 'Formato CSV será implementado em breve',
          data: report
        });
      } else {
        res.json({
          success: true,
          data: report
        });
      }

    } catch (error) {
      logger.error('Erro ao gerar relatório de clientes', { 
        error: error.message, 
        userId: req.user?.id 
      });
      
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Não foi possível gerar o relatório'
      });
    }
  }

  /**
   * GET /api/admin/reports/conversations
   * Relatório de conversas
   */
  static async getConversationsReport(req: Request, res: Response): Promise<void> {
    try {
      const queryResult = ReportQuerySchema.safeParse(req.query);
      if (!queryResult.success) {
        res.status(400).json({
          error: 'Parâmetros de relatório inválidos',
          details: queryResult.error.issues
        });
        return;
      }

      const { start_date, end_date, user_id, format } = queryResult.data;
      
      logger.info('Gerando relatório de conversas via API admin', { 
        startDate: start_date,
        endDate: end_date,
        userId: user_id,
        format,
        requesterId: req.user?.id 
      });

      // Buscar dados para o relatório
      const filters: any = {};
      
      if (start_date) filters.created_after = start_date;
      if (end_date) filters.created_before = end_date;
      if (user_id) filters.assigned_to = user_id;

      filters.limit = 1000;
      
      const conversationsData = await conversationService.list(filters);

      // Calcular estatísticas
      const stats = {
        total_conversations: conversationsData.pagination.total,
        by_channel: {} as Record<string, number>,
        by_status: {} as Record<string, number>,
        by_priority: {} as Record<string, number>,
        by_assigned_user: {} as Record<string, number>,
        avg_messages_per_conversation: 0,
        total_unread: 0
      };

      let totalMessages = 0;
      let totalUnread = 0;

      conversationsData.data.forEach(conversation => {
        // Por canal
        stats.by_channel[conversation.channel] = (stats.by_channel[conversation.channel] || 0) + 1;
        
        // Por status
        stats.by_status[conversation.status] = (stats.by_status[conversation.status] || 0) + 1;
        
        // Por prioridade
        stats.by_priority[conversation.priority] = (stats.by_priority[conversation.priority] || 0) + 1;
        
        // Por usuário atribuído
        if (conversation.assigned_user) {
          const userName = conversation.assigned_user.name;
          stats.by_assigned_user[userName] = (stats.by_assigned_user[userName] || 0) + 1;
        }

        // Mensagens
        totalMessages += conversation.message_count;
        totalUnread += conversation.unread_count;
      });

      stats.avg_messages_per_conversation = conversationsData.data.length > 0 
        ? Math.round(totalMessages / conversationsData.data.length * 100) / 100 
        : 0;
      stats.total_unread = totalUnread;

      const report = {
        period: {
          start_date,
          end_date
        },
        generated_at: new Date().toISOString(),
        generated_by: req.user?.id,
        stats,
        conversations: format === 'json' ? conversationsData.data : undefined
      };

      res.json({
        success: true,
        data: report
      });

    } catch (error) {
      logger.error('Erro ao gerar relatório de conversas', { 
        error: error.message, 
        userId: req.user?.id 
      });
      
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Não foi possível gerar o relatório'
      });
    }
  }

  /**
   * GET /api/admin/reports/appointments
   * Relatório de agendamentos
   */
  static async getAppointmentsReport(req: Request, res: Response): Promise<void> {
    try {
      const queryResult = ReportQuerySchema.safeParse(req.query);
      if (!queryResult.success) {
        res.status(400).json({
          error: 'Parâmetros de relatório inválidos',
          details: queryResult.error.issues
        });
        return;
      }

      const { start_date, end_date, user_id, format } = queryResult.data;
      
      logger.info('Gerando relatório de agendamentos via API admin', { 
        startDate: start_date,
        endDate: end_date,
        userId: user_id,
        format,
        requesterId: req.user?.id 
      });

      // Buscar estatísticas de agendamentos
      const stats = await appointmentReminderService.getAppointmentStats(user_id);

      const report = {
        period: {
          start_date,
          end_date
        },
        generated_at: new Date().toISOString(),
        generated_by: req.user?.id,
        stats
      };

      res.json({
        success: true,
        data: report
      });

    } catch (error) {
      logger.error('Erro ao gerar relatório de agendamentos', { 
        error: error.message, 
        userId: req.user?.id 
      });
      
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Não foi possível gerar o relatório'
      });
    }
  }

  /**
   * GET /api/admin/dashboard
   * Dashboard administrativo com métricas gerais
   */
  static async getDashboard(req: Request, res: Response): Promise<void> {
    try {
      logger.info('Buscando dashboard administrativo via API', { 
        userId: req.user?.id 
      });

      // Buscar métricas em paralelo
      const [
        customersStats,
        conversationsStats,
        appointmentsStats
      ] = await Promise.all([
        // Estatísticas de clientes (últimos 30 dias)
        customerService.list({ 
          created_after: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          limit: 1 
        }),
        
        // Estatísticas de conversas
        conversationService.list({ 
          created_after: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          limit: 1 
        }),
        
        // Estatísticas de agendamentos
        appointmentReminderService.getAppointmentStats()
      ]);

      const dashboard = {
        customers: {
          total: customersStats.pagination.total,
          new_this_month: customersStats.pagination.total // Aproximação
        },
        conversations: {
          total: conversationsStats.pagination.total,
          new_this_month: conversationsStats.pagination.total // Aproximação
        },
        appointments: appointmentsStats,
        generated_at: new Date().toISOString()
      };

      res.json({
        success: true,
        data: dashboard
      });

    } catch (error) {
      logger.error('Erro ao buscar dashboard administrativo', { 
        error: error.message, 
        userId: req.user?.id 
      });
      
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Não foi possível buscar o dashboard'
      });
    }
  }

  /**
   * POST /api/admin/export
   * Exportar dados do sistema
   */
  static async exportData(req: Request, res: Response): Promise<void> {
    try {
      const queryResult = ExportQuerySchema.safeParse(req.body);
      if (!queryResult.success) {
        res.status(400).json({
          error: 'Parâmetros de exportação inválidos',
          details: queryResult.error.issues
        });
        return;
      }

      const { type, filters, format } = queryResult.data;
      
      logger.info('Exportando dados via API admin', { 
        type,
        format,
        userId: req.user?.id 
      });

      let exportData: string;
      let filename: string;

      switch (type) {
        case 'customers':
          // TODO: Implementar exportação de clientes
          filename = `customers-export-${new Date().toISOString().split('T')[0]}.${format}`;
          exportData = 'Exportação de clientes será implementada';
          break;
          
        case 'conversations':
          // TODO: Implementar exportação de conversas
          filename = `conversations-export-${new Date().toISOString().split('T')[0]}.${format}`;
          exportData = 'Exportação de conversas será implementada';
          break;
          
        case 'appointments':
          // TODO: Implementar exportação de agendamentos
          filename = `appointments-export-${new Date().toISOString().split('T')[0]}.${format}`;
          exportData = 'Exportação de agendamentos será implementada';
          break;
          
        case 'timeline':
          // Implementar exportação de timeline
          if (filters) {
            const parsedFilters = JSON.parse(filters);
            exportData = await timelineManagementService.exportTimeline(
              parsedFilters.customer_id, 
              parsedFilters
            );
            filename = `timeline-export-${parsedFilters.customer_id}-${new Date().toISOString().split('T')[0]}.csv`;
          } else {
            throw new Error('Filtros são obrigatórios para exportação de timeline');
          }
          break;
          
        default:
          throw new Error('Tipo de exportação não suportado');
      }

      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(exportData);
      } else {
        res.json({
          success: true,
          data: exportData,
          filename
        });
      }

    } catch (error) {
      logger.error('Erro ao exportar dados', { 
        error: error.message, 
        userId: req.user?.id 
      });
      
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Não foi possível exportar os dados'
      });
    }
  }
}

export default AdminController;