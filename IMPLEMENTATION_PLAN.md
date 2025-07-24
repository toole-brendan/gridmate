# Implementation Plan: Streaming, Tool Classification & Preview System Refactor

## Overview
This plan outlines the refactoring of our AI assistant system to align with modern coding assistants like Cline, Roo-Code, Zed, and Cursor. The focus is on implementing proper streaming behavior, tool classification (read vs write), preview-based approvals, and a robust human-in-the-loop workflow.

## Current State Assessment

### Backend (Go)
- **Tool System**: Currently have Excel-focused tools in `backend/internal/services/ai/tools.go`
- **Tool Executor**: Complex tool execution in `backend/internal/services/ai/tool_executor.go`
- **Streaming**: Basic SSE streaming in `backend/internal/handlers/streaming.go`
- **SignalR**: SignalR integration for real-time communication

### Frontend (React/TypeScript)
- **Streaming UI**: `StreamingMessage.tsx` with chunked rendering
- **Tool Components**: Various tool-related components (`ToolIndicator`, `ToolResultCard`, etc.)
- **Types**: Well-defined streaming types in `excel-addin/src/types/streaming.ts`

### Key Issues to Address
1. **Duplicate text in streaming** - Full message being sent instead of deltas
2. **No preview system** - Tools execute immediately without user approval
3. **Limited tool metadata** - No clear read/write classification
4. **Stream lifecycle** - Connections close prematurely during multi-tool operations

## Implementation Phases

### Phase 1: Backend Streaming Infrastructure (Week 1)

#### 1.1 Fix Delta Streaming Logic
**File**: `backend/internal/handlers/streaming.go`
- [ ] Implement proper delta tracking for assistant messages
- [ ] Add `lastSentIndex` tracking per session
- [ ] Send only new content chunks: `delta = fullContent[lastSentIndex:]`
- [ ] Update SignalR messages to include delta field

**New Structure**:
```go
type StreamDelta struct {
    SessionID    string `json:"sessionId"`
    MessageID    string `json:"messageId"`
    Delta        string `json:"delta"`        // New content only
    TotalLength  int    `json:"totalLength"`  // For validation
    IsComplete   bool   `json:"isComplete"`
}
```

#### 1.2 Stream Lifecycle Management
**File**: `backend/internal/services/ai/tool_orchestrator.go` (new file)
- [ ] Create orchestrator to manage multi-tool execution flows
- [ ] Implement state machine for tool execution pipeline
- [ ] Keep stream open until all tools complete
- [ ] Add proper `is_done` signaling only after final output

**Key Methods**:
```go
type ToolOrchestrator struct {
    executionQueue []ToolExecution
    streamOpen     bool
    sessionID      string
}

func (o *ToolOrchestrator) QueueTool(tool ToolExecution)
func (o *ToolOrchestrator) ProcessQueue(ctx context.Context)
func (o *ToolOrchestrator) SignalCompletion()
```

### Phase 2: Tool Registry & Classification (Week 1-2)

#### 2.1 Tool Manifest System
**File**: `backend/internal/services/ai/manifest.json` (new)
```json
{
  "manifest_version": 1,
  "tools": [
    {
      "name": "read_range",
      "description": "Read cell values from Excel",
      "permission": "read",
      "parameters": {...},
      "returns": {...}
    },
    {
      "name": "write_range",
      "description": "Write values to Excel cells",
      "permission": "write",
      "preview_type": "excel_diff",
      "parameters": {...},
      "returns": {...}
    }
  ]
}
```

#### 2.2 Tool Registry Refactor
**File**: `backend/internal/services/ai/tool_registry.go` (new)
- [ ] Create centralized tool registry with manifest loading
- [ ] Add permission enforcement (read vs write)
- [ ] Implement preview generation for write tools
- [ ] Add tool validation against manifest schema

