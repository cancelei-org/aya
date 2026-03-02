"use client"

import { useEffect, useRef, useCallback } from "react"
import type { 
  Connection, 
  ChatMessage, 
  Project,
  NodeData
} from '@/types'
import { Node } from '@xyflow/react'
import { handleBeforeUnload, handleVisibilityChange } from '@/utils/ui/unifiedUiUtils'
import type { useHistoryManager } from '@/hooks/useHistoryManager'

// EventHandlersのProps型定義（単一データソース版）
interface EventHandlersProps {
  // 状態
  nodes: Node<NodeData>[]
  connections: Connection[]
  // 🚀 削除: [] (自動生成のため不要)
  chatMessages: ChatMessage[]
  currentProject: Project | null
  isDataLoaded: boolean
  isProcessing: boolean
  isSaving: boolean
  
  // setter関数
  setNodes: (nodes: Node<NodeData>[]) => void
  setConnections: (connections: Connection[]) => void
  // 🚀 削除:  (自動生成のため不要)
  setIsSaving: (saving: boolean) => void
  
  // 履歴管理
  historyManager: ReturnType<typeof useHistoryManager> | null
  
  // 🆕 手動保存関数
  triggerManualSave?: () => Promise<void>
  
  // 🆕 React Flow強制更新用
  setFlowKey?: (updater: (prev: number) => number) => void
}

// イベント処理を管理するコンポーネント
export function EventHandlers(props: EventHandlersProps) {
  const {
    nodes,
    connections,
    // 🚀 削除: [] (自動生成のため不要)
    chatMessages,
    currentProject,
    isDataLoaded,
    isProcessing,
    isSaving,
    setNodes,
    setConnections,
    // 🚀 削除:  (自動生成のため不要)
    setIsSaving,
    historyManager
  } = props

  const deletionInProgressRef = useRef(false)
  
  // ✅ React Flow完全移行: 変換レイヤー削除、直接React Flow使用

  // 履歴保存のためのデバウンス処理
  const saveToHistory = useCallback(() => {
    if (isDataLoaded && !isProcessing && !isSaving && historyManager) {
      historyManager.saveState({
        nodes: JSON.parse(JSON.stringify(nodes)),
        connections: JSON.parse(JSON.stringify(connections)),
        actionType: 'user_action'
      })
    }
  }, [nodes, connections, isDataLoaded, isProcessing, isSaving, historyManager])

  // 状態変更時の履歴保存
  useEffect(() => {
    if (!isDataLoaded || isProcessing || isSaving) return
    
    const timeoutId = setTimeout(() => {
      saveToHistory()
    }, 1000) // 1秒後に保存（デバウンス）
    
    return () => clearTimeout(timeoutId)
  }, [saveToHistory, isDataLoaded, isProcessing, isSaving])

  // Undo/Redo機能
  const handleUndo = useCallback(() => {
    if (!historyManager || !historyManager.canUndo) return
    
    const previousState = historyManager.undo()
    if (previousState) {
      setNodes(previousState.nodes)
      setConnections(previousState.connections)
      // Force React Flow update by incrementing key
      if (props.setFlowKey) {
        props.setFlowKey(prev => prev + 1)
      }
      console.log('✅ Undo executed:', previousState.actionType)
    }
  }, [historyManager, setNodes, setConnections, props])

  const handleRedo = useCallback(() => {
    if (!historyManager || !historyManager.canRedo) return
    
    const nextState = historyManager.redo()
    if (nextState) {
      setNodes(nextState.nodes)
      setConnections(nextState.connections)
      // Force React Flow update by incrementing key
      if (props.setFlowKey) {
        props.setFlowKey(prev => prev + 1)
      }
      console.log('✅ Redo executed:', nextState.actionType)
    }
  }, [historyManager, setNodes, setConnections, props])

  // ユーザーインタラクション管理（統合版）
  useEffect(() => {
    // キーボードショートカット（Ctrl+Z, Ctrl+Y, Ctrl+S）
    const handleKeyDown = (event: KeyboardEvent) => {
      // テキスト入力中でないかチェック
      const activeElement = document.activeElement
      const isTextInput = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        (activeElement as HTMLElement).contentEditable === 'true' ||
        activeElement.getAttribute('role') === 'textbox'
      )
      
      if (!isTextInput && (event.ctrlKey || event.metaKey)) {
        // 🚀 Ctrl+S for manual save
        if (event.key === 's') {
          event.preventDefault()
          console.log('💾 Ctrl+S pressed - triggering manual save')
          // 手動保存を実行（StateProvidersから取得する必要があるため、propsで渡す）
          if (props.triggerManualSave) {
            props.triggerManualSave()
          }
          return
        }
        
        if (event.key === 'z' && !event.shiftKey) {
          event.preventDefault()
          handleUndo()
        } else if (event.key === 'y' || (event.key === 'z' && event.shiftKey)) {
          event.preventDefault()
          handleRedo()
        }
      }
    }

    // ページ離脱時の自動保存
    const beforeUnloadHandler = (event: BeforeUnloadEvent) => {
      handleBeforeUnload(
        event,
        currentProject,
        nodes,
        isSaving,
        connections,
        chatMessages,
        setIsSaving
      )
    }

    const visibilityChangeHandler = () => {
      handleVisibilityChange(
        currentProject,
        nodes,
        isSaving,
        connections,
        chatMessages,
        setIsSaving
      )
    }

    // 全イベントリスナー登録
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('beforeunload', beforeUnloadHandler)
    document.addEventListener('visibilitychange', visibilityChangeHandler)
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('beforeunload', beforeUnloadHandler)
      document.removeEventListener('visibilitychange', visibilityChangeHandler)
    }
  }, [handleUndo, handleRedo, currentProject, nodes, isSaving, connections, chatMessages, setIsSaving, props])

  // Undo/RedoハンドラーとdeletionInProgressRefを外部で使用するためのエクスポート
  return {
    handleUndo,
    handleRedo,
    deletionInProgressRef
  }
}

// EventHandlersのフック版
export function useEventHandlers(props: EventHandlersProps) {
  const result = EventHandlers(props)
  return result
}