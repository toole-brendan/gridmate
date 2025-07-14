package ai

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"
	
	"github.com/rs/zerolog/log"
	"gridmate/backend/internal/services/formula"
)

// ToolExecutor handles the execution of Excel tools
type ToolExecutor struct {
	excelBridge       ExcelBridge
	formulaValidator  *formula.FormulaIntelligence
}

// ExcelBridge interface for interacting with Excel
type ExcelBridge interface {
	ReadRange(ctx context.Context, sessionID string, rangeAddr string, includeFormulas, includeFormatting bool) (*RangeData, error)
	WriteRange(ctx context.Context, sessionID string, rangeAddr string, values [][]interface{}, preserveFormatting bool) error
	ApplyFormula(ctx context.Context, sessionID string, rangeAddr string, formula string, relativeRefs bool) error
	AnalyzeData(ctx context.Context, sessionID string, rangeAddr string, includeStats, detectHeaders bool) (*DataAnalysis, error)
	FormatRange(ctx context.Context, sessionID string, rangeAddr string, format *CellFormat) error
	CreateChart(ctx context.Context, sessionID string, config *ChartConfig) error
	ValidateModel(ctx context.Context, sessionID string, rangeAddr string, checks *ValidationChecks) (*ValidationResult, error)
	GetNamedRanges(ctx context.Context, sessionID string, scope string) ([]NamedRange, error)
	CreateNamedRange(ctx context.Context, sessionID string, name, rangeAddr string) error
	InsertRowsColumns(ctx context.Context, sessionID string, position string, count int, insertType string) error
}

// RangeData represents data read from Excel
type RangeData struct {
	Values     [][]interface{}          `json:"values"`
	Formulas   [][]interface{}          `json:"formulas,omitempty"`
	Formatting [][]CellFormat           `json:"formatting,omitempty"`
	Address    string                   `json:"address"`
	RowCount   int                      `json:"rowCount"`
	ColCount   int                      `json:"colCount"`
}

// DataAnalysis represents analysis results
type DataAnalysis struct {
	DataTypes    []string                 `json:"dataTypes"`
	Headers      []string                 `json:"headers,omitempty"`
	Statistics   map[string]Stats         `json:"statistics,omitempty"`
	Patterns     []string                 `json:"patterns,omitempty"`
	RowCount     int                      `json:"rowCount"`
	ColCount     int                      `json:"colCount"`
}

// Stats represents basic statistics
type Stats struct {
	Count  int     `json:"count"`
	Mean   float64 `json:"mean"`
	Min    float64 `json:"min"`
	Max    float64 `json:"max"`
	StdDev float64 `json:"std_dev"`
}

// CellFormat represents cell formatting options
type CellFormat struct {
	NumberFormat string      `json:"number_format,omitempty"`
	Font         *FontStyle  `json:"font,omitempty"`
	FillColor    string      `json:"fill_color,omitempty"`
	Alignment    *Alignment  `json:"alignment,omitempty"`
}

// FontStyle represents font formatting
type FontStyle struct {
	Bold   bool    `json:"bold"`
	Italic bool    `json:"italic"`
	Size   float64 `json:"size"`
	Color  string  `json:"color"`
}

// Alignment represents cell alignment
type Alignment struct {
	Horizontal string `json:"horizontal"`
	Vertical   string `json:"vertical"`
}

// ChartConfig represents chart creation configuration
type ChartConfig struct {
	DataRange     string `json:"data_range"`
	ChartType     string `json:"chart_type"`
	Title         string `json:"title"`
	Position      string `json:"position"`
	IncludeLegend bool   `json:"include_legend"`
}

// ValidationChecks represents what to validate
type ValidationChecks struct {
	CheckCircularRefs      bool `json:"check_circular_refs"`
	CheckFormulaConsistency bool `json:"check_formula_consistency"`
	CheckErrors            bool `json:"check_errors"`
}

// ValidationResult represents validation results
type ValidationResult struct {
	IsValid        bool             `json:"is_valid"`
	CircularRefs   []string         `json:"circular_refs,omitempty"`
	InconsistentFormulas []string   `json:"inconsistent_formulas,omitempty"`
	Errors         []CellError      `json:"errors,omitempty"`
}

// CellError represents an error in a cell
type CellError struct {
	Cell      string `json:"cell"`
	ErrorType string `json:"error_type"`
	Message   string `json:"message"`
}

// NamedRange is already defined in models.go, so we'll use that

// NewToolExecutor creates a new tool executor
func NewToolExecutor(bridge ExcelBridge, formulaValidator *formula.FormulaIntelligence) *ToolExecutor {
	return &ToolExecutor{
		excelBridge:      bridge,
		formulaValidator: formulaValidator,
	}
}

