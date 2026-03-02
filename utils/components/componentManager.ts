// 🎯 コンポーネント管理システム
// AI検索とポート生成を統合したコンポーネント追加フロー

import { useCallback, useMemo } from 'react'
import { AISpecificationService } from '../ai/core/aiSpecificationService'
import { DynamicPortSystem } from '../connections/ports/dynamicPortSystem'
import type { NodeData } from '@/types/canvas'
import type { Node } from '@xyflow/react'

export interface ComponentAdditionRequest {
  componentName: string
  position: { x: number; y: number }
  addedFrom: 'chat' | 'diagram' | 'manual'
  userId?: string
}

export interface ComponentAdditionResult {
  success: boolean
  node?: Node<NodeData>
  error?: string
  aiSearchPerformed: boolean
  portsGenerated: boolean
}

/**
 * 🚀 ComponentManager
 * コンポーネント追加の統合管理クラス
 * AI検索 → 仕様取得 → ポート生成 → ノード作成を一元管理
 */
export class ComponentManager {
  private static instance: ComponentManager
  private aiService: AISpecificationService
  private portSystem: DynamicPortSystem

  constructor() {
    // AIサービスはサーバーサイドでのみ初期化
    if (typeof window === 'undefined') {
      this.aiService = AISpecificationService.getInstance()
    } else {
      this.aiService = null as any
    }
    this.portSystem = DynamicPortSystem.getInstance()
  }

  public static getInstance(): ComponentManager {
    if (!ComponentManager.instance) {
      ComponentManager.instance = new ComponentManager()
    }
    return ComponentManager.instance
  }

  /**
   * 🎨 コンポーネントをAI検索付きで追加
   */
  public async addComponentWithAI(
    request: ComponentAdditionRequest
  ): Promise<ComponentAdditionResult> {
    console.log(`Adding component: ${request.componentName} from ${request.addedFrom}`)

    try {
      // 1. AI仕様検索を実行
      const searchResult = await this.performAISearch(request.componentName)
      
      if (!searchResult) {
        // AI検索失敗時は基本的なノードを作成
        return this.createBasicNode(request)
      }

      // 2. 仕様からポートを生成
      const nodeId = `node-${Date.now()}`
      const portConfig = this.portSystem.generatePortsFromSpecification(
        nodeId,
        searchResult.specification
      )
      
      console.log('🔌 Generated port configuration:', {
        nodeId,
        portGroups: portConfig.portGroups,
        totalGroups: portConfig.portGroups.length,
        totalPorts: portConfig.portGroups.reduce((sum, group) => sum + group.ports.length, 0)
      })
      
      // Debug: Log connector ports specifically
      const connectorGroup = portConfig.portGroups.find(g => g.id === 'connectors')
      if (connectorGroup) {
        console.log('🔌 Connector ports found:', {
          count: connectorGroup.ports.length,
          ports: connectorGroup.ports
        })
      } else {
        console.log('⚠️ No connector group found in port configuration')
      }

      // 3. Nodeデータを構築
      console.log('📦 Building node data from specification:', {
        name: searchResult.specification.name,
        category: searchResult.specification.category,
        voltage: searchResult.specification.voltage,
        protocols: searchResult.specification.communication.protocols,
        pins: searchResult.specification.communication.pins
      })
      
      console.log('🔧 Full specification object being saved to node.data.specifications:', searchResult.specification)
      
      const node: Node<NodeData> = {
        id: nodeId,
        type: 'system',
        position: request.position,
        data: {
          title: searchResult.specification.name, // Changed from label to title
          label: searchResult.specification.name, // Keep for compatibility
          type: 'primary' as const, // Required field
          inputs: portConfig.portGroups.filter(g => g.type === 'input').length,
          outputs: portConfig.portGroups.filter(g => g.type === 'output').length,
          category: searchResult.specification.category,
          
          // AI取得データ
          voltage: searchResult.specification.voltage.operating.join(', '),
          communication: searchResult.specification.communication.protocols.join(', '),
          power_consumption: `${searchResult.specification.power.consumption.typical}mA`,
          
          // ポート情報
          ports: (() => {
            const allPorts = portConfig.portGroups.flatMap(group => 
              group.ports.map(port => ({
                id: port.id,
                label: port.label,
                type: port.type,
                protocol: port.protocol, // Add protocol field for connector identification
                direction: port.direction,
                position: port.position,
                voltage: port.voltage,
                description: port.description
              }))
            )
            
            // Debug: Log final ports array
            console.log('📍 Final ports array:', {
              totalPorts: allPorts.length,
              connectorPorts: allPorts.filter(p => p.protocol === 'USB' || p.position?.side === 'bottom'),
              allPorts: allPorts
            })
            
            return allPorts
          })(),
          
          // 動的ポート設定
          dynamicPorts: portConfig,
          
          // 仕様全体
          specifications: searchResult.specification,
          
          // AI検索結果から詳細説明を生成
          description: this.generateDescriptionFromSpec(searchResult.specification),
          
          // メタデータ
          aiSearchConfidence: searchResult.searchMetadata.confidenceScore,
          addedFrom: request.addedFrom,
          addedAt: new Date().toISOString(),
          
          // チャットから追加された場合は承認が必要
          needsApproval: request.addedFrom === 'chat',
          isApproved: request.addedFrom !== 'chat'
        }
      }

      return {
        success: true,
        node,
        aiSearchPerformed: true,
        portsGenerated: true
      }

    } catch (error) {
      console.error('Failed to add component with AI:', error)
      
      // エラー時は基本的なノードを作成
      return this.createBasicNode(request, error as Error)
    }
  }

