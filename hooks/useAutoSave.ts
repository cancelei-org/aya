import { useEffect, useRef, useCallback } from 'react'
import { saveProjectData } from '@/utils/project/projectUtils'
import type { Connection, Project, ChatMessage, NodeData } from '@/types'
import type { Node } from '@xyflow/react'

interface UseAutoSaveProps {
  nodes: Node<NodeData>[]
  connections: Connection[]
  chatMessages: ChatMessage[]
  currentProject: Project | null
  isSaving: boolean
  setIsSaving: (saving: boolean) => void
  isDataLoaded: boolean
  isProcessing: boolean
}

/**
 * デバウンス付き自動保存フック
 * データ変更から2.5秒後に自動保存を実行
 * パフォーマンス最適化と競合状態防止機能付き
 */
export const useAutoSave = ({
  nodes,
  connections,
  chatMessages,
  currentProject,
  isSaving,
  setIsSaving,
  isDataLoaded,
  isProcessing
}: UseAutoSaveProps) => {
  
  // 最後の保存データのハッシュを保存（変更検知用）
  const lastSaveHashRef = useRef<string>('')
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastSaveTimeRef = useRef<number>(0)
  
  // デバウンス保存の実行
  const executeDebouncedSave = useCallback(async () => {
    if (!currentProject?.id || isSaving || isProcessing || !isDataLoaded) {
      return
    }
    
    const now = Date.now()
    const MIN_SAVE_INTERVAL = 1000 // 最短保存間隔: 1秒
    
    // 最後の保存から1秒経過していない場合はスキップ
    if (now - lastSaveTimeRef.current < MIN_SAVE_INTERVAL) {
      return
    }
    
    // 現在のデータハッシュを生成
    const currentHash = generateDataHash(nodes, connections, chatMessages)
    
    // データに変更がない場合はスキップ
    if (currentHash === lastSaveHashRef.current) {
      return
    }
    
    try {
      // Auto-save starting
      lastSaveTimeRef.current = now
      
      await saveProjectData(
        connections,
        currentProject,
        nodes,
        chatMessages,
        isSaving,
        setIsSaving
      )
      
      // 保存成功時にハッシュを更新
      lastSaveHashRef.current = currentHash
      // Auto-save completed
      
    } catch (error) {
      console.error('❌ Auto-save: Failed to save:', error)
    }
  }, [nodes, connections, chatMessages, currentProject, isSaving, setIsSaving, isDataLoaded, isProcessing])
  
  // データ変更監視とデバウンス処理
  useEffect(() => {
    if (!isDataLoaded || isProcessing) return
    
    // 現在のタイムアウトをクリア
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    
    // 2.5秒後に保存実行をスケジュール
    saveTimeoutRef.current = setTimeout(() => {
      executeDebouncedSave()
    }, 2500)
    
    // クリーンアップ関数
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [executeDebouncedSave, isDataLoaded, isProcessing])
  
  // コンポーネントアンマウント時のクリーンアップ
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])
  
  // 手動保存の実行
  const triggerManualSave = useCallback(async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    
    // Manual save triggered
    await executeDebouncedSave()
  }, [executeDebouncedSave])
  
  return {
    triggerManualSave,
    isAutoSaveEnabled: isDataLoaded && !isProcessing
  }
}

/**
 * データのハッシュ値を生成（変更検知用）
 * カテゴリboundsも含めて変更を検知
 */
function generateDataHash(
  nodes: Node<NodeData>[],
  connections: Connection[],
  chatMessages: ChatMessage[]
): string {
  const nodesHash = nodes
    .map(n => {
      // 基本的なノードデータ
      let nodeHash = `${n.id}:${n.data?.title || ''}:${n.position?.x || 0}:${n.position?.y || 0}`
      
      // カテゴリノードの場合はbounds情報も含める
      if (n.data?.nodeType === 'category' && n.data.bounds) {
        nodeHash += `:bounds:${n.data.bounds.x}:${n.data.bounds.y}:${n.data.bounds.width}:${n.data.bounds.height}`
      }
      
      // メンバーシップ情報も含める
      if (n.data?.categoryId) {
        nodeHash += `:cat:${n.data.categoryId}`
      }
      
      // 相対位置情報も含める
      if (n.data?.relativePosition) {
        nodeHash += `:rel:${n.data.relativePosition.x}:${n.data.relativePosition.y}`
      }
      
      return nodeHash
    })
    .sort()
    .join('|')
    
  const connectionsHash = connections
    .map(c => `${c.id}:${c.fromId}:${c.toId}`)
    .sort()
    .join('|')
    
  const chatHash = chatMessages
    .map(m => `${m.id}:${m.content?.substring(0, 50) || ''}`)
    .join('|')
  
  return `${nodesHash}::${connectionsHash}::${chatHash}`
}