import { SpreadsheetAdapter, Range, WorkbookInfo, SpreadsheetChange } from '@shared/types/spreadsheet'
import { sheets_v4 } from 'googleapis'
import { GoogleAuthService } from '../auth/googleAuthService'

export class SheetsAdapter implements SpreadsheetAdapter {
  private isConnected: boolean = false
  private changeCallbacks: Set<(change: SpreadsheetChange) => void> = new Set()
  private spreadsheetId: string = ''
  private sheetsClient: sheets_v4.Sheets | null = null
  private authService: GoogleAuthService
  private pollInterval: NodeJS.Timeout | null = null
  private lastSnapshot: any = null

  constructor(spreadsheetId?: string) {
    this.authService = GoogleAuthService.getInstance()
    if (spreadsheetId) {
      this.spreadsheetId = spreadsheetId
    }
  }

  async connect(): Promise<boolean> {
    try {
      // Authenticate and get Sheets client
      this.sheetsClient = await this.authService.getSheetsClient()
      
      // If no spreadsheet ID provided, prompt user to select one
      if (!this.spreadsheetId) {
        // For now, we'll require the spreadsheet ID to be passed
        throw new Error('Spreadsheet ID is required for connection')
      }
      
      // Verify access to the spreadsheet
      await this.sheetsClient.spreadsheets.get({
        spreadsheetId: this.spreadsheetId
      })
      
      this.isConnected = true
      console.log('Connected to Google Sheets:', this.spreadsheetId)
      
      // Start polling for changes
      this.startChangePolling()
      
      return true
    } catch (error) {
      console.error('Failed to connect to Google Sheets:', error)
      this.isConnected = false
      return false
    }
  }

  async disconnect(): Promise<void> {
    this.isConnected = false
    this.changeCallbacks.clear()
    
    // Stop polling
    if (this.pollInterval) {
      clearInterval(this.pollInterval)
      this.pollInterval = null
    }
    
    this.sheetsClient = null
  }

  async getActiveRange(): Promise<Range> {
    if (!this.isConnected || !this.sheetsClient) {
      throw new Error('Not connected to Google Sheets')
    }

    try {
      // Get the active sheet name (default to first sheet)
      const spreadsheet = await this.sheetsClient.spreadsheets.get({
        spreadsheetId: this.spreadsheetId
      })
      
      const sheets = spreadsheet.data.sheets || []
      if (sheets.length === 0) {
        throw new Error('No sheets found in spreadsheet')
      }
      
      const activeSheet = sheets[0].properties?.title || 'Sheet1'
      
      // For now, get a reasonable default range (A1:Z100)
      // In a real implementation, we'd track the actual selected range
      const range = `${activeSheet}!A1:Z100`
      
      // Get values
      const valuesResponse = await this.sheetsClient.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range,
        valueRenderOption: 'UNFORMATTED_VALUE'
      })
      
