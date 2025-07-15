# Implementation Plan: Autonomy Mode Switching Fix (v2)

## 1. The Problem: Stale Client-Side State

The root cause of the bug where the autonomy mode is not updated correctly after being switched is a **stale closure** in the client-side SignalR event handler.

*   **File:** `excel-addin/src/components/chat/EnhancedChatInterfaceWithSignalR.tsx`
*   **Symptom:** A user switches the mode from `YOLO` to `Default`, but subsequent tool requests from the AI are still executed automatically as if the mode were still `YOLO`.
*   **Root Cause:** The `on('message', ...)` event listener for SignalR is registered once when the component mounts. This listener's callback function captures the initial state of `handleToolRequest`, which in turn captures the initial `autonomyMode`. When the mode is changed in the UI, the listener, still holding a reference to the old function, processes new `tool_request` events using the old, stale `autonomyMode` value.

---

## 2. Alignment with Industry Best Practices

The provided research on Cursor, Cline, and Roo Code confirms the architectural approach we should be taking. The key principles are:

1.  **Mode as a "Frame", Not a "Reset":** Switching modes should not clear the chat history. It should only change the parameters for the *next* interaction with the AI and the rules for how the UI handles the AI's response.
2.  **Outgoing Request Framing:** The currently selected `autonomyMode` must be sent to the backend with every user message. This allows the LLM to adjust its persona and the tools it chooses to use. Our application **already does this correctly** in the `handleSendMessage` function, which includes `autonomyMode` in the payload.
3.  **Incoming Response Handling:** The UI must use the currently selected `autonomyMode` to decide how to handle responses from the AI (e.g., a `tool_request`). This is where our current bug lies.

The fix outlined below will bring our application's incoming response handling in line with these best practices, ensuring the entire round-trip is state-aware.

---

## 3. The Solution: Using a Ref to Access Current State

The most effective and idiomatic React solution is to use a `useRef` hook. A ref provides a mutable container that persists for the entire lifecycle of the component. We can use it to ensure the event handler always has access to the latest functions and state, breaking the stale closure without needing to re-register the SignalR listener.

---

## 4. Implementation Plan

The fix involves three targeted steps within `EnhancedChatInterfaceWithSignalR.tsx`.

### Step 4.1: Stabilize Callbacks with `useCallback`

First, we must ensure our handler functions are not recreated on every render unless their dependencies change. This is a prerequisite for the fix and a performance best practice.

*   **File to Edit:** `excel-addin/src/components/chat/EnhancedChatInterfaceWithSignalR.tsx`
*   **Action:** Wrap the `handleToolRequest`, `executeToolRequest`, and `rejectToolRequest` functions in a `useCallback` hook. Their dependency arrays must include all the state variables and functions they rely on.

```typescript
// Example for handleToolRequest
const handleToolRequest = useCallback(async (toolRequest: any) => {
  // ... function logic ...
}, [autonomyMode, addDebugLog, executeToolRequest, rejectToolRequest]); // Add ALL dependencies here

// Example for executeToolRequest
const executeToolRequest = useCallback(async (toolRequest: any) => {
    // ... function logic ...
}, [autonomyMode, addDebugLog, addToLog]); // And so on...
```

### Step 4.2: Create a Ref to Hold the Stable Callback

We will create a ref that will always point to the most up-to-date version of our `handleToolRequest` callback.

*   **File to Edit:** `excel-addin/src/components/chat/EnhancedChatInterfaceWithSignalR.tsx`
*   **Action:**
    1.  Create the ref near the top of the component: `const handleToolRequestRef = useRef(handleToolRequest);`
    2.  Use a `useEffect` hook to update the ref's `current` property whenever the `handleToolRequest` callback is recreated (i.e., when its dependencies like `autonomyMode` change).

```typescript
// Add this near the top of the component
const handleToolRequestRef = useRef(handleToolRequest);

// Add this useEffect to keep the ref updated
useEffect(() => {
  handleToolRequestRef.current = handleToolRequest;
}, [handleToolRequest]);
```

### Step 4.3: Update the SignalR Event Listener

Finally, modify the SignalR `on('message')` handler to call the function *from the ref*, which is guaranteed to be the latest version.

*   **File to Edit:** `excel-addin/src/components/chat/EnhancedChatInterfaceWithSignalR.tsx`
*   **Action:** Locate the `useEffect` hook that initializes the SignalR client and modify the `on('message')` callback.

```typescript
// Find this block inside the SignalR initialization useEffect
signalRClient.current.on('message', (data: any) => {
  // ... other message types
  if (data.type === 'tool_request') {
    // OLD CODE:
    // handleToolRequest(data.data)

    // NEW CODE:
    handleToolRequestRef.current(data.data);
  }
  // ... other message types
});
```

---

## 5. Verification

After implementing these changes, the system must be tested to confirm the fix:

1.  **Start Session in Default Mode:** Send a message that triggers a `write_range` tool. Confirm it is queued for approval.
2.  **Switch to YOLO Mode:** Use the UI to switch to YOLO mode.
3.  **Test YOLO Mode:** Send the same message again. Confirm the `write_range` tool executes *immediately* without approval.
4.  **Switch Back to Default Mode:** Use the UI to switch back to Default mode.
5.  **Test Default Mode Again:** Send the message one more time. Confirm the `write_range` tool is once again correctly queued for approval.

This plan will resolve the stale state issue and ensure that the autonomy mode selected in the UI is always respected by the application, aligning our architecture with industry best practices.