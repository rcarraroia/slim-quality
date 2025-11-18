/**
 * Customer Service
 * Sprint 5: Sistema de CRM e Gestão de Clientes
 * 
 * Serviço principal para gestão de clientes com CRUD completo,
 * validações, busca avançada e integração com timeline.
 */

import { supabase } from '@/config/supabase';
import { z } from 'zod';
import { logger } from '@/utils/logger';

// ============================================
// SCHEMAS DE VALIDAÇÃO
// ============================================

// Schema para criação de cliente
export const CreateCustomerSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(255),
  email: z.string().email('Email inválido').max(255),
  phone: z.string().regex(/^\+?[1-9][0-9]{8,14}$/, 'Telefone inválido').optional(),
  cpf_cnpj: z.string().optional(),
  birth_date: z.string().optional(), // ISO date string
  
  // Endereço
  street: z.string().max(255).optional(),
  number: z.string().max(10).optional(),
  complement: z.string().max(100).optional(),
  neighborhood: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  state: z.string().length(2).optional(),
  postal_code: z.string().regex(/^[0-9]{5}-?[0-9]{3}$/, 'CEP inválido').optional(),
  
  // Metadata
  source: z.enum(['organic', 'affiliate', 'n8n', 'manual']).default('manual'),
  referral_code: z.string().max(20).optional(),
  assigned_to: z.string().uuid().optional(),
  notes: z.string().optional()
});

// Schema para atualização de cliente
export const UpdateCustomerSchema = CreateCustomerSchema.partial().extend({
  id: z.string().uuid()
});

