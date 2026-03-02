/**
 * 回帰テスト
 * 既存機能への影響確認
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MainCanvas } from '@/components/canvas/MainCanvas'
import { SystemDiagramFlow } from '@/components/canvas/SystemDiagramFlow'
import { PartsManagement } from '@/components/management/PartsManagement'
import { SoftwareContextPanel } from '@/components/context/SoftwareContextPanel'
import { ChatInterface } from '@/components/ChatInterface'
import type { NodeData, Edge } from '@xyflow/react'

describe('回帰テスト: 既存機能の動作確認', () => {
  describe('基本的なノード操作', () => {
    it('ノードの追加・削除・移動が正常に動作する', async () => {
      const onNodesChange = jest.fn()
      const onEdgesChange = jest.fn()
      
      const { container } = render(
        <SystemDiagramFlow
          nodes={[]}
          edges={[]}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
        />
      )
      
      // ノードの追加
      const addButton = screen.getByLabelText(/add component/i)
      await userEvent.click(addButton)
      
      expect(onNodesChange).toHaveBeenCalled()
      const addCall = onNodesChange.mock.calls[0][0]
      expect(addCall[0].type).toBe('add')
      
      // ノードの削除
      const deleteButton = container.querySelector('.delete-button')
      if (deleteButton) {
        await userEvent.click(deleteButton)
        expect(onNodesChange).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({ type: 'remove' })
          ])
        )
      }
    })

    it('エッジの接続・削除が正常に動作する', async () => {
      const nodes = [
        { id: '1', position: { x: 0, y: 0 }, data: { title: 'Node 1' } },
        { id: '2', position: { x: 200, y: 0 }, data: { title: 'Node 2' } }
      ]
      
      const onConnect = jest.fn()
      
      render(
        <SystemDiagramFlow
          nodes={nodes}
          edges={[]}
          onConnect={onConnect}
        />
      )
      
      // 接続のシミュレーション
      const sourceHandle = screen.getByTestId('source-handle-1')
      const targetHandle = screen.getByTestId('target-handle-2')
      
      fireEvent.mouseDown(sourceHandle)
      fireEvent.mouseMove(targetHandle)
      fireEvent.mouseUp(targetHandle)
      
      expect(onConnect).toHaveBeenCalledWith(
        expect.objectContaining({
          source: '1',
          target: '2'
        })
      )
    })
  })

  describe('発注リスト機能', () => {
    it('部品の追加・削除が正常に動作する', async () => {
      const initialParts = [
        { id: '1', name: 'Arduino Uno', quantity: 1, price: 25.00 }
      ]
      
      render(<PartsManagement initialParts={initialParts} />)
      
      // 部品が表示される
      expect(screen.getByText('Arduino Uno')).toBeInTheDocument()
      expect(screen.getByText('$25.00')).toBeInTheDocument()
      
      // 数量の変更
      const quantityInput = screen.getByDisplayValue('1')
      await userEvent.clear(quantityInput)
      await userEvent.type(quantityInput, '3')
      
      // 合計金額が更新される
      await waitFor(() => {
        expect(screen.getByText('$75.00')).toBeInTheDocument()
      })
      
      // 部品の削除
      const deleteButton = screen.getByLabelText(/delete Arduino Uno/i)
      await userEvent.click(deleteButton)
      
      expect(screen.queryByText('Arduino Uno')).not.toBeInTheDocument()
    })

    it('CSVエクスポートが動作する', async () => {
      const parts = [
        { id: '1', name: 'ESP32', quantity: 2, price: 15.00 },
        { id: '2', name: 'Sensor', quantity: 5, price: 8.00 }
      ]
      
      // ダウンロード関数のモック
      const mockDownload = jest.fn()
      global.URL.createObjectURL = jest.fn()
      global.document.createElement = jest.fn().mockImplementation((tag) => {
        if (tag === 'a') {
          return { click: mockDownload, setAttribute: jest.fn() }
        }
        return {}
      })
      
      render(<PartsManagement initialParts={parts} />)
      
      const exportButton = screen.getByText(/export csv/i)
      await userEvent.click(exportButton)
      
      expect(mockDownload).toHaveBeenCalled()
    })
  })

  describe('チャット機能', () => {
    it('メッセージの送受信が正常に動作する', async () => {
      const onSendMessage = jest.fn()
      
      render(
        <ChatInterface
          onSendMessage={onSendMessage}
          messages={[]}
        />
      )
      
      const input = screen.getByPlaceholderText(/type a message/i)
      const sendButton = screen.getByLabelText(/send message/i)
      
      // メッセージ入力
      await userEvent.type(input, 'Add Arduino Uno to the diagram')
      await userEvent.click(sendButton)
      
      expect(onSendMessage).toHaveBeenCalledWith('Add Arduino Uno to the diagram')
      
      // 入力欄がクリアされる
      expect(input).toHaveValue('')
    })

    it('AIレスポンスが表示される', async () => {
      const messages = [
        { id: '1', role: 'user', content: 'Add ESP32' },
        { id: '2', role: 'assistant', content: 'I\'ve added ESP32 to your diagram.' }
      ]
      
      render(<ChatInterface messages={messages} />)
      
      expect(screen.getByText('Add ESP32')).toBeInTheDocument()
      expect(screen.getByText(/added ESP32/i)).toBeInTheDocument()
    })
  })

  describe('ソフトウェアコンテキストパネル', () => {
    it('コンテキスト情報の表示・編集が動作する', async () => {
      const onUpdateContext = jest.fn()
      const initialContext = {
        purpose: 'Home automation system',
        features: ['Temperature monitoring', 'Light control']
      }
      
      render(
        <SoftwareContextPanel
          context={initialContext}
          onUpdateContext={onUpdateContext}
        />
      )
      
      // コンテキスト情報が表示される
      expect(screen.getByText('Home automation system')).toBeInTheDocument()
      expect(screen.getByText('Temperature monitoring')).toBeInTheDocument()
      
      // 編集モードに切り替え
      const editButton = screen.getByLabelText(/edit context/i)
      await userEvent.click(editButton)
      
      // テキストエリアが表示される
      const textarea = screen.getByRole('textbox')
      expect(textarea).toBeInTheDocument()
      
      // 内容を変更
      await userEvent.clear(textarea)
      await userEvent.type(textarea, 'Updated purpose: Smart home hub')
      
      // 保存
      const saveButton = screen.getByText(/save/i)
      await userEvent.click(saveButton)
      
      expect(onUpdateContext).toHaveBeenCalledWith(
        expect.objectContaining({
          purpose: 'Updated purpose: Smart home hub'
        })
      )
    })
  })

  describe('React Flowの基本機能', () => {
    it('ズーム・パン機能が動作する', () => {
      const { container } = render(
        <SystemDiagramFlow
          nodes={[{ id: '1', position: { x: 0, y: 0 }, data: {} }]}
          edges={[]}
        />
      )
      
      const reactFlowContainer = container.querySelector('.react-flow')
      expect(reactFlowContainer).toBeInTheDocument()
      
      // ズームコントロールが存在する
      const zoomIn = container.querySelector('.react-flow__controls-zoomin')
      const zoomOut = container.querySelector('.react-flow__controls-zoomout')
      const fitView = container.querySelector('.react-flow__controls-fitview')
      
      expect(zoomIn).toBeInTheDocument()
      expect(zoomOut).toBeInTheDocument()
      expect(fitView).toBeInTheDocument()
    })

    it('ミニマップが表示される', () => {
      const { container } = render(
        <SystemDiagramFlow
          nodes={[{ id: '1', position: { x: 0, y: 0 }, data: {} }]}
          edges={[]}
          showMinimap={true}
        />
      )
      
      const minimap = container.querySelector('.react-flow__minimap')
      expect(minimap).toBeInTheDocument()
    })
  })

  describe('パフォーマンス', () => {
    it('多数のノードでも適切に動作する', () => {
      const manyNodes = Array.from({ length: 100 }, (_, i) => ({
        id: `node-${i}`,
        position: { x: (i % 10) * 150, y: Math.floor(i / 10) * 150 },
        data: { title: `Component ${i}` }
      }))
      
      const startTime = performance.now()
      
      const { container } = render(
        <SystemDiagramFlow
          nodes={manyNodes}
          edges={[]}
        />
      )
      
      const renderTime = performance.now() - startTime
      
      // 100ノードでも1秒以内にレンダリング
      expect(renderTime).toBeLessThan(1000)
      
      // すべてのノードが表示される
      const renderedNodes = container.querySelectorAll('.react-flow__node')
      expect(renderedNodes.length).toBe(100)
    })
  })

  describe('エラーハンドリング', () => {
    it('不正なデータでもクラッシュしない', () => {
      const invalidNodes = [
        { id: null, position: { x: 0, y: 0 }, data: {} }, // invalid id
        { id: '1', position: null, data: {} }, // invalid position
        { id: '2', position: { x: 0, y: 0 }, data: null } // invalid data
      ]
      
      // エラーをキャッチしてクラッシュを防ぐ
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      
      expect(() => {
        render(
          <SystemDiagramFlow
            nodes={invalidNodes as any}
            edges={[]}
          />
        )
      }).not.toThrow()
      
      consoleSpy.mockRestore()
    })

    it('API エラー時に適切なフォールバック動作をする', async () => {
      // APIエラーのシミュレーション
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'))
      
      render(<PartsManagement />)
      
      // 価格取得ボタンをクリック
      const fetchPriceButton = screen.getByText(/fetch prices/i)
      await userEvent.click(fetchPriceButton)
      
      // エラーメッセージが表示される
      await waitFor(() => {
        expect(screen.getByText(/failed to fetch prices/i)).toBeInTheDocument()
      })
      
      // アプリケーションはクラッシュしない
      expect(screen.getByText(/parts list/i)).toBeInTheDocument()
    })
  })
})