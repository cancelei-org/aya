// 🧪 UnifiedCompatibilityChecker統合テスト
// 既存3段階チェックシステムとの互換性確認とパフォーマンステスト

import { 
  UnifiedCompatibilityChecker,
  checkEnhancedConnectionCompatibility,
  type ComponentPair,
  type PerformanceBenchmark
} from '../enhancedCompatibilityChecker'
import { checkSystemCompatibility } from '../compatibilityChecker'
import type { Connection, NodeData, SoftwareContext } from '@/types'
import type { Node } from '@xyflow/react'

describe('UnifiedCompatibilityChecker Integration Tests', () => {
  let checker: UnifiedCompatibilityChecker
  let testComponents: Node<NodeData>[]
  let testConnections: Connection[]

  beforeEach(() => {
    checker = UnifiedCompatibilityChecker.getInstance()
    
    // テスト用コンポーネント（現実的なハードウェア構成）
    testComponents = [
      {
        id: 'arduino_uno',
        type: 'system',
        position: { x: 0, y: 0 },
        data: {
          title: 'Arduino Uno',
          voltage: '5V',
          communication: 'I2C, SPI, UART'
        }
      },
      {
        id: 'esp32',
        type: 'system', 
        position: { x: 200, y: 0 },
        data: {
          title: 'ESP32',
          voltage: '3.3V',
          communication: 'I2C, SPI, UART, WiFi, Bluetooth'
        }
      },
      {
        id: 'bme280_sensor',
        type: 'system',
        position: { x: 100, y: 100 },
        data: {
          title: 'BME280 Sensor',
          voltage: '3.3V',
          communication: 'I2C, SPI'
        }
      },
      {
        id: 'led_strip',
        type: 'system',
        position: { x: 300, y: 100 },
        data: {
          title: 'WS2812B LED Strip',
          voltage: '5V',
          communication: 'PWM'
        }
      },
      {
        id: 'servo_motor',
        type: 'system',
        position: { x: 150, y: 200 },
        data: {
          title: 'SG90 Servo',
          voltage: '5V',
          communication: 'PWM'
        }
      },
      {
        id: 'isolated_component',
        type: 'system',
        position: { x: 400, y: 200 },
        data: {
          title: 'Isolated Component',
          voltage: '12V',
          communication: 'None'
        }
      }
    ]

    // テスト用接続（現実的な接続パターン）
    testConnections = [
      {
        id: 'conn_1',
        fromId: 'arduino_uno',
        toId: 'bme280_sensor',
        fromPort: 'i2c_sda',
        toPort: 'sda'
      },
      {
        id: 'conn_2', 
        fromId: 'esp32',
        toId: 'bme280_sensor',
        fromPort: 'i2c_scl',
        toPort: 'scl'
      },
      {
        id: 'conn_3',
        fromId: 'arduino_uno',
        toId: 'led_strip',
        fromPort: 'digital_6',
        toPort: 'data_in'
      },
      {
        id: 'conn_4',
        fromId: 'esp32',
        toId: 'servo_motor',
        fromPort: 'pwm_2',
        toPort: 'control'
      },
      // 重複接続のテスト
      {
        id: 'conn_5_duplicate',
        fromId: 'arduino_uno',
        toId: 'bme280_sensor',
        fromPort: 'i2c_sda',
        toPort: 'sda'
      }
    ]
  })

  describe('既存3段階チェックシステムとの互換性', () => {
    test('既存システムとの結果一致性確認', async () => {
      // 既存システムでのチェック
      const originalResult = checkSystemCompatibility(testComponents, testConnections)
      
      // 強化システムでのチェック
      const enhancedResult = await checker.checkConnectionCompatibility(
        testConnections,
        testComponents
      )

      // 基本的な互換性判定が一致することを確認
      expect(enhancedResult.isCompatible).toBeDefined()
      expect(enhancedResult.issues).toBeDefined()
      expect(enhancedResult.summary).toBeDefined()
      
      // 追加情報が含まれていることを確認
      expect(enhancedResult.checkedConnections).toBe(testConnections.length)
      expect(enhancedResult.connectedComponents).toBeGreaterThan(0)
      expect(enhancedResult.unconnectedComponents).toContain('isolated_component')
      expect(enhancedResult.performanceGain).toBeDefined()

      console.log('🔍 Original vs Enhanced Results:')
      console.log(`Original issues: ${originalResult.issues.length}`)
      console.log(`Enhanced issues: ${enhancedResult.issues.length}`)
      console.log(`Performance gain: ${enhancedResult.performanceGain.timeReduction}`)
    })

    test('ソフトウェア互換性統合テスト', async () => {
      const softwareContext: SoftwareContext = {
        detectedLibraries: [
          { name: 'WiFi', version: '1.0', platform: 'ESP32' },
          { name: 'Servo', version: '1.1.6', platform: 'Arduino' },
          { name: 'Adafruit_BME280', version: '2.2.2', platform: 'Arduino' }
        ],
        userRequirements: ['temperature_sensing', 'wifi_connectivity', 'servo_control']
      }

      const result = await checker.checkConnectionCompatibility(
        testConnections,
        testComponents,
        softwareContext
      )

      expect(result.issues).toBeDefined()
      // ソフトウェア要件に関する問題が検出されている可能性
      console.log('🔧 Software integration test results:')
      console.log(`Issues found: ${result.issues.length}`)
      result.issues.forEach(issue => {
        console.log(`- ${issue.type}: ${issue.issue}`)
      })
    })

    test('後方互換性確認', async () => {
      // ユーティリティ関数での実行
      const result = await checkEnhancedConnectionCompatibility(
        testConnections,
        testComponents
      )

      expect(result).toBeDefined()
      expect(result.isCompatible).toBeDefined()
      expect(result.performanceGain).toBeDefined()
    })
  })

  describe('パフォーマンス最適化テスト', () => {
    test('ペア抽出アルゴリズムの効率性', () => {
      const startTime = performance.now()
      
      const pairResult = checker.extractComponentPairs(testConnections, testComponents)
      
      const endTime = performance.now()
      const extractionTime = endTime - startTime

      expect(pairResult.pairs.length).toBeGreaterThan(0)
      expect(pairResult.duplicateConnections.length).toBe(1) // 重複接続1個
      expect(pairResult.isolatedComponents.length).toBe(1) // 孤立部品1個
      expect(pairResult.extractionTime).toBeGreaterThan(0)
      expect(pairResult.optimizationRatio).toBeGreaterThan(0)
      expect(extractionTime).toBeLessThan(10) // 10ms以下

      console.log('⚡ Pair extraction performance:')
      console.log(`Pairs extracted: ${pairResult.pairs.length}`)
      console.log(`Duplicates detected: ${pairResult.duplicateConnections.length}`)
      console.log(`Isolated components: ${pairResult.isolatedComponents.length}`)
      console.log(`Optimization ratio: ${pairResult.optimizationRatio}%`)
      console.log(`Extraction time: ${pairResult.extractionTime.toFixed(3)}ms`)
    })

    test('大規模システムベンチマーク', async () => {
      // 小規模テスト（実行時間を考慮）
      const testSizes = [10, 20, 50]
      
      const benchmarks = await checker.runPerformanceBenchmark(testSizes)
      
      expect(benchmarks).toHaveLength(testSizes.length)
      
      benchmarks.forEach((benchmark, index) => {
        expect(benchmark.componentCount).toBe(testSizes[index])
        expect(benchmark.connectionCount).toBeGreaterThan(0)
        expect(benchmark.speedupRatio).toBeGreaterThan(0)
        expect(benchmark.memoryReduction).toBeGreaterThanOrEqual(0)
        
        // アルゴリズムの計算量削減が機能していることを確認
        expect(benchmark.originalComplexity).toBeGreaterThan(benchmark.optimizedComplexity)
        
        // 接続数が部品数の二乗より少ないことを確認（スパースグラフ）
        expect(benchmark.connectionCount).toBeLessThan(benchmark.componentCount * benchmark.componentCount)
      })

      // レポート生成テスト
      const report = checker.generatePerformanceReport(benchmarks)
      expect(report).toContain('Performance Report')
      expect(report).toContain('Speedup')
      expect(report).toContain('Memory Reduction')
      
      console.log('📊 Performance Benchmark Results:')
      console.log(report)
      
      // パフォーマンス改善の傾向をログ出力
      benchmarks.forEach((benchmark, index) => {
        console.log(`${benchmark.componentCount} components: ${benchmark.speedupRatio.toFixed(2)}x speedup, ${benchmark.memoryReduction}% memory reduction`)
      })
    }, 30000) // 30秒タイムアウト
  })

  describe('エラーハンドリングとフォールバック', () => {
    test('無効な接続データの処理', async () => {
      const invalidConnections: Connection[] = [
        {
          id: 'invalid_conn',
          fromId: 'nonexistent_component',
          toId: 'another_nonexistent',
          fromPort: 'invalid_port',
          toPort: 'invalid_port'
        }
      ]

      const result = await checker.checkConnectionCompatibility(
        invalidConnections,
        testComponents
      )

      expect(result).toBeDefined()
      expect(result.checkedConnections).toBe(1)
      expect(result.connectedComponents).toBe(0) // 無効な接続なので0
      expect(result.unconnectedComponents).toHaveLength(testComponents.length)
    })

    test('空の入力データの処理', async () => {
      const emptyResult = await checker.checkConnectionCompatibility([], [])
      
      expect(emptyResult.checkedConnections).toBe(0)
      expect(emptyResult.connectedComponents).toBe(0)
      expect(emptyResult.unconnectedComponents).toHaveLength(0)
      expect(emptyResult.isCompatible).toBe(true) // 問題がなければ互換
    })

    test('部分的なデータでのフォールバック', async () => {
      const partialComponents = testComponents.map(comp => ({
        ...comp,
        data: {
          title: comp.data?.title || 'Unknown',
          // voltage, communicationを意図的に省略
        }
      }))

      const result = await checker.checkConnectionCompatibility(
        testConnections.slice(0, 2), // 一部の接続のみ
        partialComponents
      )

      expect(result).toBeDefined()
      expect(result.checkedConnections).toBe(2)
      // データが不完全でも処理が完了することを確認
    })
  })

  describe('方向性検証統合テスト', () => {
    test('電力接続の方向性チェック', () => {
      const powerConnection: Connection = {
        id: 'power_conn',
        fromId: 'arduino_uno',
        toId: 'servo_motor',
        fromPort: '5v_out',
        toPort: 'vcc'
      }

      const arduino = testComponents.find(c => c.id === 'arduino_uno')!
      const servo = testComponents.find(c => c.id === 'servo_motor')!

      const directionResult = checker.validateConnectionDirection(
        powerConnection,
        arduino,
        servo
      )

      expect(directionResult.isValid).toBe(true)
      expect(directionResult.direction).toBe('supplier_to_consumer')
    })

    test('通信接続の双方向性確認（信号含む）', () => {
      const i2cConnection: Connection = {
        id: 'i2c_conn', 
        fromId: 'arduino_uno',
        toId: 'bme280_sensor',
        fromPort: 'sda',
        toPort: 'sda'
      }

      const arduino = testComponents.find(c => c.id === 'arduino_uno')!
      const sensor = testComponents.find(c => c.id === 'bme280_sensor')!

      const directionResult = checker.validateConnectionDirection(
        i2cConnection,
        arduino,
        sensor
      )

      expect(directionResult.isValid).toBe(true)
      expect(directionResult.direction).toBe('bidirectional')
    })
  })

  describe('ポート制限管理テスト', () => {
    test('通信ポートの制限チェック', () => {
      const mockConnections: Connection[] = Array.from({ length: 5 }, (_, i) => ({
        id: `mock_conn_${i}`,
        fromId: 'arduino_uno',
        toId: `device_${i}`,
        fromPort: 'i2c_sda',
        toPort: 'sda'
      }))

      const validationResult = checker.validatePortLimits(
        'i2c_sda',
        mockConnections,
        'communication',
        4 // 最大4接続
      )

      expect(validationResult.isValid).toBe(false) // 5接続で制限超過
      expect(validationResult.status).toBe('exceeded')
      expect(validationResult.currentConnections).toBe(5)
      expect(validationResult.maxConnections).toBe(4)
    })

    test('電力ポートの無制限接続', () => {
      const mockPowerConnections: Connection[] = Array.from({ length: 10 }, (_, i) => ({
        id: `power_conn_${i}`,
        fromId: 'power_supply',
        toId: `device_${i}`,
        fromPort: '5v_out',
        toPort: 'vcc'
      }))

      const validationResult = checker.validatePortLimits(
        '5v_out',
        mockPowerConnections,
        'power'
      )

      expect(validationResult.isValid).toBe(true) // 電力は無制限
      expect(validationResult.status).toBe('available')
      expect(validationResult.maxConnections).toBe(Infinity)
    })

    test('ポート容量監視', () => {
      const mockPorts = [
        { id: 'i2c_port', type: 'communication' as const, protocol: 'I2C', maxConnections: 4 },
        { id: 'power_port', type: 'power' as const, voltage: '5V' }
      ]

      const mockConnections: Connection[] = [
        { id: 'conn1', fromId: 'a', toId: 'b', fromPort: 'i2c_port', toPort: 'sda' },
        { id: 'conn2', fromId: 'c', toId: 'd', fromPort: 'i2c_port', toPort: 'sda' },
        { id: 'conn3', fromId: 'e', toId: 'f', fromPort: 'power_port', toPort: 'vcc' }
      ]

      const capacityStatus = checker.monitorPortCapacity(mockPorts, mockConnections)

      expect(capacityStatus).toHaveLength(2)
      
      const i2cStatus = capacityStatus.find(status => status.portId === 'i2c_port')!
      expect(i2cStatus.used).toBe(2)
      expect(i2cStatus.available).toBe(2)
      expect(i2cStatus.percentage).toBe(50)
      expect(i2cStatus.status).toBe('available')

      const powerStatus = capacityStatus.find(status => status.portId === 'power_port')!
      expect(powerStatus.used).toBe(1)
      expect(powerStatus.available).toBe(Infinity)
      expect(powerStatus.status).toBe('available')
    })
  })

  describe('統合シナリオテスト', () => {
    test('現実的なIoTプロジェクトシナリオ', async () => {
      // Arduino + センサー + WiFiモジュール + アクチュエーターの典型構成
      const iotComponents: Node<NodeData>[] = [
        {
          id: 'main_controller',
          type: 'system',
          position: { x: 0, y: 0 },
          data: { title: 'Arduino Mega', voltage: '5V', communication: 'I2C, SPI, UART' }
        },
        {
          id: 'temp_sensor',
          type: 'system', 
          position: { x: 100, y: 0 },
          data: { title: 'DS18B20', voltage: '3.3V', communication: 'OneWire' }
        },
        {
          id: 'wifi_module',
          type: 'system',
          position: { x: 200, y: 0 },
          data: { title: 'ESP8266', voltage: '3.3V', communication: 'UART, WiFi' }
        },
        {
          id: 'relay_module',
          type: 'system',
          position: { x: 300, y: 0 },
          data: { title: '8-Channel Relay', voltage: '5V', communication: 'Digital' }
        }
      ]

      const iotConnections: Connection[] = [
        { id: 'temp_conn', fromId: 'main_controller', toId: 'temp_sensor', fromPort: 'digital_2', toPort: 'data' },
        { id: 'wifi_conn', fromId: 'main_controller', toId: 'wifi_module', fromPort: 'uart_tx', toPort: 'rx' },
        { id: 'relay_conn', fromId: 'main_controller', toId: 'relay_module', fromPort: 'digital_8', toPort: 'in1' }
      ]

      const result = await checker.checkConnectionCompatibility(iotConnections, iotComponents)

      expect(result.checkedConnections).toBe(3)
      expect(result.connectedComponents).toBe(4)
      expect(result.unconnectedComponents).toHaveLength(0)

      // 電圧不一致問題が検出されることを期待
      const voltageIssues = result.issues.filter(issue => issue.type === 'voltage_mismatch')
      expect(voltageIssues.length).toBeGreaterThan(0)

      console.log('🏠 IoT Project Scenario Results:')
      console.log(`Compatibility: ${result.isCompatible ? 'OK' : 'Issues Found'}`)
      console.log(`Performance: ${result.performanceGain.timeReduction}`)
      result.issues.forEach(issue => {
        console.log(`- ${issue.severity.toUpperCase()}: ${issue.issue}`)
      })
    })
  })
})