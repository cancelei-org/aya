// 🔌 ポートレベルの互換性チェッカー
// 動的ポート間の詳細な互換性を検証

import type { Connection, NodeData } from '@/types'
import type { Node } from '@xyflow/react'
import type { PortDefinition } from '../ports/dynamicPortSystem'
import { DynamicPortSystem } from '../ports/dynamicPortSystem'

export interface PortCompatibilityResult {
  isCompatible: boolean
  errors: string[]
  warnings: string[]
  suggestions?: string[]
}

export class PortCompatibilityChecker {
  private static instance: PortCompatibilityChecker
  private dynamicPortSystem: DynamicPortSystem

  private constructor() {
    this.dynamicPortSystem = DynamicPortSystem.getInstance()
  }

  static getInstance(): PortCompatibilityChecker {
    if (!this.instance) {
      this.instance = new PortCompatibilityChecker()
    }
    return this.instance
  }

  /**
   * ポート間の互換性をチェック
   */
  checkPortCompatibility(
    sourceNodeId: string,
    sourcePortId: string,
    targetNodeId: string,
    targetPortId: string,
    nodes: Node<NodeData>[]
  ): PortCompatibilityResult {
    const errors: string[] = []
    const warnings: string[] = []
    const suggestions: string[] = []

    // ポートIDを正規化（_source、_targetサフィックスを除去）
    const normalizedSourcePortId = sourcePortId.replace(/_source$|_target$/, '')
    const normalizedTargetPortId = targetPortId.replace(/_source$|_target$/, '')
    
    console.log('🔍 [PortCompatibility] Port ID normalization:', {
      original: { source: sourcePortId, target: targetPortId },
      normalized: { source: normalizedSourcePortId, target: normalizedTargetPortId }
    })

    // ポート情報を取得（キャッシュまたはノードデータから）
    let sourcePort: PortDefinition | null = null
    let targetPort: PortDefinition | null = null

    // まずキャッシュから取得を試みる
    const sourceConfig = this.dynamicPortSystem.getPortConfiguration(sourceNodeId)
    const targetConfig = this.dynamicPortSystem.getPortConfiguration(targetNodeId)

    if (sourceConfig && targetConfig) {
      sourcePort = this.findPort(sourceConfig.portGroups, normalizedSourcePortId)
      targetPort = this.findPort(targetConfig.portGroups, normalizedTargetPortId)
    }

    // キャッシュにない場合は、ノードのdata.portsから取得
    if (!sourcePort || !targetPort) {
      const sourceNode = nodes.find(n => n.id === sourceNodeId)
      const targetNode = nodes.find(n => n.id === targetNodeId)

      if (sourceNode?.data?.ports && targetNode?.data?.ports) {
        // node.data.portsから直接ポート情報を取得（正規化されたIDで検索）
        sourcePort = sourcePort || sourceNode.data.ports.find((p: any) => p.id === normalizedSourcePortId)
        targetPort = targetPort || targetNode.data.ports.find((p: any) => p.id === normalizedTargetPortId)

        // DynamicPortSystemのキャッシュを再構築（今後のために）
        if (sourcePort && !sourceConfig) {
          this.rebuildPortConfiguration(sourceNodeId, sourceNode)
        }
        if (targetPort && !targetConfig) {
          this.rebuildPortConfiguration(targetNodeId, targetNode)
        }
      }
    }

    if (!sourcePort || !targetPort) {
      errors.push(`Port not found: ${!sourcePort ? normalizedSourcePortId : normalizedTargetPortId}`)
      console.error('Port lookup failed:', {
        sourceNodeId, 
        sourcePortId: { original: sourcePortId, normalized: normalizedSourcePortId },
        sourcePort,
        targetNodeId, 
        targetPortId: { original: targetPortId, normalized: normalizedTargetPortId },
        targetPort,
        sourceConfig: !!sourceConfig,
        targetConfig: !!targetConfig
      })
      return { isCompatible: false, errors, warnings }
    }

    // ポートのdirectionプロパティを補完
    console.log('🔍 [PortCompatibility] Before direction completion:', {
      sourcePort: { id: sourcePort.id, label: sourcePort.label, type: sourcePort.type, direction: sourcePort.direction },
      targetPort: { id: targetPort.id, label: targetPort.label, type: targetPort.type, direction: targetPort.direction }
    })
    
    sourcePort = this.ensurePortDirection(sourcePort)
    targetPort = this.ensurePortDirection(targetPort)
    
    console.log('🔍 [PortCompatibility] After direction completion:', {
      sourcePort: { id: sourcePort.id, label: sourcePort.label, type: sourcePort.type, direction: sourcePort.direction },
      targetPort: { id: targetPort.id, label: targetPort.label, type: targetPort.type, direction: targetPort.direction }
    })

    // 1. 方向性チェック
    const directionOk = this.checkDirectionCompatibility(sourcePort, targetPort)
    console.log('🔍 [PortCompatibility] Direction check:', {
      result: directionOk,
      sourceDirection: sourcePort.direction,
      targetDirection: targetPort.direction,
      sourceType: sourcePort.type,
      targetType: targetPort.type
    })
    
    if (!directionOk) {
      // 通信ポートの場合は方向性チェックをスキップ
      if (sourcePort.type !== 'communication' && targetPort.type !== 'communication') {
        errors.push(`Direction mismatch: ${sourcePort.direction} → ${targetPort.direction}`)
        console.log('🔍 [PortCompatibility] Direction error added (not communication ports)')
      } else {
        console.log('🔍 [PortCompatibility] Direction check skipped for communication ports')
      }
    }

    // 2. プロトコル互換性チェック
    const protocolCheck = this.checkProtocolCompatibility(sourcePort, targetPort)
    if (!protocolCheck.compatible) {
      errors.push(protocolCheck.error!)
      if (protocolCheck.suggestion) {
        suggestions.push(protocolCheck.suggestion)
      }
    }

    // 3. 電圧互換性チェック（電源ポートの場合）
    if (sourcePort.type === 'power' || targetPort.type === 'power') {
      const voltageCheck = this.checkVoltageCompatibility(sourcePort, targetPort)
      if (!voltageCheck.compatible) {
        if (voltageCheck.severity === 'error') {
          errors.push(voltageCheck.message)
        } else {
          warnings.push(voltageCheck.message)
        }
      }
    }

    // 4. ピン固有の互換性チェック
    const pinCheck = this.checkPinSpecificCompatibility(sourcePort, targetPort)
    if (!pinCheck.compatible) {
      errors.push(pinCheck.error!)
    }

    const result = {
      isCompatible: errors.length === 0,
      errors,
      warnings,
      suggestions: suggestions.length > 0 ? suggestions : undefined
    }
    
    console.log('🔍 [PortCompatibility] Final result:', result)
    
    return result
  }

