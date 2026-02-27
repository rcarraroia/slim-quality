/**
 * Validators - Funções de validação e formatação de documentos
 * ETAPA 1: Base de Dados e Tipos de Afiliados
 * 
 * Este módulo fornece funções para validar e formatar CPF e CNPJ brasileiros.
 */

/**
 * Remove todos os caracteres não numéricos de uma string
 * 
 * @param document - Documento com ou sem formatação
 * @returns String contendo apenas dígitos numéricos
 * 
 * @example
 * ```typescript
 * parseDocument('123.456.789-10') // '12345678910'
 * parseDocument('12.345.678/0001-90') // '12345678000190'
 * ```
 */
export function parseDocument(document: string): string {
  return document.replace(/\D/g, '');
}

/**
 * Formata uma string de CPF no padrão XXX.XXX.XXX-XX
 * 
 * @param cpf - CPF com ou sem formatação (11 dígitos)
 * @returns CPF formatado ou string vazia se inválido
 * 
 * @example
 * ```typescript
 * formatCPF('12345678910') // '123.456.789-10'
 * formatCPF('123.456.789-10') // '123.456.789-10'
 * ```
 */
export function formatCPF(cpf: string): string {
  const cleaned = parseDocument(cpf);
  
  if (cleaned.length !== 11) {
    return '';
  }
  
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

/**
 * Formata uma string de CNPJ no padrão XX.XXX.XXX/XXXX-XX
 * 
 * @param cnpj - CNPJ com ou sem formatação (14 dígitos)
 * @returns CNPJ formatado ou string vazia se inválido
 * 
 * @example
 * ```typescript
 * formatCNPJ('12345678000190') // '12.345.678/0001-90'
 * formatCNPJ('12.345.678/0001-90') // '12.345.678/0001-90'
 * ```
 */
export function formatCNPJ(cnpj: string): string {
  const cleaned = parseDocument(cnpj);
  
  if (cleaned.length !== 14) {
    return '';
  }
  
  return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

/**
 * Valida os dígitos verificadores de um CPF
 * 
 * @param cpf - CPF sem formatação (apenas números)
 * @returns true se os dígitos verificadores são válidos
 */
function validateCPFCheckDigits(cpf: string): boolean {
  // Calcular primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf.charAt(i)) * (10 - i);
  }
  let digit1 = 11 - (sum % 11);
  if (digit1 >= 10) digit1 = 0;
  
  // Calcular segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf.charAt(i)) * (11 - i);
  }
  let digit2 = 11 - (sum % 11);
  if (digit2 >= 10) digit2 = 0;
  
  // Verificar se os dígitos calculados correspondem aos informados
  return (
    parseInt(cpf.charAt(9)) === digit1 &&
    parseInt(cpf.charAt(10)) === digit2
  );
}

/**
 * Valida os dígitos verificadores de um CNPJ
 * 
 * @param cnpj - CNPJ sem formatação (apenas números)
 * @returns true se os dígitos verificadores são válidos
 */
function validateCNPJCheckDigits(cnpj: string): boolean {
  // Pesos para cálculo do primeiro dígito
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  
  // Calcular primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cnpj.charAt(i)) * weights1[i];
  }
  let digit1 = sum % 11;
  digit1 = digit1 < 2 ? 0 : 11 - digit1;
  
  // Pesos para cálculo do segundo dígito
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  
  // Calcular segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(cnpj.charAt(i)) * weights2[i];
  }
  let digit2 = sum % 11;
  digit2 = digit2 < 2 ? 0 : 11 - digit2;
  
  // Verificar se os dígitos calculados correspondem aos informados
  return (
    parseInt(cnpj.charAt(12)) === digit1 &&
    parseInt(cnpj.charAt(13)) === digit2
  );
}

/**
 * Valida um CPF brasileiro completo
 * 
 * Verifica:
 * - Comprimento correto (11 dígitos)
 * - Não possui todos os dígitos iguais
 * - Dígitos verificadores são válidos
 * 
 * @param cpf - CPF com ou sem formatação
 * @returns true se o CPF é válido
 * 
 * @example
 * ```typescript
 * validateCPF('123.456.789-10') // false (dígitos verificadores inválidos)
 * validateCPF('111.111.111-11') // false (todos dígitos iguais)
 * validateCPF('191.000.000-00') // true (CPF válido)
 * ```
 */
export function validateCPF(cpf: string): boolean {
  const cleaned = parseDocument(cpf);
  
  // Verificar comprimento
  if (cleaned.length !== 11) {
    return false;
  }
  
  // Verificar se todos os dígitos são iguais
  if (/^(\d)\1{10}$/.test(cleaned)) {
    return false;
  }
  
  // Validar dígitos verificadores
  return validateCPFCheckDigits(cleaned);
}

