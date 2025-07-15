# Plan: Add Extensive Logging to Visual Diff Feature

## 1. Objective

The visual diff feature is not applying "preview" edits as expected, even after implementing the `VISUAL_DIFF_REPAIR_PLAN.md`. This plan outlines the steps to inject comprehensive logging throughout the entire diffing lifecycle to diagnose the root cause of the failure. The logs will trace the process from the initial user action to the final (failed) rendering attempt.

## 2. Strategy

We will add detailed logs at each critical stage of the diffing process. Each log message will be prefixed with a unique emoji to make it easy to follow a specific trace in the browser's developer console.

-   **`[🚀 Diff Start]`**: Marks the initiation of the diff process.
-   **`[🔬 Diff Simulate]`**: Logs related to the client-side simulation of AI operations.
-   **`[📡 Diff Backend Call]`**: Logs for the backend request/response to compute the diff.
-   **`[🎨 Diff Apply]`**: Logs related to applying the received diff highlights to the UI.
-   **`[✅ Diff Apply Success]`**: Logs for the final, permanent application of changes after user approval.
-   **`[❌ Diff Error]`**: Logs any and all errors that occur during the process.

## 3. Implementation Steps

### Step 1: Enhance Logging in `useDiffPreview.ts`

This hook is the heart of the client-side diff logic. We need to see what's happening before, during, and after the simulation.

**File to Modify:** `/Users/brendantoole/projects2/gridmate/excel-addin/src/hooks/useDiffPreview.ts`

**Action:** Add detailed logging inside the `initiatePreview` function.

```typescript
// In /Users/brendantoole/projects2/gridmate/excel-addin/src/hooks/useDiffPreview.ts

// ... imports

export const useDiffPreview = (signalRClient: SignalRClient | null, workbookId: string) => {
  // ... existing state

  const initiatePreview = useCallback(async (operations: AISuggestedOperation[]) => {
    console.log(`[🚀 Diff Start]`, { operations });
    setIsLoading(true);
    setError(null);
    setStatus('computing');

    try {
      const excelService = ExcelService.getInstance();
      const activeSheetName = (await excelService.getContext()).worksheet;
      console.log(`[🚀 Diff Start] Active sheet context acquired: ${activeSheetName}`);

      const before = await excelService.createWorkbookSnapshot({ /* ... options */ });
      console.log(`[🔬 Diff Simulate] "Before" snapshot created.`, { before: JSON.parse(JSON.stringify(before)) });

      const after = await simulateOperations(before, operations, activeSheetName);
      console.log(`[🔬 Diff Simulate] "After" snapshot created.`, { after: JSON.parse(JSON.stringify(after)) });

      const beforeCellCount = Object.keys(before).length;
      const afterCellCount = Object.keys(after).length;
      console.log(`[🔬 Diff Simulate] Snapshot cell counts: Before=${beforeCellCount}, After=${afterCellCount}`);

      if (JSON.stringify(before) === JSON.stringify(after)) {
        console.warn(`[❌ Diff Error] Simulation resulted in no changes. "Before" and "After" snapshots are identical.`);
        setError("Simulation failed to produce any changes.");
        setIsLoading(false);
        setStatus('idle');
        return;
      }

      useDiffStore.setState({ pendingOperations: operations });
      console.log(`[📡 Diff Backend Call] Stored pending operations. Invoking 'GetVisualDiff' on backend.`);

      const diffResult = await signalRClient?.invoke('GetVisualDiff', {
        workbookId,
        before,
        after,
      });

      console.log(`[📡 Diff Backend Call] Received response from 'GetVisualDiff'.`, { diffResult });

      if (!diffResult || diffResult.length === 0) {
        console.warn(`[❌ Diff Error] Backend returned no differences.`);
        setError("Backend analysis found no changes to preview.");
      } else {
        console.log(`[🎨 Diff Apply] Setting ${diffResult.length} diffs for rendering.`);
        useDiffStore.setState({ diffs: diffResult, isPreviewing: true });
      }

    } catch (err) {
      console.error(`[❌ Diff Error] An error occurred in initiatePreview.`, { error: err });
      setError((err as Error).message);
    } finally {
      console.log(`[🚀 Diff End] Process finished.`);
      setIsLoading(false);
      setStatus('idle');
    }
  }, [signalRClient, workbookId]);

  // ... rest of the hook
};
```

### Step 2: Add Logging to the `DiffPreviewBar` Component

This UI component is what the user should see. If it's not rendering, we need to know why.

**File to Modify:** `/Users/brendantoole/projects2/gridmate/excel-addin/src/components/chat/DiffPreviewBar.tsx`

