import { ChatMessage } from './chat'
import { DiffData } from '../store/useDiffSessionStore'

export type EnhancedMessageType = 
  | 'user' 
  | 'assistant' 
  | 'system' 
  | 'tool-suggestion' 
  | 'tool-result' 
  | 'batch-operation'
  | 'response-tools-group'
  | 'audit'
  | 'status'

export interface BaseEnhancedMessage extends Omit<ChatMessage, 'role'> {
  type: EnhancedMessageType
  role?: 'user' | 'assistant' | 'system'
  diff?: Omit<DiffData, 'messageId'> // Persisted diff data for this message
}

export interface ExcelDiff {
  type: 'formula' | 'value' | 'format' | 'chart' | 'table'
  range: string
  before?: any
  after?: any
  summary?: string
  affectedCells?: number
}

export interface ToolSuggestionMessage extends BaseEnhancedMessage {
  type: 'tool-suggestion'
  tool: {
    id: string
    name: string
    description: string
    parameters: Record<string, any>
    preview?: ExcelDiff
    estimatedTime?: string
    riskLevel?: 'low' | 'medium' | 'high'
  }
  actions: {
    approve: () => void
    reject: () => void
    modify?: () => void
  }
  status: 'pending' | 'approved' | 'rejected' | 'expired'
  expiresAt?: Date
  responseId?: string // Track which AI response generated this tool
}

export interface ToolResultMessage extends BaseEnhancedMessage {
  type: 'tool-result'
  tool: {
    id: string
    name: string
  }
  status: 'success' | 'failed' | 'partial' | 'cancelled'
  summary: string
  details?: {
    changedCells?: number
    executionTime?: number
    error?: string
    diff?: ExcelDiff
  }
  actions?: {
    undo?: () => void
    retry?: () => void
    viewDetails?: () => void
  }
}

export interface BatchOperationMessage extends BaseEnhancedMessage {
  type: 'batch-operation'
  batch: {
    id: string
    title: string
    description?: string
    totalOperations: number
    operations: ToolSuggestionMessage[]
    collapsed: boolean
    progress?: {
      completed: number
      failed: number
      pending: number
    }
    dependencies?: Array<{
      from: string
      to: string
      type: 'requires' | 'blocks'
    }>
  }
  actions: {
    approveAll: () => void
    rejectAll: () => void
    expand: () => void
    collapse: () => void
  }
  status: 'pending' | 'in-progress' | 'completed' | 'failed' | 'partial'
}

export interface ResponseToolsGroupMessage extends BaseEnhancedMessage {
  type: 'response-tools-group'
  responseId: string
  aiResponseContent: string
  tools: ToolSuggestionMessage[]
  actions: {
    approveAll: () => void
    rejectAll: () => void
    expandAll: () => void
    collapseAll: () => void
  }
  status: 'pending' | 'in-progress' | 'completed' | 'failed' | 'partial'
  collapsed: boolean
}

export interface AuditMessage extends BaseEnhancedMessage {
  type: 'audit'
  audit: {
    operation: string
    user: string
    timestamp: Date
    details: Record<string, any>
    status: 'success' | 'failed'
  }
  expanded: boolean
  actions: {
    toggleExpand: () => void
    export?: () => void
  }
}

export interface StatusMessage extends BaseEnhancedMessage {
  type: 'status'
  status: {
    type: 'thinking' | 'processing' | 'generating' | 'executing' | 'error' | 'info' | 'success' | 'searching' | 'analyzing'
    message: string
    progress?: number
    duration?: number
    details?: string
    subSteps?: Array<{
      name: string
      status: 'pending' | 'active' | 'completed' | 'failed'
      duration?: number
    }>
  }
  animated: boolean
}

export type EnhancedChatMessage = 
  | ChatMessage 
  | ToolSuggestionMessage 
  | ToolResultMessage 
  | BatchOperationMessage
  | ResponseToolsGroupMessage
  | AuditMessage
  | StatusMessage

export function isToolSuggestion(message: EnhancedChatMessage): message is ToolSuggestionMessage {
  return 'type' in message && message.type === 'tool-suggestion'
}

export function isToolResult(message: EnhancedChatMessage): message is ToolResultMessage {
  return 'type' in message && message.type === 'tool-result'
}

export function isBatchOperation(message: EnhancedChatMessage): message is BatchOperationMessage {
  return 'type' in message && message.type === 'batch-operation'
}

export function isResponseToolsGroup(message: EnhancedChatMessage): message is ResponseToolsGroupMessage {
  return 'type' in message && message.type === 'response-tools-group'
}

export function isAuditMessage(message: EnhancedChatMessage): message is AuditMessage {
  return 'type' in message && message.type === 'audit'
}

export function isStatusMessage(message: EnhancedChatMessage): message is StatusMessage {
  return 'type' in message && message.type === 'status'
}

export function isStandardMessage(message: EnhancedChatMessage): message is ChatMessage {
  return !('type' in message) || ['user', 'assistant', 'system'].includes(message.role || '')
}