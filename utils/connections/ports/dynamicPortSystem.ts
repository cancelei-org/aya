// 🔌 動的ポートシステム
// フェーズ3タスク3.1.1: AI取得仕様からのポート構成生成機能

import type { ComponentSpecification } from '../../ai/core/aiSpecificationService'
import type { Connection } from '@/types/canvas'

export interface PortDefinition {
  id: string
  label: string
  type: 'communication' | 'power'
  protocol?: string // I2C, SPI, UART, PWM, etc.
  voltage?: string // 3.3V, 5V, etc.
  direction: 'input' | 'output' | 'bidirectional'
  maxConnections: number // -1 for unlimited
  currentConnections: number
  position: PortPosition
  pinNumber?: number
  description?: string
}

export interface PortPosition {
  side: 'top' | 'right' | 'bottom' | 'left'
  index: number // Position index on that side
  offset?: number // Fine-tuning offset
}

export interface PortGroup {
  id: string
  name: string
  type: 'communication' | 'power' | 'gpio' | 'analog'
  ports: PortDefinition[]
  isCollapsed: boolean
  color: string
  priority: number // For ordering
}

export interface DynamicPortConfiguration {
  nodeId: string
  componentName: string
  totalPins: number
  portGroups: PortGroup[]
  layoutMode: 'compact' | 'expanded' | 'detailed'
  autoLayout: boolean
  generatedFrom: 'ai' | 'manual' | 'template'
  lastUpdated: string
}

export interface PortCapacityStatus {
  portId: string
  available: number
  used: number
  percentage: number
  status: 'available' | 'warning' | 'full' | 'exceeded'
  warnings: string[]
}

export interface PortLayoutConstraints {
  minPortSpacing: number
  maxPortsPerSide: number
  preferredSides: {
    power: ('top' | 'right' | 'bottom' | 'left')[]
    communication: ('top' | 'right' | 'bottom' | 'left')[]
    gpio: ('top' | 'right' | 'bottom' | 'left')[]
  }
  groupSeparation: number
  nodeMinWidth: number
  nodeMinHeight: number
}

/**
 * 🚀 DynamicPortSystem
 * AI取得仕様からポート構成を動的生成し、プロトコル別・電圧別に分類
 */
export class DynamicPortSystem {
  private static instance: DynamicPortSystem
  private portConfigurations: Map<string, DynamicPortConfiguration>
  private layoutConstraints: PortLayoutConstraints

  constructor() {
    this.portConfigurations = new Map()
    this.layoutConstraints = {
      minPortSpacing: 20,
      maxPortsPerSide: 8,
      preferredSides: {
        power: ['top', 'bottom'],
        communication: ['left', 'right'],
        gpio: ['left', 'right', 'bottom']
      },
      groupSeparation: 10,
      nodeMinWidth: 160,  // Increased from 120
      nodeMinHeight: 100  // Increased from 80
    }
  }

  public static getInstance(): DynamicPortSystem {
    if (!DynamicPortSystem.instance) {
      DynamicPortSystem.instance = new DynamicPortSystem()
    }
    return DynamicPortSystem.instance
  }

  /**
   * 🧠 AI仕様からポート構成を生成
   */
  public generatePortsFromSpecification(
    nodeId: string,
    specification: ComponentSpecification
  ): DynamicPortConfiguration {
    const startTime = Date.now()

    // 電力ポートの生成
    const powerPorts = this.generatePowerPorts(specification, nodeId)
    
    // 通信ポートの生成
    const communicationPorts = this.generateCommunicationPorts(specification, nodeId)
    
    // GPIOポートの生成
    const gpioPorts = this.generateGPIOPorts(specification, nodeId)
    
    // アナログポートの生成
    const analogPorts = this.generateAnalogPorts(specification, nodeId)
    
    // コネクタポートの生成
    const connectorPorts = this.generateConnectorPorts(specification, nodeId)

    // ポートグループの構築
    const portGroups: PortGroup[] = [
      {
        id: 'power',
        name: 'Power',
        type: 'power',
        ports: powerPorts,
        color: '#ef4444', // Red
        priority: 1
      },
      {
        id: 'communication',
        name: 'Communication',
        type: 'communication',
        ports: communicationPorts,
        color: '#3b82f6', // Blue
        priority: 2
      },
      {
        id: 'gpio',
        name: 'GPIO',
        type: 'gpio',
        ports: gpioPorts,
        color: '#10b981', // Green
        priority: 3
      },
      {
        id: 'analog',
        name: 'Analog',
        type: 'analog',
        ports: analogPorts,
        color: '#f59e0b', // Amber
        priority: 4
      },
      {
        id: 'connectors',
        name: 'Connectors',
        type: 'communication',
        ports: connectorPorts,
        color: '#8b5cf6', // Purple - matching SystemNode connector color
        priority: 5
      }
    ].filter(group => group.ports.length > 0) // Remove empty groups

    // 自動レイアウト計算
    const configWithLayout = this.calculatePortLayout({
      nodeId,
      componentName: specification.name,
      totalPins: specification.physical.pins,
      portGroups,
      layoutMode: 'compact',
      autoLayout: true,
      generatedFrom: 'ai',
      lastUpdated: new Date().toISOString()
    })

    // キャッシュに保存
    this.portConfigurations.set(nodeId, configWithLayout)

    console.log(`Generated ${configWithLayout.portGroups.reduce((total, group) => total + group.ports.length, 0)} ports for ${specification.name} in ${Date.now() - startTime}ms`)

    return configWithLayout
  }

