# Comprehensive Diff Preview Implementation Fix Plan

## Executive Summary

This plan addresses the current issues with the diff preview system and implements the vision outlined in the IN_CHAT_DIFF_PREVIEW_IMPLEMENTATION_PLAN and DIFF_HISTORY_PERSISTENCE_PLAN. The main issues to fix are:

1. **Backend Loop Issue**: The AI continues generating operations indefinitely instead of returning a final response when operations are queued
2. **Preview State Management**: Need to implement single active preview with auto-acceptance
3. **UI Integration**: Move from global preview bar to inline message previews
4. **History Persistence**: Preserve diff history in chat messages after accept/reject

## Critical Issue: Backend Infinite Loop

### Root Cause
The backend's `ProcessChatWithToolsAndHistory` function doesn't recognize when operations are queued for preview and continues requesting more tool uses indefinitely. The system treats "queued" status as a successful operation but doesn't know to stop and return a final response.

### Current Flow (Broken)
1. AI suggests operation → Backend sends to Excel
2. Excel queues for preview → Returns status: "queued"
3. Backend continues to next round → AI generates more operations
4. Loop continues indefinitely

### Expected Flow
1. AI suggests operation → Backend sends to Excel
2. Excel queues for preview → Returns status: "queued"
3. Backend recognizes all operations queued → Returns final response with preview info
4. User sees preview in chat with accept/reject buttons

## Implementation Plan

### Phase 1: Fix Backend Loop Issue (Priority: CRITICAL)

#### File: `/Users/brendantoole/projects2/gridmate/backend/internal/services/ai/service.go`

**Changes needed in `ProcessChatWithToolsAndHistory`:**

```go
// After executing tool calls (around line 830)
toolResults, err := s.ProcessToolCalls(ctx, sessionID, response.ToolCalls)
if err != nil {
    log.Error().Err(err).Msg("Failed to execute tool calls")
    return nil, fmt.Errorf("tool execution failed: %w", err)
}

// NEW: Check if all operations are queued
allQueued := true
hasOperations := false
for _, result := range toolResults {
    if result.Content != "" {
        // Parse the result to check status
        var resultData map[string]interface{}
        if err := json.Unmarshal([]byte(result.Content), &resultData); err == nil {
            if status, ok := resultData["status"].(string); ok {
                hasOperations = true
                if status != "queued" && status != "queued_for_preview" {
                    allQueued = false
                    break
                }
            }
        }
    }
}

// If all operations are queued, return final response
if hasOperations && allQueued {
    log.Info().
        Int("queued_operations", len(toolResults)).
        Msg("All operations queued for preview, returning final response")
    
    // Build a final response that includes the preview status
    finalResponse := &CompletionResponse{
        Content: response.Content,
        ToolCalls: response.ToolCalls,
        IsFinal: true,
        Actions: []Action{
            {
                Type: "preview_queued",
                Description: fmt.Sprintf("%d operations queued for preview", len(toolResults)),
            },
        },
    }
    return finalResponse, nil
}
```

#### File: `/Users/brendantoole/projects2/gridmate/backend/internal/services/excel/excel_bridge_impl.go`

**Enhance response handling for queued operations:**

```go
// In SendToolRequest method, after receiving response
if respMap, ok := response.(map[string]interface{}); ok {
    if status, ok := respMap["status"].(string); ok && (status == "queued" || status == "queued_for_preview") {
        // For queued responses, include preview metadata
        log.Info().
            Str("session_id", sessionID).
            Str("request_id", requestID).
            Msg("Tool queued for user approval - keeping handler active")
        
        // Return enhanced queued response
        return map[string]interface{}{
            "status": status,
            "message": "Tool queued for visual diff preview",
            "preview": true,
            "operations": request["operations"], // Include original operations
        }, nil
    }
}
```

### Phase 2: Implement Single Active Preview State

#### File: `/Users/brendantoole/projects2/gridmate/excel-addin/src/store/useDiffSessionStore.ts`

**Simplify to single active preview model:**

