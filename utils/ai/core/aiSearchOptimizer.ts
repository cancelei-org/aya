/**
 * AI検索レスポンス時間の最適化
 * バッチ処理、リクエストデバウンス、結果キャッシングを実装
 */

import { performanceMonitor } from '../../monitoring/performanceMonitor'
import type { NodeData } from '@/types'

// AI検索リクエストの型定義
export interface AISearchRequest {
  id: string
  componentName: string
  priority: 'high' | 'medium' | 'low'
  timestamp: number
  callback: (result: AISearchResult) => void
}

// AI検索結果の型定義
export interface AISearchResult {
  componentName: string
  specifications: {
    voltage?: string
    communication?: string
    power_consumption?: string
    operating_temperature?: string
    [key: string]: any
  }
  confidence: number
  source: string
  cached?: boolean
}

// バッチ処理の設定
interface BatchConfig {
  maxBatchSize: number
  maxWaitTime: number // ミリ秒
  priorityWeight: {
    high: 3,
    medium: 2,
    low: 1
  }
}

// AI検索最適化クラス
export class AISearchOptimizer {
  private pendingRequests: Map<string, AISearchRequest> = new Map()
  private batchTimer: NodeJS.Timeout | null = null
  private cache: Map<string, { result: AISearchResult; timestamp: number }> = new Map()
  private cacheExpiry: number = 3600000 // 1時間
  
  private config: BatchConfig = {
    maxBatchSize: 10,
    maxWaitTime: 500, // 500ms
    priorityWeight: {
      high: 3,
      medium: 2,
      low: 1
    }
  }

  // AI検索リクエストの追加（デバウンス付き）
  async requestSearch(
    componentName: string,
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): Promise<AISearchResult> {
    const endMetric = performanceMonitor.startOperation('AI Search Request', { componentName, priority })

    return new Promise((resolve, reject) => {
      try {
        // キャッシュチェック
        const cached = this.getCachedResult(componentName)
        if (cached) {
          endMetric()
          resolve({ ...cached, cached: true })
          return
        }

        // 既存のリクエストがある場合は置き換え
        const requestId = `search-${componentName}-${Date.now()}`
        const request: AISearchRequest = {
          id: requestId,
          componentName,
          priority,
          timestamp: Date.now(),
          callback: (result) => {
            endMetric()
            resolve(result)
          }
        }

        // 同じコンポーネントの古いリクエストをキャンセル
        this.cancelPreviousRequests(componentName)
        
        // 新しいリクエストを追加
        this.pendingRequests.set(requestId, request)
        
        // バッチ処理のスケジューリング
        this.scheduleBatch()
      } catch (error) {
        endMetric()
        reject(error)
      }
    })
  }

  // 前のリクエストのキャンセル
  private cancelPreviousRequests(componentName: string): void {
    for (const [id, request] of this.pendingRequests.entries()) {
      if (request.componentName === componentName) {
        this.pendingRequests.delete(id)
        request.callback({
          componentName,
          specifications: {},
          confidence: 0,
          source: 'cancelled'
        })
      }
    }
  }

  // バッチ処理のスケジューリング
  private scheduleBatch(): void {
    // 既存のタイマーがある場合はクリア
    if (this.batchTimer) {
      clearTimeout(this.batchTimer)
    }

    // 高優先度リクエストがある場合は即座に処理
    const hasHighPriority = Array.from(this.pendingRequests.values())
      .some(req => req.priority === 'high')
    
    const waitTime = hasHighPriority ? 100 : this.config.maxWaitTime

    this.batchTimer = setTimeout(() => {
      this.processBatch()
    }, waitTime)
  }

  // バッチ処理の実行
  private async processBatch(): Promise<void> {
    if (this.pendingRequests.size === 0) return

    const endMetric = performanceMonitor.startOperation('AI Batch Processing', {
      batchSize: this.pendingRequests.size
    })

    try {
      // 優先度でソート
      const sortedRequests = Array.from(this.pendingRequests.values())
        .sort((a, b) => {
          const priorityDiff = this.config.priorityWeight[b.priority] - this.config.priorityWeight[a.priority]
          if (priorityDiff !== 0) return priorityDiff
          return a.timestamp - b.timestamp // 同じ優先度なら古い順
        })
        .slice(0, this.config.maxBatchSize)

      // リクエストをクリア
      sortedRequests.forEach(req => this.pendingRequests.delete(req.id))

      // バッチAPI呼び出し（シミュレーション）
      const results = await this.callBatchAPI(sortedRequests.map(r => r.componentName))

      // 結果の配信とキャッシュ
      sortedRequests.forEach((request, index) => {
        const result = results[index]
        this.cacheResult(request.componentName, result)
        request.callback(result)
      })

      // 残りのリクエストがある場合は次のバッチをスケジュール
      if (this.pendingRequests.size > 0) {
        this.scheduleBatch()
      }
    } catch (error) {
      console.error('Batch processing error:', error)
      // エラー時は個別にフォールバック
      sortedRequests.forEach(request => {
        request.callback({
          componentName: request.componentName,
          specifications: {},
          confidence: 0,
          source: 'error'
        })
      })
    } finally {
      endMetric()
    }
  }

