import Anthropic from '@anthropic-ai/sdk'
import { AIResponse, ChatMessage } from '@shared/types/ai'

export class AIService {
  private anthropic: Anthropic
  private conversationHistory: ChatMessage[] = []

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY || ''
    this.anthropic = new Anthropic({ apiKey })
  }

  async chat(message: string, context?: any): Promise<AIResponse> {
    try {
      const systemPrompt = this.buildSystemPrompt(context)
      
      this.conversationHistory.push({
        role: 'user',
        content: message,
        timestamp: new Date()
      })

      const response = await this.anthropic.messages.create({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 1024,
        temperature: 0.7,
        system: systemPrompt,
        messages: this.conversationHistory.map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        }))
      })

      const assistantMessage = response.content[0]
      if (assistantMessage.type === 'text') {
        this.conversationHistory.push({
          role: 'assistant',
          content: assistantMessage.text,
          timestamp: new Date()
        })

        return {
          content: assistantMessage.text,
          suggestions: this.extractSuggestions(assistantMessage.text, context),
          confidence: 0.95
        }
      }

      throw new Error('Unexpected response format')
    } catch (error) {
      console.error('AI chat error:', error)
      throw error
    }
  }

  async generateFormula(description: string, context?: any): Promise<string> {
    const prompt = `Generate an Excel formula for the following requirement: ${description}
Context: ${JSON.stringify(context || {})}
Return only the formula, starting with =`

    const response = await this.anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 256,
      temperature: 0.3,
      system: 'You are an expert in Excel formulas and financial modeling. Generate accurate, efficient formulas.',
      messages: [{ role: 'user', content: prompt }]
    })

    const content = response.content[0]
    if (content.type === 'text') {
      return this.extractFormula(content.text)
    }
    
    throw new Error('Failed to generate formula')
  }

  private buildSystemPrompt(context?: any): string {
    const basePrompt = `You are Wendigo, an AI assistant for financial modeling in Excel and Google Sheets.
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
}