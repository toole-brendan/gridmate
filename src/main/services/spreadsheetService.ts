import { SpreadsheetAdapter } from '@shared/types/spreadsheet'
import { ExcelAdapter } from './adapters/excelAdapter'
import { SheetsAdapter } from './adapters/sheetsAdapter'
import { SpreadsheetError, ErrorCode } from '../utils/errors'
import { logger, logSpreadsheetOperation, logPerformance } from '../utils/logger'

export class SpreadsheetService {
  private adapter: SpreadsheetAdapter | null = null
  private type: 'excel' | 'sheets' | null = null
  private spreadsheetId: string | null = null
  private userId?: string // For audit logging

  async connect(type: 'excel' | 'sheets', options?: { spreadsheetId?: string; userId?: string }): Promise<boolean> {
    const startTime = Date.now()
    
    try {
      logger.info(`Connecting to ${type}`, { 
        type, 
        hasSpreadsheetId: !!options?.spreadsheetId 
      })
      
      this.type = type
      this.userId = options?.userId
      
      if (type === 'excel') {
        this.adapter = new ExcelAdapter()
      } else {
        // For Google Sheets, spreadsheetId is required
        if (!options?.spreadsheetId) {
          throw new SpreadsheetError(
            ErrorCode.SPREADSHEET_INVALID_RANGE,
            'spreadsheetId is required for Google Sheets connection'
          )
        }
        this.spreadsheetId = options.spreadsheetId
        this.adapter = new SheetsAdapter(options.spreadsheetId)
      }
      
      const connected = await this.adapter.connect()
      
      if (connected) {
        const duration = Date.now() - startTime
        logger.info(`Successfully connected to ${type}`, { type, duration })
        logSpreadsheetOperation('connect', { type, success: true }, this.userId)
        logPerformance('spreadsheet_connect', duration, { type })
      } else {
        throw new SpreadsheetError(
          ErrorCode.SPREADSHEET_CONNECTION_FAILED,
          `Failed to establish connection to ${type}`
        )
      }
      
      return connected
    } catch (error) {
      const duration = Date.now() - startTime
      logger.error(`Failed to connect to ${type}:`, error)
      logSpreadsheetOperation('connect', { type, success: false, error: error instanceof Error ? error.message : 'Unknown error' }, this.userId)
      logPerformance('spreadsheet_connect_error', duration, { type })
      
      if (error instanceof SpreadsheetError) {
        throw error
      }
      
      throw new SpreadsheetError(
        ErrorCode.SPREADSHEET_CONNECTION_FAILED,
        `Failed to connect to ${type}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      )
    }
  }

  async disconnect(): Promise<void> {
    if (this.adapter) {
      try {
        logger.info('Disconnecting from spreadsheet', { type: this.type })
        await this.adapter.disconnect()
        logSpreadsheetOperation('disconnect', { type: this.type }, this.userId)
      } catch (error) {
        logger.error('Error during disconnect:', error)
        // Don't throw - we still want to clean up
      } finally {
        this.adapter = null
        this.type = null
        this.spreadsheetId = null
      }
    }
  }

  async getActiveRange(): Promise<any> {
    if (!this.adapter) {
      throw new SpreadsheetError(
        ErrorCode.SPREADSHEET_NOT_CONNECTED,
        'No spreadsheet connected. Please connect to Excel or Google Sheets first.'
      )
    }
    
    const startTime = Date.now()
    
    try {
      const range = await this.adapter.getActiveRange()
      
      const duration = Date.now() - startTime
      logSpreadsheetOperation('getActiveRange', { 
        address: range?.address,
        rowCount: range?.values?.length,
        columnCount: range?.values?.[0]?.length 
      }, this.userId)
      logPerformance('get_active_range', duration)
      
      return range
    } catch (error) {
      const duration = Date.now() - startTime
      logger.error('Failed to get active range:', error)
      logPerformance('get_active_range_error', duration)
      
      throw new SpreadsheetError(
        ErrorCode.SPREADSHEET_OPERATION_FAILED,
        'Failed to get active range',
        error instanceof Error ? error : undefined
      )
    }
  }

  async getCellValue(cell: string): Promise<any> {
    if (!this.adapter) {
      throw new SpreadsheetError(
        ErrorCode.SPREADSHEET_NOT_CONNECTED,
        'No spreadsheet connected. Please connect to Excel or Google Sheets first.'
      )
    }
    
    if (!cell || !cell.match(/^[A-Z]+[0-9]+$/i)) {
      throw new SpreadsheetError(
        ErrorCode.SPREADSHEET_INVALID_RANGE,
        `Invalid cell reference: ${cell}. Expected format like A1, B2, etc.`
      )
    }
    
    try {
      logger.debug('Getting cell value', { cell })
      const value = await this.adapter.getCellValue(cell)
      logSpreadsheetOperation('getCellValue', { cell, hasValue: value !== null && value !== undefined }, this.userId)
      return value
    } catch (error) {
      logger.error('Failed to get cell value:', { cell, error })
      
      throw new SpreadsheetError(
        ErrorCode.SPREADSHEET_OPERATION_FAILED,
        `Failed to get value for cell ${cell}`,
        error instanceof Error ? error : undefined
      )
    }
  }

  async setCellValue(cell: string, value: any): Promise<void> {
    if (!this.adapter) {
      throw new SpreadsheetError(
        ErrorCode.SPREADSHEET_NOT_CONNECTED,
        'No spreadsheet connected. Please connect to Excel or Google Sheets first.'
      )
    }
    
    if (!cell || !cell.match(/^[A-Z]+[0-9]+$/i)) {
      throw new SpreadsheetError(
        ErrorCode.SPREADSHEET_INVALID_RANGE,
        `Invalid cell reference: ${cell}. Expected format like A1, B2, etc.`
      )
    }
    
    const startTime = Date.now()
    
    try {
      logger.debug('Setting cell value', { cell, valueType: typeof value })
      await this.adapter.setCellValue(cell, value)
      
      const duration = Date.now() - startTime
      logSpreadsheetOperation('setCellValue', { 
        cell, 
        valueType: typeof value,
        valueLength: typeof value === 'string' ? value.length : undefined 
      }, this.userId)
      logPerformance('set_cell_value', duration)
    } catch (error) {
      const duration = Date.now() - startTime
      logger.error('Failed to set cell value:', { cell, error })
      logPerformance('set_cell_value_error', duration)
      
      throw new SpreadsheetError(
        ErrorCode.SPREADSHEET_OPERATION_FAILED,
        `Failed to set value for cell ${cell}`,
        error instanceof Error ? error : undefined
      )
    }
  }

  async addFormula(cell: string, formula: string): Promise<void> {
    if (!this.adapter) {
      throw new SpreadsheetError(
        ErrorCode.SPREADSHEET_NOT_CONNECTED,
        'No spreadsheet connected. Please connect to Excel or Google Sheets first.'
      )
    }
    
    if (!cell || !cell.match(/^[A-Z]+[0-9]+$/i)) {
      throw new SpreadsheetError(
        ErrorCode.SPREADSHEET_INVALID_RANGE,
        `Invalid cell reference: ${cell}. Expected format like A1, B2, etc.`
      )
    }
    
    if (!formula || !formula.startsWith('=')) {
      throw new SpreadsheetError(
        ErrorCode.VALIDATION_FAILED,
        'Formula must start with "="'
      )
    }
    
    const startTime = Date.now()
    
    try {
      logger.info('Adding formula', { cell, formulaLength: formula.length })
      await this.adapter.addFormula(cell, formula)
      
      const duration = Date.now() - startTime
      logSpreadsheetOperation('addFormula', { 
        cell, 
        formulaLength: formula.length,
        formulaStart: formula.substring(0, 50) 
      }, this.userId)
      logPerformance('add_formula', duration)
    } catch (error) {
      const duration = Date.now() - startTime
      logger.error('Failed to add formula:', { cell, error })
      logPerformance('add_formula_error', duration)
      
      throw new SpreadsheetError(
        ErrorCode.SPREADSHEET_OPERATION_FAILED,
        `Failed to add formula to cell ${cell}`,
        error instanceof Error ? error : undefined
      )
    }
  }

  async subscribeToChanges(callback: (change: any) => void): Promise<void> {
    if (!this.adapter) {
      throw new SpreadsheetError(
        ErrorCode.SPREADSHEET_NOT_CONNECTED,
        'No spreadsheet connected. Please connect to Excel or Google Sheets first.'
      )
    }
    
    try {
      logger.info('Subscribing to spreadsheet changes')
      
      // Wrap callback to add logging
      const wrappedCallback = (change: any) => {
        logger.debug('Spreadsheet change detected', { 
          changeType: change.type,
          address: change.address 
        })
        logSpreadsheetOperation('change', { 
          type: change.type,
          address: change.address 
        }, this.userId)
        
        callback(change)
      }
      
      await this.adapter.subscribeToChanges(wrappedCallback)
      logger.info('Successfully subscribed to changes')
    } catch (error) {
      logger.error('Failed to subscribe to changes:', error)
      
      throw new SpreadsheetError(
        ErrorCode.SPREADSHEET_OPERATION_FAILED,
        'Failed to subscribe to spreadsheet changes',
        error instanceof Error ? error : undefined
      )
    }
  }

  async getWorkbookInfo(): Promise<any> {
    if (!this.adapter) {
      throw new SpreadsheetError(
        ErrorCode.SPREADSHEET_NOT_CONNECTED,
        'No spreadsheet connected. Please connect to Excel or Google Sheets first.'
      )
    }
    
    const startTime = Date.now()
    
    try {
      const info = await this.adapter.getWorkbookInfo()
      
      const duration = Date.now() - startTime
      logger.debug('Retrieved workbook info', { 
        hasInfo: !!info,
        sheetCount: info?.sheets?.length 
      })
      logPerformance('get_workbook_info', duration)
      
      return info
    } catch (error) {
      const duration = Date.now() - startTime
      logger.error('Failed to get workbook info:', error)
      logPerformance('get_workbook_info_error', duration)
      
      throw new SpreadsheetError(
        ErrorCode.SPREADSHEET_OPERATION_FAILED,
        'Failed to get workbook information',
        error instanceof Error ? error : undefined
      )
    }
  }
}