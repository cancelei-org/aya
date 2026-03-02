// 🧭 接続方向性判定管理システム
// 要件4: 接続方向性の適切な判定機能
// 電力接続（供給者→消費者）と通信プロトコル（双方向・単方向）の方向性を正確に判定

import type { Connection, NodeData } from '@/types'
import type { Node } from '@xyflow/react'

// 方向性判定結果
export interface DirectionalityResult {
  isValid: boolean
  direction: 'supplier_to_consumer' | 'bidirectional' | 'unidirectional' | 'invalid'
  connectionType: 'power' | 'communication'
  issue?: string
  recommendation?: string
  severity: 'info' | 'warning' | 'critical'
  details: {
    fromRole?: string
    toRole?: string
    protocol?: string
    voltageLevel?: string
    powerCapacity?: PowerCapacityInfo
  }
}

// 電力容量情報
export interface PowerCapacityInfo {
  supplierCapacity: number      // 供給能力（mA）
  consumerRequirement: number   // 消費要求（mA）
  isAdequate: boolean          // 容量十分性
  shortfall?: number           // 不足量（mA）
  recommendation?: string      // 推奨対策
}

// プロトコル情報
export interface ProtocolInfo {
  name: string
  voltageLevel: string
  isCompatible: boolean
  requiresLevelShifter: boolean
  recommendedIC?: string
}

// 部品役割の定義
export type ComponentRole = 'power_supplier' | 'power_consumer' | 'communication_master' | 'communication_slave' | 'bidirectional' | 'unknown'

/**
 * 🧭 ConnectionDirectionalityManager
 * 接続方向性の適切な判定を行う専門クラス
 */
export class ConnectionDirectionalityManager {
  private static instance: ConnectionDirectionalityManager

  // シングルトンパターンで一貫性を保つ
  public static getInstance(): ConnectionDirectionalityManager {
    if (!ConnectionDirectionalityManager.instance) {
      ConnectionDirectionalityManager.instance = new ConnectionDirectionalityManager()
    }
    return ConnectionDirectionalityManager.instance
  }

  /**
   * ポートIDからプロトコルを推測
   */
  private getProtocolFromPortId(portId: string): string | null {
    if (!portId) return null
    
    const portIdLower = portId.toLowerCase()
    
    if (portIdLower.includes('i2c') || portIdLower.includes('sda') || portIdLower.includes('scl')) {
      return 'I2C'
    }
    if (portIdLower.includes('spi') || portIdLower.includes('miso') || portIdLower.includes('mosi') || portIdLower.includes('sck')) {
      return 'SPI'
    }
    if (portIdLower.includes('uart') || portIdLower.includes('tx') || portIdLower.includes('rx')) {
      return 'UART'
    }
    if (portIdLower.includes('digital')) {
      return 'Digital'
    }
    if (portIdLower.includes('analog')) {
      return 'Analog'
    }
    
    return null
  }

  /**
   * 🎯 接続方向性の包括的検証（要件4.1-4.6）
   * @param connection 検証対象の接続
   * @param fromComponent 接続元部品
   * @param toComponent 接続先部品
   * @returns 方向性判定結果
   */
  public validateConnectionDirectionality(
    connection: Connection,
    fromComponent: Node<NodeData>,
    toComponent: Node<NodeData>
  ): DirectionalityResult {
    const connectionType = this.determineConnectionType(connection)
    
    switch (connectionType) {
      case 'power':
        return this.validatePowerDirectionality(connection, fromComponent, toComponent)
      
      case 'communication':
        return this.validateCommunicationDirectionality(connection, fromComponent, toComponent)
      
      default:
        return this.handleUnknownConnectionType(connection, fromComponent, toComponent)
    }
  }

