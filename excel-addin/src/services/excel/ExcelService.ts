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

  async readRange(address: string): Promise<CellData[][]> {
    return Excel.run(async (context: any) => {
      const worksheet = context.workbook.worksheets.getActiveWorksheet()
      const range = worksheet.getRange(address)
      
      range.load(['values', 'formulas', 'address'])
      await context.sync()

      const rows: CellData[][] = []
      for (let i = 0; i < range.values.length; i++) {
        const row: CellData[] = []
        for (let j = 0; j < range.values[i].length; j++) {
          row.push({
            address: this.getCellAddress(range.address, i, j),
            value: range.values[i][j],
            formula: range.formulas[i][j]
          })
        }
        rows.push(row)
      }

      return rows
    })
  }

  async writeRange(address: string, values: any[][]): Promise<void> {
    return Excel.run(async (context: any) => {
      const worksheet = context.workbook.worksheets.getActiveWorksheet()
      const range = worksheet.getRange(address)
      
      range.values = values
      await context.sync()
    })
  }

  async applyFormula(address: string, formula: string): Promise<void> {
    return Excel.run(async (context: any) => {
      const worksheet = context.workbook.worksheets.getActiveWorksheet()
      const range = worksheet.getRange(address)
      
      range.formulas = [[formula]]
      await context.sync()
    })
  }

  subscribeToChanges(callback: (change: any) => void): void {
    Excel.run(async (context: any) => {
      const worksheet = context.workbook.worksheets.getActiveWorksheet()
      
      worksheet.onSelectionChanged.add(async (event: any) => {
        const changeContext = await this.getContext()
        callback({
          type: 'selection',
          context: changeContext
        })
      })

      worksheet.onChanged.add(async (event: any) => {
        callback({
          type: 'data',
          details: event
        })
      })
    })
  }

  private getCellAddress(rangeAddress: string, row: number, col: number): string {
    // Simple implementation - would need enhancement for complex ranges
    const match = rangeAddress.match(/([A-Z]+)(\d+)/)
    if (match) {
      const baseCol = match[1]
      const baseRow = parseInt(match[2])
      return `${this.columnIndexToLetter(this.letterToColumnIndex(baseCol) + col)}${baseRow + row}`
    }
    return rangeAddress
  }

  private letterToColumnIndex(letter: string): number {
    let index = 0
    for (let i = 0; i < letter.length; i++) {
      index = index * 26 + (letter.charCodeAt(i) - 64)
    }
    return index - 1
  }

  private columnIndexToLetter(index: number): string {
    let letter = ''
    index++
    while (index > 0) {
      const remainder = (index - 1) % 26
      letter = String.fromCharCode(65 + remainder) + letter
      index = Math.floor((index - 1) / 26)
    }
    return letter
  }

  // Tool execution methods
  async executeToolRequest(tool: string, input: any): Promise<any> {
    console.log(`🔧 ExcelService.executeToolRequest called for tool: ${tool}`)
    
    // Check if Excel is available
    if (typeof Excel === 'undefined') {
      throw new Error('Excel API is not available. The add-in might not be properly loaded in Excel.')
    }
    
    try {
      switch (tool) {
        case 'read_range':
          return this.toolReadRange(input)
        case 'write_range':
          return this.toolWriteRange(input)
        case 'apply_formula':
          return this.toolApplyFormula(input)
        case 'analyze_data':
          return this.toolAnalyzeData(input)
        case 'format_range':
          return this.toolFormatRange(input)
        case 'create_chart':
          return this.toolCreateChart(input)
        case 'validate_model':
          return this.toolValidateModel(input)
        case 'get_named_ranges':
          return this.toolGetNamedRanges(input)
        case 'create_named_range':
          return this.toolCreateNamedRange(input)
        case 'insert_rows_columns':
          return this.toolInsertRowsColumns(input)
        default:
          throw new Error(`Unknown tool: ${tool}`)
      }
    } catch (error) {
      console.error(`❌ ExcelService tool execution failed:`, error)
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

  private async toolWriteRange(input: any): Promise<void> {
    const { range, values, preserve_formatting = true } = input
    
    console.log('📝 toolWriteRange called with:')
    console.log('  Range:', range)
    console.log('  Values:', JSON.stringify(values))
    console.log('  Values type:', typeof values)
    console.log('  Is array:', Array.isArray(values))
    if (Array.isArray(values)) {
      console.log('  Values length:', values.length)
      console.log('  First row:', values[0])
      console.log('  First row is array:', Array.isArray(values[0]))
    }
    
    return Excel.run(async (context: any) => {
      try {
        const worksheet = context.workbook.worksheets.getActiveWorksheet()
        const excelRange = worksheet.getRange(range)
        
        // Load range properties to check dimensions
        excelRange.load(['rowCount', 'columnCount', 'address'])
        await context.sync()
        
        console.log('📐 Range properties:')
        console.log('  Address:', excelRange.address)
        console.log('  Rows:', excelRange.rowCount)
        console.log('  Columns:', excelRange.columnCount)
        
        // Validate that values is a 2D array
        if (!Array.isArray(values) || !Array.isArray(values[0])) {
          throw new Error('Values must be a 2D array (array of arrays)')
        }
        
        // Check dimensions match
        if (values.length !== excelRange.rowCount || values[0].length !== excelRange.columnCount) {
          throw new Error(`Values dimensions (${values.length}x${values[0].length}) don't match range dimensions (${excelRange.rowCount}x${excelRange.columnCount})`)
        }
        
        if (!preserve_formatting) {
          excelRange.clear(Excel.ClearApplyTo.formats)
        }
        
        excelRange.values = values
        await context.sync()
        
        console.log('✅ toolWriteRange completed successfully')
      } catch (error) {
        console.error('❌ toolWriteRange error:', error)
        throw error
      }
    })
  }

  private async toolApplyFormula(input: any): Promise<void> {
    const { range, formula, relative_references = true } = input
    
    return Excel.run(async (context: any) => {
      const worksheet = context.workbook.worksheets.getActiveWorksheet()
      const excelRange = worksheet.getRange(range)
      
      excelRange.load(['rowCount', 'columnCount', 'address'])
      await context.sync()
      
      if (excelRange.rowCount === 1 && excelRange.columnCount === 1) {
        // Single cell
        excelRange.formulas = [[formula]]
      } else {
        // Multiple cells
        if (relative_references) {
          // For relative references, we need to apply the formula to each cell
          // and let Excel adjust the references automatically
          // We do this by setting the formula property (singular) which applies
          // the formula to all cells in the range with relative reference adjustment
          excelRange.formula = formula
        } else {
          // For absolute references, apply the same formula to all cells
          const formulas = []
          for (let i = 0; i < excelRange.rowCount; i++) {
            const row = []
            for (let j = 0; j < excelRange.columnCount; j++) {
              row.push(formula)
            }
            formulas.push(row)
          }
          excelRange.formulas = formulas
        }
      }
      
      await context.sync()
    })
  }

  private async toolAnalyzeData(input: any): Promise<DataAnalysis> {
    const { range, include_statistics = true, detect_headers = true } = input
    
    return Excel.run(async (context: any) => {
      const worksheet = context.workbook.worksheets.getActiveWorksheet()
      const excelRange = worksheet.getRange(range)
      
      excelRange.load(['values', 'rowCount', 'columnCount'])
      await context.sync()
      
      const values = excelRange.values
      const result: DataAnalysis = {
        dataTypes: [],
        rowCount: excelRange.rowCount,
        colCount: excelRange.columnCount
      }
      
      // Detect data types
      const columnTypes: string[] = []
      for (let col = 0; col < excelRange.columnCount; col++) {
        let type = 'unknown'
        for (let row = detect_headers ? 1 : 0; row < excelRange.rowCount; row++) {
          const value = values[row][col]
          if (value !== null && value !== '') {
            if (typeof value === 'number') {
              type = 'number'
              break
            } else if (typeof value === 'string') {
              type = 'string'
              break
            }
          }
        }
        columnTypes.push(type)
      }
      result.dataTypes = columnTypes
      
      // Detect headers
      if (detect_headers && excelRange.rowCount > 0) {
        const firstRow = values[0]
        const headers = firstRow.filter((val: any) => typeof val === 'string' && val !== '')
        if (headers.length === excelRange.columnCount) {
          result.headers = headers
        }
      }
      
      // Calculate statistics for numeric columns
      if (include_statistics) {
        const stats: Record<string, any> = {}
        for (let col = 0; col < columnTypes.length; col++) {
          if (columnTypes[col] === 'number') {
            const columnData = []
            for (let row = result.headers ? 1 : 0; row < excelRange.rowCount; row++) {
              const value = values[row][col]
              if (typeof value === 'number') {
                columnData.push(value)
              }
            }
            
            if (columnData.length > 0) {
              const colName = result.headers ? result.headers[col] : `Column${col + 1}`
              stats[colName] = {
                count: columnData.length,
                mean: columnData.reduce((a, b) => a + b, 0) / columnData.length,
                min: Math.min(...columnData),
                max: Math.max(...columnData)
              }
            }
          }
        }
        result.statistics = stats
      }
      
      return result
    })
  }

  private async toolFormatRange(input: any): Promise<void> {
    const { range, number_format, font, fill_color, alignment } = input
    
    return Excel.run(async (context: any) => {
      const worksheet = context.workbook.worksheets.getActiveWorksheet()
      const excelRange = worksheet.getRange(range)
      
      if (number_format) {
        excelRange.numberFormat = number_format
      }
      
      if (font) {
        if (font.bold !== undefined) excelRange.format.font.bold = font.bold
        if (font.italic !== undefined) excelRange.format.font.italic = font.italic
        if (font.size !== undefined) excelRange.format.font.size = font.size
        if (font.color !== undefined) excelRange.format.font.color = font.color
      }
      
      if (fill_color) {
        excelRange.format.fill.color = fill_color
      }
      
      if (alignment) {
        if (alignment.horizontal) excelRange.format.horizontalAlignment = alignment.horizontal
        if (alignment.vertical) excelRange.format.verticalAlignment = alignment.vertical
      }
      
      await context.sync()
    })
  }

  private async toolCreateChart(input: any): Promise<void> {
    const { data_range, chart_type, title, position, include_legend = true } = input
    
    return Excel.run(async (context: any) => {
      const worksheet = context.workbook.worksheets.getActiveWorksheet()
      const sourceData = worksheet.getRange(data_range)
      
      const chart = worksheet.charts.add(chart_type, sourceData, Excel.ChartSeriesBy.auto)
      
      if (title) {
        chart.title.text = title
      }
      
      chart.legend.visible = include_legend
      
      if (position) {
        const posRange = worksheet.getRange(position)
        chart.setPosition(posRange.getCell(0, 0), posRange.getCell(0, 0))
      }
      
      await context.sync()
    })
  }

  private async toolValidateModel(input: any): Promise<ValidationResult> {
    const { range, check_circular_refs = true, check_formula_consistency = true, check_errors = true } = input
    
    return Excel.run(async (context: any) => {
      const worksheet = context.workbook.worksheets.getActiveWorksheet()
      const excelRange = range ? worksheet.getRange(range) : worksheet.getUsedRange()
      
      if (!excelRange) {
        return { isValid: true }
      }
      
      excelRange.load(['formulas', 'values', 'address'])
      await context.sync()
      
      const result: ValidationResult = {
        isValid: true,
        errors: []
      }
      
      // Check for errors
      if (check_errors) {
        for (let row = 0; row < excelRange.values.length; row++) {
          for (let col = 0; col < excelRange.values[row].length; col++) {
            const value = excelRange.values[row][col]
            if (typeof value === 'string' && value.startsWith('#')) {
              result.isValid = false
              result.errors!.push({
                cell: this.getCellAddress(excelRange.address, row, col),
                errorType: value,
                message: `Cell contains error: ${value}`
              })
            }
          }
        }
      }
      
      // Basic formula consistency check
      if (check_formula_consistency) {
        const formulaPatterns: Map<string, string[]> = new Map()
        
        for (let row = 0; row < excelRange.formulas.length; row++) {
          for (let col = 0; col < excelRange.formulas[row].length; col++) {
            const formula = excelRange.formulas[row][col]
            if (formula && typeof formula === 'string' && formula.startsWith('=')) {
              // Group formulas by pattern (simplified)
              const pattern = formula.replace(/[A-Z]+\d+/g, 'REF').replace(/\d+/g, 'NUM')
              if (!formulaPatterns.has(pattern)) {
                formulaPatterns.set(pattern, [])
              }
              formulaPatterns.get(pattern)!.push(this.getCellAddress(excelRange.address, row, col))
            }
          }
        }
        
        // Report inconsistencies (simplified)
        result.inconsistentFormulas = []
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
      }
      
      await context.sync()
      
      for (const item of namedItems.items) {
        result.push({
          name: item.name,
          range: item.formula,
          scope: scope,
          comment: item.comment || undefined
        })
      }
      
      return result
    })
  }

  private async toolCreateNamedRange(input: any): Promise<void> {
    const { name, range } = input
    
    return Excel.run(async (context: any) => {
      const worksheet = context.workbook.worksheets.getActiveWorksheet()
      const excelRange = worksheet.getRange(range)
      
      context.workbook.names.add(name, excelRange)
      await context.sync()
    })
  }

  private async toolInsertRowsColumns(input: any): Promise<void> {
    const { position, count = 1, type } = input
    
    return Excel.run(async (context: any) => {
      const worksheet = context.workbook.worksheets.getActiveWorksheet()
      
      if (type === 'rows') {
        // Parse row number from position
        const rowMatch = position.match(/\d+/)
        if (rowMatch) {
          const rowIndex = parseInt(rowMatch[0]) - 1
          const range = worksheet.getRangeByIndexes(rowIndex, 0, 1, 1)
          range.insertEntireRow(Excel.InsertShiftDirection.down)
        }
      } else if (type === 'columns') {
        // Parse column letter from position
        const colMatch = position.match(/[A-Z]+/)
        if (colMatch) {
          const colIndex = this.letterToColumnIndex(colMatch[0])
          const range = worksheet.getRangeByIndexes(0, colIndex, 1, 1)
          range.insertEntireColumn(Excel.InsertShiftDirection.right)
        }
      }
      
      await context.sync()
    })
  }
}