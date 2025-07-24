import { RangeData, ExcelService } from '../excel/ExcelService'
import { RegionDetector, SemanticRegion } from '../semantic/RegionDetector'
import { PatternAnalyzer, FormulaPattern, DataPattern } from '../semantic/PatternAnalyzer'
import { FormulaAnalyzer, FormulaDependencyGraph } from '../formula/FormulaAnalyzer'
import { FormulaTypeDetector } from '../formula/FormulaTypeDetector'
import { FormulaDescriber } from '../formula/FormulaDescriber'
import { SpatialSerializer } from './SpatialSerializer'
import { CompressedGridBuilder, TokenOptimizationOptions } from './CompressedGridBuilder'
import { GridSerializer } from '../serialization/GridSerializer'

export interface LLMContext {
  query?: string
  queryType?: 'analysis' | 'modification' | 'creation' | 'validation'
  spatial: string
  semantic: SemanticStructure
  structural: StructuralRepresentation
  differential?: DifferentialContext
  optimizedView: string
  tokenCount: number
  confidence: number
}

export interface SemanticStructure {
  purpose: string
  regions: SemanticRegion[]
  dataFlow: DataFlow[]
  keyMetrics: KeyMetric[]
  relationships: CellRelationship[]
}

export interface StructuralRepresentation {
  cells: Map<string, CellData>
  dependencies: FormulaDependencyGraph
  patterns: {
    formula: FormulaPattern[]
    data: DataPattern[]
  }
  hierarchy: HierarchicalStructure
}

export interface DifferentialContext {
  tracked: Set<string>
  pendingChanges: ChangeBuffer[]
  history: ChangeHistory[]
}

export interface DataFlow {
  from: string
  to: string
  type: 'input' | 'calculation' | 'output'
  description: string
}

export interface KeyMetric {
  name: string
  location: string
  value: any
  formula?: string
  importance: 'high' | 'medium' | 'low'
}

export interface CellRelationship {
  source: string
  target: string
  relationship: 'depends-on' | 'influences' | 'validates' | 'aggregates'
  strength: number
}

export interface CellData {
  address: string
  value: any
  formula?: string
  type: 'input' | 'calculation' | 'output' | 'label' | 'header'
  format?: string
  validation?: string
}

export interface HierarchicalStructure {
  levels: StructureLevel[]
  rootElements: string[]
  leafElements: string[]
}

export interface StructureLevel {
  level: number
  elements: string[]
  type: 'section' | 'subsection' | 'detail'
}

export interface ChangeBuffer {
  cellAddress: string
  oldValue: any
  newValue: any
  timestamp: Date
  source: 'user' | 'ai' | 'formula'
}

export interface ChangeHistory {
  id: string
  changes: ChangeBuffer[]
  timestamp: Date
  description: string
}

export class SemanticGridBuilder {
  private regionDetector: RegionDetector
  private patternAnalyzer: PatternAnalyzer
  private formulaAnalyzer: FormulaAnalyzer
  private spatialSerializer: SpatialSerializer
  private compressedBuilder: CompressedGridBuilder
  
  constructor() {
    this.regionDetector = new RegionDetector()
    this.patternAnalyzer = new PatternAnalyzer()
    this.formulaAnalyzer = new FormulaAnalyzer()
    this.spatialSerializer = new SpatialSerializer()
    this.compressedBuilder = new CompressedGridBuilder()
  }
  
