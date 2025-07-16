export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  diff?: any // Will be typed properly when used in enhanced-chat
  metadata?: {
    excelContext?: {
      workbook: string
      worksheet: string
      selectedRange: string
    }
    suggestedActions?: ChatAction[]
    sources?: DocumentSource[]
  }
}

export interface ChatAction {
  id: string
  type: 'write_cell' | 'read_range' | 'insert_formula' | 'create_chart' | 'format_cells'
  description: string
  address?: string
  value?: any
  formula?: string
  preview?: {
    before: any
    after: any
  }
}

export interface DocumentSource {
  id: string
  documentName: string
  section: string
  pageNumber?: number
  confidence: number
}

export interface ChatSession {
  id: string
  userId: string
  workspaceId: string
  messages: ChatMessage[]
  createdAt: Date
  updatedAt: Date
  excelContext?: {
    workbookPath: string
    isConnected: boolean
  }
}