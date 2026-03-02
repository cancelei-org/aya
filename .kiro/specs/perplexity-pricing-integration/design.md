# Technical Design Specification

## Overview
本設計書は、Perplexity APIを使用した電子部品のリアルタイム価格取得システムの技術実装を定義する。既存のOctopart API実装を置き換え、モックデータシステムを実データで拡張することで、正確な市場価格、在庫状況、配送情報を提供する。

## Architecture

### System Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React/Next.js)                  │
│  ┌─────────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ MarketDataDisplay│  │PartsManagement│  │ PricingView │  │
│  └────────┬─────────┘  └──────┬───────┘  └──────┬───────┘  │
│           └────────────────────┴─────────────────┘          │
│                               │                              │
│  ┌────────────────────────────▼────────────────────────┐   │
│  │              usePricingData Hook                     │   │
│  └────────────────────────────┬────────────────────────┘   │
└───────────────────────────────┼─────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────┐
│                    API Layer (Next.js API Routes)           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │           /api/parts/pricing                         │   │
│  └────────────────────────────┬─────────────────────────┘   │
└───────────────────────────────┼─────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────┐
│                    Service Layer                             │
│  ┌─────────────────┐  ┌────────────────┐  ┌────────────┐  │
│  │  octopartApi.ts │  │ perplexityApi.ts│  │priceCache.ts│ │
│  └────────┬────────┘  └────────┬────────┘  └─────┬──────┘  │
│           └────────────────────┴──────────────────┘         │
│                               │                              │
└───────────────────────────────┼─────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────┐
│                    External APIs                             │
│  ┌──────────────┐         ┌─────────────────┐              │
│  │ Perplexity API│         │ Fallback Mocks  │              │
│  └──────────────┘         └─────────────────┘              │
└─────────────────────────────────────────────────────────────┘
```

### Detailed Data Flow with Shipping Destination

#### 1. User Interaction Flow
```
User → Component Procurement Tab → Shipping Destination Selector
         ↓
         Changes destination (e.g., JP → US)
         ↓
         Triggers pricing update for all components
```

#### 2. Frontend Data Flow
```typescript
// Step 1: User selects/changes shipping destination
const handleDestinationChange = (newDestination: ShippingDestination) => {
  setShippingDestination(newDestination)
  saveShippingDestination(newDestination) // Persist to localStorage
  clearPricingCache() // Force re-fetch with new destination
}

// Step 2: Component requests pricing with destination
const { data, isLoading } = usePricingData({
  partNames: selectedParts.map(p => p.name),
  shippingDestination: shippingDestination
})

// Step 3: Hook makes API call
const usePricingData = ({ partNames, shippingDestination }) => {
  return useSWR(
    ['pricing', partNames, shippingDestination],
    () => fetchPricingData(partNames, shippingDestination),
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000 // 1 minute cache
    }
  )
}
```

#### 3. API Layer Processing
```typescript
// API receives request with shipping destination
POST /api/parts/pricing
{
  "partNames": ["Arduino Uno", "LED 5mm Red"],
  "shippingDestination": {
    "country": "US",
    "region": "California",
    "postalCode": "94105"
  }
}

// API processes each part with destination context
for (const partName of partNames) {
  // Cache key includes destination for proper caching
  const cacheKey = `${partName}-${destination.country}-${destination.region}`
  
  // Check cache first
  const cached = await priceCache.get(cacheKey)
  if (cached) return cached
  
  // Call Perplexity with destination
  const pricing = await perplexityApi.searchPricing(partName, destination)
  await priceCache.set(cacheKey, pricing)
}
```

#### 4. Perplexity API Integration
```typescript
// Build prompt with specific destination
const prompt = buildPricingPrompt("Arduino Uno", {
  country: "US",
  region: "California"
})

// Prompt includes destination-specific request
"Search for Arduino Uno pricing with delivery to California, US.
Include shipping time from each supplier's warehouse to California."

