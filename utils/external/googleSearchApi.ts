// Google Custom Search API統合による電子部品購入リンク取得
// Phase 1: 購入リンクのみの実装

import type {
  ComponentPricingExtended,
  ShippingDestination,
} from '@/types/parts';

// ============================================
// 設定とインターフェース
// ============================================

export interface GoogleSearchConfig {
  apiKey: string;
  searchEngineId: string;
  timeout: number;
  maxResults: number;
}

export interface SearchResult {
  title: string;
  link: string;
  snippet: string;
  displayLink: string;
}

// ============================================
// エラー処理
// ============================================

export class GoogleSearchAPIError extends Error {
  constructor(
    message: string,
    public code: 'INVALID_KEY' | 'RATE_LIMIT' | 'NETWORK' | 'NO_RESULTS',
    public statusCode?: number,
  ) {
    super(message);
    this.name = 'GoogleSearchAPIError';
  }
}

// ============================================
// API設定
// ============================================

const config: GoogleSearchConfig = {
  apiKey: process.env.GOOGLE_API_KEY || '',
  searchEngineId: process.env.GOOGLE_SEARCH_ENGINE_ID || '',
  timeout: 10000, // 10秒
  maxResults: 5, // 上位10件を取得（より多くの結果を取得）
};

// 信頼できる電子部品販売サイト
const TRUSTED_SUPPLIERS = [
  { domain: 'digikey.com', name: 'DigiKey', priority: 1 },
  { domain: 'digikey.jp', name: 'DigiKey Japan', priority: 1 },
  { domain: 'mouser.com', name: 'Mouser', priority: 2 },
  { domain: 'mouser.jp', name: 'Mouser Japan', priority: 2 },
  { domain: 'rs-online.com', name: 'RS Components', priority: 3 },
  { domain: 'rsonline.jp', name: 'RS Components Japan', priority: 3 },
  { domain: 'farnell.com', name: 'Farnell', priority: 4 },
  { domain: 'newark.com', name: 'Newark', priority: 4 },
  { domain: 'arrow.com', name: 'Arrow', priority: 5 },
  { domain: 'chip1stop.com', name: 'Chip One Stop', priority: 6 },
  { domain: 'akizukidenshi.com', name: 'Akizuki', priority: 7 },
  { domain: 'aliexpress.com', name: 'AliExpress', priority: 8 },
  { domain: 'amazon.com', name: 'Amazon', priority: 9 },
  { domain: 'amazon.co.jp', name: 'Amazon Japan', priority: 9 },
];

// ============================================
// メイン関数
// ============================================

/**
 * 部品の購入リンクをGoogle Custom Search APIで検索
 */
export async function searchPartPurchaseLinks(
  partName: string,
  shippingDestination?: ShippingDestination,
): Promise<ComponentPricingExtended[]> {
  // APIキーチェック
  if (!config.apiKey || !config.searchEngineId) {
    throw new GoogleSearchAPIError(
      'Google API key or Search Engine ID not configured',
      'INVALID_KEY',
    );
  }

  try {
    // 検索クエリの構築（部品番号 + 販売サイト）
    const searchQuery = buildSearchQuery(partName, shippingDestination);

    // Google Custom Search API呼び出し
    const searchResults = await callGoogleSearchAPI(searchQuery);

    // 検索結果から購入リンクを抽出
    const purchaseLinks = extractPurchaseLinks(searchResults, partName);

    // ComponentPricingExtended形式に変換
    const pricingData = convertToPricingData(purchaseLinks, partName);

    console.log(`✅ Found ${pricingData.length} purchase links for ${partName}`);
    pricingData.forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.supplier}: ${p.purchaseUrl}`);
    });

    return pricingData;
  } catch (error) {
    if (error instanceof GoogleSearchAPIError) {
      throw error;
    }
    console.error('Unexpected error in Google Search API:', error);
    throw new GoogleSearchAPIError('Failed to fetch purchase links', 'NETWORK');
  }
}

/**
 * 検索クエリの構築
 */
function buildSearchQuery(partName: string, destination?: ShippingDestination): string {
  // もっとシンプルな検索クエリ（部品名のみで検索）
  const query = partName;

  console.log(`[DEBUG] Search query: ${query}`);
  return query;
}

/**
 * Google Custom Search API呼び出し
 */
async function callGoogleSearchAPI(query: string): Promise<SearchResult[]> {
  const url = new URL('https://www.googleapis.com/customsearch/v1');
  url.searchParams.append('key', config.apiKey);
  url.searchParams.append('cx', config.searchEngineId);
  url.searchParams.append('q', query);
  url.searchParams.append('num', config.maxResults.toString());

  console.log(`[DEBUG] Calling Google API: ${url.toString().substring(0, 100)}...`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.timeout);

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[ERROR] Google API response: ${response.status}`, errorText);

      if (response.status === 429) {
        throw new GoogleSearchAPIError('Rate limit exceeded', 'RATE_LIMIT', 429);
      }
      throw new GoogleSearchAPIError(
        `API error: ${response.status} - ${errorText}`,
        'NETWORK',
        response.status,
      );
    }

    const data = await response.json();
    console.log(`[DEBUG] Google API returned ${data.items?.length || 0} results`);

    if (!data.items || data.items.length === 0) {
      console.log('[DEBUG] No items found. Response:', JSON.stringify(data).substring(0, 200));
      throw new GoogleSearchAPIError('No search results found', 'NO_RESULTS');
    }

    return data.items.map((item: any) => ({
      title: item.title,
      link: item.link,
      snippet: item.snippet || '',
      displayLink: item.displayLink,
    }));
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error instanceof GoogleSearchAPIError) {
      throw error;
    }

    if (error.name === 'AbortError') {
      throw new GoogleSearchAPIError('Request timeout', 'NETWORK');
    }

    console.error('[ERROR] Unexpected error:', error);
    throw new GoogleSearchAPIError(`Network error: ${error.message}`, 'NETWORK');
  }
}

