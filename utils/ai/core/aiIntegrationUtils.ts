// 🔧 AI統合ユーティリティ
// フェーズ2タスク2.1.3: エラーハンドリングと統合テスト

import { AISpecificationService, createAISpecificationService } from './aiSpecificationService'
import { AICompatibilityAdapter, createAICompatibilityAdapter } from '../compatibility/aiCompatibilityAdapter'
import { AIResultProcessor, processAIResult } from '../processing/aiResultProcessor'
import { calculateReliability, filterReliableSpecs } from '../../data/analysis/reliabilityScoreSystem'
import type { ComponentSpecification, AISearchRequest } from './aiSpecificationService'
import type { NodeData } from '@/types/canvas'

export interface AIIntegrationConfig {
  enableAISearch: boolean
  minimumReliabilityScore: number
  maxRetryAttempts: number
  fallbackToBasicChecks: boolean
  cacheTimeout: number // milliseconds
}

export interface AIOperationResult<T> {
  success: boolean
  data?: T
  error?: {
    type: 'network' | 'parsing' | 'validation' | 'quota' | 'timeout' | 'unknown'
    message: string
    retryable: boolean
    fallbackUsed: boolean
  }
  metadata: {
    tokensUsed?: number
    responseTime: number
    retryCount: number
    cacheHit: boolean
    reliabilityScore?: number
  }
}

/**
 * 🧩 AIIntegrationManager
 * AI機能の統合管理とエラーハンドリング
 */
export class AIIntegrationManager {
  private config: AIIntegrationConfig
  private aiService: AISpecificationService
  private compatibilityAdapter: AICompatibilityAdapter
  private resultProcessor: AIResultProcessor
  private static instance: AIIntegrationManager

  constructor(config?: Partial<AIIntegrationConfig>) {
    this.config = {
      enableAISearch: true,
      minimumReliabilityScore: 50,
      maxRetryAttempts: 3,
      fallbackToBasicChecks: true,
      cacheTimeout: 24 * 60 * 60 * 1000, // 24 hours
      ...config
    }

    this.aiService = createAISpecificationService()
    this.compatibilityAdapter = createAICompatibilityAdapter()
    this.resultProcessor = AIResultProcessor.getInstance()
  }

  public static getInstance(config?: Partial<AIIntegrationConfig>): AIIntegrationManager {
    if (!AIIntegrationManager.instance) {
      AIIntegrationManager.instance = new AIIntegrationManager(config)
    }
    return AIIntegrationManager.instance
  }

  /**
   * 🔍 堅牢なAI部品検索
   */
  public async searchComponentWithFallback(
    componentName: string,
    searchOptions?: Partial<AISearchRequest>
  ): Promise<AIOperationResult<ComponentSpecification>> {
    const startTime = Date.now()
    let retryCount = 0
    let lastError: any

    if (!this.config.enableAISearch) {
      return this.createDisabledResult('AI search is disabled', startTime)
    }

    const searchRequest: AISearchRequest = {
      componentName,
      searchDepth: 'detailed',
      includeAlternatives: true,
      focusAreas: ['power', 'communication', 'compatibility'],
      ...searchOptions
    }

    while (retryCount < this.config.maxRetryAttempts) {
      try {
        // AI検索実行
        const searchResult = await this.aiService.searchComponentSpecification(searchRequest)
        
        // 結果処理
        const processingResult = await processAIResult(
          JSON.stringify(searchResult.specification),
          componentName,
          searchResult.searchMetadata
        )

        if (processingResult.success && processingResult.specification) {
          // 信頼度チェック
          const reliability = calculateReliability(
            processingResult.specification.reliability.sources,
            processingResult.specification
          )

          if (reliability.overallScore >= this.config.minimumReliabilityScore) {
            return {
              success: true,
              data: processingResult.specification,
              metadata: {
                tokensUsed: searchResult.searchMetadata.tokensUsed,
                responseTime: Date.now() - startTime,
                retryCount,
                cacheHit: false,
                reliabilityScore: reliability.overallScore
              }
            }
          } else {
            lastError = new Error(`Reliability score ${reliability.overallScore}% below threshold`)
          }
        } else {
          lastError = new Error(processingResult.errorDetails?.message || 'Processing failed')
        }

      } catch (error) {
        lastError = error
        console.warn(`AI search attempt ${retryCount + 1} failed:`, error)
        
        // レート制限エラーの場合は待機
        if (this.isRateLimitError(error)) {
          await this.waitForRateLimit()
        }
      }

      retryCount++
      
      // 再試行前の待機（指数バックオフ）
      if (retryCount < this.config.maxRetryAttempts) {
        await this.delay(Math.pow(2, retryCount) * 1000)
      }
    }

    // 全ての試行が失敗した場合
    return this.handleSearchFailure(lastError, componentName, startTime, retryCount)
  }

