package ai

import (
	"context"
	"fmt"

	"github.com/rs/zerolog/log"
)

// executeReadRange handles reading data from Excel
func (te *ToolExecutor) executeReadRange(ctx context.Context, sessionID string, input map[string]interface{}) (*RangeData, error) {
	// Log all input parameters for debugging
	log.Debug().
		Str("session_id", sessionID).
		Interface("input", input).
		Msg("executeReadRange called with input")

	rangeAddr, _ := input["range"].(string)
	includeFormulas, _ := input["include_formulas"].(bool)
	includeFormatting, _ := input["include_formatting"].(bool)

	if rangeAddr == "" {
		log.Error().
			Interface("input", input).
			Msg("Range parameter is missing or empty")
		return nil, fmt.Errorf("range is required")
	}

	log.Info().
		Str("session_id", sessionID).
		Str("range", rangeAddr).
		Bool("include_formulas", includeFormulas).
		Bool("include_formatting", includeFormatting).
		Msg("Executing read range")

	result, err := te.excelBridge.ReadRange(ctx, sessionID, rangeAddr, includeFormulas, includeFormatting)
	if err != nil {
		return nil, err
	}

	return result, nil
}

// executeWriteRange handles writing data to Excel
func (te *ToolExecutor) executeWriteRange(ctx context.Context, sessionID string, input map[string]interface{}) error {
	// Log all input parameters for debugging
	log.Debug().
		Str("session_id", sessionID).
		Interface("input", input).
		Msg("executeWriteRange called with input")

	rangeAddr, _ := input["range"].(string)
	values, ok := input["values"].([][]interface{})
	preserveFormatting, _ := input["preserve_formatting"].(bool)

	// Get tool ID from input if available
	toolID, _ := input["_tool_id"].(string)
	if toolID != "" {
		ctx = context.WithValue(ctx, "tool_id", toolID)
	}

	if rangeAddr == "" {
		log.Error().
			Interface("input", input).
			Msg("Range parameter is missing or empty")
		return fmt.Errorf("range is required")
	}

	// Handle values with better type checking and error messages
	var valuesToWrite [][]interface{}
	if ok {
		valuesToWrite = values
	} else if valuesRaw, exists := input["values"]; exists {
		// Try direct conversion first
		if vals, ok := valuesRaw.([][]interface{}); ok {
			valuesToWrite = vals
		} else if vals, ok := valuesRaw.([]interface{}); ok {
			// Handle case where outer array exists
			valuesToWrite = make([][]interface{}, len(vals))
			for i, row := range vals {
				if rowArray, ok := row.([]interface{}); ok {
					valuesToWrite[i] = rowArray
				} else {
					log.Error().
						Interface("row", row).
						Int("index", i).
						Msg("Invalid row format in values array")
					return fmt.Errorf("values must be a 2D array - row %d is not an array", i)
				}
			}
		} else {
			log.Error().
				Interface("values_type", fmt.Sprintf("%T", valuesRaw)).
				Interface("values_raw", valuesRaw).
				Msg("Values parameter has incorrect type")
			return fmt.Errorf("values must be a 2D array ([][]interface{}), got %T", valuesRaw)
		}
	} else {
		log.Error().
			Interface("input", input).
			Msg("Values parameter is missing")
		return fmt.Errorf("values parameter is required")
	}

	if len(valuesToWrite) == 0 {
		log.Error().
			Interface("input", input).
			Msg("Values array is empty")
		return fmt.Errorf("values array cannot be empty")
	}

	// Validate that we have a proper 2D array
	if len(valuesToWrite[0]) == 0 {
		log.Error().
			Interface("values", valuesToWrite).
			Msg("First row of values array is empty")
		return fmt.Errorf("values array rows cannot be empty")
	}

	// Check if values are incorrectly triple-nested (common AI mistake)
	firstValue := valuesToWrite[0][0]
	if arr, isArray := firstValue.([]interface{}); isArray && len(valuesToWrite) == 1 && len(valuesToWrite[0]) == 1 {
		log.Warn().
			Interface("detected_structure", arr).
			Msg("Detected triple-nested array, attempting to flatten")
		// Flatten triple-nested array [[["value"]]] to [["value"]]
		if len(arr) > 0 {
			valuesToWrite = [][]interface{}{arr}
			log.Info().
				Interface("corrected_values", valuesToWrite).
				Msg("Corrected triple-nested array to proper 2D array")
		}
	}

	log.Info().
		Str("session_id", sessionID).
		Str("range", rangeAddr).
		Int("rows", len(valuesToWrite)).
		Int("cols", len(valuesToWrite[0])).
		Bool("preserve_formatting", preserveFormatting).
		Interface("first_value", valuesToWrite[0][0]).
		Msg("Executing write range")

	// Store previous values for undo functionality
	var previousValues [][]interface{}
	isUndo, _ := input["_is_undo"].(bool)
	if !isUndo { // Only capture previous state for non-undo operations
		prevData, err := te.excelBridge.ReadRange(ctx, sessionID, rangeAddr, false, false)
		if err == nil && prevData != nil && prevData.Values != nil {
			previousValues = prevData.Values
		}
	}

	// Check if we need to expand values to match the range
	expandedValues, err := expandValuesToMatchRange(rangeAddr, valuesToWrite)
	if err != nil {
		return err
	}

	// Add preview mode to context if present
	if previewMode, ok := input["preview_mode"].(bool); ok && previewMode {
		ctx = context.WithValue(ctx, "preview_mode", true)
	}

	// Execute the write
	err = te.excelBridge.WriteRange(ctx, sessionID, rangeAddr, expandedValues, preserveFormatting)

	// If successful and we have queued registry, update the operation result with previous values
	if err == nil && te.queuedOpsRegistry != nil && previousValues != nil {
		// Store previous values in the operation result for undo
		if registry, ok := te.queuedOpsRegistry.(interface {
			UpdateOperationResult(string, interface{}) error
		}); ok {
			result := map[string]interface{}{
				"success":         true,
				"previous_values": previousValues,
			}
			// Try to update the result - we'll need the operation ID from somewhere
			// This is a limitation we'll address in the next iteration
			_ = registry.UpdateOperationResult(sessionID, result)
		}
	}

	return err
}