  /**
   * ⚡ 電力ポートの生成
   */
  private generatePowerPorts(spec: ComponentSpecification, nodeId: string): PortDefinition[] {
    const ports: PortDefinition[] = []

    // シンプル構成部品（LED、ダイオード、センサー、アクチュエーター等）の判定
    if (this.isSimpleComponent(spec)) {
      return this.generateSimpleComponentPorts(spec, nodeId)
    }

    // マイクロコントローラーの場合は電源出力ポートを追加
    if (this.isMicrocontroller(spec)) {
      return this.generateMicrocontrollerPowerPorts(spec, nodeId)
    }

    // Create individual power input ports for each voltage
    spec.voltage.operating.forEach((voltage, index) => {
      ports.push({
        id: `${nodeId}_power_in_${voltage.replace('.', '_')}`,
        label: `VCC ${voltage}`,
        type: 'power',
        voltage,
        direction: 'input',
        maxConnections: -1, // Unlimited for power
        currentConnections: 0,
        position: { side: 'top', index: index * 2 },
        description: `Power input at ${voltage}`
      })

      // Corresponding GND for each power input
      ports.push({
        id: `${nodeId}_gnd_${index}`,
        label: 'GND',
        type: 'power',
        voltage: '0V',
        direction: 'input',
        maxConnections: -1,
        currentConnections: 0,
        position: { side: 'top', index: index * 2 + 1 },
        description: 'Ground connection'
      })
    })

    // Add Vin pin if input voltage range is specified (for microcontrollers)
    if (spec.voltage.input) {
      ports.push({
        id: `${nodeId}_vin`,
        label: `Vin (${spec.voltage.input})`,
        type: 'power',
        voltage: spec.voltage.input,
        direction: 'input',
        maxConnections: -1,
        currentConnections: 0,
        position: { side: 'top', index: spec.voltage.operating.length * 2 },
        description: `Voltage input ${spec.voltage.input}`
      })
    }

    // 電源供給能力がある場合
    if (spec.power.supply?.capacity) {
      ports.push({
        id: `${nodeId}_power_out`,
        label: `OUT (${spec.power.supply.capacity}mA)`,
        type: 'power',
        voltage: spec.voltage.logic,
        direction: 'output',
        maxConnections: -1,
        currentConnections: 0,
        position: { side: 'bottom', index: 0 },
        description: `Power output, ${spec.power.supply.capacity}mA capacity`
      })
    }

    return ports
  }

  /**
   * 📡 通信ポートの生成
   */
  private generateCommunicationPorts(spec: ComponentSpecification, nodeId: string): PortDefinition[] {
    console.log('[PORT DEBUG] Communication protocols received:', spec.communication?.protocols)
    console.log('[PORT DEBUG] Full spec name:', spec.name)
    console.log('[PORT DEBUG] Full spec category:', spec.category)
    
    const ports: PortDefinition[] = []
    let pinIndex = 0

    // Filter out Analog and Digital as they are handled by separate methods
    const communicationProtocols = spec.communication.protocols.filter(protocol => {
      const protocolLower = protocol.toLowerCase()
      return protocolLower !== 'analog' && protocolLower !== 'digital'
    })

    communicationProtocols.forEach(protocol => {
      const protocolPorts = this.generateProtocolPorts(protocol, spec, pinIndex, nodeId)
      ports.push(...protocolPorts)
      pinIndex += protocolPorts.length
    })

    return ports
  }

