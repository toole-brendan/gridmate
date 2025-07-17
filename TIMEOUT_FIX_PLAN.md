# Comprehensive Plan to Fix Application Timeout Issue

## 1. Overview

The application is currently experiencing timeout issues due to the AI generating a large number of sequential `write_range` and `apply_formula` tool calls. Each of these calls triggers a separate `Excel.run` execution, which is an expensive operation that blocks the UI thread and creates a performance bottleneck.

This plan outlines the steps to implement a robust batching mechanism that will group these individual requests into a single, efficient `Excel.run` call. This will significantly reduce the number of round trips between the backend and the Excel add-in, improve performance, and prevent timeouts.

## 2. The Plan

### 2.1. Frontend: Implement a Unified Batching Mechanism

The core of the solution is to create a unified batching system in the frontend that can handle multiple types of tool requests (`write_range`, `apply_formula`, etc.) in a single batch.

#### 2.1.1. Create a `batchExecutor.ts` Service

I will create a new service to handle the batching logic. This will centralize the batching functionality and make it reusable.

**File:** `excel-addin/src/services/excel/batchExecutor.ts`

```typescript
import { ExcelService, RangeData } from './ExcelService';

export type BatchableRequest = {
  requestId: string;
  tool: string;
  input: any;
};

export class BatchExecutor {
  private static instance: BatchExecutor;
  private queue: BatchableRequest[] = [];
  private timeout: NodeJS.Timeout | null = null;

  public static getInstance(): BatchExecutor {
    if (!BatchExecutor.instance) {
      BatchExecutor.instance = new BatchExecutor();
    }
    return BatchExecutor.instance;
  }

  public queueRequest(request: BatchableRequest): Promise<any> {
    return new Promise((resolve, reject) => {
      const extendedRequest = { ...request, resolve, reject };
      this.queue.push(extendedRequest);
      if (this.timeout) {
        clearTimeout(this.timeout);
      }
      this.timeout = setTimeout(() => this.processQueue(), 50);
    });
  }

  private async processQueue(): Promise<void> {
    const requests = this.queue;
    this.queue = [];
    this.timeout = null;

    if (requests.length === 0) return;

    console.log(`[BatchExecutor] Processing batch of ${requests.length} requests`);

    try {
      const results = await ExcelService.getInstance().batchExecute(requests);
      results.forEach((result, i) => {
        requests[i].resolve(result);
      });
    } catch (error) {
      requests.forEach(request => {
        request.reject(error);
      });
    }
  }
}
```

#### 2.1.2. Add `batchExecute` to `ExcelService.ts`

I will add a `batchExecute` method to `ExcelService.ts` that will process the batched requests in a single `Excel.run` call.

**File:** `excel-addin/src/services/excel/ExcelService.ts`

```typescript
// ... existing code
  public async batchExecute(requests: BatchableRequest[]): Promise<any[]> {
    return Excel.run(async (context: any) => {
      const results = [];
      for (const request of requests) {
        try {
          let result;
          switch (request.tool) {
            case 'write_range':
              result = await this.toolWriteRange(request.input, context);
              break;
            case 'apply_formula':
              result = await this.toolApplyFormula(request.input, context);
              break;
            // Add other batchable tools here
            default:
              result = { error: `Tool ${request.tool} is not batchable` };
          }
          results.push(result);
        } catch (error) {
          results.push({ error: error.message });
        }
      }
      await context.sync();
      return results;
    });
  }

  // Modify existing tool handlers to accept an optional context
  private async toolWriteRange(input: any, excelContext?: any): Promise<any> {
    const { range, values } = input;
    const run = async (context: any) => {
        // ... existing implementation
    };

    if (excelContext) {
        return run(excelContext);
    }
    return Excel.run(run);
  }

  private async toolApplyFormula(input: any, excelContext?: any): Promise<any> {
    const { range, formula } = input;
    const run = async (context: any) => {
        // ... existing implementation
    };

    if (excelContext) {
        return run(excelContext);
    }
    return Excel.run(run);
  }
// ... existing code
```

#### 2.1.3. Update `useMessageHandlers.ts` to Use the Batch Executor

I will modify `useMessageHandlers.ts` to use the new `BatchExecutor` for all batchable tool requests.

**File:** `excel-addin/src/hooks/useMessageHandlers.ts`

```typescript
// ... existing code
import { BatchExecutor } from '../services/excel/batchExecutor';

// ...

  const handleToolRequest = useCallback(async (toolRequest: SignalRToolRequest) => {
    addDebugLog(`← Received tool_request: ${toolRequest.tool} (${toolRequest.request_id})`);
    
    const batchableTools = new Set(['write_range', 'apply_formula', 'format_range']);

    if (batchableTools.has(toolRequest.tool)) {
      addDebugLog(`Queueing batchable tool: ${toolRequest.tool}`);
      try {
        const result = await BatchExecutor.getInstance().queueRequest({
          requestId: toolRequest.request_id,
          tool: toolRequest.tool,
          input: toolRequest,
        });
        await signalRClientRef.current?.send({
          type: 'tool_response',
          data: {
            request_id: toolRequest.request_id,
            result: result,
            error: null,
            queued: false
          }
        });
      } catch (error) {
        // ... error handling
      }
    } else if (toolRequest.tool === 'read_range') {
      // ... existing read_range batching logic remains
    } else {
      // ... existing logic for non-batchable tools
    }
  }, [addDebugLog, autonomyMode, diffPreview, processReadBatch]);

// ... existing code
```

### 2.2. Backend: Ensure Proper Tool Call Generation

The backend should continue to generate individual tool calls. The frontend batching mechanism will handle the grouping of these calls. No significant changes are required on the backend for this fix.

## 3. Validation

After implementing these changes, I will validate the fix by:

1.  **Running the application** and asking the AI to create a complex financial model (e.g., a DCF model).
2.  **Monitoring the logs** to ensure that multiple `write_range` and `apply_formula` requests are processed in a single batch.
3.  **Verifying that the application no longer times out** and that the UI remains responsive during the operation.
4.  **Confirming that the model is created correctly** in the Excel sheet.

This plan will effectively address the timeout issue by optimizing the way tool requests are handled, leading to a more performant and reliable application.
