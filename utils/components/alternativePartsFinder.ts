// 🔍 代替部品検索機能
// 第2段階：互換性問題のある部品に対して代替可能な部品を提案

import type { Node, Connection } from '@/types'
import { checkSystemCompatibility, type CompatibilityIssue } from '../connections/validation/unifiedCompatibilityChecker'

// 代替部品の候補情報
export interface AlternativePart {
  id: string
  title: string
  modelNumber?: string
  voltage?: string
  communication?: string
  description?: string
  category: string
  compatibilityScore: number  // 0-100の互換性スコア
  priceEstimate?: string
  advantages: string[]        // この代替部品の利点
  tradeoffs: string[]        // この代替部品のトレードオフ
}

// 代替部品の提案情報
export interface PartSuggestion {
  problemComponentId: string
  problemComponentName: string
  issue: CompatibilityIssue
  alternatives: AlternativePart[]
  recommendation: string
}

/**
 * 🎯 メイン関数：互換性問題に対する代替部品を検索
 */
export function findAlternativeParts(
  components: Node<NodeData>,
  connections: Connection[],
  compatibilityIssues: CompatibilityIssue[]
): PartSuggestion[] {
  const suggestions: PartSuggestion[] = []
  
  // 重要度の高い問題から処理
  const criticalIssues = compatibilityIssues
    .filter(issue => issue.severity === 'critical')
    .slice(0, 3) // 最大3件まで
  
  criticalIssues.forEach(issue => {
    const problemComponent = components.find(c => c.id === issue.componentId)
    if (!problemComponent) return
    
    const alternatives = searchCompatibleAlternatives(
      problemComponent,
      issue,
      components,
      connections
    )
    
    if (alternatives.length > 0) {
      suggestions.push({
        problemComponentId: issue.componentId,
        problemComponentName: issue.componentName,
        issue,
        alternatives: alternatives.slice(0, 3), // 最大3つの代替案
        recommendation: generateRecommendation(issue, alternatives[0])
      })
    }
  })
  
  return suggestions
}

/**
 * 🔍 互換性のある代替部品を検索
 */
function searchCompatibleAlternatives(
  problemComponent: CanvasNode,
  issue: CompatibilityIssue,
  allComponents: Node<NodeData>,
  connections: Connection[]
): AlternativePart[] {
  const alternatives: AlternativePart[] = []
  
  // 部品カテゴリを判定
  const category = detectComponentCategory(problemComponent)
  
  // カテゴリ別の代替部品候補を生成
  const candidates = generateAlternativeCandidates(problemComponent, issue, category)
  
  // 各候補の互換性をチェック
  candidates.forEach(candidate => {
    const testComponents = allComponents.map(c => 
      c.id === problemComponent.id ? createTestComponent(candidate) : c
    )
    
    const compatibilityResult = checkSystemCompatibility(testComponents, connections)
    
    // この代替部品が問題を解決するかチェック
    const solvesIssue = !compatibilityResult.issues.some(i => 
      i.type === issue.type && i.componentId === candidate.id
    )
    
    if (solvesIssue) {
      alternatives.push({
        ...candidate,
        compatibilityScore: calculateCompatibilityScore(candidate, problemComponent, compatibilityResult)
      })
    }
  })
  
  // 互換性スコア順にソート
  return alternatives.sort((a, b) => b.compatibilityScore - a.compatibilityScore)
}

/**
 * 🏷️ 部品カテゴリを検出
 */
function detectComponentCategory(component: CanvasNode): string {
  const title = component.data?.title.toLowerCase()
  
  if (title.includes('arduino') || title.includes('microcontroller')) return 'controller'
  if (title.includes('sensor') || title.includes('温度') || title.includes('distance')) return 'sensor'
  if (title.includes('motor') || title.includes('servo')) return 'actuator'
  if (title.includes('led') || title.includes('display')) return 'display'
  if (title.includes('power') || title.includes('battery')) return 'power'
  if (title.includes('wifi') || title.includes('bluetooth')) return 'communication'
  
  return 'other'
}

/**
 * 🎲 代替部品候補を生成
 */
function generateAlternativeCandidates(
  problemComponent: CanvasNode,
  issue: CompatibilityIssue,
  category: string
): Omit<AlternativePart, 'compatibilityScore'>[] {
  const candidates: Omit<AlternativePart, 'compatibilityScore'>[] = []
  
  switch (issue.type) {
    case 'voltage_mismatch':
      candidates.push(...generateVoltageAlternatives(problemComponent, category))
      break
    case 'communication_incompatible':
      candidates.push(...generateCommunicationAlternatives(problemComponent, category))
      break
    case 'power_insufficient':
      candidates.push(...generatePowerAlternatives(problemComponent, category))
      break
    default:
      candidates.push(...generateGeneralAlternatives(problemComponent, category))
  }
  
  return candidates
}

/**
 * ⚡ 電圧問題の代替部品を生成
 */
