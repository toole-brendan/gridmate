# GridMate Streaming Implementation Guide

## Quick Start Implementation

This guide provides the actual code changes needed to implement streaming in GridMate. Follow these steps in order.

## Step 1: Backend - Add Streaming Endpoint

### 1.1 Create Streaming Handler

**File**: `backend/internal/handlers/streaming.go` (new file)

```go
package handlers

import (
    "context"
    "encoding/json"
    "fmt"
    "net/http"
    "time"
    
    "github.com/gridmate/backend/internal/services"
    "github.com/gridmate/backend/internal/services/ai"
    "github.com/sirupsen/logrus"
)

type StreamingHandler struct {
    excelBridge *services.ExcelBridge
    logger      *logrus.Logger
}

func NewStreamingHandler(excelBridge *services.ExcelBridge, logger *logrus.Logger) *StreamingHandler {
    return &StreamingHandler{
        excelBridge: excelBridge,
        logger:      logger,
    }
}

// HandleChatStream handles streaming chat requests
func (h *StreamingHandler) HandleChatStream(w http.ResponseWriter, r *http.Request) {
    // Set SSE headers
    w.Header().Set("Content-Type", "text/event-stream")
    w.Header().Set("Cache-Control", "no-cache")
    w.Header().Set("Connection", "keep-alive")
    w.Header().Set("Access-Control-Allow-Origin", "*")
    
    // Parse query params
    sessionID := r.URL.Query().Get("sessionId")
    content := r.URL.Query().Get("content")
    autonomyMode := r.URL.Query().Get("autonomyMode")
    
    if sessionID == "" || content == "" {
        fmt.Fprintf(w, "data: {\"error\": \"Missing required parameters\"}\n\n")
        return
    }
    
    // Create chat message
    chatMsg := services.ChatMessage{
        Content:      content,
        AutonomyMode: autonomyMode,
        ExcelContext: make(map[string]interface{}), // Will be populated from session
    }
    
    // Get streaming response
    ctx := r.Context()
    chunks, err := h.excelBridge.ProcessChatMessageStreaming(ctx, sessionID, chatMsg)
    if err != nil {
        h.logger.WithError(err).Error("Failed to start streaming")
        fmt.Fprintf(w, "data: {\"error\": \"%s\"}\n\n", err.Error())
        return
    }
    
    // Stream chunks to client
    flusher, ok := w.(http.Flusher)
    if !ok {
        http.Error(w, "Streaming not supported", http.StatusInternalServerError)
        return
    }
    
    for chunk := range chunks {
        select {
        case <-ctx.Done():
            return
        default:
            data, err := json.Marshal(chunk)
            if err != nil {
                h.logger.WithError(err).Error("Failed to marshal chunk")
                continue
            }
            
            fmt.Fprintf(w, "data: %s\n\n", data)
            flusher.Flush()
            
            if chunk.Done {
                fmt.Fprintf(w, "data: [DONE]\n\n")
                flusher.Flush()
                return
            }
        }
    }
}
```

### 1.2 Update Excel Bridge

**File**: `backend/internal/services/excel_bridge.go`

Add this method to the ExcelBridge:

```go
// ProcessChatMessageStreaming processes a chat message with streaming response
func (eb *ExcelBridge) ProcessChatMessageStreaming(ctx context.Context, clientID string, message ChatMessage) (<-chan ai.CompletionChunk, error) {
    session, err := eb.GetOrCreateSession(clientID)
    if err != nil {
        return nil, fmt.Errorf("failed to get session: %w", err)
    }
    
    // Build financial context from Excel state
    financialContext := &ai.FinancialContext{
        CellValues:        make(map[string]interface{}),
        NamedRanges:       make(map[string]string),
        CurrentWorksheet:  "",
        WorkbookName:      "",
        AvailableSheets:   []string{},
        RecentEdits:       []ai.EditInfo{},
        ActiveFormulas:    make(map[string]string),
        ConditionalFormats: []ai.ConditionalFormat{},
    }
    
    // Populate context from session
    if excelCtx, ok := message.ExcelContext.(map[string]interface{}); ok {
        eb.populateFinancialContext(financialContext, excelCtx)
    }
    
    // Get chat history
    chatHistory := eb.chatHistory.GetHistory(session.ID)
    aiHistory := make([]ai.Message, 0, len(chatHistory))
    for _, msg := range chatHistory {
        aiHistory = append(aiHistory, ai.Message{
            Role:    msg.Role,
            Content: msg.Content,
        })
    }
    
    // Call streaming AI service
    chunks, err := eb.aiService.ProcessChatWithToolsAndHistoryStreaming(
        ctx,
        session.ID,
        message.Content,
        financialContext,
        aiHistory,
        message.AutonomyMode,
    )
    
    if err != nil {
        return nil, err
    }
    
    // Create a new channel to intercept and process chunks
    processedChunks := make(chan ai.CompletionChunk)
    
    go func() {
        defer close(processedChunks)
        
        var fullContent strings.Builder
        
        for chunk := range chunks {
            // Forward the chunk
            processedChunks <- chunk
            
            // Accumulate content
            if chunk.Type == "text" && chunk.Delta != "" {
                fullContent.WriteString(chunk.Delta)
            }
            
            // When done, save to history
            if chunk.Done && fullContent.Len() > 0 {
                eb.chatHistory.AddMessage(session.ID, "user", message.Content)
                eb.chatHistory.AddMessage(session.ID, "assistant", fullContent.String())
            }
        }
    }()
    
    return processedChunks, nil
}
```

