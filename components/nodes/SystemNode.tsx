'use client';

import React, { memo } from 'react';
import {
  Handle,
  Position,
  NodeProps,
  NodeResizer,
  Node as ReactFlowNode,
} from '@xyflow/react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Zap,
  Cpu,
  Check,
  X,
  Clock,
  Package,
  Folder,
  Settings,
  Loader2,
  AlertCircle,
  Tag,
  ExternalLink,
  ShoppingCart,
} from 'lucide-react';
import type { CategoryNodeData } from '@/types';

// ノードデータの型定義
export interface SystemNodeData {
  title: string;
  type: 'primary' | 'secondary' | 'warning' | 'accent';
  subLabel?: string;
  inputs: number;
  outputs: number;
  voltage?: string;
  communication?: string;
  onEdit?: () => void;
  onDelete?: () => void;
  // 🆕 Phase 6: 仮承認状態サポート
  isPending?: boolean;
  suggestionId?: string;
  aiReasoning?: string;
  onApprove?: () => void;
  onReject?: () => void;
  // カテゴリ識別
  isPBSCategory?: boolean;
  // 🆕 空間的カテゴリ
  nodeType?: 'part' | 'category';
  bounds?: { x: number; y: number; width: number; height: number };
  isResizable?: boolean;
  memberNodes?: string[];
  // 🆕 インライン編集のための追加プロパティ
  editingItemId?: string | null;
  editingValue?: string;
  setEditingItemId?: (id: string | null) => void;
  setEditingValue?: (value: string) => void;
  onFinishEditing?: (nodeId: string, newValue: string) => void;
  onStartEditing?: (nodeId: string) => void;
  onUpdateNodeTitle?: (nodeId: string, newTitle: string) => void;
  onUpdateCategoryBounds?: (
    nodeId: string,
    newBounds: { width: number; height: number; x?: number; y?: number },
  ) => void;
  // 最新のnodes配列への参照
  allNodes?: Node[];
  // AI検索の楽観的UI状態
  isSearching?: boolean;
  searchError?: boolean;
  searchStartTime?: number;
  searchCompletedTime?: number;
  // 動的ポート
  ports?: Array<{
    id: string;
    label: string;
    type: string;
    direction: 'input' | 'output' | 'bidirectional';
    protocol?: string;
    position?: {
      side: 'top' | 'right' | 'bottom' | 'left';
      index: number;
    };
  }>;
  dynamicPorts?: Record<string, unknown>;
  // 価格と購入リンク情報（単一または配列）
  aiPricing?:
    | {
        unitPrice?: number;
        currency?: string;
        supplier?: string;
        purchaseUrl?: string;
        [key: string]: unknown;
      }
    | Array<{
        unitPrice?: number;
        currency?: string;
        supplier?: string;
        purchaseUrl?: string;
        [key: string]: unknown;
      }>;
  datasheetUrl?: string;
  [key: string]: unknown;
}

// ノードタイプに応じた色の取得（カテゴリ・仮承認状態・カテゴライズ状態・検索状態対応）
const getNodeColor = (
  type: string,
  isPending?: boolean,
  isPBSCategory?: boolean,
  categoryId?: string,
  isSearching?: boolean,
  searchError?: boolean,
) => {
  if (isSearching) {
    // AI検索中は青色のアニメーション
    return 'bg-blue-50 border-blue-400 border-2 hover:bg-blue-100 shadow-lg animate-pulse';
  }

  if (searchError) {
    // 検索エラー時は赤色
    return 'bg-red-50 border-red-400 border-2 hover:bg-red-100 shadow-lg';
  }

  if (isPending) {
    // 仮承認状態は点線ボーダーで視覚的に区別
    return 'bg-orange-50 border-orange-300 border-dashed hover:bg-orange-100 shadow-lg';
  }

  if (isPBSCategory) {
    // カテゴリは特別な見た目（黄色系 + 点線ボーダー）
    return 'bg-amber-50 border-amber-400 border-2 border-dashed hover:bg-amber-100 shadow-md';
  }

  // カテゴライズされた部品は特別なスタイル（より目立つ）
  if (categoryId) {
    return 'bg-green-50 border-green-500 border-3 border-solid hover:bg-green-100 shadow-lg ring-2 ring-green-300';
  }

  // 通常のパーツ（実線ボーダーで区別）
  switch (type) {
    case 'primary':
      return 'bg-blue-50 border-blue-300 border-2 border-solid hover:bg-blue-100';
    case 'secondary':
      return 'bg-gray-50 border-gray-300 border-2 border-solid hover:bg-gray-100';
    case 'warning':
      return 'bg-yellow-50 border-yellow-300 border-2 border-solid hover:bg-yellow-100';
    case 'accent':
      return 'bg-purple-50 border-purple-300 border-2 border-solid hover:bg-purple-100';
    default:
      return 'bg-white border-gray-300 border-2 border-solid hover:bg-gray-50';
  }
};

// ノードタイプに応じたアイコンの取得（カテゴライズ状態対応）
const getNodeIcon = (
  type: string,
  isPBSCategory?: boolean,
  categoryId?: string,
) => {
  if (isPBSCategory) {
    // カテゴリアイコン
    return <Folder className="w-6 h-6 text-amber-600" />;
  }

  // カテゴライズされた部品は特別なアイコン（より目立つ）
  if (categoryId) {
    return (
      <div className="flex items-center">
        <Package className="w-6 h-6 text-green-600" />
        <div className="w-3 h-3 bg-green-500 rounded-full ml-1 animate-pulse" />
      </div>
    );
  }

  switch (type) {
    case 'primary':
      return <Package className="w-6 h-6 text-blue-600" />;
    case 'secondary':
      return <Settings className="w-6 h-6 text-gray-600" />;
    case 'warning':
      return <Zap className="w-6 h-6 text-yellow-600" />;
    case 'accent':
      return <Cpu className="w-6 h-6 text-purple-600" />;
    default:
      return <Settings className="w-6 h-6 text-gray-600" />;
  }
};

