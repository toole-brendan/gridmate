import { ParsedFormula, FormulaParser } from './FormulaParser'
import { FormulaTypeDetector, FormulaType } from './FormulaTypeDetector'

export interface FormulaDescription {
  summary: string
  purpose: string
  inputs: string[]
  output: string
  steps: string[]
  warnings?: string[]
  suggestions?: string[]
}

export class FormulaDescriber {
  /**
   * Generate a natural language description of a formula
   */
  static describeFormula(formula: string, context?: { cellAddress?: string; sheetName?: string }): FormulaDescription {
    const parsed = FormulaParser.parseFormula(formula)
    const typeInfo = FormulaTypeDetector.detectFormulaType(formula)
    
    const summary = this.generateSummary(parsed, typeInfo)
    const purpose = this.inferPurpose(parsed, typeInfo, context)
    const inputs = this.describeInputs(parsed)
    const output = this.describeOutput(parsed, typeInfo)
    const steps = this.generateSteps(parsed)
    const warnings = this.identifyWarnings(parsed, typeInfo)
    const suggestions = this.generateSuggestions(parsed, typeInfo)
    
    return {
      summary,
      purpose,
      inputs,
      output,
      steps,
      warnings: warnings.length > 0 ? warnings : undefined,
      suggestions: suggestions.length > 0 ? suggestions : undefined
    }
  }

  /**
   * Generate a high-level summary of the formula
   */
  private static generateSummary(parsed: ParsedFormula, typeInfo: ReturnType<typeof FormulaTypeDetector.detectFormulaType>): string {
    if (parsed.type === 'error') {
      return `Invalid formula: ${parsed.error}`
    }
    
    const typeDesc = FormulaTypeDetector.getTypeDescription(typeInfo.type)
    const complexityDesc = typeInfo.complexity === 'simple' ? 'simple' : 
                          typeInfo.complexity === 'moderate' ? 'moderately complex' : 'complex'
    
    if (parsed.type === 'constant') {
      return `This is a constant value: ${parsed.value}`
    }
    
    if (parsed.type === 'reference') {
      return `This formula references cell ${parsed.reference?.address}`
    }
    
    const mainFunction = typeInfo.functions[0] || 'calculation'
    return `This is a ${complexityDesc} ${typeDesc.toLowerCase()} that uses ${mainFunction} as its primary function`
  }

  /**
   * Infer the purpose of the formula based on its structure and context
   */
  private static inferPurpose(
    parsed: ParsedFormula, 
    typeInfo: ReturnType<typeof FormulaTypeDetector.detectFormulaType>,
    context?: { cellAddress?: string; sheetName?: string }
  ): string {
    const purposes: Record<FormulaType, (parsed: ParsedFormula) => string> = {
      financial: (p) => {
        const func = typeInfo.functions[0]?.toUpperCase()
        if (func === 'NPV') return 'Calculate the net present value of cash flows'
        if (func === 'IRR') return 'Calculate the internal rate of return'
        if (func === 'PMT') return 'Calculate loan payment amount'
        if (func === 'FV') return 'Calculate future value of an investment'
        if (func === 'PV') return 'Calculate present value of future cash flows'
        return 'Perform financial calculations'
      },
      statistical: (p) => {
        const func = typeInfo.functions[0]?.toUpperCase()
        if (func === 'AVERAGE' || func === 'AVERAGEIF') return 'Calculate the average of values'
        if (func === 'STDEV' || func === 'STDEVP') return 'Calculate standard deviation'
        if (func === 'CORREL') return 'Calculate correlation between datasets'
        if (func === 'FORECAST') return 'Forecast future values based on trends'
        return 'Perform statistical analysis'
      },
      lookup: (p) => {
        const func = typeInfo.functions[0]?.toUpperCase()
        if (func === 'VLOOKUP') return 'Look up a value in a vertical table'
        if (func === 'INDEX' && typeInfo.functions.includes('MATCH')) return 'Find and return a value using INDEX/MATCH'
        if (func === 'XLOOKUP') return 'Look up a value with advanced matching options'
        return 'Search and retrieve data from a range'
      },
      logical: (p) => {
        if (typeInfo.functions.includes('IF')) return 'Evaluate conditions and return different values'
        if (typeInfo.functions.includes('AND') || typeInfo.functions.includes('OR')) return 'Test multiple conditions'
        return 'Perform logical tests and conditional operations'
      },
      mathematical: (p) => {
        const func = typeInfo.functions[0]?.toUpperCase()
        if (func === 'SUM' || func === 'SUMIF') return 'Calculate the sum of values'
        if (func === 'PRODUCT') return 'Calculate the product of values'
        if (func?.includes('ROUND')) return 'Round numerical values'
        return 'Perform mathematical calculations'
      },
      text: () => 'Manipulate and format text values',
      date_time: () => 'Work with dates and times',
      reference: () => 'Reference and manipulate cell addresses',
      array: () => 'Perform array or matrix operations',
      database: () => 'Query and aggregate data like a database',
      engineering: () => 'Perform engineering calculations or conversions',
      information: () => 'Check data types and cell information',
      custom: () => 'Execute custom or user-defined operations',
      unknown: () => 'Perform calculations'
    }
    
    return purposes[typeInfo.type](parsed)
  }

