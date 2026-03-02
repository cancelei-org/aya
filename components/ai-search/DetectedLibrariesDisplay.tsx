"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { RefreshCw, ExternalLink, AlertCircle, CheckCircle, Clock } from 'lucide-react'
import type { DetectedLibrary } from '@/types'

interface DetectedLibrariesDisplayProps {
  libraries: DetectedLibrary[]
  githubRepoUrl?: string
  lastAnalyzed?: string
  isAnalyzing: boolean
  onAnalyzeRepo: (url: string) => void
  onClearAnalysis: () => void
}

const LIBRARY_TYPE_COLORS = {
  arduino: 'bg-blue-100 text-blue-800 border-blue-200',
  python: 'bg-yellow-100 text-yellow-800 border-yellow-200', 
  nodejs: 'bg-green-100 text-green-800 border-green-200',
  cpp: 'bg-purple-100 text-purple-800 border-purple-200',
  other: 'bg-gray-100 text-gray-800 border-gray-200'
}

const PURPOSE_ICONS = {
  networking: '🌐',
  motor_control: '⚙️', 
  i2c_communication: '🔗',
  spi_communication: '🔗',
  display_control: '📺',
  sensor_reading: '📊',
  sensor_communication: '📡',
  led_control: '💡',
  image_processing: '📷',
  machine_learning: '🧠',
  data_processing: '📈',
  data_analysis: '📊',
  data_visualization: '📊',
  http_communication: '🌐',
  web_server: '🖥️',
  serial_communication: '🔌',
  game_development: '🎮',
  unknown: '❓'
}

export function DetectedLibrariesDisplay({
  libraries,
  githubRepoUrl,
  lastAnalyzed,
  isAnalyzing,
  onAnalyzeRepo,
  onClearAnalysis
}: DetectedLibrariesDisplayProps) {
  const [inputUrl, setInputUrl] = useState(githubRepoUrl || '')
  const [inputError, setInputError] = useState<string | null>(null)

  const handleAnalyze = () => {
    if (!inputUrl.trim()) {
      setInputError('GitHub URLを入力してください')
      return
    }

    if (!isValidGitHubUrl(inputUrl)) {
      setInputError('有効なGitHub URLを入力してください')
      return
    }

    setInputError(null)
    onAnalyzeRepo(inputUrl.trim())
  }

  const handleUrlChange = (url: string) => {
    setInputUrl(url)
    if (inputError) {
      setInputError(null)
    }
  }

  const formatLastAnalyzed = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleString('ja-JP', { 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    } catch {
      return 'Unknown'
    }
  }

  return (
    <div className="p-3 border border-blue-200 rounded-lg bg-blue-50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-blue-800">
          📚 Detected Libraries
        </h3>
        {lastAnalyzed && (
          <div className="flex items-center text-xs text-blue-600">
            <Clock className="w-3 h-3 mr-1" />
            {formatLastAnalyzed(lastAnalyzed)}
          </div>
        )}
      </div>
      
      {/* GitHub URL入力 */}
      <div className="space-y-2 mb-3">
        <label htmlFor="github-url-input" className="text-xs font-medium text-gray-700 block mb-1">
          GitHub Repository URL:
        </label>
        <div className="flex gap-2">
          <div className="flex-1">
            <input
              id="github-url-input"
              name="github-url-input"
              type="url"
              autoComplete="url"
              placeholder="https://github.com/user/repo"
              value={inputUrl}
              onChange={(e) => handleUrlChange(e.target.value)}
              className={`w-full px-2 py-1 border rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                inputError ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              disabled={isAnalyzing}
            />
            {inputError && (
              <div className="flex items-center mt-1 text-xs text-red-600">
                <AlertCircle className="w-3 h-3 mr-1" />
                {inputError}
              </div>
            )}
          </div>
          <Button 
            onClick={handleAnalyze}
            disabled={isAnalyzing || !inputUrl.trim()}
            size="sm"
            className="text-xs whitespace-nowrap"
          >
            {isAnalyzing ? (
              <>
                <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                Analyzing...
              </>
            ) : (
              'Analyze'
            )}
          </Button>
        </div>

        {githubRepoUrl && (
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center text-blue-600">
              <ExternalLink className="w-3 h-3 mr-1" />
              <a 
                href={githubRepoUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:underline truncate max-w-48"
              >
                {githubRepoUrl.replace('https://github.com/', '')}
              </a>
            </div>
            <Button
              onClick={onClearAnalysis}
              variant="ghost"
              size="sm"
              className="text-xs text-red-600 hover:text-red-800 p-1"
            >
              clear
            </Button>
          </div>
        )}
      </div>
      
      {/* 解析中の表示 */}
      {isAnalyzing && (
        <div className="flex items-center justify-center py-8 text-blue-600">
          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            <span className="text-sm">Analyzing repository...</span>
        </div>
      )}

      {/* 検出されたライブラリ一覧 */}
      {!isAnalyzing && libraries.length > 0 && (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          <div className="flex items-center mb-2">
            <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
            <span className="text-sm font-medium text-green-800">
              {libraries.length} libraries detected
            </span>
          </div>
          
          {libraries.map((lib, index) => (
            <div key={index} className="bg-white rounded p-2 border border-gray-200">
              <div className="flex justify-between items-start mb-1">
                <div className="flex-1">
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-medium">{lib.name}</span>
                    {lib.version && (
                      <span className="text-xs text-gray-500">v{lib.version}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <span className={`text-xs px-2 py-1 rounded border ${LIBRARY_TYPE_COLORS[lib.type]}`}>
                    {lib.type}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-1 mb-2">
                <span className="text-sm">
                  {PURPOSE_ICONS[lib.purpose as keyof typeof PURPOSE_ICONS] || PURPOSE_ICONS.unknown}
                </span>
                <span className="text-xs text-gray-600 capitalize">
                  {lib.purpose.replace('_', ' ')}
                </span>
              </div>
              
              {lib.hardwareRequirements && lib.hardwareRequirements.length > 0 && (
                <div className="text-xs text-gray-600">
                  <strong>Hardware Required:</strong> {lib.hardwareRequirements.join(', ')}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ライブラリ未検出の表示 */}
      {!isAnalyzing && libraries.length === 0 && githubRepoUrl && (
        <div className="text-xs text-gray-500 text-center py-6">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p>ライブラリが検出されませんでした</p>
          <p className="text-gray-400">リポジトリにArduino、Python、Node.jsのファイルが含まれているか確認してください</p>
        </div>
      )}

      {/* 初期状態の表示 */}
      {!isAnalyzing && libraries.length === 0 && !githubRepoUrl && (
        <div className="text-xs text-gray-500 text-center py-6">
        </div>
      )}

      {/* 統計情報 */}
      {libraries.length > 0 && (
        <div className="mt-3 pt-2 border-t border-blue-200">
          <div className="flex flex-wrap gap-2 text-xs">
            {Object.entries(
              libraries.reduce((acc, lib) => {
                acc[lib.type] = (acc[lib.type] || 0) + 1
                return acc
              }, {} as Record<string, number>)
            ).map(([type, count]) => (
              <span key={type} className={`px-2 py-1 rounded ${LIBRARY_TYPE_COLORS[type as keyof typeof LIBRARY_TYPE_COLORS]}`}>
                {type}: {count}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// GitHub URLの検証
function isValidGitHubUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url)
    return parsedUrl.hostname === 'github.com' && parsedUrl.pathname.split('/').length >= 3
  } catch {
    return false
  }
}