import { Request, Response } from 'express';
import { CustomerService } from '@/services/crm/customer.service';
import { ConversationService } from '@/services/crm/conversation.service';
import { AppointmentService } from '@/services/crm/appointment.service';
import { Logger } from '@/utils/logger';
import { z } from 'zod';

const ReportFiltersSchema = z.object({
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  period: z.enum(['week', 'month', 'quarter', 'year']).optional(),
  format: z.enum(['json', 'csv']).default('json'),
  user_id: z.string().uuid().optional(),
  status: z.string().optional(),
  source: z.string().optional()
});

export class ReportsController {
  private customerService: CustomerService;
  private conversationService: ConversationService;
  private appointmentService: AppointmentService;

  constructor() {
    this.customerService = new CustomerService();
    this.conversationService = new ConversationService();
    this.appointmentService = new AppointmentService();
  }

  async getDashboardMetrics(req: Request, res: Response) {
    try {
      const { period = 'month' } = req.query;
      
      // Calcular datas baseado no período
      const endDate = new Date();
      const startDate = new Date();
      
      switch (period) {
        case 'week':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(endDate.getMonth() - 1);
          break;
        case 'quarter':
          startDate.setMonth(endDate.getMonth() - 3);
          break;
        case 'year':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
      }

      // Buscar métricas em paralelo
      const [
        totalCustomers,
        newCustomers,
        activeConversations,
        todayAppointments,
        conversationMetrics
      ] = await Promise.all([
        this.customerService.count(),
        this.customerService.count({ created_after: startDate }),
        this.conversationService.count({ status: 'open' }),
        this.appointmentService.count({ 
          date: new Date().toISOString().split('T')[0] 
        }),
        this.conversationService.getMetrics({ 
          start_date: startDate, 
          end_date: endDate 
        })
      ]);

      const metrics = {
        customers: {
          total: totalCustomers,
          new_this_period: newCustomers,
          growth_rate: totalCustomers > 0 ? (newCustomers / totalCustomers) * 100 : 0
        },
        conversations: {
          active: activeConversations,
          avg_response_time: conversationMetrics.avg_response_time || '0m',
          resolution_rate: conversationMetrics.resolution_rate || 0
        },
        appointments: {
          today: todayAppointments,
          completion_rate: 0.92 // TODO: calcular real
        },
        period: period as string
      };

      Logger.info('ReportsController', 'Métricas do dashboard obtidas', {
        period,
        user_id: req.user?.id
      });

      res.json(metrics);
    } catch (error) {
      Logger.error('ReportsController', 'Erro ao obter métricas do dashboard', error as Error, {
        user_id: req.user?.id
      });
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async getCustomersReport(req: Request, res: Response) {
    try {
      const result = ReportFiltersSchema.safeParse(req.query);
      
      if (!result.success) {
        return res.status(400).json({ 
          error: 'Filtros inválidos',
          details: result.error.issues 
        });
      }

      const filters = result.data;
      
      // Buscar dados do relatório
      const customers = await this.customerService.findMany({
        created_after: filters.start_date ? new Date(filters.start_date) : undefined,
        created_before: filters.end_date ? new Date(filters.end_date) : undefined,
        status: filters.status,
        source: filters.source,
        limit: 1000 // Limite para relatórios
      });

      // Calcular estatísticas
      const stats = {
        total_customers: customers.length,
        by_status: this.groupBy(customers, 'status'),
        by_source: this.groupBy(customers, 'source'),
        by_month: this.groupByMonth(customers),
        avg_customers_per_day: this.calculateAvgPerDay(customers, filters)
      };

      const report = {
        generated_at: new Date().toISOString(),
        filters,
        statistics: stats,
        data: customers
      };

      if (filters.format === 'csv') {
        const csv = this.convertToCSV(customers);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=customers_report.csv');
        return res.send(csv);
      }

      Logger.info('ReportsController', 'Relatório de clientes gerado', {
        total_customers: customers.length,
        filters,
        user_id: req.user?.id
      });

      res.json(report);
    } catch (error) {
      Logger.error('ReportsController', 'Erro ao gerar relatório de clientes', error as Error, {
        filters: req.query,
        user_id: req.user?.id
      });
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async getConversationsReport(req: Request, res: Response) {
    try {
      const result = ReportFiltersSchema.safeParse(req.query);
      
      if (!result.success) {
        return res.status(400).json({ 
          error: 'Filtros inválidos',
          details: result.error.issues 
        });
      }

      const filters = result.data;
      
      const conversations = await this.conversationService.findMany({
        created_after: filters.start_date ? new Date(filters.start_date) : undefined,
        created_before: filters.end_date ? new Date(filters.end_date) : undefined,
        status: filters.status,
        assigned_to: filters.user_id,
        limit: 1000
      });

      const stats = {
        total_conversations: conversations.length,
        by_status: this.groupBy(conversations, 'status'),
        by_channel: this.groupBy(conversations, 'channel'),
        by_priority: this.groupBy(conversations, 'priority'),
        by_assigned_user: this.groupBy(conversations, 'assigned_to'),
        avg_conversations_per_day: this.calculateAvgPerDay(conversations, filters)
      };

      const report = {
        generated_at: new Date().toISOString(),
        filters,
        statistics: stats,
        data: conversations
      };

      if (filters.format === 'csv') {
        const csv = this.convertToCSV(conversations);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=conversations_report.csv');
        return res.send(csv);
      }

      Logger.info('ReportsController', 'Relatório de conversas gerado', {
        total_conversations: conversations.length,
        filters,
        user_id: req.user?.id
      });

      res.json(report);
    } catch (error) {
      Logger.error('ReportsController', 'Erro ao gerar relatório de conversas', error as Error, {
        filters: req.query,
        user_id: req.user?.id
      });
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async getAppointmentsReport(req: Request, res: Response) {
    try {
      const result = ReportFiltersSchema.safeParse(req.query);
      
      if (!result.success) {
        return res.status(400).json({ 
          error: 'Filtros inválidos',
          details: result.error.issues 
        });
      }

      const filters = result.data;
      
      const appointments = await this.appointmentService.findMany({
        start_date: filters.start_date ? new Date(filters.start_date) : undefined,
        end_date: filters.end_date ? new Date(filters.end_date) : undefined,
        status: filters.status,
        assigned_to: filters.user_id,
        limit: 1000
      });

      const stats = {
        total_appointments: appointments.length,
        by_status: this.groupBy(appointments, 'status'),
        by_type: this.groupBy(appointments, 'appointment_type'),
        by_assigned_user: this.groupBy(appointments, 'assigned_to'),
        completion_rate: this.calculateCompletionRate(appointments),
        avg_appointments_per_day: this.calculateAvgPerDay(appointments, filters)
      };

      const report = {
        generated_at: new Date().toISOString(),
        filters,
        statistics: stats,
        data: appointments
      };

      if (filters.format === 'csv') {
        const csv = this.convertToCSV(appointments);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=appointments_report.csv');
        return res.send(csv);
      }

      Logger.info('ReportsController', 'Relatório de agendamentos gerado', {
        total_appointments: appointments.length,
        filters,
        user_id: req.user?.id
      });

      res.json(report);
    } catch (error) {
      Logger.error('ReportsController', 'Erro ao gerar relatório de agendamentos', error as Error, {
        filters: req.query,
        user_id: req.user?.id
      });
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Métodos auxiliares
  private groupBy(array: any[], key: string): Record<string, number> {
    return array.reduce((acc, item) => {
      const value = item[key] || 'undefined';
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {});
  }

  private groupByMonth(array: any[]): Record<string, number> {
    return array.reduce((acc, item) => {
      const date = new Date(item.created_at);
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {});
  }

  private calculateAvgPerDay(array: any[], filters: any): number {
    if (array.length === 0) return 0;
    
    const startDate = filters.start_date ? new Date(filters.start_date) : new Date(array[0].created_at);
    const endDate = filters.end_date ? new Date(filters.end_date) : new Date();
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    return daysDiff > 0 ? array.length / daysDiff : 0;
  }

  private calculateCompletionRate(appointments: any[]): number {
    if (appointments.length === 0) return 0;
    
    const completed = appointments.filter(apt => apt.status === 'completed').length;
    return completed / appointments.length;
  }

  private convertToCSV(data: any[]): string {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(item => 
      Object.values(item).map(value => 
        typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value
      ).join(',')
    );
    
    return [headers, ...rows].join('\n');
  }
}