// Schema para filtros de busca
export const CustomerFiltersSchema = z.object({
  search: z.string().optional(), // busca em nome, email, telefone
  status: z.enum(['active', 'inactive', 'blocked']).optional(),
  source: z.enum(['organic', 'affiliate', 'n8n', 'manual']).optional(),
  assigned_to: z.string().uuid().optional(),
  tags: z.array(z.string().uuid()).optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  created_after: z.string().optional(), // ISO date
  created_before: z.string().optional(), // ISO date
  has_orders: z.boolean().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  sort_by: z.enum(['name', 'email', 'created_at', 'updated_at']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc')
});

// Tipos TypeScript
export type CreateCustomerData = z.infer<typeof CreateCustomerSchema>;
export type UpdateCustomerData = z.infer<typeof UpdateCustomerSchema>;
export type CustomerFilters = z.infer<typeof CustomerFiltersSchema>;

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  cpf_cnpj?: string;
  birth_date?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  source: 'organic' | 'affiliate' | 'n8n' | 'manual';
  referral_code?: string;
  assigned_to?: string;
  status: 'active' | 'inactive' | 'blocked';
  notes?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface CustomerWithStats extends Customer {
  total_orders: number;
  total_spent_cents: number;
  last_order_at?: string;
  tags: Array<{
    id: string;
    name: string;
    color: string;
  }>;
  assigned_user?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface PaginatedCustomers {
  data: CustomerWithStats[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

// ============================================
// CUSTOMER SERVICE
// ============================================

class CustomerService {
  /**
   * Criar novo cliente
   */
  async create(data: CreateCustomerData): Promise<Customer> {
    try {
      // Validar dados de entrada
      const validatedData = CreateCustomerSchema.parse(data);
      
      logger.info('Criando novo cliente', { email: validatedData.email, source: validatedData.source });
      
      // Verificar se email já existe
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id, email')
        .eq('email', validatedData.email)
        .is('deleted_at', null)
        .single();
      
      if (existingCustomer) {
        throw new Error(`Cliente com email ${validatedData.email} já existe`);
      }
      
      // Inserir cliente
      const { data: customer, error } = await supabase
        .from('customers')
        .insert(validatedData)
        .select()
        .single();
      
      if (error) {
        logger.error('Erro ao criar cliente', { error: error.message, data: validatedData });
        throw new Error(`Erro ao criar cliente: ${error.message}`);
      }
      
      logger.info('Cliente criado com sucesso', { id: customer.id, email: customer.email });
      
      return customer;
    } catch (error) {
      logger.error('Erro no CustomerService.create', { error: error.message, data });
      throw error;
    }
  }
  
  /**
   * Buscar cliente por ID
   */
  async getById(id: string): Promise<CustomerWithStats | null> {
    try {
      logger.info('Buscando cliente por ID', { id });
      
      const { data: customer, error } = await supabase
        .from('customers')
        .select(`
          *,
          assigned_user:assigned_to(
            id,
            name,
            email
          )
        `)
        .eq('id', id)
        .is('deleted_at', null)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Cliente não encontrado
        }
        logger.error('Erro ao buscar cliente', { error: error.message, id });
        throw new Error(`Erro ao buscar cliente: ${error.message}`);
      }
      
      // Buscar tags do cliente
      const { data: tags } = await supabase
        .from('customer_tag_assignments')
        .select(`
          customer_tags(
            id,
            name,
            color
          )
        `)
        .eq('customer_id', id);
      
      // Buscar estatísticas de pedidos (integração futura com sistema de vendas)
      const customerWithStats: CustomerWithStats = {
        ...customer,
        total_orders: 0, // TODO: integrar com sistema de vendas
        total_spent_cents: 0, // TODO: integrar com sistema de vendas
        last_order_at: undefined, // TODO: integrar com sistema de vendas
        tags: tags?.map(t => t.customer_tags).filter(Boolean) || [],
        assigned_user: customer.assigned_user
      };
      
      return customerWithStats;
    } catch (error) {
      logger.error('Erro no CustomerService.getById', { error: error.message, id });
      throw error;
    }
  }
  
  /**
   * Buscar cliente por email
   */
  async getByEmail(email: string): Promise<Customer | null> {
    try {
      logger.info('Buscando cliente por email', { email });
      
      const { data: customer, error } = await supabase
        .from('customers')
        .select('*')
        .eq('email', email)
        .is('deleted_at', null)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Cliente não encontrado
        }
        logger.error('Erro ao buscar cliente por email', { error: error.message, email });
        throw new Error(`Erro ao buscar cliente: ${error.message}`);
      }
      
      return customer;
    } catch (error) {
      logger.error('Erro no CustomerService.getByEmail', { error: error.message, email });
      throw error;
    }
  }
  
  /**
   * Buscar cliente por telefone
   */
  async getByPhone(phone: string): Promise<Customer | null> {
    try {
      logger.info('Buscando cliente por telefone', { phone });
      
      const { data: customer, error } = await supabase
        .from('customers')
        .select('*')
        .eq('phone', phone)
        .is('deleted_at', null)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Cliente não encontrado
        }
        logger.error('Erro ao buscar cliente por telefone', { error: error.message, phone });
        throw new Error(`Erro ao buscar cliente: ${error.message}`);
      }
      
      return customer;
    } catch (error) {
      logger.error('Erro no CustomerService.getByPhone', { error: error.message, phone });
      throw error;
    }
  }
  
  /**
   * Atualizar cliente
   */
  async update(data: UpdateCustomerData): Promise<Customer> {
    try {
      // Validar dados de entrada
      const validatedData = UpdateCustomerSchema.parse(data);
      const { id, ...updateData } = validatedData;
      
      logger.info('Atualizando cliente', { id, fields: Object.keys(updateData) });
      
      // Verificar se cliente existe
      const existingCustomer = await this.getById(id);
      if (!existingCustomer) {
        throw new Error(`Cliente ${id} não encontrado`);
      }
      
      // Se email está sendo alterado, verificar unicidade
      if (updateData.email && updateData.email !== existingCustomer.email) {
        const { data: emailExists } = await supabase
          .from('customers')
          .select('id')
          .eq('email', updateData.email)
          .neq('id', id)
          .is('deleted_at', null)
          .single();
        
        if (emailExists) {
          throw new Error(`Email ${updateData.email} já está em uso`);
        }
      }
      
      // Atualizar cliente
      const { data: customer, error } = await supabase
        .from('customers')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        logger.error('Erro ao atualizar cliente', { error: error.message, id, data: updateData });
        throw new Error(`Erro ao atualizar cliente: ${error.message}`);
      }
      
      logger.info('Cliente atualizado com sucesso', { id, email: customer.email });
      
      return customer;
    } catch (error) {
      logger.error('Erro no CustomerService.update', { error: error.message, data });
      throw error;
    }
  }
  
  /**
   * Soft delete de cliente
   */
  async delete(id: string): Promise<void> {
    try {
      logger.info('Removendo cliente (soft delete)', { id });
      
      // Verificar se cliente existe
      const existingCustomer = await this.getById(id);
      if (!existingCustomer) {
        throw new Error(`Cliente ${id} não encontrado`);
      }
      
      // Soft delete
      const { error } = await supabase
        .from('customers')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      
      if (error) {
        logger.error('Erro ao remover cliente', { error: error.message, id });
        throw new Error(`Erro ao remover cliente: ${error.message}`);
      }
      
      logger.info('Cliente removido com sucesso', { id });
    } catch (error) {
      logger.error('Erro no CustomerService.delete', { error: error.message, id });
      throw error;
    }
  }
  
  /**
   * Listar clientes com filtros e paginação
   */
  async list(filters: Partial<CustomerFilters> = {}): Promise<PaginatedCustomers> {
    try {
      // Validar filtros
      const validatedFilters = CustomerFiltersSchema.parse(filters);
      
      logger.info('Listando clientes', { filters: validatedFilters });
      
      // Construir query base
      let query = supabase
        .from('customers')
        .select(`
          *,
          assigned_user:assigned_to(
            id,
            name,
            email
          )
        `, { count: 'exact' })
        .is('deleted_at', null);
      
      // Aplicar filtros
      if (validatedFilters.search) {
        query = query.or(`name.ilike.%${validatedFilters.search}%,email.ilike.%${validatedFilters.search}%,phone.ilike.%${validatedFilters.search}%`);
      }
      
      if (validatedFilters.status) {
        query = query.eq('status', validatedFilters.status);
      }
      
      if (validatedFilters.source) {
        query = query.eq('source', validatedFilters.source);
      }
      
      if (validatedFilters.assigned_to) {
        query = query.eq('assigned_to', validatedFilters.assigned_to);
      }
      
      if (validatedFilters.city) {
        query = query.ilike('city', `%${validatedFilters.city}%`);
      }
      
      if (validatedFilters.state) {
        query = query.eq('state', validatedFilters.state);
      }
      
      if (validatedFilters.created_after) {
        query = query.gte('created_at', validatedFilters.created_after);
      }
      
      if (validatedFilters.created_before) {
        query = query.lte('created_at', validatedFilters.created_before);
      }
      
      // Ordenação
      query = query.order(validatedFilters.sort_by, { ascending: validatedFilters.sort_order === 'asc' });
      
      // Paginação
      const offset = (validatedFilters.page - 1) * validatedFilters.limit;
      query = query.range(offset, offset + validatedFilters.limit - 1);
      
      const { data: customers, error, count } = await query;
      
      if (error) {
        logger.error('Erro ao listar clientes', { error: error.message, filters: validatedFilters });
        throw new Error(`Erro ao listar clientes: ${error.message}`);
      }
      
      // Buscar tags para cada cliente (otimização futura: fazer em uma query)
      const customersWithTags = await Promise.all(
        customers.map(async (customer) => {
          const { data: tags } = await supabase
            .from('customer_tag_assignments')
            .select(`
              customer_tags(
                id,
                name,
                color
              )
            `)
            .eq('customer_id', customer.id);
          
          return {
            ...customer,
            total_orders: 0, // TODO: integrar com sistema de vendas
            total_spent_cents: 0, // TODO: integrar com sistema de vendas
            last_order_at: undefined, // TODO: integrar com sistema de vendas
            tags: tags?.map(t => t.customer_tags).filter(Boolean) || []
          };
        })
      );
      
      // Calcular paginação
      const total = count || 0;
      const total_pages = Math.ceil(total / validatedFilters.limit);
      
      const result: PaginatedCustomers = {
        data: customersWithTags,
        pagination: {
          page: validatedFilters.page,
          limit: validatedFilters.limit,
          total,
          total_pages,
          has_next: validatedFilters.page < total_pages,
          has_prev: validatedFilters.page > 1
        }
      };
      
      logger.info('Clientes listados com sucesso', { 
        total, 
        page: validatedFilters.page, 
        returned: customers.length 
      });
      
      return result;
    } catch (error) {
      logger.error('Erro no CustomerService.list', { error: error.message, filters });
      throw error;
    }
  }
}

