# GridMate Streaming Implementation Plan

## Executive Summary

This plan outlines how to integrate Claude streaming into GridMate's chat interface, leveraging the existing backend streaming infrastructure and SignalR real-time communication. The implementation will provide users with real-time AI responses and tool usage visibility, similar to modern AI-powered code editors like Cursor.

## Current State Analysis

### Backend Infrastructure
- ✅ **Streaming Ready**: The Anthropic provider (`backend/internal/services/ai/anthropic.go`) already implements streaming with SSE support
- ✅ **Chunk Types**: Supports `text`, `tool_start`, `tool_progress`, and `tool_complete` events
- ✅ **Tool Integration**: Tool execution is handled after message completion
- ❌ **Missing**: No streaming endpoint exposed to frontend

### Frontend Infrastructure
- ✅ **Real-time Communication**: SignalR is already set up for WebSocket communication
- ✅ **Message Handling**: Robust message handling system in place
- ✅ **UI Components**: Enhanced chat interface with support for various message types
- ❌ **Missing**: No streaming message handling or incremental UI updates

## Implementation Plan

### Phase 1: Backend Streaming Endpoint (Week 1, Days 1-2)

#### 1.1 Add Streaming Support to SignalR Handler

**File**: `backend/internal/handlers/signalr_handler.go`

```go
// Add new streaming chat handler method
func (h *SignalRHandler) HandleSignalRChatStreaming(w http.ResponseWriter, r *http.Request) {
    // Parse request
    var req SignalRChatRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        http.Error(w, "Invalid request", http.StatusBadRequest)
        return
    }
    
    // Set up SSE headers
    w.Header().Set("Content-Type", "text/event-stream")
    w.Header().Set("Cache-Control", "no-cache")
    w.Header().Set("Connection", "keep-alive")
    
    // Create context for streaming
    ctx := r.Context()
    
    // Process with streaming
    chunks, err := h.excelBridge.ProcessChatMessageStreaming(req.SessionID, chatMsg)
    if err != nil {
        // Send error event
        fmt.Fprintf(w, "data: %s\n\n", jsonError(err))
        return
    }
    
    // Stream chunks to client
    for chunk := range chunks {
        data, _ := json.Marshal(chunk)
        fmt.Fprintf(w, "data: %s\n\n", data)
        w.(http.Flusher).Flush()
    }
}
```

#### 1.2 Update Excel Bridge for Streaming

**File**: `backend/internal/services/excel_bridge.go`

```go
// Add streaming method
func (eb *ExcelBridge) ProcessChatMessageStreaming(clientID string, message ChatMessage) (<-chan ai.CompletionChunk, error) {
    // Similar to ProcessChatMessage but returns channel
    // Call eb.aiService.ProcessChatWithToolsAndHistoryStreaming
}
```

#### 1.3 Add Streaming Support to AI Service

**File**: `backend/internal/services/ai/service.go`

```go
// Add streaming version of ProcessChatWithToolsAndHistory
func (s *Service) ProcessChatWithToolsAndHistoryStreaming(
    ctx context.Context, 
    sessionID string, 
    userMessage string, 
    context *FinancialContext, 
    chatHistory []Message, 
    autonomyMode string,
) (<-chan CompletionChunk, error) {
    // Set Stream: true in request
    // Return channel from provider
}
```

### Phase 2: SignalR Streaming Protocol (Week 1, Days 3-4)

#### 2.1 Extend SignalR Client for Streaming

**File**: `excel-addin/src/services/signalr/SignalRClient.ts`

```typescript
// Add streaming method
async streamChat(message: SignalRMessage): Promise<EventSource> {
    const params = new URLSearchParams({
        sessionId: this.sessionId || '',
        messageId: message.id || '',
        content: message.data.content,
        autonomyMode: message.data.autonomyMode
    });
    
    const evtSource = new EventSource(
        `${this.baseUrl}/api/chat/stream?${params}`,
        { withCredentials: true }
    );
    
    return evtSource;
}

// Add streaming event handlers
setupStreamingHandlers(evtSource: EventSource, onChunk: (chunk: StreamChunk) => void) {
    evtSource.onmessage = (event) => {
        const chunk = JSON.parse(event.data);
        onChunk(chunk);
    };
    
    evtSource.onerror = (error) => {
        this.emit('stream_error', error);
        evtSource.close();
    };
}
```

#### 2.2 Define Streaming Types

**File**: `excel-addin/src/types/streaming.ts`

```typescript
export interface StreamChunk {
    id: string;
    type: 'text' | 'tool_start' | 'tool_progress' | 'tool_complete' | 'done';
    content?: string;
    delta?: string;
    toolCall?: {
        id: string;
        name: string;
        input?: any;
    };
    done: boolean;
    error?: string;
}

export interface StreamingMessage {
    id: string;
    role: 'assistant';
    content: string;
    isStreaming: boolean;
    toolCalls?: ToolCall[];
    chunks: StreamChunk[];
}
```

