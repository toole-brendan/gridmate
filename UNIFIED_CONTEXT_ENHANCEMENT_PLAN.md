# Unified Context Enhancement Plan for Gridmate

## Executive Summary

This unified plan merges two complementary features:
1. **Enhanced Context & Memory Persistence** - Ensures AI maintains full conversation history and current spreadsheet state
2. **Token Counter Display** - Shows users real-time context usage metrics

Both features work together to create a transparent, efficient context management system that users can monitor and understand, following patterns from successful AI-powered code editors like Cline and Roo-code.

## Synergies Between Plans

### Shared Benefits
1. **Common Data Flow**: Token counting naturally integrates with context building
2. **User Transparency**: Token counter provides visibility into context management improvements
3. **Performance Monitoring**: Token metrics help validate context optimization efforts
4. **Shared Infrastructure**: Both use the same AI response pipeline

### No Conflicts Identified
- Token counter is additive to existing response structure
- Context improvements don't interfere with token tracking
- Both enhance the same chat interface components

## Implementation Plan

### Phase 1: Critical Backend Fixes & Token Infrastructure (Day 1)

#### 1.1 Fix System Message Merging & Add Token Tracking

**File: `backend/internal/services/ai/prompt_builder.go`**

```go
// BuildChatPrompt builds a prompt for chat interactions with merged context
func (pb *PromptBuilder) BuildChatPrompt(userMessage string, context *FinancialContext) []Message {
    // Start with base system prompt
    systemContent := pb.systemPrompt
    
    // Merge context into system message if available
    if context != nil {
        contextPrompt := pb.buildContextPrompt(context)
        if contextPrompt != "" {
            systemContent += "\n\n<current_context>\n" + contextPrompt + "\n</current_context>"
        }
    }
    
    // Return single system message + user message
    return []Message{
        {Role: "system", Content: systemContent},
        {Role: "user", Content: userMessage},
    }
}

// BuildPromptWithHistory builds a complete prompt including conversation history
func (pb *PromptBuilder) BuildPromptWithHistory(userMessage string, context *FinancialContext, history []Message) []Message {
    // Start with system message (includes context)
    messages := []Message{}
    
    // Always include fresh system prompt with current context
    systemContent := pb.systemPrompt
    if context != nil {
        contextPrompt := pb.buildContextPrompt(context)
        if contextPrompt != "" {
            systemContent += "\n\n<current_context>\n" + contextPrompt + "\n</current_context>"
        }
    }
    
    messages = append(messages, Message{Role: "system", Content: systemContent})
    
    // Add conversation history (excluding any old system messages)
    for _, msg := range history {
        if msg.Role != "system" {
            messages = append(messages, msg)
        }
    }
    
    // Add current user message
    messages = append(messages, Message{Role: "user", Content: userMessage})
    
    return messages
}
```

#### 1.2 Add Token Usage Types

**File: `backend/internal/services/types.go`**

```go
// Add to existing file
type TokenUsage struct {
    Input  int `json:"input"`
    Output int `json:"output"`
    Total  int `json:"total"`
    Max    int `json:"max"`
}

// Update ChatResponse struct
type ChatResponse struct {
    Content     string           `json:"content"`
    Suggestions []string         `json:"suggestions,omitempty"`
    Actions     []ProposedAction `json:"actions,omitempty"`
    SessionID   string           `json:"session_id"`
    IsFinal     bool             `json:"is_final"`
    TokenUsage  *TokenUsage      `json:"tokenUsage,omitempty"` // Add this
}
```

#### 1.3 Fix First Message Context & Include Token Data

**File: `backend/internal/services/excel_bridge.go`**

