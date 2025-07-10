import { IpcMain } from 'electron'
import { WindowManager } from './windowManager'
import { SpreadsheetService } from './services/spreadsheetService'
import { AIService } from './services/aiService'
import { AuditService } from './services/auditService'

let spreadsheetService: SpreadsheetService
let aiService: AIService
let auditService: AuditService

export function setupIpcHandlers(ipcMain: IpcMain, windowManager: WindowManager): void {
  spreadsheetService = new SpreadsheetService()
  aiService = new AIService()
  auditService = new AuditService()

  ipcMain.handle('window:toggleDocking', () => {
    windowManager.toggleDocking()
  })

  ipcMain.handle('window:setAlwaysOnTop', (_, value: boolean) => {
    windowManager.setAlwaysOnTop(value)
  })

  ipcMain.handle('window:setOpacity', (_, value: number) => {
    windowManager.setOpacity(value)
  })

  ipcMain.handle('spreadsheet:connect', async (_, type: 'excel' | 'sheets', options?: { spreadsheetId?: string }) => {
    try {
      return await spreadsheetService.connect(type, options)
    } catch (error) {
      console.error('Failed to connect to spreadsheet:', error)
      throw error
    }
  })

  ipcMain.handle('spreadsheet:getActiveRange', async () => {
    try {
      return await spreadsheetService.getActiveRange()
    } catch (error) {
      console.error('Failed to get active range:', error)
      throw error
    }
  })

  ipcMain.handle('spreadsheet:setCellValue', async (_, cell: string, value: any) => {
    try {
      await auditService.recordChange({
        type: 'cell_update',
        target: cell,
        oldValue: await spreadsheetService.getCellValue(cell),
        newValue: value,
        timestamp: new Date()
      })
      return await spreadsheetService.setCellValue(cell, value)
    } catch (error) {
      console.error('Failed to set cell value:', error)
      throw error
    }
  })

  ipcMain.handle('ai:chat', async (_, message: string, context?: any) => {
    try {
      const response = await aiService.chat(message, context)
      await auditService.recordInteraction({
        type: 'ai_chat',
        message,
        response: response.content,
        timestamp: new Date()
      })
      return response
    } catch (error) {
      console.error('AI chat error:', error)
      throw error
    }
  })

  ipcMain.handle('ai:generateFormula', async (_, description: string, context?: any) => {
    try {
      return await aiService.generateFormula(description, context)
    } catch (error) {
      console.error('Failed to generate formula:', error)
      throw error
    }
  })

  ipcMain.handle('audit:getHistory', async (_, filter?: any) => {
    try {
      return await auditService.getHistory(filter)
    } catch (error) {
      console.error('Failed to get audit history:', error)
      throw error
    }
  })
}