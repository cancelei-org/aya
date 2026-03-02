'use client';

import { lazy, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { TopBar } from '@/components/layout/TopBar';
import { Sidebar } from '@/components/layout/Sidebar';
import { useStores } from '@/hooks/useStores';
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels';
import { ReactFlowProvider } from '@xyflow/react';
import { handleSignOut } from '@/utils/ui/unifiedUiUtils';
import type { Session } from 'next-auth';

// Dynamic imports for heavy components
const MainCanvas = dynamic(
  () =>
    import('@/components/canvas/MainCanvas').then((module) => ({
      default: module.MainCanvas,
    })),
  {
    loading: () => (
      <div className="flex-1 flex items-center justify-center">
        Loading canvas...
      </div>
    ),
    ssr: false,
  },
);

const ChatPanel = dynamic(
  () =>
    import('@/components/chat/ChatPanel').then((module) => ({
      default: module.ChatPanel,
    })),
  {
    loading: () => (
      <div className="flex-1 flex items-center justify-center">
        Loading chat...
      </div>
    ),
    ssr: false,
  },
);

// Minimal props - everything else comes from stores
interface AppLayoutProps {
  session: Session | null;
  onApprove?: (
    requirementId: string,
    document: {
      contentText?: string;
      content?: string;
      id: string;
    },
  ) => void;
}

// メインレイアウトコンポーネント
export function AppLayout({ session, onApprove }: AppLayoutProps) {
  console.log('🟡 [AppLayout] Initialized with onApprove:', typeof onApprove);
  // Get all state from stores
  const stores = useStores();
  const {
    // Canvas
    nodes,
    setNodes,
    onNodesChange,
    connections,
    setConnections,
    selectedNode,
    setSelectedNode,
    failedConnections,
    setFailedConnections,
    deletedNodeIds,
    setDeletedNodeIds,
    flowKey,

    // PBS Tree
    selectedTreeItem,
    setSelectedTreeItem,
    editingItemId,
    setEditingItemId,
    editingValue,
    setEditingValue,
    expandedSections,
    setExpandedSections,

    // Chat
    chatMessages,
    setChatMessages,
    chatThreads,
    setChatThreads,
    currentMessage,
    setCurrentMessage,
    isChatActive,
    setIsChatActive,
    currentThreadId,
    setCurrentThreadId,
    showThreads,
    setShowThreads,
    chatLimit,
    selectedFiles,
    uploadStatus,
    setUploadStatus,
    filePreviewUrls,
    handleFileSelect,
    clearFiles,
    handleSendMessage,

    // Project
    currentProject,
    isSaving,
    setIsSaving,

    // UI
    activeTab,
    setActiveTab,
    isProcessing,
    setIsProcessing,
    isAnalyzing,
    showAnalyzingPopup,
    setShowAnalyzingPopup,
    llmStatus,
    hardwareContextStatus,

    // Software Context
    softwareContext,
    isAnalyzingRepo,
    analysisError,
    updateSoftwareContext,
    analyzeGitHubRepo,
    clearGitHubAnalysis,
    resetSoftwareContext,

    // History
    canUndo,
    canRedo,
    handleUndo: onUndo,
    handleRedo: onRedo,
    deletionInProgressRef,
  } = stores;

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* 上部ナビゲーションバー - Now with no props! TopBar uses stores directly */}
      <TopBar />

      <div className="flex-1 min-h-0">
        <PanelGroup direction="horizontal">
          {/* 左パネル（１５％〜２５％） */}
          <Panel defaultSize={15} minSize={15} maxSize={25} className="flex">
            {/* Sidebar also uses stores directly now */}
            <Sidebar session={session} />
          </Panel>

          {/* PBS-MainCanvas間のリサイズハンドル */}
          <PanelResizeHandle className="w-2 bg-gray-200 hover:bg-blue-300 active:bg-blue-400 cursor-col-resize transition-colors duration-200 flex items-center justify-center group">
            <div className="w-1 h-8 bg-gray-400 group-hover:bg-blue-500 rounded transition-colors duration-200"></div>
          </PanelResizeHandle>

          {/* 中央パネル（３０％から７０％） */}
          <Panel defaultSize={60} minSize={30} maxSize={70} className="flex">
            <ReactFlowProvider>
              {/* MainCanvas also uses stores directly */}
              <MainCanvas activeTab={activeTab} onApprove={onApprove} />
            </ReactFlowProvider>
          </Panel>

          {/* MainCanvas-ChatPanel間のリサイズハンドル */}
          <PanelResizeHandle className="w-2 bg-gray-200 hover:bg-blue-300 active:bg-blue-400 cursor-col-resize transition-colors duration-200 flex items-center justify-center group">
            <div className="w-1 h-8 bg-gray-400 group-hover:bg-blue-500 rounded transition-colors duration-200"></div>
          </PanelResizeHandle>

          {/* 右パネル（20%から30%） */}
          <Panel defaultSize={25} minSize={20} maxSize={30} className="flex">
            {/* ChatPanel also uses stores directly */}
            <ChatPanel />
          </Panel>
        </PanelGroup>
      </div>

      {/* AI Processing Status - 右上に進捗表示 (5016df0 style) */}
      {(isAnalyzing || llmStatus.isRunning) && (
        <div className="fixed top-20 right-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg p-6 shadow-xl z-50 flex items-center space-x-3 min-w-[360px]">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
          <div className="flex-1">
            <div className="font-semibold text-lg">AI System Generation</div>
            <div className="text-base opacity-90">
              {(() => {
                // Convert technical stages to user-friendly messages
                const task = llmStatus.currentTask?.toLowerCase() || '';
                if (task.includes('stage 1') || task.includes('extract')) {
                  return 'Analyzing requirements and extracting components...';
                } else if (
                  task.includes('stage 2-1') ||
                  task.includes('spec')
                ) {
                  return 'Adding technical specifications to components...';
                } else if (
                  task.includes('stage 2-2') ||
                  task.includes('connection')
                ) {
                  return 'Calculating optimal connections between components...';
                } else if (
                  task.includes('stage 2-3') ||
                  task.includes('layout') ||
                  task.includes('optim')
                ) {
                  return 'Optimizing visual layout and arrangement...';
                } else if (
                  task.includes('enhanc') ||
                  task.includes('dynamic') ||
                  task.includes('port')
                ) {
                  return 'Enhancing with dynamic ports and real-time pricing...';
                } else if (task.includes('finaliz')) {
                  return 'Finalizing system design...';
                } else {
                  return (
                    llmStatus.currentTask || 'Initializing system generation...'
                  );
                }
              })()}
            </div>

            {/* Progress bar with percentage and time estimate */}
            <div className="mt-2">
              <div className="flex justify-between items-center text-sm opacity-75 mb-1">
                <span>
                  {(() => {
                    // Calculate percentage based on current task
                    const task = llmStatus.currentTask?.toLowerCase() || '';
                    let percentage = 5;
                    if (task.includes('stage 1') || task.includes('extract'))
                      percentage = 15;
                    else if (
                      task.includes('stage 2-1') ||
                      task.includes('spec')
                    )
                      percentage = 30;
                    else if (
                      task.includes('stage 2-2') ||
                      task.includes('connection')
                    )
                      percentage = 45;
                    else if (
                      task.includes('stage 2-3') ||
                      task.includes('optim') ||
                      task.includes('layout')
                    )
                      percentage = 60;
                    else if (
                      task.includes('enhanc') ||
                      task.includes('dynamic') ||
                      task.includes('port')
                    )
                      percentage = 85;
                    else if (task.includes('finaliz')) percentage = 98;

                    // Use actual step/total if available
                    if (llmStatus.currentStep && llmStatus.totalSteps) {
                      percentage = Math.round(
                        (llmStatus.currentStep / llmStatus.totalSteps) * 100,
                      );
                    }

                    return `${percentage}% Complete`;
                  })()}
                </span>
                <span>Est. 3-4 minutes</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-2">
                <div
                  className="bg-white rounded-full h-2 transition-all duration-500 ease-out relative overflow-hidden"
                  style={{
                    width: `${(() => {
                      const task = llmStatus.currentTask?.toLowerCase() || '';
                      let percentage = 5;
                      if (task.includes('stage 1') || task.includes('extract'))
                        percentage = 15;
                      else if (
                        task.includes('stage 2-1') ||
                        task.includes('spec')
                      )
                        percentage = 30;
                      else if (
                        task.includes('stage 2-2') ||
                        task.includes('connection')
                      )
                        percentage = 45;
                      else if (
                        task.includes('stage 2-3') ||
                        task.includes('optim') ||
                        task.includes('layout')
                      )
                        percentage = 60;
                      else if (
                        task.includes('enhanc') ||
                        task.includes('dynamic') ||
                        task.includes('port')
                      )
                        percentage = 85;
                      else if (task.includes('finaliz')) percentage = 98;

                      if (llmStatus.currentStep && llmStatus.totalSteps) {
                        percentage = Math.round(
                          (llmStatus.currentStep / llmStatus.totalSteps) * 100,
                        );
                      }

                      return percentage;
                    })()}%`,
                  }}
                >
                  {/* Animated shimmer effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Export as default for backward compatibility
export default AppLayout;
