# Comprehensive Streaming Fix Plan

## Issue Analysis

The streaming implementation is failing because:

1. **Tool Request Flow Mismatch**: 
   - Backend sends tool requests during streaming and waits for responses
   - Frontend was designed for preview-based sequential tool execution
   - In streaming mode, this creates a deadlock where both sides are waiting

2. **Stream Stalling**:
   - Browser logs show stream stalls after receiving text chunks
   - Backend logs show timeout errors when forwarding tool responses
   - The SignalR connection times out after 100 seconds

3. **Mode Detection**:
   - Frontend needs to detect streaming mode and handle tools differently
   - Backend needs to know when to skip preview mode in streaming context

## Solution Implementation

### 1. Frontend Changes (Already Applied)

✅ **Updated `handleToolRequest` in `useMessageHandlers.ts`**:
- Added streaming mode detection by checking for active streaming messages
- In streaming mode, tools execute immediately without preview
- Read operations also execute immediately in streaming mode
- Prevents batching and queuing in streaming context

✅ **Updated `handleStreamChunk`**:
- Removed duplicate tool execution logic
- Tool requests now flow through the normal `tool_request` handler

### 2. Backend Changes Needed

The backend needs to be updated to handle streaming mode properly:

```go
// In tool_executor.go ExecuteTool function
// Add streaming mode detection from context
isStreamingMode := false
if streaming, ok := ctx.Value("streaming_mode").(bool); ok {
    isStreamingMode = streaming
}

// Override autonomy mode for streaming
effectiveAutonomyMode := autonomyMode
if isStreamingMode && autonomyMode == "agent-default" {
    // Force immediate execution in streaming mode
    effectiveAutonomyMode = "full-autonomy"
}
```

### 3. SignalR Bridge Updates

The SignalR bridge needs to handle streaming tool requests differently:

```go
// In signalr_bridge.go
// Add streaming flag to tool requests
toolRequest["streaming_mode"] = true
```

### 4. Streaming Context Propagation

The streaming handler needs to propagate streaming context:

```go
// In streaming.go handler
ctx = context.WithValue(ctx, "streaming_mode", true)
```

## Testing Plan

1. **Basic Streaming Test**:
   - Send a message that triggers tool use
   - Verify tools execute immediately without preview
   - Check that responses flow back correctly

2. **Multiple Tool Test**:
   - Send a request that triggers multiple tools
   - Verify all tools execute in sequence
   - No deadlocks or timeouts

3. **Mixed Mode Test**:
   - Test streaming and non-streaming messages in same session
   - Verify correct mode detection and handling

## Implementation Priority

1. ✅ Frontend streaming detection and immediate execution (DONE)
2. 🔄 Backend streaming context propagation (NEXT)
3. 🔄 Tool executor streaming mode handling
4. 🔄 SignalR bridge streaming flag
5. 🔄 Testing and validation

## Expected Behavior After Fix

- Streaming messages with tools will execute immediately
- No preview UI in streaming mode
- Tools complete and stream continues without stalling
- Backend doesn't wait for preview approval in streaming mode
- Smooth, uninterrupted streaming experience like Cursor/Cline