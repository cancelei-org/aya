// 🎯 ユーザーフレンドリーなメッセージ変換システム
// タスク1.4.1: 技術的詳細を分かりやすい言葉に変換し、具体的な解決策を提示

import type { DirectionalityResult, PowerCapacityInfo } from '../connections/validation/connectionDirectionalityManager'

export interface UserFriendlyMessage {
  title: string
  description: string
  severity: 'info' | 'warning' | 'critical'
  solutions: Solution[]
  learnMore?: string
  quickFix?: QuickFix
}

export interface Solution {
  title: string
  description: string
  difficulty: 'easy' | 'medium' | 'hard'
  timeEstimate: string
  steps: string[]
  requiredParts?: string[]
}

export interface QuickFix {
  title: string
  action: string
  buttonText: string
  automated: boolean
}

/**
 * 🎨 UserFriendlyMessageTranslator
 * 技術的なエラーメッセージを一般ユーザーにも分かりやすい形に変換
 */
export class UserFriendlyMessageTranslator {
  private static instance: UserFriendlyMessageTranslator

  public static getInstance(): UserFriendlyMessageTranslator {
    if (!UserFriendlyMessageTranslator.instance) {
      UserFriendlyMessageTranslator.instance = new UserFriendlyMessageTranslator()
    }
    return UserFriendlyMessageTranslator.instance
  }

  /**
   * 🔄 方向性エラーメッセージの変換
   */
  public translateDirectionalityError(
    result: DirectionalityResult,
    fromComponentName: string,
    toComponentName: string
  ): UserFriendlyMessage {
    switch (result.connectionType) {
      case 'power':
        return this.translatePowerDirectionalityError(result, fromComponentName, toComponentName)
      case 'communication':
        return this.translateCommunicationDirectionalityError(result, fromComponentName, toComponentName)
      default:
        return this.translateUnknownConnectionError(result, fromComponentName, toComponentName)
    }
  }

  /**
   * ⚡ 電力方向性エラーの変換
   */
  private translatePowerDirectionalityError(
    result: DirectionalityResult,
    fromComponentName: string,
    toComponentName: string
  ): UserFriendlyMessage {
    if (result.direction === 'invalid' && result.issue?.includes('reversed')) {
      return {
        title: '⚡ Power Connection is Backwards',
        description: `The power connection between ${fromComponentName} and ${toComponentName} is connected in the wrong direction. Power should flow from the supplier to the consumer.`,
        severity: 'critical',
        solutions: [
          {
            title: 'Reverse the Connection',
            description: 'Simply swap the connection direction to fix the power flow',
            difficulty: 'easy',
            timeEstimate: '1 minute',
            steps: [
              '1. Click on the connection line to select it',
              '2. Delete the connection (press Delete key)',
              '3. Reconnect from power supplier to power consumer',
              '4. Verify the connection shows green (correct direction)'
            ]
          }
        ],
        learnMore: 'Power connections must always flow from supplier (like Arduino, power supply) to consumer (like sensors, LEDs). This prevents damage to components.',
        quickFix: {
          title: 'Auto-fix Connection Direction',
          action: 'reverse_connection',
          buttonText: 'Fix Direction',
          automated: true
        }
      }
    }

    if (result.issue?.includes('same role')) {
      const roleType = result.details.fromRole?.includes('Supplier') ? 'power suppliers' : 'power consumers'
      return {
        title: '🔌 Invalid Connection Between Same Type Components',
        description: `You're trying to connect two ${roleType} together. This won't work - you need to connect a power supplier to a power consumer.`,
        severity: 'critical',
        solutions: [
          {
            title: 'Connect Different Component Types',
            description: 'Connect a power supplier (Arduino, battery) to a power consumer (sensor, LED)',
            difficulty: 'easy',
            timeEstimate: '2 minutes',
            steps: [
              '1. Identify which component supplies power (Arduino, battery, power supply)',
              '2. Identify which component needs power (sensor, LED, motor)',
              '3. Connect from supplier to consumer',
              '4. Check that the connection line turns green'
            ]
          }
        ],
        learnMore: 'Power suppliers provide electricity (Arduino pins, batteries), while power consumers use electricity (sensors, LEDs, motors).'
      }
    }

    return this.createGenericPowerError(result, fromComponentName, toComponentName)
  }