**Core Interface**:
```go
type Tool interface {
    Execute(ctx context.Context, params map[string]interface{}) (ToolResult, error)
    GetMetadata() ToolMetadata
    GeneratePreview(params map[string]interface{}) (Preview, error)
}

type ToolMetadata struct {
    Name        string
    Description string
    Permission  ToolPermission // READ or WRITE
    Parameters  []ParamDef
    Returns     ReturnDef
}
```

### Phase 3: Preview System Implementation (Week 2)

#### 3.1 Preview Generation
**File**: `backend/internal/services/ai/preview_generator.go` (new)
- [ ] Implement diff generation for file/Excel changes
- [ ] Create preview formats for different content types
- [ ] Add preview caching for commit/rollback

**Preview Types**:
```go
type Preview struct {
    ID          string
    ToolName    string
    Type        PreviewType // DIFF, IMAGE, JSON, etc.
    Content     interface{}
    CanApply    bool
    Metadata    map[string]interface{}
}
```

#### 3.2 Commit/Rollback System
**File**: `backend/internal/services/ai/preview_manager.go` (new)
- [ ] Store preview contexts for later application
- [ ] Implement commit endpoints for approved changes
- [ ] Add rollback capability for rejected changes
- [ ] Handle "Accept All" / "Reject All" operations

### Phase 4: Frontend Streaming & Preview UI (Week 2-3)

#### 4.1 Fix Streaming Display
**File**: `excel-addin/src/components/chat/messages/StreamingMessage.tsx`
- [ ] Update to handle delta-only updates
- [ ] Remove duplicate text rendering logic
- [ ] Improve chunked renderer for smooth display

#### 4.2 Tool Execution Status
**File**: `excel-addin/src/components/chat/messages/ToolStatusCard.tsx` (new)
- [ ] Create status card component for "Tool executing..."
- [ ] Add progress indicators for long-running tools
- [ ] Show tool name and estimated time

#### 4.3 Preview Cards
**File**: `excel-addin/src/components/chat/preview/PreviewCard.tsx` (new)
- [ ] Implement generic preview card component
- [ ] Add specialized renderers for different preview types:
  - [ ] DiffPreview (for code/text changes)
  - [ ] ExcelDiffPreview (for spreadsheet changes)
  - [ ] ImagePreview (for generated images)
  - [ ] JsonPreview (for structured data)
- [ ] Add Accept/Reject buttons with proper styling
- [ ] Implement Accept All/Reject All toolbar

**Component Structure**:
```typescript
interface PreviewCardProps {
  preview: Preview;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  isProcessing: boolean;
}
```

### Phase 5: Integration & Polish (Week 3)

#### 5.1 End-to-End Flow
- [ ] Wire up preview generation → display → commit flow
- [ ] Test multi-tool sequences with proper streaming
- [ ] Ensure no premature stream closures
- [ ] Validate timeout handling doesn't interfere

#### 5.2 Error Handling & Recovery
- [ ] Add graceful error handling for tool failures
- [ ] Implement retry logic for transient failures
- [ ] Show clear error messages in UI
- [ ] Add fallback for preview generation failures

#### 5.3 Performance Optimization
- [ ] Optimize delta calculation for large messages
- [ ] Add preview result caching
- [ ] Implement efficient diff algorithms
- [ ] Profile and optimize streaming performance

### Phase 6: Documentation & Testing (Week 3-4)

#### 6.1 Documentation
- [ ] Update API documentation for new endpoints
- [ ] Create tool development guide
- [ ] Document manifest schema
- [ ] Add user guide for preview system

#### 6.2 Testing
- [ ] Unit tests for delta streaming logic
- [ ] Integration tests for tool orchestration
- [ ] E2E tests for preview accept/reject flow
- [ ] Performance tests for streaming

## Migration Strategy

### Step 1: Backward Compatibility
- Keep existing tool system operational during migration
- Add feature flags for new preview system
- Gradually migrate tools to new registry

### Step 2: Tool Migration
1. Start with read-only tools (no breaking changes)
2. Migrate simple write tools with preview support
3. Complex tools (batch operations) last

