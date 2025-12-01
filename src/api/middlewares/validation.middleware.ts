/**
 * Validation Middleware
 * Sprint 7: Correções Críticas
 * 
 * Middleware para validação de dados com Zod
 */

import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { formatError } from '@/utils/error-formatter';
import { Logger } from '@/utils/logger';

/**
 * Tipo de validação
 */
export type ValidationType = 'body' | 'query' | 'params';

/**
 * Middleware de validação genérico
 */
export function validate(schema: ZodSchema, type: ValidationType = 'body') {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Selecionar dados para validar
      const dataToValidate = type === 'body' ? req.body :
                            type === 'query' ? req.query :
                            req.params;
      
      // Validar com Zod
      const validated = schema.parse(dataToValidate);
      
      // Substituir dados originais pelos validados
      if (type === 'body') {
        req.body = validated;
      } else if (type === 'query') {
        req.query = validated as any;
      } else {
        req.params = validated as any;
      }
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Formatar erros do Zod
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));
        
        Logger.warn('ValidationMiddleware', 'Validation failed', {
          type,
          errors,
          data: type === 'body' ? req.body : type === 'query' ? req.query : req.params,
        });
        
        return res.status(422).json(
          formatError(
            'Erro de validação',
            'VALIDATION_ERROR',
            { errors }
          )
        );
      }
      
      // Erro inesperado
      Logger.error('ValidationMiddleware', 'Unexpected validation error', error as Error);
      return res.status(500).json(
        formatError('Erro interno ao validar dados', 'INTERNAL_ERROR')
      );
    }
  };
}

/**
 * Middleware para validar body
 */
export function validateBody(schema: ZodSchema) {
  return validate(schema, 'body');
}

/**
 * Middleware para validar query params
 */
export function validateQuery(schema: ZodSchema) {
  return validate(schema, 'query');
}

/**
 * Middleware para validar path params
 */
export function validateParams(schema: ZodSchema) {
  return validate(schema, 'params');
}
