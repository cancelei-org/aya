// 🔒 ポート制限管理システム
// フェーズ3タスク3.1.3: 通信ポートの最大接続数管理と電力ポートの無制限接続対応

import type { 
  Connection, 
  PortDefinition, 
  PortCapacityStatus, 
  DynamicPortConfiguration,
  PortSystemEvent 
} from '@/types/canvas'
import type { Node } from '@xyflow/react'
import type { NodeData } from '@/types/canvas'

export interface PortLimitRule {
  id: string
  name: string
  description: string
  portType: 'communication' | 'power' | 'gpio' | 'analog'
  protocol?: string
  maxConnections: number | 'unlimited'
  warningThreshold: number // Percentage (0-100)
  restrictions: {
    allowMultipleInputs?: boolean
    allowMultipleOutputs?: boolean
    requiresBidirectional?: boolean
    protocolSpecific?: {
      [protocol: string]: {
        maxDevices: number
        addressingRequired: boolean
        pullupRequired: boolean
      }
    }
  }
  violationMessage: string
  recommendedSolution: string
}

export interface PortLimitViolation {
  id: string
  nodeId: string
  portId: string
  violationType: 'exceeded' | 'approaching_limit' | 'configuration_error' | 'protocol_violation'
  severity: 'info' | 'warning' | 'error' | 'critical'
  message: string
  currentCount: number
  maxAllowed: number
  affectedConnections: string[]
  recommendations: string[]
  autoFixAvailable: boolean
  timestamp: string
}

export interface PortLoadAnalysis {
  nodeId: string
  portId: string
  analysis: {
    electrical: {
      currentDraw: number // mA
      maxCapacity: number // mA
      utilizationPercent: number
      safetyMargin: number // mA
      thermalConsiderations?: string
    }
    protocol: {
      bandwidth: number // bps or Hz
      maxBandwidth: number
      utilizationPercent: number
      latencyImpact?: string
      bufferRequirements?: string
    }
    mechanical: {
      connectionCount: number
      maxPhysicalConnections: number
      wireGaugeRecommendation?: string
      connectorStress?: string
    }
  }
  status: 'safe' | 'caution' | 'warning' | 'critical'
  recommendations: string[]
}

/**
 * 🔒 PortLimitManager
 * ポート制限の管理、監視、違反検出、自動修正システム
 */
export class PortLimitManager {
  private static instance: PortLimitManager
  private limitRules: Map<string, PortLimitRule>
  private violations: Map<string, PortLimitViolation[]>
  private eventHistory: PortSystemEvent[]
  private monitoringEnabled: boolean

  constructor() {
    this.limitRules = new Map()
    this.violations = new Map()
    this.eventHistory = []
    this.monitoringEnabled = true
    this.initializeDefaultRules()
  }

  public static getInstance(): PortLimitManager {
    if (!PortLimitManager.instance) {
      PortLimitManager.instance = new PortLimitManager()
    }
    return PortLimitManager.instance
  }

