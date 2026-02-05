/**
 * ErrorHandlerService para Assinaturas
 * Sistema robusto de tratamento de erros específico para fluxo de assinaturas
 * 
 * CRÍTICO: Completamente isolado do sistema de tratamento de erros de produtos físicos
 * Implementa retry com backoff exponencial, validação de entrada e consistência de estado
 */

import { SubscriptionConfig } from '@/config/subscription.config';

export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface ErrorContext {
  correlationId: string;
  operation: string;
  attempt?: number;
  totalAttempts?: number;
  elapsedTime?: number;
  metadata?: Record<string, any>;
}

export interface ErrorResult {
  success: false;
  error: string;
  code: string;
  context: ErrorContext;
  validationErrors?: ValidationError[];
  retryable: boolean;
  nextRetryAt?: string;
}

export interface SuccessResult<T = any> {
  success: true;
  data: T;
  context: ErrorContext;
}

export type OperationResult<T = any> = SuccessResult<T> | ErrorResult;

export class ErrorHandlerService {
  private correlationId: string;
  private config = SubscriptionConfig;
  private defaultRetryConfig: RetryConfig = {
    maxAttempts: 3,
    baseDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2
  };

  constructor(correlationId: string) {
    this.correlationId = correlationId;
  }

  /**
   * Executa operação com retry automático e backoff exponencial
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    retryConfig?: Partial<RetryConfig>
  ): Promise<OperationResult<T>> {
    const config = { ...this.defaultRetryConfig, ...retryConfig };
    const startTime = Date.now();
    let lastError: Error | null = null;

    this.log('INFO', `Starting operation with retry: ${operationName}`, {
      maxAttempts: config.maxAttempts,
      baseDelayMs: config.baseDelayMs
    });

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      const attemptStartTime = Date.now();

      try {
        this.log('DEBUG', `Attempt ${attempt}/${config.maxAttempts} for ${operationName}`);

        const result = await operation();
        const elapsedTime = Date.now() - startTime;

        this.log('INFO', `Operation ${operationName} succeeded on attempt ${attempt}`, {
          attempt,
          elapsedTime,
          attemptDuration: Date.now() - attemptStartTime
        });

        return {
          success: true,
          data: result,
          context: {
            correlationId: this.correlationId,
            operation: operationName,
            attempt,
            totalAttempts: config.maxAttempts,
            elapsedTime
          }
        };

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        const attemptDuration = Date.now() - attemptStartTime;

        this.log('WARN', `Attempt ${attempt}/${config.maxAttempts} failed for ${operationName}`, {
          attempt,
          error: lastError.message,
          attemptDuration,
          retryable: this.isRetryableError(lastError)
        });

        // Se não é retryable ou é a última tentativa, falhar
        if (!this.isRetryableError(lastError) || attempt === config.maxAttempts) {
          break;
        }

        // Calcular delay para próxima tentativa
        const delay = Math.min(
          config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt - 1),
          config.maxDelayMs
        );

        this.log('DEBUG', `Waiting ${delay}ms before retry ${attempt + 1}`, {
          delay,
          nextAttempt: attempt + 1
        });

        await this.sleep(delay);
      }
    }

    // Operação falhou após todas as tentativas
    const elapsedTime = Date.now() - startTime;
    const errorCode = this.getErrorCode(lastError!);
    const isRetryable = this.isRetryableError(lastError!);

    this.log('ERROR', `Operation ${operationName} failed after all attempts`, {
      totalAttempts: config.maxAttempts,
      elapsedTime,
      finalError: lastError!.message,
      errorCode,
      retryable: isRetryable
    });

    return {
      success: false,
      error: lastError!.message,
      code: errorCode,
      context: {
        correlationId: this.correlationId,
        operation: operationName,
        attempt: config.maxAttempts,
        totalAttempts: config.maxAttempts,
        elapsedTime
      },
      retryable: isRetryable,
      nextRetryAt: isRetryable ? new Date(Date.now() + config.maxDelayMs).toISOString() : undefined
    };
  }

  /**
   * Valida dados de entrada com erros específicos
   */
  validateInput<T>(
    data: any,
    validationRules: Record<string, (value: any) => ValidationError | null>,
    operationName: string
  ): OperationResult<T> {
    const validationErrors: ValidationError[] = [];

    this.log('DEBUG', `Validating input for ${operationName}`, {
      fieldsToValidate: Object.keys(validationRules)
    });

    // Executar todas as validações
    for (const [field, validator] of Object.entries(validationRules)) {
      const fieldValue = data?.[field];
      const error = validator(fieldValue);
      
      if (error) {
        validationErrors.push({
          ...error,
          field,
          value: fieldValue
        });
      }
    }

    if (validationErrors.length > 0) {
      this.log('WARN', `Input validation failed for ${operationName}`, {
        errorCount: validationErrors.length,
        errors: validationErrors
      });

      return {
        success: false,
        error: 'Input validation failed',
        code: 'VALIDATION_ERROR',
        context: {
          correlationId: this.correlationId,
          operation: operationName
        },
        validationErrors,
        retryable: false
      };
    }

    this.log('DEBUG', `Input validation passed for ${operationName}`);

    return {
      success: true,
      data: data as T,
      context: {
        correlationId: this.correlationId,
        operation: operationName
      }
    };
  }

