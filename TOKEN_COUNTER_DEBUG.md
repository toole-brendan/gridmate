# Token Counter UI Bug: Detailed Analysis

## 1. Problem Summary

The token counter, which should display token usage in the chat interface (e.g., "X / 200,000 tokens"), is not appearing in the UI. This feature was intended to be implemented according to `TOKEN_COUNTER_SIMPLE_PLAN.md`.

## 2. Investigation and Data Flow

The investigation traced the `tokenUsage` data from its origin in the backend to its final destination in the frontend UI component.

The intended data flow is as follows:

1.  **Backend:** The Go backend's AI service calculates token usage.
2.  **Backend Handler:** `backend/internal/handlers/signalr_handler.go` receives the `tokenUsage` data and attaches it to the AI response payload sent over SignalR.
3.  **SignalR Message:** A message with `type: 'ai_response'` is sent to the frontend, containing the `tokenUsage` data.
4.  **Frontend Handler:** The `excel-addin/src/hooks/useMessageHandlers.ts` hook receives the SignalR message. Its `handleSignalRMessage` function routes the payload to `handleAIResponse`.
5.  **Frontend State:** The `handleAIResponse` function extracts `tokenUsage` from the payload and calls the `onTokenUsage` callback. This updates the `tokenUsage` state in the main `RefactoredChatInterface.tsx` component.
6.  **Frontend UI:** The `tokenUsage` state is passed as a prop to `EnhancedChatInterface.tsx`, which in turn passes it to `TokenCounter.tsx`.
7.  **Frontend Render:** The `TokenCounter.tsx` component renders the UI, but only if the `tokenUsage` prop is not `null`.

The UI is not appearing because the `tokenUsage` state in the frontend remains `null`. This is due to a structural mismatch between the JSON payload sent by the backend and the structure the frontend expects.

## 3. Root Cause Analysis

The core issue lies in a subtle inconsistency in the data structure of the AI response message sent from `backend/internal/handlers/signalr_handler.go`.

### Frontend Expectation (`excel-addin/src/hooks/useMessageHandlers.ts`)

The frontend's message handler, `handleAIResponse`, processes the `data` portion of the incoming SignalR message. It expects to find both a `type` field (to distinguish between message types like 'completion') and the `tokenUsage` field within the same object.

Here is the relevant logic:

```typescript
// File: excel-addin/src/hooks/useMessageHandlers.ts

const handleAIResponse = useCallback((response: SignalRAIResponse) => {
  // (1) It checks for tokenUsage on the 'response' object it receives.
  if (response.tokenUsage && onTokenUsage) {
    onTokenUsage(response.tokenUsage);
  }
  
  // (2) It ALSO checks for a 'type' field on the SAME 'response' object.
  if (response.type === 'completion') {
    // ... handles completion messages
    return; 
  }
  
  // ... handles regular streaming messages
}, [/* ... */]);
```

This code implies that the `response` object (which is `message.data` from the SignalR message) should contain both `tokenUsage` and `type` as sibling properties.

### Backend Payload (`backend/internal/handlers/signalr_handler.go`)

The backend correctly sends a `type: "completion"` field for completion messages, but it **fails to send a `type` field** for regular AI responses.

**Correct `completion` message payload:**
```go
// File: backend/internal/handlers/signalr_handler.go

// This payload correctly includes a 'type' field.
finalResponse := map[string]interface{}{
    "messageId":         req.MessageID,
    "content":           completionMessage,
    "isComplete":        true,
    "operationsSummary": opsSummary,
    "type":              "completion", // Correctly included
}
h.signalRBridge.SendAIResponse(req.SessionID, finalResponse)
```

**Incorrect `ai_response` message payload:**
```go
// File: backend/internal/handlers/signalr_handler.go

// This payload is MISSING the 'type' field.
err = h.signalRBridge.SendAIResponse(req.SessionID, map[string]interface{}{
    "messageId":  req.MessageID,
    "content":    response.Content,
    "actions":    response.Actions,
    "isComplete": response.IsFinal && !hasQueuedOps,
    "tokenUsage": response.TokenUsage,
    // "type": "ai_response" is missing here!
})
```

Because the `type` field is missing, the frontend's `handleAIResponse` function receives a payload that it cannot properly distinguish, and the `tokenUsage` data is effectively ignored.

## 4. Proposed Solution

To fix this bug, the backend payload for regular AI responses must be updated to include `"type": "ai_response"`. This makes its structure consistent with the `completion` message and aligns it with the frontend's expectations.

### File to Modify:
`backend/internal/handlers/signalr_handler.go`

### Change Details:

**FROM (Original Code):**
```go
// Send response back to client via SignalR
err = h.signalRBridge.SendAIResponse(req.SessionID, map[string]interface{}{
    "messageId":  req.MessageID, // Include the message ID from the request
    "content":    response.Content,
    "actions":    response.Actions,
    "isComplete": response.IsFinal && !hasQueuedOps, // Only mark as complete if no operations are queued
    "tokenUsage": response.TokenUsage, // Add token usage data
})
```

**TO (Corrected Code):**
```go
// Send response back to client via SignalR
err = h.signalRBridge.SendAIResponse(req.SessionID, map[string]interface{}{
    "type":       "ai_response", // Add type to distinguish from other messages
    "messageId":  req.MessageID, // Include the message ID from the request
    "content":    response.Content,
    "actions":    response.Actions,
    "isComplete": response.IsFinal && !hasQueuedOps, // Only mark as complete if no operations are queued
    "tokenUsage": response.TokenUsage, // Add token usage data
})
```

By adding the `"type": "ai_response"` line, the frontend will correctly identify the message type, process its content, and extract the `tokenUsage` data, causing the token counter to appear and function as intended.
