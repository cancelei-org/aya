// Export all stores from a single entry point
export { useCanvasStore } from './canvasStore'
export { useChatStore } from './chatStore'
export { useProjectStore } from './projectStore'
export { useUIStore } from './uiStore'
export { useSoftwareContextStore } from './softwareContextStore'
export { useHistoryStore } from './historyStore'

// Re-export types if needed
export type { default as CanvasState } from './canvasStore'
export type { default as ChatState } from './chatStore'
export type { default as ProjectState } from './projectStore'
export type { default as UIState } from './uiStore'
export type { default as SoftwareContextState } from './softwareContextStore'
export type { default as HistoryState } from './historyStore'