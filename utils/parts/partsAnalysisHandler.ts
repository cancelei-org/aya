// 部品リスト解析処理専用ハンドラー
import { generateInstanceName, handleComponentAddition } from '../components/componentNaming'
import { generateSmartPBSStructure, applySmartGroupingToPBS } from '../project/smartGrouping'
import { saveProjectData } from '../project/projectUtils'
// 🚀 単一データソース: PBS重複除去とアイコン処理は不要（pbsComputed.tsで自動生成）
import { processSystemConnections } from './partsConnectionProcessor'
import { calculateComponentLayout } from '../layout/componentLayoutCalculator'
import type { TreeNode } from '@/types'

// 部品分析の型定義
interface AnalysisPartOrder {
  partName: string
  modelNumber: string
  voltage: string
  communication: string
  description: string
  purchaseSiteLink?: string
  quantity?: number
  estimatedOrderDate?: string
  category?: string
}

interface PBSStructureNode {
  id: string
  name: string
  icon: string
  children?: PBSStructureNode[]
}

// 部品リスト解析処理のメイン関数
export const handleAnalyzePartsList = async (
  partsList: string,
  setIsAnalyzing: (analyzing: boolean) => void,
  setLlmStatus: (status: { isRunning: boolean; currentTask: string }) => void,
  setCanvasNodes: any,
  nodes: any[],
  connections: any[],
  setConnections: any,
  setFailedConnections: any,
  setChatMessages: any,
  currentProject: any,
  chatMessages: any[],
  isSaving: boolean,
  setIsSaving: any
) => {
  setIsAnalyzing(true)
  setLlmStatus({ isRunning: true, currentTask: "Analyzing parts list..." })
  
  try {
    const response = await fetch('/api/analyze-parts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ partsList }),
    })

    if (!response.ok) {
      console.warn(`Parts analysis failed: ${response.status} ${response.statusText}`)
      // エラーログを出力するが処理は継続
      return
    }

    const data = await response.json()
    
    console.log('📊 AI Analysis Response:', {
      pbsStructure: data.pbsStructure?.length || 0,
      partOrders: data.partOrders?.length || 0,
      systemConnections: data.systemConnections?.length || 0,
      nodeLayout: data.nodeLayout?.length || 0
    })
    
    // PBS is now auto-generated from canvas nodes - no manual update needed

    // 部品データを処理してcanvasNodesに追加
    let capturedComponentInstances: any[] = []
    if (data.partOrders && data.partOrders.length > 0) {
      capturedComponentInstances = await processPartOrders(
        data.partOrders,
        setCanvasNodes,
        nodes
      )
    }

    // AI生成接続を処理
    if (data.systemConnections && data.systemConnections.length > 0) {
      await processSystemConnections(
        data.systemConnections,
        capturedComponentInstances,
        setConnections,
        setFailedConnections,
        setCanvasNodes
      )
    }

    // PBS is now auto-generated from canvas nodes - no manual processing needed

    // 分析完了メッセージをチャットに追加
    addAnalysisCompletionMessage(
      data.partOrders?.length || 0,
      capturedComponentInstances.length,
      setChatMessages
    )

    // プロジェクトデータ保存
    await saveProjectDataAfterAnalysis(
      connections,
      currentProject,
      nodes,
      [],
      chatMessages,
      isSaving,
      setIsSaving
    )

  } catch (error) {
    handleAnalysisError(error, setChatMessages)
  } finally {
    setIsAnalyzing(false)
    setLlmStatus({ isRunning: false, currentTask: "" })
  }
}

// PBS is now auto-generated from canvas nodes - updatePBSStructure function deprecated

