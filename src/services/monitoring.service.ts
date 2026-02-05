/**
 * Monitoring Service
 * Sistema de Validação por CPF/CNPJ para Afiliados
 * 
 * Responsável por monitoramento, métricas e alertas do sistema de CPF/CNPJ
 */

import { supabase } from '../config/supabase';
import { reportService } from './report.service';
import { notificationService } from './notification.service';

export interface SystemHealthMetrics {
  timestamp: string;
  validation_metrics: {
    total_validations_24h: number;
    success_rate_24h: number;
    avg_response_time_ms: number;
    error_rate_24h: number;
    cpf_vs_cnpj_ratio: number;
  };
  regularization_metrics: {
    total_pending: number;
    expiring_soon: number; // próximos 7 dias
    expired_count: number;
    completion_rate_30d: number;
    avg_completion_time_days: number;
  };
  system_metrics: {
    active_affiliates: number;
    affiliates_without_document: number;
    document_coverage_percentage: number;
    duplicate_attempts_24h: number;
  };
  performance_metrics: {
    database_response_time_ms: number;
    api_availability_percentage: number;
    notification_delivery_rate: number;
  };
}

export interface AlertRule {
  id: string;
  name: string;
  metric_path: string;
  condition: 'greater_than' | 'less_than' | 'equals';
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  notification_channels: string[];
  cooldown_minutes: number;
  last_triggered?: string;
}

export interface SystemAlert {
  id: string;
  rule_id: string;
  rule_name: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  current_value: number;
  threshold: number;
  triggered_at: string;
  resolved_at?: string;
  status: 'active' | 'resolved' | 'acknowledged';
}

class MonitoringService {

