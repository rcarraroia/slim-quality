import { createHash } from 'crypto';

/**
 * Utilitários para validação e formatação de documentos brasileiros (CPF/CNPJ)
 * 
 * Suporte dual com detecção automática de tipo baseada no comprimento.
 * Implementa algoritmos oficiais de validação matemática brasileiros.
 * Inclui funcionalidades de LGPD compliance através de hash SHA-256.
 * 
 * @example
 * ```typescript
 * const utils = new DocumentUtils();
 * 
 * // Detecção automática
 * utils.detectType('12345678901'); // 'CPF'
 * utils.detectType('12345678000195'); // 'CNPJ'
 * 
 * // Validação
 * utils.isValidCPF('123.456.789-01'); // true/false
 * utils.isValidCNPJ('12.345.678/0001-95'); // true/false
 * 
 * // Formatação
 * utils.format('12345678901'); // '123.456.789-01'
 * utils.format('12345678000195'); // '12.345.678/0001-95'
 * ```
 */
export class DocumentUtils {
  
  /**
   * Sequências conhecidas de CPF inválidas
   */
  private readonly INVALID_CPF_SEQUENCES = [
    '00000000000', '11111111111', '22222222222', '33333333333',
    '44444444444', '55555555555', '66666666666', '77777777777',
    '88888888888', '99999999999'
  ];

  /**
   * Sequências conhecidas de CNPJ inválidas
   */
  private readonly INVALID_CNPJ_SEQUENCES = [
    '00000000000000', '11111111111111', '22222222222222', '33333333333333',
    '44444444444444', '55555555555555', '66666666666666', '77777777777777',
    '88888888888888', '99999999999999'
  ];

  /**
   * Detecta automaticamente o tipo de documento baseado no comprimento
   * @param document Documento a ser analisado
   * @returns Tipo do documento ou 'INVALID' se não reconhecido
   * @example detectType('12345678901') // 'CPF'
   */
  detectType(document: string): 'CPF' | 'CNPJ' | 'INVALID' {
    const normalized = this.normalize(document);
    
    if (normalized.length === 11) {
      return 'CPF';
    } else if (normalized.length === 14) {
      return 'CNPJ';
    }
    
    return 'INVALID';
  }

  /**
   * Remove toda formatação do documento (pontos, traços, barras)
   * @param document Documento a ser normalizado
   * @returns Documento apenas com números
   * @example normalize('123.456.789-01') // '12345678901'
   */
  normalize(document: string): string {
    if (!document) return '';
    return document.replace(/[^\d]/g, '');
  }

  /**
   * Formata documento automaticamente baseado no tipo detectado
   * @param document Documento a ser formatado
   * @returns Documento formatado ou string vazia se inválido
   * @example format('12345678901') // '123.456.789-01'
   */
  format(document: string): string {
    const type = this.detectType(document);
    
    switch (type) {
      case 'CPF':
        return this.formatCPF(document);
      case 'CNPJ':
        return this.formatCNPJ(document);
      default:
        return '';
    }
  }

  /**
   * Formata CPF no padrão XXX.XXX.XXX-XX
   * @param cpf CPF a ser formatado
   * @returns CPF formatado ou string vazia se inválido
   * @example formatCPF('12345678901') // '123.456.789-01'
   */
  formatCPF(cpf: string): string {
    const normalized = this.normalize(cpf);
    
    if (normalized.length !== 11) {
      return '';
    }
    
    return normalized.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }

  /**
   * Formata CNPJ no padrão XX.XXX.XXX/XXXX-XX
   * @param cnpj CNPJ a ser formatado
   * @returns CNPJ formatado ou string vazia se inválido
   * @example formatCNPJ('12345678000195') // '12.345.678/0001-95'
   */
  formatCNPJ(cnpj: string): string {
    const normalized = this.normalize(cnpj);
    
    if (normalized.length !== 14) {
      return '';
    }
    
    return normalized.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }

  /**
   * Valida CPF usando algoritmo oficial brasileiro
   * @param cpf CPF a ser validado
   * @returns true se válido, false caso contrário
   * @example isValidCPF('123.456.789-01') // true/false
   */
  isValidCPF(cpf: string): boolean {
    const normalized = this.normalize(cpf);
    
    // Verificar comprimento
    if (normalized.length !== 11) {
      return false;
    }
    
    // Verificar sequências conhecidas inválidas
    if (this.INVALID_CPF_SEQUENCES.includes(normalized)) {
      return false;
    }
    
    // Validar checksum
    return this.validateCPFChecksum(normalized);
  }

  /**
   * Valida CNPJ usando algoritmo oficial brasileiro
   * @param cnpj CNPJ a ser validado
   * @returns true se válido, false caso contrário
   * @example isValidCNPJ('12.345.678/0001-95') // true/false
   */
  isValidCNPJ(cnpj: string): boolean {
    const normalized = this.normalize(cnpj);
    
    // Verificar comprimento
    if (normalized.length !== 14) {
      return false;
    }
    
    // Verificar sequências conhecidas inválidas
    if (this.INVALID_CNPJ_SEQUENCES.includes(normalized)) {
      return false;
    }
    
    // Validar checksum
    return this.validateCNPJChecksum(normalized);
  }

