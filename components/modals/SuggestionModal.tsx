// 🔍 提案詳細モーダル - 代替部品の詳細比較画面
// 第3段階：提案表示UI（詳細比較機能）

'use client'

import React, { useState } from 'react'
import { X, CheckCircle, AlertTriangle, ArrowRight, Zap, Wifi, Settings } from 'lucide-react'
import type { PartSuggestion, AlternativePart } from '@/utils/components/alternativePartsFinder'

interface SuggestionModalProps {
  suggestion: PartSuggestion | null
  isOpen: boolean
  onClose: () => void
  onAccept: (suggestionId: string, alternativeId: string) => void
  onReject: (suggestionId: string) => void
}

export default function SuggestionModal({ 
  suggestion, 
  isOpen, 
  onClose, 
  onAccept, 
  onReject 
}: SuggestionModalProps) {
  const [selectedAlternative, setSelectedAlternative] = useState<string>('')
  
  if (!isOpen || !suggestion) return null
  
  // 選択された代替案（デフォルトは最初の候補）
  const currentSelection = selectedAlternative || suggestion.alternatives[0]?.id || ''
  const selectedPart = suggestion.alternatives.find(alt => alt.id === currentSelection)
  
  // 問題の重要度に応じたスタイリング
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50'
      case 'warning': return 'text-yellow-600 bg-yellow-50'
      default: return 'text-blue-600 bg-blue-50'
    }
  }
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-800">
            Alternative Parts Detailed Comparison
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        {/* コンテンツ */}
        <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* 問題の詳細 */}
          <div className="p-6 border-b bg-gray-50">
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getSeverityColor(suggestion.issue.severity)}`}>
              <AlertTriangle className="w-4 h-4" />
              {suggestion.issue.severity === 'critical' ? 'Critical' : suggestion.issue.severity === 'warning' ? 'Warning' : 'Info'}
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mt-3 mb-2">
              {suggestion.issue.issue}
            </h3>
            <p className="text-gray-600 mb-3">
              {suggestion.issue.recommendation}
            </p>
            <p className="text-sm text-gray-500">
              Target Component: {suggestion.problemComponentName}
            </p>
          </div>
          
          {/* 代替案の比較 */}
          <div className="p-6">
            <h4 className="text-lg font-semibold text-gray-800 mb-4">
              Please select an alternative
            </h4>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {suggestion.alternatives.map((alternative, index) => (
                <AlternativeCard
                  key={alternative.id}
                  alternative={alternative}
                  isSelected={currentSelection === alternative.id}
                  isRecommended={index === 0}
                  onClick={() => setSelectedAlternative(alternative.id)}
                />
              ))}
            </div>
            
            {/* 選択された代替案の詳細 */}
            {selectedPart && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h5 className="font-semibold text-gray-800 mb-3">
                  Selected Alternative Details
                </h5>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h6 className="font-medium text-gray-700 mb-2">Advantages</h6>
                    <ul className="space-y-1">
                      {selectedPart.advantages.map((advantage, i) => (
                        <li key={i} className="text-sm text-green-700 flex items-center gap-2">
                          <CheckCircle className="w-3 h-3" />
                          {advantage}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h6 className="font-medium text-gray-700 mb-2">Considerations</h6>
                    <ul className="space-y-1">
                      {selectedPart.tradeoffs.map((tradeoff, i) => (
                        <li key={i} className="text-sm text-orange-700 flex items-center gap-2">
                          <AlertTriangle className="w-3 h-3" />
                          {tradeoff}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* フッター */}
        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={() => onReject(suggestion.problemComponentId)}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
          >
            Reject Suggestion
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (selectedPart) {
                onAccept(suggestion.problemComponentId, selectedPart.id)
                onClose()
              }
            }}
            disabled={!selectedPart}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
          >
            Apply This Alternative
          </button>
        </div>
      </div>
    </div>
  )
}

// 代替案カードコンポーネント
function AlternativeCard({ 
  alternative, 
  isSelected, 
  isRecommended, 
  onClick 
}: {
  alternative: AlternativePart
  isSelected: boolean
  isRecommended: boolean
  onClick: () => void
}) {
  return (
    <div
      className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
        isSelected 
          ? 'border-blue-500 bg-blue-50' 
          : 'border-gray-200 hover:border-gray-300 bg-white'
      }`}
      onClick={onClick}
    >
      {/* 推奨バッジ */}
      {isRecommended && (
        <div className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full mb-2">
          <CheckCircle className="w-3 h-3" />
          Recommended
        </div>
      )}
      
      {/* 部品名 */}
      <h6 className="font-semibold text-gray-800 mb-2">
        {alternative.title}
      </h6>
      
      {/* 仕様情報 */}
      <div className="space-y-1 mb-3">
        {alternative.voltage && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Zap className="w-3 h-3" />
            {alternative.voltage}
          </div>
        )}
        {alternative.communication && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Wifi className="w-3 h-3" />
            {alternative.communication}
          </div>
        )}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Settings className="w-3 h-3" />
          Compatibility: {alternative.compatibilityScore}%
        </div>
      </div>
      
      {/* 説明 */}
      {alternative.description && (
        <p className="text-xs text-gray-500 mb-2">
          {alternative.description}
        </p>
      )}
      
      {/* 価格見積もり */}
      {alternative.priceEstimate && (
        <p className="text-sm font-medium text-gray-700">
          Estimated Price: {alternative.priceEstimate}
        </p>
      )}
      
      {/* 選択インジケーター */}
      {isSelected && (
        <div className="mt-3 flex items-center gap-2 text-blue-600">
          <ArrowRight className="w-4 h-4" />
          <span className="text-sm font-medium">Selected</span>
        </div>
      )}
    </div>
  )
}