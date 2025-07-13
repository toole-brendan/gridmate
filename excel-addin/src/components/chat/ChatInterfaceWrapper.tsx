import React, { useState } from 'react'
import { ChatInterface } from './ChatInterface'
import { ChatMessage } from '@types/chat'

export const ChatInterfaceWrapper: React.FC = () => {
  console.log('🎨 ChatInterfaceWrapper rendering')
  
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  
  const handleSendMessage = () => {
    console.log('📤 Sending message:', input)
    if (input.trim()) {
      const newMessage: ChatMessage = {
        id: Date.now().toString(),
        content: input,
        role: 'user',
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev, newMessage])
      setInput('')
      setIsLoading(true)
      
      // Simulate AI response
      setTimeout(() => {
        const aiMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          content: `Debug response: You said "${input}". This is a test response to verify the chat is working.`,
          role: 'assistant',
          timestamp: new Date()
        }
        setMessages(prev => [...prev, aiMessage])
        setIsLoading(false)
      }, 1000)
    }
  }
  
  console.log('📊 Current state:', { messages, input, isLoading })
  
  try {
    return (
      <div style={{ 
        height: '100vh', 
        display: 'flex', 
        flexDirection: 'column',
        background: 'white'
      }}>
        <div style={{ 
          padding: '10px', 
          background: '#f0f0f0', 
          borderBottom: '1px solid #ddd',
          fontSize: '12px',
          color: '#666'
        }}>
          🔍 Debug: ChatInterface loaded | Messages: {messages.length} | Loading: {isLoading ? 'Yes' : 'No'}
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
  } catch (error) {
    console.error('❌ Error in ChatInterfaceWrapper:', error)
    return (
      <div style={{ padding: '20px', background: '#ffeeee', color: '#cc0000' }}>
        <h2>Error in ChatInterfaceWrapper</h2>
        <pre>{error?.toString()}</pre>
      </div>
    )
  }
}