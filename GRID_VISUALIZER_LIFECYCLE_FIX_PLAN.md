# Plan: Definitive Fix for GridVisualizer API Object Lifecycle

## 1. Introduction & Goal

All previous attempts to fix the `PropertyNotLoaded` error in `GridVisualizer.ts` have failed. The investigation has confirmed that the error persists even when explicitly loading the required border properties. This proves the root cause is not *what* is being loaded, but a more subtle issue with the Excel JavaScript API's object lifecycle.

The proxy objects for borders (e.g., from `range.format.borders.getItem(...)`) become invalid or lose their properties across the `context.sync()` boundary if they are re-fetched instead of being preserved.

The goal of this plan is to implement a bulletproof fix by refactoring the code to create, load, and access the same set of proxy objects throughout the entire `Excel.run` block, ensuring their validity.

## 2. Problem Analysis

- **Root Cause:** The code creates border proxy objects in the first loop to load them, but then creates *new* and different proxy objects in the second loop to read them. These new objects have not had their properties loaded, causing the `PropertyNotLoaded` error.
- **Evidence:** The error persists even with correct, explicit `.load()` calls, proving the objects being accessed in the second loop are not the same ones that were prepared in the first loop.
- **The Definitive Solution:** We must create a single, consistent set of objects. The `rangeOperations` array, which is passed from the first loop to the second, must be modified to store the border proxy objects themselves. This ensures the exact same objects that are loaded are the ones that are read after the `sync`.

## 3. Detailed Implementation Plan

### Step 1: Refactor `GridVisualizer.ts` to Preserve Proxy Objects

1.  **File to Modify:** `/Users/brendantoole/projects2/gridmate/excel-addin/src/services/diff/GridVisualizer.ts`
2.  **Locate the `applyHighlights` function.**
3.  **Modify the `rangeOperations` array definition:** Add an optional `borders` property to its type definition. This new property will hold the proxy objects for the four border edges.

    ```typescript
    // Change this:
    const rangeOperations: Array<{
      range: any
      hunk: DiffHunk
      cellKey: string
    }> = []

    // To this:
    const rangeOperations: Array<{
      range: any
      hunk: DiffHunk
      cellKey: string
      borders?: {
        top: any,
        bottom: any,
        left: any,
        right: any
      }
    }> = []
    ```

4.  **Update the first loop (the "loading" loop):**
    - When preparing an operation, create the four border proxy objects and store them in the `operation.borders` property.
    - Call `.load(['style', 'color'])` on these stored proxy objects.
    - Push the entire `operation` object (now containing the border proxies) into the `rangeOperations` array.

5.  **Update the second loop (the "accessing" loop):**
    - When reading the original state, access the border properties from the *preserved proxy objects* in the `borders` property of the operation object (`for (const { range, hunk, cellKey, borders } of rangeOperations)`).
    - Do **not** call `range.format.borders.getItem(...)` again.

This change guarantees that the objects being read are the exact same instances as the ones that were loaded, resolving the object lifecycle issue.

### Step 2: Verification Strategy

1.  **Execute the Test Case:** Run the application and trigger a `write_range` operation that initiates the visual diff.
2.  **Confirm No Errors:** The `PropertyNotLoaded` error in the browser console must be gone.
3.  **Confirm Visuals:** The diff highlights, especially the colored borders, must now render correctly on the Excel grid.
4.  **Confirm Stability:** The add-in must remain stable and responsive.

This plan is the most robust solution because it directly addresses the object staleness that is the underlying cause of this persistent bug.
