// 価格データ管理カスタムフック
// 部品価格の取得・管理・総コスト計算

import { useState, useCallback, useEffect, useMemo } from 'react'
import type { ComponentPricing, NodeData } from '@/types'
import type { Node } from '@xyflow/react'
import { getIntegratedPricingCache } from '@/utils/pricing/integratedPricingCache'
import type { ComponentPricingExtended } from '@/types'

// Helper functions that were in octopartApi
const getLowestPrice = (prices: ComponentPricingExtended[]) => {
  return prices.reduce((min, p) => p.unitPrice < min.unitPrice ? p : min, prices[0]);
}

const getInStockOptions = (prices: ComponentPricingExtended[]) => {
  return prices.filter(p => p.availability === 'in_stock');
}

const calculatePriceStats = (prices: ComponentPricingExtended[]) => {
  if (!prices.length) return { min: 0, max: 0, avg: 0 };
  const values = prices.map(p => p.unitPrice);
  return {
    min: Math.min(...values),
    max: Math.max(...values),
    avg: values.reduce((a, b) => a + b, 0) / values.length
  };
}

const STORAGE_KEY = 'orboh_pricing_cache'
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24時間

// ============================================
// 型定義
// ============================================

interface PricingCache {
  [partName: string]: {
    pricing: ComponentPricing[]
    timestamp: number
  }
}

interface PricingState {
  pricingData: Map<string, ComponentPricing[]>
  isLoadingPricing: boolean
  isLoadingPartial: Set<string> // 個別部品のローディング状態
  lastUpdated: string | null
  errors: Map<string, string>
}

// ============================================
// メインフック
// ============================================

