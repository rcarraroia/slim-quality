/**
 * Conversation Service
 * Sprint 5: Sistema de CRM e Gestão de Clientes
 * 
 * Serviço para gestão de conversas multicanal (WhatsApp, Email, etc.),
 * incluindo mensagens, status e integração com timeline.
 */

import { supabase } from '@/config/supabase';
import { z } from 'zod';
import { logger } from '@/utils/logger';

// ============================================
// SCHEMAS DE VALIDAÇÃO
// ============================================

// Schema para criação de conversa
export const CreateConversationSchema = z.object({
  customer_id: z.string().uuid(),
  channel: z.enum(['whatsapp', 'email', 'phone', 'chat', 'sms']),
  channel_id: z.string().max(255), // ID externo (ex: número WhatsApp, email)
  subject: z.string().max(255).optional(),
  assigned_to: z.string().uuid().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.any()).default({})
});

// Schema para atualização de conversa
export const UpdateConversationSchema = CreateConversationSchema.partial().extend({
  id: z.string().uuid(),
  status: z.enum(['open', 'pending', 'resolved', 'closed']).optional()
});

// Schema para criação de mensagem
export const CreateMessageSchema = z.object({
  conversation_id: z.string().uuid(),
  content: z.string().min(1, 'Conteúdo da mensagem é obrigatório'),
  message_type: z.enum(['text', 'image', 'audio', 'video', 'document', 'location']).default('text'),
  direction: z.enum(['inbound', 'outbound']),
  sender_type: z.enum(['customer', 'agent', 'system']),
  sender_id: z.string().uuid().optional(), // ID do agente (se sender_type = agent)
  external_id: z.string().optional(), // ID da mensagem no canal externo
  metadata: z.record(z.any()).default({})
});

