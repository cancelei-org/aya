// API・外部連携・レスポンス関連の型定義

import type { Project } from './project'
import type { ChatMessage } from './chat'

// API レスポンス
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// 型付きAPIレスポンス
export type ProjectResponse = ApiResponse<Project>
export type ChatResponse = ApiResponse<ChatMessage[]>

// ライブラリタイプ
export type LibraryType = 'arduino' | 'python' | 'nodejs' | 'cpp' | 'other'

// 検出されたライブラリ
export interface DetectedLibrary {
  name: string                // GitHub解析: 'WiFi.h', 'tensorflow', 'opencv-python'
  version?: string            // GitHub解析: '2.4.1'
  type: LibraryType          // GitHub解析: 'arduino', 'python', 'nodejs'
  purpose: string            // 推定: 'networking', 'machine_learning'
  hardwareRequirements?: string[] // 推定: ['WiFi Module', 'Camera']
}

// ユーザーシステム要件
export interface UserSystemRequirements {
  targetOS: string            // ユーザー入力: 'Windows 11, macOS, Ubuntu 22.04'
  targetCPU: string           // ユーザー入力: 'Intel i5 8th gen or better'
  targetGPU?: string          // ユーザー入力: 'RTX 3060 or better' (オプション)
  targetRAM?: string          // ユーザー入力: '8GB or more'
  notes?: string              // ユーザー入力: 'Additional requirements...'
}

// ソフトウェアコンテキスト
export interface SoftwareContext {
  // ユーザー入力部分
  userRequirements: UserSystemRequirements
  
  // GitHub解析部分
  detectedLibraries: DetectedLibrary[]
  githubRepoUrl?: string
  lastAnalyzed?: string
}