```typescript
interface DiffData {
  status: 'previewing' | 'applying' | 'rejected' | 'accepted';
  operations: AISuggestedOperation[];
  hunks: DiffHunk[];
  timestamp: number;
  messageId: string;
}

interface DiffSessionState {
  // Current active preview (only one at a time)
  activePreview: DiffData | null;
  
  // Original snapshot before preview
  originalSnapshot: WorkbookSnapshot | null;
  
  // Actions
  setActivePreview: (messageId: string, operations: AISuggestedOperation[], hunks: DiffHunk[]) => void;
  clearPreview: () => void;
}

// Implementation
const useDiffSessionStore = create<DiffSessionState>((set) => ({
  activePreview: null,
  originalSnapshot: null,
  
  setActivePreview: (messageId, operations, hunks) => {
    set({
      activePreview: {
        messageId,
        operations,
        hunks,
        status: 'previewing',
        timestamp: Date.now(),
      }
    });
  },
  
  clearPreview: () => {
    set({ activePreview: null, originalSnapshot: null });
  },
}));
```

#### File: `/Users/brendantoole/projects2/gridmate/excel-addin/src/hooks/useDiffPreview.ts`

**Implement auto-acceptance logic:**

```typescript
const generatePreview = useCallback(async (messageId: string, operations: AISuggestedOperation[]) => {
  try {
    // Step 1: Auto-accept any existing preview
    if (store.activePreview) {
      console.log('Auto-accepting existing preview');
      const prevOperations = store.activePreview.operations;
      
      // Apply the previous preview's operations
      for (const op of prevOperations) {
        await excelService.executeOperation(op);
      }
      
      // Update the previous message's diff status
      chatManager.updateMessageDiff(store.activePreview.messageId, {
        operations: store.activePreview.operations,
        hunks: store.activePreview.hunks,
        status: 'accepted',
        timestamp: Date.now(),
      });
      
      // Clear existing highlights
      await GridVisualizer.clearHighlights(store.activePreview.hunks);
    }
    
    // Step 2: Capture current workbook state
    const snapshot = await WorkbookSnapshot.capture();
    
    // Step 3: Simulate new operations
    const simulator = new DiffSimulator(snapshot);
    const result = await simulator.simulateOperations(operations);
    
    // Step 4: Calculate diff
    const hunks = calculateDiff(snapshot, result.simulatedSnapshot);
    
    // Step 5: Apply visual highlights
    await GridVisualizer.highlightHunks(hunks);
    
    // Step 6: Set as active preview
    store.setActivePreview(messageId, operations, hunks);
    
    // Step 7: Store initial preview state in message
    chatManager.updateMessageDiff(messageId, {
      operations,
      hunks,
      status: 'previewing',
      timestamp: Date.now(),
    });
    
  } catch (error) {
    console.error('Failed to generate preview:', error);
    throw error;
  }
}, [store, excelService, chatManager]);
```

### Phase 3: Create Inline Preview Component

#### File: `/Users/brendantoole/projects2/gridmate/excel-addin/src/components/chat/ChatMessageDiffPreview.tsx`

**Create new component:**

```typescript
import React from 'react';
import { DiffHunk } from '../../types/diff';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

interface ChatMessageDiffPreviewProps {
  messageId: string;
  hunks: DiffHunk[];
  status: 'previewing' | 'applying' | 'rejected' | 'accepted';
  onAccept?: () => void;
  onReject?: () => void;
}

export const ChatMessageDiffPreview: React.FC<ChatMessageDiffPreviewProps> = ({
  messageId,
  hunks,
  status,
  onAccept,
  onReject,
}) => {
  // Calculate summary
  const summary = React.useMemo(() => {
    let added = 0, removed = 0, modified = 0;
    
    hunks.forEach(hunk => {
      if (hunk.type === 'add') added += hunk.cells.length;
      else if (hunk.type === 'remove') removed += hunk.cells.length;
      else if (hunk.type === 'modify') modified += hunk.cells.length;
    });
    
    return { added, removed, modified };
  }, [hunks]);
  
  const getStatusIcon = () => {
    switch (status) {
      case 'accepted':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'applying':
        return <Clock className="w-4 h-4 text-blue-500 animate-spin" />;
      default:
        return null;
    }
  };
  
  const getStatusText = () => {
    switch (status) {
      case 'accepted':
        return 'Changes Applied';
      case 'rejected':
        return 'Changes Rejected';
      case 'applying':
        return 'Applying Changes...';
      default:
        return 'Preview';
    }
  };
  
  return (
    <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {getStatusIcon()}
          <span className="text-sm font-medium text-gray-700">
            {getStatusText()}
          </span>
          <span className="text-xs text-gray-500">
            {summary.added > 0 && `+${summary.added} cells`}
            {summary.removed > 0 && ` -${summary.removed} cells`}
            {summary.modified > 0 && ` ~${summary.modified} changes`}
          </span>
        </div>
        
        {status === 'previewing' && onAccept && onReject && (
          <div className="flex items-center space-x-2">
            <button
              onClick={onAccept}
              className="px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
            >
              Accept
            </button>
            <button
              onClick={onReject}
              className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
            >
              Reject
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
```

