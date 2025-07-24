import { RangeData } from '../excel/ExcelService'
import { SemanticRegion } from '../semantic/RegionDetector'
import { FormulaPattern } from '../semantic/PatternAnalyzer'

export interface SparseGrid {
  nonEmptyCells: Map<string, { value: any; formula?: string }>
  bounds: {
    minRow: number
    maxRow: number
    minCol: number
    maxCol: number
  }
  totalCells: number
  nonEmptyCount: number
}

export interface CompressedGrid {
  patterns: PatternInstance[]
  uniqueValues: Map<string, any>
  compressionRatio: number
}

export interface PatternInstance {
  type: 'repeating' | 'formula' | 'sequence'
  startCell: string
  endCell: string
  pattern: string
  count: number
}

export interface LLMFormattedGrid {
  format: 'markdown' | 'sparse' | 'compressed' | 'hybrid'
  content: string
  metadata: {
    tokenEstimate: number
    cellCount: number
    formulaCount: number
    compressionRatio?: number
  }
}

export class GridSerializer {
  private static readonly MAX_TOKENS_DEFAULT = 4000
  private static readonly CELL_SEPARATOR = ' | '
  private static readonly ROW_SEPARATOR = '\n'
  
  /**
   * Convert range data to LLM-optimized format
   */
  static toLLMFormat(
    range: Excel.Range,
    values: any[][],
    formulas: string[][],
    options: {
      maxTokens?: number
      format?: 'markdown' | 'sparse' | 'compressed' | 'hybrid'
      includeFormulas?: boolean
      semanticRegions?: SemanticRegion[]
    } = {}
  ): LLMFormattedGrid {
    const maxTokens = options.maxTokens || this.MAX_TOKENS_DEFAULT
    const format = options.format || 'hybrid'
    
    switch (format) {
      case 'markdown':
        return this.toMarkdownFormat(range, values, formulas, options)
      case 'sparse':
        return this.toSparseFormatLLM(range, values, formulas, options)
      case 'compressed':
        return this.toCompressedFormat(range, values, formulas, options)
      case 'hybrid':
        return this.toHybridFormat(range, values, formulas, options)
      default:
        return this.toHybridFormat(range, values, formulas, options)
    }
  }
  
  /**
   * Convert to sparse grid representation
   */
  static toSparseFormat(range: Excel.Range, values: any[][], formulas?: string[][]): SparseGrid {
    const nonEmptyCells = new Map<string, { value: any; formula?: string }>()
    let minRow = Infinity, maxRow = -1, minCol = Infinity, maxCol = -1
    
    for (let row = 0; row < values.length; row++) {
      for (let col = 0; col < values[row].length; col++) {
        const value = values[row][col]
        const formula = formulas?.[row]?.[col]
        
        if (value !== null && value !== undefined && value !== '') {
          const cellAddress = this.getCellAddress(row, col)
          nonEmptyCells.set(cellAddress, { value, formula })
          
          minRow = Math.min(minRow, row)
          maxRow = Math.max(maxRow, row)
          minCol = Math.min(minCol, col)
          maxCol = Math.max(maxCol, col)
        }
      }
    }
    
    return {
      nonEmptyCells,
      bounds: {
        minRow: minRow === Infinity ? 0 : minRow,
        maxRow: maxRow === -1 ? 0 : maxRow,
        minCol: minCol === Infinity ? 0 : minCol,
        maxCol: maxCol === -1 ? 0 : maxCol
      },
      totalCells: values.length * (values[0]?.length || 0),
      nonEmptyCount: nonEmptyCells.size
    }
  }
  
  /**
   * Compress repeating patterns
   */
  static compressRepeatingPatterns(values: any[][]): CompressedGrid {
    const patterns: PatternInstance[] = []
    const uniqueValues = new Map<string, any>()
    let patternId = 0
    
    // Detect row-wise patterns
    for (let row = 0; row < values.length; row++) {
      const rowPatterns = this.detectRowPatterns(values[row], row)
      patterns.push(...rowPatterns)
    }
    
    // Detect column-wise patterns
    for (let col = 0; col < (values[0]?.length || 0); col++) {
      const column = values.map(row => row[col])
      const colPatterns = this.detectColumnPatterns(column, col)
      patterns.push(...colPatterns)
    }
    
    // Calculate compression ratio
    const originalCells = values.length * (values[0]?.length || 0)
    const compressedCells = patterns.reduce((sum, p) => sum + 1, 0) // Each pattern counts as 1
    const compressionRatio = originalCells > 0 ? compressedCells / originalCells : 1
    
    return {
      patterns,
      uniqueValues,
      compressionRatio
    }
  }
  
