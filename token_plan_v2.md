# Token Counter Implementation Plan v2 for Gridmate

## Overview

This plan implements a minimal token counter that displays current context usage as "X / 200,000 tokens (↑input, ↓output)" - exactly like Cline and Roo-code, but properly integrated with Gridmate's enhanced context memory system.

## Key Features

1. **Simple Token Display**: Shows current context usage out of 200,000 tokens
2. **Input/Output Breakdown**: Displays tokens for the latest message (↑input, ↓output)
3. **Visual Progress Bar**: Changes color as you approach the limit (blue → yellow → red)
4. **Persistence Support**: Token usage persists across page reloads
5. **Context-Aware**: Handles dynamic context pruning instead of assuming linear growth

## Implementation Steps

### 1. Backend Changes

#### 1.1 Add Token Usage to Chat Response

In `backend/internal/services/types.go`, add to the `ChatResponse` struct:

```go
type ChatResponse struct {
    Content     string           `json:"content"`
    Suggestions []string         `json:"suggestions,omitempty"`
    Actions     []ProposedAction `json:"actions,omitempty"`
    SessionID   string           `json:"session_id"`
    IsFinal     bool             `json:"is_final"`
    TokenUsage  *TokenUsage      `json:"token_usage,omitempty"` // Add this
}

// Add new struct
type TokenUsage struct {
    Input  int `json:"input"`  // Tokens in the prompt
    Output int `json:"output"` // Tokens in the completion
    Total  int `json:"total"`  // Current context usage (not cumulative)
    Max    int `json:"max"`    // Maximum context window (200,000)
}
```

#### 1.2 Pass Token Data from AI Service

In `backend/internal/services/excel_bridge.go`, modify `ProcessChatMessage` (after line 495):

```go
// Create the response
response := &ChatResponse{
    Content:     content,
    Suggestions: suggestions,
    Actions:     actions,
    SessionID:   session.ID,
    IsFinal:     isFinal,
}

// Add token usage if available from AI response
if aiResponse != nil && aiResponse.Usage.TotalTokens > 0 {
    response.TokenUsage = &TokenUsage{
        Input:  aiResponse.Usage.PromptTokens,
        Output: aiResponse.Usage.CompletionTokens,
        Total:  aiResponse.Usage.PromptTokens, // This represents current context size
        Max:    200000, // Claude 3.5's context window
    }
}

return response, nil
```

#### 1.3 Update SignalR Handler

In `backend/internal/handlers/signalr_handler.go`, pass token data in responses (around line 219):

```go
// Send response back to client via SignalR
err = h.signalRBridge.SendAIResponse(req.SessionID, map[string]interface{}{
    "messageId":   req.MessageID,
    "content":     response.Content,
    "actions":     response.Actions,
    "isComplete":  response.IsFinal && !hasQueuedOps,
    "tokenUsage":  response.TokenUsage, // Add this line
})
```

### 2. Frontend Changes

#### 2.1 Add Token Usage Types

In `excel-addin/src/types/signalr.ts`, add token usage to the AI response type:

```typescript
export interface SignalRAIResponse {
  messageId: string;
  content: string;
  actions?: any[];
  isComplete?: boolean;
  type?: 'completion' | 'response';
  operationsSummary?: any;
  tokenUsage?: TokenUsage; // Add this
}

// Add new interface
export interface TokenUsage {
  input: number;
  output: number;
  total: number;
  max: number;
}
```

#### 2.2 Create Token Counter Component

Create `excel-addin/src/components/chat/TokenCounter.tsx`:

```tsx
import React from 'react';
import { TokenUsage } from '../../types/signalr';

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

#### 2.3 Create Token Usage Persistence Hook

Create `excel-addin/src/hooks/usePersistedTokenUsage.ts`:

```typescript
import { useState, useEffect } from 'react';
import { TokenUsage } from '../types/signalr';

const STORAGE_KEY = 'gridmate_token_usage';

export const usePersistedTokenUsage = (sessionId: string) => {
  const [tokenUsage, setTokenUsage] = useState<TokenUsage | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(`${STORAGE_KEY}_${sessionId}`);
    if (stored) {
      try {
        setTokenUsage(JSON.parse(stored));
      } catch (error) {
        console.error('Failed to parse stored token usage:', error);
      }
    }
  }, [sessionId]);

  // Update and persist
  const updateTokenUsage = (usage: TokenUsage | null) => {
    setTokenUsage(usage);
    if (usage) {
      localStorage.setItem(`${STORAGE_KEY}_${sessionId}`, JSON.stringify(usage));
    } else {
      localStorage.removeItem(`${STORAGE_KEY}_${sessionId}`);
    }
  };

  const clearTokenUsage = () => {
    localStorage.removeItem(`${STORAGE_KEY}_${sessionId}`);
    setTokenUsage(null);
  };

  return { tokenUsage, updateTokenUsage, clearTokenUsage };
};
```

#### 2.4 Add State to Chat Interface

In `excel-addin/src/components/chat/EnhancedChatInterface.tsx`, add token counter:

```tsx
import { TokenCounter } from './TokenCounter';
import { usePersistedTokenUsage } from '../../hooks/usePersistedTokenUsage';
import { TokenUsage } from '../../types/signalr';

// Update the interface props
interface EnhancedChatInterfaceProps {
  // ... existing props ...
  sessionId?: string;
}

