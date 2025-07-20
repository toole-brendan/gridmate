# Enhanced Context & Memory Persistence Implementation Plan for Gridmate

## Executive Summary

This plan addresses critical issues in Gridmate's context and memory management system, ensuring the AI maintains full conversation history and current spreadsheet state across all interactions. The implementation follows patterns from successful AI-powered code editors like Cline and Roo-code, adapted for financial modeling in Excel.

## Current State Analysis

### Issues Identified

1. **Multiple System Messages Bug**: Anthropic API only uses the last system message, causing context loss
2. **First Message Context Missing**: Order of operations prevents context inclusion in initial message
3. **Stale Context**: Spreadsheet context only sent on first message, not refreshed
4. **No Frontend Persistence**: Chat history lost on page reload
5. **User Edits Not Tracked**: Changes between messages aren't captured
6. **Memory Not Included**: Full conversation history not sent with each request

### Existing Strengths

1. Sophisticated `ContextBuilder` with model structure analysis
2. Comprehensive financial context detection
3. Recent edits tracking infrastructure
4. Strong Excel integration via Office.js
5. SignalR real-time communication

## Implementation Plan

### Phase 1: Critical Fixes (Immediate - Day 1)

#### 1.1 Fix System Message Merging

**File: `backend/internal/services/ai/prompt_builder.go`**

```go
// BuildChatPrompt builds a prompt for chat interactions with merged context
func (pb *PromptBuilder) BuildChatPrompt(userMessage string, context *FinancialContext) []Message {
    // Start with base system prompt
    systemContent := pb.systemPrompt
    
    // Merge context into system message if available
    if context != nil {
        contextPrompt := pb.buildContextPrompt(context)
        if contextPrompt != "" {
            systemContent += "\n\n<current_context>\n" + contextPrompt + "\n</current_context>"
        }
    }
    
    // Return single system message + user message
    return []Message{
        {Role: "system", Content: systemContent},
        {Role: "user", Content: userMessage},
    }
}

// BuildPromptWithHistory builds a complete prompt including conversation history
func (pb *PromptBuilder) BuildPromptWithHistory(userMessage string, context *FinancialContext, history []Message) []Message {
    // Start with system message (includes context)
    messages := []Message{}
    
    // Always include fresh system prompt with current context
    systemContent := pb.systemPrompt
    if context != nil {
        contextPrompt := pb.buildContextPrompt(context)
        if contextPrompt != "" {
            systemContent += "\n\n<current_context>\n" + contextPrompt + "\n</current_context>"
        }
    }
    
    messages = append(messages, Message{Role: "system", Content: systemContent})
    
    // Add conversation history (excluding any old system messages)
    for _, msg := range history {
        if msg.Role != "system" {
            messages = append(messages, msg)
        }
    }
    
    // Add current user message
    messages = append(messages, Message{Role: "user", Content: userMessage})
    
    return messages
}
```

#### 1.2 Fix First Message Context Inclusion

**File: `backend/internal/services/excel_bridge.go`**

```go
func (eb *ExcelBridge) ProcessChatMessage(clientID string, message ChatMessage) (*ChatResponse, error) {
    session := eb.getOrCreateSession(clientID, message.SessionID)
    
    // Build comprehensive context BEFORE adding message to history
    var financialContext *ai.FinancialContext
    if eb.contextBuilder != nil {
        ctx := context.Background()
        builtContext, err := eb.contextBuilder.BuildContext(ctx, session.ID)
        if err != nil {
            eb.logger.WithError(err).Warn("Failed to build comprehensive context")
            financialContext = eb.buildFinancialContext(session, message.Context)
        } else {
            financialContext = builtContext
            // Merge any additional context from the message
            eb.mergeMessageContext(financialContext, message.Context)
        }
    } else {
        financialContext = eb.buildFinancialContext(session, message.Context)
    }
    
    // Get existing history BEFORE adding new message
    existingHistory := eb.chatHistory.GetHistory(session.ID)
    
    // Convert to AI message format
    aiHistory := make([]ai.Message, 0, len(existingHistory))
    for _, msg := range existingHistory {
        aiHistory = append(aiHistory, ai.Message{
            Role:    msg.Role,
            Content: msg.Content,
        })
    }
    
    // Process with AI
    ctx := context.Background()
    if message.MessageID != "" {
        ctx = context.WithValue(ctx, "message_id", message.MessageID)
    }
    
    // Call AI with full context and history
    aiResponse, err := eb.aiService.ProcessChatWithToolsAndHistory(
        ctx, 
        session.ID, 
        message.Content, 
        financialContext, 
        aiHistory, 
        message.AutonomyMode,
    )
    
    // NOW add messages to history after processing
    eb.chatHistory.AddMessage(session.ID, "user", message.Content)
    if aiResponse != nil && err == nil {
        eb.chatHistory.AddMessage(session.ID, "assistant", aiResponse.Content)
    }
    
    // ... rest of the method
}

// mergeMessageContext merges additional context from the message
func (eb *ExcelBridge) mergeMessageContext(fc *ai.FinancialContext, msgContext map[string]interface{}) {
    // Add any document context from the message
    for k, v := range msgContext {
        if str, ok := v.(string); ok && k != "selectedData" && k != "nearbyData" {
            fc.DocumentContext = append(fc.DocumentContext, fmt.Sprintf("%s: %s", k, str))
        }
    }
}
```

