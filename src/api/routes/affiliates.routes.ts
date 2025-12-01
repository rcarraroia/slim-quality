/**
 * Affiliate Routes
 * Sprint 4: Sistema de Afiliados Multinível
 * 
 * Rotas públicas para afiliados
 * - Cadastro de afiliados
 * - Dashboard do afiliado
 * - Consulta de comissões
 * - Gestão de rede
 */

import { Router, Request, Response } from 'express';
import { Logger } from '@/utils/logger';
import { affiliateService } from '@/services/affiliates/affiliate.service';
import { referralTrackerService } from '@/services/affiliates/referral-tracker.service';
import { commissionService } from '@/services/affiliates/commission.service';
import { requireAuth } from '@/middlewares/auth.middleware';
import { validateRequest } from '@/middlewares/validation.middleware';
import { rateLimitMiddleware } from '@/middlewares/rate-limit.middleware';
import {
  CreateAffiliateSchema,
  UpdateAffiliateSchema,
  ValidateWalletSchema,
  ValidateReferralCodeSchema
} from '../validators/affiliate.validators';

const router = Router();

// ============================================
// SCHEMAS DE VALIDAÇÃO
// ============================================

// Schemas importados de affiliate.validators.ts

// Schema adicional para consultas de comissão
import { z } from 'zod';
const CommissionQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  status: z.enum(['calculated', 'pending', 'paid', 'failed', 'cancelled']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

// ============================================
// ROTAS PÚBLICAS (SEM AUTENTICAÇÃO)
// ============================================

/**
 * POST /api/affiliates/register
 * Cadastro de novo afiliado
 */
router.post('/register',
  rateLimitMiddleware({ windowMs: 15 * 60 * 1000, max: 5 }), // 5 tentativas por 15 min
  validateRequest(CreateAffiliateSchema),
  async (req: Request, res: Response) => {
    try {
      Logger.info('AffiliateRoutes', 'Affiliate registration attempt', {
        email: req.body.email,
        hasReferralCode: !!req.body.referralCode,
      });

      const result = await affiliateService.register(req.body);

      if (!result.success) {
        return res.status(400).json({
          error: result.error,
          code: result.code,
        });
      }

      // DTO já vem sem dados sensíveis
      res.status(201).json({
        message: 'Afiliado cadastrado com sucesso. Aguarde aprovação.',
        affiliate: result.data,
      });

    } catch (error) {
      Logger.error('AffiliateRoutes', 'Error in affiliate registration', error as Error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

/**
 * POST /api/affiliates/validate-wallet
 * Validação de Wallet ID (para uso no frontend)
 */
router.post('/validate-wallet',
  rateLimitMiddleware({ windowMs: 60 * 1000, max: 10 }), // 10 tentativas por minuto
  async (req: Request, res: Response) => {
    try {
      const { walletId } = req.body;

      if (!walletId || typeof walletId !== 'string') {
        return res.status(400).json({
          error: 'Wallet ID é obrigatória',
          code: 'MISSING_WALLET_ID',
        });
      }

      if (!/^wal_[a-zA-Z0-9]{20}$/.test(walletId)) {
        return res.status(400).json({
          error: 'Formato de Wallet ID inválido',
          code: 'INVALID_WALLET_FORMAT',
        });
      }

      const validation = await affiliateService.validateWalletId(walletId);

      res.json({
        isValid: validation.isValid,
        isActive: validation.isActive,
        name: validation.name,
        error: validation.error,
      });

    } catch (error) {
      Logger.error('AffiliateRoutes', 'Error validating wallet', error as Error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

/**
 * GET /api/affiliates/validate-referral/:code
 * Validação de código de referência
 */
router.get('/validate-referral/:code',
  rateLimitMiddleware({ windowMs: 60 * 1000, max: 20 }), // 20 tentativas por minuto
  async (req: Request, res: Response) => {
    try {
      const { code } = req.params;

      if (!code) {
        return res.status(400).json({
          error: 'Código de referência é obrigatório',
          code: 'MISSING_REFERRAL_CODE',
        });
      }

      const result = await affiliateService.getAffiliateByCode(code);

      if (result.success && result.data) {
        res.json({
          valid: true,
          affiliate: {
            id: result.data.id,
            name: result.data.name,
            email: result.data.email
          }
        });
      } else {
        res.status(404).json({
          valid: false,
          error: 'Código de referência inválido'
        });
      }

    } catch (error) {
      Logger.error('AffiliateRoutes', 'Error validating referral code', error as Error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

// ============================================
// ROTAS AUTENTICADAS
// ============================================

/**
 * GET /api/affiliates/me
 * Dados do afiliado logado
 */
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const result = await affiliateService.getAffiliateByUserId(userId);

    if (!result.success) {
      return res.status(404).json({
        error: result.error,
        code: result.code,
      });
    }

    // DTO já vem sem dados sensíveis
    res.json(result.data);

  } catch (error) {
    Logger.error('AffiliateRoutes', 'Error getting affiliate data', error as Error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR',
    });
  }
});

/**
 * PUT /api/affiliates/me
 * Atualizar dados do afiliado
 */
router.put('/me', 
  requireAuth,
  validateRequest(UpdateAffiliateSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;

      // Buscar afiliado atual
      const affiliateResult = await affiliateService.getAffiliateByUserId(userId);
      if (!affiliateResult.success) {
        return res.status(404).json({
          error: 'Afiliado não encontrado',
          code: 'AFFILIATE_NOT_FOUND',
        });
      }

      const result = await affiliateService.updateAffiliate(
        affiliateResult.data!.id,
        req.body,
        userId
      );

      if (!result.success) {
        return res.status(400).json({
          error: result.error,
          code: result.code,
        });
      }

      // DTO já vem sem dados sensíveis
      res.json(result.data);

    } catch (error) {
      Logger.error('AffiliateRoutes', 'Error updating affiliate', error as Error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

/**
 * GET /api/affiliates/dashboard
 * Dashboard completo do afiliado
 */
router.get('/dashboard', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    // Buscar afiliado
    const affiliateResult = await affiliateService.getAffiliateByUserId(userId);
    if (!affiliateResult.success) {
      return res.status(404).json({
        error: 'Afiliado não encontrado',
        code: 'AFFILIATE_NOT_FOUND',
      });
    }

    const affiliate = affiliateResult.data!;

    // Buscar dados do dashboard em paralelo
    const [statsResult, networkResult, commissionsResult, analyticsResult] = await Promise.all([
      affiliateService.getAffiliateStats(affiliate.id),
      affiliateService.getMyNetwork(affiliate.id),
      commissionService.getAffiliateCommissions(affiliate.id, { limit: 10 }),
      referralTrackerService.getAffiliateAnalytics(affiliate.id),
    ]);

    const dashboardData = {
      affiliate: {
        id: affiliate.id,
        name: affiliate.name,
        email: affiliate.email,
        referralCode: affiliate.referralCode,
        status: affiliate.status,
        createdAt: affiliate.createdAt,
      },
      stats: statsResult.data || {
        totalClicks: 0,
        totalConversions: 0,
        totalCommissionsCents: 0,
        conversionRate: 0,
        avgCommissionCents: 0,
      },
      network: {
        directReferrals: networkResult.data?.length || 0,
        referrals: networkResult.data || [],
      },
      recentCommissions: commissionsResult.data?.data || [],
      analytics: analyticsResult.data || {
        totalClicks: 0,
        uniqueClicks: 0,
        totalConversions: 0,
        conversionRate: 0,
        totalRevenueCents: 0,
        totalCommissionsCents: 0,
        avgConversionTimeHours: 0,
      },
      referralLink: affiliateService.generateReferralLink(affiliate.referral_code),
    };

    res.json(dashboardData);

  } catch (error) {
    Logger.error('AffiliateRoutes', 'Error getting dashboard', error as Error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR',
    });
  }
});

/**
 * GET /api/affiliates/referral-link
 * Link de indicação do afiliado
 */
router.get('/referral-link', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const affiliateResult = await affiliateService.getAffiliateByUserId(userId);
    if (!affiliateResult.success) {
      return res.status(404).json({
        error: 'Afiliado não encontrado',
        code: 'AFFILIATE_NOT_FOUND',
      });
    }
const affiliate = affiliateResult.data!;

const referralLink = affiliateService.generateReferralLink(affiliate.referralCode);

res.json({
  referralCode: affiliate.referralCode,
  referralLink,
      // TODO: Adicionar QR Code
      // qrCode: generateQRCode(referralLink),
    });

  } catch (error) {
    Logger.error('AffiliateRoutes', 'Error getting referral link', error as Error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR',
    });
  }
});

/**
 * GET /api/affiliates/network
 * Rede genealógica do afiliado
 */
router.get('/network', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const affiliateResult = await affiliateService.getAffiliateByUserId(userId);
    if (!affiliateResult.success) {
      return res.status(404).json({
        error: 'Afiliado não encontrado',
        code: 'AFFILIATE_NOT_FOUND',
      });
    }

    const networkResult = await affiliateService.getNetworkTree(affiliateResult.data!.id);

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
    Logger.error('AffiliateRoutes', 'Error getting network', error as Error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR',
    });
  }
});

/**
 * GET /api/affiliates/commissions
 * Comissões do afiliado
 */
router.get('/commissions',
  requireAuth,
  validateRequest(CommissionQuerySchema, 'query'),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const queryParams = req.query as any;

      const affiliateResult = await affiliateService.getAffiliateByUserId(userId);
      if (!affiliateResult.success) {
        return res.status(404).json({
          error: 'Afiliado não encontrado',
          code: 'AFFILIATE_NOT_FOUND',
        });
      }

      const commissionsResult = await commissionService.getAffiliateCommissions(
        affiliateResult.data!.id,
        queryParams
      );

      if (!commissionsResult.success) {
        return res.status(500).json({
          error: commissionsResult.error,
          code: commissionsResult.code,
        });
      }

      res.json(commissionsResult.data);

    } catch (error) {
      Logger.error('AffiliateRoutes', 'Error getting commissions', error as Error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR',
      });
    }
  }
);