  /**
   * 🔌 プロトコル固有ポートの生成
   */
  private generateProtocolPorts(
    protocol: string, 
    spec: ComponentSpecification, 
    startIndex: number,
    nodeId: string
  ): PortDefinition[] {
    const ports: PortDefinition[] = []
    const protocolLower = protocol.toLowerCase()

    switch (protocolLower) {
      case 'i2c':
        // Use specific pin names from spec if available
        const i2cPins = spec.communication.pins?.['I2C'] || []
        const sdaPin = i2cPins.find(pin => pin.includes('SDA')) || 'SDA'
        const sclPin = i2cPins.find(pin => pin.includes('SCL')) || 'SCL'
        
        ports.push(
          {
            id: `${nodeId}_i2c_sda`,
            label: sdaPin,
            type: 'communication',
            protocol: 'I2C',
            direction: 'bidirectional',
            maxConnections: -1, // I2C supports multiple devices
            currentConnections: 0,
            position: { side: 'left', index: startIndex },
            description: 'I2C data line'
          },
          {
            id: `${nodeId}_i2c_scl`,
            label: sclPin,
            type: 'communication',
            protocol: 'I2C',
            direction: 'bidirectional',
            maxConnections: -1,
            currentConnections: 0,
            position: { side: 'left', index: startIndex + 1 },
            description: 'I2C clock line'
          }
        )
        break

      case 'spi':
        // Use specific pin names from spec if available
        const spiPins = spec.communication.pins?.['SPI'] || []
        const misoPin = spiPins.find(pin => pin.includes('MISO')) || 'MISO'
        const mosiPin = spiPins.find(pin => pin.includes('MOSI')) || 'MOSI'
        const sckPin = spiPins.find(pin => pin.includes('SCK')) || 'SCK'
        const ssPin = spiPins.find(pin => pin.includes('SS')) || 'CS'
        
        ports.push(
          {
            id: `${nodeId}_spi_miso`,
            label: misoPin,
            type: 'communication',
            protocol: 'SPI',
            direction: 'input',
            maxConnections: 1,
            currentConnections: 0,
            position: { side: 'right', index: startIndex },
            description: 'SPI Master In, Slave Out'
          },
          {
            id: `${nodeId}_spi_mosi`,
            label: mosiPin,
            type: 'communication',
            protocol: 'SPI',
            direction: 'output',
            maxConnections: 1,
            currentConnections: 0,
            position: { side: 'right', index: startIndex + 1 },
            description: 'SPI Master Out, Slave In'
          },
          {
            id: `${nodeId}_spi_sck`,
            label: sckPin,
            type: 'communication',
            protocol: 'SPI',
            direction: 'output',
            maxConnections: 1,
            currentConnections: 0,
            position: { side: 'right', index: startIndex + 2 },
            description: 'SPI clock'
          },
          {
            id: `${nodeId}_spi_cs`,
            label: ssPin,
            type: 'communication',
            protocol: 'SPI',
            direction: 'input',
            maxConnections: 1,
            currentConnections: 0,
            position: { side: 'right', index: startIndex + 3 },
            description: 'SPI chip select'
          }
        )
        break

      case 'uart':
      case 'serial':
        // Use specific pin names from spec if available
        const uartPins = spec.communication.pins?.['UART'] || []
        const txPin = uartPins.find(pin => pin.includes('TX')) || 'TX'
        const rxPin = uartPins.find(pin => pin.includes('RX')) || 'RX'
        
        ports.push(
          {
            id: `${nodeId}_uart_tx`,
            label: txPin,
            type: 'communication',
            protocol: 'UART',
            direction: 'output',
            maxConnections: 1,
            currentConnections: 0,
            position: { side: 'left', index: startIndex },
            description: 'UART transmit'
          },
          {
            id: `${nodeId}_uart_rx`,
            label: rxPin,
            type: 'communication',
            protocol: 'UART',
            direction: 'input',
            maxConnections: 1,
            currentConnections: 0,
            position: { side: 'left', index: startIndex + 1 },
            description: 'UART receive'
          }
        )
        break

      default:
        // Generic communication protocols (USB, CAN, etc.)
        ports.push({
          id: `${nodeId}_comm_${protocolLower}`,
          label: protocol,
          type: 'communication',
          protocol,
          direction: 'bidirectional',
          maxConnections: 1,
          currentConnections: 0,
          position: { side: 'left', index: startIndex },
          description: `${protocol} communication`
        })
        break
    }

    return ports
  }

  /**
   * 🎛️ GPIOポートの生成
   */
  private generateGPIOPorts(spec: ComponentSpecification, nodeId: string): PortDefinition[] {
    const ports: PortDefinition[] = []
    
    // For microcontrollers, generate simplified digital port representation
    if (spec.category.toLowerCase().includes('microcontroller') && 
        spec.communication.pins?.['digital']) {
      const digitalPins = spec.communication.pins['digital']
      
      // Check if digital pins are in the new format with PWM info
      if (Array.isArray(digitalPins) && digitalPins.length > 0 && 
          typeof digitalPins[0] === 'object' && 'pin' in digitalPins[0]) {
        // Count PWM and non-PWM pins (filter out PCB-related)
        const pwmPins = digitalPins.filter((pin: { pin: string; pwm: boolean }) => {
          if (!pin.pin) return false
          const pinStr = pin.pin.toString().toLowerCase()
          if (pinStr.includes('pcb') || pinStr.includes('pad') || 
              pinStr.includes('castellat')) {
            return false
          }
          return pin.pwm
        })
        const standardPins = digitalPins.filter((pin: { pin: string; pwm: boolean }) => {
          if (!pin.pin) return false
          const pinStr = pin.pin.toString().toLowerCase()
          if (pinStr.includes('pcb') || pinStr.includes('pad') || 
              pinStr.includes('castellat')) {
            return false
          }
          return !pin.pwm
        })
        
        // Create PWM port if there are PWM-capable pins
        if (pwmPins.length > 0) {
          const pwmPinNames = pwmPins.map((p: { pin: string; pwm: boolean }) => p.pin).join(', ')
          ports.push({
            id: `${nodeId}_digital_pwm`,
            label: 'Digital I/O (PWM)',
            type: 'communication',
            protocol: 'Digital',
            direction: 'bidirectional',
            maxConnections: -1, // Multiple connections allowed
            currentConnections: 0,
            position: { side: 'right', index: 0 },
            description: `${pwmPins.length} PWM pins: ${pwmPinNames}`,
            pinNumber: pwmPins.length
          })
        }
        
        // Create standard digital port
        if (standardPins.length > 0) {
          const standardPinNames = standardPins.map((p: { pin: string; pwm: boolean }) => p.pin).join(', ')
          ports.push({
            id: `${nodeId}_digital_standard`,
            label: 'Digital I/O',
            type: 'communication',
            protocol: 'Digital',
            direction: 'bidirectional',
            maxConnections: -1, // Multiple connections allowed
            currentConnections: 0,
            position: { side: 'right', index: 1 },
            description: `${standardPins.length} digital pins: ${standardPinNames}`,
            pinNumber: standardPins.length
          })
        }
      } else if (Array.isArray(digitalPins)) {
        // Old format - create single digital port
        // Filter out invalid pin values (null, undefined, empty strings, PCB-related)
        const validPins = digitalPins.filter(pin => {
          if (!pin) return false
          const pinStr = pin.toString().toLowerCase()
          // Exclude PCB-related pins
          if (pinStr.includes('pcb') || pinStr.includes('pad') || 
              pinStr.includes('castellat')) {
            return false
          }
          return true
        })
        
        if (validPins.length > 0) {
          const pinList = validPins.join(', ')
          ports.push({
            id: `${nodeId}_digital_io`,
            label: 'Digital I/O',
            type: 'communication',
            protocol: 'Digital',
            direction: 'bidirectional',
            maxConnections: -1, // Multiple connections allowed
            currentConnections: 0,
            position: { side: 'right', index: 0 },
            description: `${validPins.length} digital pins: ${pinList}`,
            pinNumber: validPins.length
          })
        }
      }
      
      return ports
    }
    
    // For other components, check if they have specific GPIO requirements
    // Only generate GPIO if explicitly needed
    const hasDigitalPins = spec.communication.protocols.includes('Digital') || 
                          spec.communication.protocols.includes('GPIO')
    
    if (hasDigitalPins && spec.category !== 'microcontroller') {
      // For sensors/actuators, typically just show a single digital I/O port
      ports.push({
        id: `${nodeId}_gpio`,
        label: 'Digital I/O',
        type: 'communication',
        protocol: 'GPIO',
        direction: 'bidirectional',
        maxConnections: 1,
        currentConnections: 0,
        position: { side: 'bottom', index: 0 },
        description: 'Digital input/output'
      })
    }

    return ports
  }