#### 1.3 Always Include Updated Context

**File: `backend/internal/services/ai/service.go`**

```go
// ProcessChatWithToolsAndHistory - Modified to always include fresh context
func (s *Service) ProcessChatWithToolsAndHistory(
    ctx context.Context, 
    sessionID string, 
    userMessage string, 
    context *FinancialContext, 
    chatHistory []Message, 
    autonomyMode string,
) (*CompletionResponse, error) {
    // ... existing panic recovery code ...
    
    // Build messages array with fresh context every time
    messages := make([]Message, 0)
    
    // Use the prompt builder to create system message with current context
    if s.promptBuilder != nil {
        // This will include both base prompt and current context
        initialMessages := s.promptBuilder.BuildPromptWithHistory(userMessage, context, chatHistory)
        messages = initialMessages
    } else {
        // Fallback: manually construct messages
        messages = append(messages, chatHistory...)
        messages = append(messages, Message{Role: "user", Content: userMessage})
    }
    
    // ... rest of the method remains the same ...
}
```

### Phase 2: Frontend Persistence & Real-time Tracking (Day 2-3)

#### 2.1 Frontend Chat Persistence

**File: `excel-addin/src/hooks/usePersistedChat.ts`**

```typescript
import { useState, useEffect, useCallback } from 'react'
import { EnhancedChatMessage } from '../types/enhanced-chat'

interface PersistedChatState {
  messages: EnhancedChatMessage[]
  sessionId: string
  lastUpdated: string
}

export function usePersistedChat(sessionId: string) {
  const storageKey = `gridmate_chat_${sessionId}`
  
  // Initialize from localStorage
  const [messages, setMessages] = useState<EnhancedChatMessage[]>(() => {
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        const parsed: PersistedChatState = JSON.parse(stored)
        // Only restore if same session and recent (within 24 hours)
        const lastUpdate = new Date(parsed.lastUpdated)
        const now = new Date()
        const hoursSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60)
        
        if (parsed.sessionId === sessionId && hoursSinceUpdate < 24) {
          return parsed.messages
        }
      }
    } catch (error) {
      console.error('Failed to restore chat from localStorage:', error)
    }
    return []
  })
  
  // Persist on every change
  useEffect(() => {
    const state: PersistedChatState = {
      messages,
      sessionId,
      lastUpdated: new Date().toISOString()
    }
    
    try {
      localStorage.setItem(storageKey, JSON.stringify(state))
    } catch (error) {
      console.error('Failed to persist chat to localStorage:', error)
      // Handle quota exceeded - remove old chats
      if (error.name === 'QuotaExceededError') {
        clearOldChats()
        try {
          localStorage.setItem(storageKey, JSON.stringify(state))
        } catch (retryError) {
          console.error('Failed to persist after cleanup:', retryError)
        }
      }
    }
  }, [messages, sessionId, storageKey])
  
  const addMessage = useCallback((message: EnhancedChatMessage) => {
    setMessages(prev => [...prev, message])
  }, [])
  
  const updateMessage = useCallback((id: string, updates: Partial<EnhancedChatMessage>) => {
    setMessages(prev => prev.map(msg => 
      msg.id === id ? { ...msg, ...updates } : msg
    ))
  }, [])
  
  const clearMessages = useCallback(() => {
    setMessages([])
    localStorage.removeItem(storageKey)
  }, [storageKey])
  
  return {
    messages,
    addMessage,
    updateMessage,
    clearMessages,
    setMessages
  }
}

// Helper to clean up old chats
function clearOldChats() {
  const keys = Object.keys(localStorage)
  const chatKeys = keys.filter(k => k.startsWith('gridmate_chat_'))
  
  // Sort by last update and keep only recent 5 sessions
  const sessions = chatKeys.map(key => {
    try {
      const data = JSON.parse(localStorage.getItem(key) || '{}')
      return { key, lastUpdated: new Date(data.lastUpdated || 0) }
    } catch {
      return { key, lastUpdated: new Date(0) }
    }
  }).sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime())
  
  // Remove all but the 5 most recent
  sessions.slice(5).forEach(({ key }) => {
    localStorage.removeItem(key)
  })
}
```

#### 2.2 Real-time Excel Change Tracking

**File: `excel-addin/src/services/excel/ExcelChangeTracker.ts`**

