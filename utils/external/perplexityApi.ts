// Perplexity API統合による電子部品価格取得
// リアルタイムの市場価格、在庫状況、配送情報を提供
// Google Custom Search APIとの統合で購入リンク取得を強化

import type {
  ComponentPricingExtended,
  ShippingDestination,
} from '@/types/parts';
import { searchPartPurchaseLinks } from './googleSearchApi';

// ============================================
// 設定とインターフェース
// ============================================

export interface PerplexityConfig {
  apiKey: string;
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
}

export interface PerplexityPricingRequest {
  partName: string;
  suppliers?: string[];
  includeDelivery?: boolean;
  shippingDestination: ShippingDestination;
}

export interface PerplexityPricingResponse {
  pricing: ComponentPricingExtended[];
  raw: string; // デバッグ用の元レスポンス
  cached: boolean;
  timestamp: string;
}

// ============================================
// エラー処理
// ============================================

export class PerplexityAPIError extends Error {
  constructor(
    message: string,
    public code: 'RATE_LIMIT' | 'INVALID_KEY' | 'PARSE_ERROR' | 'NETWORK',
    public statusCode?: number,
  ) {
    super(message);
    this.name = 'PerplexityAPIError';
  }
}

// ============================================
// API設定
// ============================================

const config: PerplexityConfig = {
  apiKey: process.env.PERPLEXITY_API_KEY || '',
  baseUrl: process.env.PERPLEXITY_API_URL || 'https://api.perplexity.ai',
  timeout: 30000, // 30秒
  retryAttempts: 3,
};

// レート制限
const RATE_LIMIT_DELAY = 1000 / parseInt(process.env.API_RATE_LIMIT || '3'); // デフォルト3req/s
let lastRequestTime = 0;

// ============================================
// メイン関数
// ============================================

/**
 * 部品の価格情報をPerplexity APIで検索
 * Google Custom Search APIを使用して購入リンクを補完
 */
export async function searchPartPricingWithPerplexity(
  partName: string,
  shippingDestination: ShippingDestination,
): Promise<ComponentPricingExtended[]> {
  // Google Custom Search APIを優先的に使用
  const useGoogleSearch = process.env.USE_GOOGLE_SEARCH === 'true' || !config.apiKey;

  if (useGoogleSearch) {
    console.log('🔍 Using Google Custom Search API for purchase links');
    try {
      const googleResults = await searchPartPurchaseLinks(partName, shippingDestination);
      if (googleResults.length > 0) {
        console.log(`✅ Found ${googleResults.length} purchase links via Google Search`);
        return googleResults;
      }
    } catch (error) {
      console.warn('Google Search API failed, falling back to Perplexity:', error);
    }
  }

  // Perplexity APIフォールバック
  if (!config.apiKey || config.apiKey === 'your_perplexity_api_key_here') {
    throw new PerplexityAPIError(
      'Perplexity API key not configured',
      'INVALID_KEY',
    );
  }

  // レート制限
  await enforceRateLimit();

  try {
    // プロンプト構築
    const prompt = buildPricingPrompt(partName, shippingDestination);

    // API呼び出し
    const response = await callPerplexityAPI(prompt);

    // レスポンス解析
    let pricing = parsePerplexityResponse(response);

    // URLが無効な項目をGoogle Searchで補完
    const itemsWithoutUrls = pricing.filter(p => !p.purchaseUrl);
    if (itemsWithoutUrls.length > 0) {
      console.log(`🔄 Attempting to find URLs for ${itemsWithoutUrls.length} items via Google`);
      try {
        const googleResults = await searchPartPurchaseLinks(partName, shippingDestination);

        // Google検索結果をマージ
        pricing = pricing.map(item => {
          if (!item.purchaseUrl) {
            const googleMatch = googleResults.find(g =>
              g.supplier.toLowerCase().includes(item.supplier.toLowerCase()) ||
              item.supplier.toLowerCase().includes(g.supplier.toLowerCase())
            );
            if (googleMatch) {
              return {
                ...item,
                purchaseUrl: googleMatch.purchaseUrl,
                isDirectLink: true,
              };
            }
          }
          return item;
        });
      } catch (error) {
        console.warn('Failed to supplement with Google Search:', error);
      }
    }

    console.log(`✅ Found ${pricing.length} pricing options for ${partName}`);
    // Debug: Log purchase URLs
    let validUrlCount = 0;
    pricing.forEach((p, i) => {
      const urlStatus = p.purchaseUrl ? '✅' : '❌';
      console.log(
        `  ${i + 1}. ${p.supplier}: ${urlStatus} ${p.purchaseUrl || 'NO URL'}`,
      );
      if (p.purchaseUrl) validUrlCount++;
    });
    console.log(`🔗 Valid URLs: ${validUrlCount}/${pricing.length}`);
    return pricing;
  } catch (error) {
    if (error instanceof PerplexityAPIError) {
      throw error;
    }

    console.error('Unexpected error in Perplexity API:', error);
    throw new PerplexityAPIError('Failed to fetch pricing data', 'NETWORK');
  }
}

