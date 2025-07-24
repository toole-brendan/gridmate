package services

import (
	"context"
	"fmt"
	"math"
	"strings"
	"sync"
	"time"

	"github.com/gridmate/backend/internal/memory"
	"github.com/gridmate/backend/internal/models"
	"github.com/gridmate/backend/internal/services/ai"
	"github.com/gridmate/backend/internal/services/chat"
	"github.com/gridmate/backend/internal/services/excel"
	"github.com/gridmate/backend/internal/services/formula"
	"github.com/sirupsen/logrus"
)

// ExcelBridge implements the Excel integration service
type ExcelBridge struct {
	logger *logrus.Logger

	// Cache for spreadsheet data
	cellCache  map[string]interface{}
	rangeCache map[string][][]interface{}
	cacheMutex sync.RWMutex

	// AI service for chat processing
	aiService       *ai.Service
	toolExecutor    *ai.ToolExecutor
	contextBuilder  *excel.ContextBuilder
	excelBridgeImpl *excel.BridgeImpl // Excel bridge implementation for tool execution

	// Active sessions
	sessions     map[string]*ExcelSession
	sessionMutex sync.RWMutex

	// SignalR bridge for SignalR clients
	signalRBridge interface{} // Will be set by main.go

	// Session manager for centralized session management
	sessionManager *SessionManager

	// Chat history management
	chatHistory *chat.History

	// Queued operations registry
	queuedOpsRegistry *QueuedOperationRegistry

	// Request ID mapper for tool execution
	requestIDMapper *RequestIDMapper

	// Indexing service for vector memory
	indexingService interface{} // Will be set by main.go
}

// ExcelSession represents an active Excel session
type ExcelSession struct {
	ID           string
	UserID       string
	ClientID     string // SignalR client ID for routing messages
	ActiveSheet  string
	Selection    SelectionChanged
	Context      map[string]interface{}
	LastActivity time.Time
	CreatedAt    time.Time
	LastRefresh  time.Time
	
	// Memory support
	MemoryStore  *memory.VectorStore `json:"-"` // Don't serialize
	MemoryStats  *MemoryStats        // Statistics for UI
}

// MemoryStats contains memory statistics for the session
type MemoryStats struct {
	TotalChunks       int
	SpreadsheetChunks int
	DocumentChunks    int
	ChatChunks        int
	LastIndexed       time.Time
	IndexVersion      string
}

// NewExcelBridge creates a new Excel bridge service
func NewExcelBridge(logger *logrus.Logger, aiService *ai.Service) *ExcelBridge {
	// Create request ID mapper
	requestIDMapper := NewRequestIDMapper()

	bridge := &ExcelBridge{
		logger:            logger,
		cellCache:         make(map[string]interface{}),
		rangeCache:        make(map[string][][]interface{}),
		aiService:         aiService,
		sessions:          make(map[string]*ExcelSession),
		chatHistory:       chat.NewHistory(),
		queuedOpsRegistry: NewQueuedOperationRegistry(),
		requestIDMapper:   requestIDMapper,
	}

	// Create Excel bridge implementation for tool executor
	excelBridgeImpl := excel.NewBridgeImpl()
	bridge.excelBridgeImpl = excelBridgeImpl

	// Set the request ID mapper on the bridge implementation
	excelBridgeImpl.SetRequestIDMapper(requestIDMapper)

	// Set client ID resolver
	excelBridgeImpl.SetClientIDResolver(func(sessionID string) string {
		bridge.sessionMutex.RLock()
		defer bridge.sessionMutex.RUnlock()

		logger.WithFields(logrus.Fields{
			"session_id":     sessionID,
			"total_sessions": len(bridge.sessions),
		}).Debug("Client ID resolver called")

		// Log all available sessions for debugging
		for sessID, sess := range bridge.sessions {
			logger.WithFields(logrus.Fields{
				"available_session_id": sessID,
				"client_id":            sess.ClientID,
				"user_id":              sess.UserID,
			}).Debug("Available session in resolver")
		}

		if session, ok := bridge.sessions[sessionID]; ok {
			logger.WithFields(logrus.Fields{
				"session_id": sessionID,
				"client_id":  session.ClientID,
				"user_id":    session.UserID,
			}).Info("Client ID resolver found session")
			return session.ClientID
		}

		logger.WithFields(logrus.Fields{
			"session_id": sessionID,
		}).Warn("Client ID resolver: session not found")
		return ""
	})

	// Create formula validator
	formulaValidator := formula.NewFormulaIntelligence(logger)

	// Create tool executor with formula validation
	bridge.toolExecutor = ai.NewToolExecutor(excelBridgeImpl, formulaValidator)

	// Create context builder
	bridge.contextBuilder = excel.NewContextBuilder(excelBridgeImpl)

	// Set the queued operations registry on the tool executor
	bridge.toolExecutor.SetQueuedOperationRegistry(bridge.queuedOpsRegistry)

	// Set tool executor in AI service
	if aiService != nil {
		aiService.SetToolExecutor(bridge.toolExecutor)
		aiService.SetContextBuilder(bridge.contextBuilder)
		aiService.SetQueuedOperationRegistry(bridge.queuedOpsRegistry)
		logger.Info("Tool executor, context builder, and queued ops registry set in AI service")
	} else {
		logger.Warn("AI service is nil, cannot set tool executor")
	}

	// Start session cleanup routine
	go bridge.cleanupSessions()

	return bridge
}

// SetAIService sets the AI service for chat processing
func (eb *ExcelBridge) SetAIService(aiService *ai.Service) {
	eb.aiService = aiService
}

// GetToolExecutor returns the tool executor for transferring to main AI service
func (eb *ExcelBridge) GetToolExecutor() *ai.ToolExecutor {
	return eb.toolExecutor
}

// GetContextBuilder returns the context builder for transferring to main AI service
func (eb *ExcelBridge) GetContextBuilder() *excel.ContextBuilder {
	return eb.contextBuilder
}

// CreateSignalRSession creates a session for SignalR clients
func (eb *ExcelBridge) CreateSignalRSession(sessionID string) {
	eb.sessionMutex.Lock()
	defer eb.sessionMutex.Unlock()

	if _, exists := eb.sessions[sessionID]; !exists {
		now := time.Now()
		
		// Initialize with memory store
		var memStore memory.VectorStore = memory.NewHybridVectorStore(
			memory.WithInMemoryCache(10000), // 10k chunks max
			memory.WithDiskPersistence(fmt.Sprintf("./data/sessions/%s.db", sessionID)),
			memory.WithAutoSave(5 * time.Minute),
		)
		
		eb.sessions[sessionID] = &ExcelSession{
			ID:           sessionID,
			UserID:       "signalr-user",
			ClientID:     sessionID, // Use session ID as client ID for SignalR
			ActiveSheet:  "Sheet1",
			Context:      make(map[string]interface{}),
			LastActivity: now,
			CreatedAt:    now,
			MemoryStore:  &memStore,
			MemoryStats:  &MemoryStats{IndexVersion: "1.0"},
		}
		
		// Start background indexing of initial workbook state
		go eb.indexInitialWorkbook(sessionID)

		// Register with centralized session manager
		if eb.sessionManager != nil {
			eb.sessionManager.RegisterSession(&SessionInfo{
				ID:           sessionID,
				Type:         SessionTypeSignalR,
				UserID:       "signalr-user",
				CreatedAt:    now,
				LastActivity: now,
				Metadata: map[string]interface{}{
					"active_sheet": "Sheet1",
					"client_id":    sessionID,
				},
			})
		}

		eb.logger.WithFields(logrus.Fields{
			"session_id": sessionID,
		}).Info("Created SignalR session")
	}
}

