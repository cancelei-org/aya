// 🆕 Phase 6: AI回答から部品提案を抽出するユーティリティ
// AI回答に含まれるJSONフォーマットの部品提案を解析

import type { NodeType, Connection, NodeData } from '@/types'
import type { Node } from '@xyflow/react'
import { ComponentManager } from '../../components/componentManager'

// 部品タイプ別のデフォルト値マッピング
const DEFAULT_COMPONENT_SPECS: Record<string, { voltage: string; communication: string }> = {
  // Arduino系
  'arduino': { voltage: '5V', communication: 'USB/Serial' },
  'arduino uno': { voltage: '5V', communication: 'USB/Serial/I2C/SPI' },
  'arduino nano': { voltage: '5V', communication: 'USB/Serial/I2C/SPI' },
  'arduino mega': { voltage: '5V', communication: 'USB/Serial/I2C/SPI' },
  
  // ESP系
  'esp32': { voltage: '3.3V', communication: 'WiFi/Bluetooth/I2C/SPI/UART' },
  'esp8266': { voltage: '3.3V', communication: 'WiFi/I2C/SPI/UART' },
  
  // センサー系
  'temperature sensor': { voltage: '3.3V-5V', communication: 'Analog/I2C' },
  'humidity sensor': { voltage: '3.3V-5V', communication: 'I2C/Digital' },
  'pressure sensor': { voltage: '3.3V-5V', communication: 'I2C/SPI' },
  'accelerometer': { voltage: '3.3V', communication: 'I2C/SPI' },
  'gyroscope': { voltage: '3.3V', communication: 'I2C/SPI' },
  
  // アクチュエーター系
  'servo motor': { voltage: '5V-6V', communication: 'PWM' },
  'stepper motor': { voltage: '5V-12V', communication: 'Digital/Step+Dir' },
  'dc motor': { voltage: '3V-12V', communication: 'PWM' },
  
  // 表示系
  'lcd display': { voltage: '5V', communication: 'I2C/Parallel' },
  'oled display': { voltage: '3.3V', communication: 'I2C/SPI' },
  'led': { voltage: '3.3V-5V', communication: 'Digital/PWM' },
  
  // 電源系
  'voltage regulator': { voltage: 'Various', communication: 'N/A' },
  'battery': { voltage: 'Various', communication: 'N/A' },
  'power supply': { voltage: 'Various', communication: 'N/A' },
  
  // 抵抗・コンデンサ系
  'resistor': { voltage: 'Various', communication: 'N/A' },
  'capacitor': { voltage: 'Various', communication: 'N/A' },
  
  // 汎用デフォルト
  'default': { voltage: '5V', communication: 'Digital' }
}

/**
 * 部品名から推定されるデフォルト仕様を取得
 */
function getDefaultSpecs(componentName: string): { voltage: string; communication: string } {
  const name = componentName.toLowerCase()
  
  // 完全一致チェック
  for (const [key, specs] of Object.entries(DEFAULT_COMPONENT_SPECS)) {
    if (name === key) {
      return specs
    }
  }
  
  // 部分一致チェック
  for (const [key, specs] of Object.entries(DEFAULT_COMPONENT_SPECS)) {
    if (name.includes(key) || key.includes(name)) {
      return specs
    }
  }
  
  // デフォルト値
  return DEFAULT_COMPONENT_SPECS.default
}

export interface ComponentSuggestion {
  name: string
  modelNumber?: string
  description?: string
  voltage?: string
  communication?: string
  reasoning?: string
}

export interface ComponentSuggestionsResponse {
  suggestions: ComponentSuggestion[]
}

export interface SystemConnection {
  from: string
  to: string
  type: string
  description: string
}

export interface SystemSuggestion {
  systemName: string
  description: string
  components: ComponentSuggestion[]
  connections: SystemConnection[]
  additionalComponents: string[]
}

export interface SystemSuggestionsResponse {
  systemName: string
  description: string
  components: ComponentSuggestion[]
  connections: SystemConnection[]
  additionalComponents: string[]
}

/**
 * 🔍 AI回答からJSONフォーマットの部品提案を抽出（詳細ログ強化版）
 */
