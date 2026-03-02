// 接続線ルーティング最適化システム
// 複数接続線の交差回避アルゴリズム実装

import type { Connection } from '@/types'

// ルーティングポイント（経由点）の定義
export interface RoutingPoint {
  x: number
  y: number
  type: 'waypoint' | 'junction' | 'branch'
}

// ルーティングパス情報
export interface RoutingPath {
  connectionId: string
  points: RoutingPoint[]
  pathString: string // SVG path文字列
  priority: number // 優先度（0=最高）
  intersections: string[] // 交差する他の接続のID
}

// ノード位置情報
interface NodePosition {
  id: string
  x: number
  y: number
  width: number
  height: number
}

// 交差検出結果
interface IntersectionResult {
  connection1: string
  connection2: string
  point: { x: number; y: number }
  angle: number // 交差角度（度）
}

// 交差検出アルゴリズム
export function detectIntersections(
  connections: Connection[],
  nodePositions: NodePosition[]
): IntersectionResult[] {
  const intersections: IntersectionResult[] = []
  
  // 全ての接続ペアについて交差判定
  for (let i = 0; i < connections.length - 1; i++) {
    for (let j = i + 1; j < connections.length; j++) {
      const conn1 = connections[i]
      const conn2 = connections[j]
      
      // 接続線の座標を取得
      const line1 = getConnectionLine(conn1, nodePositions)
      const line2 = getConnectionLine(conn2, nodePositions)
      
      if (!line1 || !line2) continue
      
      // 線分の交差判定
      const intersection = getLineIntersection(line1, line2)
      if (intersection) {
        // 交差角度を計算
        const angle = calculateIntersectionAngle(line1, line2)
        
        intersections.push({
          connection1: conn1.id,
          connection2: conn2.id,
          point: intersection,
          angle
        })
      }
    }
  }
  
  return intersections
}

// 接続線の座標を取得
function getConnectionLine(
  connection: Connection, 
  nodePositions: NodePosition[]
): { start: { x: number; y: number }; end: { x: number; y: number } } | null {
  const sourceNode = nodePositions.find(n => n.id === connection.fromId)
  const targetNode = nodePositions.find(n => n.id === connection.toId)
  
  if (!sourceNode || !targetNode) return null
  
  // ポート位置を計算（簡略化）
  const startX = sourceNode.x + sourceNode.width
  const startY = sourceNode.y + sourceNode.height / 2
  const endX = targetNode.x
  const endY = targetNode.y + targetNode.height / 2
  
  return {
    start: { x: startX, y: startY },
    end: { x: endX, y: endY }
  }
}

// 2つの線分の交点を計算
function getLineIntersection(
  line1: { start: { x: number; y: number }; end: { x: number; y: number } },
  line2: { start: { x: number; y: number }; end: { x: number; y: number } }
): { x: number; y: number } | null {
  const { start: p1, end: p2 } = line1
  const { start: p3, end: p4 } = line2
  
  const denominator = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x)
  
  if (Math.abs(denominator) < 1e-10) {
    // 平行線または一致
    return null
  }
  
  const t = ((p1.x - p3.x) * (p3.y - p4.y) - (p1.y - p3.y) * (p3.x - p4.x)) / denominator
  const u = -((p1.x - p2.x) * (p1.y - p3.y) - (p1.y - p2.y) * (p1.x - p3.x)) / denominator
  
  // 線分上に交点があるかチェック
  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    return {
      x: p1.x + t * (p2.x - p1.x),
      y: p1.y + t * (p2.y - p1.y)
    }
  }
  
  return null
}

// 交差角度を計算
function calculateIntersectionAngle(
  line1: { start: { x: number; y: number }; end: { x: number; y: number } },
  line2: { start: { x: number; y: number }; end: { x: number; y: number } }
): number {
  const angle1 = Math.atan2(line1.end.y - line1.start.y, line1.end.x - line1.start.x)
  const angle2 = Math.atan2(line2.end.y - line2.start.y, line2.end.x - line2.start.x)
  
  let diff = Math.abs(angle1 - angle2) * (180 / Math.PI)
  if (diff > 90) diff = 180 - diff
  
  return diff
}

// 最適化されたルーティングパスを生成
export function generateOptimizedRouting(
  connections: Connection[],
  nodePositions: NodePosition[],
  avoidIntersections: boolean = true
): RoutingPath[] {
  const paths: RoutingPath[] = []
  
  // 交差検出を実行
  const intersections = avoidIntersections ? detectIntersections(connections, nodePositions) : []
  
  // 接続優先度を計算（短い接続、重要な接続を優先）
  const sortedConnections = [...connections].sort((a, b) => {
    const priorityA = calculateConnectionPriority(a, nodePositions)
    const priorityB = calculateConnectionPriority(b, nodePositions)
    return priorityA - priorityB
  })
  
  // 各接続のルーティングパスを生成
  sortedConnections.forEach((connection, index) => {
    const conflictingConnections = intersections
      .filter(i => i.connection1 === connection.id || i.connection2 === connection.id)
      .map(i => i.connection1 === connection.id ? i.connection2 : i.connection1)
    
    const path = generateConnectionPath(connection, nodePositions, conflictingConnections, index)
    if (path) {
      paths.push(path)
    }
  })
  
  return paths
}