/**
 * Valida um CNPJ brasileiro completo
 * 
 * Verifica:
 * - Comprimento correto (14 dígitos)
 * - Não possui todos os dígitos iguais
 * - Dígitos verificadores são válidos
 * 
 * @param cnpj - CNPJ com ou sem formatação
 * @returns true se o CNPJ é válido
 * 
 * @example
 * ```typescript
 * validateCNPJ('12.345.678/0001-90') // false (dígitos verificadores inválidos)
 * validateCNPJ('11.111.111/1111-11') // false (todos dígitos iguais)
 * validateCNPJ('11.222.333/0001-81') // true (CNPJ válido)
 * ```
 */
export function validateCNPJ(cnpj: string): boolean {
  const cleaned = parseDocument(cnpj);
  
  // Verificar comprimento
  if (cleaned.length !== 14) {
    return false;
  }
  
  // Verificar se todos os dígitos são iguais
  if (/^(\d)\1{13}$/.test(cleaned)) {
    return false;
  }
  
  // Validar dígitos verificadores
  return validateCNPJCheckDigits(cleaned);
}

// ============================================
// ETAPA 2: VALIDADORES DE WALLET E ENDEREÇO
// ============================================

/**
 * Valida formato UUID de Wallet ID do Asaas
 * 
 * Formato esperado: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (lowercase)
 * 
 * @param walletId - Wallet ID a ser validado
 * @returns true se o formato é válido
 * 
 * @example
 * ```typescript
 * validateWalletIdFormat('c0c1688f-636b-42c0-b6ee-7339182276b7') // true
 * validateWalletIdFormat('wal_12345678901234567890') // false (formato antigo)
 * validateWalletIdFormat('C0C1688F-636B-42C0-B6EE-7339182276B7') // false (uppercase)
 * ```
 */
export function validateWalletIdFormat(walletId: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
  return uuidRegex.test(walletId);
}

/**
 * Valida formato de CEP brasileiro
 * 
 * Aceita formatos: XXXXX-XXX ou XXXXXXXX
 * 
 * @param cep - CEP a ser validado
 * @returns true se o formato é válido
 * 
 * @example
 * ```typescript
 * validateCEP('12345-678') // true
 * validateCEP('12345678') // true
 * validateCEP('1234-567') // false
 * ```
 */
export function validateCEP(cep: string): boolean {
  const cleaned = cep.replace(/\D/g, '');
  return cleaned.length === 8;
}

/**
 * Valida formato de telefone brasileiro
 * 
 * Aceita formatos: +55XXXXXXXXXXX, (XX) XXXXX-XXXX, etc.
 * 
 * @param phone - Telefone a ser validado
 * @returns true se o formato é válido
 * 
 * @example
 * ```typescript
 * validateBrazilianPhone('+5511999887766') // true
 * validateBrazilianPhone('(11) 99988-7766') // true
 * validateBrazilianPhone('11999887766') // true
 * ```
 */
export function validateBrazilianPhone(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '');
  
  // Deve ter 10 ou 11 dígitos (com ou sem código do país)
  if (cleaned.length === 10 || cleaned.length === 11) {
    return true;
  }
  
  // Com código do país (+55)
  if (cleaned.length === 12 || cleaned.length === 13) {
    return cleaned.startsWith('55');
  }
  
  return false;
}

/**
 * Formata CEP no padrão XXXXX-XXX
 * 
 * @param cep - CEP com ou sem formatação
 * @returns CEP formatado ou string vazia se inválido
 * 
 * @example
 * ```typescript
 * formatCEP('12345678') // '12345-678'
 * formatCEP('12345-678') // '12345-678'
 * ```
 */
export function formatCEP(cep: string): string {
  const cleaned = cep.replace(/\D/g, '');
  
  if (cleaned.length !== 8) {
    return '';
  }
  
  return cleaned.replace(/(\d{5})(\d{3})/, '$1-$2');
}

/**
 * Formata telefone brasileiro no padrão +55 (XX) XXXXX-XXXX
 * 
 * @param phone - Telefone com ou sem formatação
 * @returns Telefone formatado ou string vazia se inválido
 * 
 * @example
 * ```typescript
 * formatBrazilianPhone('11999887766') // '+55 (11) 99988-7766'
 * formatBrazilianPhone('5511999887766') // '+55 (11) 99988-7766'
 * ```
 */
export function formatBrazilianPhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  
  // Remover código do país se presente
  if (cleaned.startsWith('55') && (cleaned.length === 12 || cleaned.length === 13)) {
    cleaned = cleaned.substring(2);
  }
  
  // Validar comprimento
  if (cleaned.length !== 10 && cleaned.length !== 11) {
    return '';
  }
  
  // Formatar
  if (cleaned.length === 10) {
    // Telefone fixo: (XX) XXXX-XXXX
    return `+55 (${cleaned.substring(0, 2)}) ${cleaned.substring(2, 6)}-${cleaned.substring(6)}`;
  } else {
    // Celular: (XX) XXXXX-XXXX
    return `+55 (${cleaned.substring(0, 2)}) ${cleaned.substring(2, 7)}-${cleaned.substring(7)}`;
  }
}
