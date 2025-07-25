# GridMate Streaming & Context Handling Fix Plan
## Enhanced "Cursor for Financial Modeling" Implementation

## Executive Summary

This plan addresses critical issues in GridMate's streaming chat implementation and enhances it to achieve a Cursor-like UX for financial modeling. The Phase 0 implementation successfully prevents blank chat bubbles but introduces new problems:

1. **Missing Context**: Streaming mode skips context building, causing unnecessary tool calls
2. **Empty Tool Parameters**: Tool calls are sent with empty parameters, causing execution failures
3. **No Excel Updates**: Tool executions don't actually update the spreadsheet
4. **Poor UX**: No persistent tool cards, status indicators, or professional polish

This enhanced plan incorporates Cursor's UX patterns to create a professional financial modeling assistant.

## Current State Analysis

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

#### 3. No Real Excel Integration
The streaming pipeline doesn't wait for or incorporate actual tool results before continuing the response generation.

**Impact**: Zero actual changes to the Excel spreadsheet despite successful AI responses.

## Proposed Solution Architecture

### Phase 1: Smart Context Injection & Tool Parameter Fix (Immediate Priority)

#### 1.1 Lightweight Context Provider
Create a cached, non-blocking context system that provides essential information without tool calls.

**Files to modify:**
- `/backend/internal/services/excel/context_provider.go` (new file)
- `/backend/internal/services/excel/context_builder.go`
- `/backend/internal/services/ai/service.go`

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
            IsEmpty:   true,
            SheetName: "Sheet1",
            CachedAt:  time.Now(),
        }
    }
    return ctx
}

func (cp *CachedContextProvider) UpdateContext(sessionID string, updates func(*LightweightContext)) {
    cp.mu.Lock()
    defer cp.mu.Unlock()
    
    ctx, exists := cp.cache[sessionID]
    if !exists {
        ctx = &LightweightContext{SessionID: sessionID}
    }
    
    updates(ctx)
    ctx.CachedAt = time.Now()
    cp.cache[sessionID] = ctx
}
```

**Benefits**:
- No blocking tool calls during streaming initialization
- AI knows basic sheet state (empty/populated)
- Reduces unnecessary read_range calls

#### 1.2 Fix Tool Parameter Extraction
Fix the empty tool parameters issue in the streaming pipeline.

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
            
            // Log what we're accumulating for debugging
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
            }
        }
        
        // If still empty, try to infer from context
        if len(currentToolCall.Input) == 0 {
            currentToolCall.Input = inferToolParameters(currentToolCall.Name, streamingState.Context)
        }
        
        // Validate before sending
        if err := validateToolParameters(currentToolCall); err != nil {
            eb.logger.WithError(err).Error("Invalid tool parameters")
            // Send error chunk
            outChan <- ai.CompletionChunk{
                Type:     "error",
                Content:  fmt.Sprintf("Tool parameter error: %v", err),
                Done:     false,
            }
            continue
        }
    }
```

#### 1.3 Context Building Enhancement
Modify the context builder to support streaming-friendly operations.

**Files to modify:**
- `/backend/internal/services/excel/context_builder.go`

```go
// File: /backend/internal/services/excel/context_builder.go (modify BuildContextWithRange)
func (cb *ContextBuilder) BuildStreamingContext(ctx context.Context, sessionID string) (*ai.FinancialContext, error) {
    // Get cached lightweight context
    lightCtx := cb.cachedProvider.GetContext(sessionID)
    
    context := &ai.FinancialContext{
        ModelType: "Streaming",
        IsEmpty: lightCtx.IsEmpty,
        DocumentContext: []string{
            fmt.Sprintf("Sheet: %s", lightCtx.SheetName),
            fmt.Sprintf("Status: %s", getSheetStatus(lightCtx)),
            fmt.Sprintf("Active Range: %s", lightCtx.ActiveRange),
        },
        WorksheetName: lightCtx.SheetName,
        SelectedRange: lightCtx.ActiveRange,
    }
    
    // Add cached metrics if available
    if !lightCtx.IsEmpty {
        context.DocumentContext = append(context.DocumentContext,
            fmt.Sprintf("Size: %d rows x %d columns", lightCtx.RowCount, lightCtx.ColumnCount))
        if lightCtx.ModelType != "" {
            context.ModelType = lightCtx.ModelType
        }
    }
    
    return context, nil
}
```