// 編集開始関数のマップ（グローバルアクセス用）
const editingStartersMap = new Map<string, () => void>();

// 外部から編集開始を呼び出すヘルパー関数
export const startNodeEditing = (nodeId: string): boolean => {
  const startEditing = editingStartersMap.get(nodeId);
  if (startEditing) {
    startEditing();
    return true;
  }
  return false;
};

// 🆕 空間的カテゴリノードコンポーネント（React Flow純正）
// Remove memo to ensure updates are reflected immediately
const SpatialCategoryNode = ({
  id,
  data,
  selected,
}: {
  id: string;
  data: CategoryNodeData;
  selected?: boolean;
}) => {
  const categoryData = data;

  // 通常ノードと同じ編集状態管理
  const [isLocallyEditing, setIsLocallyEditing] = React.useState(false);
  const [localEditingValue, setLocalEditingValue] = React.useState('');
  const [displayTitle, setDisplayTitle] = React.useState(
    categoryData.title || '',
  );

  // 楽観的UI更新用のローカルサイズ状態
  const [localSize, setLocalSize] = React.useState({
    width: categoryData.bounds?.width || 300,
    height: categoryData.bounds?.height || 200,
  });

  // 前回の幅を記憶して左端固定のための位置補正に使用
  const [prevWidth, setPrevWidth] = React.useState(
    categoryData.bounds?.width || 300,
  );

  // 最新のタイトルを取得する関数
  const getCurrentTitle = React.useCallback(() => {
    // getCurrentTitleが呼ばれました

    if (categoryData.allNodes) {
      const currentNode = (
        categoryData.allNodes as unknown as ReactFlowNode[]
      )?.find((n: ReactFlowNode) => n.id === id);
      // 現在のノードを発見

      if (currentNode) {
        // 現在のノードデータを確認
      }

      const result = currentNode?.data?.title || categoryData.title || '';
      // 最終結果
      return result;
    }

    // allNodesがない場合はcategoryData.titleを使用
    return categoryData.title || '';
  }, [categoryData.allNodes, categoryData.title, id]);

  // propsの変更を監視して表示を更新
  React.useEffect(() => {
    setDisplayTitle(getCurrentTitle() || '');
  }, [getCurrentTitle]);

  // categoryData.boundsの変更をローカルサイズ状態に同期
  React.useEffect(() => {
    setLocalSize({
      width: categoryData.bounds?.width || 300,
      height: categoryData.bounds?.height || 200,
    });
    // 幅も更新
    setPrevWidth(categoryData.bounds?.width || 300);
  }, [categoryData.bounds?.width, categoryData.bounds?.height]);

  // 編集開始 - 統一版
  const startLocalEditing = React.useCallback(() => {
    setIsLocallyEditing(true);
    setLocalEditingValue(displayTitle);
  }, [displayTitle]);

  // 編集完了 - グローバル状態更新版
  const handleFinishEditing = () => {
    setDisplayTitle(localEditingValue.trim());
    // 編集完了時のみグローバル状態を更新
    if (
      localEditingValue.trim() &&
      typeof categoryData.onUpdateNodeTitle === 'function'
    ) {
      categoryData.onUpdateNodeTitle(id, localEditingValue.trim());
    }
    setIsLocallyEditing(false);
    setLocalEditingValue('');
  };

  // ダブルクリックで編集開始
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    startLocalEditing();
  };

  // キーボード処理
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleFinishEditing();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsLocallyEditing(false);
      setLocalEditingValue('');
    }
  };

  // グローバルマップに登録（外部からアクセス可能にする）
  React.useEffect(() => {
    editingStartersMap.set(id, startLocalEditing);
    return () => {
      editingStartersMap.delete(id);
    };
  }, [id, startLocalEditing]);

  return (
    <div
      className={`
        border-2 border-dashed border-amber-400/50 
        bg-amber-50/5 rounded-lg
        ${selected ? 'ring-2 ring-blue-500' : ''}
      `}
      style={{
        // 楽観的UI更新：ローカルサイズ状態を優先使用
        width: localSize.width,
        height: localSize.height,
        minWidth: 200,
        minHeight: 150,
        position: 'relative',
        zIndex: selected ? 1000 : -1, // カテゴリは背景として接続線の後ろに配置
        pointerEvents: 'auto', // NodeResizerが機能するよう変更
      }}
    >
      {/* React Flow純正のNodeResizer */}
      <NodeResizer
        minWidth={200}
        minHeight={150}
        isVisible={selected}
        handleStyle={{
          background: '#f59e0b',
          border: '2px solid #ffffff',
          width: '10px',
          height: '10px',
          pointerEvents: 'auto', // リサイズハンドルのクリックを有効化
          zIndex: 9999, // 最前面に配置
        }}
        onResize={(_, { width, height }) => {
          // 楽観的UI更新：リサイズ中に即座にローカル状態更新
          setLocalSize({ width, height });
        }}
        onResizeEnd={(_, data) => {
          // 幅の変化量を計算
          const widthDiff = data.width - prevWidth;

          // 左端を固定するために中心位置を調整
          // nodeOrigin=[0.5, 0.5]のため、幅が増えた分の半分だけ右に移動させる
          const adjustedX = data.x - widthDiff / 2;

          // カテゴリのboundsデータを更新（位置補正済み）
          const newBounds = {
            x: adjustedX,
            y: data.y,
            width: data.width,
            height: data.height,
          };

          // 次回のために現在の幅を保存
          setPrevWidth(data.width);

          // 即座にコールバックを呼び出し
          if (categoryData.onCategoryResize) {
            categoryData.onCategoryResize(id, newBounds);
          }
        }}
      />

      {/* カテゴリヘッダー */}
      <div
        className="flex items-center gap-2 p-2 bg-amber-100/30 rounded-t-lg"
        style={{ pointerEvents: 'auto' }}
        onDoubleClick={handleDoubleClick}
      >
        <Folder className="w-6 h-6 text-amber-600" />
        {/* 編集状態に応じてspan/inputを切り替え */}
        {isLocallyEditing ? (
          <input
            type="text"
            id={`category-title-${id}`}
            name={`category-title-${id}`}
            value={localEditingValue}
            onChange={(e) => setLocalEditingValue(e.target.value)}
            onBlur={handleFinishEditing}
            onKeyDown={handleKeyDown}
            className="text-lg font-medium text-amber-800 bg-white border border-amber-300 rounded px-2 py-1 outline-none flex-1"
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="text-lg font-medium text-amber-800 flex-1 cursor-pointer">
            {displayTitle}
          </span>
        )}
        <Badge
          variant="outline"
          className="text-sm text-amber-700 border-amber-300 px-2 py-1"
        >
          {data.memberNodes?.length || 0} Parts
        </Badge>
      </div>

      {/* カテゴリ内容エリア */}
      <div
        className="p-2 h-full flex flex-col"
        style={{ pointerEvents: 'none' }}
      >
        {(!categoryData.memberNodes ||
          categoryData.memberNodes.length === 0) && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-amber-600/60 text-lg">
              <Folder className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <div>Drag and drop parts to add</div>
            </div>
          </div>
        )}

        {/* カテゴリ情報 */}
        {/* <div className="mt-auto">
          <div className="text-xs text-amber-700/70">
            メンバー: {categoryData.memberNodes?.length || 0}個
          </div> */}
        {/* デバッグ情報：サイズ表示 */}
        {/* {process.env.NODE_ENV === 'development' && (
            <div className="text-xs text-red-600 font-mono bg-white/80 p-1 rounded mt-1">
              Size: {categoryData.bounds?.width || 300} × {categoryData.bounds?.height || 200}
              <br />
              Style: {categoryData.bounds?.width || 300} × {categoryData.bounds?.height || 200}
            </div>
          )} */}
        {/* </div> */}
      </div>
    </div>
  );
};

