package ai

import (
	"context"
	"encoding/json"
	"fmt"
)

// ToolExecutor handles the execution of Excel tools
type ToolExecutor struct {
	excelBridge ExcelBridge
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
	Formulas   [][]string               `json:"formulas,omitempty"`
	Formatting [][]CellFormat           `json:"formatting,omitempty"`
	Address    string                   `json:"address"`
	RowCount   int                      `json:"row_count"`
	ColCount   int                      `json:"col_count"`
}

// DataAnalysis represents analysis results
type DataAnalysis struct {
	DataTypes    []string                 `json:"data_types"`
	Headers      []string                 `json:"headers,omitempty"`
	Statistics   map[string]Stats         `json:"statistics,omitempty"`
	Patterns     []string                 `json:"patterns,omitempty"`
	RowCount     int                      `json:"row_count"`
	ColCount     int                      `json:"col_count"`
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
func NewToolExecutor(bridge ExcelBridge) *ToolExecutor {
	return &ToolExecutor{
		excelBridge: bridge,
	}
}

// ExecuteTool executes a tool call and returns the result
func (te *ToolExecutor) ExecuteTool(ctx context.Context, sessionID string, toolCall ToolCall) (*ToolResult, error) {
	result := &ToolResult{
		Type:      "tool_result",
		ToolUseID: toolCall.ID,
	}

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

	default:
		result.IsError = true
		result.Content = map[string]string{"error": fmt.Sprintf("Unknown tool: %s", toolCall.Name)}
	}

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