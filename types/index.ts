// 型定義の一元管理ファイル - 機能別分割版
// 全プロジェクトで使用される共通の型定義

import type React from "react"
import type { Node } from '@xyflow/react'
import type { Session } from 'next-auth'

// ============================================
// 直接インポートと再エクスポート
// ============================================

// プロジェクト・ユーザー・認証関連
import type { Project as ProjectType, User as UserType } from './project'
export type Project = ProjectType
export type User = UserType
export * from './project'

// 部品・PBS・発注関連
import type { 
  PBSNode as PBSNodeType, 
  TreeNode as TreeNodeType, 
  PartInfo as PartInfoType, 
  OrderStatus as OrderStatusType,
  ComponentPricing as ComponentPricingType,
  PricingContext as PricingContextType
} from './parts'
export type PBSNode = PBSNodeType
export type TreeNode = TreeNodeType  
export type PartInfo = PartInfoType
export type OrderStatus = OrderStatusType
export type ComponentPricing = ComponentPricingType
export type PricingContext = PricingContextType
export * from './parts'

// チャット・メッセージ・ファイル関連
import type {
  ChatMessage as ChatMessageType,
  ChatLimit as ChatLimitType,
  LLMStatus as LLMStatusType,
  HardwareContextStatus as HardwareContextStatusType,
  FailedConnection as FailedConnectionType,
  UploadStatus as UploadStatusType,
  FileAttachment as FileAttachmentType
} from './chat'
export type ChatMessage = ChatMessageType
export type ChatLimit = ChatLimitType
export type LLMStatus = LLMStatusType
export type HardwareContextStatus = HardwareContextStatusType
export type FailedConnection = FailedConnectionType
export type UploadStatus = UploadStatusType
export type FileAttachment = FileAttachmentType
export * from './chat'

// キャンバス・ノード・接続関連
import type {
  Connection as ConnectionType,
  NodeType as NodeTypeType,
  NodeData as NodeDataType,
  AppNode as AppNodeType
} from './canvas'
// 🚀 React Flow完全移行: CanvasNode型廃止済み
export type Connection = ConnectionType
export type NodeType = NodeTypeType
export type NodeData = NodeDataType
export type AppNode = AppNodeType
export * from './canvas'

// UI状態・フォーム・表示関連
import type {
  ActiveTab as ActiveTabType,
  HistoryState as HistoryStateType
} from './ui'
export type ActiveTab = ActiveTabType
export type HistoryState = HistoryStateType
export * from './ui'

// 互換性チェック・分析関連
import type {
  CompatibilityResult as CompatibilityResultType,
  CompatibilityIssue as CompatibilityIssueType
} from './compatibility'
export type CompatibilityResult = CompatibilityResultType
export type CompatibilityIssue = CompatibilityIssueType
export * from './compatibility'

// API・外部連携・レスポンス関連
import type {
  SoftwareContext as SoftwareContextType,
  ApiResponse as ApiResponseType
} from './api'
export type SoftwareContext = SoftwareContextType
export type ApiResponse<T> = ApiResponseType<T>
export * from './api'

// Debug feature related types
export * from './debug'

// Requirements definition related types
import type {
  RequirementsDocument as RequirementsDocumentType,
  RequirementStatus as RequirementStatusType,
  DocumentType as DocumentTypeType,
  DevLogDocument as DevLogDocumentType,
  RequirementsAction as RequirementsActionType,
  EditorContent as EditorContentType,
  CollaborativeCursor as CollaborativeCursorType
} from './requirements'
export type RequirementsDocument = RequirementsDocumentType
export type RequirementStatus = RequirementStatusType
export type DocumentType = DocumentTypeType
export type DevLogDocument = DevLogDocumentType
export type RequirementsAction = RequirementsActionType
export type EditorContent = EditorContentType
export type CollaborativeCursor = CollaborativeCursorType
export * from './requirements'

// ============================================
// コンポーネントProps関連の型定義
// ============================================

export interface TopBarProps {
  chatLimit: ChatLimit | null
  currentProject: Project | null
  isProcessing: boolean
  isSaving: boolean
  session: any
  handleSignOut: () => void
  activeTab: ActiveTab
  setActiveTab: React.Dispatch<React.SetStateAction<ActiveTab>>
  canUndo?: boolean
  canRedo?: boolean
  onUndo?: () => void
  onRedo?: () => void
}

// ✅ React Flow完全移行版MainCanvasProps - Node型直接使用
export interface MainCanvasProps {
  activeTab: ActiveTab
  nodes: Node<NodeData>[]  // MainCanvas.tsx で使用されている実際のprop名
  setCanvasNodes: (updaterOrNodes: Node<NodeData>[] | ((prev: Node<NodeData>[]) => Node<NodeData>[])) => void
  connections: Connection[]
  chatMessages: ChatMessage[]
  currentProject: Project | null
  isProcessing: boolean
  isSaving: boolean
  deletionInProgressRef: React.MutableRefObject<boolean>
  setConnections: React.Dispatch<React.SetStateAction<Connection[]>>
  // 🆕 編集関連の状態を追加
  editingItemId: string | null
  editingValue: string
  setEditingItemId: React.Dispatch<React.SetStateAction<string | null>>
  setEditingValue: React.Dispatch<React.SetStateAction<string>>
  setIsSaving: React.Dispatch<React.SetStateAction<boolean>>
  setIsProcessing: React.Dispatch<React.SetStateAction<boolean>>
  setActiveTab: React.Dispatch<React.SetStateAction<ActiveTab>>
  softwareContext: SoftwareContext | null
  flowKey?: number // React Flow強制更新用
  // 🆕 ChatPanel統合のため追加
  handleSendMessage?: (message: string | any, files?: FileList | null, skipAnalysis?: boolean) => Promise<void>
  onRequirementsApproval?: (requirementId: string, document: any) => void
}


// Chat thread type definition
export interface ChatThread {
  id: string
  title: string
  messages: ChatMessage[]
  lastUpdated: string
  isPinned: boolean
}

export interface ChatPanelProps {
  chatMessages: ChatMessage[]
  chatThreads: ChatThread[]
  currentMessage: string
  setCurrentMessage: React.Dispatch<React.SetStateAction<string>>
  handleSendMessage: (message: string | any, files?: FileList | null, skipAnalysis?: boolean) => Promise<void>
  isChatActive: boolean
  currentThreadId: string | null
  setChatThreads: React.Dispatch<React.SetStateAction<ChatThread[]>>
  setShowThreads: React.Dispatch<React.SetStateAction<boolean>>
  showThreads: boolean
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>
  setCurrentThreadId: React.Dispatch<React.SetStateAction<string | null>>
  setIsChatActive: React.Dispatch<React.SetStateAction<boolean>>
  llmStatus: LLMStatus
  hardwareContextStatus: HardwareContextStatus
  failedConnections: FailedConnection[]
  setFailedConnections: React.Dispatch<React.SetStateAction<FailedConnection[]>>
  connections: Connection[]
  setConnections: React.Dispatch<React.SetStateAction<Connection[]>>
  selectedFiles: File[]
  uploadStatus: UploadStatus
  filePreviewUrls: Record<string, string>
  handleFileSelect: (files: FileList) => void
  clearFiles: () => void
  setUploadStatus: React.Dispatch<React.SetStateAction<UploadStatus>>
  currentProject: Project | null
  onRequirementsApproval?: (requirementId: string, document: RequirementsDocument) => void
  session?: Session | null
}