  /**
   * Coleta métricas completas de saúde do sistema
   */
  async collectSystemHealthMetrics(): Promise<SystemHealthMetrics> {
    try {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Métricas de validação (últimas 24h)
      const validationStats = await reportService.getValidationReport({
        startDate: yesterday.toISOString(),
        endDate: now.toISOString(),
        limit: 10000
      });

      const totalValidations24h = validationStats.length;
      const successfulValidations = validationStats.filter(v => v.validation_result === 'VALID').length;
      const cpfValidations = validationStats.filter(v => v.document_type === 'CPF').length;
      const cnpjValidations = validationStats.filter(v => v.document_type === 'CNPJ').length;

      // Métricas de regularização
      const summary = await reportService.getSystemSummary();
      
      // Calcular taxa de conclusão (últimos 30 dias)
      const { data: completedRegularizations } = await supabase
        .from('regularization_requests')
        .select('completed_at, created_at')
        .eq('status', 'completed')
        .gte('completed_at', thirtyDaysAgo.toISOString());

      const completionRate30d = completedRegularizations?.length || 0;
      
      // Calcular tempo médio de conclusão
      let avgCompletionTimeDays = 0;
      if (completedRegularizations && completedRegularizations.length > 0) {
        const totalDays = completedRegularizations.reduce((sum, req) => {
          const created = new Date(req.created_at);
          const completed = new Date(req.completed_at);
          const days = (completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
          return sum + days;
        }, 0);
        avgCompletionTimeDays = totalDays / completedRegularizations.length;
      }

      // Métricas de performance (simuladas - em produção viriam de APM)
      const performanceMetrics = await this.collectPerformanceMetrics();

      const metrics: SystemHealthMetrics = {
        timestamp: now.toISOString(),
        validation_metrics: {
          total_validations_24h: totalValidations24h,
          success_rate_24h: totalValidations24h > 0 ? (successfulValidations / totalValidations24h) * 100 : 100,
          avg_response_time_ms: performanceMetrics.database_response_time_ms,
          error_rate_24h: totalValidations24h > 0 ? ((totalValidations24h - successfulValidations) / totalValidations24h) * 100 : 0,
          cpf_vs_cnpj_ratio: cnpjValidations > 0 ? cpfValidations / cnpjValidations : cpfValidations
        },
        regularization_metrics: {
          total_pending: summary.pending_regularizations,
          expiring_soon: await this.countExpiringSoon(),
          expired_count: summary.expired_regularizations,
          completion_rate_30d: completionRate30d,
          avg_completion_time_days: Math.round(avgCompletionTimeDays * 10) / 10
        },
        system_metrics: {
          active_affiliates: summary.total_affiliates,
          affiliates_without_document: summary.affiliates_without_document,
          document_coverage_percentage: summary.total_affiliates > 0 ? 
            (summary.affiliates_with_document / summary.total_affiliates) * 100 : 100,
          duplicate_attempts_24h: validationStats.filter(v => v.validation_result === 'DUPLICATE').length
        },
        performance_metrics: performanceMetrics
      };

      // Salvar métricas no banco para histórico
      await this.saveMetricsToDatabase(metrics);

      return metrics;

    } catch (error) {
      console.error('Erro ao coletar métricas de saúde:', error);
      throw error;
    }
  }

  /**
   * Coleta métricas de performance do sistema
   */
  private async collectPerformanceMetrics(): Promise<{
    database_response_time_ms: number;
    api_availability_percentage: number;
    notification_delivery_rate: number;
  }> {
    try {
      // Testar tempo de resposta do banco
      const dbStart = Date.now();
      await supabase.from('affiliates').select('id').limit(1);
      const dbResponseTime = Date.now() - dbStart;

      // Simular outras métricas (em produção viriam de APM/monitoring real)
      return {
        database_response_time_ms: dbResponseTime,
        api_availability_percentage: 99.9, // Seria calculado baseado em health checks
        notification_delivery_rate: 98.5   // Seria calculado baseado em logs de notificação
      };

    } catch (error) {
      console.error('Erro ao coletar métricas de performance:', error);
      return {
        database_response_time_ms: 9999,
        api_availability_percentage: 0,
        notification_delivery_rate: 0
      };
    }
  }

  /**
   * Conta regularizações expirando nos próximos 7 dias
   */
  private async countExpiringSoon(): Promise<number> {
    try {
      const now = new Date();
      const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const { data, error } = await supabase
        .from('regularization_requests')
        .select('id', { count: 'exact' })
        .eq('status', 'pending')
        .gte('expires_at', now.toISOString())
        .lte('expires_at', sevenDaysFromNow.toISOString());

      if (error) {
        console.error('Erro ao contar regularizações expirando:', error);
        return 0;
      }

      return data?.length || 0;

    } catch (error) {
      console.error('Erro ao contar regularizações expirando:', error);
      return 0;
    }
  }

  /**
   * Salva métricas no banco para histórico
   */
  private async saveMetricsToDatabase(metrics: SystemHealthMetrics): Promise<void> {
    try {
      await supabase
        .from('system_health_metrics')
        .insert([{
          timestamp: metrics.timestamp,
          metrics_data: metrics,
          created_at: new Date().toISOString()
        }]);

    } catch (error) {
      console.error('Erro ao salvar métricas no banco:', error);
      // Não falhar o processo por causa do log
    }
  }

  /**
   * Verifica regras de alerta e dispara notificações
   */
  async checkAlertRules(): Promise<SystemAlert[]> {
    try {
      const metrics = await this.collectSystemHealthMetrics();
      const alertRules = await this.getActiveAlertRules();
      const triggeredAlerts: SystemAlert[] = [];

      for (const rule of alertRules) {
        const currentValue = this.getMetricValue(metrics, rule.metric_path);
        const shouldTrigger = this.evaluateAlertCondition(currentValue, rule.condition, rule.threshold);

        if (shouldTrigger && !this.isInCooldown(rule)) {
          const alert = await this.triggerAlert(rule, currentValue);
          if (alert) {
            triggeredAlerts.push(alert);
          }
        }
      }

      return triggeredAlerts;

    } catch (error) {
      console.error('Erro ao verificar regras de alerta:', error);
      return [];
    }
  }

  /**
   * Obtém regras de alerta ativas
   */
  private async getActiveAlertRules(): Promise<AlertRule[]> {
    try {
      const { data: rules, error } = await supabase
        .from('alert_rules')
        .select('*')
        .eq('enabled', true);

      if (error) {
        console.error('Erro ao buscar regras de alerta:', error);
        return [];
      }

      return rules || [];

    } catch (error) {
      console.error('Erro ao buscar regras de alerta:', error);
      return [];
    }
  }

  /**
   * Obtém valor de métrica por caminho
   */
  private getMetricValue(metrics: SystemHealthMetrics, path: string): number {
    const parts = path.split('.');
    let value: any = metrics;
    
    for (const part of parts) {
      value = value?.[part];
    }
    
    return typeof value === 'number' ? value : 0;
  }

  /**
   * Avalia condição de alerta
   */
  private evaluateAlertCondition(currentValue: number, condition: string, threshold: number): boolean {
    switch (condition) {
      case 'greater_than':
        return currentValue > threshold;
      case 'less_than':
        return currentValue < threshold;
      case 'equals':
        return currentValue === threshold;
      default:
        return false;
    }
  }

  /**
   * Verifica se regra está em cooldown
   */
  private isInCooldown(rule: AlertRule): boolean {
    if (!rule.last_triggered) return false;
    
    const lastTriggered = new Date(rule.last_triggered);
    const cooldownEnd = new Date(lastTriggered.getTime() + rule.cooldown_minutes * 60 * 1000);
    
    return new Date() < cooldownEnd;
  }

  /**
   * Dispara alerta
   */
  private async triggerAlert(rule: AlertRule, currentValue: number): Promise<SystemAlert | null> {
    try {
      const alert: SystemAlert = {
        id: `alert_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        rule_id: rule.id,
        rule_name: rule.name,
        severity: rule.severity,
        message: `${rule.name}: Valor atual ${currentValue} ${rule.condition} ${rule.threshold}`,
        current_value: currentValue,
        threshold: rule.threshold,
        triggered_at: new Date().toISOString(),
        status: 'active'
      };

      // Salvar alerta no banco
      await supabase
        .from('system_alerts')
        .insert([alert]);

      // Atualizar última execução da regra
      await supabase
        .from('alert_rules')
        .update({ last_triggered: new Date().toISOString() })
        .eq('id', rule.id);

      // Enviar notificações
      await this.sendAlertNotifications(alert, rule);

      console.log(`Alerta disparado: ${alert.message}`);
      return alert;

    } catch (error) {
      console.error('Erro ao disparar alerta:', error);
      return null;
    }
  }

  /**
   * Envia notificações de alerta
   */
  private async sendAlertNotifications(alert: SystemAlert, rule: AlertRule): Promise<void> {
    try {
      for (const channel of rule.notification_channels) {
        if (channel.includes('@')) {
          // Email
          await notificationService.sendCustomEmail({
            to: channel,
            subject: `[${alert.severity.toUpperCase()}] ${alert.rule_name}`,
            template: 'system_alert',
            data: {
              alert,
              rule,
              timestamp: new Date().toLocaleString('pt-BR')
            }
          });
        }
        // Adicionar outros canais (Slack, Discord, etc.) conforme necessário
      }

    } catch (error) {
      console.error('Erro ao enviar notificações de alerta:', error);
    }
  }

  /**
   * Cria regras de alerta padrão do sistema
   */
  async createDefaultAlertRules(): Promise<void> {
    try {
      const defaultRules: Omit<AlertRule, 'id'>[] = [
        {
          name: 'Taxa de Erro Alta',
          metric_path: 'validation_metrics.error_rate_24h',
          condition: 'greater_than',
          threshold: 10, // > 10% de erro
          severity: 'high',
          enabled: true,
          notification_channels: ['admin@slimquality.com.br'],
          cooldown_minutes: 60
        },
        {
          name: 'Tempo de Resposta Alto',
          metric_path: 'performance_metrics.database_response_time_ms',
          condition: 'greater_than',
          threshold: 1000, // > 1 segundo
          severity: 'medium',
          enabled: true,
          notification_channels: ['admin@slimquality.com.br'],
          cooldown_minutes: 30
        },
        {
          name: 'Muitas Regularizações Expirando',
          metric_path: 'regularization_metrics.expiring_soon',
          condition: 'greater_than',
          threshold: 10, // > 10 expirando em 7 dias
          severity: 'medium',
          enabled: true,
          notification_channels: ['admin@slimquality.com.br'],
          cooldown_minutes: 1440 // 24 horas
        },
        {
          name: 'Cobertura de Documentos Baixa',
          metric_path: 'system_metrics.document_coverage_percentage',
          condition: 'less_than',
          threshold: 80, // < 80% de cobertura
          severity: 'low',
          enabled: true,
          notification_channels: ['admin@slimquality.com.br'],
          cooldown_minutes: 1440 // 24 horas
        },
        {
          name: 'Sistema Indisponível',
          metric_path: 'performance_metrics.api_availability_percentage',
          condition: 'less_than',
          threshold: 95, // < 95% disponibilidade
          severity: 'critical',
          enabled: true,
          notification_channels: ['admin@slimquality.com.br'],
          cooldown_minutes: 15
        }
      ];

      for (const rule of defaultRules) {
        await supabase
          .from('alert_rules')
          .upsert([{
            ...rule,
            id: `default_${rule.name.toLowerCase().replace(/\s+/g, '_')}`
          }]);
      }

      console.log('Regras de alerta padrão criadas com sucesso');

    } catch (error) {
      console.error('Erro ao criar regras de alerta padrão:', error);
    }
  }

  /**
   * Obtém histórico de métricas
   */
  async getMetricsHistory(hours: number = 24): Promise<SystemHealthMetrics[]> {
    try {
      const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);

      const { data: metricsHistory, error } = await supabase
        .from('system_health_metrics')
        .select('metrics_data')
        .gte('timestamp', startTime.toISOString())
        .order('timestamp', { ascending: true });

      if (error) {
        console.error('Erro ao buscar histórico de métricas:', error);
        return [];
      }

      return metricsHistory?.map(m => m.metrics_data) || [];

    } catch (error) {
      console.error('Erro ao buscar histórico de métricas:', error);
      return [];
    }
  }

  /**
   * Obtém alertas ativos
   */
  async getActiveAlerts(): Promise<SystemAlert[]> {
    try {
      const { data: alerts, error } = await supabase
        .from('system_alerts')
        .select('*')
        .eq('status', 'active')
        .order('triggered_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar alertas ativos:', error);
        return [];
      }

      return alerts || [];

    } catch (error) {
      console.error('Erro ao buscar alertas ativos:', error);
      return [];
    }
  }
}

export const monitoringService = new MonitoringService();
export default monitoringService;