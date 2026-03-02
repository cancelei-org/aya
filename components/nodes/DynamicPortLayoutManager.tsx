'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { 
  Zap, 
  Radio, 
  Settings, 
  Cpu, 
  BarChart3,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  AlertTriangle
} from 'lucide-react'
import type { 
  PortDefinition, 
  PortGroup, 
  DynamicPortConfiguration,
  PortPosition,
  PortLayoutConstraints,
  PortCapacityStatus,
  Connection
} from '@/types/canvas'
import { 
  optimizePortLayout,
  type OptimizationResult 
} from '@/utils/connections/ports/portPositionOptimizer'

export interface DynamicPortLayoutManagerProps {
  nodeId: string
  configuration: DynamicPortConfiguration
  capacityStatuses: PortCapacityStatus[]
  connections?: Connection[] // For position optimization
  nodePosition?: { x: number; y: number } // Current node position
  onConfigurationChange?: (config: DynamicPortConfiguration) => void
  onPortClick?: (portId: string, port: PortDefinition) => void
  onPortHover?: (portId: string | null) => void
  className?: string
  interactive?: boolean
  showLabels?: boolean
  showCapacityIndicators?: boolean
  enableOptimization?: boolean // Enable automatic position optimization
}

interface LayoutCalculation {
  nodeSize: { width: number; height: number }
  portPositions: { [portId: string]: { x: number; y: number; side: string } }
  groupPositions: { [groupId: string]: { x: number; y: number; width: number; height: number } }
  overflow: boolean
  warnings: string[]
  optimizationResult?: OptimizationResult // Result from position optimizer
  layoutScore?: number // Quality score from optimization
}

/**
 * 🎨 DynamicPortLayoutManager
 * ノードサイズに応じたポート配置の自動計算とレンダリング
 */
