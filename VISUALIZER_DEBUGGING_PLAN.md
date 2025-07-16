# Visualizer Debugging Plan

## 1. Objective

The root cause of the `The argument is invalid or missing or has an incorrect format` error remains elusive. The current logging doesn't specify which property assignment within the `context.sync()` batch is failing.

This plan outlines a temporary modification to `excel-addin/src/services/diff/GridVisualizer.ts` to add verbose, property-level logging. The goal is to isolate the exact cell, property, and value that is causing the Office.js API to throw an error.

## 2. Strategy

Instead of applying all formatting changes in a single large batch, we will break down the `applyHighlights` and `clearHighlights` functions. We will wrap individual property changes in `try...catch` blocks and log detailed information before each operation. This will allow us to see the last successful operation and the exact data that caused the subsequent failure.

## 3. File to Modify

*   `/Users/brendantoole/projects2/gridmate/excel-addin/src/services/diff/GridVisualizer.ts`

## 4. Detailed Implementation Plan

### Step 1: Enhance Logging in `applyHighlights`

We will modify the loop that applies formatting to log each property change individually.

**Original Code Snippet (Inside `applyHighlights` loop):**
```typescript
// ... inside for (const { range, hunk, cellKey, borders } of rangeOperations)
try {
  // ...
  switch (hunk.kind) {
    case DiffKind.Added:
      range.format.fill.color = this.COLORS[DiffKind.Added];
      range.format.font.italic = true;
      range.format.borders.getItem('EdgeRight').style = 'Thick';
      range.format.borders.getItem('EdgeRight').color = '#00B050';
      break;
    // ... other cases
  }
} catch (error) {
  console.error(`Error highlighting cell ${cellKey}:`, error);
}
```

**Proposed Debugging Code:**
```typescript
// ... inside for (const { range, hunk, cellKey, borders } of rangeOperations)
try {
  const logPrefix = `[Visualizer Debug | ${cellKey} | ${hunk.kind}]`;

  // --- Fill Color ---
  try {
    const fillColor = this.COLORS[hunk.kind];
    console.log(`${logPrefix} Applying fill color: ${fillColor}`);
    range.format.fill.color = fillColor;
  } catch (e) {
    console.error(`${logPrefix} FAILED on fill color.`, e);
  }

  // --- Font ---
  if (hunk.kind === DiffKind.Added) {
    try {
      console.log(`${logPrefix} Applying font italic: true`);
      range.format.font.italic = true;
    } catch (e) {
      console.error(`${logPrefix} FAILED on font italic.`, e);
    }
  }
  if (hunk.kind === DiffKind.Deleted) {
    try {
      console.log(`${logPrefix} Applying font strikethrough: true`);
      range.format.font.strikethrough = true;
    } catch (e) {
      console.error(`${logPrefix} FAILED on font strikethrough.`, e);
    }
  }

  // --- Borders ---
  try {
    console.log(`${logPrefix} Applying borders.`);
    // Add specific logging for each border property if needed
    switch (hunk.kind) {
        case DiffKind.Added:
            range.format.borders.getItem('EdgeRight').style = 'Thick';
            range.format.borders.getItem('EdgeRight').color = '#00B050';
            break;
        case DiffKind.Deleted:
            const borderItems = ['EdgeTop', 'EdgeBottom', 'EdgeLeft', 'EdgeRight'];
            for (const item of borderItems) {
                range.format.borders.getItem(item).style = 'Continuous';
                range.format.borders.getItem(item).color = '#FF0000';
            }
            break;
        // ... other border cases
    }
  } catch (e) {
    console.error(`${logPrefix} FAILED on borders.`, e);
  }

} catch (error) {
  console.error(`Error processing cell ${cellKey}:`, error);
}
```

### Step 2: Enhance Logging in `clearHighlights`

A similar, even more granular approach is needed for restoring the original state, as this is where `null` values are most likely to cause issues.

**Proposed Debugging Code (inside the `clearHighlights` loop):**
```typescript
// ... inside loop for (const [cellKey, originalState] of this.originalStates)
const logPrefix = `[Visualizer Debug | ${cellKey} | Restore]`;
console.log(`${logPrefix} Restoring state:`, JSON.stringify(originalState));

// --- Fill Color ---
try {
  if (originalState.fillColor) {
    console.log(`${logPrefix} Restoring fill color: ${originalState.fillColor}`);
    range.format.fill.color = originalState.fillColor;
  } else {
    console.log(`${logPrefix} Clearing fill color.`);
    range.format.fill.clear();
  }
} catch (e) {
  console.error(`${logPrefix} FAILED on fill color.`, { state: originalState.fillColor, error: e });
}

// --- Font ---
try {
    console.log(`${logPrefix} Restoring font italic: ${originalState.fontItalic}`);
    range.format.font.italic = originalState.fontItalic;
    console.log(`${logPrefix} Restoring font strikethrough: ${originalState.fontStrikethrough}`);
    range.format.font.strikethrough = originalState.fontStrikethrough;

    if (originalState.fontColor) {
        console.log(`${logPrefix} Restoring font color: ${originalState.fontColor}`);
        range.format.font.color = originalState.fontColor;
    } else {
        console.log(`${logPrefix} Clearing font color.`);
        // Office.js does not have a simple `font.clear()`. Reset to black.
        range.format.font.color = '#000000'; 
    }
} catch (e) {
    console.error(`${logPrefix} FAILED on font.`, { state: originalState, error: e });
}

// --- Borders ---
try {
    const borders = ['EdgeTop', 'EdgeBottom', 'EdgeLeft', 'EdgeRight'];
    const borderKeys = ['top', 'bottom', 'left', 'right'];
    for (let i = 0; i < borders.length; i++) {
        const borderObj = range.format.borders.getItem(borders[i]);
        const borderState = originalState.borders[borderKeys[i]];
        console.log(`${logPrefix} Restoring border ${borders[i]}:`, JSON.stringify(borderState));
        
        borderObj.style = borderState.style || 'None';
        if (borderState.color && borderState.style !== 'None') {
            borderObj.color = borderState.color;
        }
    }
} catch (e) {
    console.error(`${logPrefix} FAILED on borders.`, { state: originalState.borders, error: e });
}

// --- Number Format ---
try {
    console.log(`${logPrefix} Restoring numberFormat: ${originalState.numberFormat}`);
    range.numberFormat = originalState.numberFormat;
} catch(e) {
    console.error(`${logPrefix} FAILED on numberFormat.`, { state: originalState.numberFormat, error: e });
}
```

## 5. Action Items

1.  Implement the verbose logging as described above in `excel-addin/src/services/diff/GridVisualizer.ts`.
2.  Run the application and trigger the error scenario.
3.  Capture the console output, which should now contain the detailed "Visualizer Debug" logs.
4.  Analyze the logs to find the last successful message before the `FAILED` message. The failed message will contain the property and value that caused the error.
5.  Provide the new logs for further analysis.