// UpdateSignalRSessionSelection updates the selection for a SignalR session
func (eb *ExcelBridge) UpdateSignalRSessionSelection(sessionID, selection, worksheet string) {
	eb.sessionMutex.Lock()
	defer eb.sessionMutex.Unlock()

	if session, exists := eb.sessions[sessionID]; exists {
		session.Selection = SelectionChanged{
			SelectedRange: selection,
			SelectedCell:  "", // Not provided in SignalR update
		}
		session.ActiveSheet = worksheet
		session.LastActivity = time.Now()

		// Update activity in centralized session manager
		if eb.sessionManager != nil {
			eb.sessionManager.UpdateActivity(sessionID)
		}

		eb.logger.WithFields(logrus.Fields{
			"session_id": sessionID,
			"selection":  selection,
			"worksheet":  worksheet,
		}).Debug("Updated SignalR session selection")
	}
}

// SetSessionManager sets the session manager for centralized session management
func (eb *ExcelBridge) SetSessionManager(manager *SessionManager) {
	eb.sessionManager = manager
}

// SetSignalRBridge sets the SignalR bridge for forwarding messages
func (eb *ExcelBridge) SetSignalRBridge(bridge interface{}) {
	eb.signalRBridge = bridge
	// Also set it on the excel bridge implementation
	if eb.excelBridgeImpl != nil {
		eb.excelBridgeImpl.SetSignalRBridge(bridge)
	}
}

// SetIndexingService sets the indexing service instance
func (eb *ExcelBridge) SetIndexingService(service interface{}) {
	eb.indexingService = service
}

// GetBridgeImpl returns the Excel bridge implementation
func (eb *ExcelBridge) GetBridgeImpl() *excel.BridgeImpl {
	return eb.excelBridgeImpl
}

// GetQueuedOperationRegistry returns the queued operation registry
func (eb *ExcelBridge) GetQueuedOperationRegistry() *QueuedOperationRegistry {
	return eb.queuedOpsRegistry
}

// isWriteTool checks if a tool name represents a write operation
func isWriteTool(toolName string) bool {
	writeTools := []string{
		"write_cell", "write_range", "write_formula",
		"write_multiple_cells", "create_chart", "format_cells",
		"insert_rows", "insert_columns", "delete_rows", "delete_columns",
	}
	for _, wt := range writeTools {
		if toolName == wt {
			return true
		}
	}
	return false
}

// hasRecentUserSelection checks if the user has made a recent selection
// (within the last 5 seconds) to avoid overriding user intent
func hasRecentUserSelection(session *ExcelSession) bool {
	// Check if there's a timestamp for the last user selection in context
	if session.Context != nil {
		if lastSelectionTime, ok := session.Context["lastUserSelectionTime"].(string); ok {
			if ts, err := time.Parse(time.RFC3339, lastSelectionTime); err == nil {
				// Consider selection recent if within 5 seconds
				return time.Since(ts) < 5*time.Second
			}
		}
	}
	// If no timestamp found, assume no recent selection
	return false
}

// trackMessage logs message tracking information
func (eb *ExcelBridge) trackMessage(message ChatMessage) {
	eb.logger.WithFields(logrus.Fields{
		"session_id":     message.SessionID,
		"content_length": len(message.Content),
		"autonomy_mode":  message.AutonomyMode,
		"has_context":    message.Context != nil,
		"message_id":     message.MessageID,
	}).Info("Processing chat message")
}

