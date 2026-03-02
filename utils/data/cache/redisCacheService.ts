// 🗄️ Redis キャッシュサービス
// フェーズ2タスク2.3.1: キャッシュインフラストラクチャ設定

import type { ComponentSpecification, AISearchResult } from '../../ai/core/aiSpecificationService'
import type { PricingInfo, LibraryInfo } from '../../external/externalApiService'

export interface CacheConfig {
  enableRedis: boolean
  redisUrl?: string
  defaultTTL: number // seconds
  maxMemoryMB: number
  keyPrefix: string
  compressionEnabled: boolean
}

export interface CacheEntry<T> {
  data: T
  timestamp: number
  expiry: number
  hits: number
  size: number // bytes
}

export interface CacheStats {
  totalKeys: number
  totalSize: number // bytes
  hitRate: number
  missRate: number
  memoryUsage: {
    used: number
    available: number
    percentage: number
  }
  keysByType: {
    [type: string]: number
  }
}

/**
 * 🚀 RedisCacheService
 * 高性能な部品仕様とAI検索結果のキャッシュシステム
 */
export class RedisCacheService {
  private config: CacheConfig
  private redisClient: any = null
  private localCache: Map<string, CacheEntry<any>>
  private stats: {
    hits: number
    misses: number
    totalRequests: number
  }
  private static instance: RedisCacheService

  constructor(config?: Partial<CacheConfig>) {
    this.config = {
      enableRedis: false, // Default to local cache only
      defaultTTL: 7 * 24 * 60 * 60, // 7 days
      maxMemoryMB: 100,
      keyPrefix: 'orboh:cache:',
      compressionEnabled: true,
      ...config
    }

    this.localCache = new Map()
    this.stats = { hits: 0, misses: 0, totalRequests: 0 }
    
    if (this.config.enableRedis) {
      this.initializeRedis()
    }
  }

  public static getInstance(config?: Partial<CacheConfig>): RedisCacheService {
    if (!RedisCacheService.instance) {
      RedisCacheService.instance = new RedisCacheService(config)
    }
    return RedisCacheService.instance
  }

  /**
   * 🔧 Redis クライアント初期化
   */
  private async initializeRedis(): Promise<void> {
    if (!this.config.redisUrl) {
      console.warn('Redis URL not configured, falling back to local cache')
      this.config.enableRedis = false
      return
    }

    try {
      // Dynamic import for Redis client (避免SSR问题)
      const { createClient } = await import('redis')
      
      this.redisClient = createClient({
        url: this.config.redisUrl,
        socket: {
          connectTimeout: 5000,
          lazyConnect: true
        }
      })

      this.redisClient.on('error', (err: Error) => {
        console.error('Redis client error:', err)
        this.config.enableRedis = false
      })

      this.redisClient.on('connect', () => {
        console.log('Redis cache connected successfully')
      })

      await this.redisClient.connect()
      
    } catch (error) {
      console.error('Failed to initialize Redis:', error)
      this.config.enableRedis = false
    }
  }

  /**
   * 📄 部品仕様のキャッシュ（7日間）
   */
  public async cacheComponentSpecification(
    componentName: string, 
    specification: ComponentSpecification
  ): Promise<void> {
    const key = this.buildKey('spec', componentName)
    const ttl = 7 * 24 * 60 * 60 // 7 days
    await this.setCache(key, specification, ttl)
  }

  /**
   * 🔍 部品仕様の取得
   */
  public async getComponentSpecification(
    componentName: string
  ): Promise<ComponentSpecification | null> {
    const key = this.buildKey('spec', componentName)
    return this.getCache<ComponentSpecification>(key)
  }

  /**
   * 🤖 AI検索結果のキャッシュ（24時間）
   */
  public async cacheAISearchResult(
    componentName: string,
    searchDepth: string,
    result: AISearchResult
  ): Promise<void> {
    const key = this.buildKey('ai-search', `${componentName}-${searchDepth}`)
    const ttl = 24 * 60 * 60 // 24 hours
    await this.setCache(key, result, ttl)
  }

  /**
   * 🔎 AI検索結果の取得
   */
  public async getAISearchResult(
    componentName: string,
    searchDepth: string
  ): Promise<AISearchResult | null> {
    const key = this.buildKey('ai-search', `${componentName}-${searchDepth}`)
    return this.getCache<AISearchResult>(key)
  }

  /**
   * 💰 価格情報のキャッシュ（4時間）
   */
  public async cachePricingInfo(
    componentName: string,
    pricing: PricingInfo
  ): Promise<void> {
    const key = this.buildKey('pricing', componentName)
    const ttl = 4 * 60 * 60 // 4 hours
    await this.setCache(key, pricing, ttl)
  }