  /**
   * ⚡ 電力接続の方向性検証（要件4.1, 4.5）
   * 供給者→消費者の方向性を必須として判定
   */
  private validatePowerDirectionality(
    connection: Connection,
    fromComponent: Node<NodeData>,
    toComponent: Node<NodeData>
  ): DirectionalityResult {
    const fromRole = this.determinePowerRole(fromComponent)
    const toRole = this.determinePowerRole(toComponent)

    // 電力容量の検証
    const powerCapacity = this.validatePowerCapacity(fromComponent, toComponent)

    // 正しい方向性: 供給者 → 消費者
    if (fromRole === 'power_supplier' && toRole === 'power_consumer') {
      return {
        isValid: powerCapacity.isAdequate,
        direction: 'supplier_to_consumer',
        connectionType: 'power',
        severity: powerCapacity.isAdequate ? 'info' : 'warning',
        issue: powerCapacity.isAdequate ? undefined : 
          `電力供給能力不足: ${powerCapacity.shortfall}mA不足`,
        recommendation: powerCapacity.recommendation,
        details: {
          fromRole: '電力供給者',
          toRole: '電力消費者',
          powerCapacity
        }
      }
    }

    // 逆方向接続の検出
    if (fromRole === 'power_consumer' && toRole === 'power_supplier') {
      return {
        isValid: false,
        direction: 'invalid',
        connectionType: 'power',
        severity: 'critical',
        issue: 'Power connection direction is reversed',
        recommendation: 'Change connection from power supplier to consumer',
        details: {
          fromRole: 'Power Consumer (incorrect)',
          toRole: 'Power Supplier (incorrect)'
        }
      }
    }

    // 両方が供給者または消費者の場合
    if (fromRole === toRole) {
      const roleType = fromRole === 'power_supplier' ? 'Supplier' : 'Consumer'
      return {
        isValid: false,
        direction: 'invalid',
        connectionType: 'power',
        severity: 'critical',
        issue: `Invalid connection between same role components (${roleType} to ${roleType})`,
        recommendation: `Change one component to ${fromRole === 'power_supplier' ? 'consumer' : 'supplier'} or review connection`,
        details: {
          fromRole: roleType,
          toRole: roleType
        }
      }
    }

    // 役割が不明な場合
    return {
      isValid: false,
      direction: 'invalid',
      connectionType: 'power',
      severity: 'warning',
      issue: 'Component power roles cannot be determined',
      recommendation: 'Please clarify power supply/consumption characteristics of components',
      details: {
        fromRole: 'Unknown',
        toRole: 'Unknown'
      }
    }
  }

