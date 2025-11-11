/**
 * Re-export de middlewares de role
 * Para manter compatibilidade com imports
 */

export {
  requireRole,
  requireAdmin,
  requireVendedor,
  requireAfiliado,
} from './authorize.middleware';