  /**
   * 📊 アナログポートの生成
   */
  private generateAnalogPorts(spec: ComponentSpecification, nodeId: string): PortDefinition[] {
    const ports: PortDefinition[] = []
    
    // センサーコンポーネントの場合はアナログ出力を生成
    if (spec.category.toLowerCase().includes('sensor')) {
      ports.push({
        id: `${nodeId}_analog_out`,
        label: 'AOUT',
        type: 'communication',
        protocol: 'Analog',
        direction: 'output',
        maxConnections: 1,
        currentConnections: 0,
        position: { side: 'right', index: 0 },
        description: 'Analog sensor output'
      })
    }

    // For microcontrollers, generate single analog port if specified in the AI response
    if (spec.category.toLowerCase().includes('microcontroller') && 
        spec.communication.pins?.['analog']) {
      const analogPins = spec.communication.pins['analog']
      if (analogPins.length > 0) {
        const pinList = analogPins.join(', ')
        ports.push({
          id: `${nodeId}_analog_input`,
          label: 'Analog Input',
          type: 'communication',
          protocol: 'Analog',
          direction: 'input',
          maxConnections: -1, // Multiple connections allowed
          currentConnections: 0,
          position: { side: 'left', index: 0 },
          description: `${analogPins.length} analog inputs: ${pinList}`,
          pinNumber: analogPins.length
        })
      }
    }

    return ports
  }

  /**
   * 🔌 物理コネクタポートの生成
   */
  private generateConnectorPorts(spec: ComponentSpecification, nodeId: string): PortDefinition[] {
    const ports: PortDefinition[] = []
    
    if (!spec.communication.connectors || spec.communication.connectors.length === 0) {
      // Fallback: If connectors array is missing but USB protocol exists, add a generic USB connector
      if (spec.communication.protocols.includes('USB') && spec.category.toLowerCase().includes('microcontroller')) {
        ports.push({
          id: `${nodeId}_connector_usb_0`,
          label: 'USB',
          type: 'communication',
          protocol: 'USB',
          direction: 'bidirectional',
          maxConnections: 1,
          currentConnections: 0,
          position: { side: 'bottom', index: 0 },
          description: 'USB connector for programming and communication'
        })
      }
      
      return ports
    }
    
    let portIndex = 0
    spec.communication.connectors.forEach(connector => {
      // Generate only ONE port per connector type (not multiple for count)
      const countSuffix = connector.count > 1 ? ` (×${connector.count})` : ''
      const label = connector.version 
        ? `${connector.type}${countSuffix} ${connector.version}`
        : `${connector.type}${countSuffix}`
        
      ports.push({
        id: `${nodeId}_connector_${connector.type.toLowerCase().replace(/[\s-]/g, '_')}_0`,
        label,
        type: 'communication',
        protocol: connector.type,
        direction: this.getConnectorDirection(connector.type, connector.purpose),
        maxConnections: connector.count || 1,  // Allow multiple connections based on count
        currentConnections: 0,
        position: { side: this.getConnectorSide(connector.type), index: portIndex++ },
        description: connector.purpose || connector.specs || `${connector.type} connector${connector.count > 1 ? ` (${connector.count} available)` : ''}`
      })
    })
    
    return ports
  }

