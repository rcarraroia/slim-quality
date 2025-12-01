/**
 * Data Sanitization Utilities
 * Sprint 7: Correções Críticas
 *
 * Previne XSS e sanitiza dados de entrada
 */

export class DataSanitizer {
  /**
   * Sanitiza texto removendo HTML/scripts potencialmente maliciosos
   */
  static sanitizeText(text: string): string {
    if (!text || typeof text !== 'string') return '';

    // Simple HTML tag removal (basic XSS prevention)
    const sanitized = text
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocols
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ''); // Remove script tags

    return sanitized.trim();
  }

  /**
   * Sanitiza email (remove espaços, converte para lowercase)
   */
  static sanitizeEmail(email: string): string {
    if (!email || typeof email !== 'string') return '';

    return email.toLowerCase().trim();
  }

  /**
   * Sanitiza telefone (remove caracteres não numéricos, mantém apenas dígitos)
   */
  static sanitizePhone(phone: string): string {
    if (!phone || typeof phone !== 'string') return '';

    // Remove all non-digit characters except + at the beginning
    const cleaned = phone.replace(/[^\d+]/g, '');

    // Ensure it starts with + or digit
    if (!cleaned.match(/^(\+|[\d])/)) {
      return '';
    }

    return cleaned;
  }

  /**
   * Sanitiza nome (remove caracteres especiais, mantém apenas letras, espaços e acentos)
   */
  static sanitizeName(name: string): string {
    if (!name || typeof name !== 'string') return '';

    // Allow letters, spaces, and common accented characters
    const sanitized = name.replace(/[^a-zA-ZÀ-ÿ\s]/g, '');

    // Remove extra spaces
    return sanitized.replace(/\s+/g, ' ').trim();
  }

  /**
   * Sanitiza documento (CPF/CNPJ) - remove tudo exceto dígitos
   */
  static sanitizeDocument(document: string): string {
    if (!document || typeof document !== 'string') return '';

    // Remove all non-digit characters
    return document.replace(/\D/g, '');
  }

  /**
   * Sanitiza código de referência (remove espaços, converte para uppercase)
   */
  static sanitizeReferralCode(code: string): string {
    if (!code || typeof code !== 'string') return '';

    return code.replace(/\s/g, '').toUpperCase();
  }

  /**
   * Sanitiza chave PIX (depende do tipo)
   */
  static sanitizePixKey(pixKey: string, type?: string): string {
    if (!pixKey || typeof pixKey !== 'string') return '';

    const trimmed = pixKey.trim();

    // Email PIX
    if (type === 'email' || trimmed.includes('@')) {
      return this.sanitizeEmail(trimmed);
    }

    // Phone PIX
    if (type === 'phone' || /^\+?\d/.test(trimmed)) {
      return this.sanitizePhone(trimmed);
    }

    // CPF/CNPJ PIX
    if (type === 'document' || /^\d{11,14}$/.test(trimmed.replace(/\D/g, ''))) {
      return this.sanitizeDocument(trimmed);
    }

    // Random key or other - remove spaces
    return trimmed.replace(/\s/g, '');
  }

  /**
   * Sanitiza dados de criação de afiliado
   */
  static sanitizeAffiliateData(data: {
    name?: string;
    email?: string;
    phone?: string;
    document?: string;
    walletId?: string;
    referralCode?: string;
    pixKey?: string;
  }): {
    name: string;
    email: string;
    phone: string;
    document: string;
    walletId: string;
    referralCode?: string;
    pixKey?: string;
  } {
    return {
      name: this.sanitizeName(data.name || ''),
      email: this.sanitizeEmail(data.email || ''),
      phone: this.sanitizePhone(data.phone || ''),
      document: this.sanitizeDocument(data.document || ''),
      walletId: data.walletId || '', // Wallet ID is required, not sanitized
      referralCode: data.referralCode ? this.sanitizeReferralCode(data.referralCode) : undefined,
      pixKey: data.pixKey ? this.sanitizePixKey(data.pixKey) : undefined
    };
  }

  /**
   * Valida se dados sanitizados são válidos
   */
  static validateSanitizedData(data: {
    name: string;
    email: string;
    phone: string;
    document: string;
  }): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Name validation
    if (!data.name || data.name.length < 2) {
      errors.push('Nome deve ter pelo menos 2 caracteres');
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!data.email || !emailRegex.test(data.email)) {
      errors.push('Email inválido');
    }

    // Phone validation (Brazilian format)
    const phoneRegex = /^\+?55\d{10,11}$|^\d{10,11}$/;
    if (!data.phone || !phoneRegex.test(data.phone.replace(/\D/g, ''))) {
      errors.push('Telefone inválido');
    }

    // Document validation (CPF/CNPJ)
    const docDigits = data.document.replace(/\D/g, '');
    if (!docDigits || (docDigits.length !== 11 && docDigits.length !== 14)) {
      errors.push('CPF/CNPJ inválido');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Convenience functions for common sanitization
export const sanitizeText = DataSanitizer.sanitizeText;
export const sanitizeEmail = DataSanitizer.sanitizeEmail;
export const sanitizePhone = DataSanitizer.sanitizePhone;
export const sanitizeName = DataSanitizer.sanitizeName;
export const sanitizeDocument = DataSanitizer.sanitizeDocument;
export const sanitizeReferralCode = DataSanitizer.sanitizeReferralCode;
export const sanitizePixKey = DataSanitizer.sanitizePixKey;
export const sanitizeAffiliateData = DataSanitizer.sanitizeAffiliateData;
export const validateSanitizedData = DataSanitizer.validateSanitizedData;