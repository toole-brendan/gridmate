# GridMate Streaming & Context Handling Fix Plan
## Enhanced "Cursor for Financial Modeling" Implementation

## Executive Summary

This plan addresses critical issues in GridMate's streaming chat implementation and enhances it to achieve a Cursor-like UX for financial modeling. The Phase 0 implementation successfully prevents blank chat bubbles but introduces new problems:

1. **Missing Context**: Streaming mode skips context building, causing unnecessary tool calls
2. **Empty Tool Parameters**: Tool calls are sent with empty parameters, causing execution failures
3. **No Excel Updates**: Tool executions don't actually update the spreadsheet due to parameter issues
4. **Poor UX**: Diff preview cards disappear after acceptance instead of persisting with status

**Important**: Analysis reveals that GridMate already has a sophisticated diff preview system with color-coded highlights, italicized preview text, and execution infrastructure. The main issues are empty tool parameters and UI persistence, not missing functionality.

## Current State Analysis

### Existing Infrastructure (Working Well)
1. **GridVisualizer** (`/excel-addin/src/services/diff/GridVisualizer.ts`)
   - ✅ Color-coded highlights for different change types
   - ✅ Italicized preview text
   - ✅ Border indicators and visual feedback
   - ✅ Original state tracking for restoration

2. **Diff Preview System** (`/excel-addin/src/hooks/useDiffPreview.ts`)
   - ✅ Snapshot creation and diff calculation
   - ✅ Two-phase preview (highlights + values)
   - ✅ Actual Excel execution via `executeToolRequest()`
   - ✅ Batch operation support

3. **Excel Service** (`/excel-addin/src/services/excel/ExcelService.ts`)
   - ✅ Tool execution infrastructure
   - ✅ Batch execution for performance
   - ✅ All tool implementations (write_range, format_range, etc.)

### Phase 0 Implementation Issues

#### 1. Context Building Disabled in Streaming Mode
```go
// File: /backend/internal/services/excel/context_builder.go
// PHASE 0 FIX: Skip all context building during streaming to avoid tool requests
if streamingMode {
    context.ModelType = "Streaming"
    context.DocumentContext = append(context.DocumentContext, 
        "Context building skipped during streaming response.")
    return context, nil
}
```

**Impact**: The AI doesn't know the spreadsheet state, leading to unnecessary `read_range` calls.

#### 2. Empty Tool Parameters Bug
```go
// File: /backend/internal/services/excel_bridge.go (line ~1000)
// Tool parameters are not being properly extracted from streaming chunks
"tool_name":"write_range","input_params":0,"input":{}
```

**Impact**: All tool executions fail with "undefined is not an object" errors.

#### 3. UI Persistence Issue
The `ChatMessageDiffPreview` component disappears after accept/reject instead of persisting with status indicators like Cursor does.

## Proposed Solution Architecture

### Phase 1: Fix Core Issues (Immediate Priority)

#### 1.1 Fix Tool Parameter Extraction
The empty tool parameters are the root cause of Excel updates not working.

**Files to modify:**
- `/backend/internal/services/ai/anthropic.go`
- `/backend/internal/services/excel_bridge.go`

**Implementation**:
```go
// File: /backend/internal/services/ai/anthropic.go (enhance line ~590)
case "content_block_delta":
    if event.Delta != nil {
        if currentToolCall != nil && event.Delta.Type == "input_json_delta" {
            // Accumulate tool input JSON
            toolInputBuffer.WriteString(event.Delta.Text)
            
            // CRITICAL: Log the accumulated buffer for debugging
            log.Debug().
                Str("tool_id", currentToolCall.ID).
                Str("delta_text", event.Delta.Text).
                Int("buffer_size", toolInputBuffer.Len()).
                Str("buffer_content", toolInputBuffer.String()).
                Msg("[Anthropic] Accumulating tool input")
            
            // Only send progress chunk if we have actual content
            if event.Delta.Text != "" {
                ch <- CompletionChunk{
                    ID:       messageID,
                    Type:     "tool_progress",
                    ToolCall: currentToolCall,
                    Delta:    event.Delta.Text,
                    Done:     false,
                }
            }
        }
    }

// File: /backend/internal/services/excel_bridge.go (enhance line ~1000)
case "tool_complete":
    if currentToolCall != nil {
        // Try to parse from buffer first
        if toolInputBuffer.Len() > 0 {
            var inputData map[string]interface{}
            if err := json.Unmarshal([]byte(toolInputBuffer.String()), &inputData); err == nil {
                currentToolCall.Input = inputData
            } else {
                // Log the parsing error with buffer content
                eb.logger.WithFields(logrus.Fields{
                    "tool_id": currentToolCall.ID,
                    "buffer": toolInputBuffer.String(),
                    "error": err.Error(),
                }).Error("Failed to parse tool input JSON")
            }
        }
        
        // If still empty, try to infer from context
        if len(currentToolCall.Input) == 0 {
            currentToolCall.Input = inferToolParameters(currentToolCall.Name, streamingState.Context)
        }
        
        // CRITICAL: Ensure parameters are at the correct level
        toolRequest := map[string]interface{}{
            "request_id": currentToolCall.ID,
            "tool":       currentToolCall.Name,
            "streaming_mode": true,
            "autonomy_mode": autonomyMode,
        }
        
        // Flatten the input parameters at the top level for Excel bridge
        for k, v := range currentToolCall.Input {
            toolRequest[k] = v
        }
    }
```

