# Gridmate Context Features Implementation Plan - Steps 5 & 6

## Overview

This document outlines the implementation plan for the remaining context-handling features in Gridmate, focusing on:
- **Step 5**: Maintaining Understanding of Spreadsheet Structure
- **Step 6**: User Transparency and Control

## Step 5: Maintaining Understanding of Spreadsheet Structure

### 5.1 Consistent Formula Inclusion in Context

**Current State**: Formulas are captured but not consistently included in the prompt builder output.

**Implementation**:

#### Backend Changes

1. **Update `prompt_builder.go`** to always include formulas in context:

```go
// File: backend/internal/services/ai/prompt_builder.go
// In buildOptimizedCellDataSection method

func (pb *PromptBuilder) buildOptimizedCellDataSection(context *FinancialContext) string {
    // Add a dedicated formulas section
    if len(context.Formulas) > 0 {
        parts = append(parts, "  <formulas>")
        // Group formulas by type/pattern for better organization
        formulaGroups := pb.groupFormulasByPattern(context.Formulas)
        for groupName, formulas := range formulaGroups {
            parts = append(parts, fmt.Sprintf("    <!-- %s -->", groupName))
            for cell, formula := range formulas {
                parts = append(parts, fmt.Sprintf("    %s: %s", cell, formula))
            }
        }
        parts = append(parts, "  </formulas>")
    }
}
```

2. **Add formula pattern recognition**:

```go
// New method to group formulas by pattern
func (pb *PromptBuilder) groupFormulasByPattern(formulas map[string]string) map[string]map[string]string {
    groups := map[string]map[string]string{
        "calculations": {},
        "lookups": {},
        "aggregations": {},
        "conditionals": {},
        "references": {},
    }
    
    // Categorize each formula
    for cell, formula := range formulas {
        if strings.Contains(formula, "VLOOKUP") || strings.Contains(formula, "INDEX") {
            groups["lookups"][cell] = formula
        } else if strings.Contains(formula, "SUM") || strings.Contains(formula, "AVERAGE") {
            groups["aggregations"][cell] = formula
        } else if strings.Contains(formula, "IF") {
            groups["conditionals"][cell] = formula
        } else if strings.Contains(formula, "=") && !strings.Contains(formula, "(") {
            groups["references"][cell] = formula
        } else {
            groups["calculations"][cell] = formula
        }
    }
    
    return groups
}
```

### 5.2 Enhanced Dependency Tracing Tools

**Current State**: Basic `trace_precedents` and `trace_dependents` tools exist but need enhancement.

**Implementation**:

1. **Enhance the existing tools** with better Excel API integration:

```go
// File: backend/internal/services/ai/tool_executor.go

// Add new tool: analyze_formula_chain
{
    Name: "analyze_formula_chain",
    Description: "Analyze the complete calculation chain for a cell, showing all dependencies and dependents in a tree structure",
    InputSchema: map[string]interface{}{
        "type": "object",
        "properties": map[string]interface{}{
            "cell": map[string]interface{}{
                "type": "string",
                "description": "The cell to analyze",
            },
            "max_depth": map[string]interface{}{
                "type": "integer",
                "description": "Maximum depth to trace",
                "default": 3,
            },
        },
        "required": []string{"cell"},
    },
}
```

2. **Implement the formula chain analyzer**:

```go
func (te *ToolExecutor) executeAnalyzeFormulaChain(ctx context.Context, sessionID string, input map[string]interface{}) (interface{}, error) {
    cell := input["cell"].(string)
    maxDepth := 3
    if md, ok := input["max_depth"].(float64); ok {
        maxDepth = int(md)
    }
    
    // Build complete dependency tree
    tree := te.buildDependencyTree(ctx, sessionID, cell, maxDepth)
    
    // Generate visual representation
    visualization := te.generateTreeVisualization(tree)
    
    return map[string]interface{}{
        "cell": cell,
        "dependency_tree": tree,
        "visualization": visualization,
        "summary": te.summarizeDependencies(tree),
    }, nil
}
```

