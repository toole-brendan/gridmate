/// <reference types="@types/office-js" />
import React, { useState, useEffect, useRef } from 'react'
import { ChatInterface } from './ChatInterface'
import { ChatMessage } from '../../types/chat'
import { SignalRClient } from '../../services/signalr/SignalRClient'
import { PendingAction } from './ActionPreview'
import { PendingActionsPanel } from './PendingActionsPanel'
import { ExcelService } from '../../services/excel/ExcelService'
import { AutonomyMode } from './AutonomyModeSelector'
import { CompactAutonomySelector } from './CompactAutonomySelector'
import { checkToolSafety, AuditLogger } from '../../utils/safetyChecks'

// Global SignalR client instance to prevent multiple connections
let globalSignalRClient: SignalRClient | null = null
let globalSessionId: string = `session_${Date.now()}`

export const ChatInterfaceWithSignalR: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([])
  // const [, setCurrentPreviewId] = useState<string | null>(null)
  const signalRClient = useRef<SignalRClient | null>(globalSignalRClient)
  const sessionIdRef = useRef<string>(globalSessionId)
  const [lastToolRequest, setLastToolRequest] = useState<string>('')
  const [toolError, setToolError] = useState<string>('')
  // const [signalRLog, setSignalRLog] = useState<string[]>([])
  const [aiIsGenerating, setAiIsGenerating] = useState(false)
  
  // Autonomy mode state - load from localStorage
  const [autonomyMode, setAutonomyMode] = useState<AutonomyMode>(() => {
    const saved = localStorage.getItem('gridmate-autonomy-mode')
    return (saved as AutonomyMode) || 'agent-default'
  })
  const [isProcessingAction, setIsProcessingAction] = useState(false)
  const toolRequestQueue = useRef<Map<string, any>>(new Map())
  
  // Helper to add to message log
  const addToLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    // setSignalRLog(prev => [...prev.slice(-10), `[${timestamp}] ${message}`])
    console.log(`[${timestamp}] ${message}`)
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
      
      // Add a success message to inform the user
      const reconnectMsg: ChatMessage = {
        id: `reconnect_${Date.now()}`,
        role: 'system',
        content: '✅ Connection restored. Ready to continue.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, reconnectMsg])
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
    if (!(window as any).Office?.context?.document || !signalRClient.current) return

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
    (window as any).Office.context.document.addHandlerAsync(
      (window as any).Office.EventType.DocumentSelectionChanged,
      handleSelectionChange,
      (result: any) => {
        if (result.status === (window as any).Office.AsyncResultStatus.Succeeded) {
          console.log('✅ Selection change handler registered')
        } else {
          console.error('❌ Failed to register selection handler:', result.error)
        }
      }
    )

    // Cleanup
    return () => {
      (window as any).Office.context.document.removeHandlerAsync(
        (window as any).Office.EventType.DocumentSelectionChanged,
        { handler: handleSelectionChange }
      )
    }
  }, [signalRClient.current])

  // Define read-only tools that should be auto-approved
  const readOnlyTools = [
    'read_range',
    'analyze_data',
    'analyze_model_structure',
    'get_named_ranges',
    'validate_model'
  ]
  
  const isReadOnlyTool = (toolName: string): boolean => {
    return readOnlyTools.includes(toolName)
  }

  const handleToolRequest = async (toolRequest: any) => {
    console.log('🛠️ Handling tool request:', toolRequest)
    console.log('🛠️ Full tool request data:', JSON.stringify(toolRequest, null, 2))
    console.log('🎯 Current autonomy mode:', autonomyMode)
    setLastToolRequest(`Tool: ${toolRequest.tool}, Request ID: ${toolRequest.request_id}`)
    
    // Auto-approve read-only tools regardless of mode
    if (isReadOnlyTool(toolRequest.tool)) {
      console.log('📖 Auto-approving read-only tool:', toolRequest.tool)
      addToLog(`🔍 Auto-executing read tool: ${toolRequest.tool}`)
      await executeToolRequest(toolRequest)
      return
    }
    
    // Check autonomy mode for non-read tools
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
      toolRequestQueue.current.set(toolRequest.request_id, toolRequest)
      setPendingActions(prev => {
        const newPending = [...prev, pendingAction]
        console.log('📋 New pending actions:', newPending)
        console.log('📋 Pending actions count:', newPending.length)
        return newPending
      })
      
      addToLog(`⏳ Queued tool for approval: ${toolRequest.request_id}`)
      console.log('✅ Tool request queued, current pending count:', pendingActions.length + 1)
      
      // Send a "queued" response so backend can continue sending more tools
      await signalRClient.current?.send({
        type: 'tool_response',
        data: {
          request_id: toolRequest.request_id,
          result: { status: 'queued', message: 'Tool queued for user approval' },
          error: null,
          queued: true  // Special flag to indicate this is queued, not executed
        }
      })
      
      return
    }
    
    // Agent YOLO mode - execute immediately
    console.log('🚀 Agent YOLO mode - executing immediately')
    await executeToolRequest(toolRequest)
  }
  
  const executeToolRequest = async (toolRequest: any) => {
    const { tool, request_id, ...input } = toolRequest
    
    console.log('🎯 Starting executeToolRequest:', {
      tool,
      request_id,
      timestamp: new Date().toISOString()
    })
    
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
      
      toolRequestQueue.current.set(request_id, toolRequest)
      setPendingActions(prev => [...prev, pendingAction])
      addToLog(`⚠️ High-risk operation queued for approval: ${request_id}`)
      return
    }
    
    try {
      const excelService = ExcelService.getInstance()
      console.log('🛠️ Tool input after destructuring:', JSON.stringify(input, null, 2))
      
      console.log('📊 Calling ExcelService.executeToolRequest...')
      const startTime = Date.now()
      const result = await excelService.executeToolRequest(tool, input)
      const executionTime = Date.now() - startTime
      
      console.log(`✅ Tool execution successful in ${executionTime}ms:`, result)
      
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
      console.log('📤 Preparing to send tool response via SignalR...')
      const responsePayload = {
        type: 'tool_response',
        data: {
          request_id: toolRequest.request_id,
          result: result,
          error: null
        }
      }
      console.log('📤 Response payload:', responsePayload)
      
      await signalRClient.current?.send(responsePayload)
      
      console.log(`✅ Tool response sent successfully for ${toolRequest.request_id}`)
      addToLog(`→ Sent tool_response for ${toolRequest.request_id}`)
      
    } catch (error) {
      console.error('❌ Tool execution failed:', error)
      const errorMessage = (error as Error).message
      setToolError(errorMessage)
      
      // Check if it's a network-related error
      const isNetworkError = errorMessage.toLowerCase().includes('network') || 
                           errorMessage.toLowerCase().includes('connection') ||
                           errorMessage.toLowerCase().includes('offline')
      
      // Log failed execution
      AuditLogger.logToolExecution({
        timestamp: new Date(),
        toolName: tool,
        parameters: input,
        autonomyMode: autonomyMode,
        result: 'failure',
        error: errorMessage,
        sessionId: sessionIdRef.current
      })
      
      // If it's a network error and we're disconnected, queue the tool for retry
      if (isNetworkError && !signalRClient.current?.isConnected()) {
        console.log('📶 Network error detected, will retry when reconnected')
        
        // Add a system message to inform the user
        const errorMsg: ChatMessage = {
          id: `error_${Date.now()}`,
          role: 'system',
          content: `⚠️ Network disconnection detected. Tool "${tool}" will be retried when connection is restored.`,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, errorMsg])
        
        // Don't send error response yet, wait for reconnection
        return
      }
      
      // Send enhanced error response
      await signalRClient.current?.send({
        type: 'tool_response',
        data: {
          request_id: toolRequest.request_id,
          result: null,
          error: errorMessage,
          errorDetails: error instanceof Error ? error.stack : String(error),
          metadata: {
            tool: toolRequest.tool,
            input: toolRequest.input,
            timestamp: new Date().toISOString(),
            connectionState: signalRClient.current?.isConnected() ? 'connected' : 'disconnected'
          }
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
    
    // Check if this is the final response from AI (no more tool calls expected)
    if (response.isFinal) {
      setAiIsGenerating(false)
      console.log('🎯 AI finished generating - isFinal flag is true')
    } else if (response.content || response.message) {
      // Fallback: If we receive content but no isFinal flag, assume it's done
      setAiIsGenerating(false)
      console.log('🎯 AI finished generating - received final response (fallback)')
    }
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
    setAiIsGenerating(true)  // AI starts generating
    setPendingActions([])  // Clear any previous pending actions

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
          selectedCells: (excelContext.selectedData?.rowCount || 0) * (excelContext.selectedData?.colCount || 0),
          nearbyCells: (excelContext.nearbyData?.rowCount || 0) * (excelContext.nearbyData?.colCount || 0)
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

  // const _handleActionPreview = (action: any) => {
  //   console.log('Preview action:', action)
  //   setPendingActions([...pendingActions, action])
  //   setCurrentPreviewId(action.id)
  // }

  const handleActionApprove = async (actionId: string) => {
    console.log('Approve action:', actionId)
    const action = pendingActions.find(a => a.id === actionId)
    const toolRequest = toolRequestQueue.current.get(actionId)
    
    if (action && toolRequest) {
      setIsProcessingAction(true)
      
      // Update action status to executing
      setPendingActions(prev => 
        prev.map(a => a.id === actionId ? { ...a, status: 'executing' } : a)
      )
      
      try {
        // Execute the approved tool request
        await executeToolRequest(toolRequest)
        
        // Update status to completed
        setPendingActions(prev => 
          prev.map(a => a.id === actionId ? { ...a, status: 'completed' } : a)
        )
        
        // Remove after a short delay to show the completed status
        setTimeout(() => {
          setPendingActions(prev => prev.filter(a => a.id !== actionId))
          toolRequestQueue.current.delete(actionId)
        }, 2000)
      } catch (error) {
        // Update status to failed
        setPendingActions(prev => 
          prev.map(a => a.id === actionId ? { 
            ...a, 
            status: 'failed', 
            error: (error as Error).message 
          } : a)
        )
      }
      
      setIsProcessingAction(false)
    }
  }

  const handleActionReject = async (actionId: string) => {
    console.log('Reject action:', actionId)
    const toolRequest = toolRequestQueue.current.get(actionId)
    
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
    toolRequestQueue.current.delete(actionId)
  }
  
  const handleApproveAll = async () => {
    setIsProcessingAction(true)
    
    // Mark all actions as executing
    setPendingActions(prev => 
      prev.map(a => ({ ...a, status: 'executing' as const }))
    )
    
    for (const action of pendingActions) {
      const toolRequest = toolRequestQueue.current.get(action.id)
      if (toolRequest) {
        try {
          await executeToolRequest(toolRequest)
          
          // Update to completed
          setPendingActions(prev => 
            prev.map(a => a.id === action.id ? { ...a, status: 'completed' as const } : a)
          )
        } catch (error) {
          // Update to failed
          setPendingActions(prev => 
            prev.map(a => a.id === action.id ? { 
              ...a, 
              status: 'failed' as const, 
              error: (error as Error).message 
            } : a)
          )
        }
        toolRequestQueue.current.delete(action.id)
      }
    }
    
    // Clear all actions after a delay to show final statuses
    setTimeout(() => {
      setPendingActions([])
    }, 2000)
    
    setIsProcessingAction(false)
  }
  
  const handleRejectAll = async () => {
    for (const action of pendingActions) {
      const toolRequest = toolRequestQueue.current.get(action.id)
      if (toolRequest) {
        await signalRClient.current?.send({
          type: 'tool_response',
          data: {
            request_id: toolRequest.request_id,
            result: null,
            error: 'Tool execution rejected by user'
          }
        })
        toolRequestQueue.current.delete(action.id)
      }
    }
    
    setPendingActions([])
  }

  // const _testSignalR = async () => {
  //   if (signalRClient.current?.isConnected()) {
  //     try {
  //       await signalRClient.current.send({
  //         id: Date.now().toString(),
  //         type: 'test',
  //         timestamp: new Date().toISOString(),
  //         data: { message: 'Test from Excel add-in' }
  //       })
  //       addToLog('→ Sent test message')
  //     } catch (error) {
  //       console.error('Test failed:', error)
  //       addToLog(`❌ Test failed: ${(error as Error).message}`)
  //     }
  //   } else {
  //     console.warn('SignalR not connected')
  //     addToLog('⚠️ SignalR not connected')
  //   }
  // }

  // const _reconnect = async () => {
  //   addToLog('🔄 Manual reconnect initiated')
  //   if (signalRClient.current) {
  //     await signalRClient.current.disconnect()
  //     await signalRClient.current.connect('dev-token-123')
  //   }
  // }


  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Pending Actions */}
      {pendingActions.length > 0 && (
        <PendingActionsPanel
          actions={pendingActions}
          onApproveAll={handleApproveAll}
          onRejectAll={handleRejectAll}
          onApproveOne={handleActionApprove}
          onRejectOne={handleActionReject}
          isProcessing={isProcessingAction}
          aiIsGenerating={aiIsGenerating}
        />
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