// 接続の優先度を計算
function calculateConnectionPriority(
  connection: Connection,
  nodePositions: NodePosition[]
): number {
  const sourceNode = nodePositions.find(n => n.id === connection.fromId)
  const targetNode = nodePositions.find(n => n.id === connection.toId)
  
  if (!sourceNode || !targetNode) return 1000 // 低優先度
  
  // 距離を基準とした優先度（短い接続ほど優先）
  const distance = Math.sqrt(
    Math.pow(targetNode.x - sourceNode.x, 2) + 
    Math.pow(targetNode.y - sourceNode.y, 2)
  )
  
  // 電力接続は優先度を上げる
  const isPowerConnection = connection.fromPort?.toLowerCase().includes('power') || 
                           connection.fromPort?.toLowerCase().includes('vcc') ||
                           connection.fromPort?.toLowerCase().includes('gnd')
  
  let priority = distance
  if (isPowerConnection) priority *= 0.8 // 20%優先度アップ
  
  return priority
}

// 個別接続のパスを生成
function generateConnectionPath(
  connection: Connection,
  nodePositions: NodePosition[],
  conflictingConnections: string[],
  routingIndex: number
): RoutingPath | null {
  const sourceNode = nodePositions.find(n => n.id === connection.fromId)
  const targetNode = nodePositions.find(n => n.id === connection.toId)
  
  if (!sourceNode || !targetNode) return null
  
  const startX = sourceNode.x + sourceNode.width
  const startY = sourceNode.y + sourceNode.height / 2
  const endX = targetNode.x
  const endY = targetNode.y + targetNode.height / 2
  
  let waypoints: RoutingPoint[] = []
  
  // 交差回避が必要な場合は迂回ルートを計算
  if (conflictingConnections.length > 0) {
    waypoints = calculateAvoidanceWaypoints(
      { x: startX, y: startY },
      { x: endX, y: endY },
      routingIndex
    )
  }
  
  // 全てのポイントを結合
  const allPoints: RoutingPoint[] = [
    { x: startX, y: startY, type: 'waypoint' },
    ...waypoints,
    { x: endX, y: endY, type: 'waypoint' }
  ]
  
  // SVGパス文字列を生成
  const pathString = generateSVGPath(allPoints)
  
  return {
    connectionId: connection.id,
    points: allPoints,
    pathString,
    priority: routingIndex,
    intersections: conflictingConnections
  }
}

// 迂回経由点を計算
function calculateAvoidanceWaypoints(
  start: { x: number; y: number },
  end: { x: number; y: number },
  routingIndex: number
): RoutingPoint[] {
  const waypoints: RoutingPoint[] = []
  
  // 簡単な上下迂回戦略
  const midX = (start.x + end.x) / 2
  const offsetY = (routingIndex % 2 === 0 ? -30 : 30) * Math.ceil((routingIndex + 1) / 2)
  
  // 水平方向の移動が必要な場合のみ経由点を追加
  if (Math.abs(end.x - start.x) > 50) {
    waypoints.push(
      { x: midX, y: start.y + offsetY, type: 'waypoint' },
      { x: midX, y: end.y + offsetY, type: 'waypoint' }
    )
  }
  
  return waypoints
}

// SVGパス文字列を生成
function generateSVGPath(points: RoutingPoint[]): string {
  if (points.length < 2) return ''
  
  let path = `M ${points[0].x} ${points[0].y}`
  
  for (let i = 1; i < points.length; i++) {
    if (i === points.length - 1) {
      // 最後の点への直線
      path += ` L ${points[i].x} ${points[i].y}`
    } else {
      // 滑らかな曲線（Bézier曲線）
      const current = points[i]
      const next = points[i + 1]
      const prev = points[i - 1]
      
      // 制御点を計算
      const cp1x = prev.x + (current.x - prev.x) * 0.5
      const cp2x = current.x + (next.x - current.x) * 0.5
      
      path += ` Q ${current.x} ${current.y} ${cp2x} ${current.y}`
    }
  }
  
  return path
}

// ノード位置変更時の自動再配置
export function updateRoutingOnNodeMove(
  nodeId: string,
  newPosition: { x: number; y: number },
  currentPaths: RoutingPath[],
  connections: Connection[],
  nodePositions: NodePosition[]
): RoutingPath[] {
  // 移動したノードに関連する接続を特定
  const affectedConnections = connections.filter(
    conn => conn.fromId === nodeId || conn.toId === nodeId
  )
  
  if (affectedConnections.length === 0) return currentPaths
  
  // 新しい位置情報で更新
  const updatedNodePositions = nodePositions.map(node =>
    node.id === nodeId ? { ...node, x: newPosition.x, y: newPosition.y } : node
  )
  
  // 影響を受ける接続のパスを再計算
  const updatedPaths = currentPaths.map(path => {
    const isAffected = affectedConnections.some(conn => conn.id === path.connectionId)
    
    if (isAffected) {
      const connection = connections.find(conn => conn.id === path.connectionId)
      if (connection) {
        const newPath = generateConnectionPath(connection, updatedNodePositions, path.intersections, path.priority)
        return newPath || path
      }
    }
    
    return path
  })
  
  return updatedPaths
}