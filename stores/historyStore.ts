import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

interface HistoryEntry {
  id: string
  timestamp: number
  type: 'nodes' | 'connections' | 'chat' | 'composite'
  data: any
  description?: string
}

interface HistoryState {
  // History stack
  history: HistoryEntry[]
  currentIndex: number
  maxHistorySize: number
  
  // History operations
  addToHistory: (entry: Omit<HistoryEntry, 'id' | 'timestamp'>) => void
  undo: () => HistoryEntry | null
  redo: () => HistoryEntry | null
  clearHistory: () => void
  
  // History state
  canUndo: boolean
  canRedo: boolean
  
  // Deletion tracking for proper undo/redo
  deletionInProgress: boolean
  setDeletionInProgress: (inProgress: boolean) => void
}

export const useHistoryStore = create<HistoryState>()(
  devtools(
    (set, get) => ({
      // History stack
      history: [],
      currentIndex: -1,
      maxHistorySize: 50,
      
      // History state
      canUndo: false,
      canRedo: false,
      
      // Deletion tracking
      deletionInProgress: false,
      setDeletionInProgress: (inProgress) => set({ deletionInProgress: inProgress }),
      
      // Add to history
      addToHistory: (entry) => {
        set((state) => {
          const newEntry: HistoryEntry = {
            ...entry,
            id: `${Date.now()}-${Math.random()}`,
            timestamp: Date.now()
          }
          
          // Remove any entries after current index (for new branch)
          const newHistory = [
            ...state.history.slice(0, state.currentIndex + 1),
            newEntry
          ]
          
          // Limit history size
          if (newHistory.length > state.maxHistorySize) {
            newHistory.shift()
          }
          
          const newIndex = newHistory.length - 1
          
          return {
            history: newHistory,
            currentIndex: newIndex,
            canUndo: newIndex > 0,
            canRedo: false
          }
        })
      },
      
      // Undo operation
      undo: () => {
        const state = get()
        if (!state.canUndo || state.currentIndex <= 0) {
          return null
        }
        
        const newIndex = state.currentIndex - 1
        const entry = state.history[newIndex]
        
        set({
          currentIndex: newIndex,
          canUndo: newIndex > 0,
          canRedo: true
        })
        
        return entry
      },
      
      // Redo operation
      redo: () => {
        const state = get()
        if (!state.canRedo || state.currentIndex >= state.history.length - 1) {
          return null
        }
        
        const newIndex = state.currentIndex + 1
        const entry = state.history[newIndex]
        
        set({
          currentIndex: newIndex,
          canUndo: true,
          canRedo: newIndex < state.history.length - 1
        })
        
        return entry
      },
      
      // Clear history
      clearHistory: () => {
        set({
          history: [],
          currentIndex: -1,
          canUndo: false,
          canRedo: false
        })
      },
    }),
    {
      name: 'history-store',
    }
  )
)