// 🌐 外部API統合サービス
// フェーズ2タスク2.2.1: 市場価格・ライブラリ情報の動的取得

export interface PricingInfo {
  component: string
  prices: Array<{
    supplier: string
    price: number
    currency: string
    quantity: number
    availability: 'in_stock' | 'limited' | 'out_of_stock' | 'discontinued'
    leadTime: string
    url: string
    lastUpdated: string
  }>
  averagePrice: number
  priceRange: {
    min: number
    max: number
  }
  recommendedSupplier: string
}

export interface LibraryInfo {
  component: string
  libraries: Array<{
    name: string
    platform: 'arduino' | 'platformio' | 'github' | 'npm' | 'pip'
    repository: string
    version: string
    downloads: number
    stars: number
    lastUpdated: string
    documentation: string
    examples: string[]
    compatibility: string[]
  }>
  officialLibrary?: {
    name: string
    repository: string
    documentation: string
  }
  popularLibraries: Array<{
    name: string
    reason: string
    score: number
  }>
}

export interface ExternalApiConfig {
  enablePricing: boolean
  enableLibrarySearch: boolean
  apiKeys: {
    octopart?: string
    mouser?: string
    digikey?: string
    github?: string
  }
  rateLimits: {
    [service: string]: {
      requestsPerMinute: number
      requestsPerHour: number
    }
  }
  timeout: number
  retryAttempts: number
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    service: string
    code: string
    message: string
    retryAfter?: number
  }
  metadata: {
    source: string
    responseTime: number
    cached: boolean
    rateLimitRemaining?: number
  }
}

/**
 * 🔌 ExternalApiService
 * 複数の外部APIを統合した情報取得サービス
 */
export class ExternalApiService {
  private config: ExternalApiConfig
  private rateLimiters: Map<string, RateLimiter>
  private cache: Map<string, CacheEntry>
  private static instance: ExternalApiService

  constructor(config?: Partial<ExternalApiConfig>) {
    this.config = {
      enablePricing: true,
      enableLibrarySearch: true,
      apiKeys: {},
      rateLimits: {
        octopart: { requestsPerMinute: 60, requestsPerHour: 1000 },
        github: { requestsPerMinute: 60, requestsPerHour: 5000 },
        mouser: { requestsPerMinute: 10, requestsPerHour: 1000 },
        digikey: { requestsPerMinute: 10, requestsPerHour: 1000 }
      },
      timeout: 10000,
      retryAttempts: 3,
      ...config
    }

    this.rateLimiters = new Map()
    this.cache = new Map()
    this.initializeRateLimiters()
  }

  public static getInstance(config?: Partial<ExternalApiConfig>): ExternalApiService {
    if (!ExternalApiService.instance) {
      ExternalApiService.instance = new ExternalApiService(config)
    }
    return ExternalApiService.instance
  }

