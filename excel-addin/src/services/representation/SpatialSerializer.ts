import { RangeData } from '../excel/ExcelService'
import { SemanticRegion } from '../semantic/RegionDetector'

export interface SparseGrid {
  nonEmptyCells: Map<string, { value: any; formula?: string }>
  dimensions: { rows: number; cols: number }
  address: string
}

export interface CompressedGrid {
  patterns: CompressedPattern[]
  uniqueValues: Map<string, any>
  dimensions: { rows: number; cols: number }
  address: string
}

export interface CompressedPattern {
  type: 'constant' | 'formula' | 'sequence' | 'empty'
  startCell: string
  endCell: string
  value?: string // Reference to uniqueValues map
  formula?: string
  increment?: number
}

export interface FormulaPattern {
  template: string
  instances: Array<{
    cell: string
    variables: Record<string, string>
  }>
}

export class SpatialSerializer {
  /**
   * Convert range data to LLM-friendly format with token optimization
   */
  static toLLMFormat(
    range: any, 
    values: any[][], 
    formulas: string[][],
    options: {
      maxTokens?: number
      includeEmpty?: boolean
      compactMode?: boolean
    } = {}
  ): string {
    const { maxTokens = 2000, includeEmpty = false, compactMode = true } = options
    
    let result = ''
    
    // Add header with range info
    result += `Range: ${range.address} (${range.rowCount}×${range.columnCount})\n`
    
    if (compactMode) {
      // Use compact representation
      result += this.toCompactFormat(values, formulas, range, includeEmpty)
    } else {
      // Use traditional markdown table
      result += this.toMarkdownTable(values, formulas, range, includeEmpty)
    }
    
    // Check token estimate and truncate if needed
    const estimatedTokens = this.estimateTokenCount(result)
    if (estimatedTokens > maxTokens) {
      result = this.truncateToTokenLimit(result, maxTokens)
    }
    
    return result
  }
  
  /**
   * Convert to sparse grid format (efficient for large, sparse sheets)
   */
  static toSparseFormat(range: any, values: any[][], formulas?: string[][]): SparseGrid {
    const nonEmptyCells = new Map<string, { value: any; formula?: string }>()
    
    for (let row = 0; row < values.length; row++) {
      for (let col = 0; col < values[row].length; col++) {
        const value = values[row][col]
        const formula = formulas?.[row]?.[col]
        
        if (value !== null && value !== '') {
          const cellAddress = `${this.colToLetter(col)}${row + 1}`
          nonEmptyCells.set(cellAddress, {
            value,
            formula: formula || undefined
          })
        }
      }
    }
    
    return {
      nonEmptyCells,
      dimensions: { rows: range.rowCount, cols: range.columnCount },
      address: range.address
    }
  }
  
  /**
   * Compress repeating patterns to save tokens
   */
  static compressRepeatingPatterns(values: any[][]): CompressedGrid {
    const patterns: CompressedPattern[] = []
    const uniqueValues = new Map<string, any>()
    const visited = new Set<string>()
    
    let valueCounter = 0
    
    // Helper to get or create unique value reference
    const getValueRef = (value: any): string => {
      const valueStr = JSON.stringify(value)
      for (const [ref, val] of uniqueValues.entries()) {
        if (JSON.stringify(val) === valueStr) return ref
      }
      const ref = `v${valueCounter++}`
      uniqueValues.set(ref, value)
      return ref
    }
    
    // Scan for patterns
    for (let row = 0; row < values.length; row++) {
      for (let col = 0; col < values[row].length; col++) {
        const cellKey = `${row},${col}`
        if (visited.has(cellKey)) continue
        
        const value = values[row][col]
        
        // Skip empty cells
        if (value === null || value === '') {
          // Find empty block
          const emptyBlock = this.findEmptyBlock(values, row, col, visited)
          if (emptyBlock) {
            patterns.push(emptyBlock)
          }
          continue
        }
        
        // Check for constant value blocks
        const constantBlock = this.findConstantBlock(values, row, col, value, visited)
        if (constantBlock) {
          constantBlock.value = getValueRef(value)
          patterns.push(constantBlock)
          continue
        }
        
        // Check for sequence patterns
        if (typeof value === 'number') {
          const sequence = this.findSequence(values, row, col, visited)
          if (sequence) {
            patterns.push(sequence)
            continue
          }
        }
        
        // Single cell
        visited.add(cellKey)
        patterns.push({
          type: 'constant',
          startCell: `${this.colToLetter(col)}${row + 1}`,
          endCell: `${this.colToLetter(col)}${row + 1}`,
          value: getValueRef(value)
        })
      }
    }
    
    return {
      patterns,
      uniqueValues,
      dimensions: { rows: values.length, cols: values[0]?.length || 0 },
      address: 'Compressed'
    }
  }
  
