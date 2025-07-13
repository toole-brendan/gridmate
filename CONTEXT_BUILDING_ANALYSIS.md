# Context Building Implementation Analysis

## Current Issue
The spreadsheet context being sent to the AI only shows minimal information:
- Worksheet: Sheet1
- Model Type: General

The comprehensive context that should include cell values, formulas, headers, and surrounding data is not being built.

## Root Cause Analysis - SignalR Implementation Gap

### 1. No Excel Context Being Sent
The SignalR implementation in `ChatInterfaceWithSignalR.tsx` only sends the message content:
```typescript
await signalRClient.sendChatMessage(input.trim());
```

It never collects or sends Excel context data (selection, worksheet, cell values, etc.).

### 2. SignalR Hub Only Forwards Basic Data
The `GridmateHub.cs` method only forwards minimal information:
```csharp
var request = new
{
    session_id = sessionId,
    content = message,
    timestamp = DateTime.UtcNow.ToString("HH:mm:ss.fff")
};
```

No Excel context is included in the forwarded request.

### 3. Backend Creates Empty Context
In `signalr_handler.go`, the handler creates an empty context map:
```go
excelContext := make(map[string]interface{})
```

This empty context is then passed to the ExcelBridge, which falls back to minimal context building.

### 4. Context Builder Never Used
The comprehensive `ContextBuilder` in `context_builder.go` requires a valid selection to function:
```go
if eb.contextBuilder != nil && session.Selection.SelectedRange != "" {
    // This condition is never met because session.Selection is empty
}
```

Since no selection data is sent via SignalR, the rich context features are never utilized.

### 5. Legacy WebSocket Remnants
The context building system was designed for WebSocket communication where:
- Selection changes were tracked via WebSocket messages
- Context was built from session data maintained in the WebSocket client
- The ExcelBridge had access to continuously updated session information

With SignalR, none of this infrastructure is connected, leaving the context builder orphaned.

## Implementation Gaps

### 1. No Context Collection in Frontend
The SignalR chat interface doesn't:
- Call `ExcelService.getContext()` before sending messages
- Subscribe to Excel selection change events
- Include worksheet or range information with messages

### 2. No Context Forwarding in SignalR Hub
The hub doesn't:
- Accept context data in the `SendChatMessage` method
- Forward context to the backend
- Track Excel state between messages

### 3. No Session State Management
Unlike the WebSocket implementation, SignalR sessions don't maintain:
- Current selection
- Active worksheet
- Recent cell values
- Formula information

## Required Fixes

### 1. Update Frontend to Send Context
```typescript
const handleSendMessage = async () => {
    const context = await ExcelService.getContext();
    await signalRClient.sendChatMessage(input.trim(), context);
};
```

### 2. Update SignalR Hub to Accept Context
```csharp
public async Task SendChatMessage(string message, object excelContext)
{
    var request = new
    {
        session_id = sessionId,
        content = message,
        excel_context = excelContext,
        timestamp = DateTime.UtcNow.ToString("HH:mm:ss.fff")
    };
    // Forward to backend
}
```

### 3. Update Backend Handler to Use Context
```go
var req struct {
    SessionID    string                 `json:"session_id"`
    Content      string                 `json:"content"`
    ExcelContext map[string]interface{} `json:"excel_context"`
    Timestamp    string                 `json:"timestamp"`
}
```

### 4. Implement Selection Change Updates
Add a new SignalR method to handle selection changes and update the backend session state.

## Current Workaround
The system falls back to `buildFinancialContext` which only uses the minimal context, missing all the rich context that the context builder could provide.

## Impact
Without proper context:
- AI cannot see surrounding cells
- Cannot detect headers or labels
- Cannot analyze formulas in context
- Cannot determine model type accurately
- Cannot provide context-aware suggestions

This severely limits the AI's ability to understand and assist with spreadsheet tasks.

## Chat History Context Issue

### Problem Description
The AI does not maintain conversation history between messages in the same session. This creates a frustrating user experience where:

1. **AI forgets what it just analyzed** - Even after successfully reading and describing the spreadsheet contents, the AI asks for the same information again
2. **Cannot follow multi-turn conversations** - When a user responds to the AI's analysis, the AI acts as if it's a completely new conversation
3. **Requires repetitive explanations** - Users must re-explain their requests even when continuing the same task

