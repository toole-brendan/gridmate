# Token Tracker Implementation Plan for Gridmate

## Overview

This plan outlines the implementation of a context token counter for Gridmate's AI-powered chat interface, similar to those found in Cline and Roo-code. The feature will display real-time token usage (input/output/total) and show progress toward Claude 3.5's 200,000 token context limit.

## Architecture Summary

### Current State
- **AI Provider**: Anthropic Claude 3.5 Sonnet (`claude-3-5-sonnet-20241022`)
- **Communication**: Excel Add-in → SignalR (.NET) → Go Backend → Anthropic API
- **Token Data**: Already available in Anthropic API responses but not surfaced to UI
- **Frontend**: React + TypeScript with Zustand state management

### Key Insights
1. Token counting is already handled by Anthropic's API - no separate counting needed
2. SignalR is used for real-time communication, not raw WebSockets
3. The UI already has sophisticated status indicators and progress bars we can leverage

## Implementation Plan

### Phase 1: Backend Token Data Pipeline

#### 1.1 Add Token Usage Types

Create new types in `backend/internal/services/types.go`:

```go
// TokenUsage represents token consumption for a message
type TokenUsage struct {
    Input  int `json:"input"`  // Tokens in the prompt
    Output int `json:"output"` // Tokens in the response
    Total  int `json:"total"`  // Combined tokens
    Max    int `json:"max"`    // Model's context limit
}

// TokenMetrics tracks token usage across a session
type TokenMetrics struct {
    Current  TokenUsage `json:"current"`      // Latest message
    Session  SessionTokens `json:"session"`   // Cumulative session totals
    Warnings []string `json:"warnings,omitempty"` // Context warnings
}

// SessionTokens tracks cumulative token usage
type SessionTokens struct {
    TotalInput   int     `json:"totalInput"`
    TotalOutput  int     `json:"totalOutput"`
    TotalTokens  int     `json:"totalTokens"`
    MessageCount int     `json:"messageCount"`
    CostEstimate float64 `json:"costEstimate,omitempty"` // Optional
}
```

#### 1.2 Update Model Configuration

Modify `backend/internal/config/config.go`:

```go
// Add to AIConfig struct
type AIConfig struct {
    // ... existing fields ...
    ModelContextLimits map[string]int // Model name -> max context tokens
}

// In Load() function, add:
ModelContextLimits: map[string]int{
    "claude-3-5-sonnet-20241022": 200000,
    "claude-3-5-sonnet": 200000,
    "claude-3-sonnet": 200000,
    // Add other models as needed
},
```

#### 1.3 Update Chat Response Structure

Modify `backend/internal/services/excel_types.go`:

```go
// ChatResponse represents a response to a chat message
type ChatResponse struct {
    Content          string           `json:"content"`
    Suggestions      []string         `json:"suggestions,omitempty"`
    Actions          []ProposedAction `json:"actions,omitempty"`
    SessionID        string           `json:"sessionId"`
    IsFinal          bool             `json:"isFinal"`
    TokenUsage       *TokenUsage      `json:"tokenUsage,omitempty"`      // Add this
    SessionMetrics   *TokenMetrics    `json:"sessionMetrics,omitempty"`  // Add this
}
```

#### 1.4 Implement Token Tracking in AI Service

Update `backend/internal/services/ai/service.go`:

