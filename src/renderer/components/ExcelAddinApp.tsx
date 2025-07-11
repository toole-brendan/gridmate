import React, { useState, useEffect, useRef } from 'react'
import { ChatMessage } from '@shared/types/chat'
import { ChatInterface } from './ChatInterface'
import { Send, Settings, RefreshCw, FileSpreadsheet } from 'lucide-react'

declare const Office: any
declare const Excel: any

interface ExcelContext {
  workbookName: string
  worksheetName: string
  selectedRange: string
  isConnected: boolean
}

export const ExcelAddinApp: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [excelContext, setExcelContext] = useState<ExcelContext>({
    workbookName: '',
    worksheetName: '',
    selectedRange: '',
    isConnected: false
  })
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    // Initialize Excel context
    initializeExcelContext()
    
    // Set up WebSocket connection
    connectToServer()

    // Subscribe to Excel events
    subscribeToExcelEvents()

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [])

  const initializeExcelContext = async () => {
    try {
      await Excel.run(async (context) => {
        const workbook = context.workbook
        const worksheet = workbook.worksheets.getActiveWorksheet()
        const range = workbook.getSelectedRange()

        workbook.load('name')
        worksheet.load('name')
        range.load('address')

        await context.sync()

        setExcelContext({
          workbookName: workbook.name,
          worksheetName: worksheet.name,
          selectedRange: range.address,
          isConnected: true
        })
      })
    } catch (error) {
      console.error('Failed to initialize Excel context:', error)
    }
  }

  const connectToServer = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${protocol}//localhost:3000/ws`)

    ws.onopen = () => {
      console.log('Connected to Gridmate server')
      ws.send(JSON.stringify({
        type: 'auth',
        host: 'excel-addin',
        context: excelContext
      }))
    }

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      handleServerMessage(data)
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      setExcelContext(prev => ({ ...prev, isConnected: false }))
    }

    ws.onclose = () => {
      console.log('Disconnected from server')
      setExcelContext(prev => ({ ...prev, isConnected: false }))
      // Attempt reconnection after 5 seconds
      setTimeout(connectToServer, 5000)
    }

    wsRef.current = ws
  }

  const subscribeToExcelEvents = async () => {
    try {
      await Excel.run(async (context) => {
        const worksheet = context.workbook.worksheets.getActiveWorksheet()
        
        // Subscribe to selection change
        worksheet.onSelectionChanged.add(async (event) => {
          await Excel.run(async (context) => {
            const range = context.workbook.getSelectedRange()
            range.load('address')
            await context.sync()
            
            setExcelContext(prev => ({
              ...prev,
              selectedRange: range.address
            }))

            // Notify server of selection change
            if (wsRef.current?.readyState === WebSocket.OPEN) {
              wsRef.current.send(JSON.stringify({
                type: 'selection_changed',
                address: range.address
              }))
            }
          })
        })
      })
    } catch (error) {
      console.error('Failed to subscribe to Excel events:', error)
    }
  }

  const handleServerMessage = (data: any) => {
    switch (data.type) {
      case 'chat_response':
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: data.message,
          timestamp: new Date()
        }])
        setIsLoading(false)
        break

      case 'execute_action':
        executeExcelAction(data.action)
        break

      case 'error':
        console.error('Server error:', data.message)
        setIsLoading(false)
        break
    }
  }

  const executeExcelAction = async (action: any) => {
    try {
      await Excel.run(async (context) => {
        switch (action.type) {
          case 'write_cell':
            const range = context.workbook.worksheets.getActiveWorksheet()
              .getRange(action.address)
            range.values = [[action.value]]
            if (action.formula) {
              range.formulas = [[action.formula]]
            }
            await context.sync()
            break

          case 'read_range':
            const readRange = context.workbook.worksheets.getActiveWorksheet()
              .getRange(action.address)
            readRange.load(['values', 'formulas'])
            await context.sync()
            
            // Send data back to server
            if (wsRef.current?.readyState === WebSocket.OPEN) {
              wsRef.current.send(JSON.stringify({
                type: 'range_data',
                address: action.address,
                values: readRange.values,
                formulas: readRange.formulas
              }))
            }
            break
        }
      })
    } catch (error) {
      console.error('Excel action failed:', error)
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'action_error',
          error: error.message
        }))
      }
    }
  }

  const handleSendMessage = () => {
    if (!input.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    // Send message to server with Excel context
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'chat_message',
        message: input,
        context: {
          workbook: excelContext.workbookName,
          worksheet: excelContext.worksheetName,
          selectedRange: excelContext.selectedRange
        }
      }))
    } else {
      setIsLoading(false)
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Not connected to Gridmate server. Please check your connection.',
        timestamp: new Date()
      }])
    }
  }

  const refreshContext = () => {
    initializeExcelContext()
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="bg-blue-600 text-white p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileSpreadsheet size={20} />
          <div>
            <h1 className="text-lg font-semibold">Gridmate AI</h1>
            <p className="text-xs opacity-90">
              {excelContext.isConnected ? 'Connected' : 'Disconnected'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={refreshContext}
            className="p-1.5 hover:bg-blue-700 rounded transition-colors"
            title="Refresh context"
          >
            <RefreshCw size={16} />
          </button>
          <button
            className="p-1.5 hover:bg-blue-700 rounded transition-colors"
            title="Settings"
          >
            <Settings size={16} />
          </button>
        </div>
      </div>

      {/* Excel Context Bar */}
      <div className="bg-gray-100 px-3 py-2 text-xs border-b">
        <div className="flex items-center justify-between">
          <span className="text-gray-600">
            {excelContext.workbookName && (
              <>
                <span className="font-medium">{excelContext.workbookName}</span>
                {' › '}
                <span>{excelContext.worksheetName}</span>
              </>
            )}
          </span>
          <span className="text-gray-500">
            {excelContext.selectedRange && `Selected: ${excelContext.selectedRange}`}
          </span>
        </div>
      </div>

      {/* Chat Interface */}
      <div className="flex-1 overflow-hidden">
        <ChatInterface
          messages={messages}
          input={input}
          setInput={setInput}
          handleSendMessage={handleSendMessage}
          isLoading={isLoading}
        />
      </div>
    </div>
  )
}