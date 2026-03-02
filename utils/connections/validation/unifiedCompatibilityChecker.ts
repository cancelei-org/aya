// 🎯 統合された互換性チェッカー
// compatibilityChecker.ts と enhancedCompatibilityChecker.ts の機能を統合

import type { Connection, SoftwareContext, NodeData } from '@/types'
import type { Node } from '@xyflow/react'
import { checkSoftwareCompatibility } from '../../ai/compatibility/softwareCompatibilityChecker'
import { ConnectionDirectionalityManager } from './connectionDirectionalityManager'

// 互換性問題の種類
export type CompatibilityIssueType = 
  | 'voltage_mismatch'
  | 'communication_incompatible'
  | 'power_insufficient'
  | 'physical_constraint'
  | 'software_hardware_mismatch'
  | 'software_requirement'
  | 'directionality_error'
  | 'port_capacity_exceeded'

// 互換性問題の詳細
export interface CompatibilityIssue {
  type: CompatibilityIssueType
  severity: 'critical' | 'warning' | 'info'
  componentId: string
  componentName: string
  issue: string
  recommendation: string
  affectedComponents: string[]
  affectedComponentNames: string[]
  connection?: Connection
}

// 互換性チェック結果
export interface CompatibilityResult {
  isCompatible: boolean
  issues: CompatibilityIssue[]
  summary: string
  checkedConnections?: number
  performanceMetrics?: {
    checkTime: number
    optimizationRatio: number
  }
}

// 統合された互換性チェッカークラス
export class UnifiedCompatibilityChecker {
  private static instance: UnifiedCompatibilityChecker
  private directionalityManager: ConnectionDirectionalityManager

  private constructor() {
    this.directionalityManager = ConnectionDirectionalityManager.getInstance()
  }

  static getInstance(): UnifiedCompatibilityChecker {
    if (!this.instance) {
      this.instance = new UnifiedCompatibilityChecker()
    }
    return this.instance
  }

  /**
   * 接続ベースの最適化された互換性チェック
   */
  checkConnectionCompatibility(
    connections: Connection[],
    components: Node<NodeData>[],
    softwareContext?: SoftwareContext | null
  ): CompatibilityResult {
    const startTime = performance.now()
    const issues: CompatibilityIssue[] = []
    const componentMap = new Map(components.map(c => [c.id, c]))
    
    // 接続されたコンポーネントのペアのみをチェック
    connections.forEach(connection => {
      const fromComponent = componentMap.get(connection.fromId)
      const toComponent = componentMap.get(connection.toId)
      
      if (!fromComponent || !toComponent) return
      
      // 電圧互換性チェック
      this.checkVoltageCompatibilityForPair(fromComponent, toComponent, connection, issues)
      
      // 通信プロトコル互換性チェック
      this.checkCommunicationCompatibilityForPair(fromComponent, toComponent, connection, issues)
      
      // 方向性チェック
      this.checkDirectionalityForPair(fromComponent, toComponent, connection, issues)
      
      // ポート容量チェック
      this.checkPortCapacityForPair(fromComponent, toComponent, connection, issues, connections)
    })
    
    // ソフトウェア互換性チェック（必要な場合）
    if (softwareContext) {
      const softwareIssues = checkSoftwareCompatibility(components, softwareContext)
      issues.push(...softwareIssues)
    }
    
    const endTime = performance.now()
    
    return {
      isCompatible: issues.filter(i => i.severity === 'critical').length === 0,
      issues,
      summary: this.generateSummary(issues),
      checkedConnections: connections.length,
      performanceMetrics: {
        checkTime: endTime - startTime,
        optimizationRatio: components.length > 0 ? connections.length / (components.length * components.length) : 0
      }
    }
  }

  /**
   * 従来の全体チェック（互換性のため残す）
   */
  checkSystemCompatibility(
    components: Node<NodeData>[],
    connections: Connection[],
    softwareContext?: SoftwareContext | null
  ): CompatibilityResult {
    // 接続ベースのチェックを呼び出す
    return this.checkConnectionCompatibility(connections, components, softwareContext)
  }

  private checkVoltageCompatibilityForPair(
    fromComponent: Node<NodeData>,
    toComponent: Node<NodeData>,
    connection: Connection,
    issues: CompatibilityIssue[]
  ): void {
    const fromVoltage = this.normalizeVoltage(fromComponent.data?.voltage)
    const toVoltage = this.normalizeVoltage(toComponent.data?.voltage)
    
    if (!fromVoltage || !toVoltage) return
    
    // 電圧不一致チェック
    if (fromVoltage !== toVoltage) {
      const severity = this.getVoltageMismatchSeverity(fromVoltage, toVoltage)
      issues.push({
        type: 'voltage_mismatch',
        severity,
        componentId: fromComponent.id,
        componentName: fromComponent.data?.title || '',
        issue: `電圧不一致: ${fromComponent.data?.voltage} → ${toComponent.data?.voltage}`,
        recommendation: severity === 'critical' 
          ? 'レベル変換回路が必要です'
          : '電圧の確認をしてください',
        affectedComponents: [toComponent.id],
        affectedComponentNames: [toComponent.data?.title || ''],
        connection
      })
    }
  }

