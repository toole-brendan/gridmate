import React from 'react'
import { ExcelDiff } from '../../../types/enhanced-chat'
import { FormulaDiff } from './FormulaDiff'
import { DataDiff } from './DataDiff'
import { FormatDiff } from './FormatDiff'
import { ChartDiff } from './ChartDiff'
import { TableDiff } from './TableDiff'

interface ExcelDiffRendererProps {
  diff: ExcelDiff
  expanded?: boolean
  onToggleExpand?: () => void
}

export const ExcelDiffRenderer: React.FC<ExcelDiffRendererProps> = ({ 
  diff, 
  expanded = true,
  onToggleExpand 
}) => {
  const renderDiffContent = () => {
    switch (diff.type) {
      case 'formula':
        return <FormulaDiff diff={diff} />
      case 'value':
        return <DataDiff diff={diff} />
      case 'format':
        return <FormatDiff diff={diff} />
      case 'chart':
        return <ChartDiff diff={diff} />
      case 'table':
        return <TableDiff diff={diff} />
      default:
        return <DefaultDiff diff={diff} />
    }
  }

  return (
    <div className="excel-diff-renderer rounded-lg border border-gray-700 bg-gray-800/50 overflow-hidden">
      <div 
        className="px-3 py-2 bg-gray-700/50 flex items-center justify-between cursor-pointer hover:bg-gray-700/70 transition-colors"
        onClick={onToggleExpand}
      >
        <div className="flex items-center space-x-2">
          <span className="text-xs font-medium text-gray-300">
            {getDiffTypeLabel(diff.type)} Change
          </span>
          <span className="text-xs text-gray-400">
            {diff.range}
          </span>
          {diff.affectedCells && (
            <span className="text-xs text-gray-500">
              ({diff.affectedCells} cells)
            </span>
          )}
        </div>
        {onToggleExpand && (
          <svg 
            className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </div>
      
      {expanded && (
        <div className="p-3">
          {diff.summary && (
            <p className="text-sm text-gray-300 mb-3">{diff.summary}</p>
          )}
          {renderDiffContent()}
        </div>
      )}
    </div>
  )
}

const DefaultDiff: React.FC<{ diff: ExcelDiff }> = ({ diff }) => {
  return (
    <div className="space-y-2">
      {diff.before !== undefined && (
        <div className="flex items-start space-x-2">
          <span className="text-red-400 font-mono text-xs">-</span>
          <div className="flex-1 font-mono text-xs text-red-300 bg-red-900/20 px-2 py-1 rounded">
            {JSON.stringify(diff.before, null, 2)}
          </div>
        </div>
      )}
      {diff.after !== undefined && (
        <div className="flex items-start space-x-2">
          <span className="text-green-400 font-mono text-xs">+</span>
          <div className="flex-1 font-mono text-xs text-green-300 bg-green-900/20 px-2 py-1 rounded">
            {JSON.stringify(diff.after, null, 2)}
          </div>
        </div>
      )}
    </div>
  )
}

const getDiffTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    formula: 'Formula',
    value: 'Value',
    format: 'Format',
    chart: 'Chart',
    table: 'Table'
  }
  return labels[type] || 'Unknown'
}