### 1.3 Update AI Service

**File**: `backend/internal/services/ai/service.go`

Add streaming version of the method:

```go
// ProcessChatWithToolsAndHistoryStreaming - streaming version
func (s *Service) ProcessChatWithToolsAndHistoryStreaming(
    ctx context.Context,
    sessionID string,
    userMessage string,
    context *FinancialContext,
    chatHistory []Message,
    autonomyMode string,
) (<-chan CompletionChunk, error) {
    // Build messages
    messages := []Message{}
    
    // Add system prompt
    systemPrompt := s.buildSystemPrompt(context)
    messages = append(messages, Message{
        Role:    "system",
        Content: systemPrompt,
    })
    
    // Add chat history
    messages = append(messages, chatHistory...)
    
    // Add current user message
    messages = append(messages, Message{
        Role:    "user",
        Content: userMessage,
    })
    
    // Get relevant tools
    tools := s.getRelevantTools(userMessage, context)
    
    // Create request with streaming enabled
    request := CompletionRequest{
        Messages:  messages,
        MaxTokens: 4096,
        Tools:     tools,
        Stream:    true, // Enable streaming
    }
    
    // Set tool choice based on autonomy mode
    switch autonomyMode {
    case "ask":
        request.ToolChoice = &ToolChoice{Type: "none"}
    case "auto":
        request.ToolChoice = &ToolChoice{Type: "auto"}
    case "full":
        request.ToolChoice = &ToolChoice{Type: "any"}
    }
    
    // Get streaming response
    return s.provider.GetCompletionStreaming(ctx, request)
}
```

### 1.4 Update Routes

**File**: `backend/internal/routes/routes.go`

Add the streaming route:

```go
func SetupRoutes(/* existing params */, streamingHandler *handlers.StreamingHandler) {
    // ... existing routes ...
    
    // Add streaming endpoint
    router.HandleFunc("/api/chat/stream", streamingHandler.HandleChatStream).Methods("GET")
}
```

## Step 2: Frontend - SignalR Client Updates

### 2.1 Add Streaming Support to SignalR Client

**File**: `excel-addin/src/services/signalr/SignalRClient.ts`

Add these methods to the SignalRClient class:

```typescript
// Add to SignalRClient class
private baseUrl: string = 'https://localhost:7171';

async streamChat(message: {
    content: string;
    autonomyMode: string;
    excelContext?: any;
}): Promise<EventSource> {
    const params = new URLSearchParams({
        sessionId: this.sessionId || '',
        content: message.content,
        autonomyMode: message.autonomyMode || 'auto'
    });
    
    const url = `${this.baseUrl}/api/chat/stream?${params}`;
    console.log('🌊 Starting streaming chat:', url);
    
    const evtSource = new EventSource(url, {
        withCredentials: true
    });
    
    // Set up error handling
    evtSource.onerror = (error) => {
        console.error('❌ Streaming error:', error);
        this.emit('stream_error', error);
    };
    
    return evtSource;
}

// Helper to cancel streaming
cancelStream(evtSource: EventSource) {
    if (evtSource && evtSource.readyState !== EventSource.CLOSED) {
        evtSource.close();
        console.log('🛑 Stream cancelled');
    }
}
```

### 2.2 Create Streaming Types

**File**: `excel-addin/src/types/streaming.ts` (new file)

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
    streamStartTime?: number;
    streamEndTime?: number;
    toolCalls?: StreamingToolCall[];
    chunks: StreamChunk[];
}

export interface StreamingToolCall {
    id: string;
    name: string;
    status: 'running' | 'complete' | 'error';
    progress?: string;
    input?: any;
    startTime?: number;
    endTime?: number;
}

