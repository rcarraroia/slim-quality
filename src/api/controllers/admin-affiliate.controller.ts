/**
 * Admin Affiliate Controller
 * Sprint 7: Correções Críticas
 * 
 * Controller administrativo para gestão de afiliados
 */

import { Request, Response } from 'express';
import { adminAffiliateService } from '@/services/affiliates/admin-affiliate.service';
import { Logger } from '@/utils/logger';

export class AdminAffiliateController {
  /**
   * Listar todos os afiliados (admin)
   */
  async getAllAffiliates(req: Request, res: Response) {
    try {
      const filters = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 50,
        status: req.query.status as string,
        search: req.query.search as string,
        sortBy: req.query.sortBy as string,
        sortOrder: req.query.sortOrder as 'asc' | 'desc',
      };

      const result = await adminAffiliateService.getAllAffiliates(filters);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error,
          code: result.code,
        });
      }

      return res.status(200).json({
        success: true,
        data: result.data,
      });
    } catch (error) {
      Logger.error('AdminAffiliateController', 'Error in getAllAffiliates', error as Error);
      return res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR',
      });
    }
  }

  /**
   * Buscar afiliado por ID (admin)
   */
  async getAffiliateById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const result = await adminAffiliateService.getAffiliateById(id);

      if (!result.success) {
        const statusCode = result.code === 'AFFILIATE_NOT_FOUND' ? 404 : 400;
        return res.status(statusCode).json({
          success: false,
          error: result.error,
          code: result.code,
        });
      }

      return res.status(200).json({
        success: true,
        data: result.data,
      });
    } catch (error) {
      Logger.error('AdminAffiliateController', 'Error in getAffiliateById', error as Error);
      return res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR',
      });
    }
  }

  /**
   * Atualizar status do afiliado (admin)
   */
  async updateAffiliateStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status, reason } = req.body;

      const result = await adminAffiliateService.updateAffiliateStatus(id, status, reason);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error,
          code: result.code,
        });
      }

      return res.status(200).json({
        success: true,
        data: result.data,
      });
    } catch (error) {
      Logger.error('AdminAffiliateController', 'Error in updateAffiliateStatus', error as Error);
      return res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR',
      });
    }
  }

  /**
   * Obter rede genealógica do afiliado (admin)
   */
  async getAffiliateNetwork(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const result = await adminAffiliateService.getAffiliateNetwork(id);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error,
          code: result.code,
        });
      }

      return res.status(200).json({
        success: true,
        data: result.data,
      });
    } catch (error) {
      Logger.error('AdminAffiliateController', 'Error in getAffiliateNetwork', error as Error);
      return res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR',
      });
    }
  }

  /**
   * Obter estatísticas gerais de afiliados (admin)
   */
  async getAffiliateStats(req: Request, res: Response) {
    try {
      const result = await adminAffiliateService.getAffiliateStats();

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error,
          code: result.code,
        });
      }

      return res.status(200).json({
        success: true,
        data: result.data,
      });
    } catch (error) {
      Logger.error('AdminAffiliateController', 'Error in getAffiliateStats', error as Error);
      return res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR',
      });
    }
  }
}
}