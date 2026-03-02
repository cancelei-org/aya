import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { ActiveTab, LLMStatus, HardwareContextStatus } from '@/types'

interface UIState {
  // Tab management
  activeTab: ActiveTab
  setActiveTab: (tab: ActiveTab) => void
  
  // Processing states
  isProcessing: boolean
  setIsProcessing: (processing: boolean) => void
  isAnalyzing: boolean
  setIsAnalyzing: (analyzing: boolean) => void
  isAnalyzingRepo: boolean
  setIsAnalyzingRepo: (analyzing: boolean) => void
  
  // Popups and modals
  showAnalyzingPopup: boolean
  setShowAnalyzingPopup: (show: boolean) => void
  
  // LLM status
  llmStatus: LLMStatus
  setLlmStatus: (status: LLMStatus) => void
  
  // Hardware context status
  hardwareContextStatus: HardwareContextStatus
  setHardwareContextStatus: (status: HardwareContextStatus) => void
  
  // Error states
  analysisError: string | null
  setAnalysisError: (error: string | null) => void
  globalError: string | null
  setGlobalError: (error: string | null) => void
  
  // Notifications
  notifications: Array<{
    id: string
    type: 'info' | 'warning' | 'error' | 'success'
    message: string
    timestamp: number
  }>
  addNotification: (type: 'info' | 'warning' | 'error' | 'success', message: string) => void
  removeNotification: (id: string) => void
  clearNotifications: () => void
}

export const useUIStore = create<UIState>()(
  devtools(
    (set, get) => ({
      // Tab management
      activeTab: 'system',  // Changed from 'canvas' to 'system' to show content on initial load
      setActiveTab: (tab) => set({ activeTab: tab }),
      
      // Processing states
      isProcessing: false,
      setIsProcessing: (processing) => set({ isProcessing: processing }),
      isAnalyzing: false,
      setIsAnalyzing: (analyzing) => set({ isAnalyzing: analyzing }),
      isAnalyzingRepo: false,
      setIsAnalyzingRepo: (analyzing) => set({ isAnalyzingRepo: analyzing }),
      
      // Popups and modals
      showAnalyzingPopup: false,
      setShowAnalyzingPopup: (show) => set({ showAnalyzingPopup: show }),
      
      // LLM status
      llmStatus: 'idle',
      setLlmStatus: (status) => set({ llmStatus: status }),
      
      // Hardware context status
      hardwareContextStatus: 'idle',
      setHardwareContextStatus: (status) => set({ hardwareContextStatus: status }),
      
      // Error states
      analysisError: null,
      setAnalysisError: (error) => set({ analysisError: error }),
      globalError: null,
      setGlobalError: (error) => set({ globalError: error }),
      
      // Notifications
      notifications: [],
      addNotification: (type, message) => {
        const id = `${Date.now()}-${Math.random()}`
        set((state) => ({
          notifications: [
            ...state.notifications,
            {
              id,
              type,
              message,
              timestamp: Date.now()
            }
          ]
        }))
        
        // Auto-remove after 5 seconds for non-error notifications
        if (type !== 'error') {
          setTimeout(() => {
            const state = get()
            state.removeNotification(id)
          }, 5000)
        }
      },
      removeNotification: (id) => {
        set((state) => ({
          notifications: state.notifications.filter(n => n.id !== id)
        }))
      },
      clearNotifications: () => set({ notifications: [] }),
    }),
    {
      name: 'ui-store',
    }
  )
)