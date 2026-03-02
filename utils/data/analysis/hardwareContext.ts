// ハードウェア情報の自動抽出とコンテキスト生成

// 型定義を一元化されたファイルからimport
import type {
  CanvasNode,
  Connection,
  TreeNode,
  NodeData
} from '@/types'
import type { Node } from '@xyflow/react'

interface HardwareContext {
  components: Node<NodeData>[]
  connections: Connection[]
  specifications: Node<NodeData>[] // Use CanvasNode instead of PartOrder
  projectStructure: TreeNode[]
  systemAnalysis: SystemAnalysis
}

interface SystemAnalysis {
  totalComponents: number
  totalConnections: number
  voltageTypes: string[]
  communicationTypes: string[]
  connectivityRate: number
  potentialIssues: string[]
  systemComplexity: "Low" | "Medium" | "High"
}

/**
 * システム分析を自動生成
 */
export function generateSystemAnalysis(
  nodes: Node<NodeData>[],
  connections: Connection[]
): SystemAnalysis {
  // 電圧・通信方式の抽出
  const voltageTypes = [
    ...new Set([
      ...nodes.filter(n => n.data?.voltage).map(n => n.data.voltage!)
    ])
  ]
  
  const communicationTypes = [
    ...new Set([
      ...nodes.filter(n => n.data?.communication).map(n => n.data.communication!)
    ])
  ]

  // 接続率の計算
  const totalOutputs = nodes.reduce((sum, node) => sum + (node.data?.outputs || 0), 0)
  const totalInputs = nodes.reduce((sum, node) => sum + (node.data?.inputs || 0), 0)
  const maxPossibleConnections = Math.min(totalOutputs, totalInputs)
  const connectivityRate = maxPossibleConnections > 0 ? (connections.length / maxPossibleConnections) * 100 : 0

  // 潜在的な問題の検出
  const potentialIssues: string[] = []
  
  if (voltageTypes.length > 2) {
    potentialIssues.push("Multiple voltage levels detected - check compatibility")
  }
  
  if (connectivityRate < 50) {
    potentialIssues.push("Low connectivity rate - many components may be unconnected")
  }
  
  if (communicationTypes.length > 1) {
    potentialIssues.push("Multiple communication protocols - ensure proper interfaces")
  }

  // 孤立したコンポーネントの検出
  const connectedNodeIds = new Set([
    ...connections.map(c => c.fromId),
    ...connections.map(c => c.toId)
  ])
  const isolatedNodes = nodes.filter(node => !connectedNodeIds.has(node.id))
  
  if (isolatedNodes.length > 0) {
    potentialIssues.push(`${isolatedNodes.length} isolated components detected`)
  }

  // システム複雑度の判定
  let systemComplexity: "Low" | "Medium" | "High"
  const complexityScore = nodes.length + connections.length + communicationTypes.length
  
  if (complexityScore < 10) {
    systemComplexity = "Low"
  } else if (complexityScore < 25) {
    systemComplexity = "Medium"
  } else {
    systemComplexity = "High"
  }

  return {
    totalComponents: nodes.length,
    totalConnections: connections.length,
    voltageTypes,
    communicationTypes,
    connectivityRate: Math.round(connectivityRate),
    potentialIssues,
    systemComplexity
  }
}

/**
 * 現在のプロジェクトデータからハードウェアコンテキストを自動生成
 */
export function extractHardwareContext(
  nodes: Node<NodeData>[],
  connections: Connection[],
  pbsData: TreeNode[]
): HardwareContext {
  const systemAnalysis = generateSystemAnalysis(nodes, connections)
  
  return {
    components: nodes,
    connections: connections,
    specifications: nodes, // Use nodes as specifications
    projectStructure: pbsData,
    systemAnalysis
  }
}

/**
 * ハードウェアコンテキストを簡潔な英語サマリーに変換
 */
