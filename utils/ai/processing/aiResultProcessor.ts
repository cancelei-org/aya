// 🧠 AI検索結果処理・抽出システム
// フェーズ2タスク2.1.3: 構造化データ変換とエラーハンドリング

import type { ComponentSpecification, SpecificationSource, AISearchResult } from '../core/aiSpecificationService'
import { calculateReliability, filterReliableSpecs, RELIABILITY_THRESHOLDS } from '../../data/analysis/reliabilityScoreSystem'

export interface ProcessingResult {
  success: boolean
  specification?: ComponentSpecification
  alternatives: ComponentSpecification[]
  processingMetadata: {
    rawResponseLength: number
    processingTime: number
    validationErrors: string[]
    extractedFields: number
    missingFields: string[]
    confidenceScore: number
  }
  fallbackData?: Partial<ComponentSpecification>
  errorDetails?: ProcessingError
}

export interface ProcessingError {
  type: 'parsing_error' | 'validation_error' | 'low_confidence' | 'incomplete_data' | 'ai_failure'
  message: string
  recoverable: boolean
  fallbackStrategy: string
  originalError?: Error
}

export interface ExtractionRule {
  field: keyof ComponentSpecification
  required: boolean
  validator: (value: any) => boolean
  extractor: (data: any) => any
  fallback?: any
}

/**
 * 🔍 AIResultProcessor
 * AI検索結果の高度な処理と構造化データ抽出
 */
export class AIResultProcessor {
  private extractionRules: ExtractionRule[]
  private static instance: AIResultProcessor

  constructor() {
    this.extractionRules = this.initializeExtractionRules()
  }

  public static getInstance(): AIResultProcessor {
    if (!AIResultProcessor.instance) {
      AIResultProcessor.instance = new AIResultProcessor()
    }
    return AIResultProcessor.instance
  }

  /**
   * 🎯 メイン処理メソッド: AI応答の完全な処理
   */
  public async processAIResponse(
    rawResponse: string,
    componentName: string,
    searchMetadata: any
  ): Promise<ProcessingResult> {
    const startTime = Date.now()
    
    try {
      // 1. 基本パース処理
      const parsedData = await this.parseAIResponse(rawResponse)
      
      // 2. 構造化データ抽出
      const extractedSpec = await this.extractStructuredData(parsedData, componentName)
      
      // 3. データ検証
      const validationResult = await this.validateExtractedData(extractedSpec)
      
      // 4. 信頼度評価
      // Use the confidence score from the AI response if available
      const aiConfidence = extractedSpec.reliability?.confidence || 0
      const reliabilityMetrics = aiConfidence > 0 
        ? { overallScore: aiConfidence, details: {} }
        : calculateReliability(
            extractedSpec.reliability?.sources || [],
            extractedSpec
          )

      // 5. 品質フィルタリング
      const qualityCheck = await this.performQualityCheck(extractedSpec, reliabilityMetrics)
      
      // 6. 代替品処理
      const alternatives = await this.processAlternatives(parsedData.alternatives || [])

      const processingTime = Date.now() - startTime

      return {
        success: qualityCheck.passed,
        specification: qualityCheck.passed ? extractedSpec : undefined,
        alternatives,
        processingMetadata: {
          rawResponseLength: rawResponse.length,
          processingTime,
          validationErrors: validationResult.errors,
          extractedFields: validationResult.extractedFields,
          missingFields: validationResult.missingFields,
          confidenceScore: reliabilityMetrics.overallScore
        },
        fallbackData: qualityCheck.passed ? undefined : this.generateFallbackData(componentName, parsedData),
        errorDetails: qualityCheck.passed ? undefined : qualityCheck.error
      }

    } catch (error) {
      return this.handleProcessingFailure(error as Error, componentName, startTime)
    }
  }

