/**
 * Admin Commission Routes
 * Sprint 7: Correções Críticas
 *
 * Rotas administrativas para gestão de comissões
 */

import { Router } from 'express';
import { z } from 'zod';
import { CommissionController } from '@/api/controllers/commission.controller';
import { requireAuth } from '@/api/middlewares/auth.middleware';
import { requireAdmin } from '@/api/middlewares/authorize.middleware';
import { validateRequest } from '@/api/middlewares/validation.middleware';

const router = Router();
const commissionController = new CommissionController();

// Aplicar autenticação e role de admin em todas as rotas
router.use(requireAuth);
router.use(requireAdmin);

// ============================================
// SCHEMAS DE VALIDAÇÃO
// ============================================

const CommissionQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
  status: z.enum(['calculated', 'pending', 'paid', 'failed']).optional(),
  affiliate_id: z.string().uuid().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
});

const CommissionStatsSchema = z.object({
  start_date: z.string().optional(),
  end_date: z.string().optional(),
});

// ============================================
// ROTAS DE COMISSÕES
// ============================================

/**
 * GET /api/admin/commissions
 * Listar todas as comissões
 */
router.get('/',
  validateRequest(CommissionQuerySchema, 'query'),
  commissionController.getAllCommissions.bind(commissionController)
);

/**
 * GET /api/admin/commissions/:id
 * Buscar comissão por ID
 */
router.get('/:id',
  commissionController.getCommissionById.bind(commissionController)
);

/**
 * GET /api/admin/commissions/stats
 * Estatísticas de comissões
 */
router.get('/stats',
  validateRequest(CommissionStatsSchema, 'query'),
  commissionController.getCommissionStats.bind(commissionController)
);

/**
 * POST /api/admin/commissions/:id/approve
 * Aprovar comissão (marcar como paga)
 */
router.post('/:id/approve',
  commissionController.markCommissionAsPaid.bind(commissionController)
);

export { router as adminCommissionRoutes };