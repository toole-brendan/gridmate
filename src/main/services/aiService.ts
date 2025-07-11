import Anthropic from '@anthropic-ai/sdk'
import { AIResponse, ChatMessage } from '@shared/types/ai'
import { AIError, ErrorCode } from '../utils/errors'
import { logger, logAIOperation, logPerformance } from '../utils/logger'

export class AIService {
  private anthropic: Anthropic
  private conversationHistory: ChatMessage[] = []

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      logger.warn('ANTHROPIC_API_KEY not found in environment variables')
    }
    this.anthropic = new Anthropic({ 
      apiKey: apiKey || '',
      // Add timeout for better error handling
      timeout: 30000, // 30 seconds
    })
    logger.info('AIService initialized', { hasApiKey: !!apiKey })
  }

  async chat(message: string, context?: any): Promise<AIResponse> {
    const startTime = Date.now()
    
    try {
      logger.debug('AI chat request', { 
        messageLength: message.length, 
        hasContext: !!context,
        historyLength: this.conversationHistory.length 
      })
      
      const systemPrompt = this.buildSystemPrompt(context)
      
      this.conversationHistory.push({
        role: 'user',
        content: message,
        timestamp: new Date()
      })

      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022', // Using latest Claude 3.5 Sonnet
        max_tokens: 1024,
        temperature: 0.7,
        system: systemPrompt,
        messages: this.conversationHistory.map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        }))
      })

      const assistantMessage = response.content[0]
      if (assistantMessage && assistantMessage.type === 'text') {
        this.conversationHistory.push({
          role: 'assistant',
          content: assistantMessage.text,
          timestamp: new Date()
        })

        const result = {
          content: assistantMessage.text,
          suggestions: this.extractSuggestions(assistantMessage.text, context),
          confidence: 0.95
        }
        
        // Log successful operation
        const duration = Date.now() - startTime
        logAIOperation('chat', message, assistantMessage.text)
        logPerformance('ai_chat', duration, { 
          responseLength: assistantMessage.text.length 
        })
        
        return result
      }

      throw new AIError(
        ErrorCode.AI_INVALID_RESPONSE,
        'Unexpected response format from AI service'
      )
    } catch (error) {
      const duration = Date.now() - startTime
      
      // Log the error
      logAIOperation('chat', message, undefined, error)
      logPerformance('ai_chat_error', duration)
      
      // Handle specific Anthropic API errors
      if (error instanceof Anthropic.APIError) {
        logger.error('Anthropic API Error:', {
          status: error.status,
          message: error.message,
          type: error.type,
          headers: error.headers
        })
        
        if (error.status === 401) {
          throw new AIError(
            ErrorCode.AI_UNAUTHORIZED,
            'Invalid API key. Please check your ANTHROPIC_API_KEY in .env file',
            401,
            error
          )
        } else if (error.status === 429) {
          throw new AIError(
            ErrorCode.AI_RATE_LIMITED,
            'Rate limit exceeded. Please try again later',
            429,
            error,
            { retryAfter: error.headers?.['retry-after'] }
          )
        } else if (error.status === 500 || error.status === 503) {
          throw new AIError(
            ErrorCode.AI_CONNECTION_FAILED,
            'AI service temporarily unavailable',
            error.status,
            error
          )
        }
      }
      
      // Handle timeout errors
      if (error instanceof Error && error.message.includes('timeout')) {
        throw new AIError(
          ErrorCode.AI_TIMEOUT,
          'AI request timed out. Please try again',
          408,
          error
        )
      }
      
      // Re-throw if already an AIError
      if (error instanceof AIError) {
        throw error
      }
      
      // Unknown error
      throw new AIError(
        ErrorCode.AI_CONNECTION_FAILED,
        'Failed to communicate with AI service',
        500,
        error instanceof Error ? error : new Error(String(error))
      )
    }
  }

  async generateFormula(description: string, context?: any): Promise<string> {
    const startTime = Date.now()
    
    try {
      logger.debug('Formula generation request', { description, hasContext: !!context })
      
      const prompt = `Generate an Excel formula for the following requirement: ${description}
Context: ${JSON.stringify(context || {})}
Return only the formula, starting with =`

      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022', // Using latest Claude 3.5 Sonnet
        max_tokens: 256,
        temperature: 0.3,
        system: 'You are an expert in Excel formulas and financial modeling. Generate accurate, efficient formulas.',
        messages: [{ role: 'user', content: prompt }]
      })

      const content = response.content[0]
      if (content && content.type === 'text') {
        const formula = this.extractFormula(content.text)
        
        // Log successful operation
        const duration = Date.now() - startTime
        logAIOperation('generateFormula', description, formula)
        logPerformance('ai_generate_formula', duration)
        
        return formula
      }
      
      throw new AIError(
        ErrorCode.AI_INVALID_RESPONSE,
        'Failed to generate formula - unexpected response format'
      )
    } catch (error) {
      const duration = Date.now() - startTime
      
      // Log the error
      logAIOperation('generateFormula', description, undefined, error)
      logPerformance('ai_generate_formula_error', duration)
      
      if (error instanceof AIError) {
        throw error
      }
      
      throw new AIError(
        ErrorCode.AI_CONNECTION_FAILED,
        'Failed to generate formula',
        500,
        error instanceof Error ? error : new Error(String(error))
      )
    }
  }

  private buildSystemPrompt(context?: any): string {
    const basePrompt = `You are Gridmate, an AI assistant for financial modeling in Excel and Google Sheets.
You help financial analysts build accurate models, fix errors, and improve their workflows.
Always prioritize accuracy and provide clear explanations for financial calculations.`

    if (context?.activeRange) {
      return `${basePrompt}\n\nCurrent context:
- Active range: ${context.activeRange.address}
- Values: ${JSON.stringify(context.activeRange.values)}
- Formulas: ${JSON.stringify(context.activeRange.formulas)}`
    }

    return basePrompt
  }

  private extractSuggestions(response: string, context?: any): string[] {
    const suggestions: string[] = []
    
    if (response.includes('formula')) {
      suggestions.push('Generate formula')
    }
    if (response.includes('error') || response.includes('mistake')) {
      suggestions.push('Check for errors')
    }
    if (response.includes('optimize') || response.includes('improve')) {
      suggestions.push('Optimize formulas')
    }
    
    return suggestions
  }

  private extractFormula(text: string): string {
    const formulaMatch = text.match(/=[\s\S]+/)
    if (formulaMatch) {
      return formulaMatch[0].trim()
    }
    return text.trim()
  }

  clearHistory(): void {
    this.conversationHistory = []
  }
  
  /**
   * Test the API connection
   */
  async testConnection(): Promise<boolean> {
    const startTime = Date.now()
    
    try {
      logger.info('Testing AI connection...')
      
      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hi' }]
      })
      
      const success = response.content.length > 0
      const duration = Date.now() - startTime
      
      logger.info('AI connection test completed', { success, duration })
      logPerformance('ai_connection_test', duration, { success })
      
      return success
    } catch (error) {
      const duration = Date.now() - startTime
      
      if (error instanceof Anthropic.APIError) {
        logger.error('API connection test failed:', {
          status: error.status,
          message: error.message,
          type: error.type
        })
      } else {
        logger.error('Connection test failed with unknown error:', error)
      }
      
      logPerformance('ai_connection_test', duration, { success: false })
      return false
    }
  }
}