```go
func (eb *ExcelBridge) ProcessChatMessage(clientID string, message ChatMessage) (*ChatResponse, error) {
    session := eb.getOrCreateSession(clientID, message.SessionID)
    
    // Build comprehensive context BEFORE adding message to history
    var financialContext *ai.FinancialContext
    if eb.contextBuilder != nil {
        ctx := context.Background()
        builtContext, err := eb.contextBuilder.BuildContext(ctx, session.ID)
        if err != nil {
            eb.logger.WithError(err).Warn("Failed to build comprehensive context")
            financialContext = eb.buildFinancialContext(session, message.Context)
        } else {
            financialContext = builtContext
            // Merge any additional context from the message
            eb.mergeMessageContext(financialContext, message.Context)
        }
    } else {
        financialContext = eb.buildFinancialContext(session, message.Context)
    }
    
    // Get existing history BEFORE adding new message
    existingHistory := eb.chatHistory.GetHistory(session.ID)
    
    // Convert to AI message format
    aiHistory := make([]ai.Message, 0, len(existingHistory))
    for _, msg := range existingHistory {
        aiHistory = append(aiHistory, ai.Message{
            Role:    msg.Role,
            Content: msg.Content,
        })
    }
    
    // Process with AI
    ctx := context.Background()
    if message.MessageID != "" {
        ctx = context.WithValue(ctx, "message_id", message.MessageID)
    }
    
    // Call AI with full context and history
    aiResponse, err := eb.aiService.ProcessChatWithToolsAndHistory(
        ctx, 
        session.ID, 
        message.Content, 
        financialContext, 
        aiHistory, 
        message.AutonomyMode,
    )
    
    if err != nil {
        eb.logger.WithError(err).Error("AI processing failed")
        content = "I encountered an error processing your request. Please try again."
    } else {
        content = aiResponse.Content
        
        // Add token usage data to response
        if aiResponse.Usage.TotalTokens > 0 {
            response.TokenUsage = &TokenUsage{
                Input:  aiResponse.Usage.PromptTokens,
                Output: aiResponse.Usage.CompletionTokens,
                Total:  aiResponse.Usage.TotalTokens,
                Max:    200000, // Claude 3.5 Sonnet's context window
            }
        }
    }
    
    // NOW add messages to history after processing
    eb.chatHistory.AddMessage(session.ID, "user", message.Content)
    if aiResponse != nil && err == nil {
        eb.chatHistory.AddMessage(session.ID, "assistant", aiResponse.Content)
    }
    
    // ... rest of the method
}

// mergeMessageContext merges additional context from the message
func (eb *ExcelBridge) mergeMessageContext(fc *ai.FinancialContext, msgContext map[string]interface{}) {
    // Add any document context from the message
    for k, v := range msgContext {
        if str, ok := v.(string); ok && k != "selectedData" && k != "nearbyData" {
            fc.DocumentContext = append(fc.DocumentContext, fmt.Sprintf("%s: %s", k, str))
        }
    }
}
```

#### 1.4 Always Include Updated Context

**File: `backend/internal/services/ai/service.go`**

```go
// ProcessChatWithToolsAndHistory - Modified to always include fresh context
func (s *Service) ProcessChatWithToolsAndHistory(
    ctx context.Context, 
    sessionID string, 
    userMessage string, 
    context *FinancialContext, 
    chatHistory []Message, 
    autonomyMode string,
) (*CompletionResponse, error) {
    // ... existing panic recovery code ...
    
    // Build messages array with fresh context every time
    messages := make([]Message, 0)
    
    // Use the prompt builder to create system message with current context
    if s.promptBuilder != nil {
        // This will include both base prompt and current context
        initialMessages := s.promptBuilder.BuildPromptWithHistory(userMessage, context, chatHistory)
        messages = initialMessages
    } else {
        // Fallback: manually construct messages
        messages = append(messages, chatHistory...)
        messages = append(messages, Message{Role: "user", Content: userMessage})
    }
    
    // ... rest of the method remains the same ...
}
```

#### 1.5 Update SignalR Handler for Token Data

**File: `backend/internal/handlers/signalr_handler.go`**

