package excel

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/gridmate/backend/internal/services/ai"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
)

// BridgeImpl implements the ExcelBridge interface for AI tool execution
type BridgeImpl struct {
	getClientID   func(sessionID string) string
	signalRBridge interface{}
	logger        zerolog.Logger
	// Tool handlers for managing async responses
	toolHandlers map[string]map[string]func(interface{}, error)
	handlerMutex sync.RWMutex
	// Response queue for handling late-arriving responses
	responseQueue map[string]*queuedResponse
	queueMutex    sync.RWMutex
	// Request ID mapper for tracking tool IDs
	requestIDMapper interface{} // Will be set to *services.RequestIDMapper
}

// queuedResponse represents a response waiting for a handler
type queuedResponse struct {
	response  interface{}
	err       error
	timestamp time.Time
}

// NewBridgeImpl creates a new Excel bridge implementation
func NewBridgeImpl() *BridgeImpl {
	b := &BridgeImpl{
		logger:        log.With().Str("component", "excel_bridge").Logger(),
		toolHandlers:  make(map[string]map[string]func(interface{}, error)),
		responseQueue: make(map[string]*queuedResponse),
	}
	// Start cleanup routine for stale queued responses
	go b.cleanupQueuedResponses()
	return b
}

// SetClientIDResolver sets a function to resolve session ID to client ID
func (b *BridgeImpl) SetClientIDResolver(resolver func(sessionID string) string) {
	b.getClientID = resolver
}

// SetSignalRBridge sets the SignalR bridge for sending tool requests
func (b *BridgeImpl) SetSignalRBridge(bridge interface{}) {
	b.signalRBridge = bridge
}

// SetRequestIDMapper sets the request ID mapper for tracking tool IDs
func (b *BridgeImpl) SetRequestIDMapper(mapper interface{}) {
	b.requestIDMapper = mapper
}