### Phase 2: Tool Result Integration & Persistent Cards

#### 2.1 Streaming State Manager
Implement proper state management for tool execution during streaming.

**Files to create/modify:**
- `/backend/internal/services/streaming/state_manager.go` (new file)
- `/backend/internal/services/excel_bridge.go`

```go
// File: /backend/internal/services/streaming/state_manager.go
package streaming

import (
    "sync"
    "time"
    "github.com/gridmate/backend/internal/services/ai"
)

type StreamingStateManager struct {
    mu             sync.RWMutex
    pendingTools   map[string]*PendingToolExecution
    toolResults    map[string]*ToolResult
    continuation   chan ContinuationSignal
}

type PendingToolExecution struct {
    ToolCall      ai.ToolCall
    RequestTime   time.Time
    ResultChannel chan ToolResult
    Status        ToolStatus
}

type ToolStatus string

const (
    ToolStatusPending   ToolStatus = "pending"
    ToolStatusExecuting ToolStatus = "executing"
    ToolStatusComplete  ToolStatus = "complete"
    ToolStatusFailed    ToolStatus = "failed"
)

type ToolResult struct {
    ToolID      string
    ToolName    string
    Success     bool
    Result      interface{}
    Error       error
    ExecutionMs int64
}

func (sm *StreamingStateManager) RegisterTool(toolCall ai.ToolCall) chan ToolResult {
    sm.mu.Lock()
    defer sm.mu.Unlock()
    
    resultChan := make(chan ToolResult, 1)
    sm.pendingTools[toolCall.ID] = &PendingToolExecution{
        ToolCall:      toolCall,
        RequestTime:   time.Now(),
        ResultChannel: resultChan,
        Status:        ToolStatusPending,
    }
    
    return resultChan
}

func (sm *StreamingStateManager) UpdateToolStatus(toolID string, status ToolStatus) {
    sm.mu.Lock()
    defer sm.mu.Unlock()
    
    if tool, exists := sm.pendingTools[toolID]; exists {
        tool.Status = status
    }
}
```

#### 2.2 Persistent Tool Card Implementation
Implement tool cards that persist in chat with status updates.

**Files to modify:**
- `/excel-addin/src/types/chat.ts`
- `/excel-addin/src/components/chat/messages/ToolCard.tsx` (new file)
- `/excel-addin/src/components/chat/RefactoredChatInterface.tsx`

