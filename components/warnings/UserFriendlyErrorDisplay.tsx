'use client'

import React, { useState } from 'react'
import { 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  X, 
  ChevronDown, 
  ChevronRight, 
  CheckCircle,
  Clock,
  Wrench,
  Lightbulb,
  Play
} from 'lucide-react'
import type { UserFriendlyMessage, Solution, QuickFix } from '@/utils/userFriendlyMessages'

export interface UserFriendlyErrorDisplayProps {
  message: UserFriendlyMessage
  onClose?: () => void
  onQuickFix?: (quickFix: QuickFix) => void
  onApplySolution?: (solution: Solution) => void
  compact?: boolean
}

export const UserFriendlyErrorDisplay: React.FC<UserFriendlyErrorDisplayProps> = ({
  message,
  onClose,
  onQuickFix,
  onApplySolution,
  compact = false
}) => {
  const [expandedSolution, setExpandedSolution] = useState<number | null>(null)
  const [showLearnMore, setShowLearnMore] = useState(false)

  const getSeverityIcon = () => {
    switch (message.severity) {
      case 'critical':
        return <AlertCircle className="h-5 w-5 text-red-600" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-orange-600" />
      default:
        return <Info className="h-5 w-5 text-blue-600" />
    }
  }

  const getSeverityColors = () => {
    switch (message.severity) {
      case 'critical':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-800',
          accent: 'border-l-red-500'
        }
      case 'warning':
        return {
          bg: 'bg-orange-50',
          border: 'border-orange-200', 
          text: 'text-orange-800',
          accent: 'border-l-orange-500'
        }
      default:
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          text: 'text-blue-800',
          accent: 'border-l-blue-500'
        }
    }
  }

  const colors = getSeverityColors()

  // const getDifficultyBadge = () => {
  //   const styles = {
  //     easy: 'bg-green-100 text-green-800',
  //     medium: 'bg-yellow-100 text-yellow-800',
  //     hard: 'bg-red-100 text-red-800'
  //   }
  //   
  //   return (
  //     <span className={`text-xs px-2 py-1 rounded-full ${styles[difficulty]}`}>
  //       {difficulty.toUpperCase()}
  //     </span>
  //   )
  // }

  if (compact) {
    return (
      <div className={`${colors.bg} ${colors.border} border rounded-lg p-3 ${colors.accent} border-l-4`}>
        <div className="flex items-start gap-3">
          {getSeverityIcon()}
          <div className="flex-1 min-w-0">
            <h4 className={`font-medium ${colors.text} mb-1`}>
              {message.title}
            </h4>
            <p className="text-sm text-gray-600 mb-2">
              {message.description}
            </p>
            
            {/* Quick Fix Button */}
            {message.quickFix && onQuickFix && (
              <button
                onClick={() => onQuickFix(message.quickFix!)}
                className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
              >
                <Play className="h-3 w-3" />
                {message.quickFix.buttonText}
              </button>
            )}
          </div>
          
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={`${colors.bg} ${colors.border} border rounded-lg ${colors.accent} border-l-4`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-start gap-3">
          {getSeverityIcon()}
          <div className="flex-1">
            <h3 className={`text-lg font-semibold ${colors.text} mb-2`}>
              {message.title}
            </h3>
            <p className="text-gray-700 mb-3">
              {message.description}
            </p>
            
            {/* Quick Fix Section */}
            {message.quickFix && onQuickFix && (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => onQuickFix(message.quickFix!)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  <Play className="h-4 w-4" />
                  {message.quickFix.buttonText}
                </button>
                <span className="text-sm text-gray-600">
                  {message.quickFix.automated ? '🤖 Automated fix' : '👤 Manual process'}
                </span>
              </div>
            )}
          </div>
          
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Solutions Section */}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Wrench className="h-5 w-5 text-gray-600" />
          <h4 className="font-semibold text-gray-900">
            Solutions ({message.solutions.length})
          </h4>
        </div>

        <div className="space-y-3">
          {message.solutions.map((solution, index) => (
            <SolutionCard
              key={index}
              solution={solution}
              index={index}
              isExpanded={expandedSolution === index}
              onToggleExpand={() => setExpandedSolution(
                expandedSolution === index ? null : index
              )}
              onApply={onApplySolution}
            />
          ))}
        </div>
      </div>

      {/* Learn More Section */}
      {message.learnMore && (
        <div className="border-t border-gray-200 p-4">
          <button
            onClick={() => setShowLearnMore(!showLearnMore)}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors"
          >
            <Lightbulb className="h-4 w-4" />
            <span className="font-medium">Learn More</span>
            {showLearnMore ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
          
          {showLearnMore && (
            <div className="mt-3 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">{message.learnMore}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface SolutionCardProps {
  solution: Solution
  index: number
  isExpanded: boolean
  onToggleExpand: () => void
  onApply?: (solution: Solution) => void
}

const SolutionCard: React.FC<SolutionCardProps> = ({
  solution,
  index,
  isExpanded,
  onToggleExpand,
  onApply
}) => {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Solution Header */}
      <div 
        className="p-3 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
        onClick={onToggleExpand}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-gray-600" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-600" />
              )}
              <span className="font-medium text-gray-900">
                {index + 1}. {solution.title}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {getDifficultyBadge(solution.difficulty)}
              <div className="flex items-center gap-1 text-xs text-gray-600">
                <Clock className="h-3 w-3" />
                {solution.timeEstimate}
              </div>
            </div>
          </div>
        </div>
        <p className="text-sm text-gray-600 mt-1">{solution.description}</p>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-4 border-t border-gray-200">
          {/* Steps */}
          <div className="mb-4">
            <h5 className="font-medium text-gray-900 mb-2">Step-by-step guide:</h5>
            <ol className="space-y-2">
              {solution.steps.map((step, stepIndex) => (
                <li key={stepIndex} className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-5 h-5 bg-blue-100 text-blue-800 text-xs rounded-full flex items-center justify-center font-medium mt-0.5">
                    {stepIndex + 1}
                  </span>
                  <span className="text-sm text-gray-700">{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Required Parts */}
          {solution.requiredParts && solution.requiredParts.length > 0 && (
            <div className="mb-4">
              <h5 className="font-medium text-gray-900 mb-2">Required parts:</h5>
              <ul className="space-y-1">
                {solution.requiredParts.map((part, partIndex) => (
                  <li key={partIndex} className="flex items-center gap-2 text-sm text-gray-700">
                    <CheckCircle className="h-3 w-3 text-green-600" />
                    {part}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Apply Button */}
          {onApply && (
            <button
              onClick={() => onApply(solution)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              <Play className="h-4 w-4" />
              Apply This Solution
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function getDifficultyBadge(difficulty: Solution['difficulty']) {
  const styles = {
    easy: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800', 
    hard: 'bg-red-100 text-red-800'
  }
  
  return (
    <span className={`text-xs px-2 py-1 rounded-full ${styles[difficulty]}`}>
      {difficulty.toUpperCase()}
    </span>
  )
}

export default UserFriendlyErrorDisplay