// ProcessChatMessage processes a chat message from a client
func (eb *ExcelBridge) ProcessChatMessage(clientID string, message ChatMessage) (*ChatResponse, error) {
	// Track message
	eb.trackMessage(message)

	// Get or create session
	session := eb.getOrCreateSession(clientID, message.SessionID)
	
	// Build comprehensive context BEFORE adding message to history
	var financialContext *ai.FinancialContext
	var msgContext map[string]interface{}
	
	if eb.contextBuilder != nil {
		ctx := context.Background()
		builtContext, err := eb.contextBuilder.BuildContext(ctx, session.ID)
		if err != nil {
			eb.logger.WithError(err).Warn("Failed to build comprehensive context")
			// Fallback to basic context
			msgContext = eb.buildContext(session, message.Context)
			financialContext = eb.buildFinancialContext(session, msgContext)
		} else {
			financialContext = builtContext
			// Merge any additional context from the message
			eb.mergeMessageContext(financialContext, message.Context)
			// Also build msgContext for later use
			msgContext = eb.buildContext(session, message.Context)
		}
	} else {
		// Fallback to basic context building
		msgContext = eb.buildContext(session, message.Context)
		financialContext = eb.buildFinancialContext(session, msgContext)
	}

	// Add any pending operations to the context
	if pendingOps := eb.queuedOpsRegistry.GetPendingOperations(session.ID); len(pendingOps) > 0 {
		financialContext.PendingOperations = pendingOps
		eb.logger.WithFields(logrus.Fields{
			"count":           len(pendingOps),
			"session_id":      session.ID,
			"has_pending_ops": financialContext.PendingOperations != nil,
		}).Debug("Added pending operations to initial context")
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

	// Process with AI if available
	var content string
	var suggestions []string
	var actions []ProposedAction
	var aiResponse *ai.CompletionResponse // Track AI response for IsFinal flag

	if eb.aiService != nil {
		eb.logger.Info("AI service is available, processing message")

		// Process chat message with AI and history
		ctx := context.Background()
		// Add message ID to context if available
		if message.MessageID != "" {
			ctx = context.WithValue(ctx, "message_id", message.MessageID)
		}

		// Log the financial context being sent to AI
		eb.logger.WithFields(logrus.Fields{
			"session_id":        session.ID,
			"selected_range":    financialContext.SelectedRange,
			"worksheet":         financialContext.WorksheetName,
			"model_type":        financialContext.ModelType,
			"cell_values_count": len(financialContext.CellValues),
			"formulas_count":    len(financialContext.Formulas),
		}).Debug("AI context summary")

		// Log sample of cell values to see what AI receives
		if len(financialContext.CellValues) > 0 {
			sample := make(map[string]interface{})
			count := 0
			for k, v := range financialContext.CellValues {
				sample[k] = v
				count++
				if count >= 5 {
					break
				}
			}
			eb.logger.WithField("cell_values_sample", sample).Debug("AI context cell values sample")
		}

		eb.logger.Info("Calling ProcessChatWithToolsAndHistory for session", "session_id", session.ID, "history_length", len(aiHistory), "autonomy_mode", message.AutonomyMode)
		
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
		
		if err != nil {
			eb.logger.WithError(err).Error("AI processing failed")
			content = "I encountered an error processing your request. Please try again."
		} else {
			content = aiResponse.Content

			// Track AI-edited ranges for context expansion
			if len(aiResponse.ToolCalls) > 0 {
				var editedRanges []string
				for _, toolCall := range aiResponse.ToolCalls {
					// Check if this is a write operation
					if isWriteTool(toolCall.Name) {
						// Extract range from tool input
						if rangeVal, ok := toolCall.Input["range"]; ok {
							if rangeStr, ok := rangeVal.(string); ok {
								editedRanges = append(editedRanges, rangeStr)

								// Add to recent edits in session context
								if session.Context == nil {
									session.Context = make(map[string]interface{})
								}

								// Initialize or get recent edits array
								var recentEdits []interface{}
								if re, ok := session.Context["recentEdits"].([]interface{}); ok {
									recentEdits = re
								} else {
									recentEdits = make([]interface{}, 0)
								}

								// Create edit entry
								editEntry := map[string]interface{}{
									"range":     rangeStr,
									"timestamp": time.Now().Format(time.RFC3339),
									"source":    "ai",
									"tool":      toolCall.Name,
								}

								// Note: Rich edit tracking (old/new values) is handled
								// by the tool executor and passed through to the Excel client
								// which can capture the values during the actual write operation

								recentEdits = append(recentEdits, editEntry)

								// Keep only last 10 edits
								if len(recentEdits) > 10 {
									recentEdits = recentEdits[len(recentEdits)-10:]
								}

								session.Context["recentEdits"] = recentEdits

								eb.logger.WithFields(logrus.Fields{
									"session_id": session.ID,
									"tool":       toolCall.Name,
									"range":      rangeStr,
								}).Debug("Tracked AI edit for context expansion")
							}
						}
					}
				}

				// If we had write operations and no new user selection,
				// update session selection to the union of all edited ranges
				if len(editedRanges) > 0 && !hasRecentUserSelection(session) {
					mergedRange := eb.mergeRanges(editedRanges)
					session.Selection.SelectedRange = mergedRange
					eb.logger.WithFields(logrus.Fields{
						"session_id":    session.ID,
						"edited_ranges": editedRanges,
						"merged_range":  mergedRange,
					}).Info("Updated session selection to union of AI-edited ranges for context expansion")
				}
			}

			// Convert AI actions to websocket actions
			actions = eb.convertAIActions(aiResponse.Actions)

			// Only detect additional actions if no tools were used
			if len(aiResponse.ToolCalls) == 0 {
				if additionalActions := eb.detectRequestedActions(message.Content, msgContext); len(additionalActions) > 0 {
					actions = append(actions, additionalActions...)
				}
			}
		}
	} else {
		// Fallback response when AI service is not available
		content = eb.generateFallbackResponse(message.Content, msgContext)
		suggestions = eb.generateFallbackSuggestions(msgContext)

		// Detect actions from message when AI is not available
		if additionalActions := eb.detectRequestedActions(message.Content, msgContext); len(additionalActions) > 0 {
			actions = additionalActions
		}
	}

	// Determine if response is final (based on AI response if available)
	isFinal := false
	if aiResponse != nil && aiResponse.IsFinal {
		isFinal = true
	}

	response := &ChatResponse{
		Content:     content,
		Suggestions: suggestions,
		Actions:     actions,
		SessionID:   session.ID,
		IsFinal:     isFinal,
	}

	// Add token usage if available from AI response
	if aiResponse != nil && aiResponse.Usage.TotalTokens > 0 {
		response.TokenUsage = &TokenUsage{
			Input:  aiResponse.Usage.PromptTokens,
			Output: aiResponse.Usage.CompletionTokens,
			Total:  aiResponse.Usage.TotalTokens, // Fixed: use TotalTokens for cumulative usage
			Max:    200000, // Claude 3.5's context window
		}
		
		// Log token usage for debugging
		eb.logger.WithFields(logrus.Fields{
			"input":  response.TokenUsage.Input,
			"output": response.TokenUsage.Output,
			"total":  response.TokenUsage.Total,
		}).Info("Sending token usage")
	}

	// Update session activity
	session.LastActivity = time.Now()

	// Index chat messages to vector memory if available
	if session.MemoryStore != nil && eb.indexingService != nil && response.Content != "" {
		go eb.indexChatExchange(session.ID, message.Content, response.Content, len(aiHistory)/2)
	}

	return response, nil
}

// ProcessChatMessageStreaming processes a chat message with streaming response
func (eb *ExcelBridge) ProcessChatMessageStreaming(ctx context.Context, clientID string, message ChatMessage) (<-chan ai.CompletionChunk, error) {
	session := eb.getOrCreateSession(clientID, message.SessionID)
	
	// Build financial context from Excel state
	financialContext := &ai.FinancialContext{
		CellValues:        make(map[string]interface{}),
		NamedRanges:       make(map[string]ai.NamedRangeInfo),
		Formulas:          make(map[string]string),
		WorkbookName:      "",
		WorksheetName:     "",
		SelectedRange:     "",
		ModelType:         "",
		RecentChanges:     []ai.CellChange{},
		DocumentContext:   []string{},
	}
	
	// Populate context from message or session
	if message.Context != nil {
		// Extract relevant data from message context
		if worksheetName, ok := message.Context["worksheet"].(string); ok {
			financialContext.WorksheetName = worksheetName
		}
		if workbookName, ok := message.Context["workbook"].(string); ok {
			financialContext.WorkbookName = workbookName
		}
		if selectedRange, ok := message.Context["selectedRange"].(string); ok {
			financialContext.SelectedRange = selectedRange
		}
		if modelType, ok := message.Context["modelType"].(string); ok {
			financialContext.ModelType = modelType
		}
		// Extract cell values if available
		if cellData, ok := message.Context["cells"].(map[string]interface{}); ok {
			financialContext.CellValues = cellData
		}
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
	
	eb.logger.WithFields(logrus.Fields{
		"session_id": session.ID,
		"history_length": len(aiHistory),
		"autonomy_mode": message.AutonomyMode,
	}).Info("Starting streaming chat processing")
	
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
	
	// Create a new channel to forward chunks with proper buffering
	outChan := make(chan ai.CompletionChunk, 1) // Smaller buffer to ensure streaming
	
	go func() {
		defer close(outChan)
		
		var fullContent strings.Builder
		
		for chunk := range chunks {
			// Forward the chunk immediately
			select {
			case outChan <- chunk:
				// Successfully sent
			case <-ctx.Done():
				// Context cancelled
				return
			}
			
			// Accumulate content for history
			if chunk.Type == "text" && chunk.Content != "" {
				fullContent.WriteString(chunk.Content)
			}
			
			// If this is the final chunk, save to history
			if chunk.Done {
				if fullContent.Len() > 0 {
					// Save the complete message to history
					eb.chatHistory.AddMessage(session.ID, "assistant", fullContent.String())
					
					eb.logger.WithFields(logrus.Fields{
						"session_id":     session.ID,
						"content_length": fullContent.Len(),
					}).Info("Streaming completed, saved to history")
				}
			}
		}
	}()
	
	return outChan, nil
}

// GetCellValue retrieves a cell value from cache or requests it
func (eb *ExcelBridge) GetCellValue(sheet, cell string) (interface{}, error) {
	key := fmt.Sprintf("%s!%s", sheet, cell)

	eb.cacheMutex.RLock()
	if value, ok := eb.cellCache[key]; ok {
		eb.cacheMutex.RUnlock()
		return value, nil
	}
	eb.cacheMutex.RUnlock()

	// Value not in cache, request from clients
	// TODO: Implement request mechanism
	return nil, fmt.Errorf("cell value not available")
}

// GetRangeValues retrieves range values from cache or requests them
func (eb *ExcelBridge) GetRangeValues(sheet, rangeAddr string) ([][]interface{}, error) {
	key := fmt.Sprintf("%s!%s", sheet, rangeAddr)

	eb.cacheMutex.RLock()
	if values, ok := eb.rangeCache[key]; ok {
		eb.cacheMutex.RUnlock()
		return values, nil
	}
	eb.cacheMutex.RUnlock()

	// Values not in cache, request from clients
	// TODO: Implement request mechanism
	return nil, fmt.Errorf("range values not available")
}

// UpdateCell updates a cell value and notifies subscribers
func (eb *ExcelBridge) UpdateCell(update CellUpdate) error {
	key := fmt.Sprintf("%s!%s", update.Sheet, update.Cell)

	// Update cache
	eb.cacheMutex.Lock()
	eb.cellCache[key] = update.Value
	eb.cacheMutex.Unlock()

	// Broadcast update to subscribers via SignalR
	// TODO: Implement SignalR broadcast if needed

	return nil
}

// UpdateRange updates range values and notifies subscribers
func (eb *ExcelBridge) UpdateRange(rangeData RangeData) error {
	key := fmt.Sprintf("%s!%s", rangeData.Sheet, rangeData.Range)

	// Update cache
	eb.cacheMutex.Lock()
	eb.rangeCache[key] = rangeData.Values
	eb.cacheMutex.Unlock()

	// Broadcast update to subscribers via SignalR
	// TODO: Implement SignalR broadcast if needed

	return nil
}

// Helper methods

func (eb *ExcelBridge) getOrCreateSession(clientID, sessionID string) *ExcelSession {
	eb.sessionMutex.Lock()
	defer eb.sessionMutex.Unlock()

	// If sessionID is provided, try to find it
	if sessionID != "" {
		if session, exists := eb.sessions[sessionID]; exists {
			// Update client ID if it changed (reconnection)
			session.ClientID = clientID
			session.LastActivity = time.Now()
			return session
		}
	}

	// Create new session
	newSessionID := sessionID
	if newSessionID == "" {
		newSessionID = fmt.Sprintf("session_%d", time.Now().UnixNano())
	}

	session := &ExcelSession{
		ID:           newSessionID,
		ClientID:     clientID,
		LastActivity: time.Now(),
		CreatedAt:    time.Now(),
		Context:      make(map[string]interface{}),
		MemoryStats: &MemoryStats{
			LastIndexed:  time.Now(),
			IndexVersion: "1.0",
		},
	}
	
	// Initialize in-memory vector store for the session
	inMemStore := memory.NewInMemoryStore(1000) // Max 1000 chunks per session
	var vectorStore memory.VectorStore = inMemStore
	session.MemoryStore = &vectorStore

	eb.sessions[newSessionID] = session
	
	// Log session creation with memory store info
	eb.logger.WithFields(logrus.Fields{
		"session_id": newSessionID,
		"client_id":  clientID,
		"has_memory": session.MemoryStore != nil,
	}).Info("Created new session with memory store")

	// If we have a session manager, register it there too
	if eb.sessionManager != nil {
		sessionInfo := &SessionInfo{
			ID:           newSessionID,
			Type:         SessionTypeAPI,
			UserID:       clientID,
			CreatedAt:    time.Now(),
			LastActivity: time.Now(),
			Metadata:     make(map[string]interface{}),
		}
		eb.sessionManager.RegisterSession(sessionInfo)
	}

	return session
}

// GetSession retrieves a session by ID (used by BridgeImpl for routing)
func (eb *ExcelBridge) GetSession(sessionID string) *ExcelSession {
	eb.sessionMutex.RLock()
	defer eb.sessionMutex.RUnlock()

	if session, ok := eb.sessions[sessionID]; ok {
		return session
	}
	return nil
}

// GetWorkbookData retrieves all workbook data for indexing
func (eb *ExcelBridge) GetWorkbookData(sessionID string) *models.Workbook {
	session := eb.GetSession(sessionID)
	if session == nil {
		return nil
	}

	workbook := &models.Workbook{
		Name:   "Current Workbook", // Could be enhanced to get actual workbook name
		Sheets: make([]*models.Sheet, 0),
	}

	// For now, we'll focus on the active sheet
	// In the future, this could be enhanced to get all sheets
	activeSheet := session.ActiveSheet
	if activeSheet == "" {
		activeSheet = "Sheet1" // Default sheet name
	}

	// Get the used range for the active sheet
	// For now, use a default range since getWorksheetUsedRange is unexported
	// TODO: Export the method or implement a different approach
	usedRange := "A1:Z100"

	// Read the range data
	ctx := context.Background()
	rangeData, err := eb.excelBridgeImpl.ReadRange(ctx, sessionID, usedRange, true, true)
	if err != nil {
		eb.logger.WithError(err).Error("Failed to read range data for indexing")
		return workbook
	}

	// Create sheet model
	sheet := &models.Sheet{
		Name:      activeSheet,
		UsedRange: usedRange,
		IsActive:  true,
		Data: &models.RangeData{
			Sheet:  activeSheet,
			Range:  usedRange,
			Values: rangeData.Values,
		},
	}

	// Extract formulas if available from rangeData.Formulas
	if rangeData.Formulas != nil {
		sheet.Data.Formulas = make([][]string, len(rangeData.Formulas))
		for i, row := range rangeData.Formulas {
			sheet.Data.Formulas[i] = make([]string, len(row))
			for j, formula := range row {
				if f, ok := formula.(string); ok {
					sheet.Data.Formulas[i][j] = f
				}
			}
		}
	}

	workbook.Sheets = append(workbook.Sheets, sheet)

	// Cache the range data for future use
	eb.cacheMutex.Lock()
	eb.rangeCache[fmt.Sprintf("%s!%s", activeSheet, usedRange)] = rangeData.Values
	eb.cacheMutex.Unlock()

	return workbook
}

func (eb *ExcelBridge) buildContext(session *ExcelSession, additionalContext map[string]interface{}) map[string]interface{} {
	context := make(map[string]interface{})

	// Add session context
	for k, v := range session.Context {
		context[k] = v
	}

	// Add current selection
	if session.Selection.SelectedCell != "" || session.Selection.SelectedRange != "" {
		context["selection"] = session.Selection
	}

	// Add active sheet
	if session.ActiveSheet != "" {
		context["activeSheet"] = session.ActiveSheet
	}

	// Add additional context from message
	for k, v := range additionalContext {
		context[k] = v
	}

	// Add cached data if relevant to selection
	eb.addCachedDataToContext(context, session)

	return context
}

func (eb *ExcelBridge) addCachedDataToContext(context map[string]interface{}, session *ExcelSession) {
	eb.cacheMutex.RLock()
	defer eb.cacheMutex.RUnlock()

	// Add selected cell value if available
	if session.Selection.SelectedCell != "" {
		key := fmt.Sprintf("%s!%s", session.ActiveSheet, session.Selection.SelectedCell)
		if value, ok := eb.cellCache[key]; ok {
			context["selectedCellValue"] = value
		}
	}

	// Add selected range values if available
	if session.Selection.SelectedRange != "" {
		key := fmt.Sprintf("%s!%s", session.ActiveSheet, session.Selection.SelectedRange)
		if values, ok := eb.rangeCache[key]; ok {
			context["selectedRangeValues"] = values
		}
	}
}

func (eb *ExcelBridge) generateFallbackResponse(message string, context map[string]interface{}) string {
	// Simple pattern matching for common requests
	if contains(message, []string{"formula", "calculate", "sum", "average"}) {
		return "To create formulas, I need access to the AI service. Please ensure the AI service is configured."
	}

	if contains(message, []string{"help", "how to", "guide"}) {
		return "I can help you with:\n• Creating and editing formulas\n• Analyzing your data\n• Explaining cell values and calculations\n• Formatting cells and ranges\n\nPlease be specific about what you'd like to do."
	}

	return "I'm ready to help with your spreadsheet. Please tell me what you'd like to do."
}

func (eb *ExcelBridge) generateFallbackSuggestions(context map[string]interface{}) []string {
	suggestions := []string{
		"Sum selected range",
		"Create a chart",
		"Format as currency",
		"Add conditional formatting",
	}

	// Add context-specific suggestions
	if _, hasSelection := context["selection"]; hasSelection {
		suggestions = append([]string{"Explain this formula", "Copy formula down"}, suggestions...)
	}

	return suggestions[:4] // Return top 4 suggestions
}

func (eb *ExcelBridge) detectRequestedActions(message string, context map[string]interface{}) []ProposedAction {
	var actions []ProposedAction

	// Detect formula creation requests
	if contains(message, []string{"create formula", "write formula", "sum", "average", "calculate"}) {
		action := ProposedAction{
			ID:          generateActionID(),
			Type:        "create_formula",
			Description: "Create a formula based on your request",
			Parameters: map[string]interface{}{
				"request": message,
			},
		}
		actions = append(actions, action)
	}

	// Detect formatting requests
	if contains(message, []string{"format", "color", "bold", "currency", "percentage"}) {
		action := ProposedAction{
			ID:          generateActionID(),
			Type:        "format_cells",
			Description: "Apply formatting to selected cells",
			Parameters: map[string]interface{}{
				"request": message,
			},
		}
		actions = append(actions, action)
	}

	return actions
}

func (eb *ExcelBridge) cleanupSessions() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		eb.sessionMutex.Lock()
		now := time.Now()
		for id, session := range eb.sessions {
			if now.Sub(session.LastActivity) > 30*time.Minute {
				delete(eb.sessions, id)
				eb.logger.WithField("sessionID", id).Info("Cleaned up inactive session")
			}
		}
		eb.sessionMutex.Unlock()
	}
}

