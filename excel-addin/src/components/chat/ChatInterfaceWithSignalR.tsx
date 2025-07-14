import React, { useState, useEffect, useRef } from 'react'
import { ChatInterface } from './ChatInterface'
import { ChatMessage } from '@types/chat'
import { SignalRClient } from '@services/signalr/SignalRClient'
import { ActionPreview } from '@components/actions/ActionPreview'
import { ExcelService } from '@services/excel/ExcelService'

// Global SignalR client instance to prevent multiple connections
let globalSignalRClient: SignalRClient | null = null
let globalSessionId: string = `session_${Date.now()}`

export const ChatInterfaceWithSignalR: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')
  const [pendingActions, setPendingActions] = useState<any[]>([])
  const [currentPreviewId, setCurrentPreviewId] = useState<string | null>(null)
  const signalRClient = useRef<SignalRClient | null>(globalSignalRClient)
  const sessionIdRef = useRef<string>(globalSessionId)
  const [lastToolRequest, setLastToolRequest] = useState<string>('')
  const [toolError, setToolError] = useState<string>('')
  const [signalRLog, setSignalRLog] = useState<string[]>([])
  
  // Helper to add to message log
  const addToLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setSignalRLog(prev => [...prev.slice(-10), `[${timestamp}] ${message}`])
  }

  useEffect(() => {
    // Check if global client exists
    if (globalSignalRClient && globalSignalRClient.isConnected()) {
      console.log('⚠️ Using existing global SignalR client')
      signalRClient.current = globalSignalRClient
      setConnectionStatus('connected')
      return
    }
    
    // Only initialize once
    if (signalRClient.current || globalSignalRClient) {
      console.log('⚠️ SignalR client already exists, skipping initialization')
      return
    }

    // Initialize SignalR connection
    console.log('🔌 Initializing SignalR connection...')
    console.log('🆔 Component session ID:', sessionIdRef.current)
    
    // Connect to SignalR service - use relative path to work with HTTPS proxy
    const signalRUrl = window.location.protocol === 'https:' 
      ? `${window.location.protocol}//${window.location.host}/signalr/hub`
      : 'http://localhost:5000/hub'
    console.log('🔗 SignalR URL:', signalRUrl)
    
    addToLog(`🔗 Connecting to SignalR at ${signalRUrl}`)
    
    // Create new SignalR client and store globally
    const newClient = new SignalRClient(signalRUrl)
    signalRClient.current = newClient
    globalSignalRClient = newClient

    // Listen for connection events
    signalRClient.current.on('connected', () => {
      console.log('✅ SignalR connected event fired')
      addToLog('✅ SignalR connected')
      setConnectionStatus('connected')
    })

    signalRClient.current.on('disconnected', () => {
      console.log('❌ SignalR disconnected')
      addToLog('❌ SignalR disconnected')
      setConnectionStatus('disconnected')
    })

    signalRClient.current.on('reconnecting', () => {
      console.log('🔄 SignalR reconnecting...')
      addToLog('🔄 SignalR reconnecting...')
      setConnectionStatus('connecting')
    })

    signalRClient.current.on('reconnected', () => {
      console.log('✅ SignalR reconnected')
      addToLog('✅ SignalR reconnected')
      setConnectionStatus('connected')
    })

    signalRClient.current.on('message', (data: any) => {
      console.log('📨 Received message:', data)
      addToLog(`← Received ${data.type}`)
      
      // Handle different message types
      if (data.type === 'auth_success') {
        sessionIdRef.current = data.data.sessionId || sessionIdRef.current
        console.log('🔐 Updated session ID:', sessionIdRef.current)
      }
      
      if (data.type === 'tool_request') {
        handleToolRequest(data.data)
      }
      
      if (data.type === 'ai_response') {
        handleAIResponse(data.data)
      }
    })

    signalRClient.current.on('error', (error: any) => {
      console.error('❌ SignalR error:', error)
      addToLog(`❌ Error: ${error.message || 'Unknown error'}`)
    })

    // Connect with authentication
    signalRClient.current.connect('dev-token-123').catch(error => {
      console.error('Failed to connect:', error)
      addToLog(`❌ Connection failed: ${error.message}`)
    })

    // Cleanup function
    return () => {
      if (signalRClient.current === globalSignalRClient) {
        console.log('⚠️ Component unmounting but keeping global SignalR connection alive')
      }
    }
  }, [])

  // Subscribe to Excel selection changes
  useEffect(() => {
    if (!Office?.context?.document || !signalRClient.current) return

    const handleSelectionChange = async () => {
      try {
        if (signalRClient.current?.isConnected()) {
          const context = await ExcelService.getInstance().getContext()
          
          await signalRClient.current.send({
            id: Date.now().toString(),
            type: 'selection_update',
            timestamp: new Date().toISOString(),
            data: {
              sessionID: sessionIdRef.current,
              selection: context.selectedRange,
              worksheet: context.worksheet
            }
          })
          
          console.log('📍 Sent selection update:', context.selectedRange)
        }
      } catch (error) {
        console.error('Failed to send selection update:', error)
      }
    }

    // Register event handler
    Office.context.document.addHandlerAsync(
      Office.EventType.DocumentSelectionChanged,
      handleSelectionChange,
      (result: any) => {
        if (result.status === Office.AsyncResultStatus.Succeeded) {
          console.log('✅ Selection change handler registered')
        } else {
          console.error('❌ Failed to register selection handler:', result.error)
        }
      }
    )

    // Cleanup
    return () => {
      Office.context.document.removeHandlerAsync(
        Office.EventType.DocumentSelectionChanged,
        { handler: handleSelectionChange }
      )
    }
  }, [signalRClient.current])

  const handleToolRequest = async (toolRequest: any) => {
    console.log('🛠️ Handling tool request:', toolRequest)
    console.log('🛠️ Full tool request data:', JSON.stringify(toolRequest, null, 2))
    setLastToolRequest(`Tool: ${toolRequest.tool}, Request ID: ${toolRequest.request_id}`)
    
    try {
      const excelService = ExcelService.getInstance()
      const { tool, request_id, ...input } = toolRequest
      console.log('🛠️ Tool input after destructuring:', JSON.stringify(input, null, 2))
      const result = await excelService.executeToolRequest(tool, input)
      
      console.log('✅ Tool execution successful:', result)
      
      // Send response back via SignalR
      await signalRClient.current?.send({
        type: 'tool_response',
        data: {
          request_id: toolRequest.request_id,
          result: result,
          error: null
        }
      })
      
      addToLog(`→ Sent tool_response for ${toolRequest.request_id}`)
      
    } catch (error) {
      console.error('❌ Tool execution failed:', error)
      setToolError(error.message)
      
      // Send error response
      await signalRClient.current?.send({
        type: 'tool_response',
        data: {
          request_id: toolRequest.request_id,
          result: null,
          error: error.message
        }
      })
    }
  }

  const handleAIResponse = (response: any) => {
    console.log('🤖 Handling AI response:', response)
    
    const aiMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'assistant',
      content: response.content || response.message || 'Received response',
      timestamp: new Date()
    }
    
    setMessages(prev => [...prev, aiMessage])
    setIsLoading(false)
  }

  const handleSendMessage = async (content?: string) => {
    // Use the provided content or fallback to the input state
    const messageContent = content || input
    
    if (!messageContent.trim() || !signalRClient.current?.isConnected()) {
      console.warn('Cannot send message - no content or not connected')
      return
    }

    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: messageContent,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      // Collect Excel context before sending
      let excelContext = null
      try {
        // Get comprehensive context with smart loading
        const comprehensiveContext = await ExcelService.getInstance().getSmartContext()
        
        excelContext = {
          worksheet: comprehensiveContext.worksheet || 'Sheet1',
          selection: comprehensiveContext.selectedRange || '',
          workbook: comprehensiveContext.workbook || 'Workbook',
          // Include actual cell data
          selectedData: comprehensiveContext.selectedData,
          nearbyData: comprehensiveContext.nearbyData
        }
        
        console.log('📊 Collected comprehensive Excel context:', {
          worksheet: excelContext.worksheet,
          selection: excelContext.selection,
          selectedCells: excelContext.selectedData?.rowCount * excelContext.selectedData?.colCount || 0,
          nearbyCells: excelContext.nearbyData?.rowCount * excelContext.nearbyData?.colCount || 0
        })
      } catch (contextError) {
        console.warn('Failed to collect Excel context:', contextError)
        // Continue without context rather than failing completely
        excelContext = {
          worksheet: 'Sheet1',
          selection: '',
          workbook: 'Workbook'
        }
      }

      await signalRClient.current.send({
        id: Date.now().toString(),
        type: 'chat_message',
        timestamp: new Date().toISOString(),
        data: {
          content: messageContent,
          sessionID: sessionIdRef.current,
          excelContext: excelContext
        }
      })
      
      addToLog(`→ Sent chat message with context`)
    } catch (error) {
      console.error('Failed to send message:', error)
      setIsLoading(false)
      
      const errorMessage: ChatMessage = {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: 'Sorry, I encountered an error sending your message. Please try again.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    }
  }

  const handleActionPreview = (action: any) => {
    console.log('Preview action:', action)
    setPendingActions([...pendingActions, action])
    setCurrentPreviewId(action.id)
  }

  const handleActionApprove = async (actionId: string) => {
    console.log('Approve action:', actionId)
    const action = pendingActions.find(a => a.id === actionId)
    if (action) {
      // Apply the action
      setPendingActions(pendingActions.filter(a => a.id !== actionId))
      setCurrentPreviewId(null)
    }
  }

  const handleActionReject = (actionId: string) => {
    console.log('Reject action:', actionId)
    setPendingActions(pendingActions.filter(a => a.id !== actionId))
    setCurrentPreviewId(null)
  }

  const testSignalR = async () => {
    if (signalRClient.current?.isConnected()) {
      try {
        await signalRClient.current.send({
          id: Date.now().toString(),
          type: 'test',
          timestamp: new Date().toISOString(),
          data: { message: 'Test from Excel add-in' }
        })
        addToLog('→ Sent test message')
      } catch (error) {
        console.error('Test failed:', error)
        addToLog(`❌ Test failed: ${error.message}`)
      }
    } else {
      console.warn('SignalR not connected')
      addToLog('⚠️ SignalR not connected')
    }
  }

  const reconnect = async () => {
    addToLog('🔄 Manual reconnect initiated')
    if (signalRClient.current) {
      await signalRClient.current.disconnect()
      await signalRClient.current.connect('dev-token-123')
    }
  }

  // Debug info component
  const DebugInfo = () => (
    <div style={{ 
      background: '#1a1a1a', 
      padding: '8px', 
      borderRadius: '4px',
      marginBottom: '10px',
      fontSize: '10px',
      fontFamily: 'monospace',
      color: '#e0e0e0',
      border: '1px solid #333'
    }}>
      <h4 style={{ margin: '0 0 5px 0', color: '#4ade80', fontSize: '11px', fontWeight: 'bold' }}>Debug Info:</h4>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '2px 10px', marginBottom: '5px' }}>
        <span style={{ color: '#94a3b8' }}>Session:</span>
        <span style={{ color: '#fbbf24', wordBreak: 'break-all', fontSize: '9px' }}>{sessionIdRef.current}</span>
        
        <span style={{ color: '#94a3b8' }}>Office API:</span>
        <span>{Office?.context ? '✅ Available' : '❌ Not Available'}</span>
        
        <span style={{ color: '#94a3b8' }}>Excel API:</span>
        <span>{Office?.context?.requirements?.isSetSupported('ExcelApi', '1.1') ? '✅ Available' : '❌ Not Available'}</span>
        
        <span style={{ color: '#94a3b8' }}>In Excel:</span>
        <span style={{ color: window.location.pathname.includes('/excel') ? '#4ade80' : '#f87171' }}>
          {window.location.pathname.includes('/excel') ? 'Yes' : 'No'}
        </span>
        
        <span style={{ color: '#94a3b8' }}>Messages:</span>
        <span style={{ color: '#60a5fa' }}>{messages.length}</span>
        
        <span style={{ color: '#94a3b8' }}>Loading:</span>
        <span style={{ color: isLoading ? '#fbbf24' : '#6b7280' }}>{isLoading ? 'Yes' : 'No'}</span>
      </div>
      
      {lastToolRequest && (
        <div style={{ 
          color: '#60a5fa',
          marginTop: '5px',
          padding: '4px',
          background: '#262626',
          borderRadius: '2px',
          border: '1px solid #404040',
          fontSize: '9px'
        }}>
          <strong>Last Tool Request:</strong> {lastToolRequest}
        </div>
      )}
      
      {toolError && (
        <div style={{ 
          color: '#f87171', 
          marginTop: '5px',
          padding: '4px',
          background: '#450a0a',
          borderRadius: '2px',
          border: '1px solid #dc2626',
          fontSize: '9px'
        }}>
          <strong>Tool Error:</strong> {toolError}
        </div>
      )}
      
      <div style={{ 
        marginTop: '5px', 
        padding: '5px', 
        background: '#0a0a0a',
        borderRadius: '2px',
        maxHeight: '60px',
        overflow: 'auto',
        border: '1px solid #333'
      }}>
        <h5 style={{ margin: '0 0 3px 0', color: '#4ade80', fontSize: '10px' }}>SignalR Log:</h5>
        {signalRLog.slice(-5).map((log, i) => (
          <div key={i} style={{ 
            fontSize: '9px', 
            marginBottom: '1px',
            color: log.includes('✅') ? '#4ade80' : 
                   log.includes('❌') ? '#f87171' : 
                   log.includes('🔄') ? '#fbbf24' : 
                   log.includes('→') ? '#60a5fa' : 
                   log.includes('←') ? '#a78bfa' : '#e0e0e0'
          }}>
            {log}
          </div>
        ))}
      </div>
      
      <div style={{ marginTop: '5px', display: 'flex', gap: '5px' }}>
        <button 
          onClick={testSignalR}
          style={{ 
            padding: '3px 10px',
            background: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '2px',
            cursor: 'pointer',
            fontWeight: '500',
            fontSize: '10px',
            transition: 'background 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.background = '#1d4ed8'}
          onMouseOut={(e) => e.currentTarget.style.background = '#2563eb'}
        >
          Test SignalR Send
        </button>
        <button 
          onClick={reconnect}
          style={{ 
            padding: '3px 10px',
            background: '#ea580c',
            color: 'white',
            border: 'none',
            borderRadius: '2px',
            cursor: 'pointer',
            fontWeight: '500',
            fontSize: '10px',
            transition: 'background 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.background = '#c2410c'}
          onMouseOut={(e) => e.currentTarget.style.background = '#ea580c'}
        >
          Reconnect
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ flexShrink: 0 }}>
        <DebugInfo />
      </div>
      
      {currentPreviewId && (
        <div style={{ flexShrink: 0 }}>
          <ActionPreview
            action={pendingActions.find(a => a.id === currentPreviewId)}
            onApprove={handleActionApprove}
            onReject={handleActionReject}
          />
        </div>
      )}
      
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
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