```typescript
export class ExcelChangeTracker {
  private static instance: ExcelChangeTracker
  private changeHandlers: Excel.BindingDataChangedEventHandler[] = []
  private recentChanges: RecentEdit[] = []
  private readonly MAX_CHANGES = 50
  private onChangeCallback?: (changes: RecentEdit[]) => void
  
  static getInstance(): ExcelChangeTracker {
    if (!ExcelChangeTracker.instance) {
      ExcelChangeTracker.instance = new ExcelChangeTracker()
    }
    return ExcelChangeTracker.instance
  }
  
  async initialize(onChangeCallback?: (changes: RecentEdit[]) => void) {
    this.onChangeCallback = onChangeCallback
    
    await Excel.run(async (context) => {
      const worksheet = context.workbook.worksheets.getActiveWorksheet()
      
      // Track data changes
      worksheet.onChanged.add(this.handleWorksheetChange.bind(this))
      
      // Track selection changes
      worksheet.onSelectionChanged.add(this.handleSelectionChange.bind(this))
      
      await context.sync()
      console.log('[ExcelChangeTracker] Initialized change tracking')
    })
  }
  
  private async handleWorksheetChange(event: Excel.WorksheetChangedEventArgs) {
    if (event.source === Excel.EventSource.local) {
      // User-initiated change
      await this.captureChange(event.address, 'user', 'manual_edit')
    }
  }
  
  private async handleSelectionChange(event: Excel.WorksheetSelectionChangedEventArgs) {
    // Update last selection time for context expansion logic
    const timestamp = new Date().toISOString()
    sessionStorage.setItem('lastUserSelectionTime', timestamp)
  }
  
  private async captureChange(address: string, source: string, tool: string) {
    await Excel.run(async (context) => {
      const range = context.workbook.worksheets.getActiveWorksheet().getRange(address)
      range.load(['values', 'formulas'])
      
      await context.sync()
      
      const change: RecentEdit = {
        range: address,
        timestamp: new Date().toISOString(),
        source,
        tool,
        newValues: range.values,
        newFormulas: range.formulas
      }
      
      // Try to get old values from recent context if available
      const recentContext = this.getRecentContextForRange(address)
      if (recentContext) {
        change.oldValues = recentContext.oldValues
        change.oldFormulas = recentContext.oldFormulas
      }
      
      this.addChange(change)
    })
  }
  
  private addChange(change: RecentEdit) {
    this.recentChanges.unshift(change)
    
    // Keep only recent changes
    if (this.recentChanges.length > this.MAX_CHANGES) {
      this.recentChanges = this.recentChanges.slice(0, this.MAX_CHANGES)
    }
    
    // Notify callback
    if (this.onChangeCallback) {
      this.onChangeCallback(this.getRecentChanges())
    }
  }
  
  getRecentChanges(limit: number = 10): RecentEdit[] {
    return this.recentChanges.slice(0, limit)
  }
  
  private getRecentContextForRange(address: string): any {
    // This would integrate with the context caching system
    // For now, return null to indicate no old values available
    return null
  }
  
  clearChanges() {
    this.recentChanges = []
  }
}

interface RecentEdit {
  range: string
  timestamp: string
  source: string
  tool: string
  oldValues?: any[][]
  oldFormulas?: any[][]
  newValues?: any[][]
  newFormulas?: any[][]
}
```

#### 2.3 Enhanced Chat Interface Integration

**File: `excel-addin/src/components/chat/EnhancedChatInterface.tsx`**

```typescript
// Add to the component
export const EnhancedChatInterface: React.FC<EnhancedChatInterfaceProps> = (props) => {
  const { sessionId } = useSession()
  const { 
    messages, 
    addMessage, 
    updateMessage, 
    clearMessages 
  } = usePersistedChat(sessionId)
  
  const [recentEdits, setRecentEdits] = React.useState<RecentEdit[]>([])
  
  // Initialize change tracking
  React.useEffect(() => {
    const tracker = ExcelChangeTracker.getInstance()
    tracker.initialize((changes) => {
      setRecentEdits(changes)
    })
  }, [])
  
  // Include recent edits in context
  const enhancedContext = React.useMemo(() => {
    return {
      ...props.activeContext,
      recentEdits: recentEdits.slice(0, 10) // Include last 10 edits
    }
  }, [props.activeContext, recentEdits])
  
  // ... rest of component
}
```

### Phase 3: Database Persistence & Advanced Features (Week 2)

#### 3.1 Database Schema for Chat Persistence

**File: `backend/migrations/003_chat_persistence.sql`**

```sql
-- Chat messages table
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(255) NOT NULL,
    user_id UUID,
    role VARCHAR(50) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_chat_messages_session (session_id),
    INDEX idx_chat_messages_created (created_at)
);

-- Session context snapshots
CREATE TABLE IF NOT EXISTS context_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(255) NOT NULL,
    message_id UUID REFERENCES chat_messages(id),
    financial_context JSONB NOT NULL,
    model_structure JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_context_snapshots_session (session_id),
    INDEX idx_context_snapshots_message (message_id)
);

-- Session metadata
CREATE TABLE IF NOT EXISTS chat_sessions (
    id VARCHAR(255) PRIMARY KEY,
    user_id UUID,
    workbook_name VARCHAR(255),
    worksheet_name VARCHAR(255),
    model_type VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB,
    
    INDEX idx_chat_sessions_user (user_id),
    INDEX idx_chat_sessions_updated (updated_at)
);
```

#### 3.2 Chat Repository Implementation

**File: `backend/internal/repository/chat_repository.go`**