// Perplexity searches and returns location-aware results
{
  "supplier": "Digi-Key",
  "unitPrice": 23.00,
  "deliveryDays": 3,        // US warehouse → California
  "shippingLocation": "US"
},
{
  "supplier": "Mouser",
  "unitPrice": 24.50,
  "deliveryDays": 7,        // Asia warehouse → California
  "shippingLocation": "HK"
}
```

#### 5. Response Flow
```typescript
// Frontend receives destination-specific data
{
  "success": true,
  "data": {
    "Arduino Uno": [
      {
        "supplier": "Digi-Key",
        "unitPrice": 23.00,
        "deliveryDays": 3,
        "shippingDestination": { "country": "US", "region": "California" }
      }
    ]
  },
  "meta": {
    "shippingDestination": { "country": "US", "region": "California" },
    "timestamp": "2025-01-15T10:30:00Z"
  }
}

// UI updates to show location-specific information
<PriceDisplay>
  $23.00 from Digi-Key
  📦 3 days delivery to California
</PriceDisplay>
```

#### 6. Cache Strategy with Destination
```typescript
// Cache key structure includes destination
const cacheKey = `${partName}-${destination.country}-${destination.region}`

// Cache entries are destination-specific
Map {
  "Arduino Uno-JP-東京" => [...pricing for Tokyo],
  "Arduino Uno-US-California" => [...pricing for California],
  "Arduino Uno-CN-北京" => [...pricing for Beijing]
}

// When destination changes, different cache entries are used
```

## Shipping Destination UI Integration

### User-Configurable Shipping Location
The component procurement tab will include a shipping destination selector that allows users to dynamically change the delivery location and see updated pricing/delivery information:

```typescript
// Shipping destination state in the procurement UI
interface ShippingDestination {
  country: string      // Country code: 'JP', 'US', 'CN', etc.
  region?: string      // Region/State: '東京', 'California', '北京', etc.
  postalCode?: string  // For accurate delivery estimates
}

// Component procurement state
interface ProcurementState {
  selectedComponents: Component[]
  shippingDestination: ShippingDestination
  pricingData: Map<string, ComponentPricingExtended[]>
  isLoading: boolean
}
```

### UI Components for Shipping Configuration

```typescript
// Shipping destination selector component
interface ShippingDestinationSelectorProps {
  destination: ShippingDestination
  onChange: (destination: ShippingDestination) => void
}

export function ShippingDestinationSelector({ 
  destination, 
  onChange 
}: ShippingDestinationSelectorProps) {
  return (
    <div className="shipping-destination-selector">
      <label>配送先 / Shipping Destination</label>
      <select 
        value={destination.country}
        onChange={(e) => onChange({ ...destination, country: e.target.value })}
      >
        <option value="JP">日本 (Japan)</option>
        <option value="US">アメリカ (USA)</option>
        <option value="CN">中国 (China)</option>
        <option value="KR">韓国 (Korea)</option>
        <option value="DE">ドイツ (Germany)</option>
        {/* More countries */}
      </select>
      
      <input
        type="text"
        placeholder="地域・都市 (Region/City)"
        value={destination.region || ''}
        onChange={(e) => onChange({ ...destination, region: e.target.value })}
      />
      
      <input
        type="text"
        placeholder="郵便番号 (Postal Code)"
        value={destination.postalCode || ''}
        onChange={(e) => onChange({ ...destination, postalCode: e.target.value })}
      />
    </div>
  )
}
```

### Local Storage Persistence
```typescript
// Save user's preferred shipping destination
const SHIPPING_DESTINATION_KEY = 'orboh_shipping_destination'

export function saveShippingDestination(destination: ShippingDestination) {
  localStorage.setItem(SHIPPING_DESTINATION_KEY, JSON.stringify(destination))
}

export function loadShippingDestination(): ShippingDestination {
  const saved = localStorage.getItem(SHIPPING_DESTINATION_KEY)
  if (saved) {
    try {
      return JSON.parse(saved)
    } catch (e) {
      // Invalid data, return default
    }
  }
  return { country: 'JP', region: '東京' } // Default to Tokyo
}
```

## Component Design

### 1. Perplexity API Integration Module (`/utils/external/perplexityApi.ts`)

```typescript
// Core interfaces
interface PerplexityConfig {
  apiKey: string
  baseUrl: string
  timeout: number
  retryAttempts: number
}

interface PerplexityPricingRequest {
  partName: string
  suppliers?: string[]
  includeDelivery?: boolean
  shippingDestination: {
    country: string
    region?: string
    postalCode?: string
  }
}

