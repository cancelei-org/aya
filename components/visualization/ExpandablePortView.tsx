'use client'

import React, { useState, useCallback, useMemo } from 'react'
import {
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
  Settings,
  Zap,
  Radio,
  Cpu,
  BarChart3,
  Pin,
  AlertTriangle,
  Filter,
  Search,
  Grid3X3,
  List
} from 'lucide-react'
import type {
  PortDefinition,
  PortGroup,
  DynamicPortConfiguration,
  PortCapacityStatus
} from '@/types/canvas'

export type PortViewMode = 'compact' | 'expanded' | 'detailed' | 'grid' | 'list'
export type PortFilterType = 'all' | 'power' | 'communication' | 'gpio' | 'analog' | 'connected' | 'available'

export interface ExpandablePortViewProps {
  nodeId: string
  configuration: DynamicPortConfiguration
  capacityStatuses: PortCapacityStatus[]
  onPortClick?: (portId: string, port: PortDefinition) => void
  onPortHover?: (portId: string | null) => void
  onGroupToggle?: (groupId: string, isExpanded: boolean) => void
  onViewModeChange?: (mode: PortViewMode) => void
  className?: string
  interactive?: boolean
  showSearchFilter?: boolean
  maxHeight?: number
}

export interface PortDetailModalProps {
  port: PortDefinition
  capacity?: PortCapacityStatus
  isOpen: boolean
  onClose: () => void
  onEdit?: (port: PortDefinition) => void
}

/**
 * 🔍 ExpandablePortView
 * 複雑部品向けの段階的ポート表示・管理システム
 */
