// ソフトウェアコンテキスト管理フック
// ユーザー入力のシステム要件とGitHub解析結果を統合管理

import { useState, useCallback, useEffect } from 'react'
import type { SoftwareContext, UserSystemRequirements, DetectedLibrary } from '@/types'
import { analyzeGitHubLibraries } from '@/utils/external/githubLibraryAnalyzer'

const STORAGE_KEY = 'orboh_software_context'

// 初期値
const DEFAULT_USER_REQUIREMENTS: UserSystemRequirements = {
  targetOS: '',
  targetCPU: '',
  targetGPU: '',
  targetRAM: '',
  notes: ''
}

const DEFAULT_SOFTWARE_CONTEXT: SoftwareContext = {
  userRequirements: DEFAULT_USER_REQUIREMENTS,
  detectedLibraries: []
}

export function useSoftwareContext() {
  const [softwareContext, setSoftwareContext] = useState<SoftwareContext>(DEFAULT_SOFTWARE_CONTEXT)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)

  // ローカルストレージからの読み込み
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsedContext = JSON.parse(stored)
        setSoftwareContext({
          ...DEFAULT_SOFTWARE_CONTEXT,
          ...parsedContext
        })
      }
    } catch (error) {
      console.error('Failed to load software context from localStorage:', error)
    }
  }, [])

  // ローカルストレージへの保存
  const saveSoftwareContext = useCallback((context: SoftwareContext) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(context))
    } catch (error) {
      console.error('Failed to save software context to localStorage:', error)
    }
  }, [])

  // ソフトウェアコンテキストの更新
  const updateSoftwareContext = useCallback((newContext: Partial<SoftwareContext>) => {
    setSoftwareContext(prev => {
      const updated = { ...prev, ...newContext }
      saveSoftwareContext(updated)
      return updated
    })
  }, [saveSoftwareContext])

  // ユーザー要件の更新
  const updateUserRequirements = useCallback((requirements: UserSystemRequirements) => {
    updateSoftwareContext({
      userRequirements: requirements
    })
  }, [updateSoftwareContext])

  // GitHub解析の実行
  const analyzeGitHubRepo = useCallback(async (repoUrl: string) => {
    setIsAnalyzing(true)
    setAnalysisError(null)
    
    try {
      console.log('🔍 GitHub解析を開始:', repoUrl)
      
      // 実際のGitHub解析を実行
      const detectedLibraries = await analyzeGitHubLibraries(repoUrl)
      
      updateSoftwareContext({
        detectedLibraries,
        githubRepoUrl: repoUrl,
        lastAnalyzed: new Date().toISOString()
      })
      
      console.log('✅ GitHub解析完了:', detectedLibraries.length, 'ライブラリを検出')
      
    } catch (error) {
      console.error('GitHub解析エラー:', error)
      setAnalysisError(error instanceof Error ? error.message : 'リポジトリの解析に失敗しました')
    } finally {
      setIsAnalyzing(false)
    }
  }, [updateSoftwareContext])

  // 検出されたライブラリの更新
  const updateDetectedLibraries = useCallback((libraries: DetectedLibrary[]) => {
    updateSoftwareContext({
      detectedLibraries: libraries
    })
  }, [updateSoftwareContext])

  // GitHubリンクのクリア
  const clearGitHubAnalysis = useCallback(() => {
    updateSoftwareContext({
      detectedLibraries: [],
      githubRepoUrl: undefined,
      lastAnalyzed: undefined
    })
  }, [updateSoftwareContext])

  // ソフトウェアコンテキストのリセット
  const resetSoftwareContext = useCallback(() => {
    setSoftwareContext(DEFAULT_SOFTWARE_CONTEXT)
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch (error) {
      console.error('Failed to clear software context from localStorage:', error)
    }
  }, [])

  // 統計情報の計算
  const contextStats = {
    hasOSRequirement: !!softwareContext.userRequirements.targetOS,
    libraryCount: softwareContext.detectedLibraries.length,
    hasHardwareRequirements: softwareContext.detectedLibraries.some(lib => 
      lib.hardwareRequirements && lib.hardwareRequirements.length > 0
    ),
    hasCPURequirement: !!softwareContext.userRequirements.targetCPU,
    hasGPURequirement: !!softwareContext.userRequirements.targetGPU,
    hasGitHubRepo: !!softwareContext.githubRepoUrl
  }

  return {
    // 状態
    softwareContext,
    isAnalyzing,
    analysisError,
    contextStats,
    
    // 更新メソッド
    updateSoftwareContext,
    updateUserRequirements,
    updateDetectedLibraries,
    
    // GitHub解析
    analyzeGitHubRepo,
    clearGitHubAnalysis,
    
    // リセット
    resetSoftwareContext
  }
}