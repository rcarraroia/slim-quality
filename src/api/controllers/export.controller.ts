import { Request, Response } from 'express';
import { CustomerService } from '@/services/crm/customer.service';
import { TimelineService } from '@/services/crm/timeline.service';
import { Logger } from '@/utils/logger';
import { z } from 'zod';

const ExportFiltersSchema = z.object({
  format: z.enum(['json', 'csv', 'xlsx']).default('json'),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  include_timeline: z.boolean().default(false),
  include_conversations: z.boolean().default(false),
  include_appointments: z.boolean().default(false)
});

export class ExportController {
  private customerService: CustomerService;
  private timelineService: TimelineService;

  constructor() {
    this.customerService = new CustomerService();
    this.timelineService = new TimelineService();
  }

  async exportCustomerData(req: Request, res: Response) {
    try {
      const { customer_id } = req.params;
      const result = ExportFiltersSchema.safeParse(req.query);
      
      if (!result.success) {
        return res.status(400).json({ 
          error: 'Parâmetros inválidos',
          details: result.error.issues 
        });
      }

      const filters = result.data;
      
      // Buscar dados do cliente
      const customer = await this.customerService.findById(customer_id);
      
      if (!customer) {
        return res.status(404).json({ error: 'Cliente não encontrado' });
      }

      // Montar dados de exportação
      const exportData: any = {
        customer,
        exported_at: new Date().toISOString(),
        exported_by: req.user?.id
      };

      // Incluir timeline se solicitado
      if (filters.include_timeline) {
        const timelineFilters = {
          start_date: filters.start_date ? new Date(filters.start_date) : undefined,
          end_date: filters.end_date ? new Date(filters.end_date) : undefined
        };
        
        exportData.timeline = await this.timelineService.getCustomerTimeline(
          customer_id, 
          timelineFilters
        );
      }

      // Incluir conversas se solicitado
      if (filters.include_conversations) {
        // TODO: Implementar busca de conversas
        exportData.conversations = [];
      }

      // Incluir agendamentos se solicitado
      if (filters.include_appointments) {
        // TODO: Implementar busca de agendamentos
        exportData.appointments = [];
      }

      // Processar formato de saída
      switch (filters.format) {
        case 'json':
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Content-Disposition', `attachment; filename=customer_${customer_id}.json`);
          return res.json(exportData);

        case 'csv':
          const csv = this.convertCustomerToCSV(exportData);
          res.setHeader('Content-Type', 'text/csv');
          res.setHeader('Content-Disposition', `attachment; filename=customer_${customer_id}.csv`);
          return res.send(csv);

        case 'xlsx':
          // TODO: Implementar exportação XLSX
          return res.status(501).json({ error: 'Formato XLSX não implementado ainda' });

        default:
          return res.status(400).json({ error: 'Formato não suportado' });
      }
    } catch (error) {
      Logger.error('ExportController', 'Erro ao exportar dados do cliente', error as Error, {
        customer_id: req.params.customer_id,
        user_id: req.user?.id
      });
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async exportCustomerTimeline(req: Request, res: Response) {
    try {
      const { customer_id } = req.params;
      const { format = 'json' } = req.query;
      
      // Verificar se cliente existe
      const customer = await this.customerService.findById(customer_id);
      
      if (!customer) {
        return res.status(404).json({ error: 'Cliente não encontrado' });
      }

      // Exportar timeline
      const timelineData = await this.timelineService.exportTimeline(
        customer_id, 
        format as 'json' | 'csv'
      );

      const filename = `timeline_${customer_id}.${format}`;
      
      if (format === 'json') {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        return res.send(timelineData);
      } else if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        return res.send(timelineData);
      }

      res.status(400).json({ error: 'Formato não suportado' });
    } catch (error) {
      Logger.error('ExportController', 'Erro ao exportar timeline do cliente', error as Error, {
        customer_id: req.params.customer_id,
        user_id: req.user?.id
      });
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  async exportAllCustomers(req: Request, res: Response) {
    try {
      const result = ExportFiltersSchema.safeParse(req.query);
      
      if (!result.success) {
        return res.status(400).json({ 
          error: 'Parâmetros inválidos',
          details: result.error.issues 
        });
      }

      const filters = result.data;
      
      // Buscar todos os clientes (com limite de segurança)
      const customers = await this.customerService.findMany({
        created_after: filters.start_date ? new Date(filters.start_date) : undefined,
        created_before: filters.end_date ? new Date(filters.end_date) : undefined,
        limit: 5000 // Limite de segurança para exportação
      });

      const exportData = {
        customers,
        total_count: customers.length,
        exported_at: new Date().toISOString(),
        exported_by: req.user?.id,
        filters
      };

      // Processar formato de saída
      switch (filters.format) {
        case 'json':
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Content-Disposition', 'attachment; filename=all_customers.json');
          return res.json(exportData);

        case 'csv':
          const csv = this.convertCustomersToCSV(customers);
          res.setHeader('Content-Type', 'text/csv');
          res.setHeader('Content-Disposition', 'attachment; filename=all_customers.csv');
          return res.send(csv);

        case 'xlsx':
          return res.status(501).json({ error: 'Formato XLSX não implementado ainda' });

        default:
          return res.status(400).json({ error: 'Formato não suportado' });
      }
    } catch (error) {
      Logger.error('ExportController', 'Erro ao exportar todos os clientes', error as Error, {
        user_id: req.user?.id
      });
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Métodos auxiliares para conversão
  private convertCustomerToCSV(data: any): string {
    const customer = data.customer;
    const timeline = data.timeline || [];
    
    let csv = 'Dados do Cliente\n';
    csv += `Nome,${customer.name}\n`;
    csv += `Email,${customer.email || ''}\n`;
    csv += `Telefone,${customer.phone || ''}\n`;
    csv += `WhatsApp,${customer.whatsapp || ''}\n`;
    csv += `Status,${customer.status}\n`;
    csv += `Origem,${customer.source || ''}\n`;
    csv += `Criado em,${customer.created_at}\n`;
    csv += '\n';
    
    if (timeline.length > 0) {
      csv += 'Timeline\n';
      csv += 'Data,Tipo,Título,Descrição\n';
      
      timeline.forEach((event: any) => {
        csv += `${event.created_at},${event.event_type},"${event.title}","${event.description || ''}"\n`;
      });
    }
    
    return csv;
  }

  private convertCustomersToCSV(customers: any[]): string {
    if (customers.length === 0) return 'Nenhum cliente encontrado';
    
    const headers = [
      'ID', 'Nome', 'Email', 'Telefone', 'WhatsApp', 'Documento', 
      'Data Nascimento', 'Gênero', 'Status', 'Origem', 'Criado em'
    ];
    
    let csv = headers.join(',') + '\n';
    
    customers.forEach(customer => {
      const row = [
        customer.id,
        `"${customer.name}"`,
        customer.email || '',
        customer.phone || '',
        customer.whatsapp || '',
        customer.document || '',
        customer.birth_date || '',
        customer.gender || '',
        customer.status,
        customer.source || '',
        customer.created_at
      ];
      
      csv += row.join(',') + '\n';
    });
    
    return csv;
  }
}