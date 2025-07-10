import { IpcMain } from 'electron'
import { WindowManager } from './windowManager'
import { SpreadsheetService } from './services/spreadsheetService'
import { AIService } from './services/aiService'
import { AuditService } from './services/auditService'
import { SECEdgarService } from './services/secEdgarService'
import { CompanyResolver } from './services/companyResolver'
import { ErrorHandler } from './utils/errorHandler'
import { logger } from './utils/logger'
import { isAppError } from './utils/errors'

let spreadsheetService: SpreadsheetService
let aiService: AIService
let auditService: AuditService
let secEdgarService: SECEdgarService
let companyResolver: CompanyResolver

export function setupIpcHandlers(ipcMain: IpcMain, windowManager: WindowManager): void {
  const errorHandler = ErrorHandler.getInstance()
  
  spreadsheetService = new SpreadsheetService()
  aiService = new AIService()
  auditService = new AuditService()
  secEdgarService = new SECEdgarService()
  companyResolver = new CompanyResolver(aiService, secEdgarService)
  
  logger.info('Setting up IPC handlers')

  ipcMain.handle('window:toggleDocking', () => {
    try {
      windowManager.toggleDocking()
      logger.debug('Window docking toggled')
    } catch (error) {
      logger.error('Failed to toggle docking:', error)
      throw error
    }
  })

  ipcMain.handle('window:setAlwaysOnTop', (_, value: boolean) => {
    try {
      windowManager.setAlwaysOnTop(value)
      logger.debug('Window always on top set to:', value)
    } catch (error) {
      logger.error('Failed to set always on top:', error)
      throw error
    }
  })

  ipcMain.handle('window:setOpacity', (_, value: number) => {
    try {
      if (value < 0.1 || value > 1) {
        throw new Error('Opacity must be between 0.1 and 1')
      }
      windowManager.setOpacity(value)
      logger.debug('Window opacity set to:', value)
    } catch (error) {
      logger.error('Failed to set opacity:', error)
      throw error
    }
  })

  ipcMain.handle('spreadsheet:connect', async (_, type: 'excel' | 'sheets', options?: { spreadsheetId?: string }) => {
    return await errorHandler.wrapAsync(async () => {
      logger.info('IPC: Spreadsheet connect request', { type, hasOptions: !!options })
      return await spreadsheetService.connect(type, options)
    }, { operation: 'spreadsheet:connect', type })
  })

  ipcMain.handle('spreadsheet:getActiveRange', async () => {
    return await errorHandler.wrapAsync(async () => {
      return await spreadsheetService.getActiveRange()
    }, { operation: 'spreadsheet:getActiveRange' })
  })

  ipcMain.handle('spreadsheet:setCellValue', async (_, cell: string, value: any) => {
    return await errorHandler.wrapAsync(async () => {
      logger.debug('IPC: Set cell value request', { cell, valueType: typeof value })
      
      // Get old value for audit trail
      let oldValue: any
      try {
        oldValue = await spreadsheetService.getCellValue(cell)
      } catch (error) {
        logger.warn('Could not retrieve old value for audit:', error)
        oldValue = null
      }
      
      // Record the change in audit log
      await auditService.recordChange({
        type: 'cell_update',
        target: cell,
        oldValue,
        newValue: value,
        timestamp: new Date()
      })
      
      // Perform the update
      return await spreadsheetService.setCellValue(cell, value)
    }, { operation: 'spreadsheet:setCellValue', cell })
  })

  ipcMain.handle('ai:chat', async (_, message: string, context?: any) => {
    return await errorHandler.wrapAsync(async () => {
      logger.info('IPC: AI chat request', { messageLength: message.length, hasContext: !!context })
      
      const response = await aiService.chat(message, context)
      
      // Record in audit log
      await auditService.recordInteraction({
        type: 'ai_chat',
        message,
        response: response.content,
        timestamp: new Date()
      })
      
      return response
    }, { operation: 'ai:chat' })
  })

  ipcMain.handle('ai:generateFormula', async (_, description: string, context?: any) => {
    return await errorHandler.wrapAsync(async () => {
      logger.info('IPC: Generate formula request', { descriptionLength: description.length })
      
      const formula = await aiService.generateFormula(description, context)
      
      // Record in audit log
      await auditService.recordInteraction({
        type: 'ai_formula_generation',
        message: description,
        response: formula,
        timestamp: new Date()
      })
      
      return formula
    }, { operation: 'ai:generateFormula' })
  })

  ipcMain.handle('audit:getHistory', async (_, filter?: any) => {
    return await errorHandler.wrapAsync(async () => {
      logger.debug('IPC: Get audit history request', { hasFilter: !!filter })
      return await auditService.getHistory(filter)
    }, { operation: 'audit:getHistory' })
  })
  
  ipcMain.handle('ai:testConnection', async () => {
    return await errorHandler.wrapAsync(async () => {
      logger.info('IPC: Test AI connection request')
      return await aiService.testConnection()
    }, { operation: 'ai:testConnection' })
  })
  
  // SEC EDGAR handlers
  ipcMain.handle('sec:searchEarnings', async (_, query: string) => {
    return await errorHandler.wrapAsync(async () => {
      logger.info('IPC: Search earnings request', { query })
      
      // Resolve the query using AI
      const intent = await companyResolver.resolveCompanyQuery(query)
      
      // Handle different search types
      if (intent.searchType === 'comparison' && intent.companies) {
        // Handle multiple company comparison
        const results = await Promise.all(
          intent.companies.map(company => 
            secEdgarService.getLatestEarnings(company)
          )
        )
        return results.flat()
      } else {
        // Single company search
        const identifier = intent.ticker || intent.companyName || query
        return await secEdgarService.getLatestEarnings(identifier)
      }
    }, { operation: 'sec:searchEarnings', query })
  })
  
  ipcMain.handle('sec:getCompanySuggestions', async (_, partialQuery: string) => {
    return await errorHandler.wrapAsync(async () => {
      logger.debug('IPC: Get company suggestions', { partialQuery })
      return await companyResolver.getSuggestions(partialQuery)
    }, { operation: 'sec:getCompanySuggestions' })
  })
  
  ipcMain.handle('sec:getFilingDocuments', async (_, cik: string, accessionNumber: string) => {
    return await errorHandler.wrapAsync(async () => {
      logger.info('IPC: Get filing documents', { cik, accessionNumber })
      return await secEdgarService.getFilingDocuments(cik, accessionNumber)
    }, { operation: 'sec:getFilingDocuments' })
  })
}