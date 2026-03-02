'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  ChevronDown,
  ChevronRight,
  Circle,
  Folder,
  FolderOpen,
} from 'lucide-react';
import { useStores } from '@/hooks/useStores';
import type { TreeNode } from '@/types';
import type { Session } from 'next-auth';
import { toggleSection } from '@/utils/ui/unifiedUiUtils';
import { computePBSFromNodes } from '@/utils/flow/pbsComputed';

interface SidebarProps {
  // Minimal props - only what can't be from stores
  session?: Session | null;
}

export const Sidebar: React.FC<SidebarProps> = ({ session }) => {
  // Get all state from stores
  const {
    nodes,
    connections,
    selectedTreeItem,
    expandedSections,
    setSelectedTreeItem,
    setExpandedSections,
    setSelectedNode,
    hardwareContextStatus,
    softwareContext,
    isAnalyzingRepo,
    analysisError,
    updateSoftwareContext: onSoftwareContextChange,
    analyzeGitHubRepo: onAnalyzeRepo,
    clearGitHubAnalysis: onClearRepoAnalysis,
    resetSoftwareContext: onResetSoftwareContext
  } = useStores()
  // 🚀 単一データソース: nodesはpropsから取得

  // 🚀 根本的解決: useRef + 手動比較でループ防止
  const lastNodesRef = useRef<string>('');
  const lastConnectionsRef = useRef<string>('');
  const [computedPBS, setComputedPBS] = useState<TreeNode[]>([]);

  useEffect(() => {
    const currentNodesHash = nodes
      .map((n) => `${n.id}:${n.data?.title || ''}`)
      .sort()
      .join('|');
    const currentConnectionsHash = connections
      .map((c) => `${c.fromId}-${c.toId}`)
      .sort()
      .join('|');

    // ハッシュが変わった時のみ再計算
    if (
      currentNodesHash !== lastNodesRef.current ||
      currentConnectionsHash !== lastConnectionsRef.current
    ) {
      const pbs = computePBSFromNodes(nodes, connections);
      setComputedPBS(pbs);

      lastNodesRef.current = currentNodesHash;
      lastConnectionsRef.current = currentConnectionsHash;
    }
  }, [nodes, connections]);

  // 🚀 単一データソース: 統一されたアイコン使用（関数外で定義してパフォーマンス向上）
  const DefaultIcon = Circle;

  const renderTreeNode = (node: TreeNode, level = 0) => {
    const isSelected = selectedTreeItem === node.id;
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedSections[node.id] ?? node.isExpanded ?? false;
    const isCategory = node.type === 'folder';
    const isComponent = node.type === 'component';

    return (
      <div key={node.id}>
        <div
          className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer hover:bg-accent group ${
            isSelected ? 'bg-accent text-accent-foreground' : ''
          } ${isComponent ? 'bg-blue-50 border-l-4 border-blue-400 ml-2' : ''}`}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          onClick={() => {
            setSelectedTreeItem(node.id);
            if (node.type === 'component') {
              setSelectedNode(node.id);
            }
          }}
        >
          {hasChildren && (
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0"
              onClick={(e) => {
                e.stopPropagation();
                toggleSection(node.id, setExpandedSections);
              }}
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </Button>
          )}
          {!hasChildren && <div className="w-4" />}

          {/* アイコンとラベルの表示を区別 */}
          {isCategory ? (
            <>
              {/* フォルダアイコンは展開状態に応じて変更 */}
              {isExpanded && hasChildren ? (
                <FolderOpen className="h-4 w-4 text-blue-600" />
              ) : node.type === 'folder' ? (
                <Folder className="h-4 w-4 text-blue-600" />
              ) : (
                React.createElement(DefaultIcon, {
                  className: 'h-4 w-4 text-gray-600',
                })
              )}
              <span className="text-sm flex-1 font-bold text-gray-800">
                {node.name}
              </span>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1">
                {React.createElement(DefaultIcon, {
                  className: 'h-3 w-3 text-green-600',
                })}
                <span className="text-xs px-1 py-0.5 bg-green-100 text-green-700 rounded">
                  Part
                </span>
              </div>
              <span className="text-sm flex-1 text-gray-700">{node.name}</span>
            </>
          )}
         
        </div>
        {hasChildren &&
          isExpanded &&
          node.children?.map((child) => renderTreeNode(child, level + 1))}
      </div>
    );
  };

  return (
    <div className="w-full border-r bg-background overflow-y-auto h-full">
      <div className="p-2 sm:p-4">
        <div className="mb-4">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold text-sm sm:text-base truncate">
                PBS
              </h2>
              <p className="text-xs text-muted-foreground mt-1 truncate">
                Product Breakdown Structure -{' '}
                {session?.user?.name || session?.user?.email}
              </p>
            </div>
            
          </div>
        </div>

        {/* Hardware Context Status - moved from ChatPanel */}
        <div className="mb-4 px-2 sm:px-3 py-2 border rounded-lg bg-muted/20">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            {hardwareContextStatus.componentCount > 0 ? (
              <>
                <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                <span className="truncate">
                  Sending {hardwareContextStatus.componentCount} component
                  {hardwareContextStatus.componentCount !== 1 ? 's' : ''} info
                  to LLM
                </span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0"></div>
                <span className="truncate">
                  No hardware context - LLM will ask for your specific
                  components
                </span>
              </>
            )}
          </div>
        </div>
{/* ソフトウェアの背景が伝わるようになるまでUIをコメントアウトしている。 */}
        {/* Software Context Panel */}
        {/* <div className="mb-4">
          <SoftwareContextPanel
            softwareContext={softwareContext}
            isAnalyzing={isAnalyzingRepo}
            analysisError={analysisError}
            onContextChange={onSoftwareContextChange}
            onAnalyzeRepo={onAnalyzeRepo}
            onClearAnalysis={onClearRepoAnalysis}
            onResetContext={onResetSoftwareContext}
          />
        </div> */}

        <div className="space-y-1">
          {computedPBS.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Folder className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-sm mb-2">No categories yet</p>
              <p className="text-xs text-gray-400 mb-2">
                Add nodes in System Diagram to see them here
              </p>
            </div>
          ) : (
            computedPBS.map(
              (
                section, // 🚀 computedPBSのみ使用
              ) => renderTreeNode(section, 0),
            )
          )}
        </div>
      </div>
    </div>
  );
};
