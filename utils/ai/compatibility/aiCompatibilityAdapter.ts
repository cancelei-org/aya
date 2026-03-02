// 🔗 AI仕様検索と既存互換性チェッカーの統合アダプター
// フェーズ2タスク2.1.3: AI検索結果の構造化データ変換と統合

import type { ComponentSpecification, AISearchResult } from '../core/aiSpecificationService'
import type { CompatibilityResult, CompatibilityIssue } from '../../connections/validation/unifiedCompatibilityChecker'
import { UnifiedCompatibilityChecker } from '../../connections/validation/unifiedCompatibilityChecker'

export interface AIEnhancedCompatibilityResult extends CompatibilityResult {
  aiAnalysis?: {
    confidence: number
    alternativeSuggestions: string[]
    detailedRecommendations: string[]
    sourceReliability: number
  }
  dynamicSpecs?: {
    component1: Partial<ComponentSpecification>
    component2: Partial<ComponentSpecification>
  }
}

export interface ComponentAICache {
  specification: ComponentSpecification
  lastUpdated: number
  searchMetadata: {
    confidence: number
    tokensUsed: number
    responseTime: number
  }
}

/**
 * 🤝 AICompatibilityAdapter
 * AI検索結果を既存のCompatibilityCheckerシステムに統合
 */
export class AICompatibilityAdapter {
  private aiSpecCache: Map<string, ComponentAICache>
  private compatibilityChecker: UnifiedCompatibilityChecker
  private static instance: AICompatibilityAdapter

  constructor() {
    this.aiSpecCache = new Map()
    this.compatibilityChecker = UnifiedCompatibilityChecker.getInstance()
  }

  public static getInstance(): AICompatibilityAdapter {
    if (!AICompatibilityAdapter.instance) {
      AICompatibilityAdapter.instance = new AICompatibilityAdapter()
    }
    return AICompatibilityAdapter.instance
  }

  /**
   * 🧠 AI強化版互換性チェック
   */
  public async checkCompatibilityWithAI(
    component1Name: string,
    component2Name: string,
    connectionType: 'power' | 'communication'
  ): Promise<AIEnhancedCompatibilityResult> {
    try {
      // 1. 基本互換性チェック（既存システム）
      const basicResult = await this.performBasicCompatibilityCheck(
        component1Name,
        component2Name,
        connectionType
      )

      // 2. AI仕様検索による詳細分析
      const aiAnalysis = await this.performAIAnalysis(
        component1Name,
        component2Name,
        connectionType
      )

      // 3. 結果統合
      return this.mergeResults(basicResult, aiAnalysis)

    } catch (error) {
      console.error('AI-enhanced compatibility check failed:', error)
      
      // AI失敗時のフォールバック
      return {
        compatible: false,
        confidence: 0.3,
        issues: [
          {
            type: 'ai_analysis_failed',
            severity: 'warning',
            description: 'AI analysis unavailable - using basic compatibility check only',
            suggestion: 'Manual verification recommended'
          }
        ],
        aiAnalysis: {
          confidence: 0,
          alternativeSuggestions: [],
          detailedRecommendations: ['Verify compatibility manually using component datasheets'],
          sourceReliability: 0
        }
      }
    }
  }

  /**
   * 📊 AI仕様をNodeDataに変換
   */
  public convertAISpecToNodeData(
    specification: ComponentSpecification
  ): Partial<import('@/types').NodeData> {
    return {
      title: specification.name,
      voltage: specification.voltage.operating[0] || '3.3V',
      communication: specification.communication.protocols.join(', '),
      inputs: this.calculateInputCount(specification),
      outputs: this.calculateOutputCount(specification),
      type: this.determineNodeType(specification),
      // AI仕様の追加メタデータ
      aiMetadata: {
        confidence: specification.reliability.confidence,
        lastVerified: specification.reliability.lastVerified,
        sources: specification.reliability.sources.length,
        alternatives: [], // 必要に応じて代替品情報を含める
        powerDetails: {
          consumption: specification.power.consumption.typical,
          maxConsumption: specification.power.consumption.maximum,
          supplyCapacity: specification.power.supply.capacity
        }
      }
    }
  }

