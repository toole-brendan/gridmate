# Implementation Plan: Streaming, Tool Classification & Preview System Enhancement

## Overview
This plan outlines the enhancement of our existing AI assistant system to align with modern coding assistants like Cline, Roo-Code, Zed, and Cursor. We will build upon the **existing preview system, diff components, and tool infrastructure** rather than creating duplicates.

## Current State Assessment

### Backend (Go) - Existing Infrastructure
- **Tool System**: Excel-focused tools in `backend/internal/services/ai/tools.go`
- **Tool Executor**: Complex execution with preview support in `tool_executor.go`
- **Queued Operations Registry**: Already implements preview-based workflow in `services/queued_operations.go`
  - Operations have `Preview` field
  - Status tracking includes `queued_for_preview`
  - Supports undo/redo functionality
- **Preview Context**: Backend already supports `preview_mode` in context
- **Streaming**: SSE streaming in `handlers/streaming.go` + SignalR integration

### Frontend (React/TypeScript) - Existing Components
- **Preview Components**:
  - `ActionPreview.tsx` - Shows pending actions with approve/reject
  - `BatchActionPreview.tsx` - Handles multiple actions with "Approve All"
  - `DiffPreviewBar.tsx` - Preview mode indicator
  - `ChatMessageDiffPreview.tsx` - Diff preview with status tracking
- **Diff Renderers**:
  - `ExcelDiffRenderer.tsx` - Main diff visualization
  - Specialized renderers: `FormulaDiff`, `DataDiff`, `FormatDiff`, `ChartDiff`, `TableDiff`
- **Tool Components**:
  - `ToolIndicator.tsx` - Shows tool execution status
  - `ToolResultCard.tsx` - Displays tool results with undo/retry
  - `ToolSuggestionCard.tsx` - Tool suggestions with preview
- **Streaming**: `StreamingMessage.tsx` with `ChunkedRenderer`

### Key Issues to Address
1. **Duplicate text in streaming** - Full message being sent instead of deltas
2. **Stream lifecycle** - Connections close prematurely during multi-tool operations
3. **Tool manifest missing** - No standardized tool discovery/metadata system
4. **Preview flow gaps** - Preview system exists but not fully integrated with streaming

## Implementation Phases

### Phase 1: Fix Streaming Infrastructure (Week 1)

#### 1.1 Delta Streaming Enhancement
**File**: `backend/internal/handlers/streaming.go`
- [ ] Add delta tracking to existing streaming handler
- [ ] Integrate with SignalR bridge for consistent delta messaging
- [ ] Update `StreamChunk` type in frontend to properly handle deltas

**Changes to existing code**:
```go
// Add to streaming.go
type StreamSession struct {
    SessionID      string
    LastSentIndex  map[string]int // messageID -> lastIndex
    mu             sync.Mutex
}

// Modify existing HandleChatStream to use delta logic
```

#### 1.2 Enhance Stream Lifecycle Management
**File**: `backend/internal/services/ai/service.go`
- [ ] Modify existing `ProcessStreamingRequest` to keep stream open during tool sequences
- [ ] Update the existing check for `queued_for_preview` status to not close stream
- [ ] Enhance `queuedOpsRegistry` integration for better preview coordination

**Enhancement to existing logic**:
```go
// Current code already checks for queued_for_preview
// Enhance to properly manage stream lifecycle:
if status == "queued_for_preview" {
    // Don't send is_done, keep stream open
    // Wait for user decision
}
```

### Phase 2: Tool Registry & Manifest System (Week 1-2)

#### 2.1 Add Tool Manifest
**File**: `backend/internal/services/ai/manifest.json` (new)
- [ ] Create manifest for existing tools
- [ ] Include read/write permissions based on existing tool behavior
- [ ] Map to existing `ExcelTool` structures

#### 2.2 Enhance Existing Tool Registry
**File**: `backend/internal/services/ai/tools.go`
- [ ] Add `Permission` field to existing `ExcelTool` struct
- [ ] Add manifest loading to complement existing `GetExcelTools()`
- [ ] Integrate with existing `QueuedOperationRegistry`

**Enhance existing struct**:
```go
type ExcelTool struct {
    Name        string                 `json:"name"`
    Description string                 `json:"description"`
    InputSchema map[string]interface{} `json:"input_schema"`
    Permission  string                 `json:"permission"` // NEW: "read" or "write"
    PreviewType string                 `json:"preview_type"` // NEW: "excel_diff", "image", etc.
}
```

### Phase 3: Enhance Preview System (Week 2)

#### 3.1 Unify Preview Generation
**File**: `backend/internal/services/ai/tool_executor.go`
- [ ] Enhance existing `generateOperationPreview()` function
- [ ] Ensure all write operations use existing `queued_for_preview` status
- [ ] Improve preview data structure for better frontend consumption

#### 3.2 Enhance Preview Manager Integration
**Files**: Existing `QueuedOperationRegistry`
- [ ] Enhance `Preview` field structure in `QueuedOperation`
- [ ] Add preview type metadata
- [ ] Ensure proper integration with existing approve/reject flow

### Phase 4: Frontend Integration (Week 2-3)

#### 4.1 Fix Streaming Display
**File**: `excel-addin/src/components/chat/messages/StreamingMessage.tsx`
- [ ] Update `ChunkedRenderer` to handle delta-only updates
- [ ] Ensure no duplicate text rendering

