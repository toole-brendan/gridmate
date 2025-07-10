export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  metadata?: Record<string, any>
}

export interface AIResponse {
  content: string
  suggestions?: string[]
  confidence?: number
  citations?: Citation[]
  actions?: AIAction[]
}

export interface Citation {
  source: string
  url?: string
  page?: number
  relevance: number
}

export interface AIAction {
  type: 'formula' | 'edit' | 'create' | 'analyze'
  description: string
  target?: string
  value?: any
  preview?: string
}

export interface FormulaGenerationRequest {
  description: string
  context?: {
    activeCell?: string
    selectedRange?: string
    referencedCells?: string[]
    namedRanges?: Record<string, string>
  }
  constraints?: {
    mustUse?: string[]
    mustAvoid?: string[]
    preferredFunctions?: string[]
  }
}

export interface ModelAnalysisRequest {
  type: 'dcf' | 'lbo' | 'merger' | 'comps' | 'general'
  ranges: string[]
  depth: 'summary' | 'detailed' | 'comprehensive'
  focusAreas?: string[]
}

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
  suggestions: string[]
}

export interface ValidationError {
  type: 'formula' | 'circular_ref' | 'type_mismatch' | 'missing_data'
  location: string
  message: string
  severity: 'critical' | 'high' | 'medium' | 'low'
}

export interface ValidationWarning {
  type: 'best_practice' | 'performance' | 'accuracy'
  location: string
  message: string
  suggestion?: string
}