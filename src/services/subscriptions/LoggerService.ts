/**
 * LoggerService - Sistema de logging estruturado para assinaturas
 * 
 * Implementa logging completo com:
 * - Correlation IDs únicos para rastreamento
 * - Níveis apropriados (DEBUG, INFO, WARN, ERROR)
 * - Stack traces completos para erros
 * - Métricas de performance
 * - Contexto estruturado
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 17.1
 */

import { v4 as uuidv4 } from 'uuid';

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

export interface LogContext {
  correlationId: string;
  service: string;
  operation: string;
  userId?: string;
  paymentId?: string;
  subscriptionId?: string;
  customerId?: string;
  metadata?: Record<string, any>;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context: LogContext;
  duration?: number;
  error?: {
    name: string;
    message: string;
    stack: string;
    code?: string;
  };
  metrics?: {
    performance: number;
    success: boolean;
    retryCount?: number;
    operationType: string;
  };
}

export interface PerformanceMetrics {
  startTime: number;
  operation: string;
  correlationId: string;
  success?: boolean;
  retryCount?: number;
}

export class LoggerService {
  private static instance: LoggerService;
  private performanceTrackers: Map<string, PerformanceMetrics> = new Map();

  private constructor() {}

  public static getInstance(): LoggerService {
    if (!LoggerService.instance) {
      LoggerService.instance = new LoggerService();
    }
    return LoggerService.instance;
  }

  /**
   * Gera um correlation ID único para rastrear fluxos
   */
  public generateCorrelationId(): string {
    return `sub_${uuidv4()}`;
  }

  /**
   * Inicia tracking de performance para uma operação
   */
  public startPerformanceTracking(operation: string, correlationId: string): void {
    this.performanceTrackers.set(correlationId, {
      startTime: Date.now(),
      operation,
      correlationId
    });
  }

  /**
   * Finaliza tracking de performance e registra métricas
   */
  public endPerformanceTracking(
    correlationId: string, 
    success: boolean, 
    retryCount?: number
  ): number {
    const tracker = this.performanceTrackers.get(correlationId);
    if (!tracker) {
      this.warn('LoggerService', 'Performance tracker not found', { correlationId });
      return 0;
    }

    const duration = Date.now() - tracker.startTime;
    tracker.success = success;
    tracker.retryCount = retryCount;

    // Log métricas de performance
    this.info('LoggerService', `Operation completed: ${tracker.operation}`, {
      correlationId,
      service: 'LoggerService',
      operation: 'performance_tracking',
      metadata: {
        duration,
        success,
        retryCount,
        operationType: tracker.operation
      }
    });

    this.performanceTrackers.delete(correlationId);
    return duration;
  }

  /**
   * Log DEBUG - Informações detalhadas para desenvolvimento
   */
  public debug(service: string, message: string, context: Partial<LogContext>): void {
    this.log(LogLevel.DEBUG, service, message, context);
  }

  /**
   * Log INFO - Informações gerais sobre operações
   */
  public info(service: string, message: string, context: Partial<LogContext>): void {
    this.log(LogLevel.INFO, service, message, context);
  }

  /**
   * Log WARN - Situações que requerem atenção mas não são erros
   */
  public warn(service: string, message: string, context: Partial<LogContext>): void {
    this.log(LogLevel.WARN, service, message, context);
  }

