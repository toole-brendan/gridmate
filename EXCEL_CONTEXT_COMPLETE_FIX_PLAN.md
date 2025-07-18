# Comprehensive Fix Plan: Excel Context Data Flow and Operation Issues

## Executive Summary

This document outlines a comprehensive plan to fix three critical issues in the Gridmate Excel add-in:
1. Excel context data not properly flowing from frontend to backend
2. AI repeatedly writing to the same cells due to lack of awareness
3. Diff preview/application failures after the first 2 operations

## Problem Analysis

### Issue 1: Excel Context Data Flow Mismatch

**Root Cause**: The frontend sends Excel context data in a structure that the backend doesn't properly parse.

**Evidence**:
- Frontend sends `selectedData` and `nearbyData` objects with nested properties
- Backend expects these as `map[string]interface{}` but doesn't find the data
- Backend logs show "spreadsheet is currently empty" even after data is written

**Data Flow**:
1. Frontend (`RefactoredChatInterface.tsx`) sends:
   ```typescript
   excelContext: {
     worksheet: "Sheet1",
     workbook: "Workbook1", 
     selectedRange: "A1:G3",
     selectedData: {
       values: [[...], [...]],
       formulas: [[...], [...]],
       address: "A1:G3",
       rowCount: 3,
       colCount: 7
     },
     nearbyRange: undefined,
     activeContext: [...]
   }
   ```

2. Backend (`signalr_handler.go`) receives as `map[string]interface{}`

3. Backend (`excel_bridge.go`) tries to parse but:
   - Looks for `selectedData` in `additionalContext` but it's in the root context
   - The type assertions fail because of structure mismatch
   - `hasNonEmptyValues()` never gets called
   - Backend thinks spreadsheet is empty

### Issue 2: AI Writing to Same Cells Repeatedly

**Root Cause**: Backend determines `hasData = false` even when cells have data.

**Evidence**:
- AI outputs "organize financial model for Sheet1!A1:G1" multiple times
- Each chat request targets the same cells (A1:G1, A3:G3)
- Backend sends "Spreadsheet is empty" context to AI

**Why**: Because Issue 1 prevents the backend from seeing the Excel data, the AI thinks the spreadsheet is always empty.

### Issue 3: Diff Preview/Application Failures

**Root Cause**: Likely related to operation state management and completion callbacks.

**Evidence**:
- User reports "diffs only did not apply for the 2ND CHAT REQUEST"
- First request's operations work fine
- Subsequent requests fail to apply after first 2 operations

**Hypothesis**: Race conditions or state corruption when multiple operations are queued.

## Solution Architecture

### Phase 1: Fix Excel Context Data Structure

#### 1.1 Backend Context Parsing Fix

**File**: `/Users/brendantoole/projects2/gridmate/backend/internal/services/excel_bridge.go`

**Changes in `buildFinancialContext()` function (lines 620-722)**:
```go
// OLD: Looking in additionalContext
if selectedData, ok := additionalContext["selectedData"].(map[string]interface{}); ok {

// NEW: Look in the root context first, then fall back to additionalContext
var selectedData map[string]interface{}
if sd, ok := context["selectedData"].(map[string]interface{}); ok {
    selectedData = sd
} else if sd, ok := additionalContext["selectedData"].(map[string]interface{}); ok {
    selectedData = sd
}

if selectedData != nil {
    // Process the data...
}
```

#### 1.2 Add Nearbydata Support

**File**: `/Users/brendantoole/projects2/gridmate/excel-addin/src/components/chat/RefactoredChatInterface.tsx`

**Change line 227**:
```typescript
// OLD:
nearbyRange: excelContext?.nearbyRange,

// NEW:
nearbyData: excelContext?.nearbyData,
```

#### 1.3 Ensure Frontend Sends Complete Data

**File**: `/Users/brendantoole/projects2/gridmate/excel-addin/src/services/excel/ExcelService.ts`

**Verify `getSmartContext()` returns** (lines 400-515):
- `selectedData` with values, formulas, address
- `nearbyData` with values, formulas, address  
- Proper handling of blank sheets

### Phase 2: Fix Operation State Management

#### 2.1 Operation Registry Improvements

