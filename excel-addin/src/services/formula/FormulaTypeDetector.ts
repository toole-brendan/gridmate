import { ParsedFormula, FormulaParser } from './FormulaParser'

export type FormulaType = 
  | 'financial'
  | 'statistical'
  | 'lookup'
  | 'logical'
  | 'mathematical'
  | 'text'
  | 'date_time'
  | 'reference'
  | 'array'
  | 'database'
  | 'engineering'
  | 'information'
  | 'custom'
  | 'unknown'

export interface FormulaTypeInfo {
  type: FormulaType
  subtype?: string
  confidence: number
  functions: string[]
  complexity: 'simple' | 'moderate' | 'complex'
  characteristics: {
    hasNestedFunctions: boolean
    hasArrayOperations: boolean
    hasConditionalLogic: boolean
    hasLookups: boolean
    hasAggregations: boolean
    referenceCount: number
    maxNestingDepth: number
  }
}

export class FormulaTypeDetector {
  private static readonly FUNCTION_CATEGORIES: Record<FormulaType, string[]> = {
    financial: [
      'PV', 'FV', 'PMT', 'RATE', 'NPER', 'NPV', 'IRR', 'XNPV', 'XIRR',
      'SLN', 'DDB', 'VDB', 'PPMT', 'IPMT', 'CUMIPMT', 'CUMPRINC',
      'PRICE', 'YIELD', 'DURATION', 'MDURATION', 'ACCRINT', 'ACCRINTM'
    ],
    statistical: [
      'AVERAGE', 'AVERAGEIF', 'AVERAGEIFS', 'MEDIAN', 'MODE', 'STDEV',
      'STDEVP', 'VAR', 'VARP', 'CORREL', 'COVAR', 'FORECAST', 'TREND',
      'PERCENTILE', 'QUARTILE', 'RANK', 'PERCENTRANK', 'NORM.DIST',
      'NORM.INV', 'T.DIST', 'T.INV', 'CHISQ.DIST', 'F.DIST'
    ],
    lookup: [
      'VLOOKUP', 'HLOOKUP', 'LOOKUP', 'INDEX', 'MATCH', 'OFFSET',
      'INDIRECT', 'CHOOSE', 'GETPIVOTDATA', 'XLOOKUP', 'XMATCH',
      'FILTER', 'SORT', 'SORTBY', 'UNIQUE'
    ],
    logical: [
      'IF', 'IFS', 'AND', 'OR', 'NOT', 'XOR', 'TRUE', 'FALSE',
      'IFERROR', 'IFNA', 'SWITCH'
    ],
    mathematical: [
      'SUM', 'SUMIF', 'SUMIFS', 'PRODUCT', 'SQRT', 'POWER', 'EXP',
      'LN', 'LOG', 'LOG10', 'ABS', 'ROUND', 'ROUNDUP', 'ROUNDDOWN',
      'CEILING', 'FLOOR', 'MOD', 'INT', 'TRUNC', 'SIGN', 'RAND',
      'RANDBETWEEN', 'PI', 'SIN', 'COS', 'TAN', 'ASIN', 'ACOS', 'ATAN'
    ],
    text: [
      'CONCATENATE', 'CONCAT', 'TEXTJOIN', 'LEFT', 'RIGHT', 'MID',
      'LEN', 'FIND', 'SEARCH', 'REPLACE', 'SUBSTITUTE', 'UPPER',
      'LOWER', 'PROPER', 'TRIM', 'CLEAN', 'TEXT', 'VALUE', 'FIXED'
    ],
    date_time: [
      'TODAY', 'NOW', 'DATE', 'TIME', 'YEAR', 'MONTH', 'DAY',
      'HOUR', 'MINUTE', 'SECOND', 'WEEKDAY', 'WEEKNUM', 'WORKDAY',
      'NETWORKDAYS', 'DATEDIF', 'DATEVALUE', 'TIMEVALUE', 'DAYS',
      'DAYS360', 'EDATE', 'EOMONTH', 'YEARFRAC'
    ],
    reference: [
      'ADDRESS', 'AREAS', 'COLUMN', 'COLUMNS', 'ROW', 'ROWS',
      'FORMULATEXT', 'HYPERLINK', 'TRANSPOSE'
    ],
    array: [
      'SUMPRODUCT', 'MMULT', 'TRANSPOSE', 'FREQUENCY', 'GROWTH',
      'LINEST', 'LOGEST', 'MINVERSE', 'MDETERM'
    ],
    database: [
      'DSUM', 'DAVERAGE', 'DCOUNT', 'DCOUNTA', 'DMAX', 'DMIN',
      'DPRODUCT', 'DSTDEV', 'DSTDEVP', 'DVAR', 'DVARP', 'DGET'
    ],
    engineering: [
      'CONVERT', 'BIN2DEC', 'BIN2HEX', 'BIN2OCT', 'DEC2BIN',
      'DEC2HEX', 'DEC2OCT', 'HEX2BIN', 'HEX2DEC', 'HEX2OCT',
      'COMPLEX', 'IMABS', 'IMAGINARY', 'IMREAL', 'IMSUM'
    ],
    information: [
      'ISBLANK', 'ISERROR', 'ISLOGICAL', 'ISNA', 'ISNONTEXT',
      'ISNUMBER', 'ISTEXT', 'TYPE', 'NA', 'ERROR.TYPE', 'ISREF',
      'ISFORMULA', 'FORMULATEXT', 'SHEET', 'SHEETS', 'CELL', 'INFO'
    ],
    custom: [],
    unknown: []
  }

