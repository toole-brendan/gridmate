import React from 'react'
import { useIsPreviewing, useDiffHunks, useDiffStore } from '../../store/diffStore'
import { DiffKind } from '../../types/diff'
import { EyeIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline'

interface DiffPreviewBarProps {
  onApply: () => void
  onCancel: () => void
  isLoading?: boolean
}

export const DiffPreviewBar: React.FC<DiffPreviewBarProps> = ({ 
  onApply, 
  onCancel,
  isLoading = false 
}) => {
  const isPreviewing = useIsPreviewing()
  const hunks = useDiffHunks()
  const error = useDiffStore(state => state.error)
  
  if (!isPreviewing || !hunks) {
    return null
  }
  
  // Count changes by type
  const changeSummary = hunks.reduce((acc, hunk) => {
    acc[hunk.kind] = (acc[hunk.kind] || 0) + 1
    return acc
  }, {} as Record<DiffKind, number>)
  
  const totalChanges = hunks.length
  
  return (
    <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50 
                    bg-white border border-gray-300 rounded-lg shadow-lg 
                    px-4 py-3 flex items-center gap-4 max-w-lg">
      <div className="flex items-center gap-2">
        <EyeIcon className="h-5 w-5 text-blue-500" />
        <div>
          <div className="font-medium text-sm">
            Preview Mode - {totalChanges} change{totalChanges !== 1 ? 's' : ''}
          </div>
          <div className="text-xs text-gray-500 flex gap-3">
            {Object.entries(changeSummary).map(([kind, count]) => (
              <span key={kind} className="flex items-center gap-1">
                <span className={`inline-block w-2 h-2 rounded-full ${getKindColor(kind as DiffKind)}`} />
                {count} {kind.replace(/([A-Z])/g, ' $1').trim().toLowerCase()}
              </span>
            ))}
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-2 ml-auto">
        <button
          onClick={onApply}
          disabled={isLoading || !!error}
          className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white 
                     rounded-md hover:bg-green-700 disabled:bg-gray-400 
                     disabled:cursor-not-allowed transition-colors text-sm font-medium"
        >
          <CheckIcon className="h-4 w-4" />
          Apply Changes
        </button>
        
        <button
          onClick={onCancel}
          disabled={isLoading}
          className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white 
                     rounded-md hover:bg-red-700 disabled:bg-gray-400 
                     disabled:cursor-not-allowed transition-colors text-sm font-medium"
        >
          <XMarkIcon className="h-4 w-4" />
          Reject
        </button>
      </div>
      
      {error && (
        <div className="absolute -top-12 left-0 right-0 bg-red-50 border border-red-200 
                        rounded-md px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
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