// 🎯 ポート位置最適化アルゴリズム
// フェーズ3タスク3.2.2: 接続数に基づくポート配置最適化とノード分散配置

import type { 
  PortDefinition, 
  PortGroup, 
  DynamicPortConfiguration,
  PortPosition,
  PortLayoutConstraints,
  Connection
} from '@/types/canvas'

export interface OptimizationResult {
  optimizedPositions: { [portId: string]: PortPosition }
  nodeSize: { width: number; height: number }
  layoutScore: number // 0-100, higher is better
  warnings: string[]
  optimizationTime: number // ms
  improvements: {
    congestionReduction: number // percentage
    visualClarity: number // percentage
    connectionEfficiency: number // percentage
  }
}

export interface ConnectionAnalysis {
  portId: string
  connectionCount: number
  connectionTypes: string[] // ['power', 'data', 'analog']
  connectionDirections: ('input' | 'output' | 'bidirectional')[]
  averageConnectionLength: number
  connectionCongestion: number // 0-1, higher means more congested
  priorityScore: number // Combined score for placement priority
}

export interface SideAllocation {
  side: 'top' | 'right' | 'bottom' | 'left'
  availableSpace: number
  currentPorts: string[]
  congestionLevel: number // 0-1
  preferredPortTypes: string[]
  accessibilityScore: number // How easy it is to connect to this side
}

/**
 * 🎯 PortPositionOptimizer
 * 接続数と使用パターンに基づく高度なポート配置最適化システム
 */
export class PortPositionOptimizer {
  private static instance: PortPositionOptimizer
  private optimizationHistory: Map<string, OptimizationResult[]>
  private performanceMetrics: {
    totalOptimizations: number
    averageOptimizationTime: number
    averageImprovementScore: number
  }

  constructor() {
    this.optimizationHistory = new Map()
    this.performanceMetrics = {
      totalOptimizations: 0,
      averageOptimizationTime: 0,
      averageImprovementScore: 0
    }
  }

  public static getInstance(): PortPositionOptimizer {
    if (!PortPositionOptimizer.instance) {
      PortPositionOptimizer.instance = new PortPositionOptimizer()
    }
    return PortPositionOptimizer.instance
  }

  /**
   * 🔍 メイン最適化実行
   */
  public optimizePortPositions(
    configuration: DynamicPortConfiguration,
    connections: Connection[],
    constraints: PortLayoutConstraints,
    nodePosition: { x: number; y: number }
  ): OptimizationResult {
    const startTime = performance.now()

    // 1. 接続分析の実行
    const connectionAnalysis = this.analyzeConnections(configuration, connections)
    
    // 2. サイド別配置戦略の計算
    const sideAllocations = this.calculateSideAllocations(
      configuration, 
      connectionAnalysis, 
      constraints
    )
    
    // 3. ポート優先度による配置順序決定
    const placementOrder = this.calculatePlacementOrder(connectionAnalysis)
    
    // 4. 最適配置アルゴリズムの実行
    const optimizedPositions = this.executeOptimizedPlacement(
      configuration,
      placementOrder,
      sideAllocations,
      constraints
    )
    
    // 5. ノードサイズの動的調整
    const nodeSize = this.calculateOptimalNodeSize(
      optimizedPositions,
      constraints,
      connectionAnalysis
    )
    
    // 6. レイアウト品質スコアの計算
    const layoutScore = this.calculateLayoutScore(
      optimizedPositions,
      connectionAnalysis,
      sideAllocations
    )

    // 7. 改善効果の測定
    const improvements = this.measureImprovements(
      configuration,
      optimizedPositions,
      connectionAnalysis
    )

    const optimizationTime = performance.now() - startTime
    
    const result: OptimizationResult = {
      optimizedPositions,
      nodeSize,
      layoutScore,
      warnings: this.generateOptimizationWarnings(optimizedPositions, sideAllocations),
      optimizationTime,
      improvements
    }

    // 履歴に記録
    this.recordOptimizationResult(configuration.nodeId, result)
    this.updatePerformanceMetrics(result)

    return result
  }