  /**
   * ポートを検索
   */
  private findPort(portGroups: any[], portId: string): PortDefinition | null {
    for (const group of portGroups) {
      const port = group.ports.find((p: PortDefinition) => p.id === portId)
      if (port) return port
    }
    return null
  }

  /**
   * 方向性の互換性をチェック
   */
  private checkDirectionCompatibility(source: PortDefinition, target: PortDefinition): boolean {
    // 双方向ポートは常に接続可能
    if (source.direction === 'bidirectional' || target.direction === 'bidirectional') {
      return true
    }

    // 出力→入力のみ許可
    return source.direction === 'output' && target.direction === 'input'
  }

  /**
   * プロトコル互換性をチェック
   */
  private checkProtocolCompatibility(
    source: PortDefinition, 
    target: PortDefinition
  ): { compatible: boolean; error?: string; suggestion?: string } {
    // プロトコルが指定されていない場合は互換とみなす
    if (!source.protocol || !target.protocol) {
      return { compatible: true }
    }

    // 同じプロトコルなら互換
    if (source.protocol === target.protocol) {
      // I2C、SPIなどの特定プロトコルの場合、ピン名もチェック
      if (['I2C', 'SPI', 'UART'].includes(source.protocol)) {
        return this.checkSpecificProtocolPins(source, target)
      }
      return { compatible: true }
    }

    // 異なるプロトコルは非互換
    return {
      compatible: false,
      error: `Protocol mismatch: ${source.protocol} ↔ ${target.protocol}`,
      suggestion: `Use same protocol for both connections`
    }
  }

