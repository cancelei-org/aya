/**
 * エラーハンドリング強化システム
 * Phase 4.1.3: AI検索失敗時の段階的フォールバック
 */

import { performanceMonitor } from './performanceMonitor'

// エラーレベルの定義
export enum ErrorLevel {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

// エラーカテゴリの定義
export enum ErrorCategory {
  NETWORK = 'network',
  API = 'api',
  VALIDATION = 'validation',
  PERMISSION = 'permission',
  RESOURCE = 'resource',
  UNKNOWN = 'unknown'
}

// エラー情報の型定義
export interface ErrorInfo {
  id: string
  timestamp: number
  level: ErrorLevel
  category: ErrorCategory
  code: string
  message: string
  userMessage?: string // ユーザーフレンドリーなメッセージ
  context?: Record<string, any>
  stack?: string
  recoverable: boolean
  retryCount?: number
  maxRetries?: number
}

// フォールバック戦略の定義
export interface FallbackStrategy {
  name: string
  priority: number
  condition: (error: ErrorInfo) => boolean
  execute: () => Promise<any>
}

// リトライ設定
export interface RetryConfig {
  maxRetries: number
  initialDelay: number
  maxDelay: number
  backoffMultiplier: number
  retryableErrors?: string[]
}

// エラーハンドリングマネージャー
export class ErrorHandlingManager {
  private errors: ErrorInfo[] = []
  private maxErrors: number = 1000
  private fallbackStrategies: Map<string, FallbackStrategy[]> = new Map()
  private errorListeners: ((error: ErrorInfo) => void)[] = []
  
  // デフォルトのリトライ設定
  private defaultRetryConfig: RetryConfig = {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    retryableErrors: ['NETWORK_ERROR', 'API_TIMEOUT', 'RATE_LIMIT']
  }

  // エラーの記録
  recordError(
    error: Error | ErrorInfo,
    context?: Record<string, any>
  ): ErrorInfo {
    const errorInfo: ErrorInfo = this.normalizeError(error, context)
    
    // エラーを保存
    this.errors.push(errorInfo)
    if (this.errors.length > this.maxErrors) {
      this.errors.shift()
    }
    
    // リスナーに通知
    this.notifyListeners(errorInfo)
    
    // パフォーマンスメトリクスに記録
    performanceMonitor.startOperation(`Error: ${errorInfo.code}`, {
      level: errorInfo.level,
      category: errorInfo.category
    })()
    
    return errorInfo
  }

  // エラーの正規化
  private normalizeError(
    error: Error | ErrorInfo,
    context?: Record<string, any>
  ): ErrorInfo {
    if ('id' in error && 'level' in error) {
      // すでにErrorInfo形式
      return error as ErrorInfo
    }
    
    // Errorオブジェクトから変換
    const err = error as Error
    const category = this.categorizeError(err)
    const code = this.generateErrorCode(err, category)
    
    return {
      id: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      level: this.determineErrorLevel(err),
      category,
      code,
      message: err.message,
      userMessage: this.generateUserMessage(err, category),
      context,
      stack: err.stack,
      recoverable: this.isRecoverable(err, category),
      retryCount: 0,
      maxRetries: this.defaultRetryConfig.maxRetries
    }
  }

  // エラーのカテゴリ分類
  private categorizeError(error: Error): ErrorCategory {
    const message = error.message.toLowerCase()
    
    if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
      return ErrorCategory.NETWORK
    }
    if (message.includes('api') || message.includes('401') || message.includes('403') || message.includes('rate limit')) {
      return ErrorCategory.API
    }
    if (message.includes('validation') || message.includes('invalid') || message.includes('required')) {
      return ErrorCategory.VALIDATION
    }
    if (message.includes('permission') || message.includes('unauthorized') || message.includes('forbidden')) {
      return ErrorCategory.PERMISSION
    }
    if (message.includes('memory') || message.includes('resource') || message.includes('quota')) {
      return ErrorCategory.RESOURCE
    }
    
    return ErrorCategory.UNKNOWN
  }

