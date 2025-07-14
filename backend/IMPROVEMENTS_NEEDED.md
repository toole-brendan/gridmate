# Backend Improvements Needed

## 1. Update AI Context Between Tool Calls
**Problem**: AI context shows "spreadsheet is currently empty" even after successful writes
**Solution**: After each successful tool execution, update the context to reflect the current spreadsheet state

## 2. Better Error Reporting from Frontend
**Problem**: Tool responses with errors don't include error messages
**Solution**: Ensure frontend always includes error details in the response

## 3. AI Awareness of Queued Operations
**Problem**: AI doesn't understand that operations are queued and continues as if they failed
**Solution**: 
- Return clearer status to AI when operations are queued
- Consider implementing a "wait for approval" mechanism
- Or provide AI with guidance about queued operations in the system prompt

## 4. Context Builder Enhancement
**Problem**: The context builder should refresh after each tool execution to provide accurate state
**Solution**: 
- Call context builder after successful tool executions
- Include recently written data in the context
- Update the financial context with the current model state

## 5. Performance Optimization
**Observation**: Multiple tool calls are being queued separately
**Solution**: Consider batching related operations for user approval

## 6. Missing Tool Response Details
Some successful responses only show "success" without details about what was written/changed.
Consider returning more detailed information about the operation results.