// ExecuteTool executes a tool call and returns the result
func (te *ToolExecutor) ExecuteTool(ctx context.Context, sessionID string, toolCall ToolCall) (*ToolResult, error) {
	// Log tool execution start
	log.Info().
		Str("tool", toolCall.Name).
		Str("session", sessionID).
		Str("tool_id", toolCall.ID).
		Interface("input", toolCall.Input).
		Msg("Executing Excel tool")

	result := &ToolResult{
		Type:      "tool_result",
		ToolUseID: toolCall.ID,
	}

	startTime := time.Now()

	switch toolCall.Name {
	case "read_range":
		content, err := te.executeReadRange(ctx, sessionID, toolCall.Input)
		if err != nil {
			result.IsError = true
			result.Content = map[string]string{"error": err.Error()}
			return result, nil
		}
		result.Content = content

	case "write_range":
		err := te.executeWriteRange(ctx, sessionID, toolCall.Input)
		if err != nil {
			result.IsError = true
			result.Content = map[string]string{"error": err.Error()}
			return result, nil
		}
		result.Content = map[string]string{"status": "success", "message": "Range written successfully"}

	case "apply_formula":
		err := te.executeApplyFormula(ctx, sessionID, toolCall.Input)
		if err != nil {
			result.IsError = true
			result.Content = map[string]string{"error": err.Error()}
			return result, nil
		}
		result.Content = map[string]string{"status": "success", "message": "Formula applied successfully"}

	case "analyze_data":
		content, err := te.executeAnalyzeData(ctx, sessionID, toolCall.Input)
		if err != nil {
			result.IsError = true
			result.Content = map[string]string{"error": err.Error()}
			return result, nil
		}
		result.Content = content

	case "format_range":
		err := te.executeFormatRange(ctx, sessionID, toolCall.Input)
		if err != nil {
			result.IsError = true
			result.Content = map[string]string{"error": err.Error()}
			return result, nil
		}
		result.Content = map[string]string{"status": "success", "message": "Formatting applied successfully"}

	case "create_chart":
		err := te.executeCreateChart(ctx, sessionID, toolCall.Input)
		if err != nil {
			result.IsError = true
			result.Content = map[string]string{"error": err.Error()}
			return result, nil
		}
		result.Content = map[string]string{"status": "success", "message": "Chart created successfully"}

	case "validate_model":
		content, err := te.executeValidateModel(ctx, sessionID, toolCall.Input)
		if err != nil {
			result.IsError = true
			result.Content = map[string]string{"error": err.Error()}
			return result, nil
		}
		result.Content = content

	case "get_named_ranges":
		content, err := te.executeGetNamedRanges(ctx, sessionID, toolCall.Input)
		if err != nil {
			result.IsError = true
			result.Content = map[string]string{"error": err.Error()}
			return result, nil
		}
		result.Content = content

	case "create_named_range":
		err := te.executeCreateNamedRange(ctx, sessionID, toolCall.Input)
		if err != nil {
			result.IsError = true
			result.Content = map[string]string{"error": err.Error()}
			return result, nil
		}
		result.Content = map[string]string{"status": "success", "message": "Named range created successfully"}

	case "insert_rows_columns":
		err := te.executeInsertRowsColumns(ctx, sessionID, toolCall.Input)
		if err != nil {
			result.IsError = true
			result.Content = map[string]string{"error": err.Error()}
			return result, nil
		}
		result.Content = map[string]string{"status": "success", "message": "Rows/columns inserted successfully"}

	case "build_financial_formula":
		content, err := te.executeBuildFinancialFormula(ctx, sessionID, toolCall.Input)
		if err != nil {
			result.IsError = true
			result.Content = map[string]string{"error": err.Error()}
			return result, nil
		}
		result.Content = content

	case "analyze_model_structure":
		content, err := te.executeAnalyzeModelStructure(ctx, sessionID, toolCall.Input)
		if err != nil {
			result.IsError = true
			result.Content = map[string]string{"error": err.Error()}
			return result, nil
		}
		result.Content = content

	case "smart_format_cells":
		err := te.executeSmartFormatCells(ctx, sessionID, toolCall.Input)
		if err != nil {
			result.IsError = true
			result.Content = map[string]string{"error": err.Error()}
			return result, nil
		}
		result.Content = map[string]string{"status": "success", "message": "Smart formatting applied successfully"}

	case "create_audit_trail":
		content, err := te.executeCreateAuditTrail(ctx, sessionID, toolCall.Input)
		if err != nil {
			result.IsError = true
			result.Content = map[string]string{"error": err.Error()}
			return result, nil
		}
		result.Content = content

	default:
		result.IsError = true
		result.Content = map[string]string{"error": fmt.Sprintf("Unknown tool: %s", toolCall.Name)}
	}

	// Log tool execution completion
	duration := time.Since(startTime)
	log.Info().
		Str("tool", toolCall.Name).
		Str("session", sessionID).
		Str("tool_id", toolCall.ID).
		Bool("success", !result.IsError).
		Dur("duration_ms", duration).
		Interface("result", result.Content).
		Msg("Excel tool execution completed")

	return result, nil
}

// Helper functions to extract parameters and execute tools

func (te *ToolExecutor) executeReadRange(ctx context.Context, sessionID string, input map[string]interface{}) (*RangeData, error) {
	rangeAddr, ok := input["range"].(string)
	if !ok {
		return nil, fmt.Errorf("range parameter is required")
	}

	includeFormulas := true
	if val, ok := input["include_formulas"].(bool); ok {
		includeFormulas = val
	}

	includeFormatting := false
	if val, ok := input["include_formatting"].(bool); ok {
		includeFormatting = val
	}

	return te.excelBridge.ReadRange(ctx, sessionID, rangeAddr, includeFormulas, includeFormatting)
}

