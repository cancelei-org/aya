import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Node } from '@xyflow/react'
import type { NodeData, CategoryNodeData } from '@/types'

interface UseSpatialCategorizationProps {
  nodes: Node<NodeData>[]
  updateNode: (nodeId: string, newData: Partial<NodeData>) => void
}

/**
 * 空間的カテゴリ自動分類フック
 * カテゴリの枠内に部品が入ったかどうかを判定し、自動的に categoryId を設定
 */
export const useSpatialCategorization = ({ 
  nodes, 
  updateNode 
}: UseSpatialCategorizationProps) => {
  const [localCategoryPreview, setLocalCategoryPreview] = useState<{[key: string]: string | null}>({})
  /**
   * ノードがカテゴリの範囲内にあるかを判定（境界ボックス + 重複面積）
   */
  const isNodeInBounds = useCallback((
    nodePosition: { x: number; y: number }, 
    bounds: { x: number; y: number; width: number; height: number },
    nodeWidth: number = 240,  // 実際のノード幅（SystemNodeの幅）
    nodeHeight: number = 120  // 実際のノード高さ
  ): { isInBounds: boolean; overlapRatio: number } => {
    // ノードの境界ボックス
    const nodeBounds = {
      left: nodePosition.x,
      top: nodePosition.y,
      right: nodePosition.x + nodeWidth,
      bottom: nodePosition.y + nodeHeight
    }
    
    // カテゴリの境界ボックス
    const categoryBounds = {
      left: bounds.x,
      top: bounds.y,
      right: bounds.x + bounds.width,
      bottom: bounds.y + bounds.height
    }
    
    // 重複領域の計算
    const overlapLeft = Math.max(nodeBounds.left, categoryBounds.left)
    const overlapTop = Math.max(nodeBounds.top, categoryBounds.top)
    const overlapRight = Math.min(nodeBounds.right, categoryBounds.right)
    const overlapBottom = Math.min(nodeBounds.bottom, categoryBounds.bottom)
    
    // 重複がない場合
    if (overlapLeft >= overlapRight || overlapTop >= overlapBottom) {
      return { isInBounds: false, overlapRatio: 0 }
    }
    
    // 重複面積の計算
    const overlapArea = (overlapRight - overlapLeft) * (overlapBottom - overlapTop)
    const nodeArea = nodeWidth * nodeHeight
    const overlapRatio = overlapArea / nodeArea
    
    // 50%以上重複している場合にカテゴライズ
    const isInBounds = overlapRatio >= 0.5
    
    return { isInBounds, overlapRatio }
  }, [])
  
  /**
   * カテゴリメンバーシップを更新（バッチ更新対応）
   * 依存関係を安定化してループを防止
   */
  const updateCategoryMembership = useCallback((currentNodes?: Node<NodeData>[]) => {
    const nodeList = currentNodes || nodes
    
    // カテゴリノードと部品ノードを分類
    const categoryNodes = nodeList.filter(n => n.data?.nodeType === 'category') as Node<CategoryNodeData>[]
    const partNodes = nodeList.filter(n => n.data?.nodeType !== 'category')
    
    if (categoryNodes.length === 0 || partNodes.length === 0) {
      return // カテゴリまたは部品が存在しない場合は何もしない
    }
    
    // 各部品について、どのカテゴリに属するかを判定（優先度付き）
    const partCategoryAssignments = new Map<string, { categoryId: string; overlapRatio: number }>()
    
    partNodes.forEach(part => {
      let bestMatch: { categoryId: string; overlapRatio: number } | null = null
      
      categoryNodes.forEach(category => {
        // React Flow座標系から正確なboundsを取得
        const bounds = category.data.bounds || {
          x: category.position?.x || 0,
          y: category.position?.y || 0,
          width: 300,
          height: 200
        }
        
        const result = isNodeInBounds(part.position, bounds)
        
        // 50%以上重複している場合のみ考慮
        if (result.isInBounds && (!bestMatch || result.overlapRatio > bestMatch.overlapRatio)) {
          bestMatch = {
            categoryId: category.id,
            overlapRatio: result.overlapRatio
          }
        }
      })
      
      if (bestMatch) {
        partCategoryAssignments.set(part.id, bestMatch)
      }
    })
    
    // バッチ更新用の配列
    const batchUpdates: Array<{ nodeId: string; newData: Partial<NodeData> }> = []
    
    // 各カテゴリのメンバーリストを更新
    categoryNodes.forEach(category => {
      const membersInBounds = partNodes.filter(part => {
        const assignment = partCategoryAssignments.get(part.id)
        return assignment && assignment.categoryId === category.id
      })
      
      // カテゴリのメンバーリスト更新
      const newMemberIds = membersInBounds.map(m => m.id)
      if (JSON.stringify(category.data.memberNodes) !== JSON.stringify(newMemberIds)) {
        batchUpdates.push({
          nodeId: category.id,
          newData: {
            memberNodes: newMemberIds
          }
        })
      }
      
      // 部品側のカテゴリID更新
      membersInBounds.forEach(member => {
        const assignment = partCategoryAssignments.get(member.id)
        if (member.data.categoryId !== category.id && assignment?.categoryId === category.id) {
          // カテゴリのboundsを取得
          const categoryBounds = category.data.bounds || {
            x: category.position?.x || 0,
            y: category.position?.y || 0,
            width: 300,
            height: 200
          }
          
          // カテゴリ内での相対位置を計算・記録
          const relativePosition = {
            x: member.position.x - categoryBounds.x,
            y: member.position.y - categoryBounds.y
          }
          
          batchUpdates.push({
            nodeId: member.id,
            newData: {
              categoryId: category.id,
              nodeType: 'part',
              relativePosition: relativePosition
            }
          })
        }
      })
    })
    
    // カテゴリ範囲外の部品のカテゴリIDをクリア
    partNodes.forEach(part => {
      if (part.data.categoryId && !partCategoryAssignments.has(part.id)) {
        batchUpdates.push({
          nodeId: part.id,
          newData: {
            categoryId: undefined,
            relativePosition: undefined
          }
        })
      }
    })
    
    // バッチ更新を一度に実行（状態競合回避）
    if (batchUpdates.length > 0) {
      batchUpdates.forEach(update => {
        updateNode(update.nodeId, update.newData)
      })
    }
  }, [updateNode, isNodeInBounds]) // nodes依存関係を削除
  
  /**
   * カテゴリ全体を移動（カテゴリ内の部品も一緒に移動）
   */
  const moveCategoryWithMembers = useCallback((
    categoryId: string, 
    delta: { x: number; y: number }
  ) => {
    console.log(`🚀 Moving category ${categoryId} with delta:`, delta)
    
    const category = nodes.find(n => n.id === categoryId && n.data?.nodeType === 'category') as Node<CategoryNodeData>
    if (!category) return
    
    // カテゴリ内の部品を一緒に移動
    const memberNodes = nodes.filter(n => n.data.categoryId === categoryId)
    
    memberNodes.forEach(member => {
      const newPosition = {
        x: member.position.x + delta.x,
        y: member.position.y + delta.y
      }
      
      // ノード位置を更新（React Flowの標準的な方法）
      // updateNode では position を直接更新できないため、
      // この処理は親コンポーネントで実装する必要がある
      console.log(`📍 Member ${member.data.title} new position:`, newPosition)
    })
  }, [nodes])
  
  /**
   * カテゴリ重複防止：他のカテゴリと重複しないかチェック
   */
  const validateCategoryPosition = useCallback((
    categoryId: string,
    newBounds: { x: number; y: number; width: number; height: number }
  ): { isValid: boolean; adjustedBounds?: { x: number; y: number; width: number; height: number } } => {
    const otherCategories = nodes.filter(n => 
      n.data?.nodeType === 'category' && 
      n.id !== categoryId
    )
    
    // 重複チェック
    for (const otherCategory of otherCategories) {
      const otherBounds = otherCategory.data.bounds
      if (!otherBounds) continue
      
      // 境界ボックス重複判定
      const isOverlapping = !(
        newBounds.x + newBounds.width <= otherBounds.x ||
        otherBounds.x + otherBounds.width <= newBounds.x ||
        newBounds.y + newBounds.height <= otherBounds.y ||
        otherBounds.y + otherBounds.height <= newBounds.y
      )
      
      if (isOverlapping) {
        console.log(`⚠️ Category ${categoryId} overlaps with ${otherCategory.id}`)
        
        // 自動調整：右にずらす
        const adjustedBounds = {
          ...newBounds,
          x: otherBounds.x + otherBounds.width + 20, // 20pxの余白
        }
        
        // 再帰的に他のカテゴリとの重複もチェック
        const recursiveCheck = validateCategoryPosition(categoryId, adjustedBounds)
        return recursiveCheck.isValid ? recursiveCheck : { isValid: false }
      }
    }
    
    return { isValid: true, adjustedBounds: newBounds }
  }, [nodes])

  /**
   * カテゴリのサイズを更新
   */
  const updateCategoryBounds = useCallback((
    categoryId: string,
    newBounds: { x: number; y: number; width: number; height: number }
  ) => {
    console.log(`📏 Updating category ${categoryId} bounds:`, newBounds)
    
    // 重複防止チェック
    const validation = validateCategoryPosition(categoryId, newBounds)
    const finalBounds = validation.adjustedBounds || newBounds
    
    if (!validation.isValid) {
      console.warn(`❌ Cannot place category ${categoryId} at position - no valid space found`)
      return
    }
    
    updateNode(categoryId, {
      bounds: finalBounds
    })
    
    // サイズ変更後に即座に自動分類を実行
    updateCategoryMembership()
  }, [updateNode, updateCategoryMembership, validateCategoryPosition])
  
  /**
   * 安定化されたハッシュ計算（無限ループ防止）
   */
  const stableNodeIds = useMemo(() => {
    return nodes.map(n => n.id).sort().join('|')
  }, [nodes.length]) // 長さのみに依存
  
  const positionHash = useMemo(() => {
    if (nodes.length === 0) return ''
    return nodes
      .filter(n => n.data?.nodeType !== 'category')
      .map(n => `${n.id}:${Math.round(n.position?.x || 0)}:${Math.round(n.position?.y || 0)}`)
      .sort()
      .join('|')
  }, [stableNodeIds, nodes.map(n => `${n.id}:${Math.round(n.position?.x || 0)}:${Math.round(n.position?.y || 0)}`).join('|')])

  const boundsHash = useMemo(() => {
    if (nodes.length === 0) return ''
    return nodes
      .filter(n => n.data?.nodeType === 'category')
      .map(n => {
        const bounds = n.data.bounds
        return bounds 
          ? `${n.id}:${Math.round(bounds.x)}:${Math.round(bounds.y)}:${Math.round(bounds.width)}:${Math.round(bounds.height)}`
          : `${n.id}:no-bounds`
      })
      .sort()
      .join('|')
  }, [stableNodeIds, nodes.filter(n => n.data?.nodeType === 'category').map(n => {
    const bounds = n.data.bounds
    return bounds ? `${n.id}:${Math.round(bounds.x)}:${Math.round(bounds.y)}:${Math.round(bounds.width)}:${Math.round(bounds.height)}` : `${n.id}:no-bounds`
  }).join('|')])

  /**
   * 統合されたカテゴライズトリガー（無限ループ防止）
   */
  const lastProcessedHashRef = useRef<string>('')
  const isInitializedRef = useRef(false)
  
  useEffect(() => {
    if (nodes.length === 0) return
    
    // 現在のハッシュを計算
    const currentHash = `pos:${positionHash}|bounds:${boundsHash}`
    
    // ハッシュが変わってない場合はスキップ
    if (currentHash === lastProcessedHashRef.current) return
    
    // データロード初期化判定
    const hasCategories = nodes.some(n => n.data?.nodeType === 'category')
    const hasParts = nodes.some(n => n.data?.nodeType !== 'category')
    
    if (!hasCategories || !hasParts) return
    
    const isInitialization = !isInitializedRef.current
    
    // デバウンスタイマー
    const delay = isInitialization ? 200 : 100
    const timer = setTimeout(() => {
      lastProcessedHashRef.current = currentHash
      
      if (process.env.NODE_ENV === 'development') {
        // Categorization logging reduced for performance
      }
      
      updateCategoryMembership(nodes)
      isInitializedRef.current = true
    }, delay)
    
    return () => clearTimeout(timer)
  }, [positionHash, boundsHash, nodes, updateCategoryMembership])
  
  /**
   * ドラッグ中のリアルタイム視覚フィードバック
   */
  const getNodeDragPreview = useCallback((
    nodeId: string,
    dragPosition: { x: number; y: number }
  ): { categoryId: string | null; overlapRatio: number } => {
    // 自己参照防止: ドラッグしているノード自体がカテゴリの場合は除外
    const draggedNode = nodes.find(n => n.id === nodeId)
    if (draggedNode && draggedNode.data?.nodeType === 'category') {
      return { categoryId: null, overlapRatio: 0 }
    }
    
    const categoryNodes = nodes.filter(n => 
      n.data?.nodeType === 'category' && 
      n.id !== nodeId // 自分自身を除外
    )
    let bestMatch: { categoryId: string; overlapRatio: number } | null = null
    
    categoryNodes.forEach(category => {
      const bounds = category.data.bounds
      const result = isNodeInBounds(dragPosition, bounds)
      
      if (result.isInBounds && (!bestMatch || result.overlapRatio > bestMatch.overlapRatio)) {
        bestMatch = {
          categoryId: category.id,
          overlapRatio: result.overlapRatio
        }
      }
    })
    
    return {
      categoryId: bestMatch?.categoryId || null,
      overlapRatio: bestMatch?.overlapRatio || 0
    }
  }, [nodes, isNodeInBounds])

  return { 
    updateCategoryMembership: (nodeList?: Node<NodeData>[]) => updateCategoryMembership(nodeList),
    moveCategoryWithMembers,
    updateCategoryBounds,
    isNodeInBounds,
    getNodeDragPreview,
    validateCategoryPosition,
    localCategoryPreview,
    setLocalCategoryPreview
  }
}