export const DynamicPortLayoutManager: React.FC<DynamicPortLayoutManagerProps> = ({
  configuration,
  capacityStatuses,
  connections = [],
  nodePosition = { x: 0, y: 0 },
  onConfigurationChange,
  onPortClick,
  onPortHover,
  className = '',
  interactive = true,
  showLabels = true,
  showCapacityIndicators = true,
  enableOptimization = true
}) => {
  const [hoveredPortId, setHoveredPortId] = useState<string | null>(null)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [layoutMode, setLayoutMode] = useState<'auto' | 'manual'>(
    configuration.autoLayout ? 'auto' : 'manual'
  )

  // レイアウト制約の定義
  const layoutConstraints: PortLayoutConstraints = useMemo(() => ({
    minPortSpacing: 24,
    maxPortsPerSide: 8,
    preferredSides: {
      power: ['top', 'bottom'],
      communication: ['left', 'right'],
      gpio: ['left', 'right', 'bottom']
    },
    groupSeparation: 12,
    nodeMinWidth: 120,
    nodeMinHeight: 80
  }), [])

  // レイアウト計算（最適化有効時は最適化アルゴリズムを使用）
  const layoutCalculation = useMemo((): LayoutCalculation => {
    if (enableOptimization && connections.length > 0 && configuration.autoLayout) {
      // 最適化アルゴリズムを使用
      const optimizationResult = optimizePortLayout(
        configuration,
        connections,
        layoutConstraints,
        nodePosition
      )

      // 最適化結果を標準形式に変換
      const convertedPositions = convertOptimizedPositions(
        optimizationResult.optimizedPositions,
        optimizationResult.nodeSize
      )

      return {
        nodeSize: optimizationResult.nodeSize,
        portPositions: convertedPositions,
        groupPositions: {}, // TODO: Calculate group positions
        overflow: optimizationResult.warnings.some(w => w.includes('overcrowded')),
        warnings: optimizationResult.warnings,
        optimizationResult,
        layoutScore: optimizationResult.layoutScore
      }
    } else {
      // 従来のレイアウト計算を使用
      return calculateOptimalLayout(configuration, layoutConstraints, expandedGroups)
    }
  }, [configuration, layoutConstraints, expandedGroups, enableOptimization, connections, nodePosition])

  // 初期化時に折りたたみ状態を設定
  useEffect(() => {
    const initialExpanded = new Set<string>()
    configuration.portGroups.forEach(group => {
      if (!group.isCollapsed) {
        initialExpanded.add(group.id)
      }
    })
    setExpandedGroups(initialExpanded)
  }, [configuration])

  // グループの展開/折りたたみ
  const toggleGroupExpansion = useCallback((groupId: string) => {
    if (!interactive) return

    const newExpanded = new Set(expandedGroups)
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId)
    } else {
      newExpanded.add(groupId)
    }
    setExpandedGroups(newExpanded)

    // 設定を更新
    if (onConfigurationChange) {
      const updatedGroups = configuration.portGroups.map(group => ({
        ...group,
        isCollapsed: !newExpanded.has(group.id)
      }))
      onConfigurationChange({
        ...configuration,
        portGroups: updatedGroups,
        lastUpdated: new Date().toISOString()
      })
    }
  }, [expandedGroups, interactive, onConfigurationChange, configuration])

  // ポートクリックハンドラー
  const handlePortClick = useCallback((port: PortDefinition) => {
    if (interactive && onPortClick) {
      onPortClick(port.id, port)
    }
  }, [interactive, onPortClick])

  // ポートホバーハンドラー
  const handlePortHover = useCallback((portId: string | null) => {
    setHoveredPortId(portId)
    if (onPortHover) {
      onPortHover(portId)
    }
  }, [onPortHover])

  // レイアウトモードの切り替え
  const toggleLayoutMode = useCallback(() => {
    const newMode = layoutMode === 'auto' ? 'manual' : 'auto'
    setLayoutMode(newMode)
    
    if (onConfigurationChange) {
      onConfigurationChange({
        ...configuration,
        autoLayout: newMode === 'auto',
        lastUpdated: new Date().toISOString()
      })
    }
  }, [layoutMode, onConfigurationChange, configuration])

  // ポート容量状態の取得
  const getPortCapacityStatus = useCallback((portId: string): PortCapacityStatus | undefined => {
    return capacityStatuses.find(status => status.portId === portId)
  }, [capacityStatuses])

  // ポートアイコンの取得
  const getPortIcon = useCallback((port: PortDefinition) => {
    switch (port.type) {
      case 'power':
        return <Zap className="h-3 w-3" />
      case 'communication':
        if (port.protocol === 'I2C' || port.protocol === 'SPI' || port.protocol === 'UART') {
          return <Radio className="h-3 w-3" />
        }
        return <Cpu className="h-3 w-3" />
      default:
        return <Settings className="h-3 w-3" />
    }
  }, [])

  // ポート色の取得
  const getPortColor = useCallback((port: PortDefinition): string => {
    const capacity = getPortCapacityStatus(port.id)
    
    if (capacity) {
      switch (capacity.status) {
        case 'exceeded': return 'border-red-500 bg-red-100'
        case 'warning': return 'border-yellow-500 bg-yellow-100'
        case 'available': return 'border-green-500 bg-green-100'
        default: return 'border-gray-300 bg-gray-100'
      }
    }

    // デフォルト色（ポートタイプ別）
    switch (port.type) {
      case 'power': return 'border-red-300 bg-red-50'
      case 'communication': return 'border-blue-300 bg-blue-50'
      default: return 'border-gray-300 bg-gray-50'
    }
  }, [getPortCapacityStatus])

  // グループアイコンの取得
  const getGroupIcon = useCallback((group: PortGroup) => {
    switch (group.type) {
      case 'power': return <Zap className="h-4 w-4" style={{ color: group.color }} />
      case 'communication': return <Radio className="h-4 w-4" style={{ color: group.color }} />
      case 'gpio': return <Cpu className="h-4 w-4" style={{ color: group.color }} />
      case 'analog': return <BarChart3 className="h-4 w-4" style={{ color: group.color }} />
      default: return <Settings className="h-4 w-4" style={{ color: group.color }} />
    }
  }, [])

  return (
    <div 
      className={`relative ${className}`}
      style={{
        width: layoutCalculation.nodeSize.width,
        height: layoutCalculation.nodeSize.height,
        minWidth: layoutConstraints.nodeMinWidth,
        minHeight: layoutConstraints.nodeMinHeight
      }}
    >
      {/* メインノード背景 */}
      <div className="absolute inset-0 bg-white border-2 border-gray-300 rounded-lg shadow-sm">
        {/* ノードヘッダー */}
        <div className="flex items-center justify-between p-2 border-b border-gray-200 bg-gray-50 rounded-t-lg">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm text-gray-900">
              {configuration.componentName}
            </span>
            <span className="text-xs text-gray-500">
              ({configuration.totalPins} pins)
            </span>
            {/* 最適化スコア表示 */}
            {layoutCalculation.layoutScore && (
              <div className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${
                  layoutCalculation.layoutScore >= 80 ? 'bg-green-500' :
                  layoutCalculation.layoutScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                }`} />
                <span className="text-xs text-gray-500">
                  {layoutCalculation.layoutScore}%
                </span>
              </div>
            )}
          </div>
          
          {interactive && (
            <div className="flex items-center gap-1">
              {/* 最適化情報表示 */}
              {layoutCalculation.optimizationResult && (
                <div className="text-xs text-gray-500 mr-2" title="Optimization enabled">
                  <span>⚡ {Math.round(layoutCalculation.optimizationResult.optimizationTime)}ms</span>
                </div>
              )}
              <button
                onClick={toggleLayoutMode}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                title={`Switch to ${layoutMode === 'auto' ? 'manual' : 'auto'} layout`}
              >
                {layoutMode === 'auto' ? (
                  <RotateCcw className="h-3 w-3" />
                ) : (
                  <Settings className="h-3 w-3" />
                )}
              </button>
            </div>
          )}
        </div>

        {/* レイアウト警告 */}
        {layoutCalculation.warnings.length > 0 && (
          <div className="absolute top-12 left-2 right-2 z-10">
            <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
              <div className="flex items-center gap-1 text-yellow-800 text-xs">
                <AlertTriangle className="h-3 w-3" />
                Layout Issues
              </div>
              <ul className="text-xs text-yellow-700 mt-1">
                {layoutCalculation.warnings.slice(0, 2).map((warning, index) => (
                  <li key={index}>• {warning}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* コンパクトモード: グループ別表示 */}
      {configuration.layoutMode === 'compact' && (
        <div className="absolute inset-4 top-12">
          <div className="grid grid-cols-2 gap-2 h-full">
            {configuration.portGroups
              .sort((a, b) => a.priority - b.priority)
              .map(group => (
                <GroupCompactDisplay
                  key={group.id}
                  group={group}
                  isExpanded={expandedGroups.has(group.id)}
                  onToggle={() => toggleGroupExpansion(group.id)}
                  onPortClick={handlePortClick}
                  onPortHover={handlePortHover}
                  getPortIcon={getPortIcon}
                  getPortColor={getPortColor}
                  getGroupIcon={getGroupIcon}
                  interactive={interactive}
                  showLabels={showLabels}
                  hoveredPortId={hoveredPortId}
                />
              ))}
          </div>
        </div>
      )}

      {/* 展開モード: 実際のポート配置 */}
      {configuration.layoutMode === 'expanded' && (
        <>
          {configuration.portGroups.map(group => 
            group.ports.map(port => {
              const position = layoutCalculation.portPositions[port.id]
              if (!position) return null

              return (
                <PortVisualElement
                  key={port.id}
                  port={port}
                  position={position}
                  capacity={getPortCapacityStatus(port.id)}
                  isHovered={hoveredPortId === port.id}
                  onClick={() => handlePortClick(port)}
                  onHover={() => handlePortHover(port.id)}
                  onLeave={() => handlePortHover(null)}
                  icon={getPortIcon(port)}
                  colorClass={getPortColor(port)}
                  interactive={interactive}
                  showLabel={showLabels}
                  showCapacityIndicator={showCapacityIndicators}
                />
              )
            })
          )}
        </>
      )}

      {/* 詳細モード: 全情報表示 */}
      {configuration.layoutMode === 'detailed' && (
        <div className="absolute inset-4 top-12 overflow-y-auto">
          <div className="space-y-3">
            {configuration.portGroups
              .sort((a, b) => a.priority - b.priority)
              .map(group => (
                <GroupDetailedDisplay
                  key={group.id}
                  group={group}
                  isExpanded={expandedGroups.has(group.id)}
                  onToggle={() => toggleGroupExpansion(group.id)}
                  onPortClick={handlePortClick}
                  onPortHover={handlePortHover}
                  getPortIcon={getPortIcon}
                  getPortColor={getPortColor}
                  getGroupIcon={getGroupIcon}
                  getPortCapacityStatus={getPortCapacityStatus}
                  interactive={interactive}
                  showLabels={showLabels}
                  showCapacityIndicators={showCapacityIndicators}
                  hoveredPortId={hoveredPortId}
                />
              ))}
          </div>
        </div>
      )}

      {/* ポートツールチップ */}
      {hoveredPortId && (
        <PortTooltip
          portId={hoveredPortId}
          port={configuration.portGroups
            .flatMap(g => g.ports)
            .find(p => p.id === hoveredPortId)}
          capacity={getPortCapacityStatus(hoveredPortId)}
          position={layoutCalculation.portPositions[hoveredPortId]}
        />
      )}
    </div>
  )
}

// サブコンポーネント: コンパクトグループ表示
const GroupCompactDisplay: React.FC<{
  group: PortGroup
  isExpanded: boolean
  onToggle: () => void
  onPortClick: (port: PortDefinition) => void
  onPortHover: (portId: string) => void
  getPortIcon: (port: PortDefinition) => React.ReactNode
  getPortColor: (port: PortDefinition) => string
  getGroupIcon: (group: PortGroup) => React.ReactNode
  interactive: boolean
  showLabels: boolean
  hoveredPortId: string | null
}> = ({
  group,
  isExpanded,
  onToggle,
  onPortClick,
  onPortHover,
  getPortIcon,
  getPortColor,
  getGroupIcon,
  interactive,
  showLabels,
  hoveredPortId
}) => (
  <div className="border border-gray-200 rounded bg-gray-50">
    <button
      onClick={onToggle}
      disabled={!interactive}
      className="w-full p-2 flex items-center justify-between hover:bg-gray-100 transition-colors"
    >
      <div className="flex items-center gap-2">
        {getGroupIcon(group)}
        <span className="text-xs font-medium">{group.name}</span>
        <span className="text-xs text-gray-500">({group.ports.length})</span>
      </div>
      {isExpanded ? (
        <ChevronUp className="h-3 w-3 text-gray-400" />
      ) : (
        <ChevronDown className="h-3 w-3 text-gray-400" />
      )}
    </button>
    
    {isExpanded && (
      <div className="p-2 border-t border-gray-200 max-h-24 overflow-y-auto">
        <div className="grid grid-cols-2 gap-1">
          {group.ports.map(port => (
            <button
              key={port.id}
              onClick={() => onPortClick(port)}
              onMouseEnter={() => onPortHover(port.id)}
              disabled={!interactive}
              className={`p-1 text-xs rounded border transition-colors ${getPortColor(port)} ${
                hoveredPortId === port.id ? 'ring-2 ring-blue-300' : ''
              }`}
            >
              <div className="flex items-center gap-1">
                {getPortIcon(port)}
                {showLabels && (
                  <span className="truncate">{port.label}</span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    )}
  </div>
)

// サブコンポーネント: 詳細グループ表示
const GroupDetailedDisplay: React.FC<{
  group: PortGroup
  isExpanded: boolean
  onToggle: () => void
  onPortClick: (port: PortDefinition) => void
  onPortHover: (portId: string) => void
  getPortIcon: (port: PortDefinition) => React.ReactNode
  getPortColor: (port: PortDefinition) => string
  getGroupIcon: (group: PortGroup) => React.ReactNode
  getPortCapacityStatus: (portId: string) => PortCapacityStatus | undefined
  interactive: boolean
  showLabels: boolean
  showCapacityIndicators: boolean
  hoveredPortId: string | null
}> = ({
  group,
  isExpanded,
  onToggle,
  onPortClick,
  onPortHover,
  getPortIcon,
  getPortColor,
  getGroupIcon,
  getPortCapacityStatus,
  interactive,
  showLabels,
  showCapacityIndicators,
  hoveredPortId
}) => (
  <div className="border border-gray-200 rounded bg-white">
    <button
      onClick={onToggle}
      disabled={!interactive}
      className="w-full p-2 flex items-center justify-between hover:bg-gray-50 transition-colors"
    >
      <div className="flex items-center gap-2">
        {getGroupIcon(group)}
        <span className="text-sm font-medium">{group.name}</span>
        <span className="text-xs text-gray-500">({group.ports.length} ports)</span>
      </div>
      {isExpanded ? (
        <ChevronUp className="h-4 w-4 text-gray-400" />
      ) : (
        <ChevronDown className="h-4 w-4 text-gray-400" />
      )}
    </button>
    
    {isExpanded && (
      <div className="border-t border-gray-200">
        {group.ports.map(port => {
          const capacity = getPortCapacityStatus(port.id)
          return (
            <button
              key={port.id}
              onClick={() => onPortClick(port)}
              onMouseEnter={() => onPortHover(port.id)}
              disabled={!interactive}
              className={`w-full p-2 flex items-center justify-between hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                hoveredPortId === port.id ? 'bg-blue-50' : ''
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`p-1 rounded ${getPortColor(port)}`}>
                  {getPortIcon(port)}
                </div>
                <div className="text-left">
                  {showLabels && (
                    <div className="text-sm font-medium">{port.label}</div>
                  )}
                  <div className="text-xs text-gray-500">
                    {port.protocol && `${port.protocol} • `}
                    {port.direction} • {port.maxConnections === -1 ? '∞' : port.maxConnections} max
                  </div>
                </div>
              </div>
              
              {showCapacityIndicators && capacity && (
                <div className="flex items-center gap-2">
                  <div className="text-xs text-gray-600">
                    {capacity.used}/{capacity.available === -1 ? '∞' : capacity.available}
                  </div>
                  <div className={`w-2 h-2 rounded-full ${
                    capacity.status === 'exceeded' ? 'bg-red-500' :
                    capacity.status === 'warning' ? 'bg-yellow-500' :
                    'bg-green-500'
                  }`} />
                </div>
              )}
            </button>
          )
        })}
      </div>
    )}
  </div>
)

