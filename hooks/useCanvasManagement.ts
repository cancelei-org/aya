import { useState, useEffect } from 'react'
import { useNodesState, Node } from '@xyflow/react'
import { Connection, NodeData } from '@/types'
import { FailedConnection } from '@/utils/connections/routing/connectionMatching'

// React Flow対応のCanvas管理関連カスタムフック
export const useCanvasManagement = () => {
  // React Flow状態管理
  const [nodes, setNodes, onNodesChange] = useNodesState<NodeData>([])
  
  // 🚀 Optimized setNodes (simplified, no logging loops)
  const optimizedSetNodes = (updaterOrNodes: Node<NodeData>[] | ((prev: Node<NodeData>[]) => Node<NodeData>[])) => {
    setNodes(updaterOrNodes)
  }
  
  // 🚀 Removed monitoring useEffect to prevent infinite loops
  
  // その他のCanvas関連state
  const [connections, setConnections] = useState<Connection[]>([])
  const [selectedNode, setSelectedNode] = useState<string | null>("base-joint")
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; show: boolean }>({ 
    x: 0, 
    y: 0, 
    show: false 
  })
  const [failedConnections, setFailedConnections] = useState<FailedConnection[]>([])
  
  // 🗑️ 削除追跡: 手動削除されたノードIDを記録
  const [deletedNodeIds, setDeletedNodeIds] = useState<Set<string>>(new Set())

  // ✅ canvasNodes完全削除: React Flow純粋状態のみ提供

  return {
    // ✅ React Flow Pure States Only
    nodes: nodes as Node<NodeData>[],
    setNodes: optimizedSetNodes,
    onNodesChange,
    
    // Other States
    connections,
    selectedNode,
    contextMenu,
    failedConnections,
    
    // 🗑️ Deletion Tracking
    deletedNodeIds,
    setDeletedNodeIds,
    
    // Setters
    setConnections,
    setSelectedNode,
    setContextMenu,
    setFailedConnections,
  }
}