```go
// Add to Service struct
type Service struct {
    // ... existing fields ...
    tokenTracker *TokenTracker // Add this
}

// Create TokenTracker
type TokenTracker struct {
    sessions map[string]*SessionTokens
    mu       sync.RWMutex
}

func NewTokenTracker() *TokenTracker {
    return &TokenTracker{
        sessions: make(map[string]*SessionTokens),
    }
}

// Track tokens for a session
func (t *TokenTracker) TrackTokens(sessionID string, input, output int) *SessionTokens {
    t.mu.Lock()
    defer t.mu.Unlock()
    
    if t.sessions[sessionID] == nil {
        t.sessions[sessionID] = &SessionTokens{}
    }
    
    session := t.sessions[sessionID]
    session.TotalInput += input
    session.TotalOutput += output
    session.TotalTokens += input + output
    session.MessageCount++
    
    // Calculate cost estimate (Claude 3.5 Sonnet pricing as of 2024)
    inputCost := float64(session.TotalInput) / 1000000 * 3.00  // $3 per 1M input tokens
    outputCost := float64(session.TotalOutput) / 1000000 * 15.00 // $15 per 1M output tokens
    session.CostEstimate = inputCost + outputCost
    
    return session
}

// Update ProcessChatWithToolsAndHistory to include token tracking
func (s *Service) ProcessChatWithToolsAndHistory(ctx context.Context, sessionID string, userMessage string, context *FinancialContext, chatHistory []Message, autonomyMode string) (*CompletionResponse, error) {
    // ... existing code ...
    
    // After getting response from provider
    response, err := s.provider.GetCompletion(ctx, *request)
    if err != nil {
        return nil, fmt.Errorf("AI request failed: %w", err)
    }
    
    // Track tokens
    if s.tokenTracker != nil {
        sessionMetrics := s.tokenTracker.TrackTokens(
            sessionID,
            response.Usage.PromptTokens,
            response.Usage.CompletionTokens,
        )
        
        // Add token usage to response
        response.TokenUsage = &TokenUsage{
            Input:  response.Usage.PromptTokens,
            Output: response.Usage.CompletionTokens,
            Total:  response.Usage.TotalTokens,
            Max:    s.getModelContextLimit(),
        }
        
        response.SessionMetrics = &TokenMetrics{
            Current: *response.TokenUsage,
            Session: *sessionMetrics,
        }
        
        // Add warnings if approaching limits
        response.SessionMetrics.Warnings = s.checkTokenWarnings(sessionMetrics.TotalTokens)
    }
    
    // ... rest of existing code ...
}

// Helper to get model context limit
func (s *Service) getModelContextLimit() int {
    if limit, ok := s.config.ModelContextLimits[s.config.DefaultModel]; ok {
        return limit
    }
    // Default to Claude 3.5's limit
    return 200000
}

// Check for token warnings
func (s *Service) checkTokenWarnings(totalTokens int) []string {
    var warnings []string
    maxTokens := s.getModelContextLimit()
    
    percentage := float64(totalTokens) / float64(maxTokens) * 100
    
    if percentage >= 90 {
        warnings = append(warnings, fmt.Sprintf("Critical: Context is %.1f%% full. Consider starting a new session.", percentage))
    } else if percentage >= 80 {
        warnings = append(warnings, fmt.Sprintf("Warning: Context is %.1f%% full. Approaching token limit.", percentage))
    } else if percentage >= 70 {
        warnings = append(warnings, fmt.Sprintf("Info: Context is %.1f%% full.", percentage))
    }
    
    return warnings
}
```

#### 1.5 Update Excel Bridge to Pass Token Data

Modify `backend/internal/services/excel_bridge.go`:

```go
// In ProcessChatMessage function, after getting AI response:
if aiResponse != nil {
    // ... existing code ...
    
    // Pass through token usage if available
    if aiResponse.Usage.TotalTokens > 0 {
        tokenUsage := &TokenUsage{
            Input:  aiResponse.Usage.PromptTokens,
            Output: aiResponse.Usage.CompletionTokens,
            Total:  aiResponse.Usage.TotalTokens,
            Max:    200000, // Get from config
        }
        
        response.TokenUsage = tokenUsage
        
        // Add session metrics if available
        if aiResponse.SessionMetrics != nil {
            response.SessionMetrics = aiResponse.SessionMetrics
        }
    }
}
```

#### 1.6 Update SignalR Handler

Modify `backend/internal/handlers/signalr_handler.go`:

```go
// In HandleSignalRChat, when sending responses:

// Initial response with token usage
initialResponse := map[string]interface{}{
    "messageId":       req.MessageID,
    "content":         response.Content,
    "suggestions":     response.Suggestions,
    "actions":         response.Actions,
    "tokenUsage":      response.TokenUsage,      // Add this
    "sessionMetrics":  response.SessionMetrics,  // Add this
    "isComplete":      response.IsFinal,
    "isFinal":         response.IsFinal,
}

// Also update completion response
finalResponse := map[string]interface{}{
    "messageId":         req.MessageID,
    "content":           completionMessage,
    "isComplete":        true,
    "operationsSummary": opsSummary,
    "type":              "completion",
    "tokenUsage":        response.TokenUsage,     // Add this
    "sessionMetrics":    response.SessionMetrics, // Add this
}
```

