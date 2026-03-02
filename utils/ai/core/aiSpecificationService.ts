// 🤖 AI部品仕様検索サービス
// フェーズ2タスク2.1.1: OpenAI API統合とAI部品仕様検索システム

import OpenAI from 'openai'

export interface ComponentSpecification {
  name: string
  category: string
  voltage: {
    operating: string[]
    logic: string
    supply: string
    input?: string // Optional Vin range for microcontrollers
  }
  power: {
    consumption: {
      typical: number // mA
      maximum: number // mA
    }
    supply: {
      capacity?: number // mA (for power suppliers)
      efficiency?: number // percentage
    }
  }
  communication: {
    protocols: string[]
    pins: {
      [protocol: string]: string[] | any[] // Allow array of objects for digital pins
    }
    speed?: {
      [protocol: string]: string
    }
    connectors?: {
      type: string // USB-A, USB-B, USB-C, HDMI, etc.
      count: number
      version?: string // 2.0, 3.0, etc.
      purpose?: string // Programming, Power, Display, etc.
      specs?: string // Additional specifications
    }[]
  }
  physical: {
    pins: number
    package: string
    dimensions?: string
  }
  compatibility: {
    microcontrollers: string[]
    operatingTemp: string
    libraries: string[]
  }
  reliability: {
    confidence: number // 0-100
    sources: SpecificationSource[]
    lastVerified: string
  }
  marketData?: {
    pricing?: any // PricingInfo from externalApiService
    libraries?: any // LibraryInfo from externalApiService
    lastUpdated: string
  }
}

export interface SpecificationSource {
  type: 'official' | 'github' | 'forum' | 'datasheet' | 'community'
  url: string
  title: string
  reliability: number // 0-100
  lastAccessed: string
}

export interface AISearchRequest {
  componentName: string
  searchDepth: 'basic' | 'detailed' | 'comprehensive'
  includeAlternatives: boolean
  focusAreas?: ('power' | 'communication' | 'compatibility' | 'pinout')[]
}

export interface AISearchResult {
  specification: ComponentSpecification
  alternatives: ComponentSpecification[]
  searchMetadata: {
    tokensUsed: number
    responseTime: number
    searchQueries: string[]
    confidenceScore: number
    externalDataSources?: {
      pricing: boolean
      libraries: boolean
    }
  }
}

/**
 * 🧠 AISpecificationService
 * OpenAI GPT-4を使用してリアルタイムで部品仕様を検索・抽出
 */
export class AISpecificationService {
  private openai: OpenAI
  private rateLimiter: RateLimiter
  private cache: Map<string, AISearchResult>
  private static instance: AISpecificationService

