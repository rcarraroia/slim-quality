import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '@/app';
import { supabase } from '@/config/database';

describe('Reports API Integration Tests', () => {
  let authToken: string;
  let adminUserId: string;

  beforeAll(async () => {
    // Criar usuário admin para testes
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: `admin-reports-${Date.now()}@test.com`,
      password: 'test123456'
    });

    if (authError) throw authError;
    adminUserId = authData.user!.id;

    // Criar perfil admin
    await supabase.from('profiles').insert({
      id: adminUserId,
      role: 'admin',
      name: 'Admin Reports Test User'
    });

    // Gerar token de acesso
    const { data: sessionData } = await supabase.auth.signInWithPassword({
      email: `admin-reports-${Date.now()}@test.com`,
      password: 'test123456'
    });

    authToken = sessionData.session!.access_token;
  });

  afterAll(async () => {
    // Limpar dados de teste
    await supabase.from('profiles').delete().eq('id', adminUserId);
    await supabase.auth.admin.deleteUser(adminUserId);
  });

  describe('GET /api/admin/reports/dashboard', () => {
    it('deve retornar métricas do dashboard', async () => {
      const response = await request(app)
        .get('/api/admin/reports/dashboard')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('customers');
      expect(response.body).toHaveProperty('conversations');
      expect(response.body).toHaveProperty('appointments');
      expect(response.body).toHaveProperty('generated_at');

      // Verificar estrutura das métricas de clientes
      expect(response.body.customers).toHaveProperty('total');
      expect(response.body.customers).toHaveProperty('new_this_period');
      expect(response.body.customers).toHaveProperty('active');
      expect(response.body.customers).toHaveProperty('growth_rate');
      expect(response.body.customers).toHaveProperty('by_source');
      expect(response.body.customers).toHaveProperty('top_tags');

      // Verificar estrutura das métricas de conversas
      expect(response.body.conversations).toHaveProperty('total');
      expect(response.body.conversations).toHaveProperty('open');
      expect(response.body.conversations).toHaveProperty('pending');
      expect(response.body.conversations).toHaveProperty('avg_response_time_minutes');
      expect(response.body.conversations).toHaveProperty('by_channel');
      expect(response.body.conversations).toHaveProperty('satisfaction_rate');

      // Verificar estrutura das métricas de agendamentos
      expect(response.body.appointments).toHaveProperty('total');
      expect(response.body.appointments).toHaveProperty('scheduled');
      expect(response.body.appointments).toHaveProperty('completed');
      expect(response.body.appointments).toHaveProperty('completion_rate');
      expect(response.body.appointments).toHaveProperty('by_type');
    });

    it('deve aceitar filtros de período', async () => {
      const response = await request(app)
        .get('/api/admin/reports/dashboard?period=month')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('customers');
      expect(response.body).toHaveProperty('conversations');
      expect(response.body).toHaveProperty('appointments');
    });

    it('deve aceitar filtros de data', async () => {
      const startDate = '2025-01-01T00:00:00Z';
      const endDate = '2025-01-31T23:59:59Z';

      const response = await request(app)
        .get(`/api/admin/reports/dashboard?start_date=${startDate}&end_date=${endDate}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('customers');
      expect(response.body).toHaveProperty('conversations');
      expect(response.body).toHaveProperty('appointments');
    });

    it('deve rejeitar filtros inválidos', async () => {
      const response = await request(app)
        .get('/api/admin/reports/dashboard?period=invalid')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.error).toBe('Filtros inválidos');
      expect(response.body.details).toBeDefined();
    });

    it('deve rejeitar acesso sem autenticação', async () => {
      await request(app)
        .get('/api/admin/reports/dashboard')
        .expect(401);
    });
  });

  describe('GET /api/admin/reports/customers', () => {
    it('deve retornar relatório de clientes', async () => {
      const response = await request(app)
        .get('/api/admin/reports/customers')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('summary');
      expect(response.body).toHaveProperty('demographics');
      expect(response.body).toHaveProperty('acquisition');
      expect(response.body).toHaveProperty('engagement');

      // Verificar estrutura do summary
      expect(response.body.summary).toHaveProperty('total');
      expect(response.body.summary).toHaveProperty('new_this_period');
      expect(response.body.summary).toHaveProperty('growth_rate');

      // Verificar estrutura dos demographics
      expect(response.body.demographics).toHaveProperty('by_age_group');
      expect(response.body.demographics).toHaveProperty('by_gender');

      // Verificar estrutura da acquisition
      expect(response.body.acquisition).toHaveProperty('by_source');
      expect(response.body.acquisition).toHaveProperty('by_month');

      // Verificar estrutura do engagement
      expect(response.body.engagement).toHaveProperty('avg_lifetime_value');
      expect(response.body.engagement).toHaveProperty('avg_orders_per_customer');
      expect(response.body.engagement).toHaveProperty('retention_rate');
    });

    it('deve aceitar filtros específicos', async () => {
      const response = await request(app)
        .get('/api/admin/reports/customers?period=quarter&source=organic&status=active')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('summary');
      expect(response.body).toHaveProperty('demographics');
    });
  });

  describe('GET /api/admin/reports/conversations', () => {
    it('deve retornar relatório de conversas', async () => {
      const response = await request(app)
        .get('/api/admin/reports/conversations')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('summary');
      expect(response.body).toHaveProperty('channels');
      expect(response.body).toHaveProperty('trends');

      // Verificar estrutura do summary
      expect(response.body.summary).toHaveProperty('total');
      expect(response.body.summary).toHaveProperty('resolution_rate');
      expect(response.body.summary).toHaveProperty('avg_response_time_minutes');

      // Verificar estrutura dos channels
      expect(response.body.channels).toHaveProperty('whatsapp');
      expect(response.body.channels).toHaveProperty('email');
      expect(response.body.channels).toHaveProperty('phone');

      // Verificar estrutura das trends
      expect(response.body.trends).toHaveProperty('daily_volume');
      expect(response.body.trends).toHaveProperty('peak_hours');

      // Verificar estrutura de canal específico
      expect(response.body.channels.whatsapp).toHaveProperty('total');
      expect(response.body.channels.whatsapp).toHaveProperty('avg_response_time');
      expect(response.body.channels.whatsapp).toHaveProperty('satisfaction');
    });

    it('deve aceitar filtros de canal e atendente', async () => {
      const response = await request(app)
        .get('/api/admin/reports/conversations?channel=whatsapp&period=week')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('summary');
      expect(response.body).toHaveProperty('channels');
    });
  });

  describe('GET /api/admin/reports/performance', () => {
    it('deve retornar relatório de performance da equipe', async () => {
      const response = await request(app)
        .get('/api/admin/reports/performance')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('summary');
      expect(response.body).toHaveProperty('agents');
      expect(response.body).toHaveProperty('metrics');

      // Verificar estrutura do summary
      expect(response.body.summary).toHaveProperty('total_agents');
      expect(response.body.summary).toHaveProperty('avg_conversations_per_agent');
      expect(response.body.summary).toHaveProperty('avg_satisfaction');

      // Verificar estrutura dos agents
      expect(response.body.agents).toBeInstanceOf(Array);
      
      if (response.body.agents.length > 0) {
        const agent = response.body.agents[0];
        expect(agent).toHaveProperty('id');
        expect(agent).toHaveProperty('name');
        expect(agent).toHaveProperty('conversations_handled');
        expect(agent).toHaveProperty('avg_response_time');
        expect(agent).toHaveProperty('satisfaction_rate');
        expect(agent).toHaveProperty('resolution_rate');
      }

      // Verificar estrutura das metrics
      expect(response.body.metrics).toHaveProperty('best_performer');
      expect(response.body.metrics).toHaveProperty('fastest_responder');
      expect(response.body.metrics).toHaveProperty('highest_satisfaction');
    });

    it('deve aceitar filtros de período e usuário', async () => {
      const response = await request(app)
        .get('/api/admin/reports/performance?period=month')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('summary');
      expect(response.body).toHaveProperty('agents');
    });
  });

  describe('Rate Limiting', () => {
    it('deve aplicar rate limiting após muitas requisições', async () => {
      // Fazer muitas requisições rapidamente
      const requests = Array(60).fill(null).map(() =>
        request(app)
          .get('/api/admin/reports/dashboard')
          .set('Authorization', `Bearer ${authToken}`)
      );

      const responses = await Promise.allSettled(requests);
      
      // Pelo menos uma deve ser rejeitada por rate limiting
      const rateLimitedResponses = responses.filter(
        (result) => result.status === 'fulfilled' && result.value.status === 429
      );

      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    }, 30000); // Timeout maior para este teste
  });

  describe('Authorization', () => {
    let agentToken: string;
    let agentUserId: string;

    beforeAll(async () => {
      // Criar usuário agent (não admin)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: `agent-${Date.now()}@test.com`,
        password: 'test123456'
      });

      if (authError) throw authError;
      agentUserId = authData.user!.id;

      // Criar perfil agent
      await supabase.from('profiles').insert({
        id: agentUserId,
        role: 'agent',
        name: 'Agent Test User'
      });

      // Gerar token de acesso
      const { data: sessionData } = await supabase.auth.signInWithPassword({
        email: `agent-${Date.now()}@test.com`,
        password: 'test123456'
      });

      agentToken = sessionData.session!.access_token;
    });

    afterAll(async () => {
      // Limpar dados do agent
      await supabase.from('profiles').delete().eq('id', agentUserId);
      await supabase.auth.admin.deleteUser(agentUserId);
    });

    it('deve rejeitar acesso de usuário sem permissão admin/manager', async () => {
      await request(app)
        .get('/api/admin/reports/dashboard')
        .set('Authorization', `Bearer ${agentToken}`)
        .expect(403);
    });
  });
});