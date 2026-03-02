// React Flow カスタムエッジタイプ定義
// SmartEdgeによる統一された視覚的区別システム

import { SmartEdge } from '@/components/edges/SmartEdge'

// React Flow用のエッジタイプマップ
export const edgeTypes = {
  default: SmartEdge,  // すべての接続でSmartEdgeを使用
  smartEdge: SmartEdge, // 明示的な指定用
  // レガシーエッジタイプは削除（PowerConnectionEdge, SignalConnectionEdge）
}