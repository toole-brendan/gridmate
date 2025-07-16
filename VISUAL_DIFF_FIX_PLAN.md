# Visual Diff Fix Plan

## 1. Problem Analysis

The current implementation of the visual diff feature is failing with the following error in the logs:

```
[Visualizer] Error applying highlights: The argument is invalid or missing or has an incorrect format.
```

This error originates from the Office.js API, specifically during the `context.sync()` call within the `applyHighlights` and `clearHighlights` functions in `excel-addin/src/services/diff/GridVisualizer.ts`. This indicates that one of the API calls in the batched request is invalid.

The primary suspect is the `worksheet.getRangeByIndexes(row, col, 1, 1)` method. While technically correct for getting a single cell range, it might be less resilient than the more direct `worksheet.getCell(row, col)` method, especially considering recent frontend refactoring that might have introduced subtle changes.

## 2. Proposed Solution

The proposed solution is to replace all occurrences of `worksheet.getRangeByIndexes(row, col, 1, 1)` with `worksheet.getCell(row, col)` inside `excel-addin/src/services/diff/GridVisualizer.ts`. This is a low-risk change that is likely to resolve the issue by using a more common and robust API for single-cell operations.

## 3. Implementation Steps

1.  **Modify `excel-addin/src/services/diff/GridVisualizer.ts`:**
    *   Open the file: `/Users/brendantoole/projects2/gridmate/excel-addin/src/services/diff/GridVisualizer.ts`.
    *   In the `applyHighlights` function, locate the following code block:
        ```typescript
        const range = worksheet.getRangeByIndexes(
          hunk.key.row,
          hunk.key.col,
          1, // height
          1  // width
        )
        ```
    *   Replace it with:
        ```typescript
        const range = worksheet.getCell(hunk.key.row, hunk.key.col)
        ```
    *   In the `clearHighlights` function, locate the following code block (for specific hunks):
        ```typescript
        const range = worksheet.getRangeByIndexes(
          hunk.key.row,
          hunk.key.col,
          1,
          1
        )
        ```
    *   Replace it with:
        ```typescript
        const range = worksheet.getCell(hunk.key.row, hunk.key.col)
        ```
    *   In the `clearHighlights` function, locate the following code block (for all stored highlights):
        ```typescript
        const range = worksheet.getRangeByIndexes(row, col, 1, 1)
        ```
    *   Replace it with:
        ```typescript
        const range = worksheet.getCell(row, col)
        ```

2.  **Verification:**
    *   After applying the changes, the application should be rebuilt and tested to ensure the visual diff feature works as expected without any errors in the console.
    *   The user should be asked to confirm that the issue is resolved.

This plan ensures a targeted and safe fix for the reported bug.
