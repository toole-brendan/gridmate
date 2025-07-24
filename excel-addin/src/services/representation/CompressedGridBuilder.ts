import { RangeData } from '../excel/ExcelService'
import { SemanticRegion } from '../semantic/RegionDetector'
import { FormulaPattern } from '../semantic/PatternAnalyzer'

export interface TokenOptimizationOptions {
  maxTokens: number
  prioritizeFormulas: boolean
  includeEmptyCells: boolean
  compressionLevel: 'minimal' | 'moderate' | 'aggressive'
  targetAudience: 'llm' | 'human' | 'both'
}

export interface OptimizedRepresentation {
  content: string
  tokenCount: number
  compressionRatio: number
  metadata: {
    originalCells: number
    representedCells: number
    droppedCells: number
    compressionTechniques: string[]
  }
}

export class CompressedGridBuilder {
  private readonly TOKEN_PER_CHAR_RATIO = 0.25 // Approximation: 1 token ≈ 4 characters
  
  /**
   * Build an optimized representation of spreadsheet data
   */
  static buildOptimizedRepresentation(
    data: RangeData,
    regions: SemanticRegion[],
    formulaPatterns: FormulaPattern[],
    options: TokenOptimizationOptions
  ): OptimizedRepresentation {
    const builder = new CompressedGridBuilder()
    return builder.build(data, regions, formulaPatterns, options)
  }
  
  private build(
    data: RangeData,
    regions: SemanticRegion[],
    formulaPatterns: FormulaPattern[],
    options: TokenOptimizationOptions
  ): OptimizedRepresentation {
    const startTime = Date.now()
    const originalCells = data.rowCount * data.colCount
    
    // Start with the most appropriate representation based on options
    let representation = ''
    const techniques: string[] = []
    
    // 1. Add context header
    representation += this.buildHeader(data, regions, formulaPatterns)
    techniques.push('context-header')
    
    // 2. Choose primary representation strategy
    if (options.compressionLevel === 'aggressive') {
      representation += this.buildHighlyCompressedView(data, regions, formulaPatterns, options)
      techniques.push('aggressive-compression')
    } else if (options.compressionLevel === 'moderate') {
      representation += this.buildModeratelyCompressedView(data, regions, formulaPatterns, options)
      techniques.push('moderate-compression')
    } else {
      representation += this.buildMinimallyCompressedView(data, regions, formulaPatterns, options)
      techniques.push('minimal-compression')
    }
    
    // 3. Apply token-based truncation if needed
    const initialTokenCount = this.estimateTokens(representation)
    if (initialTokenCount > options.maxTokens) {
      representation = this.applyTokenTruncation(representation, options.maxTokens)
      techniques.push('token-truncation')
    }
    
    // 4. Calculate metrics
    const finalTokenCount = this.estimateTokens(representation)
    const representedCells = this.countRepresentedCells(representation, data)
    
    return {
      content: representation,
      tokenCount: finalTokenCount,
      compressionRatio: originalCells / Math.max(1, finalTokenCount),
      metadata: {
        originalCells,
        representedCells,
        droppedCells: originalCells - representedCells,
        compressionTechniques: techniques
      }
    }
  }
  
  private buildHeader(
    data: RangeData,
    regions: SemanticRegion[],
    formulaPatterns: FormulaPattern[]
  ): string {
    let header = `=== Spreadsheet Context ===\n`
    header += `Range: ${data.address} (${data.rowCount}×${data.colCount})\n`
    
    // Add region summary
    if (regions.length > 0) {
      const regionTypes = new Map<string, number>()
      regions.forEach(r => {
        regionTypes.set(r.type, (regionTypes.get(r.type) || 0) + 1)
      })
      
      header += `Regions: ${Array.from(regionTypes.entries())
        .map(([type, count]) => `${type}(${count})`)
        .join(', ')}\n`
    }
    
    // Add formula pattern summary
    if (formulaPatterns.length > 0) {
      header += `Formula patterns: ${formulaPatterns.length} patterns found\n`
    }
    
    header += `\n`
    return header
  }
  
  private buildHighlyCompressedView(
    data: RangeData,
    regions: SemanticRegion[],
    formulaPatterns: FormulaPattern[],
    options: TokenOptimizationOptions
  ): string {
    let content = ''
    
    // 1. Focus on key regions only
    const keyRegions = this.prioritizeRegions(regions)
    
    for (const region of keyRegions) {
      content += this.compressRegion(region, data, 'aggressive')
    }
    
    // 2. Summarize formula patterns instead of listing all
    if (formulaPatterns.length > 0 && options.prioritizeFormulas) {
      content += '\n--- Formula Patterns ---\n'
      content += this.summarizeFormulaPatterns(formulaPatterns)
    }
    
    // 3. Add data statistics instead of raw values
    content += '\n--- Data Summary ---\n'
    content += this.generateDataStatistics(data)
    
    return content
  }
  