// Utility functions

func contains(text string, keywords []string) bool {
	lowerText := strings.ToLower(text)
	for _, keyword := range keywords {
		if strings.Contains(lowerText, keyword) {
			return true
		}
	}
	return false
}

func generateActionID() string {
	return fmt.Sprintf("action_%d", time.Now().UnixNano())
}

// Helper function to get map keys for debugging
func getMapKeys(m map[string]interface{}) []string {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	return keys
}

// Helper function to safely get string value from map
func getStringValue(m map[string]interface{}, key string) string {
	if v, ok := m[key]; ok {
		if str, ok := v.(string); ok {
			return str
		}
	}
	return ""
}

// buildFinancialContext converts session context to AI financial context
// Optimized to only include relevant data, similar to how Cursor indexes codebases
func (eb *ExcelBridge) buildFinancialContext(session *ExcelSession, additionalContext map[string]interface{}) *ai.FinancialContext {
	context := &ai.FinancialContext{
		CellValues:      make(map[string]interface{}),
		Formulas:        make(map[string]string),
		RecentChanges:   make([]ai.CellChange, 0),
		DocumentContext: make([]string, 0),
	}

	// Track if we have any actual data
	hasData := false

	// Debug log the incoming context
	eb.logger.WithField("context_keys", getMapKeys(additionalContext)).Debug("Building financial context from Excel data")

	// Log specific fields to debug the structure
	if sd, exists := additionalContext["selectedData"]; exists {
		eb.logger.WithField("selectedData_type", fmt.Sprintf("%T", sd)).Debug("Found selectedData field")
	}
	// Check for both nearbyData and nearbyRange
	if nd, exists := additionalContext["nearbyData"]; exists {
		eb.logger.WithField("nearbyData_type", fmt.Sprintf("%T", nd)).Debug("Found nearbyData field")
	}
	if nr, exists := additionalContext["nearbyRange"]; exists {
		eb.logger.WithField("nearbyRange_type", fmt.Sprintf("%T", nr)).Warn("Found deprecated nearbyRange field - please use nearbyData instead")
	}

	// Extract workbook and worksheet names
	if workbook, ok := additionalContext["workbook"].(string); ok {
		context.WorkbookName = workbook
	}
	if worksheet, ok := additionalContext["worksheet"].(string); ok {
		context.WorksheetName = worksheet
	} else if session.ActiveSheet != "" {
		context.WorksheetName = session.ActiveSheet
	}

	// Extract selection information - handle both SelectionChanged and string formats
	if selection, ok := additionalContext["selection"].(SelectionChanged); ok {
		if selection.SelectedRange != "" {
			context.SelectedRange = selection.SelectedRange
		} else if selection.SelectedCell != "" {
			context.SelectedRange = selection.SelectedCell
		}
	} else if selectionStr, ok := additionalContext["selection"].(string); ok {
		// Handle selection as string (from SignalR)
		context.SelectedRange = selectionStr
	} else if session.Selection.SelectedRange != "" {
		context.SelectedRange = session.Selection.SelectedRange
	} else if session.Selection.SelectedCell != "" {
		context.SelectedRange = session.Selection.SelectedCell
	}

	// Extract cell values and formulas from additional context
	if cellValues, ok := additionalContext["cellValues"].(map[string]interface{}); ok {
		context.CellValues = cellValues
	}
	if formulas, ok := additionalContext["formulas"].(map[string]string); ok {
		context.Formulas = formulas
	}

	// Extract selected data if available - check excelContext first, then root context
	var selectedData map[string]interface{}
	if excelCtx, ok := additionalContext["excelContext"].(map[string]interface{}); ok {
		if sd, ok := excelCtx["selectedData"].(map[string]interface{}); ok {
			selectedData = sd
			eb.logger.Debug("Found selectedData in excelContext")
			hasData = true // Mark that we found data even before processing
		}
	}
	// Fallback to root level (backward compatibility)
	if selectedData == nil {
		if sd, ok := additionalContext["selectedData"].(map[string]interface{}); ok {
			selectedData = sd
			eb.logger.Debug("Found selectedData in root context")
			hasData = true // Mark that we found data even before processing
		}
	}

	if selectedData != nil {
		if values, ok := selectedData["values"].([]interface{}); ok {
			// Convert 2D array to cell map
			if address, ok := selectedData["address"].(string); ok {
				// Process even if values might be empty to detect actual emptiness
				eb.processCellData(context, values, address)
				if hasNonEmptyValues(values) {
					hasData = true
					eb.logger.WithField("address", address).Debug("Processed selected cell values with data")
				}
			}
		}
		if formulas, ok := selectedData["formulas"].([]interface{}); ok {
			// Process formulas similarly
			if address, ok := selectedData["address"].(string); ok {
				eb.processFormulaData(context, formulas, address)
				if hasNonEmptyValues(formulas) {
					hasData = true
					eb.logger.WithField("address", address).Debug("Processed selected cell formulas")
				}
			}
		}
	}

	// Extract nearby data - check excelContext first
	var nearbyData map[string]interface{}
	if excelCtx, ok := additionalContext["excelContext"].(map[string]interface{}); ok {
		if nd, ok := excelCtx["nearbyData"].(map[string]interface{}); ok {
			nearbyData = nd
			eb.logger.Debug("Using nearbyData from excelContext")
		}
	}
	// Fallback to root level
	if nearbyData == nil {
		if nd, ok := additionalContext["nearbyData"].(map[string]interface{}); ok {
			nearbyData = nd
			eb.logger.Debug("Using nearbyData from root context")
		} else if nr, ok := additionalContext["nearbyRange"].(map[string]interface{}); ok {
			// Fallback to nearbyRange for backward compatibility
			nearbyData = nr
			eb.logger.Warn("Using deprecated nearbyRange as nearbyData - frontend should be updated to use nearbyData")
		}
	}

	if nearbyData != nil {
		if values, ok := nearbyData["values"].([]interface{}); ok {
			if address, ok := nearbyData["address"].(string); ok {
				eb.processCellData(context, values, address)
				if hasNonEmptyValues(values) {
					hasData = true
					eb.logger.WithField("address", address).Debug("Processed nearby cell values")
				}
			}
		}
		if formulas, ok := nearbyData["formulas"].([]interface{}); ok {
			if address, ok := nearbyData["address"].(string); ok {
				eb.processFormulaData(context, formulas, address)
				if hasNonEmptyValues(formulas) {
					hasData = true
					eb.logger.WithField("address", address).Debug("Processed nearby cell formulas")
				}
			}
		}
	}

	// Extract visible range data (full active sheet)
	var visibleRangeData map[string]interface{}
	if excelCtx, ok := additionalContext["excelContext"].(map[string]interface{}); ok {
		if vrd, ok := excelCtx["visibleRangeData"].(map[string]interface{}); ok {
			visibleRangeData = vrd
			eb.logger.Debug("Found visibleRangeData in excelContext")
		}
	}

	if visibleRangeData != nil {
		if values, ok := visibleRangeData["values"].([]interface{}); ok {
			if address, ok := visibleRangeData["address"].(string); ok {
				// Only process if not too large
				if len(values) > 0 && len(values) <= 100 { // Limit rows for context
					eb.processCellData(context, values, address)
					if hasNonEmptyValues(values) {
						hasData = true
						eb.logger.WithField("address", address).Debug("Processed visible range data")
					}
				} else {
					// Add summary to document context
					rows := len(values)
					cols := 0
					if rows > 0 {
						if firstRow, ok := values[0].([]interface{}); ok {
							cols = len(firstRow)
						}
					}
					context.DocumentContext = append(context.DocumentContext, 
						fmt.Sprintf("Active sheet has %d×%d cells (truncated for context)", rows, cols))
				}
			}
		}
	}

	// Handle workbook summary
	if wbSummary, ok := additionalContext["workbookSummary"].(map[string]interface{}); ok {
		if wbData, ok := wbSummary["sheets"].([]interface{}); ok {
			summaryLines := []string{"Workbook structure:"}
			totalSheets := len(wbData)
			
			for i, sheet := range wbData {
				if i >= 5 { // Limit to first 5 sheets
					summaryLines = append(summaryLines, fmt.Sprintf("  ... and %d more sheets", totalSheets-5))
					break
				}
				
				if sheetMap, ok := sheet.(map[string]interface{}); ok {
					name := ""
					if n, ok := sheetMap["name"].(string); ok {
						name = n
					}
					
					rows := 0
					if r, ok := sheetMap["lastRow"].(float64); ok {
						rows = int(r)
					}
					
					cols := 0
					if c, ok := sheetMap["lastColumn"].(float64); ok {
						cols = int(c)
					}
					
					// Check if data is truncated
					truncated := false
					if data, ok := sheetMap["data"].(map[string]interface{}); ok {
						if values, ok := data["values"].([]interface{}); ok {
							if len(values) == 1 {
								if row, ok := values[0].([]interface{}); ok && len(row) == 1 {
									if msg, ok := row[0].(string); ok && strings.Contains(msg, "too large") {
										truncated = true
									}
								}
							}
						}
					}
					
					status := ""
					if truncated {
						status = " (summary only)"
					} else if rows*cols > 1000 {
						status = " (partial)"
					}
					
					summaryLines = append(summaryLines, 
						fmt.Sprintf("  - %s: %d×%d cells%s", name, rows, cols, status))
				}
			}
			
			if len(summaryLines) > 1 { // Only add if we have actual sheet info
				context.DocumentContext = append(context.DocumentContext, summaryLines...)
			}
		}
	}

	// Extract full sheet data if available - gives AI complete visibility
	// First try from excelContext (new format)
	var fullSheetData map[string]interface{}
	if excelCtx, ok := additionalContext["excelContext"].(map[string]interface{}); ok {
		if fsd, ok := excelCtx["fullSheetData"].(map[string]interface{}); ok {
			fullSheetData = fsd
			eb.logger.Debug("Found fullSheetData in excelContext - AI will have complete sheet visibility")
		}
	}
	// Fallback to root level (backward compatibility)
	if fullSheetData == nil {
		if fsd, ok := additionalContext["fullSheetData"].(map[string]interface{}); ok {
			fullSheetData = fsd
			eb.logger.Debug("Found fullSheetData in root context - AI will have complete sheet visibility")
		}
	}

	if fullSheetData != nil {
		if values, ok := fullSheetData["values"].([]interface{}); ok {
			if address, ok := fullSheetData["address"].(string); ok {
				eb.processCellData(context, values, address)
				if hasNonEmptyValues(values) {
					hasData = true
					eb.logger.WithField("address", address).Info("Processed full sheet data")
				}
			}
		}

		if formulas, ok := fullSheetData["formulas"].([]interface{}); ok {
			if address, ok := fullSheetData["address"].(string); ok {
				eb.processFormulaData(context, formulas, address)
				eb.logger.Debug("Processed full sheet formulas")
			}
		}

		// Add metadata about sheet size
		if isFullSheet, ok := fullSheetData["isFullSheet"].(bool); ok && isFullSheet {
			context.DocumentContext = append(context.DocumentContext, "Full sheet data loaded")
		} else if note, ok := fullSheetData["note"].(string); ok {
			context.DocumentContext = append(context.DocumentContext, note)
		}
	}

	// Add cached data
	eb.addCachedDataToFinancialContext(context, session)

	// Incorporate recent edits from session AND from Excel context
	// First check if we have recent edits from the Excel context (from ComprehensiveContext)
	// The Excel context comes in as "excelContext" in the chat message data
	if excelContext, ok := additionalContext["excelContext"].(map[string]interface{}); ok {
		if recentEdits, ok := excelContext["recentEdits"].([]interface{}); ok {
			eb.logger.WithField("excel_recent_edits_count", len(recentEdits)).Debug("Found recent edits from Excel context")

			for _, edit := range recentEdits {
				if editMap, ok := edit.(map[string]interface{}); ok {
					change := ai.CellChange{
						Address:   getStringValue(editMap, "range"),
						Timestamp: time.Now(), // Default to now if not provided
					}

					// Parse timestamp if available
					if tsStr, ok := editMap["timestamp"].(string); ok {
						if ts, err := time.Parse(time.RFC3339, tsStr); err == nil {
							change.Timestamp = ts
						}
					}

					// Set source
					if source := getStringValue(editMap, "source"); source != "" {
						change.Source = source
					} else {
						change.Source = "ai"
					}

					// Extract first value from arrays for summary (later we'll use full arrays)
					if oldValues, ok := editMap["oldValues"].([]interface{}); ok && len(oldValues) > 0 {
						if row, ok := oldValues[0].([]interface{}); ok && len(row) > 0 {
							change.OldValue = row[0]
						}
					}

					if newValues, ok := editMap["newValues"].([]interface{}); ok && len(newValues) > 0 {
						if row, ok := newValues[0].([]interface{}); ok && len(row) > 0 {
							change.NewValue = row[0]
						}
					}

					context.RecentChanges = append(context.RecentChanges, change)
				}
			}
		}
	}

	// Also check session context for backward compatibility
	if session.Context != nil {
		if recentEdits, ok := session.Context["recentEdits"].([]interface{}); ok {
			for _, edit := range recentEdits {
				if editMap, ok := edit.(map[string]interface{}); ok {
					change := ai.CellChange{
						Address:   getStringValue(editMap, "range"),
						OldValue:  editMap["oldValue"],
						NewValue:  editMap["newValue"],
						Timestamp: time.Now(), // Default to now if not provided
					}
					if tsStr, ok := editMap["timestamp"].(string); ok {
						if ts, err := time.Parse(time.RFC3339, tsStr); err == nil {
							change.Timestamp = ts
						}
					}
					// Set source if available
					if source := getStringValue(editMap, "source"); source != "" {
						change.Source = source
					} else {
						change.Source = "ai" // Default to AI as source for recent edits
					}
					context.RecentChanges = append(context.RecentChanges, change)
				}
			}
			eb.logger.WithField("session_recent_edits_count", len(context.RecentChanges)).Debug("Incorporated recent edits from session")
		}
	}

	// Only add model type detection if we have actual data
	if hasData && context.ModelType == "" {
		context.ModelType = eb.detectModelType(context)
	} else if !hasData {
		// For empty spreadsheets, indicate this clearly
		context.ModelType = "Empty"
		context.DocumentContext = append(context.DocumentContext, "Spreadsheet is empty")
	}

	// Log context size for debugging
	eb.logger.WithFields(logrus.Fields{
		"has_data":       hasData,
		"cell_count":     len(context.CellValues),
		"formula_count":  len(context.Formulas),
		"recent_changes": len(context.RecentChanges),
		"model_type":     context.ModelType,
	}).Debug("Built financial context")

	return context
}