interface PerplexityPricingResponse {
  pricing: ComponentPricingExtended[]
  raw: string // Original response for debugging
  cached: boolean
  timestamp: string
}

// Main functions
export async function searchPartPricingWithPerplexity(
  partName: string,
  shippingDestination: ShippingDestination
): Promise<ComponentPricingExtended[]>

export async function batchSearchWithPerplexity(
  partNames: string[]
): Promise<Map<string, ComponentPricingExtended[]>>

// Prompt engineering
function buildPricingPrompt(partName: string, destination: ShippingDestination): string
function parsePerplexityResponse(response: string): ComponentPricingExtended[]
```

### 2. Enhanced Type Definitions (`/types/parts.ts`)

```typescript
// Extend existing ComponentPricing interface
export interface ComponentPricingExtended extends ComponentPricing {
  // New fields for delivery information
  deliveryDays: number
  shippingLocation?: string  // Warehouse location (e.g., 'US', 'CN', 'JP')
  shippingCost?: number
  deliveryDaysRange?: {  // Some suppliers provide ranges
    min: number
    max: number
  }
  shippingDestination: ShippingDestination  // User-selected destination from UI
  
  // Purchase link information
  purchaseUrl?: string
  isDirectLink: boolean
  
  // Data source tracking
  dataSource: 'perplexity' | 'mock' | 'cache'
}

// Response wrapper for API calls
export interface PricingApiResponse {
  success: boolean
  data: ComponentPricingExtended[]
  error?: string
  meta: {
    cached: boolean
    timestamp: string
    apiCallsRemaining?: number
  }
}
```

### 3. Price Data Persistence

#### Database Schema Update
canvas_nodesテーブルに価格キャッシュフィールドを追加し、配送先別の価格データを永続化：

```prisma
model canvas_nodes {
  // ... existing fields ...
  cached_pricing      Json?      // 価格キャッシュ（配送先別）
  pricing_updated_at  DateTime?  // 価格更新日時
  
  @@index([pricing_updated_at])
}
```

#### Cached Pricing Data Structure
```typescript
// canvas_nodes.cached_pricingのJSON構造
interface CachedPricingData {
  [destinationKey: string]: {  // e.g., "JP_東京", "US_California"
    prices: ComponentPricingExtended[]
    fetchedAt: string         // ISO timestamp
    ttl: number              // TTL in seconds
  }
}

// 使用例
{
  "JP_東京": {
    "prices": [
      {
        "supplier": "Digi-Key",
        "unitPrice": 2500,
        "currency": "JPY",
        "deliveryDays": 5,
        "shippingLocation": "JP",
        // ... other fields
      }
    ],
    "fetchedAt": "2025-01-15T10:30:00Z",
    "ttl": 14400  // 4 hours
  },
  "US_California": {
    "prices": [...],
    "fetchedAt": "2025-01-15T09:00:00Z",
    "ttl": 14400
  }
}
```

#### Price Cache Service
```typescript
// /utils/pricing/priceCacheService.ts
export class PriceCacheService {
  /**
   * 配送先別の価格キャッシュキーを生成
   */
  private static getCacheKey(destination: ShippingDestination): string {
    return `${destination.country}_${destination.region || 'default'}`
  }

  /**
   * ノードの価格キャッシュを取得
   */
  static async getCachedPricing(
    nodeId: string,
    destination: ShippingDestination
  ): Promise<ComponentPricingExtended[] | null> {
    const node = await prisma.canvas_nodes.findUnique({
      where: { id: nodeId },
      select: { cached_pricing: true, pricing_updated_at: true }
    })

    if (!node?.cached_pricing) return null

    const cacheKey = this.getCacheKey(destination)
    const cachedData = (node.cached_pricing as CachedPricingData)[cacheKey]
    
    if (!cachedData) return null

    // TTLチェック
    const expiresAt = new Date(cachedData.fetchedAt).getTime() + (cachedData.ttl * 1000)
    if (Date.now() > expiresAt) return null

    return cachedData.prices
  }

