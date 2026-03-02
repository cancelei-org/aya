// 配送先情報のローカルストレージ管理
// ユーザーの配送先設定を永続化

import type { ShippingDestination } from '@/types/parts'

// ============================================
// 定数
// ============================================

const STORAGE_KEY = 'orboh_shipping_destination'
const STORAGE_VERSION = '1.0'

// デフォルトの配送先（東京）
export const DEFAULT_DESTINATION: ShippingDestination = {
  country: 'JP',
  region: '東京'
}

// ============================================
// 型定義
// ============================================

interface StoredDestinationData {
  version: string
  destination: ShippingDestination
  lastUpdated: string
}

// ============================================
// メイン関数
// ============================================

/**
 * 配送先をローカルストレージに保存
 */
export function saveShippingDestination(destination: ShippingDestination): void {
  try {
    const data: StoredDestinationData = {
      version: STORAGE_VERSION,
      destination,
      lastUpdated: new Date().toISOString()
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    console.log('💾 Saved shipping destination:', destination)
    
    // カスタムイベントを発火（他のコンポーネントが変更を検知できるように）
    window.dispatchEvent(new CustomEvent('shippingDestinationChanged', {
      detail: destination
    }))
    
  } catch (error) {
    console.error('Failed to save shipping destination:', error)
  }
}

/**
 * 配送先をローカルストレージから取得
 */
export function loadShippingDestination(): ShippingDestination {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    
    if (!stored) {
      console.log('📍 No stored destination, using default')
      return DEFAULT_DESTINATION
    }
    
    const data: StoredDestinationData = JSON.parse(stored)
    
    // バージョンチェック
    if (data.version !== STORAGE_VERSION) {
      console.log('⚠️ Stored destination version mismatch, using default')
      localStorage.removeItem(STORAGE_KEY)
      return DEFAULT_DESTINATION
    }
    
    // 基本的なバリデーション
    if (!data.destination?.country) {
      console.log('⚠️ Invalid stored destination, using default')
      return DEFAULT_DESTINATION
    }
    
    console.log('✅ Loaded shipping destination:', data.destination)
    return data.destination
    
  } catch (error) {
    console.error('Failed to load shipping destination:', error)
    // エラー時はストレージをクリアしてデフォルトを返す
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {}
    return DEFAULT_DESTINATION
  }
}

/**
 * 配送先をクリア（デフォルトに戻す）
 */
export function clearShippingDestination(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
    console.log('🗑️ Cleared shipping destination')
    
    // カスタムイベントを発火
    window.dispatchEvent(new CustomEvent('shippingDestinationChanged', {
      detail: DEFAULT_DESTINATION
    }))
    
  } catch (error) {
    console.error('Failed to clear shipping destination:', error)
  }
}

/**
 * 配送先が保存されているかチェック
 */
export function hasStoredDestination(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== null
  } catch {
    return false
  }
}

/**
 * 最近使用した配送先のリストを管理
 */
const RECENT_DESTINATIONS_KEY = 'orboh_recent_destinations'
const MAX_RECENT_DESTINATIONS = 5

export interface RecentDestination extends ShippingDestination {
  lastUsed: string
  useCount: number
}

/**
 * 最近使用した配送先を保存
 */
export function addRecentDestination(destination: ShippingDestination): void {
  try {
    const recent = getRecentDestinations()
    
    // 同じ配送先が既にある場合は使用回数を増やす
    const existingIndex = recent.findIndex(
      d => d.country === destination.country && d.region === destination.region
    )
    
    if (existingIndex >= 0) {
      recent[existingIndex].useCount++
      recent[existingIndex].lastUsed = new Date().toISOString()
    } else {
      // 新しい配送先を追加
      recent.push({
        ...destination,
        lastUsed: new Date().toISOString(),
        useCount: 1
      })
    }
    
    // 使用回数と最終使用日でソート
    recent.sort((a, b) => {
      // まず使用回数でソート
      if (b.useCount !== a.useCount) {
        return b.useCount - a.useCount
      }
      // 同じ使用回数なら最終使用日でソート
      return new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime()
    })
    
    // 最大数を超えたら古いものを削除
    if (recent.length > MAX_RECENT_DESTINATIONS) {
      recent.splice(MAX_RECENT_DESTINATIONS)
    }
    
    localStorage.setItem(RECENT_DESTINATIONS_KEY, JSON.stringify(recent))
    
  } catch (error) {
    console.error('Failed to save recent destination:', error)
  }
}

