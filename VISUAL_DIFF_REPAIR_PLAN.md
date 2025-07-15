# Implementation Plan: Visual Diff and Edit Application Repair

**Status:** Not Started

## 1. Introduction: The Feature and The Problem

### What is the Visual Diff Feature?

The **Visual Diff** is a critical user experience enhancement designed to provide financial analysts with a safe and intuitive way to interact with Gridmate's AI. Instead of approving abstract tool commands in a chat window, the user is meant to see a direct, in-grid preview of any changes the AI suggests.

The intended workflow is as follows:
1.  The user submits a prompt (e.g., "Create a 5-year forecast for revenue starting at $100M with 15% annual growth").
2.  The AI determines the necessary operations (e.g., `write_range` with specific values).
3.  **Visual Preview:** The system automatically generates a preview. The affected cells in the Excel grid are highlighted with color-codes (e.g., green for new values, yellow for changed values). The underlying cell data is **not yet changed**.
4.  **User Approval:** A `DiffPreviewBar` appears, summarizing the changes. The user can visually inspect the highlighted cells in the context of their model.
5.  **Execution:** The user clicks "Apply" on the bar to make the changes permanent, or "Cancel" to discard them.

This "human-in-the-loop" design is crucial for maintaining the accuracy and auditability required in professional financial modeling.

### What is Broken?

Currently, this entire workflow is failing due to two distinct but related bugs:

1.  **The "No Diffs" Problem:** The visual preview never appears. When the AI suggests a change, the grid remains static. There are no highlights and no `DiffPreviewBar`. This forces the user to fall back to the old, less intuitive method of approving abstract "tool cards" in the chat.
2.  **The "Incorrect Edit" Problem:** When a change *is* approved (either through the broken diff system or the legacy card system), the final edit applied to the worksheet is often incorrect. It may be applied to the wrong sheet, in the wrong location, or fail silently.

This plan will address both issues to restore the intended functionality.

---

## 2. Part 1: Fix the Visual Diff Preview

The "No Diffs" problem is caused by a failure in the client-side simulation logic. The system correctly takes a "before" snapshot of the workbook, but when it tries to simulate the AI's suggested operations to create an "after" snapshot, it fails. This results in an "after" snapshot that is identical to the "before" snapshot. When these two identical snapshots are sent to the backend for comparison, the backend correctly reports that there are no differences, and thus no highlights are shown.

The primary culprit is the `simulateOperations` function and its helpers in `useDiffPreview.ts`.

### **File to be Modified:**
- `/Users/brendantoole/projects2/gridmate/excel-addin/src/hooks/useDiffPreview.ts`

### **Proposed Code Changes:**

The simulation logic will be updated to be context-aware, correctly parsing sheet names and ranges.