### Phase 4: Update Message Types for Persistence

#### File: `/Users/brendantoole/projects2/gridmate/excel-addin/src/types/enhanced-chat.ts`

**Add diff property to message type:**

```typescript
export interface EnhancedChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  type: 'user' | 'assistant' | 'system' | 'tool_suggestion' | 'status';
  toolSuggestions?: ToolSuggestion[];
  status?: 'pending' | 'success' | 'error';
  
  // NEW: Persistent diff data
  diff?: {
    status: 'previewing' | 'applying' | 'rejected' | 'accepted';
    operations: AISuggestedOperation[];
    hunks: DiffHunk[];
    timestamp: number;
  };
}
```

#### File: `/Users/brendantoole/projects2/gridmate/excel-addin/src/hooks/useChatManager.ts`

**Add method to update message diff:**

```typescript
const updateMessageDiff = useCallback((messageId: string, diffData: Omit<DiffData, 'messageId'>) => {
  setMessages(prev => 
    prev.map(msg => 
      msg.id === messageId 
        ? { ...msg, diff: diffData } 
        : msg
    )
  );
}, []);

// Add to return object
return {
  // ... existing properties
  updateMessageDiff,
};
```

### Phase 5: Wire Up UI Components

#### File: `/Users/brendantoole/projects2/gridmate/excel-addin/src/components/chat/RefactoredChatInterface.tsx`

**Remove global preview bar:**

```typescript
// REMOVE THIS LINE:
// <DiffPreviewBar />

// The preview will now appear inline within messages
```

#### File: `/Users/brendantoole/projects2/gridmate/excel-addin/src/components/chat/ToolSuggestionCard.tsx`

**Add inline preview to tool suggestion cards:**

```typescript
// Add to the component where tool details are rendered
{message.diff && (
  <ChatMessageDiffPreview
    messageId={message.id}
    hunks={message.diff.hunks || []}
    status={message.diff.status}
    onAccept={message.diff.status === 'previewing' ? handleAcceptDiff : undefined}
    onReject={message.diff.status === 'previewing' ? handleRejectDiff : undefined}
  />
)}
```

### Phase 6: Update Message Handlers

#### File: `/Users/brendantoole/projects2/gridmate/excel-addin/src/hooks/useMessageHandlers.ts`

**Handle tool requests with preview:**

```typescript
// In handleToolRequest function
case 'excel_write':
case 'excel_formula':
case 'excel_format':
  // Check if tool request includes preview parameter
  const shouldPreview = toolRequest.preview !== false; // Default to true
  
  if (shouldPreview && autonomyMode !== 'direct') {
    // Generate preview
    const operation = convertToolRequestToOperation(toolRequest);
    await diffPreview.generatePreview(message.id, [operation]);
    
    // Send acknowledgment
    sendResponse({
      status: 'queued_for_preview',
      message: 'Tool queued for visual diff preview',
    });
  } else {
    // Direct execution without preview
    const result = await ExcelService.getInstance().executeToolRequest(
      toolRequest.tool, 
      toolRequest
    );
    sendResponse(result);
  }
  break;
```

### Phase 7: Update Accept/Reject Handlers

#### File: `/Users/brendantoole/projects2/gridmate/excel-addin/src/hooks/useDiffPreview.ts`

**Update handlers to persist state:**

