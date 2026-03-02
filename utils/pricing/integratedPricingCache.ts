// 統合価格キャッシュシステム
// メモリ → データベース → Perplexity APIの多層キャッシュ戦略

import type { 
  ComponentPricingExtended, 
  ShippingDestination 
} from '@/types/parts'
import { PriceCacheService } from './priceCacheService'
import { 
  searchPartPricingWithPerplexity
} from '@/utils/external/perplexityApi'

// ============================================
// インターフェース定義
// ============================================

interface CacheEntry {
  data: ComponentPricingExtended[]
  timestamp: number
  expiry: number
}

interface CacheMetrics {
  memoryHits: number
  databaseHits: number
  apiCalls: number
  errors: number
  totalRequests: number
}

// ============================================
// 統合価格キャッシュクラス
// ============================================

export class IntegratedPricingCache {
  private memoryCache: Map<string, CacheEntry> = new Map()
  private readonly MEMORY_TTL = 60 * 60 * 1000 // 1時間
  private readonly MAX_MEMORY_ENTRIES = 100
  private metrics: CacheMetrics = {
    memoryHits: 0,
    databaseHits: 0,
    apiCalls: 0,
    errors: 0,
    totalRequests: 0
  }
  
  /**
   * 統合された価格取得フロー
   * 1. メモリキャッシュ → 2. DBキャッシュ → 3. Perplexity API
   */
  async getPricing(
    nodeId: string,
    partName: string,
    destination: ShippingDestination
  ): Promise<ComponentPricingExtended[]> {
    this.metrics.totalRequests++
    const cacheKey = this.buildCacheKey(nodeId, destination)
    
    try {
      // 1. メモリキャッシュチェック
      const memoryData = this.getFromMemory(cacheKey)
      if (memoryData) {
        this.metrics.memoryHits++
        console.log('✅ Price hit: Memory cache')
        return memoryData
      }
      
      // 2. DBキャッシュチェック
      const dbData = await PriceCacheService.getCachedPricing(nodeId, destination)
      if (dbData) {
        this.metrics.databaseHits++
        console.log('✅ Price hit: Database cache')
        this.setToMemory(cacheKey, dbData)
        return dbData
      }
      
      // 3. Perplexity API呼び出し
      console.log('🔄 Price miss: Fetching from Perplexity API')
      this.metrics.apiCalls++
      
      let freshData: ComponentPricingExtended[]
      
      try {
        freshData = await searchPartPricingWithPerplexity(partName, destination)
      } catch (error) {
        console.error('Perplexity API error, falling back to mock data:', error)
        this.metrics.errors++
        freshData = []
      }
      
      // 両方のキャッシュに保存
      await this.cacheToAll(nodeId, cacheKey, destination, freshData)
      
      return freshData
      
    } catch (error) {
      this.metrics.errors++
      console.error('Critical error in pricing cache:', error)
      // 最終フォールバック
      return []
    }
  }
  
  /**
   * バッチ価格取得
   * 複数ノードの価格を効率的に取得
   */
  async getBatchPricing(
    nodes: Array<{ nodeId: string; partName: string }>,
    destination: ShippingDestination
  ): Promise<Map<string, ComponentPricingExtended[]>> {
    const results = new Map<string, ComponentPricingExtended[]>()
    const uncachedNodes: Array<{ nodeId: string; partName: string }> = []
    
    // まずキャッシュから取得を試みる
    for (const { nodeId, partName } of nodes) {
      const cacheKey = this.buildCacheKey(nodeId, destination)
      
      // メモリキャッシュチェック
      const memoryData = this.getFromMemory(cacheKey)
      if (memoryData) {
        results.set(nodeId, memoryData)
        continue
      }
      
      // DBキャッシュチェック
      const dbData = await PriceCacheService.getCachedPricing(nodeId, destination)
      if (dbData) {
        results.set(nodeId, dbData)
        this.setToMemory(cacheKey, dbData)
        continue
      }
      
      // キャッシュにない場合はAPIから取得が必要
      uncachedNodes.push({ nodeId, partName })
    }
    
    // キャッシュされていないノードをバッチ処理
    if (uncachedNodes.length > 0) {
      console.log(`🔄 Fetching ${uncachedNodes.length} uncached prices...`)
      
      for (const { nodeId, partName } of uncachedNodes) {
        try {
          const pricing = await this.getPricing(nodeId, partName, destination)
          results.set(nodeId, pricing)
          
          // レート制限のための小さな遅延
          await new Promise(resolve => setTimeout(resolve, 100))
        } catch (error) {
          console.error(`Failed to get pricing for ${partName}:`, error)
          results.set(nodeId, [])
        }
      }
    }
    
    return results
  }
  
  /**
   * キャッシュの手動更新
   * 強制的に新しいデータを取得
   */
  async refreshPricing(
    nodeId: string,
    partName: string,
    destination: ShippingDestination
  ): Promise<ComponentPricingExtended[]> {
    const cacheKey = this.buildCacheKey(nodeId, destination)
    
    // キャッシュをクリア
    this.memoryCache.delete(cacheKey)
    await PriceCacheService.clearDestinationCache(nodeId, destination)
    
    // 新しいデータを取得
    return this.getPricing(nodeId, partName, destination)
  }
  
  /**
   * キャッシュメトリクスの取得
   */
  getMetrics(): CacheMetrics & {
    hitRate: number
    memorySize: number
  } {
    const hitRate = this.metrics.totalRequests > 0
      ? ((this.metrics.memoryHits + this.metrics.databaseHits) / this.metrics.totalRequests) * 100
      : 0
      
    return {
      ...this.metrics,
      hitRate: Math.round(hitRate * 100) / 100,
      memorySize: this.memoryCache.size
    }
  }
  
