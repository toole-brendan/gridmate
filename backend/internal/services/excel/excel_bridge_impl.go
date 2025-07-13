package excel

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"
	"github.com/gridmate/backend/internal/services/ai"
	"github.com/gridmate/backend/internal/websocket"
)

// BridgeImpl implements the ExcelBridge interface for AI tool execution
type BridgeImpl struct {
	hub *websocket.Hub
}

// NewBridgeImpl creates a new Excel bridge implementation
func NewBridgeImpl(hub *websocket.Hub) *BridgeImpl {
	return &BridgeImpl{
		hub: hub,
	}
}

// sendToolRequest sends a tool request to the Excel client and waits for response
func (b *BridgeImpl) sendToolRequest(ctx context.Context, sessionID string, request map[string]interface{}) (interface{}, error) {
	// Generate unique request ID
	requestID := uuid.New().String()
	request["request_id"] = requestID

	// Create response channel
	respChan := make(chan interface{}, 1)
	errChan := make(chan error, 1)

	// Register response handler
	b.hub.RegisterToolHandler(sessionID, requestID, func(response interface{}, err error) {
		if err != nil {
			errChan <- err
		} else {
			respChan <- response
		}
	})
	defer b.hub.UnregisterToolHandler(sessionID, requestID)

	// Send request to client
	message, err := websocket.NewMessage(websocket.MessageTypeToolRequest, request)
	if err != nil {
		return nil, fmt.Errorf("failed to create message: %w", err)
	}

	log.Info().
		Str("session_id", sessionID).
		Str("request_id", requestID).
		Interface("request", request).
		Msg("Sending tool request via WebSocket")

	if err := b.hub.SendToSession(sessionID, *message); err != nil {
		return nil, fmt.Errorf("failed to send tool request: %w", err)
	}

	// Wait for response with timeout
	select {
	case response := <-respChan:
		return response, nil
	case err := <-errChan:
		return nil, err
	case <-ctx.Done():
		return nil, ctx.Err()
	case <-time.After(30 * time.Second):
		return nil, fmt.Errorf("tool request timeout")
	}
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

	_, err := b.sendToolRequest(ctx, sessionID, request)
	return err
}

// ApplyFormula applies a formula to cells
func (b *BridgeImpl) ApplyFormula(ctx context.Context, sessionID string, rangeAddr string, formula string, relativeRefs bool) error {
	request := map[string]interface{}{
		"tool":                "apply_formula",
		"range":               rangeAddr,
		"formula":             formula,
		"relative_references": relativeRefs,
	}

	_, err := b.sendToolRequest(ctx, sessionID, request)
	return err
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

	_, err := b.sendToolRequest(ctx, sessionID, request)
	return err
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

	_, err := b.sendToolRequest(ctx, sessionID, request)
	return err
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

	_, err := b.sendToolRequest(ctx, sessionID, request)
	return err
}

// InsertRowsColumns inserts rows or columns in Excel
func (b *BridgeImpl) InsertRowsColumns(ctx context.Context, sessionID string, position string, count int, insertType string) error {
	request := map[string]interface{}{
		"tool":     "insert_rows_columns",
		"position": position,
		"count":    count,
		"type":     insertType,
	}

	_, err := b.sendToolRequest(ctx, sessionID, request)
	return err
}