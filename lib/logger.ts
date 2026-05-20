/**
 * FIX #10: Structured Logging
 * 
 * Production-grade structured logging with:
 * - Consistent log format
 * - Log levels
 * - Request tracing
 * - Error context
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

interface LogContext {
  [key: string]: unknown
}

class Logger {
  private static instance: Logger
  private logLevel: LogLevel

  private constructor() {
    this.logLevel = this.getLogLevelFromEnv()
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger()
    }
    return Logger.instance
  }

  private getLogLevelFromEnv(): LogLevel {
    const level = process.env.LOG_LEVEL || 'INFO'
    return LogLevel[level as keyof typeof LogLevel] || LogLevel.INFO
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR]
    return levels.indexOf(level) >= levels.indexOf(this.logLevel)
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString()
    const baseLog = {
      timestamp,
      level,
      message,
      ...context,
    }
    return JSON.stringify(baseLog)
  }

  debug(message: string, context?: LogContext) {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.log(this.formatMessage(LogLevel.DEBUG, message, context))
    }
  }

  info(message: string, context?: LogContext) {
    if (this.shouldLog(LogLevel.INFO)) {
      console.log(this.formatMessage(LogLevel.INFO, message, context))
    }
  }

  warn(message: string, context?: LogContext) {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatMessage(LogLevel.WARN, message, context))
    }
  }

  error(message: string, error?: Error, context?: LogContext) {
    if (this.shouldLog(LogLevel.ERROR)) {
      const errorContext = {
        ...context,
        error: error ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        } : undefined,
      }
      console.error(this.formatMessage(LogLevel.ERROR, message, errorContext))
    }
  }

  /**
   * Log with request context for tracing
   */
  logRequest(method: string, path: string, statusCode: number, duration: number, context?: LogContext) {
    this.info('HTTP Request', {
      method,
      path,
      statusCode,
      duration: `${duration}ms`,
      ...context,
    })
  }

  /**
   * Log database operations
   */
  logDatabase(operation: string, table: string, duration: number, context?: LogContext) {
    this.debug('Database Operation', {
      operation,
      table,
      duration: `${duration}ms`,
      ...context,
    })
  }

  /**
   * Log allocation operations
   */
  logAllocation(leadId: number, serviceId: number, providerIds: number[], context?: LogContext) {
    this.info('Lead Allocation', {
      leadId,
      serviceId,
      providerIds,
      ...context,
    })
  }
}

export const logger = Logger.getInstance()
