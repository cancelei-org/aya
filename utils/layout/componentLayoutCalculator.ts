// Component layout calculator for AI-generated system designs
// Implements category-based grouping with proper spacing

interface Component {
  id: string
  title: string
  category?: string
  basePartId?: string
  instanceName?: string
}

interface LayoutPosition {
  x: number
  y: number
}

interface LayoutConfig {
  startX?: number
  startY?: number
  componentWidth?: number
  componentHeight?: number
  spacing?: number
}

const DEFAULT_CONFIG: LayoutConfig = {
  startX: 100,
  startY: 100,
  componentWidth: 240,   // Actual node width
  componentHeight: 120,  // Actual node height
  spacing: 50            // Spacing between nodes
}


/**
 * Calculate layout with predefined positions from nodeLayout
 * @param components Components to layout
 * @param nodeLayout Predefined layout positions from API
 * @param config Layout configuration
 * @returns Map of component ID to position
 */
export function calculateLayoutWithPredefined(
  components: Component[],
  nodeLayout: Array<{componentId: string, x?: number, y?: number}> = [],
  config: LayoutConfig = {}
): Map<string, LayoutPosition> {
  const positions = new Map<string, LayoutPosition>()
  
  // Use backend-provided layout if available
  if (nodeLayout && nodeLayout.length > 0) {
    console.log(`📐 Using backend-provided layout for ${nodeLayout.length} items`)
    
    // Apply all positions from nodeLayout (including category nodes)
    nodeLayout.forEach(layout => {
      if (layout.componentId && layout.x !== undefined && layout.y !== undefined) {
        positions.set(layout.componentId, { x: layout.x, y: layout.y })
        const nodeType = layout.nodeType === 'category' ? '📁' : '✅'
        console.log(`  ${nodeType} ${layout.componentId}: x=${layout.x}, y=${layout.y}`)
      }
    })
    
    // Improved fallback for any components not in nodeLayout (single row)
    let fallbackIndex = 0
    const fallbackY = 400 // Position below the main layout
    components.forEach(component => {
      if (!positions.has(component.id)) {
        console.warn(`  ⚠️ No layout for ${component.id}, using horizontal fallback position`)
        positions.set(component.id, {
          x: 100 + fallbackIndex * (240 + 30),  // Horizontal layout with smaller spacing
          y: fallbackY  // Same Y for all fallback components
        })
        fallbackIndex++
      }
    })
    
    console.log(`📍 Layout complete: ${positions.size} components positioned`)
    return positions
  }
  
  // No backend layout - use horizontal single row fallback
  console.log('📐 No backend layout provided, using horizontal single-row fallback')
  components.forEach((component, index) => {
    positions.set(component.id, {
      x: 100 + index * (240 + 30),  // Horizontal layout
      y: 100  // Same Y coordinate for all
    })
  })
  
  console.log(`📍 Fallback layout: ${components.length} components in single row`)
  return positions
}