// addCachedDataToFinancialContext adds cached spreadsheet data to financial context
func (eb *ExcelBridge) addCachedDataToFinancialContext(context *ai.FinancialContext, session *ExcelSession) {
	eb.cacheMutex.RLock()
	defer eb.cacheMutex.RUnlock()

	// Add selected cell value if available
	if session.Selection.SelectedCell != "" {
		key := fmt.Sprintf("%s!%s", session.ActiveSheet, session.Selection.SelectedCell)
		if value, ok := eb.cellCache[key]; ok {
			context.CellValues[session.Selection.SelectedCell] = value
		}
	}

	// Add selected range values if available
	if session.Selection.SelectedRange != "" {
		key := fmt.Sprintf("%s!%s", session.ActiveSheet, session.Selection.SelectedRange)
		if values, ok := eb.rangeCache[key]; ok {
			// Convert 2D slice to cell values map
			// This is a simplified conversion - in production you'd want more sophisticated range parsing
			context.CellValues[session.Selection.SelectedRange] = values
		}
	}
}

// convertAIActions converts AI actions to proposed actions
func (eb *ExcelBridge) convertAIActions(aiActions []ai.Action) []ProposedAction {
	actions := make([]ProposedAction, len(aiActions))

	for i, aiAction := range aiActions {
		actions[i] = ProposedAction{
			ID:          generateActionID(),
			Type:        aiAction.Type,
			Description: aiAction.Description,
			Parameters:  aiAction.Parameters,
		}
	}

	return actions
}