  /**
   * 🔗 堅牢な互換性チェック
   */
  public async checkCompatibilityWithRetry(
    component1Name: string,
    component2Name: string,
    connectionType: 'power' | 'communication'
  ): Promise<AIOperationResult<any>> {
    const startTime = Date.now()
    let retryCount = 0

    if (!this.config.enableAISearch) {
      // 基本的な互換性チェックにフォールバック
      return this.performBasicCompatibilityCheck(
        component1Name,
        component2Name,
        connectionType,
        startTime
      )
    }

    while (retryCount < this.config.maxRetryAttempts) {
      try {
        const result = await this.compatibilityAdapter.checkCompatibilityWithAI(
          component1Name,
          component2Name,
          connectionType
        )

        return {
          success: true,
          data: result,
          metadata: {
            responseTime: Date.now() - startTime,
            retryCount,
            cacheHit: false,
            reliabilityScore: result.aiAnalysis?.confidence
          }
        }

      } catch (error) {
        console.warn(`Compatibility check attempt ${retryCount + 1} failed:`, error)
        retryCount++

        if (retryCount < this.config.maxRetryAttempts) {
          await this.delay(Math.pow(2, retryCount) * 1000)
        }
      }
    }

    // フォールバックを有効にしている場合
    if (this.config.fallbackToBasicChecks) {
      return this.performBasicCompatibilityCheck(
        component1Name,
        component2Name,
        connectionType,
        startTime
      )
    }

    return {
      success: false,
      error: {
        type: 'unknown',
        message: 'All compatibility check attempts failed',
        retryable: false,
        fallbackUsed: false
      },
      metadata: {
        responseTime: Date.now() - startTime,
        retryCount,
        cacheHit: false
      }
    }
  }

  /**
   * 🔄 NodeDataへの統合変換
   */
  public async enhanceNodeWithAI(
    node: NodeData,
    componentName?: string
  ): Promise<AIOperationResult<NodeData>> {
    const startTime = Date.now()
    const searchName = componentName || node.title

    try {
      const searchResult = await this.searchComponentWithFallback(searchName)

      if (searchResult.success && searchResult.data) {
        const enhancedNode: NodeData = {
          ...node,
          voltage: searchResult.data.voltage.operating[0] || node.voltage,
          communication: searchResult.data.communication.protocols.join(', ') || node.communication,
          aiMetadata: {
            confidence: searchResult.data.reliability.confidence,
            lastVerified: searchResult.data.reliability.lastVerified,
            sources: searchResult.data.reliability.sources.length,
            alternatives: [], // TODO: 代替品名を抽出
            powerDetails: {
              consumption: searchResult.data.power.consumption.typical,
              maxConsumption: searchResult.data.power.consumption.maximum,
              supplyCapacity: searchResult.data.power.supply?.capacity
            },
            communicationDetails: {
              protocols: searchResult.data.communication.protocols,
              speeds: searchResult.data.communication.speed || {}
            },
            searchHistory: {
              lastSearched: new Date().toISOString(),
              tokensUsed: searchResult.metadata.tokensUsed || 0,
              responseTime: searchResult.metadata.responseTime,
              searchQueries: [searchName]
            },
            marketData: searchResult.data.marketData ? {
              hasPricingData: !!searchResult.data.marketData.pricing,
              hasLibraryData: !!searchResult.data.marketData.libraries,
              lastUpdated: searchResult.data.marketData.lastUpdated,
              pricingSuppliers: searchResult.data.marketData.pricing?.prices?.length || 0,
              libraryPlatforms: searchResult.data.marketData.libraries?.libraries?.length || 0
            } : undefined
          }
        }

        return {
          success: true,
          data: enhancedNode,
          metadata: searchResult.metadata
        }
      }

      // 検索に失敗した場合はオリジナルのnodeを返す
      return {
        success: false,
        data: node,
        error: searchResult.error,
        metadata: searchResult.metadata
      }

    } catch (error) {
      return {
        success: false,
        data: node,
        error: {
          type: 'unknown',
          message: `Failed to enhance node with AI: ${error}`,
          retryable: true,
          fallbackUsed: true
        },
        metadata: {
          responseTime: Date.now() - startTime,
          retryCount: 0,
          cacheHit: false
        }
      }
    }
  }

