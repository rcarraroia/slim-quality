/**
 * Error Handler Middleware
 * Sprint 7: Correções Críticas
 * 
 * Middleware global para captura e tratamento de erros
 */

import { Request, Response, NextFunction } from 'express';
import { Logger } from '@/utils/logger';
import {
  formatError,
  extractErrorMessage,
  getStatusFromError,
} from '@/utils/error-formatter';

/**
 * Middleware de tratamento de erros
 * Deve ser o último middleware registrado
 */
export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Log do erro
  Logger.error('ErrorHandler', 'Unhandled error', error, {
    method: req.method,
    path: req.path,
    query: req.query,
    body: req.body,
    user: (req as any).user?.id,
  });

  // Determinar status HTTP
  const status = getStatusFromError(error);
  
  // Extrair mensagem
  const message = extractErrorMessage(error);
  
  // Determinar código de erro
  const code = (error as any).code || getDefaultCodeForStatus(status);
  
  // Incluir stack trace apenas em desenvolvimento
  const details = process.env.NODE_ENV === 'development' ? {
    stack: error.stack,
    name: error.name,
  } : undefined;
  
  // Enviar resposta de erro
  res.status(status).json(formatError(message, code, details));
}

/**
 * Middleware para capturar erros assíncronos
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Middleware para rotas não encontradas
 */
export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json(
    formatError(
      `Rota não encontrada: ${req.method} ${req.path}`,
      'NOT_FOUND'
    )
  );
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