```typescript
// File: /excel-addin/src/types/chat.ts
export interface ToolCard {
  id: string;
  toolCall: ToolCall;
  status: 'pending' | 'executing' | 'awaiting_approval' | 'accepted' | 'rejected' | 'failed';
  result?: ToolResult;
  error?: string;
  appliedAt?: Date;
  collapsed: boolean;
  affectedCells?: number;
  executionTime?: number;
}

export interface ChatMessage {
  // ... existing fields ...
  toolCard?: ToolCard;
  persistentCard?: boolean; // Flag to keep card after action
}

// File: /excel-addin/src/components/chat/messages/ToolCard.tsx
import React, { useState } from 'react';
import { CheckCircle, XCircle, Clock, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

export const ToolCard: React.FC<{
  card: ToolCard;
  onAccept: () => void;
  onReject: () => void;
  onRetry?: () => void;
}> = ({ card, onAccept, onReject, onRetry }) => {
  const [collapsed, setCollapsed] = useState(card.collapsed);

  const getStatusIcon = () => {
    switch (card.status) {
      case 'accepted':
        return <CheckCircle className="text-green-500" size={20} />;
      case 'rejected':
        return <XCircle className="text-red-500" size={20} />;
      case 'executing':
        return <Clock className="text-blue-500 animate-spin" size={20} />;
      case 'failed':
        return <AlertCircle className="text-red-500" size={20} />;
      default:
        return <Clock className="text-gray-400" size={20} />;
    }
  };

  const getStatusText = () => {
    switch (card.status) {
      case 'accepted':
        return `Changes applied ${card.appliedAt ? new Date(card.appliedAt).toLocaleTimeString() : ''}`;
      case 'rejected':
        return 'Changes rejected';
      case 'executing':
        return 'Executing...';
      case 'failed':
        return `Failed: ${card.error || 'Unknown error'}`;
      case 'awaiting_approval':
        return 'Awaiting your approval';
      default:
        return 'Pending';
    }
  };

  return (
    <div className={`tool-card ${card.status} ${collapsed ? 'collapsed' : ''}`}>
      <div className="tool-card-header" onClick={() => setCollapsed(!collapsed)}>
        <div className="tool-info">
          {getStatusIcon()}
          <span className="tool-name">{card.toolCall.name}</span>
          <span className="status-text">{getStatusText()}</span>
          {card.affectedCells && (
            <span className="affected-cells">{card.affectedCells} cells</span>
          )}
        </div>
        <button className="collapse-toggle">
          {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </button>
      </div>

      {!collapsed && (
        <div className="tool-card-content">
          {/* Tool details, parameters, preview */}
          {card.status === 'awaiting_approval' && (
            <div className="action-buttons">
              <button onClick={onAccept} className="accept-btn">
                Accept Changes
              </button>
              <button onClick={onReject} className="reject-btn">
                Reject
              </button>
            </div>
          )}
          {card.status === 'failed' && onRetry && (
            <button onClick={onRetry} className="retry-btn">
              Retry
            </button>
          )}
        </div>
      )}
    </div>
  );
};
```

#### 2.3 Excel Execution Bridge
Ensure tool executions actually update the spreadsheet.

**Files to modify:**
- `/excel-addin/src/services/ExcelService.ts`
- `/backend/internal/services/excel_bridge.go`

```typescript
// File: /excel-addin/src/services/ExcelService.ts (enhance executeToolRequest)
public async applyToolResult(toolCard: ToolCard): Promise<void> {
  try {
    await Excel.run(async (context) => {
      // Start a batch operation for undo support
      context.runtime.enableEvents = false;
      
      try {
        // Execute the tool
        const result = await this.executeToolRequest(
          toolCard.toolCall.name,
          toolCard.toolCall.parameters
        );
        
        // Update the card with success
        toolCard.status = 'accepted';
        toolCard.appliedAt = new Date();
        toolCard.result = result;
        
        // Track for undo
        this.trackOperation({
          type: 'ai_tool_execution',
          toolId: toolCard.id,
          timestamp: new Date(),
          canUndo: true
        });
        
      } finally {
        context.runtime.enableEvents = true;
        await context.sync();
      }
    });
  } catch (error) {
    toolCard.status = 'failed';
    toolCard.error = error.message;
    throw error;
  }
}

// Add undo support
public async undoLastAIOperation(): Promise<void> {
  const lastOp = this.operationHistory.findLast(op => op.type === 'ai_tool_execution');
  if (lastOp) {
    await Excel.run(async (context) => {
      // Implement undo logic
      context.workbook.undoHistory.undo();
      await context.sync();
    });
  }
}
```

### Phase 3: Enhanced Streaming UX

#### 3.1 Streaming Status Bar
Show real-time status of what the AI is doing.

