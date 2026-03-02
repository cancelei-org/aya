"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { X, AlertTriangle, AlertCircle, Info, CheckCircle } from "lucide-react"
import type { CompatibilityResult, CompatibilityIssue } from '@/types'

interface CompatibilityResultModalProps {
  result: CompatibilityResult | null
  isOpen: boolean
  onClose: () => void
  onRequestAlternatives?: () => void  // 🎯 代替部品提案要求コールバック
}

// 問題の重要度に応じたアイコンと色を取得
function getIssueIcon(severity: CompatibilityIssue['severity']) {
  switch (severity) {
    case 'critical':
      return <AlertTriangle className="w-5 h-5 text-red-500" />
    case 'warning':
      return <AlertCircle className="w-5 h-5 text-yellow-500" />
    case 'info':
      return <Info className="w-5 h-5 text-blue-500" />
    default:
      return <Info className="w-5 h-5 text-gray-500" />
  }
}

// Issue type English labels
function getIssueTypeLabel(type: CompatibilityIssue['type']) {
  switch (type) {
    case 'voltage_mismatch':
      return '⚡ Voltage Mismatch'
    case 'communication_incompatible':
      return '📡 Communication Incompatible'
    case 'power_insufficient':
      return '🔋 Power Insufficient'
    case 'physical_constraint':
      return '📐 Physical Constraint'
    case 'software_hardware_mismatch':
      return '💻 Software-Hardware Mismatch'
    case 'software_requirement':
      return '⚙️ Software Requirement'
    default:
      return '❓ Other'
  }
}

export function CompatibilityResultModal({ 
  result, 
  isOpen, 
  onClose,
  onRequestAlternatives
}: CompatibilityResultModalProps) {
  if (!isOpen || !result) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden sm:mx-4 mx-2">
        {/* ヘッダー - 固定 */}
        <div className="flex items-center justify-between sm:p-6 p-4 border-b flex-shrink-0">
          <div className="flex items-center space-x-3">
            {result.isCompatible ? (
              <CheckCircle className="w-6 h-6 text-green-500" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-red-500" />
            )}
            <h2 className="sm:text-xl text-lg font-semibold">🔧 Compatibility Check Results</h2>
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="p-2"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* 結果概要 - 固定 */}
        <div className="sm:p-6 p-4 border-b flex-shrink-0">
          <div className={`p-4 rounded-lg ${
            result.isCompatible 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-red-50 border border-red-200'
          }`}>
            <p className="text-lg font-medium">
              {result.summary}
            </p>
            {result.issues.length > 0 && (
              <p className="text-sm text-gray-600 mt-2">
                {result.issues.filter(i => i.severity === 'critical').length} critical issues, 
                {result.issues.filter(i => i.severity === 'warning').length} warnings, 
                {result.issues.filter(i => i.severity === 'info').length} info items
              </p>
            )}
          </div>
        </div>

        {/* 問題詳細リスト - スクロール可能 */}
        <div 
          className="flex-1 overflow-y-auto sm:p-6 p-4 min-h-0"
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: '#D1D5DB #F3F4F6'
          }}
        >
          {result.issues.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <p className="text-lg text-gray-600">All components are compatible!</p>
              <p className="text-sm text-gray-500 mt-2">You can proceed with wiring and configuration</p>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg mb-4">🔍 Detected Issues</h3>
              
              {result.issues.map((issue, index) => (
                <div 
                  key={index}
                  className={`p-4 rounded-lg border-l-4 ${
                    issue.severity === 'critical' 
                      ? 'bg-red-50 border-l-red-500'
                      : issue.severity === 'warning'
                      ? 'bg-yellow-50 border-l-yellow-500'
                      : 'bg-blue-50 border-l-blue-500'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    {getIssueIcon(issue.severity)}
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="font-semibold text-gray-900">
                          {issue.componentName}
                        </span>
                        <span className="text-xs px-2 py-1 bg-gray-200 rounded-full">
                          {getIssueTypeLabel(issue.type)}
                        </span>
                      </div>
                      
                      <p className="text-gray-700 mb-2">
                        <strong>Issue:</strong> {issue.issue}
                      </p>
                      
                      <p className="text-gray-600 mb-3">
                        <strong>💡 Recommended Solution:</strong> {issue.recommendation}
                      </p>
                      
                      {(issue.affectedComponentNames?.length || issue.affectedComponents.length) > 0 && (
                        <p className="text-sm text-gray-500">
                          <strong>Affected Components:</strong> {issue.affectedComponentNames?.join(', ') || issue.affectedComponents.join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* フッター - 固定 */}
        <div className="flex justify-end sm:p-6 p-4 border-t bg-gray-50 flex-shrink-0">
          <div className="flex space-x-3">
            <Button
              onClick={onClose}
              variant="outline"
            >
              Close
            </Button>
            {!result.isCompatible && onRequestAlternatives && (
              <Button
                onClick={() => {
                  console.log('🔄 Requesting alternative parts suggestion')
                  onRequestAlternatives()
                  onClose() // Close modal
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                🔄 Find Alternatives
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}