import { Connection, NodeData, ChatMessage } from '@/types'
import { Node, Edge } from '@xyflow/react'
// 🗑️ Phase 2: consolidateOrderList removed (PartOrder dependency)
import { saveProjectDataWithConnections } from '../project/projectUtils'

// 🚀 React Flow完全移行: Node<NodeData>型を使用 (AI検索は手動)
// 新しいノードを追加する関数（AI検索なし）
export const addNewNode = async (
  x: number,
  y: number,
  currentProject: { id: string } | null,
  nodes: Node<NodeData>[],
  setCanvasNodes: (updater: (prev: Node<NodeData>[]) => Node<NodeData>[]) => void,
  componentName?: string,
  fromSource: 'diagram' | 'chat' = 'diagram'
) => {
  // プロジェクトが未設定の場合は一時的に許可（自動作成する）
  if (!currentProject?.id) {
    console.log("⚠️ プロジェクトが未設定ですが、ノード追加を許可します。プロジェクトは自動作成されます。")
  }
  
  // コンポーネント名の決定
  const name = componentName || `New Part ${nodes.length + 1}`
  
  // 基本的なノードを作成（AI検索なし）
  const newNode: Node<NodeData> = {
    id: `node-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
    type: 'systemNode',
    position: { x, y },
    data: {
      title: name,
      label: name,
      type: 'primary', // デフォルトはprimary
      nodeType: 'part', // 明示的に部品として設定
      inputs: 1,
      outputs: 1,
      description: '',
      orderStatus: 'Unordered',
      estimatedOrderDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      quantity: 1,
      voltage: 'Unknown',
      communication: 'Unknown',
      addedFrom: fromSource,
      addedAt: new Date().toISOString(),
      // AI検索は実行されていない
      aiSearchPerformed: false,
      needsAISearch: true
    }
  }
  
  // UIに即座に追加
  setCanvasNodes(prev => [...prev, newNode])
  
  console.log('🎯 新しいノードを追加 (AI検索なし):', newNode)
  
  return newNode
}


// 🚀 React Flow完全移行: Node<NodeData>型を使用
// 新しいカテゴリを追加する関数（🆕 空間的カテゴリシステム対応）
export const addNewCategory = async (
  x: number,
  y: number,
  currentProject: { id: string } | null,
  nodes: Node<NodeData>[],
  setCanvasNodes: (updater: (prev: Node<NodeData>[]) => Node<NodeData>[]) => void
) => {
  // プロジェクトが未設定の場合は一時的に許可（自動作成する）
  if (!currentProject?.id) {
    console.log("⚠️ プロジェクトが未設定ですが、カテゴリ追加を許可します。プロジェクトは自動作成されます。")
  }
  
  // 🆕 空間的カテゴリシステム対応の新しいカテゴリを作成
  const existingCategories = nodes.filter(n => n.data.nodeType === 'category').length
  const newCategoryName = `New category ${existingCategories + 1}`
  
  const newCategory: Node<NodeData> = {
    id: `category-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
    type: 'systemNode',  // SystemNodeで統一
    position: { x: x, y: y },
    data: {
      title: newCategoryName,
      nodeType: 'category',  // 🆕 空間的カテゴリマーカー
      type: 'accent',        // カテゴリ用の視覚スタイル
      inputs: 0,
      outputs: 0,
      description: `空間的カテゴリ: ${newCategoryName}`,
      isPBSCategory: true,   // 🔄 PBS互換性維持
      orderStatus: 'Unordered',
      // 🆕 空間的カテゴリ固有のデータ
      bounds: {
        x: x,
        y: y,
        width: 300,
        height: 200
      },
      isResizable: true,
      memberNodes: []
    }
  }
  
  // UIに即座に追加
  setCanvasNodes(prev => [...prev, newCategory])
  
  console.log('🆕 新しい空間的カテゴリを追加:', newCategory)
  console.log('新しいカテゴリが作成されました:', newCategory.id)
}

// 🚀 React Flow完全移行: Node<NodeData>型を使用
// ノードを削除する関数
export const deleteNode = async (
  nodeId: string,
  currentProject: { id: string } | null,
  nodes: Node<NodeData>[],
  _connections: Connection[],
  setCanvasNodes: (updater: (prev: Node<NodeData>[]) => Node<NodeData>[]) => void,
  setConnections: (updater: (prev: Connection[]) => Connection[]) => void
) => {
  // プロジェクトが未設定の場合は一時的に許可（自動作成する）
  if (!currentProject?.id) {
    console.log("⚠️ プロジェクトが未設定ですが、ノード削除を許可します。")
    // プロジェクトが未設定でも、ノード削除は許可する
  }
  
  // 削除対象ノードを保存（エラー時の復元用）
  const nodeToDelete = nodes.find(node => node.id === nodeId)
  
  if (!nodeToDelete) {
    return
  }
  
  console.log(`Deleting canvas node: ${nodeId}`)
  
  // 1. 即座にUIから削除
  setCanvasNodes(prev => prev.filter(node => node.id !== nodeId))
  setConnections(prev => prev.filter(conn => conn.fromId !== nodeId && conn.toId !== nodeId))
  
  // PBS is now auto-generated from canvas nodes - no manual update needed
  
  // 🗑️ Phase 1: partOrders個別管理を廃止（canvasNodesで一元管理）
  // setPartOrders(prev => prev.filter(part => part.id !== nodeId))
  console.log('💡 Phase 1: Part info managed in nodes, no separate partOrders sync needed')
  
  console.log('ノードが正常に削除されました:', nodeId)
}