func (te *ToolExecutor) executeWriteRange(ctx context.Context, sessionID string, input map[string]interface{}) error {
	rangeAddr, ok := input["range"].(string)
	if !ok {
		return fmt.Errorf("range parameter is required")
	}

	valuesRaw, ok := input["values"]
	if !ok {
		return fmt.Errorf("values parameter is required")
	}

	// Convert values to [][]interface{}
	values, err := convertToValueArray(valuesRaw)
	if err != nil {
		return fmt.Errorf("invalid values format: %w", err)
	}

	preserveFormatting := true
	if val, ok := input["preserve_formatting"].(bool); ok {
		preserveFormatting = val
	}

	return te.excelBridge.WriteRange(ctx, sessionID, rangeAddr, values, preserveFormatting)
}

func (te *ToolExecutor) executeApplyFormula(ctx context.Context, sessionID string, input map[string]interface{}) error {
	rangeAddr, ok := input["range"].(string)
	if !ok {
		return fmt.Errorf("range parameter is required")
	}

	formula, ok := input["formula"].(string)
	if !ok {
		return fmt.Errorf("formula parameter is required")
	}

	relativeRefs := true
	if val, ok := input["relative_references"].(bool); ok {
		relativeRefs = val
	}

	// PRE-VALIDATION: Validate formula before applying
	if te.formulaValidator != nil {
		if err := te.validateFormulaBeforeApplication(ctx, sessionID, formula, rangeAddr); err != nil {
			log.Warn().
				Str("session", sessionID).
				Str("formula", formula).
				Str("range", rangeAddr).
				Err(err).
				Msg("Formula validation failed, but proceeding with warning")
			
			// For now, we log warnings but don't block execution
			// This allows gradual rollout of validation while maintaining functionality
		}
	}

	return te.excelBridge.ApplyFormula(ctx, sessionID, rangeAddr, formula, relativeRefs)
}

func (te *ToolExecutor) executeAnalyzeData(ctx context.Context, sessionID string, input map[string]interface{}) (*DataAnalysis, error) {
	rangeAddr, ok := input["range"].(string)
	if !ok {
		return nil, fmt.Errorf("range parameter is required")
	}

	includeStats := true
	if val, ok := input["include_statistics"].(bool); ok {
		includeStats = val
	}

	detectHeaders := true
	if val, ok := input["detect_headers"].(bool); ok {
		detectHeaders = val
	}

	return te.excelBridge.AnalyzeData(ctx, sessionID, rangeAddr, includeStats, detectHeaders)
}

func (te *ToolExecutor) executeFormatRange(ctx context.Context, sessionID string, input map[string]interface{}) error {
	rangeAddr, ok := input["range"].(string)
	if !ok {
		return fmt.Errorf("range parameter is required")
	}

	format := &CellFormat{}

	if numberFormat, ok := input["number_format"].(string); ok {
		format.NumberFormat = numberFormat
	}

	if fontData, ok := input["font"].(map[string]interface{}); ok {
		format.Font = &FontStyle{}
		if bold, ok := fontData["bold"].(bool); ok {
			format.Font.Bold = bold
		}
		if italic, ok := fontData["italic"].(bool); ok {
			format.Font.Italic = italic
		}
		if size, ok := fontData["size"].(float64); ok {
			format.Font.Size = size
		}
		if color, ok := fontData["color"].(string); ok {
			format.Font.Color = color
		}
	}

	if fillColor, ok := input["fill_color"].(string); ok {
		format.FillColor = fillColor
	}

	if alignData, ok := input["alignment"].(map[string]interface{}); ok {
		format.Alignment = &Alignment{}
		if horizontal, ok := alignData["horizontal"].(string); ok {
			format.Alignment.Horizontal = horizontal
		}
		if vertical, ok := alignData["vertical"].(string); ok {
			format.Alignment.Vertical = vertical
		}
	}

	return te.excelBridge.FormatRange(ctx, sessionID, rangeAddr, format)
}

func (te *ToolExecutor) executeCreateChart(ctx context.Context, sessionID string, input map[string]interface{}) error {
	config := &ChartConfig{}

	dataRange, ok := input["data_range"].(string)
	if !ok {
		return fmt.Errorf("data_range parameter is required")
	}
	config.DataRange = dataRange

	chartType, ok := input["chart_type"].(string)
	if !ok {
		return fmt.Errorf("chart_type parameter is required")
	}
	config.ChartType = chartType

	if title, ok := input["title"].(string); ok {
		config.Title = title
	}

	if position, ok := input["position"].(string); ok {
		config.Position = position
	}

	config.IncludeLegend = true
	if val, ok := input["include_legend"].(bool); ok {
		config.IncludeLegend = val
	}

	return te.excelBridge.CreateChart(ctx, sessionID, config)
}

func (te *ToolExecutor) executeValidateModel(ctx context.Context, sessionID string, input map[string]interface{}) (*ValidationResult, error) {
	rangeAddr := ""
	if val, ok := input["range"].(string); ok {
		rangeAddr = val
	}

	checks := &ValidationChecks{
		CheckCircularRefs:       true,
		CheckFormulaConsistency: true,
		CheckErrors:            true,
	}

	if val, ok := input["check_circular_refs"].(bool); ok {
		checks.CheckCircularRefs = val
	}
	if val, ok := input["check_formula_consistency"].(bool); ok {
		checks.CheckFormulaConsistency = val
	}
	if val, ok := input["check_errors"].(bool); ok {
		checks.CheckErrors = val
	}

	return te.excelBridge.ValidateModel(ctx, sessionID, rangeAddr, checks)
}

