/**
 * 警告・通知システムの使いやすさ改善テスト
 * Phase 4.2.3: 未接続部品警告の適切なタイミング
 */

import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UnconnectedPartsWarning } from '@/components/warnings/UnconnectedPartsWarning'
import { DirectionalityWarning } from '@/components/warnings/DirectionalityWarning'
import { IntegratedWarningPanel } from '@/components/warnings/IntegratedWarningPanel'
import { AISearchProgress } from '@/components/AISearchProgress'
import { CompatibilityIssueExplainer } from '@/components/CompatibilityIssueExplainer'
import type { NodeData } from '@/types'
import type { Node } from '@xyflow/react'

// モックデータ
const mockNodes: Node<NodeData>[] = [
  {
    id: 'arduino',
    position: { x: 100, y: 100 },
    data: {
      title: 'Arduino Uno',
      type: 'primary',
      nodeType: 'system',
      specifications: { voltage: '5V', communication: 'I2C/SPI/UART' }
    }
  },
  {
    id: 'sensor',
    position: { x: 300, y: 100 },
    data: {
      title: 'Temperature Sensor',
      type: 'secondary',
      nodeType: 'system',
      specifications: { voltage: '3.3V-5V', communication: 'I2C' }
    }
  },
  {
    id: 'display',
    position: { x: 500, y: 100 },
    data: {
      title: 'OLED Display',
      type: 'secondary',
      nodeType: 'system',
      specifications: { voltage: '3.3V', communication: 'I2C' }
    }
  }
]

const mockConnections = [
  {
    id: 'conn-1',
    fromId: 'arduino',
    toId: 'sensor',
    fromPort: 'sda',
    toPort: 'sda'
  }
  // displayは未接続
]

