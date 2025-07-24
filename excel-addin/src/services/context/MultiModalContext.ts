import { RangeData, ExcelService, ComprehensiveContext } from '../excel/ExcelService'
import { SemanticGridBuilder, LLMContext } from '../representation/SemanticGridBuilder'
import { SpatialSerializer } from '../representation/SpatialSerializer'
import { RegionDetector } from '../semantic/RegionDetector'
import { PatternAnalyzer } from '../semantic/PatternAnalyzer'
import { FormulaAnalyzer } from '../formula/FormulaAnalyzer'
import { GridSerializer } from '../serialization/GridSerializer'
import { FormulaTypeDetector } from '../formula/FormulaTypeDetector'
import { FormulaDescriber } from '../formula/FormulaDescriber'

export type RepresentationMode = 
  | 'spatial'      // ASCII art and grid visualization
  | 'structured'   // JSON-like structured data
  | 'semantic'     // Natural language description
  | 'differential' // Change tracking
  | 'compact'      // Token-optimized
  | 'detailed'     // Full fidelity

export interface QueryClassification {
  primaryIntent: 'analyze' | 'create' | 'modify' | 'validate' | 'explain'
  dataScope: 'cell' | 'range' | 'region' | 'sheet' | 'workbook'
  complexity: 'simple' | 'moderate' | 'complex'
  requiredModes: RepresentationMode[]
  tokenBudget: number
}

export interface MultiModalRepresentation {
  modes: Map<RepresentationMode, string>
  primaryMode: RepresentationMode
  metadata: {
    totalTokens: number
    coverageScore: number
    fidelityScore: number
  }
  context: LLMContext
}

export interface ChangeMap {
  changes: Map<string, CellChange>
  timestamp: Date
  source: string
}

export interface CellChange {
  address: string
  oldValue: any
  newValue: any
  oldFormula?: string
  newFormula?: string
  changeType: 'value' | 'formula' | 'format' | 'structure'
}

export class MultiModalSpreadsheetContext {
  private semanticGridBuilder: SemanticGridBuilder
  private excelService: ExcelService
  private changeHistory: Map<string, CellChange[]>
  
  constructor(excelService: ExcelService) {
    this.excelService = excelService
    this.semanticGridBuilder = new SemanticGridBuilder()
    this.changeHistory = new Map()
  }
  
  /**
   * Build comprehensive multi-modal context
   */
  async buildComprehensiveContext(range: Excel.Range, query?: string): Promise<MultiModalRepresentation> {
    // 1. Get range data
    const rangeData = await this.getRangeData(range)
    
    // 2. Build semantic context
    const llmContext = await this.semanticGridBuilder.buildContext(
      rangeData,
      range.worksheet,
      query
    )
    
    // 3. Classify query to determine optimal representations
    const classification = this.classifyQuery(query, rangeData)
    
    // 4. Build representations based on classification
    const modes = new Map<RepresentationMode, string>()
    
    for (const mode of classification.requiredModes) {
      const representation = await this.buildRepresentation(
        mode,
        rangeData,
        llmContext,
        classification
      )
      modes.set(mode, representation)
    }
    
    // 5. Calculate metadata
    const metadata = this.calculateMetadata(modes, rangeData, llmContext)
    
    return {
      modes,
      primaryMode: classification.requiredModes[0],
      metadata,
      context: llmContext
    }
  }
  
  /**
   * Build optimized context based on query
   */
  async buildOptimizedContext(query: string, range: Excel.Range): Promise<LLMContext> {
    // Quick path for query-specific optimization
    const rangeData = await this.getRangeData(range)
    
    // Let the semantic grid builder handle optimization
    return this.semanticGridBuilder.buildContext(rangeData, range.worksheet, query)
  }
  
  /**
   * Convert range to ASCII art
   */
  toAsciiArt(data: RangeData): string {
    const regions = RegionDetector.detectRegions(data)
    
    let art = '```\n'
    art += this.buildGridVisualization(data, regions)
    art += '```\n\n'
    art += 'Legend:\n'
    art += '  # = Header\n'
    art += '  $ = Input cell\n'
    art += '  = = Formula/Calculation\n'
    art += '  Σ = Total/Summary\n'
    art += '  . = Empty\n'
    art += '  * = Data\n'
    
    return art
  }
  
