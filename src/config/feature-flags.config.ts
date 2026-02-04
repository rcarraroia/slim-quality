/**
 * Feature Flags Configuration - Sistema de Assinaturas
 * 
 * Controla a habilitação/desabilitação de funcionalidades do sistema
 * de assinaturas sem necessidade de deploy.
 * 
 * Task 17.1: Configure feature flags para assinaturas
 */

import { z } from 'zod';

// Schema de validação para feature flags
const FeatureFlagSchema = z.object({
  enabled: z.boolean(),
  rolloutPercentage: z.number().min(0).max(100).optional().default(100),
  allowedUserIds: z.array(z.string()).optional().default([]),
  blockedUserIds: z.array(z.string()).optional().default([]),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  description: z.string().optional(),
  lastModified: z.string().datetime().optional(),
  modifiedBy: z.string().optional()
});

const FeatureFlagsConfigSchema = z.object({
  subscriptions: z.object({
    enabled: z.boolean().default(true),
    createPayment: FeatureFlagSchema,
    pollPaymentStatus: FeatureFlagSchema,
    createSubscription: FeatureFlagSchema,
    processWebhook: FeatureFlagSchema,
    frontend: FeatureFlagSchema,
    notifications: FeatureFlagSchema,
    healthMonitoring: FeatureFlagSchema
  }),
  rollback: z.object({
    enabled: z.boolean().default(false),
    reason: z.string().optional(),
    triggeredAt: z.string().datetime().optional(),
    triggeredBy: z.string().optional(),
    affectedFeatures: z.array(z.string()).optional().default([])
  }),
  maintenance: z.object({
    enabled: z.boolean().default(false),
    message: z.string().optional(),
    startTime: z.string().datetime().optional(),
    endTime: z.string().datetime().optional()
  })
});

export type FeatureFlag = z.infer<typeof FeatureFlagSchema>;
export type FeatureFlagsConfig = z.infer<typeof FeatureFlagsConfigSchema>;

// Configuração padrão das feature flags
const defaultConfig: FeatureFlagsConfig = {
  subscriptions: {
    enabled: true,
    createPayment: {
      enabled: true,
      rolloutPercentage: 100,
      description: 'Criação de pagamentos de assinaturas via Edge Function'
    },
    pollPaymentStatus: {
      enabled: true,
      rolloutPercentage: 100,
      description: 'Polling de status de pagamentos com timeout de 15s'
    },
    createSubscription: {
      enabled: true,
      rolloutPercentage: 100,
      description: 'Criação de assinaturas recorrentes após confirmação'
    },
    processWebhook: {
      enabled: true,
      rolloutPercentage: 100,
      description: 'Processamento de webhooks do Asaas com idempotência'
    },
    frontend: {
      enabled: true,
      rolloutPercentage: 100,
      description: 'Interface frontend para checkout de assinaturas'
    },
    notifications: {
      enabled: true,
      rolloutPercentage: 100,
      description: 'Sistema de notificações para assinaturas'
    },
    healthMonitoring: {
      enabled: true,
      rolloutPercentage: 100,
      description: 'Monitoramento de saúde dos sistemas'
    }
  },
  rollback: {
    enabled: false
  },
  maintenance: {
    enabled: false
  }
};

// Cache das feature flags (em produção, usar Redis)
let cachedConfig: FeatureFlagsConfig = defaultConfig;
let lastCacheUpdate = Date.now();
const CACHE_TTL = 60000; // 1 minuto

/**
 * Classe para gerenciar feature flags
 */
export class FeatureFlagsManager {
  private static instance: FeatureFlagsManager;
  
  private constructor() {}
  
  static getInstance(): FeatureFlagsManager {
    if (!FeatureFlagsManager.instance) {
      FeatureFlagsManager.instance = new FeatureFlagsManager();
    }
    return FeatureFlagsManager.instance;
  }
  
