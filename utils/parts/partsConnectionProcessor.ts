// 接続処理専用プロセッサー
import { findMatchingComponent, generateMatchSuggestions } from '../connections/routing/connectionMatching'
import type { FailedConnection } from '@/types'

// 接続データの型定義 (React Flow標準形式)
interface SystemConnection {
  id?: string
  source: string        // 接続元ノードID (旧: fromComponent)
  target: string        // 接続先ノードID (旧: toComponent)
  sourceHandle?: string // 接続元ポート
  targetHandle?: string // 接続先ポート
  type?: string        // 接続タイプ (旧: connectionType)
  description?: string
}

// システム接続処理のメイン関数
export const processSystemConnections = async (
  systemConnections: SystemConnection[],
  componentInstances: any[],
  setConnections: any,
  setFailedConnections: any,
  setCanvasNodes: any
) => {
  console.log('🔗 Processing AI-generated connections:', systemConnections.length)
  
  // Reset failed connections
  setFailedConnections([])
  
  const newConnections = systemConnections.map((conn: SystemConnection, index: number) => {
    // Null safety check for connection components
    const source = conn?.source || 'unknown'
    const target = conn?.target || 'unknown'
    
    console.log(`🔗 Processing connection: ${source} → ${target}`)
    
    // Debug: Show what we're looking for and what's available
    console.log(`🔍 Looking for nodes with IDs:`)
    console.log(`   Source: ${source}`)
    console.log(`   Target: ${target}`)
    console.log(`🔍 Available node IDs:`, componentInstances.map(c => c.id))
    
    // Use improved matching algorithm
    const fromNode = findMatchingComponent(source, componentInstances)
    const toNode = findMatchingComponent(target, componentInstances)
    
    // Debug: Show match results
    console.log(`📌 Match results:`)
    console.log(`   From node: ${fromNode ? `${fromNode.id} (${fromNode.title})` : 'NOT FOUND'}`)
    console.log(`   To node: ${toNode ? `${toNode.id} (${toNode.title})` : 'NOT FOUND'}`)
    
    if (fromNode && toNode) {
      console.log(`✅ Successfully created connection: ${fromNode.title} → ${toNode.title}`)
      return createSuccessfulConnection(conn, fromNode, toNode, index)
    } else {
      // Handle failed connections
      handleFailedConnection(conn, fromNode, toNode, componentInstances, setFailedConnections)
      return null
    }
  }).filter(Boolean)
  
  console.log('✅ Generated connections:', newConnections.length)
  console.log('❌ Failed connections:', systemConnections.length - newConnections.length)
  
  // Force connections update with improved synchronization
  updateConnectionsWithSynchronization(newConnections, setConnections, setCanvasNodes)
  
  // Return the new connections for immediate use
  return newConnections
}

// 成功した接続を作成
function createSuccessfulConnection(
  conn: SystemConnection,
  fromNode: any,
  toNode: any,
  index: number
) {
  // Find appropriate ports for dynamic port nodes
  let sourcePort = 'output-center'
  let targetPort = 'input-center'
  
  // Try to match ports based on connection type
  const connectionType = conn.type?.toLowerCase() || 'signal'
  
  // Check if nodes have dynamic ports
  if (fromNode.ports && fromNode.ports.length > 0) {
    // First, try to find a port matching the connection type
    let outputPort = fromNode.ports.find((p: any) => 
      (p.direction === 'output' || p.direction === 'bidirectional') &&
      (p.type?.toLowerCase() === connectionType || p.protocol?.toLowerCase() === connectionType)
    )
    
    // If no specific match, find any output port
    if (!outputPort) {
      outputPort = fromNode.ports.find((p: any) => 
        p.direction === 'output' || p.direction === 'bidirectional'
      )
    }
    
    // If still no output port found, use any available port as fallback
    if (!outputPort && fromNode.ports.length > 0) {
      outputPort = fromNode.ports[0]
      console.warn(`⚠️ No output port found for ${fromNode.title}, using first available port: ${outputPort.id}`)
    }
    
    if (outputPort) {
      sourcePort = outputPort.direction === 'bidirectional' 
        ? `${outputPort.id}_source` 
        : outputPort.id
      console.log(`📤 From node "${fromNode.title}" using port: ${outputPort.label} (${sourcePort})`)
    }
  }
  
  if (toNode.ports && toNode.ports.length > 0) {
    // First, try to find a port matching the connection type
    let inputPort = toNode.ports.find((p: any) => 
      (p.direction === 'input' || p.direction === 'bidirectional') &&
      (p.type?.toLowerCase() === connectionType || p.protocol?.toLowerCase() === connectionType)
    )
    
    // If no specific match, find any input port
    if (!inputPort) {
      inputPort = toNode.ports.find((p: any) => 
        p.direction === 'input' || p.direction === 'bidirectional'
      )
    }
    
    // If still no input port found, use any available port as fallback
    if (!inputPort && toNode.ports.length > 0) {
      inputPort = toNode.ports[0]
      console.warn(`⚠️ No input port found for ${toNode.title}, using first available port: ${inputPort.id}`)
    }
    
    if (inputPort) {
      targetPort = inputPort.direction === 'bidirectional' 
        ? `${inputPort.id}_target` 
        : inputPort.id
      console.log(`📥 To node "${toNode.title}" using port: ${inputPort.label} (${targetPort})`)
    }
  }
  
  console.log(`🔌 Creating connection: ${fromNode.title} (${sourcePort}) → ${toNode.title} (${targetPort})`)
  
  // Return both formats for compatibility
  return {
    id: `ai-conn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${index}`,
    // 独自形式（既存コード用）
    fromId: fromNode.id,
    toId: toNode.id,
    fromPort: sourcePort,
    toPort: targetPort,
    // React Flow形式（React Flow用）
    source: fromNode.id,        
    target: toNode.id,          
    sourceHandle: sourcePort,   
    targetHandle: targetPort,   
    // その他のプロパティ
    type: conn.type || 'signal',
    data: {
      description: conn.description || '',
      connectionType: conn.type || 'signal'
    }
  }
}