### Step 3: UI Migration
- Deploy new UI components behind feature flag
- A/B test with subset of users
- Gradual rollout based on feedback

## Success Metrics

1. **Streaming Performance**
   - No duplicate text in responses
   - < 100ms latency for delta updates
   - Smooth typewriter effect

2. **Tool Safety**
   - 100% of write operations preview-gated
   - Zero unintended changes applied
   - Clear audit trail of accepted/rejected changes

3. **User Experience**
   - Tool execution visible in real-time
   - Preview cards load within 500ms
   - Accept/Reject actions complete < 200ms

## Timeline Summary

- **Week 1**: Backend streaming fixes + Tool registry design
- **Week 2**: Preview system + Frontend streaming updates  
- **Week 3**: Integration + Testing + Polish
- **Week 4**: Documentation + Deployment preparation

## Risk Mitigation

1. **Performance Degradation**
   - Monitor streaming performance metrics
   - Load test with multiple concurrent users
   - Have rollback plan ready

2. **Breaking Changes**
   - Extensive testing in staging environment
   - Feature flags for gradual rollout
   - Clear communication to users

3. **Tool Compatibility**
   - Maintain backward compatibility layer
   - Provide migration tools for custom tools
   - Support period for legacy tools

## Next Steps

1. Review and approve implementation plan
2. Set up development branches
3. Begin Phase 1 implementation
4. Schedule weekly progress reviews

---

This plan aligns our system with industry-leading AI coding assistants while maintaining our unique Excel-focused capabilities. The phased approach ensures we can deliver value incrementally while maintaining system stability.

## Appendix: Detailed Implementation Examples

### A. Backend Delta Streaming Implementation

#### A.1 Modified Streaming Handler
**File**: `backend/internal/handlers/streaming.go`

```go
type StreamSession struct {
    SessionID      string
    LastSentIndex  int
    MessageBuffer  string
    mu             sync.Mutex
}

var streamSessions = sync.Map{} // sessionID -> *StreamSession

func (h *StreamingHandler) streamDelta(w http.ResponseWriter, sessionID, messageID, fullContent string) {
    session, _ := streamSessions.LoadOrStore(sessionID, &StreamSession{
        SessionID: sessionID,
    })
    s := session.(*StreamSession)
    
    s.mu.Lock()
    defer s.mu.Unlock()
    
    // Calculate delta
    delta := fullContent[s.LastSentIndex:]
    if delta == "" {
        return // Nothing new to send
    }
    
    // Send delta chunk
    chunk := StreamDelta{
        SessionID:   sessionID,
        MessageID:   messageID,
        Delta:       delta,
        TotalLength: len(fullContent),
        IsComplete:  false,
    }
    
    data, _ := json.Marshal(chunk)
    fmt.Fprintf(w, "data: %s\n\n", data)
    
    if f, ok := w.(http.Flusher); ok {
        f.Flush()
    }
    
    s.LastSentIndex = len(fullContent)
}
```

### B. Tool Manifest Implementation

#### B.1 Complete Tool Manifest Example
**File**: `backend/internal/services/ai/manifest.json`

```json
{
  "manifest_version": 1,
  "tools": [
    {
      "name": "read_range",
      "description": "Read cell values, formulas, and formatting from Excel",
      "permission": "read",
      "parameters": {
        "type": "object",
        "properties": {
          "range": {
            "type": "string",
            "description": "Excel range (e.g., 'A1:D10')"
          },
          "include_formulas": {
            "type": "boolean",
            "default": true
          }
        },
        "required": ["range"]
      },
      "returns": {
        "type": "object",
        "properties": {
          "values": {"type": "array"},
          "formulas": {"type": "array"}
        }
      }
    },
    {
      "name": "write_range",
      "description": "Write values to Excel cells with preview",
      "permission": "write",
      "preview_type": "excel_diff",
      "parameters": {
        "type": "object",
        "properties": {
          "range": {
            "type": "string",
            "description": "Target range"
          },
          "values": {
            "type": "array",
            "description": "2D array of values"
          }
        },
        "required": ["range", "values"]
      },
      "returns": {
        "type": "object",
        "properties": {
          "preview": {
            "type": "object",
            "properties": {
              "diff": {"type": "string"},
              "affected_cells": {"type": "array"}
            }
          }
        }
      }
    },
    {
      "name": "create_chart",
      "description": "Create a chart from data range",
      "permission": "write",
      "preview_type": "image",
      "parameters": {
        "type": "object",
        "properties": {
          "data_range": {"type": "string"},
          "chart_type": {"type": "string", "enum": ["bar", "line", "pie"]},
          "title": {"type": "string"}
        }
      },
      "returns": {
        "type": "object",
        "properties": {
          "preview": {
            "type": "object",
            "properties": {
              "image_base64": {"type": "string"},
              "dimensions": {"type": "object"}
            }
          }
        }
      }
    }
  ]
}
```

