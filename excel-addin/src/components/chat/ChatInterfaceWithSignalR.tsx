import React, { useState, useEffect, useRef } from 'react'
import { ChatInterface } from './ChatInterface'
import { ChatMessage } from '../../types/chat'
import { SignalRClient } from '../../services/signalr/SignalRClient'
import { ActionPreview, PendingAction, BatchActionPreview } from './ActionPreview'
import { ExcelService } from '../../services/excel/ExcelService'
import { AutonomyModeSelector, AutonomyMode } from './AutonomyModeSelector'
import { CompactAutonomySelector } from './CompactAutonomySelector'
import { checkToolSafety, AuditLogger } from '../../utils/safetyChecks'

// Global SignalR client instance to prevent multiple connections
let globalSignalRClient: SignalRClient | null = null
let globalSessionId: string = `session_${Date.now()}`

export const ChatInterfaceWithSignalR: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([])
  const [currentPreviewId, setCurrentPreviewId] = useState<string | null>(null)
  const signalRClient = useRef<SignalRClient | null>(globalSignalRClient)
  const sessionIdRef = useRef<string>(globalSessionId)
  const [lastToolRequest, setLastToolRequest] = useState<string>('')
  const [toolError, setToolError] = useState<string>('')
  const [signalRLog, setSignalRLog] = useState<string[]>([])
  
  // Autonomy mode state - load from localStorage
  const [autonomyMode, setAutonomyMode] = useState<AutonomyMode>(() => {
    const saved = localStorage.getItem('gridmate-autonomy-mode')
    return (saved as AutonomyMode) || 'agent-default'
  })
  const [isProcessingAction, setIsProcessingAction] = useState(false)
  const [toolRequestQueue, setToolRequestQueue] = useState<Map<string, any>>(new Map())
  
  // Helper to add to message log
  const addToLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setSignalRLog(prev => [...prev.slice(-10), `[${timestamp}] ${message}`])
  }
  
  // Handle autonomy mode changes
  const handleAutonomyModeChange = (mode: AutonomyMode) => {
    setAutonomyMode(mode)
    localStorage.setItem('gridmate-autonomy-mode', mode)
    addToLog(`Autonomy mode changed to: ${mode}`)
  }
  
  // Keyboard shortcut for mode switching
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+. or Ctrl+. to cycle through modes
      if ((e.metaKey || e.ctrlKey) && e.key === '.') {
        e.preventDefault()
        const modes: AutonomyMode[] = ['ask', 'agent-default', 'agent-yolo']
        const currentIndex = modes.indexOf(autonomyMode)
        const nextIndex = (currentIndex + 1) % modes.length
        handleAutonomyModeChange(modes[nextIndex])
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [autonomyMode])

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
    console.log('🎯 Current autonomy mode:', autonomyMode)
    setLastToolRequest(`Tool: ${toolRequest.tool}, Request ID: ${toolRequest.request_id}`)
    
    // Check autonomy mode
    if (autonomyMode === 'ask') {
      // In Ask mode, we don't execute tools - just inform the user
      console.log('📚 Ask mode - not executing tool, informing user')
      
      const infoMessage: ChatMessage = {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: `I would like to ${getToolDescription(toolRequest.tool)} with the following parameters:\n\n${formatToolParameters(toolRequest)}`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, infoMessage])
      
      // Send rejection response to backend
      await signalRClient.current?.send({
        type: 'tool_response',
        data: {
          request_id: toolRequest.request_id,
          result: null,
          error: 'Tool execution not allowed in Ask mode'
        }
      })
      
      addToLog(`→ Rejected tool in Ask mode: ${toolRequest.request_id}`)
      return
    }
    
    if (autonomyMode === 'agent-default') {
      // In Agent Default mode, queue for approval
      console.log('🔔 Agent Default mode - queueing for approval')
      
      const pendingAction: PendingAction = {
        id: toolRequest.request_id,
        toolName: toolRequest.tool,
        parameters: toolRequest,
        description: getToolDescription(toolRequest.tool),
        timestamp: new Date()
      }
      
      // Store the full tool request for later execution
      toolRequestQueue.set(toolRequest.request_id, toolRequest)
      setPendingActions(prev => [...prev, pendingAction])
      
      addToLog(`⏳ Queued tool for approval: ${toolRequest.request_id}`)
      return
    }
    
    // Agent YOLO mode - execute immediately
    console.log('🚀 Agent YOLO mode - executing immediately')
    await executeToolRequest(toolRequest)
  }
  
  const executeToolRequest = async (toolRequest: any) => {
    const { tool, request_id, ...input } = toolRequest
    
    // Perform safety check
    const safetyCheck = checkToolSafety(tool, input)
    
    // In YOLO mode, check if operation is high risk
    if (autonomyMode === 'agent-yolo' && safetyCheck.riskLevel === 'high') {
      console.warn('⚠️ High-risk operation detected in YOLO mode:', safetyCheck.reason)
      
      // Still queue for approval even in YOLO mode for high-risk operations
      const pendingAction: PendingAction = {
        id: request_id,
        toolName: tool,
        parameters: toolRequest,
        description: `⚠️ HIGH RISK: ${getToolDescription(tool)} - ${safetyCheck.reason}`,
        timestamp: new Date()
      }
      
      toolRequestQueue.set(request_id, toolRequest)
      setPendingActions(prev => [...prev, pendingAction])
      addToLog(`⚠️ High-risk operation queued for approval: ${request_id}`)
      return
    }
    
    try {
      const excelService = ExcelService.getInstance()
      console.log('🛠️ Tool input after destructuring:', JSON.stringify(input, null, 2))
      const result = await excelService.executeToolRequest(tool, input)
      
      console.log('✅ Tool execution successful:', result)
      
      // Log successful execution
      AuditLogger.logToolExecution({
        timestamp: new Date(),
        toolName: tool,
        parameters: input,
        autonomyMode: autonomyMode,
        result: 'success',
        sessionId: sessionIdRef.current
      })
      
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
      
      // Log failed execution
      AuditLogger.logToolExecution({
        timestamp: new Date(),
        toolName: tool,
        parameters: input,
        autonomyMode: autonomyMode,
        result: 'failure',
        error: error.message,
        sessionId: sessionIdRef.current
      })
      
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
  
  const getToolDescription = (toolName: string): string => {
    const descriptions: { [key: string]: string } = {
      'read_range': 'read data from spreadsheet',
      'write_range': 'write data to spreadsheet',
      'apply_formula': 'apply formula to cells',
      'smart_format_cells': 'format cells',
      'analyze_model_structure': 'analyze spreadsheet structure',
      'build_financial_formula': 'build financial formula',
      'create_audit_trail': 'create audit documentation'
    }
    return descriptions[toolName] || toolName
  }
  
  const formatToolParameters = (toolRequest: any): string => {
    const { tool, request_id, ...params } = toolRequest
    return JSON.stringify(params, null, 2)
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
          excelContext: excelContext,
          autonomyMode: autonomyMode
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
    const toolRequest = toolRequestQueue.get(actionId)
    
    if (action && toolRequest) {
      setIsProcessingAction(true)
      
      // Execute the approved tool request
      await executeToolRequest(toolRequest)
      
      // Remove from pending actions and queue
      setPendingActions(pendingActions.filter(a => a.id !== actionId))
      toolRequestQueue.delete(actionId)
      setIsProcessingAction(false)
    }
  }

  const handleActionReject = async (actionId: string) => {
    console.log('Reject action:', actionId)
    const toolRequest = toolRequestQueue.get(actionId)
    
    if (toolRequest) {
      const { tool, request_id, ...input } = toolRequest
      
      // Log rejection
      AuditLogger.logToolExecution({
        timestamp: new Date(),
        toolName: tool,
        parameters: input,
        autonomyMode: autonomyMode,
        result: 'rejected',
        sessionId: sessionIdRef.current
      })
      
      // Send rejection response to backend
      await signalRClient.current?.send({
        type: 'tool_response',
        data: {
          request_id: toolRequest.request_id,
          result: null,
          error: 'Tool execution rejected by user'
        }
      })
      
      addToLog(`→ Rejected tool by user: ${toolRequest.request_id}`)
    }
    
    // Remove from pending actions and queue
    setPendingActions(pendingActions.filter(a => a.id !== actionId))
    toolRequestQueue.delete(actionId)
  }
  
  const handleApproveAll = async () => {
    setIsProcessingAction(true)
    
    for (const action of pendingActions) {
      const toolRequest = toolRequestQueue.get(action.id)
      if (toolRequest) {
        await executeToolRequest(toolRequest)
        toolRequestQueue.delete(action.id)
      }
    }
    
    setPendingActions([])
    setIsProcessingAction(false)
  }
  
  const handleRejectAll = async () => {
    for (const action of pendingActions) {
      const toolRequest = toolRequestQueue.get(action.id)
      if (toolRequest) {
        await signalRClient.current?.send({
          type: 'tool_response',
          data: {
            request_id: toolRequest.request_id,
            result: null,
            error: 'Tool execution rejected by user'
          }
        })
        toolRequestQueue.delete(action.id)
      }
    }
    
    setPendingActions([])
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


  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Pending Actions */}
      {pendingActions.length > 0 && (
        <div style={{ 
          padding: '12px 16px', 
          backgroundColor: '#f9fafb',
          borderBottom: '1px solid #e5e7eb',
          flexShrink: 0,
          maxHeight: '200px',
          overflowY: 'auto'
        }}>
          <BatchActionPreview
            actions={pendingActions}
            onApproveAll={handleApproveAll}
            onRejectAll={handleRejectAll}
            onApproveOne={handleActionApprove}
            onRejectOne={handleActionReject}
            isProcessing={isProcessingAction}
          />
        </div>
      )}
      
      {/* Main Chat Interface */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <ChatInterface
          messages={messages}
          input={input}
          setInput={setInput}
          handleSendMessage={handleSendMessage}
          isLoading={isLoading}
          autonomySelector={
            <CompactAutonomySelector
              currentMode={autonomyMode}
              onModeChange={handleAutonomyModeChange}
            />
          }
        />
      </div>
      
      {/* Debug Info (collapsed by default) */}
      <details style={{ 
        borderTop: '1px solid #e5e7eb', 
        backgroundColor: '#2d2d2d',
        fontSize: '11px',
        padding: '8px 12px',
        color: '#e5e7eb'
      }}>
        <summary style={{ cursor: 'pointer', fontWeight: 'medium', color: '#e5e7eb' }}>
          Debug Info
        </summary>
        <div style={{ marginTop: '8px', fontFamily: 'monospace' }}>
          <div>Session: {sessionIdRef.current}</div>
          <div>Mode: {autonomyMode}</div>
          <div>Pending: {pendingActions.length}</div>
          {lastToolRequest && <div>Last Tool: {lastToolRequest}</div>}
          {toolError && <div style={{ color: '#ef4444' }}>Error: {toolError}</div>}
          
          <details style={{ marginTop: '8px' }}>
            <summary style={{ cursor: 'pointer' }}>Audit Log (last 10)</summary>
            <div style={{ 
              marginTop: '4px', 
              maxHeight: '150px', 
              overflowY: 'auto',
              fontSize: '10px',
              lineHeight: '1.4'
            }}>
              {AuditLogger.getRecentLogs(10).reverse().map((log, index) => (
                <div key={index} style={{ 
                  marginBottom: '4px',
                  padding: '2px 4px',
                  backgroundColor: log.result === 'failure' ? '#fee2e2' : 
                                   log.result === 'rejected' ? '#fef3c7' : '#d1fae5',
                  borderRadius: '2px'
                }}>
                  <div>
                    {new Date(log.timestamp).toLocaleTimeString()} - 
                    <strong> {log.toolName}</strong> - 
                    {log.result} 
                    {log.autonomyMode && ` (${log.autonomyMode})`}
                  </div>
                  {log.error && <div style={{ color: '#ef4444' }}>Error: {log.error}</div>}
                </div>
              ))}
              {AuditLogger.getRecentLogs(10).length === 0 && (
                <div style={{ color: '#6b7280' }}>No tool executions logged</div>
              )}
            </div>
          </details>
        </div>
      </details>
    </div>
  )
}