import React, { useState, useEffect, useRef } from 'react'
import { ChatInterface } from './ChatInterface'
import { ChatMessage } from '@types/chat'
import { WebSocketClient } from '@services/websocket/WebSocketClient'

export const ChatInterfaceWithBackend: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')
  const wsClient = useRef<WebSocketClient | null>(null)

  useEffect(() => {
    // Only initialize once
    if (wsClient.current) {
      return
    }

    // Initialize WebSocket connection
    console.log('🔌 Initializing WebSocket connection...')
    wsClient.current = new WebSocketClient('ws://localhost:8080/ws')

    wsClient.current.on('connected', () => {
      console.log('✅ WebSocket connected')
      setConnectionStatus('connected')
    })

    wsClient.current.on('connect', () => {
      console.log('✅ WebSocket connected (connect event)')
      setConnectionStatus('connected')
    })

    wsClient.current.on('disconnect', () => {
      console.log('❌ WebSocket disconnected')
      setConnectionStatus('disconnected')
    })

    wsClient.current.on('message', (data: any) => {
      console.log('📨 Received message:', data)
      
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
    })

    wsClient.current.on('error', (error: any) => {
      console.error('🔴 WebSocket error:', error)
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

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: input,
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

      // Send message through WebSocket
      const messageToSend = {
        type: 'chat_message',
        content: input,
        excelContext: excelContext
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

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        padding: '10px',
        background: connectionStatus === 'connected' ? '#90EE90' : connectionStatus === 'connecting' ? '#fffacd' : '#ffcccc',
        color: '#333',
        fontSize: '12px',
        textAlign: 'center'
      }}>
        {connectionStatus === 'connected' ? '✅ Connected to backend' : 
         connectionStatus === 'connecting' ? '🔄 Connecting to backend...' : 
         '❌ Disconnected from backend'}
        <div style={{ fontSize: '10px', marginTop: '4px' }}>
          WebSocket: {wsClient.current ? 'Created' : 'Not created'} | 
          Ready: {wsClient.current?.isConnected() ? 'Yes' : 'No'}
        </div>
      </div>
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
  )
}