  /**
   * Convert to structured JSON
   */
  toStructuredJson(data: RangeData): StructuredGrid {
    const regions = RegionDetector.detectRegions(data)
    const patterns = PatternAnalyzer.analyzeFormulaPatterns(data)
    const dependencies = FormulaAnalyzer.buildDependencyGraph(data)
    
    return {
      metadata: {
        range: data.address,
        dimensions: { rows: data.rowCount, cols: data.colCount },
        cellCount: data.rowCount * data.colCount,
        nonEmptyCount: this.countNonEmptyCells(data)
      },
      regions: regions.map(r => ({
        type: r.type,
        bounds: {
          start: { row: r.startRow, col: r.startCol },
          end: { row: r.endRow, col: r.endCol }
        },
        characteristics: r.characteristics
      })),
      patterns: {
        formulas: patterns.map(p => ({
          type: p.type,
          count: p.count,
          example: p.baseFormula
        })),
        data: PatternAnalyzer.analyzeDataPatterns(data)
      },
      dependencies: {
        rootCells: dependencies.rootNodes,
        leafCells: dependencies.leafNodes,
        maxDepth: dependencies.maxDepth,
        circularRefs: dependencies.circularReferences
      }
    }
  }
  
  /**
   * Generate semantic description
   */
  generateSemanticDescription(data: RangeData): string {
    const regions = RegionDetector.detectRegions(data)
    const patterns = PatternAnalyzer.analyzeFormulaPatterns(data)
    const stats = this.calculateStatistics(data)
    
    let description = `This spreadsheet range (${data.address}) contains ${data.rowCount} rows and ${data.colCount} columns.\n\n`
    
    // Describe structure
    if (regions.length > 0) {
      description += 'Structure:\n'
      const regionSummary = new Map<string, number>()
      regions.forEach(r => {
        regionSummary.set(r.type, (regionSummary.get(r.type) || 0) + 1)
      })
      
      for (const [type, count] of regionSummary.entries()) {
        description += `- ${count} ${type} region(s)\n`
      }
      description += '\n'
    }
    
    // Describe data
    if (stats.nonEmpty > 0) {
      description += 'Data characteristics:\n'
      description += `- ${stats.nonEmpty} cells contain data (${(stats.nonEmpty / stats.total * 100).toFixed(1)}% density)\n`
      description += `- ${stats.numeric} numeric values\n`
      description += `- ${stats.text} text values\n`
      description += `- ${stats.formulas} formulas\n`
      
      if (stats.numeric > 0) {
        description += `- Numeric range: ${stats.min} to ${stats.max}\n`
        description += `- Average: ${stats.mean?.toFixed(2)}\n`
      }
      description += '\n'
    }
    
    // Describe patterns
    if (patterns.length > 0) {
      description += 'Formula patterns:\n'
      const patternTypes = new Set(patterns.map(p => p.type))
      for (const type of patternTypes) {
        const count = patterns.filter(p => p.type === type).reduce((sum, p) => sum + p.count, 0)
        description += `- ${type}: ${count} instances\n`
      }
    }
    
    return description
  }
  
  /**
   * Prepare change tracking
   */
  prepareChangeTracking(data: RangeData): ChangeMap {
    const changes = new Map<string, CellChange>()
    
    // Store current state for comparison
    for (let row = 0; row < data.values.length; row++) {
      for (let col = 0; col < data.values[row].length; col++) {
        const address = `${this.colToLetter(col)}${row + 1}`
        const currentState = {
          address,
          oldValue: data.values[row][col],
          newValue: data.values[row][col],
          oldFormula: data.formulas?.[row]?.[col],
          newFormula: data.formulas?.[row]?.[col],
          changeType: 'value' as const
        }
        
        // Store in history
        if (!this.changeHistory.has(address)) {
          this.changeHistory.set(address, [])
        }
        this.changeHistory.get(address)!.push(currentState)
      }
    }
    
    return {
      changes,
      timestamp: new Date(),
      source: 'initial'
    }
  }
  
  /**
   * Select representation mode based on query
   */
  selectRepresentationMode(query: string): RepresentationMode[] {
    const modes: RepresentationMode[] = []
    const lowerQuery = query.toLowerCase()
    
    // Analyze query to determine best representation
    if (/visual|see|show|display/.test(lowerQuery)) {
      modes.push('spatial')
    }
    
    if (/structure|organize|layout/.test(lowerQuery)) {
      modes.push('structured')
    }
    
    if (/explain|describe|what|how/.test(lowerQuery)) {
      modes.push('semantic')
    }
    
    if (/change|modify|update|track/.test(lowerQuery)) {
      modes.push('differential')
    }
    
    if (/formula|calculation|compute/.test(lowerQuery)) {
      modes.push('detailed')
    }
    
    // Default to compact for general queries
    if (modes.length === 0) {
      modes.push('compact')
    }
    
    // Always add compact as secondary for token efficiency
    if (!modes.includes('compact')) {
      modes.push('compact')
    }
    
    return modes
  }
  
