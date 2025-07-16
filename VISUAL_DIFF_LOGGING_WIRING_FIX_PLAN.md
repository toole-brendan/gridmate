# Plan: Fix Visual Diff Logging Wiring

**Status:** Proposed
**Last Updated:** 2025-07-16

## 1. Objective

The previous attempt to restore visual diff logging failed because the implementation used an incorrect logging utility (`logStore.ts`) instead of the `addLog` action provided by the `useDiffSessionStore`. This resulted in logs being generated but never appearing in the UI's debug panel.

This plan provides a precise, step-by-step guide to correctly wire the logging from the visual diff engine to the UI by replacing the incorrect logger with the correct one.

## 2. Root Cause Analysis

The investigation of `useDiffPreview.ts` and `useMessageHandlers.ts` revealed the following critical error:

-   **Incorrect Import:** The files import a `log` function from `/excel-addin/src/store/logStore.ts`.
-   **Correct Mechanism:** The UI's debug panel is populated by the `logs` array within the `useDiffSessionStore`. The correct way to add logs is to call the `addLog` action from this store.

The implemented code logs to a separate, disconnected store, making the logs invisible to the user.

## 3. Detailed Implementation Plan

This plan involves modifying three key files to remove the incorrect `log` import and use the `addLog` action from the Zustand store.

### Step 1: Modify `useDiffSessionStore.ts` to Expose `addLog`

The store already has the `addLog` action, but we will ensure it's correctly defined and accessible.

*   **File:** `/Users/brendantoole/projects2/gridmate/excel-addin/src/store/useDiffSessionStore.ts`
*   **Action:** Verify the `addLog` action is correctly defined within the `actions` slice of the store. No changes are likely needed here, but it's the foundation for the fix.

*   **Ensure this code exists:**
    ```typescript
    // Inside the create store call
    addLog: (type: LogType, message: string, data?: Record<string, any>) => {
      set((state) => ({
        logs: [...state.logs, { type, message, timestamp: new Date(), data }],
      }));
    },
    ```

### Step 2: Correct Logging in `useDiffPreview.ts`

This is the most critical file. We will replace all calls to `log()` with `actions.addLog()`.

*   **File:** `/Users/brendantoole/projects2/gridmate/excel-addin/src/hooks/useDiffPreview.ts`
*   **Actions:**
    1.  Remove the incorrect import of `log`.
    2.  Use the `actions.addLog` function that is already available in the hook's scope from `useDiffSessionStore`.
    3.  The `addLog` function expects `(type, message, data)`. The current `log` function uses `(category, message, data)`. We will map the category `'visual-diff'` to the type `'info'` or another appropriate type. For simplicity, we'll use `'info'` for most logs and `'error'` for errors.

*   **Code Modifications:**

    1.  **Remove the incorrect import:**
        ```typescript
        // REMOVE THIS LINE
        import { log } from '../store/logStore';
        ```

    2.  **Replace all calls to `log('visual-diff', ...)` with `actions.addLog('info', ...)`:**

        *   **Example 1 (from `startPreviewSession`):**
            ```typescript
            // REPLACE THIS:
            log('visual-diff', `[Diff Preview] Starting new preview session ${sessionId} for message ${messageId}`);
            // WITH THIS:
            actions.addLog('info', `[Diff Preview] Starting new preview session ${sessionId} for message ${messageId}`);
            ```

        *   **Example 2 (with data):**
            ```typescript
            // REPLACE THIS:
            log('visual-diff', '[Diff Preview] Snapshot created successfully', { 
              cellCount: Object.keys(snapshot.cells || {}).length 
            });
            // WITH THIS:
            actions.addLog('info', '[Diff Preview] Snapshot created successfully', { 
              cellCount: Object.keys(snapshot.cells || {}).length 
            });
            ```
        
        *   **Example 3 (error logging):**
            ```typescript
            // REPLACE THIS:
            log('visual-diff', `[Diff Preview] Error starting preview session: ${(error as Error).message}`);
            // WITH THIS:
            actions.addLog('error', `[Diff Preview] Error starting preview session: ${(error as Error).message}`);
            ```

    *   **Apply this replacement pattern to every `log('visual-diff', ...)` call within the file.**

### Step 3: Correct Logging in `useMessageHandlers.ts`

This file also uses the incorrect logger.

*   **File:** `/Users/brendantoole/projects2/gridmate/excel-addin/src/hooks/useMessageHandlers.ts`
*   **Actions:**
    1.  Remove the incorrect import of `log`.
    2.  Get the `addLog` function from the `useDiffSessionStore`.
    3.  Replace all calls to `log()` with `addLog()`.

*   **Code Modifications:**

    1.  **Remove the incorrect import:**
        ```typescript
        // REMOVE THIS LINE
        import { log } from '../store/logStore';
        ```

    2.  **Get the `addLog` function:**
        ```typescript
        // Inside the useMessageHandlers hook
        const { addLog } = useDiffSessionStore((state) => state.actions);
        ```

    3.  **Replace all calls to `log(...)` with `addLog(...)`:**

        *   **Example 1:**
            ```typescript
            // REPLACE THIS:
            log('visual-diff', `[Message Handler] Received tool request ${toolRequest.request_id} (${toolRequest.tool})`, { parameters: toolRequest.parameters });
            // WITH THIS:
            addLog('info', `[Message Handler] Received tool request ${toolRequest.request_id} (${toolRequest.tool})`, { parameters: toolRequest.parameters });
            ```
        
        *   **Example 2:**
             ```typescript
            // REPLACE THIS:
            log('general', `[Message Handler] User sent new message ${messageId}`);
            // WITH THIS:
            addLog('info', `[Message Handler] User sent new message ${messageId}`);
            ```

    *   **Apply this replacement pattern to every `log(...)` call within the file, mapping the first argument to a valid `LogType` ('info', 'error', 'success', 'warning').**

## 4. Verification Plan

1.  **Implement the code changes** as specified above.
2.  **Run the application** and connect to Excel.
3.  **Open the Debug UI** in the chat interface.
4.  **Give the AI a multi-step command** to trigger the visual diff process.
5.  **Observe the `Visual Diff Logs` section** in real-time.
6.  **Verify that logs now appear** for each step of the process: session start, snapshot, simulation, highlighting, etc. The logs should provide a complete trace of the live preview generation.
7.  **Confirm** that the `Debug Logs` section still correctly shows the SignalR message logs, and the `Visual Diff Logs` now show the detailed preview engine logs.