  /**
   * Build comprehensive LLM context from spreadsheet data
   */
  async buildContext(
    data: RangeData,
    worksheet?: Excel.Worksheet,
    query?: string
  ): Promise<LLMContext> {
    // 1. Detect semantic regions
    const regions = RegionDetector.detectRegions(data)
    
    // 2. Analyze patterns
    const formulaPatterns = PatternAnalyzer.analyzeFormulaPatterns(data)
    const dataPatterns = PatternAnalyzer.analyzeDataPatterns(data)
    
    // 3. Build dependency graph
    const dependencies = FormulaAnalyzer.buildDependencyGraph(data)
    
    // 4. Detect data flows and relationships
    const dataFlow = this.detectDataFlow(data, regions, dependencies)
    const relationships = this.detectRelationships(dependencies)
    
    // 5. Identify key metrics
    const keyMetrics = this.identifyKeyMetrics(data, regions, formulaPatterns)
    
    // 6. Build hierarchical structure
    const hierarchy = this.buildHierarchy(regions, dependencies)
    
    // 7. Determine query type and context needs
    const queryType = this.classifyQuery(query)
    const contextNeeds = this.determineContextNeeds(queryType, query)
    
    // 8. Build spatial representation
    const spatial = this.buildSpatialRepresentation(data, regions, contextNeeds)
    
    // 9. Build optimized view based on token constraints
    const optimizationOptions: TokenOptimizationOptions = {
      maxTokens: contextNeeds.maxTokens || 2000,
      prioritizeFormulas: contextNeeds.prioritizeFormulas || false,
      includeEmptyCells: false,
      compressionLevel: contextNeeds.compressionLevel || 'moderate',
      targetAudience: 'llm'
    }
    
    const optimizedRep = CompressedGridBuilder.buildOptimizedRepresentation(
      data,
      regions,
      formulaPatterns,
      optimizationOptions
    )
    
    // 10. Determine overall purpose
    const purpose = this.determinePurpose(regions, formulaPatterns, dataPatterns)
    
    // 11. Calculate confidence
    const confidence = this.calculateConfidence(regions, formulaPatterns)
    
    return {
      query,
      queryType,
      spatial,
      semantic: {
        purpose,
        regions,
        dataFlow,
        keyMetrics,
        relationships
      },
      structural: {
        cells: this.buildCellMap(data, regions),
        dependencies,
        patterns: {
          formula: formulaPatterns,
          data: dataPatterns
        },
        hierarchy
      },
      optimizedView: optimizedRep.content,
      tokenCount: optimizedRep.tokenCount,
      confidence
    }
  }
  
  /**
   * Detect data flow patterns
   */
  private detectDataFlow(
    data: RangeData,
    regions: SemanticRegion[],
    dependencies: FormulaDependencyGraph
  ): DataFlow[] {
    const flows: DataFlow[] = []
    
    // Analyze flow between regions
    for (const region of regions) {
      if (region.type === 'input') {
        // Find calculations that depend on this input region
        const dependentCalcs = this.findDependentRegions(region, regions, dependencies)
        for (const calc of dependentCalcs) {
          flows.push({
            from: region.address,
            to: calc.address,
            type: 'calculation',
            description: `Input data flows to ${calc.type} calculations`
          })
        }
      } else if (region.type === 'calculation') {
        // Find outputs that depend on this calculation
        const dependentOutputs = this.findDependentRegions(region, regions, dependencies)
        for (const output of dependentOutputs) {
          if (output.type === 'total' || output.type === 'output') {
            flows.push({
              from: region.address,
              to: output.address,
              type: 'output',
              description: `Calculations flow to ${output.type}`
            })
          }
        }
      }
    }
    
    return flows
  }
  
  /**
   * Find regions that depend on a given region
   */
  private findDependentRegions(
    sourceRegion: SemanticRegion,
    allRegions: SemanticRegion[],
    dependencies: FormulaDependencyGraph
  ): SemanticRegion[] {
    const dependent: SemanticRegion[] = []
    
    // Get all cells in source region
    const sourceCells = this.getCellsInRegion(sourceRegion)
    
    // Find all cells that depend on source cells
    const dependentCells = new Set<string>()
    for (const sourceCell of sourceCells) {
      const node = dependencies.nodes.get(sourceCell)
      if (node) {
        node.dependents.forEach(dep => dependentCells.add(dep))
      }
    }
    
    // Find regions containing dependent cells
    for (const region of allRegions) {
      if (region === sourceRegion) continue
      
      const regionCells = this.getCellsInRegion(region)
      if (regionCells.some(cell => dependentCells.has(cell))) {
        dependent.push(region)
      }
    }
    
    return dependent
  }
  
  /**
   * Get all cell addresses in a region
   */
  private getCellsInRegion(region: SemanticRegion): string[] {
    const cells: string[] = []
    
    for (let row = region.startRow; row <= region.endRow; row++) {
      for (let col = region.startCol; col <= region.endCol; col++) {
        cells.push(`${this.colToLetter(col)}${row + 1}`)
      }
    }
    
    return cells
  }
  
  /**
   * Detect relationships between cells
   */
  private detectRelationships(dependencies: FormulaDependencyGraph): CellRelationship[] {
    const relationships: CellRelationship[] = []
    
    for (const [cell, node] of dependencies.nodes.entries()) {
      // Direct dependencies
      for (const dep of node.dependencies) {
        relationships.push({
          source: cell,
          target: dep,
          relationship: 'depends-on',
          strength: 1.0
        })
      }
      
      // Analyze formula to determine relationship type
      if (node.formula) {
        const relationshipType = this.analyzeFormulaRelationship(node.formula)
        if (relationshipType !== 'depends-on') {
          for (const dep of node.dependencies) {
            relationships.push({
              source: cell,
              target: dep,
              relationship: relationshipType,
              strength: 0.8
            })
          }
        }
      }
    }
    
    return relationships
  }
  