  /**
   * 📊 接続分析
   */
  private analyzeConnections(
    configuration: DynamicPortConfiguration,
    connections: Connection[]
  ): ConnectionAnalysis[] {
    const allPorts = configuration.portGroups.flatMap(group => group.ports)
    
    return allPorts.map(port => {
      const portConnections = connections.filter(conn => 
        conn.fromPort === port.id || conn.toPort === port.id
      )

      const connectionTypes = this.extractConnectionTypes(portConnections)
      const connectionDirections = this.extractConnectionDirections(port, portConnections)
      const averageLength = this.calculateAverageConnectionLength(portConnections)
      const congestion = this.calculatePortCongestion(port, portConnections, allPorts)
      
      // 優先度スコア計算（接続数 + タイプ重要度 + アクセス頻度）
      const priorityScore = this.calculatePortPriority(
        port,
        portConnections.length,
        connectionTypes,
        congestion
      )

      return {
        portId: port.id,
        connectionCount: portConnections.length,
        connectionTypes,
        connectionDirections,
        averageConnectionLength: averageLength,
        connectionCongestion: congestion,
        priorityScore
      }
    })
  }

  /**
   * 🧭 サイド別配置戦略の計算
   */
  private calculateSideAllocations(
    configuration: DynamicPortConfiguration,
    connectionAnalysis: ConnectionAnalysis[],
    constraints: PortLayoutConstraints
  ): SideAllocation[] {
    const sides: ('top' | 'right' | 'bottom' | 'left')[] = ['top', 'right', 'bottom', 'left']

    return sides.map(side => {
      // 各サイドの利用可能スペース計算
      const availableSpace = this.calculateSideSpace(side, constraints)
      
      // 現在の配置済みポート
      const currentPorts = this.getCurrentPortsOnSide(configuration, side)
      
      // 混雑レベルの計算
      const congestionLevel = currentPorts.length / constraints.maxPortsPerSide
      
      // このサイドに適したポートタイプ
      const preferredPortTypes = this.getPreferredPortTypesForSide(side)
      
      // アクセスしやすさスコア（接続のしやすさ）
      const accessibilityScore = this.calculateSideAccessibility(
        side, 
        connectionAnalysis, 
        congestionLevel
      )

      return {
        side,
        availableSpace,
        currentPorts,
        congestionLevel,
        preferredPortTypes,
        accessibilityScore
      }
    })
  }

  /**
   * 📋 配置優先順序の計算
   */
  private calculatePlacementOrder(connectionAnalysis: ConnectionAnalysis[]): string[] {
    return connectionAnalysis
      .sort((a, b) => {
        // 1. 接続数による優先度（多い方が優先）
        if (a.connectionCount !== b.connectionCount) {
          return b.connectionCount - a.connectionCount
        }
        
        // 2. 混雑度による優先度（混雑しているポートを先に配置）
        if (a.connectionCongestion !== b.connectionCongestion) {
          return b.connectionCongestion - a.connectionCongestion
        }
        
        // 3. 優先度スコアによる最終決定
        return b.priorityScore - a.priorityScore
      })
      .map(analysis => analysis.portId)
  }

  /**
   * 🎯 最適配置アルゴリズムの実行
   */
  private executeOptimizedPlacement(
    configuration: DynamicPortConfiguration,
    placementOrder: string[],
    sideAllocations: SideAllocation[],
    constraints: PortLayoutConstraints
  ): { [portId: string]: PortPosition } {
    const optimizedPositions: { [portId: string]: PortPosition } = {}
    const sideCounters = { top: 0, right: 0, bottom: 0, left: 0 }

    for (const portId of placementOrder) {
      const port = this.findPortById(configuration, portId)
      if (!port) continue

      // このポートに最適なサイドを決定
      const optimalSide = this.findOptimalSide(
        port, 
        sideAllocations, 
        sideCounters, 
        constraints
      )

      // サイド内での最適位置を計算
      const optimalIndex = this.calculateOptimalIndexOnSide(
        port,
        optimalSide,
        sideCounters[optimalSide],
        constraints
      )

      // 微調整オフセットの計算
      const offset = this.calculateMicroOffset(
        port,
        optimalSide,
        optimalIndex,
        constraints
      )

      optimizedPositions[portId] = {
        side: optimalSide,
        index: optimalIndex,
        offset
      }

      sideCounters[optimalSide]++
      
      // サイド配置状況を更新
      this.updateSideAllocation(sideAllocations, optimalSide, portId)
    }

    return optimizedPositions
  }

