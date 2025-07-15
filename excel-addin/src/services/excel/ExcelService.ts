declare const Excel: any
import { FormatErrorHandler } from '../../utils/formatErrorHandler'

export interface ExcelContext {
  workbook: string
  worksheet: string
  selectedRange: string
}

export interface CellData {
  address: string
  value: any
  formula?: string
  format?: any
}

export interface RangeData {
  values: any[][]
  formulas?: string[][]
  formatting?: any[][]
  address: string
  rowCount: number
  colCount: number
}

export interface WorkbookData {
  sheets: SheetData[]
  namedRanges: NamedRange[]
  activeSheet: string
  totalCells: number
}

export interface SheetData {
  name: string
  usedRange: string
  data: RangeData
  lastRow: number
  lastColumn: number
}

export interface ComprehensiveContext extends ExcelContext {
  selectedData?: RangeData
  visibleRangeData?: RangeData
  workbookSummary?: WorkbookData
  nearbyData?: RangeData  // Data around selection
}

export interface DataAnalysis {
  dataTypes: string[]
  headers?: string[]
  statistics?: Record<string, any>
  patterns?: string[]
  rowCount: number
  colCount: number
}

export interface CellFormat {
  numberFormat?: string
  font?: {
    bold?: boolean
    italic?: boolean
    size?: number
    color?: string
  }
  fillColor?: string
  alignment?: {
    horizontal?: 'left' | 'center' | 'right' | 'fill' | 'justify'
    vertical?: 'top' | 'middle' | 'bottom'
  }
}

export interface ChartConfig {
  dataRange: string
  chartType: 'column' | 'bar' | 'line' | 'pie' | 'scatter' | 'area' | 'combo'
  title?: string
  position?: string
  includeLegend?: boolean
}

export interface ValidationResult {
  isValid: boolean
  circularRefs?: string[]
  inconsistentFormulas?: string[]
  errors?: Array<{
    cell: string
    errorType: string
    message: string
  }>
}

export interface NamedRange {
  name: string
  range: string
  scope: string
  comment?: string
}

export class ExcelService {
  private static instance: ExcelService

  static getInstance(): ExcelService {
    if (!ExcelService.instance) {
      console.log('[ExcelService] Creating new instance')
      if (typeof Excel === 'undefined') {
        console.error('[ExcelService] Excel object is undefined! Office.js may not be loaded')
      } else {
        console.log('[ExcelService] Excel object is available')
      }
      ExcelService.instance = new ExcelService()
    }
    return ExcelService.instance
  }

  async getContext(): Promise<ExcelContext> {
    return Excel.run(async (context: any) => {
      const workbook = context.workbook
      const worksheet = workbook.worksheets.getActiveWorksheet()
      const range = workbook.getSelectedRange()

      workbook.load('name')
      worksheet.load('name')
      range.load('address')

      await context.sync()

      return {
        workbook: workbook.name,
        worksheet: worksheet.name,
        selectedRange: range.address
      }
    })
  }

