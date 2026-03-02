// Connection matching utilities for AI-generated connections

// 型定義を一元化されたファイルからimport
import type { FailedConnection } from '@/types'

// Intelligent hardware mapping system for multilingual input
export const hardwarePatterns = {
  // Power & Supply Components
  power: {
    patterns: [
      'power', 'supply', 'adapter', 'battery', 'psu', 'voltage', 'ac', 'dc',
      'charger', 'regulator', 'converter', 'transformer', 'ups'
    ],
    voltage_patterns: ['5v', '12v', '24v', '3.3v', '9v', '15v', '19v'],
    current_patterns: ['1a', '2a', '3a', '4a', '5a', '500ma', '1000ma'],
    types: ['switching', 'linear', 'smps', 'wall', 'desktop', 'external']
  },
  
  // Controllers & Processors
  controller: {
    patterns: [
      'controller', 'driver', 'board', 'control', 'mcu', 'cpu', 'microcontroller',
      'arduino', 'raspberry', 'pi', 'esp32', 'stm32', 'pic', 'atmega',
      'processor', 'chip', 'development', 'breakout', 'module'
    ],
    interfaces: ['serial', 'uart', 'i2c', 'spi', 'pwm', 'gpio', 'usb', 'ethernet'],
    brands: ['arduino', 'raspberry', 'esp', 'stm', 'microchip', 'atmel', 'nordic']
  },
  
  // Motors & Actuators
  motor: {
    patterns: [
      'motor', 'servo', 'stepper', 'actuator', 'drive', 'linear', 'rotary',
      'brushless', 'brushed', 'dc', 'ac', 'gear', 'encoder', 'feedback'
    ],
    specs: ['kg.cm', 'nm', 'rpm', 'degrees', 'steps', 'resolution'],
    types: ['servo', 'stepper', 'dc', 'bldc', 'linear', 'pneumatic', 'hydraulic']
  },
  
  // Sensors & Input Devices
  sensor: {
    patterns: [
      'sensor', 'detector', 'monitor', 'measurement', 'proximity', 'distance',
      'temperature', 'humidity', 'pressure', 'accelerometer', 'gyroscope',
      'magnetometer', 'gps', 'camera', 'microphone', 'light', 'color',
      'infrared', 'ultrasonic', 'lidar', 'radar', 'encoder', 'potentiometer'
    ],
    types: ['analog', 'digital', 'i2c', 'spi', 'uart', '4-20ma', '0-10v']
  },
  
  // Communication & Interfaces
  communication: {
    patterns: [
      'serial', 'uart', 'i2c', 'spi', 'can', 'ethernet', 'wifi', 'bluetooth',
      'zigbee', 'lora', 'radio', 'wireless', 'usb', 'rs232', 'rs485',
      'modbus', 'tcp', 'udp', 'http', 'mqtt', 'interface', 'transceiver'
    ],
    protocols: ['modbus', 'canopen', 'ethercat', 'profinet', 'devicenet']
  },
  
  // Cables & Connectors
  cable: {
    patterns: [
      'cable', 'wire', 'connector', 'cord', 'harness', 'adapter', 'extension',
      'usb', 'ethernet', 'power', 'audio', 'video', 'coaxial', 'fiber'
    ],
    connectors: ['usb-a', 'usb-b', 'usb-c', 'rj45', 'db9', 'db25', 'din', 'xlr'],
    types: ['shielded', 'unshielded', 'twisted', 'coaxial', 'fiber', 'flat']
  },
  
  // Mechanical Components
  mechanical: {
    patterns: [
      'clamp', 'bracket', 'mount', 'frame', 'structure', 'bearing', 'gear',
      'belt', 'pulley', 'screw', 'bolt', 'nut', 'washer', 'spacer',
      'housing', 'enclosure', 'case', 'panel', 'plate', 'bar', 'rod'
    ],
    materials: ['aluminum', 'steel', 'plastic', 'carbon', 'brass', 'copper'],
    sizes: ['m3', 'm4', 'm5', 'm6', 'm8', 'm10', 'inch', 'metric']
  },
  
  // Display & Output
  display: {
    patterns: [
      'display', 'screen', 'monitor', 'lcd', 'oled', 'led', 'tft', 'e-ink',
      'projector', 'indicator', 'light', 'bulb', 'strip', 'matrix'
    ],
    types: ['character', 'graphic', 'touch', 'color', 'monochrome']
  }
}