### C. Preview System Implementation

#### C.1 Preview Generator with Diff Support
**File**: `backend/internal/services/ai/preview_generator.go`

```go
package ai

import (
    "context"
    "fmt"
    "github.com/sergi/go-diff/diffmatchpatch"
    "encoding/base64"
)

type PreviewGenerator struct {
    excelBridge ExcelBridge
    diffEngine  *diffmatchpatch.DiffMatchPatch
}

func (pg *PreviewGenerator) GenerateExcelDiff(ctx context.Context, sessionID, range string, newValues [][]interface{}) (*ExcelDiffPreview, error) {
    // Read current values
    current, err := pg.excelBridge.ReadRange(ctx, sessionID, range, false, false)
    if err != nil {
        return nil, err
    }
    
    // Generate text representations
    oldText := formatExcelData(current.Values)
    newText := formatExcelData(newValues)
    
    // Create unified diff
    diffs := pg.diffEngine.DiffMain(oldText, newText, false)
    unifiedDiff := pg.diffEngine.DiffPrettyText(diffs)
    
    // Calculate affected cells
    affectedCells := calculateAffectedCells(range, current.Values, newValues)
    
    return &ExcelDiffPreview{
        Range:         range,
        UnifiedDiff:   unifiedDiff,
        AffectedCells: affectedCells,
        OldValues:     current.Values,
        NewValues:     newValues,
    }, nil
}

type ExcelDiffPreview struct {
    Range         string              `json:"range"`
    UnifiedDiff   string              `json:"unified_diff"`
    AffectedCells []CellChange        `json:"affected_cells"`
    OldValues     [][]interface{}     `json:"old_values"`
    NewValues     [][]interface{}     `json:"new_values"`
}

type CellChange struct {
    Cell     string      `json:"cell"`
    OldValue interface{} `json:"old_value"`
    NewValue interface{} `json:"new_value"`
    Type     string      `json:"type"` // "added", "removed", "modified"
}
```

### D. Frontend Preview Components

#### D.1 Enhanced Preview Card Component
**File**: `excel-addin/src/components/chat/preview/PreviewCard.tsx`

