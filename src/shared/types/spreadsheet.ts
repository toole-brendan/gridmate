export interface Range {
  address: string
  values: any[][]
  formulas: string[][]
  rowCount: number
  columnCount: number
}

export interface CellInfo {
  address: string
  value: any
  formula?: string
  format?: CellFormat
  validation?: DataValidation
}

export interface CellFormat {
  numberFormat?: string
  font?: {
    name?: string
    size?: number
    bold?: boolean
    italic?: boolean
    color?: string
  }
  fill?: {
    color?: string
    pattern?: string
  }
  borders?: {
    top?: BorderStyle
    bottom?: BorderStyle
    left?: BorderStyle
    right?: BorderStyle
  }
}

export interface BorderStyle {
  style: 'thin' | 'medium' | 'thick' | 'double'
  color?: string
}

export interface DataValidation {
  type: 'list' | 'number' | 'date' | 'custom'
  operator?: 'between' | 'notBetween' | 'equal' | 'notEqual' | 'greaterThan' | 'lessThan'
  formula1?: string
  formula2?: string
  list?: string[]
  showDropdown?: boolean
  errorMessage?: string
}

export interface WorkbookInfo {
  name: string
  path?: string
  sheets: SheetInfo[]
  activeSheet: string
}

export interface SheetInfo {
  id: string
  name: string
  index: number
  visible: boolean
  protected: boolean
}

export interface SpreadsheetAdapter {
  connect(): Promise<boolean>
  disconnect(): Promise<void>
  getActiveRange(): Promise<Range>
  getCellValue(cell: string): Promise<any>
  setCellValue(cell: string, value: any): Promise<void>
  addFormula(cell: string, formula: string): Promise<void>
  subscribeToChanges(callback: (change: SpreadsheetChange) => void): Promise<void>
  getWorkbookInfo(): Promise<WorkbookInfo>
}

export interface SpreadsheetChange {
  type: 'cell' | 'range' | 'sheet' | 'workbook' | 'formula' | 'selection'
  target: string
  oldValue?: any
  newValue?: any
  timestamp: Date
}