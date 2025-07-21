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
  tokenUsage?: TokenUsage
}

export interface TokenUsage {
  input: number
  output: number
  total: number
  max: number
} 