import { Request, Response } from 'express';
import { AffiliateService } from '../../services/affiliates/affiliate.service';

const affiliateService = new AffiliateService();

export class AffiliateController {
  async register(req: Request, res: Response) {
    try {
      const result = await affiliateService.register(req.body, req.user?.id);

      if (result.success) {
        res.status(201).json({
          success: true,
          data: result.data,
          message: 'Afiliado cadastrado com sucesso'
        });
      } else {
        const statusCode = result.code === 'EMAIL_ALREADY_EXISTS' ? 409 :
                          result.code === 'WALLET_ID_ALREADY_EXISTS' ? 409 :
                          result.code === 'INVALID_WALLET_ID' ? 400 :
                          result.code === 'INVALID_REFERRAL_CODE' ? 400 : 500;

        res.status(statusCode).json({
          success: false,
          error: result.error,
          code: result.code
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  async validateWallet(req: Request, res: Response) {
    try {
      const { walletId } = req.body;

      if (!walletId) {
        return res.status(400).json({
          success: false,
          error: 'Wallet ID é obrigatório'
        });
      }

      const validation = await affiliateService.validateWalletId(walletId);

      res.json({
        success: true,
        data: validation
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  async validateReferralCode(req: Request, res: Response) {
    try {
      const { code } = req.params;

      if (!code) {
        return res.status(400).json({
          success: false,
          error: 'Código de referência é obrigatório'
        });
      }

      const result = await affiliateService.getAffiliateByCode(code);

      if (result.success && result.data) {
        res.json({
          success: true,
          data: {
            valid: true,
            affiliate: {
              id: result.data.id,
              name: result.data.name
              // Removed email for PII protection
            }
          }
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'Código de referência inválido',
          data: { valid: false }
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  async getMyDashboard(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Usuário não autenticado'
        });
      }

      // Buscar dados do afiliado
      const affiliateResult = await affiliateService.getAffiliateByUserId(userId);
      if (!affiliateResult.success) {
        return res.status(404).json({
          success: false,
          error: affiliateResult.error
        });
      }

      const affiliate = affiliateResult.data!;

      // Buscar estatísticas
      const statsResult = await affiliateService.getAffiliateStats(affiliate.id);
      if (!statsResult.success) {
        return res.status(500).json({
          success: false,
          error: statsResult.error
        });
      }

      // Buscar rede direta
      const networkResult = await affiliateService.getMyNetwork(affiliate.id);
      if (!networkResult.success) {
        return res.status(500).json({
          success: false,
          error: networkResult.error
        });
      }

      res.json({
        success: true,
        data: {
          affiliate: {
            id: affiliate.id,
            name: affiliate.name,
            email: affiliate.email,
            referralCode: affiliate.referralCode,
            status: affiliate.status,
            createdAt: affiliate.createdAt,
          },
          stats: statsResult.data,
          networkSummary: {
            directReferrals: networkResult.data?.length || 0,
            activeReferrals: networkResult.data?.filter(a => a.status === 'active').length || 0,
          },
          referralLink: affiliateService.generateReferralLink(affiliate.referralCode),
        }
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  async getMyNetwork(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Usuário não autenticado'
        });
      }

      // Buscar afiliado
      const affiliateResult = await affiliateService.getAffiliateByUserId(userId);
      if (!affiliateResult.success) {
        return res.status(404).json({
          success: false,
          error: affiliateResult.error
        });
      }

      // Buscar rede
      const networkResult = await affiliateService.getNetworkTree(affiliateResult.data!.id);
      if (!networkResult.success) {
        return res.status(500).json({
          success: false,
          error: networkResult.error
        });
      }

      res.json({
        success: true,
        data: networkResult.data
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  async getMyReferralLink(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Usuário não autenticado'
        });
      }

      // Buscar afiliado
      const affiliateResult = await affiliateService.getAffiliateByUserId(userId);
      if (!affiliateResult.success) {
        return res.status(404).json({
          success: false,
          error: affiliateResult.error
        });
      }

      const referralLink = affiliateService.generateReferralLink(affiliateResult.data!.referralCode);

      res.json({
        success: true,
        data: { referralLink }
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // TODO: Implementar quando commission service estiver pronto
  async getMyCommissions(req: Request, res: Response) {
    res.status(501).json({
      success: false,
      error: 'Funcionalidade ainda não implementada'
    });
  }

  // TODO: Implementar quando click tracking estiver pronto
  async getMyClicks(req: Request, res: Response) {
    res.status(501).json({
      success: false,
      error: 'Funcionalidade ainda não implementada'
    });
  }

  // TODO: Implementar quando conversion tracking estiver pronto
  async getMyConversions(req: Request, res: Response) {
    res.status(501).json({
      success: false,
      error: 'Funcionalidade ainda não implementada'
    });
  }
}