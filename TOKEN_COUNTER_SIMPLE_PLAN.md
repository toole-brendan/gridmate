# Simple Token Counter Implementation Plan for Gridmate

## Overview

This plan implements a minimal token counter that displays current context usage as "X / 200,000 tokens (↑input, ↓output)" - exactly like Cline and Roo-code.

## Implementation Steps

### 1. Backend Changes

#### 1.1 Add Token Usage to Chat Response

In `backend/internal/services/excel_types.go`, add to the `ChatResponse` struct:

```go
type ChatResponse struct {
    Content     string           `json:"content"`
    Suggestions []string         `json:"suggestions,omitempty"`
    Actions     []ProposedAction `json:"actions,omitempty"`
    SessionID   string           `json:"sessionId"`
    IsFinal     bool             `json:"isFinal"`
    TokenUsage  *TokenUsage      `json:"tokenUsage,omitempty"` // Add this
}

// Add new struct
type TokenUsage struct {
    Input  int `json:"input"`
    Output int `json:"output"`
    Total  int `json:"total"`
    Max    int `json:"max"`
}
```

#### 1.2 Pass Token Data from AI Service

In `backend/internal/services/excel_bridge.go`, modify `ProcessChatMessage`:

```go
// After getting aiResponse
if aiResponse != nil && aiResponse.Usage.TotalTokens > 0 {
    response.TokenUsage = &TokenUsage{
        Input:  aiResponse.Usage.PromptTokens,
        Output: aiResponse.Usage.CompletionTokens,
        Total:  aiResponse.Usage.TotalTokens,
        Max:    200000, // Claude 3.5's limit
    }
}
```

#### 1.3 Update SignalR Handler

In `backend/internal/handlers/signalr_handler.go`, pass token data in responses:

```go
// When sending AI response
response := map[string]interface{}{
    "messageId":  req.MessageID,
    "content":    response.Content,
    "tokenUsage": response.TokenUsage, // Add this
    // ... other fields
}
```

### 2. Frontend Changes

#### 2.1 Create Token Counter Component

Create `excel-addin/src/components/chat/TokenCounter.tsx`:

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

#### 2.2 Add State to Chat Interface

In `excel-addin/src/components/chat/RefactoredChatInterface.tsx`:

```tsx
import { TokenCounter } from './TokenCounter';

export const RefactoredChatInterface: React.FC = () => {
  // Add state for token usage
  const [tokenUsage, setTokenUsage] = useState<TokenUsage | null>(null);
  
  // ... existing code ...
  
  // Update message handler to capture token usage
  const messageHandlers = useMessageHandlers(
    chatManager, 
    diffPreview, 
    autonomyMode, 
    addDebugLog,
    (message: any) => {
      // Add callback for token usage
      if (message.tokenUsage) {
        setTokenUsage(message.tokenUsage);
      }
    }
  );
  
  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="border-b border-border-primary bg-surface-primary">
        {/* ... existing header content ... */}
      </div>
      
      {/* Token Counter - Add after header */}
      <TokenCounter tokenUsage={tokenUsage} />
      
      {/* Rest of the component remains the same */}
      {/* ... */}
    </div>
  );
};
```

#### 2.3 Update Message Handler

In `excel-addin/src/hooks/useMessageHandlers.ts`, add token usage handling:

```typescript
export const useMessageHandlers = (
  chatManager: any,
  diffPreview: any,
  autonomyMode: string,
  addDebugLog: (message: string, type?: string) => void,
  onTokenUsage?: (message: any) => void // Add this parameter
) => {
  // ... existing code ...
  
  const handleSignalRMessage = useCallback((message: any) => {
    // ... existing message handling ...
    
    // Handle token usage
    if (message.tokenUsage && onTokenUsage) {
      addDebugLog('Received token usage update', 'info');
      onTokenUsage(message);
    }
    
    // ... rest of message handling ...
  }, [chatManager, diffPreview, autonomyMode, addDebugLog, onTokenUsage]);
  
  return {
    handleSignalRMessage,
    // ... other handlers ...
  };
};
```

## That's It!

This minimal implementation:
- Shows current context usage out of 200,000 tokens
- Displays input and output tokens for the latest message
- Shows a progress bar that changes color as you approach the limit
- Updates automatically with each AI response

## Implementation Time

- Backend changes: 2-3 hours
- Frontend component: 2-3 hours  
- Testing & integration: 2 hours

**Total: ~1 day of work**

## Testing

1. Send a message and verify token counts appear
2. Send multiple messages and watch the total increase
3. Test with long messages to see higher token counts
4. Verify progress bar color changes at 80% and 90%

No session tracking, no cost estimates, no fancy features - just a simple, clean token counter that tells users how much context they're using.