  /**
   * 🎯 コネクタの方向を決定
   */
  private getConnectorDirection(type: string, purpose?: string): 'input' | 'output' | 'bidirectional' {
    // Power connectors are usually input
    if (type.includes('Jack') || type.includes('Barrel') || type.includes('DC') ||
        purpose?.toLowerCase().includes('power')) {
      return 'input'
    }
    
    // Display outputs
    if (['HDMI', 'DisplayPort', 'VGA', 'DVI', 'Composite', 'Component'].some(t => type.includes(t)) && 
        !purpose?.toLowerCase().includes('input')) {
      return 'output'
    }
    
    // Audio connectors
    if (type.includes('3.5mm') || type.includes('Audio')) {
      if (purpose?.toLowerCase().includes('out') || purpose?.toLowerCase().includes('speaker')) {
        return 'output'
      }
      if (purpose?.toLowerCase().includes('in') || purpose?.toLowerCase().includes('mic')) {
        return 'input'
      }
      return 'bidirectional'
    }
    
    // SD Card, SIM card slots are input
    if (['SD', 'microSD', 'SIM', 'Memory Card'].some(t => type.includes(t))) {
      return 'input'
    }
    
    // Most connectors are bidirectional (USB, Ethernet, etc.)
    return 'bidirectional'
  }

  /**
   * 📍 コネクタの配置サイドを決定
   */
  private getConnectorSide(type: string): 'top' | 'right' | 'bottom' | 'left' {
    // All connectors are placed at the bottom
    return 'bottom'
  }

  /**
   * 📐 ポートレイアウトの計算
   */
  private calculatePortLayout(config: DynamicPortConfiguration): DynamicPortConfiguration {
    const updatedGroups = config.portGroups.map(group => {
      const updatedPorts = group.ports.map((port, _index) => {
        // ポートタイプと優先順位に基づいてサイド配置を最適化
        const preferredSides = this.layoutConstraints.preferredSides[group.type as keyof typeof this.layoutConstraints.preferredSides] || ['left']
        const optimalSide = this.findOptimalSide(port, preferredSides, config.portGroups)
        
        return {
          ...port,
          position: {
            ...port.position,
            side: optimalSide,
            index: this.calculateSideIndex(port, optimalSide, group, config.portGroups)
          }
        }
      })

      return {
        ...group,
        ports: updatedPorts
      }
    })

    return {
      ...config,
      portGroups: updatedGroups
    }
  }

  /**
   * 🎯 最適なサイド配置の決定
   */
  private findOptimalSide(
    port: PortDefinition, 
    preferredSides: string[], 
    _allGroups: PortGroup[]
  ): 'top' | 'right' | 'bottom' | 'left' {
    // 電力は上下、通信は左右を優先
    if (port.type === 'power') {
      return preferredSides.includes('top') ? 'top' : 'bottom'
    }
    
    if (port.type === 'communication') {
      if (port.direction === 'input') return 'left'
      if (port.direction === 'output') return 'right'
      return 'left' // bidirectional default
    }

    return (preferredSides[0] as 'top' | 'right' | 'bottom' | 'left') || 'left'
  }

  /**
   * 📍 サイド内のインデックス位置計算
   */
  private calculateSideIndex(
    port: PortDefinition,
    side: string,
    _group: PortGroup,
    allGroups: PortGroup[]
  ): number {
    // 同じサイドの既存ポート数を計算
    const existingPortsOnSide = allGroups
      .flatMap(g => g.ports)
      .filter(p => p.position.side === side && p.id !== port.id)
      .length

    return existingPortsOnSide
  }

  /**
   * 📊 ポート容量状態の取得
   */
  public getPortCapacityStatus(nodeId: string, connections: Connection[]): PortCapacityStatus[] {
    const config = this.portConfigurations.get(nodeId)
    if (!config) return []

    const statuses: PortCapacityStatus[] = []

    config.portGroups.forEach(group => {
      group.ports.forEach(port => {
        const portConnections = connections.filter(
          conn => conn.fromId === nodeId || conn.toId === nodeId
        )

        const used = portConnections.length
        const available = port.maxConnections === -1 ? 999 : port.maxConnections
        const percentage = available > 0 ? (used / available) * 100 : 0

        let status: 'available' | 'warning' | 'full' | 'exceeded' = 'available'
        const warnings: string[] = []

        if (percentage >= 100) {
          status = used > available ? 'exceeded' : 'full'
          if (used > available) {
            warnings.push(`Exceeded maximum connections (${used}/${available})`)
          }
        } else if (percentage >= 80) {
          status = 'warning'
          warnings.push(`Approaching connection limit (${used}/${available})`)
        }

        statuses.push({
          portId: port.id,
          available,
          used,
          percentage,
          status,
          warnings
        })
      })
    })

    return statuses
  }