  /**
   * 📡 通信接続の方向性検証（要件4.2, 4.3, 4.6）
   * 双方向・単方向プロトコルの適切な判定
   */
  private validateCommunicationDirectionality(
    connection: Connection,
    fromComponent: Node<NodeData>,
    toComponent: Node<NodeData>
  ): DirectionalityResult {
    // まず、実際に接続されているポートのプロトコルを確認
    const fromPortId = connection.fromPort
    const toPortId = connection.toPort
    
    // 動的ポートの場合、ポートIDからプロトコルを推測
    const fromPortProtocol = this.getProtocolFromPortId(fromPortId)
    const toPortProtocol = this.getProtocolFromPortId(toPortId)
    
    // ポートレベルでプロトコルが一致している場合は問題なし
    if (fromPortProtocol && toPortProtocol && fromPortProtocol === toPortProtocol) {
      return {
        isValid: true,
        direction: 'bidirectional',
        connectionType: 'communication',
        severity: 'info',
        details: {
          protocol: fromPortProtocol,
          fromRole: 'bidirectional',
          toRole: 'bidirectional'
        }
      }
    }
    
    // ポートレベルで判定できない場合は、従来のノードレベルチェック
    const fromProtocols = this.extractCommunicationProtocols(fromComponent)
    const toProtocols = this.extractCommunicationProtocols(toComponent)
    
    // プロトコル互換性の確認
    const compatibleProtocol = this.findCompatibleProtocol(fromProtocols, toProtocols)
    
    if (!compatibleProtocol) {
      // 両方のノードがマイコンの場合は、警告レベルを下げる
      const bothMicrocontrollers = 
        fromComponent.data?.category?.toLowerCase().includes('microcontroller') &&
        toComponent.data?.category?.toLowerCase().includes('microcontroller')
      
      if (bothMicrocontrollers) {
        return {
          isValid: true,
          direction: 'bidirectional',
          connectionType: 'communication',
          severity: 'info',
          details: {
            fromRole: 'microcontroller',
            toRole: 'microcontroller',
            protocol: 'Various'
          }
        }
      }
      
      return {
        isValid: false,
        direction: 'invalid',
        connectionType: 'communication',
        severity: 'warning', // criticalからwarningに変更
        issue: `Communication protocols may not be compatible`,
        recommendation: 'Verify that both components support the same protocol',
        details: {
          fromRole: fromProtocols.join(', ') || 'unknown',
          toRole: toProtocols.join(', ') || 'unknown'
        }
      }
    }

    // プロトコル種別による方向性判定
    const protocolInfo = this.analyzeProtocolCompatibility(compatibleProtocol, fromComponent, toComponent)
    
    if (this.isBidirectionalProtocol(compatibleProtocol)) {
      // 双方向プロトコル（I2C、SPI、UART）の場合
      return {
        isValid: !protocolInfo.requiresLevelShifter || protocolInfo.isCompatible,
        direction: 'bidirectional',
        connectionType: 'communication',
        severity: protocolInfo.requiresLevelShifter ? 'warning' : 'info',
        issue: protocolInfo.requiresLevelShifter ? 
          `電圧レベル変換が必要: ${protocolInfo.voltageLevel}` : undefined,
        recommendation: protocolInfo.recommendedIC ? 
          `推奨変換IC: ${protocolInfo.recommendedIC}` : undefined,
        details: {
          protocol: compatibleProtocol,
          voltageLevel: protocolInfo.voltageLevel,
          fromRole: 'Bidirectional Communication',
          toRole: 'Bidirectional Communication'
        }
      }
    } else {
      // 単方向プロトコルの場合
      return this.validateUnidirectionalCommunication(connection, fromComponent, toComponent, compatibleProtocol)
    }
  }

  /**
   * 🔄 単方向通信の方向性検証（要件4.3）
   */
  private validateUnidirectionalCommunication(
    connection: Connection,
    fromComponent: Node<NodeData>,
    toComponent: Node<NodeData>,
    protocol: string
  ): DirectionalityResult {
    const fromRole = this.determineCommunicationRole(fromComponent, protocol)
    const toRole = this.determineCommunicationRole(toComponent, protocol)

    // 送信者→受信者の正しい方向性
    if (
      (fromRole === 'communication_master' && toRole === 'communication_slave') ||
      this.isValidUnidirectionalFlow(fromComponent, toComponent, protocol)
    ) {
      return {
        isValid: true,
        direction: 'unidirectional',
        connectionType: 'communication',
        severity: 'info',
        details: {
          protocol,
          fromRole: 'Transmitter',
          toRole: 'Receiver'
        }
      }
    }

    return {
      isValid: false,
      direction: 'invalid',
      connectionType: 'communication',
      severity: 'warning',
      issue: `${protocol} directionality is incorrect`,
      recommendation: 'Connect from transmitter to receiver',
      details: {
        protocol,
        fromRole: fromRole,
        toRole: toRole
      }
    }
  }

  /**
   * ❓ 不明な接続種別の処理（要件4.4）
   * デフォルトで双方向として扱い、ユーザーに明確化を促す
   */
  private handleUnknownConnectionType(
    connection: Connection,
    fromComponent: Node<NodeData>,
    toComponent: Node<NodeData>
  ): DirectionalityResult {
    return {
      isValid: true,
      direction: 'bidirectional',
      connectionType: 'communication',
      severity: 'warning',
      issue: 'Connection type cannot be determined',
      recommendation: 'Please clarify connection type (power/communication)',
      details: {
        fromRole: 'Unknown (treated as bidirectional)',
        toRole: 'Unknown (treated as bidirectional)'
      }
    }
  }