#### **Current Flawed Code (`excel-addin/src/hooks/useDiffPreview.ts`)**
```typescript
// Simulate operations on a workbook snapshot to create the "after" state
async function simulateOperations(
  before: WorkbookSnapshot,
  operations: AISuggestedOperation[]
): Promise<WorkbookSnapshot> {
  // Create a deep copy of the before state
  const after: WorkbookSnapshot = JSON.parse(JSON.stringify(before))
  
  for (const op of operations) {
    switch (op.tool) {
      case 'write_range':
        simulateWriteRange(after, op.input)
        break
      case 'apply_formula':
        simulateApplyFormula(after, op.input)
        break
      case 'clear_range':
        simulateClearRange(after, op.input)
        break
      // Add more tools as needed
    }
  }
  
  return after
}

function simulateWriteRange(snapshot: WorkbookSnapshot, input: any) {
  const { range, values } = input
  if (!range || !values) return
  
  // Parse range (simplified - assumes current sheet)
  const sheet = 'Sheet1' // <<< BUG: Hardcoded sheet name
  const match = range.match(/([A-Z]+)(\d+)(?::([A-Z]+)(\d+))?/) // <<< BUG: Overly simple regex
  if (!match) return
  
  const startCol = columnToIndex(match[1])
  const startRow = parseInt(match[2]) - 1
  
  // Apply values
  for (let i = 0; i < values.length; i++) {
    for (let j = 0; j < values[i].length; j++) {
      const key = `${sheet}!${indexToColumn(startCol + j)}${startRow + i + 1}`
      snapshot[key] = { v: values[i][j] }
    }
  }
}

function simulateApplyFormula(snapshot: WorkbookSnapshot, input: any) {
  const { range, formula } = input
  if (!range || !formula) return
  
  const sheet = 'Sheet1' // <<< BUG: Hardcoded sheet name
  const key = `${sheet}!${range}`
  snapshot[key] = { f: formula }
}

function simulateClearRange(snapshot: WorkbookSnapshot, input: any) {
  const { range } = input
  if (!range) return
  
  // Simple implementation - just delete the keys
  const sheet = 'Sheet1' // <<< BUG: Hardcoded sheet name
  const keyPrefix = `${sheet}!`
  
  // This is simplified - in reality we'd parse the range properly
  Object.keys(snapshot).forEach(key => {
    if (key.startsWith(keyPrefix) && key.includes(range)) {
      delete snapshot[key] // <<< BUG: Incorrectly implemented
    }
  })
}
```

#### **Proposed New Code (`excel-addin/src/hooks/useDiffPreview.ts`)**
```typescript
// In initiatePreview function, get the active sheet name first
const initiatePreview = useCallback(async (operations: AISuggestedOperation[]) => {
    setIsLoading(true)
    setError(null)
    setStatus('computing')

    try {
      // Get active sheet name to provide context for simulation
      const excelService = ExcelService.getInstance();
      const activeSheetName = (await excelService.getContext()).worksheet;

      // Get current state (before)
      const before = await excelService.createWorkbookSnapshot({
        rangeAddress: 'UsedRange',
        includeFormulas: true,
        includeStyles: false,
        maxCells: 50000
      })

      // Simulate operations to create "after" state
      const after = await simulateOperations(before, operations, activeSheetName)

      // --- Add Diagnostic Logging ---
      console.log("--- Diff Preview ---");
      console.log("Active Sheet:", activeSheetName);
      console.log("Operations to simulate:", operations);
      console.log("BEFORE snapshot:", JSON.parse(JSON.stringify(before)));
      console.log("AFTER snapshot:", JSON.parse(JSON.stringify(after)));
      // --- End Diagnostic Logging ---

      // Store operations for later execution
      useDiffStore.setState({ pendingOperations: operations })

      // ... (rest of the function remains the same)

// ...

// Updated simulation functions
async function simulateOperations(
  before: WorkbookSnapshot,
  operations: AISuggestedOperation[],
  activeSheetName: string // Pass down active sheet context
): Promise<WorkbookSnapshot> {
  const after: WorkbookSnapshot = JSON.parse(JSON.stringify(before))
  
  for (const op of operations) {
    switch (op.tool) {
      case 'write_range':
        simulateWriteRange(after, op.input, activeSheetName)
        break
      case 'apply_formula':
        simulateApplyFormula(after, op.input, activeSheetName)
        break
      case 'clear_range':
        // This tool is not fully implemented in the original code, so we'll skip it for now.
        break
    }
  }
  
  return after
}

function parseRange(rangeStr: string, activeSheetName: string): { sheet: string, startRow: number, startCol: number } | null {
    let sheet = activeSheetName;
    let rangePart = rangeStr;

    if (rangeStr.includes('!')) {
        [sheet, rangePart] = rangeStr.split('!');
    }

    const match = rangePart.match(/([A-Z]+)(\d+)/);
    if (!match) return null;

    const startCol = columnToIndex(match[1]);
    const startRow = parseInt(match[2], 10) - 1;

    return { sheet, startRow, startCol };
}

function simulateWriteRange(snapshot: WorkbookSnapshot, input: any, activeSheetName: string) {
  const { range, values } = input
  if (!range || !values) return

  const parsedRange = parseRange(range, activeSheetName);
  if (!parsedRange) return;

  const { sheet, startRow, startCol } = parsedRange;
  
  for (let i = 0; i < values.length; i++) {
    for (let j = 0; j < values[i].length; j++) {
      const cellValue = values[i][j];
      // Skip empty values to avoid overwriting existing data with blanks
      if (cellValue === null || cellValue === undefined || cellValue === '') continue;

      const key = `${sheet}!${indexToColumn(startCol + j)}${startRow + i + 1}`
      
      // Ensure the cell snapshot exists
      if (!snapshot[key]) {
        snapshot[key] = {};
      }
      snapshot[key]!.v = cellValue;
    }
  }
}

function simulateApplyFormula(snapshot: WorkbookSnapshot, input: any, activeSheetName: string) {
  const { range, formula } = input
  if (!range || !formula) return

  const parsedRange = parseRange(range, activeSheetName);
  if (!parsedRange) return;

  const { sheet, startRow, startCol } = parsedRange;

  // For now, we assume a single-cell formula application as multi-cell is complex
  const key = `${sheet}!${indexToColumn(startCol)}${startRow + 1}`;
  
  if (!snapshot[key]) {
    snapshot[key] = {};
  }
  snapshot[key]!.f = formula;
}
```

