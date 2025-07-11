import React from 'react'
import ReactMarkdown from 'react-markdown'
import { User, Bot, Copy, Check } from 'lucide-react'
import { ChatMessage } from '@shared/types/ai'

interface MessageListProps {
  messages: ChatMessage[]
}

export const MessageList: React.FC<MessageListProps> = ({ messages }) => {
  const [copiedIndex, setCopiedIndex] = React.useState<number | null>(null)

  const handleCopy = (content: string, index: number) => {
    navigator.clipboard.writeText(content)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  return (
    <div className="p-4 space-y-4">
      {messages.map((message, index) => (
        <div
          key={index}
          className={`flex space-x-3 message-appear ${
            message.role === 'assistant' ? 'bg-gray-50 dark:bg-gray-800/50 -mx-4 px-4 py-3 rounded-lg' : ''
          }`}
        >
          <div className="flex-shrink-0">
            {message.role === 'user' ? (
              <div className="w-8 h-8 bg-wendigo-primary rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
            ) : (
              <div className="w-8 h-8 bg-wendigo-accent rounded-full flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1 prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown
                  components={{
                    code: ({ node, inline, className, children, ...props }) => {
                      const match = /language-(\w+)/.exec(className || '')
                      const isFormula = String(children).trim().startsWith('=')
                      
                      if (!inline && match) {
                        return (
                          <div className="relative group">
                            <pre className="bg-gray-900 text-gray-100 p-3 rounded overflow-x-auto">
                              <code className={className} {...props}>
                                {children}
                              </code>
                            </pre>
                            <button
                              onClick={() => handleCopy(String(children), index)}
                              className="absolute top-2 right-2 p-1.5 bg-gray-800 text-gray-400 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              {copiedIndex === index ? (
                                <Check size={14} />
                              ) : (
                                <Copy size={14} />
                              )}
                            </button>
                          </div>
                        )
                      }
                      
                      if (isFormula) {
                        return (
                          <code className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-1.5 py-0.5 rounded font-mono text-sm">
                            {children}
                          </code>
                        )
                      }
                      
                      return (
                        <code className="bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 px-1 py-0.5 rounded text-sm" {...props}>
                          {children}
                        </code>
                      )
                    }
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
              
              {message.role === 'assistant' && (
                <button
                  onClick={() => handleCopy(message.content, index)}
                  className="ml-2 p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  {copiedIndex === index ? (
                    <Check size={16} />
                  ) : (
                    <Copy size={16} />
                  )}
                </button>
              )}
            </div>
            
            {message.metadata?.suggestions && message.metadata.suggestions.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {message.metadata.suggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    className="text-xs px-2 py-1 bg-wendigo-accent/10 text-wendigo-accent rounded hover:bg-wendigo-accent/20 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}