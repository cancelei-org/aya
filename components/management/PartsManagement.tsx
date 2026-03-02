"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { RefreshCw, DollarSign, AlertCircle, Package, ShoppingCart, X } from "lucide-react"
import type {
  Connection,
  SoftwareContext,
  NodeData
} from '@/types'
import { Node } from '@xyflow/react'

// 統合されたParts Management コンポーネント群をインポート
import { usePartsManagementState } from '@/components/parts/PartsManagementState'
import { usePartsManagementLogic } from '@/components/parts/PartsManagementLogic'
import { PartsManagementTable } from '@/components/parts/PartsManagementTable'
import { CompatibilityResultModal } from '@/components/modals/CompatibilityResultModal'
import { ShippingDestinationSelector } from '@/components/procurement/ShippingDestinationSelector'
import { useShippingDestination } from '@/utils/storage/shippingDestination'
import { getIntegratedPricingCache } from '@/utils/pricing/integratedPricingCache'

// 🚀 React Flow完全移行 + 単一データソース: Node型直接使用のProps型定義
interface PartsManagementProps {
  nodes: Node<NodeData>[]
  setNodes: (updaterOrNodes: Node<NodeData>[] | ((prev: Node<NodeData>[]) => Node<NodeData>[])) => void
  updateNodeData: (nodeId: string, newData: any) => void
  // 🚀 単一データソース: pbsData削除（computePBSFromNodesで自動生成）
  connections: Connection[]
  setConnections: React.Dispatch<React.SetStateAction<Connection[]>>
  softwareContext: SoftwareContext
}

export function PartsManagement({
  nodes,
  setNodes,
  // 🚀 単一データソース: pbsData削除
  connections,
  setConnections
}: PartsManagementProps) {
  
  // 🚀 React Flow完全移行: 直接nodes使用（変換処理削除）
  // Debug log removed to prevent console spam
  
  // 🚀 React Flow完全移行: 直接setNodes使用（変換処理削除）
  // const updateNodes = (updater: (prev: Node[]) => Node[]) => {
  //   const updated = updater(nodes) as Node<NodeData>[]  // React Flow nodes直接使用
  //   setNodes(updated)
  // }
  
  // 配送先設定を管理
  const { destination, updateDestination } = useShippingDestination()
  
  // 🚀 単一データソース: PBS自動生成を使用した統合Parts Management状態管理
  const state = usePartsManagementState({
    nodes,  // React Flow nodes直接渡し
    connections,  // PBS自動生成に使用
    shippingDestination: destination  // 配送先情報を渡す
  })
  
  // ビジネスロジック  
  const logic = usePartsManagementLogic({
    nodes,  // React Flow nodes直接渡し
    unifiedParts: state.unifiedParts,
    setNodes,  // React Flow setNodes直接使用
    setConnections
  })
  
  // console.log('🎯 PartsManagement re-enabled:', {
  //   totalParts: state.unifiedParts.length,
  //   stats: state.stats,
  //   hasCompatibilityResult: !!state.compatibilityResult
  // })
  
  return (
    <div className="h-full flex flex-col">
      {/* ヘッダー - 統計情報と操作ボタン */}
      <div className="flex-shrink-0 p-4 border-b bg-gray-50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold">Parts Management</h2>
            <span className="text-sm text-gray-500">({state.unifiedParts.length} parts)</span>
          </div>
          {/* 価格更新機能の実装が完了するまで一旦コメントアウト */}
          {/* <div className="flex items-center gap-2">            
            <Button
              onClick={async () => {
                // 配送先変更時にキャッシュをクリア
                const cache = getIntegratedPricingCache()
                cache.clearMemoryCache()
                
                // 価格を更新
                await state.fetchBatchPricing(state.unifiedParts.map(p => ({ 
                  id: p.id,
                  data: {
                    title: p.name,
                    modelNumber: p.name,
                    type: 'primary',
                    inputs: 1,
                    outputs: 1
                  }
                })))
              }}
              variant="outline"
              size="sm"
              disabled={state.isLoadingPricing}
              className="flex items-center gap-2"
            >
              {state.isLoadingPricing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <DollarSign className="w-4 h-4" />
              )}
              Update Prices
            </Button>
          </div> */}
        </div>
        
        {/* 統計情報 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="bg-white p-3 rounded-lg border">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-blue-600" />
              <span className="text-gray-600">Total Parts</span>
            </div>
            <div className="text-lg font-semibold">{state.stats.totalParts}</div>
          </div>
          
          <div className="bg-white p-3 rounded-lg border">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-green-600" />
              <span className="text-gray-600">Ordered</span>
            </div>
            <div className="text-lg font-semibold text-green-600">{state.stats.orderedParts}</div>
          </div>
          
          <div className="bg-white p-3 rounded-lg border">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-orange-600" />
              <span className="text-gray-600">Unordered</span>
            </div>
            <div className="text-lg font-semibold text-orange-600">{state.stats.unorderedParts}</div>
          </div>
          
          <div className="bg-white p-3 rounded-lg border">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-purple-600" />
              <span className="text-gray-600">Total Cost</span>
            </div>
            <div className="text-lg font-semibold text-purple-600">
              ${state.stats.totalCost.toFixed(2)}
            </div>
          </div>
        </div>
      </div>
      
      {/* 配送先セレクター */}
      <div className="px-4 pb-4">
        <ShippingDestinationSelector
          destination={destination}
          onChange={updateDestination}
          compact={true}
          className="bg-blue-50 border-blue-200"
        />
      </div>
      
      {/* メインコンテンツ - 部品テーブル */}
      <div className="flex-1 overflow-hidden relative">
        <PartsManagementTable
          unifiedParts={state.unifiedParts}
          updateTextField={logic.updateTextField}
          updateSelectField={logic.updateSelectField}
          updatePriceField={logic.updatePriceField}
          updateOrderDateField={logic.updateOrderDateField}
          getLatestFieldValue={logic.getLatestFieldValue}
          deletePart={logic.deletePart}
          shippingDestination={destination}
        />
      </div>
      
      {/* 互換性チェック結果モーダル */}
      <CompatibilityResultModal
        isOpen={state.showCompatibilityModal}
        onClose={() => state.setShowCompatibilityModal(false)}
        result={state.compatibilityResult}
        onRequestAlternatives={() => state.handleRequestAlternatives()}
      />
      
      {/* 代替部品提案モーダル（簡易版） */}
      {state.showSuggestions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-800">
                Alternative Parts Suggestions
              </h2>
              <button
                onClick={() => state.setShowSuggestions(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="overflow-y-auto max-h-[calc(80vh-140px)] p-6">
              {state.suggestions.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  No alternative parts suggestions available.
                </p>
              ) : (
                <div className="space-y-4">
                  {state.suggestions.map((suggestion, index) => (
                    <div key={index} className="border rounded-lg p-4 bg-gray-50">
                      <h3 className="font-semibold text-gray-800 mb-2">
                        {suggestion.problemComponentName}
                      </h3>
                      <p className="text-sm text-gray-600 mb-3">
                        Issue: {suggestion.issue.issue}
                      </p>
                      <p className="text-sm text-gray-600 mb-3">
                        Recommendation: {suggestion.issue.recommendation}
                      </p>
                      <div className="text-sm text-blue-600">
                        {suggestion.alternatives.length} alternative(s) found
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
              <button
                onClick={() => state.setShowSuggestions(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}