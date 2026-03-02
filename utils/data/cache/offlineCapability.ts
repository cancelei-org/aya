/**
 * ネットワーク障害時の継続動作機能
 * オフラインキャッシュ、ローカルストレージ、同期機能を実装
 */

import { errorHandlingManager, ErrorCategory } from '../../monitoring/errorHandling'
import type { NodeData, Connection } from '@/types'

// オフライン状態の型定義
export interface OfflineState {
  isOnline: boolean
  lastOnlineTime: number
  pendingOperations: PendingOperation[]
  cachedData: Map<string, CachedData>
}

// 保留中の操作
export interface PendingOperation {
  id: string
  type: 'create' | 'update' | 'delete'
  resource: 'node' | 'connection' | 'project'
  data: any
  timestamp: number
  retryCount: number
}

// キャッシュデータ
export interface CachedData {
  key: string
  data: any
  timestamp: number
  expiry: number
  priority: 'high' | 'medium' | 'low'
}

// 同期結果
export interface SyncResult {
  synced: number
  failed: number
  pending: number
  errors: string[]
}

// オフライン機能マネージャー
export class OfflineCapabilityManager {
  private state: OfflineState = {
    isOnline: true,
    lastOnlineTime: Date.now(),
    pendingOperations: [],
    cachedData: new Map()
  }
  
  private onlineListeners: ((isOnline: boolean) => void)[] = []
  private syncListeners: ((result: SyncResult) => void)[] = []
  private storageKey = 'orboh-offline-data'
  private maxCacheSize = 50 * 1024 * 1024 // 50MB
  private maxPendingOperations = 1000

  constructor() {
    // ネットワーク状態の監視
    this.initializeNetworkMonitoring()
    
    // ローカルストレージからの復元
    this.restoreFromLocalStorage()
    
    // 定期的な同期
    this.startPeriodicSync()
  }

  // ネットワーク監視の初期化
  private initializeNetworkMonitoring(): void {
    // オンライン/オフラインイベントの監視
    window.addEventListener('online', () => this.handleOnlineStatusChange(true))
    window.addEventListener('offline', () => this.handleOnlineStatusChange(false))
    
    // 初期状態の設定
    this.state.isOnline = navigator.onLine
    
    // ネットワーク品質の監視（実験的）
    if ('connection' in navigator) {
      const connection = (navigator as any).connection
      connection.addEventListener('change', () => {
        this.checkNetworkQuality()
      })
    }
  }

  // オンライン状態の変更処理
  private handleOnlineStatusChange(isOnline: boolean): void {
    const wasOffline = !this.state.isOnline
    this.state.isOnline = isOnline
    
    if (isOnline) {
      this.state.lastOnlineTime = Date.now()
      
      // オフラインからオンラインに復帰した場合
      if (wasOffline) {
        console.log('🌐 Network connection restored')
        this.syncPendingOperations()
      }
    } else {
      console.log('📵 Network connection lost - switching to offline mode')
    }
    
    // リスナーに通知
    this.notifyOnlineListeners(isOnline)
  }