  /**
   * Analyze formula to determine relationship type
   */
  private analyzeFormulaRelationship(formula: string): 'depends-on' | 'influences' | 'validates' | 'aggregates' {
    const upperFormula = formula.toUpperCase()
    
    if (/SUM|AVERAGE|COUNT|MAX|MIN/.test(upperFormula)) {
      return 'aggregates'
    }
    
    if (/IF|IFS|AND|OR|NOT/.test(upperFormula)) {
      return 'validates'
    }
    
    if (/VLOOKUP|HLOOKUP|INDEX|MATCH/.test(upperFormula)) {
      return 'influences'
    }
    
    return 'depends-on'
  }
  
  /**
   * Identify key metrics in the spreadsheet
   */
  private identifyKeyMetrics(
    data: RangeData,
    regions: SemanticRegion[],
    formulaPatterns: FormulaPattern[]
  ): KeyMetric[] {
    const metrics: KeyMetric[] = []
    
    // Look for total/summary regions
    const totalRegions = regions.filter(r => r.type === 'total')
    for (const region of totalRegions) {
      const cells = this.getCellsInRegion(region)
      for (const cell of cells) {
        const value = this.getCellValue(cell, data)
        if (value !== null && value !== '') {
          metrics.push({
            name: `Total at ${cell}`,
            location: cell,
            value,
            formula: this.getCellFormula(cell, data),
            importance: 'high'
          })
        }
      }
    }
    
    // Look for cells with many dependents (influential cells)
    const dependencies = FormulaAnalyzer.buildDependencyGraph(data)
    for (const [cell, node] of dependencies.nodes.entries()) {
      if (node.dependents.length > 5) {
        const value = this.getCellValue(cell, data)
        metrics.push({
          name: `Key input at ${cell}`,
          location: cell,
          value,
          formula: node.formula,
          importance: node.dependents.length > 10 ? 'high' : 'medium'
        })
      }
    }
    
    return metrics
  }
  
  /**
   * Get cell value from data
   */
  private getCellValue(cellAddress: string, data: RangeData): any {
    const parsed = this.parseCellAddress(cellAddress)
    if (!parsed) return null
    
    const { row, col } = parsed
    return data.values[row]?.[col]
  }
  
  /**
   * Get cell formula from data
   */
  private getCellFormula(cellAddress: string, data: RangeData): string | undefined {
    if (!data.formulas) return undefined
    
    const parsed = this.parseCellAddress(cellAddress)
    if (!parsed) return undefined
    
    const { row, col } = parsed
    return data.formulas[row]?.[col]
  }
  
  /**
   * Parse cell address to row/col indices
   */
  private parseCellAddress(cellAddress: string): { row: number; col: number } | null {
    const match = cellAddress.match(/^([A-Z]+)(\d+)$/)
    if (!match) return null
    
    const col = this.letterToColumn(match[1]) - 1
    const row = parseInt(match[2]) - 1
    
    return { row, col }
  }
  
  /**
   * Build hierarchical structure
   */
  private buildHierarchy(
    regions: SemanticRegion[],
    dependencies: FormulaDependencyGraph
  ): HierarchicalStructure {
    const levels: StructureLevel[] = []
    
    // Level 0: Root nodes (inputs with no dependencies)
    const rootElements = Array.from(dependencies.rootNodes)
    if (rootElements.length > 0) {
      levels.push({
        level: 0,
        elements: rootElements,
        type: 'section'
      })
    }
    
    // Intermediate levels based on dependency depth
    for (let level = 1; level <= dependencies.maxDepth; level++) {
      const elements: string[] = []
      for (const [cell, node] of dependencies.nodes.entries()) {
        if (node.level === level) {
          elements.push(cell)
        }
      }
      
      if (elements.length > 0) {
        levels.push({
          level,
          elements,
          type: level < 3 ? 'subsection' : 'detail'
        })
      }
    }
    
    return {
      levels,
      rootElements: dependencies.rootNodes,
      leafElements: dependencies.leafNodes
    }
  }
  
  /**
   * Classify the type of query
   */
  private classifyQuery(query?: string): LLMContext['queryType'] {
    if (!query) return 'analysis'
    
    const lowerQuery = query.toLowerCase()
    
    if (/create|add|insert|new/.test(lowerQuery)) {
      return 'creation'
    }
    
    if (/change|modify|update|edit|fix/.test(lowerQuery)) {
      return 'modification'
    }
    
    if (/check|validate|verify|test/.test(lowerQuery)) {
      return 'validation'
    }
    
    return 'analysis'
  }
  