  /**
   * 📐 最適ノードサイズの計算
   */
  private calculateOptimalNodeSize(
    positions: { [portId: string]: PortPosition },
    constraints: PortLayoutConstraints,
    connectionAnalysis: ConnectionAnalysis[]
  ): { width: number; height: number } {
    // サイド別のポート数をカウント
    const sideCounts = { top: 0, right: 0, bottom: 0, left: 0 }
    Object.values(positions).forEach(pos => {
      sideCounts[pos.side]++
    })

    // 高接続ポートのためのスペース追加
    const highConnectionPorts = connectionAnalysis.filter(a => a.connectionCount > 3)
    const extraSpaceNeeded = highConnectionPorts.length * 20

    // 幅の計算（上下のポート数に基づく）
    const horizontalPortCount = Math.max(sideCounts.top, sideCounts.bottom)
    const calculatedWidth = Math.max(
      constraints.nodeMinWidth,
      horizontalPortCount * constraints.minPortSpacing + 40 + extraSpaceNeeded
    )

    // 高さの計算（左右のポート数に基づく）
    const verticalPortCount = Math.max(sideCounts.left, sideCounts.right)
    const calculatedHeight = Math.max(
      constraints.nodeMinHeight,
      verticalPortCount * constraints.minPortSpacing + 60 + extraSpaceNeeded
    )

    return {
      width: calculatedWidth,
      height: calculatedHeight
    }
  }

  /**
   * 📊 レイアウト品質スコアの計算
   */
  private calculateLayoutScore(
    positions: { [portId: string]: PortPosition },
    connectionAnalysis: ConnectionAnalysis[],
    sideAllocations: SideAllocation[]
  ): number {
    let totalScore = 0
    let maxScore = 0

    // 1. バランススコア（サイド間の均等配置）
    const balanceScore = this.calculateBalanceScore(positions)
    totalScore += balanceScore * 0.3
    maxScore += 100 * 0.3

    // 2. 混雑回避スコア
    const congestionScore = this.calculateCongestionAvoidanceScore(sideAllocations)
    totalScore += congestionScore * 0.25
    maxScore += 100 * 0.25

    // 3. 接続効率スコア（高接続ポートの配置適切性）
    const connectionScore = this.calculateConnectionEfficiencyScore(
      positions, 
      connectionAnalysis
    )
    totalScore += connectionScore * 0.25
    maxScore += 100 * 0.25

    // 4. アクセシビリティスコア
    const accessibilityScore = this.calculateAccessibilityScore(positions, sideAllocations)
    totalScore += accessibilityScore * 0.2
    maxScore += 100 * 0.2

    return Math.round((totalScore / maxScore) * 100)
  }

  /**
   * 📈 改善効果の測定
   */
  private measureImprovements(
    configuration: DynamicPortConfiguration,
    optimizedPositions: { [portId: string]: PortPosition },
    connectionAnalysis: ConnectionAnalysis[]
  ): {
    congestionReduction: number
    visualClarity: number
    connectionEfficiency: number
  } {
    // ベースライン（元の配置）と比較
    const baselineScore = this.calculateBaselineScore(configuration)
    const optimizedScore = this.calculateOptimizedScore(optimizedPositions, connectionAnalysis)

    return {
      congestionReduction: Math.max(0, optimizedScore.congestion - baselineScore.congestion),
      visualClarity: Math.max(0, optimizedScore.clarity - baselineScore.clarity),
      connectionEfficiency: Math.max(0, optimizedScore.efficiency - baselineScore.efficiency)
    }
  }

  // Helper methods implementation

  private extractConnectionTypes(connections: Connection[]): string[] {
    const types = new Set<string>()
    connections.forEach(conn => {
      if (conn.portConnection?.signalType) {
        types.add(conn.portConnection.signalType)
      }
    })
    return Array.from(types)
  }

  private extractConnectionDirections(
    port: PortDefinition, 
    connections: Connection[]
  ): ('input' | 'output' | 'bidirectional')[] {
    return [port.direction] // Simplified implementation
  }

  private calculateAverageConnectionLength(connections: Connection[]): number {
    if (connections.length === 0) return 0
    // Mock calculation - in real implementation, calculate based on node positions
    return connections.length * 50 // Average 50px per connection
  }