```typescript
import React, { useState } from 'react';
import { Preview } from '../../../types/preview';
import { ExcelDiffViewer } from './ExcelDiffViewer';
import { ImagePreview } from './ImagePreview';
import { JsonPreview } from './JsonPreview';

interface PreviewCardProps {
  preview: Preview;
  onAccept: (id: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
  isProcessing: boolean;
}

export const PreviewCard: React.FC<PreviewCardProps> = ({
  preview,
  onAccept,
  onReject,
  isProcessing
}) => {
  const [status, setStatus] = useState<'pending' | 'accepted' | 'rejected'>('pending');
  const [isLoading, setIsLoading] = useState(false);

  const handleAccept = async () => {
    setIsLoading(true);
    try {
      await onAccept(preview.id);
      setStatus('accepted');
    } catch (error) {
      console.error('Failed to accept preview:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    setIsLoading(true);
    try {
      await onReject(preview.id);
      setStatus('rejected');
    } catch (error) {
      console.error('Failed to reject preview:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderPreviewContent = () => {
    switch (preview.type) {
      case 'excel_diff':
        return <ExcelDiffViewer diff={preview.content} />;
      case 'image':
        return <ImagePreview base64={preview.content.image_base64} />;
      case 'json':
        return <JsonPreview data={preview.content} />;
      default:
        return <pre>{JSON.stringify(preview.content, null, 2)}</pre>;
    }
  };

  return (
    <div className={`preview-card ${status}`}>
      <div className="preview-header">
        <span className="tool-name">{preview.toolName}</span>
        <span className="preview-type">{preview.type}</span>
      </div>
      
      <div className="preview-content">
        {renderPreviewContent()}
      </div>
      
      {status === 'pending' && (
        <div className="preview-actions">
          <button
            onClick={handleAccept}
            disabled={isLoading || isProcessing}
            className="accept-btn"
          >
            {isLoading ? '...' : '✓ Accept'}
          </button>
          <button
            onClick={handleReject}
            disabled={isLoading || isProcessing}
            className="reject-btn"
          >
            {isLoading ? '...' : '✗ Reject'}
          </button>
        </div>
      )}
      
      {status === 'accepted' && (
        <div className="status-badge accepted">✓ Applied</div>
      )}
      
      {status === 'rejected' && (
        <div className="status-badge rejected">✗ Rejected</div>
      )}
    </div>
  );
};
```

### E. Tool Execution Flow with Preview

#### E.1 Tool Orchestrator with Preview Support
**File**: `backend/internal/services/ai/tool_orchestrator.go`

```go
type ToolOrchestrator struct {
    registry        *ToolRegistry
    previewManager  *PreviewManager
    streamHandler   StreamHandler
    executionQueue  []ToolExecution
    sessionID       string
    mu              sync.Mutex
}

func (o *ToolOrchestrator) ExecuteToolWithPreview(ctx context.Context, toolCall ToolCall) error {
    // 1. Send tool start notification
    o.streamHandler.SendToolStart(o.sessionID, toolCall.Name)
    
    // 2. Get tool from registry
    tool, err := o.registry.GetTool(toolCall.Name)
    if err != nil {
        return err
    }
    
    // 3. Check if tool requires preview (write permission)
    if tool.GetMetadata().Permission == WRITE {
        // Generate preview
        preview, err := tool.GeneratePreview(toolCall.Parameters)
        if err != nil {
            return err
        }
        
        // Store preview for later commit
        o.previewManager.StorePreview(preview)
        
        // Stream preview to frontend
        o.streamHandler.SendToolPreview(o.sessionID, preview)
        
        // Wait for user decision
        decision := o.waitForUserDecision(preview.ID)
        
        if decision == "accept" {
            // Execute the actual tool
            result, err := tool.Execute(ctx, toolCall.Parameters)
            if err != nil {
                return err
            }
            o.streamHandler.SendToolResult(o.sessionID, result)
        } else {
            // Send rejection notification
            o.streamHandler.SendToolRejected(o.sessionID, toolCall.Name)
        }
    } else {
        // Read-only tool, execute immediately
        result, err := tool.Execute(ctx, toolCall.Parameters)
        if err != nil {
            return err
        }
        o.streamHandler.SendToolResult(o.sessionID, result)
    }
    
    return nil
}
```

### F. SignalR Integration for Real-time Updates

#### F.1 Enhanced SignalR Messages
**File**: `backend/internal/handlers/signalr_bridge.go`

