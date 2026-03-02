// Shared type definitions for hardware analysis

// Part categories definition
export const PART_CATEGORIES = {
  MECHANICAL: 'Mechanical Assembly',
  ACTUATORS: 'Actuators & Drives',
  CONTROL: 'Control System',
  SENSORS: 'Sensors',
  VISION: 'Vision System',
  COMPUTING: 'Computing Platform',
  POWER_COMM: 'Power & Communication'
} as const

export type PartCategory = typeof PART_CATEGORIES[keyof typeof PART_CATEGORIES]

// Connection types definition
export const CONNECTION_TYPES = {
  POWER: 'power',
  SIGNAL: 'signal',
  DATA: 'data',
  MECHANICAL: 'mechanical'
} as const

export type ConnectionType = typeof CONNECTION_TYPES[keyof typeof CONNECTION_TYPES]

// Node categories for layout
export const NODE_CATEGORIES = {
  ACTUATOR: 'actuator',
  CONTROL: 'control',
  SENSOR: 'sensor',
  POWER: 'power',
  COMMUNICATION: 'communication',
  MECHANICAL: 'mechanical'
} as const

export type NodeCategory = typeof NODE_CATEGORIES[keyof typeof NODE_CATEGORIES]

// Common interfaces
export interface PartSpecification {
  partName: string
  modelNumber?: string
  voltage?: string
  communication?: string
  description?: string
  purchaseSiteLink?: string
  quantity: number
  estimatedPrice?: number
  category: string
  inputs?: number
  outputs?: number
}

export interface SystemConnection {
  id: string
  fromComponent: string
  toComponent: string
  connectionType: ConnectionType
  description: string
}

export interface NodeLayout {
  componentId: string
  x: number
  y: number
  category: NodeCategory
}

export interface PBSNode {
  id: string
  name: string
  type: 'folder' | 'component'
  icon?: string
  children?: PBSNode[]
}

export interface SystemDesignResponse {
  pbsStructure: PBSNode[]
  partOrders: PartSpecification[]
  systemConnections: SystemConnection[]
  nodeLayout: NodeLayout[]
  designNotes?: {
    summary: string
    keyFeatures: string[]
    alternatives?: Array<{
      component: string
      alternative: string
      reason: string
    }>
    considerations: string[]
  }
  generatedAt?: string
  projectId?: string
}