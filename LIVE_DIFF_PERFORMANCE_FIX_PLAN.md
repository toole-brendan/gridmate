# Live Diff Performance Optimization Plan

## 1. Overview

This document outlines a detailed plan to resolve the severe performance degradation observed in the chat interface, where a single message can take up to 5 minutes to process.

The root cause has been identified as the repeated and inefficient execution of the `createWorkbookSnapshot` function within the live diff preview system. The current implementation takes a new, large snapshot of the workbook for every tool request made by the AI, even for multiple requests within the same user turn. This leads to a cascade of slow operations, rendering the feature unusable.

This plan will refactor the snapshotting and preview generation logic to be intelligent, stateful, and efficient.

## 2. Core Strategy

The optimization strategy is twofold:

1.  **Stateful Snapshot Management:** Transition from a stateless snapshot process to a stateful one. A single, initial snapshot will be taken at the beginning of an AI's response turn (i.e., for the first tool request). Subsequent tool requests for the same user message will reuse and build upon this snapshot in memory, eliminating redundant `Excel.run` calls.
2.  **Targeted Snapshot Range:** Make the snapshot process itself more efficient by moving away from hardcoded, large ranges (`A1:Z100`) and instead calculating a more precise bounding box that only covers the areas relevant to the AI's proposed operations.

## 3. Proposed File Changes

The fix requires coordinated changes across three key files: the state store, the preview hook (orchestrator), and the Excel service (worker).

### 3.1. State Management (`useDiffSessionStore.ts`)

The store needs to be enhanced to hold the state of the ongoing preview simulation.

**File:** `/Users/brendantoole/projects2/gridmate/excel-addin/src/store/useDiffSessionStore.ts`

**Changes:**

1.  **Add `currentSimulatedSnapshot` to State:** Introduce a new field to the `DiffSessionState` interface to store the result of the most recent simulation. This allows us to build the next preview on top of the last one without starting from scratch.

    ```typescript
    // BEFORE
    interface DiffSessionState {
      activePreview: DiffData | null;
      originalSnapshot: WorkbookSnapshot | null;
      // ... actions
    }

    // AFTER
    interface DiffSessionState {
      activePreview: DiffData | null;
      originalSnapshot: WorkbookSnapshot | null;
      currentSimulatedSnapshot: WorkbookSnapshot | null; // <-- ADD THIS
      // ... actions
    }
    ```

2.  **Update `setActivePreview` Action:** This action should now also update the `currentSimulatedSnapshot`.

    ```typescript
    // In the store implementation:
    setActivePreview: (messageId, operations, hunks, simulatedSnapshot) => { // <-- Add simulatedSnapshot
      set({
        activePreview: { messageId, operations, hunks, /* ... */ },
        currentSimulatedSnapshot: simulatedSnapshot, // <-- Set it here
      });
    },
    ```

3.  **Update `clearPreview` Action:** Ensure the new state field is cleared properly.

    ```typescript
    // In the store implementation:
    clearPreview: () => {
      set({ 
        activePreview: null, 
        originalSnapshot: null, 
        currentSimulatedSnapshot: null // <-- Clear it here
      });
    },
    ```

### 3.2. Excel Service (`ExcelService.ts`)

The service needs to be updated to perform more efficient snapshots.

**File:** `/Users/brendantoole/projects2/gridmate/excel-addin/src/services/excel/ExcelService.ts`

**Changes:**

1.  **Change Default Snapshot Range:** In `createWorkbookSnapshot`, change the default `rangeAddress` from the inefficient `'A1:Z100'` to `'UsedRange'`. This is a simple but significant improvement that limits the snapshot to only the cells that actually contain data.

    ```typescript
    // In createWorkbookSnapshot method:
    // BEFORE
    const {
      rangeAddress = 'A1:Z100', // Default range to scan
      // ...
    } = options

    // AFTER
    const {
      rangeAddress = 'UsedRange', // More efficient default
      // ...
    } = options
    ```

### 3.3. Preview Hook (`useDiffPreview.ts`)

This file contains the most critical logic changes, orchestrating the new stateful preview generation.

**File:** `/Users/brendantoole/projects2/gridmate/excel-addin/src/hooks/useDiffPreview.ts`

**Changes:**

1.  **Refactor `generatePreview` Logic:** The core of the fix is to make this function state-aware.

    *   **On First Tool Request (New Message):** If the incoming `messageId` is different from the one in `activePreview`, it signifies a new "turn". The logic should auto-accept the old preview and take a *single* new `originalSnapshot`.
    *   **On Subsequent Tool Requests (Same Message):** If the `messageId` is the same, the logic must *not* take a new snapshot. Instead, it should use the `currentSimulatedSnapshot` from the store as the starting point for the next simulation.

