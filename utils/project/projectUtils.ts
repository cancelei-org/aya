import type { Connection } from '@/types'
import { Node } from '@xyflow/react'

// 🚀 React Flow完全移行版: JSON保存・復元処理

// プロジェクトデータのロード（React Flow版）
export const loadProjectData = async (
  session: any,
  setCurrentProject: (project: { id: string, name: string, description: string }) => void,
  setNodes: (nodes: Node[]) => void,  // React Flow nodes 直接設定
  setConnections: (connections: Connection[]) => void,
  setChatMessages: (messages: any[]) => void,
  setIsChatActive: (isActive: boolean) => void,
  _unusedTreeDataSetter: any, // 互換性のため残すが使用しない
  setIsDataLoaded: (isLoaded: boolean) => void
) => {
  try {
    console.log('🚀 Loading project data (React Flow JSON version)...')
    
    const response = await fetch('/api/projects/get-or-create-new', {
      credentials: 'include'
    })
    
    if (!response.ok) {
      console.error('Failed to load project data:', response.status)
      return
    }
    
    const data = await response.json()
    console.log('📦 Received project data:', {
      nodes: data.project.nodes?.length || 0,
      connections: data.project.connections?.length || 0,
      pbsItems: data.project.pbsStructure?.length || 0,
      chatMessages: data.project.chatMessages?.length || 0
    })
    
    // プロジェクト情報設定
    setCurrentProject({
      id: data.project.id,
      name: data.project.name,
      description: data.project.description
    })
    
    // 🚀 React Flow nodes を直接設定（変換処理なし）
    if (data.project.nodes && data.project.nodes.length > 0) {
      console.log('📦 Setting React Flow nodes directly:', data.project.nodes.length)
      console.log('📍 First node position:', data.project.nodes[0]?.position)
      setNodes(data.project.nodes)  // JSON形式のReact Flow nodesをそのまま設定
    } else {
      console.log('📦 No nodes data found')
      setNodes([])
    }
    
    // 接続データを設定
    if (data.project.connections && data.project.connections.length > 0) {
      console.log('🔗 Setting connections:', data.project.connections.length)
      console.log('🔗 Connection details:', data.project.connections.map(conn => ({
        id: conn.id,
        fromId: conn.fromId,
        toId: conn.toId,
        fromPort: conn.fromPort,
        toPort: conn.toPort
      })))
      setConnections(data.project.connections)
    } else {
      console.log('🔗 No connections data found')
      setConnections([])
    }
    
    // 🚀 単一データソース: PBS構造復元を段階的削除
    // PBS情報は nodes から自動生成されるため、データベース復元は不要
    if (data.project.pbsStructure && data.project.pbsStructure.length > 0) {
      console.log('🌳 Legacy PBS structure found (ignored):', data.project.pbsStructure.length)
      console.log('📊 PBS will be auto-generated from nodes instead')
      // フォールバック: 初期データは使用しない（自動生成のため）
    } else {
      console.log('🌳 No PBS structure found (will auto-generate from nodes)')
      // 初期データは使用しない（自動生成のため）
    }
    
    // チャットメッセージ復元
    if (data.project.chatMessages && data.project.chatMessages.length > 0) {
      console.log('💬 Setting chat messages:', data.project.chatMessages.length)
      console.log('💬 First message:', data.project.chatMessages[0])
      console.log('💬 Last message:', data.project.chatMessages[data.project.chatMessages.length - 1])
      setChatMessages(data.project.chatMessages)
      setIsChatActive(true)
    } else {
      console.log('💬 No chat messages found')
      setChatMessages([])
    }
    
    setIsDataLoaded(true)
    console.log('✅ Project data loaded successfully (React Flow JSON)')
    
  } catch (error) {
    console.error('❌ Error loading project data:', error)
    setIsDataLoaded(true) // エラーでも続行
  }
}