**File**: `/Users/brendantoole/projects2/gridmate/backend/internal/services/queued_operations.go`

**Add operation lifecycle logging**:
```go
func (r *QueuedOperationRegistry) MarkOperationComplete(operationID string, result interface{}) error {
    r.logger.WithFields(logrus.Fields{
        "operation_id": operationID,
        "message_id": op.MessageID,
        "sequence": fmt.Sprintf("%d/%d", completedCount+1, totalOps),
    }).Info("Marking operation complete")
    // ... existing code
}
```

#### 2.2 Prevent Duplicate Completion Attempts

**File**: `/Users/brendantoole/projects2/gridmate/backend/internal/handlers/signalr_handler.go`

**Add completion tracking in `HandleSignalRToolResponse()` (lines 300-324)**:
```go
// Track completed operations to prevent duplicates
if registry := h.excelBridge.GetQueuedOperationRegistry(); registry != nil {
    // Check if already completed
    status, _ := registry.GetOperationStatus(toolID)
    if status == services.StatusCompleted {
        h.logger.WithField("tool_id", toolID).Warn("Operation already completed, skipping")
        return
    }
    // Continue with marking complete...
}
```

### Phase 3: Dynamic Context System

#### 3.1 Implement Smart Context Detection

**File**: `/Users/brendantoole/projects2/gridmate/excel-addin/src/services/excel/ExcelService.ts`

**Add dynamic context sizing** (enhance existing `getSmartContext()`):
```typescript
private async getSmartContext(): Promise<ComprehensiveContext> {
    // Existing code...
    
    // Dynamic context based on activity
    const recentActivity = this.getRecentActivity();
    const dataSize = this.estimateDataSize(worksheet);
    
    // Adjust context window based on:
    // 1. Recent edits location
    // 2. Data density
    // 3. User's current task
    
    if (recentActivity.hasEdits) {
        // Focus on edited areas
        result.nearbyData = await this.getContextAroundEdits(recentActivity.editLocations);
    } else if (dataSize === 'large') {
        // For large sheets, sample intelligently
        result.nearbyData = await this.getSampledContext(worksheet);
    }
    // ... rest of implementation
}
```

#### 3.2 Activity Tracking

**File**: `/Users/brendantoole/projects2/gridmate/excel-addin/src/services/excel/ExcelService.ts`

**Add activity tracking**:
```typescript
private activityLog: Array<{
    timestamp: number;
    type: 'edit' | 'select' | 'format';
    range: string;
}> = [];

private trackActivity(type: string, range: string) {
    this.activityLog.push({
        timestamp: Date.now(),
        type: type as any,
        range
    });
    // Keep only last 50 activities
    if (this.activityLog.length > 50) {
        this.activityLog.shift();
    }
}
```

### Phase 4: Fix Diff Preview Application

#### 4.1 Operation Queue State Reset

**File**: `/Users/brendantoole/projects2/gridmate/excel-addin/src/hooks/useMessageHandlers.ts`

**Ensure clean state between messages**:
```typescript
const handleUserMessageSent = useCallback(async (messageId: string) => {
    // Clear any pending operations from previous messages
    if (pendingPreviewRef.current.size > 0) {
        console.warn('Clearing pending previews from previous message');
        pendingPreviewRef.current.clear();
    }
    
    // Reset all counters and state
    currentOperationIndexRef.current = 0;
    totalOperationsRef.current = 0;
    operationQueueRef.current = [];
    processedRequestsRef.current.clear();
    isProcessingQueueRef.current = false;
    
    // Store current message ID for validation
    currentMessageIdRef.current = messageId;
}, []);
```

#### 4.2 Add Operation Validation

**File**: `/Users/brendantoole/projects2/gridmate/excel-addin/src/utils/diffSimulator.ts`

**Add validation before applying operations**:
```typescript
export async function simulateOperation(
    snapshot: WorkbookSnapshot,
    operation: AISuggestedOperation,
    addLog?: (type: string, message: string, data?: any) => void
): Promise<WorkbookSnapshot> {
    // Validate operation
    if (!operation.tool || !operation.input) {
        log('error', 'Invalid operation: missing tool or input', { operation });
        throw new Error('Invalid operation structure');
    }
    
    // Check for duplicate operations
    const operationKey = `${operation.tool}_${operation.input.range}`;
    if (this.appliedOperations.has(operationKey)) {
        log('warning', 'Skipping duplicate operation', { operationKey });
        return snapshot;
    }
    
    // ... rest of implementation
}
```