  /**
   * 📄 Raw AI応答のパース
   */
  private async parseAIResponse(rawResponse: string): Promise<any> {
    try {
      // JSON形式を期待
      const parsed = JSON.parse(rawResponse)
      return parsed

    } catch (jsonError) {
      // JSONパースに失敗した場合の復旧処理
      console.warn('JSON parse failed, attempting text extraction')
      
      // テキストからの情報抽出を試行
      const extracted = await this.extractFromText(rawResponse)
      if (extracted) {
        return extracted
      }

      throw new Error(`Failed to parse AI response: ${jsonError}`)
    }
  }

  /**
   * 🏗️ 構造化データ抽出
   */
  private async extractStructuredData(
    parsedData: any,
    componentName: string
  ): Promise<ComponentSpecification> {
    // Check if the parsed data has a 'specification' field (new format)
    const sourceData = parsedData.specification || parsedData
    
    const specification: Partial<ComponentSpecification> = {
      name: componentName,
      reliability: sourceData.reliability || {
        confidence: 0,
        sources: [],
        lastVerified: new Date().toISOString()
      }
    }

    // 抽出ルールに基づいて各フィールドを処理
    for (const rule of this.extractionRules) {
      try {
        // Try to extract from specification object first, then from root
        const extractedValue = rule.extractor(sourceData)
        
        if (extractedValue !== undefined && rule.validator(extractedValue)) {
          (specification as any)[rule.field] = extractedValue
        } else if (rule.required && rule.fallback !== undefined) {
          (specification as any)[rule.field] = rule.fallback
        }
      } catch (error) {
        console.warn(`Extraction failed for field ${rule.field}:`, error)
        
        if (rule.required && rule.fallback !== undefined) {
          (specification as any)[rule.field] = rule.fallback
        }
      }
    }

    return specification as ComponentSpecification
  }

  /**
   * ✅ 抽出データの検証
   */
  private async validateExtractedData(
    specification: ComponentSpecification
  ): Promise<{
    valid: boolean
    errors: string[]
    extractedFields: number
    missingFields: string[]
  }> {
    const errors: string[] = []
    const missingFields: string[] = []
    let extractedFields = 0

    // 必須フィールドの検証
    const requiredFields = [
      { field: 'name', value: specification.name },
      { field: 'category', value: specification.category },
      { field: 'voltage', value: specification.voltage },
      { field: 'power', value: specification.power },
      { field: 'communication', value: specification.communication },
      { field: 'physical', value: specification.physical }
    ]

    requiredFields.forEach(({ field, value }) => {
      if (value && this.isNonEmptyValue(value)) {
        extractedFields++
      } else {
        missingFields.push(field)
        errors.push(`Missing required field: ${field}`)
      }
    })

    // データ型検証
    if (specification.power?.consumption?.typical && 
        typeof specification.power.consumption.typical !== 'number') {
      errors.push('Power consumption must be a number')
    }

    if (specification.physical?.pins && 
        typeof specification.physical.pins !== 'number') {
      errors.push('Pin count must be a number')
    }

    // 論理検証
    if (specification.power?.consumption?.typical && 
        specification.power?.consumption?.maximum &&
        specification.power.consumption.typical > specification.power.consumption.maximum) {
      errors.push('Typical power consumption cannot exceed maximum')
    }

    return {
      valid: errors.length === 0,
      errors,
      extractedFields,
      missingFields
    }
  }

  /**
   * 🎯 品質チェック
   */
  private async performQualityCheck(
    specification: ComponentSpecification,
    reliabilityMetrics: any
  ): Promise<{
    passed: boolean
    error?: ProcessingError
  }> {
    // 信頼度閾値チェック
    if (reliabilityMetrics.overallScore < RELIABILITY_THRESHOLDS.EXPERIMENTAL) {
      return {
        passed: false,
        error: {
          type: 'low_confidence',
          message: `Reliability score ${reliabilityMetrics.overallScore}% is below minimum threshold`,
          recoverable: true,
          fallbackStrategy: 'Use basic fallback data and recommend manual verification'
        }
      }
    }

    // データ完全性チェック
    const completeness = this.calculateCompleteness(specification)
    if (completeness < 50) {
      return {
        passed: false,
        error: {
          type: 'incomplete_data',
          message: `Data completeness ${completeness}% is insufficient`,
          recoverable: true,
          fallbackStrategy: 'Use partial data with missing field warnings'
        }
      }
    }

    return { passed: true }
  }

