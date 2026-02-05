/**
 * Document Validation Service
 * Sistema de Validação por CPF/CNPJ para Afiliados
 * 
 * Responsável por validação completa de documentos incluindo:
 * - Validação de formato e checksum
 * - Verificação de duplicação no banco
 * - Logging de validações para auditoria
 * 
 * @example
 * ```typescript
 * const service = new DocumentValidationService();
 * const result = await service.validateDocument('123.456.789-01', 'affiliate_123');
 * ```
 */

import { supabase } from '../config/supabase';
import { documentUtils } from '../utils/document-utils';
import { lgpdComplianceService } from './lgpd-compliance.service';

export interface DocumentValidationResult {
  isValid: boolean;
  document: string;
  type: 'CPF' | 'CNPJ' | 'INVALID';
  errors: string[];
  isDuplicate: boolean;
  existingAffiliateId?: string;
  validationId?: string;
}

export interface ValidationLogEntry {
  id?: string;
  document_hash: string;
  document_type: 'CPF' | 'CNPJ';
  affiliate_id?: string;
  validation_result: 'VALID' | 'INVALID' | 'DUPLICATE';
  errors: string[];
  created_at?: string;
}

export class DocumentValidationService {
  
  /**
   * Valida formato do documento (CPF ou CNPJ)
   * @param document Documento a ser validado
   * @returns true se formato válido
   */
  validateFormat(document: string): boolean {
    const type = documentUtils.detectType(document);
    return type !== 'INVALID';
  }

  /**
   * Valida checksum do documento usando algoritmo oficial
   * @param document Documento a ser validado
   * @returns true se checksum válido
   */
  validateChecksum(document: string): boolean {
    return documentUtils.isValid(document);
  }