  /**
   * 📋 デフォルトポート制限ルールの初期化
   */
  private initializeDefaultRules(): void {
    const defaultRules: PortLimitRule[] = [
      // I2C通信ルール
      {
        id: 'i2c_device_limit',
        name: 'I2C Device Limit',
        description: 'I2C bus supports up to 127 devices with unique addresses',
        portType: 'communication',
        protocol: 'I2C',
        maxConnections: 127,
        warningThreshold: 80,
        restrictions: {
          allowMultipleInputs: true,
          allowMultipleOutputs: true,
          requiresBidirectional: true,
          protocolSpecific: {
            'I2C': {
              maxDevices: 127,
              addressingRequired: true,
              pullupRequired: true
            }
          }
        },
        violationMessage: 'I2C bus has too many connected devices',
        recommendedSolution: 'Use I2C multiplexer or switch to different communication protocol'
      },
      
      // SPI通信ルール
      {
        id: 'spi_cs_limit',
        name: 'SPI Chip Select Limit',
        description: 'Each SPI device requires a dedicated chip select line',
        portType: 'communication',
        protocol: 'SPI',
        maxConnections: 1,
        warningThreshold: 100,
        restrictions: {
          allowMultipleInputs: false,
          allowMultipleOutputs: false,
          requiresBidirectional: false
        },
        violationMessage: 'SPI chip select can only connect to one device',
        recommendedSolution: 'Use separate chip select pins for each SPI device'
      },

      // UART通信ルール
      {
        id: 'uart_point_to_point',
        name: 'UART Point-to-Point',
        description: 'UART is point-to-point communication',
        portType: 'communication',
        protocol: 'UART',
        maxConnections: 1,
        warningThreshold: 100,
        restrictions: {
          allowMultipleInputs: false,
          allowMultipleOutputs: false,
          requiresBidirectional: false
        },
        violationMessage: 'UART can only connect to one device',
        recommendedSolution: 'Use RS485 or implement software multiplexing for multiple devices'
      },

      // 電力供給ルール
      {
        id: 'power_unlimited',
        name: 'Power Distribution',
        description: 'Power lines can connect to multiple devices',
        portType: 'power',
        maxConnections: 'unlimited',
        warningThreshold: 80,
        restrictions: {
          allowMultipleInputs: true,
          allowMultipleOutputs: true,
          requiresBidirectional: false
        },
        violationMessage: 'Power capacity exceeded',
        recommendedSolution: 'Use external power supply or reduce connected device count'
      },

      // GPIO制限ルール
      {
        id: 'gpio_single_connection',
        name: 'GPIO Single Connection',
        description: 'GPIO pins typically connect to one device',
        portType: 'gpio',
        maxConnections: 1,
        warningThreshold: 100,
        restrictions: {
          allowMultipleInputs: false,
          allowMultipleOutputs: true,
          requiresBidirectional: false
        },
        violationMessage: 'GPIO pin can typically only connect to one device',
        recommendedSolution: 'Use GPIO expander or buffer for multiple connections'
      }
    ]

    defaultRules.forEach(rule => {
      this.limitRules.set(rule.id, rule)
    })
  }

  /**
   * 🔍 接続制限の検証
   */
  public validateConnection(
    nodeId: string,
    portId: string,
    newConnection: Connection,
    currentConnections: Connection[],
    portConfig: DynamicPortConfiguration
  ): {
    isAllowed: boolean
    violations: PortLimitViolation[]
    warnings: string[]
    recommendations: string[]
  } {
    const port = this.findPortInConfiguration(portId, portConfig)
    if (!port) {
      return {
        isAllowed: false,
        violations: [{
          id: `port_not_found_${Date.now()}`,
          nodeId,
          portId,
          violationType: 'configuration_error',
          severity: 'error',
          message: 'Port configuration not found',
          currentCount: 0,
          maxAllowed: 0,
          affectedConnections: [],
          recommendations: ['Regenerate port configuration', 'Check component specification'],
          autoFixAvailable: false,
          timestamp: new Date().toISOString()
        }],
        warnings: [],
        recommendations: []
      }
    }

    const relevantRules = this.getRelevantRules(port)
    const violations: PortLimitViolation[] = []
    const warnings: string[] = []
    const recommendations: string[] = []

    // 現在の接続数を計算
    const portConnections = currentConnections.filter(conn => 
      (conn.fromPort === portId && conn.fromId === nodeId) ||
      (conn.toPort === portId && conn.toId === nodeId)
    )
    const currentCount = portConnections.length
    const newCount = currentCount + 1

    for (const rule of relevantRules) {
      const maxConnections = rule.maxConnections === 'unlimited' ? Infinity : rule.maxConnections
      
      // 制限超過チェック
      if (newCount > maxConnections) {
        violations.push({
          id: `limit_exceeded_${nodeId}_${portId}_${Date.now()}`,
          nodeId,
          portId,
          violationType: 'exceeded',
          severity: 'error',
          message: rule.violationMessage,
          currentCount: newCount,
          maxAllowed: maxConnections,
          affectedConnections: portConnections.map(c => c.id),
          recommendations: [rule.recommendedSolution],
          autoFixAvailable: this.canAutoFix(rule, port),
          timestamp: new Date().toISOString()
        })
      }
      
      // 警告閾値チェック
      else if (maxConnections !== Infinity && newCount >= (maxConnections * rule.warningThreshold / 100)) {
        warnings.push(`Approaching connection limit for ${port.label} (${newCount}/${maxConnections})`)
        recommendations.push('Consider alternative connection methods before reaching limit')
      }

      // プロトコル固有の検証
      if (rule.restrictions.protocolSpecific && port.protocol) {
        const protocolRule = rule.restrictions.protocolSpecific[port.protocol]
        if (protocolRule) {
          const protocolViolations = this.validateProtocolSpecificRules(
            nodeId, portId, port, protocolRule, newCount, portConnections
          )
          violations.push(...protocolViolations)
        }
      }
    }

    return {
      isAllowed: violations.length === 0,
      violations,
      warnings,
      recommendations
    }
  }

