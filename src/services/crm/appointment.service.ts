/**
 * Appointment Service
 * Sprint 5: Sistema de CRM e Gestão de Clientes
 * 
 * Serviço para gestão de agendamentos com validação de conflitos,
 * lembretes automáticos e diferentes tipos de agendamento.
 */

import { supabase } from '@/config/supabase';
import { z } from 'zod';
import { logger } from '@/utils/logger';
import { timelineService } from './timeline.service';
import { notificationService } from './notification.service';

// ============================================
// SCHEMAS DE VALIDAÇÃO
// ============================================

// Schema para criação de agendamento
export const CreateAppointmentSchema = z.object({
  customer_id: z.string().uuid(),
  title: z.string().min(1, 'Título é obrigatório').max(255),
  description: z.string().optional(),
  appointment_type: z.enum(['consultation', 'follow_up', 'demo', 'support', 'meeting', 'call', 'other']),
  scheduled_date: z.string().refine((date) => {
    const appointmentDate = new Date(date);
    const now = new Date();
    return appointmentDate > now;
  }, 'Data do agendamento deve ser no futuro'),
  duration_minutes: z.number().min(15).max(480).default(60), // 15 min a 8 horas
  location: z.string().max(255).optional(),
  location_type: z.enum(['in_person', 'video_call', 'phone_call', 'online']).default('video_call'),
  assigned_to: z.string().uuid(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  reminder_minutes: z.number().min(0).max(1440).default(30), // 0 a 24 horas
  metadata: z.record(z.any()).default({})
});

// Schema para atualização de agendamento
export const UpdateAppointmentSchema = CreateAppointmentSchema.partial().extend({
  id: z.string().uuid(),
  status: z.enum(['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show']).optional()
});

// Schema para filtros de agendamentos
export const AppointmentFiltersSchema = z.object({
  customer_id: z.string().uuid().optional(),
  assigned_to: z.string().uuid().optional(),
  appointment_type: z.enum(['consultation', 'follow_up', 'demo', 'support', 'meeting', 'call', 'other']).optional(),
  status: z.enum(['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  location_type: z.enum(['in_person', 'video_call', 'phone_call', 'online']).optional(),
  date_from: z.string().optional(), // ISO date string
  date_to: z.string().optional(), // ISO date string
  search: z.string().optional(), // busca em title e description
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  sort_by: z.enum(['scheduled_date', 'created_at', 'priority']).default('scheduled_date'),
  sort_order: z.enum(['asc', 'desc']).default('asc')
});

// Schema para vista de calendário
export const CalendarViewSchema = z.object({
  assigned_to: z.string().uuid().optional(),
  start_date: z.string(), // ISO date string
  end_date: z.string(), // ISO date string
  view_type: z.enum(['day', 'week', 'month']).default('week')
});

// Tipos TypeScript
export type CreateAppointmentData = z.infer<typeof CreateAppointmentSchema>;
export type UpdateAppointmentData = z.infer<typeof UpdateAppointmentSchema>;
export type AppointmentFilters = z.infer<typeof AppointmentFiltersSchema>;
export type CalendarView = z.infer<typeof CalendarViewSchema>;

export interface Appointment {
  id: string;
  customer_id: string;
  title: string;
  description?: string;
  appointment_type: 'consultation' | 'follow_up' | 'demo' | 'support' | 'meeting' | 'call' | 'other';
  scheduled_date: string;
  duration_minutes: number;
  location?: string;
  location_type: 'in_person' | 'video_call' | 'phone_call' | 'online';
  assigned_to: string;
  status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  reminder_minutes: number;
  reminder_sent: boolean;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface AppointmentWithDetails extends Appointment {
  customer: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
  assigned_user: {
    id: string;
    name: string;
    email: string;
  };
  end_date: string; // calculated field
  is_past: boolean; // calculated field
  can_reschedule: boolean; // calculated field
}

export interface PaginatedAppointments {
  data: AppointmentWithDetails[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  type: string;
  status: string;
  priority: string;
  customer_name: string;
  assigned_to: string;
  location_type: string;
  can_reschedule: boolean;
}

export interface AppointmentStats {
  total: number;
  by_status: Record<string, number>;
  by_type: Record<string, number>;
  today: number;
  this_week: number;
  this_month: number;
  upcoming: number;
  overdue: number;
}

// ============================================
// APPOINTMENT SERVICE
// ============================================

class AppointmentService {
  /**
   * Criar novo agendamento
   */
  async create(data: CreateAppointmentData): Promise<Appointment> {
    try {
      // Validar dados de entrada
      const validatedData = CreateAppointmentSchema.parse(data);
      
      logger.info('Criando novo agendamento', { 
        customerId: validatedData.customer_id,
        assignedTo: validatedData.assigned_to,
        scheduledDate: validatedData.scheduled_date,
        type: validatedData.appointment_type
      });
      
      // Verificar se cliente existe
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('id, name, email')
        .eq('id', validatedData.customer_id)
        .is('deleted_at', null)
        .single();
      
      if (customerError || !customer) {
        throw new Error(`Cliente ${validatedData.customer_id} não encontrado`);
      }
      
      // Verificar se usuário existe
      const { data: user, error: userError } = await supabase
        .from('profiles')
        .select('id, name, email')
        .eq('id', validatedData.assigned_to)
        .single();
      
      if (userError || !user) {
        throw new Error(`Usuário ${validatedData.assigned_to} não encontrado`);
      }
      
      // Verificar conflitos de horário
      const hasConflict = await this.checkTimeConflict(
        validatedData.assigned_to,
        validatedData.scheduled_date,
        validatedData.duration_minutes
      );
      
      if (hasConflict) {
        throw new Error('Conflito de horário detectado. Já existe um agendamento neste período.');
      }
      
      // Inserir agendamento
      const { data: appointment, error } = await supabase
        .from('appointments')
        .insert({
          ...validatedData,
          status: 'scheduled'
        })
        .select()
        .single();
      
      if (error) {
        logger.error('Erro ao criar agendamento', { error: error.message, data: validatedData });
        throw new Error(`Erro ao criar agendamento: ${error.message}`);
      }
      
      // Registrar evento na timeline
      await timelineService.recordAppointmentEvent(
        validatedData.customer_id,
        'appointment_scheduled',
        appointment.id,
        {
          appointment_type: appointment.appointment_type,
          scheduled_date: appointment.scheduled_date,
          assigned_to_name: user.name,
          duration_minutes: appointment.duration_minutes
        }
      );
      
      // Criar notificação para o usuário atribuído
      await notificationService.create({
        user_id: validatedData.assigned_to,
        type: 'appointment_created',
        title: 'Novo agendamento criado',
        message: `Agendamento "${appointment.title}" marcado para ${new Date(appointment.scheduled_date).toLocaleString('pt-BR')}`,
        priority: appointment.priority,
        action_url: `/dashboard/agendamentos/${appointment.id}`,
        metadata: {
          appointment_id: appointment.id,
          customer_name: customer.name,
          scheduled_date: appointment.scheduled_date
        }
      });
      
      logger.info('Agendamento criado com sucesso', { 
        id: appointment.id,
        customerId: appointment.customer_id,
        assignedTo: appointment.assigned_to
      });
      
      return appointment;
    } catch (error) {
      logger.error('Erro no AppointmentService.create', { error: error.message, data });
      throw error;
    }
  }
  
  /**
   * Buscar agendamento por ID
   */
  async getById(id: string): Promise<AppointmentWithDetails | null> {
    try {
      logger.info('Buscando agendamento por ID', { id });
      
      const { data: appointment, error } = await supabase
        .from('appointments')
        .select(`
          *,
          customer:customer_id(
            id,
            name,
            email,
            phone
          ),
          assigned_user:assigned_to(
            id,
            name,
            email
          )
        `)
        .eq('id', id)
        .is('deleted_at', null)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Agendamento não encontrado
        }
        logger.error('Erro ao buscar agendamento', { error: error.message, id });
        throw new Error(`Erro ao buscar agendamento: ${error.message}`);
      }
      
      // Calcular campos derivados
      const now = new Date();
      const scheduledDate = new Date(appointment.scheduled_date);
      const endDate = new Date(scheduledDate.getTime() + appointment.duration_minutes * 60000);
      
      const appointmentWithDetails: AppointmentWithDetails = {
        ...appointment,
        customer: appointment.customer,
        assigned_user: appointment.assigned_user,
        end_date: endDate.toISOString(),
        is_past: scheduledDate < now,
        can_reschedule: appointment.status === 'scheduled' && scheduledDate > now
      };
      
      return appointmentWithDetails;
    } catch (error) {
      logger.error('Erro no AppointmentService.getById', { error: error.message, id });
      throw error;
    }
  }
  
  /**
   * Atualizar agendamento
   */
  async update(data: UpdateAppointmentData): Promise<Appointment> {
    try {
      // Validar dados de entrada
      const validatedData = UpdateAppointmentSchema.parse(data);
      const { id, ...updateData } = validatedData;
      
      logger.info('Atualizando agendamento', { id, fields: Object.keys(updateData) });
      
      // Verificar se agendamento existe
      const existingAppointment = await this.getById(id);
      if (!existingAppointment) {
        throw new Error(`Agendamento ${id} não encontrado`);
      }
      
      // Se data/hora está sendo alterada, verificar conflitos
      if (updateData.scheduled_date || updateData.duration_minutes) {
        const newScheduledDate = updateData.scheduled_date || existingAppointment.scheduled_date;
        const newDuration = updateData.duration_minutes || existingAppointment.duration_minutes;
        const assignedTo = updateData.assigned_to || existingAppointment.assigned_to;
        
        const hasConflict = await this.checkTimeConflict(
          assignedTo,
          newScheduledDate,
          newDuration,
          id // Excluir o próprio agendamento da verificação
        );
        
        if (hasConflict) {
          throw new Error('Conflito de horário detectado. Já existe um agendamento neste período.');
        }
      }
      
      // Atualizar agendamento
      const { data: appointment, error } = await supabase
        .from('appointments')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        logger.error('Erro ao atualizar agendamento', { error: error.message, id, data: updateData });
        throw new Error(`Erro ao atualizar agendamento: ${error.message}`);
      }
      
      // Se status mudou para completed, registrar na timeline
      if (updateData.status === 'completed' && existingAppointment.status !== 'completed') {
        await timelineService.recordAppointmentEvent(
          appointment.customer_id,
          'appointment_completed',
          appointment.id,
          {
            appointment_type: appointment.appointment_type,
            completed_date: new Date().toISOString(),
            duration_minutes: appointment.duration_minutes
          }
        );
      }
      
      // Se status mudou para cancelled, registrar na timeline
      if (updateData.status === 'cancelled' && existingAppointment.status !== 'cancelled') {
        await timelineService.recordAppointmentEvent(
          appointment.customer_id,
          'appointment_cancelled',
          appointment.id,
          {
            appointment_type: appointment.appointment_type,
            cancelled_date: new Date().toISOString(),
            cancellation_reason: updateData.metadata?.cancellation_reason
          }
        );
      }
      
      logger.info('Agendamento atualizado com sucesso', { id, status: appointment.status });
      
      return appointment;
    } catch (error) {
      logger.error('Erro no AppointmentService.update', { error: error.message, data });
      throw error;
    }
  }
  
  /**
   * Cancelar agendamento
   */
  async cancel(id: string, reason?: string, cancelledBy?: string): Promise<void> {
    try {
      logger.info('Cancelando agendamento', { id, reason, cancelledBy });
      
      await this.update({
        id,
        status: 'cancelled',
        metadata: {
          cancellation_reason: reason,
          cancelled_by: cancelledBy,
          cancelled_at: new Date().toISOString()
        }
      });
      
      logger.info('Agendamento cancelado com sucesso', { id });
    } catch (error) {
      logger.error('Erro no AppointmentService.cancel', { error: error.message, id, reason });
      throw error;
    }
  }
  
  /**
   * Reagendar agendamento
   */
  async reschedule(
    id: string, 
    newScheduledDate: string, 
    newDuration?: number,
    rescheduledBy?: string
  ): Promise<Appointment> {
    try {
      logger.info('Reagendando agendamento', { id, newScheduledDate, newDuration, rescheduledBy });
      
      const existingAppointment = await this.getById(id);
      if (!existingAppointment) {
        throw new Error(`Agendamento ${id} não encontrado`);
      }
      
      // Verificar se pode ser reagendado
      if (!existingAppointment.can_reschedule) {
        throw new Error('Este agendamento não pode ser reagendado');
      }
      
      const updatedAppointment = await this.update({
        id,
        scheduled_date: newScheduledDate,
        duration_minutes: newDuration,
        status: 'scheduled', // Resetar para scheduled
        metadata: {
          ...existingAppointment.metadata,
          rescheduled_from: existingAppointment.scheduled_date,
          rescheduled_by: rescheduledBy,
          rescheduled_at: new Date().toISOString()
        }
      });
      
      // Notificar usuário atribuído sobre reagendamento
      await notificationService.create({
        user_id: existingAppointment.assigned_to,
        type: 'appointment_created',
        title: 'Agendamento reagendado',
        message: `Agendamento "${existingAppointment.title}" foi reagendado para ${new Date(newScheduledDate).toLocaleString('pt-BR')}`,
        priority: existingAppointment.priority,
        action_url: `/dashboard/agendamentos/${id}`,
        metadata: {
          appointment_id: id,
          old_date: existingAppointment.scheduled_date,
          new_date: newScheduledDate
        }
      });
      
      logger.info('Agendamento reagendado com sucesso', { id, newScheduledDate });
      
      return updatedAppointment;
    } catch (error) {
      logger.error('Erro no AppointmentService.reschedule', { error: error.message, id, newScheduledDate });
      throw error;
    }
  }
  
  /**
   * Soft delete de agendamento
   */
  async delete(id: string): Promise<void> {
    try {
      logger.info('Removendo agendamento (soft delete)', { id });
      
      // Verificar se agendamento existe
      const existingAppointment = await this.getById(id);
      if (!existingAppointment) {
        throw new Error(`Agendamento ${id} não encontrado`);
      }
      
      // Soft delete
      const { error } = await supabase
        .from('appointments')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      
      if (error) {
        logger.error('Erro ao remover agendamento', { error: error.message, id });
        throw new Error(`Erro ao remover agendamento: ${error.message}`);
      }
      
      logger.info('Agendamento removido com sucesso', { id });
    } catch (error) {
      logger.error('Erro no AppointmentService.delete', { error: error.message, id });
      throw error;
    }
  }
  
  /**
   * Listar agendamentos com filtros e paginação
   */
  async list(filters: Partial<AppointmentFilters> = {}): Promise<PaginatedAppointments> {
    try {
      // Validar filtros
      const validatedFilters = AppointmentFiltersSchema.parse(filters);
      
      logger.info('Listando agendamentos', { filters: validatedFilters });
      
      // Construir query base
      let query = supabase
        .from('appointments')
        .select(`
          *,
          customer:customer_id(
            id,
            name,
            email,
            phone
          ),
          assigned_user:assigned_to(
            id,
            name,
            email
          )
        `, { count: 'exact' })
        .is('deleted_at', null);
      
      // Aplicar filtros
      if (validatedFilters.customer_id) {
        query = query.eq('customer_id', validatedFilters.customer_id);
      }
      
      if (validatedFilters.assigned_to) {
        query = query.eq('assigned_to', validatedFilters.assigned_to);
      }
      
      if (validatedFilters.appointment_type) {
        query = query.eq('appointment_type', validatedFilters.appointment_type);
      }
      
      if (validatedFilters.status) {
        query = query.eq('status', validatedFilters.status);
      }
      
      if (validatedFilters.priority) {
        query = query.eq('priority', validatedFilters.priority);
      }
      
      if (validatedFilters.location_type) {
        query = query.eq('location_type', validatedFilters.location_type);
      }
      
      if (validatedFilters.date_from) {
        query = query.gte('scheduled_date', validatedFilters.date_from);
      }
      
      if (validatedFilters.date_to) {
        query = query.lte('scheduled_date', validatedFilters.date_to);
      }
      
      // Busca textual
      if (validatedFilters.search) {
        query = query.or(`title.ilike.%${validatedFilters.search}%,description.ilike.%${validatedFilters.search}%`);
      }
      
      // Ordenação
      query = query.order(validatedFilters.sort_by, { ascending: validatedFilters.sort_order === 'asc' });
      
      // Paginação
      const offset = (validatedFilters.page - 1) * validatedFilters.limit;
      query = query.range(offset, offset + validatedFilters.limit - 1);
      
      const { data: appointments, error, count } = await query;
      
      if (error) {
        logger.error('Erro ao listar agendamentos', { error: error.message, filters: validatedFilters });
        throw new Error(`Erro ao listar agendamentos: ${error.message}`);
      }
      
      // Adicionar campos calculados
      const now = new Date();
      const appointmentsWithDetails = (appointments || []).map(appointment => {
        const scheduledDate = new Date(appointment.scheduled_date);
        const endDate = new Date(scheduledDate.getTime() + appointment.duration_minutes * 60000);
        
        return {
          ...appointment,
          end_date: endDate.toISOString(),
          is_past: scheduledDate < now,
          can_reschedule: appointment.status === 'scheduled' && scheduledDate > now
        };
      });
      
      // Calcular paginação
      const total = count || 0;
      const total_pages = Math.ceil(total / validatedFilters.limit);
      
      const result: PaginatedAppointments = {
        data: appointmentsWithDetails,
        pagination: {
          page: validatedFilters.page,
          limit: validatedFilters.limit,
          total,
          total_pages,
          has_next: validatedFilters.page < total_pages,
          has_prev: validatedFilters.page > 1
        }
      };
      
      logger.info('Agendamentos listados com sucesso', { 
        total, 
        page: validatedFilters.page, 
        returned: appointments?.length || 0
      });
      
      return result;
    } catch (error) {
      logger.error('Erro no AppointmentService.list', { error: error.message, filters });
      throw error;
    }
  }
  
  /**
   * Verificar conflito de horário
   */
  private async checkTimeConflict(
    assignedTo: string,
    scheduledDate: string,
    durationMinutes: number,
    excludeAppointmentId?: string
  ): Promise<boolean> {
    try {
      const startTime = new Date(scheduledDate);
      const endTime = new Date(startTime.getTime() + durationMinutes * 60000);
      
      let query = supabase
        .from('appointments')
        .select('id, scheduled_date, duration_minutes')
        .eq('assigned_to', assignedTo)
        .in('status', ['scheduled', 'confirmed', 'in_progress'])
        .is('deleted_at', null);
      
      // Excluir agendamento específico (para reagendamento)
      if (excludeAppointmentId) {
        query = query.neq('id', excludeAppointmentId);
      }
      
      const { data: existingAppointments, error } = await query;
      
      if (error) {
        logger.error('Erro ao verificar conflitos', { error: error.message });
        return false; // Em caso de erro, não bloquear
      }
      
      // Verificar sobreposição de horários
      for (const existing of existingAppointments || []) {
        const existingStart = new Date(existing.scheduled_date);
        const existingEnd = new Date(existingStart.getTime() + existing.duration_minutes * 60000);
        
        // Verificar se há sobreposição
        if (
          (startTime >= existingStart && startTime < existingEnd) ||
          (endTime > existingStart && endTime <= existingEnd) ||
          (startTime <= existingStart && endTime >= existingEnd)
        ) {
          return true; // Conflito encontrado
        }
      }
      
      return false; // Sem conflitos
    } catch (error) {
      logger.error('Erro ao verificar conflito de horário', { error: error.message });
      return false; // Em caso de erro, não bloquear
    }
  }
}

export const appointmentService = new AppointmentService();// ==
==========================================
// SISTEMA DE LEMBRETES E CALENDÁRIO
// ============================================

/**
 * Extensão do AppointmentService para lembretes e vista de calendário
 */
class AppointmentReminderService extends AppointmentService {
  /**
   * Buscar agendamentos que precisam de lembrete
   */
  async getAppointmentsNeedingReminder(): Promise<Appointment[]> {
    try {
      logger.info('Buscando agendamentos que precisam de lembrete');
      
      const now = new Date();
      
      // Buscar agendamentos que:
      // 1. Estão agendados ou confirmados
      // 2. Não tiveram lembrete enviado
      // 3. Estão dentro do período de lembrete
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select('*')
        .in('status', ['scheduled', 'confirmed'])
        .eq('reminder_sent', false)
        .is('deleted_at', null)
        .gte('scheduled_date', now.toISOString());
      
      if (error) {
        logger.error('Erro ao buscar agendamentos para lembrete', { error: error.message });
        throw new Error(`Erro ao buscar agendamentos: ${error.message}`);
      }
      
      // Filtrar agendamentos que estão no período de lembrete
      const appointmentsToRemind = (appointments || []).filter(appointment => {
        const scheduledDate = new Date(appointment.scheduled_date);
        const reminderTime = new Date(scheduledDate.getTime() - appointment.reminder_minutes * 60000);
        
        return now >= reminderTime;
      });
      
      logger.info('Agendamentos encontrados para lembrete', { 
        total: appointments?.length || 0,
        needingReminder: appointmentsToRemind.length
      });
      
      return appointmentsToRemind;
    } catch (error) {
      logger.error('Erro no AppointmentReminderService.getAppointmentsNeedingReminder', { error: error.message });
      throw error;
    }
  }
  
  /**
   * Enviar lembrete de agendamento
   */
  async sendReminder(appointmentId: string): Promise<void> {
    try {
      logger.info('Enviando lembrete de agendamento', { appointmentId });
      
      // Buscar agendamento com detalhes
      const appointment = await this.getById(appointmentId);
      if (!appointment) {
        throw new Error(`Agendamento ${appointmentId} não encontrado`);
      }
      
      // Verificar se já foi enviado
      if (appointment.reminder_sent) {
        logger.info('Lembrete já foi enviado', { appointmentId });
        return;
      }
      
      // Calcular tempo até o agendamento
      const scheduledDate = new Date(appointment.scheduled_date);
      const now = new Date();
      const minutesUntil = Math.round((scheduledDate.getTime() - now.getTime()) / 60000);
      
      // Criar notificação de lembrete
      await notificationService.create({
        user_id: appointment.assigned_to,
        type: 'appointment_reminder',
        title: 'Lembrete de agendamento',
        message: `Agendamento "${appointment.title}" com ${appointment.customer.name} em ${minutesUntil} minutos`,
        priority: appointment.priority === 'urgent' ? 'urgent' : 'high',
        action_url: `/dashboard/agendamentos/${appointment.id}`,
        metadata: {
          appointment_id: appointment.id,
          customer_name: appointment.customer.name,
          scheduled_date: appointment.scheduled_date,
          minutes_until: minutesUntil,
          location_type: appointment.location_type
        }
      });
      
      // Marcar lembrete como enviado
      await supabase
        .from('appointments')
        .update({ 
          reminder_sent: true,
          metadata: {
            ...appointment.metadata,
            reminder_sent_at: new Date().toISOString()
          }
        })
        .eq('id', appointmentId);
      
      logger.info('Lembrete enviado com sucesso', { 
        appointmentId,
        assignedTo: appointment.assigned_to,
        minutesUntil
      });
    } catch (error) {
      logger.error('Erro no AppointmentReminderService.sendReminder', { error: error.message, appointmentId });
      throw error;
    }
  }
  
  /**
   * Processar todos os lembretes pendentes
   */
  async processReminders(): Promise<{ sent: number; errors: number }> {
    try {
      logger.info('Processando lembretes pendentes');
      
      const appointmentsToRemind = await this.getAppointmentsNeedingReminder();
      
      let sent = 0;
      let errors = 0;
      
      for (const appointment of appointmentsToRemind) {
        try {
          await this.sendReminder(appointment.id);
          sent++;
        } catch (error) {
          logger.error('Erro ao enviar lembrete individual', { 
            error: error.message, 
            appointmentId: appointment.id 
          });
          errors++;
        }
      }
      
      logger.info('Processamento de lembretes concluído', { sent, errors, total: appointmentsToRemind.length });
      
      return { sent, errors };
    } catch (error) {
      logger.error('Erro no AppointmentReminderService.processReminders', { error: error.message });
      throw error;
    }
  }
  
  /**
   * Buscar vista de calendário
   */
  async getCalendarView(params: CalendarView): Promise<CalendarEvent[]> {
    try {
      // Validar parâmetros
      const validatedParams = CalendarViewSchema.parse(params);
      
      logger.info('Buscando vista de calendário', { params: validatedParams });
      
      // Construir query
      let query = supabase
        .from('appointments')
        .select(`
          id,
          title,
          scheduled_date,
          duration_minutes,
          appointment_type,
          status,
          priority,
          location_type,
          assigned_to,
          customer:customer_id(
            name
          )
        `)
        .gte('scheduled_date', validatedParams.start_date)
        .lte('scheduled_date', validatedParams.end_date)
        .is('deleted_at', null);
      
      // Filtrar por usuário se especificado
      if (validatedParams.assigned_to) {
        query = query.eq('assigned_to', validatedParams.assigned_to);
      }
      
      const { data: appointments, error } = await query
        .order('scheduled_date', { ascending: true });
      
      if (error) {
        logger.error('Erro ao buscar vista de calendário', { error: error.message, params: validatedParams });
        throw new Error(`Erro ao buscar calendário: ${error.message}`);
      }
      
      // Converter para formato de eventos de calendário
      const now = new Date();
      const calendarEvents: CalendarEvent[] = (appointments || []).map(appointment => {
        const startDate = new Date(appointment.scheduled_date);
        const endDate = new Date(startDate.getTime() + appointment.duration_minutes * 60000);
        
        return {
          id: appointment.id,
          title: appointment.title,
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          type: appointment.appointment_type,
          status: appointment.status,
          priority: appointment.priority,
          customer_name: appointment.customer?.name || 'Cliente não encontrado',
          assigned_to: appointment.assigned_to,
          location_type: appointment.location_type,
          can_reschedule: appointment.status === 'scheduled' && startDate > now
        };
      });
      
      logger.info('Vista de calendário carregada', { 
        params: validatedParams,
        eventCount: calendarEvents.length
      });
      
      return calendarEvents;
    } catch (error) {
      logger.error('Erro no AppointmentReminderService.getCalendarView', { error: error.message, params });
      throw error;
    }
  }
  
  /**
   * Buscar disponibilidade de um usuário
   */
  async getUserAvailability(
    userId: string,
    date: string, // YYYY-MM-DD
    workingHours: { start: string; end: string } = { start: '09:00', end: '18:00' }
  ): Promise<Array<{ start: string; end: string; available: boolean }>> {
    try {
      logger.info('Buscando disponibilidade do usuário', { userId, date });
      
      // Buscar agendamentos do dia
      const startOfDay = `${date}T00:00:00.000Z`;
      const endOfDay = `${date}T23:59:59.999Z`;
      
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select('scheduled_date, duration_minutes')
        .eq('assigned_to', userId)
        .gte('scheduled_date', startOfDay)
        .lte('scheduled_date', endOfDay)
        .in('status', ['scheduled', 'confirmed', 'in_progress'])
        .is('deleted_at', null)
        .order('scheduled_date', { ascending: true });
      
      if (error) {
        logger.error('Erro ao buscar agendamentos do usuário', { error: error.message, userId, date });
        throw new Error(`Erro ao buscar disponibilidade: ${error.message}`);
      }
      
      // Gerar slots de 30 minutos no horário de trabalho
      const slots: Array<{ start: string; end: string; available: boolean }> = [];
      const workStart = new Date(`${date}T${workingHours.start}:00.000Z`);
      const workEnd = new Date(`${date}T${workingHours.end}:00.000Z`);
      
      let currentTime = new Date(workStart);
      
      while (currentTime < workEnd) {
        const slotEnd = new Date(currentTime.getTime() + 30 * 60000); // 30 minutos
        
        // Verificar se há conflito com agendamentos existentes
        const hasConflict = (appointments || []).some(appointment => {
          const appointmentStart = new Date(appointment.scheduled_date);
          const appointmentEnd = new Date(appointmentStart.getTime() + appointment.duration_minutes * 60000);
          
          return (
            (currentTime >= appointmentStart && currentTime < appointmentEnd) ||
            (slotEnd > appointmentStart && slotEnd <= appointmentEnd) ||
            (currentTime <= appointmentStart && slotEnd >= appointmentEnd)
          );
        });
        
        slots.push({
          start: currentTime.toISOString(),
          end: slotEnd.toISOString(),
          available: !hasConflict
        });
        
        currentTime = slotEnd;
      }
      
      logger.info('Disponibilidade calculada', { 
        userId, 
        date, 
        totalSlots: slots.length,
        availableSlots: slots.filter(s => s.available).length
      });
      
      return slots;
    } catch (error) {
      logger.error('Erro no AppointmentReminderService.getUserAvailability', { error: error.message, userId, date });
      throw error;
    }
  }
  
  /**
   * Buscar estatísticas de agendamentos
   */
  async getAppointmentStats(userId?: string): Promise<AppointmentStats> {
    try {
      logger.info('Buscando estatísticas de agendamentos', { userId });
      
      let baseQuery = supabase
        .from('appointments')
        .select('*')
        .is('deleted_at', null);
      
      if (userId) {
        baseQuery = baseQuery.eq('assigned_to', userId);
      }
      
      // Total de agendamentos
      const { count: total } = await baseQuery
        .select('*', { count: 'exact', head: true });
      
      // Por status
      const { data: statusData } = await baseQuery
        .select('status');
      
      const byStatus = (statusData || []).reduce((acc, item) => {
        acc[item.status] = (acc[item.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      // Por tipo
      const { data: typeData } = await baseQuery
        .select('appointment_type');
      
      const byType = (typeData || []).reduce((acc, item) => {
        acc[item.appointment_type] = (acc[item.appointment_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      // Agendamentos de hoje
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const { count: todayCount } = await baseQuery
        .select('*', { count: 'exact', head: true })
        .gte('scheduled_date', today.toISOString())
        .lt('scheduled_date', tomorrow.toISOString());
      
      // Agendamentos desta semana
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);
      
      const { count: weekCount } = await baseQuery
        .select('*', { count: 'exact', head: true })
        .gte('scheduled_date', weekStart.toISOString())
        .lt('scheduled_date', weekEnd.toISOString());
      
      // Agendamentos deste mês
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      
      const { count: monthCount } = await baseQuery
        .select('*', { count: 'exact', head: true })
        .gte('scheduled_date', monthStart.toISOString())
        .lt('scheduled_date', monthEnd.toISOString());
      
      // Agendamentos futuros
      const { count: upcomingCount } = await baseQuery
        .select('*', { count: 'exact', head: true })
        .gte('scheduled_date', new Date().toISOString())
        .in('status', ['scheduled', 'confirmed']);
      
      // Agendamentos atrasados (passaram da data e ainda não foram completados)
      const { count: overdueCount } = await baseQuery
        .select('*', { count: 'exact', head: true })
        .lt('scheduled_date', new Date().toISOString())
        .in('status', ['scheduled', 'confirmed']);
      
      const stats: AppointmentStats = {
        total: total || 0,
        by_status: byStatus,
        by_type: byType,
        today: todayCount || 0,
        this_week: weekCount || 0,
        this_month: monthCount || 0,
        upcoming: upcomingCount || 0,
        overdue: overdueCount || 0
      };
      
      logger.info('Estatísticas de agendamentos calculadas', { userId, stats });
      
      return stats;
    } catch (error) {
      logger.error('Erro ao buscar estatísticas de agendamentos', { error: error.message, userId });
      return {
        total: 0,
        by_status: {},
        by_type: {},
        today: 0,
        this_week: 0,
        this_month: 0,
        upcoming: 0,
        overdue: 0
      };
    }
  }
  
  /**
   * Buscar próximos agendamentos de um usuário
   */
  async getUpcomingAppointments(userId: string, limit: number = 5): Promise<AppointmentWithDetails[]> {
    try {
      logger.info('Buscando próximos agendamentos', { userId, limit });
      
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select(`
          *,
          customer:customer_id(
            id,
            name,
            email,
            phone
          ),
          assigned_user:assigned_to(
            id,
            name,
            email
          )
        `)
        .eq('assigned_to', userId)
        .gte('scheduled_date', new Date().toISOString())
        .in('status', ['scheduled', 'confirmed'])
        .is('deleted_at', null)
        .order('scheduled_date', { ascending: true })
        .limit(limit);
      
      if (error) {
        logger.error('Erro ao buscar próximos agendamentos', { error: error.message, userId });
        throw new Error(`Erro ao buscar agendamentos: ${error.message}`);
      }
      
      // Adicionar campos calculados
      const now = new Date();
      const appointmentsWithDetails = (appointments || []).map(appointment => {
        const scheduledDate = new Date(appointment.scheduled_date);
        const endDate = new Date(scheduledDate.getTime() + appointment.duration_minutes * 60000);
        
        return {
          ...appointment,
          end_date: endDate.toISOString(),
          is_past: scheduledDate < now,
          can_reschedule: appointment.status === 'scheduled' && scheduledDate > now
        };
      });
      
      logger.info('Próximos agendamentos encontrados', { 
        userId, 
        count: appointmentsWithDetails.length 
      });
      
      return appointmentsWithDetails;
    } catch (error) {
      logger.error('Erro no AppointmentReminderService.getUpcomingAppointments', { error: error.message, userId });
      throw error;
    }
  }
}

// Exportar instância estendida
export const appointmentReminderService = new AppointmentReminderService();