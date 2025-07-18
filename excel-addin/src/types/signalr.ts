import { SignalRMessage } from '../services/signalr/SignalRClient';

export interface SignalRMessageHandler {
  (message: SignalRMessage): void
}

export interface SignalRToolRequest {
  request_id: string
  tool: string
  parameters: Record<string, any>
  sheet?: string
  range?: string
  preview?: boolean
}

export interface SignalRAIResponse {
  content: string
  messageId: string
  isComplete: boolean
  type?: 'completion' | 'response'
  operationsSummary?: any
} 