// Type guard
export function isStreamingMessage(message: any): message is StreamingMessage {
    return message && 'isStreaming' in message;
}
```

## Step 3: Frontend - Message Handlers

### 3.1 Update Message Handlers

**File**: `excel-addin/src/hooks/useMessageHandlers.ts`

Add streaming support:

```typescript
// Add to useMessageHandlers hook
const currentStreamRef = useRef<EventSource | null>(null);

// Add streaming message handler
const sendStreamingMessage = useCallback(async (content: string, autonomyMode: string) => {
    if (!signalRClientRef.current) {
        addDebugLog('Cannot send message: SignalR not connected', 'error');
        return;
    }
    
    // Cancel any existing stream
    if (currentStreamRef.current) {
        signalRClientRef.current.cancelStream(currentStreamRef.current);
        currentStreamRef.current = null;
    }
    
    // Create streaming message ID
    const streamingMessageId = `stream_${Date.now()}`;
    currentMessageIdRef.current = streamingMessageId;
    
    // Add initial streaming message
    const streamingMessage: StreamingMessage = {
        id: streamingMessageId,
        role: 'assistant',
        content: '',
        isStreaming: true,
        streamStartTime: Date.now(),
        toolCalls: [],
        chunks: []
    };
    
    chatManager.addMessage(streamingMessage);
    chatManager.setAiIsGenerating(true);
    
    try {
        // Start streaming
        const evtSource = await signalRClientRef.current.streamChat({
            content,
            autonomyMode,
            excelContext: {} // Add context if needed
        });
        
        currentStreamRef.current = evtSource;
        
        // Handle streaming events
        evtSource.onmessage = (event) => {
            if (event.data === '[DONE]') {
                // Stream complete
                chatManager.finalizeStreamingMessage(streamingMessageId);
                chatManager.setAiIsGenerating(false);
                evtSource.close();
                currentStreamRef.current = null;
                return;
            }
            
            try {
                const chunk: StreamChunk = JSON.parse(event.data);
                handleStreamChunk(streamingMessageId, chunk);
            } catch (error) {
                console.error('Failed to parse chunk:', error);
            }
        };
        
        evtSource.onerror = (error) => {
            addDebugLog('Streaming error occurred', 'error');
            chatManager.finalizeStreamingMessage(streamingMessageId);
            chatManager.setAiIsGenerating(false);
            currentStreamRef.current = null;
        };
        
    } catch (error) {
        console.error('Failed to start streaming:', error);
        addDebugLog('Failed to start streaming', 'error');
        chatManager.setAiIsGenerating(false);
    }
}, [chatManager, addDebugLog]);

// Handle individual chunks
const handleStreamChunk = useCallback((messageId: string, chunk: StreamChunk) => {
    switch (chunk.type) {
        case 'text':
            if (chunk.delta) {
                chatManager.updateStreamingMessage(messageId, {
                    content: (prev: string) => prev + chunk.delta
                });
            }
            break;
            
        case 'tool_start':
            if (chunk.toolCall) {
                chatManager.addToolIndicator(messageId, {
                    id: chunk.toolCall.id,
                    name: chunk.toolCall.name,
                    status: 'running',
                    startTime: Date.now()
                });
                addDebugLog(`Tool started: ${chunk.toolCall.name}`, 'info');
            }
            break;
            
        case 'tool_progress':
            if (chunk.toolCall && chunk.delta) {
                chatManager.updateToolProgress(
                    messageId, 
                    chunk.toolCall.id, 
                    chunk.delta
                );
            }
            break;
            
        case 'tool_complete':
            if (chunk.toolCall) {
                chatManager.completeToolCall(messageId, chunk.toolCall.id);
                addDebugLog(`Tool completed: ${chunk.toolCall.name}`, 'success');
            }
            break;
    }
}, [chatManager, addDebugLog]);

// Cancel current stream
const cancelCurrentStream = useCallback(() => {
    if (currentStreamRef.current && signalRClientRef.current) {
        signalRClientRef.current.cancelStream(currentStreamRef.current);
        currentStreamRef.current = null;
        chatManager.setAiIsGenerating(false);
        addDebugLog('Stream cancelled by user', 'warning');
    }
}, [chatManager, addDebugLog]);

// Return updated handlers
return {
    // ... existing handlers ...
    sendStreamingMessage,
    cancelCurrentStream,
    handleStreamChunk,
};
```

## Step 4: Frontend - Chat Manager Updates

### 4.1 Extend Chat Manager

**File**: `excel-addin/src/hooks/useChatManager.ts`

Add streaming-specific methods:

```typescript
// Add these methods to useChatManager hook

