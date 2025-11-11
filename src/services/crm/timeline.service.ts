/**
 * Timeline Service
 * Sprint 5: Sistema de CRM e Gestão de Clientes
 * 
 * Serviço para gestão de timeline de eventos cronológicos dos clientes,
 * incluindo registro automático e manual de eventos.
 */

import { supabase } from '@/config/supabase';
import { z } from 'zod';
import { logger } from '@/utils/logger';

// ============================================
// SCHEMAS DE VALIDAÇÃO
// ============================================

// Schema para criação de evento na timeline
export const CreateTimelineEventSchema = z.object({
  customer_id: z.string().uuid(),
  event_type: z.enum([
    'customer_created',
    'customer_updated',
    'order_placed',
    'order_paid',
    'order_shipped',
    'order_delivered',
    'order_cancelled',
    'conversation_started',
    'conversation_resolved',
    'message_received',
    'message_sent',
    'appointment_scheduled',
    'appointment_completed',
    'appointment_cancelled',
    'tag_added',
    'tag_removed',
    'note_added',
    'system_event',
    'custom_event'
  ]),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  metadata: z.record(z.any()).default({}),
  related_entity_type: z.enum(['order', 'conversation', 'message', 'appointment', 'tag', 'note']).optional(),
  related_entity_id: z.string().uuid().optional(),
  created_by: z.string().uuid().optional(), // ID do usuário que criou (null para eventos automáticos)
  event_date: z.string().optional() // ISO date string, default: now
});

// Schema para filtros de timeline
export const TimelineFiltersSchema = z.object({
  customer_id: z.string().uuid(),
  event_types: z.array(z.enum([
    'customer_created',
    'customer_updated',
    'order_placed',
    'order_paid',
    'order_shipped',
    'order_delivered',
    'order_cancelled',
    'conversation_started',
    'conversation_resolved',
    'message_received',
    'message_sent',
    'appointment_scheduled',
    'appointment_completed',
    'appointment_cancelled',
    'tag_added',
    'tag_removed',
    'note_added',
    'system_event',
    'custom_event'
  ])).optional(),
  related_entity_type: z.enum(['order', 'conversation', 'message', 'appointment', 'tag', 'note']).optional(),
  created_by: z.string().uuid().optional(),
  date_from: z.string().optional(), // ISO date string
  date_to: z.string().optional(), // ISO date string
  search: z.string().optional(), // busca em title e description
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  sort_order: z.enum(['asc', 'desc']).default('desc')
});

// Schema para nota manual
export const CreateNoteSchema = z.object({
  customer_id: z.string().uuid(),
  title: z.string().min(1).max(255),
  content: z.string().min(1),
  is_private: z.boolean().default(false),
  created_by: z.string().uuid()
});

// Tipos TypeScript
export type CreateTimelineEventData = z.infer<typeof CreateTimelineEventSchema>;
export type TimelineFilters = z.infer<typeof TimelineFiltersSchema>;
export type CreateNoteData = z.infer<typeof CreateNoteSchema>;

export interface TimelineEvent {
  id: string;
  customer_id: string;
  event_type: string;
  title: string;
  description?: string;
  metadata: Record<string, any>;
  related_entity_type?: string;
  related_entity_id?: string;
  created_by?: string;
  event_date: string;
  created_at: string;
}

export interface TimelineEventWithDetails extends TimelineEvent {
  created_by_user?: {
    id: string;
    name: string;
    email: string;
  };
  related_entity?: {
    type: string;
    id: string;
    title?: string;
    data?: Record<string, any>;
  };
}

