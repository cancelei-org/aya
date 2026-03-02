/**
 * Simple logger utility for development and production
 * Replaces console.log usage throughout the application
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LoggerConfig {
  isDevelopment: boolean
  enabledInProduction: boolean
}

class Logger {
  private config: LoggerConfig

  constructor() {
    this.config = {
      isDevelopment: process.env.NODE_ENV === 'development',
      enabledInProduction: false // Disable logs in production by default
    }
  }

  private shouldLog(level: LogLevel): boolean {
    if (this.config.isDevelopment) return true
    if (!this.config.enabledInProduction) return false
    
    // In production, only log warnings and errors
    return level === 'warn' || level === 'error'
  }

  private formatMessage(level: LogLevel, message: string, ...args: any[]): void {
    const timestamp = new Date().toISOString()
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`
    
    switch (level) {
      case 'debug':
        if (this.shouldLog(level)) console.debug(prefix, message, ...args)
        break
      case 'info':
        if (this.shouldLog(level)) console.info(prefix, message, ...args)
        break
      case 'warn':
        if (this.shouldLog(level)) console.warn(prefix, message, ...args)
        break
      case 'error':
        if (this.shouldLog(level)) console.error(prefix, message, ...args)
        break
    }
  }

  debug(message: string, ...args: any[]): void {
    this.formatMessage('debug', message, ...args)
  }

  info(message: string, ...args: any[]): void {
    this.formatMessage('info', message, ...args)
  }

  warn(message: string, ...args: any[]): void {
    this.formatMessage('warn', message, ...args)
  }

  error(message: string, ...args: any[]): void {
    this.formatMessage('error', message, ...args)
  }

  // Alias for backward compatibility
  log(message: string, ...args: any[]): void {
    this.info(message, ...args)
  }
}

// Export singleton instance
export const logger = new Logger()

// Export default for convenience
export default logger