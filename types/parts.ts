// 部品・PBS・発注関連の型定義

// 発注ステータス
export type OrderStatus = "Unordered" | "Quotation" | "Ordered" | "Delivered"

// 部品情報
export interface PartInfo {
  modelNumber?: string
  description?: string
  quantity?: number
  voltage?: string
  communication?: string
  orderStatus: OrderStatus
  estimatedOrderDate: Date | string
  purchaseSiteLink?: string
}

// 検索結果
export interface SearchResult {
  partName: string
  modelNumber: string
  description: string
  specifications?: Record<string, string>
  estimatedPrice?: string
  category?: string
  purchaseSites?: Array<{
    url: string
    price: string
  }>
}

// 分析用部品発注データ
export interface AnalysisPartOrder {
  partName: string
  modelNumber: string
  description: string
  voltage?: string
  communication?: string
  purchaseSiteLink?: string
  quantity?: number
}

// PBS（Product Breakdown Structure）ノード
export interface PBSNode {
  id: string
  name: string
  type: "folder" | "component" | "system"
  icon: string  // String icon name, converted to React component in UI
  children?: PBSNode[]
  isExpanded?: boolean
  parentId?: string
  positionOrder?: number
  // Part information (for component type only)
  modelNumber?: string
  orderStatus?: string
  estimatedOrderDate?: Date | string
  purchaseSiteLink?: string
  description?: string
  voltage?: string
  communication?: string
  // Smart grouping properties
  basePartId?: string
  instanceCount?: number
}

// Legacy type aliases for backward compatibility
export type TreeNode = PBSNode
export type PBSStructureNode = PBSNode

// 価格情報
export interface ComponentPricing {
  unitPrice: number
  currency: string
  supplier: string
  availability: 'in_stock' | 'limited' | 'out_of_stock'
  moq: number // Minimum Order Quantity
  lastUpdated: string
}

// 拡張価格情報（配送情報付き）
export interface ComponentPricingExtended extends ComponentPricing {
  // 配送情報
  deliveryDays: number
  shippingLocation?: string  // 倉庫の場所 (e.g., 'US', 'CN', 'JP')
  shippingCost?: number
  deliveryDaysRange?: {      // 一部のサプライヤーは範囲で提供
    min: number
    max: number
  }
  
  // 購入リンク情報
  purchaseUrl?: string
  isDirectLink: boolean
  
  // データソース追跡
  dataSource: 'perplexity' | 'mock' | 'cache'
}

// 配送先情報
export interface ShippingDestination {
  country: string      // 'JP', 'US', 'CN', etc.
  region?: string      // '東京', 'California', '北京', etc.
  postalCode?: string  // より正確な配送見積もりのため
}

// API レスポンスラッパー
export interface PricingApiResponse {
  success: boolean
  data: ComponentPricingExtended[]
  error?: string
  meta: {
    cached: boolean
    timestamp: string
    apiCallsRemaining?: number
    shippingDestination?: ShippingDestination
  }
}

// キャッシュされた価格データ構造
export interface CachedPricingData {
  [destinationKey: string]: {  // e.g., "JP_東京", "US_California"
    prices: ComponentPricingExtended[]
    fetchedAt: string         // ISO timestamp
    ttl: number              // TTL in seconds
  }
}

// 価格コンテキスト
export interface PricingContext {
  pricingData: Map<string, ComponentPricing>
  isLoadingPricing: boolean
  getTotalProjectCost: () => number
}