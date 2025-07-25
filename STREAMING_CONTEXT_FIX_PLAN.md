# GridMate Streaming & Context Handling Fix Plan

## Executive Summary

This plan addresses critical issues in GridMate's streaming chat implementation where context handling compromises the real-time streaming experience. The Phase 0 implementation successfully prevents blank chat bubbles but introduces new problems:

1. **Missing Context**: Streaming mode skips context building, causing unnecessary tool calls
2. **Tool Result Integration**: Tool outputs are not properly integrated into the streaming response
3. **User Experience**: Streaming appears as one big chunk after tool execution rather than smooth token flow

## Current State Analysis

### Phase 0 Implementation Issues

#### 1. Context Building Disabled in Streaming Mode
```go
// PHASE 0 FIX: Skip all context building during streaming to avoid tool requests
if streamingMode {
    context.ModelType = "Streaming"
    context.DocumentContext = append(context.DocumentContext, 
        "Context building skipped during streaming response.")
    return context, nil
}
```

**Impact**: The AI doesn't know the spreadsheet state, leading to unnecessary `read_range` calls.

#### 2. Placeholder Tool Results
```go
// Add placeholder tool results to continue streaming
toolResults = append(toolResults, ToolResult{
    Type:      "tool_result",
    Content:   `{"status": "processing", "message": "Tool execution in progress"}`,
})
```

**Impact**: The AI generates responses without actual tool data, causing state mismatches.

#### 3. No Real-Time Tool Integration
The streaming pipeline doesn't wait for or incorporate actual tool results before continuing the response generation.

## Proposed Solution Architecture

### Phase 1: Smart Context Injection (Immediate Priority)

#### 1.1 Lightweight Context Provider
Create a cached, non-blocking context system that provides essential information without tool calls.

**Implementation**:
```go
// New: CachedContextProvider
type CachedContextProvider struct {
    mu sync.RWMutex
    cache map[string]*LightweightContext
}

type LightweightContext struct {
    IsEmpty      bool
    RowCount     int
    ColumnCount  int
    LastModified time.Time
    SheetName    string
    // Minimal metadata that doesn't require tool calls
}
```

**Benefits**:
- No blocking tool calls during streaming initialization
- AI knows basic sheet state (empty/populated)
- Reduces unnecessary read_range calls

#### 1.2 Context Building Enhancement
Modify the context builder to support streaming-friendly operations:

```go
func (cb *ContextBuilder) BuildStreamingContext(ctx context.Context, sessionID string) (*ai.FinancialContext, error) {
    // Get cached lightweight context
    lightCtx := cb.cachedProvider.GetContext(sessionID)
    
    context := &ai.FinancialContext{
        ModelType: "Streaming",
        IsEmpty: lightCtx.IsEmpty,
        DocumentContext: []string{
            fmt.Sprintf("Sheet: %s", lightCtx.SheetName),
            fmt.Sprintf("Status: %s", getSheetStatus(lightCtx)),
        },
    }
    
    return context, nil
}
```

### Phase 2: Tool Result Integration Pipeline

#### 2.1 Streaming State Manager
Implement proper state management for tool execution during streaming:

```go
type StreamingStateManager struct {
    pendingTools   map[string]*PendingToolExecution
    toolResults    map[string]*ToolResult
    continuation   chan ContinuationSignal
}

type PendingToolExecution struct {
    ToolCall      ToolCall
    RequestTime   time.Time
    ResultChannel chan ToolResult
}
```

#### 2.2 Tool Result Injection
Modify the streaming pipeline to properly wait for and inject tool results:

```go
func (s *Service) processStreamingWithContinuation(session *StreamingSession, outChan chan<- CompletionChunk) {
    // ... existing code ...
    
    if len(toolCalls) > 0 {
        // Send tool execution phase
        outChan <- CompletionChunk{
            Type: "phase_change",
            Content: `{"phase": "tool_execution", "status": "waiting"}`,
        }
        
        // Execute tools and wait for results
        toolResults := s.executeToolsWithTimeout(session.Context, toolCalls, 30*time.Second)
        
        // Inject real results into conversation
        for _, result := range toolResults {
            session.Messages = append(session.Messages, Message{
                Role: "assistant",
                Content: fmt.Sprintf("Tool result for %s: %s", result.ToolName, result.Content),
            })
        }
        
        // Continue with informed response
        s.continueStreamingWithContext(session, toolResults, outChan)
    }
}
```

### Phase 3: Enhanced Streaming UX

#### 3.1 Progressive Disclosure
Stream partial responses while tools execute:

```go
func (s *Service) streamProgressiveResponse(session *StreamingSession, outChan chan<- CompletionChunk) {
    // Stream initial explanation
    s.streamTokens("I'll create a DCF model for you. Let me first check the current sheet structure...", outChan)
    
    // Execute tool in background
    go func() {
        result := s.executeToolAsync(toolCall)
        s.injectToolResult(session, result)
    }()
    
    // Continue streaming while tool executes
    s.streamTokens("Setting up the model structure with the following sections:\n- Revenue projections\n- Cost analysis\n- Cash flow calculations", outChan)
}
```