  private buildModeratelyCompressedView(
    data: RangeData,
    regions: SemanticRegion[],
    formulaPatterns: FormulaPattern[],
    options: TokenOptimizationOptions
  ): string {
    let content = ''
    
    // 1. Include important regions with some detail
    const importantRegions = regions.filter(r => 
      r.type === 'header' || r.type === 'total' || r.confidence > 0.8
    )
    
    for (const region of importantRegions) {
      content += this.compressRegion(region, data, 'moderate')
    }
    
    // 2. Include sample data from data regions
    const dataRegions = regions.filter(r => r.type === 'data')
    if (dataRegions.length > 0) {
      content += '\n--- Data Samples ---\n'
      for (const region of dataRegions.slice(0, 3)) { // Limit to 3 regions
        content += this.sampleRegionData(region, data)
      }
    }
    
    // 3. Include key formulas
    if (options.prioritizeFormulas && formulaPatterns.length > 0) {
      content += '\n--- Key Formulas ---\n'
      content += this.extractKeyFormulas(formulaPatterns, data)
    }
    
    return content
  }
  
  private buildMinimallyCompressedView(
    data: RangeData,
    regions: SemanticRegion[],
    formulaPatterns: FormulaPattern[],
    options: TokenOptimizationOptions
  ): string {
    let content = ''
    
    // Use a simplified grid representation
    content += this.buildSimplifiedGrid(data, options)
    
    // Add formula information if prioritized
    if (options.prioritizeFormulas && data.formulas) {
      content += '\n--- Formulas ---\n'
      content += this.listImportantFormulas(data)
    }
    
    return content
  }
  
  private compressRegion(region: SemanticRegion, data: RangeData, level: string): string {
    let content = `\n[${region.type.toUpperCase()} Region: ${region.address}]\n`
    
    if (level === 'aggressive') {
      // Just summarize
      content += `Contains ${(region.endRow - region.startRow + 1) * (region.endCol - region.startCol + 1)} cells\n`
      
      // Add key characteristics
      if (region.characteristics) {
        const chars = Object.entries(region.characteristics)
          .filter(([_, v]) => v === true)
          .map(([k, _]) => k)
        if (chars.length > 0) {
          content += `Characteristics: ${chars.join(', ')}\n`
        }
      }
    } else {
      // Include some actual data
      const sample = this.extractRegionData(region, data)
      if (sample.length > 0) {
        content += this.formatCompactTable(sample, level === 'moderate' ? 5 : 10)
      }
    }
    
    return content
  }
  
  private extractRegionData(region: SemanticRegion, data: RangeData): any[][] {
    const result: any[][] = []
    
    for (let row = region.startRow; row <= region.endRow && row < data.values.length; row++) {
      const rowData: any[] = []
      for (let col = region.startCol; col <= region.endCol && col < data.values[row].length; col++) {
        rowData.push(data.values[row][col])
      }
      result.push(rowData)
    }
    
    return result
  }
  
  private formatCompactTable(data: any[][], maxRows: number): string {
    if (data.length === 0) return ''
    
    let table = ''
    const rowsToShow = Math.min(data.length, maxRows)
    
    for (let i = 0; i < rowsToShow; i++) {
      const row = data[i].map(cell => this.formatCellCompact(cell)).join(' | ')
      table += `${row}\n`
    }
    
    if (data.length > maxRows) {
      table += `... (${data.length - maxRows} more rows)\n`
    }
    
    return table
  }
  
  private formatCellCompact(value: any): string {
    if (value === null || value === undefined || value === '') return '·'
    
    if (typeof value === 'number') {
      // Compact number formatting
      if (Math.abs(value) >= 1000000) {
        return (value / 1000000).toFixed(1) + 'M'
      } else if (Math.abs(value) >= 1000) {
        return (value / 1000).toFixed(1) + 'K'
      } else if (value % 1 === 0) {
        return value.toString()
      } else {
        return value.toFixed(2)
      }
    }
    
    if (typeof value === 'string') {
      // Truncate long strings
      return value.length > 10 ? value.substring(0, 8) + '..' : value
    }
    
    return String(value).substring(0, 10)
  }
  
