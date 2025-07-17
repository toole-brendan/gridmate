# Practical Plan to Fix Application Timeout Issues - V6

## Executive Summary

The application experiences timeouts due to inefficient handling of write operations, not because of a lack of batching in the diff preview system. This plan addresses the root causes while preserving the valuable diff preview functionality and respecting the backend's request/response contract.

## Current State Analysis

### 1. Existing Systems
- **BatchExecutor**: Already handles batching for `write_range`, `apply_formula`, and `format_range`
- **Diff Preview**: Provides visual feedback for write operations (valuable UX feature)
- **Read Batching**: Efficiently batches `read_range` operations

### 2. The Real Problem
- Write operations are split between BatchExecutor and diff preview based on arbitrary criteria
- Some tools marked as "batchable" bypass preview entirely
- The backend sends tool requests individually and expects individual responses
- The segregation creates confusion and inefficiency

### 3. Architecture Constraints
- Backend sends individual tool requests via SignalR
- Backend expects a `tool_response` for EACH `tool_request`
- Timeouts occur when responses are delayed
- The preview system is valuable for user experience

## Solution Overview

Instead of creating a new batching system, we'll:
1. Optimize the existing BatchExecutor
2. Make preview generation asynchronous
3. Send immediate "acknowledged" responses to prevent timeouts
4. Batch the actual Excel operations while maintaining individual request tracking

## Implementation Plan

### Phase 1: Immediate Response System

#### 1.1 Update `useMessageHandlers.ts` - Acknowledge All Tool Requests Immediately

```typescript
const handleToolRequest = useCallback(async (toolRequest: SignalRToolRequest) => {
    addDebugLog(`← Received tool_request: ${toolRequest.tool} (${toolRequest.request_id})`);
    
    // Send immediate acknowledgment to prevent backend timeout
    await signalRClientRef.current?.send({
      type: 'tool_response',
      data: {
        request_id: toolRequest.request_id,
        result: { 
          status: 'acknowledged', 
          message: `${toolRequest.tool} request received and processing` 
        },
        error: null,
        queued: true, // Indicates further processing needed
        acknowledged: true // New field to indicate this is just an ack
      }
    });

    // Now process the tool based on type
    if (WRITE_TOOLS.has(toolRequest.tool)) {
      // Check if preview is requested
      const shouldPreview = toolRequest.preview !== false;
      
      if (shouldPreview && autonomyMode !== 'full-autonomy') {
        // Queue for preview
        await queueForPreview(toolRequest);
      } else {
        // Queue for batch execution without preview
        await queueForBatchExecution(toolRequest);
      }
    } else if (toolRequest.tool === 'read_range') {
      // Existing read batching logic
      readRequestQueue.current.push(toolRequest);
      if (batchTimeout.current) {
        clearTimeout(batchTimeout.current);
      }
      batchTimeout.current = setTimeout(() => {
        processReadBatch();
      }, 50);
    } else {
      // Execute immediately
      try {
        const result = await ExcelService.getInstance().executeToolRequest(
          toolRequest.tool, 
          toolRequest
        );
        
        // Send final result
        await sendFinalToolResponse(toolRequest.request_id, result, null);
      } catch (error) {
        await sendFinalToolResponse(
          toolRequest.request_id, 
          null, 
          error instanceof Error ? error.message : 'Unknown error'
        );
      }
    }
}, [/* deps */]);
```

### Phase 2: Unified Write Operation Queue

#### 2.1 Create Write Operation Queue Manager

Create a new file `excel-addin/src/services/excel/WriteOperationQueue.ts`:

```typescript
export class WriteOperationQueue {
  private static instance: WriteOperationQueue;
  private previewQueue: Map<string, ToolRequest[]> = new Map();
  private executionQueue: ToolRequest[] = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private readonly BATCH_DELAY = 100; // ms

  public static getInstance(): WriteOperationQueue {
    if (!WriteOperationQueue.instance) {
      WriteOperationQueue.instance = new WriteOperationQueue();
    }
    return WriteOperationQueue.instance;
  }

  public queueForPreview(messageId: string, request: ToolRequest): void {
    const queue = this.previewQueue.get(messageId) || [];
    queue.push(request);
    this.previewQueue.set(messageId, queue);
    
    // Debounce preview generation
    this.schedulePreviewGeneration(messageId);
  }

  public queueForExecution(request: ToolRequest): void {
    this.executionQueue.push(request);
    this.scheduleBatchExecution();
  }

  private schedulePreviewGeneration(messageId: string): void {
    // Implementation for debounced preview generation
  }

  private scheduleBatchExecution(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }
    
    this.batchTimer = setTimeout(() => {
      this.executeBatch();
    }, this.BATCH_DELAY);
  }

  private async executeBatch(): Promise<void> {
    const batch = [...this.executionQueue];
    this.executionQueue = [];
    
    if (batch.length === 0) return;
    
    try {
      const results = await ExcelService.getInstance().batchExecuteToolRequests(
        batch.map(r => r.input)
      );
      
      // Send final responses for each request
      for (let i = 0; i < batch.length; i++) {
        await this.sendFinalResponse(batch[i].request_id, results[i], null);
      }
    } catch (error) {
      // Send error responses
      for (const request of batch) {
        await this.sendFinalResponse(
          request.request_id, 
          null, 
          error instanceof Error ? error.message : 'Batch execution failed'
        );
      }
    }
  }
}
```