  /**
   * ノードに価格をキャッシュ
   */
  static async setCachedPricing(
    nodeId: string,
    destination: ShippingDestination,
    prices: ComponentPricingExtended[],
    ttlSeconds: number = 14400 // 4 hours default
  ): Promise<void> {
    const cacheKey = this.getCacheKey(destination)
    
    // 既存のキャッシュを取得
    const node = await prisma.canvas_nodes.findUnique({
      where: { id: nodeId },
      select: { cached_pricing: true }
    })

    const existingCache = (node?.cached_pricing as CachedPricingData) || {}
    
    // 新しいキャッシュデータを追加/更新
    const updatedCache: CachedPricingData = {
      ...existingCache,
      [cacheKey]: {
        prices,
        fetchedAt: new Date().toISOString(),
        ttl: ttlSeconds
      }
    }

    // データベース更新
    await prisma.canvas_nodes.update({
      where: { id: nodeId },
      data: {
        cached_pricing: updatedCache,
        pricing_updated_at: new Date()
      }
    })
  }

  /**
   * 期限切れキャッシュのクリーンアップ
   */
  static async cleanupExpiredCache(): Promise<number> {
    const nodes = await prisma.canvas_nodes.findMany({
      where: {
        cached_pricing: { not: null },
        pricing_updated_at: {
          lt: new Date(Date.now() - 24 * 60 * 60 * 1000) // 24時間以上前
        }
      }
    })

    let cleanedCount = 0
    for (const node of nodes) {
      const cache = node.cached_pricing as CachedPricingData
      const updatedCache: CachedPricingData = {}
      
      // 有効なキャッシュのみ保持
      for (const [key, data] of Object.entries(cache)) {
        const expiresAt = new Date(data.fetchedAt).getTime() + (data.ttl * 1000)
        if (Date.now() <= expiresAt) {
          updatedCache[key] = data
        } else {
          cleanedCount++
        }
      }

      // 空の場合はnullに設定
      await prisma.canvas_nodes.update({
        where: { id: node.id },
        data: {
          cached_pricing: Object.keys(updatedCache).length > 0 ? updatedCache : null
        }
      })
    }

    return cleanedCount
  }
}
```

### 4. Integrated Cache Strategy

既存のRedisCacheServiceとデータベースキャッシュを統合した多層キャッシュ戦略：

```typescript
// /utils/pricing/integratedPricingCache.ts
export class IntegratedPricingCache {
  private memoryCache: Map<string, CacheEntry> = new Map()
  private readonly MEMORY_TTL = 60 * 60 * 1000 // 1 hour in memory
  
  /**
   * 統合された価格取得フロー
   * 1. メモリキャッシュ → 2. DBキャッシュ → 3. Perplexity API
   */
  async getPricing(
    nodeId: string,
    partName: string,
    destination: ShippingDestination
  ): Promise<ComponentPricingExtended[]> {
    const cacheKey = `${nodeId}-${destination.country}-${destination.region}`
    
    // 1. メモリキャッシュチェック
    const memoryData = this.getFromMemory(cacheKey)
    if (memoryData) {
      console.log('✅ Price hit: Memory cache')
      return memoryData
    }
    
    // 2. DBキャッシュチェック
    const dbData = await PriceCacheService.getCachedPricing(nodeId, destination)
    if (dbData) {
      console.log('✅ Price hit: Database cache')
      this.setToMemory(cacheKey, dbData)
      return dbData
    }
    
    // 3. Perplexity API呼び出し
    console.log('🔄 Price miss: Fetching from Perplexity API')
    const freshData = await searchPartPricingWithPerplexity(partName, destination)
    
    // 両方のキャッシュに保存
    await this.cacheToAll(nodeId, cacheKey, destination, freshData)
    
    return freshData
  }
  
  private async cacheToAll(
    nodeId: string,
    memoryKey: string,
    destination: ShippingDestination,
    data: ComponentPricingExtended[]
  ): Promise<void> {
    // メモリキャッシュ
    this.setToMemory(memoryKey, data)
    
    // DBキャッシュ（非同期で実行）
    PriceCacheService.setCachedPricing(nodeId, destination, data).catch(err => {
      console.error('Failed to cache to DB:', err)
    })
  }
  
  private getFromMemory(key: string): ComponentPricingExtended[] | null {
    const entry = this.memoryCache.get(key)
    if (!entry) return null
    
    if (Date.now() > entry.expiry) {
      this.memoryCache.delete(key)
      return null
    }
    
    return entry.data
  }
  
