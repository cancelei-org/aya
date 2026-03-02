// データベースベースの価格キャッシュサービス
// canvas_nodesテーブルに価格データを永続化

import { prisma } from '@/lib/prisma'
import type { 
  ComponentPricingExtended, 
  ShippingDestination,
  CachedPricingData 
} from '@/types/parts'

/**
 * 価格データのデータベースキャッシュサービス
 * 配送先別の価格情報をcanvas_nodesテーブルに保存
 */
export class PriceCacheService {
  /**
   * 配送先別のキャッシュキーを生成
   * @example "JP_東京" or "US_California"
   */
  private static getCacheKey(destination: ShippingDestination): string {
    const region = destination.region || 'default'
    // 特殊文字を除去してキーを安全にする
    const safeCountry = destination.country.replace(/[^a-zA-Z0-9]/g, '')
    const safeRegion = region.replace(/[^a-zA-Z0-9\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/g, '')
    return `${safeCountry}_${safeRegion}`
  }

  /**
   * ノードの価格キャッシュを取得
   * TTLチェックを含む
   */
  static async getCachedPricing(
    nodeId: string,
    destination: ShippingDestination
  ): Promise<ComponentPricingExtended[] | null> {
    try {
      const node = await prisma.canvas_nodes.findUnique({
        where: { id: nodeId },
        select: { 
          cached_pricing: true, 
          pricing_updated_at: true 
        }
      })

      if (!node?.cached_pricing) {
        console.log(`💭 No cached pricing for node ${nodeId}`)
        return null
      }

      const cacheKey = this.getCacheKey(destination)
      const cachedData = (node.cached_pricing as CachedPricingData)[cacheKey]
      
      if (!cachedData) {
        console.log(`💭 No cached pricing for destination ${cacheKey}`)
        return null
      }

      // TTLチェック
      const now = Date.now()
      const fetchedAt = new Date(cachedData.fetchedAt).getTime()
      const expiresAt = fetchedAt + (cachedData.ttl * 1000)
      
      if (now > expiresAt) {
        console.log(`⏰ Cached pricing expired for ${cacheKey} (expired ${new Date(expiresAt).toISOString()})`)
        return null
      }

      console.log(`✅ Found valid cached pricing for ${cacheKey}`)
      return cachedData.prices
      
    } catch (error) {
      console.error('Error getting cached pricing:', error)
      return null
    }
  }

  /**
   * ノードに価格をキャッシュ
   * 既存のキャッシュデータとマージ
   */
  static async setCachedPricing(
    nodeId: string,
    destination: ShippingDestination,
    prices: ComponentPricingExtended[],
    ttlSeconds: number = 14400 // 4時間デフォルト
  ): Promise<void> {
    try {
      const cacheKey = this.getCacheKey(destination)
      console.log(`💾 Caching pricing for ${cacheKey} with TTL ${ttlSeconds}s`)
      
      // 既存のキャッシュを取得
      const node = await prisma.canvas_nodes.findUnique({
        where: { id: nodeId },
        select: { cached_pricing: true }
      })

      const existingCache = (node?.cached_pricing as CachedPricingData) || {}
      
      // 新しいキャッシュデータを追加/更新
      const updatedCache: CachedPricingData = {
        ...existingCache,
        [cacheKey]: {
          prices,
          fetchedAt: new Date().toISOString(),
          ttl: ttlSeconds
        }
      }

      // データベース更新
      await prisma.canvas_nodes.update({
        where: { id: nodeId },
        data: {
          cached_pricing: updatedCache,
          pricing_updated_at: new Date()
        }
      })

      console.log(`✅ Successfully cached pricing for ${cacheKey}`)
      
    } catch (error) {
      console.error('Error setting cached pricing:', error)
      throw error
    }
  }

  /**
   * 特定のノードのキャッシュをクリア
   */
  static async clearNodeCache(nodeId: string): Promise<void> {
    try {
      await prisma.canvas_nodes.update({
        where: { id: nodeId },
        data: {
          cached_pricing: null,
          pricing_updated_at: null
        }
      })
      console.log(`🗑️ Cleared cache for node ${nodeId}`)
    } catch (error) {
      console.error('Error clearing node cache:', error)
    }
  }

  /**
   * 特定の配送先のキャッシュをクリア
   */
  static async clearDestinationCache(
    nodeId: string,
    destination: ShippingDestination
  ): Promise<void> {
    try {
      const node = await prisma.canvas_nodes.findUnique({
        where: { id: nodeId },
        select: { cached_pricing: true }
      })

      if (!node?.cached_pricing) return

      const cacheKey = this.getCacheKey(destination)
      const existingCache = node.cached_pricing as CachedPricingData
      
      // 指定された配送先のキャッシュを削除
      delete existingCache[cacheKey]

      // 更新
      await prisma.canvas_nodes.update({
        where: { id: nodeId },
        data: {
          cached_pricing: Object.keys(existingCache).length > 0 ? existingCache : null,
          pricing_updated_at: new Date()
        }
      })

      console.log(`🗑️ Cleared cache for destination ${cacheKey}`)
    } catch (error) {
      console.error('Error clearing destination cache:', error)
    }
  }

  /**
   * 期限切れキャッシュのクリーンアップ
   * 定期的に実行することを推奨
   */
  static async cleanupExpiredCache(): Promise<{
    processedNodes: number
    cleanedEntries: number
  }> {
    try {
      console.log('🧹 Starting cache cleanup...')
      
      // 24時間以上前に更新されたノードを取得
      const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000)
      
      const nodes = await prisma.canvas_nodes.findMany({
        where: {
          cached_pricing: { not: null },
          pricing_updated_at: {
            lt: cutoffDate
          }
        },
        select: {
          id: true,
          cached_pricing: true
        }
      })

      console.log(`📊 Found ${nodes.length} nodes to check`)

      let processedNodes = 0
      let cleanedEntries = 0
      const now = Date.now()

      for (const node of nodes) {
        const cache = node.cached_pricing as CachedPricingData
        const updatedCache: CachedPricingData = {}
        let hasChanges = false
        
        // 有効なキャッシュのみ保持
        for (const [key, data] of Object.entries(cache)) {
          const fetchedAt = new Date(data.fetchedAt).getTime()
          const expiresAt = fetchedAt + (data.ttl * 1000)
          
          if (now <= expiresAt) {
            updatedCache[key] = data
          } else {
            cleanedEntries++
            hasChanges = true
            console.log(`🗑️ Removing expired cache: ${key} from node ${node.id}`)
          }
        }

        // 変更があった場合のみ更新
        if (hasChanges) {
          await prisma.canvas_nodes.update({
            where: { id: node.id },
            data: {
              cached_pricing: Object.keys(updatedCache).length > 0 ? updatedCache : null,
              pricing_updated_at: Object.keys(updatedCache).length > 0 ? new Date() : null
            }
          })
          processedNodes++
        }
      }

      console.log(`✅ Cleanup complete: ${processedNodes} nodes updated, ${cleanedEntries} entries removed`)
      
      return {
        processedNodes,
        cleanedEntries
      }
      
    } catch (error) {
      console.error('Error during cache cleanup:', error)
      return {
        processedNodes: 0,
        cleanedEntries: 0
      }
    }
  }

