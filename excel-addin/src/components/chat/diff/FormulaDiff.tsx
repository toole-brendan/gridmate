import React from 'react'
import { ExcelDiff } from '../../../types/enhanced-chat'

interface FormulaDiffProps {
  diff: ExcelDiff
}

export const FormulaDiff: React.FC<FormulaDiffProps> = ({ diff }) => {
  const renderFormula = (formula: string, type: 'before' | 'after') => {
    const color = type === 'before' ? 'red' : 'green'
    const symbol = type === 'before' ? '-' : '+'
    
    // Syntax highlighting for Excel formulas
    const highlightedFormula = highlightExcelFormula(formula)
    
    return (
      <div className={`flex items-start space-x-2 ${type === 'after' ? 'mt-2' : ''}`}>
        <span className={`text-${color}-400 font-mono text-sm mt-0.5`}>{symbol}</span>
        <div className={`flex-1 bg-${color}-900/20 border border-${color}-800/30 rounded-md p-3`}>
          <div className="font-mono text-sm" dangerouslySetInnerHTML={{ __html: highlightedFormula }} />
        </div>
      </div>
    )
  }
  
  const renderSideBySide = () => {
    return (
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-xs text-gray-400 mb-1">Before</div>
          <div className="bg-red-900/20 border border-red-800/30 rounded-md p-3">
            <div 
              className="font-mono text-sm text-red-300"
              dangerouslySetInnerHTML={{ __html: highlightExcelFormula(diff.before as string || '') }}
            />
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-400 mb-1">After</div>
          <div className="bg-green-900/20 border border-green-800/30 rounded-md p-3">
            <div 
              className="font-mono text-sm text-green-300"
              dangerouslySetInnerHTML={{ __html: highlightExcelFormula(diff.after as string || '') }}
            />
          </div>
        </div>
      </div>
    )
  }
  
  // For long formulas, use side-by-side view
  const beforeLength = (diff.before as string)?.length || 0
  const afterLength = (diff.after as string)?.length || 0
  const useSideBySide = beforeLength > 50 || afterLength > 50
  
  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-2 text-xs text-gray-400">
        <span>Cell {diff.range}</span>
        {diff.affectedCells && diff.affectedCells > 1 && (
          <span>• Affects {diff.affectedCells} dependent cells</span>
        )}
      </div>
      
      {useSideBySide ? (
        renderSideBySide()
      ) : (
        <>
          {diff.before && renderFormula(diff.before as string, 'before')}
          {diff.after && renderFormula(diff.after as string, 'after')}
        </>
      )}
      
      {/* Show formula evaluation preview if available */}
      {diff.after && (
        <div className="mt-3 p-2 bg-blue-900/20 border border-blue-800/30 rounded text-xs">
          <span className="text-blue-400">Preview:</span>
          <span className="text-gray-300 ml-2">
            This formula will calculate to approximately {getFormulaPreview(diff.after as string)}
          </span>
        </div>
      )}
    </div>
  )
}

// Syntax highlighting for Excel formulas
const highlightExcelFormula = (formula: string): string => {
  if (!formula) return ''
  
  // Excel functions
  const functions = ['SUM', 'AVERAGE', 'COUNT', 'IF', 'VLOOKUP', 'HLOOKUP', 'INDEX', 'MATCH', 
                    'SUMIF', 'COUNTIF', 'MAX', 'MIN', 'CONCATENATE', 'LEFT', 'RIGHT', 'MID',
                    'IFERROR', 'AND', 'OR', 'NOT', 'TODAY', 'NOW', 'DATE', 'ROUND', 'ROUNDUP',
                    'ROUNDDOWN', 'ABS', 'NPV', 'IRR', 'PMT', 'FV', 'PV', 'RATE']
  
  let highlighted = formula
  
  // Highlight functions
  functions.forEach(func => {
    const regex = new RegExp(`\\b${func}\\b`, 'gi')
    highlighted = highlighted.replace(regex, `<span class="text-purple-400">${func}</span>`)
  })
  
  // Highlight cell references (e.g., A1, B2:C10, Sheet1!A1)
  highlighted = highlighted.replace(
    /(\$?[A-Z]+\$?\d+(?::\$?[A-Z]+\$?\d+)?)/g,
    '<span class="text-blue-400">$1</span>'
  )
  
  // Highlight sheet references
  highlighted = highlighted.replace(
    /([A-Za-z0-9_]+)!/g,
    '<span class="text-yellow-400">$1!</span>'
  )
  
  // Highlight numbers
  highlighted = highlighted.replace(
    /\b(\d+\.?\d*)\b/g,
    '<span class="text-green-400">$1</span>'
  )
  
  // Highlight strings
  highlighted = highlighted.replace(
    /"([^"]*)"/g,
    '<span class="text-orange-400">"$1"</span>'
  )
  
  // Highlight operators
  highlighted = highlighted.replace(
    /([+\-*/=<>])/g,
    '<span class="text-gray-400">$1</span>'
  )
  
  return highlighted
}

// Get a preview of what the formula might calculate to
const getFormulaPreview = (formula: string): string => {
  // This is a simplified preview - in reality, you'd evaluate based on actual cell values
  if (formula.includes('SUM')) return '(sum of selected range)'
  if (formula.includes('AVERAGE')) return '(average of selected range)'
  if (formula.includes('COUNT')) return '(count of selected range)'
  if (formula.includes('IF')) return '(conditional result)'
  if (formula.includes('VLOOKUP')) return '(lookup result)'
  if (formula.includes('NPV')) return '(net present value)'
  if (formula.includes('IRR')) return '(internal rate of return)'
  return '(calculated value)'
}