  // Get comprehensive context with configurable depth
  async getComprehensiveContext(options: {
    includeAllSheets?: boolean
    maxCellsPerSheet?: number
    includeFormulas?: boolean
    includeFormatting?: boolean
  } = {}): Promise<ComprehensiveContext> {
    const {
      includeAllSheets = false,
      maxCellsPerSheet = 10000,
      includeFormulas = true,
      // includeFormatting = false
    } = options

    return Excel.run(async (context: any) => {
      const workbook = context.workbook
      const activeWorksheet = workbook.worksheets.getActiveWorksheet()
      const selectedRange = workbook.getSelectedRange()

      // Load basic info
      workbook.load('name')
      activeWorksheet.load('name')
      selectedRange.load(['address', 'rowCount', 'columnCount'])

      await context.sync()

      const result: ComprehensiveContext = {
        workbook: workbook.name,
        worksheet: activeWorksheet.name,
        selectedRange: selectedRange.address
      }

      // Get selected range data
      if (selectedRange.rowCount * selectedRange.columnCount < 1000) {
        selectedRange.load(['values', 'formulas'])
        await context.sync()
        
        result.selectedData = {
          values: selectedRange.values,
          formulas: selectedRange.formulas,
          address: selectedRange.address,
          rowCount: selectedRange.rowCount,
          colCount: selectedRange.columnCount
        }
      }

      // Get visible range data (what user sees on screen)
      try {
        const visibleRange = activeWorksheet.getUsedRange()
        if (visibleRange) {
          visibleRange.load(['address', 'rowCount', 'columnCount'])
          await context.sync()

          if (visibleRange.rowCount * visibleRange.columnCount < maxCellsPerSheet) {
            visibleRange.load(['values', 'formulas'])
            await context.sync()

            result.visibleRangeData = {
              values: visibleRange.values,
              formulas: includeFormulas ? visibleRange.formulas : undefined,
              address: visibleRange.address,
              rowCount: visibleRange.rowCount,
              colCount: visibleRange.columnCount
            }
          }
        }
      } catch (e) {
        console.log('No used range in active sheet')
      }

      // Get all sheets data if requested
      if (includeAllSheets) {
        const sheets = workbook.worksheets
        sheets.load('items')
        await context.sync()

        const workbookData: WorkbookData = {
          sheets: [],
          namedRanges: [],
          activeSheet: activeWorksheet.name,
          totalCells: 0
        }

        for (const sheet of sheets.items) {
          sheet.load('name')
          const usedRange = sheet.getUsedRange()
          
          if (usedRange) {
            usedRange.load(['address', 'rowCount', 'columnCount'])
            await context.sync()

            const cellCount = usedRange.rowCount * usedRange.columnCount
            workbookData.totalCells += cellCount

            // Only load data if under threshold
            if (cellCount < maxCellsPerSheet) {
              usedRange.load(['values', 'formulas'])
              await context.sync()

              workbookData.sheets.push({
                name: sheet.name,
                usedRange: usedRange.address,
                data: {
                  values: usedRange.values,
                  formulas: includeFormulas ? usedRange.formulas : undefined,
                  address: usedRange.address,
                  rowCount: usedRange.rowCount,
                  colCount: usedRange.columnCount
                },
                lastRow: usedRange.rowCount,
                lastColumn: usedRange.columnCount
              })
            } else {
              // For large sheets, just send summary
              workbookData.sheets.push({
                name: sheet.name,
                usedRange: usedRange.address,
                data: {
                  values: [['Sheet too large to load fully']],
                  address: usedRange.address,
                  rowCount: usedRange.rowCount,
                  colCount: usedRange.columnCount
                },
                lastRow: usedRange.rowCount,
                lastColumn: usedRange.columnCount
              })
            }
          }
        }

        result.workbookSummary = workbookData
      }

      return result
    })
  }

  // Optimized method to get context around selection
  async getSmartContext(): Promise<ComprehensiveContext> {
    console.log('[ExcelService] getSmartContext called')
    return Excel.run(async (context: any) => {
      const workbook = context.workbook
      const worksheet = workbook.worksheets.getActiveWorksheet()
      const selectedRange = workbook.getSelectedRange()

      workbook.load('name')
      worksheet.load('name')
      selectedRange.load(['address', 'rowIndex', 'columnIndex', 'rowCount', 'columnCount'])

      await context.sync()
      
      console.log('[ExcelService] Basic context loaded:', {
        workbook: workbook.name,
        worksheet: worksheet.name,
        selectedRange: selectedRange.address
      })

      const result: ComprehensiveContext = {
        workbook: workbook.name,
        worksheet: worksheet.name,
        selectedRange: selectedRange.address
      }

      // Get selected range data
      selectedRange.load(['values', 'formulas'])
      await context.sync()
      
      result.selectedData = {
        values: selectedRange.values,
        formulas: selectedRange.formulas,
        address: selectedRange.address,
        rowCount: selectedRange.rowCount,
        colCount: selectedRange.columnCount
      }

      // Get nearby context (20 rows above/below, 10 columns left/right)
      const startRow = Math.max(0, selectedRange.rowIndex - 20)
      const startCol = Math.max(0, selectedRange.columnIndex - 10)
      const endRow = selectedRange.rowIndex + selectedRange.rowCount + 20
      const endCol = selectedRange.columnIndex + selectedRange.columnCount + 10

      try {
        const nearbyRange = worksheet.getRangeByIndexes(startRow, startCol, 
          endRow - startRow, endCol - startCol)
        nearbyRange.load(['values', 'formulas', 'address'])
        await context.sync()

        result.nearbyData = {
          values: nearbyRange.values,
          formulas: nearbyRange.formulas,
          address: nearbyRange.address,
          rowCount: nearbyRange.rowCount,
          colCount: nearbyRange.columnCount
        }
      } catch (e) {
        console.log('[ExcelService] Could not get nearby range:', e)
      }

      console.log('[ExcelService] getSmartContext completed successfully')
      return result
    }).catch(error => {
      console.error('[ExcelService] getSmartContext error:', error)
      throw error
    })
  }

