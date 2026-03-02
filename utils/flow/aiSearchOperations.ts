import { Node } from '@xyflow/react'
import type { NodeData } from '@/types'
import { ComponentManager } from '../components/componentManager'

/**
 * 選択されたノードに対してAI検索を実行
 */
export const performAISearchForNodes = async (
  selectedNodes: Node<NodeData>[],
  setCanvasNodes: (updater: (prev: Node<NodeData>[]) => Node<NodeData>[]) => void
): Promise<{
  success: boolean
  updatedCount: number
  errors: string[]
}> => {
  const componentManager = ComponentManager.getInstance()
  const errors: string[] = []
  let updatedCount = 0

  // AI検索を開始

  // 各ノードに対して並列でAI検索を実行
  const searchPromises = selectedNodes.map(async (node) => {
    try {
      // 既にAI検索済みの場合はスキップ
      if (node.data.aiSearchPerformed) {
        // 既にAI検索済み
        return null
      }

      // AI検索を実行中
      
      const result = await componentManager.addComponentWithAI({
        componentName: node.data.title,
        position: node.position,
        addedFrom: 'diagram'
      })

      // AI検索結果を取得

      if (result.success && result.node) {
        // AI結果のノードデータを確認
        
        // 既存のノードデータとAI検索結果をマージ
        console.log('🔄 Merging AI search result with existing node data:', {
          nodeId: node.id,
          nodeTitle: node.data.title,
          hasResultSpecifications: !!result.node.data.specifications,
          resultSpecKeys: result.node.data.specifications ? Object.keys(result.node.data.specifications) : [],
          resultDescription: result.node.data.description
        })
        
        const updatedNodeData: NodeData = {
          ...node.data,
          ...result.node.data,
          // 既存の重要なフィールドは保持
          title: node.data.title, // ユーザーが設定したタイトルを保持
          orderStatus: node.data.orderStatus,
          estimatedOrderDate: node.data.estimatedOrderDate,
          quantity: node.data.quantity,
          description: result.node.data.description, // AI検索結果を優先（上書き更新）
          // AI検索結果で明示的に更新
          specifications: result.node.data.specifications, // AI検索結果を確実に保存
          voltage: result.node.data.voltage,
          communication: result.node.data.communication,
          ports: result.node.data.ports,
          dynamicPorts: result.node.data.dynamicPorts,
          // AI検索フラグ
          aiSearchPerformed: true,
          needsAISearch: false,
          aiSearchConfidence: result.node.data.aiSearchConfidence
        }
        
        // マージされたノードデータ
        console.log('✅ Final merged node data:', {
          nodeId: node.id,
          hasSpecifications: !!updatedNodeData.specifications,
          specificationsKeys: updatedNodeData.specifications ? Object.keys(updatedNodeData.specifications) : [],
          finalDescription: updatedNodeData.description,
          aiSearchPerformed: updatedNodeData.aiSearchPerformed
        })

        return {
          id: node.id,
          data: {
            ...updatedNodeData,
            _aiSearchUpdateTime: Date.now() // Force UI update
          }
        }
      } else {
        throw new Error(result.error || 'AI search failed')
      }
    } catch (error) {
      const errorMsg = `ノード ${node.data.title} のAI検索に失敗: ${error}`
      // エラーログは保持（本番環境で必要）
      console.error(errorMsg)
      errors.push(errorMsg)
      
      // エラー時の状態をリセット
      return {
        id: node.id,
        data: {
          ...node.data,
          isSearching: false,
          searchError: true,
          searchCompletedTime: Date.now(),
          _forceUpdate: Date.now()
        }
      }
    }
  })

  const results = await Promise.all(searchPromises)

  // ノードを更新
  setCanvasNodes(prev => {
    // 更新前のノード状態
    
    // 完全に新しい配列を作成して React Flow の更新を確実にする
    const updatedNodes = prev.map(node => {
      const result = results.find(r => r && r.id === node.id)
      if (result) {
        // エラーケースの場合はエラー状態が既に設定されている
        if (result.data.searchError) {
          // エラーで終了
          return {
            ...node,
            data: result.data
          }
        }
        
        // 成功ケース
        updatedCount++
        // result.dataには既に完全なノードデータが含まれている
        return {
          ...node,
          data: {
            ...result.data,
            isSearching: false, // 検索完了
            searchError: false,
            searchCompletedTime: Date.now()
          }
        }
      }
      return node
    })
    
    // 更新後のノード状態
    
    return updatedNodes
  })

  // AI検索完了

  return {
    success: errors.length === 0,
    updatedCount,
    errors
  }
}

/**
 * 単一ノードに対してAI検索を実行（コンテキストメニュー用）
 */
export const performAISearchForSingleNode = async (
  nodeId: string,
  nodes: Node<NodeData>[],
  setCanvasNodes: (updater: (prev: Node<NodeData>[]) => Node<NodeData>[]) => void
): Promise<boolean> => {
  const node = nodes.find(n => n.id === nodeId)
  if (!node) {
    // エラーログは保持（本番環境で必要）
    console.error(`ノード ${nodeId} が見つかりません`)
    return false
  }

  const result = await performAISearchForNodes([node], setCanvasNodes)
  return result.success && result.updatedCount > 0
}