**Files to create/modify:**
- `/excel-addin/src/components/chat/StreamingStatusBar.tsx` (new file)
- `/excel-addin/src/components/chat/RefactoredChatInterface.tsx`

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
      <div className="streaming-status-bar initial">
        <Loader className="animate-spin" size={16} />
        <span>Analyzing your request...</span>
      </div>
    );
  }

  if (phase === 'tool_execution' && tasks.length > 0) {
    return (
      <div className="streaming-status-bar tool-execution">
        <div className="task-list">
          {tasks.map(task => (
            <div key={task.id} className={`task-item ${task.status}`}>
              {task.status === 'complete' && <CheckCircle size={14} />}
              {task.status === 'active' && <Loader className="animate-spin" size={14} />}
              {task.status === 'pending' && <Circle size={14} />}
              <span className="task-description">
                {task.description}
                {task.progress && <span className="progress"> ({task.progress})</span>}
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
Show what context the AI has access to.

**Files to modify:**
- `/excel-addin/src/components/chat/ContextPills.tsx` (enhance existing)

```typescript
// File: /excel-addin/src/components/chat/ContextPills.tsx
import React from 'react';
import { FileSpreadsheet, AlertTriangle, Grid3x3 } from 'lucide-react';

interface ContextPill {
  type: 'sheet' | 'range' | 'workbook';
  value: string;
  truncated?: boolean;
  warning?: string;
  onClick?: () => void;
}

export const ContextPill: React.FC<{ pill: ContextPill }> = ({ pill }) => {
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
      className={`context-pill ${pill.type} ${pill.truncated ? 'truncated' : ''}`}
      onClick={pill.onClick}
      title={pill.warning}
    >
      {getIcon()}
      <span>{pill.value}</span>
      {pill.truncated && (
        <AlertTriangle size={12} className="warning-icon" />
      )}
    </button>
  );
};
```

#### 3.3 Progressive Response Streaming
Stream partial responses while tools execute.

**Files to modify:**
- `/backend/internal/services/ai/service.go`

```go
// File: /backend/internal/services/ai/service.go (enhance processStreamingWithContinuation)
func (s *Service) streamProgressiveResponse(session *StreamingSession, outChan chan<- CompletionChunk) {
    // Stream initial explanation
    s.streamTokens("I'll create a DCF model for you. Let me first check the current sheet structure...", outChan)
    
    // Create task list for status bar
    tasks := []StreamingTask{
        {ID: "analyze", Description: "Analyzing sheet structure", Status: "active"},
        {ID: "headers", Description: "Creating headers and labels", Status: "pending"},
        {ID: "formulas", Description: "Building financial formulas", Status: "pending"},
        {ID: "format", Description: "Applying professional formatting", Status: "pending"},
    }
    
    // Send task list
    outChan <- CompletionChunk{
        Type: "status_update",
        Content: marshalTasks(tasks),
    }
    
    // Execute tool in background
    go func() {
        result := s.executeToolAsync(toolCall)
        s.injectToolResult(session, result)
        
        // Update task status
        tasks[0].Status = "complete"
        outChan <- CompletionChunk{
            Type: "status_update",
            Content: marshalTasks(tasks),
        }
    }()
    
    // Continue streaming while tool executes
    s.streamTokens("Setting up the model structure with the following sections:\n- Revenue projections\n- Cost analysis\n- Cash flow calculations", outChan)
}
```

### Phase 4: Professional Polish & Advanced Features

#### 4.1 Full Diff Review
Implement comprehensive diff viewing for large changes.

**Files to create/modify:**
- `/excel-addin/src/components/diff/FullDiffModal.tsx` (new file)
- `/excel-addin/src/components/chat/messages/ChatMessageDiffPreview.tsx`

```typescript
// File: /excel-addin/src/components/diff/FullDiffModal.tsx
import React, { useState } from 'react';
import { DiffHunk, CellChange } from '../../types/diff';

interface FullDiffModalProps {
  changes: CellChange[];
  onAccept: (changeIds: string[]) => void;
  onReject: () => void;
  onPartialAccept: (changeIds: string[]) => void;
}

export const FullDiffModal: React.FC<FullDiffModalProps> = ({
  changes,
  onAccept,
  onReject,
  onPartialAccept
}) => {
  const [selectedChanges, setSelectedChanges] = useState<Set<string>>(
    new Set(changes.map(c => c.id))
  );

  const toggleChange = (changeId: string) => {
    const newSelected = new Set(selectedChanges);
    if (newSelected.has(changeId)) {
      newSelected.delete(changeId);
    } else {
      newSelected.add(changeId);
    }
    setSelectedChanges(newSelected);
  };

  return (
    <div className="full-diff-modal">
      <div className="diff-header">
        <h3>Review Changes ({changes.length} cells affected)</h3>
        <div className="diff-legend">
          <span className="added">Added</span>
          <span className="modified">Modified</span>
          <span className="removed">Removed</span>
        </div>
      </div>
      
      <div className="diff-grid">
        <table>
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={selectedChanges.size === changes.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedChanges(new Set(changes.map(c => c.id)));
                    } else {
                      setSelectedChanges(new Set());
                    }
                  }}
                />
              </th>
              <th>Cell</th>
              <th>Current</th>
              <th>Proposed</th>
              <th>Type</th>
            </tr>
          </thead>
          <tbody>
            {changes.map(change => (
              <tr key={change.id} className={`change-row ${change.type}`}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedChanges.has(change.id)}
                    onChange={() => toggleChange(change.id)}
                  />
                </td>
                <td>{change.cell}</td>
                <td className="current-value">{change.oldValue}</td>
                <td className="new-value">{change.newValue}</td>
                <td>{change.type}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="diff-actions">
        <button 
          onClick={() => onPartialAccept(Array.from(selectedChanges))}
          disabled={selectedChanges.size === 0}
        >
          Apply Selected ({selectedChanges.size})
        </button>
        <button onClick={() => onAccept(changes.map(c => c.id))}>
          Apply All
        </button>
        <button onClick={onReject}>
          Reject All
        </button>
      </div>
    </div>
  );
};
```

#### 4.2 Footer Utilities
Add model info, token usage, and export capabilities.

**Files to create/modify:**
- `/excel-addin/src/components/chat/ChatFooter.tsx` (new file)
- `/excel-addin/src/components/chat/RefactoredChatInterface.tsx`

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
    <div className="chat-footer">
      <div className="footer-info">
        {modelName && (
          <div className="model-info">
            <Cpu size={14} />
            <span>{modelName}</span>
          </div>
        )}
        {tokenCount && (
          <div className="token-info">
            <span>{tokenCount.toLocaleString()} tokens</span>
          </div>
        )}
        {estimatedCost && (
          <div className="cost-info">
            <DollarSign size={14} />
            <span>${estimatedCost.toFixed(4)}</span>
          </div>
        )}
      </div>
      
      <div className="footer-actions">
        <button onClick={() => onExport('markdown')} title="Export to Markdown">
          <Download size={16} />
          MD
        </button>
        <button onClick={() => onExport('pdf')} title="Export to PDF">
          <Download size={16} />
          PDF
        </button>
        <button onClick={onDuplicate} title="Duplicate Chat">
          <Copy size={16} />
        </button>
      </div>
    </div>
  );
};
```

#### 4.3 Queue Management
Handle multiple prompts gracefully.

**Files to create/modify:**
- `/excel-addin/src/hooks/usePromptQueue.ts` (new file)
- `/excel-addin/src/components/chat/QueuedPromptIndicator.tsx` (new file)

```typescript
// File: /excel-addin/src/hooks/usePromptQueue.ts
import { useState, useCallback } from 'react';

interface QueuedPrompt {
  id: string;
  content: string;
  position: number;
  status: 'queued' | 'processing' | 'complete';
}

export const usePromptQueue = () => {
  const [queue, setQueue] = useState<QueuedPrompt[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const addToQueue = useCallback((content: string) => {
    const newPrompt: QueuedPrompt = {
      id: `prompt_${Date.now()}`,
      content,
      position: queue.length + 1,
      status: 'queued'
    };
    
    setQueue(prev => [...prev, newPrompt]);
    return newPrompt.id;
  }, [queue.length]);

  const processNext = useCallback(async () => {
    if (isProcessing || queue.length === 0) return;
    
    const next = queue[0];
    setIsProcessing(true);
    setQueue(prev => prev.map(p => 
      p.id === next.id ? { ...p, status: 'processing' } : p
    ));
    
    // Process the prompt
    try {
      // ... actual processing
    } finally {
      setQueue(prev => prev.filter(p => p.id !== next.id));
      setIsProcessing(false);
    }
  }, [queue, isProcessing]);

  return {
    queue,
    addToQueue,
    processNext,
    isProcessing,
    queueLength: queue.length
  };
};

// File: /excel-addin/src/components/chat/QueuedPromptIndicator.tsx
export const QueuedPromptIndicator: React.FC<{ queue: QueuedPrompt[] }> = ({ queue }) => {
  if (queue.length === 0) return null;
  
  return (
    <div className="queued-prompts">
      {queue.map(prompt => (
        <div key={prompt.id} className="queued-prompt">
          <span className="queue-position">#{prompt.position} in queue</span>
          <span className="prompt-preview">{prompt.content.slice(0, 50)}...</span>
        </div>
      ))}
    </div>
  );
};
```

#### 4.4 Error Recovery & Safety
Implement robust error handling with retry capabilities.

**Files to modify:**
- `/excel-addin/src/components/chat/messages/ToolCard.tsx`
- `/backend/internal/services/excel_bridge.go`

```go
// File: /backend/internal/services/excel_bridge.go (add retry logic)
func (eb *ExcelBridge) executeToolWithRetry(ctx context.Context, toolCall ai.ToolCall, maxRetries int) (*ToolResult, error) {
    var lastErr error
    
    for attempt := 0; attempt <= maxRetries; attempt++ {
        if attempt > 0 {
            // Exponential backoff
            backoff := time.Duration(math.Pow(2, float64(attempt))) * time.Second
            select {
            case <-ctx.Done():
                return nil, ctx.Err()
            case <-time.After(backoff):
            }
        }
        
        result, err := eb.executeToolRequest(ctx, toolCall)
        if err == nil {
            return result, nil
        }
        
        lastErr = err
        eb.logger.WithFields(logrus.Fields{
            "tool_id": toolCall.ID,
            "attempt": attempt + 1,
            "error": err.Error(),
        }).Warn("Tool execution failed, retrying")
    }
    
    return nil, fmt.Errorf("tool execution failed after %d attempts: %w", maxRetries+1, lastErr)
}
```

## Implementation Roadmap

### Week 1: Core Fixes & Context System
**Priority: Fix broken functionality**

1. **Day 1-2**: Fix Tool Parameter Extraction
   - Debug Anthropic streaming to understand why parameters are empty
   - Implement parameter inference/validation
   - Add comprehensive logging

2. **Day 3-4**: Implement CachedContextProvider
   - Create cache structure with TTL
   - Add update hooks to Excel operations
   - Integrate with streaming context builder

3. **Day 5**: Excel Execution Bridge
   - Ensure "Accept" actually applies changes
   - Implement batch operations for undo support
   - Add execution confirmation

### Week 2: Tool Cards & State Management
**Priority: Professional UX for tool execution**

1. **Day 1-2**: Persistent Tool Cards
   - Implement ToolCard component with status states
   - Add collapse/expand functionality
   - Integrate with chat message flow

2. **Day 3-4**: StreamingStateManager
   - Implement tool tracking and status updates
   - Add result injection into streaming
   - Create timeout handling

3. **Day 5**: Testing & Polish
   - End-to-end tool execution testing
   - UI state persistence
   - Performance optimization

### Week 3: Streaming UX & Status
**Priority: Real-time feedback and transparency**

1. **Day 1-2**: Streaming Status Bar
   - Implement task list with progress
   - Add phase indicators
   - Integrate with streaming events

2. **Day 3-4**: Context Pills & Warnings
   - Enhance context pill component
   - Add truncation warnings
   - Implement click actions

3. **Day 5**: Progressive Streaming
   - Implement content buffering
   - Add smooth transitions
   - Test with complex operations

### Week 4: Professional Polish
**Priority: Enterprise-ready features**

1. **Day 1-2**: Full Diff Review
   - Implement comprehensive diff modal
   - Add partial accept/reject
   - Integrate with Excel grid

2. **Day 3-4**: Footer Utilities & Queue
   - Add model/token/cost display
   - Implement export functionality
   - Create prompt queue system

3. **Day 5**: Error Handling & Safety
   - Add retry mechanisms
   - Implement graceful degradation
   - Final testing and polish

## Success Metrics

### Technical Metrics
- **Tool Parameter Success Rate**: > 95% (from current 0%)
- **Excel Execution Rate**: 100% on Accept (from current 0%)
- **Context Availability**: 100% in streaming mode
- **Streaming Latency**: < 500ms to first token
- **Tool Round-trip Time**: < 2s average

### User Experience Metrics
- **Tool Card Persistence**: 100% retention in chat
- **Status Visibility**: Real-time updates during execution
- **Error Recovery Rate**: > 90% successful retries
- **Undo Success Rate**: 100% for AI operations

## Testing Strategy

### Unit Tests
```go
// File: /backend/internal/services/excel/context_provider_test.go
func TestCachedContextProvider(t *testing.T) {
    // Test cache hit/miss
    // Test TTL expiration
    // Test concurrent access
}

// File: /backend/internal/services/streaming/state_manager_test.go
func TestStreamingStateManager(t *testing.T) {
    // Test tool registration
    // Test status updates
    // Test result injection
}
```

### Integration Tests
```typescript
// File: /excel-addin/src/tests/integration/streaming.test.ts
describe('Streaming Integration', () => {
  it('should apply tool results to Excel', async () => {
    // Test full flow from AI response to Excel update
  });
  
  it('should persist tool cards after execution', async () => {
    // Test card state persistence
  });
});
```

### E2E Tests
- Full DCF model creation flow
- Multi-tool execution sequences
- Error recovery scenarios
- Concurrent user sessions

## Monitoring & Observability

### Key Metrics to Track
```go
// File: /backend/internal/metrics/streaming_metrics.go
type StreamingMetrics struct {
    ToolParameterErrors   prometheus.Counter
    ToolExecutionSuccess  prometheus.Counter
    ToolExecutionFailure  prometheus.Counter
    StreamingLatency      prometheus.Histogram
    ContextCacheHitRate   prometheus.Gauge
    ActiveStreamingSessions prometheus.Gauge
}
```

### Structured Logging
```go
// Enhanced logging for debugging
log.Info().
    Str("session_id", session.ID).
    Str("phase", phase).
    Int("context_size", len(context)).
    Bool("has_tools", len(tools) > 0).
    Dur("latency", latency).
    Interface("tool_params", toolCall.Input).
    Msg("[STREAMING] Phase transition with parameters")
```

## Conclusion

This enhanced plan transforms GridMate from a proof-of-concept into a professional "Cursor for Financial Modeling" tool by:

1. **Fixing Core Issues**: Tool parameters and Excel execution
2. **Professional UX**: Persistent cards, status indicators, and polish
3. **Safety & Control**: Undo support, error recovery, and transparency
4. **Enterprise Features**: Export, history, and cost tracking

The phased approach ensures each improvement is tested and validated before moving forward, minimizing risk while delivering incremental value. With these enhancements, GridMate will provide the same level of polish and user control that makes Cursor so effective, but tailored specifically for financial modeling in Excel.