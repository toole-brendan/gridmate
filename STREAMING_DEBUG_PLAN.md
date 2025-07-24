# Streaming Debug Plan

## Issue Summary
The AI chat response stops after just 1 streaming output. Based on the logs:
- Backend shows "Streaming completed successfully" after 3.68s with 6214 bytes
- Frontend immediately shows "Streaming completed" 
- Only one chunk appears to be displayed

## Root Cause Analysis

### Potential Issues:
1. **Response Buffering**: The entire response might be buffered and sent as one chunk
2. **AI Provider Issue**: The AI provider might not be properly streaming
3. **Channel Buffering**: Go channels might be buffering all chunks
4. **SignalR Forwarding**: SignalR might be batching chunks
5. **Client-Side Handling**: Frontend might not be processing chunks correctly

## Debugging Steps Added:

### 1. Backend Logging (streaming.go)
- Added chunk counter and timing information
- Logs each chunk with type, delta presence, and elapsed time
- Shows total chunks and duration on completion

### 2. SignalR Hub Logging (GridmateHub.cs)
- Added chunk counter and timing for forwarding
- Logs each chunk forwarded with size and timing
- Added 10ms delay between chunks to prevent batching
- Shows total chunks and duration on completion

### 3. Frontend Logging (useMessageHandlers.ts)
- Added chunk counter and timing for reception
- Logs each chunk received with size and timing
- Shows chunk type and delta presence
- Reports total chunks and duration

### 4. AI Provider Fix (azure_openai.go)
- Fixed chunk structure to include proper type and delta fields
- Ensured Done flag is set correctly

### 5. Excel Bridge Fix (excel_bridge.go)
- Reduced channel buffer size to 1 for better streaming
- Properly forwards chunks without buffering

## Next Steps to Test:

1. **Enable Debug Logging**:
   ```bash
   export LOG_LEVEL=debug
   ```

2. **Test with Different AI Providers**:
   - Try Anthropic: `export AI_PROVIDER=anthropic`
   - Try Azure OpenAI: `export AI_PROVIDER=azure`

3. **Monitor Logs**:
   - Backend: Look for "Sending chunk" debug logs
   - SignalR: Look for "[HUB] Forwarding chunk" logs
   - Browser: Look for "[Stream] Chunk" console logs

4. **Expected Behavior**:
   - Multiple chunks should be logged over time
   - Each chunk should have a small delta of text
   - Chunks should arrive progressively, not all at once

## Additional Debugging Options:

### 1. Force Smaller Chunks
If the AI is sending large chunks, we can split them:

```go
// In streaming handler, split large chunks
if len(chunk.Delta) > 50 {
    // Split into smaller chunks
    for i := 0; i < len(chunk.Delta); i += 50 {
        end := i + 50
        if end > len(chunk.Delta) {
            end = len(chunk.Delta)
        }
        smallChunk := chunk
        smallChunk.Delta = chunk.Delta[i:end]
        // Send small chunk
    }
}
```

### 2. Add Network Inspection
Use browser dev tools to inspect WebSocket frames:
- Open Network tab
- Filter by WS (WebSocket)
- Look at individual frames to see if chunks arrive separately

### 3. Test with Mock Streaming
Create a test endpoint that sends known chunks with delays to verify the streaming pipeline:

```go
func (h *StreamingHandler) HandleTestStream(w http.ResponseWriter, r *http.Request) {
    // Send test chunks with delays
    for i := 0; i < 10; i++ {
        fmt.Fprintf(w, "data: {\"type\":\"text\",\"delta\":\"Chunk %d \"}\n\n", i)
        w.(http.Flusher).Flush()
        time.Sleep(500 * time.Millisecond)
    }
    fmt.Fprintf(w, "data: {\"done\":true}\n\n")
    fmt.Fprintf(w, "data: [DONE]\n\n")
    w.(http.Flusher).Flush()
}
```

## Configuration to Check:

1. **Reverse Proxy Settings**: Ensure no buffering in nginx/apache
2. **CDN Settings**: Disable caching/buffering for streaming endpoints
3. **CORS Settings**: Ensure streaming headers are allowed
4. **HTTP/2 Settings**: Some HTTP/2 implementations buffer SSE

## Success Criteria:
- Multiple chunk logs appear over time (not all at once)
- Each chunk shows incremental content
- UI updates progressively as chunks arrive
- Total duration matches expected AI response time