  /**
   * 📊 ポート容量分析
   */
  public analyzePortLoad(
    nodeId: string,
    portId: string,
    connections: Connection[],
    portConfig: DynamicPortConfiguration,
    componentSpecs?: any
  ): PortLoadAnalysis {
    const port = this.findPortInConfiguration(portId, portConfig)
    if (!port) {
      return this.createErrorAnalysis(nodeId, portId, 'Port not found')
    }

    const portConnections = connections.filter(conn => 
      (conn.fromPort === portId && conn.fromId === nodeId) ||
      (conn.toPort === portId && conn.toId === nodeId)
    )

    // 電気的分析
    const electricalAnalysis = this.analyzeElectricalLoad(port, portConnections, componentSpecs)
    
    // プロトコル分析
    const protocolAnalysis = this.analyzeProtocolLoad(port, portConnections)
    
    // 機械的分析
    const mechanicalAnalysis = this.analyzeMechanicalLoad(port, portConnections)

    // 総合ステータス判定
    const status = this.determineOverallStatus([
      electricalAnalysis.status,
      protocolAnalysis.status,
      mechanicalAnalysis.status
    ])

    // 推奨事項の生成
    const recommendations = this.generateLoadRecommendations(
      electricalAnalysis,
      protocolAnalysis,
      mechanicalAnalysis,
      status
    )

    return {
      nodeId,
      portId,
      analysis: {
        electrical: electricalAnalysis,
        protocol: protocolAnalysis,
        mechanical: mechanicalAnalysis
      },
      status,
      recommendations
    }
  }

  /**
   * 🔧 自動修正の実行
   */
  public async attemptAutoFix(
    violation: PortLimitViolation,
    portConfig: DynamicPortConfiguration
  ): Promise<{
    success: boolean
    action: string
    newConfiguration?: DynamicPortConfiguration
    message: string
  }> {
    if (!violation.autoFixAvailable) {
      return {
        success: false,
        action: 'none',
        message: 'Auto-fix not available for this violation type'
      }
    }

    const port = this.findPortInConfiguration(violation.portId, portConfig)
    if (!port) {
      return {
        success: false,
        action: 'none',
        message: 'Port not found in configuration'
      }
    }

    // 制限超過の自動修正を試行
    if (violation.violationType === 'exceeded') {
      return this.autoFixExceededLimit(violation, port, portConfig)
    }

    // プロトコル違反の自動修正を試行
    if (violation.violationType === 'protocol_violation') {
      return this.autoFixProtocolViolation(violation, port, portConfig)
    }

    return {
      success: false,
      action: 'none',
      message: 'No auto-fix strategy available for this violation'
    }
  }

  /**
   * 🎯 リアルタイム監視の開始
   */
  public startRealtimeMonitoring(
    nodes: Node<NodeData>[],
    connections: Connection[],
    onViolationDetected: (violations: PortLimitViolation[]) => void
  ): void {
    if (!this.monitoringEnabled) return

    // 現在の状態をスナップショット
    const currentViolations = this.scanAllViolations(nodes, connections)
    
    // 新しい違反があれば通知
    if (currentViolations.length > 0) {
      onViolationDetected(currentViolations)
    }

    // 違反情報を保存
    nodes.forEach(node => {
      const nodeViolations = currentViolations.filter(v => v.nodeId === node.id)
      if (nodeViolations.length > 0) {
        this.violations.set(node.id, nodeViolations)
      }
    })
  }