```go
package repository

import (
    "context"
    "database/sql"
    "encoding/json"
    "time"
    
    "github.com/google/uuid"
    "github.com/gridmate/backend/internal/services/chat"
)

type ChatRepository struct {
    db *sql.DB
}

func NewChatRepository(db *sql.DB) *ChatRepository {
    return &ChatRepository{db: db}
}

// SaveMessage saves a chat message to the database
func (r *ChatRepository) SaveMessage(ctx context.Context, sessionID, role, content string, userID *uuid.UUID) error {
    query := `
        INSERT INTO chat_messages (session_id, user_id, role, content)
        VALUES ($1, $2, $3, $4)
    `
    
    _, err := r.db.ExecContext(ctx, query, sessionID, userID, role, content)
    return err
}

// SaveMessageBatch saves multiple messages efficiently
func (r *ChatRepository) SaveMessageBatch(ctx context.Context, messages []ChatMessage) error {
    tx, err := r.db.BeginTx(ctx, nil)
    if err != nil {
        return err
    }
    defer tx.Rollback()
    
    stmt, err := tx.PrepareContext(ctx, `
        INSERT INTO chat_messages (session_id, user_id, role, content, created_at)
        VALUES ($1, $2, $3, $4, $5)
    `)
    if err != nil {
        return err
    }
    defer stmt.Close()
    
    for _, msg := range messages {
        _, err = stmt.ExecContext(ctx, 
            msg.SessionID, 
            msg.UserID, 
            msg.Role, 
            msg.Content, 
            msg.Timestamp,
        )
        if err != nil {
            return err
        }
    }
    
    return tx.Commit()
}

// GetSessionMessages retrieves all messages for a session
func (r *ChatRepository) GetSessionMessages(ctx context.Context, sessionID string, limit int) ([]chat.Message, error) {
    query := `
        SELECT role, content, created_at 
        FROM chat_messages
        WHERE session_id = $1
        ORDER BY created_at ASC
        LIMIT $2
    `
    
    rows, err := r.db.QueryContext(ctx, query, sessionID, limit)
    if err != nil {
        return nil, err
    }
    defer rows.Close()
    
    var messages []chat.Message
    for rows.Next() {
        var msg chat.Message
        err := rows.Scan(&msg.Role, &msg.Content, &msg.Timestamp)
        if err != nil {
            return nil, err
        }
        messages = append(messages, msg)
    }
    
    return messages, rows.Err()
}

// SaveContextSnapshot saves a financial context snapshot
func (r *ChatRepository) SaveContextSnapshot(
    ctx context.Context, 
    sessionID string, 
    messageID *uuid.UUID,
    context interface{},
) error {
    contextJSON, err := json.Marshal(context)
    if err != nil {
        return err
    }
    
    query := `
        INSERT INTO context_snapshots (session_id, message_id, financial_context)
        VALUES ($1, $2, $3)
    `
    
    _, err = r.db.ExecContext(ctx, query, sessionID, messageID, contextJSON)
    return err
}

// GetLatestContext retrieves the most recent context for a session
func (r *ChatRepository) GetLatestContext(ctx context.Context, sessionID string) (json.RawMessage, error) {
    query := `
        SELECT financial_context
        FROM context_snapshots
        WHERE session_id = $1
        ORDER BY created_at DESC
        LIMIT 1
    `
    
    var contextJSON json.RawMessage
    err := r.db.QueryRowContext(ctx, query, sessionID).Scan(&contextJSON)
    if err == sql.ErrNoRows {
        return nil, nil
    }
    
    return contextJSON, err
}

// PruneOldMessages removes messages older than the retention period
func (r *ChatRepository) PruneOldMessages(ctx context.Context, retentionDays int) error {
    cutoff := time.Now().AddDate(0, 0, -retentionDays)
    
    query := `
        DELETE FROM chat_messages
        WHERE created_at < $1
    `
    
    _, err := r.db.ExecContext(ctx, query, cutoff)
    return err
}
```

#### 3.3 Enhanced Chat History with Database Support

**File: `backend/internal/services/chat/persistent_history.go`**

