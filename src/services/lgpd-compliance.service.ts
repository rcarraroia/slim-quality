/**
 * LGPD Compliance Service
 * Sistema de Validação por CPF/CNPJ para Afiliados
 * 
 * Responsável por garantir conformidade com a Lei Geral de Proteção de Dados (LGPD)
 * incluindo coleta de consentimento, logging de processamento e anonimização de dados.
 * 
 * @example
 * ```typescript
 * const service = new LGPDComplianceService();
 * await service.collectConsent('affiliate_123', ['document_processing', 'marketing']);
 * ```
 */

import { supabase } from '../config/supabase';
import { DocumentUtils } from '../utils/document-utils';

export interface ConsentRecord {
  id?: string;
  affiliate_id: string;
  consent_type: ConsentType;
  consent_given: boolean;
  consent_date: string;
  consent_method: 'web_form' | 'email' | 'phone' | 'in_person';
  consent_version: string;
  ip_address?: string;
  user_agent?: string;
  withdrawal_date?: string;
  withdrawal_reason?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DataProcessingLog {
  id?: string;
  affiliate_id: string;
  processing_type: ProcessingType;
  data_types: string[];
  purpose: string;
  legal_basis: LegalBasis;
  processor_id?: string;
  processing_date: string;
  retention_period?: string;
  anonymization_date?: string;
  created_at?: string;
}

export type ConsentType = 
  | 'document_processing'      // Processamento de CPF/CNPJ
  | 'data_storage'            // Armazenamento de dados pessoais
  | 'marketing_communication' // Comunicações de marketing
  | 'performance_analytics'   // Análise de performance
  | 'third_party_sharing'     // Compartilhamento com terceiros
  | 'automated_decision'      // Decisões automatizadas
  | 'data_transfer';          // Transferência internacional

export type ProcessingType =
  | 'collection'              // Coleta de dados
  | 'storage'                 // Armazenamento
  | 'processing'              // Processamento
  | 'sharing'                 // Compartilhamento
  | 'deletion'                // Exclusão
  | 'anonymization'           // Anonimização
  | 'access'                  // Acesso aos dados
  | 'rectification'           // Retificação
  | 'portability';            // Portabilidade

export type LegalBasis =
  | 'consent'                 // Consentimento
  | 'contract'                // Execução de contrato
  | 'legal_obligation'        // Obrigação legal
  | 'vital_interests'         // Interesses vitais
  | 'public_task'             // Tarefa pública
  | 'legitimate_interests';   // Interesses legítimos

export interface ConsentRequest {
  affiliateId: string;
  consentTypes: ConsentType[];
  method: 'web_form' | 'email' | 'phone' | 'in_person';
  ipAddress?: string;
  userAgent?: string;
  consentVersion?: string;
}

export interface DataAnonymizationResult {
  success: boolean;
  anonymizedFields: string[];
  originalHash: string;
  anonymizationDate: string;
  error?: string;
}

export class LGPDComplianceService {

  /**
   * Coleta consentimento explícito do titular dos dados
   * @param request Dados da solicitação de consentimento
   * @returns IDs dos registros de consentimento criados
   */
  async collectConsent(request: ConsentRequest): Promise<string[]> {
    try {
      const now = new Date().toISOString();
      const consentVersion = request.consentVersion || '1.0';
      const consentRecords: ConsentRecord[] = [];

      // Criar registro de consentimento para cada tipo
      for (const consentType of request.consentTypes) {
        consentRecords.push({
          affiliate_id: request.affiliateId,
          consent_type: consentType,
          consent_given: true,
          consent_date: now,
          consent_method: request.method,
          consent_version: consentVersion,
          ip_address: request.ipAddress,
          user_agent: request.userAgent,
          created_at: now,
          updated_at: now
        });
      }

      // Inserir registros no banco
      const { data: insertedRecords, error: insertError } = await supabase
        .from('lgpd_consent_records')
        .insert(consentRecords)
        .select('id');

      if (insertError) {
        console.error('Erro ao inserir registros de consentimento:', insertError);
        throw new Error('Falha ao registrar consentimento');
      }

      // Registrar log de processamento
      await this.logDataProcessing({
        affiliate_id: request.affiliateId,
        processing_type: 'collection',
        data_types: ['consent_data', 'metadata'],
        purpose: 'Coleta de consentimento LGPD',
        legal_basis: 'consent',
        processing_date: now
      });

      const recordIds = insertedRecords?.map(record => record.id) || [];
      console.log(`Consentimento coletado para afiliado ${request.affiliateId}: ${recordIds.length} tipos`);
      
      return recordIds;

    } catch (error) {
      console.error('Erro ao coletar consentimento:', error);
      throw error;
    }
  }