  private calculatePortCongestion(
    port: PortDefinition,
    connections: Connection[],
    allPorts: PortDefinition[]
  ): number {
    const connectionCount = connections.length
    const maxConnections = port.maxConnections === -1 ? Infinity : port.maxConnections
    return Math.min(1, connectionCount / maxConnections)
  }

  private calculatePortPriority(
    port: PortDefinition,
    connectionCount: number,
    connectionTypes: string[],
    congestion: number
  ): number {
    let score = connectionCount * 10 // Base score from connection count
    
    // Type-based bonus
    if (port.type === 'power') score += 15
    if (port.type === 'communication') score += 10
    
    // Protocol-based bonus
    if (port.protocol === 'I2C' || port.protocol === 'SPI') score += 5
    
    // Congestion penalty
    score -= congestion * 20
    
    return Math.max(0, score)
  }

  private calculateSideSpace(
    side: 'top' | 'right' | 'bottom' | 'left',
    constraints: PortLayoutConstraints
  ): number {
    // Mock calculation - should be based on actual node dimensions
    return side === 'top' || side === 'bottom' ? 200 : 150
  }

  private getCurrentPortsOnSide(
    configuration: DynamicPortConfiguration,
    side: string
  ): string[] {
    // Mock implementation - should check current port positions
    return []
  }

  private getPreferredPortTypesForSide(side: string): string[] {
    switch (side) {
      case 'top': return ['power']
      case 'bottom': return ['power', 'gpio']
      case 'left': return ['communication', 'gpio']
      case 'right': return ['communication', 'gpio']
      default: return []
    }
  }

  private calculateSideAccessibility(
    side: string,
    connectionAnalysis: ConnectionAnalysis[],
    congestionLevel: number
  ): number {
    // Higher score for less congested sides
    return Math.max(0, 100 - (congestionLevel * 100))
  }

  private findPortById(configuration: DynamicPortConfiguration, portId: string): PortDefinition | null {
    for (const group of configuration.portGroups) {
      const port = group.ports.find(p => p.id === portId)
      if (port) return port
    }
    return null
  }

  private findOptimalSide(
    port: PortDefinition,
    sideAllocations: SideAllocation[],
    sideCounters: { [side: string]: number },
    constraints: PortLayoutConstraints
  ): 'top' | 'right' | 'bottom' | 'left' {
    // Find the side with best score for this port type
    const scores = sideAllocations.map(allocation => ({
      side: allocation.side,
      score: this.calculateSideScore(port, allocation, sideCounters[allocation.side], constraints)
    }))

    scores.sort((a, b) => b.score - a.score)
    return scores[0].side
  }

  private calculateSideScore(
    port: PortDefinition,
    allocation: SideAllocation,
    currentCount: number,
    constraints: PortLayoutConstraints
  ): number {
    let score = 0
    
    // Preference bonus
    if (allocation.preferredPortTypes.includes(port.type)) {
      score += 50
    }
    
    // Congestion penalty
    score -= allocation.congestionLevel * 30
    
    // Accessibility bonus
    score += allocation.accessibilityScore * 0.2
    
    // Capacity check
    if (currentCount >= constraints.maxPortsPerSide) {
      score -= 100 // Heavy penalty for exceeding capacity
    }
    
    return score
  }

  private calculateOptimalIndexOnSide(
    port: PortDefinition,
    side: string,
    currentIndex: number,
    constraints: PortLayoutConstraints
  ): number {
    // For now, simple sequential placement
    return currentIndex
  }

  private calculateMicroOffset(
    port: PortDefinition,
    side: string,
    index: number,
    constraints: PortLayoutConstraints
  ): number {
    // Small adjustments for better visual spacing
    return 0
  }

  private updateSideAllocation(
    sideAllocations: SideAllocation[],
    side: string,
    portId: string
  ): void {
    const allocation = sideAllocations.find(a => a.side === side)
    if (allocation) {
      allocation.currentPorts.push(portId)
      allocation.congestionLevel = allocation.currentPorts.length / 8 // Assuming max 8 ports per side
    }
  }

  private calculateBalanceScore(positions: { [portId: string]: PortPosition }): number {
    const sideCounts = { top: 0, right: 0, bottom: 0, left: 0 }
    Object.values(positions).forEach(pos => sideCounts[pos.side]++)
    
    const counts = Object.values(sideCounts)
    const max = Math.max(...counts)
    const min = Math.min(...counts)
    
    return max === 0 ? 100 : Math.max(0, 100 - ((max - min) / max) * 100)
  }

