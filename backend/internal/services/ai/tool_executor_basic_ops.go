package ai

import (
	"context"
	"fmt"
)

// executeReadRange handles reading data from Excel
func (te *ToolExecutor) executeReadRange(ctx context.Context, sessionID string, input map[string]interface{}) (*RangeData, error) {
	rangeAddr, _ := input["range_address"].(string)
	includeFormulas, _ := input["include_formulas"].(bool)
	includeFormatting, _ := input["include_formatting"].(bool)

	if rangeAddr == "" {
		return nil, fmt.Errorf("range_address is required")
	}

	return te.excelBridge.ReadRange(ctx, sessionID, rangeAddr, includeFormulas, includeFormatting)
}

// executeWriteRange handles writing data to Excel
func (te *ToolExecutor) executeWriteRange(ctx context.Context, sessionID string, input map[string]interface{}) error {
	rangeAddr, _ := input["range_address"].(string)
	values, _ := input["values"].([][]interface{})
	preserveFormatting, _ := input["preserve_formatting"].(bool)

	if rangeAddr == "" {
		return fmt.Errorf("range_address is required")
	}
	if len(values) == 0 {
		return fmt.Errorf("values array is required and cannot be empty")
	}

	// Check if we need to expand values to match the range
	expandedValues, err := expandValuesToMatchRange(rangeAddr, values)
	if err != nil {
		return err
	}

	return te.excelBridge.WriteRange(ctx, sessionID, rangeAddr, expandedValues, preserveFormatting)
}

// executeApplyFormula handles applying formulas to cells
func (te *ToolExecutor) executeApplyFormula(ctx context.Context, sessionID string, input map[string]interface{}) error {
	rangeAddr, _ := input["range_address"].(string)
	formula, _ := input["formula"].(string)
	relativeRefs, _ := input["relative_references"].(bool)

	if rangeAddr == "" {
		return fmt.Errorf("range_address is required")
	}
	if formula == "" {
		return fmt.Errorf("formula is required")
	}

	// Validate formula before applying
	if err := te.validateFormulaBeforeApplication(ctx, sessionID, formula, rangeAddr); err != nil {
		return fmt.Errorf("formula validation failed: %w", err)
	}

	return te.excelBridge.ApplyFormula(ctx, sessionID, rangeAddr, formula, relativeRefs)
}

// executeAnalyzeData handles data analysis operations
func (te *ToolExecutor) executeAnalyzeData(ctx context.Context, sessionID string, input map[string]interface{}) (*DataAnalysis, error) {
	rangeAddr, _ := input["range_address"].(string)
	includeStats, _ := input["include_stats"].(bool)
	detectHeaders, _ := input["detect_headers"].(bool)

	if rangeAddr == "" {
		return nil, fmt.Errorf("range_address is required")
	}

	return te.excelBridge.AnalyzeData(ctx, sessionID, rangeAddr, includeStats, detectHeaders)
}

// executeFormatRange handles cell formatting
func (te *ToolExecutor) executeFormatRange(ctx context.Context, sessionID string, input map[string]interface{}) error {
	rangeAddr, _ := input["range_address"].(string)
	if rangeAddr == "" {
		return fmt.Errorf("range_address is required")
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

	return te.excelBridge.FormatRange(ctx, sessionID, rangeAddr, format)
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
	rangeAddr, _ := input["range_address"].(string)
	if rangeAddr == "" {
		rangeAddr = "A1:Z100" // Default range
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
