/**
 * Tag Frontend Service
 * Sprint 5: Sistema de CRM - Frontend
 * 
 * Service para integração com APIs de tags
 */

import { supabase } from '@/config/supabase';

export interface Tag {
  id: string;
  name: string;
  color: string;
  description?: string;
  category?: string;
  auto_apply_rules?: any[];
  created_at: string;
}

export interface TagStats {
  tag_id: string;
  tag_name: string;
  customer_count: number;
  color: string;
}

export class TagFrontendService {
  /**
   * Lista todas as tags
   */
  async getTags(): Promise<Tag[]> {
    const { data, error } = await supabase
      .from('customer_tags')
      .select('*')
      .order('name');

    if (error) throw error;
    return data || [];
  }

  /**
   * Busca tag por ID
   */
  async getTagById(id: string): Promise<Tag> {
    const { data, error } = await supabase
      .from('customer_tags')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Cria nova tag
   */
  async createTag(tagData: Partial<Tag>): Promise<Tag> {
    const { data, error } = await supabase
      .from('customer_tags')
      .insert(tagData)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Atualiza tag
   */
  async updateTag(id: string, updates: Partial<Tag>): Promise<Tag> {
    const { data, error } = await supabase
      .from('customer_tags')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Exclui tag
   */
  async deleteTag(id: string): Promise<void> {
    const { error } = await supabase
      .from('customer_tags')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  /**
   * Busca estatísticas de uso das tags
   */
  async getTagStats(): Promise<TagStats[]> {
    const { data, error } = await supabase
      .from('customer_tags')
      .select(`
        id,
        name,
        color,
        customer_tags:customer_tag_assignments(count)
      `);

    if (error) throw error;

    return (data || []).map(tag => ({
      tag_id: tag.id,
      tag_name: tag.name,
      color: tag.color,
      customer_count: tag.customer_tags?.[0]?.count || 0
    }));
  }

  /**
   * Busca tags por categoria
   */
  async getTagsByCategory(category: string): Promise<Tag[]> {
    const { data, error } = await supabase
      .from('customer_tags')
      .select('*')
      .eq('category', category)
      .order('name');

    if (error) throw error;
    return data || [];
  }

  /**
   * Busca categorias disponíveis
   */
  async getCategories(): Promise<string[]> {
    const { data, error } = await supabase
      .from('customer_tags')
      .select('category')
      .not('category', 'is', null);

    if (error) throw error;

    const categories = [...new Set((data || []).map(t => t.category).filter(Boolean))];
    return categories as string[];
  }

  /**
   * Cores predefinidas para tags
   */
  getDefaultColors(): string[] {
    return [
      '#EF4444', // red
      '#F59E0B', // amber
      '#10B981', // green
      '#3B82F6', // blue
      '#8B5CF6', // purple
      '#EC4899', // pink
      '#6366F1', // indigo
      '#14B8A6', // teal
      '#F97316', // orange
      '#84CC16', // lime
    ];
  }

  /**
   * Valida nome de tag (único)
   */
  async validateTagName(name: string, excludeId?: string): Promise<boolean> {
    let query = supabase
      .from('customer_tags')
      .select('id')
      .eq('name', name);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data } = await query;
    return !data || data.length === 0;
  }
}

export const tagFrontendService = new TagFrontendService();