#### 4.2 Enhance Tool Status Display
**File**: `excel-addin/src/components/chat/messages/ToolIndicator.tsx`
- [ ] Add "Tool executing..." status for better visibility
- [ ] Integrate with existing streaming events
- [ ] Show queue position for preview operations

#### 4.3 Unify Preview Components
**Goal**: Consolidate and enhance existing preview components
- [ ] Enhance `ActionPreview.tsx` to handle all preview types
- [ ] Integrate `ExcelDiffRenderer` for Excel-specific previews
- [ ] Ensure `BatchActionPreview` works with new streaming flow
- [ ] Connect to existing `QueuedOperationRegistry` approve/reject

**Enhancement approach**:
```typescript
// Enhance existing ActionPreview to be more generic
interface ActionPreviewProps {
  action: PendingAction
  preview?: ExcelDiff | ImagePreview | JsonPreview // Add preview data
  onApprove: (actionId: string) => void
  onReject: (actionId: string) => void
  isProcessing?: boolean
}
```

### Phase 5: Integration & Polish (Week 3)

#### 5.1 Connect Existing Systems
- [ ] Ensure `QueuedOperationRegistry` properly triggers UI updates
- [ ] Connect streaming events to existing preview components
- [ ] Verify undo/redo functionality works with enhanced preview flow

#### 5.2 Enhance Error Handling
- [ ] Use existing `ToolResultCard` error display
- [ ] Ensure preview failures gracefully fallback
- [ ] Leverage existing retry functionality

### Phase 6: Testing & Documentation (Week 3-4)

#### 6.1 Test Existing + New Features
- [ ] Verify existing preview/approve flow still works
- [ ] Test enhanced streaming with no duplicates
- [ ] Ensure batch operations work correctly
- [ ] Test undo/redo functionality

## Key Differences from Original Plan

### What We're Keeping
1. **Existing Preview System**: The `QueuedOperationRegistry` already implements preview workflow
2. **Diff Components**: Full suite of diff renderers already exists
3. **Action Preview UI**: `ActionPreview` and `BatchActionPreview` already handle approve/reject
4. **Tool Status**: `ToolIndicator` already shows execution status

### What We're Adding/Fixing
1. **Delta Streaming**: Fix duplicate text issue
2. **Tool Manifest**: Add standardized tool discovery
3. **Stream Lifecycle**: Keep connection open during multi-tool operations
4. **Integration**: Better connect existing components

### What We're NOT Doing
1. **NOT creating new preview components** - Enhance existing ones
2. **NOT replacing QueuedOperationRegistry** - It already has preview support
3. **NOT rewriting diff renderers** - They're comprehensive already
4. **NOT creating duplicate preview endpoints** - Use existing ones

## Migration Strategy

### Step 1: Non-Breaking Enhancements
1. Add delta streaming alongside existing full-content streaming
2. Add manifest without changing tool execution
3. Enhance existing components rather than replacing

### Step 2: Gradual Integration
1. Test enhanced streaming with subset of operations
2. Gradually enable preview-mode for all write operations
3. Monitor existing functionality remains intact

## Implementation Examples

### A. Delta Streaming with Existing Infrastructure

```go
// Enhance existing streaming.go
func (h *StreamingHandler) HandleChatStream(w http.ResponseWriter, r *http.Request) {
    // ... existing code ...
    
    // Add delta tracking
    session := h.getOrCreateSession(sessionID)
    
    // When streaming content
    delta := h.calculateDelta(session, messageID, fullContent)
    if delta != "" {
        h.sendDelta(w, sessionID, messageID, delta)
    }
}
```

### B. Enhancing Existing Preview Flow

```go
// In tool_executor.go - enhance existing preview generation
func (te *ToolExecutor) ExecuteWithEnhancedPreview(ctx context.Context, tool string, input map[string]interface{}) (map[string]interface{}, error) {
    // Check if tool requires preview (from manifest)
    if te.requiresPreview(tool) {
        // Use existing queued operations flow
        result := map[string]interface{}{
            "status": "queued_for_preview",
            "preview": te.generateEnhancedPreview(tool, input),
            "operation_id": generateID(),
        }
        
        // Register with existing QueuedOperationRegistry
        te.queuedOpsRegistry.QueueOperation(/* ... */)
        
        return result, nil
    }
    
    // Direct execution for read operations
    return te.execute(ctx, tool, input)
}
```

### C. Frontend Integration with Existing Components

```typescript
// Enhance existing ActionPreview.tsx
export const ActionPreview: React.FC<ActionPreviewProps> = ({
  action,
  onApprove,
  onReject,
  isProcessing = false
}) => {
  // ... existing code ...
  
  // Add preview rendering based on type
  const renderPreview = () => {
    if (action.preview?.type === 'excel_diff') {
      return <ExcelDiffRenderer diff={action.preview.data} />
    }
    // ... other preview types
    
    // Fallback to existing parameter display
    return formatParameters(action.parameters)
  }
  
  // ... rest of existing component
}
```

## Success Metrics

1. **Streaming Performance**
   - No duplicate text (existing issue fixed)
   - Smooth updates using existing `ChunkedRenderer`

2. **Preview Safety**
   - Leverage existing `QueuedOperationRegistry` for all writes
   - Use existing approve/reject UI components

3. **User Experience**
   - Enhanced `ToolIndicator` shows real-time status
   - Existing preview cards properly integrated with streaming

## Conclusion

This plan enhances and integrates existing systems rather than duplicating functionality. The codebase already has a solid preview system, comprehensive diff renderers, and approval UI - we just need to fix streaming issues, add tool metadata, and better integrate the components.