/**
 * GET /api/affiliates/analytics
 * Analytics do afiliado
 */
router.get('/analytics', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { startDate, endDate } = req.query;

    const affiliateResult = await affiliateService.getAffiliateByUserId(userId);
    if (!affiliateResult.success) {
      return res.status(404).json({
        error: 'Afiliado não encontrado',
        code: 'AFFILIATE_NOT_FOUND',
      });
    }

    const affiliate = affiliateResult.data!;

    // Buscar analytics em paralelo
    const [analyticsResult, clickStatsResult, countriesResult, utmSourcesResult] = await Promise.all([
      referralTrackerService.getAffiliateAnalytics(
        affiliate.id,
        startDate as string,
        endDate as string
      ),
      referralTrackerService.getClickStats(affiliate.id, 'day', 30),
      referralTrackerService.getTopCountries(affiliate.id, 10),
      referralTrackerService.getTopUtmSources(affiliate.id, 10),
    ]);

    res.json({
      summary: analyticsResult.data || {},
      clickStats: clickStatsResult.data || [],
      topCountries: countriesResult.data || [],
      topUtmSources: utmSourcesResult.data || [],
    });

  } catch (error) {
    Logger.error('AffiliateRoutes', 'Error getting analytics', error as Error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR',
    });
  }
});

export { router as affiliateRoutes };