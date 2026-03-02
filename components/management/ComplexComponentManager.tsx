'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { 
  Maximize2,
  Minimize2,
  Eye,
  EyeOff,
  Settings,
  Layers,
  Pin,
  Zap,
  Radio,
  Cpu,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Bookmark,
  BookmarkCheck
} from 'lucide-react'
import type { 
  ComplexComponentState,
  DynamicPortConfiguration,
  PortDefinition,
  PortCapacityStatus,
  Connection
} from '@/types/canvas'
import { ExpandablePortView, type PortViewMode } from './ExpandablePortView'
import { DynamicPortLayoutManager } from './nodes/DynamicPortLayoutManager'

export type ComponentDisplayMode = 'compact' | 'expanded' | 'detailed' | 'custom'

export interface ComplexComponentManagerProps {
  nodeId: string
  componentName: string
  configuration: DynamicPortConfiguration
  connections: Connection[]
  capacityStatuses: PortCapacityStatus[]
  nodePosition?: { x: number; y: number }
  onConfigurationChange?: (config: DynamicPortConfiguration) => void
  onStateChange?: (state: ComplexComponentState) => void
  onPortClick?: (portId: string, port: PortDefinition) => void
  onPortHover?: (portId: string | null) => void
  className?: string
  interactive?: boolean
  enableOptimization?: boolean
}

export interface ComponentPreset {
  id: string
  name: string
  description: string
  displayMode: ComponentDisplayMode
  visibleGroups: string[]
  collapsedGroups: string[]
  userPreferences: {
    favoriteGroups: string[]
    hiddenPorts: string[]
    preferredDisplayMode: string
  }
  customLayout?: any
}

/**
 * 🔧 ComplexComponentManager
 * 複雑部品（Teensy 4.1級）の表示モード管理とポートグループ可視性制御
 */