  /**
   * 📡 通信方向性エラーの変換
   */
  private translateCommunicationDirectionalityError(
    result: DirectionalityResult,
    fromComponentName: string,
    toComponentName: string
  ): UserFriendlyMessage {
    if (result.issue?.includes('No compatible communication protocol')) {
      return {
        title: '📡 Communication Protocols Don\'t Match',
        description: `${fromComponentName} and ${toComponentName} use different communication methods and can't talk to each other directly.`,
        severity: 'critical',
        solutions: [
          {
            title: 'Use Compatible Communication Methods',
            description: 'Change to matching communication protocols (I2C, SPI, UART)',
            difficulty: 'medium',
            timeEstimate: '5 minutes',
            steps: [
              '1. Check what communication methods each component supports',
              '2. Find a common protocol (like I2C or SPI)',
              '3. Update the component communication settings',
              '4. Reconnect using the matching protocol'
            ]
          },
          {
            title: 'Add a Protocol Converter',
            description: 'Use a converter module to translate between different protocols',
            difficulty: 'hard',
            timeEstimate: '15 minutes',
            steps: [
              '1. Find a suitable protocol converter module',
              '2. Connect the first component to the converter input',
              '3. Connect the converter output to the second component',
              '4. Configure the converter settings'
            ],
            requiredParts: ['Protocol converter module (I2C-SPI, UART-I2C, etc.)']
          }
        ],
        learnMore: 'Communication protocols are like different languages - both components need to speak the same language to communicate.'
      }
    }

    if (result.issue?.includes('voltage level conversion') || result.issue?.includes('level shifter')) {
      return {
        title: '⚡ Voltage Levels Don\'t Match',
        description: `${fromComponentName} and ${toComponentName} operate at different voltage levels. This can damage components or cause communication failure.`,
        severity: 'warning',
        solutions: [
          {
            title: 'Add a Level Shifter',
            description: 'Use a level shifter IC to safely convert between voltage levels',
            difficulty: 'medium',
            timeEstimate: '10 minutes',
            steps: [
              '1. Identify the voltage levels (e.g., 5V and 3.3V)',
              '2. Get an appropriate level shifter IC',
              '3. Connect the high voltage side to the 5V component',
              '4. Connect the low voltage side to the 3.3V component',
              '5. Test the communication'
            ],
            requiredParts: [result.details.voltageLevel || 'Level shifter IC (e.g., TXS0108E)']
          }
        ],
        learnMore: 'Voltage level conversion prevents damage and ensures reliable communication between components operating at different voltages.',
        quickFix: {
          title: 'Suggest Level Shifter',
          action: 'add_level_shifter',
          buttonText: 'Add Level Shifter',
          automated: false
        }
      }
    }

    return this.createGenericCommunicationError(result, fromComponentName, toComponentName)
  }