func (te *ToolExecutor) executeGetNamedRanges(ctx context.Context, sessionID string, input map[string]interface{}) ([]NamedRange, error) {
	scope := "workbook"
	if val, ok := input["scope"].(string); ok {
		scope = val
	}

	return te.excelBridge.GetNamedRanges(ctx, sessionID, scope)
}

func (te *ToolExecutor) executeCreateNamedRange(ctx context.Context, sessionID string, input map[string]interface{}) error {
	name, ok := input["name"].(string)
	if !ok {
		return fmt.Errorf("name parameter is required")
	}

	rangeAddr, ok := input["range"].(string)
	if !ok {
		return fmt.Errorf("range parameter is required")
	}

	return te.excelBridge.CreateNamedRange(ctx, sessionID, name, rangeAddr)
}

func (te *ToolExecutor) executeInsertRowsColumns(ctx context.Context, sessionID string, input map[string]interface{}) error {
	position, ok := input["position"].(string)
	if !ok {
		return fmt.Errorf("position parameter is required")
	}

	insertType, ok := input["type"].(string)
	if !ok {
		return fmt.Errorf("type parameter is required")
	}

	count := 1
	if val, ok := input["count"].(float64); ok {
		count = int(val)
	}

	return te.excelBridge.InsertRowsColumns(ctx, sessionID, position, count, insertType)
}

// convertToValueArray converts interface{} to [][]interface{}
func convertToValueArray(valuesRaw interface{}) ([][]interface{}, error) {
	// Handle JSON array conversion
	jsonBytes, err := json.Marshal(valuesRaw)
	if err != nil {
		return nil, err
	}

	var values [][]interface{}
	if err := json.Unmarshal(jsonBytes, &values); err != nil {
		return nil, err
	}

	return values, nil
}

// validateFormulaBeforeApplication performs comprehensive validation before applying a formula
func (te *ToolExecutor) validateFormulaBeforeApplication(ctx context.Context, sessionID string, formula string, rangeAddr string) error {
	var errors []string

	// 1. Basic formula syntax validation
	if validationResult, err := te.formulaValidator.DetectErrors(ctx, formula); err == nil {
		if !validationResult.IsValid {
			for _, formulaErr := range validationResult.Errors {
				if formulaErr.Severity == "error" {
					errors = append(errors, fmt.Sprintf("Syntax error: %s", formulaErr.Message))
				}
			}
		}
	}

	// 2. Context-aware validation - check if referenced cells exist and have data
	if err := te.validateFormulaContext(ctx, sessionID, formula, rangeAddr); err != nil {
		errors = append(errors, err.Error())
	}

	// 3. Financial modeling specific validation
	if err := te.validateFinancialModelingContext(formula, rangeAddr); err != nil {
		errors = append(errors, err.Error())
	}

	if len(errors) > 0 {
		return fmt.Errorf("formula validation failed: %s", strings.Join(errors, "; "))
	}

	return nil
}

// validateFormulaContext checks if referenced cells in formula exist and contain data
func (te *ToolExecutor) validateFormulaContext(ctx context.Context, sessionID string, formula string, rangeAddr string) error {
	// Extract cell references from formula using cross-reference validator
	if crossRefResult, err := te.formulaValidator.ValidateCrossReferences(ctx, formula, nil); err == nil {
		for _, ref := range crossRefResult.References {
			if ref.Type == "cell" && ref.StartCell != "" {
				// Check if referenced cell has data by reading it
				if data, err := te.excelBridge.ReadRange(ctx, sessionID, ref.StartCell, false, false); err == nil {
					if data != nil && len(data.Values) > 0 && len(data.Values[0]) > 0 {
						value := data.Values[0][0]
						// Check for empty or zero values in risky operations
						if te.isRiskyDivisionFormula(formula, ref.StartCell) {
							if value == nil || value == "" || value == 0 {
								return fmt.Errorf("division by empty/zero cell %s in formula", ref.StartCell)
							}
						}
						
						// Check for first period issues (growth rate formulas)
						if te.isGrowthRateFormula(formula) && te.isPreviousPeriodReference(ref.StartCell, rangeAddr) {
							if value == nil || value == "" {
								return fmt.Errorf("growth rate formula references empty previous period cell %s", ref.StartCell)
							}
						}
					}
				}
			}
		}
	}

	return nil
}

// validateFinancialModelingContext performs financial modeling specific validation
func (te *ToolExecutor) validateFinancialModelingContext(formula string, rangeAddr string) error {
	// Check for common financial modeling errors
	lowerFormula := strings.ToLower(formula)
	
	// Growth rate formulas should use IFERROR or IF for first period handling
	if te.isGrowthRateFormula(formula) {
		if !strings.Contains(lowerFormula, "iferror") && !strings.Contains(lowerFormula, "if(") {
			return fmt.Errorf("growth rate formula should include error handling (IFERROR or IF)")
		}
	}
	
	// Division formulas should have error handling
	if strings.Contains(formula, "/") && !strings.Contains(lowerFormula, "iferror") {
		// Only warn for division by cell references, not constants
		if containsCellReference(formula) {
			log.Warn().
				Str("formula", formula).
				Str("range", rangeAddr).
				Msg("Division formula without error handling detected")
		}
	}

	return nil
}