  /**
   * Log ERROR - Erros com stack trace completo
   */
  public error(
    service: string, 
    message: string, 
    error: Error, 
    context: Partial<LogContext>
  ): void {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel.ERROR,
      message,
      context: this.buildContext(service, 'error', context),
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack || 'No stack trace available',
        code: (error as any).code
      }
    };

    this.writeLog(logEntry);
  }

  /**
   * Log de auditoria para polling
   */
  public auditPolling(
    correlationId: string,
    attempt: number,
    paymentId: string,
    status: string,
    responseData?: any
  ): void {
    this.info('PollingService', `Polling attempt ${attempt}`, {
      correlationId,
      service: 'PollingService',
      operation: 'audit_polling',
      paymentId,
      metadata: {
        attempt,
        status,
        responseData: responseData ? JSON.stringify(responseData) : null,
        auditType: 'polling_attempt'
      }
    });
  }

  /**
   * Log de auditoria para webhook
   */
  public auditWebhook(
    correlationId: string,
    eventId: string,
    eventType: string,
    payload: any,
    processed: boolean
  ): void {
    this.info('WebhookHandlerService', `Webhook ${processed ? 'processed' : 'received'}`, {
      correlationId,
      service: 'WebhookHandlerService',
      operation: 'audit_webhook',
      metadata: {
        eventId,
        eventType,
        payload: JSON.stringify(payload),
        processed,
        auditType: 'webhook_event'
      }
    });
  }

  /**
   * Log de métricas de sucesso/falha
   */
  public logMetrics(
    service: string,
    operation: string,
    correlationId: string,
    success: boolean,
    duration: number,
    retryCount?: number
  ): void {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: success ? LogLevel.INFO : LogLevel.WARN,
      message: `Operation ${success ? 'succeeded' : 'failed'}: ${operation}`,
      context: this.buildContext(service, operation, { correlationId }),
      duration,
      metrics: {
        performance: duration,
        success,
        retryCount,
        operationType: operation
      }
    };

    this.writeLog(logEntry);
  }

  /**
   * Log de retry com backoff
   */
  public logRetry(
    service: string,
    operation: string,
    correlationId: string,
    attempt: number,
    maxAttempts: number,
    backoffMs: number,
    error?: Error
  ): void {
    this.warn(service, `Retry attempt ${attempt}/${maxAttempts} for ${operation}`, {
      correlationId,
      service,
      operation: 'retry_attempt',
      metadata: {
        attempt,
        maxAttempts,
        backoffMs,
        originalOperation: operation,
        error: error ? {
          name: error.name,
          message: error.message
        } : null
      }
    });
  }

  /**
   * Log de rollback
   */
  public logRollback(
    service: string,
    operation: string,
    correlationId: string,
    reason: string,
    rollbackActions: string[]
  ): void {
    this.warn(service, `Rollback initiated for ${operation}`, {
      correlationId,
      service,
      operation: 'rollback',
      metadata: {
        originalOperation: operation,
        reason,
        rollbackActions,
        rollbackType: 'automatic'
      }
    });
  }

  /**
   * Método principal de logging
   */
  private log(level: LogLevel, service: string, message: string, context: Partial<LogContext>): void {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: this.buildContext(service, context.operation || 'general', context)
    };

    this.writeLog(logEntry);
  }

  /**
   * Constrói contexto estruturado para logs
   */
  private buildContext(service: string, operation: string, context: Partial<LogContext>): LogContext {
    return {
      correlationId: context.correlationId || this.generateCorrelationId(),
      service,
      operation,
      userId: context.userId,
      paymentId: context.paymentId,
      subscriptionId: context.subscriptionId,
      customerId: context.customerId,
      metadata: context.metadata || {}
    };
  }

  /**
   * Escreve log no console (em produção seria enviado para sistema de logs)
   */
  private writeLog(logEntry: LogEntry): void {
    const logString = JSON.stringify(logEntry, null, 2);
    
    switch (logEntry.level) {
      case LogLevel.DEBUG:
        console.debug(logString);
        break;
      case LogLevel.INFO:
        console.info(logString);
        break;
      case LogLevel.WARN:
        console.warn(logString);
        break;
      case LogLevel.ERROR:
        console.error(logString);
        break;
      default:
        console.log(logString);
    }
  }

  /**
   * Limpa trackers de performance antigos (cleanup)
   */
  public cleanupOldTrackers(maxAgeMs: number = 300000): void { // 5 minutos
    const now = Date.now();
    for (const [correlationId, tracker] of this.performanceTrackers.entries()) {
      if (now - tracker.startTime > maxAgeMs) {
        this.warn('LoggerService', 'Cleaning up old performance tracker', {
          correlationId,
          service: 'LoggerService',
          operation: 'cleanup',
          metadata: {
            trackerAge: now - tracker.startTime,
            operation: tracker.operation
          }
        });
        this.performanceTrackers.delete(correlationId);
      }
    }
  }

  /**
   * Obtém estatísticas do logger
   */
  public getStats(): {
    activeTrackers: number;
    oldestTracker?: { correlationId: string; age: number; operation: string };
  } {
    const now = Date.now();
    let oldestTracker: { correlationId: string; age: number; operation: string } | undefined;
    let maxAge = -1;

    for (const [correlationId, tracker] of this.performanceTrackers.entries()) {
      const age = now - tracker.startTime;
      if (age > maxAge) {
        maxAge = age;
        oldestTracker = {
          correlationId,
          age,
          operation: tracker.operation
        };
      }
    }

    return {
      activeTrackers: this.performanceTrackers.size,
      oldestTracker: this.performanceTrackers.size > 0 ? oldestTracker : undefined
    };
  }
}

// Export singleton instance
export const logger = LoggerService.getInstance();