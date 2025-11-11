/**
 * Conversation API Integration Tests
 * Sprint 5: Sistema de CRM e Gestão de Clientes
 * 
 * Testes de integração para APIs de conversas e mensagens
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import conversationRoutes from '@/api/routes/conversation.routes';

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

// Mock dos módulos
vi.mock('@/config/supabase', () => ({
  supabase: mockSupabase
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  }
}));

// Setup da aplicação Express para testes
const app = express();
app.use(express.json());
app.use('/api/conversations', conversationRoutes);

describe('Conversation API Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/conversations', () => {
    it('deve listar conversas com sucesso', async () => {
      const mockConversations = [
        {
          id: 'conv-1',
          customer_id: 'customer-1',
          channel: 'whatsapp',
          status: 'open',
          priority: 'medium',
          customer: {
            id: 'customer-1',
            name: 'João Silva',
            email: 'joao@example.com'
          },
          assigned_user: null,
          message_count: 3,
          unread_count: 1,
          last_message: null
        }
      ];

      // Mock: buscar conversas
      mockSupabase.from().select().order().range.mockResolvedValueOnce({
        data: mockConversations,
        error: null,
        count: 1
      });

      // Mock: estatísticas de mensagens
      mockSupabase.from().select().eq().mockReturnValue({
        count: vi.fn().mockResolvedValue({ count: 3 })
      });

      mockSupabase.from().select().eq().eq().eq().mockReturnValue({
        count: vi.fn().mockResolvedValue({ count: 1 })
      });

      // Mock: última mensagem
      mockSupabase.from().select().eq().order().limit().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }
      });

      const response = await request(app)
        .get('/api/conversations')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({
            id: 'conv-1',
            channel: 'whatsapp',
            status: 'open'
          })
        ]),
        pagination: expect.objectContaining({
          page: 1,
          limit: 20,
          total: 1
        })
      });
    });

    it('deve aplicar filtros de busca', async () => {
      mockSupabase.from().select().eq().eq().eq().order().range.mockResolvedValueOnce({
        data: [],
        error: null,
        count: 0
      });

      const response = await request(app)
        .get('/api/conversations')
        .query({
          channel: 'whatsapp',
          status: 'open',
          priority: 'high',
          assigned_to: 'user-123'
        })
        .expect(200);

      expect(mockSupabase.from().eq).toHaveBeenCalledWith('channel', 'whatsapp');
      expect(mockSupabase.from().eq).toHaveBeenCalledWith('status', 'open');
      expect(mockSupabase.from().eq).toHaveBeenCalledWith('priority', 'high');
      expect(mockSupabase.from().eq).toHaveBeenCalledWith('assigned_to', 'user-123');
    });
  });

  describe('GET /api/conversations/:id', () => {
    it('deve retornar conversa por ID', async () => {
      const conversationId = 'conv-123';
      const mockConversation = {
        id: conversationId,
        customer_id: 'customer-123',
        channel: 'whatsapp',
        status: 'open',
        assigned_to: null,
        customer: {
          id: 'customer-123',
          name: 'João Silva',
          email: 'joao@example.com'
        },
        assigned_user: null
      };

      // Mock: buscar conversa
      mockSupabase.from().select().eq().is().single.mockResolvedValueOnce({
        data: mockConversation,
        error: null
      });

      // Mock: estatísticas de mensagens
      mockSupabase.from().select().eq().mockReturnValue({
        count: vi.fn().mockResolvedValue({ count: 5 })
      });

      mockSupabase.from().select().eq().eq().eq().mockReturnValue({
        count: vi.fn().mockResolvedValue({ count: 2 })
      });

      // Mock: última mensagem
      mockSupabase.from().select().eq().order().limit().single.mockResolvedValue({
        data: {
          id: 'msg-1',
          content: 'Última mensagem',
          direction: 'inbound',
          created_at: '2025-01-25T10:00:00Z'
        },
        error: null
      });

      const response = await request(app)
        .get(`/api/conversations/${conversationId}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          id: conversationId,
          channel: 'whatsapp',
          status: 'open',
          message_count: 5,
          unread_count: 2,
          last_message: expect.objectContaining({
            content: 'Última mensagem'
          })
        })
      });
    });

    it('deve retornar 404 para conversa não encontrada', async () => {
      const conversationId = 'inexistente';

      mockSupabase.from().select().eq().is().single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' }
      });

      const response = await request(app)
        .get(`/api/conversations/${conversationId}`)
        .expect(404);

      expect(response.body).toEqual({
        error: 'Conversa não encontrada'
      });
    });
  });

  describe('POST /api/conversations', () => {
    it('deve criar conversa com dados válidos', async () => {
      const conversationData = {
        customer_id: 'customer-123',
        channel: 'whatsapp',
        channel_id: '+5511999999999',
        subject: 'Dúvida sobre produto'
      };

      const mockCustomer = {
        id: conversationData.customer_id,
        name: 'João Silva',
        email: 'joao@example.com'
      };

      const mockConversation = {
        id: 'conv-123',
        ...conversationData,
        status: 'open',
        created_at: '2025-01-25T10:00:00Z'
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

      const response = await request(app)
        .post('/api/conversations')
        .send(conversationData)
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        data: mockConversation,
        message: 'Conversa criada com sucesso'
      });
    });

    it('deve retornar erro 404 para cliente inexistente', async () => {
      const conversationData = {
        customer_id: 'inexistente',
        channel: 'whatsapp',
        channel_id: '+5511999999999'
      };

      // Mock: cliente não existe
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' }
      });

      const response = await request(app)
        .post('/api/conversations')
        .send(conversationData)
        .expect(404);

      expect(response.body).toEqual({
        error: 'Cliente não encontrado'
      });
    });
  });

  describe('PUT /api/conversations/:id', () => {
    it('deve atualizar conversa existente', async () => {
      const conversationId = 'conv-123';
      const updateData = {
        status: 'resolved',
        priority: 'high'
      };

      const existingConversation = {
        id: conversationId,
        status: 'open',
        priority: 'medium',
        assigned_to: null
      };

      const updatedConversation = {
        ...existingConversation,
        ...updateData
      };

      // Mock: buscar conversa existente
      mockSupabase.from().select().eq().is().single.mockResolvedValueOnce({
        data: existingConversation,
        error: null
      });

      // Mock: estatísticas (para getById)
      mockSupabase.from().select().eq().mockReturnValue({
        count: vi.fn().mockResolvedValue({ count: 0 })
      });

      mockSupabase.from().select().eq().order().limit().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }
      });

      // Mock: atualizar conversa
      mockSupabase.from().update().eq().select().single.mockResolvedValueOnce({
        data: updatedConversation,
        error: null
      });

      const response = await request(app)
        .put(`/api/conversations/${conversationId}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: updatedConversation,
        message: 'Conversa atualizada com sucesso'
      });
    });
  });

  describe('POST /api/conversations/:id/assign', () => {
    it('deve atribuir conversa a um usuário', async () => {
      const conversationId = 'conv-123';
      const assignData = { user_id: 'user-123' };

      const mockUser = {
        id: assignData.user_id,
        name: 'João Vendedor',
        email: 'joao@example.com'
      };

      // Mock: verificar se usuário existe
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: mockUser,
        error: null
      });

      // Mock: atualizar conversa (assign)
      mockSupabase.from().update().eq().select().single.mockResolvedValueOnce({
        data: { id: conversationId, assigned_to: assignData.user_id },
        error: null
      });

      const response = await request(app)
        .post(`/api/conversations/${conversationId}/assign`)
        .send(assignData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Conversa atribuída com sucesso'
      });
    });

    it('deve retornar erro 400 sem user_id', async () => {
      const conversationId = 'conv-123';

      const response = await request(app)
        .post(`/api/conversations/${conversationId}/assign`)
        .send({})
        .expect(400);

      expect(response.body).toEqual({
        error: 'ID do usuário é obrigatório'
      });
    });
  });

  describe('POST /api/conversations/:id/close', () => {
    it('deve fechar conversa', async () => {
      const conversationId = 'conv-123';
      const closeData = { reason: 'Problema resolvido' };

      // Mock: atualizar conversa (close)
      mockSupabase.from().update().eq().select().single.mockResolvedValueOnce({
        data: { id: conversationId, status: 'closed' },
        error: null
      });

      const response = await request(app)
        .post(`/api/conversations/${conversationId}/close`)
        .send(closeData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Conversa fechada com sucesso'
      });
    });
  });

  describe('GET /api/conversations/:id/messages', () => {
    it('deve listar mensagens da conversa', async () => {
      const conversationId = 'conv-123';
      const mockConversation = {
        id: conversationId,
        assigned_to: null
      };

      const mockMessages = [
        {
          id: 'msg-1',
          conversation_id: conversationId,
          content: 'Olá, como posso ajudar?',
          direction: 'outbound',
          created_at: '2025-01-25T10:00:00Z',
          sender: {
            id: 'user-123',
            name: 'Atendente',
            email: 'atendente@example.com'
          }
        }
      ];

      // Mock: verificar se conversa existe
      mockSupabase.from().select().eq().is().single.mockResolvedValueOnce({
        data: mockConversation,
        error: null
      });

      // Mock: estatísticas (para getById)
      mockSupabase.from().select().eq().mockReturnValue({
        count: vi.fn().mockResolvedValue({ count: 1 })
      });

      mockSupabase.from().select().eq().order().limit().single.mockResolvedValue({
        data: mockMessages[0],
        error: null
      });

      // Mock: listar mensagens
      mockSupabase.from().select().eq().order().range.mockResolvedValueOnce({
        data: mockMessages,
        error: null,
        count: 1
      });

      const response = await request(app)
        .get(`/api/conversations/${conversationId}/messages`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockMessages,
        pagination: expect.objectContaining({
          page: 1,
          limit: 50,
          total: 1
        })
      });
    });

    it('deve retornar 404 para conversa não encontrada', async () => {
      const conversationId = 'inexistente';

      mockSupabase.from().select().eq().is().single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' }
      });

      const response = await request(app)
        .get(`/api/conversations/${conversationId}/messages`)
        .expect(404);

      expect(response.body).toEqual({
        error: 'Conversa não encontrada'
      });
    });
  });

  describe('POST /api/conversations/:id/messages', () => {
    it('deve enviar mensagem na conversa', async () => {
      const conversationId = 'conv-123';
      const messageData = {
        content: 'Olá, como posso ajudar?',
        message_type: 'text'
      };

      const mockConversation = {
        id: conversationId,
        assigned_to: null
      };

      const mockMessage = {
        id: 'msg-123',
        conversation_id: conversationId,
        content: messageData.content,
        message_type: messageData.message_type,
        direction: 'outbound',
        sender_type: 'agent',
        created_at: '2025-01-25T10:00:00Z'
      };

      // Mock: verificar se conversa existe
      mockSupabase.from().select().eq().is().single.mockResolvedValueOnce({
        data: mockConversation,
        error: null
      });

      // Mock: estatísticas (para getById)
      mockSupabase.from().select().eq().mockReturnValue({
        count: vi.fn().mockResolvedValue({ count: 0 })
      });

      mockSupabase.from().select().eq().order().limit().single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' }
      });

      // Mock: inserir mensagem
      mockSupabase.from().insert().select().single.mockResolvedValueOnce({
        data: mockMessage,
        error: null
      });

      // Mock: atualizar última atividade da conversa
      mockSupabase.from().update().eq().select().single.mockResolvedValueOnce({
        data: { id: conversationId, last_message_at: mockMessage.created_at },
        error: null
      });

      const response = await request(app)
        .post(`/api/conversations/${conversationId}/messages`)
        .send(messageData)
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        data: mockMessage,
        message: 'Mensagem enviada com sucesso'
      });
    });

    it('deve retornar erro 400 sem conteúdo', async () => {
      const conversationId = 'conv-123';

      const response = await request(app)
        .post(`/api/conversations/${conversationId}/messages`)
        .send({})
        .expect(400);

      expect(response.body).toEqual({
        error: 'Conteúdo da mensagem é obrigatório'
      });
    });
  });

  describe('PUT /api/conversations/:conversationId/messages/:messageId/read', () => {
    it('deve marcar mensagem específica como lida', async () => {
      const conversationId = 'conv-123';
      const messageId = 'msg-123';

      // Mock: marcar mensagem como lida
      mockSupabase.from().update().eq.mockResolvedValueOnce({
        error: null
      });

      const response = await request(app)
        .put(`/api/conversations/${conversationId}/messages/${messageId}/read`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Mensagem(ns) marcada(s) como lida(s)'
      });
    });
  });

  describe('PUT /api/conversations/:conversationId/messages/read', () => {
    it('deve marcar todas as mensagens da conversa como lidas', async () => {
      const conversationId = 'conv-123';

      // Mock: marcar conversa como lida
      mockSupabase.from().update().eq().eq().eq.mockResolvedValueOnce({
        error: null
      });

      const response = await request(app)
        .put(`/api/conversations/${conversationId}/messages/read`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Mensagem(ns) marcada(s) como lida(s)'
      });
    });
  });

  describe('GET /api/conversations/stats', () => {
    it('deve retornar estatísticas de conversas', async () => {
      const mockStats = {
        total: 50,
        unread: 5,
        today: 10,
        this_week: 25
      };

      // Mock: estatísticas de mensagens
      mockSupabase.from().select().is().eq().mockReturnValue({
        count: vi.fn().mockResolvedValue({ count: mockStats.total })
      });

      mockSupabase.from().select().is().eq().eq().eq().mockReturnValue({
        count: vi.fn().mockResolvedValue({ count: mockStats.unread })
      });

      mockSupabase.from().select().is().eq().gte().mockReturnValue({
        count: vi.fn().mockResolvedValue({ count: mockStats.today })
      });

      const response = await request(app)
        .get('/api/conversations/stats')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          total: mockStats.total,
          unread: mockStats.unread,
          today: mockStats.today,
          this_week: mockStats.this_week
        })
      });
    });
  });
});