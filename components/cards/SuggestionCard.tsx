// 🎯 提案カード - チャット内で代替部品を提案するコンポーネント
// 第3段階：提案表示UI（シンプルなカード形式）

'use client'

import React from 'react'
import { AlertTriangle, CheckCircle, XCircle, Info } from 'lucide-react'
import type { PartSuggestion } from '@/utils/components/alternativePartsFinder'

interface SuggestionCardProps {
  suggestion: PartSuggestion
  onAccept: (suggestionId: string, alternativeId: string) => void
  onReject: (suggestionId: string) => void
  onViewDetails: (suggestion: PartSuggestion) => void
}

export default function SuggestionCard({ 
  suggestion, 
  onAccept, 
  onReject, 
  onViewDetails 
}: SuggestionCardProps) {
  const { issue, alternatives } = suggestion
  const bestAlternative = alternatives[0] // 最適な代替案を表示
  
  if (!bestAlternative) return null
  
  // 重要度に応じたアイコンと色
  const getSeverityConfig = (severity: string) => {
    switch (severity) {
      case 'critical':
        return {
          icon: <AlertTriangle className="w-4 h-4" />,
          bgColor: 'bg-red-50 border-red-200',
          textColor: 'text-red-800',
          buttonColor: 'bg-red-600 hover:bg-red-700'
        }
      case 'warning':
        return {
          icon: <AlertTriangle className="w-4 h-4" />,
          bgColor: 'bg-yellow-50 border-yellow-200',
          textColor: 'text-yellow-800',
          buttonColor: 'bg-yellow-600 hover:bg-yellow-700'
        }
      default:
        return {
          icon: <Info className="w-4 h-4" />,
          bgColor: 'bg-blue-50 border-blue-200',
          textColor: 'text-blue-800',
          buttonColor: 'bg-blue-600 hover:bg-blue-700'
        }
    }
  }
  
  const config = getSeverityConfig(issue.severity)
  
  return (
    <div className={`rounded-lg border-2 p-4 mb-3 ${config.bgColor}`}>
      {/* ヘッダー：問題の概要 */}
      <div className="flex items-start gap-3 mb-3">
        <div className={config.textColor}>
          {config.icon}
        </div>
        <div className="flex-1">
          <h3 className={`font-semibold text-sm ${config.textColor}`}>
            Compatibility Issue Detected
          </h3>
          <p className="text-xs text-gray-600 mt-1">
            {issue.issue}
          </p>
        </div>
      </div>
      
      {/* 代替案の提案 */}
      <div className="bg-white rounded-md p-3 mb-3">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <span className="font-medium text-sm text-gray-800">
            Recommended Alternative
          </span>
          <span className="text-xs text-gray-500">
            (Compatibility Score: {bestAlternative.compatibilityScore}%)
          </span>
        </div>
        
        <div className="text-sm">
          <p className="font-medium text-gray-800 mb-1">
            {bestAlternative.title}
          </p>
          {bestAlternative.voltage && (
            <p className="text-xs text-gray-600">
              Voltage: {bestAlternative.voltage}
            </p>
          )}
          {bestAlternative.communication && (
            <p className="text-xs text-gray-600">
              Communication: {bestAlternative.communication}
            </p>
          )}
        </div>
        
        {/* 利点の表示 */}
        {bestAlternative.advantages.length > 0 && (
          <div className="mt-2">
            <p className="text-xs text-green-700 font-medium">
              ✓ {bestAlternative.advantages[0]}
            </p>
          </div>
        )}
      </div>
      
      {/* アクションボタン */}
      <div className="flex gap-2">
        <button
          onClick={() => onAccept(suggestion.problemComponentId, bestAlternative.id)}
          className={`flex-1 px-3 py-2 text-white text-xs font-medium rounded-md transition-colors ${config.buttonColor}`}
        >
          Accept & Apply
        </button>
        
        <button
          onClick={() => onViewDetails(suggestion)}
          className="px-3 py-2 text-gray-700 text-xs font-medium border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
        >
          View Details
        </button>
        
        <button
          onClick={() => onReject(suggestion.problemComponentId)}
          className="px-3 py-2 text-gray-500 text-xs hover:text-gray-700 transition-colors"
          title="Reject suggestion"
        >
          <XCircle className="w-4 h-4" />
        </button>
      </div>
      
      {/* フッター：推奨理由 */}
      <div className="mt-3 pt-3 border-t border-gray-200">
        <p className="text-xs text-gray-600">
          {suggestion.recommendation}
        </p>
      </div>
    </div>
  )
}