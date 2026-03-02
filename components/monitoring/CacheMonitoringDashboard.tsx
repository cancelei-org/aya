'use client'

import React, { useState, useEffect } from 'react'
import { 
  Database, 
  Activity, 
  TrendingDown,
  RefreshCw,
  Trash2,
  HardDrive,
  Zap,
  AlertTriangle,
  CheckCircle,
  PieChart,
  Settings
} from 'lucide-react'
import type { CacheStats } from '@/utils/data/cache/redisCacheService'

export interface CacheMonitoringDashboardProps {
  refreshInterval?: number // milliseconds
  showDetailedMetrics?: boolean
  onCacheAction?: (action: 'clear' | 'cleanup', result: any) => void
}

export const CacheMonitoringDashboard: React.FC<CacheMonitoringDashboardProps> = ({
  refreshInterval = 30000, // 30 seconds
  showDetailedMetrics = true,
  onCacheAction
}) => {
  const [stats, setStats] = useState<CacheStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)

  const fetchStats = async () => {
    try {
      setError(null)
      const { getCacheStats } = await import('@/utils/data/cache/redisCacheService')
      const newStats = await getCacheStats()
      setStats(newStats)
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Failed to fetch cache stats:', err)
      setError(err instanceof Error ? err.message : 'Failed to load cache statistics')
    } finally {
      setIsLoading(false)
    }
  }

  const handleManualRefresh = () => {
    setIsLoading(true)
    fetchStats()
  }

  const handleClearCache = async () => {
    if (!confirm('Are you sure you want to clear all cache data? This action cannot be undone.')) {
      return
    }

    try {
      const { createRedisCacheService } = await import('@/utils/data/cache/redisCacheService')
      const cache = createRedisCacheService()
      await cache.clearAll()
      
      onCacheAction?.('clear', { success: true })
      await fetchStats() // Refresh stats
    } catch (error) {
      console.error('Cache clear failed:', error)
      onCacheAction?.('clear', { success: false, error })
    }
  }

  const handleCleanup = async () => {
    try {
      const { createRedisCacheService } = await import('@/utils/data/cache/redisCacheService')
      const cache = createRedisCacheService()
      const result = await cache.cleanup()
      
      onCacheAction?.('cleanup', result)
      await fetchStats() // Refresh stats
    } catch (error) {
      console.error('Cache cleanup failed:', error)
      onCacheAction?.('cleanup', { success: false, error })
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(fetchStats, refreshInterval)
    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval])

  const getHitRateColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600 bg-green-100'
    if (rate >= 60) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  const getMemoryUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600 bg-red-100'
    if (percentage >= 70) return 'text-yellow-600 bg-yellow-100'
    return 'text-green-600 bg-green-100'
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num)
  }

  if (isLoading && !stats) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
        <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
        <div className="text-gray-600">Loading cache statistics...</div>
      </div>
    )
  }

  if (error && !stats) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
        <AlertTriangle className="h-8 w-8 mx-auto mb-4 text-red-500" />
        <div className="text-red-600 mb-4">{error}</div>
        <button
          onClick={handleManualRefresh}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Cache Monitoring</h3>
            {lastUpdated && (
              <span className="text-xs text-gray-500">
                Updated {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-3 py-1 text-xs rounded ${
                autoRefresh 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
            </button>
            
            <button
              onClick={handleManualRefresh}
              disabled={isLoading}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            
            <button
              onClick={handleCleanup}
              className="p-2 text-blue-400 hover:text-blue-600 transition-colors"
              title="Clean up expired entries"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            
            <button
              onClick={handleClearCache}
              className="p-2 text-red-400 hover:text-red-600 transition-colors"
              title="Clear all cache"
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Metrics */}
      {stats && (
        <div className="p-4 space-y-6">
          {/* Key Performance Indicators */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-gray-700">Hit Rate</span>
              </div>
              <div className={`text-2xl font-bold px-2 py-1 rounded ${getHitRateColor(stats.hitRate)}`}>
                {stats.hitRate.toFixed(1)}%
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="h-4 w-4 text-orange-600" />
                <span className="text-sm font-medium text-gray-700">Miss Rate</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {stats.missRate.toFixed(1)}%
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Database className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-gray-700">Total Keys</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {formatNumber(stats.totalKeys)}
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <HardDrive className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium text-gray-700">Memory Usage</span>
              </div>
              <div className={`text-lg font-bold px-2 py-1 rounded ${getMemoryUsageColor(stats.memoryUsage.percentage)}`}>
                {stats.memoryUsage.percentage.toFixed(1)}%
              </div>
              <div className="text-xs text-gray-600 mt-1">
                {formatBytes(stats.memoryUsage.used)} / {formatBytes(stats.memoryUsage.available)}
              </div>
            </div>
          </div>

          {/* Detailed Metrics */}
          {showDetailedMetrics && (
            <>
              {/* Memory Usage Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Memory Usage Details</span>
                  <span className="text-xs text-gray-500">
                    {formatBytes(stats.memoryUsage.used)} used
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all duration-300 ${
                      stats.memoryUsage.percentage >= 90 
                        ? 'bg-red-500' 
                        : stats.memoryUsage.percentage >= 70 
                        ? 'bg-yellow-500' 
                        : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(stats.memoryUsage.percentage, 100)}%` }}
                  />
                </div>
              </div>

              {/* Cache Types Breakdown */}
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900 flex items-center gap-2">
                  <PieChart className="h-4 w-4" />
                  Cache Types Breakdown
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.entries(stats.keysByType).map(([type, count]) => (
                    <div key={type} className="p-3 border border-gray-200 rounded">
                      <div className="text-sm font-medium text-gray-900 capitalize">
                        {type.replace('-', ' ')}
                      </div>
                      <div className="text-lg font-bold text-blue-600">
                        {formatNumber(count)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {((count / stats.totalKeys) * 100).toFixed(1)}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Performance Recommendations */}
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900 flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Performance Insights
                </h4>
                <div className="space-y-2">
                  {stats.hitRate < 60 && (
                    <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded">
                      <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-red-800">
                        <strong>Low hit rate detected:</strong> Consider increasing cache TTL or reviewing cache strategy.
                      </div>
                    </div>
                  )}
                  
                  {stats.memoryUsage.percentage > 85 && (
                    <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded">
                      <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-yellow-800">
                        <strong>High memory usage:</strong> Consider running cleanup or increasing memory limits.
                      </div>
                    </div>
                  )}
                  
                  {stats.hitRate >= 80 && stats.memoryUsage.percentage < 70 && (
                    <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-green-800">
                        <strong>Optimal performance:</strong> Cache is performing well with good hit rate and healthy memory usage.
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Cache Statistics Summary */}
              <div className="pt-4 border-t border-gray-200">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Total Size:</span>
                    <span className="ml-2 font-medium">{formatBytes(stats.totalSize)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Hit Rate:</span>
                    <span className="ml-2 font-medium">{stats.hitRate.toFixed(2)}%</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Miss Rate:</span>
                    <span className="ml-2 font-medium">{stats.missRate.toFixed(2)}%</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Memory Used:</span>
                    <span className="ml-2 font-medium">{stats.memoryUsage.percentage.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default CacheMonitoringDashboard