  /**
   * 🔍 AI仕様キャッシュ管理
   */
  public async getCachedOrFetchSpecification(
    componentName: string
  ): Promise<ComponentSpecification | null> {
    const cached = this.aiSpecCache.get(componentName)
    
    if (cached && this.isCacheValid(cached)) {
      return cached.specification
    }

    try {
      const { searchComponent } = await import('./aiSpecificationService')
      const result = await searchComponent(componentName)
      
      // キャッシュに保存
      this.aiSpecCache.set(componentName, {
        specification: result.specification,
        lastUpdated: Date.now(),
        searchMetadata: {
          confidence: result.searchMetadata.confidenceScore,
          tokensUsed: result.searchMetadata.tokensUsed,
          responseTime: result.searchMetadata.responseTime
        }
      })

      return result.specification

    } catch (error) {
      console.error(`Failed to fetch AI specification for ${componentName}:`, error)
      return null
    }
  }

  /**
   * 🎯 リアルタイム互換性警告システム
   */
  public async generateRealTimeWarnings(
    components: Array<{ id: string; name: string; type: string }>,
    connections: Array<{ fromId: string; toId: string; type: 'power' | 'communication' }>
  ): Promise<Array<{
    connectionId: string
    severity: 'info' | 'warning' | 'critical'
    message: string
    aiRecommendations: string[]
    confidence: number
  }>> {
    const warnings: Array<{
      connectionId: string
      severity: 'info' | 'warning' | 'critical'
      message: string
      aiRecommendations: string[]
      confidence: number
    }> = []

    for (const connection of connections) {
      const comp1 = components.find(c => c.id === connection.fromId)
      const comp2 = components.find(c => c.id === connection.toId)

      if (!comp1 || !comp2) continue

      const result = await this.checkCompatibilityWithAI(
        comp1.name,
        comp2.name,
        connection.type
      )

      if (!result.compatible && result.aiAnalysis) {
        warnings.push({
          connectionId: `${connection.fromId}-${connection.toId}`,
          severity: this.determineSeverity(result),
          message: this.generateWarningMessage(comp1.name, comp2.name, result),
          aiRecommendations: result.aiAnalysis.detailedRecommendations,
          confidence: result.aiAnalysis.confidence
        })
      }
    }

    return warnings
  }

  // Private helper methods

  private async performBasicCompatibilityCheck(
    component1Name: string,
    component2Name: string,
    connectionType: 'power' | 'communication'
  ): Promise<CompatibilityResult> {
    // 基本的な互換性チェックのシミュレーション
    // 実際の実装では既存のCompatibilityCheckerを使用
    return {
      compatible: true,
      confidence: 0.7,
      issues: []
    }
  }

  private async performAIAnalysis(
    component1Name: string,
    component2Name: string,
    connectionType: 'power' | 'communication'
  ): Promise<{
    compatible: boolean
    confidence: number
    alternativeSuggestions: string[]
    detailedRecommendations: string[]
    sourceReliability: number
    specifications: {
      component1: Partial<ComponentSpecification>
      component2: Partial<ComponentSpecification>
    }
  }> {
    const { checkCompatibility } = await import('./aiSpecificationService')
    
    const aiResult = await checkCompatibility(component1Name, component2Name, connectionType)
    
    // 仕様情報も取得
    const spec1 = await this.getCachedOrFetchSpecification(component1Name)
    const spec2 = await this.getCachedOrFetchSpecification(component2Name)

    return {
      compatible: aiResult.compatible,
      confidence: aiResult.confidence / 100,
      alternativeSuggestions: [], // AIから代替案を取得する場合
      detailedRecommendations: aiResult.recommendations,
      sourceReliability: this.calculateAverageReliability([spec1, spec2]),
      specifications: {
        component1: spec1 || {},
        component2: spec2 || {}
      }
    }
  }

