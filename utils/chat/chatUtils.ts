// チャット関連のユーティリティ関数

// チャットスレッドの制限処理
export const limitThreads = (threads: any[]) => {
  const pinnedThreads = threads.filter((t) => t.isPinned);
  const unpinnedThreads = threads.filter((t) => !t.isPinned);

  // ピン留めされていないスレッドを日付順にソートして制限
  const sortedUnpinned = unpinnedThreads.sort(
    (a, b) =>
      new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime(),
  );

  const maxUnpinned = Math.max(0, 10 - pinnedThreads.length);
  const limitedUnpinned = sortedUnpinned.slice(0, maxUnpinned);

  return [...pinnedThreads, ...limitedUnpinned];
};

// 現在のチャットをスレッドに保存して新しいチャットを開始
export const handleNewChat = (
  isChatActive: boolean,
  chatMessages: any[],
  currentThreadId: string | null,
  setChatThreads: (updater: (prev: any[]) => any[]) => void,
  setShowThreads: (value: boolean | ((prev: boolean) => boolean)) => void,
  showThreads: boolean,
) => {
  // 現在のチャットがある場合はスレッドに保存
  if (isChatActive && chatMessages.length > 0) {
    const threadTitle =
      chatMessages[0]?.content.slice(0, 50) + '...' || 'New Chat';
    const newThread = {
      id: currentThreadId || `thread-${Date.now()}`,
      title: threadTitle,
      messages: [...chatMessages],
      lastUpdated: new Date().toISOString(),
      isPinned: false,
    };

    setChatThreads((prev) => {
      const existingIndex = prev.findIndex((t) => t.id === newThread.id);
      let updated: typeof prev;

      if (existingIndex >= 0) {
        updated = [...prev];
        updated[existingIndex] = { ...updated[existingIndex], ...newThread };
      } else {
        updated = [newThread, ...prev];
      }

      return limitThreads(updated);
    });
  }

  // 新しいチャットを開始
  setShowThreads(!showThreads); // スレッド表示をトグル
};

// スレッドのピン留めをトグル
export const toggleThreadPin = (
  threadId: string,
  event: React.MouseEvent,
  setChatThreads: (updater: (prev: any[]) => any[]) => void,
) => {
  event.stopPropagation(); // スレッド選択を防ぐ
  setChatThreads((prev) =>
    prev.map((thread) =>
      thread.id === threadId
        ? { ...thread, isPinned: !thread.isPinned }
        : thread,
    ),
  );
};

// スレッドを選択してチャットを復元
export const handleSelectThread = (
  threadId: string,
  chatThreads: any[],
  setChatMessages: (messages: any[]) => void,
  setCurrentThreadId: (id: string | null) => void,
  setIsChatActive: (active: boolean) => void,
  setShowThreads: (show: boolean) => void,
) => {
  const thread = chatThreads.find((t) => t.id === threadId);
  if (thread) {
    setChatMessages(thread.messages);
    setCurrentThreadId(threadId);
    setIsChatActive(true);
    setShowThreads(false);
  }
};

// 新しい空のチャットを開始
export const startNewEmptyChat = (
  setChatMessages: (messages: any[]) => void,
  setIsChatActive: (value: boolean | ((prev: boolean) => boolean)) => void,
  setCurrentMessage: (value: string | ((prev: string) => string)) => void,
  setCurrentThreadId: (
    value: string | null | ((prev: string | null) => string | null),
  ) => void,
  setShowThreads: (value: boolean | ((prev: boolean) => boolean)) => void,
) => {
  setChatMessages([]);
  setIsChatActive(false);
  setCurrentMessage('');
  setCurrentThreadId(null);
  setShowThreads(false);

  // Reset textarea height
  setTimeout(() => {
    const textarea = document.querySelector('textarea');
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = '80px';
    }
  }, 0);
};
