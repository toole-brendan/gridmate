import { ExcelService, RangeData } from '../excel/ExcelService'
import { ExcelChangeTracker } from '../excel/ExcelChangeTracker'
import { WriteOperationQueue } from '../excel/WriteOperationQueue'
import { MultiModalSpreadsheetContext } from '../context/MultiModalContext'
import { SemanticGridBuilder, LLMContext } from '../representation/SemanticGridBuilder'

export interface SpreadsheetState {
  currentRange: string
  lastSync: Date
  pendingOperations: PendingOperation[]
  context: LLMContext | null
  isDirty: boolean
  validationState: ValidationState
}

export interface PendingOperation {
  id: string
  type: 'write' | 'formula' | 'format' | 'structure'
  target: string
  payload: any
  status: 'pending' | 'executing' | 'completed' | 'failed'
  timestamp: Date
  retryCount: number
}

export interface ValidationState {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
  lastValidated: Date
}

export interface ValidationError {
  type: 'circular_reference' | 'invalid_formula' | 'type_mismatch' | 'missing_reference'
  cell: string
  message: string
  severity: 'error' | 'critical'
}

export interface ValidationWarning {
  type: 'performance' | 'complexity' | 'external_reference' | 'volatile_function'
  cell: string
  message: string
}

export interface LLMResponse {
  intent: 'modify' | 'analyze' | 'validate' | 'explain'
  operations: Operation[]
  explanation?: string
  confidence: number
}

export interface Operation {
  type: 'write_range' | 'apply_formula' | 'format_range' | 'create_chart'
  params: any
  validation?: OperationValidation
}

export interface OperationValidation {
  preConditions: string[]
  postConditions: string[]
  risks: string[]
}

export interface ExecutionResult {
  success: boolean
  operationsExecuted: number
  operationsFailed: number
  errors: Error[]
  finalState: SpreadsheetState
}

export class SpreadsheetStateMachine {
  private excelService: ExcelService
  private changeTracker: ExcelChangeTracker
  private writeQueue: WriteOperationQueue
  private multiModalContext: MultiModalSpreadsheetContext
  private semanticBuilder: SemanticGridBuilder
  
  private state: SpreadsheetState
  private stateHistory: SpreadsheetState[]
  private maxHistorySize = 50
  
  constructor(
    excelService: ExcelService,
    changeTracker: ExcelChangeTracker,
    writeQueue: WriteOperationQueue
  ) {
    this.excelService = excelService
    this.changeTracker = changeTracker
    this.writeQueue = writeQueue
    this.multiModalContext = new MultiModalSpreadsheetContext(excelService)
    this.semanticBuilder = new SemanticGridBuilder()
    
    this.state = this.createInitialState()
    this.stateHistory = []
  }
  
  /**
   * Sync current state with Excel and LLM
   */
  async syncWithLLM(userQuery: string): Promise<LLMResponse> {
    // 1. Update state from Excel
    await this.updateStateFromExcel()
    
    // 2. Build optimized context for the query
    const context = await this.multiModalContext.buildOptimizedContext(
      userQuery,
      await this.getCurrentRange()
    )
    
    // 3. Update state with new context
    this.state.context = context
    this.state.lastSync = new Date()
    
    // 4. Validate current state
    await this.validateState()
    
    // 5. Process query and determine response
    return this.processLLMQuery(userQuery, context)
  }
  
  /**
   * Identify cells relevant to a query
   */
  async identifyRelevantCells(query: string): Promise<string[]> {
    if (!this.state.context) {
      await this.updateStateFromExcel()
    }
    
    const relevantCells: Set<string> = new Set()
    
    // 1. Extract cell references from query
    const cellRefs = this.extractCellReferences(query)
    cellRefs.forEach(ref => relevantCells.add(ref))
    
    // 2. Find semantically related cells
    if (this.state.context) {
      const semanticCells = this.findSemanticMatches(query, this.state.context)
      semanticCells.forEach(cell => relevantCells.add(cell))
    }
    
    // 3. Include dependent cells
    const dependencies = await this.expandWithDependencies(Array.from(relevantCells))
    dependencies.forEach(cell => relevantCells.add(cell))
    
    return Array.from(relevantCells)
  }
  