  private summarizeFormulaPatterns(patterns: FormulaPattern[]): string {
    let summary = ''
    
    // Group by type
    const byType = new Map<string, FormulaPattern[]>()
    patterns.forEach(p => {
      if (!byType.has(p.type)) {
        byType.set(p.type, [])
      }
      byType.get(p.type)!.push(p)
    })
    
    for (const [type, typePatterns] of byType.entries()) {
      const totalInstances = typePatterns.reduce((sum, p) => sum + p.count, 0)
      summary += `- ${type}: ${typePatterns.length} patterns, ${totalInstances} instances\n`
      
      // Show top pattern example
      const topPattern = typePatterns.sort((a, b) => b.count - a.count)[0]
      if (topPattern.baseFormula) {
        summary += `  Example: ${topPattern.baseFormula}\n`
      }
    }
    
    return summary
  }
  
  private generateDataStatistics(data: RangeData): string {
    let stats = ''
    
    // Count different types of cells
    let numbers = 0, text = 0, formulas = 0, empty = 0
    
    for (let row = 0; row < data.values.length; row++) {
      for (let col = 0; col < data.values[row].length; col++) {
        const value = data.values[row][col]
        const formula = data.formulas?.[row]?.[col]
        
        if (formula) {
          formulas++
        } else if (value === null || value === '') {
          empty++
        } else if (typeof value === 'number') {
          numbers++
        } else {
          text++
        }
      }
    }
    
    const total = data.rowCount * data.colCount
    stats += `Cell composition: ${numbers} numbers, ${text} text, ${formulas} formulas, ${empty} empty\n`
    stats += `Data density: ${((total - empty) / total * 100).toFixed(1)}%\n`
    
    // Add numeric statistics if we have numbers
    if (numbers > 0) {
      const numericValues: number[] = []
      for (const row of data.values) {
        for (const value of row) {
          if (typeof value === 'number') {
            numericValues.push(value)
          }
        }
      }
      
      if (numericValues.length > 0) {
        const sum = numericValues.reduce((a, b) => a + b, 0)
        const mean = sum / numericValues.length
        const min = Math.min(...numericValues)
        const max = Math.max(...numericValues)
        
        stats += `Numeric range: [${this.formatCellCompact(min)} to ${this.formatCellCompact(max)}]\n`
        stats += `Average: ${this.formatCellCompact(mean)}\n`
      }
    }
    
    return stats
  }
  
  private sampleRegionData(region: SemanticRegion, data: RangeData): string {
    let sample = `Region ${region.address}:\n`
    
    // Get corner samples
    const corners = [
      { row: region.startRow, col: region.startCol, label: 'TL' },
      { row: region.startRow, col: region.endCol, label: 'TR' },
      { row: region.endRow, col: region.startCol, label: 'BL' },
      { row: region.endRow, col: region.endCol, label: 'BR' }
    ]
    
    for (const corner of corners) {
      if (corner.row < data.values.length && corner.col < data.values[corner.row].length) {
        const value = data.values[corner.row][corner.col]
        sample += `  ${corner.label}: ${this.formatCellCompact(value)}\n`
      }
    }
    
    return sample
  }
  
  private extractKeyFormulas(patterns: FormulaPattern[], data: RangeData): string {
    let formulas = ''
    
    // Show one example from each pattern type
    const shown = new Set<string>()
    
    for (const pattern of patterns) {
      if (!shown.has(pattern.type) && pattern.baseFormula) {
        shown.add(pattern.type)
        formulas += `${pattern.type}: ${pattern.baseFormula} (${pattern.count} similar)\n`
      }
      
      if (shown.size >= 5) break // Limit to 5 examples
    }
    
    return formulas
  }
  