describe('Warning and Notification UX Tests', () => {
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    user = userEvent.setup()
  })

  describe('Unconnected Parts Warning Timing', () => {
    it('should show warning after reasonable delay when parts are added', async () => {
      const { rerender } = render(
        <UnconnectedPartsWarning
          nodes={mockNodes.slice(0, 2)} // 最初は2つのノード
          connections={mockConnections}
          delay={2000} // 2秒の遅延
        />
      )

      // 最初は警告なし
      expect(screen.queryByText(/unconnected/i)).not.toBeInTheDocument()

      // 新しいノードを追加
      rerender(
        <UnconnectedPartsWarning
          nodes={mockNodes} // 3つ目のノードを追加
          connections={mockConnections}
          delay={2000}
        />
      )

      // すぐには表示されない
      expect(screen.queryByText(/unconnected/i)).not.toBeInTheDocument()

      // 2秒後に表示される
      await waitFor(() => {
        expect(screen.getByText(/1 unconnected component/i)).toBeInTheDocument()
      }, { timeout: 3000 })
    })

    it('should dismiss warning when connection is made', async () => {
      render(
        <UnconnectedPartsWarning
          nodes={mockNodes}
          connections={mockConnections}
          delay={100} // テスト用に短い遅延
        />
      )

      // 警告が表示される
      await waitFor(() => {
        expect(screen.getByText(/1 unconnected component/i)).toBeInTheDocument()
      })

      // 接続を追加
      const newConnections = [
        ...mockConnections,
        {
          id: 'conn-2',
          fromId: 'arduino',
          toId: 'display',
          fromPort: 'scl',
          toPort: 'scl'
        }
      ]

      render(
        <UnconnectedPartsWarning
          nodes={mockNodes}
          connections={newConnections}
          delay={100}
        />
      )

      // 警告が消える
      await waitFor(() => {
        expect(screen.queryByText(/unconnected/i)).not.toBeInTheDocument()
      })
    })

    it('should provide clear action buttons for unconnected parts', async () => {
      const onShowDetails = jest.fn()
      const onDismiss = jest.fn()

      render(
        <UnconnectedPartsWarning
          nodes={mockNodes}
          connections={mockConnections}
          delay={100}
          onShowDetails={onShowDetails}
          onDismiss={onDismiss}
        />
      )

      await waitFor(() => {
        expect(screen.getByText(/1 unconnected component/i)).toBeInTheDocument()
      })

      // 詳細表示ボタン
      const detailsButton = screen.getByText(/Show Details/i)
      await user.click(detailsButton)
      expect(onShowDetails).toHaveBeenCalledWith(['display'])

      // 無視ボタン
      const dismissButton = screen.getByLabelText(/Dismiss warning/i)
      await user.click(dismissButton)
      expect(onDismiss).toHaveBeenCalled()
    })

    it('should group multiple unconnected parts intelligently', async () => {
      const manyNodes = [
        ...mockNodes,
        {
          id: 'motor1',
          position: { x: 300, y: 200 },
          data: { title: 'Motor 1', type: 'secondary', nodeType: 'system' }
        },
        {
          id: 'motor2',
          position: { x: 400, y: 200 },
          data: { title: 'Motor 2', type: 'secondary', nodeType: 'system' }
        },
        {
          id: 'led1',
          position: { x: 300, y: 300 },
          data: { title: 'LED 1', type: 'secondary', nodeType: 'system' }
        }
      ]

      render(
        <UnconnectedPartsWarning
          nodes={manyNodes}
          connections={mockConnections}
          delay={100}
          groupByType={true}
        />
      )

      await waitFor(() => {
        // グループ化された表示
        expect(screen.getByText(/4 unconnected components/i)).toBeInTheDocument()
        expect(screen.getByText(/Display \(1\)/i)).toBeInTheDocument()
        expect(screen.getByText(/Motor \(2\)/i)).toBeInTheDocument()
        expect(screen.getByText(/LED \(1\)/i)).toBeInTheDocument()
      })
    })
  })

  describe('AI Search Progress Display', () => {
    it('should show clear progress stages during AI search', async () => {
      const { rerender } = render(
        <AISearchProgress
          componentName="ESP32 DevKit"
          stage="initializing"
          progress={0}
        />
      )

      // 初期化段階
      expect(screen.getByText(/Initializing search/i)).toBeInTheDocument()
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0')

      // 検索中
      rerender(
        <AISearchProgress
          componentName="ESP32 DevKit"
          stage="searching"
          progress={30}
          message="Searching technical specifications..."
        />
      )

      expect(screen.getByText(/Searching technical specifications/i)).toBeInTheDocument()
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '30')

      // 解析中
      rerender(
        <AISearchProgress
          componentName="ESP32 DevKit"
          stage="analyzing"
          progress={70}
          message="Analyzing compatibility data..."
        />
      )

      expect(screen.getByText(/Analyzing compatibility data/i)).toBeInTheDocument()
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '70')

      // 完了
      rerender(
        <AISearchProgress
          componentName="ESP32 DevKit"
          stage="complete"
          progress={100}
          message="Search complete!"
        />
      )

      expect(screen.getByText(/Search complete!/i)).toBeInTheDocument()
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100')
    })

    it('should handle search errors gracefully', async () => {
      const onRetry = jest.fn()
      const onCancel = jest.fn()

      render(
        <AISearchProgress
          componentName="Unknown Component XYZ"
          stage="error"
          progress={45}
          error={{
            code: 'SEARCH_FAILED',
            message: 'Could not find specifications',
            userMessage: 'Unable to find specifications for this component. Try a different name?'
          }}
          onRetry={onRetry}
          onCancel={onCancel}
        />
      )

      // エラーメッセージ
      expect(screen.getByText(/Unable to find specifications/i)).toBeInTheDocument()

      // リトライボタン
      const retryButton = screen.getByText(/Try Again/i)
      await user.click(retryButton)
      expect(onRetry).toHaveBeenCalled()

      // キャンセルボタン
      const cancelButton = screen.getByText(/Cancel/i)
      await user.click(cancelButton)
      expect(onCancel).toHaveBeenCalled()
    })

    it('should estimate remaining time for long searches', () => {
      render(
        <AISearchProgress
          componentName="Complex System Board"
          stage="searching"
          progress={40}
          startTime={Date.now() - 4000} // 4秒前に開始
          estimatedTotalTime={10000} // 推定10秒
        />
      )

      // 残り時間の表示
      expect(screen.getByText(/About 6 seconds remaining/i)).toBeInTheDocument()
    })
  })

  describe('Compatibility Issue Explanations', () => {
    it('should provide clear explanations for voltage mismatches', () => {
      render(
        <CompatibilityIssueExplainer
          issue={{
            type: 'voltage_mismatch',
            severity: 'critical',
            components: ['Arduino Uno (5V)', 'ESP32 (3.3V)'],
            technicalDetail: 'Voltage level mismatch: 5V → 3.3V',
            userExplanation: 'The Arduino outputs 5V, but the ESP32 can only handle 3.3V. This could damage the ESP32.',
            solution: 'Use a level shifter or voltage divider between the components.'
          }}
        />
      )

      // 分かりやすい説明
      expect(screen.getByText(/could damage the ESP32/i)).toBeInTheDocument()
      
      // 解決策の提示
      expect(screen.getByText(/Use a level shifter/i)).toBeInTheDocument()

      // 視覚的な警告レベル
      const warningIcon = screen.getByLabelText(/Critical issue/i)
      expect(warningIcon).toHaveClass('text-red-600')
    })

    it('should show helpful diagrams for complex issues', async () => {
      render(
        <CompatibilityIssueExplainer
          issue={{
            type: 'communication_incompatible',
            severity: 'warning',
            components: ['Sensor (I2C)', 'Display (SPI)'],
            technicalDetail: 'Protocol mismatch: I2C ↔ SPI',
            userExplanation: 'These components use different communication methods and cannot talk directly.',
            solution: 'Connect to different pins on the microcontroller that support both protocols.',
            showDiagram: true
          }}
        />
      )

      // 図解の表示
      const showDiagramButton = screen.getByText(/Show Diagram/i)
      await user.click(showDiagramButton)

      // 接続図が表示される
      await waitFor(() => {
        expect(screen.getByLabelText(/Connection diagram/i)).toBeInTheDocument()
      })
    })

    it('should provide shopping links for required components', () => {
      render(
        <CompatibilityIssueExplainer
          issue={{
            type: 'voltage_mismatch',
            severity: 'warning',
            components: ['5V System', '3.3V System'],
            solution: 'Use a level shifter',
            requiredParts: [
              {
                name: '4-Channel Level Shifter',
                description: 'Bi-directional voltage level converter',
                price: '$2.99',
                shopLinks: [
                  { vendor: 'Amazon', url: '#' },
                  { vendor: 'SparkFun', url: '#' }
                ]
              }
            ]
          }}
        />
      )

      // 必要な部品の表示
      expect(screen.getByText(/4-Channel Level Shifter/i)).toBeInTheDocument()
      expect(screen.getByText(/\$2.99/i)).toBeInTheDocument()

      // 購入リンク
      expect(screen.getByText(/Amazon/i)).toBeInTheDocument()
      expect(screen.getByText(/SparkFun/i)).toBeInTheDocument()
    })

    it('should allow users to mark issues as resolved', async () => {
      const onResolve = jest.fn()

      render(
        <CompatibilityIssueExplainer
          issue={{
            id: 'issue-1',
            type: 'power_insufficient',
            severity: 'warning',
            components: ['Arduino', 'High-Power LED'],
            solution: 'Add external power supply'
          }}
          onResolve={onResolve}
        />
      )

      // 解決済みマークボタン
      const resolveButton = screen.getByText(/Mark as Resolved/i)
      await user.click(resolveButton)

      expect(onResolve).toHaveBeenCalledWith('issue-1')
    })
  })

  describe('Integrated Warning Panel', () => {
    it('should prioritize warnings by severity', () => {
      const warnings = [
        {
          id: 'w1',
          type: 'compatibility',
          severity: 'info' as const,
          message: 'Optional: Consider using shielded cables'
        },
        {
          id: 'w2',
          type: 'unconnected',
          severity: 'warning' as const,
          message: '2 components are not connected'
        },
        {
          id: 'w3',
          type: 'voltage',
          severity: 'critical' as const,
          message: 'Voltage mismatch could damage components!'
        }
      ]

      render(<IntegratedWarningPanel warnings={warnings} />)

      // 警告が重要度順に表示される
      const warningElements = screen.getAllByRole('alert')
      expect(warningElements[0]).toHaveTextContent(/damage components/i)
      expect(warningElements[1]).toHaveTextContent(/not connected/i)
      expect(warningElements[2]).toHaveTextContent(/shielded cables/i)
    })

    it('should collapse similar warnings', () => {
      const warnings = [
        {
          id: 'w1',
          type: 'unconnected',
          severity: 'warning' as const,
          message: 'LED 1 is not connected',
          component: 'LED 1'
        },
        {
          id: 'w2',
          type: 'unconnected',
          severity: 'warning' as const,
          message: 'LED 2 is not connected',
          component: 'LED 2'
        },
        {
          id: 'w3',
          type: 'unconnected',
          severity: 'warning' as const,
          message: 'LED 3 is not connected',
          component: 'LED 3'
        }
      ]

      render(<IntegratedWarningPanel warnings={warnings} groupSimilar={true} />)

      // グループ化された表示
      expect(screen.getByText(/3 unconnected components/i)).toBeInTheDocument()
      expect(screen.queryByText(/LED 1 is not connected/i)).not.toBeInTheDocument()

      // 展開可能
      const expandButton = screen.getByLabelText(/Show details/i)
      fireEvent.click(expandButton)

      expect(screen.getByText(/LED 1/i)).toBeInTheDocument()
      expect(screen.getByText(/LED 2/i)).toBeInTheDocument()
      expect(screen.getByText(/LED 3/i)).toBeInTheDocument()
    })

    it('should provide batch actions for multiple warnings', async () => {
      const onDismissAll = jest.fn()
      const onFixAll = jest.fn()

      const warnings = Array.from({ length: 5 }, (_, i) => ({
        id: `w${i}`,
        type: 'unconnected',
        severity: 'warning' as const,
        message: `Component ${i} is not connected`,
        fixable: true
      }))

      render(
        <IntegratedWarningPanel
          warnings={warnings}
          onDismissAll={onDismissAll}
          onFixAll={onFixAll}
        />
      )

      // 一括操作ボタン
      const dismissAllButton = screen.getByText(/Dismiss All/i)
      await user.click(dismissAllButton)
      expect(onDismissAll).toHaveBeenCalled()

      const fixAllButton = screen.getByText(/Fix All Issues/i)
      await user.click(fixAllButton)
      expect(onFixAll).toHaveBeenCalled()
    })
  })
})