  /**
   * Private helper methods
   */
  
  private async getRangeData(range: Excel.Range): Promise<RangeData> {
    await range.load(['values', 'formulas', 'address', 'rowCount', 'columnCount'])
    await range.context.sync()
    
    return {
      values: range.values,
      formulas: range.formulas,
      address: range.address,
      rowCount: range.rowCount,
      colCount: range.columnCount
    }
  }
  
  private classifyQuery(query: string | undefined, data: RangeData): QueryClassification {
    if (!query) {
      return {
        primaryIntent: 'analyze',
        dataScope: 'range',
        complexity: 'simple',
        requiredModes: ['compact', 'semantic'],
        tokenBudget: 2000
      }
    }
    
    const lower = query.toLowerCase()
    
    // Determine intent
    let primaryIntent: QueryClassification['primaryIntent'] = 'analyze'
    if (/create|add|new|insert/.test(lower)) primaryIntent = 'create'
    else if (/change|modify|update|edit/.test(lower)) primaryIntent = 'modify'
    else if (/check|validate|verify/.test(lower)) primaryIntent = 'validate'
    else if (/explain|why|how|what/.test(lower)) primaryIntent = 'explain'
    
    // Determine scope
    let dataScope: QueryClassification['dataScope'] = 'range'
    if (/cell|specific/.test(lower)) dataScope = 'cell'
    else if (/region|area|section/.test(lower)) dataScope = 'region'
    else if (/sheet|entire|all/.test(lower)) dataScope = 'sheet'
    else if (/workbook|file/.test(lower)) dataScope = 'workbook'
    
    // Determine complexity
    const cellCount = data.rowCount * data.colCount
    let complexity: QueryClassification['complexity'] = 'simple'
    if (cellCount > 1000 || /complex|detailed|comprehensive/.test(lower)) {
      complexity = 'complex'
    } else if (cellCount > 100) {
      complexity = 'moderate'
    }
    
    // Determine required modes
    const requiredModes: RepresentationMode[] = []
    
    switch (primaryIntent) {
      case 'create':
        requiredModes.push('structured', 'semantic')
        break
      case 'modify':
        requiredModes.push('differential', 'detailed')
        break
      case 'validate':
        requiredModes.push('detailed', 'structured')
        break
      case 'explain':
        requiredModes.push('semantic', 'spatial')
        break
      default:
        requiredModes.push('compact', 'semantic')
    }
    
    // Determine token budget
    let tokenBudget = 2000
    if (complexity === 'complex') tokenBudget = 4000
    else if (complexity === 'moderate') tokenBudget = 3000
    
    return {
      primaryIntent,
      dataScope,
      complexity,
      requiredModes,
      tokenBudget
    }
  }
  
  private async buildRepresentation(
    mode: RepresentationMode,
    data: RangeData,
    context: LLMContext,
    classification: QueryClassification
  ): Promise<string> {
    switch (mode) {
      case 'spatial':
        // Use GridSerializer for better spatial representation
        const spatialResult = await this.buildGridSerializerRepresentation(data, 'spatial', classification)
        return spatialResult || this.toAsciiArt(data)
        
      case 'structured':
        return JSON.stringify(this.toStructuredJson(data), null, 2)
        
      case 'semantic':
        return this.generateSemanticDescription(data)
        
      case 'differential':
        return this.buildDifferentialView(data)
        
      case 'compact':
        return context.optimizedView
        
      case 'detailed':
        return this.buildDetailedView(data, context)
        
      default:
        return ''
    }
  }
  
  private buildGridVisualization(data: RangeData, regions: any[]): string {
    const maxRows = Math.min(data.rowCount, 20)
    const maxCols = Math.min(data.colCount, 15)
    
    let grid = '   '
    
    // Column headers
    for (let col = 0; col < maxCols; col++) {
      grid += ` ${this.colToLetter(col).padEnd(3)}`
    }
    grid += '\n'
    
    // Rows
    for (let row = 0; row < maxRows; row++) {
      grid += `${(row + 1).toString().padStart(3)}`
      
      for (let col = 0; col < maxCols; col++) {
        const symbol = this.getCellSymbol(row, col, data, regions)
        grid += ` ${symbol}  `
      }
      
      grid += '\n'
    }
    
    if (data.rowCount > maxRows || data.colCount > maxCols) {
      grid += '...\n'
    }
    
    return grid
  }
  
