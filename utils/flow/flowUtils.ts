import { Node, Edge } from '@xyflow/react';
import type { Connection, NodeData } from '@/types';

// 🚀 楽観的UI用のReact Flow強制更新ユーティリティ
export function forceReactFlowUpdate(
  setNodes: (
    nodes: Node<NodeData>[] | ((prev: Node<NodeData>[]) => Node<NodeData>[]),
  ) => void,
) {
  console.log('🔄 Forcing React Flow update for optimistic UI');

  setNodes((currentNodes) => {
    // 各ノードに微細な変更を加えてReact Flowに再レンダリングを強制
    return currentNodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        _lastUpdate: Date.now(), // タイムスタンプで強制更新
      } as NodeData,
    }));
  });
}

// Convert Node<NodeData> array to React Flow nodes（楽観的UI強制更新対応）
export function convertCanvasNodesToFlowNodes(
  nodes: Node<NodeData>[],
  onEdit: (nodeId: string) => void,
  onDelete: (nodeId: string) => void,
  onApprove?: (nodeId: string) => void,
  onReject?: (nodeId: string) => void,
  editingItemId?: string | null,
  editingValue?: string,
  setEditingItemId?: (id: string | null) => void,
  setEditingValue?: (value: string) => void,
  onFinishEditing?: (nodeId: string, newValue: string) => void,
  onStartEditing?: (nodeId: string) => void,
  onUpdateNodeTitle?: (nodeId: string, newTitle: string) => void,
  onUpdateCategoryBounds?: (
    nodeId: string,
    newBounds: { width: number; height: number; x?: number; y?: number },
  ) => void,
  localCategoryPreview?: { [key: string]: string | null },
  forceUpdate?: boolean, // 🚀 強制更新フラグ追加
): Node[] {
  return nodes.map((node) => {
    // 🚀 楽観的UI: 強制更新時に一意なキーを生成して React Flow に再レンダリングを強制
    const nodeKey = forceUpdate ? `${node.id}-${Date.now()}` : node.id;

    return {
      id: node.id, // 実際のIDは変更しない
      type: 'systemNode', // SystemNodeコンポーネントを使用（canvasNodeエイリアス廃止）
      position: node.position || { x: 0, y: 0 }, // React Flow座標系で統一
      data: {
        ...node.data, // 元のデータをすべて保持
        // SystemNodeで使用されるプロパティを確実に設定
        title: node.data?.title,
        type: node.data?.type || 'primary', // デフォルトはprimary（青色）
        isPending: node.data?.isPending || false,
        isPBSCategory: node.data?.isPBSCategory || false,
        inputs: node.data?.inputs || 1,
        outputs: node.data?.outputs || 1,
        // カテゴリ関連のプロパティを明示的に設定
        memberNodes: node.data?.memberNodes, // 明示的にmemberNodesを渡す
        nodeType: node.data?.nodeType, // nodeTypeも明示的に
        bounds: node.data?.bounds, // boundsも明示的に
        // ローカルプレビューを優先使用
        categoryId: localCategoryPreview?.[node.id] ?? node.data?.categoryId,
        onEdit: () => onEdit(node.id),
        onDelete: () => onDelete(node.id),
        // 既存のノードデータの承認ハンドラーを優先、なければ新しく渡されたハンドラーを使用
        onApprove:
          node.data?.onApprove ||
          (onApprove ? () => onApprove(node.id) : undefined),
        onReject:
          node.data?.onReject ||
          (onReject ? () => onReject(node.id) : undefined),
        // 編集関連のprops
        editingItemId,
        editingValue,
        setEditingItemId,
        setEditingValue,
        onFinishEditing,
        onStartEditing,
        onUpdateNodeTitle,
        onUpdateCategoryBounds,
        // 最新のnodes配列への参照を追加
        allNodes: nodes,
        // 🚀 楽観的UI: 強制更新用のキー追加
        _forceUpdateKey: forceUpdate ? nodeKey : undefined,
      },
      style: {
        background: 'transparent', // SystemNodeコンポーネント内でスタイリング
        border: 'none', // 外側の枠線を削除
        padding: '0', // パディングを削除
        overflow: 'visible', // リサイズ時にはみ出しを許可
        zIndex:
          node.data?.nodeType === 'category'
            ? 10
            : node.data?.categoryId
              ? 200
              : 100, // カテゴリ(10) < 通常ノード(100) < カテゴライズ済ノード(200)
        // width/heightを削除 - NodeResizerに完全に委譲
      },
      // 🚀 楽観的UI: 強制更新時にReact Flowに変更を確実に認識させる
      ...(forceUpdate && { key: nodeKey }),
    };
  });
}