  /**
   * Extract formula templates
   */
  static extractFormulaTemplates(formulas: string[][]): FormulaPattern[] {
    const templates: FormulaPattern[] = []
    const formulaGroups = new Map<string, { cells: string[]; formula: string }>()
    
    // Group similar formulas
    for (let row = 0; row < formulas.length; row++) {
      for (let col = 0; col < formulas[row].length; col++) {
        const formula = formulas[row][col]
        if (formula && formula.startsWith('=')) {
          const template = this.normalizeFormula(formula)
          const cellAddress = this.getCellAddress(row, col)
          
          if (!formulaGroups.has(template)) {
            formulaGroups.set(template, { cells: [], formula })
          }
          formulaGroups.get(template)!.cells.push(cellAddress)
        }
      }
    }
    
    // Convert to FormulaPattern format
    formulaGroups.forEach((group, template) => {
      if (group.cells.length > 1) {
        templates.push({
          type: 'formula',
          pattern: template,
          cells: group.cells,
          count: group.cells.length,
          direction: this.detectFormulaDirection(group.cells),
          isArrayFormula: false,
          dependencies: []
        } as FormulaPattern)
      }
    })
    
    return templates
  }
  
  /**
   * Estimate token count for a representation
   */
  static estimateTokenCount(representation: string): number {
    // Rough estimation: average 4 characters per token
    const charCount = representation.length
    const wordCount = representation.split(/\s+/).length
    
    // Use a weighted average of character and word-based estimates
    return Math.ceil((charCount / 4 + wordCount) / 2)
  }
  
  /**
   * Optimize representation for token limit
   */
  static optimizeForTokenLimit(data: RangeData, maxTokens: number): string {
    let representation = ''
    let currentTokens = 0
    
    // Priority 1: Headers and structure
    const headerInfo = this.extractHeaders(data)
    representation += headerInfo + '\n\n'
    currentTokens = this.estimateTokenCount(representation)
    
    if (currentTokens >= maxTokens * 0.8) {
      return representation + '... (truncated for token limit)'
    }
    
    // Priority 2: Key formulas
    const formulaInfo = this.extractKeyFormulas(data)
    if (currentTokens + this.estimateTokenCount(formulaInfo) < maxTokens * 0.8) {
      representation += formulaInfo + '\n\n'
      currentTokens = this.estimateTokenCount(representation)
    }
    
    // Priority 3: Sample data
    const sampleData = this.extractSampleData(data, maxTokens - currentTokens)
    representation += sampleData
    
    return representation
  }
  
  // Private helper methods
  
  private static toMarkdownFormat(
    range: Excel.Range,
    values: any[][],
    formulas: string[][],
    options: any
  ): LLMFormattedGrid {
    let content = ''
    const [startCell, endCell] = range.address.split(':')
    
    // Add coordinate headers
    content += `Range: ${range.address}\n\n`
    
    // Create markdown table
    const maxCols = Math.min(values[0]?.length || 0, 10) // Limit columns for readability
    const maxRows = Math.min(values.length, 20) // Limit rows
    
    // Column headers
    content += '|   |'
    for (let col = 0; col < maxCols; col++) {
      content += ` ${this.getColumnLetter(col)} |`
    }
    content += '\n|---|' + '---|'.repeat(maxCols) + '\n'
    
    // Data rows
    for (let row = 0; row < maxRows; row++) {
      content += `| ${row + 1} |`
      for (let col = 0; col < maxCols; col++) {
        const value = values[row]?.[col]
        const formula = formulas?.[row]?.[col]
        
        if (options.includeFormulas && formula) {
          content += ` ${formula} |`
        } else {
          content += ` ${this.formatCellValue(value)} |`
        }
      }
      content += '\n'
    }
    
    if (values.length > maxRows || (values[0]?.length || 0) > maxCols) {
      content += '\n... (truncated)\n'
    }
    
    return {
      format: 'markdown',
      content,
      metadata: {
        tokenEstimate: this.estimateTokenCount(content),
        cellCount: values.length * (values[0]?.length || 0),
        formulaCount: this.countFormulas(formulas)
      }
    }
  }
  
