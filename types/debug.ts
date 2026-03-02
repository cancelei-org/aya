// Debug feature related types

import type { ChatMessage } from './index'

// Debug message types extending ChatMessage
export interface DebugChatMessage extends ChatMessage {
  type: 'user' | 'assistant' | 'debug-visual' | 'debug-audio'
  debugMetadata?: {
    imageBase64?: string
    audioTranscript?: string
    measurementData?: any
    ayaContext?: DebugContext
  }
}

// Debug context containing project information
export interface DebugContext {
  systemDesign: SystemNode[]
  partsInfo: PartInfo[]
  compatibilityIssues: Issue[]
  previousDebugSessions?: DebugSession[]
}

// System node from the design
export interface SystemNode {
  id: string
  name: string
  type: string
  specifications?: Record<string, any>
  connections?: string[]
}

// Part information
export interface PartInfo {
  id: string
  name: string
  category: string
  specifications: Record<string, any>
  price?: number
  availability?: string
}

// Compatibility issue
export interface Issue {
  id: string
  type: 'voltage' | 'protocol' | 'power' | 'other'
  severity: 'error' | 'warning' | 'info'
  description: string
  affectedNodes: string[]
}

// Debug session for history tracking
export interface DebugSession {
  id: string
  projectId: string
  startTime: Date
  endTime?: Date
  messages: DebugChatMessage[]
  diagnosis: string
  resolution?: string
  images: string[]
}

// Realtime API configuration for debug
export interface RealtimeDebugConfig {
  modalities: ['text', 'audio']
  voice: 'alloy'
  instructions: string // AYAコンテキスト含む
  tools: Array<{
    name: string
    function: any
  }>
}