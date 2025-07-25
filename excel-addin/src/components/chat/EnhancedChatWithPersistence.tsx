import React from 'react'
import { EnhancedChatInterface } from './EnhancedChatInterface'
import { usePersistedChat } from '../../hooks/usePersistedChat'
import { ExcelChangeTracker } from '../../services/excel/ExcelChangeTracker'
// import { EnhancedChatMessage } from '../../types/enhanced-chat'
import { ContextItem } from '../chat/mentions'

interface EnhancedChatWithPersistenceProps {
  sessionId: string
  // Pass through all other props
  input: string
  setInput: (value: string) => void
  handleSendMessage: () => void
  isLoading: boolean
  autonomySelector?: React.ReactNode
  onMessageAction?: (messageId: string, action: string) => void
  availableMentions?: any[]
  activeContext?: ContextItem[]
  onContextRemove?: (id: string) => void
  onMentionSelect?: (mention: any) => void
  onUndo?: () => void
  onRedo?: () => void
  onClearChat?: () => void
  hasUndo?: boolean
  hasRedo?: boolean
  pendingToolsCount?: number
  onAcceptAll?: () => void
  onRejectAll?: () => void
  isProcessingBulkAction?: boolean
  aiIsGenerating?: boolean
  isContextEnabled?: boolean
  onContextToggle?: () => void
  onAcceptDiff?: () => Promise<void>
  onRejectDiff?: () => Promise<void>
  tokenUsage?: any
}

export const EnhancedChatWithPersistence: React.FC<EnhancedChatWithPersistenceProps> = (props) => {
  const { sessionId } = props
  const { 
    messages, 
    // addMessage, 
    // updateMessage, 
    clearMessages 
  } = usePersistedChat(sessionId)
  
  const [recentEdits, setRecentEdits] = React.useState<any[]>([])
  
  // Initialize change tracking
  React.useEffect(() => {
    const tracker = ExcelChangeTracker.getInstance()
    tracker.initialize((changes) => {
      setRecentEdits(changes)
    })
  }, [])
  
  // Include recent edits in context
  const enhancedContext = React.useMemo(() => {
    const baseContext = props.activeContext || []
    
    // Add recent edits as context items if they exist
    if (recentEdits.length > 0) {
      const recentEditsContext: ContextItem = {
        id: 'recent-edits',
        type: 'edit' as const,
        label: `${recentEdits.length} recent changes`,
        value: JSON.stringify(recentEdits.slice(0, 10)),
        metadata: { edits: recentEdits.slice(0, 10) }
      }
      return [...baseContext, recentEditsContext]
    }
    
    return baseContext
  }, [props.activeContext, recentEdits])
  
  // Override clear chat to also clear persisted messages
  const handleClearChat = React.useCallback(() => {
    clearMessages()
    props.onClearChat?.()
  }, [clearMessages, props.onClearChat])
  
  // You would need to integrate the message management with your actual chat logic
  // This is a simplified example showing the integration pattern
  
  return (
    <EnhancedChatInterface
      {...props}
      messages={messages}
      activeContext={enhancedContext}
      onClearChat={handleClearChat}
      tokenUsage={props.tokenUsage}
    />
  )
}