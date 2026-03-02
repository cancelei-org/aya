// チャット・メッセージ・ファイル関連の型定義

// チャットメッセージ
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  attachments?: FileAttachment[];
}

// ファイル添付
export interface FileAttachment {
  id: string;
  type: 'image' | 'pdf' | 'excel';
  filename: string;
  size: number;
  url?: string;
  content?: string;
  uploadProgress?: number;
}

// アップロード状態
export interface UploadStatus {
  isUploading: boolean;
  progress: number;
  error?: string;
}

// チャット制限
export interface ChatLimit {
  isPremium: boolean;
  chatCount: number;
  canChat?: boolean;
}

// LLM処理状態
export interface LLMStatus {
  isRunning: boolean;
  currentTask: string;
  currentStep?: number;
  totalSteps?: number;
}

// ハードウェアコンテキスト状態
export interface HardwareContextStatus {
  isLoading: boolean;
  componentCount: number;
  summary: string;
}

// 失敗した接続
export interface FailedConnection {
  from: string;
  to: string;
  reason: string;
  suggestions?: string[];
}
