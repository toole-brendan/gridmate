# Plan: Visual Diff Enhancement and Bug Fixes

**Status:** Not Started
**Last Updated:** 2025-07-16

## 1. Investigation Summary

Based on the debug logs from `2025-07-16T00:42:03.044Z`, the visual diff feature is partially working but suffers from several critical issues that prevent it from being useful and reliable.

1.  **Incorrect "Before" Snapshot:** The "before" snapshot of the worksheet is empty (`Before=0`), while the "after" snapshot contains all the new cells (`After=69`). This causes the diff to treat every change as an "addition," resulting in uninformative green highlighting across the entire changed range.
    -   **File of Interest:** `/Users/brendantoole/projects2/gridmate/excel-addin/src/services/excel/ExcelService.ts`
    -   **File of Interest:** `/Users/brendantoole/projects2/gridmate/excel-addin/src/hooks/useDiffPreview.ts`

2.  **Execution Failures:** After approving the diff, many operations fail with the Office.js error `The property 'name' is not available`. This indicates that properties are being accessed without being loaded via `context.load()` and `context.sync()` first.
    -   **File of Interest:** `/Users/brendantoole/projects2/gridmate/excel-addin/src/services/excel/ExcelService.ts`

3.  **Poor Visualization:** Simply coloring the background of all "added" cells green provides no detail about the *content* of the changes (values, formulas). The preview is not intuitive.
    -   **File of Interest:** `/Users/brendantoole/projects2/gridmate/excel-addin/src/services/diff/GridVisualizer.ts`

4.  **Incorrect Tool Classification:** The `get_named_ranges` tool is being queued for user approval instead of being auto-executed as a read-only tool.
    -   **File of Interest:** `/Users/brendantoole/projects2/gridmate/excel-addin/src/components/chat/EnhancedChatInterfaceWithSignalR.tsx`

5.  **Missing Operation Simulators:** The simulation doesn't handle `format_range` and `smart_format_cells` operations, causing formatting changes to be ignored in the diff.
    -   **File of Interest:** `/Users/brendantoole/projects2/gridmate/excel-addin/src/hooks/useDiffPreview.ts`

---

## 2. Implementation Plan

This plan addresses these issues in a phased approach to ensure stability and correctness.

### **Phase 1: Core Bug Fixes**

This phase focuses on making the existing diff orchestration work correctly.

*   **Step 1.1: Fix the "Before" Snapshot Logic with Operation-Aware Strategy**
    *   **File:** `/Users/brendantoole/projects2/gridmate/excel-addin/src/hooks/useDiffPreview.ts`
    *   **Action:** 
        - Enhance the `initiatePreview` function to analyze pending operations before creating the snapshot
        - Extract target ranges from all operations and calculate a bounding box
        - Modify the snapshot call to include the bounding box range, ensuring all target cells are captured
        - Add fallback logic: if `getUsedRange()` returns empty, scan specific operation ranges
        - Include empty cells in the snapshot that might be targets of operations
        - Add detailed logging to trace the range calculation process
    *   **Example Implementation:**
        ```typescript
        // Extract all target ranges from operations
        const targetRanges = operations.map(op => extractTargetRange(op));
        const boundingBox = calculateBoundingBox(targetRanges);
        
        // Create snapshot with operation-aware range
        const before = await excelService.createWorkbookSnapshot({ 
          rangeAddress: boundingBox || 'A1:Z100',
          includeEmptyCells: true,
          forceIncludeRanges: targetRanges
        });
        ```

*   **Step 1.2: Resolve Office.js Execution Errors**
    *   **File:** `/Users/brendantoole/projects2/gridmate/excel-addin/src/services/excel/ExcelService.ts`
    *   **Action:** I will review the `executeToolRequest` method and the specific implementations for `write_range`, `apply_formula`, and `format_range`. For each of these, I will ensure that any Office.js objects (like worksheets, ranges) have their necessary properties loaded via `context.load(...)` before they are used, followed by a `context.sync()`. This will resolve the execution failures.

