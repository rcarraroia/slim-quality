import { Request, Response } from 'express';
import { CommissionService } from '../../services/affiliates/commission.service';

const commissionService = new CommissionService();

export class CommissionController {
  /**
   * Lista todas as comissões (admin)
   */
  async getAllCommissions(req: Request, res: Response) {
    try {
      const {
        page = 1,
        limit = 50,
        status,
        affiliate_id,
        start_date,
        end_date,
      } = req.query;

      const params = {
        page: Number(page),
        limit: Number(limit),
        status: status as string,
        affiliateId: affiliate_id as string,
        startDate: start_date as string,
        endDate: end_date as string,
      };

      const result = await commissionService.getAllCommissions(params);

      if (result.success) {
        res.json({
          success: true,
          data: result.data,
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
          code: result.code,
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR',
      });
    }
  }

  /**
   * Busca comissão por ID (admin)
   */
  async getCommissionById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const result = await commissionService.getById(id);

      if (result.success) {
        res.json({
          success: true,
          data: result.data,
        });
      } else {
        const statusCode = result.code === 'COMMISSION_NOT_FOUND' ? 404 : 400;
        res.status(statusCode).json({
          success: false,
          error: result.error,
          code: result.code,
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR',
      });
    }
  }

  /**
   * Obtém estatísticas de comissões (admin)
   */
  async getCommissionStats(req: Request, res: Response) {
    try {
      const { start_date, end_date } = req.query;

      const params = {
        startDate: start_date as string,
        endDate: end_date as string,
      };

      const result = await commissionService.getStats(params);

      if (result.success) {
        res.json({
          success: true,
          data: result.data,
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
          code: result.code,
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR',
      });
    }
  }

  /**
   * Marca comissão como paga (admin)
   */
  async markCommissionAsPaid(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const adminUserId = req.user?.id; // Assuming auth middleware sets req.user

      const result = await commissionService.markCommissionAsPaid(id, adminUserId || '');

      if (result.success) {
        res.json({
          success: true,
          data: result.data,
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
          code: result.code,
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR',
      });
    }
  }
}