  private setToMemory(key: string, data: ComponentPricingExtended[]): void {
    this.memoryCache.set(key, {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + this.MEMORY_TTL
    })
    
    // メモリ制限（最大100エントリ）
    if (this.memoryCache.size > 100) {
      const oldestKey = Array.from(this.memoryCache.entries())
        .sort(([, a], [, b]) => a.timestamp - b.timestamp)[0][0]
      this.memoryCache.delete(oldestKey)
    }
  }
}

// シングルトンインスタンス
export const integratedCache = new IntegratedPricingCache()
```

### 4. Modified octopartApi.ts Integration

```typescript
// Modify existing searchPartPricing function
export async function searchPartPricing(
  partName: string,
  shippingDestination?: ShippingDestination
): Promise<ComponentPricing[]> {
  try {
    // Check if Perplexity API is configured
    if (process.env.PERPLEXITY_API_KEY && shippingDestination) {
      const extendedResults = await searchPartPricingWithPerplexity(
        partName,
        shippingDestination
      )
      // Convert to backward-compatible format
      return extendedResults.map(result => ({
        unitPrice: result.unitPrice,
        currency: result.currency,
        supplier: result.supplier,
        availability: result.availability,
        moq: result.moq,
        lastUpdated: result.lastUpdated
      }))
    }
    
    // Fallback to existing mock data generation
    return generateMockPricing(partName)
  } catch (error) {
    console.error('Error in searchPartPricing:', error)
    return generateMockPricing(partName)
  }
}
```

## API Design

### Updated API Endpoint

#### `/api/parts/pricing` Endpoint Enhancement
```typescript
// pages/api/parts/pricing.ts
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { 
    partNames, 
    shippingDestination 
  }: {
    partNames: string[]
    shippingDestination: ShippingDestination
  } = req.body

  if (!partNames || !Array.isArray(partNames)) {
    return res.status(400).json({ error: 'Invalid part names' })
  }

  if (!shippingDestination?.country) {
    return res.status(400).json({ error: 'Shipping destination required' })
  }

  try {
    const results = new Map<string, ComponentPricingExtended[]>()
    
    // Batch process with shipping destination
    for (const partName of partNames) {
      const pricing = await searchPartPricing(partName, shippingDestination)
      results.set(partName, pricing)
    }

    return res.status(200).json({
      success: true,
      data: Object.fromEntries(results),
      meta: {
        shippingDestination,
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Pricing API error:', error)
    return res.status(500).json({ 
      error: 'Failed to fetch pricing data',
      fallback: true 
    })
  }
}
```

### Perplexity API Integration

#### Request Format
```typescript
const perplexityRequest = {
  model: "llama-3.1-sonar-small-128k-online",
  messages: [
    {
      role: "system",
      content: "You are a component pricing assistant. Return data in JSON format only."
    },
    {
      role: "user",
      content: buildPricingPrompt(partName)
    }
  ],
 // temperature: 0.2,
  top_p: 0.9,
  search_domain_filter: ["digikey.com", "mouser.com", "newark.com", "rs-online.com", "aliexpress.com", "amazon.com"],
  return_citations: true,
  search_recency_filter: "month"
}
```

#### Prompt Template
```typescript
function buildPricingPrompt(
  partName: string,
  destination: ShippingDestination
): string {
  const locationString = destination.region 
    ? `${destination.region}, ${destination.country}`
    : destination.country;
    
  return `
Search for current pricing and availability for electronic component: "${partName}"
Shipping destination: ${locationString}

Return ONLY a JSON array with the following structure for each supplier (max 5 results):
{
  "supplier": "supplier name",
  "unitPrice": numeric price in USD,
  "currency": "USD",
  "availability": "in_stock" | "limited" | "out_of_stock",
  "moq": minimum order quantity as number,
  "deliveryDays": estimated delivery days to ${locationString},
  "shippingFrom": "warehouse location (e.g., 'US', 'CN', 'JP')",
  "purchaseUrl": "direct product page URL if available",
  "lastUpdated": "ISO date string"
}

Focus on major suppliers: Digi-Key, Mouser, Newark, RS Components, AliExpress, Amazon.
Include realistic delivery time estimates based on:
- Supplier's warehouse location
- Shipping to ${locationString}
- Standard shipping methods
- Current stock location

If exact match not found, include closest alternatives.
`
}
```

### Response Parsing

```typescript
function parsePerplexityResponse(response: string): ComponentPricingExtended[] {
  try {
    // Extract JSON from response
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('No JSON array found in response')
    }
    
    const parsed = JSON.parse(jsonMatch[0])
    
    // Validate and transform each entry
    return parsed.map((item: any) => ({
      unitPrice: parseFloat(item.unitPrice) || 0,
      currency: item.currency || 'USD',
      supplier: item.supplier || 'Unknown',
      availability: validateAvailability(item.availability),
      moq: parseInt(item.moq) || 1,
      lastUpdated: item.lastUpdated || new Date().toISOString(),
      deliveryDays: parseInt(item.deliveryDays) || 7,
      shippingLocation: item.shippingFrom || 'Unknown',
      purchaseUrl: item.purchaseUrl || '',
      isDirectLink: !!item.purchaseUrl,
      dataSource: 'perplexity' as const
    }))
  } catch (error) {
    console.error('Error parsing Perplexity response:', error)
    throw new Error('Failed to parse pricing data')
  }
}
```

## Error Handling

### Fallback Strategy
```typescript
async function searchWithFallback(partName: string): Promise<ComponentPricingExtended[]> {
  try {
    // 1. Try cache first
    const cached = await priceCache.get(partName)
    if (cached) return cached
    
    // 2. Try Perplexity API
    if (process.env.PERPLEXITY_API_KEY) {
      const results = await searchPartPricingWithPerplexity(partName)
      await priceCache.set(partName, results)
      return results
    }
    
    // 3. Fallback to mock data
    const mockData = generateMockPricingExtended(partName)
    return mockData
    
  } catch (error) {
    console.error('Search failed, using mock data:', error)
    return generateMockPricingExtended(partName)
  }
}
```

### Error Types
```typescript
export class PerplexityAPIError extends Error {
  constructor(
    message: string,
    public code: 'RATE_LIMIT' | 'INVALID_KEY' | 'PARSE_ERROR' | 'NETWORK',
    public statusCode?: number
  ) {
    super(message)
    this.name = 'PerplexityAPIError'
  }
}
```

## Performance Optimization

### Batch Processing
```typescript
async function batchSearchWithPerplexity(
  partNames: string[]
): Promise<Map<string, ComponentPricingExtended[]>> {
  const results = new Map()
  const BATCH_SIZE = 3
  const DELAY_MS = 2000
  
  // Process in batches
  for (let i = 0; i < partNames.length; i += BATCH_SIZE) {
    const batch = partNames.slice(i, i + BATCH_SIZE)
    
    // Parallel processing within batch
    const batchPromises = batch.map(async (partName) => {
      try {
        const pricing = await searchPartPricingWithPerplexity(partName)
        return { partName, pricing }
      } catch (error) {
        console.error(`Failed to get pricing for ${partName}:`, error)
        return { partName, pricing: generateMockPricingExtended(partName) }
      }
    })
    
    const batchResults = await Promise.all(batchPromises)
    batchResults.forEach(({ partName, pricing }) => {
      results.set(partName, pricing)
    })
    
    // Rate limiting delay between batches
    if (i + BATCH_SIZE < partNames.length) {
      await new Promise(resolve => setTimeout(resolve, DELAY_MS))
    }
  }
  
  return results
}
```

### API Usage Tracking
```typescript
class APIUsageTracker {
  private usage: Map<string, number> = new Map()
  private readonly MONTHLY_LIMIT = 10000
  
  async incrementUsage(apiKey: string): Promise<void>
  async getUsage(apiKey: string): Promise<number>
  async isWithinLimit(apiKey: string): Promise<boolean>
  async reset(): Promise<void>
}

export const usageTracker = new APIUsageTracker()
```

## UI Integration

### Component Procurement Tab Updates

#### Enhanced Parts Management UI
```typescript
// Updated PartsManagementTable with shipping destination
export function PartsManagementTable() {
  const [shippingDestination, setShippingDestination] = useState<ShippingDestination>(
    loadShippingDestination()
  )
  const [pricingCache, setPricingCache] = useState<Map<string, ComponentPricingExtended[]>>(
    new Map()
  )

  // Update pricing when destination changes
  useEffect(() => {
    saveShippingDestination(shippingDestination)
    // Clear cache to force re-fetch with new destination
    setPricingCache(new Map())
  }, [shippingDestination])

  // Fetch pricing with shipping destination
  const fetchPricing = async (partName: string) => {
    const cacheKey = `${partName}-${shippingDestination.country}-${shippingDestination.region}`
    
    if (pricingCache.has(cacheKey)) {
      return pricingCache.get(cacheKey)!
    }

    const pricing = await searchPartPricingWithPerplexity(partName, shippingDestination)
    setPricingCache(prev => new Map(prev).set(cacheKey, pricing))
    return pricing
  }

  return (
    <div>
      <ShippingDestinationSelector
        destination={shippingDestination}
        onChange={setShippingDestination}
      />
      {/* Rest of the parts table */}
    </div>
  )
}
```

### Component Updates

#### MarketDataDisplay Enhancement
```typescript
// Add delivery information display
interface MarketDataDisplayProps {
  pricing: ComponentPricingExtended[]
  showDeliveryInfo?: boolean
  onPurchaseClick?: (url: string) => void
}

// Display mock data indicator
{pricing.some(p => p.dataSource === 'mock') && (
  <Alert severity="info">
    一部の価格データは参考値です
  </Alert>
)}
```

#### PurchaseLink Integration
```typescript
// Integrate with existing purchaseLinkGenerator
function enhancePurchaseLinks(
  pricing: ComponentPricingExtended,
  partName: string
): PurchaseLink {
  if (pricing.purchaseUrl && pricing.isDirectLink) {
    return {
      supplier: pricing.supplier,
      url: pricing.purchaseUrl,
      description: '商品ページへ',
      priority: 1
    }
  }
  
  // Fallback to generated links
  return generatePurchaseLink(partName, pricing.supplier)
}
```

## Testing Strategy

### Unit Tests
- Perplexity API prompt generation
- Response parsing with various formats
- Cache operations
- Error handling and fallbacks

### Integration Tests
- API endpoint testing
- Full data flow from UI to external API
- Rate limiting behavior
- Fallback scenarios

### Mock Testing
```typescript
// Mock Perplexity API for testing
export const mockPerplexityAPI = {
  search: jest.fn().mockResolvedValue({
    choices: [{
      message: {
        content: JSON.stringify([
          {
            supplier: "Digi-Key",
            unitPrice: 10.50,
            currency: "USD",
            availability: "in_stock",
            moq: 1,
            deliveryDays: 3,
            purchaseUrl: "https://www.digikey.com/product/12345",
            lastUpdated: new Date().toISOString()
          }
        ])
      }
    }]
  })
}
```

## Security Considerations

1. **API Key Management**
   - Store in environment variables
   - Never expose in client-side code
   - Implement key rotation mechanism

2. **Input Validation**
   - Sanitize part names before API calls
   - Validate response data structure
   - Prevent injection attacks

3. **Rate Limiting**
   - Implement client-side rate limiting
   - Monitor usage patterns
   - Alert on anomalies

## Migration Plan

1. **Phase 1**: Implement Perplexity API module
2. **Phase 2**: Add caching layer
3. **Phase 3**: Update type definitions
4. **Phase 4**: Modify octopartApi.ts to use new module
5. **Phase 5**: Update UI components
6. **Phase 6**: Deploy with feature flag
7. **Phase 7**: Monitor and optimize

## Configuration

### Environment Variables
```env
# .env.local
PERPLEXITY_API_KEY=your_api_key_here
PERPLEXITY_API_URL=https://api.perplexity.ai
PRICE_CACHE_TTL=86400000  # 24 hours in ms
API_RATE_LIMIT=3  # requests per second
MONTHLY_API_LIMIT=10000
```

### Feature Flags
```typescript
export const features = {
  usePerplexityAPI: process.env.NEXT_PUBLIC_USE_PERPLEXITY === 'true',
  showDeliveryInfo: process.env.NEXT_PUBLIC_SHOW_DELIVERY === 'true',
  enablePriceCache: process.env.NEXT_PUBLIC_ENABLE_CACHE !== 'false'
}
```