### Phase 2: Frontend Token Display

#### 2.1 Create Token Types

Create `excel-addin/src/types/tokens.ts`:

```typescript
export interface TokenUsage {
  input: number;
  output: number;
  total: number;
  max: number;
}

export interface SessionTokens {
  totalInput: number;
  totalOutput: number;
  totalTokens: number;
  messageCount: number;
  costEstimate?: number;
}

export interface TokenMetrics {
  current: TokenUsage;
  session: SessionTokens;
  warnings?: string[];
}

export interface TokenState {
  metrics: TokenMetrics | null;
  isVisible: boolean;
  displayMode: 'compact' | 'detailed';
}
```

#### 2.2 Create Token Store

Create `excel-addin/src/store/useTokenStore.ts`:

```typescript
import { create } from 'zustand';
import { TokenState, TokenMetrics } from '../types/tokens';

interface TokenStore extends TokenState {
  updateMetrics: (metrics: TokenMetrics) => void;
  toggleVisibility: () => void;
  setDisplayMode: (mode: 'compact' | 'detailed') => void;
  resetSession: () => void;
}

export const useTokenStore = create<TokenStore>((set) => ({
  metrics: null,
  isVisible: true,
  displayMode: 'compact',
  
  updateMetrics: (metrics) => set({ metrics }),
  
  toggleVisibility: () => set((state) => ({ isVisible: !state.isVisible })),
  
  setDisplayMode: (mode) => set({ displayMode: mode }),
  
  resetSession: () => set({
    metrics: null,
  }),
}));
```

#### 2.3 Create TokenCounter Component

Create `excel-addin/src/components/chat/TokenCounter.tsx`:

