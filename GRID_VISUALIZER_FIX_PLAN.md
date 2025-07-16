# Plan: Centralize Cell Coordinate Utilities to Fix Visualization Bug

## 1. Introduction & Goal

The application is throwing a `PropertyNotLoaded` error during the diff visualization process. This is caused by the `GridVisualizer.ts` service creating invalid cell addresses (e.g., `Sheet1!0,0`) instead of the required A1-style addresses (e.g., `Sheet1!A1`).

A correct conversion function, `cellKeyToString`, was recently added to `diffSimulator.ts` but was not made available for wider use. This plan outlines the steps to fix the bug by creating a centralized and reusable utility for cell coordinate conversion.

The goal is to refactor the code to eliminate duplicate logic, fix the visualization error, and improve code maintainability.

## 2. Problem Analysis

- **Root Cause:** The `highlightHunks` function in `GridVisualizer.ts` manually constructs cell addresses using row and column indices, resulting in an invalid format.
- **Existing Solution:** The file `excel-addin/src/utils/diffSimulator.ts` contains the correct logic in its local `cellKeyToString` function, but it is not exported.
- **Proposed Solution:** Move the `cellKeyToString` function and its related helpers to a new, dedicated utility file. This will allow `GridVisualizer.ts`, `diffSimulator.ts`, and any other component to share the same robust implementation.

## 3. Detailed Implementation Plan

### Step 1: Create a Centralized Cell Utility File

1.  **Create a new file:** `/Users/brendantoole/projects2/gridmate/excel-addin/src/utils/cellUtils.ts`.
2.  **Move the conversion logic:**
    - Cut the `colToLetter` helper function and the `cellKeyToString` function from `/Users/brendantoole/projects2/gridmate/excel-addin/src/utils/diffSimulator.ts`.
    - Paste them into the new `cellUtils.ts` file.
    - Export both functions from `cellUtils.ts`.

**File: `/Users/brendantoole/projects2/gridmate/excel-addin/src/utils/cellUtils.ts`**
```typescript
// excel-addin/src/utils/cellUtils.ts

import { CellKey } from "../types/diff";

/**
 * Converts a 0-indexed column number to its A1 letter representation.
 * e.g., 0 -> A, 1 -> B, 26 -> AA
 */
export const colToLetter = (col: number): string => {
  let letter = '';
  let temp = col;
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
};

/**
 * Converts a CellKey object to an A1-style string reference.
 * e.g., { sheet: 'Sheet1', row: 0, col: 0 } -> 'Sheet1!A1'
 */
export const cellKeyToA1 = (cellKey: CellKey): string => {
  const rowA1 = cellKey.row + 1; // Convert 0-indexed row to 1-indexed
  const colA1 = colToLetter(cellKey.col);
  return `${cellKey.sheet}!${colA1}${rowA1}`;
};
```
*(Note: Renamed `cellKeyToString` to `cellKeyToA1` for clarity).*

### Step 2: Update `diffSimulator.ts` to Use the New Utility

1.  **Modify the file:** `/Users/brendantoole/projects2/gridmate/excel-addin/src/utils/diffSimulator.ts`.
2.  **Import the new utility:** Add `import { cellKeyToA1 } from './cellUtils';` at the top of the file.
3.  **Update the `cellKeyToString` function:** Replace the old, moved logic with a simple call to the new, centralized function.

```typescript
// excel-addin/src/utils/diffSimulator.ts
import { cellKeyToA1 } from './cellUtils';

// ... other imports

// This function remains to avoid breaking the existing interface, but it now delegates to the utility.
function cellKeyToString(cellKey: CellKey): string {
  return cellKeyToA1(cellKey);
}

// ... rest of the file
```

### Step 3: Update `GridVisualizer.ts` to Fix the Bug

1.  **Modify the file:** `/Users/brendantoole/projects2/gridmate/excel-addin/src/services/diff/GridVisualizer.ts`.
2.  **Import the new utility:** Add `import { cellKeyToA1 } from '../../utils/cellUtils';` at the top of the file.
3.  **Correct the `highlightHunks` function:**
    - Locate the line where the cell address is constructed incorrectly.
    - Replace the manual string concatenation with a call to `cellKeyToA1`.

**Before:**
```typescript
// Inside highlightHunks...
const address = `${hunk.sheet}!${hunk.row},${hunk.col}`; // This is the bug
const cell = context.workbook.worksheets.getItem(hunk.sheet).getRange(address);
```

**After:**
```typescript
// Inside highlightHunks...
const address = cellKeyToA1(hunk); // Correctly generates 'Sheet1!A1'
const cell = context.workbook.worksheets.getItem(hunk.sheet).getRange(address);
```

## 4. Verification Strategy

1.  **Run the application** and trigger a multi-step write operation that previously caused the crash.
2.  **Observe the console:**
    - **Expected:** The `PropertyNotLoaded` error should be gone. There should be no errors related to cell highlighting.
3.  **Observe the UI:**
    - **Expected:** The visual diff highlights should now appear correctly on the grid for added, modified, or deleted cells. The application should remain stable.
4.  **Code Review:**
    - **Expected:** The new `cellUtils.ts` file should exist and export the helper functions. `diffSimulator.ts` and `GridVisualizer.ts` should both import and use the new utility, demonstrating that the refactor was successful.