// sendToolRequest sends a tool request to the Excel client and waits for response
func (b *BridgeImpl) sendToolRequest(ctx context.Context, sessionID string, request map[string]interface{}) (interface{}, error) {
	// Generate unique request ID
	requestID := uuid.New().String()
	request["request_id"] = requestID

	// Check if we have a tool ID to track
	if toolID, ok := ctx.Value("tool_id").(string); ok && toolID != "" && b.requestIDMapper != nil {
		// Register the mapping
		if mapper, ok := b.requestIDMapper.(interface {
			RegisterMapping(requestID, toolID string)
		}); ok {
			mapper.RegisterMapping(requestID, toolID)
			log.Info().
				Str("request_id", requestID).
				Str("tool_id", toolID).
				Msg("Registered request ID to tool ID mapping")
		}
	}

	// Get client ID for routing
	clientID := sessionID
	log.Debug().
		Str("session_id", sessionID).
		Str("initial_client_id", clientID).
		Bool("has_client_id_resolver", b.getClientID != nil).
		Msg("Starting client ID resolution")

	if b.getClientID != nil {
		resolvedClientID := b.getClientID(sessionID)
		log.Debug().
			Str("session_id", sessionID).
			Str("resolved_client_id", resolvedClientID).
			Msg("Client ID resolved via resolver function")

		if resolvedClientID == "" {
			log.Error().
				Str("session_id", sessionID).
				Msg("Client ID resolver returned empty string")
			return nil, fmt.Errorf("no active client for session %s", sessionID)
		}
		clientID = resolvedClientID
	}

	log.Info().
		Str("session_id", sessionID).
		Str("final_client_id", clientID).
		Str("request_id", requestID).
		Bool("session_equals_client", sessionID == clientID).
		Msg("Final client ID resolution for tool request")

	// Create response channel
	respChan := make(chan interface{}, 1)
	errChan := make(chan error, 1)

	// Register response handler with BOTH sessionID and clientID for resilience
	log.Info().
		Str("session_id", sessionID).
		Str("client_id", clientID).
		Str("request_id", requestID).
		Msg("Registering tool handler for response")

	handler := func(response interface{}, err error) {
		log.Info().
			Str("session_id", sessionID).
			Str("client_id", clientID).
			Str("request_id", requestID).
			Bool("has_error", err != nil).
			Interface("response", response).
			Msg("Tool handler received response")

		if err != nil {
			errChan <- err
		} else {
			// Always send the response to the channel
			respChan <- response
		}
	}

	// Register with both sessionID and clientID to handle reconnections
	b.RegisterToolHandler(sessionID, requestID, handler)
	b.RegisterToolHandler(clientID, requestID, handler)

	// Create a cleanup function that will only be called when we get a final response
	cleanup := func() {
		log.Debug().
			Str("session_id", sessionID).
			Str("client_id", clientID).
			Str("request_id", requestID).
			Msg("Unregistering tool handler after final response")
		b.UnregisterToolHandler(sessionID, requestID)
		b.UnregisterToolHandler(clientID, requestID)
	}

	// Set up a timeout cleanup in case we never get a response
	timeoutTimer := time.AfterFunc(5*time.Minute, func() {
		log.Warn().
			Str("session_id", sessionID).
			Str("client_id", clientID).
			Str("request_id", requestID).
			Msg("Cleaning up stale tool handler after 5 minute timeout")
		cleanup()
	})

	// Always use SignalR for tool requests
	if b.signalRBridge != nil {
		log.Info().
			Str("session_id", sessionID).
			Str("request_id", requestID).
			Msg("Sending tool request via SignalR bridge")

		// Send tool request via SignalR
		// Cast to the interface with SendToolRequest method
		type signalRBridge interface {
			SendToolRequest(sessionID string, toolRequest interface{}) error
		}

		if bridge, ok := b.signalRBridge.(signalRBridge); ok {
			if err := bridge.SendToolRequest(sessionID, request); err != nil {
				return nil, fmt.Errorf("failed to send tool request via SignalR: %w", err)
			}
		} else {
			return nil, fmt.Errorf("SignalR bridge does not implement SendToolRequest method")
		}

		// Wait for response with timeout
		select {
		case response := <-respChan:
			// Check if this is a queued response
			if respMap, ok := response.(map[string]interface{}); ok {
				if status, ok := respMap["status"].(string); ok && status == "queued" {
					// For queued responses, DON'T cleanup handlers - we need them for the actual response
					log.Info().
						Str("session_id", sessionID).
						Str("request_id", requestID).
						Msg("Tool queued for user approval - keeping handler active")
					// Cancel the timeout timer since we got a response
					timeoutTimer.Stop()
					// Don't cleanup - keep handlers active for the actual response
					// Return enhanced queued response
					enhancedResponse := map[string]interface{}{
						"status":  "queued_for_preview",
						"message": "Tool queued for visual diff preview",
						"preview": true,
					}

					// Include original operations if available
					if operations, ok := request["operations"]; ok {
						enhancedResponse["operations"] = operations
					}

					return enhancedResponse, nil
				}
			}
			// This is a final response, cleanup handlers
			timeoutTimer.Stop()
			cleanup()

			// Check if this is a read_range response before returning
			if tool, ok := request["tool"].(string); ok && tool == "read_range" {
				// It's a read_range response, so we need to filter it.
				jsonData, err := json.Marshal(response)
				if err != nil {
					// Log the error but return the original response
					log.Error().Err(err).Msg("Failed to marshal read_range response for filtering")
					return response, nil
				}

				var rangeData ai.RangeData
				if err := json.Unmarshal(jsonData, &rangeData); err != nil {
					// Log the error but return the original response
					log.Error().Err(err).Msg("Failed to unmarshal read_range response for filtering")
					return response, nil
				}

				// Filter the data and return the result
				return filterEmptyRows(&rangeData), nil
			}

			// For all other tools, return the response as-is
			return response, nil
		case err := <-errChan:
			timeoutTimer.Stop()
			cleanup()
			return nil, err
		case <-time.After(300 * time.Second):
			// Don't cleanup here - the 5 minute timer will handle it
			return nil, fmt.Errorf("tool request timeout after 300 seconds")
		case <-ctx.Done():
			timeoutTimer.Stop()
			cleanup()
			return nil, ctx.Err()
		}
	} else {
		log.Warn().
			Str("session_id", sessionID).
			Msg("SignalR bridge not initialized")
		return nil, fmt.Errorf("SignalR bridge not available")
	}
}