  /**
   * 🔄 ポート構成の更新
   */
  public updatePortConfiguration(
    nodeId: string, 
    updates: Partial<DynamicPortConfiguration>
  ): DynamicPortConfiguration | null {
    const existing = this.portConfigurations.get(nodeId)
    if (!existing) return null

    const updated = {
      ...existing,
      ...updates,
      lastUpdated: new Date().toISOString()
    }

    // レイアウトが変更された場合は再計算
    if (updates.layoutMode || updates.portGroups) {
      const recalculated = this.calculatePortLayout(updated)
      this.portConfigurations.set(nodeId, recalculated)
      return recalculated
    }

    this.portConfigurations.set(nodeId, updated)
    return updated
  }

  /**
   * 📋 ポート構成の取得
   */
  public getPortConfiguration(nodeId: string): DynamicPortConfiguration | null {
    return this.portConfigurations.get(nodeId) || null
  }

  /**
   * 🔍 シンプル構成部品の判定（2-4ピン程度のシンプルな部品）
   */
  private isSimpleComponent(spec: ComponentSpecification): boolean {
    const name = spec.name.toLowerCase()
    const category = spec.category.toLowerCase()
    
    // LEDの判定（2ピン）
    if (name.includes('led') || category.includes('led')) {
      return true
    }
    
    // ダイオードの判定（2ピン）
    if (name.includes('diode') || category.includes('diode')) {
      return true
    }
    
    // センサーの判定（3-4ピン）
    if (category.includes('sensor') || name.includes('sensor') ||
        name.includes('温度') || name.includes('temperature') ||
        name.includes('accelerometer') || name.includes('gyro') ||
        name.includes('proximity') || name.includes('ultrasonic') ||
        name.includes('pressure') || name.includes('humidity') ||
        name.includes('light') || name.includes('pir')) {
      return true
    }
    
    // アクチュエーターの判定（3-4ピン）
    if (category.includes('actuator') || category.includes('motor') ||
        name.includes('servo') || name.includes('motor') ||
        name.includes('speaker') || name.includes('buzzer') ||
        name.includes('relay') || name.includes('solenoid')) {
      return true
    }
    
    // 物理的に2-4ピンの部品
    if (spec.physical.pins >= 2 && spec.physical.pins <= 4) {
      return true
    }
    
    // 抵抗、コンデンサ等の受動部品（2ピン）
    if (category.includes('resistor') || category.includes('capacitor') || 
        category.includes('inductor') || category.includes('crystal')) {
      return true
    }
    
    return false
  }

  /**
   * 🔌 シンプル構成部品のポート生成（2-4ピン）
   */
  private generateSimpleComponentPorts(spec: ComponentSpecification): PortDefinition[] {
    const name = spec.name.toLowerCase()
    const category = spec.category.toLowerCase()
    
    // LEDの場合（2ピン）
    if (name.includes('led') || category.includes('led')) {
      return this.generateLEDPorts(spec)
    }
    
    // ダイオードの場合（2ピン）
    if (name.includes('diode') || category.includes('diode')) {
      return this.generateDiodePorts(spec)
    }
    
    // センサーの場合（3ピン）
    if (category.includes('sensor') || name.includes('sensor') ||
        name.includes('温度') || name.includes('temperature') ||
        name.includes('accelerometer') || name.includes('gyro') ||
        name.includes('proximity') || name.includes('ultrasonic') ||
        name.includes('pressure') || name.includes('humidity') ||
        name.includes('light') || name.includes('pir')) {
      return this.generateSensorPorts(spec)
    }
    
    // アクチュエーターの場合（3-4ピン）
    if (category.includes('actuator') || category.includes('motor') ||
        name.includes('servo') || name.includes('motor') ||
        name.includes('speaker') || name.includes('buzzer') ||
        name.includes('relay') || name.includes('solenoid')) {
      return this.generateActuatorPorts(spec)
    }
    
    // その他の2端子部品（抵抗、コンデンサ等）
    return this.generateGenericTwoTerminalPorts(spec)
  }

  /**
   * 💡 LEDポートの生成（2ピン）
   */
  private generateLEDPorts(spec: ComponentSpecification, nodeId: string): PortDefinition[] {
    return [
      {
        id: `${nodeId}_anode`,
        label: 'Anode',
        type: 'power',
        voltage: spec.voltage.operating[0] || '2.0V',
        direction: 'input',
        maxConnections: 1,
        currentConnections: 0,
        position: { side: 'left', index: 0 },
        description: 'LED anode (+)'
      },
      {
        id: `${nodeId}_cathode`,
        label: 'Cathode',
        type: 'power',
        voltage: '0V',
        direction: 'input',
        maxConnections: 1,
        currentConnections: 0,
        position: { side: 'right', index: 0 },
        description: 'LED cathode (-)'
      }
    ]
  }

  /**
   * 🔌 ダイオードポートの生成（2ピン）
   */
  private generateDiodePorts(spec: ComponentSpecification, nodeId: string): PortDefinition[] {
    return [
      {
        id: `${nodeId}_anode`,
        label: 'Anode',
        type: 'power',
        voltage: spec.voltage.operating[0] || '0.7V',
        direction: 'input',
        maxConnections: 1,
        currentConnections: 0,
        position: { side: 'left', index: 0 },
        description: 'Diode anode (+)'
      },
      {
        id: `${nodeId}_cathode`,
        label: 'Cathode',
        type: 'power',
        voltage: '0V',
        direction: 'output',
        maxConnections: 1,
        currentConnections: 0,
        position: { side: 'right', index: 0 },
        description: 'Diode cathode (-)'
      }
    ]
  }