```go
package chat

import (
    "context"
    "sync"
    "time"
    
    "github.com/gridmate/backend/internal/repository"
)

// PersistentHistory extends History with database persistence
type PersistentHistory struct {
    *History
    repo         *repository.ChatRepository
    asyncWorker  *AsyncPersistenceWorker
}

// AsyncPersistenceWorker handles background persistence
type AsyncPersistenceWorker struct {
    repo       *repository.ChatRepository
    queue      chan PersistenceTask
    wg         sync.WaitGroup
    shutdownCh chan struct{}
}

type PersistenceTask struct {
    SessionID string
    Messages  []Message
}

// NewPersistentHistory creates a history manager with database backing
func NewPersistentHistory(repo *repository.ChatRepository) *PersistentHistory {
    worker := &AsyncPersistenceWorker{
        repo:       repo,
        queue:      make(chan PersistenceTask, 1000),
        shutdownCh: make(chan struct{}),
    }
    
    // Start background worker
    worker.Start()
    
    return &PersistentHistory{
        History:     NewHistory(),
        repo:        repo,
        asyncWorker: worker,
    }
}

// AddMessage adds a message and schedules async persistence
func (ph *PersistentHistory) AddMessage(sessionID, role, content string) {
    // Add to in-memory history first
    ph.History.AddMessage(sessionID, role, content)
    
    // Schedule async persistence
    ph.asyncWorker.Persist(sessionID, []Message{{
        Role:      role,
        Content:   content,
        Timestamp: time.Now(),
    }})
}

// LoadSession loads historical messages from database if not in memory
func (ph *PersistentHistory) LoadSession(ctx context.Context, sessionID string) error {
    // Check if already in memory
    if len(ph.GetHistory(sessionID)) > 0 {
        return nil
    }
    
    // Load from database
    messages, err := ph.repo.GetSessionMessages(ctx, sessionID, ph.maxSize)
    if err != nil {
        return err
    }
    
    // Populate memory cache
    ph.mu.Lock()
    defer ph.mu.Unlock()
    
    ph.sessions[sessionID] = messages
    
    return nil
}

// AsyncPersistenceWorker implementation
func (w *AsyncPersistenceWorker) Start() {
    w.wg.Add(1)
    go func() {
        defer w.wg.Done()
        
        batchTicker := time.NewTicker(5 * time.Second)
        defer batchTicker.Stop()
        
        batch := make(map[string][]Message)
        
        for {
            select {
            case task := <-w.queue:
                // Accumulate in batch
                batch[task.SessionID] = append(batch[task.SessionID], task.Messages...)
                
            case <-batchTicker.C:
                // Persist accumulated batch
                if len(batch) > 0 {
                    w.persistBatch(batch)
                    batch = make(map[string][]Message)
                }
                
            case <-w.shutdownCh:
                // Persist any remaining messages
                if len(batch) > 0 {
                    w.persistBatch(batch)
                }
                return
            }
        }
    }()
}

func (w *AsyncPersistenceWorker) persistBatch(batch map[string][]Message) {
    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()
    
    for sessionID, messages := range batch {
        // Convert to repository format
        chatMessages := make([]repository.ChatMessage, len(messages))
        for i, msg := range messages {
            chatMessages[i] = repository.ChatMessage{
                SessionID: sessionID,
                Role:      msg.Role,
                Content:   msg.Content,
                Timestamp: msg.Timestamp,
            }
        }
        
        if err := w.repo.SaveMessageBatch(ctx, chatMessages); err != nil {
            // Log error but don't fail - this is async
            // In production, implement retry logic
            continue
        }
    }
}

func (w *AsyncPersistenceWorker) Persist(sessionID string, messages []Message) {
    select {
    case w.queue <- PersistenceTask{SessionID: sessionID, Messages: messages}:
    default:
        // Queue full - log warning
        // In production, implement overflow handling
    }
}

func (w *AsyncPersistenceWorker) Shutdown() {
    close(w.shutdownCh)
    w.wg.Wait()
}
```

### Phase 4: Intelligent Context Management (Week 3)

#### 4.1 Smart Context Window Manager

**File: `backend/internal/services/ai/context_window.go`**

```go
package ai

import (
    "encoding/json"
    "fmt"
    "sort"
    "strings"
)

// ContextWindow manages token-aware context selection
type ContextWindow struct {
    maxTokens        int
    tokenCounter     TokenCounter
    priorityWeights  map[string]float64
}

// TokenCounter estimates token counts (implement with tiktoken or similar)
type TokenCounter interface {
    Count(text string) int
}

// ContextItem represents a piece of context with priority
type ContextItem struct {
    Type     string  // "cell_value", "formula", "history", "structure"
    Priority float64
    Content  string
    Tokens   int
}

// NewContextWindow creates a smart context window manager
func NewContextWindow(maxTokens int, counter TokenCounter) *ContextWindow {
    return &ContextWindow{
        maxTokens:    maxTokens,
        tokenCounter: counter,
        priorityWeights: map[string]float64{
            "system_prompt":    1.0,
            "recent_change":    0.9,
            "selected_cells":   0.85,
            "nearby_cells":     0.7,
            "formulas":         0.8,
            "model_structure":  0.6,
            "history_recent":   0.75,
            "history_older":    0.5,
            "named_ranges":     0.65,
        },
    }
}

// BuildOptimizedContext creates context that fits within token limits
func (cw *ContextWindow) BuildOptimizedContext(
    fc *FinancialContext,
    history []Message,
    userMessage string,
) (*OptimizedContext, error) {
    items := []ContextItem{}
    
    // 1. Always include user message (highest priority)
    userTokens := cw.tokenCounter.Count(userMessage)
    remainingTokens := cw.maxTokens - userTokens - 500 // Reserve for response
    
    // 2. Build prioritized context items
    
    // Recent changes (very high priority)
    for i, change := range fc.RecentChanges {
        if i >= 5 { // Limit recent changes
            break
        }
        content := fmt.Sprintf("Changed %s: %v → %v", 
            change.Address, change.OldValue, change.NewValue)
        items = append(items, ContextItem{
            Type:     "recent_change",
            Priority: cw.priorityWeights["recent_change"] * (1.0 - float64(i)*0.1),
            Content:  content,
            Tokens:   cw.tokenCounter.Count(content),
        })
    }
    
    // Selected cells
    if fc.SelectedRange != "" {
        selectedCells := cw.buildCellContext(fc, fc.SelectedRange, "selected_cells")
        items = append(items, selectedCells...)
    }
    
    // Formulas in selection
    formulas := cw.buildFormulaContext(fc)
    items = append(items, formulas...)
    
    // Model structure (if complex model)
    if fc.ModelStructure != nil && fc.ModelType != "General" {
        structureContent := cw.buildStructureContext(fc.ModelStructure)
        items = append(items, ContextItem{
            Type:     "model_structure",
            Priority: cw.priorityWeights["model_structure"],
            Content:  structureContent,
            Tokens:   cw.tokenCounter.Count(structureContent),
        })
    }
    
    // Recent conversation history
    historyItems := cw.buildHistoryContext(history)
    items = append(items, historyItems...)
    
    // 3. Sort by priority and select items that fit
    sort.Slice(items, func(i, j int) bool {
        return items[i].Priority > items[j].Priority
    })
    
    selected := []ContextItem{}
    currentTokens := 0
    
    for _, item := range items {
        if currentTokens + item.Tokens <= remainingTokens {
            selected = append(selected, item)
            currentTokens += item.Tokens
        }
    }
    
    // 4. Build final context
    return cw.assembleContext(selected, fc), nil
}

// buildCellContext creates context items for cell values
func (cw *ContextWindow) buildCellContext(fc *FinancialContext, rangeStr string, contextType string) []ContextItem {
    items := []ContextItem{}
    
    // Group cells by proximity for better context
    cellGroups := cw.groupCellsByProximity(fc.CellValues, rangeStr)
    
    for _, group := range cellGroups {
        content := cw.formatCellGroup(group)
        items = append(items, ContextItem{
            Type:     contextType,
            Priority: cw.priorityWeights[contextType],
            Content:  content,
            Tokens:   cw.tokenCounter.Count(content),
        })
    }
    
    return items
}

// buildHistoryContext creates context items from conversation history
func (cw *ContextWindow) buildHistoryContext(history []Message) []ContextItem {
    items := []ContextItem{}
    
    // Recent messages get higher priority
    for i := len(history) - 1; i >= 0 && i >= len(history)-10; i-- {
        msg := history[i]
        recency := float64(i) / float64(len(history))
        
        priority := cw.priorityWeights["history_recent"]
        if recency < 0.5 {
            priority = cw.priorityWeights["history_older"]
        }
        
        content := fmt.Sprintf("%s: %s", msg.Role, msg.Content)
        items = append(items, ContextItem{
            Type:     "history",
            Priority: priority * recency,
            Content:  content,
            Tokens:   cw.tokenCounter.Count(content),
        })
    }
    
    return items
}

// OptimizedContext represents the final optimized context
type OptimizedContext struct {
    SystemPrompt  string
    ContextBlocks []string
    TokensUsed    int
    ItemsIncluded map[string]int
}
```