// detectModelType attempts to detect the financial model type
func (eb *ExcelBridge) detectModelType(context *ai.FinancialContext) string {
	// Simple heuristics based on worksheet name and cell values
	if context.WorksheetName != "" {
		wsName := strings.ToLower(context.WorksheetName)
		if strings.Contains(wsName, "dcf") || strings.Contains(wsName, "discounted") {
			return "DCF"
		}
		if strings.Contains(wsName, "lbo") || strings.Contains(wsName, "leverage") {
			return "LBO"
		}
		if strings.Contains(wsName, "merger") || strings.Contains(wsName, "m&a") {
			return "M&A"
		}
		if strings.Contains(wsName, "trading") || strings.Contains(wsName, "comps") {
			return "Trading Comps"
		}
	}

	// Check cell values for financial keywords
	for _, value := range context.CellValues {
		if str, ok := value.(string); ok {
			lowerStr := strings.ToLower(str)
			if strings.Contains(lowerStr, "wacc") || strings.Contains(lowerStr, "terminal value") {
				return "DCF"
			}
			if strings.Contains(lowerStr, "irr") || strings.Contains(lowerStr, "debt schedule") {
				return "LBO"
			}
			if strings.Contains(lowerStr, "ev/ebitda") || strings.Contains(lowerStr, "multiple") {
				return "Trading Comps"
			}
		}
	}

	return "General"
}