  // Private Helper Methods

  /**
   * 接続種別の判定
   */
  private determineConnectionType(connection: Connection): 'power' | 'communication' {
    const powerPorts = ['vcc', 'gnd', 'power', '5v', '3.3v', 'vin', 'vout', '+', '-']
    const ports = [connection.fromPort, connection.toPort].map(p => p.toLowerCase())
    
    const isPowerConnection = ports.some(port => 
      powerPorts.some(pp => port.includes(pp))
    )
    
    return isPowerConnection ? 'power' : 'communication'
  }

  /**
   * 電力役割の判定
   */
  private determinePowerRole(component: Node<NodeData>): ComponentRole {
    const title = component.data?.title?.toLowerCase() || ''
    const voltage = component.data?.voltage || ''
    
    // 電力供給者の判定
    if (
      title.includes('power') || 
      title.includes('supply') || 
      title.includes('adapter') ||
      title.includes('battery') ||
      title.includes('regulator') ||
      title.includes('arduino') ||
      title.includes('esp32') ||
      title.includes('raspberry')
    ) {
      return 'power_supplier'
    }
    
    // 電力消費者の判定
    if (
      title.includes('sensor') ||
      title.includes('motor') ||
      title.includes('led') ||
      title.includes('display') ||
      title.includes('module')
    ) {
      return 'power_consumer'
    }
    
    return 'unknown'
  }

  /**
   * ⚡ 電力容量の詳細検証（要件4.5）
   * 供給能力と消費電力の比較、具体的な不足量の表示
   */
  private validatePowerCapacity(
    supplierComponent: Node<NodeData>,
    consumerComponent: Node<NodeData>
  ): PowerCapacityInfo {
    // 高精度な電力情報抽出
    const supplierInfo = this.extractDetailedPowerInfo(supplierComponent, 'supplier')
    const consumerInfo = this.extractDetailedPowerInfo(consumerComponent, 'consumer')
    
    const supplierCapacity = supplierInfo.capacity
    const consumerRequirement = consumerInfo.requirement
    
    // 安全マージンを考慮（80%ルール）
    const safeCapacity = supplierCapacity * 0.8
    const isAdequate = safeCapacity >= consumerRequirement
    const shortfall = isAdequate ? 0 : consumerRequirement - safeCapacity
    
    // 電圧レベルも考慮した詳細な推奨事項
    const recommendation = this.generatePowerRecommendation(
      supplierInfo, 
      consumerInfo, 
      isAdequate, 
      shortfall
    )
    
    return {
      supplierCapacity,
      consumerRequirement,
      isAdequate,
      shortfall: shortfall > 0 ? Math.ceil(shortfall) : undefined,
      recommendation
    }
  }

