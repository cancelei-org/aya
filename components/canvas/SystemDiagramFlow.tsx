'use client';

import React, {
  useCallback,
  useMemo,
  useState,
  forwardRef,
  useImperativeHandle,
  useRef,
} from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Edge,
  Node,
  MarkerType,
  useReactFlow,
  NodeChange,
  EdgeChange,
  Connection as ReactFlowConnection,
  ConnectionLineType,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { SystemNode } from '@/components/nodes/SystemNode';
import { CustomEdge } from '@/components/edges/CustomEdge';
import { SmartEdge } from '@/components/edges/SmartEdge';
import { IntegratedWarningPanel } from '@/components/warnings/IntegratedWarningPanel';
import { Plus, Edit, Trash2, Folder } from 'lucide-react';
import type { NodeData, Connection } from '@/types';
import { edgeTypes as customEdgeTypes } from '@/utils/connections/routing/edgeTypes';

// カスタムノードタイプの定義
const nodeTypes = {
  systemNode: SystemNode, // すべてのノードはSystemNodeで統一（カテゴリも含む）
};

if (process.env.NODE_ENV === 'development') {
  console.log(
    '🔧 SystemDiagramFlow: Node types registered:',
    Object.keys(nodeTypes),
  );
}

// SmartEdgeのラッパーコンポーネント（型の互換性のため）
const SmartEdgeWrapper = (props: any) => {
  return (
    <SmartEdge
      {...props}
      selected={props.selected || false}
      style={props.style || {}}
    />
  );
};

// カスタムエッジタイプの定義（SmartEdgeに統一）
const edgeTypes = {
  ...customEdgeTypes, // インポートしたエッジタイプを先に展開
  default: SmartEdgeWrapper as any, // デフォルトエッジをSmartEdgeに（上書き）
  smartEdge: SmartEdgeWrapper as any, // 明示的な指定用（上書き）
  customEdge: CustomEdge, // 互換性のために残す
};

interface SystemDiagramFlowProps {
  nodes?: Node[];
  edges?: Edge[];
  connections?: Connection[];
  onNodesChange?: (nodes: Node[]) => void;
  onEdgesChange?: (edges: Edge[]) => void;
  onConnect?: (connection: Connection) => void;
  // 🗑️ Phase 2: onFlowStateChange removed - display-only mode
  onAddNode?: (position: { x: number; y: number }) => void;
  onAddCategory?: (position: { x: number; y: number }) => void;
  onDeleteNode?: (nodeId: string) => void;
  onDeleteSelected?: (selectedNodes: Node[], selectedEdges: Edge[]) => void;
  onEditNode?: (nodeId: string) => void;
  // 🆕 座標保存用イベント
  onNodeDragStop?: (nodeId: string, position: { x: number; y: number }) => void;
  onNodeDrag?: (nodeId: string, position: { x: number; y: number }) => void;
  onSelectionChange?: (selectedNodeIds: string[]) => void;
  // 🆕 インライン編集のための追加プロパティ
}

// 🚀 Ref API for accessing internal React Flow state
export interface SystemDiagramFlowRef {
  getInternalNodes: () => Node[];
  setInternalNodes: (nodes: Node[]) => void;
  getInternalEdges: () => Edge[];
  setInternalEdges: (edges: Edge[]) => void;
}

export const SystemDiagramFlow = forwardRef<
  SystemDiagramFlowRef,
  SystemDiagramFlowProps
