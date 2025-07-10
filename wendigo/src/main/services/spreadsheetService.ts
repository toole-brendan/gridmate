import { SpreadsheetAdapter } from '@shared/types/spreadsheet'
import { ExcelAdapter } from './adapters/excelAdapter'
import { SheetsAdapter } from './adapters/sheetsAdapter'

export class SpreadsheetService {
  private adapter: SpreadsheetAdapter | null = null
  private type: 'excel' | 'sheets' | null = null

  async connect(type: 'excel' | 'sheets'): Promise<boolean> {
    try {
      this.type = type
      
      if (type === 'excel') {
        this.adapter = new ExcelAdapter()
      } else {
        this.adapter = new SheetsAdapter()
      }
      
      return await this.adapter.connect()
    } catch (error) {
      console.error(`Failed to connect to ${type}:`, error)
      throw error
    }
  }

  async disconnect(): Promise<void> {
    if (this.adapter) {
      await this.adapter.disconnect()
      this.adapter = null
      this.type = null
    }
  }

  async getActiveRange(): Promise<any> {
    if (!this.adapter) {
      throw new Error('No spreadsheet connected')
    }
    return await this.adapter.getActiveRange()
  }

  async getCellValue(cell: string): Promise<any> {
    if (!this.adapter) {
      throw new Error('No spreadsheet connected')
    }
    return await this.adapter.getCellValue(cell)
  }

  async setCellValue(cell: string, value: any): Promise<void> {
    if (!this.adapter) {
      throw new Error('No spreadsheet connected')
    }
    return await this.adapter.setCellValue(cell, value)
  }

  async addFormula(cell: string, formula: string): Promise<void> {
    if (!this.adapter) {
      throw new Error('No spreadsheet connected')
    }
    return await this.adapter.addFormula(cell, formula)
  }

  async subscribeToChanges(callback: (change: any) => void): Promise<void> {
    if (!this.adapter) {
      throw new Error('No spreadsheet connected')
    }
    return await this.adapter.subscribeToChanges(callback)
  }

  async getWorkbookInfo(): Promise<any> {
    if (!this.adapter) {
      throw new Error('No spreadsheet connected')
    }
    return await this.adapter.getWorkbookInfo()
  }
}