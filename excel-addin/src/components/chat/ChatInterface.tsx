import React from 'react'
import { ChatMessage } from '../../types/chat'
import { Send, Loader2 } from 'lucide-react'

interface ChatInterfaceProps {
  messages: ChatMessage[]
  input: string
  setInput: (value: string) => void
  handleSendMessage: () => void
  isLoading: boolean
  autonomySelector?: React.ReactNode
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  input,
  setInput,
  handleSendMessage,
  isLoading,
  autonomySelector
}) => {
  const messagesEndRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleKeyPress = (e: React.KeyboardEvent) => {
    console.log('🔤 Key pressed:', e.key, 'Shift:', e.shiftKey)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      console.log('📨 Enter pressed - calling handleSendMessage')
      handleSendMessage()
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <p className="text-lg font-medium mb-2">Welcome to Gridmate AI</p>
            <p className="text-sm">Select cells in Excel and ask me anything about your financial model!</p>
            <div className="mt-6 space-y-2">
              <p className="text-xs text-gray-400">Try asking:</p>
              <div className="space-y-1">
                <p className="text-xs italic">"What's the formula in this cell?"</p>
                <p className="text-xs italic">"Calculate the NPV for this cash flow"</p>
                <p className="text-xs italic">"Add a sensitivity analysis here"</p>
              </div>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : message.role === 'system'
                    ? 'bg-green-100 text-green-800 border border-green-200'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap select-text" style={{ userSelect: 'text', WebkitUserSelect: 'text' }}>{message.content}</p>
                <p className="text-xs opacity-70 mt-1 select-text" style={{ userSelect: 'text', WebkitUserSelect: 'text' }}>
                  {new Date(message.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg px-4 py-2">
              <Loader2 className="w-4 h-4 animate-spin text-gray-600" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Container */}
      <div className="border-t border-gray-200 p-4">
        <div className="space-y-2">
          {/* Textarea */}
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about your financial model..."
            className="w-full px-4 py-3 border border-gray-600 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white placeholder-gray-400 text-sm select-text"
            style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
            rows={2}
            disabled={isLoading}
          />
          {/* Controls Row */}
          <div className="flex items-center justify-between">
            {/* Autonomy Selector */}
            {autonomySelector && (
              <div className="flex-shrink-0">
                {autonomySelector}
              </div>
            )}
            {!autonomySelector && <div />}
            {/* Send Button */}
            <button
              onClick={() => {
                console.log('🔘 Send button clicked')
                handleSendMessage()
              }}
              disabled={!input.trim() || isLoading}
              className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Send message"
            >
              {isLoading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Send className="w-3 h-3" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}