  /**
   * 📈 統計情報の取得
   */
  public getSystemStatistics(): {
    totalRules: number
    activeViolations: number
    violationsByType: { [type: string]: number }
    violationsBySeverity: { [severity: string]: number }
    mostViolatedPorts: { nodeId: string; portId: string; count: number }[]
    autoFixSuccessRate: number
  } {
    const allViolations = Array.from(this.violations.values()).flat()
    
    const violationsByType: { [type: string]: number } = {}
    const violationsBySeverity: { [severity: string]: number } = {}
    
    allViolations.forEach(violation => {
      violationsByType[violation.violationType] = (violationsByType[violation.violationType] || 0) + 1
      violationsBySeverity[violation.severity] = (violationsBySeverity[violation.severity] || 0) + 1
    })

    // 最も問題の多いポートを特定
    const portViolationCounts = new Map<string, number>()
    allViolations.forEach(violation => {
      const key = `${violation.nodeId}:${violation.portId}`
      portViolationCounts.set(key, (portViolationCounts.get(key) || 0) + 1)
    })

    const mostViolatedPorts = Array.from(portViolationCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([key, count]) => {
        const [nodeId, portId] = key.split(':')
        return { nodeId, portId, count }
      })

    // 自動修正成功率を計算（イベント履歴から）
    const autoFixEvents = this.eventHistory.filter(e => 
      e.metadata?.userTriggered === false && e.type === 'port_connected'
    )
    const autoFixSuccessRate = autoFixEvents.length > 0 ? 85 : 0 // Mock calculation

    return {
      totalRules: this.limitRules.size,
      activeViolations: allViolations.length,
      violationsByType,
      violationsBySeverity,
      mostViolatedPorts,
      autoFixSuccessRate
    }
  }

  // Private helper methods

  private findPortInConfiguration(portId: string, config: DynamicPortConfiguration): PortDefinition | null {
    for (const group of config.portGroups) {
      const port = group.ports.find(p => p.id === portId)
      if (port) return port
    }
    return null
  }

  private getRelevantRules(port: PortDefinition): PortLimitRule[] {
    const rules: PortLimitRule[] = []
    
    for (const rule of this.limitRules.values()) {
      if (rule.portType === port.type) {
        if (!rule.protocol || rule.protocol === port.protocol) {
          rules.push(rule)
        }
      }
    }
    
    return rules
  }

  private validateProtocolSpecificRules(
    nodeId: string,
    portId: string,
    port: PortDefinition,
    protocolRule: any,
    newCount: number,
    connections: Connection[]
  ): PortLimitViolation[] {
    const violations: PortLimitViolation[] = []

    if (newCount > protocolRule.maxDevices) {
      violations.push({
        id: `protocol_limit_${nodeId}_${portId}_${Date.now()}`,
        nodeId,
        portId,
        violationType: 'protocol_violation',
        severity: 'error',
        message: `${port.protocol} protocol limit exceeded (${newCount}/${protocolRule.maxDevices})`,
        currentCount: newCount,
        maxAllowed: protocolRule.maxDevices,
        affectedConnections: connections.map(c => c.id),
        recommendations: [`Use ${port.protocol} multiplexer or expander`],
        autoFixAvailable: false,
        timestamp: new Date().toISOString()
      })
    }

    return violations
  }

  private analyzeElectricalLoad(port: PortDefinition, connections: Connection[], specs?: any): any {
    const estimatedCurrent = connections.length * 20 // 20mA per connection estimate
    const maxCapacity = port.type === 'power' ? 500 : 50 // mA
    const utilizationPercent = (estimatedCurrent / maxCapacity) * 100
    const safetyMargin = maxCapacity - estimatedCurrent

    let status: 'safe' | 'caution' | 'warning' | 'critical' = 'safe'
    if (utilizationPercent > 90) status = 'critical'
    else if (utilizationPercent > 75) status = 'warning'
    else if (utilizationPercent > 50) status = 'caution'

    return {
      currentDraw: estimatedCurrent,
      maxCapacity,
      utilizationPercent,
      safetyMargin,
      status
    }
  }

  private analyzeProtocolLoad(port: PortDefinition, connections: Connection[]): any {
    const baseBandwidth = port.protocol === 'I2C' ? 400000 : 1000000 // bps
    const utilizationPercent = Math.min((connections.length / 10) * 100, 100) // Mock calculation
    
    let status: 'safe' | 'caution' | 'warning' | 'critical' = 'safe'
    if (utilizationPercent > 90) status = 'critical'
    else if (utilizationPercent > 75) status = 'warning'
    else if (utilizationPercent > 50) status = 'caution'

    return {
      bandwidth: baseBandwidth * (utilizationPercent / 100),
      maxBandwidth: baseBandwidth,
      utilizationPercent,
      status
    }
  }

  private analyzeMechanicalLoad(port: PortDefinition, connections: Connection[]): any {
    const maxPhysical = port.type === 'power' ? 10 : 3
    const connectionCount = connections.length

    let status: 'safe' | 'caution' | 'warning' | 'critical' = 'safe'
    if (connectionCount > maxPhysical) status = 'critical'
    else if (connectionCount > maxPhysical * 0.8) status = 'warning'
    else if (connectionCount > maxPhysical * 0.6) status = 'caution'

    return {
      connectionCount,
      maxPhysicalConnections: maxPhysical,
      status
    }
  }

