/**
 * 動的ポート生成の処理時間最適化
 * メモ化、遅延評価、差分更新を実装
 */

import { performanceMonitor } from '../../../monitoring/performanceMonitor'
import type { DynamicPortConfiguration, PortDefinition } from '@/types/canvas'

// ポート生成のキャッシュキー
type PortCacheKey = string

// ポート生成の最適化設定
interface OptimizationConfig {
  enableMemoization: boolean
  enableLazyEvaluation: boolean
  enableDifferentialUpdate: boolean
  maxCacheSize: number
  cacheExpiry: number // ミリ秒
}

// ポート生成結果のキャッシュエントリ
interface CachedPortConfig {
  config: DynamicPortConfiguration
  timestamp: number
  accessCount: number
  generationTime: number
}

// ポート生成最適化クラス
export class PortGenerationOptimizer {
  private cache: Map<PortCacheKey, CachedPortConfig> = new Map()
  private pendingGenerations: Map<string, Promise<DynamicPortConfiguration>> = new Map()
  
  private config: OptimizationConfig = {
    enableMemoization: true,
    enableLazyEvaluation: true,
    enableDifferentialUpdate: true,
    maxCacheSize: 500,
    cacheExpiry: 300000 // 5分
  }

  // 最適化されたポート生成
  async generatePorts(
    componentType: string,
    specifications: Record<string, any>,
    existingConfig?: DynamicPortConfiguration
  ): Promise<DynamicPortConfiguration> {
    const endMetric = performanceMonitor.startOperation('Port Generation', {
      componentType,
      hasExisting: !!existingConfig
    })

    try {
      // キャッシュキーの生成
      const cacheKey = this.generateCacheKey(componentType, specifications)

      // メモ化チェック
      if (this.config.enableMemoization) {
        const cached = this.getCachedConfig(cacheKey)
        if (cached) {
          endMetric()
          return cached
        }
      }

      // 既に生成中の場合は待機
      const pending = this.pendingGenerations.get(cacheKey)
      if (pending) {
        const result = await pending
        endMetric()
        return result
      }

      // 新規生成の開始
      const generationPromise = this.performGeneration(
        componentType,
        specifications,
        existingConfig
      )
      
      this.pendingGenerations.set(cacheKey, generationPromise)

      try {
        const result = await generationPromise
        
        // キャッシュに保存
        if (this.config.enableMemoization) {
          this.cacheConfig(cacheKey, result, endMetric())
        }
        
        return result
      } finally {
        this.pendingGenerations.delete(cacheKey)
      }
    } catch (error) {
      endMetric()
      throw error
    }
  }

  // 実際のポート生成処理
  private async performGeneration(
    componentType: string,
    specifications: Record<string, any>,
    existingConfig?: DynamicPortConfiguration
  ): Promise<DynamicPortConfiguration> {
    // 差分更新が有効で既存設定がある場合
    if (this.config.enableDifferentialUpdate && existingConfig) {
      return this.generateDifferential(componentType, specifications, existingConfig)
    }

    // 遅延評価が有効な場合
    if (this.config.enableLazyEvaluation) {
      return this.generateLazy(componentType, specifications)
    }

    // 通常の生成
    return this.generateFull(componentType, specifications)
  }

  // 完全なポート生成
  private generateFull(
    componentType: string,
    specifications: Record<string, any>
  ): DynamicPortConfiguration {
    const ports: PortDefinition[] = []
    
    // 基本的なポート生成ロジック（最適化済み）
    const portTemplates = this.getPortTemplates(componentType)
    
    for (const template of portTemplates) {
      if (this.shouldIncludePort(template, specifications)) {
        ports.push(this.createPort(template, specifications))
      }
    }

    return {
      ports,
      groups: this.generatePortGroups(ports),
      layout: 'auto',
      expandable: ports.length > 10
    }
  }

  // 遅延評価によるポート生成
  private generateLazy(
    componentType: string,
    specifications: Record<string, any>
  ): DynamicPortConfiguration {
    // 最小限のポートのみ生成し、残りは必要に応じて生成
    const essentialPorts = this.getEssentialPorts(componentType)
    const lazyPorts = this.getLazyPortGenerators(componentType, specifications)

    return {
      ports: essentialPorts,
      groups: this.generatePortGroups(essentialPorts),
      layout: 'auto',
      expandable: true,
      lazyGenerators: lazyPorts // 遅延生成用のジェネレータ
    }
  }

