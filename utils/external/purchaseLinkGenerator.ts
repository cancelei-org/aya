// 購入先リンク自動生成ユーティリティ
// 部品名から適切な購入先URLを生成

/**
 * 部品タイプの判定結果
 */
interface ComponentType {
  category: string
  keywords: string[]
  suppliers: SupplierTemplate[]
}

/**
 * サプライヤーテンプレート
 */
interface SupplierTemplate {
  name: string
  baseUrl: string
  searchTemplate: string
  description: string
}

/**
 * 生成された購入先情報
 */
export interface PurchaseLink {
  supplier: string
  url: string
  description: string
  priority: number // 1: 最優先, 2: 推奨, 3: 代替
}

/**
 * サプライヤーテンプレート定義
 */
const supplierTemplates: Record<string, SupplierTemplate[]> = {
  arduino: [
    {
      name: 'Arduino Store',
      baseUrl: 'https://store.arduino.cc',
      searchTemplate: '/search?q={query}',
      description: '公式Arduino Store'
    },
    {
      name: '秋月電子',
      baseUrl: 'https://akizukidenshi.com',
      searchTemplate: '/catalog/c/carduino',
      description: '日本の電子部品専門店'
    },
    {
      name: 'Amazon',
      baseUrl: 'https://amazon.co.jp',
      searchTemplate: '/s?k={query}+arduino',
      description: 'Amazon Japan'
    }
  ],
  led: [
    {
      name: '秋月電子',
      baseUrl: 'https://akizukidenshi.com',
      searchTemplate: '/catalog/c/cled',
      description: 'LED専門カテゴリ'
    },
    {
      name: 'AliExpress',
      baseUrl: 'https://aliexpress.com',
      searchTemplate: '/wholesale?SearchText={query}+led',
      description: '大量購入に適している'
    },
    {
      name: 'Amazon',
      baseUrl: 'https://amazon.co.jp',
      searchTemplate: '/s?k={query}+LED',
      description: 'Amazon Japan'
    }
  ],
  resistor: [
    {
      name: '秋月電子',
      baseUrl: 'https://akizukidenshi.com',
      searchTemplate: '/catalog/c/cresistor',
      description: '抵抗器専門カテゴリ'
    },
    {
      name: 'Digi-Key',
      baseUrl: 'https://digikey.jp',
      searchTemplate: '/products/resistors',
      description: '高品質な抵抗器'
    },
    {
      name: 'AliExpress',
      baseUrl: 'https://aliexpress.com',
      searchTemplate: '/wholesale?SearchText={query}+resistor',
      description: '大量購入セット'
    }
  ],
  sensor: [
    {
      name: 'SparkFun',
      baseUrl: 'https://sparkfun.com',
      searchTemplate: '/search/results?term={query}',
      description: 'センサー専門店'
    },
    {
      name: 'Adafruit',
      baseUrl: 'https://adafruit.com',
      searchTemplate: '/search?q={query}',
      description: 'IoT部品専門'
    },
    {
      name: '秋月電子',
      baseUrl: 'https://akizukidenshi.com',
      searchTemplate: '/catalog/c/csensor',
      description: '日本の電子部品専門店'
    }
  ],
  microcontroller: [
    {
      name: 'PJRC (Teensy)',
      baseUrl: 'https://pjrc.com',
      searchTemplate: '/store/',
      description: 'Teensy公式ストア'
    },
    {
      name: 'SparkFun',
      baseUrl: 'https://sparkfun.com',
      searchTemplate: '/search/results?term={query}',
      description: 'マイコン開発ボード'
    },
    {
      name: 'Amazon',
      baseUrl: 'https://amazon.co.jp',
      searchTemplate: '/s?k={query}+microcontroller',
      description: 'Amazon Japan'
    }
  ],
  generic: [
    {
      name: 'Amazon',
      baseUrl: 'https://amazon.co.jp',
      searchTemplate: '/s?k={query}',
      description: '汎用検索'
    },
    {
      name: 'AliExpress',
      baseUrl: 'https://aliexpress.com',
      searchTemplate: '/wholesale?SearchText={query}',
      description: '海外通販'
    },
    {
      name: 'Yahoo Shopping',
      baseUrl: 'https://shopping.yahoo.co.jp',
      searchTemplate: '/search?p={query}',
      description: '国内通販'
    }
  ]
}

/**
 * コンポーネント種別の判定
 */
function categorizeComponent(componentName: string): ComponentType {
  const name = componentName.toLowerCase()
  
  // Arduino系
  if (name.includes('arduino') || name.includes('uno') || name.includes('mega') || name.includes('nano')) {
    return {
      category: 'arduino',
      keywords: ['arduino', componentName],
      suppliers: supplierTemplates.arduino
    }
  }
  
  // LED系
  if (name.includes('led') || name.includes('diode')) {
    return {
      category: 'led',
      keywords: ['led', componentName],
      suppliers: supplierTemplates.led
    }
  }
  
  // 抵抗器系
  if (name.includes('resistor') || name.includes('抵抗') || name.includes('ohm') || name.includes('Ω')) {
    return {
      category: 'resistor',
      keywords: ['resistor', componentName.replace('Ω', 'ohm')],
      suppliers: supplierTemplates.resistor
    }
  }
  
  // センサー系
  if (name.includes('sensor') || name.includes('temperature') || name.includes('humidity') || 
      name.includes('accelerometer') || name.includes('gyro') || name.includes('pressure')) {
    return {
      category: 'sensor',
      keywords: ['sensor', componentName],
      suppliers: supplierTemplates.sensor
    }
  }
  
  // マイコン系
  if (name.includes('teensy') || name.includes('esp32') || name.includes('esp8266') || 
      name.includes('microcontroller') || name.includes('mcu')) {
    return {
      category: 'microcontroller',
      keywords: ['microcontroller', componentName],
      suppliers: supplierTemplates.microcontroller
    }
  }
  
  // 汎用
  return {
    category: 'generic',
    keywords: [componentName],
    suppliers: supplierTemplates.generic
  }
}