SpatialCategoryNode.displayName = 'SpatialCategoryNode';

export const SystemNode = memo(({ id, data, selected }: NodeProps) => {
  const nodeData = data as SystemNodeData;

  // Hook calls must be at the top level - moved before conditional returns
  const [isHovered, setIsHovered] = React.useState(false);
  const [isLocallyEditing, setIsLocallyEditing] = React.useState(false);
  const [localEditingValue, setLocalEditingValue] = React.useState('');
  const [displayTitle, setDisplayTitle] = React.useState(nodeData.title || '');

  // 最新のタイトルを取得する関数
  const getCurrentTitle = React.useCallback(() => {
    // getCurrentTitleが呼ばれました

    if (nodeData.allNodes) {
      const currentNode = (
        nodeData.allNodes as unknown as ReactFlowNode[]
      )?.find((n: ReactFlowNode) => n.id === id);
      // 現在のノードを発見

      if (currentNode) {
        // 現在のノードデータを確認
      }

      const result = currentNode?.data?.title || nodeData.title || '';
      // 最終絥果
      return result;
    }

    // allNodesがない場合はnodeData.titleを使用
    return nodeData.title || '';
  }, [nodeData.allNodes, nodeData.title, id]);

  // propsの変更を監視して表示を更新
  React.useEffect(() => {
    setDisplayTitle(getCurrentTitle() || '');
  }, [getCurrentTitle]);

  // 編集開始 - 統一版（ダブルクリック・右クリック共通）
  const startLocalEditing = React.useCallback(() => {
    setIsLocallyEditing(true);
    setLocalEditingValue(displayTitle);
  }, [displayTitle]);

  // グローバルマップに登録（外部からアクセス可能にする）
  React.useEffect(() => {
    editingStartersMap.set(id, startLocalEditing);
    return () => {
      editingStartersMap.delete(id);
    };
  }, [id, startLocalEditing]);

  // 🆕 空間的カテゴリの場合は特別な表示（Hooks after conditional logic)
  if (nodeData.nodeType === 'category') {
    return (
      <SpatialCategoryNode
        id={id}
        data={nodeData as CategoryNodeData}
        selected={selected}
      />
    );
  }

  // 編集状態 - ローカル優先
  const isEditing = isLocallyEditing;

  // ダブルクリックで編集開始
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    startLocalEditing();
  };

  // 🗑️ 複雑なコールバック処理削除：グローバルマップ方式で直接アクセス

  // 編集完了（Enter/Blur） - グローバル状態更新版
  const handleFinishEditing = () => {
    setDisplayTitle(localEditingValue.trim());
    // 編集完了時のみグローバル状態を更新
    if (localEditingValue.trim() && nodeData.onUpdateNodeTitle) {
      nodeData.onUpdateNodeTitle(id, localEditingValue.trim());
    }
    setIsLocallyEditing(false);
    setLocalEditingValue('');
  };

  // キーボード処理 - シンプル版
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleFinishEditing();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsLocallyEditing(false);
      setLocalEditingValue('');
    }
  };

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Dynamic ports rendering */}
      {(() => {
        console.log(`🔌 [SystemNode ${id}] Dynamic ports:`, {
          hasPorts: !!nodeData.ports,
          portsLength: nodeData.ports?.length,
          ports: nodeData.ports,
          title: nodeData.title,
          category: nodeData.category,
          communication: nodeData.communication,
        });
        return null;
      })()}
      {nodeData.ports && nodeData.ports.length > 0 ? (
        <>
          {/* Group ports by side */}
          {(() => {
            const portsBySide = {
              top: [] as typeof nodeData.ports,
              right: [] as typeof nodeData.ports,
              bottom: [] as typeof nodeData.ports,
              left: [] as typeof nodeData.ports,
            };

            nodeData.ports.forEach((port) => {
              const side =
                port.position?.side ||
                (port.direction === 'output' ? 'right' : 'left');
              portsBySide[side].push(port);
            });

            return (
              <>
                {/* Top ports */}
                {portsBySide.top.map((port, index) => {
                  const totalPorts = portsBySide.top.length;

                  let leftPosition;
                  if (totalPorts > 2) {
                    // 3個以上は固定間隔120px
                    leftPosition = `${index * 120}px`;
                  } else {
                    // 2個以下は均等配置
                    leftPosition = `${(index + 1) * 33}%`;
                  }

                  return (
                    <div
                      key={`${id}_top_${port.id}_${index}`}
                      className="absolute flex flex-col items-center"
                      style={{
                        top: '-8px',
                        left: leftPosition,
                        transform: 'translateX(-50%)',
                      }}
                    >
                      <div
                        className="text-xs whitespace-nowrap bg-white/90 px-1 py-0.5 rounded shadow-sm"
                        style={{
                          position: 'absolute',
                          bottom: '100%',
                          marginBottom: '2px',
                          fontSize: '8px',
                          fontWeight: '600',
                          color:
                            port.type === 'power'
                              ? '#ef4444'
                              : port.type === 'communication'
                                ? '#3b82f6'
                                : '#6b7280',
                          border: `1px solid ${
                            port.type === 'power'
                              ? '#fecaca'
                              : port.protocol === 'Analog'
                                ? '#fef3c7'
                                : port.protocol === 'Digital'
                                  ? '#d1fae5'
                                  : [
                                        'USB',
                                        'HDMI',
                                        'DisplayPort',
                                        'Ethernet',
                                        'VGA',
                                        'DVI',
                                        'Audio',
                                        '3.5mm',
                                        'Jack',
                                        'DC',
                                        'SD',
                                        'SIM',
                                      ].some((p) => port.protocol?.includes(p))
                                    ? '#e9d5ff'
                                    : port.type === 'communication'
                                      ? '#dbeafe'
                                      : '#e5e7eb'
                          }`,
                        }}
                      >
                        {port.label}
                      </div>
                      {/* 双方向ポートの場合は2つのハンドルを作成 */}
                      {port.direction === 'bidirectional' ? (
                        <>
                          <Handle
                            type="source"
                            position={Position.Top}
                            id={`${port.id.replace(/[^a-zA-Z0-9-_]/g, '_')}_source`}
                            className="transition-all duration-200 hover:scale-150 hover:shadow-lg hover:z-50"
                            style={{
                              position: 'absolute',
                              background:
                                port.type === 'power'
                                  ? '#ef4444'
                                  : port.type === 'communication'
                                    ? '#3b82f6'
                                    : '#6b7280',
                              border: '2px solid #ffffff',
                              width: '16px',
                              height: '16px',
                              boxShadow:
                                isHovered || selected
                                  ? '0 0 0 2px rgba(59, 130, 246, 0.2)'
                                  : 'none',
                            }}
                            isConnectable={true}
                          />
                          <Handle
                            type="target"
                            position={Position.Top}
                            id={`${port.id.replace(/[^a-zA-Z0-9-_]/g, '_')}_target`}
                            className="transition-all duration-200 hover:scale-150 hover:shadow-lg hover:z-50"
                            style={{
                              position: 'absolute',
                              background:
                                port.type === 'power'
                                  ? '#ef4444'
                                  : port.type === 'communication'
                                    ? '#3b82f6'
                                    : '#6b7280',
                              border: '2px solid #ffffff',
                              width: '16px',
                              height: '16px',
                              boxShadow:
                                isHovered || selected
                                  ? '0 0 0 2px rgba(59, 130, 246, 0.2)'
                                  : 'none',
                              zIndex: -1, // sourceハンドルの下に配置
                            }}
                            isConnectable={true}
                          />
                        </>
                      ) : (
                        <Handle
                          type={
                            port.direction === 'input' ? 'target' : 'source'
                          }
                          position={Position.Top}
                          id={port.id.replace(/[^a-zA-Z0-9-_]/g, '_')}
                          className="transition-all duration-200 hover:scale-150 hover:shadow-lg hover:z-50"
                          style={{
                            position: 'relative',
                            background:
                              port.type === 'power'
                                ? '#ef4444'
                                : port.type === 'communication'
                                  ? '#3b82f6'
                                  : '#6b7280',
                            border: '2px solid #ffffff',
                            width: '16px',
                            height: '16px',
                            boxShadow:
                              isHovered || selected
                                ? '0 0 0 2px rgba(239, 68, 68, 0.2)'
                                : 'none',
                          }}
                          isConnectable={true}
                        />
                      )}
                    </div>
                  );
                })}

                {/* Right ports */}
                {portsBySide.right.map((port, index) => (
                  <div
                    key={`${id}_right_${port.id}_${index}`}
                    className="absolute flex items-center"
                    style={{
                      right: '-8px',
                      top: `${30 + index * 60}px`,
                      transform: 'translateY(-50%)',
                    }}
                  >
                    {/* 双方向ポートの場合は2つのハンドルを作成 */}
                    {port.direction === 'bidirectional' ? (
                      <>
                        <Handle
                          type="source"
                          position={Position.Right}
                          id={`${port.id.replace(/[^a-zA-Z0-9-_]/g, '_')}_source`}
                          className="transition-all duration-200 hover:scale-150 hover:shadow-lg hover:z-50"
                          style={{
                            position: 'absolute',
                            background:
                              port.type === 'power'
                                ? '#ef4444'
                                : port.protocol === 'Analog'
                                  ? '#f59e0b'
                                  : port.protocol === 'Digital'
                                    ? '#10b981'
                                    : [
                                          'USB',
                                          'HDMI',
                                          'DisplayPort',
                                          'Ethernet',
                                          'VGA',
                                          'DVI',
                                          'Audio',
                                          '3.5mm',
                                          'Jack',
                                          'DC',
                                          'SD',
                                          'SIM',
                                        ].some((p) =>
                                          port.protocol?.includes(p),
                                        )
                                      ? '#8b5cf6'
                                      : port.type === 'communication'
                                        ? '#3b82f6'
                                        : '#6b7280',
                            border: '2px solid #ffffff',
                            width: '16px',
                            height: '16px',
                            boxShadow:
                              isHovered || selected
                                ? '0 0 0 2px rgba(59, 130, 246, 0.2)'
                                : 'none',
                          }}
                          isConnectable={true}
                        />
                        <Handle
                          type="target"
                          position={Position.Right}
                          id={`${port.id.replace(/[^a-zA-Z0-9-_]/g, '_')}_target`}
                          className="transition-all duration-200 hover:scale-150 hover:shadow-lg hover:z-50"
                          style={{
                            position: 'absolute',
                            background:
                              port.type === 'power'
                                ? '#ef4444'
                                : port.protocol === 'Analog'
                                  ? '#f59e0b'
                                  : port.protocol === 'Digital'
                                    ? '#10b981'
                                    : [
                                          'USB',
                                          'HDMI',
                                          'DisplayPort',
                                          'Ethernet',
                                          'VGA',
                                          'DVI',
                                          'Audio',
                                          '3.5mm',
                                          'Jack',
                                          'DC',
                                          'SD',
                                          'SIM',
                                        ].some((p) =>
                                          port.protocol?.includes(p),
                                        )
                                      ? '#8b5cf6'
                                      : port.type === 'communication'
                                        ? '#3b82f6'
                                        : '#6b7280',
                            border: '2px solid #ffffff',
                            width: '16px',
                            height: '16px',
                            boxShadow:
                              isHovered || selected
                                ? '0 0 0 2px rgba(59, 130, 246, 0.2)'
                                : 'none',
                            zIndex: -1, // sourceハンドルの下に配置
                          }}
                          isConnectable={true}
                        />
                      </>
                    ) : (
                      <Handle
                        type={port.direction === 'input' ? 'target' : 'source'}
                        position={Position.Right}
                        id={port.id.replace(/[^a-zA-Z0-9-_]/g, '_')}
                        className="transition-all duration-200 hover:scale-150 hover:shadow-lg hover:z-50"
                        style={{
                          position: 'relative',
                          background:
                            port.type === 'power'
                              ? '#ef4444'
                              : port.protocol === 'Analog'
                                ? '#f59e0b'
                                : port.protocol === 'Digital'
                                  ? '#10b981'
                                  : [
                                        'USB',
                                        'HDMI',
                                        'DisplayPort',
                                        'Ethernet',
                                        'VGA',
                                        'DVI',
                                        'Audio',
                                        '3.5mm',
                                        'Jack',
                                        'DC',
                                        'SD',
                                        'SIM',
                                      ].some((p) => port.protocol?.includes(p))
                                    ? '#8b5cf6'
                                    : port.type === 'communication'
                                      ? '#3b82f6'
                                      : '#6b7280',
                          border: '2px solid #ffffff',
                          width: '16px',
                          height: '16px',
                          boxShadow:
                            isHovered || selected
                              ? '0 0 0 2px rgba(5, 150, 105, 0.2)'
                              : 'none',
                        }}
                        isConnectable={true}
                      />
                    )}
                    <div
                      className="text-xs whitespace-nowrap bg-white/90 px-1 py-0.5 rounded shadow-sm"
                      style={{
                        position: 'absolute',
                        left: '100%',
                        marginLeft: '4px',
                        fontSize: '8px',
                        fontWeight: '600',
                        color:
                          port.type === 'power'
                            ? '#ef4444'
                            : port.protocol === 'Analog'
                              ? '#f59e0b'
                              : port.protocol === 'Digital'
                                ? '#10b981'
                                : [
                                      'USB',
                                      'HDMI',
                                      'DisplayPort',
                                      'Ethernet',
                                      'VGA',
                                      'DVI',
                                      'Audio',
                                      '3.5mm',
                                      'Jack',
                                      'DC',
                                      'SD',
                                      'SIM',
                                    ].some((p) => port.protocol?.includes(p))
                                  ? '#8b5cf6'
                                  : port.type === 'communication'
                                    ? '#3b82f6'
                                    : '#6b7280',
                        border: `1px solid ${
                          port.type === 'power'
                            ? '#fecaca'
                            : port.protocol === 'Analog'
                              ? '#fef3c7'
                              : port.protocol === 'Digital'
                                ? '#d1fae5'
                                : [
                                      'USB',
                                      'HDMI',
                                      'DisplayPort',
                                      'Ethernet',
                                      'VGA',
                                      'DVI',
                                      'Audio',
                                      '3.5mm',
                                      'Jack',
                                      'DC',
                                      'SD',
                                      'SIM',
                                    ].some((p) => port.protocol?.includes(p))
                                  ? '#e9d5ff'
                                  : port.type === 'communication'
                                    ? '#dbeafe'
                                    : '#e5e7eb'
                        }`,
                      }}
                    >
                      {port.label}
                    </div>
                  </div>
                ))}

                {/* Bottom ports */}
                {portsBySide.bottom.map((port, index) => {
                  const totalPorts = portsBySide.bottom.length;

                  let leftPosition;
                  if (totalPorts > 2) {
                    // 3個以上は固定間隔120px
                    leftPosition = `${index * 120}px`;
                  } else {
                    // 2個以下は均等配置
                    leftPosition = `${(index + 1) * 33}%`;
                  }

                  return (
                    <div
                      key={`${id}_bottom_${port.id}_${index}`}
                      className="absolute flex flex-col items-center"
                      style={{
                        bottom: '-8px',
                        left: leftPosition,
                        transform: 'translateX(-50%)',
                      }}
                    >
                      {port.direction === 'bidirectional' ? (
                        <>
                          <Handle
                            type="source"
                            position={Position.Bottom}
                            id={`${port.id.replace(/[^a-zA-Z0-9-_]/g, '_')}_source`}
                            className="transition-all duration-200 hover:scale-150 hover:shadow-lg hover:z-50"
                            style={{
                              position: 'absolute',
                              background:
                                port.type === 'power'
                                  ? '#ef4444'
                                  : port.type === 'communication'
                                    ? '#3b82f6'
                                    : '#6b7280',
                              border: '2px solid #ffffff',
                              width: '16px',
                              height: '16px',
                              boxShadow:
                                isHovered || selected
                                  ? '0 0 0 2px rgba(59, 130, 246, 0.2)'
                                  : 'none',
                            }}
                            isConnectable={true}
                          />
                          <Handle
                            type="target"
                            position={Position.Bottom}
                            id={`${port.id.replace(/[^a-zA-Z0-9-_]/g, '_')}_target`}
                            className="transition-all duration-200 hover:scale-150 hover:shadow-lg hover:z-50"
                            style={{
                              position: 'absolute',
                              background:
                                port.type === 'power'
                                  ? '#ef4444'
                                  : port.type === 'communication'
                                    ? '#3b82f6'
                                    : '#6b7280',
                              border: '2px solid #ffffff',
                              width: '16px',
                              height: '16px',
                              boxShadow:
                                isHovered || selected
                                  ? '0 0 0 2px rgba(59, 130, 246, 0.2)'
                                  : 'none',
                              zIndex: -1, // sourceハンドルの下に配置
                            }}
                            isConnectable={true}
                          />
                        </>
                      ) : (
                        <Handle
                          type={
                            port.direction === 'input' ? 'target' : 'source'
                          }
                          position={Position.Bottom}
                          id={port.id.replace(/[^a-zA-Z0-9-_]/g, '_')}
                          className="transition-all duration-200 hover:scale-150 hover:shadow-lg hover:z-50"
                          style={{
                            position: 'relative',
                            background:
                              port.type === 'power'
                                ? '#ef4444'
                                : port.type === 'communication'
                                  ? '#3b82f6'
                                  : '#6b7280',
                            border: '2px solid #ffffff',
                            width: '16px',
                            height: '16px',
                            boxShadow:
                              isHovered || selected
                                ? '0 0 0 2px rgba(239, 68, 68, 0.2)'
                                : 'none',
                          }}
                          isConnectable={true}
                        />
                      )}
                      <div
                        className="text-xs whitespace-nowrap bg-white/90 px-1.5 py-0.5 rounded shadow-sm mt-2"
                        style={{
                          fontSize: '10px',
                          fontWeight: '500',
                          color:
                            port.type === 'power'
                              ? '#ef4444'
                              : port.type === 'communication'
                                ? '#3b82f6'
                                : '#6b7280',
                        }}
                      >
                        {port.label}
                      </div>
                    </div>
                  );
                })}

                {/* Left ports */}
                {portsBySide.left.map((port, index) => (
                  <div
                    key={`${id}_left_${port.id}_${index}`}
                    className="absolute flex items-center"
                    style={{
                      left: '-8px',
                      top: `${30 + index * 60}px`,
                      transform: 'translateY(-50%)',
                    }}
                  >
                    <div
                      className="text-xs whitespace-nowrap bg-white/90 px-1 py-0.5 rounded shadow-sm"
                      style={{
                        position: 'absolute',
                        right: '100%',
                        marginRight: '4px',
                        fontSize: '8px',
                        fontWeight: '600',
                        color:
                          port.type === 'power'
                            ? '#ef4444'
                            : port.type === 'communication'
                              ? '#3b82f6'
                              : '#6b7280',
                        border: `1px solid ${
                          port.type === 'power'
                            ? '#fecaca'
                            : port.protocol === 'Analog'
                              ? '#fef3c7'
                              : port.protocol === 'Digital'
                                ? '#d1fae5'
                                : [
                                      'USB',
                                      'HDMI',
                                      'DisplayPort',
                                      'Ethernet',
                                      'VGA',
                                      'DVI',
                                      'Audio',
                                      '3.5mm',
                                      'Jack',
                                      'DC',
                                      'SD',
                                      'SIM',
                                    ].some((p) => port.protocol?.includes(p))
                                  ? '#e9d5ff'
                                  : port.type === 'communication'
                                    ? '#dbeafe'
                                    : '#e5e7eb'
                        }`,
                      }}
                    >
                      {port.label}
                    </div>
                    {port.direction === 'bidirectional' ? (
                      <>
                        <Handle
                          type="source"
                          position={Position.Left}
                          id={`${port.id.replace(/[^a-zA-Z0-9-_]/g, '_')}_source`}
                          className="transition-all duration-200 hover:scale-150 hover:shadow-lg hover:z-50"
                          style={{
                            position: 'absolute',
                            background:
                              port.type === 'power'
                                ? '#ef4444'
                                : port.type === 'communication'
                                  ? '#3b82f6'
                                  : '#6b7280',
                            border: '2px solid #ffffff',
                            width: '16px',
                            height: '16px',
                            boxShadow:
                              isHovered || selected
                                ? '0 0 0 2px rgba(59, 130, 246, 0.2)'
                                : 'none',
                          }}
                          isConnectable={true}
                        />
                        <Handle
                          type="target"
                          position={Position.Left}
                          id={`${port.id.replace(/[^a-zA-Z0-9-_]/g, '_')}_target`}
                          className="transition-all duration-200 hover:scale-150 hover:shadow-lg hover:z-50"
                          style={{
                            position: 'absolute',
                            background:
                              port.type === 'power'
                                ? '#ef4444'
                                : port.type === 'communication'
                                  ? '#3b82f6'
                                  : '#6b7280',
                            border: '2px solid #ffffff',
                            width: '16px',
                            height: '16px',
                            boxShadow:
                              isHovered || selected
                                ? '0 0 0 2px rgba(59, 130, 246, 0.2)'
                                : 'none',
                            zIndex: -1, // sourceハンドルの下に配置
                          }}
                          isConnectable={true}
                        />
                      </>
                    ) : (
                      <Handle
                        type={port.direction === 'input' ? 'target' : 'source'}
                        position={Position.Left}
                        id={port.id.replace(/[^a-zA-Z0-9-_]/g, '_')}
                        className="transition-all duration-200 hover:scale-150 hover:shadow-lg hover:z-50"
                        style={{
                          position: 'relative',
                          background:
                            port.type === 'power'
                              ? '#ef4444'
                              : port.type === 'communication'
                                ? '#3b82f6'
                                : '#6b7280',
                          border: '2px solid #ffffff',
                          width: '16px',
                          height: '16px',
                          boxShadow:
                            isHovered || selected
                              ? '0 0 0 2px rgba(37, 99, 235, 0.2)'
                              : 'none',
                        }}
                        isConnectable={true}
                      />
                    )}
                  </div>
                ))}
              </>
            );
          })()}
        </>
      ) : null}

      {/* Static handles - only show if no dynamic ports */}
      {(!nodeData.ports || nodeData.ports.length === 0) && (
        <>
          {/* 入力ハンドル（左側中心） */}
          <Handle
            type="target"
            position={Position.Left}
            id="input-center"
            className="transition-all duration-200 hover:scale-150 hover:shadow-lg hover:z-50"
            style={{
              top: '50%',
              background: isHovered || selected ? '#2563eb' : '#3b82f6',
              border: '2px solid #ffffff',
              width: '12px',
              height: '12px',
              boxShadow:
                isHovered || selected
                  ? '0 0 0 2px rgba(37, 99, 235, 0.2)'
                  : 'none',
            }}
            isConnectable={true}
          />

          {/* 出力ハンドル（右側中心） */}
          <Handle
            type="source"
            position={Position.Right}
            id="output-center"
            className="transition-all duration-200 hover:scale-150 hover:shadow-lg hover:z-50"
            style={{
              top: '50%',
              background: isHovered || selected ? '#059669' : '#10b981',
              border: '2px solid #ffffff',
              width: '12px',
              height: '12px',
              boxShadow:
                isHovered || selected
                  ? '0 0 0 2px rgba(5, 150, 105, 0.2)'
                  : 'none',
            }}
            isConnectable={true}
          />

          {/* 上側ハンドル（中心） */}
          <Handle
            type="target"
            position={Position.Top}
            id="input-top"
            className="transition-all duration-200 hover:scale-150 hover:shadow-lg hover:z-50"
            style={{
              left: '50%',
              background: isHovered || selected ? '#2563eb' : '#3b82f6',
              border: '2px solid #ffffff',
              width: '12px',
              height: '12px',
              boxShadow:
                isHovered || selected
                  ? '0 0 0 2px rgba(37, 99, 235, 0.2)'
                  : 'none',
            }}
          />

          {/* 下側ハンドル（中心） */}
          <Handle
            type="source"
            position={Position.Bottom}
            id="output-bottom"
            className="transition-all duration-200 hover:scale-150 hover:shadow-lg hover:z-50"
            style={{
              left: '50%',
              background: isHovered || selected ? '#059669' : '#10b981',
              border: '2px solid #ffffff',
              width: '12px',
              height: '12px',
              boxShadow:
                isHovered || selected
                  ? '0 0 0 2px rgba(5, 150, 105, 0.2)'
                  : 'none',
            }}
          />
        </>
      )}

      {/* ノードコンテンツ */}
      <Card
        className={`cursor-pointer transition-all duration-200 border-0 ${getNodeColor(nodeData.type as 'primary' | 'secondary' | 'warning' | 'accent', nodeData.isPending, nodeData.isPBSCategory, nodeData.categoryId as string, nodeData.isSearching, nodeData.searchError)} ${
          selected
            ? 'ring-4 ring-blue-500 shadow-xl bg-blue-50 border-blue-300'
            : isHovered
              ? 'shadow-md scale-[1.02]'
              : 'shadow-sm'
        }`}
        style={{
          width: '360px', // Fixed width for consistent layout (increased 50%)
          height: '180px', // Fixed height for consistent layout (increased 50%)
          overflow: 'hidden', // Prevent content overflow
          ...(selected
            ? {
                transform: 'scale(1.02)',
                zIndex: 1000, // 選択時は最前面（flowUtils.tsと統一）
                boxShadow:
                  '0 0 0 4px rgba(59, 130, 246, 0.3), 0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              }
            : {
                // Z-indexはflowUtils.tsで設定済み（重複削除）
              }),
        }}
        onDoubleClick={handleDoubleClick}
      >
        <CardHeader className="pb-2">
          {/* 🆕 AI検索中の状態表示 */}
          {nodeData.isSearching && (
            <div className="flex items-center gap-1 mb-2 px-2 py-1 bg-blue-100 rounded-md border border-blue-200">
              <Loader2 className="h-3 w-3 text-blue-600 animate-spin" />
              <span className="text-base font-medium text-blue-700">
                Searching specifications...
              </span>
            </div>
          )}

          {/* 🆕 検索エラーの状態表示 */}
          {nodeData.searchError && (
            <div className="flex items-center gap-1 mb-2 px-2 py-1 bg-red-100 rounded-md border border-red-200">
              <AlertCircle className="h-3 w-3 text-red-600" />
              <span className="text-base font-medium text-red-700">
                Search failed
              </span>
            </div>
          )}

          {/* 🆕 仮承認状態のヘッダー */}
          {nodeData.isPending && (
            <div className="flex items-center gap-1 mb-2 px-2 py-1 bg-orange-100 rounded-md border border-orange-200">
              <Clock className="h-3 w-3 text-orange-600" />
              <span className="text-base font-medium text-orange-700">
                Pending Approval
              </span>
            </div>
          )}

          <CardTitle className="text-lg font-medium flex items-center gap-2">
            {getNodeIcon(
              nodeData.type as 'primary' | 'secondary' | 'warning' | 'accent',
              nodeData.isPBSCategory,
              nodeData.categoryId as string,
            )}
            {/* インライン編集UI - ローカル状態版 */}
            {isEditing ? (
              <>
                <input
                  type="text"
                  id={`node-title-${id}`}
                  name={`node-title-${id}`}
                  value={localEditingValue}
                  onChange={(e) => setLocalEditingValue(e.target.value)}
                  onBlur={handleFinishEditing}
                  onKeyDown={handleKeyDown}
                  className="flex-1 px-2 py-1 text-lg border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              </>
            ) : (
              <>
                <span>{displayTitle}</span>
                {nodeData.isPBSCategory && (
                  <span className="text-base bg-amber-200 text-amber-800 px-2 py-1 rounded-full">
                    Category
                  </span>
                )}
                {/* 購入リンクドロップダウン */}
                {(() => {
                  // aiPricingを配列形式に正規化
                  const pricingArray = Array.isArray(nodeData.aiPricing)
                    ? nodeData.aiPricing
                    : nodeData.aiPricing?.purchaseUrl
                      ? [nodeData.aiPricing]
                      : [];

                  if (pricingArray.length === 0) return null;

                  // 1つだけの場合は直接リンク
                  if (
                    pricingArray.length === 1 &&
                    pricingArray[0].purchaseUrl
                  ) {
                    return (
                      <a
                        href={pricingArray[0].purchaseUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-auto text-green-500 hover:text-green-700 transition-colors"
                        title={`購入: ${pricingArray[0].supplier || 'Supplier'} ${pricingArray[0].unitPrice ? `$${pricingArray[0].unitPrice}` : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(pricingArray[0].purchaseUrl, '_blank');
                        }}
                      >
                        🛒
                      </a>
                    );
                  }

                  // 複数の場合はドロップダウン
                  return (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          className="ml-auto text-green-500 hover:text-green-700 transition-colors cursor-pointer"
                          title="view a purchasing options"
                          onClick={(e) => e.stopPropagation()}
                        >
                          🛒
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-64">
                        <DropdownMenuLabel>購入オプション</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {pricingArray.map(
                          (pricing, index) =>
                            pricing.purchaseUrl && (
                              <DropdownMenuItem
                                key={index}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(pricing.purchaseUrl, '_blank');
                                }}
                                className="cursor-pointer"
                              >
                                <div className="flex items-center justify-between w-full">
                                  <div className="flex items-center gap-2">
                                    <ShoppingCart className="w-4 h-4" />
                                    <span>
                                      {pricing.supplier ||
                                        `Option ${index + 1}`}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {pricing.unitPrice && (
                                      <span className="text-sm font-medium">
                                        ${pricing.unitPrice}
                                      </span>
                                    )}
                                    <ExternalLink className="w-3 h-3 text-gray-400" />
                                  </div>
                                </div>
                              </DropdownMenuItem>
                            ),
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  );
                })()}

                {/* 仕様書リンクアイコン */}
                {nodeData.datasheetUrl ? (
                  <a
                    href={nodeData.datasheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 text-blue-500 hover:text-blue-700 transition-colors"
                    title={`仕様書を開く: ${nodeData.datasheetUrl}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log(
                        'Opening datasheet URL:',
                        nodeData.datasheetUrl,
                      );
                      window.open(nodeData.datasheetUrl, '_blank');
                    }}
                  >
                    📄
                  </a>
                ) : (
                  <span
                    className="ml-2 text-gray-400 cursor-not-allowed"
                    title="specification link is not available"
                    onClick={(e) => {
                      e.stopPropagation();
                      console.log(
                        'No datasheet URL available for:',
                        nodeData.title,
                      );
                      console.log('NodeData:', nodeData);
                    }}
                  >
                    📄
                  </span>
                )}
              </>
            )}
          </CardTitle>

          {nodeData.subLabel && (
            <p className="text-base text-muted-foreground">
              {nodeData.subLabel}
            </p>
          )}

          {/* 🆕 AI提案理由の表示 */}
          {nodeData.isPending && nodeData.aiReasoning && (
            <div className="mt-2 p-2 bg-orange-50 rounded border border-orange-200">
              <p className="text-base text-orange-700">
                <strong>AI Suggestion:</strong> {nodeData.aiReasoning}
              </p>
            </div>
          )}

          {/* 電圧と通信方式の表示 */}
          <div className="mt-2 space-y-1">
            {nodeData.voltage && (
              <div className="flex items-center gap-1">
                <Zap className="h-5 w-5 text-yellow-500" />
                <span className="text-base font-medium text-gray-700">
                  {nodeData.voltage}
                </span>
              </div>
            )}
            {nodeData.communication && (
              <div className="flex items-center gap-1">
                <Cpu className="h-5 w-5 text-blue-500" />
                <span className="text-base font-medium text-gray-700">
                  {nodeData.communication}
                </span>
              </div>
            )}
            {nodeData.category && (
              <div className="flex items-center gap-1">
                <Tag className="h-5 w-5 text-green-500" />
                <span className="text-base font-medium text-gray-700">
                  {String(nodeData.category)}
                </span>
              </div>
            )}
          </div>

          {/* 🆕 承認/拒否ボタン */}
          {nodeData.isPending && (nodeData.onApprove || nodeData.onReject) && (
            <div className="flex gap-2 mt-3">
              {nodeData.onApprove && (
                <Button
                  size="sm"
                  onClick={async (e) => {
                    e.stopPropagation();
                    try {
                      nodeData.onApprove?.();
                    } catch (error) {
                      // エラーログは保持（本番環境で必要）
                      console.error('❌ Error during approval:', error);
                    }
                  }}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white h-7"
                >
                  <Check className="h-3 w-3 mr-1" />
                  Approve
                </Button>
              )}
              {nodeData.onReject && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    nodeData.onReject?.();
                  }}
                  className="flex-1 border-red-300 text-red-600 hover:bg-red-50 h-7"
                >
                  <X className="h-3 w-3 mr-1" />
                  Reject
                </Button>
              )}
            </div>
          )}
        </CardHeader>
      </Card>
    </div>
  );
});

SystemNode.displayName = 'SystemNode';

// 🚀 楽観的UI用のカスタムCSS（アニメーション定義）
if (typeof window !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes pulse-once {
      0% { transform: scale(1); }
      50% { transform: scale(1.05); }
      100% { transform: scale(1); }
    }
    
    @keyframes fade-in {
      0% { opacity: 0; transform: translateY(-10px); }
      100% { opacity: 1; transform: translateY(0); }
    }
    
    .animate-pulse-once {
      animation: pulse-once 0.6s ease-in-out;
    }
    
    .animate-fade-in {
      animation: fade-in 0.4s ease-out;
    }
  `;
  document.head.appendChild(style);
}