### Phase 3: UI Streaming Support (Week 1, Days 5-7)

#### 3.1 Update Message Handlers for Streaming

**File**: `excel-addin/src/hooks/useMessageHandlers.ts`

```typescript
// Add streaming handler
const handleStreamingMessage = useCallback(async (message: any) => {
    // Start streaming
    const streamingMessageId = `stream_${Date.now()}`;
    
    // Add initial streaming message
    const streamingMessage: StreamingMessage = {
        id: streamingMessageId,
        role: 'assistant',
        content: '',
        isStreaming: true,
        chunks: []
    };
    
    chatManager.addMessage(streamingMessage);
    
    // Set up EventSource
    const evtSource = await signalRClientRef.current.streamChat(message);
    
    evtSource.onmessage = (event) => {
        const chunk: StreamChunk = JSON.parse(event.data);
        
        switch (chunk.type) {
            case 'text':
                // Update message content incrementally
                chatManager.updateStreamingMessage(streamingMessageId, {
                    content: (prev) => prev + chunk.delta
                });
                break;
                
            case 'tool_start':
                // Show tool indicator
                chatManager.addToolIndicator(streamingMessageId, chunk.toolCall);
                break;
                
            case 'tool_progress':
                // Update tool progress
                chatManager.updateToolProgress(streamingMessageId, chunk.toolCall.id, chunk.delta);
                break;
                
            case 'tool_complete':
                // Mark tool as complete
                chatManager.completeToolCall(streamingMessageId, chunk.toolCall.id);
                break;
                
            case 'done':
                // Finalize message
                chatManager.finalizeStreamingMessage(streamingMessageId);
                evtSource.close();
                break;
        }
    };
}, [chatManager]);
```

#### 3.2 Create Streaming Message Component

**File**: `excel-addin/src/components/chat/messages/StreamingMessage.tsx`

```typescript
import React from 'react';
import { StreamingMessage as StreamingMessageType } from '../../../types/streaming';
import { ToolIndicator } from './ToolIndicator';
import { MessageContent } from './MessageContent';

interface Props {
    message: StreamingMessageType;
}

export const StreamingMessage: React.FC<Props> = ({ message }) => {
    return (
        <div className="flex items-start space-x-3 p-4">
            <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                    <span className="text-white text-sm">AI</span>
                </div>
            </div>
            
            <div className="flex-1 space-y-2">
                {/* Streaming content with typing indicator */}
                <div className="relative">
                    <MessageContent content={message.content} />
                    {message.isStreaming && (
                        <span className="inline-block ml-1">
                            <span className="animate-pulse">▊</span>
                        </span>
                    )}
                </div>
                
                {/* Tool indicators */}
                {message.toolCalls?.map((tool) => (
                    <ToolIndicator 
                        key={tool.id} 
                        tool={tool} 
                        isStreaming={message.isStreaming}
                    />
                ))}
            </div>
        </div>
    );
};
```

#### 3.3 Create Tool Indicator Component

**File**: `excel-addin/src/components/chat/messages/ToolIndicator.tsx`

```typescript
import React from 'react';
import { CheckCircle, Clock, Loader } from 'lucide-react';

interface Props {
    tool: {
        id: string;
        name: string;
        status?: 'running' | 'complete' | 'error';
        progress?: string;
    };
    isStreaming: boolean;
}

export const ToolIndicator: React.FC<Props> = ({ tool, isStreaming }) => {
    const getIcon = () => {
        switch (tool.status) {
            case 'complete':
                return <CheckCircle className="w-4 h-4 text-green-500" />;
            case 'error':
                return <XCircle className="w-4 h-4 text-red-500" />;
            default:
                return <Loader className="w-4 h-4 text-blue-500 animate-spin" />;
        }
    };
    
    const getToolDescription = (toolName: string) => {
        const descriptions: Record<string, string> = {
            'read_range': 'Reading spreadsheet data',
            'write_range': 'Writing to cells',
            'apply_formula': 'Applying formula',
            'format_range': 'Formatting cells'
        };
        return descriptions[toolName] || toolName;
    };
    
    return (
        <div className="flex items-center space-x-2 text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
            {getIcon()}
            <span className="font-medium">{getToolDescription(tool.name)}</span>
            {tool.progress && (
                <span className="text-xs text-gray-500 ml-2">{tool.progress}</span>
            )}
        </div>
    );
};
```

### Phase 4: Chat Manager Updates (Week 2, Days 1-2)

#### 4.1 Extend Chat Manager for Streaming

**File**: `excel-addin/src/hooks/useChatManager.ts`

