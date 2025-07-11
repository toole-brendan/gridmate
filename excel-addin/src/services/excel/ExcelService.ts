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
}