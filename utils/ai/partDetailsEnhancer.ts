// Part details enhancement utility for fetching detailed specifications
import { ComponentManager } from '../components/componentManager'
import { DynamicPortSystem } from '../connections/ports/dynamicPortSystem'
import { getIntegratedPricingCache } from '../pricing/integratedPricingCache'
import type { PartSpecification } from '../types/hardwareAnalysis'
import type { NodeData, DynamicPortConfig } from '@/types/canvas'
import type { ComponentPricing, ShippingDestination } from '@/types'

// Initialize systems
const componentManager = new ComponentManager()
const dynamicPortSystem = new DynamicPortSystem()

interface EnhancedPart extends PartSpecification {
  specifications?: any
  dynamicPorts?: DynamicPortConfig
  detailsFetched?: boolean
  price?: string
  aiPricing?: ComponentPricing
  datasheetUrl?: string // 仕様書URL
}

/**
 * Enhance a basic part with detailed specifications and dynamic ports
 */
export async function enhancePartWithDetails(
  part: PartSpecification,
  nodeId: string,
  shippingDestination?: ShippingDestination
): Promise<EnhancedPart> {
  try {
    console.log(`🔍 Enhancing part details for: ${part.partName}`)
    
    // Try to fetch detailed specifications using AI search
    const searchResult = await componentManager.performAISearch(part.partName)
    
    if (searchResult && searchResult.specification) {
      console.log(`✅ Found detailed specifications for ${part.partName}`)
      
      // Extract datasheet URL from specification sources
      const spec = searchResult.specification as any
      const datasheetUrl = spec?.reliability?.sources?.[0]?.url || 
                          spec?.sources?.[0]?.url ||
                          spec?.datasheetUrl
      
      // Generate dynamic ports from the detailed specification
      const dynamicPorts = dynamicPortSystem.generatePortsFromSpecification(
        nodeId,
        searchResult.specification
      )
      
      // 価格データを取得（Perplexity API or モックデータ）
      let pricing: ComponentPricing[] = []
      let lowestPrice: ComponentPricing | null = null
      
      try {
        // デフォルトの配送先（shippingDestinationが指定されていない場合）
        const defaultDestination: ShippingDestination = shippingDestination || {
          country: 'Japan',
          city: 'Tokyo',
          postalCode: '100-0001'
        }
        
        const cache = getIntegratedPricingCache()
        pricing = await cache.getPricing(
          nodeId,
          part.modelNumber || part.partName,
          defaultDestination
        )
        lowestPrice = pricing.length > 0 ? pricing[0] : null
        console.log(`💰 Price data fetched for ${part.partName}: ${lowestPrice?.unitPrice || 'N/A'}`)
      } catch (error) {
        console.warn(`⚠️ Failed to fetch pricing for ${part.partName}:`, error)
      }
      
      return {
        ...part,
        specifications: searchResult.specification,
        dynamicPorts: dynamicPorts,
        detailsFetched: true,
        // Update basic info with more accurate data
        voltage: searchResult.specification.voltage?.operating?.join(', ') || part.voltage,
        communication: searchResult.specification.communication?.protocols?.join(', ') || part.communication,
        // 価格情報を追加
        price: lowestPrice?.unitPrice?.toString() || '',
        aiPricing: lowestPrice || undefined,
        datasheetUrl: datasheetUrl // 仕様書URL
      }
    } else {
      // Fallback: Generate ports from basic information
      console.log(`⚠️ No detailed specs found for ${part.partName}, using basic info`)
      return enhancePartWithBasicInfo(part, nodeId)
    }
  } catch (error) {
    console.error(`❌ Error enhancing part ${part.partName}:`, error)
    // Return with basic port generation on error
    return enhancePartWithBasicInfo(part, nodeId)
  }
}

/**
 * Generate dynamic ports from basic part information
 * Used as fallback when detailed specifications are not available
 */