// Convert Connections to React Flow edges with SmartEdge
export function convertConnectionsToFlowEdges(
  connections: Connection[],
  onDelete: (connectionId: string) => void,
  nodes?: Node<NodeData>,
): Edge[] {
  return connections
    .filter((conn) => {
      // 🚫 Block specific problematic edges that cause React Flow errors
      const problematicEdgeIds = [
        'conn-1753052821622-r40skt9nx',
        'conn-1753126589081-sa5xlmclq',
      ];
      if (problematicEdgeIds.includes(conn.id)) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('🚫 Blocked problematic edge:', conn.id);
        }
        return false;
      }

      // 🛡️ Basic data validation
      if (!conn.id || !conn.fromId || !conn.toId) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('🚫 Invalid connection filtered out:', conn);
        }
        return false;
      }

      // 🛡️ Node existence check: verify fromId/toId correspond to actual nodes
      if (nodes) {
        const sourceNode = nodes.find((n) => n.id === conn.fromId);
        const targetNode = nodes.find((n) => n.id === conn.toId);

        if (!sourceNode || !targetNode) {
          return false;
        }

        // 🛡️ Skip connections to/from category nodes (check nodeType in data)
        if (
          sourceNode.data?.nodeType === 'category' ||
          targetNode.data?.nodeType === 'category'
        ) {
          if (process.env.NODE_ENV === 'development') {
            console.log(
              '🚫 Skipping connection to/from category node:',
              conn.id,
            );
          }
          return false;
        }
      }

      return true;
    })
    .map((conn) => {
      // 🎨 SmartEdgeに統一 - createVisualEdgeを使用せず直接変換
      // 動的ポートのハンドルIDを生成（双方向ポートの場合は_sourceサフィックスを追加）
      let sourceHandle = conn.fromPort || 'output-center';
      let targetHandle = conn.toPort || 'input-center';

      // 🔧 Auto-migration: Handle legacy static handle IDs
      if (nodes) {
        const sourceNode = nodes.find((n) => n.id === conn.fromId);
        const targetNode = nodes.find((n) => n.id === conn.toId);

        // Legacy handle ID migration for source
        if (
          sourceHandle === 'output-center' &&
          sourceNode?.data?.ports?.length > 0
        ) {
          const firstOutputPort = sourceNode.data.ports.find(
            (p: any) =>
              p.direction === 'output' || p.direction === 'bidirectional',
          );
          if (firstOutputPort) {
            sourceHandle =
              firstOutputPort.direction === 'bidirectional'
                ? `${firstOutputPort.id}_source`
                : firstOutputPort.id;
          }
        }

        // Legacy handle ID migration for target
        if (
          targetHandle === 'input-center' &&
          targetNode?.data?.ports?.length > 0
        ) {
          const firstInputPort = targetNode.data.ports.find(
            (p: any) =>
              p.direction === 'input' || p.direction === 'bidirectional',
          );
          if (firstInputPort) {
            targetHandle =
              firstInputPort.direction === 'bidirectional'
                ? `${firstInputPort.id}_target`
                : firstInputPort.id;
          }
        }

        // Handle bidirectional ports for dynamic handles
        if (sourceNode?.data?.ports) {
          const sourcePort = sourceNode.data.ports.find(
            (p: any) => p.id === conn.fromPort,
          );
          if (sourcePort?.direction === 'bidirectional') {
            sourceHandle = `${conn.fromPort}_source`;
          }
        }

        if (targetNode?.data?.ports) {
          const targetPort = targetNode.data.ports.find(
            (p: any) => p.id === conn.toPort,
          );
          if (targetPort?.direction === 'bidirectional') {
            targetHandle = `${conn.toPort}_target`;
          }
        }
      }

      console.log('🔌 Converting connection to edge:', {
        id: conn.id,
        fromPort: conn.fromPort,
        toPort: conn.toPort,
        sourceHandle,
        targetHandle,
      });

      return {
        id: conn.id,
        source: conn.fromId,
        target: conn.toId,
        sourceHandle,
        targetHandle,
        type: 'smartEdge', // すべての接続でSmartEdgeを使用
        data: {
          ...conn.data,
          // SmartEdge用のデータ
          fromPort: conn.fromPort,
          toPort: conn.toPort,
          isCompatible: true, // デフォルトは互換性あり
          onDelete: () => onDelete(conn.id),
          // ノード情報を追加（色分けなどに使用）
          ...(nodes && {
            sourceNode: nodes.find((n) => n.id === conn.fromId),
            targetNode: nodes.find((n) => n.id === conn.toId),
          }),
        },
      };
    });
}

// Currently unused, but kept for potential future use
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getNodeBackgroundColor(node: Node<NodeData>): string {
  if (node.data?.isPending) {
    return '#fef3c7'; // yellow-100 for pending nodes
  }

  switch (node.type) {
    case 'primary':
      return '#dbeafe'; // blue-100
    case 'secondary':
      return '#e0f2fe'; // light-blue-100
    case 'warning':
      return '#fef3c7'; // yellow-100
    case 'accent':
      return '#fce7f3'; // pink-100
    default:
      return '#f9fafb'; // gray-50
  }
}