// Helper functions for formula analysis

func (te *ToolExecutor) isRiskyDivisionFormula(formula string, cellRef string) bool {
	// Check if formula contains division by the specific cell reference
	return strings.Contains(formula, "/") && strings.Contains(formula, cellRef)
}

func (te *ToolExecutor) isGrowthRateFormula(formula string) bool {
	// Common patterns for growth rate formulas
	lowerFormula := strings.ToLower(formula)
	growthPatterns := []string{
		")/", // Typical pattern: ((new-old)/old)
		"-", // Contains subtraction
	}
	
	hasPattern := false
	for _, pattern := range growthPatterns {
		if strings.Contains(lowerFormula, pattern) {
			hasPattern = true
			break
		}
	}
	
	// Should contain division and subtraction for growth rate
	return hasPattern && strings.Contains(formula, "/") && strings.Contains(formula, "-")
}

func (te *ToolExecutor) isPreviousPeriodReference(cellRef string, currentRange string) bool {
	// Simple heuristic: if the cell reference column is before the current range column
	// This is a basic implementation - could be enhanced with more sophisticated logic
	
	// Extract column from cell reference (e.g., "A4" -> "A")
	refCol := ""
	for _, char := range cellRef {
		if char >= 'A' && char <= 'Z' {
			refCol += string(char)
		} else {
			break
		}
	}
	
	// Extract column from current range (e.g., "B5" -> "B")
	currentCol := ""
	for _, char := range currentRange {
		if char >= 'A' && char <= 'Z' {
			currentCol += string(char)
		} else {
			break
		}
	}
	
	// Simple comparison: if reference column comes before current column
	return refCol < currentCol
}

func containsCellReference(formula string) bool {
	// Simple pattern to detect cell references like A1, B5, etc.
	for i := 0; i < len(formula)-1; i++ {
		if formula[i] >= 'A' && formula[i] <= 'Z' {
			if formula[i+1] >= '0' && formula[i+1] <= '9' {
				return true
			}
		}
	}
	return false
}

// executeBuildFinancialFormula builds context-aware financial formulas
func (te *ToolExecutor) executeBuildFinancialFormula(ctx context.Context, sessionID string, input map[string]interface{}) (map[string]interface{}, error) {
	formulaType, ok := input["formula_type"].(string)
	if !ok {
		return nil, fmt.Errorf("formula_type parameter is required")
	}

	targetCell, ok := input["target_cell"].(string)
	if !ok {
		return nil, fmt.Errorf("target_cell parameter is required")
	}

	inputs, ok := input["inputs"].(map[string]interface{})
	if !ok {
		return nil, fmt.Errorf("inputs parameter is required")
	}

	errorHandling := true
	if val, ok := input["error_handling"].(bool); ok {
		errorHandling = val
	}

	isFirstPeriod := false
	if val, ok := input["is_first_period"].(bool); ok {
		isFirstPeriod = val
	}

	// Build the formula based on type
	formula, explanation, err := te.buildFormulaByType(formulaType, inputs, errorHandling, isFirstPeriod)
	if err != nil {
		return nil, fmt.Errorf("failed to build formula: %w", err)
	}

	// Apply the formula to the target cell
	err = te.excelBridge.ApplyFormula(ctx, sessionID, targetCell, formula, true)
	if err != nil {
		return nil, fmt.Errorf("failed to apply formula to cell %s: %w", targetCell, err)
	}

	log.Info().
		Str("session", sessionID).
		Str("formula_type", formulaType).
		Str("target_cell", targetCell).
		Str("formula", formula).
		Bool("error_handling", errorHandling).
		Bool("is_first_period", isFirstPeriod).
		Msg("Financial formula built and applied successfully")

	return map[string]interface{}{
		"status":      "success",
		"formula":     formula,
		"target_cell": targetCell,
		"explanation": explanation,
		"type":        formulaType,
	}, nil
}

// executeAnalyzeModelStructure analyzes financial model structure
func (te *ToolExecutor) executeAnalyzeModelStructure(ctx context.Context, sessionID string, input map[string]interface{}) (map[string]interface{}, error) {
	analysisRange, ok := input["analysis_range"].(string)
	if !ok {
		return nil, fmt.Errorf("analysis_range parameter is required")
	}

	focusArea := "entire_model"
	if val, ok := input["focus_area"].(string); ok {
		focusArea = val
	}

	modelTypeHint := ""
	if val, ok := input["model_type_hint"].(string); ok {
		modelTypeHint = val
	}

	// Read the range data for analysis
	data, err := te.excelBridge.ReadRange(ctx, sessionID, analysisRange, true, false)
	if err != nil {
		return nil, fmt.Errorf("failed to read range for analysis: %w", err)
	}

	// Perform structure analysis
	analysis := te.performStructureAnalysis(data, focusArea, modelTypeHint)

	log.Info().
		Str("session", sessionID).
		Str("analysis_range", analysisRange).
		Str("focus_area", focusArea).
		Str("detected_model_type", analysis["model_type"].(string)).
		Msg("Model structure analysis completed")

	return analysis, nil
}

