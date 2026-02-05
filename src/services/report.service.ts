/**
 * Report Service
 * Sistema de Validação por CPF/CNPJ para Afiliados
 * 
 * Responsável por gerar relatórios relacionados ao sistema de CPF/CNPJ
 * incluindo afiliados sem documento, tentativas de duplicação e validações.
 * 
 * @example
 * ```typescript
 * const service = new ReportService();
 * const report = await service.getAffiliatesWithoutDocument();
 * ```
 */

import { supabase } from '../config/supabase';

export interface AffiliateWithoutDocumentReport {
  id: string;
  name: string;
  email: string;
  created_at: string;
  regularization_deadline?: string;
  days_since_creation: number;
  days_until_deadline?: number;
  status: 'pending' | 'expired' | 'no_deadline';
  reminder_count: number;
  last_reminder_at?: string;
}

export interface DuplicationAttemptReport {
  id: string;
  document_hash: string;
  document_type: 'CPF' | 'CNPJ';
  attempted_by_affiliate?: string;
  attempted_by_name?: string;
  attempted_by_email?: string;
  existing_affiliate_id: string;
  existing_affiliate_name: string;
  existing_affiliate_email: string;
  attempt_date: string;
  validation_result: string;
  errors: string[];
}

export interface ValidationReport {
  id: string;
  document_type: 'CPF' | 'CNPJ';
  affiliate_id?: string;
  affiliate_name?: string;
  affiliate_email?: string;
  validation_result: 'VALID' | 'INVALID' | 'DUPLICATE';
  errors: string[];
  created_at: string;
  processing_time_ms?: number;
}

export interface ReportFilters {
  startDate?: string;
  endDate?: string;
  documentType?: 'CPF' | 'CNPJ';
  validationResult?: 'VALID' | 'INVALID' | 'DUPLICATE';
  status?: string;
  limit?: number;
  offset?: number;
}

export interface ReportSummary {
  total_affiliates: number;
  affiliates_with_document: number;
  affiliates_without_document: number;
  pending_regularizations: number;
  expired_regularizations: number;
  total_validations: number;
  valid_validations: number;
  invalid_validations: number;
  duplicate_attempts: number;
  cpf_validations: number;
  cnpj_validations: number;
}

export class ReportService {

  /**
   * Gera relatório de afiliados sem documento
   * @param filters Filtros para o relatório
   * @returns Lista de afiliados sem documento
   */
  async getAffiliatesWithoutDocument(filters: ReportFilters = {}): Promise<AffiliateWithoutDocumentReport[]> {
    try {
      let query = supabase
        .from('affiliates')
        .select(`
          id,
          name,
          email,
          created_at,
          regularization_deadline,
          regularization_requests!left (
            id,
            status,
            reminder_count,
            last_reminder_at
          )
        `)
        .is('document', null)
        .eq('is_active', true);

      // Aplicar filtros de data
      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate);
      }
      
      if (filters.endDate) {
        query = query.lte('created_at', filters.endDate);
      }

      // Paginação
      if (filters.limit) {
        query = query.limit(filters.limit);
      }
      
      if (filters.offset) {
        query = query.range(filters.offset, (filters.offset + (filters.limit || 50)) - 1);
      }

      const { data: affiliates, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar afiliados sem documento:', error);
        return [];
      }

      // Processar dados para o relatório
      const now = new Date();
      const report: AffiliateWithoutDocumentReport[] = [];

      for (const affiliate of affiliates || []) {
        const createdAt = new Date(affiliate.created_at);
        const daysSinceCreation = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
        
        let daysUntilDeadline: number | undefined;
        let status: 'pending' | 'expired' | 'no_deadline' = 'no_deadline';
        
        if (affiliate.regularization_deadline) {
          const deadline = new Date(affiliate.regularization_deadline);
          const diffTime = deadline.getTime() - now.getTime();
          daysUntilDeadline = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          status = daysUntilDeadline <= 0 ? 'expired' : 'pending';
        }

        // Pegar dados da solicitação de regularização mais recente
        const regularizationRequest = (affiliate as any).regularization_requests?.[0];

        report.push({
          id: affiliate.id,
          name: affiliate.name,
          email: affiliate.email,
          created_at: affiliate.created_at,
          regularization_deadline: affiliate.regularization_deadline,
          days_since_creation: daysSinceCreation,
          days_until_deadline: daysUntilDeadline,
          status,
          reminder_count: regularizationRequest?.reminder_count || 0,
          last_reminder_at: regularizationRequest?.last_reminder_at
        });
      }