```go
// In the method that sends AI responses
func (h *SignalRHandler) sendAIResponse(clientID string, response *services.ChatResponse) {
    message := map[string]interface{}{
        "messageId":   response.MessageID,
        "content":     response.Content,
        "sessionId":   response.SessionID,
        "isFinal":     response.IsFinal,
        "tokenUsage":  response.TokenUsage, // Add this
        "suggestions": response.Suggestions,
        "actions":     response.Actions,
    }
    
    h.hub.SendToClient(clientID, "aiResponse", message)
}
```

### Phase 2: Frontend Token Counter & Persistence (Day 2)

#### 2.1 Create Token Counter Component

**File: `excel-addin/src/components/chat/TokenCounter.tsx`**

```tsx
import React from 'react';

interface TokenUsage {
  input: number;
  output: number;
  total: number;
  max: number;
}

interface TokenCounterProps {
  tokenUsage: TokenUsage | null;
}

export const TokenCounter: React.FC<TokenCounterProps> = ({ tokenUsage }) => {
  if (!tokenUsage) return null;

  const percentage = (tokenUsage.total / tokenUsage.max) * 100;
  const progressColor = percentage >= 90 ? 'bg-red-500' : 
                       percentage >= 80 ? 'bg-yellow-500' : 
                       'bg-blue-500';

  return (
    <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 text-xs">
      <div className="flex items-center justify-between mb-1">
        <span className="text-gray-700">
          Context: {tokenUsage.total.toLocaleString()} / {tokenUsage.max.toLocaleString()} tokens
          {' '}
          <span className="text-gray-500">
            (↑{tokenUsage.input.toLocaleString()}, ↓{tokenUsage.output.toLocaleString()})
          </span>
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-1">
        <div 
          className={`h-full rounded-full transition-all duration-300 ${progressColor}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
};
```

#### 2.2 Create Chat Persistence Hook

**File: `excel-addin/src/hooks/usePersistedChat.ts`**

```typescript
import { useState, useEffect, useCallback } from 'react'
import { EnhancedChatMessage } from '../types/enhanced-chat'

interface PersistedChatState {
  messages: EnhancedChatMessage[]
  sessionId: string
  lastUpdated: string
  tokenUsage?: TokenUsage // Add token usage to persistence
}

interface TokenUsage {
  input: number
  output: number
  total: number
  max: number
}

export function usePersistedChat(sessionId: string) {
  const storageKey = `gridmate_chat_${sessionId}`
  
  // Initialize from localStorage
  const [messages, setMessages] = useState<EnhancedChatMessage[]>(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        const parsed: PersistedChatState = JSON.parse(stored)
        // Only restore if same session and recent (within 24 hours)
        const lastUpdate = new Date(parsed.lastUpdated)
        const now = new Date()
        const hoursSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60)
        
        if (parsed.sessionId === sessionId && hoursSinceUpdate < 24) {
          return parsed.messages
        }
      }
    } catch (error) {
      console.error('Failed to restore chat from localStorage:', error)
    }
    return []
  })
  
  // Token usage state
  const [tokenUsage, setTokenUsage] = useState<TokenUsage | null>(null)
  
  // Persist on every change
  useEffect(() => {
    const state: PersistedChatState = {
      messages,
      sessionId,
      lastUpdated: new Date().toISOString(),
      tokenUsage: tokenUsage || undefined
    }
    
    try {
      localStorage.setItem(storageKey, JSON.stringify(state))
    } catch (error) {
      console.error('Failed to persist chat to localStorage:', error)
      // Handle quota exceeded - remove old chats
      if (error.name === 'QuotaExceededError') {
        clearOldChats()
        try {
          localStorage.setItem(storageKey, JSON.stringify(state))
        } catch (retryError) {
          console.error('Failed to persist after cleanup:', retryError)
        }
      }
    }
  }, [messages, sessionId, storageKey, tokenUsage])
  
  const addMessage = useCallback((message: EnhancedChatMessage) => {
    setMessages(prev => [...prev, message])
  }, [])
  
  const updateMessage = useCallback((id: string, updates: Partial<EnhancedChatMessage>) => {
    setMessages(prev => prev.map(msg => 
      msg.id === id ? { ...msg, ...updates } : msg
    ))
  }, [])
  
  const updateTokenUsage = useCallback((usage: TokenUsage) => {
    setTokenUsage(usage)
  }, [])
  
  const clearMessages = useCallback(() => {
    setMessages([])
    setTokenUsage(null)
    localStorage.removeItem(storageKey)
  }, [storageKey])
  
  return {
    messages,
    tokenUsage,
    addMessage,
    updateMessage,
    updateTokenUsage,
    clearMessages,
    setMessages
  }
}

