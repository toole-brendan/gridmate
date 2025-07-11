package services

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/gridmate/backend/internal/services/ai"
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
	
	// Active sessions
	sessions      map[string]*ExcelSession
	sessionMutex  sync.RWMutex
}

// ExcelSession represents an active Excel session
type ExcelSession struct {
	ID            string
	UserID        string
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
	}

	bridge := &ExcelBridge{
		hub:        hub,
		logger:     logger,
		cellCache:  make(map[string]interface{}),
		rangeCache: make(map[string][][]interface{}),
		aiService:  aiService,
		sessions:   make(map[string]*ExcelSession),
	}
	
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

// ProcessChatMessage processes a chat message from a client
func (eb *ExcelBridge) ProcessChatMessage(clientID string, message websocket.ChatMessage) (*websocket.ChatResponse, error) {
	// Get or create session
	session := eb.getOrCreateSession(clientID, message.SessionID)
	
	// Build context for AI
	context := eb.buildContext(session, message.Context)
	
	// Process with AI if available
	var content string
	var suggestions []string
	var actions []websocket.ProposedAction
	var err error
	
	if eb.aiService != nil {
		// Create financial context for AI
		financialContext := eb.buildFinancialContext(session, message.Context)
		
		// Process chat message with AI
		ctx := context.Background()
		response, err := eb.aiService.ProcessChatMessage(ctx, message.Content, financialContext)
		if err != nil {
			eb.logger.WithError(err).Error("AI processing failed")
			content = "I encountered an error processing your request. Please try again."
		} else {
			content = response.Content
			// Convert AI actions to websocket actions
			actions = eb.convertAIActions(response.Actions)
		}
	} else {
		// Fallback response when AI service is not available
		content = eb.generateFallbackResponse(message.Content, context)
		suggestions = eb.generateFallbackSuggestions(context)
	}
	
	// Merge AI actions with any additional detected actions
	if additionalActions := eb.detectRequestedActions(message.Content, context); len(additionalActions) > 0 {
		actions = append(actions, additionalActions...)
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
		return session
	}
	
	session := &ExcelSession{
		ID:           sessionID,
		Context:      make(map[string]interface{}),
		LastActivity: time.Now(),
	}
	
	eb.sessions[sessionID] = session
	return session
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

	// Extract selection information
	if selection, ok := additionalContext["selection"].(websocket.SelectionChanged); ok {
		if selection.SelectedRange != "" {
			context.SelectedRange = selection.SelectedRange
		} else if selection.SelectedCell != "" {
			context.SelectedRange = selection.SelectedCell
		}
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