export const ExpandablePortView: React.FC<ExpandablePortViewProps> = ({
  configuration,
  capacityStatuses,
  onPortClick,
  onPortHover,
  onGroupToggle,
  onViewModeChange,
  className = '',
  interactive = true,
  showSearchFilter = true,
  maxHeight = 400
}) => {
  const [viewMode, setViewMode] = useState<PortViewMode>('expanded')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [selectedPort, setSelectedPort] = useState<PortDefinition | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<PortFilterType>('all')
  const [showOnlyProblems, setShowOnlyProblems] = useState(false)

  // ポート容量状態の取得
  const getPortCapacity = useCallback((portId: string): PortCapacityStatus | undefined => {
    return capacityStatuses.find(status => status.portId === portId)
  }, [capacityStatuses])

  // フィルター済みポートグループの計算
  const filteredGroups = useMemo(() => {
    return configuration.portGroups.map(group => {
      const filteredPorts = group.ports.filter(port => {
        // 検索クエリフィルター
        if (searchQuery && !port.label.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !port.protocol?.toLowerCase().includes(searchQuery.toLowerCase())) {
          return false
        }

        // タイプフィルター
        if (activeFilter !== 'all') {
          if (activeFilter === 'connected') {
            const capacity = getPortCapacity(port.id)
            if (!capacity || capacity.used === 0) return false
          } else if (activeFilter === 'available') {
            const capacity = getPortCapacity(port.id)
            if (!capacity || capacity.status !== 'available') return false
          } else if (port.type !== activeFilter) {
            return false
          }
        }

        // 問題ありポートのみ表示
        if (showOnlyProblems) {
          const capacity = getPortCapacity(port.id)
          if (!capacity || capacity.status === 'available') return false
        }

        return true
      })

      return {
        ...group,
        ports: filteredPorts,
        visiblePortCount: filteredPorts.length,
        totalPortCount: group.ports.length
      }
    }).filter(group => group.ports.length > 0)
  }, [configuration.portGroups, searchQuery, activeFilter, showOnlyProblems, getPortCapacity])

  // 統計情報の計算
  const portStats = useMemo(() => {
    const allPorts = configuration.portGroups.flatMap(g => g.ports)
    const totalPorts = allPorts.length
    const connectedPorts = allPorts.filter(port => {
      const capacity = getPortCapacity(port.id)
      return capacity && capacity.used > 0
    }).length
    const problemPorts = allPorts.filter(port => {
      const capacity = getPortCapacity(port.id)
      return capacity && (capacity.status === 'warning' || capacity.status === 'exceeded')
    }).length

    return { totalPorts, connectedPorts, problemPorts }
  }, [configuration.portGroups, getPortCapacity])

  // ビューモードの変更
  const handleViewModeChange = useCallback((mode: PortViewMode) => {
    setViewMode(mode)
    onViewModeChange?.(mode)
  }, [onViewModeChange])

  // グループの展開/折りたたみ
  const toggleGroup = useCallback((groupId: string) => {
    const newExpanded = new Set(expandedGroups)
    const isCurrentlyExpanded = newExpanded.has(groupId)

    if (isCurrentlyExpanded) {
      newExpanded.delete(groupId)
    } else {
      newExpanded.add(groupId)
    }

    setExpandedGroups(newExpanded)
    onGroupToggle?.(groupId, !isCurrentlyExpanded)
  }, [expandedGroups, onGroupToggle])

  // ポート選択
  const handlePortClick = useCallback((port: PortDefinition) => {
    if (!interactive) return

    setSelectedPort(port)
    onPortClick?.(port.id, port)
  }, [interactive, onPortClick])

  // ポートアイコンの取得
  const getPortIcon = useCallback((port: PortDefinition) => {
    switch (port.type) {
      case 'power':
        return <Zap className="h-4 w-4" />
      case 'communication':
        return <Radio className="h-4 w-4" />
      case 'gpio':
        return <Cpu className="h-4 w-4" />
      case 'analog':
        return <BarChart3 className="h-4 w-4" />
      default:
        return <Pin className="h-4 w-4" />
    }
  }, [])

  // ポート状態色の取得
  const getPortStatusColor = useCallback((port: PortDefinition): string => {
    const capacity = getPortCapacity(port.id)

    if (capacity) {
      switch (capacity.status) {
        case 'exceeded': return 'border-red-500 bg-red-50 text-red-700'
        case 'warning': return 'border-yellow-500 bg-yellow-50 text-yellow-700'
        case 'available': return 'border-green-500 bg-green-50 text-green-700'
        default: return 'border-gray-300 bg-gray-50 text-gray-700'
      }
    }

    // デフォルト色（ポートタイプ別）
    switch (port.type) {
      case 'power': return 'border-red-300 bg-red-50 text-red-700'
      case 'communication': return 'border-blue-300 bg-blue-50 text-blue-700'
      case 'gpio': return 'border-purple-300 bg-purple-50 text-purple-700'
      case 'analog': return 'border-orange-300 bg-orange-50 text-orange-700'
      default: return 'border-gray-300 bg-gray-50 text-gray-700'
    }
  }, [getPortCapacity])

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      {/* ヘッダー */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2">
          <Pin className="h-4 w-4 text-gray-600" />
          <span className="font-medium text-sm text-gray-900">
            {configuration.componentName} Ports
          </span>
          <span className="text-xs text-gray-500">
            ({portStats.totalPorts} total, {portStats.connectedPorts} connected)
          </span>
          {portStats.problemPorts > 0 && (
            <div className="flex items-center gap-1 text-xs text-red-600">
              <AlertTriangle className="h-3 w-3" />
              {portStats.problemPorts} issues
            </div>
          )}
        </div>

        {/* ビューモード切り替え */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleViewModeChange('compact')}
            className={`p-1 rounded transition-colors ${viewMode === 'compact' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            title="Compact view"
          >
            <Minimize2 className="h-3 w-3" />
          </button>
          <button
            onClick={() => handleViewModeChange('expanded')}
            className={`p-1 rounded transition-colors ${viewMode === 'expanded' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            title="Expanded view"
          >
            <Maximize2 className="h-3 w-3" />
          </button>
          <button
            onClick={() => handleViewModeChange('grid')}
            className={`p-1 rounded transition-colors ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            title="Grid view"
          >
            <Grid3X3 className="h-3 w-3" />
          </button>
          <button
            onClick={() => handleViewModeChange('list')}
            className={`p-1 rounded transition-colors ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            title="List view"
          >
            <List className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* 検索・フィルター */}
      {showSearchFilter && (
        <div className="p-3 border-b border-gray-200 space-y-2">
          {/* 検索バー */}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search ports..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-7 pr-3 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          フィルターボタン
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              {(['all', 'power', 'communication', 'gpio', 'analog', 'connected', 'available'] as PortFilterType[]).map(filter => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${activeFilter === filter
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                >
                  {filter === 'all' ? 'All' : filter.charAt(0).toUpperCase() + filter.slice(1)}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowOnlyProblems(!showOnlyProblems)}
              className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${showOnlyProblems
                  ? 'bg-red-100 text-red-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
            >
              <Filter className="h-3 w-3" />
              Issues Only
            </button>
          </div>
        </div>
      )}

      {/* ポートグループ表示 */}
      <div className="overflow-y-auto" style={{ maxHeight }}>
        {filteredGroups.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            No ports match current filters
          </div>
        ) : (
          <div className="p-3 space-y-3">
            {filteredGroups.map(group => (
              <PortGroupDisplay
                key={group.id}
                group={group}
                isExpanded={expandedGroups.has(group.id)}
                viewMode={viewMode}
                onToggle={() => toggleGroup(group.id)}
                onPortClick={handlePortClick}
                onPortHover={onPortHover}
                getPortIcon={getPortIcon}
                getPortStatusColor={getPortStatusColor}
                getPortCapacity={getPortCapacity}
                interactive={interactive}
              />
            ))}
          </div>
        )}
      </div>

      {/* ポート詳細モーダル */}
      {selectedPort && (
        <PortDetailModal
          port={selectedPort}
          capacity={getPortCapacity(selectedPort.id)}
          isOpen={!!selectedPort}
          onClose={() => setSelectedPort(null)}
        />
      )}
    </div>
  )
}

// サブコンポーネント: ポートグループ表示
const PortGroupDisplay: React.FC<{
  group: PortGroup & { visiblePortCount: number; totalPortCount: number }
  isExpanded: boolean
  viewMode: PortViewMode
  onToggle: () => void
  onPortClick: (port: PortDefinition) => void
  onPortHover?: (portId: string | null) => void
  getPortIcon: (port: PortDefinition) => React.ReactNode
  getPortStatusColor: (port: PortDefinition) => string
  getPortCapacity: (portId: string) => PortCapacityStatus | undefined
  interactive: boolean
}> = ({
  group,
  isExpanded,
  viewMode,
  onToggle,
  onPortClick,
  onPortHover,
  getPortIcon,
  getPortStatusColor,
  getPortCapacity,
  interactive
}) => {
    const groupIcon = useMemo(() => {
      switch (group.type) {
        case 'power': return <Zap className="h-4 w-4" style={{ color: group.color }} />
        case 'communication': return <Radio className="h-4 w-4" style={{ color: group.color }} />
        case 'gpio': return <Cpu className="h-4 w-4" style={{ color: group.color }} />
        case 'analog': return <BarChart3 className="h-4 w-4" style={{ color: group.color }} />
        default: return <Settings className="h-4 w-4" style={{ color: group.color }} />
      }
    }, [group.type, group.color])

    return (
      <div className="border border-gray-200 rounded-lg">
        {/* グループヘッダー */}
        <button
          onClick={onToggle}
          disabled={!interactive}
          className="w-full p-2 flex items-center justify-between hover:bg-gray-50 transition-colors rounded-t-lg"
        >
          <div className="flex items-center gap-2">
            {groupIcon}
            <span className="text-sm font-medium">{group.name}</span>
            <span className="text-xs text-gray-500">
              ({group.visiblePortCount}/{group.totalPortCount})
            </span>
          </div>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )}
        </button>

        {/* ポート一覧 */}
        {isExpanded && (
          <div className="border-t border-gray-200 p-2">
            <PortListDisplay
              ports={group.ports}
              viewMode={viewMode}
              onPortClick={onPortClick}
              onPortHover={onPortHover}
              getPortIcon={getPortIcon}
              getPortStatusColor={getPortStatusColor}
              getPortCapacity={getPortCapacity}
              interactive={interactive}
            />
          </div>
        )}
      </div>
    )
  }

// サブコンポーネント: ポート一覧表示
const PortListDisplay: React.FC<{
  ports: PortDefinition[]
  viewMode: PortViewMode
  onPortClick: (port: PortDefinition) => void
  onPortHover?: (portId: string | null) => void
  getPortIcon: (port: PortDefinition) => React.ReactNode
  getPortStatusColor: (port: PortDefinition) => string
  getPortCapacity: (portId: string) => PortCapacityStatus | undefined
  interactive: boolean
}> = ({
  ports,
  viewMode,
  onPortClick,
  onPortHover,
  getPortIcon,
  getPortStatusColor,
  getPortCapacity,
  interactive
}) => {
    if (viewMode === 'grid') {
      return (
        <div className="grid grid-cols-3 gap-2">
          {ports.map(port => (
            <PortGridItem
              key={port.id}
              port={port}
              capacity={getPortCapacity(port.id)}
              onClick={() => onPortClick(port)}
              onHover={() => onPortHover?.(port.id)}
              onLeave={() => onPortHover?.(null)}
              icon={getPortIcon(port)}
              statusColor={getPortStatusColor(port)}
              interactive={interactive}
            />
          ))}
        </div>
      )
    }

    return (
      <div className="space-y-1">
        {ports.map(port => (
          <PortListItem
            key={port.id}
            port={port}
            capacity={getPortCapacity(port.id)}
            viewMode={viewMode}
            onClick={() => onPortClick(port)}
            onHover={() => onPortHover?.(port.id)}
            onLeave={() => onPortHover?.(null)}
            icon={getPortIcon(port)}
            statusColor={getPortStatusColor(port)}
            interactive={interactive}
          />
        ))}
      </div>
    )
  }

// サブコンポーネント: グリッドアイテム
const PortGridItem: React.FC<{
  port: PortDefinition
  capacity?: PortCapacityStatus
  onClick: () => void
  onHover: () => void
  onLeave: () => void
  icon: React.ReactNode
  statusColor: string
  interactive: boolean
}> = ({ port, capacity, onClick, onHover, onLeave, icon, statusColor, interactive }) => (
  <button
    onClick={interactive ? onClick : undefined}
    onMouseEnter={onHover}
    onMouseLeave={onLeave}
    disabled={!interactive}
    className={`p-2 rounded border text-xs transition-all hover:shadow-sm ${statusColor} ${interactive ? 'cursor-pointer' : 'cursor-default'
      }`}
  >
    <div className="flex flex-col items-center gap-1">
      {icon}
      <span className="font-medium truncate w-full">{port.label}</span>
      {capacity && (
        <span className="text-xs opacity-75">
          {capacity.used}/{capacity.available === -1 ? '∞' : capacity.available}
        </span>
      )}
    </div>
  </button>
)

// サブコンポーネント: リストアイテム
const PortListItem: React.FC<{
  port: PortDefinition
  capacity?: PortCapacityStatus
  viewMode: PortViewMode
  onClick: () => void
  onHover: () => void
  onLeave: () => void
  icon: React.ReactNode
  statusColor: string
  interactive: boolean
}> = ({ port, capacity, viewMode, onClick, onHover, onLeave, icon, statusColor, interactive }) => (
  <button
    onClick={interactive ? onClick : undefined}
    onMouseEnter={onHover}
    onMouseLeave={onLeave}
    disabled={!interactive}
    className={`w-full p-2 rounded border text-left transition-all hover:shadow-sm ${statusColor} ${interactive ? 'cursor-pointer' : 'cursor-default'
      }`}
  >
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {icon}
        <div>
          <div className="text-sm font-medium">{port.label}</div>
          {viewMode === 'detailed' && (
            <div className="text-xs opacity-75">
              {port.protocol && `${port.protocol} • `}
              {port.direction} • Pin {port.pinNumber}
              {port.voltage && ` • ${port.voltage}`}
            </div>
          )}
        </div>
      </div>

      {capacity && (
        <div className="flex items-center gap-2">
          <span className="text-xs">
            {capacity.used}/{capacity.available === -1 ? '∞' : capacity.available}
          </span>
          <div className={`w-2 h-2 rounded-full ${capacity.status === 'exceeded' ? 'bg-red-500' :
              capacity.status === 'warning' ? 'bg-yellow-500' :
                'bg-green-500'
            }`} />
        </div>
      )}
    </div>
  </button>
)

// ポート詳細モーダル
const PortDetailModal: React.FC<PortDetailModalProps> = ({
  port,
  capacity,
  isOpen,
  onClose,
  onEdit
}) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Port Details</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            ×
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Label</label>
              <p className="text-sm text-gray-900">{port.label}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Type</label>
              <p className="text-sm text-gray-900 capitalize">{port.type}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Protocol</label>
              <p className="text-sm text-gray-900">{port.protocol || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Direction</label>
              <p className="text-sm text-gray-900 capitalize">{port.direction}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Pin Number</label>
              <p className="text-sm text-gray-900">{port.pinNumber || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Voltage</label>
              <p className="text-sm text-gray-900">{port.voltage || 'N/A'}</p>
            </div>
          </div>

          {capacity && (
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Capacity Status</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500">Connections</label>
                  <p className="text-sm text-gray-900">
                    {capacity.used}/{capacity.available === -1 ? '∞' : capacity.available}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Status</label>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${capacity.status === 'exceeded' ? 'bg-red-500' :
                        capacity.status === 'warning' ? 'bg-yellow-500' :
                          'bg-green-500'
                      }`} />
                    <span className="text-sm text-gray-900 capitalize">{capacity.status}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {port.description && (
            <div className="border-t pt-4">
              <label className="text-sm font-medium text-gray-700">Description</label>
              <p className="text-sm text-gray-600 mt-1">{port.description}</p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-gray-200">
          {onEdit && (
            <button
              onClick={() => onEdit(port)}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Edit
            </button>
          )}
          <button
            onClick={onClose}
            className="px-3 py-1 text-sm bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default ExpandablePortView