'use client'

import React from 'react'
// import { Position } from '@xyflow/react'
import type { Connection } from '@/types'

// 分岐接続の視覚化設定
interface BranchConnectionConfig {
  sourceNodeId: string
  sourcePort: string
  connections: Connection[]
  position: { x: number; y: number }
  branchType: 'power' | 'signal' | 'data'
}

// 分岐点の視覚的表示タイプ
interface BranchPointProps {
  x: number
  y: number
  branchType: 'power' | 'signal' | 'data'
  connectionCount: number
  label?: string
}

// 分岐点コンポーネント
function BranchPoint({ x, y, branchType, connectionCount, label }: BranchPointProps) {
  // 分岐タイプ別の色とスタイル
  const getBranchStyle = () => {
    switch (branchType) {
      case 'power':
        return {
          fill: '#ef4444', // 赤系（電力用）
          stroke: '#dc2626',
          strokeWidth: 2,
          radius: 6
        }
      case 'signal':
        return {
          fill: '#3b82f6', // 青系（信号用）
          stroke: '#2563eb',
          strokeWidth: 1.5,
          radius: 4
        }
      case 'data':
        return {
          fill: '#10b981', // 緑系（データ用）
          stroke: '#059669',
          strokeWidth: 1.5,
          radius: 4
        }
      default:
        return {
          fill: '#6b7280', // グレー（汎用）
          stroke: '#4b5563',
          strokeWidth: 1,
          radius: 3
        }
    }
  }

  const style = getBranchStyle()

  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* 分岐点のメイン円 */}
      <circle
        cx={0}
        cy={0}
        r={style.radius}
        fill={style.fill}
        stroke={style.stroke}
        strokeWidth={style.strokeWidth}
      />
      
      {/* 接続数表示（3以上の場合） */}
      {connectionCount >= 3 && (
        <text
          x={0}
          y={0}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={8}
          fill="white"
          fontWeight="bold"
        >
          {connectionCount}
        </text>
      )}
      
      {/* ラベル表示 */}
      {label && (
        <text
          x={0}
          y={style.radius + 12}
          textAnchor="middle"
          fontSize={9}
          fill={style.stroke}
          fontWeight="medium"
        >
          {label}
        </text>
      )}
    </g>
  )
}

// 分岐接続のパス計算
function calculateBranchPaths(config: BranchConnectionConfig): Array<{
  path: string
  targetId: string
  color: string
  strokeWidth: number
}> {
  const { position, connections, branchType } = config
  const branchX = position.x
  const branchY = position.y
  
  return connections.map((conn, index) => {
    // 各接続先への角度を計算（均等分散）
    const angleStep = (2 * Math.PI) / connections.length
    const angle = index * angleStep - Math.PI / 2 // 上から開始
    
    // 分岐点から接続先への直線パス
    const targetX = branchX + Math.cos(angle) * 50 // 50px先の仮想点
    const targetY = branchY + Math.sin(angle) * 50
    
    // SVGパス文字列を生成
    const path = `M ${branchX} ${branchY} L ${targetX} ${targetY}`
    
    // 分岐タイプ別の色と太さ
    const getConnectionStyle = () => {
      switch (branchType) {
        case 'power':
          return { color: '#ef4444', strokeWidth: 3 }
        case 'signal':
          return { color: '#3b82f6', strokeWidth: 2 }
        case 'data':
          return { color: '#10b981', strokeWidth: 2 }
        default:
          return { color: '#6b7280', strokeWidth: 1.5 }
      }
    }
    
    const style = getConnectionStyle()
    
    return {
      path,
      targetId: conn.toId,
      color: style.color,
      strokeWidth: style.strokeWidth
    }
  })
}

// 分岐接続レンダリングコンポーネント
interface BranchConnectionRendererProps {
  config: BranchConnectionConfig
  selected?: boolean
  onConnectionSelect?: (connectionId: string) => void
}

