import { ExcelService, RangeData } from '../excel/ExcelService'
import { MultiModalSpreadsheetContext } from '../context/MultiModalContext'
import { GridSerializer } from '../serialization/GridSerializer'
import { FormulaTypeDetector } from '../formula/FormulaTypeDetector'
import { FormulaDescriber } from '../formula/FormulaDescriber'
import { SemanticGridBuilder } from '../representation/SemanticGridBuilder'
import { SpreadsheetStateMachine } from '../state/SpreadsheetStateMachine'
import { ExcelChangeTracker } from '../excel/ExcelChangeTracker'
import { WriteOperationQueue } from '../excel/WriteOperationQueue'

/**
 * SpreadsheetRepresentationService integrates all the new representation components
 * This is the main entry point for the enhanced spreadsheet representation system
 */
export class SpreadsheetRepresentationService {
  private excelService: ExcelService
  private multiModalContext: MultiModalSpreadsheetContext
  private stateMachine: SpreadsheetStateMachine
  private isInitialized = false

  constructor() {
    this.excelService = new ExcelService()
    this.multiModalContext = new MultiModalSpreadsheetContext(this.excelService)
    
    // Initialize state machine with required services
    const changeTracker = new ExcelChangeTracker()
    const writeQueue = new WriteOperationQueue(this.excelService)
    this.stateMachine = new SpreadsheetStateMachine(
      this.excelService,
      changeTracker,
      writeQueue
    )
  }

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return
    
