import * as signalR from '@microsoft/signalr'
import { EventEmitter } from 'events'

export interface SignalRMessage {
  id?: string
  type: string
  timestamp?: string
  data: any
}

export class SignalRClient extends EventEmitter {
  private connection: signalR.HubConnection | null = null
  private url: string
  private reconnectInterval: number = 5000
  private maxReconnectAttempts: number = 10
  private reconnectAttempts: number = 0
  private isIntentionallyClosed: boolean = false
  private messageQueue: SignalRMessage[] = []
  private sessionId: string | null = null

  constructor(url: string) {
    super()
    this.url = url
  }

  async connect(token?: string): Promise<void> {
    try {
      console.log(`🔌 Creating SignalR connection to: ${this.url}`)
      
      // Build SignalR connection with automatic reconnect
      this.connection = new signalR.HubConnectionBuilder()
        .withUrl(this.url, {
          withCredentials: true,
          transport: signalR.HttpTransportType.WebSockets | 
                    signalR.HttpTransportType.ServerSentEvents |
                    signalR.HttpTransportType.LongPolling
        })
        .withAutomaticReconnect({
          nextRetryDelayInMilliseconds: (retryContext) => {
            if (retryContext.previousRetryCount === this.maxReconnectAttempts) {
              return null // Stop reconnecting
            }
            return Math.min(retryContext.previousRetryCount * 2000, 30000)
          }
        })
        .configureLogging(signalR.LogLevel.Information)
        .build()

      // Set up event handlers
      this.setupEventHandlers()

      // Start the connection
      await this.connection.start()
      console.log('✅ SignalR connected successfully!')
      console.log('✅ Connection state:', this.connection.state)
      
      this.reconnectAttempts = 0
      this.emit('connected')
      
      // Authenticate if token provided
      if (token) {
        await this.authenticate(token)
      }
      
      // Send any queued messages
      await this.processMessageQueue()
      
    } catch (error) {
      console.error('Failed to create SignalR connection:', error)
      this.emit('error', error)
      
      // Attempt to reconnect
      if (!this.isIntentionallyClosed && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++
        console.log(`🔄 Attempting reconnect ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${this.reconnectInterval}ms...`)
        setTimeout(() => this.connect(token), this.reconnectInterval)
      }
    }
  }

  private setupEventHandlers(): void {
    if (!this.connection) return

    // Connection lifecycle events
    this.connection.onreconnecting((error) => {
      console.log('🔄 SignalR reconnecting...', error)
      this.emit('reconnecting')
    })

    this.connection.onreconnected((connectionId) => {
      console.log('✅ SignalR reconnected:', connectionId)
      this.emit('reconnected')
      // Re-authenticate after reconnection
      if (this.sessionId) {
        this.authenticate('dev-token-123')
      }
    })

    this.connection.onclose((error) => {
      console.log('🔴 SignalR disconnected:', error)
      this.emit('disconnected')
    })

    // Message handlers
    this.connection.on('connected', (data) => {
      console.log('📥 Received connected event:', data)
      this.emit('message', { type: 'notification', data })
    })

    this.connection.on('authSuccess', (data) => {
      console.log('📥 Received authSuccess:', data)
      this.sessionId = data.sessionId
      this.emit('auth_success', data)
      this.emit('message', { type: 'auth_success', data })
    })

    this.connection.on('authError', (error) => {
      console.error('❌ Authentication error:', error)
      this.emit('auth_error', error)
    })

    this.connection.on('toolRequest', (data) => {
      console.log('📥 Received tool request:', data)
      this.emit('tool_request', data)
      this.emit('message', { type: 'tool_request', data })
    })

    this.connection.on('aiResponse', (data) => {
      console.log('📥 Received AI response:', data)
      this.emit('ai_response', data)
      this.emit('message', { type: 'ai_response', data })
    })

    this.connection.on('error', (error) => {
      console.error('❌ SignalR error:', error)
      this.emit('error', error)
    })
  }

  private async authenticate(token: string): Promise<void> {
    if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) {
      console.error('Cannot authenticate: SignalR not connected')
      return
    }

    try {
      await this.connection.invoke('Authenticate', token)
      console.log('🔐 Authentication request sent')
    } catch (error) {
      console.error('Failed to authenticate:', error)
      this.emit('error', error)
    }
  }

  async send(message: SignalRMessage): Promise<void> {
    if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) {
      console.log('⏳ SignalR not connected, queueing message:', message.type)
      this.messageQueue.push(message)
      return
    }

    try {
      console.log('📤 Sending SignalR message:', message)
      
      switch (message.type) {
        case 'auth':
          await this.authenticate(message.data.token)
          break
          
        case 'chat_message':
          if (!this.sessionId) {
            console.error('No session ID available')
            return
          }
          // Include Excel context if available
          const excelContext = message.data.excelContext || null
          await this.connection.invoke('SendChatMessage', this.sessionId, message.data.content, excelContext)
          break
          
        case 'tool_response':
          await this.connection.invoke('SendToolResponse', 
            message.data.request_id, 
            message.data.result,
            message.data.error
          )
          break
          
        case 'selection_update':
          if (!this.sessionId) {
            console.error('No session ID available')
            return
          }
          await this.connection.invoke('UpdateSelection', 
            this.sessionId,
            message.data.selection,
            message.data.worksheet
          )
          break
          
        default:
          console.warn('Unknown message type:', message.type)
      }
      
      console.log('✅ Message sent successfully')
    } catch (error) {
      console.error('Failed to send message:', error)
      this.emit('error', error)
    }
  }

  private async processMessageQueue(): Promise<void> {
    while (this.messageQueue.length > 0) {
      const msg = this.messageQueue.shift()
      if (msg) {
        console.log('📤 Sending queued message:', msg.type)
        await this.send(msg)
      }
    }
  }

  isConnected(): boolean {
    return this.connection?.state === signalR.HubConnectionState.Connected
  }

  getConnectionState(): string {
    if (!this.connection) return 'Disconnected'
    
    switch (this.connection.state) {
      case signalR.HubConnectionState.Connected:
        return 'Connected'
      case signalR.HubConnectionState.Connecting:
        return 'Connecting'
      case signalR.HubConnectionState.Disconnected:
        return 'Disconnected'
      case signalR.HubConnectionState.Disconnecting:
        return 'Disconnecting'
      case signalR.HubConnectionState.Reconnecting:
        return 'Reconnecting'
      default:
        return 'Unknown'
    }
  }

  async disconnect(): Promise<void> {
    this.isIntentionallyClosed = true
    if (this.connection) {
      try {
        await this.connection.stop()
        console.log('🔌 SignalR connection closed')
      } catch (error) {
        console.error('Error closing SignalR connection:', error)
      }
    }
  }

  getSessionId(): string | null {
    return this.sessionId
  }
}