  /**
   * Describe the inputs to the formula
   */
  private static describeInputs(parsed: ParsedFormula): string[] {
    const inputs: string[] = []
    const references = new Set<string>()
    
    const collectInputs = (node: ParsedFormula) => {
      if (node.type === 'reference' && node.reference) {
        const ref = node.reference.address
        if (!references.has(ref)) {
          references.add(ref)
          const rangeMatch = ref.match(/([A-Z]+)(\d+):([A-Z]+)(\d+)/)
          if (rangeMatch) {
            inputs.push(`Range ${ref} (multiple cells)`)
          } else {
            inputs.push(`Cell ${ref}`)
          }
        }
      } else if (node.type === 'constant') {
        if (typeof node.value === 'number') {
          inputs.push(`Constant value: ${node.value}`)
        } else if (typeof node.value === 'string') {
          inputs.push(`Text value: "${node.value}"`)
        }
      }
      
      if (node.arguments) {
        node.arguments.forEach(collectInputs)
      }
      if (node.operands) {
        node.operands.forEach(collectInputs)
      }
    }
    
    collectInputs(parsed)
    return inputs.length > 0 ? inputs : ['No direct inputs']
  }

  /**
   * Describe the output of the formula
   */
  private static describeOutput(
    parsed: ParsedFormula, 
    typeInfo: ReturnType<typeof FormulaTypeDetector.detectFormulaType>
  ): string {
    if (parsed.type === 'constant') {
      return `Returns the constant value: ${parsed.value}`
    }
    
    if (parsed.type === 'reference') {
      return `Returns the value from ${parsed.reference?.address}`
    }
    
    const outputDescriptions: Partial<Record<FormulaType, string>> = {
      financial: 'Returns a financial metric or monetary value',
      statistical: 'Returns a statistical measure',
      lookup: 'Returns the looked-up value or an error if not found',
      logical: 'Returns TRUE/FALSE or conditional values',
      mathematical: 'Returns a numerical result',
      text: 'Returns formatted or manipulated text',
      date_time: 'Returns a date, time, or duration',
      array: 'Returns an array of values',
      information: 'Returns information about the data'
    }
    
    return outputDescriptions[typeInfo.type] || 'Returns a calculated value'
  }