    try {
      await Excel.run(async (context) => {
        // Ensure Excel is ready
        await context.sync()
        this.isInitialized = true
      })
    } catch (error) {
      console.error('Failed to initialize SpreadsheetRepresentationService:', error)
      throw error
    }
  }

  /**
   * Get optimized representation for a query
   */
  async getOptimizedRepresentation(query: string, range?: Excel.Range): Promise<{
    representation: string
    metadata: {
      mode: string
      tokenCount: number
      confidence: number
      formulaInsights?: any[]
    }
  }> {
    await this.initialize()
    
    // Get the range to analyze
    const targetRange = range || await this.excelService.getSelectedRange()
    
    // Build multi-modal representation
    const multiModalRep = await this.multiModalContext.buildOptimizedContext(query, targetRange)
    
    // Get range data for formula analysis
    const rangeData = await this.excelService.getRangeData(targetRange)
    
    // Analyze formulas if present
    const formulaInsights = await this.analyzeFormulas(rangeData)
    
    // Extract named ranges context
    const namedRanges = await this.excelService.extractNamedRangeContext()
    
    // Build final representation
    const representation = this.buildFinalRepresentation(
      multiModalRep,
      formulaInsights,
      namedRanges
    )
    
    return {
      representation: representation.content,
      metadata: {
        mode: representation.mode,
        tokenCount: representation.tokenCount,
        confidence: multiModalRep.confidence,
        formulaInsights: formulaInsights.length > 0 ? formulaInsights : undefined
      }
    }
  }

  /**
   * Analyze formulas in the range
   */
  private async analyzeFormulas(rangeData: RangeData): Promise<any[]> {
    const insights: any[] = []
    
    if (!rangeData.formulas) return insights
    
    // Extract formula dependencies
    const mockRange = { address: rangeData.address } as Excel.Range
    const dependencies = await this.excelService.extractFormulaDependencies(mockRange)
    
    // Analyze each formula
    for (let row = 0; row < rangeData.formulas.length; row++) {
      for (let col = 0; col < rangeData.formulas[row].length; col++) {
        const formula = rangeData.formulas[row][col]
        if (formula && formula.startsWith('=')) {
          const cellAddress = this.getCellAddress(row, col, rangeData.address)
          
          // Detect formula type
          const typeInfo = FormulaTypeDetector.detectFormulaType(formula)
          
          // Get formula description
          const description = FormulaDescriber.describeFormula(formula, {
            cellAddress,
            sheetName: 'Sheet1'
          })
          
          // Get dependencies for this cell
          const cellDeps = dependencies.get(cellAddress) || []
          
          insights.push({
            cell: cellAddress,
            formula,
            type: typeInfo.type,
            complexity: typeInfo.complexity,
            description: description.summary,
            purpose: description.purpose,
            dependencies: cellDeps,
            warnings: description.warnings,
            suggestions: description.suggestions
          })
        }
      }
    }
    
    return insights
  }

  /**
   * Build final representation combining all components
   */
  private buildFinalRepresentation(
    multiModalRep: any,
    formulaInsights: any[],
    namedRanges: Map<string, any>
  ): { content: string; mode: string; tokenCount: number } {
    let content = ''
    
    // Add spatial view
    if (multiModalRep.spatial) {
      content += '## Spreadsheet Structure\n\n'
      content += multiModalRep.spatial + '\n\n'
    }
    
    // Add semantic summary
    if (multiModalRep.semantic) {
      content += '## Summary\n\n'
      content += multiModalRep.semantic.purpose + '\n\n'
      
      if (multiModalRep.semantic.keyMetrics?.length > 0) {
        content += '### Key Metrics\n'
        multiModalRep.semantic.keyMetrics.forEach((metric: any) => {
          content += `- ${metric.name}: ${metric.value} (${metric.location})\n`
        })
        content += '\n'
      }
    }
    
    // Add formula insights
    if (formulaInsights.length > 0) {
      content += '## Formula Analysis\n\n'
      
      // Group by type
      const formulasByType = new Map<string, any[]>()
      formulaInsights.forEach(insight => {
        if (!formulasByType.has(insight.type)) {
          formulasByType.set(insight.type, [])
        }
        formulasByType.get(insight.type)!.push(insight)
      })
      
      formulasByType.forEach((formulas, type) => {
        content += `### ${type.charAt(0).toUpperCase() + type.slice(1)} Formulas\n`
        formulas.forEach(f => {
          content += `- **${f.cell}**: ${f.description}\n`
          if (f.warnings?.length > 0) {
            content += `  ⚠️ ${f.warnings.join(', ')}\n`
          }
        })
        content += '\n'
      })
    }
    
    // Add named ranges
    if (namedRanges.size > 0) {
      content += '## Named Ranges\n\n'
      namedRanges.forEach((info, name) => {
        content += `- **${name}**: ${info.address}`
        if (info.usage.length > 0) {
          content += ` (used in ${info.usage.length} cells)`
        }
        content += '\n'
      })
    }
    
    // Estimate tokens
    const tokenCount = GridSerializer.estimateTokenCount(content)
    
    return {
      content,
      mode: 'enhanced_multi_modal',
      tokenCount
    }
  }

  /**
   * Get cell address from row/col indices
   */
  private getCellAddress(row: number, col: number, rangeAddress: string): string {
    // Simple implementation - can be enhanced
    const colLetter = String.fromCharCode(65 + col)
    return `${colLetter}${row + 1}`
  }

  /**
   * Process LLM response and apply edits
   */
  async processLLMResponse(response: any): Promise<{
    success: boolean
    appliedEdits: number
    errors: string[]
  }> {
    await this.initialize()
    
    const errors: string[] = []
    let appliedEdits = 0
    
    try {
      // Use state machine to sync and validate
      const syncResult = await this.stateMachine.syncWithLLM(JSON.stringify(response))
      
      if (syncResult.operations) {
        for (const operation of syncResult.operations) {
          try {
            // Apply operation through state machine
            await this.stateMachine.executeChanges([{
              id: `op_${Date.now()}_${appliedEdits}`,
              type: operation.type as any,
              target: operation.target,
              value: operation.value,
              timestamp: new Date()
            }])
            
            appliedEdits++
          } catch (error) {
            errors.push(`Failed to apply ${operation.type} to ${operation.target}: ${error}`)
          }
        }
      }
      
      return {
        success: errors.length === 0,
        appliedEdits,
        errors
      }
    } catch (error) {
      errors.push(`Failed to process LLM response: ${error}`)
      return {
        success: false,
        appliedEdits,
        errors
      }
    }
  }

  /**
   * Get semantic analysis of current range
   */
  async getSemanticAnalysis(range?: Excel.Range): Promise<any> {
    await this.initialize()
    
    const targetRange = range || await this.excelService.getSelectedRange()
    const rangeData = await this.excelService.analyzeRangeDataWithSemantics(targetRange)
    
    return {
      regions: rangeData.semanticRegions,
      summary: `Found ${rangeData.semanticRegions?.length || 0} semantic regions`,
      rangeInfo: {
        address: rangeData.address,
        rows: rangeData.rowCount,
        cols: rangeData.colCount,
        nonEmpty: rangeData.values.flat().filter(v => v !== null && v !== '').length
      }
    }
  }
}