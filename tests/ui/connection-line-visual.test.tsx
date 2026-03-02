/**
 * 接続線視覚区別の有効性検証
 * Phase 4.2.2: 電力・信号線の区別しやすさテスト
 */

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { PowerConnectionEdge } from '@/components/edges/PowerConnectionEdge'
import { SignalConnectionEdge } from '@/components/edges/SignalConnectionEdge'
import { MultiConnectionVisualizer } from '@/components/visualization/MultiConnectionVisualizer'
import type { EdgeProps } from '@xyflow/react'
import type { Connection } from '@/types'

// 色覚異常シミュレーション用のフィルター
const colorBlindFilters = {
  protanopia: (color: string) => {
    // 赤色盲のシミュレーション
    const rgb = hexToRgb(color)
    return rgbToHex({
      r: 0.567 * rgb.r + 0.433 * rgb.g,
      g: 0.558 * rgb.r + 0.442 * rgb.g,
      b: 0.242 * rgb.g + 0.758 * rgb.b
    })
  },
  deuteranopia: (color: string) => {
    // 緑色盲のシミュレーション
    const rgb = hexToRgb(color)
    return rgbToHex({
      r: 0.625 * rgb.r + 0.375 * rgb.g,
      g: 0.7 * rgb.r + 0.3 * rgb.g,
      b: 0.3 * rgb.g + 0.7 * rgb.b
    })
  },
  tritanopia: (color: string) => {
    // 青色盲のシミュレーション
    const rgb = hexToRgb(color)
    return rgbToHex({
      r: 0.95 * rgb.r + 0.05 * rgb.g,
      g: 0.433 * rgb.g + 0.567 * rgb.b,
      b: 0.475 * rgb.g + 0.525 * rgb.b
    })
  }
}

// ヘルパー関数
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 }
}

function rgbToHex(rgb: { r: number; g: number; b: number }): string {
  return '#' + [rgb.r, rgb.g, rgb.b].map(x => {
    const hex = Math.round(x).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }).join('')
}

// モックエッジプロパティ
const mockEdgeProps: EdgeProps = {
  id: 'test-edge',
  source: 'node-1',
  target: 'node-2',
  sourceX: 100,
  sourceY: 100,
  targetX: 300,
  targetY: 150,
  sourcePosition: 'right' as any,
  targetPosition: 'left' as any,
  style: {},
  data: {}
}

