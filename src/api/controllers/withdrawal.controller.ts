import { Request, Response } from 'express';
import { supabase } from '@/config/supabase';
import { withdrawalService } from '../../services/affiliates/withdrawal.service';

export class WithdrawalController {
  /**
   * Listar saques (admin)
   */
  async getAllWithdrawals(req: Request, res: Response) {
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

      const result = await withdrawalService.getAllWithdrawals(params);

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
   * Buscar saque por ID
   */
  async getWithdrawalById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const result = await withdrawalService.getById(id);

      if (result.success) {
        res.json({
          success: true,
          data: result.data,
        });
      } else {
        const statusCode = result.code === 'WITHDRAWAL_NOT_FOUND' ? 404 : 400;
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
   * Solicitar saque (afiliado)
   */
  async requestWithdrawal(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Usuário não autenticado',
          code: 'UNAUTHENTICATED',
        });
      }

      const result = await withdrawalService.requestWithdrawal(userId, req.body);

      if (result.success) {
        res.status(201).json({
          success: true,
          data: result.data,
          message: 'Solicitação de saque criada com sucesso',
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
   * Aprovar saque (admin)
   */
  async approveWithdrawal(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const adminUserId = req.user?.id;
      const { reason } = req.body;

      if (!adminUserId) {
        return res.status(401).json({
          success: false,
          error: 'Administrador não autenticado',
          code: 'UNAUTHENTICATED',
        });
      }

      const result = await withdrawalService.approveWithdrawal(id, adminUserId, reason);

      if (result.success) {
        res.json({
          success: true,
          data: result.data,
          message: 'Saque aprovado com sucesso',
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
   * Rejeitar saque (admin)
   */
  async rejectWithdrawal(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const adminUserId = req.user?.id;
      const { reason } = req.body;

      if (!adminUserId) {
        return res.status(401).json({
          success: false,
          error: 'Administrador não autenticado',
          code: 'UNAUTHENTICATED',
        });
      }

      if (!reason || reason.trim().length < 10) {
        return res.status(400).json({
          success: false,
          error: 'Motivo da rejeição deve ter pelo menos 10 caracteres',
          code: 'INVALID_REASON',
        });
      }

      const result = await withdrawalService.rejectWithdrawal(id, adminUserId, reason);

      if (result.success) {
        res.json({
          success: true,
          data: result.data,
          message: 'Saque rejeitado com sucesso',
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
   * Listar saques do afiliado autenticado
   */
  async getMyWithdrawals(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Usuário não autenticado',
          code: 'UNAUTHENTICATED',
        });
      }

      // Buscar affiliate_id do usuário
      const { data: affiliate } = await supabase
        .from('affiliates')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (!affiliate) {
        return res.status(404).json({
          success: false,
          error: 'Afiliado não encontrado',
          code: 'AFFILIATE_NOT_FOUND',
        });
      }

      const {
        page = 1,
        limit = 20,
        status,
        start_date,
        end_date,
      } = req.query;

      const params = {
        page: Number(page),
        limit: Number(limit),
        status: status as string,
        startDate: start_date as string,
        endDate: end_date as string,
      };

      const result = await withdrawalService.getByAffiliateId(affiliate.id, params);

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
   * Obter estatísticas de saques (admin)
   */
  async getWithdrawalStats(req: Request, res: Response) {
    try {
      const result = await withdrawalService.getStats();

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