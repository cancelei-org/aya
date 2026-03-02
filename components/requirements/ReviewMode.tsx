import React, { useState, useEffect } from 'react'
import { RequirementsDocument, RequirementsSection } from '@/types/requirements'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  FileText,
  Target,
  Settings,
  Zap,
  Shield,
  Users,
  Clock,
  DollarSign,
  Wrench
} from 'lucide-react'

interface ReviewModeProps {
  document: RequirementsDocument
  sections: RequirementsSection[]
  onApprove: (comments: string) => void
  onReject: (comments: string) => void
  isReviewing?: boolean
}

interface ReviewCheckItem {
  id: string
  category: string
  title: string
  description: string
  importance: 'critical' | 'important' | 'recommended'
  checked: boolean
  automated: boolean
  result?: 'pass' | 'fail' | 'warning'
  details?: string
}

interface ReviewCategory {
  id: string
  title: string
  icon: React.ReactNode
  color: string
  items: ReviewCheckItem[]
}

export default function ReviewMode({ 
  document, 
  sections, 
  onApprove, 
  onReject, 
  isReviewing = false 
}: ReviewModeProps) {
  const [checkItems, setCheckItems] = useState<ReviewCategory[]>([])
  const [comments, setComments] = useState('')
  const [overallScore, setOverallScore] = useState(0)

  useEffect(() => {
    initializeReviewItems()
  }, [document, sections])

  const initializeReviewItems = () => {
    const categories: ReviewCategory[] = [
      {
        id: 'completeness',
        title: 'Completeness Check',
        icon: <FileText className="w-5 h-5" />,
        color: 'text-blue-600',
        items: [
          {
            id: 'purpose-defined',
            category: 'completeness',
            title: 'Purpose and Scope Clearly Defined',
            description: 'System purpose and main functions are clearly defined',
            importance: 'critical',
            checked: false,
            automated: true,
            result: checkPurposeDefined() ? 'pass' : 'fail'
          },
          {
            id: 'functional-requirements',
            category: 'completeness',
            title: 'All Functional Requirements Specified',
            description: 'All major functions are specifically described',
            importance: 'critical',
            checked: false,
            automated: true,
            result: checkFunctionalRequirements() ? 'pass' : 'warning'
          },
          {
            id: 'non-functional-requirements',
            category: 'completeness',
            title: 'Non-functional Requirements Included',
            description: 'Performance, security, availability, and other non-functional requirements are defined',
            importance: 'important',
            checked: false,
            automated: true,
            result: checkNonFunctionalRequirements() ? 'pass' : 'warning'
          },
          {
            id: 'constraints-identified',
            category: 'completeness',
            title: 'Constraints and Limitations Identified',
            description: 'Technical, environmental, and cost constraints are clearly documented',
            importance: 'important',
            checked: false,
            automated: true,
            result: checkConstraints() ? 'pass' : 'warning'
          }
        ]
      },
      {
        id: 'quality',
        title: 'Quality Assessment',
        icon: <Target className="w-5 h-5" />,
        color: 'text-green-600',
        items: [
          {
            id: 'measurable-criteria',
            category: 'quality',
            title: 'Measurable and Objective Criteria',
            description: 'Requirements are described in numerically and objectively measurable form',
            importance: 'critical',
            checked: false,
            automated: true,
            result: checkMeasurableCriteria() ? 'pass' : 'fail'
          },
          {
            id: 'testable-requirements',
            category: 'quality',
            title: 'Testable Requirements',
            description: 'Each requirement is written in a testable and verifiable form',
            importance: 'critical',
            checked: false,
            automated: true,
            result: checkTestability() ? 'pass' : 'warning'
          },
          {
            id: 'consistent-terminology',
            category: 'quality',
            title: 'Consistent Terminology',
            description: 'Technical and specialized terms are used consistently',
            importance: 'important',
            checked: false,
            automated: true,
            result: checkTerminologyConsistency() ? 'pass' : 'warning'
          },
          {
            id: 'clear-language',
            category: 'quality',
            title: 'Clear and Unambiguous Language',
            description: 'Avoids ambiguous expressions and uses clear, specific language',
            importance: 'important',
            checked: false,
            automated: true,
            result: checkClearLanguage() ? 'pass' : 'warning'
          }
        ]
      },
      {
        id: 'technical',
        title: 'Technical Validation',
        icon: <Settings className="w-5 h-5" />,
        color: 'text-purple-600',
        items: [
          {
            id: 'technical-feasibility',
            category: 'technical',
            title: 'Technical Feasibility',
            description: 'Requirements are achievable with current technology level',
            importance: 'critical',
            checked: false,
            automated: false
          },
          {
            id: 'hardware-compatibility',
            category: 'technical',
            title: 'Hardware Compatibility',
            description: 'Compatibility between hardware specifications is ensured',
            importance: 'critical',
            checked: false,
            automated: true,
            result: checkHardwareCompatibility() ? 'pass' : 'fail'
          },
          {
            id: 'performance-realistic',
            category: 'technical',
            title: 'Realistic Performance Requirements',
            description: 'Performance requirements are realistic and achievable',
            importance: 'important',
            checked: false,
            automated: false
          },
          {
            id: 'scalability-considered',
            category: 'technical',
            title: 'Scalability Considerations',
            description: 'Future expansion and modification possibilities are considered',
            importance: 'recommended',
            checked: false,
            automated: false
          }
        ]
      },
      {
        id: 'business',
        title: 'Business Requirements',
        icon: <DollarSign className="w-5 h-5" />,
        color: 'text-orange-600',
        items: [
          {
            id: 'cost-estimation',
            category: 'business',
            title: 'Cost Estimation',
            description: 'Development and operational cost estimates are included',
            importance: 'important',
            checked: false,
            automated: true,
            result: checkCostEstimation() ? 'pass' : 'warning'
          },
          {
            id: 'timeline-realistic',
            category: 'business',
            title: 'Realistic Timeline',
            description: 'Development schedule is realistic',
            importance: 'important',
            checked: false,
            automated: false
          },
          {
            id: 'regulatory-compliance',
            category: 'business',
            title: 'Regulatory Compliance',
            description: 'Compliance with relevant regulations and industry standards is considered',
            importance: 'critical',
            checked: false,
            automated: false
          },
          {
            id: 'risk-assessment',
            category: 'business',
            title: 'Risk Assessment',
            description: 'Major risks are identified and assessed',
            importance: 'recommended',
            checked: false,
            automated: false
          }
        ]
      }
    ]

    setCheckItems(categories)
    calculateOverallScore(categories)
  }

  // Automated check functions
  const checkPurposeDefined = (): boolean => {
    const text = (document.contentText || '').toLowerCase()
    return text.includes('purpose') || text.includes('goal') || text.includes('objective')
  }

  const checkFunctionalRequirements = (): boolean => {
    return sections.some(section => 
      section.type === 'functional' && section.completeness >= 80
    )
  }

  const checkNonFunctionalRequirements = (): boolean => {
    const text = (document.contentText || '').toLowerCase()
    const nonFunctionalKeywords = ['performance', 'security', 'availability', 'reliability']
    return nonFunctionalKeywords.some(keyword => text.includes(keyword))
  }

  const checkConstraints = (): boolean => {
    return sections.some(section => 
      section.type === 'constraints' && section.completeness >= 70
    )
  }

  const checkMeasurableCriteria = (): boolean => {
    const text = document.contentText || ''
    // Check for numeric values with units
    const numericPattern = /\d+\s*(ms|seconds?|minutes?|hours?|days?|°C|°F|V|A|W|MHz|GHz|MB|GB|%)/i
    return numericPattern.test(text)
  }

  const checkTestability = (): boolean => {
    const text = (document.contentText || '').toLowerCase()
    const testableKeywords = ['must', 'shall', 'should', 'will', 'test', 'verify', 'validate']
    return testableKeywords.some(keyword => text.includes(keyword))
  }

  const checkTerminologyConsistency = (): boolean => {
    // Simplified check - look for consistent use of technical terms
    const text = document.contentText || ''
    return text.length > 100 // Basic check
  }

  const checkClearLanguage = (): boolean => {
    const text = (document.contentText || '').toLowerCase()
    const ambiguousTerms = ['fast', 'slow', 'good', 'bad', 'many', 'few', 'maybe', 'probably']
    const ambiguousCount = ambiguousTerms.filter(term => text.includes(term)).length
    return ambiguousCount < 3 // Allow some ambiguous terms but not too many
  }

  const checkHardwareCompatibility = (): boolean => {
    // Check for voltage compatibility issues
    const text = document.contentText || ''
    const voltagePattern = /(\d+)\s*V/g
    const voltages: number[] = []
    let match
    while ((match = voltagePattern.exec(text)) !== null) {
      voltages.push(parseInt(match[1]))
    }
    
    if (voltages.length > 1) {
      const maxVoltage = Math.max(...voltages)
      const minVoltage = Math.min(...voltages)
      return maxVoltage / minVoltage <= 10 // Allow reasonable voltage range
    }
    return true
  }

  const checkCostEstimation = (): boolean => {
    const text = (document.contentText || '').toLowerCase()
    const costKeywords = ['cost', 'price', 'budget', '$', 'expensive', 'cheap']
    return costKeywords.some(keyword => text.includes(keyword))
  }

  const handleCheckChange = (categoryId: string, itemId: string, checked: boolean) => {
    setCheckItems(prevCategories => {
      const updatedCategories = prevCategories.map(category => {
        if (category.id === categoryId) {
          return {
            ...category,
            items: category.items.map(item => 
              item.id === itemId ? { ...item, checked } : item
            )
          }
        }
        return category
      })
      calculateOverallScore(updatedCategories)
      return updatedCategories
    })
  }

  const calculateOverallScore = (categories: ReviewCategory[]) => {
    let totalWeight = 0
    let achievedWeight = 0

    categories.forEach(category => {
      category.items.forEach(item => {
        const weight = item.importance === 'critical' ? 3 : 
                      item.importance === 'important' ? 2 : 1
        
        totalWeight += weight
        
        if (item.automated) {
          if (item.result === 'pass') achievedWeight += weight
          else if (item.result === 'warning') achievedWeight += weight * 0.5
        } else if (item.checked) {
          achievedWeight += weight
        }
      })
    })

    const score = totalWeight > 0 ? Math.round((achievedWeight / totalWeight) * 100) : 0
    setOverallScore(score)
  }

  const getResultIcon = (result?: string) => {
    switch (result) {
      case 'pass': return <CheckCircle2 className="w-4 h-4 text-green-600" />
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-600" />
      case 'fail': return <AlertCircle className="w-4 h-4 text-red-600" />
      default: return null
    }
  }

  const getImportanceBadge = (importance: string) => {
    const variants = {
      critical: 'destructive',
      important: 'default',
      recommended: 'secondary'
    } as const
    
    return (
      <Badge variant={variants[importance as keyof typeof variants]} className="text-xs">
        {importance === 'critical' ? 'Critical' : 
         importance === 'important' ? 'Important' : 'Recommended'}
      </Badge>
    )
  }

  const canApprove = () => {
    const criticalItems = checkItems.flatMap(cat => cat.items.filter(item => item.importance === 'critical'))
    const passedCritical = criticalItems.filter(item => 
      item.automated ? item.result === 'pass' : item.checked
    ).length
    
    return passedCritical === criticalItems.length && overallScore >= 80
  }

  return (
    <div className="space-y-6">
      {/* Overall Status */}
      <Card className={`border-2 ${overallScore >= 90 ? 'border-green-500 bg-green-50' : 
                                   overallScore >= 80 ? 'border-yellow-500 bg-yellow-50' : 
                                   'border-red-500 bg-red-50'}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-6 h-6" />
                Review Assessment
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Comprehensive evaluation of requirements definition quality and completeness
              </p>
            </div>
            <div className="text-center">
              <div className={`text-4xl font-bold ${
                overallScore >= 90 ? 'text-green-600' :
                overallScore >= 80 ? 'text-yellow-600' :
                'text-red-600'
              }`}>
                {overallScore}%
              </div>
              <Progress value={overallScore} className="w-32 h-3 mt-2" />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Review Categories */}
      <div className="space-y-4">
        {checkItems.map(category => (
          <Card key={category.id}>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${category.color}`}>
                {category.icon}
                {category.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {category.items.map(item => (
                  <div key={item.id} className="flex items-start gap-3 p-3 rounded-lg border">
                    <div className="flex items-center gap-2 mt-0.5">
                      {item.automated ? (
                        getResultIcon(item.result)
                      ) : (
                        <Checkbox
                          checked={item.checked}
                          onCheckedChange={(checked) => 
                            handleCheckChange(category.id, item.id, checked as boolean)
                          }
                        />
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{item.title}</h4>
                        <div className="flex items-center gap-2">
                          {getImportanceBadge(item.importance)}
                          {item.automated && <Badge variant="outline" className="text-xs">Auto</Badge>}
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                      {item.details && (
                        <p className="text-xs text-gray-500 mt-1">{item.details}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Comments Section */}
      <Card>
        <CardHeader>
          <CardTitle>Review Comments</CardTitle>
        </CardHeader>
        <CardContent>
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder="Please enter reasons or comments for approval/rejection..."
            className="w-full h-32 p-3 border rounded-lg resize-none"
          />
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        <Button
          variant="outline"
          onClick={() => onReject(comments)}
          disabled={isReviewing}
        >
          Request Changes
        </Button>
        <Button
          onClick={() => onApprove(comments)}
          disabled={isReviewing || !canApprove()}
          className={canApprove() ? 'bg-green-600 hover:bg-green-700' : ''}
        >
          {isReviewing ? (
            <>
              <Clock className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Approve
            </>
          )}
        </Button>
      </div>

      {!canApprove() && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-2 text-yellow-800">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-medium">Approval Conditions Not Met</span>
          </div>
          <p className="text-sm text-yellow-700 mt-1">
            All critical items must be cleared and overall score must be 80% or higher for approval.
          </p>
        </div>
      )}
    </div>
  )
}