'use client';

import type { ChatMessage, ChatThread } from '@/types';
import { useChatPanelState } from './ChatPanelState';
import { useChatPanelLogic } from './ChatPanelLogic';
import { useCanvasManagement } from '@/hooks/useCanvasManagement';
import { useStores } from '@/hooks/useStores';
import { useSession } from 'next-auth/react';
import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import type React from 'react';
import { debounce } from '@/utils/debounce';
import { Settings, Pin, PinOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SuggestionModal from '@/components/modals/SuggestionModal';
import SuggestionCard from '@/components/cards/SuggestionCard';
import { FileUpload } from '@/components/management/FileUpload';
import { ChatMessage as ChatMessageComponent } from './ChatMessage';
import type { PartSuggestion } from '@/utils/components/alternativePartsFinder';

// ChatPanel統合コンポーネント - State/Logic/UIを組み合わせ
export function ChatPanel() {
  // Get all state from stores
  const { data: session } = useSession();
  const {
    chatMessages,
    setChatMessages,
    chatThreads,
    setChatThreads,
    currentMessage,
    setCurrentMessage,
    isChatActive,
    setIsChatActive,
    currentThreadId,
    setCurrentThreadId,
    showThreads,
    setShowThreads,
    selectedFiles,
    uploadStatus,
    filePreviewUrls,
    handleFileSelect,
    clearFiles,
    handleSendMessage,
    connections,
    setConnections,
    failedConnections = [], // Default to empty array
    setFailedConnections,
    currentProject,
    llmStatus,
  } = useStores();

  // ✅ canvasNodes完全削除: React Flow純粋状態のみ使用
  const { nodes, setNodes } = useCanvasManagement();

  // ✅ React Flow完全移行: CanvasNode風変換削除、直接nodes使用

  // デバッグログ削除（無限ループ対策）

  // ローカル状態の追加
  const [suggestions, setSuggestions] = useState<PartSuggestion[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] =
    useState<PartSuggestion | null>(null);
  const [showSuggestionModal, setShowSuggestionModal] = useState(false);

  // 状態管理フック - currentProjectを渡す
  const {
    panelRef,
    panelWidth,
    isInitialized,
    activeTab,
    chatMode,
    autoModeMessage,
    setPanelWidth,
    setIsInitialized,
    setActiveTab,
    setChatMode,
    setAutoModeMessage,
    dynamicStyles,
  } = useChatPanelState(currentProject);

  // スクロール管理用のref
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);

  // デバウンスされたtextarea自動リサイズ関数
  const debouncedResize = useMemo(
    () =>
      debounce((textarea: HTMLTextAreaElement) => {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 192) + 'px';
      }, 150), // 150msのデバウンス
    [],
  );

  // Suggestion関連のヘルパー関数
  const addSuggestionLocal = (suggestion: PartSuggestion) => {
    setSuggestions((prev) => [...prev, suggestion]);
  };

  // FileList変換ヘルパー関数
  const convertToFileList = (files: File[]): FileList => {
    const dt = new DataTransfer();
    files.forEach((file) => dt.items.add(file));
    return dt.files;
  };

  // ビジネスロジックフック
  const { handleExtendedSendMessage, handleAcceptSuggestion, isStreaming } =
    useChatPanelLogic({
      nodes,
      connections,
      setNodes,
      setConnections,
      chatMessages,
      setChatMessages,
      currentProject: currentProject,
      addSuggestion: addSuggestionLocal,
      handleSendMessage,
      chatMode,
      session,
    });

  // パネル幅監視用useEffect
  useEffect(() => {
    const updatePanelWidth = () => {
      if (panelRef.current) {
        const width = panelRef.current.offsetWidth;
        setPanelWidth(width);
        if (!isInitialized) {
          setIsInitialized(true);
        }
      }
    };

    updatePanelWidth();
    window.addEventListener('resize', updatePanelWidth);

    const observer = new ResizeObserver(updatePanelWidth);
    if (panelRef.current) {
      observer.observe(panelRef.current);
    }

    return () => {
      window.removeEventListener('resize', updatePanelWidth);
      observer.disconnect();
    };
  }, [isInitialized, setPanelWidth, setIsInitialized, panelRef]);

  // Shift+Tabキーでモード切り替え
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Shift+Tab でモード切り替え
      if (e.shiftKey && e.key === 'Tab') {
        e.preventDefault();
        setChatMode((prev) => (prev === 'normal' ? 'requirements' : 'normal'));
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [setChatMode]);

  // モード変更時のフィードバック（初回レンダリング時はスキップ）
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    setChatMessages((messages) => [
      ...messages,
      {
        id: Date.now().toString(),
        role: 'system' as const,
        content: `📝 Switched to ${chatMode === 'requirements' ? 'Requirements Update' : 'Normal'} mode`,
        timestamp: new Date().toISOString(),
      },
    ]);
  }, [chatMode, setChatMessages]);

  // 自動モード設定メッセージの表示
  useEffect(() => {
    if (autoModeMessage) {
      setChatMessages((messages) => [
        ...messages,
        {
          id: Date.now().toString(),
          role: 'system' as const,
          content: autoModeMessage,
          timestamp: new Date().toISOString(),
        },
      ]);
      // メッセージ表示後にクリア
      setAutoModeMessage(null);
    }
  }, [autoModeMessage, setChatMessages, setAutoModeMessage]);

  // 🎯 Handle pending first message from welcome page
  useEffect(() => {
    const pendingMessage = localStorage.getItem('pendingFirstMessage');

    if (pendingMessage && currentProject) {
      console.log('📨 ChatPanel: Found pending first message:', pendingMessage);

      // Remove from localStorage
      localStorage.removeItem('pendingFirstMessage');

      // Set flag to prevent redirect
      localStorage.setItem('messageProcessed', 'true');

      // Activate chat
      setIsChatActive(true);

      // Send message immediately
      setTimeout(() => {
        console.log('📨 ChatPanel: Sending pending message...');
        handleExtendedSendMessage(
          pendingMessage,
          null,
          () => {
            console.log('📨 ChatPanel: Message sent successfully!');
            setIsChatActive(true);

            // Clear the messageProcessed flag after successful send
            // This allows returning to welcome page on next session
            setTimeout(() => {
              localStorage.removeItem('messageProcessed');
              console.log(
                '📨 ChatPanel: Cleared messageProcessed flag for next session',
              );
            }, 2000);
          },
          { isFirstMessage: true }, // Mark as first message for special AI prompt
        );
      }, 500);
    }
  }, [currentProject, handleExtendedSendMessage, setIsChatActive]);

  // スクロール位置の保存と復元
  const saveScrollPosition = useCallback(() => {
    if (chatScrollRef.current && currentThreadId) {
      const scrollTop = chatScrollRef.current.scrollTop;
      localStorage.setItem(
        `chat-scroll-${currentThreadId}`,
        scrollTop.toString(),
      );
    }
  }, [currentThreadId]);

  const restoreScrollPosition = useCallback(() => {
    if (chatScrollRef.current && currentThreadId) {
      const savedPosition = localStorage.getItem(
        `chat-scroll-${currentThreadId}`,
      );
      if (savedPosition) {
        chatScrollRef.current.scrollTop = parseInt(savedPosition, 10);
      }
    }
  }, [currentThreadId]);

  // チャットメッセージが更新されたときの自動スクロール
  useEffect(() => {
    if (chatScrollRef.current && shouldAutoScrollRef.current && isChatActive) {
      if (isStreaming) {
        // ストリーミング中はアニメーションフレームで最適化
        const animationId = requestAnimationFrame(() => {
          if (chatScrollRef.current) {
            // 即座に最下部へ（アニメーションなしで軽量）
            chatScrollRef.current.scrollTop =
              chatScrollRef.current.scrollHeight;
          }
        });
        return () => cancelAnimationFrame(animationId);
      } else {
        // 通常メッセージはスムーズスクロール
        chatScrollRef.current.scrollTo({
          top: chatScrollRef.current.scrollHeight,
          behavior: 'smooth',
        });
      }
    }
  }, [chatMessages, isChatActive, isStreaming]);

  // ストリーミング中の追加スクロール処理
  useEffect(() => {
    if (!isStreaming || !shouldAutoScrollRef.current || !isChatActive) return;

    let animationId: number;
    const scrollToBottom = () => {
      if (chatScrollRef.current && shouldAutoScrollRef.current) {
        chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
        // 次のフレームでも実行
        animationId = requestAnimationFrame(scrollToBottom);
      }
    };

    // 最初のスクロールを開始
    animationId = requestAnimationFrame(scrollToBottom);

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [isStreaming, isChatActive]);

  // スクロール位置の復元（初回マウントとスレッド切り替え時）
  useEffect(() => {
    if (isChatActive) {
      // 少し遅延を入れてDOMが完全に描画されてから復元
      const timer = setTimeout(() => {
        restoreScrollPosition();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [currentThreadId, isChatActive, restoreScrollPosition]);

  // ページリロード時のスクロール位置復元（初期表示用）
  // 初回マウント時のみ実行（空の依存配列）
  useEffect(() => {
    const savedThreadId = localStorage.getItem('current-thread-id');
    if (savedThreadId && !currentThreadId) {
      // スレッドを復元
      const thread = chatThreads.find((t) => t.id === savedThreadId);
      if (thread) {
        setChatMessages(thread.messages);
        setCurrentThreadId(savedThreadId);
        setIsChatActive(true);
        setShowThreads(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 初回マウント時のみ実行

  // 現在のスレッドIDを保存
  useEffect(() => {
    if (currentThreadId) {
      localStorage.setItem('current-thread-id', currentThreadId);
    } else {
      localStorage.removeItem('current-thread-id');
    }
  }, [currentThreadId]);

  // デバウンスされたスクロール位置保存関数
  const debouncedSaveScroll = useMemo(
    () =>
      debounce(() => {
        if (currentThreadId) {
          saveScrollPosition();
        }
      }, 300),
    [currentThreadId, saveScrollPosition],
  );

  // スクロール監視（ユーザーが手動でスクロールしたかどうかを検知）
  const handleScroll = useCallback(() => {
    if (chatScrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatScrollRef.current;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 10;

      // ユーザーが手動でスクロールした場合、自動スクロールを無効化
      shouldAutoScrollRef.current = isAtBottom;

      // デバウンスされたスクロール位置保存
      debouncedSaveScroll();
    }
  }, [debouncedSaveScroll]);

  const handleRejectSuggestion = (suggestionId: string) => {
    setSuggestions((prev) =>
      prev.filter((s) => s.problemComponentId !== suggestionId),
    );
  };

  const handleRejectSuggestionModal = () => {
    if (selectedSuggestion) {
      handleRejectSuggestion(selectedSuggestion.problemComponentId);
      setShowSuggestionModal(false);
      setSelectedSuggestion(null);
    }
  };

  const handleViewDetails = (suggestion: PartSuggestion) => {
    setSelectedSuggestion(suggestion);
    setShowSuggestionModal(true);
  };

  // チャットボタンコンポーネント
  const ChatButtons = () => (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() =>
          startNewEmptyChat(
            setChatMessages,
            setIsChatActive,
            setCurrentMessage,
            setCurrentThreadId,
            setShowThreads,
            chatMessages,
            currentThreadId,
            setChatThreads,
          )
        }
        className="text-xs mr-2"
      >
        + New Chat
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() =>
          handleNewChat(
            isChatActive,
            chatMessages,
            currentThreadId,
            setChatThreads,
            setShowThreads,
            showThreads,
          )
        }
        className="text-xs"
      >
        Chat history
      </Button>
    </>
  );

  // チャット関連のヘルパー関数
  const handleNewChat = (
    isChatActive: boolean,
    chatMessages: ChatMessage[],
    currentThreadId: string | null,
    setChatThreads: React.Dispatch<React.SetStateAction<ChatThread[]>>,
    setShowThreads: (value: boolean | ((prev: boolean) => boolean)) => void,
    showThreads: boolean,
  ) => {
    if (isChatActive && chatMessages.length > 0) {
      // 現在のチャットを既存のスレッドに保存（既存スレッドがある場合）
      if (currentThreadId) {
        setChatThreads((prev: ChatThread[]) =>
          prev.map((thread) =>
            thread.id === currentThreadId
              ? {
                  ...thread,
                  messages: chatMessages,
                  lastUpdated: new Date().toISOString(),
                }
              : thread,
          ),
        );
      } else {
        // 新しいスレッドを作成（既存スレッドがない場合）
        const newThread = {
          id: Date.now().toString(),
          title:
            chatMessages[0]?.content?.substring(0, 50) + '...' || 'New Chat',
          messages: chatMessages,
          lastUpdated: new Date().toISOString(),
          isPinned: false,
        };
        setChatThreads((prev: ChatThread[]) => [newThread, ...prev]);
      }
    }
    setShowThreads(!showThreads);
  };

  const startNewEmptyChat = (
    setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>,
    setIsChatActive: (value: boolean | ((prev: boolean) => boolean)) => void,
    setCurrentMessage: React.Dispatch<React.SetStateAction<string>>,
    setCurrentThreadId: (
      value: string | null | ((prev: string | null) => string | null),
    ) => void,
    setShowThreads: (value: boolean | ((prev: boolean) => boolean)) => void,
    chatMessages: ChatMessage[],
    currentThreadId: string | null,
    setChatThreads: React.Dispatch<React.SetStateAction<ChatThread[]>>,
  ) => {
    // 現在のチャットを保存（メッセージがある場合）
    if (currentThreadId && chatMessages.length > 0) {
      setChatThreads((prev: ChatThread[]) =>
        prev.map((thread) =>
          thread.id === currentThreadId
            ? {
                ...thread,
                messages: chatMessages,
                lastUpdated: new Date().toISOString(),
              }
            : thread,
        ),
      );
    } else if (!currentThreadId && chatMessages.length > 0) {
      // 新しいスレッドとして保存（currentThreadIdがない場合）
      const newThread = {
        id: Date.now().toString(),
        title: chatMessages[0]?.content?.substring(0, 50) + '...' || 'New Chat',
        messages: chatMessages,
        lastUpdated: new Date().toISOString(),
        isPinned: false,
      };
      setChatThreads((prev: ChatThread[]) => [newThread, ...prev]);
    }

    // メモリ上のチャットをクリア
    setChatMessages([]);
    setIsChatActive(false);
    setCurrentMessage('');
    setCurrentThreadId(null);
    setShowThreads(false);

    // localStorageのchatMessagesもクリア
    if (currentProject?.id) {
      const projectId = currentProject.id;
      const savedStateStr = localStorage.getItem(`project-${projectId}`);
      if (savedStateStr) {
        try {
          const savedState = JSON.parse(savedStateStr);
          savedState.chatMessages = []; // chatMessagesだけを空にする
          localStorage.setItem(
            `project-${projectId}`,
            JSON.stringify(savedState),
          );
          console.log('✅ localStorage chatMessages cleared for new chat');
        } catch (error) {
          console.error('Failed to clear localStorage chatMessages:', error);
        }
      }
    }
  };

  const handleSelectThread = (
    threadId: string,
    chatThreads: ChatThread[],
    setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>,
    setCurrentThreadId: (
      value: string | null | ((prev: string | null) => string | null),
    ) => void,
    setIsChatActive: (value: boolean | ((prev: boolean) => boolean)) => void,
    setShowThreads: (value: boolean | ((prev: boolean) => boolean)) => void,
  ) => {
    const thread = chatThreads.find((t) => t.id === threadId);
    if (thread) {
      setChatMessages(thread.messages);
      setCurrentThreadId(threadId);
      setIsChatActive(true);
      setShowThreads(false);
    }
  };

  const toggleThreadPin = (
    threadId: string,
    e: React.MouseEvent,
    setChatThreads: React.Dispatch<React.SetStateAction<ChatThread[]>>,
  ) => {
    e.stopPropagation();
    setChatThreads((prev: ChatThread[]) =>
      prev.map((thread) =>
        thread.id === threadId
          ? { ...thread, isPinned: !thread.isPinned }
          : thread,
      ),
    );
  };

  return (
    <div
      ref={panelRef}
      className="notranslate flex flex-col h-full min-h-0 w-full"
    >
      {/* Hardware Context Status section removed - moved to Sidebar */}

      {/* Visual Information to VLM section removed - moved to MainCanvas */}

      {/* Chat Window */}
      <div className="flex-1 flex flex-col min-h-0 w-full">
        {/* Chat Header */}
        <div className="border-b bg-muted/30">
          <div
            className={`${dynamicStyles.contentPadding} py-2 flex items-center justify-between`}
          >
            <div
              className={`inline-flex items-center gap-2 px-3 py-1 rounded-t-lg border border-b-0 text-sm ${llmStatus.isRunning ? 'bg-blue-50 border-blue-200' : 'bg-background'}`}
            >
              <div
                className={`w-2 h-2 rounded-full ${llmStatus.isRunning ? 'bg-blue-500 animate-pulse' : 'bg-green-500'}`}
              ></div>
              <span
                className={
                  llmStatus.isRunning ? 'text-blue-700 font-medium' : ''
                }
              >
                @Builder with AYA{' '}
                {llmStatus.isRunning && `- ${llmStatus.currentTask}`}
              </span>
            </div>
            <ChatButtons />
          </div>
        </div>

        {showThreads ? (
          <>
            {/* Chat Threads List */}
            <div className="flex-1 overflow-y-auto min-h-0">
              <div className={`${dynamicStyles.contentPadding} py-4`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-sm">Chat History</h3>
                </div>

                {chatThreads.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <p className="text-sm">No chat history yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {chatThreads
                      .sort((a, b) => {
                        // ピン留めを上に、その後は日付順
                        if (a.isPinned && !b.isPinned) return -1;
                        if (!a.isPinned && b.isPinned) return 1;
                        return (
                          new Date(b.lastUpdated).getTime() -
                          new Date(a.lastUpdated).getTime()
                        );
                      })
                      .map((thread) => (
                        <div
                          key={thread.id}
                          className="p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors relative"
                          onClick={() =>
                            handleSelectThread(
                              thread.id,
                              chatThreads,
                              setChatMessages,
                              setCurrentThreadId,
                              setIsChatActive,
                              setShowThreads,
                            )
                          }
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm mb-1 truncate flex items-center gap-1">
                                {thread.isPinned && (
                                  <Pin className="h-3 w-3 text-blue-500 flex-shrink-0" />
                                )}
                                <span className="truncate">{thread.title}</span>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {new Date(
                                  thread.lastUpdated,
                                ).toLocaleDateString()}{' '}
                                • {thread.messages.length} messages
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 opacity-60 hover:opacity-100"
                              onClick={(e) =>
                                toggleThreadPin(thread.id, e, setChatThreads)
                              }
                              title={
                                thread.isPinned ? 'Unpin thread' : 'Pin thread'
                              }
                            >
                              {thread.isPinned ? (
                                <PinOff className="h-3 w-3" />
                              ) : (
                                <Pin className="h-3 w-3" />
                              )}
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowThreads(false);
                  // もしメッセージがあるなら、チャットをアクティブに戻す
                  if (chatMessages.length > 0) {
                    setIsChatActive(true);
                  }
                }}
                className="w-full"
              >
                Back to Chat
              </Button>
            </div>
          </>
        ) : !isChatActive && chatMessages.length === 0 ? (
          <>
            {/* Initial Chat State */}
            <div className="flex-1 overflow-y-auto p-6 flex items-center justify-center min-h-0">
              <div className="text-center text-muted-foreground">
                <Settings
                  className={`${panelWidth < 350 ? 'h-10 w-10' : 'h-12 w-12'} mx-auto mb-4 opacity-50`}
                />
                <p
                  className={`${panelWidth < 350 ? 'text-sm' : 'text-base'} mb-2`}
                >
                  Start conversation with Visual information to LLM
                </p>
                <p className="text-sm opacity-75">
                  You can ask questions about hardware design, request parts
                  list analysis, component selection, and more.
                </p>
              </div>
            </div>

            {/* Toggle Tabs */}
            <div className={`${dynamicStyles.contentPadding} pb-2`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1">
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
                  {/* Mode Display */}
                  <div
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ml-2 ${
                      chatMode === 'requirements'
                        ? 'bg-blue-100 text-blue-700 border border-blue-200'
                        : 'bg-gray-100 text-gray-700 border border-gray-200'
                    }`}
                  >
                    {chatMode === 'requirements'
                      ? '📝 Requirements'
                      : '💬 Normal'}
                    <span className="text-xs opacity-70">(Shift+Tab)</span>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground bg-green-50 px-2 py-1 rounded border border-green-200">
                  Sonnet-4
                </span>
              </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'context' && (
              <div className={`${dynamicStyles.contentPadding} pb-4`}>
                <div className="text-center text-muted-foreground">
                  <div className="text-sm mb-2">Hardware Context</div>
                  <div className="text-xs opacity-75">
                    Current project context will be included in your
                    conversation
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

            {/* Input Field */}
            <div className={`${dynamicStyles.contentPadding} py-6 border-t`}>
              <div className="relative">
                <textarea
                  id="chat-input-main"
                  name="chat-input-main"
                  placeholder="Start chat with AYA... (Shift+Enter for new line, Enter to send)"
                  className="w-full p-4 border border-gray-300 rounded-md resize-none focus:ring-2 focus:ring-[#00AEEF] focus:border-transparent min-h-[80px] max-h-48 overflow-y-auto"
                  value={currentMessage}
                  onChange={(e) => {
                    const value = e.target.value;
                    setCurrentMessage(value);
                    // デバウンスされた自動リサイズ処理
                    debouncedResize(e.target);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      shouldAutoScrollRef.current = true; // メッセージ送信時に自動スクロールを有効化
                      handleExtendedSendMessage(
                        currentMessage,
                        selectedFiles.length > 0
                          ? convertToFileList(selectedFiles)
                          : null,
                        () => setIsChatActive(true),
                      );
                      setCurrentMessage('');
                    }
                  }}
                  rows={1}
                />
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Active Chat State */}
            <div
              ref={chatScrollRef}
              className={`flex-1 overflow-y-auto ${dynamicStyles.contentPadding} space-y-4 min-h-0`}
              onScroll={handleScroll}
            >
              {chatMessages.map((message, index) => (
                <ChatMessageComponent
                  key={`${message.id}-${index}`}
                  message={message}
                  messageMaxWidth={dynamicStyles.messageMaxWidth}
                />
              ))}

              {/* 🎯 代替部品提案カードの表示 */}
              {suggestions.length > 0 && (
                <div className="space-y-3">
                  {suggestions.map((suggestion) => (
                    <SuggestionCard
                      key={suggestion.problemComponentId}
                      suggestion={suggestion}
                      onAccept={handleAcceptSuggestion}
                      onReject={handleRejectSuggestion}
                      onViewDetails={handleViewDetails}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Failed Connections Display */}
            {failedConnections &&
              Array.isArray(failedConnections) &&
              failedConnections.length > 0 && (
                <div
                  className={`${dynamicStyles.contentPadding} border-t border-b bg-red-50`}
                >
                  <div className="text-sm font-medium text-red-800 mb-2">
                    ⚠️ Connection Failures ({failedConnections.length})
                  </div>
                  <div className="space-y-2">
                    {failedConnections.map((failed, index) => (
                      <div
                        key={index}
                        className="bg-white border border-red-200 rounded-lg p-3"
                      >
                        <div className="text-sm text-red-700">
                          <span className="font-medium">{failed.from}</span> →{' '}
                          <span className="font-medium">{failed.to}</span>
                        </div>
                        <div className="text-xs text-red-600 mt-1">
                          {failed.reason}
                        </div>
                        {failed.suggestions &&
                          failed.suggestions.length > 0 && (
                            <div className="text-xs text-gray-600 mt-2">
                              <span className="font-medium">Suggestions:</span>{' '}
                              {failed.suggestions.join(', ')}
                            </div>
                          )}
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => setFailedConnections([])}
                    className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
                  >
                    Clear failures
                  </button>
                  {/* Manual Connection Button */}
                  <button
                    onClick={() => {
                      if (nodes.length >= 2) {
                        const fromNode = nodes[0];
                        const toNode = nodes[1];
                        const testConnection = {
                          id: `manual-conn-${Date.now()}`,
                          fromId: fromNode.id,
                          toId: toNode.id,
                          fromPort: 'output-center',
                          toPort: 'input-center',
                        };
                        console.log(
                          '🔧 Creating manual test connection:',
                          testConnection,
                        );
                        setConnections((prev) => [...prev, testConnection]);
                      }
                    }}
                    className="mt-2 px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                  >
                    Create Test Connection
                  </button>
                  {/* Debug Console */}
                  <div className="mt-3 p-2 bg-gray-100 rounded text-xs">
                    <div>📊 Connections: {connections.length}</div>
                    <div>🎯 Canvas Nodes: {nodes.length}</div>
                    <div>🔗 PBS Items: {[].length}</div>
                    <button
                      onClick={() => {
                        console.log('🔍 Debug State:', {
                          connections,
                          nodes: nodes.map((n) => ({
                            id: n.id,
                            title: n.data.title,
                          })),
                          pbsItems: [].length,
                        });
                      }}
                      className="mt-1 px-2 py-1 bg-gray-500 text-white rounded text-xs"
                    >
                      Log State
                    </button>
                  </div>
                </div>
              )}

            {/* Toggle Tabs for Active Chat */}
            <div className={`${dynamicStyles.contentPadding} pb-2 border-t`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1">
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
                  {/* Mode Display */}
                  <div
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ml-2 ${
                      chatMode === 'requirements'
                        ? 'bg-blue-100 text-blue-700 border border-blue-200'
                        : 'bg-gray-100 text-gray-700 border border-gray-200'
                    }`}
                  >
                    {chatMode === 'requirements'
                      ? '📝 Requirements'
                      : '💬 Normal'}
                    <span className="text-xs opacity-70">(Shift+Tab)</span>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground bg-green-50 px-2 py-1 rounded border border-green-200">
                  Sonnet-4
                </span>
              </div>
            </div>

            {/* Tab Content for Active Chat */}
            {activeTab === 'context' && (
              <div className={`${dynamicStyles.contentPadding} pb-4`}>
                <div className="text-center text-muted-foreground">
                  <div className="text-sm mb-2">Hardware Context</div>
                  <div className="text-xs opacity-75">
                    Current project context is included in your conversation
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

            {/* Chat Input */}
            <div className={`${dynamicStyles.contentPadding} border-t`}>
              <div className="relative">
                <textarea
                  id="chat-input-thread"
                  name="chat-input-thread"
                  placeholder="Enter message... (Shift+Enter for new line, Enter to send)"
                  className="w-full p-4 border border-gray-300 rounded-md resize-none focus:ring-2 focus:ring-[#00AEEF] focus:border-transparent min-h-[80px] max-h-48 overflow-y-auto"
                  value={currentMessage}
                  onChange={(e) => {
                    const value = e.target.value;
                    setCurrentMessage(value);
                    // デバウンスされた自動リサイズ処理
                    debouncedResize(e.target);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      shouldAutoScrollRef.current = true; // メッセージ送信時に自動スクロールを有効化
                      handleExtendedSendMessage(
                        currentMessage,
                        selectedFiles.length > 0
                          ? convertToFileList(selectedFiles)
                          : null,
                        () => setIsChatActive(true),
                      );
                      setCurrentMessage('');
                    }
                  }}
                  rows={1}
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* 🎯 代替部品詳細モーダル */}
      <SuggestionModal
        suggestion={selectedSuggestion}
        isOpen={showSuggestionModal}
        onClose={() => {
          setShowSuggestionModal(false);
          setSelectedSuggestion(null);
        }}
        onAccept={handleAcceptSuggestion}
        onReject={handleRejectSuggestionModal}
      />
    </div>
  );
}
