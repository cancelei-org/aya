import { useState, useCallback, useRef } from 'react'

// 型定義を一元化されたファイルからimport
import type {
  HistoryState,
  UseHistoryManagerOptions,
  UseHistoryManagerReturn
} from '@/types'

export function useHistoryManager({ maxHistorySize = 50 }: UseHistoryManagerOptions = {}): UseHistoryManagerReturn {
  const [history, setHistory] = useState<HistoryState[]>([])
  const [currentIndex, setCurrentIndex] = useState(-1)
  const skipNextSave = useRef(false)

  const saveState = useCallback((state: Omit<HistoryState, 'timestamp'>) => {
    if (skipNextSave.current) {
      skipNextSave.current = false
      return
    }

    const newState: HistoryState = {
      ...state,
      timestamp: Date.now()
    }

    setHistory(prev => {
      // 現在の位置より後の履歴を削除
      const newHistory = prev.slice(0, currentIndex + 1)
      newHistory.push(newState)
      
      // 最大履歴数を超えた場合、古いものを削除
      if (newHistory.length > maxHistorySize) {
        newHistory.shift()
        setCurrentIndex(newHistory.length - 1)
      } else {
        setCurrentIndex(newHistory.length - 1)
      }
      
      return newHistory
    })
  }, [currentIndex, maxHistorySize])

  const undo = useCallback((): HistoryState | null => {
    if (currentIndex <= 0) return null
    
    skipNextSave.current = true
    const newIndex = currentIndex - 1
    setCurrentIndex(newIndex)
    return history[newIndex]
  }, [currentIndex, history])

  const redo = useCallback((): HistoryState | null => {
    if (currentIndex >= history.length - 1) return null
    
    skipNextSave.current = true
    const newIndex = currentIndex + 1
    setCurrentIndex(newIndex)
    return history[newIndex]
  }, [currentIndex, history])

  const clearHistory = useCallback(() => {
    setHistory([])
    setCurrentIndex(-1)
  }, [])

  return {
    saveState,
    undo,
    redo,
    canUndo: currentIndex > 0,
    canRedo: currentIndex < history.length - 1,
    clearHistory
  }
}