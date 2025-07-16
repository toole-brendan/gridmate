# Plan: Visual Diff Logging Repair

**Status:** Proposed
**Last Updated:** 2025-07-16

## 1. Objective

This plan outlines the precise steps to repair the visual diff logging system. Based on recent debugging output, it's clear that the detailed logs from the live preview engine are not being displayed in the UI's debug panel. This issue appears to be a regression that occurred after the implementation of the `LIVE_VISUAL_DIFF_IMPLEMENTATION_PLAN`.

The goal is to correctly wire the logging from the new hooks (`useDiffPreview.ts`, `useMessageHandlers.ts`) to the central `useDiffSessionStore`, ensuring that all visual diff logs are visible in the UI for effective debugging.

## 2. Root Cause Analysis

The debugging output shows that the `Visual Diff Logs` section is empty, while the `Debug Logs` section is populated with SignalR message information. This strongly indicates that the visual diff engine is using a separate, disconnected logging mechanism instead of the one the UI is subscribed to.

The likely cause, as identified in previous fixes, is that the new hooks are importing and using a standalone `log` utility from a file like `logStore.ts` instead of the `addLog` action provided by the `useDiffSessionStore`. The UI's debug panel is powered by the state within `useDiffSessionStore`, so any logs sent elsewhere will not appear.

## 3. Detailed Implementation Plan

This plan involves modifying the key hooks responsible for the visual diff process to use the correct logging action.

### Step 1: Verify `useDiffSessionStore.ts`

First, we'll confirm that the `useDiffSessionStore` correctly defines and exposes the `addLog` action. This is the foundation of the fix.

*   **File:** `/Users/brendantoole/projects2/gridmate/excel-addin/src/store/useDiffSessionStore.ts`
*   **Action:** No changes are expected, but we must verify that the `addLog` action is present and correctly structured within the `actions` slice of the Zustand store.

*   **Code to Verify:**
    ```typescript
    // Inside the create store call
    addLog: (type: LogType, message: string, data?: Record<string, any>) => {
      set((state) => ({
        logs: [...state.logs, { type, message, timestamp: new Date(), data }],
      }));
    },
    ```

### Step 2: Correct Logging in `useDiffPreview.ts`

This is the core of the fix. This hook manages the preview session and is the source of most of the missing logs. We will replace all incorrect logging calls with the correct `addLog` action.

*   **File:** `/Users/brendantoole/projects2/gridmate/excel-addin/src/hooks/useDiffPreview.ts`
*   **Actions:**
    1.  Remove the incorrect import of the `log` utility (e.g., `import { log } from '../store/logStore';`).
    2.  The hook already uses `useDiffSessionStore`, so the `actions.addLog` function is already in scope.
    3.  Find every instance of `log('visual-diff', ...)` and replace it with `actions.addLog(...)`.
    4.  Map the old log category to the new `LogType` enum. We will map `'visual-diff'` to `'info'` for standard logs and use `'error'` for logging errors.

*   **Code Modification Examples:**

    *   **Remove Import:**
        ```diff
        - import { log } from '../store/logStore';
        ```

    *   **Replace Logging Calls:**
        ```diff
        // In startPreviewSession function
        - log('visual-diff', `[Diff Preview] Starting new preview session ${sessionId} for message ${messageId}`);
        + actions.addLog('info', `[Diff Preview] Starting new preview session ${sessionId} for message ${messageId}`);

        // When logging with data
        - log('visual-diff', '[Diff Preview] Snapshot created successfully', { cellCount: Object.keys(snapshot.cells || {}).length });
        + actions.addLog('info', '[Diff Preview] Snapshot created successfully', { cellCount: Object.keys(snapshot.cells || {}).length });

        // When logging an error
        - log('visual-diff', `[Diff Preview] Error starting preview session: ${(error as Error).message}`);
        + actions.addLog('error', `[Diff Preview] Error starting preview session: ${(error as Error).message}`);
        ```
    *   **This replacement pattern must be applied to all `log` calls in the file.**

### Step 3: Correct Logging in `useMessageHandlers.ts`

This hook handles incoming SignalR messages and initiates the preview process. It also contains incorrect logging calls that need to be fixed.

*   **File:** `/Users/brendantoole/projects2/gridmate/excel-addin/src/hooks/useMessageHandlers.ts`
*   **Actions:**
    1.  Remove the incorrect import of the `log` utility.
    2.  This hook already uses `useDiffSessionStore`, so we just need to ensure the `addLog` action is destructured from the store's actions.
    3.  Replace all calls to `log(...)` with `addLog(...)`, mapping the log category to the appropriate `LogType`.

*   **Code Modification Examples:**

    *   **Remove Import:**
        ```diff
        - import { log } from '../store/logStore';
        ```

    *   **Ensure `addLog` is available:**
        ```typescript
        // Inside the useMessageHandlers hook
        const { addLog } = useDiffSessionStore((state) => state.actions);
        ```

    *   **Replace Logging Calls:**
        ```diff
        // When handling a tool request
        - log('visual-diff', `[Message Handler] Received tool request ${toolRequest.request_id} (${toolRequest.tool})`, { parameters: toolRequest.parameters });
        + addLog('info', `[Message Handler] Received tool request ${toolRequest.request_id} (${toolRequest.tool})`, { parameters: toolRequest.parameters });

        // When handling a user message
        - log('general', `[Message Handler] User sent new message ${messageId}`);
        + addLog('info', `[Message Handler] User sent new message ${messageId}`);
        ```
    *   **This replacement pattern must be applied to all `log` calls in the file.**

## 4. Verification Plan

1.  **Implement** the code changes as specified in this plan.
2.  **Run the application** (`./start-dev.sh`) and connect to Excel.
3.  **Open the Debug UI** in the chat interface to view the log panels.
4.  **Issue a multi-step command** to the AI that will trigger multiple `write` or `format` operations (e.g., "Create a table with headers A, B, C in A1:C1 and add 5 rows of dummy data").
5.  **Observe** the `Visual Diff Logs` panel in the Debug UI.
6.  **Verify** that the panel now populates in real-time with detailed logs from the diff engine, including session start, snapshot creation, operation simulation, and highlighting steps.
7.  **Confirm** that the `Debug Logs` (for SignalR messages) and `Visual Diff Logs` are both populating correctly, providing a complete picture of the application's state.
