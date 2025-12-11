/**
 * Customer API Integration Tests
 * Sprint 5: Sistema de CRM e Gestão de Clientes
 * 
 * Testes de integração para APIs de clientes
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import customerRoutes from '@/api/routes/customer.routes';

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
app.use('/api/customers', customerRoutes);

describe('Customer API Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/customers', () => {
    it('deve listar clientes com sucesso', async () => {
      const mockCustomers = [
        {
          id: 'customer-1',
          name: 'João Silva',
          email: 'joao@example.com',
          status: 'active',
          source: 'manual',
          created_at: '2025-01-25T10:00:00Z',
          assigned_user: null,
          tags: []
        },
        {
          id: 'customer-2',
          name: 'Maria Santos',
          email: 'maria@example.com',
          status: 'active',
          source: 'n8n',
          created_at: '2025-01-25T11:00:00Z',
          assigned_user: null,
          tags: []
        }
      ];

      // Mock: buscar clientes
      mockSupabase.from().select().is().order().range.mockResolvedValueOnce({
        data: mockCustomers,
        error: null,
        count: 2
      });

      // Mock: buscar tags para cada cliente
      mockSupabase.from().select().eq.mockResolvedValue({
        data: [],
        error: null
      });

      const response = await request(app)
        .get('/api/customers')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({
            id: 'customer-1',
            name: 'João Silva',
            email: 'joao@example.com'
          })
        ]),
        pagination: {
          page: 1,
          limit: 20,
          total: 2,
          total_pages: 1,
          has_next: false,
          has_prev: false
        }
      });
    });

    it('deve aplicar filtros de busca', async () => {
      mockSupabase.from().select().is().or().order().range.mockResolvedValueOnce({
        data: [],
        error: null,
        count: 0
      });

      mockSupabase.from().select().eq.mockResolvedValue({
        data: [],
        error: null
      });

      const response = await request(app)
        .get('/api/customers')
        .query({
          search: 'João',
          status: 'active',
          source: 'manual',
          page: '1',
          limit: '10'
        })
        .expect(200);

      expect(mockSupabase.from().or).toHaveBeenCalledWith(
        'name.ilike.%João%,email.ilike.%João%,phone.ilike.%João%'
      );
      expect(mockSupabase.from().eq).toHaveBeenCalledWith('status', 'active');
      expect(mockSupabase.from().eq).toHaveBeenCalledWith('source', 'manual');
    });

    it('deve retornar erro 400 para parâmetros inválidos', async () => {
      const response = await request(app)
        .get('/api/customers')
        .query({
          page: 'invalid',
          limit: '200' // Acima do máximo
        })
        .expect(400);

      expect(response.body).toEqual({
        error: 'Parâmetros inválidos',
        details: expect.any(Array)
      });
    });
  });

  describe('GET /api/customers/:id', () => {
    it('deve retornar cliente por ID', async () => {
      const customerId = 'customer-123';
      const mockCustomer = {
        id: customerId,
        name: 'João Silva',
        email: 'joao@example.com',
        status: 'active',
        assigned_user: null
      };

      const mockTags = [];

      // Mock: buscar cliente
      mockSupabase.from().select().eq().is().single.mockResolvedValueOnce({
        data: mockCustomer,
        error: null
      });

      // Mock: buscar tags
      mockSupabase.from().select().eq.mockResolvedValueOnce({
        data: mockTags,
        error: null
      });

      const response = await request(app)
        .get(`/api/customers/${customerId}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          id: customerId,
          name: 'João Silva',
          email: 'joao@example.com',
          tags: []
        })
      });
    });

    it('deve retornar 404 para cliente não encontrado', async () => {
      const customerId = 'inexistente';

      mockSupabase.from().select().eq().is().single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' }
      });

      const response = await request(app)
        .get(`/api/customers/${customerId}`)
        .expect(404);

      expect(response.body).toEqual({
        error: 'Cliente não encontrado'
      });
    });

    it('deve retornar erro 400 para ID inválido', async () => {
      const response = await request(app)
        .get('/api/customers/invalid-uuid')
        .expect(400);

      expect(response.body).toEqual({
        error: 'ID do cliente inválido',
        details: expect.any(Array)
      });
    });
  });

  describe('POST /api/customers', () => {
    it('deve criar cliente com dados válidos', async () => {
      const customerData = {
        name: 'João Silva',
        email: 'joao@example.com',
        phone: '+5511999999999',
        source: 'manual'
      };

      const mockCreatedCustomer = {
        id: 'customer-123',
        ...customerData,
        status: 'active',
        created_at: '2025-01-25T10:00:00Z',
        updated_at: '2025-01-25T10:00:00Z'
      };

      // Mock: verificar se email já existe (não existe)
      mockSupabase.from().select().eq().is().single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' }
      });

      // Mock: inserir cliente
      mockSupabase.from().insert().select().single.mockResolvedValueOnce({
        data: mockCreatedCustomer,
        error: null
      });

      const response = await request(app)
        .post('/api/customers')
        .send(customerData)
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        data: mockCreatedCustomer,
        message: 'Cliente criado com sucesso'
      });
    });

    it('deve retornar erro 409 para email duplicado', async () => {
      const customerData = {
        name: 'João Silva',
        email: 'joao@example.com',
        source: 'manual'
      };

      // Mock: email já existe
      mockSupabase.from().select().eq().is().single.mockResolvedValueOnce({
        data: { id: 'existing-customer', email: 'joao@example.com' },
        error: null
      });

      const response = await request(app)
        .post('/api/customers')
        .send(customerData)
        .expect(409);

      expect(response.body).toEqual({
        error: 'Conflito',
        message: expect.stringContaining('já existe')
      });
    });

    it('deve retornar erro 400 para dados inválidos', async () => {
      const invalidData = {
        name: 'A', // Muito curto
        email: 'email-inválido',
        phone: '123' // Formato inválido
      };

      const response = await request(app)
        .post('/api/customers')
        .send(invalidData)
        .expect(400);

      expect(response.body).toEqual({
        error: 'Dados inválidos',
        message: expect.any(String)
      });
    });
  });

  describe('PUT /api/customers/:id', () => {
    it('deve atualizar cliente existente', async () => {
      const customerId = 'customer-123';
      const updateData = {
        name: 'João Silva Santos',
        phone: '+5511888888888'
      };

      const existingCustomer = {
        id: customerId,
        name: 'João Silva',
        email: 'joao@example.com',
        phone: '+5511999999999',
        assigned_to: null
      };

      const updatedCustomer = {
        ...existingCustomer,
        ...updateData
      };

      // Mock: buscar cliente existente
      mockSupabase.from().select().eq().is().single.mockResolvedValueOnce({
        data: existingCustomer,
        error: null
      });

      mockSupabase.from().select().eq.mockResolvedValueOnce({
        data: [],
        error: null
      });

      // Mock: atualizar cliente
      mockSupabase.from().update().eq().select().single.mockResolvedValueOnce({
        data: updatedCustomer,
        error: null
      });

      const response = await request(app)
        .put(`/api/customers/${customerId}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: updatedCustomer,
        message: 'Cliente atualizado com sucesso'
      });
    });

    it('deve retornar 404 para cliente inexistente', async () => {
      const customerId = 'inexistente';
      const updateData = { name: 'Nome Novo' };

      mockSupabase.from().select().eq().is().single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' }
      });

      const response = await request(app)
        .put(`/api/customers/${customerId}`)
        .send(updateData)
        .expect(404);

      expect(response.body).toEqual({
        error: 'Cliente não encontrado'
      });
    });
  });

  describe('DELETE /api/customers/:id', () => {
    it('deve remover cliente (soft delete)', async () => {
      const customerId = 'customer-123';
      const existingCustomer = {
        id: customerId,
        name: 'João Silva'
      };

      // Mock: buscar cliente existente
      mockSupabase.from().select().eq().is().single.mockResolvedValueOnce({
        data: existingCustomer,
        error: null
      });

      mockSupabase.from().select().eq.mockResolvedValueOnce({
        data: [],
        error: null
      });

      // Mock: soft delete
      mockSupabase.from().update().eq.mockResolvedValueOnce({
        error: null
      });

      const response = await request(app)
        .delete(`/api/customers/${customerId}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Cliente removido com sucesso'
      });

      expect(mockSupabase.from().update).toHaveBeenCalledWith({
        deleted_at: expect.any(String)
      });
    });
  });

  describe('GET /api/customers/quick-search', () => {
    it('deve realizar busca rápida', async () => {
      const mockResults = [
        {
          id: 'customer-1',
          name: 'João Silva',
          email: 'joao@example.com',
          phone: '+5511999999999',
          city: 'São Paulo'
        }
      ];

      mockSupabase.from().select().or().is().limit.mockResolvedValueOnce({
        data: mockResults,
        error: null
      });

      const response = await request(app)
        .get('/api/customers/quick-search')
        .query({ q: 'João', limit: '5' })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockResults
      });
    });

    it('deve retornar erro 400 sem parâmetro q', async () => {
      const response = await request(app)
        .get('/api/customers/quick-search')
        .expect(400);

      expect(response.body).toEqual({
        error: 'Parâmetro "q" é obrigatório'
      });
    });

    it('deve retornar array vazio para query muito curta', async () => {
      const response = await request(app)
        .get('/api/customers/quick-search')
        .query({ q: 'A' })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: []
      });
    });
  });

  describe('GET /api/customers/:id/timeline', () => {
    it('deve retornar timeline do cliente', async () => {
      const customerId = 'customer-123';
      const mockCustomer = {
        id: customerId,
        name: 'João Silva',
        assigned_to: null
      };

      const mockTimeline = {
        data: [
          {
            id: 'event-1',
            event_type: 'customer_created',
            title: 'Cliente cadastrado',
            event_date: '2025-01-25T10:00:00Z'
          }
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          total_pages: 1,
          has_next: false,
          has_prev: false
        }
      };

      // Mock: verificar se cliente existe
      mockSupabase.from().select().eq().is().single.mockResolvedValueOnce({
        data: mockCustomer,
        error: null
      });

      mockSupabase.from().select().eq.mockResolvedValueOnce({
        data: [],
        error: null
      });

      // Mock: buscar timeline
      mockSupabase.from().select().eq().order().range.mockResolvedValueOnce({
        data: mockTimeline.data,
        error: null,
        count: 1
      });

      const response = await request(app)
        .get(`/api/customers/${customerId}/timeline`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockTimeline.data,
        pagination: mockTimeline.pagination
      });
    });
  });

  describe('POST /api/customers/:id/notes', () => {
    it('deve adicionar nota ao cliente', async () => {
      const customerId = 'customer-123';
      const noteData = {
        title: 'Reunião importante',
        content: 'Cliente demonstrou interesse em produto premium',
        is_private: false
      };

      const mockCustomer = {
        id: customerId,
        name: 'João Silva',
        assigned_to: null
      };

      const mockNote = {
        id: 'note-123',
        customer_id: customerId,
        event_type: 'note_added',
        title: noteData.title,
        description: noteData.content
      };

      // Mock: verificar se cliente existe
      mockSupabase.from().select().eq().is().single.mockResolvedValueOnce({
        data: mockCustomer,
        error: null
      });

      mockSupabase.from().select().eq.mockResolvedValueOnce({
        data: [],
        error: null
      });

      // Mock: criar nota (via timeline service)
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: { id: 'user-123', name: 'Usuário' },
        error: null
      });

      mockSupabase.from().insert().select().single.mockResolvedValueOnce({
        data: mockNote,
        error: null
      });

      const response = await request(app)
        .post(`/api/customers/${customerId}/notes`)
        .send(noteData)
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        data: mockNote,
        message: 'Nota adicionada com sucesso'
      });
    });

    it('deve retornar erro 400 sem título ou conteúdo', async () => {
      const customerId = 'customer-123';
      const invalidData = {
        title: '', // Vazio
        content: 'Conteúdo'
      };

      const response = await request(app)
        .post(`/api/customers/${customerId}/notes`)
        .send(invalidData)
        .expect(400);

      expect(response.body).toEqual({
        error: 'Título e conteúdo são obrigatórios'
      });
    });
  });

  describe('Tags endpoints', () => {
    const customerId = 'customer-123';

    describe('GET /api/customers/:id/tags', () => {
      it('deve retornar tags do cliente', async () => {
        const mockTags = [
          {
            id: 'tag-1',
            name: 'VIP',
            color: '#ff0000'
          }
        ];

        mockSupabase.from().select().eq.mockResolvedValueOnce({
          data: [{ customer_tags: mockTags[0] }],
          error: null
        });

        const response = await request(app)
          .get(`/api/customers/${customerId}/tags`)
          .expect(200);

        expect(response.body).toEqual({
          success: true,
          data: mockTags
        });
      });
    });

    describe('POST /api/customers/:id/tags', () => {
      it('deve aplicar tag ao cliente', async () => {
        const tagData = { tag_id: 'tag-123' };
        const mockAssignment = {
          id: 'assignment-123',
          customer_id: customerId,
          tag_id: tagData.tag_id
        };

        // Mock: verificar se tag existe
        mockSupabase.from().select().eq().single.mockResolvedValueOnce({
          data: { id: tagData.tag_id, name: 'VIP' },
          error: null
        });

        // Mock: verificar se cliente existe
        mockSupabase.from().select().eq().single.mockResolvedValueOnce({
          data: { id: customerId },
          error: null
        });

        // Mock: verificar se já não está aplicada
        mockSupabase.from().select().eq().eq().single.mockResolvedValueOnce({
          data: null,
          error: { code: 'PGRST116' }
        });

        // Mock: aplicar tag
        mockSupabase.from().insert().select().single.mockResolvedValueOnce({
          data: mockAssignment,
          error: null
        });

        const response = await request(app)
          .post(`/api/customers/${customerId}/tags`)
          .send(tagData)
          .expect(201);

        expect(response.body).toEqual({
          success: true,
          data: mockAssignment,
          message: 'Tag aplicada com sucesso'
        });
      });

      it('deve retornar erro 400 sem tag_id', async () => {
        const response = await request(app)
          .post(`/api/customers/${customerId}/tags`)
          .send({})
          .expect(400);

        expect(response.body).toEqual({
          error: 'ID da tag é obrigatório'
        });
      });
    });

    describe('DELETE /api/customers/:id/tags/:tagId', () => {
      it('deve remover tag do cliente', async () => {
        const tagId = 'tag-123';

        // Mock: verificar se assignment existe
        mockSupabase.from().select().eq().eq().single.mockResolvedValueOnce({
          data: { id: 'assignment-123', auto_applied: false },
          error: null
        });

        // Mock: remover assignment
        mockSupabase.from().delete().eq.mockResolvedValueOnce({
          error: null
        });

        const response = await request(app)
          .delete(`/api/customers/${customerId}/tags/${tagId}`)
          .expect(200);

        expect(response.body).toEqual({
          success: true,
          message: 'Tag removida com sucesso'
        });
      });
    });
  });
});