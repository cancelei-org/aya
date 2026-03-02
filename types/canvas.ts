// キャンバス・ノード・接続関連の型定義

import type { Node } from '@xyflow/react'
import type { OrderStatus } from './parts'

// ノードタイプ
export type NodeType = "primary" | "secondary" | "warning" | "accent"

// ノードデータ型 - React FlowのNode.dataフィールド用
export interface NodeData extends Record<string, unknown> {
  title: string
  type: NodeType
  subLabel?: string
  inputs: number
  outputs: number
  connections?: string[]
  voltage?: string
  communication?: string
  description?: string
  
  // 統合された買い物リスト情報
  modelNumber?: string
  orderStatus?: OrderStatus
  estimatedOrderDate?: Date | string // ISO date string
  purchaseSiteLink?: string
  quantity?: number
  
  // 調達管理専用フィールド
  notes?: string
  customPrice?: number  // User-editable custom pricing
  
  // 価格情報
  price?: string
  aiPricing?: any  // ComponentPricing型
  
  // 仕様書リンク
  datasheetUrl?: string
  
  // 新規部品自動追加システム
  isPending?: boolean      // 承認待ちフラグ
  suggestionId?: string    // 提案管理用ID
  aiReasoning?: string     // AI提案理由
  
  // 🤖 AI拡張メタデータ (フェーズ2)
  aiMetadata?: {
    confidence: number       // AI分析の信頼度 (0-100)
    lastVerified: string     // 最終検証日時
    sources: number          // 参照した情報源数
    alternatives: string[]   // 代替部品候補
    powerDetails?: {
      consumption: number      // 典型消費電力 (mA)
      maxConsumption: number   // 最大消費電力 (mA)
      supplyCapacity?: number  // 供給能力 (mA, 電源部品の場合)
    }
    communicationDetails?: {
      protocols: string[]                          // サポートプロトコル
      speeds: { [protocol: string]: string }       // プロトコル別速度
      pinConfigurations?: { [protocol: string]: string[] }  // ピン配置
    }
    searchHistory?: {
      lastSearched: string     // 最終検索日時
      tokensUsed: number       // 使用トークン数
      responseTime: number     // 応答時間 (ms)
      searchQueries: string[]  // 検索クエリ履歴
    }
    dynamicCompatibility?: {
      checkedConnections: string[]  // チェック済み接続ID
      lastCompatibilityCheck: string  // 最終互換性チェック日時
      compatibilityCache: { [connectionId: string]: boolean }  // 互換性キャッシュ
    }
    marketData?: {
      hasPricingData: boolean       // 価格データ有無
      hasLibraryData: boolean       // ライブラリデータ有無
      lastUpdated: string          // 最終更新日時
      pricingSuppliers: number     // 価格提供業者数
      libraryPlatforms: number     // ライブラリプラットフォーム数
    }
    // 🔌 動的ポートシステム (フェーズ3)
    dynamicPorts?: {
      configurationId?: string             // ポート構成ID
      hasCustomLayout: boolean             // カスタムレイアウト有無
      lastPortUpdate: string              // 最終ポート更新日時
      portCount: {                        // ポート数統計
        total: number
        power: number
        communication: number
        gpio: number
        analog: number
      }
      capacityWarnings: string[]          // 容量警告リスト
    }
  }
  
  // PBS・カテゴリ関連
  isPBSCategory?: boolean     // カテゴリノードかどうか
  source?: string            // データソース（'pbs', 'manual', etc.）
  pbsCategoryId?: string     // PBS カテゴリID（レガシー）
  pbsParentId?: string       // PBS 親カテゴリID（レガシー）
  
  // 🆕 空間的カテゴリシステム
  categoryId?: string        // 所属カテゴリID（新方式）
  nodeType?: 'part' | 'category'  // ノードタイプ
  relativePosition?: { x: number; y: number }  // カテゴリ内での固定相対位置
  
  // その他
  basePartId?: string
  instanceName?: string
  
  // イベントハンドラー
  onEdit?: () => void
  onDelete?: () => void
  onApprove?: () => void
  onReject?: () => void
}

// React Flow Node with custom data
export type AppNode = Node<NodeData>

// 🆕 CategoryNode専用のデータ構造
export interface CategoryNodeData extends NodeData {
  nodeType: 'category'
  bounds: {
    x: number
    y: number
    width: number
    height: number
  }
  isResizable: boolean
  memberNodes: string[]  // 自動計算される所属部品
  
  // カテゴリ操作コールバック
  onCategoryMove?: (
    categoryId: string,
    newBounds: { x: number; y: number; width: number; height: number },
    oldBounds: { x: number; y: number; width: number; height: number }
  ) => void
  onCategoryResize?: (
    categoryId: string,
    newBounds: { x: number; y: number; width: number; height: number }
  ) => void
}

// 🚀 React Flow完全移行: CanvasNode型廃止済み - Node<NodeData>を直接使用

// ✅ React Flow完全移行: CanvasNode互換ヘルパー削除済み
// React Flowの標準アクセス方法を使用:
// - 位置: node.position.x, node.position.y
// - データ: node.data.title, node.data.description

// React Flow完全移行: 互換性ヘルパー削除済み

// 接続
export interface Connection {
  id: string
  fromId: string
  toId: string
  fromPort: string
  toPort: string
  
  // React Flow互換プロパティ（オプション）
  source?: string         // fromIdと同じ値
  target?: string         // toIdと同じ値
  sourceHandle?: string   // fromPortと同じ値
  targetHandle?: string   // toPortと同じ値
  