  /**
   * 🎨 仕様データから詳細説明を生成
   */
  private generateDescriptionFromSpec(spec: any): string {
    console.log('🎨 ComponentManager: Generating description from specification:', {
      specKeys: spec ? Object.keys(spec) : [],
      hasVoltage: !!spec?.voltage,
      hasCommunication: !!spec?.communication,
      hasMarketData: !!spec?.marketData
    });

    const parts: string[] = [`${spec.category || 'Component'}: ${spec.name}`];
    
    // 物理仕様
    if (spec.physical) {
      if (spec.physical.pins) {
        parts.push(`${spec.physical.pins}ピン`);
      }
      if (spec.physical.package) {
        parts.push(spec.physical.package);
      }
    }
    
    // 電圧仕様
    if (spec.voltage?.operating?.length > 0) {
      const voltageStr = spec.voltage.operating.map((v: any) => 
        typeof v === 'string' ? v : (typeof v === 'object' && v.value ? v.value : String(v))
      ).join('/');
      parts.push(`動作電圧: ${voltageStr}`);
    }
    
    // 消費電力
    if (spec.power?.consumption?.typical) {
      parts.push(`消費電力: ${spec.power.consumption.typical}mA (typ)`);
    }
    
    // 通信プロトコル
    if (spec.communication?.protocols?.length > 0) {
      parts.push(`通信: ${spec.communication.protocols.join(', ')}`);
    }
    
    const result = parts.join(' | ');
    console.log('✅ ComponentManager: Generated description:', {
      partsCount: parts.length,
      result
    });
    
    return result;
  }

  /**
   * 🔍 AI仕様検索の実行
   */
  private async performAISearch(componentName: string) {
    console.log(`🔎 Starting AI search for: ${componentName}`)
    try {
      // クライアントサイドではAPIエンドポイントを使用
      if (typeof window !== 'undefined') {
        console.log('🌐 Using client-side API endpoint')
        const response = await fetch('/api/search-component', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ componentName }),
        })

        console.log(`📡 API response status: ${response.status}`)
        if (!response.ok) {
          throw new Error(`API error: ${response.statusText}`)
        }

        const result = await response.json()
        console.log(`✅ AI search result:`, result)
        console.log(`🔍 AI search specification details:`, {
          hasSpecification: !!result.specification,
          specificationKeys: result.specification ? Object.keys(result.specification) : [],
          hasMarketData: !!result.specification?.marketData,
          hasVoltage: !!result.specification?.voltage,
          hasCommunication: !!result.specification?.communication
        })
        