async function enhancePartWithBasicInfo(
  part: PartSpecification,
  nodeId: string
): Promise<EnhancedPart> {
  try {
    // Create a basic specification object from available info
    const basicSpecification = createBasicSpecification(part)
    
    // Generate dynamic ports from the basic specification
    const dynamicPorts = dynamicPortSystem.generatePortsFromSpecification(
      nodeId,
      basicSpecification
    )
    
    // フォールバック時も価格データを取得
    let pricing: ComponentPricing[] = []
    let lowestPrice: ComponentPricing | null = null
    
    try {
      const cache = getIntegratedPricingCache()
      const defaultDestination: ShippingDestination = {
        country: 'Japan',
        city: 'Tokyo',
        postalCode: '100-0001'
      }
      pricing = await cache.getPricing(
        nodeId,
        part.modelNumber || part.partName,
        defaultDestination
      )
      lowestPrice = pricing.length > 0 ? pricing[0] : null
      console.log(`💰 Price data fetched (basic) for ${part.partName}: ${lowestPrice?.unitPrice || 'N/A'}`)
    } catch (error) {
      console.warn(`⚠️ Failed to fetch pricing (basic) for ${part.partName}:`, error)
    }
    
    return {
      ...part,
      specifications: basicSpecification,
      dynamicPorts: dynamicPorts,
      detailsFetched: false,
      // 価格情報を追加
      price: lowestPrice?.unitPrice?.toString() || '',
      aiPricing: lowestPrice || undefined
    }
  } catch (error) {
    console.error(`❌ Error generating basic ports for ${part.partName}:`, error)
    // Return part without dynamic ports as last resort
    return {
      ...part,
      detailsFetched: false
    }
  }
}

/**
 * Create a basic specification object from part information
 * This allows the dynamicPortSystem to generate appropriate ports
 */
function createBasicSpecification(part: PartSpecification): any {
  const protocols = extractProtocols(part.communication || '')
  const voltage = extractVoltage(part.voltage || '')
  
  return {
    name: part.partName,
    modelNumber: part.modelNumber,
    category: part.category,
    voltage: {
      operating: voltage ? [voltage] : ['5V'] // Default to 5V if unknown
    },
    communication: {
      protocols: protocols.length > 0 ? protocols : ['GPIO'], // Default to GPIO
      pins: {
        total: (part.inputs || 1) + (part.outputs || 1)
      }
    },
    power: {
      consumption: {
        typical: 100 // Default assumption
      }
    },
    io: {
      digital: part.outputs || 1,
      analog: part.inputs || 1
    }
  }
}

/**
 * Extract communication protocols from a string
 */
function extractProtocols(communication: string): string[] {
  const protocols: string[] = []
  const commLower = communication.toLowerCase()
  
  const protocolMap = {
    'i2c': 'I2C',
    'spi': 'SPI',
    'uart': 'UART',
    'serial': 'UART',
    'usb': 'USB',
    'pwm': 'PWM',
    'gpio': 'GPIO',
    'can': 'CAN',
    'ethernet': 'Ethernet',
    'wifi': 'WiFi',
    'bluetooth': 'Bluetooth'
  }
  
  for (const [key, value] of Object.entries(protocolMap)) {
    if (commLower.includes(key)) {
      protocols.push(value)
    }
  }
  
  return protocols
}

/**
 * Extract voltage value from a string
 */
function extractVoltage(voltageStr: string): string {
  // Match patterns like "5V", "3.3V", "12V", etc.
  const match = voltageStr.match(/(\d+\.?\d*)\s*V/i)
  return match ? `${match[1]}V` : voltageStr
}

/**
 * Batch enhance multiple parts with parallel processing
 */
export async function enhanceMultipleParts(
  parts: PartSpecification[],
  baseNodeId: string,
  shippingDestination?: ShippingDestination
): Promise<EnhancedPart[]> {
  console.log(`🚀 Enhancing ${parts.length} parts in parallel...`)
  
  const enhancementPromises = parts.map((part, index) => 
    enhancePartWithDetails(part, `${baseNodeId}-${index}`, shippingDestination)
      .catch(async error => {
        console.error(`Failed to enhance ${part.partName}:`, error)
        // Return basic enhanced part on error
        return await enhancePartWithBasicInfo(part, `${baseNodeId}-${index}`)
      })
  )
  
  const results = await Promise.all(enhancementPromises)
  
  const successCount = results.filter(r => r.detailsFetched).length
  console.log(`✅ Enhanced ${successCount}/${parts.length} parts with detailed specs`)
  
  return results
}