import { useState } from 'react'

// 型定義を一元化されたファイルからimport
import type {
  Project
} from '@/types'

// プロジェクト管理関連のカスタムフック
export const useProjectManagement = () => {
  // プロジェクト関連のstate
  const [currentProject, setCurrentProject] = useState<Project | null>(null)
  const [isDataLoaded, setIsDataLoaded] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  return {
    // States
    currentProject,
    isDataLoaded,
    isSaving,
    
    // Setters
    setCurrentProject,
    setIsDataLoaded,
    setIsSaving,
  }
}