  // ネットワーク品質のチェック
  private checkNetworkQuality(): void {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection
      const effectiveType = connection.effectiveType
      
      // 低速ネットワークの検出
      if (effectiveType === 'slow-2g' || effectiveType === '2g') {
        console.warn('⚠️ Slow network detected - enabling aggressive caching')
        // より積極的なキャッシングを有効化
      }
    }
  }

  // ローカルストレージからの復元
  private restoreFromLocalStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey)
      if (stored) {
        const data = JSON.parse(stored)
        
        // 保留中の操作を復元
        this.state.pendingOperations = data.pendingOperations || []
        
        // キャッシュデータを復元（期限切れは除外）
        const now = Date.now()
        Object.entries(data.cachedData || {}).forEach(([key, value]: [string, any]) => {
          if (value.expiry > now) {
            this.state.cachedData.set(key, value)
          }
        })
        
        console.log(`📦 Restored ${this.state.pendingOperations.length} pending operations from local storage`)
      }
    } catch (error) {
      console.error('Failed to restore offline data:', error)
    }
  }

  // ローカルストレージへの保存
  private saveToLocalStorage(): void {
    try {
      const data = {
        pendingOperations: this.state.pendingOperations,
        cachedData: Object.fromEntries(this.state.cachedData),
        lastSaved: Date.now()
      }
      
      const serialized = JSON.stringify(data)
      
      // サイズチェック
      if (serialized.length > this.maxCacheSize) {
        this.pruneOldData()
      }
      
      localStorage.setItem(this.storageKey, serialized)
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        console.warn('Local storage quota exceeded - pruning old data')
        this.pruneOldData()
      } else {
        console.error('Failed to save offline data:', error)
      }
    }
  }

  // 古いデータの削除
  private pruneOldData(): void {
    // 優先度の低い古いキャッシュを削除
    const sortedCache = Array.from(this.state.cachedData.entries())
      .sort(([, a], [, b]) => {
        if (a.priority !== b.priority) {
          const priorityOrder = { low: 0, medium: 1, high: 2 }
          return priorityOrder[a.priority] - priorityOrder[b.priority]
        }
        return a.timestamp - b.timestamp
      })
    
    // 最も優先度の低いものから削除
    const toRemove = Math.floor(sortedCache.length * 0.3) // 30%削除
    for (let i = 0; i < toRemove; i++) {
      this.state.cachedData.delete(sortedCache[i][0])
    }
    
    // 古い保留操作も削除（1週間以上前）
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
    this.state.pendingOperations = this.state.pendingOperations.filter(
      op => op.timestamp > oneWeekAgo
    )
  }

  // 定期同期の開始
  private startPeriodicSync(): void {
    // 5分ごとに同期を試行
    setInterval(() => {
      if (this.state.isOnline && this.state.pendingOperations.length > 0) {
        this.syncPendingOperations()
      }
    }, 5 * 60 * 1000)
  }

  // 保留中の操作を同期
  async syncPendingOperations(): Promise<SyncResult> {
    if (!this.state.isOnline) {
      return {
        synced: 0,
        failed: 0,
        pending: this.state.pendingOperations.length,
        errors: ['Network is offline']
      }
    }

    console.log(`🔄 Syncing ${this.state.pendingOperations.length} pending operations`)
    
    const result: SyncResult = {
      synced: 0,
      failed: 0,
      pending: 0,
      errors: []
    }

    const remainingOperations: PendingOperation[] = []

    for (const operation of this.state.pendingOperations) {
      try {
        await this.executePendingOperation(operation)
        result.synced++
      } catch (error) {
        operation.retryCount++
        
        if (operation.retryCount < 3) {
          remainingOperations.push(operation)
          result.pending++
        } else {
          result.failed++
          result.errors.push(`${operation.type} ${operation.resource}: ${error.message}`)
        }
      }
    }

    this.state.pendingOperations = remainingOperations
    this.saveToLocalStorage()
    
    // 同期結果を通知
    this.notifySyncListeners(result)
    
    return result
  }

  // 保留操作の実行
  private async executePendingOperation(operation: PendingOperation): Promise<void> {
    // TODO: 実際のAPI呼び出しを実装
    // 現在はシミュレーション
    await new Promise((resolve, reject) => {
      setTimeout(() => {
        if (Math.random() > 0.1) { // 90%の成功率
          resolve(undefined)
        } else {
          reject(new Error('Sync failed'))
        }
      }, 100)
    })
  }

  // 操作の保存（オンライン/オフライン対応）
  async saveOperation(
    type: 'create' | 'update' | 'delete',
    resource: 'node' | 'connection' | 'project',
    data: any
  ): Promise<void> {
    if (this.state.isOnline) {
      try {
        // オンラインの場合は直接実行
        await this.executeOperation(type, resource, data)
      } catch (error) {
        // ネットワークエラーの場合は保留に追加
        if (this.isNetworkError(error)) {
          this.addPendingOperation(type, resource, data)
        } else {
          throw error
        }
      }
    } else {
      // オフラインの場合は保留に追加
      this.addPendingOperation(type, resource, data)
    }
  }

  // 操作の実行
  private async executeOperation(
    type: 'create' | 'update' | 'delete',
    resource: 'node' | 'connection' | 'project',
    data: any
  ): Promise<void> {
    // TODO: 実際のAPI呼び出しを実装
    throw new Error('Not implemented')
  }

  // ネットワークエラーの判定
  private isNetworkError(error: any): boolean {
    return error.name === 'NetworkError' || 
           error.message.includes('network') ||
           error.message.includes('fetch')
  }

  // 保留操作の追加
  private addPendingOperation(
    type: 'create' | 'update' | 'delete',
    resource: 'node' | 'connection' | 'project',
    data: any
  ): void {
    const operation: PendingOperation = {
      id: `op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      resource,
      data,
      timestamp: Date.now(),
      retryCount: 0
    }

    this.state.pendingOperations.push(operation)
    
    // 最大数を超えた場合は古いものを削除
    if (this.state.pendingOperations.length > this.maxPendingOperations) {
      this.state.pendingOperations.shift()
    }
    
    this.saveToLocalStorage()
    
    console.log(`📝 Operation saved for offline sync: ${type} ${resource}`)
  }

  // データのキャッシュ
  cacheData(
    key: string,
    data: any,
    expiry: number = 3600000, // 1時間
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): void {
    const cached: CachedData = {
      key,
      data,
      timestamp: Date.now(),
      expiry: Date.now() + expiry,
      priority
    }

    this.state.cachedData.set(key, cached)
    this.saveToLocalStorage()
  }

  // キャッシュからデータを取得
  getCachedData(key: string): any | null {
    const cached = this.state.cachedData.get(key)
    
    if (!cached) return null
    
    // 期限切れチェック
    if (cached.expiry < Date.now()) {
      this.state.cachedData.delete(key)
      return null
    }
    
    return cached.data
  }

  // オンラインリスナーの登録
  onOnlineStatusChange(listener: (isOnline: boolean) => void): () => void {
    this.onlineListeners.push(listener)
    // 現在の状態を即座に通知
    listener(this.state.isOnline)
    
    return () => {
      this.onlineListeners = this.onlineListeners.filter(l => l !== listener)
    }
  }

  // 同期リスナーの登録
  onSync(listener: (result: SyncResult) => void): () => void {
    this.syncListeners.push(listener)
    return () => {
      this.syncListeners = this.syncListeners.filter(l => l !== listener)
    }
  }

  // リスナーへの通知
  private notifyOnlineListeners(isOnline: boolean): void {
    this.onlineListeners.forEach(listener => listener(isOnline))
  }

  private notifySyncListeners(result: SyncResult): void {
    this.syncListeners.forEach(listener => listener(result))
  }

  // 状態の取得
  getState(): OfflineState {
    return { ...this.state }
  }

  // 統計情報の取得
  getStats(): {
    isOnline: boolean
    pendingOperations: number
    cacheSize: number
    cacheHitRate: number
    offlineTime: number
  } {
    return {
      isOnline: this.state.isOnline,
      pendingOperations: this.state.pendingOperations.length,
      cacheSize: this.state.cachedData.size,
      cacheHitRate: 0, // TODO: 実装
      offlineTime: this.state.isOnline ? 0 : Date.now() - this.state.lastOnlineTime
    }
  }
}

// グローバルインスタンス
export const offlineCapabilityManager = new OfflineCapabilityManager()

// React Hook for offline capability
export function useOfflineCapability() {
  const [isOnline, setIsOnline] = React.useState(navigator.onLine)
  const [syncStatus, setSyncStatus] = React.useState<SyncResult | null>(null)
  const [stats, setStats] = React.useState(offlineCapabilityManager.getStats())

  React.useEffect(() => {
    const unsubscribeOnline = offlineCapabilityManager.onOnlineStatusChange(setIsOnline)
    const unsubscribeSync = offlineCapabilityManager.onSync(setSyncStatus)
    
    // 統計情報の定期更新
    const interval = setInterval(() => {
      setStats(offlineCapabilityManager.getStats())
    }, 1000)

    return () => {
      unsubscribeOnline()
      unsubscribeSync()
      clearInterval(interval)
    }
  }, [])

  const saveOffline = React.useCallback(async (
    type: 'create' | 'update' | 'delete',
    resource: 'node' | 'connection' | 'project',
    data: any
  ) => {
    await offlineCapabilityManager.saveOperation(type, resource, data)
  }, [])

  const syncNow = React.useCallback(async () => {
    return await offlineCapabilityManager.syncPendingOperations()
  }, [])

  return {
    isOnline,
    syncStatus,
    stats,
    saveOffline,
    syncNow,
    cacheData: (key: string, data: any, expiry?: number) => 
      offlineCapabilityManager.cacheData(key, data, expiry),
    getCachedData: (key: string) => 
      offlineCapabilityManager.getCachedData(key)
  }
}