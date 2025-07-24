# GridMate Streaming Implementation Roadmap

## Executive Summary
This document provides a detailed implementation roadmap for enhancing GridMate's streaming capabilities to provide real-time visibility into AI tool execution, building upon the Anthropic tool enhancements already implemented.

## Current State Analysis

### What's Already Implemented
1. **Backend (Go)**:
   - Basic streaming support in `anthropic.go`
   - Tool choice parameter implementation
   - Enhanced error handling with categorization
   - CompletionChunk structure with tool event types

2. **Communication Layer**:
   - SignalR bridge for real-time messaging
   - WebSocket client in Excel add-in
   - Basic message routing infrastructure

3. **Missing Components**:
   - Progress tracking within tool execution
   - Rich streaming UI components
   - Tool-specific progress indicators
   - Cancellation mechanism

## Phase 1: Backend Streaming Infrastructure (Week 1)

### 1.1 Enhanced Tool Executor with Progress Reporting

**File**: `backend/internal/services/ai/tool_executor.go`

```go
// Add progress reporting interface
type ProgressReporter interface {
    ReportProgress(toolID string, progress float64, message string)
    ReportStage(toolID string, stage string, stageNumber int, totalStages int)
}

// Enhance ToolExecutor
type ToolExecutor struct {
    // ... existing fields ...
    progressReporter ProgressReporter
    streamingEnabled bool
}
```

### 1.2 Tool-Specific Progress Implementation

**File**: `backend/internal/services/ai/tool_executor_basic_ops.go`

```go
// Enhanced read_range with progress
func (te *ToolExecutor) executeReadRangeWithProgress(ctx context.Context, sessionID string, input map[string]interface{}) error {
    rangeStr := input["range"].(string)
    rangeInfo := parseRange(rangeStr)
    totalCells := rangeInfo.RowCount * rangeInfo.ColCount
    
    // Report initial stage
    if te.streamingEnabled {
        te.progressReporter.ReportStage(input["toolID"].(string), "Parsing range", 1, 3)
    }
    
    // Read data with progress
    data, err := te.excelBridge.ReadRange(ctx, sessionID, rangeStr)
    if err != nil {
        return err
    }
    
    // Report completion
    if te.streamingEnabled {
        te.progressReporter.ReportStage(input["toolID"].(string), "Complete", 3, 3)
        te.progressReporter.ReportProgress(input["toolID"].(string), 1.0, 
            fmt.Sprintf("Read %d cells successfully", totalCells))
    }
    
    return nil
}
```

### 1.3 Streaming Channel Management

**File**: `backend/internal/services/ai/streaming_manager.go` (new)

```go
package ai

import (
    "context"
    "sync"
    "time"
)

type StreamingManager struct {
    channels map[string]chan<- CompletionChunk
    mu       sync.RWMutex
}

func NewStreamingManager() *StreamingManager {
    return &StreamingManager{
        channels: make(map[string]chan<- CompletionChunk),
    }
}

func (sm *StreamingManager) RegisterChannel(sessionID string, ch chan<- CompletionChunk) {
    sm.mu.Lock()
    defer sm.mu.Unlock()
    sm.channels[sessionID] = ch
}

func (sm *StreamingManager) SendToolProgress(sessionID string, toolCall *ToolCall, progress float64, message string) {
    sm.mu.RLock()
    ch, exists := sm.channels[sessionID]
    sm.mu.RUnlock()
    
    if exists {
        chunk := CompletionChunk{
            Type: "tool_progress",
            ToolCall: toolCall,
            Content: message,
            Progress: progress,
            Timestamp: time.Now(),
        }
        
        select {
        case ch <- chunk:
        case <-time.After(100 * time.Millisecond):
            // Don't block if channel is full
        }
    }
}
```

## Phase 2: SignalR Integration (Week 1-2)

### 2.1 Enhanced SignalR Handler

**File**: `backend/internal/handlers/signalr_handler.go`