*   **Step 1.3: Correctly Classify `get_named_ranges`**
    *   **File:** `/Users/brendantoole/projects2/gridmate/excel-addin/src/components/chat/EnhancedChatInterfaceWithSignalR.tsx`
    *   **Action:** I will locate the `isReadOnlyTool` helper function (or its equivalent logic) within this component and add `get_named_ranges` to the set of read-only tools. This will ensure it is auto-approved and executed immediately, improving the workflow.

*   **Step 1.4: Implement Missing Operation Simulators**
    *   **File:** `/Users/brendantoole/projects2/gridmate/excel-addin/src/hooks/useDiffPreview.ts`
    *   **Action:** 
        - Implement `simulateFormatRange` function to handle cell formatting operations
        - Implement `simulateSmartFormatCells` function for intelligent formatting
        - Update the main `simulateOperations` switch statement to include these new simulators
        - Ensure format changes are properly tracked in the snapshot structure
    *   **Example Implementation:**
        ```typescript
        function simulateFormatRange(snapshot: WorkbookSnapshot, input: any, activeSheetName: string) {
          const { range, format } = input;
          const parsedRange = parseRange(range, activeSheetName);
          // Add format information to affected cells
          // Track style changes separately from value changes
        }
        ```

### **Phase 2: Visualization Enhancements**

This phase focuses on making the preview intuitive and useful.