  private buildSimplifiedGrid(data: RangeData, options: TokenOptimizationOptions): string {
    let grid = '--- Data Grid ---\n'
    
    // Find non-empty bounds
    const bounds = this.findDataBounds(data.values)
    if (!bounds) {
      return grid + 'Empty range\n'
    }
    
    // Build compact grid representation
    const maxRows = options.compressionLevel === 'minimal' ? 20 : 10
    const maxCols = options.compressionLevel === 'minimal' ? 15 : 10
    
    const rowsToShow = Math.min(bounds.maxRow - bounds.minRow + 1, maxRows)
    const colsToShow = Math.min(bounds.maxCol - bounds.minCol + 1, maxCols)
    
    // Column headers
    grid += '     '
    for (let c = 0; c < colsToShow; c++) {
      grid += `${this.colToLetter(bounds.minCol + c).padEnd(8)}`
    }
    grid += '\n'
    
    // Data rows
    for (let r = 0; r < rowsToShow; r++) {
      const rowNum = bounds.minRow + r + 1
      grid += `${rowNum.toString().padEnd(4)} `
      
      for (let c = 0; c < colsToShow; c++) {
        const value = data.values[bounds.minRow + r]?.[bounds.minCol + c]
        const formula = data.formulas?.[bounds.minRow + r]?.[bounds.minCol + c]
        
        let cell = ''
        if (formula && options.prioritizeFormulas) {
          cell = '=' + (formula.length > 6 ? formula.substring(0, 4) + '..' : formula)
        } else {
          cell = this.formatCellCompact(value)
        }
        
        grid += cell.padEnd(8)
      }
      
      if (bounds.maxCol - bounds.minCol + 1 > colsToShow) {
        grid += ` ... (${bounds.maxCol - bounds.minCol + 1 - colsToShow} more cols)`
      }
      
      grid += '\n'
    }
    
    if (bounds.maxRow - bounds.minRow + 1 > rowsToShow) {
      grid += `... (${bounds.maxRow - bounds.minRow + 1 - rowsToShow} more rows)\n`
    }
    
    return grid
  }
  
  private listImportantFormulas(data: RangeData): string {
    if (!data.formulas) return ''
    
    let formulas = ''
    const formulaMap = new Map<string, string[]>()
    
    // Collect unique formulas with their locations
    for (let row = 0; row < data.formulas.length; row++) {
      for (let col = 0; col < data.formulas[row].length; col++) {
        const formula = data.formulas[row][col]
        if (formula) {
          const cell = `${this.colToLetter(col)}${row + 1}`
          const normalized = this.normalizeFormula(formula)
          
          if (!formulaMap.has(normalized)) {
            formulaMap.set(normalized, [])
          }
          formulaMap.get(normalized)!.push(cell)
        }
      }
    }
    
    // Show top formulas by frequency
    const sorted = Array.from(formulaMap.entries())
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 10)
    
    for (const [formula, cells] of sorted) {
      if (cells.length > 1) {
        formulas += `${cells[0]}: ${formula} (and ${cells.length - 1} similar)\n`
      } else {
        formulas += `${cells[0]}: ${formula}\n`
      }
    }
    
    return formulas
  }
  
  private normalizeFormula(formula: string): string {
    // Basic normalization - could be enhanced
    return formula.replace(/[A-Z]+\d+/g, 'REF')
  }
  
  private prioritizeRegions(regions: SemanticRegion[]): SemanticRegion[] {
    // Prioritize by type and confidence
    return regions
      .sort((a, b) => {
        // Type priority
        const typePriority: Record<string, number> = {
          'total': 3,
          'header': 2,
          'calculation': 1,
          'data': 0
        }
        
        const aPriority = typePriority[a.type] || 0
        const bPriority = typePriority[b.type] || 0
        
        if (aPriority !== bPriority) {
          return bPriority - aPriority
        }
        
        // Then by confidence
        return b.confidence - a.confidence
      })
      .slice(0, 5) // Top 5 regions
  }
  
  private findDataBounds(values: any[][]): { minRow: number; maxRow: number; minCol: number; maxCol: number } | null {
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
  
  private estimateTokens(text: string): number {
    return Math.ceil(text.length * this.TOKEN_PER_CHAR_RATIO)
  }
  
  private applyTokenTruncation(text: string, maxTokens: number): string {
    const targetLength = Math.floor(maxTokens / this.TOKEN_PER_CHAR_RATIO)
    
    if (text.length <= targetLength) return text
    
    // Smart truncation - try to preserve structure
    const lines = text.split('\n')
    let result = ''
    let currentLength = 0
    
    for (const line of lines) {
      if (currentLength + line.length + 1 > targetLength - 50) { // Reserve 50 chars for truncation message
        result += '\n... (content truncated for token limit)'
        break
      }
      result += line + '\n'
      currentLength += line.length + 1
    }
    
    return result
  }
  
  private countRepresentedCells(representation: string, data: RangeData): number {
    // Estimate based on cell references in the representation
    const cellRefs = representation.match(/[A-Z]+\d+/g) || []
    const uniqueCells = new Set(cellRefs)
    
    // Also count cells in described regions
    const regionMatches = representation.match(/(\d+)×(\d+)/g) || []
    let regionCells = 0
    for (const match of regionMatches) {
      const [rows, cols] = match.split('×').map(n => parseInt(n))
      regionCells += rows * cols
    }
    
    return Math.max(uniqueCells.size, regionCells)
  }
  
  private colToLetter(col: number): string {
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