  /**
   * Trata timeout de operações
   */
  async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number,
    operationName: string
  ): Promise<OperationResult<T>> {
    const startTime = Date.now();

    this.log('DEBUG', `Starting operation with timeout: ${operationName}`, {
      timeoutMs
    });

    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Operation ${operationName} timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      });

      const result = await Promise.race([operation(), timeoutPromise]);
      const elapsedTime = Date.now() - startTime;

      this.log('INFO', `Operation ${operationName} completed within timeout`, {
        elapsedTime,
        timeoutMs
      });

      return {
        success: true,
        data: result,
        context: {
          correlationId: this.correlationId,
          operation: operationName,
          elapsedTime
        }
      };

    } catch (error) {
      const elapsedTime = Date.now() - startTime;
      const err = error instanceof Error ? error : new Error(String(error));

      this.log('ERROR', `Operation ${operationName} failed or timed out`, {
        elapsedTime,
        timeoutMs,
        error: err.message
      });

      return {
        success: false,
        error: err.message,
        code: err.message.includes('timed out') ? 'TIMEOUT_ERROR' : 'OPERATION_ERROR',
        context: {
          correlationId: this.correlationId,
          operation: operationName,
          elapsedTime
        },
        retryable: err.message.includes('timed out') || this.isRetryableError(err)
      };
    }
  }

  /**
   * Garante consistência de estado em falhas parciais
   */
  async executeWithRollback<T>(
    operation: () => Promise<T>,
    rollbackOperation: () => Promise<void>,
    operationName: string
  ): Promise<OperationResult<T>> {
    const startTime = Date.now();

    this.log('INFO', `Starting operation with rollback capability: ${operationName}`);

    try {
      const result = await operation();
      const elapsedTime = Date.now() - startTime;

      this.log('INFO', `Operation ${operationName} completed successfully`, {
        elapsedTime
      });

      return {
        success: true,
        data: result,
        context: {
          correlationId: this.correlationId,
          operation: operationName,
          elapsedTime
        }
      };

    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      
      this.log('WARN', `Operation ${operationName} failed, attempting rollback`, {
        error: err.message
      });

      try {
        await rollbackOperation();
        this.log('INFO', `Rollback completed successfully for ${operationName}`);
      } catch (rollbackError) {
        const rollbackErr = rollbackError instanceof Error ? rollbackError : new Error(String(rollbackError));
        this.log('ERROR', `Rollback failed for ${operationName}`, {
          originalError: err.message,
          rollbackError: rollbackErr.message
        });
      }

      const elapsedTime = Date.now() - startTime;

      return {
        success: false,
        error: err.message,
        code: this.getErrorCode(err),
        context: {
          correlationId: this.correlationId,
          operation: operationName,
          elapsedTime
        },
        retryable: this.isRetryableError(err)
      };
    }
  }

  /**
   * Determina se um erro é retryable
   */
  private isRetryableError(error: Error): boolean {
    const message = error.message.toLowerCase();
    
    // Erros de rede são retryable
    if (message.includes('network') || 
        message.includes('timeout') || 
        message.includes('connection') ||
        message.includes('econnreset') ||
        message.includes('enotfound')) {
      return true;
    }

    // Erros HTTP 5xx são retryable
    if (message.includes('500') || 
        message.includes('502') || 
        message.includes('503') || 
        message.includes('504')) {
      return true;
    }

    // Rate limiting é retryable
    if (message.includes('429') || message.includes('rate limit')) {
      return true;
    }

    // Erros de validação não são retryable
    if (message.includes('validation') || 
        message.includes('400') || 
        message.includes('401') || 
        message.includes('403') || 
        message.includes('404')) {
      return false;
    }

    // Por padrão, considerar retryable
    return true;
  }

  /**
   * Obtém código de erro padronizado
   */
  private getErrorCode(error: Error): string {
    const message = error.message.toLowerCase();

    if (message.includes('timeout')) return 'TIMEOUT_ERROR';
    if (message.includes('network')) return 'NETWORK_ERROR';
    if (message.includes('validation')) return 'VALIDATION_ERROR';
    if (message.includes('400')) return 'BAD_REQUEST';
    if (message.includes('401')) return 'UNAUTHORIZED';
    if (message.includes('403')) return 'FORBIDDEN';
    if (message.includes('404')) return 'NOT_FOUND';
    if (message.includes('429')) return 'RATE_LIMITED';
    if (message.includes('500')) return 'INTERNAL_SERVER_ERROR';
    if (message.includes('502')) return 'BAD_GATEWAY';
    if (message.includes('503')) return 'SERVICE_UNAVAILABLE';
    if (message.includes('504')) return 'GATEWAY_TIMEOUT';

    return 'UNKNOWN_ERROR';
  }

  /**
   * Sleep helper para delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Log estruturado com correlation ID
   */
  private log(level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR', message: string, context?: any): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: 'ErrorHandlerService',
      correlationId: this.correlationId,
      message,
      context
    };

    console.log(JSON.stringify(logEntry));
  }
}