  /**
   * 📊 センサーポートの生成（3ピン：VCC、GND、信号出力）
   */
  private generateSensorPorts(spec: ComponentSpecification, nodeId: string): PortDefinition[] {
    const name = spec.name.toLowerCase()
    const operatingVoltage = spec.voltage.operating[0] || '3.3V'
    
    // 信号出力の種類を判定
    const isAnalogSensor = name.includes('temperature') || name.includes('pressure') || 
                          name.includes('light') || name.includes('humidity') ||
                          name.includes('accelerometer') || name.includes('gyro')
    
    const signalType = isAnalogSensor ? 'Analog' : 'Digital'
    const signalLabel = isAnalogSensor ? 'AOUT' : 'DOUT'
    
    return [
      {
        id: `${nodeId}_vcc`,
        label: 'VCC',
        type: 'power',
        voltage: operatingVoltage,
        direction: 'input',
        maxConnections: 1,
        currentConnections: 0,
        position: { side: 'top', index: 0 },
        description: `Power input ${operatingVoltage}`
      },
      {
        id: `${nodeId}_gnd`,
        label: 'GND',
        type: 'power',
        voltage: '0V',
        direction: 'input',
        maxConnections: 1,
        currentConnections: 0,
        position: { side: 'bottom', index: 0 },
        description: 'Ground connection'
      },
      {
        id: `${nodeId}_signal_out`,
        label: signalLabel,
        type: 'communication',
        protocol: signalType,
        direction: 'output',
        maxConnections: 1,
        currentConnections: 0,
        position: { side: 'right', index: 0 },
        description: `${signalType} sensor output`
      }
    ]
  }

  /**
   * ⚙️ アクチュエーターポートの生成（3-4ピン：VCC、GND、制御信号、FB等）
   */
  private generateActuatorPorts(spec: ComponentSpecification, nodeId: string): PortDefinition[] {
    const name = spec.name.toLowerCase()
    const operatingVoltage = spec.voltage.operating[0] || '5V'
    const ports: PortDefinition[] = []
    
    // 基本ポート（VCC、GND）
    ports.push(
      {
        id: `${nodeId}_vcc`,
        label: 'VCC',
        type: 'power',
        voltage: operatingVoltage,
        direction: 'input',
        maxConnections: 1,
        currentConnections: 0,
        position: { side: 'top', index: 0 },
        description: `Power input ${operatingVoltage}`
      },
      {
        id: `${nodeId}_gnd`,
        label: 'GND',
        type: 'power',
        voltage: '0V',
        direction: 'input',
        maxConnections: 1,
        currentConnections: 0,
        position: { side: 'bottom', index: 0 },
        description: 'Ground connection'
      }
    )
    
    // 制御信号ポート
    if (name.includes('servo')) {
      ports.push({
        id: `${nodeId}_pwm_control`,
        label: 'PWM',
        type: 'communication',
        protocol: 'PWM',
        direction: 'input',
        maxConnections: 1,
        currentConnections: 0,
        position: { side: 'left', index: 0 },
        description: 'PWM control signal'
      })
    } else if (name.includes('motor')) {
      ports.push({
        id: `${nodeId}_control`,
        label: 'CTRL',
        type: 'communication',
        protocol: 'Digital',
        direction: 'input',
        maxConnections: 1,
        currentConnections: 0,
        position: { side: 'left', index: 0 },
        description: 'Motor control signal'
      })
    } else if (name.includes('speaker') || name.includes('buzzer')) {
      ports.push({
        id: `${nodeId}_audio_in`,
        label: 'AIN',
        type: 'communication',
        protocol: 'Analog',
        direction: 'input',
        maxConnections: 1,
        currentConnections: 0,
        position: { side: 'left', index: 0 },
        description: 'Audio input signal'
      })
    } else {
      // 汎用制御信号
      ports.push({
        id: `${nodeId}_control`,
        label: 'CTRL',
        type: 'communication',
        protocol: 'Digital',
        direction: 'input',
        maxConnections: 1,
        currentConnections: 0,
        position: { side: 'left', index: 0 },
        description: 'Control signal'
      })
    }
    
    // フィードバック信号（サーボモーター等）
    if (name.includes('servo')) {
      ports.push({
        id: `${nodeId}_feedback`,
        label: 'FB',
        type: 'communication',
        protocol: 'Analog',
        direction: 'output',
        maxConnections: 1,
        currentConnections: 0,
        position: { side: 'right', index: 0 },
        description: 'Position feedback signal'
      })
    }
    
    return ports
  }

  /**
   * 🔧 汎用2端子部品のポート生成（抵抗、コンデンサ等）
   */
  private generateGenericTwoTerminalPorts(spec: ComponentSpecification, nodeId: string): PortDefinition[] {
    return [
      {
        id: `${nodeId}_terminal1`,
        label: 'Terminal 1',
        type: 'power',
        voltage: 'N/A',
        direction: 'bidirectional',
        maxConnections: 1,
        currentConnections: 0,
        position: { side: 'left', index: 0 },
        description: 'Component terminal 1'
      },
      {
        id: `${nodeId}_terminal2`,
        label: 'Terminal 2',
        type: 'power',
        voltage: 'N/A',
        direction: 'bidirectional',
        maxConnections: 1,
        currentConnections: 0,
        position: { side: 'right', index: 0 },
        description: 'Component terminal 2'
      }
    ]
  }