// filterEmptyRows removes trailing empty rows from spreadsheet data to reduce payload size
func filterEmptyRows(data *ai.RangeData) *ai.RangeData {
	if data == nil || len(data.Values) == 0 {
		return data
	}

	filtered := &ai.RangeData{
		Address:    data.Address,
		ColCount:   data.ColCount,
		RowCount:   0,
		Values:     [][]interface{}{},
		Formulas:   [][]interface{}{},
		Formatting: [][]ai.CellFormat{},
	}

	lastNonEmptyRow := -1

	// Find last non-empty row by checking from the end
	for i := len(data.Values) - 1; i >= 0; i-- {
		row := data.Values[i]
		hasContent := false
		for _, cell := range row {
			// Check if cell has any content (not nil and not empty string)
			if cell != nil && cell != "" {
				hasContent = true
				break
			}
		}
		if hasContent {
			lastNonEmptyRow = i
			break
		}
	}

	// If all rows are empty, return minimal data
	if lastNonEmptyRow == -1 {
		filtered.RowCount = 0
		log.Debug().
			Str("address", data.Address).
			Int("original_rows", len(data.Values)).
			Msg("All rows are empty, returning empty dataset")
		return filtered
	}

	// Copy only up to last non-empty row
	filtered.Values = data.Values[:lastNonEmptyRow+1]
	if data.Formulas != nil && len(data.Formulas) > 0 {
		filtered.Formulas = data.Formulas[:lastNonEmptyRow+1]
	}
	if data.Formatting != nil && len(data.Formatting) > 0 {
		filtered.Formatting = data.Formatting[:lastNonEmptyRow+1]
	}
	filtered.RowCount = lastNonEmptyRow + 1

	// Log the filtering result
	if filtered.RowCount < len(data.Values) {
		log.Info().
			Str("address", data.Address).
			Int("original_rows", len(data.Values)).
			Int("filtered_rows", filtered.RowCount).
			Int("removed_rows", len(data.Values)-filtered.RowCount).
			Msg("Filtered empty rows from range data")
	}

	return filtered
}

// ReadRange reads cell values from Excel
func (b *BridgeImpl) ReadRange(ctx context.Context, sessionID string, rangeAddr string, includeFormulas, includeFormatting bool) (*ai.RangeData, error) {
	request := map[string]interface{}{
		"tool":               "read_range",
		"range":              rangeAddr,
		"include_formulas":   includeFormulas,
		"include_formatting": includeFormatting,
	}

	response, err := b.sendToolRequest(ctx, sessionID, request)
	if err != nil {
		return nil, err
	}

	// Convert response to RangeData
	jsonData, err := json.Marshal(response)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal response: %w", err)
	}

	var rangeData ai.RangeData
	if err := json.Unmarshal(jsonData, &rangeData); err != nil {
		return nil, fmt.Errorf("failed to unmarshal range data: %w", err)
	}

	return &rangeData, nil
}

// WriteRange writes values to Excel
func (b *BridgeImpl) WriteRange(ctx context.Context, sessionID string, rangeAddr string, values [][]interface{}, preserveFormatting bool) error {
	request := map[string]interface{}{
		"tool":                "write_range",
		"range":               rangeAddr,
		"values":              values,
		"preserve_formatting": preserveFormatting,
	}

	// Check if preview mode is set in context
	if previewMode, ok := ctx.Value("preview_mode").(bool); ok && previewMode {
		request["preview"] = true
	}

	// Check if we have edit tracking info in context
	if editInfo, ok := ctx.Value("edit_tracking_info").(map[string]interface{}); ok {
		request["edit_tracking_info"] = editInfo
		b.logger.Debug().
			Str("range", rangeAddr).
			Bool("has_old_values", editInfo["old_values"] != nil).
			Msg("Including rich edit tracking info in write request")
	}

	response, err := b.sendToolRequest(ctx, sessionID, request)
	if err != nil {
		return err
	}

	// Check if the response indicates the tool was queued
	if respMap, ok := response.(map[string]interface{}); ok {
		if status, ok := respMap["status"].(string); ok && (status == "queued" || status == "queued_for_preview") {
			// Return a special error that can be handled by the tool executor
			return fmt.Errorf("Tool execution queued for user approval")
		}
	}

	return nil
}