### 5.3 Automatic Named Range Context Inclusion

**Current State**: Named ranges are collected but not automatically included in the system prompt.

**Implementation**:

1. **Update system prompt to include named ranges**:

```go
// File: backend/internal/services/ai/prompt_builder.go

func getFinancialModelingSystemPrompt() string {
    return `You are an expert financial modeler and Excel automation assistant...
    
    <named_ranges>
    When working with this spreadsheet, be aware of these named ranges:
    {{NAMED_RANGES_PLACEHOLDER}}
    </named_ranges>
    
    Always prefer using named ranges over cell references when they are available.
    `
}

// In BuildPromptWithHistory method
func (pb *PromptBuilder) BuildPromptWithHistory(...) []Message {
    systemContent := pb.systemPrompt
    
    // Replace named ranges placeholder
    if context != nil && len(context.NamedRanges) > 0 {
        namedRangesText := pb.formatNamedRangesForPrompt(context.NamedRanges)
        systemContent = strings.Replace(systemContent, "{{NAMED_RANGES_PLACEHOLDER}}", namedRangesText, 1)
    } else {
        systemContent = strings.Replace(systemContent, "{{NAMED_RANGES_PLACEHOLDER}}", "No named ranges defined", 1)
    }
}
```

### 5.4 Model Overview Generation

**Current State**: No automatic or user-provided model overview.

**Implementation**:

1. **Add automatic model overview generation**:

```go
// File: backend/internal/services/excel/model_analyzer.go (new file)

type ModelAnalyzer struct {
    bridge ExcelBridge
}

func (ma *ModelAnalyzer) GenerateModelOverview(ctx context.Context, sessionID string) (*ModelOverview, error) {
    overview := &ModelOverview{
        GeneratedAt: time.Now(),
    }
    
    // Analyze sheet structure
    sheets := ma.analyzeSheetStructure(ctx, sessionID)
    overview.SheetRoles = ma.classifySheetRoles(sheets)
    
    // Detect model type
    overview.ModelType = ma.detectModelType(sheets)
    
    // Find key metrics
    overview.KeyMetrics = ma.findKeyMetrics(ctx, sessionID)
    
    // Analyze data flow
    overview.DataFlow = ma.analyzeDataFlow(ctx, sessionID)
    
    return overview, nil
}

type ModelOverview struct {
    ModelType   string                 `json:"model_type"`
    SheetRoles  map[string]string      `json:"sheet_roles"`
    KeyMetrics  []KeyMetric            `json:"key_metrics"`
    DataFlow    []DataFlowConnection   `json:"data_flow"`
    GeneratedAt time.Time              `json:"generated_at"`
    UserNotes   string                 `json:"user_notes,omitempty"`
}
```

2. **Add UI for user to provide/edit model overview**:

```typescript
// File: excel-addin/src/components/ModelOverview.tsx (new file)

export const ModelOverview: React.FC = () => {
    const [overview, setOverview] = useState<ModelOverview | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    
    const generateOverview = async () => {
        const result = await ExcelService.getInstance().generateModelOverview();
        setOverview(result);
    };
    
    return (
        <div className="model-overview">
            <h3>Model Overview</h3>
            {!overview ? (
                <button onClick={generateOverview}>Generate Overview</button>
            ) : (
                <div>
                    <div className="overview-section">
                        <h4>Model Type: {overview.modelType}</h4>
                        <p>Generated: {new Date(overview.generatedAt).toLocaleString()}</p>
                    </div>
                    
                    <div className="overview-section">
                        <h4>Sheet Roles</h4>
                        {Object.entries(overview.sheetRoles).map(([sheet, role]) => (
                            <div key={sheet}>{sheet}: {role}</div>
                        ))}
                    </div>
                    
                    <div className="overview-section">
                        <h4>User Notes</h4>
                        {isEditing ? (
                            <textarea 
                                value={overview.userNotes || ''} 
                                onChange={(e) => setOverview({...overview, userNotes: e.target.value})}
                            />
                        ) : (
                            <p>{overview.userNotes || 'Click edit to add notes'}</p>
                        )}
                        <button onClick={() => setIsEditing(!isEditing)}>
                            {isEditing ? 'Save' : 'Edit'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
```

