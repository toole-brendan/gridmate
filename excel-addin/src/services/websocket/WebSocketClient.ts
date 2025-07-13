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

  constructor(url: string) {
    super()
    this.url = url
  }

  connect(token?: string): void {
    try {
      this.ws = new WebSocket(this.url)
      
      this.ws.onopen = () => {
        console.log('WebSocket connected')
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
      }

      this.ws.onmessage = (event) => {
        console.log('📥 Raw WebSocket message received:', event.data)
        try {
          const message = JSON.parse(event.data)
          console.log('📦 Parsed WebSocket message:', message)
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
        console.error('WebSocket error:', error)
        this.emit('error', error)
      }

      this.ws.onclose = () => {
        console.log('WebSocket disconnected')
        this.emit('disconnected')
        
        // Attempt to reconnect if not intentionally closed
        if (!this.isIntentionallyClosed && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++
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
    
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        const jsonMessage = JSON.stringify(message)
        console.log('📤 Sending WebSocket message:', jsonMessage)
        console.log('📤 Message length:', jsonMessage.length)
        this.ws.send(jsonMessage)
      } catch (error) {
        console.error('❌ Error stringifying message:', error)
        this.emit('error', error)
      }
    } else {
      console.error('WebSocket is not connected', {
        ws: !!this.ws,
        readyState: this.ws?.readyState
      })
      this.emit('error', new Error('WebSocket is not connected'))
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