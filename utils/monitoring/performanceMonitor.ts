/**
 * パフォーマンス監視・最適化システム
 * Phase 4.1.2: AI検索レスポンス時間の監視・改善
 */

// パフォーマンスメトリクスの定義
export interface PerformanceMetrics {
  operation: string
  startTime: number
  endTime: number
  duration: number
  memoryUsage?: {
    used: number
    total: number
    percentage: number
  }
  metadata?: Record<string, any>
}

// パフォーマンス閾値の定義
export const PERFORMANCE_THRESHOLDS = {
  AI_SEARCH: 3000, // 3秒
  COMPATIBILITY_CHECK: 100, // 100ms
  PORT_GENERATION: 50, // 50ms
  EDGE_RENDERING: 20, // 20ms
  CACHE_LOOKUP: 10, // 10ms
  DATABASE_QUERY: 200, // 200ms
}

// パフォーマンスレポート
export interface PerformanceReport {
  timestamp: number
  metrics: PerformanceMetrics[]
  slowOperations: PerformanceMetrics[]
  summary: {
    totalOperations: number
    averageDuration: number
    slowestOperation: PerformanceMetrics | null
    memoryPressure: boolean
  }
}

// パフォーマンスモニタークラス
export class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = []
  private maxMetrics: number = 1000 // 最大保持メトリクス数
  private listeners: ((metrics: PerformanceMetrics) => void)[] = []

  // メトリクスの記録開始
  startOperation(operation: string, metadata?: Record<string, any>): () => void {
    const startTime = performance.now()
    const initialMemory = this.getMemoryUsage()

    // 終了関数を返す
    return () => {
      const endTime = performance.now()
      const duration = endTime - startTime
      const finalMemory = this.getMemoryUsage()

      const metric: PerformanceMetrics = {
        operation,
        startTime,
        endTime,
        duration,
        memoryUsage: finalMemory,
        metadata
      }

      this.addMetric(metric)
      this.notifyListeners(metric)

      // 閾値を超えた場合の警告
      const threshold = this.getThreshold(operation)
      if (threshold && duration > threshold) {
        console.warn(`⚠️ Slow operation detected: ${operation} took ${duration.toFixed(2)}ms (threshold: ${threshold}ms)`)
      }

      return metric
    }
  }

  // 非同期操作の監視
  async monitorAsync<T>(
    operation: string,
    asyncOperation: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    const endMetric = this.startOperation(operation, metadata)
    
    try {
      const result = await asyncOperation()
      endMetric()
      return result
    } catch (error) {
      const metric = endMetric()
      console.error(`❌ Operation failed: ${operation} after ${metric.duration.toFixed(2)}ms`, error)
      throw error
    }
  }

  // メトリクスの追加
  private addMetric(metric: PerformanceMetrics): void {
    this.metrics.push(metric)
    
    // 最大数を超えた場合、古いメトリクスを削除
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift()
    }
  }

  // メモリ使用量の取得
  private getMemoryUsage(): { used: number; total: number; percentage: number } | undefined {
    if (typeof window !== 'undefined' && 'performance' in window && 'memory' in performance) {
      const memory = (performance as any).memory
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        percentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100
      }
    }
    return undefined
  }

  // 操作別の閾値取得
  private getThreshold(operation: string): number | undefined {
    // 操作名から閾値を判定
    if (operation.includes('AI') || operation.includes('ai')) {
      return PERFORMANCE_THRESHOLDS.AI_SEARCH
    }
    if (operation.includes('compatibility') || operation.includes('check')) {
      return PERFORMANCE_THRESHOLDS.COMPATIBILITY_CHECK
    }
    if (operation.includes('port') || operation.includes('Port')) {
      return PERFORMANCE_THRESHOLDS.PORT_GENERATION
    }
    if (operation.includes('edge') || operation.includes('Edge')) {
      return PERFORMANCE_THRESHOLDS.EDGE_RENDERING
    }
    if (operation.includes('cache') || operation.includes('Cache')) {
      return PERFORMANCE_THRESHOLDS.CACHE_LOOKUP
    }
    if (operation.includes('database') || operation.includes('db')) {
      return PERFORMANCE_THRESHOLDS.DATABASE_QUERY
    }
    return undefined
  }

  // リスナーへの通知
  private notifyListeners(metric: PerformanceMetrics): void {
    this.listeners.forEach(listener => listener(metric))
  }

  // リスナーの登録
  onMetric(listener: (metrics: PerformanceMetrics) => void): () => void {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  // パフォーマンスレポートの生成
  generateReport(timeWindow?: number): PerformanceReport {
    const now = performance.now()
    const windowStart = timeWindow ? now - timeWindow : 0
    
    // 時間窓内のメトリクスをフィルタ
    const relevantMetrics = this.metrics.filter(m => m.startTime >= windowStart)
    
    // 遅い操作の特定
    const slowOperations = relevantMetrics.filter(m => {
      const threshold = this.getThreshold(m.operation)
      return threshold && m.duration > threshold
    })

    // サマリーの計算
    const totalDuration = relevantMetrics.reduce((sum, m) => sum + m.duration, 0)
    const averageDuration = relevantMetrics.length > 0 ? totalDuration / relevantMetrics.length : 0
    const slowestOperation = relevantMetrics.reduce((slowest, m) => 
      (!slowest || m.duration > slowest.duration) ? m : slowest, 
      null as PerformanceMetrics | null
    )

    // メモリプレッシャーの判定
    const latestMemory = relevantMetrics
      .filter(m => m.memoryUsage)
      .map(m => m.memoryUsage!)
      .pop()
    const memoryPressure = latestMemory ? latestMemory.percentage > 80 : false

    return {
      timestamp: now,
      metrics: relevantMetrics,
      slowOperations,
      summary: {
        totalOperations: relevantMetrics.length,
        averageDuration,
        slowestOperation,
        memoryPressure
      }
    }
  }

  // メトリクスのクリア
  clear(): void {
    this.metrics = []
  }

  // 操作別の統計
  getOperationStats(operation: string): {
    count: number
    averageDuration: number
    minDuration: number
    maxDuration: number
  } | null {
    const operationMetrics = this.metrics.filter(m => m.operation === operation)
    
    if (operationMetrics.length === 0) {
      return null
    }

    const durations = operationMetrics.map(m => m.duration)
    const totalDuration = durations.reduce((sum, d) => sum + d, 0)

    return {
      count: operationMetrics.length,
      averageDuration: totalDuration / operationMetrics.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations)
    }
  }
}