/**
 * バッチ処理で複数部品の価格を取得
 */
export async function batchSearchWithPerplexity(
  partNames: string[],
  shippingDestination: ShippingDestination,
): Promise<Map<string, ComponentPricingExtended[]>> {
  const results = new Map<string, ComponentPricingExtended[]>();
  const BATCH_SIZE = 3;
  const DELAY_MS = 2000;

  console.log(`🔄 Batch searching ${partNames.length} parts...`);

  for (let i = 0; i < partNames.length; i += BATCH_SIZE) {
    const batch = partNames.slice(i, i + BATCH_SIZE);

    // バッチ内並列処理
    const batchPromises = batch.map(async (partName) => {
      try {
        const pricing = await searchPartPricingWithPerplexity(
          partName,
          shippingDestination,
        );
        return { partName, pricing };
      } catch (error) {
        console.error(`Failed to get pricing for ${partName}:`, error);
        // エラー時は空配列を返す（フォールバックは呼び出し側で処理）
        return { partName, pricing: [] };
      }
    });

    const batchResults = await Promise.all(batchPromises);
    batchResults.forEach(({ partName, pricing }) => {
      results.set(partName, pricing);
    });

    // バッチ間の遅延
    if (i + BATCH_SIZE < partNames.length) {
      await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
    }
  }

  console.log(`✅ Batch search completed: ${results.size} parts processed`);
  return results;
}

// ============================================
// プロンプトエンジニアリング
// ============================================

/**
 * 価格検索用のプロンプトを構築
 */
export function buildPricingPrompt(
  partName: string,
  destination: ShippingDestination,
): string {
  const locationString = destination.region
    ? `${destination.region}, ${destination.country}`
    : destination.country;

  // 部品名から型番を抽出（より正確な検索のため）
  const searchTerm = partName;

  return `
You are searching for CURRENT REAL-TIME pricing for this electronic component.

COMPONENT TO SEARCH:
- Part name: ${partName}
- Part number/model: ${searchTerm}
- Destination: ${locationString}

INSTRUCTIONS:
1. Search these specific supplier websites for EXACT matches:
   - Digi-Key (digikey.com) - Search their catalog for "${searchTerm}"
   - Mouser (mouser.com) - Search for "${searchTerm}"
   - RS Components (rs-online.com) - Search for "${searchTerm}"
   - Newark/Farnell (newark.com) - Search for "${searchTerm}"
   - LCSC (lcsc.com) - Search for "${searchTerm}"
   
2. For each supplier, find:
   - The EXACT product page URL (not search results page)
   - Current unit price in USD
   - Stock availability status
   - Minimum order quantity
   
3. CRITICAL URL REQUIREMENTS:
   - Must be a direct link to the product detail page
   - Example formats:
     * Digi-Key: https://www.digikey.com/en/products/detail/[manufacturer]/[part-number]/[product-id]
     * Mouser: https://www.mouser.com/ProductDetail/[manufacturer]/[part-number]
     * RS: https://www.rs-online.com/web/p/[category]/[product-id]
   - If you cannot find the EXACT product page, leave purchaseUrl empty
   - NEVER create fake URLs or use placeholder IDs

4. For pricing:
   - Use the single unit price (quantity 1)
   - Convert to USD if needed
   - Include volume pricing breaks if available

Return ONLY a JSON array with this exact structure:
[
  {
    "supplier": "Digi-Key",
    "unitPrice": 12.50,
    "currency": "USD",
    "availability": "in_stock",
    "stockQuantity": 500,
    "moq": 1,
    "deliveryDays": 3,
    "shippingLocation": "US",
    "purchaseUrl": "https://www.digikey.com/...",
    "productId": "manufacturer-specific-id",
    "volumePricing": [
      {"quantity": 10, "price": 11.25},
      {"quantity": 100, "price": 10.00}
    ],
    "lastUpdated": "2025-01-08T12:00:00Z"
  }
]

Search NOW for real-time pricing data.
`;
}