export interface PaginatedTimelineEvents {
  data: TimelineEventWithDetails[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

export interface TimelineStats {
  total_events: number;
  events_this_month: number;
  events_this_week: number;
  events_today: number;
  by_type: Record<string, number>;
  recent_activity: TimelineEvent[];
}

// ============================================
// TIMELINE SERVICE
// ============================================

class TimelineService {
  /**
   * Criar evento na timeline
   */
  async createEvent(data: CreateTimelineEventData): Promise<TimelineEvent> {
    try {
      // Validar dados de entrada
      const validatedData = CreateTimelineEventSchema.parse(data);
      
      logger.info('Criando evento na timeline', { 
        customerId: validatedData.customer_id,
        eventType: validatedData.event_type,
        title: validatedData.title
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
      
      // Definir data do evento se não fornecida
      const eventData = {
        ...validatedData,
        event_date: validatedData.event_date || new Date().toISOString()
      };
      
      // Inserir evento
      const { data: event, error } = await supabase
        .from('customer_timeline')
        .insert(eventData)
        .select()
        .single();
      
      if (error) {
        logger.error('Erro ao criar evento na timeline', { error: error.message, data: validatedData });
        throw new Error(`Erro ao criar evento: ${error.message}`);
      }
      
      logger.info('Evento criado na timeline', { 
        id: event.id,
        customerId: event.customer_id,
        eventType: event.event_type
      });
      
      return event;
    } catch (error) {
      logger.error('Erro no TimelineService.createEvent', { error: error.message, data });
      throw error;
    }
  }
  
  /**
   * Buscar timeline de um cliente
   */
  async getCustomerTimeline(filters: TimelineFilters): Promise<PaginatedTimelineEvents> {
    try {
      // Validar filtros
      const validatedFilters = TimelineFiltersSchema.parse(filters);
      
      logger.info('Buscando timeline do cliente', { filters: validatedFilters });
      
      // Construir query base
      let query = supabase
        .from('customer_timeline')
        .select(`
          *,
          created_by_user:created_by(
            id,
            name,
            email
          )
        `, { count: 'exact' })
        .eq('customer_id', validatedFilters.customer_id);
      
      // Aplicar filtros
      if (validatedFilters.event_types && validatedFilters.event_types.length > 0) {
        query = query.in('event_type', validatedFilters.event_types);
      }
      
      if (validatedFilters.related_entity_type) {
        query = query.eq('related_entity_type', validatedFilters.related_entity_type);
      }
      
      if (validatedFilters.created_by) {
        query = query.eq('created_by', validatedFilters.created_by);
      }
      
      if (validatedFilters.date_from) {
        query = query.gte('event_date', validatedFilters.date_from);
      }
      
      if (validatedFilters.date_to) {
        query = query.lte('event_date', validatedFilters.date_to);
      }
      
      // Busca textual
      if (validatedFilters.search) {
        query = query.or(`title.ilike.%${validatedFilters.search}%,description.ilike.%${validatedFilters.search}%`);
      }
      
      // Ordenação
      query = query.order('event_date', { ascending: validatedFilters.sort_order === 'asc' });
      
      // Paginação
      const offset = (validatedFilters.page - 1) * validatedFilters.limit;
      query = query.range(offset, offset + validatedFilters.limit - 1);
      
      const { data: events, error, count } = await query;
      
      if (error) {
        logger.error('Erro ao buscar timeline', { error: error.message, filters: validatedFilters });
        throw new Error(`Erro ao buscar timeline: ${error.message}`);
      }
      
      // Enriquecer eventos com dados relacionados
      const eventsWithDetails = await Promise.all(
        (events || []).map(async (event) => {
          const relatedEntity = await this.getRelatedEntityData(
            event.related_entity_type,
            event.related_entity_id
          );
          
          return {
            ...event,
            related_entity: relatedEntity
          };
        })
      );
      
      // Calcular paginação
      const total = count || 0;
      const total_pages = Math.ceil(total / validatedFilters.limit);
      
      const result: PaginatedTimelineEvents = {
        data: eventsWithDetails,
        pagination: {
          page: validatedFilters.page,
          limit: validatedFilters.limit,
          total,
          total_pages,
          has_next: validatedFilters.page < total_pages,
          has_prev: validatedFilters.page > 1
        }
      };
      
      logger.info('Timeline do cliente carregada', { 
        customerId: validatedFilters.customer_id,
        total, 
        page: validatedFilters.page, 
        returned: events?.length || 0
      });
      
      return result;
    } catch (error) {
      logger.error('Erro no TimelineService.getCustomerTimeline', { error: error.message, filters });
      throw error;
    }
  }
  
  /**
   * Buscar estatísticas da timeline
   */
  async getTimelineStats(customerId: string): Promise<TimelineStats> {
    try {
      logger.info('Buscando estatísticas da timeline', { customerId });
      
      const baseQuery = supabase
        .from('customer_timeline')
        .select('*')
        .eq('customer_id', customerId);
      
      // Total de eventos
      const { count: total } = await baseQuery
        .select('*', { count: 'exact', head: true });
      
      // Eventos deste mês
      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);
      const { count: thisMonthCount } = await baseQuery
        .select('*', { count: 'exact', head: true })
        .gte('event_date', thisMonth.toISOString());
      
      // Eventos desta semana
      const thisWeek = new Date();
      thisWeek.setDate(thisWeek.getDate() - thisWeek.getDay());
      thisWeek.setHours(0, 0, 0, 0);
      const { count: thisWeekCount } = await baseQuery
        .select('*', { count: 'exact', head: true })
        .gte('event_date', thisWeek.toISOString());
      
      // Eventos de hoje
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count: todayCount } = await baseQuery
        .select('*', { count: 'exact', head: true })
        .gte('event_date', today.toISOString());
      
      // Por tipo
      const { data: byTypeData } = await baseQuery
        .select('event_type');
      
      const byType = (byTypeData || []).reduce((acc, item) => {
        acc[item.event_type] = (acc[item.event_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      // Atividade recente (últimos 10 eventos)
      const { data: recentActivity } = await baseQuery
        .select('*')
        .order('event_date', { ascending: false })
        .limit(10);
      
      const stats: TimelineStats = {
        total_events: total || 0,
        events_this_month: thisMonthCount || 0,
        events_this_week: thisWeekCount || 0,
        events_today: todayCount || 0,
        by_type: byType,
        recent_activity: recentActivity || []
      };
      
      logger.info('Estatísticas da timeline calculadas', { customerId, stats });
      
      return stats;
    } catch (error) {
      logger.error('Erro ao buscar estatísticas da timeline', { error: error.message, customerId });
      return {
        total_events: 0,
        events_this_month: 0,
        events_this_week: 0,
        events_today: 0,
        by_type: {},
        recent_activity: []
      };
    }
  }
  
  /**
   * Registrar evento de criação de cliente
   */
  async recordCustomerCreated(customerId: string, metadata: Record<string, any> = {}): Promise<TimelineEvent> {
    return this.createEvent({
      customer_id: customerId,
      event_type: 'customer_created',
      title: 'Cliente cadastrado',
      description: 'Cliente foi cadastrado no sistema',
      metadata: {
        source: metadata.source || 'manual',
        referral_code: metadata.referral_code,
        ...metadata
      }
    });
  }
  
  /**
   * Registrar evento de atualização de cliente
   */
  async recordCustomerUpdated(
    customerId: string, 
    updatedFields: string[], 
    updatedBy?: string,
    metadata: Record<string, any> = {}
  ): Promise<TimelineEvent> {
    return this.createEvent({
      customer_id: customerId,
      event_type: 'customer_updated',
      title: 'Dados do cliente atualizados',
      description: `Campos atualizados: ${updatedFields.join(', ')}`,
      metadata: {
        updated_fields: updatedFields,
        ...metadata
      },
      created_by: updatedBy
    });
  }
  
  /**
   * Registrar evento de pedido
   */
  async recordOrderEvent(
    customerId: string,
    eventType: 'order_placed' | 'order_paid' | 'order_shipped' | 'order_delivered' | 'order_cancelled',
    orderId: string,
    metadata: Record<string, any> = {}
  ): Promise<TimelineEvent> {
    const eventTitles = {
      order_placed: 'Pedido realizado',
      order_paid: 'Pagamento confirmado',
      order_shipped: 'Pedido enviado',
      order_delivered: 'Pedido entregue',
      order_cancelled: 'Pedido cancelado'
    };
    
    return this.createEvent({
      customer_id: customerId,
      event_type: eventType,
      title: eventTitles[eventType],
      description: `Pedido #${orderId}`,
      metadata: {
        order_id: orderId,
        ...metadata
      },
      related_entity_type: 'order',
      related_entity_id: orderId
    });
  }
  
  /**
   * Registrar evento de conversa
   */
  async recordConversationEvent(
    customerId: string,
    eventType: 'conversation_started' | 'conversation_resolved',
    conversationId: string,
    metadata: Record<string, any> = {}
  ): Promise<TimelineEvent> {
    const eventTitles = {
      conversation_started: 'Conversa iniciada',
      conversation_resolved: 'Conversa resolvida'
    };
    
    return this.createEvent({
      customer_id: customerId,
      event_type: eventType,
      title: eventTitles[eventType],
      description: `Canal: ${metadata.channel || 'N/A'}`,
      metadata: {
        conversation_id: conversationId,
        channel: metadata.channel,
        ...metadata
      },
      related_entity_type: 'conversation',
      related_entity_id: conversationId
    });
  }
  
  /**
   * Registrar evento de mensagem
   */
  async recordMessageEvent(
    customerId: string,
    eventType: 'message_received' | 'message_sent',
    messageId: string,
    conversationId: string,
    metadata: Record<string, any> = {}
  ): Promise<TimelineEvent> {
    const eventTitles = {
      message_received: 'Mensagem recebida',
      message_sent: 'Mensagem enviada'
    };
    
    return this.createEvent({
      customer_id: customerId,
      event_type: eventType,
      title: eventTitles[eventType],
      description: metadata.preview || 'Nova mensagem',
      metadata: {
        message_id: messageId,
        conversation_id: conversationId,
        channel: metadata.channel,
        message_type: metadata.message_type,
        ...metadata
      },
      related_entity_type: 'message',
      related_entity_id: messageId
    });
  }
  
  /**
   * Registrar evento de agendamento
   */
  async recordAppointmentEvent(
    customerId: string,
    eventType: 'appointment_scheduled' | 'appointment_completed' | 'appointment_cancelled',
    appointmentId: string,
    metadata: Record<string, any> = {}
  ): Promise<TimelineEvent> {
    const eventTitles = {
      appointment_scheduled: 'Agendamento criado',
      appointment_completed: 'Agendamento realizado',
      appointment_cancelled: 'Agendamento cancelado'
    };
    
    return this.createEvent({
      customer_id: customerId,
      event_type: eventType,
      title: eventTitles[eventType],
      description: metadata.appointment_type || 'Agendamento',
      metadata: {
        appointment_id: appointmentId,
        appointment_type: metadata.appointment_type,
        scheduled_date: metadata.scheduled_date,
        ...metadata
      },
      related_entity_type: 'appointment',
      related_entity_id: appointmentId
    });
  }
  
  /**
   * Registrar evento de tag
   */
  async recordTagEvent(
    customerId: string,
    eventType: 'tag_added' | 'tag_removed',
    tagId: string,
    tagName: string,
    addedBy?: string,
    metadata: Record<string, any> = {}
  ): Promise<TimelineEvent> {
    const eventTitles = {
      tag_added: 'Tag adicionada',
      tag_removed: 'Tag removida'
    };
    
    return this.createEvent({
      customer_id: customerId,
      event_type: eventType,
      title: eventTitles[eventType],
      description: `Tag: ${tagName}`,
      metadata: {
        tag_id: tagId,
        tag_name: tagName,
        auto_applied: metadata.auto_applied || false,
        ...metadata
      },
      related_entity_type: 'tag',
      related_entity_id: tagId,
      created_by: addedBy
    });
  }
  
  /**
   * Buscar dados da entidade relacionada
   */
  private async getRelatedEntityData(
    entityType?: string,
    entityId?: string
  ): Promise<{ type: string; id: string; title?: string; data?: Record<string, any> } | undefined> {
    if (!entityType || !entityId) return undefined;
    
    try {
      switch (entityType) {
        case 'order':
          // TODO: Integrar com sistema de vendas
          return {
            type: 'order',
            id: entityId,
            title: `Pedido #${entityId}`,
            data: { status: 'unknown' }
          };
          
        case 'conversation':
          const { data: conversation } = await supabase
            .from('conversations')
            .select('id, subject, channel, status')
            .eq('id', entityId)
            .single();
          
          if (conversation) {
            return {
              type: 'conversation',
              id: entityId,
              title: conversation.subject || `Conversa ${conversation.channel}`,
              data: { channel: conversation.channel, status: conversation.status }
            };
          }
          break;
          
        case 'message':
          const { data: message } = await supabase
            .from('messages')
            .select('id, content, direction, message_type')
            .eq('id', entityId)
            .single();
          
          if (message) {
            return {
              type: 'message',
              id: entityId,
              title: message.content.substring(0, 50) + (message.content.length > 50 ? '...' : ''),
              data: { direction: message.direction, message_type: message.message_type }
            };
          }
          break;
          
        case 'appointment':
          const { data: appointment } = await supabase
            .from('appointments')
            .select('id, title, appointment_type, status')
            .eq('id', entityId)
            .single();
          
          if (appointment) {
            return {
              type: 'appointment',
              id: entityId,
              title: appointment.title,
              data: { appointment_type: appointment.appointment_type, status: appointment.status }
            };
          }
          break;
          
        case 'tag':
          const { data: tag } = await supabase
            .from('customer_tags')
            .select('id, name, color')
            .eq('id', entityId)
            .single();
          
          if (tag) {
            return {
              type: 'tag',
              id: entityId,
              title: tag.name,
              data: { color: tag.color }
            };
          }
          break;
      }
      
      return {
        type: entityType,
        id: entityId,
        title: `${entityType} ${entityId}`,
        data: {}
      };
    } catch (error) {
      logger.error('Erro ao buscar dados da entidade relacionada', { 
        error: error.message, 
        entityType, 
        entityId 
      });
      return {
        type: entityType,
        id: entityId,
        title: `${entityType} ${entityId}`,
        data: {}
      };
    }
  }
}

export const timelineService = new TimelineService();

// ============================================
// GESTÃO MANUAL DE EVENTOS E NOTAS
// ============================================

/**
 * Extensão do TimelineService para gestão manual de eventos
 */
class TimelineManagementService extends TimelineService {
  /**
   * Adicionar nota manual à timeline
   */
  async addNote(data: CreateNoteData): Promise<TimelineEvent> {
    try {
      // Validar dados de entrada
      const validatedData = CreateNoteSchema.parse(data);
      
      logger.info('Adicionando nota manual à timeline', { 
        customerId: validatedData.customer_id,
        title: validatedData.title,
        createdBy: validatedData.created_by
      });
      
      // Verificar se usuário existe
      const { data: user, error: userError } = await supabase
        .from('profiles')
        .select('id, name')
        .eq('id', validatedData.created_by)
        .single();
      
      if (userError || !user) {
        throw new Error(`Usuário ${validatedData.created_by} não encontrado`);
      }
      
      // Criar evento na timeline
      const timelineEvent = await this.createEvent({
        customer_id: validatedData.customer_id,
        event_type: 'note_added',
        title: validatedData.title,
        description: validatedData.content,
        metadata: {
          is_private: validatedData.is_private,
          note_content: validatedData.content,
          added_by_name: user.name
        },
        created_by: validatedData.created_by
      });
      
      logger.info('Nota adicionada à timeline', { 
        id: timelineEvent.id,
        customerId: validatedData.customer_id,
        createdBy: validatedData.created_by
      });
      
      return timelineEvent;
    } catch (error) {
      logger.error('Erro no TimelineManagementService.addNote', { error: error.message, data });
      throw error;
    }
  }
  
  /**
   * Adicionar evento personalizado
   */
  async addCustomEvent(
    customerId: string,
    title: string,
    description: string,
    createdBy: string,
    metadata: Record<string, any> = {},
    eventDate?: string
  ): Promise<TimelineEvent> {
    try {
      logger.info('Adicionando evento personalizado', { 
        customerId,
        title,
        createdBy
      });
      
      // Verificar se usuário existe
      const { data: user, error: userError } = await supabase
        .from('profiles')
        .select('id, name')
        .eq('id', createdBy)
        .single();
      
      if (userError || !user) {
        throw new Error(`Usuário ${createdBy} não encontrado`);
      }
      
      // Criar evento personalizado
      const timelineEvent = await this.createEvent({
        customer_id: customerId,
        event_type: 'custom_event',
        title,
        description,
        metadata: {
          ...metadata,
          added_by_name: user.name,
          is_custom: true
        },
        created_by: createdBy,
        event_date: eventDate
      });
      
      logger.info('Evento personalizado adicionado', { 
        id: timelineEvent.id,
        customerId,
        createdBy
      });
      
      return timelineEvent;
    } catch (error) {
      logger.error('Erro no TimelineManagementService.addCustomEvent', { error: error.message });
      throw error;
    }
  }
  
  /**
   * Editar evento existente (apenas eventos manuais)
   */
  async editEvent(
    eventId: string,
    updates: {
      title?: string;
      description?: string;
      metadata?: Record<string, any>;
      event_date?: string;
    },
    editedBy: string
  ): Promise<TimelineEvent> {
    try {
      logger.info('Editando evento da timeline', { eventId, editedBy });
      
      // Buscar evento existente
      const { data: existingEvent, error: fetchError } = await supabase
        .from('customer_timeline')
        .select('*')
        .eq('id', eventId)
        .single();
      
      if (fetchError || !existingEvent) {
        throw new Error(`Evento ${eventId} não encontrado`);
      }
      
      // Verificar se é um evento editável (manual)
      const editableTypes = ['note_added', 'custom_event'];
      if (!editableTypes.includes(existingEvent.event_type)) {
        throw new Error('Apenas notas e eventos personalizados podem ser editados');
      }
      
      // Verificar permissões (apenas o criador ou admin pode editar)
      if (existingEvent.created_by !== editedBy) {
        // TODO: Verificar se é admin
        const { data: user } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', editedBy)
          .single();
        
        if (!user || user.role !== 'admin') {
          throw new Error('Apenas o criador do evento ou administradores podem editá-lo');
        }
      }
      
      // Preparar dados para atualização
      const updateData: any = {};
      
      if (updates.title) updateData.title = updates.title;
      if (updates.description) updateData.description = updates.description;
      if (updates.event_date) updateData.event_date = updates.event_date;
      
      if (updates.metadata) {
        updateData.metadata = {
          ...existingEvent.metadata,
          ...updates.metadata,
          edited_at: new Date().toISOString(),
          edited_by: editedBy
        };
      }
      
      // Atualizar evento
      const { data: updatedEvent, error: updateError } = await supabase
        .from('customer_timeline')
        .update(updateData)
        .eq('id', eventId)
        .select()
        .single();
      
      if (updateError) {
        logger.error('Erro ao atualizar evento', { error: updateError.message, eventId });
        throw new Error(`Erro ao atualizar evento: ${updateError.message}`);
      }
      
      logger.info('Evento atualizado com sucesso', { 
        id: updatedEvent.id,
        customerId: updatedEvent.customer_id,
        editedBy
      });
      
      return updatedEvent;
    } catch (error) {
      logger.error('Erro no TimelineManagementService.editEvent', { error: error.message, eventId });
      throw error;
    }
  }
  
  /**
   * Remover evento (soft delete - apenas eventos manuais)
   */
  async removeEvent(eventId: string, removedBy: string, reason?: string): Promise<void> {
    try {
      logger.info('Removendo evento da timeline', { eventId, removedBy, reason });
      
      // Buscar evento existente
      const { data: existingEvent, error: fetchError } = await supabase
        .from('customer_timeline')
        .select('*')
        .eq('id', eventId)
        .single();
      
      if (fetchError || !existingEvent) {
        throw new Error(`Evento ${eventId} não encontrado`);
      }
      
      // Verificar se é um evento removível (manual)
      const removableTypes = ['note_added', 'custom_event'];
      if (!removableTypes.includes(existingEvent.event_type)) {
        throw new Error('Apenas notas e eventos personalizados podem ser removidos');
      }
      
      // Verificar permissões (apenas o criador ou admin pode remover)
      if (existingEvent.created_by !== removedBy) {
        // TODO: Verificar se é admin
        const { data: user } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', removedBy)
          .single();
        
        if (!user || user.role !== 'admin') {
          throw new Error('Apenas o criador do evento ou administradores podem removê-lo');
        }
      }
      
      // Soft delete - marcar como removido
      const { error: updateError } = await supabase
        .from('customer_timeline')
        .update({
          metadata: {
            ...existingEvent.metadata,
            deleted_at: new Date().toISOString(),
            deleted_by: removedBy,
            deletion_reason: reason || 'Removido pelo usuário'
          }
        })
        .eq('id', eventId);
      
      if (updateError) {
        logger.error('Erro ao remover evento', { error: updateError.message, eventId });
        throw new Error(`Erro ao remover evento: ${updateError.message}`);
      }
      
      logger.info('Evento removido com sucesso', { 
        id: eventId,
        customerId: existingEvent.customer_id,
        removedBy
      });
    } catch (error) {
      logger.error('Erro no TimelineManagementService.removeEvent', { error: error.message, eventId });
      throw error;
    }
  }
  
  /**
   * Buscar eventos editáveis de um cliente
   */
  async getEditableEvents(customerId: string, userId: string): Promise<TimelineEvent[]> {
    try {
      logger.info('Buscando eventos editáveis', { customerId, userId });
      
      // Buscar eventos criados pelo usuário ou eventos que ele pode editar
      let query = supabase
        .from('customer_timeline')
        .select('*')
        .eq('customer_id', customerId)
        .in('event_type', ['note_added', 'custom_event'])
        .is('metadata->deleted_at', null); // Não removidos
      
      // Filtrar por criador (usuários normais só veem seus próprios eventos editáveis)
      // TODO: Admins podem ver todos
      query = query.eq('created_by', userId);
      
      const { data: events, error } = await query
        .order('event_date', { ascending: false });
      
      if (error) {
        logger.error('Erro ao buscar eventos editáveis', { error: error.message, customerId, userId });
        throw new Error(`Erro ao buscar eventos editáveis: ${error.message}`);
      }
      
      logger.info('Eventos editáveis encontrados', { 
        customerId, 
        userId, 
        count: events?.length || 0 
      });
      
      return events || [];
    } catch (error) {
      logger.error('Erro no TimelineManagementService.getEditableEvents', { error: error.message, customerId, userId });
      throw error;
    }
  }
  
  /**
   * Buscar histórico de edições de um evento
   */
  async getEventEditHistory(eventId: string): Promise<Array<{
    edited_at: string;
    edited_by: string;
    changes: Record<string, any>;
  }>> {
    try {
      logger.info('Buscando histórico de edições', { eventId });
      
      const { data: event, error } = await supabase
        .from('customer_timeline')
        .select('metadata')
        .eq('id', eventId)
        .single();
      
      if (error || !event) {
        throw new Error(`Evento ${eventId} não encontrado`);
      }
      
      // Extrair histórico do metadata
      const history = event.metadata?.edit_history || [];
      
      return history;
    } catch (error) {
      logger.error('Erro ao buscar histórico de edições', { error: error.message, eventId });
      return [];
    }
  }
  
  /**
   * Buscar eventos por período com agrupamento
   */
  async getEventsByPeriod(
    customerId: string,
    startDate: string,
    endDate: string,
    groupBy: 'day' | 'week' | 'month' = 'day'
  ): Promise<Record<string, TimelineEvent[]>> {
    try {
      logger.info('Buscando eventos por período', { customerId, startDate, endDate, groupBy });
      
      const { data: events, error } = await supabase
        .from('customer_timeline')
        .select('*')
        .eq('customer_id', customerId)
        .gte('event_date', startDate)
        .lte('event_date', endDate)
        .is('metadata->deleted_at', null)
        .order('event_date', { ascending: true });
      
      if (error) {
        logger.error('Erro ao buscar eventos por período', { error: error.message });
        throw new Error(`Erro ao buscar eventos: ${error.message}`);
      }
      
      // Agrupar eventos por período
      const groupedEvents = (events || []).reduce((acc, event) => {
        const eventDate = new Date(event.event_date);
        let groupKey: string;
        
        switch (groupBy) {
          case 'day':
            groupKey = eventDate.toISOString().split('T')[0]; // YYYY-MM-DD
            break;
          case 'week':
            const weekStart = new Date(eventDate);
            weekStart.setDate(eventDate.getDate() - eventDate.getDay());
            groupKey = weekStart.toISOString().split('T')[0];
            break;
          case 'month':
            groupKey = `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, '0')}`;
            break;
          default:
            groupKey = eventDate.toISOString().split('T')[0];
        }
        
        if (!acc[groupKey]) {
          acc[groupKey] = [];
        }
        acc[groupKey].push(event);
        
        return acc;
      }, {} as Record<string, TimelineEvent[]>);
      
      logger.info('Eventos agrupados por período', { 
        customerId, 
        groupBy, 
        groups: Object.keys(groupedEvents).length,
        totalEvents: events?.length || 0
      });
      
      return groupedEvents;
    } catch (error) {
      logger.error('Erro no TimelineManagementService.getEventsByPeriod', { error: error.message });
      throw error;
    }
  }
  
  /**
   * Exportar timeline para CSV
   */
  async exportTimeline(customerId: string, filters?: Partial<TimelineFilters>): Promise<string> {
    try {
      logger.info('Exportando timeline para CSV', { customerId });
      
      // Buscar todos os eventos (sem paginação)
      const timelineData = await this.getCustomerTimeline({
        customer_id: customerId,
        ...filters,
        limit: 1000, // Limite alto para exportação
        page: 1
      });
      
      // Cabeçalhos CSV
      const headers = [
        'Data do Evento',
        'Tipo',
        'Título',
        'Descrição',
        'Criado Por',
        'Entidade Relacionada',
        'Metadata'
      ];
      
      // Converter eventos para CSV
      const csvRows = [
        headers.join(','),
        ...timelineData.data.map(event => [
          event.event_date,
          event.event_type,
          `"${event.title.replace(/"/g, '""')}"`,
          `"${(event.description || '').replace(/"/g, '""')}"`,
          event.created_by_user?.name || 'Sistema',
          event.related_entity?.title || '',
          `"${JSON.stringify(event.metadata).replace(/"/g, '""')}"`
        ].join(','))
      ];
      
      const csvContent = csvRows.join('\n');
      
      logger.info('Timeline exportada para CSV', { 
        customerId, 
        eventCount: timelineData.data.length 
      });
      
      return csvContent;
    } catch (error) {
      logger.error('Erro ao exportar timeline', { error: error.message, customerId });
      throw error;
    }
  }
}

// Exportar instância estendida
export const timelineManagementService = new TimelineManagementService();