## Implementation Steps

### Step 1: Fix Excel Context Structure (Priority: Critical)
1. Update backend context parsing in `excel_bridge.go`
2. Fix frontend context property name (`nearbyData` vs `nearbyRange`)
3. Add comprehensive logging to verify data flow
4. Test with both empty and populated spreadsheets

### Step 2: Improve Operation Management (Priority: High)
1. Add operation lifecycle logging
2. Implement duplicate prevention
3. Ensure proper state reset between messages
4. Add operation validation

### Step 3: Implement Dynamic Context (Priority: Medium)
1. Add activity tracking to ExcelService
2. Implement smart context sizing
3. Add data density detection
4. Test with various spreadsheet sizes

### Step 4: Fix Diff Preview Issues (Priority: High)
1. Add message ID validation
2. Clear pending operations between messages
3. Add operation deduplication
4. Test with multiple sequential messages

## Testing Plan

### Test Case 1: Excel Context Flow
1. Start with empty spreadsheet
2. Send "Create a DCF model" request
3. Verify AI receives empty context
4. Approve all operations
5. Send second request
6. Verify AI receives populated context with cell values

### Test Case 2: Operation Counter Reset
1. Send first message with multiple operations
2. Note operation counters (1/4, 2/4, etc.)
3. Send second message
4. Verify counters start fresh (1/N, not 5/N)

### Test Case 3: Diff Preview Application
1. Send message generating 4+ operations
2. Approve all operations
3. Send second message generating 4+ operations
4. Verify all operations from second message apply correctly

### Test Case 4: Dynamic Context
1. Edit cells in top-left corner
2. Send chat message
3. Verify context focuses on edited area
4. Edit cells in bottom-right
5. Send another message
6. Verify context shifts to new area

## Success Metrics

1. **Excel Context**: Backend logs show actual cell values, not "empty spreadsheet"
2. **AI Behavior**: AI doesn't re-write cells that already have values
3. **Operation Counters**: Reset properly between messages (1/N, 2/N)
4. **Diff Application**: All operations apply successfully, not just first 2
5. **Performance**: Context size remains reasonable (<10KB for typical use)

## Risk Mitigation

1. **Backward Compatibility**: Ensure changes work with existing Excel sessions
2. **Performance**: Monitor context size to prevent token limit issues
3. **Race Conditions**: Add mutex locks where needed
4. **Error Handling**: Graceful degradation if context parsing fails

## Timeline

- **Day 1**: Fix Excel context structure (Step 1)
- **Day 2**: Improve operation management (Step 2) 
- **Day 3**: Fix diff preview issues (Step 4)
- **Day 4**: Testing and bug fixes
- **Day 5**: Implement dynamic context (Step 3)
- **Day 6-7**: Integration testing and optimization

## Files to Modify

1. `/Users/brendantoole/projects2/gridmate/backend/internal/services/excel_bridge.go` - Context parsing
2. `/Users/brendantoole/projects2/gridmate/backend/internal/handlers/signalr_handler.go` - Duplicate prevention
3. `/Users/brendantoole/projects2/gridmate/excel-addin/src/components/chat/RefactoredChatInterface.tsx` - Property name fix
4. `/Users/brendantoole/projects2/gridmate/excel-addin/src/services/excel/ExcelService.ts` - Dynamic context
5. `/Users/brendantoole/projects2/gridmate/excel-addin/src/hooks/useMessageHandlers.ts` - State management
6. `/Users/brendantoole/projects2/gridmate/excel-addin/src/utils/diffSimulator.ts` - Operation validation
7. `/Users/brendantoole/projects2/gridmate/backend/internal/services/queued_operations.go` - Lifecycle logging

## Conclusion

This plan addresses all three critical issues:
1. Fixes the Excel context data structure mismatch
2. Ensures AI has awareness of existing cell values
3. Resolves diff preview application failures

The phased approach allows for incremental improvements while maintaining system stability. Priority is given to the context flow fix as it's the root cause of multiple issues.