"use client"

import React from 'react'
import type { ShippingDestination } from '@/types/parts'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Globe, MapPin, Mail } from 'lucide-react'

// ============================================
// 定数定義
// ============================================

// 主要な配送先国
const COUNTRIES = [
  { code: 'JP', name: '日本(Japan)', flag: '🇯🇵' },
  { code: 'US', name: 'USA', flag: '🇺🇸' },
  { code: 'CN', name: 'China', flag: '🇨🇳' },
  { code: 'KR', name: 'Korea', flag: '🇰🇷' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'UK', name: 'UK', flag: '🇬🇧' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬' },
  { code: 'IN', name: 'India', flag: '🇮🇳' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷' },
] as const

// 国別の主要地域（サンプル）
const REGIONS_BY_COUNTRY: Record<string, string[]> = {
  JP: ['東京', '大阪', '名古屋', '福岡', '札幌', '仙台', '京都', '横浜'],
  US: ['California', 'New York', 'Texas', 'Florida', 'Illinois', 'Washington', 'Massachusetts', 'Arizona'],
  CN: ['北京', '上海', '深圳', '広州', '成都', '杭州', '南京', '西安'],
  KR: ['서울 (Seoul)', '부산 (Busan)', '인천 (Incheon)', '대구 (Daegu)'],
  DE: ['Berlin', 'Munich', 'Hamburg', 'Frankfurt', 'Cologne', 'Stuttgart'],
  UK: ['London', 'Manchester', 'Birmingham', 'Glasgow', 'Liverpool', 'Edinburgh'],
  // 他の国も必要に応じて追加
}

// ============================================
// インターフェース
// ============================================

export interface ShippingDestinationSelectorProps {
  destination: ShippingDestination
  onChange: (destination: ShippingDestination) => void
  className?: string
  disabled?: boolean
  showPostalCode?: boolean
  compact?: boolean
}

// ============================================
// コンポーネント
// ============================================

export function ShippingDestinationSelector({
  destination,
  onChange,
  className = '',
  disabled = false,
  showPostalCode = true,
  compact = false
}: ShippingDestinationSelectorProps) {
  // 国変更時の処理
  const handleCountryChange = (countryCode: string) => {
    onChange({
      ...destination,
      country: countryCode,
      // 国が変わったら地域をクリア
      region: undefined,
      postalCode: undefined
    })
  }

  // 地域変更時の処理
  const handleRegionChange = (region: string) => {
    onChange({
      ...destination,
      region: region || undefined
    })
  }

  // 郵便番号変更時の処理
  const handlePostalCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({
      ...destination,
      postalCode: e.target.value || undefined
    })
  }

  // 選択された国の情報を取得
  const selectedCountry = COUNTRIES.find(c => c.code === destination.country)
  const availableRegions = REGIONS_BY_COUNTRY[destination.country] || []

  if (compact) {
    // コンパクトモード（1行表示）
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Globe className="h-4 w-4 text-gray-500" />
        <Select
          value={destination.country}
          onValueChange={handleCountryChange}
          disabled={disabled}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue>
              {selectedCountry && (
                <span className="flex items-center gap-1">
                  <span>{selectedCountry.flag}</span>
                  <span>{selectedCountry.code}</span>
                </span>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {COUNTRIES.map(country => (
              <SelectItem key={country.code} value={country.code}>
                <span className="flex items-center gap-2">
                  <span>{country.flag}</span>
                  <span>{country.name}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {availableRegions.length > 0 && (
          <>
            <MapPin className="h-4 w-4 text-gray-500" />
            <Input
              type="text"
              placeholder="city"
              value={destination.region || ''}
              onChange={(e) => handleRegionChange(e.target.value)}
              disabled={disabled}
              className="w-[120px]"
              list={`regions-${destination.country}`}
            />
            <datalist id={`regions-${destination.country}`}>
              {availableRegions.map(region => (
                <option key={region} value={region} />
              ))}
            </datalist>
          </>
        )}
      </div>
    )
  }

  // 通常モード（カード表示）
  return (
    <Card className={`p-4 ${className}`}>
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-3">
          <Globe className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold text-lg">配送先 / Shipping Destination</h3>
        </div>

        {/* 国選択 */}
        <div className="space-y-2">
          <Label htmlFor="country">国 / Country</Label>
          <Select
            value={destination.country}
            onValueChange={handleCountryChange}
            disabled={disabled}
          >
            <SelectTrigger id="country">
              <SelectValue placeholder="国を選択">
                {selectedCountry && (
                  <span className="flex items-center gap-2">
                    <span className="text-lg">{selectedCountry.flag}</span>
                    <span>{selectedCountry.name}</span>
                  </span>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {COUNTRIES.map(country => (
                <SelectItem key={country.code} value={country.code}>
                  <span className="flex items-center gap-2">
                    <span className="text-lg">{country.flag}</span>
                    <span>{country.name}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 地域入力 */}
        <div className="space-y-2">
          <Label htmlFor="region" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            地域・都市 / Region・City
          </Label>
          <Input
            id="region"
            type="text"
            placeholder={availableRegions.length > 0 ? '例: ' + availableRegions[0] : '地域を入力'}
            value={destination.region || ''}
            onChange={(e) => handleRegionChange(e.target.value)}
            disabled={disabled}
            list="region-suggestions"
          />
          {availableRegions.length > 0 && (
            <datalist id="region-suggestions">
              {availableRegions.map(region => (
                <option key={region} value={region} />
              ))}
            </datalist>
          )}
        </div>

        {/* 郵便番号入力 */}
        {showPostalCode && (
          <div className="space-y-2">
            <Label htmlFor="postal" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              郵便番号 / Postal Code
              <span className="text-sm text-gray-500">(任意)</span>
            </Label>
            <Input
              id="postal"
              type="text"
              placeholder={destination.country === 'JP' ? '例: 100-0001' : 'Postal code'}
              value={destination.postalCode || ''}
              onChange={handlePostalCodeChange}
              disabled={disabled}
              className="font-mono"
            />
          </div>
        )}

        {/* 配送情報のサマリー */}
        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            配送先: {selectedCountry?.flag} {selectedCountry?.name}
            {destination.region && ` - ${destination.region}`}
            {destination.postalCode && ` (〒${destination.postalCode})`}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            この情報は部品の配送日数と送料の計算に使用されます
          </p>
        </div>
      </div>
    </Card>
  )
}

// ============================================
// プリセット配送先
// ============================================

export const PRESET_DESTINATIONS: Record<string, ShippingDestination> = {
  TOKYO: { country: 'JP', region: '東京' },
  OSAKA: { country: 'JP', region: '大阪' },
  CALIFORNIA: { country: 'US', region: 'California' },
  NEWYORK: { country: 'US', region: 'New York' },
  SHANGHAI: { country: 'CN', region: '上海' },
  BERLIN: { country: 'DE', region: 'Berlin' },
  LONDON: { country: 'UK', region: 'London' },
}

// デフォルトの配送先
export const DEFAULT_DESTINATION: ShippingDestination = PRESET_DESTINATIONS.TOKYO