### Example from User Session
```
AI: "I can see this is a DCF model... Empty rows for EBIT, Taxes, NOPAT, and Free Cash Flow calculations..."
User: "YES please add calculations all of the empty rows"
AI: "Could you please provide: 1. The specific range where you want to add calculations..."
User: "whatever you think best"
AI: "I apologize, but I need more specific direction..."
User: "no you dont"
AI: "I don't have the previous context of the conversation..."
```

### Root Cause
Looking at the backend logs, each message is processed independently:
```json
"messages":[{"role":"user","content":"what can you see on this sheet"}]
```

The conversation history is not being accumulated and passed to the AI with subsequent requests.

### SignalR Implementation Issue
In `signalr_handler.go`, the `HandleSignalRChat` function calls:
```go
response, err := h.excelBridge.ProcessChatMessage(sessionID, req.Content, excelContext)
```

This only passes the current message content, not the conversation history. The AI service needs the full message history to maintain context.

### Impact
- **Poor user experience** - Users feel like they're talking to an AI with amnesia
- **Inefficient interactions** - Simple tasks require multiple redundant exchanges
- **Lost context** - The AI cannot build on previous analysis or decisions
- **User frustration** - As evidenced by the user's response "no you dont"

### Required Fix
The backend needs to:
1. Store conversation history per session
2. Include all previous messages in the API request to Anthropic:
```json
"messages":[
  {"role":"user","content":"what can you see on this sheet"},
  {"role":"assistant","content":"I can see this is a DCF model..."},
  {"role":"user","content":"YES please add calculations all of the empty rows"},
  {"role":"assistant","content":"Could you please provide..."},
  {"role":"user","content":"whatever you think best"}
]
```

This would allow the AI to understand the full conversation context and provide appropriate responses.

## Comprehensive Implementation Plan

### Phase 1: Complete WebSocket to SignalR Migration

#### 1.1 Identify and Remove WebSocket Remnants
**Current State**: Mixed WebSocket/SignalR implementation causing confusion and potential conflicts

**Tasks**:
1. **Audit WebSocket Usage**
   - Search for all WebSocket client connections in backend
   - Identify which components still rely on WebSocket
   - Document dependencies on WebSocket-specific features
   
2. **Remove Deprecated WebSocket Code**
   - Delete `/backend/internal/websocket/client.go` (if no longer needed)
   - Remove WebSocket hub and related handlers
   - Clean up WebSocket-specific session management
   
3. **Update Configuration**
   - Remove WebSocket endpoints from router
   - Update CORS settings to only allow SignalR endpoints
   - Remove WebSocket-specific environment variables

#### 1.2 Migrate Remaining Features to SignalR
**Features to Migrate**:
- Selection change notifications
- Worksheet change events
- Any other real-time Excel events

**Implementation**:
```csharp
// In GridmateHub.cs
public async Task UpdateSelection(string range, string worksheet)
{
    var sessionId = GetSessionId(Context.ConnectionId);
    
    // Forward to backend
    var request = new
    {
        session_id = sessionId,
        selection = new { range, worksheet },
        timestamp = DateTime.UtcNow
    };
    
    var response = await httpClient.PostAsJsonAsync(
        $"{backendUrl}/api/selection-update", request);
}
```

### Phase 2: Implement Rich Excel Context Transmission

#### 2.1 Frontend Context Collection
**File**: `excel-addin/src/components/chat/ChatInterfaceWithSignalR.tsx`

**Implementation Steps**:
1. **Import ExcelService**
   ```typescript
   import { ExcelService } from '../../services/excel/ExcelService';
   ```

2. **Modify Send Message Handler**
   ```typescript
   const handleSendMessage = async () => {
     if (!input.trim() || !signalRClient.isConnected()) return;
     
     try {
       // Collect Excel context
       const context = await ExcelService.getContext();
       
       // Send message with context
       await signalRClient.sendChatMessage(input.trim(), {
         worksheet: context.worksheet || 'Sheet1',
         selection: context.selection || '',
         visibleRange: context.visibleRange || '',
         namedRanges: context.namedRanges || [],
         // Add more context as needed
       });
       
       setInput('');
     } catch (error) {
       console.error('Failed to send message:', error);
     }
   };
   ```

3. **Subscribe to Selection Changes**
   ```typescript
   useEffect(() => {
     const handleSelectionChange = async () => {
       if (signalRClient.isConnected()) {
         const context = await ExcelService.getContext();
         await signalRClient.updateSelection(
           context.selection,
           context.worksheet
         );
       }
     };
     
     // Subscribe to Excel events
     Office.context.document.addHandlerAsync(
       Office.EventType.DocumentSelectionChanged,
       handleSelectionChange
     );
     
     return () => {
       // Cleanup
     };
   }, [signalRClient]);
   ```