  /**
   * Validate an edit before execution
   */
  async validateEdit(edit: Operation): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: []
    }
    
    // 1. Check basic validity
    if (!this.isValidOperation(edit)) {
      result.isValid = false
      result.errors.push({
        type: 'invalid_operation',
        message: 'Operation format is invalid'
      })
      return result
    }
    
    // 2. Check for circular references
    if (edit.type === 'apply_formula') {
      const circularCheck = await this.checkCircularReference(edit)
      if (circularCheck.hasCircular) {
        result.isValid = false
        result.errors.push({
          type: 'circular_reference',
          message: `Circular reference detected: ${circularCheck.cycle.join(' -> ')}`
        })
      }
    }
    
    // 3. Check type compatibility
    const typeCheck = await this.checkTypeCompatibility(edit)
    if (!typeCheck.compatible) {
      result.warnings.push({
        type: 'type_mismatch',
        message: typeCheck.message
      })
    }
    
    // 4. Performance checks
    const perfCheck = this.checkPerformanceImpact(edit)
    if (perfCheck.impact === 'high') {
      result.warnings.push({
        type: 'performance',
        message: 'This operation may impact spreadsheet performance'
      })
    }
    
    // 5. Generate suggestions
    result.suggestions = this.generateSuggestions(edit, result)
    
    return result
  }
  
  /**
   * Execute a set of changes
   */
  async executeChanges(changes: Operation[]): Promise<ExecutionResult> {
    const result: ExecutionResult = {
      success: true,
      operationsExecuted: 0,
      operationsFailed: 0,
      errors: [],
      finalState: this.state
    }
    
    // Save current state for rollback
    this.pushStateToHistory()
    
    try {
      // 1. Validate all operations first
      for (const change of changes) {
        const validation = await this.validateEdit(change)
        if (!validation.isValid) {
          throw new Error(`Validation failed: ${validation.errors[0]?.message}`)
        }
      }
      
      // 2. Queue operations
      const operations = changes.map(change => this.convertToQueueOperation(change))
      
      // 3. Execute through write queue
      for (const op of operations) {
        try {
          await this.writeQueue.queueOperation(op)
          result.operationsExecuted++
          
          // Update pending operations in state
          this.state.pendingOperations.push({
            id: op.requestId,
            type: this.getOperationType(op),
            target: op.tool === 'write_range' ? op.input.range : op.input.range,
            payload: op.input,
            status: 'executing',
            timestamp: new Date(),
            retryCount: 0
          })
        } catch (error) {
          result.operationsFailed++
          result.errors.push(error as Error)
          result.success = false
        }
      }
      
      // 4. Wait for operations to complete
      await this.waitForOperations(operations.map(op => op.requestId))
      
      // 5. Update state
      await this.updateStateFromExcel()
      this.state.isDirty = true
      
    } catch (error) {
      // Rollback on failure
      this.rollbackState()
      result.success = false
      result.errors.push(error as Error)
    }
    
    result.finalState = this.state
    return result
  }
  
  /**
   * Get current spreadsheet state
   */
  getState(): SpreadsheetState {
    return { ...this.state }
  }
  
  /**
   * Reset state machine
   */
  reset(): void {
    this.state = this.createInitialState()
    this.stateHistory = []
  }
  
  /**
   * Private helper methods
   */
  
  private createInitialState(): SpreadsheetState {
    return {
      currentRange: 'A1',
      lastSync: new Date(),
      pendingOperations: [],
      context: null,
      isDirty: false,
      validationState: {
        isValid: true,
        errors: [],
        warnings: [],
        lastValidated: new Date()
      }
    }
  }
  
  private async updateStateFromExcel(): Promise<void> {
    try {
      const context = await this.excelService.getContext()
      this.state.currentRange = context.selectedRange
      
      // Get comprehensive context
      const comprehensiveContext = await this.excelService.getComprehensiveContext({
        includeAllSheets: false,
        includeFormulas: true
      })
      
      // Build semantic context
      if (comprehensiveContext.selectedData) {
        const semanticContext = await this.semanticBuilder.buildContext(
          comprehensiveContext.selectedData
        )
        this.state.context = semanticContext
      }
      
      // Update dirty flag based on change tracker
      this.state.isDirty = this.changeTracker.hasUnsavedChanges()
      
    } catch (error) {
      console.error('Failed to update state from Excel:', error)
    }
  }
  
  private async getCurrentRange(): Promise<Excel.Range> {
    return Excel.run(async context => {
      const range = context.workbook.getSelectedRange()
      range.load(['address', 'values', 'formulas', 'rowCount', 'columnCount'])
      await context.sync()
      return range
    })
  }
  
  private async validateState(): Promise<void> {
    const validation: ValidationState = {
      isValid: true,
      errors: [],
      warnings: [],
      lastValidated: new Date()
    }
    
    // Run various validation checks
    if (this.state.context) {
      // Check for circular references
      if (this.state.context.structural.dependencies.circularReferences.length > 0) {
        validation.isValid = false
        for (const cycle of this.state.context.structural.dependencies.circularReferences) {
          validation.errors.push({
            type: 'circular_reference',
            cell: cycle[0],
            message: `Circular reference: ${cycle.join(' -> ')}`,
            severity: 'error'
          })
        }
      }
      
      // Check for complex formulas
      const complexFormulas = this.state.context.structural.patterns.formula
        .filter(p => p.count > 50)
      
      for (const pattern of complexFormulas) {
        validation.warnings.push({
          type: 'complexity',
          cell: pattern.cells[0],
          message: `Complex formula pattern with ${pattern.count} instances`
        })
      }
    }
    
    this.state.validationState = validation
  }
  
  private processLLMQuery(query: string, context: LLMContext): LLMResponse {
    // Determine intent from query and context
    const intent = context.queryType === 'modification' ? 'modify' :
                  context.queryType === 'validation' ? 'validate' :
                  context.queryType === 'analysis' ? 'analyze' : 'explain'
    
    // Generate operations based on intent
    const operations: Operation[] = []
    
    // This would normally call the actual LLM API
    // For now, return a mock response
    return {
      intent,
      operations,
      explanation: `Processed query: ${query}`,
      confidence: context.confidence
    }
  }
  
  private extractCellReferences(query: string): string[] {
    const refs: string[] = []
    const cellPattern = /\b[A-Z]+\d+\b/g
    const matches = query.match(cellPattern)
    
    if (matches) {
      refs.push(...matches)
    }
    
    return refs
  }
  
  private findSemanticMatches(query: string, context: LLMContext): string[] {
    const matches: string[] = []
    const queryLower = query.toLowerCase()
    
    // Search in key metrics
    for (const metric of context.semantic.keyMetrics) {
      if (queryLower.includes(metric.name.toLowerCase())) {
        matches.push(metric.location)
      }
    }
    
    // Search in cell data
    for (const [address, cellData] of context.structural.cells.entries()) {
      if (cellData.value && 
          typeof cellData.value === 'string' && 
          queryLower.includes(cellData.value.toLowerCase())) {
        matches.push(address)
      }
    }
    
    return matches
  }
  
  private async expandWithDependencies(cells: string[]): Promise<string[]> {
    const expanded = new Set(cells)
    
    if (this.state.context) {
      for (const cell of cells) {
        const node = this.state.context.structural.dependencies.nodes.get(cell)
        if (node) {
          node.dependencies.forEach(dep => expanded.add(dep))
          node.dependents.forEach(dep => expanded.add(dep))
        }
      }
    }
    
    return Array.from(expanded)
  }
  
  private isValidOperation(operation: Operation): boolean {
    const validTypes = ['write_range', 'apply_formula', 'format_range', 'create_chart']
    return validTypes.includes(operation.type) && operation.params != null
  }
  
  private async checkCircularReference(operation: Operation): Promise<{
    hasCircular: boolean
    cycle: string[]
  }> {
    // Simple mock implementation
    return { hasCircular: false, cycle: [] }
  }
  
  private async checkTypeCompatibility(operation: Operation): Promise<{
    compatible: boolean
    message: string
  }> {
    // Simple mock implementation
    return { compatible: true, message: '' }
  }
  
  private checkPerformanceImpact(operation: Operation): {
    impact: 'low' | 'medium' | 'high'
  } {
    // Simple heuristic based on operation type and size
    if (operation.type === 'write_range' && operation.params.values?.length > 1000) {
      return { impact: 'high' }
    }
    
    return { impact: 'low' }
  }
  
  private generateSuggestions(operation: Operation, validation: ValidationResult): string[] {
    const suggestions: string[] = []
    
    if (validation.warnings.some(w => w.type === 'performance')) {
      suggestions.push('Consider breaking this operation into smaller chunks')
    }
    
    if (validation.warnings.some(w => w.type === 'type_mismatch')) {
      suggestions.push('Verify data types match expected format')
    }
    
    return suggestions
  }
  
  private convertToQueueOperation(operation: Operation): any {
    return {
      requestId: `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tool: operation.type,
      input: operation.params,
      priority: 1,
      timestamp: Date.now()
    }
  }
  
  private getOperationType(operation: any): PendingOperation['type'] {
    const typeMap: Record<string, PendingOperation['type']> = {
      'write_range': 'write',
      'apply_formula': 'formula',
      'format_range': 'format',
      'create_chart': 'structure'
    }
    
    return typeMap[operation.tool] || 'write'
  }
  
  private async waitForOperations(operationIds: string[]): Promise<void> {
    // Wait for all operations to complete
    // This would monitor the write queue status
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  private pushStateToHistory(): void {
    this.stateHistory.push(JSON.parse(JSON.stringify(this.state)))
    
    if (this.stateHistory.length > this.maxHistorySize) {
      this.stateHistory.shift()
    }
  }
  
  private rollbackState(): void {
    const previousState = this.stateHistory.pop()
    if (previousState) {
      this.state = previousState
    }
  }
}

// Type definitions for validation

interface ValidationResult {
  isValid: boolean
  errors: Array<{
    type: string
    message: string
  }>
  warnings: Array<{
    type: string
    message: string
  }>
  suggestions: string[]
}