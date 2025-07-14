declare const Excel: any

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
      includeFormatting = false
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
    return Excel.run(async (context: any) => {
      const workbook = context.workbook
      const worksheet = workbook.worksheets.getActiveWorksheet()
      const selectedRange = workbook.getSelectedRange()

      workbook.load('name')
      worksheet.load('name')
      selectedRange.load(['address', 'rowIndex', 'columnIndex', 'rowCount', 'columnCount'])

      await context.sync()

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
        console.log('Could not get nearby range')
      }

      return result
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
      throw error
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
    const { range, values, preserve_formatting = true } = input
    
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
        throw new Error(`Failed to write values: ${error.message}`)
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
      
      if (relative_references) {
        // Apply formula with relative references
        excelRange.formulas = [[formula]]
      } else {
        // Apply formula to all cells
        excelRange.formulas = [[formula]]
      }
      
      await context.sync()
      
      return {
        message: 'Formula applied successfully',
        status: 'success'
      }
    })
  }

  private async toolAnalyzeData(input: any): Promise<DataAnalysis> {
    const { range, detect_headers = true, include_statistics = true } = input
    
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
          const values = excelRange.values.slice(detect_headers ? 1 : 0).map(row => row[col])
          
          if (values.every(v => typeof v === 'number')) {
            columnType = 'number'
          } else if (values.every(v => typeof v === 'string')) {
            columnType = 'string'
          }
          
          analysis.dataTypes.push(columnType)
        }
      }
      
      return analysis
    })
  }

  private async toolFormatRange(input: any): Promise<any> {
    const { range, number_format, font, fill_color, alignment } = input
    
    return Excel.run(async (context: any) => {
      const worksheet = context.workbook.worksheets.getActiveWorksheet()
      const excelRange = worksheet.getRange(range)
      
      if (number_format) {
        // Map common format names to Excel format codes
        const formatMap: { [key: string]: string } = {
          'general': 'General',
          'number': '0.00',
          'currency': '$#,##0.00',
          'accounting': '_($* #,##0.00_);_($* (#,##0.00);_($* "-"??_);_(@_)',
          'percentage': '0.00%',
          'percent': '0.00%',
          'date': 'm/d/yyyy',
          'short date': 'm/d/yy',
          'long date': 'mmmm d, yyyy',
          'time': 'h:mm:ss AM/PM',
          'text': '@',
          'scientific': '0.00E+00',
          'fraction': '# ?/?'
        }
        
        // Check if it's a common format name, otherwise use as-is
        const actualFormat = formatMap[number_format.toLowerCase()] || number_format
        
        console.log(`🎨 Format mapping: "${number_format}" -> "${actualFormat}"`)
        
        try {
          excelRange.numberFormat = actualFormat
        } catch (error) {
          console.error(`❌ Failed to apply number format "${actualFormat}":`, error)
          throw new Error(`Invalid number format: ${number_format}`)
        }
      }
      
      if (font) {
        const rangeFont = excelRange.format.font
        if (font.bold !== undefined) rangeFont.bold = font.bold
        if (font.italic !== undefined) rangeFont.italic = font.italic
        if (font.size !== undefined) rangeFont.size = font.size
        if (font.color !== undefined) rangeFont.color = font.color
      }
      
      if (fill_color) {
        excelRange.format.fill.color = fill_color
      }
      
      if (alignment) {
        if (alignment.horizontal) {
          excelRange.format.horizontalAlignment = alignment.horizontal
        }
        if (alignment.vertical) {
          excelRange.format.verticalAlignment = alignment.vertical
        }
      }
      
      await context.sync()
      
      return {
        message: 'Formatting applied successfully',
        status: 'success'
      }
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
    const { range, check_circular_refs = true, check_errors = true, check_formula_consistency = true } = input
    
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
}