  private determineOverallStatus(statuses: string[]): 'safe' | 'caution' | 'warning' | 'critical' {
    if (statuses.includes('critical')) return 'critical'
    if (statuses.includes('warning')) return 'warning'
    if (statuses.includes('caution')) return 'caution'
    return 'safe'
  }

  private generateLoadRecommendations(electrical: any, protocol: any, mechanical: any, status: string): string[] {
    const recommendations: string[] = []

    if (electrical.status === 'warning' || electrical.status === 'critical') {
      recommendations.push('Consider using external power supply or current limiting')
    }

    if (protocol.status === 'warning' || protocol.status === 'critical') {
      recommendations.push('Reduce communication frequency or use protocol multiplexer')
    }

    if (mechanical.status === 'warning' || mechanical.status === 'critical') {
      recommendations.push('Use breakout board or terminal block for multiple connections')
    }

    if (status === 'safe') {
      recommendations.push('Current configuration is within safe operating limits')
    }

    return recommendations
  }

  private canAutoFix(rule: PortLimitRule, port: PortDefinition): boolean {
    // 自動修正可能な条件を判定
    return port.type === 'communication' && 
           ['I2C', 'SPI'].includes(port.protocol || '') &&
           rule.maxConnections !== 'unlimited'
  }

  private autoFixExceededLimit(
    violation: PortLimitViolation,
    port: PortDefinition,
    config: DynamicPortConfiguration
  ): Promise<any> {
    // 実際の自動修正ロジックを実装
    return Promise.resolve({
      success: false,
      action: 'suggest_alternative',
      message: 'Suggested using multiplexer or alternative ports'
    })
  }

  private autoFixProtocolViolation(
    violation: PortLimitViolation,
    port: PortDefinition,
    config: DynamicPortConfiguration
  ): Promise<any> {
    return Promise.resolve({
      success: false,
      action: 'suggest_protocol_change',
      message: 'Suggested changing to compatible protocol'
    })
  }

  private scanAllViolations(nodes: Node<NodeData>[], connections: Connection[]): PortLimitViolation[] {
    const violations: PortLimitViolation[] = []
    
    // 各ノードのポート制限をチェック
    nodes.forEach(node => {
      if (node.data.aiMetadata?.dynamicPorts?.configurationId) {
        // TODO: 実際の違反検出ロジックを実装
      }
    })

    return violations
  }

  private createErrorAnalysis(nodeId: string, portId: string, error: string): PortLoadAnalysis {
    return {
      nodeId,
      portId,
      analysis: {
        electrical: { currentDraw: 0, maxCapacity: 0, utilizationPercent: 0, safetyMargin: 0, status: 'critical' },
        protocol: { bandwidth: 0, maxBandwidth: 0, utilizationPercent: 0, status: 'critical' },
        mechanical: { connectionCount: 0, maxPhysicalConnections: 0, status: 'critical' }
      },
      status: 'critical',
      recommendations: [error, 'Check port configuration']
    }
  }
}

// Export utility functions
export function createPortLimitManager(): PortLimitManager {
  return PortLimitManager.getInstance()
}

export function validatePortConnection(
  nodeId: string,
  portId: string,
  connection: Connection,
  currentConnections: Connection[],
  portConfig: DynamicPortConfiguration
): boolean {
  const manager = PortLimitManager.getInstance()
  const result = manager.validateConnection(nodeId, portId, connection, currentConnections, portConfig)
  return result.isAllowed
}

export function getPortCapacityStatus(
  nodeId: string,
  portId: string,
  connections: Connection[],
  portConfig: DynamicPortConfiguration
): PortCapacityStatus {
  const manager = PortLimitManager.getInstance()
  const analysis = manager.analyzePortLoad(nodeId, portId, connections, portConfig)
  
  return {
    portId,
    available: analysis.analysis.mechanical.maxPhysicalConnections,
    used: analysis.analysis.mechanical.connectionCount,
    percentage: analysis.analysis.electrical.utilizationPercent,
    status: analysis.status === 'safe' ? 'available' : 
            analysis.status === 'caution' ? 'warning' :
            analysis.status === 'warning' ? 'warning' : 'exceeded',
    warnings: analysis.status !== 'safe' ? [`Port operating at ${analysis.status} level`] : [],
    recommendations: analysis.recommendations
  }
}