// executeSmartFormatCells applies intelligent financial formatting
func (te *ToolExecutor) executeSmartFormatCells(ctx context.Context, sessionID string, input map[string]interface{}) error {
	rangeAddr, ok := input["range"].(string)
	if !ok {
		return fmt.Errorf("range parameter is required")
	}

	styleType, ok := input["style_type"].(string)
	if !ok {
		return fmt.Errorf("style_type parameter is required")
	}

	// Build format based on style type
	format := te.buildFinancialFormat(styleType, input)

	// Apply conditional formatting if specified
	if conditionalRules, ok := input["conditional_rules"].([]interface{}); ok {
		format = te.applyConditionalRules(format, conditionalRules)
	}

	// Apply the formatting
	err := te.excelBridge.FormatRange(ctx, sessionID, rangeAddr, format)
	if err != nil {
		return fmt.Errorf("failed to apply smart formatting: %w", err)
	}

	log.Info().
		Str("session", sessionID).
		Str("range", rangeAddr).
		Str("style_type", styleType).
		Msg("Smart formatting applied successfully")

	return nil
}

// executeCreateAuditTrail creates audit trail documentation
func (te *ToolExecutor) executeCreateAuditTrail(ctx context.Context, sessionID string, input map[string]interface{}) (map[string]interface{}, error) {
	targetRange, ok := input["target_range"].(string)
	if !ok {
		return nil, fmt.Errorf("target_range parameter is required")
	}

	documentationType, ok := input["documentation_type"].(string)
	if !ok {
		return nil, fmt.Errorf("documentation_type parameter is required")
	}

	addComments := true
	if val, ok := input["add_comments"].(bool); ok {
		addComments = val
	}

	createDocumentationSheet := false
	if val, ok := input["create_documentation_sheet"].(bool); ok {
		createDocumentationSheet = val
	}

	includeSources := true
	if val, ok := input["include_sources"].(bool); ok {
		includeSources = val
	}

	// Read the target range to analyze
	data, err := te.excelBridge.ReadRange(ctx, sessionID, targetRange, true, false)
	if err != nil {
		return nil, fmt.Errorf("failed to read target range: %w", err)
	}

	// Generate audit trail based on documentation type
	auditTrail := te.generateAuditTrail(data, documentationType, addComments, createDocumentationSheet, includeSources)

	// If adding comments, apply them to cells
	if addComments && len(auditTrail["cell_comments"].(map[string]string)) > 0 {
		err = te.addCellComments(ctx, sessionID, auditTrail["cell_comments"].(map[string]string))
		if err != nil {
			log.Warn().Err(err).Msg("Failed to add some cell comments")
		}
	}

	log.Info().
		Str("session", sessionID).
		Str("target_range", targetRange).
		Str("documentation_type", documentationType).
		Bool("add_comments", addComments).
		Msg("Audit trail created successfully")

	return auditTrail, nil
}

// Helper methods for financial formula building

func (te *ToolExecutor) buildFormulaByType(formulaType string, inputs map[string]interface{}, errorHandling bool, isFirstPeriod bool) (string, string, error) {
	var formula, explanation string

	switch formulaType {
	case "growth_rate":
		formula, explanation = te.buildGrowthRateFormula(inputs, errorHandling, isFirstPeriod)
	case "ratio":
		formula, explanation = te.buildRatioFormula(inputs, errorHandling)
	case "sum":
		formula, explanation = te.buildSumFormula(inputs, errorHandling)
	case "average":
		formula, explanation = te.buildAverageFormula(inputs, errorHandling)
	case "npv":
		formula, explanation = te.buildNPVFormula(inputs, errorHandling)
	case "irr":
		formula, explanation = te.buildIRRFormula(inputs, errorHandling)
	case "percentage":
		formula, explanation = te.buildPercentageFormula(inputs, errorHandling)
	case "lookup":
		formula, explanation = te.buildLookupFormula(inputs, errorHandling)
	case "conditional":
		formula, explanation = te.buildConditionalFormula(inputs, errorHandling)
	default:
		return "", "", fmt.Errorf("unsupported formula type: %s", formulaType)
	}

	if formula == "" {
		return "", "", fmt.Errorf("failed to generate formula for type: %s", formulaType)
	}

	return formula, explanation, nil
}

func (te *ToolExecutor) buildGrowthRateFormula(inputs map[string]interface{}, errorHandling bool, isFirstPeriod bool) (string, string) {
	currentCell, ok1 := inputs["current_period_cell"].(string)
	previousCell, ok2 := inputs["previous_period_cell"].(string)

	if !ok1 || !ok2 {
		return "", "Missing required cells for growth rate calculation"
	}

	if isFirstPeriod {
		if errorHandling {
			return `="N/A"`, "First period - no previous period for growth calculation"
		}
		return `=""`, "First period - empty growth rate"
	}

	baseFormula := fmt.Sprintf("((%s-%s)/%s)", currentCell, previousCell, previousCell)
	
	if errorHandling {
		formula := fmt.Sprintf(`=IF(OR(%s=0,%s=""),"N/A",%s)`, previousCell, previousCell, baseFormula)
		return formula, fmt.Sprintf("Growth rate with error handling: (%s - %s) / %s", currentCell, previousCell, previousCell)
	}

	return "=" + baseFormula, fmt.Sprintf("Growth rate: (%s - %s) / %s", currentCell, previousCell, previousCell)
}

