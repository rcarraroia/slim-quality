/**
 * Referral Tracking Middleware
 * Sprint 4: Sistema de Afiliados Multinível
 * 
 * Middleware para capturar códigos de referência automaticamente
 * - Detecta parâmetro ?ref= em todas as rotas
 * - Salva em cookie com TTL de 30 dias
 * - Registra cliques automaticamente
 * - Extrai dados UTM para analytics
 */

import { Request, Response, NextFunction } from 'express';
import { Logger } from '@/utils/logger';
import { referralTrackerService } from '@/services/affiliates/referral-tracker.service';

export interface ReferralTrackingRequest extends Request {
  referralCode?: string;
  isNewReferral?: boolean;
}

export class ReferralTrackingMiddleware {
  private readonly COOKIE_NAME = 'slim_ref';
  private readonly COOKIE_TTL_DAYS = 30;

  /**
   * Middleware principal para rastreamento
   */
  track() {
    return async (req: ReferralTrackingRequest, res: Response, next: NextFunction) => {
      try {
        // 1. Verificar se há código de referência na URL
        const urlReferralCode = req.query.ref as string;
        let currentReferralCode = req.cookies[this.COOKIE_NAME];
        let isNewReferral = false;

        // 2. Se há código na URL, atualizar cookie
        if (urlReferralCode && this.isValidReferralCode(urlReferralCode)) {
          // Só atualizar se for diferente do atual
          if (currentReferralCode !== urlReferralCode) {
            currentReferralCode = urlReferralCode;
            isNewReferral = true;

            // Definir cookie com TTL de 30 dias
            const expirationDate = new Date();
            expirationDate.setDate(expirationDate.getDate() + this.COOKIE_TTL_DAYS);

            res.cookie(this.COOKIE_NAME, urlReferralCode, {
              expires: expirationDate,
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
            });

            Logger.info('ReferralTracking', 'Referral code captured', {
              referralCode: urlReferralCode,
              ip: this.getClientIp(req),
              userAgent: req.get('User-Agent'),
            });
          }
        }

        // 3. Adicionar dados ao request
        req.referralCode = currentReferralCode;
        req.isNewReferral = isNewReferral;

        // 4. Registrar clique se é novo referral
        if (isNewReferral && currentReferralCode) {
          // Fazer de forma assíncrona para não bloquear a resposta
          this.trackClickAsync(req, currentReferralCode);
        }

        next();

      } catch (error) {
        Logger.error('ReferralTracking', 'Error in tracking middleware', error as Error);
        // Não bloquear a requisição por erro de tracking
        next();
      }
    };
  }

  /**
   * Registra clique de forma assíncrona
   */
  private async trackClickAsync(req: ReferralTrackingRequest, referralCode: string): Promise<void> {
    try {
      const trackingData = {
        referralCode,
        ipAddress: this.getClientIp(req),
        userAgent: req.get('User-Agent'),
        referer: req.get('Referer'),
        utmSource: req.query.utm_source as string,
        utmMedium: req.query.utm_medium as string,
        utmCampaign: req.query.utm_campaign as string,
        utmTerm: req.query.utm_term as string,
        utmContent: req.query.utm_content as string,
        sessionId: req.sessionID,
      };

      const result = await referralTrackerService.trackClick(trackingData);
      
      if (result.success) {
        Logger.info('ReferralTracking', 'Click tracked successfully', {
          referralCode,
          clickId: result.data?.id,
        });
      } else {
        Logger.warn('ReferralTracking', 'Failed to track click', {
          referralCode,
          error: result.error,
        });
      }

    } catch (error) {
      Logger.error('ReferralTracking', 'Error tracking click async', error as Error);
    }
  }

  /**
   * Middleware para limpar código de referência
   */
  clear() {
    return (req: Request, res: Response, next: NextFunction) => {
      res.clearCookie(this.COOKIE_NAME);
      Logger.info('ReferralTracking', 'Referral code cleared');
      next();
    };
  }

  /**
   * Middleware para obter código atual
   */
  getCurrent() {
    return (req: ReferralTrackingRequest, res: Response, next: NextFunction) => {
      req.referralCode = req.cookies[this.COOKIE_NAME];
      next();
    };
  }

  /**
   * Valida formato do código de referência
   */
  private isValidReferralCode(code: string): boolean {
    // Código deve ter 6 caracteres alfanuméricos
    return /^[A-Z0-9]{6}$/.test(code);
  }

  /**
   * Obtém IP real do cliente (considerando proxies)
   */
  private getClientIp(req: Request): string {
    const forwarded = req.get('X-Forwarded-For');
    const realIp = req.get('X-Real-IP');
    const clientIp = req.get('X-Client-IP');
    
    if (forwarded) {
      // X-Forwarded-For pode conter múltiplos IPs, pegar o primeiro
      return forwarded.split(',')[0].trim();
    }
    
    if (realIp) {
      return realIp;
    }
    
    if (clientIp) {
      return clientIp;
    }
    
    return req.ip || req.connection.remoteAddress || 'unknown';
  }

  /**
   * Middleware para rastrear conversão em pedidos
   */
  trackConversion() {
    return async (req: ReferralTrackingRequest, res: Response, next: NextFunction) => {
      try {
        // Este middleware deve ser usado após a criação do pedido
        const orderId = req.body.orderId || req.params.orderId;
        const referralCode = req.referralCode;

        if (orderId && referralCode) {
          Logger.info('ReferralTracking', 'Tracking conversion', {
            orderId,
            referralCode,
          });

          // Registrar conversão de forma assíncrona
          referralTrackerService.trackConversion({
            orderId,
            referralCode,
          }).then(result => {
            if (result.success) {
              Logger.info('ReferralTracking', 'Conversion tracked successfully', {
                orderId,
                referralCode,
                conversionId: result.data?.id,
              });
            } else {
              Logger.warn('ReferralTracking', 'Failed to track conversion', {
                orderId,
                referralCode,
                error: result.error,
              });
            }
          }).catch(error => {
            Logger.error('ReferralTracking', 'Error tracking conversion', error);
          });
        }

        next();

      } catch (error) {
        Logger.error('ReferralTracking', 'Error in conversion tracking middleware', error as Error);
        next();
      }
    };
  }

  /**
   * Middleware para adicionar dados de referência ao contexto
   */
  addToContext() {
    return (req: ReferralTrackingRequest, res: Response, next: NextFunction) => {
      // Adicionar dados de referência ao contexto da resposta
      res.locals.referralCode = req.referralCode;
      res.locals.isNewReferral = req.isNewReferral;
      
      // Adicionar helper para templates
      res.locals.hasReferral = !!req.referralCode;
      
      next();
    };
  }

  /**
   * Middleware para analytics (adiciona headers de tracking)
   */
  addAnalyticsHeaders() {
    return (req: ReferralTrackingRequest, res: Response, next: NextFunction) => {
      if (req.referralCode) {
        // Adicionar header para analytics do frontend
        res.set('X-Referral-Code', req.referralCode);
        res.set('X-Has-Referral', 'true');
      }
      
      next();
    };
  }

  /**
   * Middleware para debug (apenas em desenvolvimento)
   */
  debug() {
    return (req: ReferralTrackingRequest, res: Response, next: NextFunction) => {
      if (process.env.NODE_ENV === 'development') {
        Logger.debug('ReferralTracking', 'Debug info', {
          url: req.url,
          method: req.method,
          referralCode: req.referralCode,
          isNewReferral: req.isNewReferral,
          cookies: req.cookies,
          query: req.query,
        });
      }
      
      next();
    };
  }
}

export const referralTrackingMiddleware = new ReferralTrackingMiddleware();