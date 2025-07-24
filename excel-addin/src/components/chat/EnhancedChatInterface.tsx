import React from 'react'
import { Send } from 'lucide-react'
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline'
import { 
  EnhancedChatMessage, 
  isToolSuggestion, 
  isToolResult, 
  isBatchOperation,
  isResponseToolsGroup,
  isAuditMessage,
  isStatusMessage,
  isStandardMessage,
  isDiffPreview
} from '../../types/enhanced-chat'
import { 
  ToolSuggestionCard, 
  ToolResultCard, 
  BatchOperationCard,
  AuditMessage,
  StatusIndicator
} from './messages'
import { ChatMessageDiffPreview } from './ChatMessageDiffPreview'
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
import { TokenCounter } from './TokenCounter'
import { TokenUsage } from '../../types/signalr'
import { useAcceptRejectButtonStyles } from '../../hooks/useAcceptRejectButtonStyles'
import { StreamingMessage } from './messages/StreamingMessage'
import { isStreamingMessage } from '../../types/streaming'

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
  onAcceptAll?: () => void
  onRejectAll?: () => void
  isProcessingBulkAction?: boolean
  aiIsGenerating?: boolean
  // Context control
  isContextEnabled?: boolean
  onContextToggle?: () => void
  // Diff preview
  onAcceptDiff?: () => Promise<void>
  onRejectDiff?: () => Promise<void>
  // Token tracking
  tokenUsage?: TokenUsage | null
  // Streaming control
  onCancelStream?: () => void
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
  onAcceptAll,
  onRejectAll,
  isProcessingBulkAction = false,
  aiIsGenerating = false,
  isContextEnabled = true,
  onContextToggle,
  onAcceptDiff,
  onRejectDiff,
  tokenUsage = null,
  onCancelStream
}) => {
  const messagesEndRef = React.useRef<HTMLDivElement>(null)
  const [focusedMessageId, setFocusedMessageId] = React.useState<string | null>(null)
  const [showShortcutsHelp, setShowShortcutsHelp] = React.useState(false)

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
    setInput
  )

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !showCommands) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const renderMessage = (message: EnhancedChatMessage) => {
    // Handle streaming messages
    if (isStreamingMessage(message)) {
      return (
        <div key={message.id} className="w-full animate-fadeIn">
          <StreamingMessage message={message} />
        </div>
      )
    }

    if (isToolSuggestion(message)) {
      return (
        <div
          key={message.id}
          className={`w-full animate-fadeIn ${
            focusedMessageId === message.id ? 'ring-2 ring-blue-500/50 rounded-lg' : ''
          }`}
        >
          <ToolSuggestionCard 
            message={message}
            onAccept={() => onMessageAction?.(message.id, 'accept')}
            onReject={() => onMessageAction?.(message.id, 'reject')}
            diffData={message.diff}
            onAcceptDiff={message.diff?.status === 'previewing' ? onAcceptDiff : undefined}
            onRejectDiff={message.diff?.status === 'previewing' ? onRejectDiff : undefined}
          />
        </div>
      )
    }

    if (isToolResult(message)) {
      return (
        <div key={message.id} className="w-full animate-fadeIn">
          <ToolResultCard message={message} />
        </div>
      )
    }

    if (isBatchOperation(message)) {
      return (
        <div
          key={message.id}
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
          key={message.id}
          className={`w-full animate-fadeIn ${
            focusedMessageId === message.id ? 'ring-2 ring-blue-500/50 rounded-lg' : ''
          }`}
        >
          <ResponseToolsGroupCard message={message} aiIsGenerating={aiIsGenerating} />
        </div>
      )
    }

    if (isAuditMessage(message)) {
      return (
        <div key={message.id} className="w-full animate-fadeIn">
          <AuditMessage message={message} />
        </div>
      )
    }

    if (isStatusMessage(message)) {
      return (
        <div key={message.id} className="w-full animate-fadeIn">
          <StatusIndicator message={message} />
        </div>
      )
    }

    // Diff preview message
    if (isDiffPreview(message)) {
      return (
        <div key={message.id} className="w-full animate-fadeIn my-3">
          <div className="bg-transparent rounded-md border border-[#0066CC] p-3">
            {/* Details section */}
            <div className="bg-secondary-background rounded-md p-3 space-y-2 mb-3">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-text-secondary font-caption">Tool:</span>
                <code className="bg-app-background px-2 py-0.5 rounded border border-border-primary text-text-primary font-caption">
                  {message.operation.tool}
                </code>
              </div>
              {message.operation.input.range && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-text-secondary font-caption">Range:</span>
                  <code className="bg-app-background px-2 py-0.5 rounded border border-border-primary text-text-primary font-caption">
                    {message.operation.input.range}
                  </code>
                </div>
              )}
              {/* {message.operation.input.values && (
                <div className="text-sm">
                  <span className="text-text-secondary font-caption">Values:</span>
                  <div className="mt-1 text-xs bg-app-background rounded border border-border-primary p-2 max-h-32 overflow-auto font-caption" style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
                    {JSON.stringify(message.operation.input.values, null, 2)}
                  </div>
                </div>
              )} */}
              {message.operation.input.formula && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-text-secondary font-caption">Formula:</span>
                  <code className="bg-app-background px-2 py-0.5 rounded border border-border-primary text-text-primary font-caption">
                    {message.operation.input.formula}
                  </code>
                </div>
              )}
            </div>
            
            {/* Bottom section with buttons and counter */}
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (message.status === 'pending') {
                      message.actions.accept();
                    }
                  }}
                  disabled={message.status !== 'pending'}
                  className="inline-flex items-center gap-1 px-2 py-0.5 font-caption rounded-md bg-[#0066CC] text-white hover:bg-[#0059b3] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Accept
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (message.status === 'pending') {
                      message.actions.reject();
                    }
                  }}
                  disabled={message.status !== 'pending'}
                  className="inline-flex items-center gap-1 px-2 py-0.5 font-caption rounded-md bg-transparent text-[#0066CC] border border-[#0066CC] hover:bg-[#0066CC]/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Reject
                </button>
              </div>
              
              {/* Operation counter */}
              {message.operationIndex && message.totalOperations && (
                <span className="text-sm font-caption text-[#0066CC]">
                  {message.operationIndex}/{message.totalOperations}
                </span>
              )}
            </div>
          </div>
        </div>
      )
    }

    // Standard chat message
    if (isStandardMessage(message)) {
      return (
        <div
          key={message.id}
          className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}
        >
          <div
            className={`max-w-[80%] rounded-lg px-4 py-2 ${
              message.role === 'user'
                ? 'message-user'
                : message.role === 'system'
                ? 'bg-success/10 text-success border border-success'
                : 'message-assistant'
            }`}
          >
            <p className="font-callout whitespace-pre-wrap select-text" style={{ 
              userSelect: 'text', 
              WebkitUserSelect: 'text',
              MozUserSelect: 'text',
              msUserSelect: 'text',
              cursor: 'text'
            }}>
              {message.content}
            </p>
            {message.metadata?.suggestedActions && message.metadata.suggestedActions.length > 0 && (
              <div className="mt-2 pt-2 border-t border-border-primary">
                <p className="font-footnote opacity-70 mb-1">Suggested actions:</p>
                <div className="space-y-1">
                  {message.metadata.suggestedActions.map((action, index) => (
                    <div key={action.id || `action-${index}`} className="font-footnote opacity-80">
                      • {action.description}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Diff preview disabled - using separate preview cards instead */}
            <p className="font-footnote opacity-70 mt-1 select-text" style={{ 
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
      description: 'Accept all pending actions',
      handler: () => {
        const pendingActions = messages.filter(m => 
          (isToolSuggestion(m) && m.status === 'pending') ||
          (isBatchOperation(m) && m.status === 'pending')
        )
        pendingActions.forEach(action => {
          if (isToolSuggestion(action)) {
            action.actions.accept()
          } else if (isBatchOperation(action)) {
            action.actions.acceptAll()
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
      description: 'Accept focused action',
      handler: () => {
        if (focusedMessageId) {
          onMessageAction?.(focusedMessageId, 'accept')
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

  // Get dynamic button styles
  const { acceptAllClasses, rejectAllClasses } = useAcceptRejectButtonStyles(
    aiIsGenerating,
    pendingToolsCount > 0
  )

  return (
    <KeyboardShortcuts shortcuts={shortcuts}>
      <div className="h-full flex flex-col bg-app-background text-text-primary">
        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-text-secondary mt-8">
            <p className="mb-2" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', fontWeight: 300, fontSize: '1rem', letterSpacing: '0.2em' }}>GRIDMATE</p>
            
            
            <div className="mt-6 space-y-2">
              <p className="font-footnote text-text-tertiary">Try asking:</p>
              <div className="space-y-2">
                <button
                  onClick={() => {
                    setInput("What's the formula in this cell?")
                    handleSendMessage()
                  }}
                  className="block w-full font-footnote text-left px-3 py-2 rounded-lg bg-secondary-background hover:shadow-ios text-text-secondary hover:text-text-primary transition-all border border-border-primary"
                >
                  "What's the formula in this cell?"
                </button>
                <button
                  onClick={() => {
                    setInput("Calculate the NPV for this cash flow")
                    handleSendMessage()
                  }}
                  className="block w-full font-footnote text-left px-3 py-2 rounded-lg bg-secondary-background hover:shadow-ios text-text-secondary hover:text-text-primary transition-all border border-border-primary"
                >
                  "Calculate the NPV for this cash flow"
                </button>
                <button
                  onClick={() => {
                    setInput("Add a sensitivity analysis here")
                    handleSendMessage()
                  }}
                  className="block w-full font-footnote text-left px-3 py-2 rounded-lg bg-secondary-background hover:shadow-ios text-text-secondary hover:text-text-primary transition-all border border-border-primary"
                >
                  "Add a sensitivity analysis here"
                </button>
              </div>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <React.Fragment key={message.id}>
              {renderMessage(message)}
            </React.Fragment>
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

        {/* Input Container - Clean design */}
        <div className="border-t border-border-primary bg-app-background">
          {/* Context Pills and Bulk Actions - Above input area */}
          <div className="px-4 pt-3 pb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ContextPillsContainer
                items={activeContext}
                onRemove={onContextRemove}
                onContextToggle={onContextToggle}
                isContextEnabled={isContextEnabled}
                isToggleDisabled={true}
                className="flex flex-wrap gap-2"
              />
            </div>
            
            {/* Bulk action buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  console.log('[EnhancedChatInterface] Accept All clicked', {
                    onAcceptAll: !!onAcceptAll,
                    pendingToolsCount,
                    isProcessingBulkAction
                  });
                  if (onAcceptAll) {
                    onAcceptAll();
                  } else {
                    console.error('[EnhancedChatInterface] onAcceptAll prop is not provided!');
                  }
                }}
                disabled={isProcessingBulkAction || pendingToolsCount === 0}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-caption border ${acceptAllClasses} ${
                  (isProcessingBulkAction || pendingToolsCount === 0) ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <CheckCircleIcon className="w-3 h-3" />
                <span>ACCEPT ALL</span>
                {pendingToolsCount > 0 && (
                  <span className="opacity-70">({pendingToolsCount})</span>
                )}
              </button>
              
              <button
                onClick={onRejectAll}
                disabled={isProcessingBulkAction || pendingToolsCount === 0}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-caption border ${rejectAllClasses} ${
                  (isProcessingBulkAction || pendingToolsCount === 0) ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <XCircleIcon className="w-3 h-3" />
                <span>REJECT ALL</span>
                {pendingToolsCount > 0 && (
                  <span className="opacity-70">({pendingToolsCount})</span>
                )}
              </button>
            </div>
          </div>
          
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
                className="w-full px-4 py-3 bg-secondary-background border border-border-primary rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-text-primary placeholder-text-placeholder font-callout leading-relaxed transition-all"
              />
              
              {/* Inline helper text */}
              <div className="absolute bottom-3 right-3 font-footnote text-text-tertiary pointer-events-none">
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
                
              </div>
              
              {/* Right side: Action buttons */}
              <div className="flex items-center gap-2">
                {/* Token Counter - in place of former "Generating..." text */}
                {tokenUsage && (
                  <TokenCounter tokenUsage={tokenUsage} />
                )}
                
                {/* Stop button (when generating) */}
                {aiIsGenerating && (
                  <button
                    onClick={() => {/* TODO: Implement stop */}}
                    className="flex items-center gap-2 px-4 py-1.5 font-callout bg-secondary-background text-text-secondary hover:bg-border-primary rounded-lg transition-all border border-border-primary"
                  >
                    Stop
                    <kbd className="ml-1 px-1.5 py-0.5 font-caption bg-border-primary rounded">⌘⌫</kbd>
                  </button>
                )}
                
                {/* Send button (primary action) */}
                {!aiIsGenerating && (
                  <button
                    onClick={() => handleSendMessage()}
                    disabled={!input.trim() || isLoading}
                    className="p-2 bg-secondary-background text-text-secondary hover:bg-border-primary disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-all border border-border-primary"
                    title="Send message"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                )}
                
                {/* Cancel button during streaming */}
                {aiIsGenerating && onCancelStream && (
                  <button
                    onClick={onCancelStream}
                    className="p-2 bg-red-500 text-white hover:bg-red-600 rounded-lg transition-all"
                    title="Stop generating"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <rect x="6" y="6" width="12" height="12" rx="1" />
                    </svg>
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