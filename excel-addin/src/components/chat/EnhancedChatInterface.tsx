import React, { useState, useEffect } from 'react'
import { Send, Loader2 } from 'lucide-react'
import { 
  EnhancedChatMessage, 
  isToolSuggestion, 
  isToolResult, 
  isBatchOperation,
  isAuditMessage,
  isStatusMessage,
  isStandardMessage
} from '../../types/enhanced-chat'
import { 
  ToolSuggestionCard, 
  ToolResultCard, 
  BatchOperationCard,
  AuditMessage,
  StatusIndicator
} from './messages'
import { 
  MentionableTextarea, 
  ContextPillsContainer,
  MentionItem,
  ContextItem
} from './mentions'
import { 
  KeyboardShortcuts, 
  ShortcutsHelpOverlay,
  ShortcutHandler
} from './KeyboardShortcuts'
import { 
  SlashCommands,
  useSlashCommands,
  SlashCommand
} from './SlashCommands'

interface EnhancedChatInterfaceProps {
  messages: EnhancedChatMessage[]
  input: string
  setInput: (value: string) => void
  handleSendMessage: () => void
  isLoading: boolean
  autonomySelector?: React.ReactNode
  onMessageAction?: (messageId: string, action: string) => void
  availableMentions?: MentionItem[]
  activeContext?: ContextItem[]
  onContextRemove?: (id: string) => void
  onMentionSelect?: (mention: MentionItem) => void
  onUndo?: () => void
  onRedo?: () => void
  onClearChat?: () => void
  hasUndo?: boolean
  hasRedo?: boolean
}