  private getCellSymbol(row: number, col: number, data: RangeData, regions: any[]): string {
    // Check if cell is in a special region
    for (const region of regions) {
      if (row >= region.startRow && row <= region.endRow &&
          col >= region.startCol && col <= region.endCol) {
        switch (region.type) {
          case 'header': return '#'
          case 'total': return 'Σ'
          case 'input': return '$'
          case 'calculation': return '='
        }
      }
    }
    
    // Check cell content
    const value = data.values[row]?.[col]
    const formula = data.formulas?.[row]?.[col]
    
    if (formula) return '='
    if (value === null || value === '') return '.'
    if (typeof value === 'number') return '*'
    if (typeof value === 'string') return '#'
    
    return '?'
  }
  
  private buildDifferentialView(data: RangeData): string {
    let diff = '=== Change Tracking ===\n'
    
    // Show recent changes from history
    const recentChanges: CellChange[] = []
    for (const [address, changes] of this.changeHistory.entries()) {
      if (changes.length > 1) {
        const recent = changes[changes.length - 1]
        const previous = changes[changes.length - 2]
        
        if (recent.newValue !== previous.newValue || recent.newFormula !== previous.newFormula) {
          recentChanges.push({
            address,
            oldValue: previous.newValue,
            newValue: recent.newValue,
            oldFormula: previous.newFormula,
            newFormula: recent.newFormula,
            changeType: recent.newFormula !== previous.newFormula ? 'formula' : 'value'
          })
        }
      }
    }
    
    if (recentChanges.length === 0) {
      diff += 'No recent changes detected.\n'
    } else {
      diff += `${recentChanges.length} changes detected:\n`
      for (const change of recentChanges.slice(0, 10)) {
        diff += `- ${change.address}: `
        if (change.changeType === 'formula') {
          diff += `formula changed from "${change.oldFormula}" to "${change.newFormula}"\n`
        } else {
          diff += `value changed from ${change.oldValue} to ${change.newValue}\n`
        }
      }
    }
    
    return diff
  }
  
  private buildDetailedView(data: RangeData, context: LLMContext): string {
    let detailed = '=== Detailed Spreadsheet Analysis ===\n\n'
    
    // Include all modes for comprehensive view
    detailed += '1. STRUCTURE\n'
    detailed += JSON.stringify(context.structural, null, 2).substring(0, 1000) + '...\n\n'
    
    detailed += '2. SEMANTIC ANALYSIS\n'
    detailed += JSON.stringify(context.semantic, null, 2).substring(0, 1000) + '...\n\n'
    
    detailed += '3. SPATIAL LAYOUT\n'
    detailed += context.spatial + '\n\n'
    
    detailed += '4. KEY FORMULAS\n'
    const formulas = this.extractKeyFormulas(data)
    for (const [cell, formula] of formulas.entries()) {
      detailed += `${cell}: ${formula}\n`
    }
    
    return detailed
  }
  
  private calculateMetadata(
    modes: Map<RepresentationMode, string>,
    data: RangeData,
    context: LLMContext
  ): MultiModalRepresentation['metadata'] {
    let totalTokens = 0
    
    for (const content of modes.values()) {
      totalTokens += Math.ceil(content.length * 0.25) // Rough token estimate
    }
    
    // Coverage score: how much of the data is represented
    const totalCells = data.rowCount * data.colCount
    const representedCells = context.structural.cells.size
    const coverageScore = representedCells / Math.max(1, totalCells)
    
    // Fidelity score: how accurate/detailed the representation is
    let fidelityScore = context.confidence
    if (modes.has('detailed')) fidelityScore += 0.2
    if (modes.has('structured')) fidelityScore += 0.1
    fidelityScore = Math.min(1, fidelityScore)
    
    return {
      totalTokens,
      coverageScore,
      fidelityScore
    }
  }
  
  private countNonEmptyCells(data: RangeData): number {
    let count = 0
    for (const row of data.values) {
      for (const cell of row) {
        if (cell !== null && cell !== '') count++
      }
    }
    return count
  }
  
