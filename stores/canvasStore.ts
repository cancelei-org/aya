import { create } from 'zustand'
import { devtools, subscribeWithSelector } from 'zustand/middleware'
import { Node, Edge, Connection as FlowConnection, NodeChange, EdgeChange, applyNodeChanges, applyEdgeChanges } from '@xyflow/react'
import { NodeData, Connection, FailedConnection } from '@/types'

interface CanvasState {
  // Nodes
  nodes: Node<NodeData>[]
  setNodes: (nodes: Node<NodeData>[] | ((prev: Node<NodeData>[]) => Node<NodeData>[])) => void
  onNodesChange: (changes: NodeChange[]) => void
  addNode: (node: Node<NodeData>) => void
  updateNode: (nodeId: string, data: Partial<NodeData>) => void
  deleteNode: (nodeId: string) => void
  
  // Edges
  edges: Edge[]
  setEdges: (edges: Edge[] | ((prev: Edge[]) => Edge[])) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  
  // Connections
  connections: Connection[]
  setConnections: (connections: Connection[] | ((prev: Connection[]) => Connection[])) => void
  addConnection: (connection: Connection) => void
  removeConnection: (connectionId: string) => void
  
  // Failed Connections
  failedConnections: FailedConnection[]
  setFailedConnections: (connections: FailedConnection[]) => void
  
  // Selection
  selectedNode: string | null
  setSelectedNode: (nodeId: string | null) => void
  
  // Deletion tracking
  deletedNodeIds: Set<string>
  setDeletedNodeIds: (ids: Set<string>) => void
  
  // Flow key for force updates
  flowKey: number
  setFlowKey: (key: number) => void
  incrementFlowKey: () => void
  
  // PBS tree
  selectedTreeItem: string | null
  setSelectedTreeItem: (itemId: string | null) => void
  editingItemId: string | null
  setEditingItemId: (itemId: string | null) => void
  editingValue: string
  setEditingValue: (value: string) => void
  expandedSections: Record<string, boolean>
  setExpandedSections: (sections: Record<string, boolean>) => void
}

export const useCanvasStore = create<CanvasState>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      // Nodes
      nodes: [],
      setNodes: (updater) => {
        set((state) => ({
          nodes: typeof updater === 'function' ? updater(state.nodes) : updater
        }))
      },
      onNodesChange: (changes) => {
        set((state) => ({
          nodes: applyNodeChanges(changes, state.nodes)
        }))
      },
      addNode: (node) => {
        set((state) => ({
          nodes: [...state.nodes, node]
        }))
      },
      updateNode: (nodeId, data) => {
        set((state) => ({
          nodes: state.nodes.map(node => 
            node.id === nodeId 
              ? { ...node, data: { ...node.data, ...data } }
              : node
          )
        }))
      },
      deleteNode: (nodeId) => {
        set((state) => ({
          nodes: state.nodes.filter(node => node.id !== nodeId),
          deletedNodeIds: new Set([...state.deletedNodeIds, nodeId])
        }))
      },
      
      // Edges
      edges: [],
      setEdges: (updater) => {
        set((state) => ({
          edges: typeof updater === 'function' ? updater(state.edges) : updater
        }))
      },
      onEdgesChange: (changes) => {
        set((state) => ({
          edges: applyEdgeChanges(changes, state.edges)
        }))
      },
      
      // Connections
      connections: [],
      setConnections: (updater) => {
        set((state) => ({
          connections: typeof updater === 'function' ? updater(state.connections) : updater
        }))
      },
      addConnection: (connection) => {
        set((state) => ({
          connections: [...state.connections, connection]
        }))
      },
      removeConnection: (connectionId) => {
        set((state) => ({
          connections: state.connections.filter(conn => conn.id !== connectionId)
        }))
      },
      
      // Failed Connections
      failedConnections: [],
      setFailedConnections: (connections) => set({ failedConnections: connections }),
      
      // Selection
      selectedNode: null,
      setSelectedNode: (nodeId) => set({ selectedNode: nodeId }),
      
      // Deletion tracking
      deletedNodeIds: new Set(),
      setDeletedNodeIds: (ids) => set({ deletedNodeIds: ids }),
      
      // Flow key
      flowKey: 0,
      setFlowKey: (key) => set({ flowKey: key }),
      incrementFlowKey: () => set((state) => ({ flowKey: state.flowKey + 1 })),
      
      // PBS tree
      selectedTreeItem: null,
      setSelectedTreeItem: (itemId) => set({ selectedTreeItem: itemId }),
      editingItemId: null,
      setEditingItemId: (itemId) => set({ editingItemId: itemId }),
      editingValue: '',
      setEditingValue: (value) => set({ editingValue: value }),
      expandedSections: {},
      setExpandedSections: (sections) => set({ expandedSections: sections }),
    })),
    {
      name: 'canvas-store',
    }
  )
)