  private static toSparseFormatLLM(
    range: Excel.Range,
    values: any[][],
    formulas: string[][],
    options: any
  ): LLMFormattedGrid {
    const sparse = this.toSparseFormat(range, values, formulas)
    let content = `Sparse Grid Representation\n`
    content += `Range: ${range.address}\n`
    content += `Non-empty cells: ${sparse.nonEmptyCount}/${sparse.totalCells}\n\n`
    
    // Group by rows for better readability
    const cellsByRow = new Map<number, Array<{ col: number; value: any; formula?: string }>>()
    
    sparse.nonEmptyCells.forEach((cell, address) => {
      const [col, row] = this.parseAddress(address)
      if (!cellsByRow.has(row)) {
        cellsByRow.set(row, [])
      }
      cellsByRow.get(row)!.push({ col, value: cell.value, formula: cell.formula })
    })
    
    // Sort and format
    const sortedRows = Array.from(cellsByRow.keys()).sort((a, b) => a - b)
    
    for (const row of sortedRows) {
      const cells = cellsByRow.get(row)!.sort((a, b) => a.col - b.col)
      content += `Row ${row + 1}: `
      
      for (const cell of cells) {
        const addr = this.getCellAddress(row, cell.col)
        if (options.includeFormulas && cell.formula) {
          content += `${addr}=${cell.formula} `
        } else {
          content += `${addr}=${this.formatCellValue(cell.value)} `
        }
      }
      content += '\n'
    }
    
    return {
      format: 'sparse',
      content,
      metadata: {
        tokenEstimate: this.estimateTokenCount(content),
        cellCount: sparse.totalCells,
        formulaCount: this.countFormulas(formulas),
        compressionRatio: sparse.nonEmptyCount / sparse.totalCells
      }
    }
  }
  
  private static toCompressedFormat(
    range: Excel.Range,
    values: any[][],
    formulas: string[][],
    options: any
  ): LLMFormattedGrid {
    const compressed = this.compressRepeatingPatterns(values)
    const formulaTemplates = this.extractFormulaTemplates(formulas || [])
    
    let content = `Compressed Grid Representation\n`
    content += `Range: ${range.address}\n\n`
    
    // Formula templates
    if (formulaTemplates.length > 0) {
      content += `Formula Templates:\n`
      formulaTemplates.forEach((template, idx) => {
        content += `  Template ${idx + 1}: ${template.pattern}\n`
        content += `    Applied to: ${template.cells.slice(0, 5).join(', ')}`
        if (template.cells.length > 5) {
          content += ` ... (${template.cells.length} cells total)`
        }
        content += '\n'
      })
      content += '\n'
    }
    
    // Patterns
    if (compressed.patterns.length > 0) {
      content += `Repeating Patterns:\n`
      compressed.patterns.slice(0, 10).forEach((pattern, idx) => {
        content += `  Pattern ${idx + 1}: ${pattern.type} from ${pattern.startCell} to ${pattern.endCell}\n`
        content += `    Value: ${pattern.pattern} (${pattern.count} times)\n`
      })
    }
    
    return {
      format: 'compressed',
      content,
      metadata: {
        tokenEstimate: this.estimateTokenCount(content),
        cellCount: values.length * (values[0]?.length || 0),
        formulaCount: this.countFormulas(formulas),
        compressionRatio: compressed.compressionRatio
      }
    }
  }
  
  private static toHybridFormat(
    range: Excel.Range,
    values: any[][],
    formulas: string[][],
    options: any
  ): LLMFormattedGrid {
    // Combine the best of all formats based on data characteristics
    const sparse = this.toSparseFormat(range, values, formulas)
    const sparsityRatio = sparse.nonEmptyCount / sparse.totalCells
    
    // Use sparse format for very sparse data
    if (sparsityRatio < 0.2) {
      return this.toSparseFormatLLM(range, values, formulas, options)
    }
    
    // Use compressed format for data with patterns
    const compressed = this.compressRepeatingPatterns(values)
    if (compressed.compressionRatio < 0.5) {
      return this.toCompressedFormat(range, values, formulas, options)
    }
    
    // Default to markdown for dense data
    return this.toMarkdownFormat(range, values, formulas, options)
  }
  
  // Utility methods
  
  private static getCellAddress(row: number, col: number): string {
    return `${this.getColumnLetter(col)}${row + 1}`
  }
  
  private static getColumnLetter(col: number): string {
    let letter = ''
    col++
    while (col > 0) {
      col--
      letter = String.fromCharCode(65 + (col % 26)) + letter
      col = Math.floor(col / 26)
    }
    return letter
  }
  
  private static parseAddress(address: string): [number, number] {
    const match = address.match(/([A-Z]+)(\d+)/)
    if (!match) return [0, 0]
    
    const col = match[1].split('').reduce((acc, char, idx, arr) => {
      return acc + (char.charCodeAt(0) - 65 + 1) * Math.pow(26, arr.length - idx - 1)
    }, 0) - 1
    
    const row = parseInt(match[2]) - 1
    return [col, row]
  }
  