export const EnhancedChatInterface: React.FC<EnhancedChatInterfaceProps> = ({
  // ... existing props ...
  sessionId = 'default',
}) => {
  // Add state for token usage with persistence
  const { tokenUsage, updateTokenUsage, clearTokenUsage } = usePersistedTokenUsage(sessionId);
  
  // ... existing code ...
  
  // Update handleClearChat to also clear token usage
  React.useEffect(() => {
    if (onClearChat) {
      const originalClearChat = onClearChat;
      onClearChat = () => {
        originalClearChat();
        clearTokenUsage();
      };
    }
  }, [onClearChat, clearTokenUsage]);
  
  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="border-b border-border-primary bg-surface-primary">
        {/* ... existing header content ... */}
      </div>
      
      {/* Token Counter - Add after header */}
      <TokenCounter tokenUsage={tokenUsage} />
      
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* ... existing messages rendering ... */}
      </div>
      
      {/* Input area */}
      {/* ... existing input area ... */}
    </div>
  );
};
```

#### 2.5 Update Message Handler

In `excel-addin/src/hooks/useMessageHandlers.ts`, add token usage handling:

```typescript
export const useMessageHandlers = (
  chatManager: ReturnType<typeof useChatManager>,
  diffPreview: ReturnType<typeof useDiffPreview>,
  autonomyMode: string,
  addDebugLog: (message: string, type?: string) => void,
  onTokenUsage?: (usage: TokenUsage) => void // Add this parameter
) => {
  // ... existing code ...
  
  const handleAIResponse = useCallback((response: SignalRAIResponse) => {
    addDebugLog(`AI response received: ${response.content?.substring(0, 50) || ''}...`);
    
    // Handle token usage if present
    if (response.tokenUsage && onTokenUsage) {
      addDebugLog(`Token usage update: ${response.tokenUsage.total}/${response.tokenUsage.max} tokens`, 'info');
      onTokenUsage(response.tokenUsage);
    }
    
    // Check if this is a completion message
    if (response.type === 'completion') {
      // ... existing completion handling ...
    }
    
    // ... rest of existing handleAIResponse logic ...
  }, [addDebugLog, chatManager, messageTimeouts, onTokenUsage]);
  
  // ... rest of the hook ...
};
```

#### 2.6 Wire Everything Together

In the parent component that creates the chat interface (e.g., `EnhancedChatInterfaceWrapper.tsx`):

```typescript
import { usePersistedTokenUsage } from '../../hooks/usePersistedTokenUsage';

export const EnhancedChatInterfaceWrapper: React.FC = () => {
  const sessionId = 'default'; // Or get from context/props
  const { tokenUsage, updateTokenUsage } = usePersistedTokenUsage(sessionId);
  
  // ... existing code ...
  
  // Update message handlers to include token usage callback
  const messageHandlers = useMessageHandlers(
    chatManager,
    diffPreview,
    autonomyMode,
    addDebugLog,
    updateTokenUsage // Pass the update function
  );
  
  return (
    <EnhancedChatInterface
      // ... existing props ...
      sessionId={sessionId}
    />
  );
};
```

## Important Considerations

### Dynamic Context vs. Linear Growth

The original plan assumed token usage would always increase with each message. However, with the enhanced context memory system:

- **Context Pruning**: Older, low-priority context items are dropped when approaching limits
- **Token Plateaus**: Total tokens may stabilize or even decrease after pruning
- **Not Cumulative**: The "total" represents current context size, not accumulated tokens

### Persistence Integration

Since the enhanced system includes chat history persistence:

- Token usage is stored alongside the session ID
- Cleared when chat history is cleared
- Restored when returning to a previous session

### Configuration Points

The 200k limit is hard-coded but should eventually be:

- Derived from the AI model configuration
- Consistent with the backend's `ContextWindow.maxTokens`
- Adjustable for different models (GPT-4, Claude, etc.)

## Testing Plan

1. **Basic Functionality**
   - Send a message and verify token counts appear
   - Send multiple messages and watch the total (may plateau due to pruning)
   - Test with long messages to see higher token counts
   - Verify progress bar color changes at 80% and 90%

2. **Persistence**
   - Send messages and note token usage
   - Refresh the page
   - Verify token counter shows the last known usage
   - Clear chat and verify token usage resets

3. **Context Pruning Behavior**
   - Send many messages to approach the limit
   - Observe that total may stabilize rather than continuously growing
   - Verify the UI accurately reflects this non-linear behavior

4. **Integration**
   - Verify token updates arrive with AI responses
   - Check that completion messages properly update tokens
   - Ensure no errors when AI service is unavailable

## Implementation Time

- Backend changes: 2-3 hours
- Frontend component: 2-3 hours
- Persistence layer: 1-2 hours
- Integration & testing: 2-3 hours

**Total: 7-11 hours** (approximately 1 day of work)

## Future Enhancements

1. **Token Breakdown**: Show tokens by category (system prompt, chat history, spreadsheet context)
2. **Cost Estimation**: Calculate approximate API costs based on token usage
3. **Manual Pruning**: Allow users to remove old messages to free up tokens
4. **Model Selection**: Adjust limits based on selected AI model
5. **Context Warnings**: Alert users before important context is pruned

## Summary

This implementation provides a clean, minimal token counter that:
- Shows users how much context they're using
- Persists across sessions
- Handles the reality of dynamic context management
- Integrates properly with the enhanced chat system

The key difference from v1 is understanding that tokens don't accumulate forever - they represent the current context window usage, which may fluctuate as the system manages memory efficiently.