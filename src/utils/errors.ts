/**
 * Custom Error Hierarchy
 * Sprint 7: Correções Críticas
 *
 * Hierarquia consistente de erros para tratamento padronizado
 */

export abstract class DomainError extends Error {
  readonly code: string;
  readonly statusCode: number;

  constructor(message: string, code: string, statusCode: number) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;

    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode
    };
  }
}

// Validation Errors (400)
export class ValidationError extends DomainError {
  constructor(message: string, public readonly field?: string) {
    super(message, 'VALIDATION_ERROR', 400);
  }
}

export class InvalidWalletError extends ValidationError {
  constructor(walletId: string) {
    super(`Wallet ID ${walletId} inválida`, 'walletId');
  }
}

export class DuplicateAffiliateError extends ValidationError {
  constructor(field: string, value: string) {
    super(`Afiliado já existe com ${field}: ${value}`, field);
  }
}

export class InvalidReferralCodeError extends ValidationError {
  constructor(code: string) {
    super(`Código de referência inválido: ${code}`, 'referralCode');
  }
}

// Not Found Errors (404)
export class NotFoundError extends DomainError {
  constructor(resource: string, id?: string) {
    const message = id ? `${resource} não encontrado: ${id}` : `${resource} não encontrado`;
    super(message, 'NOT_FOUND', 404);
  }
}

export class AffiliateNotFoundError extends NotFoundError {
  constructor(id: string) {
    super('Afiliado', id);
  }
}

// Authorization Errors (403)
export class ForbiddenError extends DomainError {
  constructor(message: string = 'Acesso negado') {
    super(message, 'FORBIDDEN', 403);
  }
}

export class InsufficientPermissionsError extends ForbiddenError {
  constructor(requiredRole?: string) {
    const message = requiredRole
      ? `Permissões insuficientes. Necessário: ${requiredRole}`
      : 'Permissões insuficientes';
    super(message);
  }
}

// Business Logic Errors (409)
export class ConflictError extends DomainError {
  constructor(message: string) {
    super(message, 'CONFLICT', 409);
  }
}

export class AffiliateInactiveError extends ConflictError {
  constructor(affiliateId: string) {
    super(`Afiliado inativo não pode realizar operações: ${affiliateId}`);
  }
}

export class InsufficientBalanceError extends ConflictError {
  constructor(required: number, available: number) {
    super(`Saldo insuficiente. Necessário: R$ ${(required / 100).toFixed(2)}, Disponível: R$ ${(available / 100).toFixed(2)}`);
  }
}

// External Service Errors (502)
export class ExternalServiceError extends DomainError {
  constructor(service: string, originalError?: string) {
    super(`Erro no serviço externo ${service}${originalError ? `: ${originalError}` : ''}`, 'EXTERNAL_SERVICE_ERROR', 502);
  }
}

export class AsaasServiceError extends ExternalServiceError {
  constructor(operation: string, originalError?: string) {
    super(`Asaas (${operation})`, originalError);
  }
}

// Database Errors (500)
export class DatabaseError extends DomainError {
  constructor(operation: string, originalError?: string) {
    super(`Erro de banco de dados durante ${operation}${originalError ? `: ${originalError}` : ''}`, 'DATABASE_ERROR', 500);
  }
}

// Generic Application Error (500)
export class ApplicationError extends DomainError {
  constructor(message: string, originalError?: Error) {
    super(message, 'APPLICATION_ERROR', 500);
    if (originalError) {
      this.stack = originalError.stack;
    }
  }
}

// Error Response DTO
export interface ErrorResponse {
  success: false;
  error: string;
  code: string;
  statusCode: number;
  field?: string;
  details?: any;
}

export function createErrorResponse(error: DomainError): ErrorResponse {
  return {
    success: false,
    error: error.message,
    code: error.code,
    statusCode: error.statusCode,
    field: error instanceof ValidationError ? error.field : undefined
  };
}

// Error Handler Utility
export function handleServiceError(error: unknown): DomainError {
  if (error instanceof DomainError) {
    return error;
  }

  if (error instanceof Error) {
    // Handle known error types
    if (error.message.includes('duplicate key')) {
      return new ConflictError('Registro duplicado');
    }

    if (error.message.includes('violates foreign key')) {
      return new ValidationError('Referência inválida');
    }

    if (error.message.includes('violates not-null')) {
      return new ValidationError('Campo obrigatório não informado');
    }

    // Generic application error
    return new ApplicationError(error.message, error);
  }

  // Unknown error
  return new ApplicationError('Erro interno do servidor');
}