/**
 * 検索結果から購入リンクを抽出（フィルタリングなし）
 */
function extractPurchaseLinks(
  searchResults: SearchResult[],
  partName: string,
): Array<{ supplier: string; url: string; priority: number }> {
  const links: Array<{ supplier: string; url: string; priority: number }> = [];

  console.log(`[DEBUG] Processing ${searchResults.length} search results for ${partName}`);

  for (const result of searchResults) {
    console.log(`[DEBUG] Adding URL: ${result.link} (${result.displayLink})`);

    // 信頼できるサプライヤーか確認（優先度設定のため）
    const supplier = TRUSTED_SUPPLIERS.find(s =>
      result.displayLink.includes(s.domain) || result.link.includes(s.domain)
    );

    if (supplier) {
      // 既知のサプライヤーには優先度を設定
      console.log(`✅ Known supplier: ${supplier.name}`);
      links.push({
        supplier: supplier.name,
        url: result.link,
        priority: supplier.priority,
      });
    } else {
      // 未知のサイトも追加（優先度は低く設定）
      console.log(`➕ Adding unknown supplier: ${result.displayLink}`);
      links.push({
        supplier: result.displayLink || 'Unknown',
        url: result.link,
        priority: 100, // 最低優先度
      });
    }
  }

  console.log(`[DEBUG] Extracted ${links.length} purchase links (all results included)`);

  // 優先度でソート（既知のサプライヤーが上位に来る）
  return links.sort((a, b) => a.priority - b.priority);
}

/**
 * URLが製品ページかどうかを判定
 */
function isProductPage(url: string, partName: string): boolean {
  const urlLower = url.toLowerCase();
  const partNameLower = partName.toLowerCase().replace(/[^a-z0-9]/g, '');

  // 製品ページの特徴的なパターン
  const productPagePatterns = [
    /\/product\//,
    /\/products\//,
    /\/detail\//,
    /\/ProductDetail\//,
    /\/p\//,
    /\/parts\//,
    /\/item\//,
  ];

  // URLに部品番号が含まれているか
  const containsPartNumber = urlLower.includes(partNameLower) ||
    partNameLower.split(/[-_]/).some(part => part.length > 3 && urlLower.includes(part));

  // 製品ページパターンに一致するか
  const matchesPattern = productPagePatterns.some(pattern => pattern.test(url));

  return containsPartNumber || matchesPattern;
}

/**
 * ComponentPricingExtended形式に変換
 */
function convertToPricingData(
  purchaseLinks: Array<{ supplier: string; url: string; priority: number }>,
  partName: string,
): ComponentPricingExtended[] {
  return purchaseLinks.map(link => ({
    unitPrice: 0, // 価格は別途取得が必要
    currency: 'USD',
    supplier: link.supplier,
    availability: 'unknown' as any, // 在庫状況は不明
    moq: 1,
    lastUpdated: new Date().toISOString(),
    deliveryDays: 7, // デフォルト値
    shippingLocation: 'Unknown',
    purchaseUrl: link.url,
    isDirectLink: true,
    dataSource: 'google' as const,
  }));
}

/**
 * バッチ処理で複数部品の購入リンクを取得
 */
export async function batchSearchPurchaseLinks(
  partNames: string[],
  shippingDestination?: ShippingDestination,
): Promise<Map<string, ComponentPricingExtended[]>> {
  const results = new Map<string, ComponentPricingExtended[]>();
  const DELAY_MS = 1000; // Google APIのレート制限対策

  console.log(`🔄 Batch searching ${partNames.length} parts for purchase links...`);

  for (const partName of partNames) {
    try {
      const links = await searchPartPurchaseLinks(partName, shippingDestination);
      results.set(partName, links);

      // レート制限対策の遅延
      if (partNames.indexOf(partName) < partNames.length - 1) {
        await new Promise(resolve => setTimeout(resolve, DELAY_MS));
      }
    } catch (error) {
      console.error(`Failed to get purchase links for ${partName}:`, error);
      results.set(partName, []);
    }
  }

  return results;
}