### Phase 3: Optimize ExcelService Batch Execution

#### 3.1 Enhanced `batchExecuteToolRequests` in ExcelService

```typescript
public async batchExecuteToolRequests(requests: any[]): Promise<any[]> {
  // Group requests by type for optimal execution
  const grouped = this.groupRequestsByType(requests);
  
  return Excel.run(async (context: any) => {
    const results: any[] = new Array(requests.length);
    
    // Execute each group efficiently
    for (const [tool, groupRequests] of grouped) {
      const groupResults = await this.executeBatchByType(tool, groupRequests, context);
      
      // Map results back to original order
      groupResults.forEach((result, index) => {
        const originalIndex = groupRequests[index].originalIndex;
        results[originalIndex] = result;
      });
    }
    
    // Single sync for all operations
    await context.sync();
    return results;
  });
}

private groupRequestsByType(requests: any[]): Map<string, any[]> {
  const groups = new Map<string, any[]>();
  
  requests.forEach((request, index) => {
    const tool = request.tool;
    if (!groups.has(tool)) {
      groups.set(tool, []);
    }
    groups.get(tool)!.push({ ...request, originalIndex: index });
  });
  
  return groups;
}
```

### Phase 4: Backend Adjustments

#### 4.1 Update Backend to Handle Acknowledged Responses

In `backend/internal/handlers/signalr_handler.go`:

```go
// HandleSignalRToolResponse - update to handle acknowledged responses
if req.Acknowledged {
    // This is just an acknowledgment, don't process as final
    h.logger.Info("Received acknowledgment for tool request", 
        "request_id", req.RequestID)
    // Don't route to handler yet, wait for final response
    w.WriteHeader(http.StatusOK)
    json.NewEncoder(w).Encode(SignalRResponse{
        Success: true,
        Message: "Acknowledgment received",
    })
    return
}
```

### Phase 5: Preview System Optimization

#### 5.1 Asynchronous Preview Generation

Update `useDiffPreview.ts` to handle batched previews:

```typescript
const generateBatchedPreview = useCallback(async (
  messageId: string, 
  operations: AISuggestedOperation[]
) => {
  // Don't block on preview generation
  requestAnimationFrame(async () => {
    try {
      setIsCalculating(true);
      
      // Generate preview for all operations at once
      const snapshot = await excelService.createWorkbookSnapshot({
        rangeAddress: extractCombinedRange(operations),
        includeFormulas: true,
        includeStyles: false,
        maxCells: 50000
      });
      
      // Simulate all operations
      let simulatedSnapshot = snapshot;
      for (const op of operations) {
        simulatedSnapshot = await simulateOperation(simulatedSnapshot, op);
      }
      
      // Calculate and display diff
      const hunks = calculateDiff(snapshot, simulatedSnapshot);
      await GridVisualizer.applyHighlightsBatched(hunks, 50);
      
      // Store preview
      store.setActivePreview(messageId, operations, hunks, simulatedSnapshot);
      
    } catch (error) {
      console.error('[Diff Preview] Batch preview generation failed:', error);
    } finally {
      setIsCalculating(false);
    }
  });
}, [/* deps */]);
```

## Benefits of This Approach

1. **No Backend Changes Required**: The backend still receives individual responses
2. **Prevents Timeouts**: Immediate acknowledgments prevent timeout issues
3. **Preserves Preview System**: Diff preview continues to work as expected
4. **Actual Batching**: Excel operations are truly batched for performance
5. **Backwards Compatible**: Existing functionality remains intact

## Testing Strategy

1. **Unit Tests**: Test each component in isolation
2. **Integration Tests**: Test the full flow from backend to Excel
3. **Performance Tests**: Measure improvement in execution time
4. **Timeout Tests**: Verify no timeouts occur with large operations

## Rollback Plan

If issues arise:
1. Remove acknowledgment system (revert Phase 1)
2. Restore original handleToolRequest logic
3. The system will work as before

## Success Metrics

- Zero timeout errors for operations with < 1000 cells
- 50%+ reduction in execution time for batch operations
- Preview generation doesn't block tool execution
- All existing functionality remains working

## Implementation Timeline

- Phase 1: 2 hours (Immediate responses)
- Phase 2: 3 hours (Write queue manager)  
- Phase 3: 2 hours (ExcelService optimization)
- Phase 4: 1 hour (Backend updates)
- Phase 5: 2 hours (Preview optimization)
- Testing: 2 hours

Total: ~12 hours

This plan addresses the root causes of the timeout issues while preserving the valuable features of the current system. It's practical, implementable, and maintains backward compatibility. 