/**
 * Validadores comuns para entrada de dados
 */
export const CommonValidators = {
  required: (fieldName: string) => (value: any): ValidationError | null => {
    if (value === null || value === undefined || value === '') {
      return { field: fieldName, message: `${fieldName} is required` };
    }
    return null;
  },

  email: (value: any): ValidationError | null => {
    if (typeof value !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return { field: 'email', message: 'Invalid email format' };
    }
    return null;
  },

  positiveNumber: (fieldName: string) => (value: any): ValidationError | null => {
    if (typeof value !== 'number' || value <= 0) {
      return { field: fieldName, message: `${fieldName} must be a positive number` };
    }
    return null;
  },

  nonEmptyArray: (fieldName: string) => (value: any): ValidationError | null => {
    if (!Array.isArray(value) || value.length === 0) {
      return { field: fieldName, message: `${fieldName} must be a non-empty array` };
    }
    return null;
  },

  uuid: (fieldName: string) => (value: any): ValidationError | null => {
    if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
      return { field: fieldName, message: `${fieldName} must be a valid UUID` };
    }
    return null;
  },

  walletId: (value: any): ValidationError | null => {
    if (typeof value !== 'string' || !/^wal_[a-zA-Z0-9]{20}$/.test(value)) {
      return { field: 'walletId', message: 'Invalid Asaas Wallet ID format' };
    }
    return null;
  }
};