// 接続を追加する関数
export const addConnection = async (
  fromId: string,
  toId: string,
  currentProject: { id: string } | null,
  setConnections: (updater: (prev: Connection[]) => Connection[]) => void
) => {
  console.log('🔗 接続作成開始:', fromId, '->', toId)
  
  // プロジェクトが未設定の場合は一時的に許可（自動作成する）
  if (!currentProject?.id) {
    console.log('⚠️ プロジェクトが未設定ですが、接続作成を許可します。')
    // プロジェクトが未設定でも、接続作成は許可する
  }
  
  const newConnection: Connection = {
    id: `conn-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
    fromId: fromId,
    toId: toId,
    fromPort: 'output-center',
    toPort: 'input-center'
  }
  
  // UIに即座に追加
  setConnections(prev => [...prev, newConnection])
  
  console.log('新しい接続が作成されました:', newConnection)
  
  // PBS is now auto-generated from canvas nodes - no manual update needed
}

// 🚀 React Flow完全移行: Node<NodeData>型を使用
// 接続を削除する関数
export const deleteConnection = async (
  connectionId: string,
  connections: Connection[],
  deletionInProgressRef: React.MutableRefObject<boolean>,
  isSaving: boolean,
  setConnections: (updater: (prev: Connection[]) => Connection[]) => void,
  setIsSaving: (saving: boolean) => void,
  currentProject: { id: string } | null,
  nodes: Node<NodeData>[],
  chatMessages: ChatMessage[]
) => {
  // 削除処理中や保存中の場合はスキップ
  if (deletionInProgressRef.current || isSaving) {
    console.log('⏭️ Connection deletion skipped - already in progress or saving')
    return
  }

  deletionInProgressRef.current = true
  
  try {
    console.log('🗑️ Deleting connection:', connectionId)
    
    // 接続を削除
    const connectionToDelete = connections.find(conn => conn.id === connectionId)
    if (!connectionToDelete) {
      console.log('⚠️ Connection not found:', connectionId)
      return
    }
    
    // UIから即座に削除
    setConnections(prev => prev.filter(conn => conn.id !== connectionId))
    
    console.log(`接続 ${connectionId} が削除されました`)
    
    // 変更を保存（競合防止付き）
    if (currentProject?.id && !isSaving) {
      console.log('💾 Connection deletion: Executing save...')
      
      const updatedConnections = connections.filter(conn => conn.id !== connectionId)
      
      setTimeout(async () => {
        try {
          await saveProjectDataWithConnections(
            updatedConnections,
            currentProject,
            nodes,
            chatMessages,
            isSaving,
            setIsSaving
          )
        } catch (error) {
          console.error('Failed to save after connection deletion:', error)
        }
      }, 100)
    }
    
  } finally {
    deletionInProgressRef.current = false
  }
}

// 🚀 React Flow完全移行: Node<NodeData>型を使用
// 複数選択削除の関数
export const handleDeleteSelected = async (
  selectedNodes: Node<NodeData>[],
  selectedEdges: Edge[],
  setCanvasNodes: (updater: (prev: Node<NodeData>[]) => Node<NodeData>[]) => void,
  setConnections: (updater: (prev: Connection[]) => Connection[]) => void,
  currentProject: { id: string } | null,
  connections: Connection[],
  nodes: Node<NodeData>[],
  chatMessages: ChatMessage[]
) => {
  console.log('🗑️ Starting batch deletion:', {
    nodes: selectedNodes.length,
    edges: selectedEdges.length
  })
  
  // 選択されたノードのIDを抽出
  const nodeIdsToDelete = selectedNodes.map(node => node.id)
  const edgeIdsToDelete = selectedEdges.map(edge => edge.id)
  
  // ノードを削除
  if (nodeIdsToDelete.length > 0) {
    setCanvasNodes(prev => prev.filter(node => !nodeIdsToDelete.includes(node.id)))
    console.log(`Deleted ${nodeIdsToDelete.length} nodes`)
  }
  
  // エッジを削除（ノード削除に関連するエッジも含む）
  const allEdgeIdsToDelete = [
    ...edgeIdsToDelete,
    ...connections
      .filter(conn => nodeIdsToDelete.includes(conn.fromId) || nodeIdsToDelete.includes(conn.toId))
      .map(conn => conn.id)
  ]
  
  if (allEdgeIdsToDelete.length > 0) {
    setConnections(prev => prev.filter(conn => !allEdgeIdsToDelete.includes(conn.id)))
    console.log(`Deleted ${allEdgeIdsToDelete.length} connections`)
  }
  
  // PBS is now auto-generated from canvas nodes - no manual update needed
  
  // 変更を保存
  if (currentProject?.id) {
    console.log('💾 Batch deletion: Executing save...')
    
    const updatedNodes = nodes.filter(node => !nodeIdsToDelete.includes(node.id))
    const updatedConnections = connections.filter(conn => !allEdgeIdsToDelete.includes(conn.id))
    
    try {
      await saveProjectDataWithConnections(
        updatedConnections,
        currentProject,
        updatedNodes,
        chatMessages,
        false,
        () => {}
      )
      console.log('✅ Batch deletion saved successfully')
    } catch (error) {
      console.error('❌ Failed to save batch deletion:', error)
      throw error
    }
  }
  
  console.log('✅ Batch deletion completed')
}