// Exportar classe e instância
export { CustomerService };
export const customerService = new CustomerService();

// ============================================
// SISTEMA DE BUSCA AVANÇADA E FILTROS
// ============================================

/**
 * Busca avançada de clientes com múltiplos critérios
 */
export interface AdvancedSearchFilters {
  // Busca textual
  query?: string; // busca em nome, email, telefone, CPF/CNPJ
  
  // Filtros demográficos
  age_min?: number;
  age_max?: number;
  cities?: string[];
  states?: string[];
  
  // Filtros de comportamento
  has_whatsapp_conversations?: boolean;
  has_appointments?: boolean;
  last_activity_days?: number; // últimos X dias de atividade
  
  // Filtros de relacionamento
  referral_codes?: string[]; // clientes de afiliados específicos
  assigned_users?: string[]; // vendedores específicos
  
  // Filtros de tags
  include_tags?: string[]; // deve ter TODAS essas tags
  exclude_tags?: string[]; // NÃO deve ter nenhuma dessas tags
  any_tags?: string[]; // deve ter PELO MENOS uma dessas tags
  
  // Filtros temporais
  registered_after?: string;
  registered_before?: string;
  last_order_after?: string;
  last_order_before?: string;
  
  // Filtros de valor
  min_total_spent?: number; // em centavos
  max_total_spent?: number; // em centavos
  min_orders?: number;
  max_orders?: number;
}

