// System design handler for processing structured system designs from requirements
import { generateInstanceName } from '../components/componentNaming'
import { processSystemConnections } from './partsConnectionProcessor'
import { saveProjectData } from '../project/projectUtils'
import { calculateLayoutWithPredefined } from '../layout/componentLayoutCalculator'
import { forceReactFlowUpdate } from '../flow/flowUtils'
import type { PartSpecification } from '../types/hardwareAnalysis'

// Process system design data from generate-system API
export const processSystemDesign = async (
  systemDesign: any,
  setIsAnalyzing: (analyzing: boolean) => void,
  setLlmStatus: (status: { isRunning: boolean; currentTask: string; currentStep?: number; totalSteps?: number }) => void,
  setCanvasNodes: any,
  nodes: any[],
  connections: any[],
  setConnections: any,
  setFailedConnections: any,
  setChatMessages: any,
  currentProject: any,
  chatMessages: any[],
  isSaving: boolean,
  setIsSaving: any,
  requirementDocument?: any // Optional requirement document for context
) => {
  setIsAnalyzing(true)
  setLlmStatus({ 
    isRunning: true, 
    currentTask: "Stage 2-2",
    currentStep: 3,
    totalSteps: 6
  })
  
  // Debug: Check if partOrders have nodeId
  console.log('🔍 DEBUG: partOrders nodeId check:', {
    partOrdersCount: systemDesign.partOrders?.length || 0,
    firstPartOrder: systemDesign.partOrders?.[0] ? {
      partName: systemDesign.partOrders[0].partName,
      hasNodeId: !!systemDesign.partOrders[0].nodeId,
      nodeId: systemDesign.partOrders[0].nodeId,
      allKeys: Object.keys(systemDesign.partOrders[0])
    } : null
  })
  
  // Track the updated connections
  let updatedConnections: any[] = connections
  
  // Track expected component count for monitoring
  const expectedComponentCount = systemDesign.partOrders?.reduce((sum: number, part: any) => 
    sum + (part.quantity || 1), 0) || 0
  // Expected component count: ${expectedComponentCount}
  
  try {
    // Processing system design
    
    // Process part orders and add to canvas
    let capturedComponentInstances: any[] = []
    if (systemDesign.partOrders && systemDesign.partOrders.length > 0) {
      // Parts are already enhanced on the server side
      setLlmStatus({ 
        isRunning: true, 
        currentTask: "Stage 2-3",
        currentStep: 4,
        totalSteps: 6
      })
      
      // Process the pre-enhanced parts
      capturedComponentInstances = await processPartOrders(
        systemDesign.partOrders,
        systemDesign.nodeLayout || [],
        setCanvasNodes,
        nodes,
        setLlmStatus
      )
    }

    // Process system connections
    if (systemDesign.systemConnections && systemDesign.systemConnections.length > 0) {
      // Update to connections phase
      setLlmStatus({ 
        isRunning: true, 
        currentTask: "enhancing",
        currentStep: 5,
        totalSteps: 6
      })
      
      // Debug: Check systemDesign object
      console.log('🔍 DEBUG: systemDesign object:', {
        hasSystemConnections: !!systemDesign.systemConnections,
        systemConnectionsLength: systemDesign.systemConnections?.length || 0,
        systemConnectionsSample: systemDesign.systemConnections?.[0],
        allKeys: Object.keys(systemDesign)
      })
      
      // Create ID mapping from original nodeId to actual component ID
      const idMapping = new Map<string, string>()
      capturedComponentInstances.forEach(instance => {
        // Map from the original part nodeId to the actual instance ID
        const originalNodeId = systemDesign.partOrders?.find(
          (p: any) => p.partName === instance.title || p.modelNumber === instance.modelNumber
        )?.nodeId
        if (originalNodeId && originalNodeId !== instance.id) {
          idMapping.set(originalNodeId, instance.id)
          console.log(`🔄 ID mapping: ${originalNodeId} → ${instance.id}`)
        }
      })
      
      // Remap connection IDs if needed
      const remappedConnections = systemDesign.systemConnections?.map((conn: any) => {
        const newSource = idMapping.get(conn.source) || conn.source
        const newTarget = idMapping.get(conn.target) || conn.target
        if (newSource !== conn.source || newTarget !== conn.target) {
          console.log(`🔄 Remapping connection: ${conn.source}→${conn.target} to ${newSource}→${newTarget}`)
        }
        return {
          ...conn,
          source: newSource,
          target: newTarget
        }
      }) || []
      
      // Get the new connections directly from processSystemConnections
      const newConnections = await processSystemConnections(
        remappedConnections,
        capturedComponentInstances,
        setConnections,
        setFailedConnections,
        setCanvasNodes
      )
      
      // Debug: Check the format of returned connections
      console.log('🔍 DEBUG: newConnections from processSystemConnections:', {
        count: newConnections.length,
        sample: newConnections[0] ? {
          id: newConnections[0].id,
          hasFromId: !!newConnections[0].fromId,
          hasToId: !!newConnections[0].toId,
          hasSource: !!newConnections[0].source,
          hasTarget: !!newConnections[0].target,
          fullObject: newConnections[0]
        } : null
      })
      
      // Update the connections with both existing and new connections
      updatedConnections = [...connections, ...newConnections]
      console.log('📊 Updated connections for saving:', {
        existing: connections.length,
        new: newConnections.length,
        total: updatedConnections.length,
        updatedConnectionsSample: updatedConnections[0]
      })
    }

    // Add completion message
    addAnalysisCompletionMessage(
      systemDesign.partOrders?.length || 0,
      capturedComponentInstances.length,
      setChatMessages,
      systemDesign,
      requirementDocument
    )

    // Save project data with updated connections and NEW nodes
    // capturedComponentInstancesには新しく生成されたノードが含まれている
    await saveProjectDataAfterAnalysis(
      updatedConnections,
      currentProject,
      capturedComponentInstances,  // 新しく生成されたノードを渡す（古いnodesではなく）
      [],
      chatMessages,
      isSaving,
      setIsSaving
    )

    // Phase 3: Auto-reload after 3 seconds
    // Starting auto-reload timer (3 seconds)...
    setTimeout(() => {
      // Auto-reload: Forcing React Flow update after 3 seconds
      forceReactFlowUpdate(setCanvasNodes)
      
      // Check current node count
      setCanvasNodes((currentNodes: any[]) => {
        // Auto-reload check: Expected ${expectedComponentCount} components, found ${currentNodes.length} nodes
        return currentNodes
      })
    }, 3000)

    // Start periodic updates every 5 seconds for debugging
    let updateCount = 0
    const intervalId = setInterval(() => {
      updateCount++
      // Periodic update #${updateCount} (5s interval)
      
      // Check and log current state
      setCanvasNodes((currentNodes: any[]) => {
        const componentNodes = currentNodes.filter(node => 
          node.id.startsWith('ai-comp-') || node.basePartId
        )
        // Periodic check: ${componentNodes.length}/${expectedComponentCount} components displayed
        
        // If still not all components are displayed, force update
        if (componentNodes.length < expectedComponentCount) {
          // Not all components displayed, forcing update...
          forceReactFlowUpdate(setCanvasNodes)
        }
        
        return currentNodes
      })
      
      // Stop after 30 seconds (6 updates)
      if (updateCount >= 6) {
        // Stopping periodic updates after 30 seconds
        clearInterval(intervalId)
      }
    }, 5000)

  } catch (error) {
    console.error('System design processing error:', error)
    setChatMessages((prev: any[]) => [...prev, {
      id: Date.now().toString(),
      role: "assistant" as const,
      content: "An error occurred while processing the system design.",
      timestamp: new Date().toISOString(),
    }])
  } finally {
    setIsAnalyzing(false)
    setLlmStatus({ isRunning: false, currentTask: "" })
  }
}