  /**
   * 特定プロトコルのピン互換性チェック
   */
  private checkSpecificProtocolPins(
    source: PortDefinition, 
    target: PortDefinition
  ): { compatible: boolean; error?: string; suggestion?: string } {
    const sourceLabel = source.label.toUpperCase()
    const targetLabel = target.label.toUpperCase()

    switch (source.protocol) {
      case 'I2C':
        // SDA同士、SCL同士のみ接続可能
        if ((sourceLabel.includes('SDA') && !targetLabel.includes('SDA')) ||
            (sourceLabel.includes('SCL') && !targetLabel.includes('SCL'))) {
          return {
            compatible: false,
            error: `I2C pin mismatch: ${source.label} cannot connect to ${target.label}`,
            suggestion: 'Connect SDA to SDA, SCL to SCL'
          }
        }
        break

      case 'SPI':
        // MISO→MISO、MOSI→MOSI、SCK→SCK、CS→CS
        const spiPins = ['MISO', 'MOSI', 'SCK', 'CS', 'SS']
        const sourcePin = spiPins.find(pin => sourceLabel.includes(pin))
        const targetPin = spiPins.find(pin => targetLabel.includes(pin))
        
        if (sourcePin !== targetPin) {
          return {
            compatible: false,
            error: `SPI pin mismatch: ${source.label} cannot connect to ${target.label}`,
            suggestion: `Connect ${sourcePin} to ${sourcePin}`
          }
        }
        break

      case 'UART':
        // TX→RX、RX→TX（クロス接続）
        if ((sourceLabel.includes('TX') && !targetLabel.includes('RX')) ||
            (sourceLabel.includes('RX') && !targetLabel.includes('TX'))) {
          return {
            compatible: false,
            error: `UART requires cross connection: ${source.label} → ${target.label}`,
            suggestion: 'Connect TX to RX, RX to TX'
          }
        }
        break
    }

    return { compatible: true }
  }

  /**
   * 電圧互換性をチェック
   */
  private checkVoltageCompatibility(
    source: PortDefinition, 
    target: PortDefinition
  ): { compatible: boolean; severity: 'error' | 'warning'; message: string } {
    const sourceVoltage = this.parseVoltage(source.voltage)
    const targetVoltage = this.parseVoltage(target.voltage)

    if (sourceVoltage === null || targetVoltage === null) {
      return { compatible: true, severity: 'warning', message: '' }
    }

    // GNDは常に互換
    if (sourceVoltage === 0 || targetVoltage === 0) {
      return { compatible: true, severity: 'warning', message: '' }
    }

    // 電圧差をチェック
    const voltageDiff = Math.abs(sourceVoltage - targetVoltage)
    
    if (voltageDiff === 0) {
      return { compatible: true, severity: 'warning', message: '' }
    } else if (voltageDiff <= 0.3) {
      // 0.3V以内の差は警告
      return {
        compatible: true,
        severity: 'warning',
        message: `Small voltage difference: ${source.voltage} ↔ ${target.voltage}`
      }
    } else {
      // それ以上の差はエラー
      return {
        compatible: false,
        severity: 'error',
        message: `Voltage mismatch: ${source.voltage} ↔ ${target.voltage}. Use level shifter.`
      }
    }
  }