// 部品データ処理
async function processPartOrders(
  partOrders: AnalysisPartOrder[],
  setCanvasNodes: any,
  nodes: any[]
): Promise<any[]> {
  console.log('📦 Processing part orders:', partOrders.length)
  
  const componentInstances: any[] = []
  
  partOrders.forEach((part, index) => {
    const quantity = part.quantity || 1
    console.log(`📦 Processing part: ${part.partName} (quantity: ${quantity})`)
    
    // 部品ごとに複数インスタンスを生成
    for (let i = 0; i < quantity; i++) {
      const basePartId = `${part.partName.replace(/[^a-zA-Z0-9]/g, '')}-${part.modelNumber || 'default'}`
      
      // インスタンス名生成
      let instanceName: string
      if (quantity === 1) {
        instanceName = part.partName
      } else {
        const existingTitles = [...nodes, ...componentInstances].map(c => c.title || c.instanceName)
        instanceName = generateInstanceName(part.partName, existingTitles)
      }
      
      const componentInstance = {
        id: `ai-comp-${Date.now()}-${index}-${i}-${Math.random().toString(36).substr(2, 9)}`,
        title: instanceName,
        instanceName: instanceName,
        modelNumber: part.modelNumber,
        voltage: part.voltage,
        communication: part.communication,
        description: part.description,
        purchaseSiteLink: part.purchaseSiteLink || '',
        basePartId: basePartId,
        category: part.category || 'Uncategorized'
      }
      
      componentInstances.push(componentInstance)
      console.log(`✅ Created instance ${i + 1}/${quantity}: ${instanceName}`)
    }
  })
  
  // Calculate optimized layout with category grouping
  const layoutPositions = calculateComponentLayout(
    componentInstances,
    {
      horizontalGap: 200,
      verticalGap: 30,
      categoryGap: 300
      // No maxWidth - allow unlimited horizontal expansion per category
    }
  )
  
  // システムダイアグラム（キャンバス）に複数インスタンスを追加
  setCanvasNodes((prevNodes: any[]) => {
    const updatedNodes = [...prevNodes]
    
    componentInstances.forEach((instance, index) => {
      // 既存のノードとタイトルベースで重複チェック
      const existingNode = updatedNodes.find(node => 
        node.data?.title === instance.title ||
        (node.basePartId === instance.basePartId && node.instanceName === instance.title)
      )
      
      if (!existingNode) {
        // Get calculated position
        const position = layoutPositions.get(instance.id) || { x: 100, y: 100 }
        
        // 新しいノードを作成
        const newCanvasNode = {
          id: instance.id,
          title: instance.title,
          x: position.x,
          y: position.y,
          type: 'primary' as const,
          inputs: 1,
          outputs: 1,
          basePartId: instance.basePartId,
          instanceName: instance.title,
          // 発注リスト用の必須フィールド追加
          modelNumber: instance.modelNumber,
          orderStatus: 'Unordered' as const,
          estimatedOrderDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          purchaseSiteLink: instance.purchaseSiteLink || '',
          quantity: 1,
          description: instance.description || `AI analyzed: ${instance.title}`,
          voltage: instance.voltage,
          communication: instance.communication,
          category: instance.category
        }
        updatedNodes.push(newCanvasNode)
        console.log('✅ Adding new canvas node:', newCanvasNode.title)
      } else {
        console.log('📌 Preserving existing canvas node:', existingNode.title)
        // 既存ノードの情報を更新（IDは保持）
        existingNode.modelNumber = instance.modelNumber
        existingNode.voltage = instance.voltage
        existingNode.communication = instance.communication
        existingNode.basePartId = instance.basePartId
        // 発注リスト用フィールドを更新（既存値を保持）
        if (!existingNode.orderStatus) existingNode.orderStatus = 'Unordered'
        if (!existingNode.estimatedOrderDate) existingNode.estimatedOrderDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        if (!existingNode.purchaseSiteLink) existingNode.purchaseSiteLink = instance.purchaseSiteLink || ''
        if (!existingNode.quantity) existingNode.quantity = 1
        if (!existingNode.description) existingNode.description = instance.description || `Updated: ${instance.title}`
      }
    })
    
    return updatedNodes
  })
  
  return componentInstances
}

// PBS is now auto-generated from canvas nodes - handlePBSAutoGeneration function deprecated

// 分析完了メッセージ追加
function addAnalysisCompletionMessage(
  partsCount: number,
  instancesCount: number,
  setChatMessages: any
) {
  const analysisMessage = {
    id: Date.now().toString(),
    role: "assistant" as const,
    content: `Parts list analysis completed. PBS and order list on the left have been updated.\nAnalyzed parts: ${partsCount}\nGenerated component instances: ${instancesCount}\nMultiple instances automatically created for quantity-based parts.`,
    timestamp: new Date().toISOString(),
  }
  
  setChatMessages((prev: any[]) => {
    // 同一内容のメッセージが既に存在するかチェック
    const hasSimilar = prev.some((msg: any) => 
      msg.content.includes('Parts list analysis completed') && 
      Date.now() - new Date(msg.timestamp).getTime() < 5000
    )
    if (hasSimilar) return prev
    return [...prev, analysisMessage]
  })
}

// プロジェクトデータ保存
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
    console.log('🔄 Saving project data after AI analysis including connections...')
    console.log('Current connections count:', connections.length)
    
    // 接続の有効性をチェック
    const invalidConnections = connections.filter((conn: any) => 
      !nodes.some(node => node.id === conn.fromId) ||
      !nodes.some(node => node.id === conn.toId)
    )
    if (invalidConnections.length > 0) {
      console.warn('⚠️ Invalid connections found:', invalidConnections)
    }
    
    saveProjectData(
      connections,
      currentProject,
      nodes,
      pbsData,
      chatMessages,
      isSaving,
      setIsSaving
    ).catch(error => {
      console.error('Failed to save project data after AI analysis:', error)
    })
  }, 500)
}

// エラーハンドリング
function handleAnalysisError(error: any, setChatMessages: any) {
  console.warn('Parts analysis error (non-critical):', error)
  // エラーをログに出力するが、ユーザーには通知しない（メインチャット機能に影響しないため）
  
  // const errorMessage = {
  //   id: Date.now().toString(),
  //   role: "assistant" as const,
  //   content: "An error occurred during parts list analysis. Please check the list format and try again.",
  //   timestamp: new Date().toISOString(),
  // }
  // setChatMessages((prev: any[]) => [...prev, errorMessage])
}