import React, { useState, useRef, useEffect } from 'react'
import { Send, Loader2, Sparkles, AlertCircle } from 'lucide-react'
import { MessageList } from './MessageList'
import { SuggestionChips } from './SuggestionChips'
import { useChatStore } from '../store/chatStore'
import { useSpreadsheetStore } from '../store/spreadsheetStore'

interface ChatPanelProps {
  isConnected: boolean
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ isConnected }) => {
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const { messages, addMessage, clearMessages } = useChatStore()
  const { activeRange } = useSpreadsheetStore()

  const suggestions = [
    'Generate a DCF model',
    'Check for formula errors',
    'Create a sensitivity table',
    'Explain this formula'
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading || !isConnected) return

    const userMessage = input.trim()
    setInput('')
    setIsLoading(true)

    // Add user message
    addMessage({
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    })

    try {
      // Prepare context
      const context = {
        activeRange: activeRange ? {
          address: activeRange.address,
          values: activeRange.values,
          formulas: activeRange.formulas
        } : null
      }

      // Call AI
      const response = await window.gridmate.chat(userMessage, context)
      
      // Add AI response
      addMessage({
        role: 'assistant',
        content: response.content,
        timestamp: new Date(),
        metadata: {
          suggestions: response.suggestions,
          confidence: response.confidence
        }
      })
    } catch (error) {
      console.error('Chat error:', error)
      addMessage({
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion)
    inputRef.current?.focus()
  }

  useEffect(() => {
    inputRef.current?.focus()
  }, [isConnected])

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <AlertCircle className="w-12 h-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
          No Spreadsheet Connected
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Connect to Excel or Google Sheets to start using Gridmate
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="p-6">
            <div className="flex items-center justify-center mb-6">
              <Sparkles className="w-8 h-8 text-gridmate-primary" />
            </div>
            <h2 className="text-xl font-semibold text-center mb-4">
              Welcome to Gridmate
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-6">
              Your AI assistant for financial modeling. Try these suggestions:
            </p>
            <SuggestionChips
              suggestions={suggestions}
              onSuggestionClick={handleSuggestionClick}
            />
          </div>
        ) : (
          <MessageList messages={messages} />
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex space-x-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit(e)
              }
            }}
            placeholder="Ask about your spreadsheet..."
            className="flex-1 resize-none gridmate-input"
            rows={1}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="gridmate-btn disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </form>
    </div>
  )
}