import { SpreadsheetAdapter } from '@shared/types/spreadsheet'
import { ExcelAdapter } from './adapters/excelAdapter'
import { SheetsAdapter } from './adapters/sheetsAdapter'

export class SpreadsheetService {
  private adapter: SpreadsheetAdapter | null = null
  private type: 'excel' | 'sheets' | null = null
  private spreadsheetId: string | null = null

  async connect(type: 'excel' | 'sheets', options?: { spreadsheetId?: string }): Promise<boolean> {
    try {
      this.type = type
      
      if (type === 'excel') {
        this.adapter = new ExcelAdapter()
      } else {
        // For Google Sheets, spreadsheetId is required
        if (!options?.spreadsheetId) {
          throw new Error('spreadsheetId is required for Google Sheets connection')
        }
        this.spreadsheetId = options.spreadsheetId
        this.adapter = new SheetsAdapter(options.spreadsheetId)
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
      this.spreadsheetId = null
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