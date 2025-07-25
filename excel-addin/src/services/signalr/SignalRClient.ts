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
  private heartbeatInterval: number | null = null

  constructor(url: string) {
    super()
    this.url = url
  }

  async connect(): Promise<void> {
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
      
      // Note: Message size limits are configured on the server side
      // The backend should be configured to handle large messages for comprehensive context

      // Set up event handlers
      this.setupEventHandlers()

      // Start the connection
      await this.connection.start()
      console.log('✅ SignalR connected successfully!')
      console.log('✅ Connection state:', this.connection.state)
      
      this.reconnectAttempts = 0
      this.emit('connected')
      
      // Send any queued messages
      await this.processMessageQueue()
      
    } catch (error) {
      console.error('Failed to create SignalR connection:', error)
      this.emit('error', error)
      
      // Attempt to reconnect
      if (!this.isIntentionallyClosed && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++
        console.log(`🔄 Attempting reconnect ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${this.reconnectInterval}ms...`)
        setTimeout(() => this.connect(), this.reconnectInterval)
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
      this.stopHeartbeat()
      this.emit('disconnected')
    })

    // Message handlers
    this.connection.on('connected', (data) => {
      console.log('📥 Received connected event:', data)
      this.emit('message', { type: 'notification', data })
      
      // Authenticate after receiving the connected event
      console.log('🔐 Authenticating after connection...')
      this.authenticate('dev-token-123').catch(error => {
        console.error('Failed to authenticate after connection:', error)
      })
    })

    this.connection.on('authSuccess', (data) => {
      console.log('📥 Received authSuccess:', data)
      this.sessionId = data.sessionId
      this.startHeartbeat()
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
      const errorData = {
        message: "An unexpected error occurred on the server.",
        details: error ? error.toString() : "No details provided.",
        timestamp: new Date().toISOString()
      };
      console.error('❌ SignalR error:', errorData);
      this.emit('error', errorData);
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
          // Include Excel context, autonomy mode, and message ID
          const excelContext = message.data.excelContext || null
          const autonomyMode = message.data.autonomyMode || 'agent-default'
          const messageId = message.data.messageId || null
          
          // Debug logging for context being sent to backend
          console.log('🚀 [SignalR] Sending to Backend - SendChatMessage params:', {
            sessionId: this.sessionId,
            content: message.data.content,
            messageId: messageId,
            autonomyMode: autonomyMode,
            excelContextSummary: excelContext ? {
              hasWorksheet: !!excelContext.worksheet,
              hasWorkbook: !!excelContext.workbook,
              hasSelectedRange: !!excelContext.selectedRange,
              hasSelectedData: !!excelContext.selectedData,
              hasNearbyRange: !!excelContext.nearbyRange,
              selectedDataDetails: excelContext.selectedData ? {
                rowCount: excelContext.selectedData.rowCount,
                colCount: excelContext.selectedData.colCount,
                hasValues: !!excelContext.selectedData.values
              } : 'No selected data',
              nearbyRangeDetails: excelContext.nearbyRange ? {
                rowCount: excelContext.nearbyRange.rowCount,
                colCount: excelContext.nearbyRange.colCount,
                hasValues: !!excelContext.nearbyRange.values
              } : 'No nearby range'
            } : 'No Excel context'
          });
          
          console.log('🚀 [SignalR] Full Excel Context being sent:', JSON.stringify(excelContext, null, 2));
          
          await this.connection.invoke('SendChatMessage', this.sessionId, message.data.content, excelContext, autonomyMode, messageId)
          break
          
        case 'tool_response':
          console.log('📤 Sending tool response:', {
            request_id: message.data.requestId,
            has_result: !!message.data.result,
            has_error: !!message.data.error,
            queued: message.data.queued || false,
            has_errorDetails: !!message.data.errorDetails,
            has_metadata: !!message.data.metadata
          })
          await this.connection.invoke('SendToolResponse', 
            message.data.requestId, 
            message.data.result === undefined ? null : message.data.result,
            message.data.error === undefined ? null : message.data.error,
            message.data.queued || false,
            message.data.errorDetails || null,
            message.data.metadata || null
          )
          console.log('✅ Tool response sent successfully')
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

  async invoke(methodName: string, ...args: any[]): Promise<any> {
    if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) {
      throw new Error('SignalR connection is not established')
    }
    return this.connection.invoke(methodName, ...args)
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
    this.stopHeartbeat()
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

  private startHeartbeat(): void {
    this.heartbeatInterval = window.setInterval(async () => {
      if (this.connection?.state === signalR.HubConnectionState.Connected && this.sessionId) {
        try {
          await this.connection.invoke('Heartbeat', this.sessionId)
          console.log('💓 Heartbeat sent')
        } catch (error) {
          console.error('Failed to send heartbeat:', error)
        }
      }
    }, 45000) // Every 45 seconds (less than server timeout)
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      window.clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  // Streaming methods using SignalR WebSocket
  async streamChat(message: {
    content: string;
    autonomyMode: string;
    excelContext?: any;
  }): Promise<void> {
    if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) {
      throw new Error('SignalR connection is not established');
    }
    
    if (!this.sessionId) {
      throw new Error('No session ID available');
    }
    
    console.log('🌊 Starting streaming chat via SignalR');
    
    // Invoke the streaming method on the hub
    try {
      await this.connection.invoke('StreamChat', 
        this.sessionId,
        message.content,
        message.autonomyMode || 'auto'
      );
    } catch (error) {
      console.error('Failed to start streaming:', error);
      throw error;
    }
  }
  
  // Set up handlers for streaming responses
  setupStreamingHandlers(handlers: {
    onChunk: (data: string) => void;
    onComplete?: () => void;
    onError?: (error: any) => void;
  }): void {
    if (!this.connection) return;
    
    // Remove any existing handlers
    this.connection.off('streamChunk');
    this.connection.off('streamComplete');
    this.connection.off('streamError');
    
    // Set up new handlers
    this.connection.on('streamChunk', (data: string) => {
      handlers.onChunk(data);
    });
    
    if (handlers.onComplete) {
      this.connection.on('streamComplete', handlers.onComplete);
    }
    
    if (handlers.onError) {
      this.connection.on('streamError', handlers.onError);
    }
  }

  // Helper to cancel streaming
  cancelStream(evtSource: EventSource) {
    if (evtSource && evtSource.readyState !== EventSource.CLOSED) {
      evtSource.close();
    }
  }
  
  // Test streaming endpoint for debugging
  async testStreaming(): Promise<void> {
    if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) {
      throw new Error('Not connected to SignalR hub');
    }
    
    console.log('🧪 Starting test stream');
    
    try {
      await this.connection.invoke('TestStream');
    } catch (error) {
      console.error('Test stream failed:', error);
      throw error;
    }
  }
}

export default SignalRClient;