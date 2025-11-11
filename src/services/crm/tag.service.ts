/**
 * Tag Service
 * Sprint 5: Sistema de CRM e Gestão de Clientes
 * 
 * Serviço para gestão de tags de clientes, incluindo aplicação automática,
 * regras de negócio e estatísticas de uso.
 */

import { supabase } from '@/config/supabase';
import { z } from 'zod';
import { logger } from '@/utils/logger';

// ============================================
// SCHEMAS DE VALIDAÇÃO
// ============================================

// Schema para criação de tag
export const CreateTagSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor deve estar no formato hexadecimal (#RRGGBB)'),
  description: z.string().optional(),
  auto_apply_rules: z.record(z.any()).default({}),
  is_active: z.boolean().default(true)
});

// Schema para atualização de tag
export const UpdateTagSchema = CreateTagSchema.partial().extend({
  id: z.string().uuid()
});

// Schema para aplicação de tag
export const ApplyTagSchema = z.object({
  customer_id: z.string().uuid(),
  tag_id: z.string().uuid(),
  auto_applied: z.boolean().default(false)
});

// Tipos TypeScript
export type CreateTagData = z.infer<typeof CreateTagSchema>;
export type UpdateTagData = z.infer<typeof UpdateTagSchema>;
export type ApplyTagData = z.infer<typeof ApplyTagSchema>;

export interface Tag {
  id: string;
  name: string;
  color: string;
  description?: string;
  auto_apply_rules: Record<string, any>;
  is_system: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TagWithStats extends Tag {
  customer_count: number;
  recent_applications: number; // aplicações nos últimos 30 dias
  usage_trend: 'up' | 'down' | 'stable';
}

export interface TagAssignment {
  id: string;
  customer_id: string;
  tag_id: string;
  assigned_by?: string;
  assigned_at: string;
  auto_applied: boolean;
  customer?: {
    id: string;
    name: string;
    email: string;
  };
  tag?: {
    id: string;
    name: string;
    color: string;
  };
}

// ============================================
// TAG SERVICE
// ============================================

class TagService {
  /**
   * Criar nova tag
   */
  async create(data: CreateTagData): Promise<Tag> {
    try {
      // Validar dados de entrada
      const validatedData = CreateTagSchema.parse(data);
      
      logger.info('Criando nova tag', { name: validatedData.name, color: validatedData.color });
      
      // Verificar se nome já existe
      const { data: existingTag } = await supabase
        .from('customer_tags')
        .select('id, name')
        .eq('name', validatedData.name)
        .single();
      
      if (existingTag) {
        throw new Error(`Tag com nome "${validatedData.name}" já existe`);
      }
      
      // Inserir tag
      const { data: tag, error } = await supabase
        .from('customer_tags')
        .insert({
          ...validatedData,
          is_system: false // Tags criadas via API nunca são do sistema
        })
        .select()
        .single();
      
      if (error) {
        logger.error('Erro ao criar tag', { error: error.message, data: validatedData });
        throw new Error(`Erro ao criar tag: ${error.message}`);
      }
      
      logger.info('Tag criada com sucesso', { id: tag.id, name: tag.name });
      
      return tag;
    } catch (error) {
      logger.error('Erro no TagService.create', { error: error.message, data });
      throw error;
    }
  }
  
  /**
   * Buscar tag por ID
   */
  async getById(id: string): Promise<TagWithStats | null> {
    try {
      logger.info('Buscando tag por ID', { id });
      
      const { data: tag, error } = await supabase
        .from('customer_tags')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Tag não encontrada
        }
        logger.error('Erro ao buscar tag', { error: error.message, id });
        throw new Error(`Erro ao buscar tag: ${error.message}`);
      }
      
      // Buscar estatísticas
      const stats = await this.getTagStats(id);
      
