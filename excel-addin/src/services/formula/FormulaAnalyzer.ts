import { FormulaParser, ParsedFormula, FormulaDependency } from './FormulaParser'
import { RangeData } from '../excel/ExcelService'

export interface FormulaComplexity {
  score: number
  level: 'simple' | 'moderate' | 'complex' | 'very-complex'
  factors: {
    depth: number
    functionCount: number
    uniqueFunctions: number
    referenceCount: number
    conditionalCount: number
    lookupCount: number
    nestedFunctions: number
  }
  recommendations?: string[]
}

export interface FormulaDependencyGraph {
  nodes: Map<string, {
    formula: string
    dependencies: string[]
    dependents: string[]
    level: number // Distance from root nodes
  }>
  rootNodes: string[] // Cells with no dependencies
  leafNodes: string[] // Cells with no dependents
  circularReferences: string[][]
  maxDepth: number
}

export interface FormulaValidation {
  isValid: boolean
  errors: Array<{
    type: 'syntax' | 'reference' | 'circular' | 'type-mismatch' | 'missing-function'
    cell: string
    message: string
    suggestion?: string
  }>
  warnings: Array<{
    type: 'complexity' | 'volatile' | 'array-formula' | 'external-reference'
    cell: string
    message: string
  }>
}

export class FormulaAnalyzer {
  /**
   * Analyze formula complexity
   */
  static analyzeComplexity(formula: string): FormulaComplexity {
    const parsed = FormulaParser.parseFormula(formula)
    
    const factors = {
      depth: this.calculateDepth(parsed),
      functionCount: this.countFunctions(parsed),
      uniqueFunctions: this.countUniqueFunctions(parsed),
      referenceCount: this.countReferences(parsed),
      conditionalCount: this.countConditionals(parsed),
      lookupCount: this.countLookups(parsed),
      nestedFunctions: this.countNestedFunctions(parsed)
    }
    
    // Calculate complexity score
    const score = this.calculateComplexityScore(factors)
    const level = this.getComplexityLevel(score)
    const recommendations = this.getComplexityRecommendations(factors, level)
    
    return {
      score,
      level,
      factors,
      recommendations
    }
  }
  
  /**
   * Build dependency graph for formulas
   */
  static buildDependencyGraph(data: RangeData): FormulaDependencyGraph {
    const nodes = new Map<string, {
      formula: string
      dependencies: string[]
      dependents: string[]
      level: number
    }>()
    
    // First pass: collect all formulas and their dependencies
    if (data.formulas) {
      for (let row = 0; row < data.formulas.length; row++) {
        for (let col = 0; col < data.formulas[row].length; col++) {
          const formula = data.formulas[row][col]
          if (formula) {
            const cellAddress = `${this.colToLetter(col)}${row + 1}`
            const dependencies = FormulaParser.extractReferences(formula)
            
            nodes.set(cellAddress, {
              formula,
              dependencies,
              dependents: [],
              level: -1
            })
          }
        }
      }
    }
    
    // Second pass: build dependents relationships
    for (const [cell, node] of nodes.entries()) {
      for (const dep of node.dependencies) {
        const depNode = nodes.get(dep)
        if (depNode) {
          depNode.dependents.push(cell)
        }
      }
    }
    
    // Find root and leaf nodes
    const rootNodes: string[] = []
    const leafNodes: string[] = []
    
    for (const [cell, node] of nodes.entries()) {
      if (node.dependencies.length === 0) {
        rootNodes.push(cell)
        node.level = 0
      }
      if (node.dependents.length === 0) {
        leafNodes.push(cell)
      }
    }
    
    // Calculate levels (BFS from root nodes)
    const queue = [...rootNodes]
    let maxDepth = 0
    
    while (queue.length > 0) {
      const current = queue.shift()!
      const currentNode = nodes.get(current)!
      
      for (const dependent of currentNode.dependents) {
        const depNode = nodes.get(dependent)!
        if (depNode.level === -1 || depNode.level > currentNode.level + 1) {
          depNode.level = currentNode.level + 1
          maxDepth = Math.max(maxDepth, depNode.level)
          queue.push(dependent)
        }
      }
    }
    
    // Detect circular references
    const circularReferences = this.detectCircularReferences(nodes)
    
    return {
      nodes,
      rootNodes,
      leafNodes,
      circularReferences,
      maxDepth
    }
  }
  
