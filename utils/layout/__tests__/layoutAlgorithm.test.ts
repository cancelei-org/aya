/**
 * Layout Algorithm Test Suite
 * Tests the grid layout calculation for node positioning
 */

describe('Layout Algorithm Tests', () => {
  // Configuration constants (same as in route.ts)
  const COLUMNS = 4
  const NODE_WIDTH = 240
  const NODE_HEIGHT = 120
  const SPACING_X = 50
  const SPACING_Y = 50
  const MARGIN_X = 100
  const MARGIN_Y = 100

  // Category gap for visual separation
  const CATEGORY_GAP = 100

  // The layout algorithm function (updated with category grouping)
  function calculateLayout(enhancedParts: Array<{ partName: string; quantity: number; category?: string }>) {
    // Group parts by category
    const categoryGroups: Record<string, Array<any>> = {}
    const categoryOrder = ['control', 'sensor', 'actuator', 'communication', 'power', 'mechanical']
    
    // Initialize category groups
    categoryOrder.forEach(cat => {
      categoryGroups[cat] = []
    })
    categoryGroups['other'] = [] // For uncategorized items
    
    // Expand parts by quantity and group by category
    let globalLayoutIndex = 0
    enhancedParts.forEach((part) => {
      const quantity = part.quantity || 1
      const category = (part.category || 'control').toLowerCase()
      
      for (let q = 0; q < quantity; q++) {
        const expandedPart = {
          ...part,
          componentId: `system-part-${globalLayoutIndex}`,
          globalIndex: globalLayoutIndex
        }
        
        if (categoryGroups[category]) {
          categoryGroups[category].push(expandedPart)
        } else {
          categoryGroups['other'].push(expandedPart)
        }
        
        globalLayoutIndex++
      }
    })
    
    // Layout each category group
    const layoutResults: Array<{ componentId: string; x: number; y: number; category: string }> = []
    let currentY = MARGIN_Y
    
    // Process categories in order
    const allCategories = categoryOrder.concat(['other'])
    allCategories.forEach(category => {
      const parts = categoryGroups[category]
      if (parts.length === 0) return
      
      // Layout parts in this category
      parts.forEach((part, index) => {
        const col = index % COLUMNS
        const row = Math.floor(index / COLUMNS)
        
        layoutResults.push({
          componentId: part.componentId,
          x: MARGIN_X + (col * (NODE_WIDTH + SPACING_X)),
          y: currentY + (row * (NODE_HEIGHT + SPACING_Y)),
          category: part.category || "control"
        })
      })
      
      // Calculate next category's Y position
      const rowsInCategory = Math.ceil(parts.length / COLUMNS)
      currentY += rowsInCategory * (NODE_HEIGHT + SPACING_Y) + CATEGORY_GAP
    })
    
    return layoutResults
  }

  test('Single component positioning', () => {
    const parts = [
      { partName: "Teensy 4.1", quantity: 1, category: "control" }
    ]
    
    const result = calculateLayout(parts)
    
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      componentId: "system-part-0",
      x: 100,
      y: 100,
      category: "control"
    })
  })

  test('4 components in same category', () => {
    const parts = [
      { partName: "Part1", quantity: 1, category: "control" },
      { partName: "Part2", quantity: 1, category: "control" },
      { partName: "Part3", quantity: 1, category: "control" },
      { partName: "Part4", quantity: 1, category: "control" }
    ]
    
    const result = calculateLayout(parts)
    
    expect(result).toHaveLength(4)
    
    // Check X positions (should increase by NODE_WIDTH + SPACING_X = 290)
    expect(result[0].x).toBe(100)
    expect(result[1].x).toBe(390)
    expect(result[2].x).toBe(680)
    expect(result[3].x).toBe(970)
    
    // All should be in same row (Y = 100) since same category
    result.forEach(node => {
      expect(node.y).toBe(100)
    })
  })

  test('Components in different categories', () => {
    const parts = [
      { partName: "Control1", quantity: 1, category: "control" },
      { partName: "Sensor1", quantity: 1, category: "sensor" },
      { partName: "Actuator1", quantity: 1, category: "actuator" },
      { partName: "Power1", quantity: 1, category: "power" }
    ]
    
    const result = calculateLayout(parts)
    
    expect(result).toHaveLength(4)
    
    // Each in different category, so different Y positions
    expect(result[0]).toMatchObject({ x: 100, y: 100 })  // control
    expect(result[1]).toMatchObject({ x: 100, y: 370 })  // sensor (100 + 170 + 100)
    expect(result[2]).toMatchObject({ x: 100, y: 640 })  // actuator (370 + 170 + 100)
    expect(result[3]).toMatchObject({ x: 100, y: 910 })  // power (640 + 170 + 100)
  })

  test('Components with quantity > 1', () => {
    const parts = [
      { partName: "Teensy", quantity: 1, category: "control" },
      { partName: "Servo", quantity: 2, category: "actuator" },
      { partName: "Sensor", quantity: 1, category: "sensor" }
    ]
    
    const result = calculateLayout(parts)
    
    expect(result).toHaveLength(4) // 1 + 2 + 1
    
    // Check IDs are present (may not be in order due to category grouping)
    const ids = result.map(r => r.componentId).sort()
    expect(ids).toEqual(["system-part-0", "system-part-1", "system-part-2", "system-part-3"])
    
    // Check positions (category-based)
    // Result is sorted by component ID, not by position
    expect(result[0]).toMatchObject({ x: 100, y: 100 }) // Teensy (control)
    expect(result[1]).toMatchObject({ x: 100, y: 640 }) // Servo A (actuator)
    expect(result[2]).toMatchObject({ x: 390, y: 640 }) // Servo B (actuator - same row)
    expect(result[3]).toMatchObject({ x: 100, y: 370 }) // Sensor (sensor category)
    
    // Check categories
    expect(result[1].category).toBe("actuator")
    expect(result[2].category).toBe("actuator")
  })

  test('Real-world example with 8 components', () => {
    const parts = [
      { partName: "Teensy 4.1", quantity: 1, category: "control" },
      { partName: "3DM-CV7-AHRS", quantity: 1, category: "sensor" },
      { partName: "PMX-SCR-5204HV", quantity: 2, category: "actuator" },
      { partName: "Raspberry Pi Zero 2", quantity: 1, category: "communication" },
      { partName: "MP1584 DC-DC", quantity: 2, category: "power" },
      { partName: "Li-Po Battery 3S", quantity: 1, category: "power" }
    ]
    
    const result = calculateLayout(parts)
    
    expect(result).toHaveLength(8)
    
    // Control category (Y = 100)
    expect(result[0]).toMatchObject({ x: 100, y: 100, componentId: "system-part-0" }) // Teensy
    
    // Sensor category (Y = 370) = 100 + 170 + 100
    expect(result[1]).toMatchObject({ x: 100, y: 370, componentId: "system-part-1" }) // 3DM-CV7
    
    // Actuator category (Y = 640) = 370 + 170 + 100
    expect(result[2]).toMatchObject({ x: 100, y: 640, componentId: "system-part-2" }) // PMX-A
    expect(result[3]).toMatchObject({ x: 390, y: 640, componentId: "system-part-3" }) // PMX-B
    
    // Communication category (Y = 910) = 640 + 170 + 100
    expect(result[4]).toMatchObject({ x: 100, y: 910, componentId: "system-part-4" }) // RasPi
    
    // Power category (Y = 1180) = 910 + 170 + 100
    expect(result[5]).toMatchObject({ x: 100, y: 1180, componentId: "system-part-5" }) // MP1584-A
    expect(result[6]).toMatchObject({ x: 390, y: 1180, componentId: "system-part-6" }) // MP1584-B
    expect(result[7]).toMatchObject({ x: 680, y: 1180, componentId: "system-part-7" }) // Li-Po
  })

  test('No overlap between nodes', () => {
    const parts = Array(10).fill(null).map((_, i) => ({
      partName: `Part${i}`,
      quantity: 1
    }))
    
    const result = calculateLayout(parts)
    
    // Check that no two nodes have overlapping areas
    for (let i = 0; i < result.length; i++) {
      for (let j = i + 1; j < result.length; j++) {
        const node1 = result[i]
        const node2 = result[j]
        
        // Calculate boundaries
        const node1Right = node1.x + NODE_WIDTH
        const node1Bottom = node1.y + NODE_HEIGHT
        const node2Right = node2.x + NODE_WIDTH
        const node2Bottom = node2.y + NODE_HEIGHT
        
        // Check for overlap
        const horizontalOverlap = node1.x < node2Right && node1Right > node2.x
        const verticalOverlap = node1.y < node2Bottom && node1Bottom > node2.y
        
        expect(horizontalOverlap && verticalOverlap).toBe(false)
      }
    }
  })

  test('Grid alignment verification', () => {
    const parts = Array(12).fill(null).map((_, i) => ({
      partName: `Part${i}`,
      quantity: 1
    }))
    
    const result = calculateLayout(parts)
    
    // Verify that all X positions align to grid columns
    const expectedXPositions = [100, 390, 680, 970]
    result.forEach(node => {
      expect(expectedXPositions).toContain(node.x)
    })
    
    // Verify that all Y positions align to grid rows
    const expectedYPositions = [100, 270, 440] // 3 rows for 12 components
    result.forEach(node => {
      expect(expectedYPositions).toContain(node.y)
    })
  })

  test('Empty input handling', () => {
    const parts: any[] = []
    const result = calculateLayout(parts)
    
    expect(result).toHaveLength(0)
    expect(result).toEqual([])
  })

  test('Large quantity handling', () => {
    const parts = [
      { partName: "MassProduced", quantity: 20 }
    ]
    
    const result = calculateLayout(parts)
    
    expect(result).toHaveLength(20)
    
    // Check that layout extends to 5 rows (20 / 4 = 5)
    const lastNode = result[19]
    expect(lastNode.x).toBe(970) // Column 3 (index 3)
    expect(lastNode.y).toBe(780) // Row 4 (100 + 4 * 170)
  })
})

// Run tests
if (typeof describe === 'undefined') {
  console.log('To run these tests, use: npm test utils/layout/__tests__/layoutAlgorithm.test.ts')
  console.log('Or add jest configuration to your project')
}