// 📊 信頼度スコア算出システム
// フェーズ2タスク2.1.2: 情報源別信頼度重み付けと品質評価

import type { SpecificationSource, ComponentSpecification } from './ai/core/aiSpecificationService'

export interface ReliabilityMetrics {
  overallScore: number // 0-100
  sourceBreakdown: {
    [sourceType: string]: {
      count: number
      averageReliability: number
      weightContribution: number
    }
  }
  qualityIndicators: {
    hasOfficialSource: boolean
    hasDatasheet: boolean
    sourceConsistency: number // 0-100
    informationCompleteness: number // 0-100
    lastVerificationAge: number // days
  }
  riskFactors: string[]
  recommendations: string[]
}

export interface ReliabilityThresholds {
  production: number // 70% - Production use threshold
  development: number // 50% - Development/testing threshold
  experimental: number // 30% - Experimental use threshold
}

/**
 * 🎯 ReliabilityScoreCalculator
 * 複数情報源からの信頼度スコア算出と品質評価
 */
export class ReliabilityScoreCalculator {
  private static instance: ReliabilityScoreCalculator
  private readonly sourceWeights: { [key: string]: number }
  private readonly thresholds: ReliabilityThresholds

  constructor() {
    // 情報源別信頼度重み付け（公式>GitHub>フォーラム）
    this.sourceWeights = {
      'official': 1.0,      // 公式サイト・メーカー
      'datasheet': 0.95,    // データシート
      'github': 0.7,        // GitHub（良いドキュメント）
      'community': 0.5,     // コミュニティサイト
      'forum': 0.3,         // フォーラム・掲示板
      'blog': 0.25,         // 個人ブログ
      'unknown': 0.1        // 不明な情報源
    }

    this.thresholds = {
      production: 70,
      development: 50,
      experimental: 20  // 知識ベースのみでも通過できるよう閾値を下げる
    }
  }

  public static getInstance(): ReliabilityScoreCalculator {
    if (!ReliabilityScoreCalculator.instance) {
      ReliabilityScoreCalculator.instance = new ReliabilityScoreCalculator()
    }
    return ReliabilityScoreCalculator.instance
  }

  /**
   * 📈 総合信頼度スコア算出
   */
  public calculateOverallReliability(
    sources: SpecificationSource[],
    specification?: ComponentSpecification
  ): ReliabilityMetrics {
    if (sources.length === 0) {
      return this.createEmptyMetrics()
    }

    // 基本スコア計算
    const basicScore = this.calculateWeightedScore(sources)
    
    // 品質指標評価
    const qualityIndicators = this.evaluateQualityIndicators(sources, specification)
    
    // 一貫性チェック
    const consistencyScore = this.checkSourceConsistency(sources)
    
    // 情報完全性評価
    const completenessScore = this.evaluateInformationCompleteness(specification)
    
    // 最終スコア調整
    const adjustedScore = this.applyQualityAdjustments(
      basicScore,
      qualityIndicators,
      consistencyScore,
      completenessScore
    )

    // リスク要因とレコメンデーション生成
    const riskFactors = this.identifyRiskFactors(sources, adjustedScore, qualityIndicators)
    const recommendations = this.generateRecommendations(adjustedScore, riskFactors)

    return {
      overallScore: Math.round(adjustedScore),
      sourceBreakdown: this.generateSourceBreakdown(sources),
      qualityIndicators: {
        ...qualityIndicators,
        sourceConsistency: Math.round(consistencyScore),
        informationCompleteness: Math.round(completenessScore)
      },
      riskFactors,
      recommendations
    }
  }

  /**
   * 🔍 信頼度フィルタリング
   */
  public filterByReliability(
    specifications: ComponentSpecification[],
    minThreshold: number = this.thresholds.production
  ): {
    qualified: ComponentSpecification[]
    rejected: ComponentSpecification[]
    summary: {
      totalProcessed: number
      qualifiedCount: number
      rejectedCount: number
      averageScore: number
    }
  } {
    const qualified: ComponentSpecification[] = []
    const rejected: ComponentSpecification[] = []
    let totalScore = 0

    specifications.forEach(spec => {
      const metrics = this.calculateOverallReliability(spec.reliability.sources, spec)
      totalScore += metrics.overallScore

      if (metrics.overallScore >= minThreshold) {
        // スコアを更新
        spec.reliability.confidence = metrics.overallScore
        qualified.push(spec)
      } else {
        rejected.push(spec)
      }
    })

    return {
      qualified,
      rejected,
      summary: {
        totalProcessed: specifications.length,
        qualifiedCount: qualified.length,
        rejectedCount: rejected.length,
        averageScore: specifications.length > 0 ? Math.round(totalScore / specifications.length) : 0
      }
    }
  }