  /**
   * 🔋 詳細な電力情報抽出
   */
  private extractDetailedPowerInfo(
    component: Node<NodeData>, 
    role: 'supplier' | 'consumer'
  ): {
    capacity: number
    requirement: number
    voltage: number
    efficiency: number
    componentType: string
    hasRegulator: boolean
  } {
    const title = component.data?.title?.toLowerCase() || ''
    const voltage = this.extractVoltageLevel(component)
    
    let capacity = 0
    let requirement = 0
    let efficiency = 0.85 // デフォルト効率
    let hasRegulator = false
    let componentType = 'unknown'
    
    // 部品別詳細電力特性
    if (role === 'supplier') {
      // 電力供給者の詳細分析
      if (title.includes('arduino uno')) {
        capacity = 500; componentType = 'microcontroller'; hasRegulator = true
      } else if (title.includes('arduino mega')) {
        capacity = 800; componentType = 'microcontroller'; hasRegulator = true
      } else if (title.includes('esp32')) {
        capacity = 300; componentType = 'microcontroller'; efficiency = 0.75
      } else if (title.includes('raspberry pi 4')) {
        capacity = 3000; componentType = 'sbc'; efficiency = 0.9
      } else if (title.includes('power supply') || title.includes('adapter')) {
        capacity = this.extractCapacityFromTitle(title) || 2000
        componentType = 'external_power'; efficiency = 0.9; hasRegulator = true
      } else if (title.includes('battery')) {
        capacity = this.extractCapacityFromTitle(title) || 1000
        componentType = 'battery'; efficiency = 0.95
      } else if (title.includes('regulator')) {
        capacity = 1500; componentType = 'regulator'; hasRegulator = true; efficiency = 0.8
      } else {
        capacity = 200 // デフォルト低容量
      }
    } else {
      // 電力消費者の詳細分析
      if (title.includes('sensor')) {
        if (title.includes('bme280') || title.includes('dht22')) {
          requirement = 3 // 超低消費
        } else if (title.includes('camera') || title.includes('lidar')) {
          requirement = 150 // 高消費センサー
        } else {
          requirement = 20 // 一般的なセンサー
        }
        componentType = 'sensor'
      } else if (title.includes('led')) {
        if (title.includes('strip') || title.includes('ws2812')) {
          requirement = this.extractLEDPower(title) || 200 // LED strip
        } else {
          requirement = 20 // 単体LED
        }
        componentType = 'led'
      } else if (title.includes('motor')) {
        if (title.includes('servo')) {
          requirement = 300 // サーボモーター
        } else if (title.includes('stepper')) {
          requirement = 500 // ステッピングモーター
        } else {
          requirement = 200 // 一般的なモーター
        }
        componentType = 'motor'
      } else if (title.includes('display')) {
        if (title.includes('oled')) {
          requirement = 50 // OLED
        } else if (title.includes('lcd')) {
          requirement = 100 // LCD
        } else {
          requirement = 75 // 一般的なディスプレイ
        }
        componentType = 'display'
      } else if (title.includes('module')) {
        requirement = 80 // 一般的なモジュール
        componentType = 'module'
      } else {
        requirement = 30 // デフォルト
      }
    }
    
    return {
      capacity,
      requirement,
      voltage,
      efficiency,
      componentType,
      hasRegulator
    }
  }

  /**
   * 💡 電力に関する詳細推奨事項生成
   */
  private generatePowerRecommendation(
    supplierInfo: any,
    consumerInfo: any,
    isAdequate: boolean,
    shortfall: number
  ): string | undefined {
    if (isAdequate) {
      return undefined // 問題なし
    }
    
    const recommendations: string[] = []
    
    // 容量不足の具体的対策
    const requiredCapacity = consumerInfo.requirement + 50 // 安全マージン
    recommendations.push(`Upgrade power supply to ${requiredCapacity}mA+ capacity`)
    
    // 電圧レベル考慮
    if (supplierInfo.voltage !== consumerInfo.voltage) {
      recommendations.push(`Consider voltage level: ${supplierInfo.voltage}V → ${consumerInfo.voltage}V`)
    }
    
    // 部品タイプ別の具体的提案
    if (supplierInfo.componentType === 'microcontroller' && shortfall > 200) {
      recommendations.push('Use external power supply instead of microcontroller power')
    }
    
    if (consumerInfo.componentType === 'motor' || consumerInfo.componentType === 'led') {
      recommendations.push('Use dedicated motor/LED driver with separate power supply')
    }
    
    if (!supplierInfo.hasRegulator && consumerInfo.voltage < supplierInfo.voltage) {
      recommendations.push('Add voltage regulator for stable power delivery')
    }
    
    return recommendations.slice(0, 2).join('. ') // 最大2つの推奨事項
  }

