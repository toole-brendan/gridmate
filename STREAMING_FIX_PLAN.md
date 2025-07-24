# GridMate Streaming Fix Plan

## Executive Summary

The streaming functionality in GridMate is failing due to several interconnected issues:
1. **Missing state reset** when new messages are sent
2. **ID mismatch** for diff preview messages
3. **Blocking state** from unresolved preview cards
4. **Potential React rendering issues** from state race conditions

## Root Cause Analysis

### 1. Missing handleUserMessageSent Call
**Problem**: The `RefactoredChatInterface` does not call `handleUserMessageSent` when sending a new message. This critical function is responsible for:
- Clearing pending previews from previous messages
- Resetting operation counters and queues
- Clearing processed requests tracking
- Setting up message timeouts

**Impact**: Old preview state carries over to new messages, causing the system to think it's still processing a previous operation, which blocks new previews and can freeze the UI.

### 2. Diff Preview ID Mismatch
**Problem**: When creating diff preview messages with ID `preview_<requestId>`, the `chatManager.addMessage` function ignores this ID for non-standard message types and generates a new UUID instead.

**Code Issue**:
```typescript
// In useChatManager.ts
const newMessage = {
  id: message.id || uuidv4(), // This overrides the provided ID
  // ...
}
```

**Impact**: 
- `handlePreviewAccept/Reject` cannot find the preview message by its expected ID
- Preview cards remain in "pending" state indefinitely
- React may have key reconciliation issues

### 3. Blocking Preview State
**Problem**: The system enforces "only one preview at a time" but lacks proper cleanup mechanisms:
- No auto-accept/reject of old previews when new ones arrive
- `isProcessingQueueRef` remains true if a preview is never resolved
- Queue processing gets stuck waiting for user action

**Impact**: Once a preview is shown but not acted upon, all subsequent tool operations queue up silently without displaying.

### 4. Streaming Display Issues
**Problem**: Despite backend logs showing successful streaming (38 chunks sent), and browser logs confirming chunk receipt and processing, the UI remains blank during streaming.

**Possible Causes**:
- React rendering issues from rapid state updates
- Component re-renders causing loss of streaming state
- Incorrect message lookup during streaming updates

## Fix Implementation Plan

### Phase 1: Critical Fixes (Immediate)

#### 1.1 Fix handleUserMessageSent Integration
**File**: `excel-addin/src/components/chat/RefactoredChatInterface.tsx`

```typescript
const handleSendMessage = useCallback(async () => {
  const content = input.trim();
  if (!content || !signalRClient || !isAuthenticated) return;

  if (chatManager.aiIsGenerating) {
    addDebugLog('Already generating response', 'warning');
    return;
  }

  const messageId = uuidv4();
  
  try {
    // Add user message
    chatManager.addMessage({
      id: messageId,
      role: 'user',
      content,
      timestamp: new Date(),
      type: 'user',
    });
    
    // Clear input immediately
    setInput('');

    // CRITICAL: Reset state for new message
    await messageHandlers.handleUserMessageSent(messageId);

    // Send streaming message
    await messageHandlers.sendStreamingMessage(content, autonomyMode);
    
  } catch (error) {
    console.error('Failed to send message:', error);
    chatManager.setIsLoading(false);
    chatManager.setAiIsGenerating(false);
    addDebugLog('Failed to send message', 'error');
  }
}, [input, signalRClient, isAuthenticated, chatManager, messageHandlers, autonomyMode, addDebugLog]);
```

#### 1.2 Fix Diff Preview Message ID Handling
**File**: `excel-addin/src/hooks/useChatManager.ts`

```typescript
const addMessage = useCallback((message: Partial<EnhancedChatMessage>) => {
  let newMessage: EnhancedChatMessage;
  
  // Preserve IDs for special message types
  const preserveIdTypes = ['diff-preview', 'tool-suggestion', 'batch-operation'];
  const shouldPreserveId = message.type && preserveIdTypes.includes(message.type);
  
  if ('type' in message && message.type) {
    newMessage = {
      id: shouldPreserveId && message.id ? message.id : uuidv4(),
      content: message.content || '',
      timestamp: message.timestamp || new Date(),
      ...message,
    } as EnhancedChatMessage;
  } else {
    // Regular chat message
    newMessage = {
      id: message.id || uuidv4(),
      role: 'role' in message ? message.role : 'assistant',
      content: message.content || '',
      timestamp: new Date(),
      ...message,
    } as EnhancedChatMessage;
  }
  
  setMessages(prev => {
    console.log('[ChatManager] Adding message:', { 
      id: newMessage.id, 
      type: newMessage.type || 'chat',
      role: 'role' in newMessage ? newMessage.role : 'unknown',
      isStreaming: 'isStreaming' in newMessage ? newMessage.isStreaming : false,
      contentLength: 'content' in newMessage ? newMessage.content?.length : 0
    });
    return [...prev, newMessage];
  });
  return newMessage;
}, []);
```

