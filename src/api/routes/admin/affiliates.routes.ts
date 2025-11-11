/**
 * Admin Affiliate Routes
 * Sprint 4: Sistema de Afiliados Multinível
 * 
 * Rotas administrativas para gestão de afiliados
 * - Listar e filtrar afiliados
 * - Aprovar/rejeitar cadastros
 * - Visualizar árvore genealógica completa
 * - Gestão de comissões
 * - Relatórios e analytics
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Logger } from '@/utils/logger';
import { affiliateService } from '@/services/affiliates/affiliate.service';
import { commissionService } from '@/services/affiliates/commission.service';
import { referralTrackerService } from '@/services/affiliates/referral-tracker.service';
import { requireAuth } from '@/middlewares/auth.middleware';
import { requireRole } from '@/middlewares/role.middleware';
import { validateRequest } from '@/middlewares/validation.middleware';

const router = Router();

// Aplicar autenticação e role de admin em todas as rotas
router.use(requireAuth);
router.use(requireRole('admin'));

// ============================================
// SCHEMAS DE VALIDAÇÃO
// ============================================

const AffiliateQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
  status: z.enum(['pending', 'active', 'inactive', 'suspended', 'rejected']).optional(),
  search: z.string().optional(),
  sortBy: z.enum(['name', 'createdAt', 'totalConversions', 'totalCommissions']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

const UpdateStatusSchema = z.object({
  status: z.enum(['active', 'inactive', 'suspended', 'rejected']),
  reason: z.string().min(10, 'Motivo deve ter pelo menos 10 caracteres').max(500).optional(),
});

const CommissionQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
  status: z.enum(['calculated', 'pending', 'paid', 'failed', 'cancelled']).optional(),
  affiliateId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  level: z.coerce.number().min(1).max(3).optional(),
});

// ============================================
// ROTAS DE AFILIADOS
// ============================================

/**
 * GET /api/admin/affiliates
 * Listar todos os afiliados com filtros
 */
router.get('/',
  validateRequest(AffiliateQuerySchema, 'query'),
  async (req: Request, res: Response) => {
    try {
      const queryParams = req.query as any;

      Logger.info('AdminAffiliateRoutes', 'Listing affiliates', {
        adminId: req.user!.id,
        params: queryParams,
      });

      const result = await affiliateService.getAffiliates(queryParams);

      if (!result.success) {
        return res.status(500).json({
          error: result.error,
          code: result.code,
        });
      }

      res.json(result.data);

    } catch (error) {
      Logger.error('AdminAffiliateRoutes', 'Error listing affiliates', error as Error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

/**
 * GET /api/admin/affiliates/:id
 * Detalhes completos de um afiliado
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [affiliateResult, statsResult, networkResult] = await Promise.all([
      affiliateService.getAffiliateById(id),
      affiliateService.getAffiliateStats(id),
      affiliateService.getNetworkTree(id),
    ]);

    if (!affiliateResult.success) {
      return res.status(404).json({
        error: affiliateResult.error,
        code: affiliateResult.code,
      });
    }

    res.json({
      affiliate: affiliateResult.data,
      stats: statsResult.data || {},
      network: networkResult.data || [],
    });

  } catch (error) {
    Logger.error('AdminAffiliateRoutes', 'Error getting affiliate details', error as Error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR',
    });
  }
});

/**
 * PUT /api/admin/affiliates/:id/status
 * Atualizar status do afiliado
 */
router.put('/:id/status',
  validateRequest(UpdateStatusSchema),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const adminId = req.user!.id;

      Logger.info('AdminAffiliateRoutes', 'Updating affiliate status', {
        affiliateId: id,
        newStatus: req.body.status,
        adminId,
      });

      const result = await affiliateService.updateAffiliateStatus(
        id,
        req.body,
        adminId
      );

      if (!result.success) {
        return res.status(400).json({
          error: result.error,
          code: result.code,
        });
      }

      res.json({
        message: 'Status atualizado com sucesso',
        affiliate: result.data,
      });

    } catch (error) {
      Logger.error('AdminAffiliateRoutes', 'Error updating affiliate status', error as Error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

/**
 * GET /api/admin/affiliates/:id/network
 * Árvore genealógica completa do afiliado
 */
router.get('/:id/network', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const networkResult = await affiliateService.getNetworkTree(id);

    if (!networkResult.success) {
      return res.status(500).json({
        error: networkResult.error,
        code: networkResult.code,
      });
    }

    res.json({
      network: networkResult.data,
    });

  } catch (error) {
    Logger.error('AdminAffiliateRoutes', 'Error getting affiliate network', error as Error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR',
    });
  }
});

/**
 * GET /api/admin/affiliates/:id/analytics
 * Analytics completas do afiliado
 */
router.get('/:id/analytics', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    const [analyticsResult, clickStatsResult, conversionsResult] = await Promise.all([
      referralTrackerService.getAffiliateAnalytics(
        id,
        startDate as string,
        endDate as string
      ),
      referralTrackerService.getClickStats(id, 'day', 30),
      referralTrackerService.getAffiliateConversions(id, 20, 0),
    ]);

    res.json({
      analytics: analyticsResult.data || {},
      clickStats: clickStatsResult.data || [],
      recentConversions: conversionsResult.data || [],
    });

  } catch (error) {
    Logger.error('AdminAffiliateRoutes', 'Error getting affiliate analytics', error as Error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR',
    });
  }
});