  /**
   * Valida checksum do CPF usando algoritmo oficial
   * @param cpf CPF normalizado (apenas números)
   * @returns true se checksum válido
   */
  validateCPFChecksum(cpf: string): boolean {
    // Extrair dígitos
    const digits = cpf.split('').map(Number);
    
    // Calcular primeiro dígito verificador
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += digits[i] * (10 - i);
    }
    
    let remainder = sum % 11;
    const firstDigit = remainder < 2 ? 0 : 11 - remainder;
    
    if (digits[9] !== firstDigit) {
      return false;
    }
    
    // Calcular segundo dígito verificador
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += digits[i] * (11 - i);
    }
    
    remainder = sum % 11;
    const secondDigit = remainder < 2 ? 0 : 11 - remainder;
    
    return digits[10] === secondDigit;
  }

  /**
   * Valida checksum do CNPJ usando algoritmo oficial
   * @param cnpj CNPJ normalizado (apenas números)
   * @returns true se checksum válido
   */
  validateCNPJChecksum(cnpj: string): boolean {
    // Extrair dígitos
    const digits = cnpj.split('').map(Number);
    
    // Pesos para primeiro dígito verificador
    const firstWeights = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    
    // Calcular primeiro dígito verificador
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += digits[i] * firstWeights[i];
    }
    
    let remainder = sum % 11;
    const firstDigit = remainder < 2 ? 0 : 11 - remainder;
    
    if (digits[12] !== firstDigit) {
      return false;
    }
    
    // Pesos para segundo dígito verificador
    const secondWeights = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    
    // Calcular segundo dígito verificador
    sum = 0;
    for (let i = 0; i < 13; i++) {
      sum += digits[i] * secondWeights[i];
    }
    
    remainder = sum % 11;
    const secondDigit = remainder < 2 ? 0 : 11 - remainder;
    
    return digits[13] === secondDigit;
  }

  /**
   * Mascara documento para exibição (oculta parte dos dígitos)
   * @param document Documento a ser mascarado
   * @returns Documento mascarado para exibição
   * @example maskForDisplay('12345678901') // 'XXX.XXX.XXX-**'
   */
  maskForDisplay(document: string): string {
    const type = this.detectType(document);
    const normalized = this.normalize(document);
    
    switch (type) {
      case 'CPF':
        // CPF: XXX.XXX.XXX-**
        return normalized.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, 'XXX.XXX.XXX-**');
      
      case 'CNPJ':
        // CNPJ: XX.XXX.XXX/****-**
        return normalized.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, 'XX.XXX.XXX/****-**');
      
      default:
        return '';
    }
  }

  /**
   * Gera hash SHA-256 do documento para armazenamento seguro (LGPD compliance)
   * @param document Documento a ser hasheado
   * @returns Hash SHA-256 em hexadecimal
   * @example hashForStorage('12345678901') // 'a1b2c3d4e5f6...'
   */
  hashForStorage(document: string): string {
    const normalized = this.normalize(document);
    
    if (!normalized) {
      return '';
    }
    
    return createHash('sha256')
      .update(normalized)
      .digest('hex');
  }

  /**
   * Valida documento automaticamente baseado no tipo detectado
   * @param document Documento a ser validado
   * @returns true se válido, false caso contrário
   * @example isValid('123.456.789-01') // true/false
   */
  isValid(document: string): boolean {
    const type = this.detectType(document);
    
    switch (type) {
      case 'CPF':
        return this.isValidCPF(document);
      case 'CNPJ':
        return this.isValidCNPJ(document);
      default:
        return false;
    }
  }

  /**
   * Retorna informações completas sobre o documento
   * @param document Documento a ser analisado
   * @returns Objeto com informações do documento
   */
  getDocumentInfo(document: string) {
    const normalized = this.normalize(document);
    const type = this.detectType(document);
    const isValid = this.isValid(document);
    const formatted = this.format(document);
    const masked = this.maskForDisplay(document);
    const hash = this.hashForStorage(document);

    return {
      original: document,
      normalized,
      type,
      isValid,
      formatted,
      masked,
      hash,
      length: normalized.length
    };
  }
}

// Exportar instância singleton para uso direto
export const documentUtils = new DocumentUtils();

// Exportar funções individuais para compatibilidade
export const {
  detectType,
  normalize,
  format,
  formatCPF,
  formatCNPJ,
  isValidCPF,
  isValidCNPJ,
  validateCPFChecksum,
  validateCNPJChecksum,
  maskForDisplay,
  hashForStorage,
  isValid,
  getDocumentInfo
} = documentUtils;