  /**
   * Extract formula templates from patterns
   */
  static extractFormulaTemplates(formulas: string[][]): FormulaPattern[] {
    const templates = new Map<string, FormulaPattern>()
    
    for (let row = 0; row < formulas.length; row++) {
      for (let col = 0; col < formulas[row].length; col++) {
        const formula = formulas[row][col]
        if (!formula || formula === '') continue
        
        const cellAddress = `${this.colToLetter(col)}${row + 1}`
        const { template, variables } = this.extractTemplate(formula)
        
        if (!templates.has(template)) {
          templates.set(template, {
            template,
            instances: []
          })
        }
        
        templates.get(template)!.instances.push({
          cell: cellAddress,
          variables
        })
      }
    }
    
    // Convert to array and filter out single-use templates
    return Array.from(templates.values()).filter(pattern => pattern.instances.length > 1)
  }
  
  /**
   * Estimate token count for a string
   */
  static estimateTokenCount(text: string): number {
    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4)
  }
  
  /**
   * Optimize representation for token limit
   */
  static optimizeForTokenLimit(data: RangeData, maxTokens: number): string {
    let representation = ''
    
    // Start with most important information
    representation += `Range: ${data.address}\n`
    representation += `Size: ${data.rowCount}×${data.colCount}\n\n`
    
    // Try different representations in order of preference
    const representations = [
      () => this.toSummaryFormat(data),
      () => this.toCompactFormat(data.values, data.formulas || [], data, false),
      () => this.toSparseTextFormat(data)
    ]
    
    for (const repr of representations) {
      const candidate = representation + repr()
      if (this.estimateTokenCount(candidate) <= maxTokens) {
        return candidate
      }
    }
    
    // If still too large, truncate
    return this.truncateToTokenLimit(representation + representations[0](), maxTokens)
  }
  
  /**
   * Convert to compact format
   */
  private static toCompactFormat(
    values: any[][], 
    formulas: string[][], 
    range: any,
    includeEmpty: boolean
  ): string {
    let result = 'Data:\n'
    
    // Find non-empty bounds
    const bounds = this.findDataBounds(values)
    if (!bounds) return 'Empty range\n'
    
    // Create compact representation
    for (let row = bounds.minRow; row <= bounds.maxRow; row++) {
      const rowData: string[] = []
      
      for (let col = bounds.minCol; col <= bounds.maxCol; col++) {
        const value = values[row]?.[col]
        const formula = formulas[row]?.[col]
        
        if (formula) {
          rowData.push(`[${this.formatCellValue(value)}|${formula}]`)
        } else if (value !== null && value !== '') {
          rowData.push(this.formatCellValue(value))
        } else if (includeEmpty) {
          rowData.push('·')
        }
      }
      
      if (rowData.length > 0) {
        const rowLabel = `${row + 1}:`
        result += `${rowLabel.padEnd(6)} ${rowData.join(' | ')}\n`
      }
    }
    
    return result
  }
  
  /**
   * Convert to markdown table format
   */
  private static toMarkdownTable(
    values: any[][], 
    formulas: string[][], 
    range: any,
    includeEmpty: boolean
  ): string {
    let result = ''
    
    // Find bounds
    const bounds = this.findDataBounds(values)
    if (!bounds) return 'Empty range\n'
    
    // Create header
    result += '|     |'
    for (let col = bounds.minCol; col <= bounds.maxCol; col++) {
      result += ` ${this.colToLetter(col)} |`
    }
    result += '\n'
    
    // Add separator
    result += '|-----|'
    for (let col = bounds.minCol; col <= bounds.maxCol; col++) {
      result += '---|'
    }
    result += '\n'
    
    // Add data rows
    for (let row = bounds.minRow; row <= bounds.maxRow; row++) {
      result += `| ${(row + 1).toString().padEnd(3)} |`
      
      for (let col = bounds.minCol; col <= bounds.maxCol; col++) {
        const value = values[row]?.[col]
        const formula = formulas[row]?.[col]
        
        let cellContent = ''
        if (formula) {
          cellContent = `=${this.truncateFormula(formula)}`
        } else if (value !== null && value !== '') {
          cellContent = this.formatCellValue(value)
        } else if (includeEmpty) {
          cellContent = ' '
        }
        
        result += ` ${cellContent} |`
      }
      result += '\n'
    }
    
    return result
  }
  
  /**
   * Create summary format for large ranges
   */
  private static toSummaryFormat(data: RangeData): string {
    let summary = 'Summary:\n'
    
    // Count non-empty cells
    let nonEmptyCount = 0
    let formulaCount = 0
    
    for (let row = 0; row < data.values.length; row++) {
      for (let col = 0; col < data.values[row].length; col++) {
        if (data.values[row][col] !== null && data.values[row][col] !== '') {
          nonEmptyCount++
        }
        if (data.formulas?.[row]?.[col]) {
          formulaCount++
        }
      }
    }
    
    summary += `- Non-empty cells: ${nonEmptyCount}\n`
    summary += `- Formula cells: ${formulaCount}\n`
    summary += `- Data density: ${((nonEmptyCount / (data.rowCount * data.colCount)) * 100).toFixed(1)}%\n`
    
    // Sample corner data
    summary += '\nSample data (corners):\n'
    
    const corners = [
      { row: 0, col: 0, label: 'Top-left' },
      { row: 0, col: data.colCount - 1, label: 'Top-right' },
      { row: data.rowCount - 1, col: 0, label: 'Bottom-left' },
      { row: data.rowCount - 1, col: data.colCount - 1, label: 'Bottom-right' }
    ]
    
    for (const corner of corners) {
      const value = data.values[corner.row]?.[corner.col]
      if (value !== null && value !== '') {
        summary += `- ${corner.label} (${this.colToLetter(corner.col)}${corner.row + 1}): ${this.formatCellValue(value)}\n`
      }
    }
    
    return summary
  }
  
  /**
   * Convert to sparse text format
   */
  private static toSparseTextFormat(data: RangeData): string {
    let result = 'Non-empty cells:\n'
    
    const sparse = this.toSparseFormat(
      { rowCount: data.rowCount, columnCount: data.colCount, address: data.address },
      data.values,
      data.formulas
    )
    
    // Group by rows for readability
    const rowGroups = new Map<number, Array<{ col: string; value: any; formula?: string }>>()
    
    for (const [cell, data] of sparse.nonEmptyCells) {
      const match = cell.match(/([A-Z]+)(\d+)/)
      if (!match) continue
      
      const row = parseInt(match[2])
      if (!rowGroups.has(row)) {
        rowGroups.set(row, [])
      }
      
      rowGroups.get(row)!.push({
        col: match[1],
        value: data.value,
        formula: data.formula
      })
    }
    
    // Sort rows
    const sortedRows = Array.from(rowGroups.keys()).sort((a, b) => a - b)
    
    for (const row of sortedRows) {
      const cells = rowGroups.get(row)!
      cells.sort((a, b) => a.col.localeCompare(b.col))
      
      result += `Row ${row}: `
      result += cells.map(cell => {
        if (cell.formula) {
          return `${cell.col}=${cell.formula}`
        }
        return `${cell.col}:${this.formatCellValue(cell.value)}`
      }).join(', ')
      result += '\n'
    }
    
    return result
  }
  
  /**
   * Find data bounds (non-empty area)
   */
  private static findDataBounds(values: any[][]): { 
    minRow: number; 
    maxRow: number; 
    minCol: number; 
    maxCol: number 
  } | null {
    let minRow = values.length
    let maxRow = -1
    let minCol = values[0]?.length || 0
    let maxCol = -1
    
    for (let row = 0; row < values.length; row++) {
      for (let col = 0; col < values[row].length; col++) {
        if (values[row][col] !== null && values[row][col] !== '') {
          minRow = Math.min(minRow, row)
          maxRow = Math.max(maxRow, row)
          minCol = Math.min(minCol, col)
          maxCol = Math.max(maxCol, col)
        }
      }
    }
    
    if (maxRow === -1) return null
    
    return { minRow, maxRow, minCol, maxCol }
  }
  
  /**
   * Find empty block starting from position
   */
  private static findEmptyBlock(
    values: any[][], 
    startRow: number, 
    startCol: number,
    visited: Set<string>
  ): CompressedPattern | null {
    let endRow = startRow
    let endCol = startCol
    
    // Expand right
    while (endCol < values[startRow].length - 1 && 
           (values[startRow][endCol + 1] === null || values[startRow][endCol + 1] === '')) {
      endCol++
    }
    
    // Expand down
    let canExpandDown = true
    while (canExpandDown && endRow < values.length - 1) {
      for (let col = startCol; col <= endCol; col++) {
        if (values[endRow + 1]?.[col] !== null && values[endRow + 1]?.[col] !== '') {
          canExpandDown = false
          break
        }
      }
      if (canExpandDown) endRow++
    }
    
    // Mark as visited
    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        visited.add(`${r},${c}`)
      }
    }
    
    return {
      type: 'empty',
      startCell: `${this.colToLetter(startCol)}${startRow + 1}`,
      endCell: `${this.colToLetter(endCol)}${endRow + 1}`
    }
  }
  
  /**
   * Find constant value block
   */
  private static findConstantBlock(
    values: any[][], 
    startRow: number, 
    startCol: number,
    value: any,
    visited: Set<string>
  ): CompressedPattern | null {
    const valueStr = JSON.stringify(value)
    let endRow = startRow
    let endCol = startCol
    
    // Try to expand the block
    // First try expanding right
    while (endCol < values[startRow].length - 1 && 
           JSON.stringify(values[startRow][endCol + 1]) === valueStr) {
      endCol++
    }
    
    // Then try expanding down
    let canExpandDown = true
    while (canExpandDown && endRow < values.length - 1) {
      for (let col = startCol; col <= endCol; col++) {
        if (JSON.stringify(values[endRow + 1]?.[col]) !== valueStr) {
          canExpandDown = false
          break
        }
      }
      if (canExpandDown) endRow++
    }
    
    // Only create pattern if more than one cell
    if (endRow === startRow && endCol === startCol) {
      return null
    }
    
    // Mark as visited
    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        visited.add(`${r},${c}`)
      }
    }
    
    return {
      type: 'constant',
      startCell: `${this.colToLetter(startCol)}${startRow + 1}`,
      endCell: `${this.colToLetter(endCol)}${endRow + 1}`
    }
  }
  
  /**
   * Find numeric sequence
   */
  private static findSequence(
    values: any[][], 
    startRow: number, 
    startCol: number,
    visited: Set<string>
  ): CompressedPattern | null {
    const firstValue = values[startRow][startCol]
    if (typeof firstValue !== 'number') return null
    
    // Try horizontal sequence
    if (startCol < values[startRow].length - 2) {
      const second = values[startRow][startCol + 1]
      const third = values[startRow][startCol + 2]
      
      if (typeof second === 'number' && typeof third === 'number') {
        const diff1 = second - firstValue
        const diff2 = third - second
        
        if (Math.abs(diff1 - diff2) < 0.001) {
          // Found arithmetic sequence
          let endCol = startCol + 2
          
          while (endCol < values[startRow].length - 1) {
            const next = values[startRow][endCol + 1]
            const expected = values[startRow][endCol] + diff1
            
            if (typeof next !== 'number' || Math.abs(next - expected) > 0.001) {
              break
            }
            endCol++
          }
          
          // Mark as visited
          for (let c = startCol; c <= endCol; c++) {
            visited.add(`${startRow},${c}`)
          }
          
          return {
            type: 'sequence',
            startCell: `${this.colToLetter(startCol)}${startRow + 1}`,
            endCell: `${this.colToLetter(endCol)}${startRow + 1}`,
            increment: diff1
          }
        }
      }
    }
    
    return null
  }
  
  /**
   * Extract template from formula
   */
  private static extractTemplate(formula: string): { template: string; variables: Record<string, string> } {
    const variables: Record<string, string> = {}
    let varCounter = 0
    
    // Replace cell references with variables
    const template = formula.replace(/\$?[A-Z]+\$?\d+/g, (match) => {
      const varName = `{${varCounter++}}`
      variables[varName] = match
      return varName
    })
    
    return { template, variables }
  }
  
  /**
   * Truncate text to token limit
   */
  private static truncateToTokenLimit(text: string, maxTokens: number): string {
    const targetLength = maxTokens * 4 // Rough estimate
    
    if (text.length <= targetLength) return text
    
    // Truncate and add indicator
    return text.substring(0, targetLength - 20) + '\n... (truncated)'
  }
  
  /**
   * Format cell value for display
   */
  private static formatCellValue(value: any): string {
    if (value === null || value === undefined) return ''
    
    if (typeof value === 'number') {
      // Format large numbers with thousand separators
      if (Math.abs(value) >= 1000) {
        return value.toLocaleString('en-US', { maximumFractionDigits: 2 })
      }
      // Round to 2 decimal places
      return value.toFixed(2).replace(/\.?0+$/, '')
    }
    
    if (typeof value === 'string') {
      // Truncate long strings
      if (value.length > 20) {
        return value.substring(0, 17) + '...'
      }
      return value
    }
    
    return String(value)
  }
  
  /**
   * Truncate formula for display
   */
  private static truncateFormula(formula: string): string {
    if (formula.length <= 30) return formula
    return formula.substring(0, 27) + '...'
  }
  
  /**
   * Convert column number to letter
   */
  private static colToLetter(col: number): string {
    let letter = ''
    col++
    while (col > 0) {
      const remainder = (col - 1) % 26
      letter = String.fromCharCode(65 + remainder) + letter
      col = Math.floor((col - 1) / 26)
    }
    return letter
  }
}