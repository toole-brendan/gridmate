// import * as XLSX from 'xlsx'
import { RangeData } from '../excel/ExcelService'

export interface SemanticRegion {
  type: 'header' | 'data' | 'total' | 'input' | 'calculation' | 'label' | 'empty'
  address: string
  startRow: number
  startCol: number
  endRow: number
  endCol: number
  confidence: number
  characteristics?: {
    hasFormulas?: boolean
    isNumeric?: boolean
    hasFormatting?: boolean
    isEmpty?: boolean
    hasText?: boolean
    hasDates?: boolean
    hasCurrency?: boolean
    hasPercentages?: boolean
  }
}

export class RegionDetector {
  /**
   * Detects semantic regions in spreadsheet data
   */
  static detectRegions(data: RangeData): SemanticRegion[] {
    const regions: SemanticRegion[] = []
    const { values, formulas } = data
    
    if (!values || values.length === 0) {
      return regions
    }
    
    // Detect header regions
    regions.push(...this.detectHeaders(values, formulas))
    
    // Detect total/summary rows
    regions.push(...this.detectTotalRows(values, formulas))
    
    // Detect input vs calculation areas
    regions.push(...this.detectInputVsCalculation(values, formulas))
    
    // Detect data tables
    regions.push(...this.detectDataTables(values, formulas))
    
    // Merge overlapping regions
    return this.mergeOverlappingRegions(regions)
  }
  
  /**
   * Detect header regions based on patterns
   */
  private static detectHeaders(values: any[][], formulas?: string[][]): SemanticRegion[] {
    const regions: SemanticRegion[] = []
    
    for (let row = 0; row < Math.min(10, values.length); row++) {
      const rowData = values[row]
      const isHeader = this.isLikelyHeader(rowData, row, values)
      
      if (isHeader) {
        const nonEmptyCols = this.findNonEmptyRange(rowData)
        if (nonEmptyCols.start !== -1) {
          regions.push({
            type: 'header',
            address: `${this.colToLetter(nonEmptyCols.start)}${row + 1}:${this.colToLetter(nonEmptyCols.end)}${row + 1}`,
            startRow: row,
            startCol: nonEmptyCols.start,
            endRow: row,
            endCol: nonEmptyCols.end,
            confidence: 0.8,
            characteristics: {
              hasText: true,
              hasFormulas: false
            }
          })
        }
      }
    }
    
    return regions
  }
  
  /**
   * Check if a row is likely a header
   */
  private static isLikelyHeader(row: any[], rowIndex: number, allValues: any[][]): boolean {
    // Headers typically:
    // 1. Contain mostly text
    // 2. Have values that look like labels
    // 3. Are followed by numeric data
    // 4. Don't have formulas
    
    const textCount = row.filter(cell => typeof cell === 'string' && cell.trim() !== '').length
    const totalNonEmpty = row.filter(cell => cell !== null && cell !== '').length
    
    if (totalNonEmpty === 0) return false
    
    const textRatio = textCount / totalNonEmpty
    
    // Check if next rows have numeric data
    let hasNumericBelow = false
    if (rowIndex < allValues.length - 1) {
      const nextRow = allValues[rowIndex + 1]
      const numericCount = nextRow.filter(cell => typeof cell === 'number').length
      hasNumericBelow = numericCount > totalNonEmpty * 0.5
    }
    
    // Common header patterns
    const headerPatterns = [
      /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i,
      /^(q1|q2|q3|q4|quarter|month|year|date|total|sum|average|avg)/i,
      /^(revenue|sales|cost|expense|profit|margin|growth|forecast)/i,
      /^(name|description|category|type|status|id|code)/i
    ]
    
    const hasHeaderPattern = row.some(cell => 
      typeof cell === 'string' && headerPatterns.some(pattern => pattern.test(cell))
    )
    
    return (textRatio > 0.7 || hasHeaderPattern) && (hasNumericBelow || rowIndex === 0)
  }
  