// Legacy mapping (保持)
export const componentNameMapping: Record<string, string> = {
  // Power components
  'power_supply': 'スイッチングACアダプター5V4A',
  'powersupply': 'スイッチングACアダプター5V4A',
  'adapter': 'スイッチングACアダプター5V4A',
  'ac_adapter_5v4a': 'スイッチングACアダプター5V4A',
  
  // Controllers and drivers
  'controller': 'Waveshare Serial Bus Servo Driver Board',
  'controller1': 'Waveshare Serial Bus Servo Driver Board',
  'driver': 'Waveshare Serial Bus Servo Driver Board',
  'servo_driver': 'Waveshare Serial Bus Servo Driver Board',
  'waveshare': 'Waveshare Serial Bus Servo Driver Board',
  
  // Servos
  'servo_sts3215': 'STS3215 Intelligent Bus Servo',
  'servo': 'STS3215 Intelligent Bus Servo',
  'servomotors': 'STS3215 Intelligent Bus Servo',
  'motor': 'STS3215 Intelligent Bus Servo',
  'sts3215': 'STS3215 Intelligent Bus Servo',
  
  // Cables
  'usb_cable': 'Anker 310 USB-C & USB-C Cable',
  'usb_c_cable_set': 'Anker 310 USB-C & USB-C Cable',
  'cable': 'Anker 310 USB-C & USB-C Cable',
  'anker': 'Anker 310 USB-C & USB-C Cable',
  
  // Clamps
  'clamp': 'Takagi HQB-100-2P Hobby Quick Bar Clamp',
  'clamp1': 'Takagi HQB-100-2P Hobby Quick Bar Clamp',
  'takagi': 'Takagi HQB-100-2P Hobby Quick Bar Clamp',
  'bar_clamp': 'Takagi HQB-100-2P Hobby Quick Bar Clamp',
}

// Intelligent category detection system
export const detectHardwareCategory = (input: string): string[] => {
  const normalized = input.toLowerCase().trim()
  const categories: string[] = []
  
  // O(n) algorithm for pattern matching
  for (const [category, patterns] of Object.entries(hardwarePatterns)) {
    const allPatterns = [
      ...patterns.patterns,
      ...(patterns.voltage_patterns || []),
      ...(patterns.current_patterns || []),
      ...(patterns.types || []),
      ...(patterns.interfaces || []),
      ...(patterns.brands || []),
      ...(patterns.specs || []),
      ...(patterns.protocols || []),
      ...(patterns.connectors || []),
      ...(patterns.materials || []),
      ...(patterns.sizes || [])
    ]
    
    if (allPatterns.some(pattern => normalized.includes(pattern))) {
      categories.push(category)
    }
  }
  
  return categories
}