  /**
   * ピン固有の互換性チェック
   */
  private checkPinSpecificCompatibility(
    source: PortDefinition, 
    target: PortDefinition
  ): { compatible: boolean; error?: string } {
    // アナログ出力は アナログ入力にのみ接続可能
    if (source.protocol === 'Analog' && source.direction === 'output') {
      if (target.protocol !== 'Analog' || target.direction !== 'input') {
        return {
          compatible: false,
          error: 'Analog output must connect to analog input'
        }
      }
    }

    // デジタルポートの互換性
    if (source.protocol === 'Digital' || target.protocol === 'Digital') {
      // PWMは通常のデジタル入力には接続できるが、逆は警告
      if (source.label.includes('PWM') && !target.label.includes('PWM')) {
        // PWM→Digital は OK（ただし機能は制限される）
        return { compatible: true }
      }
    }

    return { compatible: true }
  }

  /**
   * 電圧文字列をパース
   */
  private parseVoltage(voltageStr?: string): number | null {
    if (!voltageStr) return null
    
    const match = voltageStr.match(/(\d+\.?\d*)V?/i)
    if (match) {
      return parseFloat(match[1])
    }
    
    return null
  }

  /**
   * ポートのdirectionプロパティを補完
   */
  private ensurePortDirection(port: PortDefinition): PortDefinition {
    // すでにdirectionがある場合はそのまま返す
    if (port.direction) {
      return port
    }

    // directionがない場合は、ポートタイプから推測
    let direction: 'input' | 'output' | 'bidirectional' = 'bidirectional'

    // 通信ポートはすべて双方向
    if (port.type === 'communication') {
      direction = 'bidirectional'
    }
    // 電源ポートの場合
    else if (port.type === 'power') {
      // 出力を示すラベル
      if (port.label.toLowerCase().includes('out') || 
          port.id.includes('power_out')) {
        direction = 'output'
      }
      // その他の電源ポートは入力
      else {
        direction = 'input'
      }
    }

    // directionを追加した新しいオブジェクトを返す
    return {
      ...port,
      direction
    }
  }

  /**
   * ノードデータからポート設定を再構築
   */
  private rebuildPortConfiguration(nodeId: string, node: Node<NodeData>): void {
    if (!node.data?.ports || !Array.isArray(node.data.ports)) return

    // ポートをグループ化
    const portGroups: any[] = []
    const groupMap = new Map<string, any>()

    // ポートタイプごとにグループ化
    node.data.ports.forEach((port: any) => {
      let groupType = 'communication'
      let groupName = 'Communication'
      let groupColor = '#3b82f6'

      if (port.type === 'power') {
        groupType = 'power'
        groupName = 'Power'
        groupColor = '#ef4444'
      } else if (port.protocol === 'Analog') {
        groupType = 'analog'
        groupName = 'Analog'
        groupColor = '#f59e0b'
      } else if (port.protocol === 'Digital' || port.protocol === 'GPIO') {
        groupType = 'gpio'
        groupName = 'GPIO'
        groupColor = '#10b981'
      }

      if (!groupMap.has(groupType)) {
        const group = {
          id: groupType,
          name: groupName,
          type: groupType,
          ports: [],
          color: groupColor,
          priority: groupType === 'power' ? 1 : 2
        }
        groupMap.set(groupType, group)
        portGroups.push(group)
      }

      groupMap.get(groupType).ports.push(port)
    })

    // DynamicPortSystemに登録
    const config = {
      nodeId,
      componentName: node.data.title || 'Unknown',
      totalPins: node.data.ports.length,
      portGroups,
      layoutMode: 'compact' as const,
      autoLayout: true,
      generatedFrom: 'manual' as const,
      lastUpdated: new Date().toISOString()
    }

    this.dynamicPortSystem.updatePortConfiguration(nodeId, config)
  }
}

// エクスポート用ヘルパー関数
export function checkPortCompatibility(
  sourceNodeId: string,
  sourcePortId: string,
  targetNodeId: string,
  targetPortId: string,
  nodes: Node<NodeData>[]
): PortCompatibilityResult {
  const checker = PortCompatibilityChecker.getInstance()
  return checker.checkPortCompatibility(
    sourceNodeId,
    sourcePortId,
    targetNodeId,
    targetPortId,
    nodes
  )
}