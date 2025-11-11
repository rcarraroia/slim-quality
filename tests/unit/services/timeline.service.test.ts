/**
 * Timeline Service Unit Tests
 * Sprint 5: Sistema de CRM e Gestão de Clientes
 * 
 * Testes unitários para TimelineService e TimelineManagementService
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { timelineService, timelineManagementService } from '@/services/crm/timeline.service';
import { 
  CreateTimelineEventSchema, 
  CreateNoteSchema,
  TimelineFiltersSchema 
} from '@/services/crm/timeline.service';

// Mock do Supabase
const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn(),
    head: vi.fn().mockReturnThis()
  }))
};

// Mock do logger
const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn()
};

// Mock dos módulos
vi.mock('@/config/supabase', () => ({
  supabase: mockSupabase
}));

vi.mock('@/utils/logger', () => ({
  logger: mockLogger
}));

describe('TimelineService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createEvent', () => {
    it('deve criar evento na timeline com dados válidos', async () => {
      const eventData = {
        customer_id: '123e4567-e89b-12d3-a456-426614174000',
        event_type: 'customer_created' as const,
        title: 'Cliente cadastrado',
        description: 'Cliente foi cadastrado no sistema',
        metadata: { source: 'manual' }
      };

      const mockCustomer = {
        id: eventData.customer_id
      };

      const mockEvent = {
        id: 'event-123',
        ...eventData,
        event_date: '2025-01-25T10:00:00Z',
        created_at: '2025-01-25T10:00:00Z'
      };

      // Mock: verificar se cliente existe
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: mockCustomer,
        error: null
      });

      // Mock: inserir evento
      mockSupabase.from().insert().select().single.mockResolvedValueOnce({
        data: mockEvent,
        error: null
      });

      const result = await timelineService.createEvent(eventData);

      expect(result).toEqual(mockEvent);
      expect(mockSupabase.from).toHaveBeenCalledWith('customers');
      expect(mockSupabase.from).toHaveBeenCalledWith('customer_timeline');
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Evento criado na timeline',
        expect.objectContaining({
          id: mockEvent.id,
          customerId: mockEvent.customer_id,
          eventType: mockEvent.event_type
        })
      );
    });

    it('deve rejeitar criação com cliente inexistente', async () => {
      const eventData = {
        customer_id: 'inexistente',
        event_type: 'customer_created' as const,
        title: 'Evento teste'
      };

      // Mock: cliente não existe
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' }
      });

      await expect(timelineService.createEvent(eventData)).rejects.toThrow(
        'Cliente inexistente não encontrado'
      );
    });

    it('deve definir data do evento automaticamente se não fornecida', async () => {
      const eventData = {
        customer_id: '123e4567-e89b-12d3-a456-426614174000',
        event_type: 'customer_updated' as const,
        title: 'Cliente atualizado'
      };

      const mockCustomer = { id: eventData.customer_id };
      const mockEvent = { id: 'event-123', ...eventData };

      // Mock: cliente existe
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: mockCustomer,
        error: null
      });

      // Mock: inserir evento
      mockSupabase.from().insert().select().single.mockResolvedValueOnce({
        data: mockEvent,
        error: null
      });

      await timelineService.createEvent(eventData);

      // Verificar se event_date foi definido automaticamente
      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          ...eventData,
          event_date: expect.any(String)
        })
      );
    });

    it('deve validar dados de entrada', async () => {
      const invalidData = {
        customer_id: 'id-inválido',
        event_type: 'tipo-inválido',
        title: ''
      };

      await expect(timelineService.createEvent(invalidData as any)).rejects.toThrow();
    });
  });

  describe('getCustomerTimeline', () => {
    it('deve buscar timeline do cliente com filtros', async () => {
      const filters = {
        customer_id: '123e4567-e89b-12d3-a456-426614174000',
        event_types: ['customer_created', 'order_placed'] as const,
        date_from: '2025-01-01T00:00:00Z',
        date_to: '2025-01-31T23:59:59Z'
      };

      const mockEvents = [
        {
          id: 'event-1',
          customer_id: filters.customer_id,
          event_type: 'customer_created',
          title: 'Cliente cadastrado',
          event_date: '2025-01-25T10:00:00Z',
          related_entity_type: null,
          related_entity_id: null,
          created_by_user: null
        },
        {
          id: 'event-2',
          customer_id: filters.customer_id,
          event_type: 'order_placed',
          title: 'Pedido realizado',
          event_date: '2025-01-26T15:30:00Z',
          related_entity_type: 'order',
          related_entity_id: 'order-123',
          created_by_user: null
        }
      ];

      // Mock: buscar eventos
      mockSupabase.from().select().eq().in().gte().lte().order().range.mockResolvedValueOnce({
        data: mockEvents,
        error: null,
        count: 2
      });

      // Mock: buscar dados das entidades relacionadas
      vi.spyOn(timelineService as any, 'getRelatedEntityData')
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          type: 'order',
          id: 'order-123',
          title: 'Pedido #order-123',
          data: { status: 'paid' }
        });

      const result = await timelineService.getCustomerTimeline(filters);

      expect(result.data).toHaveLength(2);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 2,
        total_pages: 1,
        has_next: false,
        has_prev: false
      });
      expect(result.data[1].related_entity).toEqual({
        type: 'order',
        id: 'order-123',
        title: 'Pedido #order-123',
        data: { status: 'paid' }
      });
    });

    it('deve aplicar filtros corretamente', async () => {
      const filters = {
        customer_id: '123e4567-e89b-12d3-a456-426614174000',
        event_types: ['note_added'] as const,
        created_by: 'user-123',
        search: 'importante'
      };

      mockSupabase.from().select().eq().in().eq().or().order().range.mockResolvedValueOnce({
        data: [],
        error: null,
        count: 0
      });

      await timelineService.getCustomerTimeline(filters);

      expect(mockSupabase.from().eq).toHaveBeenCalledWith('customer_id', filters.customer_id);
      expect(mockSupabase.from().in).toHaveBeenCalledWith('event_type', filters.event_types);
      expect(mockSupabase.from().eq).toHaveBeenCalledWith('created_by', filters.created_by);
      expect(mockSupabase.from().or).toHaveBeenCalledWith(
        'title.ilike.%importante%,description.ilike.%importante%'
      );
    });

    it('deve aplicar paginação corretamente', async () => {
      const filters = {
        customer_id: '123e4567-e89b-12d3-a456-426614174000',
        page: 2,
        limit: 10
      };

      mockSupabase.from().select().eq().order().range.mockResolvedValueOnce({
        data: [],
        error: null,
        count: 25
      });

      const result = await timelineService.getCustomerTimeline(filters);

      expect(mockSupabase.from().range).toHaveBeenCalledWith(10, 19); // offset 10, limit 10
      expect(result.pagination).toEqual({
        page: 2,
        limit: 10,
        total: 25,
        total_pages: 3,
        has_next: true,
        has_prev: true
      });
    });
  });

  describe('getTimelineStats', () => {
    it('deve calcular estatísticas da timeline', async () => {
      const customerId = '123e4567-e89b-12d3-a456-426614174000';

      // Mock: total de eventos
      mockSupabase.from().select().eq().mockReturnValueOnce({
        count: vi.fn().mockResolvedValueOnce({ count: 50 })
      });

      // Mock: eventos deste mês
      mockSupabase.from().select().eq().gte().mockReturnValueOnce({
        count: vi.fn().mockResolvedValueOnce({ count: 15 })
      });

      // Mock: eventos desta semana
      mockSupabase.from().select().eq().gte().mockReturnValueOnce({
        count: vi.fn().mockResolvedValueOnce({ count: 8 })
      });

      // Mock: eventos de hoje
      mockSupabase.from().select().eq().gte().mockReturnValueOnce({
        count: vi.fn().mockResolvedValueOnce({ count: 3 })
      });

      // Mock: eventos por tipo
      mockSupabase.from().select().eq().mockResolvedValueOnce({
        data: [
          { event_type: 'customer_created' },
          { event_type: 'order_placed' },
          { event_type: 'order_placed' },
          { event_type: 'note_added' }
        ],
        error: null
      });

      // Mock: atividade recente
      mockSupabase.from().select().eq().order().limit.mockResolvedValueOnce({
        data: [
          { id: 'event-1', title: 'Evento recente 1' },
          { id: 'event-2', title: 'Evento recente 2' }
        ],
        error: null
      });

      const result = await timelineService.getTimelineStats(customerId);

      expect(result).toEqual({
        total_events: 50,
        events_this_month: 15,
        events_this_week: 8,
        events_today: 3,
        by_type: {
          customer_created: 1,
          order_placed: 2,
          note_added: 1
        },
        recent_activity: [
          { id: 'event-1', title: 'Evento recente 1' },
          { id: 'event-2', title: 'Evento recente 2' }
        ]
      });
    });
  });

  describe('Métodos de registro automático', () => {
    beforeEach(() => {
      // Mock padrão para createEvent
      vi.spyOn(timelineService, 'createEvent').mockResolvedValue({
        id: 'event-123',
        customer_id: 'customer-123',
        event_type: 'customer_created',
        title: 'Evento teste',
        event_date: '2025-01-25T10:00:00Z',
        created_at: '2025-01-25T10:00:00Z'
      } as any);
    });

    describe('recordCustomerCreated', () => {
      it('deve registrar evento de criação de cliente', async () => {
        const customerId = 'customer-123';
        const metadata = { source: 'n8n', referral_code: 'ABC123' };

        await timelineService.recordCustomerCreated(customerId, metadata);

        expect(timelineService.createEvent).toHaveBeenCalledWith({
          customer_id: customerId,
          event_type: 'customer_created',
          title: 'Cliente cadastrado',
          description: 'Cliente foi cadastrado no sistema',
          metadata: {
            source: 'n8n',
            referral_code: 'ABC123'
          }
        });
      });
    });

    describe('recordCustomerUpdated', () => {
      it('deve registrar evento de atualização de cliente', async () => {
        const customerId = 'customer-123';
        const updatedFields = ['name', 'email'];
        const updatedBy = 'user-123';
        const metadata = { previous_email: 'old@example.com' };

        await timelineService.recordCustomerUpdated(customerId, updatedFields, updatedBy, metadata);

        expect(timelineService.createEvent).toHaveBeenCalledWith({
          customer_id: customerId,
          event_type: 'customer_updated',
          title: 'Dados do cliente atualizados',
          description: 'Campos atualizados: name, email',
          metadata: {
            updated_fields: updatedFields,
            previous_email: 'old@example.com'
          },
          created_by: updatedBy
        });
      });
    });

    describe('recordOrderEvent', () => {
      it('deve registrar evento de pedido', async () => {
        const customerId = 'customer-123';
        const orderId = 'order-456';
        const metadata = { total_amount: 329000, payment_method: 'pix' };

        await timelineService.recordOrderEvent(customerId, 'order_paid', orderId, metadata);

        expect(timelineService.createEvent).toHaveBeenCalledWith({
          customer_id: customerId,
          event_type: 'order_paid',
          title: 'Pagamento confirmado',
          description: 'Pedido #order-456',
          metadata: {
            order_id: orderId,
            total_amount: 329000,
            payment_method: 'pix'
          },
          related_entity_type: 'order',
          related_entity_id: orderId
        });
      });
    });

    describe('recordConversationEvent', () => {
      it('deve registrar evento de conversa', async () => {
        const customerId = 'customer-123';
        const conversationId = 'conv-456';
        const metadata = { channel: 'whatsapp', assigned_to: 'user-123' };

        await timelineService.recordConversationEvent(customerId, 'conversation_started', conversationId, metadata);

        expect(timelineService.createEvent).toHaveBeenCalledWith({
          customer_id: customerId,
          event_type: 'conversation_started',
          title: 'Conversa iniciada',
          description: 'Canal: whatsapp',
          metadata: {
            conversation_id: conversationId,
            channel: 'whatsapp',
            assigned_to: 'user-123'
          },
          related_entity_type: 'conversation',
          related_entity_id: conversationId
        });
      });
    });

    describe('recordTagEvent', () => {
      it('deve registrar evento de tag', async () => {
        const customerId = 'customer-123';
        const tagId = 'tag-456';
        const tagName = 'Cliente VIP';
        const addedBy = 'user-123';
        const metadata = { auto_applied: false };

        await timelineService.recordTagEvent(customerId, 'tag_added', tagId, tagName, addedBy, metadata);

        expect(timelineService.createEvent).toHaveBeenCalledWith({
          customer_id: customerId,
          event_type: 'tag_added',
          title: 'Tag adicionada',
          description: 'Tag: Cliente VIP',
          metadata: {
            tag_id: tagId,
            tag_name: tagName,
            auto_applied: false
          },
          related_entity_type: 'tag',
          related_entity_id: tagId,
          created_by: addedBy
        });
      });
    });
  });
});

describe('TimelineManagementService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('addNote', () => {
    it('deve adicionar nota manual à timeline', async () => {
      const noteData = {
        customer_id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Reunião importante',
        content: 'Cliente demonstrou interesse em produto premium',
        is_private: false,
        created_by: 'user-123'
      };

      const mockUser = {
        id: 'user-123',
        name: 'João Vendedor'
      };

      const mockTimelineEvent = {
        id: 'event-123',
        customer_id: noteData.customer_id,
        event_type: 'note_added',
        title: noteData.title,
        description: noteData.content
      };

      // Mock: verificar se usuário existe
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: mockUser,
        error: null
      });

      // Mock: createEvent
      vi.spyOn(timelineManagementService, 'createEvent').mockResolvedValueOnce(mockTimelineEvent as any);

      const result = await timelineManagementService.addNote(noteData);

      expect(result).toEqual(mockTimelineEvent);
      expect(timelineManagementService.createEvent).toHaveBeenCalledWith({
        customer_id: noteData.customer_id,
        event_type: 'note_added',
        title: noteData.title,
        description: noteData.content,
        metadata: {
          is_private: false,
          note_content: noteData.content,
          added_by_name: mockUser.name
        },
        created_by: noteData.created_by
      });
    });

    it('deve rejeitar nota com usuário inexistente', async () => {
      const noteData = {
        customer_id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Nota teste',
        content: 'Conteúdo da nota',
        created_by: 'inexistente'
      };

      // Mock: usuário não existe
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' }
      });

      await expect(timelineManagementService.addNote(noteData)).rejects.toThrow(
        'Usuário inexistente não encontrado'
      );
    });

    it('deve validar dados de entrada', async () => {
      const invalidData = {
        customer_id: 'id-inválido',
        title: '',
        content: '',
        created_by: 'user-inválido'
      };

      await expect(timelineManagementService.addNote(invalidData as any)).rejects.toThrow();
    });
  });

  describe('addCustomEvent', () => {
    it('deve adicionar evento personalizado', async () => {
      const customerId = 'customer-123';
      const title = 'Evento personalizado';
      const description = 'Descrição do evento';
      const createdBy = 'user-123';
      const metadata = { custom_field: 'valor' };
      const eventDate = '2025-01-25T15:00:00Z';

      const mockUser = {
        id: 'user-123',
        name: 'João Vendedor'
      };

      const mockTimelineEvent = {
        id: 'event-123',
        customer_id: customerId,
        event_type: 'custom_event',
        title,
        description
      };

      // Mock: verificar se usuário existe
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: mockUser,
        error: null
      });

      // Mock: createEvent
      vi.spyOn(timelineManagementService, 'createEvent').mockResolvedValueOnce(mockTimelineEvent as any);

      const result = await timelineManagementService.addCustomEvent(
        customerId, title, description, createdBy, metadata, eventDate
      );

      expect(result).toEqual(mockTimelineEvent);
      expect(timelineManagementService.createEvent).toHaveBeenCalledWith({
        customer_id: customerId,
        event_type: 'custom_event',
        title,
        description,
        metadata: {
          custom_field: 'valor',
          added_by_name: mockUser.name,
          is_custom: true
        },
        created_by: createdBy,
        event_date: eventDate
      });
    });
  });

  describe('editEvent', () => {
    it('deve editar evento manual existente', async () => {
      const eventId = 'event-123';
      const updates = {
        title: 'Título atualizado',
        description: 'Descrição atualizada',
        metadata: { updated_field: 'novo_valor' }
      };
      const editedBy = 'user-123';

      const mockExistingEvent = {
        id: eventId,
        event_type: 'note_added',
        created_by: editedBy,
        metadata: { original_field: 'valor_original' }
      };

      const mockUpdatedEvent = {
        ...mockExistingEvent,
        ...updates,
        metadata: {
          ...mockExistingEvent.metadata,
          ...updates.metadata,
          edited_at: expect.any(String),
          edited_by: editedBy
        }
      };

      // Mock: buscar evento existente
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: mockExistingEvent,
        error: null
      });

      // Mock: atualizar evento
      mockSupabase.from().update().eq().select().single.mockResolvedValueOnce({
        data: mockUpdatedEvent,
        error: null
      });

      const result = await timelineManagementService.editEvent(eventId, updates, editedBy);

      expect(result).toEqual(mockUpdatedEvent);
      expect(mockSupabase.from().update).toHaveBeenCalledWith({
        title: updates.title,
        description: updates.description,
        metadata: {
          original_field: 'valor_original',
          updated_field: 'novo_valor',
          edited_at: expect.any(String),
          edited_by: editedBy
        }
      });
    });

    it('deve rejeitar edição de evento não editável', async () => {
      const eventId = 'event-123';
      const updates = { title: 'Novo título' };
      const editedBy = 'user-123';

      const mockExistingEvent = {
        id: eventId,
        event_type: 'customer_created', // Evento automático, não editável
        created_by: null
      };

      // Mock: buscar evento existente
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: mockExistingEvent,
        error: null
      });

      await expect(timelineManagementService.editEvent(eventId, updates, editedBy)).rejects.toThrow(
        'Apenas notas e eventos personalizados podem ser editados'
      );
    });

    it('deve rejeitar edição por usuário não autorizado', async () => {
      const eventId = 'event-123';
      const updates = { title: 'Novo título' };
      const editedBy = 'user-456'; // Usuário diferente do criador

      const mockExistingEvent = {
        id: eventId,
        event_type: 'note_added',
        created_by: 'user-123' // Criador diferente
      };

      const mockUser = {
        id: editedBy,
        role: 'user' // Não é admin
      };

      // Mock: buscar evento existente
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: mockExistingEvent,
        error: null
      });

      // Mock: verificar role do usuário
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: mockUser,
        error: null
      });

      await expect(timelineManagementService.editEvent(eventId, updates, editedBy)).rejects.toThrow(
        'Apenas o criador do evento ou administradores podem editá-lo'
      );
    });
  });

  describe('removeEvent', () => {
    it('deve remover evento manual (soft delete)', async () => {
      const eventId = 'event-123';
      const removedBy = 'user-123';
      const reason = 'Informação incorreta';

      const mockExistingEvent = {
        id: eventId,
        event_type: 'note_added',
        created_by: removedBy,
        customer_id: 'customer-123',
        metadata: { original_field: 'valor' }
      };

      // Mock: buscar evento existente
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: mockExistingEvent,
        error: null
      });

      // Mock: soft delete
      mockSupabase.from().update().eq.mockResolvedValueOnce({
        error: null
      });

      await timelineManagementService.removeEvent(eventId, removedBy, reason);

      expect(mockSupabase.from().update).toHaveBeenCalledWith({
        metadata: {
          original_field: 'valor',
          deleted_at: expect.any(String),
          deleted_by: removedBy,
          deletion_reason: reason
        }
      });
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Evento removido com sucesso',
        {
          id: eventId,
          customerId: mockExistingEvent.customer_id,
          removedBy
        }
      );
    });

    it('deve rejeitar remoção de evento não removível', async () => {
      const eventId = 'event-123';
      const removedBy = 'user-123';

      const mockExistingEvent = {
        id: eventId,
        event_type: 'order_placed', // Evento automático, não removível
        created_by: null
      };

      // Mock: buscar evento existente
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: mockExistingEvent,
        error: null
      });

      await expect(timelineManagementService.removeEvent(eventId, removedBy)).rejects.toThrow(
        'Apenas notas e eventos personalizados podem ser removidos'
      );
    });
  });

  describe('getEditableEvents', () => {
    it('deve buscar eventos editáveis do usuário', async () => {
      const customerId = 'customer-123';
      const userId = 'user-123';

      const mockEditableEvents = [
        {
          id: 'event-1',
          event_type: 'note_added',
          title: 'Nota 1',
          created_by: userId
        },
        {
          id: 'event-2',
          event_type: 'custom_event',
          title: 'Evento personalizado',
          created_by: userId
        }
      ];

      // Mock: buscar eventos editáveis
      mockSupabase.from().select().eq().in().is().eq().order.mockResolvedValueOnce({
        data: mockEditableEvents,
        error: null
      });

      const result = await timelineManagementService.getEditableEvents(customerId, userId);

      expect(result).toEqual(mockEditableEvents);
      expect(mockSupabase.from().eq).toHaveBeenCalledWith('customer_id', customerId);
      expect(mockSupabase.from().in).toHaveBeenCalledWith('event_type', ['note_added', 'custom_event']);
      expect(mockSupabase.from().is).toHaveBeenCalledWith('metadata->deleted_at', null);
      expect(mockSupabase.from().eq).toHaveBeenCalledWith('created_by', userId);
    });
  });

  describe('exportTimeline', () => {
    it('deve exportar timeline para CSV', async () => {
      const customerId = 'customer-123';

      const mockTimelineData = {
        data: [
          {
            event_date: '2025-01-25T10:00:00Z',
            event_type: 'customer_created',
            title: 'Cliente cadastrado',
            description: 'Cliente foi cadastrado no sistema',
            created_by_user: { name: 'Sistema' },
            related_entity: null,
            metadata: { source: 'manual' }
          },
          {
            event_date: '2025-01-26T15:30:00Z',
            event_type: 'note_added',
            title: 'Reunião realizada',
            description: 'Cliente demonstrou interesse',
            created_by_user: { name: 'João Vendedor' },
            related_entity: { title: 'Nota importante' },
            metadata: { is_private: false }
          }
        ]
      };

      // Mock: getCustomerTimeline
      vi.spyOn(timelineManagementService, 'getCustomerTimeline').mockResolvedValueOnce(mockTimelineData as any);

      const result = await timelineManagementService.exportTimeline(customerId);

      const expectedCsv = [
        'Data do Evento,Tipo,Título,Descrição,Criado Por,Entidade Relacionada,Metadata',
        '2025-01-25T10:00:00Z,customer_created,"Cliente cadastrado","Cliente foi cadastrado no sistema",Sistema,"","{""source"":""manual""}"',
        '2025-01-26T15:30:00Z,note_added,"Reunião realizada","Cliente demonstrou interesse",João Vendedor,"Nota importante","{""is_private"":false}"'
      ].join('\n');

      expect(result).toBe(expectedCsv);
      expect(timelineManagementService.getCustomerTimeline).toHaveBeenCalledWith({
        customer_id: customerId,
        limit: 1000,
        page: 1
      });
    });
  });
});

describe('Schemas de Validação', () => {
  describe('CreateTimelineEventSchema', () => {
    it('deve validar dados corretos', () => {
      const validData = {
        customer_id: '123e4567-e89b-12d3-a456-426614174000',
        event_type: 'customer_created',
        title: 'Cliente cadastrado',
        description: 'Cliente foi cadastrado no sistema',
        metadata: { source: 'manual' }
      };

      const result = CreateTimelineEventSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('deve rejeitar customer_id inválido', () => {
      const invalidData = {
        customer_id: 'id-inválido',
        event_type: 'customer_created',
        title: 'Evento teste'
      };

      const result = CreateTimelineEventSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('deve rejeitar event_type inválido', () => {
      const invalidData = {
        customer_id: '123e4567-e89b-12d3-a456-426614174000',
        event_type: 'tipo_inexistente',
        title: 'Evento teste'
      };

      const result = CreateTimelineEventSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('deve rejeitar título vazio', () => {
      const invalidData = {
        customer_id: '123e4567-e89b-12d3-a456-426614174000',
        event_type: 'customer_created',
        title: ''
      };

      const result = CreateTimelineEventSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('CreateNoteSchema', () => {
    it('deve validar dados corretos', () => {
      const validData = {
        customer_id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Reunião importante',
        content: 'Cliente demonstrou interesse em produto premium',
        is_private: false,
        created_by: '123e4567-e89b-12d3-a456-426614174001'
      };

      const result = CreateNoteSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('deve rejeitar conteúdo vazio', () => {
      const invalidData = {
        customer_id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Nota teste',
        content: '',
        created_by: '123e4567-e89b-12d3-a456-426614174001'
      };

      const result = CreateNoteSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('deve definir is_private como false por padrão', () => {
      const validData = {
        customer_id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Nota teste',
        content: 'Conteúdo da nota',
        created_by: '123e4567-e89b-12d3-a456-426614174001'
      };

      const result = CreateNoteSchema.safeParse(validData);
      expect(result.success).toBe(true);
      expect(result.data?.is_private).toBe(false);
    });
  });

  describe('TimelineFiltersSchema', () => {
    it('deve validar filtros corretos', () => {
      const validFilters = {
        customer_id: '123e4567-e89b-12d3-a456-426614174000',
        event_types: ['customer_created', 'order_placed'],
        date_from: '2025-01-01T00:00:00Z',
        date_to: '2025-01-31T23:59:59Z',
        search: 'importante',
        page: 2,
        limit: 10
      };

      const result = TimelineFiltersSchema.safeParse(validFilters);
      expect(result.success).toBe(true);
    });

    it('deve definir valores padrão', () => {
      const minimalFilters = {
        customer_id: '123e4567-e89b-12d3-a456-426614174000'
      };

      const result = TimelineFiltersSchema.safeParse(minimalFilters);
      expect(result.success).toBe(true);
      expect(result.data?.page).toBe(1);
      expect(result.data?.limit).toBe(20);
      expect(result.data?.sort_order).toBe('desc');
    });

    it('deve rejeitar customer_id inválido', () => {
      const invalidFilters = {
        customer_id: 'id-inválido'
      };

      const result = TimelineFiltersSchema.safeParse(invalidFilters);
      expect(result.success).toBe(false);
    });
  });
});