```typescript
// Add streaming methods
const updateStreamingMessage = useCallback((messageId: string, updates: any) => {
    setMessages(prev => prev.map(msg => 
        msg.id === messageId 
            ? { ...msg, ...updates, content: typeof updates.content === 'function' 
                ? updates.content(msg.content) 
                : updates.content }
            : msg
    ));
}, []);

const addToolIndicator = useCallback((messageId: string, toolCall: any) => {
    setMessages(prev => prev.map(msg => {
        if (msg.id === messageId) {
            const toolCalls = msg.toolCalls || [];
            return {
                ...msg,
                toolCalls: [...toolCalls, { ...toolCall, status: 'running' }]
            };
        }
        return msg;
    }));
}, []);

const updateToolProgress = useCallback((messageId: string, toolId: string, progress: string) => {
    setMessages(prev => prev.map(msg => {
        if (msg.id === messageId && msg.toolCalls) {
            return {
                ...msg,
                toolCalls: msg.toolCalls.map(tool =>
                    tool.id === toolId ? { ...tool, progress } : tool
                )
            };
        }
        return msg;
    }));
}, []);

const completeToolCall = useCallback((messageId: string, toolId: string) => {
    setMessages(prev => prev.map(msg => {
        if (msg.id === messageId && msg.toolCalls) {
            return {
                ...msg,
                toolCalls: msg.toolCalls.map(tool =>
                    tool.id === toolId ? { ...tool, status: 'complete' } : tool
                )
            };
        }
        return msg;
    }));
}, []);

const finalizeStreamingMessage = useCallback((messageId: string) => {
    setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, isStreaming: false } : msg
    ));
}, []);
```

### Phase 5: Integration & Polish (Week 2, Days 3-5)

#### 5.1 Update Chat Interface

**File**: `excel-addin/src/components/chat/EnhancedChatInterface.tsx`

```typescript
// Update message rendering to handle streaming messages
const renderMessage = (message: EnhancedChatMessage) => {
    if (isStreamingMessage(message)) {
        return <StreamingMessage key={message.id} message={message} />;
    }
    // ... existing message rendering
};

// Add streaming state management
const [isStreaming, setIsStreaming] = useState(false);

// Update send message to use streaming
const handleSendMessage = async () => {
    if (!input.trim() || isStreaming) return;
    
    setIsStreaming(true);
    
    try {
        // Send message with streaming enabled
        await messageHandlers.sendStreamingMessage({
            content: input,
            autonomyMode,
            streamingEnabled: true
        });
        
        setInput('');
    } finally {
        setIsStreaming(false);
    }
};
```

#### 5.2 Add Streaming Controls

```typescript
// Add cancel streaming button
const cancelStreaming = useCallback(() => {
    messageHandlers.cancelCurrentStream();
    setIsStreaming(false);
}, [messageHandlers]);

// Show cancel button during streaming
{isStreaming && (
    <button
        onClick={cancelStreaming}
        className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
    >
        Stop Generating
    </button>
)}
```

### Phase 6: Testing & Optimization (Week 2, Days 6-7)

#### 6.1 Performance Optimizations

1. **Chunk Batching**: Batch very small chunks to reduce re-renders
2. **Virtual Scrolling**: For long streaming responses
3. **Debounced Updates**: For rapid tool progress updates

#### 6.2 Error Handling

1. **Connection Failures**: Graceful fallback to non-streaming
2. **Timeout Handling**: Auto-cancel after inactivity
3. **Retry Logic**: Automatic reconnection for interrupted streams

#### 6.3 Testing Scenarios

1. **Basic Streaming**: Simple Q&A responses
2. **Tool Usage**: Single and multiple tool calls
3. **Long Responses**: Performance with large outputs
4. **Interruptions**: Cancel, network issues, errors
5. **Concurrent Requests**: Multiple streaming sessions

## Implementation Timeline

### Week 1
- **Days 1-2**: Backend streaming endpoint
- **Days 3-4**: SignalR streaming protocol
- **Days 5-7**: UI streaming components

### Week 2
- **Days 1-2**: Chat manager updates
- **Days 3-5**: Integration and polish
- **Days 6-7**: Testing and optimization

## Success Metrics

1. **Response Time**: First token appears within 500ms
2. **Smooth Updates**: 60 FPS during streaming
3. **Tool Visibility**: 100% of tool calls shown in real-time
4. **Error Recovery**: 95% successful recovery from interruptions
5. **User Satisfaction**: Positive feedback on responsiveness

## Migration Strategy

1. **Feature Flag**: Enable streaming per user/session
2. **Gradual Rollout**: Start with 10% of users
3. **Fallback**: Automatic fallback to non-streaming on errors
4. **A/B Testing**: Compare streaming vs non-streaming UX

## Future Enhancements

1. **Multi-modal Streaming**: Support for images/charts
2. **Parallel Tool Execution**: Stream multiple tools simultaneously
3. **Progress Metrics**: Detailed progress for long operations
4. **Smart Chunking**: Intelligent content grouping
5. **Offline Support**: Queue messages during disconnection

## Conclusion

This implementation plan transforms GridMate's chat interface into a modern, responsive AI assistant with real-time streaming capabilities. Users will experience immediate feedback, transparent tool usage, and a more engaging interaction model that matches the best AI-powered editors in the market.