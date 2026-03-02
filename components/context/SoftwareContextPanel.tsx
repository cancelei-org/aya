"use client"

import React from 'react'
import { SystemRequirementsInput } from '@/components/management/SystemRequirementsInput'
import { DetectedLibrariesDisplay } from '@/components/ai-search/DetectedLibrariesDisplay'
import type { SoftwareContext } from '@/types'

interface SoftwareContextPanelProps {
  softwareContext: SoftwareContext | null
  isAnalyzing: boolean
  analysisError: string | null
  onContextChange: (context: SoftwareContext) => void
  onAnalyzeRepo: (url: string) => void
  onClearAnalysis: () => void
  onResetContext: () => void
}

export function SoftwareContextPanel({
  softwareContext,
  isAnalyzing,
  analysisError,
  onContextChange,
  onAnalyzeRepo,
  onClearAnalysis,
  onResetContext
}: SoftwareContextPanelProps) {

  const handleUserRequirementsChange = (userRequirements: SoftwareContext['userRequirements']) => {
    onContextChange({
      ...softwareContext,
      userRequirements,
      detectedLibraries: softwareContext?.detectedLibraries || []
    })
  }

  const hasAnyData = softwareContext && (
    softwareContext.userRequirements.targetOS ||
    softwareContext.userRequirements.targetCPU ||
    softwareContext.userRequirements.targetGPU ||
    softwareContext.userRequirements.targetRAM ||
    softwareContext.userRequirements.notes ||
    softwareContext.detectedLibraries.length > 0 ||
    softwareContext.githubRepoUrl
  )

  return (
    <div className="space-y-4">
      {/* ユーザー入力：システム要件 */}
      <SystemRequirementsInput 
        requirements={softwareContext?.userRequirements || { targetOS: '', targetCPU: '', targetGPU: '', targetRAM: '', notes: '' }}
        onRequirementsChange={handleUserRequirementsChange}
      />
      
      {/* GitHub解析：ライブラリ情報 */}
      <DetectedLibrariesDisplay
        libraries={softwareContext?.detectedLibraries || []}
        githubRepoUrl={softwareContext?.githubRepoUrl}
        lastAnalyzed={softwareContext?.lastAnalyzed}
        isAnalyzing={isAnalyzing}
        onAnalyzeRepo={onAnalyzeRepo}
        onClearAnalysis={onClearAnalysis}
      />

      {/* エラー表示 */}
      {analysisError && (
        <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">
          ⚠️ {analysisError}
        </div>
      )}

      {/* リセットボタン（データがある場合のみ表示） */}
      {hasAnyData && (
        <div className="pt-2 border-t border-gray-200">
          <button
            onClick={onResetContext}
            className="w-full px-3 py-2 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
          >
            🗑️ All clear
          </button>
        </div>
      )}

      {/* サマリー情報（設定済みの場合のみ表示）
      {hasAnyData && (
        <div className="p-2 bg-gray-50 border border-gray-200 rounded">
          <div className="text-xs font-medium text-gray-700 mb-1">
            📋 Configuration Summary
          </div>
          <div className="space-y-1 text-xs text-gray-600">
            {softwareContext?.userRequirements.targetOS && (
              <div>• Target OS: Specified</div>
            )}
            {softwareContext?.userRequirements.targetCPU && (
              <div>• CPU: Specified</div>
            )}
            {softwareContext?.userRequirements.targetGPU && (
              <div>• GPU: Specified</div>
            )}
            {softwareContext?.userRequirements.targetRAM && (
              <div>• RAM: {softwareContext.userRequirements.targetRAM}</div>
            )}
            {softwareContext?.detectedLibraries && softwareContext.detectedLibraries.length > 0 && (
              <div>• Libraries: {softwareContext.detectedLibraries.length} detected</div>
            )}
            {softwareContext?.githubRepoUrl && (
              <div>• Repository: Connected</div>
            )}
          </div>
        </div>
      )} */}
    </div>
  )
}