      return report;

    } catch (error) {
      console.error('Erro ao gerar relatório de afiliados sem documento:', error);
      return [];
    }
  }

  /**
   * Gera relatório de tentativas de duplicação
   * @param filters Filtros para o relatório
   * @returns Lista de tentativas de duplicação
   */
  async getDuplicationAttempts(filters: ReportFilters = {}): Promise<DuplicationAttemptReport[]> {
    try {
      let query = supabase
        .from('document_validation_logs')
        .select(`
          id,
          document_hash,
          document_type,
          affiliate_id,
          validation_result,
          errors,
          created_at,
          affiliates!left (
            id,
            name,
            email
          )
        `)
        .eq('validation_result', 'DUPLICATE');

      // Aplicar filtros
      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate);
      }
      
      if (filters.endDate) {
        query = query.lte('created_at', filters.endDate);
      }
      
      if (filters.documentType) {
        query = query.eq('document_type', filters.documentType);
      }

      // Paginação
      if (filters.limit) {
        query = query.limit(filters.limit);
      }
      
      if (filters.offset) {
        query = query.range(filters.offset, (filters.offset + (filters.limit || 50)) - 1);
      }

      const { data: validationLogs, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar tentativas de duplicação:', error);
        return [];
      }

      const report: DuplicationAttemptReport[] = [];

      for (const log of validationLogs || []) {
        // Buscar afiliado existente com o mesmo documento
        const { data: existingAffiliate } = await supabase
          .from('affiliates')
          .select('id, name, email')
          .eq('document_hash', log.document_hash)
          .eq('is_active', true)
          .single();

        if (existingAffiliate) {
          const attemptedBy = (log as any).affiliates;
          
          report.push({
            id: log.id,
            document_hash: log.document_hash,
            document_type: log.document_type,
            attempted_by_affiliate: log.affiliate_id,
            attempted_by_name: attemptedBy?.name,
            attempted_by_email: attemptedBy?.email,
            existing_affiliate_id: existingAffiliate.id,
            existing_affiliate_name: existingAffiliate.name,
            existing_affiliate_email: existingAffiliate.email,
            attempt_date: log.created_at,
            validation_result: log.validation_result,
            errors: log.errors || []
          });
        }
      }

      return report;

    } catch (error) {
      console.error('Erro ao gerar relatório de tentativas de duplicação:', error);
      return [];
    }
  }

  /**
   * Gera relatório de validações
   * @param filters Filtros para o relatório
   * @returns Lista de validações
   */
  async getValidationReport(filters: ReportFilters = {}): Promise<ValidationReport[]> {
    try {
      let query = supabase
        .from('document_validation_logs')
        .select(`
          id,
          document_type,
          affiliate_id,
          validation_result,
          errors,
          created_at,
          affiliates!left (
            name,
            email
          )
        `);

      // Aplicar filtros
      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate);
      }
      
      if (filters.endDate) {
        query = query.lte('created_at', filters.endDate);
      }
      
      if (filters.documentType) {
        query = query.eq('document_type', filters.documentType);
      }
      
      if (filters.validationResult) {
        query = query.eq('validation_result', filters.validationResult);
      }

      // Paginação
      if (filters.limit) {
        query = query.limit(filters.limit);
      }
      
      if (filters.offset) {
        query = query.range(filters.offset, (filters.offset + (filters.limit || 50)) - 1);
      }

      const { data: validationLogs, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar relatório de validações:', error);
        return [];
      }

      const report: ValidationReport[] = [];

      for (const log of validationLogs || []) {
        const affiliate = (log as any).affiliates;
        
        report.push({
          id: log.id,
          document_type: log.document_type,
          affiliate_id: log.affiliate_id,
          affiliate_name: affiliate?.name,
          affiliate_email: affiliate?.email,
          validation_result: log.validation_result,
          errors: log.errors || [],
          created_at: log.created_at
        });
      }

      return report;

    } catch (error) {
      console.error('Erro ao gerar relatório de validações:', error);
      return [];
    }
  }

  /**
   * Gera resumo geral do sistema
   * @param filters Filtros para o resumo
   * @returns Resumo com estatísticas gerais
   */
  async getSystemSummary(filters: ReportFilters = {}): Promise<ReportSummary> {
    try {
      // Buscar estatísticas de afiliados
      const { data: affiliateStats } = await supabase
        .from('affiliates')
        .select('document, regularization_deadline')
        .eq('is_active', true);

      // Buscar estatísticas de validações
      let validationQuery = supabase
        .from('document_validation_logs')
        .select('validation_result, document_type');

      if (filters.startDate) {
        validationQuery = validationQuery.gte('created_at', filters.startDate);
      }
      
      if (filters.endDate) {
        validationQuery = validationQuery.lte('created_at', filters.endDate);
      }

      const { data: validationStats } = await validationQuery;

      // Buscar estatísticas de regularização
      const { data: regularizationStats } = await supabase
        .from('regularization_requests')
        .select('status, expires_at');

      // Calcular estatísticas
      const totalAffiliates = affiliateStats?.length || 0;
      const affiliatesWithDocument = affiliateStats?.filter(a => a.document).length || 0;
      const affiliatesWithoutDocument = totalAffiliates - affiliatesWithDocument;

      const now = new Date();
      const pendingRegularizations = regularizationStats?.filter(r => 
        r.status === 'pending' && new Date(r.expires_at) > now
      ).length || 0;
      
      const expiredRegularizations = regularizationStats?.filter(r => 
        r.status === 'pending' && new Date(r.expires_at) <= now
      ).length || 0;

      const totalValidations = validationStats?.length || 0;
      const validValidations = validationStats?.filter(v => v.validation_result === 'VALID').length || 0;
      const invalidValidations = validationStats?.filter(v => v.validation_result === 'INVALID').length || 0;
      const duplicateAttempts = validationStats?.filter(v => v.validation_result === 'DUPLICATE').length || 0;
      const cpfValidations = validationStats?.filter(v => v.document_type === 'CPF').length || 0;
      const cnpjValidations = validationStats?.filter(v => v.document_type === 'CNPJ').length || 0;

      return {
        total_affiliates: totalAffiliates,
        affiliates_with_document: affiliatesWithDocument,
        affiliates_without_document: affiliatesWithoutDocument,
        pending_regularizations: pendingRegularizations,
        expired_regularizations: expiredRegularizations,
        total_validations: totalValidations,
        valid_validations: validValidations,
        invalid_validations: invalidValidations,
        duplicate_attempts: duplicateAttempts,
        cpf_validations: cpfValidations,
        cnpj_validations: cnpjValidations
      };

    } catch (error) {
      console.error('Erro ao gerar resumo do sistema:', error);
      return {
        total_affiliates: 0,
        affiliates_with_document: 0,
        affiliates_without_document: 0,
        pending_regularizations: 0,
        expired_regularizations: 0,
        total_validations: 0,
        valid_validations: 0,
        invalid_validations: 0,
        duplicate_attempts: 0,
        cpf_validations: 0,
        cnpj_validations: 0
      };
    }
  }

  /**
   * Exporta relatório para CSV
   * @param reportType Tipo de relatório
   * @param data Dados do relatório
   * @returns String CSV
   */
  exportToCSV(
    reportType: 'affiliates_without_document' | 'duplication_attempts' | 'validations',
    data: any[]
  ): string {
    if (!data || data.length === 0) {
      return '';
    }

    let headers: string[] = [];
    let rows: string[][] = [];

    switch (reportType) {
      case 'affiliates_without_document':
        headers = [
          'ID',
          'Nome',
          'Email',
          'Data de Criação',
          'Prazo de Regularização',
          'Dias desde Criação',
          'Dias até Prazo',
          'Status',
          'Lembretes Enviados',
          'Último Lembrete'
        ];
        
        rows = (data as AffiliateWithoutDocumentReport[]).map(item => [
          item.id,
          item.name,
          item.email,
          new Date(item.created_at).toLocaleDateString('pt-BR'),
          item.regularization_deadline ? new Date(item.regularization_deadline).toLocaleDateString('pt-BR') : '',
          item.days_since_creation.toString(),
          item.days_until_deadline?.toString() || '',
          item.status,
          item.reminder_count.toString(),
          item.last_reminder_at ? new Date(item.last_reminder_at).toLocaleDateString('pt-BR') : ''
        ]);
        break;

      case 'duplication_attempts':
        headers = [
          'ID',
          'Tipo de Documento',
          'Tentativa por Afiliado',
          'Nome do Tentante',
          'Email do Tentante',
          'Afiliado Existente',
          'Nome Existente',
          'Email Existente',
          'Data da Tentativa',
          'Resultado',
          'Erros'
        ];
        
        rows = (data as DuplicationAttemptReport[]).map(item => [
          item.id,
          item.document_type,
          item.attempted_by_affiliate || '',
          item.attempted_by_name || '',
          item.attempted_by_email || '',
          item.existing_affiliate_id,
          item.existing_affiliate_name,
          item.existing_affiliate_email,
          new Date(item.attempt_date).toLocaleDateString('pt-BR'),
          item.validation_result,
          item.errors.join('; ')
        ]);
        break;

      case 'validations':
        headers = [
          'ID',
          'Tipo de Documento',
          'ID do Afiliado',
          'Nome do Afiliado',
          'Email do Afiliado',
          'Resultado',
          'Erros',
          'Data da Validação'
        ];
        
        rows = (data as ValidationReport[]).map(item => [
          item.id,
          item.document_type,
          item.affiliate_id || '',
          item.affiliate_name || '',
          item.affiliate_email || '',
          item.validation_result,
          item.errors.join('; '),
          new Date(item.created_at).toLocaleDateString('pt-BR')
        ]);
        break;
    }

    // Gerar CSV
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    return csvContent;
  }

  /**
   * Gera relatório personalizado com query customizada
   * @param query Query SQL personalizada
   * @param params Parâmetros da query
   * @returns Resultado da query
   */
  async generateCustomReport(query: string, params: Record<string, any> = {}): Promise<any[]> {
    try {
      // ATENÇÃO: Esta função deve ser usada com cuidado em produção
      // Implementar validação de segurança para queries personalizadas
      
      console.warn('Executando query personalizada:', query);
      
      // Por segurança, apenas permitir queries SELECT
      if (!query.trim().toLowerCase().startsWith('select')) {
        throw new Error('Apenas queries SELECT são permitidas');
      }

      const { data, error } = await supabase.rpc('execute_custom_query', {
        query_text: query,
        query_params: params
      });

      if (error) {
        console.error('Erro ao executar query personalizada:', error);
        return [];
      }

      return data || [];

    } catch (error) {
      console.error('Erro ao gerar relatório personalizado:', error);
      return [];
    }
  }

  /**
   * Agenda geração de relatório recorrente
   * @param reportType Tipo de relatório
   * @param schedule Cronograma (cron expression)
   * @param recipients Lista de emails para envio
   * @returns ID do agendamento
   */
  async scheduleRecurringReport(
    reportType: string,
    schedule: string,
    recipients: string[]
  ): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('scheduled_reports')
        .insert([{
          report_type: reportType,
          schedule,
          recipients,
          is_active: true,
          created_at: new Date().toISOString()
        }])
        .select('id')
        .single();

      if (error) {
        console.error('Erro ao agendar relatório recorrente:', error);
        return null;
      }

      return data?.id || null;

    } catch (error) {
      console.error('Erro ao agendar relatório recorrente:', error);
      return null;
    }
  }
}

// Singleton para uso direto
export const reportService = new ReportService();

// Exportar métodos individuais para compatibilidade
export const {
  getAffiliatesWithoutDocument,
  getDuplicationAttempts,
  getValidationReport,
  getSystemSummary,
  exportToCSV,
  generateCustomReport,
  scheduleRecurringReport
} = reportService;