/**
 * Logger Utility
 * Sprint 3: Sistema de Vendas
 * 
 * Sistema de logging estruturado
 */

interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  module: string;
  message: string;
  context?: Record<string, any>;
  error?: {
    message: string;
    stack?: string;
  };
}

export class Logger {
  /**
   * Log de informação
   */
  static info(module: string, message: string, context?: any): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'info',
      module,
      message,
      context,
    };

    console.log(JSON.stringify(entry));
  }

  /**
   * Log de debug
   */
  static debug(module: string, message: string, context?: any): void {
    if (process.env.NODE_ENV === 'development') {
      const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        level: 'debug',
        module,
        message,
        context,
      };

      console.log(JSON.stringify(entry));
    }
  }

  /**
   * Log de warning
   */
  static warn(module: string, message: string, context?: any): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'warn',
      module,
      message,
      context,
    };

    console.warn(JSON.stringify(entry));
  }

  /**
   * Log de erro
   */
  static error(module: string, message: string, error?: Error, context?: any): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'error',
      module,
      message,
      context,
      error: error ? {
        message: error.message,
        stack: error.stack,
      } : undefined,
    };

    console.error(JSON.stringify(entry));
  }
}

// Exportar instância para uso como { logger }
export const logger = Logger;
