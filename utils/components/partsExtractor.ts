// 🆕 Unified data extraction utility
// Extract parts information from nodes + pbsData

import type { PBSNode, NodeData } from '@/types'
import { Node } from '@xyflow/react'

// AI検索データから詳細な説明を生成
function generateDetailedDescription(spec: any, name: string): string {
  console.log('🎨 Generating detailed description from specification:', {
    name,
    specKeys: spec ? Object.keys(spec) : [],
    hasVoltage: !!spec?.voltage,
    hasCommunication: !!spec?.communication,
    hasMarketData: !!spec?.marketData,
    voltage: spec?.voltage,
    communication: spec?.communication,
    compatibility: spec?.compatibility
  })
  const parts: string[] = [`${spec.category || 'Component'}: ${name}`];
  
  // 物理仕様
  if (spec.physical) {
    if (spec.physical.pins) {
      parts.push(`${spec.physical.pins}ピン`);
    }
    if (spec.physical.package) {
      parts.push(spec.physical.package);
    }
  }
  
  // 電圧仕様
  if (spec.voltage?.operating?.length > 0) {
    const voltageStr = spec.voltage.operating.map((v: any) => 
      typeof v === 'string' ? v : (typeof v === 'object' && v.value ? v.value : String(v))
    ).join('/');
    parts.push(`動作電圧: ${voltageStr}`);
  }
  
  // 消費電力
  if (spec.power?.consumption?.typical) {
    parts.push(`消費電力: ${spec.power.consumption.typical}mA (typ)`);
  }
  
  // 通信プロトコルとピン配置
  if (spec.communication?.pins) {
    const pinInfo: string[] = [];
    Object.entries(spec.communication.pins).forEach(([protocol, pins]) => {
      if (Array.isArray(pins) && pins.length > 0) {
        const pinStrings = pins.map((pin: any) => 
          typeof pin === 'string' ? pin : (typeof pin === 'object' && pin.name ? pin.name : String(pin))
        );
        pinInfo.push(`${protocol}: ${pinStrings.join(', ')}`);
      }
    });
    if (pinInfo.length > 0) {
      parts.push(pinInfo.join(' | '));
    }
  }
  
  // 対応マイコン
  if (spec.compatibility?.microcontrollers?.length > 0) {
    const microcontrollersStr = spec.compatibility.microcontrollers.map((mc: any) => 
      typeof mc === 'string' ? mc : (typeof mc === 'object' && mc.name ? mc.name : String(mc))
    ).join(', ');
    parts.push(`対応: ${microcontrollersStr}`);
  }
  
  // 利用可能ライブラリ
  if (spec.marketData?.libraries?.length > 0) {
    const libNames = spec.marketData.libraries.map((lib: any) => {
      if (typeof lib === 'string') return lib;
      if (typeof lib === 'object' && lib.name) return lib.name;
      return String(lib);
    }).filter(Boolean);
    if (libNames.length > 0) {
      parts.push(`ライブラリ: ${libNames.join(', ')}`);
    }
  }
  
  const result = parts.join(' | ');
  console.log('✅ Generated detailed description:', {
    name,
    partsCount: parts.length,
    result
  });
  return result;
}

// 型番抽出関数
function extractModelNumberFromTitle(title: string): string {
  const patterns = [
    /(STS\d+)/i,
    /(HQB-\d+-\w+)/i,
    /(ATS\d+[A-Z]-[A-Z0-9]+)/i,
    /Anker\s+(\d+)/i,
    /Essager/i,
    /([A-Z]+\d+[A-Z]*)/i,
    /([A-Z]+-\d+-\w+)/i
  ]
  
  for (const pattern of patterns) {
    const match = title.match(pattern)
    if (match) {
      if (pattern.source.includes('Anker')) {
        return `A${match[1]}`
      } else if (pattern.source.includes('Essager')) {
        return 'ESS-USB-C'
      } else {
        return match[1] || match[0]
      }
    }
  }
  
  const fallbackMatch = title.match(/([A-Za-z0-9\-]+)/)
  return fallbackMatch ? fallbackMatch[1] : 'PART-' + title.substring(0, 8).toUpperCase()
}

// 統一部品情報インターフェース
export interface UnifiedPartInfo {
  id: string
  name: string
  source: 'canvas' | 'pbs' // データソース識別
  
  // 部品詳細情報
  modelNumber?: string
  orderStatus?: "Unordered" | "Quotation" | "Ordered" | "Delivered"
  estimatedOrderDate?: string
  purchaseSiteLink?: string
  quantity?: number
  description?: string
  voltage?: string              // "3.3V/5V" 形式で複数値を表示
  communication?: string        // "I2C, SPI, UART" 形式で表示
  notes?: string
  