2.  **Implement the New `generatePreview` Flow:**

    ```typescript
    // Inside useDiffPreview.ts
    const generatePreview = useCallback(async (messageId: string, operations: AISuggestedOperation[]) => {
      try {
        setIsCalculating(true);
        setValidationErrors([]);

        let baseSnapshot: WorkbookSnapshot;
        let isNewPreviewSession = !store.activePreview || store.activePreview.messageId !== messageId;

        // --- START NEW LOGIC ---
        if (isNewPreviewSession) {
          // 1A. New message, so auto-accept any old preview.
          if (store.activePreview) {
            console.log('[Diff Preview] New message, auto-accepting existing preview');
            // (Apply operations and clear highlights for the old preview)
            await store.acceptActivePreview(); 
          }
          
          // 1B. Take a single, fresh snapshot for this new session.
          console.log('[Diff Preview] Starting new preview session, creating initial snapshot.');
          const targetRange = extractTargetRange(operations); // This can be further optimized
          baseSnapshot = await excelService.createWorkbookSnapshot({
            rangeAddress: targetRange || 'UsedRange',
            maxCells: 50000
          });
          useDiffSessionStore.setState({ originalSnapshot: baseSnapshot });

        } else {
          // 2. Same message, so continue the existing session.
          console.log('[Diff Preview] Continuing existing preview session.');
          // Use the result of the last simulation as our starting point.
          baseSnapshot = store.currentSimulatedSnapshot ?? store.originalSnapshot;
          if (!baseSnapshot) throw new Error('Snapshot missing in active session');
        }
        // --- END NEW LOGIC ---

        // 3. Simulate new operations on the appropriate base snapshot.
        let newSimulatedSnapshot = baseSnapshot;
        for (const operation of operations) {
          newSimulatedSnapshot = await simulateOperation(newSimulatedSnapshot, operation);
        }

        // 4. Calculate diff against the *original* snapshot of the session.
        const originalSnapshot = useDiffSessionStore.getState().originalSnapshot;
        const hunks = diffCalculator.calculateDiff(originalSnapshot, newSimulatedSnapshot);

        // 5. Apply visual highlights (clear old ones first).
        await GridVisualizer.clearAllHighlights();
        await GridVisualizer.applyHighlights(hunks);

        // 6. Set the new active preview, saving the latest simulated state.
        store.setActivePreview(messageId, operations, hunks, newSimulatedSnapshot);

      } catch (error) {
        // ... error handling ...
      } finally {
        setIsCalculating(false);
      }
    }, [store, excelService]);
    ```

## 4. Implementation Sequence

1.  **Step 1: Update `useDiffSessionStore.ts`:** Add the `currentSimulatedSnapshot` field and update the associated actions. This is a prerequisite for the other changes.
2.  **Step 2: Update `ExcelService.ts`:** Change the default snapshot range to `'UsedRange'`. This is a quick win that can be implemented immediately.
3.  **Step 3: Refactor `useDiffPreview.ts`:** Implement the new stateful `generatePreview` logic as detailed above. This is the most complex part of the fix.
4.  **Step 4: Testing:** Thoroughly test the new implementation to ensure both performance and correctness.

## 5. Implementation Recommendations & Considerations

### 5.1. Required Code Updates

1. **Update setActivePreview Signature**
   - The current implementation of `setActivePreview` doesn't accept the `simulatedSnapshot` parameter
   - Need to update both the interface definition and all calling locations

2. **Good News: Auto-Accept Already Implemented**
   - The current `generatePreview` already implements auto-acceptance logic (lines 33-43)
   - This reduces implementation complexity

3. **Smart Range Detection Enhancement**
   Consider implementing smarter range detection in `extractTargetRange`:
   ```typescript
   // For operations on specific cells, snapshot affected area + buffer
   // Example: For A1:A10, snapshot A1:B11 instead of entire UsedRange
   // This provides further performance optimization for targeted operations
   ```

### 5.2. Edge Cases & Considerations

1. **Memory Management**
   - With stateful snapshots, memory usage will increase (storing both originalSnapshot and currentSimulatedSnapshot)
   - Consider implementing:
     - Automatic cleanup after message completion
     - Maximum snapshot size limits
     - Memory usage monitoring

2. **Concurrency Handling**
   - Ensure proper sequencing if multiple tool requests arrive rapidly
   - Consider using a queue or semaphore to prevent race conditions
   - The `isCalculating` flag helps but may need enhancement

3. **Empty Worksheet Handling**
   - Current implementation already handles empty worksheets gracefully
   - No additional work needed here

4. **Error Recovery**
   - If auto-acceptance fails, maintain current preview state
   - Provide clear error messaging to users
   - Ensure rollback mechanism is robust

### 5.3. Performance Optimization Opportunities

1. **Incremental Snapshots**
   - For subsequent operations in the same turn, consider capturing only the delta
   - This could further reduce memory usage and processing time

2. **Lazy Loading**
   - Only load cell properties that are actually needed for the diff
   - Skip loading styles if not required for the operation

3. **Background Processing**
   - Consider moving snapshot creation to a web worker if possible
   - This would prevent UI blocking during large snapshot operations

## 6. Verification and Testing

### 6.1. Performance Tests
-   **Multi-step Command Test:** Execute "write a value to A1, then format it bold, then change the color". Should complete in <3 seconds (not minutes). Console logs should show `createWorkbookSnapshot` called only ONCE.
-   **Large Range Test:** Test with operations affecting 1000+ cells to ensure UsedRange optimization works
-   **Memory Usage Test:** Monitor memory consumption during extended sessions with multiple previews

### 6.2. Correctness Tests
-   **Preview Accuracy Test:** After multi-step preview, verify Excel state matches visual preview exactly
-   **Formula Dependency Test:** Ensure formulas depending on previewed cells update correctly
-   **Format Preservation Test:** Verify cell formats are maintained through accept/reject cycles

### 6.3. Edge Case Tests
-   **Interruption Test:** Start multi-step command, interrupt with new command. First preview should auto-accept cleanly, new preview should start with single snapshot
-   **Rejection Test:** Reject multi-step preview, verify sheet reverts to pre-preview state
-   **Rapid Fire Test:** Send multiple tool requests in quick succession, verify no race conditions
-   **Empty Sheet Test:** Test operations on completely empty worksheets
-   **Large Sheet Test:** Test with sheets containing 50,000+ cells to verify performance remains acceptable

### 6.4. Success Metrics
- Response time: <3 seconds for typical operations (down from 5 minutes)
- Memory usage: <100MB increase per preview session
- Snapshot calls: 1 per message turn (not per tool request)
- Zero data corruption or loss during accept/reject operations

This plan addresses the performance bottleneck at its source and will restore the responsiveness of the chat interface while maintaining data integrity and user control.