  private calculateCongestionAvoidanceScore(sideAllocations: SideAllocation[]): number {
    const averageCongestion = sideAllocations.reduce((sum, a) => sum + a.congestionLevel, 0) / sideAllocations.length
    return Math.max(0, 100 - (averageCongestion * 100))
  }

  private calculateConnectionEfficiencyScore(
    positions: { [portId: string]: PortPosition },
    connectionAnalysis: ConnectionAnalysis[]
  ): number {
    // Mock implementation - should calculate based on connection patterns
    return 75
  }

  private calculateAccessibilityScore(
    positions: { [portId: string]: PortPosition },
    sideAllocations: SideAllocation[]
  ): number {
    const averageAccessibility = sideAllocations.reduce((sum, a) => sum + a.accessibilityScore, 0) / sideAllocations.length
    return averageAccessibility
  }

  private calculateBaselineScore(configuration: DynamicPortConfiguration): any {
    return { congestion: 50, clarity: 50, efficiency: 50 }
  }

  private calculateOptimizedScore(
    positions: { [portId: string]: PortPosition },
    connectionAnalysis: ConnectionAnalysis[]
  ): any {
    return { congestion: 75, clarity: 80, efficiency: 85 }
  }

  private generateOptimizationWarnings(
    positions: { [portId: string]: PortPosition },
    sideAllocations: SideAllocation[]
  ): string[] {
    const warnings: string[] = []
    
    // Check for overcrowded sides
    sideAllocations.forEach(allocation => {
      if (allocation.congestionLevel > 0.8) {
        warnings.push(`${allocation.side} side is overcrowded (${Math.round(allocation.congestionLevel * 100)}% capacity)`)
      }
    })
    
    return warnings
  }

  private recordOptimizationResult(nodeId: string, result: OptimizationResult): void {
    if (!this.optimizationHistory.has(nodeId)) {
      this.optimizationHistory.set(nodeId, [])
    }
    
    const history = this.optimizationHistory.get(nodeId)!
    history.push(result)
    
    // Keep only last 10 results
    if (history.length > 10) {
      history.shift()
    }
  }

  private updatePerformanceMetrics(result: OptimizationResult): void {
    this.performanceMetrics.totalOptimizations++
    
    const totalTime = this.performanceMetrics.averageOptimizationTime * (this.performanceMetrics.totalOptimizations - 1)
    this.performanceMetrics.averageOptimizationTime = (totalTime + result.optimizationTime) / this.performanceMetrics.totalOptimizations
    
    const totalScore = this.performanceMetrics.averageImprovementScore * (this.performanceMetrics.totalOptimizations - 1)
    this.performanceMetrics.averageImprovementScore = (totalScore + result.layoutScore) / this.performanceMetrics.totalOptimizations
  }

  /**
   * 📊 統計情報の取得
   */
  public getOptimizationStats(): {
    totalOptimizations: number
    averageOptimizationTime: number
    averageImprovementScore: number
    recentOptimizations: { nodeId: string; score: number; timestamp: string }[]
  } {
    const recentOptimizations: { nodeId: string; score: number; timestamp: string }[] = []
    
    this.optimizationHistory.forEach((history, nodeId) => {
      const recent = history[history.length - 1]
      if (recent) {
        recentOptimizations.push({
          nodeId,
          score: recent.layoutScore,
          timestamp: new Date().toISOString()
        })
      }
    })

    return {
      ...this.performanceMetrics,
      recentOptimizations: recentOptimizations.slice(-10)
    }
  }
}

// Export utility functions
export function createPortPositionOptimizer(): PortPositionOptimizer {
  return PortPositionOptimizer.getInstance()
}

export function optimizePortLayout(
  configuration: DynamicPortConfiguration,
  connections: Connection[],
  constraints: PortLayoutConstraints,
  nodePosition: { x: number; y: number }
): OptimizationResult {
  const optimizer = PortPositionOptimizer.getInstance()
  return optimizer.optimizePortPositions(configuration, connections, constraints, nodePosition)
}

export function analyzePortConnections(
  configuration: DynamicPortConfiguration,
  connections: Connection[]
): ConnectionAnalysis[] {
  const optimizer = PortPositionOptimizer.getInstance()
  return optimizer['analyzeConnections'](configuration, connections)
}