  // 価格情報
  price?: string
  aiPricing?: any // ComponentPricing型
  
  // AI検索結果
  specifications?: any          // ComponentSpecification型（AI検索結果全体）
  aiPricing?: {                // 価格情報への簡単アクセス
    unitPrice?: number
    currency?: string
    supplier?: string
    availability?: string
    lastUpdated?: string
  }
  aiLibraries?: string[]       // 利用可能なライブラリ
  
  // 追加メタデータ
  type?: string
  category?: string
  originalData?: any // 元データ参照用
  originalCanvasIds?: string[] // 統合された元のcanvasNodeのIDリスト
}

// カテゴリ名判定関数
function isCategoryName(title: string): boolean {
  const categoryKeywords = [
    'actuators', 'drives', 'mechanical', 'assembly', 'control', 'system',
    'sensors', 'vision', 'computing', 'platform', 'power', 'communication',
    'electrical', 'electronics', 'software', 'hardware',
    // 🆕 追加のカテゴリキーワード
    'category', 'group', 'folder', 'section', 'component', 'module',
    'device', 'unit', 'parts', 'components', 'equipment', 'apparatus'
  ]
  
  const lowerTitle = title.toLowerCase().trim()
  
  // 完全一致または部分一致でカテゴリを判定
  const isKeywordMatch = categoryKeywords.some(keyword => 
    lowerTitle === keyword ||
    lowerTitle === keyword + 's' ||
    lowerTitle.includes(keyword + ' &') ||
    lowerTitle.includes('& ' + keyword) ||
    lowerTitle.startsWith(keyword + ' ') ||
    lowerTitle.endsWith(' ' + keyword)
  )
  
  // グループ名パターンも除外（例："STS3215 サーボモータs (6 items)"）
  const isGroupFolder = /\([0-9]+\s+(items?|個)\)/i.test(title)
  
  // "Category" を含む名前を除外
  const containsCategory = lowerTitle.includes('category')
  
  // 日本語のカテゴリ名パターン
  const japaneseCategories = [
    'カテゴリ', 'グループ', 'フォルダ', 'セクション', 'モジュール', 
    'ユニット', '部品', 'コンポーネント', '機器', '装置'
  ]
  const isJapaneseCategory = japaneseCategories.some(jp => title.includes(jp))
  
  return isKeywordMatch || isGroupFolder || containsCategory || isJapaneseCategory
}

// canvasNodesから部品情報抽出
export const extractPartsFromCanvas = (nodes: Node<NodeData>[]): UnifiedPartInfo[] => {
  
  return nodes
    .filter(node => {
      // 🎯 タイトルがあり、カテゴリでない場合のみ部品として扱う
      const hasTitle = !!(node.data?.title && node.data.title.trim().length > 0)
      
      // 🔧 明示的なカテゴリフラグを優先チェック（pbsComputed.tsと統一）
      const isExplicitCategory = node.data?.isPBSCategory || node.data?.type === 'secondary'
      
      // タイトルベースのカテゴリ判定をフォールバック
      const isTitleBasedCategory = isCategoryName(node.data?.title || '')
      
      const isNotCategory = !isExplicitCategory && !isTitleBasedCategory
      
      return hasTitle && isNotCategory
    })
    .map(node => ({
      id: `canvas-${node.id}`,
      name: node.data?.title || '',
      source: 'canvas' as const,
      // 🎯 null/undefined のみデフォルト値、空文字列は保持
      modelNumber: node.data?.modelNumber != null ? node.data.modelNumber : extractModelNumberFromTitle(node.data?.title || ''),
      orderStatus: node.data?.orderStatus != null ? node.data.orderStatus : 'Unordered',
      estimatedOrderDate: node.data?.estimatedOrderDate != null
        ? (node.data.estimatedOrderDate instanceof Date 
           ? node.data.estimatedOrderDate.toISOString().split('T')[0]
           : node.data.estimatedOrderDate)
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      purchaseSiteLink: node.data?.purchaseSiteLink != null ? node.data.purchaseSiteLink : '',
      quantity: node.data?.quantity != null ? node.data.quantity : 1,
      // AI検索データがある場合は常に優先して使用（上書き更新）
      description: (() => {
        console.log('🎯 Processing description for node:', {
          nodeId: `canvas-${node.id}`,
          title: node.data?.title,
          hasSpecifications: !!node.data?.specifications,
          hasExistingDescription: !!node.data?.description,
          existingDescription: node.data?.description
        });
        
        if (node.data?.specifications) {
          console.log('📊 Using AI specifications for description generation');
          return generateDetailedDescription(node.data.specifications, node.data?.title || 'Unknown');
        } else {
          console.log('📝 Using existing or default description');
          return node.data?.description || `Component: ${node.data?.title || 'Unknown'}`;
        }
      })(),
      
      // AI検索データがある場合は統合表示形式で、なければ既存データを使用
      voltage: node.data?.specifications?.voltage ? 
        node.data.specifications.voltage.operating.join('/') :  // "3.3V/5V"形式
        (node.data?.voltage != null ? node.data.voltage : ''),
      
      communication: node.data?.specifications?.communication ?
        node.data.specifications.communication.protocols.join(', ') :  // "I2C, SPI, UART"形式
        (node.data?.communication != null ? node.data.communication : ''),
      
      notes: node.data?.notes != null ? node.data.notes : '',
      
      // 価格情報（systemDesignHandlerからのデータを優先）
      price: node.data?.price || '',
      aiPricing: node.data?.aiPricing || (node.data?.specifications?.marketData?.pricing ? {
        unitPrice: node.data.specifications.marketData.pricing.unitPrice,
        currency: node.data.specifications.marketData.pricing.currency || 'USD',
        supplier: node.data.specifications.marketData.pricing.supplier,
        availability: node.data.specifications.marketData.pricing.availability,
        lastUpdated: node.data.specifications.marketData.lastUpdated
      } : undefined),
      
      // AI検索結果を保持
      specifications: node.data?.specifications,
      aiLibraries: node.data?.specifications?.marketData?.libraries ?
        node.data.specifications.marketData.libraries.map((lib: any) => lib.name || lib) :
        undefined,
      
      type: node.data?.type || node.type,
      category: 'canvas-component',
      originalData: node
    }))
}