/**
 * 最近使用した配送先のリストを取得
 */
export function getRecentDestinations(): RecentDestination[] {
  try {
    const stored = localStorage.getItem(RECENT_DESTINATIONS_KEY)
    if (!stored) return []
    
    const recent = JSON.parse(stored) as RecentDestination[]
    return recent.filter(d => d.country && d.lastUsed) // 基本的なバリデーション
    
  } catch (error) {
    console.error('Failed to load recent destinations:', error)
    return []
  }
}

/**
 * 最近使用した配送先をクリア
 */
export function clearRecentDestinations(): void {
  try {
    localStorage.removeItem(RECENT_DESTINATIONS_KEY)
    console.log('🗑️ Cleared recent destinations')
  } catch (error) {
    console.error('Failed to clear recent destinations:', error)
  }
}

// ============================================
// React Hook
// ============================================

import { useState, useEffect } from 'react'

/**
 * 配送先を管理するReact Hook
 */
export function useShippingDestination() {
  const [destination, setDestination] = useState<ShippingDestination>(() => {
    // SSR対策: クライアントサイドでのみローカルストレージを読む
    if (typeof window !== 'undefined') {
      return loadShippingDestination()
    }
    return DEFAULT_DESTINATION
  })

  // 配送先を更新して保存
  const updateDestination = (newDestination: ShippingDestination) => {
    setDestination(newDestination)
    saveShippingDestination(newDestination)
    addRecentDestination(newDestination)
  }

  // 他のタブ/ウィンドウでの変更を検知
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const data: StoredDestinationData = JSON.parse(e.newValue)
          if (data.destination) {
            setDestination(data.destination)
          }
        } catch {}
      }
    }

    // カスタムイベントのリスナー
    const handleCustomEvent = (e: Event) => {
      const customEvent = e as CustomEvent<ShippingDestination>
      if (customEvent.detail) {
        setDestination(customEvent.detail)
      }
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('shippingDestinationChanged', handleCustomEvent)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('shippingDestinationChanged', handleCustomEvent)
    }
  }, [])

  return {
    destination,
    updateDestination,
    resetToDefault: () => {
      clearShippingDestination()
      setDestination(DEFAULT_DESTINATION)
    },
    recentDestinations: getRecentDestinations()
  }
}

// ============================================
// ユーティリティ関数
// ============================================

// 国コードと国名の対応
const COUNTRY_NAMES: Record<string, string> = {
  'JP': '日本',
  'US': 'アメリカ',
  'CN': '中国',
  'KR': '韓国',
  'DE': 'ドイツ',
  'UK': 'イギリス',
  'FR': 'フランス',
  'CA': 'カナダ',
  'AU': 'オーストラリア',
  'SG': 'シンガポール',
  'IN': 'インド',
  'BR': 'ブラジル'
}

/**
 * 配送先を文字列表現に変換
 */
export function formatDestination(destination: ShippingDestination): string {
  const countryName = COUNTRY_NAMES[destination.country] || destination.country
  const parts = [countryName]
  
  if (destination.region) {
    parts.push(destination.region)
  }
  
  if (destination.postalCode) {
    parts.push(`(〒${destination.postalCode})`)
  }
  
  return parts.join(' ')
}

/**
 * 配送先が同じかどうかをチェック
 */
export function isSameDestination(
  a: ShippingDestination | null,
  b: ShippingDestination | null
): boolean {
  if (!a || !b) return false
  
  return (
    a.country === b.country &&
    a.region === b.region &&
    a.postalCode === b.postalCode
  )
}