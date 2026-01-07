// FAQ Management System - Service
// Created: 06/01/2026
// Author: Kiro AI

import { supabase } from '@/config/supabase';
import { FAQ, CreateFAQRequest, UpdateFAQRequest, FAQFilters, FAQResponse, FAQValidationError, FAQStats } from '@/types/faq.types';

class FAQService {
  private readonly TABLE = 'faqs';
  private cache: FAQ[] | null = null;
  private cacheExpiry: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

  // Validar dados de FAQ
  validateFAQ(faq: CreateFAQRequest): FAQValidationError[] {
    const errors: FAQValidationError[] = [];

    if (!faq.question || faq.question.trim().length < 10) {
      errors.push({ field: 'question', message: 'Pergunta deve ter pelo menos 10 caracteres' });
    }

    if (faq.question && faq.question.length > 200) {
      errors.push({ field: 'question', message: 'Pergunta deve ter no máximo 200 caracteres' });
    }

    if (!faq.answer || faq.answer.trim().length < 20) {
      errors.push({ field: 'answer', message: 'Resposta deve ter pelo menos 20 caracteres' });
    }

    if (faq.answer && faq.answer.length > 1000) {
      errors.push({ field: 'answer', message: 'Resposta deve ter no máximo 1000 caracteres' });
    }

    return errors;
  }

  // Sanitizar dados
  private sanitizeFAQ(faq: CreateFAQRequest): CreateFAQRequest {
    return {
      ...faq,
      question: faq.question.trim(),
      answer: faq.answer.trim()
    };
  }

  // Buscar FAQs ativas para a home (com cache)
  async getActiveFAQs(): Promise<FAQ[]> {
    const now = Date.now();
    
    if (this.cache && now < this.cacheExpiry) {
      return this.cache;
    }

    const { data, error } = await supabase
      .from(this.TABLE)
      .select('id, question, answer, display_order')
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Erro ao buscar FAQs ativas:', error);
      throw error;
    }

    this.cache = data || [];
    this.cacheExpiry = now + this.CACHE_DURATION;
    
    return this.cache;
  }

  // Buscar todas as FAQs para administração
  async getAllFAQs(filters: FAQFilters = {}): Promise<FAQResponse> {
    let query = supabase
      .from(this.TABLE)
      .select('*', { count: 'exact' })
      .is('deleted_at', null);

    // Aplicar filtros
    if (filters.search) {
      const searchTerm = `%${filters.search}%`;
      query = query.or(`question.ilike.${searchTerm},answer.ilike.${searchTerm}`);
    }

    if (filters.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    }

    // Paginação
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    query = query.range(from, to).order('display_order', { ascending: true });

    const { data, error, count } = await query;

    if (error) {
      console.error('Erro ao buscar FAQs:', error);
      throw error;
    }

    return {
      data: data || [],
      total: count || 0,
      page,
      limit
    };
  }

  // Criar nova FAQ
  async createFAQ(faqData: CreateFAQRequest): Promise<FAQ> {
    // Validar dados
    const errors = this.validateFAQ(faqData);
    if (errors.length > 0) {
      throw new Error(`Dados inválidos: ${errors.map(e => e.message).join(', ')}`);
    }

    // Sanitizar dados
    const sanitizedFaq = this.sanitizeFAQ(faqData);

    // Buscar próxima ordem se não especificada
    if (!sanitizedFaq.display_order) {
      const { data: maxOrder } = await supabase
        .from(this.TABLE)
        .select('display_order')
        .is('deleted_at', null)
        .order('display_order', { ascending: false })
        .limit(1);

      sanitizedFaq.display_order = (maxOrder?.[0]?.display_order || 0) + 1;
    }

    const { data, error } = await supabase
      .from(this.TABLE)
      .insert([sanitizedFaq])
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar FAQ:', error);
      throw error;
    }

    this.invalidateCache();
    return data;
  }

  // Atualizar FAQ
  async updateFAQ(faqData: UpdateFAQRequest): Promise<FAQ> {
    const { id, ...updateData } = faqData;

    // Validar dados se fornecidos
    if (updateData.question || updateData.answer) {
      const errors = this.validateFAQ(updateData as CreateFAQRequest);
      if (errors.length > 0) {
        throw new Error(`Dados inválidos: ${errors.map(e => e.message).join(', ')}`);
      }
    }

    // Sanitizar dados
    const sanitizedData = updateData.question || updateData.answer 
      ? this.sanitizeFAQ(updateData as CreateFAQRequest)
      : updateData;

    const { data, error } = await supabase
      .from(this.TABLE)
      .update(sanitizedData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar FAQ:', error);
      throw error;
    }

    this.invalidateCache();
    return data;
  }

  // Excluir FAQ (soft delete)
  async deleteFAQ(id: string): Promise<void> {
    const { error } = await supabase
      .from(this.TABLE)
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('Erro ao excluir FAQ:', error);
      throw error;
    }

    this.invalidateCache();
  }

  // Reordenar FAQs
  async reorderFAQs(faqs: { id: string; display_order: number }[]): Promise<void> {
    try {
      const updates = faqs.map(faq => 
        supabase
          .from(this.TABLE)
          .update({ display_order: faq.display_order })
          .eq('id', faq.id)
      );

      await Promise.all(updates);
      this.invalidateCache();
    } catch (error) {
      console.error('Erro ao reordenar FAQs:', error);
      throw error;
    }
  }

  // Alternar status ativo/inativo
  async toggleFAQStatus(id: string, is_active: boolean): Promise<FAQ> {
    const { data, error } = await supabase
      .from(this.TABLE)
      .update({ is_active })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao alterar status da FAQ:', error);
      throw error;
    }

    this.invalidateCache();
    return data;
  }

  // Invalidar cache
  private invalidateCache(): void {
    this.cache = null;
    this.cacheExpiry = 0;
  }

  // Obter estatísticas
  async getStats(): Promise<FAQStats> {
    const { data, error } = await supabase
      .from(this.TABLE)
      .select('is_active')
      .is('deleted_at', null);

    if (error) {
      console.error('Erro ao buscar estatísticas:', error);
      throw error;
    }

    const total = data.length;
    const active = data.filter(faq => faq.is_active).length;
    const inactive = total - active;

    return { total, active, inactive };
  }
}

export const faqService = new FAQService();