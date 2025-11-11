import { Request, Response } from 'express';
import { TagService } from '@/services/crm/tag.service';
import { Logger } from '@/utils/logger';
import { z } from 'zod';

const CreateTagSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  description: z.string().max(500).optional(),
  category: z.string().max(50).optional(),
  auto_apply_rules: z.array(z.object({
    field: z.string(),
    operator: z.enum(['equals', 'contains', 'starts_with', 'ends_with']),
    value: z.string()
  })).optional()
});

const UpdateTagSchema = CreateTagSchema.partial();

export class TagController {
  private tagService: TagService;

  constructor() {
    this.tagService = new TagService();
  }

  async findAll(req: Request, res: Response) {
    try {
      const { category, search } = req.query;
      
      const filters = {
        category: category as string,
        search: search as string
      };

      const tags = await this.tagService.findMany(filters);
      
      Logger.info('TagController', 'Tags listadas', { 
        count: tags.length,
        filters,
        user_id: req.user?.id 
      });

      res.json({ data: tags });
    } catch (error) {
      Logger.error('TagController', 'Erro ao listar tags', error as Error, {
        user_id: req.user?.id
      });
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async findById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      const tag = await this.tagService.findById(id);
      
      if (!tag) {
        return res.status(404).json({ error: 'Tag não encontrada' });
      }

      Logger.info('TagController', 'Tag encontrada', { 
        tag_id: id,
        user_id: req.user?.id 
      });

      res.json(tag);
    } catch (error) {
      Logger.error('TagController', 'Erro ao buscar tag', error as Error, {
        tag_id: req.params.id,
        user_id: req.user?.id
      });
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const result = CreateTagSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ 
          error: 'Dados inválidos',
          details: result.error.issues 
        });
      }

      const tag = await this.tagService.create(result.data);
      
      Logger.info('TagController', 'Tag criada', { 
        tag_id: tag.id,
        name: tag.name,
        user_id: req.user?.id 
      });

      res.status(201).json(tag);
    } catch (error) {
      Logger.error('TagController', 'Erro ao criar tag', error as Error, {
        data: req.body,
        user_id: req.user?.id
      });
      
      if ((error as Error).message.includes('já existe')) {
        return res.status(409).json({ error: 'Tag com este nome já existe' });
      }
      
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = UpdateTagSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ 
          error: 'Dados inválidos',
          details: result.error.issues 
        });
      }

      const tag = await this.tagService.update(id, result.data);
      
      if (!tag) {
        return res.status(404).json({ error: 'Tag não encontrada' });
      }

      Logger.info('TagController', 'Tag atualizada', { 
        tag_id: id,
        changes: Object.keys(result.data),
        user_id: req.user?.id 
      });

      res.json(tag);
    } catch (error) {
      Logger.error('TagController', 'Erro ao atualizar tag', error as Error, {
        tag_id: req.params.id,
        data: req.body,
        user_id: req.user?.id
      });
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      await this.tagService.delete(id);
      
      Logger.info('TagController', 'Tag excluída', { 
        tag_id: id,
        user_id: req.user?.id 
      });

      res.status(204).send();
    } catch (error) {
      Logger.error('TagController', 'Erro ao excluir tag', error as Error, {
        tag_id: req.params.id,
        user_id: req.user?.id
      });
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async getUsageStats(req: Request, res: Response) {
    try {
      const stats = await this.tagService.getUsageStats();
      
      Logger.info('TagController', 'Estatísticas de uso obtidas', { 
        tags_count: stats.length,
        user_id: req.user?.id 
      });

      res.json({ data: stats });
    } catch (error) {
      Logger.error('TagController', 'Erro ao obter estatísticas', error as Error, {
        user_id: req.user?.id
      });
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async suggestTags(req: Request, res: Response) {
    try {
      const { customer_id } = req.params;
      
      const suggestions = await this.tagService.suggestTags(customer_id);
      
      Logger.info('TagController', 'Tags sugeridas', { 
        customer_id,
        suggestions_count: suggestions.length,
        user_id: req.user?.id 
      });

      res.json({ data: suggestions });
    } catch (error) {
      Logger.error('TagController', 'Erro ao sugerir tags', error as Error, {
        customer_id: req.params.customer_id,
        user_id: req.user?.id
      });
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async applyAutoRules(req: Request, res: Response) {
    try {
      const { customer_id } = req.params;
      
      const appliedTags = await this.tagService.applyAutoRules(customer_id);
      
      Logger.info('TagController', 'Regras automáticas aplicadas', { 
        customer_id,
        applied_tags: appliedTags,
        user_id: req.user?.id 
      });

      res.json({ 
        message: 'Regras aplicadas com sucesso',
        applied_tags: appliedTags 
      });
    } catch (error) {
      Logger.error('TagController', 'Erro ao aplicar regras automáticas', error as Error, {
        customer_id: req.params.customer_id,
        user_id: req.user?.id
      });
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
}