  /**
   * Determine context needs based on query
   */
  private determineContextNeeds(queryType: LLMContext['queryType'], query?: string): {
    maxTokens: number
    prioritizeFormulas: boolean
    compressionLevel: 'minimal' | 'moderate' | 'aggressive'
    focusAreas: string[]
  } {
    const needs = {
      maxTokens: 2000,
      prioritizeFormulas: false,
      compressionLevel: 'moderate' as const,
      focusAreas: [] as string[]
    }
    
    switch (queryType) {
      case 'creation':
        needs.maxTokens = 1500
        needs.compressionLevel = 'aggressive'
        needs.focusAreas = ['structure', 'patterns']
        break
        
      case 'modification':
        needs.maxTokens = 2500
        needs.prioritizeFormulas = true
        needs.compressionLevel = 'moderate'
        needs.focusAreas = ['formulas', 'dependencies']
        break
        
      case 'validation':
        needs.maxTokens = 3000
        needs.prioritizeFormulas = true
        needs.compressionLevel = 'minimal'
        needs.focusAreas = ['formulas', 'values', 'relationships']
        break
        
      case 'analysis':
      default:
        needs.maxTokens = 2000
        needs.compressionLevel = 'moderate'
        needs.focusAreas = ['patterns', 'metrics']
        break
    }
    
    // Adjust based on specific query keywords
    if (query) {
      if (/formula|calculation|compute/.test(query.toLowerCase())) {
        needs.prioritizeFormulas = true
      }
      
      if (/all|complete|full|entire/.test(query.toLowerCase())) {
        needs.compressionLevel = 'minimal'
        needs.maxTokens = 4000
      }
    }
    
    return needs
  }
  
  /**
   * Build spatial representation based on context needs
   */
  private buildSpatialRepresentation(
    data: RangeData,
    regions: SemanticRegion[],
    contextNeeds: any
  ): string {
    // Build ASCII art representation for spatial understanding
    let spatial = '=== Spatial Layout ===\n'
    
    // Create a simplified grid view
    const bounds = this.findBounds(regions)
    if (!bounds) {
      return spatial + 'Empty spreadsheet\n'
    }
    
    // Build grid with region annotations
    const grid: string[][] = []
    const rows = bounds.maxRow - bounds.minRow + 1
    const cols = bounds.maxCol - bounds.minCol + 1
    
    // Initialize grid
    for (let r = 0; r < rows; r++) {
      grid[r] = []
      for (let c = 0; c < cols; c++) {
        grid[r][c] = '·'
      }
    }
    
    // Mark regions
    for (const region of regions) {
      const symbol = this.getRegionSymbol(region.type)
      for (let r = region.startRow; r <= region.endRow; r++) {
        for (let c = region.startCol; c <= region.endCol; c++) {
          const gridRow = r - bounds.minRow
          const gridCol = c - bounds.minCol
          if (gridRow >= 0 && gridRow < rows && gridCol >= 0 && gridCol < cols) {
            grid[gridRow][gridCol] = symbol
          }
        }
      }
    }
    
    // Convert to string
    spatial += '   '
    for (let c = 0; c < Math.min(cols, 20); c++) {
      spatial += ` ${this.colToLetter(bounds.minCol + c)}`
    }
    spatial += '\n'
    
    for (let r = 0; r < Math.min(rows, 20); r++) {
      spatial += `${(bounds.minRow + r + 1).toString().padStart(3)} `
      for (let c = 0; c < Math.min(cols, 20); c++) {
        spatial += ` ${grid[r][c]}`
      }
      if (cols > 20) spatial += ' ...'
      spatial += '\n'
    }
    
    if (rows > 20) {
      spatial += '   ...\n'
    }
    
    // Add legend
    spatial += '\nLegend: '
    spatial += 'H=Header, I=Input, C=Calculation, T=Total, D=Data\n'
    
    return spatial
  }
  
  /**
   * Get symbol for region type
   */
  private getRegionSymbol(type: string): string {
    const symbols: Record<string, string> = {
      'header': 'H',
      'input': 'I',
      'calculation': 'C',
      'total': 'T',
      'data': 'D',
      'label': 'L',
      'empty': '·'
    }
    return symbols[type] || '?'
  }
  
