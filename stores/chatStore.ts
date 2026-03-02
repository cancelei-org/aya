import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import {
  ChatMessage,
  ChatThread,
  ChatLimit,
  FileAttachment,
  UploadStatus,
} from '@/types';

interface ChatState {
  // Messages
  chatMessages: ChatMessage[];
  setChatMessages: (
    messages: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[]),
  ) => void;
  addMessage: (message: ChatMessage) => void;
  updateMessage: (messageId: string, updates: Partial<ChatMessage>) => void;
  clearMessages: () => void;

  // Threads
  chatThreads: ChatThread[];
  setChatThreads: (
    threads: ChatThread[] | ((prev: ChatThread[]) => ChatThread[]),
  ) => void;
  currentThreadId: string | null;
  setCurrentThreadId: (
    value: string | null | ((prev: string | null) => string | null),
  ) => void;
  showThreads: boolean;
  setShowThreads: (value: boolean | ((prev: boolean) => boolean)) => void;

  // Chat state
  isChatActive: boolean;
  setIsChatActive: (value: boolean | ((prev: boolean) => boolean)) => void;
  currentMessage: string;
  setCurrentMessage: (value: string | ((prev: string) => string)) => void;

  // Chat limits
  chatLimit: ChatLimit | null;
  setChatLimit: (limit: ChatLimit | null) => void;

  // File handling
  selectedFiles: File[];
  setSelectedFiles: (files: File[]) => void;
  uploadStatus: UploadStatus;
  setUploadStatus: (status: UploadStatus) => void;
  filePreviewUrls: Record<string, string>;
  setFilePreviewUrls: (urls: Record<string, string>) => void;
  handleFileSelect: (files: FileList) => void;
  clearFiles: () => void;
}

export const useChatStore = create<ChatState>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      // Messages
      chatMessages: [],
      setChatMessages: (updater) => {
        set((state) => ({
          chatMessages:
            typeof updater === 'function'
              ? updater(state.chatMessages)
              : updater,
        }));
      },
      addMessage: (message) => {
        set((state) => ({
          chatMessages: [...state.chatMessages, message],
        }));
      },
      updateMessage: (messageId, updates) => {
        set((state) => ({
          chatMessages: state.chatMessages.map((msg) =>
            msg.id === messageId ? { ...msg, ...updates } : msg,
          ),
        }));
      },
      clearMessages: () => set({ chatMessages: [] }),

      // Threads
      chatThreads: [],
      setChatThreads: (updater) => {
        set((state) => ({
          chatThreads:
            typeof updater === 'function'
              ? updater(state.chatThreads)
              : updater,
        }));
      },
      currentThreadId: null,
      setCurrentThreadId: (value) =>
        set((state) => ({
          currentThreadId:
            typeof value === 'function' ? value(state.currentThreadId) : value,
        })),
      showThreads: false,
      setShowThreads: (value) =>
        set((state) => ({
          showThreads:
            typeof value === 'function' ? value(state.showThreads) : value,
        })),

      // Chat state
      isChatActive: false,
      setIsChatActive: (value) =>
        set((state) => ({
          isChatActive:
            typeof value === 'function' ? value(state.isChatActive) : value,
        })),
      currentMessage: '',
      setCurrentMessage: (value) =>
        set((state) => ({
          currentMessage:
            typeof value === 'function' ? value(state.currentMessage) : value,
        })),

      // Chat limits
      chatLimit: null,
      setChatLimit: (limit) => set({ chatLimit: limit }),

      // File handling
      selectedFiles: [],
      setSelectedFiles: (files) => set({ selectedFiles: files }),
      uploadStatus: 'idle',
      setUploadStatus: (status) => set({ uploadStatus: status }),
      filePreviewUrls: {},
      setFilePreviewUrls: (urls) => set({ filePreviewUrls: urls }),

      handleFileSelect: (files: FileList) => {
        const fileArray = Array.from(files);
        const urls: Record<string, string> = {};

        fileArray.forEach((file) => {
          if (file.type.startsWith('image/')) {
            urls[file.name] = URL.createObjectURL(file);
          }
        });

        set({
          selectedFiles: fileArray,
          filePreviewUrls: urls,
        });
      },

      clearFiles: () => {
        const state = get();
        // Clean up object URLs
        Object.values(state.filePreviewUrls).forEach((url) => {
          URL.revokeObjectURL(url);
        });

        set({
          selectedFiles: [],
          filePreviewUrls: {},
          uploadStatus: 'idle',
        });
      },
    })),
    {
      name: 'chat-store',
    },
  ),
);
