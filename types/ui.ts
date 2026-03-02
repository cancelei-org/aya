// UI状態・フォーム・表示関連の型定義

import type React from "react"

// アクティブタブ
export type ActiveTab = "system" | "parts" | "devlog" | "visual"

// 履歴状態 - 型循環参照を避けるためany使用
export interface HistoryState {
  nodes: any[]
  connections: any[]
  actionType: string
}

// 履歴管理オプション
export interface UseHistoryManagerOptions {
  maxHistorySize: number
}

// 履歴管理戻り値
export interface UseHistoryManagerReturn {
  saveState: (state: HistoryState) => void
  undo: () => HistoryState | null
  redo: () => HistoryState | null
  canUndo: boolean
  canRedo: boolean
  clearHistory: () => void
}