'use client'

import React, { useState } from 'react'
import { 
  Search, 
  Brain, 
  Settings, 
  Loader2, 
  AlertCircle, 
  CheckCircle, 
  Filter,
  Clock,
  Zap,
  Database,
  Globe
} from 'lucide-react'
import type { 
  AISearchResult, 
  ComponentSpecification 
} from '@/utils/ai/core/aiSpecificationService'
import { ReliabilityScoreDisplay } from './ReliabilityScoreDisplay'
import { MarketDataDisplay } from './MarketDataDisplay'

export interface ManualAISearchProps {
  onSearchComplete?: (result: AISearchResult) => void
  onSpecificationSelect?: (spec: ComponentSpecification) => void
  initialComponentName?: string
  showAdvancedOptions?: boolean
}

export const ManualAISearch: React.FC<ManualAISearchProps> = ({
  onSearchComplete,
  onSpecificationSelect,
  initialComponentName = '',
  showAdvancedOptions = false
}) => {
  const [componentName, setComponentName] = useState(initialComponentName)
  const [searchDepth, setSearchDepth] = useState<'basic' | 'detailed' | 'comprehensive'>('detailed')
  const [includeAlternatives, setIncludeAlternatives] = useState(true)
  const [focusAreas, setFocusAreas] = useState<string[]>(['power', 'communication', 'compatibility'])
  const [isSearching, setIsSearching] = useState(false)
  const [searchResult, setSearchResult] = useState<AISearchResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(showAdvancedOptions)
  const [searchHistory, setSearchHistory] = useState<string[]>([])

  const availableFocusAreas = [
    { id: 'power', label: 'Power & Voltage', icon: <Zap className="h-4 w-4" /> },
    { id: 'communication', label: 'Communication', icon: <Globe className="h-4 w-4" /> },
    { id: 'compatibility', label: 'Compatibility', icon: <CheckCircle className="h-4 w-4" /> },
    { id: 'pinout', label: 'Pinout & Physical', icon: <Database className="h-4 w-4" /> }
  ]

  const handleSearch = async () => {
    if (!componentName.trim()) {
      setError('Please enter a component name')
      return
    }

    setIsSearching(true)
    setError(null)

    try {
      // Dynamic import for client-side usage
      const { searchComponent } = await import('@/utils/ai/core/aiSpecificationService')
      
      // const searchRequest: AISearchRequest = {
      //   componentName: componentName.trim(),
      //   searchDepth,
      //   includeAlternatives,
      //   focusAreas: focusAreas as ('power' | 'communication' | 'compatibility' | 'pinout')[]
      // }

      const result = await searchComponent(componentName.trim())
      
      setSearchResult(result)
      onSearchComplete?.(result)
      
      // Add to search history
      const newHistory = [componentName, ...searchHistory.filter(h => h !== componentName)].slice(0, 5)
      setSearchHistory(newHistory)
      
    } catch (err) {
      console.error('AI search failed:', err)
      setError(err instanceof Error ? err.message : 'Search failed. Please try again.')
    } finally {
      setIsSearching(false)
    }
  }

  const handleFocusAreaToggle = (area: string) => {
    if (focusAreas.includes(area)) {
      setFocusAreas(focusAreas.filter(a => a !== area))
    } else {
      setFocusAreas([...focusAreas, area])
    }
  }

  const handleHistoryClick = (historyItem: string) => {
    setComponentName(historyItem)
  }

  const handleSpecificationSelect = (spec: ComponentSpecification) => {
    onSpecificationSelect?.(spec)
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Search Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <Brain className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">AI Component Search</h3>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="ml-auto text-gray-400 hover:text-gray-600 transition-colors"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>

        {/* Search Input */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={componentName}
              onChange={(e) => setComponentName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Enter component name (e.g., Arduino Uno, ESP32, DHT22)"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isSearching}
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={isSearching || !componentName.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSearching ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                Search
              </>
            )}
          </button>
        </div>

        {/* Search History */}
        {searchHistory.length > 0 && (
          <div className="mt-3">
            <div className="text-xs text-gray-500 mb-1">Recent searches:</div>
            <div className="flex flex-wrap gap-1">
              {searchHistory.map((item, index) => (
                <button
                  key={index}
                  onClick={() => handleHistoryClick(item)}
                  className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Advanced Options */}
      {showAdvanced && (
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="space-y-4">
            {/* Search Depth */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Depth
              </label>
              <div className="flex gap-2">
                {(['basic', 'detailed', 'comprehensive'] as const).map((depth) => (
                  <button
                    key={depth}
                    onClick={() => setSearchDepth(depth)}
                    className={`px-3 py-1 text-sm rounded ${
                      searchDepth === depth
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {depth.charAt(0).toUpperCase() + depth.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Focus Areas */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Filter className="inline h-4 w-4 mr-1" />
                Focus Areas
              </label>
              <div className="flex flex-wrap gap-2">
                {availableFocusAreas.map((area) => (
                  <button
                    key={area.id}
                    onClick={() => handleFocusAreaToggle(area.id)}
                    className={`flex items-center gap-1 px-3 py-1 text-sm rounded ${
                      focusAreas.includes(area.id)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {area.icon}
                    {area.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Include Alternatives */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="includeAlternatives"
                checked={includeAlternatives}
                onChange={(e) => setIncludeAlternatives(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="includeAlternatives" className="text-sm text-gray-700">
                Include alternative components
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}

      {/* Search Results */}
      {searchResult && (
        <div className="p-4 space-y-4">
          {/* Search Metadata */}
          <div className="flex items-center justify-between text-xs text-gray-500 pb-2 border-b border-gray-100">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {searchResult.searchMetadata.responseTime}ms
              </span>
              <span>
                {searchResult.searchMetadata.tokensUsed} tokens
              </span>
              <span>
                Confidence: {searchResult.searchMetadata.confidenceScore}%
              </span>
            </div>
            {searchResult.searchMetadata.externalDataSources && (
              <div className="flex items-center gap-2">
                {searchResult.searchMetadata.externalDataSources.pricing && (
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded">Price</span>
                )}
                {searchResult.searchMetadata.externalDataSources.libraries && (
                  <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded">Libraries</span>
                )}
              </div>
            )}
          </div>

          {/* Main Specification */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-gray-900">Primary Result</h4>
              <button
                onClick={() => handleSpecificationSelect(searchResult.specification)}
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
              >
                Use This Spec
              </button>
            </div>

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
            />

            {/* Market Data */}
            {searchResult.specification.marketData && (
              <MarketDataDisplay
                componentName={searchResult.specification.name}
                pricingData={searchResult.specification.marketData.pricing}
                libraryData={searchResult.specification.marketData.libraries}
                lastUpdated={searchResult.specification.marketData.lastUpdated}
              />
            )}

            {/* Basic Specification Display */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded">
              <div>
                <h5 className="font-medium text-gray-900 mb-2">Power & Voltage</h5>
                <div className="text-sm space-y-1">
                  <div>Operating: {searchResult.specification.voltage.operating.join(', ')}</div>
                  <div>Logic: {searchResult.specification.voltage.logic}</div>
                  <div>Consumption: {searchResult.specification.power.consumption.typical}mA</div>
                </div>
              </div>
              <div>
                <h5 className="font-medium text-gray-900 mb-2">Communication</h5>
                <div className="text-sm space-y-1">
                  <div>Protocols: {searchResult.specification.communication.protocols.join(', ')}</div>
                  <div>Pins: {searchResult.specification.physical.pins}</div>
                  <div>Package: {searchResult.specification.physical.package}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Alternatives */}
          {searchResult.alternatives.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold text-gray-900">Alternative Components</h4>
              <div className="space-y-2">
                {searchResult.alternatives.map((alt, index) => (
                  <div key={index} className="p-3 border border-gray-200 rounded flex items-center justify-between">
                    <div>
                      <div className="font-medium">{alt.name}</div>
                      <div className="text-sm text-gray-600">
                        {alt.voltage.operating.join(', ')} • {alt.power.consumption.typical}mA
                      </div>
                    </div>
                    <button
                      onClick={() => handleSpecificationSelect(alt)}
                      className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
                    >
                      Select
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ManualAISearch