// Helper to clean up old chats
function clearOldChats() {
  const keys = Object.keys(localStorage)
  const chatKeys = keys.filter(k => k.startsWith('gridmate_chat_'))
  
  // Sort by last update and keep only recent 5 sessions
  const sessions = chatKeys.map(key => {
    try {
      const data = JSON.parse(localStorage.getItem(key) || '{}')
      return { key, lastUpdated: new Date(data.lastUpdated || 0) }
    } catch {
      return { key, lastUpdated: new Date(0) }
    }
  }).sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime())
  
  // Remove all but the 5 most recent
  sessions.slice(5).forEach(({ key }) => {
    localStorage.removeItem(key)
  })
}
```

#### 2.3 Update Message Handler with Token Support

**File: `excel-addin/src/hooks/useMessageHandlers.ts`**

```typescript
export const useMessageHandlers = (
  chatManager: any,
  diffPreview: any,
  autonomyMode: string,
  addDebugLog: (message: string, type?: string) => void,
  onTokenUsage?: (usage: any) => void // Add this parameter
) => {
  // ... existing code ...
  
  const handleSignalRMessage = useCallback((message: any) => {
    // ... existing message handling ...
    
    // Handle token usage
    if (message.tokenUsage && onTokenUsage) {
      addDebugLog('Received token usage update', 'info')
      onTokenUsage(message.tokenUsage)
    }
    
    // ... rest of message handling ...
  }, [chatManager, diffPreview, autonomyMode, addDebugLog, onTokenUsage])
  
  return {
    handleSignalRMessage,
    // ... other handlers ...
  }
}
```

#### 2.4 Integrate Everything in Chat Interface

**File: `excel-addin/src/components/chat/RefactoredChatInterface.tsx`**

```tsx
import { TokenCounter } from './TokenCounter'
import { usePersistedChat } from '../../hooks/usePersistedChat'

export const RefactoredChatInterface: React.FC = () => {
  // ... existing state ...
  
  // Replace existing message state with persisted chat
  const sessionId = useMemo(() => uuidv4(), []) // Generate once
  const { 
    messages,
    tokenUsage,
    addMessage,
    updateMessage,
    updateTokenUsage,
    clearMessages
  } = usePersistedChat(sessionId)
  
  // Update chatManager to use persisted messages
  useEffect(() => {
    chatManager.setMessages(messages)
  }, [messages, chatManager])
  
  // Update message handlers to capture token usage
  const messageHandlers = useMessageHandlers(
    chatManager, 
    diffPreview, 
    autonomyMode, 
    addDebugLog,
    updateTokenUsage // Pass token update handler
  )
  
  // ... existing code ...
  
  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="border-b border-border-primary bg-surface-primary">
        {/* ... existing header content ... */}
      </div>
      
      {/* Token Counter - Add after header */}
      <TokenCounter tokenUsage={tokenUsage} />
      
      {/* Enhanced Chat Interface with persisted messages */}
      <EnhancedChatInterface
        messages={messages}
        input={input}
        setInput={setInput}
        handleSendMessage={handleSendMessage}
        isLoading={chatManager.isLoading}
        autonomySelector={autonomySelector}
        onMessageAction={handleMessageAction}
        availableMentions={availableMentions}
        activeContext={activeContext}
        onContextRemove={handleContextRemove}
        onMentionSelect={handleMentionSelect}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onClearChat={() => {
          clearMessages()
          chatManager.clearMessages()
        }}
        hasUndo={chatManager.canUndo()}
        hasRedo={chatManager.canRedo()}
        pendingToolsCount={pendingToolsCount}
        onApproveAll={handleApproveAll}
        onRejectAll={handleRejectAll}
        isProcessingBulkAction={isProcessingBulkAction}
        aiIsGenerating={chatManager.aiIsGenerating}
        isContextEnabled={isContextEnabled}
        onContextToggle={() => setIsContextEnabled(!isContextEnabled)}
        onAcceptDiff={handleAcceptDiff}
        onRejectDiff={handleRejectDiff}
      />
    </div>
  )
}
```

### Phase 3: Real-time Excel Change Tracking (Day 3)

#### 3.1 Excel Change Tracker

**File: `excel-addin/src/services/excel/ExcelChangeTracker.ts`**

```typescript
export class ExcelChangeTracker {
  private static instance: ExcelChangeTracker
  private changeHandlers: Excel.BindingDataChangedEventHandler[] = []
  private recentChanges: RecentEdit[] = []
  private readonly MAX_CHANGES = 50
  private onChangeCallback?: (changes: RecentEdit[]) => void
  
