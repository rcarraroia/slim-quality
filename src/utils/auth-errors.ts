/**
 * Utilitários de Erro - Autenticação
 * Sprint 1: Sistema de Autenticação e Gestão de Usuários
 * 
 * Funções para tratamento padronizado de erros de autenticação
 */

import { Response } from 'express';
import { ZodError } from 'zod';
import { logger } from './logger';
import { AuthError } from '../types/auth.types';

/**
 * Trata erros de autenticação e retorna resposta padronizada
 */
export function handleAuthError(error: any, res: Response, module: string = 'Auth'): Response {
  logger.error(module, 'Authentication error', error);

  // Erro de validação Zod
  if (error instanceof ZodError) {
    const authError: AuthError = {
      error: 'Validation failed',
      details: error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    };
    return res.status(400).json(authError);
  }

  // Erros do Supabase Auth
  if (error.message) {
    // Email já existe
    if (error.message.includes('User already registered') || 
        error.message.includes('duplicate key value') ||
        error.message.includes('already exists')) {
      return res.status(409).json({
        error: 'Email já cadastrado',
      });
    }

    // Credenciais inválidas
    if (error.message.includes('Invalid login credentials') ||
        error.message.includes('Invalid email or password')) {
      return res.status(401).json({
        error: 'Email ou senha inválidos',
      });
    }

    // Email não confirmado
    if (error.message.includes('Email not confirmed')) {
      return res.status(403).json({
        error: 'Email não confirmado. Verifique sua caixa de entrada.',
      });
    }

    // Usuário não encontrado
    if (error.message.includes('User not found')) {
      return res.status(404).json({
        error: 'Usuário não encontrado',
      });
    }

    // Token inválido ou expirado
    if (error.message.includes('Invalid token') ||
        error.message.includes('Token expired') ||
        error.message.includes('JWT')) {
      return res.status(401).json({
        error: 'Token inválido ou expirado',
      });
    }

    // Sessão expirada
    if (error.message.includes('Session expired')) {
      return res.status(401).json({
        error: 'Sessão expirada. Faça login novamente.',
      });
    }
  }

  // Erro genérico (não expor detalhes internos)
  return res.status(500).json({
    error: 'Erro interno do servidor',
  });
}

/**
 * Trata erros de autorização (permissões)
 */
export function handleAuthorizationError(res: Response, requiredRoles: string[]): Response {
  return res.status(403).json({
    error: 'Permissão insuficiente',
    required: requiredRoles,
  });
}

/**
 * Trata erro de token ausente
 */
export function handleMissingTokenError(res: Response): Response {
  return res.status(401).json({
    error: 'Token de autenticação não fornecido',
  });
}

/**
 * Trata erro de usuário não autenticado
 */
export function handleUnauthenticatedError(res: Response): Response {
  return res.status(401).json({
    error: 'Autenticação necessária',
  });
}

/**
 * Formata resposta de sucesso padronizada
 */
export function successResponse<T>(data: T, message?: string): { success: true; data: T; message?: string } {
  return {
    success: true,
    data,
    ...(message && { message }),
  };
}