// 失敗した接続を処理
function handleFailedConnection(
  conn: SystemConnection,
  fromNode: any,
  toNode: any,
  componentInstances: any[],
  setFailedConnections: any
) {
  const reason = !fromNode && !toNode ? 'Both components not found' 
               : !fromNode ? 'From component not found'
               : 'To component not found'
  
  const suggestions = generateMatchSuggestions(
    conn.source, 
    componentInstances
  )
  
  setFailedConnections((prev: FailedConnection[]) => [...prev, {
    from: conn.source,
    to: conn.target,
    reason,
    suggestions
  }])
  
  console.log(`❌ Failed connection: ${conn.source} → ${conn.target} (${reason})`)
}

// 接続状態の同期更新
function updateConnectionsWithSynchronization(
  newConnections: any[],
  setConnections: any,
  setCanvasNodes: any
) {
  setConnections((prev: any[]) => {
    const updatedConnections = [...prev, ...newConnections]
    console.log('🔄 Updating connections state:', {
      previous: prev.length,
      new: newConnections.length,
      total: updatedConnections.length,
      connectionIds: updatedConnections.map(c => c.id)
    })
    
    // Force multiple React Flow update cycles for better synchronization
    setTimeout(() => {
      console.log('🔄 Forcing React Flow edge refresh - cycle 1...')
      setCanvasNodes((currentNodes: any[]) => [...currentNodes])
    }, 50)
    
    setTimeout(() => {
      console.log('🔄 Forcing React Flow edge refresh - cycle 2...')
      setCanvasNodes((currentNodes: any[]) => {
        // Create a completely new array to trigger re-render
        return currentNodes.map(node => ({ ...node }))
      })
    }, 150)
    
    // Additional debug logging
    console.log('🔍 Final connections to be set:', updatedConnections.map(c => ({
      id: c.id,
      from: c.fromId,
      to: c.toId,
      type: c.type || 'default'
    })))
    
    return updatedConnections
  })
}

// 接続の検証
export const validateConnections = (
  connections: any[],
  nodes: any[]
): {
  validConnections: any[]
  invalidConnections: any[]
} => {
  const validConnections: any[] = []
  const invalidConnections: any[] = []
  
  connections.forEach(conn => {
    const fromExists = nodes.some(node => node.id === conn.fromId)
    const toExists = nodes.some(node => node.id === conn.toId)
    
    if (fromExists && toExists) {
      validConnections.push(conn)
    } else {
      invalidConnections.push({
        ...conn,
        reason: !fromExists && !toExists ? 'Both nodes missing'
               : !fromExists ? 'From node missing'
               : 'To node missing'
      })
    }
  })
  
  return { validConnections, invalidConnections }
}

// 接続の修復
export const repairConnections = (
  connections: any[],
  nodes: any[]
): any[] => {
  return connections.filter(conn => {
    const fromExists = nodes.some(node => node.id === conn.fromId)
    const toExists = nodes.some(node => node.id === conn.toId)
    return fromExists && toExists
  })
}

// 接続統計の取得
export const getConnectionStats = (
  connections: any[],
  nodes: any[]
) => {
  const { validConnections, invalidConnections } = validateConnections(connections, nodes)
  
  const connectionTypes = connections.reduce((acc, conn) => {
    const type = conn.type || 'default'
    acc[type] = (acc[type] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  return {
    total: connections.length,
    valid: validConnections.length,
    invalid: invalidConnections.length,
    byType: connectionTypes,
    validityRate: connections.length > 0 ? (validConnections.length / connections.length) * 100 : 0
  }
}

// 接続の自動修復
export const autoRepairConnections = (
  connections: any[],
  nodes: any[],
  setConnections: any,
  setFailedConnections: any
) => {
  const { validConnections, invalidConnections } = validateConnections(connections, nodes)
  
  if (invalidConnections.length > 0) {
    console.log(`🔧 Auto-repairing ${invalidConnections.length} invalid connections`)
    
    // 有効な接続のみを保持
    setConnections(validConnections)
    
    // 無効な接続を失敗リストに追加
    const failedConnections = invalidConnections.map(conn => ({
      from: conn.fromId,
      to: conn.toId,
      reason: conn.reason,
      suggestions: []
    }))
    
    setFailedConnections((prev: FailedConnection[]) => [...prev, ...failedConnections])
    
    console.log(`✅ Auto-repair completed. Valid: ${validConnections.length}, Failed: ${invalidConnections.length}`)
  }
  
  return validConnections
}