  async readRange(address: string): Promise<CellData[][]> {
    return Excel.run(async (context: any) => {
      const worksheet = context.workbook.worksheets.getActiveWorksheet()
      const range = worksheet.getRange(address)
      
      range.load(['values', 'formulas', 'address'])
      await context.sync()
      
      const result: CellData[][] = []
      for (let i = 0; i < range.values.length; i++) {
        const row: CellData[] = []
        for (let j = 0; j < range.values[i].length; j++) {
          row.push({
            address: this.getCellAddress(range.address, i, j),
            value: range.values[i][j],
            formula: range.formulas[i][j]
          })
        }
        result.push(row)
      }
      
      return result
    })
  }

  // Helper to calculate cell address
  private getCellAddress(rangeAddress: string, row: number, col: number): string {
    // Simple implementation - would need enhancement for complex ranges
    const match = rangeAddress.match(/([A-Z]+)(\d+)/)
    if (match) {
      const startCol = match[1]
      const startRow = parseInt(match[2])
      return this.columnToLetter(this.letterToColumn(startCol) + col) + (startRow + row)
    }
    return rangeAddress
  }

  private letterToColumn(letter: string): number {
    let column = 0
    for (let i = 0; i < letter.length; i++) {
      column = column * 26 + (letter.charCodeAt(i) - 65 + 1)
    }
    return column - 1
  }

  private columnToLetter(column: number): string {
    let letter = ''
    column++
    while (column > 0) {
      const remainder = (column - 1) % 26
      letter = String.fromCharCode(65 + remainder) + letter
      column = Math.floor((column - 1) / 26)
    }
    return letter
  }

  private validateAndNormalizeFormat(format: string, formatMap: { [key: string]: string }): string {
    if (!format || typeof format !== 'string') {
      console.warn(`⚠️ Invalid format provided: ${format}, using General`)
      return 'General'
    }

    // First try exact match in format map
    const lowerFormat = format.toLowerCase().trim()
    if (formatMap[lowerFormat]) {
      return formatMap[lowerFormat]
    }

    // Check if it's already a valid Excel format code
    if (this.isValidExcelFormat(format)) {
      return format
    }

    // Try to infer format from common patterns
    const inferredFormat = this.inferFormatFromPattern(format)
    if (inferredFormat) {
      return inferredFormat
    }

    // Fallback to General if nothing matches
    console.warn(`⚠️ Unknown format "${format}", using General`)
    return 'General'
  }