#### 3.2 Frontend Status Updates
Enhance the frontend to show tool execution status:

```typescript
// Frontend: ChunkedRenderer enhancement
interface StreamingPhase {
    phase: 'initial' | 'tool_execution' | 'continuation' | 'final';
    toolStatus?: {
        name: string;
        progress: 'pending' | 'executing' | 'complete';
        preview?: any;
    };
}

// Show tool status in UI
{phase.toolStatus && (
    <ToolStatusIndicator 
        tool={phase.toolStatus.name}
        status={phase.toolStatus.progress}
    />
)}
```

## Implementation Roadmap

### Week 1: Lightweight Context System
1. **Day 1-2**: Implement CachedContextProvider
   - Create cache structure
   - Add update hooks to Excel operations
   - Implement GetContext method

2. **Day 3-4**: Modify ContextBuilder
   - Add BuildStreamingContext method
   - Update prompt builder to use lightweight context
   - Test context accuracy

3. **Day 5**: Integration Testing
   - Verify no tool calls during streaming init
   - Confirm context accuracy
   - Performance benchmarking

### Week 2: Tool Result Integration
1. **Day 1-2**: StreamingStateManager
   - Implement pending tool tracking
   - Add result channels
   - Create timeout handling

2. **Day 3-4**: Pipeline Modification
   - Update processStreamingWithContinuation
   - Implement executeToolsWithTimeout
   - Add result injection logic

3. **Day 5**: Testing & Refinement
   - Test tool result accuracy
   - Verify streaming continuity
   - Handle edge cases

### Week 3: UX Enhancements
1. **Day 1-2**: Progressive Streaming
   - Implement streamProgressiveResponse
   - Add content buffering
   - Create smooth transitions

2. **Day 3-4**: Frontend Updates
   - Add ToolStatusIndicator component
   - Implement phase transitions
   - Add loading states

3. **Day 5**: End-to-End Testing
   - Full user flow testing
   - Performance optimization
   - Bug fixes

## Success Metrics

### Technical Metrics
- **Context Availability**: 100% of streaming requests have basic context
- **Tool Integration**: 100% of tool results properly injected
- **Streaming Latency**: < 500ms to first token
- **Tool Execution**: < 2s average tool round-trip

### User Experience Metrics
- **Perceived Responsiveness**: Immediate visual feedback
- **Streaming Smoothness**: Consistent token flow
- **Tool Transparency**: Clear indication of tool execution
- **Error Rate**: < 1% streaming failures

## Risk Mitigation

### Risk 1: Cache Staleness
**Mitigation**: Implement TTL and invalidation on Excel operations

### Risk 2: Tool Timeout
**Mitigation**: Progressive timeout with fallback responses

### Risk 3: Complex Tool Chains
**Mitigation**: Limit tool rounds in streaming mode, defer complex operations

## Testing Strategy

### Unit Tests
- CachedContextProvider accuracy
- StreamingStateManager state transitions
- Tool result injection logic

### Integration Tests
- End-to-end streaming flow
- Tool execution during streaming
- Context accuracy verification

### Performance Tests
- Streaming latency measurement
- Concurrent session handling
- Memory usage under load

## Rollout Plan

### Phase 1 Rollout (Week 1)
- Deploy lightweight context system
- Monitor for reduced tool calls
- A/B test with subset of users

### Phase 2 Rollout (Week 2)
- Deploy tool integration pipeline
- Monitor response accuracy
- Gradual rollout to all users

### Phase 3 Rollout (Week 3)
- Deploy UX enhancements
- Full production deployment
- Performance monitoring

## Monitoring & Observability

### Key Metrics to Track
1. **Streaming Performance**
   - Time to first token
   - Token generation rate
   - Tool execution time

2. **Context Accuracy**
   - Cache hit rate
   - Context staleness events
   - Unnecessary tool calls

3. **User Experience**
   - Session completion rate
   - User satisfaction scores
   - Error rates

### Logging Enhancements
```go
// Add structured logging for streaming pipeline
log.Info().
    Str("session_id", session.ID).
    Str("phase", phase).
    Int("context_size", len(context)).
    Bool("has_tools", len(tools) > 0).
    Dur("latency", latency).
    Msg("[STREAMING] Phase transition")
```

## Conclusion

This plan addresses the core issues in GridMate's streaming implementation by:
1. Providing lightweight context without blocking operations
2. Properly integrating tool results into the streaming flow
3. Enhancing the user experience with progressive updates

The phased approach ensures each improvement can be tested and validated before moving to the next, minimizing risk while delivering incremental value.