        // 信頼度チェック
        if (result.specification?.reliability?.confidence < 50) {
          console.warn(`Low confidence (${result.specification.reliability.confidence}%) for ${componentName}`)
        }

        return result
      } else {
        // サーバーサイドでは直接AI検索を実行
        if (!this.aiService) {
          throw new Error('AI service not available')
        }
        
        const result = await this.aiService.searchComponentSpecification({
          componentName,
          searchDepth: 'detailed',
          includeAlternatives: false,
          focusAreas: ['power', 'communication', 'compatibility', 'pinout']
        })

        // 信頼度チェック
        if (result.specification.reliability.confidence < 50) {
          console.warn(`Low confidence (${result.specification.reliability.confidence}%) for ${componentName}`)
        }

        return result
      }

    } catch (error) {
      console.error('AI search failed:', error)
      return null
    }
  }

  /**
   * 🏗️ 基本的なノードの作成（AI検索なし）
   */
  private createBasicNode(
    request: ComponentAdditionRequest, 
    error?: Error
  ): ComponentAdditionResult {
    const nodeId = `node-${Date.now()}`
    
    const node: Node<NodeData> = {
      id: nodeId,
      type: 'system',
      position: request.position,
      data: {
        label: request.componentName,
        category: 'unknown',
        
        // デフォルト値
        voltage: 'Unknown',
        communication: 'Unknown',
        
        // 基本的なポート
        ports: [
          { id: 'power', label: 'Power', type: 'power', direction: 'input' },
          { id: 'gnd', label: 'GND', type: 'power', direction: 'input' }
        ],
        
        // メタデータ
        addedFrom: request.addedFrom,
        addedAt: new Date().toISOString(),
        needsApproval: request.addedFrom === 'chat',
        isApproved: request.addedFrom !== 'chat',
        
        // エラー情報
        aiSearchFailed: true,
        aiSearchError: error?.message
      }
    }

    return {
      success: true,
      node,
      error: error?.message,
      aiSearchPerformed: false,
      portsGenerated: false
    }
  }

  /**
   * 📊 既存ノードの仕様を更新
   */
  public async updateNodeSpecifications(
    nodeId: string,
    componentName: string
  ): Promise<boolean> {
    try {
      const searchResult = await this.performAISearch(componentName)
      if (!searchResult) return false

      // ポート再生成
      const portConfig = this.portSystem.generatePortsFromSpecification(
        nodeId,
        searchResult.specification
      )

      // TODO: ノードデータの更新処理をここに実装
      // これはReact FlowのsetNodes経由で行う必要がある

      return true
    } catch (error) {
      console.error('Failed to update node specifications:', error)
      return false
    }
  }

  /**
   * 🔄 バッチ処理でコンポーネントを追加
   */
  public async addComponentsBatch(
    requests: ComponentAdditionRequest[]
  ): Promise<ComponentAdditionResult[]> {
    // 並行処理で効率化
    const results = await Promise.all(
      requests.map(request => this.addComponentWithAI(request))
    )

    return results
  }
}

// ファクトリー関数
export function createComponentManager(): ComponentManager {
  return ComponentManager.getInstance()
}

// React Hook
export function useComponentManager() {
  const manager = useMemo(() => ComponentManager.getInstance(), [])

  const addComponent = useCallback(
    async (name: string, position: { x: number; y: number }, from: 'chat' | 'diagram' = 'diagram') => {
      return await manager.addComponentWithAI({
        componentName: name,
        position,
        addedFrom: from
      })
    },
    [manager]
  )

  const updateComponent = useCallback(
    async (nodeId: string, componentName: string) => {
      return await manager.updateNodeSpecifications(nodeId, componentName)
    },
    [manager]
  )

  return {
    addComponent,
    updateComponent,
    addBatch: manager.addComponentsBatch.bind(manager)
  }
}