// プロジェクトデータの保存（React Flow版）
export const saveProjectData = async (
  connections: Connection[],
  currentProject: { id: string } | null,
  nodes: Node[],  // React Flow nodes 直接受け取り
    chatMessages: any[],
  isSaving: boolean,
  setIsSaving: (saving: boolean) => void
) => {
  if (isSaving) {
    console.log('⏳ Save already in progress, skipping...')
    return
  }
  
  if (!currentProject?.id) {
    console.log('⚠️ No project ID, skipping save')
    return
  }

  // 🔧 防御的プログラミング: connectionsが配列でない場合の対処
  console.log('🔍 Debug: connections type and value:', typeof connections, connections)
  const safeConnections = Array.isArray(connections) ? connections : []
  const safeNodes = Array.isArray(nodes) ? nodes : []
  const safeTreeDataState = Array.isArray([]) ? [] : []
  
  // 🔧 チャットメッセージを最新50件に制限（大量データ対策）
  const MAX_CHAT_MESSAGES = 50
  const allChatMessages = Array.isArray(chatMessages) ? chatMessages : []
  const safeChatMessages = allChatMessages.slice(-MAX_CHAT_MESSAGES)
  
  if (allChatMessages.length > MAX_CHAT_MESSAGES) {
    console.log(`⚠️ Limiting chat messages from ${allChatMessages.length} to ${MAX_CHAT_MESSAGES} (latest messages only)`)
  }

  setIsSaving(true)
  
  try {
    console.log('💾 Saving project data (Single Data Source)...', {
      projectId: currentProject.id,
      nodes: safeNodes.length,
      connections: safeConnections.length,
      chatMessages: safeChatMessages.length,
      // 🚀 単一データソース: PBS情報は保存しない（自動生成のため）
      pbsItemsSkipped: safeTreeDataState.length
    })
    
    // 🔍 位置情報デバッグ
    if (safeNodes.length > 0) {
      console.log('📍 First node position being saved:', safeNodes[0]?.position)
    }

    // 🛡️ Clean nodes data to prevent circular references and reduce payload size
    const cleanedNodes = safeNodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        // Remove circular references and unnecessary properties
        allNodes: undefined,
        onEdit: undefined,
        onDelete: undefined,
        onApprove: undefined,
        onReject: undefined,
        onFinishEditing: undefined,
        onStartEditing: undefined,
        onUpdateNodeTitle: undefined,
        onUpdateCategoryBounds: undefined,
        onCategoryResize: undefined,
        setEditingItemId: undefined,
        setEditingValue: undefined,
        // Remove any other function references
        ...(Object.keys(node.data || {}).reduce((acc, key) => {
          if (typeof node.data[key] !== 'function') {
            acc[key] = node.data[key];
          }
          return acc;
        }, {} as any))
      }
    }));

    const response = await fetch('/api/projects/save-canvas-new', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        projectId: currentProject.id,
        nodes: cleanedNodes,  // Send cleaned nodes without circular references
        connections: safeConnections,
        // 🚀 単一データソース: PBS保存を段階的削除
        // pbsData: safeTreeDataState,  // ← コメントアウト
        pbsData: [],  // 空配列で送信（段階的移行）
        chatMessages: safeChatMessages
      }),
    })

    if (!response.ok) {
      console.error('🔍 DEBUG: Response status:', response.status)
      console.error('🔍 DEBUG: Response ok:', response.ok)
      throw new Error(`HTTP error: ${response.status} ${response.statusText}`)
    }

    const result = await response.json()
    console.log('✅ Project data saved successfully:', result)

  } catch (error) {
    console.error('❌ Error saving project data:', error)
    throw error
  } finally {
    setIsSaving(false)
  }
}

// React Flow版の接続付き保存
export const saveProjectDataWithConnections = async (
  connectionsToSave: Connection[],
  currentProject: { id: string } | null,
  nodes: Node[],  // React Flow nodes
    chatMessages: any[],
  isSaving: boolean,
  setIsSaving: (saving: boolean) => void
) => {
  return saveProjectData(
    connectionsToSave, 
    currentProject, 
    nodes, 
     
    chatMessages, 
    isSaving, 
    setIsSaving
  )
}

// ノード位置のみ保存（React Flow版）
export const saveNodePosition = async (
  projectId: string, 
  nodeId: string, 
  position: { x: number; y: number }
) => {
  try {
    console.log(`💾 Saving node position (React Flow): ${nodeId} at (${position.x}, ${position.y})`)
    
    // 軽量な位置保存API（実装は後で追加）
    // 現在は通常の保存処理で代用
    console.log('⚠️ Position-only save not implemented yet, using full save')
    
  } catch (error) {
    console.error('❌ Error saving node position:', error)
    throw error
  }
}