"use client"

import { useState, useMemo, useEffect } from "react"
import type {
  Connection,
  CompatibilityResult
} from '@/types'
import { Node } from '@xyflow/react'
import type { PartSuggestion } from '@/utils/components/alternativePartsFinder'
import { getAllParts, getPartsStats } from '@/utils/components/partsExtractor'
import { usePricingData } from '@/hooks/usePricingData'
// 🚀 単一データソース: PBS自動生成
import { computePBSFromNodes } from '@/utils/flow/pbsComputed'

// 🚀 React Flow完全移行 + 単一データソース: PartsManagement状態管理専用フック
export function usePartsManagementState({
  nodes,
  connections,
  shippingDestination
}: {
  nodes: Node[]
  connections: Connection[]
  shippingDestination?: any // ShippingDestination type
}) {
  
  // 🚀 単一データソース: PBS自動生成からnodesで部品情報抽出
  const unifiedParts = useMemo(() => {
    console.log('🔄 PartsManagementState: Recalculating unifiedParts', {
      nodesCount: nodes.length,
      connectionsCount: connections.length,
      nodesWithSpecifications: nodes.filter(n => n.data?.specifications).length
    });
    // 空の場合は早期リターン
    if (nodes.length === 0) {
      return []
    }
    
    // PBS構造を自動生成
    const pbsData = computePBSFromNodes(nodes, connections)
    
    const result = getAllParts(nodes, pbsData);
    console.log('✅ PartsManagementState: getAllParts result', {
      totalParts: result.length,
      partsWithSpecifications: result.filter(p => p.specifications).length,
      partsWithAIDescriptions: result.filter(p => p.description && p.description.includes('|')).length
    });
    return result;
  }, [
    nodes,
    connections
  ])
  
  const partsStats = useMemo(() => {
    return getPartsStats(unifiedParts)
  }, [unifiedParts])
  
  // 互換性チェック結果の状態管理
  const [compatibilityResult] = useState<CompatibilityResult | null>(null)
  const [showCompatibilityModal, setShowCompatibilityModal] = useState(false)
  
  // 代替部品提案の状態管理
  const [suggestions, setSuggestions] = useState<PartSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  // 価格機能の統合（AI検索済みデータを優先）
  const {
    pricingData: apiPricingData,
    isLoadingPricing,
    isLoadingPartial,
    fetchPartPricing,
    fetchBatchPricing,
    getTotalProjectCost,
    getPriceStats,
    apiStatus
  } = usePricingData(shippingDestination)

  // AI検索済みの価格データとAPIから取得した価格データを統合
  const pricingData = useMemo(() => {
    const merged = new Map(apiPricingData)
    
    // AI検索済みの価格データを優先的に使用
    unifiedParts.forEach(part => {
      if (part.aiPricing && part.modelNumber) {
        // AI価格データをComponentPricing形式に変換
        const aiPricingEntry = [{
          supplier: part.aiPricing.supplier || 'AI Search',
          unitPrice: part.aiPricing.unitPrice || 0,
          currency: part.aiPricing.currency || 'USD',
          availability: part.aiPricing.availability || 'Unknown',
          moq: 1,
          leadTime: 'Contact supplier',
          lastUpdated: part.aiPricing.lastUpdated || new Date().toISOString()
        }]
        
        // AI価格データを優先（既存データがあっても上書き）
        merged.set(part.modelNumber, aiPricingEntry)
      }
    })
    
    return merged
  }, [apiPricingData, unifiedParts])

  // AI検索済み価格がない部品のみ価格取得
  useEffect(() => {
    const fetchMissingPrices = async () => {
      const partsNeedingPrices = unifiedParts.filter(part => {
        // AI価格データがなく、かつAPIからも取得していない部品
        return part.modelNumber && 
               !part.aiPricing && 
               !apiPricingData.has(part.modelNumber)
      })

      if (partsNeedingPrices.length > 0) {
        const modelNumbers = partsNeedingPrices
          .map(p => p.modelNumber)
          .filter((mn): mn is string => !!mn)
        
        await fetchBatchPricing(modelNumbers)
      }
    }

    fetchMissingPrices()
  }, [unifiedParts, fetchBatchPricing, apiPricingData]) // 依存配列を適切に設定

  // 統計情報（価格情報を含む）
  const stats = useMemo(() => {
    // UIに表示されている価格で計算
    let totalCost = 0
    let pricedParts = 0
    let unpricedParts = 0
    
    unifiedParts.forEach(part => {
      const quantity = part.quantity || 1
      
      // UI表示と同じ優先順位で価格を取得
      let unitPrice: number | null = null
      
      // 1. AI価格を優先
      if (part.aiPricing?.unitPrice) {
        unitPrice = part.aiPricing.unitPrice
      } 
      // 2. 手動入力価格
      else if (part.price) {
        unitPrice = typeof part.price === 'string' ? parseFloat(part.price) : part.price
      }
      
      // 価格が有効な場合のみ計算
      if (unitPrice && !isNaN(unitPrice) && unitPrice > 0) {
        totalCost += unitPrice * quantity
        pricedParts++
      } else {
        unpricedParts++
      }
    })
    
    return {
      totalParts: unifiedParts.length,
      orderedParts: unifiedParts.filter(p => p.orderStatus === 'Ordered').length,
      deliveredParts: unifiedParts.filter(p => p.orderStatus === 'Delivered').length,
      unorderedParts: unifiedParts.filter(p => p.orderStatus === 'Unordered').length,
      totalCost,
      pricedParts,
      unpricedParts
    }
  }, [unifiedParts])

  // 互換性チェック機能は設計書版UnifiedCompatibilityCheckerに統一済み（旧機能削除）

  // 代替部品提案処理
  const handleRequestAlternatives = async (result?: CompatibilityResult) => {
    console.log('🔄 Starting alternative parts suggestion')
    
    // Use passed result if available, otherwise use current compatibilityResult
    const targetResult = result || compatibilityResult
    
    if (!targetResult) {
      console.log('❌ No compatibility check result available, need to run compatibility check first')
      alert('Please run compatibility check first before requesting alternative parts.')
      return
    }
    
    if (targetResult.isCompatible) {
      console.log('❌ No compatibility issues found, skipping alternative parts suggestion')
      alert('No compatibility issues detected in current system. Alternative parts are not needed.')
      return
    }

    try {
      // Search for alternatives only for critical issues
      const criticalIssues = targetResult.issues.filter(issue => issue.severity === 'critical')
      
      if (criticalIssues.length === 0) {
        console.log('⚠️ No critical issues found, skipping alternative parts suggestion')
        alert('No critical compatibility issues detected. Alternative parts suggestions are not provided for warning-level issues.')
        return
      }

      console.log(`🔍 ${criticalIssues.length} critical issues found, searching for alternatives...`)
      
      const { findAlternativeParts } = await import('@/utils/components/alternativePartsFinder')
      const partSuggestions = findAlternativeParts(nodes, [], criticalIssues)
      
      console.log(`✅ Generated ${partSuggestions.length} alternative parts suggestions`)
      
      setSuggestions(partSuggestions)
      setShowSuggestions(true)
      
    } catch (error) {
      console.error('❌ Alternative parts suggestion failed:', error)
      alert('Failed to generate alternative parts suggestions. Please try again.')
    }
  }

  return {
    // Data
    unifiedParts,
    partsStats,
    stats,
    
    // Compatibility state
    compatibilityResult,
    showCompatibilityModal,
    setShowCompatibilityModal,
    
    // Alternative parts state
    suggestions,
    showSuggestions,
    setSuggestions,
    setShowSuggestions,
    
    // Pricing data
    pricingData,
    isLoadingPricing,
    isLoadingPartial,
    fetchPartPricing,
    fetchBatchPricing,
    apiStatus,
    
    // Actions
    handleRequestAlternatives
  }
}