// Update streaming message content
const updateStreamingMessage = useCallback((messageId: string, updates: any) => {
    setMessages(prev => prev.map(msg => {
        if (msg.id === messageId) {
            const updated = { ...msg };
            
            // Handle content updates
            if ('content' in updates) {
                updated.content = typeof updates.content === 'function' 
                    ? updates.content(msg.content || '') 
                    : updates.content;
            }
            
            // Handle other updates
            Object.keys(updates).forEach(key => {
                if (key !== 'content') {
                    updated[key] = updates[key];
                }
            });
            
            return updated;
        }
        return msg;
    }));
}, []);

// Add tool indicator to streaming message
const addToolIndicator = useCallback((messageId: string, toolCall: StreamingToolCall) => {
    setMessages(prev => prev.map(msg => {
        if (msg.id === messageId && isStreamingMessage(msg)) {
            const toolCalls = msg.toolCalls || [];
            return {
                ...msg,
                toolCalls: [...toolCalls, toolCall]
            };
        }
        return msg;
    }));
}, []);

// Update tool progress
const updateToolProgress = useCallback((messageId: string, toolId: string, progress: string) => {
    setMessages(prev => prev.map(msg => {
        if (msg.id === messageId && isStreamingMessage(msg) && msg.toolCalls) {
            return {
                ...msg,
                toolCalls: msg.toolCalls.map(tool =>
                    tool.id === toolId 
                        ? { ...tool, progress } 
                        : tool
                )
            };
        }
        return msg;
    }));
}, []);

// Complete tool call
const completeToolCall = useCallback((messageId: string, toolId: string) => {
    setMessages(prev => prev.map(msg => {
        if (msg.id === messageId && isStreamingMessage(msg) && msg.toolCalls) {
            return {
                ...msg,
                toolCalls: msg.toolCalls.map(tool =>
                    tool.id === toolId 
                        ? { ...tool, status: 'complete', endTime: Date.now() } 
                        : tool
                )
            };
        }
        return msg;
    }));
}, []);

// Finalize streaming message
const finalizeStreamingMessage = useCallback((messageId: string) => {
    setMessages(prev => prev.map(msg => {
        if (msg.id === messageId && isStreamingMessage(msg)) {
            return {
                ...msg,
                isStreaming: false,
                streamEndTime: Date.now()
            };
        }
        return msg;
    }));
}, []);

// Add to return object
return {
    // ... existing methods ...
    updateStreamingMessage,
    addToolIndicator,
    updateToolProgress,
    completeToolCall,
    finalizeStreamingMessage,
};
```

## Step 5: Frontend - UI Components

### 5.1 Create Streaming Message Component

**File**: `excel-addin/src/components/chat/messages/StreamingMessage.tsx` (new file)

```typescript
import React from 'react';
import { StreamingMessage as StreamingMessageType } from '../../../types/streaming';
import { ToolIndicator } from './ToolIndicator';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface Props {
    message: StreamingMessageType;
}

export const StreamingMessage: React.FC<Props> = ({ message }) => {
    return (
        <div className="flex items-start space-x-3 p-4 animate-fadeIn">
            {/* Avatar */}
            <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                    <span className="text-white text-sm font-medium">AI</span>
                </div>
            </div>
            
            {/* Content */}
            <div className="flex-1 space-y-2 min-w-0">
                {/* Message content with typing indicator */}
                <div className="prose prose-sm max-w-none">
                    <ReactMarkdown
                        components={{
                            code({ node, inline, className, children, ...props }) {
                                const match = /language-(\w+)/.exec(className || '');
                                return !inline && match ? (
                                    <SyntaxHighlighter
                                        style={oneDark}
                                        language={match[1]}
                                        PreTag="div"
                                        {...props}
                                    >
                                        {String(children).replace(/\n$/, '')}
                                    </SyntaxHighlighter>
                                ) : (
                                    <code className={className} {...props}>
                                        {children}
                                    </code>
                                );
                            }
                        }}
                    >
                        {message.content}
                    </ReactMarkdown>
                    
                    {/* Typing indicator */}
                    {message.isStreaming && (
                        <span className="inline-block ml-1">
                            <span className="animate-pulse text-blue-500">▊</span>
                        </span>
                    )}
                </div>
                
                {/* Tool indicators */}
                {message.toolCalls && message.toolCalls.length > 0 && (
                    <div className="space-y-2 mt-3">
                        {message.toolCalls.map((tool) => (
                            <ToolIndicator 
                                key={tool.id} 
                                tool={tool} 
                                isStreaming={message.isStreaming}
                            />
                        ))}
                    </div>
                )}
                
                {/* Streaming stats (dev mode) */}
                {process.env.NODE_ENV === 'development' && message.streamEndTime && (
                    <div className="text-xs text-gray-400 mt-2">
                        Stream duration: {message.streamEndTime - (message.streamStartTime || 0)}ms
                    </div>
                )}
            </div>
        </div>
    );
};
```

### 5.2 Create Tool Indicator Component

**File**: `excel-addin/src/components/chat/messages/ToolIndicator.tsx` (new file)

```typescript
import React from 'react';
import { CheckCircle, XCircle, Loader } from 'lucide-react';
import { StreamingToolCall } from '../../../types/streaming';