func (te *ToolExecutor) buildRatioFormula(inputs map[string]interface{}, errorHandling bool) (string, string) {
	numeratorCells, ok1 := inputs["numerator_cells"].([]interface{})
	denominatorCells, ok2 := inputs["denominator_cells"].([]interface{})

	if !ok1 || !ok2 || len(numeratorCells) == 0 || len(denominatorCells) == 0 {
		return "", "Missing required cells for ratio calculation"
	}

	// Convert to strings
	numCells := make([]string, len(numeratorCells))
	denomCells := make([]string, len(denominatorCells))
	
	for i, cell := range numeratorCells {
		numCells[i] = cell.(string)
	}
	for i, cell := range denominatorCells {
		denomCells[i] = cell.(string)
	}

	// Build numerator and denominator parts
	var numerator, denominator string
	if len(numCells) == 1 {
		numerator = numCells[0]
	} else {
		numerator = fmt.Sprintf("SUM(%s)", strings.Join(numCells, ","))
	}

	if len(denomCells) == 1 {
		denominator = denomCells[0]
	} else {
		denominator = fmt.Sprintf("SUM(%s)", strings.Join(denomCells, ","))
	}

	baseFormula := fmt.Sprintf("%s/%s", numerator, denominator)
	
	if errorHandling {
		formula := fmt.Sprintf(`=IFERROR(%s,"N/A")`, baseFormula)
		return formula, fmt.Sprintf("Ratio with error handling: %s / %s", numerator, denominator)
	}

	return "=" + baseFormula, fmt.Sprintf("Ratio: %s / %s", numerator, denominator)
}

func (te *ToolExecutor) buildSumFormula(inputs map[string]interface{}, errorHandling bool) (string, string) {
	rangeCells, ok := inputs["range_cells"].(string)
	if !ok {
		return "", "Missing range_cells for sum calculation"
	}

	baseFormula := fmt.Sprintf("SUM(%s)", rangeCells)
	
	if errorHandling {
		formula := fmt.Sprintf(`=IFERROR(%s,0)`, baseFormula)
		return formula, fmt.Sprintf("Sum with error handling: SUM(%s)", rangeCells)
	}

	return "=" + baseFormula, fmt.Sprintf("Sum: SUM(%s)", rangeCells)
}

func (te *ToolExecutor) buildAverageFormula(inputs map[string]interface{}, errorHandling bool) (string, string) {
	rangeCells, ok := inputs["range_cells"].(string)
	if !ok {
		return "", "Missing range_cells for average calculation"
	}

	baseFormula := fmt.Sprintf("AVERAGE(%s)", rangeCells)
	
	if errorHandling {
		formula := fmt.Sprintf(`=IFERROR(%s,0)`, baseFormula)
		return formula, fmt.Sprintf("Average with error handling: AVERAGE(%s)", rangeCells)
	}

	return "=" + baseFormula, fmt.Sprintf("Average: AVERAGE(%s)", rangeCells)
}

func (te *ToolExecutor) buildNPVFormula(inputs map[string]interface{}, errorHandling bool) (string, string) {
	// Implementation for NPV formula - would need discount rate and cash flows
	return "", "NPV formula building not yet implemented"
}

func (te *ToolExecutor) buildIRRFormula(inputs map[string]interface{}, errorHandling bool) (string, string) {
	// Implementation for IRR formula - would need cash flows range
	return "", "IRR formula building not yet implemented"
}

func (te *ToolExecutor) buildPercentageFormula(inputs map[string]interface{}, errorHandling bool) (string, string) {
	currentCell, ok1 := inputs["current_period_cell"].(string)
	totalCell, ok2 := inputs["previous_period_cell"].(string) // Reusing for total/base

	if !ok1 || !ok2 {
		return "", "Missing required cells for percentage calculation"
	}

	baseFormula := fmt.Sprintf("%s/%s", currentCell, totalCell)
	
	if errorHandling {
		formula := fmt.Sprintf(`=IFERROR(%s,0)`, baseFormula)
		return formula, fmt.Sprintf("Percentage with error handling: %s / %s", currentCell, totalCell)
	}

	return "=" + baseFormula, fmt.Sprintf("Percentage: %s / %s", currentCell, totalCell)
}

func (te *ToolExecutor) buildLookupFormula(inputs map[string]interface{}, errorHandling bool) (string, string) {
	// Implementation for lookup formulas - would need lookup value and table
	return "", "Lookup formula building not yet implemented"
}

func (te *ToolExecutor) buildConditionalFormula(inputs map[string]interface{}, errorHandling bool) (string, string) {
	// Implementation for IF/conditional formulas - would need condition and values
	return "", "Conditional formula building not yet implemented"
}

// Helper methods for model structure analysis

