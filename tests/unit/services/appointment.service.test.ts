/**
 * Appointment Service Unit Tests
 * Sprint 5: Sistema de CRM e Gestão de Clientes
 * 
 * Testes unitários para AppointmentService e AppointmentReminderService
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { appointmentService, appointmentReminderService } from '@/services/crm/appointment.service';
import { 
  CreateAppointmentSchema, 
  UpdateAppointmentSchema,
  AppointmentFiltersSchema,
  CalendarViewSchema
} from '@/services/crm/appointment.service';

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
    lt: vi.fn().mockReturnThis(),
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

// Mock dos serviços
const mockTimelineService = {
  recordAppointmentEvent: vi.fn()
};

const mockNotificationService = {
  create: vi.fn()
};

// Mock dos módulos
vi.mock('@/config/supabase', () => ({
  supabase: mockSupabase
}));

vi.mock('@/utils/logger', () => ({
  logger: mockLogger
}));

vi.mock('./timeline.service', () => ({
  timelineService: mockTimelineService
}));

vi.mock('./notification.service', () => ({
  notificationService: mockNotificationService
}));

describe('AppointmentService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('deve criar agendamento com dados válidos', async () => {
      const appointmentData = {
        customer_id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Consulta inicial',
        description: 'Primeira consulta com o cliente',
        appointment_type: 'consultation' as const,
        scheduled_date: '2025-02-01T10:00:00Z',
        duration_minutes: 60,
        assigned_to: '123e4567-e89b-12d3-a456-426614174001',
        priority: 'medium' as const
      };

      const mockCustomer = {
        id: appointmentData.customer_id,
        name: 'João Silva',
        email: 'joao@example.com'
      };

      const mockUser = {
        id: appointmentData.assigned_to,
        name: 'Dr. Maria',
        email: 'maria@example.com'
      };

      const mockAppointment = {
        id: 'appointment-123',
        ...appointmentData,
        status: 'scheduled',
        created_at: '2025-01-25T10:00:00Z'
      };

      // Mock: verificar se cliente existe
      mockSupabase.from().select().eq().is().single.mockResolvedValueOnce({
        data: mockCustomer,
        error: null
      });

      // Mock: verificar se usuário existe
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: mockUser,
        error: null
      });

      // Mock: verificar conflitos (sem conflitos)
      vi.spyOn(appointmentService as any, 'checkTimeConflict').mockResolvedValueOnce(false);

      // Mock: inserir agendamento
      mockSupabase.from().insert().select().single.mockResolvedValueOnce({
        data: mockAppointment,
        error: null
      });

      const result = await appointmentService.create(appointmentData);

      expect(result).toEqual(mockAppointment);
      expect(mockTimelineService.recordAppointmentEvent).toHaveBeenCalledWith(
        appointmentData.customer_id,
        'appointment_scheduled',
        mockAppointment.id,
        expect.objectContaining({
          appointment_type: appointmentData.appointment_type,
          scheduled_date: appointmentData.scheduled_date
        })
      );
      expect(mockNotificationService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: appointmentData.assigned_to,
          type: 'appointment_created',
          title: 'Novo agendamento criado'
        })
      );
    });

    it('deve rejeitar criação com cliente inexistente', async () => {
      const appointmentData = {
        customer_id: 'inexistente',
        title: 'Consulta',
        appointment_type: 'consultation' as const,
        scheduled_date: '2025-02-01T10:00:00Z',
        assigned_to: '123e4567-e89b-12d3-a456-426614174001'
      };

      // Mock: cliente não existe
      mockSupabase.from().select().eq().is().single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' }
      });

      await expect(appointmentService.create(appointmentData)).rejects.toThrow(
        'Cliente inexistente não encontrado'
      );
    });

    it('deve rejeitar criação com usuário inexistente', async () => {
      const appointmentData = {
        customer_id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Consulta',
        appointment_type: 'consultation' as const,
        scheduled_date: '2025-02-01T10:00:00Z',
        assigned_to: 'inexistente'
      };

      const mockCustomer = {
        id: appointmentData.customer_id,
        name: 'João Silva'
      };

      // Mock: cliente existe
      mockSupabase.from().select().eq().is().single.mockResolvedValueOnce({
        data: mockCustomer,
        error: null
      });

      // Mock: usuário não existe
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' }
      });

      await expect(appointmentService.create(appointmentData)).rejects.toThrow(
        'Usuário inexistente não encontrado'
      );
    });

    it('deve rejeitar criação com conflito de horário', async () => {
      const appointmentData = {
        customer_id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Consulta',
        appointment_type: 'consultation' as const,
        scheduled_date: '2025-02-01T10:00:00Z',
        assigned_to: '123e4567-e89b-12d3-a456-426614174001'
      };

      const mockCustomer = { id: appointmentData.customer_id };
      const mockUser = { id: appointmentData.assigned_to };

      // Mock: cliente e usuário existem
      mockSupabase.from().select().eq().is().single.mockResolvedValueOnce({
        data: mockCustomer,
        error: null
      });
      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: mockUser,
        error: null
      });

      // Mock: conflito de horário
      vi.spyOn(appointmentService as any, 'checkTimeConflict').mockResolvedValueOnce(true);

      await expect(appointmentService.create(appointmentData)).rejects.toThrow(
        'Conflito de horário detectado. Já existe um agendamento neste período.'
      );
    });

    it('deve validar data futura', async () => {
      const invalidData = {
        customer_id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Consulta',
        appointment_type: 'consultation',
        scheduled_date: '2020-01-01T10:00:00Z', // Data no passado
        assigned_to: '123e4567-e89b-12d3-a456-426614174001'
      };

      await expect(appointmentService.create(invalidData as any)).rejects.toThrow();
    });
  });

  describe('getById', () => {
    it('deve retornar agendamento com detalhes completos', async () => {
      const appointmentId = 'appointment-123';
      const mockAppointment = {
        id: appointmentId,
        customer_id: 'customer-123',
        title: 'Consulta inicial',
        scheduled_date: '2025-02-01T10:00:00Z',
        duration_minutes: 60,
        status: 'scheduled',
        customer: {
          id: 'customer-123',
          name: 'João Silva',
          email: 'joao@example.com',
          phone: '+5511999999999'
        },
        assigned_user: {
          id: 'user-123',
          name: 'Dr. Maria',
          email: 'maria@example.com'
        }
      };

      // Mock: buscar agendamento
      mockSupabase.from().select().eq().is().single.mockResolvedValueOnce({
        data: mockAppointment,
        error: null
      });

      const result = await appointmentService.getById(appointmentId);

      expect(result).toEqual({
        ...mockAppointment,
        end_date: '2025-02-01T11:00:00.000Z', // scheduled_date + 60 minutes
        is_past: false,
        can_reschedule: true
      });
    });

    it('deve retornar null para agendamento não encontrado', async () => {
      const appointmentId = 'inexistente';

      mockSupabase.from().select().eq().is().single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' }
      });

      const result = await appointmentService.getById(appointmentId);

      expect(result).toBeNull();
    });

    it('deve calcular campos derivados corretamente', async () => {
      const appointmentId = 'appointment-123';
      const pastDate = new Date();
      pastDate.setHours(pastDate.getHours() - 2); // 2 horas atrás

      const mockAppointment = {
        id: appointmentId,
        scheduled_date: pastDate.toISOString(),
        duration_minutes: 30,
        status: 'completed'
      };

      mockSupabase.from().select().eq().is().single.mockResolvedValueOnce({
        data: mockAppointment,
        error: null
      });

      const result = await appointmentService.getById(appointmentId);

      expect(result?.is_past).toBe(true);
      expect(result?.can_reschedule).toBe(false); // Não pode reagendar se já passou ou não está scheduled
    });
  });

  describe('update', () => {
    it('deve atualizar agendamento existente', async () => {
      const updateData = {
        id: 'appointment-123',
        title: 'Consulta atualizada',
        status: 'confirmed' as const
      };

      const existingAppointment = {
        id: 'appointment-123',
        title: 'Consulta inicial',
        status: 'scheduled',
        customer_id: 'customer-123'
      };

      const updatedAppointment = {
        ...existingAppointment,
        ...updateData
      };

      // Mock: verificar se agendamento existe
      vi.spyOn(appointmentService, 'getById').mockResolvedValueOnce(existingAppointment as any);

      // Mock: atualizar agendamento
      mockSupabase.from().update().eq().select().single.mockResolvedValueOnce({
        data: updatedAppointment,
        error: null
      });

      const result = await appointmentService.update(updateData);

      expect(result).toEqual(updatedAppointment);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Agendamento atualizado com sucesso',
        { id: updateData.id, status: updatedAppointment.status }
      );
    });

    it('deve verificar conflitos ao alterar data/hora', async () => {
      const updateData = {
        id: 'appointment-123',
        scheduled_date: '2025-02-01T14:00:00Z',
        duration_minutes: 90
      };

      const existingAppointment = {
        id: 'appointment-123',
        scheduled_date: '2025-02-01T10:00:00Z',
        duration_minutes: 60,
        assigned_to: 'user-123'
      };

      // Mock: agendamento existe
      vi.spyOn(appointmentService, 'getById').mockResolvedValueOnce(existingAppointment as any);

      // Mock: conflito de horário
      vi.spyOn(appointmentService as any, 'checkTimeConflict').mockResolvedValueOnce(true);

      await expect(appointmentService.update(updateData)).rejects.toThrow(
        'Conflito de horário detectado. Já existe um agendamento neste período.'
      );
    });

    it('deve registrar evento na timeline ao completar agendamento', async () => {
      const updateData = {
        id: 'appointment-123',
        status: 'completed' as const
      };

      const existingAppointment = {
        id: 'appointment-123',
        status: 'scheduled',
        customer_id: 'customer-123'
      };

      const updatedAppointment = {
        ...existingAppointment,
        ...updateData,
        appointment_type: 'consultation',
        duration_minutes: 60
      };

      // Mock: agendamento existe
      vi.spyOn(appointmentService, 'getById').mockResolvedValueOnce(existingAppointment as any);

      // Mock: atualizar agendamento
      mockSupabase.from().update().eq().select().single.mockResolvedValueOnce({
        data: updatedAppointment,
        error: null
      });

      await appointmentService.update(updateData);

      expect(mockTimelineService.recordAppointmentEvent).toHaveBeenCalledWith(
        updatedAppointment.customer_id,
        'appointment_completed',
        updatedAppointment.id,
        expect.objectContaining({
          appointment_type: updatedAppointment.appointment_type,
          completed_date: expect.any(String)
        })
      );
    });
  });

  describe('cancel', () => {
    it('deve cancelar agendamento com sucesso', async () => {
      const appointmentId = 'appointment-123';
      const reason = 'Cliente cancelou';
      const cancelledBy = 'user-123';

      // Mock: update method
      vi.spyOn(appointmentService, 'update').mockResolvedValueOnce({} as any);

      await appointmentService.cancel(appointmentId, reason, cancelledBy);

      expect(appointmentService.update).toHaveBeenCalledWith({
        id: appointmentId,
        status: 'cancelled',
        metadata: {
          cancellation_reason: reason,
          cancelled_by: cancelledBy,
          cancelled_at: expect.any(String)
        }
      });
    });
  });

  describe('reschedule', () => {
    it('deve reagendar agendamento com sucesso', async () => {
      const appointmentId = 'appointment-123';
      const newScheduledDate = '2025-02-02T10:00:00Z';
      const rescheduledBy = 'user-123';

      const existingAppointment = {
        id: appointmentId,
        scheduled_date: '2025-02-01T10:00:00Z',
        can_reschedule: true,
        assigned_to: 'user-123',
        title: 'Consulta',
        priority: 'medium',
        metadata: {}
      };

      const updatedAppointment = {
        ...existingAppointment,
        scheduled_date: newScheduledDate
      };

      // Mock: buscar agendamento existente
      vi.spyOn(appointmentService, 'getById').mockResolvedValueOnce(existingAppointment as any);

      // Mock: atualizar agendamento
      vi.spyOn(appointmentService, 'update').mockResolvedValueOnce(updatedAppointment as any);

      const result = await appointmentService.reschedule(appointmentId, newScheduledDate, undefined, rescheduledBy);

      expect(appointmentService.update).toHaveBeenCalledWith({
        id: appointmentId,
        scheduled_date: newScheduledDate,
        duration_minutes: undefined,
        status: 'scheduled',
        metadata: {
          rescheduled_from: existingAppointment.scheduled_date,
          rescheduled_by: rescheduledBy,
          rescheduled_at: expect.any(String)
        }
      });

      expect(mockNotificationService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: existingAppointment.assigned_to,
          title: 'Agendamento reagendado'
        })
      );

      expect(result).toEqual(updatedAppointment);
    });

    it('deve rejeitar reagendamento de agendamento que não pode ser reagendado', async () => {
      const appointmentId = 'appointment-123';
      const newScheduledDate = '2025-02-02T10:00:00Z';

      const existingAppointment = {
        id: appointmentId,
        can_reschedule: false // Não pode reagendar
      };

      // Mock: buscar agendamento existente
      vi.spyOn(appointmentService, 'getById').mockResolvedValueOnce(existingAppointment as any);

      await expect(appointmentService.reschedule(appointmentId, newScheduledDate)).rejects.toThrow(
        'Este agendamento não pode ser reagendado'
      );
    });
  });

  describe('list', () => {
    it('deve listar agendamentos com filtros', async () => {
      const filters = {
        assigned_to: 'user-123',
        status: 'scheduled' as const,
        appointment_type: 'consultation' as const
      };

      const mockAppointments = [
        {
          id: 'appointment-1',
          title: 'Consulta 1',
          scheduled_date: '2025-02-01T10:00:00Z',
          duration_minutes: 60,
          status: 'scheduled',
          customer: { name: 'João Silva' },
          assigned_user: { name: 'Dr. Maria' }
        },
        {
          id: 'appointment-2',
          title: 'Consulta 2',
          scheduled_date: '2025-02-01T14:00:00Z',
          duration_minutes: 30,
          status: 'scheduled',
          customer: { name: 'Maria Santos' },
          assigned_user: { name: 'Dr. Maria' }
        }
      ];

      // Mock: buscar agendamentos
      mockSupabase.from().select().is().eq().eq().eq().order().range.mockResolvedValueOnce({
        data: mockAppointments,
        error: null,
        count: 2
      });

      const result = await appointmentService.list(filters);

      expect(result.data).toHaveLength(2);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 2,
        total_pages: 1,
        has_next: false,
        has_prev: false
      });

      // Verificar campos calculados
      expect(result.data[0]).toEqual({
        ...mockAppointments[0],
        end_date: '2025-02-01T11:00:00.000Z',
        is_past: false,
        can_reschedule: true
      });
    });

    it('deve aplicar busca textual', async () => {
      const filters = {
        search: 'consulta inicial'
      };

      mockSupabase.from().select().is().or().order().range.mockResolvedValueOnce({
        data: [],
        error: null,
        count: 0
      });

      await appointmentService.list(filters);

      expect(mockSupabase.from().or).toHaveBeenCalledWith(
        'title.ilike.%consulta inicial%,description.ilike.%consulta inicial%'
      );
    });
  });

  describe('checkTimeConflict', () => {
    it('deve detectar conflito de horário', async () => {
      const assignedTo = 'user-123';
      const scheduledDate = '2025-02-01T10:00:00Z';
      const durationMinutes = 60;

      const existingAppointments = [
        {
          id: 'existing-1',
          scheduled_date: '2025-02-01T09:30:00Z',
          duration_minutes: 60 // Termina às 10:30, sobrepõe com 10:00-11:00
        }
      ];

      // Mock: buscar agendamentos existentes
      mockSupabase.from().select().eq().in().is().mockResolvedValueOnce({
        data: existingAppointments,
        error: null
      });

      const hasConflict = await (appointmentService as any).checkTimeConflict(
        assignedTo, scheduledDate, durationMinutes
      );

      expect(hasConflict).toBe(true);
    });

    it('deve não detectar conflito quando não há sobreposição', async () => {
      const assignedTo = 'user-123';
      const scheduledDate = '2025-02-01T10:00:00Z';
      const durationMinutes = 60;

      const existingAppointments = [
        {
          id: 'existing-1',
          scheduled_date: '2025-02-01T08:00:00Z',
          duration_minutes: 60 // Termina às 09:00, não sobrepõe com 10:00-11:00
        }
      ];

      // Mock: buscar agendamentos existentes
      mockSupabase.from().select().eq().in().is().mockResolvedValueOnce({
        data: existingAppointments,
        error: null
      });

      const hasConflict = await (appointmentService as any).checkTimeConflict(
        assignedTo, scheduledDate, durationMinutes
      );

      expect(hasConflict).toBe(false);
    });

    it('deve excluir agendamento específico da verificação', async () => {
      const assignedTo = 'user-123';
      const scheduledDate = '2025-02-01T10:00:00Z';
      const durationMinutes = 60;
      const excludeAppointmentId = 'appointment-123';

      // Mock: buscar agendamentos (com exclusão)
      mockSupabase.from().select().eq().in().is().neq.mockResolvedValueOnce({
        data: [],
        error: null
      });

      await (appointmentService as any).checkTimeConflict(
        assignedTo, scheduledDate, durationMinutes, excludeAppointmentId
      );

      expect(mockSupabase.from().neq).toHaveBeenCalledWith('id', excludeAppointmentId);
    });
  });
});

describe('AppointmentReminderService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAppointmentsNeedingReminder', () => {
    it('deve buscar agendamentos que precisam de lembrete', async () => {
      const now = new Date();
      const futureDate = new Date(now.getTime() + 25 * 60000); // 25 minutos no futuro
      
      const mockAppointments = [
        {
          id: 'appointment-1',
          scheduled_date: futureDate.toISOString(),
          reminder_minutes: 30, // Lembrete 30 min antes
          reminder_sent: false
        }
      ];

      // Mock: buscar agendamentos
      mockSupabase.from().select().in().eq().is().gte.mockResolvedValueOnce({
        data: mockAppointments,
        error: null
      });

      const result = await appointmentReminderService.getAppointmentsNeedingReminder();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('appointment-1');
    });

    it('deve filtrar agendamentos fora do período de lembrete', async () => {
      const now = new Date();
      const futureDate = new Date(now.getTime() + 45 * 60000); // 45 minutos no futuro
      
      const mockAppointments = [
        {
          id: 'appointment-1',
          scheduled_date: futureDate.toISOString(),
          reminder_minutes: 30, // Lembrete 30 min antes (ainda não é hora)
          reminder_sent: false
        }
      ];

      // Mock: buscar agendamentos
      mockSupabase.from().select().in().eq().is().gte.mockResolvedValueOnce({
        data: mockAppointments,
        error: null
      });

      const result = await appointmentReminderService.getAppointmentsNeedingReminder();

      expect(result).toHaveLength(0); // Não deve incluir pois ainda não é hora do lembrete
    });
  });

  describe('sendReminder', () => {
    it('deve enviar lembrete de agendamento', async () => {
      const appointmentId = 'appointment-123';
      const futureDate = new Date();
      futureDate.setMinutes(futureDate.getMinutes() + 30);

      const mockAppointment = {
        id: appointmentId,
        title: 'Consulta inicial',
        scheduled_date: futureDate.toISOString(),
        assigned_to: 'user-123',
        priority: 'medium',
        reminder_sent: false,
        customer: {
          name: 'João Silva'
        },
        metadata: {}
      };

      // Mock: buscar agendamento
      vi.spyOn(appointmentReminderService, 'getById').mockResolvedValueOnce(mockAppointment as any);

      // Mock: atualizar reminder_sent
      mockSupabase.from().update().eq.mockResolvedValueOnce({
        error: null
      });

      await appointmentReminderService.sendReminder(appointmentId);

      expect(mockNotificationService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: mockAppointment.assigned_to,
          type: 'appointment_reminder',
          title: 'Lembrete de agendamento',
          priority: 'high'
        })
      );

      expect(mockSupabase.from().update).toHaveBeenCalledWith({
        reminder_sent: true,
        metadata: {
          reminder_sent_at: expect.any(String)
        }
      });
    });

    it('deve pular lembrete se já foi enviado', async () => {
      const appointmentId = 'appointment-123';
      const mockAppointment = {
        id: appointmentId,
        reminder_sent: true // Já foi enviado
      };

      // Mock: buscar agendamento
      vi.spyOn(appointmentReminderService, 'getById').mockResolvedValueOnce(mockAppointment as any);

      await appointmentReminderService.sendReminder(appointmentId);

      expect(mockNotificationService.create).not.toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Lembrete já foi enviado',
        { appointmentId }
      );
    });
  });

  describe('processReminders', () => {
    it('deve processar todos os lembretes pendentes', async () => {
      const mockAppointments = [
        { id: 'appointment-1' },
        { id: 'appointment-2' },
        { id: 'appointment-3' }
      ];

      // Mock: buscar agendamentos que precisam de lembrete
      vi.spyOn(appointmentReminderService, 'getAppointmentsNeedingReminder')
        .mockResolvedValueOnce(mockAppointments as any);

      // Mock: sendReminder - 2 sucessos, 1 erro
      vi.spyOn(appointmentReminderService, 'sendReminder')
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Erro ao enviar'));

      const result = await appointmentReminderService.processReminders();

      expect(result).toEqual({ sent: 2, errors: 1 });
      expect(appointmentReminderService.sendReminder).toHaveBeenCalledTimes(3);
    });
  });

  describe('getCalendarView', () => {
    it('deve retornar eventos de calendário', async () => {
      const params = {
        start_date: '2025-02-01T00:00:00Z',
        end_date: '2025-02-07T23:59:59Z',
        view_type: 'week' as const
      };

      const mockAppointments = [
        {
          id: 'appointment-1',
          title: 'Consulta 1',
          scheduled_date: '2025-02-01T10:00:00Z',
          duration_minutes: 60,
          appointment_type: 'consultation',
          status: 'scheduled',
          priority: 'medium',
          location_type: 'video_call',
          assigned_to: 'user-123',
          customer: { name: 'João Silva' }
        }
      ];

      // Mock: buscar agendamentos
      mockSupabase.from().select().gte().lte().is().order.mockResolvedValueOnce({
        data: mockAppointments,
        error: null
      });

      const result = await appointmentReminderService.getCalendarView(params);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'appointment-1',
        title: 'Consulta 1',
        start: '2025-02-01T10:00:00Z',
        end: '2025-02-01T11:00:00.000Z',
        type: 'consultation',
        status: 'scheduled',
        priority: 'medium',
        customer_name: 'João Silva',
        assigned_to: 'user-123',
        location_type: 'video_call',
        can_reschedule: true
      });
    });

    it('deve filtrar por usuário quando especificado', async () => {
      const params = {
        assigned_to: 'user-123',
        start_date: '2025-02-01T00:00:00Z',
        end_date: '2025-02-07T23:59:59Z'
      };

      mockSupabase.from().select().gte().lte().is().eq().order.mockResolvedValueOnce({
        data: [],
        error: null
      });

      await appointmentReminderService.getCalendarView(params);

      expect(mockSupabase.from().eq).toHaveBeenCalledWith('assigned_to', 'user-123');
    });
  });

  describe('getUserAvailability', () => {
    it('deve calcular disponibilidade do usuário', async () => {
      const userId = 'user-123';
      const date = '2025-02-01';
      const workingHours = { start: '09:00', end: '12:00' }; // 3 horas = 6 slots de 30min

      const existingAppointments = [
        {
          scheduled_date: '2025-02-01T10:00:00Z',
          duration_minutes: 60 // Ocupa 10:00-11:00
        }
      ];

      // Mock: buscar agendamentos existentes
      mockSupabase.from().select().eq().gte().lte().in().is().order.mockResolvedValueOnce({
        data: existingAppointments,
        error: null
      });

      const result = await appointmentReminderService.getUserAvailability(userId, date, workingHours);

      expect(result).toHaveLength(6); // 6 slots de 30 minutos
      
      // Primeiro slot (09:00-09:30) deve estar disponível
      expect(result[0]).toEqual({
        start: '2025-02-01T09:00:00.000Z',
        end: '2025-02-01T09:30:00.000Z',
        available: true
      });

      // Slots que conflitam com agendamento (10:00-11:00) devem estar indisponíveis
      const conflictSlots = result.filter(slot => 
        slot.start >= '2025-02-01T10:00:00.000Z' && 
        slot.start < '2025-02-01T11:00:00.000Z'
      );
      expect(conflictSlots.every(slot => !slot.available)).toBe(true);
    });
  });

  describe('getAppointmentStats', () => {
    it('deve calcular estatísticas de agendamentos', async () => {
      const userId = 'user-123';

      // Mock: total
      mockSupabase.from().select().is().eq().mockReturnValueOnce({
        count: vi.fn().mockResolvedValueOnce({ count: 50 })
      });

      // Mock: por status
      mockSupabase.from().select().is().eq().mockResolvedValueOnce({
        data: [
          { status: 'scheduled' },
          { status: 'scheduled' },
          { status: 'completed' }
        ],
        error: null
      });

      // Mock: por tipo
      mockSupabase.from().select().is().eq().mockResolvedValueOnce({
        data: [
          { appointment_type: 'consultation' },
          { appointment_type: 'follow_up' }
        ],
        error: null
      });

      // Mock: contadores por período
      mockSupabase.from().select().is().eq().gte().lt().mockReturnValue({
        count: vi.fn().mockResolvedValue({ count: 5 })
      });

      const result = await appointmentReminderService.getAppointmentStats(userId);

      expect(result).toEqual({
        total: 50,
        by_status: {
          scheduled: 2,
          completed: 1
        },
        by_type: {
          consultation: 1,
          follow_up: 1
        },
        today: 5,
        this_week: 5,
        this_month: 5,
        upcoming: 5,
        overdue: 5
      });
    });
  });
});

describe('Schemas de Validação', () => {
  describe('CreateAppointmentSchema', () => {
    it('deve validar dados corretos', () => {
      const validData = {
        customer_id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Consulta inicial',
        appointment_type: 'consultation',
        scheduled_date: '2025-02-01T10:00:00Z',
        assigned_to: '123e4567-e89b-12d3-a456-426614174001'
      };

      const result = CreateAppointmentSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('deve rejeitar data no passado', () => {
      const invalidData = {
        customer_id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Consulta',
        appointment_type: 'consultation',
        scheduled_date: '2020-01-01T10:00:00Z', // Passado
        assigned_to: '123e4567-e89b-12d3-a456-426614174001'
      };

      const result = CreateAppointmentSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('deve rejeitar duração inválida', () => {
      const invalidData = {
        customer_id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Consulta',
        appointment_type: 'consultation',
        scheduled_date: '2025-02-01T10:00:00Z',
        duration_minutes: 10, // Menos que 15 min
        assigned_to: '123e4567-e89b-12d3-a456-426614174001'
      };

      const result = CreateAppointmentSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('deve definir valores padrão', () => {
      const minimalData = {
        customer_id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Consulta',
        appointment_type: 'consultation',
        scheduled_date: '2025-02-01T10:00:00Z',
        assigned_to: '123e4567-e89b-12d3-a456-426614174001'
      };

      const result = CreateAppointmentSchema.safeParse(minimalData);
      expect(result.success).toBe(true);
      expect(result.data?.duration_minutes).toBe(60);
      expect(result.data?.location_type).toBe('video_call');
      expect(result.data?.priority).toBe('medium');
      expect(result.data?.reminder_minutes).toBe(30);
    });
  });

  describe('CalendarViewSchema', () => {
    it('deve validar vista de calendário', () => {
      const validData = {
        start_date: '2025-02-01T00:00:00Z',
        end_date: '2025-02-07T23:59:59Z',
        view_type: 'week'
      };

      const result = CalendarViewSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('deve definir view_type padrão', () => {
      const minimalData = {
        start_date: '2025-02-01T00:00:00Z',
        end_date: '2025-02-07T23:59:59Z'
      };

      const result = CalendarViewSchema.safeParse(minimalData);
      expect(result.success).toBe(true);
      expect(result.data?.view_type).toBe('week');
    });
  });
});