**Add parameter inference helper**:
```go
// File: /backend/internal/services/excel_bridge.go (new function)
func inferToolParameters(toolName string, context *ai.FinancialContext) map[string]interface{} {
    params := make(map[string]interface{})
    
    switch toolName {
    case "write_range":
        // Use selected range from context if available
        if context != nil && context.SelectedRange != "" {
            params["range"] = context.SelectedRange
        } else {
            params["range"] = "A1" // Default
        }
        params["values"] = [][]interface{}{} // Empty default
        
    case "format_range":
        if context != nil && context.SelectedRange != "" {
            params["range"] = context.SelectedRange
        } else {
            params["range"] = "A1"
        }
        params["format"] = map[string]interface{}{} // Empty format object
        
    case "apply_formula":
        if context != nil && context.SelectedRange != "" {
            params["range"] = context.SelectedRange
        }
        params["formula"] = "" // Empty formula
    }
    
    eb.logger.WithFields(logrus.Fields{
        "tool": toolName,
        "inferred_params": params,
    }).Warn("Inferred tool parameters due to empty input")
    
    return params
}
```

#### 1.2 Lightweight Context Provider
Create a cached, non-blocking context system that provides essential information without tool calls.

**Files to create/modify:**
- `/backend/internal/services/excel/context_provider.go` (new file)
- `/backend/internal/services/excel/context_builder.go`

**Implementation**:
```go
// File: /backend/internal/services/excel/context_provider.go
package excel

import (
    "sync"
    "time"
)

type CachedContextProvider struct {
    mu sync.RWMutex
    cache map[string]*LightweightContext
    ttl time.Duration
}

type LightweightContext struct {
    SessionID    string
    IsEmpty      bool
    RowCount     int
    ColumnCount  int
    LastModified time.Time
    SheetName    string
    ActiveRange  string
    CachedAt     time.Time
    // Key metrics without requiring tool calls
    HasFormulas  bool
    HasCharts    bool
    ModelType    string // DCF, LBO, etc. if detected
}

func NewCachedContextProvider(ttl time.Duration) *CachedContextProvider {
    return &CachedContextProvider{
        cache: make(map[string]*LightweightContext),
        ttl:   ttl,
    }
}

func (cp *CachedContextProvider) GetContext(sessionID string) *LightweightContext {
    cp.mu.RLock()
    defer cp.mu.RUnlock()
    
    ctx, exists := cp.cache[sessionID]
    if !exists || time.Since(ctx.CachedAt) > cp.ttl {
        return &LightweightContext{
            SessionID: sessionID,
            IsEmpty:   false, // Assume not empty to avoid unnecessary checks
            SheetName: "Sheet1",
            ActiveRange: "A1:Z100", // Default range
            CachedAt:  time.Now(),
        }
    }
    return ctx
}

// Update context when Excel operations happen
func (cp *CachedContextProvider) UpdateFromToolResult(sessionID string, tool string, result interface{}) {
    cp.mu.Lock()
    defer cp.mu.Unlock()
    
    ctx, exists := cp.cache[sessionID]
    if !exists {
        ctx = &LightweightContext{SessionID: sessionID}
    }
    
    // Update context based on tool results
    switch tool {
    case "write_range":
        ctx.IsEmpty = false
        ctx.LastModified = time.Now()
    case "read_range":
        // Parse result to update row/column counts
        if data, ok := result.(map[string]interface{}); ok {
            if values, ok := data["values"].([][]interface{}); ok {
                ctx.RowCount = len(values)
                if len(values) > 0 {
                    ctx.ColumnCount = len(values[0])
                }
            }
        }
    }
    
    ctx.CachedAt = time.Now()
    cp.cache[sessionID] = ctx
}
```