interface Props {
    tool: StreamingToolCall;
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
    
    const getToolDescription = (toolName: string): string => {
        const descriptions: Record<string, string> = {
            'read_range': 'Reading spreadsheet data',
            'write_range': 'Writing to cells',
            'apply_formula': 'Applying formula',
            'format_range': 'Formatting cells',
            'clear_range': 'Clearing cells',
            'smart_format_cells': 'Smart formatting'
        };
        return descriptions[toolName] || toolName;
    };
    
    const getDuration = () => {
        if (tool.endTime && tool.startTime) {
            const duration = tool.endTime - tool.startTime;
            return `${(duration / 1000).toFixed(1)}s`;
        }
        return null;
    };
    
    return (
        <div className={`
            flex items-center space-x-2 text-sm bg-gray-50 rounded-lg px-3 py-2
            transition-all duration-200
            ${tool.status === 'running' ? 'shadow-sm border border-blue-200' : ''}
            ${tool.status === 'complete' ? 'opacity-75' : ''}
        `}>
            {getIcon()}
            <span className="font-medium text-gray-700">
                {getToolDescription(tool.name)}
            </span>
            
            {tool.progress && tool.status === 'running' && (
                <span className="text-xs text-gray-500 ml-auto">
                    {tool.progress}
                </span>
            )}
            
            {tool.status === 'complete' && getDuration() && (
                <span className="text-xs text-gray-400 ml-auto">
                    {getDuration()}
                </span>
            )}
        </div>
    );
};
```

## Step 6: Integration

### 6.1 Update Chat Interface

**File**: `excel-addin/src/components/chat/RefactoredChatInterface.tsx`

Update the component to use streaming:

```typescript
// Add to imports
import { isStreamingMessage } from '../../types/streaming';
import { StreamingMessage } from './messages/StreamingMessage';

// Update handleSendMessage
const handleSendMessage = useCallback(async () => {
    const content = input.trim();
    if (!content || !signalRClient || !isAuthenticated) return;
    
    // Check if we're already streaming
    if (chatManager.aiIsGenerating) {
        addDebugLog('Already generating response', 'warning');
        return;
    }
    
    // Clear input immediately
    setInput('');
    
    // Add user message
    const userMessage = {
        id: `user_${Date.now()}`,
        role: 'user' as const,
        content,
        timestamp: new Date()
    };
    chatManager.addMessage(userMessage);
    
    // Send streaming message
    await messageHandlers.sendStreamingMessage(content, autonomyMode);
    
}, [input, signalRClient, isAuthenticated, chatManager, messageHandlers, autonomyMode]);

// Update message rendering
const renderMessage = (message: EnhancedChatMessage) => {
    // Check if it's a streaming message
    if (isStreamingMessage(message)) {
        return <StreamingMessage key={message.id} message={message} />;
    }
    
    // ... rest of existing message rendering logic
};

// Add cancel button during streaming
{chatManager.aiIsGenerating && (
    <button
        onClick={messageHandlers.cancelCurrentStream}
        className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
    >
        Stop Generating
    </button>
)}
```

## Step 7: Testing

### 7.1 Test Streaming Locally

1. Start the backend with streaming endpoint
2. Open the Excel add-in
3. Send a message and verify:
   - Text appears incrementally
   - Tool indicators show up when tools are used
   - Cancel button works
   - Messages finalize correctly

### 7.2 Test Different Scenarios

```typescript
// Test messages to try:
const testMessages = [
    "Hello, how are you?", // Simple text response
    "Read the data in A1:A10", // Tool usage
    "Calculate the sum of column B and write it to C1", // Multiple tools
    "Explain financial modeling in detail", // Long response
];
```

## Next Steps

1. **Error Handling**: Add retry logic for failed streams
2. **Performance**: Implement chunk batching for very fast streams
3. **UI Polish**: Add smooth animations and transitions
4. **Analytics**: Track streaming metrics (time to first token, completion rate)
5. **Tool Execution**: Integrate tool execution with streaming flow

This implementation provides a solid foundation for streaming in GridMate. The modular design allows for easy extension and customization as needed.