class CustomerSearchService {
  /**
   * Busca avançada com múltiplos critérios
   */
  async advancedSearch(
    filters: AdvancedSearchFilters,
    pagination: { page: number; limit: number } = { page: 1, limit: 20 }
  ): Promise<PaginatedCustomers> {
    try {
      logger.info('Executando busca avançada de clientes', { filters, pagination });
      
      // Construir query complexa
      let query = supabase
        .from('customers')
        .select(`
          *,
          assigned_user:assigned_to(
            id,
            name,
            email
          )
        `, { count: 'exact' })
        .is('deleted_at', null);
      
      // Busca textual (full-text search)
      if (filters.query) {
        const searchTerm = filters.query.trim();
        
        // Se parece com CPF/CNPJ (apenas números)
        if (/^[0-9]+$/.test(searchTerm)) {
          query = query.or(`cpf_cnpj.like.%${searchTerm}%,phone.like.%${searchTerm}%`);
        } else {
          // Busca textual normal
          query = query.textSearch('search_vector', searchTerm, {
            type: 'websearch',
            config: 'portuguese'
          });
        }
      }
      
      // Filtros demográficos
      if (filters.age_min || filters.age_max) {
        const currentYear = new Date().getFullYear();
        
        if (filters.age_min) {
          const maxBirthYear = currentYear - filters.age_min;
          query = query.lte('birth_date', `${maxBirthYear}-12-31`);
        }
        
        if (filters.age_max) {
          const minBirthYear = currentYear - filters.age_max;
          query = query.gte('birth_date', `${minBirthYear}-01-01`);
        }
      }
      
      if (filters.cities && filters.cities.length > 0) {
        query = query.in('city', filters.cities);
      }
      
      if (filters.states && filters.states.length > 0) {
        query = query.in('state', filters.states);
      }
      
      // Filtros de relacionamento
      if (filters.referral_codes && filters.referral_codes.length > 0) {
        query = query.in('referral_code', filters.referral_codes);
      }
      
      if (filters.assigned_users && filters.assigned_users.length > 0) {
        query = query.in('assigned_to', filters.assigned_users);
      }
      
      // Filtros temporais
      if (filters.registered_after) {
        query = query.gte('created_at', filters.registered_after);
      }
      
      if (filters.registered_before) {
        query = query.lte('created_at', filters.registered_before);
      }
      
      // Paginação
      const offset = (pagination.page - 1) * pagination.limit;
      query = query.range(offset, offset + pagination.limit - 1);
      
      const { data: customers, error, count } = await query;
      
      if (error) {
        logger.error('Erro na busca avançada', { error: error.message, filters });
        throw new Error(`Erro na busca: ${error.message}`);
      }
      
      // Aplicar filtros complexos que requerem joins (tags, conversas, etc.)
      let filteredCustomers = customers;
      
      // Filtro de tags
      if (filters.include_tags?.length || filters.exclude_tags?.length || filters.any_tags?.length) {
        filteredCustomers = await this.filterByTags(filteredCustomers, {
          include: filters.include_tags,
          exclude: filters.exclude_tags,
          any: filters.any_tags
        });
      }
      
      // Filtro de conversas WhatsApp
      if (filters.has_whatsapp_conversations) {
        filteredCustomers = await this.filterByWhatsAppConversations(filteredCustomers);
      }
      
      // Filtro de agendamentos
      if (filters.has_appointments) {
        filteredCustomers = await this.filterByAppointments(filteredCustomers);
      }
      
      // Adicionar dados complementares
      const customersWithData = await Promise.all(
        filteredCustomers.map(async (customer) => {
          const [tags, stats] = await Promise.all([
            this.getCustomerTags(customer.id),
            this.getCustomerStats(customer.id)
          ]);
          
          return {
            ...customer,
            tags,
            ...stats
          };
        })
      );
      
      // Recalcular paginação após filtros
      const total = count || 0;
      const total_pages = Math.ceil(total / pagination.limit);
      
      const result: PaginatedCustomers = {
        data: customersWithData,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total,
          total_pages,
          has_next: pagination.page < total_pages,
          has_prev: pagination.page > 1
        }
      };
      
      logger.info('Busca avançada concluída', { 
        total_found: customersWithData.length,
        filters_applied: Object.keys(filters).length
      });
      
      return result;
    } catch (error) {
      logger.error('Erro no CustomerSearchService.advancedSearch', { error: error.message, filters });
      throw error;
    }
  }
  
  /**
   * Filtrar clientes por tags
   */
  private async filterByTags(
    customers: any[],
    tagFilters: {
      include?: string[];
      exclude?: string[];
      any?: string[];
    }
  ): Promise<any[]> {
    if (!customers.length) return customers;
    
    const customerIds = customers.map(c => c.id);
    
    // Buscar todas as tags dos clientes
    const { data: assignments } = await supabase
      .from('customer_tag_assignments')
      .select('customer_id, tag_id')
      .in('customer_id', customerIds);
    
    const customerTags = assignments?.reduce((acc, assignment) => {
      if (!acc[assignment.customer_id]) {
        acc[assignment.customer_id] = [];
      }
      acc[assignment.customer_id].push(assignment.tag_id);
      return acc;
    }, {} as Record<string, string[]>) || {};
    
    return customers.filter(customer => {
      const customerTagIds = customerTags[customer.id] || [];
      
      // Deve ter TODAS as tags incluídas
      if (tagFilters.include?.length) {
        const hasAllIncluded = tagFilters.include.every(tagId => 
          customerTagIds.includes(tagId)
        );
        if (!hasAllIncluded) return false;
      }
      
      // NÃO deve ter nenhuma das tags excluídas
      if (tagFilters.exclude?.length) {
        const hasExcluded = tagFilters.exclude.some(tagId => 
          customerTagIds.includes(tagId)
        );
        if (hasExcluded) return false;
      }
      
      // Deve ter PELO MENOS uma das tags "any"
      if (tagFilters.any?.length) {
        const hasAny = tagFilters.any.some(tagId => 
          customerTagIds.includes(tagId)
        );
        if (!hasAny) return false;
      }
      
      return true;
    });
  }
  
  /**
   * Filtrar clientes que têm conversas no WhatsApp
   */
  private async filterByWhatsAppConversations(customers: any[]): Promise<any[]> {
    if (!customers.length) return customers;
    
    const customerIds = customers.map(c => c.id);
    
    const { data: conversations } = await supabase
      .from('conversations')
      .select('customer_id')
      .in('customer_id', customerIds)
      .eq('channel', 'whatsapp');
    
    const customersWithWhatsApp = new Set(
      conversations?.map(c => c.customer_id) || []
    );
    
    return customers.filter(customer => 
      customersWithWhatsApp.has(customer.id)
    );
  }
  
  /**
   * Filtrar clientes que têm agendamentos
   */
  private async filterByAppointments(customers: any[]): Promise<any[]> {
    if (!customers.length) return customers;
    
    const customerIds = customers.map(c => c.id);
    
    const { data: appointments } = await supabase
      .from('appointments')
      .select('customer_id')
      .in('customer_id', customerIds);
    
    const customersWithAppointments = new Set(
      appointments?.map(a => a.customer_id) || []
    );
    
    return customers.filter(customer => 
      customersWithAppointments.has(customer.id)
    );
  }
  
  /**
   * Buscar tags de um cliente
   */
  private async getCustomerTags(customerId: string) {
    const { data: tags } = await supabase
      .from('customer_tag_assignments')
      .select(`
        customer_tags(
          id,
          name,
          color
        )
      `)
      .eq('customer_id', customerId);
    
    return tags?.map(t => t.customer_tags).filter(Boolean) || [];
  }
  
  /**
   * Buscar estatísticas de um cliente
   */
  private async getCustomerStats(customerId: string) {
    // TODO: Integrar com sistema de vendas quando disponível
    return {
      total_orders: 0,
      total_spent_cents: 0,
      last_order_at: undefined
    };
  }
  
  /**
   * Busca rápida por texto (autocomplete)
   */
  async quickSearch(query: string, limit: number = 10): Promise<Customer[]> {
    try {
      if (!query || query.trim().length < 2) {
        return [];
      }
      
      const searchTerm = query.trim();
      
      logger.info('Executando busca rápida', { query: searchTerm, limit });
      
      const { data: customers, error } = await supabase
        .from('customers')
        .select('id, name, email, phone, city')
        .or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
        .is('deleted_at', null)
        .limit(limit);
      
      if (error) {
        logger.error('Erro na busca rápida', { error: error.message, query: searchTerm });
        throw new Error(`Erro na busca: ${error.message}`);
      }
      
      return customers || [];
    } catch (error) {
      logger.error('Erro no CustomerSearchService.quickSearch', { error: error.message, query });
      throw error;
    }
  }
  
  /**
   * Sugestões de busca baseadas em histórico
   */
  async getSearchSuggestions(partialQuery: string): Promise<string[]> {
    try {
      if (!partialQuery || partialQuery.length < 2) {
        return [];
      }
      
      // Buscar nomes que começam com o termo
      const { data: nameMatches } = await supabase
        .from('customers')
        .select('name')
        .ilike('name', `${partialQuery}%`)
        .is('deleted_at', null)
        .limit(5);
      
      // Buscar cidades que começam com o termo
      const { data: cityMatches } = await supabase
        .from('customers')
        .select('city')
        .ilike('city', `${partialQuery}%`)
        .is('deleted_at', null)
        .not('city', 'is', null)
        .limit(3);
      
      const suggestions = [
        ...(nameMatches?.map(m => m.name) || []),
        ...(cityMatches?.map(m => m.city) || [])
      ];
      
      // Remover duplicatas e retornar
      return [...new Set(suggestions)];
    } catch (error) {
      logger.error('Erro ao buscar sugestões', { error: error.message, partialQuery });
      return [];
    }
  }
}

export const customerSearchService = new CustomerSearchService();