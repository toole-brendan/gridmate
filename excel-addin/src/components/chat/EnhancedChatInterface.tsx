import React, { useState, useEffect } from 'react'
import { Send, Loader2 } from 'lucide-react'
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline'
import { 
  EnhancedChatMessage, 
  isToolSuggestion, 
  isToolResult, 
  isBatchOperation,
  isResponseToolsGroup,
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
import { ResponseToolsGroupCard } from './messages/ResponseToolsGroupCard'
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
  // Bulk actions
  pendingToolsCount?: number
  onApproveAll?: () => void
  onRejectAll?: () => void
  isProcessingBulkAction?: boolean
  aiIsGenerating?: boolean
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
  hasRedo = false,
  pendingToolsCount = 0,
  onApproveAll,
  onRejectAll,
  isProcessingBulkAction = false,
  aiIsGenerating = false
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
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
    if (isResponseToolsGroup(message)) {
      return (
        <div
          className={`w-full animate-fadeIn ${
            focusedMessageId === message.id ? 'ring-2 ring-blue-500/50 rounded-lg' : ''
          }`}
        >
          <ResponseToolsGroupCard message={message} />
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

        {/* Input Container - Cursor-inspired design */}
        <div className="border-t border-gray-800/50 bg-gray-900/95">
          {/* Context Pills - Above input area */}
          {activeContext.length > 0 && (
            <div className="px-4 pt-3 pb-2">
              <ContextPillsContainer
                items={activeContext}
                onRemove={onContextRemove}
                className="flex flex-wrap gap-2"
              />
            </div>
          )}
          
          {/* Main Input Area */}
          <div className="px-4 pb-4">
            <div className="relative">
              <MentionableTextarea
                value={input}
                onChange={setInput}
                onKeyDown={handleKeyDown}
                placeholder="Plan, search, build anything"
                disabled={isLoading}
                rows={3}
                availableMentions={availableMentions}
                onMentionSelect={onMentionSelect}
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl resize-none focus:outline-none focus:ring-1 focus:ring-gray-600 focus:border-gray-600 text-gray-100 placeholder-gray-500 text-[15px] leading-relaxed transition-all"
              />
              
              {/* Inline helper text */}
              <div className="absolute bottom-3 right-3 text-xs text-gray-500 pointer-events-none">
                Type @ to reference sheets, ranges, or tables
              </div>
            </div>
            
            {/* Controls Row - Below input */}
            <div className="flex items-center justify-between mt-3">
              {/* Left side: Autonomy Selector */}
              <div className="flex items-center gap-4">
                {autonomySelector && (
                  <div className="flex-shrink-0">
                    {autonomySelector}
                  </div>
                )}
                
                {/* Add Context button (like Cursor) */}
                <button
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 hover:text-gray-200 hover:bg-gray-800/50 rounded-lg transition-all"
                  onClick={() => {/* TODO: Implement context addition */}}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Context
                </button>
              </div>
              
              {/* Right side: Action buttons */}
              <div className="flex items-center gap-2">
                {/* Status indicator when AI is generating */}
                {aiIsGenerating && (
                  <div className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Generating...</span>
                  </div>
                )}
                
                {/* Stop button (when generating) */}
                {aiIsGenerating && (
                  <button
                    onClick={() => {/* TODO: Implement stop */}}
                    className="flex items-center gap-2 px-4 py-1.5 text-sm bg-gray-800 text-gray-300 hover:bg-gray-700 rounded-lg transition-all"
                  >
                    Stop
                    <kbd className="ml-1 px-1.5 py-0.5 text-xs bg-gray-700 rounded">⌘⌫</kbd>
                  </button>
                )}
                
                {/* Bulk action buttons (ALWAYS visible) */}
                <button
                  onClick={onRejectAll}
                  disabled={isProcessingBulkAction || pendingToolsCount === 0}
                  className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-all ${
                    pendingToolsCount > 0 
                      ? 'bg-gray-800/50 text-gray-400 hover:bg-red-900/20 hover:text-red-400' 
                      : 'bg-gray-800/20 text-gray-500 cursor-not-allowed'
                  } disabled:opacity-50`}
                >
                  <XCircleIcon className="w-4 h-4" />
                  Reject all
                  {pendingToolsCount > 0 && (
                    <span className="text-xs opacity-70">({pendingToolsCount})</span>
                  )}
                </button>
                
                <button
                  onClick={onApproveAll}
                  disabled={isProcessingBulkAction || pendingToolsCount === 0}
                  className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-all font-medium ${
                    pendingToolsCount > 0
                      ? 'bg-green-900/20 text-green-400 hover:bg-green-900/30'
                      : 'bg-gray-800/20 text-gray-500 cursor-not-allowed'
                  } disabled:opacity-50`}
                >
                  <CheckCircleIcon className="w-4 h-4" />
                  Accept all
                  {pendingToolsCount > 0 && (
                    <span className="text-xs opacity-70">({pendingToolsCount})</span>
                  )}
                  <kbd className="ml-1 px-1.5 py-0.5 text-xs bg-gray-700/50 rounded">⌘⏎</kbd>
                </button>
                
                {/* Send button (primary action) */}
                {!aiIsGenerating && (
                  <button
                    onClick={() => handleSendMessage()}
                    disabled={!input.trim() || isLoading}
                    className="p-2 bg-gray-800 text-gray-300 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-all"
                    title="Send message"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
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

      <style>{`
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
    </KeyboardShortcuts>
  )
}