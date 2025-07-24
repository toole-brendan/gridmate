import { RangeData } from '../excel/ExcelService'

export interface FormulaPattern {
  type: 'repeated' | 'sequential' | 'reference' | 'aggregation' | 'lookup' | 'conditional'
  pattern: string
  count: number
  cells: string[]
  description: string
  baseFormula?: string
  variations?: string[]
}

export interface DataPattern {
  type: 'series' | 'repeating' | 'growth' | 'seasonal' | 'random'
  confidence: number
  description: string
  parameters?: {
    increment?: number
    growthRate?: number
    period?: number
    mean?: number
    stdDev?: number
  }
}

export class PatternAnalyzer {
  /**
   * Analyze formula patterns in the spreadsheet
   */
  static analyzeFormulaPatterns(data: RangeData): FormulaPattern[] {
    const patterns: FormulaPattern[] = []
    
    if (!data.formulas) return patterns
    
    // Group formulas by similarity
    const formulaGroups = this.groupSimilarFormulas(data.formulas)
    
    // Analyze each group
    for (const [baseFormula, cells] of formulaGroups.entries()) {
      const pattern = this.identifyFormulaPattern(baseFormula, cells, data)
      if (pattern) {
        patterns.push(pattern)
      }
    }
    
    // Detect sequential formulas
    patterns.push(...this.detectSequentialFormulas(data.formulas))
    
    // Detect aggregation patterns
    patterns.push(...this.detectAggregationPatterns(data.formulas))
    
    return patterns
  }
  
  /**
   * Analyze data patterns in values
   */
  static analyzeDataPatterns(data: RangeData): DataPattern[] {
    const patterns: DataPattern[] = []
    
    if (!data.values) return patterns
    
    // Analyze by columns
    for (let col = 0; col < data.colCount; col++) {
      const columnData = this.extractColumn(data.values, col)
      const columnPattern = this.analyzeColumnPattern(columnData)
      if (columnPattern) {
        patterns.push(columnPattern)
      }
    }
    
    // Analyze by rows
    for (let row = 0; row < data.rowCount; row++) {
      const rowData = data.values[row]
      const rowPattern = this.analyzeRowPattern(rowData)
      if (rowPattern) {
        patterns.push(rowPattern)
      }
    }
    
    return patterns
  }
  
  /**
   * Group similar formulas together
   */
  private static groupSimilarFormulas(formulas: string[][]): Map<string, string[]> {
    const groups = new Map<string, string[]>()
    
    for (let row = 0; row < formulas.length; row++) {
      for (let col = 0; col < formulas[row].length; col++) {
        const formula = formulas[row][col]
        if (!formula || formula === '') continue
        
        // Normalize formula to find pattern
        const normalized = this.normalizeFormula(formula)
        
        if (!groups.has(normalized)) {
          groups.set(normalized, [])
        }
        
        const cellAddress = `${this.colToLetter(col)}${row + 1}`
        groups.get(normalized)!.push(cellAddress)
      }
    }
    
    return groups
  }
  
  /**
   * Normalize formula to identify patterns
   */
  private static normalizeFormula(formula: string): string {
    // Remove leading =
    let normalized = formula.startsWith('=') ? formula.substring(1) : formula
    
    // Replace cell references with placeholders
    // Handle absolute references
    normalized = normalized.replace(/\$?[A-Z]+\$?\d+/g, (match) => {
      if (match.includes('$')) {
        return 'ABS_REF'
      }
      return 'REL_REF'
    })
    
    // Replace ranges with placeholder
    normalized = normalized.replace(/REL_REF:REL_REF/g, 'RANGE')
    normalized = normalized.replace(/ABS_REF:ABS_REF/g, 'ABS_RANGE')
    
    return normalized
  }
  
  /**
   * Identify the type of formula pattern
   */
  private static identifyFormulaPattern(
    normalizedFormula: string, 
    cells: string[], 
    data: RangeData
  ): FormulaPattern | null {
    
    if (cells.length < 2) return null
    
    let type: FormulaPattern['type'] = 'repeated'
    let description = ''
    
    // Identify pattern type based on normalized formula
    if (/SUM|AVERAGE|COUNT|MAX|MIN/.test(normalizedFormula)) {
      type = 'aggregation'
      description = 'Aggregation formulas calculating summary statistics'
    } else if (/VLOOKUP|HLOOKUP|INDEX|MATCH/.test(normalizedFormula)) {
      type = 'lookup'
      description = 'Lookup formulas retrieving data from other ranges'
    } else if (/IF|IFS|SWITCH/.test(normalizedFormula)) {
      type = 'conditional'
      description = 'Conditional formulas with logic branches'
    } else if (cells.length > 5 && this.areSequential(cells)) {
      type = 'sequential'
      description = 'Sequential formulas in adjacent cells'
    } else {
      type = 'repeated'
      description = 'Repeated formula pattern across multiple cells'
    }
    
    // Get actual formula examples
    const firstCell = cells[0]
    const [col, row] = this.parseCell(firstCell)
    const baseFormula = data.formulas?.[row]?.[col] || ''
    
    return {
      type,
      pattern: normalizedFormula,
      count: cells.length,
      cells: cells.slice(0, 10), // Limit to first 10 for brevity
      description,
      baseFormula
    }
  }
  