  /**
   * Detect the type of a formula based on its functions and structure
   */
  static detectFormulaType(formula: string): FormulaTypeInfo {
    const parsed = FormulaParser.parseFormula(formula)
    const functions = this.extractAllFunctions(parsed)
    const characteristics = this.analyzeCharacteristics(parsed)
    
    // Count function usage by category
    const categoryScores = new Map<FormulaType, number>()
    
    for (const [category, categoryFunctions] of Object.entries(this.FUNCTION_CATEGORIES)) {
      const score = functions.filter(f => 
        categoryFunctions.includes(f.toUpperCase())
      ).length
      
      if (score > 0) {
        categoryScores.set(category as FormulaType, score)
      }
    }
    
    // Determine primary type
    let primaryType: FormulaType = 'unknown'
    let maxScore = 0
    
    for (const [type, score] of categoryScores) {
      if (score > maxScore) {
        maxScore = score
        primaryType = type
      }
    }
    
    // Calculate confidence
    const totalFunctions = functions.length
    const confidence = totalFunctions > 0 ? maxScore / totalFunctions : 0
    
    // Determine complexity
    const complexity = this.calculateComplexity(characteristics)
    
    return {
      type: primaryType,
      confidence,
      functions,
      complexity,
      characteristics
    }
  }

  /**
   * Extract all functions from a parsed formula
   */
  private static extractAllFunctions(parsed: ParsedFormula): string[] {
    const functions: string[] = []
    
    const traverse = (node: ParsedFormula) => {
      if (node.type === 'function' && node.function) {
        functions.push(node.function)
      }
      
      if (node.arguments) {
        node.arguments.forEach(traverse)
      }
      
      if (node.operands) {
        node.operands.forEach(traverse)
      }
    }
    
    traverse(parsed)
    return functions
  }

  /**
   * Analyze formula characteristics
   */
  private static analyzeCharacteristics(parsed: ParsedFormula): FormulaTypeInfo['characteristics'] {
    let maxDepth = 0
    let referenceCount = 0
    let hasNestedFunctions = false
    let hasArrayOperations = false
    let hasConditionalLogic = false
    let hasLookups = false
    let hasAggregations = false
    
    const traverse = (node: ParsedFormula, depth: number = 0) => {
      maxDepth = Math.max(maxDepth, depth)
      
      if (node.type === 'function') {
        if (depth > 0) hasNestedFunctions = true
        
        const func = node.function?.toUpperCase() || ''
        
        // Check for specific function types
        if (['IF', 'IFS', 'AND', 'OR', 'NOT'].includes(func)) {
          hasConditionalLogic = true
        }
        
        if (this.FUNCTION_CATEGORIES.lookup.includes(func)) {
          hasLookups = true
        }
        
        if (['SUM', 'AVERAGE', 'COUNT', 'MAX', 'MIN'].includes(func)) {
          hasAggregations = true
        }
        
        if (this.FUNCTION_CATEGORIES.array.includes(func)) {
          hasArrayOperations = true
        }
      }
      
      if (node.type === 'reference') {
        referenceCount++
      }
      
      if (node.arguments) {
        node.arguments.forEach(arg => traverse(arg, depth + 1))
      }
      
      if (node.operands) {
        node.operands.forEach(op => traverse(op, depth))
      }
    }
    
    traverse(parsed)
    
    return {
      hasNestedFunctions,
      hasArrayOperations,
      hasConditionalLogic,
      hasLookups,
      hasAggregations,
      referenceCount,
      maxNestingDepth: maxDepth
    }
  }

  /**
   * Calculate formula complexity based on characteristics
   */
  private static calculateComplexity(
    characteristics: FormulaTypeInfo['characteristics']
  ): 'simple' | 'moderate' | 'complex' {
    let score = 0
    
    // Scoring based on characteristics
    if (characteristics.hasNestedFunctions) score += 2
    if (characteristics.hasArrayOperations) score += 3
    if (characteristics.hasConditionalLogic) score += 1
    if (characteristics.hasLookups) score += 2
    if (characteristics.maxNestingDepth > 3) score += 2
    if (characteristics.referenceCount > 10) score += 1
    
    if (score >= 5) return 'complex'
    if (score >= 2) return 'moderate'
    return 'simple'
  }

  /**
   * Get a human-readable description of the formula type
   */
  static getTypeDescription(type: FormulaType): string {
    const descriptions: Record<FormulaType, string> = {
      financial: 'Financial calculations (NPV, IRR, loan payments, etc.)',
      statistical: 'Statistical analysis (averages, deviations, correlations)',
      lookup: 'Data lookup and reference operations',
      logical: 'Conditional logic and boolean operations',
      mathematical: 'Mathematical calculations and operations',
      text: 'Text manipulation and formatting',
      date_time: 'Date and time calculations',
      reference: 'Cell and range reference operations',
      array: 'Array and matrix operations',
      database: 'Database-style operations on ranges',
      engineering: 'Engineering and conversion functions',
      information: 'Information and type checking functions',
      custom: 'Custom or user-defined functions',
      unknown: 'Unknown or unrecognized formula type'
    }
    
    return descriptions[type] || 'Unknown formula type'
  }
}