  /**
   * Validate formulas in a range
   */
  static validateFormulas(data: RangeData): FormulaValidation {
    const errors: FormulaValidation['errors'] = []
    const warnings: FormulaValidation['warnings'] = []
    
    if (!data.formulas) {
      return { isValid: true, errors, warnings }
    }
    
    // Build dependency graph to check for circular references
    const depGraph = this.buildDependencyGraph(data)
    
    // Check each formula
    for (let row = 0; row < data.formulas.length; row++) {
      for (let col = 0; col < data.formulas[row].length; col++) {
        const formula = data.formulas[row][col]
        if (!formula) continue
        
        const cellAddress = `${this.colToLetter(col)}${row + 1}`
        
        // Parse formula to check syntax
        const parsed = FormulaParser.parseFormula(formula)
        if (parsed.type === 'error') {
          errors.push({
            type: 'syntax',
            cell: cellAddress,
            message: parsed.error || 'Invalid formula syntax'
          })
          continue
        }
        
        // Check for circular references
        const isCircular = depGraph.circularReferences.some(cycle => 
          cycle.includes(cellAddress)
        )
        if (isCircular) {
          errors.push({
            type: 'circular',
            cell: cellAddress,
            message: 'Formula contains circular reference',
            suggestion: 'Remove circular dependency or use iterative calculation'
          })
        }
        
        // Check complexity
        const complexity = this.analyzeComplexity(formula)
        if (complexity.level === 'very-complex') {
          warnings.push({
            type: 'complexity',
            cell: cellAddress,
            message: `Formula is very complex (score: ${complexity.score})`
          })
        }
        
        // Check for volatile functions
        if (this.hasVolatileFunctions(parsed)) {
          warnings.push({
            type: 'volatile',
            cell: cellAddress,
            message: 'Formula contains volatile functions that recalculate frequently'
          })
        }
        
        // Check for external references
        const refs = FormulaParser.extractReferences(formula)
        const hasExternal = refs.some(ref => ref.includes('[') || ref.includes(']'))
        if (hasExternal) {
          warnings.push({
            type: 'external-reference',
            cell: cellAddress,
            message: 'Formula references external workbook'
          })
        }
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }
  
  /**
   * Detect formula types in data
   */
  static detectFormulaTypes(data: RangeData): Map<string, string[]> {
    const typeMap = new Map<string, string[]>()
    
    if (!data.formulas) return typeMap
    
    for (let row = 0; row < data.formulas.length; row++) {
      for (let col = 0; col < data.formulas[row].length; col++) {
        const formula = data.formulas[row][col]
        if (!formula) continue
        
        const cellAddress = `${this.colToLetter(col)}${row + 1}`
        const types = this.classifyFormula(formula)
        
        for (const type of types) {
          if (!typeMap.has(type)) {
            typeMap.set(type, [])
          }
          typeMap.get(type)!.push(cellAddress)
        }
      }
    }
    
    return typeMap
  }
  
  /**
   * Calculate depth of formula tree
   */
  private static calculateDepth(node: ParsedFormula): number {
    if (node.type === 'constant' || node.type === 'reference') {
      return 1
    }
    
    let maxDepth = 0
    
    if (node.type === 'function' && node.arguments) {
      for (const arg of node.arguments) {
        maxDepth = Math.max(maxDepth, this.calculateDepth(arg))
      }
    }
    
    if (node.type === 'operator' && node.operands) {
      for (const operand of node.operands) {
        maxDepth = Math.max(maxDepth, this.calculateDepth(operand))
      }
    }
    
    return maxDepth + 1
  }
  
  /**
   * Count total functions in formula
   */
  private static countFunctions(node: ParsedFormula): number {
    let count = 0
    
    if (node.type === 'function') {
      count = 1
      if (node.arguments) {
        for (const arg of node.arguments) {
          count += this.countFunctions(arg)
        }
      }
    }
    
    if (node.type === 'operator' && node.operands) {
      for (const operand of node.operands) {
        count += this.countFunctions(operand)
      }
    }
    
    return count
  }
  
  /**
   * Count unique functions
   */
  private static countUniqueFunctions(node: ParsedFormula): number {
    const functions = new Set<string>()
    this.collectFunctions(node, functions)
    return functions.size
  }
  
  private static collectFunctions(node: ParsedFormula, functions: Set<string>): void {
    if (node.type === 'function' && node.function) {
      functions.add(node.function)
      if (node.arguments) {
        for (const arg of node.arguments) {
          this.collectFunctions(arg, functions)
        }
      }
    }
    
    if (node.type === 'operator' && node.operands) {
      for (const operand of node.operands) {
        this.collectFunctions(operand, functions)
      }
    }
  }
  
  /**
   * Count references
   */
  private static countReferences(node: ParsedFormula): number {
    let count = 0
    
    if (node.type === 'reference') {
      count = 1
    }
    
    if (node.type === 'function' && node.arguments) {
      for (const arg of node.arguments) {
        count += this.countReferences(arg)
      }
    }
    
    if (node.type === 'operator' && node.operands) {
      for (const operand of node.operands) {
        count += this.countReferences(operand)
      }
    }
    
    return count
  }
  
  /**
   * Count conditional functions
   */
  private static countConditionals(node: ParsedFormula): number {
    const conditionalFunctions = ['IF', 'IFS', 'SWITCH', 'CHOOSE', 'IFERROR', 'IFNA']
    let count = 0
    
    if (node.type === 'function' && node.function && conditionalFunctions.includes(node.function)) {
      count = 1
    }
    
    if (node.type === 'function' && node.arguments) {
      for (const arg of node.arguments) {
        count += this.countConditionals(arg)
      }
    }
    
    if (node.type === 'operator' && node.operands) {
      for (const operand of node.operands) {
        count += this.countConditionals(operand)
      }
    }
    
    return count
  }
  
  /**
   * Count lookup functions
   */
  private static countLookups(node: ParsedFormula): number {
    const lookupFunctions = ['VLOOKUP', 'HLOOKUP', 'XLOOKUP', 'INDEX', 'MATCH', 'OFFSET', 'INDIRECT']
    let count = 0
    
    if (node.type === 'function' && node.function && lookupFunctions.includes(node.function)) {
      count = 1
    }
    
    if (node.type === 'function' && node.arguments) {
      for (const arg of node.arguments) {
        count += this.countLookups(arg)
      }
    }
    
    if (node.type === 'operator' && node.operands) {
      for (const operand of node.operands) {
        count += this.countLookups(operand)
      }
    }
    
    return count
  }
  
  /**
   * Count nested functions
   */
  private static countNestedFunctions(node: ParsedFormula): number {
    if (node.type !== 'function') return 0
    
    let maxNesting = 0
    
    if (node.arguments) {
      for (const arg of node.arguments) {
        if (arg.type === 'function') {
          maxNesting = Math.max(maxNesting, 1 + this.countNestedFunctions(arg))
        }
      }
    }
    
    return maxNesting
  }
  
  /**
   * Calculate complexity score
   */
  private static calculateComplexityScore(factors: FormulaComplexity['factors']): number {
    return (
      factors.depth * 10 +
      factors.functionCount * 5 +
      factors.uniqueFunctions * 3 +
      factors.referenceCount * 2 +
      factors.conditionalCount * 8 +
      factors.lookupCount * 7 +
      factors.nestedFunctions * 15
    )
  }
  
  /**
   * Get complexity level from score
   */
  private static getComplexityLevel(score: number): FormulaComplexity['level'] {
    if (score < 20) return 'simple'
    if (score < 50) return 'moderate'
    if (score < 100) return 'complex'
    return 'very-complex'
  }
  
  /**
   * Get recommendations based on complexity
   */
  private static getComplexityRecommendations(
    factors: FormulaComplexity['factors'], 
    level: FormulaComplexity['level']
  ): string[] {
    const recommendations: string[] = []
    
    if (factors.nestedFunctions > 3) {
      recommendations.push('Consider breaking down nested functions into helper columns')
    }
    
    if (factors.conditionalCount > 5) {
      recommendations.push('High number of conditionals - consider using lookup tables')
    }
    
    if (factors.lookupCount > 3) {
      recommendations.push('Multiple lookups detected - consider using INDEX/MATCH for better performance')
    }
    
    if (factors.depth > 10) {
      recommendations.push('Very deep formula structure - simplify for better readability')
    }
    
    if (level === 'very-complex') {
      recommendations.push('Consider using named ranges to improve formula clarity')
      recommendations.push('Document complex formulas with comments in adjacent cells')
    }
    
    return recommendations
  }
  
  /**
   * Detect circular references using DFS
   */
  private static detectCircularReferences(
    nodes: Map<string, { dependencies: string[]; dependents: string[]; formula: string; level: number }>
  ): string[][] {
    const cycles: string[][] = []
    const visited = new Set<string>()
    const recursionStack = new Set<string>()
    const path: string[] = []
    
    const dfs = (cell: string): boolean => {
      visited.add(cell)
      recursionStack.add(cell)
      path.push(cell)
      
      const node = nodes.get(cell)
      if (node) {
        for (const dep of node.dependencies) {
          if (!visited.has(dep)) {
            if (dfs(dep)) return true
          } else if (recursionStack.has(dep)) {
            // Found cycle
            const cycleStart = path.indexOf(dep)
            cycles.push(path.slice(cycleStart))
            return true
          }
        }
      }
      
      path.pop()
      recursionStack.delete(cell)
      return false
    }
    
    for (const cell of nodes.keys()) {
      if (!visited.has(cell)) {
        dfs(cell)
      }
    }
    
    return cycles
  }
  
  /**
   * Check if formula has volatile functions
   */
  private static hasVolatileFunctions(node: ParsedFormula): boolean {
    const volatileFunctions = ['NOW', 'TODAY', 'RAND', 'RANDBETWEEN', 'OFFSET', 'INDIRECT']
    
    if (node.type === 'function' && node.function && volatileFunctions.includes(node.function)) {
      return true
    }
    
    if (node.type === 'function' && node.arguments) {
      for (const arg of node.arguments) {
        if (this.hasVolatileFunctions(arg)) return true
      }
    }
    
    if (node.type === 'operator' && node.operands) {
      for (const operand of node.operands) {
        if (this.hasVolatileFunctions(operand)) return true
      }
    }
    
    return false
  }
  
  /**
   * Classify formula into types
   */
  private static classifyFormula(formula: string): string[] {
    const types: string[] = []
    const upperFormula = formula.toUpperCase()
    
    // Financial functions
    if (/\b(NPV|IRR|PMT|PV|FV|RATE|NPER|IPMT|PPMT|XNPV|XIRR)\b/.test(upperFormula)) {
      types.push('financial')
    }
    
    // Statistical functions
    if (/\b(AVERAGE|MEDIAN|MODE|STDEV|VAR|CORREL|FORECAST|TREND|GROWTH)\b/.test(upperFormula)) {
      types.push('statistical')
    }
    
    // Aggregation functions
    if (/\b(SUM|COUNT|MAX|MIN|SUMIF|COUNTIF|AVERAGEIF)\b/.test(upperFormula)) {
      types.push('aggregation')
    }
    
    // Lookup functions
    if (/\b(VLOOKUP|HLOOKUP|XLOOKUP|INDEX|MATCH|OFFSET|INDIRECT)\b/.test(upperFormula)) {
      types.push('lookup')
    }
    
    // Date/Time functions
    if (/\b(DATE|TIME|NOW|TODAY|YEAR|MONTH|DAY|HOUR|MINUTE|WEEKDAY|WORKDAY)\b/.test(upperFormula)) {
      types.push('datetime')
    }
    
    // Text functions
    if (/\b(CONCATENATE|LEFT|RIGHT|MID|LEN|FIND|SEARCH|REPLACE|SUBSTITUTE|TRIM)\b/.test(upperFormula)) {
      types.push('text')
    }
    
    // Logical functions
    if (/\b(IF|AND|OR|NOT|IFS|SWITCH|CHOOSE|IFERROR)\b/.test(upperFormula)) {
      types.push('logical')
    }
    
    // Array formulas
    if (formula.includes('{') && formula.includes('}')) {
      types.push('array')
    }
    
    // Mathematical
    if (/\b(ROUND|ABS|SQRT|POWER|EXP|LOG|SIN|COS|TAN|PI)\b/.test(upperFormula)) {
      types.push('mathematical')
    }
    
    if (types.length === 0) {
      types.push('basic')
    }
    
    return types
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