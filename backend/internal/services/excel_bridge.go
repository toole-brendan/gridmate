package services

import (
	"context"
	"fmt"
	"strings"
	"sync"
	"time"

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
		eb.sessions[sessionID] = &ExcelSession{
			ID:           sessionID,
			UserID:       "signalr-user",
			ClientID:     sessionID, // Use session ID as client ID for SignalR
			ActiveSheet:  "Sheet1",
			Context:      make(map[string]interface{}),
			LastActivity: now,
		}

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

// ProcessChatMessage processes a chat message from a client
func (eb *ExcelBridge) ProcessChatMessage(clientID string, message ChatMessage) (*ChatResponse, error) {
	// Get or create session
	session := eb.getOrCreateSession(clientID, message.SessionID)

	// Build context for AI
	msgContext := eb.buildContext(session, message.Context)

	// Process with AI if available
	var content string
	var suggestions []string
	var actions []ProposedAction
	var aiResponse *ai.CompletionResponse // Track AI response for IsFinal flag

	if eb.aiService != nil {
		eb.logger.Info("AI service is available, processing message")

		// Add user message to history
		eb.chatHistory.AddMessage(session.ID, "user", message.Content)

		// Build comprehensive context using context builder
		var financialContext *ai.FinancialContext
		if eb.contextBuilder != nil && session.Selection.SelectedRange != "" {
			ctx := context.Background()
			builtContext, err := eb.contextBuilder.BuildContext(ctx, session.ID)
			if err != nil {
				eb.logger.WithError(err).Warn("Failed to build comprehensive context")
				// Fall back to simple context
				financialContext = eb.buildFinancialContext(session, message.Context)
			} else {
				financialContext = builtContext
				// Add any additional context from the message
				for k, v := range message.Context {
					if str, ok := v.(string); ok {
						financialContext.DocumentContext = append(financialContext.DocumentContext, fmt.Sprintf("%s: %s", k, str))
					}
				}
			}
		} else {
			// Use simple context if no selection or context builder
			financialContext = eb.buildFinancialContext(session, message.Context)
		}

		// Add pending operations to the financial context
		if eb.queuedOpsRegistry != nil {
			ctx := context.Background()
			financialContext.PendingOperations = eb.queuedOpsRegistry.GetOperationSummary(ctx, session.ID)

			eb.logger.WithFields(logrus.Fields{
				"session_id":      session.ID,
				"has_pending_ops": financialContext.PendingOperations != nil,
			}).Debug("Added pending operations to initial context")
		}

		// Get chat history for this session
		history := eb.chatHistory.GetHistory(session.ID)

		// Convert chat history to AI message format
		aiHistory := make([]ai.Message, 0, len(history))
		for _, msg := range history {
			// Skip the current message as we'll add it in the AI call
			if msg.Timestamp.Unix() == eb.chatHistory.GetHistory(session.ID)[len(history)-1].Timestamp.Unix() {
				continue
			}
			aiHistory = append(aiHistory, ai.Message{
				Role:    msg.Role,
				Content: msg.Content,
			})
		}

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
		aiResponse, err := eb.aiService.ProcessChatWithToolsAndHistory(ctx, session.ID, message.Content, financialContext, aiHistory, message.AutonomyMode)
		if err != nil {
			eb.logger.WithError(err).Error("AI processing failed")
			content = "I encountered an error processing your request. Please try again."
		} else {
			content = aiResponse.Content
			// Add AI response to history
			eb.chatHistory.AddMessage(session.ID, "assistant", content)

			// Track AI-edited ranges for context expansion
			if len(aiResponse.ToolCalls) > 0 {
				var lastEditedRange string
				for _, toolCall := range aiResponse.ToolCalls {
					// Check if this is a write operation
					if isWriteTool(toolCall.Name) {
						// Extract range from tool input
						if rangeVal, ok := toolCall.Input["range"]; ok {
							if rangeStr, ok := rangeVal.(string); ok {
								lastEditedRange = rangeStr

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

								// Add new edit entry
								editEntry := map[string]interface{}{
									"range":     rangeStr,
									"timestamp": time.Now().Format(time.RFC3339),
									"source":    "ai",
									"tool":      toolCall.Name,
								}
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
				// update session selection to the last edited range
				if lastEditedRange != "" && !hasRecentUserSelection(session) {
					session.Selection.SelectedRange = lastEditedRange
					eb.logger.WithFields(logrus.Fields{
						"session_id": session.ID,
						"new_range":  lastEditedRange,
					}).Info("Updated session selection to AI-edited range for context expansion")
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

	// Update session activity
	session.LastActivity = time.Now()

	return response, nil
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

	if session, ok := eb.sessions[sessionID]; ok {
		// Update client ID in case of reconnection
		session.ClientID = clientID
		session.LastActivity = time.Now()
		return session
	}

	session := &ExcelSession{
		ID:           sessionID,
		UserID:       clientID, // TODO: This should be actual user ID when auth is implemented
		ClientID:     clientID, // Store the client ID to enable direct messaging
		Context:      make(map[string]interface{}),
		LastActivity: time.Now(),
	}

	eb.sessions[sessionID] = session
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

	// Extract selected data if available - check root context first, then additionalContext
	var selectedData map[string]interface{}
	if sd, ok := additionalContext["selectedData"].(map[string]interface{}); ok {
		selectedData = sd
		eb.logger.Debug("Found selectedData in root context")
		hasData = true // Mark that we found data even before processing
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

	// Extract nearby data - prioritize nearbyData over nearbyRange
	var nearbyData map[string]interface{}
	if nd, ok := additionalContext["nearbyData"].(map[string]interface{}); ok {
		nearbyData = nd
		eb.logger.Debug("Using nearbyData from context")
	} else if nr, ok := additionalContext["nearbyRange"].(map[string]interface{}); ok {
		// Fallback to nearbyRange for backward compatibility
		nearbyData = nr
		eb.logger.Warn("Using deprecated nearbyRange as nearbyData - frontend should be updated to use nearbyData")
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

	// Add cached data
	eb.addCachedDataToFinancialContext(context, session)

	// Incorporate recent edits from session if available
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
			eb.logger.WithField("recent_edits_count", len(context.RecentChanges)).Debug("Incorporated recent edits into context")
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