      return {
        ...tag,
        ...stats
      };
    } catch (error) {
      logger.error('Erro no TagService.getById', { error: error.message, id });
      throw error;
    }
  }
  
  /**
   * Listar todas as tags ativas
   */
  async list(includeStats: boolean = false): Promise<Tag[] | TagWithStats[]> {
    try {
      logger.info('Listando tags', { includeStats });
      
      const { data: tags, error } = await supabase
        .from('customer_tags')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (error) {
        logger.error('Erro ao listar tags', { error: error.message });
        throw new Error(`Erro ao listar tags: ${error.message}`);
      }
      
      if (!includeStats) {
        return tags || [];
      }
      
      // Adicionar estatísticas
      const tagsWithStats = await Promise.all(
        tags.map(async (tag) => {
          const stats = await this.getTagStats(tag.id);
          return {
            ...tag,
            ...stats
          };
        })
      );
      
      return tagsWithStats;
    } catch (error) {
      logger.error('Erro no TagService.list', { error: error.message });
      throw error;
    }
  }
  
  /**
   * Atualizar tag
   */
  async update(data: UpdateTagData): Promise<Tag> {
    try {
      // Validar dados de entrada
      const validatedData = UpdateTagSchema.parse(data);
      const { id, ...updateData } = validatedData;
      
      logger.info('Atualizando tag', { id, fields: Object.keys(updateData) });
      
      // Verificar se tag existe
      const existingTag = await this.getById(id);
      if (!existingTag) {
        throw new Error(`Tag ${id} não encontrada`);
      }
      
      // Verificar se é tag do sistema
      if (existingTag.is_system) {
        throw new Error('Tags do sistema não podem ser editadas');
      }
      
      // Se nome está sendo alterado, verificar unicidade
      if (updateData.name && updateData.name !== existingTag.name) {
        const { data: nameExists } = await supabase
          .from('customer_tags')
          .select('id')
          .eq('name', updateData.name)
          .neq('id', id)
          .single();
        
        if (nameExists) {
          throw new Error(`Nome "${updateData.name}" já está em uso`);
        }
      }
      
      // Atualizar tag
      const { data: tag, error } = await supabase
        .from('customer_tags')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        logger.error('Erro ao atualizar tag', { error: error.message, id, data: updateData });
        throw new Error(`Erro ao atualizar tag: ${error.message}`);
      }
      
      logger.info('Tag atualizada com sucesso', { id, name: tag.name });
      
      return tag;
    } catch (error) {
      logger.error('Erro no TagService.update', { error: error.message, data });
      throw error;
    }
  }
  
  /**
   * Desativar tag (soft delete)
   */
  async deactivate(id: string): Promise<void> {
    try {
      logger.info('Desativando tag', { id });
      
      // Verificar se tag existe
      const existingTag = await this.getById(id);
      if (!existingTag) {
        throw new Error(`Tag ${id} não encontrada`);
      }
      
      // Verificar se é tag do sistema
      if (existingTag.is_system) {
        throw new Error('Tags do sistema não podem ser desativadas');
      }
      
      // Desativar tag
      const { error } = await supabase
        .from('customer_tags')
        .update({ is_active: false })
        .eq('id', id);
      
      if (error) {
        logger.error('Erro ao desativar tag', { error: error.message, id });
        throw new Error(`Erro ao desativar tag: ${error.message}`);
      }
      
      logger.info('Tag desativada com sucesso', { id });
    } catch (error) {
      logger.error('Erro no TagService.deactivate', { error: error.message, id });
      throw error;
    }
  }
  
  /**
   * Aplicar tag a um cliente
   */
  async applyToCustomer(data: ApplyTagData): Promise<TagAssignment> {
    try {
      // Validar dados de entrada
      const validatedData = ApplyTagSchema.parse(data);
      
      logger.info('Aplicando tag ao cliente', { 
        customerId: validatedData.customer_id, 
        tagId: validatedData.tag_id 
      });
      
      // Verificar se tag e cliente existem
      const [tag, customer] = await Promise.all([
        this.getById(validatedData.tag_id),
        supabase.from('customers').select('id').eq('id', validatedData.customer_id).single()
      ]);
      
      if (!tag) {
        throw new Error(`Tag ${validatedData.tag_id} não encontrada`);
      }
      
      if (customer.error) {
        throw new Error(`Cliente ${validatedData.customer_id} não encontrado`);
      }
      
      // Verificar se já não está aplicada
      const { data: existingAssignment } = await supabase
        .from('customer_tag_assignments')
        .select('id')
        .eq('customer_id', validatedData.customer_id)
        .eq('tag_id', validatedData.tag_id)
        .single();
      
      if (existingAssignment) {
        throw new Error('Tag já está aplicada a este cliente');
      }
      
      // Aplicar tag
      const { data: assignment, error } = await supabase
        .from('customer_tag_assignments')
        .insert({
          customer_id: validatedData.customer_id,
          tag_id: validatedData.tag_id,
          auto_applied: validatedData.auto_applied,
          assigned_by: validatedData.auto_applied ? null : 'current_user' // TODO: pegar usuário atual
        })
        .select(`
          *,
          customer:customer_id(
            id,
            name,
            email
          ),
          tag:tag_id(
            id,
            name,
            color
          )
        `)
        .single();
      
      if (error) {
        logger.error('Erro ao aplicar tag', { error: error.message, data: validatedData });
        throw new Error(`Erro ao aplicar tag: ${error.message}`);
      }
      
      logger.info('Tag aplicada com sucesso', { 
        assignmentId: assignment.id,
        customerId: validatedData.customer_id,
        tagId: validatedData.tag_id
      });
      
      return assignment;
    } catch (error) {
      logger.error('Erro no TagService.applyToCustomer', { error: error.message, data });
      throw error;
    }
  }
  
  /**
   * Remover tag de um cliente
   */
  async removeFromCustomer(customerId: string, tagId: string): Promise<void> {
    try {
      logger.info('Removendo tag do cliente', { customerId, tagId });
      
      // Verificar se assignment existe
      const { data: assignment } = await supabase
        .from('customer_tag_assignments')
        .select('id, auto_applied')
        .eq('customer_id', customerId)
        .eq('tag_id', tagId)
        .single();
      
      if (!assignment) {
        throw new Error('Tag não está aplicada a este cliente');
      }
      
      // Remover assignment
      const { error } = await supabase
        .from('customer_tag_assignments')
        .delete()
        .eq('id', assignment.id);
      
      if (error) {
        logger.error('Erro ao remover tag', { error: error.message, customerId, tagId });
        throw new Error(`Erro ao remover tag: ${error.message}`);
      }
      
      logger.info('Tag removida com sucesso', { customerId, tagId });
    } catch (error) {
      logger.error('Erro no TagService.removeFromCustomer', { error: error.message, customerId, tagId });
      throw error;
    }
  }
  
  /**
   * Buscar tags de um cliente
   */
  async getCustomerTags(customerId: string): Promise<Tag[]> {
    try {
      logger.info('Buscando tags do cliente', { customerId });
      
      const { data: assignments, error } = await supabase
        .from('customer_tag_assignments')
        .select(`
          customer_tags(
            id,
            name,
            color,
            description,
            auto_apply_rules,
            is_system,
            is_active,
            created_at,
            updated_at
          )
        `)
        .eq('customer_id', customerId);
      
      if (error) {
        logger.error('Erro ao buscar tags do cliente', { error: error.message, customerId });
        throw new Error(`Erro ao buscar tags: ${error.message}`);
      }
      
      return assignments?.map(a => a.customer_tags).filter(Boolean) || [];
    } catch (error) {
      logger.error('Erro no TagService.getCustomerTags', { error: error.message, customerId });
      throw error;
    }
  }
  
  /**
   * Aplicar tags automáticas baseadas em evento
   */
  async applyAutomaticTags(customerId: string, eventType: string, eventData: Record<string, any> = {}): Promise<TagAssignment[]> {
    try {
      logger.info('Aplicando tags automáticas', { customerId, eventType, eventData });
      
      // Buscar tags com regras de auto-aplicação
      const { data: tags, error } = await supabase
        .from('customer_tags')
        .select('*')
        .eq('is_active', true)
        .neq('auto_apply_rules', '{}');
      
      if (error) {
        logger.error('Erro ao buscar tags para aplicação automática', { error: error.message });
        throw new Error(`Erro ao buscar tags: ${error.message}`);
      }
      
      const appliedTags: TagAssignment[] = [];
      
      for (const tag of tags || []) {
        const shouldApply = this.evaluateAutoApplyRules(tag.auto_apply_rules, eventType, eventData);
        
        if (shouldApply) {
          try {
            const assignment = await this.applyToCustomer({
              customer_id: customerId,
              tag_id: tag.id,
              auto_applied: true
            });
            
            appliedTags.push(assignment);
          } catch (error) {
            // Ignorar erro se tag já estiver aplicada
            if (!error.message.includes('já está aplicada')) {
              logger.error('Erro ao aplicar tag automática', { 
                error: error.message, 
                customerId, 
                tagId: tag.id 
              });
            }
          }
        }
      }
      
      logger.info('Tags automáticas aplicadas', { 
        customerId, 
        eventType, 
        appliedCount: appliedTags.length 
      });
      
      return appliedTags;
    } catch (error) {
      logger.error('Erro no TagService.applyAutomaticTags', { error: error.message, customerId, eventType });
      throw error;
    }
  }
  
  /**
   * Avaliar regras de auto-aplicação
   */
  private evaluateAutoApplyRules(
    rules: Record<string, any>, 
    eventType: string, 
    eventData: Record<string, any>
  ): boolean {
    try {
      // Regras baseadas no tipo de evento
      switch (eventType) {
        case 'registration':
          return rules.on_registration === true;
          
        case 'first_purchase':
          return rules.on_first_purchase === true;
          
        case 'referral':
          return rules.on_referral === true;
          
        case 'order_value':
          if (rules.min_order_value && eventData.order_value_cents) {
            return eventData.order_value_cents >= rules.min_order_value;
          }
          return false;
          
        case 'ltv_threshold':
          if (rules.min_ltv && eventData.ltv_cents) {
            return eventData.ltv_cents >= rules.min_ltv;
          }
          return false;
          
        case 'order_count':
          if (rules.min_orders && eventData.order_count) {
            return eventData.order_count >= rules.min_orders;
          }
          return false;
          
        default:
          return false;
      }
    } catch (error) {
      logger.error('Erro ao avaliar regras de auto-aplicação', { error: error.message, rules, eventType });
      return false;
    }
  }
  
  /**
   * Buscar estatísticas de uma tag
   */
  private async getTagStats(tagId: string): Promise<{
    customer_count: number;
    recent_applications: number;
    usage_trend: 'up' | 'down' | 'stable';
  }> {
    try {
      // Contar total de clientes com esta tag
      const { count: customerCount } = await supabase
        .from('customer_tag_assignments')
        .select('*', { count: 'exact', head: true })
        .eq('tag_id', tagId);
      
      // Contar aplicações nos últimos 30 dias
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { count: recentApplications } = await supabase
        .from('customer_tag_assignments')
        .select('*', { count: 'exact', head: true })
        .eq('tag_id', tagId)
        .gte('assigned_at', thirtyDaysAgo.toISOString());
      
      // Calcular tendência (comparar com 30 dias anteriores)
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
      
      const { count: previousPeriodApplications } = await supabase
        .from('customer_tag_assignments')
        .select('*', { count: 'exact', head: true })
        .eq('tag_id', tagId)
        .gte('assigned_at', sixtyDaysAgo.toISOString())
        .lt('assigned_at', thirtyDaysAgo.toISOString());
      
      let usage_trend: 'up' | 'down' | 'stable' = 'stable';
      
      if ((recentApplications || 0) > (previousPeriodApplications || 0)) {
        usage_trend = 'up';
      } else if ((recentApplications || 0) < (previousPeriodApplications || 0)) {
        usage_trend = 'down';
      }
      
      return {
        customer_count: customerCount || 0,
        recent_applications: recentApplications || 0,
        usage_trend
      };
    } catch (error) {
      logger.error('Erro ao buscar estatísticas da tag', { error: error.message, tagId });
      return {
        customer_count: 0,
        recent_applications: 0,
        usage_trend: 'stable'
      };
    }
  }
}

export const tagService = new TagService();