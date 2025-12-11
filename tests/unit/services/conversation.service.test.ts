/**
 * Conversation Service Unit Tests
 * Sprint 5: Sistema de CRM e Gestão de Clientes
 * 
 * Testes unitários para ConversationService, MessageService e NotificationService
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { conversationService, messageService } from '@/services/crm/conversation.service';
import { notificationService } from '@/services/crm/notification.service';
import { 
  CreateConversationSchema, 
  UpdateConversationSchema,
  CreateMessageSchema 
} from '@/services/crm/conversation.service';

// Mock do Supabase
const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn(),
    head: vi.fn().mockReturnThis()
  })),
  rpc: vi.fn()
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

describe('ConversationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('deve criar uma conversa com dados válidos', async () => {
      const conversationData = {
        customer_id: '123e4567-e89b-12d3-a456-426614174000',
        channel: 'whatsapp' as const,
        channel_id: '+5511999999999',
        subject: 'Dúvida sobre produto',
        priority: 'medium' as const
      };

      const mockCustomer = {
        id: conversationData.customer_id
      };

      const mockConversation = {
        id: 'conv-123',
        ...conversationData,
        status: 'open',
        created_at: '2025-01-25T10:00:00Z',
        updated_at: '2025-01-25T10:00:00Z'
      };

      // Mock: verificar se cliente existe
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: mockCustomer,
        error: null
      });

      // Mock: verificar conversa ativa existente (não existe)
      mockSupabase.from().select().eq().eq().eq().in().single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' }
      });

      // Mock: inserir conversa
      mockSupabase.from().insert().select().single.mockResolvedValueOnce({
        data: mockConversation,
        error: null
      });

      const result = await conversationService.create(conversationData);

      expect(result).toEqual(mockConversation);
      expect(mockSupabase.from).toHaveBeenCalledWith('customers');
      expect(mockSupabase.from).toHaveBeenCalledWith('conversations');
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Conversa criada com sucesso',
        expect.objectContaining({
          id: mockConversation.id,
          customerId: mockConversation.customer_id,
          channel: mockConversation.channel
        })
      );
    });

    it('deve retornar conversa existente se já houver uma ativa', async () => {
      const conversationData = {
        customer_id: '123e4567-e89b-12d3-a456-426614174000',
        channel: 'whatsapp' as const,
        channel_id: '+5511999999999'
      };

      const mockCustomer = {
        id: conversationData.customer_id
      };

      const mockExistingConversation = {
        id: 'existing-conv',
        status: 'open'
      };

      // Mock: verificar se cliente existe
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: mockCustomer,
        error: null
      });

      // Mock: conversa ativa já existe
      mockSupabase.from().select().eq().eq().eq().in().single.mockResolvedValueOnce({
        data: mockExistingConversation,
        error: null
      });

      // Mock: getById para retornar conversa existente
      vi.spyOn(conversationService, 'getById').mockResolvedValueOnce(mockExistingConversation as any);

      const result = await conversationService.create(conversationData);

      expect(result).toEqual(mockExistingConversation);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Conversa ativa já existe, retornando existente',
        { conversationId: mockExistingConversation.id }
      );
    });

    it('deve rejeitar criação com cliente inexistente', async () => {
      const conversationData = {
        customer_id: 'inexistente',
        channel: 'whatsapp' as const,
        channel_id: '+5511999999999'
      };

      // Mock: cliente não existe
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' }
      });

      await expect(conversationService.create(conversationData)).rejects.toThrow(
        'Cliente inexistente não encontrado'
      );
    });

    it('deve validar dados de entrada', async () => {
      const invalidData = {
        customer_id: 'id-inválido',
        channel: 'canal-inválido',
        channel_id: ''
      };

      await expect(conversationService.create(invalidData as any)).rejects.toThrow();
    });
  });

  describe('getById', () => {
    it('deve retornar conversa com detalhes completos', async () => {
      const conversationId = 'conv-123';
      const mockConversation = {
        id: conversationId,
        customer_id: 'customer-123',
        channel: 'whatsapp',
        status: 'open',
        customer: {
          id: 'customer-123',
          name: 'João Silva',
          email: 'joao@example.com',
          phone: '+5511999999999'
        },
        assigned_user: {
          id: 'user-1',
          name: 'Atendente',
          email: 'atendente@example.com'
        }
      };

      const mockMessageStats = { total: 5, unread: 2 };
      const mockLastMessage = {
        id: 'msg-1',
        content: 'Última mensagem',
        direction: 'inbound',
        created_at: '2025-01-25T10:00:00Z'
      };

      // Mock: buscar conversa
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: mockConversation,
        error: null
      });

      // Mock: estatísticas de mensagens
      vi.spyOn(conversationService as any, 'getConversationMessageStats')
        .mockResolvedValueOnce(mockMessageStats);

      // Mock: última mensagem
      vi.spyOn(conversationService as any, 'getLastMessage')
        .mockResolvedValueOnce(mockLastMessage);

      const result = await conversationService.getById(conversationId);

      expect(result).toEqual({
        ...mockConversation,
        message_count: mockMessageStats.total,
        unread_count: mockMessageStats.unread,
        last_message: mockLastMessage
      });
    });

    it('deve retornar null para conversa não encontrada', async () => {
      const conversationId = 'inexistente';

      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' }
      });

      const result = await conversationService.getById(conversationId);

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('deve atualizar conversa existente', async () => {
      const updateData = {
        id: 'conv-123',
        status: 'resolved' as const,
        priority: 'high' as const
      };

      const existingConversation = {
        id: 'conv-123',
        status: 'open',
        priority: 'medium'
      };

      const updatedConversation = {
        ...existingConversation,
        ...updateData
      };

      // Mock: verificar se conversa existe
      vi.spyOn(conversationService, 'getById').mockResolvedValueOnce(existingConversation as any);

      // Mock: atualizar conversa
      mockSupabase.from().update().eq().select().single.mockResolvedValueOnce({
        data: updatedConversation,
        error: null
      });

      const result = await conversationService.update(updateData);

      expect(result).toEqual(updatedConversation);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Conversa atualizada com sucesso',
        { id: updateData.id, status: updatedConversation.status }
      );
    });

    it('deve rejeitar atualização de conversa inexistente', async () => {
      const updateData = {
        id: 'inexistente',
        status: 'resolved' as const
      };

      // Mock: conversa não existe
      vi.spyOn(conversationService, 'getById').mockResolvedValueOnce(null);

      await expect(conversationService.update(updateData)).rejects.toThrow(
        'Conversa inexistente não encontrada'
      );
    });
  });

  describe('assign', () => {
    it('deve atribuir conversa a um usuário', async () => {
      const conversationId = 'conv-123';
      const userId = 'user-123';

      const mockUser = {
        id: userId
      };

      // Mock: verificar se usuário existe
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: mockUser,
        error: null
      });

      // Mock: update da conversa
      vi.spyOn(conversationService, 'update').mockResolvedValueOnce({} as any);

      await conversationService.assign(conversationId, userId);

      expect(conversationService.update).toHaveBeenCalledWith({
        id: conversationId,
        assigned_to: userId
      });
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Conversa atribuída com sucesso',
        { conversationId, userId }
      );
    });

    it('deve rejeitar atribuição para usuário inexistente', async () => {
      const conversationId = 'conv-123';
      const userId = 'inexistente';

      // Mock: usuário não existe
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' }
      });

      await expect(conversationService.assign(conversationId, userId)).rejects.toThrow(
        'Usuário inexistente não encontrado'
      );
    });
  });

  describe('list', () => {
    it('deve listar conversas com filtros', async () => {
      const filters = {
        customer_id: 'customer-123',
        status: 'open' as const,
        channel: 'whatsapp' as const
      };

      const mockConversations = [
        {
          id: 'conv-1',
          customer_id: 'customer-123',
          channel: 'whatsapp',
          status: 'open',
          customer: { id: 'customer-123', name: 'João', email: 'joao@example.com' }
        },
        {
          id: 'conv-2',
          customer_id: 'customer-123',
          channel: 'whatsapp',
          status: 'open',
          customer: { id: 'customer-123', name: 'João', email: 'joao@example.com' }
        }
      ];

      const mockMessageStats = { total: 3, unread: 1 };
      const mockLastMessage = {
        id: 'msg-1',
        content: 'Última mensagem',
        direction: 'inbound',
        created_at: '2025-01-25T10:00:00Z'
      };

      // Mock: buscar conversas
      mockSupabase.from().select().eq().eq().eq().order().range.mockResolvedValueOnce({
        data: mockConversations,
        error: null,
        count: 2
      });

      // Mock: estatísticas para cada conversa
      vi.spyOn(conversationService as any, 'getConversationMessageStats')
        .mockResolvedValue(mockMessageStats);
      vi.spyOn(conversationService as any, 'getLastMessage')
        .mockResolvedValue(mockLastMessage);

      const result = await conversationService.list(filters);

      expect(result.data).toHaveLength(2);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 2,
        total_pages: 1,
        has_next: false,
        has_prev: false
      });
      expect(result.data[0]).toEqual({
        ...mockConversations[0],
        message_count: mockMessageStats.total,
        unread_count: mockMessageStats.unread,
        last_message: mockLastMessage
      });
    });

    it('deve aplicar filtros corretamente', async () => {
      const filters = {
        assigned_to: 'user-123',
        priority: 'high' as const,
        search: 'produto'
      };

      mockSupabase.from().select().eq().eq().ilike().order().range.mockResolvedValueOnce({
        data: [],
        error: null,
        count: 0
      });

      await conversationService.list(filters);

      expect(mockSupabase.from().eq).toHaveBeenCalledWith('assigned_to', 'user-123');
      expect(mockSupabase.from().eq).toHaveBeenCalledWith('priority', 'high');
      expect(mockSupabase.from().ilike).toHaveBeenCalledWith('subject', '%produto%');
    });
  });
});

describe('MessageService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('deve criar uma mensagem com dados válidos', async () => {
      const messageData = {
        conversation_id: 'conv-123',
        content: 'Olá, como posso ajudar?',
        direction: 'outbound' as const,
        sender_type: 'agent' as const,
        sender_id: 'user-123'
      };

      const mockConversation = {
        id: 'conv-123',
        customer_id: 'customer-123'
      };

      const mockMessage = {
        id: 'msg-123',
        ...messageData,
        created_at: '2025-01-25T10:00:00Z'
      };

      // Mock: verificar se conversa existe
      vi.spyOn(conversationService, 'getById').mockResolvedValueOnce(mockConversation as any);

      // Mock: inserir mensagem
      mockSupabase.from().insert().select().single.mockResolvedValueOnce({
        data: mockMessage,
        error: null
      });

      // Mock: atualizar última atividade da conversa
      vi.spyOn(conversationService, 'update').mockResolvedValueOnce({} as any);

      const result = await messageService.create(messageData);

      expect(result).toEqual(mockMessage);
      expect(conversationService.update).toHaveBeenCalledWith({
        id: messageData.conversation_id,
        last_message_at: mockMessage.created_at
      });
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Mensagem criada com sucesso',
        expect.objectContaining({
          id: mockMessage.id,
          conversationId: mockMessage.conversation_id,
          direction: mockMessage.direction
        })
      );
    });

    it('deve rejeitar criação com conversa inexistente', async () => {
      const messageData = {
        conversation_id: 'inexistente',
        content: 'Mensagem',
        direction: 'outbound' as const,
        sender_type: 'agent' as const
      };

      // Mock: conversa não existe
      vi.spyOn(conversationService, 'getById').mockResolvedValueOnce(null);

      await expect(messageService.create(messageData)).rejects.toThrow(
        'Conversa inexistente não encontrada'
      );
    });

    it('deve validar dados de entrada', async () => {
      const invalidData = {
        conversation_id: 'id-inválido',
        content: '', // conteúdo vazio
        direction: 'direção-inválida',
        sender_type: 'tipo-inválido'
      };

      await expect(messageService.create(invalidData as any)).rejects.toThrow();
    });
  });

  describe('listByConversation', () => {
    it('deve listar mensagens de uma conversa', async () => {
      const conversationId = 'conv-123';
      const mockMessages = [
        {
          id: 'msg-1',
          conversation_id: conversationId,
          content: 'Primeira mensagem',
          direction: 'inbound',
          created_at: '2025-01-25T09:00:00Z',
          sender: { id: 'customer-123', name: 'João', email: 'joao@example.com' }
        },
        {
          id: 'msg-2',
          conversation_id: conversationId,
          content: 'Segunda mensagem',
          direction: 'outbound',
          created_at: '2025-01-25T09:05:00Z',
          sender: { id: 'user-123', name: 'Atendente', email: 'atendente@example.com' }
        }
      ];

      // Mock: buscar mensagens
      mockSupabase.from().select().eq().order().range.mockResolvedValueOnce({
        data: mockMessages,
        error: null,
        count: 2
      });

      const result = await messageService.listByConversation(conversationId);

      expect(result.data).toEqual(mockMessages);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 50,
        total: 2,
        total_pages: 1,
        has_next: false,
        has_prev: false
      });
      expect(mockSupabase.from().order).toHaveBeenCalledWith('created_at', { ascending: true });
    });

    it('deve aplicar paginação corretamente', async () => {
      const conversationId = 'conv-123';
      const pagination = { page: 2, limit: 10 };

      mockSupabase.from().select().eq().order().range.mockResolvedValueOnce({
        data: [],
        error: null,
        count: 25
      });

      const result = await messageService.listByConversation(conversationId, pagination);

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

  describe('markAsRead', () => {
    it('deve marcar mensagem como lida', async () => {
      const messageId = 'msg-123';

      mockSupabase.from().update().eq.mockResolvedValueOnce({
        error: null
      });

      await messageService.markAsRead(messageId);

      expect(mockSupabase.from().update).toHaveBeenCalledWith({ is_read: true });
      expect(mockSupabase.from().eq).toHaveBeenCalledWith('id', messageId);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Mensagem marcada como lida',
        { messageId }
      );
    });
  });

  describe('markConversationAsRead', () => {
    it('deve marcar todas as mensagens da conversa como lidas', async () => {
      const conversationId = 'conv-123';

      mockSupabase.from().update().eq().eq().eq.mockResolvedValueOnce({
        error: null
      });

      await messageService.markConversationAsRead(conversationId);

      expect(mockSupabase.from().update).toHaveBeenCalledWith({ is_read: true });
      expect(mockSupabase.from().eq).toHaveBeenCalledWith('conversation_id', conversationId);
      expect(mockSupabase.from().eq).toHaveBeenCalledWith('direction', 'inbound');
      expect(mockSupabase.from().eq).toHaveBeenCalledWith('is_read', false);
    });
  });

  describe('getMessageStats', () => {
    it('deve calcular estatísticas de mensagens', async () => {
      const conversationId = 'conv-123';

      // Mock: total de mensagens
      mockSupabase.from().select().mockReturnValueOnce({
        count: vi.fn().mockResolvedValueOnce({ count: 50 })
      });

      // Mock: mensagens não lidas
      mockSupabase.from().select().eq().eq().mockReturnValueOnce({
        count: vi.fn().mockResolvedValueOnce({ count: 5 })
      });

      // Mock: mensagens de hoje
      mockSupabase.from().select().gte().mockReturnValueOnce({
        count: vi.fn().mockResolvedValueOnce({ count: 10 })
      });

      // Mock: mensagens desta semana
      mockSupabase.from().select().gte().mockReturnValueOnce({
        count: vi.fn().mockResolvedValueOnce({ count: 25 })
      });

      const result = await messageService.getMessageStats(conversationId);

      expect(result).toEqual({
        total: 50,
        unread: 5,
        today: 10,
        this_week: 25
      });
    });
  });
});

describe('NotificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('deve criar notificação com dados válidos', async () => {
      const notificationData = {
        user_id: 'user-123',
        type: 'new_message' as const,
        title: 'Nova mensagem',
        message: 'Você recebeu uma nova mensagem',
        priority: 'medium' as const
      };

      const mockUser = {
        id: 'user-123'
      };

      const mockPreferences = {
        user_id: 'user-123',
        email_notifications: true,
        push_notifications: true,
        notification_types: {}
      };

      const mockNotification = {
        id: 'notif-123',
        ...notificationData,
        is_read: false,
        is_dismissed: false,
        created_at: '2025-01-25T10:00:00Z'
      };

      // Mock: verificar se usuário existe
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: mockUser,
        error: null
      });

      // Mock: buscar preferências
      vi.spyOn(notificationService, 'getUserPreferences').mockResolvedValueOnce(mockPreferences as any);

      // Mock: verificar se deve notificar
      vi.spyOn(notificationService as any, 'shouldSendNotification').mockReturnValueOnce(true);

      // Mock: inserir notificação
      mockSupabase.from().insert().select().single.mockResolvedValueOnce({
        data: mockNotification,
        error: null
      });

      // Mock: enviar notificação em tempo real
      vi.spyOn(notificationService as any, 'sendRealTimeNotification').mockResolvedValueOnce(undefined);

      const result = await notificationService.create(notificationData);

      expect(result).toEqual(mockNotification);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Notificação criada com sucesso',
        expect.objectContaining({
          id: mockNotification.id,
          userId: mockNotification.user_id,
          type: mockNotification.type
        })
      );
    });

    it('deve bloquear notificação baseado nas preferências', async () => {
      const notificationData = {
        user_id: 'user-123',
        type: 'new_message' as const,
        title: 'Nova mensagem',
        message: 'Você recebeu uma nova mensagem'
      };

      const mockUser = {
        id: 'user-123'
      };

      const mockPreferences = {
        user_id: 'user-123',
        notification_types: {
          new_message: false // Tipo bloqueado
        }
      };

      // Mock: verificar se usuário existe
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: mockUser,
        error: null
      });

      // Mock: buscar preferências
      vi.spyOn(notificationService, 'getUserPreferences').mockResolvedValueOnce(mockPreferences as any);

      // Mock: verificar se deve notificar (retorna false)
      vi.spyOn(notificationService as any, 'shouldSendNotification').mockReturnValueOnce(false);

      const result = await notificationService.create(notificationData);

      expect(result).toBeNull();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Notificação bloqueada pelas preferências do usuário',
        {
          userId: notificationData.user_id,
          type: notificationData.type
        }
      );
    });
  });

  describe('list', () => {
    it('deve listar notificações com filtros', async () => {
      const filters = {
        user_id: 'user-123',
        type: 'new_message' as const,
        is_read: false
      };

      const mockNotifications = [
        {
          id: 'notif-1',
          user_id: 'user-123',
          type: 'new_message',
          title: 'Mensagem 1',
          is_read: false
        },
        {
          id: 'notif-2',
          user_id: 'user-123',
          type: 'new_message',
          title: 'Mensagem 2',
          is_read: false
        }
      ];

      // Mock: buscar notificações
      mockSupabase.from().select().eq().eq().eq().or().order().range.mockResolvedValueOnce({
        data: mockNotifications,
        error: null,
        count: 2
      });

      // Mock: contar não lidas
      mockSupabase.from().select().eq().eq().eq.mockReturnValueOnce({
        count: vi.fn().mockResolvedValueOnce({ count: 5 })
      });

      const result = await notificationService.list(filters);

      expect(result.data).toEqual(mockNotifications);
      expect(result.unread_count).toBe(5);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 2,
        total_pages: 1,
        has_next: false,
        has_prev: false
      });
    });
  });

  describe('markAsRead', () => {
    it('deve marcar notificação como lida', async () => {
      const notificationId = 'notif-123';

      mockSupabase.from().update().eq.mockResolvedValueOnce({
        error: null
      });

      await notificationService.markAsRead(notificationId);

      expect(mockSupabase.from().update).toHaveBeenCalledWith({
        is_read: true,
        updated_at: expect.any(String)
      });
      expect(mockSupabase.from().eq).toHaveBeenCalledWith('id', notificationId);
    });
  });

  describe('getUserPreferences', () => {
    it('deve retornar preferências do usuário', async () => {
      const userId = 'user-123';
      const mockPreferences = {
        user_id: userId,
        email_notifications: true,
        push_notifications: false,
        notification_types: {
          new_message: true,
          appointment_reminder: false
        }
      };

      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: mockPreferences,
        error: null
      });

      const result = await notificationService.getUserPreferences(userId);

      expect(result).toEqual(mockPreferences);
    });

    it('deve retornar preferências padrão se não existir', async () => {
      const userId = 'user-123';

      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' }
      });

      const result = await notificationService.getUserPreferences(userId);

      expect(result).toEqual({
        user_id: userId,
        email_notifications: true,
        push_notifications: true,
        sms_notifications: false,
        notification_types: {},
        timezone: 'America/Sao_Paulo'
      });
    });
  });
});

describe('Schemas de Validação', () => {
  describe('CreateConversationSchema', () => {
    it('deve validar dados corretos', () => {
      const validData = {
        customer_id: '123e4567-e89b-12d3-a456-426614174000',
        channel: 'whatsapp',
        channel_id: '+5511999999999',
        subject: 'Dúvida sobre produto'
      };

      const result = CreateConversationSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('deve rejeitar customer_id inválido', () => {
      const invalidData = {
        customer_id: 'id-inválido',
        channel: 'whatsapp',
        channel_id: '+5511999999999'
      };

      const result = CreateConversationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('deve rejeitar canal inválido', () => {
      const invalidData = {
        customer_id: '123e4567-e89b-12d3-a456-426614174000',
        channel: 'canal-inexistente',
        channel_id: '+5511999999999'
      };

      const result = CreateConversationSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('CreateMessageSchema', () => {
    it('deve validar dados corretos', () => {
      const validData = {
        conversation_id: '123e4567-e89b-12d3-a456-426614174000',
        content: 'Olá, como posso ajudar?',
        direction: 'outbound',
        sender_type: 'agent'
      };

      const result = CreateMessageSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('deve rejeitar conteúdo vazio', () => {
      const invalidData = {
        conversation_id: '123e4567-e89b-12d3-a456-426614174000',
        content: '',
        direction: 'outbound',
        sender_type: 'agent'
      };

      const result = CreateMessageSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toBe('Conteúdo da mensagem é obrigatório');
    });

    it('deve rejeitar direção inválida', () => {
      const invalidData = {
        conversation_id: '123e4567-e89b-12d3-a456-426614174000',
        content: 'Mensagem',
        direction: 'direção-inválida',
        sender_type: 'agent'
      };

      const result = CreateMessageSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
});