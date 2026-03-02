// 🎯 統合されたUIユーティリティ
// uiHelpers.ts と uiUtils.ts の機能を統合

import { signOut } from "next-auth/react"
import { Connection, NodeData } from '@/types'
import { Node } from '@xyflow/react'
import { saveProjectData } from '../project/projectUtils'

// ==============================
// UI状態管理関連
// ==============================

/**
 * ポップアップを表示して、一定時間後に自動で閉じる
 */
export const showEditingBlockedPopup = (
  setShowAnalyzingPopup: (show: boolean) => void,
  duration: number = 3000
) => {
  setShowAnalyzingPopup(true)
  setTimeout(() => setShowAnalyzingPopup(false), duration)
}

/**
 * セクションの展開や折りたたみを切り替える
 */
export const toggleSection = (
  section: string,
  setExpandedSections: (updater: (prev: Record<string, boolean>) => Record<string, boolean>) => void
) => {
  setExpandedSections((prev) => ({
    ...prev,
    [section]: !prev[section],
  }))
}

/**
 * 編集可能かどうかを判定
 */
export const isEditingAllowed = (
  isAnalyzing: boolean,
  llmStatus: { isRunning: boolean; currentTask: string }
): boolean => {
  return !isAnalyzing && !llmStatus.isRunning
}

// ==============================
// 認証・セッション関連
// ==============================

/**
 * サインアウト処理
 */
export const handleSignOut = async (callbackUrlOrEvent?: string | React.MouseEvent) => {
  // イベントオブジェクトが渡された場合は無視
  const callbackUrl = typeof callbackUrlOrEvent === 'string' 
    ? callbackUrlOrEvent 
    : "/auth/signin"
    
  try {
    await signOut({ 
      callbackUrl,
      redirect: true 
    })
  } catch (error) {
    console.error('Sign out error:', error)
    // フォールバック: 手動でリダイレクト
    window.location.href = callbackUrl
  }
}

// ==============================
// データ保存・同期関連
// ==============================

/**
 * ページ離脱前の保存処理
 */
export const handleBeforeUnload = (
  event: BeforeUnloadEvent,
  currentProject: { id: string } | null,
  nodes: Node<NodeData>[],
  isSaving: boolean,
  connections: Connection[],
  chatMessages: any[],
  setIsSaving: (saving: boolean) => void
) => {
  console.log('🔄 Global beforeunload triggered', {
    projectId: currentProject?.id,
    nodesLength: nodes.length,
    isSaving,
    timestamp: new Date().toISOString()
  })
  
  // 詳細なnodes状態検証
  console.log('🔍 Global beforeunload nodes verification:', {
    total: nodes.length,
    withDescription: nodes.filter(n => n.data?.description).length,
    withOrderStatus: nodes.filter(n => n.data?.orderStatus).length,
    sampleNodes: nodes.slice(0, 3).map(n => ({
      id: n.id,
      title: n.data?.title,
      description: n.data?.description,
      orderStatus: n.data?.orderStatus
    }))
  })
  
  if (currentProject?.id && nodes.length > 0 && !isSaving) {
    console.log('💾 Global beforeunload: Executing save with current state')
    
    // 即座に保存を実行（競合防止付き）
    saveProjectData(
      connections,
      currentProject,
      nodes,
      chatMessages,
      isSaving,
      setIsSaving
    ).then(() => {
      console.log('✅ Global beforeunload save completed')
    }).catch(error => {
      console.error('❌ Global beforeunload save failed:', error)
    })
    
    // ブラウザの警告を表示（変更がある場合）
    event.preventDefault()
    event.returnValue = ''
  }
}

// ==============================
// UI表示ヘルパー関連
// ==============================

/**
 * ローディング状態の管理
 */
export const setLoadingState = (
  isLoading: boolean,
  message: string,
  setIsProcessing: (processing: boolean) => void,
  setLlmStatus?: (status: { isRunning: boolean; currentTask: string }) => void
) => {
  setIsProcessing(isLoading)
  if (setLlmStatus) {
    setLlmStatus({
      isRunning: isLoading,
      currentTask: message
    })
  }
}

/**
 * エラーメッセージの表示
 */
export const showErrorMessage = (
  error: string,
  duration: number = 5000,
  setErrorMessage?: (message: string | null) => void
) => {
  if (setErrorMessage) {
    setErrorMessage(error)
    setTimeout(() => setErrorMessage(null), duration)
  } else {
    console.error(error)
  }
}

/**
 * 成功メッセージの表示
 */
export const showSuccessMessage = (
  message: string,
  duration: number = 3000,
  setSuccessMessage?: (message: string | null) => void
) => {
  if (setSuccessMessage) {
    setSuccessMessage(message)
    setTimeout(() => setSuccessMessage(null), duration)
  } else {
    console.log('✅', message)
  }
}

// ==============================
// UIデバウンス・スロットル関連
// ==============================

/**
 * デバウンス関数
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => {
      func(...args)
    }, wait)
  }
}

/**
 * スロットル関数
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle = false
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => {
        inThrottle = false
      }, limit)
    }
  }
}

// ==============================
// 後方互換性のためのエクスポート
// ==============================

// 従来の関数名でもアクセス可能にする
export {
  showEditingBlockedPopup as showAnalyzingPopup,
  isEditingAllowed as canEdit
}

// ページ表示状態変更時の処理
export const handleVisibilityChange = (
  currentProject: { id: string } | null,
  nodes: Node<NodeData>[],
  isSaving: boolean,
  connections: Connection[],
  chatMessages: any[],
  setIsSaving: (saving: boolean) => void
) => {
  console.log("🔄 Global visibilitychange triggered", {
    hidden: document.hidden,
    projectId: currentProject?.id,
    nodesLength: nodes.length,
    isSaving,
    timestamp: new Date().toISOString()
  })
  
  if (document.hidden) {
    console.log("🔍 Global visibilitychange nodes verification:", {
      total: nodes.length,
      withDescription: nodes.filter(n => n.data?.description).length,
      withOrderStatus: nodes.filter(n => n.data?.orderStatus).length,
      sampleNodes: nodes.slice(0, 3).map(n => ({
        id: n.id,
        title: n.data?.title,
        description: n.data?.description,
        orderStatus: n.data?.orderStatus
      }))
    })
    
    if (currentProject?.id && nodes.length > 0 && !isSaving) {
      console.log("💾 Global visibilitychange: Executing save with current state")
      
      saveProjectData(
        connections,
        currentProject,
        nodes,
        chatMessages,
        isSaving,
        setIsSaving
      )
    }
  }
}