#### 4.2 Incremental Context Updates

**File: `backend/internal/services/excel/incremental_updates.go`**

```go
package excel

import (
    "context"
    "fmt"
    "sync"
    "time"
    
    "github.com/gridmate/backend/internal/services/ai"
)

// IncrementalContextManager efficiently updates context with changes
type IncrementalContextManager struct {
    contextBuilder *ContextBuilder
    contextCache   map[string]*CachedContext
    cacheMutex     sync.RWMutex
    changeBuffer   *ChangeBuffer
}

// CachedContext stores context with metadata
type CachedContext struct {
    Context      *ai.FinancialContext
    LastUpdated  time.Time
    Version      int
    ChangeCount  int
}

// ChangeBuffer accumulates changes for batch processing
type ChangeBuffer struct {
    changes      []CellChange
    mu           sync.Mutex
    flushTimer   *time.Timer
    flushHandler func([]CellChange)
}

// NewIncrementalContextManager creates an incremental context manager
func NewIncrementalContextManager(cb *ContextBuilder) *IncrementalContextManager {
    mgr := &IncrementalContextManager{
        contextBuilder: cb,
        contextCache:   make(map[string]*CachedContext),
        changeBuffer:   NewChangeBuffer(100*time.Millisecond),
    }
    
    mgr.changeBuffer.flushHandler = mgr.processChangeBatch
    
    return mgr
}

// GetOrUpdateContext returns current context, updating incrementally if needed
func (mgr *IncrementalContextManager) GetOrUpdateContext(
    ctx context.Context,
    sessionID string,
    forceRefresh bool,
) (*ai.FinancialContext, error) {
    mgr.cacheMutex.RLock()
    cached, exists := mgr.contextCache[sessionID]
    mgr.cacheMutex.RUnlock()
    
    // If no cache or force refresh, build from scratch
    if !exists || forceRefresh || time.Since(cached.LastUpdated) > 5*time.Minute {
        return mgr.buildFreshContext(ctx, sessionID)
    }
    
    // If we have pending changes, apply them incrementally
    pendingChanges := mgr.changeBuffer.GetPending(sessionID)
    if len(pendingChanges) == 0 {
        return cached.Context, nil
    }
    
    // Apply incremental updates
    updatedContext, err := mgr.applyIncrementalUpdates(
        ctx, 
        sessionID, 
        cached.Context, 
        pendingChanges,
    )
    if err != nil {
        // Fall back to fresh build on error
        return mgr.buildFreshContext(ctx, sessionID)
    }
    
    // Update cache
    mgr.cacheMutex.Lock()
    mgr.contextCache[sessionID] = &CachedContext{
        Context:     updatedContext,
        LastUpdated: time.Now(),
        Version:     cached.Version + 1,
        ChangeCount: cached.ChangeCount + len(pendingChanges),
    }
    mgr.cacheMutex.Unlock()
    
    return updatedContext, nil
}

// applyIncrementalUpdates efficiently updates context with changes
func (mgr *IncrementalContextManager) applyIncrementalUpdates(
    ctx context.Context,
    sessionID string,
    baseContext *ai.FinancialContext,
    changes []CellChange,
) (*ai.FinancialContext, error) {
    // Clone the base context
    updated := mgr.cloneContext(baseContext)
    
    // Group changes by type for efficient processing
    valueChanges := []string{}
    formulaChanges := []string{}
    
    for _, change := range changes {
        if change.Type == "value" {
            valueChanges = append(valueChanges, change.Address)
        } else if change.Type == "formula" {
            formulaChanges = append(formulaChanges, change.Address)
        }
    }
    
    // Batch read changed cells
    if len(valueChanges) > 0 {
        mgr.updateCellValues(ctx, sessionID, updated, valueChanges)
    }
    
    if len(formulaChanges) > 0 {
        mgr.updateFormulas(ctx, sessionID, updated, formulaChanges)
    }
    
    // Update recent changes list
    mgr.updateRecentChanges(updated, changes)
    
    // Re-analyze if significant changes
    if mgr.requiresReanalysis(changes) {
        mgr.reanalyzeStructure(ctx, sessionID, updated)
    }
    
    return updated, nil
}

// TrackChange records a cell change for incremental updates
func (mgr *IncrementalContextManager) TrackChange(sessionID string, change CellChange) {
    mgr.changeBuffer.Add(sessionID, change)
}

// ChangeBuffer implementation
func NewChangeBuffer(flushInterval time.Duration) *ChangeBuffer {
    return &ChangeBuffer{
        changes: make([]CellChange, 0),
    }
}

func (cb *ChangeBuffer) Add(sessionID string, change CellChange) {
    cb.mu.Lock()
    defer cb.mu.Unlock()
    
    cb.changes = append(cb.changes, change)
    
    // Reset flush timer
    if cb.flushTimer != nil {
        cb.flushTimer.Stop()
    }
    
    cb.flushTimer = time.AfterFunc(100*time.Millisecond, func() {
        cb.Flush()
    })
}

func (cb *ChangeBuffer) GetPending(sessionID string) []CellChange {
    cb.mu.Lock()
    defer cb.mu.Unlock()
    
    // Filter changes for session
    pending := []CellChange{}
    remaining := []CellChange{}
    
    for _, change := range cb.changes {
        if change.SessionID == sessionID {
            pending = append(pending, change)
        } else {
            remaining = append(remaining, change)
        }
    }
    
    cb.changes = remaining
    return pending
}

func (cb *ChangeBuffer) Flush() {
    cb.mu.Lock()
    changes := cb.changes
    cb.changes = make([]CellChange, 0)
    cb.mu.Unlock()
    
    if cb.flushHandler != nil && len(changes) > 0 {
        cb.flushHandler(changes)
    }
}

// CellChange represents a change to track
type CellChange struct {
    SessionID string
    Address   string
    Type      string // "value", "formula", "format"
    OldValue  interface{}
    NewValue  interface{}
    Timestamp time.Time
    Source    string // "user", "ai"
}
```

