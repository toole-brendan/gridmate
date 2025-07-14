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
	"github.com/gridmate/backend/internal/websocket"
	"github.com/sirupsen/logrus"
)

// ExcelBridge implements the Excel integration service
type ExcelBridge struct {
	hub           *websocket.Hub
	logger        *logrus.Logger
	
	// Cache for spreadsheet data
	cellCache     map[string]interface{}
	rangeCache    map[string][][]interface{}
	cacheMutex    sync.RWMutex
	
	// AI service for chat processing
	aiService     *ai.Service
	toolExecutor  *ai.ToolExecutor
	contextBuilder *excel.ContextBuilder
	excelBridgeImpl *excel.BridgeImpl // Excel bridge implementation for tool execution
	
	// Active sessions
	sessions      map[string]*ExcelSession
	sessionMutex  sync.RWMutex
	
	// SignalR bridge for SignalR clients
	signalRBridge interface{} // Will be set by main.go
	
	// Chat history management
	chatHistory *chat.History
}

// ExcelSession represents an active Excel session
type ExcelSession struct {
	ID            string
	UserID        string
	ClientID      string  // WebSocket client ID for routing messages
	ActiveSheet   string
	Selection     websocket.SelectionChanged
	Context       map[string]interface{}
	LastActivity  time.Time
}


