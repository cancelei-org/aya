"use client"

import { useCallback } from "react"
import type {
  Connection
} from '@/types'
import { Node } from '@xyflow/react'
import type { UnifiedPartInfo } from '@/utils/partsExtractor'

// 🚀 React Flow完全移行: PartsManagementビジネスロジック専用フック
export function usePartsManagementLogic({
  nodes,
  unifiedParts,
  setNodes,
  setConnections
}: {
  nodes: Node[]
  unifiedParts: UnifiedPartInfo[]
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>
  setConnections: React.Dispatch<React.SetStateAction<Connection[]>>
}) {

  // 🚀 React Flow完全移行: テキストフィールド即座更新（React Flow Node対応版）
  const updateTextField = useCallback((partId: string, field: string, value: string) => {
    
    // Unified partsから対応するReact Flow NodeのIDを取得
    const part = unifiedParts.find(p => p.id === partId)
    if (!part || !part.originalCanvasIds) {
      console.warn(`⚠️ Part ${partId} not found or has no originalCanvasIds`)
      return
    }
    
    // 複数のReact Flow Nodeを更新（統合された部品の場合）
    setNodes(prev => prev.map(node => 
      part.originalCanvasIds!.includes(node.id)
        ? { ...node, data: { ...node.data, [field]: value } }
        : node
    ))
  }, [setNodes, unifiedParts])

  // 🚀 React Flow完全移行: セレクト等用即座更新（React Flow Node対応版）
  const updateSelectField = useCallback((partId: string, field: string, value: string | number | Date | null) => {
    
    // Unified partsから対応するReact Flow NodeのIDを取得
    const part = unifiedParts.find(p => p.id === partId)
    if (!part || !part.originalCanvasIds) {
      console.warn(`⚠️ Part ${partId} not found or has no originalCanvasIds`)
      return
    }
    
    // orderStatusの型安全性を保証
    if (field === 'orderStatus') {
      const validStatus = ["Unordered", "Quotation", "Ordered", "Delivered"].includes(value) 
        ? value as "Unordered" | "Quotation" | "Ordered" | "Delivered"
        : "Unordered"
      
      setNodes(prev => prev.map(node => 
        part.originalCanvasIds!.includes(node.id)
          ? { ...node, data: { ...node.data, orderStatus: validStatus } }
          : node
      ))
    } else {
      setNodes(prev => prev.map(node => 
        part.originalCanvasIds!.includes(node.id)
          ? { ...node, data: { ...node.data, [field]: value } }
          : node
      ))
    }
  }, [setNodes, unifiedParts])

  // 🚀 React Flow完全移行: ローカル状態から最新値を取得する関数（React Flow Node対応版）
  const getLatestFieldValue = useCallback((part: UnifiedPartInfo, field: string) => {
    if (!part.originalCanvasIds || part.originalCanvasIds.length === 0) {
      return part[field as keyof UnifiedPartInfo] || ''
    }
    
    // 最初のReact Flow Nodeから最新の値を取得
    const firstNode = nodes.find(node => part.originalCanvasIds!.includes(node.id))
    if (firstNode) {
      const value = firstNode.data[field as keyof typeof firstNode.data]
      // DateTime型の場合は文字列に変換
      if (field === 'estimatedOrderDate' && value instanceof Date) {
        return value.toISOString().split('T')[0]
      }
      return value || ''
    }
    
    return part[field as keyof UnifiedPartInfo] || ''
  }, [nodes])

  // 部品削除機能 - Using PBS deletion logic for consistency
  const deletePart = useCallback((partId: string) => {
    const part = unifiedParts.find(p => p.id === partId)
    if (!part || !part.originalCanvasIds) {
      console.warn(`⚠️ Part ${partId} not found or has no originalCanvasIds`)
      return
    }
    
    // 削除確認 - PBSと同じメッセージ形式
    const confirmed = window.confirm(`Are you sure you want to delete "${part.name}"?\n\nThis will remove ${part.originalCanvasIds.length} canvas node(s) and all associated data.`)
    if (!confirmed) return
    
    console.log(`🗑️ Starting deletion of part: ${part.name}`, {
      partId,
      originalCanvasIds: part.originalCanvasIds,
      nodeCount: part.originalCanvasIds.length
    })
    
    // 🚀 React Flow完全移行: React Flow Nodeから削除
    setNodes(prev => {
      const updatedNodes = prev.filter(node => 
        !part.originalCanvasIds!.includes(node.id)
      )
      console.log(`🗑️ React Flow nodes: ${prev.length} → ${updatedNodes.length}`)
      return updatedNodes
    })
    
    // 2. 関連する接続も削除
    setConnections(prev => {
      const updatedConnections = prev.filter(conn => 
        !part.originalCanvasIds!.includes(conn.fromId) && 
        !part.originalCanvasIds!.includes(conn.toId)
      )
      console.log(`🗑️ Connections: ${prev.length} → ${updatedConnections.length}`)
      return updatedConnections
    })
    
    console.log(`✅ Parts Management deletion completed`)
  }, [setNodes, setConnections, unifiedParts])

  // 価格更新処理
  const updatePriceField = useCallback((partId: string, value: string) => {
    const numericValue = parseFloat(value) || 0
    updateSelectField(partId, 'price', numericValue)
  }, [updateSelectField])

  // 注文日更新処理
  const updateOrderDateField = useCallback((partId: string, value: string) => {
    if (value) {
      const dateValue = new Date(value)
      updateSelectField(partId, 'estimatedOrderDate', dateValue)
    } else {
      updateSelectField(partId, 'estimatedOrderDate', null)
    }
  }, [updateSelectField])

  // 数量更新処理
  const updateQuantityField = useCallback((partId: string, value: string) => {
    const numericValue = parseInt(value) || 1
    updateSelectField(partId, 'quantity', numericValue)
  }, [updateSelectField])

  // モデル番号更新処理
  const updateModelNumberField = useCallback((partId: string, value: string) => {
    updateTextField(partId, 'modelNumber', value)
  }, [updateTextField])

  // バッチ操作: 全部品の発注ステータス更新
  const batchUpdateOrderStatus = useCallback((status: "Unordered" | "Quotation" | "Ordered" | "Delivered") => {
    setNodes(prev => prev.map(node => ({
      ...node,
      data: {
        ...node.data,
        orderStatus: status
      }
    })))
    console.log(`📦 Batch updated all parts to status: ${status}`)
  }, [setNodes])

  // バッチ操作: 選択された部品の削除
  const batchDeleteParts = useCallback((partIds: string[]) => {
    if (partIds.length === 0) return
    
    const confirmed = window.confirm(`Are you sure you want to delete ${partIds.length} selected part(s)?\n\nThis action cannot be undone.`)
    if (!confirmed) return

    partIds.forEach(partId => {
      deletePart(partId)
    })
    
    console.log(`🗑️ Batch deleted ${partIds.length} parts`)
  }, [deletePart])

  return {
    // Field update functions
    updateTextField,
    updateSelectField,
    updatePriceField,
    updateOrderDateField,
    updateQuantityField,
    updateModelNumberField,
    getLatestFieldValue,
    
    // Single operations
    deletePart,
    
    // Batch operations
    batchUpdateOrderStatus,
    batchDeleteParts
  }
}