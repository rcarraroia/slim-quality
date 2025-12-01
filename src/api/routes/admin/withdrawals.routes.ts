/**
 * Admin Withdrawal Routes
 * Sprint 7: Correções Críticas
 *
 * Rotas administrativas para gestão de saques
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Logger } from '@/utils/logger';
import { WithdrawalController } from '@/api/controllers/withdrawal.controller';
import { requireAuth } from '@/api/middlewares/auth.middleware';
import { requireRole } from '@/api/middlewares/authorize.middleware';
import { validateRequest } from '@/api/middlewares/validation.middleware';

const router = Router();
const withdrawalController = new WithdrawalController();

// Aplicar autenticação e role de admin em todas as rotas
router.use(requireAuth);
router.use(requireRole('admin'));

// ============================================
// SCHEMAS DE VALIDAÇÃO
// ============================================

const WithdrawalQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
  status: z.enum(['pending', 'approved', 'processing', 'completed', 'failed', 'rejected', 'cancelled']).optional(),
  affiliate_id: z.string().uuid().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
});

const WithdrawalRequestSchema = z.object({
  affiliate_id: z.string().uuid(),
  requested_amount_cents: z.number().min(1000), // Mínimo R$ 10,00
  bank_code: z.string().min(3).max(10),
  bank_name: z.string().min(2).max(100),
  agency: z.string().min(1).max(10),
  account: z.string().min(1).max(20),
  account_type: z.enum(['checking', 'savings']),
  account_holder_name: z.string().min(2).max(100),
  account_holder_document: z.string().regex(/^\d{11,14}$/), // CPF ou CNPJ
});

const ProcessWithdrawalSchema = z.object({
  reason: z.string().min(10).max(500).optional(),
});

// ============================================
// ROTAS DE SAQUES
// ============================================

/**
 * GET /api/admin/withdrawals
 * Listar todos os saques
 */
router.get('/',
  validateRequest(WithdrawalQuerySchema, 'query'),
  withdrawalController.getAllWithdrawals.bind(withdrawalController)
);

/**
 * GET /api/admin/withdrawals/:id
 * Buscar saque por ID
 */
router.get('/:id',
  withdrawalController.getWithdrawalById.bind(withdrawalController)
);

/**
 * POST /api/admin/withdrawals/:id/approve
 * Aprovar saque
 */
router.post('/:id/approve',
  validateRequest(ProcessWithdrawalSchema),
  withdrawalController.approveWithdrawal.bind(withdrawalController)
);

/**
 * POST /api/admin/withdrawals/:id/reject
 * Rejeitar saque
 */
router.post('/:id/reject',
  validateRequest(z.object({
    reason: z.string().min(10).max(500),
  })),
  withdrawalController.rejectWithdrawal.bind(withdrawalController)
);

/**
 * GET /api/admin/withdrawals/stats
 * Estatísticas de saques
 */
router.get('/stats',
  withdrawalController.getWithdrawalStats.bind(withdrawalController)
);

export { router as adminWithdrawalRoutes };