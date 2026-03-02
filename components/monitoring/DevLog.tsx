"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Monitor, User, Settings, ExternalLink, BookOpen, Search, Clock, Star, Filter, FileText, CheckCircle } from "lucide-react"
import RequirementsViewer from "@/components/requirements/RequirementsViewer"
import { DevLogDocument, DocumentType } from '@/types/requirements'

interface AIReference {
  id: string
  title: string
  url: string
  source: 'datasheet' | 'github' | 'forum' | 'official'
  component: string
  confidence: number
  timestamp: string
  category: 'compatibility' | 'specification' | 'implementation'
}

interface DevLogProps {
  projectId?: string
  onApprove?: (requirementId: string, document: any) => void
}

export function DevLog({ projectId, onApprove }: DevLogProps) {
  console.log('🔵 [DevLog] Initialized with onApprove:', typeof onApprove);
  const [activeTab, setActiveTab] = useState<'overview' | 'ai-references' | 'requirements' | 'decisions'>('requirements')
  const [filterSource, setFilterSource] = useState<string>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [documents, setDocuments] = useState<DevLogDocument[]>([])
  const [selectedRequirementId, setSelectedRequirementId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (activeTab === 'requirements' || activeTab === 'decisions') {
      // Only fetch if we have a projectId
      if (projectId) {
        fetchDocuments()
      }
    }
  }, [activeTab, projectId])

  // Listen for requirements update events
  useEffect(() => {
    const handleRequirementsUpdate = (event: Event) => {
      const customEvent = event as CustomEvent
      // Only refresh if the project ID matches
      if (projectId && customEvent.detail.projectId === projectId && 
          activeTab === 'requirements') {
        console.log('📝 Requirements updated, refreshing documents...')
        fetchDocuments()
      }
    }
    
    window.addEventListener('requirementsUpdated', handleRequirementsUpdate)
    return () => window.removeEventListener('requirementsUpdated', handleRequirementsUpdate)
  }, [projectId, activeTab])

  // Auto-refresh when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && activeTab === 'requirements' && projectId) {
        console.log('🔄 Tab became visible, refreshing requirements...')
        fetchDocuments()
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [activeTab, projectId])

  const fetchDocuments = async () => {
    try {
      setLoading(true)
      // Don't fetch if no projectId is provided
      if (!projectId) {
        console.log('📚 [DevLog] No projectId provided, skipping fetch')
        setDocuments([])
        setLoading(false)
        return
      }
      const type = activeTab === 'requirements' ? 'requirements' : activeTab === 'decisions' ? 'decision' : undefined
      const url = `/api/auto-devlog/documents?projectId=${projectId}${type ? `&type=${type}` : ''}`
      console.log('📚 [DevLog] Fetching documents from:', url)
      
      const response = await fetch(url)
      console.log('📚 [DevLog] Response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('📚 [DevLog] Received documents:', data)
        setDocuments(data.data || [])
      } else {
        const errorText = await response.text()
        console.error('📚 [DevLog] Failed to fetch documents:', response.status, errorText)
      }
    } catch (error) {
      console.error('📚 [DevLog] Exception while fetching documents:', error)
    } finally {
      setLoading(false)
    }
  }

  // Sample AI reference data
  const aiReferences: AIReference[] = [
    {
      id: '1',
      title: 'Teensy 4.1 Pinout and Specifications',
      url: 'https://www.pjrc.com/store/teensy41.html',
      source: 'official',
      component: 'Teensy 4.1',
      confidence: 95,
      timestamp: '2025-07-23T10:30:00Z',
      category: 'specification'
    },
    {
      id: '2', 
      title: 'ESP32 I2C Communication Tutorial',
      url: 'https://github.com/espressif/esp-idf/examples/i2c',
      source: 'github',
      component: 'ESP32',
      confidence: 88,
      timestamp: '2025-07-23T09:15:00Z',
      category: 'implementation'
    },
    {
      id: '3',
      title: 'Arduino Uno R3 Power Supply Requirements',
      url: 'https://docs.arduino.cc/hardware/uno-rev3/',
      source: 'official',
      component: 'Arduino Uno',
      confidence: 92,
      timestamp: '2025-07-23T08:45:00Z',
      category: 'compatibility'
    }
  ]

  const filteredReferences = aiReferences.filter(ref => {
    const sourceMatch = filterSource === 'all' || ref.source === filterSource
    const categoryMatch = filterCategory === 'all' || ref.category === filterCategory
    return sourceMatch && categoryMatch
  })

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'official': return <Star className="w-4 h-4 text-yellow-500" />
      case 'github': return <BookOpen className="w-4 h-4 text-gray-700" />
      case 'datasheet': return <ExternalLink className="w-4 h-4 text-blue-500" />
      default: return <Search className="w-4 h-4 text-gray-500" />
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'specification': return 'bg-blue-100 text-blue-800'
      case 'compatibility': return 'bg-green-100 text-green-800'
      case 'implementation': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // Extract text from document content (JSON format)
  const extractTextFromContent = (content: any): string => {
    // If content is already a string, return it
    if (typeof content === 'string') {
      return content
    }
    
    // If content is JSON (ProseMirror format), extract text
    if (content && typeof content === 'object') {
      let text = ''
      
      const extractFromNode = (node: any) => {
        if (node.type === 'text' && node.text) {
          text += node.text
        } else if (node.content && Array.isArray(node.content)) {
          node.content.forEach(extractFromNode)
        }
      }
      
      if (content.content && Array.isArray(content.content)) {
        content.content.forEach(extractFromNode)
      }
      
      return text
    }
    
    // Fallback: convert to string
    return JSON.stringify(content)
  }

  const getDocumentIcon = (type: DocumentType) => {
    switch (type) {
      case 'requirements': return <FileText className="w-4 h-4 text-blue-600" />
      case 'decision': return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'ai-reference': return <BookOpen className="w-4 h-4 text-purple-600" />
      default: return <FileText className="w-4 h-4 text-gray-600" />
    }
  }

  return (
    <div className="w-full h-full overflow-auto bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="p-4 max-w-7xl mx-auto">
        {/* ヘッダー */}
        <div className="text-center space-y-6 mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg">
            <Monitor className="w-10 h-10" />
          </div>
          
          <div className="space-y-4">
            {/* <h1 className="text-3xl font-bold text-gray-900">
              Auto-generated development log
            </h1> */}
            <h1 className="text-3xl font-bold text-gray-900">
              Requirements Management
            </h1>
            
            <div className="max-w-2xl mx-auto">
              <p className="text-lg text-gray-600 leading-relaxed">
               Please compile as detailed hardware requirements as possible for the device you’d like to create. Once the requirements document is approved, AYA will automatically propose the system for you.
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center mb-8">
          <div className="bg-white rounded-lg p-1 shadow-sm border border-gray-200">
            <button
              onClick={() => setActiveTab('requirements')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'requirements'
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Requirements
            </button>
            {/* 参考資料のリンクを一覧で保管できる機能が完了したらUIを復活させる。 */}
            {/* <button
              onClick={() => setActiveTab('ai-references')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'ai-references'
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              AI References
            </button> */}
            
          </div>
        </div>

        {activeTab === 'ai-references' && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Filter:</span>
                </div>
                
                <select
                  value={filterSource}
                  onChange={(e) => setFilterSource(e.target.value)}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                >
                  <option value="all">All Sources</option>
                  <option value="official">Official Sites</option>
                  <option value="github">GitHub</option>
                  <option value="datasheet">Data Sheets</option>
                  <option value="forum">Forums</option>
                </select>
                
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                >
                  <option value="all">All Categories</option>
                  <option value="specification">Specifications</option>
                  <option value="compatibility">Compatibility</option>
                  <option value="implementation">Implementation</option>
                </select>
                
                <div className="text-sm text-gray-500">
                  {filteredReferences.length} items shown
                </div>
              </div>
            </div>

            {/* AI Reference List */}
            <div className="space-y-4">
              {filteredReferences.map((ref) => (
                <div key={ref.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {getSourceIcon(ref.source)}
                      <h3 className="font-semibold text-gray-900">{ref.title}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${getCategoryColor(ref.category)}`}>
                        {ref.category}
                      </span>
                      <span className="text-xs text-gray-500">Confidence: {ref.confidence}%</span>
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <p className="text-sm text-gray-600 mb-2">
                      <strong>Component:</strong> {ref.component}
                    </p>
                    <a
                      href={ref.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-sm break-all flex items-center gap-1"
                    >
                      {ref.url}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(ref.timestamp).toLocaleString('ja-JP')}</span>
                  </div>
                </div>
              ))}
              
              {filteredReferences.length === 0 && (
                <div className="text-center py-8">
                  <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No matching references found</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Requirements Tab */}
        {activeTab === 'requirements' && (
          <div className="space-y-6">
            {selectedRequirementId ? (
              <div>
                <button
                  onClick={() => setSelectedRequirementId(null)}
                  className="mb-4 text-blue-600 hover:text-blue-800 flex items-center gap-2"
                >
                  ← Back to list
                </button>
                <RequirementsViewer
                  requirementId={selectedRequirementId}
                  mode="view"
                  onApprove={onApprove}
                  onDelete={() => {
                    setSelectedRequirementId(null)
                    fetchDocuments()
                  }}
                />
              </div>
            ) : (
              <div className="grid gap-4">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                  </div>
                ) : !projectId ? (
                  <div className="bg-white rounded-lg shadow-md p-8 text-center">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Loading project...</p>
                  </div>
                ) : documents.length === 0 ? (
                  <div className="bg-white rounded-lg shadow-md p-8 text-center">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No requirements documents yet</p>
                  </div>
                ) : (
                  documents.map((doc) => (
                    <div
                      key={doc.id}
                      onClick={() => setSelectedRequirementId(doc.id)}
                      className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          {getDocumentIcon(doc.type)}
                          <div>
                            <h3 className="font-semibold text-gray-900">{doc.title} v{doc.metadata.version || '1.0'}</h3>
                            <p className="text-sm text-gray-600 mt-1">{extractTextFromContent(doc.content).substring(0, 150)}...</p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                              <span>Updated: {new Date(doc.metadata.updatedAt).toLocaleString('ja-JP', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}</span>
                              {doc.metadata.approvalStatus && (
                                <span className={`px-2 py-1 rounded-full ${
                                  doc.metadata.approvalStatus === 'approved' ? 'bg-green-100 text-green-800' :
                                  doc.metadata.approvalStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {doc.metadata.approvalStatus}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* Decisions Tab */}
        {activeTab === 'decisions' && (
          <div className="space-y-6">
            <div className="grid gap-4">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                </div>
              ) : documents.length === 0 ? (
                <div className="bg-white rounded-lg shadow-md p-8 text-center">
                  <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No decisions recorded yet</p>
                </div>
              ) : (
                documents.map((doc) => (
                  <div key={doc.id} className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex items-start gap-3">
                      {getDocumentIcon(doc.type)}
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{doc.content}</p>
                        {doc.metadata.context && (
                          <p className="text-sm text-gray-600 mt-1">{doc.metadata.context}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span>{new Date(doc.metadata.createdAt).toLocaleString()}</span>
                          {doc.metadata.importance && (
                            <span className={`px-2 py-1 rounded-full ${
                              doc.metadata.importance === 'high' ? 'bg-red-100 text-red-800' :
                              doc.metadata.importance === 'low' ? 'bg-gray-100 text-gray-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {doc.metadata.importance}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}