// Process part orders with predefined layout
async function processPartOrders(
  partOrders: any[],
  nodeLayout: any[],
  setCanvasNodes: any,
  nodes: any[],
  setLlmStatus?: any
): Promise<any[]> {
  // Processing part orders: ${partOrders.length}
  
  const componentInstances: any[] = []
  const layoutMap = new Map(nodeLayout.map(layout => [layout.componentId, layout]))
  
  // Use the IDs from nodeLayout directly instead of generating new ones
  // Include ALL layouts (both components and categories) for proper ID mapping
  const componentLayouts = nodeLayout.filter(layout => !layout.nodeType || layout.nodeType !== 'category')
  
  // Map component layouts to their IDs for easier lookup
  const componentIdMap = new Map<number, string>()
  let layoutIndex = 0
  
  partOrders.forEach((part, partIndex) => {
    const quantity = part.quantity || 1
    // Processing part: ${part.partName} (quantity: ${quantity})
    
    for (let i = 0; i < quantity; i++) {
      const partName = part.partName || part.name || 'Unknown'
      const basePartId = `${partName.replace(/[^a-zA-Z0-9]/g, '')}-${part.modelNumber || 'default'}`
      
      // Generate instance name
      let instanceName: string
      if (quantity === 1) {
        instanceName = partName
      } else {
        const existingTitles = [...nodes, ...componentInstances].map(c => c.title || c.instanceName)
        instanceName = generateInstanceName(partName, existingTitles)
      }
      
      // Port numbers are already provided from server-side enhancement
      const inputs = part.inputs || 1
      const outputs = part.outputs || 1
      
      // Get the layout info for this component
      const layoutForThisComponent = componentLayouts[layoutIndex]
      
      // For multiple instances, we need unique IDs
      // Use layoutForThisComponent.componentId which has unique instance numbers
      const componentId = layoutForThisComponent?.componentId || part.nodeId || `system-part-${Date.now()}-${layoutIndex}`
      componentIdMap.set(layoutIndex, componentId)
      
      const componentInstance = {
        id: componentId,  // Use ID from backend nodeLayout
        partTypeIndex: partIndex,  // Store part type index for debugging
        instanceNumber: i,          // Store instance number within same type for debugging
        title: instanceName,
        instanceName: instanceName,
        modelNumber: part.modelNumber,
        voltage: part.voltage,
        communication: part.communication,
        description: part.description,
        purchaseSiteLink: part.purchaseSiteLink || '',
        basePartId: basePartId,
        category: part.category || 'Uncategorized',
        inputs: inputs,
        outputs: outputs,
        // Include enhanced details if available
        specifications: part.specifications,
        dynamicPorts: part.dynamicPorts,
        ports: part.ports, // Pass through the ports array
        detailsFetched: part.detailsFetched,
        // 価格情報を追加
        price: part.price || '',
        aiPricing: part.aiPricing || null
      }
      
      componentInstances.push(componentInstance)
      layoutIndex++  // Increment layout index
      // Created instance ${i + 1}/${quantity}: ${instanceName} with ID: ${componentId}
    }
  })
  
  // Debug: Show all generated component instances
  console.log('📊 Generated component instances:')
  componentInstances.forEach((comp, idx) => {
    console.log(`   [${idx}] ID: ${comp.id}, Title: ${comp.title || comp.instanceName}`)
  })
  
  // Calculate layout using backend positions
  const layoutPositions = calculateLayoutWithPredefined(
    componentInstances,
    nodeLayout
  )
  
  // Category nodes will be provided by backend in nodeLayout
  // Extract category nodes from nodeLayout
  console.log('[DEBUG] nodeLayout from backend:', {
    total: nodeLayout.length,
    categoryNodes: nodeLayout.filter(n => n.nodeType === 'category').length,
    componentNodes: nodeLayout.filter(n => !n.nodeType || n.nodeType !== 'category').length,
    items: nodeLayout.slice(0, 5).map(n => ({ 
      id: n.componentId, 
      type: n.nodeType || 'component', 
      title: n.title,
      category: n.category,
      x: n.x,
      y: n.y
    }))
  })
  
  const categoryLayouts = nodeLayout.filter(layout => layout.nodeType === 'category')
  const categoryIdMap = new Map<string, string>()
  
  console.log(`[DEBUG] Found ${categoryLayouts.length} category nodes from backend`)
  
  categoryLayouts.forEach(catLayout => {
    categoryIdMap.set(catLayout.category, catLayout.componentId)
    console.log(`📋 Category mapping: "${catLayout.title || catLayout.category}" (${catLayout.category}) → ${catLayout.componentId} at (${catLayout.x}, ${catLayout.y})`)
  })
  
  // Add to canvas with proper layout
  setCanvasNodes((prevNodes: any[]) => {
    const updatedNodes = [...prevNodes]
    
    // Add category nodes from backend layout (so they appear behind component nodes)
    categoryLayouts.forEach(catLayout => {
      const existingCategory = updatedNodes.find(node => 
        node.id === catLayout.componentId || 
        (node.data?.nodeType === 'category' && node.data?.title === catLayout.title)
      )
      
      if (!existingCategory) {
        const categoryNode = {
          id: catLayout.componentId,
          type: 'systemNode',
          position: { x: catLayout.x || 0, y: catLayout.y || 0 },
          data: {
            title: catLayout.title || 'Category',
            type: 'secondary',  // Use secondary type for visual distinction
            nodeType: 'category',
            bounds: {
              x: catLayout.x || 0,
              y: catLayout.y || 0,
              width: catLayout.width || 400,
              height: catLayout.height || 200
            },
            memberNodes: componentInstances
              .filter(inst => inst.category?.toLowerCase() === catLayout.category)
              .map(inst => inst.id),
            isResizable: true,
            inputs: 0,
            outputs: 0
          },
          style: {
            zIndex: -10  // Ensure category nodes appear behind component nodes and edges
          }
        }
        updatedNodes.push(categoryNode)
        console.log(`📁 Added category node: ${catLayout.title} at (${catLayout.x}, ${catLayout.y}) with ${categoryNode.data.memberNodes.length} members`)
      } else {
        console.log(`📁 Category node already exists: ${catLayout.title}`)
      }
    })
    
    componentInstances.forEach((instance, index) => {
      // Check for existing node
      const existingNode = updatedNodes.find(node => 
        node.data?.title === instance.title ||
        (node.basePartId === instance.basePartId && node.instanceName === instance.title)
      )
      
      if (!existingNode) {
        // Get calculated position
        const position = layoutPositions.get(instance.id) || { x: 100, y: 100 }
        
        // Create new node
        const nodeType = instance.dynamicPorts ? 'system' as const : 'primary' as const
        
        // Use ports array if already provided, otherwise generate from dynamicPorts
        let ports = instance.ports || []
        if (!ports.length && instance.dynamicPorts && instance.dynamicPorts.portGroups) {
          ports = instance.dynamicPorts.portGroups.flatMap(group => 
            group.ports.map(port => ({
              id: port.id,
              label: port.label,
              type: port.type,
              protocol: port.protocol,
              direction: port.direction,
              position: port.position
            }))
          )
        }
        
        // Creating node ${instance.title}
        
        const newCanvasNode = {
          id: instance.id,
          type: 'systemNode',
          position: { x: position.x, y: position.y },
          data: {
            title: instance.title,
            type: nodeType,
            nodeType: 'part',  // 明示的にパーツノードであることを指定
            inputs: instance.inputs || 1,
            outputs: instance.outputs || 1,
            basePartId: instance.basePartId,
            // Add dynamic ports if available
            ports: ports,
            dynamicPorts: instance.dynamicPorts,
            specifications: instance.specifications,
            instanceName: instance.title,
            modelNumber: instance.modelNumber,
            orderStatus: 'Unordered' as const,
            estimatedOrderDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            purchaseSiteLink: instance.purchaseSiteLink || '',
            quantity: 1,
            description: instance.description || `AI suggested: ${instance.title}`,
            voltage: instance.voltage,
            communication: instance.communication,
            category: instance.category,
            categoryId: categoryIdMap.get(instance.category || 'Uncategorized'),  // カテゴリIDを追加
            // 価格情報を追加
            price: instance.price || '',
            aiPricing: instance.aiPricing || null
          }
        }
        updatedNodes.push(newCanvasNode)
        // Adding new canvas node: ${newCanvasNode.title}
      } else {
        // Preserving existing canvas node: ${existingNode.title}
        // Update existing node - ensure data object exists
        if (!existingNode.data) existingNode.data = {}
        
        existingNode.data.modelNumber = instance.modelNumber
        existingNode.data.voltage = instance.voltage
        existingNode.data.communication = instance.communication
        existingNode.data.basePartId = instance.basePartId
        existingNode.data.category = instance.category
        existingNode.data.categoryId = categoryIdMap.get(instance.category || 'Uncategorized')  // カテゴリIDを追加
        existingNode.data.nodeType = 'part'  // 明示的にパーツノードであることを指定
        existingNode.data.inputs = instance.inputs || existingNode.data.inputs || 1
        existingNode.data.outputs = instance.outputs || existingNode.data.outputs || 1
        // Update dynamic ports if available
        if (instance.dynamicPorts) {
          existingNode.data.dynamicPorts = instance.dynamicPorts
        }
        // Update ports array - prefer pre-generated ports or generate from dynamicPorts
        if (instance.ports && instance.ports.length > 0) {
          existingNode.data.ports = instance.ports
          // Updated existing node ${existingNode.data.title} with ${instance.ports.length} pre-generated ports
        } else if (instance.dynamicPorts && instance.dynamicPorts.portGroups) {
          existingNode.data.ports = instance.dynamicPorts.portGroups.flatMap(group => 
            group.ports.map(port => ({
              id: port.id,
              label: port.label,
              type: port.type,
              protocol: port.protocol,
              direction: port.direction,
              position: port.position
            }))
          )
          // Updated existing node ${existingNode.data.title} with ${existingNode.data.ports?.length || 0} ports from dynamicPorts
        }
        if (instance.specifications) {
          existingNode.data.specifications = instance.specifications
        }
        if (!existingNode.data.orderStatus) existingNode.data.orderStatus = 'Unordered'
        if (!existingNode.data.estimatedOrderDate) existingNode.data.estimatedOrderDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        if (!existingNode.data.purchaseSiteLink) existingNode.data.purchaseSiteLink = instance.purchaseSiteLink || ''
        if (!existingNode.data.quantity) existingNode.data.quantity = 1
        if (!existingNode.data.description) existingNode.data.description = instance.description || `Updated: ${instance.title}`
        // 価格情報を更新
        if (instance.price !== undefined) existingNode.data.price = instance.price
        if (instance.aiPricing !== undefined) existingNode.data.aiPricing = instance.aiPricing
      }
    })
    
    return updatedNodes
  })
  
  // Force React Flow to update and display all components
  setTimeout(() => {
    forceReactFlowUpdate(setCanvasNodes)
    
    // 2回目の更新で確実に表示
    setTimeout(() => {
      forceReactFlowUpdate(setCanvasNodes)
    }, 500)
  }, 100)
  
  return componentInstances
}

