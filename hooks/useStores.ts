import { useCallback } from 'react'
import {
  useCanvasStore,
  useChatStore,
  useProjectStore,
  useUIStore,
  useSoftwareContextStore,
  useHistoryStore
} from '@/stores'
import type { ChatMessage, FileAttachment } from '@/types'

/**
 * Custom hook that provides a unified interface to all stores
 * This helps with migration from the old prop-drilling system
 */
export function useStores() {
  // Get all store states
  const canvasStore = useCanvasStore()
  const chatStore = useChatStore()
  const projectStore = useProjectStore()
  const uiStore = useUIStore()
  const softwareStore = useSoftwareContextStore()
  const historyStore = useHistoryStore()
  
  // Create unified handlers that might need to coordinate between stores
  const handleSendMessage = useCallback(async (
    message: string | ChatMessage,
    files?: FileList | null,
    skipAnalysis?: boolean
  ) => {
    // Set processing state
    uiStore.setIsProcessing(true)
    
    try {
      // Prepare the message
      const messageObj: ChatMessage = typeof message === 'string'
        ? {
            id: `msg-${Date.now()}`,
            content: message,
            role: 'user',
            timestamp: new Date().toISOString()
          }
        : message
      
      // Add to chat store
      chatStore.addMessage(messageObj)
      
      // Handle file attachments if any
      if (files && files.length > 0) {
        chatStore.handleFileSelect(files)
      }
      
      // Clear current message
      chatStore.setCurrentMessage('')
      
      // Save chat messages to database immediately
      if (projectStore.currentProject?.id) {
        try {
          console.log('💾 Saving chat message to database...')
          const { saveProjectData } = await import('@/utils/project/projectUtils')
          await saveProjectData(
            canvasStore.connections,
            projectStore.currentProject,
            canvasStore.nodes,
            chatStore.chatMessages,
            projectStore.isSaving,
            projectStore.setIsSaving
          )
          console.log('✅ Chat message saved to database')
        } catch (saveError) {
          console.error('Failed to save chat message:', saveError)
          // Don't throw - allow chat to continue even if save fails
        }
      }
      
      // Here you would typically call your API
      // For now, we'll just simulate the response
      
      // Add to history
      historyStore.addToHistory({
        type: 'chat',
        data: messageObj,
        description: `Message sent: ${messageObj.content.substring(0, 50)}...`
      })
      
    } catch (error) {
      console.error('Error sending message:', error)
      uiStore.setGlobalError('Failed to send message')
    } finally {
      uiStore.setIsProcessing(false)
    }
  }, [chatStore, uiStore, historyStore, projectStore, canvasStore])
  
  const handleUndo = useCallback(() => {
    const entry = historyStore.undo()
    if (entry) {
      // Apply the undo based on type
      switch (entry.type) {
        case 'nodes':
          canvasStore.setNodes(entry.data)
          break
        case 'connections':
          canvasStore.setConnections(entry.data)
          break
        case 'chat':
          chatStore.setChatMessages(entry.data)
          break
        case 'composite':
          // Handle composite changes
          if (entry.data.nodes) canvasStore.setNodes(entry.data.nodes)
          if (entry.data.connections) canvasStore.setConnections(entry.data.connections)
          if (entry.data.messages) chatStore.setChatMessages(entry.data.messages)
          break
      }
    }
  }, [historyStore, canvasStore, chatStore])
  
  const handleRedo = useCallback(() => {
    const entry = historyStore.redo()
    if (entry) {
      // Apply the redo based on type
      switch (entry.type) {
        case 'nodes':
          canvasStore.setNodes(entry.data)
          break
        case 'connections':
          canvasStore.setConnections(entry.data)
          break
        case 'chat':
          chatStore.setChatMessages(entry.data)
          break
        case 'composite':
          // Handle composite changes
          if (entry.data.nodes) canvasStore.setNodes(entry.data.nodes)
          if (entry.data.connections) canvasStore.setConnections(entry.data.connections)
          if (entry.data.messages) chatStore.setChatMessages(entry.data.messages)
          break
      }
    }
  }, [historyStore, canvasStore, chatStore])
  
  const analyzeGitHubRepo = useCallback(async (repoUrl: string) => {
    uiStore.setIsAnalyzingRepo(true)
    uiStore.setAnalysisError(null)
    
    try {
      await softwareStore.analyzeGitHubRepo(repoUrl)
      uiStore.addNotification('success', 'GitHub repository analyzed successfully')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to analyze repository'
      uiStore.setAnalysisError(errorMessage)
      uiStore.addNotification('error', errorMessage)
    } finally {
      uiStore.setIsAnalyzingRepo(false)
    }
  }, [softwareStore, uiStore])
  
  return {
    // Canvas store
    ...canvasStore,
    
    // Chat store
    ...chatStore,
    
    // Project store
    ...projectStore,
    
    // UI store
    ...uiStore,
    
    // Software context store
    softwareContext: softwareStore.softwareContext,
    updateSoftwareContext: softwareStore.updateSoftwareContext,
    resetSoftwareContext: softwareStore.resetSoftwareContext,
    clearGitHubAnalysis: softwareStore.clearGitHubAnalysis,
    
    // History store
    canUndo: historyStore.canUndo,
    canRedo: historyStore.canRedo,
    
    // Unified handlers
    handleSendMessage,
    handleUndo,
    handleRedo,
    analyzeGitHubRepo,
    
    // Deletion tracking ref (for compatibility)
    deletionInProgressRef: {
      current: historyStore.deletionInProgress
    }
  }
}