  /**
   * 🖥️ マイクロコントローラーの判定
   */
  private isMicrocontroller(spec: ComponentSpecification): boolean {
    const name = spec.name.toLowerCase()
    const category = spec.category.toLowerCase()
    
    return category.includes('microcontroller') || 
           category.includes('mcu') ||
           name.includes('arduino') ||
           name.includes('esp32') ||
           name.includes('esp8266') ||
           name.includes('raspberry pi') ||
           name.includes('atmega') ||
           name.includes('stm32')
  }

  /**
   * ⚡ マイクロコントローラー用電源ポートの生成
   */
  private generateMicrocontrollerPowerPorts(spec: ComponentSpecification, nodeId: string): PortDefinition[] {
    const ports: PortDefinition[] = []
    
    // 電源入力ポート（通常の電源ピン）
    spec.voltage.operating.forEach((voltage, index) => {
      ports.push({
        id: `${nodeId}_power_in_${voltage.replace('.', '_')}`,
        label: `VIN ${voltage}`,
        type: 'power',
        voltage,
        direction: 'input',
        maxConnections: -1,
        currentConnections: 0,
        position: { side: 'top', index: index * 2 },
        description: `Power input at ${voltage}`
      })

      ports.push({
        id: `gnd_in_${index}`,
        label: 'GND',
        type: 'power',
        voltage: '0V',
        direction: 'input',
        maxConnections: -1,
        currentConnections: 0,
        position: { side: 'top', index: index * 2 + 1 },
        description: 'Ground input'
      })
    })

    // 🆕 電源出力ポート（LEDやセンサーに電源を供給）
    const mainVoltage = spec.voltage.operating[0] || '3.3V'
    
    ports.push({
      id: 'vcc_out',
      label: 'VCC OUT',
      type: 'power',
      voltage: mainVoltage,
      direction: 'output',  // 重要：電源を供給する側
      maxConnections: -1,
      currentConnections: 0,
      position: { side: 'bottom', index: 0 },
      description: `${mainVoltage} power output for external components`
    })

    ports.push({
      id: 'gnd_out',
      label: 'GND OUT',
      type: 'power',
      voltage: '0V',
      direction: 'output',  // 重要：GNDを供給する側
      maxConnections: -1,
      currentConnections: 0,
      position: { side: 'bottom', index: 1 },
      description: 'Ground output for external components'
    })

    // 追加で5V出力がある場合（Arduino等）
    if (spec.voltage.operating.includes('5V') || 
        spec.name.toLowerCase().includes('arduino')) {
      ports.push({
        id: 'vcc_5v_out',
        label: '5V OUT',
        type: 'power',
        voltage: '5V',
        direction: 'output',
        maxConnections: -1,
        currentConnections: 0,
        position: { side: 'bottom', index: 2 },
        description: '5V power output for external components'
      })
    }

    return ports
  }

  /**
   * 🗑️ ポート構成の削除
   */
  public removePortConfiguration(nodeId: string): boolean {
    return this.portConfigurations.delete(nodeId)
  }

  /**
   * 📈 システム統計の取得
   */
  public getSystemStats(): {
    totalConfigurations: number
    averagePortsPerNode: number
    protocolDistribution: { [protocol: string]: number }
    layoutModeDistribution: { [mode: string]: number }
  } {
    const configs = Array.from(this.portConfigurations.values())
    const totalPorts = configs.reduce((sum, config) => 
      sum + config.portGroups.reduce((groupSum, group) => groupSum + group.ports.length, 0), 0
    )

    const protocols: { [protocol: string]: number } = {}
    const layoutModes: { [mode: string]: number } = {}

    configs.forEach(config => {
      layoutModes[config.layoutMode] = (layoutModes[config.layoutMode] || 0) + 1
      
      config.portGroups.forEach(group => {
        group.ports.forEach(port => {
          if (port.protocol) {
            protocols[port.protocol] = (protocols[port.protocol] || 0) + 1
          }
        })
      })
    })

    return {
      totalConfigurations: configs.length,
      averagePortsPerNode: configs.length > 0 ? totalPorts / configs.length : 0,
      protocolDistribution: protocols,
      layoutModeDistribution: layoutModes
    }
  }
}

// Export utility functions
export function createDynamicPortSystem(): DynamicPortSystem {
  return DynamicPortSystem.getInstance()
}

export function generatePortsFromAI(
  nodeId: string, 
  specification: ComponentSpecification
): DynamicPortConfiguration {
  const system = DynamicPortSystem.getInstance()
  return system.generatePortsFromSpecification(nodeId, specification)
}

export function getPortCapacity(
  nodeId: string, 
  connections: Connection[]
): PortCapacityStatus[] {
  const system = DynamicPortSystem.getInstance()
  return system.getPortCapacityStatus(nodeId, connections)
}