// pbsStructureから部品情報抽出（再帰的）
export const extractPartsFromPBS = (pbsData: PBSNode[] | null): UnifiedPartInfo[] => {
  if (!pbsData || !Array.isArray(pbsData)) {
    return []
  }
  const parts: UnifiedPartInfo[] = []
  
  const extractFromNode = (node: PBSNode, level: number = 0): void => {
    
    // 部品情報を持つノードかチェック
    const hasParts = !!(
      node.modelNumber || 
      node.orderStatus || 
      node.estimatedOrderDate ||
      node.purchaseSiteLink ||
      node.description
    )
    
    // カテゴリノードを除外
    const isNotCategory = !isCategoryName(node.name)
    
    
    if (hasParts && isNotCategory) {
      parts.push({
        id: `pbs-${node.id}`,
        name: node.name,
        source: 'pbs' as const,
        modelNumber: node.modelNumber,
        orderStatus: node.orderStatus as any,
        estimatedOrderDate: node.estimatedOrderDate,
        purchaseSiteLink: node.purchaseSiteLink,
        quantity: 1, // PBSでは数量情報がない場合はデフォルト1
        description: node.description,
        voltage: node.voltage,
        communication: node.communication,
        type: node.type,
        category: `pbs-${node.type}`,
        originalData: node
      })
    }
    
    // 子ノードを再帰的に処理
    if (node.children && node.children.length > 0) {
      node.children.forEach(child => extractFromNode(child, level + 1))
    }
  }
  
  pbsData.forEach(rootNode => extractFromNode(rootNode))
  
  return parts
}

// インスタンス名から大本名を抽出（例：モータA → モータ）
function extractBaseName(instanceName: string): string {
  // 末尾のインスタンス識別子を除去（A, B, C, 1, 2, 3など）
  const match = instanceName.match(/^(.+?)\s+([A-Z]|[0-9]+)$/i)
  return match ? match[1].trim() : instanceName.trim()
}

