/**
 * Feature Flags Middleware - Sistema de Assinaturas
 * 
 * Middleware para verificar feature flags antes de processar requests
 * das APIs de assinaturas.
 * 
 * Task 17.1: Configure feature flags para assinaturas
 */

import { Request, Response, NextFunction } from 'express';
import { featureFlags, FeatureFlagsConfig } from '../config/feature-flags.config';
import { LoggerService } from '../services/subscriptions/LoggerService';

interface FeatureFlagRequest extends Request {
  userId?: string;
  correlationId?: string;
}

/**
 * Middleware para verificar se feature está habilitada
 */
export const checkFeatureFlag = (featureName: keyof FeatureFlagsConfig['subscriptions']) => {
  return (req: FeatureFlagRequest, res: Response, next: NextFunction) => {
    const logger = new LoggerService('FeatureFlagsMiddleware');
    const correlationId = req.correlationId || crypto.randomUUID();
    const userId = req.userId || req.headers['x-user-id'] as string;
    
    try {
      const isEnabled = featureFlags.isEnabled(featureName, userId);
      
      if (!isEnabled) {
        logger.warn('Feature flag desabilitada', {
          correlationId,
          featureName,
          userId,
          path: req.path,
          method: req.method,
          userAgent: req.headers['user-agent'],
          ip: req.ip
        });
        
        // Verificar se é rollback ou manutenção
        const config = featureFlags.getConfig();
        
        if (config.maintenance.enabled) {
          return res.status(503).json({
            error: 'SERVICE_UNAVAILABLE',
            message: config.maintenance.message || 'Sistema em manutenção. Tente novamente mais tarde.',
            maintenanceInfo: {
              startTime: config.maintenance.startTime,
              endTime: config.maintenance.endTime
            }
          });
        }
        
        if (config.rollback.enabled) {
          const affectedFeatures = config.rollback.affectedFeatures || [];
          if (affectedFeatures.includes(featureName) || affectedFeatures.includes('all')) {
            return res.status(503).json({
              error: 'FEATURE_ROLLBACK',
              message: 'Funcionalidade temporariamente indisponível devido a rollback.',
              rollbackInfo: {
                reason: config.rollback.reason,
                triggeredAt: config.rollback.triggeredAt
              }
            });
          }
        }
        
        return res.status(404).json({
          error: 'FEATURE_DISABLED',
          message: 'Funcionalidade não disponível no momento.'
        });
      }
      
      logger.debug('Feature flag verificada', {
        correlationId,
        featureName,
        userId,
        enabled: true,
        path: req.path
      });
      
      // Adicionar informações ao request para uso posterior
      req.correlationId = correlationId;
      req.userId = userId;
      
      next();
      
    } catch (error) {
      logger.error('Erro ao verificar feature flag', error as Error, {
        correlationId,
        featureName,
        userId,
        path: req.path
      });
      
      // Em caso de erro, permitir acesso (fail-open)
      next();
    }
  };
};

/**
 * Middleware para verificar se sistema de assinaturas está habilitado
 */
export const checkSubscriptionsEnabled = (req: FeatureFlagRequest, res: Response, next: NextFunction) => {
  const logger = new LoggerService('FeatureFlagsMiddleware');
  const correlationId = req.correlationId || crypto.randomUUID();
  
  try {
    const config = featureFlags.getConfig();
    
    if (!config.subscriptions.enabled) {
      logger.warn('Sistema de assinaturas desabilitado', {
        correlationId,
        path: req.path,
        method: req.method,
        ip: req.ip
      });
      
      return res.status(503).json({
        error: 'SUBSCRIPTIONS_DISABLED',
        message: 'Sistema de assinaturas temporariamente indisponível.'
      });
    }
    
    req.correlationId = correlationId;
    next();
    
  } catch (error) {
    logger.error('Erro ao verificar sistema de assinaturas', error as Error, {
      correlationId,
      path: req.path
    });
    
    // Em caso de erro, permitir acesso (fail-open)
    next();
  }
};