  /**
   * 通信プロトコルの抽出
   */
  private extractCommunicationProtocols(component: Node<NodeData>): string[] {
    const communication = component.data?.communication?.toLowerCase() || ''
    const protocols = ['i2c', 'spi', 'uart', 'can', 'pwm', 'digital', 'analog', 'wifi', 'bluetooth']
    
    return protocols.filter(protocol => communication.includes(protocol))
  }

  /**
   * 互換プロトコルの検索
   */
  private findCompatibleProtocol(fromProtocols: string[], toProtocols: string[]): string | null {
    for (const fromProtocol of fromProtocols) {
      if (toProtocols.includes(fromProtocol)) {
        return fromProtocol
      }
    }
    return null
  }

  /**
   * 🔄 プロトコル互換性の詳細分析（要件4.6）
   * 電圧レベル不一致の検出と推奨変換ICの提案
   */
  private analyzeProtocolCompatibility(
    protocol: string,
    fromComponent: Node<NodeData>,
    toComponent: Node<NodeData>
  ): ProtocolInfo {
    const fromVoltage = this.extractVoltageLevel(fromComponent)
    const toVoltage = this.extractVoltageLevel(toComponent)
    
    // より精密な電圧レベル判定
    const voltageDifference = Math.abs(fromVoltage - toVoltage)
    const requiresLevelShifter = this.determineIfLevelShifterRequired(
      fromVoltage, 
      toVoltage, 
      protocol
    )
    
    const recommendedIC = requiresLevelShifter ? 
      this.getOptimalLevelShifter(fromVoltage, toVoltage, protocol) : undefined
    
    return {
      name: protocol,
      voltageLevel: `${fromVoltage}V ↔ ${toVoltage}V (Δ${voltageDifference.toFixed(1)}V)`,
      isCompatible: !requiresLevelShifter,
      requiresLevelShifter,
      recommendedIC
    }
  }

  /**
   * 🔍 レベルシフターの必要性判定（詳細版）
   */
  private determineIfLevelShifterRequired(
    fromVoltage: number, 
    toVoltage: number, 
    protocol: string
  ): boolean {
    const voltageDifference = Math.abs(fromVoltage - toVoltage)
    
    // プロトコル別の許容範囲
    const toleranceThresholds = {
      'i2c': 0.5,      // I2Cは厳密
      'spi': 0.8,      // SPIは少し緩い
      'uart': 1.0,     // UARTは比較的緩い
      'digital': 1.2,  // デジタル信号は緩い
      'analog': 0.3,   // アナログは厳密
      'pwm': 1.0,      // PWMは緩い
      'default': 0.8   // デフォルト
    }
    
    const threshold = toleranceThresholds[protocol] || toleranceThresholds['default']
    
    // 基本的な閾値チェック
    if (voltageDifference <= threshold) {
      return false
    }
    
    // 5V → 3.3V は常にレベルシフターが必要
    if (fromVoltage >= 4.5 && toVoltage <= 3.6) {
      return true
    }
    
    // 3.3V → 5V も通常は必要（プロトコルによる）
    if (fromVoltage <= 3.6 && toVoltage >= 4.5) {
      return ['i2c', 'spi', 'digital'].includes(protocol)
    }
    
    return voltageDifference > threshold
  }

  /**
   * 🔧 最適なレベルシフターIC選定（要件4.6）
   */
  private getOptimalLevelShifter(
    fromVoltage: number, 
    toVoltage: number, 
    protocol: string
  ): string {
    const isHighToLow = fromVoltage > toVoltage
    const maxVoltage = Math.max(fromVoltage, toVoltage)
    const minVoltage = Math.min(fromVoltage, toVoltage)
    
    // 電圧レベル別最適IC選定
    if (maxVoltage <= 3.6 && minVoltage >= 1.7) {
      // 低電圧領域 (1.8V - 3.3V)
      return this.selectLowVoltageLevelShifter(protocol, fromVoltage, toVoltage)
    } else if (maxVoltage <= 5.5 && minVoltage >= 3.0) {
      // 標準電圧領域 (3.3V - 5V)
      return this.selectStandardLevelShifter(protocol, fromVoltage, toVoltage)
    } else if (maxVoltage > 5.5) {
      // 高電圧領域 (5V+)
      return this.selectHighVoltageLevelShifter(protocol, fromVoltage, toVoltage)
    }
    
    return 'TXS0108E (8-channel bidirectional)'
  }

