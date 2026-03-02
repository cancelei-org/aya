// 部品分析システム - 統合エクスポートファイル
// 分割されたモジュールからの re-export

import type { Connection } from '@/types'

// 部品検索処理
export {
  handleSearchParts,
  processSearchResults
} from '../../parts/partsSearchHandler'

// 部品リスト解析処理
export {
  handleAnalyzePartsList
} from '../../parts/partsAnalysisHandler'

// 接続処理
export {
  processSystemConnections,
  validateConnections,
  repairConnections,
  getConnectionStats,
  autoRepairConnections
} from '../../parts/partsConnectionProcessor'

// 共通型定義
export interface SearchResult {
  partName: string
  modelNumber: string
  description: string
  specifications: any
  estimatedPrice: number
  category: string
  purchaseSites?: Array<{ url: string }>
}

export interface AnalysisPartOrder {
  partName: string
  modelNumber: string
  voltage: string
  communication: string
  description: string
  purchaseSiteLink?: string
  quantity?: number
  estimatedOrderDate?: string
}

export interface PBSStructureNode {
  id: string
  name: string
  icon: string
  children?: PBSStructureNode[]
}

export interface AIGeneratedItem {
  partName: string
  modelNumber: string
  voltage: string
  communication: string
  description: string
}

export interface ConnectionInfo {
  type: string
  fromPart: string
  toPart: string
  description: string
}

export interface ConnectionResult {
  success: boolean
  connections: Connection[]
  failedConnections: Array<{
    from: string
    to: string
    reason: string
  }>
}