/**
 * Error Formatter Utility
 * Sprint 7: Correções Críticas
 * 
 * Padroniza formato de erros em toda a aplicação
 */

export interface ErrorResponse {
  success: false;
  error: string;
  code: string;
  details?: any;
  timestamp: string;
}

export interface SuccessResponse<T = any> {
  success: true;
  data: T;
  timestamp: string;
}

/**
 * Formata erro para resposta padronizada
 */
export function formatError(
  error: Error | string,
  code: string = 'INTERNAL_ERROR',
  details?: any
): ErrorResponse {
  const message = typeof error === 'string' ? error : error.message;
  
  return {
    success: false,
    error: message,
    code,
    details,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Cria resposta de erro com status HTTP e mensagem
 */
export function createErrorResponse(
  status: number,
  message: string,
  code?: string,
  details?: any
): { status: number; body: ErrorResponse } {
  const errorCode = code || getDefaultCodeForStatus(status);
  
  return {
    status,
    body: formatError(message, errorCode, details),
  };
}

/**
 * Formata resposta de sucesso
 */
export function formatSuccess<T>(data: T): SuccessResponse<T> {
  return {
    success: true,
    data,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Obtém código de erro padrão baseado no status HTTP
 */
function getDefaultCodeForStatus(status: number): string {
  switch (status) {
    case 400:
      return 'BAD_REQUEST';
    case 401:
      return 'UNAUTHORIZED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 409:
      return 'CONFLICT';
    case 422:
      return 'VALIDATION_ERROR';
    case 500:
      return 'INTERNAL_ERROR';
    case 503:
      return 'SERVICE_UNAVAILABLE';
    default:
      return 'UNKNOWN_ERROR';
  }
}

/**
 * Extrai mensagem de erro de diferentes tipos de erro
 */
export function extractErrorMessage(error: unknown): string {
  if (typeof error === 'string') {
    return error;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as any).message);
  }
  
  return 'Erro desconhecido';
}

/**
 * Determina status HTTP apropriado baseado no tipo de erro
 */
export function getStatusFromError(error: unknown): number {
  if (error && typeof error === 'object') {
    const err = error as any;
    
    // Erros de validação
    if (err.name === 'ValidationError' || err.code === 'VALIDATION_ERROR') {
      return 422;
    }
    
    // Erros de autenticação
    if (err.name === 'AuthenticationError' || err.code === 'UNAUTHORIZED') {
      return 401;
    }
    
    // Erros de permissão
    if (err.name === 'ForbiddenError' || err.code === 'FORBIDDEN') {
      return 403;
    }
    
    // Erros de não encontrado
    if (err.name === 'NotFoundError' || err.code === 'NOT_FOUND') {
      return 404;
    }
    
    // Erros de conflito
    if (err.name === 'ConflictError' || err.code === 'CONFLICT') {
      return 409;
    }
  }
  
  // Erro interno por padrão
  return 500;
}