export function extractComponentSuggestions(aiResponse: string): ComponentSuggestion[] {
  try {
    console.log('🔍 Extracting component suggestions from AI response...')
    console.log('📄 AI Response length:', aiResponse.length)
    console.log('📄 AI Response preview (first 500 chars):', aiResponse.substring(0, 500))
    
    // JSONマーカーを探す
    const startMarker = 'COMPONENT_SUGGESTIONS_JSON_START'
    const endMarker = 'COMPONENT_SUGGESTIONS_JSON_END'
    
    const startIndex = aiResponse.indexOf(startMarker)
    const endIndex = aiResponse.indexOf(endMarker)
    
    console.log('🔍 Marker search results:', {
      startMarker: startMarker,
      endMarker: endMarker,
      startIndex: startIndex,
      endIndex: endIndex,
      hasStartMarker: startIndex !== -1,
      hasEndMarker: endIndex !== -1
    })
    
    if (startIndex === -1 || endIndex === -1) {
      console.log('❌ No component suggestions JSON markers found')
      console.log('📄 Checking for alternative patterns in response...')
      
      // 代替パターンをチェック
      const altPatterns = [
        'COMPONENT_SUGGESTIONS',
        'component_suggestions',
        '"suggestions"',
        '"name"',
        '"voltage"',
        '"communication"'
      ]
      
      altPatterns.forEach(pattern => {
        const found = aiResponse.toLowerCase().includes(pattern.toLowerCase())
        console.log(`  - Contains "${pattern}": ${found}`)
      })
      
      return []
    }
    
    // JSONテキストを抽出
    const jsonText = aiResponse.substring(
      startIndex + startMarker.length,
      endIndex
    ).trim()
    
    console.log('📄 Extracted JSON text (full):', jsonText)
    console.log('📄 JSON text length:', jsonText.length)
    
    // JSONをパース
    const parsed: ComponentSuggestionsResponse = JSON.parse(jsonText)
    
    console.log('📋 Parsed JSON object:', JSON.stringify(parsed, null, 2))
    
    if (!parsed.suggestions || !Array.isArray(parsed.suggestions)) {
      console.log('❌ Invalid suggestions format:', {
        hasSuggestions: !!parsed.suggestions,
        isArray: Array.isArray(parsed.suggestions),
        type: typeof parsed.suggestions,
        keys: Object.keys(parsed)
      })
      return []
    }
    
    // バリデーション（詳細ログ付き）
    console.log('🔍 Validating suggestions...')
    const validSuggestions = parsed.suggestions.filter((suggestion, index) => {
      const isValid = suggestion.name && suggestion.name.trim().length > 0
      console.log(`  Suggestion ${index + 1}:`, {
        name: suggestion.name,
        modelNumber: suggestion.modelNumber,
        voltage: suggestion.voltage,        // 🔍 Voltage情報をログ
        communication: suggestion.communication, // 🔍 Communication情報をログ
        description: suggestion.description,
        reasoning: suggestion.reasoning,
        isValid: isValid
      })
      return isValid
    })
    
    console.log(`✅ Extracted ${validSuggestions.length} valid component suggestions`)
    
    // デフォルト値を適用（空の場合のみ）
    const suggestionsWithDefaults = validSuggestions.map((suggestion, index) => {
      const hasVoltage = suggestion.voltage && suggestion.voltage.trim().length > 0
      const hasCommunication = suggestion.communication && suggestion.communication.trim().length > 0
      
      if (hasVoltage && hasCommunication) {
        // 両方のデータがある場合はそのまま
        return suggestion
      }
      
      // デフォルト値を取得
      const defaultSpecs = getDefaultSpecs(suggestion.name)
      
      const enhanced = {
        ...suggestion,
        voltage: hasVoltage ? suggestion.voltage : defaultSpecs.voltage,
        communication: hasCommunication ? suggestion.communication : defaultSpecs.communication
      }
      
      console.log(`🔧 Applied defaults to "${suggestion.name}":`)
      console.log(`     - Voltage: "${suggestion.voltage || 'MISSING'}" → "${enhanced.voltage}"`)
      console.log(`     - Communication: "${suggestion.communication || 'MISSING'}" → "${enhanced.communication}"`)
      
      return enhanced
    })
    
    console.log('📊 Final Voltage/Communication data summary:')
    suggestionsWithDefaults.forEach((suggestion, index) => {
      console.log(`  ${index + 1}. ${suggestion.name}:`)
      console.log(`     - Voltage: "${suggestion.voltage}"`)
      console.log(`     - Communication: "${suggestion.communication}"`)
      console.log(`     - Model: "${suggestion.modelNumber || 'MISSING'}"`)
    })
    
    return suggestionsWithDefaults
    
  } catch (error) {
    console.error('❌ Error extracting component suggestions:', error)
    console.error('❌ Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    return []
  }
}

/**
 * 🏗️ AI回答からJSONフォーマットのシステム提案を抽出
 */
export function extractSystemSuggestions(aiResponse: string): SystemSuggestionsResponse | null {
  try {
    console.log('🏗️ Extracting system suggestions from AI response...')
    
    // JSONマーカーを探す
    const startMarker = 'SYSTEM_SUGGESTIONS_JSON_START'
    const endMarker = 'SYSTEM_SUGGESTIONS_JSON_END'
    
    const startIndex = aiResponse.indexOf(startMarker)
    const endIndex = aiResponse.indexOf(endMarker)
    
    if (startIndex === -1 || endIndex === -1) {
      console.log('❌ No system suggestions JSON markers found')
      return null
    }
    
    // JSONテキストを抽出
    const jsonText = aiResponse.substring(
      startIndex + startMarker.length,
      endIndex
    ).trim()
    
    console.log('📄 Extracted system JSON text:', jsonText.substring(0, 200) + '...')
    
    // JSONをパース
    const parsed: SystemSuggestionsResponse = JSON.parse(jsonText)
    
    if (!parsed.systemName || !parsed.components || !Array.isArray(parsed.components)) {
      console.log('❌ Invalid system suggestions format')
      return null
    }
    
    // バリデーション
    const validComponents = parsed.components.filter(component => {
      return component.name && component.name.trim().length > 0
    })
    
    if (validComponents.length === 0) {
      console.log('❌ No valid components in system suggestion')
      return null
    }
    
    console.log(`✅ Extracted system "${parsed.systemName}" with ${validComponents.length} components`)
    validComponents.forEach((component, index) => {
      console.log(`  ${index + 1}. ${component.name} (${component.modelNumber || 'No model'})`)
    })
    
    // 🔗 接続情報のデバッグ
    console.log(`🔗 Connection data in AI response:`, {
      hasConnections: !!parsed.connections,
      connectionsLength: parsed.connections?.length || 0,
      connectionsData: parsed.connections
    })
    
    return {
      ...parsed,
      components: validComponents
    }
    
  } catch (error) {
    console.error('❌ Error extracting system suggestions:', error)
    return null
  }
}

/**
 * 🔧 コンポーネント提案をNodeに変換（AI検索統合版）
 */
export async function convertSuggestionToCanvasNode(
  suggestion: ComponentSuggestion,
  position: { x: number; y: number },
  suggestionId: string,
  onApprove?: (nodeId: string) => void,
  onReject?: (nodeId: string) => void
): Promise<Node<NodeData>> {
  // 🤖 ComponentManagerを使用してAI検索付きでノードを作成
  const componentManager = ComponentManager.getInstance()
  
  try {
    const result = await componentManager.addComponentWithAI({
      componentName: suggestion.name,
      position: position,
      addedFrom: 'chat'
    })
    
    if (result.success && result.node) {
      // AI検索成功：詳細な仕様とポート情報を含むノード
      return {
        ...result.node,
        id: suggestionId, // 指定されたIDを使用
        type: 'system', // systemノードタイプを使用
        data: {
          ...result.node.data,
          // 既存のフィールドとの互換性
          title: result.node.data.label,
          description: suggestion.description || result.node.data.description || '',
          modelNumber: suggestion.modelNumber || '',
          // 承認/却下ハンドラ
          onApprove: onApprove ? async () => await onApprove(suggestionId) : undefined,
          onReject: onReject ? () => onReject(suggestionId) : undefined,
          // AI提案情報
          aiReasoning: suggestion.reasoning || '',
          aiSearchPerformed: result.aiSearchPerformed,
          portsGenerated: result.portsGenerated
        }
      }
    } else {
      // AI検索失敗：フォールバックノード
      return createFallbackSuggestionNode(suggestion, position, suggestionId, onApprove, onReject)
    }
  } catch (error) {
    console.error('Failed to create node with AI search:', error)
    return createFallbackSuggestionNode(suggestion, position, suggestionId, onApprove, onReject)
  }
}

/**
 * 🎲 AI検索失敗時のフォールバックノード
 */
function createFallbackSuggestionNode(
  suggestion: ComponentSuggestion,
  position: { x: number; y: number },
  suggestionId: string,
  onApprove?: (nodeId: string) => void,
  onReject?: (nodeId: string) => void
): Node<NodeData> {
  // 部品名からデフォルト仕様を取得
  const defaultSpecs = getDefaultSpecs(suggestion.name)
  
  return {
    id: suggestionId,
    position: position,
    type: 'system',
    data: {
      title: suggestion.name,
      label: suggestion.name,
      category: 'unknown',
      inputs: 1,
      outputs: 1,
      description: suggestion.description || '',
      voltage: suggestion.voltage || defaultSpecs.voltage,
      communication: suggestion.communication || defaultSpecs.communication,
      modelNumber: suggestion.modelNumber || '',
      orderStatus: 'Unordered',
      // 🆕 Phase 6: 仮承認状態のプロパティ
      isPending: true,
      suggestionId: suggestionId,
      aiReasoning: suggestion.reasoning || '',
      onApprove: onApprove ? async () => await onApprove(suggestionId) : undefined,
      onReject: onReject ? () => onReject(suggestionId) : undefined,
      // チャットからの追加
      addedFrom: 'chat',
      needsApproval: true,
      isApproved: false,
      // AI検索失敗マーカー
      aiSearchFailed: true
    }
  }
}

/**
 * 🏗️ システム提案を複数のCanvasNodeに変換（個別承認対応）
 */
export function convertSystemToCanvasNodes(
  systemSuggestion: SystemSuggestionsResponse,
  startPosition: { x: number; y: number },
  suggestionId: string
): Node<NodeData>[] {
  const nodes: Node<NodeData>[] = []
  
  // Import calculateComponentLayout
  const { calculateComponentLayout } = require('../../layout/componentLayoutCalculator')
  
  // Map components with category information
  const componentsWithCategory = systemSuggestion.components.map((component, index) => {
    const nodeId = `component-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`
    return {
      id: nodeId,
      title: component.name,
      category: getCategoryFromComponent(component),
      component: component,
      individualSuggestionId: `${suggestionId}-component-${index}`
    }
  })
  
  // Calculate positions using category-based layout
  const layoutPositions = calculateComponentLayout(
    componentsWithCategory,
    {
      startX: startPosition.x,
      startY: startPosition.y,
      horizontalGap: 250,  // Keep original spacing
      verticalGap: 30,
      categoryGap: 400
    }
  )
  
  // Create nodes with calculated positions
  componentsWithCategory.forEach((item) => {
    const position = layoutPositions.get(item.id) || startPosition
    
    const node: Node<NodeData> = {
      id: item.id,
      position: position,
      type: 'warning', // システム提案ノードは warning タイプで視覚的に区別
      data: {
        title: item.component.name,
        inputs: 2,
        outputs: 2,
        description: item.component.description || '',
        voltage: item.component.voltage || '',
        communication: item.component.communication || '',
        modelNumber: item.component.modelNumber || '',
        orderStatus: 'Unordered',
        // 個別承認用のプロパティ
        isPending: true,
        suggestionId: item.individualSuggestionId, // 個別ID
        aiReasoning: `${item.component.reasoning || ''}`
      }
    }
    
    nodes.push(node)
  })
  
  console.log(`✅ Converted system "${systemSuggestion.systemName}" to ${nodes.length} individual components`)
  
  return nodes
}

/**
 * 🔗 システム提案から接続線を生成
 */
export function convertSystemToConnections(
  systemSuggestion: SystemSuggestionsResponse,
  nodes: Node<NodeData>[]
): Connection[] {
  console.log('🔗 convertSystemToConnections called')
  console.log('🔗 systemSuggestion.connections:', systemSuggestion.connections)
  console.log('🔗 nodes:', nodes.length, nodes.map(n => n.data?.title))
  
  const connections: Connection[] = []
  
  if (!systemSuggestion.connections || systemSuggestion.connections.length === 0) {
    console.log('⚠️ No connections defined in system suggestion')
    return connections
  }
  
  systemSuggestion.connections.forEach((connection, index) => {
    // 部品名からノードIDを特定
    const fromNode = nodes.find(node => 
      node.data?.title?.includes(connection.from) || 
      node.data?.modelNumber?.includes(connection.from) ||
      connection.from.includes(node.data?.title || '')
    )
    
    const toNode = nodes.find(node => 
      node.data?.title?.includes(connection.to) || 
      node.data?.modelNumber?.includes(connection.to) ||
      connection.to.includes(node.data?.title || '')
    )
    
    if (fromNode && toNode) {
      const connectionId = `system-connection-${Date.now()}-${index}`
      
      connections.push({
        id: connectionId,
        fromId: fromNode.id,
        toId: toNode.id,
        fromPort: 'output-center',
        toPort: 'input-center'
      })
      
      console.log(`🔗 Created connection: ${fromNode.data?.title} → ${toNode.data?.title}`)
    } else {
      console.log(`⚠️ Could not find nodes for connection: ${connection.from} → ${connection.to}`)
      if (!fromNode) console.log(`   Missing fromNode: ${connection.from}`)
      if (!toNode) console.log(`   Missing toNode: ${connection.to}`)
    }
  })
  
  console.log(`✅ Generated ${connections.length} connections from system suggestion`)
  return connections
}

/**
 * 📍 新しいノードの配置位置を計算
 */
export function calculateSuggestionPosition(
  existingNodes: Node<NodeData>[],
  suggestionIndex: number
): { x: number; y: number } {
  // 基本配置位置
  const baseX = 100
  const baseY = 100
  const spacing = 200
  
  // 既存ノードと重複しない位置を見つける
  const proposedX = baseX + (suggestionIndex * spacing)
  const proposedY = baseY + Math.floor(suggestionIndex / 5) * spacing
  
  // 既存ノードとの衝突チェック
  const isOccupied = existingNodes.some(node => 
    Math.abs((node.position?.x || 0) - proposedX) < 100 && Math.abs((node.position?.y || 0) - proposedY) < 100
  )
  
  if (isOccupied) {
    // 衝突する場合は下にずらす
    return {
      x: proposedX,
      y: proposedY + spacing
    }
  }
  
  return {
    x: proposedX,
    y: proposedY
  }
}

/**
 * 🎯 ユーザーメッセージが部品追加要求かどうかを判定
 */
export function isComponentAdditionRequest(message: string): boolean {
  const lowerMessage = message.toLowerCase()
  
  const additionKeywords = [
    'add', 'need', 'want', 'require', 'looking for',
    'sensor', 'motor', 'display', 'controller', 'module'
  ]
  
  return additionKeywords.some(keyword => lowerMessage.includes(keyword))
}

/**
 * 🔧 仮承認状態のノードを確定する
 */
export function approvePendingComponent(nodeId: string, nodes: Node<NodeData>[]): Node<NodeData>[] {
  console.log(`🔍 approvePendingComponent called with nodeId: ${nodeId}`)
  console.log(`📊 Total nodes before approval: ${nodes.length}`)
  console.log(`🎯 Pending nodes before approval: ${nodes.filter(n => n.data?.isPending).length}`)
  
  const targetNode = nodes.find(n => n.id === nodeId && n.data?.isPending)
  if (targetNode) {
    console.log(`✅ Found target node for approval: ${targetNode.data?.title} (${targetNode.id})`)
  } else {
    console.log(`❌ Target node not found or not pending: ${nodeId}`)
    console.log(`📋 Available pending nodes:`, nodes.filter(n => n.data?.isPending).map(n => ({ id: n.id, title: n.data?.title })))
  }
  
  const result = nodes.map(node => {
    if (node.id === nodeId && node.data?.isPending) {
      console.log(`✅ Approving node: ${node.data?.title} (${node.id})`)
      return {
        ...node,
        data: {
          ...node.data,
          isPending: false,
          suggestionId: undefined,
          aiReasoning: undefined
        },
        type: 'primary', // 承認されたノードは primary タイプに変更
      }
    }
    return node
  })
  
  console.log(`📊 Total nodes after approval: ${result.length}`)
  console.log(`🎯 Pending nodes after approval: ${result.filter(n => n.data?.isPending).length}`)
  
  return result
}

/**
 * 🗑️ 仮承認状態のノードを拒否・削除する
 */
export function rejectPendingComponent(nodeId: string, nodes: Node<NodeData>[]): Node<NodeData>[] {
  console.log(`🔍 rejectPendingComponent called with nodeId: ${nodeId}`)
  console.log(`📊 Total nodes before rejection: ${nodes.length}`)
  console.log(`🎯 Pending nodes before rejection: ${nodes.filter(n => n.data?.isPending).length}`)
  
  const targetNode = nodes.find(n => n.id === nodeId)
  if (targetNode) {
    console.log(`✅ Found target node for rejection: ${targetNode.data?.title} (${targetNode.id}), isPending: ${targetNode.data?.isPending}`)
  } else {
    console.log(`❌ Target node not found: ${nodeId}`)
    console.log(`📋 Available nodes:`, nodes.map(n => ({ id: n.id, title: n.data?.title, isPending: n.data?.isPending })))
  }
  
  const result = nodes.filter(node => node.id !== nodeId)
  
  console.log(`📊 Total nodes after rejection: ${result.length}`)
  console.log(`🎯 Pending nodes after rejection: ${result.filter(n => n.data?.isPending).length}`)
  
  return result
}

/**
 * 📊 現在の仮承認状態ノード数を取得
 */
export function getPendingComponentsCount(nodes: Node<NodeData>[]): number {
  return nodes.filter(node => node.data?.isPending).length
}

/**
 * 📋 仮承認状態のノード一覧を取得
 */
export function getPendingComponents(nodes: Node<NodeData>[]): Node<NodeData>[] {
  return nodes.filter(node => node.data?.isPending)
}

/**
 * 🏗️ システム配置位置を計算（コンポーネントが重複しないように）
 */
export function calculateSystemPosition(
  existingNodes: Node<NodeData>[]
): { x: number; y: number } {
  const baseX = 150
  const baseY = 150
  const systemSpacing = 600
  
  // 既存のシステム数を数えて配置位置を決定
  const existingSystems = existingNodes.filter(node => 
    node.data?.isPending && node.data?.suggestionId?.startsWith('system-')
  )
  
  const systemCount = Math.floor(existingSystems.length / 3) // 1システムあたり平均3コンポーネントと仮定
  
  return {
    x: baseX + (systemCount % 2) * systemSpacing,
    y: baseY + Math.floor(systemCount / 2) * systemSpacing
  }
}

/**
 * 🎯 ユーザーメッセージがシステム構成要求かどうかを判定
 */
export function isSystemSuggestionRequest(message: string): boolean {
  const lowerMessage = message.toLowerCase()
  
  const systemKeywords = [
    'make a', 'build a', 'create a', 'design a', 'want to make', 'want to build',
    'complete system', 'full setup', 'entire project', 'whole system',
    'temperature monitor', 'robotic arm', 'security system', 'weather station',
    'smart home', 'iot project', 'automation system'
  ]
  
  return systemKeywords.some(keyword => lowerMessage.includes(keyword))
}

/**
 * 🔧 システム内の全コンポーネントを一括承認
 */
export function approveSystemComponents(suggestionId: string, nodes: Node<NodeData>[]): Node<NodeData>[] {
  return nodes.map(node => {
    if (node.data?.suggestionId === suggestionId && node.data?.isPending) {
      return {
        ...node,
        type: 'primary' as NodeType,
        data: {
          ...node.data,
          isPending: false,
          suggestionId: undefined,
          aiReasoning: undefined
        }
      }
    }
    return node
  })
}

/**
 * 🗑️ システム内の全コンポーネントを一括拒否・削除
 */
export function rejectSystemComponents(suggestionId: string, nodes: Node<NodeData>[]): Node<NodeData>[] {
  return nodes.filter(node => node.data?.suggestionId !== suggestionId)
}

/**
 * 🧹 AI応答からJSONマーカーを除去してクリーンな応答を返す
 */
export function cleanAIResponse(aiResponse: string): string {
  let cleanedResponse = aiResponse

  // コンポーネント提案JSONマーカーを除去
  const componentStartMarker = 'COMPONENT_SUGGESTIONS_JSON_START'
  const componentEndMarker = 'COMPONENT_SUGGESTIONS_JSON_END'
  
  const componentStartIndex = cleanedResponse.indexOf(componentStartMarker)
  const componentEndIndex = cleanedResponse.indexOf(componentEndMarker)
  
  if (componentStartIndex !== -1 && componentEndIndex !== -1) {
    const beforeComponent = cleanedResponse.substring(0, componentStartIndex)
    const afterComponent = cleanedResponse.substring(componentEndIndex + componentEndMarker.length)
    cleanedResponse = beforeComponent + afterComponent
  }

  // システム提案JSONマーカーを除去
  const systemStartMarker = 'SYSTEM_SUGGESTIONS_JSON_START'
  const systemEndMarker = 'SYSTEM_SUGGESTIONS_JSON_END'
  
  const systemStartIndex = cleanedResponse.indexOf(systemStartMarker)
  const systemEndIndex = cleanedResponse.indexOf(systemEndMarker)
  
  if (systemStartIndex !== -1 && systemEndIndex !== -1) {
    const beforeSystem = cleanedResponse.substring(0, systemStartIndex)
    const afterSystem = cleanedResponse.substring(systemEndIndex + systemEndMarker.length)
    cleanedResponse = beforeSystem + afterSystem
  }

  // 余分な改行や空白を整理
  cleanedResponse = cleanedResponse
    .replace(/\n\s*\n\s*\n/g, '\n\n') // 3回以上の改行を2回に
    .trim()

  return cleanedResponse
}

/**
 * 🔄 ComponentSuggestion を Node に変換
 */
export function convertSuggestionToNode(
  suggestion: ComponentSuggestion,
  position: { x: number; y: number },
  suggestionId: string
): Node<NodeData> {
  return {
    id: `suggestion-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    position: position,
    type: 'warning' as NodeType, // 仮承認状態では warning タイプ
    data: {
      title: suggestion.name,
      inputs: 1,
      outputs: 1,
      description: suggestion.description || `AI suggested: ${suggestion.name}`,
      orderStatus: 'Unordered',
      estimatedOrderDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      quantity: 1,
      modelNumber: suggestion.modelNumber,
      voltage: suggestion.voltage,
      communication: suggestion.communication,
      isPending: true,
      suggestionId: suggestionId,
      aiReasoning: suggestion.reasoning
    }
  }
}

/**
 * 🔄 SystemSuggestion を複数の CanvasNode に変換
 */
export function convertSystemToNodes(
  systemSuggestion: SystemSuggestion,
  basePosition: { x: number; y: number },
  suggestionId: string
): Node<NodeData>[] {
  const nodes: Node<NodeData>[] = []
  
  // Import calculateComponentLayout at the top of file
  const { calculateComponentLayout } = require('../../layout/componentLayoutCalculator')
  
  // Map components with category information based on type
  const componentsWithCategory = systemSuggestion.components.map((component, index) => ({
    id: `suggestion-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
    title: component.name,
    category: getCategoryFromComponent(component), // Derive category from component
    component: component
  }))
  
  // Calculate positions using category-based layout
  const layoutPositions = calculateComponentLayout(
    componentsWithCategory,
    {
      startX: basePosition.x,
      startY: basePosition.y,
      horizontalGap: 200,
      verticalGap: 30,
      categoryGap: 400
    }
  )
  
  // Create nodes with calculated positions
  componentsWithCategory.forEach((item) => {
    const position = layoutPositions.get(item.id) || basePosition
    const node = convertSuggestionToNode(item.component, position, suggestionId)
    node.id = item.id // Use the same ID for consistency
    nodes.push(node)
  })

  return nodes
}

// Helper function to derive category from component
function getCategoryFromComponent(component: ComponentSuggestion): string {
  // Use component name or type to determine category
  const name = component.name.toLowerCase()
  
  if (name.includes('arduino') || name.includes('esp') || name.includes('microcontroller')) {
    return 'Microcontroller'
  } else if (name.includes('sensor') || name.includes('accelerometer') || name.includes('gyroscope')) {
    return 'Sensors'
  } else if (name.includes('motor') || name.includes('servo') || name.includes('actuator')) {
    return 'Actuators'
  } else if (name.includes('display') || name.includes('lcd') || name.includes('oled')) {
    return 'Display'
  } else if (name.includes('power') || name.includes('battery') || name.includes('regulator')) {
    return 'Power'
  } else if (name.includes('communication') || name.includes('wifi') || name.includes('bluetooth')) {
    return 'Communication'
  }
  
  return 'Other'
}