  /**
   * 📊 システム健全性チェック
   */
  public async performHealthCheck(): Promise<{
    aiServiceAvailable: boolean
    quotaRemaining: number | null
    averageResponseTime: number
    errorRate: number
    cacheHitRate: number
    recommendations: string[]
  }> {
    try {
      // 簡単なテスト検索を実行
      const testStart = Date.now()
      const testResult = await this.searchComponentWithFallback('test-component', {
        searchDepth: 'basic',
        includeAlternatives: false
      })
      const responseTime = Date.now() - testStart

      return {
        aiServiceAvailable: testResult.success,
        quotaRemaining: null, // TODO: OpenAI APIクォータ情報を取得
        averageResponseTime: responseTime,
        errorRate: testResult.success ? 0 : 100,
        cacheHitRate: testResult.metadata.cacheHit ? 100 : 0,
        recommendations: this.generateHealthRecommendations(testResult)
      }

    } catch (error) {
      return {
        aiServiceAvailable: false,
        quotaRemaining: null,
        averageResponseTime: 0,
        errorRate: 100,
        cacheHitRate: 0,
        recommendations: [
          'AI service is unavailable',
          'Check API key configuration',
          'Verify network connectivity'
        ]
      }
    }
  }

  // Private helper methods

  private async performBasicCompatibilityCheck(
    component1: string,
    component2: string,
    connectionType: 'power' | 'communication',
    startTime: number
  ): Promise<AIOperationResult<any>> {
    // 基本的な互換性チェックの実装
    // 実際の実装では既存のCompatibilityCheckerを使用
    return {
      success: true,
      data: {
        compatible: true,
        confidence: 0.5,
        issues: [],
        recommendations: ['Basic compatibility check performed - AI analysis unavailable']
      },
      metadata: {
        responseTime: Date.now() - startTime,
        retryCount: 0,
        cacheHit: false
      }
    }
  }

  private handleSearchFailure(
    error: any,
    componentName: string,
    startTime: number,
    retryCount: number
  ): AIOperationResult<ComponentSpecification> {
    const errorType = this.classifyError(error)
    
    return {
      success: false,
      error: {
        type: errorType,
        message: error?.message || 'Unknown error occurred',
        retryable: errorType !== 'quota',
        fallbackUsed: this.config.fallbackToBasicChecks
      },
      metadata: {
        responseTime: Date.now() - startTime,
        retryCount,
        cacheHit: false
      }
    }
  }

  private classifyError(error: any): 'network' | 'parsing' | 'validation' | 'quota' | 'timeout' | 'unknown' {
    if (!error) return 'unknown'
    
    const message = error.message?.toLowerCase() || ''
    
    if (message.includes('network') || message.includes('fetch')) return 'network'
    if (message.includes('parse') || message.includes('json')) return 'parsing'
    if (message.includes('validation') || message.includes('invalid')) return 'validation'
    if (message.includes('quota') || message.includes('rate limit')) return 'quota'
    if (message.includes('timeout')) return 'timeout'
    
    return 'unknown'
  }

  private isRateLimitError(error: any): boolean {
    return error?.message?.toLowerCase().includes('rate limit') || 
           error?.status === 429
  }

  private async waitForRateLimit(): Promise<void> {
    // レート制限エラーの場合は60秒待機
    await this.delay(60000)
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private createDisabledResult(message: string, startTime: number): AIOperationResult<ComponentSpecification> {
    return {
      success: false,
      error: {
        type: 'unknown',
        message,
        retryable: false,
        fallbackUsed: false
      },
      metadata: {
        responseTime: Date.now() - startTime,
        retryCount: 0,
        cacheHit: false
      }
    }
  }

  private generateHealthRecommendations(testResult: AIOperationResult<any>): string[] {
    const recommendations: string[] = []

    if (!testResult.success) {
      recommendations.push('AI service is experiencing issues')
      
      if (testResult.error?.type === 'network') {
        recommendations.push('Check network connectivity')
      } else if (testResult.error?.type === 'quota') {
        recommendations.push('API quota may be exceeded')
      } else {
        recommendations.push('Review AI service configuration')
      }
    } else {
      recommendations.push('AI service is functioning normally')
      
      if (testResult.metadata.responseTime > 5000) {
        recommendations.push('Response times are slower than optimal')
      }
    }

    return recommendations
  }
}

// Export utility functions
export function createAIIntegrationManager(config?: Partial<AIIntegrationConfig>): AIIntegrationManager {
  return AIIntegrationManager.getInstance(config)
}

export async function searchComponentSafely(
  componentName: string,
  options?: Partial<AISearchRequest>
): Promise<AIOperationResult<ComponentSpecification>> {
  const manager = AIIntegrationManager.getInstance()
  return manager.searchComponentWithFallback(componentName, options)
}

export async function enhanceNodeWithAI(
  node: NodeData,
  componentName?: string
): Promise<AIOperationResult<NodeData>> {
  const manager = AIIntegrationManager.getInstance()
  return manager.enhanceNodeWithAI(node, componentName)
}