## Step 6: User Transparency and Control

### 6.1 Citation System for Retrieved Information

**Current State**: No citation system for memory-retrieved information.

**Implementation**:

1. **Update AI response to include citations**:

```go
// File: backend/internal/services/ai/prompt_builder.go

// Add to system prompt
const citationInstructions = `
When using information from memory search or other sheets, always cite your sources:
- For memory search results: [Source: Memory - {source_type} - {reference}]
- For cross-sheet references: [Source: Sheet '{sheet_name}' - {cell_range}]
- For named ranges: [Source: Named range '{name}']
`

// File: backend/internal/services/ai/response_processor.go (new file)

type ResponseProcessor struct{}

func (rp *ResponseProcessor) AddCitations(response string, sources []SourceReference) string {
    // Parse response and add inline citations
    for _, source := range sources {
        citation := fmt.Sprintf("[%d]", source.ID)
        // Add citation after relevant content
        response = rp.insertCitation(response, source.Content, citation)
    }
    
    // Add references section at the end
    response += "\n\n---\nReferences:\n"
    for _, source := range sources {
        response += fmt.Sprintf("[%d] %s\n", source.ID, source.FormatReference())
    }
    
    return response
}
```

2. **Track sources during tool execution**:

```go
// File: backend/internal/services/ai/tool_executor.go

type ToolExecutionContext struct {
    Sources []SourceReference
}

func (te *ToolExecutor) ExecuteTool(ctx context.Context, ...) (*ToolResult, error) {
    execCtx := &ToolExecutionContext{}
    ctx = context.WithValue(ctx, "exec_context", execCtx)
    
    // Execute tool...
    
    // Return sources with result
    result.Sources = execCtx.Sources
}
```

### 6.2 Token/Context Usage Display

**Current State**: Token counting is tracked in backend but not displayed in UI.

**Implementation**:

1. **Add token counter component**:

```typescript
// File: excel-addin/src/components/TokenCounter.tsx (new file)

interface TokenUsage {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    contextTokens: number;
    maxTokens: number;
}

export const TokenCounter: React.FC<{usage: TokenUsage}> = ({ usage }) => {
    const percentage = (usage.totalTokens / usage.maxTokens) * 100;
    const contextPercentage = (usage.contextTokens / usage.maxTokens) * 100;
    
    return (
        <div className="token-counter">
            <div className="token-bar">
                <div 
                    className="token-bar-context" 
                    style={{width: `${contextPercentage}%`}}
                    title={`Context: ${usage.contextTokens} tokens`}
                />
                <div 
                    className="token-bar-usage" 
                    style={{width: `${percentage - contextPercentage}%`}}
                    title={`Conversation: ${usage.totalTokens - usage.contextTokens} tokens`}
                />
            </div>
            <div className="token-stats">
                <span>{usage.totalTokens.toLocaleString()} / {usage.maxTokens.toLocaleString()} tokens</span>
                <span className="token-breakdown">
                    (Context: {usage.contextTokens.toLocaleString()}, 
                     Prompt: {usage.promptTokens.toLocaleString()}, 
                     Response: {usage.completionTokens.toLocaleString()})
                </span>
            </div>
        </div>
    );
};
```

2. **Update chat interface to show token usage**:

```typescript
// File: excel-addin/src/components/chat/RefactoredChatInterface.tsx

// Add to component state
const [tokenUsage, setTokenUsage] = useState<TokenUsage>({
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    contextTokens: 0,
    maxTokens: 200000, // Claude's limit
});

// Update after each message
const handleSendMessage = async () => {
    // ... existing code ...
    
    const response = await chatService.sendMessage(message);
    
    // Update token usage
    if (response.tokenUsage) {
        setTokenUsage(prev => ({
            ...prev,
            promptTokens: prev.promptTokens + response.tokenUsage.promptTokens,
            completionTokens: prev.completionTokens + response.tokenUsage.completionTokens,
            totalTokens: prev.totalTokens + response.tokenUsage.totalTokens,
            contextTokens: response.tokenUsage.contextTokens,
        }));
    }
};

// Add to render
<TokenCounter usage={tokenUsage} />
```

### 6.3 Memory Management UI

**Current State**: No UI for viewing/managing indexed content.

**Implementation**:

1. **Create memory management panel**:

```typescript
// File: excel-addin/src/components/MemoryPanel.tsx (new file)

export const MemoryPanel: React.FC = () => {
    const [memoryStats, setMemoryStats] = useState<MemoryStats | null>(null);
    const [indexedContent, setIndexedContent] = useState<IndexedContent[]>([]);
    const [selectedSource, setSelectedSource] = useState<string>('all');
    
    useEffect(() => {
        loadMemoryStats();
    }, []);
    
    const loadMemoryStats = async () => {
        const stats = await memoryService.getStats();
        setMemoryStats(stats);
        
        const content = await memoryService.getIndexedContent(selectedSource);
        setIndexedContent(content);
    };
    
    const handleReindex = async (source: string) => {
        await memoryService.reindex(source);
        await loadMemoryStats();
    };
    
    const handleClearMemory = async (source: string) => {
        if (confirm(`Clear all ${source} memory?`)) {
            await memoryService.clear(source);
            await loadMemoryStats();
        }
    };
    
    return (
        <div className="memory-panel">
            <h3>Memory Management</h3>
            
            {memoryStats && (
                <div className="memory-stats">
                    <div className="stat-card">
                        <h4>Total Chunks</h4>
                        <p>{memoryStats.totalChunks}</p>
                    </div>
                    <div className="stat-card">
                        <h4>Spreadsheet</h4>
                        <p>{memoryStats.spreadsheetChunks}</p>
                        <button onClick={() => handleReindex('spreadsheet')}>Reindex</button>
                    </div>
                    <div className="stat-card">
                        <h4>Documents</h4>
                        <p>{memoryStats.documentChunks}</p>
                        <button onClick={() => handleReindex('document')}>Reindex</button>
                    </div>
                    <div className="stat-card">
                        <h4>Chat History</h4>
                        <p>{memoryStats.chatChunks}</p>
                        <button onClick={() => handleClearMemory('chat')}>Clear</button>
                    </div>
                </div>
            )}
            
            <div className="indexed-content">
                <h4>Indexed Content</h4>
                <select value={selectedSource} onChange={(e) => setSelectedSource(e.target.value)}>
                    <option value="all">All Sources</option>
                    <option value="spreadsheet">Spreadsheet</option>
                    <option value="document">Documents</option>
                    <option value="chat">Chat History</option>
                </select>
                
                <div className="content-list">
                    {indexedContent.map((item, idx) => (
                        <div key={idx} className="content-item">
                            <span className="content-source">{item.source}</span>
                            <span className="content-ref">{item.reference}</span>
                            <span className="content-preview">{item.preview}</span>
                        </div>
                    ))}
                </div>
            </div>
            
            <div className="memory-actions">
                <button onClick={() => handleReindex('all')} className="btn-primary">
                    Reindex All
                </button>
                <button onClick={() => handleClearMemory('all')} className="btn-danger">
                    Clear All Memory
                </button>
            </div>
        </div>
    );
};
```

2. **Add backend endpoints for memory management**:

```go
// File: backend/internal/handlers/memory_handler.go

func (h *MemoryHandler) GetMemoryStats(w http.ResponseWriter, r *http.Request) {
    sessionID := r.URL.Query().Get("session_id")
    
    session := h.excelBridge.GetSession(sessionID)
    if session == nil || session.MemoryStore == nil {
        http.Error(w, "Session not found", http.StatusNotFound)
        return
    }
    
    stats := (*session.MemoryStore).GetStats()
    json.NewEncoder(w).Encode(stats)
}

func (h *MemoryHandler) GetIndexedContent(w http.ResponseWriter, r *http.Request) {
    sessionID := r.URL.Query().Get("session_id")
    source := r.URL.Query().Get("source")
    limit := 50
    
    // Get chunks from memory store
    chunks := h.getChunksPreview(sessionID, source, limit)
    
    json.NewEncoder(w).Encode(chunks)
}

func (h *MemoryHandler) ClearMemory(w http.ResponseWriter, r *http.Request) {
    sessionID := r.URL.Query().Get("session_id")
    source := r.URL.Query().Get("source")
    
    session := h.excelBridge.GetSession(sessionID)
    if session == nil || session.MemoryStore == nil {
        http.Error(w, "Session not found", http.StatusNotFound)
        return
    }
    
    // Clear memory based on source filter
    var filter memory.FilterFunc
    if source != "all" {
        filter = func(chunk memory.Chunk) bool {
            return chunk.Metadata.Source == source
        }
    }
    
    err := (*session.MemoryStore).Delete(filter)
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }
    
    w.WriteHeader(http.StatusOK)
}
```

### 6.4 Session Reset Functionality

**Current State**: No explicit "Start new session" button.

**Implementation**:

1. **Add session management UI**:

```typescript
// File: excel-addin/src/components/SessionManager.tsx (new file)

export const SessionManager: React.FC = () => {
    const [currentSession, setCurrentSession] = useState<SessionInfo | null>(null);
    const [showNewSessionDialog, setShowNewSessionDialog] = useState(false);
    
    const handleNewSession = async () => {
        if (currentSession && currentSession.hasUnsavedWork) {
            if (!confirm('Start a new session? Current conversation will be saved.')) {
                return;
            }
        }
        
        const newSession = await sessionService.createNewSession();
        setCurrentSession(newSession);
        
        // Clear UI state
        chatStore.clearMessages();
        contextStore.reset();
        
        // Notify user
        toast.success('New session started');
    };
    
    const handleSaveSession = async () => {
        if (!currentSession) return;
        
        const savedSession = await sessionService.saveSession(currentSession.id);
        toast.success(`Session saved: ${savedSession.name}`);
    };
    
    const handleLoadSession = async (sessionId: string) => {
        const session = await sessionService.loadSession(sessionId);
        setCurrentSession(session);
        
        // Restore UI state
        chatStore.loadMessages(session.messages);
        contextStore.loadContext(session.context);
        
        toast.success(`Session loaded: ${session.name}`);
    };
    
    return (
        <div className="session-manager">
            <div className="session-info">
                {currentSession ? (
                    <>
                        <span>Session: {currentSession.name}</span>
                        <span className="session-time">
                            Started: {new Date(currentSession.createdAt).toLocaleTimeString()}
                        </span>
                    </>
                ) : (
                    <span>No active session</span>
                )}
            </div>
            
            <div className="session-actions">
                <button onClick={handleNewSession} className="btn-primary">
                    <Icon name="plus" /> New Session
                </button>
                <button onClick={handleSaveSession} disabled={!currentSession}>
                    <Icon name="save" /> Save Session
                </button>
                <button onClick={() => setShowNewSessionDialog(true)}>
                    <Icon name="folder-open" /> Load Session
                </button>
            </div>
            
            {showNewSessionDialog && (
                <SessionDialog 
                    onClose={() => setShowNewSessionDialog(false)}
                    onLoad={handleLoadSession}
                />
            )}
        </div>
    );
};
```