/**
 * 購入先リンクを生成
 */
export function generatePurchaseLinks(
  componentName: string, 
  modelNumber?: string
): PurchaseLink[] {
  if (!componentName?.trim()) {
    return []
  }
  
  const componentType = categorizeComponent(componentName)
  const searchQuery = modelNumber && modelNumber.trim() ? 
    `${modelNumber} ${componentName}` : 
    componentName
  
  console.log(`🔍 Generating purchase links for: ${componentName} (${componentType.category})`)
  console.log(`📋 Available suppliers:`, componentType.suppliers.map(s => s.name))
  
  const links: PurchaseLink[] = componentType.suppliers.map((supplier, index) => {
    // クエリをエンコードしてURLに埋め込み
    const encodedQuery = encodeURIComponent(searchQuery.trim())
    const searchUrl = supplier.baseUrl + supplier.searchTemplate.replace('{query}', encodedQuery)
    
    return {
      supplier: supplier.name,
      url: searchUrl,
      description: supplier.description,
      priority: index + 1
    }
  })
  
  console.log(`✅ Generated ${links.length} purchase links for ${componentName}`)
  return links
}

/**
 * 主要な購入先リンクを1つ取得（最優先）
 */
export function getPrimaryPurchaseLink(
  componentName: string, 
  modelNumber?: string
): string {
  const links = generatePurchaseLinks(componentName, modelNumber)
  return links.length > 0 ? links[0].url : ''
}

/**
 * 既存のOctopart APIサプライヤー情報と統合
 */
export function integrateWithOctopartSuppliers(
  componentName: string,
  octopartSuppliers: string[]
): PurchaseLink[] {
  const generatedLinks = generatePurchaseLinks(componentName)
  
  // Octopartサプライヤーを追加情報として統合
  const octopartLinks: PurchaseLink[] = octopartSuppliers.map((supplier, index) => ({
    supplier: supplier,
    url: getOctopartSupplierUrl(supplier, componentName),
    description: `${supplier} (価格情報有り)`,
    priority: generatedLinks.length + index + 1
  }))
  
  return [...generatedLinks, ...octopartLinks]
}

/**
 * Perplexity APIの価格情報と統合
 * 直接リンクがある場合は優先的に使用
 */
export function integrateWithPerplexityLinks(
  componentName: string,
  pricingData: Array<{
    supplier: string
    purchaseUrl?: string
    isDirectLink?: boolean
  }>
): PurchaseLink[] {
  const links: PurchaseLink[] = []
  
  // Perplexityから取得した直接リンクを最優先
  pricingData.forEach((data, index) => {
    if (data.purchaseUrl && data.isDirectLink) {
      links.push({
        supplier: data.supplier,
        url: data.purchaseUrl,
        description: `${data.supplier} (直接リンク)`,
        priority: 1
      })
    } else if (data.purchaseUrl) {
      links.push({
        supplier: data.supplier,
        url: data.purchaseUrl,
        description: `${data.supplier} (検索結果)`,
        priority: 2
      })
    } else {
      // URLがない場合は生成
      const generatedUrl = getOctopartSupplierUrl(data.supplier, componentName)
      links.push({
        supplier: data.supplier,
        url: generatedUrl,
        description: `${data.supplier} (自動生成)`,
        priority: 3
      })
    }
  })
  
  // 重複を除去してソート
  const uniqueLinks = links.filter((link, index, self) =>
    index === self.findIndex(l => l.supplier === link.supplier)
  ).sort((a, b) => a.priority - b.priority)
  
  return uniqueLinks
}

/**
 * Octopartサプライヤーから購入先URLを生成
 */
function getOctopartSupplierUrl(supplierName: string, componentName: string): string {
  const encodedQuery = encodeURIComponent(componentName)
  
  const supplierUrls: Record<string, string> = {
    'Digi-Key': `https://digikey.jp/products/en?keywords=${encodedQuery}`,
    'Mouser': `https://mouser.jp/c/?q=${encodedQuery}`,
    'Newark': `https://newark.com/search?st=${encodedQuery}`,
    'RS Components': `https://jp.rs-online.com/web/c/?searchTerm=${encodedQuery}`,
    'Farnell': `https://farnell.com/search?st=${encodedQuery}`
  }
  
  return supplierUrls[supplierName] || `https://google.com/search?q=${encodedQuery}+${supplierName}`
}

/**
 * コンポーネント名の正規化
 */
export function normalizeComponentName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, ' ') // 複数のスペースを1つに
    .replace(/[^\w\s\-\.]/g, '') // 特殊文字を除去（ハイフン、ドット、アンダースコアは保持）
}