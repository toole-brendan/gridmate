import React from 'react'
import { ExcelDiff } from '../../../types/enhanced-chat'

interface DataDiffProps {
  diff: ExcelDiff
}

export const DataDiff: React.FC<DataDiffProps> = ({ diff }) => {
  // Check if this is a single cell or range
  const isSingleCell = !diff.range.includes(':')
  const isLargeRange = diff.affectedCells && diff.affectedCells > 20
  
  if (isSingleCell) {
    return <SingleCellDiff diff={diff} />
  } else if (isLargeRange) {
    return <LargeRangeDiff diff={diff} />
  } else {
    return <RangeDiff diff={diff} />
  }
}

const SingleCellDiff: React.FC<{ diff: ExcelDiff }> = ({ diff }) => {
  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return '(empty)'
    if (typeof value === 'number') {
      // Format numbers with appropriate precision
      if (Number.isInteger(value)) return value.toString()
      return value.toFixed(2)
    }
    return String(value)
  }
  
  return (
    <div className="space-y-2">
      <div className="text-xs text-gray-400">Cell {diff.range}</div>
      
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-xs text-gray-400 mb-1">Before</div>
          <div className="bg-red-900/20 border border-red-800/30 rounded-md p-3 text-center">
            <span className="text-lg font-mono text-red-300">
              {formatValue(diff.before)}
            </span>
          </div>
        </div>
        
        <div>
          <div className="text-xs text-gray-400 mb-1">After</div>
          <div className="bg-green-900/20 border border-green-800/30 rounded-md p-3 text-center">
            <span className="text-lg font-mono text-green-300">
              {formatValue(diff.after)}
            </span>
          </div>
        </div>
      </div>
      
      {/* Show percentage change for numbers */}
      {typeof diff.before === 'number' && typeof diff.after === 'number' && diff.before !== 0 && (
        <div className="text-xs text-gray-400 text-center mt-2">
          Change: {((diff.after - diff.before) / diff.before * 100).toFixed(1)}%
        </div>
      )}
    </div>
  )
}

const RangeDiff: React.FC<{ diff: ExcelDiff }> = ({ diff }) => {
  // Parse the range to create a table view
  const parseRange = (range: string): { startCol: string, startRow: number, endCol: string, endRow: number } => {
    const match = range.match(/([A-Z]+)(\d+):([A-Z]+)(\d+)/)
    if (!match) return { startCol: 'A', startRow: 1, endCol: 'A', endRow: 1 }
    return {
      startCol: match[1],
      startRow: parseInt(match[2]),
      endCol: match[3],
      endRow: parseInt(match[4])
    }
  }
  
  const { startCol, startRow, endCol, endRow } = parseRange(diff.range)
  const cols = getColumnRange(startCol, endCol)
  const rows = Array.from({ length: endRow - startRow + 1 }, (_, i) => startRow + i)
  
  // Mock data for visualization - in reality this would come from diff.before/after
  const renderTable = (data: any, type: 'before' | 'after') => {
    const colorClass = type === 'before' ? 'text-red-300' : 'text-green-300'
    const bgClass = type === 'before' ? 'bg-red-900/20' : 'bg-green-900/20'
    
    return (
      <div>
        <div className="text-xs text-gray-400 mb-1 capitalize">{type}</div>
        <div className={`${bgClass} border border-gray-700 rounded-md overflow-hidden`}>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="p-1 text-gray-500"></th>
                {cols.map(col => (
                  <th key={col} className="p-1 text-gray-400 font-medium">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row} className="border-b border-gray-700/50">
                  <td className="p-1 text-gray-500 font-medium">{row}</td>
                  {cols.map(col => (
                    <td key={`${col}${row}`} className={`p-1 text-center ${colorClass} font-mono`}>
                      {getCellValue(data, col, row, type)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }
  
  return (
    <div className="space-y-3">
      <div className="text-xs text-gray-400">Range {diff.range}</div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {renderTable(diff.before, 'before')}
        {renderTable(diff.after, 'after')}
      </div>
    </div>
  )
}

const LargeRangeDiff: React.FC<{ diff: ExcelDiff }> = ({ diff }) => {
  return (
    <div className="space-y-2">
      <div className="text-xs text-gray-400">
        Range {diff.range} • {diff.affectedCells} cells affected
      </div>
      
      <div className="bg-gray-800 border border-gray-700 rounded-md p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-300">Summary of Changes</span>
          <span className="text-xs text-gray-500">Large dataset</span>
        </div>
        
        {diff.summary ? (
          <p className="text-sm text-gray-400">{diff.summary}</p>
        ) : (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Cells modified:</span>
              <span className="text-gray-300 font-mono">{diff.affectedCells}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Operation:</span>
              <span className="text-gray-300">Bulk update</span>
            </div>
          </div>
        )}
        
        <div className="mt-3 pt-3 border-t border-gray-700">
          <p className="text-xs text-gray-500">
            Showing summary only due to large range. Full details available in Excel.
          </p>
        </div>
      </div>
    </div>
  )
}

// Helper functions
const getColumnRange = (startCol: string, endCol: string): string[] => {
  const start = columnToNumber(startCol)
  const end = columnToNumber(endCol)
  const cols = []
  
  for (let i = start; i <= end; i++) {
    cols.push(numberToColumn(i))
  }
  
  return cols
}

const columnToNumber = (col: string): number => {
  let num = 0
  for (let i = 0; i < col.length; i++) {
    num = num * 26 + (col.charCodeAt(i) - 64)
  }
  return num
}

const numberToColumn = (num: number): string => {
  let col = ''
  while (num > 0) {
    const remainder = (num - 1) % 26
    col = String.fromCharCode(65 + remainder) + col
    num = Math.floor((num - 1) / 26)
  }
  return col
}

const getCellValue = (data: any, col: string, row: number, type: string): string => {
  // Mock implementation - in reality would extract from actual data
  if (type === 'before') {
    return Math.floor(Math.random() * 100).toString()
  } else {
    return Math.floor(Math.random() * 100 + 10).toString()
  }
}