  /**
   * Retira consentimento previamente dado
   * @param affiliateId ID do afiliado
   * @param consentTypes Tipos de consentimento a retirar
   * @param reason Motivo da retirada
   * @returns true se retirada com sucesso
   */
  async withdrawConsent(
    affiliateId: string, 
    consentTypes: ConsentType[], 
    reason?: string
  ): Promise<boolean> {
    try {
      const now = new Date().toISOString();

      // Atualizar registros de consentimento
      const { error: updateError } = await supabase
        .from('lgpd_consent_records')
        .update({
          consent_given: false,
          withdrawal_date: now,
          withdrawal_reason: reason || 'Solicitação do titular',
          updated_at: now
        })
        .eq('affiliate_id', affiliateId)
        .in('consent_type', consentTypes)
        .eq('consent_given', true);

      if (updateError) {
        console.error('Erro ao retirar consentimento:', updateError);
        return false;
      }

      // Registrar log de processamento
      await this.logDataProcessing({
        affiliate_id: affiliateId,
        processing_type: 'processing',
        data_types: ['consent_withdrawal'],
        purpose: 'Retirada de consentimento LGPD',
        legal_basis: 'consent',
        processing_date: now
      });

      console.log(`Consentimento retirado para afiliado ${affiliateId}: ${consentTypes.join(', ')}`);
      return true;

    } catch (error) {
      console.error('Erro ao retirar consentimento:', error);
      return false;
    }
  }

  /**
   * Verifica se afiliado deu consentimento para tipos específicos
   * @param affiliateId ID do afiliado
   * @param consentTypes Tipos de consentimento a verificar
   * @returns Mapa de consentimentos válidos
   */
  async checkConsent(
    affiliateId: string, 
    consentTypes: ConsentType[]
  ): Promise<Record<ConsentType, boolean>> {
    try {
      const { data: consents, error } = await supabase
        .from('lgpd_consent_records')
        .select('consent_type, consent_given, withdrawal_date')
        .eq('affiliate_id', affiliateId)
        .in('consent_type', consentTypes)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao verificar consentimento:', error);
        // Retornar false para todos em caso de erro
        return consentTypes.reduce((acc, type) => ({ ...acc, [type]: false }), {} as Record<ConsentType, boolean>);
      }

      // Mapear consentimentos válidos (dados e não retirados)
      const consentMap: Record<ConsentType, boolean> = {};
      
      for (const consentType of consentTypes) {
        const latestConsent = consents?.find(c => c.consent_type === consentType);
        consentMap[consentType] = !!(latestConsent?.consent_given && !latestConsent?.withdrawal_date);
      }

      return consentMap;

    } catch (error) {
      console.error('Erro ao verificar consentimento:', error);
      return consentTypes.reduce((acc, type) => ({ ...acc, [type]: false }), {} as Record<ConsentType, boolean>);
    }
  }

  /**
   * Registra log de processamento de dados pessoais
   * @param logData Dados do log de processamento
   * @returns ID do log criado
   */
  async logDataProcessing(logData: Omit<DataProcessingLog, 'id' | 'created_at'>): Promise<string | null> {
    try {
      const { data: logRecord, error } = await supabase
        .from('lgpd_processing_logs')
        .insert([{
          ...logData,
          created_at: new Date().toISOString()
        }])
        .select('id')
        .single();

      if (error) {
        console.error('Erro ao registrar log de processamento:', error);
        return null;
      }

      return logRecord?.id || null;

    } catch (error) {
      console.error('Erro ao registrar log de processamento:', error);
      return null;
    }
  }

