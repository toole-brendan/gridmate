# Performance and Stability Fix Plan

## 1. Introduction & Goal

The application is currently unstable and slow. The latest logs have pinpointed two distinct root causes:
1.  **Critical Stability Bug:** A function in the diff simulator (`diffSimulator.ts`) generates invalid cell keys (e.g., `Sheet1!1:1` instead of `Sheet1!A1`), causing the client-side diff utility to throw errors and crash the add-in.
2.  **Severe Performance Bottleneck:** The AI backend sends a large volume of individual `read_range` requests. The frontend handles each with a separate, heavyweight `Excel.run` call, which blocks the UI thread and makes the application feel extremely sluggish and unresponsive.

The goal of this plan is to fix the stability bug by correcting the key generation logic and to resolve the performance bottleneck by implementing a request batching mechanism.

## 2. Proposed Solution

This solution will be implemented in two main steps, addressing stability first, then performance.

### Step 1: Fix the Invalid Cell Key Generation

We will correct the `cellKeyToString` function in the diff simulator to generate valid A1-style cell references.

**File to Modify:** `/Users/brendantoole/projects2/gridmate/excel-addin/src/utils/diffSimulator.ts`

**Actions:**
1.  Locate the `cellKeyToString` function. It currently returns an invalid format like `Sheet1!1:1`.
2.  Replace its logic with a new implementation that correctly converts 0-indexed row and column numbers into A1 notation (e.g., row `0`, col `0` becomes `A1`).
3.  We will need a helper function to convert a column index to its letter representation (e.g., `0` -> `A`, `26` -> `AA`). This logic can be adapted from existing code in `ExcelService.ts` or written fresh.

**Corrected Implementation:**
```typescript
function cellKeyToString(cellKey: CellKey): string {
  // Converts a 0-indexed row and column to A1 notation.
  const colToLetter = (col: number): string => {
    let letter = '';
    let temp = col;
    while (temp >= 0) {
      letter = String.fromCharCode((temp % 26) + 65) + letter;
      temp = Math.floor(temp / 26) - 1;
    }
    return letter;
  };

  const rowA1 = cellKey.row + 1; // Convert 0-indexed row to 1-indexed
  const colA1 = colToLetter(cellKey.col);

  return `${cellKey.sheet}!${colA1}${rowA1}`;
}

// The parseCell function also needs to be adjusted to use 0-based indexing internally
// to match the new cellKeyToString function.
function parseCell(cellRef: string): { row: number; col: number } {
  const match = cellRef.match(/^([A-Z]+)(\d+)$/);
  if (!match) {
    throw new Error(`Invalid cell reference: ${cellRef}`);
  }
  
  const colStr = match[1];
  const rowStr = match[2];
  
  let col = 0;
  for (let i = 0; i < colStr.length; i++) {
    col = col * 26 + (colStr.charCodeAt(i) - 'A'.charCodeAt(0));
  }
  
  return { row: parseInt(rowStr, 10) - 1, col }; // Return 0-indexed
}
```
*(Note: The `parseCell` function may also need slight adjustments to ensure consistent 0-based indexing).*

### Step 2: Implement Request Batching for Read Operations

To solve the performance issue, we will introduce a batching mechanism that collects multiple `read_range` requests and executes them in a single `Excel.run` call.

**File to Modify:** `/Users/brendantoole/projects2/gridmate/excel-addin/src/hooks/useMessageHandlers.ts`

**Actions:**
1.  Introduce two new `useRef` variables: `const readRequestQueue = useRef([]);` and `const batchTimeout = useRef(null);`.
2.  In `handleToolRequest`, when a `read_range` request is received, do not execute it immediately. Instead, add it to the `readRequestQueue.current`.
3.  After adding the request to the queue, set a short timeout (e.g., 50ms) using `batchTimeout`. If a timeout is already pending, clear it and set a new one. This is a "debouncing" technique.
4.  When the timeout fires, it will call a new function, `processReadBatch`.

**New Function: `processReadBatch`**
- This function will take all the requests from `readRequestQueue.current` and clear the queue.
- It will then construct a **single `Excel.run`** call.
- Inside `Excel.run`, it will loop through each request, get the corresponding worksheet and range, and load the `values`, `formulas`, etc.
- After the single `context.sync()` call, it will loop through the results and send each one back to the backend as a separate `tool_response` message, matching the `request_id`.

**File to Modify:** `/Users/brendantoole/projects2/gridmate/excel-addin/src/services/excel/ExcelService.ts`

**Actions:**
1.  Create a new method `batchReadRange(requests: {requestId: string, range: string}[])`.
2.  This method will implement the logic described above for `processReadBatch`. It will take an array of requests and return a map of `requestId` to results.
3.  The `useMessageHandlers` hook will then call this new batch method.

This change will transform dozens of slow, sequential `Excel.run` calls into a single, fast, and efficient one, dramatically improving the add-in's responsiveness.

## 3. Verification Strategy

1.  **Stability Test:**
    - Trigger a multi-step write operation.
    - **Expected Result:** The application should now correctly generate the visual diff without any "Invalid cell reference" errors in the console. The UI should remain stable and not disconnect.
2.  **Performance Test:**
    - Trigger an operation that you know was previously slow.
    - **Expected Result:** The UI should remain responsive. The initial "thinking" phase may still take time (as the AI generates the requests), but the execution of the `read_range` tools should feel near-instantaneous.
3.  **Log Verification:**
    - Inspect the console logs.
    - **Expected Result:** You should see a log message indicating that a batch of N read requests is being processed, followed by a series of `tool_response` messages being sent. You should no longer see the one-by-one execution of `read_range`.
    - The `cellKeyToString` function should now produce valid A1-style keys.