  /**
   * メトリクスのリセット
   */
  resetMetrics(): void {
    this.metrics = {
      memoryHits: 0,
      databaseHits: 0,
      apiCalls: 0,
      errors: 0,
      totalRequests: 0
    }
  }
  
  /**
   * メモリキャッシュのクリア
   */
  clearMemoryCache(): void {
    this.memoryCache.clear()
    console.log('🗑️ Memory cache cleared')
  }
  
  // ============================================
  // プライベートメソッド
  // ============================================
  
  /**
   * 全キャッシュレイヤーに保存
   */
  private async cacheToAll(
    nodeId: string,
    memoryKey: string,
    destination: ShippingDestination,
    data: ComponentPricingExtended[]
  ): Promise<void> {
    // メモリキャッシュは常に保存
    this.setToMemory(memoryKey, data)
    
    // 一時的なノードIDの場合はDB保存をスキップ
    // system-part- で始まるIDは生成時の一時的なノード
    if (nodeId.startsWith('system-part-')) {
      console.log(`⏭️ Skipping DB cache for temporary node: ${nodeId}`)
      return
    }
    
    // 永続的なノードのみDBキャッシュに保存
    PriceCacheService.setCachedPricing(nodeId, destination, data).catch(err => {
      console.error('Failed to cache to DB:', err)
      this.metrics.errors++
    })
  }
  
  /**
   * メモリキャッシュから取得
   */
  private getFromMemory(key: string): ComponentPricingExtended[] | null {
    const entry = this.memoryCache.get(key)
    if (!entry) return null
    
    if (Date.now() > entry.expiry) {
      this.memoryCache.delete(key)
      return null
    }
    
    return entry.data
  }
  
  /**
   * メモリキャッシュに保存
   */
  private setToMemory(key: string, data: ComponentPricingExtended[]): void {
    const now = Date.now()
    
    this.memoryCache.set(key, {
      data,
      timestamp: now,
      expiry: now + this.MEMORY_TTL
    })
    
    // メモリ制限の管理
    this.enforceMemoryLimit()
  }
  
  /**
   * メモリ制限を適用
   * LRU (Least Recently Used) 戦略
   */
  private enforceMemoryLimit(): void {
    if (this.memoryCache.size <= this.MAX_MEMORY_ENTRIES) return
    
    // 最も古いエントリを削除
    const entries = Array.from(this.memoryCache.entries())
      .sort(([, a], [, b]) => a.timestamp - b.timestamp)
    
    const toRemove = this.memoryCache.size - this.MAX_MEMORY_ENTRIES
    for (let i = 0; i < toRemove; i++) {
      this.memoryCache.delete(entries[i][0])
    }
    
    console.log(`🧹 Removed ${toRemove} old entries from memory cache`)
  }
  
  /**
   * キャッシュキーの構築
   */
  private buildCacheKey(nodeId: string, destination: ShippingDestination): string {
    const destKey = `${destination.country}-${destination.region || 'default'}`
    return `${nodeId}-${destKey}`
  }
}

// ============================================
// シングルトンインスタンス
// ============================================

let instance: IntegratedPricingCache | null = null

export function getIntegratedPricingCache(): IntegratedPricingCache {
  if (!instance) {
    instance = new IntegratedPricingCache()
  }
  return instance
}

// ============================================
// ユーティリティ関数
// ============================================

/**
 * 配送先変更時のキャッシュ戦略
 * 古い配送先のデータは保持しつつ、新しい配送先のデータを取得
 */
export async function handleDestinationChange(
  nodes: Array<{ nodeId: string; partName: string }>,
  oldDestination: ShippingDestination,
  newDestination: ShippingDestination
): Promise<void> {
  const cache = getIntegratedPricingCache()
  
  console.log(`📍 Destination changed from ${oldDestination.country} to ${newDestination.country}`)
  
  // メモリキャッシュのみクリア（DBキャッシュは保持）
  cache.clearMemoryCache()
  
  // 新しい配送先のデータをプリフェッチ（非同期）
  cache.getBatchPricing(nodes, newDestination).then(() => {
    console.log('✅ Prefetched pricing for new destination')
  }).catch(error => {
    console.error('Failed to prefetch pricing:', error)
  })
}

/**
 * キャッシュヘルスチェック
 * 定期的に実行してキャッシュの健全性を確認
 */
export async function checkCacheHealth(): Promise<{
  isHealthy: boolean
  issues: string[]
}> {
  const issues: string[] = []
  const cache = getIntegratedPricingCache()
  const metrics = cache.getMetrics()
  
  // エラー率チェック
  if (metrics.totalRequests > 100 && metrics.errors / metrics.totalRequests > 0.1) {
    issues.push(`High error rate: ${(metrics.errors / metrics.totalRequests * 100).toFixed(1)}%`)
  }
  
  // ヒット率チェック
  if (metrics.totalRequests > 100 && metrics.hitRate < 50) {
    issues.push(`Low cache hit rate: ${metrics.hitRate}%`)
  }
  
  // DB統計チェック
  try {
    const dbStats = await PriceCacheService.getCacheStats()
    if (dbStats.cachedNodes > 1000) {
      issues.push(`Large number of cached nodes: ${dbStats.cachedNodes}`)
    }
  } catch (error) {
    issues.push('Failed to check database cache stats')
  }
  
  return {
    isHealthy: issues.length === 0,
    issues
  }
}

// デフォルトエクスポート
export default getIntegratedPricingCache()