### Phase 5: Testing & Monitoring (Week 4)

#### 5.1 Context Memory Tests

**File: `backend/internal/services/ai/context_memory_test.go`**

```go
package ai_test

import (
    "context"
    "testing"
    "time"
    
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"
)

func TestContextMemoryPersistence(t *testing.T) {
    // Test that context is properly maintained across messages
    service := setupTestService(t)
    sessionID := "test-session-123"
    
    // First message with context
    context1 := &FinancialContext{
        SelectedRange: "A1:B10",
        CellValues: map[string]interface{}{
            "A1": "Revenue",
            "B1": 1000000,
        },
    }
    
    resp1, err := service.ProcessChatWithToolsAndHistory(
        context.Background(),
        sessionID,
        "What is the revenue?",
        context1,
        []Message{},
        "ask",
    )
    require.NoError(t, err)
    assert.Contains(t, resp1.Content, "1000000")
    
    // Second message - should remember context
    context2 := &FinancialContext{
        SelectedRange: "A1:B10",
        CellValues: map[string]interface{}{
            "A1": "Revenue",
            "B1": 1500000, // Changed value
        },
    }
    
    history := []Message{
        {Role: "user", Content: "What is the revenue?"},
        {Role: "assistant", Content: resp1.Content},
    }
    
    resp2, err := service.ProcessChatWithToolsAndHistory(
        context.Background(),
        sessionID,
        "How much did it increase?",
        context2,
        history,
        "ask",
    )
    require.NoError(t, err)
    
    // Should reference both old and new values
    assert.Contains(t, resp2.Content, "500000")
    assert.Contains(t, resp2.Content, "increase")
}

func TestFirstMessageContextInclusion(t *testing.T) {
    // Test that first message includes both system prompt and context
    service := setupTestService(t)
    
    context := &FinancialContext{
        WorksheetName: "Financial Model",
        ModelType:     "DCF",
        CellValues: map[string]interface{}{
            "A1": "WACC",
            "B1": 0.10,
        },
    }
    
    // Intercept the actual request sent to AI provider
    var capturedRequest *CompletionRequest
    service.provider = &mockProvider{
        onGetCompletion: func(ctx context.Context, req CompletionRequest) (*CompletionResponse, error) {
            capturedRequest = &req
            return &CompletionResponse{Content: "Test response"}, nil
        },
    }
    
    _, err := service.ProcessChatMessage(
        context.Background(),
        "What is the WACC?",
        context,
    )
    require.NoError(t, err)
    
    // Verify system message includes both prompt and context
    require.Len(t, capturedRequest.Messages, 2)
    assert.Equal(t, "system", capturedRequest.Messages[0].Role)
    assert.Contains(t, capturedRequest.Messages[0].Content, "financial modeling")
    assert.Contains(t, capturedRequest.Messages[0].Content, "Current Context")
    assert.Contains(t, capturedRequest.Messages[0].Content, "DCF")
    assert.Contains(t, capturedRequest.Messages[0].Content, "WACC")
}

func TestIncrementalContextUpdates(t *testing.T) {
    // Test that context updates incrementally with changes
    mgr := NewIncrementalContextManager(NewContextBuilder(mockBridge))
    sessionID := "test-session"
    
    // Initial context
    ctx1, err := mgr.GetOrUpdateContext(context.Background(), sessionID, true)
    require.NoError(t, err)
    initialCellCount := len(ctx1.CellValues)
    
    // Track some changes
    mgr.TrackChange(sessionID, CellChange{
        SessionID: sessionID,
        Address:   "C1",
        Type:      "value",
        NewValue:  2000000,
        Timestamp: time.Now(),
    })
    
    // Wait for buffer flush
    time.Sleep(150 * time.Millisecond)
    
    // Get updated context
    ctx2, err := mgr.GetOrUpdateContext(context.Background(), sessionID, false)
    require.NoError(t, err)
    
    // Should have the new cell
    assert.Equal(t, initialCellCount+1, len(ctx2.CellValues))
    assert.Equal(t, 2000000, ctx2.CellValues["C1"])
    
    // Should have recent change
    assert.Len(t, ctx2.RecentChanges, 1)
    assert.Equal(t, "C1", ctx2.RecentChanges[0].Address)
}
```