  /**
   * 💲 価格情報の取得
   */
  public async getPricingInfo(componentName: string): Promise<PricingInfo | null> {
    const key = this.buildKey('pricing', componentName)
    return this.getCache<PricingInfo>(key)
  }

  /**
   * 📚 ライブラリ情報のキャッシュ（12時間）
   */
  public async cacheLibraryInfo(
    componentName: string,
    libraries: LibraryInfo
  ): Promise<void> {
    const key = this.buildKey('library', componentName)
    const ttl = 12 * 60 * 60 // 12 hours
    await this.setCache(key, libraries, ttl)
  }

  /**
   * 📖 ライブラリ情報の取得
   */
  public async getLibraryInfo(componentName: string): Promise<LibraryInfo | null> {
    const key = this.buildKey('library', componentName)
    return this.getCache<LibraryInfo>(key)
  }

  /**
   * 🔄 互換性チェック結果のキャッシュ（24時間）
   */
  public async cacheCompatibilityResult(
    component1: string,
    component2: string,
    connectionType: string,
    result: any
  ): Promise<void> {
    const key = this.buildKey('compatibility', `${component1}-${component2}-${connectionType}`)
    const ttl = 24 * 60 * 60 // 24 hours
    await this.setCache(key, result, ttl)
  }

  /**
   * ✅ 互換性チェック結果の取得
   */
  public async getCompatibilityResult(
    component1: string,
    component2: string,
    connectionType: string
  ): Promise<any | null> {
    const key = this.buildKey('compatibility', `${component1}-${component2}-${connectionType}`)
    return this.getCache<any>(key)
  }

  /**
   * 🧹 期限切れキャッシュのクリーンアップ
   */
  public async cleanup(): Promise<{
    removed: number
    freedMemory: number
  }> {
    const now = Date.now()
    let removed = 0
    let freedMemory = 0

    // Local cache cleanup
    for (const [key, entry] of this.localCache.entries()) {
      if (now > entry.expiry) {
        freedMemory += entry.size
        this.localCache.delete(key)
        removed++
      }
    }

    // Redis cleanup (if enabled)
    if (this.config.enableRedis && this.redisClient) {
      try {
        // Redis TTL handles expiration automatically
        // But we can scan for expired keys if needed
        const keys = await this.redisClient.keys(`${this.config.keyPrefix}*`)
        for (const key of keys) {
          const ttl = await this.redisClient.ttl(key)
          if (ttl === -2) { // Key doesn't exist or expired
            removed++
          }
        }
      } catch (error) {
        console.error('Redis cleanup error:', error)
      }
    }

    return { removed, freedMemory }
  }

  /**
   * 📊 キャッシュ統計の取得
   */
  public async getStats(): Promise<CacheStats> {
    const localSize = Array.from(this.localCache.values())
      .reduce((total, entry) => total + entry.size, 0)

    const keysByType: { [type: string]: number } = {}
    
    for (const key of this.localCache.keys()) {
      const type = key.split(':')[2] || 'unknown'
      keysByType[type] = (keysByType[type] || 0) + 1
    }

    const hitRate = this.stats.totalRequests > 0 
      ? (this.stats.hits / this.stats.totalRequests) * 100 
      : 0

    return {
      totalKeys: this.localCache.size,
      totalSize: localSize,
      hitRate: Math.round(hitRate * 100) / 100,
      missRate: Math.round((100 - hitRate) * 100) / 100,
      memoryUsage: {
        used: localSize,
        available: this.config.maxMemoryMB * 1024 * 1024,
        percentage: Math.round((localSize / (this.config.maxMemoryMB * 1024 * 1024)) * 10000) / 100
      },
      keysByType
    }
  }

  /**
   * 🔄 バックグラウンド更新のスケジュール
   */
  public scheduleBackgroundUpdate(
    componentName: string,
    updateFunction: () => Promise<ComponentSpecification>
  ): void {
    // 6日後にバックグラウンド更新をスケジュール（7日TTLの1日前）
    const updateTime = 6 * 24 * 60 * 60 * 1000 // 6 days in ms
    
    setTimeout(async () => {
      try {
        console.log(`Background updating specification for ${componentName}`)
        const updatedSpec = await updateFunction()
        await this.cacheComponentSpecification(componentName, updatedSpec)
        console.log(`Background update completed for ${componentName}`)
      } catch (error) {
        console.error(`Background update failed for ${componentName}:`, error)
      }
    }, updateTime)
  }

  /**
   * 🗑️ 特定キーの削除
   */
  public async invalidateKey(key: string): Promise<boolean> {
    const fullKey = key.startsWith(this.config.keyPrefix) ? key : this.buildKey('', key)
    
    // Local cache
    const localDeleted = this.localCache.delete(fullKey)
    
    // Redis cache
    if (this.config.enableRedis && this.redisClient) {
      try {
        await this.redisClient.del(fullKey)
      } catch (error) {
        console.error('Redis key deletion error:', error)
      }
    }
    
    return localDeleted
  }