      // Get formulas
      const formulasResponse = await this.sheetsClient.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range,
        valueRenderOption: 'FORMULA'
      })
      
      const values = valuesResponse.data.values || []
      const formulas = formulasResponse.data.values || []
      
      // Find actual data bounds
      let maxRow = 0
      let maxCol = 0
      
      for (let i = 0; i < values.length; i++) {
        const row = values[i]
        if (row && row.length > 0) {
          maxRow = i + 1
          maxCol = Math.max(maxCol, row.length)
        }
      }
      
      // Trim to actual data
      const trimmedValues = values.slice(0, maxRow).map(row => 
        row ? row.slice(0, maxCol) : []
      )
      const trimmedFormulas = formulas.slice(0, maxRow).map(row => 
        row ? row.slice(0, maxCol) : []
      )
      
      return {
        address: `${activeSheet}!A1:${this.columnToLetter(maxCol)}${maxRow}`,
        values: trimmedValues,
        formulas: trimmedFormulas,
        rowCount: maxRow,
        columnCount: maxCol
      }
    } catch (error) {
      console.error('Failed to get active range:', error)
      throw error
    }
  }

  async getCellValue(cell: string): Promise<any> {
    if (!this.isConnected || !this.sheetsClient) {
      throw new Error('Not connected to Google Sheets')
    }
    
    try {
      const response = await this.sheetsClient.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: cell,
        valueRenderOption: 'UNFORMATTED_VALUE'
      })
      
      const values = response.data.values
      if (values && values.length > 0 && values[0].length > 0) {
        return values[0][0]
      }
      
      return null
    } catch (error) {
      console.error('Failed to get cell value:', error)
      throw error
    }
  }

  async setCellValue(cell: string, value: any): Promise<void> {
    if (!this.isConnected || !this.sheetsClient) {
      throw new Error('Not connected to Google Sheets')
    }

    try {
      // Get old value first
      const oldValue = await this.getCellValue(cell)
      
      // Update the cell
      await this.sheetsClient.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: cell,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[value]]
        }
      })
      
      // Notify callbacks
      const change: SpreadsheetChange = {
        type: 'cell',
        target: cell,
        oldValue,
        newValue: value,
        timestamp: new Date()
      }
      
      this.notifyChange(change)
    } catch (error) {
      console.error('Failed to set cell value:', error)
      throw error
    }
  }

  async addFormula(cell: string, formula: string): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Not connected to Google Sheets')
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
    if (!this.isConnected || !this.sheetsClient) {
      throw new Error('Not connected to Google Sheets')
    }

    try {
      const response = await this.sheetsClient.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
        includeGridData: false
      })
      
      const spreadsheet = response.data
      const sheets = spreadsheet.sheets || []
      
      return {
        name: spreadsheet.properties?.title || 'Untitled',
        sheets: sheets.map((sheet, index) => ({
          id: sheet.properties?.sheetId?.toString() || index.toString(),
          name: sheet.properties?.title || `Sheet${index + 1}`,
          index: sheet.properties?.index || index,
          visible: !sheet.properties?.hidden,
          protected: (sheet.protectedRanges && sheet.protectedRanges.length > 0) || false
        })),
        activeSheet: sheets[0]?.properties?.title || 'Sheet1'
      }
    } catch (error) {
      console.error('Failed to get workbook info:', error)
      throw error
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
   * Start polling for changes in the spreadsheet
   */
  private startChangePolling(): void {
    // Poll every 2 seconds for changes
    this.pollInterval = setInterval(async () => {
      if (!this.isConnected || !this.sheetsClient) return
      
      try {
        // Get current snapshot of active range
        const currentSnapshot = await this.getActiveRange()
        
        // Compare with last snapshot
        if (this.lastSnapshot && this.hasChanges(this.lastSnapshot, currentSnapshot)) {
          // Detect and notify about changes
          this.detectChanges(this.lastSnapshot, currentSnapshot)
        }
        
        this.lastSnapshot = currentSnapshot
      } catch (error) {
        console.error('Error polling for changes:', error)
      }
    }, 2000)
  }
  
  /**
   * Check if there are changes between snapshots
   */
  private hasChanges(oldSnapshot: Range, newSnapshot: Range): boolean {
    if (oldSnapshot.rowCount !== newSnapshot.rowCount || 
        oldSnapshot.columnCount !== newSnapshot.columnCount) {
      return true
    }
    
    for (let i = 0; i < oldSnapshot.values.length; i++) {
      for (let j = 0; j < oldSnapshot.values[i].length; j++) {
        if (oldSnapshot.values[i][j] !== newSnapshot.values[i][j]) {
          return true
        }
      }
    }
    
    return false
  }
  
  /**
   * Detect and notify about specific changes
   */
  private detectChanges(oldSnapshot: Range, newSnapshot: Range): void {
    // Compare values and emit change events
    for (let i = 0; i < Math.max(oldSnapshot.values.length, newSnapshot.values.length); i++) {
      for (let j = 0; j < Math.max(
        oldSnapshot.values[i]?.length || 0, 
        newSnapshot.values[i]?.length || 0
      ); j++) {
        const oldValue = oldSnapshot.values[i]?.[j]
        const newValue = newSnapshot.values[i]?.[j]
        
        if (oldValue !== newValue) {
          const cellAddress = `${this.columnToLetter(j + 1)}${i + 1}`
          const change: SpreadsheetChange = {
            type: 'cell',
            target: cellAddress,
            oldValue,
            newValue,
            timestamp: new Date()
          }
          this.notifyChange(change)
        }
      }
    }
  }
  
  /**
   * Convert column number to letter (1 -> A, 2 -> B, etc.)
   */
  private columnToLetter(column: number): string {
    let letter = ''
    let temp = column
    
    while (temp > 0) {
      temp--
      letter = String.fromCharCode((temp % 26) + 65) + letter
      temp = Math.floor(temp / 26)
    }
    
    return letter
  }
}