  private mergeResults(
    basicResult: CompatibilityResult,
    aiAnalysis: any
  ): AIEnhancedCompatibilityResult {
    return {
      ...basicResult,
      compatible: basicResult.compatible && aiAnalysis.compatible,
      confidence: Math.min(basicResult.confidence, aiAnalysis.confidence),
      aiAnalysis: {
        confidence: aiAnalysis.confidence,
        alternativeSuggestions: aiAnalysis.alternativeSuggestions,
        detailedRecommendations: aiAnalysis.detailedRecommendations,
        sourceReliability: aiAnalysis.sourceReliability
      },
      dynamicSpecs: aiAnalysis.specifications
    }
  }

  private calculateInputCount(spec: ComponentSpecification): number {
    // 通信プロトコルピン数から入力数を推定
    let totalInputs = 0
    Object.values(spec.communication.pins).forEach(pins => {
      totalInputs += pins.filter(pin => 
        pin.toLowerCase().includes('rx') || 
        pin.toLowerCase().includes('sda') ||
        pin.toLowerCase().includes('miso')
      ).length
    })
    return Math.max(totalInputs, 1)
  }

  private calculateOutputCount(spec: ComponentSpecification): number {
    // 通信プロトコルピン数から出力数を推定
    let totalOutputs = 0
    Object.values(spec.communication.pins).forEach(pins => {
      totalOutputs += pins.filter(pin => 
        pin.toLowerCase().includes('tx') || 
        pin.toLowerCase().includes('scl') ||
        pin.toLowerCase().includes('mosi')
      ).length
    })
    return Math.max(totalOutputs, 1)
  }

  private determineNodeType(spec: ComponentSpecification): string {
    if (spec.category.toLowerCase().includes('microcontroller')) {
      return 'primary'
    } else if (spec.category.toLowerCase().includes('sensor')) {
      return 'secondary'
    } else if (spec.category.toLowerCase().includes('actuator')) {
      return 'output'
    }
    return 'secondary'
  }

  private isCacheValid(cached: ComponentAICache): boolean {
    const maxAge = 24 * 60 * 60 * 1000 // 24 hours
    return Date.now() - cached.lastUpdated < maxAge
  }

  private calculateAverageReliability(
    specifications: Array<ComponentSpecification | null>
  ): number {
    const validSpecs = specifications.filter(spec => spec !== null) as ComponentSpecification[]
    if (validSpecs.length === 0) return 0
    
    const totalReliability = validSpecs.reduce((sum, spec) => 
      sum + spec.reliability.confidence, 0)
    
    return totalReliability / validSpecs.length
  }

  private determineSeverity(result: AIEnhancedCompatibilityResult): 'info' | 'warning' | 'critical' {
    if (!result.compatible && result.aiAnalysis?.confidence && result.aiAnalysis.confidence > 0.8) {
      return 'critical'
    } else if (!result.compatible) {
      return 'warning'
    }
    return 'info'
  }

  private generateWarningMessage(
    comp1Name: string,
    comp2Name: string,
    result: AIEnhancedCompatibilityResult
  ): string {
    const issues = result.issues?.map(issue => issue.description).join(', ') || 'Unknown compatibility issues'
    return `${comp1Name} and ${comp2Name} may not be compatible: ${issues}`
  }
}

// Export factory function
export function createAICompatibilityAdapter(): AICompatibilityAdapter {
  return AICompatibilityAdapter.getInstance()
}

// Export utility functions for easy use
export async function checkAICompatibility(
  component1: string,
  component2: string,
  connectionType: 'power' | 'communication'
): Promise<AIEnhancedCompatibilityResult> {
  const adapter = AICompatibilityAdapter.getInstance()
  return adapter.checkCompatibilityWithAI(component1, component2, connectionType)
}

export async function getAIComponentSpec(componentName: string): Promise<ComponentSpecification | null> {
  const adapter = AICompatibilityAdapter.getInstance()
  return adapter.getCachedOrFetchSpecification(componentName)
}