// サブコンポーネント: ポート視覚要素
const PortVisualElement: React.FC<{
  port: PortDefinition
  position: { x: number; y: number; side: string }
  capacity?: PortCapacityStatus
  isHovered: boolean
  onClick: () => void
  onHover: () => void
  onLeave: () => void
  icon: React.ReactNode
  colorClass: string
  interactive: boolean
  showLabel: boolean
  showCapacityIndicator: boolean
}> = ({
  port,
  position,
  capacity,
  isHovered,
  onClick,
  onHover,
  onLeave,
  icon,
  colorClass,
  interactive,
  showLabel,
  showCapacityIndicator
}) => (
  <div
    className={`absolute transform transition-all duration-200 ${
      isHovered ? 'scale-110 z-10' : 'z-0'
    }`}
    style={{
      left: position.x - 8,
      top: position.y - 8,
      transform: isHovered ? 'scale(1.1)' : 'scale(1)'
    }}
  >
    <button
      onClick={interactive ? onClick : undefined}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      disabled={!interactive}
      className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${colorClass} ${
        interactive ? 'hover:shadow-md cursor-pointer' : 'cursor-default'
      } ${isHovered ? 'ring-2 ring-blue-300' : ''}`}
    >
      {icon}
    </button>
    
    {showLabel && (
      <div 
        className={`absolute text-xs font-medium whitespace-nowrap ${
          position.side === 'left' ? 'right-full mr-2' :
          position.side === 'right' ? 'left-full ml-2' :
          position.side === 'top' ? 'bottom-full mb-2 left-1/2 transform -translate-x-1/2' :
          'top-full mt-2 left-1/2 transform -translate-x-1/2'
        }`}
      >
        {port.label}
      </div>
    )}
    
    {showCapacityIndicator && capacity && capacity.status !== 'available' && (
      <div className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${
        capacity.status === 'exceeded' ? 'bg-red-500' :
        capacity.status === 'warning' ? 'bg-yellow-500' :
        'bg-blue-500'
      }`} />
    )}
  </div>
)

