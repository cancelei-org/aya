'use client'

import React, { useState } from 'react'
import { 
  ExternalLink, 
  BookOpen, 
  FileText, 
  Clock,
  CheckCircle,
  Globe,
  Users,
  Bookmark,
  Share2,
  RefreshCw,
  Info
} from 'lucide-react'
import type { 
  AISearchResult, 
  ComponentSpecification, 
  SpecificationSource 
} from '@/utils/ai/core/aiSpecificationService'
import { ReliabilityScoreDisplay } from './ReliabilityScoreDisplay'
import { MarketDataDisplay } from './MarketDataDisplay'

export interface AISearchResultsManagerProps {
  searchResult: AISearchResult
  onSpecificationSelect?: (spec: ComponentSpecification) => void
  onSourceBookmark?: (source: SpecificationSource) => void
  onShareResult?: (result: AISearchResult) => void
  showDevlogIntegration?: boolean
  autoSaveToDevlog?: boolean
}

export const AISearchResultsManager: React.FC<AISearchResultsManagerProps> = ({
  searchResult,
  onSpecificationSelect,
  onSourceBookmark,
  onShareResult,
  showDevlogIntegration = true,
  autoSaveToDevlog = false
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'sources' | 'market' | 'alternatives'>('overview')
  const [bookmarkedSources, setBookmarkedSources] = useState<Set<string>>(new Set())
  const [savedToDevlog, setSavedToDevlog] = useState(autoSaveToDevlog)
  const [showSourceDetails, setShowSourceDetails] = useState<string | null>(null)

  const handleSourceBookmark = (source: SpecificationSource) => {
    const sourceId = `${source.type}-${source.url}`
    const newBookmarks = new Set(bookmarkedSources)
    
    if (newBookmarks.has(sourceId)) {
      newBookmarks.delete(sourceId)
    } else {
      newBookmarks.add(sourceId)
    }
    
    setBookmarkedSources(newBookmarks)
    onSourceBookmark?.(source)
  }

  const handleSaveToDevlog = async () => {
    try {
      // Auto Devlogページとの連携
      const devlogEntry = {
        title: `AI Specification Search: ${searchResult.specification.name}`,
        type: 'component_research',
        timestamp: new Date().toISOString(),
        content: {
          componentName: searchResult.specification.name,
          searchMetadata: searchResult.searchMetadata,
          reliability: searchResult.specification.reliability,
          sources: searchResult.specification.reliability.sources,
          marketData: searchResult.specification.marketData
        },
        tags: ['ai-search', 'component-spec', searchResult.specification.category.toLowerCase()]
      }

      // TODO: Implement actual devlog integration
      console.log('Saving to devlog:', devlogEntry)
      setSavedToDevlog(true)
      
    } catch (error) {
      console.error('Failed to save to devlog:', error)
    }
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

  const getReliabilityColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100'
    if (score >= 60) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  const formatLastAccessed = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Search Results: {searchResult.specification.name}
            </h3>
            <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {searchResult.searchMetadata.responseTime}ms
              </span>
              <span>
                Confidence: {searchResult.searchMetadata.confidenceScore}%
              </span>
              <span>
                {searchResult.specification.reliability.sources.length} sources
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => onSpecificationSelect?.(searchResult.specification)}
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            >
              Use Specification
            </button>
            
            {showDevlogIntegration && (
              <button
                onClick={handleSaveToDevlog}
                disabled={savedToDevlog}
                className={`px-3 py-1 text-sm rounded flex items-center gap-1 ${
                  savedToDevlog 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <BookOpen className="h-3 w-3" />
                {savedToDevlog ? 'Saved' : 'Save to Devlog'}
              </button>
            )}
            
            <button
              onClick={() => onShareResult?.(searchResult)}
              className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200 flex items-center gap-1"
            >
              <Share2 className="h-3 w-3" />
              Share
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex">
          {[
            { key: 'overview', label: 'Overview', icon: <Info className="h-4 w-4" /> },
            { key: 'sources', label: 'Sources', icon: <FileText className="h-4 w-4" /> },
            { key: 'market', label: 'Market Data', icon: <Globe className="h-4 w-4" /> },
            { key: 'alternatives', label: 'Alternatives', icon: <RefreshCw className="h-4 w-4" /> }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as 'overview' | 'sources' | 'market' | 'alternatives')}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.key === 'sources' && (
                <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded-full text-xs">
                  {searchResult.specification.reliability.sources.length}
                </span>
              )}
              {tab.key === 'alternatives' && searchResult.alternatives.length > 0 && (
                <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded-full text-xs">
                  {searchResult.alternatives.length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-4">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Reliability Score */}
            <ReliabilityScoreDisplay
              metrics={{
                overallScore: searchResult.specification.reliability.confidence,
                sourceBreakdown: {},
                qualityIndicators: {
                  hasOfficialSource: searchResult.specification.reliability.sources.some(s => s.type === 'official'),
                  hasDatasheet: searchResult.specification.reliability.sources.some(s => s.type === 'datasheet'),
                  sourceConsistency: 85,
                  informationCompleteness: 90,
                  lastVerificationAge: 1
                },
                riskFactors: [],
                recommendations: []
              }}
              sources={searchResult.specification.reliability.sources}
              componentName={searchResult.specification.name}
              showDetailedBreakdown={false}
            />

            {/* Basic Specification */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded">
                <h4 className="font-medium text-gray-900 mb-3">Power & Voltage</h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-600">Operating Voltage:</span>
                    <span className="ml-2 font-medium">{searchResult.specification.voltage.operating.join(', ')}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Logic Level:</span>
                    <span className="ml-2 font-medium">{searchResult.specification.voltage.logic}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Typical Consumption:</span>
                    <span className="ml-2 font-medium">{searchResult.specification.power.consumption.typical}mA</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Max Consumption:</span>
                    <span className="ml-2 font-medium">{searchResult.specification.power.consumption.maximum}mA</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded">
                <h4 className="font-medium text-gray-900 mb-3">Communication & Physical</h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-600">Protocols:</span>
                    <span className="ml-2 font-medium">{searchResult.specification.communication.protocols.join(', ')}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Pin Count:</span>
                    <span className="ml-2 font-medium">{searchResult.specification.physical.pins}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Package:</span>
                    <span className="ml-2 font-medium">{searchResult.specification.physical.package}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Category:</span>
                    <span className="ml-2 font-medium">{searchResult.specification.category}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sources Tab */}
        {activeTab === 'sources' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900">
                Information Sources ({searchResult.specification.reliability.sources.length})
              </h4>
              <div className="text-sm text-gray-600">
                {bookmarkedSources.size} bookmarked
              </div>
            </div>

            <div className="space-y-3">
              {searchResult.specification.reliability.sources.map((source, index) => {
                const sourceId = `${source.type}-${source.url}`
                const isBookmarked = bookmarkedSources.has(sourceId)
                
                return (
                  <div key={index} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        {getSourceIcon(source.type)}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 truncate">{source.title}</span>
                            <span className={`text-xs px-2 py-1 rounded ${getReliabilityColor(source.reliability)}`}>
                              {source.reliability}%
                            </span>
                          </div>
                          <div className="text-sm text-gray-600 truncate mt-1">{source.url}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            Last accessed: {formatLastAccessed(source.lastAccessed)}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-2">
                        <button
                          onClick={() => handleSourceBookmark(source)}
                          className={`p-1 rounded transition-colors ${
                            isBookmarked 
                              ? 'text-yellow-600 bg-yellow-100' 
                              : 'text-gray-400 hover:text-gray-600'
                          }`}
                        >
                          <Bookmark className="h-4 w-4" />
                        </button>
                        
                        <button
                          onClick={() => setShowSourceDetails(showSourceDetails === sourceId ? null : sourceId)}
                          className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <Info className="h-4 w-4" />
                        </button>
                        
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
                    </div>

                    {/* Source Details */}
                    {showSourceDetails === sourceId && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Source Type:</span>
                            <span className="ml-2 font-medium capitalize">{source.type}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Reliability Score:</span>
                            <span className="ml-2 font-medium">{source.reliability}%</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Market Data Tab */}
        {activeTab === 'market' && (
          <div>
            {searchResult.specification.marketData ? (
              <MarketDataDisplay
                componentName={searchResult.specification.name}
                pricingData={searchResult.specification.marketData.pricing}
                libraryData={searchResult.specification.marketData.libraries}
                lastUpdated={searchResult.specification.marketData.lastUpdated}
                showPricingDetails={true}
                showLibraryDetails={true}
              />
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Globe className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <div className="text-lg font-medium mb-2">No Market Data Available</div>
                <div className="text-sm">Market pricing and library information could not be retrieved.</div>
              </div>
            )}
          </div>
        )}

        {/* Alternatives Tab */}
        {activeTab === 'alternatives' && (
          <div className="space-y-4">
            {searchResult.alternatives.length > 0 ? (
              <>
                <h4 className="font-medium text-gray-900">
                  Alternative Components ({searchResult.alternatives.length})
                </h4>
                <div className="space-y-3">
                  {searchResult.alternatives.map((alt, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h5 className="font-medium text-gray-900">{alt.name}</h5>
                            <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                              {alt.category}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600">Voltage:</span>
                              <span className="ml-2">{alt.voltage.operating.join(', ')}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Power:</span>
                              <span className="ml-2">{alt.power.consumption.typical}mA</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Protocols:</span>
                              <span className="ml-2">{alt.communication.protocols.join(', ')}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Pins:</span>
                              <span className="ml-2">{alt.physical.pins}</span>
                            </div>
                          </div>
                        </div>
                        
                        <button
                          onClick={() => onSpecificationSelect?.(alt)}
                          className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
                        >
                          Select Alternative
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <RefreshCw className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <div className="text-lg font-medium mb-2">No Alternatives Found</div>
                <div className="text-sm">No alternative components were identified in this search.</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default AISearchResultsManager