'use client';

import React, {
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
  startTransition,
  lazy,
  Suspense,
} from 'react';
// Lazy load heavy SystemDiagramFlow component
const SystemDiagramFlow = lazy(() =>
  import('@/components/canvas/SystemDiagramFlow').then((mod) => ({
    default: mod.SystemDiagramFlow,
  })),
);

// Simple debounce function for tab switching
function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
import type { SystemDiagramFlowRef } from '@/components/canvas/SystemDiagramFlow';
import { PartsManagement } from '@/components/management/PartsManagement';
import { DevLog } from '@/components/monitoring/DevLog';
import {
  addNewNode,
  addNewCategory,
  deleteNode,
  handleDeleteSelected,
} from '@/utils/flow/nodeOperations';
import { deleteConnection } from '@/utils/flow/nodeOperations';
import { saveProjectDataWithConnections } from '@/utils/project/projectUtils';
import { VisualInformationRealtime } from '@/components/visualization/VisualInformationRealtime';
import {
  convertCanvasNodesToFlowNodes,
  convertConnectionsToFlowEdges,
} from '@/utils/flow/flowUtils';
import {
  validateConnection,
  generateConnectionId,
} from '@/utils/connections/validation/connectionValidation';
import { checkPortCompatibility } from '@/utils/connections/validation/portCompatibilityChecker';
import { startNodeEditing } from '@/components/nodes/SystemNode';
import { useSpatialCategorization } from '@/hooks/useSpatialCategorization';
import { performAISearchForNodes } from '@/utils/flow/aiSearchOperations';
import { Badge } from '@/components/ui/badge';
import { Search, Maximize2, X } from 'lucide-react';
import { useStores } from '@/hooks/useStores';
import type { Connection, NodeData, ActiveTab } from '@/types';
import { forceReactFlowUpdate } from '@/utils/flow/flowUtils';

// 型定義は /types/index.ts から import済み

interface MainCanvasProps {
  activeTab: ActiveTab;
  onApprove?: (
    requirementId: string,
    document: {
      contentText?: string;
      content?: string;
      id: string;
    },
  ) => void;
}