// ApplyChanges applies the approved changes from a preview
func (eb *ExcelBridge) ApplyChanges(ctx context.Context, userID, previewID string, changeIDs []string) (*ApplyChangesResponse, error) {
	// In a real implementation, this would:
	// 1. Retrieve the preview from storage
	// 2. Validate that the user has permission
	// 3. Apply each approved change
	// 4. Create a backup point
	// 5. Update the audit trail

	response := &ApplyChangesResponse{
		Success:      true,
		AppliedCount: len(changeIDs),
		FailedCount:  0,
		BackupID:     generateBackupID(),
		Errors:       []string{},
	}

	// For MVP, we'll simulate applying changes
	eb.logger.WithFields(logrus.Fields{
		"userID":    userID,
		"previewID": previewID,
		"changeIDs": changeIDs,
	}).Info("Applying changes from preview")

	// TODO: Record in audit log when audit service is integrated

	return response, nil
}

// RejectChanges records the rejection of proposed changes
func (eb *ExcelBridge) RejectChanges(ctx context.Context, userID, previewID, reason string) error {
	// Record rejection in audit trail
	eb.logger.WithFields(logrus.Fields{
		"userID":    userID,
		"previewID": previewID,
		"reason":    reason,
	}).Info("Changes rejected by user")

	// TODO: Record in audit log when audit service is integrated

	return nil
}

// generateBackupID generates a unique backup ID
func generateBackupID() string {
	return "backup_" + time.Now().Format("20060102_150405")
}

// processCellData processes cell values from Excel and adds them to the context
func (eb *ExcelBridge) processCellData(context *ai.FinancialContext, values []interface{}, baseAddress string) {
	// Parse the base address to get starting row and column
	// baseAddress format: "Sheet1!A1:C10" or "A1:C10" or "Sheet1!A1" or "A1"
	parts := strings.Split(baseAddress, "!")
	rangeStr := parts[len(parts)-1]

	// Parse range - handle both single cells and ranges
	var startCell string
	rangeParts := strings.Split(rangeStr, ":")
	if len(rangeParts) == 1 {
		// Single cell
		startCell = rangeParts[0]
	} else if len(rangeParts) == 2 {
		// Range
		startCell = rangeParts[0]
	} else {
		eb.logger.WithField("address", baseAddress).Warn("Invalid range format")
		return
	}

	startCol, startRow := eb.parseCell(startCell)

	// Process the 2D array of values
	for i, rowData := range values {
		if rowArray, ok := rowData.([]interface{}); ok {
			for j, cellValue := range rowArray {
				if cellValue != nil && cellValue != "" {
					cellAddress := eb.getCellAddress(startCol+j, startRow+i)
					context.CellValues[cellAddress] = cellValue
				}
			}
		}
	}
}

// processFormulaData processes formulas from Excel and adds them to the context
func (eb *ExcelBridge) processFormulaData(context *ai.FinancialContext, formulas []interface{}, baseAddress string) {
	// Parse the base address similar to processCellData
	parts := strings.Split(baseAddress, "!")
	rangeStr := parts[len(parts)-1]

	// Parse range - handle both single cells and ranges
	var startCell string
	rangeParts := strings.Split(rangeStr, ":")
	if len(rangeParts) == 1 {
		// Single cell
		startCell = rangeParts[0]
	} else if len(rangeParts) == 2 {
		// Range
		startCell = rangeParts[0]
	} else {
		eb.logger.WithField("address", baseAddress).Warn("Invalid range format for formulas")
		return
	}

	startCol, startRow := eb.parseCell(startCell)

	// Process the 2D array of formulas
	for i, rowData := range formulas {
		if rowArray, ok := rowData.([]interface{}); ok {
			for j, formula := range rowArray {
				if formulaStr, ok := formula.(string); ok && formulaStr != "" {
					cellAddress := eb.getCellAddress(startCol+j, startRow+i)
					context.Formulas[cellAddress] = formulaStr
				}
			}
		}
	}
}

// hasNonEmptyValues checks if a 2D array has any non-empty values
// This helps avoid sending empty data to the AI
func hasNonEmptyValues(values []interface{}) bool {
	for _, rowData := range values {
		if rowArray, ok := rowData.([]interface{}); ok {
			for _, cellValue := range rowArray {
				// Check if cell has actual content
				if cellValue != nil && cellValue != "" {
					// Also check for formulas (they start with =)
					if str, ok := cellValue.(string); ok {
						if str != "" {
							return true
						}
					} else {
						// Non-string values (numbers, booleans) are considered data
						return true
					}
				}
			}
		}
	}
	return false
}

// mergeRanges takes multiple Excel range strings and returns their bounding box
// For example: mergeRanges(["A1:B2", "D5:E6"]) returns "A1:E6"
func (eb *ExcelBridge) mergeRanges(ranges []string) string {
	if len(ranges) == 0 {
		return ""
	}
	if len(ranges) == 1 {
		return ranges[0]
	}

	// Initialize min/max bounds
	minRow, minCol := math.MaxInt32, math.MaxInt32
	maxRow, maxCol := 0, 0

	for _, rangeStr := range ranges {
		// Handle different range formats
		parts := strings.Split(rangeStr, "!")
		actualRange := rangeStr
		if len(parts) > 1 {
			// Remove sheet name if present
			actualRange = parts[len(parts)-1]
		}

		// Handle single cell (e.g., "A1") vs range (e.g., "A1:B2")
		cellParts := strings.Split(actualRange, ":")
		startCell := cellParts[0]
		endCell := startCell
		if len(cellParts) > 1 {
			endCell = cellParts[1]
		}

		// Parse start cell
		startCol, startRow := eb.parseCell(startCell)
		if startRow < minRow {
			minRow = startRow
		}
		if startCol < minCol {
			minCol = startCol
		}

		// Parse end cell
		endCol, endRow := eb.parseCell(endCell)
		if endRow > maxRow {
			maxRow = endRow
		}
		if endCol > maxCol {
			maxCol = endCol
		}
	}

	// Convert back to range string
	startAddr := eb.getCellAddress(minCol, minRow)
	endAddr := eb.getCellAddress(maxCol, maxRow)

	if startAddr == endAddr {
		return startAddr
	}
	return fmt.Sprintf("%s:%s", startAddr, endAddr)
}

