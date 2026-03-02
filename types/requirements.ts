// Requirements definition related types

export type RequirementStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED'

// Question category types for new requirements flow
export type QuestionCategory = 
  | 'use_case_clarification'
  | 'reference_products'
  | 'feature_definition'
  | 'user_constraints'
  | 'technical_preferences'

// Category question structure
export interface CategoryQuestion {
  question: string
  intent: string
  exampleAnswers: string[]
  followUpQuestions?: string[]
}


// Document types for Auto Devlog integration
export type DocumentType = 'ai-reference' | 'requirements' | 'decision' | 'memo'

// Requirements document structure
export interface RequirementsDocument {
  id: string
  projectId: string
  title: string
  content: any // JSON content from rich text editor (TipTap/Lexical)
  contentHtml?: string // HTML cache for display
  contentText?: string // Plain text cache for search
  version: string
  status: RequirementStatus
  approvedAt?: Date
  approvedBy?: string
  createdAt: Date
  updatedAt: Date
  
  // Relations
  project?: any // Project type from existing system
  versions?: DocumentVersion[]
  comments?: Comment[]
}

// Document version tracking
export interface DocumentVersion {
  id: string
  documentId: string
  version: string
  content: any // JSON content
  contentHtml?: string
  changes?: any // Diff information
  createdBy: string
  createdAt: Date
  
  // Relations
  document?: RequirementsDocument
  user?: any // User type from existing system
}

// Comments on requirements
export interface Comment {
  id: string
  documentId: string
  threadId?: string // For threading support
  content: string
  selection?: any // Text range selection JSON
  resolved: boolean
  createdBy: string
  createdAt: Date
  updatedAt: Date
  
  // Relations
  document?: RequirementsDocument
  user?: any // User type from existing system
}


// Auto Devlog document structure
export interface DevLogDocument {
  id: string
  type: DocumentType
  title: string
  content: string
  metadata: {
    createdAt: string
    updatedAt: string
    author: string
    approvalStatus?: 'draft' | 'pending' | 'approved'
    version?: string
  }
}

// Requirements definition action for AI intent
export interface RequirementsAction {
  action: 'create' | 'update' | 'review' | 'approve' | 'question'
  context?: string
  targetSection?: string
}

// Editor content structure
export interface EditorContent {
  type: string
  content: any[]
  // TipTap/Lexical JSON structure
}

// Editor selection for collaborative editing
export interface EditorSelection {
  anchor: number
  head: number
  userId?: string
}

// Collaborative cursor
export interface CollaborativeCursor {
  userId: string
  userName: string
  color: string
  position: EditorSelection
}

// Requirements creation request
export interface CreateRequirementsRequest {
  projectId: string
  initialPrompt: string
  language?: string // User's language preference
}

// Requirements update request
export interface UpdateRequirementsRequest {
  content: EditorContent
  status?: RequirementStatus
  version?: string
}

// Requirements approval request
export interface ApproveRequirementsRequest {
  approvedBy: string
  comments?: string
}

// Requirements search parameters
export interface RequirementsSearchParams {
  projectId?: string
  status?: RequirementStatus
  searchTerm?: string
  createdAfter?: Date
  createdBefore?: Date
  approvedBy?: string
}

// AI question generation structure
export interface AIQuestion {
  id: string
  question: string
  intent: string // Why this information is needed
  exampleAnswers?: string[]
  priority: number
  answered: boolean
  answer?: string
}

// Requirements sections for structured view
export interface RequirementsSection {
  id: string
  title: string
  type: 'system' | 'hardware' | 'software' | 'interface'
  content: string
  completeness: number // 0-100
  dependencies: string[] // IDs of dependent sections
  warnings?: string[]
}