import * as formulajs from 'formulajs'

export interface ParsedFormula {
  type: 'function' | 'operator' | 'reference' | 'constant' | 'error'
  function?: string
  arguments?: ParsedFormula[]
  operator?: string
  operands?: ParsedFormula[]
  reference?: {
    type: 'cell' | 'range' | 'named'
    address: string
    sheet?: string
    isAbsolute?: { row: boolean; col: boolean }
  }
  value?: any
  error?: string
}

export interface FormulaDependency {
  formula: string
  cell: string
  dependencies: string[]
  precedents: string[]
}

export class FormulaParser {
  /**
   * Parse Excel formula into AST-like structure
   */
  static parseFormula(formula: string): ParsedFormula {
    // Remove leading = if present
    const cleanFormula = formula.startsWith('=') ? formula.substring(1) : formula
    
    try {
      return this.parseExpression(cleanFormula)
    } catch (error) {
      return {
        type: 'error',
        error: `Parse error: ${(error as Error).message}`
      }
    }
  }
  
  /**
   * Extract all cell references from a formula
   */
  static extractReferences(formula: string): string[] {
    const references: string[] = []
    
    // Match cell references (with optional sheet name)
    const cellPattern = /(?:([A-Za-z_]\w*|'[^']+')!)?(\$?[A-Z]+\$?\d+)/g
    const rangePattern = /(?:([A-Za-z_]\w*|'[^']+')!)?(\$?[A-Z]+\$?\d+):(\$?[A-Z]+\$?\d+)/g
    
    // Extract ranges first
    let match
    while ((match = rangePattern.exec(formula)) !== null) {
      const sheet = match[1] ? match[1].replace(/'/g, '') : ''
      const range = `${match[2]}:${match[3]}`
      references.push(sheet ? `${sheet}!${range}` : range)
    }
    
    // Then extract individual cells
    while ((match = cellPattern.exec(formula)) !== null) {
      // Skip if this is part of a range we already captured
      if (!this.isPartOfRange(match.index, formula)) {
        const sheet = match[1] ? match[1].replace(/'/g, '') : ''
        const cell = match[2]
        references.push(sheet ? `${sheet}!${cell}` : cell)
      }
    }
    
    return [...new Set(references)] // Remove duplicates
  }
  
  /**
   * Get formula dependencies (cells this formula depends on)
   */
  static getDependencies(formula: string, currentCell: string): FormulaDependency {
    const dependencies = this.extractReferences(formula)
    
    return {
      formula,
      cell: currentCell,
      dependencies,
      precedents: [] // Will be filled by dependency graph builder
    }
  }
  
  /**
   * Describe formula in natural language
   */
  static describeFormula(formula: string): string {
    const parsed = this.parseFormula(formula)
    return this.describeNode(parsed)
  }
  
  /**
   * Parse expression (main parsing logic)
   */
  private static parseExpression(expr: string): ParsedFormula {
    expr = expr.trim()
    
    // Check for constants
    if (this.isNumber(expr)) {
      return { type: 'constant', value: parseFloat(expr) }
    }
    
    if (this.isString(expr)) {
      return { type: 'constant', value: this.unquoteString(expr) }
    }
    
    if (this.isBoolean(expr)) {
      return { type: 'constant', value: expr.toUpperCase() === 'TRUE' }
    }
    
    // Check for cell reference
    if (this.isCellReference(expr)) {
      return this.parseCellReference(expr)
    }
    
    // Check for function call
    if (this.isFunctionCall(expr)) {
      return this.parseFunctionCall(expr)
    }
    
    // Check for operators
    const operatorResult = this.parseOperatorExpression(expr)
    if (operatorResult) {
      return operatorResult
    }
    
    // Default to error
    return { type: 'error', error: `Unknown expression: ${expr}` }
  }
  
  /**
   * Parse function call
   */
  private static parseFunctionCall(expr: string): ParsedFormula {
    const match = expr.match(/^([A-Z]+[A-Z0-9]*)\((.*)\)$/i)
    if (!match) {
      return { type: 'error', error: 'Invalid function syntax' }
    }
    
    const functionName = match[1].toUpperCase()
    const argsString = match[2]
    
    // Parse arguments
    const args = this.parseArguments(argsString)
    
    return {
      type: 'function',
      function: functionName,
      arguments: args
    }
  }
  
  /**
   * Parse function arguments
   */
  private static parseArguments(argsString: string): ParsedFormula[] {
    if (!argsString.trim()) return []
    
    const args: ParsedFormula[] = []
    let current = ''
    let depth = 0
    let inString = false
    
    for (let i = 0; i < argsString.length; i++) {
      const char = argsString[i]
      
      if (char === '"' && (i === 0 || argsString[i - 1] !== '\\')) {
        inString = !inString
      }
      
      if (!inString) {
        if (char === '(' || char === '{') depth++
        if (char === ')' || char === '}') depth--
        
        if (char === ',' && depth === 0) {
          args.push(this.parseExpression(current))
          current = ''
          continue
        }
      }
      
      current += char
    }
    
    if (current) {
      args.push(this.parseExpression(current))
    }
    
    return args
  }
  
  /**
   * Parse operator expression
   */
  private static parseOperatorExpression(expr: string): ParsedFormula | null {
    // Simple operator parsing - handles basic arithmetic
    const operators = ['+', '-', '*', '/', '^', '&', '=', '<>', '>', '<', '>=', '<=']
    
    for (const op of operators) {
      const parts = this.splitByOperator(expr, op)
      if (parts.length > 1) {
        return {
          type: 'operator',
          operator: op,
          operands: parts.map(part => this.parseExpression(part))
        }
      }
    }
    
    return null
  }
  
  /**
   * Split expression by operator (respecting parentheses)
   */
  private static splitByOperator(expr: string, operator: string): string[] {
    const parts: string[] = []
    let current = ''
    let depth = 0
    let inString = false
    
    for (let i = 0; i < expr.length; i++) {
      const char = expr[i]
      
      if (char === '"' && (i === 0 || expr[i - 1] !== '\\')) {
        inString = !inString
      }
      
      if (!inString) {
        if (char === '(') depth++
        if (char === ')') depth--
        
        if (depth === 0 && expr.substring(i, i + operator.length) === operator) {
          parts.push(current)
          current = ''
          i += operator.length - 1
          continue
        }
      }
      
      current += char
    }
    
    if (current) {
      parts.push(current)
    }
    
    return parts
  }
  
  /**
   * Parse cell reference
   */
  private static parseCellReference(expr: string): ParsedFormula {
    const rangeMatch = expr.match(/^(?:([A-Za-z_]\w*|'[^']+')!)?(\$?[A-Z]+\$?\d+):(\$?[A-Z]+\$?\d+)$/)
    if (rangeMatch) {
      return {
        type: 'reference',
        reference: {
          type: 'range',
          address: `${rangeMatch[2]}:${rangeMatch[3]}`,
          sheet: rangeMatch[1]?.replace(/'/g, ''),
          isAbsolute: {
            row: rangeMatch[2].includes('$') || rangeMatch[3].includes('$'),
            col: rangeMatch[2].includes('$') || rangeMatch[3].includes('$')
          }
        }
      }
    }
    
    const cellMatch = expr.match(/^(?:([A-Za-z_]\w*|'[^']+')!)?(\$?[A-Z]+\$?\d+)$/)
    if (cellMatch) {
      const cellRef = cellMatch[2]
      return {
        type: 'reference',
        reference: {
          type: 'cell',
          address: cellRef,
          sheet: cellMatch[1]?.replace(/'/g, ''),
          isAbsolute: {
            row: cellRef.includes('$'),
            col: cellRef.match(/^\$[A-Z]+/i) !== null
          }
        }
      }
    }
    
    return { type: 'error', error: 'Invalid reference' }
  }
  
  /**
   * Describe parsed node in natural language
   */
  private static describeNode(node: ParsedFormula): string {
    switch (node.type) {
      case 'constant':
        return `constant value ${node.value}`
        
      case 'reference':
        if (node.reference?.type === 'cell') {
          return `cell ${node.reference.address}`
        } else if (node.reference?.type === 'range') {
          return `range ${node.reference.address}`
        }
        return 'reference'
        
      case 'function':
        const funcDesc = this.getFunctionDescription(node.function || '')
        const argsDesc = node.arguments?.map(arg => this.describeNode(arg)).join(', ') || ''
        return `${funcDesc}(${argsDesc})`
        
      case 'operator':
        const opDesc = this.getOperatorDescription(node.operator || '')
        const operandsDesc = node.operands?.map(op => this.describeNode(op)).join(` ${opDesc} `) || ''
        return operandsDesc
        
      case 'error':
        return `error: ${node.error}`
        
      default:
        return 'unknown'
    }
  }
  
  /**
   * Get human-readable function description
   */
  private static getFunctionDescription(func: string): string {
    const descriptions: Record<string, string> = {
      'SUM': 'sum of',
      'AVERAGE': 'average of',
      'COUNT': 'count of',
      'MAX': 'maximum of',
      'MIN': 'minimum of',
      'IF': 'if-then-else',
      'VLOOKUP': 'vertical lookup',
      'HLOOKUP': 'horizontal lookup',
      'INDEX': 'index lookup',
      'MATCH': 'match position',
      'SUMIF': 'conditional sum',
      'COUNTIF': 'conditional count',
      'CONCATENATE': 'concatenate',
      'LEFT': 'left characters',
      'RIGHT': 'right characters',
      'MID': 'middle characters',
      'LEN': 'length of',
      'ROUND': 'round',
      'ABS': 'absolute value of',
      'SQRT': 'square root of',
      'POWER': 'power of',
      'NPV': 'net present value',
      'IRR': 'internal rate of return',
      'PMT': 'payment',
      'FV': 'future value',
      'PV': 'present value'
    }
    
    return descriptions[func] || func.toLowerCase()
  }
  
  /**
   * Get human-readable operator description
   */
  private static getOperatorDescription(op: string): string {
    const descriptions: Record<string, string> = {
      '+': 'plus',
      '-': 'minus',
      '*': 'times',
      '/': 'divided by',
      '^': 'to the power of',
      '&': 'concatenated with',
      '=': 'equals',
      '<>': 'not equal to',
      '>': 'greater than',
      '<': 'less than',
      '>=': 'greater than or equal to',
      '<=': 'less than or equal to'
    }
    
    return descriptions[op] || op
  }
  
  /**
   * Check if string is a number
   */
  private static isNumber(str: string): boolean {
    return !isNaN(parseFloat(str)) && isFinite(parseFloat(str))
  }
  
  /**
   * Check if string is a quoted string
   */
  private static isString(str: string): boolean {
    return str.startsWith('"') && str.endsWith('"')
  }
  
  /**
   * Check if string is a boolean
   */
  private static isBoolean(str: string): boolean {
    return /^(TRUE|FALSE)$/i.test(str)
  }
  
  /**
   * Check if string is a cell reference
   */
  private static isCellReference(str: string): boolean {
    return /^(?:[A-Za-z_]\w*!)?(\$?[A-Z]+\$?\d+(?::\$?[A-Z]+\$?\d+)?)$/i.test(str)
  }
  
  /**
   * Check if string is a function call
   */
  private static isFunctionCall(str: string): boolean {
    return /^[A-Z]+[A-Z0-9]*\(.*\)$/i.test(str)
  }
  
  /**
   * Unquote string
   */
  private static unquoteString(str: string): string {
    return str.slice(1, -1).replace(/\\"/g, '"')
  }
  
  /**
   * Check if position is part of a range
   */
  private static isPartOfRange(pos: number, formula: string): boolean {
    // Look for : before or after this position within reasonable distance
    const before = formula.lastIndexOf(':', pos)
    const after = formula.indexOf(':', pos)
    
    // If there's a colon nearby and no function call between, it's likely part of a range
    if (before > pos - 10 && before !== -1) {
      const between = formula.substring(before, pos)
      if (!/[(),]/.test(between)) return true
    }
    
    if (after < pos + 10 && after !== -1) {
      const between = formula.substring(pos, after)
      if (!/[(),]/.test(between)) return true
    }
    
    return false
  }
}