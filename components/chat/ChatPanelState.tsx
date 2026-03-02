"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import type { PartSuggestion } from '@/utils/components/alternativePartsFinder'

// ChatPanel状態管理専用フック - projectIdを引数として受け取る
export function useChatPanelState(currentProject?: { id: string } | null) {
  // パネル参照と幅管理
  const panelRef = useRef<HTMLDivElement>(null)
  const [panelWidth, setPanelWidth] = useState(0)
  const [isInitialized, setIsInitialized] = useState(false)

  // 代替部品提案の状態管理
  const [suggestions, setSuggestions] = useState<PartSuggestion[]>([])
  const [selectedSuggestion, setSelectedSuggestion] = useState<PartSuggestion | null>(null)
  const [showSuggestionModal, setShowSuggestionModal] = useState(false)

  // Imagesタブの状態管理
  const [activeTab, setActiveTab] = useState<'context' | 'images'>('context')

  // チャットモードの状態管理 - デフォルトは'normal'
  const [chatMode, setChatMode] = useState<'normal' | 'requirements'>('normal')
  const [hasCheckedRequirements, setHasCheckedRequirements] = useState(false)
  const [autoModeMessage, setAutoModeMessage] = useState<string | null>(null)

  // プロジェクトが存在する場合、要件定義書の存在をチェック
  useEffect(() => {
    const checkRequirementsAndSetMode = async () => {
      // 既にチェック済み、またはプロジェクトがない場合はスキップ
      if (hasCheckedRequirements || !currentProject?.id) {
        return
      }

      try {
        const response = await fetch(
          `/api/auto-devlog/documents?projectId=${currentProject.id}&type=requirements`
        )
        
        if (response.ok) {
          const { data: documents } = await response.json()
          
          // 要件定義書が存在しない場合、自動的に requirements モードに設定
          if (!documents || documents.length === 0) {
            console.log('📝 No requirements document found, automatically enabling requirements mode')
            setChatMode('requirements')
            setAutoModeMessage('📝 Requirements mode automatically enabled (no requirements document found). Please describe your system requirements.')
          }
          
          // チェック済みフラグを立てる（同じセッション中に再チェックしない）
          setHasCheckedRequirements(true)
        }
      } catch (error) {
        console.error('Error checking requirements documents:', error)
      }
    }

    checkRequirementsAndSetMode()
  }, [currentProject?.id, hasCheckedRequirements])

  // パネル幅に基づく動的スタイル計算
  const getDynamicStyles = useCallback(() => {
    // 初期化されていない場合はデフォルト値を返す
    if (!isInitialized || panelWidth === 0) return {
      messageMaxWidth: 'max-w-[85%]',
      contentPadding: 'px-4',
      visualPadding: 'px-4',
      fontSize: 'text-sm',
      iconSize: 'h-12 w-12'
    }
    
    // パネル幅に応じてコンテンツサイズを調整
    if (panelWidth < 280) {
      return {
        messageMaxWidth: 'max-w-[95%]',
        contentPadding: 'px-2',
        visualPadding: 'px-2',
        fontSize: 'text-xs',
        iconSize: 'h-8 w-8'
      }
    } else if (panelWidth < 350) {
      return {
        messageMaxWidth: 'max-w-[90%]',
        contentPadding: 'px-3',
        visualPadding: 'px-3',
        fontSize: 'text-sm',
        iconSize: 'h-10 w-10'
      }
    } else if (panelWidth < 450) {
      return {
        messageMaxWidth: 'max-w-[85%]',
        contentPadding: 'px-4',
        visualPadding: 'px-4',
        fontSize: 'text-sm',
        iconSize: 'h-12 w-12'
      }
    } else {
      return {
        messageMaxWidth: 'max-w-[80%]',
        contentPadding: 'px-6',
        visualPadding: 'px-6',
        fontSize: 'text-base',
        iconSize: 'h-14 w-14'
      }
    }
  }, [isInitialized, panelWidth])

  // 提案関連の状態操作
  const openSuggestionModal = useCallback((suggestion: PartSuggestion) => {
    setSelectedSuggestion(suggestion)
    setShowSuggestionModal(true)
  }, [])

  const closeSuggestionModal = useCallback(() => {
    setShowSuggestionModal(false)
    setSelectedSuggestion(null)
  }, [])

  const addSuggestion = useCallback((suggestion: PartSuggestion) => {
    setSuggestions(prev => {
      const exists = prev.some(s => s.originalPart === suggestion.originalPart)
      if (exists) return prev
      return [...prev, suggestion]
    })
  }, [])

  const removeSuggestion = useCallback((suggestionId: string) => {
    setSuggestions(prev => prev.filter(s => s.originalPart !== suggestionId))
  }, [])

  const clearSuggestions = useCallback(() => {
    setSuggestions([])
  }, [])

  return {
    // Refs
    panelRef,
    
    // State values
    panelWidth,
    isInitialized,
    suggestions,
    selectedSuggestion,
    showSuggestionModal,
    activeTab,
    chatMode,
    autoModeMessage,
    
    // Setters
    setPanelWidth,
    setIsInitialized,
    setSuggestions,
    setActiveTab,
    setChatMode,
    setAutoModeMessage,
    
    // Computed values
    dynamicStyles: getDynamicStyles(),
    
    // Actions
    openSuggestionModal,
    closeSuggestionModal,
    addSuggestion,
    removeSuggestion,
    clearSuggestions
  }
}