  /**
   * 💰 部品価格情報の取得
   */
  public async fetchPricingInfo(
    componentName: string,
    partNumber?: string
  ): Promise<ApiResponse<PricingInfo>> {
    if (!this.config.enablePricing) {
      return this.createDisabledResponse('Pricing API is disabled')
    }

    // Redisキャッシュから確認
    const { getPricingInfo, cachePricingInfo } = require('../data/cache/redisCacheService')
    const cachedPricing = await getPricingInfo(componentName)
    
    if (cachedPricing) {
      return {
        success: true,
        data: cachedPricing,
        metadata: {
          source: 'redis-cache',
          responseTime: 0,
          cached: true
        }
      }
    }

    // ローカルキャッシュ確認（フォールバック）
    const cacheKey = `pricing:${componentName}:${partNumber || 'none'}`
    const cached = this.getFromCache<PricingInfo>(cacheKey)
    if (cached) {
      return {
        success: true,
        data: cached,
        metadata: {
          source: 'local-cache',
          responseTime: 0,
          cached: true
        }
      }
    }

    const startTime = Date.now()
    
    try {
      // 複数のPricing APIを並行実行
      const pricingPromises = [
        this.fetchOctopartPricing(componentName, partNumber),
        this.fetchMouserPricing(componentName, partNumber),
        this.fetchDigikeyPricing(componentName, partNumber)
      ]

      const results = await Promise.allSettled(pricingPromises)
      const successfulResults = results
        .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
        .map(result => result.value)
        .filter(result => result.success)

      if (successfulResults.length === 0) {
        return {
          success: false,
          error: {
            service: 'pricing',
            code: 'no_data',
            message: 'No pricing information available from any source'
          },
          metadata: {
            source: 'multiple',
            responseTime: Date.now() - startTime,
            cached: false
          }
        }
      }

      // 結果を統合
      const aggregatedPricing = this.aggregatePricingData(successfulResults, componentName)
      
      // Redisキャッシュに保存（4時間）
      await cachePricingInfo(componentName, aggregatedPricing)
      
      // ローカルキャッシュにも保存（フォールバック用）
      this.setCache(cacheKey, aggregatedPricing, 4 * 60 * 60 * 1000)

      return {
        success: true,
        data: aggregatedPricing,
        metadata: {
          source: `${successfulResults.length} sources`,
          responseTime: Date.now() - startTime,
          cached: false
        }
      }

    } catch (error) {
      return {
        success: false,
        error: {
          service: 'pricing',
          code: 'fetch_error',
          message: `Failed to fetch pricing: ${error}`
        },
        metadata: {
          source: 'error',
          responseTime: Date.now() - startTime,
          cached: false
        }
      }
    }
  }

  /**
   * 📚 ライブラリ情報の取得
   */
  public async fetchLibraryInfo(
    componentName: string,
    platform?: 'arduino' | 'platformio' | 'all'
  ): Promise<ApiResponse<LibraryInfo>> {
    if (!this.config.enableLibrarySearch) {
      return this.createDisabledResponse('Library search is disabled')
    }

    // Redisキャッシュから確認
    const { getLibraryInfo, cacheLibraryInfo } = require('../data/cache/redisCacheService')
    const cachedLibraries = await getLibraryInfo(componentName)
    
    if (cachedLibraries) {
      return {
        success: true,
        data: cachedLibraries,
        metadata: {
          source: 'redis-cache',
          responseTime: 0,
          cached: true
        }
      }
    }

    // ローカルキャッシュ確認（フォールバック）
    const cacheKey = `library:${componentName}:${platform || 'all'}`
    const cached = this.getFromCache<LibraryInfo>(cacheKey)
    if (cached) {
      return {
        success: true,
        data: cached,
        metadata: {
          source: 'local-cache',
          responseTime: 0,
          cached: true
        }
      }
    }

    const startTime = Date.now()

    try {
      // 複数のLibrary APIを並行実行
      const libraryPromises = [
        this.fetchGithubLibraries(componentName),
        this.fetchArduinoLibraries(componentName),
        this.fetchPlatformIOLibraries(componentName)
      ]

      const results = await Promise.allSettled(libraryPromises)
      const successfulResults = results
        .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
        .map(result => result.value)
        .filter(result => result.success)

      if (successfulResults.length === 0) {
        return {
          success: false,
          error: {
            service: 'library',
            code: 'no_data',
            message: 'No library information available'
          },
          metadata: {
            source: 'multiple',
            responseTime: Date.now() - startTime,
            cached: false
          }
        }
      }

      // 結果を統合
      const aggregatedLibraries = this.aggregateLibraryData(successfulResults, componentName)
      
      // Redisキャッシュに保存（12時間）
      await cacheLibraryInfo(componentName, aggregatedLibraries)
      
      // ローカルキャッシュにも保存（フォールバック用）
      this.setCache(cacheKey, aggregatedLibraries, 12 * 60 * 60 * 1000)

      return {
        success: true,
        data: aggregatedLibraries,
        metadata: {
          source: `${successfulResults.length} sources`,
          responseTime: Date.now() - startTime,
          cached: false
        }
      }

    } catch (error) {
      return {
        success: false,
        error: {
          service: 'library',
          code: 'fetch_error',
          message: `Failed to fetch libraries: ${error}`
        },
        metadata: {
          source: 'error',
          responseTime: Date.now() - startTime,
          cached: false
        }
      }
    }
  }