  /**
   * キャッシュ統計情報を取得
   */
  static async getCacheStats(): Promise<{
    totalNodes: number
    cachedNodes: number
    totalCacheEntries: number
    oldestCache: Date | null
    newestCache: Date | null
  }> {
    try {
      const totalNodes = await prisma.canvas_nodes.count()
      
      const cachedNodes = await prisma.canvas_nodes.count({
        where: {
          cached_pricing: { not: null }
        }
      })

      const nodes = await prisma.canvas_nodes.findMany({
        where: {
          cached_pricing: { not: null }
        },
        select: {
          cached_pricing: true,
          pricing_updated_at: true
        }
      })

      let totalCacheEntries = 0
      nodes.forEach(node => {
        const cache = node.cached_pricing as CachedPricingData
        totalCacheEntries += Object.keys(cache).length
      })

      const timestamps = await prisma.canvas_nodes.findMany({
        where: {
          pricing_updated_at: { not: null }
        },
        select: {
          pricing_updated_at: true
        },
        orderBy: {
          pricing_updated_at: 'asc'
        }
      })

      return {
        totalNodes,
        cachedNodes,
        totalCacheEntries,
        oldestCache: timestamps[0]?.pricing_updated_at || null,
        newestCache: timestamps[timestamps.length - 1]?.pricing_updated_at || null
      }
      
    } catch (error) {
      console.error('Error getting cache stats:', error)
      return {
        totalNodes: 0,
        cachedNodes: 0,
        totalCacheEntries: 0,
        oldestCache: null,
        newestCache: null
      }
    }
  }
}

// ============================================
// ユーティリティ関数
// ============================================

/**
 * プロジェクト内の全ノードのキャッシュをクリア
 */
export async function clearProjectCache(projectId: string): Promise<number> {
  try {
    const result = await prisma.canvas_nodes.updateMany({
      where: {
        project_id: projectId,
        cached_pricing: { not: null }
      },
      data: {
        cached_pricing: null,
        pricing_updated_at: null
      }
    })
    
    console.log(`🗑️ Cleared cache for ${result.count} nodes in project ${projectId}`)
    return result.count
    
  } catch (error) {
    console.error('Error clearing project cache:', error)
    return 0
  }
}

/**
 * キャッシュのウォームアップ
 * 頻繁にアクセスされる部品の価格を事前に取得
 */
export async function warmupCache(
  nodeIds: string[],
  destination: ShippingDestination,
  fetchFunction: (nodeId: string) => Promise<ComponentPricingExtended[]>
): Promise<void> {
  console.log(`🔥 Warming up cache for ${nodeIds.length} nodes...`)
  
  for (const nodeId of nodeIds) {
    try {
      // 既存のキャッシュをチェック
      const existing = await PriceCacheService.getCachedPricing(nodeId, destination)
      if (existing) {
        console.log(`⏭️ Skipping ${nodeId} - already cached`)
        continue
      }
      
      // 新しいデータを取得してキャッシュ
      const prices = await fetchFunction(nodeId)
      if (prices.length > 0) {
        await PriceCacheService.setCachedPricing(nodeId, destination, prices)
      }
      
      // レート制限のための遅延
      await new Promise(resolve => setTimeout(resolve, 500))
      
    } catch (error) {
      console.error(`Failed to warmup cache for ${nodeId}:`, error)
    }
  }
  
  console.log('✅ Cache warmup complete')
}

export default PriceCacheService