"use client"

import { useStores } from '@/hooks/useStores'
import { useCanvasManagement } from '@/hooks/useCanvasManagement'
import { useChatManagement } from '@/hooks/useChatManagement'
import { useProjectManagement } from '@/hooks/useProjectManagement'
import { useLLMState } from '@/hooks/useLLMState'
import { useUIState } from '@/hooks/useUIState'
import { useHistoryManager } from '@/hooks/useHistoryManager'
import { useSoftwareContext } from '@/hooks/useSoftwareContext'
import { useAutoSave } from '@/hooks/useAutoSave'

// 全状態の型定義
export interface AppState {
  canvasState: ReturnType<typeof useCanvasManagement>
  chatState: ReturnType<typeof useChatManagement>
  projectState: ReturnType<typeof useProjectManagement>
  llmState: ReturnType<typeof useLLMState>
  uiState: ReturnType<typeof useUIState>
  historyManager: ReturnType<typeof useHistoryManager>
  softwareState: ReturnType<typeof useSoftwareContext>
  autoSave: ReturnType<typeof useAutoSave>
}

// Legacy hooks for backward compatibility
// These will gradually be replaced with direct store usage
export function useAppState(): AppState {
  const canvasState = useCanvasManagement()
  const chatState = useChatManagement()
  const projectState = useProjectManagement()
  const llmState = useLLMState()
  const uiState = useUIState()
  const historyManager = useHistoryManager({ maxHistorySize: 100 })
  const softwareState = useSoftwareContext()
  
  const autoSave = useAutoSave({
    nodes: canvasState.nodes,
    connections: canvasState.connections,
    chatMessages: chatState.chatMessages,
    currentProject: projectState.currentProject,
    isSaving: projectState.isSaving,
    setIsSaving: projectState.setIsSaving,
    isDataLoaded: projectState.isDataLoaded,
    isProcessing: uiState.isProcessing
  })
  
  return {
    canvasState,
    chatState,
    projectState,
    llmState,
    uiState,
    historyManager,
    softwareState,
    autoSave
  }
}

// New unified hook that uses Zustand stores directly
export function useAppStateDetails() {
  // Get everything from the unified store hook
  const stores = useStores()
  
  // Return flattened store data for backward compatibility
  return {
    // PBS関連
    selectedTreeItem: stores.selectedTreeItem,
    editingItemId: stores.editingItemId,
    editingValue: stores.editingValue,
    expandedSections: stores.expandedSections,
    setSelectedTreeItem: stores.setSelectedTreeItem,
    setEditingItemId: stores.setEditingItemId,
    setEditingValue: stores.setEditingValue,
    setExpandedSections: stores.setExpandedSections,
    
    // キャンバス関連
    nodes: stores.nodes,
    setNodes: stores.setNodes,
    onNodesChange: stores.onNodesChange,
    connections: stores.connections,
    selectedNode: stores.selectedNode,
    failedConnections: stores.failedConnections,
    deletedNodeIds: stores.deletedNodeIds,
    setConnections: stores.setConnections,
    setSelectedNode: stores.setSelectedNode,
    setFailedConnections: stores.setFailedConnections,
    setDeletedNodeIds: stores.setDeletedNodeIds,
    flowKey: stores.flowKey,
    setFlowKey: stores.setFlowKey,
    
    // チャット関連
    chatMessages: stores.chatMessages,
    isChatActive: stores.isChatActive,
    currentMessage: stores.currentMessage,
    chatThreads: stores.chatThreads,
    currentThreadId: stores.currentThreadId,
    showThreads: stores.showThreads,
    chatLimit: stores.chatLimit,
    selectedFiles: stores.selectedFiles,
    uploadStatus: stores.uploadStatus,
    filePreviewUrls: stores.filePreviewUrls,
    setChatMessages: stores.setChatMessages,
    setIsChatActive: stores.setIsChatActive,
    setCurrentMessage: stores.setCurrentMessage,
    setChatThreads: stores.setChatThreads,
    setCurrentThreadId: stores.setCurrentThreadId,
    setShowThreads: stores.setShowThreads,
    setChatLimit: stores.setChatLimit,
    handleFileSelect: stores.handleFileSelect,
    clearFiles: stores.clearFiles,
    setUploadStatus: stores.setUploadStatus,
    
    // プロジェクト関連
    currentProject: stores.currentProject,
    isDataLoaded: stores.isDataLoaded,
    isSaving: stores.isSaving,
    setCurrentProject: stores.setCurrentProject,
    setIsDataLoaded: stores.setIsDataLoaded,
    setIsSaving: stores.setIsSaving,
    triggerManualSave: stores.triggerManualSave,
    
    // LLM関連
    isAnalyzing: stores.isAnalyzing,
    llmStatus: stores.llmStatus,
    hardwareContextStatus: stores.hardwareContextStatus,
    setIsAnalyzing: stores.setIsAnalyzing,
    setLlmStatus: stores.setLlmStatus,
    setHardwareContextStatus: stores.setHardwareContextStatus,
    
    // UI関連
    activeTab: stores.activeTab,
    isProcessing: stores.isProcessing,
    showAnalyzingPopup: stores.showAnalyzingPopup,
    setActiveTab: stores.setActiveTab,
    setIsProcessing: stores.setIsProcessing,
    setShowAnalyzingPopup: stores.setShowAnalyzingPopup,
    
    // 履歴管理
    historyManager: null, // Will use store's history instead
    
    // ソフトウェアコンテキスト関連
    softwareContext: stores.softwareContext,
    isAnalyzingRepo: stores.isAnalyzingRepo,
    analysisError: stores.analysisError,
    updateSoftwareContext: stores.updateSoftwareContext,
    analyzeGitHubRepo: stores.analyzeGitHubRepo,
    clearGitHubAnalysis: stores.clearGitHubAnalysis,
    resetSoftwareContext: stores.resetSoftwareContext,
  }
}