  private checkCommunicationCompatibilityForPair(
    fromComponent: Node<NodeData>,
    toComponent: Node<NodeData>,
    connection: Connection,
    issues: CompatibilityIssue[]
  ): void {
    const fromProtocols = this.parseProtocols(fromComponent.data?.communication)
    const toProtocols = this.parseProtocols(toComponent.data?.communication)
    
    if (fromProtocols.length === 0 || toProtocols.length === 0) return
    
    // 共通プロトコルがあるかチェック
    const commonProtocols = fromProtocols.filter(p => toProtocols.includes(p))
    
    if (commonProtocols.length === 0) {
      issues.push({
        type: 'communication_incompatible',
        severity: 'critical',
        componentId: fromComponent.id,
        componentName: fromComponent.data?.title || '',
        issue: `通信プロトコル不一致: ${fromProtocols.join(', ')} ↔ ${toProtocols.join(', ')}`,
        recommendation: 'プロトコル変換器を使用するか、共通のプロトコルを持つ部品を選択してください',
        affectedComponents: [toComponent.id],
        affectedComponentNames: [toComponent.data?.title || ''],
        connection
      })
    }
  }

  private checkDirectionalityForPair(
    fromComponent: Node<NodeData>,
    toComponent: Node<NodeData>,
    connection: Connection,
    issues: CompatibilityIssue[]
  ): void {
    const result = this.directionalityManager.validateConnectionDirectionality(
      connection,
      fromComponent,
      toComponent
    )
    
    if (!result.isValid) {
      issues.push({
        type: 'directionality_error',
        severity: result.severity || 'warning',
        componentId: fromComponent.id,
        componentName: fromComponent.data?.title || '',
        issue: result.issue || '接続方向に問題があります',
        recommendation: result.recommendation || '接続方向を確認してください',
        affectedComponents: [toComponent.id],
        affectedComponentNames: [toComponent.data?.title || ''],
        connection
      })
    }
  }

  private checkPortCapacityForPair(
    fromComponent: Node<NodeData>,
    toComponent: Node<NodeData>,
    connection: Connection,
    issues: CompatibilityIssue[],
    allConnections: Connection[]
  ): void {
    // 送信側のポート容量チェック
    const fromPortConnections = allConnections.filter(c => 
      c.fromId === fromComponent.id && c.fromPort === connection.fromPort
    )
    
    // 受信側のポート容量チェック  
    const toPortConnections = allConnections.filter(c =>
      c.toId === toComponent.id && c.toPort === connection.toPort
    )
    
    // ポート容量の検証（実装は別ファイルから移植）
    this.validatePortCapacity(fromComponent, 'output', fromPortConnections.length, issues)
    this.validatePortCapacity(toComponent, 'input', toPortConnections.length, issues)
  }

  private validatePortCapacity(
    component: Node<NodeData>,
    portType: 'input' | 'output',
    currentConnections: number,
    issues: CompatibilityIssue[]
  ): void {
    // デフォルトの最大接続数（実際の値は部品タイプによって異なる）
    const maxConnections = this.getMaxConnectionsForPort(component, portType)
    
    if (currentConnections > maxConnections) {
      issues.push({
        type: 'port_capacity_exceeded',
        severity: 'critical',
        componentId: component.id,
        componentName: component.data?.title || '',
        issue: `${portType}ポートの容量超過: ${currentConnections}/${maxConnections}`,
        recommendation: `${portType}接続数を${maxConnections}以下に減らしてください`,
        affectedComponents: [],
        affectedComponentNames: []
      })
    }
  }

  private getMaxConnectionsForPort(component: Node<NodeData>, portType: 'input' | 'output'): number {
    // 部品タイプに基づいて最大接続数を決定
    const category = component.data?.category?.toLowerCase() || ''
    
    if (category.includes('splitter') || category.includes('hub')) {
      return portType === 'input' ? 1 : 8
    } else if (category.includes('microcontroller')) {
      return 10 // 多くの接続を許可
    } else {
      return portType === 'input' ? 3 : 3 // デフォルト
    }
  }

  private normalizeVoltage(voltage?: string): string {
    if (!voltage) return ''
    return voltage.toLowerCase().replace(/\s/g, '').replace('v', '')
  }

  private parseProtocols(communication?: string): string[] {
    if (!communication) return []
    return communication.split(/[,/]/).map(p => p.trim().toLowerCase())
  }

  private getVoltageMismatchSeverity(voltage1: string, voltage2: string): 'critical' | 'warning' {
    const v1 = parseFloat(voltage1)
    const v2 = parseFloat(voltage2)
    
    if (isNaN(v1) || isNaN(v2)) return 'warning'
    
    // 3.3Vに5Vを供給するのは危険
    if (v1 === 3.3 && v2 === 5) return 'critical'
    if (v1 === 5 && v2 === 3.3) return 'critical'
    
    // その他の電圧差
    const difference = Math.abs(v1 - v2)
    return difference > 2 ? 'critical' : 'warning'
  }

  private generateSummary(issues: CompatibilityIssue[]): string {
    const criticalCount = issues.filter(i => i.severity === 'critical').length
    const warningCount = issues.filter(i => i.severity === 'warning').length
    
    if (criticalCount === 0 && warningCount === 0) {
      return '✅ すべての部品は互換性があります'
    } else if (criticalCount > 0) {
      return `⚠️ ${criticalCount}個の重大な互換性問題と${warningCount}個の警告があります`
    } else {
      return `⚠️ ${warningCount}個の互換性に関する警告があります`
    }
  }
}

// エクスポート
export const unifiedCompatibilityChecker = UnifiedCompatibilityChecker.getInstance()

// 後方互換性のため、従来の関数もエクスポート
export function checkSystemCompatibility(
  components: Node<NodeData>[],
  connections: Connection[],
  softwareContext?: SoftwareContext | null
): CompatibilityResult {
  return unifiedCompatibilityChecker.checkSystemCompatibility(components, connections, softwareContext)
}

export function checkConnectionCompatibility(
  connections: Connection[],
  components: Node<NodeData>[],
  softwareContext?: SoftwareContext | null
): CompatibilityResult {
  return unifiedCompatibilityChecker.checkConnectionCompatibility(connections, components, softwareContext)
}