```go
// Add streaming support to SignalR handler
func (h *SignalRHandler) HandleStreamingChat(w http.ResponseWriter, r *http.Request) {
    // ... existing setup ...
    
    // Create streaming channel
    streamChan := make(chan ai.CompletionChunk, 100)
    
    // Register channel with streaming manager
    h.streamingManager.RegisterChannel(req.SessionID, streamChan)
    defer h.streamingManager.UnregisterChannel(req.SessionID)
    
    // Process in goroutine
    go func() {
        for chunk := range streamChan {
            h.forwardStreamChunk(req.SessionID, chunk)
        }
    }()
    
    // Process chat with streaming
    response, err := h.excelBridge.ProcessChatWithStreaming(ctx, chatMsg)
    // ... handle response ...
}

func (h *SignalRHandler) forwardStreamChunk(sessionID string, chunk ai.CompletionChunk) {
    payload := map[string]interface{}{
        "type": "stream_chunk",
        "chunk": map[string]interface{}{
            "type":      chunk.Type,
            "content":   chunk.Content,
            "progress":  chunk.Progress,
            "toolCall":  chunk.ToolCall,
            "timestamp": chunk.Timestamp,
        },
    }
    
    h.signalRBridge.ForwardToClient(sessionID, "streamChunk", payload)
}
```

### 2.2 SignalR Service Updates (C#)

**File**: `signalr-service/GridmateSignalR/Hubs/GridmateHub.cs`

```csharp
public class StreamChunk
{
    public string Type { get; set; }
    public string Content { get; set; }
    public double? Progress { get; set; }
    public ToolCallInfo ToolCall { get; set; }
    public DateTime Timestamp { get; set; }
}

public async Task SendStreamChunk(string connectionId, StreamChunk chunk)
{
    await Clients.Client(connectionId).SendAsync("ReceiveStreamChunk", chunk);
}

// Handle progress updates
public async Task BroadcastToolProgress(string sessionId, string toolId, double progress, string message)
{
    var chunk = new StreamChunk
    {
        Type = "tool_progress",
        Progress = progress,
        Content = message,
        ToolCall = new ToolCallInfo { Id = toolId },
        Timestamp = DateTime.UtcNow
    };
    
    await SendStreamChunk(sessionId, chunk);
}
```

## Phase 3: Frontend UI Components (Week 2)

### 3.1 Streaming Progress Component

**File**: `excel-addin/src/components/StreamingProgress.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { ProgressBar, Stack, Text, Icon } from '@fluentui/react';

interface ToolProgress {
    toolId: string;
    toolName: string;
    progress: number;
    message: string;
    stage?: string;
    icon?: string;
}

export const StreamingProgress: React.FC = () => {
    const [activeTools, setActiveTools] = useState<Map<string, ToolProgress>>(new Map());
    
    useEffect(() => {
        // Subscribe to streaming events
        const handleStreamChunk = (chunk: any) => {
            if (chunk.type === 'tool_progress' && chunk.toolCall) {
                setActiveTools(prev => {
                    const updated = new Map(prev);
                    updated.set(chunk.toolCall.id, {
                        toolId: chunk.toolCall.id,
                        toolName: chunk.toolCall.name,
                        progress: chunk.progress || 0,
                        message: chunk.content,
                        stage: chunk.stage
                    });
                    return updated;
                });
            } else if (chunk.type === 'tool_complete' && chunk.toolCall) {
                // Remove completed tool after animation
                setTimeout(() => {
                    setActiveTools(prev => {
                        const updated = new Map(prev);
                        updated.delete(chunk.toolCall.id);
                        return updated;
                    });
                }, 2000);
            }
        };
        
        // Subscribe to SignalR events
        window.signalRClient?.on('ReceiveStreamChunk', handleStreamChunk);
        
        return () => {
            window.signalRClient?.off('ReceiveStreamChunk', handleStreamChunk);
        };
    }, []);
    
    return (
        <Stack tokens={{ childrenGap: 10 }} styles={{ root: { padding: 10 } }}>
            {Array.from(activeTools.values()).map(tool => (
                <Stack key={tool.toolId} tokens={{ childrenGap: 5 }}>
                    <Stack horizontal tokens={{ childrenGap: 10 }}>
                        <Icon iconName={getToolIcon(tool.toolName)} />
                        <Text variant="medium">{getToolDisplayName(tool.toolName)}</Text>
                    </Stack>
                    <ProgressBar
                        percentComplete={tool.progress}
                        label={tool.message}
                        description={tool.stage}
                        styles={{
                            root: { width: '100%' },
                            progressBar: { 
                                backgroundColor: getToolColor(tool.toolName) 
                            }
                        }}
                    />
                </Stack>
            ))}
        </Stack>
    );
};

function getToolIcon(toolName: string): string {
    const icons: Record<string, string> = {
        'read_range': 'TableComputed',
        'apply_formula': 'CalculatorEqualTo',
        'create_chart': 'BarChartVertical',
        'write_values': 'Edit',
        'format_cells': 'Formatting'
    };
    return icons[toolName] || 'Settings';
}
```