// ============================================
// ROTAS DE COMISSÕES
// ============================================

/**
 * GET /api/admin/affiliates/commissions
 * Listar todas as comissões
 */
router.get('/commissions',
  validateRequest(CommissionQuerySchema, 'query'),
  async (req: Request, res: Response) => {
    try {
      const queryParams = req.query as any;

      Logger.info('AdminAffiliateRoutes', 'Listing commissions', {
        adminId: req.user!.id,
        params: queryParams,
      });

      const result = await commissionService.getAllCommissions(queryParams);

      if (!result.success) {
        return res.status(500).json({
          error: result.error,
          code: result.code,
        });
      }

      res.json(result.data);

    } catch (error) {
      Logger.error('AdminAffiliateRoutes', 'Error listing commissions', error as Error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

/**
 * POST /api/admin/affiliates/commissions/:id/pay
 * Marcar comissão como paga
 */
router.post('/commissions/:id/pay', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const adminId = req.user!.id;

    Logger.info('AdminAffiliateRoutes', 'Marking commission as paid', {
      commissionId: id,
      adminId,
    });

    const result = await commissionService.markCommissionAsPaid(id, adminId);

    if (!result.success) {
      return res.status(400).json({
        error: result.error,
        code: result.code,
      });
    }

    res.json({
      message: 'Comissão marcada como paga',
      commission: result.data,
    });

  } catch (error) {
    Logger.error('AdminAffiliateRoutes', 'Error marking commission as paid', error as Error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR',
    });
  }
});

// ============================================
// ROTAS DE RELATÓRIOS
// ============================================

/**
 * GET /api/admin/affiliates/reports/dashboard
 * Dashboard administrativo
 */
router.get('/reports/dashboard', async (req: Request, res: Response) => {
  try {
    Logger.info('AdminAffiliateRoutes', 'Getting admin dashboard', {
      adminId: req.user!.id,
    });

    // Buscar estatísticas gerais
    const [
      totalAffiliatesResult,
      activeAffiliatesResult,
      pendingApprovalsResult,
      monthlyStatsResult,
    ] = await Promise.all([
      affiliateService.getAffiliates({ limit: 1 }), // Para pegar total
      affiliateService.getAffiliates({ status: 'active', limit: 1 }),
      affiliateService.getAffiliates({ status: 'pending', limit: 1 }),
      commissionService.getMonthlyStats(),
    ]);

    const dashboardData = {
      totalAffiliates: totalAffiliatesResult.data?.pagination.total || 0,
      activeAffiliates: activeAffiliatesResult.data?.pagination.total || 0,
      pendingApprovals: pendingApprovalsResult.data?.pagination.total || 0,
      monthlyStats: monthlyStatsResult.data || {
        newAffiliates: 0,
        totalSales: 0,
        totalCommissions: 0,
        conversionRate: 0,
      },
    };

    res.json(dashboardData);

  } catch (error) {
    Logger.error('AdminAffiliateRoutes', 'Error getting admin dashboard', error as Error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR',
    });
  }
});

/**
 * GET /api/admin/affiliates/reports/top-performers
 * Top performers do mês
 */
router.get('/reports/top-performers', async (req: Request, res: Response) => {
  try {
    const { limit = 10 } = req.query;

    const result = await commissionService.getTopPerformers(Number(limit));

    if (!result.success) {
      return res.status(500).json({
        error: result.error,
        code: result.code,
      });
    }

    res.json({
      topPerformers: result.data,
    });

  } catch (error) {
    Logger.error('AdminAffiliateRoutes', 'Error getting top performers', error as Error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR',
    });
  }
});

/**
 * GET /api/admin/affiliates/reports/commission-summary
 * Resumo de comissões por período
 */
router.get('/reports/commission-summary', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;

    const result = await commissionService.getCommissionSummary({
      startDate: startDate as string,
      endDate: endDate as string,
      groupBy: groupBy as 'day' | 'week' | 'month',
    });

    if (!result.success) {
      return res.status(500).json({
        error: result.error,
        code: result.code,
      });
    }

    res.json({
      summary: result.data,
    });

  } catch (error) {
    Logger.error('AdminAffiliateRoutes', 'Error getting commission summary', error as Error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR',
    });
  }
});

/**
 * GET /api/admin/affiliates/audit-logs
 * Logs de auditoria
 */
router.get('/audit-logs', async (req: Request, res: Response) => {
  try {
    const { orderId, affiliateId, startDate, endDate, limit = 100 } = req.query;

    const result = await commissionService.getAuditLogs({
      orderId: orderId as string,
      affiliateId: affiliateId as string,
      startDate: startDate as string,
      endDate: endDate as string,
      limit: Number(limit),
    });

    if (!result.success) {
      return res.status(500).json({
        error: result.error,
        code: result.code,
      });
    }

    res.json({
      logs: result.data,
    });

  } catch (error) {
    Logger.error('AdminAffiliateRoutes', 'Error getting audit logs', error as Error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR',
    });
  }
});

export { router as adminAffiliateRoutes };