**Action:** Add logs to see if the component renders and what state it receives from the `useDiffStore`.

```typescript
// In /Users/brendantoole/projects2/gridmate/excel-addin/src/components/chat/DiffPreviewBar.tsx

// ... imports
import { useDiffStore } from '../../store/useDiffStore';

export const DiffPreviewBar: React.FC<DiffPreviewBarProps> = ({ onApply, onCancel, isLoading }) => {
  const { diffs, isPreviewing } = useDiffStore();

  console.log(`[🎨 Diff Apply] DiffPreviewBar rendered.`, { isPreviewing, diffsCount: diffs.length, isLoading });

  if (!isPreviewing || diffs.length === 0) {
    // Add a log to confirm why it's not showing
    if (isPreviewing && diffs.length === 0) {
        console.log(`[🎨 Diff Apply] DiffPreviewBar is hidden because there are no diffs to show.`);
    }
    return null;
  }

  const additions = diffs.filter(d => d.type === 'addition').length;
  const modifications = diffs.filter(d => d.type === 'modification').length;
  const deletions = diffs.filter(d => d.type === 'deletion').length;

  console.log(`[🎨 Diff Apply] Diff summary:`, { additions, modifications, deletions });

  // ... rest of the component
};
```

### Step 3: Add Logging to the `ExcelService` Apply Logic

When the user clicks "Apply", the `applyChanges` function in `useDiffPreview.ts` calls the `ExcelService`. We need to log this handoff and the execution within the service itself.

**File to Modify:** `/Users/brendantoole/projects2/gridmate/excel-addin/src/services/excel/ExcelService.ts`

**Action:** Add logging to the `executeToolRequest` and the specific `tool*` methods.

```typescript
// In /Users/brendantoole/projects2/gridmate/excel-addin/src/services/excel/ExcelService.ts

// ...

  public async executeToolRequest(tool: string, input: any): Promise<any> {
    console.log(`[✅ Diff Apply Success] ExcelService received tool request to execute.`, { tool, input });
    try {
      switch (tool) {
        case 'write_range':
          return await this.toolWriteRange(input);
        case 'apply_formula':
          return await this.toolApplyFormula(input);
        // ... other cases
        default:
          console.error(`[❌ Diff Error] Unknown tool requested in ExcelService: ${tool}`);
          throw new Error(`Unknown tool: ${tool}`);
      }
    } catch (error) {
        console.error(`[❌ Diff Error] Error during tool execution in ExcelService.`, { tool, error });
        throw error; // Re-throw to be caught by the caller
    }
  }

  private async toolWriteRange(input: any): Promise<any> {
    const { range, values } = input;
    console.log(`[✅ Diff Apply Success] Executing toolWriteRange.`, { range, values });
    
    return Excel.run(async (context: any) => {
      try {
        const { worksheet, rangeAddress } = await this.getWorksheetFromRange(context, range);
        const excelRange = worksheet.getRange(rangeAddress);
        
        console.log(`[✅ Diff Apply Success] Target determined: Sheet='${worksheet.name}', Range='${rangeAddress}'`);
        
        excelRange.values = values;
        await context.sync();
        
        console.log(`[✅ Diff Apply Success] toolWriteRange completed successfully.`);
        return { message: 'Range written successfully', status: 'success' };

      } catch (error) {
        console.error(`[❌ Diff Error] Failed inside toolWriteRange.`, { range, error });
        throw new Error(`Failed to write to range "${range}": ${(error as Error).message}`);
      }
    });
  }

  // Add similar logging to toolApplyFormula and other relevant tool methods.
```

## 4. Verification Plan

After adding the logging code:

1.  **Run the application** and open the browser's developer console.
2.  **Trigger the diff feature** by giving the AI a command that should result in a change (e.g., "write 'hello' in A1").
3.  **Observe the console logs** and trace the flow using the emoji prefixes.
4.  **Analyze the output** to answer the following questions:
    -   Does the process start? Do you see `[🚀 Diff Start]`?
    -   Are the "before" and "after" snapshots different after simulation? Check the `[🔬 Diff Simulate]` logs.
    -   Does the backend receive the call and return a valid diff? Check the `[📡 Diff Backend Call]` logs.
    -   Does the `DiffPreviewBar` component render, and what state does it receive? Check the `[🎨 Diff Apply]` logs.
    -   If you manually trigger an apply, do the `[✅ Diff Apply Success]` logs appear in the `ExcelService`?
    -   Are there any `[❌ Diff Error]` logs at any stage?

This systematic logging will provide the necessary visibility to understand precisely where the visual diff process is failing.
