# Anthropic Tool-Calling Enhancements Implementation Plan

## Overview
This document outlines the implementation plan for enhancing the Anthropic tool-calling functionality in the GridMate AI Excel Assistant to fully comply with Anthropic's tool-use standards.

## Priority 1: Tool Choice Parameter Implementation

### 1.1 Update Type Definitions
**File:** `backend/internal/services/ai/interface.go`

Add the following type definition:
```go
// ToolChoice represents the tool selection strategy
type ToolChoice struct {
    Type string `json:"type"` // "auto", "any", "none", or "tool"
    Name string `json:"name,omitempty"` // For specific tool selection
}
```

Update `CompletionRequest` struct:
```go
type CompletionRequest struct {
    // ... existing fields ...
    ToolChoice *ToolChoice `json:"tool_choice,omitempty"`
}
```

### 1.2 Update Anthropic Provider
**File:** `backend/internal/services/ai/anthropic.go`

Modify the `anthropicRequest` struct:
```go
type anthropicRequest struct {
    // ... existing fields ...
    ToolChoice *map[string]interface{} `json:"tool_choice,omitempty"`
}
```

Update `convertToAnthropicRequest` method:
```go
func (a *AnthropicProvider) convertToAnthropicRequest(request CompletionRequest) *anthropicRequest {
    // ... existing code ...
    
    // Add tool choice conversion
    if request.ToolChoice != nil {
        switch request.ToolChoice.Type {
        case "none":
            anthropicReq.ToolChoice = &map[string]interface{}{"type": "none"}
        case "any":
            anthropicReq.ToolChoice = &map[string]interface{}{"type": "any"}
        case "auto":
            anthropicReq.ToolChoice = &map[string]interface{}{"type": "auto"}
        case "tool":
            anthropicReq.ToolChoice = &map[string]interface{}{
                "type": "tool",
                "name": request.ToolChoice.Name,
            }
        }
    }
}
```

### 1.3 Update Service Layer
**File:** `backend/internal/services/ai/service.go`

Modify `ProcessChatWithToolsAndHistory` to respect tool choice:
```go
func (s *Service) ProcessChatWithToolsAndHistory(...) {
    // ... existing code ...
    
    // Respect autonomy mode with tool choice
    var toolChoice *ToolChoice
    switch autonomyMode {
    case "ask":
        toolChoice = &ToolChoice{Type: "none"}
    case "auto":
        toolChoice = &ToolChoice{Type: "auto"}
    case "full":
        toolChoice = &ToolChoice{Type: "any"}
    }
    
    if toolChoice != nil {
        request.ToolChoice = toolChoice
    }
}
```

### 1.4 Update Excel Bridge
**File:** `backend/internal/services/excel_bridge.go`

Add tool choice logic for specific operations:
```go
// When user asks for specific operation
if strings.Contains(message.Content, "read") && strings.Contains(message.Content, "range") {
    request.ToolChoice = &ToolChoice{
        Type: "tool",
        Name: "read_range",
    }
}
```

## Priority 2: Enhanced Streaming Tool Events

### 2.1 Update Stream Event Types
**File:** `backend/internal/services/ai/anthropic.go`

Add new event type definitions:
```go
type anthropicContentBlock struct {
    Type      string                 `json:"type"`
    ID        string                 `json:"id,omitempty"`
    Name      string                 `json:"name,omitempty"`
    Input     map[string]interface{} `json:"input,omitempty"`
}

type anthropicStreamEvent struct {
    Type         string                  `json:"type"`
    Index        int                     `json:"index,omitempty"`
    Delta        *anthropicDelta         `json:"delta,omitempty"`
    ContentBlock *anthropicContentBlock  `json:"content_block,omitempty"`
    Message      *anthropicResponse      `json:"message,omitempty"`
    Usage        *anthropicUsage         `json:"usage,omitempty"`
    Error        *anthropicError         `json:"error,omitempty"`
}
```

### 2.2 Update Streaming Handler
**File:** `backend/internal/services/ai/anthropic.go`

Enhance `makeStreamingRequest` method:
```go
func (a *AnthropicProvider) makeStreamingRequest(...) error {
    // ... existing code ...
    
    var currentToolCall *ToolCall
    
    switch event.Type {
    case "content_block_start":
        if event.ContentBlock != nil && event.ContentBlock.Type == "tool_use" {
            currentToolCall = &ToolCall{
                ID:    event.ContentBlock.ID,
                Name:  event.ContentBlock.Name,
                Input: make(map[string]interface{}),
            }
            ch <- CompletionChunk{
                ID:       messageID,
                Type:     "tool_start",
                ToolCall: currentToolCall,
                Done:     false,
            }
        }
    
    case "content_block_delta":
        if event.Delta != nil && currentToolCall != nil {
            // Handle incremental tool input updates
            if event.Delta.Type == "input_json_delta" {
                ch <- CompletionChunk{
                    ID:       messageID,
                    Type:     "tool_progress",
                    ToolCall: currentToolCall,
                    Delta:    event.Delta.Text,
                    Done:     false,
                }
            }
        }
    
    case "content_block_stop":
        if currentToolCall != nil {
            ch <- CompletionChunk{
                ID:       messageID,
                Type:     "tool_complete",
                ToolCall: currentToolCall,
                Done:     false,
            }
            currentToolCall = nil
        }
    }
}
```

### 2.3 Update Chunk Type Definition
**File:** `backend/internal/services/ai/interface.go`