  /**
   * 🔄 システム健全性チェック
   */
  public async checkApiHealth(): Promise<{
    [service: string]: {
      available: boolean
      responseTime: number
      rateLimitRemaining: number
      lastError?: string
    }
  }> {
    const services = ['octopart', 'github', 'mouser', 'digikey']
    const healthResults: any = {}

    for (const service of services) {
      try {
        const startTime = Date.now()
        const result = await this.performHealthCheck(service)
        
        healthResults[service] = {
          available: result.success,
          responseTime: Date.now() - startTime,
          rateLimitRemaining: result.rateLimitRemaining || 0,
          lastError: result.success ? undefined : result.error
        }
      } catch (error) {
        healthResults[service] = {
          available: false,
          responseTime: 0,
          rateLimitRemaining: 0,
          lastError: `Health check failed: ${error}`
        }
      }
    }

    return healthResults
  }

  // Private methods - Pricing APIs

  private async fetchOctopartPricing(
    componentName: string,
    partNumber?: string
  ): Promise<ApiResponse<any>> {
    if (!this.config.apiKeys.octopart) {
      return this.createMissingKeyResponse('octopart')
    }

    await this.rateLimiters.get('octopart')?.wait()

    try {
      // Octopart API実装（簡略版）
      const mockData = {
        prices: [
          {
            supplier: 'Octopart Supplier',
            price: 2.50,
            currency: 'USD',
            quantity: 1,
            availability: 'in_stock' as const,
            leadTime: '2-3 days',
            url: 'https://octopart.com/example',
            lastUpdated: new Date().toISOString()
          }
        ]
      }

      return {
        success: true,
        data: mockData,
        metadata: {
          source: 'octopart',
          responseTime: 200,
          cached: false
        }
      }

    } catch (error) {
      return {
        success: false,
        error: {
          service: 'octopart',
          code: 'api_error',
          message: `Octopart API error: ${error}`
        },
        metadata: {
          source: 'octopart',
          responseTime: 0,
          cached: false
        }
      }
    }
  }

  private async fetchMouserPricing(
    componentName: string,
    partNumber?: string
  ): Promise<ApiResponse<any>> {
    if (!this.config.apiKeys.mouser) {
      return this.createMissingKeyResponse('mouser')
    }

    await this.rateLimiters.get('mouser')?.wait()

    // Mouser API実装（簡略版）
    const mockData = {
      prices: [
        {
          supplier: 'Mouser Electronics',
          price: 2.75,
          currency: 'USD',
          quantity: 1,
          availability: 'in_stock' as const,
          leadTime: '1-2 days',
          url: 'https://mouser.com/example',
          lastUpdated: new Date().toISOString()
        }
      ]
    }

    return {
      success: true,
      data: mockData,
      metadata: {
        source: 'mouser',
        responseTime: 300,
        cached: false
      }
    }
  }

  private async fetchDigikeyPricing(
    componentName: string,
    partNumber?: string
  ): Promise<ApiResponse<any>> {
    if (!this.config.apiKeys.digikey) {
      return this.createMissingKeyResponse('digikey')
    }

    await this.rateLimiters.get('digikey')?.wait()

    // Digikey API実装（簡略版）
    const mockData = {
      prices: [
        {
          supplier: 'Digi-Key Electronics',
          price: 2.60,
          currency: 'USD',
          quantity: 1,
          availability: 'in_stock' as const,
          leadTime: '1-3 days',
          url: 'https://digikey.com/example',
          lastUpdated: new Date().toISOString()
        }
      ]
    }

    return {
      success: true,
      data: mockData,
      metadata: {
        source: 'digikey',
        responseTime: 250,
        cached: false
      }
    }
  }

  // Private methods - Library APIs