### 3.2 Tool Activity Panel

**File**: `excel-addin/src/components/ToolActivityPanel.tsx`

```typescript
import React, { useState, useRef, useEffect } from 'react';
import { Panel, Stack, Text, Icon, DetailsList } from '@fluentui/react';

interface ToolActivity {
    id: string;
    toolName: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    startTime: Date;
    endTime?: Date;
    details?: any;
    error?: string;
}

export const ToolActivityPanel: React.FC<{ isOpen: boolean; onDismiss: () => void }> = ({ isOpen, onDismiss }) => {
    const [activities, setActivities] = useState<ToolActivity[]>([]);
    const [autoScroll, setAutoScroll] = useState(true);
    const listRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        // Auto-scroll to bottom when new activities are added
        if (autoScroll && listRef.current) {
            listRef.current.scrollTop = listRef.current.scrollHeight;
        }
    }, [activities, autoScroll]);
    
    const columns = [
        {
            key: 'status',
            name: 'Status',
            fieldName: 'status',
            minWidth: 50,
            maxWidth: 50,
            onRender: (item: ToolActivity) => (
                <Icon 
                    iconName={getStatusIcon(item.status)} 
                    styles={{ root: { color: getStatusColor(item.status) } }}
                />
            )
        },
        {
            key: 'tool',
            name: 'Tool',
            fieldName: 'toolName',
            minWidth: 100,
            maxWidth: 150,
            onRender: (item: ToolActivity) => (
                <Text>{getToolDisplayName(item.toolName)}</Text>
            )
        },
        {
            key: 'duration',
            name: 'Duration',
            minWidth: 80,
            maxWidth: 100,
            onRender: (item: ToolActivity) => {
                const duration = item.endTime 
                    ? item.endTime.getTime() - item.startTime.getTime()
                    : Date.now() - item.startTime.getTime();
                return <Text>{formatDuration(duration)}</Text>;
            }
        }
    ];
    
    return (
        <Panel
            isOpen={isOpen}
            onDismiss={onDismiss}
            headerText="AI Assistant Activity"
            closeButtonAriaLabel="Close"
            styles={{ main: { maxWidth: 400 } }}
        >
            <Stack tokens={{ childrenGap: 10 }}>
                <DetailsList
                    items={activities}
                    columns={columns}
                    compact
                    styles={{ root: { maxHeight: 400, overflowY: 'auto' } }}
                />
            </Stack>
        </Panel>
    );
};
```

## Phase 4: Advanced Features (Week 3)

### 4.1 Cancellation Support

**File**: `backend/internal/services/ai/cancellation.go` (new)

```go
package ai

import (
    "context"
    "sync"
)

type CancellationManager struct {
    cancelers map[string]context.CancelFunc
    mu        sync.RWMutex
}

func NewCancellationManager() *CancellationManager {
    return &CancellationManager{
        cancelers: make(map[string]context.CancelFunc),
    }
}

func (cm *CancellationManager) RegisterCancellable(toolID string, cancel context.CancelFunc) {
    cm.mu.Lock()
    defer cm.mu.Unlock()
    cm.cancelers[toolID] = cancel
}

func (cm *CancellationManager) Cancel(toolID string) bool {
    cm.mu.Lock()
    defer cm.mu.Unlock()
    
    if cancel, exists := cm.cancelers[toolID]; exists {
        cancel()
        delete(cm.cancelers, toolID)
        return true
    }
    return false
}
```

### 4.2 Performance Monitoring