export function usePricingData(shippingDestination?: any) {
  const [state, setState] = useState<PricingState>({
    pricingData: new Map(),
    isLoadingPricing: false,
    isLoadingPartial: new Set(),
    lastUpdated: null,
    errors: new Map()
  })

  // ローカルストレージからキャッシュ読み込み
  useEffect(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY)
      if (cached) {
        const cache: PricingCache = JSON.parse(cached)
        const now = Date.now()
        const validCache = new Map<string, ComponentPricing[]>()
        
        Object.entries(cache).forEach(([partName, data]) => {
          // 24時間以内のキャッシュのみ有効
          if (now - data.timestamp < CACHE_DURATION) {
            validCache.set(partName, data.pricing)
          }
        })
        
        if (validCache.size > 0) {
          setState(prev => ({
            ...prev,
            pricingData: validCache,
            lastUpdated: new Date().toISOString()
          }))
          console.log(`📦 Loaded ${validCache.size} cached pricing entries`)
        }
      }
    } catch (error) {
      console.error('❌ Failed to load pricing cache:', error)
    }
  }, [])

  // キャッシュ保存
  const saveToCache = useCallback((partName: string, pricing: ComponentPricing[]) => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY)
      const cache: PricingCache = cached ? JSON.parse(cached) : {}
      
      cache[partName] = {
        pricing,
        timestamp: Date.now()
      }
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cache))
    } catch (error) {
      console.error('❌ Failed to save pricing cache:', error)
    }
  }, [])

  // 単一部品の価格取得
  const fetchPartPricing = useCallback(async (partName: string, nodeId?: string): Promise<ComponentPricing[]> => {
    if (!partName.trim()) return []
    
    const normalizedPartName = partName.trim()
    
    // キャッシュ確認
    const cached = state.pricingData.get(normalizedPartName)
    if (cached && cached.length > 0) {
      console.log(`📦 Using cached pricing for ${normalizedPartName}`)
      return cached
    }
    
    setState(prev => ({
      ...prev,
      isLoadingPartial: new Set([...prev.isLoadingPartial, normalizedPartName]),
      errors: new Map([...prev.errors].filter(([key]) => key !== normalizedPartName))
    }))
    
    try {
      console.log(`🔍 Fetching pricing for: ${normalizedPartName}`)
      const cache = getIntegratedPricingCache()
      const pricing = await cache.getPricing(
        nodeId || normalizedPartName,
        normalizedPartName,
        shippingDestination || { country: 'Japan', city: 'Tokyo', postalCode: '100-0001' }
      )
      
      // 状態更新
      setState(prev => {
        const newPricingData = new Map(prev.pricingData)
        newPricingData.set(normalizedPartName, pricing)
        const newLoadingPartial = new Set(prev.isLoadingPartial)
        newLoadingPartial.delete(normalizedPartName)
        
        return {
          ...prev,
          pricingData: newPricingData,
          isLoadingPartial: newLoadingPartial,
          lastUpdated: new Date().toISOString()
        }
      })
      
      // キャッシュ保存
      saveToCache(normalizedPartName, pricing)
      
      console.log(`✅ Pricing fetched for ${normalizedPartName}: ${pricing.length} options`)
      return pricing
      
    } catch (error) {
      console.error(`❌ Failed to fetch pricing for ${normalizedPartName}:`, error)
      
      setState(prev => {
        const newLoadingPartial = new Set(prev.isLoadingPartial)
        newLoadingPartial.delete(normalizedPartName)
        const newErrors = new Map(prev.errors)
        newErrors.set(normalizedPartName, error instanceof Error ? error.message : 'Unknown error')
        
        return {
          ...prev,
          isLoadingPartial: newLoadingPartial,
          errors: newErrors
        }
      })
      
      return []
    }
  }, [state.pricingData, saveToCache, shippingDestination])

  // 複数部品の一括価格取得
  const fetchBatchPricing = useCallback(async (nodes: Node<NodeData>[]): Promise<void> => {
    const partNames = nodes
      .filter(node => node.data?.modelNumber?.trim())
      .map(node => node.data?.modelNumber?.trim() || '')
      .filter(name => name) // Remove empty strings
      .filter((name, index, array) => array.indexOf(name) === index) // 重複除去
    
    if (partNames.length === 0) {
      console.log('📝 No parts with model numbers found')
      return
    }
    
    // 未取得の部品のみ取得
    const uncachedParts = partNames.filter(partName => 
      !state.pricingData.has(partName) || state.pricingData.get(partName)!.length === 0
    )
    
    if (uncachedParts.length === 0) {
      console.log('📦 All parts already cached')
      return
    }
    
    setState(prev => ({ ...prev, isLoadingPricing: true }))
    
    try {
      console.log(`🔄 Batch fetching pricing for ${uncachedParts.length} parts...`)
      
      // Create nodeIds map for Perplexity integration
      const nodeIds = new Map<string, string>()
      nodes.forEach(node => {
        if (node.data?.modelNumber?.trim()) {
          nodeIds.set(node.data.modelNumber.trim(), node.id)
        }
      })
      
      // Batch fetch pricing using cache
      const cache = getIntegratedPricingCache()
      const batchResults = new Map()
      
      for (const partName of uncachedParts) {
        const nodeId = nodeIds.get(partName) || partName
        const pricing = await cache.getPricing(
          nodeId,
          partName,
          shippingDestination || { country: 'Japan', city: 'Tokyo', postalCode: '100-0001' }
        )
        batchResults.set(partName, pricing)
      }
      
      setState(prev => {
        const newPricingData = new Map(prev.pricingData)
        batchResults.forEach((pricing, partName) => {
          newPricingData.set(partName, pricing)
          saveToCache(partName, pricing)
        })
        
        return {
          ...prev,
          pricingData: newPricingData,
          isLoadingPricing: false,
          lastUpdated: new Date().toISOString()
        }
      })
      
      console.log(`✅ Batch pricing completed: ${batchResults.size} parts processed`)
      
    } catch (error) {
      console.error('❌ Batch pricing failed:', error)
      setState(prev => ({ ...prev, isLoadingPricing: false }))
    }
  }, [state.pricingData, saveToCache, shippingDestination])

  // 総プロジェクトコスト計算
  const getTotalProjectCost = useCallback((nodes: Node<NodeData>[]): {
    totalCost: number
    breakdown: Array<{
      partName: string
      quantity: number
      unitPrice: number
      totalPrice: number
      supplier: string
      availability: string
    }>
    unavailableParts: string[]
  } => {
    let totalCost = 0
    const breakdown: any[] = []
    const unavailableParts: string[] = []
    
    nodes.forEach(node => {
      // Check if node.data exists before accessing properties
      if (!node.data) return
      
      const partName = node.data.modelNumber?.trim()
      const quantity = node.data.quantity || 1
      
      if (!partName) return
      
      const pricing = state.pricingData.get(partName)
      if (!pricing || pricing.length === 0) {
        unavailableParts.push(partName)
        return
      }
      
      // 在庫ありの最安価格を優先
      const inStockOptions = getInStockOptions(pricing)
      const bestOption = inStockOptions.length > 0 
        ? getLowestPrice(inStockOptions)
        : getLowestPrice(pricing)
      
      if (bestOption) {
        const partTotal = bestOption.unitPrice * quantity
        totalCost += partTotal
        
        breakdown.push({
          partName,
          quantity,
          unitPrice: bestOption.unitPrice,
          totalPrice: partTotal,
          supplier: bestOption.supplier,
          availability: bestOption.availability
        })
      } else {
        unavailableParts.push(partName)
      }
    })
    
    return { totalCost, breakdown, unavailableParts }
  }, [state.pricingData])

  // 価格統計情報
  const getPriceStats = useCallback((partName: string) => {
    const pricing = state.pricingData.get(partName?.trim())
    if (!pricing || pricing.length === 0) return null
    
    return {
      ...calculatePriceStats(pricing),
      optionsCount: pricing.length,
      inStockCount: getInStockOptions(pricing).length,
      bestOption: getLowestPrice(getInStockOptions(pricing)) || getLowestPrice(pricing)
    }
  }, [state.pricingData])

  // キャッシュクリア
  const clearPricingCache = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY)
      setState({
        pricingData: new Map(),
        isLoadingPricing: false,
        isLoadingPartial: new Set(),
        lastUpdated: null,
        errors: new Map()
      })
      console.log('🗑️ Pricing cache cleared')
    } catch (error) {
      console.error('❌ Failed to clear pricing cache:', error)
    }
  }, [])

  // 前回の配送先を記録
  const [previousDestination, setPreviousDestination] = useState<string>('')
  
  // 配送先変更時にキャッシュをクリア
  useEffect(() => {
    if (shippingDestination) {
      const currentDestinationKey = `${shippingDestination.country}-${shippingDestination.region || 'default'}`
      
      // 前回と異なる場合のみクリア（初回は除く）
      if (previousDestination && previousDestination !== currentDestinationKey) {
        console.log('📍 Shipping destination changed, clearing price cache')
        console.log(`   From: ${previousDestination}`)
        console.log(`   To: ${currentDestinationKey}`)
        clearPricingCache()
      }
      
      setPreviousDestination(currentDestinationKey)
    }
  }, [shippingDestination?.country, shippingDestination?.region, previousDestination, clearPricingCache])

  // API設定チェック
  const apiStatus = useMemo(() => ({
    isConfigured: true, // Always true since we're using Perplexity API
    hasApiKey: !!process.env.NEXT_PUBLIC_PERPLEXITY_API_KEY,
    message: 'Using Perplexity API for pricing'
  }), [])

  return {
    // 状態
    pricingData: state.pricingData,
    isLoadingPricing: state.isLoadingPricing,
    isLoadingPartial: state.isLoadingPartial,
    lastUpdated: state.lastUpdated,
    errors: state.errors,
    
    // アクション
    fetchPartPricing,
    fetchBatchPricing,
    getTotalProjectCost,
    getPriceStats,
    clearPricingCache,
    
    // ユーティリティ
    apiStatus
  }
}