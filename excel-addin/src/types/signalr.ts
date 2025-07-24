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
  type?: 'completion' | 'response' | 'ai_response' | 'error'
  operationsSummary?: any
  tokenUsage?: TokenUsage
  actions?: Array<{
    type: string
    operation_id?: string
    id?: string
    tool_type?: string
    input?: any
    preview?: any
    preview_type?: string
    description?: string
  }>
  error?: string
}

export interface TokenUsage {
  input: number
  output: number
  total: number
  max: number
} 