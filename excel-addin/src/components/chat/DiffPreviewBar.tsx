import React, { useState } from 'react'
import { useIsPreviewing, useDiffHunks, useDiffStore } from '../../store/diffStore'
import { DiffKind } from '../../types/diff'
import { EyeIcon, CheckIcon, XMarkIcon, ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline'
// Safe import with fallback
let log: (source: string, message: string, data?: any) => void
try {
  const logStore = require('../../store/logStore')
  log = logStore.log
} catch (error) {
  console.error('Failed to import logStore:', error)
  // Fallback to console.log
  log = (source: string, message: string, data?: any) => {
    console.log(`[${source}] ${message}`, data)
  }
}

interface DiffPreviewBarProps {
  onApply: () => void
  onCancel: () => void
  isLoading?: boolean
}

const DIFF_ICONS: Record<DiffKind, string> = {
  [DiffKind.Added]: '➕',
  [DiffKind.Deleted]: '✖',
  [DiffKind.ValueChanged]: '✏️',
  [DiffKind.FormulaChanged]: 'ƒ',
  [DiffKind.StyleChanged]: '🎨'
}

const DIFF_LABELS: Record<DiffKind, string> = {
  [DiffKind.Added]: 'additions',
  [DiffKind.Deleted]: 'deletions',
  [DiffKind.ValueChanged]: 'changes',
  [DiffKind.FormulaChanged]: 'formulas',
  [DiffKind.StyleChanged]: 'formats'
}

export const DiffPreviewBar: React.FC<DiffPreviewBarProps> = ({ 
  onApply, 
  onCancel,
  isLoading = false 
}) => {
  const isPreviewing = useIsPreviewing()
  const hunks = useDiffHunks()
  const error = useDiffStore(state => state.error)
  const [isExpanded, setIsExpanded] = useState(false)
  
  log('visual-diff', `[🎨 Diff Apply] DiffPreviewBar rendered.`, { isPreviewing, hunksCount: hunks?.length || 0, isLoading });
  
  if (!isPreviewing || !hunks) {
    // Add a log to confirm why it's not showing
    if (isPreviewing && !hunks) {
      log('visual-diff', `[🎨 Diff Apply] DiffPreviewBar is hidden because there are no diffs to show.`);
    }
    return null
  }
  
  // Count changes by type
  const changeSummary = hunks.reduce((acc, hunk) => {
    acc[hunk.kind] = (acc[hunk.kind] || 0) + 1
    return acc
  }, {} as Record<DiffKind, number>)
  
  const totalChanges = hunks.length
  
  // Group affected ranges
  const affectedRanges = new Set<string>()
  hunks.forEach(hunk => {
    const rangeKey = `${hunk.key.sheet}!${String.fromCharCode(65 + hunk.key.col)}${hunk.key.row + 1}`
    affectedRanges.add(rangeKey)
  })
  
  // Estimate execution time (rough estimate: 50ms per operation)
  const estimatedTime = Math.max(100, totalChanges * 50)
  const estimatedTimeStr = estimatedTime < 1000 ? `${estimatedTime}ms` : `${(estimatedTime / 1000).toFixed(1)}s`

  log('visual-diff', `[🎨 Diff Apply] Diff summary:`, { changeSummary, affectedRanges: Array.from(affectedRanges), estimatedTime });
  
  return (
    <div className={`fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50 
                    bg-white border border-gray-300 rounded-lg shadow-lg 
                    ${isExpanded ? 'max-w-2xl' : 'max-w-lg'} transition-all duration-200`}>
      <div className="px-4 py-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 flex-1">
            <EyeIcon className="h-5 w-5 text-blue-500" />
            <div className="flex-1">
              <div className="font-medium text-sm flex items-center gap-2">
                Preview Mode
                {isLoading && (
                  <span className="inline-flex items-center gap-1 text-xs text-blue-600">
                    <span className="animate-spin inline-block w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full" />
                    Processing...
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-600 flex gap-2 items-center">
                {Object.entries(changeSummary).map(([kind, count]) => (
                  <span key={kind} className="flex items-center gap-1">
                    <span className="text-base">{DIFF_ICONS[kind as DiffKind]}</span>
                    <span>{count} {DIFF_LABELS[kind as DiffKind]}</span>
                  </span>
                ))}
                <span className="text-gray-400">|</span>
                <span className="text-gray-500">~{estimatedTimeStr}</span>
              </div>
            </div>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              title={isExpanded ? "Collapse details" : "Expand details"}
            >
              {isExpanded ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronUpIcon className="h-4 w-4" />}
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={onApply}
              disabled={isLoading || !!error}
              className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white 
                         rounded-md hover:bg-green-700 disabled:bg-gray-400 
                         disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              <CheckIcon className="h-4 w-4" />
              Apply
            </button>
            
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white 
                         rounded-md hover:bg-red-700 disabled:bg-gray-400 
                         disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              <XMarkIcon className="h-4 w-4" />
              Cancel
            </button>
          </div>
        </div>
        
        {error && (
          <div className="mt-2 bg-red-50 border border-red-200 
                          rounded-md px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>
      
      {isExpanded && (
        <div className="border-t border-gray-200 px-4 py-3 text-xs">
          <div className="space-y-2">
            <div>
              <span className="font-medium text-gray-700">Affected ranges:</span>
              <VirtualizedRangeList ranges={Array.from(affectedRanges)} />
            </div>
            
            <div className="grid grid-cols-5 gap-2 pt-2">
              {Object.entries(changeSummary).map(([kind, count]) => (
                <div key={kind} className="flex items-center gap-1 text-gray-600">
                  <span className={`inline-block w-3 h-3 rounded ${getKindColor(kind as DiffKind)}`} />
                  <span className="capitalize text-xs">{kind.replace(/([A-Z])/g, ' $1').trim()}</span>
                </div>
              ))}
            </div>
            
            <div className="text-gray-500 italic">
              Tip: Review highlighted cells before applying changes
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Virtual scrolling component for large range lists
const VirtualizedRangeList: React.FC<{ ranges: string[] }> = ({ ranges }) => {
  const [visibleStart, setVisibleStart] = useState(0)
  const itemHeight = 24 // Height of each range item in pixels
  const containerHeight = 72 // Max height for 3 rows
  const itemsPerPage = Math.floor(containerHeight / itemHeight)
  
  if (ranges.length <= 10) {
    // For small lists, just render normally
    return (
      <div className="mt-1 flex flex-wrap gap-1">
        {ranges.map(range => (
          <span key={range} className="px-2 py-0.5 bg-gray-100 rounded text-gray-600">
            {range}
          </span>
        ))}
      </div>
    )
  }
  
  // For large lists, implement virtual scrolling
  const visibleItems = ranges.slice(visibleStart, visibleStart + itemsPerPage)
  const totalHeight = ranges.length * itemHeight
  
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop
    const newStart = Math.floor(scrollTop / itemHeight)
    setVisibleStart(newStart)
  }
  
  return (
    <div className="mt-1">
      <div 
        className="overflow-y-auto"
        style={{ height: `${containerHeight}px` }}
        onScroll={handleScroll}
      >
        <div style={{ height: `${totalHeight}px`, position: 'relative' }}>
          <div 
            style={{ 
              transform: `translateY(${visibleStart * itemHeight}px)`,
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0
            }}
          >
            {visibleItems.map((range, idx) => (
              <div 
                key={`${range}-${visibleStart + idx}`}
                className="px-2 py-0.5 bg-gray-100 rounded text-gray-600 inline-block mr-1 mb-1"
                style={{ height: `${itemHeight}px`, lineHeight: `${itemHeight - 4}px` }}
              >
                {range}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="text-gray-500 text-xs mt-1">
        Showing {visibleStart + 1}-{Math.min(visibleStart + itemsPerPage, ranges.length)} of {ranges.length} ranges
      </div>
    </div>
  )
}

function getKindColor(kind: DiffKind): string {
  switch (kind) {
    case DiffKind.Added:
      return 'bg-green-500'
    case DiffKind.Deleted:
      return 'bg-red-500'
    case DiffKind.ValueChanged:
      return 'bg-yellow-500'
    case DiffKind.FormulaChanged:
      return 'bg-blue-500'
    case DiffKind.StyleChanged:
      return 'bg-purple-500'
    default:
      return 'bg-gray-500'
  }
}