function generateVoltageAlternatives(
  component: CanvasNode,
  category: string
): Omit<AlternativePart, 'compatibilityScore'>[] {
  const currentVoltage = component.data?.voltage
  const alternatives: Omit<AlternativePart, 'compatibilityScore'>[] = []
  
  // 一般的な電圧レベルでの代替案
  const commonVoltages = ['3.3V', '5V', '12V']
  
  commonVoltages.forEach(voltage => {
    if (voltage !== currentVoltage) {
      alternatives.push({
        id: `${component.id}_alt_${voltage}`,
        title: `${component.data?.title} (${voltage}版)`,
        voltage,
        communication: component.data?.communication,
        description: `${voltage}動作版の${component.data?.title}`,
        category,
        advantages: [`${voltage}動作で互換性向上`],
        tradeoffs: currentVoltage ? [`${currentVoltage}から${voltage}への変更`] : []
      })
    }
  })
  
  return alternatives
}

/**
 * 📡 通信問題の代替部品を生成
 */
function generateCommunicationAlternatives(
  component: CanvasNode,
  category: string
): Omit<AlternativePart, 'compatibilityScore'>[] {
  const alternatives: Omit<AlternativePart, 'compatibilityScore'>[] = []
  const commonProtocols = ['I2C', 'SPI', 'UART', 'WiFi', 'Bluetooth']
  
  commonProtocols.forEach(protocol => {
    if (!component.data?.communication?.includes(protocol)) {
      alternatives.push({
        id: `${component.id}_alt_${protocol}`,
        title: `${component.data?.title} (${protocol}版)`,
        voltage: component.data?.voltage,
        communication: protocol,
        description: `${protocol}通信対応版の${component.data?.title}`,
        category,
        advantages: [`${protocol}通信で互換性向上`],
        tradeoffs: [`通信方式の変更が必要`]
      })
    }
  })
  
  return alternatives
}

/**
 * 🔋 電力問題の代替部品を生成
 */
function generatePowerAlternatives(
  component: CanvasNode,
  category: string
): Omit<AlternativePart, 'compatibilityScore'>[] {
  const alternatives: Omit<AlternativePart, 'compatibilityScore'>[] = []
  
  if (category === 'power') {
    // 電源部品の場合：より高出力の電源を提案
    alternatives.push({
      id: `${component.id}_alt_highpower`,
      title: `${component.data?.title} (高出力版)`,
      voltage: component.data?.voltage,
      communication: component.data?.communication,
      description: `より高い電力供給能力を持つ${component.data?.title}`,
      category,
      advantages: ['より多くの部品に電力供給可能'],
      tradeoffs: ['サイズ・コストの増加']
    })
  } else {
    // 消費部品の場合：低消費電力版を提案
    alternatives.push({
      id: `${component.id}_alt_lowpower`,
      title: `${component.data?.title} (省電力版)`,
      voltage: component.data?.voltage,
      communication: component.data?.communication,
      description: `消費電力を抑えた${component.data?.title}`,
      category,
      advantages: ['消費電力削減'],
      tradeoffs: ['性能の一部制限']
    })
  }
  
  return alternatives
}

/**
 * 🔧 一般的な代替部品を生成
 */
function generateGeneralAlternatives(
  component: CanvasNode,
  category: string
): Omit<AlternativePart, 'compatibilityScore'>[] {
  return [{
    id: `${component.id}_alt_compatible`,
    title: `${component.data?.title} (互換版)`,
    voltage: component.data?.voltage,
    communication: component.data?.communication,
    description: `互換性を改善した${component.data?.title}`,
    category,
    advantages: ['互換性の向上'],
    tradeoffs: ['仕様の微調整']
  }]
}

/**
 * 🧪 テスト用部品コンポーネントを作成
 */
function createTestComponent(candidate: Omit<AlternativePart, 'compatibilityScore'>): CanvasNode {
  return {
    id: candidate.id,
    title: candidate.title,
    x: 0,
    y: 0,
    type: 'primary',
    inputs: 1,
    outputs: 1,
    voltage: candidate.voltage,
    communication: candidate.communication,
    description: candidate.description
  }
}

/**
 * 📊 互換性スコアを計算
 */
function calculateCompatibilityScore(
  candidate: Omit<AlternativePart, 'compatibilityScore'>,
  original: CanvasNode,
  compatibilityResult: any
): number {
  let score = 50 // ベーススコア
  
  // 互換性問題の数で減点
  const criticalIssues = compatibilityResult.issues.filter(i => i.severity === 'critical').length
  const warningIssues = compatibilityResult.issues.filter(i => i.severity === 'warning').length
  
  score -= criticalIssues * 30
  score -= warningIssues * 10
  
  // 元部品との類似性でボーナス
  if (candidate.voltage === original.voltage) score += 20
  if (candidate.communication === original.communication) score += 15
  
  return Math.max(0, Math.min(100, score))
}

/**
 * 📝 推奨文を生成
 */
function generateRecommendation(issue: CompatibilityIssue, bestAlternative: AlternativePart): string {
  const issueType = issue.type
  const advantages = bestAlternative.advantages.join('、')
  
  switch (issueType) {
    case 'voltage_mismatch':
      return `電圧の問題を解決するため、${bestAlternative.title}への変更を推奨します。${advantages}により互換性が向上します。`
    case 'communication_incompatible':
      return `通信プロトコルの問題を解決するため、${bestAlternative.title}への変更を推奨します。${advantages}により通信が可能になります。`
    case 'power_insufficient':
      return `電力の問題を解決するため、${bestAlternative.title}への変更を推奨します。${advantages}により十分な電力供給が可能です。`
    default:
      return `互換性を向上させるため、${bestAlternative.title}への変更を推奨します。`
  }
}