  /**
   * Verifica se uma feature está habilitada
   */
  isEnabled(featureName: keyof FeatureFlagsConfig['subscriptions'], userId?: string): boolean {
    const config = this.getConfig();
    
    // Verificar se sistema está em manutenção
    if (config.maintenance.enabled) {
      return false;
    }
    
    // Verificar se rollback está ativo
    if (config.rollback.enabled) {
      const affectedFeatures = config.rollback.affectedFeatures || [];
      if (affectedFeatures.includes(featureName) || affectedFeatures.includes('all')) {
        return false;
      }
    }
    
    // Verificar se subsistema de assinaturas está habilitado
    if (!config.subscriptions.enabled) {
      return false;
    }
    
    const feature = config.subscriptions[featureName];
    if (!feature || !feature.enabled) {
      return false;
    }
    
    // Verificar se usuário está bloqueado
    if (userId && feature.blockedUserIds?.includes(userId)) {
      return false;
    }
    
    // Verificar se usuário está na lista permitida (se existir)
    if (feature.allowedUserIds && feature.allowedUserIds.length > 0) {
      if (!userId || !feature.allowedUserIds.includes(userId)) {
        return false;
      }
    }
    
    // Verificar rollout percentage
    if (feature.rolloutPercentage !== undefined && feature.rolloutPercentage < 100) {
      if (!userId) {
        return false;
      }
      
      // Hash simples do userId para determinar se está no rollout
      const hash = this.hashUserId(userId);
      const userPercentage = hash % 100;
      
      if (userPercentage >= feature.rolloutPercentage) {
        return false;
      }
    }
    
    // Verificar datas de início e fim
    const now = new Date();
    
    if (feature.startDate && now < new Date(feature.startDate)) {
      return false;
    }
    
    if (feature.endDate && now > new Date(feature.endDate)) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Obtém configuração atual das feature flags
   */
  getConfig(): FeatureFlagsConfig {
    // Em produção, buscar do banco de dados ou Redis
    // Por enquanto, usar cache em memória
    
    if (Date.now() - lastCacheUpdate > CACHE_TTL) {
      this.refreshCache();
    }
    
    return cachedConfig;
  }
  
  /**
   * Atualiza configuração das feature flags
   */
  updateConfig(newConfig: Partial<FeatureFlagsConfig>, modifiedBy?: string): void {
    const timestamp = new Date().toISOString();
    
    // Merge com configuração atual
    const updatedConfig = {
      ...cachedConfig,
      ...newConfig
    };
    
    // Adicionar metadados de modificação
    if (newConfig.subscriptions) {
      Object.keys(newConfig.subscriptions).forEach(key => {
        if (key !== 'enabled' && updatedConfig.subscriptions[key as keyof typeof updatedConfig.subscriptions]) {
          const feature = updatedConfig.subscriptions[key as keyof typeof updatedConfig.subscriptions] as FeatureFlag;
          feature.lastModified = timestamp;
          feature.modifiedBy = modifiedBy;
        }
      });
    }
    
    // Validar configuração
    const validatedConfig = FeatureFlagsConfigSchema.parse(updatedConfig);
    
    cachedConfig = validatedConfig;
    lastCacheUpdate = Date.now();
    
    // Em produção, salvar no banco de dados
    this.persistConfig(validatedConfig);
  }
  
  /**
   * Ativa rollback imediato
   */
  activateRollback(reason: string, affectedFeatures: string[] = ['all'], triggeredBy?: string): void {
    const rollbackConfig = {
      rollback: {
        enabled: true,
        reason,
        triggeredAt: new Date().toISOString(),
        triggeredBy,
        affectedFeatures
      }
    };
    
    this.updateConfig(rollbackConfig, triggeredBy);
    
    console.error('🚨 ROLLBACK ATIVADO:', {
      reason,
      affectedFeatures,
      triggeredBy,
      timestamp: rollbackConfig.rollback.triggeredAt
    });
  }
  
  /**
   * Desativa rollback
   */
  deactivateRollback(triggeredBy?: string): void {
    const rollbackConfig = {
      rollback: {
        enabled: false,
        reason: undefined,
        triggeredAt: undefined,
        triggeredBy: undefined,
        affectedFeatures: []
      }
    };
    
    this.updateConfig(rollbackConfig, triggeredBy);
    
    console.info('✅ ROLLBACK DESATIVADO:', {
      triggeredBy,
      timestamp: new Date().toISOString()
    });
  }
  
  /**
   * Ativa modo de manutenção
   */
  activateMaintenance(message: string, startTime?: string, endTime?: string): void {
    const maintenanceConfig = {
      maintenance: {
        enabled: true,
        message,
        startTime: startTime || new Date().toISOString(),
        endTime
      }
    };
    
    this.updateConfig(maintenanceConfig);
    
    console.warn('🔧 MODO MANUTENÇÃO ATIVADO:', maintenanceConfig.maintenance);
  }
  
  /**
   * Desativa modo de manutenção
   */
  deactivateMaintenance(): void {
    const maintenanceConfig = {
      maintenance: {
        enabled: false,
        message: undefined,
        startTime: undefined,
        endTime: undefined
      }
    };
    
    this.updateConfig(maintenanceConfig);
    
    console.info('✅ MODO MANUTENÇÃO DESATIVADO');
  }
  
  /**
   * Gradual rollout - aumenta percentual gradualmente
   */
  gradualRollout(featureName: keyof FeatureFlagsConfig['subscriptions'], targetPercentage: number, incrementPerMinute: number = 10): void {
    const config = this.getConfig();
    const feature = config.subscriptions[featureName] as FeatureFlag;
    
    if (!feature) {
      throw new Error(`Feature ${featureName} não encontrada`);
    }
    
    const currentPercentage = feature.rolloutPercentage || 0;
    
    if (currentPercentage >= targetPercentage) {
      console.info(`Feature ${featureName} já está em ${currentPercentage}%`);
      return;
    }
    
    const interval = setInterval(() => {
      const config = this.getConfig();
      const feature = config.subscriptions[featureName] as FeatureFlag;
      const currentPercentage = feature.rolloutPercentage || 0;
      
      if (currentPercentage >= targetPercentage) {
        clearInterval(interval);
        console.info(`✅ Gradual rollout concluído: ${featureName} em ${targetPercentage}%`);
        return;
      }
      
      const newPercentage = Math.min(currentPercentage + incrementPerMinute, targetPercentage);
      
      this.updateConfig({
        subscriptions: {
          ...config.subscriptions,
          [featureName]: {
            ...feature,
            rolloutPercentage: newPercentage
          }
        }
      });
      
      console.info(`📈 Gradual rollout: ${featureName} agora em ${newPercentage}%`);
    }, 60000); // 1 minuto
  }
  
  /**
   * Hash simples para determinar rollout
   */
  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
  
  /**
   * Atualiza cache das feature flags
   */
  private refreshCache(): void {
    // Em produção, buscar do banco de dados ou Redis
    // Por enquanto, manter configuração atual
    lastCacheUpdate = Date.now();
  }
  
  /**
   * Persiste configuração no banco de dados
   */
  private persistConfig(config: FeatureFlagsConfig): void {
    // Em produção, salvar no banco de dados
    // Por enquanto, apenas log
    console.info('💾 Feature flags atualizadas:', {
      timestamp: new Date().toISOString(),
      config: JSON.stringify(config, null, 2)
    });
  }
}

// Instância singleton
export const featureFlags = FeatureFlagsManager.getInstance();

// Funções de conveniência
export const isSubscriptionFeatureEnabled = (featureName: keyof FeatureFlagsConfig['subscriptions'], userId?: string): boolean => {
  return featureFlags.isEnabled(featureName, userId);
};

export const activateEmergencyRollback = (reason: string, triggeredBy?: string): void => {
  featureFlags.activateRollback(reason, ['all'], triggeredBy);
};

export const getFeatureFlagsStatus = (): FeatureFlagsConfig => {
  return featureFlags.getConfig();
};