  private isValidExcelFormat(format: string): boolean {
    // Basic validation for Excel format codes
    // Check for common Excel format patterns
    const validPatterns = [
      /^[0#]*\.?[0#]*%?$/, // Basic number patterns like 0.00, #,##0, 0%
      /^[0#,]*\.?[0#]*$/, // Number with commas
      /^\$[#,0]*\.?[0#]*$/, // Currency patterns
      /^[mdhysq\/\-\s:]*$/i, // Date/time patterns
      /^@$/, // Text format
      /^General$/i, // General format
      /^0\.00E\+00$/i, // Scientific notation
      /^[#0\s]*\?+\/[#0\s]*$/ // Fraction patterns
    ]

    return validPatterns.some(pattern => pattern.test(format))
  }

  private inferFormatFromPattern(format: string): string | null {
    const lower = format.toLowerCase()
    
    // Try to match partial patterns
    if (lower.includes('$') || lower.includes('dollar') || lower.includes('currency')) {
      return '$#,##0.00'
    }
    if (lower.includes('%') || lower.includes('percent')) {
      return '0.00%'
    }
    if (lower.includes('date')) {
      return 'm/d/yyyy'
    }
    if (lower.includes('time')) {
      return 'h:mm:ss AM/PM'
    }
    if (lower.includes('comma') || lower.includes('thousand')) {
      return '#,##0.00'
    }
    if (lower.includes('decimal') || lower.includes('number')) {
      return '0.00'
    }
    
    return null
  }

  // Tool executor for AI requests
  async executeToolRequest(tool: string, input: any): Promise<any> {
    console.log(`🔧 ExcelService.executeToolRequest called with tool: ${tool}`)
    console.log(`🔧 Input:`, input)
    
    try {
      switch (tool) {
        case 'read_range':
          return await this.toolReadRange(input)
        case 'write_range':
          return await this.toolWriteRange(input)
        case 'apply_formula':
          return await this.toolApplyFormula(input)
        case 'analyze_data':
          return await this.toolAnalyzeData(input)
        case 'format_range':
          return await this.toolFormatRange(input)
        case 'create_chart':
          return await this.toolCreateChart(input)
        case 'validate_model':
          return await this.toolValidateModel(input)
        case 'get_named_ranges':
          return await this.toolGetNamedRanges(input)
        case 'create_named_range':
          return await this.toolCreateNamedRange(input)
        case 'insert_rows_columns':
          return await this.toolInsertRowsColumns(input)
        default:
          throw new Error(`Unknown tool: ${tool}`)
      }
    } catch (error) {
      console.error(`🔧 Tool execution error:`, error)
      
      // Create enhanced error with details
      const enhancedError = {
        message: error instanceof Error ? error.message : String(error),
        tool: tool,
        input: input,
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString()
      }
      
      throw enhancedError
    }
  }

  private async toolReadRange(input: any): Promise<RangeData> {
    const { range, include_formulas = true, include_formatting = false } = input
    
    console.log(`📊 toolReadRange called with range: ${range}`)
    
    return Excel.run(async (context: any) => {
      console.log('📊 Inside Excel.run')
      
      const worksheet = context.workbook.worksheets.getActiveWorksheet()
      console.log('📊 Got active worksheet')
      
      const excelRange = worksheet.getRange(range)
      console.log('📊 Got range object')
      
      const loadProperties = ['values', 'address', 'rowCount', 'columnCount']
      if (include_formulas) {
        loadProperties.push('formulas')
      }
      if (include_formatting) {
        loadProperties.push('format')
      }
      
      console.log('📊 Loading properties:', loadProperties)
      excelRange.load(loadProperties)
      
      console.log('📊 Calling context.sync()...')
      await context.sync()
      console.log('📊 context.sync() completed')
      
      const result: RangeData = {
        values: excelRange.values,
        address: excelRange.address,
        rowCount: excelRange.rowCount,
        colCount: excelRange.columnCount
      }
      
      if (include_formulas) {
        result.formulas = excelRange.formulas
      }
      
      if (include_formatting) {
        // Extract formatting - simplified for now
        result.formatting = []
      }
      
      console.log('📊 toolReadRange result:', result)
      return result
    })
  }

  private async toolWriteRange(input: any): Promise<any> {
    const { range, values /*, preserve_formatting = true*/ } = input
    
    return Excel.run(async (context: any) => {
      const worksheet = context.workbook.worksheets.getActiveWorksheet()
      const excelRange = worksheet.getRange(range)
      
      // Validate and clean values before writing
      const cleanedValues = values.map((row: any[]) =>
        row.map((cell: any) => {
          // Convert undefined/null to empty string
          if (cell === undefined || cell === null) {
            return ''
          }
          // Ensure numbers are properly typed
          if (typeof cell === 'string' && !isNaN(Number(cell)) && cell !== '') {
            return Number(cell)
          }
          return cell
        })
      )
      
      console.log(`✍️ Writing to range ${range}:`, cleanedValues)
      
      try {
        excelRange.values = cleanedValues
        await context.sync()
      } catch (error) {
        console.error(`❌ Failed to write to range ${range}:`, error)
        
        const errorDetails = {
          operation: 'write_range',
          range: range,
          valueDimensions: `${cleanedValues.length}x${cleanedValues[0]?.length || 0}`,
          excelError: error instanceof Error ? error.message : String(error)
        }
        
        throw new Error(`Failed to write values: ${(error as Error).message}. Details: ${JSON.stringify(errorDetails)}`)
      }
      
      return {
        message: 'Range written successfully',
        status: 'success'
      }
    })
  }

  private async toolApplyFormula(input: any): Promise<any> {
    const { range, formula, relative_references = true } = input
    
    return Excel.run(async (context: any) => {
      const worksheet = context.workbook.worksheets.getActiveWorksheet()
      const excelRange = worksheet.getRange(range)
      
      // Load range properties to determine size
      excelRange.load(['rowCount', 'columnCount', 'address'])
      await context.sync()
      
      console.log(`🔧 Applying formula "${formula}" to range ${excelRange.address} (${excelRange.rowCount}x${excelRange.columnCount})`)
      
      try {
        if (relative_references && (excelRange.rowCount > 1 || excelRange.columnCount > 1)) {
          // For ranges with relative references, use .formula property
          // This allows Excel to auto-adjust references for each cell
          console.log(`📐 Using relative references for multi-cell range`)
          excelRange.formula = formula
        } else {
          // For single cells or absolute references, use formulas array
          const formulaArray = Array(excelRange.rowCount).fill(null).map(() => 
            Array(excelRange.columnCount).fill(formula)
          )
          console.log(`📊 Using formula array for ${excelRange.rowCount}x${excelRange.columnCount} range`)
          excelRange.formulas = formulaArray
        }
        
        await context.sync()
        
        console.log(`✅ Formula applied successfully to ${excelRange.address}`)
        
        return {
          message: 'Formula applied successfully',
          status: 'success',
          range: excelRange.address,
          formula_applied: formula,
          cells_affected: excelRange.rowCount * excelRange.columnCount
        }
      } catch (error) {
        console.error('❌ Formula application error:', error)
        
        const errorDetails = {
          operation: 'apply_formula',
          range: range,
          formula: formula,
          excelError: error instanceof Error ? error.message : String(error)
        }
        
        throw new Error(`Failed to apply formula "${formula}" to range "${range}": ${(error as Error).message}. Details: ${JSON.stringify(errorDetails)}`)
      }
    })
  }

  private async toolAnalyzeData(input: any): Promise<DataAnalysis> {
    const { range, detect_headers = true /*, include_statistics = true*/ } = input
    
    return Excel.run(async (context: any) => {
      const worksheet = context.workbook.worksheets.getActiveWorksheet()
      const excelRange = worksheet.getRange(range)
      
      excelRange.load(['values', 'rowCount', 'columnCount'])
      await context.sync()
      
      const analysis: DataAnalysis = {
        dataTypes: [],
        rowCount: excelRange.rowCount,
        colCount: excelRange.columnCount
      }
      
      // Detect data types and headers
      if (excelRange.values.length > 0) {
        if (detect_headers) {
          analysis.headers = excelRange.values[0].map(String)
        }
        
        // Analyze data types
        for (let col = 0; col < excelRange.columnCount; col++) {
          let columnType = 'mixed'
          const values = excelRange.values.slice(detect_headers ? 1 : 0).map((row: any) => row[col])
          
          if (values.every((v: any) => typeof v === 'number')) {
            columnType = 'number'
          } else if (values.every((v: any) => typeof v === 'string')) {
            columnType = 'string'
          }
          
          analysis.dataTypes.push(columnType)
        }
      }
      
      return analysis
    })
  }

  private async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: Error | null = null
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error as Error
        console.warn(`Operation failed (attempt ${i + 1}/${maxRetries}):`, error)
        
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)))
        }
      }
    }
    
    throw lastError
  }

  private async toolFormatRange(input: any): Promise<any> {
    const { range, number_format, font, fill_color, alignment } = input
    
    console.log(`🎨 toolFormatRange called with:`, {
      range,
      number_format,
      font,
      fill_color,
      alignment
    })
    
    return this.retryOperation(async () => {
      return Excel.run(async (context: any) => {
      try {
        const worksheet = context.workbook.worksheets.getActiveWorksheet()
        const excelRange = worksheet.getRange(range)
        
        // Load the range first
        excelRange.load(['address'])
        await context.sync()
        console.log(`📍 Formatting range: ${excelRange.address}`)
      
      if (number_format) {
        // Comprehensive format mapping to prevent #VALUE! errors
        const formatMap: { [key: string]: string } = {
          // Basic formats
          'general': 'General',
          'number': '0.00',
          'integer': '0',
          'whole': '0',
          
          // Currency formats - most problematic area
          'currency': '$#,##0.00',
          'dollar': '$#,##0.00',
          'dollars': '$#,##0.00',
          'money': '$#,##0.00',
          'usd': '$#,##0.00',
          'cash': '$#,##0.00',
          'financial': '$#,##0.00',
          'currency_red': '$#,##0.00_);[Red]($#,##0.00)',
          'currency_positive': '$#,##0.00_);($#,##0.00)',
          
          // Accounting formats
          'accounting': '_($* #,##0.00_);_($* (#,##0.00);_($* "-"??_);_(@_)',
          'account': '_($* #,##0.00_);_($* (#,##0.00);_($* "-"??_);_(@_)',
          
          // Percentage formats - second most problematic
          'percentage': '0.00%',
          'percent': '0.00%',
          'pct': '0.00%',
          '%': '0.00%',
          'percentage_whole': '0%',
          'percent_whole': '0%',
          'percentage_1dp': '0.0%',
          'percent_1dp': '0.0%',
          
          // Financial-specific formats
          'basis_points': '0"bps"',
          'bps': '0"bps"',
          'multiple': '0.0"x"',
          'times': '0.0"x"',
          'ratio': '0.00',
          'factor': '0.00',
          'index': '0.00',
          'growth': '0.0%',
          'growth_rate': '0.0%',
          'margin': '0.0%',
          'return': '0.0%',
          'irr': '0.0%',
          'yield': '0.0%',
          'discount': '0.0%',
          'premium': '0.0%',
          
          // Number formats with commas
          'thousands': '#,##0',
          'comma': '#,##0.00',
          'comma_no_decimal': '#,##0',
          'millions': '#,##0,,"M"',
          'billions': '#,##0,,,"B"',
          'thousands_k': '#,##0,"K"',
          
          // Date formats
          'date': 'm/d/yyyy',
          'short_date': 'm/d/yy',
          'long_date': 'mmmm d, yyyy',
          'date_us': 'm/d/yyyy',
          'date_iso': 'yyyy-mm-dd',
          'month_year': 'mmm yyyy',
          'quarter': '"Q"q yyyy',
          'year': 'yyyy',
          
          // Time formats
          'time': 'h:mm:ss AM/PM',
          'time_24': 'h:mm:ss',
          'hours': 'h:mm',
          
          // Text formats
          'text': '@',
          'string': '@',
          
          // Scientific notation
          'scientific': '0.00E+00',
          'exponential': '0.00E+00',
          
          // Fractions
          'fraction': '# ?/?',
          'fraction_halves': '# ?/2',
          'fraction_quarters': '# ?/4',
          'fraction_eighths': '# ?/8',
          'fraction_sixteenths': '# ?/16',
          
          // Special formats for financial modeling
          'input': '0.00',  // Blue font for inputs
          'assumption': '0.00',
          'calculated': '0.00',  // Black font for calculations
          'output': '0.00',  // Bold for outputs
          'total': '0.00',
          'subtotal': '0.00',
          
          // Common Excel format variations that AI might use
          'decimal': '0.00',
          'fixed': '0.00',
          'float': '0.00',
          'numeric': '0.00'
        }
        
        // Validate and normalize format
        const actualFormat = this.validateAndNormalizeFormat(number_format, formatMap)
        
        console.log(`🎨 Format mapping: "${number_format}" -> "${actualFormat}"`)
        
        try {
          excelRange.numberFormat = actualFormat
        } catch (error) {
          console.error(`❌ Failed to apply number format "${actualFormat}":`, error)
          // Try fallback to General format
          try {
            excelRange.numberFormat = 'General'
            console.log(`⚠️ Applied fallback 'General' format instead of "${actualFormat}"`)
          } catch (fallbackError) {
            throw new Error(`Invalid number format and fallback failed: ${number_format}`)
          }
        }
      }
      
      if (font) {
        console.log(`🎨 Applying font formatting:`, font)
        
        try {
          // Get the font object but don't load properties yet
          const rangeFont = excelRange.format.font
          
          // Apply font properties directly without loading first
          // Excel API should handle the loading internally
          if (font.bold !== undefined && font.bold !== null) {
            console.log(`   Setting bold: ${font.bold}`)
            rangeFont.bold = font.bold
          }
          if (font.italic !== undefined && font.italic !== null) {
            console.log(`   Setting italic: ${font.italic}`)
            rangeFont.italic = font.italic
          }
          if (font.size !== undefined && font.size !== null && font.size > 0) {
            console.log(`   Setting size: ${font.size}`)
            rangeFont.size = font.size
          }
          if (font.color !== undefined && font.color !== null && font.color !== '') {
            console.log(`   Setting color: ${font.color}`)
            // Ensure color is in the right format (Excel expects hex without #)
            let colorValue = font.color
            if (colorValue.startsWith('#')) {
              colorValue = colorValue.substring(1)
            }
            rangeFont.color = colorValue
          }
          
          console.log(`✅ Font formatting properties set`)
        } catch (error) {
          console.error(`❌ Failed to apply font formatting:`, error)
          // Log more details about the error
          if (error instanceof Error) {
            console.error(`   Error name: ${error.name}`)
            console.error(`   Error message: ${error.message}`)
            console.error(`   Error stack: ${error.stack}`)
          }
          throw new Error(`Font formatting failed: ${(error as Error).message}`)
        }
      }
      
      if (fill_color) {
        console.log(`🎨 Applying fill color: ${fill_color}`)
        try {
          // Ensure color is in the right format (Excel expects hex without #)
          let colorValue = fill_color
          if (colorValue.startsWith('#')) {
            colorValue = colorValue.substring(1)
          }
          excelRange.format.fill.color = colorValue
          console.log(`✅ Fill color set to: ${colorValue}`)
        } catch (error) {
          console.error(`❌ Failed to apply fill color:`, error)
          if (error instanceof Error) {
            console.error(`   Error details: ${error.name} - ${error.message}`)
          }
          throw new Error(`Fill color formatting failed: ${(error as Error).message}`)
        }
      }
      
      if (alignment) {
        console.log(`🎨 Applying alignment:`, alignment)
        try {
          if (alignment.horizontal) {
            console.log(`   Setting horizontal alignment: ${alignment.horizontal}`)
            excelRange.format.horizontalAlignment = alignment.horizontal
          }
          if (alignment.vertical) {
            console.log(`   Setting vertical alignment: ${alignment.vertical}`)
            excelRange.format.verticalAlignment = alignment.vertical
          }
          console.log(`✅ Alignment set`)
        } catch (error) {
          console.error(`❌ Failed to apply alignment:`, error)
          if (error instanceof Error) {
            console.error(`   Error details: ${error.name} - ${error.message}`)
          }
          throw new Error(`Alignment formatting failed: ${(error as Error).message}`)
        }
      }
      
      await context.sync()
      
      // Log successful format attempt
      FormatErrorHandler.logFormatAttempt(input, true)
      
      return {
        message: 'Formatting applied successfully',
        status: 'success'
      }
      } catch (error) {
        console.error(`❌ toolFormatRange general error:`, error)
        
        // Log failed format attempt
        FormatErrorHandler.logFormatAttempt(input, false, error as Error)
        
        if (error instanceof Error) {
          console.error(`   Full error details:`, {
            name: error.name,
            message: error.message,
            stack: error.stack
          })
          
          // Use enhanced error handling
          const enhancedError = new Error(FormatErrorHandler.handleFormatError(error, input))
          enhancedError.name = error.name
          enhancedError.stack = error.stack
          throw enhancedError
        }
        throw error
      }
    })
    })
  }

  private async toolCreateChart(input: any): Promise<any> {
    const { data_range, chart_type, title, position, include_legend = true } = input
    
    return Excel.run(async (context: any) => {
      const worksheet = context.workbook.worksheets.getActiveWorksheet()
      const dataRange = worksheet.getRange(data_range)
      
      const chart = worksheet.charts.add(chart_type, dataRange, 'Auto')
      
      if (title) {
        chart.title.text = title
      }
      
      chart.legend.visible = include_legend
      
      if (position) {
        const positionRange = worksheet.getRange(position)
        chart.setPosition(positionRange, positionRange)
      }
      
      await context.sync()
      
      return {
        message: 'Chart created successfully',
        status: 'success'
      }
    })
  }

  private async toolValidateModel(input: any): Promise<ValidationResult> {
    const { range, /*check_circular_refs = true,*/ check_errors = true /*, check_formula_consistency = true*/ } = input
    
    return Excel.run(async (context: any) => {
      const worksheet = context.workbook.worksheets.getActiveWorksheet()
      const targetRange = range ? worksheet.getRange(range) : worksheet.getUsedRange()
      
      targetRange.load(['formulas', 'values'])
      await context.sync()
      
      const result: ValidationResult = {
        isValid: true,
        errors: []
      }
      
      // Check for errors in cells
      if (check_errors) {
        for (let i = 0; i < targetRange.values.length; i++) {
          for (let j = 0; j < targetRange.values[i].length; j++) {
            const value = targetRange.values[i][j]
            if (typeof value === 'string' && value.startsWith('#')) {
              result.isValid = false
              result.errors?.push({
                cell: `${String.fromCharCode(65 + j)}${i + 1}`,
                errorType: value,
                message: `Cell contains error: ${value}`
              })
            }
          }
        }
      }
      
      return result
    })
  }

  private async toolGetNamedRanges(input: any): Promise<NamedRange[]> {
    const { scope = 'workbook' } = input
    
    return Excel.run(async (context: any) => {
      const namedItems = scope === 'workbook' 
        ? context.workbook.names
        : context.workbook.worksheets.getActiveWorksheet().names
      
      namedItems.load(['items'])
      await context.sync()
      
      const result: NamedRange[] = []
      
      for (const item of namedItems.items) {
        item.load(['name', 'formula', 'comment'])
        await context.sync()
        
        result.push({
          name: item.name,
          range: item.formula,
          scope: scope,
          comment: item.comment
        })
      }
      
      return result
    })
  }

  private async toolCreateNamedRange(input: any): Promise<any> {
    const { name, range } = input
    
    return Excel.run(async (context: any) => {
      const worksheet = context.workbook.worksheets.getActiveWorksheet()
      context.workbook.names.add(name, worksheet.getRange(range))
      
      await context.sync()
      
      return {
        message: `Named range '${name}' created successfully`,
        status: 'success'
      }
    })
  }

  private async toolInsertRowsColumns(input: any): Promise<any> {
    const { position, type, count = 1 } = input
    
    return Excel.run(async (context: any) => {
      const worksheet = context.workbook.worksheets.getActiveWorksheet()
      
      if (type === 'rows') {
        const range = worksheet.getRange(`${position}:${position}`)
        range.insert('Down')
      } else {
        const range = worksheet.getRange(`${position}:${position}`)
        range.insert('Right')
      }
      
      await context.sync()
      
      return {
        message: `Inserted ${count} ${type} at position ${position}`,
        status: 'success'
      }
    })
  }

  async writeRange(range: string, values: any[][]): Promise<any> {
    return this.toolWriteRange({ range, values })
  }

  async applyFormula(range: string, formula: string): Promise<any> {
    return this.toolApplyFormula({ range, formula })
  }
}