#### 2.2 SignalR Client Updates
**File**: `excel-addin/src/services/signalr/SignalRClient.ts`

**Add Methods**:
```typescript
public async sendChatMessage(message: string, context: any): Promise<void> {
    if (!this.connection) {
        throw new Error('Not connected to SignalR');
    }
    
    await this.connection.invoke('SendChatMessage', message, context);
}

public async updateSelection(range: string, worksheet: string): Promise<void> {
    if (!this.connection) return;
    
    await this.connection.invoke('UpdateSelection', range, worksheet);
}
```

#### 2.3 SignalR Hub Updates
**File**: `signalr-service/GridmateSignalR/Hubs/GridmateHub.cs`

**Update Methods**:
```csharp
public async Task SendChatMessage(string message, ExcelContext context)
{
    var sessionId = GetSessionId(Context.ConnectionId);
    
    var request = new
    {
        session_id = sessionId,
        content = message,
        excel_context = context,
        timestamp = DateTime.UtcNow.ToString("HH:mm:ss.fff")
    };
    
    var response = await httpClient.PostAsJsonAsync(
        $"{backendUrl}/api/chat", request);
    
    if (response.IsSuccessStatusCode)
    {
        var result = await response.Content.ReadAsStringAsync();
        logger.LogInformation($"Backend response: {result}");
    }
}

public async Task UpdateSelection(string range, string worksheet)
{
    var sessionId = GetSessionId(Context.ConnectionId);
    
    // Store in session for later use
    _sessionSelections[sessionId] = new SelectionInfo 
    { 
        Range = range, 
        Worksheet = worksheet,
        UpdatedAt = DateTime.UtcNow
    };
    
    // Optionally forward to backend
    await ForwardSelectionUpdate(sessionId, range, worksheet);
}
```

#### 2.4 Backend Handler Updates
**File**: `backend/internal/handlers/signalr_handler.go`

**Update Structure**:
```go
type SignalRChatRequest struct {
    SessionID    string                 `json:"session_id"`
    Content      string                 `json:"content"`
    ExcelContext ExcelContext          `json:"excel_context"`
    Timestamp    string                 `json:"timestamp"`
}

type ExcelContext struct {
    Worksheet    string                 `json:"worksheet"`
    Selection    string                 `json:"selection"`
    VisibleRange string                 `json:"visible_range"`
    NamedRanges  []string              `json:"named_ranges"`
}

func (h *SignalRHandler) HandleSignalRChat(w http.ResponseWriter, r *http.Request) {
    var req SignalRChatRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        h.sendError(w, http.StatusBadRequest, "Invalid request body")
        return
    }
    
    // Convert to map for compatibility
    excelContext := map[string]interface{}{
        "worksheet":     req.ExcelContext.Worksheet,
        "selection":     req.ExcelContext.Selection,
        "visible_range": req.ExcelContext.VisibleRange,
        "named_ranges":  req.ExcelContext.NamedRanges,
    }
    
    // Process with context
    response, err := h.excelBridge.ProcessChatMessage(
        req.SessionID, 
        req.Content, 
        excelContext
    )
    // ...
}
```

### Phase 3: Implement Chat History Persistence

#### 3.1 Backend Message History Storage
**New File**: `backend/internal/services/chat/history.go`

```go
package chat

import (
    "sync"
    "time"
)

type Message struct {
    Role      string    `json:"role"`
    Content   string    `json:"content"`
    Timestamp time.Time `json:"timestamp"`
}

type History struct {
    mu       sync.RWMutex
    sessions map[string][]Message
}

func NewHistory() *History {
    return &History{
        sessions: make(map[string][]Message),
    }
}

func (h *History) AddMessage(sessionID, role, content string) {
    h.mu.Lock()
    defer h.mu.Unlock()
    
    message := Message{
        Role:      role,
        Content:   content,
        Timestamp: time.Now(),
    }
    
    h.sessions[sessionID] = append(h.sessions[sessionID], message)
}

func (h *History) GetHistory(sessionID string) []Message {
    h.mu.RLock()
    defer h.mu.RUnlock()
    
    return h.sessions[sessionID]
}

func (h *History) ClearHistory(sessionID string) {
    h.mu.Lock()
    defer h.mu.Unlock()
    
    delete(h.sessions, sessionID)
}
```

