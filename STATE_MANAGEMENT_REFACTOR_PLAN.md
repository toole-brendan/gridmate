# State Management Refactor Plan

## 1. Introduction & Goal

The latest logs reveal a critical flaw in how the application manages the state of the visual diff preview session. The use of a local `useRef` (`isLivePreviewActiveRef`) in `useMessageHandlers.ts` is out of sync with the global Zustand store (`useDiffSessionStore`), causing a race condition. This results in the application attempting to update a preview session that hasn't been properly initiated, leading to the "No snapshot available" warning and a fatal crash.

The goal of this plan is to refactor the state management to use the global store as the **single source of truth**, eliminating the local state and the race condition it creates.

## 2. Problem Analysis

The core of the problem lies in this sequence of events:
1.  A `tool_request` for a write operation arrives.
2.  `useMessageHandlers.ts` checks its local `isLivePreviewActiveRef`. It's `false`.
3.  It correctly calls `diffPreview.startPreviewSession()` and sets `isLivePreviewActiveRef.current = true`.
4.  `startPreviewSession` begins the **asynchronous** process of taking a workbook snapshot.
5.  **Before the snapshot is complete**, another `tool_request` for the same user message arrives.
6.  `useMessageHandlers.ts` checks `isLivePreviewActiveRef`. It's now `true`.
7.  It calls `diffPreview.updatePreview()`.
8.  `updatePreview` looks for the snapshot in the `useDiffSessionStore`, but it doesn't exist yet because the `startPreviewSession` call from step 3 hasn't finished.
9.  The "No snapshot available" warning is logged, and the application crashes when it tries to process a `null` snapshot.

The local `isLivePreviewActiveRef` gives a misleading picture of the application's true state. The only reliable indicator of a ready-to-update session is the actual presence of a snapshot in the global store.

## 3. Proposed Solution

This solution will refactor the code to rely solely on the `useDiffSessionStore` for state management.

### Step 1: Remove Local State from `useMessageHandlers.ts`

We will eliminate the `isLivePreviewActiveRef` and derive the session status directly from the global store.

**File to Modify:** `/Users/brendantoole/projects2/gridmate/excel-addin/src/hooks/useMessageHandlers.ts`

**Actions:**
1.  Remove the `const isLivePreviewActiveRef = useRef(false);` line entirely.
2.  Inside the `handleToolRequest` function, replace the check `if (!isLivePreviewActiveRef.current)` with a check against the global store. The new logic will be:
    ```typescript
    // Get the live snapshot directly from the store to check session status
    const { liveSnapshot } = useDiffSessionStore.getState();

    const operation: AISuggestedOperation = { 
      tool: toolRequest.tool, 
      input: toolRequest,
      description: `Execute ${toolRequest.tool}`
    };

    if (!liveSnapshot) {
      addDebugLog('No active session found. Starting new preview session.');
      addLog('info', `[Message Handler] Starting new preview session for message ${currentMessageIdRef.current || 'unknown'}`);
      // IMPORTANT: Do NOT await this call. Let it run in the background.
      // Awaiting it creates the race condition. The UI will update reactively.
      diffPreview.startPreviewSession(operation, currentMessageIdRef.current || 'unknown');
    } else {
      addDebugLog('Active session found. Updating existing preview session.');
      addLog('info', `[Message Handler] Updating existing preview session with new operation`);
      await diffPreview.updatePreview(operation, currentMessageIdRef.current || 'unknown');
    }
    ```
3.  In the `handleAIResponse` function, remove the line `isLivePreviewActiveRef.current = false;`. The session state will now be managed by the `endSession` action in the store.

### Step 2: Ensure Session is Cleared Correctly

The `useDiffSessionStore` must have a reliable way to clear its state when a session ends. The `endSession` action already exists, we just need to ensure it's called.

**File to Modify:** `/Users/brendantoole/projects2/gridmate/excel-addin/src/hooks/useDiffPreview.ts`

**Actions:**
1.  Review the `applyChanges` and `cancelPreview` functions.
2.  Confirm that `actions.endSession()` is called in both functions. This action should reset the `liveSnapshot` to `null`, which is the key to our new logic.

**File to Modify:** `/Users/brendantoole/projects2/gridmate/excel-addin/src/store/useDiffSessionStore.ts`

**Actions:**
1.  Review the `endSession` action.
2.  Ensure that it sets `liveSnapshot: null` and `pendingOperations: []`. This is critical for the logic in `useMessageHandlers` to work correctly.

### Step 3: Add Robustness to `updatePreview`

Even with the new logic, as a defensive measure, `updatePreview` should not crash if it's called without a snapshot.

**File to Modify:** `/Users/brendantoole/projects2/gridmate/excel-addin/src/hooks/useDiffPreview.ts`

**Actions:**
1.  At the beginning of the `updatePreview` function, add a guard clause:
    ```typescript
    const currentSnapshot = baseSnapshot ?? useDiffSessionStore.getState().liveSnapshot;
    if (!currentSnapshot) {
      actions.addLog('error', '[Diff Preview] updatePreview called without a snapshot. This should not happen. Aborting update.');
      // Attempt to recover by starting a new session
      // This prevents a crash if the logic ever fails.
      await startPreviewSession(newOperation, messageId);
      return;
    }
    ```
    This makes the system more resilient. Instead of crashing, it will log a critical error and attempt to self-heal by starting a new session.

## 4. Verification Strategy

1.  **Run the application and trigger a multi-step write operation.**
    - **Expected Result:** The application should correctly start a preview session on the first write tool, and then update it with all subsequent write tools. The "No snapshot available" warning should be gone, and the application should not crash.
2.  **Inspect the console logs.**
    - **Expected Result:** The logs should show "No active session found. Starting new preview session" for the first write tool, and "Active session found. Updating existing preview session" for all subsequent tools in the same AI response.
3.  **Complete a session.**
    - Click "Apply" or "Cancel".
    - **Expected Result:** The session should end, and the snapshot should be cleared from the store.
4.  **Start a new operation immediately after.**
    - **Expected Result:** The system should correctly identify that there is no active session and start a new one, proving that the state was reset properly.