  static getInstance(): ExcelChangeTracker {
    if (!ExcelChangeTracker.instance) {
      ExcelChangeTracker.instance = new ExcelChangeTracker()
    }
    return ExcelChangeTracker.instance
  }
  
  async initialize(onChangeCallback?: (changes: RecentEdit[]) => void) {
    this.onChangeCallback = onChangeCallback
    
    await Excel.run(async (context) => {
      const worksheet = context.workbook.worksheets.getActiveWorksheet()
      
      // Track data changes
      worksheet.onChanged.add(this.handleWorksheetChange.bind(this))
      
      // Track selection changes
      worksheet.onSelectionChanged.add(this.handleSelectionChange.bind(this))
      
      await context.sync()
      console.log('[ExcelChangeTracker] Initialized change tracking')
    })
  }
  
  private async handleWorksheetChange(event: Excel.WorksheetChangedEventArgs) {
    if (event.source === Excel.EventSource.local) {
      // User-initiated change
      await this.captureChange(event.address, 'user', 'manual_edit')
    }
  }
  
  private async handleSelectionChange(event: Excel.WorksheetSelectionChangedEventArgs) {
    // Update last selection time for context expansion logic
    const timestamp = new Date().toISOString()
    sessionStorage.setItem('lastUserSelectionTime', timestamp)
  }
  
  private async captureChange(address: string, source: string, tool: string) {
    await Excel.run(async (context) => {
      const range = context.workbook.worksheets.getActiveWorksheet().getRange(address)
      range.load(['values', 'formulas'])
      
      await context.sync()
      
      const change: RecentEdit = {
        range: address,
        timestamp: new Date().toISOString(),
        source,
        tool,
        newValues: range.values,
        newFormulas: range.formulas
      }
      
      this.addChange(change)
    })
  }
  
  private addChange(change: RecentEdit) {
    this.recentChanges.unshift(change)
    
    // Keep only recent changes
    if (this.recentChanges.length > this.MAX_CHANGES) {
      this.recentChanges = this.recentChanges.slice(0, this.MAX_CHANGES)
    }
    
    // Notify callback
    if (this.onChangeCallback) {
      this.onChangeCallback(this.getRecentChanges())
    }
  }
  
  getRecentChanges(limit: number = 10): RecentEdit[] {
    return this.recentChanges.slice(0, limit)
  }
  
  clearChanges() {
    this.recentChanges = []
  }
}