// ApplyFormula applies a formula to cells
func (b *BridgeImpl) ApplyFormula(ctx context.Context, sessionID string, rangeAddr string, formula string, relativeRefs bool) error {
	request := map[string]interface{}{
		"tool":                "apply_formula",
		"range":               rangeAddr,
		"formula":             formula,
		"relative_references": relativeRefs,
	}

	// Check if preview mode is set in context
	if previewMode, ok := ctx.Value("preview_mode").(bool); ok && previewMode {
		request["preview"] = true
	}

	response, err := b.sendToolRequest(ctx, sessionID, request)
	if err != nil {
		return err
	}

	// Check if the response indicates the tool was queued
	if respMap, ok := response.(map[string]interface{}); ok {
		if status, ok := respMap["status"].(string); ok && (status == "queued" || status == "queued_for_preview") {
			// Return a special error that can be handled by the tool executor
			return fmt.Errorf("Tool execution queued for user approval")
		}
	}

	return nil
}

// AnalyzeData analyzes data in a range
func (b *BridgeImpl) AnalyzeData(ctx context.Context, sessionID string, rangeAddr string, includeStats, detectHeaders bool) (*ai.DataAnalysis, error) {
	request := map[string]interface{}{
		"tool":               "analyze_data",
		"range":              rangeAddr,
		"include_statistics": includeStats,
		"detect_headers":     detectHeaders,
	}

	response, err := b.sendToolRequest(ctx, sessionID, request)
	if err != nil {
		return nil, err
	}

	// Convert response to DataAnalysis
	jsonData, err := json.Marshal(response)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal response: %w", err)
	}

	var analysis ai.DataAnalysis
	if err := json.Unmarshal(jsonData, &analysis); err != nil {
		return nil, fmt.Errorf("failed to unmarshal data analysis: %w", err)
	}

	return &analysis, nil
}

// FormatRange applies formatting to cells
func (b *BridgeImpl) FormatRange(ctx context.Context, sessionID string, rangeAddr string, format *ai.CellFormat) error {
	b.logger.Info().
		Str("sessionID", sessionID).
		Str("range", rangeAddr).
		Interface("format", format).
		Msg("FormatRange called")

	// Validate format before sending
	validator := NewFormatValidator()
	if err := validator.ValidateFormat(format); err != nil {
		b.logger.Error().
			Err(err).
			Str("sessionID", sessionID).
			Str("range", rangeAddr).
			Interface("format", format).
			Msg("Format validation failed")
		return fmt.Errorf("format validation failed: %w", err)
	}

	request := map[string]interface{}{
		"tool":  "format_range",
		"range": rangeAddr,
	}

	// Add format properties if provided
	if format != nil {
		if format.NumberFormat != "" {
			request["number_format"] = format.NumberFormat
		}
		if format.Font != nil {
			request["font"] = map[string]interface{}{
				"bold":   format.Font.Bold,
				"italic": format.Font.Italic,
				"size":   format.Font.Size,
				"color":  format.Font.Color,
			}
		}
		if format.FillColor != "" {
			request["fill_color"] = format.FillColor
		}
		if format.Alignment != nil {
			request["alignment"] = map[string]interface{}{
				"horizontal": format.Alignment.Horizontal,
				"vertical":   format.Alignment.Vertical,
			}
		}
	}

	// Check if preview mode is set in context
	if previewMode, ok := ctx.Value("preview_mode").(bool); ok && previewMode {
		request["preview"] = true
	}

	b.logger.Info().
		Interface("request", request).
		Msg("Sending format_range request to frontend")

	response, err := b.sendToolRequest(ctx, sessionID, request)
	if err != nil {
		return err
	}

	// Check if the response indicates the tool was queued
	if respMap, ok := response.(map[string]interface{}); ok {
		if status, ok := respMap["status"].(string); ok && (status == "queued" || status == "queued_for_preview") {
			// Return a special error that can be handled by the tool executor
			return fmt.Errorf("Tool execution queued for user approval")
		}
	}

	return nil
}