  /**
   * 🧹 全キャッシュのクリア
   */
  public async clearAll(): Promise<void> {
    // Local cache
    this.localCache.clear()
    this.stats = { hits: 0, misses: 0, totalRequests: 0 }
    
    // Redis cache
    if (this.config.enableRedis && this.redisClient) {
      try {
        const keys = await this.redisClient.keys(`${this.config.keyPrefix}*`)
        if (keys.length > 0) {
          await this.redisClient.del(keys)
        }
      } catch (error) {
        console.error('Redis clear error:', error)
      }
    }
  }

  // Private helper methods

  private async setCache<T>(key: string, data: T, ttlSeconds: number): Promise<void> {
    const now = Date.now()
    const serialized = this.serialize(data)
    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      expiry: now + (ttlSeconds * 1000),
      hits: 0,
      size: this.calculateSize(serialized)
    }

    // Local cache
    this.localCache.set(key, entry)
    
    // Memory management
    await this.enforceMemoryLimit()

    // Redis cache (if enabled)
    if (this.config.enableRedis && this.redisClient) {
      try {
        await this.redisClient.setEx(key, ttlSeconds, serialized)
      } catch (error) {
        console.error('Redis set error:', error)
      }
    }
  }

  private async getCache<T>(key: string): Promise<T | null> {
    this.stats.totalRequests++
    const now = Date.now()

    // Try local cache first
    const localEntry = this.localCache.get(key)
    if (localEntry && now <= localEntry.expiry) {
      localEntry.hits++
      this.stats.hits++
      return localEntry.data as T
    }

    // Try Redis cache
    if (this.config.enableRedis && this.redisClient) {
      try {
        const redisData = await this.redisClient.get(key)
        if (redisData) {
          const deserialized = this.deserialize<T>(redisData)
          
          // Store in local cache for faster access
          const entry: CacheEntry<T> = {
            data: deserialized,
            timestamp: now,
            expiry: now + (this.config.defaultTTL * 1000),
            hits: 1,
            size: this.calculateSize(redisData)
          }
          this.localCache.set(key, entry)
          
          this.stats.hits++
          return deserialized
        }
      } catch (error) {
        console.error('Redis get error:', error)
      }
    }

    // Remove expired local entry
    if (localEntry) {
      this.localCache.delete(key)
    }

    this.stats.misses++
    return null
  }

  private buildKey(type: string, identifier: string): string {
    const sanitized = identifier.toLowerCase().replace(/[^a-z0-9-_]/g, '-')
    return `${this.config.keyPrefix}${type}:${sanitized}`
  }

  private serialize<T>(data: T): string {
    const json = JSON.stringify(data)
    // TODO: Implement compression if enabled
    return json
  }

  private deserialize<T>(serialized: string): T {
    // TODO: Implement decompression if enabled
    return JSON.parse(serialized) as T
  }

  private calculateSize(data: string): number {
    return new Blob([data]).size
  }

  private async enforceMemoryLimit(): Promise<void> {
    const maxBytes = this.config.maxMemoryMB * 1024 * 1024
    let currentSize = Array.from(this.localCache.values())
      .reduce((total, entry) => total + entry.size, 0)

    if (currentSize <= maxBytes) return

    // Remove least recently used entries
    const sortedEntries = Array.from(this.localCache.entries())
      .sort(([, a], [, b]) => a.timestamp - b.timestamp)

    while (currentSize > maxBytes && sortedEntries.length > 0) {
      const [key, entry] = sortedEntries.shift()!
      this.localCache.delete(key)
      currentSize -= entry.size
    }
  }
}

// Export utility functions
export function createRedisCacheService(config?: Partial<CacheConfig>): RedisCacheService {
  return RedisCacheService.getInstance(config)
}

export async function getCachedSpecification(componentName: string): Promise<ComponentSpecification | null> {
  const cache = RedisCacheService.getInstance()
  return cache.getComponentSpecification(componentName)
}

export async function setCachedSpecification(
  componentName: string, 
  specification: ComponentSpecification
): Promise<void> {
  const cache = RedisCacheService.getInstance()
  return cache.cacheComponentSpecification(componentName, specification)
}

export async function getCacheStats(): Promise<CacheStats> {
  const cache = RedisCacheService.getInstance()
  return cache.getStats()
}

export async function getAISearchResult(
  componentName: string,
  searchDepth: string
): Promise<AISearchResult | null> {
  const cache = RedisCacheService.getInstance()
  return cache.getAISearchResult(componentName, searchDepth)
}

export async function cacheAISearchResult(
  componentName: string,
  searchDepth: string,
  result: AISearchResult
): Promise<void> {
  const cache = RedisCacheService.getInstance()
  return cache.cacheAISearchResult(componentName, searchDepth, result)
}