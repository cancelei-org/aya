'use client'

import React, { useState, useCallback } from 'react'
import { 
  Settings, 
  Zap, 
  Target, 
  BarChart3, 
  Eye, 
  Sliders,
  RefreshCw,
  Info,
  CheckCircle2
} from 'lucide-react'
import type { PortLayoutConstraints } from '@/types/canvas'
import { PortPositionOptimizer } from '@/utils/connections/ports/portPositionOptimizer'

export interface PortOptimizationSettingsProps {
  nodeId: string
  currentConstraints: PortLayoutConstraints
  onConstraintsChange: (constraints: PortLayoutConstraints) => void
  onOptimizationToggle: (enabled: boolean) => void
  isOptimizationEnabled: boolean
  className?: string
}

/**
 * 🎯 PortOptimizationSettings
 * ポート位置最適化の設定とコントロールパネル
 */
export const PortOptimizationSettings: React.FC<PortOptimizationSettingsProps> = ({
  currentConstraints,
  onConstraintsChange,
  onOptimizationToggle,
  isOptimizationEnabled,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [optimizationStats, setOptimizationStats] = useState<{
    totalOptimizations: number
    averageTimeSaved: number
    conflictsResolved: number
    layoutImprovements: number
  } | null>(null)
  const [localConstraints, setLocalConstraints] = useState(currentConstraints)

  // 最適化統計の取得
  const loadOptimizationStats = useCallback(() => {
    const optimizer = PortPositionOptimizer.getInstance()
    const stats = optimizer.getOptimizationStats()
    setOptimizationStats(stats)
  }, [])

  // 制約の更新
  const updateConstraints = useCallback((updates: Partial<PortLayoutConstraints>) => {
    const newConstraints = { ...localConstraints, ...updates }
    setLocalConstraints(newConstraints)
    onConstraintsChange(newConstraints)
  }, [localConstraints, onConstraintsChange])

  // 設定のリセット
  const resetToDefaults = useCallback(() => {
    const defaultConstraints: PortLayoutConstraints = {
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
    }
    setLocalConstraints(defaultConstraints)
    onConstraintsChange(defaultConstraints)
  }, [onConstraintsChange])

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      {/* ヘッダー */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-blue-600" />
          <span className="font-medium text-sm text-gray-900">Port Layout Optimization</span>
        </div>
        
        <div className="flex items-center gap-2">
          {/* 最適化有効/無効切り替え */}
          <button
            onClick={() => onOptimizationToggle(!isOptimizationEnabled)}
            className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
              isOptimizationEnabled 
                ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {isOptimizationEnabled ? (
              <>
                <CheckCircle2 className="h-3 w-3" />
                Enabled
              </>
            ) : (
              <>
                <Zap className="h-3 w-3" />
                Disabled
              </>
            )}
          </button>
          
          {/* 展開/折りたたみ */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <Settings className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
          </button>
        </div>
      </div>

      {/* 展開されたコンテンツ */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* 統計情報 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded p-3">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-gray-900">Statistics</span>
              </div>
              <button
                onClick={loadOptimizationStats}
                className="text-xs text-blue-600 hover:text-blue-800 mb-2"
              >
                Load Stats
              </button>
              {optimizationStats && (
                <div className="space-y-1 text-xs text-gray-600">
                  <div>Total Optimizations: {optimizationStats.totalOptimizations}</div>
                  <div>Avg Time: {Math.round(optimizationStats.averageOptimizationTime)}ms</div>
                  <div>Avg Score: {Math.round(optimizationStats.averageImprovementScore)}%</div>
                </div>
              )}
            </div>

            <div className="bg-gray-50 rounded p-3">
              <div className="flex items-center gap-2 mb-2">
                <Eye className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-gray-900">Current Settings</span>
              </div>
              <div className="space-y-1 text-xs text-gray-600">
                <div>Min Spacing: {localConstraints.minPortSpacing}px</div>
                <div>Max Per Side: {localConstraints.maxPortsPerSide}</div>
                <div>Node Min: {localConstraints.nodeMinWidth}×{localConstraints.nodeMinHeight}</div>
              </div>
            </div>
          </div>

          {/* 制約設定 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Sliders className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-900">Layout Constraints</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* ポート間隔 */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Min Port Spacing (px)
                </label>
                <input
                  type="range"
                  min="16"
                  max="40"
                  step="2"
                  value={localConstraints.minPortSpacing}
                  onChange={(e) => updateConstraints({ minPortSpacing: parseInt(e.target.value) })}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="text-xs text-gray-500 mt-1">{localConstraints.minPortSpacing}px</div>
              </div>

              {/* サイド最大ポート数 */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Max Ports Per Side
                </label>
                <input
                  type="range"
                  min="4"
                  max="16"
                  step="1"
                  value={localConstraints.maxPortsPerSide}
                  onChange={(e) => updateConstraints({ maxPortsPerSide: parseInt(e.target.value) })}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="text-xs text-gray-500 mt-1">{localConstraints.maxPortsPerSide} ports</div>
              </div>

              {/* ノード最小幅 */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Node Min Width (px)
                </label>
                <input
                  type="range"
                  min="80"
                  max="200"
                  step="10"
                  value={localConstraints.nodeMinWidth}
                  onChange={(e) => updateConstraints({ nodeMinWidth: parseInt(e.target.value) })}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="text-xs text-gray-500 mt-1">{localConstraints.nodeMinWidth}px</div>
              </div>

              {/* ノード最小高さ */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Node Min Height (px)
                </label>
                <input
                  type="range"
                  min="60"
                  max="160"
                  step="10"
                  value={localConstraints.nodeMinHeight}
                  onChange={(e) => updateConstraints({ nodeMinHeight: parseInt(e.target.value) })}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="text-xs text-gray-500 mt-1">{localConstraints.nodeMinHeight}px</div>
              </div>
            </div>
          </div>

          {/* ポート配置方針 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-900">Port Placement Preferences</span>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {Object.entries(localConstraints.preferredSides).map(([portType, sides]) => (
                <div key={portType} className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-700 capitalize">{portType}:</span>
                  <div className="flex gap-1">
                    {(['top', 'right', 'bottom', 'left'] as const).map(side => (
                      <button
                        key={side}
                        onClick={() => {
                          const currentSides = localConstraints.preferredSides[portType as keyof typeof localConstraints.preferredSides]
                          const newSides = currentSides.includes(side)
                            ? currentSides.filter(s => s !== side)
                            : [...currentSides, side]
                          
                          updateConstraints({
                            preferredSides: {
                              ...localConstraints.preferredSides,
                              [portType]: newSides
                            }
                          })
                        }}
                        className={`px-2 py-1 text-xs rounded transition-colors ${
                          sides.includes(side)
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {side}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* アクション */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-200">
            <button
              onClick={resetToDefaults}
              className="flex items-center gap-1 px-3 py-1 text-xs text-gray-600 hover:text-gray-800 transition-colors"
            >
              <RefreshCw className="h-3 w-3" />
              Reset to Defaults
            </button>

            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Info className="h-3 w-3" />
              Changes apply immediately
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PortOptimizationSettings