import { EventEmitter } from 'events'

export interface WebSocketMessage {
  id?: string
  type: string
  timestamp?: string
  data: any
}

export class WebSocketClient extends EventEmitter {
  private ws: WebSocket | null = null
  private url: string
  private reconnectInterval: number = 5000
  private maxReconnectAttempts: number = 10
  private reconnectAttempts: number = 0
  private isIntentionallyClosed: boolean = false
  private messageQueue: WebSocketMessage[] = []

  constructor(url: string) {
    super()
    this.url = url
  }

  connect(token?: string): void {
    try {
      console.log(`🔌 Creating WebSocket connection to: ${this.url}`)
      
      // Add connection timeout
      const connectionTimeout = setTimeout(() => {
        console.error('⏱️ WebSocket connection timeout after 10s')
        if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
          this.ws.close()
          this.emit('error', new Error('Connection timeout'))
        }
      }, 10000)
      
      this.ws = new WebSocket(this.url)
      console.log(`🔌 WebSocket object created, readyState: ${this.ws.readyState}`)
      
      this.ws.onopen = () => {
        clearTimeout(connectionTimeout) // Clear timeout on successful connection
        console.log('✅ WebSocket connected successfully!')
        console.log('✅ WebSocket URL:', this.url)
        console.log('✅ WebSocket readyState:', this.ws?.readyState)
        this.reconnectAttempts = 0
        this.emit('connected')
        this.emit('connect') // Also emit 'connect' for compatibility
        
        // Send authentication if token provided
        if (token) {
          this.send({
            type: 'auth',
            data: { token }
          })
        }
        
        // Send any queued messages
        while (this.messageQueue.length > 0) {
          const msg = this.messageQueue.shift()
          if (msg) {
            console.log('📤 Sending queued message:', msg.type)
            this.send(msg)
          }
        }
      }

      this.ws.onmessage = (event) => {
        console.log('📥 Raw WebSocket message received:', event.data)
        try {
          const message = JSON.parse(event.data)
          console.log('📦 Parsed WebSocket message:', message)
          
          // Special logging for tool_request messages
          if (message.type === 'tool_request') {
            console.log('🔧📥 TOOL_REQUEST received:', {
              messageId: message.id,
              timestamp: message.timestamp,
              data: message.data,
              receivedAt: new Date().toISOString()
            })
          }
          
          this.emit('message', message)
          
          // Emit specific events based on message type
          if (message.type) {
            this.emit(message.type, message)
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error)
        }
      }

      this.ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error)
        console.error('❌ Error type:', error.type)
        console.error('❌ WebSocket state:', this.ws?.readyState)
        this.emit('error', error)
      }

      this.ws.onclose = (event) => {
        console.log('🔴 WebSocket disconnected:', {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean,
          readyState: this.ws?.readyState
        })
        this.emit('disconnected')
        
        // Attempt to reconnect if not intentionally closed
        if (!this.isIntentionallyClosed && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++
          console.log(`🔄 Attempting reconnect ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${this.reconnectInterval}ms...`)
          setTimeout(() => this.connect(token), this.reconnectInterval)
        }
      }
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error)
      this.emit('error', error)
    }
  }

  send(message: WebSocketMessage): void {
    console.log('📤 WebSocket send called:', { 
      message, 
      isConnected: this.isConnected(),
      readyState: this.ws?.readyState 
    })
    
    // Special handling for tool_response messages
    if (message.type === 'tool_response') {
      console.log('🔧📤 TOOL_RESPONSE being sent:', {
        messageId: message.id,
        timestamp: message.timestamp,
        data: message.data,
        currentTime: new Date().toISOString()
      })
    }
    
    // If not connected, queue the message
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.log('⏳ WebSocket not ready, queueing message:', message.type)
      this.messageQueue.push(message)
      
      // Try to reconnect if closed
      if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
        console.log('🔄 WebSocket closed, attempting to reconnect...')
        this.connect()
      }
      return
    }
    
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        const jsonMessage = JSON.stringify(message)
        console.log('📤 Sending WebSocket message:', jsonMessage)
        console.log('📤 Message length:', jsonMessage.length)
        console.log('📤 WebSocket state before send:', {
          readyState: this.ws.readyState,
          bufferedAmount: this.ws.bufferedAmount,
          protocol: this.ws.protocol,
          url: this.ws.url
        })
        
        this.ws.send(jsonMessage)
        
        console.log('📤 WebSocket state after send:', {
          readyState: this.ws.readyState,
          bufferedAmount: this.ws.bufferedAmount
        })
        
        // Special confirmation for tool_response
        if (message.type === 'tool_response') {
          console.log('🔧✅ TOOL_RESPONSE sent successfully via WebSocket.send()')
          console.log('🔧📊 Exact bytes sent:', jsonMessage)
          console.log('🔧📊 Message length:', jsonMessage.length)
          console.log('🔧📊 WebSocket URL:', this.ws.url)
          console.log('🔧📊 WebSocket protocol:', this.ws.protocol)
          console.log('🔧📊 WebSocket extensions:', this.ws.extensions)
        }
        
        // Force a small delay to ensure message is sent
        setTimeout(() => {
          console.log('📤 WebSocket state 100ms after send:', {
            readyState: this.ws?.readyState,
            bufferedAmount: this.ws?.bufferedAmount
          })
        }, 100)
      } catch (error) {
        console.error('❌ Error sending message:', error)
        this.emit('error', error)
        throw error // Propagate error up
      }
    } else {
      const errorMsg = `WebSocket is not connected: ws=${!!this.ws}, readyState=${this.ws?.readyState}`
      console.error(errorMsg)
      this.emit('error', new Error(errorMsg))
      throw new Error(errorMsg) // Propagate error up
    }
  }

  disconnect(): void {
    this.isIntentionallyClosed = true
    if (this.ws) {
      // Only close if the connection is open or connecting
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close()
      }
      this.ws = null
    }
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN
  }
}