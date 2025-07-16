# Plan: Visual Diff Logging Restoration and Enhancement

**Status:** Proposed
**Last Updated:** 2025-07-16

## 1. Objective

The recent implementation of the "Live Visual Diff" feature, while functionally successful, inadvertently broke the logging mechanism for the entire visual diff process. The debug output from a real-world test confirms that no logs are generated between the start of a diff session and the final bulk approval.

This plan details the necessary steps to restore and enhance logging for the new, hook-based visual diff architecture. The goal is to provide complete visibility into the live preview lifecycle, from session creation to final application or cancellation, to aid in future debugging and development.

## 2. Problem Analysis

The root cause of the missing logs is that the refactoring introduced a new set of hooks (`useDiffPreview`, `useMessageHandlers`) and services (`diffSimulator`) that were never integrated with the logging functionality of the central state store, `useDiffSessionStore`.

The `useDiffSessionStore` already contains the state and actions for managing logs (`logs`, `addLog`), but these are not being called from any of the new modules responsible for the live preview process. The only existing log entry is a test message, indicating the logging system itself works but is simply not being used.

## 3. Proposed Solution

The solution is to systematically instrument the new visual diff engine with logging calls to the central `useDiffSessionStore`. This involves:

1.  **Accessing the `addLog` function:** In each relevant hook and utility, get access to the `addLog` function from the `useDiffSessionStore`.
2.  **Adding Granular Log Entries:** Insert log entries at every critical step of the visual diff lifecycle. This includes session management, workbook snapshotting, operation simulation, highlight rendering, and error handling.
3.  **Enhancing Log Content:** Ensure log messages are descriptive and include relevant context, such as operation IDs, ranges, and performance timings where applicable.

This will be accomplished by modifying the key files of the new architecture to call the `addLog` function at the appropriate points.

## 4. Detailed Implementation Plan

### Step 1: Instrument `useMessageHandlers.ts`

This hook is the entry point where `tool_request` messages are processed and sent to the diff engine. It needs to log the start of the process.

*   **File:** `/Users/brendantoole/projects2/gridmate/excel-addin/src/hooks/useMessageHandlers.ts`
*   **Actions:**
    1.  Inside the `handleToolRequestMessage` function, just before calling `diffPreview.addOperation(toolRequest)`, add a log entry.
    2.  This will require accessing the `addLog` function from the `useDiffSessionStore`.

*   **Code Example:**
    ```typescript
    // At the top of useMessageHandlers.ts
    import { useDiffSessionStore } from '../store/useDiffSessionStore';

    // Inside the hook
    const addLog = useDiffSessionStore((state) => state.addLog);

    // Inside handleToolRequestMessage, before calling diffPreview.addOperation
    addLog('info', `[Message Handler] Received tool request ${toolRequest.request_id}. Queueing for preview.`);
    ```

### Step 2: Instrument `useDiffPreview.ts` (Core Engine)

This is the most critical file to instrument, as it manages the entire preview session.

*   **File:** `/Users/brendantoole/projects2/gridmate/excel-addin/src/hooks/useDiffPreview.ts`
*   **Actions:**
    1.  Get the `addLog` function from the `useDiffSessionStore`.
    2.  **`addOperation` function:**
        *   Log when the function is called.
        *   Log whether a new session is being started or an existing one is being used.
        *   Log the result of the `takeWorkbookSnapshot` call (success or failure).
    3.  **`processQueue` function:**
        *   Log when the queue processing starts.
        *   For each operation, log the start and end of its simulation, including the operation ID and tool name.
        *   Log the result of the `diffSimulator.simulateOperation` call.
        *   Log when `GridVisualizer.applyHighlightsBatched` is called and how many highlights are being applied.
    4.  **`applyChanges` function:**
        *   Log when the user clicks "Apply".
        *   Log the result of the `Excel.run` call.
    5.  **`cancelChanges` function:**
        *   Log when the user clicks "Cancel".
        *   Log the result of the `restoreWorkbook` call.
    6.  **Error Handling:**
        *   In every `catch` block within the hook, add a detailed error log.