  /**
   * Check if cells are sequential
   */
  private static areSequential(cells: string[]): boolean {
    if (cells.length < 2) return false
    
    // Check if all in same column
    const columns = cells.map(cell => this.parseCell(cell)[0])
    const sameColumn = columns.every(col => col === columns[0])
    
    if (sameColumn) {
      const rows = cells.map(cell => this.parseCell(cell)[1])
      rows.sort((a, b) => a - b)
      
      for (let i = 1; i < rows.length; i++) {
        if (rows[i] !== rows[i - 1] + 1) return false
      }
      return true
    }
    
    // Check if all in same row
    const rows = cells.map(cell => this.parseCell(cell)[1])
    const sameRow = rows.every(row => row === rows[0])
    
    if (sameRow) {
      columns.sort((a, b) => a - b)
      
      for (let i = 1; i < columns.length; i++) {
        if (columns[i] !== columns[i - 1] + 1) return false
      }
      return true
    }
    
    return false
  }
  
  /**
   * Detect sequential formula patterns
   */
  private static detectSequentialFormulas(formulas: string[][]): FormulaPattern[] {
    const patterns: FormulaPattern[] = []
    const visited = new Set<string>()
    
    // Check rows
    for (let row = 0; row < formulas.length; row++) {
      let sequenceStart = -1
      let sequenceFormulas: string[] = []
      
      for (let col = 0; col < formulas[row].length; col++) {
        const formula = formulas[row][col]
        const cellKey = `${row},${col}`
        
        if (formula && !visited.has(cellKey)) {
          if (sequenceStart === -1) {
            sequenceStart = col
            sequenceFormulas = [formula]
          } else {
            // Check if formula follows pattern
            if (this.isSequentialFormula(sequenceFormulas[0], formula, col - sequenceStart)) {
              sequenceFormulas.push(formula)
            } else {
              // End of sequence
              if (sequenceFormulas.length >= 3) {
                const cells = []
                for (let i = 0; i < sequenceFormulas.length; i++) {
                  cells.push(`${this.colToLetter(sequenceStart + i)}${row + 1}`)
                  visited.add(`${row},${sequenceStart + i}`)
                }
                
                patterns.push({
                  type: 'sequential',
                  pattern: 'Row-wise sequential formulas',
                  count: sequenceFormulas.length,
                  cells,
                  description: 'Formulas that increment references across rows',
                  baseFormula: sequenceFormulas[0],
                  variations: sequenceFormulas.slice(0, 3)
                })
              }
              
              sequenceStart = col
              sequenceFormulas = [formula]
            }
          }
        } else {
          // Check if we have a sequence to save
          if (sequenceFormulas.length >= 3) {
            const cells = []
            for (let i = 0; i < sequenceFormulas.length; i++) {
              cells.push(`${this.colToLetter(sequenceStart + i)}${row + 1}`)
              visited.add(`${row},${sequenceStart + i}`)
            }
            
            patterns.push({
              type: 'sequential',
              pattern: 'Row-wise sequential formulas',
              count: sequenceFormulas.length,
              cells,
              description: 'Formulas that increment references across rows',
              baseFormula: sequenceFormulas[0],
              variations: sequenceFormulas.slice(0, 3)
            })
          }
          
          sequenceStart = -1
          sequenceFormulas = []
        }
      }
    }
    
    return patterns
  }
  
  /**
   * Check if two formulas are sequential
   */
  private static isSequentialFormula(baseFormula: string, testFormula: string, offset: number): boolean {
    // Simple check - formulas should have same structure with offset references
    const baseRefs = baseFormula.match(/[A-Z]+\d+/g) || []
    const testRefs = testFormula.match(/[A-Z]+\d+/g) || []
    
    if (baseRefs.length !== testRefs.length) return false
    
    // Check if references are offset correctly
    for (let i = 0; i < baseRefs.length; i++) {
      const [baseCol, baseRow] = this.parseCell(baseRefs[i])
      const [testCol, testRow] = this.parseCell(testRefs[i])
      
      // For row-wise sequence, columns should increment
      if (testCol !== baseCol + offset || testRow !== baseRow) {
        // Also check for absolute references that shouldn't change
        if (baseRefs[i].includes('$') && baseRefs[i] !== testRefs[i]) {
          return false
        }
      }
    }
    
    return true
  }
  
