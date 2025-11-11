import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '@/app';
import { supabase } from '@/config/database';

describe('Tag API Integration Tests', () => {
  let authToken: string;
  let adminUserId: string;
  let testTagId: string;

  beforeAll(async () => {
    // Criar usuário admin para testes
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: `admin-${Date.now()}@test.com`,
      password: 'test123456'
    });

    if (authError) throw authError;
    adminUserId = authData.user!.id;

    // Criar perfil admin
    await supabase.from('profiles').insert({
      id: adminUserId,
      role: 'admin',
      name: 'Admin Test User'
    });

    // Gerar token de acesso
    const { data: sessionData } = await supabase.auth.signInWithPassword({
      email: `admin-${Date.now()}@test.com`,
      password: 'test123456'
    });

    authToken = sessionData.session!.access_token;
  });

  afterAll(async () => {
    // Limpar dados de teste
    if (testTagId) {
      await supabase.from('crm_tags').delete().eq('id', testTagId);
    }
    await supabase.from('profiles').delete().eq('id', adminUserId);
    await supabase.auth.admin.deleteUser(adminUserId);
  });

  beforeEach(async () => {
    // Limpar tags de teste antes de cada teste
    await supabase.from('crm_tags').delete().like('name', 'Test Tag%');
  });

  describe('POST /api/admin/tags', () => {
    it('deve criar uma nova tag com sucesso', async () => {
      const tagData = {
        name: 'Test Tag VIP',
        color: '#FFD700',
        description: 'Tag para clientes VIP',
        category: 'customer_type'
      };

      const response = await request(app)
        .post('/api/admin/tags')
        .set('Authorization', `Bearer ${authToken}`)
        .send(tagData)
        .expect(201);

      expect(response.body).toMatchObject({
        name: 'Test Tag VIP',
        color: '#FFD700',
        description: 'Tag para clientes VIP',
        category: 'customer_type'
      });

      expect(response.body.id).toBeDefined();
      expect(response.body.created_at).toBeDefined();

      testTagId = response.body.id;
    });

    it('deve rejeitar tag com nome duplicado', async () => {
      // Criar primeira tag
      const tagData = {
        name: 'Test Tag Duplicate',
        color: '#FF0000'
      };

      await request(app)
        .post('/api/admin/tags')
        .set('Authorization', `Bearer ${authToken}`)
        .send(tagData)
        .expect(201);

      // Tentar criar tag com mesmo nome
      await request(app)
        .post('/api/admin/tags')
        .set('Authorization', `Bearer ${authToken}`)
        .send(tagData)
        .expect(409);
    });

    it('deve rejeitar dados inválidos', async () => {
      const invalidData = {
        name: '', // Nome vazio
        color: 'invalid-color' // Cor inválida
      };

      const response = await request(app)
        .post('/api/admin/tags')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.error).toBe('Dados inválidos');
      expect(response.body.details).toBeDefined();
    });

    it('deve rejeitar acesso sem autenticação', async () => {
      const tagData = {
        name: 'Test Tag No Auth',
        color: '#FF0000'
      };

      await request(app)
        .post('/api/admin/tags')
        .send(tagData)
        .expect(401);
    });
  });

  describe('GET /api/admin/tags', () => {
    beforeEach(async () => {
      // Criar algumas tags para teste
      await supabase.from('crm_tags').insert([
        {
          name: 'Test Tag 1',
          color: '#FF0000',
          category: 'type1'
        },
        {
          name: 'Test Tag 2',
          color: '#00FF00',
          category: 'type2'
        },
        {
          name: 'Test Tag 3',
          color: '#0000FF',
          category: 'type1'
        }
      ]);
    });

    it('deve listar todas as tags', async () => {
      const response = await request(app)
        .get('/api/admin/tags')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThanOrEqual(3);
      expect(response.body.pagination).toBeDefined();
    });

    it('deve filtrar tags por categoria', async () => {
      const response = await request(app)
        .get('/api/admin/tags?category=type1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      response.body.data.forEach((tag: any) => {
        expect(tag.category).toBe('type1');
      });
    });

    it('deve buscar tags por nome', async () => {
      const response = await request(app)
        .get('/api/admin/tags?search=Test Tag 1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.some((tag: any) => tag.name.includes('Test Tag 1'))).toBe(true);
    });

    it('deve paginar resultados', async () => {
      const response = await request(app)
        .get('/api/admin/tags?page=1&limit=2')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.length).toBeLessThanOrEqual(2);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(2);
    });
  });

  describe('GET /api/admin/tags/:id', () => {
    let tagId: string;

    beforeEach(async () => {
      // Criar tag para teste
      const { data } = await supabase.from('crm_tags').insert({
        name: 'Test Tag Detail',
        color: '#PURPLE'
      }).select().single();

      tagId = data.id;
    });

    it('deve buscar tag por ID', async () => {
      const response = await request(app)
        .get(`/api/admin/tags/${tagId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: tagId,
        name: 'Test Tag Detail',
        color: '#PURPLE'
      });
    });

    it('deve retornar 404 para tag inexistente', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await request(app)
        .get(`/api/admin/tags/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('PUT /api/admin/tags/:id', () => {
    let tagId: string;

    beforeEach(async () => {
      // Criar tag para teste
      const { data } = await supabase.from('crm_tags').insert({
        name: 'Test Tag Update',
        color: '#ORANGE'
      }).select().single();

      tagId = data.id;
    });

    it('deve atualizar tag com sucesso', async () => {
      const updateData = {
        name: 'Test Tag Updated',
        color: '#CYAN',
        description: 'Tag atualizada'
      };

      const response = await request(app)
        .put(`/api/admin/tags/${tagId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject({
        id: tagId,
        name: 'Test Tag Updated',
        color: '#CYAN',
        description: 'Tag atualizada'
      });
    });

    it('deve retornar 404 para tag inexistente', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const updateData = { name: 'New Name' };

      await request(app)
        .put(`/api/admin/tags/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(404);
    });
  });

  describe('DELETE /api/admin/tags/:id', () => {
    let tagId: string;

    beforeEach(async () => {
      // Criar tag para teste
      const { data } = await supabase.from('crm_tags').insert({
        name: 'Test Tag Delete',
        color: '#RED'
      }).select().single();

      tagId = data.id;
    });

    it('deve excluir tag com sucesso', async () => {
      const response = await request(app)
        .delete(`/api/admin/tags/${tagId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.message).toBe('Tag excluída com sucesso');

      // Verificar se foi realmente excluída
      const { data } = await supabase
        .from('crm_tags')
        .select()
        .eq('id', tagId)
        .single();

      expect(data).toBeNull();
    });

    it('deve retornar 404 para tag inexistente', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await request(app)
        .delete(`/api/admin/tags/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('GET /api/admin/tags/stats', () => {
    it('deve retornar estatísticas de uso das tags', async () => {
      const response = await request(app)
        .get('/api/admin/tags/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      
      if (response.body.length > 0) {
        expect(response.body[0]).toHaveProperty('tag_id');
        expect(response.body[0]).toHaveProperty('tag_name');
        expect(response.body[0]).toHaveProperty('usage_count');
      }
    });
  });

  describe('POST /api/admin/tags/bulk-apply', () => {
    let tagIds: string[];
    let customerIds: string[];

    beforeEach(async () => {
      // Criar tags para teste
      const { data: tagsData } = await supabase.from('crm_tags').insert([
        { name: 'Bulk Tag 1', color: '#FF0000' },
        { name: 'Bulk Tag 2', color: '#00FF00' }
      ]).select();

      tagIds = tagsData.map(tag => tag.id);

      // Criar clientes para teste
      const { data: customersData } = await supabase.from('crm_customers').insert([
        { name: 'Customer 1', email: 'customer1@test.com' },
        { name: 'Customer 2', email: 'customer2@test.com' }
      ]).select();

      customerIds = customersData.map(customer => customer.id);
    });

    it('deve aplicar tags em massa com sucesso', async () => {
      const bulkData = {
        customer_ids: customerIds,
        tag_ids: tagIds
      };

      const response = await request(app)
        .post('/api/admin/tags/bulk-apply')
        .set('Authorization', `Bearer ${authToken}`)
        .send(bulkData)
        .expect(200);

      expect(response.body.message).toBe('Tags aplicadas com sucesso');
      expect(response.body.applicationsCreated).toBe(4); // 2 customers × 2 tags
    });

    it('deve rejeitar dados inválidos', async () => {
      const invalidData = {
        customer_ids: ['invalid-uuid'],
        tag_ids: tagIds
      };

      await request(app)
        .post('/api/admin/tags/bulk-apply')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);
    });
  });
});