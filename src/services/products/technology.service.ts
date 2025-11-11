/**
 * TechnologyService - Serviço de Tecnologias
 * Sprint 2: Sistema de Produtos
 * 
 * Gerencia tecnologias terapêuticas dos colchões
 */

import { supabase, supabaseAdmin } from '../../config/database';
import { logger } from '../../utils/logger';
import { Technology } from '../../types/product.types';

export class TechnologyService {
  /**
   * Lista todas as tecnologias ativas (API pública)
   */
  async listTechnologies(): Promise<Technology[]> {
    try {
      logger.info('TechnologyService', 'Listing technologies');

      const { data, error } = await supabase
        .from('technologies')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) {
        logger.error('TechnologyService', 'Failed to list technologies', error);
        throw error;
      }

      logger.info('TechnologyService', 'Technologies listed successfully', {
        count: data?.length || 0,
      });

      return (data || []) as Technology[];
    } catch (error) {
      logger.error('TechnologyService', 'List technologies error', error as Error);
      throw error;
    }
  }

  /**
   * Busca tecnologia por ID
   */
  async getTechnologyById(id: string): Promise<Technology | null> {
    try {
      const { data, error } = await supabase
        .from('technologies')
        .select('*')
        .eq('id', id)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        logger.warn('TechnologyService', 'Technology not found', { technologyId: id });
        return null;
      }

      return data as Technology;
    } catch (error) {
      logger.error('TechnologyService', 'Get technology by ID error', error as Error, {
        technologyId: id,
      });
      return null;
    }
  }

  /**
   * Busca tecnologia por slug
   */
  async getTechnologyBySlug(slug: string): Promise<Technology | null> {
    try {
      const { data, error } = await supabase
        .from('technologies')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        logger.warn('TechnologyService', 'Technology not found', { slug });
        return null;
      }

      return data as Technology;
    } catch (error) {
      logger.error('TechnologyService', 'Get technology by slug error', error as Error, { slug });
      return null;
    }
  }

  /**
   * Cria nova tecnologia (Admin)
   */
  async createTechnology(input: {
    name: string;
    slug: string;
    description: string;
    icon_url?: string;
    display_order?: number;
  }): Promise<Technology> {
    try {
      logger.info('TechnologyService', 'Creating technology', { name: input.name });

      const { data, error } = await supabaseAdmin
        .from('technologies')
        .insert(input)
        .select()
        .single();

      if (error || !data) {
        logger.error('TechnologyService', 'Failed to create technology', error);
        throw error || new Error('Technology creation failed');
      }

      logger.info('TechnologyService', 'Technology created successfully', {
        technologyId: data.id,
      });

      return data as Technology;
    } catch (error) {
      logger.error('TechnologyService', 'Create technology error', error as Error);
      throw error;
    }
  }

  /**
   * Atualiza tecnologia (Admin)
   */
  async updateTechnology(
    id: string,
    input: Partial<{
      name: string;
      slug: string;
      description: string;
      icon_url: string;
      is_active: boolean;
      display_order: number;
    }>
  ): Promise<Technology> {
    try {
      logger.info('TechnologyService', 'Updating technology', { technologyId: id });

      const { data, error } = await supabaseAdmin
        .from('technologies')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error || !data) {
        logger.error('TechnologyService', 'Failed to update technology', error);
        throw error || new Error('Technology update failed');
      }

      logger.info('TechnologyService', 'Technology updated successfully', {
        technologyId: id,
      });

      return data as Technology;
    } catch (error) {
      logger.error('TechnologyService', 'Update technology error', error as Error, {
        technologyId: id,
      });
      throw error;
    }
  }

  /**
   * Ativa/desativa tecnologia (Admin)
   */
  async toggleTechnology(id: string, isActive: boolean): Promise<void> {
    try {
      logger.info('TechnologyService', 'Toggling technology', { technologyId: id, isActive });

      const { error } = await supabaseAdmin
        .from('technologies')
        .update({ is_active: isActive })
        .eq('id', id);

      if (error) {
        logger.error('TechnologyService', 'Failed to toggle technology', error);
        throw error;
      }

      logger.info('TechnologyService', 'Technology toggled successfully', {
        technologyId: id,
        isActive,
      });
    } catch (error) {
      logger.error('TechnologyService', 'Toggle technology error', error as Error, {
        technologyId: id,
      });
      throw error;
    }
  }
}

// Exportar instância singleton
export const technologyService = new TechnologyService();
