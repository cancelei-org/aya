"use client"

import type React from "react"
import { Settings, Pin, PinOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { 
  handleNewChat,
  toggleThreadPin,
  handleSelectThread,
  startNewEmptyChat
} from '@/utils/chat/chatUtils'
import type {
  ChatMessage,
  LLMStatus,
  HardwareContextStatus,
  FailedConnection,
  NodeData,
  UploadStatus
} from '@/types'
import type { Node } from '@xyflow/react'
import type { PartSuggestion } from '@/utils/components/alternativePartsFinder'
import SuggestionCard from '@/components/cards/SuggestionCard'
import SuggestionModal from '@/components/modals/SuggestionModal'
import { FileUpload } from '@/components/management/FileUpload'

// ChatPanelUI専用のProps型定義
interface ChatPanelUIProps {
  // 基本的なチャット状態
  chatMessages: ChatMessage[]
  chatThreads: { id: string; name: string; messages: ChatMessage[] }[]
  currentMessage: string
  setCurrentMessage: (message: string) => void
  isChatActive: boolean
  currentThreadId: string | null
  showThreads: boolean
  llmStatus: LLMStatus
  hardwareContextStatus: HardwareContextStatus
  failedConnections: FailedConnection[]
  nodes: Node<NodeData>[]
  
  // ファイル関連
  selectedFiles: File[]
  uploadStatus: UploadStatus
  filePreviewUrls: Record<string, string>
  handleFileSelect: (files: FileList) => void
  clearFiles: () => void
  
  // 状態管理から取得
  panelRef: React.RefObject<HTMLDivElement>
  suggestions: PartSuggestion[]
  selectedSuggestion: PartSuggestion | null
  showSuggestionModal: boolean
  activeTab: 'context' | 'images'
  dynamicStyles: {
    messageMaxWidth: string
    contentPadding: string
    visualPadding: string
    fontSize: string
    iconSize: string
  }
  
  // アクション関数
  setChatThreads: React.Dispatch<React.SetStateAction<{ id: string; name: string; messages: ChatMessage[] }[]>>
  setShowThreads: React.Dispatch<React.SetStateAction<boolean>>
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>
  setCurrentThreadId: React.Dispatch<React.SetStateAction<string | null>>
  setIsChatActive: React.Dispatch<React.SetStateAction<boolean>>
  setActiveTab: (tab: 'context' | 'images') => void
  openSuggestionModal: (suggestion: PartSuggestion) => void
  closeSuggestionModal: () => void
  handleExtendedSendMessage: (message: string, files?: FileList | null) => Promise<void>
  handleAcceptSuggestion: (suggestionId: string, alternativeId: string) => Promise<void>
}

// ChatPanel UI表示専用コンポーネント
export function ChatPanelUI({
  chatMessages,
  chatThreads,
  currentMessage,
  setCurrentMessage,
  isChatActive,
  currentThreadId,
  showThreads,
  llmStatus,
  // hardwareContextStatus,
  // failedConnections,
  // nodes,
  selectedFiles,
  uploadStatus,
  filePreviewUrls,
  handleFileSelect,
  clearFiles,
  panelRef,
  suggestions,
  selectedSuggestion,
  showSuggestionModal,
  activeTab,
  dynamicStyles,
  setChatThreads,
  setShowThreads,
  setChatMessages,
  setCurrentThreadId,
  setIsChatActive,
  setActiveTab,
  openSuggestionModal,
  closeSuggestionModal,
  handleExtendedSendMessage,
  handleAcceptSuggestion
}: ChatPanelUIProps) {

  // 提案の拒否処理
  const handleRejectSuggestion = (suggestionId: string) => {
    // 実装は親コンポーネントで行う
    console.log('Rejecting suggestion:', suggestionId)
  }

  return (
    <div ref={panelRef} className="flex flex-col h-full min-h-0 w-full">
      {/* Chat Window */}
      <div className="flex-1 flex flex-col min-h-0 w-full">
        {/* Chat Header */}
        <div className="border-b bg-muted/30">
          <div className={`${dynamicStyles.contentPadding} py-2 flex items-center justify-between`}>
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-t-lg border border-b-0 text-sm ${llmStatus.isRunning ? 'bg-blue-50 border-blue-200' : 'bg-background'}`}>
              <div className={`w-2 h-2 rounded-full ${llmStatus.isRunning ? 'bg-blue-500 animate-pulse' : 'bg-green-500'}`}></div>
              <span className={llmStatus.isRunning ? 'text-blue-700 font-medium' : ''}>
                @Builder with AYA {llmStatus.isRunning && `- ${llmStatus.currentTask}`}
              </span>
            </div>
            {isChatActive && (
              <Button variant="ghost" size="sm" onClick={() => handleNewChat(isChatActive, chatMessages, currentThreadId, setChatThreads, setShowThreads, showThreads)} className="text-xs">
                New Chat
              </Button>
            )}
          </div>
        </div>

        {showThreads ? (
          <>
            {/* Chat Threads List */}
            <div className="flex-1 overflow-y-auto min-h-0">
              <div className={`${dynamicStyles.contentPadding} py-4`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-sm">Chat History</h3>
                  <Button variant="ghost" size="sm" onClick={() => startNewEmptyChat(setChatMessages, setIsChatActive, setCurrentMessage, setCurrentThreadId, setShowThreads)} className="text-xs">
                    + New Chat
                  </Button>
                </div>
                
                {chatThreads.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <p className="text-sm">No chat history yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {chatThreads
                      .sort((a, b) => {
                        if (a.isPinned && !b.isPinned) return -1
                        if (!a.isPinned && b.isPinned) return 1
                        return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
                      })
                      .map((thread) => (
                      <div
                        key={thread.id}
                        className="p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors relative"
                        onClick={() => handleSelectThread(thread.id, chatThreads, setChatMessages, setCurrentThreadId, setIsChatActive, setShowThreads)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm mb-1 truncate flex items-center gap-1">
                              {thread.isPinned && <Pin className="h-3 w-3 text-blue-500 flex-shrink-0" />}
                              <span className="truncate">{thread.title}</span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(thread.lastUpdated).toLocaleDateString()} • {thread.messages.length} messages
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 opacity-60 hover:opacity-100"
                            onClick={(e) => toggleThreadPin(thread.id, e, setChatThreads)}
                            title={thread.isPinned ? "Unpin thread" : "Pin thread"}
                          >
                            {thread.isPinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* Back Button */}
            <div className={`${dynamicStyles.contentPadding} py-4 border-t`}>
              <Button variant="outline" size="sm" onClick={() => setShowThreads(false)} className="w-full">
                Back to Chat
              </Button>
            </div>
          </>
        ) : !isChatActive ? (
          <>
            {/* Initial Chat State */}
            <div className="flex-1 overflow-y-auto p-6 flex items-center justify-center min-h-0">
              <div className="text-center text-muted-foreground">
                <Settings className={`h-12 w-12 mx-auto mb-4 opacity-50`} />
                <p className="text-base mb-2">Start conversation with Visual information to LLM</p>
                <p className="text-sm opacity-75">
                  You can ask questions about hardware design, request parts list analysis, component selection, and more.
                </p>
              </div>
            </div>

            {/* Toggle Tabs */}
            <div className={`${dynamicStyles.contentPadding} pb-2`}>
              <div className="flex items-center justify-between">
                <div className="flex space-x-1">
                  <Button 
                    variant={activeTab === 'context' ? 'default' : 'ghost'} 
                    size="sm" 
                    className="h-7 px-2 text-xs"
                    onClick={() => setActiveTab('context')}
                  >
                    Context
                  </Button>
                  <Button 
                    variant={activeTab === 'images' ? 'default' : 'ghost'} 
                    size="sm" 
                    className="h-7 px-2 text-xs"
                    onClick={() => setActiveTab('images')}
                  >
                    Files
                  </Button>
                </div>
                <span className="text-xs text-muted-foreground bg-green-50 px-2 py-1 rounded border border-green-200">
                  GPT-4.1 
                </span>
              </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'context' && (
              <div className={`${dynamicStyles.contentPadding} pb-4`}>
                <div className="text-center text-muted-foreground">
                  <div className="text-sm mb-2">Hardware Context</div>
                  <div className="text-xs opacity-75">
                    Current project context will be included in your conversation
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === 'images' && (
              <div className={`${dynamicStyles.contentPadding} pb-4`}>
                <FileUpload
                  selectedFiles={selectedFiles}
                  uploadStatus={uploadStatus}
                  filePreviewUrls={filePreviewUrls}
                  onFileSelect={handleFileSelect}
                  onClearFiles={clearFiles}
                />
              </div>
            )}
          </>
        ) : (
          <>
            {/* Active Chat Messages */}
            <div className="flex-1 overflow-y-auto min-h-0" style={{ scrollBehavior: 'smooth' }}>
              <div className={`${dynamicStyles.contentPadding} py-4 space-y-4`}>
                {chatMessages.map((message) => (
                  <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`${dynamicStyles.messageMaxWidth} ${message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'} rounded-lg ${dynamicStyles.contentPadding} py-2`}>
                      <div className={`${dynamicStyles.fontSize} whitespace-pre-wrap break-words`}>
                        {message.content}
                      </div>
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {message.attachments.map((attachment) => (
                            <div key={attachment.id} className="text-xs opacity-75">
                              📎 {attachment.filename}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Suggestions Display */}
            {suggestions.length > 0 && (
              <div className={`${dynamicStyles.contentPadding} py-2 border-t bg-muted/20`}>
                <div className="text-sm font-medium mb-2">💡 Alternative Parts Suggestions</div>
                <div className="space-y-2">
                  {suggestions.map((suggestion, index) => (
                    <SuggestionCard
                      key={index}
                      suggestion={suggestion}
                      onAccept={(alternativeId) => handleAcceptSuggestion(suggestion.originalPart, alternativeId)}
                      onReject={() => handleRejectSuggestion(suggestion.originalPart)}
                      onViewDetails={() => openSuggestionModal(suggestion)}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Message Input */}
        {(isChatActive || !showThreads) && (
          <div className={`border-t ${dynamicStyles.contentPadding} py-4`}>
            <div className="flex gap-2">
              <textarea
                id="chat-message-input"
                name="chat-message"
                autoComplete="off"
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                placeholder="Ask about hardware, compatibility, or request alternatives..."
                className={`flex-1 resize-none border rounded-md px-3 py-2 ${dynamicStyles.fontSize} min-h-[44px] max-h-32`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    if (currentMessage.trim()) {
                      handleExtendedSendMessage(currentMessage.trim())
                      setCurrentMessage('')
                    }
                  }
                }}
              />
              <Button
                onClick={() => {
                  if (currentMessage.trim()) {
                    handleExtendedSendMessage(currentMessage.trim())
                    setCurrentMessage('')
                  }
                }}
                disabled={!currentMessage.trim() || llmStatus.isRunning}
                size="sm"
                className="self-end"
              >
                Send
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Suggestion Modal */}
      {showSuggestionModal && selectedSuggestion && (
        <SuggestionModal
          suggestion={selectedSuggestion}
          onAccept={(alternativeId) => {
            handleAcceptSuggestion(selectedSuggestion.originalPart, alternativeId)
            closeSuggestionModal()
          }}
          onReject={() => {
            handleRejectSuggestion(selectedSuggestion.originalPart)
            closeSuggestionModal()
          }}
          onClose={closeSuggestionModal}
        />
      )}
    </div>
  )
}