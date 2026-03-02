// Common constants and prompts for hardware analysis

import { PART_CATEGORIES, CONNECTION_TYPES, NODE_CATEGORIES } from '../types/hardwareAnalysis'

/**
 * Common system prompt for hardware analysis
 */
export const COMMON_SYSTEM_PROMPT = `You are a hardware system design expert.
Important instructions for hardware analysis:
1. Use actual part numbers and specifications available in the market
2. Clearly define connections between components with appropriate types
3. Include voltage (e.g., 5V, 12V, 24V) and communication methods (e.g., PWM, I2C, SPI, UART, USB) for each part
4. Categorize parts appropriately based on their primary function
5. Consider compatibility between components when designing connections`

/**
 * JSON format instruction for consistent responses
 */
export const JSON_FORMAT_INSTRUCTION = `
Output format must be valid JSON with the following structure:
{
  "pbsStructure": [
    {
      "id": "unique-id",
      "name": "Component Name",
      "type": "folder" | "component",
      "icon": "Folder" (optional),
      "children": [] (optional, for folders)
    }
  ],
  "partOrders": [
    {
      "partName": "Part Name",
      "modelNumber": "Model/Part Number",
      "voltage": "Operating Voltage",
      "communication": "Communication Protocols",
      "description": "Part Description",
      "quantity": 1,
      "category": "Category Name"
    }
  ],
  "systemConnections": [
    {
      "id": "connection-id",
      "fromComponent": "source-component-id",
      "toComponent": "target-component-id",
      "connectionType": "power" | "signal" | "data" | "mechanical",
      "description": "Connection Description"
    }
  ],
  "nodeLayout": [
    {
      "componentId": "component-id",
      "x": 100,
      "y": 100,
      "category": "actuator" | "control" | "sensor" | "power" | "communication" | "mechanical"
    }
  ]
}

IMPORTANT: You must respond with valid JSON only. Do not include any text before or after the JSON.`

/**
 * Build category selection prompt
 */
export function buildCategoryPrompt(): string {
  return `
Categories to choose from:
${Object.entries(PART_CATEGORIES).map(([key, value]) => `- ${value}`).join('\n')}

For nodeLayout, use these categories:
${Object.entries(NODE_CATEGORIES).map(([key, value]) => `- ${value}`).join('\n')}`
}

/**
 * Build connection type prompt
 */
export function buildConnectionTypePrompt(): string {
  return `
Connection types to use:
${Object.entries(CONNECTION_TYPES).map(([key, value]) => 
  `- "${value}": ${getConnectionTypeDescription(value)}`
).join('\n')}`
}

/**
 * Get description for connection type
 */
function getConnectionTypeDescription(type: string): string {
  const descriptions: Record<string, string> = {
    power: 'Electrical power supply connections',
    signal: 'Control signals (PWM, digital, analog)',
    data: 'Data communication (I2C, SPI, UART, USB)',
    mechanical: 'Physical/mechanical connections'
  }
  return descriptions[type] || 'General connection'
}

/**
 * Common notes for Japanese market
 */
export const JAPANESE_MARKET_NOTES = `
Notes for component selection:
- Prioritize parts available in Japan (Akizuki, Switch Science, Amazon Japan)
- Recommend parts that are beginner-friendly and well-documented
- Consider voltage standards in Japan (100V AC)
- Include Japanese product names where applicable`

/**
 * Validate component communication compatibility
 */
export function validateCommunicationCompatibility(
  fromComm: string,
  toComm: string
): { compatible: boolean; reason?: string } {
  const from = fromComm.toLowerCase()
  const to = toComm.toLowerCase()
  
  // Check for matching protocols
  const protocols = ['i2c', 'spi', 'uart', 'usb', 'pwm', 'analog', 'digital']
  
  for (const protocol of protocols) {
    if (from.includes(protocol) && to.includes(protocol)) {
      return { compatible: true }
    }
  }
  
  // Special compatibility rules
  if (from.includes('gpio') || to.includes('gpio')) {
    return { compatible: true } // GPIO is versatile
  }
  
  if ((from.includes('pwm') && to.includes('servo')) || 
      (from.includes('servo') && to.includes('pwm'))) {
    return { compatible: true } // PWM drives servos
  }
  
  return { 
    compatible: false, 
    reason: `No matching communication protocol between "${fromComm}" and "${toComm}"` 
  }
}

/**
 * Format voltage for consistency
 */
export function formatVoltage(voltage: string | undefined): string {
  if (!voltage) return 'Unknown'
  
  // Normalize voltage format
  const cleaned = voltage.trim().toUpperCase()
  
  // Add 'V' if missing
  if (/^\d+(\.\d+)?$/.test(cleaned)) {
    return `${cleaned}V`
  }
  
  return cleaned
}