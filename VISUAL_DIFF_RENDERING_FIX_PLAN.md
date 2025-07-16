# Plan: Fix Visual Diff Rendering Logic

**Status:** Not Started

## 1. Problem Diagnosis

The visual diff feature is not rendering despite the underlying logic correctly calculating the differences. Analysis of the most recent logs confirms the following sequence:

1.  **Orchestration Success:** The `EnhancedChatInterfaceWithSignalR.tsx` component correctly identifies write operations (like `write_range` and `format_range`) and calls the `initiatePreview` function in the `useDiffPreview` hook. The log entry `[INFO] AI response finished. Initiating diff preview for 14 operations.` confirms this.
2.  **Diff Calculation Success:** The `useDiffPreview` hook successfully runs its course, creating "before" and "after" snapshots and computing the differences. The log entry `[ Diff End] Process finished.` indicates the calculation part is complete.
3.  **Rendering Failure:** The critical failure is that the calculated diffs are never passed to the `GridVisualizer` service to be rendered on the Excel grid. The logs show the data is ready (`[🎨 Diff Apply] Setting 47 diffs for rendering.`), but no subsequent call is made to apply the visual highlights.

The root cause is a missing line of code in the `initiatePreview` function within `/Users/brendantoole/projects2/gridmate/excel-addin/src/hooks/useDiffPreview.ts`.

Additionally, an earlier log revealed that the tool `format_range` was not being treated as a "write" tool, which could cause inconsistent behavior. This should be addressed to make the fix robust.

## 2. Proposed Solution

The solution involves two key changes in two separate files to ensure that calculated diffs are visually rendered and that all relevant tools trigger the diff process.

### **File 1: Fix the Rendering Call**

-   **File to Modify:** `/Users/brendantoole/projects2/gridmate/excel-addin/src/hooks/useDiffPreview.ts`
-   **Change:** Add a call to `GridVisualizer.applyHighlights(diffResult)` inside the `initiatePreview` function immediately after the client-side diff is calculated and stored. This will bridge the gap between calculation and rendering.

### **File 2: Update the Write Tools List**

-   **File to Modify:** `/Users/brendantoole/projects2/gridmate/excel-addin/src/components/chat/EnhancedChatInterfaceWithSignalR.tsx`
-   **Change:** Add the `'format_range'` tool to the `WRITE_TOOLS` constant. This ensures that formatting operations are consistently captured by the visual diff system.

---

## 3. Detailed Implementation Steps

### Step 1: Add the Missing `GridVisualizer` Call

In the `useDiffPreview.ts` file, locate the `initiatePreview` function and add the call to `GridVisualizer.applyHighlights`.

**File:** `/Users/brendantoole/projects2/gridmate/excel-addin/src/hooks/useDiffPreview.ts`

**Current Code Snippet:**
```typescript
      if (!diffResult || diffResult.length === 0) {
        log('visual-diff', `[❌ Diff Error] Backend returned no differences.`);
        setError("Backend analysis found no changes to preview.");
      } else {
        log('visual-diff', `[🎨 Diff Apply] Setting ${diffResult.length} diffs for rendering.`);
        setPreview(diffResult, operations, workbookId);
      }
```

**Proposed New Code Snippet:**
```typescript
      if (!diffResult || diffResult.length === 0) {
        log('visual-diff', `[❌ Diff Error] Backend returned no differences.`);
        setError("Backend analysis found no changes to preview.");
      } else {
        log('visual-diff', `[🎨 Diff Apply] Setting ${diffResult.length} diffs for rendering.`);
        setPreview(diffResult, operations, workbookId);

        // --- FIX: Apply visual highlights immediately after computing them ---
        log('visual-diff', `[🎨 Diff Apply] Applying visual highlights to grid...`);
        GridVisualizer.applyHighlights(diffResult).catch(err => {
          log('visual-diff', `[❌ Diff Error] Failed to apply highlights:`, err);
          setError('Failed to visualize changes');
        });
      }
```

### Step 2: Update `WRITE_TOOLS` Constant

In the `EnhancedChatInterfaceWithSignalR.tsx` file, add `'format_range'` to the `WRITE_TOOLS` set.

**File:** `/Users/brendantoole/projects2/gridmate/excel-addin/src/components/chat/EnhancedChatInterfaceWithSignalR.tsx`

**Current Code Snippet:**
```typescript
const WRITE_TOOLS = new Set(['write_range', 'apply_formula', 'clear_range', 'smart_format_cells']);
```

**Proposed New Code Snippet:**
```typescript
const WRITE_TOOLS = new Set(['write_range', 'apply_formula', 'clear_range', 'smart_format_cells', 'format_range']);
```

---

## 4. Verification Plan

After implementing the changes, the following manual test will verify the fix:

1.  **Start the Application:** Launch the Gridmate Excel add-in.
2.  **Set Autonomy Mode:** Ensure the autonomy mode is set to `agent-default`.
3.  **Perform a Write and Format Action:** Enter a prompt that requires both writing data and formatting it. For example:
    > "In cell A1, write the text 'Project Phoenix'. Then, make the text bold and set the background color of cell A1 to light yellow."
4.  **Observe the Result:**
    -   **Expected UI Change:** The `DiffPreviewBar` should appear at the bottom of the chat interface.
    -   **Expected Grid Change:** Cell A1 in the Excel grid should be highlighted, visually indicating a pending change. The highlight should represent both the new text and the new formatting.
    -   **Expected Log Entries:** The "Visual Diff Logs" should contain entries for `[🎨 Diff Apply] Applying visual highlights to grid...`.
5.  **Apply the Changes:** Click the "Apply" button on the `DiffPreviewBar`.
    -   **Expected Grid Change:** The highlights should disappear, and the text 'Project Phoenix' should appear in cell A1, formatted as bold with a yellow background.
6.  **Cancel the Changes:** (Optional) Run another command and click "Cancel".
    -   **Expected Grid Change:** The highlights should disappear, and no changes should be applied to the cell.

This verification process will confirm that the bridge between diff calculation and rendering has been successfully established and that formatting tools are correctly triggering the preview.