**File**: `backend/internal/services/ai/metrics.go` (new)

```go
package ai

import (
    "sync"
    "time"
)

type StreamingMetrics struct {
    mu                sync.RWMutex
    toolExecutions    map[string]*ToolExecutionMetrics
    streamingLatency  []time.Duration
    chunksPerSecond   float64
}

type ToolExecutionMetrics struct {
    ToolName      string
    ExecutionTime time.Duration
    ChunksEmitted int
    BytesSent     int64
    Errors        int
}

func (sm *StreamingMetrics) RecordToolExecution(toolName string, duration time.Duration, chunks int) {
    sm.mu.Lock()
    defer sm.mu.Unlock()
    
    if sm.toolExecutions == nil {
        sm.toolExecutions = make(map[string]*ToolExecutionMetrics)
    }
    
    metrics := sm.toolExecutions[toolName]
    if metrics == nil {
        metrics = &ToolExecutionMetrics{ToolName: toolName}
        sm.toolExecutions[toolName] = metrics
    }
    
    metrics.ExecutionTime = duration
    metrics.ChunksEmitted = chunks
}
```

## Phase 5: Testing & Quality Assurance (Week 3-4)

### 5.1 Unit Tests

```go
// backend/internal/services/ai/streaming_test.go
func TestStreamingManager(t *testing.T) {
    sm := NewStreamingManager()
    ch := make(chan CompletionChunk, 10)
    
    sm.RegisterChannel("test-session", ch)
    
    toolCall := &ToolCall{ID: "test-tool", Name: "read_range"}
    sm.SendToolProgress("test-session", toolCall, 0.5, "Processing...")
    
    select {
    case chunk := <-ch:
        assert.Equal(t, "tool_progress", chunk.Type)
        assert.Equal(t, 0.5, chunk.Progress)
    case <-time.After(1 * time.Second):
        t.Fatal("No chunk received")
    }
}
```

### 5.2 Integration Tests

```typescript
// excel-addin/tests/streaming.test.ts
describe('Streaming Progress UI', () => {
    it('should display progress for multiple concurrent tools', async () => {
        const { getByText, getAllByRole } = render(<StreamingProgress />);
        
        // Simulate multiple tool executions
        mockSignalRClient.emit('ReceiveStreamChunk', {
            type: 'tool_start',
            toolCall: { id: 'tool1', name: 'read_range' }
        });
        
        mockSignalRClient.emit('ReceiveStreamChunk', {
            type: 'tool_start',
            toolCall: { id: 'tool2', name: 'apply_formula' }
        });
        
        // Verify both progress bars are shown
        const progressBars = getAllByRole('progressbar');
        expect(progressBars).toHaveLength(2);
    });
});
```

## Deployment Strategy

### Week 1: Backend Infrastructure
- Deploy streaming manager
- Update tool executors with progress
- Test with internal team

### Week 2: Frontend Components
- Deploy progress indicators
- Add activity panel
- Beta testing with selected users

### Week 3: Advanced Features
- Enable cancellation
- Add performance monitoring
- Full rollout

### Week 4: Optimization
- Performance tuning based on metrics
- UI/UX refinements based on feedback
- Documentation and training

## Success Metrics

1. **Technical Metrics**:
   - Streaming latency < 100ms
   - Progress update frequency: 2-5 Hz
   - Memory overhead < 10MB per session

2. **User Experience Metrics**:
   - 80% of users report better understanding of AI operations
   - 60% reduction in perceived wait time
   - 90% success rate for tool cancellation

3. **Business Metrics**:
   - 25% increase in feature adoption
   - 40% reduction in support tickets about "stuck" operations
   - 15% improvement in user retention

## Risk Mitigation

1. **Performance Impact**: 
   - Implement backpressure mechanisms
   - Throttle updates for slow connections

2. **Browser Compatibility**:
   - Test on all supported Excel versions
   - Graceful degradation for older browsers

3. **Network Issues**:
   - Implement reconnection logic
   - Buffer updates during disconnection

## Conclusion

This streaming implementation will transform GridMate's user experience by providing unprecedented visibility into AI operations. The phased approach ensures minimal disruption while delivering maximum value to users.