  private static formatCellValue(value: any): string {
    if (value === null || value === undefined) return ''
    if (typeof value === 'number') {
      return Number.isInteger(value) ? value.toString() : value.toFixed(2)
    }
    return value.toString()
  }
  
  private static countFormulas(formulas?: string[][]): number {
    if (!formulas) return 0
    return formulas.reduce((count, row) => 
      count + row.filter(f => f && f.startsWith('=')).length, 0)
  }
  
  private static detectRowPatterns(row: any[], rowIndex: number): PatternInstance[] {
    const patterns: PatternInstance[] = []
    let i = 0
    
    while (i < row.length) {
      let j = i + 1
      while (j < row.length && row[j] === row[i]) {
        j++
      }
      
      if (j - i > 2) { // Pattern of 3 or more
        patterns.push({
          type: 'repeating',
          startCell: this.getCellAddress(rowIndex, i),
          endCell: this.getCellAddress(rowIndex, j - 1),
          pattern: this.formatCellValue(row[i]),
          count: j - i
        })
      }
      
      i = j
    }
    
    return patterns
  }
  
  private static detectColumnPatterns(column: any[], colIndex: number): PatternInstance[] {
    const patterns: PatternInstance[] = []
    let i = 0
    
    while (i < column.length) {
      // Check for arithmetic sequence
      if (i + 2 < column.length && 
          typeof column[i] === 'number' && 
          typeof column[i + 1] === 'number' && 
          typeof column[i + 2] === 'number') {
        
        const diff1 = column[i + 1] - column[i]
        const diff2 = column[i + 2] - column[i + 1]
        
        if (diff1 === diff2) {
          let j = i + 3
          while (j < column.length && 
                 typeof column[j] === 'number' && 
                 column[j] - column[j - 1] === diff1) {
            j++
          }
          
          if (j - i > 3) { // Sequence of 4 or more
            patterns.push({
              type: 'sequence',
              startCell: this.getCellAddress(i, colIndex),
              endCell: this.getCellAddress(j - 1, colIndex),
              pattern: `Arithmetic sequence: start=${column[i]}, step=${diff1}`,
              count: j - i
            })
            i = j
            continue
          }
        }
      }
      
      i++
    }
    
    return patterns
  }
  
  private static normalizeFormula(formula: string): string {
    // Replace cell references with placeholders to identify formula patterns
    return formula.replace(/\$?[A-Z]+\$?\d+/g, 'CELL')
                  .replace(/\$?[A-Z]+\$?\d+:\$?[A-Z]+\$?\d+/g, 'RANGE')
  }
  
  private static detectFormulaDirection(cells: string[]): 'horizontal' | 'vertical' | 'mixed' {
    if (cells.length < 2) return 'mixed'
    
    const addresses = cells.map(cell => this.parseAddress(cell))
    const rows = addresses.map(([_, row]) => row)
    const cols = addresses.map(([col, _]) => col)
    
    const uniqueRows = new Set(rows).size
    const uniqueCols = new Set(cols).size
    
    if (uniqueRows === 1) return 'horizontal'
    if (uniqueCols === 1) return 'vertical'
    return 'mixed'
  }
  
  private static extractHeaders(data: RangeData): string {
    // Simple header extraction - can be enhanced
    if (!data.values || data.values.length === 0) return 'No headers found'
    
    const firstRow = data.values[0]
    const headers = firstRow.filter(cell => cell !== null && cell !== undefined && cell !== '')
    
    if (headers.length === 0) return 'No headers found'
    
    return `Headers: ${headers.join(', ')}`
  }
  
  private static extractKeyFormulas(data: RangeData): string {
    if (!data.formulas) return 'No formulas found'
    
    const formulas: string[] = []
    for (let row = 0; row < data.formulas.length && formulas.length < 5; row++) {
      for (let col = 0; col < data.formulas[row].length && formulas.length < 5; col++) {
        const formula = data.formulas[row][col]
        if (formula && formula.startsWith('=')) {
          formulas.push(`${this.getCellAddress(row, col)}: ${formula}`)
        }
      }
    }
    
    if (formulas.length === 0) return 'No formulas found'
    
    return `Key formulas:\n${formulas.join('\n')}`
  }
  
  private static extractSampleData(data: RangeData, remainingTokens: number): string {
    const maxRows = Math.min(10, Math.floor(remainingTokens / 50))
    let content = 'Sample data:\n'
    
    for (let row = 0; row < Math.min(data.values.length, maxRows); row++) {
      const rowData = data.values[row].slice(0, 5).map(v => this.formatCellValue(v))
      content += `Row ${row + 1}: ${rowData.join(' | ')}\n`
    }
    
    return content
  }
}