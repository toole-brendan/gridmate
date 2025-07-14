# AI Context Update Implementation Plan

## Overview
This plan addresses critical issues with AI context awareness during tool execution, particularly when operations are queued for user approval. The goal is to ensure the AI maintains accurate state awareness and responds appropriately to queued operations.

## Issues to Address

1. **Stale Context**: AI context shows "spreadsheet is currently empty" even after successful writes
2. **Poor Error Reporting**: Frontend tool responses with errors don't include error details
3. **Queued Operation Handling**: AI doesn't understand queued status and treats it as failure
4. **Context Refresh**: Context isn't updated between tool executions
5. **Performance**: Multiple operations queued separately instead of batched
6. **Response Details**: Success responses lack operation details

## Implementation Plan

### Phase 1: Enhanced Tool Response Handling (Priority: CRITICAL)

#### 1.1 Update Tool Executor Response Format
**File**: `backend/internal/services/ai/tool_executor.go`

**Changes Needed**:
- Modify `ExecuteTool` method to handle queued status differently
- Instead of returning error for queued operations, return success with special status
- Include operation details in all responses

**Implementation**:
```go
// Current problematic code:
if err.Error() == "Tool execution queued for user approval" {
    result.IsError = false
    result.Content = map[string]string{"status": "queued", "message": "Write range operation queued for user approval"}
    return result, nil
}

// Should be:
type ToolResult struct {
    Content     interface{}
    IsError     bool
    Status      string // "success", "queued", "error"
    Details     map[string]interface{} // Operation-specific details
}
```

#### 1.2 Create Queued Operation Registry
**New File**: `backend/internal/services/queued_operations.go`

**Purpose**: Track queued operations and their eventual results
- Store queued operation details with request IDs
- Update when operations complete
- Provide status queries for AI context

### Phase 2: Dynamic Context Updates (Priority: HIGH)

#### 2.1 Implement Context Refresh Mechanism
**File**: `backend/internal/services/ai/service.go`

**Changes Needed**:
- After each tool execution, refresh the context
- Maintain a "working state" that includes pending changes
- Update `ProcessChatWithToolsAndHistory` to use refreshed context

**Implementation Steps**:
1. Create `RefreshContext` method that:
   - Reads current spreadsheet state
   - Includes pending operations
   - Updates the system prompt dynamically
2. Call `RefreshContext` after each tool round
3. Include pending operations in context

#### 2.2 Create Incremental Context Builder
**File**: `backend/internal/services/excel/context_builder.go`

**New Methods**:
- `BuildIncrementalContext`: Updates existing context with changes
- `TrackCellChanges`: Records what cells were modified
- `GetPendingOperations`: Returns list of queued operations

### Phase 3: Enhanced Frontend Error Reporting (Priority: HIGH)

#### 3.1 Update SignalR Tool Response Format
**File**: `signalr-service/GridmateSignalR/Hubs/GridmateHub.cs`

**Changes Needed**:
```csharp
public class ToolResponseMessage
{
    public string SessionId { get; set; }
    public string RequestId { get; set; }
    public object Result { get; set; }
    public string Error { get; set; }
    public string ErrorDetails { get; set; } // NEW
    public Dictionary<string, object> Metadata { get; set; } // NEW
}
```

#### 3.2 Update Excel Add-in Error Handling
**File**: `excel-addin/src/services/excel/ExcelService.ts`

**Changes Needed**:
- Catch and format all errors with details
- Include context about what operation failed
- Return structured error responses

### Phase 4: AI System Prompt Enhancement (Priority: HIGH)

#### 4.1 Update System Prompt Generation
**File**: `backend/internal/services/ai/service.go`

**New System Prompt Template**:
```
Current Context:
Workbook: {workbook_name}
Worksheet: {worksheet_name}
Last Modified: {timestamp}

Recent Operations:
{list_of_recent_operations}

Pending Operations (Awaiting Approval):
{list_of_queued_operations}

Current Data:
{current_spreadsheet_snapshot}

Instructions:
- When operations return "queued" status, they are pending user approval
- Continue planning but don't retry queued operations
- Reference pending operations when planning next steps
```