// CreateChart creates a chart in Excel
func (b *BridgeImpl) CreateChart(ctx context.Context, sessionID string, config *ai.ChartConfig) error {
	request := map[string]interface{}{
		"tool":           "create_chart",
		"data_range":     config.DataRange,
		"chart_type":     config.ChartType,
		"title":          config.Title,
		"position":       config.Position,
		"include_legend": config.IncludeLegend,
	}

	response, err := b.sendToolRequest(ctx, sessionID, request)
	if err != nil {
		return err
	}

	// Check if the response indicates the tool was queued
	if respMap, ok := response.(map[string]interface{}); ok {
		if status, ok := respMap["status"].(string); ok && (status == "queued" || status == "queued_for_preview") {
			// Return a special error that can be handled by the tool executor
			return fmt.Errorf("Tool execution queued for user approval")
		}
	}

	return nil
}

// ValidateModel validates the Excel model
func (b *BridgeImpl) ValidateModel(ctx context.Context, sessionID string, rangeAddr string, checks *ai.ValidationChecks) (*ai.ValidationResult, error) {
	request := map[string]interface{}{
		"tool":                      "validate_model",
		"range":                     rangeAddr,
		"check_circular_refs":       checks.CheckCircularRefs,
		"check_formula_consistency": checks.CheckFormulaConsistency,
		"check_errors":              checks.CheckErrors,
	}

	response, err := b.sendToolRequest(ctx, sessionID, request)
	if err != nil {
		return nil, err
	}

	// Convert response to ValidationResult
	jsonData, err := json.Marshal(response)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal response: %w", err)
	}

	var result ai.ValidationResult
	if err := json.Unmarshal(jsonData, &result); err != nil {
		return nil, fmt.Errorf("failed to unmarshal validation result: %w", err)
	}

	return &result, nil
}

// GetNamedRanges gets named ranges from Excel
func (b *BridgeImpl) GetNamedRanges(ctx context.Context, sessionID string, scope string) ([]ai.NamedRange, error) {
	request := map[string]interface{}{
		"tool":  "get_named_ranges",
		"scope": scope,
	}

	response, err := b.sendToolRequest(ctx, sessionID, request)
	if err != nil {
		return nil, err
	}

	// Convert response to []NamedRange
	jsonData, err := json.Marshal(response)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal response: %w", err)
	}

	var namedRanges []ai.NamedRange
	if err := json.Unmarshal(jsonData, &namedRanges); err != nil {
		return nil, fmt.Errorf("failed to unmarshal named ranges: %w", err)
	}

	return namedRanges, nil
}

// CreateNamedRange creates a named range in Excel
func (b *BridgeImpl) CreateNamedRange(ctx context.Context, sessionID string, name, rangeAddr string) error {
	request := map[string]interface{}{
		"tool":  "create_named_range",
		"name":  name,
		"range": rangeAddr,
	}

	response, err := b.sendToolRequest(ctx, sessionID, request)
	if err != nil {
		return err
	}

	// Check if the response indicates the tool was queued
	if respMap, ok := response.(map[string]interface{}); ok {
		if status, ok := respMap["status"].(string); ok && (status == "queued" || status == "queued_for_preview") {
			// Return a special error that can be handled by the tool executor
			return fmt.Errorf("Tool execution queued for user approval")
		}
	}

	return nil
}