  /**
   * 📊 リアルタイム品質監視
   */
  public monitorInformationQuality(
    specifications: ComponentSpecification[]
  ): {
    overallHealthScore: number
    qualityTrends: {
      improving: ComponentSpecification[]
      declining: ComponentSpecification[]
      stable: ComponentSpecification[]
    }
    alerts: Array<{
      severity: 'low' | 'medium' | 'high'
      component: string
      issue: string
      recommendation: string
    }>
  } {
    const alerts: Array<{
      severity: 'low' | 'medium' | 'high'
      component: string
      issue: string
      recommendation: string
    }> = []

    let totalScore = 0
    const qualityTrends = {
      improving: [] as ComponentSpecification[],
      declining: [] as ComponentSpecification[],
      stable: [] as ComponentSpecification[]
    }

    specifications.forEach(spec => {
      const metrics = this.calculateOverallReliability(spec.reliability.sources, spec)
      totalScore += metrics.overallScore

      // 品質トレンド分析（簡略版）
      const currentScore = metrics.overallScore
      const previousScore = spec.reliability.confidence || 0

      if (currentScore > previousScore + 5) {
        qualityTrends.improving.push(spec)
      } else if (currentScore < previousScore - 5) {
        qualityTrends.declining.push(spec)
      } else {
        qualityTrends.stable.push(spec)
      }

      // アラート生成
      if (currentScore < this.thresholds.development) {
        alerts.push({
          severity: currentScore < this.thresholds.experimental ? 'high' : 'medium',
          component: spec.name,
          issue: `Low reliability score: ${currentScore}%`,
          recommendation: 'Verify with official documentation or find alternative sources'
        })
      }

      // 古い情報の警告
      const daysSinceVerified = this.calculateDaysSinceVerification(spec.reliability.lastVerified)
      if (daysSinceVerified > 30) {
        alerts.push({
          severity: daysSinceVerified > 90 ? 'high' : 'low',
          component: spec.name,
          issue: `Information not verified for ${daysSinceVerified} days`,
          recommendation: 'Update component specification with recent sources'
        })
      }
    })

    return {
      overallHealthScore: specifications.length > 0 ? Math.round(totalScore / specifications.length) : 0,
      qualityTrends,
      alerts
    }
  }

  // Private methods

  private calculateWeightedScore(sources: SpecificationSource[]): number {
    if (sources.length === 0) return 0

    let totalWeight = 0
    let weightedSum = 0

    sources.forEach(source => {
      const weight = this.sourceWeights[source.type] || this.sourceWeights['unknown']
      totalWeight += weight
      weightedSum += source.reliability * weight
    })

    return totalWeight > 0 ? weightedSum / totalWeight : 0
  }

  private evaluateQualityIndicators(
    sources: SpecificationSource[],
    specification?: ComponentSpecification
  ): {
    hasOfficialSource: boolean
    hasDatasheet: boolean
    lastVerificationAge: number
  } {
    const hasOfficialSource = sources.some(s => s.type === 'official')
    const hasDatasheet = sources.some(s => s.type === 'datasheet')
    
    let lastVerificationAge = 0
    if (specification?.reliability.lastVerified) {
      const lastVerified = new Date(specification.reliability.lastVerified)
      lastVerificationAge = Math.floor((Date.now() - lastVerified.getTime()) / (1000 * 60 * 60 * 24))
    }

    return {
      hasOfficialSource,
      hasDatasheet,
      lastVerificationAge
    }
  }

  private checkSourceConsistency(sources: SpecificationSource[]): number {
    if (sources.length < 2) return 100 // 単一ソースは一貫性100%

    // 信頼度の分散を計算（簡略版）
    const reliabilities = sources.map(s => s.reliability)
    const average = reliabilities.reduce((sum, r) => sum + r, 0) / reliabilities.length
    const variance = reliabilities.reduce((sum, r) => sum + Math.pow(r - average, 2), 0) / reliabilities.length
    const standardDeviation = Math.sqrt(variance)

    // 標準偏差が小さいほど一貫性が高い
    const consistencyScore = Math.max(0, 100 - (standardDeviation * 2))
    return consistencyScore
  }

  private evaluateInformationCompleteness(specification?: ComponentSpecification): number {
    if (!specification) return 0

    let completenessScore = 0
    const totalFields = 8

    // 必須フィールドの完全性チェック
    if (specification.voltage?.operating?.length > 0) completenessScore += 12.5
    if (specification.power?.consumption?.typical > 0) completenessScore += 12.5
    if (specification.communication?.protocols?.length > 0) completenessScore += 12.5
    if (specification.physical?.pins > 0) completenessScore += 12.5
    if (specification.compatibility?.microcontrollers?.length > 0) completenessScore += 12.5
    if (specification.voltage?.logic) completenessScore += 12.5
    if (specification.physical?.package) completenessScore += 12.5
    if (specification.category) completenessScore += 12.5

    return completenessScore
  }

