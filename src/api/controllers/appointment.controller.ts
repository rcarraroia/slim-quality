import { Request, Response } from 'express';
import { z } from 'zod';
import { AppointmentService } from '@/services/crm/appointment.service';
import { Logger } from '@/utils/logger';

// Schemas de validação
const CreateAppointmentSchema = z.object({
  customer_id: z.string().uuid('ID do cliente deve ser um UUID válido'),
  assigned_to: z.string().uuid('ID do usuário deve ser um UUID válido'),
  title: z.string().min(3, 'Título deve ter pelo menos 3 caracteres').max(255),
  description: z.string().optional(),
  appointment_type: z.string().max(50).optional(),
  scheduled_at: z.string().datetime('Data deve estar no formato ISO'),
  duration_minutes: z.number().int().min(15).max(480).default(60),
  location: z.string().max(255).optional(),
  meeting_url: z.string().url().optional(),
  notes: z.string().optional()
});

const UpdateAppointmentSchema = CreateAppointmentSchema.partial().omit({
  customer_id: true
});

const AppointmentFiltersSchema = z.object({
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  assigned_to: z.string().uuid().optional(),
  customer_id: z.string().uuid().optional(),
  status: z.enum(['scheduled', 'completed', 'cancelled', 'no_show']).optional(),
  appointment_type: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

const CalendarFiltersSchema = z.object({
  start_date: z.string().datetime('Data inicial obrigatória'),
  end_date: z.string().datetime('Data final obrigatória'),
  assigned_to: z.string().uuid().optional(),
  view: z.enum(['month', 'week', 'day']).default('month')
});

const AvailabilitySchema = z.object({
  user_id: z.string().uuid('ID do usuário obrigatório'),
  date: z.string().datetime('Data obrigatória'),
  duration: z.coerce.number().int().min(15).max(480).default(60)
});

export class AppointmentController {
  private appointmentService: AppointmentService;

  constructor() {
    this.appointmentService = new AppointmentService();
  }

  /**
   * GET /api/appointments
   * Lista agendamentos com filtros
   */
  async list(req: Request, res: Response) {
    try {
      const filters = AppointmentFiltersSchema.parse(req.query);
      
      Logger.info('AppointmentController', 'Listando agendamentos', {
        filters,
        user_id: req.user?.id
      });

      const result = await this.appointmentService.findMany(filters);

      res.json({
        data: result.appointments,
        pagination: {
          page: filters.page,
          limit: filters.limit,
          total: result.total,
          pages: Math.ceil(result.total / filters.limit)
        }
      });

    } catch (error) {
      Logger.error('AppointmentController', 'Erro ao listar agendamentos', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Dados inválidos',
          details: error.issues
        });
      }

      res.status(500).json({
        error: 'Erro interno do servidor'
      });
    }
  }

  /**
   * GET /api/appointments/:id
   * Busca agendamento por ID
   */
  async findById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!id || !z.string().uuid().safeParse(id).success) {
        return res.status(400).json({
          error: 'ID do agendamento inválido'
        });
      }

      Logger.info('AppointmentController', 'Buscando agendamento por ID', {
        appointment_id: id,
        user_id: req.user?.id
      });

      const appointment = await this.appointmentService.findById(id);

      if (!appointment) {
        return res.status(404).json({
          error: 'Agendamento não encontrado'
        });
      }

      res.json(appointment);

    } catch (error) {
      Logger.error('AppointmentController', 'Erro ao buscar agendamento', error);
      res.status(500).json({
        error: 'Erro interno do servidor'
      });
    }
  }

  /**
   * POST /api/appointments
   * Criar novo agendamento
   */
  async create(req: Request, res: Response) {
    try {
      const data = CreateAppointmentSchema.parse(req.body);

      Logger.info('AppointmentController', 'Criando agendamento', {
        data: { ...data, notes: data.notes ? '[REDACTED]' : undefined },
        user_id: req.user?.id
      });

      // Verificar disponibilidade antes de criar
      const scheduledDate = new Date(data.scheduled_at);
      const isAvailable = await this.appointmentService.checkAvailability(
        data.assigned_to,
        scheduledDate,
        data.duration_minutes
      );

      if (!isAvailable) {
        return res.status(409).json({
          error: 'Horário não disponível',
          message: 'Já existe um agendamento neste horário'
        });
      }

      const appointment = await this.appointmentService.create(data);

      Logger.info('AppointmentController', 'Agendamento criado com sucesso', {
        appointment_id: appointment.id,
        customer_id: data.customer_id
      });

      res.status(201).json(appointment);

    } catch (error) {
      Logger.error('AppointmentController', 'Erro ao criar agendamento', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Dados inválidos',
          details: error.issues
        });
      }

      if (error instanceof Error) {
        if (error.message.includes('Cliente não encontrado')) {
          return res.status(404).json({
            error: 'Cliente não encontrado'
          });
        }
        
        if (error.message.includes('Usuário não encontrado')) {
          return res.status(404).json({
            error: 'Usuário não encontrado'
          });
        }
      }

      res.status(500).json({
        error: 'Erro interno do servidor'
      });
    }
  }

  /**
   * PUT /api/appointments/:id
   * Atualizar agendamento
   */
  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = UpdateAppointmentSchema.parse(req.body);

      if (!id || !z.string().uuid().safeParse(id).success) {
        return res.status(400).json({
          error: 'ID do agendamento inválido'
        });
      }

      Logger.info('AppointmentController', 'Atualizando agendamento', {
        appointment_id: id,
        data: { ...data, notes: data.notes ? '[REDACTED]' : undefined },
        user_id: req.user?.id
      });

      // Se está alterando data/hora, verificar disponibilidade
      if (data.scheduled_at || data.duration_minutes) {
        const currentAppointment = await this.appointmentService.findById(id);
        
        if (!currentAppointment) {
          return res.status(404).json({
            error: 'Agendamento não encontrado'
          });
        }

        const newDate = data.scheduled_at ? new Date(data.scheduled_at) : new Date(currentAppointment.scheduled_at);
        const newDuration = data.duration_minutes || currentAppointment.duration_minutes;
        const assignedTo = currentAppointment.assigned_to;

        const isAvailable = await this.appointmentService.checkAvailability(
          assignedTo,
          newDate,
          newDuration,
          id // Excluir o próprio agendamento da verificação
        );

        if (!isAvailable) {
          return res.status(409).json({
            error: 'Horário não disponível',
            message: 'Já existe um agendamento neste horário'
          });
        }
      }

      const appointment = await this.appointmentService.update(id, data);

      if (!appointment) {
        return res.status(404).json({
          error: 'Agendamento não encontrado'
        });
      }

      Logger.info('AppointmentController', 'Agendamento atualizado com sucesso', {
        appointment_id: id
      });

      res.json(appointment);

    } catch (error) {
      Logger.error('AppointmentController', 'Erro ao atualizar agendamento', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Dados inválidos',
          details: error.issues
        });
      }

      res.status(500).json({
        error: 'Erro interno do servidor'
      });
    }
  }

  /**
   * DELETE /api/appointments/:id
   * Cancelar agendamento
   */
  async cancel(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      if (!id || !z.string().uuid().safeParse(id).success) {
        return res.status(400).json({
          error: 'ID do agendamento inválido'
        });
      }

      Logger.info('AppointmentController', 'Cancelando agendamento', {
        appointment_id: id,
        reason,
        user_id: req.user?.id
      });

      const success = await this.appointmentService.cancel(id, reason);

      if (!success) {
        return res.status(404).json({
          error: 'Agendamento não encontrado'
        });
      }

      Logger.info('AppointmentController', 'Agendamento cancelado com sucesso', {
        appointment_id: id
      });

      res.json({
        message: 'Agendamento cancelado com sucesso'
      });

    } catch (error) {
      Logger.error('AppointmentController', 'Erro ao cancelar agendamento', error);
      res.status(500).json({
        error: 'Erro interno do servidor'
      });
    }
  }

  /**
   * GET /api/appointments/calendar
   * Vista de calendário
   */
  async calendar(req: Request, res: Response) {
    try {
      const filters = CalendarFiltersSchema.parse(req.query);

      Logger.info('AppointmentController', 'Buscando vista de calendário', {
        filters,
        user_id: req.user?.id
      });

      const appointments = await this.appointmentService.findByDateRange(
        new Date(filters.start_date),
        new Date(filters.end_date),
        filters.assigned_to
      );

      // Organizar por data para facilitar renderização do calendário
      const calendarData = appointments.reduce((acc, appointment) => {
        const date = appointment.scheduled_at.toISOString().split('T')[0];
        
        if (!acc[date]) {
          acc[date] = [];
        }
        
        acc[date].push({
          id: appointment.id,
          title: appointment.title,
          time: appointment.scheduled_at.toISOString().split('T')[1].substring(0, 5),
          duration: appointment.duration_minutes,
          status: appointment.status,
          customer_name: appointment.customer?.name,
          appointment_type: appointment.appointment_type
        });
        
        return acc;
      }, {} as Record<string, any[]>);

      res.json({
        view: filters.view,
        period: {
          start: filters.start_date,
          end: filters.end_date
        },
        appointments: calendarData,
        total: appointments.length
      });

    } catch (error) {
      Logger.error('AppointmentController', 'Erro ao buscar calendário', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Dados inválidos',
          details: error.issues
        });
      }

      res.status(500).json({
        error: 'Erro interno do servidor'
      });
    }
  }

  /**
   * GET /api/appointments/availability
   * Verificar disponibilidade
   */
  async checkAvailability(req: Request, res: Response) {
    try {
      const params = AvailabilitySchema.parse(req.query);

      Logger.info('AppointmentController', 'Verificando disponibilidade', {
        params,
        user_id: req.user?.id
      });

      const isAvailable = await this.appointmentService.checkAvailability(
        params.user_id,
        new Date(params.date),
        params.duration
      );

      // Buscar conflitos para informar ao usuário
      const conflicts = isAvailable ? [] : await this.appointmentService.findConflicts(
        params.user_id,
        new Date(params.date),
        params.duration
      );

      res.json({
        available: isAvailable,
        conflicts: conflicts.map(conflict => ({
          id: conflict.id,
          title: conflict.title,
          scheduled_at: conflict.scheduled_at,
          duration_minutes: conflict.duration_minutes
        }))
      });

    } catch (error) {
      Logger.error('AppointmentController', 'Erro ao verificar disponibilidade', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Dados inválidos',
          details: error.issues
        });
      }

      res.status(500).json({
        error: 'Erro interno do servidor'
      });
    }
  }

  /**
   * PUT /api/appointments/:id/reschedule
   * Reagendar agendamento
   */
  async reschedule(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { scheduled_at, duration_minutes } = req.body;

      if (!id || !z.string().uuid().safeParse(id).success) {
        return res.status(400).json({
          error: 'ID do agendamento inválido'
        });
      }

      if (!scheduled_at || !z.string().datetime().safeParse(scheduled_at).success) {
        return res.status(400).json({
          error: 'Nova data/hora obrigatória e deve estar no formato ISO'
        });
      }

      Logger.info('AppointmentController', 'Reagendando agendamento', {
        appointment_id: id,
        new_date: scheduled_at,
        duration: duration_minutes,
        user_id: req.user?.id
      });

      const appointment = await this.appointmentService.reschedule(
        id,
        new Date(scheduled_at),
        duration_minutes
      );

      if (!appointment) {
        return res.status(404).json({
          error: 'Agendamento não encontrado'
        });
      }

      Logger.info('AppointmentController', 'Agendamento reagendado com sucesso', {
        appointment_id: id,
        new_date: scheduled_at
      });

      res.json(appointment);

    } catch (error) {
      Logger.error('AppointmentController', 'Erro ao reagendar agendamento', error);
      
      if (error instanceof Error && error.message.includes('não disponível')) {
        return res.status(409).json({
          error: 'Horário não disponível',
          message: error.message
        });
      }

      res.status(500).json({
        error: 'Erro interno do servidor'
      });
    }
  }

  /**
   * PUT /api/appointments/:id/complete
   * Marcar agendamento como concluído
   */
  async complete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { notes } = req.body;

      if (!id || !z.string().uuid().safeParse(id).success) {
        return res.status(400).json({
          error: 'ID do agendamento inválido'
        });
      }

      Logger.info('AppointmentController', 'Marcando agendamento como concluído', {
        appointment_id: id,
        user_id: req.user?.id
      });

      const appointment = await this.appointmentService.complete(id, notes);

      if (!appointment) {
        return res.status(404).json({
          error: 'Agendamento não encontrado'
        });
      }

      Logger.info('AppointmentController', 'Agendamento marcado como concluído', {
        appointment_id: id
      });

      res.json(appointment);

    } catch (error) {
      Logger.error('AppointmentController', 'Erro ao completar agendamento', error);
      res.status(500).json({
        error: 'Erro interno do servidor'
      });
    }
  }
}