interface RecentEdit {
  range: string
  timestamp: string
  source: string
  tool: string
  oldValues?: any[][]
  oldFormulas?: any[][]
  newValues?: any[][]
  newFormulas?: any[][]
}
```

#### 3.2 Integrate Change Tracking in Chat

**File: `excel-addin/src/components/chat/EnhancedChatInterface.tsx`** (Addition)

```tsx
// Add to the component
export const EnhancedChatInterface: React.FC<EnhancedChatInterfaceProps> = (props) => {
  const [recentEdits, setRecentEdits] = React.useState<RecentEdit[]>([])
  
  // Initialize change tracking
  React.useEffect(() => {
    const tracker = ExcelChangeTracker.getInstance()
    tracker.initialize((changes) => {
      setRecentEdits(changes)
    })
  }, [])
  
  // Include recent edits in context sent with messages
  const enhancedContext = React.useMemo(() => {
    return {
      ...props.activeContext,
      recentEdits: recentEdits.slice(0, 10) // Include last 10 edits
    }
  }, [props.activeContext, recentEdits])
  
  // ... rest of component
}
```

### Phase 4: Testing & Monitoring (Day 4-5)

#### 4.1 Context Memory Tests

**File: `backend/internal/services/ai/context_memory_test.go`**

```go
package ai_test

import (
    "context"
    "testing"
    
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"
)

func TestContextMemoryWithTokenTracking(t *testing.T) {
    // Test that context is maintained and tokens are tracked
    service := setupTestService(t)
    sessionID := "test-session-123"
    
    // First message with context
    context1 := &FinancialContext{
        SelectedRange: "A1:B10",
        CellValues: map[string]interface{}{
            "A1": "Revenue",
            "B1": 1000000,
        },
    }
    
    resp1, err := service.ProcessChatWithToolsAndHistory(
        context.Background(),
        sessionID,
        "What is the revenue?",
        context1,
        []Message{},
        "ask",
    )
    require.NoError(t, err)
    assert.Contains(t, resp1.Content, "1000000")
    
    // Verify token usage is tracked
    assert.NotNil(t, resp1.Usage)
    assert.Greater(t, resp1.Usage.TotalTokens, 0)
    assert.Greater(t, resp1.Usage.PromptTokens, 0)
    assert.Greater(t, resp1.Usage.CompletionTokens, 0)
    
    // Second message - should remember context and accumulate tokens
    context2 := &FinancialContext{
        SelectedRange: "A1:B10",
        CellValues: map[string]interface{}{
            "A1": "Revenue",
            "B1": 1500000, // Changed value
        },
    }
    
    history := []Message{
        {Role: "user", Content: "What is the revenue?"},
        {Role: "assistant", Content: resp1.Content},
    }
    
    resp2, err := service.ProcessChatWithToolsAndHistory(
        context.Background(),
        sessionID,
        "How much did it increase?",
        context2,
        history,
        "ask",
    )
    require.NoError(t, err)
    
    // Should reference both old and new values
    assert.Contains(t, resp2.Content, "500000")
    assert.Contains(t, resp2.Content, "increase")
    
    // Token usage should increase with history
    assert.Greater(t, resp2.Usage.PromptTokens, resp1.Usage.PromptTokens)
}

func TestFirstMessageContextInclusion(t *testing.T) {
    // Test that first message includes both system prompt and context
    service := setupTestService(t)
    
    context := &FinancialContext{
        WorksheetName: "Financial Model",
        ModelType:     "DCF",
        CellValues: map[string]interface{}{
            "A1": "WACC",
            "B1": 0.10,
        },
    }
    
    // Intercept the actual request sent to AI provider
    var capturedRequest *CompletionRequest
    service.provider = &mockProvider{
        onGetCompletion: func(ctx context.Context, req CompletionRequest) (*CompletionResponse, error) {
            capturedRequest = &req
            return &CompletionResponse{
                Content: "Test response",
                Usage: TokenUsage{
                    PromptTokens:     100,
                    CompletionTokens: 50,
                    TotalTokens:      150,
                },
            }, nil
        },
    }
    
    _, err := service.ProcessChatMessage(
        context.Background(),
        "What is the WACC?",
        context,
    )
    require.NoError(t, err)
    
    // Verify system message includes both prompt and context
    require.Len(t, capturedRequest.Messages, 2)
    assert.Equal(t, "system", capturedRequest.Messages[0].Role)
    assert.Contains(t, capturedRequest.Messages[0].Content, "financial modeling")
    assert.Contains(t, capturedRequest.Messages[0].Content, "Current Context")
    assert.Contains(t, capturedRequest.Messages[0].Content, "DCF")
    assert.Contains(t, capturedRequest.Messages[0].Content, "WACC")
}
```

#### 4.2 Frontend Token Counter Tests

**File: `excel-addin/src/components/chat/__tests__/TokenCounter.test.tsx`**

```tsx
import React from 'react'
import { render, screen } from '@testing-library/react'
import { TokenCounter } from '../TokenCounter'