  /**
   * 🔋 電力容量エラーメッセージの変換
   */
  public translatePowerCapacityError(
    powerInfo: PowerCapacityInfo,
    fromComponentName: string,
    toComponentName: string,
    voltageIssue?: { fromVoltage: number; toVoltage: number; requiresRegulator: boolean; recommendedIC?: string }
  ): UserFriendlyMessage {
    const shortfall = powerInfo.shortfall || 0
    const severity = shortfall > 100 ? 'critical' : 'warning'

    let title = '🔋 Not Enough Power Available'
    if (severity === 'critical') {
      title = '⚠️ Critical Power Shortage'
    }

    const solutions: Solution[] = []

    // 基本的な電力容量ソリューション
    if (shortfall > 0) {
      solutions.push({
        title: 'Upgrade Power Supply',
        description: `Increase power capacity by ${Math.ceil(shortfall + 50)}mA or more`,
        difficulty: 'easy',
        timeEstimate: '5 minutes',
        steps: [
          '1. Replace current power source with higher capacity one',
          `2. Ensure new power supply provides at least ${powerInfo.consumerRequirement + 50}mA`,
          '3. Check voltage compatibility',
          '4. Reconnect and verify green status'
        ],
        requiredParts: [`Power supply with ${Math.ceil((powerInfo.consumerRequirement + 50) / 100) * 100}mA+ capacity`]
      })

      // 外部電源の提案
      if (fromComponentName.toLowerCase().includes('arduino') && shortfall > 200) {
        solutions.push({
          title: 'Use External Power Supply',
          description: 'Arduino pins have limited power - use a dedicated power supply for high-power components',
          difficulty: 'medium',
          timeEstimate: '10 minutes',
          steps: [
            '1. Get an external power supply (wall adapter or battery pack)',
            '2. Connect the external power to your high-power component',
            '3. Connect the ground (GND) of external supply to Arduino GND',
            '4. Keep signal wires connected to Arduino pins'
          ],
          requiredParts: ['External power supply', 'Breadboard or junction connector']
        })
      }
    }

    // 電圧レベルソリューション
    if (voltageIssue) {
      solutions.push({
        title: 'Add Voltage Regulator',
        description: `Convert ${voltageIssue.fromVoltage}V to ${voltageIssue.toVoltage}V safely`,
        difficulty: 'medium',
        timeEstimate: '15 minutes',
        steps: [
          '1. Get an appropriate voltage regulator',
          `2. Connect input to ${voltageIssue.fromVoltage}V supply`,
          `3. Connect output to component requiring ${voltageIssue.toVoltage}V`,
          '4. Add required capacitors if needed',
          '5. Test voltage output with multimeter'
        ],
        requiredParts: [voltageIssue.recommendedIC || 'Voltage regulator IC']
      })
    }

    return {
      title,
      description: `${fromComponentName} can only provide ${powerInfo.supplierCapacity}mA, but ${toComponentName} needs ${powerInfo.consumerRequirement}mA. This is ${shortfall}mA short of what's needed.`,
      severity,
      solutions,
      learnMore: 'Power capacity is measured in milliamps (mA). Components need sufficient power to work properly. The 80% safety rule ensures reliable operation.',
      quickFix: powerInfo.recommendation ? {
        title: 'Apply Recommended Solution',
        action: 'apply_power_recommendation',
        buttonText: 'Apply Fix',
        automated: false
      } : undefined
    }
  }

  /**
   * 🔗 未接続部品メッセージの変換
   */
  public translateUnconnectedMessage(
    componentName: string,
    totalComponents: number,
    unconnectedCount: number,
    recommendations: string[]
  ): UserFriendlyMessage {
    return {
      title: `🔗 ${componentName} is Not Connected`,
      description: `This component isn't connected to your circuit yet. ${unconnectedCount} of ${totalComponents} components need connections.`,
      severity: 'warning',
      solutions: [
        {
          title: 'Connect to Main Circuit',
          description: 'Add power and communication connections to integrate this component',
          difficulty: 'easy',
          timeEstimate: '3 minutes',
          steps: [
            '1. Connect power (VCC to power supply, GND to ground)',
            '2. Connect communication pins if needed (SDA/SCL for I2C, etc.)',
            '3. Verify all connections are secure',
            '4. Check that component is recognized in circuit'
          ]
        }
      ],
      learnMore: 'All components need at least power connections to work. Communication components also need data connections.',
      quickFix: recommendations.length > 0 ? {
        title: 'Apply Recommended Connections',
        action: 'apply_recommended_connections',
        buttonText: 'Auto-Connect',
        automated: true
      } : undefined
    }
  }