export function MainCanvas({ activeTab, onApprove }: MainCanvasProps) {
  console.log('🟢 [MainCanvas] Initialized with onApprove:', typeof onApprove);
  // Get all state from stores
  const {
    nodes,
    connections,
    chatMessages,
    currentProject,
    isProcessing,
    isSaving,
    deletionInProgressRef,
    setNodes: setCanvasNodes,
    setConnections,
    editingItemId,
    editingValue,
    setEditingItemId,
    setEditingValue,
    setIsSaving,
    setIsProcessing,
    setActiveTab,
    softwareContext,
    handleSendMessage,
    flowKey,
  } = useStores();

  // Create debounced tab change handler
  const debouncedSetActiveTab = useMemo(
    () =>
      debounce((tab: ActiveTab) => {
        startTransition(() => {
          setActiveTab(tab);
        });
      }, 100),
    [setActiveTab],
  );
  // 🎯 SystemDiagramFlow参照（位置同期のみ）
  const systemDiagramRef = useRef<SystemDiagramFlowRef>(null);

  // カテゴリサイズ管理の競合を解決するため、専用state削除
  // React Flowの単一ソースを使用

  // 選択されたノードの追跡
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [isAISearching, setIsAISearching] = useState(false);

  // 全画面表示の状態管理
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFullscreenTip, setShowFullscreenTip] = useState(true);

  // 🆕 空間的カテゴリ自動分類
  const { getNodeDragPreview, localCategoryPreview, setLocalCategoryPreview } =
    useSpatialCategorization({
      nodes,
      updateNode: (nodeId: string, newData: Partial<NodeData>) => {
        setCanvasNodes((prev) =>
          prev.map((node) =>
            node.id === nodeId
              ? { ...node, data: { ...node.data, ...newData } }
              : node,
          ),
        );
      },
    });

  // カテゴリ移動時のコールバック（重複防止 + バッチ更新）
  const lastMoveRef = useRef<{
    categoryId: string;
    bounds: string;
    timestamp: number;
  } | null>(null);

  const handleCategoryMove = useCallback(
    (
      categoryId: string,
      newBounds: { x: number; y: number; width: number; height: number },
    ) => {
      // 重複処理防止: 同じカテゴリの同じ位置への移動をスキップ
      const boundsKey = `${newBounds.x},${newBounds.y},${newBounds.width},${newBounds.height}`;
      const now = Date.now();

      if (
        lastMoveRef.current &&
        lastMoveRef.current.categoryId === categoryId &&
        lastMoveRef.current.bounds === boundsKey &&
        now - lastMoveRef.current.timestamp < 50
      ) {
        // 50ms内の重複をスキップ
        return;
      }

      lastMoveRef.current = { categoryId, bounds: boundsKey, timestamp: now };

      // バッチ更新: カテゴリとメンバーの位置を一度に更新
      setCanvasNodes((prev) => {
        return prev.map((node) => {
          // カテゴリノードのbounds更新
          if (node.id === categoryId) {
            return { ...node, data: { ...node.data, bounds: newBounds } };
          }

          // メンバーノードの固定位置更新
          if (
            node.data.categoryId === categoryId &&
            node.data.relativePosition
          ) {
            const newPosition = {
              x: newBounds.x + node.data.relativePosition.x,
              y: newBounds.y + node.data.relativePosition.y,
            };

            return { ...node, position: newPosition };
          }

          return node;
        });
      });
    },
    [setCanvasNodes],
  );

  // カテゴリリサイズ時のコールバック（シンプル化）
  const handleCategoryResize = useCallback(
    (
      categoryId: string,
      newBounds: { width: number; height: number; x?: number; y?: number },
    ) => {
      console.log(`📏 MainCanvas: Category ${categoryId} resized`, {
        newBounds,
      });

      // カテゴリのbounds更新（即座に反映）
      setCanvasNodes((prev) =>
        prev.map((node) => {
          if (node.id === categoryId) {
            // x,yがundefinedの場合は現在の値を使う
            const currentBounds = (node.data as any).bounds || {
              x: 0,
              y: 0,
              width: 200,
              height: 200,
            };
            return {
              ...node,
              data: {
                ...node.data,
                bounds: {
                  x: newBounds.x ?? currentBounds.x,
                  y: newBounds.y ?? currentBounds.y,
                  width: newBounds.width,
                  height: newBounds.height,
                },
              },
            };
          }
          return node;
        }),
      );

      // リサイズ後はメンバーノードの位置は変更しない（固定位置維持）
      // ただし、境界外に出たノードは境界内に調整
      const memberNodes = nodes.filter((n) => n.data.categoryId === categoryId);
      if (memberNodes.length > 0) {
        // setTimeout削除 - 即座に実行してノード消失を防ぐ
        setCanvasNodes((prevNodes) => {
          // カテゴリノードを探して現在のboundsを取得
          const categoryNode = prevNodes.find((n) => n.id === categoryId);
          const currentBounds = (categoryNode?.data as any)?.bounds || {
            x: 0,
            y: 0,
            width: 200,
            height: 200,
          };

          return prevNodes.map((node) => {
            if (
              node.data.categoryId === categoryId &&
              node.data.relativePosition
            ) {
              const { relativePosition } = node.data;

              // 境界チェック
              const isOutOfBounds =
                relativePosition.x < 0 ||
                relativePosition.y < 0 ||
                relativePosition.x + 240 > newBounds.width || // ノード幅240px
                relativePosition.y + 120 > newBounds.height; // ノード高さ120px

              if (isOutOfBounds) {
                // 境界内に調整
                const adjustedRelativePosition = {
                  x: Math.max(
                    0,
                    Math.min(relativePosition.x, newBounds.width - 240),
                  ),
                  y: Math.max(
                    0,
                    Math.min(relativePosition.y, newBounds.height - 120),
                  ),
                };

                const adjustedPosition = {
                  x:
                    (newBounds.x ?? currentBounds.x) +
                    adjustedRelativePosition.x,
                  y:
                    (newBounds.y ?? currentBounds.y) +
                    adjustedRelativePosition.y,
                };

                console.log(
                  `🔧 Adjusting member "${node.data.title}" position due to resize:`,
                  adjustedPosition,
                );

                return {
                  ...node,
                  position: adjustedPosition,
                  data: {
                    ...node.data,
                    relativePosition: adjustedRelativePosition,
                  },
                };
              }
            }
            return node;
          });
        });
      }
    },
    [nodes, setCanvasNodes],
  );

  // 📱 レスポンシブタブサイズ管理（ローカル機能）
  const [tabSize, setTabSize] = useState({
    padding: 'px-3 py-3',
    fontSize: 'text-base',
  });
  const tabContainerRef = useRef<HTMLDivElement>(null);

  // 全画面状態の検出
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F11') {
        // F11が押されたら全画面のtipを非表示にする
        setShowFullscreenTip(false);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('keydown', handleKeyDown);

    // 初期状態をチェック
    setIsFullscreen(!!document.fullscreenElement);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // 📱 タブサイズ動的調整（ローカル機能 - メモ化と競合しないよう独立）
  useEffect(() => {
    const updateTabSize = () => {
      const width = window.innerWidth;

      // iPad detection (768px - 1024px width, touch device)
      const isIPad = width >= 768 && width <= 1024 && 'ontouchstart' in window;

      // Large monitor detection (width > 1440px)
      const isLargeMonitor = width > 1440;

      // Mac/Desktop detection (width > 1024px, no touch)
      const isMacDesktop = width > 1024 && !('ontouchstart' in window);

      if (tabContainerRef.current) {
        const containerWidth = tabContainerRef.current.offsetWidth;
        const tabCount = 4; // Updated from 3 to 4
        const availableWidthPerTab = containerWidth / tabCount;

        if (isIPad) {
          // iPad: very small tabs
          setTabSize({
            padding: 'px-1 py-1',
            fontSize: 'text-xs',
          });
        } else if (isMacDesktop) {
          // Mac/Desktop: very compact tabs
          setTabSize({
            padding: 'px-1 py-1',
            fontSize: availableWidthPerTab < 120 ? 'text-xs' : 'text-sm',
          });
        } else if (isLargeMonitor) {
          // Large monitor: small tabs
          setTabSize({
            padding: 'px-2 py-2',
            fontSize: availableWidthPerTab < 150 ? 'text-xs' : 'text-sm',
          });
        } else {
          // Mobile: minimal tabs
          setTabSize({
            padding: 'px-1 py-1',
            fontSize: 'text-xs',
          });
        }

        // Tab sizing completed
      }
    };

    updateTabSize();
    window.addEventListener('resize', updateTabSize);

    return () => window.removeEventListener('resize', updateTabSize);
  }, []); // 🎯 依存配列を空にしてメモ化と競合回避

  // Approval/rejection handlers - legacy code removed

  // 🎯 変換処理をメモ化（安定した依存関係のみ）- リモート機能 + 🆕 仮承認状態サポート
  // 🛠️ 根本修正: コールバック関数を完全に安定化（canvasNodes依存を除去）
  // Legacy edit/delete callbacks removed

  // 🆕 ノードタイトル更新関数（PartsManagementパターン：即座反映）
  const handleUpdateNodeTitle = useCallback(
    (nodeId: string, newTitle: string) => {
      setCanvasNodes((prev) =>
        prev.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, title: newTitle } }
            : node,
        ),
      );
    },
    [setCanvasNodes],
  );

  // Legacy editing functions removed
  const handleFinishEditing = useCallback(
    (nodeId: string, newValue: string) => {
      if (editingItemId && newValue.trim()) {
        setCanvasNodes((prev) =>
          prev.map((node) =>
            node.id === editingItemId
              ? { ...node, data: { ...node.data, title: newValue.trim() } }
              : node,
          ),
        );
      }
      setEditingItemId(null);
      setEditingValue('');
    },
    [editingItemId, setCanvasNodes, setEditingItemId, setEditingValue],
  );

  // AI検索ハンドラー（楽観的UI版）
  const handleAISearch = useCallback(async () => {
    // AI検索ハンドラーが呼ばれました
    if (selectedNodeIds.length === 0) {
      // ノードが選択されていない
      return;
    }

    setIsAISearching(true);

    // 楽観的UI: 即座に検索中状態を表示
    setCanvasNodes((prev) =>
      prev.map((node) => {
        if (selectedNodeIds.includes(node.id)) {
          return {
            ...node,
            data: {
              ...node.data,
              isSearching: true,
              searchStartTime: Date.now(),
            },
          };
        }
        return node;
      }),
    );

    try {
      const selectedNodes = nodes.filter((node) =>
        selectedNodeIds.includes(node.id),
      );
      // AI検索用に選択されたノード
      const result = await performAISearchForNodes(
        selectedNodes,
        setCanvasNodes,
      );

      if (result.success) {
        // AI検索完了
        // React Flow の更新を強制
        forceReactFlowUpdate(setCanvasNodes);
      } else {
        // エラーログは保持（本番環境で必要）
        console.error('AI検索エラー:', result.errors);
      }
    } catch (error) {
      // エラーログは保持（本番環境で必要）
      console.error('AI検索エラー:', error);
      // エラー時は検索中状態を解除
      setCanvasNodes((prev) =>
        prev.map((node) => {
          if (selectedNodeIds.includes(node.id)) {
            return {
              ...node,
              data: {
                ...node.data,
                isSearching: false,
                searchError: true,
              },
            };
          }
          return node;
        }),
      );
    } finally {
      setIsAISearching(false);
    }
  }, [selectedNodeIds, nodes, setCanvasNodes]);

  // React Flowからの選択通知を処理
  const handleSelectionChange = useCallback((nodeIds: string[]) => {
    setSelectedNodeIds((prev) => {
      // 配列の内容が同じなら更新しない（無限ループ防止）
      const isSame =
        prev.length === nodeIds.length &&
        prev.every((id) => nodeIds.includes(id));
      if (isSame) {
        return prev;
      }
      // React Flowからの選択変更通知
      return nodeIds;
    });
  }, []);

  // React Flow用のノード変換（カテゴリコールバックとflowUtils変換を統合 + 楽観的UI対応）
  // Lightweight hash computation for node changes
  const nodesHash = useMemo(() => {
    // Create a lightweight hash from critical node properties
    return (
      nodes.length +
      ':' +
      nodes
        .map(
          (n) =>
            `${n.id}:${n.data?.title}:${n.position?.x}:${n.position?.y}:${n.data?._lastUpdate || 0}`,
        )
        .join('|')
    );
  }, [nodes]);

  const flowNodes = useMemo(() => {
    // まずカテゴリコールバックを注入
    const nodesWithCallbacks = nodes.map((node) => {
      const baseCallbacks = {
        onUpdateNodeTitle: handleUpdateNodeTitle, // 全ノード共通のタイトル編集機能
      };

      if (node.data?.nodeType === 'category') {
        return {
          ...node,
          data: {
            ...node.data,
            ...baseCallbacks,
            onCategoryMove: handleCategoryMove,
            onCategoryResize: handleCategoryResize,
          },
        };
      }

      return {
        ...node,
        data: {
          ...node.data,
          ...baseCallbacks,
        },
      };
    });

    // 次にReact Flow用に変換（楽観的UI対応）
    return convertCanvasNodesToFlowNodes(
      nodesWithCallbacks,
      (nodeId) => startNodeEditing(nodeId),
      (nodeId) =>
        deleteNode(
          nodeId,
          currentProject,
          nodesWithCallbacks,
          connections,
          setCanvasNodes,
          setConnections,
        ),
      undefined, // onApprove
      undefined, // onReject
      editingItemId,
      editingValue,
      setEditingItemId,
      setEditingValue,
      handleFinishEditing,
      (nodeId) => startNodeEditing(nodeId),
      handleUpdateNodeTitle,
      handleCategoryResize,
      localCategoryPreview,
      false, // 通常は強制更新はfalse
    );
  }, [
    // Use lightweight hash instead of heavy JSON.stringify
    nodesHash,
    handleCategoryMove,
    handleCategoryResize,
    handleUpdateNodeTitle,
    handleFinishEditing,
    currentProject,
    connections,
    setCanvasNodes,
    setConnections,
    editingItemId,
    editingValue,
    setEditingItemId,
    setEditingValue,
    localCategoryPreview, // ローカルカテゴリプレビューも監視
  ]);

  // console.log('🎯 memoizedNodes result:', memoizedNodes.length)

  const memoizedEdges = useMemo(() => {
    // 🛡️ Filter out invalid connections before processing
    const validConnections = connections.filter((conn) => {
      const sourceExists = nodes.some((n) => n.id === conn.fromId);
      const targetExists = nodes.some((n) => n.id === conn.toId);
      return (
        sourceExists && targetExists && conn.id && conn.fromId && conn.toId
      );
    });

    // 🚀 Auto-cleanup: Remove invalid connections from state if found
    if (validConnections.length !== connections.length) {
      const removedConnections = connections.filter(
        (conn) => !validConnections.includes(conn),
      );
      if (process.env.NODE_ENV === 'development') {
        console.log(
          `🧹 Auto-cleanup: Removing ${connections.length - validConnections.length} invalid connections:`,
          removedConnections.map((c) => c.id),
        );

        // 🔧 Auto-trigger database cleanup if problematic edges are found
        const problematicEdges = removedConnections.filter(
          (conn) => conn.id === 'conn-1753052821622-r40skt9nx',
        );
        if (problematicEdges.length > 0) {
          console.log(
            '🔧 Detected problematic edges, triggering database cleanup...',
          );
          fetch('/api/debug/clean-connections-data', { method: 'POST' })
            .then((res) => res.json())
            .then((result) => {
              console.log('✅ Database cleanup completed:', result);
            })
            .catch((error) => {
              console.error('❌ Database cleanup failed:', error);
            });
        }
      }
      setTimeout(() => setConnections(validConnections), 0);
    }

    const edges = convertConnectionsToFlowEdges(
      validConnections,
      (connectionId: string) =>
        deleteConnection(
          connectionId,
          connections,
          deletionInProgressRef,
          isSaving,
          setConnections,
          setIsSaving,
          currentProject,
          nodes,
          chatMessages,
        ),
    );

    return edges;
  }, [
    connections.length,
    connections.map((c) => c.id).join('|'),
    nodes.length,
  ]); // Stable size dependencies

  // console.log('🎯 MainCanvas: nodes.length =', nodes.length) // 削除して再レンダリング減らす

  return (
    <div className="flex-1 relative overflow-hidden bg-white h-full flex flex-col">
      {/* Tab Navigation - レスポンシブサイズ適用 */}
      <div className="bg-white border-b">
        <div className="flex" ref={tabContainerRef}>
          <button
            className={`${tabSize.padding} ${tabSize.fontSize} font-medium border-b-2 flex-1 truncate ${
              activeTab === 'devlog'
                ? 'border-[#00AEEF] text-[#00AEEF] bg-[#00AEEF]/5'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
            onClick={() => debouncedSetActiveTab('devlog')}
          >
            {/* Auto DevLog */}① Define requirements
          </button>
          <button
            className={`${tabSize.padding} ${tabSize.fontSize} font-medium border-b-2 flex-1 truncate ${
              activeTab === 'system'
                ? 'border-[#00AEEF] text-[#00AEEF] bg-[#00AEEF]/5'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
            onClick={() => debouncedSetActiveTab('system')}
          >
            ② Design system
          </button>
          <button
            className={`${tabSize.padding} ${tabSize.fontSize} font-medium border-b-2 flex-1 truncate ${
              activeTab === 'parts'
                ? 'border-[#00AEEF] text-[#00AEEF] bg-[#00AEEF]/5'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
            onClick={() => debouncedSetActiveTab('parts')}
          >
            ③ Buy parts
          </button>
          {/* LLM機能が機能するようになったら復活させる予定 */}
          {/* <button
            className={`${tabSize.padding} ${tabSize.fontSize} font-medium border-b-2 flex-1 truncate ${
              activeTab === 'visual'
                ? 'border-[#00AEEF] text-[#00AEEF] bg-[#00AEEF]/5'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
            onClick={() => startTransition(() => setActiveTab('visual'))}
          >
            Hardware Debug Support
          </button> */}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'system' && (
        <div className="flex flex-col h-full overflow-hidden">
          {/* Flow Toolbar */}
          <div className="bg-white border-b px-4 py-2 flex gap-2 items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-4 flex-1">
              <div className="text-xs text-gray-500">
                {/* <span className="font-medium">Controls:</span> */}
                <span className="ml-2">click to remove connection</span>
                <span className="mx-2">•</span>
                <span>Drag handles to connect</span>
                <span className="mx-2">•</span>
                <span>Right-click for menu</span>
                <span className="mx-2">•</span>

                <span className="text-blue-600">
                  Selected: {selectedNodeIds.length}
                </span>
              </div>

              {/* 全画面表示推奨 */}
              {!isFullscreen && showFullscreenTip && (
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-md text-blue-700 text-xs">
                  <Maximize2 className="w-3 h-3" />
                  <span className="font-medium">
                    Press F11 for fullscreen experience
                  </span>
                  <button
                    onClick={() => setShowFullscreenTip(false)}
                    className="ml-1 text-blue-500 hover:text-blue-700"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            {/* AI Search Button */}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                // AI検索ボタンがクリックされました
                // ボタンの無効状態を確認
                // AI検索中フラグ
                // 選択されたノードID
                handleAISearch();
              }}
              disabled={isAISearching || selectedNodeIds.length === 0}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md border ${
                isAISearching
                  ? 'bg-orange-500 text-white border-orange-600 cursor-not-allowed shadow-md animate-pulse'
                  : selectedNodeIds.length === 0
                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                    : 'bg-blue-500 text-white border-blue-600 hover:bg-blue-600 cursor-pointer shadow-sm'
              }`}
            >
              <Search className="w-4 h-4" />
              {isAISearching ? (
                <>
                  <span className="animate-pulse">Searching...</span>
                </>
              ) : (
                <>
                  Search Specifications
                  {selectedNodeIds.length > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {selectedNodeIds.length}
                    </Badge>
                  )}
                </>
              )}
            </button>
          </div>

          <div
            className="flex-1 relative bg-blue-100 overflow-auto"
            style={{ width: '100%', height: 'calc(100% - 48px)' }}
          >
            <Suspense
              fallback={
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading system diagram...</p>
                  </div>
                </div>
              }
            >
              <SystemDiagramFlow
                key={flowKey || 0}
                ref={systemDiagramRef}
                nodes={flowNodes}
                edges={memoizedEdges}
                connections={connections}
                onSelectionChange={handleSelectionChange}
                onNodeDrag={(nodeId, position) => {
                  // 1. 即座にローカルプレビュー更新
                  const dragPreview = getNodeDragPreview(nodeId, position);
                  if (setLocalCategoryPreview) {
                    setLocalCategoryPreview((prev) => ({
                      ...prev,
                      [nodeId]: dragPreview.categoryId,
                    }));
                  }
                }}
                onNodeDragStop={(nodeId, position) => {
                  // ドラッグ終了時の楽観的UI更新
                  setCanvasNodes((prev) => {
                    // まず位置を更新
                    let updatedNodes = prev.map((n) =>
                      n.id === nodeId ? { ...n, position } : n,
                    );

                    // ドラッグしたノードを取得
                    const draggedNode = updatedNodes.find(
                      (n) => n.id === nodeId,
                    );
                    if (
                      !draggedNode ||
                      draggedNode.data?.nodeType === 'category'
                    ) {
                      return updatedNodes;
                    }

                    // カテゴリノードを取得
                    const categoryNodes = updatedNodes.filter(
                      (n) => n.data?.nodeType === 'category',
                    );

                    // ノードがどのカテゴリに重なっているか判定（50%ルール）
                    let bestCategory: any = null;
                    let bestOverlapRatio = 0;
                    const nodeWidth = 240;
                    const nodeHeight = 120;

                    categoryNodes.forEach((category) => {
                      const bounds = (category.data as any).bounds as
                        | {
                            x: number;
                            y: number;
                            width: number;
                            height: number;
                          }
                        | undefined;
                      if (!bounds) return;

                      // 重複領域の計算
                      const overlapLeft = Math.max(position.x, bounds.x);
                      const overlapTop = Math.max(position.y, bounds.y);
                      const overlapRight = Math.min(
                        position.x + nodeWidth,
                        bounds.x + bounds.width,
                      );
                      const overlapBottom = Math.min(
                        position.y + nodeHeight,
                        bounds.y + bounds.height,
                      );

                      if (
                        overlapLeft < overlapRight &&
                        overlapTop < overlapBottom
                      ) {
                        const overlapArea =
                          (overlapRight - overlapLeft) *
                          (overlapBottom - overlapTop);
                        const nodeArea = nodeWidth * nodeHeight;
                        const overlapRatio = overlapArea / nodeArea;

                        if (
                          overlapRatio >= 0.5 &&
                          overlapRatio > bestOverlapRatio
                        ) {
                          bestCategory = category;
                          bestOverlapRatio = overlapRatio;
                        }
                      }
                    });

                    // 元のカテゴリIDを保存
                    const oldCategoryId = draggedNode.data.categoryId;

                    // カテゴリ更新処理
                    if (bestCategory) {
                      // 新しいカテゴリに追加
                      const categoryBounds = bestCategory.data.bounds;
                      const relativePosition = {
                        x: position.x - categoryBounds.x,
                        y: position.y - categoryBounds.y,
                      };

                      updatedNodes = updatedNodes.map((n) => {
                        if (n.id === nodeId) {
                          // ノードにカテゴリ情報を設定
                          return {
                            ...n,
                            data: {
                              ...n.data,
                              categoryId: bestCategory.id,
                              relativePosition: relativePosition,
                            },
                          };
                        } else if (n.id === bestCategory.id) {
                          // カテゴリのメンバーリストを更新
                          const currentMembers = ((n.data as any).memberNodes ||
                            []) as string[];
                          if (!currentMembers.includes(nodeId)) {
                            return {
                              ...n,
                              data: {
                                ...n.data,
                                memberNodes: [...currentMembers, nodeId],
                              },
                            };
                          }
                        } else if (oldCategoryId && n.id === oldCategoryId) {
                          // 元のカテゴリから削除
                          const currentMembers = ((n.data as any).memberNodes ||
                            []) as string[];
                          return {
                            ...n,
                            data: {
                              ...n.data,
                              memberNodes: currentMembers.filter(
                                (id) => id !== nodeId,
                              ),
                            },
                          };
                        }
                        return n;
                      });
                    } else if (oldCategoryId) {
                      // カテゴリ外に移動した場合
                      updatedNodes = updatedNodes.map((n) => {
                        if (n.id === nodeId) {
                          // ノードのカテゴリ情報をクリア
                          return {
                            ...n,
                            data: {
                              ...n.data,
                              categoryId: undefined,
                              relativePosition: undefined,
                            },
                          };
                        } else if (n.id === oldCategoryId) {
                          // 元のカテゴリから削除
                          const currentMembers = ((n.data as any).memberNodes ||
                            []) as string[];
                          return {
                            ...n,
                            data: {
                              ...n.data,
                              memberNodes: currentMembers.filter(
                                (id) => id !== nodeId,
                              ),
                            },
                          };
                        }
                        return n;
                      });
                    }

                    return updatedNodes;
                  });

                  // ローカルプレビューをクリーンアップ
                  if (setLocalCategoryPreview) {
                    setLocalCategoryPreview((prev) => {
                      const updated = { ...prev };
                      delete updated[nodeId];
                      return updated;
                    });
                  }
                }}
                onNodesChange={() => {
                  // React Flow純正：位置とサイズ変更を同期
                  const currentFlowNodes =
                    systemDiagramRef.current?.getInternalNodes() || [];

                  setCanvasNodes((prev) => {
                    const updatedNodes = prev.map((systemNode) => {
                      const flowNode = currentFlowNodes.find(
                        (fn) => fn.id === systemNode.id,
                      );
                      if (flowNode) {
                        // 位置変更の検出のみ（サイズ変更はNodeResizerで直接処理）
                        const positionChanged =
                          Math.abs(
                            flowNode.position.x - (systemNode.position?.x || 0),
                          ) > 1 ||
                          Math.abs(
                            flowNode.position.y - (systemNode.position?.y || 0),
                          ) > 1;

                        if (positionChanged) {
                          // カテゴリの場合はグループ移動を実行
                          if (systemNode.data?.nodeType === 'category') {
                            const oldBounds = ((systemNode.data as any)
                              .bounds || {
                              x: systemNode.position?.x || 0,
                              y: systemNode.position?.y || 0,
                              width: 300,
                              height: 200,
                            }) as {
                              x: number;
                              y: number;
                              width: number;
                              height: number;
                            };

                            const newBounds = {
                              x: flowNode.position.x,
                              y: flowNode.position.y,
                              width: oldBounds.width, // サイズは維持
                              height: oldBounds.height,
                            };

                            // グループ移動を実行（サイズを維持したまま）
                            setTimeout(() => {
                              handleCategoryMove(systemNode.id, newBounds);
                            }, 0);

                            return {
                              ...systemNode,
                              position: flowNode.position,
                              data: {
                                ...systemNode.data,
                                bounds: newBounds,
                              },
                            };
                          }

                          // 通常ノードの位置更新のみ
                          return {
                            ...systemNode,
                            position: flowNode.position,
                          };
                        }
                      }
                      return systemNode;
                    });

                    return updatedNodes;
                  });
                }}
                onConnect={(connection) => {
                  console.log('🔌 [MainCanvas] onConnect called:', {
                    source: connection.source,
                    sourceHandle: connection.sourceHandle,
                    target: connection.target,
                    targetHandle: connection.targetHandle,
                  });

                  // 🛡️ Enhanced connection validation before creation
                  if (!connection.source || !connection.target) {
                    console.warn(
                      '⚠️ Invalid connection: missing source or target',
                    );
                    return;
                  }

                  // ポートIDを正規化（_source、_targetサフィックスを除去）
                  const normalizedFromPort = (
                    connection.sourceHandle || 'output-center'
                  ).replace(/_source$|_target$/, '');
                  const normalizedToPort = (
                    connection.targetHandle || 'input-center'
                  ).replace(/_source$|_target$/, '');

                  const newConnection: Connection = {
                    id: generateConnectionId(connections),
                    fromId: connection.source,
                    toId: connection.target,
                    fromPort: normalizedFromPort,
                    toPort: normalizedToPort,
                  };

                  console.log('🔌 [MainCanvas] New connection object:', {
                    ...newConnection,
                    originalPorts: {
                      from: connection.sourceHandle,
                      to: connection.targetHandle,
                    },
                  });

                  // 🛡️ Comprehensive validation before adding
                  const validation = validateConnection(newConnection, nodes);
                  console.log(
                    '🔌 [MainCanvas] Basic validation result:',
                    validation,
                  );

                  if (!validation.isValid) {
                    console.warn(
                      '⚠️ Invalid connection rejected:',
                      validation.errors,
                    );
                    return;
                  }

                  // 🔌 Port-level compatibility check
                  console.log(
                    '🔌 [MainCanvas] Checking port compatibility...',
                    {
                      sourceHandle: connection.sourceHandle,
                      targetHandle: connection.targetHandle,
                      isCenterPort:
                        connection.sourceHandle?.includes('center') ||
                        connection.targetHandle?.includes('center'),
                    },
                  );

                  if (
                    connection.sourceHandle &&
                    connection.targetHandle &&
                    !connection.sourceHandle.includes('center') &&
                    !connection.targetHandle.includes('center')
                  ) {
                    const portCompatibility = checkPortCompatibility(
                      connection.source,
                      connection.sourceHandle,
                      connection.target,
                      connection.targetHandle,
                      nodes,
                    );

                    if (!portCompatibility.isCompatible) {
                      console.error('❌ Port compatibility check failed:', {
                        sourceNode: connection.source,
                        sourcePort: connection.sourceHandle,
                        targetNode: connection.target,
                        targetPort: connection.targetHandle,
                        errors: portCompatibility.errors,
                        warnings: portCompatibility.warnings,
                        suggestions: portCompatibility.suggestions,
                      });

                      // Show user-friendly error message with suggestions
                      const errorMessage =
                        portCompatibility.errors[0] ||
                        'このポート間は接続できません';
                      const suggestionMessage =
                        portCompatibility.suggestions &&
                        portCompatibility.suggestions[0]
                          ? `\n\n💡 ${portCompatibility.suggestions[0]}`
                          : '';

                      alert(
                        `❌connection error\n\n${errorMessage}${suggestionMessage}`,
                      );
                      return;
                    }

                    if (portCompatibility.warnings.length > 0) {
                      console.warn(
                        '⚠️ Port compatibility warnings:',
                        portCompatibility.warnings,
                      );
                      // Show warning but allow connection
                      const warningMessage = `⚠️ 接続警告\n\n${portCompatibility.warnings[0]}\n\n接続を続行しますか？`;
                      if (!confirm(warningMessage)) {
                        return;
                      }
                    }
                  }
                  setConnections((prev) => {
                    const updatedConnections = [...prev, newConnection];

                    // 新しい接続を即座に保存（競合防止付き）
                    setTimeout(() => {
                      if (!isSaving) {
                        console.log('💾 Saving new connection immediately...');
                        setIsSaving(true);
                        saveProjectDataWithConnections(
                          updatedConnections,
                          currentProject,
                          nodes as any,
                          chatMessages,
                          isSaving,
                          setIsSaving,
                        )
                          .catch((error) => {
                            console.error(
                              'Failed to save new connection:',
                              error,
                            );
                          })
                          .finally(() => {
                            setIsSaving(false);
                          });
                      } else {
                        console.log(
                          '⏭️ Skipping connection save - already saving',
                        );
                      }
                    }, 100);

                    return updatedConnections;
                  });
                  console.log('New connection created:', newConnection);
                }}
                onAddNode={(position) => {
                  // 右クリックからノード追加
                  if (!isProcessing) {
                    addNewNode(
                      position.x,
                      position.y,
                      currentProject,
                      nodes,
                      setCanvasNodes,
                    );
                  }
                }}
                onAddCategory={(position) => {
                  // 右クリックからカテゴリ追加
                  if (!isProcessing) {
                    addNewCategory(
                      position.x,
                      position.y,
                      currentProject,
                      nodes,
                      setCanvasNodes,
                    );
                  }
                }}
                onDeleteNode={(nodeId) => {
                  // コンテキストメニューからノード削除
                  if (!isProcessing) {
                    deleteNode(
                      nodeId,
                      currentProject,
                      nodes,
                      connections,
                      setCanvasNodes,
                      setConnections,
                    );
                  }
                }}
                onDeleteSelected={async (selectedNodes, selectedEdges) => {
                  // マルチ選択削除（非同期対応）
                  if (!isProcessing) {
                    try {
                      setIsProcessing(true); // 削除処理中フラグ
                      await handleDeleteSelected(
                        selectedNodes as any,
                        selectedEdges,
                        setCanvasNodes,
                        setConnections,
                        currentProject,
                        connections,
                        nodes,
                        chatMessages,
                      );
                    } catch (error) {
                      console.error('削除エラー:', error);
                      throw error; // SystemDiagramFlowにエラーを伝播
                    } finally {
                      setIsProcessing(false);
                    }
                  }
                }}
                onEditNode={(nodeId) => {
                  // Edit Nodeボタンからの編集 - ダブルクリックと全く同じ方式
                  startNodeEditing(nodeId);
                }}
              />
            </Suspense>
          </div>
        </div>
      )}

      {/* 🛒 完全分離設計: Parts Management - 常にマウントしてonBlurイベントを確保 */}
      <div
        className={`h-full ${activeTab === 'parts' ? 'block' : 'hidden'} ${activeTab === 'parts' ? 'relative' : ''}`}
      >
        <PartsManagement
          nodes={nodes}
          setNodes={setCanvasNodes}
          updateNodeData={() => {}} // TODO: implement if needed
          // 🚀 単一データソース: PBS自動生成（pbsComputed.tsで計算）
          connections={connections}
          setConnections={setConnections}
          softwareContext={
            softwareContext ||
            ({ requirements: [], systemSpecs: [], testCriteria: [] } as any)
          }
        />
      </div>

      {/* Tab Content with Hidden Strategy for better performance */}
      <div
        className="flex-1 overflow-auto"
        style={{
          display: activeTab === 'devlog' ? 'block' : 'none',
          height: 'calc(100vh - 120px)',
        }}
      >
        <DevLog projectId={currentProject?.id} onApprove={onApprove} />
      </div>
      <div
        className="flex-1 overflow-auto"
        style={{
          display: activeTab === 'visual' ? 'block' : 'none',
          height: 'calc(100% - 48px)',
        }}
      >
        <VisualInformationRealtime
          onMessageSend={(message) => {
            // ChatPanelのhandleSendMessageを呼び出し
            if (handleSendMessage) {
              handleSendMessage(message, null, true);
            }
          }}
        />
      </div>
    </div>
  );
}
