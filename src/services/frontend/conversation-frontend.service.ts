/**
 * Conversation Frontend Service
 * Sprint 5: Sistema de CRM - Frontend
 * 
 * Service para integração com APIs de conversas
 */

import { supabase } from '@/config/supabase';

export interface Conversation {
  id: string;
  customer_id: string;
  customer?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
  };
  channel: 'whatsapp' | 'email' | 'phone' | 'chat' | 'sms';
  subject?: string;
  status: 'open' | 'closed' | 'pending';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigned_to?: string;
  assigned_user?: {
    id: string;
    name: string;
  };
  metadata?: any;
  created_at: string;
  updated_at: string;
  closed_at?: string;
  unread_count?: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_type: 'customer' | 'agent' | 'system';
  sender_id?: string;
  sender_name?: string;
  content: string;
  message_type: 'text' | 'image' | 'file' | 'audio';
  metadata?: any;
  created_at: string;
}

export interface ConversationFilters {
  status?: 'open' | 'closed' | 'pending';
  channel?: string;
  priority?: string;
  assigned_to?: string;
  customer_id?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export class ConversationFrontendService {
  /**
   * Lista conversas com filtros
   */
  async getConversations(filters: ConversationFilters = {}): Promise<{
    data: Conversation[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    const { page = 1, limit = 20, status, channel, priority, assigned_to, customer_id, search } = filters;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('conversations')
      .select(`
        *,
        customer:customers(id, name, email, phone),
        messages:messages(id)
      `, { count: 'exact' });

    // Filtros
    if (status) query = query.eq('status', status);
    if (channel) query = query.eq('channel', channel);
    if (priority) query = query.eq('priority', priority);
    if (assigned_to) query = query.eq('assigned_to', assigned_to);
    if (customer_id) query = query.eq('customer_id', customer_id);
    if (search) {
      query = query.or(`subject.ilike.%${search}%`);
    }

    // Paginação
    query = query.range(offset, offset + limit - 1).order('updated_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) throw error;

    // Calcular mensagens não lidas
    const conversations = (data || []).map(conv => ({
      ...conv,
      unread_count: conv.messages?.length || 0
    }));

    return {
      data: conversations,
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    };
  }

  /**
   * Busca conversa por ID
   */
  async getConversationById(id: string): Promise<Conversation> {
    const { data, error } = await supabase
      .from('conversations')
      .select(`
        *,
        customer:customers(id, name, email, phone)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Cria nova conversa
   */
  async createConversation(conversationData: {
    customer_id: string;
    channel: string;
    subject?: string;
    priority?: string;
    initial_message?: {
      content: string;
      sender_type: string;
    };
  }): Promise<Conversation> {
    const { data, error } = await supabase
      .from('conversations')
      .insert({
        customer_id: conversationData.customer_id,
        channel: conversationData.channel,
        subject: conversationData.subject,
        priority: conversationData.priority || 'medium',
        status: 'open'
      })
      .select()
      .single();

    if (error) throw error;

    // Adicionar mensagem inicial se fornecida
    if (conversationData.initial_message) {
      await this.addMessage(data.id, conversationData.initial_message);
    }

    return data;
  }

  /**
   * Atualiza conversa
   */
  async updateConversation(id: string, updates: Partial<Conversation>): Promise<Conversation> {
    const { data, error } = await supabase
      .from('conversations')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Busca mensagens da conversa
   */
  async getMessages(conversationId: string, limit = 50): Promise<Message[]> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  /**
   * Adiciona mensagem à conversa
   */
  async addMessage(conversationId: string, messageData: {
    content: string;
    sender_type: 'customer' | 'agent' | 'system';
    message_type?: string;
  }): Promise<Message> {
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_type: messageData.sender_type,
        sender_id: messageData.sender_type === 'agent' ? user?.id : null,
        content: messageData.content,
        message_type: messageData.message_type || 'text'
      })
      .select()
      .single();

    if (error) throw error;

    // Atualizar updated_at da conversa
    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);

    return data;
  }

  /**
   * Atribui conversa a usuário
   */
  async assignConversation(conversationId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('conversations')
      .update({ assigned_to: userId })
      .eq('id', conversationId);

    if (error) throw error;
  }

  /**
   * Fecha conversa
   */
  async closeConversation(conversationId: string): Promise<void> {
    const { error } = await supabase
      .from('conversations')
      .update({
        status: 'closed',
        closed_at: new Date().toISOString()
      })
      .eq('id', conversationId);

    if (error) throw error;
  }

  /**
   * Reabre conversa
   */
  async reopenConversation(conversationId: string): Promise<void> {
    const { error } = await supabase
      .from('conversations')
      .update({
        status: 'open',
        closed_at: null
      })
      .eq('id', conversationId);

    if (error) throw error;
  }

  /**
   * Busca conversas do usuário logado
   */
  async getMyConversations(filters: ConversationFilters = {}): Promise<{
    data: Conversation[];
    pagination: any;
  }> {
    const { data: { user } } = await supabase.auth.getUser();
    
    return this.getConversations({
      ...filters,
      assigned_to: user?.id
    });
  }

  /**
   * Conta conversas não lidas
   */
  async getUnreadCount(): Promise<number> {
    const { data: { user } } = await supabase.auth.getUser();

    const { count } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .eq('assigned_to', user?.id)
      .eq('status', 'open');

    return count || 0;
  }

  /**
   * Subscreve a novas mensagens em tempo real
   */
  subscribeToMessages(conversationId: string, callback: (message: Message) => void) {
    return supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => callback(payload.new as Message)
      )
      .subscribe();
  }
}

export const conversationFrontendService = new ConversationFrontendService();