>(
  (
    {
      nodes = [],
      edges = [],
      connections = [],
      onNodesChange,
      onEdgesChange,
      onConnect,
      // 🗑️ Phase 2: onFlowStateChange removed
      onAddNode,
      onAddCategory,
      onDeleteNode,
      onDeleteSelected,
      onEditNode,
      onNodeDragStop,
      onNodeDrag,
      onSelectionChange,
      // 🆕 インライン編集のための追加props
    },
    ref,
  ) => {
    const [internalNodes, setInternalNodes, onNodesStateChange] =
      useNodesState(nodes);
    const [internalEdges, setInternalEdges, onEdgesStateChange] =
      useEdgesState(edges);
    // Selection mode removed - no longer needed

    // 編集状態は既にflowUtilsで設定済みのため、そのまま使用
    const nodesWithEditingState = internalNodes;

    // 🚀 Lightweight state synchronization - simple hash comparison
    const prevNodesHashRef = useRef<string>('');
    const prevEdgesHashRef = useRef<string>('');

    React.useEffect(() => {
      // Include memberNodes in hash to detect categorization changes
      const nodesHash = nodes
        .map((n) => {
          const memberCount = Array.isArray(n.data?.memberNodes)
            ? n.data.memberNodes.length
            : 0;
          const categoryId = n.data?.categoryId || 'none';
          return `${n.id}:${memberCount}:${categoryId}`;
        })
        .join('|');

      if (prevNodesHashRef.current !== nodesHash && nodes.length > 0) {
        // Simple, immediate node update - no delays
        setInternalNodes([...nodes]);
        prevNodesHashRef.current = nodesHash;

        if (process.env.NODE_ENV === 'development') {
          console.log('🔄 SystemDiagramFlow: Nodes updated', nodes.length);
        }
      }
    }, [nodes, setInternalNodes]);

    React.useEffect(() => {
      // 🛡️ Use all edges - SmartEdge handles all connection types
      // Create stable hash from edges to prevent unnecessary updates
      const edgesHash = edges
        .map((e) => `${e.id}:${e.source}:${e.target}`)
        .join('|');

      if (prevEdgesHashRef.current !== edgesHash) {
        console.log(
          '🔗 [SystemDiagramFlow] Setting edges:',
          edges.length,
          'edges',
        );
        setInternalEdges(edges);
        prevEdgesHashRef.current = edgesHash;
      }
    }, [edges, setInternalEdges]);

    // No cleanup needed for simplified approach

    // 🗑️ Phase 2: onFlowStateChange removed - no longer needed in display-only mode

    // 🚀 Ref API implementation
    useImperativeHandle(
      ref,
      () => ({
        getInternalNodes: () => internalNodes,
        setInternalNodes: (nodes: Node[]) => setInternalNodes(nodes),
        getInternalEdges: () => internalEdges,
        setInternalEdges: (edges: Edge[]) => setInternalEdges(edges),
      }),
      [internalNodes, internalEdges, setInternalNodes, setInternalEdges],
    );

    const [contextMenu, setContextMenu] = useState<{
      show: boolean;
      x: number;
      y: number;
      nodeId?: string;
    }>({ show: false, x: 0, y: 0 });

    // ノード変更時のコールバック（最適化）
    const handleNodesChange = useCallback(
      (changes: NodeChange[]) => {
        // ✅ React Flow公式推奨: 内部状態を必ず最初に更新
        onNodesStateChange(changes);

        // 親にコールバックを呼ぶ（現在の状態を使用）
        if (onNodesChange) {
          // useEffectで遅延実行して、レンダリング中の更新を避ける
          setTimeout(() => {
            onNodesChange(internalNodes);
          }, 0);
        }
      },
      [onNodesStateChange, onNodesChange, internalNodes],
    );

    // エッジ変更時のコールバック（最適化）
    const handleEdgesChange = useCallback(
      (changes: EdgeChange[]) => {
        if (process.env.NODE_ENV === 'development') {
          console.log('Edge changes in SystemDiagramFlow:', changes);
        }
        onEdgesStateChange(changes);

        // エッジの削除を検出して親に通知
        const deleteChanges = changes.filter(
          (change: EdgeChange) => change.type === 'remove',
        );
        if (deleteChanges.length > 0) {
          console.log('Detected edge deletion:', deleteChanges);
        }

        if (onEdgesChange) {
          // useEffectで遅延実行して、レンダリング中の更新を避ける
          setTimeout(() => {
            onEdgesChange(internalEdges);
          }, 0);
        }
      },
      [onEdgesStateChange, onEdgesChange, internalEdges],
    );

    // 新しい接続時のコールバック
    const handleConnect = useCallback(
      (params: ReactFlowConnection) => {
        console.log('🔗 [SystemDiagramFlow] handleConnect called:', {
          source: params.source,
          sourceHandle: params.sourceHandle,
          target: params.target,
          targetHandle: params.targetHandle,
        });

        // source と target が null の場合は早期リターン
        if (!params.source || !params.target) {
          console.warn('⚠️ Invalid connection: source or target is null');
          return;
        }

        const newEdge: Edge = {
          id: `edge-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
          source: params.source,
          target: params.target,
          sourceHandle: params.sourceHandle || undefined,
          targetHandle: params.targetHandle || undefined,
          type: 'smartEdge', // SmartEdgeを使用
          animated: false,
          data: {
            fromPort: params.sourceHandle,
            toPort: params.targetHandle,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 20,
            height: 20,
            color: '#6b7280',
          },
        };

        console.log('🔗 [SystemDiagramFlow] Creating edge:', newEdge);

        setInternalEdges((eds) => addEdge(newEdge, eds));

        console.log('🔗 [SystemDiagramFlow] Calling parent onConnect...');
        // カスタムConnection型に変換してから親に渡す
        if (onConnect && params.source && params.target) {
          const customConnection: Connection = {
            id: `conn-${Date.now()}`,
            fromId: params.source,
            toId: params.target,
            fromPort: params.sourceHandle || '',
            toPort: params.targetHandle || '',
            source: params.source,
            target: params.target,
            sourceHandle: params.sourceHandle || undefined,
            targetHandle: params.targetHandle || undefined,
          };
          onConnect(customConnection);
        }
      },
      [setInternalEdges, onConnect],
    );

    // コンテキストメニューハンドラー
    const handlePaneContextMenu = useCallback(
      (event: React.MouseEvent | MouseEvent) => {
        event.preventDefault();

        // 画面の絶対座標を使用
        setContextMenu({
          show: true,
          x: event.clientX,
          y: event.clientY,
        });
      },
      [],
    );

    const handleNodeContextMenu = useCallback(
      (event: React.MouseEvent, node: Node) => {
        event.preventDefault();
        event.stopPropagation();

        // 画面の絶対座標を使用（ノードの近くに表示）
        setContextMenu({
          show: true,
          x: event.clientX,
          y: event.clientY,
          nodeId: node.id,
        });
      },
      [],
    );

    const hideContextMenu = useCallback(() => {
      setContextMenu({ show: false, x: 0, y: 0 });
    }, []);

    // React Flow インスタンスを取得
    const reactFlowInstance = useReactFlow();

    const handleAddNode = useCallback(() => {
      if (onAddNode && reactFlowInstance) {
        // 画面座標をFlow座標に変換
        const position = reactFlowInstance.screenToFlowPosition({
          x: contextMenu.x,
          y: contextMenu.y,
        });
        onAddNode(position);
      }
      hideContextMenu();
    }, [
      contextMenu.x,
      contextMenu.y,
      onAddNode,
      hideContextMenu,
      reactFlowInstance,
    ]);

    const handleAddCategory = useCallback(() => {
      if (reactFlowInstance) {
        // 画面座標をFlow座標に変換
        const position = reactFlowInstance.screenToFlowPosition({
          x: contextMenu.x,
          y: contextMenu.y,
        });

        // 🆕 空間的カテゴリノードを直接作成
        const newCategoryNode = {
          id: `category-${Date.now()}`,
          type: 'systemNode', // SystemNodeで統一
          position,
          data: {
            title: 'new Category',
            nodeType: 'category',
            type: 'secondary', // 既存のカテゴリスタイルとの互換性
            bounds: {
              x: position.x,
              y: position.y,
              width: 300,
              height: 200,
            },
            isResizable: true,
            memberNodes: [],
            inputs: 0,
            outputs: 0,
          },
        };

        // ノードリストに追加
        setInternalNodes((nodes) => [...nodes, newCategoryNode]);

        // 従来のonAddCategoryも呼び出し（互換性維持）
        if (onAddCategory) {
          onAddCategory(position);
        }
      }
      hideContextMenu();
    }, [
      contextMenu.x,
      contextMenu.y,
      onAddCategory,
      hideContextMenu,
      reactFlowInstance,
      setInternalNodes,
    ]);

    const handleDeleteNode = useCallback(() => {
      if (contextMenu.nodeId && onDeleteNode) {
        onDeleteNode(contextMenu.nodeId);
      }
      hideContextMenu();
    }, [contextMenu.nodeId, onDeleteNode, hideContextMenu]);

    // 選択削除ハンドラー
    const handleDeleteSelected = useCallback(() => {
      const selectedNodes = internalNodes.filter((node) => node.selected);
      const selectedEdges = internalEdges.filter((edge) => edge.selected);

      if (selectedNodes.length === 0 && selectedEdges.length === 0) {
        alert('Select the items you want to delete.');
        return;
      }

      const itemCount = selectedNodes.length + selectedEdges.length;
      const confirmed = confirm(
        `Do you want to delete Selected${itemCount}items？`,
      );

      if (confirmed && onDeleteSelected) {
        onDeleteSelected(selectedNodes, selectedEdges);
      }
    }, [internalNodes, internalEdges, onDeleteSelected]);

    // エッジクリック削除ハンドラー
    const handleEdgeClick = useCallback(
      (event: React.MouseEvent, edge: Edge) => {
        event.stopPropagation();

        const confirmed = confirm('Delete this connection?');
        if (confirmed) {
          // エッジを直接削除
          setInternalEdges((edges) => edges.filter((e) => e.id !== edge.id));

          // 親コンポーネントにも通知（データ同期のため）
          setTimeout(() => {
            if (
              edge.data?.onDelete &&
              typeof edge.data.onDelete === 'function'
            ) {
              edge.data.onDelete();
            }
          }, 0);
        }
      },
      [setInternalEdges],
    );

    // キーボードショートカット（Delete/Backspace）
    React.useEffect(() => {
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Delete' || event.key === 'Backspace') {
          // フォーカスされた要素がテキスト入力系でないかチェック
          const activeElement = document.activeElement;
          const isTextInput =
            activeElement &&
            (activeElement.tagName === 'INPUT' ||
              activeElement.tagName === 'TEXTAREA' ||
              (activeElement as HTMLElement).contentEditable === 'true' ||
              activeElement.getAttribute('role') === 'textbox');

          // テキスト入力中でない場合のみ削除を実行
          if (!isTextInput) {
            // ノードまたはエッジが選択されているかチェック
            const hasSelection =
              internalNodes.some((node) => node.selected) ||
              internalEdges.some((edge) => edge.selected);

            if (hasSelection) {
              event.preventDefault();
              handleDeleteSelected();
            }
          }
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleDeleteSelected, internalNodes, internalEdges]);

    // プロアクティブなエッジ更新

    // Node<NodeData>型への変換（UnconnectedPartsWarning用）- メモ化を最適化
    const nodeDataComponents = useMemo(() => {
      // nodes配列の参照が変わった時のみ再計算
      return nodes.map((node) => ({
        ...node,
        data: node.data as NodeData,
      }));
    }, [nodes]);

    // onSelectionChangeハンドラーを事前にメモ化
    const handleSelectionChange = useCallback(
      (params: { nodes: Node[] }) => {
        const selectedNodeIds = params.nodes.map((node) => node.id);
        console.log('🎯 React Flow selection changed:', selectedNodeIds);
        if (onSelectionChange) {
          onSelectionChange(selectedNodeIds);
        }
      },
      [onSelectionChange],
    );

    return (
      <div
        className="w-full h-full bg-blue-50 relative"
        onClick={hideContextMenu}
      >
        {/* 統合警告表示パネル */}
        <div className="absolute top-4 left-4 z-20 max-w-md">
          <IntegratedWarningPanel
            connections={connections}
            components={nodeDataComponents}
            enableAutoFix={true}
            showUserFriendlyMessages={true}
            onFixConnection={(connectionId, suggestion) => {
              console.log(
                `Connection fix applied: ${connectionId}`,
                suggestion,
              );
              // TODO: 接続修正の自動適用機能を実装
            }}
            onRecommendConnection={(componentId, recommendations) => {
              console.log(
                `Connection recommendation applied: ${componentId}`,
                recommendations,
              );
              // TODO: 推奨接続の自動適用機能を実装
            }}
            onRecommendSolution={(connectionId, recommendation) => {
              console.log(`Solution applied: ${connectionId}`, recommendation);
              // TODO: 解決策の自動適用機能を実装
            }}
          />
        </div>

        {/* カスタム矢印マーカーを定義 */}
        <svg style={{ position: 'absolute', width: 0, height: 0 }}>
          <defs>
            <marker
              id="arrowclosed"
              markerWidth="20"
              markerHeight="20"
              refX="19"
              refY="3"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <polygon points="0,0 0,6 6,3" fill="#6b7280" stroke="#6b7280" />
            </marker>
            <marker
              id="arrowclosed-red"
              markerWidth="20"
              markerHeight="20"
              refX="19"
              refY="3"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <polygon points="0,0 0,6 6,3" fill="#ef4444" stroke="#ef4444" />
            </marker>
          </defs>
        </svg>

        <ReactFlow
          nodes={nodesWithEditingState}
          edges={internalEdges}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={handleConnect}
          onEdgeClick={handleEdgeClick}
          onPaneContextMenu={handlePaneContextMenu}
          onNodeContextMenu={handleNodeContextMenu}
          onSelectionChange={handleSelectionChange}
          onNodeDrag={(_, node) => {
            // Simple drag handling - no initialization checks needed
            if (onNodeDrag && node.position) {
              onNodeDrag(node.id, node.position);
            }
          }}
          onNodeDragStop={(_, node) => {
            // Simple drag stop handling
            if (onNodeDragStop && node.position) {
              onNodeDragStop(node.id, node.position);
            }
          }}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          connectionLineType={ConnectionLineType.SmoothStep}
          fitView={false}
          defaultViewport={{ x: 0, y: 0, zoom: 0.7 }}
          className="bg-blue-50"
          multiSelectionKeyCode="Control"
          selectionKeyCode="Shift"
          deleteKeyCode="Delete"
          selectNodesOnDrag={false}
          nodesDraggable={true}
          minZoom={0.1}
          maxZoom={4}
          onlyRenderVisibleElements={true}
          elevateNodesOnSelect={false}
          nodeOrigin={[0, 0]} // Changed to top-left origin for easier layout calculation
          snapToGrid={false}
          snapGrid={[10, 10]}
          attributionPosition="bottom-left"
          onInit={() => {
            // Simple initialization - no delays needed
            if (process.env.NODE_ENV === 'development') {
              console.log('🚀 SystemDiagramFlow: React Flow initialized');
            }
          }}
        >
          {/* Conditionally render Background for better performance */}
          {internalNodes.length < 50 && (
            <Background
              variant={BackgroundVariant.Dots}
              gap={20}
              size={1}
              color="#3b82f6"
            />
          )}
          <Controls
            position="top-left"
            className="bg-white border border-gray-300 rounded-lg shadow-sm"
          />

          {/* Only show MiniMap when there are many nodes */}
          {internalNodes.length > 10 && internalNodes.length < 100 && (
            <MiniMap
              position="top-right"
              className="bg-white border border-gray-300 rounded-lg shadow-sm"
              nodeColor="#e5e7eb"
              maskColor="rgba(0, 0, 0, 0.1)"
            />
          )}
        </ReactFlow>

        {/* コンテキストメニュー */}
        {contextMenu.show && (
          <div
            className="fixed bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[160px] py-1"
            style={{
              left: contextMenu.x,
              top: contextMenu.y,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {contextMenu.nodeId ? (
              // ノード用メニュー
              <>
                <button
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                  onClick={() => {
                    if (contextMenu.nodeId && onEditNode) {
                      onEditNode(contextMenu.nodeId);
                    }
                    hideContextMenu();
                  }}
                >
                  <Edit className="h-4 w-4" />
                  Edit Node
                </button>
                <div className="border-t border-gray-100 my-1"></div>
                <button
                  className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
                  onClick={handleDeleteNode}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Node
                </button>
              </>
            ) : (
              // キャンバス用メニュー
              <>
                <button
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                  onClick={handleAddNode}
                >
                  <Plus className="h-4 w-4" />
                  Add Node
                </button>
                <button
                  className="w-full px-4 py-2 text-left text-sm hover:bg-blue-50 text-blue-600 flex items-center gap-2"
                  onClick={handleAddCategory}
                >
                  <Folder className="h-4 w-4" />
                  Add Category
                </button>
              </>
            )}
          </div>
        )}
      </div>
    );
  },
);

SystemDiagramFlow.displayName = 'SystemDiagramFlow';