```typescript
const acceptCurrentPreview = useCallback(async () => {
  if (!store.activePreview) return;
  const { messageId, operations, hunks } = store.activePreview;
  
  try {
    // Update status to applying
    chatManager.updateMessageDiff(messageId, {
      operations,
      hunks,
      status: 'applying',
      timestamp: Date.now(),
    });
    
    // Apply changes to Excel
    for (const op of operations) {
      await excelService.executeOperation(op);
    }
    
    // Update status to accepted
    chatManager.updateMessageDiff(messageId, {
      operations,
      hunks,
      status: 'accepted',
      timestamp: Date.now(),
    });
    
    // Clear the live preview
    store.clearPreview();
    await GridVisualizer.clearHighlights(hunks);
    
  } catch (error) {
    console.error('Failed to accept preview:', error);
    // Revert to previewing on error
    chatManager.updateMessageDiff(messageId, {
      operations,
      hunks,
      status: 'previewing',
      timestamp: Date.now(),
    });
  }
}, [store, excelService, chatManager]);

const rejectCurrentPreview = useCallback(async () => {
  if (!store.activePreview) return;
  const { messageId, operations, hunks } = store.activePreview;
  
  // Update status to rejected
  chatManager.updateMessageDiff(messageId, {
    operations,
    hunks,
    status: 'rejected',
    timestamp: Date.now(),
  });
  
  // Clear the live preview
  store.clearPreview();
  await GridVisualizer.clearHighlights(hunks);
  
  // Revert to original snapshot if needed
  if (store.originalSnapshot) {
    await WorkbookSnapshot.restore(store.originalSnapshot);
  }
}, [store, chatManager]);
```

## Implementation Sequence

### Day 1: Fix Critical Backend Loop
1. **Morning**: Implement backend loop fix in `service.go`
2. **Afternoon**: Test that AI stops generating after queued operations
3. **End of day**: Verify no timeout errors

### Day 2: State Management Refactor
1. **Morning**: Simplify `useDiffSessionStore` to single preview
2. **Afternoon**: Implement auto-acceptance in `useDiffPreview`
3. **End of day**: Test preview transitions

### Day 3: UI Components
1. **Morning**: Create `ChatMessageDiffPreview` component
2. **Afternoon**: Update message types and `useChatManager`
3. **End of day**: Wire up components

### Day 4: Integration & Testing
1. **Morning**: Update message handlers
2. **Afternoon**: Test full flow with persistence
3. **End of day**: Edge case testing

## Success Criteria

1. ✅ **No more infinite loops**: AI returns final response after queueing operations
2. ✅ **Single active preview**: Only one preview active at a time
3. ✅ **Auto-acceptance**: Previous previews auto-accept when new ones arrive
4. ✅ **Inline previews**: Previews appear within chat messages
5. ✅ **Persistent history**: Accepted/rejected previews remain visible in chat
6. ✅ **Visual highlights**: Excel cells highlight during preview
7. ✅ **Clear status indicators**: Users can see preview/accepted/rejected states
8. ✅ **Smooth transitions**: No flickering or UI glitches

## Testing Scenarios

### Scenario 1: Single Operation
```
User: "Put the value 100 in cell A1"
AI: "I'll put 100 in cell A1"
    [Preview shows: +1 cell]
    [Cell A1 highlights blue]
User: Clicks Accept
    [Preview shows: Changes Applied ✓]
    [Cell A1 contains 100]
```

### Scenario 2: Auto-Acceptance
```
User: "Put 100 in A1"
AI: [Preview 1 appears]
User: "Now put 200 in B1" (without accepting first)
AI: [Preview 1 auto-accepts, Preview 2 appears]
```

### Scenario 3: History Persistence
```
User: Scrolls up in chat
[All previous previews still visible with their final states]
```

## Risk Mitigation

1. **Backend compatibility**: Test with existing Excel operations
2. **Performance**: Monitor memory usage with many previews
3. **Error handling**: Graceful fallbacks for preview failures
4. **User confusion**: Clear status indicators and tooltips

## Future Enhancements

1. Batch operations in single preview
2. Undo/redo for accepted changes
3. Keyboard shortcuts (Enter=Accept, Esc=Reject)
4. Preview animations and transitions
5. Export audit trail of all changes