// 重複部品の統合処理（インスタンスを大本でグループ化）
export const mergeDuplicateParts = (parts: UnifiedPartInfo[]): UnifiedPartInfo[] => {
  
  const groupedParts = new Map<string, {
    baseName: string
    modelNumber: string
    parts: UnifiedPartInfo[]
    totalQuantity: number
  }>()
  
  parts.forEach(part => {
    // 大本名を抽出
    const baseName = extractBaseName(part.name)
    const modelNumber = part.modelNumber || 'UNKNOWN'
    
    // グループ化キー（大本名 + 型番）
    const groupKey = `${baseName.toLowerCase()}-${modelNumber.toLowerCase()}`
    
    if (groupedParts.has(groupKey)) {
      const group = groupedParts.get(groupKey)!
      group.parts.push(part)
      group.totalQuantity += (part.quantity || 1)
    } else {
      groupedParts.set(groupKey, {
        baseName,
        modelNumber,
        parts: [part],
        totalQuantity: part.quantity || 1
      })
    }
  })
  
  // グループを統合された部品情報に変換
  const mergedParts: UnifiedPartInfo[] = []
  
  groupedParts.forEach(group => {
    // 代表部品（最初の部品）をベースに統合情報を作成
    const representative = group.parts[0]
    
    const mergedPart: UnifiedPartInfo = {
      ...representative,
      // 🎯 大本名を使用
      name: group.baseName,
      // 🎯 集計された数量
      quantity: group.totalQuantity,
      // より詳細な説明
      description: group.totalQuantity > 1 
        ? `${group.baseName} (${group.totalQuantity} units: ${group.parts.map(p => extractBaseName(p.name) !== p.name ? p.name.split(' ').pop() : '1').join(', ')})`
        : representative.description || `Component: ${group.baseName}`,
      // IDを大本名ベースに更新
      id: `unified-${group.baseName.toLowerCase().replace(/\s+/g, '-')}-${group.modelNumber}`,
      // canvas優先でソース情報統合
      source: group.parts.some(p => p.source === 'canvas') ? 'canvas' : representative.source,
      // 🎯 元のcanvasNodeのIDリストを保持（編集処理用）
      originalCanvasIds: group.parts
        .filter(p => p.source === 'canvas' && p.originalData)
        .map(p => (p.originalData as Node<NodeData>).id)
    }
    
    mergedParts.push(mergedPart)
  })
  
  return mergedParts.sort((a, b) => a.name.localeCompare(b.name))
}

// メイン統合関数
export const getAllParts = (
  nodes: Node<NodeData>[], 
  pbsData: PBSNode[] | null
): UnifiedPartInfo[] => {
  try {
    // 各ソースから部品抽出
    const canvasParts = extractPartsFromCanvas(nodes)
    const pbsParts = extractPartsFromPBS(pbsData)
    
    console.log(`🔍 Parts extraction: Canvas=${canvasParts.length}, PBS=${pbsParts.length}`)
    
    // 🛠️ FIX: Canvas優先で重複除去 - 同じIDの部品はcanvasを優先
    const canvasIds = new Set(canvasParts.map(p => {
      // Canvas IDからnode IDを抽出 (canvas-node-123 → node-123)
      const nodeId = p.id.replace('canvas-', '')
      const originalNodeId = (p.originalData as Node<NodeData>)?.id || nodeId
      return originalNodeId
    }))
    
    // PBSの部品でCanvasに存在しないもののみを追加
    const uniquePbsParts = pbsParts.filter(pbsPart => {
      const pbsNodeId = pbsPart.id.replace('pbs-', '')
      const isDuplicate = canvasIds.has(pbsNodeId)
      if (isDuplicate) {
        console.log(`🚫 Skipping PBS duplicate: ${pbsPart.name} (ID: ${pbsNodeId})`)
      }
      return !isDuplicate
    })
    
    console.log(`✅ After deduplication: Canvas=${canvasParts.length}, Unique PBS=${uniquePbsParts.length}`)
    
    // 統合・名前ベース重複除去
    const allParts = [...canvasParts, ...uniquePbsParts]
    const mergedParts = mergeDuplicateParts(allParts)
    
    console.log(`📊 Final parts count: ${mergedParts.length}`)
    
    return mergedParts.sort((a, b) => {
      // ソート優先度: canvas > pbs, そして名前順
      if (a.source !== b.source) {
        return a.source === 'canvas' ? -1 : 1
      }
      return a.name.localeCompare(b.name)
    })
    
  } catch (error) {
    console.error('❌ Error in getAllParts:', error)
    return []
  }
}

// 🚀 未使用関数削除: getPartsByStatus, getPartsBySource
// フィルタリングはコンポーネント側でuseMemoを使用

// 部品情報の統計取得
export const getPartsStats = (parts: UnifiedPartInfo[]) => {
  return {
    total: parts.length,
    bySource: {
      canvas: parts.filter(p => p.source === 'canvas').length,
      pbs: parts.filter(p => p.source === 'pbs').length
    },
    byStatus: parts.reduce((acc, part) => {
      const status = part.orderStatus || 'Unordered'
      acc[status] = (acc[status] || 0) + 1
      return acc
    }, {} as Record<string, number>),
    totalQuantity: parts.reduce((sum, part) => sum + (part.quantity || 1), 0)
  }
}