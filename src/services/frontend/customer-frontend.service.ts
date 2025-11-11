/**
 * Customer Frontend Service
 * Sprint 5: Sistema de CRM - Frontend
 * 
 * Service para integração com APIs de clientes
 */

import { supabase } from '@/config/supabase';

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  document?: string;
  birth_date?: string;
  gender?: string;
  address?: any;
  preferences?: any;
  health_conditions?: string[];
  source?: string;
  referral_code?: string;
  status: string;
  notes?: string;
  tags?: Tag[];
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  description?: string;
  category?: string;
}

export interface TimelineEvent {
  id: string;
  event_type: string;
  title: string;
  description?: string;
  metadata?: any;
  created_at: string;
  created_by?: string;
}

export interface CustomerFilters {
  search?: string;
  status?: string;
  source?: string;
  tags?: string[];
  created_after?: string;
  created_before?: string;
  page?: number;
  limit?: number;
}

export class CustomerFrontendService {
  /**
   * Lista clientes com filtros
   */
  async getCustomers(filters: CustomerFilters = {}): Promise<{
    data: Customer[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    const { page = 1, limit = 20, search, status, source, tags, created_after, created_before } = filters;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('customers')
      .select(`
        *,
        tags:customer_tag_assignments(
          tag:customer_tags(*)
        )
      `, { count: 'exact' })
      .is('deleted_at', null);

    // Filtros
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (source) {
      query = query.eq('source', source);
    }
    if (created_after) {
      query = query.gte('created_at', created_after);
    }
    if (created_before) {
      query = query.lte('created_at', created_before);
    }

    // Paginação
    query = query.range(offset, offset + limit - 1).order('created_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) throw error;

    // Transformar tags
    const customers = (data || []).map(customer => ({
      ...customer,
      tags: customer.tags?.map((t: any) => t.tag).filter(Boolean) || []
    }));

    return {
      data: customers,
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    };
  }

  /**
   * Busca cliente por ID
   */
  async getCustomerById(id: string): Promise<Customer> {
    const { data, error } = await supabase
      .from('customers')
      .select(`
        *,
        tags:customer_tag_assignments(
          tag:customer_tags(*)
        )
      `)
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error) throw error;

    return {
      ...data,
      tags: data.tags?.map((t: any) => t.tag).filter(Boolean) || []
    };
  }

  /**
   * Cria novo cliente
   */
  async createCustomer(customerData: Partial<Customer>): Promise<Customer> {
    const { data, error } = await supabase
      .from('customers')
      .insert(customerData)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Atualiza cliente
   */
  async updateCustomer(id: string, customerData: Partial<Customer>): Promise<Customer> {
    const { data, error } = await supabase
      .from('customers')
      .update(customerData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Exclui cliente (soft delete)
   */
  async deleteCustomer(id: string): Promise<void> {
    const { error } = await supabase
      .from('customers')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  }

  /**
   * Busca timeline do cliente
   */
  async getCustomerTimeline(customerId: string, filters?: {
    event_type?: string;
    limit?: number;
  }): Promise<TimelineEvent[]> {
    let query = supabase
      .from('customer_timeline')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (filters?.event_type) {
      query = query.eq('event_type', filters.event_type);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  }

  /**
   * Adiciona nota manual à timeline
   */
  async addNote(customerId: string, note: string): Promise<TimelineEvent> {
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('customer_timeline')
      .insert({
        customer_id: customerId,
        event_type: 'note',
        title: 'Nota adicionada',
        description: note,
        created_by: user?.id
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Adiciona tag ao cliente
   */
  async addTag(customerId: string, tagId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('customer_tag_assignments')
      .insert({
        customer_id: customerId,
        tag_id: tagId,
        applied_by: user?.id
      });

    if (error) throw error;
  }

  /**
   * Remove tag do cliente
   */
  async removeTag(customerId: string, tagId: string): Promise<void> {
    const { error } = await supabase
      .from('customer_tag_assignments')
      .delete()
      .eq('customer_id', customerId)
      .eq('tag_id', tagId);

    if (error) throw error;
  }

  /**
   * Busca tags disponíveis
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
   * Exporta clientes para CSV
   */
  async exportCustomers(filters: CustomerFilters = {}): Promise<Blob> {
    const { data } = await this.getCustomers({ ...filters, limit: 10000 });
    
    const csv = [
      ['Nome', 'Email', 'Telefone', 'Status', 'Origem', 'Data de Cadastro'].join(','),
      ...data.map(c => [
        c.name,
        c.email || '',
        c.phone || '',
        c.status,
        c.source || '',
        new Date(c.created_at).toLocaleDateString('pt-BR')
      ].join(','))
    ].join('\n');

    return new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  }
}

export const customerFrontendService = new CustomerFrontendService();