  // 差分更新によるポート生成
  private generateDifferential(
    componentType: string,
    specifications: Record<string, any>,
    existingConfig: DynamicPortConfiguration
  ): DynamicPortConfiguration {
    const changes = this.detectSpecificationChanges(specifications, existingConfig)
    
    if (changes.length === 0) {
      // 変更なし
      return existingConfig
    }

    // 既存のポートをコピー
    const updatedPorts = [...existingConfig.ports]
    
    // 変更を適用
    for (const change of changes) {
      switch (change.type) {
        case 'add':
          updatedPorts.push(change.port)
          break
        case 'remove':
          const index = updatedPorts.findIndex(p => p.id === change.portId)
          if (index >= 0) updatedPorts.splice(index, 1)
          break
        case 'update':
          const updateIndex = updatedPorts.findIndex(p => p.id === change.portId)
          if (updateIndex >= 0) {
            updatedPorts[updateIndex] = { ...updatedPorts[updateIndex], ...change.updates }
          }
          break
      }
    }

    return {
      ...existingConfig,
      ports: updatedPorts,
      groups: this.generatePortGroups(updatedPorts)
    }
  }

  // ポートテンプレートの取得（コンポーネントタイプ別）
  private getPortTemplates(componentType: string): any[] {
    // 最適化: 頻繁に使用されるテンプレートをメモリに保持
    const templates = {
      'Arduino Uno': [
        { type: 'digital', count: 14, prefix: 'D' },
        { type: 'analog', count: 6, prefix: 'A' },
        { type: 'power', names: ['5V', '3.3V', 'GND', 'VIN'] },
        { type: 'communication', names: ['TX', 'RX', 'SDA', 'SCL'] }
      ],
      'ESP32': [
        { type: 'gpio', count: 34, prefix: 'GPIO' },
        { type: 'power', names: ['3.3V', 'GND', 'VIN'] },
        { type: 'communication', names: ['TX', 'RX', 'SDA', 'SCL', 'MOSI', 'MISO', 'SCK'] }
      ],
      // 他のコンポーネントタイプ...
    }

    return templates[componentType] || []
  }

  // 必須ポートの取得
  private getEssentialPorts(componentType: string): PortDefinition[] {
    // 電源と基本的な通信ポートのみ
    return [
      { id: 'vcc', name: 'VCC', type: 'power', direction: 'input', position: 'left' },
      { id: 'gnd', name: 'GND', type: 'power', direction: 'input', position: 'left' },
      { id: 'tx', name: 'TX', type: 'communication', direction: 'output', position: 'right' },
      { id: 'rx', name: 'RX', type: 'communication', direction: 'input', position: 'right' }
    ]
  }

  // 遅延ポートジェネレータの取得
  private getLazyPortGenerators(
    componentType: string,
    specifications: Record<string, any>
  ): Map<string, () => PortDefinition[]> {
    const generators = new Map<string, () => PortDefinition[]>()
    
    // デジタルポート用ジェネレータ
    generators.set('digital', () => {
      const count = specifications.digitalPins || 14
      return Array.from({ length: count }, (_, i) => ({
        id: `d${i}`,
        name: `D${i}`,
        type: 'digital',
        direction: 'bidirectional',
        position: 'right'
      }))
    })

    // アナログポート用ジェネレータ
    generators.set('analog', () => {
      const count = specifications.analogPins || 6
      return Array.from({ length: count }, (_, i) => ({
        id: `a${i}`,
        name: `A${i}`,
        type: 'analog',
        direction: 'input',
        position: 'left'
      }))
    })

    return generators
  }

  // ポートを含めるべきかの判定
  private shouldIncludePort(template: any, specifications: Record<string, any>): boolean {
    // 仕様に基づいてポートの必要性を判定
    if (template.type === 'communication') {
      const protocols = specifications.communication?.split('/') || []
      return protocols.some(p => template.names?.some(n => n.includes(p)))
    }
    
    return true // デフォルトは含める
  }