export const ComplexComponentManager: React.FC<ComplexComponentManagerProps> = ({
  nodeId,
  componentName,
  configuration,
  connections,
  capacityStatuses,
  nodePosition = { x: 0, y: 0 },
  onConfigurationChange,
  onStateChange,
  onPortClick,
  onPortHover,
  className = '',
  interactive = true,
  enableOptimization = true
}) => {
  const [componentState, setComponentState] = useState<ComplexComponentState>({
    nodeId,
    displayMode: 'expanded',
    visibleGroups: configuration.portGroups.map(g => g.id),
    collapsedGroups: [],
    userPreferences: {
      preferredDisplayMode: 'expanded',
      favoriteGroups: [],
      hiddenPorts: []
    }
  })

  // const [portViewMode] = useState<PortViewMode>('expanded')
  const [showPortList, setShowPortList] = useState(true)
  const [savedPresets, setSavedPresets] = useState<ComponentPreset[]>([])
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null)

  // 表示中のポートグループのフィルタリング
  const visiblePortGroups = useMemo(() => {
    return configuration.portGroups.filter(group => 
      componentState.visibleGroups.includes(group.id)
    )
  }, [configuration.portGroups, componentState.visibleGroups])

  // 折りたたまれたグループを除いたポートグループ
  const expandedPortGroups = useMemo(() => {
    return visiblePortGroups.map(group => ({
      ...group,
      isCollapsed: componentState.collapsedGroups.includes(group.id)
    }))
  }, [visiblePortGroups, componentState.collapsedGroups])

  // フィルタリングされた設定
  const filteredConfiguration = useMemo((): DynamicPortConfiguration => ({
    ...configuration,
    portGroups: expandedPortGroups
  }), [configuration, expandedPortGroups])

  // 統計情報の計算
  const componentStats = useMemo(() => {
    const totalPorts = configuration.portGroups.reduce((sum, group) => sum + group.ports.length, 0)
    const visiblePorts = visiblePortGroups.reduce((sum, group) => sum + group.ports.length, 0)
    const connectedPorts = configuration.portGroups
      .flatMap(g => g.ports)
      .filter(port => {
        const capacity = capacityStatuses.find(c => c.portId === port.id)
        return capacity && capacity.used > 0
      }).length

    const groupStats = configuration.portGroups.map(group => ({
      id: group.id,
      name: group.name,
      type: group.type,
      totalPorts: group.ports.length,
      connectedPorts: group.ports.filter(port => {
        const capacity = capacityStatuses.find(c => c.portId === port.id)
        return capacity && capacity.used > 0
      }).length,
      isVisible: componentState.visibleGroups.includes(group.id),
      isCollapsed: componentState.collapsedGroups.includes(group.id),
      isFavorite: componentState.userPreferences?.favoriteGroups.includes(group.id) || false
    }))

    return { totalPorts, visiblePorts, connectedPorts, groupStats }
  }, [configuration.portGroups, visiblePortGroups, capacityStatuses, componentState])

  // 表示モードの変更
  const handleDisplayModeChange = useCallback((mode: ComponentDisplayMode) => {
    const newState: ComplexComponentState = {
      ...componentState,
      displayMode: mode,
      userPreferences: {
        ...componentState.userPreferences,
        preferredDisplayMode: mode
      }
    }

    setComponentState(newState)
    onStateChange?.(newState)
  }, [componentState, onStateChange])

  // グループ可視性の切り替え
  const toggleGroupVisibility = useCallback((groupId: string) => {
    const newVisibleGroups = componentState.visibleGroups.includes(groupId)
      ? componentState.visibleGroups.filter(id => id !== groupId)
      : [...componentState.visibleGroups, groupId]

    const newState: ComplexComponentState = {
      ...componentState,
      visibleGroups: newVisibleGroups
    }

    setComponentState(newState)
    onStateChange?.(newState)
  }, [componentState, onStateChange])

  // グループ折りたたみの切り替え
  const toggleGroupCollapse = useCallback((groupId: string) => {
    const newCollapsedGroups = componentState.collapsedGroups.includes(groupId)
      ? componentState.collapsedGroups.filter(id => id !== groupId)
      : [...componentState.collapsedGroups, groupId]

    const newState: ComplexComponentState = {
      ...componentState,
      collapsedGroups: newCollapsedGroups
    }

    setComponentState(newState)
    onStateChange?.(newState)
  }, [componentState, onStateChange])

  // お気に入りグループの切り替え
  const toggleFavoriteGroup = useCallback((groupId: string) => {
    const currentFavorites = componentState.userPreferences?.favoriteGroups || []
    const newFavorites = currentFavorites.includes(groupId)
      ? currentFavorites.filter(id => id !== groupId)
      : [...currentFavorites, groupId]

    const newState: ComplexComponentState = {
      ...componentState,
      userPreferences: {
        ...componentState.userPreferences,
        favoriteGroups: newFavorites
      }
    }

    setComponentState(newState)
    onStateChange?.(newState)
  }, [componentState, onStateChange])

  // プリセットの保存
  const saveCurrentPreset = useCallback((name: string, description: string) => {
    const preset: ComponentPreset = {
      id: `preset_${Date.now()}`,
      name,
      description,
      displayMode: componentState.displayMode,
      visibleGroups: componentState.visibleGroups,
      collapsedGroups: componentState.collapsedGroups,
      userPreferences: componentState.userPreferences || {
        favoriteGroups: [],
        hiddenPorts: [],
        preferredDisplayMode: 'expanded'
      }
    }

    setSavedPresets(prev => [...prev, preset])
  }, [componentState])

  // プリセットの適用
  const applyPreset = useCallback((presetId: string) => {
    const preset = savedPresets.find(p => p.id === presetId)
    if (!preset) return

    const newState: ComplexComponentState = {
      nodeId,
      displayMode: preset.displayMode,
      visibleGroups: preset.visibleGroups,
      collapsedGroups: preset.collapsedGroups,
      userPreferences: preset.userPreferences
    }

    setComponentState(newState)
    setSelectedPreset(presetId)
    onStateChange?.(newState)
  }, [nodeId, savedPresets, onStateChange])

  // 全展開/全折りたたみ
  const toggleAllGroups = useCallback((expand: boolean) => {
    const newState: ComplexComponentState = {
      ...componentState,
      collapsedGroups: expand ? [] : configuration.portGroups.map(g => g.id)
    }

    setComponentState(newState)
    onStateChange?.(newState)
  }, [componentState, configuration.portGroups, onStateChange])

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      {/* ヘッダー */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-blue-600" />
          <span className="font-medium text-sm text-gray-900">{componentName}</span>
          <span className="text-xs text-gray-500">
            ({componentStats.visiblePorts}/{componentStats.totalPorts} ports visible)
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* 表示モード切り替え */}
          <div className="flex gap-1">
            <button
              onClick={() => handleDisplayModeChange('compact')}
              className={`p-1 rounded transition-colors ${
                componentState.displayMode === 'compact' 
                  ? 'bg-blue-100 text-blue-600' 
                  : 'text-gray-400 hover:text-gray-600'
              }`}
              title="Compact mode"
            >
              <Minimize2 className="h-3 w-3" />
            </button>
            <button
              onClick={() => handleDisplayModeChange('expanded')}
              className={`p-1 rounded transition-colors ${
                componentState.displayMode === 'expanded' 
                  ? 'bg-blue-100 text-blue-600' 
                  : 'text-gray-400 hover:text-gray-600'
              }`}
              title="Expanded mode"
            >
              <Maximize2 className="h-3 w-3" />
            </button>
            <button
              onClick={() => handleDisplayModeChange('detailed')}
              className={`p-1 rounded transition-colors ${
                componentState.displayMode === 'detailed' 
                  ? 'bg-blue-100 text-blue-600' 
                  : 'text-gray-400 hover:text-gray-600'
              }`}
              title="Detailed mode"
            >
              <Settings className="h-3 w-3" />
            </button>
          </div>

          {/* ポートリスト表示切り替え */}
          <button
            onClick={() => setShowPortList(!showPortList)}
            className={`p-1 rounded transition-colors ${
              showPortList ? 'bg-green-100 text-green-600' : 'text-gray-400 hover:text-gray-600'
            }`}
            title={showPortList ? 'Hide port list' : 'Show port list'}
          >
            {showPortList ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
          </button>
        </div>
      </div>

      {/* コントロールパネル */}
      <div className="p-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-700">Port Groups</span>
          <div className="flex gap-2">
            <button
              onClick={() => toggleAllGroups(true)}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              Expand All
            </button>
            <button
              onClick={() => toggleAllGroups(false)}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              Collapse All
            </button>
          </div>
        </div>

        {/* グループ管理 */}
        <div className="grid grid-cols-2 gap-2">
          {componentStats.groupStats.map(group => (
            <GroupControlItem
              key={group.id}
              group={group}
              onVisibilityToggle={() => toggleGroupVisibility(group.id)}
              onCollapseToggle={() => toggleGroupCollapse(group.id)}
              onFavoriteToggle={() => toggleFavoriteGroup(group.id)}
            />
          ))}
        </div>
      </div>

      <div className="flex">
        {/* メインビュー */}
        <div className={`${showPortList ? 'w-2/3' : 'w-full'} border-r border-gray-200`}>
          <DynamicPortLayoutManager
            nodeId={nodeId}
            configuration={filteredConfiguration}
            capacityStatuses={capacityStatuses}
            connections={connections}
            nodePosition={nodePosition}
            onConfigurationChange={onConfigurationChange}
            onPortClick={onPortClick}
            onPortHover={onPortHover}
            interactive={interactive}
            enableOptimization={enableOptimization}
            showLabels={componentState.displayMode !== 'compact'}
            showCapacityIndicators={componentState.displayMode === 'detailed'}
          />
        </div>

        {/* サイドポートリスト */}
        {showPortList && (
          <div className="w-1/3">
            <ExpandablePortView
              nodeId={nodeId}
              configuration={filteredConfiguration}
              capacityStatuses={capacityStatuses}
              onPortClick={onPortClick}
              onPortHover={onPortHover}
              onGroupToggle={toggleGroupCollapse}
              onViewModeChange={setPortViewMode}
              interactive={interactive}
              showSearchFilter={true}
              maxHeight={400}
            />
          </div>
        )}
      </div>

      {/* プリセット管理 */}
      {savedPresets.length > 0 && (
        <div className="p-3 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Saved Presets</span>
            <button
              onClick={() => {
                const name = prompt('Preset name:')
                const description = prompt('Description:')
                if (name) saveCurrentPreset(name, description || '')
              }}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              Save Current
            </button>
          </div>
          <div className="flex gap-2 flex-wrap">
            {savedPresets.map(preset => (
              <button
                key={preset.id}
                onClick={() => applyPreset(preset.id)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  selectedPreset === preset.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title={preset.description}
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// サブコンポーネント: グループ制御アイテム
const GroupControlItem: React.FC<{
  group: {
    id: string
    name: string
    type: string
    totalPorts: number
    connectedPorts: number
    isVisible: boolean
    isCollapsed: boolean
    isFavorite: boolean
  }
  onVisibilityToggle: () => void
  onCollapseToggle: () => void
  onFavoriteToggle: () => void
}> = ({ group, onVisibilityToggle, onCollapseToggle, onFavoriteToggle }) => {
  const getGroupIcon = () => {
    switch (group.type) {
      case 'power': return <Zap className="h-3 w-3 text-red-600" />
      case 'communication': return <Radio className="h-3 w-3 text-blue-600" />
      case 'gpio': return <Cpu className="h-3 w-3 text-purple-600" />
      case 'analog': return <BarChart3 className="h-3 w-3 text-orange-600" />
      default: return <Pin className="h-3 w-3 text-gray-600" />
    }
  }

  return (
    <div className={`flex items-center justify-between p-2 rounded border transition-colors ${
      group.isVisible ? 'border-gray-300 bg-white' : 'border-gray-200 bg-gray-100'
    }`}>
      <div className="flex items-center gap-2 flex-1">
        {getGroupIcon()}
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-gray-900 truncate">{group.name}</div>
          <div className="text-xs text-gray-500">
            {group.connectedPorts}/{group.totalPorts}
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-1">
        <button
          onClick={onFavoriteToggle}
          className={`p-1 rounded transition-colors ${
            group.isFavorite 
              ? 'text-yellow-600 hover:text-yellow-700' 
              : 'text-gray-400 hover:text-gray-600'
          }`}
          title={group.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          {group.isFavorite ? <BookmarkCheck className="h-3 w-3" /> : <Bookmark className="h-3 w-3" />}
        </button>
        
        <button
          onClick={onCollapseToggle}
          className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          title={group.isCollapsed ? 'Expand group' : 'Collapse group'}
        >
          {group.isCollapsed ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
        </button>
        
        <button
          onClick={onVisibilityToggle}
          className={`p-1 rounded transition-colors ${
            group.isVisible 
              ? 'text-green-600 hover:text-green-700' 
              : 'text-gray-400 hover:text-gray-600'
          }`}
          title={group.isVisible ? 'Hide group' : 'Show group'}
        >
          {group.isVisible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
        </button>
      </div>
    </div>
  )
}

export default ComplexComponentManager