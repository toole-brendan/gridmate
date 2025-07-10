import React, { useState, useCallback, useEffect } from 'react'
import { Search, TrendingUp, Calendar, Building } from 'lucide-react'
import { useDebounce } from '../hooks/useDebounce'

interface EarningsSearchProps {
  onSearch: (query: string) => void
  isLoading?: boolean
  suggestions?: string[]
  recentSearches?: string[]
}

export const EarningsSearch: React.FC<EarningsSearchProps> = ({
  onSearch,
  isLoading = false,
  suggestions = [],
  recentSearches = []
}) => {
  const [query, setQuery] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  
  const debouncedQuery = useDebounce(query, 300)
  
  // Example queries for user guidance
  const exampleQueries = [
    { icon: TrendingUp, text: 'AAPL earnings', label: 'Latest Results' },
    { icon: Calendar, text: 'Microsoft Q3 2024', label: 'Specific Quarter' },
    { icon: Building, text: 'Compare GOOGL and META', label: 'Comparison' }
  ]
  
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      onSearch(query.trim())
      setShowSuggestions(false)
    }
  }, [query, onSearch])
  
  const handleSuggestionClick = useCallback((suggestion: string) => {
    setQuery(suggestion)
    onSearch(suggestion)
    setShowSuggestions(false)
  }, [onSearch])
  
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showSuggestions) return
    
    const totalSuggestions = suggestions.length + recentSearches.length
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < totalSuggestions - 1 ? prev + 1 : 0
        )
        break
        
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : totalSuggestions - 1
        )
        break
        
      case 'Enter':
        if (selectedIndex >= 0) {
          e.preventDefault()
          const allSuggestions = [...suggestions, ...recentSearches]
          handleSuggestionClick(allSuggestions[selectedIndex])
        }
        break
        
      case 'Escape':
        setShowSuggestions(false)
        setSelectedIndex(-1)
        break
    }
  }, [showSuggestions, suggestions, recentSearches, selectedIndex, handleSuggestionClick])
  
  useEffect(() => {
    setShowSuggestions(debouncedQuery.length > 0 && (suggestions.length > 0 || recentSearches.length > 0))
  }, [debouncedQuery, suggestions, recentSearches])
  
  return (
    <div className="relative w-full">
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder="Search earnings by company name or ticker..."
            className="w-full px-4 py-3 pl-12 pr-4 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          />
          <Search className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
          
          {isLoading && (
            <div className="absolute right-4 top-3.5">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
            </div>
          )}
        </div>
      </form>
      
      {/* Suggestions Dropdown */}
      {showSuggestions && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto">
          {suggestions.length > 0 && (
            <div className="p-2">
              <div className="text-xs font-medium text-gray-500 px-3 py-1">Suggestions</div>
              {suggestions.map((suggestion, index) => (
                <button
                  key={`suggestion-${index}`}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className={`w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-100 ${
                    selectedIndex === index ? 'bg-gray-100' : ''
                  }`}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
          
          {recentSearches.length > 0 && (
            <div className="p-2 border-t border-gray-100">
              <div className="text-xs font-medium text-gray-500 px-3 py-1">Recent Searches</div>
              {recentSearches.map((search, index) => {
                const actualIndex = suggestions.length + index
                return (
                  <button
                    key={`recent-${index}`}
                    onClick={() => handleSuggestionClick(search)}
                    className={`w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-100 ${
                      selectedIndex === actualIndex ? 'bg-gray-100' : ''
                    }`}
                  >
                    {search}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
      
      {/* Example Queries - Show when input is empty */}
      {!query && !showSuggestions && (
        <div className="mt-4 space-y-2">
          <p className="text-xs text-gray-500 mb-2">Try searching for:</p>
          <div className="flex flex-wrap gap-2">
            {exampleQueries.map((example, index) => {
              const Icon = example.icon
              return (
                <button
                  key={index}
                  onClick={() => {
                    setQuery(example.text)
                    onSearch(example.text)
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-xs text-gray-700 transition-colors"
                >
                  <Icon className="h-3 w-3" />
                  <span>{example.text}</span>
                  <span className="text-gray-400">• {example.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}