#### 1.3 Implement Auto-Accept for Old Previews
**File**: `excel-addin/src/hooks/useMessageHandlers.ts`

Add to `handleToolRequest`:
```typescript
const handleToolRequest = useCallback(async (toolRequest: any) => {
  // Auto-accept any existing preview before showing new one
  if (pendingPreviewRef.current.size > 0) {
    addDebugLog(`Auto-accepting ${pendingPreviewRef.current.size} pending previews`, 'info');
    
    // Get the first pending preview (should only be one)
    const [requestId] = Array.from(pendingPreviewRef.current.keys());
    
    // Auto-accept it
    await handlePreviewAccept(requestId);
  }
  
  // Continue with existing logic...
}, [handlePreviewAccept, addDebugLog, /* other deps */]);
```

### Phase 2: Streaming Reliability (Day 1-2)

#### 2.1 Add Streaming Message Verification
**File**: `excel-addin/src/hooks/useMessageHandlers.ts`

```typescript
const handleStreamChunk = useCallback((messageId: string, chunk: StreamChunk) => {
  // Verify the streaming message exists
  const streamingMessage = chatManager.messages.find(m => m.id === messageId);
  if (!streamingMessage) {
    console.error('[handleStreamChunk] Streaming message not found:', messageId);
    return;
  }
  
  // Add retry logic for state updates
  const MAX_RETRIES = 3;
  let retryCount = 0;
  
  const updateWithRetry = () => {
    try {
      // Existing chunk handling logic...
    } catch (error) {
      retryCount++;
      if (retryCount < MAX_RETRIES) {
        console.warn(`[handleStreamChunk] Retry ${retryCount} for chunk update`);
        setTimeout(updateWithRetry, 10);
      } else {
        console.error('[handleStreamChunk] Failed after retries:', error);
      }
    }
  };
  
  updateWithRetry();
}, [chatManager]);
```

#### 2.2 Improve Streaming State Management
**File**: `excel-addin/src/components/chat/messages/StreamingMessage.tsx`

```typescript
export const StreamingMessage: React.FC<Props> = ({ message }) => {
  // Use local state to ensure UI updates
  const [localContent, setLocalContent] = useState(message.content);
  
  useEffect(() => {
    setLocalContent(message.content);
  }, [message.content]);
  
  return (
    <div className="flex items-start space-x-3 p-4">
      {/* ... existing UI ... */}
      <div className="flex-1 space-y-2">
        <div className="relative">
          <MessageContent content={localContent} />
          {message.isStreaming && (
            <span className="inline-block ml-1 animate-pulse">▊</span>
          )}
        </div>
        {/* ... tool indicators ... */}
      </div>
    </div>
  );
};
```

### Phase 3: Enhanced Error Handling (Day 2-3)

#### 3.1 Add Comprehensive Error Boundaries
Create error boundary components to catch and log rendering errors without crashing the entire chat interface.

#### 3.2 Add Streaming Health Checks
Implement periodic checks during streaming to ensure:
- Messages are being updated
- No state corruption
- Proper cleanup on errors

### Phase 4: Testing & Validation (Day 3-4)

#### 4.1 Test Scenarios
1. **Basic Streaming**: Simple Q&A without tools
2. **Tool Streaming**: Messages that trigger tool suggestions
3. **Multiple Operations**: Messages generating multiple diff previews
4. **Error Recovery**: Network interruptions, malformed chunks
5. **State Persistence**: Preview state across multiple messages

#### 4.2 Performance Testing
- Measure time to first token
- Monitor React render cycles during streaming
- Check memory usage with long conversations

### Phase 5: UI/UX Improvements (Day 4-5)

#### 5.1 Visual Feedback
- Add streaming progress indicator
- Show chunk count/speed metrics in debug mode
- Improve tool execution animations

#### 5.2 User Controls
- Add "Clear All Previews" button
- Implement preview timeout warnings
- Add streaming speed controls

## Implementation Priority

1. **Critical** (Immediate):
   - Fix `handleUserMessageSent` call
   - Fix diff preview ID handling
   - Implement auto-accept for old previews

2. **High** (Day 1):
   - Add streaming message verification
   - Improve error handling

3. **Medium** (Day 2-3):
   - Enhanced state management
   - Comprehensive testing

4. **Low** (Day 4-5):
   - UI/UX improvements
   - Performance optimizations

## Success Metrics

1. **Streaming Visibility**: 100% of streamed responses show in UI
2. **Preview Resolution**: No lingering preview cards
3. **State Consistency**: Clean state between messages
4. **Error Recovery**: Graceful handling of all error cases
5. **Performance**: <100ms delay for chunk rendering

## Rollback Plan

If fixes cause regression:
1. Revert to non-streaming mode via feature flag
2. Queue tool operations without preview
3. Log all issues for analysis
4. Gradual re-introduction of fixes

This plan addresses all identified issues and provides a clear path to restore full streaming functionality.