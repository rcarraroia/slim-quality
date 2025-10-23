interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  module: string;
  message: string;
  context?: Record<string, any>;
  error?: Error;
}

class Logger {
  private log(entry: LogEntry): void {
    const logString = JSON.stringify({
      ...entry,
      error: entry.error
        ? {
            message: entry.error.message,
            stack: entry.error.stack,
          }
        : undefined,
    });

    switch (entry.level) {
      case 'error':
        console.error(logString);
        break;
      case 'warn':
        console.warn(logString);
        break;
      case 'debug':
        if (process.env.NODE_ENV === 'development') {
          console.debug(logString);
        }
        break;
      default:
        console.log(logString);
    }
  }

  debug(module: string, message: string, context?: Record<string, any>): void {
    this.log({
      timestamp: new Date().toISOString(),
      level: 'debug',
      module,
      message,
      context,
    });
  }

  info(module: string, message: string, context?: Record<string, any>): void {
    this.log({
      timestamp: new Date().toISOString(),
      level: 'info',
      module,
      message,
      context,
    });
  }

  warn(module: string, message: string, context?: Record<string, any>): void {
    this.log({
      timestamp: new Date().toISOString(),
      level: 'warn',
      module,
      message,
      context,
    });
  }

  error(module: string, message: string, error?: Error, context?: Record<string, any>): void {
    this.log({
      timestamp: new Date().toISOString(),
      level: 'error',
      module,
      message,
      error,
      context,
    });
  }
}

export const logger = new Logger();