// サブコンポーネント: ポートツールチップ
const PortTooltip: React.FC<{
  portId: string
  port?: PortDefinition
  capacity?: PortCapacityStatus
  position: { x: number; y: number; side: string }
}> = ({ port, capacity, position }) => {
  if (!port) return null

  return (
    <div
      className="absolute z-20 bg-gray-900 text-white text-xs rounded px-2 py-1 pointer-events-none"
      style={{
        left: position.x + (position.side === 'right' ? 20 : -80),
        top: position.y - 20
      }}
    >
      <div className="font-medium">{port.label}</div>
      <div className="text-gray-300">
        {port.protocol} • {port.direction}
        {port.voltage && ` • ${port.voltage}`}
      </div>
      {capacity && (
        <div className="text-gray-300">
          Connections: {capacity.used}/{capacity.available === -1 ? '∞' : capacity.available}
        </div>
      )}
      {port.description && (
        <div className="text-gray-400 max-w-48 mt-1">{port.description}</div>
      )}
    </div>
  )
}

// ヘルパー関数: 最適レイアウト計算
function calculateOptimalLayout(
  config: DynamicPortConfiguration,
  constraints: PortLayoutConstraints,
  expandedGroups: Set<string>
): LayoutCalculation {
  const warnings: string[] = []
  const portPositions: { [portId: string]: { x: number; y: number; side: string } } = {}
  const groupPositions: { [groupId: string]: { x: number; y: number; width: number; height: number } } = {}

  // 基本ノードサイズの計算
  const totalPorts = config.portGroups.reduce((sum, group) => sum + group.ports.length, 0)
  const estimatedWidth = Math.max(
    constraints.nodeMinWidth,
    Math.ceil(Math.sqrt(totalPorts)) * constraints.minPortSpacing + 40
  )
  const estimatedHeight = Math.max(
    constraints.nodeMinHeight,
    Math.ceil(totalPorts / 4) * constraints.minPortSpacing + 60
  )

  // サイド別ポート配置
  // const sides = ['top', 'right', 'bottom', 'left'] as const
  const sidePortCounts = { top: 0, right: 0, bottom: 0, left: 0 }

  config.portGroups.forEach(group => {
    if (!expandedGroups.has(group.id)) return

    group.ports.forEach((port) => {
      const preferredSides = constraints.preferredSides[group.type] || ['left']
      const targetSide = preferredSides[0] as keyof typeof sidePortCounts

      // サイドの容量チェック
      if (sidePortCounts[targetSide] >= constraints.maxPortsPerSide) {
        warnings.push(`Too many ports on ${targetSide} side`)
      }

      // ポート位置の計算
      const sideIndex = sidePortCounts[targetSide]
      let position: { x: number; y: number; side: string }

      switch (targetSide) {
        case 'top':
          position = {
            x: 20 + sideIndex * constraints.minPortSpacing,
            y: 0,
            side: 'top'
          }
          break
        case 'right':
          position = {
            x: estimatedWidth,
            y: 30 + sideIndex * constraints.minPortSpacing,
            side: 'right'
          }
          break
        case 'bottom':
          position = {
            x: 20 + sideIndex * constraints.minPortSpacing,
            y: estimatedHeight,
            side: 'bottom'
          }
          break
        case 'left':
        default:
          position = {
            x: 0,
            y: 30 + sideIndex * constraints.minPortSpacing,
            side: 'left'
          }
          break
      }

      portPositions[port.id] = position
      sidePortCounts[targetSide]++
    })
  })

  // オーバーフロー検出
  const overflow = Object.values(sidePortCounts).some(count => count > constraints.maxPortsPerSide)

  return {
    nodeSize: { width: estimatedWidth, height: estimatedHeight },
    portPositions,
    groupPositions,
    overflow,
    warnings
  }
}

// ヘルパー関数: 最適化結果の位置変換
function convertOptimizedPositions(
  optimizedPositions: { [portId: string]: PortPosition },
  nodeSize: { width: number; height: number }
): { [portId: string]: { x: number; y: number; side: string } } {
  const convertedPositions: { [portId: string]: { x: number; y: number; side: string } } = {}

  Object.entries(optimizedPositions).forEach(([portId, position]) => {
    let x: number, y: number

    switch (position.side) {
      case 'top':
        x = 20 + position.index * 24 + (position.offset || 0)
        y = 0
        break
      case 'right':
        x = nodeSize.width
        y = 30 + position.index * 24 + (position.offset || 0)
        break
      case 'bottom':
        x = 20 + position.index * 24 + (position.offset || 0)
        y = nodeSize.height
        break
      case 'left':
      default:
        x = 0
        y = 30 + position.index * 24 + (position.offset || 0)
        break
    }

    convertedPositions[portId] = { x, y, side: position.side }
  })

  return convertedPositions
}

export default DynamicPortLayoutManager