#### 3.2 Integrate History with AI Service
**File**: `backend/internal/services/ai/service.go`

**Update ProcessChatWithTools**:
```go
func (s *Service) ProcessChatWithTools(
    sessionID string,
    userMessage string,
    systemPrompt string,
    tools []Tool,
    chatHistory []Message, // Add parameter
) (string, error) {
    // Build messages array with history
    messages := make([]anthropic.Message, 0, len(chatHistory)+1)
    
    // Add chat history
    for _, msg := range chatHistory {
        messages = append(messages, anthropic.Message{
            Role:    msg.Role,
            Content: msg.Content,
        })
    }
    
    // Add current message
    messages = append(messages, anthropic.Message{
        Role:    "user",
        Content: userMessage,
    })
    
    // Continue with existing implementation...
}
```

#### 3.3 Update ExcelBridge to Use History
**File**: `backend/internal/services/excel_bridge.go`

**Add History Management**:
```go
type ExcelBridge struct {
    // ... existing fields ...
    chatHistory *chat.History
}

func NewExcelBridge(/* params */) *ExcelBridge {
    return &ExcelBridge{
        // ... existing initialization ...
        chatHistory: chat.NewHistory(),
    }
}

func (eb *ExcelBridge) ProcessChatMessage(
    sessionID string,
    message string,
    excelContext map[string]interface{},
) (*ChatResponse, error) {
    // Get chat history
    history := eb.chatHistory.GetHistory(sessionID)
    
    // Add user message to history
    eb.chatHistory.AddMessage(sessionID, "user", message)
    
    // Build context with full spreadsheet data
    context := eb.buildContextWithHistory(sessionID, excelContext, history)
    
    // Process with AI service including history
    response, err := eb.aiService.ProcessChatWithTools(
        sessionID,
        message,
        context,
        tools,
        history,
    )
    
    if err == nil {
        // Add AI response to history
        eb.chatHistory.AddMessage(sessionID, "assistant", response)
    }
    
    return &ChatResponse{Content: response}, err
}
```

### Phase 4: Enhanced Context Building

#### 4.1 Update Context Builder to Work with SignalR Data
**File**: `backend/internal/services/excel/context_builder.go`

**Add Method for SignalR Context**:
```go
func (cb *ContextBuilder) BuildFromSignalRContext(
    ctx context.Context,
    sessionID string,
    excelContext map[string]interface{},
) (string, error) {
    // Extract selection from SignalR context
    selection, _ := excelContext["selection"].(string)
    worksheet, _ := excelContext["worksheet"].(string)
    
    if selection == "" {
        // Fall back to minimal context
        return cb.buildMinimalContext(worksheet), nil
    }
    
    // Build rich context using selection
    return cb.BuildContext(ctx, sessionID, selection)
}
```

### Phase 5: Testing and Validation

#### 5.1 Test Plan
1. **Context Transmission Tests**
   - Verify Excel context is sent with each message
   - Confirm selection updates are propagated
   - Test worksheet change notifications

2. **Chat History Tests**
   - Send multiple messages and verify history is maintained
   - Test that AI references previous messages correctly
   - Verify history is session-specific

3. **Performance Tests**
   - Measure latency with full context
   - Test with large spreadsheets
   - Verify memory usage with long chat histories

#### 5.2 Rollback Plan
1. Keep WebSocket code in separate branch until SignalR is fully validated
2. Implement feature flags to toggle between implementations
3. Maintain backwards compatibility during transition

### Phase 6: Future Enhancements

1. **Persistent History**
   - Store chat history in database
   - Allow users to resume previous sessions
   - Implement history search and export

2. **Advanced Context**
   - Include cell formatting in context
   - Add chart and pivot table awareness
   - Support for multiple worksheet context

3. **Optimization**
   - Implement context caching
   - Compress large context data
   - Stream responses for better UX

### Implementation Timeline

**Week 1**: Complete WebSocket removal and SignalR migration
**Week 2**: Implement Excel context transmission
**Week 3**: Add chat history persistence
**Week 4**: Testing, bug fixes, and optimization

### Success Metrics

1. **Context Quality**
   - AI correctly identifies spreadsheet structure in 95%+ of cases
   - Can reference cells and formulas without explicit coordinates

2. **Chat Continuity**
   - AI maintains conversation context across 10+ message exchanges
   - Users report 80%+ satisfaction with chat experience

3. **Performance**
   - Context building completes in <100ms
   - Chat responses begin streaming in <2s
   - Memory usage remains stable over long sessions