// NewExcelBridge creates a new Excel bridge service
func NewExcelBridge(hub *websocket.Hub, logger *logrus.Logger) *ExcelBridge {
	// Initialize AI service
	aiService, err := ai.NewServiceFromEnv()
	if err != nil {
		logger.WithError(err).Error("Failed to initialize AI service")
		aiService = nil // Continue without AI service
	} else {
		logger.Info("AI service initialized successfully")
	}

	bridge := &ExcelBridge{
		hub:        hub,
		logger:     logger,
		cellCache:  make(map[string]interface{}),
		rangeCache: make(map[string][][]interface{}),
		aiService:  aiService,
		sessions:   make(map[string]*ExcelSession),
		chatHistory: chat.NewHistory(),
	}
	
	// Create Excel bridge implementation for tool executor
	excelBridgeImpl := excel.NewBridgeImpl(hub)
	bridge.excelBridgeImpl = excelBridgeImpl
	
	// Set client ID resolver
	excelBridgeImpl.SetClientIDResolver(func(sessionID string) string {
		bridge.sessionMutex.RLock()
		defer bridge.sessionMutex.RUnlock()
		
		logger.WithFields(logrus.Fields{
			"session_id":    sessionID,
			"total_sessions": len(bridge.sessions),
		}).Debug("Client ID resolver called")
		
		// Log all available sessions for debugging
		for sessID, sess := range bridge.sessions {
			logger.WithFields(logrus.Fields{
				"available_session_id": sessID,
				"client_id":           sess.ClientID,
				"user_id":             sess.UserID,
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
	
	// Create tool executor
	bridge.toolExecutor = ai.NewToolExecutor(excelBridgeImpl)
	
	// Set tool executor in AI service
	if aiService != nil {
		aiService.SetToolExecutor(bridge.toolExecutor)
		logger.Info("Tool executor set in AI service")
	} else {
		logger.Warn("AI service is nil, cannot set tool executor")
	}
	
	// Create context builder
	bridge.contextBuilder = excel.NewContextBuilder(excelBridgeImpl)
	
	// Set the bridge in the hub
	hub.SetExcelBridge(bridge)
	
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

// CreateSignalRSession creates a session for SignalR clients
func (eb *ExcelBridge) CreateSignalRSession(sessionID string) {
	eb.sessionMutex.Lock()
	defer eb.sessionMutex.Unlock()
	
	if _, exists := eb.sessions[sessionID]; !exists {
		eb.sessions[sessionID] = &ExcelSession{
			ID:           sessionID,
			UserID:       "signalr-user",
			ClientID:     sessionID, // Use session ID as client ID for SignalR
			ActiveSheet:  "Sheet1",
			Context:      make(map[string]interface{}),
			LastActivity: time.Now(),
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
		session.Selection = websocket.SelectionChanged{
			SelectedRange: selection,
			SelectedCell:  "", // Not provided in SignalR update
		}
		session.ActiveSheet = worksheet
		session.LastActivity = time.Now()
		
		eb.logger.WithFields(logrus.Fields{
			"session_id": sessionID,
			"selection":  selection,
			"worksheet":  worksheet,
		}).Debug("Updated SignalR session selection")
	}
}

// SetSignalRBridge sets the SignalR bridge for forwarding messages
func (eb *ExcelBridge) SetSignalRBridge(bridge interface{}) {
	eb.signalRBridge = bridge
	// Also set it on the excel bridge implementation
	if eb.excelBridgeImpl != nil {
		eb.excelBridgeImpl.SetSignalRBridge(bridge)
	}
}

// GetHub returns the WebSocket hub
func (eb *ExcelBridge) GetHub() *websocket.Hub {
	return eb.hub
}

// ProcessChatMessage processes a chat message from a client
func (eb *ExcelBridge) ProcessChatMessage(clientID string, message websocket.ChatMessage) (*websocket.ChatResponse, error) {
	// Get or create session
	session := eb.getOrCreateSession(clientID, message.SessionID)
	
	// Build context for AI
	msgContext := eb.buildContext(session, message.Context)
	
	// Process with AI if available
	var content string
	var suggestions []string
	var actions []websocket.ProposedAction
	
	if eb.aiService != nil {
		eb.logger.Info("AI service is available, processing message")
		
		// Add user message to history
		eb.chatHistory.AddMessage(session.ID, "user", message.Content)
		
		// Build comprehensive context using context builder
		var financialContext *ai.FinancialContext
		if eb.contextBuilder != nil && session.Selection.SelectedRange != "" {
			ctx := context.Background()
			builtContext, err := eb.contextBuilder.BuildContext(ctx, session.ID, session.Selection.SelectedRange)
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
		eb.logger.Info("Calling ProcessChatWithToolsAndHistory for session", "session_id", session.ID, "history_length", len(aiHistory))
		response, err := eb.aiService.ProcessChatWithToolsAndHistory(ctx, session.ID, message.Content, financialContext, aiHistory)
		if err != nil {
			eb.logger.WithError(err).Error("AI processing failed")
			content = "I encountered an error processing your request. Please try again."
		} else {
			content = response.Content
			// Add AI response to history
			eb.chatHistory.AddMessage(session.ID, "assistant", content)
			
			// Convert AI actions to websocket actions
			actions = eb.convertAIActions(response.Actions)
			
			// Only detect additional actions if no tools were used
			if len(response.ToolCalls) == 0 {
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
	
	response := &websocket.ChatResponse{
		Content:     content,
		Suggestions: suggestions,
		Actions:     actions,
		SessionID:   session.ID,
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
func (eb *ExcelBridge) UpdateCell(update websocket.CellUpdate) error {
	key := fmt.Sprintf("%s!%s", update.Sheet, update.Cell)
	
	// Update cache
	eb.cacheMutex.Lock()
	eb.cellCache[key] = update.Value
	eb.cacheMutex.Unlock()
	
	// Broadcast update to subscribers
	eb.hub.BroadcastToAll(websocket.MessageTypeCellValueUpdate, update)
	
	return nil
}

// UpdateRange updates range values and notifies subscribers
func (eb *ExcelBridge) UpdateRange(rangeData websocket.RangeData) error {
	key := fmt.Sprintf("%s!%s", rangeData.Sheet, rangeData.Range)
	
	// Update cache
	eb.cacheMutex.Lock()
	eb.rangeCache[key] = rangeData.Values
	eb.cacheMutex.Unlock()
	
	// Broadcast update to subscribers
	eb.hub.BroadcastToAll(websocket.MessageTypeRangeDataUpdate, rangeData)
	
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
		UserID:       clientID,  // TODO: This should be actual user ID when auth is implemented
		ClientID:     clientID,  // Store the client ID to enable direct messaging
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

func (eb *ExcelBridge) detectRequestedActions(message string, context map[string]interface{}) []websocket.ProposedAction {
	var actions []websocket.ProposedAction
	
	// Detect formula creation requests
	if contains(message, []string{"create formula", "write formula", "sum", "average", "calculate"}) {
		action := websocket.ProposedAction{
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
		action := websocket.ProposedAction{
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

// buildFinancialContext converts session context to AI financial context
func (eb *ExcelBridge) buildFinancialContext(session *ExcelSession, additionalContext map[string]interface{}) *ai.FinancialContext {
	context := &ai.FinancialContext{
		CellValues:      make(map[string]interface{}),
		Formulas:        make(map[string]string),
		RecentChanges:   make([]ai.CellChange, 0),
		DocumentContext: make([]string, 0),
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

	// Extract selection information - handle both websocket.SelectionChanged and string formats
	if selection, ok := additionalContext["selection"].(websocket.SelectionChanged); ok {
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
	
	// Extract selected data if available
	if selectedData, ok := additionalContext["selectedData"].(map[string]interface{}); ok {
		if values, ok := selectedData["values"].([]interface{}); ok {
			// Convert 2D array to cell map
			if address, ok := selectedData["address"].(string); ok {
				eb.processCellData(context, values, address)
			}
		}
		if formulas, ok := selectedData["formulas"].([]interface{}); ok {
			// Process formulas similarly
			if address, ok := selectedData["address"].(string); ok {
				eb.processFormulaData(context, formulas, address)
			}
		}
	}
	
	// Extract nearby data if available
	if nearbyData, ok := additionalContext["nearbyData"].(map[string]interface{}); ok {
		if values, ok := nearbyData["values"].([]interface{}); ok {
			if address, ok := nearbyData["address"].(string); ok {
				eb.processCellData(context, values, address)
			}
		}
	}

	// Add cached data
	eb.addCachedDataToFinancialContext(context, session)

	// Detect model type based on content
	if context.ModelType == "" {
		context.ModelType = eb.detectModelType(context)
	}

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

// convertAIActions converts AI actions to websocket actions
func (eb *ExcelBridge) convertAIActions(aiActions []ai.Action) []websocket.ProposedAction {
	actions := make([]websocket.ProposedAction, len(aiActions))
	
	for i, aiAction := range aiActions {
		actions[i] = websocket.ProposedAction{
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
func (eb *ExcelBridge) ApplyChanges(ctx context.Context, userID, previewID string, changeIDs []string) (*websocket.ApplyChangesResponse, error) {
	// In a real implementation, this would:
	// 1. Retrieve the preview from storage
	// 2. Validate that the user has permission
	// 3. Apply each approved change
	// 4. Create a backup point
	// 5. Update the audit trail
	
	response := &websocket.ApplyChangesResponse{
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
	// baseAddress format: "Sheet1!A1:C10" or "A1:C10"
	parts := strings.Split(baseAddress, "!")
	rangeStr := parts[len(parts)-1]
	
	// Parse range (simplified - assumes format like "A1:C10")
	rangeParts := strings.Split(rangeStr, ":")
	if len(rangeParts) != 2 {
		eb.logger.WithField("address", baseAddress).Warn("Invalid range format")
		return
	}
	
	startCell := rangeParts[0]
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
	
	rangeParts := strings.Split(rangeStr, ":")
	if len(rangeParts) != 2 {
		eb.logger.WithField("address", baseAddress).Warn("Invalid range format for formulas")
		return
	}
	
	startCell := rangeParts[0]
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
		colStr = string('A'+remainder) + colStr
		col = (col - 1) / 26
	}
	
	// Return cell address
	return fmt.Sprintf("%s%d", colStr, row+1)
}