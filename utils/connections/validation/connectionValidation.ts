import type { Connection, NodeData } from '@/types'
import type { Node } from '@xyflow/react'

// 問題のあるエッジIDのブラックリスト
const PROBLEMATIC_EDGE_IDS = [
  'conn-1753052821622-r40skt9nx',
  'conn-1753126589081-sa5xlmclq'
]

// 有効なハンドルIDのリスト
const VALID_HANDLES = ['input-center', 'output-center', 'input-top', 'output-bottom']

/**
 * 接続データの包括的な検証
 * @param connection 検証する接続データ
 * @param nodes ノードリスト（オプション）
 * @returns 検証結果
 */
export function validateConnection(connection: Connection, nodes?: Node<NodeData>[]): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []

  // 基本的なデータ検証
  if (!connection.id) {
    errors.push('Missing connection ID')
  }

  if (!connection.fromId) {
    errors.push('Missing fromId')
  }

  if (!connection.toId) {
    errors.push('Missing toId')
  }

  // ブラックリストチェック
  if (PROBLEMATIC_EDGE_IDS.includes(connection.id)) {
    errors.push(`Blacklisted edge ID: ${connection.id}`)
  }

  // ハンドルID検証
  const sourceHandle = connection.fromPort || 'output-center'
  const targetHandle = connection.toPort || 'input-center'

  // 動的ポートのIDパターンをチェック
  const isDynamicPort = (handle: string) => {
    // 動的ポートのIDパターン: power_*, i2c_*, spi_*, uart_*, connector_*, digital_*, analog_*, etc.
    const dynamicPortPatterns = [
      /^power_/,
      /^gnd_/,
      /^vin$/,
      /^i2c_/,
      /^spi_/,
      /^uart_/,
      /^serial_/,
      /^comm_/,
      /^connector_/,
      /^digital_/,
      /^analog_/,
      /^gpio/
    ]
    return dynamicPortPatterns.some(pattern => pattern.test(handle))
  }

  if (!VALID_HANDLES.includes(sourceHandle) && !isDynamicPort(sourceHandle)) {
    errors.push(`Invalid source handle: ${sourceHandle}`)
  }

  if (!VALID_HANDLES.includes(targetHandle) && !isDynamicPort(targetHandle)) {
    errors.push(`Invalid target handle: ${targetHandle}`)
  }

  // ノード存在確認
  if (nodes) {
    const sourceExists = nodes.some(n => n.id === connection.fromId)
    const targetExists = nodes.some(n => n.id === connection.toId)

    if (!sourceExists) {
      errors.push(`Source node not found: ${connection.fromId}`)
    }

    if (!targetExists) {
      errors.push(`Target node not found: ${connection.toId}`)
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * 接続データ配列のフィルタリングとクリーンアップ
 * @param connections 接続データ配列
 * @param nodes ノードリスト（オプション）
 * @returns クリーンアップされた接続データ配列
 */
export function cleanConnections(connections: Connection[], nodes?: Node<NodeData>[]): {
  cleanedConnections: Connection[]
  removedConnections: Connection[]
  summary: {
    total: number
    valid: number
    removed: number
  }
} {
  const validConnections: Connection[] = []
  const removedConnections: Connection[] = []

  for (const connection of connections) {
    const validation = validateConnection(connection, nodes)
    
    if (validation.isValid) {
      validConnections.push(connection)
    } else {
      removedConnections.push(connection)
      if (process.env.NODE_ENV === 'development') {
        console.warn(`🚫 Removing invalid connection ${connection.id}:`, validation.errors)
      }
    }
  }

  return {
    cleanedConnections: validConnections,
    removedConnections,
    summary: {
      total: connections.length,
      valid: validConnections.length,
      removed: removedConnections.length
    }
  }
}

/**
 * 新しい接続IDを生成（重複チェック付き）
 * @param existingConnections 既存の接続リスト
 * @returns 新しいユニークな接続ID
 */
export function generateConnectionId(existingConnections: Connection[]): string {
  let attempts = 0
  const maxAttempts = 100

  while (attempts < maxAttempts) {
    const id = `conn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    // 既存の接続IDと重複しないかチェック
    if (!existingConnections.some(conn => conn.id === id) && !PROBLEMATIC_EDGE_IDS.includes(id)) {
      return id
    }
    
    attempts++
  }

  throw new Error('Failed to generate unique connection ID after maximum attempts')
}