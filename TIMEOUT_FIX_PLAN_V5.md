# Comprehensive Plan to Fix Application Timeout Issue and Restore Diff Previews - V5

## 1. Overview

The application is suffering from a critical regression where the diff preview functionality is broken, and the performance issues due to sequential tool calls persist. This plan will address both issues by implementing a robust, end-to-end batching system that is fully integrated with the diff preview workflow.

The root cause of the problem is two-fold:
1.  The backend sends tool calls to the frontend one by one, and the frontend executes them sequentially, leading to performance bottlenecks and timeouts.
2.  The previous attempt to fix this broke the diff preview functionality by bypassing the preview generation step.

This plan will rectify these issues by modifying both the frontend and backend to handle tool calls in batches, generate a single diff preview for the entire batch, and execute the batch as a single atomic operation.

## 2. The Plan

### 2.1. Frontend: Implement a Debounced Batching and Preview System

The frontend will be responsible for collecting individual tool requests into a batch, generating a preview for the batch, and then executing the batch upon user approval.

#### 2.1.1. Update `useMessageHandlers.ts` to Batch Write Operations

I will modify `useMessageHandlers.ts` to collect all incoming `write` tool requests into a queue. A debouncing mechanism will be used to wait for a pause in the stream of requests before processing the batch.

**File:** `excel-addin/src/hooks/useMessageHandlers.ts`

```typescript
// ... existing code
const writeRequestQueue = useRef<SignalRToolRequest[]>([]);
const writeBatchTimeout = useRef<NodeJS.Timeout | null>(null);

const processWriteBatch = useCallback(async () => {
    const requests = writeRequestQueue.current;
    writeRequestQueue.current = [];
    writeBatchTimeout.current = null;

    if (requests.length === 0) return;

    addDebugLog(`Processing batch of ${requests.length} write requests`);

    const operations: AISuggestedOperation[] = requests.map(req => ({
        tool: req.tool,
        input: req,
        description: `Execute ${req.tool}`
    }));

    // Generate a single preview for the entire batch
    await diffPreview.generatePreview(currentMessageIdRef.current || 'unknown', operations);
}, [addDebugLog, diffPreview]);

const handleToolRequest = useCallback(async (toolRequest: SignalRToolRequest) => {
    addDebugLog(`← Received tool_request: ${toolRequest.tool} (${toolRequest.request_id})`);

    if (WRITE_TOOLS.has(toolRequest.tool)) {
        writeRequestQueue.current.push(toolRequest);

        if (writeBatchTimeout.current) {
            clearTimeout(writeBatchTimeout.current);
        }

        writeBatchTimeout.current = setTimeout(() => {
            processWriteBatch();
        }, 200); // A longer delay to ensure all tool calls in a turn are received

    } else if (toolRequest.tool === 'read_range') {
        // ... existing read_range batching logic remains
    } else {
        // ... existing logic for non-batchable tools
    }
}, [addDebugLog, processWriteBatch, processReadBatch]);
// ... existing code
```

#### 2.1.2. Update `useDiffPreview.ts` to Execute Batches

I will update `useDiffPreview.ts` to execute the entire batch of operations when the user accepts the preview.

**File:** `excel-addin/src/hooks/useDiffPreview.ts`

```typescript
// ... existing code
  const acceptCurrentPreview = useCallback(async () => {
    if (!store.activePreview) return;
    const { messageId, operations, hunks } = store.activePreview;

    try {
      // Execute the entire batch of operations
      const results = await excelService.batchExecuteToolRequests(operations.map(op => op.input));

      // Persist the final state to the message
      chatManager.updateMessageDiff(messageId, {
        operations,
        hunks,
        status: 'accepted',
        timestamp: Date.now(),
      });

      // Clear the live preview session
      store.clearPreview();
      await GridVisualizer.clearHighlights(hunks);

      // Send the results back to the backend
      for (let i = 0; i < results.length; i++) {
        await signalRClientRef.current?.send({
          type: 'tool_response',
          data: {
            request_id: operations[i].input.request_id,
            result: results[i],
            error: null,
            queued: false
          }
        });
      }

    } catch (error) {
      // ... error handling
    }
  }, [store, excelService, chatManager]);
// ... existing code
```

#### 2.1.3. Create `batchExecuteToolRequests` in `ExcelService.ts`

I will create the `batchExecuteToolRequests` method in `ExcelService.ts` to process the batched requests in a single `Excel.run` call.

**File:** `excel-addin/src/services/excel/ExcelService.ts`

```typescript
// ... existing code
  public async batchExecuteToolRequests(requests: any[]): Promise<any[]> {
    return Excel.run(async (context: any) => {
      const results = [];
      for (const request of requests) {
        let result;
        switch (request.tool) {
          case 'write_range':
            result = await this.toolWriteRange(request, context);
            break;
          case 'apply_formula':
            result = await this.toolApplyFormula(request, context);
            break;
          case 'format_range':
            result = await this.toolFormatRange(request, context);
            break;
          default:
            result = { error: `Tool ${request.tool} is not batchable` };
        }
        results.push(result);
      }
      await context.sync();
      return results;
    });
  }

  // Modify existing tool handlers to accept an optional context
  private async toolWriteRange(input: any, excelContext?: any): Promise<any> {
    const { range, values } = input;
    const run = async (context: any) => {
      const { worksheet, rangeAddress } = await this.getWorksheetFromRange(context, range);
      const excelRange = worksheet.getRange(rangeAddress);
      excelRange.values = values;
      if (!excelContext) {
        await context.sync();
      }
      return { message: 'Range written successfully', status: 'success' };
    };

    if (excelContext) {
        return run(excelContext);
    }
    return Excel.run(run);
  }

  private async toolApplyFormula(input: any, excelContext?: any): Promise<any> {
    const { range, formula } = input;
    const run = async (context: any) => {
      const { worksheet, rangeAddress } = await this.getWorksheetFromRange(context, range);
      const excelRange = worksheet.getRange(rangeAddress);
      excelRange.formulas = [[formula]];
      if (!excelContext) {
        await context.sync();
      }
      return { message: 'Formula applied successfully', status: 'success' };
    };

    if (excelContext) {
        return run(excelContext);
    }
    return Excel.run(run);
  }

  private async toolFormatRange(input: any, excelContext?: any): Promise<any> {
    const { range, number_format, font, fill_color, alignment } = input;
    const run = async (context: any) => {
        // ... existing implementation, but without context.sync() at the end
        if (!excelContext) {
            await context.sync();
        }
    };

    if (excelContext) {
        return run(excelContext);
    }
    return Excel.run(run);
  }
// ... existing code
```

### 2.2. Backend: No Changes Required

The backend will continue to send tool calls individually. The frontend will now be responsible for batching them. This is a more robust and flexible approach, as it keeps the backend simple and allows the frontend to control the batching and previewing logic.

## 3. Validation

After implementing these changes, I will validate the fix by:

1.  **Running the application** and asking the AI to create a complex financial model.
2.  **Verifying that a single diff preview is generated** for the entire set of changes.
3.  **Accepting the diff preview** and confirming that all operations are executed correctly in a single batch.
4.  **Monitoring the logs** to ensure that the application no longer times out and that the UI remains responsive.

This plan will restore the critical diff preview functionality while also implementing a true end-to-end batching system, which will resolve the timeout issues and dramatically improve the performance and reliability of the application.