  /**
   * Generate step-by-step explanation of the formula
   */
  private static generateSteps(parsed: ParsedFormula): string[] {
    const steps: string[] = []
    
    const explainNode = (node: ParsedFormula, level: number = 0): string => {
      if (node.type === 'function' && node.function) {
        const argExplanations = node.arguments?.map(arg => explainNode(arg, level + 1)) || []
        return `${node.function}(${argExplanations.join(', ')})`
      } else if (node.type === 'operator' && node.operator) {
        const operandExplanations = node.operands?.map(op => explainNode(op, level + 1)) || []
        return operandExplanations.join(` ${node.operator} `)
      } else if (node.type === 'reference') {
        return `value from ${node.reference?.address}`
      } else if (node.type === 'constant') {
        return `${node.value}`
      }
      return 'unknown'
    }
    
    // Generate high-level steps
    if (parsed.type === 'function' && parsed.function) {
      steps.push(`Apply ${parsed.function} function`)
      
      if (parsed.arguments && parsed.arguments.length > 0) {
        parsed.arguments.forEach((arg, index) => {
          const argDesc = explainNode(arg)
          steps.push(`  ${index + 1}. Use ${argDesc}`)
        })
      }
    } else if (parsed.type === 'operator') {
      const operationDesc = explainNode(parsed)
      steps.push(`Calculate: ${operationDesc}`)
    }
    
    return steps.length > 0 ? steps : ['Direct value reference or constant']
  }

  /**
   * Identify potential warnings or issues
   */
  private static identifyWarnings(
    parsed: ParsedFormula,
    typeInfo: ReturnType<typeof FormulaTypeDetector.detectFormulaType>
  ): string[] {
    const warnings: string[] = []
    
    // Check for common issues
    if (typeInfo.characteristics.maxNestingDepth > 5) {
      warnings.push('Formula has deep nesting which may be hard to understand and maintain')
    }
    
    if (typeInfo.characteristics.referenceCount > 20) {
      warnings.push('Formula references many cells which could impact performance')
    }
    
    if (typeInfo.functions.includes('INDIRECT')) {
      warnings.push('INDIRECT function prevents dependency tracking and may cause calculation issues')
    }
    
    if (typeInfo.functions.includes('VLOOKUP') && !typeInfo.functions.includes('IFERROR')) {
      warnings.push('VLOOKUP without error handling may show #N/A errors')
    }
    
    if (parsed.type === 'error') {
      warnings.push('Formula has syntax errors and will not calculate')
    }
    
    return warnings
  }

  /**
   * Generate suggestions for improvement
   */
  private static generateSuggestions(
    parsed: ParsedFormula,
    typeInfo: ReturnType<typeof FormulaTypeDetector.detectFormulaType>
  ): string[] {
    const suggestions: string[] = []
    
    // Suggest modern alternatives
    if (typeInfo.functions.includes('VLOOKUP')) {
      suggestions.push('Consider using XLOOKUP or INDEX/MATCH for more flexibility')
    }
    
    if (typeInfo.complexity === 'complex') {
      suggestions.push('Consider breaking this complex formula into smaller, named components')
    }
    
    if (!typeInfo.functions.includes('IFERROR') && typeInfo.type === 'lookup') {
      suggestions.push('Add IFERROR to handle lookup failures gracefully')
    }
    
    if (typeInfo.characteristics.hasNestedFunctions && typeInfo.characteristics.maxNestingDepth > 3) {
      suggestions.push('Use helper columns to simplify nested calculations')
    }
    
    return suggestions
  }

  /**
   * Generate a concise one-line description
   */
  static getQuickDescription(formula: string): string {
    const typeInfo = FormulaTypeDetector.detectFormulaType(formula)
    const parsed = FormulaParser.parseFormula(formula)
    
    if (parsed.type === 'error') {
      return 'Invalid formula'
    }
    
    if (parsed.type === 'constant') {
      return `Constant: ${parsed.value}`
    }
    
    if (parsed.type === 'reference') {
      return `References ${parsed.reference?.address}`
    }
    
    const mainFunction = typeInfo.functions[0]
    if (mainFunction) {
      return `${mainFunction} ${typeInfo.type} formula`
    }
    
    return 'Formula calculation'
  }
}