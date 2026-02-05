/**
 * Document Mask Utilities
 * Sistema de Validação por CPF/CNPJ para Afiliados
 * 
 * Utilitários para aplicação de máscaras dinâmicas em documentos CPF/CNPJ
 * 
 * @example
 * ```typescript
 * import { applyDocumentMask, detectDocumentType } from '@/utils/document-mask';
 * 
 * const masked = applyDocumentMask('12345678901'); // '123.456.789-01'
 * const type = detectDocumentType('12345678901'); // 'CPF'
 * ```
 */

export type DocumentType = 'CPF' | 'CNPJ' | 'INVALID';

/**
 * Detecta o tipo de documento baseado no comprimento dos dígitos
 * @param value Valor do documento (com ou sem formatação)
 * @returns Tipo do documento detectado
 */
export const detectDocumentType = (value: string): DocumentType => {
  const numbers = value.replace(/\D/g, '');
  
  if (numbers.length === 0) return 'INVALID';
  if (numbers.length <= 11) return 'CPF';
  if (numbers.length <= 14) return 'CNPJ';
  return 'INVALID';
};

/**
 * Remove toda formatação do documento, mantendo apenas números
 * @param value Documento formatado
 * @returns Apenas os números do documento
 */
export const removeDocumentMask = (value: string): string => {
  return value.replace(/\D/g, '');
};

/**
 * Aplica máscara de CPF: XXX.XXX.XXX-XX
 * @param value Valor do CPF (apenas números ou com formatação parcial)
 * @returns CPF formatado
 */
export const applyCPFMask = (value: string): string => {
  const numbers = removeDocumentMask(value);
  
  // Limitar a 11 dígitos
  const limitedNumbers = numbers.slice(0, 11);
  
  if (limitedNumbers.length <= 3) {
    return limitedNumbers;
  }
  
  if (limitedNumbers.length <= 6) {
    return `${limitedNumbers.slice(0, 3)}.${limitedNumbers.slice(3)}`;
  }
  
  if (limitedNumbers.length <= 9) {
    return `${limitedNumbers.slice(0, 3)}.${limitedNumbers.slice(3, 6)}.${limitedNumbers.slice(6)}`;
  }
  
  return `${limitedNumbers.slice(0, 3)}.${limitedNumbers.slice(3, 6)}.${limitedNumbers.slice(6, 9)}-${limitedNumbers.slice(9)}`;
};

/**
 * Aplica máscara de CNPJ: XX.XXX.XXX/XXXX-XX
 * @param value Valor do CNPJ (apenas números ou com formatação parcial)
 * @returns CNPJ formatado
 */
export const applyCNPJMask = (value: string): string => {
  const numbers = removeDocumentMask(value);
  
  // Limitar a 14 dígitos
  const limitedNumbers = numbers.slice(0, 14);
  
  if (limitedNumbers.length <= 2) {
    return limitedNumbers;
  }
  
  if (limitedNumbers.length <= 5) {
    return `${limitedNumbers.slice(0, 2)}.${limitedNumbers.slice(2)}`;
  }
  
  if (limitedNumbers.length <= 8) {
    return `${limitedNumbers.slice(0, 2)}.${limitedNumbers.slice(2, 5)}.${limitedNumbers.slice(5)}`;
  }
  
  if (limitedNumbers.length <= 12) {
    return `${limitedNumbers.slice(0, 2)}.${limitedNumbers.slice(2, 5)}.${limitedNumbers.slice(5, 8)}/${limitedNumbers.slice(8)}`;
  }
  
  return `${limitedNumbers.slice(0, 2)}.${limitedNumbers.slice(2, 5)}.${limitedNumbers.slice(5, 8)}/${limitedNumbers.slice(8, 12)}-${limitedNumbers.slice(12)}`;
};

/**
 * Aplica máscara dinâmica baseada no tipo detectado automaticamente
 * @param value Valor do documento
 * @returns Documento formatado com a máscara apropriada
 */
export const applyDocumentMask = (value: string): string => {
  if (!value) return '';
  
  const type = detectDocumentType(value);
  
  switch (type) {
    case 'CPF':
      return applyCPFMask(value);
    case 'CNPJ':
      return applyCNPJMask(value);
    default:
      // Se inválido, retorna apenas números (para permitir digitação)
      return removeDocumentMask(value);
  }
};

/**
 * Obtém o placeholder apropriado baseado no tipo de documento
 * @param value Valor atual do documento
 * @param defaultPlaceholder Placeholder padrão se não conseguir detectar
 * @returns Placeholder formatado
 */
export const getDocumentPlaceholder = (
  value: string, 
  defaultPlaceholder: string = "Digite seu CPF ou CNPJ"
): string => {
  const type = detectDocumentType(value);
  
  switch (type) {
    case 'CPF':
      return 'XXX.XXX.XXX-XX';
    case 'CNPJ':
      return 'XX.XXX.XXX/XXXX-XX';
    default:
      return defaultPlaceholder;
  }
};

/**
 * Verifica se o documento está completo (tem todos os dígitos necessários)
 * @param value Documento formatado ou não
 * @returns true se o documento está completo
 */
export const isDocumentComplete = (value: string): boolean => {
  const numbers = removeDocumentMask(value);
  const type = detectDocumentType(value);
  
  switch (type) {
    case 'CPF':
      return numbers.length === 11;
    case 'CNPJ':
      return numbers.length === 14;
    default:
      return false;
  }
};

/**
 * Obtém informações sobre o documento
 * @param value Documento
 * @returns Informações detalhadas sobre o documento
 */
export const getDocumentInfo = (value: string) => {
  const numbers = removeDocumentMask(value);
  const type = detectDocumentType(value);
  const formatted = applyDocumentMask(value);
  const isComplete = isDocumentComplete(value);
  
  return {
    original: value,
    numbers,
    type,
    formatted,
    isComplete,
    length: numbers.length,
    maxLength: type === 'CPF' ? 11 : type === 'CNPJ' ? 14 : 0
  };
};

/**
 * Valida se o formato do documento está correto (não valida dígitos verificadores)
 * @param value Documento
 * @returns true se o formato está correto
 */
export const isValidDocumentFormat = (value: string): boolean => {
  const info = getDocumentInfo(value);
  return info.isComplete && info.type !== 'INVALID';
};