```tsx
import React, { useMemo } from 'react';
import { useTokenStore } from '../../store/useTokenStore';
import { 
  ChartBarIcon, 
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon 
} from '@heroicons/react/24/outline';

export const TokenCounter: React.FC = () => {
  const { metrics, isVisible, displayMode, toggleVisibility, setDisplayMode } = useTokenStore();
  
  const percentage = useMemo(() => {
    if (!metrics?.current) return 0;
    return (metrics.current.total / metrics.current.max) * 100;
  }, [metrics]);
  
  const progressColor = useMemo(() => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 80) return 'bg-yellow-500';
    if (percentage >= 70) return 'bg-orange-500';
    return 'bg-blue-500';
  }, [percentage]);
  
  const hasWarnings = metrics?.warnings && metrics.warnings.length > 0;
  
  if (!isVisible || !metrics) return null;
  
  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };
  
  return (
    <div className="border-b border-gray-200 bg-gray-50 px-3 py-2">
      {/* Compact View */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <ChartBarIcon className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">
            Context: {formatNumber(metrics.current.total)} / {formatNumber(metrics.current.max)} tokens
          </span>
          <span className="text-xs text-gray-500">
            (↑{formatNumber(metrics.current.input)}, ↓{formatNumber(metrics.current.output)})
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          {hasWarnings && (
            <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500" />
          )}
          <button
            onClick={() => setDisplayMode(displayMode === 'compact' ? 'detailed' : 'compact')}
            className="p-1 hover:bg-gray-200 rounded"
          >
            {displayMode === 'compact' ? (
              <ChevronDownIcon className="h-4 w-4" />
            ) : (
              <ChevronUpIcon className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
      
      {/* Progress Bar */}
      <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
        <div 
          className={`h-full rounded-full transition-all duration-300 ${progressColor}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      
      {/* Detailed View */}
      {displayMode === 'detailed' && (
        <div className="mt-3 space-y-2 text-xs text-gray-600">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="font-medium">Session Total:</span> {formatNumber(metrics.session.totalTokens)}
            </div>
            <div>
              <span className="font-medium">Messages:</span> {metrics.session.messageCount}
            </div>
            <div>
              <span className="font-medium">Input Total:</span> {formatNumber(metrics.session.totalInput)}
            </div>
            <div>
              <span className="font-medium">Output Total:</span> {formatNumber(metrics.session.totalOutput)}
            </div>
          </div>
          
          {metrics.session.costEstimate !== undefined && (
            <div className="pt-2 border-t border-gray-200">
              <span className="font-medium">Estimated Cost:</span> ${metrics.session.costEstimate.toFixed(4)}
            </div>
          )}
          
          {hasWarnings && (
            <div className="pt-2 border-t border-gray-200">
              {metrics.warnings!.map((warning, idx) => (
                <div key={idx} className="flex items-start space-x-1 text-yellow-600">
                  <InformationCircleIcon className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  <span>{warning}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
```

#### 2.4 Update Message Handlers

Modify `excel-addin/src/hooks/useMessageHandlers.ts`:

```typescript
import { useTokenStore } from '../store/useTokenStore';

export const useMessageHandlers = (
  chatManager: any,
  diffPreview: any,
  autonomyMode: string,
  addDebugLog: (message: string, type?: string) => void
) => {
  const updateTokenMetrics = useTokenStore((state) => state.updateMetrics);
  
  // ... existing code ...
  
  const handleSignalRMessage = useCallback((message: any) => {
    // ... existing message handling ...
    
    // Handle token usage updates
    if (message.tokenUsage || message.sessionMetrics) {
      addDebugLog('Received token usage update', 'info');
      
      if (message.sessionMetrics) {
        updateTokenMetrics(message.sessionMetrics);
      } else if (message.tokenUsage) {
        // If only current usage is provided, create metrics object
        updateTokenMetrics({
          current: message.tokenUsage,
          session: {
            totalInput: message.tokenUsage.input,
            totalOutput: message.tokenUsage.output,
            totalTokens: message.tokenUsage.total,
            messageCount: 1,
          }
        });
      }
    }
    
    // ... rest of existing code ...
  }, [chatManager, diffPreview, autonomyMode, addDebugLog, updateTokenMetrics]);
  
  return {
    handleSignalRMessage,
    // ... other handlers ...
  };
};
```

#### 2.5 Integrate TokenCounter into Chat Interface

Update `excel-addin/src/components/chat/RefactoredChatInterface.tsx`:

```tsx
import { TokenCounter } from './TokenCounter';
import { useTokenStore } from '../../store/useTokenStore';

export const RefactoredChatInterface: React.FC = () => {
  // ... existing code ...
  
  const resetTokenSession = useTokenStore((state) => state.resetSession);
  
  // Reset token tracking when starting new session
  const handleNewSession = useCallback(() => {
    resetTokenSession();
    // ... other new session logic ...
  }, [resetTokenSession]);
  
  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="border-b border-border-primary bg-surface-primary">
        {/* ... existing header content ... */}
      </div>
      
      {/* Token Counter - Place after header */}
      <TokenCounter />
      
      {/* Context Pills */}
      {isContextEnabled && activeContext.length > 0 && (
        <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
          {/* ... existing context pills ... */}
        </div>
      )}
      
      {/* ... rest of the component ... */}
    </div>
  );
};
```

### Phase 3: Advanced Features

#### 3.1 Context Management Service

Create `excel-addin/src/services/contextManager.ts`:

```typescript
import { TokenMetrics } from '../types/tokens';

export class ContextManager {
  private static instance: ContextManager;
  
  static getInstance(): ContextManager {
    if (!this.instance) {
      this.instance = new ContextManager();
    }
    return this.instance;
  }
  
  /**
   * Suggests context optimization when approaching limits
   */
  suggestOptimization(metrics: TokenMetrics): ContextOptimization | null {
    const percentage = (metrics.current.total / metrics.current.max) * 100;
    
    if (percentage >= 80) {
      return {
        type: 'summarize',
        reason: 'Approaching context limit',
        suggestion: 'Consider summarizing older messages to free up context space',
        estimatedSavings: Math.floor(metrics.session.totalTokens * 0.3), // Estimate 30% reduction
      };
    }
    
    if (metrics.session.messageCount > 50) {
      return {
        type: 'archive',
        reason: 'Large conversation history',
        suggestion: 'Archive older messages to maintain performance',
        estimatedSavings: Math.floor(metrics.session.totalTokens * 0.5),
      };
    }
    
    return null;
  }
  
  /**
   * Estimates tokens for a message before sending
   */
  estimateTokens(message: string): number {
    // Simple estimation: ~4 characters per token for English
    // More accurate counting would require a proper tokenizer
    return Math.ceil(message.length / 4);
  }
}

interface ContextOptimization {
  type: 'summarize' | 'archive' | 'clear';
  reason: string;
  suggestion: string;
  estimatedSavings: number;
}
```

#### 3.2 Token Usage in Debug Panel

Update the debug panel to show token metrics:

```tsx
// In RefactoredChatInterface.tsx, add to debug logs section:
{isDebugOpen && (
  <div className="mt-4 p-4 bg-gray-100 rounded-lg">
    {/* ... existing debug content ... */}
    
    {/* Token Usage Section */}
    {tokenMetrics && (
      <div className="mt-4 border-t pt-4">
        <h4 className="font-semibold mb-2">Token Usage</h4>
        <div className="space-y-1 text-sm">
          <div>Current Message: {tokenMetrics.current.input} → {tokenMetrics.current.output}</div>
          <div>Session Total: {tokenMetrics.session.totalTokens} tokens</div>
          <div>Context Usage: {((tokenMetrics.current.total / tokenMetrics.current.max) * 100).toFixed(1)}%</div>
          {tokenMetrics.session.costEstimate && (
            <div>Estimated Cost: ${tokenMetrics.session.costEstimate.toFixed(4)}</div>
          )}
        </div>
      </div>
    )}
  </div>
)}
```

### Phase 4: Testing & Edge Cases

#### 4.1 Test Scenarios

1. **Token Limit Warnings**
   - Test at 70%, 80%, and 90% thresholds
   - Verify warnings appear correctly

2. **Session Reset**
   - Ensure token counts reset with new sessions
   - Test persistence across reconnections

3. **Tool Usage**
   - Verify token counts include tool definitions
   - Test with multiple tool calls

4. **Streaming Responses**
   - Ensure UI updates after streaming completes
   - Handle partial token data gracefully

#### 4.2 Error Handling

```typescript
// Add to TokenCounter component
const TokenCounterError: React.FC<{ error: string }> = ({ error }) => (
  <div className="px-3 py-2 bg-red-50 border-b border-red-200">
    <div className="flex items-center space-x-2 text-sm text-red-700">
      <ExclamationTriangleIcon className="h-4 w-4" />
      <span>Token tracking error: {error}</span>
    </div>
  </div>
);

// Wrap TokenCounter with error boundary
export const SafeTokenCounter: React.FC = () => {
  try {
    return <TokenCounter />;
  } catch (error) {
    console.error('TokenCounter error:', error);
    return <TokenCounterError error={error.message} />;
  }
};
```

### Implementation Timeline

| Phase | Tasks | Duration |
|-------|-------|----------|
| **Phase 1** | Backend token pipeline, data structures, SignalR integration | 2-3 days |
| **Phase 2** | Frontend TokenCounter component, state management, UI integration | 2-3 days |
| **Phase 3** | Context optimization, debug integration, advanced features | 3-4 days |
| **Phase 4** | Testing, error handling, performance optimization | 2 days |

**Total: 9-12 days**

### Configuration & Deployment

#### Environment Variables

Add to `.env`:
```bash
# Token tracking configuration
ENABLE_TOKEN_TRACKING=true
SHOW_COST_ESTIMATES=true
TOKEN_WARNING_THRESHOLD=0.8
```

#### Feature Flags

```typescript
// In app configuration
export const features = {
  tokenTracking: process.env.ENABLE_TOKEN_TRACKING === 'true',
  costEstimates: process.env.SHOW_COST_ESTIMATES === 'true',
  tokenWarningThreshold: parseFloat(process.env.TOKEN_WARNING_THRESHOLD || '0.8'),
};
```

### Monitoring & Analytics

Track usage patterns:
```typescript
// Analytics events
trackEvent('token_usage', {
  sessionId: metrics.session.id,
  totalTokens: metrics.session.totalTokens,
  messageCount: metrics.session.messageCount,
  peakUsage: metrics.session.peakUsage,
  warnings: metrics.warnings?.length || 0,
});
```

### Future Enhancements

1. **Token Optimization**
   - Automatic context pruning
   - Message summarization
   - Smart context selection

2. **Multi-Model Support**
   - Different limits for different models
   - Model switching based on token usage

3. **Team Analytics**
   - Aggregate token usage across team
   - Cost allocation by user/project

4. **Export Capabilities**
   - Export token usage reports
   - Integration with billing systems

This implementation plan provides a complete, production-ready token tracking system that integrates seamlessly with Gridmate's existing architecture while providing valuable insights to users about their AI usage.