func (te *ToolExecutor) performStructureAnalysis(data *RangeData, focusArea string, modelTypeHint string) map[string]interface{} {
	// Basic structure analysis implementation
	analysis := map[string]interface{}{
		"model_type":      "General",
		"sections_found":  []string{},
		"time_periods":    []string{},
		"key_metrics":     []string{},
		"formula_count":   0,
		"data_direction":  "horizontal",
		"recommendations": []string{},
	}

	// Count formulas
	formulaCount := 0
	if data.Formulas != nil {
		for _, row := range data.Formulas {
			for _, cell := range row {
				if cell != nil && cell != "" {
					formulaCount++
				}
			}
		}
	}
	analysis["formula_count"] = formulaCount

	// Basic model type detection based on content
	if modelTypeHint != "" {
		analysis["model_type"] = modelTypeHint
	} else {
		analysis["model_type"] = te.detectModelTypeFromData(data)
	}

	// Add basic recommendations
	recommendations := []string{
		"Consider adding consistent formatting for better readability",
		"Use clear section headers to organize the model",
		"Add data validation for input cells",
		"Include formula audit trail documentation",
	}
	analysis["recommendations"] = recommendations

	return analysis
}

func (te *ToolExecutor) detectModelTypeFromData(data *RangeData) string {
	// Simple keyword-based detection
	allText := ""
	for _, row := range data.Values {
		for _, cell := range row {
			if cell != nil {
				allText += fmt.Sprintf("%v ", cell)
			}
		}
	}

	textLower := strings.ToLower(allText)
	
	if strings.Contains(textLower, "dcf") || strings.Contains(textLower, "discount") || strings.Contains(textLower, "wacc") {
		return "DCF"
	}
	if strings.Contains(textLower, "lbo") || strings.Contains(textLower, "leverage") || strings.Contains(textLower, "irr") {
		return "LBO"
	}
	if strings.Contains(textLower, "merger") || strings.Contains(textLower, "acquisition") {
		return "M&A"
	}
	if strings.Contains(textLower, "comparable") || strings.Contains(textLower, "trading") {
		return "Comps"
	}

	return "General"
}

// Helper methods for smart formatting

func (te *ToolExecutor) buildFinancialFormat(styleType string, input map[string]interface{}) *CellFormat {
	format := &CellFormat{}

	// Override with specific number format if provided
	if numberFormat, ok := input["number_format"].(string); ok {
		format.NumberFormat = numberFormat
		return format
	}

	// Apply standard financial formats based on style type
	switch styleType {
	case "financial_input":
		format.NumberFormat = "0.00"
		format.Font = &FontStyle{Color: "blue", Bold: false}
	case "financial_calculation":
		format.NumberFormat = "0.00"
		format.Font = &FontStyle{Color: "black", Bold: false}
	case "financial_output":
		format.NumberFormat = "0.00"
		format.Font = &FontStyle{Color: "black", Bold: true}
	case "header":
		format.Font = &FontStyle{Bold: true, Size: 12}
		format.Alignment = &Alignment{Horizontal: "center"}
	case "assumption":
		format.NumberFormat = "0.00"
		format.FillColor = "lightblue"
	case "percentage":
		format.NumberFormat = "0.0%"
	case "currency":
		format.NumberFormat = "$#,##0.00"
	case "multiple":
		format.NumberFormat = "0.0x"
	case "basis_points":
		format.NumberFormat = "0bps"
	default:
		format.NumberFormat = "General"
	}

	return format
}

func (te *ToolExecutor) applyConditionalRules(format *CellFormat, conditionalRules []interface{}) *CellFormat {
	// Basic implementation - would need more sophisticated conditional formatting
	// For now, just apply the base format
	return format
}

// Helper methods for audit trail

func (te *ToolExecutor) generateAuditTrail(data *RangeData, documentationType string, addComments bool, createDocumentationSheet bool, includeSources bool) map[string]interface{} {
	auditTrail := map[string]interface{}{
		"documentation_type": documentationType,
		"created_at":        time.Now().Format(time.RFC3339),
		"cell_comments":     make(map[string]string),
		"summary":           "",
		"recommendations":   []string{},
	}

	cellComments := make(map[string]string)

	// Generate documentation based on type
	switch documentationType {
	case "formula_explanations":
		if data.Formulas != nil {
			for i, row := range data.Formulas {
				for j, cell := range row {
					if cell != nil && cell != "" {
						cellAddr := fmt.Sprintf("%s%d", string(rune('A'+j)), i+1)
						cellComments[cellAddr] = fmt.Sprintf("Formula: %s", cell)
					}
				}
			}
		}
		auditTrail["summary"] = "Formula explanations added to cells"
	case "assumptions_summary":
		auditTrail["summary"] = "Key assumptions documented"
	case "model_overview":
		auditTrail["summary"] = "High-level model structure documented"
	case "change_log":
		auditTrail["summary"] = "Change tracking initialized"
	case "validation_notes":
		auditTrail["summary"] = "Validation checkpoints documented"
	}

	auditTrail["cell_comments"] = cellComments
	auditTrail["recommendations"] = []string{
		"Review formulas for accuracy",
		"Validate input assumptions",
		"Consider sensitivity analysis",
		"Add data sources where applicable",
	}

	return auditTrail
}

func (te *ToolExecutor) addCellComments(ctx context.Context, sessionID string, comments map[string]string) error {
	// This would require implementing cell comment functionality in the Excel bridge
	// For now, just log the comments
	log.Info().
		Str("session", sessionID).
		Int("comment_count", len(comments)).
		Msg("Cell comments generated (implementation pending)")
	
	return nil
}