  /**
   * Anonimiza dados de CPF/CNPJ para exclusão
   * @param affiliateId ID do afiliado
   * @param document Documento a ser anonimizado
   * @returns Resultado da anonimização
   */
  async anonymizeDocumentData(
    affiliateId: string, 
    document: string
  ): Promise<DataAnonymizationResult> {
    try {
      const now = new Date().toISOString();
      
      // Gerar hash do documento original para auditoria
      const originalHash = DocumentUtils.hashDocument(document);
      
      // Gerar documento anonimizado (irreversível)
      const anonymizedDocument = this.generateAnonymizedDocument(document);
      
      // Atualizar registro do afiliado
      const { error: updateError } = await supabase
        .from('affiliates')
        .update({
          document: anonymizedDocument,
          document_anonymized: true,
          document_anonymization_date: now,
          document_original_hash: originalHash,
          updated_at: now
        })
        .eq('id', affiliateId);

      if (updateError) {
        console.error('Erro ao anonimizar documento:', updateError);
        return {
          success: false,
          anonymizedFields: [],
          originalHash,
          anonymizationDate: now,
          error: updateError.message
        };
      }

      // Registrar log de processamento
      await this.logDataProcessing({
        affiliate_id: affiliateId,
        processing_type: 'anonymization',
        data_types: ['document', 'personal_data'],
        purpose: 'Anonimização para exclusão LGPD',
        legal_basis: 'legal_obligation',
        processing_date: now,
        anonymization_date: now
      });

      console.log(`Documento anonimizado para afiliado ${affiliateId}`);
      
      return {
        success: true,
        anonymizedFields: ['document'],
        originalHash,
        anonymizationDate: now
      };

    } catch (error) {
      console.error('Erro ao anonimizar dados:', error);
      return {
        success: false,
        anonymizedFields: [],
        originalHash: '',
        anonymizationDate: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  /**
   * Gera documento anonimizado irreversível
   * @param document Documento original
   * @returns Documento anonimizado
   */
  private generateAnonymizedDocument(document: string): string {
    // Detectar tipo do documento
    const cleanDocument = document.replace(/\D/g, '');
    const isCPF = cleanDocument.length === 11;
    
    if (isCPF) {
      // CPF anonimizado: XXX.XXX.XXX-XX
      return 'XXX.XXX.XXX-XX';
    } else {
      // CNPJ anonimizado: XX.XXX.XXX/XXXX-XX
      return 'XX.XXX.XXX/XXXX-XX';
    }
  }

  /**
   * Obtém histórico de consentimentos de um afiliado
   * @param affiliateId ID do afiliado
   * @returns Histórico completo de consentimentos
   */
  async getConsentHistory(affiliateId: string): Promise<ConsentRecord[]> {
    try {
      const { data: consents, error } = await supabase
        .from('lgpd_consent_records')
        .select('*')
        .eq('affiliate_id', affiliateId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar histórico de consentimentos:', error);
        return [];
      }

      return consents || [];

    } catch (error) {
      console.error('Erro ao buscar histórico de consentimentos:', error);
      return [];
    }
  }

  /**
   * Obtém logs de processamento de dados de um afiliado
   * @param affiliateId ID do afiliado
   * @param limit Limite de registros
   * @returns Logs de processamento
   */
  async getProcessingLogs(affiliateId: string, limit: number = 50): Promise<DataProcessingLog[]> {
    try {
      const { data: logs, error } = await supabase
        .from('lgpd_processing_logs')
        .select('*')
        .eq('affiliate_id', affiliateId)
        .order('processing_date', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Erro ao buscar logs de processamento:', error);
        return [];
      }

      return logs || [];

    } catch (error) {
      console.error('Erro ao buscar logs de processamento:', error);
      return [];
    }
  }

  /**
   * Gera relatório de conformidade LGPD para um afiliado
   * @param affiliateId ID do afiliado
   * @returns Relatório completo de conformidade
   */
  async generateComplianceReport(affiliateId: string): Promise<{
    affiliate: any;
    consents: ConsentRecord[];
    processingLogs: DataProcessingLog[];
    complianceStatus: {
      hasValidConsents: boolean;
      isDataAnonymized: boolean;
      lastProcessingDate: string;
      totalProcessingEvents: number;
    };
  }> {
    try {
      // Buscar dados do afiliado
      const { data: affiliate, error: affiliateError } = await supabase
        .from('affiliates')
        .select('*')
        .eq('id', affiliateId)
        .single();

      if (affiliateError) {
        throw new Error('Afiliado não encontrado');
      }

      // Buscar consentimentos e logs
      const [consents, processingLogs] = await Promise.all([
        this.getConsentHistory(affiliateId),
        this.getProcessingLogs(affiliateId, 100)
      ]);

      // Analisar status de conformidade
      const activeConsents = consents.filter(c => c.consent_given && !c.withdrawal_date);
      const hasValidConsents = activeConsents.length > 0;
      const isDataAnonymized = !!affiliate.document_anonymized;
      const lastProcessingDate = processingLogs[0]?.processing_date || '';
      const totalProcessingEvents = processingLogs.length;

      return {
        affiliate,
        consents,
        processingLogs,
        complianceStatus: {
          hasValidConsents,
          isDataAnonymized,
          lastProcessingDate,
          totalProcessingEvents
        }
      };

    } catch (error) {
      console.error('Erro ao gerar relatório de conformidade:', error);
      throw error;
    }
  }

  /**
   * Valida se processamento é permitido baseado nos consentimentos
   * @param affiliateId ID do afiliado
   * @param processingType Tipo de processamento
   * @param requiredConsents Consentimentos necessários
   * @returns true se processamento é permitido
   */
  async validateProcessingPermission(
    affiliateId: string,
    processingType: ProcessingType,
    requiredConsents: ConsentType[]
  ): Promise<boolean> {
    try {
      // Verificar consentimentos necessários
      const consentMap = await this.checkConsent(affiliateId, requiredConsents);
      
      // Todos os consentimentos devem estar válidos
      const hasAllConsents = requiredConsents.every(consent => consentMap[consent]);
      
      if (!hasAllConsents) {
        console.log(`Processamento negado para afiliado ${affiliateId}: consentimentos insuficientes`);
        return false;
      }

      // Registrar tentativa de processamento
      await this.logDataProcessing({
        affiliate_id: affiliateId,
        processing_type,
        data_types: ['validation_check'],
        purpose: 'Validação de permissão de processamento',
        legal_basis: 'consent',
        processing_date: new Date().toISOString()
      });

      return true;

    } catch (error) {
      console.error('Erro ao validar permissão de processamento:', error);
      return false;
    }
  }
}

// Singleton para uso direto
export const lgpdComplianceService = new LGPDComplianceService();

// Exportar métodos individuais para compatibilidade
export const {
  collectConsent,
  withdrawConsent,
  checkConsent,
  logDataProcessing,
  anonymizeDocumentData,
  getConsentHistory,
  getProcessingLogs,
  generateComplianceReport,
  validateProcessingPermission
} = lgpdComplianceService;