  /**
   * 📟 低電圧レベルシフター選定
   */
  private selectLowVoltageLevelShifter(
    protocol: string, 
    fromV: number, 
    toV: number
  ): string {
    const channelCount = this.getRequiredChannels(protocol)
    
    if (channelCount === 1) {
      return 'TXS0101 (1-channel bidirectional, 1.8V-5.5V)'
    } else if (channelCount <= 2) {
      return 'TXS0102 (2-channel bidirectional, 1.8V-5.5V)'
    } else if (channelCount <= 4) {
      return 'TXS0104E (4-channel bidirectional, 1.8V-5.5V)'
    } else {
      return 'TXS0108E (8-channel bidirectional, 1.8V-5.5V)'
    }
  }

  /**
   * ⚡ 標準電圧レベルシフター選定
   */
  private selectStandardLevelShifter(
    protocol: string, 
    fromV: number, 
    toV: number
  ): string {
    const isHighSpeed = ['spi', 'i2c'].includes(protocol)
    const channelCount = this.getRequiredChannels(protocol)
    
    if (fromV === 5.0 && toV === 3.3) {
      // 5V → 3.3V 専用
      if (protocol === 'i2c') {
        return 'PCA9306 (I2C specific, 5V↔3.3V)'
      } else if (isHighSpeed) {
        return 'TXS0104E (4-channel, high-speed)'
      } else {
        return 'CD74HC4050 (6-channel, unidirectional 5V→3.3V)'
      }
    } else if (fromV === 3.3 && toV === 5.0) {
      // 3.3V → 5V
      if (channelCount <= 4) {
        return 'TXS0104E (4-channel bidirectional)'
      } else {
        return 'TXS0108E (8-channel bidirectional)'
      }
    }
    
    return `TXS010${channelCount <= 4 ? '4' : '8'}E (${channelCount <= 4 ? '4' : '8'}-channel bidirectional)`
  }

  /**
   * 🔌 高電圧レベルシフター選定
   */
  private selectHighVoltageLevelShifter(
    protocol: string, 
    fromV: number, 
    toV: number
  ): string {
    if (Math.max(fromV, toV) <= 12) {
      return 'TXS0108E (8-channel, up to 12V) + voltage divider'
    } else {
      return 'Opto-isolator (4N35 series) for high voltage isolation'
    }
  }

  /**
   * 📊 プロトコル別必要チャンネル数算出
   */
  private getRequiredChannels(protocol: string): number {
    const channelRequirements = {
      'i2c': 2,      // SDA, SCL
      'spi': 4,      // MISO, MOSI, SCK, CS
      'uart': 2,     // TX, RX
      'digital': 1,  // 単一信号
      'pwm': 1,      // 単一信号
      'analog': 1,   // 単一信号
      'can': 2,      // CAN_H, CAN_L
      'default': 2
    }
    
    return channelRequirements[protocol] || channelRequirements['default']
  }

  /**
   * 双方向プロトコルの判定
   */
  private isBidirectionalProtocol(protocol: string): boolean {
    const bidirectionalProtocols = ['i2c', 'spi', 'uart', 'can']
    return bidirectionalProtocols.includes(protocol)
  }

  /**
   * 通信役割の判定
   */
  private determineCommunicationRole(component: Node<NodeData>, protocol: string): ComponentRole {
    const title = component.data?.title?.toLowerCase() || ''
    
    // マスター・スレーブの判定（簡略版）
    if (title.includes('arduino') || title.includes('esp32') || title.includes('raspberry')) {
      return 'communication_master'
    }
    
    if (title.includes('sensor') || title.includes('display') || title.includes('module')) {
      return 'communication_slave'
    }
    
    return 'bidirectional'
  }

