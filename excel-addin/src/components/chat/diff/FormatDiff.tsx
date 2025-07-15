import React from 'react'
import { ExcelDiff } from '../../../types/enhanced-chat'

interface FormatDiffProps {
  diff: ExcelDiff
}

interface FormatChange {
  property: string
  before: any
  after: any
}

export const FormatDiff: React.FC<FormatDiffProps> = ({ diff }) => {
  // Parse format changes from diff
  const formatChanges: FormatChange[] = parseFormatChanges(diff)
  
  return (
    <div className="space-y-3">
      <div className="text-xs text-gray-400">
        Format changes for {diff.range}
        {diff.affectedCells && diff.affectedCells > 1 && ` (${diff.affectedCells} cells)`}
      </div>
      
      <div className="space-y-2">
        {formatChanges.map((change, index) => (
          <FormatChangeItem key={index} change={change} />
        ))}
      </div>
      
      {/* Visual preview if applicable */}
      {hasVisualChanges(formatChanges) && (
        <div className="mt-4 p-3 bg-gray-800 border border-gray-700 rounded-md">
          <div className="text-xs text-gray-400 mb-2">Preview</div>
          <div className="grid grid-cols-2 gap-3">
            <CellPreview format={diff.before} label="Before" />
            <CellPreview format={diff.after} label="After" />
          </div>
        </div>
      )}
    </div>
  )
}

const FormatChangeItem: React.FC<{ change: FormatChange }> = ({ change }) => {
  const getFormatIcon = (property: string) => {
    const icons: Record<string, string> = {
      font: '🔤',
      color: '🎨',
      background: '🎨',
      border: '🔲',
      alignment: '↔️',
      numberFormat: '#️⃣',
      bold: 'B',
      italic: 'I',
      underline: 'U'
    }
    return icons[property] || '📝'
  }
  
  const formatValue = (property: string, value: any): string => {
    if (property === 'color' || property === 'background') {
      return value ? `${value} ●` : 'None'
    }
    if (property === 'font' && typeof value === 'object') {
      return `${value.family || 'Default'}, ${value.size || '11'}pt`
    }
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No'
    }
    return String(value || 'Default')
  }
  
  return (
    <div className="flex items-center space-x-3 p-2 bg-gray-800/50 rounded">
      <span className="text-lg">{getFormatIcon(change.property)}</span>
      
      <div className="flex-1">
        <div className="text-xs text-gray-400 capitalize">{change.property}</div>
        <div className="flex items-center space-x-2 text-sm">
          <span className="text-red-300">{formatValue(change.property, change.before)}</span>
          <span className="text-gray-500">→</span>
          <span className="text-green-300">{formatValue(change.property, change.after)}</span>
        </div>
      </div>
    </div>
  )
}

const CellPreview: React.FC<{ format: any, label: string }> = ({ format, label }) => {
  const getCellStyle = (): React.CSSProperties => {
    if (!format) return {}
    
    const style: React.CSSProperties = {
      padding: '8px',
      textAlign: (format.alignment as any) || 'left',
      fontFamily: format.font?.family || 'Arial',
      fontSize: `${format.font?.size || 11}pt`,
      fontWeight: format.bold ? 'bold' : 'normal',
      fontStyle: format.italic ? 'italic' : 'normal',
      textDecoration: format.underline ? 'underline' : 'none',
      color: format.color || '#e5e7eb',
      backgroundColor: format.background || 'transparent',
      border: format.border ? `1px solid ${format.border.color || '#6b7280'}` : 'none'
    }
    
    return style
  }
  
  return (
    <div>
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      <div 
        className="min-h-[40px] rounded flex items-center justify-center"
        style={getCellStyle()}
      >
        <span>Sample Text</span>
      </div>
    </div>
  )
}

// Helper functions
const parseFormatChanges = (diff: ExcelDiff): FormatChange[] => {
  const changes: FormatChange[] = []
  const before = diff.before as any || {}
  const after = diff.after as any || {}
  
  // Common format properties to check
  const properties = [
    'font', 'color', 'background', 'bold', 'italic', 'underline',
    'alignment', 'border', 'numberFormat', 'protection'
  ]
  
  properties.forEach(prop => {
    if (JSON.stringify(before[prop]) !== JSON.stringify(after[prop])) {
      changes.push({
        property: prop,
        before: before[prop],
        after: after[prop]
      })
    }
  })
  
  return changes
}

const hasVisualChanges = (changes: FormatChange[]): boolean => {
  const visualProperties = ['font', 'color', 'background', 'bold', 'italic', 'underline', 'border', 'alignment']
  return changes.some(change => visualProperties.includes(change.property))
}