---

## 3. Part 2: Fix the Edit Application Logic

The "Incorrect Edit" problem is caused by similar context-awareness issues within `ExcelService.ts`. The methods that execute tool requests often fail to identify the correct worksheet, especially when the target is not the currently active sheet. They also have insufficient error handling, causing them to fail silently.

### **File to be Modified:**
- `/Users/brendantoole/projects2/gridmate/excel-addin/src/services/excel/ExcelService.ts`

### **Proposed Code Changes:**

The tool execution methods will be refactored to correctly parse sheet names from range strings and to provide more descriptive errors.

#### **Current Flawed Code (`excel-addin/src/services/excel/ExcelService.ts`)**
```typescript
  private async toolWriteRange(input: any): Promise<any> {
    const { range, values /*, preserve_formatting = true*/ } = input
    
    return Excel.run(async (context: any) => {
      const worksheet = context.workbook.worksheets.getActiveWorksheet() // <<< BUG: Always uses active sheet
      const excelRange = worksheet.getRange(range)
      
      // ... (validation logic) ...
      
      excelRange.values = cleanedValues
      await context.sync()
      
      return {
        message: 'Range written successfully',
        status: 'success'
      }
    })
  }

  private async toolApplyFormula(input: any): Promise<any> {
    const { range, formula, relative_references = true } = input
    
    return Excel.run(async (context: any) => {
      const worksheet = context.workbook.worksheets.getActiveWorksheet() // <<< BUG: Always uses active sheet
      const excelRange = worksheet.getRange(range)
      
      // ... (logic) ...
      
      try {
        // ...
        excelRange.formula = formula
        // ...
        await context.sync()
        
        return {
          message: 'Formula applied successfully',
          status: 'success',
        }
      } catch (error) {
        // <<< BUG: Generic error handling
        throw new Error(`Failed to apply formula "${formula}" to range "${range}": ${(error as Error).message}.`)
      }
    })
  }
```