describe('TokenCounter', () => {
  it('displays token usage correctly', () => {
    const tokenUsage = {
      input: 1500,
      output: 500,
      total: 2000,
      max: 200000
    }
    
    render(<TokenCounter tokenUsage={tokenUsage} />)
    
    expect(screen.getByText(/Context: 2,000 \/ 200,000 tokens/)).toBeInTheDocument()
    expect(screen.getByText(/↑1,500, ↓500/)).toBeInTheDocument()
  })
  
  it('shows correct progress bar color based on usage', () => {
    const { rerender } = render(
      <TokenCounter tokenUsage={{ input: 1000, output: 1000, total: 2000, max: 200000 }} />
    )
    
    let progressBar = screen.getByRole('progressbar', { hidden: true })
    expect(progressBar).toHaveClass('bg-blue-500')
    
    // 85% usage - should be yellow
    rerender(
      <TokenCounter tokenUsage={{ input: 85000, output: 85000, total: 170000, max: 200000 }} />
    )
    progressBar = screen.getByRole('progressbar', { hidden: true })
    expect(progressBar).toHaveClass('bg-yellow-500')
    
    // 95% usage - should be red
    rerender(
      <TokenCounter tokenUsage={{ input: 95000, output: 95000, total: 190000, max: 200000 }} />
    )
    progressBar = screen.getByRole('progressbar', { hidden: true })
    expect(progressBar).toHaveClass('bg-red-500')
  })
  
  it('returns null when no token usage provided', () => {
    const { container } = render(<TokenCounter tokenUsage={null} />)
    expect(container.firstChild).toBeNull()
  })
})
```

## Migration Strategy

### Step 1: Deploy Backend Changes (Day 1)
1. Deploy system message merging fix
2. Add token usage to response types
3. Test in staging environment
4. Monitor token counts in logs

### Step 2: Frontend Token Counter (Day 2)
1. Deploy token counter component
2. Integrate with existing chat interface
3. Verify token data flow
4. Test visual indicators

### Step 3: Chat Persistence (Day 3)
1. Enable localStorage persistence
2. Test session recovery
3. Monitor storage quotas
4. Deploy change tracking

### Step 4: Production Rollout (Day 4-5)
1. Enable for beta users first
2. Monitor performance metrics
3. Gather user feedback
4. Full production deployment

## Success Metrics

1. **Context Completeness**: 100% of messages include current spreadsheet state
2. **Token Visibility**: Users can see context usage on every message
3. **Memory Persistence**: 95%+ of conversations maintain full history
4. **Performance**: Context building < 200ms for 90% of requests
5. **User Satisfaction**: 50% reduction in "AI forgot context" complaints

## Risk Mitigation

1. **Token Limits**: Show clear warnings when approaching limits
2. **Storage Quotas**: Automatic cleanup of old sessions
3. **Performance**: Incremental context updates for large spreadsheets
4. **Privacy**: No sensitive data in localStorage or logs
5. **Backwards Compatibility**: Graceful fallbacks for older clients

## Implementation Timeline

- **Day 1**: Backend fixes + token infrastructure
- **Day 2**: Frontend token counter + chat persistence
- **Day 3**: Change tracking + integration
- **Day 4-5**: Testing + monitoring setup
- **Week 2**: Production rollout + optimization

This unified plan creates a comprehensive context management system with full transparency through token counting, ensuring users understand and can monitor their AI assistant's context usage while maintaining conversation continuity.