// Enhanced multi-language component matching
export const findBestCategoryMatch = (
  searchName: string,
  componentInstances: any[]
): any => {
  const categories = detectHardwareCategory(searchName)
  
  if (categories.length === 0) return null
  
  // Score-based matching using Map for O(n) performance
  const scoreMap = new Map<string, number>()
  
  for (const instance of componentInstances) {
    if (!instance?.title) continue
    
    let score = 0
    const title = instance.title.toLowerCase()
    
    // Category matching (highest priority)
    for (const category of categories) {
      const patterns = hardwarePatterns[category]?.patterns || []
      if (patterns.some(pattern => title.includes(pattern))) {
        score += 10
      }
    }
    
    // Voltage/specs matching (medium priority)
    const normalized = searchName.toLowerCase()
    if (instance.voltage && normalized.includes(instance.voltage.toLowerCase())) {
      score += 5
    }
    if (instance.communication && normalized.includes(instance.communication.toLowerCase())) {
      score += 5
    }
    
    // Partial text matching (low priority)
    const searchWords = normalized.split(/[\s\-_]+/)
    const titleWords = title.split(/[\s\-_]+/)
    
    for (const searchWord of searchWords) {
      if (searchWord.length > 2) {
        for (const titleWord of titleWords) {
          if (titleWord.includes(searchWord) || searchWord.includes(titleWord)) {
            score += 1
          }
        }
      }
    }
    
    if (score > 0) {
      scoreMap.set(instance.id, score)
    }
  }
  
  // Find highest scoring match
  let bestMatch = null
  let highestScore = 0
  
  for (const [instanceId, score] of scoreMap) {
    if (score > highestScore) {
      highestScore = score
      bestMatch = componentInstances.find(inst => inst.id === instanceId)
    }
  }
  
  if (bestMatch) {
    console.log(`✅ Category-based match: "${searchName}" → "${bestMatch.title}" (score: ${highestScore})`)
  }
  
  return bestMatch
}

// Legacy keywords (simplified)
export const componentKeywords = {
  power: ['power', 'adapter', 'supply', 'battery', 'voltage', 'ac', 'dc'],
  controller: ['controller', 'driver', 'board', 'control', 'mcu', 'cpu'],
  servo: ['servo', 'motor', 'actuator', 'stepper', 'sts3215'],
  cable: ['cable', 'wire', 'usb', 'connector', 'cord'],
  mechanical: ['clamp', 'bracket', 'mount', 'frame', 'structure'],
  sensor: ['sensor', 'detector', 'monitor', 'measurement'],
  communication: ['serial', 'bluetooth', 'wifi', 'uart', 'i2c', 'spi']
}

// Normalize AI component name to actual component name
export const normalizeComponentName = (aiName: string): string => {
  const normalized = aiName.toLowerCase().trim()
  return componentNameMapping[normalized] || aiName
}

