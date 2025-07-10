import { SpreadsheetAdapter, Range, WorkbookInfo, SpreadsheetChange } from '@shared/types/spreadsheet'
import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

export class ExcelAdapter implements SpreadsheetAdapter {
  private isConnected: boolean = false
  private changeCallbacks: Set<(change: SpreadsheetChange) => void> = new Set()

  async connect(): Promise<boolean> {
    try {
      // In production, this would use Office.js API
      // For MVP, we'll simulate connection
      this.isConnected = true
      console.log('Excel adapter connected (simulated)')
      return true
    } catch (error) {
      console.error('Failed to connect to Excel:', error)
      return false
    }
  }

  async disconnect(): Promise<void> {
    this.isConnected = false
    this.changeCallbacks.clear()
  }

  async getActiveRange(): Promise<Range> {
    if (!this.isConnected) {
      throw new Error('Not connected to Excel')
    }

    // Simulated active range for MVP
    return {
      address: 'A1:D10',
      values: [
        ['Revenue', 2021, 2022, 2023],
        ['Product A', 1000000, 1200000, 1400000],
        ['Product B', 800000, 900000, 1100000],
        ['Total', '=B2+B3', '=C2+C3', '=D2+D3']
      ],
      formulas: [
        ['', '', '', ''],
        ['', '', '', ''],
        ['', '', '', ''],
        ['', '=B2+B3', '=C2+C3', '=D2+D3']
      ],
      rowCount: 4,
      columnCount: 4
    }
  }

  async getCellValue(cell: string): Promise<any> {
    if (!this.isConnected) {
      throw new Error('Not connected to Excel')
    }
    
    // Simulated cell value
    return `Value at ${cell}`
  }

  async setCellValue(cell: string, value: any): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Not connected to Excel')
    }

    // Simulate setting value and notify callbacks
    const change: SpreadsheetChange = {
      type: 'cell',
      target: cell,
      oldValue: await this.getCellValue(cell),
      newValue: value,
      timestamp: new Date()
    }

    this.notifyChange(change)
  }

  async addFormula(cell: string, formula: string): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Not connected to Excel')
    }

    if (!formula.startsWith('=')) {
      formula = '=' + formula
    }

    await this.setCellValue(cell, formula)
  }

  async subscribeToChanges(callback: (change: SpreadsheetChange) => void): Promise<void> {
    this.changeCallbacks.add(callback)
  }

  async getWorkbookInfo(): Promise<WorkbookInfo> {
    if (!this.isConnected) {
      throw new Error('Not connected to Excel')
    }

    return {
      name: 'Financial_Model_2024.xlsx',
      path: 'C:\\Users\\Documents\\Financial_Model_2024.xlsx',
      sheets: [
        { id: '1', name: 'Revenue', index: 0, visible: true, protected: false },
        { id: '2', name: 'Costs', index: 1, visible: true, protected: false },
        { id: '3', name: 'DCF', index: 2, visible: true, protected: true }
      ],
      activeSheet: 'Revenue'
    }
  }

  private notifyChange(change: SpreadsheetChange): void {
    this.changeCallbacks.forEach(callback => {
      try {
        callback(change)
      } catch (error) {
        console.error('Error in change callback:', error)
      }
    })
  }
}