import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '@/app';
import { supabase } from '@/config/database';

describe('Appointment API Integration Tests', () => {
  let authToken: string;
  let testUserId: string;
  let testCustomerId: string;
  let testAppointmentId: string;

  beforeAll(async () => {
    // Criar usuário de teste
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: `test-appointment-${Date.now()}@test.com`,
      password: 'test123456'
    });

    if (authError) throw authError;
    
    testUserId = authData.user!.id;
    authToken = authData.session!.access_token;

    // Criar cliente de teste
    const { data: customer, error: customerError } = await supabase
      .from('crm_customers')
      .insert({
        name: 'Cliente Teste Agendamento',
        email: `customer-appointment-${Date.now()}@test.com`,
        phone: '+5511999999999'
      })
      .select()
      .single();

    if (customerError) throw customerError;
    testCustomerId = customer.id;
  });

  afterAll(async () => {
    // Limpar dados de teste
    await supabase.from('crm_appointments').delete().eq('customer_id', testCustomerId);
    await supabase.from('crm_customers').delete().eq('id', testCustomerId);
    await supabase.auth.admin.deleteUser(testUserId);
  });

  beforeEach(async () => {
    // Limpar agendamentos antes de cada teste
    await supabase.from('crm_appointments').delete().eq('customer_id', testCustomerId);
  });

  describe('POST /api/appointments', () => {
    it('deve criar agendamento com dados válidos', async () => {
      const appointmentData = {
        customer_id: testCustomerId,
        assigned_to: testUserId,
        title: 'Consulta sobre colchão magnético',
        description: 'Primeira consulta para entender necessidades',
        appointment_type: 'consultation',
        scheduled_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Amanhã
        duration_minutes: 60,
        location: 'Escritório SP'
      };

      const response = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .send(appointmentData)
        .expect(201);

      expect(response.body).toMatchObject({
        customer_id: testCustomerId,
        assigned_to: testUserId,
        title: 'Consulta sobre colchão magnético',
        status: 'scheduled',
        duration_minutes: 60
      });

      expect(response.body.id).toBeDefined();
      expect(response.body.created_at).toBeDefined();
      
      testAppointmentId = response.body.id;
    });

    it('deve rejeitar agendamento com data no passado', async () => {
      const appointmentData = {
        customer_id: testCustomerId,
        assigned_to: testUserId,
        title: 'Consulta teste',
        scheduled_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Ontem
        duration_minutes: 60
      };

      await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .send(appointmentData)
        .expect(400);
    });

    it('deve rejeitar agendamento com customer_id inválido', async () => {
      const appointmentData = {
        customer_id: 'invalid-uuid',
        assigned_to: testUserId,
        title: 'Consulta teste',
        scheduled_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        duration_minutes: 60
      };

      const response = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .send(appointmentData)
        .expect(400);

      expect(response.body.error).toBe('Dados inválidos');
    });

    it('deve detectar conflito de horário', async () => {
      const scheduledTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      // Criar primeiro agendamento
      const firstAppointment = {
        customer_id: testCustomerId,
        assigned_to: testUserId,
        title: 'Primeiro agendamento',
        scheduled_at: scheduledTime,
        duration_minutes: 60
      };

      await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .send(firstAppointment)
        .expect(201);

      // Tentar criar segundo agendamento no mesmo horário
      const conflictingAppointment = {
        customer_id: testCustomerId,
        assigned_to: testUserId,
        title: 'Agendamento conflitante',
        scheduled_at: scheduledTime,
        duration_minutes: 30
      };

      const response = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .send(conflictingAppointment)
        .expect(409);

      expect(response.body.error).toBe('Horário não disponível');
    });
  });

  describe('GET /api/appointments', () => {
    beforeEach(async () => {
      // Criar alguns agendamentos de teste
      const appointments = [
        {
          customer_id: testCustomerId,
          assigned_to: testUserId,
          title: 'Agendamento 1',
          scheduled_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          duration_minutes: 60,
          status: 'scheduled'
        },
        {
          customer_id: testCustomerId,
          assigned_to: testUserId,
          title: 'Agendamento 2',
          scheduled_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
          duration_minutes: 30,
          status: 'completed'
        }
      ];

      await supabase.from('crm_appointments').insert(appointments);
    });

    it('deve listar agendamentos com paginação', async () => {
      const response = await request(app)
        .get('/api/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.pagination).toMatchObject({
        page: 1,
        limit: 10
      });
    });

    it('deve filtrar agendamentos por status', async () => {
      const response = await request(app)
        .get('/api/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ status: 'scheduled' })
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      response.body.data.forEach((appointment: any) => {
        expect(appointment.status).toBe('scheduled');
      });
    });

    it('deve filtrar agendamentos por período', async () => {
      const startDate = new Date().toISOString();
      const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const response = await request(app)
        .get('/api/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ 
          start_date: startDate,
          end_date: endDate
        })
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
    });

    it('deve filtrar agendamentos por usuário atribuído', async () => {
      const response = await request(app)
        .get('/api/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ assigned_to: testUserId })
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      response.body.data.forEach((appointment: any) => {
        expect(appointment.assigned_to).toBe(testUserId);
      });
    });
  });

  describe('GET /api/appointments/:id', () => {
    beforeEach(async () => {
      // Criar agendamento de teste
      const { data } = await supabase
        .from('crm_appointments')
        .insert({
          customer_id: testCustomerId,
          assigned_to: testUserId,
          title: 'Agendamento para busca',
          scheduled_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          duration_minutes: 60
        })
        .select()
        .single();

      testAppointmentId = data.id;
    });

    it('deve buscar agendamento por ID válido', async () => {
      const response = await request(app)
        .get(`/api/appointments/${testAppointmentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: testAppointmentId,
        customer_id: testCustomerId,
        assigned_to: testUserId,
        title: 'Agendamento para busca'
      });
    });

    it('deve retornar 404 para ID inexistente', async () => {
      const fakeId = '123e4567-e89b-12d3-a456-426614174000';
      
      await request(app)
        .get(`/api/appointments/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('deve retornar 400 para ID inválido', async () => {
      await request(app)
        .get('/api/appointments/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });
  });

  describe('PUT /api/appointments/:id', () => {
    beforeEach(async () => {
      // Criar agendamento de teste
      const { data } = await supabase
        .from('crm_appointments')
        .insert({
          customer_id: testCustomerId,
          assigned_to: testUserId,
          title: 'Agendamento para atualização',
          scheduled_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          duration_minutes: 60
        })
        .select()
        .single();

      testAppointmentId = data.id;
    });

    it('deve atualizar agendamento com dados válidos', async () => {
      const updateData = {
        title: 'Título atualizado',
        description: 'Descrição atualizada',
        duration_minutes: 90
      };

      const response = await request(app)
        .put(`/api/appointments/${testAppointmentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject({
        id: testAppointmentId,
        title: 'Título atualizado',
        description: 'Descrição atualizada',
        duration_minutes: 90
      });
    });

    it('deve validar conflito ao alterar horário', async () => {
      // Criar outro agendamento
      const conflictTime = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
      
      await supabase
        .from('crm_appointments')
        .insert({
          customer_id: testCustomerId,
          assigned_to: testUserId,
          title: 'Agendamento conflitante',
          scheduled_at: conflictTime,
          duration_minutes: 60
        });

      // Tentar alterar para o mesmo horário
      const updateData = {
        scheduled_at: conflictTime
      };

      const response = await request(app)
        .put(`/api/appointments/${testAppointmentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(409);

      expect(response.body.error).toBe('Horário não disponível');
    });

    it('deve retornar 404 para agendamento inexistente', async () => {
      const fakeId = '123e4567-e89b-12d3-a456-426614174000';
      
      await request(app)
        .put(`/api/appointments/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: 'Novo título' })
        .expect(404);
    });
  });

  describe('GET /api/appointments/calendar', () => {
    beforeEach(async () => {
      // Criar agendamentos para teste de calendário
      const now = new Date();
      const appointments = [
        {
          customer_id: testCustomerId,
          assigned_to: testUserId,
          title: 'Agendamento Manhã',
          scheduled_at: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
          duration_minutes: 60
        },
        {
          customer_id: testCustomerId,
          assigned_to: testUserId,
          title: 'Agendamento Tarde',
          scheduled_at: new Date(now.getTime() + 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000).toISOString(),
          duration_minutes: 30
        }
      ];

      await supabase.from('crm_appointments').insert(appointments);
    });

    it('deve retornar vista de calendário mensal', async () => {
      const startDate = new Date().toISOString();
      const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      const response = await request(app)
        .get('/api/appointments/calendar')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          start_date: startDate,
          end_date: endDate,
          view: 'month'
        })
        .expect(200);

      expect(response.body).toMatchObject({
        view: 'month',
        period: {
          start: startDate,
          end: endDate
        }
      });

      expect(response.body.appointments).toBeDefined();
      expect(typeof response.body.appointments).toBe('object');
      expect(response.body.total).toBeGreaterThanOrEqual(0);
    });

    it('deve filtrar calendário por usuário', async () => {
      const startDate = new Date().toISOString();
      const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      const response = await request(app)
        .get('/api/appointments/calendar')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          start_date: startDate,
          end_date: endDate,
          assigned_to: testUserId
        })
        .expect(200);

      expect(response.body.appointments).toBeDefined();
    });

    it('deve rejeitar período inválido', async () => {
      await request(app)
        .get('/api/appointments/calendar')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          start_date: 'invalid-date',
          end_date: new Date().toISOString()
        })
        .expect(400);
    });
  });

  describe('GET /api/appointments/availability', () => {
    it('deve verificar disponibilidade para horário livre', async () => {
      const futureDate = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

      const response = await request(app)
        .get('/api/appointments/availability')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          user_id: testUserId,
          date: futureDate,
          duration: 60
        })
        .expect(200);

      expect(response.body).toMatchObject({
        available: true,
        conflicts: []
      });
    });

    it('deve detectar conflito de disponibilidade', async () => {
      const conflictTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      // Criar agendamento
      await supabase
        .from('crm_appointments')
        .insert({
          customer_id: testCustomerId,
          assigned_to: testUserId,
          title: 'Agendamento existente',
          scheduled_at: conflictTime,
          duration_minutes: 60
        });

      const response = await request(app)
        .get('/api/appointments/availability')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          user_id: testUserId,
          date: conflictTime,
          duration: 30
        })
        .expect(200);

      expect(response.body.available).toBe(false);
      expect(response.body.conflicts).toBeInstanceOf(Array);
      expect(response.body.conflicts.length).toBeGreaterThan(0);
    });

    it('deve rejeitar parâmetros inválidos', async () => {
      await request(app)
        .get('/api/appointments/availability')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          user_id: 'invalid-uuid',
          date: new Date().toISOString(),
          duration: 60
        })
        .expect(400);
    });
  });

  describe('PUT /api/appointments/:id/reschedule', () => {
    beforeEach(async () => {
      // Criar agendamento de teste
      const { data } = await supabase
        .from('crm_appointments')
        .insert({
          customer_id: testCustomerId,
          assigned_to: testUserId,
          title: 'Agendamento para reagendar',
          scheduled_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          duration_minutes: 60
        })
        .select()
        .single();

      testAppointmentId = data.id;
    });

    it('deve reagendar para horário disponível', async () => {
      const newDate = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

      const response = await request(app)
        .put(`/api/appointments/${testAppointmentId}/reschedule`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          scheduled_at: newDate,
          duration_minutes: 90
        })
        .expect(200);

      expect(response.body.scheduled_at).toBe(newDate);
      expect(response.body.duration_minutes).toBe(90);
    });

    it('deve rejeitar reagendamento para horário ocupado', async () => {
      const conflictTime = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();

      // Criar agendamento conflitante
      await supabase
        .from('crm_appointments')
        .insert({
          customer_id: testCustomerId,
          assigned_to: testUserId,
          title: 'Agendamento conflitante',
          scheduled_at: conflictTime,
          duration_minutes: 60
        });

      const response = await request(app)
        .put(`/api/appointments/${testAppointmentId}/reschedule`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          scheduled_at: conflictTime
        })
        .expect(409);

      expect(response.body.error).toBe('Horário não disponível');
    });
  });

  describe('PUT /api/appointments/:id/complete', () => {
    beforeEach(async () => {
      // Criar agendamento de teste
      const { data } = await supabase
        .from('crm_appointments')
        .insert({
          customer_id: testCustomerId,
          assigned_to: testUserId,
          title: 'Agendamento para completar',
          scheduled_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hora atrás
          duration_minutes: 60,
          status: 'scheduled'
        })
        .select()
        .single();

      testAppointmentId = data.id;
    });

    it('deve marcar agendamento como concluído', async () => {
      const response = await request(app)
        .put(`/api/appointments/${testAppointmentId}/complete`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          notes: 'Consulta realizada com sucesso'
        })
        .expect(200);

      expect(response.body.status).toBe('completed');
      expect(response.body.notes).toBe('Consulta realizada com sucesso');
    });

    it('deve retornar 404 para agendamento inexistente', async () => {
      const fakeId = '123e4567-e89b-12d3-a456-426614174000';
      
      await request(app)
        .put(`/api/appointments/${fakeId}/complete`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ notes: 'Teste' })
        .expect(404);
    });
  });

  describe('DELETE /api/appointments/:id', () => {
    beforeEach(async () => {
      // Criar agendamento de teste
      const { data } = await supabase
        .from('crm_appointments')
        .insert({
          customer_id: testCustomerId,
          assigned_to: testUserId,
          title: 'Agendamento para cancelar',
          scheduled_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          duration_minutes: 60
        })
        .select()
        .single();

      testAppointmentId = data.id;
    });

    it('deve cancelar agendamento com sucesso', async () => {
      const response = await request(app)
        .delete(`/api/appointments/${testAppointmentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          reason: 'Cliente cancelou'
        })
        .expect(200);

      expect(response.body.message).toBe('Agendamento cancelado com sucesso');

      // Verificar se foi realmente cancelado
      const { data } = await supabase
        .from('crm_appointments')
        .select('status')
        .eq('id', testAppointmentId)
        .single();

      expect(data.status).toBe('cancelled');
    });

    it('deve retornar 404 para agendamento inexistente', async () => {
      const fakeId = '123e4567-e89b-12d3-a456-426614174000';
      
      await request(app)
        .delete(`/api/appointments/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('deve retornar 400 para ID inválido', async () => {
      await request(app)
        .delete('/api/appointments/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });
  });
});