```go
type SignalRMessage struct {
    Type      string      `json:"type"`
    SessionID string      `json:"sessionId"`
    MessageID string      `json:"messageId"`
    Data      interface{} `json:"data"`
}

// Message types
const (
    MsgTypeDelta       = "delta"
    MsgTypeToolStart   = "tool_start"
    MsgTypeToolPreview = "tool_preview"
    MsgTypeToolResult  = "tool_result"
    MsgTypeComplete    = "complete"
)

func (h *SignalRBridge) SendDelta(sessionID, messageID, delta string) {
    msg := SignalRMessage{
        Type:      MsgTypeDelta,
        SessionID: sessionID,
        MessageID: messageID,
        Data: map[string]interface{}{
            "delta": delta,
        },
    }
    h.hub.Send(sessionID, msg)
}

func (h *SignalRBridge) SendToolPreview(sessionID string, preview Preview) {
    msg := SignalRMessage{
        Type:      MsgTypeToolPreview,
        SessionID: sessionID,
        Data:      preview,
    }
    h.hub.Send(sessionID, msg)
}
```

### G. Frontend State Management

#### G.1 Redux Actions for Preview System
**File**: `excel-addin/src/store/previewSlice.ts`

```typescript
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface PreviewState {
  previews: Preview[];
  pendingPreviews: string[]; // IDs of previews awaiting decision
  processingPreviews: string[]; // IDs being processed
}

const previewSlice = createSlice({
  name: 'preview',
  initialState: {
    previews: [],
    pendingPreviews: [],
    processingPreviews: []
  } as PreviewState,
  reducers: {
    addPreview: (state, action: PayloadAction<Preview>) => {
      state.previews.push(action.payload);
      state.pendingPreviews.push(action.payload.id);
    },
    acceptPreview: (state, action: PayloadAction<string>) => {
      state.processingPreviews.push(action.payload);
      state.pendingPreviews = state.pendingPreviews.filter(id => id !== action.payload);
    },
    rejectPreview: (state, action: PayloadAction<string>) => {
      state.pendingPreviews = state.pendingPreviews.filter(id => id !== action.payload);
      const preview = state.previews.find(p => p.id === action.payload);
      if (preview) {
        preview.status = 'rejected';
      }
    },
    previewApplied: (state, action: PayloadAction<string>) => {
      state.processingPreviews = state.processingPreviews.filter(id => id !== action.payload);
      const preview = state.previews.find(p => p.id === action.payload);
      if (preview) {
        preview.status = 'accepted';
      }
    },
    acceptAllPreviews: (state) => {
      state.processingPreviews.push(...state.pendingPreviews);
      state.pendingPreviews = [];
    },
    rejectAllPreviews: (state) => {
      state.previews.forEach(p => {
        if (state.pendingPreviews.includes(p.id)) {
          p.status = 'rejected';
        }
      });
      state.pendingPreviews = [];
    }
  }
});

export const {
  addPreview,
  acceptPreview,
  rejectPreview,
  previewApplied,
  acceptAllPreviews,
  rejectAllPreviews
} = previewSlice.actions;
```

### H. Testing Strategy

#### H.1 Integration Test Example
**File**: `backend/internal/services/ai/tool_orchestrator_test.go`

```go
func TestToolOrchestratorPreviewFlow(t *testing.T) {
    // Setup
    orchestrator := NewToolOrchestrator(mockRegistry, mockPreviewManager)
    ctx := context.Background()
    
    // Test write tool with preview
    toolCall := ToolCall{
        Name: "write_range",
        Parameters: map[string]interface{}{
            "range": "A1:B2",
            "values": [][]interface{}{
                {"New", "Data"},
                {"Here", "Now"},
            },
        },
    }
    
    // Execute in goroutine (simulates async execution)
    go orchestrator.ExecuteToolWithPreview(ctx, toolCall)
    
    // Verify preview was generated
    preview := waitForPreview(t, orchestrator)
    assert.Equal(t, "write_range", preview.ToolName)
    assert.Equal(t, "excel_diff", preview.Type)
    
    // Simulate user acceptance
    orchestrator.HandleUserDecision(preview.ID, "accept")
    
    // Verify tool was executed
    result := waitForToolResult(t, orchestrator)
    assert.NotNil(t, result)
    assert.Equal(t, "success", result.Status)
}
```

This comprehensive implementation plan provides a clear roadmap for transforming the current system into one that matches the capabilities of modern AI coding assistants while maintaining the unique Excel-focused features.