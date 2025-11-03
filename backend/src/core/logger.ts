/**
 * Logger service - Simple, structured logging
 */
import { Logger as ILogger, LogLevel } from '@mosaic/shared';

class Logger implements ILogger {
  private context: Record<string, any> = {};

  constructor(context?: Record<string, any>) {
    this.context = context || {};
  }

  private log(level: LogLevel, message: string, context?: any): void {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...this.context,
      ...context,
    };

    const colorMap = {
      debug: '\x1b[36m', // Cyan
      info: '\x1b[32m',  // Green
      warn: '\x1b[33m',  // Yellow
      error: '\x1b[31m', // Red
    };

    const color = colorMap[level];
    const reset = '\x1b[0m';

    console.log(`${color}[${level.toUpperCase()}]${reset} ${message}`, context || '');
  }

  debug(message: string, context?: any): void {
    if (process.env.LOG_LEVEL === 'debug') {
      this.log('debug', message, context);
    }
  }

  info(message: string, context?: any): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: any): void {
    this.log('warn', message, context);
  }

  error(message: string, context?: any): void {
    this.log('error', message, context);
  }

  child(metadata: Record<string, any>): ILogger {
    return new Logger({ ...this.context, ...metadata });
  }
}

export const logger = new Logger();
export { Logger };
