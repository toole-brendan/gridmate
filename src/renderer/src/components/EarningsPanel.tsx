import React, { useState, useCallback } from 'react'
import { EarningsSearch } from './EarningsSearch'
import { EarningsResults } from './EarningsResults'
import { AlertCircle } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface EarningsData {
  company: {
    name: string
    ticker: string
    cik: string
    exchange?: string
  }
  filing: {
    accessionNumber: string
    filingDate: string
    formType: string
  }
  period: string
  metrics: any
  highlights?: string[]
}

export const EarningsPanel: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [earnings, setEarnings] = useState<EarningsData[]>([])
  const [error, setError] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    // Load from localStorage
    const saved = localStorage.getItem('recentEarningsSearches')
    return saved ? JSON.parse(saved) : []
  })
  
  const handleSearch = useCallback(async (query: string) => {
    setIsLoading(true)
    setError(null)
    
    try {
      // Add to recent searches
      const updatedRecent = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5)
      setRecentSearches(updatedRecent)
      localStorage.setItem('recentEarningsSearches', JSON.stringify(updatedRecent))
      
      // Search for earnings
      const results = await window.electron.ipcRenderer.invoke('sec:searchEarnings', query)
      
      if (results && results.length > 0) {
        setEarnings(results)
      } else {
        setError('No earnings data found. Try a different search term.')
        setEarnings([])
      }
    } catch (err) {
      console.error('Search error:', err)
      setError('Failed to search earnings. Please try again.')
      toast.error('Failed to search earnings')
    } finally {
      setIsLoading(false)
    }
  }, [recentSearches])
  
  const handleAddToSpreadsheet = useCallback(async (data: EarningsData) => {
    try {
      // Get active cell
      const activeRange = await window.electron.ipcRenderer.invoke('spreadsheet:getActiveRange')
      
      if (!activeRange) {
        toast.error('Please select a cell in the spreadsheet first')
        return
      }
      
      // Format data for spreadsheet
      const startCell = activeRange.address.split(':')[0]
      const row = parseInt(startCell.match(/\d+/)?.[0] || '1')
      const col = startCell.match(/[A-Z]+/)?.[0] || 'A'
      
      // Add headers and data
      const cells = [
        { cell: `${col}${row}`, value: 'Company' },
        { cell: `${col}${row + 1}`, value: data.company.name },
        { cell: nextCol(col) + row, value: 'Ticker' },
        { cell: nextCol(col) + (row + 1), value: data.company.ticker },
        { cell: nextCol(nextCol(col)) + row, value: 'Period' },
        { cell: nextCol(nextCol(col)) + (row + 1), value: data.period },
        { cell: nextCol(nextCol(nextCol(col))) + row, value: 'Revenue' },
        { cell: nextCol(nextCol(nextCol(col))) + (row + 1), value: data.metrics.revenue || 'N/A' },
        { cell: nextCol(nextCol(nextCol(nextCol(col)))) + row, value: 'EPS' },
        { cell: nextCol(nextCol(nextCol(nextCol(col)))) + (row + 1), value: data.metrics.eps || 'N/A' }
      ]
      
      // Add data to spreadsheet
      for (const { cell, value } of cells) {
        await window.electron.ipcRenderer.invoke('spreadsheet:setCellValue', cell, value)
      }
      
      toast.success('Added earnings data to spreadsheet')
    } catch (err) {
      console.error('Failed to add to spreadsheet:', err)
      toast.error('Failed to add data to spreadsheet')
    }
  }, [])
  
  const handleViewFiling = useCallback(async (data: EarningsData) => {
    try {
      // Get filing documents
      const documents = await window.electron.ipcRenderer.invoke(
        'sec:getFilingDocuments',
        data.company.cik,
        data.filing.accessionNumber
      )
      
      // Open primary document in browser
      const primaryDoc = documents.find((d: any) => d.sequence === '1')
      if (primaryDoc?.url) {
        window.open(primaryDoc.url, '_blank')
      }
    } catch (err) {
      console.error('Failed to view filing:', err)
      toast.error('Failed to open filing')
    }
  }, [])
  
  // Helper function to get next column
  const nextCol = (col: string): string => {
    const code = col.charCodeAt(0)
    return String.fromCharCode(code + 1)
  }
  
  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          SEC Earnings Search
        </h2>
        <EarningsSearch
          onSearch={handleSearch}
          isLoading={isLoading}
          suggestions={suggestions}
          recentSearches={recentSearches}
        />
      </div>
      
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-sm text-gray-600">Searching earnings data...</p>
            </div>
          </div>
        )}
        
        {error && !isLoading && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-red-800">{error}</p>
              <p className="text-xs text-red-600 mt-1">
                Try searching with a ticker symbol (e.g., AAPL) or company name.
              </p>
            </div>
          </div>
        )}
        
        {earnings.length > 0 && !isLoading && (
          <div className="space-y-4">
            {earnings.map((data, index) => (
              <EarningsResults
                key={index}
                data={data}
                onAddToSpreadsheet={handleAddToSpreadsheet}
                onViewFiling={handleViewFiling}
              />
            ))}
          </div>
        )}
        
        {!isLoading && !error && earnings.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-sm text-gray-600">
              Search for company earnings to get started
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Try "Apple earnings" or "MSFT Q3 2024"
            </p>
          </div>
        )}
      </div>
    </div>
  )
}