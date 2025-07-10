import { SpreadsheetAdapter, Range, WorkbookInfo, SpreadsheetChange } from '@shared/types/spreadsheet'

// Office.js types will be available when running as an Office Add-in
declare const Office: any
declare const Excel: any

export class ExcelAdapter implements SpreadsheetAdapter {
  private isConnected: boolean = false
  private changeCallbacks: Set<(change: SpreadsheetChange) => void> = new Set()
  private isOfficeAddin: boolean = false
  private changeHandler: any = null

  async connect(): Promise<boolean> {
    try {
      // Check if we're running as an Office Add-in
      if (typeof Office !== 'undefined' && Office.context) {
        this.isOfficeAddin = true
        
        // Initialize Office.js
        await this.initializeOffice()
        
        this.isConnected = true
        console.log('Excel adapter connected via Office.js')
        
        // Subscribe to selection changes
        this.subscribeToSelectionChanges()
        
        return true
      } else {
        // Fallback to simulated mode for development
        this.isConnected = true
        console.log('Excel adapter connected (simulated - Office.js not available)')
        return true
      }
    } catch (error) {
      console.error('Failed to connect to Excel:', error)
      return false
    }
  }

  async disconnect(): Promise<void> {
    this.isConnected = false
    this.changeCallbacks.clear()
    
    // Remove Office.js event handlers
    if (this.isOfficeAddin && this.changeHandler) {
      try {
        await Excel.run(async (context) => {
          this.changeHandler.remove()
          await context.sync()
        })
      } catch (error) {
        console.error('Error removing event handler:', error)
      }
    }
  }

  async getActiveRange(): Promise<Range> {
    if (!this.isConnected) {
      throw new Error('Not connected to Excel')
    }

    if (this.isOfficeAddin) {
      return await Excel.run(async (context) => {
        const range = context.workbook.getSelectedRange()
        range.load(['address', 'values', 'formulas', 'rowCount', 'columnCount'])
        
        await context.sync()
        
        return {
          address: range.address,
          values: range.values,
          formulas: range.formulas,
          rowCount: range.rowCount,
          columnCount: range.columnCount
        }
      })
    } else {
      // Simulated active range for development
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
  }

  async getCellValue(cell: string): Promise<any> {
    if (!this.isConnected) {
      throw new Error('Not connected to Excel')
    }
    
    if (this.isOfficeAddin) {
      return await Excel.run(async (context) => {
        const range = context.workbook.worksheets.getActiveWorksheet().getRange(cell)
        range.load('values')
        
        await context.sync()
        
        return range.values[0][0]
      })
    } else {
      // Simulated cell value
      return `Value at ${cell}`
    }
  }

  async setCellValue(cell: string, value: any): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Not connected to Excel')
    }

    const oldValue = await this.getCellValue(cell)
    
    if (this.isOfficeAddin) {
      await Excel.run(async (context) => {
        const range = context.workbook.worksheets.getActiveWorksheet().getRange(cell)
        range.values = [[value]]
        
        await context.sync()
      })
    }
    
    // Notify callbacks
    const change: SpreadsheetChange = {
      type: 'cell',
      target: cell,
      oldValue,
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

    if (this.isOfficeAddin) {
      await Excel.run(async (context) => {
        const range = context.workbook.worksheets.getActiveWorksheet().getRange(cell)
        range.formulas = [[formula]]
        
        await context.sync()
      })
      
      // Notify about the change
      const change: SpreadsheetChange = {
        type: 'formula',
        target: cell,
        oldValue: await this.getCellValue(cell),
        newValue: formula,
        timestamp: new Date()
      }
      this.notifyChange(change)
    } else {
      await this.setCellValue(cell, formula)
    }
  }

  async subscribeToChanges(callback: (change: SpreadsheetChange) => void): Promise<void> {
    this.changeCallbacks.add(callback)
  }

  async getWorkbookInfo(): Promise<WorkbookInfo> {
    if (!this.isConnected) {
      throw new Error('Not connected to Excel')
    }

    if (this.isOfficeAddin) {
      return await Excel.run(async (context) => {
        const workbook = context.workbook
        const worksheets = workbook.worksheets
        const activeSheet = worksheets.getActiveWorksheet()
        
        workbook.load('name')
        worksheets.load(['items', 'count'])
        activeSheet.load('name')
        
        await context.sync()
        
        const sheets = []
        for (let i = 0; i < worksheets.items.length; i++) {
          const sheet = worksheets.items[i]
          sheet.load(['name', 'visibility', 'protection/protected'])
        }
        
        await context.sync()
        
        return {
          name: workbook.name,
          sheets: worksheets.items.map((sheet, index) => ({
            id: sheet.id || index.toString(),
            name: sheet.name,
            index: index,
            visible: sheet.visibility === Excel.SheetVisibility.visible,
            protected: sheet.protection?.protected || false
          })),
          activeSheet: activeSheet.name
        }
      })
    } else {
      // Simulated workbook info
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
  
  /**
   * Initialize Office.js
   */
  private async initializeOffice(): Promise<void> {
    return new Promise((resolve, reject) => {
      Office.initialize = () => {
        resolve()
      }
      
      // Timeout after 5 seconds
      setTimeout(() => {
        reject(new Error('Office.js initialization timeout'))
      }, 5000)
    })
  }
  
  /**
   * Subscribe to Excel selection change events
   */
  private async subscribeToSelectionChanges(): Promise<void> {
    if (!this.isOfficeAddin) return
    
    await Excel.run(async (context) => {
      const worksheet = context.workbook.worksheets.getActiveWorksheet()
      
      this.changeHandler = worksheet.onSelectionChanged.add(async () => {
        try {
          const range = await this.getActiveRange()
          const change: SpreadsheetChange = {
            type: 'selection',
            target: range.address,
            timestamp: new Date()
          }
          this.notifyChange(change)
        } catch (error) {
          console.error('Error handling selection change:', error)
        }
      })
      
      await context.sync()
    })
  }
}