  constructor() {
    console.log('🔧 AISpecificationService constructor called', {
      isServer: typeof window === 'undefined',
      hasApiKey: !!process.env.OPENAI_API_KEY,
      apiKeyLength: process.env.OPENAI_API_KEY?.length || 0
    })
    
    // OpenAI APIはサーバーサイドでのみ初期化
    if (typeof window === 'undefined' && process.env.OPENAI_API_KEY) {
      console.log('✅ Initializing OpenAI client')
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        // Node.js環境でのAPI呼び出し設定
        dangerouslyAllowBrowser: false
      })
    } else {
      console.log('❌ NOT initializing OpenAI client')
      // クライアントサイドでは初期化しない
      this.openai = null as any
    }

    this.rateLimiter = new RateLimiter(100, 60000) // 100 requests per minute
    this.cache = new Map()
  }

  public static getInstance(): AISpecificationService {
    if (!AISpecificationService.instance) {
      AISpecificationService.instance = new AISpecificationService()
    }
    return AISpecificationService.instance
  }

  /**
   * 🔍 AI部品仕様検索のメインメソッド
   */
  public async searchComponentSpecification(
    request: AISearchRequest
  ): Promise<AISearchResult> {
    console.log('🔍 searchComponentSpecification called', {
      isServer: typeof window === 'undefined',
      hasOpenAI: !!this.openai,
      componentName: request.componentName
    })
    
    // クライアントサイドでは API 呼び出しをエラーにする
    if (typeof window !== 'undefined' || !this.openai) {
      console.log('❌ Throwing error - no OpenAI client available')
      throw new AISpecificationError('AI search is only available on the server side. Please use the API endpoint.')
    }
    
    const startTime = Date.now()
    
    // Redisキャッシュ確認（エラーハンドリング付き）
    try {
      const { getAISearchResult } = require('../../data/cache/redisCacheService')
      const cachedResult = await getAISearchResult(request.componentName, request.searchDepth)
      
      if (cachedResult) {
        console.log(`Cache hit for ${request.componentName}`)
        return {
          ...cachedResult,
          searchMetadata: {
            ...cachedResult.searchMetadata,
            responseTime: Date.now() - startTime
          }
        }
      }
    } catch (cacheError) {
      console.warn('Redis cache error (continuing without cache):', cacheError)
    }
    
    // ローカルキャッシュ確認（フォールバック）
    const cacheKey = this.generateCacheKey(request)
    const cached = this.cache.get(cacheKey)
    if (cached && this.isCacheValid(cached)) {
      return cached
    }

    // レート制限チェック
    await this.rateLimiter.checkLimit()

    try {
      const searchPrompt = this.buildSearchPrompt(request)
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-5-mini', // Using mini model
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt()
          },
          {
            role: 'user',
            content: searchPrompt
          }
        ],
        //temperature: 0.1, // 正確性重視
        max_completion_tokens: 5000,//最大トークンが低いと仕様検索ができずフォールバックデータしか返答されないため、5000に設定
        response_format: { type: 'json_object' }
      })
      
      console.log('🤖 OpenAI Response:', {
        hasContent: !!completion.choices[0]?.message?.content,
        contentLength: completion.choices[0]?.message?.content?.length || 0,
        usage: completion.usage
      })
      
      // Log first 500 chars of response for debugging
      const responseContent = completion.choices[0]?.message?.content || ''
      console.log('🤖 Response preview:', responseContent.substring(0, 500) + '...')

      // 新しい結果処理システムを使用
      const { processAIResult } = require('../processing/aiResultProcessor')
      const processingResult = await processAIResult(
        completion.choices[0].message.content!,
        request.componentName,
        {
          tokensUsed: completion.usage?.total_tokens || 0,
          responseTime: Date.now() - startTime
        }
      )
      
      console.log('📊 Processing result:', {
        success: processingResult.success,
        hasSpec: !!processingResult.specification,
        confidence: processingResult.processingMetadata?.confidenceScore,
        errors: processingResult.processingMetadata?.validationErrors,
        errorType: processingResult.errorDetails?.type,
        errorMessage: processingResult.errorDetails?.message
      })

      if (!processingResult.success) {
        throw new AISpecificationError(
          processingResult.errorDetails?.message || 'Failed to process AI response'
        )
      }

      // 外部API情報を統合
      const { fetchComponentPricing, fetchComponentLibraries } = require('../../external/externalApiService')
      
      // 価格情報とライブラリ情報を並行取得
      const [pricingResult, libraryResult] = await Promise.allSettled([
        fetchComponentPricing(request.componentName),
        fetchComponentLibraries(request.componentName)
      ])

      // Enhanced specification with external data
      const enhancedSpecification = {
        ...processingResult.specification!,
        marketData: {
          pricing: pricingResult.status === 'fulfilled' && pricingResult.value.success 
            ? pricingResult.value.data 
            : undefined,
          libraries: libraryResult.status === 'fulfilled' && libraryResult.value.success 
            ? libraryResult.value.data 
            : undefined,
          lastUpdated: new Date().toISOString()
        }
      }

      const result: AISearchResult = {
        specification: enhancedSpecification,
        alternatives: processingResult.alternatives,
        searchMetadata: {
          tokensUsed: completion.usage?.total_tokens || 0,
          responseTime: Date.now() - startTime,
          searchQueries: [request.componentName],
          confidenceScore: processingResult.processingMetadata.confidenceScore,
          externalDataSources: {
            pricing: pricingResult.status === 'fulfilled' && pricingResult.value.success,
            libraries: libraryResult.status === 'fulfilled' && libraryResult.value.success
          }
        }
      }

      // Redisキャッシュに保存（エラーハンドリング付き）
      try {
        const { cacheAISearchResult } = require('../../data/cache/redisCacheService')
        await cacheAISearchResult(request.componentName, request.searchDepth, result)
      } catch (cacheError) {
        console.warn('Failed to save to Redis cache:', cacheError)
      }
      
      // ローカルキャッシュにも保存（フォールバック用）
      this.cache.set(cacheKey, result)
      
      // 部品仕様のキャッシュも保存（7日間）
      try {
        const { setCachedSpecification } = require('../../data/cache/redisCacheService')
        await setCachedSpecification(request.componentName, enhancedSpecification)
      } catch (cacheError) {
        console.warn('Failed to save specification to Redis cache:', cacheError)
      }
      
      return result

    } catch (error) {
      console.error('AI specification search failed:', error)
      
      // OpenAI APIエラーの場合、フォールバック仕様を返す
      if (error instanceof Error && 
          (error.message.includes('401') || 
           error.message.includes('apiKey') || 
           error.message.includes('Invalid') ||
           error.message.includes('Incorrect API key'))) {
        console.warn('OpenAI API key issue detected, returning fallback specification')
        return this.getFallbackSpecification(request.componentName)
      }
      
      // その他のエラーもフォールバックで対応
      console.warn('Returning fallback specification due to error')
      return this.getFallbackSpecification(request.componentName)
    }
  }

  /**
   * 🔧 フォールバック仕様の生成
   */
  private getFallbackSpecification(componentName: string): AISearchResult {
    const fallbackSpec: ComponentSpecification = {
      name: componentName,
      category: 'Unknown',
      voltage: {
        operating: ['3.3V-5V'],
        logic: '3.3V',
        supply: '5V'
      },
      power: {
        consumption: {
          typical: 50,
          maximum: 100
        }
      },
      communication: {
        protocols: ['GPIO'],
        pins: {
          'GPIO': ['Pin1', 'Pin2']
        }
      },
      physical: {
        pins: 4,
        package: 'Generic'
      },
      compatibility: {
        microcontrollers: ['Arduino', 'Raspberry Pi', 'ESP32'],
        operatingTemp: '-40°C to 85°C',
        libraries: []
      },
      reliability: {
        confidence: 30,
        sources: [{
          type: 'fallback',
          name: 'Default Specification',
          reliability: 30,
          lastUpdated: new Date().toISOString()
        }],
        lastVerified: new Date().toISOString()
      }
    }
    
    return {
      specification: fallbackSpec,
      alternatives: [],
      searchMetadata: {
        tokensUsed: 0,
        responseTime: 0,
        searchQueries: [componentName],
        confidenceScore: 30,
        externalDataSources: {
          pricing: false,
          libraries: false
        }
      }
    }
  }

  /**
   * 🎯 部品間互換性の動的チェック
   */
  public async checkDynamicCompatibility(
    component1: string,
    component2: string,
    connectionType: 'power' | 'communication'
  ): Promise<{
    compatible: boolean
    issues: string[]
    recommendations: string[]
    confidence: number
  }> {
    const prompt = this.buildCompatibilityPrompt(component1, component2, connectionType)
    
    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-5-mini', // Using mini model
        messages: [
          {
            role: 'system',
            content: this.getCompatibilitySystemPrompt()
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        //temperature: 0.1,
        max_completion_tokens: 1000,
        response_format: { type: 'json_object' }
      })

      return JSON.parse(completion.choices[0].message.content!)
      
    } catch (error) {
      console.error('Dynamic compatibility check failed:', error)
      return {
        compatible: false,
        issues: ['AI analysis failed - manual verification required'],
        recommendations: ['Check component datasheets manually'],
        confidence: 0
      }
    }
  }

  /**
   * 📊 信頼度スコア算出（高精度版）
   */
  private calculateConfidenceScore(sources: SpecificationSource[]): number {
    // 新しい信頼度スコアシステムを使用
    const { calculateReliability } = require('../../data/analysis/reliabilityScoreSystem')
    const metrics = calculateReliability(sources)
    return metrics.overallScore
  }

  /**
   * 🏗️ 検索プロンプト構築
   */
  private buildSearchPrompt(request: AISearchRequest): string {
    const { componentName, searchDepth, includeAlternatives, focusAreas } = request

    let prompt = `Search for detailed specifications of the electronic component: "${componentName}"\n\n`

    prompt += `Search Requirements:\n`
    prompt += `- Depth: ${searchDepth}\n`
    prompt += `- Include alternatives: ${includeAlternatives}\n`

    if (focusAreas && focusAreas.length > 0) {
      prompt += `- Focus on: ${focusAreas.join(', ')}\n`
    }

    prompt += `\nRequired Information:\n`
    prompt += `1. Operating voltage range and logic levels\n`
    prompt += `2. Power consumption (typical and maximum in mA)\n`
    prompt += `3. Communication protocols and pin configurations\n`
    prompt += `4. Physical specifications (pin count, package type)\n`
    prompt += `5. Compatibility with common microcontrollers\n`
    prompt += `6. Source reliability and verification status\n`
    prompt += `7. Physical connectors (USB types, SD card slots, etc.) - REQUIRED\n\n`

    if (includeAlternatives) {
      prompt += `Also provide 2-3 alternative components with similar functionality.\n\n`
    }

    prompt += `Return the response as a structured JSON object matching the ComponentSpecification interface.`

    return prompt
  }

  /**
   * 🤖 システムプロンプト
   */
  private getSystemPrompt(): string {
    // Web検索要求は一時的にコメントアウト - GPT-5-miniの検索機能対応後に復活予定
    // const webSearchInstructions = `
    // CRITICAL INSTRUCTIONS FOR SEARCH:
    // 1. Search the web for the latest datasheet PDFs and product pages
    // 2. Return ONLY real, valid URLs that actually exist on the internet
    // 3. Include the actual datasheet PDF URL if found (e.g., https://www.espressif.com/.../esp32_datasheet_en.pdf)
    // 4. Include purchase links from major suppliers (DigiKey, Mouser, etc.)
    // 5. DO NOT create or guess URLs - only return URLs you found through search
    // `;

    return `You are an expert electronics engineer. Your task is to provide accurate specifications for electronic components based on your knowledge base.

KNOWLEDGE BASE INSTRUCTIONS:
1. Use your training data to provide accurate component specifications
2. Focus on commonly known specifications for standard components
3. Provide typical values when exact specifications vary by manufacturer
4. Leave URL fields empty ("") since web search is temporarily disabled
5. Set reliability confidence to 65% for knowledge base data

Key Guidelines:
1. Prioritize official datasheets and manufacturer documentation
2. Cross-reference multiple sources to ensure accuracy
3. Provide specific numerical values with units (mA, V, MHz, etc.)
4. Include pin configurations and protocol details
5. Rate source reliability (0-100) based on knowledge base accuracy
6. Calculate overall confidence score (60%+ for knowledge base, 70%+ with web search)
7. Focus on practical compatibility information for system design

CRITICAL for Microcontrollers:
- For Arduino boards: operating voltages are ALWAYS 5V and 3.3V (NEVER 7V or 12V)
- Include Vin (voltage input) range separately if applicable (e.g., "7-12V" for Arduino Uno)
- List ALL pin types: analog inputs, digital I/O, PWM-capable pins
- Include pin numbers and special functions

PHYSICAL CONNECTORS (REQUIRED - Must include "connectors" array):
- ALWAYS include a "connectors" array in the communication object
- For microcontrollers, ALWAYS include the programming USB connector
- Common microcontroller connectors:
  * Teensy 4.0/4.1: Micro-USB for programming, MicroSD slot (4.1 only)
  * Arduino Uno/Mega: USB-B for programming
  * Arduino Nano/Micro: Micro-USB or Mini-USB
  * ESP32/ESP8266: Micro-USB for programming
- Include storage connectors if present (SD, MicroSD slots)
- Include all other physical connectors: HDMI, DisplayPort, Ethernet, Audio jacks, etc.
- Specify connector types precisely with version info (USB 2.0/3.0, etc.)
- If no physical connectors exist, return empty array: "connectors": []

Data Quality Standards:
- Official sources (datasheets, manufacturer sites): 90-100% reliability
- GitHub repositories with good documentation: 70-85% reliability
- Community forums and discussions: 30-60% reliability
- Unverified or contradictory information: <30% reliability

Response Format: Return a JSON object with this exact structure:
{
  "specification": {
    "name": "Component Name",
    "category": "microcontroller|sensor|actuator|power|communication|display|Unknown",
    "datasheetUrl": "",  // Leave empty for now (web search disabled)
    "purchaseUrls": [],  // Leave empty array for now (web search disabled)
    "voltage": {
      "operating": ["5V", "3.3V"],
      "logic": "5V",
      "supply": "5V",
      "input": "7-12V"  // Optional: for Vin pin on microcontrollers
    },
    "power": {
      "consumption": {
        "typical": 50,
        "maximum": 500
      }
    },
    "communication": {
      "protocols": ["I2C", "SPI", "UART", "Digital", "Analog", "USB", "HDMI", "Ethernet"],
      "pins": {
        "I2C": ["SDA (A4)", "SCL (A5)"],
        "SPI": ["MISO (12)", "MOSI (11)", "SCK (13)", "SS (10)"],
        "UART": ["RX (0)", "TX (1)"],
        "analog": ["A0", "A1", "A2", "A3", "A4", "A5"],  // For microcontrollers
        "digital": [  // For microcontrollers with PWM info
          {"pin": "D0", "pwm": false},
          {"pin": "D1", "pwm": false},
          {"pin": "D2", "pwm": false},
          {"pin": "D3", "pwm": true},
          {"pin": "D4", "pwm": false},
          {"pin": "D5", "pwm": true},
          {"pin": "D6", "pwm": true},
          {"pin": "D7", "pwm": false},
          {"pin": "D8", "pwm": false},
          {"pin": "D9", "pwm": true},
          {"pin": "D10", "pwm": true},
          {"pin": "D11", "pwm": true},
          {"pin": "D12", "pwm": false},
          {"pin": "D13", "pwm": false}
        ]
      },
      "connectors": [  // Physical connectors
        {
          "type": "USB-B",  // USB-A, USB-B, USB-C, Micro-USB, Mini-USB
          "count": 1,
          "version": "2.0",  // 1.1, 2.0, 3.0, 3.1, 3.2, 4.0
          "purpose": "Programming/Power"
        },
        {
          "type": "DC Jack",
          "count": 1,
          "specs": "2.1mm, 7-12V"
        }
      ]
    },
    "physical": {
      "pins": 28,
      "package": "DIP-28"
    },
    "compatibility": {
      "microcontrollers": ["Arduino", "ESP32"],
      "operatingTemp": "-40°C to 85°C",
      "libraries": ["Wire.h", "SPI.h"]
    },
    "reliability": {
      "confidence": 85,
      "sources": [
        {
          "type": "official",
          "url": "https://...",
          "title": "Official Datasheet",
          "reliability": 95,
          "lastAccessed": "2024-01-01T00:00:00Z"
        }
      ],
      "lastVerified": "2024-01-01T00:00:00Z"
    }
  },
  "alternatives": []
}

Example for Teensy 4.1:
The connectors array MUST include:
"connectors": [
  {
    "type": "Micro-USB",
    "count": 1,
    "version": "2.0",
    "purpose": "Programming/Serial"
  },
  {
    "type": "MicroSD",
    "count": 1,
    "purpose": "Storage"
  }
]`
  }

  /**
   * 🔗 互換性チェック用システムプロンプト
   */
  private getCompatibilitySystemPrompt(): string {
    return `You are an expert in electronic component compatibility analysis. Analyze the compatibility between two components for a specific connection type.

Focus Areas:
1. Voltage level compatibility (3.3V, 5V, logic levels)
2. Current capacity vs requirements
3. Protocol compatibility (I2C, SPI, UART speeds and features)
4. Pin configuration matching
5. Timing requirements and constraints

Provide specific technical reasons for compatibility issues and actionable recommendations for resolution.`
  }

  /**
   * 🏗️ 互換性チェックプロンプト
   */
  private buildCompatibilityPrompt(
    component1: string,
    component2: string,
    connectionType: 'power' | 'communication'
  ): string {
    return `Analyze ${connectionType} compatibility between:
Component 1: ${component1}
Component 2: ${component2}

Connection Type: ${connectionType}

Provide analysis in this JSON format:
{
  "compatible": boolean,
  "issues": ["list of specific technical issues"],
  "recommendations": ["specific solutions and workarounds"],
  "confidence": number (0-100)
}`
  }

  /**
   * 🧹 AI応答の解析とパース
   */
  private parseAIResponse(
    content: string,
    request: AISearchRequest,
    startTime: number,
    tokensUsed: number
  ): AISearchResult {
    try {
      const parsed = JSON.parse(content)
      const responseTime = Date.now() - startTime

      // 基本検証
      if (!parsed.name || !parsed.voltage || !parsed.power) {
        throw new Error('Invalid response structure')
      }

      // 信頼度スコア計算
      const confidenceScore = this.calculateConfidenceScore(parsed.reliability?.sources || [])

      return {
        specification: {
          ...parsed,
          reliability: {
            ...parsed.reliability,
            confidence: confidenceScore
          }
        },
        alternatives: parsed.alternatives || [],
        searchMetadata: {
          tokensUsed,
          responseTime,
          searchQueries: [request.componentName],
          confidenceScore
        }
      }

    } catch (error) {
      throw new Error(`Failed to parse AI response: ${error}`)
    }
  }

  /**
   * 🔑 キャッシュキー生成
   */
  private generateCacheKey(request: AISearchRequest): string {
    return `${request.componentName}_${request.searchDepth}_${request.includeAlternatives}_${(request.focusAreas || []).join('_')}`
  }

  /**
   * ⏰ キャッシュ有効性チェック
   */
  private isCacheValid(result: AISearchResult): boolean {
    const maxAge = 24 * 60 * 60 * 1000 // 24 hours
    const lastVerified = new Date(result.specification.reliability.lastVerified)
    return Date.now() - lastVerified.getTime() < maxAge
  }
}