// InsertRowsColumns inserts rows or columns in Excel
func (b *BridgeImpl) InsertRowsColumns(ctx context.Context, sessionID string, position string, count int, insertType string) error {
	request := map[string]interface{}{
		"tool":     "insert_rows_columns",
		"position": position,
		"count":    count,
		"type":     insertType,
	}

	response, err := b.sendToolRequest(ctx, sessionID, request)
	if err != nil {
		return err
	}

	// Check if the response indicates the tool was queued
	if respMap, ok := response.(map[string]interface{}); ok {
		if status, ok := respMap["status"].(string); ok && (status == "queued" || status == "queued_for_preview") {
			// Return a special error that can be handled by the tool executor
			return fmt.Errorf("Tool execution queued for user approval")
		}
	}

	return nil
}

// RegisterToolHandler registers a handler for tool responses
func (b *BridgeImpl) RegisterToolHandler(sessionID, requestID string, handler func(interface{}, error)) {
	b.handlerMutex.Lock()
	defer b.handlerMutex.Unlock()

	if b.toolHandlers[sessionID] == nil {
		b.toolHandlers[sessionID] = make(map[string]func(interface{}, error))
	}
	b.toolHandlers[sessionID][requestID] = handler

	// Check if there's a queued response waiting for this handler
	b.queueMutex.Lock()
	defer b.queueMutex.Unlock()

	queueKey := sessionID + ":" + requestID
	if queued, ok := b.responseQueue[queueKey]; ok {
		// Response arrived before handler, deliver it now
		b.logger.Info().
			Str("session_id", sessionID).
			Str("request_id", requestID).
			Msg("Delivering queued response to newly registered handler")

		// Deliver response asynchronously to avoid deadlock
		go handler(queued.response, queued.err)

		// Remove from queue
		delete(b.responseQueue, queueKey)
	}
}

// UnregisterToolHandler removes a tool handler
func (b *BridgeImpl) UnregisterToolHandler(sessionID, requestID string) {
	b.handlerMutex.Lock()
	defer b.handlerMutex.Unlock()

	if handlers, ok := b.toolHandlers[sessionID]; ok {
		delete(handlers, requestID)
		if len(handlers) == 0 {
			delete(b.toolHandlers, sessionID)
		}
	}
}

// HandleToolResponse handles incoming tool responses from SignalR
func (b *BridgeImpl) HandleToolResponse(sessionID, requestID string, response interface{}, err error) {
	b.handlerMutex.RLock()

	// Try to find handler by sessionID first
	if handlers, ok := b.toolHandlers[sessionID]; ok {
		if handler, ok := handlers[requestID]; ok {
			b.handlerMutex.RUnlock()
			handler(response, err)
			return
		}
	}
	b.handlerMutex.RUnlock()

	// No handler found - queue the response
	b.queueMutex.Lock()
	defer b.queueMutex.Unlock()

	queueKey := sessionID + ":" + requestID
	b.responseQueue[queueKey] = &queuedResponse{
		response:  response,
		err:       err,
		timestamp: time.Now(),
	}

	b.logger.Warn().
		Str("session_id", sessionID).
		Str("request_id", requestID).
		Msg("No handler found for tool response - queuing for later delivery")
}

// cleanupQueuedResponses removes stale queued responses
func (b *BridgeImpl) cleanupQueuedResponses() {
	ticker := time.NewTicker(1 * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		b.queueMutex.Lock()

		now := time.Now()
		for key, queued := range b.responseQueue {
			// Remove responses older than 5 minutes
			if now.Sub(queued.timestamp) > 5*time.Minute {
				b.logger.Debug().
					Str("key", key).
					Dur("age", now.Sub(queued.timestamp)).
					Msg("Removing stale queued response")
				delete(b.responseQueue, key)
			}
		}

		b.queueMutex.Unlock()
	}
}

// GetSession returns a session (placeholder implementation)
func (b *BridgeImpl) GetSession(sessionID string) *ai.Session {
	// TODO: Implement actual session retrieval logic
	// For now, return nil or a basic session
	return nil
}