### Phase 2: Enhance UI Persistence & Status

#### 2.1 Make Diff Preview Cards Persistent
Enhance the existing `ChatMessageDiffPreview` to persist after accept/reject.

**Files to modify:**
- `/excel-addin/src/components/chat/ChatMessageDiffPreview.tsx`
- `/excel-addin/src/components/chat/messages/ToolSuggestionCard.tsx`

**Implementation**:
```typescript
// File: /excel-addin/src/components/chat/ChatMessageDiffPreview.tsx
export const ChatMessageDiffPreview: React.FC<ChatMessageDiffPreviewProps> = ({
  messageId,
  hunks,
  onAccept,
  onReject,
  status
}) => {
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [isCollapsed, setIsCollapsed] = React.useState(status !== 'previewing');
  
  // Calculate summary statistics
  const stats = hunks.reduce((acc, hunk) => {
    if (hunk.kind === 'Added') acc.added++;
    else if (hunk.kind === 'Deleted') acc.removed++;
    else acc.modified++;
    return acc;
  }, { added: 0, removed: 0, modified: 0 });

  const summaryParts = [];
  if (stats.added > 0) summaryParts.push(`+${stats.added} cells`);
  if (stats.removed > 0) summaryParts.push(`-${stats.removed} cells`);
  if (stats.modified > 0) summaryParts.push(`~${stats.modified} changes`);
  const summary = summaryParts.join(', ');

  // Get status-specific styling
  const getStatusIcon = () => {
    switch (status) {
      case 'accepted':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'applying':
        return <Loader className="w-4 h-4 text-blue-600 animate-spin" />;
      default:
        return null;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'previewing':
        return 'Preview:';
      case 'applying':
        return 'Applying...';
      case 'accepted':
        return 'Changes Applied:';
      case 'rejected':
        return 'Changes Rejected:';
      default:
        return 'Changes:';
    }
  };

  return (
    <div className={`mt-2 ml-8 p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 shadow-sm font-mono text-xs ${status}`}>
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center space-x-2">
          {getStatusIcon()}
          <span className="font-medium text-gray-800 dark:text-gray-300">
            {getStatusText()} {summary}
          </span>
          {status === 'accepted' && (
            <span className="text-xs text-gray-500">
              {new Date().toLocaleTimeString()}
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {status === 'previewing' && onAccept && onReject && (
            <>
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  if (isProcessing) return;
                  setIsProcessing(true);
                  try {
                    await onAccept();
                  } finally {
                    setIsProcessing(false);
                  }
                }}
                disabled={isProcessing}
                className="inline-flex items-center gap-1 px-2 py-0.5 font-caption text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed rounded transition-colors"
              >
                <CheckIcon className="w-3 h-3" />
                {isProcessing ? 'Accepting...' : 'Accept'}
              </button>
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  if (isProcessing) return;
                  setIsProcessing(true);
                  try {
                    await onReject();
                  } finally {
                    setIsProcessing(false);
                  }
                }}
                disabled={isProcessing}
                className="inline-flex items-center gap-1 px-2 py-0.5 font-caption text-gray-700 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed dark:text-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 dark:disabled:bg-gray-800 dark:disabled:text-gray-500 rounded transition-colors"
              >
                <XMarkIcon className="w-3 h-3" />
                {isProcessing ? 'Rejecting...' : 'Reject'}
              </button>
            </>
          )}
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isCollapsed ? '' : 'rotate-180'}`} />
        </div>
      </div>

      {/* Collapsible diff details */}
      {!isCollapsed && hunks.length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 space-y-1">
          {hunks.slice(0, 5).map((hunk, index) => {
            const cellAddr = `${hunk.key.sheet}!${String.fromCharCode(65 + hunk.key.col)}${hunk.key.row + 1}`;
            return (
              <div key={index} className="flex items-start space-x-1 text-xs">
                <span className={`font-medium w-3 text-center ${
                  hunk.kind === 'Added' ? 'text-green-600' : 
                  hunk.kind === 'Deleted' ? 'text-red-600' : 
                  'text-yellow-600'
                }`}>
                  {hunk.kind === 'Added' ? '+' : hunk.kind === 'Deleted' ? '-' : '~'}
                </span>
                <span className="font-medium text-gray-800 dark:text-gray-300 min-w-[4rem]">{cellAddr}</span>
                <span className="text-gray-500 dark:text-gray-400 flex-1 truncate">
                  {/* Show value preview */}
                  {hunk.kind === 'Deleted' ? (
                    '(deleted)'
                  ) : hunk.after?.f ? (
                    `=${hunk.after.f}`
                  ) : (
                    hunk.after?.v || 'new value'
                  )}
                </span>
              </div>
            );
          })}
          {hunks.length > 5 && (
            <div className="text-gray-500 dark:text-gray-400 pl-5">
              ...and {hunks.length - 5} more change{hunks.length > 6 ? 's' : ''}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
```

#### 2.2 Enhance GridVisualizer for Status Overlays
Add status indicators to the existing color-coded highlights.

**Files to modify:**
- `/excel-addin/src/services/diff/GridVisualizer.ts`

**Implementation**:
```typescript
// File: /excel-addin/src/services/diff/GridVisualizer.ts (add to existing class)
/**
 * Apply status overlay to previously highlighted cells
 */
static async applyStatusOverlay(hunks: DiffHunk[], status: 'accepted' | 'rejected', addLog?: LogFunction): Promise<void> {
  const log = addLog || ((type, message, data) => console.log(`[${type}] ${message}`, data));
  
  if (!hunks || hunks.length === 0) return;
  
  log('info', `[Visualizer] Applying ${status} status overlay to ${hunks.length} cells`);
  
  return Excel.run(async (context: any) => {
    const workbook = context.workbook;
    const hunksBySheet = this.groupHunksBySheet(hunks);
    
    for (const [sheetName, sheetHunks] of hunksBySheet) {
      try {
        const worksheet = workbook.worksheets.getItem(sheetName);
        
        for (const hunk of sheetHunks) {
          const range = worksheet.getCell(hunk.key.row, hunk.key.col);
          
          if (status === 'accepted') {
            // Add subtle green checkmark icon or border
            range.format.borders.getItem('EdgeRight').style = 'Continuous';
            range.format.borders.getItem('EdgeRight').color = '#00B050';
            range.format.borders.getItem('EdgeRight').weight = 'Thick';
          } else if (status === 'rejected') {
            // Add subtle red X or border
            range.format.borders.getItem('EdgeLeft').style = 'Continuous';
            range.format.borders.getItem('EdgeLeft').color = '#FF0000';
            range.format.borders.getItem('EdgeLeft').weight = 'Thick';
          }
        }
      } catch (error) {
        log('error', `[Visualizer] Error applying status overlay to sheet ${sheetName}:`, error);
      }
    }
    
    await context.sync();
  });
}
```

### Phase 3: Enhanced Streaming UX

#### 3.1 Streaming Status Bar
Show real-time status of what the AI is doing.

**Files to create:**
- `/excel-addin/src/components/chat/StreamingStatusBar.tsx` (new file)

**Implementation**:
```typescript
// File: /excel-addin/src/components/chat/StreamingStatusBar.tsx
import React from 'react';
import { CheckCircle, Circle, Loader } from 'lucide-react';

interface Task {
  id: string;
  description: string;
  status: 'pending' | 'active' | 'complete';
  progress?: string;
}

interface StreamingStatusBarProps {
  phase: 'initial' | 'tool_execution' | 'continuation' | 'final';
  tasks?: Task[];
  currentAction?: string;
}

export const StreamingStatusBar: React.FC<StreamingStatusBarProps> = ({
  phase,
  tasks = [],
  currentAction
}) => {
  if (phase === 'initial') {
    return (
      <div className="streaming-status-bar initial p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center space-x-2">
        <Loader className="animate-spin text-blue-600" size={16} />
        <span className="text-sm text-blue-700 dark:text-blue-300">Analyzing your request...</span>
      </div>
    );
  }

  if (phase === 'tool_execution' && tasks.length > 0) {
    return (
      <div className="streaming-status-bar tool-execution p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="task-list space-y-1">
          {tasks.map(task => (
            <div key={task.id} className={`task-item flex items-center space-x-2 text-sm ${task.status}`}>
              {task.status === 'complete' && <CheckCircle className="text-green-500" size={14} />}
              {task.status === 'active' && <Loader className="text-blue-500 animate-spin" size={14} />}
              {task.status === 'pending' && <Circle className="text-gray-400" size={14} />}
              <span className={`task-description ${
                task.status === 'complete' ? 'text-gray-600 dark:text-gray-400 line-through' :
                task.status === 'active' ? 'text-gray-900 dark:text-gray-100 font-medium' :
                'text-gray-500 dark:text-gray-400'
              }`}>
                {task.description}
                {task.progress && <span className="text-xs text-gray-500 ml-1">({task.progress})</span>}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
};
```

#### 3.2 Context Pills with Warnings
Enhance existing context display to show warnings.

**Files to modify:**
- `/excel-addin/src/components/chat/ContextPills.tsx` (if exists, otherwise create)

**Implementation**:
```typescript
// File: /excel-addin/src/components/chat/ContextPills.tsx
import React from 'react';
import { FileSpreadsheet, AlertTriangle, Grid3x3 } from 'lucide-react';
import { ExcelService } from '../../services/excel/ExcelService';

interface ContextPill {
  type: 'sheet' | 'range' | 'workbook';
  value: string;
  truncated?: boolean;
  warning?: string;
  onClick?: () => void;
}

export const ContextPill: React.FC<{ pill: ContextPill }> = ({ pill }) => {
  const excelService = ExcelService.getInstance();
  
  const handleClick = async () => {
    if (pill.onClick) {
      pill.onClick();
    } else if (pill.type === 'range') {
      // Navigate to range
      await excelService.navigateToRange(pill.value);
    } else if (pill.type === 'sheet') {
      // Navigate to sheet
      await excelService.navigateToSheet(pill.value);
    }
  };

  const getIcon = () => {
    switch (pill.type) {
      case 'sheet':
        return <FileSpreadsheet size={14} />;
      case 'range':
        return <Grid3x3 size={14} />;
      default:
        return null;
    }
  };

  return (
    <button
      className={`context-pill inline-flex items-center space-x-1 px-2 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors ${
        pill.truncated ? 'border border-yellow-400' : ''
      }`}
      onClick={handleClick}
      title={pill.warning}
    >
      {getIcon()}
      <span>{pill.value}</span>
      {pill.truncated && (
        <AlertTriangle size={12} className="text-yellow-500" />
      )}
    </button>
  );
};
```

### Phase 4: Professional Polish

#### 4.1 Full Diff Review Modal
Enhance the existing `ExcelDiffRenderer` for comprehensive diff review.

**Files to create:**
- `/excel-addin/src/components/diff/FullDiffModal.tsx`

**Implementation**:
```typescript
// File: /excel-addin/src/components/diff/FullDiffModal.tsx
import React, { useState } from 'react';
import { ExcelDiffRenderer } from '../chat/diff/ExcelDiffRenderer';
import { DiffHunk } from '../../types/diff';
import { Modal } from '../ui/Modal';

interface FullDiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  hunks: DiffHunk[];
  onAccept: (selectedHunks: DiffHunk[]) => void;
  onReject: () => void;
}

export const FullDiffModal: React.FC<FullDiffModalProps> = ({
  isOpen,
  onClose,
  hunks,
  onAccept,
  onReject
}) => {
  const [selectedHunks, setSelectedHunks] = useState<Set<string>>(
    new Set(hunks.map(h => `${h.key.sheet}!${h.key.row}:${h.key.col}`))
  );

  const toggleHunk = (hunkId: string) => {
    const newSelected = new Set(selectedHunks);
    if (newSelected.has(hunkId)) {
      newSelected.delete(hunkId);
    } else {
      newSelected.add(hunkId);
    }
    setSelectedHunks(newSelected);
  };

  const handleAcceptSelected = () => {
    const selected = hunks.filter(h => 
      selectedHunks.has(`${h.key.sheet}!${h.key.row}:${h.key.col}`)
    );
    onAccept(selected);
  };

  // Group hunks by type for better organization
  const hunksByType = hunks.reduce((acc, hunk) => {
    const type = hunk.kind;
    if (!acc[type]) acc[type] = [];
    acc[type].push(hunk);
    return acc;
  }, {} as Record<string, DiffHunk[]>);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <div className="full-diff-modal">
        <div className="modal-header p-4 border-b">
          <h2 className="text-xl font-semibold">Review All Changes</h2>
          <p className="text-sm text-gray-600 mt-1">
            {hunks.length} total changes across {Object.keys(hunksByType).length} types
          </p>
        </div>

        <div className="modal-body p-4 max-h-[60vh] overflow-y-auto">
          {Object.entries(hunksByType).map(([type, typeHunks]) => (
            <div key={type} className="mb-6">
              <h3 className="text-lg font-medium mb-3 flex items-center">
                <span className={`inline-block w-3 h-3 rounded-full mr-2 ${
                  type === 'Added' ? 'bg-green-500' :
                  type === 'Deleted' ? 'bg-red-500' :
                  type === 'ValueChanged' ? 'bg-yellow-500' :
                  type === 'FormulaChanged' ? 'bg-blue-500' :
                  'bg-purple-500'
                }`} />
                {type} ({typeHunks.length})
              </h3>
              
              <div className="space-y-2">
                {typeHunks.map((hunk, idx) => {
                  const hunkId = `${hunk.key.sheet}!${hunk.key.row}:${hunk.key.col}`;
                  const cellAddr = `${hunk.key.sheet}!${String.fromCharCode(65 + hunk.key.col)}${hunk.key.row + 1}`;
                  
                  return (
                    <div key={idx} className="flex items-start space-x-3 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800">
                      <input
                        type="checkbox"
                        checked={selectedHunks.has(hunkId)}
                        onChange={() => toggleHunk(hunkId)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="font-mono text-sm">{cellAddr}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          {hunk.before && (
                            <span className="line-through">{JSON.stringify(hunk.before)}</span>
                          )}
                          {hunk.before && hunk.after && ' → '}
                          {hunk.after && (
                            <span className="text-gray-900 dark:text-gray-100">{JSON.stringify(hunk.after)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="modal-footer p-4 border-t flex justify-between">
          <div className="text-sm text-gray-600">
            {selectedHunks.size} of {hunks.length} changes selected
          </div>
          <div className="space-x-2">
            <button
              onClick={onReject}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded hover:bg-gray-300"
            >
              Reject All
            </button>
            <button
              onClick={handleAcceptSelected}
              disabled={selectedHunks.size === 0}
              className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
              Accept Selected ({selectedHunks.size})
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
```

#### 4.2 Footer with Model Info & Costs
Add footer showing AI model and token usage.

**Files to create:**
- `/excel-addin/src/components/chat/ChatFooter.tsx`

**Implementation**:
```typescript
// File: /excel-addin/src/components/chat/ChatFooter.tsx
import React from 'react';
import { Download, Copy, DollarSign, Cpu } from 'lucide-react';

interface ChatFooterProps {
  modelName?: string;
  tokenCount?: number;
  estimatedCost?: number;
  onExport: (format: 'markdown' | 'pdf') => void;
  onDuplicate: () => void;
}

export const ChatFooter: React.FC<ChatFooterProps> = ({
  modelName,
  tokenCount,
  estimatedCost,
  onExport,
  onDuplicate
}) => {
  return (
    <div className="chat-footer flex items-center justify-between px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
      <div className="footer-info flex items-center space-x-4 text-xs text-gray-600 dark:text-gray-400">
        {modelName && (
          <div className="model-info flex items-center space-x-1">
            <Cpu size={14} />
            <span>{modelName}</span>
          </div>
        )}
        {tokenCount && (
          <div className="token-info">
            <span>{tokenCount.toLocaleString()} tokens</span>
          </div>
        )}
        {estimatedCost !== undefined && (
          <div className="cost-info flex items-center space-x-1">
            <DollarSign size={14} />
            <span>${estimatedCost.toFixed(4)}</span>
          </div>
        )}
      </div>
      
      <div className="footer-actions flex items-center space-x-2">
        <button 
          onClick={() => onExport('markdown')} 
          title="Export to Markdown"
          className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
        >
          <Download size={16} />
        </button>
        <button 
          onClick={onDuplicate} 
          title="Duplicate Chat"
          className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
        >
          <Copy size={16} />
        </button>
      </div>
    </div>
  );
};
```

## Implementation Roadmap

### Week 1: Fix Core Issues
**Priority: Make existing functionality work properly**

1. **Day 1-2**: Fix Tool Parameter Extraction
   - Debug Anthropic streaming to identify why parameters are empty
   - Add comprehensive logging to trace parameter flow
   - Implement parameter inference as fallback
   - Test with simple tool calls (write_range with hardcoded values)

2. **Day 3-4**: Implement Lightweight Context
   - Create CachedContextProvider
   - Update context builder to use cache in streaming mode
   - Hook into tool results to update cache
   - Test that AI receives basic context without tool calls

3. **Day 5**: Fix UI Persistence
   - Update ChatMessageDiffPreview to remain visible after accept/reject
   - Add status indicators and timestamps
   - Ensure diff details are collapsible
   - Test full flow from preview to accepted state

### Week 2: Enhance UX
**Priority: Professional streaming experience**

1. **Day 1-2**: Streaming Status Bar
   - Implement StreamingStatusBar component
   - Hook into streaming phases from backend
   - Show task progress for multi-step operations
   - Test with DCF model creation (multiple tools)

2. **Day 3-4**: Context Pills & Warnings
   - Create/enhance ContextPills component
   - Add click navigation to ranges/sheets
   - Show truncation warnings
   - Test with large spreadsheets

3. **Day 5**: GridVisualizer Enhancements
   - Add status overlay functionality
   - Ensure highlights persist appropriately
   - Test visual feedback for accepted/rejected changes

### Week 3: Polish & Advanced Features
**Priority: Enterprise-ready features**

1. **Day 1-2**: Full Diff Modal
   - Create FullDiffModal using existing components
   - Add partial selection capability
   - Group changes by type
   - Test with large change sets

2. **Day 3-4**: Footer & Export
   - Implement ChatFooter with model/cost info
   - Add export to Markdown functionality
   - Hook up token counting from backend
   - Test cost calculations

3. **Day 5**: Final Integration
   - End-to-end testing of complete flow
   - Performance optimization
   - Documentation updates

## Success Metrics

### Technical Metrics
- **Tool Parameter Success Rate**: > 95% (from current 0%)
- **Excel Execution Rate**: 100% on Accept (from current 0%)
- **Context Cache Hit Rate**: > 80% in streaming mode
- **UI Persistence**: 100% of diff previews remain visible after action

### User Experience Metrics
- **Time to First Token**: < 500ms
- **Tool Execution Visibility**: Real-time status updates
- **Diff Review Time**: < 10s for 100 cell changes
- **Error Recovery**: Clear error messages with retry options

## Testing Strategy

### Unit Tests
```typescript
// Test tool parameter extraction
describe('Tool Parameter Extraction', () => {
  it('should parse tool parameters from streaming chunks', () => {
    // Test with sample Anthropic streaming data
  });
  
  it('should infer parameters when empty', () => {
    // Test parameter inference logic
  });
});

// Test UI persistence
describe('ChatMessageDiffPreview', () => {
  it('should remain visible after acceptance', () => {
    // Test that component doesn't unmount
  });
  
  it('should show correct status indicators', () => {
    // Test status-based rendering
  });
});
```

### Integration Tests
- Full streaming flow with tool execution
- Context caching and updates
- Diff preview to Excel execution
- Multi-tool operation sequences

## Key Differences from Original Plan

1. **Leverage Existing Infrastructure**: Don't rebuild GridVisualizer, ExcelService, or diff calculation - they work well
2. **Focus on Root Causes**: Empty tool parameters and UI persistence are the main issues
3. **Enhance, Don't Replace**: Add features to existing components rather than creating new ones
4. **Simpler Implementation**: Many "new" components can be small enhancements to existing ones

## Conclusion

This updated plan focuses on fixing the actual issues (empty tool parameters and UI persistence) while leveraging GridMate's already sophisticated diff preview system. By enhancing existing components rather than rebuilding, we can achieve the Cursor-like UX more quickly and with less risk. The main priorities are:

1. **Fix tool parameters** - Without this, nothing works
2. **Make UI persistent** - Cards should stay visible with status
3. **Add streaming feedback** - Status bar and context pills
4. **Polish the experience** - Full diff review and professional touches

With these focused improvements, GridMate will provide the same polished, transparent experience as Cursor, but optimized for Excel financial modeling.