# Comprehensive Plan to Fix Application Timeout Issue - V2

## 1. Overview

The previous batching implementation was a good first step, but it did not fully address the timeout issue. The backend is now correctly identifying and creating batches of tool calls, but the frontend is still executing them sequentially, one by one. This continues to cause significant delays and timeouts.

This updated plan outlines the steps to implement a true batching mechanism on the frontend that will process all tool calls in a single, efficient `Excel.run` call. This will eliminate the sequential execution of tool calls and resolve the timeout issue.

## 2. The Plan

### 2.1. Frontend: Implement True Batching

The key to this solution is to modify the frontend to process an entire batch of tool calls within a single `Excel.run` block.

#### 2.1.1. Update `ExcelService.ts` to Process Batches

I will modify the `ExcelService.ts` to accept an array of tool calls and process them in a single `Excel.run` call. This will be the core of the new batching mechanism.

**File:** `excel-addin/src/services/excel/ExcelService.ts`

```typescript
// ... existing code

  // This will be the new entry point for batching
  public async batchExecuteToolRequests(requests: any[]): Promise<any[]> {
    return Excel.run(async (context: any) => {
      const results = [];
      for (const request of requests) {
        try {
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
        } catch (error) {
          results.push({ error: error.message });
        }
      }
      // The single context.sync() call that will make all the difference
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
      // No context.sync() here!
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
      // No context.sync() here!
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
        // ... existing implementation, but without context.sync()
    };

    if (excelContext) {
        return run(excelContext);
    }
    return Excel.run(run);
  }

// ... existing code
```

#### 2.1.2. Update `useMessageHandlers.ts` to Send Batches

I will update `useMessageHandlers.ts` to collect all the tool calls in a batch and send them to the `ExcelService` for processing.

**File:** `excel-addin/src/hooks/useMessageHandlers.ts`

```typescript
// ... existing code

  const handleToolRequest = useCallback(async (toolRequest: SignalRToolRequest) => {
    addDebugLog(`← Received tool_request: ${toolRequest.tool} (${toolRequest.request_id})`);
    
    // This will now be a simple check to see if the tool is a write tool
    if (WRITE_TOOLS.has(toolRequest.tool)) {
      // The backend will send a batch of tool calls, so we just need to execute them
      if (Array.isArray(toolRequest)) {
        addDebugLog(`Executing batch of ${toolRequest.length} write operations.`);
        try {
          const results = await ExcelService.getInstance().batchExecuteToolRequests(toolRequest);
          // Send back all the results
          for (let i = 0; i < results.length; i++) {
            await signalRClientRef.current?.send({
              type: 'tool_response',
              data: {
                request_id: toolRequest[i].request_id,
                result: results[i],
                error: null,
                queued: false
              }
            });
          }
        } catch (error) {
          // ... error handling
        }
      } else {
        // Handle single tool request as before
      }
    } else if (toolRequest.tool === 'read_range') {
      // ... existing read_range batching logic remains
    } else {
      // ... existing logic for non-batchable tools
    }
  }, [addDebugLog, autonomyMode, diffPreview, processReadBatch]);

// ... existing code
```

### 2.2. Backend: Send Batches of Tool Calls

The final piece of the puzzle is to modify the backend to send the entire batch of tool calls to the frontend at once, instead of one by one.

**File:** `backend/internal/services/ai/service.go`

```go
// ... existing code

// ProcessToolCalls processes multiple tool calls
func (s *Service) ProcessToolCalls(ctx context.Context, sessionID string, toolCalls []ToolCall) ([]ToolResult, error) {
	log.Info().
		Str("session_id", sessionID).
		Int("total_tools", len(toolCalls)).
		Interface("tool_names", getToolNames(toolCalls)).
		Msg("Processing tool calls")

	if s.toolExecutor == nil {
		log.Error().Msg("Tool executor not initialized")
		return nil, fmt.Errorf("tool executor not initialized")
	}

	// This will now send the entire batch to the frontend
	return s.toolExecutor.ExecuteToolBatch(ctx, sessionID, toolCalls)
}

// ... existing code
```

**File:** `backend/internal/services/ai/tool_executor.go`

```go
// ... existing code

// This is the new method that will send the batch to the frontend
func (te *ToolExecutor) ExecuteToolBatch(ctx context.Context, sessionID string, toolCalls []ToolCall) ([]ToolResult, error) {
    // Here, instead of looping and calling ExecuteTool, we will serialize the whole batch
    // and send it to the frontend via the ExcelBridge.
    
    // The ExcelBridge will need a new method, e.g., ExecuteBatch
    return te.excelBridge.ExecuteBatch(ctx, sessionID, toolCalls)
}

// ... existing code
```

## 3. Validation

After implementing these changes, I will validate the fix by:

1.  **Running the application** and asking the AI to create a complex financial model.
2.  **Monitoring the logs** to confirm that a single batch request is sent to the frontend and processed in one `Excel.run` call.
3.  **Verifying that the application no longer times out** and that the UI remains responsive.
4.  **Confirming that the model is created correctly** and that there are no new errors.

This updated plan will create a true end-to-end batching system that will resolve the timeout issues and dramatically improve the performance and reliability of the application.