// Enhanced intelligent component matching system
export const findMatchingComponent = (searchName: string, componentInstances: any[]): any => {
  // 🛡️ Phase 3: Null safety check
  if (!searchName || typeof searchName !== 'string') {
    console.warn('⚠️ findMatchingComponent: searchName is null or invalid:', searchName)
    return null
  }
  
  const search = searchName.toLowerCase().trim()
  
  console.log(`🔍 Searching for component: "${searchName}" (normalized: "${search}")`)
  console.log(`🔍 Available components: ${componentInstances.map(c => c?.title || '[No Title]').join(', ')}`)
  
  // Step 1: Try legacy mapping first (backward compatibility)
  const normalizedName = normalizeComponentName(search)
  if (normalizedName !== searchName) {
    console.log(`🔄 Trying legacy mapping: "${normalizedName}"`)
    const normalizedMatch = componentInstances.find(instance => 
      instance?.title && instance.title.toLowerCase().includes(normalizedName.toLowerCase())
    )
    if (normalizedMatch) {
      console.log(`✅ Found legacy match: ${normalizedMatch.title}`)
      return normalizedMatch
    }
  }
  
  // Step 1.5: Direct ID match (for system-part-X format)
  if (searchName.startsWith('system-part-')) {
    const idMatch = componentInstances.find(instance => 
      instance?.id === searchName
    )
    if (idMatch) {
      console.log(`✅ Found direct ID match: ${idMatch.id} -> ${idMatch.title}`)
      return idMatch
    }
  }
  
  // Step 2: Exact match
  let match = componentInstances.find(instance => 
    instance?.title && instance.title.toLowerCase() === search
  )
  if (match) {
    console.log(`✅ Found exact match: ${match.title}`)
    return match
  }
  
  // Step 3: Intelligent category-based matching (NEW)
  const categoryMatch = findBestCategoryMatch(searchName, componentInstances)
  if (categoryMatch) {
    return categoryMatch
  }
  
  // Step 4: Partial match (bidirectional)
  match = componentInstances.find(instance => {
    if (!instance?.title) return false
    const title = instance.title.toLowerCase()
    const isMatch = title.includes(search) || search.includes(title)
    if (isMatch) {
      console.log(`✅ Found partial match: ${instance.title} (${title} <-> ${search})`)
    }
    return isMatch
  })
  if (match) return match
  
  // Step 5: Enhanced keyword matching (legacy fallback)
  for (const [category, keywords] of Object.entries(componentKeywords)) {
    if (keywords.some(keyword => search.includes(keyword))) {
      console.log(`🔍 Legacy keyword search: ${category} (keywords: ${keywords.join(', ')})`)
      match = componentInstances.find(instance => 
        instance?.title && keywords.some(keyword => instance.title.toLowerCase().includes(keyword))
      )
      if (match) {
        console.log(`✅ Found legacy keyword match: ${match.title} (category: ${category})`)
        return match
      }
    }
  }
  
  // Step 6: Fuzzy matching for common variations
  const fuzzyVariations = [
    search.replace(/[-_\s]/g, ''),  // Remove separators
    search.replace(/\d+/g, ''),     // Remove numbers
    search.split(/[-_\s]/)[0],      // First word only
  ]
  
  // Add special handling for common naming patterns
  if (search.includes('button')) {
    fuzzyVariations.push('btn', 'switch', 'input')
  }
  if (search.includes('power')) {
    fuzzyVariations.push('pwr', 'supply', 'management', 'mgmt')
  }
  if (search.includes('management') || search.includes('mgmt')) {
    fuzzyVariations.push('controller', 'control', 'manager')
  }
  
  for (const variation of fuzzyVariations) {
    if (variation.length > 2) {  // Avoid too short variations
      match = componentInstances.find(instance => {
        if (!instance?.title) return false
        const title = instance.title.toLowerCase()
        const titleNormalized = title.replace(/[-_\s]/g, '')
        return title.includes(variation) ||
               titleNormalized.includes(variation) ||
               variation.includes(title.split(' ')[0])
      })
      if (match) {
        console.log(`✅ Found fuzzy match: ${match.title} (variation: ${variation})`)
        return match
      }
    }
  }
  
  console.warn(`⚠️ No match found for "${searchName}"`)
  return null
}

// 型定義は /types/index.ts から import済み

// Enhanced suggestions for failed matches
export const generateMatchSuggestions = (searchName: string, componentInstances: any[]): string[] => {
  // 🛡️ Phase 3: Null safety check
  if (!searchName || typeof searchName !== 'string') {
    console.warn('⚠️ generateMatchSuggestions: searchName is null or invalid:', searchName)
    return []
  }
  
  const suggestions: string[] = []
  
  // 1. Category-based suggestions (primary)
  const categories = detectHardwareCategory(searchName)
  for (const category of categories) {
    const categoryPatterns = hardwarePatterns[category]?.patterns || []
    const categoryComponents = componentInstances.filter(instance =>
      instance?.title && categoryPatterns.some(pattern => 
        instance.title.toLowerCase().includes(pattern)
      )
    )
    suggestions.push(...categoryComponents.map(c => c?.title).filter(Boolean))
  }
  
  // 2. Legacy keyword suggestions (fallback)
  if (suggestions.length < 3) {
    const search = searchName.toLowerCase()
    for (const [category, keywords] of Object.entries(componentKeywords)) {
      if (keywords.some(keyword => search.includes(keyword))) {
        const categoryComponents = componentInstances.filter(instance =>
          instance?.title && keywords.some(keyword => instance.title.toLowerCase().includes(keyword))
        )
        suggestions.push(...categoryComponents.map(c => c?.title).filter(Boolean))
      }
    }
  }
  
  // 3. Remove duplicates and limit to 3 suggestions
  return [...new Set(suggestions)].slice(0, 3)
}