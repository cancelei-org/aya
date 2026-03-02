/**
 * 複雑部品表示のユーザビリティテスト
 * Phase 4.2.1: Teensy 4.1級部品の表示・操作性テスト
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ComplexComponentManager } from '@/components/management/ComplexComponentManager'
import { ExpandablePortView } from '@/components/visualization/ExpandablePortView'
import { DynamicPortLayoutManager } from '@/components/nodes/DynamicPortLayoutManager'
import type { DynamicPortConfiguration, ComplexComponentState } from '@/types/canvas'

// Teensy 4.1相当の複雑な部品設定
const teensyConfig: DynamicPortConfiguration = {
  ports: [
    // デジタルピン（41本）
    ...Array.from({ length: 41 }, (_, i) => ({
      id: `digital-${i}`,
      name: `D${i}`,
      type: 'digital' as const,
      direction: 'bidirectional' as const,
      position: i < 20 ? 'left' : 'right',
      capacity: 1,
      protocol: i < 2 ? 'UART' : undefined,
      metadata: {
        pwmCapable: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 22, 23].includes(i),
        interruptCapable: true
      }
    })),
    // アナログピン（18本）
    ...Array.from({ length: 18 }, (_, i) => ({
      id: `analog-${i}`,
      name: `A${i}`,
      type: 'analog' as const,
      direction: 'input' as const,
      position: 'left',
      capacity: 1,
      metadata: {
        resolution: '12bit',
        maxVoltage: '3.3V'
      }
    })),
    // 通信ピン
    { id: 'sda', name: 'SDA', type: 'communication', direction: 'bidirectional', position: 'right', protocol: 'I2C' },
    { id: 'scl', name: 'SCL', type: 'communication', direction: 'bidirectional', position: 'right', protocol: 'I2C' },
    { id: 'mosi', name: 'MOSI', type: 'communication', direction: 'output', position: 'right', protocol: 'SPI' },
    { id: 'miso', name: 'MISO', type: 'communication', direction: 'input', position: 'right', protocol: 'SPI' },
    { id: 'sck', name: 'SCK', type: 'communication', direction: 'output', position: 'right', protocol: 'SPI' },
    // 電源ピン
    { id: '3v3', name: '3.3V', type: 'power', direction: 'output', position: 'bottom', capacity: 10 },
    { id: 'gnd1', name: 'GND', type: 'power', direction: 'input', position: 'bottom', capacity: -1 },
    { id: 'gnd2', name: 'GND', type: 'power', direction: 'input', position: 'bottom', capacity: -1 },
    { id: 'vin', name: 'VIN', type: 'power', direction: 'input', position: 'bottom', capacity: 1 }
  ],
  groups: {
    digital: [], // 後で設定
    analog: [],  // 後で設定
    communication: [], // 後で設定
    power: []    // 後で設定
  },
  layout: 'grid',
  expandable: true
}

// グループ分けを設定
teensyConfig.groups.digital = teensyConfig.ports.filter(p => p.type === 'digital')
teensyConfig.groups.analog = teensyConfig.ports.filter(p => p.type === 'analog')
teensyConfig.groups.communication = teensyConfig.ports.filter(p => p.type === 'communication')
teensyConfig.groups.power = teensyConfig.ports.filter(p => p.type === 'power')

describe('Complex Component Display Usability Tests', () => {
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    user = userEvent.setup()
  })

  describe('Teensy 4.1 Level Component Display', () => {
    it('should handle 60+ ports without performance degradation', async () => {
      const startTime = performance.now()
      
      const { container } = render(
        <DynamicPortLayoutManager
          nodeId="teensy-test"
          portConfig={teensyConfig}
          displayMode="expanded"
          onPortClick={jest.fn()}
        />
      )
      
      const renderTime = performance.now() - startTime
      
      // レンダリング時間の検証（500ms以内）
      expect(renderTime).toBeLessThan(500)
      
      // ポート数の検証
      const ports = container.querySelectorAll('[data-testid^="port-"]')
      expect(ports.length).toBeGreaterThanOrEqual(60)
    })

    it('should provide intuitive port grouping and navigation', async () => {
      render(
        <ExpandablePortView
          portConfig={teensyConfig}
          viewMode="grouped"
          onPortSelect={jest.fn()}
        />
      )

      // グループが表示されることを確認
      expect(screen.getByText(/Digital \(41\)/i)).toBeInTheDocument()
      expect(screen.getByText(/Analog \(18\)/i)).toBeInTheDocument()
      expect(screen.getByText(/Communication \(5\)/i)).toBeInTheDocument()
      expect(screen.getByText(/Power \(4\)/i)).toBeInTheDocument()

      // グループの展開/折りたたみテスト
      const digitalGroup = screen.getByText(/Digital \(41\)/i)
      await user.click(digitalGroup)
      
      // デジタルピンが表示されることを確認
      await waitFor(() => {
        expect(screen.getByText('D0')).toBeVisible()
        expect(screen.getByText('D40')).toBeVisible()
      })
    })

    it('should support efficient port search and filtering', async () => {
      const { getByPlaceholderText } = render(
        <ExpandablePortView
          portConfig={teensyConfig}
          viewMode="list"
          showSearch={true}
          onPortSelect={jest.fn()}
        />
      )

      const searchInput = getByPlaceholderText(/Search ports/i)
      
      // PWM対応ピンの検索
      await user.type(searchInput, 'PWM')
      
      await waitFor(() => {
        // PWM対応ピンのみが表示される
        const visiblePorts = screen.getAllByTestId(/^port-digital-/)
        const pwmPorts = visiblePorts.filter(port => {
          const portId = port.getAttribute('data-testid')
          const pinNumber = parseInt(portId?.replace('port-digital-', '') || '0')
          return [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 22, 23].includes(pinNumber)
        })
        expect(pwmPorts.length).toBeGreaterThan(0)
      })

      // フィルターのクリア
      await user.clear(searchInput)
      await user.type(searchInput, 'I2C')
      
      await waitFor(() => {
        expect(screen.getByText('SDA')).toBeVisible()
        expect(screen.getByText('SCL')).toBeVisible()
      })
    })

    it('should display port details on hover/click', async () => {
      const onPortClick = jest.fn()
      
      render(
        <DynamicPortLayoutManager
          nodeId="teensy-test"
          portConfig={teensyConfig}
          displayMode="detailed"
          onPortClick={onPortClick}
        />
      )

      // アナログピンをホバー
      const analogPin = screen.getByText('A0')
      fireEvent.mouseEnter(analogPin)

      // ツールチップが表示されることを確認
      await waitFor(() => {
        expect(screen.getByText(/12bit resolution/i)).toBeVisible()
        expect(screen.getByText(/Max: 3.3V/i)).toBeVisible()
      })

      // ピンをクリック
      await user.click(analogPin)
      expect(onPortClick).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'analog-0',
          name: 'A0',
          type: 'analog'
        })
      )
    })

    it('should handle display mode transitions smoothly', async () => {
      const { rerender } = render(
        <ComplexComponentManager
          nodeId="teensy-test"
          componentType="Teensy 4.1"
          portConfig={teensyConfig}
          initialMode="compact"
        />
      )

      // コンパクトモードでの表示確認
      expect(screen.getByText(/68 ports/i)).toBeInTheDocument()

      // 展開ボタンをクリック
      const expandButton = screen.getByLabelText(/Expand/i)
      await user.click(expandButton)

      // スムーズな遷移アニメーション（CSS transitionのテスト）
      const container = screen.getByTestId('port-container')
      expect(container).toHaveStyle('transition: all 0.3s ease')

      // 展開モードでの表示確認
      await waitFor(() => {
        expect(screen.getByText('D0')).toBeVisible()
        expect(screen.getAllByTestId(/^port-/)).toHaveLength(68)
      })
    })

    it('should save and restore user preferences', async () => {
      const { rerender } = render(
        <ComplexComponentManager
          nodeId="teensy-test"
          componentType="Teensy 4.1"
          portConfig={teensyConfig}
          enablePresets={true}
        />
      )

      // カスタム表示設定
      const customizeButton = screen.getByLabelText(/Customize/i)
      await user.click(customizeButton)

      // デジタルグループを非表示
      const digitalToggle = screen.getByLabelText(/Hide Digital/i)
      await user.click(digitalToggle)

      // プリセットとして保存
      const savePresetButton = screen.getByText(/Save Preset/i)
      await user.click(savePresetButton)
      
      const presetNameInput = screen.getByPlaceholderText(/Preset name/i)
      await user.type(presetNameInput, 'Analog Only')
      
      const confirmSave = screen.getByText(/Save/i)
      await user.click(confirmSave)

      // コンポーネントを再レンダリング
      rerender(
        <ComplexComponentManager
          nodeId="teensy-test-2"
          componentType="Teensy 4.1"
          portConfig={teensyConfig}
          enablePresets={true}
        />
      )

      // 保存したプリセットを適用
      const presetSelector = screen.getByLabelText(/Select preset/i)
      await user.selectOptions(presetSelector, 'Analog Only')

      // デジタルグループが非表示になっていることを確認
      expect(screen.queryByText('D0')).not.toBeInTheDocument()
      expect(screen.getByText('A0')).toBeInTheDocument()
    })

    it('should provide visual feedback for port connections', async () => {
      const connectedPorts = ['digital-2', 'analog-0', 'sda', '3v3']
      
      render(
        <DynamicPortLayoutManager
          nodeId="teensy-test"
          portConfig={teensyConfig}
          displayMode="expanded"
          connectedPorts={connectedPorts}
          onPortClick={jest.fn()}
        />
      )

      // 接続済みポートの視覚的フィードバック
      connectedPorts.forEach(portId => {
        const portElement = screen.getByTestId(`port-${portId}`)
        expect(portElement).toHaveClass('connected')
        expect(portElement).toHaveStyle({
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderColor: '#3b82f6'
        })
      })

      // 未接続ポートの確認
      const unconnectedPort = screen.getByTestId('port-digital-10')
      expect(unconnectedPort).not.toHaveClass('connected')
    })

    it('should handle port capacity and restrictions', async () => {
      const onConnectionAttempt = jest.fn()
      
      render(
        <DynamicPortLayoutManager
          nodeId="teensy-test"
          portConfig={teensyConfig}
          displayMode="expanded"
          onPortClick={onConnectionAttempt}
          portCapacityStatus={{
            '3v3': { used: 9, total: 10 }, // ほぼ満杯
            'digital-0': { used: 1, total: 1 } // 満杯
          }}
        />
      )

      // 容量制限の視覚表示
      const powerPort = screen.getByTestId('port-3v3')
      expect(powerPort).toHaveClass('near-capacity')
      expect(screen.getByText('9/10')).toBeInTheDocument()

      // 満杯のポート
      const digitalPort = screen.getByTestId('port-digital-0')
      expect(digitalPort).toHaveClass('full-capacity')
      expect(digitalPort).toHaveAttribute('aria-disabled', 'true')
    })
  })

  describe('Performance Optimization Tests', () => {
    it('should use virtualization for large port lists', async () => {
      // 仮想化のテスト（react-window使用想定）
      const { container } = render(
        <ExpandablePortView
          portConfig={teensyConfig}
          viewMode="list"
          enableVirtualization={true}
          onPortSelect={jest.fn()}
        />
      )

      // 仮想化コンテナの確認
      const virtualList = container.querySelector('[data-testid="virtual-list"]')
      expect(virtualList).toBeInTheDocument()

      // 表示されているアイテム数が全体より少ないことを確認
      const visibleItems = container.querySelectorAll('[data-testid^="port-"]')
      expect(visibleItems.length).toBeLessThan(teensyConfig.ports.length)
    })

    it('should debounce search input for performance', async () => {
      const onSearch = jest.fn()
      
      render(
        <ExpandablePortView
          portConfig={teensyConfig}
          viewMode="list"
          showSearch={true}
          onSearch={onSearch}
          onPortSelect={jest.fn()}
        />
      )

      const searchInput = screen.getByPlaceholderText(/Search ports/i)
      
      // 高速タイピングのシミュレーション
      await user.type(searchInput, 'analog pin test')
      
      // デバウンスのため、すぐには呼ばれない
      expect(onSearch).not.toHaveBeenCalled()
      
      // デバウンス時間（300ms）後に呼ばれる
      await waitFor(() => {
        expect(onSearch).toHaveBeenCalledWith('analog pin test')
      }, { timeout: 400 })
      
      // 呼び出し回数が入力文字数より少ない
      expect(onSearch).toHaveBeenCalledTimes(1)
    })
  })
})