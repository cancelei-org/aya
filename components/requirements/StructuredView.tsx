import React, { useState, useEffect } from 'react'
import { RequirementsSection } from '@/types/requirements'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { 
  ChevronRight, 
  ChevronDown,
  Cpu,
  HardDrive,
  Wifi,
  Zap,
  Box,
  AlertTriangle,
  CheckCircle,
  Info
} from 'lucide-react'

interface StructuredViewProps {
  requirementId: string
  sections: RequirementsSection[]
  onSectionClick?: (sectionId: string) => void
}

interface DependencyGraphProps {
  sections: RequirementsSection[]
}

const DependencyGraph: React.FC<DependencyGraphProps> = ({ sections }) => {
  const [selectedSection, setSelectedSection] = useState<string | null>(null)

  // Create adjacency list for dependencies
  const dependencyMap = new Map<string, string[]>()
  sections.forEach(section => {
    if (section.dependencies && section.dependencies.length > 0) {
      dependencyMap.set(section.id, section.dependencies)
    }
  })

  const getSectionById = (id: string) => sections.find(s => s.id === id)

  return (
    <div className="relative bg-gray-50 rounded-lg p-6 min-h-[300px]">
      <h3 className="text-lg font-semibold mb-4">Dependency Graph</h3>
      
      <div className="grid grid-cols-3 gap-4">
        {/* Base layer - no dependencies */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-600 mb-2">Foundation</h4>
          {sections.filter(s => !s.dependencies || s.dependencies.length === 0).map(section => (
            <div
              key={section.id}
              onClick={() => setSelectedSection(section.id)}
              className={`p-3 bg-white rounded-lg border-2 cursor-pointer transition-all ${
                selectedSection === section.id 
                  ? 'border-blue-500 shadow-md' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{section.title}</span>
                <CheckCircle className={`w-4 h-4 ${
                  section.completeness === 100 ? 'text-green-500' : 'text-gray-300'
                }`} />
              </div>
            </div>
          ))}
        </div>

        {/* Middle layer - depends on foundation */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-600 mb-2">Core Requirements</h4>
          {sections.filter(s => 
            s.dependencies && 
            s.dependencies.length === 1 &&
            (!getSectionById(s.dependencies[0])?.dependencies || 
             getSectionById(s.dependencies[0])?.dependencies?.length === 0)
          ).map(section => (
            <div
              key={section.id}
              onClick={() => setSelectedSection(section.id)}
              className={`p-3 bg-white rounded-lg border-2 cursor-pointer transition-all ${
                selectedSection === section.id 
                  ? 'border-blue-500 shadow-md' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{section.title}</span>
                <CheckCircle className={`w-4 h-4 ${
                  section.completeness === 100 ? 'text-green-500' : 'text-gray-300'
                }`} />
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Depends on: {section.dependencies.join(', ')}
              </div>
            </div>
          ))}
        </div>

        {/* Top layer - complex dependencies */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-600 mb-2">Advanced Requirements</h4>
          {sections.filter(s => 
            s.dependencies && 
            (s.dependencies.length > 1 || 
             (s.dependencies.length === 1 && 
              getSectionById(s.dependencies[0])?.dependencies && 
              getSectionById(s.dependencies[0])?.dependencies!.length > 0))
          ).map(section => (
            <div
              key={section.id}
              onClick={() => setSelectedSection(section.id)}
              className={`p-3 bg-white rounded-lg border-2 cursor-pointer transition-all ${
                selectedSection === section.id 
                  ? 'border-blue-500 shadow-md' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{section.title}</span>
                <CheckCircle className={`w-4 h-4 ${
                  section.completeness === 100 ? 'text-green-500' : 'text-gray-300'
                }`} />
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Depends on: {section.dependencies.join(', ')}
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedSection && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">
            {getSectionById(selectedSection)?.title}
          </h4>
          <p className="text-sm text-blue-700">
            Completeness: {getSectionById(selectedSection)?.completeness}%
          </p>
          {getSectionById(selectedSection)?.dependencies && (
            <p className="text-sm text-blue-700 mt-1">
              This section requires: {getSectionById(selectedSection)?.dependencies.join(', ')}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export default function StructuredView({ 
  requirementId, 
  sections,
  onSectionClick 
}: StructuredViewProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<'category' | 'dependency'>('category')

  // Group sections by type
  const sectionsByType = sections.reduce((acc, section) => {
    if (!acc[section.type]) {
      acc[section.type] = []
    }
    acc[section.type].push(section)
    return acc
  }, {} as Record<string, RequirementsSection[]>)

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId)
    } else {
      newExpanded.add(sectionId)
    }
    setExpandedSections(newExpanded)
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'hardware': return <Cpu className="w-5 h-5" />
      case 'software': return <HardDrive className="w-5 h-5" />
      case 'interface': return <Wifi className="w-5 h-5" />
      case 'performance': return <Zap className="w-5 h-5" />
      case 'system': return <Box className="w-5 h-5" />
      default: return <Info className="w-5 h-5" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'hardware': return 'text-blue-600 bg-blue-50'
      case 'software': return 'text-green-600 bg-green-50'
      case 'interface': return 'text-purple-600 bg-purple-50'
      case 'performance': return 'text-orange-600 bg-orange-50'
      case 'system': return 'text-gray-600 bg-gray-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getCompletenessStatus = (completeness: number) => {
    if (completeness === 100) return { icon: CheckCircle, color: 'text-green-500' }
    if (completeness >= 70) return { icon: Info, color: 'text-blue-500' }
    if (completeness >= 40) return { icon: AlertTriangle, color: 'text-yellow-500' }
    return { icon: AlertTriangle, color: 'text-red-500' }
  }

  const calculateTypeCompleteness = (typeSections: RequirementsSection[]) => {
    if (typeSections.length === 0) return 0
    const total = typeSections.reduce((sum, section) => sum + section.completeness, 0)
    return Math.round(total / typeSections.length)
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Requirements Structure</CardTitle>
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'category' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('category')}
            >
              By Category
            </Button>
            <Button
              variant={viewMode === 'dependency' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('dependency')}
            >
              Dependencies
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {viewMode === 'category' ? (
          <div className="space-y-4">
            {Object.entries(sectionsByType).map(([type, typeSections]) => {
              const typeCompleteness = calculateTypeCompleteness(typeSections)
              const isExpanded = expandedSections.has(type)
              
              return (
                <div key={type} className="border rounded-lg overflow-hidden">
                  <div
                    onClick={() => toggleSection(type)}
                    className="p-4 bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${getTypeColor(type)}`}>
                          {getTypeIcon(type)}
                        </div>
                        <div>
                          <h3 className="font-semibold capitalize">{type} Requirements</h3>
                          <p className="text-sm text-gray-600">
                            {typeSections.length} section{typeSections.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm font-medium">{typeCompleteness}%</p>
                          <Progress value={typeCompleteness} className="w-24 h-2" />
                        </div>
                        {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                      </div>
                    </div>
                  </div>
                  
                  {isExpanded && (
                    <div className="border-t">
                      {typeSections.map(section => {
                        const status = getCompletenessStatus(section.completeness)
                        const StatusIcon = status.icon
                        
                        return (
                          <div
                            key={section.id}
                            onClick={() => onSectionClick?.(section.id)}
                            className="p-4 border-b last:border-b-0 hover:bg-gray-50 cursor-pointer transition-colors"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <StatusIcon className={`w-4 h-4 ${status.color}`} />
                                  <h4 className="font-medium">{section.title}</h4>
                                </div>
                                
                                {section.content && (
                                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                    {section.content}
                                  </p>
                                )}
                                
                                {section.dependencies && section.dependencies.length > 0 && (
                                  <div className="flex items-center gap-2 mt-2">
                                    <span className="text-xs text-gray-500">Depends on:</span>
                                    {section.dependencies.map(dep => (
                                      <Badge key={dep} variant="secondary" className="text-xs">
                                        {dep}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                              
                              <div className="ml-4 text-right">
                                <p className="text-sm font-medium">{section.completeness}%</p>
                                <Progress value={section.completeness} className="w-16 h-2 mt-1" />
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <DependencyGraph sections={sections} />
        )}
      </CardContent>
    </Card>
  )
}