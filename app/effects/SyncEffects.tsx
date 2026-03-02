"use client"

import { useEffect } from "react"
import type { Session } from 'next-auth'
import type { 
  Connection, 
  ChatMessage, 
  Project,
  HardwareContextStatus,
  NodeData,
  ChatLimit
} from '@/types'
import { Node } from '@xyflow/react'
// 🚀 単一データソース: レガシー同期ユーティリティ削除
import { loadProjectData } from "@/utils/project/projectUtils"

// SyncEffectsのProps型定義（React Flow版）
interface SyncEffectsProps {
  // React Flow データソース
  nodes: Node<NodeData>[]
  connections: Connection[]
  setNodes: (nodes: Node<NodeData>[]) => void
  setConnections: (connections: Connection[]) => void
  
  // セッション初期化用
  session: Session | null
  isDataLoaded: boolean
  setCurrentProject: (project: Project | null) => void
  setChatMessages: (messages: ChatMessage[]) => void
  setIsChatActive: (active: boolean) => void
  setIsDataLoaded: (loaded: boolean) => void
  setChatLimit: (limit: ChatLimit) => void
  
  // ハードウェアコンテキスト用
  currentProject: Project | null
  setHardwareContextStatus: (status: HardwareContextStatus) => void
}

// 副作用処理を管理するカスタムフック
export function useSyncEffects(props: SyncEffectsProps) {
  const {
    // React Flow データソース
    nodes,
    connections,
    setNodes,
    setConnections,
        
    // セッション初期化用
    session,
    isDataLoaded,
    setCurrentProject,
    setChatMessages,
    setIsChatActive,
    setIsDataLoaded,
    setChatLimit,
    
    // ハードウェアコンテキスト用
    currentProject,
    setHardwareContextStatus,
  } = props

  // 🚀 PBS同期は完全に無効化済み（PBS自動生成により不要）
  // この処理は削除済み - 単一データソースアーキテクチャにより同期処理は不要

  // 🔧 共通のデータ変換関数（重複削除）
  const createSetCanvasNodesWrapper = (label: string = '') => {
    return (updaterOrNodes: Node<NodeData>[] | ((prev: Node<NodeData>[]) => Node<NodeData>[])) => {
      console.log(`🔧 setCanvasNodesWrapper ${label} called with:`, typeof updaterOrNodes, Array.isArray(updaterOrNodes) ? updaterOrNodes.length : 'function')
      
      const nodeData: Node<NodeData>[] = typeof updaterOrNodes === 'function' 
        ? updaterOrNodes([])
        : updaterOrNodes
      
      console.log(`🔧 setCanvasNodesWrapper ${label}: Resolved nodeData:`, nodeData.length)
      
      if (Array.isArray(nodeData) && nodeData.length > 0) {
        const flowNodes: Node<NodeData>[] = nodeData.map(nodeItem => ({
          id: nodeItem.id,
          type: 'systemNode' as const,
          position: { 
            x: nodeItem.position?.x || (nodeItem as {x?: number}).x || 0, 
            y: nodeItem.position?.y || (nodeItem as {y?: number}).y || 0 
          },
          data: {
            ...nodeItem.data,
            ...(nodeItem as Record<string, unknown>),
            title: nodeItem.data?.title || (nodeItem as {title?: string}).title || '',
            type: nodeItem.data?.type || (nodeItem as {type?: string}).type || 'primary',
            inputs: nodeItem.data?.inputs || (nodeItem as {inputs?: number}).inputs || 1,
            outputs: nodeItem.data?.outputs || (nodeItem as {outputs?: number}).outputs || 1,
            x: undefined,
            y: undefined,
          }
        }))
        console.log(`🔧 setCanvasNodesWrapper ${label}: Setting`, flowNodes.length, 'flow nodes')
        setNodes(flowNodes)
        console.log(`✅ setCanvasNodesWrapper ${label}: setNodes called successfully`)
      } else {
        console.log(`📋 setCanvasNodesWrapper ${label}: Empty project - no nodes to load`)
      }
    }
  }

  // セッション依存の初期化処理（統合版）
  useEffect(() => {
    if (!session) return
    
    // 1. チャット制限取得（軽量処理）
    fetch('/api/chat/check-limit')
      .then(r => r.json())
      .then(setChatLimit)
      .catch(console.error)
    
    // 2. プロジェクトデータ読み込み（重要処理）
    if (!isDataLoaded) {
      console.log('🔄 Initiating project data load...')
      
      loadProjectData(
        session,
        setCurrentProject,
        createSetCanvasNodesWrapper('(initial)') as (nodes: Node[]) => void,
        setConnections,
        setChatMessages,
        setIsChatActive,
        () => {}, // empty setter function instead of empty array
        setIsDataLoaded
      )
    }
    
    // 3. プロジェクト初期化の再確認（フォールバック）
    const checkProjectInitialization = setTimeout(() => {
      if (!currentProject && session?.user?.email) {
        console.log('🔄 プロジェクトが未設定のため、再度初期化を試行します')
        
        loadProjectData(
          session,
          setCurrentProject,
          createSetCanvasNodesWrapper('(fallback)') as (nodes: Node[]) => void,
          setConnections,
          setChatMessages,
          setIsChatActive,
          () => {}, // empty setter function instead of empty array
          setIsDataLoaded
        )
      }
    }, 3000) // 3秒後に再確認
    
    return () => clearTimeout(checkProjectInitialization)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, isDataLoaded, currentProject])

  // ハードウェアコンテキスト更新（React Flow版）
  useEffect(() => {
    if (currentProject?.id) {
      const updateHardwareContext = async () => {
        try {
          const { extractHardwareContext, generateContextSummary } = await import('@/utils/data/analysis/hardwareContext')
          
          const context = extractHardwareContext(
            nodes,
            connections,
            []  // empty array for additional context - this is correct
          )
          
          const summary = generateContextSummary(context)
          
          setHardwareContextStatus({
            isLoading: false,
            componentCount: nodes.length,
            summary: summary
          })
        } catch (error) {
          console.error('Error updating hardware context:', error)
          setHardwareContextStatus({
            isLoading: false,
            componentCount: nodes.length,
            summary: `${nodes.length} components configured`
          })
        }
      }

      updateHardwareContext()
    } else {
      setHardwareContextStatus({
        isLoading: false,
        componentCount: 0,
        summary: "No hardware components configured"
      })
    }
  }, [currentProject?.id, nodes, connections, setHardwareContextStatus])

  // このコンポーネントは何もレンダリングしない
  return null
}