*   **Step 2.1: Advanced Cell Highlighting with Visual Indicators**
    *   **File:** `/Users/brendantoole/projects2/gridmate/excel-addin/src/services/diff/GridVisualizer.ts`
    *   **Action:** I will significantly enhance the `applyHighlights` function with the following improvements:
        *   **Additions (`DiffKind.Added`):** 
            - Light green background (#C6EFCE)
            - Write the new value/formula in italic font
            - Add a small "+" badge in the top-right corner
        *   **Value Changes (`DiffKind.ValueChanged`):** 
            - Light yellow background (#FFEB9C)
            - Show new value with old value as strikethrough
            - Add a "✏️" icon indicator
        *   **Formula Changes (`DiffKind.FormulaChanged`):**
            - Light blue background (#B8CCE4)
            - Display "ƒ" symbol with formula preview
        *   **Format Changes (`DiffKind.StyleChanged`):**
            - Light purple background (#E4DFEC)
            - Add "🎨" icon to indicate formatting
        *   **Deletions (`DiffKind.Deleted`):** 
            - Light red background (#FFC7CE)
            - Apply strikethrough to existing content
            - Add "✖" badge

*   **Step 2.2: Implement State Preservation and Reliable Cancellation**
    *   **File:** `/Users/brendantoole/projects2/gridmate/excel-addin/src/services/diff/GridVisualizer.ts`
    *   **Action:** 
        - Create a `PreviewState` class to store complete cell state before modifications
        - Store value, formula, all format properties (font, fill, borders, number format)
        - Implement transaction-like behavior with rollback capability
        - Add `beginPreview()` and `endPreview()` methods for session management
        - Use WeakMap for automatic memory cleanup of stored states
    *   **Example Implementation:**
        ```typescript
        class PreviewState {
          private originalStates = new WeakMap<object, CellState>();
          
          async captureState(range: Excel.Range): Promise<void> {
            // Capture complete cell state including all formatting
          }
          
          async restoreState(range: Excel.Range): Promise<void> {
            // Restore cell to exact original state
          }
        }
        ```

*   **Step 2.3: Interactive Preview Features**
    *   **File:** `/Users/brendantoole/projects2/gridmate/excel-addin/src/services/diff/GridVisualizer.ts`
    *   **Action:**
        - Add hover handlers to show detailed change information
        - Implement cell selection to view before/after comparison
        - Add optional animation for changes (subtle pulse effect)
        - Create a visual legend overlay explaining color codes

### **Phase 3: User Experience Polish**

*   **Step 3.1: Enhanced DiffPreviewBar with Detailed Summary**
    *   **File:** `/Users/brendantoole/projects2/gridmate/excel-addin/src/components/chat/DiffPreviewBar.tsx`
    *   **Action:** 
        - Parse `diffHunks` to categorize changes by type
        - Display breakdown: "➕ 45 additions | ✏️ 20 changes | ƒ 5 formulas | 🎨 10 formats | ✖ 4 deletions"
        - Add expandable details panel showing affected ranges
        - Include estimated execution time based on operation count
        - Add progress indicator during apply/cancel operations

*   **Step 3.2: Robust State Management and Error Recovery**
    *   **File:** `/Users/brendantoole/projects2/gridmate/excel-addin/src/components/chat/EnhancedChatInterfaceWithSignalR.tsx`
    *   **Action:** 
        - Implement proper cleanup in useEffect hooks
        - Add error boundaries around diff preview operations
        - Ensure `pendingDiffOps` is cleared in all edge cases:
            - New message sent
            - Component unmount
            - Connection loss
            - User switches autonomy modes
        - Add recovery mechanism for partial preview failures
        - Implement operation timeout handling

*   **Step 3.3: Performance Optimization**
    *   **Action:**
        - **Batch Excel API calls to minimize `context.sync()` operations**
            - **Files:** 
                - `/Users/brendantoole/projects2/gridmate/excel-addin/src/services/excel/ExcelService.ts`
                - `/Users/brendantoole/projects2/gridmate/excel-addin/src/services/diff/GridVisualizer.ts`
        - **Implement virtual scrolling for large diff previews**
            - **File:** `/Users/brendantoole/projects2/gridmate/excel-addin/src/components/chat/DiffPreviewBar.tsx`
        - **Add debouncing for rapid operation sequences**
            - **Files:**
                - `/Users/brendantoole/projects2/gridmate/excel-addin/src/hooks/useDiffPreview.ts`
                - `/Users/brendantoole/projects2/gridmate/excel-addin/src/utils/debouncedDiff.ts` (New File)
        - **Cache frequently accessed worksheet properties**
            - **File:** `/Users/brendantoole/projects2/gridmate/excel-addin/src/services/excel/ExcelService.ts`
        - **Optimize diff calculation algorithm for large ranges**
            - **File:** `/Users/brendantoole/projects2/gridmate/excel-addin/src/utils/clientDiff.ts` (New or Existing File)

---

## 3. Testing Strategy

### **Unit Tests**
- Test snapshot creation with empty worksheets
- Test operation simulators with various input types
- Test diff calculation accuracy
- Test error handling in GridVisualizer

### **Integration Tests**
- Test complete flow from operation to visual preview
- Test apply/cancel functionality
- Test state preservation and restoration
- Test performance with large operation sets

### **Manual Verification**
After implementation, I will re-run the original test case and verify:
1.  The "Visual Diff Logs" show correct `Before` and `After` snapshot counts
2.  The Excel grid shows informative highlights with visual indicators
3.  Hovering over cells shows change details
4.  The `get_named_ranges` tool is executed without appearing in the approval queue
5.  Clicking "Apply" executes all operations successfully with no errors
6.  Clicking "Cancel" restores the sheet to its exact original state
7.  The DiffPreviewBar shows categorized change summary
8.  Performance remains smooth with 100+ operations

---

## 4. Future Enhancements (Post-MVP)

1. **Conflict Detection**: Identify when multiple operations affect the same cell
2. **Undo/Redo Support**: Allow stepwise undo of applied changes
3. **Diff History**: Store and replay previous diff sessions
4. **Collaborative Preview**: Show who suggested which changes in team environments
5. **Smart Grouping**: Group related operations visually (e.g., all formatting for a table)
6. **Export Preview**: Generate a summary report of proposed changes
