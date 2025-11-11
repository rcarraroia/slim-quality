/**
 * Appointment Frontend Service
 * Sprint 5: Sistema de CRM - Frontend
 * 
 * Service para integração com APIs de agendamentos
 */

import { supabase } from '@/config/supabase';

export interface Appointment {
  id: string;
  customer_id: string;
  customer?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
  };
  assigned_to?: string;
  assigned_user?: {
    id: string;
    name: string;
  };
  title: string;
  description?: string;
  appointment_type?: string;
  scheduled_at: string;
  duration_minutes: number;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  location?: string;
  meeting_url?: string;
  reminder_sent: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface AppointmentFilters {
  start_date?: string;
  end_date?: string;
  assigned_to?: string;
  customer_id?: string;
  status?: string;
  type?: string;
  page?: number;
  limit?: number;
}

export class AppointmentFrontendService {
  /**
   * Lista agendamentos com filtros
   */
  async getAppointments(filters: AppointmentFilters = {}): Promise<{
    data: Appointment[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    const { page = 1, limit = 50, start_date, end_date, assigned_to, customer_id, status, type } = filters;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('appointments')
      .select(`
        *,
        customer:customers(id, name, email, phone)
      `, { count: 'exact' });

    // Filtros
    if (start_date) query = query.gte('scheduled_at', start_date);
    if (end_date) query = query.lte('scheduled_at', end_date);
    if (assigned_to) query = query.eq('assigned_to', assigned_to);
    if (customer_id) query = query.eq('customer_id', customer_id);
    if (status) query = query.eq('status', status);
    if (type) query = query.eq('appointment_type', type);

    // Paginação
    query = query.range(offset, offset + limit - 1).order('scheduled_at', { ascending: true });

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      data: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    };
  }

  /**
   * Busca agendamento por ID
   */
  async getAppointmentById(id: string): Promise<Appointment> {
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        customer:customers(id, name, email, phone)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Cria novo agendamento
   */
  async createAppointment(appointmentData: Partial<Appointment>): Promise<Appointment> {
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('appointments')
      .insert({
        ...appointmentData,
        assigned_to: appointmentData.assigned_to || user?.id,
        status: 'scheduled'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Atualiza agendamento
   */
  async updateAppointment(id: string, updates: Partial<Appointment>): Promise<Appointment> {
    const { data, error } = await supabase
      .from('appointments')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Cancela agendamento
   */
  async cancelAppointment(id: string, reason?: string): Promise<void> {
    const { error } = await supabase
      .from('appointments')
      .update({
        status: 'cancelled',
        notes: reason ? `Cancelado: ${reason}` : 'Cancelado'
      })
      .eq('id', id);

    if (error) throw error;
  }

  /**
   * Marca agendamento como concluído
   */
  async completeAppointment(id: string, notes?: string): Promise<void> {
    const { error } = await supabase
      .from('appointments')
      .update({
        status: 'completed',
        notes
      })
      .eq('id', id);

    if (error) throw error;
  }

  /**
   * Verifica disponibilidade
   */
  async checkAvailability(
    userId: string,
    date: Date,
    durationMinutes: number
  ): Promise<{ available: boolean; conflicts: Appointment[] }> {
    const startTime = date.toISOString();
    const endTime = new Date(date.getTime() + durationMinutes * 60000).toISOString();

    const { data: conflicts } = await supabase
      .from('appointments')
      .select('*')
      .eq('assigned_to', userId)
      .neq('status', 'cancelled')
      .gte('scheduled_at', startTime)
      .lte('scheduled_at', endTime);

    return {
      available: !conflicts || conflicts.length === 0,
      conflicts: conflicts || []
    };
  }

  /**
   * Busca agendamentos do calendário
   */
  async getCalendarAppointments(
    startDate: Date,
    endDate: Date,
    userId?: string
  ): Promise<Appointment[]> {
    let query = supabase
      .from('appointments')
      .select(`
        *,
        customer:customers(id, name, email, phone)
      `)
      .gte('scheduled_at', startDate.toISOString())
      .lte('scheduled_at', endDate.toISOString())
      .neq('status', 'cancelled')
      .order('scheduled_at', { ascending: true });

    if (userId) {
      query = query.eq('assigned_to', userId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  }

  /**
   * Busca agendamentos de hoje
   */
  async getTodayAppointments(): Promise<Appointment[]> {
    const { data: { user } } = await supabase.auth.getUser();
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.getCalendarAppointments(today, tomorrow, user?.id);
  }

  /**
   * Busca próximos agendamentos
   */
  async getUpcomingAppointments(limit = 5): Promise<Appointment[]> {
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        customer:customers(id, name, email, phone)
      `)
      .eq('assigned_to', user?.id)
      .eq('status', 'scheduled')
      .gte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  /**
   * Reagenda agendamento
   */
  async rescheduleAppointment(id: string, newDate: Date): Promise<Appointment> {
    return this.updateAppointment(id, {
      scheduled_at: newDate.toISOString()
    });
  }

  /**
   * Busca tipos de agendamento disponíveis
   */
  getAppointmentTypes(): string[] {
    return [
      'consultation',
      'follow_up',
      'demo',
      'support',
      'meeting',
      'other'
    ];
  }

  /**
   * Formata duração para exibição
   */
  formatDuration(minutes: number): string {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  }
}

export const appointmentFrontendService = new AppointmentFrontendService();