  /**
   * 🔄 代替品処理
   */
  private async processAlternatives(
    alternativesData: any[]
  ): Promise<ComponentSpecification[]> {
    const alternatives: ComponentSpecification[] = []

    for (const altData of alternativesData.slice(0, 3)) { // 最大3つの代替品
      try {
        const altSpec = await this.extractStructuredData(altData, altData.name || 'Alternative')
        const validation = await this.validateExtractedData(altSpec)
        
        if (validation.extractedFields >= 3) { // 最低3フィールドが必要
          alternatives.push(altSpec)
        }
      } catch (error) {
        console.warn('Failed to process alternative:', error)
      }
    }

    return alternatives
  }

  /**
   * 🆘 フォールバック data生成
   */
  private generateFallbackData(
    componentName: string,
    parsedData: any
  ): Partial<ComponentSpecification> {
    // 基本的なフォールバックデータを生成
    return {
      name: componentName,
      category: this.inferCategory(componentName),
      voltage: {
        operating: ['3.3V', '5V'],
        logic: '3.3V',
        supply: '3.3V-5V'
      },
      power: {
        consumption: {
          typical: 50, // デフォルト値
          maximum: 100
        }
      },
      communication: {
        protocols: ['Digital'],
        pins: {}
      },
      physical: {
        pins: 8, // デフォルト値
        package: 'DIP'
      },
      compatibility: {
        microcontrollers: ['Arduino', 'ESP32'],
        operatingTemp: '-40°C to +85°C',
        libraries: []
      },
      reliability: {
        confidence: 20, // 低い信頼度
        sources: [],
        lastVerified: new Date().toISOString()
      }
    }
  }

  /**
   * 💥 処理失敗ハンドリング
   */
  private handleProcessingFailure(
    error: Error,
    componentName: string,
    startTime: number
  ): ProcessingResult {
    console.error('AI result processing failed:', error)

    return {
      success: false,
      alternatives: [],
      processingMetadata: {
        rawResponseLength: 0,
        processingTime: Date.now() - startTime,
        validationErrors: [error.message],
        extractedFields: 0,
        missingFields: ['all'],
        confidenceScore: 0
      },
      fallbackData: this.generateFallbackData(componentName, {}),
      errorDetails: {
        type: 'ai_failure',
        message: `AI processing failed: ${error.message}`,
        recoverable: false,
        fallbackStrategy: 'Use manual component specification',
        originalError: error
      }
    }
  }

  // Private helper methods