  // ポートの作成
  private createPort(template: any, specifications: Record<string, any>): PortDefinition {
    return {
      id: `port-${template.type}-${Date.now()}`,
      name: template.name || template.type,
      type: template.type,
      direction: template.direction || 'bidirectional',
      position: template.position || 'right',
      capacity: template.capacity || 1,
      protocol: template.protocol
    }
  }

  // ポートグループの生成
  private generatePortGroups(ports: PortDefinition[]): Record<string, PortDefinition[]> {
    const groups: Record<string, PortDefinition[]> = {}
    
    for (const port of ports) {
      const groupKey = port.type || 'other'
      if (!groups[groupKey]) {
        groups[groupKey] = []
      }
      groups[groupKey].push(port)
    }
    
    return groups
  }

  // 仕様変更の検出
  private detectSpecificationChanges(
    newSpecs: Record<string, any>,
    existingConfig: DynamicPortConfiguration
  ): Array<{ type: 'add' | 'remove' | 'update'; portId?: string; port?: PortDefinition; updates?: any }> {
    const changes: any[] = []
    
    // TODO: 実際の変更検出ロジックを実装
    // 現在は空の配列を返す（変更なし）
    
    return changes
  }

  // キャッシュキーの生成
  private generateCacheKey(componentType: string, specifications: Record<string, any>): PortCacheKey {
    const specHash = this.hashObject(specifications)
    return `${componentType}-${specHash}`
  }

  // オブジェクトのハッシュ化
  private hashObject(obj: any): string {
    return JSON.stringify(obj, Object.keys(obj).sort())
      .split('')
      .reduce((hash, char) => ((hash << 5) - hash) + char.charCodeAt(0), 0)
      .toString(36)
  }

  // キャッシュから設定を取得
  private getCachedConfig(key: PortCacheKey): DynamicPortConfiguration | null {
    const cached = this.cache.get(key)
    if (!cached) return null

    const age = Date.now() - cached.timestamp
    if (age > this.config.cacheExpiry) {
      this.cache.delete(key)
      return null
    }

    // アクセスカウントを増やす
    cached.accessCount++
    
    return cached.config
  }

  // 設定をキャッシュに保存
  private cacheConfig(key: PortCacheKey, config: DynamicPortConfiguration, metrics: any): void {
    const entry: CachedPortConfig = {
      config,
      timestamp: Date.now(),
      accessCount: 1,
      generationTime: metrics.duration
    }

    this.cache.set(key, entry)

    // キャッシュサイズ制限
    if (this.cache.size > this.config.maxCacheSize) {
      // LRU: 最も使用頻度の低いエントリを削除
      const leastUsed = Array.from(this.cache.entries())
        .sort(([, a], [, b]) => a.accessCount - b.accessCount)[0]
      
      if (leastUsed) {
        this.cache.delete(leastUsed[0])
      }
    }
  }

  // キャッシュのクリア
  clearCache(): void {
    this.cache.clear()
  }

  // 統計情報の取得
  getStats(): {
    cacheSize: number
    cacheHitRate: number
    averageGenerationTime: number
  } {
    const entries = Array.from(this.cache.values())
    const totalAccess = entries.reduce((sum, e) => sum + e.accessCount, 0)
    const totalGenTime = entries.reduce((sum, e) => sum + e.generationTime, 0)

    return {
      cacheSize: this.cache.size,
      cacheHitRate: totalAccess > 0 ? (totalAccess - entries.length) / totalAccess : 0,
      averageGenerationTime: entries.length > 0 ? totalGenTime / entries.length : 0
    }
  }
}

// グローバルインスタンス
export const portGenerationOptimizer = new PortGenerationOptimizer()

// React Hook for optimized port generation
export function useOptimizedPortGeneration() {
  const generatePorts = React.useCallback(async (
    componentType: string,
    specifications: Record<string, any>,
    existingConfig?: DynamicPortConfiguration
  ) => {
    return await portGenerationOptimizer.generatePorts(
      componentType,
      specifications,
      existingConfig
    )
  }, [])

  return {
    generatePorts,
    clearCache: () => portGenerationOptimizer.clearCache(),
    stats: portGenerationOptimizer.getStats()
  }
}