# Cursor-Style Streaming with Tool Approval

## Overview

The implementation now supports Cursor-style streaming where:
- AI responses stream in real-time
- Write operations require user approval (in default mode)
- Read operations execute automatically
- The AI can continue generating content while tools await approval
- Multiple tools can be queued for approval

## Autonomy Modes

### 1. Read-Only Mode (`read-only`)
- Only read operations are allowed
- All write operations are rejected
- No preview UI needed
- Safe for viewing data without modifications

### 2. Default Mode (`agent-default` or `default`)
- **Read operations**: Execute automatically
- **Write operations**: Queue for user approval with preview
- Streaming continues while awaiting approval
- Users see diff preview cards for each write operation
- Similar to Cursor's default behavior

### 3. Full Autonomy / YOLO Mode (`full-autonomy` or `yolo`)
- All operations execute immediately
- No preview or approval needed
- Maximum speed, minimum safety
- Use with caution

## How It Works

### 1. Streaming Phase
```
User Message → AI Streams Response → Tools Detected → Continue Streaming
                                           ↓
                                    Tool Requests Sent
```

### 2. Tool Handling (Default Mode)
```
Read Tool → Execute Immediately → Results Available
Write Tool → Queue for Preview → Show Diff Card → User Approves/Rejects
                                      ↓
                              AI Continues Streaming
```

### 3. Key Features

1. **Non-blocking Streaming**: The AI continues generating content even when tools are queued
2. **Async Tool Approval**: Users can approve/reject tools while AI is still streaming
3. **Batch Preview**: Multiple tools can be queued and previewed
4. **Mode Flexibility**: Switch between safety levels as needed

## Implementation Details

### Frontend (Excel Add-in)

**`useMessageHandlers.ts`**:
- Detects streaming mode from active messages
- Respects autonomy mode for preview decisions
- Sends "queued_for_preview" response for write tools in default mode
- Executes immediately in full-autonomy mode

### Backend (Go Service)

**`excel_bridge.go`**:
- Forwards tool requests with autonomy mode
- Doesn't wait for tool responses during streaming
- Allows stream to continue regardless of tool status

**`tool_executor.go`**:
- No longer overrides autonomy mode in streaming
- Respects the provided mode for all decisions

**`service.go`**:
- Single iteration for streaming (no waiting for tools)
- Tools handled asynchronously through SignalR

## User Experience

### Default Mode (Most Common)
1. User sends: "Create a DCF model with 5 year projections"
2. AI starts streaming: "I'll help you create a comprehensive DCF model..."
3. When tools are needed:
   - Read operations (analyze current data) → Execute silently
   - Write operations (create headers, formulas) → Show preview cards
4. User sees preview cards appear as AI continues explaining
5. User can approve/reject each operation
6. AI completes response regardless of approval status

### Full Autonomy Mode
1. User enables YOLO mode
2. All operations execute immediately
3. No interruptions or previews
4. Maximum speed

### Read-Only Mode
1. User enables read-only mode
2. AI can analyze and explain
3. No modifications allowed
4. Safe for data exploration

## Benefits

1. **Familiar UX**: Works like Cursor - streaming with approval
2. **Non-blocking**: AI doesn't stop for approvals
3. **Flexible Safety**: Choose your comfort level
4. **Transparent**: See what will change before it happens
5. **Efficient**: Batch operations when possible

## Testing

1. **Default Mode Test**:
   ```
   Message: "Create a financial model with revenue projections"
   Expected: Stream continues while showing preview cards
   ```

2. **Mixed Operations Test**:
   ```
   Message: "Analyze the current data and add a summary row"
   Expected: Analysis runs immediately, summary row needs approval
   ```

3. **Mode Switching Test**:
   - Try same prompt in different modes
   - Verify behavior changes appropriately