import React from 'react'
import { ExcelDiff } from '../../../types/enhanced-chat'
import { TableCellsIcon } from '@heroicons/react/24/outline'

interface TableDiffProps {
  diff: ExcelDiff
}

export const TableDiff: React.FC<TableDiffProps> = ({ diff }) => {
  const isNewTable = !diff.before && diff.after
  const isDeletedTable = diff.before && !diff.after
  const isModifiedTable = diff.before && diff.after
  
  if (isNewTable) {
    return <NewTableDiff diff={diff} />
  } else if (isDeletedTable) {
    return <DeletedTableDiff diff={diff} />
  } else if (isModifiedTable) {
    return <ModifiedTableDiff diff={diff} />
  }
  
  return null
}

const NewTableDiff: React.FC<{ diff: ExcelDiff }> = ({ diff }) => {
  const table = diff.after as any
  
  return (
    <div className="space-y-3">
      <div className="flex items-center space-x-2">
        <div className="w-8 h-8 bg-green-900/30 rounded-full flex items-center justify-center">
          <span className="text-green-400">+</span>
        </div>
        <div>
          <div className="text-sm font-medium text-green-300">New Table Created</div>
          <div className="text-xs text-gray-400">{diff.range}</div>
        </div>
      </div>
      
      <div className="bg-green-900/20 border border-green-800/30 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <TableCellsIcon className="w-6 h-6 text-gray-400 mt-0.5" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-200">
                {table?.name || 'Table1'}
              </span>
              <span className="text-xs text-gray-400">
                {table?.rows || 0} rows × {table?.columns?.length || 0} columns
              </span>
            </div>
            
            {table?.columns && table.columns.length > 0 && (
              <div>
                <div className="text-xs text-gray-500 mb-1">Columns:</div>
                <div className="flex flex-wrap gap-1">
                  {table.columns.map((col: any, index: number) => (
                    <span 
                      key={index}
                      className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded"
                    >
                      {col.name || col}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {table?.style && (
              <div className="flex items-center space-x-2 text-xs text-gray-400">
                <span>Style:</span>
                <span className="text-gray-300">{table.style}</span>
              </div>
            )}
            
            <div className="flex flex-wrap gap-2 text-xs text-gray-400">
              {table?.hasHeaders && <span>✓ Headers</span>}
              {table?.hasFilters && <span>✓ Filters</span>}
              {table?.hasTotals && <span>✓ Total Row</span>}
              {table?.hasBandedRows && <span>✓ Banded Rows</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const DeletedTableDiff: React.FC<{ diff: ExcelDiff }> = ({ diff }) => {
  const table = diff.before as any
  
  return (
    <div className="space-y-3">
      <div className="flex items-center space-x-2">
        <div className="w-8 h-8 bg-red-900/30 rounded-full flex items-center justify-center">
          <span className="text-red-400">-</span>
        </div>
        <div>
          <div className="text-sm font-medium text-red-300">Table Deleted</div>
          <div className="text-xs text-gray-400">{diff.range}</div>
        </div>
      </div>
      
      <div className="bg-red-900/20 border border-red-800/30 rounded-lg p-4 opacity-75">
        <div className="flex items-center space-x-2">
          <TableCellsIcon className="w-5 h-5 text-red-400" />
          <span className="text-sm text-red-300 line-through">
            {table?.name || 'Table1'}
          </span>
          <span className="text-xs text-gray-500">
            ({table?.rows || 0} rows × {table?.columns?.length || 0} columns)
          </span>
        </div>
      </div>
    </div>
  )
}

const ModifiedTableDiff: React.FC<{ diff: ExcelDiff }> = ({ diff }) => {
  const before = diff.before as any
  const after = diff.after as any
  const changes = getTableChanges(before, after)
  
  return (
    <div className="space-y-3">
      <div className="flex items-center space-x-2">
        <div className="w-8 h-8 bg-blue-900/30 rounded-full flex items-center justify-center">
          <span className="text-blue-400">↻</span>
        </div>
        <div>
          <div className="text-sm font-medium text-blue-300">Table Modified</div>
          <div className="text-xs text-gray-400">{after?.name || 'Table'} • {diff.range}</div>
        </div>
      </div>
      
      <div className="space-y-2">
        {changes.map((change, index) => (
          <div key={index} className="bg-gray-800/50 rounded p-3">
            <div className="text-xs text-gray-400 mb-1">{change.property}</div>
            
            {change.property === 'Columns' ? (
              <ColumnChanges before={change.before} after={change.after} />
            ) : (
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="text-red-300">
                  <span className="text-xs text-gray-500">Before: </span>
                  {formatTableValue(change.before)}
                </div>
                <div className="text-green-300">
                  <span className="text-xs text-gray-500">After: </span>
                  {formatTableValue(change.after)}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* Show data preview if rows changed significantly */}
      {Math.abs((after?.rows || 0) - (before?.rows || 0)) > 10 && (
        <div className="mt-3 p-3 bg-yellow-900/20 border border-yellow-800/30 rounded text-xs text-yellow-300">
          <span className="font-medium">Note:</span> Table data has changed significantly. 
          {after?.rows > before?.rows ? 
            ` Added ${after.rows - before.rows} rows.` : 
            ` Removed ${before.rows - after.rows} rows.`}
        </div>
      )}
    </div>
  )
}

const ColumnChanges: React.FC<{ before: any, after: any }> = ({ before, after }) => {
  const beforeCols = before || []
  const afterCols = after || []
  
  const added = afterCols.filter((col: any) => !beforeCols.includes(col))
  const removed = beforeCols.filter((col: any) => !afterCols.includes(col))
  
  return (
    <div className="space-y-2 text-xs">
      {removed.length > 0 && (
        <div>
          <span className="text-red-400">Removed: </span>
          {removed.map((col: any, i: number) => (
            <span key={i} className="text-red-300 bg-red-900/30 px-1.5 py-0.5 rounded mx-0.5">
              {col.name || col}
            </span>
          ))}
        </div>
      )}
      {added.length > 0 && (
        <div>
          <span className="text-green-400">Added: </span>
          {added.map((col: any, i: number) => (
            <span key={i} className="text-green-300 bg-green-900/30 px-1.5 py-0.5 rounded mx-0.5">
              {col.name || col}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// Helper functions
const getTableChanges = (before: any, after: any): Array<{ property: string, before: any, after: any }> => {
  const changes = []
  const properties = ['name', 'rows', 'columns', 'style', 'hasHeaders', 'hasFilters', 'hasTotals']
  
  properties.forEach(prop => {
    if (JSON.stringify(before?.[prop]) !== JSON.stringify(after?.[prop])) {
      changes.push({
        property: prop.charAt(0).toUpperCase() + prop.slice(1),
        before: before?.[prop],
        after: after?.[prop]
      })
    }
  })
  
  return changes
}

const formatTableValue = (value: any): string => {
  if (value === null || value === undefined) return 'None'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (Array.isArray(value)) return `${value.length} items`
  return String(value)
}