#### 5.2 Performance Monitoring

**File: `backend/internal/monitoring/context_metrics.go`**

```go
package monitoring

import (
    "time"
    
    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/promauto"
)

var (
    contextBuildDuration = promauto.NewHistogramVec(
        prometheus.HistogramOpts{
            Name: "gridmate_context_build_duration_seconds",
            Help: "Time taken to build financial context",
            Buckets: []float64{0.01, 0.05, 0.1, 0.5, 1.0, 2.0, 5.0},
        },
        []string{"type"}, // "full", "incremental"
    )
    
    contextSizeBytes = promauto.NewHistogramVec(
        prometheus.HistogramOpts{
            Name: "gridmate_context_size_bytes",
            Help: "Size of financial context in bytes",
            Buckets: []float64{1000, 5000, 10000, 50000, 100000, 500000},
        },
        []string{"session_type"},
    )
    
    memoryOperations = promauto.NewCounterVec(
        prometheus.CounterOpts{
            Name: "gridmate_memory_operations_total",
            Help: "Total number of memory operations",
        },
        []string{"operation", "status"}, // "save", "load", "success", "error"
    )
    
    tokenUsage = promauto.NewHistogramVec(
        prometheus.HistogramOpts{
            Name: "gridmate_context_tokens",
            Help: "Number of tokens in context",
            Buckets: []float64{100, 500, 1000, 2000, 4000, 8000, 16000},
        },
        []string{"component"}, // "history", "cells", "formulas", "structure"
    )
)

// TrackContextBuild records context building metrics
func TrackContextBuild(contextType string, duration time.Duration, sizeBytes int) {
    contextBuildDuration.WithLabelValues(contextType).Observe(duration.Seconds())
    contextSizeBytes.WithLabelValues(contextType).Observe(float64(sizeBytes))
}

// TrackMemoryOperation records memory operation metrics
func TrackMemoryOperation(operation string, err error) {
    status := "success"
    if err != nil {
        status = "error"
    }
    memoryOperations.WithLabelValues(operation, status).Inc()
}

// TrackTokenUsage records token usage by component
func TrackTokenUsage(component string, tokens int) {
    tokenUsage.WithLabelValues(component).Observe(float64(tokens))
}
```

## Migration Strategy

### Step 1: Deploy Phase 1 Fixes
1. Test system message merging in staging
2. Verify first message context inclusion
3. Monitor token usage and response quality

### Step 2: Gradual Frontend Rollout
1. Enable localStorage persistence for beta users
2. Monitor storage quotas and performance
3. Implement cleanup strategies

### Step 3: Database Integration
1. Deploy schema changes
2. Enable async persistence for new sessions
3. Backfill historical data if needed

### Step 4: Advanced Features
1. Enable incremental updates for power users
2. A/B test smart context selection
3. Monitor performance and adjust thresholds

## Success Metrics

1. **Context Completeness**: 100% of messages include current spreadsheet state
2. **Memory Persistence**: 95%+ of conversations maintain full history
3. **Performance**: Context building < 200ms for 90% of requests
4. **Token Efficiency**: 30% reduction in prompt tokens via smart selection
5. **User Satisfaction**: 50% reduction in "AI forgot context" complaints

## Risk Mitigation

1. **Token Limits**: Implement aggressive pruning for long conversations
2. **Storage Quotas**: Regular cleanup of old sessions
3. **Performance**: Cache warming and incremental updates
4. **Privacy**: Ensure no PII in logs or metrics
5. **Backwards Compatibility**: Graceful fallbacks for older clients

This comprehensive plan addresses all identified issues while leveraging Gridmate's existing strengths to create a best-in-class context and memory system for financial modeling AI assistance.