2. **Add clear visual indicator for session state**:

```css
/* File: excel-addin/src/styles/session.css */

.session-indicator {
    position: fixed;
    top: 10px;
    right: 10px;
    background: var(--session-bg);
    border: 1px solid var(--session-border);
    border-radius: 20px;
    padding: 5px 15px;
    font-size: 12px;
    display: flex;
    align-items: center;
    gap: 8px;
}

.session-indicator.active {
    --session-bg: #e8f5e9;
    --session-border: #4caf50;
}

.session-indicator.unsaved {
    --session-bg: #fff3e0;
    --session-border: #ff9800;
}

.session-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--session-border);
    animation: pulse 2s infinite;
}

@keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.5; }
    100% { opacity: 1; }
}
```

## Implementation Timeline

### Week 1: Backend Foundation
- Day 1-2: Implement consistent formula inclusion and pattern recognition
- Day 3-4: Enhance dependency tracing tools and formula chain analyzer
- Day 5: Add model overview generation backend

### Week 2: Frontend UI Components
- Day 1-2: Implement token counter and usage display
- Day 3-4: Create memory management panel
- Day 5: Add session management UI

### Week 3: Integration and Polish
- Day 1-2: Implement citation system
- Day 3: Add named range auto-inclusion
- Day 4: Testing and bug fixes
- Day 5: Documentation and deployment

## Testing Strategy

### Unit Tests
- Test formula pattern recognition
- Test dependency tracing algorithms
- Test citation insertion logic
- Test memory management operations

### Integration Tests
- Test full context building with all features
- Test session persistence and restoration
- Test memory indexing and retrieval
- Test UI component interactions

### User Acceptance Tests
- Verify formulas are always visible in context
- Verify dependency tracing provides useful insights
- Verify citations appear correctly
- Verify token usage is accurate
- Verify session management works smoothly

## Success Metrics

1. **Formula Visibility**: 100% of formulas in selected ranges appear in context
2. **Dependency Accuracy**: Dependency tracing correctly identifies 95%+ of relationships
3. **Citation Coverage**: 100% of memory-retrieved information includes citations
4. **Token Awareness**: Users can see token usage updated within 1 second
5. **Session Clarity**: Users can start new sessions with one click
6. **Memory Control**: Users can view and manage all indexed content

## Risk Mitigation

1. **Performance Impact**: 
   - Risk: Additional features slow down response time
   - Mitigation: Implement caching for formula analysis, lazy load UI components

2. **Token Overhead**:
   - Risk: Additional context uses too many tokens
   - Mitigation: Smart truncation, prioritize most relevant formulas

3. **UI Complexity**:
   - Risk: Too many new UI elements confuse users
   - Mitigation: Progressive disclosure, clear visual hierarchy

4. **Memory Management Confusion**:
   - Risk: Users don't understand what's indexed
   - Mitigation: Clear explanations, visual previews, undo functionality

## Documentation Requirements

1. **User Guide Updates**:
   - How to read formula patterns in context
   - Understanding dependency visualizations
   - Managing memory and sessions
   - Reading citations in responses

2. **API Documentation**:
   - New endpoints for memory management
   - Session management API
   - Model overview format

3. **Developer Guide**:
   - Formula pattern recognition algorithm
   - Citation system architecture
   - Session state management

## Conclusion

This implementation plan addresses all remaining gaps in Gridmate's context-handling system. By implementing these features, Gridmate will provide:

1. **Complete structural understanding** of Excel models through consistent formula inclusion and dependency analysis
2. **Full transparency** through citations, token usage display, and memory management
3. **User control** through session management and memory controls

The phased approach ensures steady progress while maintaining system stability. Each feature builds on the previous work, creating a comprehensive context-aware Excel assistant that rivals the best code editors in terms of context handling.