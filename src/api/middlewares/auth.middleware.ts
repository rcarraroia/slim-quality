import { Request, Response, NextFunction } from 'express';
import { supabase } from '@/config/supabase';

// Extender Request interface para incluir user
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

/**
 * Middleware para autenticação JWT
 */
export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Token de autenticação não fornecido',
        code: 'MISSING_TOKEN',
      });
    }

    const token = authHeader.substring(7);

    // Verificar token com Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        error: 'Token inválido ou expirado',
        code: 'INVALID_TOKEN',
      });
    }

    // Buscar perfil do usuário para obter role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    // Definir usuário na request
    req.user = {
      id: user.id,
      email: user.email!,
      role: profile?.role || 'customer',
    };

    next();
  } catch (error) {
    return res.status(500).json({
      error: 'Erro interno de autenticação',
      code: 'AUTH_ERROR',
    });
  }
};

/**
 * Middleware para verificar se usuário é admin
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Autenticação requerida',
      code: 'AUTH_REQUIRED',
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'Acesso negado. Apenas administradores.',
      code: 'ADMIN_REQUIRED',
    });
  }

  next();
};

/**
 * Middleware para verificar se usuário é admin ou vendedor
 */
export const requireAdminOrSeller = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Autenticação requerida',
      code: 'AUTH_REQUIRED',
    });
  }

  if (!['admin', 'seller'].includes(req.user.role)) {
    return res.status(403).json({
      error: 'Acesso negado. Apenas administradores ou vendedores.',
      code: 'ADMIN_OR_SELLER_REQUIRED',
    });
  }

  next();
};