#### **Proposed New Code (`excel-addin/src/services/excel/ExcelService.ts`)**
```typescript
  private async getWorksheetFromRange(context: any, rangeStr: string): Promise<{worksheet: any, rangeAddress: string}> {
      let sheetName: string | null = null;
      let rangeAddress = rangeStr;

      if (rangeStr.includes('!')) {
          const parts = rangeStr.split('!');
          sheetName = parts[0].replace(/'/g, ''); // Remove single quotes
          rangeAddress = parts[1];
      }

      const worksheet = sheetName 
          ? context.workbook.worksheets.getItem(sheetName)
          : context.workbook.worksheets.getActiveWorksheet();
      
      return { worksheet, rangeAddress };
  }

  private async toolWriteRange(input: any): Promise<any> {
    const { range, values } = input
    
    return Excel.run(async (context: any) => {
      try {
        const { worksheet, rangeAddress } = await this.getWorksheetFromRange(context, range);
        const excelRange = worksheet.getRange(rangeAddress);
        
        const cleanedValues = values.map((row: any[]) =>
          row.map((cell: any) => (cell === undefined || cell === null) ? '' : cell)
        );
        
        console.log(`✍️ Writing to range ${range} on sheet ${worksheet.name}:`, cleanedValues);
        
        excelRange.values = cleanedValues;
        await context.sync();
        
        return { message: 'Range written successfully', status: 'success' };

      } catch (error) {
        console.error(`❌ Failed to write to range ${range}:`, error);
        if (error instanceof Error && (error as any).code === 'ItemNotFound') {
             throw new Error(`Sheet or range not found for "${range}". Please ensure the sheet exists.`);
        }
        throw new Error(`Failed to write to range "${range}": ${(error as Error).message}`);
      }
    })
  }

  private async toolApplyFormula(input: any): Promise<any> {
    const { range, formula } = input
    
    return Excel.run(async (context: any) => {
      try {
        const { worksheet, rangeAddress } = await this.getWorksheetFromRange(context, range);
        const excelRange = worksheet.getRange(rangeAddress);
        
        console.log(`🔧 Applying formula "${formula}" to range ${range} on sheet ${worksheet.name}`);
        
        excelRange.formulas = [[formula]]; // Apply to the top-left cell of the range
        await context.sync();
        
        return { message: 'Formula applied successfully', status: 'success' };

      } catch (error) {
        console.error(`❌ Failed to apply formula to range ${range}:`, error);
        if (error instanceof Error && (error as any).code === 'ItemNotFound') {
             throw new Error(`Sheet or range not found for "${range}". Please ensure the sheet exists.`);
        }
        throw new Error(`Failed to apply formula to range "${range}": ${(error as Error).message}`);
      }
    })
  }
```

---

## 4. Verification Plan

After implementing the fixes above, the following scenarios must be tested thoroughly to ensure the issues are resolved and no regressions have been introduced.

1.  **Blank Sheet Test:**
    - **Action:** Open a new, blank Excel sheet. Ask the AI to "write 'Hello' in B2".
    - **Expected Result:** The cell B2 should highlight in green, and the Diff Preview Bar should appear. Clicking "Apply" should write "Hello" to B2 and clear the highlight.

2.  **Non-Active Sheet Test:**
    - **Action:** Create two sheets, `Sheet1` and `Sheet2`. While on `Sheet1`, ask the AI to "write 'Data' in cell C3 on Sheet2".
    - **Expected Result:** The view should **not** switch. The diff preview should still be initiated. When you switch to `Sheet2`, you should see cell C3 highlighted. Applying the diff should correctly write the data to `Sheet2!C3`.

3.  **Formula Application Test:**
    - **Action:** In cells A1 and A2, enter the numbers 5 and 10. In cell C1, ask the AI to "sum cells A1 and A2".
    - **Expected Result:** Cell C1 should highlight (e.g., in blue for a formula change). The preview should show the formula `=SUM(A1:A2)`. Applying the diff should place the formula in C1, and the cell should display the value 15.

4.  **Incorrect Edit Rejection Test:**
    - **Action:** Ask the AI to perform a non-sensical action, like "write my name in cell A1:Z1000".
    - **Expected Result:** A visual diff should appear, highlighting a large range. The user should be able to click "Cancel" or "Reject" on the `DiffPreviewBar`, which should clear all highlights and make no changes to the sheet.