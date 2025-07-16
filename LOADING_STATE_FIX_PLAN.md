# Loading State Fix Plan

## Issue Summary
The chat interface shows "AI is analyzing your request..." and "Generating..." indefinitely because loading states are not properly cleared when operations complete or fail.

## Root Causes
1. `setIsLoading(false)` is never called anywhere in the codebase
2. Missing error handling for failed message sends
3. No timeout handling for stuck requests
4. Loading states not cleared on disconnection

## Current State Management

### Loading States
- **isLoading**: Overall loading state (user sends message → all processing complete)
- **aiIsGenerating**: Specific to AI response generation phase

### Current Flow
1. User sends message → `isLoading=true` 
2. Message handler called → `aiIsGenerating=true`
3. AI responds → `aiIsGenerating=false`
4. **BUG**: `isLoading` never set to false

## Comprehensive Fix Implementation

### 1. Fix AI Response Completion Handler
**File**: `/Users/brendantoole/projects2/gridmate/excel-addin/src/hooks/useMessageHandlers.ts`

**Line 228-231**: Update the response completion handler
```typescript
if (response.isComplete) {
  addDebugLog('AI response complete', 'success');
  chatManager.setAiIsGenerating(false);
  chatManager.setIsLoading(false);  // ADD THIS LINE
}
```

### 2. Add Error Handling to Message Send
**File**: `/Users/brendantoole/projects2/gridmate/excel-addin/src/components/chat/RefactoredChatInterface.tsx`

**Line 202-235**: Wrap handleSendMessage in try-catch
```typescript
const handleSendMessage = useCallback(async () => {
  const content = input.trim();
  if (!content || !signalRClient || !isAuthenticated) return;

  const messageId = uuidv4();
  
  try {
    chatManager.addMessage({
      id: messageId,
      role: 'user',
      content,
      timestamp: new Date(),
      type: 'user',
    });
    chatManager.setIsLoading(true);
    setInput('');

    await messageHandlers.handleUserMessageSent(messageId);

    const excelContext = isContextEnabled ? await ExcelService.getInstance().getSmartContext() : null;
    
    await signalRClient.send({
      type: 'chat_message',
      data: {
        messageId,
        content,
        excelContext: {
          worksheet: excelContext?.worksheet,
          workbook: excelContext?.workbook,
          selectedRange: excelContext?.selectedRange,
          activeContext: activeContext.map(c => ({ type: c.type, value: c.value })),
        },
        autonomyMode,
      },
    });
  } catch (error) {
    console.error('Failed to send message:', error);
    chatManager.setIsLoading(false);
    chatManager.setAiIsGenerating(false);
    // Optionally add error message to chat
    chatManager.addMessage({
      id: `error_${Date.now()}`,
      role: 'system',
      content: '❌ Failed to send message. Please check your connection and try again.',
      timestamp: new Date(),
      type: 'error',
    });
  }
}, [/* dependencies */]);
```

### 3. Handle Errors in Message Handler
**File**: `/Users/brendantoole/projects2/gridmate/excel-addin/src/hooks/useMessageHandlers.ts`

**Line 124-127**: Update error handler
```typescript
case 'error':
  console.error('SignalR error:', message.data);
  addDebugLog(`SignalR error: ${message.data}`, 'error');
  chatManager.setIsLoading(false);  // ADD THIS
  chatManager.setAiIsGenerating(false);  // ADD THIS
  break;
```

### 4. Clear Loading on Disconnection
**File**: `/Users/brendantoole/projects2/gridmate/excel-addin/src/components/chat/RefactoredChatInterface.tsx`

Add useEffect to monitor connection status (after line 61):
```typescript
// Clear loading states on disconnection
useEffect(() => {
  if (connectionStatus === 'disconnected') {
    chatManager.setIsLoading(false);
    chatManager.setAiIsGenerating(false);
  }
}, [connectionStatus, chatManager]);
```

### 5. Add Timeout Handler for Stuck Requests
**File**: `/Users/brendantoole/projects2/gridmate/excel-addin/src/hooks/useMessageHandlers.ts`

Add timeout tracking (add to imports and state):
```typescript
const [messageTimeouts, setMessageTimeouts] = useState<Map<string, NodeJS.Timeout>>(new Map());

const handleUserMessageSent = useCallback(async (messageId: string) => {
  addDebugLog(`User message sent handler triggered for ${messageId}`);
  
  // Set loading states
  chatManager.setAiIsGenerating(true);
  
  // Set timeout for stuck requests (60 seconds)
  const timeout = setTimeout(() => {
    addDebugLog(`Message ${messageId} timed out`, 'warning');
    chatManager.setIsLoading(false);
    chatManager.setAiIsGenerating(false);
    chatManager.addMessage({
      id: `timeout_${messageId}`,
      role: 'system',
      content: '⏱️ Request timed out. Please try again.',
      timestamp: new Date(),
      type: 'error',
    });
  }, 60000);
  
  setMessageTimeouts(prev => new Map(prev).set(messageId, timeout));
}, [addDebugLog, chatManager]);

// Clear timeout when response is received
const handleAIResponse = useCallback((response: SignalRAIResponse) => {
  // ... existing code ...
  
  if (response.isComplete) {
    // Clear timeout
    const timeout = messageTimeouts.get(response.messageId);
    if (timeout) {
      clearTimeout(timeout);
      setMessageTimeouts(prev => {
        const newMap = new Map(prev);
        newMap.delete(response.messageId);
        return newMap;
      });
    }
    
    chatManager.setAiIsGenerating(false);
    chatManager.setIsLoading(false);
  }
  
  // ... rest of existing code ...
}, [/* dependencies including messageTimeouts */]);
```

### 6. Handle Final AI Response
**File**: `/Users/brendantoole/projects2/gridmate/excel-addin/src/hooks/useMessageHandlers.ts`

Ensure we handle the `isFinal` flag properly (around line 225):
```typescript
const handleAIResponse = useCallback((response: SignalRAIResponse) => {
  addDebugLog(`AI response received: ${response.content.substring(0, 50)}...`);
  
  // Check both isComplete and isFinal flags
  if (response.isComplete || response.isFinal) {
    addDebugLog('AI response complete', 'success');
    chatManager.setAiIsGenerating(false);
    chatManager.setIsLoading(false);
  }
  
  // ... rest of existing code ...
}, [/* dependencies */]);
```

## Testing Plan

1. **Normal Flow**: Send message → Verify loading states clear when AI responds
2. **Error Cases**: 
   - Disconnect network → Send message → Verify error handling
   - Stop backend → Send message → Verify timeout
3. **Reconnection**: Disconnect → Reconnect → Verify states reset
4. **Multiple Messages**: Send multiple messages rapidly → Verify each clears properly

## Additional Improvements

1. Consider consolidating `isLoading` and `aiIsGenerating` into a single state with values:
   - `idle`
   - `sending`
   - `generating`
   - `error`

2. Add a loading state manager service to centralize all loading state logic

3. Consider adding a "retry" button when messages fail

## Implementation Order

1. Fix AI response handler (most critical)
2. Add error handling to message send
3. Handle disconnection states
4. Add timeout handling
5. Test thoroughly

This fix will ensure loading states are properly managed throughout the entire message lifecycle.