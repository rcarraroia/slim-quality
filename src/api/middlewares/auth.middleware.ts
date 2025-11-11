/**
 * Authentication Middleware
 * Sprint 3: Sistema de Vendas
 */

import { Request, Response, NextFunction } from 'express';
import { supabase } from '@/config/supabase';
import { Logger } from '@/utils/logger';

/**
 * Middleware de autenticação
 * Valida JWT do Supabase e adiciona user ao request
 */
export async function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Token de autenticação ausente',
        code: 'MISSING_TOKEN',
      });
    }

    const token = authHeader.substring(7);

    // Validar token com Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      Logger.error('AuthMiddleware', 'Token inválido', error);
      return res.status(401).json({
        error: 'Token inválido ou expirado',
        code: 'INVALID_TOKEN',
      });
    }

    // Buscar perfil do usuário
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    // Adicionar user ao request
    req.user = {
      id: user.id,
      email: user.email || '',
      role: profile?.role || 'user',
    };

    next();
  } catch (error) {
    Logger.error('AuthMiddleware', 'Erro na autenticação', error as Error);
    return res.status(500).json({
      error: 'Erro ao validar autenticação',
      code: 'AUTH_ERROR',
    });
  }
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
      };
    }
  }
}