  // バッチAPI呼び出し（実際のOpenAI API呼び出し）
  private async callBatchAPI(componentNames: string[]): Promise<AISearchResult[]> {
    // AISpecificationServiceを使用して実際のOpenAI APIを呼び出す
    const { AISpecificationService } = await import('./aiSpecificationService')
    const aiService = AISpecificationService.getInstance()
    
    // バッチ処理のためのPromise配列を作成
    const searchPromises = componentNames.map(async (componentName) => {
      try {
        const result = await aiService.searchComponentSpecification({
          componentName,
          searchDepth: 'basic',
          includeAlternatives: false,
          focusAreas: ['power', 'communication']
        })
        
        return {
          componentName,
          specifications: {
            voltage: result.specification.voltage.operating.join(', '),
            communication: result.specification.communication.protocols.join(', '),
            power_consumption: `${result.specification.power.consumption.typical}mA`,
            operating_temperature: result.specification.compatibility.operatingTemp
          },
          confidence: result.specification.reliability.confidence / 100,
          source: 'openai-api'
        }
      } catch (error) {
        console.error(`Failed to fetch specifications for ${componentName}:`, error)
        // エラー時のフォールバック
        return {
          componentName,
          specifications: {},
          confidence: 0,
          source: 'error'
        }
      }
    })
    
    // すべての検索を並行実行
    return await Promise.all(searchPromises)
  }

  // キャッシュから結果を取得
  private getCachedResult(componentName: string): AISearchResult | null {
    const cached = this.cache.get(componentName)
    if (!cached) return null

    const age = Date.now() - cached.timestamp
    if (age > this.cacheExpiry) {
      this.cache.delete(componentName)
      return null
    }

    return cached.result
  }

  // 結果をキャッシュ
  private cacheResult(componentName: string, result: AISearchResult): void {
    this.cache.set(componentName, {
      result,
      timestamp: Date.now()
    })

    // キャッシュサイズ制限（最大1000エントリ）
    if (this.cache.size > 1000) {
      // 最も古いエントリを削除
      const oldestKey = Array.from(this.cache.entries())
        .sort(([, a], [, b]) => a.timestamp - b.timestamp)[0][0]
      this.cache.delete(oldestKey)
    }
  }

  // キャッシュのクリア
  clearCache(): void {
    this.cache.clear()
  }

  // 統計情報の取得
  getStats(): {
    pendingRequests: number
    cacheSize: number
    cacheHitRate: number
  } {
    // TODO: キャッシュヒット率の計算を実装
    return {
      pendingRequests: this.pendingRequests.size,
      cacheSize: this.cache.size,
      cacheHitRate: 0 // 実装予定
    }
  }
}

// グローバルインスタンス
export const aiSearchOptimizer = new AISearchOptimizer()

// React Hook for AI search
export function useAISearch() {
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const searchComponent = React.useCallback(async (
    componentName: string,
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): Promise<AISearchResult | null> => {
    setLoading(true)
    setError(null)

    try {
      const result = await aiSearchOptimizer.requestSearch(componentName, priority)
      return result
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI search failed')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const searchMultiple = React.useCallback(async (
    components: Array<{ name: string; priority?: 'high' | 'medium' | 'low' }>
  ): Promise<AISearchResult[]> => {
    setLoading(true)
    setError(null)

    try {
      const promises = components.map(comp => 
        aiSearchOptimizer.requestSearch(comp.name, comp.priority || 'medium')
      )
      return await Promise.all(promises)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Batch AI search failed')
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    searchComponent,
    searchMultiple,
    loading,
    error,
    clearCache: () => aiSearchOptimizer.clearCache(),
    stats: aiSearchOptimizer.getStats()
  }
}

// 使用例：
// const { searchComponent, loading } = useAISearch()
// const result = await searchComponent('Arduino Uno', 'high')