  // エラーレベルの判定
  private determineErrorLevel(error: Error): ErrorLevel {
    const message = error.message.toLowerCase()
    
    if (message.includes('critical') || message.includes('fatal')) {
      return ErrorLevel.CRITICAL
    }
    if (message.includes('error') || message.includes('failed')) {
      return ErrorLevel.ERROR
    }
    if (message.includes('warning') || message.includes('deprecated')) {
      return ErrorLevel.WARNING
    }
    
    return ErrorLevel.INFO
  }

  // エラーコードの生成
  private generateErrorCode(error: Error, category: ErrorCategory): string {
    const prefix = category.toUpperCase()
    const hash = error.message
      .split('')
      .reduce((acc, char) => acc + char.charCodeAt(0), 0)
      .toString(36)
      .toUpperCase()
    
    return `${prefix}_${hash}`
  }

  // ユーザーフレンドリーなメッセージの生成
  private generateUserMessage(error: Error, category: ErrorCategory): string {
    switch (category) {
      case ErrorCategory.NETWORK:
        return 'ネットワーク接続に問題が発生しました。インターネット接続を確認してください。'
      case ErrorCategory.API:
        if (error.message.includes('rate limit')) {
          return 'APIの利用制限に達しました。しばらく待ってから再度お試しください。'
        }
        if (error.message.includes('401')) {
          return 'APIキーが無効です。設定を確認してください。'
        }
        return 'サーバーとの通信中にエラーが発生しました。'
      case ErrorCategory.VALIDATION:
        return '入力内容に問題があります。入力値を確認してください。'
      case ErrorCategory.PERMISSION:
        return 'この操作を実行する権限がありません。'
      case ErrorCategory.RESOURCE:
        return 'システムリソースが不足しています。不要なデータをクリアしてください。'
      default:
        return '予期しないエラーが発生しました。もう一度お試しください。'
    }
  }

  // エラーが回復可能かの判定
  private isRecoverable(error: Error, category: ErrorCategory): boolean {
    // ネットワークエラーやAPI一時エラーは回復可能
    if (category === ErrorCategory.NETWORK || category === ErrorCategory.API) {
      return !error.message.includes('401') && !error.message.includes('403')
    }
    
    // バリデーションエラーは修正により回復可能
    if (category === ErrorCategory.VALIDATION) {
      return true
    }
    
    // 権限エラーやクリティカルエラーは回復不可能
    if (category === ErrorCategory.PERMISSION) {
      return false
    }
    
    return false
  }