export function generateContextSummary(context: HardwareContext): string {
  const { systemAnalysis } = context
  
  if (systemAnalysis.totalComponents === 0) {
    return "No hardware components configured"
  }

  const parts = [
    `${systemAnalysis.totalComponents} components`,
    `${systemAnalysis.totalConnections} connections`
  ]

  if (systemAnalysis.voltageTypes.length > 0) {
    parts.push(`${systemAnalysis.voltageTypes.join(', ')} voltage`)
  }

  if (systemAnalysis.communicationTypes.length > 0) {
    parts.push(`${systemAnalysis.communicationTypes.join(', ')} communication`)
  }

  return parts.join(' | ')
}

/**
 * 接続ポートから通信プロトコルを判定
 */
function determineProtocol(fromPort: string, toPort: string): string {
  const port = (fromPort + toPort).toUpperCase()
  
  if (port.includes('SDA') || port.includes('SCL')) return 'I2C'
  if (port.includes('MISO') || port.includes('MOSI') || port.includes('SCK') || port.includes('SS')) return 'SPI'
  if (port.includes('TX') || port.includes('RX')) return 'UART'
  if (port.includes('VCC') || port.includes('5V') || port.includes('3V3') || port.includes('3.3V')) return 'Power'
  if (port.includes('GND')) return 'Ground'
  if (port.includes('D+') || port.includes('D-')) return 'USB'
  if (port.includes('CAN')) return 'CAN'
  
  return 'GPIO'
}

/**
 * LLM用の簡略化されたコンテキストを生成（PBS階層構造、発注リスト、接続情報を含む）
 */
export function generateLLMContext(context: HardwareContext): string {
  const { specifications, projectStructure, connections, components } = context
  
  if (specifications.length === 0 && projectStructure.length === 0) {
    return "User has no hardware configuration set up yet."
  }

  const sections = ["## User's Hardware System Configuration"]

  // PBS階層構造
  if (projectStructure.length > 0) {
    sections.push("\n### PBS (Product Breakdown Structure):")
    const renderPBSNode = (node: TreeNode, depth: number = 0): string => {
      const indent = "  ".repeat(depth)
      const icon = node.type === "folder" ? "📁" : "⚙️"
      let result = `${indent}${icon} ${node.name}`
      
      if (node.children && node.children.length > 0) {
        node.children.forEach(child => {
          result += "\n" + renderPBSNode(child, depth + 1)
        })
      }
      
      return result
    }
    
    projectStructure.forEach(node => {
      sections.push(renderPBSNode(node))
    })
  }

  // 発注リスト情報（システム概要、電圧、通信方式、個数のみ）
  if (specifications.length > 0) {
    sections.push("\n### Order List:")
    specifications.forEach((part, index) => {
      const specs = []
      if (part.data?.voltage) specs.push(`${part.data.voltage}`)
      if (part.data?.communication) specs.push(`${part.data.communication}`)
      
      sections.push(
        `${index + 1}. ${part.data?.title || 'Component'}` +
        (part.data?.description ? ` - ${part.data.description}` : '') +
        (specs.length > 0 ? ` (${specs.join(', ')})` : '') +
        ` | Qty: ${part.data?.quantity || 1}`
      )
    })
  }

  // 接続情報セクション
  if (connections.length > 0) {
    sections.push("\n### Hardware Connections:")
    sections.push("| From Component | From Pin | To Component | To Pin | Protocol |")
    sections.push("|----------------|----------|--------------|--------|----------|")
    
    connections.forEach(conn => {
      const fromNode = components.find(n => n.id === conn.fromId)
      const toNode = components.find(n => n.id === conn.toId)
      if (fromNode && toNode) {
        const protocol = determineProtocol(conn.fromPort, conn.toPort)
        sections.push(`| ${fromNode.data?.title || 'Unknown'} | ${conn.fromPort} | ${toNode.data?.title || 'Unknown'} | ${conn.toPort} | ${protocol} |`)
      }
    })
    
    // 接続に関する注意事項
    sections.push("\n**Connection Notes:**")
    sections.push("- Ensure voltage level compatibility between components")
    sections.push("- I2C connections require pull-up resistors (typically 4.7kΩ)")
    sections.push("- SPI connections may require pull-up resistors on CS line")
    sections.push("- Check maximum current ratings for power connections")
    sections.push("- Use appropriate wire gauge for power connections")
  }

  return sections.join('\n')
}