  /**
   * 単方向通信フローの検証
   */
  private isValidUnidirectionalFlow(
    fromComponent: Node<NodeData>,
    toComponent: Node<NodeData>,
    protocol: string
  ): boolean {
    // プロトコル固有のロジック（簡略実装）
    return true
  }

  /**
   * 電力容量の抽出（簡略実装）
   */
  private extractPowerCapacity(component: Node<NodeData>): number {
    const title = component.data?.title?.toLowerCase() || ''
    
    // 簡略的な容量推定
    if (title.includes('arduino')) return 500  // 500mA
    if (title.includes('esp32')) return 300    // 300mA
    if (title.includes('power') || title.includes('adapter')) return 2000  // 2000mA
    
    return 100  // デフォルト 100mA
  }

  /**
   * 電力要求の抽出（簡略実装）
   */
  private extractPowerRequirement(component: Node<NodeData>): number {
    const title = component.data?.title?.toLowerCase() || ''
    
    // 簡略的な消費電力推定
    if (title.includes('sensor')) return 20    // 20mA
    if (title.includes('led')) return 50       // 50mA
    if (title.includes('motor')) return 200    // 200mA
    if (title.includes('display')) return 100  // 100mA
    
    return 30  // デフォルト 30mA
  }

  /**
   * 電圧レベルの抽出
   */
  private extractVoltageLevel(component: Node<NodeData>): number {
    const voltage = component.data?.voltage || '3.3V'
    const match = voltage.match(/(\d+\.?\d*)/)
    return match ? parseFloat(match[1]) : 3.3
  }

  /**
   * 🔋 タイトルから容量情報を抽出
   */
  private extractCapacityFromTitle(title: string): number | null {
    // "2A Power Supply" や "1000mA Adapter" のような形式から抽出
    const ampMatch = title.match(/(\d+\.?\d*)\s*a\b/i)
    if (ampMatch) {
      return parseFloat(ampMatch[1]) * 1000 // A → mA
    }
    
    const milliampMatch = title.match(/(\d+)\s*ma\b/i)
    if (milliampMatch) {
      return parseInt(milliampMatch[1])
    }
    
    return null
  }

  /**
   * 💡 LEDの電力消費を推定
   */
  private extractLEDPower(title: string): number | null {
    // "60 LED strip" や "WS2812B 144" のような形式から推定
    const ledCountMatch = title.match(/(\d+)\s*led/i)
    if (ledCountMatch) {
      const ledCount = parseInt(ledCountMatch[1])
      return ledCount * 3 // 1LED あたり約3mA と仮定
    }
    
    // WS2812B などの具体的な型番
    if (title.includes('ws2812')) {
      const numberMatch = title.match(/(\d+)/)
      if (numberMatch) {
        return parseInt(numberMatch[1]) * 5 // WS2812B は約5mA/LED
      }
    }
    
    return null
  }

  /**
   * 推奨レベルシフターの取得（レガシー）
   */
  private getRecommendedLevelShifter(fromVoltage: number, toVoltage: number): string {
    return this.getOptimalLevelShifter(fromVoltage, toVoltage, 'digital')
  }
}

// エクスポート用のファクトリー関数
export function createConnectionDirectionalityManager(): ConnectionDirectionalityManager {
  return ConnectionDirectionalityManager.getInstance()
}

// 後方互換性のためのユーティリティ関数
export function validateConnectionDirectionality(
  connection: Connection,
  fromComponent: Node<NodeData>,
  toComponent: Node<NodeData>
): DirectionalityResult {
  const manager = ConnectionDirectionalityManager.getInstance()
  return manager.validateConnectionDirectionality(connection, fromComponent, toComponent)
}