// Schema para filtros de conversas
export const ConversationFiltersSchema = z.object({
  customer_id: z.string().uuid().optional(),
  channel: z.enum(['whatsapp', 'email', 'phone', 'chat', 'sms']).optional(),
  status: z.enum(['open', 'pending', 'resolved', 'closed']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  assigned_to: z.string().uuid().optional(),
  unassigned: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  created_after: z.string().optional(),
  created_before: z.string().optional(),
  updated_after: z.string().optional(),
  updated_before: z.string().optional(),
  has_unread_messages: z.boolean().optional(),
  search: z.string().optional(), // busca em subject e mensagens
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  sort_by: z.enum(['created_at', 'updated_at', 'priority']).default('updated_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc')
});

// Tipos TypeScript
export type CreateConversationData = z.infer<typeof CreateConversationSchema>;
export type UpdateConversationData = z.infer<typeof UpdateConversationSchema>;
export type CreateMessageData = z.infer<typeof CreateMessageSchema>;
export type ConversationFilters = z.infer<typeof ConversationFiltersSchema>;

export interface Conversation {
  id: string;
  customer_id: string;
  channel: 'whatsapp' | 'email' | 'phone' | 'chat' | 'sms';
  channel_id: string;
  subject?: string;
  status: 'open' | 'pending' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigned_to?: string;
  tags: string[];
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  last_message_at?: string;
}

export interface ConversationWithDetails extends Conversation {
  customer: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
  assigned_user?: {
    id: string;
    name: string;
    email: string;
  };
  message_count: number;
  unread_count: number;
  last_message?: {
    id: string;
    content: string;
    direction: 'inbound' | 'outbound';
    created_at: string;
  };
}

export interface Message {
  id: string;
  conversation_id: string;
  content: string;
  message_type: 'text' | 'image' | 'audio' | 'video' | 'document' | 'location';
  direction: 'inbound' | 'outbound';
  sender_type: 'customer' | 'agent' | 'system';
  sender_id?: string;
  external_id?: string;
  metadata: Record<string, any>;
  is_read: boolean;
  created_at: string;
}

export interface MessageWithSender extends Message {
  sender?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface PaginatedConversations {
  data: ConversationWithDetails[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

export interface PaginatedMessages {
  data: MessageWithSender[];
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
// CONVERSATION SERVICE
// ============================================

class ConversationService {
  /**
   * Criar nova conversa
   */
  async create(data: CreateConversationData): Promise<Conversation> {
    try {
      // Validar dados de entrada
      const validatedData = CreateConversationSchema.parse(data);
      
      logger.info('Criando nova conversa', { 
        customerId: validatedData.customer_id, 
        channel: validatedData.channel,
        channelId: validatedData.channel_id
      });
      
      // Verificar se cliente existe
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('id')
        .eq('id', validatedData.customer_id)
        .single();
      
      if (customerError || !customer) {
        throw new Error(`Cliente ${validatedData.customer_id} não encontrado`);
      }
      
      // Verificar se já existe conversa ativa para este canal
      const { data: existingConversation } = await supabase
        .from('conversations')
        .select('id, status')
        .eq('customer_id', validatedData.customer_id)
        .eq('channel', validatedData.channel)
        .eq('channel_id', validatedData.channel_id)
        .in('status', ['open', 'pending'])
        .single();
      
      if (existingConversation) {
        logger.info('Conversa ativa já existe, retornando existente', { 
          conversationId: existingConversation.id 
        });
        return await this.getById(existingConversation.id);
      }
      
      // Inserir conversa
      const { data: conversation, error } = await supabase
        .from('conversations')
        .insert({
          ...validatedData,
          status: 'open'
        })
        .select()
        .single();
      
      if (error) {
        logger.error('Erro ao criar conversa', { error: error.message, data: validatedData });
        throw new Error(`Erro ao criar conversa: ${error.message}`);
      }
      
      logger.info('Conversa criada com sucesso', { 
        id: conversation.id, 
        customerId: conversation.customer_id,
        channel: conversation.channel
      });
      
      return conversation;
    } catch (error) {
      logger.error('Erro no ConversationService.create', { error: error.message, data });
      throw error;
    }
  }
  
  /**
   * Buscar conversa por ID
   */
  async getById(id: string): Promise<ConversationWithDetails | null> {
    try {
      logger.info('Buscando conversa por ID', { id });
      
      const { data: conversation, error } = await supabase
        .from('conversations')
        .select(`
          *,
          customer:customer_id(
            id,
            name,
            email,
            phone
          ),
          assigned_user:assigned_to(
            id,
            name,
            email
          )
        `)
        .eq('id', id)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Conversa não encontrada
        }
        logger.error('Erro ao buscar conversa', { error: error.message, id });
        throw new Error(`Erro ao buscar conversa: ${error.message}`);
      }
      
      // Buscar estatísticas de mensagens
      const [messageStats, lastMessage] = await Promise.all([
        this.getConversationMessageStats(id),
        this.getLastMessage(id)
      ]);
      
      const conversationWithDetails: ConversationWithDetails = {
        ...conversation,
        customer: conversation.customer,
        assigned_user: conversation.assigned_user,
        message_count: messageStats.total,
        unread_count: messageStats.unread,
        last_message: lastMessage
      };
      
      return conversationWithDetails;
    } catch (error) {
      logger.error('Erro no ConversationService.getById', { error: error.message, id });
      throw error;
    }
  }
  
  /**
   * Buscar conversa por canal e ID externo
   */
  async getByChannelId(channel: string, channelId: string, customerId?: string): Promise<Conversation | null> {
    try {
      logger.info('Buscando conversa por canal', { channel, channelId, customerId });
      
      let query = supabase
        .from('conversations')
        .select('*')
        .eq('channel', channel)
        .eq('channel_id', channelId);
      
      if (customerId) {
        query = query.eq('customer_id', customerId);
      }
      
      const { data: conversation, error } = await query.single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Conversa não encontrada
        }
        logger.error('Erro ao buscar conversa por canal', { error: error.message, channel, channelId });
        throw new Error(`Erro ao buscar conversa: ${error.message}`);
      }
      
      return conversation;
    } catch (error) {
      logger.error('Erro no ConversationService.getByChannelId', { error: error.message, channel, channelId });
      throw error;
    }
  }
  
  /**
   * Atualizar conversa
   */
  async update(data: UpdateConversationData): Promise<Conversation> {
    try {
      // Validar dados de entrada
      const validatedData = UpdateConversationSchema.parse(data);
      const { id, ...updateData } = validatedData;
      
      logger.info('Atualizando conversa', { id, fields: Object.keys(updateData) });
      
      // Verificar se conversa existe
      const existingConversation = await this.getById(id);
      if (!existingConversation) {
        throw new Error(`Conversa ${id} não encontrada`);
      }
      
      // Atualizar conversa
      const { data: conversation, error } = await supabase
        .from('conversations')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        logger.error('Erro ao atualizar conversa', { error: error.message, id, data: updateData });
        throw new Error(`Erro ao atualizar conversa: ${error.message}`);
      }
      
      logger.info('Conversa atualizada com sucesso', { id, status: conversation.status });
      
      return conversation;
    } catch (error) {
      logger.error('Erro no ConversationService.update', { error: error.message, data });
      throw error;
    }
  }
  
  /**
   * Fechar conversa
   */
  async close(id: string, reason?: string): Promise<void> {
    try {
      logger.info('Fechando conversa', { id, reason });
      
      await this.update({
        id,
        status: 'closed',
        metadata: {
          closed_reason: reason,
          closed_at: new Date().toISOString()
        }
      });
      
      logger.info('Conversa fechada com sucesso', { id });
    } catch (error) {
      logger.error('Erro no ConversationService.close', { error: error.message, id, reason });
      throw error;
    }
  }
  
  /**
   * Reabrir conversa
   */
  async reopen(id: string): Promise<void> {
    try {
      logger.info('Reabrindo conversa', { id });
      
      await this.update({
        id,
        status: 'open'
      });
      
      logger.info('Conversa reaberta com sucesso', { id });
    } catch (error) {
      logger.error('Erro no ConversationService.reopen', { error: error.message, id });
      throw error;
    }
  }
  
  /**
   * Atribuir conversa a um usuário
   */
  async assign(conversationId: string, userId: string): Promise<void> {
    try {
      logger.info('Atribuindo conversa', { conversationId, userId });
      
      // Verificar se usuário existe
      const { data: user, error: userError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single();
      
      if (userError || !user) {
        throw new Error(`Usuário ${userId} não encontrado`);
      }
      
      await this.update({
        id: conversationId,
        assigned_to: userId
      });
      
      logger.info('Conversa atribuída com sucesso', { conversationId, userId });
    } catch (error) {
      logger.error('Erro no ConversationService.assign', { error: error.message, conversationId, userId });
      throw error;
    }
  }
  
  /**
   * Remover atribuição de conversa
   */
  async unassign(conversationId: string): Promise<void> {
    try {
      logger.info('Removendo atribuição da conversa', { conversationId });
      
      await this.update({
        id: conversationId,
        assigned_to: undefined
      });
      
      logger.info('Atribuição removida com sucesso', { conversationId });
    } catch (error) {
      logger.error('Erro no ConversationService.unassign', { error: error.message, conversationId });
      throw error;
    }
  }
  
  /**
   * Listar conversas com filtros e paginação
   */
  async list(filters: Partial<ConversationFilters> = {}): Promise<PaginatedConversations> {
    try {
      // Validar filtros
      const validatedFilters = ConversationFiltersSchema.parse(filters);
      
      logger.info('Listando conversas', { filters: validatedFilters });
      
      // Construir query base
      let query = supabase
        .from('conversations')
        .select(`
          *,
          customer:customer_id(
            id,
            name,
            email,
            phone
          ),
          assigned_user:assigned_to(
            id,
            name,
            email
          )
        `, { count: 'exact' });
      
      // Aplicar filtros
      if (validatedFilters.customer_id) {
        query = query.eq('customer_id', validatedFilters.customer_id);
      }
      
      if (validatedFilters.channel) {
        query = query.eq('channel', validatedFilters.channel);
      }
      
      if (validatedFilters.status) {
        query = query.eq('status', validatedFilters.status);
      }
      
      if (validatedFilters.priority) {
        query = query.eq('priority', validatedFilters.priority);
      }
      
      if (validatedFilters.assigned_to) {
        query = query.eq('assigned_to', validatedFilters.assigned_to);
      }
      
      if (validatedFilters.unassigned) {
        query = query.is('assigned_to', null);
      }
      
      if (validatedFilters.created_after) {
        query = query.gte('created_at', validatedFilters.created_after);
      }
      
      if (validatedFilters.created_before) {
        query = query.lte('created_at', validatedFilters.created_before);
      }
      
      if (validatedFilters.updated_after) {
        query = query.gte('updated_at', validatedFilters.updated_after);
      }
      
      if (validatedFilters.updated_before) {
        query = query.lte('updated_at', validatedFilters.updated_before);
      }
      
      // Busca textual (subject)
      if (validatedFilters.search) {
        query = query.ilike('subject', `%${validatedFilters.search}%`);
      }
      
      // Ordenação
      query = query.order(validatedFilters.sort_by, { ascending: validatedFilters.sort_order === 'asc' });
      
      // Paginação
      const offset = (validatedFilters.page - 1) * validatedFilters.limit;
      query = query.range(offset, offset + validatedFilters.limit - 1);
      
      const { data: conversations, error, count } = await query;
      
      if (error) {
        logger.error('Erro ao listar conversas', { error: error.message, filters: validatedFilters });
        throw new Error(`Erro ao listar conversas: ${error.message}`);
      }
      
      // Adicionar estatísticas de mensagens para cada conversa
      const conversationsWithStats = await Promise.all(
        conversations.map(async (conversation) => {
          const [messageStats, lastMessage] = await Promise.all([
            this.getConversationMessageStats(conversation.id),
            this.getLastMessage(conversation.id)
          ]);
          
          return {
            ...conversation,
            message_count: messageStats.total,
            unread_count: messageStats.unread,
            last_message: lastMessage
          };
        })
      );
      
      // Calcular paginação
      const total = count || 0;
      const total_pages = Math.ceil(total / validatedFilters.limit);
      
      const result: PaginatedConversations = {
        data: conversationsWithStats,
        pagination: {
          page: validatedFilters.page,
          limit: validatedFilters.limit,
          total,
          total_pages,
          has_next: validatedFilters.page < total_pages,
          has_prev: validatedFilters.page > 1
        }
      };
      
      logger.info('Conversas listadas com sucesso', { 
        total, 
        page: validatedFilters.page, 
        returned: conversations.length 
      });
      
      return result;
    } catch (error) {
      logger.error('Erro no ConversationService.list', { error: error.message, filters });
      throw error;
    }
  }
  
  /**
   * Buscar estatísticas de mensagens de uma conversa
   */
  private async getConversationMessageStats(conversationId: string): Promise<{
    total: number;
    unread: number;
  }> {
    try {
      // Contar total de mensagens
      const { count: total } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', conversationId);
      
      // Contar mensagens não lidas
      const { count: unread } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', conversationId)
        .eq('is_read', false)
        .eq('direction', 'inbound'); // Apenas mensagens recebidas podem estar não lidas
      
      return {
        total: total || 0,
        unread: unread || 0
      };
    } catch (error) {
      logger.error('Erro ao buscar estatísticas de mensagens', { error: error.message, conversationId });
      return { total: 0, unread: 0 };
    }
  }
  
  /**
   * Buscar última mensagem de uma conversa
   */
  private async getLastMessage(conversationId: string): Promise<{
    id: string;
    content: string;
    direction: 'inbound' | 'outbound';
    created_at: string;
  } | undefined> {
    try {
      const { data: message, error } = await supabase
        .from('messages')
        .select('id, content, direction, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        logger.error('Erro ao buscar última mensagem', { error: error.message, conversationId });
        return undefined;
      }
      
      return message || undefined;
    } catch (error) {
      logger.error('Erro ao buscar última mensagem', { error: error.message, conversationId });
      return undefined;
    }
  }
}

export const conversationService = new ConversationService();

// ============================================
// MESSAGE SERVICE
// ============================================

class MessageService {
  /**
   * Criar nova mensagem
   */
  async create(data: CreateMessageData): Promise<Message> {
    try {
      // Validar dados de entrada
      const validatedData = CreateMessageSchema.parse(data);
      
      logger.info('Criando nova mensagem', { 
        conversationId: validatedData.conversation_id,
        direction: validatedData.direction,
        messageType: validatedData.message_type
      });
      
      // Verificar se conversa existe
      const conversation = await conversationService.getById(validatedData.conversation_id);
      if (!conversation) {
        throw new Error(`Conversa ${validatedData.conversation_id} não encontrada`);
      }
      
      // Inserir mensagem
      const { data: message, error } = await supabase
        .from('messages')
        .insert(validatedData)
        .select()
        .single();
      
      if (error) {
        logger.error('Erro ao criar mensagem', { error: error.message, data: validatedData });
        throw new Error(`Erro ao criar mensagem: ${error.message}`);
      }
      
      // Atualizar última atividade da conversa
      await conversationService.update({
        id: validatedData.conversation_id,
        last_message_at: message.created_at
      });
      
      logger.info('Mensagem criada com sucesso', { 
        id: message.id, 
        conversationId: message.conversation_id,
        direction: message.direction
      });
      
      return message;
    } catch (error) {
      logger.error('Erro no MessageService.create', { error: error.message, data });
      throw error;
    }
  }
  
  /**
   * Buscar mensagem por ID
   */
  async getById(id: string): Promise<MessageWithSender | null> {
    try {
      logger.info('Buscando mensagem por ID', { id });
      
      const { data: message, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:sender_id(
            id,
            name,
            email
          )
        `)
        .eq('id', id)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Mensagem não encontrada
        }
        logger.error('Erro ao buscar mensagem', { error: error.message, id });
        throw new Error(`Erro ao buscar mensagem: ${error.message}`);
      }
      
      return message;
    } catch (error) {
      logger.error('Erro no MessageService.getById', { error: error.message, id });
      throw error;
    }
  }
  
  /**
   * Listar mensagens de uma conversa
   */
  async listByConversation(
    conversationId: string,
    pagination: { page: number; limit: number } = { page: 1, limit: 50 }
  ): Promise<PaginatedMessages> {
    try {
      logger.info('Listando mensagens da conversa', { conversationId, pagination });
      
      // Construir query
      const query = supabase
        .from('messages')
        .select(`
          *,
          sender:sender_id(
            id,
            name,
            email
          )
        `, { count: 'exact' })
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true }); // Mensagens mais antigas primeiro
      
      // Paginação
      const offset = (pagination.page - 1) * pagination.limit;
      const { data: messages, error, count } = await query
        .range(offset, offset + pagination.limit - 1);
      
      if (error) {
        logger.error('Erro ao listar mensagens', { error: error.message, conversationId });
        throw new Error(`Erro ao listar mensagens: ${error.message}`);
      }
      
      // Calcular paginação
      const total = count || 0;
      const total_pages = Math.ceil(total / pagination.limit);
      
      const result: PaginatedMessages = {
        data: messages || [],
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total,
          total_pages,
          has_next: pagination.page < total_pages,
          has_prev: pagination.page > 1
        }
      };
      
      logger.info('Mensagens listadas com sucesso', { 
        conversationId,
        total, 
        page: pagination.page, 
        returned: messages?.length || 0
      });
      
      return result;
    } catch (error) {
      logger.error('Erro no MessageService.listByConversation', { error: error.message, conversationId });
      throw error;
    }
  }
  
  /**
   * Marcar mensagem como lida
   */
  async markAsRead(messageId: string): Promise<void> {
    try {
      logger.info('Marcando mensagem como lida', { messageId });
      
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('id', messageId);
      
      if (error) {
        logger.error('Erro ao marcar mensagem como lida', { error: error.message, messageId });
        throw new Error(`Erro ao marcar mensagem como lida: ${error.message}`);
      }
      
      logger.info('Mensagem marcada como lida', { messageId });
    } catch (error) {
      logger.error('Erro no MessageService.markAsRead', { error: error.message, messageId });
      throw error;
    }
  }
  
  /**
   * Marcar todas as mensagens de uma conversa como lidas
   */
  async markConversationAsRead(conversationId: string): Promise<void> {
    try {
      logger.info('Marcando todas as mensagens da conversa como lidas', { conversationId });
      
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .eq('direction', 'inbound') // Apenas mensagens recebidas
        .eq('is_read', false);
      
      if (error) {
        logger.error('Erro ao marcar conversa como lida', { error: error.message, conversationId });
        throw new Error(`Erro ao marcar conversa como lida: ${error.message}`);
      }
      
      logger.info('Conversa marcada como lida', { conversationId });
    } catch (error) {
      logger.error('Erro no MessageService.markConversationAsRead', { error: error.message, conversationId });
      throw error;
    }
  }
  
  /**
   * Buscar mensagens não lidas de um usuário
   */
  async getUnreadMessages(userId: string): Promise<MessageWithSender[]> {
    try {
      logger.info('Buscando mensagens não lidas', { userId });
      
      const { data: messages, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:sender_id(
            id,
            name,
            email
          ),
          conversation:conversation_id(
            id,
            assigned_to,
            customer:customer_id(
              id,
              name,
              email
            )
          )
        `)
        .eq('is_read', false)
        .eq('direction', 'inbound')
        .eq('conversation.assigned_to', userId)
        .order('created_at', { ascending: false });
      
      if (error) {
        logger.error('Erro ao buscar mensagens não lidas', { error: error.message, userId });
        throw new Error(`Erro ao buscar mensagens não lidas: ${error.message}`);
      }
      
      logger.info('Mensagens não lidas encontradas', { userId, count: messages?.length || 0 });
      
      return messages || [];
    } catch (error) {
      logger.error('Erro no MessageService.getUnreadMessages', { error: error.message, userId });
      throw error;
    }
  }
  
  /**
   * Buscar últimas mensagens por conversa
   */
  async getLatestMessagesByConversation(conversationIds: string[]): Promise<Record<string, Message>> {
    try {
      if (!conversationIds.length) return {};
      
      logger.info('Buscando últimas mensagens por conversa', { count: conversationIds.length });
      
      // Usar window function para buscar a última mensagem de cada conversa
      const { data: messages, error } = await supabase
        .rpc('get_latest_messages_by_conversation', {
          conversation_ids: conversationIds
        });
      
      if (error) {
        logger.error('Erro ao buscar últimas mensagens', { error: error.message });
        throw new Error(`Erro ao buscar últimas mensagens: ${error.message}`);
      }
      
      // Converter array para objeto indexado por conversation_id
      const messagesByConversation = (messages || []).reduce((acc, message) => {
        acc[message.conversation_id] = message;
        return acc;
      }, {} as Record<string, Message>);
      
      return messagesByConversation;
    } catch (error) {
      logger.error('Erro no MessageService.getLatestMessagesByConversation', { error: error.message });
      return {};
    }
  }
  
  /**
   * Buscar estatísticas de mensagens
   */
  async getMessageStats(conversationId?: string, userId?: string): Promise<{
    total: number;
    unread: number;
    today: number;
    this_week: number;
  }> {
    try {
      logger.info('Buscando estatísticas de mensagens', { conversationId, userId });
      
      let baseQuery = supabase.from('messages');
      
      if (conversationId) {
        baseQuery = baseQuery.eq('conversation_id', conversationId);
      }
      
      if (userId) {
        // Filtrar por conversas atribuídas ao usuário
        baseQuery = baseQuery
          .select('*, conversation:conversation_id(assigned_to)')
          .eq('conversation.assigned_to', userId);
      }
      
      // Total de mensagens
      const { count: total } = await baseQuery
        .select('*', { count: 'exact', head: true });
      
      // Mensagens não lidas (apenas inbound)
      const { count: unread } = await baseQuery
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false)
        .eq('direction', 'inbound');
      
      // Mensagens de hoje
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count: todayCount } = await baseQuery
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString());
      
      // Mensagens desta semana
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      weekStart.setHours(0, 0, 0, 0);
      const { count: weekCount } = await baseQuery
        .select('*', { count: 'exact', head: true })
        .gte('created_at', weekStart.toISOString());
      
      const stats = {
        total: total || 0,
        unread: unread || 0,
        today: todayCount || 0,
        this_week: weekCount || 0
      };
      
      logger.info('Estatísticas de mensagens calculadas', { stats });
      
      return stats;
    } catch (error) {
      logger.error('Erro ao buscar estatísticas de mensagens', { error: error.message });
      return { total: 0, unread: 0, today: 0, this_week: 0 };
    }
  }
}

export const messageService = new MessageService();