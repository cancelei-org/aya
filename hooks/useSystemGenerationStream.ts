// Custom hook for streaming system generation
import { useState, useCallback } from 'react'
import { Node } from 'reactflow'
import type { NodeData, Connection } from '@/types'

interface StreamingState {
  status: 'idle' | 'loading' | 'streaming' | 'complete' | 'error'
  stage: string
  message: string
  progress: number
}

interface GenerationResult {
  nodes: Node<NodeData>[]
  connections: Connection[]
  pbsStructure: any[]
  designNotes: any
}

export function useSystemGenerationStream() {
  const [streamingState, setStreamingState] = useState<StreamingState>({
    status: 'idle',
    stage: '',
    message: '',
    progress: 0
  })

  const [result, setResult] = useState<GenerationResult>({
    nodes: [],
    connections: [],
    pbsStructure: [],
    designNotes: {}
  })

  const generateSystemWithStream = useCallback(async (
    requirementsContent: string,
    projectId: string,
    shippingDestination?: any
  ) => {
    setStreamingState({
      status: 'loading',
      stage: 'starting',
      message: '接続を開始しています...',
      progress: 0
    })

    try {
      const response = await fetch('/api/requirements/generate-system-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requirementsContent,
          projectId,
          shippingDestination
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('No response body')
      }

      setStreamingState(prev => ({ ...prev, status: 'streaming' }))

      let buffer = ''
      
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data.trim()) {
              try {
                const message = JSON.parse(data)
                handleStreamMessage(message)
              } catch (e) {
                console.error('Failed to parse SSE message:', e)
              }
            }
          }
        }
      }

      setStreamingState(prev => ({
        ...prev,
        status: 'complete',
        message: '生成完了',
        progress: 100
      }))

    } catch (error) {
      console.error('Stream error:', error)
      setStreamingState({
        status: 'error',
        stage: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        progress: 0
      })
    }
  }, [])

  const handleStreamMessage = useCallback((message: any) => {
    const { type, data } = message

    switch (type) {
      case 'status':
        setStreamingState(prev => ({
          ...prev,
          stage: data.stage,
          message: data.message,
          progress: getProgressByStage(data.stage)
        }))
        break

      case 'parts':
        // Stage 1: 基本的なノードを表示
        const basicNodes = data.parts.map((part: any, index: number) => ({
          id: `part-${index}`,
          type: 'hardwareNode',
          position: {
            x: (index % 4) * 250 + 100,
            y: Math.floor(index / 4) * 200 + 100
          },
          data: {
            label: part.partName,
            modelNumber: part.modelNumber,
            category: part.category,
            voltage: '',
            communication: '',
            // 動的ポートはまだない
            dynamicPorts: null,
            ports: []
          }
        }))
        
        setResult(prev => ({
          ...prev,
          nodes: basicNodes
        }))
        break

      case 'specs':
        // Stage 2-1: 仕様情報を追加
        setResult(prev => ({
          ...prev,
          nodes: prev.nodes.map((node, index) => {
            const spec = data.parts[index]
            if (spec) {
              return {
                ...node,
                data: {
                  ...node.data,
                  voltage: spec.voltage,
                  communication: spec.communication,
                  inputs: spec.inputs,
                  outputs: spec.outputs
                }
              }
            }
            return node
          })
        }))
        break

      case 'ports':
        // 動的ポートを追加して即座に表示！
        console.log('🎯 動的ポートを受信:', data.portCount, '個のポート')
        
        setResult(prev => ({
          ...prev,
          nodes: prev.nodes.map((node, index) => {
            const enhancedPart = data.parts[index]
            if (enhancedPart) {
              return {
                ...node,
                data: {
                  ...node.data,
                  dynamicPorts: enhancedPart.dynamicPorts,
                  ports: enhancedPart.ports || [],
                  specifications: enhancedPart.specifications,
                  detailsFetched: enhancedPart.detailsFetched,
                  price: enhancedPart.price,
                  datasheetUrl: enhancedPart.datasheetUrl
                }
              }
            }
            return node
          })
        }))
        break

      case 'connections':
        // 接続情報を追加
        const connections = data.connections.map((conn: any) => ({
          id: conn.id,
          source: `part-${conn.fromComponent}`,
          target: `part-${conn.toComponent}`,
          sourceHandle: conn.fromPortId,
          targetHandle: conn.toPortId,
          type: 'smoothstep',
          data: {
            connectionType: conn.connectionType,
            protocol: conn.protocol,
            description: conn.description,
            fromPortLabel: conn.fromPortLabel,
            toPortLabel: conn.toPortLabel
          }
        }))
        
        setResult(prev => ({
          ...prev,
          connections
        }))
        break

      case 'layout':
        // レイアウト情報を適用
        if (data.nodeLayout && data.nodeLayout.length > 0) {
          setResult(prev => ({
            ...prev,
            nodes: prev.nodes.map(node => {
              const layout = data.nodeLayout.find((l: any) => 
                l.componentId === node.id
              )
              if (layout) {
                return {
                  ...node,
                  position: { x: layout.x, y: layout.y }
                }
              }
              return node
            }),
            pbsStructure: data.pbsStructure,
            designNotes: data.designNotes
          }))
        }
        break

      case 'complete':
        console.log('✅ システム生成完了:', data.message)
        break

      case 'error':
        console.error('❌ エラー:', data.message)
        break
    }
  }, [])

  const getProgressByStage = (stage: string): number => {
    const stageProgress: Record<string, number> = {
      'starting': 5,
      'stage1': 15,
      'stage2-1': 30,
      'ports': 50,  // 動的ポート生成で50%
      'connections': 70,
      'layout': 90,
      'complete': 100
    }
    return stageProgress[stage] || 0
  }

  return {
    generateSystemWithStream,
    streamingState,
    result
  }
}