  /**
   * Detect total/summary rows
   */
  private static detectTotalRows(values: any[][], formulas?: string[][]): SemanticRegion[] {
    const regions: SemanticRegion[] = []
    
    for (let row = 0; row < values.length; row++) {
      const rowData = values[row]
      const rowFormulas = formulas?.[row] || []
      
      // Check for total indicators
      const hasTotalLabel = rowData.some(cell => 
        typeof cell === 'string' && /total|sum|subtotal|grand total/i.test(cell)
      )
      
      // Check for SUM formulas
      const hasSumFormulas = rowFormulas.some(formula => 
        typeof formula === 'string' && /^=SUM\(/i.test(formula)
      )
      
      if (hasTotalLabel || hasSumFormulas) {
        const nonEmptyCols = this.findNonEmptyRange(rowData)
        if (nonEmptyCols.start !== -1) {
          regions.push({
            type: 'total',
            address: `${this.colToLetter(nonEmptyCols.start)}${row + 1}:${this.colToLetter(nonEmptyCols.end)}${row + 1}`,
            startRow: row,
            startCol: nonEmptyCols.start,
            endRow: row,
            endCol: nonEmptyCols.end,
            confidence: 0.9,
            characteristics: {
              hasFormulas: hasSumFormulas,
              isNumeric: true
            }
          })
        }
      }
    }
    
    return regions
  }
  
  /**
   * Detect input vs calculation areas
   */
  private static detectInputVsCalculation(values: any[][], formulas?: string[][]): SemanticRegion[] {
    const regions: SemanticRegion[] = []
    
    if (!formulas) return regions
    
    // Find contiguous areas with and without formulas
    for (let row = 0; row < values.length; row++) {
      for (let col = 0; col < values[row].length; col++) {
        const hasFormula = formulas[row]?.[col] && formulas[row][col] !== ''
        const hasValue = values[row][col] !== null && values[row][col] !== ''
        
        if (hasValue && !hasFormula) {
          // Potential input cell - expand to find region
          const inputRegion = this.expandRegion(values, formulas, row, col, 'input')
          if (inputRegion && !this.isRegionCovered(regions, inputRegion)) {
            regions.push(inputRegion)
          }
        } else if (hasFormula) {
          // Calculation cell - expand to find region
          const calcRegion = this.expandRegion(values, formulas, row, col, 'calculation')
          if (calcRegion && !this.isRegionCovered(regions, calcRegion)) {
            regions.push(calcRegion)
          }
        }
      }
    }
    
    return regions
  }
  
  /**
   * Detect data tables
   */
  private static detectDataTables(values: any[][], formulas?: string[][]): SemanticRegion[] {
    const regions: SemanticRegion[] = []
    
    // Look for rectangular regions with consistent data types
    const visited = new Set<string>()
    
    for (let row = 0; row < values.length; row++) {
      for (let col = 0; col < values[row].length; col++) {
        const key = `${row},${col}`
        if (visited.has(key)) continue
        
        const tableRegion = this.detectTableFromPoint(values, row, col, visited)
        if (tableRegion) {
          regions.push(tableRegion)
        }
      }
    }
    
    return regions
  }
  
  /**
   * Detect a table starting from a point
   */
  private static detectTableFromPoint(
    values: any[][], 
    startRow: number, 
    startCol: number,
    visited: Set<string>
  ): SemanticRegion | null {
    // Check if this looks like the start of a table
    if (!this.looksLikeTableStart(values, startRow, startCol)) {
      return null
    }
    
    // Find table boundaries
    let endRow = startRow
    let endCol = startCol
    
    // Find right boundary
    for (let col = startCol; col < values[0].length; col++) {
      if (values[startRow][col] === null || values[startRow][col] === '') {
        break
      }
      endCol = col
    }
    
    // Find bottom boundary
    for (let row = startRow; row < values.length; row++) {
      let hasData = false
      for (let col = startCol; col <= endCol; col++) {
        if (values[row][col] !== null && values[row][col] !== '') {
          hasData = true
          break
        }
      }
      if (!hasData) break
      endRow = row
    }
    
    // Mark cells as visited
    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        visited.add(`${r},${c}`)
      }
    }
    
    // Determine if it's truly a data table
    const characteristics = this.analyzeRegionCharacteristics(values, startRow, startCol, endRow, endCol)
    
    if (characteristics.isNumeric || characteristics.hasDates) {
      return {
        type: 'data',
        address: `${this.colToLetter(startCol)}${startRow + 1}:${this.colToLetter(endCol)}${endRow + 1}`,
        startRow,
        startCol,
        endRow,
        endCol,
        confidence: 0.7,
        characteristics
      }
    }
    