  // 🆕 空間的カテゴリシステム
  connectionType?: 'physical' | 'logical'  // 接続タイプの明確化
  
  // 🔌 動的ポートシステム拡張 (フェーズ3)
  portConnection?: {
    fromPortId: string              // 送信側ポートID
    toPortId: string                // 受信側ポートID
    protocol?: string               // 使用プロトコル
    voltage?: string                // 接続電圧
    signalType?: 'power' | 'data' | 'analog' | 'digital'
    bandwidth?: string              // 帯域幅（通信の場合）
    currentRating?: number          // 電流定格（電力の場合）
    wireGauge?: string              // 推奨線径
    isVerified?: boolean            // 接続検証済み
    lastVerified?: string          // 最終検証日時
    warnings?: string[]            // 接続警告
    visualStyle?: {
      color?: string               // 接続線の色
      thickness?: number           // 線の太さ
      dashPattern?: number[]       // 破線パターン
      animated?: boolean           // アニメーション有無
    }
  }
}

// ノード位置
export interface NodePosition {
  x: number
  y: number
}

// 🔌 動的ポートシステム型定義 (フェーズ3)

// ポート定義
export interface PortDefinition {
  id: string
  label: string
  type: 'communication' | 'power'
  protocol?: string // I2C, SPI, UART, PWM, etc.
  voltage?: string // 3.3V, 5V, etc.
  direction: 'input' | 'output' | 'bidirectional'
  maxConnections: number // -1 for unlimited
  currentConnections: number
  position: PortPosition
  pinNumber?: number
  description?: string
  isRequired?: boolean // 必須ポートかどうか
  groupId?: string // 所属するポートグループID
}

// ポート位置
export interface PortPosition {
  side: 'top' | 'right' | 'bottom' | 'left'
  index: number // Position index on that side
  offset?: number // Fine-tuning offset in pixels
  absoluteX?: number // 絶対X座標（計算後）
  absoluteY?: number // 絶対Y座標（計算後）
}

// ポートグループ
export interface PortGroup {
  id: string
  name: string
  type: 'communication' | 'power' | 'gpio' | 'analog'
  ports: PortDefinition[]
  isCollapsed: boolean
  color: string
  priority: number // For ordering
  description?: string
  icon?: string // アイコン名
}

// 動的ポート構成
export interface DynamicPortConfiguration {
  nodeId: string
  componentName: string
  totalPins: number
  portGroups: PortGroup[]
  layoutMode: 'compact' | 'expanded' | 'detailed'
  autoLayout: boolean
  generatedFrom: 'ai' | 'manual' | 'template'
  lastUpdated: string
  nodeSize?: {
    width: number
    height: number
  }
}

// ポート容量状態
export interface PortCapacityStatus {
  portId: string
  available: number
  used: number
  percentage: number
  status: 'available' | 'warning' | 'full' | 'exceeded'
  warnings: string[]
  recommendations?: string[]
}

// ポートレイアウト制約
export interface PortLayoutConstraints {
  minPortSpacing: number
  maxPortsPerSide: number
  preferredSides: {
    power: ('top' | 'right' | 'bottom' | 'left')[]
    communication: ('top' | 'right' | 'bottom' | 'left')[]
    gpio: ('top' | 'right' | 'bottom' | 'left')[]
  }
  groupSeparation: number
  nodeMinWidth: number
  nodeMinHeight: number
}

// 接続ルール
export interface ConnectionRule {
  id: string
  name: string
  description: string
  sourcePortType: string
  targetPortType: string
  isAllowed: boolean
  conditions?: {
    voltageMatch?: boolean
    protocolMatch?: boolean
    directionCompatible?: boolean
  }
  warningMessage?: string
  errorMessage?: string
}

// ポート視覚状態
export interface PortVisualState {
  portId: string
  isHighlighted: boolean
  isConnectable: boolean
  isConnected: boolean
  hasWarning: boolean
  hasError: boolean
  animationState?: 'pulse' | 'glow' | 'none'
  customColor?: string
  tooltipContent?: string
}

// 複雑部品管理 (Teensy 4.1級対応)
export interface ComplexComponentState {
  nodeId: string
  displayMode: 'compact' | 'expanded' | 'detailed'
  visibleGroups: string[] // 表示中のポートグループID
  collapsedGroups: string[] // 折りたたみ中のポートグループID
  customLayout?: {
    groupPositions: { [groupId: string]: PortPosition }
    nodeSize: { width: number; height: number }
    portSpacing: number
  }
  userPreferences?: {
    preferredDisplayMode: string
    favoriteGroups: string[]
    hiddenPorts: string[]
  }
}

// 分岐接続管理
export interface BranchConnection {
  id: string
  parentConnectionId: string
  branchPoint: { x: number; y: number } // 分岐点座標
  childConnections: {
    connectionId: string
    targetNodeId: string
    targetPortId: string
    signalStrength?: number // 信号強度（分岐による減衰）
    delay?: number // 伝播遅延
  }[]
  branchType: 'power_distribution' | 'signal_fanout' | 'bus_tap'
  maxBranches?: number // 最大分岐数
  currentLoad?: number // 現在の負荷
}

// 動的ポートシステム イベント
export interface PortSystemEvent {
  type: 'port_added' | 'port_removed' | 'port_connected' | 'port_disconnected' | 'layout_changed'
  nodeId: string
  portId?: string
  connectionId?: string
  timestamp: string
  metadata?: {
    previousState?: any
    newState?: any
    userTriggered?: boolean
  }
}