// グローバルインスタンス
export const performanceMonitor = new PerformanceMonitor()

// 便利なヘルパー関数
export function measureOperation(operation: string, metadata?: Record<string, any>) {
  return performanceMonitor.startOperation(operation, metadata)
}

export async function measureAsync<T>(
  operation: string,
  asyncOperation: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> {
  return performanceMonitor.monitorAsync(operation, asyncOperation, metadata)
}

// パフォーマンス最適化の提案
export function getOptimizationSuggestions(report: PerformanceReport): string[] {
  const suggestions: string[] = []

  // 遅い操作の最適化提案
  if (report.slowOperations.length > 0) {
    const aiSearchOps = report.slowOperations.filter(op => op.operation.includes('AI'))
    if (aiSearchOps.length > 0) {
      suggestions.push('Consider implementing request batching for AI operations')
      suggestions.push('Enable caching for frequently requested AI searches')
    }

    const compatibilityOps = report.slowOperations.filter(op => op.operation.includes('compatibility'))
    if (compatibilityOps.length > 0) {
      suggestions.push('Use connection-based checking instead of O(n²) algorithm')
      suggestions.push('Implement early termination for critical issues')
    }
  }

  // メモリプレッシャーの対処
  if (report.summary.memoryPressure) {
    suggestions.push('High memory usage detected - consider clearing unused caches')
    suggestions.push('Reduce the number of stored metrics or implement data pagination')
  }

  // 高頻度操作の最適化
  const highFrequencyOps = Object.entries(
    report.metrics.reduce((acc, m) => {
      acc[m.operation] = (acc[m.operation] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  )
    .filter(([_, count]) => count > 10)
    .sort(([_, a], [__, b]) => b - a)

  if (highFrequencyOps.length > 0) {
    const [topOp] = highFrequencyOps[0]
    suggestions.push(`"${topOp}" is called frequently - consider debouncing or memoization`)
  }

  return suggestions
}

// React Hook for performance monitoring
export function usePerformanceMonitor() {
  const [report, setReport] = React.useState<PerformanceReport | null>(null)

  React.useEffect(() => {
    const unsubscribe = performanceMonitor.onMetric(() => {
      // 1秒ごとにレポートを更新
      const newReport = performanceMonitor.generateReport(60000) // 過去1分間
      setReport(newReport)
    })

    // 初期レポート
    setReport(performanceMonitor.generateReport(60000))

    return unsubscribe
  }, [])

  return {
    report,
    measureOperation,
    measureAsync,
    clearMetrics: () => performanceMonitor.clear()
  }
}