  /**
   * Detect aggregation patterns
   */
  private static detectAggregationPatterns(formulas: string[][]): FormulaPattern[] {
    const patterns: FormulaPattern[] = []
    const aggregationFunctions = ['SUM', 'AVERAGE', 'COUNT', 'MAX', 'MIN', 'MEDIAN', 'STDEV']
    
    const aggregationCells: string[] = []
    
    for (let row = 0; row < formulas.length; row++) {
      for (let col = 0; col < formulas[row].length; col++) {
        const formula = formulas[row][col]
        if (!formula) continue
        
        const hasAggregation = aggregationFunctions.some(func => 
          formula.toUpperCase().includes(func + '(')
        )
        
        if (hasAggregation) {
          aggregationCells.push(`${this.colToLetter(col)}${row + 1}`)
        }
      }
    }
    
    if (aggregationCells.length > 0) {
      patterns.push({
        type: 'aggregation',
        pattern: 'Aggregation functions',
        count: aggregationCells.length,
        cells: aggregationCells.slice(0, 10),
        description: 'Cells containing aggregation functions like SUM, AVERAGE, etc.'
      })
    }
    
    return patterns
  }
  
  /**
   * Extract column data
   */
  private static extractColumn(values: any[][], col: number): any[] {
    const columnData: any[] = []
    
    for (let row = 0; row < values.length; row++) {
      if (values[row][col] !== null && values[row][col] !== '') {
        columnData.push(values[row][col])
      }
    }
    
    return columnData
  }
  
  /**
   * Analyze column for patterns
   */
  private static analyzeColumnPattern(data: any[]): DataPattern | null {
    if (data.length < 3) return null
    
    // Filter to numeric data
    const numericData = data.filter(val => typeof val === 'number')
    
    if (numericData.length < 3) return null
    
    // Check for arithmetic series
    const differences: number[] = []
    for (let i = 1; i < numericData.length; i++) {
      differences.push(numericData[i] - numericData[i - 1])
    }
    
    // Check if differences are constant (arithmetic series)
    const avgDiff = differences.reduce((a, b) => a + b, 0) / differences.length
    const diffVariance = differences.reduce((sum, diff) => sum + Math.pow(diff - avgDiff, 2), 0) / differences.length
    
    if (diffVariance < 0.01) {
      return {
        type: 'series',
        confidence: 0.9,
        description: 'Arithmetic series with constant increment',
        parameters: {
          increment: avgDiff
        }
      }
    }
    
    // Check for geometric series (growth)
    const ratios: number[] = []
    for (let i = 1; i < numericData.length; i++) {
      if (numericData[i - 1] !== 0) {
        ratios.push(numericData[i] / numericData[i - 1])
      }
    }
    
    if (ratios.length > 0) {
      const avgRatio = ratios.reduce((a, b) => a + b, 0) / ratios.length
      const ratioVariance = ratios.reduce((sum, ratio) => sum + Math.pow(ratio - avgRatio, 2), 0) / ratios.length
      
      if (ratioVariance < 0.01 && Math.abs(avgRatio - 1) > 0.01) {
        return {
          type: 'growth',
          confidence: 0.85,
          description: 'Geometric series with constant growth rate',
          parameters: {
            growthRate: (avgRatio - 1) * 100
          }
        }
      }
    }
    
    // Check for repeating pattern
    for (let period = 2; period <= Math.floor(numericData.length / 2); period++) {
      let isRepeating = true
      
      for (let i = period; i < numericData.length; i++) {
        if (Math.abs(numericData[i] - numericData[i % period]) > 0.01) {
          isRepeating = false
          break
        }
      }
      
      if (isRepeating) {
        return {
          type: 'repeating',
          confidence: 0.8,
          description: `Repeating pattern with period ${period}`,
          parameters: {
            period
          }
        }
      }
    }
    
    return null
  }
  
  /**
   * Analyze row for patterns
   */
  private static analyzeRowPattern(data: any[]): DataPattern | null {
    // Similar to column analysis but for rows
    const numericData = data.filter(val => typeof val === 'number')
    
    if (numericData.length < 3) return null
    
    // Reuse column analysis logic
    return this.analyzeColumnPattern(numericData)
  }
  
  /**
   * Parse cell address
   */
  private static parseCell(cell: string): [number, number] {
    const match = cell.match(/([A-Z]+)(\d+)/)
    if (!match) return [0, 0]
    
    const col = this.letterToColumn(match[1])
    const row = parseInt(match[2]) - 1
    
    return [col, row]
  }
  
  /**
   * Convert column letter to number
   */
  private static letterToColumn(letter: string): number {
    let column = 0
    for (let i = 0; i < letter.length; i++) {
      column = column * 26 + (letter.charCodeAt(i) - 65 + 1)
    }
    return column - 1
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