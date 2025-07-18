# Fix Plan: Completion Callback Timing Issue

## Problem Summary
After approving the last diff preview, the app freezes because:
1. The message completion callback is registered too late (after AI processing)
2. When all operations complete quickly, the callback is already cleared before the final response
3. The system waits indefinitely for a completion signal that never comes

## Root Cause Analysis

### Current Flow (Problematic):
1. SignalR receives chat message
2. Sends to AI service for processing
3. AI generates tool calls and queues operations
4. Operations start executing (some complete quickly)
5. **AFTER** AI response, callback is registered ← **TOO LATE**
6. Some operations may have already completed
7. When last operation completes, callback might be missing
8. System hangs waiting for completion

### Logs Evidence:
```
- "Registering message completion callback" happens after operations are queued
- "No completion callback registered for completed message" warnings appear
- Multiple duplicate completions for same operations
```

## Solution

### Fix 1: Move Callback Registration Earlier
**File**: `backend/internal/handlers/signalr_handler.go`

Move the callback registration to happen BEFORE sending to AI:
- Register callback immediately after creating the message ID
- Ensure it's in place before any operations can complete

### Fix 2: Add Callback Existence Check
**File**: `backend/internal/services/queued_operations.go`

Add defensive programming:
- Check if callback exists before trying to execute
- Log warning but don't block if callback is missing
- Allow system to continue even without callback

### Fix 3: Prevent Duplicate Responses
**File**: `backend/internal/services/ai/tool_executor.go`

Ensure operations are only marked complete once:
- Add completed flag to prevent duplicate processing
- Return early if operation already completed

## Implementation Steps

1. **Update SignalR Handler** (`signalr_handler.go`):
   - Move callback registration to line ~90 (before AI call)
   - Pass callback through context if needed

2. **Update Queued Operations** (`queued_operations.go`):
   - Make callback execution non-blocking
   - Add existence check with graceful handling

3. **Add Operation State Tracking**:
   - Track if response already sent for an operation
   - Prevent duplicate completion messages

## Expected Outcome
- Callback will always be registered before operations can complete
- System won't hang if callback is missing
- Chat will continue working after all diff previews are approved
- No more timeout/freeze issues

## Testing Plan
1. Create a chat request that generates multiple tool calls
2. Approve all diff previews one by one
3. Verify chat remains responsive after last approval
4. Check logs for proper callback execution
5. Ensure no duplicate completion warnings