  // Private helper methods

  private createGenericPowerError(
    result: DirectionalityResult,
    fromComponentName: string,
    toComponentName: string
  ): UserFriendlyMessage {
    return {
      title: '⚡ Power Connection Issue',
      description: `There's a problem with the power connection between ${fromComponentName} and ${toComponentName}.`,
      severity: result.severity as any,
      solutions: [
        {
          title: 'Check Connection Direction',
          description: 'Verify power flows from supplier to consumer',
          difficulty: 'easy',
          timeEstimate: '2 minutes',
          steps: [
            '1. Identify which component supplies power',
            '2. Identify which component consumes power', 
            '3. Connect from supplier to consumer',
            '4. Verify connection direction is correct'
          ]
        }
      ],
      learnMore: 'Power connections have direction - always connect from the source to the destination.'
    }
  }

  private createGenericCommunicationError(
    result: DirectionalityResult,
    fromComponentName: string,
    toComponentName: string
  ): UserFriendlyMessage {
    return {
      title: '📡 Communication Issue',
      description: `There's a communication problem between ${fromComponentName} and ${toComponentName}.`,
      severity: result.severity as any,
      solutions: [
        {
          title: 'Check Communication Settings',
          description: 'Verify both components use compatible communication protocols',
          difficulty: 'medium',
          timeEstimate: '5 minutes',
          steps: [
            '1. Check component datasheets for supported protocols',
            '2. Ensure both components support the same protocol',
            '3. Verify correct pin connections',
            '4. Test communication'
          ]
        }
      ],
      learnMore: 'Communication requires compatible protocols and correct wiring.'
    }
  }

  private translateUnknownConnectionError(
    result: DirectionalityResult,
    fromComponentName: string,
    toComponentName: string
  ): UserFriendlyMessage {
    return {
      title: '❓ Connection Type Unknown',
      description: `The system can't determine what type of connection this is between ${fromComponentName} and ${toComponentName}.`,
      severity: 'warning',
      solutions: [
        {
          title: 'Clarify Connection Type',
          description: 'Specify whether this is a power or communication connection',
          difficulty: 'easy',
          timeEstimate: '1 minute',
          steps: [
            '1. Check component documentation',
            '2. Determine if this carries power or data',
            '3. Update connection labels accordingly',
            '4. Reconnect with proper connection type'
          ]
        }
      ],
      learnMore: 'Clear connection labeling helps the system provide better guidance and error checking.'
    }
  }
}

// Export factory function
export function createUserFriendlyMessageTranslator(): UserFriendlyMessageTranslator {
  return UserFriendlyMessageTranslator.getInstance()
}

// Export utility functions
export function translateDirectionalityError(
  result: DirectionalityResult,
  fromComponentName: string,
  toComponentName: string
): UserFriendlyMessage {
  const translator = UserFriendlyMessageTranslator.getInstance()
  return translator.translateDirectionalityError(result, fromComponentName, toComponentName)
}

export function translatePowerCapacityError(
  powerInfo: PowerCapacityInfo,
  fromComponentName: string,
  toComponentName: string,
  voltageIssue?: { fromVoltage: number; toVoltage: number; requiresRegulator: boolean; recommendedIC?: string }
): UserFriendlyMessage {
  const translator = UserFriendlyMessageTranslator.getInstance()
  return translator.translatePowerCapacityError(powerInfo, fromComponentName, toComponentName, voltageIssue)
}

export function translateUnconnectedMessage(
  componentName: string,
  totalComponents: number,
  unconnectedCount: number,
  recommendations: string[]
): UserFriendlyMessage {
  const translator = UserFriendlyMessageTranslator.getInstance()
  return translator.translateUnconnectedMessage(componentName, totalComponents, unconnectedCount, recommendations)
}