/**
 * Customer Controller
 * Sprint 5: Sistema de CRM e Gestão de Clientes
 * 
 * Controller REST para operações de clientes com validação,
 * autorização e tratamento de erros.
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import { customerService, customerSearchService } from '@/services/crm/customer.service';
import { tagService } from '@/services/crm/tag.service';
import { timelineManagementService } from '@/services/crm/timeline.service';
import { logger } from '@/utils/logger';

// ============================================
// SCHEMAS DE VALIDAÇÃO PARA API
// ============================================

// Schema para parâmetros de rota
const CustomerParamsSchema = z.object({
  id: z.string().uuid('ID do cliente deve ser um UUID válido')
});

// Schema para query parameters de listagem
const CustomerQuerySchema = z.object({
  search: z.string().optional(),
  status: z.enum(['active', 'inactive', 'blocked']).optional(),
  source: z.enum(['organic', 'affiliate', 'n8n', 'manual']).optional(),
  assigned_to: z.string().uuid().optional(),
  tags: z.string().optional(), // IDs separados por vírgula
  city: z.string().optional(),
  state: z.string().optional(),
  created_after: z.string().datetime().optional(),
  created_before: z.string().datetime().optional(),
  has_orders: z.string().transform(val => val === 'true').optional(),
  page: z.string().transform(val => parseInt(val) || 1).optional(),
  limit: z.string().transform(val => Math.min(parseInt(val) || 20, 100)).optional(),
  sort_by: z.enum(['name', 'email', 'created_at', 'updated_at']).optional(),
  sort_order: z.enum(['asc', 'desc']).optional()
});

// Schema para busca avançada
const AdvancedSearchQuerySchema = z.object({
  query: z.string().optional(),
  age_min: z.string().transform(val => val ? parseInt(val) : undefined).optional(),
  age_max: z.string().transform(val => val ? parseInt(val) : undefined).optional(),
  cities: z.string().optional(), // separados por vírgula
  states: z.string().optional(), // separados por vírgula
  has_whatsapp_conversations: z.string().transform(val => val === 'true').optional(),
  has_appointments: z.string().transform(val => val === 'true').optional(),
  last_activity_days: z.string().transform(val => val ? parseInt(val) : undefined).optional(),
  referral_codes: z.string().optional(), // separados por vírgula
  assigned_users: z.string().optional(), // separados por vírgula
  include_tags: z.string().optional(), // separados por vírgula
  exclude_tags: z.string().optional(), // separados por vírgula
  any_tags: z.string().optional(), // separados por vírgula
  registered_after: z.string().datetime().optional(),
  registered_before: z.string().datetime().optional(),
  min_total_spent: z.string().transform(val => val ? parseInt(val) : undefined).optional(),
  max_total_spent: z.string().transform(val => val ? parseInt(val) : undefined).optional(),
  min_orders: z.string().transform(val => val ? parseInt(val) : undefined).optional(),
  max_orders: z.string().transform(val => val ? parseInt(val) : undefined).optional(),
  page: z.string().transform(val => parseInt(val) || 1).optional(),
  limit: z.string().transform(val => Math.min(parseInt(val) || 20, 100)).optional()
});

// ============================================
// CUSTOMER CONTROLLER
// ============================================

export class CustomerController {
  /**
   * GET /api/customers
   * Listar clientes com filtros e paginação
   */
  static async list(req: Request, res: Response): Promise<void> {
    try {
      // Validar query parameters
      const queryResult = CustomerQuerySchema.safeParse(req.query);
      if (!queryResult.success) {
        res.status(400).json({
          error: 'Parâmetros inválidos',
          details: queryResult.error.issues
        });
        return;
      }

      const query = queryResult.data;
      
      logger.info('Listando clientes via API', { 
        query, 
        userId: req.user?.id,
        userRole: req.user?.role 
      });

      // Converter tags string para array
      const tags = query.tags ? query.tags.split(',').filter(Boolean) : undefined;

      // Preparar filtros
      const filters = {
        search: query.search,
        status: query.status,
        source: query.source,
        assigned_to: query.assigned_to,
        tags,
        city: query.city,
        state: query.state,
        created_after: query.created_after,
        created_before: query.created_before,
        has_orders: query.has_orders,
        page: query.page || 1,
        limit: query.limit || 20,
        sort_by: query.sort_by || 'created_at',
        sort_order: query.sort_order || 'desc'
      };

      // Aplicar filtros de RLS baseados no papel do usuário
      if (req.user?.role === 'vendedor') {
        filters.assigned_to = req.user.id; // Vendedores só veem seus clientes
      }

      const result = await customerService.list(filters);

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination
      });

    } catch (error) {
      logger.error('Erro ao listar clientes', { 
        error: error.message, 
        userId: req.user?.id,
        query: req.query 
      });
      
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Não foi possível listar os clientes'
      });
    }
  }

  /**
   * GET /api/customers/search
   * Busca avançada de clientes
   */
  static async advancedSearch(req: Request, res: Response): Promise<void> {
    try {
      // Validar query parameters
      const queryResult = AdvancedSearchQuerySchema.safeParse(req.query);
      if (!queryResult.success) {
        res.status(400).json({
          error: 'Parâmetros de busca inválidos',
          details: queryResult.error.issues
        });
        return;
      }

      const query = queryResult.data;
      
      logger.info('Busca avançada de clientes via API', { 
        query, 
        userId: req.user?.id 
      });

      // Converter strings separadas por vírgula em arrays
      const filters = {
        query: query.query,
        age_min: query.age_min,
        age_max: query.age_max,
        cities: query.cities ? query.cities.split(',').filter(Boolean) : undefined,
        states: query.states ? query.states.split(',').filter(Boolean) : undefined,
        has_whatsapp_conversations: query.has_whatsapp_conversations,
        has_appointments: query.has_appointments,
        last_activity_days: query.last_activity_days,
        referral_codes: query.referral_codes ? query.referral_codes.split(',').filter(Boolean) : undefined,
        assigned_users: query.assigned_users ? query.assigned_users.split(',').filter(Boolean) : undefined,
        include_tags: query.include_tags ? query.include_tags.split(',').filter(Boolean) : undefined,
        exclude_tags: query.exclude_tags ? query.exclude_tags.split(',').filter(Boolean) : undefined,
        any_tags: query.any_tags ? query.any_tags.split(',').filter(Boolean) : undefined,
        registered_after: query.registered_after,
        registered_before: query.registered_before,
        min_total_spent: query.min_total_spent,
        max_total_spent: query.max_total_spent,
        min_orders: query.min_orders,
        max_orders: query.max_orders
      };

      const pagination = {
        page: query.page || 1,
        limit: query.limit || 20
      };

      const result = await customerSearchService.advancedSearch(filters, pagination);

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination
      });

    } catch (error) {
      logger.error('Erro na busca avançada de clientes', { 
        error: error.message, 
        userId: req.user?.id,
        query: req.query 
      });
      
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Não foi possível realizar a busca'
      });
    }
  }

  /**
   * GET /api/customers/quick-search
   * Busca rápida para autocomplete
   */
  static async quickSearch(req: Request, res: Response): Promise<void> {
    try {
      const { q: query, limit } = req.query;

      if (!query || typeof query !== 'string') {
        res.status(400).json({
          error: 'Parâmetro "q" é obrigatório'
        });
        return;
      }

      if (query.length < 2) {
        res.json({
          success: true,
          data: []
        });
        return;
      }

      logger.info('Busca rápida de clientes via API', { 
        query, 
        limit,
        userId: req.user?.id 
      });

      const searchLimit = limit ? Math.min(parseInt(limit as string), 20) : 10;
      const result = await customerSearchService.quickSearch(query, searchLimit);

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      logger.error('Erro na busca rápida de clientes', { 
        error: error.message, 
        userId: req.user?.id,
        query: req.query 
      });
      
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Não foi possível realizar a busca'
      });
    }
  }

  /**
   * GET /api/customers/:id
   * Buscar cliente por ID
   */
  static async getById(req: Request, res: Response): Promise<void> {
    try {
      // Validar parâmetros
      const paramsResult = CustomerParamsSchema.safeParse(req.params);
      if (!paramsResult.success) {
        res.status(400).json({
          error: 'ID do cliente inválido',
          details: paramsResult.error.issues
        });
        return;
      }

      const { id } = paramsResult.data;
      
      logger.info('Buscando cliente por ID via API', { 
        customerId: id, 
        userId: req.user?.id 
      });

      const customer = await customerService.getById(id);

      if (!customer) {
        res.status(404).json({
          error: 'Cliente não encontrado'
        });
        return;
      }

      // Verificar permissões RLS
      if (req.user?.role === 'vendedor' && customer.assigned_to !== req.user.id) {
        res.status(403).json({
          error: 'Acesso negado',
          message: 'Você não tem permissão para acessar este cliente'
        });
        return;
      }

      res.json({
        success: true,
        data: customer
      });

    } catch (error) {
      logger.error('Erro ao buscar cliente por ID', { 
        error: error.message, 
        customerId: req.params.id,
        userId: req.user?.id 
      });
      
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Não foi possível buscar o cliente'
      });
    }
  }

  /**
   * POST /api/customers
   * Criar novo cliente
   */
  static async create(req: Request, res: Response): Promise<void> {
    try {
      logger.info('Criando cliente via API', { 
        userId: req.user?.id,
        body: { ...req.body, cpf_cnpj: req.body.cpf_cnpj ? '[REDACTED]' : undefined }
      });

      // Se não especificado, atribuir ao usuário atual (se for vendedor)
      if (!req.body.assigned_to && req.user?.role === 'vendedor') {
        req.body.assigned_to = req.user.id;
      }

      const customer = await customerService.create(req.body);

      res.status(201).json({
        success: true,
        data: customer,
        message: 'Cliente criado com sucesso'
      });

    } catch (error) {
      logger.error('Erro ao criar cliente', { 
        error: error.message, 
        userId: req.user?.id,
        body: req.body 
      });

      // Tratar erros específicos
      if (error.message.includes('já existe')) {
        res.status(409).json({
          error: 'Conflito',
          message: error.message
        });
        return;
      }

      if (error.message.includes('validação')) {
        res.status(400).json({
          error: 'Dados inválidos',
          message: error.message
        });
        return;
      }
      
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Não foi possível criar o cliente'
      });
    }
  }

  /**
   * PUT /api/customers/:id
   * Atualizar cliente
   */
  static async update(req: Request, res: Response): Promise<void> {
    try {
      // Validar parâmetros
      const paramsResult = CustomerParamsSchema.safeParse(req.params);
      if (!paramsResult.success) {
        res.status(400).json({
          error: 'ID do cliente inválido',
          details: paramsResult.error.issues
        });
        return;
      }

      const { id } = paramsResult.data;
      
      logger.info('Atualizando cliente via API', { 
        customerId: id, 
        userId: req.user?.id,
        fields: Object.keys(req.body)
      });

      // Verificar se cliente existe e se usuário tem permissão
      const existingCustomer = await customerService.getById(id);
      if (!existingCustomer) {
        res.status(404).json({
          error: 'Cliente não encontrado'
        });
        return;
      }

      // Verificar permissões RLS
      if (req.user?.role === 'vendedor' && existingCustomer.assigned_to !== req.user.id) {
        res.status(403).json({
          error: 'Acesso negado',
          message: 'Você não tem permissão para editar este cliente'
        });
        return;
      }

      const updateData = { ...req.body, id };
      const customer = await customerService.update(updateData);

      res.json({
        success: true,
        data: customer,
        message: 'Cliente atualizado com sucesso'
      });

    } catch (error) {
      logger.error('Erro ao atualizar cliente', { 
        error: error.message, 
        customerId: req.params.id,
        userId: req.user?.id 
      });

      // Tratar erros específicos
      if (error.message.includes('não encontrado')) {
        res.status(404).json({
          error: 'Cliente não encontrado'
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
        message: 'Não foi possível atualizar o cliente'
      });
    }
  }

  /**
   * DELETE /api/customers/:id
   * Remover cliente (soft delete)
   */
  static async delete(req: Request, res: Response): Promise<void> {
    try {
      // Validar parâmetros
      const paramsResult = CustomerParamsSchema.safeParse(req.params);
      if (!paramsResult.success) {
        res.status(400).json({
          error: 'ID do cliente inválido',
          details: paramsResult.error.issues
        });
        return;
      }

      const { id } = paramsResult.data;
      
      logger.info('Removendo cliente via API', { 
        customerId: id, 
        userId: req.user?.id 
      });

      // Verificar se cliente existe e se usuário tem permissão
      const existingCustomer = await customerService.getById(id);
      if (!existingCustomer) {
        res.status(404).json({
          error: 'Cliente não encontrado'
        });
        return;
      }

      // Apenas admins podem remover clientes
      if (req.user?.role !== 'admin') {
        res.status(403).json({
          error: 'Acesso negado',
          message: 'Apenas administradores podem remover clientes'
        });
        return;
      }

      await customerService.delete(id);

      res.json({
        success: true,
        message: 'Cliente removido com sucesso'
      });

    } catch (error) {
      logger.error('Erro ao remover cliente', { 
        error: error.message, 
        customerId: req.params.id,
        userId: req.user?.id 
      });

      if (error.message.includes('não encontrado')) {
        res.status(404).json({
          error: 'Cliente não encontrado'
        });
        return;
      }
      
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Não foi possível remover o cliente'
      });
    }
  }

  /**
   * GET /api/customers/:id/timeline
   * Buscar timeline do cliente
   */
  static async getTimeline(req: Request, res: Response): Promise<void> {
    try {
      // Validar parâmetros
      const paramsResult = CustomerParamsSchema.safeParse(req.params);
      if (!paramsResult.success) {
        res.status(400).json({
          error: 'ID do cliente inválido',
          details: paramsResult.error.issues
        });
        return;
      }

      const { id } = paramsResult.data;
      
      // Validar query parameters para filtros de timeline
      const {
        event_types,
        date_from,
        date_to,
        search,
        page = '1',
        limit = '20'
      } = req.query;

      logger.info('Buscando timeline do cliente via API', { 
        customerId: id, 
        userId: req.user?.id 
      });

      // Verificar se cliente existe e se usuário tem permissão
      const existingCustomer = await customerService.getById(id);
      if (!existingCustomer) {
        res.status(404).json({
          error: 'Cliente não encontrado'
        });
        return;
      }

      // Verificar permissões RLS
      if (req.user?.role === 'vendedor' && existingCustomer.assigned_to !== req.user.id) {
        res.status(403).json({
          error: 'Acesso negado',
          message: 'Você não tem permissão para acessar este cliente'
        });
        return;
      }

      // Preparar filtros
      const filters = {
        customer_id: id,
        event_types: event_types ? (event_types as string).split(',') : undefined,
        date_from: date_from as string,
        date_to: date_to as string,
        search: search as string,
        page: parseInt(page as string) || 1,
        limit: Math.min(parseInt(limit as string) || 20, 100)
      };

      const timeline = await timelineManagementService.getCustomerTimeline(filters);

      res.json({
        success: true,
        data: timeline.data,
        pagination: timeline.pagination
      });

    } catch (error) {
      logger.error('Erro ao buscar timeline do cliente', { 
        error: error.message, 
        customerId: req.params.id,
        userId: req.user?.id 
      });
      
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Não foi possível buscar a timeline'
      });
    }
  }

  /**
   * POST /api/customers/:id/notes
   * Adicionar nota ao cliente
   */
  static async addNote(req: Request, res: Response): Promise<void> {
    try {
      // Validar parâmetros
      const paramsResult = CustomerParamsSchema.safeParse(req.params);
      if (!paramsResult.success) {
        res.status(400).json({
          error: 'ID do cliente inválido',
          details: paramsResult.error.issues
        });
        return;
      }

      const { id } = paramsResult.data;
      const { title, content, is_private = false } = req.body;

      if (!title || !content) {
        res.status(400).json({
          error: 'Título e conteúdo são obrigatórios'
        });
        return;
      }
      
      logger.info('Adicionando nota ao cliente via API', { 
        customerId: id, 
        userId: req.user?.id,
        title 
      });

      // Verificar se cliente existe e se usuário tem permissão
      const existingCustomer = await customerService.getById(id);
      if (!existingCustomer) {
        res.status(404).json({
          error: 'Cliente não encontrado'
        });
        return;
      }

      // Verificar permissões RLS
      if (req.user?.role === 'vendedor' && existingCustomer.assigned_to !== req.user.id) {
        res.status(403).json({
          error: 'Acesso negado',
          message: 'Você não tem permissão para adicionar notas a este cliente'
        });
        return;
      }

      const noteData = {
        customer_id: id,
        title,
        content,
        is_private,
        created_by: req.user!.id
      };

      const note = await timelineManagementService.addNote(noteData);

      res.status(201).json({
        success: true,
        data: note,
        message: 'Nota adicionada com sucesso'
      });

    } catch (error) {
      logger.error('Erro ao adicionar nota ao cliente', { 
        error: error.message, 
        customerId: req.params.id,
        userId: req.user?.id 
      });
      
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Não foi possível adicionar a nota'
      });
    }
  }

  /**
   * GET /api/customers/:id/tags
   * Buscar tags do cliente
   */
  static async getTags(req: Request, res: Response): Promise<void> {
    try {
      // Validar parâmetros
      const paramsResult = CustomerParamsSchema.safeParse(req.params);
      if (!paramsResult.success) {
        res.status(400).json({
          error: 'ID do cliente inválido',
          details: paramsResult.error.issues
        });
        return;
      }

      const { id } = paramsResult.data;
      
      logger.info('Buscando tags do cliente via API', { 
        customerId: id, 
        userId: req.user?.id 
      });

      const tags = await tagService.getCustomerTags(id);

      res.json({
        success: true,
        data: tags
      });

    } catch (error) {
      logger.error('Erro ao buscar tags do cliente', { 
        error: error.message, 
        customerId: req.params.id,
        userId: req.user?.id 
      });
      
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Não foi possível buscar as tags'
      });
    }
  }

  /**
   * POST /api/customers/:id/tags
   * Aplicar tag ao cliente
   */
  static async addTag(req: Request, res: Response): Promise<void> {
    try {
      // Validar parâmetros
      const paramsResult = CustomerParamsSchema.safeParse(req.params);
      if (!paramsResult.success) {
        res.status(400).json({
          error: 'ID do cliente inválido',
          details: paramsResult.error.issues
        });
        return;
      }

      const { id } = paramsResult.data;
      const { tag_id } = req.body;

      if (!tag_id) {
        res.status(400).json({
          error: 'ID da tag é obrigatório'
        });
        return;
      }
      
      logger.info('Aplicando tag ao cliente via API', { 
        customerId: id, 
        tagId: tag_id,
        userId: req.user?.id 
      });

      const tagAssignment = await tagService.applyToCustomer({
        customer_id: id,
        tag_id: tag_id,
        auto_applied: false
      });

      res.status(201).json({
        success: true,
        data: tagAssignment,
        message: 'Tag aplicada com sucesso'
      });

    } catch (error) {
      logger.error('Erro ao aplicar tag ao cliente', { 
        error: error.message, 
        customerId: req.params.id,
        userId: req.user?.id 
      });

      if (error.message.includes('já está aplicada')) {
        res.status(409).json({
          error: 'Conflito',
          message: error.message
        });
        return;
      }
      
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Não foi possível aplicar a tag'
      });
    }
  }

  /**
   * DELETE /api/customers/:id/tags/:tagId
   * Remover tag do cliente
   */
  static async removeTag(req: Request, res: Response): Promise<void> {
    try {
      // Validar parâmetros
      const paramsResult = z.object({
        id: z.string().uuid(),
        tagId: z.string().uuid()
      }).safeParse(req.params);

      if (!paramsResult.success) {
        res.status(400).json({
          error: 'IDs inválidos',
          details: paramsResult.error.issues
        });
        return;
      }

      const { id, tagId } = paramsResult.data;
      
      logger.info('Removendo tag do cliente via API', { 
        customerId: id, 
        tagId,
        userId: req.user?.id 
      });

      await tagService.removeFromCustomer(id, tagId);

      res.json({
        success: true,
        message: 'Tag removida com sucesso'
      });

    } catch (error) {
      logger.error('Erro ao remover tag do cliente', { 
        error: error.message, 
        customerId: req.params.id,
        tagId: req.params.tagId,
        userId: req.user?.id 
      });

      if (error.message.includes('não está aplicada')) {
        res.status(404).json({
          error: 'Tag não encontrada',
          message: error.message
        });
        return;
      }
      
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Não foi possível remover a tag'
      });
    }
  }
}

// Middleware de autenticação (placeholder)
export const requireAuth = (req: Request, res: Response, next: Function) => {
  // TODO: Implementar autenticação JWT/Supabase
  // Por enquanto, simular usuário autenticado
  req.user = {
    id: 'user-123',
    role: 'admin', // ou 'vendedor'
    email: 'user@example.com'
  };
  next();
};

// Middleware de autorização por papel
export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: Function) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({
        error: 'Acesso negado',
        message: 'Você não tem permissão para acessar este recurso'
      });
      return;
    }
    next();
  };
};

// Estender interface Request para incluir user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: string;
        email: string;
      };
    }
  }
}