### Phase 5: Operation Batching (Priority: MEDIUM)

#### 5.1 Implement Batch Operation Queue
**File**: `backend/internal/services/ai/tool_executor.go`

**New Features**:
- Detect related operations (e.g., multiple writes to same area)
- Group operations for single approval
- Present batched operations clearly to user

#### 5.2 Update Frontend Batch Handling
**File**: `excel-addin/src/components/chat/ChatInterfaceWithSignalR.tsx`

**Changes Needed**:
- Display batched operations as grouped items
- Allow approve/reject all or selective approval
- Show operation relationships

### Phase 6: Detailed Success Responses (Priority: MEDIUM)

#### 6.1 Enhance Tool Response Details
**Files**: All tool methods in `backend/internal/services/excel/excel_bridge_impl.go`

**For Each Tool Method**:
```go
// Example for WriteRange
return map[string]interface{}{
    "status": "success",
    "operation": "write_range",
    "details": map[string]interface{}{
        "range": rangeAddr,
        "cells_written": len(values) * len(values[0]),
        "values_summary": generateValuesSummary(values),
        "timestamp": time.Now(),
    },
}
```

### Phase 7: Testing and Validation

#### 7.1 Unit Tests
- Test context refresh after operations
- Test queued operation handling
- Test error reporting with details
- Test batch operation detection

#### 7.2 Integration Tests
- Full flow with queued operations
- Context accuracy after multiple operations
- Error propagation from frontend to AI
- Batch operation approval flow

## Implementation Order

1. **Week 1**: Phase 1 (Tool Response Handling) + Phase 4 (System Prompt)
   - Critical for immediate improvement
   - Minimal code changes required

2. **Week 2**: Phase 2 (Dynamic Context) + Phase 3 (Error Reporting)
   - Addresses core context awareness issues
   - Improves debugging capabilities

3. **Week 3**: Phase 5 (Batching) + Phase 6 (Detailed Responses)
   - Performance and UX improvements
   - Better operation visibility

4. **Week 4**: Phase 7 (Testing) + Rollout
   - Comprehensive testing
   - Documentation updates

## Success Metrics

1. **Context Accuracy**: AI correctly references current spreadsheet state
2. **Queued Operation Handling**: No retry attempts on queued operations
3. **Error Clarity**: All errors include actionable details
4. **Performance**: Reduced number of approval prompts through batching
5. **User Experience**: Clear understanding of what operations will do

## Risk Mitigation

1. **Backward Compatibility**: Ensure changes work with existing frontend versions
2. **Performance Impact**: Monitor context refresh performance on large spreadsheets
3. **Memory Usage**: Implement cleanup for old queued operations
4. **Concurrency**: Handle multiple users/sessions correctly

## Configuration Requirements

### Environment Variables
```bash
# New configuration options
CONTEXT_REFRESH_ENABLED=true
OPERATION_BATCH_SIZE=10
QUEUED_OPERATION_TIMEOUT=300s
CONTEXT_CACHE_TTL=60s
```

### Feature Flags
```go
type Features struct {
    DynamicContextRefresh  bool
    OperationBatching      bool
    EnhancedErrorReporting bool
    DetailedResponses      bool
}
```

## Monitoring and Logging

### New Log Points
1. Context refresh duration and size
2. Queued operation lifecycle
3. Batch detection and grouping
4. Error detail capture
5. AI retry patterns

### Metrics to Track
- Context refresh time
- Queued operations per session
- Approval wait times
- Retry attempts on queued operations
- Context size growth

## Documentation Updates

1. Update API documentation with new response formats
2. Document queued operation handling for AI prompt engineering
3. Create troubleshooting guide for context issues
4. Update frontend integration guide

## Rollback Plan

1. Feature flags for all new functionality
2. Ability to disable context refresh
3. Fallback to simple responses
4. Version compatibility checks

## Long-term Improvements

1. **Predictive Context Loading**: Pre-load likely needed context
2. **Differential Context Updates**: Only send changes, not full context
3. **AI Learning**: Train AI on common operation patterns
4. **Smart Batching**: ML-based operation grouping
5. **Context Compression**: Reduce context size for large models