// executeApplyFormula handles applying formulas to cells
func (te *ToolExecutor) executeApplyFormula(ctx context.Context, sessionID string, input map[string]interface{}) error {
	// Log all input parameters for debugging
	log.Debug().
		Str("session_id", sessionID).
		Interface("input", input).
		Msg("executeApplyFormula called with input")

	rangeAddr, _ := input["range"].(string)
	formula, _ := input["formula"].(string)
	relativeRefs, _ := input["relative_references"].(bool)

	// Get tool ID from input if available
	toolID, _ := input["_tool_id"].(string)
	if toolID != "" {
		ctx = context.WithValue(ctx, "tool_id", toolID)
	}

	if rangeAddr == "" || formula == "" {
		log.Error().
			Interface("input", input).
			Msg("Range or formula parameter is missing or empty")
		return fmt.Errorf("range and formula are required")
	}

	log.Info().
		Str("session_id", sessionID).
		Str("range", rangeAddr).
		Str("formula", formula).
		Bool("relative_refs", relativeRefs).
		Msg("Executing apply formula")

	// Store previous formula for undo functionality
	var previousFormula string
	isUndo, _ := input["_is_undo"].(bool)
	if !isUndo { // Only capture previous state for non-undo operations
		prevData, err := te.excelBridge.ReadRange(ctx, sessionID, rangeAddr, true, false)
		if err == nil && prevData != nil && prevData.Formulas != nil &&
			len(prevData.Formulas) > 0 && len(prevData.Formulas[0]) > 0 {
			if formula, ok := prevData.Formulas[0][0].(string); ok {
				previousFormula = formula
			}
		}
	}

	// Validate formula before applying
	if err := te.validateFormulaBeforeApplication(ctx, sessionID, formula, rangeAddr); err != nil {
		return fmt.Errorf("formula validation failed: %w", err)
	}

	// Add preview mode to context if present
	if previewMode, ok := input["preview_mode"].(bool); ok && previewMode {
		ctx = context.WithValue(ctx, "preview_mode", true)
	}

	// Execute the formula application
	err := te.excelBridge.ApplyFormula(ctx, sessionID, rangeAddr, formula, relativeRefs)

	// If successful and we have queued registry, update the operation result with previous formula
	if err == nil && te.queuedOpsRegistry != nil && previousFormula != "" {
		// Store previous formula in the operation result for undo
		if registry, ok := te.queuedOpsRegistry.(interface {
			UpdateOperationResult(string, interface{}) error
		}); ok {
			result := map[string]interface{}{
				"success":          true,
				"previous_formula": previousFormula,
			}
			// Try to update the result
			_ = registry.UpdateOperationResult(sessionID, result)
		}
	}

	return err
}