describe('Connection Line Visual Distinction Tests', () => {
  describe('Power vs Signal Line Distinction', () => {
    it('should clearly distinguish power lines with thickness', () => {
      const { container } = render(
        <>
          <svg width="400" height="200">
            <PowerConnectionEdge
              {...mockEdgeProps}
              data={{ voltage: '5V', connectionType: 'power' }}
            />
            <SignalConnectionEdge
              {...mockEdgeProps}
              sourceY={150}
              targetY={200}
              data={{ communication: 'I2C', connectionType: 'signal' }}
            />
          </svg>
        </>
      )

      const powerLine = container.querySelector('[data-testid="power-edge"]')
      const signalLine = container.querySelector('[data-testid="signal-edge"]')

      // 線の太さの比較
      const powerStrokeWidth = powerLine?.getAttribute('stroke-width')
      const signalStrokeWidth = signalLine?.getAttribute('stroke-width')

      expect(parseInt(powerStrokeWidth || '0')).toBeGreaterThan(parseInt(signalStrokeWidth || '0'))
      expect(parseInt(powerStrokeWidth || '0')).toBeGreaterThanOrEqual(4) // 電力線は4px以上
      expect(parseInt(signalStrokeWidth || '0')).toBeLessThanOrEqual(2) // 信号線は2px以下
    })

    it('should use distinct colors for different voltage levels', () => {
      const voltages = ['3.3V', '5V', '12V', '24V']
      const { container } = render(
        <svg width="400" height="400">
          {voltages.map((voltage, index) => (
            <PowerConnectionEdge
              key={voltage}
              {...mockEdgeProps}
              id={`power-${voltage}`}
              sourceY={100 + index * 50}
              targetY={100 + index * 50}
              data={{ voltage, connectionType: 'power' }}
            />
          ))}
        </svg>
      )

      const colors = new Set<string>()
      voltages.forEach(voltage => {
        const edge = container.querySelector(`[data-voltage="${voltage}"]`)
        const color = edge?.getAttribute('stroke')
        if (color) colors.add(color)
      })

      // 各電圧レベルで異なる色が使用されている
      expect(colors.size).toBe(voltages.length)
    })

    it('should display appropriate labels for connections', async () => {
      render(
        <svg width="400" height="200">
          <PowerConnectionEdge
            {...mockEdgeProps}
            data={{ voltage: '5V', current: '2', connectionType: 'power' }}
            selected={true}
          />
          <SignalConnectionEdge
            {...mockEdgeProps}
            sourceY={150}
            targetY={200}
            data={{ communication: 'I2C', baudRate: '400kHz', connectionType: 'signal' }}
            selected={true}
          />
        </svg>
      )

      // 選択時にラベルが表示される
      await waitFor(() => {
        expect(screen.getByText(/⚡ 5V/)).toBeInTheDocument()
        expect(screen.getByText(/2A/)).toBeInTheDocument()
        expect(screen.getByText(/📡 I2C/)).toBeInTheDocument()
        expect(screen.getByText(/400kHz/)).toBeInTheDocument()
      })
    })

    it('should show flow direction with appropriate arrows', () => {
      const { container } = render(
        <svg width="400" height="300">
          <defs />
          <PowerConnectionEdge
            {...mockEdgeProps}
            data={{ voltage: '5V', powerFlow: 'forward', connectionType: 'power' }}
          />
          <SignalConnectionEdge
            {...mockEdgeProps}
            sourceY={150}
            targetY={200}
            data={{ communication: 'UART', dataFlow: 'bidirectional', connectionType: 'signal' }}
          />
          <SignalConnectionEdge
            {...mockEdgeProps}
            id="signal-2"
            sourceY={200}
            targetY={250}
            data={{ communication: 'SPI', dataFlow: 'output', connectionType: 'signal' }}
          />
        </svg>
      )

      // 矢印マーカーの確認
      const markers = container.querySelectorAll('marker')
      expect(markers.length).toBeGreaterThan(0)

      // 双方向通信の場合は両端に矢印
      const bidirectionalEdge = container.querySelector('[data-flow="bidirectional"]')
      expect(bidirectionalEdge?.getAttribute('marker-start')).toBeTruthy()
      expect(bidirectionalEdge?.getAttribute('marker-end')).toBeTruthy()
    })

    it('should animate power flow and data transmission', () => {
      const { container } = render(
        <svg width="400" height="200">
          <PowerConnectionEdge
            {...mockEdgeProps}
            data={{ voltage: '5V', animated: true, connectionType: 'power' }}
          />
          <SignalConnectionEdge
            {...mockEdgeProps}
            sourceY={150}
            targetY={200}
            data={{ communication: 'I2C', animated: true, connectionType: 'signal' }}
          />
        </svg>
      )

      // アニメーションスタイルの確認
      const animatedEdges = container.querySelectorAll('[style*="animation"]')
      expect(animatedEdges.length).toBeGreaterThan(0)

      // アニメーション名の確認
      const powerAnimation = container.querySelector('[data-type="power"]')?.getAttribute('style')
      expect(powerAnimation).toContain('power-flow')

      const signalAnimation = container.querySelector('[data-type="signal"]')?.getAttribute('style')
      expect(signalAnimation).toContain('data-flow')
    })
  })

  describe('Color Accessibility Tests', () => {
    it('should maintain distinguishability for color blind users', () => {
      const { container } = render(
        <svg width="400" height="300">
          <PowerConnectionEdge
            {...mockEdgeProps}
            data={{ voltage: '5V', connectionType: 'power' }}
          />
          <PowerConnectionEdge
            {...mockEdgeProps}
            id="power-12v"
            sourceY={150}
            targetY={150}
            data={{ voltage: '12V', connectionType: 'power' }}
          />
          <SignalConnectionEdge
            {...mockEdgeProps}
            id="signal-i2c"
            sourceY={200}
            targetY={200}
            data={{ communication: 'I2C', connectionType: 'signal' }}
          />
        </svg>
      )

      // 元の色を取得
      const power5v = container.querySelector('[data-voltage="5V"]')?.getAttribute('stroke') || ''
      const power12v = container.querySelector('[data-voltage="12V"]')?.getAttribute('stroke') || ''
      const signalI2c = container.querySelector('[data-protocol="I2C"]')?.getAttribute('stroke') || ''

      // 各色覚異常でのコントラスト確認
      Object.entries(colorBlindFilters).forEach(([type, filter]) => {
        const filtered5v = filter(power5v)
        const filtered12v = filter(power12v)
        const filteredI2c = filter(signalI2c)

        // 色が異なることを確認（完全に同じ色にならない）
        expect(filtered5v).not.toBe(filtered12v)
        expect(filtered5v).not.toBe(filteredI2c)
        expect(filtered12v).not.toBe(filteredI2c)

        console.log(`${type} - 5V: ${filtered5v}, 12V: ${filtered12v}, I2C: ${filteredI2c}`)
      })
    })

    it('should use patterns and line styles as secondary indicators', () => {
      const { container } = render(
        <svg width="400" height="200">
          <SignalConnectionEdge
            {...mockEdgeProps}
            data={{ communication: 'ANALOG', connectionType: 'signal' }}
          />
          <SignalConnectionEdge
            {...mockEdgeProps}
            id="pwm"
            sourceY={150}
            targetY={150}
            data={{ communication: 'PWM', connectionType: 'signal' }}
          />
        </svg>
      )

      // 破線パターンの確認
      const analogEdge = container.querySelector('[data-protocol="ANALOG"]')
      const pwmEdge = container.querySelector('[data-protocol="PWM"]')

      expect(analogEdge?.getAttribute('stroke-dasharray')).toBeTruthy()
      expect(pwmEdge?.getAttribute('stroke-dasharray')).toBeTruthy()

      // 異なるパターンが使用されている
      expect(analogEdge?.getAttribute('stroke-dasharray')).not.toBe(
        pwmEdge?.getAttribute('stroke-dasharray')
      )
    })
  })

  describe('Multi-Connection Branch Visualization', () => {
    it('should clearly show branch points for multiple connections', () => {
      const connections: Connection[] = [
        { id: 'conn-1', fromId: 'arduino', toId: 'sensor1', fromPort: '5v', toPort: 'vcc' },
        { id: 'conn-2', fromId: 'arduino', toId: 'sensor2', fromPort: '5v', toPort: 'vcc' },
        { id: 'conn-3', fromId: 'arduino', toId: 'display', fromPort: '5v', toPort: 'vcc' }
      ]

      const nodes = [
        { id: 'arduino', position: { x: 100, y: 100 } },
        { id: 'sensor1', position: { x: 300, y: 50 } },
        { id: 'sensor2', position: { x: 300, y: 150 } },
        { id: 'display', position: { x: 300, y: 250 } }
      ]

      render(
        <MultiConnectionVisualizer
          connections={connections}
          nodes={nodes}
          onConnectionSelect={jest.fn()}
        />
      )

      // 分岐点が表示される
      const branchPoint = screen.getByText('5v')
      expect(branchPoint).toBeInTheDocument()

      // 接続数が表示される
      const connectionCount = screen.getByText('3')
      expect(connectionCount).toBeInTheDocument()
    })

    it('should use different colors for power and signal branches', () => {
      const powerConnections: Connection[] = [
        { id: 'p1', fromId: 'arduino', toId: 'motor1', fromPort: '5v', toPort: 'vcc' },
        { id: 'p2', fromId: 'arduino', toId: 'motor2', fromPort: '5v', toPort: 'vcc' }
      ]

      const signalConnections: Connection[] = [
        { id: 's1', fromId: 'arduino', toId: 'sensor1', fromPort: 'sda', toPort: 'sda' },
        { id: 's2', fromId: 'arduino', toId: 'sensor2', fromPort: 'sda', toPort: 'sda' }
      ]

      const nodes = [
        { id: 'arduino', position: { x: 100, y: 100 } },
        { id: 'motor1', position: { x: 300, y: 50 } },
        { id: 'motor2', position: { x: 300, y: 150 } },
        { id: 'sensor1', position: { x: 300, y: 250 } },
        { id: 'sensor2', position: { x: 300, y: 350 } }
      ]

      const { container } = render(
        <>
          <MultiConnectionVisualizer
            connections={powerConnections}
            nodes={nodes}
            onConnectionSelect={jest.fn()}
          />
          <MultiConnectionVisualizer
            connections={signalConnections}
            nodes={nodes}
            onConnectionSelect={jest.fn()}
          />
        </>
      )

      // 異なる色の分岐点
      const powerBranch = container.querySelector('[data-branch-type="power"]')
      const signalBranch = container.querySelector('[data-branch-type="signal"]')

      expect(powerBranch?.getAttribute('fill')).not.toBe(signalBranch?.getAttribute('fill'))
    })
  })

  describe('Animation Effectiveness Tests', () => {
    it('should not cause motion sickness with appropriate animation speeds', () => {
      const { container } = render(
        <svg width="400" height="200">
          <PowerConnectionEdge
            {...mockEdgeProps}
            data={{ voltage: '5V', animated: true, connectionType: 'power' }}
          />
        </svg>
      )

      const animatedEdge = container.querySelector('[style*="animation"]')
      const animationStyle = animatedEdge?.getAttribute('style') || ''

      // アニメーション速度の確認（1.5秒以上）
      expect(animationStyle).toMatch(/animation.*[1-9]\.\d+s|[2-9]s/)
      
      // 過度なアニメーションがないことを確認
      expect(animationStyle).not.toContain('0.1s')
      expect(animationStyle).not.toContain('0.2s')
    })

    it('should provide option to disable animations', () => {
      const { rerender, container } = render(
        <PowerConnectionEdge
          {...mockEdgeProps}
          data={{ voltage: '5V', animated: true, connectionType: 'power' }}
        />
      )

      // アニメーションあり
      let animatedEdge = container.querySelector('[style*="animation"]')
      expect(animatedEdge).toBeTruthy()

      // アニメーションなしで再レンダリング
      rerender(
        <PowerConnectionEdge
          {...mockEdgeProps}
          data={{ voltage: '5V', animated: false, connectionType: 'power' }}
        />
      )

      animatedEdge = container.querySelector('[style*="animation"]')
      expect(animatedEdge).toBeFalsy()
    })
  })
})