  private applyQualityAdjustments(
    basicScore: number,
    qualityIndicators: any,
    consistencyScore: number,
    completenessScore: number
  ): number {
    let adjustedScore = basicScore

    // 公式ソースボーナス
    if (qualityIndicators.hasOfficialSource) {
      adjustedScore *= 1.1
    }

    // データシートボーナス
    if (qualityIndicators.hasDatasheet) {
      adjustedScore *= 1.05
    }

    // 一貫性調整
    adjustedScore *= (consistencyScore / 100) * 0.1 + 0.9

    // 完全性調整
    adjustedScore *= (completenessScore / 100) * 0.2 + 0.8

    // 古い情報のペナルティ
    if (qualityIndicators.lastVerificationAge > 30) {
      const agePenalty = Math.min(0.3, qualityIndicators.lastVerificationAge / 365)
      adjustedScore *= (1 - agePenalty)
    }

    return Math.max(0, Math.min(100, adjustedScore))
  }

  private generateSourceBreakdown(sources: SpecificationSource[]): {
    [sourceType: string]: {
      count: number
      averageReliability: number
      weightContribution: number
    }
  } {
    const breakdown: { [key: string]: any } = {}

    sources.forEach(source => {
      if (!breakdown[source.type]) {
        breakdown[source.type] = {
          count: 0,
          totalReliability: 0,
          totalWeight: 0
        }
      }

      const weight = this.sourceWeights[source.type] || this.sourceWeights['unknown']
      breakdown[source.type].count++
      breakdown[source.type].totalReliability += source.reliability
      breakdown[source.type].totalWeight += weight
    })

    // 平均値を計算
    Object.keys(breakdown).forEach(type => {
      const data = breakdown[type]
      data.averageReliability = Math.round(data.totalReliability / data.count)
      data.weightContribution = Math.round((data.totalWeight / sources.length) * 100)
      delete data.totalReliability
      delete data.totalWeight
    })

    return breakdown
  }

  private identifyRiskFactors(
    sources: SpecificationSource[],
    score: number,
    qualityIndicators: any
  ): string[] {
    const risks: string[] = []

    if (score < this.thresholds.production) {
      risks.push(`Low reliability score (${score}%) - not suitable for production`)
    }

    if (!qualityIndicators.hasOfficialSource) {
      risks.push('No official manufacturer documentation')
    }

    if (!qualityIndicators.hasDatasheet) {
      risks.push('Missing technical datasheet')
    }

    if (sources.length < 2) {
      risks.push('Single source information - verification needed')
    }

    if (qualityIndicators.lastVerificationAge > 180) {
      risks.push('Information may be outdated (>6 months)')
    }

    const forumSources = sources.filter(s => s.type === 'forum').length
    if (forumSources > sources.length * 0.5) {
      risks.push('Heavily reliant on forum discussions')
    }

    return risks
  }

  private generateRecommendations(score: number, riskFactors: string[]): string[] {
    const recommendations: string[] = []

    if (score < this.thresholds.production) {
      recommendations.push('Search for official manufacturer documentation')
      recommendations.push('Cross-reference with multiple technical sources')
    }

    if (riskFactors.includes('No official manufacturer documentation')) {
      recommendations.push('Contact manufacturer for official specifications')
    }

    if (riskFactors.includes('Missing technical datasheet')) {
      recommendations.push('Obtain official datasheet from manufacturer website')
    }

    if (riskFactors.includes('Single source information - verification needed')) {
      recommendations.push('Verify information with additional independent sources')
    }

    if (score >= this.thresholds.production) {
      recommendations.push('Information quality suitable for production use')
    }

    return recommendations
  }

  private calculateDaysSinceVerification(lastVerified: string): number {
    const lastDate = new Date(lastVerified)
    return Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
  }

  private createEmptyMetrics(): ReliabilityMetrics {
    return {
      overallScore: 0,
      sourceBreakdown: {},
      qualityIndicators: {
        hasOfficialSource: false,
        hasDatasheet: false,
        sourceConsistency: 0,
        informationCompleteness: 0,
        lastVerificationAge: Infinity
      },
      riskFactors: ['No information sources available'],
      recommendations: ['Add component specifications from reliable sources']
    }
  }
}

// Export utility functions
export function calculateReliability(
  sources: SpecificationSource[],
  specification?: ComponentSpecification
): ReliabilityMetrics {
  const calculator = ReliabilityScoreCalculator.getInstance()
  return calculator.calculateOverallReliability(sources, specification)
}

export function filterReliableSpecs(
  specifications: ComponentSpecification[],
  threshold: number = 70
) {
  const calculator = ReliabilityScoreCalculator.getInstance()
  return calculator.filterByReliability(specifications, threshold)
}

export function monitorQuality(specifications: ComponentSpecification[]) {
  const calculator = ReliabilityScoreCalculator.getInstance()
  return calculator.monitorInformationQuality(specifications)
}

// Export thresholds for external use
export const RELIABILITY_THRESHOLDS = {
  PRODUCTION: 70,
  DEVELOPMENT: 50,
  EXPERIMENTAL: 30
} as const