  /**
   * Find bounds of all regions
   */
  private findBounds(regions: SemanticRegion[]): { minRow: number; maxRow: number; minCol: number; maxCol: number } | null {
    if (regions.length === 0) return null
    
    let minRow = Infinity
    let maxRow = -Infinity
    let minCol = Infinity
    let maxCol = -Infinity
    
    for (const region of regions) {
      minRow = Math.min(minRow, region.startRow)
      maxRow = Math.max(maxRow, region.endRow)
      minCol = Math.min(minCol, region.startCol)
      maxCol = Math.max(maxCol, region.endCol)
    }
    
    return { minRow, maxRow, minCol, maxCol }
  }
  
  /**
   * Build cell map with semantic information
   */
  private buildCellMap(data: RangeData, regions: SemanticRegion[]): Map<string, CellData> {
    const cellMap = new Map<string, CellData>()
    
    // First, classify all cells based on regions
    const cellTypes = new Map<string, string>()
    
    for (const region of regions) {
      for (let row = region.startRow; row <= region.endRow; row++) {
        for (let col = region.startCol; col <= region.endCol; col++) {
          const address = `${this.colToLetter(col)}${row + 1}`
          cellTypes.set(address, region.type)
        }
      }
    }
    
    // Build cell data
    for (let row = 0; row < data.values.length; row++) {
      for (let col = 0; col < data.values[row].length; col++) {
        const address = `${this.colToLetter(col)}${row + 1}`
        const value = data.values[row][col]
        const formula = data.formulas?.[row]?.[col]
        
        if (value !== null || formula) {
          cellMap.set(address, {
            address,
            value,
            formula,
            type: this.determineCellType(cellTypes.get(address), value, formula)
          })
        }
      }
    }
    
    return cellMap
  }
  
  /**
   * Determine cell type
   */
  private determineCellType(regionType: string | undefined, value: any, formula?: string): CellData['type'] {
    if (regionType === 'header') return 'header'
    if (regionType === 'label') return 'label'
    
    if (formula) {
      if (/SUM|AVERAGE|COUNT/.test(formula.toUpperCase())) {
        return 'output'
      }
      return 'calculation'
    }
    
    if (typeof value === 'number') {
      return 'input'
    }
    
    if (typeof value === 'string' && value.trim() !== '') {
      return 'label'
    }
    
    return 'input'
  }
  
  /**
   * Determine overall purpose of the spreadsheet
   */
  private determinePurpose(
    regions: SemanticRegion[],
    formulaPatterns: FormulaPattern[],
    dataPatterns: DataPattern[]
  ): string {
    // Analyze regions, formulas, and patterns to determine purpose
    const regionTypes = regions.map(r => r.type)
    const hasCalculations = regionTypes.includes('calculation')
    const hasTotals = regionTypes.includes('total')
    const hasInputs = regionTypes.includes('input')
    
    // Check formula types
    const formulaTypes = new Set(formulaPatterns.map(p => p.type))
    const hasAggregation = formulaTypes.has('aggregation')
    const hasLookups = formulaTypes.has('lookup')
    
    // Determine purpose based on characteristics
    if (hasInputs && hasCalculations && hasTotals) {
      if (hasAggregation) {
        return 'financial_model'
      }
      return 'calculation_worksheet'
    }
    
    if (hasLookups) {
      return 'reference_table'
    }
    
    if (dataPatterns.some(p => p.type === 'series' || p.type === 'growth')) {
      return 'time_series_analysis'
    }
    
    if (regionTypes.filter(t => t === 'data').length > 3) {
      return 'data_table'
    }
    
    return 'general_spreadsheet'
  }
  
  /**
   * Calculate confidence in the analysis
   */
  private calculateConfidence(
    regions: SemanticRegion[],
    formulaPatterns: FormulaPattern[]
  ): number {
    let confidence = 0.5 // Base confidence
    
    // More regions with high confidence increase overall confidence
    const avgRegionConfidence = regions.reduce((sum, r) => sum + r.confidence, 0) / Math.max(1, regions.length)
    confidence += avgRegionConfidence * 0.3
    
    // More formula patterns increase confidence
    if (formulaPatterns.length > 5) {
      confidence += 0.1
    }
    
    // Consistent patterns increase confidence
    const patternCounts = formulaPatterns.map(p => p.count)
    const avgPatternCount = patternCounts.reduce((a, b) => a + b, 0) / Math.max(1, patternCounts.length)
    if (avgPatternCount > 3) {
      confidence += 0.1
    }
    
    return Math.min(1, confidence)
  }
  
  /**
   * Helper methods
   */
  
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
  
  private letterToColumn(letter: string): number {
    let column = 0
    for (let i = 0; i < letter.length; i++) {
      column = column * 26 + (letter.charCodeAt(i) - 65 + 1)
    }
    return column
  }
}