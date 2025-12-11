/**
 * Customer Service Unit Tests
 * Sprint 5: Sistema de CRM e Gestão de Clientes
 * 
 * Testes unitários para CustomerService e CustomerSearchService
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { customerService, customerSearchService } from '@/services/crm/customer.service';
import { CreateCustomerSchema, UpdateCustomerSchema } from '@/services/crm/customer.service';

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
    single: vi.fn(),
    limit: vi.fn().mockReturnThis(),
    textSearch: vi.fn().mockReturnThis()
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

describe('CustomerService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('deve criar um cliente com dados válidos', async () => {
      const customerData = {
        name: 'João Silva',
        email: 'joao@example.com',
        phone: '+5511999999999',
        source: 'manual' as const
      };

      const mockCustomer = {
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
        data: mockCustomer,
        error: null
      });

      const result = await customerService.create(customerData);

      expect(result).toEqual(mockCustomer);
      expect(mockSupabase.from).toHaveBeenCalledWith('customers');
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Cliente criado com sucesso',
        { id: mockCustomer.id, email: mockCustomer.email }
      );
    });

    it('deve rejeitar criação com email duplicado', async () => {
      const customerData = {
        name: 'João Silva',
        email: 'joao@example.com',
        source: 'manual' as const
      };

      // Mock: email já existe
      mockSupabase.from().select().eq().is().single.mockResolvedValueOnce({
        data: { id: 'existing-customer', email: 'joao@example.com' },
        error: null
      });

      await expect(customerService.create(customerData)).rejects.toThrow(
        'Cliente com email joao@example.com já existe'
      );
    });

    it('deve validar dados de entrada', async () => {
      const invalidData = {
        name: 'A', // muito curto
        email: 'email-inválido',
        phone: '123' // formato inválido
      };

      await expect(customerService.create(invalidData as any)).rejects.toThrow();
    });
  });

  describe('getById', () => {
    it('deve retornar cliente com tags e estatísticas', async () => {
      const customerId = 'customer-123';
      const mockCustomer = {
        id: customerId,
        name: 'João Silva',
        email: 'joao@example.com',
        status: 'active',
        assigned_user: {
          id: 'user-1',
          name: 'Vendedor',
          email: 'vendedor@example.com'
        }
      };

      const mockTags = [
        {
          customer_tags: {
            id: 'tag-1',
            name: 'VIP',
            color: '#ff0000'
          }
        }
      ];

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

      const result = await customerService.getById(customerId);

      expect(result).toEqual({
        ...mockCustomer,
        total_orders: 0,
        total_spent_cents: 0,
        last_order_at: undefined,
        tags: [{ id: 'tag-1', name: 'VIP', color: '#ff0000' }]
      });
    });

    it('deve retornar null para cliente não encontrado', async () => {
      const customerId = 'inexistente';

      mockSupabase.from().select().eq().is().single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' }
      });

      const result = await customerService.getById(customerId);

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('deve atualizar cliente existente', async () => {
      const updateData = {
        id: 'customer-123',
        name: 'João Silva Santos',
        phone: '+5511888888888'
      };

      const existingCustomer = {
        id: 'customer-123',
        name: 'João Silva',
        email: 'joao@example.com',
        phone: '+5511999999999'
      };

      const updatedCustomer = {
        ...existingCustomer,
        ...updateData
      };

      // Mock: verificar se cliente existe
      vi.spyOn(customerService, 'getById').mockResolvedValueOnce(existingCustomer as any);

      // Mock: atualizar cliente
      mockSupabase.from().update().eq().select().single.mockResolvedValueOnce({
        data: updatedCustomer,
        error: null
      });

      const result = await customerService.update(updateData);

      expect(result).toEqual(updatedCustomer);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Cliente atualizado com sucesso',
        { id: updateData.id, email: updatedCustomer.email }
      );
    });

    it('deve rejeitar atualização de cliente inexistente', async () => {
      const updateData = {
        id: 'inexistente',
        name: 'Nome Novo'
      };

      // Mock: cliente não existe
      vi.spyOn(customerService, 'getById').mockResolvedValueOnce(null);

      await expect(customerService.update(updateData)).rejects.toThrow(
        'Cliente inexistente não encontrado'
      );
    });

    it('deve verificar unicidade de email ao alterar', async () => {
      const updateData = {
        id: 'customer-123',
        email: 'novo@example.com'
      };

      const existingCustomer = {
        id: 'customer-123',
        email: 'antigo@example.com'
      };

      // Mock: cliente existe
      vi.spyOn(customerService, 'getById').mockResolvedValueOnce(existingCustomer as any);

      // Mock: email já está em uso
      mockSupabase.from().select().eq().neq().is().single.mockResolvedValueOnce({
        data: { id: 'outro-customer' },
        error: null
      });

      await expect(customerService.update(updateData)).rejects.toThrow(
        'Email novo@example.com já está em uso'
      );
    });
  });

  describe('delete', () => {
    it('deve fazer soft delete de cliente existente', async () => {
      const customerId = 'customer-123';
      const existingCustomer = {
        id: customerId,
        name: 'João Silva'
      };

      // Mock: cliente existe
      vi.spyOn(customerService, 'getById').mockResolvedValueOnce(existingCustomer as any);

      // Mock: soft delete
      mockSupabase.from().update().eq.mockResolvedValueOnce({
        error: null
      });

      await customerService.delete(customerId);

      expect(mockSupabase.from().update).toHaveBeenCalledWith({
        deleted_at: expect.any(String)
      });
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Cliente removido com sucesso',
        { id: customerId }
      );
    });

    it('deve rejeitar delete de cliente inexistente', async () => {
      const customerId = 'inexistente';

      // Mock: cliente não existe
      vi.spyOn(customerService, 'getById').mockResolvedValueOnce(null);

      await expect(customerService.delete(customerId)).rejects.toThrow(
        'Cliente inexistente não encontrado'
      );
    });
  });

  describe('list', () => {
    it('deve listar clientes com paginação', async () => {
      const mockCustomers = [
        {
          id: 'customer-1',
          name: 'João Silva',
          email: 'joao@example.com'
        },
        {
          id: 'customer-2',
          name: 'Maria Santos',
          email: 'maria@example.com'
        }
      ];

      const mockTags = [
        {
          customer_tags: {
            id: 'tag-1',
            name: 'VIP',
            color: '#ff0000'
          }
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
        data: mockTags,
        error: null
      });

      const result = await customerService.list({
        page: 1,
        limit: 20
      });

      expect(result.data).toHaveLength(2);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 2,
        total_pages: 1,
        has_next: false,
        has_prev: false
      });
    });

    it('deve aplicar filtros de busca', async () => {
      const filters = {
        search: 'João',
        status: 'active' as const,
        city: 'São Paulo'
      };

      mockSupabase.from().select().is().or().eq().ilike().order().range.mockResolvedValueOnce({
        data: [],
        error: null,
        count: 0
      });

      await customerService.list(filters);

      expect(mockSupabase.from().or).toHaveBeenCalledWith(
        'name.ilike.%João%,email.ilike.%João%,phone.ilike.%João%'
      );
      expect(mockSupabase.from().eq).toHaveBeenCalledWith('status', 'active');
      expect(mockSupabase.from().ilike).toHaveBeenCalledWith('city', '%São Paulo%');
    });
  });
});

describe('CustomerSearchService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('quickSearch', () => {
    it('deve retornar resultados para busca rápida', async () => {
      const query = 'João';
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

      const result = await customerSearchService.quickSearch(query, 10);

      expect(result).toEqual(mockResults);
      expect(mockSupabase.from().limit).toHaveBeenCalledWith(10);
    });

    it('deve retornar array vazio para query muito curta', async () => {
      const result = await customerSearchService.quickSearch('A');
      expect(result).toEqual([]);
    });

    it('deve retornar array vazio para query vazia', async () => {
      const result = await customerSearchService.quickSearch('');
      expect(result).toEqual([]);
    });
  });

  describe('getSearchSuggestions', () => {
    it('deve retornar sugestões baseadas em nomes e cidades', async () => {
      const partialQuery = 'João';
      
      const mockNameMatches = [
        { name: 'João Silva' },
        { name: 'João Santos' }
      ];
      
      const mockCityMatches = [
        { city: 'João Pessoa' }
      ];

      // Mock: buscar nomes
      mockSupabase.from().select().ilike().is().limit.mockResolvedValueOnce({
        data: mockNameMatches,
        error: null
      });

      // Mock: buscar cidades
      mockSupabase.from().select().ilike().is().not().limit.mockResolvedValueOnce({
        data: mockCityMatches,
        error: null
      });

      const result = await customerSearchService.getSearchSuggestions(partialQuery);

      expect(result).toEqual(['João Silva', 'João Santos', 'João Pessoa']);
    });

    it('deve retornar array vazio para query muito curta', async () => {
      const result = await customerSearchService.getSearchSuggestions('A');
      expect(result).toEqual([]);
    });

    it('deve remover duplicatas das sugestões', async () => {
      const partialQuery = 'Test';
      
      const mockNameMatches = [
        { name: 'Test User' }
      ];
      
      const mockCityMatches = [
        { city: 'Test User' } // Mesmo nome
      ];

      mockSupabase.from().select().ilike().is().limit.mockResolvedValueOnce({
        data: mockNameMatches,
        error: null
      });

      mockSupabase.from().select().ilike().is().not().limit.mockResolvedValueOnce({
        data: mockCityMatches,
        error: null
      });

      const result = await customerSearchService.getSearchSuggestions(partialQuery);

      expect(result).toEqual(['Test User']); // Sem duplicata
    });
  });

  describe('advancedSearch', () => {
    it('deve executar busca avançada com múltiplos filtros', async () => {
      const filters = {
        query: 'João',
        age_min: 25,
        age_max: 65,
        cities: ['São Paulo', 'Rio de Janeiro'],
        has_whatsapp_conversations: true
      };

      const mockCustomers = [
        {
          id: 'customer-1',
          name: 'João Silva',
          birth_date: '1990-01-01'
        }
      ];

      const mockConversations = [
        { customer_id: 'customer-1' }
      ];

      // Mock: busca principal
      mockSupabase.from().select().is().textSearch().lte().gte().in().range.mockResolvedValueOnce({
        data: mockCustomers,
        error: null,
        count: 1
      });

      // Mock: filtro de conversas WhatsApp
      mockSupabase.from().select().in().eq.mockResolvedValueOnce({
        data: mockConversations,
        error: null
      });

      // Mock: buscar tags e stats
      mockSupabase.from().select().eq.mockResolvedValue({
        data: [],
        error: null
      });

      const result = await customerSearchService.advancedSearch(filters);

      expect(result.data).toHaveLength(1);
      expect(mockSupabase.from().textSearch).toHaveBeenCalledWith(
        'search_vector',
        'João',
        { type: 'websearch', config: 'portuguese' }
      );
    });

    it('deve filtrar por CPF/CNPJ quando query contém apenas números', async () => {
      const filters = {
        query: '12345678901'
      };

      mockSupabase.from().select().is().or().range.mockResolvedValueOnce({
        data: [],
        error: null,
        count: 0
      });

      await customerSearchService.advancedSearch(filters);

      expect(mockSupabase.from().or).toHaveBeenCalledWith(
        'cpf_cnpj.like.%12345678901%,phone.like.%12345678901%'
      );
    });
  });
});

describe('Schemas de Validação', () => {
  describe('CreateCustomerSchema', () => {
    it('deve validar dados corretos', () => {
      const validData = {
        name: 'João Silva',
        email: 'joao@example.com',
        phone: '+5511999999999',
        source: 'manual'
      };

      const result = CreateCustomerSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('deve rejeitar nome muito curto', () => {
      const invalidData = {
        name: 'A',
        email: 'joao@example.com'
      };

      const result = CreateCustomerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toBe('Nome deve ter pelo menos 2 caracteres');
    });

    it('deve rejeitar email inválido', () => {
      const invalidData = {
        name: 'João Silva',
        email: 'email-inválido'
      };

      const result = CreateCustomerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toBe('Email inválido');
    });

    it('deve rejeitar telefone inválido', () => {
      const invalidData = {
        name: 'João Silva',
        email: 'joao@example.com',
        phone: '123'
      };

      const result = CreateCustomerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toBe('Telefone inválido');
    });

    it('deve rejeitar CEP inválido', () => {
      const invalidData = {
        name: 'João Silva',
        email: 'joao@example.com',
        postal_code: '123'
      };

      const result = CreateCustomerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toBe('CEP inválido');
    });

    it('deve aceitar CEP válido com e sem hífen', () => {
      const validData1 = {
        name: 'João Silva',
        email: 'joao@example.com',
        postal_code: '01234-567'
      };

      const validData2 = {
        name: 'João Silva',
        email: 'joao2@example.com',
        postal_code: '01234567'
      };

      expect(CreateCustomerSchema.safeParse(validData1).success).toBe(true);
      expect(CreateCustomerSchema.safeParse(validData2).success).toBe(true);
    });
  });

  describe('UpdateCustomerSchema', () => {
    it('deve validar atualização parcial', () => {
      const validData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'João Silva Santos'
      };

      const result = UpdateCustomerSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('deve rejeitar ID inválido', () => {
      const invalidData = {
        id: 'id-inválido',
        name: 'João Silva'
      };

      const result = UpdateCustomerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
});