export const EnhancedChatInterface: React.FC<EnhancedChatInterfaceProps> = ({
  messages,
  input,
  setInput,
  handleSendMessage,
  isLoading,
  autonomySelector,
  onMessageAction,
  availableMentions = [],
  activeContext = [],
  onContextRemove,
  onMentionSelect,
  onUndo,
  onRedo,
  onClearChat,
  hasUndo = false,
  hasRedo = false
}) => {
  const messagesEndRef = React.useRef<HTMLDivElement>(null)
  const [focusedMessageId, setFocusedMessageId] = React.useState<string | null>(null)
  const [showShortcutsHelp, setShowShortcutsHelp] = React.useState(false)
  const inputRef = React.useRef<HTMLTextAreaElement>(null)

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Define slash commands
  const slashCommands: SlashCommand[] = [
    {
      command: 'undo',
      description: 'Undo last operation',
      handler: () => onUndo?.(),
      category: 'Actions'
    },
    {
      command: 'redo',
      description: 'Redo last operation',
      handler: () => onRedo?.(),
      category: 'Actions'
    },
    {
      command: 'clear',
      description: 'Clear chat history',
      handler: () => {
        if (window.confirm('Clear all chat history?')) {
          onClearChat?.()
        }
      },
      category: 'Chat'
    },
    {
      command: 'help',
      description: 'Show keyboard shortcuts',
      handler: () => setShowShortcutsHelp(true),
      category: 'Help'
    },
    {
      command: 'export',
      description: 'Export chat as markdown',
      handler: () => {
        const markdown = messages.map(msg => {
          if (isStandardMessage(msg)) {
            return `**${msg.role}**: ${msg.content}\n`
          }
          return `**System**: ${msg.type} message\n`
        }).join('\n')
        
        const blob = new Blob([markdown], { type: 'text/markdown' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `gridmate-chat-${new Date().toISOString()}.md`
        a.click()
        URL.revokeObjectURL(url)
      },
      category: 'Chat'
    }
  ]
  
  const { showCommands, commandSearch, handleCommandSelect, closeCommands } = useSlashCommands(
    input,
    setInput,
    slashCommands
  )

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !showCommands) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const renderMessage = (message: EnhancedChatMessage) => {
    if (isToolSuggestion(message)) {
      return (
        <div
          className={`w-full animate-fadeIn ${
            focusedMessageId === message.id ? 'ring-2 ring-blue-500/50 rounded-lg' : ''
          }`}
        >
          <ToolSuggestionCard 
            message={message}
            onApprove={() => onMessageAction?.(message.id, 'approve')}
            onReject={() => onMessageAction?.(message.id, 'reject')}
            onModify={() => onMessageAction?.(message.id, 'modify')}
          />
        </div>
      )
    }

    if (isToolResult(message)) {
      return (
        <div className="w-full animate-fadeIn">
          <ToolResultCard message={message} />
        </div>
      )
    }

    if (isBatchOperation(message)) {
      return (
        <div
          className={`w-full animate-fadeIn ${
            focusedMessageId === message.id ? 'ring-2 ring-blue-500/50 rounded-lg' : ''
          }`}
        >
          <BatchOperationCard message={message} />
        </div>
      )
    }

    if (isAuditMessage(message)) {
      return (
        <div className="w-full animate-fadeIn">
          <AuditMessage message={message} />
        </div>
      )
    }

    if (isStatusMessage(message)) {
      return (
        <div className="w-full animate-fadeIn">
          <StatusIndicator message={message} />
        </div>
      )
    }

    // Standard chat message
    if (isStandardMessage(message)) {
      return (
        <div
          className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}
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
            <p className="text-sm whitespace-pre-wrap select-text" style={{ 
              userSelect: 'text', 
              WebkitUserSelect: 'text',
              MozUserSelect: 'text',
              msUserSelect: 'text',
              cursor: 'text'
            }}>
              {message.content}
            </p>
            {message.metadata?.suggestedActions && message.metadata.suggestedActions.length > 0 && (
              <div className="mt-2 pt-2 border-t border-gray-200/20">
                <p className="text-xs opacity-70 mb-1">Suggested actions:</p>
                <div className="space-y-1">
                  {message.metadata.suggestedActions.map((action) => (
                    <div key={action.id} className="text-xs opacity-80">
                      • {action.description}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <p className="text-xs opacity-70 mt-1 select-text" style={{ 
              userSelect: 'text', 
              WebkitUserSelect: 'text',
              MozUserSelect: 'text',
              msUserSelect: 'text',
              cursor: 'text'
            }}>
              {new Date(message.timestamp).toLocaleTimeString()}
            </p>
          </div>
        </div>
      )
    }

    return null
  }

  // Define keyboard shortcuts
  const shortcuts: ShortcutHandler[] = [
    {
      key: 'l',
      ctrlOrCmd: true,
      description: 'Focus chat input',
      handler: () => {
        const textarea = document.querySelector('textarea') as HTMLTextAreaElement
        textarea?.focus()
      }
    },
    {
      key: 'k',
      ctrlOrCmd: true,
      description: 'Clear chat',
      handler: () => {
        if (window.confirm('Clear all chat history?')) {
          onClearChat?.()
        }
      }
    },
    {
      key: 'z',
      ctrlOrCmd: true,
      description: 'Undo last operation',
      handler: () => onUndo?.(),
      enabled: hasUndo
    },
    {
      key: 'z',
      ctrlOrCmd: true,
      shift: true,
      description: 'Redo last operation',
      handler: () => onRedo?.(),
      enabled: hasRedo
    },
    {
      key: 'Enter',
      ctrlOrCmd: true,
      description: 'Approve all pending actions',
      handler: () => {
        const pendingActions = messages.filter(m => 
          (isToolSuggestion(m) && m.status === 'pending') ||
          (isBatchOperation(m) && m.status === 'pending')
        )
        pendingActions.forEach(action => {
          if (isToolSuggestion(action)) {
            action.actions.approve()
          } else if (isBatchOperation(action)) {
            action.actions.approveAll()
          }
        })
      }
    },
    {
      key: '?',
      description: 'Show keyboard shortcuts',
      handler: () => setShowShortcutsHelp(true)
    },
    {
      key: '/',
      ctrlOrCmd: true,
      description: 'Show keyboard shortcuts',
      handler: () => setShowShortcutsHelp(true)
    },
    {
      key: 'ArrowUp',
      description: 'Navigate to previous action',
      handler: () => {
        const actionMessages = messages.filter(m => 
          isToolSuggestion(m) || isBatchOperation(m)
        ).filter(m => 
          (isToolSuggestion(m) && m.status === 'pending') ||
          (isBatchOperation(m) && m.status === 'pending')
        )
        
        if (actionMessages.length === 0) return
        
        const currentIndex = focusedMessageId 
          ? actionMessages.findIndex(m => m.id === focusedMessageId)
          : -1
          
        if (currentIndex > 0) {
          setFocusedMessageId(actionMessages[currentIndex - 1].id)
        } else if (currentIndex === -1 && actionMessages.length > 0) {
          setFocusedMessageId(actionMessages[actionMessages.length - 1].id)
        }
      }
    },
    {
      key: 'ArrowDown',
      description: 'Navigate to next action',
      handler: () => {
        const actionMessages = messages.filter(m => 
          isToolSuggestion(m) || isBatchOperation(m)
        ).filter(m => 
          (isToolSuggestion(m) && m.status === 'pending') ||
          (isBatchOperation(m) && m.status === 'pending')
        )
        
        if (actionMessages.length === 0) return
        
        const currentIndex = focusedMessageId 
          ? actionMessages.findIndex(m => m.id === focusedMessageId)
          : -1
          
        if (currentIndex < actionMessages.length - 1 && currentIndex !== -1) {
          setFocusedMessageId(actionMessages[currentIndex + 1].id)
        } else if (currentIndex === -1 && actionMessages.length > 0) {
          setFocusedMessageId(actionMessages[0].id)
        }
      }
    },
    {
      key: 'Enter',
      description: 'Approve focused action',
      handler: () => {
        if (focusedMessageId) {
          onMessageAction?.(focusedMessageId, 'approve')
        }
      }
    },
    {
      key: 'Escape',
      description: 'Reject focused action',
      handler: () => {
        if (focusedMessageId) {
          onMessageAction?.(focusedMessageId, 'reject')
        }
      }
    }
  ]


  return (
    <KeyboardShortcuts shortcuts={shortcuts}>
      <div className="h-full flex flex-col bg-gray-900 text-gray-100">
      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-400 mt-8">
            <p className="text-lg font-medium mb-2">Welcome to Gridmate AI</p>
            <p className="text-sm">Select cells in Excel and ask me anything about your financial model!</p>
            <div className="mt-6 space-y-2">
              <p className="text-xs text-gray-500">Try asking:</p>
              <div className="space-y-1">
                <p className="text-xs italic text-gray-500">"What's the formula in this cell?"</p>
                <p className="text-xs italic text-gray-500">"Calculate the NPV for this cash flow"</p>
                <p className="text-xs italic text-gray-500">"Add a sensitivity analysis here"</p>
              </div>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className="w-full">
              {renderMessage(message)}
            </div>
          ))
        )}
        {isLoading && (
          <div className="w-full animate-fadeIn">
            <StatusIndicator 
              message={{
                id: 'loading',
                type: 'status',
                content: '',
                timestamp: new Date(),
                status: {
                  type: 'thinking',
                  message: 'AI is analyzing your request'
                },
                animated: true
              }}
            />
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Container */}
      <div className="border-t border-gray-700 p-4 bg-gray-800">
        <div className="space-y-2">
          {/* Context Pills */}
          {activeContext.length > 0 && (
            <ContextPillsContainer
              items={activeContext}
              onRemove={onContextRemove}
              className="mb-2"
            />
          )}
          
          {/* Textarea with mentions */}
          <MentionableTextarea
            value={input}
            onChange={setInput}
            onKeyPress={handleKeyPress}
            placeholder="Ask about your financial model... (Use @ to reference cells)"
            disabled={isLoading}
            rows={2}
            availableMentions={availableMentions}
            onMentionSelect={onMentionSelect}
            className="w-full px-4 py-3 border border-gray-600 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-100 bg-gray-700 placeholder-gray-400 text-sm"
          />
          
          {/* Controls Row */}
          <div className="flex items-center justify-between">
            {/* Left side: Autonomy Selector and mention hint */}
            <div className="flex items-center space-x-3">
              {autonomySelector && (
                <div className="flex-shrink-0">
                  {autonomySelector}
                </div>
              )}
              <div className="text-xs text-gray-500">
                Type @ to reference sheets, ranges, or tables
              </div>
            </div>
            
            {/* Send Button */}
            <button
              onClick={() => handleSendMessage()}
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
        
        {/* Slash Commands */}
        {showCommands && (
          <div className="relative">
            <SlashCommands
              commands={slashCommands}
              isVisible={showCommands}
              searchTerm={commandSearch}
              onSelect={handleCommandSelect}
              onClose={closeCommands}
              position={{ x: 0, y: 40 }}
            />
          </div>
        )}
      </div>

      {/* Shortcuts Help Overlay */}
      <ShortcutsHelpOverlay
        isOpen={showShortcutsHelp}
        onClose={() => setShowShortcutsHelp(false)}
        shortcuts={shortcuts}
      />

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
    </KeyboardShortcuts>
  )
}