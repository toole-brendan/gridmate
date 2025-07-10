import { WebSocket } from 'ws'
import { logger } from '../utils/logger'
import { AIService } from './aiService'
import { SpreadsheetService } from './spreadsheetService'
import { SpreadsheetAdapter } from '@shared/types/spreadsheet'

interface ExcelClient {
  id: string
  ws: WebSocket
  workbook: string
  worksheet: string
  isAuthenticated: boolean
}

export class ExcelBridgeService {
  private static instance: ExcelBridgeService
  private clients: Map<string, ExcelClient> = new Map()
  private aiService: AIService
  private spreadsheetService: SpreadsheetService

  private constructor() {
    this.aiService = AIService.getInstance()
    this.spreadsheetService = SpreadsheetService.getInstance()
  }

  static getInstance(): ExcelBridgeService {
    if (!ExcelBridgeService.instance) {
      ExcelBridgeService.instance = new ExcelBridgeService()
    }
    return ExcelBridgeService.instance
  }

  handleConnection(ws: WebSocket, clientId: string): void {
    logger.info(`New Excel add-in connection: ${clientId}`)

    const client: ExcelClient = {
      id: clientId,
      ws,
      workbook: '',
      worksheet: '',
      isAuthenticated: false
    }

    this.clients.set(clientId, client)

    ws.on('message', (message) => {
      this.handleMessage(clientId, message.toString())
    })

    ws.on('close', () => {
      logger.info(`Excel add-in disconnected: ${clientId}`)
      this.clients.delete(clientId)
    })

    ws.on('error', (error) => {
      logger.error(`Excel add-in error for ${clientId}:`, error)
    })
  }

  private async handleMessage(clientId: string, message: string): Promise<void> {
    const client = this.clients.get(clientId)
    if (!client) return

    try {
      const data = JSON.parse(message)
      logger.debug(`Message from Excel add-in ${clientId}:`, data)

      switch (data.type) {
        case 'auth':
          await this.handleAuth(client, data)
          break

        case 'chat_message':
          await this.handleChatMessage(client, data)
          break

        case 'cell_update':
          await this.handleCellUpdate(client, data)
          break

        case 'range_data':
          await this.handleRangeData(client, data)
          break

        case 'selection_changed':
          await this.handleSelectionChanged(client, data)
          break

        default:
          logger.warn(`Unknown message type from Excel add-in: ${data.type}`)
      }
    } catch (error) {
      logger.error(`Error handling Excel add-in message:`, error)
      this.sendError(client, 'Failed to process message')
    }
  }

  private async handleAuth(client: ExcelClient, data: any): Promise<void> {
    // Simple authentication for now
    client.isAuthenticated = true
    client.workbook = data.context?.workbook || ''
    client.worksheet = data.context?.worksheet || ''

    this.sendMessage(client, {
      type: 'auth_response',
      success: true,
      sessionId: client.id
    })

    logger.info(`Excel add-in authenticated: ${client.id}`)
  }

  private async handleChatMessage(client: ExcelClient, data: any): Promise<void> {
    if (!client.isAuthenticated) {
      this.sendError(client, 'Not authenticated')
      return
    }

    try {
      // Get current Excel context
      const context = {
        workbook: data.context?.workbook || client.workbook,
        worksheet: data.context?.worksheet || client.worksheet,
        selectedRange: data.context?.selectedRange || ''
      }

      // Process message with AI
      const response = await this.aiService.processMessage(data.message, {
        source: 'excel',
        context
      })

      // Send response back to Excel add-in
      this.sendMessage(client, {
        type: 'chat_response',
        message: response.content,
        actions: response.actions
      })

      // Execute any Excel-specific actions
      if (response.actions && response.actions.length > 0) {
        for (const action of response.actions) {
          this.sendMessage(client, {
            type: 'execute_action',
            action
          })
        }
      }
    } catch (error) {
      logger.error('Error processing chat message:', error)
      this.sendError(client, 'Failed to process message')
    }
  }

  private async handleCellUpdate(client: ExcelClient, data: any): Promise<void> {
    // Forward cell updates to the spreadsheet service
    try {
      await this.spreadsheetService.updateCell(data.address, data.value, data.formula)
      
      this.sendMessage(client, {
        type: 'cell_update_response',
        success: true,
        address: data.address
      })
    } catch (error) {
      logger.error('Error updating cell:', error)
      this.sendError(client, 'Failed to update cell')
    }
  }

  private async handleRangeData(client: ExcelClient, data: any): Promise<void> {
    // Store range data for context
    try {
      await this.spreadsheetService.updateRangeData(data.address, data.values, data.formulas)
      logger.debug(`Received range data for ${data.address}`)
    } catch (error) {
      logger.error('Error handling range data:', error)
    }
  }

  private async handleSelectionChanged(client: ExcelClient, data: any): Promise<void> {
    // Update context with new selection
    logger.debug(`Selection changed to ${data.address}`)
    
    // Optionally trigger AI analysis of the new selection
    if (data.autoAnalyze) {
      this.sendMessage(client, {
        type: 'execute_action',
        action: {
          type: 'read_range',
          address: data.address
        }
      })
    }
  }

  private sendMessage(client: ExcelClient, message: any): void {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message))
    }
  }

  private sendError(client: ExcelClient, error: string): void {
    this.sendMessage(client, {
      type: 'error',
      message: error
    })
  }

  // Public method to broadcast to all Excel clients
  broadcastToExcelClients(message: any): void {
    this.clients.forEach(client => {
      if (client.isAuthenticated) {
        this.sendMessage(client, message)
      }
    })
  }

  // Get connected Excel clients info
  getConnectedClients(): Array<{ id: string; workbook: string; worksheet: string }> {
    return Array.from(this.clients.values())
      .filter(client => client.isAuthenticated)
      .map(client => ({
        id: client.id,
        workbook: client.workbook,
        worksheet: client.worksheet
      }))
  }
}