/**
 * Middleware para adicionar headers de feature flags na resposta
 */
export const addFeatureFlagsHeaders = (req: Request, res: Response, next: NextFunction) => {
  const originalSend = res.send;
  
  res.send = function(data) {
    const config = featureFlags.getConfig();
    
    // Adicionar headers informativos (sem dados sensíveis)
    res.setHeader('X-Subscriptions-Enabled', config.subscriptions.enabled.toString());
    res.setHeader('X-Maintenance-Mode', config.maintenance.enabled.toString());
    res.setHeader('X-Rollback-Active', config.rollback.enabled.toString());
    
    return originalSend.call(this, data);
  };
  
  next();
};

/**
 * Middleware para logging de feature flags
 */
export const logFeatureFlagUsage = (featureName: keyof FeatureFlagsConfig['subscriptions']) => {
  return (req: FeatureFlagRequest, res: Response, next: NextFunction) => {
    const logger = new LoggerService('FeatureFlagsUsage');
    const correlationId = req.correlationId || crypto.randomUUID();
    const userId = req.userId;
    
    const startTime = Date.now();
    
    // Log do início da requisição
    logger.info('Feature flag utilizada', {
      correlationId,
      featureName,
      userId,
      path: req.path,
      method: req.method,
      userAgent: req.headers['user-agent'],
      ip: req.ip,
      timestamp: new Date().toISOString()
    });
    
    // Override do res.end para capturar métricas
    const originalEnd = res.end;
    res.end = function(...args) {
      const duration = Date.now() - startTime;
      
      logger.info('Feature flag processada', {
        correlationId,
        featureName,
        userId,
        statusCode: res.statusCode,
        duration,
        success: res.statusCode < 400
      });
      
      return originalEnd.apply(this, args);
    };
    
    req.correlationId = correlationId;
    next();
  };
};

/**
 * Middleware para verificar rollout percentage
 */
export const checkRolloutPercentage = (featureName: keyof FeatureFlagsConfig['subscriptions']) => {
  return (req: FeatureFlagRequest, res: Response, next: NextFunction) => {
    const logger = new LoggerService('RolloutMiddleware');
    const correlationId = req.correlationId || crypto.randomUUID();
    const userId = req.userId || req.headers['x-user-id'] as string;
    
    if (!userId) {
      // Se não há userId, permitir acesso (para requests internos)
      return next();
    }
    
    try {
      const config = featureFlags.getConfig();
      const feature = config.subscriptions[featureName];
      
      if (!feature || feature.rolloutPercentage === undefined || feature.rolloutPercentage >= 100) {
        return next();
      }
      
      // Verificar se usuário está no rollout
      const isInRollout = featureFlags.isEnabled(featureName, userId);
      
      if (!isInRollout) {
        logger.info('Usuário fora do rollout', {
          correlationId,
          featureName,
          userId,
          rolloutPercentage: feature.rolloutPercentage
        });
        
        return res.status(404).json({
          error: 'FEATURE_NOT_AVAILABLE',
          message: 'Funcionalidade não disponível para este usuário.'
        });
      }
      
      logger.debug('Usuário no rollout', {
        correlationId,
        featureName,
        userId,
        rolloutPercentage: feature.rolloutPercentage
      });
      
      next();
      
    } catch (error) {
      logger.error('Erro ao verificar rollout', error as Error, {
        correlationId,
        featureName,
        userId
      });
      
      // Em caso de erro, permitir acesso
      next();
    }
  };
};

/**
 * Middleware combinado para verificações completas de feature flags
 */
export const subscriptionFeatureGuard = (featureName: keyof FeatureFlagsConfig['subscriptions']) => {
  return [
    checkSubscriptionsEnabled,
    checkFeatureFlag(featureName),
    checkRolloutPercentage(featureName),
    logFeatureFlagUsage(featureName),
    addFeatureFlagsHeaders
  ];
};