*   **Code Examples:**
    ```typescript
    // Inside addOperation
    addLog('info', `[Diff Preview] Starting new preview session ${sessionId}.`);
    addLog('info', `[Diff Preview] Taking workbook snapshot...`);
    const snapshot = await takeWorkbookSnapshot();
    if (snapshot) {
      addLog('success', `[Diff Preview] Snapshot created successfully.`);
    } else {
      addLog('error', `[Diff Preview] Failed to create workbook snapshot.`);
    }

    // Inside processQueue
    addLog('info', `[Diff Preview] Simulating operation ${operation.request_id} (${operation.tool})...`);
    const simulationResult = await diffSimulator.simulateOperation(...);
    if (simulationResult.success) {
      addLog('success', `[Diff Preview] Simulation for ${operation.request_id} succeeded.`);
    } else {
      addLog('error', `[Diff Preview] Simulation for ${operation.request_id} failed: ${simulationResult.error}`);
    }
    ```

### Step 3: Instrument `diffSimulator.ts`

This utility performs the core simulation logic. It's important to log the internal steps here.

*   **File:** `/Users/brendantoole/projects2/gridmate/excel-addin/src/utils/diffSimulator.ts`
*   **Actions:**
    1.  The `simulateOperation` function should accept `addLog` as an argument.
    2.  Log the specific parameters being used for the simulation (e.g., range, formula, format).
    3.  Log the outcome of the internal `excelContext.workbook.internalTest_applyChange` call.

*   **Code Example:**
    ```typescript
    // Modify function signature
    export const simulateOperation = async (
      excelContext: Excel.RequestContext,
      snapshot: WorkbookSnapshot,
      operation: SignalRToolRequest,
      addLog: (type: LogType, message: string) => void
    ): Promise<SimulationResult> => {
      // ...
      try {
        addLog('info', `[Simulator] Applying tool: ${operation.tool} to range ${operation.range}`);
        // ... simulation logic ...
        addLog('success', `[Simulator] Internal applyChange successful for ${operation.request_id}.`);
      } catch (error) {
        addLog('error', `[Simulator] Simulation failed for ${operation.request_id}: ${error.message}`);
        // ...
      }
    }
    ```

### Step 4: Instrument `GridVisualizer.ts`

This service handles rendering the highlights on the grid. It's useful to log performance metrics here.

*   **File:** `/Users/brendantoole/projects2/gridmate/excel-addin/src/services/diff/GridVisualizer.ts`
*   **Actions:**
    1.  The `applyHighlightsBatched` function should accept `addLog` as an argument.
    2.  Log the start of the batch application.
    3.  Log the number of highlights being applied.
    4.  Log the time taken to complete the operation to monitor for performance issues.

*   **Code Example:**
    ```typescript
    // Modify function signature
    public static async applyHighlightsBatched(
      highlights: Highlight[],
      addLog: (type: LogType, message: string) => void
    ) {
      addLog('info', `[Visualizer] Applying ${highlights.length} highlights in a batch.`);
      const startTime = performance.now();
      // ... highlighting logic ...
      const endTime = performance.now();
      addLog('success', `[Visualizer] Batch highlighting completed in ${Math.round(endTime - startTime)}ms.`);
    }
    ```

## 5. Verification Plan

1.  **Implement all logging changes** as described above.
2.  **Run the application** and connect to Excel.
3.  **Open the Debug UI** in the chat interface.
4.  **Give the AI a multi-step command** that will trigger the visual diff process (e.g., "Add a title in A1, put 'Sales' in A2, and 'Revenue' in A3, then format the title to be bold").
5.  **Observe the `Visual Diff Logs` section** in the debug UI *while the preview is active*.
6.  **Verify that logs appear for each step:**
    *   Session start and snapshot creation.
    *   Each operation being simulated.
    *   Highlight rendering.
7.  **Click "Apply"** and verify that the finalization is logged.
8.  **Run another command and click "Cancel"**, verifying the cancellation is logged.
9.  **Introduce an error** (e.g., by modifying a tool request to be invalid) and verify that the error is logged correctly in the `Visual Diff Logs`.
10. **Confirm** that the logs provide a clear, step-by-step narrative of the entire visual diff process.
