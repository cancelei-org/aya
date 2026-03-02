import { useState } from 'react'

// 型定義を一元化されたファイルからimport
import type { ActiveTab } from '@/types'

// UI状態管理関連のカスタムフック
export const useUIState = () => {
  // UI関連のstate
  const [activeTab, setActiveTab] = useState<ActiveTab>("system")
  const [isProcessing, setIsProcessing] = useState(false)
  const [showAnalyzingPopup, setShowAnalyzingPopup] = useState(false)
  const [isInitialDataLoad, setIsInitialDataLoad] = useState(true)
  const [flowKey, setFlowKey] = useState(0) // React Flow強制更新用

  return {
    // States
    activeTab,
    isProcessing,
    showAnalyzingPopup,
    isInitialDataLoad,
    flowKey,
    
    // Setters
    setActiveTab,
    setIsProcessing,
    setShowAnalyzingPopup,
    setIsInitialDataLoad,
    setFlowKey,
  }
}