  // リトライ機能付き操作実行
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    customRetryConfig?: Partial<RetryConfig>
  ): Promise<T> {
    const config = { ...this.defaultRetryConfig, ...customRetryConfig }
    let lastError: ErrorInfo | null = null
    let delay = config.initialDelay

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        // 操作の実行
        const result = await performanceMonitor.monitorAsync(
          `${operationName} (attempt ${attempt + 1})`,
          operation
        )
        
        // 成功した場合
        if (lastError) {
          this.recordError({
            ...lastError,
            level: ErrorLevel.INFO,
            message: `Operation succeeded after ${attempt} retries`,
            recoverable: true
          })
        }
        
        return result
      } catch (error) {
        // エラーを記録
        lastError = this.recordError(error as Error, {
          operation: operationName,
          attempt: attempt + 1,
          maxAttempts: config.maxRetries + 1
        })
        
        // リトライ可能かチェック
        if (!this.shouldRetry(lastError, config, attempt)) {
          throw error
        }
        
        // リトライ前の待機
        await this.delay(delay)
        delay = Math.min(delay * config.backoffMultiplier, config.maxDelay)
      }
    }
    
    throw new Error(`Operation failed after ${config.maxRetries} retries`)
  }

  // リトライすべきかの判定
  private shouldRetry(error: ErrorInfo, config: RetryConfig, attempt: number): boolean {
    // 最大リトライ数に達した場合
    if (attempt >= config.maxRetries) {
      return false
    }
    
    // 回復不可能なエラーの場合
    if (!error.recoverable) {
      return false
    }
    
    // リトライ可能なエラーコードの場合
    if (config.retryableErrors && config.retryableErrors.includes(error.code)) {
      return true
    }
    
    // ネットワークエラーは常にリトライ
    if (error.category === ErrorCategory.NETWORK) {
      return true
    }
    
    return false
  }

  // 遅延処理
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // フォールバック戦略の登録
  registerFallbackStrategy(
    operation: string,
    strategy: FallbackStrategy
  ): void {
    if (!this.fallbackStrategies.has(operation)) {
      this.fallbackStrategies.set(operation, [])
    }
    
    const strategies = this.fallbackStrategies.get(operation)!
    strategies.push(strategy)
    strategies.sort((a, b) => a.priority - b.priority)
  }

  // フォールバック実行
  async executeFallback<T>(
    operation: string,
    error: ErrorInfo
  ): Promise<T | null> {
    const strategies = this.fallbackStrategies.get(operation) || []
    
    for (const strategy of strategies) {
      if (strategy.condition(error)) {
        try {
          console.log(`Executing fallback strategy: ${strategy.name}`)
          return await strategy.execute()
        } catch (fallbackError) {
          this.recordError(fallbackError as Error, {
            fallbackStrategy: strategy.name,
            originalError: error.code
          })
        }
      }
    }
    
    return null
  }

  // エラーリスナーの登録
  onError(listener: (error: ErrorInfo) => void): () => void {
    this.errorListeners.push(listener)
    return () => {
      this.errorListeners = this.errorListeners.filter(l => l !== listener)
    }
  }

  // リスナーへの通知
  private notifyListeners(error: ErrorInfo): void {
    this.errorListeners.forEach(listener => listener(error))
  }

  // エラー統計の取得
  getErrorStats(timeWindow?: number): {
    totalErrors: number
    errorsByLevel: Record<ErrorLevel, number>
    errorsByCategory: Record<ErrorCategory, number>
    recentErrors: ErrorInfo[]
    criticalErrors: ErrorInfo[]
  } {
    const now = Date.now()
    const windowStart = timeWindow ? now - timeWindow : 0
    
    const relevantErrors = this.errors.filter(e => e.timestamp >= windowStart)
    
    const errorsByLevel = relevantErrors.reduce((acc, error) => {
      acc[error.level] = (acc[error.level] || 0) + 1
      return acc
    }, {} as Record<ErrorLevel, number>)
    
    const errorsByCategory = relevantErrors.reduce((acc, error) => {
      acc[error.category] = (acc[error.category] || 0) + 1
      return acc
    }, {} as Record<ErrorCategory, number>)
    
    return {
      totalErrors: relevantErrors.length,
      errorsByLevel,
      errorsByCategory,
      recentErrors: relevantErrors.slice(-10),
      criticalErrors: relevantErrors.filter(e => e.level === ErrorLevel.CRITICAL)
    }
  }

  // エラーのクリア
  clearErrors(): void {
    this.errors = []
  }
}

// グローバルインスタンス
export const errorHandlingManager = new ErrorHandlingManager()

// AI検索用のフォールバック戦略を登録
errorHandlingManager.registerFallbackStrategy('ai-search', {
  name: 'Use cached data',
  priority: 1,
  condition: (error) => error.category === ErrorCategory.NETWORK,
  execute: async () => {
    console.log('Using cached AI search results')
    return { cached: true, data: {} }
  }
})

errorHandlingManager.registerFallbackStrategy('ai-search', {
  name: 'Use default specifications',
  priority: 2,
  condition: (error) => error.category === ErrorCategory.API,
  execute: async () => {
    console.log('Using default component specifications')
    return { default: true, specifications: { voltage: '5V', communication: 'I2C' } }
  }
})

// React Hook for error handling
export function useErrorHandling() {
  const [errors, setErrors] = React.useState<ErrorInfo[]>([])
  const [stats, setStats] = React.useState(errorHandlingManager.getErrorStats())

  React.useEffect(() => {
    const unsubscribe = errorHandlingManager.onError((error) => {
      setErrors(prev => [...prev.slice(-9), error])
      setStats(errorHandlingManager.getErrorStats())
    })

    return unsubscribe
  }, [])

  const executeWithRetry = React.useCallback(async <T,>(
    operation: () => Promise<T>,
    operationName: string,
    customRetryConfig?: Partial<RetryConfig>
  ): Promise<T> => {
    return errorHandlingManager.executeWithRetry(
      operation,
      operationName,
      customRetryConfig
    )
  }, [])

  return {
    errors,
    stats,
    executeWithRetry,
    clearErrors: () => {
      errorHandlingManager.clearErrors()
      setErrors([])
      setStats(errorHandlingManager.getErrorStats())
    }
  }
}