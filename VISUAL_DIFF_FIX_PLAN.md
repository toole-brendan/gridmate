# Visual Diff Preview and Acceptance Fix Plan

## 1. The Problem

When an AI suggestion is accepted, the new cell values flash briefly and then disappear. This is because the current `clearHighlights` function indiscriminately clears all cell formatting, including number formats, which causes the rendering issue. Additionally, the preview itself is incomplete because it only applies formatting (color, italics) but does not show the suggested new values in the cells.

This plan addresses both issues to create a seamless and correct user experience.

**Desired Workflow:**
1.  **Preview:** When a diff is suggested, the affected cells should be highlighted with a background color, and the font should be italicized. Crucially, the **new, suggested value** should be displayed in the cell.
2.  **Acceptance:** When the user clicks "Accept," the preview formatting (background color and italics) should be removed, but the **final cell value must remain**.
3.  **Rejection:** When the user clicks "Reject," both the preview formatting and the suggested value should be cleared, reverting the cell to its original state.

## 2. Root Cause Analysis

The core issues are located in `excel-addin/src/services/diff/GridVisualizer.ts`.

1.  **`applyHighlights` is incomplete:** It applies color and font styles but never sets the cell's `value` to the proposed new value from the diff hunk. This is why users don't see the suggested changes during the preview.
2.  **`clearHighlights` is destructive:** It uses `range.format.clear()`, which is a blunt instrument. It resets the *entire* format, including fill, font, borders, and **number format**. When `executeToolRequest` sets a value (e.g., a number like `45000`), Excel applies a default number format. `range.format.clear()` then wipes this out, causing the value to be rendered incorrectly (e.g., as a date) or disappear if the column is too narrow for a generic format. The `preserveValues` flag is currently ignored.

## 3. Implementation Plan

I will refactor `applyHighlights` and `clearHighlights` in `excel-addin/src/services/diff/GridVisualizer.ts` to correctly manage cell values and formatting during the preview and acceptance phases.

### File to be Modified:

-   `/Users/brendantoole/projects2/gridmate/excel-addin/src/services/diff/GridVisualizer.ts`

### Step-by-Step Changes:

#### **Part 1: Fix `applyHighlights` to Show Preview Values**

I will modify the `applyHighlights` and `applyHighlightsBatched` methods to set the cell's value in addition to the formatting.

**`applyHighlights` Refactoring:**

```typescript
// Current (Simplified)
await Excel.run(async (context) => {
  for (const hunk of hunks) {
    const range = context.workbook.worksheets.getItem(hunk.sheet).getRange(hunk.address);
    // ... applies color and font style ...
  }
  await context.sync();
});

// New (Simplified)
await Excel.run(async (context) => {
  for (const hunk of hunks) {
    const range = context.workbook.worksheets.getItem(hunk.sheet).getRange(hunk.address);
    
    // Set the new value for preview
    if (hunk.type === 'added' || hunk.type === 'modified') {
      range.values = [[hunk.newValue]]; // This is the key addition
    }

    // Apply formatting
    range.format.fill.color = getColorForHunk(hunk.type);
    if (hunk.type !== 'removed') {
      range.format.font.italic = true;
    }
  }
  await context.sync();
});
```

This change ensures that when a preview is generated, the user sees the actual suggested value in the cell.

#### **Part 2: Fix `clearHighlights` for Correct Acceptance and Rejection**

I will completely replace the logic in `clearHighlights` to handle the `preserveValues` flag correctly.

**`clearHighlights` Refactoring:**

```typescript
// Current (Problematic)
public static async clearHighlights(hunks?: DiffHunk[], sheetName?: string, preserveValues?: boolean): Promise<void> {
  await Excel.run(async (context) => {
    // ... logic that eventually calls range.format.clear() ...
  });
}

// New (Corrected)
public static async clearHighlights(hunks?: DiffHunk[], sheetName?: string, preserveValues: boolean = false): Promise<void> {
  await Excel.run(async (context) => {
    if (!hunks || hunks.length === 0) {
      // If no hunks are provided, clear all highlights from the sheet (optional, can be kept as is)
      // This part is less critical but should avoid clear()
      const sheet = context.workbook.worksheets.getItem(sheetName || 'Sheet1');
      // A safer clear would be to reset specific properties if possible, or handle this case carefully.
      // For now, we focus on the hunk-based clearing which is the primary use case.
      return;
    }

    for (const hunk of hunks) {
      const range = context.workbook.worksheets.getItem(hunk.sheet).getRange(hunk.address);

      if (preserveValues) {
        // ACCEPTANCE: Just remove preview formatting, keep the value.
        range.format.fill.clear();
        range.format.font.italic = false;
      } else {
        // REJECTION: Remove preview formatting AND revert the value.
        range.format.fill.clear();
        range.format.font.italic = false;
        // Revert to the original value.
        range.values = [[hunk.oldValue]]; 
      }
    }
    await context.sync();
  });
}
```

### Summary of Changes:

1.  **`applyHighlights`:** Will now write the `hunk.newValue` to the cell, making the preview show the actual suggested data.
2.  **`clearHighlights`:**
    -   If `preserveValues` is `true` (on accept), it will only reset the `fill` and `font.italic` properties, preserving the value and its number format.
    -   If `preserveValues` is `false` (on reject), it will reset formatting and revert the cell's value to `hunk.oldValue`.
    -   The destructive `range.format.clear()` call will be completely removed.

This plan will result in a robust and intuitive visual diff experience that aligns with the user's expectations.