  private calculateStatistics(data: RangeData): any {
    const stats = {
      total: data.rowCount * data.colCount,
      nonEmpty: 0,
      numeric: 0,
      text: 0,
      formulas: 0,
      min: Infinity,
      max: -Infinity,
      sum: 0,
      mean: null as number | null
    }
    
    const numericValues: number[] = []
    
    for (let row = 0; row < data.values.length; row++) {
      for (let col = 0; col < data.values[row].length; col++) {
        const value = data.values[row][col]
        const formula = data.formulas?.[row]?.[col]
        
        if (formula) stats.formulas++
        
        if (value !== null && value !== '') {
          stats.nonEmpty++
          
          if (typeof value === 'number') {
            stats.numeric++
            numericValues.push(value)
            stats.min = Math.min(stats.min, value)
            stats.max = Math.max(stats.max, value)
            stats.sum += value
          } else if (typeof value === 'string') {
            stats.text++
          }
        }
      }
    }
    
    if (numericValues.length > 0) {
      stats.mean = stats.sum / numericValues.length
    }
    
    return stats
  }
  
  private extractKeyFormulas(data: RangeData): Map<string, string> {
    const keyFormulas = new Map<string, string>()
    
    if (!data.formulas) return keyFormulas
    
    // Extract unique formulas
    const formulaMap = new Map<string, string[]>()
    
    for (let row = 0; row < data.formulas.length; row++) {
      for (let col = 0; col < data.formulas[row].length; col++) {
        const formula = data.formulas[row][col]
        if (formula) {
          const address = `${this.colToLetter(col)}${row + 1}`
          const normalized = formula.replace(/[A-Z]+\d+/g, 'REF')
          
          if (!formulaMap.has(normalized)) {
            formulaMap.set(normalized, [])
          }
          formulaMap.get(normalized)!.push(address)
        }
      }
    }
    
    // Show top 10 most common formulas
    const sorted = Array.from(formulaMap.entries())
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 10)
    
    for (const [formula, cells] of sorted) {
      keyFormulas.set(cells[0], formula)
    }
    
    return keyFormulas
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
  
  /**
   * Build representation using GridSerializer
   */
  private async buildGridSerializerRepresentation(
    data: RangeData,
    mode: RepresentationMode,
    classification: QueryClassification
  ): Promise<string | null> {
    try {
      // Create a mock Excel.Range object for GridSerializer
      const mockRange = {
        address: data.address,
        worksheet: { name: 'Sheet1' }
      } as Excel.Range
      
      // Map representation mode to GridSerializer format
      let format: 'markdown' | 'sparse' | 'compressed' | 'hybrid' = 'hybrid'
      
      switch (mode) {
        case 'spatial':
          format = 'markdown'
          break
        case 'compact':
          format = 'compressed'
          break
        case 'detailed':
          format = 'hybrid'
          break
      }
      
      const result = GridSerializer.toLLMFormat(
        mockRange,
        data.values,
        data.formulas || [],
        {
          maxTokens: classification.tokenBudget,
          format,
          includeFormulas: true,
          semanticRegions: RegionDetector.detectRegions(data)
        }
      )
      
      return result.content
    } catch (error) {
      console.error('GridSerializer error:', error)
      return null
    }
  }
  
  /**
   * Enhance formulas with type detection and descriptions
   */
  private enhanceFormulas(data: RangeData): Map<string, any> {
    const enhancedFormulas = new Map<string, any>()
    
    if (data.formulas) {
      for (let row = 0; row < data.formulas.length; row++) {
        for (let col = 0; col < data.formulas[row].length; col++) {
          const formula = data.formulas[row][col]
          if (formula && formula.startsWith('=')) {
            const cellAddress = `${String.fromCharCode(65 + col)}${row + 1}`
            
            // Get formula type
            const typeInfo = FormulaTypeDetector.detectFormulaType(formula)
            
            // Get formula description
            const description = FormulaDescriber.describeFormula(formula, {
              cellAddress,
              sheetName: 'Sheet1'
            })
            
            enhancedFormulas.set(cellAddress, {
              formula,
              type: typeInfo.type,
              complexity: typeInfo.complexity,
              description: description.summary,
              purpose: description.purpose,
              warnings: description.warnings,
              suggestions: description.suggestions
            })
          }
        }
      }
    }
    
    return enhancedFormulas
  }
}

// Type definitions for structured grid

interface StructuredGrid {
  metadata: {
    range: string
    dimensions: { rows: number; cols: number }
    cellCount: number
    nonEmptyCount: number
  }
  regions: Array<{
    type: string
    bounds: {
      start: { row: number; col: number }
      end: { row: number; col: number }
    }
    characteristics?: any
  }>
  patterns: {
    formulas: Array<{
      type: string
      count: number
      example?: string
    }>
    data: any[]
  }
  dependencies: {
    rootCells: string[]
    leafCells: string[]
    maxDepth: number
    circularRefs: string[][]
  }
}