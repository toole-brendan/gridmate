import React, { useState, useEffect, useRef } from 'react'
import { ChatInterface } from './ChatInterface'
import { ChatMessage } from '../../types/chat'
import { WebSocketClient } from '../../services/websocket/WebSocketClient'
import { ActionPreview } from '../actions/ActionPreview'
import { ExcelService } from '../../services/excel/ExcelService'

// Global WebSocket client instance to prevent multiple connections
let globalWsClient: WebSocketClient | null = null
let globalSessionId: string = `session_${Date.now()}`

export const ChatInterfaceWithBackend: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')
  const [renderKey, setRenderKey] = useState(0)
  const [, forceUpdate] = React.useReducer(x => x + 1, 0)
  const [pendingActions, setPendingActions] = useState<any[]>([])
  const [currentPreviewId, setCurrentPreviewId] = useState<string | null>(null)
  const wsClient = useRef<WebSocketClient | null>(globalWsClient)
  const connectionStatusRef = useRef(connectionStatus)
  const sessionIdRef = useRef<string>(globalSessionId) // Use global session ID
  const [lastToolRequest, setLastToolRequest] = useState<string>('') // Debug: track tool requests
  const [toolError, setToolError] = useState<string>('') // Debug: track tool errors
  const [wsResponseStatus, setWsResponseStatus] = useState<string>('') // Debug: track WebSocket response sending
  const [wsMessageLog, setWsMessageLog] = useState<string[]>([]) // Debug: log all WebSocket activity
  
  // Helper to add to message log
  const addToWsLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setWsMessageLog(prev => [...prev.slice(-10), `[${timestamp}] ${message}`]) // Keep last 10 messages
  }

  // Debug connection status changes
  useEffect(() => {
    console.log('🎯 Connection status changed to:', connectionStatus)
    connectionStatusRef.current = connectionStatus
  }, [connectionStatus])

  // Periodic check for WebSocket status
  useEffect(() => {
    const interval = setInterval(() => {
      if (wsClient.current) {
        const isConnected = wsClient.current.isConnected()
        // @ts-ignore - Access private property for debugging
        const readyState = wsClient.current.ws?.readyState
        const stateMap = {
          0: 'CONNECTING',
          1: 'OPEN',
          2: 'CLOSING',
          3: 'CLOSED'
        }
        console.log('🔍 Periodic check - Connected:', isConnected, 'ReadyState:', stateMap[readyState] || readyState)
        
        // If WebSocket is connected but UI shows connecting, force update
        if (isConnected && connectionStatus !== 'connected') {
          console.log('🚨 WebSocket is connected but UI shows disconnected, forcing update')
          setConnectionStatus('connected')
          forceUpdate()
        }
        
        // Only update render key if status actually changed
        if (isConnected !== (connectionStatus === 'connected')) {
          setRenderKey(prev => prev + 1)
        }
      }
    }, 5000) // Check every 5 seconds instead of 1

    return () => clearInterval(interval)
  }, [connectionStatus])

  useEffect(() => {
    // Check if global client exists
    if (globalWsClient && globalWsClient.isConnected()) {
      console.log('⚠️ Using existing global WebSocket client')
      wsClient.current = globalWsClient
      setConnectionStatus('connected')
      return
    }
    
    // Only initialize once
    if (wsClient.current || globalWsClient) {
      console.log('⚠️ WebSocket client already exists, skipping initialization')
      return
    }
    
    // Check if we're in the actual Excel add-in environment
    const isInExcel = window.location.pathname.includes('/excel')
    console.log('📍 Environment check - pathname:', window.location.pathname, 'isInExcel:', isInExcel)

    // Initialize WebSocket connection
    console.log('🔌 Initializing WebSocket connection...')
    console.log('🆔 Component session ID:', sessionIdRef.current)
    
    // Use Vite proxy for HTTPS → WSS conversion
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${wsProtocol}//${window.location.host}/ws`
    
    console.log('🔗 Using Vite proxy for WebSocket')
    console.log('🔗 WebSocket URL:', wsUrl)
    console.log('🔗 Window location:', {
      protocol: window.location.protocol,
      host: window.location.host,
      pathname: window.location.pathname
    })
    
    addToWsLog(`🔗 Using Vite proxy at ${wsUrl}`)
    
    // Create new WebSocket client and store globally
    const newClient = new WebSocketClient(wsUrl)
    wsClient.current = newClient
    globalWsClient = newClient

    // Listen for connection events
    wsClient.current.on('connected', () => {
      console.log('✅ WebSocket connected event fired')
      addToWsLog('✅ WebSocket connected')
      // Send auth message with dummy token in the format backend expects
      const authMsg = {
        id: Date.now().toString(),
        type: 'auth',
        timestamp: new Date().toISOString(),
        data: { token: 'dev-token-123' }
      }
      wsClient.current.send(authMsg)
      addToWsLog(`→ Sent auth message`)
    })

    wsClient.current.on('connect', () => {
      console.log('✅ WebSocket connect event fired')
      console.log('📝 Session ID for this connection:', sessionIdRef.current)
      // Don't set status here, wait for backend confirmation
    })

    wsClient.current.on('disconnected', () => {
      console.log('❌ WebSocket disconnected')
      addToWsLog('❌ WebSocket disconnected')
      setConnectionStatus('disconnected')
    })

    wsClient.current.on('message', (data: any) => {
      console.log('📨 Received message:', data)
      console.log('📨 Message timestamp:', new Date().toISOString())
      console.log('📨 Message type:', data.type)
      console.log('📨 Session ID:', sessionIdRef.current)
      
      addToWsLog(`← Received ${data.type}`)
      
      // Handle connection notification
      if (data.type === 'notification' && data.data?.title === 'Connected') {
        console.log('✅ Received connection confirmation from backend')
        console.log('🔄 Setting connection status to connected')
        // Use a timeout to ensure state update happens
        setTimeout(() => {
          setConnectionStatus('connected')
          setRenderKey(prev => prev + 1) // Force re-render
          forceUpdate() // Additional force update
        }, 100)
        console.log('📊 Connection status should now be connected')
      }
      
      // Handle auth responses
      if (data.type === 'auth_success') {
        console.log('🔐 Authentication successful:', data)
      }
      
      if (data.type === 'auth_error') {
        console.error('🔐 Authentication failed:', data)
      }
      
      // Handle AI responses
      if (data.type === 'ai_response' && data.content) {
        const aiMessage: ChatMessage = {
          id: Date.now().toString(),
          content: data.content,
          role: 'assistant',
          timestamp: new Date()
        }
        setMessages(prev => [...prev, aiMessage])
        setIsLoading(false)
      }
      
      // Handle chat messages
      if (data.type === 'chat_response') {
        console.log('💬 Received chat response:', data)
        const responseData = data.data || {}
        if (responseData.content) {
          const aiMessage: ChatMessage = {
            id: Date.now().toString(),
            content: responseData.content,
            role: 'assistant',
            timestamp: new Date()
          }
          setMessages(prev => [...prev, aiMessage])
          setIsLoading(false)
          
          // Check for actions in the response
          if (responseData.actions && responseData.actions.length > 0) {
            console.log('📋 Actions detected:', responseData.actions)
            setPendingActions(responseData.actions.map((action: any, index: number) => ({
              ...action,
              id: `${Date.now()}-${index}`
            })))
            setCurrentPreviewId(responseData.sessionId || Date.now().toString())
          }
        }
      }
      
      // Handle action preview messages
      if (data.type === 'change_preview') {
        console.log('📋 Change preview received:', data)
        const previewData = data.data || {}
        if (previewData.changes && previewData.changes.length > 0) {
          setPendingActions(previewData.changes)
          setCurrentPreviewId(previewData.id)
        }
      }
      
      // Handle tool requests from backend
      if (data.type === 'tool_request') {
        console.log('🔧 Tool request received:', data)
        const toolData = data.data || {}
        setLastToolRequest(`Tool: ${toolData.tool || 'unknown'} at ${new Date().toLocaleTimeString()}`)
        addToWsLog(`🔧 Tool request: ${toolData.tool} (${toolData.request_id})`)
        handleToolRequest(toolData)
      }
    })

    // Also listen for specific tool_request events
    wsClient.current.on('tool_request', (data: any) => {
      console.log('🔧🔧 Direct tool_request event received:', data)
      const toolData = data.data || {}
      setLastToolRequest(`Direct Tool: ${toolData.tool || 'unknown'} at ${new Date().toLocaleTimeString()}`)
      handleToolRequest(toolData)
    })

    wsClient.current.on('error', (error: any) => {
      console.error('🔴 WebSocket error:', error)
      console.error('🔴 Error details:', {
        message: error?.message,
        type: error?.type,
        target: error?.target?.url
      })
      addToWsLog(`❌ WebSocket error: ${error?.message || 'Unknown error'}`)
      setIsLoading(false)
    })

    wsClient.current.connect()

    return () => {
      // Don't disconnect the global client on component unmount
      console.log('Component unmounting, keeping WebSocket connection alive')
    }
  }, [])

  const handleToolRequest = async (toolData: any) => {
    const { request_id, tool, ...input } = toolData
    
    try {
      console.log(`🔧 Executing tool: ${tool}`, input)
      
      // Check if Office.js is available
      console.log('🔍 Office availability check:')
      console.log('- typeof Office:', typeof Office)
      console.log('- typeof Excel:', typeof Excel)
      
      // Check if we're in Office context
      if (typeof Office === 'undefined' || typeof Excel === 'undefined') {
        throw new Error('Office.js or Excel API is not available. Make sure the add-in is running in Excel.')
      }
      
      const excelService = ExcelService.getInstance()
      console.log('📊 ExcelService instance obtained')
      
      // Clear previous error
      setToolError('')
      
      // Add status update
      setLastToolRequest(`Executing ${tool}...`)
      
      const result = await excelService.executeToolRequest(tool, input)
      console.log(`📊 Tool execution completed, result:`, result)
      
      // Update status with result preview
      const resultPreview = JSON.stringify(result).substring(0, 50)
      setLastToolRequest(`Completed ${tool} at ${new Date().toLocaleTimeString()} - Result: ${resultPreview}...`)
      
      // Send successful response
      const responseData = {
        type: 'tool_response',
        data: {
          request_id,
          success: true,
          result
        }
      }
      
      setLastToolRequest(`Sending response for ${tool} at ${new Date().toLocaleTimeString()}`)
      setWsResponseStatus(`Sending success response for ${request_id}`)
      
      // Check if WebSocket client exists and is connected
      if (wsClient.current) {
        console.log(`📤 WebSocket client exists, sending tool response for ${request_id}`)
        setWsResponseStatus(`WebSocket exists, checking connection...`)
        
        const isConnected = wsClient.current.isConnected()
        setWsResponseStatus(`Connected: ${isConnected}, sending response...`)
        
        if (isConnected) {
          try {
            // Create a proper WebSocket message structure
            const wsMessage = {
              id: Date.now().toString(),
              type: 'tool_response',
              timestamp: new Date().toISOString(),
              data: {
                request_id,
                success: true,
                result
              }
            }
            
            // Log the exact message being sent
            console.log(`📤 TOOL RESPONSE MESSAGE:`, JSON.stringify(wsMessage, null, 2))
            console.log(`📤 Message structure check:`)
            console.log(`   - id: ${wsMessage.id}`)
            console.log(`   - type: ${wsMessage.type}`)
            console.log(`   - timestamp: ${wsMessage.timestamp}`)
            console.log(`   - data.request_id: ${wsMessage.data.request_id}`)
            setWsResponseStatus(`Calling ws.send() for ${request_id}...`)
            
            wsClient.current.send(wsMessage)
            
            setWsResponseStatus(`✅ Sent success response for ${request_id} at ${new Date().toLocaleTimeString()}`)
            addToWsLog(`→ Sent tool_response for ${request_id}`)
          } catch (sendError) {
            setWsResponseStatus(`❌ Send failed: ${sendError}`)
            console.error(`❌ WebSocket send error:`, sendError)
          }
        } else {
          setWsResponseStatus(`❌ WebSocket not connected when sending response`)
        }
      } else {
        console.error(`❌ WebSocket client is null when trying to send tool response for ${request_id}`)
        setWsResponseStatus(`❌ Failed: WebSocket client is null for ${request_id}`)
      }
      
      setLastToolRequest(`Response sent for ${tool} at ${new Date().toLocaleTimeString()}`)
      
      console.log(`✅ Tool ${tool} executed successfully`, result)
      console.log(`📤 Sent WebSocket response:`, responseData)
    } catch (error) {
      console.error(`❌ Tool ${tool} failed:`, error)
      console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace')
      
      // Update error display
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      setToolError(`${tool} failed: ${errorMsg}`)
      
      // Send error response
      const errorWsMessage = {
        id: Date.now().toString(),
        type: 'tool_response',
        timestamp: new Date().toISOString(),
        data: {
          request_id,
          success: false,
          error: errorMsg
        }
      }
      
      setLastToolRequest(`Sending error response for ${tool} at ${new Date().toLocaleTimeString()}`)
      setWsResponseStatus(`Sending error response for ${request_id}`)
      wsClient.current?.send(errorWsMessage)
      setWsResponseStatus(`❌ Sent error response for ${request_id} at ${new Date().toLocaleTimeString()}`)
      setLastToolRequest(`Error response sent for ${tool} at ${new Date().toLocaleTimeString()}`)
      
      console.log(`📤 Sent WebSocket error response:`, errorWsMessage)
    }
  }

  const handleSendMessage = async () => {
    console.log('🚀 handleSendMessage called', { 
      input, 
      hasClient: !!wsClient.current, 
      connectionStatus 
    })
    
    if (!input.trim() || !wsClient.current) {
      console.warn('❌ Cannot send message:', { 
        emptyInput: !input.trim(), 
        noClient: !wsClient.current 
      })
      return
    }

    const messageContent = input.trim()
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: messageContent,
      role: 'user',
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      // Get Excel context if available
      let excelContext = null
      if (typeof Office !== 'undefined' && Office.context && Office.context.workbook) {
        try {
          await Excel.run(async (context) => {
            const range = context.workbook.getSelectedRange()
            range.load(['address', 'values'])
            await context.sync()
            
            excelContext = {
              selectedRange: range.address,
              values: range.values
            }
          })
        } catch (error) {
          console.error('Error getting Excel context:', error)
        }
      }

      // Send message through WebSocket in the format the backend expects
      const chatData = {
        content: messageContent,
        context: excelContext ? { excel: excelContext } : undefined,
        sessionId: sessionIdRef.current // Use persistent session ID
      }
      
      const messageToSend = {
        id: Date.now().toString(),
        type: 'chat_message',
        timestamp: new Date().toISOString(),
        data: chatData
      }
      console.log('📮 Sending message to backend:', messageToSend)
      wsClient.current.send(messageToSend)
      addToWsLog(`→ Sent chat_message`)
    } catch (error) {
      console.error('Error sending message:', error)
      setIsLoading(false)
      
      // Show error message
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        content: 'Sorry, I encountered an error. Please make sure the backend server is running.',
        role: 'assistant',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    }
  }
  
  const handleApplyActions = (actionIds: string[]) => {
    console.log('✅ Applying actions:', actionIds)
    
    // Send confirmation to backend
    if (wsClient.current && currentPreviewId) {
      wsClient.current.send({
        id: Date.now().toString(),
        type: 'approve_changes',
        timestamp: new Date().toISOString(),
        data: {
          previewId: currentPreviewId,
          changeIds: actionIds
        }
      })
    }
    
    // Clear pending actions
    setPendingActions([])
    setCurrentPreviewId(null)
    
    // Add confirmation message
    const confirmMessage: ChatMessage = {
      id: Date.now().toString(),
      content: `✅ Applied ${actionIds.length} changes to the spreadsheet.`,
      role: 'system',
      timestamp: new Date()
    }
    setMessages(prev => [...prev, confirmMessage])
  }
  
  const handleRejectActions = () => {
    console.log('❌ Rejecting actions')
    
    // Send rejection to backend
    if (wsClient.current && currentPreviewId) {
      wsClient.current.send({
        id: Date.now().toString(),
        type: 'reject_changes',
        timestamp: new Date().toISOString(),
        data: {
          previewId: currentPreviewId,
          reason: 'User rejected changes'
        }
      })
    }
    
    // Clear pending actions
    setPendingActions([])
    setCurrentPreviewId(null)
  }

  // Get real-time connection status
  const isActuallyConnected = wsClient.current?.isConnected() || false
  const displayStatus = isActuallyConnected ? 'connected' : connectionStatus

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div key={renderKey} style={{
        padding: '10px',
        background: displayStatus === 'connected' ? '#90EE90' : displayStatus === 'connecting' ? '#fffacd' : '#ffcccc',
        color: '#333',
        fontSize: '12px',
        textAlign: 'center'
      }}>
        {displayStatus === 'connected' ? '✅ Connected to backend' : 
         displayStatus === 'connecting' ? '🔄 Connecting to backend...' : 
         '❌ Disconnected from backend'}
      </div>
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {pendingActions.length > 0 && (
          <ActionPreview
            actions={pendingActions}
            onApply={handleApplyActions}
            onReject={handleRejectActions}
          />
        )}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <ChatInterface
            messages={messages}
            input={input}
            setInput={setInput}
            handleSendMessage={handleSendMessage}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  )
}