    return null
  }
  
  /**
   * Check if a position looks like the start of a table
   */
  private static looksLikeTableStart(values: any[][], row: number, col: number): boolean {
    // Has value at current position
    if (values[row][col] === null || values[row][col] === '') return false
    
    // Has adjacent values (right or down)
    const hasRight = col < values[row].length - 1 && values[row][col + 1] !== null && values[row][col + 1] !== ''
    const hasDown = row < values.length - 1 && values[row + 1]?.[col] !== null && values[row + 1]?.[col] !== ''
    
    return hasRight || hasDown
  }
  
  /**
   * Analyze characteristics of a region
   */
  private static analyzeRegionCharacteristics(
    values: any[][], 
    startRow: number, 
    startCol: number, 
    endRow: number, 
    endCol: number
  ): SemanticRegion['characteristics'] {
    const characteristics: SemanticRegion['characteristics'] = {}
    
    let numericCount = 0
    let textCount = 0
    let dateCount = 0
    let currencyCount = 0
    let percentCount = 0
    let emptyCount = 0
    let totalCells = 0
    
    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        totalCells++
        const value = values[r]?.[c]
        
        if (value === null || value === '') {
          emptyCount++
        } else if (typeof value === 'number') {
          numericCount++
          // Check for percentage (0-1 range typically)
          if (value >= 0 && value <= 1 && value !== 0 && value !== 1) {
            percentCount++
          }
        } else if (typeof value === 'string') {
          textCount++
          // Check for currency symbols
          if (/[$€£¥]/.test(value)) {
            currencyCount++
          }
          // Check for date patterns
          if (/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(value)) {
            dateCount++
          }
        } else if (value instanceof Date) {
          dateCount++
        }
      }
    }
    
    // Set characteristics based on counts
    characteristics.isEmpty = emptyCount === totalCells
    characteristics.isNumeric = numericCount > totalCells * 0.5
    characteristics.hasText = textCount > totalCells * 0.3
    characteristics.hasDates = dateCount > totalCells * 0.3
    characteristics.hasCurrency = currencyCount > totalCells * 0.2
    characteristics.hasPercentages = percentCount > totalCells * 0.2
    
    return characteristics
  }
  
  /**
   * Expand a region from a starting point
   */
  private static expandRegion(
    values: any[][], 
    formulas: string[][] | undefined,
    startRow: number, 
    startCol: number,
    type: 'input' | 'calculation'
  ): SemanticRegion | null {
    const visited = new Set<string>()
    const queue: [number, number][] = [[startRow, startCol]]
    
    let minRow = startRow, maxRow = startRow
    let minCol = startCol, maxCol = startCol
    
    while (queue.length > 0) {
      const [row, col] = queue.shift()!
      const key = `${row},${col}`
      
      if (visited.has(key)) continue
      visited.add(key)
      
      // Check if this cell matches the type
      const hasFormula = formulas?.[row]?.[col] && formulas[row][col] !== ''
      const hasValue = values[row]?.[col] !== null && values[row][col] !== ''
      
      const matchesType = type === 'calculation' ? hasFormula : (hasValue && !hasFormula)
      
      if (!matchesType) continue
      
      // Update bounds
      minRow = Math.min(minRow, row)
      maxRow = Math.max(maxRow, row)
      minCol = Math.min(minCol, col)
      maxCol = Math.max(maxCol, col)
      
      // Add neighbors to queue
      const neighbors = [
        [row - 1, col], [row + 1, col],
        [row, col - 1], [row, col + 1]
      ]
      
      for (const [r, c] of neighbors) {
        if (r >= 0 && r < values.length && c >= 0 && c < values[r].length) {
          queue.push([r, c])
        }
      }
    }
    
    // Only create region if it's meaningful size
    if (visited.size < 2) return null
    
    return {
      type,
      address: `${this.colToLetter(minCol)}${minRow + 1}:${this.colToLetter(maxCol)}${maxRow + 1}`,
      startRow: minRow,
      startCol: minCol,
      endRow: maxRow,
      endCol: maxCol,
      confidence: 0.7,
      characteristics: {
        hasFormulas: type === 'calculation'
      }
    }
  }
  
  /**
   * Check if a region is already covered by existing regions
   */
  private static isRegionCovered(regions: SemanticRegion[], newRegion: SemanticRegion): boolean {
    return regions.some(existing => 
      existing.startRow <= newRegion.startRow &&
      existing.endRow >= newRegion.endRow &&
      existing.startCol <= newRegion.startCol &&
      existing.endCol >= newRegion.endCol
    )
  }
  
  /**
   * Merge overlapping regions
   */
  private static mergeOverlappingRegions(regions: SemanticRegion[]): SemanticRegion[] {
    // Sort by area (larger first) and confidence
    regions.sort((a, b) => {
      const areaA = (a.endRow - a.startRow + 1) * (a.endCol - a.startCol + 1)
      const areaB = (b.endRow - b.startRow + 1) * (b.endCol - b.startCol + 1)
      return areaB - areaA || b.confidence - a.confidence
    })
    
    const merged: SemanticRegion[] = []
    const used = new Set<number>()
    
    for (let i = 0; i < regions.length; i++) {
      if (used.has(i)) continue
      
      const current = regions[i]
      merged.push(current)
      used.add(i)
      
      // Don't merge regions of different types
      for (let j = i + 1; j < regions.length; j++) {
        if (used.has(j)) continue
        
        const other = regions[j]
        
        // Check if other is completely contained within current
        if (current.startRow <= other.startRow &&
            current.endRow >= other.endRow &&
            current.startCol <= other.startCol &&
            current.endCol >= other.endCol) {
          used.add(j)
        }
      }
    }
    
    return merged
  }
  
  /**
   * Find non-empty column range
   */
  private static findNonEmptyRange(row: any[]): { start: number, end: number } {
    let start = -1
    let end = -1
    
    for (let i = 0; i < row.length; i++) {
      if (row[i] !== null && row[i] !== '') {
        if (start === -1) start = i
        end = i
      }
    }
    
    return { start, end }
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