export function BranchConnectionRenderer({ 
  config, 
  selected = false,
  onConnectionSelect 
}: BranchConnectionRendererProps) {
  const branchPaths = calculateBranchPaths(config)
  
  return (
    <g className="branch-connection-group">
      {/* 分岐接続パスの描画 */}
      {branchPaths.map((pathData, index) => (
        <path
          key={`branch-${config.sourceNodeId}-${index}`}
          d={pathData.path}
          stroke={pathData.color}
          strokeWidth={pathData.strokeWidth}
          fill="none"
          strokeLinecap="round"
          style={{
            filter: selected ? `drop-shadow(0 0 4px ${pathData.color})` : 'none',
            cursor: 'pointer'
          }}
          onClick={() => onConnectionSelect?.(config.connections[index].id)}
        />
      ))}
      
      {/* 分岐点の描画 */}
      <BranchPoint
        x={config.position.x}
        y={config.position.y}
        branchType={config.branchType}
        connectionCount={config.connections.length}
        label={`${config.sourcePort}`}
      />
    </g>
  )
}

// メインの分岐接続視覚化コンポーネント
interface MultiConnectionVisualizerProps {
  connections: Connection[]
  nodes: Array<{ id: string; position: { x: number; y: number } }>
  onConnectionSelect?: (connectionId: string) => void
  selectedConnectionIds?: string[]
}

export default function MultiConnectionVisualizer({
  connections,
  nodes,
  onConnectionSelect,
  selectedConnectionIds = []
}: MultiConnectionVisualizerProps) {
  // 分岐接続の検出と分類
  const branchConfigs = React.useMemo(() => {
    const sourcePortGroups: { [key: string]: Connection[] } = {}
    
    // 同じソースポートからの接続をグループ化
    connections.forEach(conn => {
      const key = `${conn.fromId}-${conn.fromPort}`
      if (!sourcePortGroups[key]) {
        sourcePortGroups[key] = []
      }
      sourcePortGroups[key].push(conn)
    })
    
    // 2つ以上の接続がある場合のみ分岐接続として処理
    const configs: BranchConnectionConfig[] = []
    
    Object.entries(sourcePortGroups).forEach(([key, conns]) => {
      if (conns.length >= 2) {
        const [nodeId, port] = key.split('-')
        const sourceNode = nodes.find(n => n.id === nodeId)
        
        if (sourceNode) {
          // 分岐タイプの自動判定
          const branchType = determineBranchType(port, conns)
          
          configs.push({
            sourceNodeId: nodeId,
            sourcePort: port,
            connections: conns,
            position: {
              x: sourceNode.position.x + 120, // ノード右端から少し離した位置
              y: sourceNode.position.y + 60   // ノード中央
            },
            branchType
          })
        }
      }
    })
    
    return configs
  }, [connections, nodes])
  
  // 分岐接続が存在しない場合は何も表示しない
  if (branchConfigs.length === 0) {
    return null
  }
  
  return (
    <svg
      className="multi-connection-visualizer"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1000
      }}
    >
      {branchConfigs.map((config, index) => (
        <BranchConnectionRenderer
          key={`branch-config-${index}`}
          config={config}
          selected={config.connections.some(conn => 
            selectedConnectionIds.includes(conn.id)
          )}
          onConnectionSelect={onConnectionSelect}
        />
      ))}
    </svg>
  )
}

// ポート名から分岐タイプを判定
function determineBranchType(portName: string): 'power' | 'signal' | 'data' {
  const port = portName.toLowerCase()
  
  // 電力関連ポート
  if (port.includes('vcc') || port.includes('gnd') || port.includes('power') || port.includes('5v') || port.includes('3v3')) {
    return 'power'
  }
  
  // 通信・信号関連ポート
  if (port.includes('sda') || port.includes('scl') || port.includes('tx') || port.includes('rx') || 
      port.includes('spi') || port.includes('mosi') || port.includes('miso')) {
    return 'signal'
  }
  
  // データ関連
  if (port.includes('data') || port.includes('analog') || port.includes('digital')) {
    return 'data'
  }
  
  // デフォルトは信号タイプ
  return 'signal'
}