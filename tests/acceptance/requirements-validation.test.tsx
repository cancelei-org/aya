/**
 * 要件検証テスト
 * 全要件に対する受入テスト
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UnifiedCompatibilityChecker } from '@/utils/enhancedCompatibilityChecker'
import { AISpecificationService } from '@/utils/ai/core/aiSpecificationService'
import { DynamicPortSystem } from '@/utils/connections/ports/dynamicPortSystem'
import { UnconnectedPartsWarning } from '@/components/warnings/UnconnectedPartsWarning'
import { DirectionalityWarning } from '@/components/warnings/DirectionalityWarning'
import { IntegratedWarningPanel } from '@/components/warnings/IntegratedWarningPanel'
import type { NodeData, Connection } from '@/types'

describe('要件検証テスト', () => {
  describe('要件1: 設計書にコネクタ構成されていた部品同士の互換性チェック', () => {
    it('1.1: 接続されている部品ペアのみをチェック対象とする', async () => {
      const checker = new UnifiedCompatibilityChecker()
      const nodes = [
        { id: 'arduino', data: { title: 'Arduino Uno' } },
        { id: 'sensor1', data: { title: 'Temperature Sensor' } },
        { id: 'sensor2', data: { title: 'Humidity Sensor' } },
        { id: 'display', data: { title: 'OLED Display' } } // 未接続
      ]
      
      const connections: Connection[] = [
        { id: 'c1', fromId: 'arduino', toId: 'sensor1', fromPort: 'sda', toPort: 'sda' },
        { id: 'c2', fromId: 'arduino', toId: 'sensor2', fromPort: 'scl', toPort: 'scl' }
      ]
      
      const result = await checker.checkConnectionsCompatibility(nodes, connections)
      
      // displayは接続されていないのでチェック対象外
      expect(result.checks).toHaveLength(2)
      expect(result.checks.some(c => c.components.includes('OLED Display'))).toBe(false)
    })

    it('1.2: 全部品の総当たりではなく、接続ペアのみチェック', async () => {
      const checker = new UnifiedCompatibilityChecker()
      const checkSpy = jest.spyOn(checker as any, 'checkPairCompatibility')
      
      const nodes = Array.from({ length: 10 }, (_, i) => ({
        id: `node${i}`,
        data: { title: `Component ${i}` }
      }))
      
      const connections: Connection[] = [
        { id: 'c1', fromId: 'node0', toId: 'node1', fromPort: 'out', toPort: 'in' },
        { id: 'c2', fromId: 'node1', toId: 'node2', fromPort: 'out', toPort: 'in' }
      ]
      
      await checker.checkConnectionsCompatibility(nodes, connections)
      
      // 10部品の総当たりなら45回、接続ペアのみなら2回
      expect(checkSpy).toHaveBeenCalledTimes(2)
    })

    it('1.3: 大規模システムでのパフォーマンス最適化確認', async () => {
      const checker = new UnifiedCompatibilityChecker()
      
      // 100ノード、200接続のシステム
      const nodes = Array.from({ length: 100 }, (_, i) => ({
        id: `node${i}`,
        data: { title: `Component ${i}`, specifications: { voltage: '5V' } }
      }))
      
      const connections: Connection[] = Array.from({ length: 200 }, (_, i) => ({
        id: `conn${i}`,
        fromId: `node${Math.floor(i / 2)}`,
        toId: `node${Math.floor(i / 2) + 1}`,
        fromPort: 'out',
        toPort: 'in'
      }))
      
      const startTime = performance.now()
      await checker.checkConnectionsCompatibility(nodes, connections)
      const elapsed = performance.now() - startTime
      
      // 200接続のチェックが1秒以内に完了
      expect(elapsed).toBeLessThan(1000)
    })
  })

  describe('要件2: AI検索による未登録部品仕様の取得', () => {
    const aiService = new AISpecificationService()
    
    beforeEach(() => {
      // AI APIのモック
      jest.spyOn(aiService as any, 'callOpenAI').mockResolvedValue({
        specifications: {
          voltage: '3.3V',
          communication: 'I2C,SPI,UART',
          gpio: 32,
          analog: 8
        },
        confidence: 0.92
      })
    })

    it('2.1: OpenAI APIによる電子部品仕様検索', async () => {
      const result = await aiService.searchComponentSpecifications('ESP32 DevKit')
      
      expect(result.specifications).toBeDefined()
      expect(result.specifications.voltage).toBe('3.3V')
      expect(result.specifications.communication).toContain('I2C')
    })

    it('2.2: 信頼度スコアによる結果検証', async () => {
      const result = await aiService.searchComponentSpecifications('Custom Sensor XYZ')
      
      expect(result.confidence).toBeDefined()
      expect(result.confidence).toBeGreaterThanOrEqual(0)
      expect(result.confidence).toBeLessThanOrEqual(1)
    })

    it('2.5: 信頼性表示（信頼度スコア・情報源URL）', async () => {
      const result = await aiService.searchComponentSpecifications('Arduino Uno')
      
      expect(result.sources).toBeDefined()
      expect(result.sources.length).toBeGreaterThan(0)
      expect(result.sources[0]).toHaveProperty('type')
      expect(result.sources[0]).toHaveProperty('url')
      expect(result.sources[0]).toHaveProperty('reliability')
    })

    it('2.6: 結果キャッシュシステム', async () => {
      const component = 'Raspberry Pi 4'
      
      // 初回検索
      const result1 = await aiService.searchComponentSpecifications(component)
      const callCount1 = (aiService as any).callOpenAI.mock.calls.length
      
      // 2回目検索（キャッシュから）
      const result2 = await aiService.searchComponentSpecifications(component)
      const callCount2 = (aiService as any).callOpenAI.mock.calls.length
      
      expect(result1).toEqual(result2)
      expect(callCount2).toBe(callCount1) // API呼び出し回数が増えていない
    })

    it('2.8: 手動確認オプション', () => {
      // ManualAISearchコンポーネントの存在確認
      const ManualAISearch = require('@/components/ManualAISearch').default
      expect(ManualAISearch).toBeDefined()
    })
  })

  describe('要件3: 未接続部品の警告', () => {
    it('3.1: 部品リストと接続情報の比較', () => {
      const nodes = [
        { id: 'n1', data: { title: 'Arduino' } },
        { id: 'n2', data: { title: 'Sensor' } },
        { id: 'n3', data: { title: 'Display' } }
      ]
      
      const connections = [
        { id: 'c1', fromId: 'n1', toId: 'n2' }
      ]
      
      render(
        <UnconnectedPartsWarning
          nodes={nodes}
          connections={connections}
          delay={0}
        />
      )
      
      // Displayが未接続として検出される
      expect(screen.getByText(/1 unconnected component/i)).toBeInTheDocument()
    })

    it('3.2: 警告UIの表示（オレンジ色警告）', () => {
      const nodes = [{ id: 'n1', data: { title: 'Unconnected Part' } }]
      
      const { container } = render(
        <UnconnectedPartsWarning
          nodes={nodes}
          connections={[]}
          delay={0}
        />
      )
      
      const warningElement = container.querySelector('.warning')
      expect(warningElement).toHaveClass('warning-orange')
      expect(warningElement).toHaveStyle({ color: 'rgb(251, 146, 60)' })
    })

    it('3.4: 全部品接続済みの確認表示', () => {
      const nodes = [
        { id: 'n1', data: { title: 'Arduino' } },
        { id: 'n2', data: { title: 'Sensor' } }
      ]
      
      const connections = [
        { id: 'c1', fromId: 'n1', toId: 'n2' }
      ]
      
      const { container } = render(
        <UnconnectedPartsWarning
          nodes={nodes}
          connections={connections}
          delay={0}
        />
      )
      
      // 全部品接続済みの緑色表示
      const successElement = container.querySelector('.success')
      expect(successElement).toHaveClass('success-green')
      expect(successElement).toHaveStyle({ color: 'rgb(34, 197, 94)' })
    })
  })

  describe('要件4: 接続方向性の判定', () => {
    it('4.1: 電力供給方向の検証', () => {
      const result = DirectionalityWarning.checkPowerDirection({
        source: { type: 'power', direction: 'output', voltage: '5V' },
        target: { type: 'power', direction: 'input', voltage: '5V' }
      })
      
      expect(result.valid).toBe(true)
      
      const reverseResult = DirectionalityWarning.checkPowerDirection({
        source: { type: 'power', direction: 'input', voltage: '5V' },
        target: { type: 'power', direction: 'output', voltage: '5V' }
      })
      
      expect(reverseResult.valid).toBe(false)
      expect(reverseResult.error).toContain('逆方向')
    })

    it('4.2: 通信プロトコルの双方向性チェック', () => {
      const protocols = {
        I2C: { bidirectional: true },
        SPI: { bidirectional: false },
        UART: { bidirectional: true }
      }
      
      Object.entries(protocols).forEach(([protocol, config]) => {
        const result = DirectionalityWarning.checkProtocolDirection(protocol)
        expect(result.bidirectional).toBe(config.bidirectional)
      })
    })

    it('4.5: 電力容量・電圧レベル判定', () => {
      const powerCheck = DirectionalityWarning.checkPowerCapacity({
        source: { capacity: '500mA', voltage: '5V' },
        consumers: [
          { required: '100mA', voltage: '5V' },
          { required: '200mA', voltage: '5V' }
        ]
      })
      
      expect(powerCheck.sufficient).toBe(true)
      expect(powerCheck.remaining).toBe('200mA')
      
      const voltageCheck = DirectionalityWarning.checkVoltageCompatibility('5V', '3.3V')
      expect(voltageCheck.compatible).toBe(false)
      expect(voltageCheck.suggestion).toContain('レベルシフタ')
    })
  })

  describe('要件5: 動的ポートシステム', () => {
    const portSystem = new DynamicPortSystem()
    
    it('5.1: AI取得仕様からの動的ポート生成', () => {
      const specs = {
        voltage: '3.3V/5V',
        communication: 'I2C,SPI,UART',
        gpio: 26,
        analog: 6,
        pwm: true
      }
      
      const config = portSystem.generatePortConfiguration(specs)
      
      expect(config.ports.length).toBeGreaterThan(30)
      expect(config.groups.power.length).toBeGreaterThan(0)
      expect(config.groups.communication.length).toBeGreaterThan(0)
      expect(config.groups.digital.length).toBe(26)
      expect(config.groups.analog.length).toBe(6)
    })

    it('5.4: ポート制限管理（I2C:127、SPI/UART:1対1）', () => {
      const limitManager = portSystem.getLimitManager()
      
      const i2cPort = { type: 'communication', protocol: 'I2C', capacity: 127 }
      expect(limitManager.checkConnectionLimit(i2cPort, 50)).toBe(true)
      expect(limitManager.checkConnectionLimit(i2cPort, 130)).toBe(false)
      
      const spiPort = { type: 'communication', protocol: 'SPI', capacity: 1 }
      expect(limitManager.checkConnectionLimit(spiPort, 0)).toBe(true)
      expect(limitManager.checkConnectionLimit(spiPort, 1)).toBe(false)
    })

    it('5.7: 複雑部品対応（60ポート以上）', () => {
      const complexSpecs = {
        voltage: '3.3V',
        communication: 'I2C,SPI,UART,CAN',
        gpio: 54,
        analog: 16,
        pwm: true,
        dac: 2
      }
      
      const config = portSystem.generatePortConfiguration(complexSpecs)
      
      expect(config.ports.length).toBeGreaterThanOrEqual(60)
      expect(config.expandable).toBe(true)
      expect(config.layout).toBe('grid') // 大量ポート用レイアウト
    })
  })

  describe('統合テスト: 全機能の連携確認', () => {
    it('完全なワークフロー: 部品追加→AI検索→互換性チェック→警告表示', async () => {
      // 1. AI検索で部品仕様取得
      const aiService = new AISpecificationService()
      const searchResult = await aiService.searchComponentSpecifications('ESP32')
      expect(searchResult.specifications).toBeDefined()
      
      // 2. 動的ポート生成
      const portSystem = new DynamicPortSystem()
      const portConfig = portSystem.generatePortConfiguration(searchResult.specifications)
      expect(portConfig.ports.length).toBeGreaterThan(0)
      
      // 3. 互換性チェック
      const checker = new UnifiedCompatibilityChecker()
      const nodes = [
        { id: 'esp32', data: { title: 'ESP32', specifications: searchResult.specifications } },
        { id: 'arduino', data: { title: 'Arduino Uno', specifications: { voltage: '5V' } } }
      ]
      const connections = [
        { id: 'c1', fromId: 'arduino', toId: 'esp32', fromPort: 'tx', toPort: 'rx' }
      ]
      
      const compatibility = await checker.checkConnectionsCompatibility(nodes, connections)
      
      // 4. 警告表示
      expect(compatibility.issues.some(i => i.type === 'voltage_mismatch')).toBe(true)
      
      // 5. 統合警告パネルで表示
      render(
        <IntegratedWarningPanel
          compatibilityIssues={compatibility.issues}
          unconnectedParts={[]}
          directionalityWarnings={[]}
        />
      )
      
      expect(screen.getByText(/voltage mismatch/i)).toBeInTheDocument()
      expect(screen.getByText(/5V.*3.3V/)).toBeInTheDocument()
    })
  })
})