// Category node generation has been moved to backend for consistency

// Add completion message
function addAnalysisCompletionMessage(
  partsCount: number,
  instancesCount: number,
  setChatMessages: any,
  systemDesign?: any,
  requirementDocument?: any
) {
  const analysisMessage = {
    id: Date.now().toString(),
    role: "assistant" as const,
    content: `System design processed successfully.\nGenerated parts: ${partsCount}\nComponent instances created: ${instancesCount}`,
    timestamp: Date.now(), // Changed to number for consistency
  }
  
  setChatMessages((prev: any[]) => {
    const hasSimilar = prev.some((msg: any) => 
      msg.content.includes('System design processed') && 
      Date.now() - (typeof msg.timestamp === 'number' ? msg.timestamp : new Date(msg.timestamp).getTime()) < 5000
    )
    if (hasSimilar) return prev
    return [...prev, analysisMessage]
  })
  
  // Add software prompt generation suggestion after 3 seconds
  setTimeout(() => {
    const softwarePromptSuggestion = {
      id: `prompt-suggestion-${Date.now()}`,
      role: "assistant" as const,
      content: "💡 **Would you like me to generate a software development prompt for this hardware system?**\n\nI can create a detailed prompt that you can use with ChatGPT, Claude, or other LLM services to generate the embedded software code for your system.\n\nJust say \"generate software prompt\" to proceed.",
      timestamp: Date.now(), // Changed to number for consistency
    }
    
    console.log('🎯 Adding software prompt suggestion message')
    setChatMessages((prev: any[]) => {
      console.log('📝 Current messages count before adding prompt suggestion:', prev.length)
      const updated = [...prev, softwarePromptSuggestion]
      console.log('📝 Updated messages count after adding prompt suggestion:', updated.length)
      console.log('📝 Last message:', updated[updated.length - 1])
      return updated
    })
    
    // Also fire event with system design data
    window.dispatchEvent(new CustomEvent('systemDesignReady', { 
      detail: { 
        systemDesign: systemDesign,
        requirementDocument: requirementDocument
      } 
    }))
  }, 3000)
}

// Save project data
async function saveProjectDataAfterAnalysis(
  connections: any[],
  currentProject: any,
  nodes: any[],
  pbsData: any[],
  chatMessages: any[],
  isSaving: boolean,
  setIsSaving: any
) {
  setTimeout(() => {
    console.log('💾 Saving project data after system design processing...', {
      connectionsCount: connections.length,
      nodesCount: nodes.length,
      chatMessagesCount: chatMessages.length
    })
    
    // saveProjectDataの正しい引数順序:
    // 1. connections, 2. currentProject, 3. nodes, 4. chatMessages, 5. isSaving, 6. setIsSaving
    saveProjectData(
      connections,
      currentProject,
      nodes,
      chatMessages,  // 正しい順序：4番目はchatMessages
      isSaving,      // 正しい順序：5番目はisSaving
      setIsSaving    // 正しい順序：6番目はsetIsSaving
    ).catch(error => {
      console.error('Failed to save project data after system design:', error)
    })
  }, 500)
}