// executeAnalyzeData handles data analysis operations
func (te *ToolExecutor) executeAnalyzeData(ctx context.Context, sessionID string, input map[string]interface{}) (*DataAnalysis, error) {
	// Log all input parameters for debugging
	log.Debug().
		Str("session_id", sessionID).
		Interface("input", input).
		Msg("executeAnalyzeData called with input")

	rangeAddr, _ := input["range"].(string)
	includeStats, _ := input["include_stats"].(bool)
	detectHeaders, _ := input["detect_headers"].(bool)

	if rangeAddr == "" {
		log.Error().
			Interface("input", input).
			Msg("Range parameter is missing or empty")
		return nil, fmt.Errorf("range is required")
	}

	log.Info().
		Str("session_id", sessionID).
		Str("range", rangeAddr).
		Bool("include_stats", includeStats).
		Bool("detect_headers", detectHeaders).
		Msg("Executing analyze data")

	return te.excelBridge.AnalyzeData(ctx, sessionID, rangeAddr, includeStats, detectHeaders)
}

// executeFormatRange handles cell formatting
func (te *ToolExecutor) executeFormatRange(ctx context.Context, sessionID string, input map[string]interface{}) error {
	// Log all input parameters for debugging
	log.Debug().
		Str("session_id", sessionID).
		Interface("input", input).
		Msg("executeFormatRange called with input")

	// Get tool ID from input if available
	toolID, _ := input["_tool_id"].(string)
	if toolID != "" {
		ctx = context.WithValue(ctx, "tool_id", toolID)
	}

	rangeAddr, _ := input["range"].(string)
	if rangeAddr == "" {
		log.Error().
			Interface("input", input).
			Msg("Range parameter is missing or empty")
		return fmt.Errorf("range is required")
	}

	log.Info().
		Str("session_id", sessionID).
		Str("range", rangeAddr).
		Msg("Executing format range")

	// Store previous format for undo functionality (simplified for now)
	// In a real implementation, we'd capture the actual previous format
	var previousFormat map[string]interface{}
	isUndo, _ := input["_is_undo"].(bool)
	if !isUndo {
		// For now, just store that there was a previous format
		// A full implementation would read the current format
		previousFormat = map[string]interface{}{
			"number_format": "General",
		}
	}

	// Build format from input
	format := &CellFormat{}

	// Handle number format
	if numFmt, ok := input["number_format"].(string); ok {
		format.NumberFormat = numFmt
	}

	// Handle font properties
	var fontStyle *FontStyle
	if bold, ok := input["bold"].(bool); ok && bold {
		if fontStyle == nil {
			fontStyle = &FontStyle{}
		}
		fontStyle.Bold = bold
	}
	if italic, ok := input["italic"].(bool); ok && italic {
		if fontStyle == nil {
			fontStyle = &FontStyle{}
		}
		fontStyle.Italic = italic
	}
	if fontColor, ok := input["font_color"].(string); ok && fontColor != "" {
		if fontStyle == nil {
			fontStyle = &FontStyle{}
		}
		fontStyle.Color = fontColor
	}
	if fontStyle != nil {
		format.Font = fontStyle
	}

	// Handle fill color
	if bgColor, ok := input["background_color"].(string); ok && bgColor != "" {
		format.FillColor = bgColor
	}

	// Handle alignment
	if align, ok := input["alignment"].(string); ok && align != "" {
		format.Alignment = &Alignment{
			Horizontal: align,
		}
	}

	// Add preview mode to context if present
	if previewMode, ok := input["preview_mode"].(bool); ok && previewMode {
		ctx = context.WithValue(ctx, "preview_mode", true)
	}

	// Execute the format operation
	err := te.excelBridge.FormatRange(ctx, sessionID, rangeAddr, format)

	// If successful and we have queued registry, update the operation result
	if err == nil && te.queuedOpsRegistry != nil && previousFormat != nil {
		if registry, ok := te.queuedOpsRegistry.(interface {
			UpdateOperationResult(string, interface{}) error
		}); ok {
			result := map[string]interface{}{
				"success":         true,
				"previous_format": previousFormat,
			}
			_ = registry.UpdateOperationResult(sessionID, result)
		}
	}

	return err
}