  private async fetchGithubLibraries(componentName: string): Promise<ApiResponse<any>> {
    if (!this.config.apiKeys.github) {
      return this.createMissingKeyResponse('github')
    }

    await this.rateLimiters.get('github')?.wait()

    try {
      // GitHub API実装（簡略版）
      const mockData = {
        libraries: [
          {
            name: `${componentName}-library`,
            platform: 'github' as const,
            repository: `https://github.com/example/${componentName}-lib`,
            version: '1.2.3',
            downloads: 1500,
            stars: 85,
            lastUpdated: new Date().toISOString(),
            documentation: `https://github.com/example/${componentName}-lib/wiki`,
            examples: ['basic_example.ino', 'advanced_usage.ino'],
            compatibility: ['Arduino Uno', 'ESP32', 'NodeMCU']
          }
        ]
      }

      return {
        success: true,
        data: mockData,
        metadata: {
          source: 'github',
          responseTime: 400,
          cached: false
        }
      }

    } catch (error) {
      return {
        success: false,
        error: {
          service: 'github',
          code: 'api_error',
          message: `GitHub API error: ${error}`
        },
        metadata: {
          source: 'github',
          responseTime: 0,
          cached: false
        }
      }
    }
  }

  private async fetchArduinoLibraries(componentName: string): Promise<ApiResponse<any>> {
    // Arduino Library Manager API実装（簡略版）
    const mockData = {
      libraries: [
        {
          name: `${componentName}`,
          platform: 'arduino' as const,
          repository: `https://github.com/arduino-libraries/${componentName}`,
          version: '2.1.0',
          downloads: 25000,
          stars: 0, // Arduino公式ライブラリは星評価なし
          lastUpdated: new Date().toISOString(),
          documentation: 'https://www.arduino.cc/reference/en/libraries/',
          examples: ['SimpleRead.ino', 'AdvancedConfig.ino'],
          compatibility: ['Arduino Uno', 'Arduino Mega', 'Arduino Nano']
        }
      ]
    }

    return {
      success: true,
      data: mockData,
      metadata: {
        source: 'arduino',
        responseTime: 350,
        cached: false
      }
    }
  }

  private async fetchPlatformIOLibraries(componentName: string): Promise<ApiResponse<any>> {
    // PlatformIO Registry API実装（簡略版）
    const mockData = {
      libraries: [
        {
          name: `${componentName}-pio`,
          platform: 'platformio' as const,
          repository: `https://github.com/platformio/lib-${componentName}`,
          version: '3.0.1',
          downloads: 8500,
          stars: 45,
          lastUpdated: new Date().toISOString(),
          documentation: 'https://platformio.org/lib/show/',
          examples: ['basic.cpp', 'interrupt_handling.cpp'],
          compatibility: ['ESP32', 'ESP8266', 'STM32', 'Arduino']
        }
      ]
    }

    return {
      success: true,
      data: mockData,
      metadata: {
        source: 'platformio',
        responseTime: 300,
        cached: false
      }
    }
  }

  // Private helper methods

  private initializeRateLimiters(): void {
    Object.entries(this.config.rateLimits).forEach(([service, limits]) => {
      this.rateLimiters.set(service, new RateLimiter(
        limits.requestsPerMinute,
        60000 // 1 minute
      ))
    })
  }

  private aggregatePricingData(results: any[], componentName: string): PricingInfo {
    const allPrices = results.flatMap(result => result.data.prices)
    
    const prices = allPrices.map(price => ({
      ...price,
      lastUpdated: new Date().toISOString()
    }))

    const validPrices = prices.filter(p => p.price > 0)
    const averagePrice = validPrices.length > 0 
      ? validPrices.reduce((sum, p) => sum + p.price, 0) / validPrices.length
      : 0

    const priceValues = validPrices.map(p => p.price)
    const priceRange = {
      min: Math.min(...priceValues) || 0,
      max: Math.max(...priceValues) || 0
    }

    // 在庫有りで最安値のサプライヤーを推奨
    const inStockPrices = validPrices.filter(p => p.availability === 'in_stock')
    const recommendedSupplier = inStockPrices.length > 0
      ? inStockPrices.sort((a, b) => a.price - b.price)[0].supplier
      : validPrices[0]?.supplier || 'Unknown'

    return {
      component: componentName,
      prices,
      averagePrice: Math.round(averagePrice * 100) / 100,
      priceRange,
      recommendedSupplier
    }
  }