Enhance `CompletionChunk` struct:
```go
type CompletionChunk struct {
    ID       string     `json:"id"`
    Content  string     `json:"content"`
    Delta    string     `json:"delta"`
    Done     bool       `json:"done"`
    Error    error      `json:"error,omitempty"`
    Type     string     `json:"type,omitempty"` // "text", "tool_start", "tool_progress", "tool_complete"
    ToolCall *ToolCall  `json:"tool_call,omitempty"`
}
```

### 2.4 Update WebSocket Handler
**File:** `backend/internal/handlers/websocket.go`

Handle new streaming events:
```go
func (h *Handler) handleStreamingResponse(ctx context.Context, conn *websocket.Conn, chunks <-chan ai.CompletionChunk) {
    for chunk := range chunks {
        var message map[string]interface{}
        
        switch chunk.Type {
        case "tool_start":
            message = map[string]interface{}{
                "type": "tool_start",
                "tool": map[string]interface{}{
                    "id":   chunk.ToolCall.ID,
                    "name": chunk.ToolCall.Name,
                },
            }
        case "tool_progress":
            message = map[string]interface{}{
                "type": "tool_progress",
                "tool_id": chunk.ToolCall.ID,
                "delta": chunk.Delta,
            }
        case "tool_complete":
            message = map[string]interface{}{
                "type": "tool_complete",
                "tool_id": chunk.ToolCall.ID,
            }
        default:
            // Handle regular text chunks
        }
        
        conn.WriteJSON(message)
    }
}
```

## Priority 3: Enhanced Error Handling

### 3.1 Create Error Types
**File:** `backend/internal/services/ai/errors.go` (new file)

```go
package ai

import "time"

type ToolErrorType string

const (
    ToolErrorTypeInvalidInput    ToolErrorType = "invalid_input"
    ToolErrorTypeExecutionError  ToolErrorType = "execution_error"
    ToolErrorTypeTimeout         ToolErrorType = "timeout"
    ToolErrorTypePermission      ToolErrorType = "permission_denied"
    ToolErrorTypeRateLimit       ToolErrorType = "rate_limit"
)

type ToolError struct {
    Type        ToolErrorType          `json:"type"`
    Message     string                 `json:"message"`
    Details     map[string]interface{} `json:"details,omitempty"`
    Retryable   bool                   `json:"retryable"`
    RetryAfter  *time.Duration         `json:"retry_after,omitempty"`
    ToolName    string                 `json:"tool_name"`
    ToolID      string                 `json:"tool_id"`
}
```

### 3.2 Update Tool Executor
**File:** `backend/internal/services/ai/tool_executor.go`

Enhance error handling:
```go
func (te *ToolExecutor) ExecuteTool(ctx context.Context, sessionID string, toolCall ToolCall, autonomyMode string) (*ToolResult, error) {
    // Add timeout context
    toolCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
    defer cancel()
    
    // Wrap execution with error handling
    result, err := te.executeWithErrorHandling(toolCtx, sessionID, toolCall, autonomyMode)
    if err != nil {
        toolErr := te.categorizeError(err, toolCall)
        return &ToolResult{
            Type:      "tool_result",
            ToolUseID: toolCall.ID,
            IsError:   true,
            Content:   toolErr,
            Status:    "error",
        }, nil
    }
    
    return result, nil
}

func (te *ToolExecutor) categorizeError(err error, toolCall ToolCall) *ToolError {
    // Categorize errors
    switch {
    case errors.Is(err, context.DeadlineExceeded):
        return &ToolError{
            Type:      ToolErrorTypeTimeout,
            Message:   "Tool execution timed out",
            ToolName:  toolCall.Name,
            ToolID:    toolCall.ID,
            Retryable: true,
            RetryAfter: &[]time.Duration{5 * time.Second}[0],
        }
    // Add more error categorization
    }
}
```

## Testing Strategy

### Unit Tests
1. **File:** `backend/internal/services/ai/anthropic_test.go`
   - Test tool choice conversion
   - Test streaming event parsing

2. **File:** `backend/internal/services/ai/tool_executor_test.go`
   - Test error categorization
   - Test timeout handling

### Integration Tests
1. **File:** `backend/tests/integration/tool_calling_test.go`
   - Test full tool calling flow with tool choice
   - Test streaming tool events end-to-end

## Rollout Plan

### Phase 1 (Week 1)
- Implement tool choice parameter
- Deploy to development environment
- Test with internal team

### Phase 2 (Week 2)
- Implement streaming tool events
- Test with beta users
- Monitor performance metrics

### Phase 3 (Week 3)
- Implement enhanced error handling
- Full production rollout
- Monitor error rates and user feedback

## Monitoring & Metrics

### Key Metrics to Track
1. Tool choice usage distribution
2. Streaming event delivery latency
3. Tool error rates by type
4. User satisfaction with tool responses

### Logging Enhancements
**File:** `backend/internal/services/ai/service.go`

Add comprehensive logging:
```go
log.Info().
    Str("tool_choice", request.ToolChoice.Type).
    Int("tools_available", len(request.Tools)).
    Str("autonomy_mode", autonomyMode).
    Msg("Processing request with tool choice")
```

## Backward Compatibility

All changes will be backward compatible:
- Tool choice is optional (defaults to "auto")
- Streaming events are additive
- Error handling preserves existing behavior

## Documentation Updates

1. Update API documentation with tool choice examples
2. Add streaming event documentation
3. Create error handling guide for developers