/**
 * Perplexityのレスポンスを解析
 */
export function parsePerplexityResponse(
  response: string,
): ComponentPricingExtended[] {
  try {
    // JSONを抽出
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('No JSON array found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // バリデーションと変換
    return parsed.map((item: Record<string, unknown>) => {
      const url = item.purchaseUrl || '';
      const isValidUrl = isValidProductUrl(url);

      return {
        unitPrice: parseFloat(item.unitPrice) || 0,
        currency: item.currency || 'USD',
        supplier: item.supplier || 'Unknown',
        availability: validateAvailability(item.availability),
        moq: parseInt(item.moq) || 1,
        lastUpdated: item.lastUpdated || new Date().toISOString(),
        deliveryDays: parseInt(item.deliveryDays) || 7,
        shippingLocation: item.shippingLocation || 'Unknown',
        purchaseUrl: isValidUrl ? url : '', // ダミーURLは空文字列に
        isDirectLink: isValidUrl,
        dataSource: 'perplexity' as const,
      };
    });
  } catch (error) {
    console.error('Error parsing Perplexity response:', error);
    throw new PerplexityAPIError('Failed to parse pricing data', 'PARSE_ERROR');
  }
}

// ============================================
// ヘルパー関数
// ============================================

/**
 * Perplexity APIを呼び出し
 */
async function callPerplexityAPI(prompt: string): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.timeout);

  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar-pro', // より高精度なモデルに変更
        messages: [
          {
            role: 'system',
            content:
              'You are a component pricing assistant. Return data in JSON format only.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        // temperature: 0.1, // より確定的な結果のため低めに設定
        top_p: 0.95,
        search_domain_filter: [
          'digikey.com',
          'mouser.com',
          'newark.com',
          'rs-online.com',
          'aliexpress.com',
          'amazon.com',
        ],
        return_citations: true,
        search_recency_filter: 'week', // より最新の価格情報を取得
        search_quality: 'high', // 高品質検索モード
        return_related_questions: false,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      // エラーレスポンスの詳細を取得
      let errorDetail = '';
      try {
        const errorData = await response.json();
        errorDetail = JSON.stringify(errorData);
        console.error('Perplexity API error response:', errorData);
      } catch {
        errorDetail = await response.text();
      }

      if (response.status === 429) {
        throw new PerplexityAPIError('Rate limit exceeded', 'RATE_LIMIT', 429);
      }
      throw new PerplexityAPIError(
        `API error: ${response.status} - ${errorDetail}`,
        'NETWORK',
        response.status,
      );
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      throw new PerplexityAPIError('Request timeout', 'NETWORK');
    }

    throw error;
  }
}

/**
 * レート制限を適用
 */
async function enforceRateLimit(): Promise<void> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < RATE_LIMIT_DELAY) {
    const delay = RATE_LIMIT_DELAY - timeSinceLastRequest;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  lastRequestTime = Date.now();
}

/**
 * 在庫状況のバリデーション
 */
function validateAvailability(
  status: string,
): 'in_stock' | 'limited' | 'out_of_stock' {
  const normalized = status?.toLowerCase() || '';

  if (normalized.includes('in_stock') || normalized.includes('available')) {
    return 'in_stock';
  }
  if (normalized.includes('limited') || normalized.includes('low')) {
    return 'limited';
  }

  return 'out_of_stock';
}

/**
 * URLがダミーかどうかを検証
 */
function isValidProductUrl(url: string): boolean {
  if (!url) return false;

  // ダミーURLのパターンをチェック
  const dummyPatterns = [
    /\/1234567$/, // Ends with /1234567
    /\/\d{10}$/, // Ends with exactly 10 digits
    /1005001234567890/, // Specific dummy ID
    /\/B[0-9A-Z]{9}$/, // Generic Amazon ASIN pattern (too generic)
    /\/product\/unknown\//i, // Unknown product
    /\/example\//i, // Example URLs
    /\/test\//i, // Test URLs
  ];

  // ダミーパターンに一致したらfalse
  for (const pattern of dummyPatterns) {
    if (pattern.test(url)) {
      console.warn(`🚫 Detected dummy URL: ${url}`);
      return false;
    }
  }

  // 有効なURLパターンをチェック
  try {
    const urlObj = new URL(url);
    // HTTPSまたはHTTPで始まり、有効なドメインを持つ
    return (
      (urlObj.protocol === 'https:' || urlObj.protocol === 'http:') &&
      urlObj.hostname.includes('.')
    );
  } catch {
    return false;
  }
}