  private initializeExtractionRules(): ExtractionRule[] {
    return [
      {
        field: 'name',
        required: true,
        validator: (value) => typeof value === 'string' && value.length > 0,
        extractor: (data) => data.name || data.title || data.component,
        fallback: 'Unknown Component'
      },
      {
        field: 'category',
        required: true,
        validator: (value) => typeof value === 'string' && value.length > 0,
        extractor: (data) => data.category || data.type,
        fallback: 'Electronic Component'
      },
      {
        field: 'voltage',
        required: true,
        validator: (value) => value && typeof value === 'object',
        extractor: (data) => ({
          operating: this.extractArray(data.voltage?.operating) || this.extractArray(data.voltage?.range),
          logic: data.voltage?.logic || data.logicLevel,
          supply: data.voltage?.supply || data.supplyVoltage,
          input: data.voltage?.input || data.voltage?.vin // Optional Vin range
        }),
        fallback: { operating: ['3.3V'], logic: '3.3V', supply: '3.3V' }
      },
      {
        field: 'power',
        required: true,
        validator: (value) => value && typeof value === 'object',
        extractor: (data) => ({
          consumption: {
            typical: this.extractNumber(data.power?.consumption?.typical || data.currentConsumption?.typical),
            maximum: this.extractNumber(data.power?.consumption?.maximum || data.currentConsumption?.maximum)
          },
          supply: data.power?.supply || {}
        }),
        fallback: { consumption: { typical: 50, maximum: 100 } }
      },
      {
        field: 'communication',
        required: true,
        validator: (value) => value && typeof value === 'object',
        extractor: (data) => ({
          protocols: this.extractArray(data.communication?.protocols || data.interfaces),
          pins: data.communication?.pins || data.pinout || {},
          speed: data.communication?.speed || {}
        }),
        fallback: { protocols: ['Digital'], pins: {} }
      },
      {
        field: 'physical',
        required: true,
        validator: (value) => value && typeof value === 'object',
        extractor: (data) => ({
          pins: this.extractNumber(data.physical?.pins || data.pinCount || data.pins),
          package: data.physical?.package || data.packageType,
          dimensions: data.physical?.dimensions
        }),
        fallback: { pins: 8, package: 'DIP' }
      }
    ]
  }

  private async extractFromText(text: string): Promise<any> {
    // テキストから構造化データを抽出する簡単な実装
    const extracted: any = {}
    
    // 基本的なパターンマッチング
    const voltageMatch = text.match(/(\d+\.?\d*)\s*V/i)
    if (voltageMatch) {
      extracted.voltage = { operating: [voltageMatch[0]] }
    }
    
    const currentMatch = text.match(/(\d+)\s*mA/i)
    if (currentMatch) {
      extracted.power = { consumption: { typical: parseInt(currentMatch[1]) } }
    }

    return Object.keys(extracted).length > 0 ? extracted : null
  }

  private isNonEmptyValue(value: any): boolean {
    if (value === null || value === undefined) return false
    if (typeof value === 'string') return value.trim().length > 0
    if (typeof value === 'object') return Object.keys(value).length > 0
    if (Array.isArray(value)) return value.length > 0
    return true
  }

  private calculateCompleteness(specification: ComponentSpecification): number {
    const totalFields = 6
    let completedFields = 0

    if (specification.name) completedFields++
    if (specification.category) completedFields++
    if (specification.voltage?.operating?.length) completedFields++
    if (specification.power?.consumption?.typical) completedFields++
    if (specification.communication?.protocols?.length) completedFields++
    if (specification.physical?.pins) completedFields++

    return Math.round((completedFields / totalFields) * 100)
  }

  private inferCategory(componentName: string): string {
    const name = componentName.toLowerCase()
    
    if (name.includes('sensor')) return 'Sensor'
    if (name.includes('motor')) return 'Actuator'
    if (name.includes('led')) return 'Display'
    if (name.includes('arduino') || name.includes('esp')) return 'Microcontroller'
    if (name.includes('resistor')) return 'Passive Component'
    if (name.includes('capacitor')) return 'Passive Component'
    
    return 'Electronic Component'
  }

  private extractArray(value: any): string[] | undefined {
    if (Array.isArray(value)) return value.filter(v => typeof v === 'string')
    if (typeof value === 'string') return [value]
    return undefined
  }

  private extractNumber(value: any): number | undefined {
    if (typeof value === 'number') return value
    if (typeof value === 'string') {
      const parsed = parseFloat(value)
      return isNaN(parsed) ? undefined : parsed
    }
    return undefined
  }
}

// Export utility functions
export function processAIResult(
  rawResponse: string,
  componentName: string,
  searchMetadata: any
): Promise<ProcessingResult> {
  const processor = AIResultProcessor.getInstance()
  return processor.processAIResponse(rawResponse, componentName, searchMetadata)
}

export function createFallbackSpecification(componentName: string): Partial<ComponentSpecification> {
  const processor = AIResultProcessor.getInstance()
  return (processor as any).generateFallbackData(componentName, {})
}