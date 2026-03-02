import { useState } from 'react'
import type { ChatMessage, FileAttachment, UploadStatus } from '@/types'

// チャットスレッドの型定義
type ChatThread = {
  id: string
  title: string
  messages: ChatMessage[]
  lastUpdated: string
  isPinned: boolean
}

// チャット制限の型定義
type ChatLimit = {
  canChat: boolean
  remainingChats: string | number
  chatCount: number
  isPremium: boolean
}

// チャット管理関連のカスタムフック
export const useChatManagement = () => {
  // チャット関連のstate
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [isChatActive, setIsChatActive] = useState(false)
  const [currentMessage, setCurrentMessage] = useState("")
  const [chatThreads, setChatThreads] = useState<ChatThread[]>([])
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null)
  const [showThreads, setShowThreads] = useState(false)
  const [chatLimit, setChatLimit] = useState<ChatLimit | null>(null)

  // ファイル関連のstate
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({
    isUploading: false,
    progress: 0
  })
  const [filePreviewUrls, setFilePreviewUrls] = useState<Record<string, string>>({})

  // ファイル選択処理
  const handleFileSelect = (files: FileList) => {
    const fileArray = Array.from(files)
    setSelectedFiles(fileArray)
    
    // プレビューURL生成（画像のみ）
    const newPreviewUrls: Record<string, string> = {}
    fileArray.forEach(file => {
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file)
        newPreviewUrls[file.name] = url
      }
    })
    setFilePreviewUrls(newPreviewUrls)
  }

  // ファイルクリア処理
  const clearFiles = () => {
    Object.values(filePreviewUrls).forEach(url => URL.revokeObjectURL(url))
    setSelectedFiles([])
    setFilePreviewUrls({})
    setUploadStatus({ isUploading: false, progress: 0 })
  }

  return {
    // States
    chatMessages,
    isChatActive,
    currentMessage,
    chatThreads,
    currentThreadId,
    showThreads,
    chatLimit,
    
    // ファイル関連のstates
    selectedFiles,
    uploadStatus,
    filePreviewUrls,
    
    // Setters
    setChatMessages,
    setIsChatActive,
    setCurrentMessage,
    setChatThreads,
    setCurrentThreadId,
    setShowThreads,
    setChatLimit,
    
    // ファイル関連の関数
    handleFileSelect,
    clearFiles,
    setUploadStatus,
  }
}