// executeCreateChart handles chart creation
func (te *ToolExecutor) executeCreateChart(ctx context.Context, sessionID string, input map[string]interface{}) error {
	chartType, _ := input["chart_type"].(string)
	dataRange, _ := input["data_range"].(string)
	chartTitle, _ := input["chart_title"].(string)
	position, _ := input["position"].(string)

	if chartType == "" || dataRange == "" {
		return fmt.Errorf("chart_type and data_range are required")
	}

	config := &ChartConfig{
		ChartType:     chartType,
		DataRange:     dataRange,
		Title:         chartTitle,
		Position:      position,
		IncludeLegend: true,
	}

	return te.excelBridge.CreateChart(ctx, sessionID, config)
}

// executeGetNamedRanges retrieves named ranges
func (te *ToolExecutor) executeGetNamedRanges(ctx context.Context, sessionID string, input map[string]interface{}) ([]NamedRange, error) {
	scope, _ := input["scope"].(string)
	if scope == "" {
		scope = "workbook"
	}
	return te.excelBridge.GetNamedRanges(ctx, sessionID, scope)
}

// executeCreateNamedRange creates a new named range
func (te *ToolExecutor) executeCreateNamedRange(ctx context.Context, sessionID string, input map[string]interface{}) error {
	name, _ := input["name"].(string)
	rangeAddr, _ := input["range_address"].(string)

	if name == "" || rangeAddr == "" {
		return fmt.Errorf("name and range_address are required")
	}

	return te.excelBridge.CreateNamedRange(ctx, sessionID, name, rangeAddr)
}

// executeInsertRowsColumns inserts rows or columns
func (te *ToolExecutor) executeInsertRowsColumns(ctx context.Context, sessionID string, input map[string]interface{}) error {
	position, _ := input["position"].(string)
	count := 1
	if c, ok := input["count"].(float64); ok {
		count = int(c)
	}
	insertType, _ := input["type"].(string)

	if position == "" || insertType == "" {
		return fmt.Errorf("position and type are required")
	}

	if insertType != "rows" && insertType != "columns" {
		return fmt.Errorf("type must be 'rows' or 'columns'")
	}

	return te.excelBridge.InsertRowsColumns(ctx, sessionID, position, count, insertType)
}

// executeValidateModel validates the financial model
func (te *ToolExecutor) executeValidateModel(ctx context.Context, sessionID string, input map[string]interface{}) (*ValidationResult, error) {
	// Log all input parameters for debugging
	log.Debug().
		Str("session_id", sessionID).
		Interface("input", input).
		Msg("executeValidateModel called with input")

	rangeAddr, _ := input["range"].(string)
	if rangeAddr == "" {
		rangeAddr = "A1:Z100" // Default range
		log.Debug().Msg("Using default range A1:Z100")
	}

	checks := &ValidationChecks{
		CheckCircularRefs:       true,
		CheckFormulaConsistency: true,
		CheckErrors:             true,
	}

	// Override defaults with input
	if cr, ok := input["check_circular_refs"].(bool); ok {
		checks.CheckCircularRefs = cr
	}
	if fc, ok := input["check_formula_consistency"].(bool); ok {
		checks.CheckFormulaConsistency = fc
	}
	if ce, ok := input["check_errors"].(bool); ok {
		checks.CheckErrors = ce
	}

	return te.excelBridge.ValidateModel(ctx, sessionID, rangeAddr, checks)
}