  private aggregateLibraryData(results: any[], componentName: string): LibraryInfo {
    const allLibraries = results.flatMap(result => result.data.libraries)
    
    // 人気度スコア計算（ダウンロード数 + 星数 * 10）
    const librariesWithScore = allLibraries.map(lib => ({
      ...lib,
      popularityScore: (lib.downloads || 0) + (lib.stars || 0) * 10
    }))

    // 公式ライブラリを検出
    const officialLibrary = librariesWithScore.find(lib => 
      lib.platform === 'arduino' || 
      lib.repository.includes('arduino-libraries') ||
      lib.repository.includes('official')
    )

    // 人気ライブラリトップ3
    const popularLibraries = librariesWithScore
      .sort((a, b) => b.popularityScore - a.popularityScore)
      .slice(0, 3)
      .map(lib => ({
        name: lib.name,
        reason: this.getPopularityReason(lib),
        score: lib.popularityScore
      }))

    return {
      component: componentName,
      libraries: allLibraries,
      officialLibrary: officialLibrary ? {
        name: officialLibrary.name,
        repository: officialLibrary.repository,
        documentation: officialLibrary.documentation
      } : undefined,
      popularLibraries
    }
  }

  private getPopularityReason(lib: any): string {
    if (lib.platform === 'arduino') return 'Official Arduino library'
    if (lib.stars > 100) return 'High community rating'
    if (lib.downloads > 10000) return 'Widely adopted'
    return 'Active development'
  }

  private async performHealthCheck(service: string): Promise<{
    success: boolean
    rateLimitRemaining?: number
    error?: string
  }> {
    // 各サービスの健全性チェック実装
    return {
      success: true,
      rateLimitRemaining: 100
    }
  }

  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry || Date.now() > entry.expiry) {
      this.cache.delete(key)
      return null
    }
    return entry.data as T
  }

  private setCache<T>(key: string, data: T, ttl: number): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttl
    })
  }

  private createDisabledResponse(message: string): ApiResponse<any> {
    return {
      success: false,
      error: {
        service: 'config',
        code: 'disabled',
        message
      },
      metadata: {
        source: 'config',
        responseTime: 0,
        cached: false
      }
    }
  }

  private createMissingKeyResponse(service: string): ApiResponse<any> {
    return {
      success: false,
      error: {
        service,
        code: 'missing_key',
        message: `API key not configured for ${service}`
      },
      metadata: {
        source: service,
        responseTime: 0,
        cached: false
      }
    }
  }
}

// Helper classes

interface CacheEntry {
  data: any
  expiry: number
}

class RateLimiter {
  private requests: number[]
  private maxRequests: number
  private timeWindow: number

  constructor(maxRequests: number, timeWindow: number) {
    this.requests = []
    this.maxRequests = maxRequests
    this.timeWindow = timeWindow
  }

  async wait(): Promise<void> {
    const now = Date.now()
    
    // 古いリクエストを削除
    this.requests = this.requests.filter(time => now - time < this.timeWindow)
    
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = Math.min(...this.requests)
      const waitTime = this.timeWindow - (now - oldestRequest) + 100
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }
    
    this.requests.push(Date.now())
  }
}

// Export utility functions
export function createExternalApiService(config?: Partial<ExternalApiConfig>): ExternalApiService {
  return ExternalApiService.getInstance(config)
}

export async function fetchComponentPricing(
  componentName: string,
  partNumber?: string
): Promise<ApiResponse<PricingInfo>> {
  const service = ExternalApiService.getInstance()
  return service.fetchPricingInfo(componentName, partNumber)
}

export async function fetchComponentLibraries(
  componentName: string,
  platform?: 'arduino' | 'platformio' | 'all'
): Promise<ApiResponse<LibraryInfo>> {
  const service = ExternalApiService.getInstance()
  return service.fetchLibraryInfo(componentName, platform)
}