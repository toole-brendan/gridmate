import React, { useState, useEffect, useRef } from 'react'
import { ChatInterface } from './ChatInterface'
import { ChatMessage } from '@types/chat'
import { WebSocketClient } from '@services/websocket/WebSocketClient'
import { ActionPreview } from '@components/actions/ActionPreview'

export const ChatInterfaceWithBackend: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')
  const [renderKey, setRenderKey] = useState(0)
  const [, forceUpdate] = React.useReducer(x => x + 1, 0)
  const [pendingActions, setPendingActions] = useState<any[]>([])
  const [currentPreviewId, setCurrentPreviewId] = useState<string | null>(null)
  const wsClient = useRef<WebSocketClient | null>(null)
  const connectionStatusRef = useRef(connectionStatus)

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
    // Only initialize once
    if (wsClient.current) {
      return
    }
    
    // Check if we're in the actual Excel add-in environment
    const isInExcel = window.location.pathname.includes('/excel')
    console.log('📍 Environment check - pathname:', window.location.pathname, 'isInExcel:', isInExcel)

    // Initialize WebSocket connection
    console.log('🔌 Initializing WebSocket connection...')
    // Use relative URL that will be proxied through Vite
    const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`
    console.log('🔗 WebSocket URL:', wsUrl)
    wsClient.current = new WebSocketClient(wsUrl)

    // Listen for connection events
    wsClient.current.on('connected', () => {
      console.log('✅ WebSocket connected event fired')
      // Send auth message with dummy token in the format backend expects
      wsClient.current.send({
        id: Date.now().toString(),
        type: 'auth',
        timestamp: new Date().toISOString(),
        data: { token: 'dev-token-123' }
      })
    })

    wsClient.current.on('connect', () => {
      console.log('✅ WebSocket connect event fired')
      // Don't set status here, wait for backend confirmation
    })

    wsClient.current.on('disconnected', () => {
      console.log('❌ WebSocket disconnected')
      setConnectionStatus('disconnected')
    })

    wsClient.current.on('message', (data: any) => {
      console.log('📨 Received message:', data)
      
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
    })

    wsClient.current.on('error', (error: any) => {
      console.error('🔴 WebSocket error:', error)
      console.error('🔴 Error details:', {
        message: error?.message,
        type: error?.type,
        target: error?.target?.url
      })
      setIsLoading(false)
    })

    wsClient.current.connect()

    return () => {
      if (wsClient.current) {
        wsClient.current.disconnect()
        wsClient.current = null
      }
    }
  }, [])

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
        sessionId: 'session_' + Date.now() // Simple session ID for now
      }
      
      const messageToSend = {
        id: Date.now().toString(),
        type: 'chat_message',
        timestamp: new Date().toISOString(),
        data: chatData
      }
      console.log('📮 Sending message to backend:', messageToSend)
      wsClient.current.send(messageToSend)
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
        <div style={{ fontSize: '10px', marginTop: '4px' }}>
          WebSocket: {wsClient.current ? 'Created' : 'Not created'} | 
          Ready: {isActuallyConnected ? 'Yes' : 'No'} |
          State: {connectionStatus} |
          DisplayStatus: {displayStatus} |
          RenderKey: {renderKey}
        </div>
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