  /**
   * Verifica se documento já está cadastrado no sistema
   * @param document Documento a ser verificado
   * @param excludeAffiliateId ID do afiliado a ser excluído da verificação (para updates)
   * @returns Resultado da verificação de duplicação
   */
  async checkDuplication(document: string, excludeAffiliateId?: string): Promise<{
    isDuplicate: boolean;
    existingAffiliateId?: string;
  }> {
    try {
      const documentHash = documentUtils.hashForStorage(document);
      
      let query = supabase
        .from('affiliates')
        .select('id, document_hash')
        .eq('document_hash', documentHash)
        .eq('is_active', true); // Apenas afiliados ativos
      
      // Excluir afiliado específico se fornecido (para updates)
      if (excludeAffiliateId) {
        query = query.neq('id', excludeAffiliateId);
      }
      
      const { data, error } = await query.single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('Erro ao verificar duplicação:', error);
        return { isDuplicate: false };
      }
      
      return {
        isDuplicate: !!data,
        existingAffiliateId: data?.id
      };
    } catch (error) {
      console.error('Erro ao verificar duplicação:', error);
      return { isDuplicate: false };
    }
  }

  /**
   * Registra log de validação para auditoria
   * @param logEntry Dados do log de validação
   * @returns ID do log criado
   */
  async logValidation(logEntry: Omit<ValidationLogEntry, 'id' | 'created_at'>): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('document_validation_logs')
        .insert([{
          ...logEntry,
          created_at: new Date().toISOString()
        }])
        .select('id')
        .single();
      
      if (error) {
        console.error('Erro ao registrar log de validação:', error);
        return null;
      }
      
      return data?.id || null;
    } catch (error) {
      console.error('Erro ao registrar log de validação:', error);
      return null;
    }
  }

  /**
   * Valida documento completo (formato + checksum + duplicação)
   * @param document Documento a ser validado
   * @param affiliateId ID do afiliado (opcional, para logs)
   * @param excludeFromDuplication ID do afiliado a excluir da verificação de duplicação
   * @returns Resultado completo da validação
   */
  async validateDocument(
    document: string, 
    affiliateId?: string,
    excludeFromDuplication?: string
  ): Promise<DocumentValidationResult> {
    const errors: string[] = [];
    const documentInfo = documentUtils.getDocumentInfo(document);
    
    // 1. Validar formato
    if (!this.validateFormat(document)) {
      errors.push('Formato de documento inválido');
    }
    
    // 2. Validar checksum (apenas se formato válido)
    if (documentInfo.type !== 'INVALID' && !this.validateChecksum(document)) {
      errors.push(`${documentInfo.type} com dígitos verificadores inválidos`);
    }
    
    // 3. Verificar duplicação (apenas se documento válido)
    let isDuplicate = false;
    let existingAffiliateId: string | undefined;
    
    if (errors.length === 0) {
      const duplicationCheck = await this.checkDuplication(document, excludeFromDuplication);
      isDuplicate = duplicationCheck.isDuplicate;
      existingAffiliateId = duplicationCheck.existingAffiliateId;
      
      if (isDuplicate) {
        errors.push('Documento já cadastrado no sistema');
      }
    }
    
    // 4. Determinar resultado final
    const isValid = errors.length === 0;
    const validationResult: 'VALID' | 'INVALID' | 'DUPLICATE' = 
      isDuplicate ? 'DUPLICATE' : 
      isValid ? 'VALID' : 'INVALID';
    
    // 5. Registrar log de validação
    let validationId: string | null = null;
    
    if (documentInfo.type !== 'INVALID') {
      validationId = await this.logValidation({
        document_hash: documentInfo.hash,
        document_type: documentInfo.type,
        affiliate_id: affiliateId,
        validation_result: validationResult,
        errors
      });
      
      // Registrar processamento LGPD se afiliado fornecido
      if (affiliateId) {
        await lgpdComplianceService.logDataProcessing({
          affiliate_id: affiliateId,
          processing_type: 'processing',
          data_types: ['document', 'validation_data'],
          purpose: 'Validação de documento CPF/CNPJ',
          legal_basis: 'legitimate_interests',
          processing_date: new Date().toISOString()
        });
      }
    }
    
    return {
      isValid,
      document: documentInfo.formatted || document,
      type: documentInfo.type,
      errors,
      isDuplicate,
      existingAffiliateId,
      validationId: validationId || undefined
    };
  }

  /**
   * Valida múltiplos documentos em lote
   * @param documents Array de documentos para validar
   * @param affiliateId ID do afiliado (opcional)
   * @returns Array com resultados de validação
   */
  async validateDocuments(
    documents: string[], 
    affiliateId?: string
  ): Promise<DocumentValidationResult[]> {
    const results: DocumentValidationResult[] = [];
    
    for (const document of documents) {
      const result = await this.validateDocument(document, affiliateId);
      results.push(result);
    }
    
    return results;
  }

  /**
   * Obtém histórico de validações de um afiliado
   * @param affiliateId ID do afiliado
   * @param limit Limite de registros (padrão: 50)
   * @returns Histórico de validações
   */
  async getValidationHistory(affiliateId: string, limit: number = 50): Promise<ValidationLogEntry[]> {
    try {
      const { data, error } = await supabase
        .from('document_validation_logs')
        .select('*')
        .eq('affiliate_id', affiliateId)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) {
        console.error('Erro ao buscar histórico de validações:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Erro ao buscar histórico de validações:', error);
      return [];
    }
  }

  /**
   * Obtém estatísticas de validação
   * @param startDate Data inicial (opcional)
   * @param endDate Data final (opcional)
   * @returns Estatísticas de validação
   */
  async getValidationStats(startDate?: string, endDate?: string): Promise<{
    total: number;
    valid: number;
    invalid: number;
    duplicate: number;
    cpf: number;
    cnpj: number;
  }> {
    try {
      let query = supabase
        .from('document_validation_logs')
        .select('validation_result, document_type');
      
      if (startDate) {
        query = query.gte('created_at', startDate);
      }
      
      if (endDate) {
        query = query.lte('created_at', endDate);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Erro ao buscar estatísticas:', error);
        return { total: 0, valid: 0, invalid: 0, duplicate: 0, cpf: 0, cnpj: 0 };
      }
      
      const stats = {
        total: data?.length || 0,
        valid: data?.filter(d => d.validation_result === 'VALID').length || 0,
        invalid: data?.filter(d => d.validation_result === 'INVALID').length || 0,
        duplicate: data?.filter(d => d.validation_result === 'DUPLICATE').length || 0,
        cpf: data?.filter(d => d.document_type === 'CPF').length || 0,
        cnpj: data?.filter(d => d.document_type === 'CNPJ').length || 0
      };
      
      return stats;
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      return { total: 0, valid: 0, invalid: 0, duplicate: 0, cpf: 0, cnpj: 0 };
    }
  }
}

// Singleton para uso direto
export const documentValidationService = new DocumentValidationService();

// Exportar métodos individuais para compatibilidade
export const {
  validateFormat,
  validateChecksum,
  checkDuplication,
  logValidation,
  validateDocument,
  validateDocuments,
  getValidationHistory,
  getValidationStats
} = documentValidationService;