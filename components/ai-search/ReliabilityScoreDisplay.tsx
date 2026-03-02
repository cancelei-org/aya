'use client'

import React, { useState } from 'react'
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  TrendingUp, 
  Globe,
  FileText,
  Users,
  Clock
} from 'lucide-react'
import type { ReliabilityMetrics } from '@/utils/data/analysis/reliabilityScoreSystem'
import type { SpecificationSource } from '@/utils/ai/core/aiSpecificationService'

export interface ReliabilityScoreDisplayProps {
  metrics: ReliabilityMetrics
  sources: SpecificationSource[]
  componentName: string
  showDetailedBreakdown?: boolean
  onSourceClick?: (source: SpecificationSource) => void
}

export const ReliabilityScoreDisplay: React.FC<ReliabilityScoreDisplayProps> = ({
  metrics,
  sources,
  componentName,
  showDetailedBreakdown = false,
  onSourceClick
}) => {
  const [showDetails, setShowDetails] = useState(showDetailedBreakdown)

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600 bg-green-100'
    if (score >= 50) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  const getScoreBorderColor = (score: number) => {
    if (score >= 70) return 'border-green-300'
    if (score >= 50) return 'border-yellow-300'
    return 'border-red-300'
  }

  const getScoreIcon = (score: number) => {
    if (score >= 70) return <CheckCircle className="h-5 w-5 text-green-600" />
    if (score >= 50) return <Shield className="h-5 w-5 text-yellow-600" />
    return <AlertTriangle className="h-5 w-5 text-red-600" />
  }

  const getSourceIcon = (type: string) => {
    switch (type) {
      case 'official':
      case 'datasheet':
        return <FileText className="h-4 w-4 text-blue-600" />
      case 'github':
        return <Globe className="h-4 w-4 text-purple-600" />
      case 'community':
      case 'forum':
        return <Users className="h-4 w-4 text-orange-600" />
      default:
        return <Info className="h-4 w-4 text-gray-600" />
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Main Score Display */}
      <div className={`p-4 border-l-4 ${getScoreBorderColor(metrics.overallScore)}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getScoreIcon(metrics.overallScore)}
            <div>
              <h3 className="font-semibold text-gray-900">
                Reliability Score: {componentName}
              </h3>
              <p className="text-sm text-gray-600">
                Based on {sources.length} source{sources.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className={`px-3 py-2 rounded-full font-bold text-lg ${getScoreColor(metrics.overallScore)}`}>
              {metrics.overallScore}%
            </div>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <Info className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Quality Indicators */}
        <div className="mt-3 flex flex-wrap gap-2">
          {metrics.qualityIndicators.hasOfficialSource && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
              <CheckCircle className="h-3 w-3" />
              Official Source
            </span>
          )}
          {metrics.qualityIndicators.hasDatasheet && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
              <FileText className="h-3 w-3" />
              Datasheet
            </span>
          )}
          {metrics.qualityIndicators.sourceConsistency >= 80 && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
              <TrendingUp className="h-3 w-3" />
              Consistent
            </span>
          )}
          {metrics.qualityIndicators.lastVerificationAge <= 7 && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 text-emerald-800 text-xs rounded-full">
              <Clock className="h-3 w-3" />
              Recently Verified
            </span>
          )}
        </div>

        {/* Risk Factors (if any) */}
        {metrics.riskFactors.length > 0 && (
          <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded">
            <div className="flex items-center gap-1 text-red-800 text-sm font-medium mb-1">
              <AlertTriangle className="h-3 w-3" />
              Risk Factors
            </div>
            <ul className="text-xs text-red-700 space-y-1">
              {metrics.riskFactors.slice(0, 2).map((risk, index) => (
                <li key={index} className="flex items-start gap-1">
                  <span>•</span>
                  <span>{risk}</span>
                </li>
              ))}
              {metrics.riskFactors.length > 2 && (
                <li className="text-red-600">
                  +{metrics.riskFactors.length - 2} more risks
                </li>
              )}
            </ul>
          </div>
        )}
      </div>

      {/* Detailed Breakdown */}
      {showDetails && (
        <div className="border-t border-gray-200 p-4 space-y-4">
          {/* Source Breakdown */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Source Analysis</h4>
            <div className="space-y-2">
              {Object.entries(metrics.sourceBreakdown).map(([sourceType, data]) => (
                <div key={sourceType} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center gap-2">
                    {getSourceIcon(sourceType)}
                    <span className="text-sm font-medium capitalize">{sourceType}</span>
                    <span className="text-xs text-gray-500">({data.count})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{data.averageReliability}%</span>
                    <span className="text-xs text-gray-500">
                      {data.weightContribution}% weight
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quality Metrics */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Quality Metrics</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Source Consistency:</span>
                <span className="font-medium">
                  {metrics.qualityIndicators.sourceConsistency}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Completeness:</span>
                <span className="font-medium">
                  {metrics.qualityIndicators.informationCompleteness}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Last Verified:</span>
                <span className="font-medium">
                  {metrics.qualityIndicators.lastVerificationAge === Infinity 
                    ? 'Unknown' 
                    : `${metrics.qualityIndicators.lastVerificationAge} days ago`}
                </span>
              </div>
            </div>
          </div>

          {/* Individual Sources */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">
              Information Sources ({sources.length})
            </h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {sources.map((source, index) => (
                <div
                  key={index}
                  className={`p-2 border rounded cursor-pointer hover:bg-gray-50 transition-colors ${
                    onSourceClick ? 'hover:border-blue-300' : ''
                  }`}
                  onClick={() => onSourceClick?.(source)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      {getSourceIcon(source.type)}
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {source.title}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {source.url}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <span className={`text-xs px-2 py-1 rounded ${
                        source.reliability >= 80 
                          ? 'bg-green-100 text-green-800'
                          : source.reliability >= 60
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {source.reliability}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recommendations */}
          {metrics.recommendations.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Recommendations</h4>
              <ul className="space-y-1">
                {metrics.recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                    <CheckCircle className="h-3 w-3 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Compact version for lists
export const CompactReliabilityScore: React.FC<{
  score: number
  riskCount: number
  onClick?: () => void
}> = ({ score, riskCount, onClick }) => {
  return (
    <div 
      className={`inline-flex items-center gap-2 px-2 py-1 rounded cursor-pointer transition-colors ${
        onClick ? 'hover:bg-gray-100' : ''
      } ${getScoreColor(score)}`}
      onClick={onClick}
    >
      {getScoreIcon(score)}
      <span className="font-medium text-sm">{score}%</span>
      {riskCount > 0 && (
        <span className="text-xs">
          {riskCount} risk{riskCount !== 1 ? 's' : ''}
        </span>
      )}
    </div>
  )
}

// Helper functions (duplicated for external use)
function getScoreColor(score: number) {
  if (score >= 70) return 'text-green-600 bg-green-100'
  if (score >= 50) return 'text-yellow-600 bg-yellow-100'
  return 'text-red-600 bg-red-100'
}

function getScoreIcon(score: number) {
  if (score >= 70) return <CheckCircle className="h-4 w-4 text-green-600" />
  if (score >= 50) return <Shield className="h-4 w-4 text-yellow-600" />
  return <AlertTriangle className="h-4 w-4 text-red-600" />
}

export default ReliabilityScoreDisplay