// parseCell parses a cell reference like "A1" into column and row indices
func (eb *ExcelBridge) parseCell(cell string) (col int, row int) {
	// Extract column letters and row number
	colStr := ""
	rowStr := ""

	for i, ch := range cell {
		if ch >= 'A' && ch <= 'Z' {
			colStr += string(ch)
		} else {
			rowStr = cell[i:]
			break
		}
	}

	// Convert column letters to index (A=0, B=1, etc.)
	col = 0
	for i, ch := range colStr {
		col = col*26 + int(ch-'A'+1)
		if i == len(colStr)-1 {
			col-- // Make it 0-based
		}
	}

	// Convert row string to index (1-based to 0-based)
	fmt.Sscanf(rowStr, "%d", &row)
	row-- // Make it 0-based

	return col, row
}

// getCellAddress converts column and row indices back to cell reference
func (eb *ExcelBridge) getCellAddress(col, row int) string {
	// Convert column index to letters
	colStr := ""
	col++ // Make it 1-based for calculation

	for col > 0 {
		remainder := (col - 1) % 26
		colStr = string(rune('A'+remainder)) + colStr
		col = (col - 1) / 26
	}

	// Return cell address
	return fmt.Sprintf("%s%d", colStr, row+1)
}

// GetRequestIDMapper returns the request ID mapper
func (eb *ExcelBridge) GetRequestIDMapper() *RequestIDMapper {
	return eb.requestIDMapper
}


// mergeMessageContext merges additional context from the message into the financial context
func (eb *ExcelBridge) mergeMessageContext(fc *ai.FinancialContext, msgContext map[string]interface{}) {
	// Add any document context from the message
	for k, v := range msgContext {
		if str, ok := v.(string); ok && k != "selectedData" && k != "nearbyData" {
			if fc.DocumentContext == nil {
				fc.DocumentContext = []string{}
			}
			fc.DocumentContext = append(fc.DocumentContext, fmt.Sprintf("%s: %s", k, str))
		}
	}
}

// indexInitialWorkbook starts background indexing of the workbook
func (eb *ExcelBridge) indexInitialWorkbook(sessionID string) {
	eb.logger.WithField("session_id", sessionID).Info("Starting initial workbook indexing")
	
	// Get session and check if memory store exists
	session := eb.GetSession(sessionID)
	if session == nil || session.MemoryStore == nil {
		eb.logger.WithField("session_id", sessionID).Error("Session or memory store not found for indexing")
		return
	}

	// Check if indexing service is available
	if eb.indexingService == nil {
		eb.logger.Warn("Indexing service not configured, skipping workbook indexing")
		return
	}

	// Get workbook data
	workbook := eb.GetWorkbookData(sessionID)
	if workbook == nil || len(workbook.Sheets) == 0 {
		eb.logger.WithField("session_id", sessionID).Warn("No workbook data available for indexing")
		return
	}

	// Use type assertion to call the indexing service
	type indexingServiceInterface interface {
		IndexWorkbook(ctx context.Context, sessionID string, workbook *models.Workbook, store memory.VectorStore) error
	}

	if indexer, ok := eb.indexingService.(indexingServiceInterface); ok {
		ctx := context.Background()
		err := indexer.IndexWorkbook(ctx, sessionID, workbook, *session.MemoryStore)
		
		if err != nil {
			eb.logger.WithError(err).WithField("session_id", sessionID).Error("Failed to index workbook")
		} else {
			// Update session stats on successful indexing
			eb.sessionMutex.Lock()
			if session.MemoryStats != nil {
				session.MemoryStats.LastIndexed = time.Now()
				if store := *session.MemoryStore; store != nil {
					if statsGetter, ok := store.(interface{ GetStats() memory.Stats }); ok {
						stats := statsGetter.GetStats()
						session.MemoryStats.TotalChunks = stats.TotalChunks
						session.MemoryStats.SpreadsheetChunks = stats.SpreadsheetChunks
					}
				}
			}
			eb.sessionMutex.Unlock()
			
			eb.logger.WithField("session_id", sessionID).Info("Workbook indexing completed successfully")
		}
	} else {
		eb.logger.Error("Indexing service does not implement required interface")
	}
}

// indexChatExchange indexes a chat exchange (user message + assistant response) to memory
func (eb *ExcelBridge) indexChatExchange(sessionID, userMessage, assistantResponse string, turn int) {
	session := eb.GetSession(sessionID)
	if session == nil || session.MemoryStore == nil {
		return
	}

	// Use type assertion to call the indexing service
	type chatIndexerInterface interface {
		IndexChatMessages(ctx context.Context, sessionID string, userMessage, assistantResponse string, turn int, store memory.VectorStore) error
	}

	if indexer, ok := eb.indexingService.(chatIndexerInterface); ok {
		ctx := context.Background()
		err := indexer.IndexChatMessages(ctx, sessionID, userMessage, assistantResponse, turn, *session.MemoryStore)
		
		if err != nil {
			eb.logger.WithError(err).Error("Failed to index chat messages")
		} else {
			// Update session stats
			eb.sessionMutex.Lock()
			if session.MemoryStats != nil {
				session.MemoryStats.ChatChunks += 2
				session.MemoryStats.TotalChunks += 2
			}
			eb.sessionMutex.Unlock()
			
			eb.logger.WithFields(logrus.Fields{
				"session_id": sessionID,
				"turn":       turn,
			}).Debug("Successfully indexed chat exchange to memory")
		}
	} else {
		eb.logger.Warn("Indexing service does not support chat message indexing")
	}
}

// IndexWorkbookForSession indexes the current workbook for a session
func (eb *ExcelBridge) IndexWorkbookForSession(sessionID string) error {
	session := eb.GetSession(sessionID)
	if session == nil {
		return fmt.Errorf("session not found: %s", sessionID)
	}
	
	if session.MemoryStore == nil {
		return fmt.Errorf("no memory store for session: %s", sessionID)
	}
	
	// Check if indexing service is available
	if eb.indexingService == nil {
		eb.logger.Warn("Indexing service not available, skipping workbook indexing")
		return nil
	}
	
	// Get workbook data from context
	if session.Context == nil {
		return fmt.Errorf("no context available for session")
	}
	
	// Convert session context to workbook model
	workbook := &models.Workbook{
		Name:      fmt.Sprintf("Workbook_%s", sessionID),
		SessionID: sessionID,
		Sheets:    []*models.Sheet{},
	}
	
	// Extract sheet data from context if available
	if sheets, ok := session.Context["sheets"].([]interface{}); ok {
		for _, sheetData := range sheets {
			if sheetMap, ok := sheetData.(map[string]interface{}); ok {
				sheet := &models.Sheet{
					Name:     fmt.Sprintf("%v", sheetMap["name"]),
					IsActive: false, // Set based on actual active sheet
				}
				
				// TODO: Extract and populate sheet data if available
				// For now, just add the sheet with basic info
				
				workbook.Sheets = append(workbook.Sheets, sheet)
			}
		}
	}
	
	// Perform indexing
	ctx := context.Background()
	indexer := eb.indexingService.(interface {
		IndexWorkbook(ctx context.Context, sessionID string, workbook *models.Workbook, store memory.VectorStore) error
	})
	
	err := indexer.IndexWorkbook(ctx, sessionID, workbook, *session.MemoryStore)
	if err != nil {
		return fmt.Errorf("failed to index workbook: %w", err)
	}
	
	// Update memory stats
	if session.MemoryStats != nil {
		stats := (*session.MemoryStore).GetStats()
		session.MemoryStats.TotalChunks = stats.TotalChunks
		session.MemoryStats.SpreadsheetChunks = stats.SpreadsheetChunks
		session.MemoryStats.DocumentChunks = stats.DocumentChunks
		session.MemoryStats.ChatChunks = stats.ChatChunks
		session.MemoryStats.LastIndexed = time.Now()
	}
	
	eb.logger.WithFields(logrus.Fields{
		"session_id":   sessionID,
		"total_chunks": session.MemoryStats.TotalChunks,
	}).Info("Workbook indexed successfully")
	
	return nil
}

// SetIndexingService sets the indexing service for the Excel bridge