/**
 * ⚡ レート制限管理
 */
class RateLimiter {
  private requests: number[]
  private maxRequests: number
  private timeWindow: number

  constructor(maxRequests: number, timeWindow: number) {
    this.requests = []
    this.maxRequests = maxRequests
    this.timeWindow = timeWindow
  }

  async checkLimit(): Promise<void> {
    const now = Date.now()
    
    // 古いリクエストを削除
    this.requests = this.requests.filter(time => now - time < this.timeWindow)
    
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = Math.min(...this.requests)
      const waitTime = this.timeWindow - (now - oldestRequest)
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }
    
    this.requests.push(now)
  }
}

/**
 * 🚨 AI仕様検索エラー
 */
export class AISpecificationError extends Error {
  public readonly originalError?: Error

  constructor(message: string, originalError?: Error) {
    super(message)
    this.name = 'AISpecificationError'
    this.originalError = originalError
  }
}

// ファクトリー関数とユーティリティ
export function createAISpecificationService(): AISpecificationService {
  return AISpecificationService.getInstance()
}

export async function searchComponent(componentName: string): Promise<AISearchResult> {
  const service = AISpecificationService.getInstance()
  return service.searchComponentSpecification({
    componentName,
    searchDepth: 'detailed',
    includeAlternatives: false,  // 代替品検索を無効化
    focusAreas: ['power', 'communication', 'compatibility']
  })
}

export async function checkCompatibility(
  component1: string,
  component2: string,
  connectionType: 'power' | 'communication'
): Promise<{
  compatible: boolean
  issues: string[]
  recommendations: string[]
  confidence: number
}> {
  const service = AISpecificationService.getInstance()
  return service.checkDynamicCompatibility(component1, component2, connectionType)
}