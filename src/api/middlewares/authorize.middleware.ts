/**
 * Middleware de Autorização
 * Sprint 1: Sistema de Autenticação e Gestão de Usuários
 * 
 * Valida roles/permissões do usuário
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../../utils/logger';
import { handleAuthorizationError, handleUnauthenticatedError } from '../../utils/auth-errors';
import { Role } from '../../types/auth.types';

/**
 * Middleware para validar role do usuário
 * Deve ser usado após requireAuth
 * 
 * @param allowedRoles - Array de roles permitidas
 * @returns Middleware function
 * 
 * @example
 * router.get('/admin/users', requireAuth, requireRole(['admin']), getUsersController);
 * router.post('/vendas', requireAuth, requireRole(['admin', 'vendedor']), createSaleController);
 */
export function requireRole(allowedRoles: Role[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // 1. Verificar se usuário está autenticado
      if (!req.user) {
        logger.warn('AuthorizeMiddleware', 'User not authenticated', {
          path: req.path,
          method: req.method,
        });
        handleUnauthenticatedError(res);
        return;
      }

      // 2. Verificar se tem role requerida
      const hasRequiredRole = req.user.roles.some((role) => allowedRoles.includes(role as Role));

      if (!hasRequiredRole) {
        logger.warn('AuthorizeMiddleware', 'Insufficient permissions', {
          userId: req.user.id,
          userRoles: req.user.roles,
          requiredRoles: allowedRoles,
          path: req.path,
          method: req.method,
        });
        handleAuthorizationError(res, allowedRoles);
        return;
      }

      logger.debug('AuthorizeMiddleware', 'User authorized', {
        userId: req.user.id,
        userRoles: req.user.roles,
        requiredRoles: allowedRoles,
        path: req.path,
      });

      next();
    } catch (error) {
      logger.error('AuthorizeMiddleware', 'Authorization middleware error', error as Error, {
        path: req.path,
        method: req.method,
      });
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}

/**
 * Middleware para verificar se usuário é admin
 * Atalho para requireRole(['admin'])
 */
export const requireAdmin = requireRole(['admin']);

/**
 * Middleware para verificar se usuário é vendedor ou admin
 * Atalho para requireRole(['admin', 'vendedor'])
 */
export const requireVendedor = requireRole(['admin', 'vendedor']);

/**
 * Middleware para verificar se usuário é afiliado, vendedor ou admin
 * Atalho para requireRole(['admin', 'vendedor', 'afiliado'])
 */
export const requireAfiliado = requireRole(['admin', 'vendedor', 'afiliado']);
