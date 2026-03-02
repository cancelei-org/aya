// PBS自動生成システム
// React Flow Nodesから２層PBS構造を自動計算

import type { Node } from '@xyflow/react'
import type { NodeData, Connection, PBSNode } from '@/types'

/**
 * React Flow nodes から PBS構造を自動生成
 * 単一データソースアーキテクチャの中核機能
 */
export function computePBSFromNodes(
  nodes: Node<NodeData>[],
  connections: Connection[] = []
): PBSNode[] {
  console.log('🔄 Computing PBS from nodes:', nodes.length, 'nodes,', connections.length, 'connections')
  
  // 🆕 1. カテゴリノードとパーツノードを分類（空間的カテゴリ対応）
  const categoryNodes = nodes.filter(node => 
    node.data?.nodeType === 'category' ||          // 🆕 新しい空間的カテゴリ
    node.data?.isPBSCategory                      // 🔄 既存のPBSカテゴリ（互換性維持）
  )
  const partNodes = nodes.filter(node => 
    node.data?.nodeType === 'part' ||              // 🆕 明示的に部品と指定されたもの
    (!node.data?.nodeType &&                      // 🔄 nodeTypeが未設定の場合は既存ロジック
     !node.data?.isPBSCategory)
  )
  
  console.log('📊 Node classification:', {
    categories: categoryNodes.length,
    parts: partNodes.length
  })
  
  // 2. カテゴリごとにパーツを分類
  const categoryPartsMap = new Map<string, Node<NodeData>[]>()
  const unassignedParts: Node<NodeData>[] = []
  
  // カテゴリの初期化
  categoryNodes.forEach(categoryNode => {
    categoryPartsMap.set(categoryNode.id, [])
  })
  
  // 🆕 パーツのカテゴリ所属を判定（空間的カテゴリベース）
  partNodes.forEach(partNode => {
    let assignedToCategory = false
    
    // categoryId による直接的な所属判定
    if (partNode.data?.categoryId) {
      const categoryNode = categoryNodes.find(cat => cat.id === partNode.data?.categoryId)
      if (categoryNode) {
        const existingParts = categoryPartsMap.get(categoryNode.id) || []
        categoryPartsMap.set(categoryNode.id, [...existingParts, partNode])
        assignedToCategory = true
        console.log(`✅ Part "${partNode.data?.title}" assigned to category via categoryId: "${categoryNode.data?.title}"`)
      }
    }
    
    
    // どのカテゴリにも属さない場合
    if (!assignedToCategory) {
      unassignedParts.push(partNode)
      console.log(`🚫 Part "${partNode.data?.title}" not assigned to any category`)
    }
  })
  
  console.log('🗂️ Parts assignment:', {
    assigned: Array.from(categoryPartsMap.values()).flat().length,
    unassigned: unassignedParts.length
  })
  
  // 3. PBS構造を構築
  const pbsStructure: PBSNode[] = []
  
  // カテゴリとその子パーツを追加
  categoryNodes.forEach(categoryNode => {
    const partsInCategory = categoryPartsMap.get(categoryNode.id) || []
    
    const pbsCategory: PBSNode = {
      id: categoryNode.id,
      name: categoryNode.data?.title || 'Untitled Category',
      type: "folder",
      icon: "Folder",
      isExpanded: true,
      children: partsInCategory.map(partNode => convertNodeToPBSNode(partNode))
    }
    
    pbsStructure.push(pbsCategory)
  })
  
  // 未割り当てのパーツをトップレベルに追加
  unassignedParts.forEach(partNode => {
    pbsStructure.push(convertNodeToPBSNode(partNode))
  })
  
  console.log('✅ PBS structure generated:', pbsStructure.length, 'top-level items')
  pbsStructure.forEach(item => {
    console.log(`  📁 ${item.name} (${item.type}): ${item.children?.length || 0} children`)
  })
  
  return pbsStructure
}

/**
 * React Flow Node を PBSNode に変換
 */
function convertNodeToPBSNode(node: Node<NodeData>): PBSNode {
  return {
    id: node.id,
    name: node.data?.title || 'Untitled',
    type: node.data?.isPBSCategory ? "folder" : "component",
    icon: node.data?.isPBSCategory ? "Folder" : "Circle",
    
    // 部品情報
    modelNumber: node.data?.modelNumber,
    orderStatus: node.data?.orderStatus,
    estimatedOrderDate: node.data?.estimatedOrderDate,
    purchaseSiteLink: node.data?.purchaseSiteLink,
    description: node.data?.description,
    voltage: node.data?.voltage,
    communication: node.data?.communication,
    
    // メタ情報
    basePartId: node.data?.basePartId,
    
    // カテゴリの場合は子要素を初期化
    children: node.data?.isPBSCategory ? [] : undefined,
    isExpanded: node.data?.isPBSCategory ? true : undefined
  }
}

/**
 * 既存のPBS構造をnodesベースに更新
 * 段階移行時に使用
 */
export function updatePBSWithComputedData(
  currentPBS: PBSNode[],
  nodes: Node<NodeData>[],
  connections: Connection[]
): PBSNode[] {
  const computedPBS = computePBSFromNodes(nodes, connections)
  
  // 既存のPBS構造の展開状態を保持
  const preserveExpansionState = (computed: PBSNode[], current: PBSNode[]): PBSNode[] => {
    return computed.map(computedItem => {
      const currentItem = current.find(item => item.id === computedItem.id)
      
      return {
        ...computedItem,
        isExpanded: currentItem?.isExpanded ?? computedItem.isExpanded,
        children: computedItem.children && currentItem?.children 
          ? preserveExpansionState(computedItem.children, currentItem.children)
          : computedItem.children
      }
    })
  }
  
  return preserveExpansionState(computedPBS, currentPBS)
}

/**
 * PBS構造の統計情報を取得
 * デバッグ・モニタリング用
 */
export function getPBSStatistics(pbs: PBSNode[]): {
  totalCategories: number
  totalParts: number
  unassignedParts: number
  deepestLevel: number
} {
  let totalCategories = 0
  let totalParts = 0
  let unassignedParts = 0
  let deepestLevel = 0
  
  const traverse = (nodes: PBSNode[], level: number = 0) => {
    deepestLevel = Math.max(deepestLevel, level)
    
    nodes.forEach(node => {
      if (node.type === "folder") {
        totalCategories++
        if (node.children) {
          traverse(node.children, level + 1)
        }
      } else if (node.type === "component") {
        totalParts++
        if (level === 0) {
          unassignedParts++
        }
      }
    })
  }
  
  traverse(pbs)
  
  return {
    totalCategories,
    totalParts,
    unassignedParts,
    deepestLevel
  }
}