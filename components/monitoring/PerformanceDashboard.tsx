'use client'

import React from 'react'
import { usePerformanceMonitor } from '@/utils/monitoring/performanceMonitor'
import { aiSearchOptimizer } from '@/utils/ai/core/aiSearchOptimizer'
import { portGenerationOptimizer } from '@/utils/portGenerationOptimizer'
import { Activity, Zap, Database, AlertTriangle, TrendingUp } from 'lucide-react'

// パフォーマンスダッシュボードのプロパティ
interface PerformanceDashboardProps {
  isOpen?: boolean
  onClose?: () => void
  position?: 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left'
}

export function PerformanceDashboard({ 
  isOpen = false, 
  onClose,
  position = 'bottom-right' 
}: PerformanceDashboardProps) {
  const { report, clearMetrics } = usePerformanceMonitor()
  const [aiStats, setAiStats] = React.useState(aiSearchOptimizer.getStats())
  const [portStats, setPortStats] = React.useState(portGenerationOptimizer.getStats())
  
  // 統計情報の定期更新
  React.useEffect(() => {
    const interval = setInterval(() => {
      setAiStats(aiSearchOptimizer.getStats())
      setPortStats(portGenerationOptimizer.getStats())
    }, 1000)
    
    return () => clearInterval(interval)
  }, [])

  if (!isOpen || !report) return null

  // 位置スタイルの決定
  const positionStyles = {
    'top-right': 'top-4 right-4',
    'bottom-right': 'bottom-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-left': 'bottom-4 left-4'
  }

  // メトリクスカード
  const MetricCard = ({ 
    icon: Icon, 
    title, 
    value, 
    unit, 
    trend, 
    status 
  }: {
    icon: React.ElementType
    title: string
    value: string | number
    unit?: string
    trend?: 'up' | 'down' | 'stable'
    status?: 'good' | 'warning' | 'critical'
  }) => {
    const statusColors = {
      good: 'text-green-600 bg-green-50',
      warning: 'text-yellow-600 bg-yellow-50',
      critical: 'text-red-600 bg-red-50'
    }

    return (
      <div className={`p-3 rounded-lg border ${status ? statusColors[status] : 'bg-white'}`}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4" />
            <span className="text-xs font-medium">{title}</span>
          </div>
          {trend && (
            <TrendingUp 
              className={`w-3 h-3 ${
                trend === 'up' ? 'text-red-500' : 
                trend === 'down' ? 'text-green-500' : 
                'text-gray-400'
              } ${trend === 'down' && 'rotate-180'}`}
            />
          )}
        </div>
        <div className="text-lg font-bold">
          {value}
          {unit && <span className="text-xs font-normal ml-1">{unit}</span>}
        </div>
      </div>
    )
  }

  return (
    <div 
      className={`fixed ${positionStyles[position]} w-96 bg-white rounded-lg shadow-2xl border border-gray-200 z-50`}
    >
      {/* ヘッダー */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold">Performance Monitor</h3>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
      </div>

      {/* メインコンテンツ */}
      <div className="p-4 space-y-4 max-h-[500px] overflow-y-auto">
        {/* サマリー */}
        <div className="grid grid-cols-2 gap-3">
          <MetricCard
            icon={Activity}
            title="Avg Response Time"
            value={report.summary.averageDuration.toFixed(0)}
            unit="ms"
            status={
              report.summary.averageDuration < 100 ? 'good' :
              report.summary.averageDuration < 500 ? 'warning' : 'critical'
            }
          />
          <MetricCard
            icon={Zap}
            title="Operations"
            value={report.summary.totalOperations}
            trend={report.summary.totalOperations > 100 ? 'up' : 'stable'}
          />
        </div>

        {/* AI検索統計 */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">AI Search Optimization</h4>
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center p-2 bg-gray-50 rounded">
              <div className="text-xs text-gray-500">Pending</div>
              <div className="text-sm font-semibold">{aiStats.pendingRequests}</div>
            </div>
            <div className="text-center p-2 bg-gray-50 rounded">
              <div className="text-xs text-gray-500">Cache Size</div>
              <div className="text-sm font-semibold">{aiStats.cacheSize}</div>
            </div>
            <div className="text-center p-2 bg-gray-50 rounded">
              <div className="text-xs text-gray-500">Hit Rate</div>
              <div className="text-sm font-semibold">
                {(aiStats.cacheHitRate * 100).toFixed(0)}%
              </div>
            </div>
          </div>
        </div>

        {/* ポート生成統計 */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Port Generation</h4>
          <div className="grid grid-cols-2 gap-2">
            <div className="text-center p-2 bg-gray-50 rounded">
              <div className="text-xs text-gray-500">Cache Hit Rate</div>
              <div className="text-sm font-semibold">
                {(portStats.cacheHitRate * 100).toFixed(0)}%
              </div>
            </div>
            <div className="text-center p-2 bg-gray-50 rounded">
              <div className="text-xs text-gray-500">Avg Gen Time</div>
              <div className="text-sm font-semibold">
                {portStats.averageGenerationTime.toFixed(1)}ms
              </div>
            </div>
          </div>
        </div>

        {/* 遅い操作の警告 */}
        {report.slowOperations.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
              <h4 className="text-sm font-medium text-gray-700">Slow Operations</h4>
            </div>
            <div className="space-y-1">
              {report.slowOperations.slice(0, 3).map((op, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between text-xs p-2 bg-yellow-50 rounded"
                >
                  <span className="font-medium truncate max-w-[200px]">
                    {op.operation}
                  </span>
                  <span className="text-yellow-700 font-semibold">
                    {op.duration.toFixed(0)}ms
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* メモリ使用状況 */}
        {report.summary.memoryPressure && (
          <div className="p-3 bg-red-50 rounded-lg border border-red-200">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-red-600" />
              <span className="text-sm font-medium text-red-800">
                High Memory Usage Detected
              </span>
            </div>
            <p className="text-xs text-red-700 mt-1">
              Consider clearing caches or reducing data retention
            </p>
          </div>
        )}

        {/* アクション */}
        <div className="flex gap-2">
          <button
            onClick={() => {
              clearMetrics()
              aiSearchOptimizer.clearCache()
              portGenerationOptimizer.clearCache()
            }}
            className="flex-1 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors"
          >
            Clear All Caches
          </button>
          <button
            onClick={clearMetrics}
            className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded transition-colors"
          >
            Reset Metrics
          </button>
        </div>
      </div>
    </div>
  )
}

// 使用例：
// export function App() {
//   const [showPerformance, setShowPerformance] = React.useState(false)
//   
//   return (
//     <>
//       <button onClick={() => setShowPerformance(!showPerformance)}>
//         Toggle Performance Monitor
//       </button>
//       <PerformanceDashboard 
//         isOpen={showPerformance}
//         onClose={() => setShowPerformance(false)}
//         position="bottom-right"
//       />
//     </>
//   )
// }