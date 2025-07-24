package ai

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gridmate/backend/internal/memory"
	"github.com/gridmate/backend/internal/services/formula"
	"github.com/rs/zerolog/log"
)

const (
	// MaxToolResponseSize is the maximum size allowed for a tool response (1MB)
	MaxToolResponseSize = 1 * 1024 * 1024
)

// ToolExecutor handles the execution of Excel tools
type ToolExecutor struct {
	excelBridge      ExcelBridge
	formulaValidator *formula.FormulaIntelligence
	// Add mapping between tool IDs and request IDs
	requestIDMap     map[string]string // Maps request ID -> tool ID
	requestIDMapLock sync.RWMutex
	// Performance optimization fields
	modelDataCache  map[string]*CachedModelData
	cacheLock       sync.RWMutex
	cacheExpiry     time.Duration
	parallelWorkers int
	operationQueue  chan OperationRequest
	// Queued operations registry
	queuedOpsRegistry interface{} // Will be set to *services.QueuedOperationRegistry
	// Embedding provider for memory search
	embeddingProvider EmbeddingProvider
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
	GetSession(sessionID string) *Session
}

// RangeData represents data read from Excel
type RangeData struct {
	Values     [][]interface{} `json:"values"`
	Formulas   [][]interface{} `json:"formulas,omitempty"`
	Formatting [][]CellFormat  `json:"formatting,omitempty"`
	Address    string          `json:"address"`
	RowCount   int             `json:"rowCount"`
	ColCount   int             `json:"colCount"`
}

// DataAnalysis represents analysis results
type DataAnalysis struct {
	DataTypes  []string         `json:"dataTypes"`
	Headers    []string         `json:"headers,omitempty"`
	Statistics map[string]Stats `json:"statistics,omitempty"`
	Patterns   []string         `json:"patterns,omitempty"`
	RowCount   int              `json:"rowCount"`
	ColCount   int              `json:"colCount"`
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
	NumberFormat string     `json:"number_format,omitempty"`
	Font         *FontStyle `json:"font,omitempty"`
	FillColor    string     `json:"fill_color,omitempty"`
	Alignment    *Alignment `json:"alignment,omitempty"`
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
	CheckCircularRefs       bool `json:"check_circular_refs"`
	CheckFormulaConsistency bool `json:"check_formula_consistency"`
	CheckErrors             bool `json:"check_errors"`
}

// ValidationResult represents validation results
type ValidationResult struct {
	IsValid              bool        `json:"is_valid"`
	CircularRefs         []string    `json:"circular_refs,omitempty"`
	InconsistentFormulas []string    `json:"inconsistent_formulas,omitempty"`
	Errors               []CellError `json:"errors,omitempty"`
}

// CellError represents an error in a cell
type CellError struct {
	Cell      string `json:"cell"`
	ErrorType string `json:"error_type"`
	Message   string `json:"message"`
}

// NamedRange is already defined in models.go, so we'll use that

// ParallelToolResult represents the result of a parallel tool execution
type ParallelToolResult struct {
	ToolName string                 `json:"tool_name"`
	ToolID   string                 `json:"tool_id"`
	Result   map[string]interface{} `json:"result"`
	Error    error                  `json:"error,omitempty"`
	Duration time.Duration          `json:"duration"`
	IsError  bool                   `json:"is_error"`
}

// FinancialModelContext represents comprehensive financial model context
type FinancialModelContext struct {
	ModelType        string                `json:"model_type"`
	Structure        *ModelStructure       `json:"structure"`
	Assumptions      *RangeData            `json:"assumptions"`
	Calculations     *RangeData            `json:"calculations"`
	Outputs          *RangeData            `json:"outputs"`
	ValidationStatus *ValidationResult     `json:"validation_status"`
	UserPreferences  *FinancialPreferences `json:"user_preferences,omitempty"`
}

// Section represents a section of a financial model
type Section struct {
	Name        string `json:"name"`
	Range       string `json:"range"`
	SectionType string `json:"section_type"`
	Purpose     string `json:"purpose"`
}

// FinancialPreferences represents user preferences for financial modeling
type FinancialPreferences struct {
	FormattingStyle    string             `json:"formatting_style"`
	PreferredLayouts   map[string]string  `json:"preferred_layouts"`
	DefaultAssumptions map[string]float64 `json:"default_assumptions"`
	Industry           string             `json:"industry"` // PE, HF, IB, Corp
}

// EnhancedError provides Cursor-style helpful error messages with suggestions
type EnhancedError struct {
	Message    string   `json:"message"`
	Context    string   `json:"context"`
	Suggestion string   `json:"suggestion"`
	RelatedOps []string `json:"related_ops,omitempty"`
}

// Error implements the error interface
func (e *EnhancedError) Error() string {
	if e.Suggestion != "" {
		return fmt.Sprintf("%s\nContext: %s\nSuggestion: %s", e.Message, e.Context, e.Suggestion)
	}
	return fmt.Sprintf("%s\nContext: %s", e.Message, e.Context)
}

// newEnhancedError creates a new enhanced error with context and suggestions
func newEnhancedError(message string, context string, suggestion string, relatedOps ...string) *EnhancedError {
	return &EnhancedError{
		Message:    message,
		Context:    context,
		Suggestion: suggestion,
		RelatedOps: relatedOps,
	}
}

// formatToolError formats an error for inclusion in a ToolResult
func formatToolError(err error) map[string]interface{} {
	if enhancedErr, ok := err.(*EnhancedError); ok {
		result := map[string]interface{}{
			"error":      enhancedErr.Message,
			"context":    enhancedErr.Context,
			"suggestion": enhancedErr.Suggestion,
		}
		if len(enhancedErr.RelatedOps) > 0 {
			result["related_operations"] = enhancedErr.RelatedOps
		}
		return result
	}
	// For regular errors, just return the error message
	return map[string]interface{}{"error": err.Error()}
}

// generateOperationPreview creates a human-readable preview of what an operation will do
func generateOperationPreview(toolName string, input map[string]interface{}) string {
	switch toolName {
	case "write_range":
		rangeAddr, _ := input["range"].(string)
		values := input["values"]

		// Try to create a concise preview of the values
		var preview string
		if vals, ok := values.([][]interface{}); ok && len(vals) > 0 && len(vals[0]) > 0 {
			firstValue := fmt.Sprintf("%v", vals[0][0])
			if len(vals) == 1 && len(vals[0]) == 1 {
				preview = fmt.Sprintf("Write '%s' to %s", firstValue, rangeAddr)
			} else {
				preview = fmt.Sprintf("Write %dx%d values starting with '%s' to %s",
					len(vals), len(vals[0]), firstValue, rangeAddr)
			}
		} else {
			preview = fmt.Sprintf("Write values to %s", rangeAddr)
		}
		return preview

	case "apply_formula":
		rangeAddr, _ := input["range"].(string)
		formula, _ := input["formula"].(string)
		if len(formula) > 50 {
			formula = formula[:47] + "..."
		}
		return fmt.Sprintf("Apply formula '%s' to %s", formula, rangeAddr)

	case "format_range":
		rangeAddr, _ := input["range"].(string)
		format := input["format"]

		var formatDesc string
		if f, ok := format.(map[string]interface{}); ok {
			parts := []string{}
			if numFmt, ok := f["number_format"].(string); ok {
				parts = append(parts, fmt.Sprintf("format: %s", numFmt))
			}
			if bold, ok := f["bold"].(bool); ok && bold {
				parts = append(parts, "bold")
			}
			if color, ok := f["background_color"].(string); ok {
				parts = append(parts, fmt.Sprintf("bg: %s", color))
			}
			if len(parts) > 0 {
				formatDesc = strings.Join(parts, ", ")
			}
		}

		if formatDesc != "" {
			return fmt.Sprintf("Format %s (%s)", rangeAddr, formatDesc)
		}
		return fmt.Sprintf("Format %s", rangeAddr)

	case "create_chart":
		chartType, _ := input["chart_type"].(string)
		dataRange, _ := input["data_range"].(string)
		return fmt.Sprintf("Create %s chart from %s", chartType, dataRange)

	case "insert_rows_columns":
		position, _ := input["position"].(string)
		count, _ := input["count"].(int)
		insertType, _ := input["type"].(string)
		return fmt.Sprintf("Insert %d %s at %s", count, insertType, position)

	case "create_named_range":
		name, _ := input["name"].(string)
		rangeAddr, _ := input["range"].(string)
		return fmt.Sprintf("Create named range '%s' for %s", name, rangeAddr)

	default:
		return fmt.Sprintf("Execute %s operation", toolName)
	}
}

// NewToolExecutor creates a new tool executor
func NewToolExecutor(bridge ExcelBridge, formulaValidator *formula.FormulaIntelligence) *ToolExecutor {
	return &ToolExecutor{
		excelBridge:      bridge,
		formulaValidator: formulaValidator,
		requestIDMap:     make(map[string]string),
		modelDataCache:   make(map[string]*CachedModelData),
		parallelWorkers:  4, // Configurable based on system
		cacheExpiry:      10 * time.Minute,
	}
}

// SetEmbeddingProvider sets the embedding provider for memory search
func (te *ToolExecutor) SetEmbeddingProvider(provider EmbeddingProvider) {
	te.embeddingProvider = provider
}

// SetQueuedOperationRegistry sets the queued operation registry
func (te *ToolExecutor) SetQueuedOperationRegistry(registry interface{}) {
	te.queuedOpsRegistry = registry
}

// calculateResponseSize calculates the approximate size of a response in bytes
func calculateResponseSize(response interface{}) int {
	// Marshal to JSON to get byte size
	if data, err := json.Marshal(response); err == nil {
		return len(data)
	}
	// Fallback to a rough estimate
	return 0
}

// validateResponseSize checks if a tool response exceeds the maximum allowed size
func (te *ToolExecutor) validateResponseSize(result *ToolResult) (*ToolResult, error) {
	responseSize := calculateResponseSize(result.Content)

	if responseSize > MaxToolResponseSize {
		log.Warn().
			Int("size", responseSize).
			Int("max_size", MaxToolResponseSize).
			Str("tool_id", result.ToolUseID).
			Msg("Tool response exceeds size limit")

		// Return an error result instead
		return &ToolResult{
			Type:      result.Type,
			ToolUseID: result.ToolUseID,
			IsError:   true,
			Status:    "error",
			Content: map[string]string{
				"error": fmt.Sprintf("Response too large (%d bytes). Please request a smaller range or less data.", responseSize),
			},
		}, nil
	}

	return result, nil
}

// ExecuteTool executes a tool call and returns the result
func (te *ToolExecutor) ExecuteTool(ctx context.Context, sessionID string, toolCall ToolCall, autonomyMode string) (*ToolResult, error) {
	log.Info().
		Str("tool", toolCall.Name).
		Str("session", sessionID).
		Str("tool_id", toolCall.ID).
		Interface("input", toolCall.Input).
		Str("autonomy_mode", autonomyMode).
		Msg("Executing Excel tool")

	// Add timeout context
	toolCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	// Wrap execution with error handling
	result, err := te.executeWithErrorHandling(toolCtx, sessionID, toolCall, autonomyMode)
	if err != nil {
		toolErr := te.categorizeError(err, toolCall)
		return &ToolResult{
			Type:      "tool_result",
			ToolUseID: toolCall.ID,
			IsError:   true,
			Content:   toolErr,
			Status:    "error",
		}, nil
	}
	
	return result, nil
}

// executeWithErrorHandling executes the tool with proper error handling
func (te *ToolExecutor) executeWithErrorHandling(ctx context.Context, sessionID string, toolCall ToolCall, autonomyMode string) (*ToolResult, error) {
	// Create result structure
	result := &ToolResult{
		Type:      "tool_result",
		ToolUseID: toolCall.ID,
		IsError:   false,
	}

	startTime := time.Now()

	// Extract message ID from context if available
	messageID := ""
	if msgID, ok := ctx.Value("message_id").(string); ok {
		messageID = msgID
	}

	// Add tool ID to input for tracking
	toolCall.Input["_tool_id"] = toolCall.ID

	switch toolCall.Name {
	case "read_range":
		content, err := te.executeReadRange(ctx, sessionID, toolCall.Input)
		if err != nil {
			return nil, err
		}
		result.Status = "success"
		result.Content = content
		result.Details = map[string]interface{}{
			"operation": "read_range",
			"range":     toolCall.Input["range"],
			"timestamp": time.Now().Format(time.RFC3339),
		}

	case "write_range":
		// Add preview mode flag for agent-default autonomy mode
		if autonomyMode == "agent-default" {
			toolCall.Input["preview_mode"] = true
		}
		err := te.executeWriteRange(ctx, sessionID, toolCall.Input)
		if err != nil {
			// Check if it's a queued error
			if err.Error() == "Tool execution queued for user approval" {
				result.IsError = false
				result.Status = "queued"
				preview := generateOperationPreview("write_range", toolCall.Input)
				result.Content = map[string]interface{}{
					"status":  "queued",
					"message": "Write range operation queued for user approval",
					"preview": preview,
				}
				result.Details = map[string]interface{}{
					"operation": "write_range",
					"range":     toolCall.Input["range"],
					"preview":   preview,
					"timestamp": time.Now().Format(time.RFC3339),
				}

				// Queue the operation
				preview = generateOperationPreview("write_range", toolCall.Input)
				if preview == "" {
					preview = "Write data to Excel range"
				}

				// Extract batch information if present
				var batchID string
				var dependencies []string

				if bid, ok := toolCall.Input["_batch_id"].(string); ok {
					batchID = bid

					// If this is not the first in the batch, add dependency on previous operation
					if batchIndex, ok := toolCall.Input["_batch_index"].(int); ok && batchIndex > 0 {
						// Get the tool IDs from the batch
						if batchToolIDs, ok := toolCall.Input["_batch_tool_ids"].([]string); ok && batchIndex < len(batchToolIDs) {
							// Use the actual tool ID of the previous operation
							prevOpID := batchToolIDs[batchIndex-1]
							dependencies = append(dependencies, prevOpID)
						}
					}
				}

				// Always use the toolCall.ID for operation tracking
				// This ensures consistency with the request mapper
				opID := toolCall.ID

				// Register with queued operations if available
				if te.queuedOpsRegistry != nil {
					queuedOp := map[string]interface{}{
						"ID":           opID,
						"SessionID":    sessionID,
						"Type":         "write_range",
						"Input":        toolCall.Input,
						"Preview":      preview,
						"Context":      "Excel write operation requested by AI",
						"Priority":     50, // Normal priority
						"BatchID":      batchID,
						"Dependencies": dependencies,
						"MessageID":    messageID, // Add message ID
					}

					// Try to queue the operation
					if registry, ok := te.queuedOpsRegistry.(interface {
						QueueOperation(interface{}) error
					}); ok {
						if err := registry.QueueOperation(queuedOp); err != nil {
							log.Error().Err(err).Msg("Failed to register queued operation")
						}
					}
				}

				return result, nil
			}
			result.IsError = true
			result.Status = "error"
			result.Content = formatToolError(err)
			return result, nil
		}
		result.Status = "success"
		result.Content = map[string]string{"status": "success", "message": "Range written successfully"}
		result.Details = map[string]interface{}{
			"operation": "write_range",
			"range":     toolCall.Input["range"],
			"timestamp": time.Now().Format(time.RFC3339),
		}

	case "apply_formula":
		// Add preview mode flag for agent-default autonomy mode
		if autonomyMode == "agent-default" {
			toolCall.Input["preview_mode"] = true
		}
		err := te.executeApplyFormula(ctx, sessionID, toolCall.Input)
		if err != nil {
			// Check if it's a queued error
			if err.Error() == "Tool execution queued for user approval" {
				result.IsError = false
				result.Status = "queued"
				preview := generateOperationPreview("apply_formula", toolCall.Input)
				result.Content = map[string]interface{}{
					"status":  "queued",
					"message": "Formula application queued for user approval",
					"preview": preview,
				}
				result.Details = map[string]interface{}{
					"operation": "apply_formula",
					"range":     toolCall.Input["range"],
					"formula":   toolCall.Input["formula"],
					"preview":   preview,
					"timestamp": time.Now().Format(time.RFC3339),
				}

				// Register in queued operations registry if available
				if te.queuedOpsRegistry != nil {
					// Generate preview for the operation
					preview := generateOperationPreview("apply_formula", toolCall.Input)

					// Extract batch information if present
					var batchID string
					var dependencies []string

					if bid, ok := toolCall.Input["_batch_id"].(string); ok {
						batchID = bid

						// If this is not the first in the batch, add dependency on previous operation
						if batchIndex, ok := toolCall.Input["_batch_index"].(int); ok && batchIndex > 0 {
							// Create dependency on the previous operation in the batch
							prevOpID := fmt.Sprintf("%s_%s_%d", batchID, sessionID, batchIndex-1)
							dependencies = append(dependencies, prevOpID)
						}
					}

					// Always use the toolCall.ID for operation tracking
					// This ensures consistency with the request mapper
					opID := toolCall.ID

					// Create a properly structured operation for the registry
					queuedOp := map[string]interface{}{
						"ID":           opID,
						"SessionID":    sessionID,
						"Type":         "apply_formula",
						"Input":        toolCall.Input,
						"Preview":      preview,
						"Context":      "Excel formula application requested by AI",
						"Priority":     50, // Normal priority
						"BatchID":      batchID,
						"Dependencies": dependencies,
						"MessageID":    messageID, // Add message ID
					}

					// Try to queue the operation
					if registry, ok := te.queuedOpsRegistry.(interface {
						QueueOperation(interface{}) error
					}); ok {
						if err := registry.QueueOperation(queuedOp); err != nil {
							log.Error().Err(err).Msg("Failed to register queued operation")
						}
					}
				}

				return result, nil
			}
			result.IsError = true
			result.Status = "error"
			result.Content = formatToolError(err)
			return result, nil
		}
		result.Content = map[string]string{"status": "success", "message": "Formula applied successfully"}

	case "analyze_data":
		content, err := te.executeAnalyzeData(ctx, sessionID, toolCall.Input)
		if err != nil {
			result.IsError = true
			result.Content = formatToolError(err)
			return result, nil
		}
		result.Content = content

	case "format_range":
		// Add preview mode flag for agent-default autonomy mode
		if autonomyMode == "agent-default" {
			toolCall.Input["preview_mode"] = true
		}
		err := te.executeFormatRange(ctx, sessionID, toolCall.Input)
		if err != nil {
			// Check if it's a queued error
			if err.Error() == "Tool execution queued for user approval" {
				result.IsError = false
				result.Status = "queued"
				preview := generateOperationPreview("format_range", toolCall.Input)
				result.Content = map[string]interface{}{
					"status":  "queued",
					"message": "Format operation queued for user approval",
					"preview": preview,
				}
				result.Details = map[string]interface{}{
					"operation": "format_range",
					"range":     toolCall.Input["range"],
					"preview":   preview,
					"timestamp": time.Now().Format(time.RFC3339),
				}

				// Register in queued operations registry if available
				if te.queuedOpsRegistry != nil {
					// Generate preview for the operation
					preview := generateOperationPreview("format_range", toolCall.Input)

					// Extract batch information if present
					var batchID string
					var dependencies []string

					if bid, ok := toolCall.Input["_batch_id"].(string); ok {
						batchID = bid

						// If this is not the first in the batch, add dependency on previous operation
						if batchIndex, ok := toolCall.Input["_batch_index"].(int); ok && batchIndex > 0 {
							// Create dependency on the previous operation in the batch
							prevOpID := fmt.Sprintf("%s_%s_%d", batchID, sessionID, batchIndex-1)
							dependencies = append(dependencies, prevOpID)
						}
					}

					// Always use the toolCall.ID for operation tracking
					// This ensures consistency with the request mapper
					opID := toolCall.ID

					// Create a properly structured operation for the registry
					queuedOp := map[string]interface{}{
						"ID":           opID,
						"SessionID":    sessionID,
						"Type":         "format_range",
						"Input":        toolCall.Input,
						"Preview":      preview,
						"Context":      "Excel formatting requested by AI",
						"Priority":     40, // Lower priority for formatting
						"BatchID":      batchID,
						"Dependencies": dependencies,
						"MessageID":    messageID, // Add message ID
					}

					// Try to queue the operation
					if registry, ok := te.queuedOpsRegistry.(interface {
						QueueOperation(interface{}) error
					}); ok {
						if err := registry.QueueOperation(queuedOp); err != nil {
							log.Error().Err(err).Msg("Failed to register queued operation")
						}
					}
				}

				return result, nil
			}
			result.IsError = true
			result.Status = "error"
			result.Content = formatToolError(err)
			return result, nil
		}
		result.Status = "success"
		result.Content = map[string]string{"status": "success", "message": "Formatting applied successfully"}
		result.Details = map[string]interface{}{
			"operation": "format_range",
			"range":     toolCall.Input["range"],
			"timestamp": time.Now().Format(time.RFC3339),
		}

	case "create_chart":
		err := te.executeCreateChart(ctx, sessionID, toolCall.Input)
		if err != nil {
			result.IsError = true
			result.Content = formatToolError(err)
			return result, nil
		}
		result.Content = map[string]string{"status": "success", "message": "Chart created successfully"}

	case "validate_model":
		content, err := te.executeValidateModel(ctx, sessionID, toolCall.Input)
		if err != nil {
			result.IsError = true
			result.Content = formatToolError(err)
			return result, nil
		}
		result.Content = content

	case "get_named_ranges":
		content, err := te.executeGetNamedRanges(ctx, sessionID, toolCall.Input)
		if err != nil {
			result.IsError = true
			result.Content = formatToolError(err)
			return result, nil
		}
		result.Content = content

	case "create_named_range":
		err := te.executeCreateNamedRange(ctx, sessionID, toolCall.Input)
		if err != nil {
			result.IsError = true
			result.Content = formatToolError(err)
			return result, nil
		}
		result.Content = map[string]string{"status": "success", "message": "Named range created successfully"}

	case "insert_rows_columns":
		err := te.executeInsertRowsColumns(ctx, sessionID, toolCall.Input)
		if err != nil {
			result.IsError = true
			result.Content = formatToolError(err)
			return result, nil
		}
		result.Content = map[string]string{"status": "success", "message": "Rows/columns inserted successfully"}

	case "build_financial_formula":
		content, err := te.executeBuildFinancialFormula(ctx, sessionID, toolCall.Input)
		if err != nil {
			result.IsError = true
			result.Content = formatToolError(err)
			return result, nil
		}
		result.Content = content

	case "analyze_model_structure":
		content, err := te.executeAnalyzeModelStructure(ctx, sessionID, toolCall.Input)
		if err != nil {
			result.IsError = true
			result.Content = formatToolError(err)
			return result, nil
		}
		result.Content = content

	case "smart_format_cells":
		err := te.executeSmartFormatCells(ctx, sessionID, toolCall.Input)
		if err != nil {
			result.IsError = true
			result.Content = formatToolError(err)
			return result, nil
		}
		result.Content = map[string]string{"status": "success", "message": "Smart formatting applied successfully"}

	case "create_audit_trail":
		content, err := te.executeCreateAuditTrail(ctx, sessionID, toolCall.Input)
		if err != nil {
			result.IsError = true
			result.Content = formatToolError(err)
			return result, nil
		}
		result.Content = content

	case "organize_financial_model":
		content, err := te.executeOrganizeFinancialModel(ctx, sessionID, toolCall.Input)
		if err != nil {
			result.IsError = true
			result.Content = formatToolError(err)
			return result, nil
		}
		result.Content = content

	case "search_memory":
		content, err := te.executeMemorySearch(ctx, sessionID, toolCall.Input)
		if err != nil {
			result.IsError = true
			result.Content = formatToolError(err)
			return result, nil
		}
		result.Content = content

	case "trace_precedents":
		content, err := te.executeTracePrecedents(ctx, sessionID, toolCall.Input)
		if err != nil {
			result.IsError = true
			result.Content = formatToolError(err)
			return result, nil
		}
		result.Content = content

	case "trace_dependents":
		content, err := te.executeTraceDependents(ctx, sessionID, toolCall.Input)
		if err != nil {
			result.IsError = true
			result.Content = formatToolError(err)
			return result, nil
		}
		result.Content = content

	default:
		result.IsError = true
		unknownToolErr := newEnhancedError(
			fmt.Sprintf("Unknown tool: %s", toolCall.Name),
			"The requested tool is not available in the Excel integration",
			"Available tools include: read_range, write_range, apply_formula, analyze_data, format_range, create_chart, validate_model, and more",
		)
		result.Content = formatToolError(unknownToolErr)
	}

	// Validate response size before returning
	result, err := te.validateResponseSize(result)
	if err != nil {
		return nil, err
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

// ExecuteParallelTools executes multiple tools simultaneously for 3-5x performance improvement
func (te *ToolExecutor) ExecuteParallelTools(ctx context.Context, sessionID string, toolCalls []ToolCall) ([]ParallelToolResult, error) {
	if len(toolCalls) == 0 {
		return []ParallelToolResult{}, nil
	}

	log.Info().
		Str("session", sessionID).
		Int("tool_count", len(toolCalls)).
		Msg("Starting parallel tool execution")

	results := make([]ParallelToolResult, len(toolCalls))
	var wg sync.WaitGroup

	for i, toolCall := range toolCalls {
		wg.Add(1)
		go func(index int, tool ToolCall) {
			defer wg.Done()

			startTime := time.Now()
			result, err := te.ExecuteTool(ctx, sessionID, tool, "")
			duration := time.Since(startTime)

			results[index] = ParallelToolResult{
				ToolName: tool.Name,
				ToolID:   tool.ID,
				Duration: duration,
				IsError:  err != nil || (result != nil && result.IsError),
			}

			if err != nil {
				results[index].Error = err
			} else if result != nil {
				results[index].Result = result.Content.(map[string]interface{})
				results[index].IsError = result.IsError
			}

			log.Debug().
				Str("session", sessionID).
				Str("tool", tool.Name).
				Str("tool_id", tool.ID).
				Bool("success", !results[index].IsError).
				Dur("duration", duration).
				Msg("Parallel tool execution completed")
		}(i, toolCall)
	}

	wg.Wait()

	// Log overall parallel execution results
	successCount := 0
	totalDuration := time.Duration(0)
	for _, result := range results {
		if !result.IsError {
			successCount++
		}
		totalDuration += result.Duration
	}

	log.Info().
		Str("session", sessionID).
		Int("total_tools", len(toolCalls)).
		Int("successful_tools", successCount).
		Dur("total_duration", totalDuration).
		Msg("Parallel tool execution completed")

	return results, nil
}

// categorizeError categorizes errors for better handling and retry logic
func (te *ToolExecutor) categorizeError(err error, toolCall ToolCall) *ToolError {
	// Check for context deadline exceeded
	if errors.Is(err, context.DeadlineExceeded) {
		retryAfter := 5 * time.Second
		return &ToolError{
			Type:       ToolErrorTypeTimeout,
			Message:    "Tool execution timed out",
			ToolName:   toolCall.Name,
			ToolID:     toolCall.ID,
			Retryable:  true,
			RetryAfter: &retryAfter,
			Details: map[string]interface{}{
				"timeout": "30s",
				"hint":    "The operation took too long. Consider using a smaller range or simpler operation.",
			},
		}
	}

	// Check for permission errors
	if strings.Contains(err.Error(), "permission") || strings.Contains(err.Error(), "access denied") {
		return &ToolError{
			Type:      ToolErrorTypePermission,
			Message:   "Permission denied for this operation",
			ToolName:  toolCall.Name,
			ToolID:    toolCall.ID,
			Retryable: false,
			Details: map[string]interface{}{
				"operation": toolCall.Name,
				"hint":      "Check that the workbook is not protected or read-only.",
			},
		}
	}

	// Check for rate limit errors
	if strings.Contains(err.Error(), "rate limit") || strings.Contains(err.Error(), "too many requests") {
		retryAfter := 10 * time.Second
		return &ToolError{
			Type:       ToolErrorTypeRateLimit,
			Message:    "Rate limit exceeded",
			ToolName:   toolCall.Name,
			ToolID:     toolCall.ID,
			Retryable:  true,
			RetryAfter: &retryAfter,
			Details: map[string]interface{}{
				"hint": "Too many operations in a short time. Please wait before retrying.",
			},
		}
	}

	// Check for invalid input errors
	if strings.Contains(err.Error(), "invalid") || strings.Contains(err.Error(), "bad request") {
		return &ToolError{
			Type:      ToolErrorTypeInvalidInput,
			Message:   err.Error(),
			ToolName:  toolCall.Name,
			ToolID:    toolCall.ID,
			Retryable: false,
			Details: map[string]interface{}{
				"input": toolCall.Input,
				"hint":  "Check the input parameters for correctness.",
			},
		}
	}

	// Default to execution error
	return &ToolError{
		Type:      ToolErrorTypeExecutionError,
		Message:   err.Error(),
		ToolName:  toolCall.Name,
		ToolID:    toolCall.ID,
		Retryable: true,
		Details: map[string]interface{}{
			"original_error": err.Error(),
		},
	}
}

// GatherComprehensiveModelContext gathers full financial model context using parallel operations
func (te *ToolExecutor) GatherComprehensiveModelContext(ctx context.Context, sessionID string) (*FinancialModelContext, error) {
	log.Info().
		Str("session", sessionID).
		Msg("Starting comprehensive financial model context gathering")

	// Execute multiple context-gathering operations in parallel
	contextTools := []ToolCall{
		{
			ID:   "analyze_structure",
			Name: "analyze_model_structure",
			Input: map[string]interface{}{
				"range":         "A1:Z100",
				"analysis_type": "full_structure",
			},
		},
		{
			ID:   "read_main_range",
			Name: "read_range",
			Input: map[string]interface{}{
				"range":              "A1:Z100",
				"include_formulas":   true,
				"include_formatting": true,
			},
		},
		{
			ID:   "validate_model",
			Name: "validate_model",
			Input: map[string]interface{}{
				"range":                     "A1:Z100",
				"check_circular_refs":       true,
				"check_formula_consistency": true,
				"check_errors":              true,
			},
		},
	}

	results, err := te.ExecuteParallelTools(ctx, sessionID, contextTools)
	if err != nil {
		return nil, fmt.Errorf("failed to gather parallel context: %w", err)
	}

	// Combine results into comprehensive context
	context := &FinancialModelContext{}

	for _, result := range results {
		if result.IsError {
			log.Warn().
				Str("tool", result.ToolName).
				Str("session", sessionID).
				Interface("error", result.Error).
				Msg("Tool failed during context gathering")
			continue
		}

		switch result.ToolName {
		case "analyze_model_structure":
			if structure, ok := result.Result["structure"]; ok {
				// Convert to ModelStructure
				if structBytes, err := json.Marshal(structure); err == nil {
					var modelStruct ModelStructure
					if err := json.Unmarshal(structBytes, &modelStruct); err == nil {
						context.Structure = &modelStruct
					}
				}
			}
			if modelType, ok := result.Result["model_type"].(string); ok {
				context.ModelType = modelType
			}

		case "read_range":
			// This gives us the main data
			if rangeBytes, err := json.Marshal(result.Result); err == nil {
				var rangeData RangeData
				if err := json.Unmarshal(rangeBytes, &rangeData); err == nil {
					// For now, treat this as calculations - we'll enhance section detection later
					context.Calculations = &rangeData
				}
			}

		case "validate_model":
			if validationBytes, err := json.Marshal(result.Result); err == nil {
				var validation ValidationResult
				if err := json.Unmarshal(validationBytes, &validation); err == nil {
					context.ValidationStatus = &validation
				}
			}
		}
	}

	log.Info().
		Str("session", sessionID).
		Str("model_type", context.ModelType).
		Bool("has_structure", context.Structure != nil).
		Bool("has_validation", context.ValidationStatus != nil).
		Msg("Comprehensive model context gathered successfully")

	return context, nil
}

// ExecuteParallelFinancialAnalysis executes financial-specific parallel analysis
func (te *ToolExecutor) ExecuteParallelFinancialAnalysis(ctx context.Context, sessionID string, analysisType string) ([]ParallelToolResult, error) {
	var tools []ToolCall

	switch analysisType {
	case "model_creation":
		// Parallel: read context, analyze structure, get formatting preferences
		tools = []ToolCall{
			{ID: "read_context", Name: "read_range", Input: map[string]interface{}{"range": "A1:Z100", "include_formulas": true}},
			{ID: "analyze_structure", Name: "analyze_model_structure", Input: map[string]interface{}{"range": "A1:Z100"}},
			{ID: "validate", Name: "validate_model", Input: map[string]interface{}{"range": "A1:Z100"}},
		}

	case "formatting_enhancement":
		// Parallel: analyze current formats, read cell ranges, validate structure
		tools = []ToolCall{
			{ID: "read_current", Name: "read_range", Input: map[string]interface{}{"range": "A1:Z100", "include_formatting": true}},
			{ID: "analyze_data", Name: "analyze_data", Input: map[string]interface{}{"range": "A1:Z100", "include_statistics": true}},
			{ID: "validate_structure", Name: "validate_model", Input: map[string]interface{}{"validation_type": "formatting"}},
		}

	case "comprehensive_validation":
		// Parallel: validate formulas, check structure, analyze data integrity
		tools = []ToolCall{
			{ID: "validate_formulas", Name: "validate_model", Input: map[string]interface{}{"check_formula_consistency": true}},
			{ID: "analyze_structure", Name: "analyze_model_structure", Input: map[string]interface{}{"range": "A1:Z100"}},
			{ID: "analyze_data", Name: "analyze_data", Input: map[string]interface{}{"range": "A1:Z100", "include_statistics": true}},
		}

	default:
		return nil, fmt.Errorf("unknown analysis type: %s", analysisType)
	}

	return te.ExecuteParallelTools(ctx, sessionID, tools)
}

// Helper functions to extract parameters and execute tools

// convertToValueArray converts interface{} to [][]interface{}
func convertToValueArray(valuesRaw interface{}) ([][]interface{}, error) {
	// Check if values is a string (JSON string from AI)
	if strValues, ok := valuesRaw.(string); ok {
		// Parse the JSON string into array
		var values [][]interface{}
		if err := json.Unmarshal([]byte(strValues), &values); err != nil {
			// Log warning when AI sends string-wrapped arrays
			log.Warn().
				Str("input", strValues).
				Err(err).
				Msg("AI sent values as JSON string instead of array - attempting to parse")
			return nil, newEnhancedError(
				"Failed to parse values from JSON string",
				fmt.Sprintf("AI sent values as string: %s", strValues),
				"Ensure values are sent as a proper 2D array, e.g. [[\"A1\"], [\"A2\"]] not as a JSON string",
			)
		}
		return values, nil
	}

	// Handle normal array conversion
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
		"-",  // Contains subtraction
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

	log.Debug().
		Str("style_type", styleType).
		Msg("Building financial format")

	// Universal financial modeling standards
	switch styleType {
	case "financial_input", "assumption", "input":
		format.NumberFormat = "0.00"
		format.Font = &FontStyle{Color: "#0066CC", Bold: false} // Professional blue
		format.FillColor = "#F0F8FF"                            // Light blue background for easy identification

	case "financial_calculation", "formula", "calculation":
		format.NumberFormat = "0.00"
		format.Font = &FontStyle{Color: "#000000", Bold: false} // Standard black

	case "financial_output", "result", "total", "output":
		format.NumberFormat = "0.00"
		format.Font = &FontStyle{Color: "#000000", Bold: true} // Bold for emphasis

	case "header", "section_header":
		format.Font = &FontStyle{Bold: true, Size: 12, Color: "#000000"}
		format.Alignment = &Alignment{Horizontal: "center", Vertical: "middle"}
		format.FillColor = "#E6E6FA" // Light lavender for headers

	case "subheader":
		format.Font = &FontStyle{Bold: true, Size: 10, Color: "#000000"}
		format.Alignment = &Alignment{Horizontal: "left", Vertical: "middle"}

	case "percentage", "percent", "growth", "margin", "return":
		format.NumberFormat = "0.0%"
		format.Font = &FontStyle{Color: "#000000", Bold: false}

	case "currency", "dollar", "financial":
		format.NumberFormat = "$#,##0.00"
		format.Font = &FontStyle{Color: "#000000", Bold: false}

	case "multiple", "times", "ratio":
		format.NumberFormat = "0.0\"x\""
		format.Font = &FontStyle{Color: "#000000", Bold: false}

	case "basis_points", "bps":
		format.NumberFormat = "0\"bps\""
		format.Font = &FontStyle{Color: "#000000", Bold: false}

	case "large_currency", "millions":
		format.NumberFormat = "$#,##0,,\"M\""
		format.Font = &FontStyle{Color: "#000000", Bold: false}

	case "billions":
		format.NumberFormat = "$#,##0,,,\"B\""
		format.Font = &FontStyle{Color: "#000000", Bold: false}

	case "thousands":
		format.NumberFormat = "#,##0"
		format.Font = &FontStyle{Color: "#000000", Bold: false}

	// Model-specific but universal styling
	case "key_metric", "important":
		format.NumberFormat = "0.00"
		format.Font = &FontStyle{Color: "#000000", Bold: true, Size: 11}
		format.FillColor = "#FFFACD" // Light yellow for key metrics

	case "positive_negative", "conditional":
		format.NumberFormat = "$#,##0.00_);[Red]($#,##0.00)"
		format.Font = &FontStyle{Color: "#000000", Bold: false}

	case "accounting":
		format.NumberFormat = "_($* #,##0.00_);_($* (#,##0.00);_($* \"-\"??_);_(@_)"
		format.Font = &FontStyle{Color: "#000000", Bold: false}

	// Financial-specific formats
	case "irr", "yield", "discount_rate":
		format.NumberFormat = "0.0%"
		format.Font = &FontStyle{Color: "#000000", Bold: false}

	case "ev_ebitda", "pe_ratio", "valuation_multiple":
		format.NumberFormat = "0.0\"x\""
		format.Font = &FontStyle{Color: "#000000", Bold: false}

	case "date_period", "period_header":
		format.NumberFormat = "mmm yyyy"
		format.Font = &FontStyle{Bold: true, Color: "#000000"}
		format.Alignment = &Alignment{Horizontal: "center"}

	case "quarter":
		format.NumberFormat = "\"Q\"q yyyy"
		format.Font = &FontStyle{Bold: true, Color: "#000000"}
		format.Alignment = &Alignment{Horizontal: "center"}

	case "year_only":
		format.NumberFormat = "yyyy"
		format.Font = &FontStyle{Bold: true, Color: "#000000"}
		format.Alignment = &Alignment{Horizontal: "center"}

	// Industry-specific formats
	case "pe_input":
		format.NumberFormat = "0.0%"
		format.Font = &FontStyle{Color: "#0066CC", Bold: false}
		format.FillColor = "#F0F8FF"

	case "ib_presentation":
		format.NumberFormat = "0.0"
		format.Font = &FontStyle{Color: "#000000", Bold: false, Size: 10}

	case "hedge_fund":
		format.NumberFormat = "0.00%"
		format.Font = &FontStyle{Color: "#000000", Bold: false}

	default:
		format.NumberFormat = "General"
		format.Font = &FontStyle{Color: "#000000", Bold: false}
	}

	log.Debug().
		Str("applied_format", format.NumberFormat).
		Interface("font", format.Font).
		Str("fill_color", format.FillColor).
		Msg("Financial format built successfully")

	return format
}

func (te *ToolExecutor) applyConditionalRules(format *CellFormat, conditionalRules []interface{}) *CellFormat {
	if len(conditionalRules) == 0 {
		return format
	}

	log.Info().
		Int("rule_count", len(conditionalRules)).
		Msg("Applying conditional formatting rules")

	// Enhanced conditional formatting implementation
	for _, ruleInterface := range conditionalRules {
		rule, ok := ruleInterface.(map[string]interface{})
		if !ok {
			log.Warn().Msg("Invalid conditional rule format, skipping")
			continue
		}

		condition, hasCondition := rule["condition"].(string)
		formatRule, hasFormat := rule["format"].(map[string]interface{})

		if !hasCondition || !hasFormat {
			log.Warn().Msg("Conditional rule missing condition or format, skipping")
			continue
		}

		log.Debug().
			Str("condition", condition).
			Interface("format_rule", formatRule).
			Msg("Processing conditional formatting rule")

		// Apply conditional formatting based on condition
		switch {
		case strings.Contains(condition, ">0") || strings.Contains(condition, "positive"):
			// Positive values - standard formatting
			if fontColor, ok := formatRule["font_color"].(string); ok {
				if format.Font == nil {
					format.Font = &FontStyle{}
				}
				format.Font.Color = fontColor
			}

		case strings.Contains(condition, "<0") || strings.Contains(condition, "negative"):
			// Negative values - typically red
			if fontColor, ok := formatRule["font_color"].(string); ok {
				if format.Font == nil {
					format.Font = &FontStyle{}
				}
				format.Font.Color = fontColor
			}
			// For negative financial values, often use parentheses format
			if format.NumberFormat != "" && !strings.Contains(format.NumberFormat, "_)") {
				format.NumberFormat = strings.Replace(format.NumberFormat, "0.00", "0.00_);[Red](0.00)", 1)
			}

		case strings.Contains(condition, "=0") || strings.Contains(condition, "zero"):
			// Zero values - often dash or special formatting
			if format.NumberFormat != "" {
				format.NumberFormat = strings.Replace(format.NumberFormat, "0.00", "0.00_);(0.00);\"-\"", 1)
			}
		}

		// Apply background color if specified
		if bgColor, ok := formatRule["background_color"].(string); ok {
			format.FillColor = bgColor
		}

		// Apply font style if specified
		if fontStyle, ok := formatRule["font_style"].(string); ok {
			if format.Font == nil {
				format.Font = &FontStyle{}
			}
			switch fontStyle {
			case "bold":
				format.Font.Bold = true
			case "italic":
				format.Font.Italic = true
			case "underline":
				// Note: Underline would need to be added to FontStyle struct
			}
		}

		// Apply font size if specified
		if fontSize, ok := formatRule["font_size"].(float64); ok {
			if format.Font == nil {
				format.Font = &FontStyle{}
			}
			format.Font.Size = fontSize
		}

		// Apply alignment if specified
		if alignment, ok := formatRule["alignment"].(map[string]interface{}); ok {
			if format.Alignment == nil {
				format.Alignment = &Alignment{}
			}
			if horizontal, ok := alignment["horizontal"].(string); ok {
				format.Alignment.Horizontal = horizontal
			}
			if vertical, ok := alignment["vertical"].(string); ok {
				format.Alignment.Vertical = vertical
			}
		}

		// Apply custom number format if specified
		if customFormat, ok := formatRule["number_format"].(string); ok {
			format.NumberFormat = customFormat
		}
	}

	log.Info().Msg("Conditional formatting rules applied successfully")
	return format
}

// Helper methods for audit trail

func (te *ToolExecutor) generateAuditTrail(data *RangeData, documentationType string, addComments bool, createDocumentationSheet bool, includeSources bool) map[string]interface{} {
	auditTrail := map[string]interface{}{
		"documentation_type": documentationType,
		"created_at":         time.Now().Format(time.RFC3339),
		"cell_comments":      make(map[string]string),
		"summary":            "",
		"recommendations":    []string{},
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

// executeOrganizeFinancialModel implements universal financial model organization
func (te *ToolExecutor) executeOrganizeFinancialModel(ctx context.Context, sessionID string, input map[string]interface{}) (map[string]interface{}, error) {
	log.Info().
		Str("session", sessionID).
		Msg("Starting financial model organization")

	// Extract parameters with defaults
	modelType, _ := input["model_type"].(string)
	sections, _ := input["sections"].([]interface{})
	layout, _ := input["layout"].(string)
	if layout == "" {
		layout = "horizontal" // Default layout
	}

	analysisRange, _ := input["analysis_range"].(string)
	if analysisRange == "" {
		analysisRange = "A1:Z100" // Default scan range
	}

	// Advanced: Extract professional standards and industry context
	professionalStandards, _ := input["professional_standards"].(string)
	industryContext, _ := input["industry_context"].(string)

	// Performance: Check cache first for recent reads
	cacheKey := fmt.Sprintf("%s:%s", sessionID, analysisRange)
	var data *RangeData
	var err error

	if cachedData := te.getCachedModelData(cacheKey); cachedData != nil {
		log.Debug().
			Str("cache_key", cacheKey).
			Msg("Using cached model data for performance")
		data = cachedData
	} else {
		// Read current model to understand structure
		log.Debug().
			Str("range", analysisRange).
			Msg("Reading current model structure")

		data, err = te.excelBridge.ReadRange(ctx, sessionID, analysisRange, true, false)
		if err != nil {
			return nil, fmt.Errorf("failed to read model for analysis: %w", err)
		}

		// Cache the data for future use
		te.cacheModelData(cacheKey, data)
	}

	// Advanced: Intelligent model type detection if not provided
	if modelType == "" {
		modelType = te.detectModelType(data)
		log.Info().
			Str("detected_model_type", modelType).
			Msg("Automatically detected model type")
	}

	// Advanced: Generate intelligent sections based on model type and context
	if len(sections) == 0 {
		sections = te.generateIntelligentSections(modelType, professionalStandards, industryContext)
		log.Info().
			Interface("sections", sections).
			Msg("Generated intelligent sections based on model type and context")
	}

	// Generate enhanced organization plan
	organizationPlan := te.generateEnhancedOrganizationPlan(data, modelType, sections, layout, professionalStandards, industryContext)

	log.Info().
		Int("sections", len(organizationPlan["sections"].([]interface{}))).
		Str("layout", layout).
		Msg("Generated organization plan")

	// Enhanced: Create backup before applying changes
	backupData, err := te.createModelBackup(ctx, sessionID, analysisRange)
	if err != nil {
		log.Warn().Err(err).Msg("Failed to create backup - proceeding without backup")
	}

	// Apply organization changes with error recovery
	err = te.applyModelOrganizationWithRecovery(ctx, sessionID, organizationPlan, backupData)
	if err != nil {
		return nil, fmt.Errorf("failed to apply model organization: %w", err)
	}

	return map[string]interface{}{
		"status":            "success",
		"message":           "Financial model organized successfully",
		"organization_plan": organizationPlan,
		"sections_created":  len(organizationPlan["sections"].([]interface{})),
		"layout":            layout,
		"model_type":        modelType,
	}, nil
}

// generateUniversalOrganizationPlan creates a universal organization plan for any financial model
func (te *ToolExecutor) generateUniversalOrganizationPlan(data *RangeData, modelType string, sections []interface{}, layout string) map[string]interface{} {
	plan := map[string]interface{}{
		"layout":     layout,
		"sections":   []interface{}{},
		"formatting": map[string]interface{}{},
		"spacing":    map[string]interface{}{},
	}

	// Universal sections that apply to all financial models
	defaultSections := []string{"assumptions", "calculations", "outputs", "summary"}
	if len(sections) == 0 {
		sections = make([]interface{}, len(defaultSections))
		for i, section := range defaultSections {
			sections[i] = section
		}
	}

	sectionPlans := []interface{}{}
	currentRow := 2 // Start at row 2 to leave space for title

	// Add model title section
	titlePlan := map[string]interface{}{
		"name":          "title",
		"type":          "header",
		"start_row":     1,
		"header_range":  fmt.Sprintf("A1:%s1", te.getLastColumn(layout)),
		"header_text":   te.getUniversalModelTitle(modelType),
		"header_style":  "title",
		"spacing_after": 1,
	}
	sectionPlans = append(sectionPlans, titlePlan)
	currentRow += 2

	// Create plans for each section
	for _, sectionInterface := range sections {
		section := sectionInterface.(string)

		sectionPlan := map[string]interface{}{
			"name":          section,
			"type":          te.getSectionType(section),
			"start_row":     currentRow,
			"header_style":  "section_header",
			"spacing_after": 2,
		}

		// Add section header
		headerRange := fmt.Sprintf("A%d:%s%d", currentRow, te.getLastColumn(layout), currentRow)
		sectionPlan["header_range"] = headerRange
		sectionPlan["header_text"] = te.getUniversalSectionHeader(section)

		currentRow += 3 // Header + spacing

		// Estimate section size based on type and model
		sectionRows := te.estimateSectionSize(section, modelType)
		sectionPlan["end_row"] = currentRow + sectionRows - 1
		sectionPlan["content_range"] = fmt.Sprintf("A%d:%s%d", currentRow, te.getLastColumn(layout), currentRow+sectionRows-1)

		currentRow += sectionRows + 2 // Content + spacing between sections

		sectionPlans = append(sectionPlans, sectionPlan)
	}

	plan["sections"] = sectionPlans

	// Add formatting specifications
	plan["formatting"] = map[string]interface{}{
		"title_format": map[string]interface{}{
			"font_size":  16,
			"bold":       true,
			"alignment":  "center",
			"fill_color": "#4472C4",
			"font_color": "#FFFFFF",
		},
		"section_header_format": map[string]interface{}{
			"font_size":  12,
			"bold":       true,
			"alignment":  "left",
			"fill_color": "#D9E1F2",
			"font_color": "#000000",
		},
		"input_format": map[string]interface{}{
			"font_color": "#0066CC",
			"fill_color": "#F0F8FF",
		},
		"calculation_format": map[string]interface{}{
			"font_color": "#000000",
		},
		"output_format": map[string]interface{}{
			"font_color": "#000000",
			"bold":       true,
		},
	}

	return plan
}

// detectModelType intelligently detects the financial model type from data
func (te *ToolExecutor) detectModelType(data *RangeData) string {
	if data == nil || data.Values == nil {
		return "universal"
	}

	// Convert all values to lowercase strings for analysis
	textContent := ""
	for _, row := range data.Values {
		for _, cell := range row {
			if cell != nil {
				textContent += strings.ToLower(fmt.Sprintf("%v ", cell))
			}
		}
	}

	log.Debug().
		Str("text_sample", textContent[:min(200, len(textContent))]).
		Msg("Analyzing text content for model type detection")

	// DCF indicators
	dcfKeywords := []string{"dcf", "wacc", "terminal", "perpetuity", "fcf", "free cash flow", "npv", "discount", "valuation"}
	dcfScore := 0
	for _, keyword := range dcfKeywords {
		if strings.Contains(textContent, keyword) {
			dcfScore++
		}
	}

	// LBO indicators
	lboKeywords := []string{"lbo", "leverage", "debt", "equity", "irr", "moic", "returns", "sponsor", "management"}
	lboScore := 0
	for _, keyword := range lboKeywords {
		if strings.Contains(textContent, keyword) {
			lboScore++
		}
	}

	// M&A indicators
	maKeywords := []string{"merger", "acquisition", "synergies", "accretion", "dilution", "premium", "target"}
	maScore := 0
	for _, keyword := range maKeywords {
		if strings.Contains(textContent, keyword) {
			maScore++
		}
	}

	// Trading Comps indicators
	compsKeywords := []string{"comparable", "trading", "multiple", "ev/ebitda", "p/e", "peer", "median"}
	compsScore := 0
	for _, keyword := range compsKeywords {
		if strings.Contains(textContent, keyword) {
			compsScore++
		}
	}

	// Determine model type based on highest score
	maxScore := dcfScore
	modelType := "dcf"

	if lboScore > maxScore {
		maxScore = lboScore
		modelType = "lbo"
	}
	if maScore > maxScore {
		maxScore = maScore
		modelType = "merger"
	}
	if compsScore > maxScore {
		maxScore = compsScore
		modelType = "comps"
	}

	// If no clear winner, return universal
	if maxScore < 2 {
		modelType = "universal"
	}

	log.Info().
		Int("dcf_score", dcfScore).
		Int("lbo_score", lboScore).
		Int("ma_score", maScore).
		Int("comps_score", compsScore).
		Str("detected_type", modelType).
		Msg("Model type detection completed")

	return modelType
}

// generateIntelligentSections creates sections based on model type and professional context
func (te *ToolExecutor) generateIntelligentSections(modelType, professionalStandards, industryContext string) []interface{} {
	var sections []string

	switch modelType {
	case "dcf":
		sections = []string{"company_overview", "assumptions", "financial_projections", "dcf_calculation", "sensitivity_analysis", "summary"}
		if professionalStandards == "investment_banking" {
			sections = append(sections, "football_field", "precedent_transactions")
		}

	case "lbo":
		sections = []string{"transaction_summary", "assumptions", "sources_uses", "debt_schedule", "cash_flow_projections", "returns_analysis", "sensitivity"}
		if professionalStandards == "private_equity" {
			sections = append(sections, "management_case", "downside_case")
		}

	case "merger", "m&a":
		sections = []string{"transaction_overview", "assumptions", "standalone_projections", "synergies", "pro_forma", "accretion_dilution", "sensitivity"}

	case "comps":
		sections = []string{"peer_selection", "financial_data", "multiples_calculation", "analysis", "summary"}

	default: // universal
		sections = []string{"assumptions", "calculations", "outputs", "summary"}
	}

	// Add industry-specific sections
	if industryContext == "technology" {
		sections = append(sections, "metrics", "unit_economics")
	} else if industryContext == "real_estate" {
		sections = append(sections, "property_details", "rental_analysis")
	} else if industryContext == "energy" {
		sections = append(sections, "commodity_assumptions", "production_forecasts")
	}

	// Convert to interface{} slice
	result := make([]interface{}, len(sections))
	for i, section := range sections {
		result[i] = section
	}

	return result
}

// generateEnhancedOrganizationPlan creates enhanced organization with professional standards
func (te *ToolExecutor) generateEnhancedOrganizationPlan(data *RangeData, modelType string, sections []interface{}, layout, professionalStandards, industryContext string) map[string]interface{} {
	// Start with universal plan
	plan := te.generateUniversalOrganizationPlan(data, modelType, sections, layout)

	// Enhance with professional standards
	if professionalStandards != "" {
		plan["professional_standards"] = professionalStandards
		plan = te.applyProfessionalStandards(plan, professionalStandards)
	}

	// Enhance with industry context
	if industryContext != "" {
		plan["industry_context"] = industryContext
		plan = te.applyIndustryContext(plan, industryContext)
	}

	// Add advanced features
	plan["advanced_features"] = map[string]interface{}{
		"intelligent_model_detection": modelType,
		"context_aware_sections":      true,
		"professional_formatting":     professionalStandards != "",
		"industry_customization":      industryContext != "",
	}

	return plan
}

// applyProfessionalStandards applies industry-specific professional standards
func (te *ToolExecutor) applyProfessionalStandards(plan map[string]interface{}, standards string) map[string]interface{} {
	formatting := plan["formatting"].(map[string]interface{})

	switch standards {
	case "investment_banking":
		// IB standards: Conservative colors, traditional formatting
		formatting["title_format"].(map[string]interface{})["fill_color"] = "#2E5090"          // Conservative blue
		formatting["section_header_format"].(map[string]interface{})["fill_color"] = "#B7C9E4" // Light blue

	case "private_equity":
		// PE standards: Bold, professional
		formatting["title_format"].(map[string]interface{})["fill_color"] = "#1B365D" // Dark blue
		formatting["title_format"].(map[string]interface{})["font_size"] = 14         // Larger title

	case "hedge_fund":
		// HF standards: Clean, minimal
		formatting["title_format"].(map[string]interface{})["fill_color"] = "#333333"          // Dark gray
		formatting["section_header_format"].(map[string]interface{})["fill_color"] = "#E5E5E5" // Light gray

	case "corporate":
		// Corporate standards: Company brand friendly
		formatting["title_format"].(map[string]interface{})["fill_color"] = "#0078D4"          // Microsoft blue
		formatting["section_header_format"].(map[string]interface{})["fill_color"] = "#DEECF9" // Light blue
	}

	plan["formatting"] = formatting
	return plan
}

// applyIndustryContext applies industry-specific customizations
func (te *ToolExecutor) applyIndustryContext(plan map[string]interface{}, industry string) map[string]interface{} {
	sections := plan["sections"].([]interface{})

	// Add industry-specific formatting or section modifications
	for i, sectionInterface := range sections {
		section := sectionInterface.(map[string]interface{})
		sectionName := section["name"].(string)

		// Customize section names for industry context
		switch industry {
		case "technology":
			if sectionName == "assumptions" {
				section["header_text"] = "Key Technology Assumptions & Unit Economics"
			}
		case "real_estate":
			if sectionName == "assumptions" {
				section["header_text"] = "Property Assumptions & Market Data"
			}
		case "energy":
			if sectionName == "assumptions" {
				section["header_text"] = "Commodity & Production Assumptions"
			}
		}

		sections[i] = section
	}

	plan["sections"] = sections
	return plan
}

// Helper function for min
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// createModelBackup creates a backup of the current model state
func (te *ToolExecutor) createModelBackup(ctx context.Context, sessionID string, analysisRange string) (*ModelBackup, error) {
	log.Info().
		Str("session", sessionID).
		Str("range", analysisRange).
		Msg("Creating model backup for error recovery")

	// Read current state
	data, err := te.excelBridge.ReadRange(ctx, sessionID, analysisRange, true, true) // Include formulas and formatting
	if err != nil {
		return nil, fmt.Errorf("failed to read model for backup: %w", err)
	}

	backup := &ModelBackup{
		SessionID:    sessionID,
		Range:        analysisRange,
		Data:         data,
		BackupTime:   time.Now(),
		BackupReason: "model_organization",
	}

	log.Info().
		Str("session", sessionID).
		Time("backup_time", backup.BackupTime).
		Msg("Model backup created successfully")

	return backup, nil
}

// applyModelOrganizationWithRecovery applies organization with automatic error recovery
func (te *ToolExecutor) applyModelOrganizationWithRecovery(ctx context.Context, sessionID string, plan map[string]interface{}, backup *ModelBackup) error {
	sections := plan["sections"].([]interface{})
	formatting := plan["formatting"].(map[string]interface{})

	log.Info().
		Int("sections", len(sections)).
		Msg("Applying model organization with error recovery")

	// Track applied changes for rollback
	appliedChanges := []ChangeRecord{}

	for i, sectionInterface := range sections {
		section := sectionInterface.(map[string]interface{})

		// Apply section header with error tracking
		if headerRange, ok := section["header_range"].(string); ok {
			if headerText, ok := section["header_text"].(string); ok {

				// Record change for potential rollback
				changeRecord := ChangeRecord{
					Operation: "write_header",
					Range:     headerRange,
					OldValue:  nil, // Could read current value first if needed
					NewValue:  headerText,
					Timestamp: time.Now(),
				}

				// Write header text with retry logic
				// Expand values to match range dimensions (Cursor-style auto-expansion)
				expandedValues, err := expandValuesToMatchRange(headerRange, [][]interface{}{{headerText}})
				if err != nil {
					log.Error().Err(err).
						Str("range", headerRange).
						Msg("Failed to expand header values")
					return err
				}

				err = te.writeWithRetry(ctx, sessionID, headerRange, expandedValues, false, 3)
				if err != nil {
					log.Error().Err(err).
						Str("range", headerRange).
						Int("section_index", i).
						Msg("Failed to write header - attempting recovery")

					// Attempt to rollback changes
					rollbackErr := te.rollbackChanges(ctx, sessionID, appliedChanges, backup)
					if rollbackErr != nil {
						log.Error().Err(rollbackErr).Msg("Rollback failed")
						return fmt.Errorf("failed to write header and rollback failed: %w", err)
					}
					return fmt.Errorf("failed to write header, changes rolled back: %w", err)
				}
				appliedChanges = append(appliedChanges, changeRecord)

				// Apply header formatting with retry logic
				headerStyle := section["header_style"].(string)
				formatStyle := "section_header_format"
				if headerStyle == "title" {
					formatStyle = "title_format"
				}

				if formatData, ok := formatting[formatStyle].(map[string]interface{}); ok {
					formatInput := map[string]interface{}{
						"range":      headerRange,
						"style_type": headerStyle,
					}

					// Add format properties
					for key, value := range formatData {
						formatInput[key] = value
					}

					err = te.executeSmartFormatCellsWithRetry(ctx, sessionID, formatInput, 3)
					if err != nil {
						log.Error().Err(err).
							Str("range", headerRange).
							Msg("Failed to format header - continuing with next section")
						// Continue with other sections rather than failing completely
					} else {
						// Record formatting change
						formatChangeRecord := ChangeRecord{
							Operation: "format_cells",
							Range:     headerRange,
							OldValue:  nil,
							NewValue:  formatInput,
							Timestamp: time.Now(),
						}
						appliedChanges = append(appliedChanges, formatChangeRecord)
					}
				}
			}
		}
	}

	log.Info().
		Int("applied_changes", len(appliedChanges)).
		Msg("Model organization applied successfully")

	return nil
}

// writeWithRetry performs write operations with retry logic
func (te *ToolExecutor) writeWithRetry(ctx context.Context, sessionID string, targetRange string, values [][]interface{}, preserveFormatting bool, maxRetries int) error {
	var lastErr error

	for attempt := 1; attempt <= maxRetries; attempt++ {
		err := te.excelBridge.WriteRange(ctx, sessionID, targetRange, values, preserveFormatting)
		if err == nil {
			if attempt > 1 {
				log.Info().
					Int("attempt", attempt).
					Str("range", targetRange).
					Msg("Write succeeded after retry")
			}
			return nil
		}

		// Check if operation is queued - don't retry in this case
		if err.Error() == "Tool execution queued for user approval" {
			log.Info().
				Str("range", targetRange).
				Msg("Write operation queued for user approval - not retrying")
			return err
		}

		lastErr = err
		log.Warn().
			Err(err).
			Int("attempt", attempt).
			Int("max_retries", maxRetries).
			Str("range", targetRange).
			Msg("Write failed, retrying")

		if attempt < maxRetries {
			// Exponential backoff
			backoffTime := time.Duration(attempt*500) * time.Millisecond
			time.Sleep(backoffTime)
		}
	}

	return fmt.Errorf("write failed after %d attempts: %w", maxRetries, lastErr)
}

// executeSmartFormatCellsWithRetry performs formatting with retry logic
func (te *ToolExecutor) executeSmartFormatCellsWithRetry(ctx context.Context, sessionID string, input map[string]interface{}, maxRetries int) error {
	var lastErr error

	for attempt := 1; attempt <= maxRetries; attempt++ {
		err := te.executeSmartFormatCells(ctx, sessionID, input)
		if err == nil {
			if attempt > 1 {
				log.Info().
					Int("attempt", attempt).
					Str("range", input["range"].(string)).
					Msg("Format succeeded after retry")
			}
			return nil
		}

		// Check if operation is queued - don't retry in this case
		if err.Error() == "Tool execution queued for user approval" {
			log.Info().
				Str("range", input["range"].(string)).
				Msg("Format operation queued for user approval - not retrying")
			return err
		}

		lastErr = err
		log.Warn().
			Err(err).
			Int("attempt", attempt).
			Int("max_retries", maxRetries).
			Interface("input", input).
			Msg("Format failed, retrying")

		if attempt < maxRetries {
			// Exponential backoff
			backoffTime := time.Duration(attempt*300) * time.Millisecond
			time.Sleep(backoffTime)
		}
	}

	return fmt.Errorf("format failed after %d attempts: %w", maxRetries, lastErr)
}

// rollbackChanges attempts to rollback applied changes using backup data
func (te *ToolExecutor) rollbackChanges(ctx context.Context, sessionID string, changes []ChangeRecord, backup *ModelBackup) error {
	if backup == nil {
		return fmt.Errorf("no backup available for rollback")
	}

	log.Warn().
		Int("changes_to_rollback", len(changes)).
		Str("session", sessionID).
		Msg("Attempting to rollback changes")

	// Simple rollback: restore entire range from backup
	if backup.Data != nil && backup.Data.Values != nil {
		err := te.excelBridge.WriteRange(ctx, sessionID, backup.Range, backup.Data.Values, false)
		if err != nil {
			return fmt.Errorf("failed to restore values from backup: %w", err)
		}

		log.Info().
			Str("range", backup.Range).
			Msg("Successfully restored values from backup")
	}

	// TODO: More sophisticated rollback could restore individual changes in reverse order
	// For now, we restore the entire range which is safer but less precise

	return nil
}

// Validation enhancement for better error detection
func (te *ToolExecutor) validateModelIntegrity(ctx context.Context, sessionID string, targetRange string) (*ValidationSummary, error) {
	log.Info().
		Str("session", sessionID).
		Str("range", targetRange).
		Msg("Validating model integrity")

	// Read current model state
	data, err := te.excelBridge.ReadRange(ctx, sessionID, targetRange, true, false)
	if err != nil {
		return nil, fmt.Errorf("failed to read model for validation: %w", err)
	}

	validation := &ValidationSummary{
		Range:          targetRange,
		ValidationTime: time.Now(),
		TotalCells:     0,
		ErrorCells:     []string{},
		WarnCells:      []string{},
		Issues:         []ValidationIssue{},
		OverallStatus:  "healthy",
	}

	// Count cells and detect issues
	if data.Values != nil {
		for i, row := range data.Values {
			for j, cell := range row {
				validation.TotalCells++
				cellAddr := fmt.Sprintf("%s%d", string(rune('A'+j)), i+1)

				if cell != nil {
					cellStr := fmt.Sprintf("%v", cell)

					// Check for Excel errors
					if strings.Contains(cellStr, "#") {
						validation.ErrorCells = append(validation.ErrorCells, cellAddr)
						validation.Issues = append(validation.Issues, ValidationIssue{
							Location:    cellAddr,
							Type:        "Error",
							Category:    "Formula",
							Description: fmt.Sprintf("Excel error in cell: %s", cellStr),
						})
					}
				}
			}
		}
	}

	// Determine overall status
	if len(validation.ErrorCells) > 0 {
		validation.OverallStatus = "errors_detected"
	} else if len(validation.WarnCells) > 0 {
		validation.OverallStatus = "warnings"
	}

	log.Info().
		Int("total_cells", validation.TotalCells).
		Int("error_cells", len(validation.ErrorCells)).
		Int("warning_cells", len(validation.WarnCells)).
		Str("status", validation.OverallStatus).
		Msg("Model integrity validation completed")

	return validation, nil
}

// Performance optimization types and methods

// CachedModelData represents cached model data with expiration
type CachedModelData struct {
	Data        *RangeData `json:"data"`
	CacheTime   time.Time  `json:"cache_time"`
	Expiration  time.Time  `json:"expiration"`
	AccessCount int        `json:"access_count"`
}

// OperationRequest represents a queued operation for parallel processing
type OperationRequest struct {
	ID        string                 `json:"id"`
	Operation string                 `json:"operation"`
	SessionID string                 `json:"session_id"`
	Input     map[string]interface{} `json:"input"`
	Result    chan OperationResult   `json:"-"`
	Context   context.Context        `json:"-"`
}

// OperationResult represents the result of a parallel operation
type OperationResult struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data"`
	Error   error       `json:"error"`
}

// getCachedModelData retrieves cached model data if valid
func (te *ToolExecutor) getCachedModelData(cacheKey string) *RangeData {
	te.cacheLock.RLock()
	defer te.cacheLock.RUnlock()

	if te.modelDataCache == nil {
		return nil
	}

	cached, exists := te.modelDataCache[cacheKey]
	if !exists {
		return nil
	}

	// Check if cache is expired (5 minutes TTL)
	if time.Now().After(cached.Expiration) {
		// Remove expired cache entry (defer to avoid deadlock)
		go func() {
			te.cacheLock.Lock()
			delete(te.modelDataCache, cacheKey)
			te.cacheLock.Unlock()
		}()
		return nil
	}

	// Update access count
	cached.AccessCount++

	log.Debug().
		Str("cache_key", cacheKey).
		Int("access_count", cached.AccessCount).
		Time("cached_at", cached.CacheTime).
		Msg("Cache hit for model data")

	return cached.Data
}

// cacheModelData stores model data in cache with TTL
func (te *ToolExecutor) cacheModelData(cacheKey string, data *RangeData) {
	te.cacheLock.Lock()
	defer te.cacheLock.Unlock()

	if te.modelDataCache == nil {
		te.modelDataCache = make(map[string]*CachedModelData)
	}

	// Cache with 5-minute TTL for balance of performance vs freshness
	te.modelDataCache[cacheKey] = &CachedModelData{
		Data:        data,
		CacheTime:   time.Now(),
		Expiration:  time.Now().Add(5 * time.Minute),
		AccessCount: 1,
	}

	log.Debug().
		Str("cache_key", cacheKey).
		Time("expiration", time.Now().Add(5*time.Minute)).
		Msg("Cached model data")

	// Clean up old cache entries (max 100 entries)
	if len(te.modelDataCache) > 100 {
		te.cleanupCache()
	}
}

// cleanupCache removes expired and least accessed cache entries
func (te *ToolExecutor) cleanupCache() {
	// Remove expired entries first
	now := time.Now()
	for key, cached := range te.modelDataCache {
		if now.After(cached.Expiration) {
			delete(te.modelDataCache, key)
		}
	}

	// If still too many entries, remove least accessed
	if len(te.modelDataCache) > 100 {
		// Simple LRU: remove entries with lowest access count
		minAccess := int(^uint(0) >> 1) // Max int
		var keyToRemove string

		for key, cached := range te.modelDataCache {
			if cached.AccessCount < minAccess {
				minAccess = cached.AccessCount
				keyToRemove = key
			}
		}

		if keyToRemove != "" {
			delete(te.modelDataCache, keyToRemove)
		}
	}

	log.Debug().
		Int("cache_size", len(te.modelDataCache)).
		Msg("Cache cleanup completed")
}

// ExecuteParallelOperations executes multiple operations in parallel for performance
func (te *ToolExecutor) ExecuteParallelOperations(ctx context.Context, operations []OperationRequest) ([]OperationResult, error) {
	if len(operations) == 0 {
		return []OperationResult{}, nil
	}

	log.Info().
		Int("operation_count", len(operations)).
		Msg("Starting parallel operation execution")

	startTime := time.Now()
	results := make([]OperationResult, len(operations))

	// Use goroutines for parallel execution
	var wg sync.WaitGroup
	for i, op := range operations {
		wg.Add(1)
		go func(index int, operation OperationRequest) {
			defer wg.Done()

			// Execute the operation
			result, err := te.executeOperation(operation.Context, operation)

			results[index] = OperationResult{
				Success: err == nil,
				Data:    result,
				Error:   err,
			}
		}(i, op)
	}

	// Wait for all operations to complete
	wg.Wait()

	duration := time.Since(startTime)
	successCount := 0
	for _, result := range results {
		if result.Success {
			successCount++
		}
	}

	log.Info().
		Int("total_operations", len(operations)).
		Int("successful_operations", successCount).
		Dur("duration", duration).
		Float64("avg_duration_per_op", float64(duration.Milliseconds())/float64(len(operations))).
		Msg("Parallel operation execution completed")

	return results, nil
}

// executeOperation executes a single operation (helper for parallel execution)
func (te *ToolExecutor) executeOperation(ctx context.Context, op OperationRequest) (interface{}, error) {
	switch op.Operation {
	case "read_range":
		rangeAddr, _ := op.Input["range"].(string)
		includeFormulas, _ := op.Input["include_formulas"].(bool)
		includeFormatting, _ := op.Input["include_formatting"].(bool)
		return te.excelBridge.ReadRange(ctx, op.SessionID, rangeAddr, includeFormulas, includeFormatting)

	case "analyze_data":
		rangeAddr, _ := op.Input["range"].(string)
		includeStats, _ := op.Input["include_stats"].(bool)
		detectHeaders, _ := op.Input["detect_headers"].(bool)
		return te.excelBridge.AnalyzeData(ctx, op.SessionID, rangeAddr, includeStats, detectHeaders)

	case "smart_format":
		err := te.executeSmartFormatCells(ctx, op.SessionID, op.Input)
		return map[string]interface{}{"success": err == nil}, err

	case "build_formula":
		return te.executeBuildFinancialFormula(ctx, op.SessionID, op.Input)

	default:
		return nil, fmt.Errorf("unsupported parallel operation: %s", op.Operation)
	}
}

// initializePerformanceOptimizations sets up performance features
func (te *ToolExecutor) initializePerformanceOptimizations() {
	te.modelDataCache = make(map[string]*CachedModelData)
	te.parallelWorkers = 4                               // Default worker count
	te.operationQueue = make(chan OperationRequest, 100) // Buffered queue

	log.Info().
		Int("parallel_workers", te.parallelWorkers).
		Int("queue_buffer", 100).
		Msg("Performance optimizations initialized")
}

// applyModelOrganization applies the organization plan to the Excel model
func (te *ToolExecutor) applyModelOrganization(ctx context.Context, sessionID string, plan map[string]interface{}) error {
	sections := plan["sections"].([]interface{})
	formatting := plan["formatting"].(map[string]interface{})

	log.Info().
		Int("sections", len(sections)).
		Msg("Applying model organization")

	for _, sectionInterface := range sections {
		section := sectionInterface.(map[string]interface{})

		// Apply section header
		if headerRange, ok := section["header_range"].(string); ok {
			if headerText, ok := section["header_text"].(string); ok {
				// Write header text
				err := te.excelBridge.WriteRange(ctx, sessionID, headerRange, [][]interface{}{{headerText}}, false)
				if err != nil {
					log.Error().Err(err).Str("range", headerRange).Msg("Failed to write header")
					continue
				}

				// Apply header formatting
				headerStyle := section["header_style"].(string)
				formatStyle := "section_header_format"
				if headerStyle == "title" {
					formatStyle = "title_format"
				}

				if formatData, ok := formatting[formatStyle].(map[string]interface{}); ok {
					formatInput := map[string]interface{}{
						"range":      headerRange,
						"style_type": headerStyle,
					}

					// Add format properties
					for key, value := range formatData {
						formatInput[key] = value
					}

					err = te.executeSmartFormatCells(ctx, sessionID, formatInput)
					if err != nil {
						log.Error().Err(err).Str("range", headerRange).Msg("Failed to format header")
					}
				}
			}
		}
	}

	return nil
}

// Helper methods for organization

func (te *ToolExecutor) getLastColumn(layout string) string {
	if layout == "vertical" {
		return "D" // Smaller width for vertical layouts
	}
	return "M" // Standard width for horizontal layouts
}

func (te *ToolExecutor) getUniversalModelTitle(modelType string) string {
	switch modelType {
	case "dcf":
		return "Discounted Cash Flow Model"
	case "lbo":
		return "Leveraged Buyout Model"
	case "merger", "m&a":
		return "Merger & Acquisition Model"
	case "comps", "trading_comps":
		return "Trading Comparables Analysis"
	case "credit":
		return "Credit Analysis Model"
	default:
		return "Financial Model"
	}
}

func (te *ToolExecutor) getUniversalSectionHeader(section string) string {
	switch section {
	case "assumptions":
		return "Key Assumptions & Inputs"
	case "calculations":
		return "Financial Calculations"
	case "outputs":
		return "Key Outputs & Results"
	case "summary":
		return "Executive Summary"
	case "sensitivity":
		return "Sensitivity Analysis"
	case "scenarios":
		return "Scenario Analysis"
	default:
		return strings.Title(section)
	}
}

func (te *ToolExecutor) getSectionType(section string) string {
	switch section {
	case "assumptions":
		return "input"
	case "calculations":
		return "calculation"
	case "outputs", "summary":
		return "output"
	default:
		return "general"
	}
}

func (te *ToolExecutor) estimateSectionSize(section string, modelType string) int {
	// Base sizes
	baseSizes := map[string]int{
		"headers":       2,
		"timeline":      3,
		"assumptions":   20,
		"revenue":       10,
		"costs":         15,
		"calculations":  25,
		"cash_flow":     15,
		"balance_sheet": 20,
		"outputs":       10,
		"metrics":       15,
		"valuation":     20,
		"returns":       10,
		"sensitivity":   15,
		"debt_schedule": 20,
		"scenarios":     10,
		"summary":       5,
		"charts":        0, // Charts don't need rows
	}

	// Adjustments based on model type
	switch modelType {
	case "DCF":
		if section == "valuation" {
			return 30 // More space for DCF valuation
		}
	case "LBO":
		if section == "debt_schedule" {
			return 30 // More space for debt schedules
		}
		if section == "returns" {
			return 20 // More space for returns analysis
		}
	case "M&A":
		if section == "calculations" {
			return 35 // More space for synergies and adjustments
		}
	}

	if size, ok := baseSizes[section]; ok {
		return size
	}
	return 10 // Default size
}

// expandValuesToMatchRange expands a single value to fill the entire range
// Similar to how Cursor auto-completes patterns
func expandValuesToMatchRange(rangeAddr string, values [][]interface{}) ([][]interface{}, error) {
	// Parse range to get dimensions
	parts := strings.Split(rangeAddr, ":")
	if len(parts) != 2 {
		return values, nil // Single cell, no expansion needed
	}

	startCol, startRow, err := parseCell(parts[0])
	if err != nil {
		return nil, fmt.Errorf("invalid start cell: %w", err)
	}

	endCol, endRow, err := parseCell(parts[1])
	if err != nil {
		return nil, fmt.Errorf("invalid end cell: %w", err)
	}

	neededRows := endRow - startRow + 1
	neededCols := endCol - startCol + 1

	// If values is a single cell, expand it to fill the range
	if len(values) == 1 && len(values[0]) == 1 {
		expandedValues := make([][]interface{}, neededRows)
		for i := 0; i < neededRows; i++ {
			expandedValues[i] = make([]interface{}, neededCols)
			for j := 0; j < neededCols; j++ {
				expandedValues[i][j] = values[0][0]
			}
		}
		return expandedValues, nil
	}

	// If dimensions already match, return as is
	if len(values) == neededRows && len(values[0]) == neededCols {
		return values, nil
	}

	return nil, newEnhancedError(
		fmt.Sprintf("Dimension mismatch: provided %dx%d, expected %dx%d",
			len(values), len(values[0]), neededRows, neededCols),
		fmt.Sprintf("Trying to write to range %s which needs %dx%d values",
			rangeAddr, neededRows, neededCols),
		"The values will be automatically expanded if single cell, otherwise ensure your data matches the target range dimensions",
	)
}

// parseCell extracts column and row from a cell reference (e.g., "A1" -> 0, 0)
func parseCell(cell string) (col, row int, err error) {
	// Remove sheet reference if present
	if idx := strings.Index(cell, "!"); idx >= 0 {
		cell = cell[idx+1:]
	}

	// Extract column letters and row number
	colStr := ""
	rowStr := ""
	for i, ch := range cell {
		if ch >= 'A' && ch <= 'Z' {
			colStr += string(ch)
		} else if ch >= '0' && ch <= '9' {
			rowStr = cell[i:]
			break
		}
	}

	// Convert column letters to number (A=0, B=1, etc.)
	col = 0
	for i := 0; i < len(colStr); i++ {
		col = col*26 + int(colStr[i]-'A')
	}

	// Convert row string to number (1-based to 0-based)
	row64, err := strconv.ParseInt(rowStr, 10, 32)
	if err != nil {
		return 0, 0, fmt.Errorf("invalid row number: %s", rowStr)
	}
	row = int(row64) - 1

	return col, row, nil
}

// executeMemorySearch performs memory search
func (te *ToolExecutor) executeMemorySearch(ctx context.Context, sessionID string, input map[string]interface{}) (interface{}, error) {
	// Extract parameters
	query, ok := input["query"].(string)
	if !ok || query == "" {
		return nil, fmt.Errorf("query parameter is required")
	}

	sourceFilter, _ := input["source_filter"].(string)
	if sourceFilter == "" {
		sourceFilter = "all"
	}

	limit := 5
	if l, ok := input["limit"].(float64); ok {
		limit = int(l)
		if limit < 1 {
			limit = 1
		} else if limit > 10 {
			limit = 10
		}
	}

	includeContext := true
	if ic, ok := input["include_context"].(bool); ok {
		includeContext = ic
	}

	// Get session memory store through the Excel bridge
	if te.excelBridge == nil {
		return nil, fmt.Errorf("excel bridge not available for memory search")
	}
	
	// Get the session from Excel bridge
	session := te.excelBridge.GetSession(sessionID)
	if session == nil {
		return nil, fmt.Errorf("session not found: %s", sessionID)
	}
	
	// Check if memory store exists
	if session.MemoryStore == nil {
		log.Warn().
			Str("session", sessionID).
			Msg("Memory search called but no memory store available for session")
		return map[string]interface{}{
			"results": []interface{}{},
			"message": "No indexed content available for this session",
		}, nil
	}
	
	memStore := *session.MemoryStore
	
	// Create filter based on source type
	var filter memory.FilterFunc
	if sourceFilter != "all" {
		filter = func(chunk memory.Chunk) bool {
			return chunk.Metadata.Source == sourceFilter
		}
	}
	
	// Perform search
	var searchResults []memory.SearchResult
	var err error
	
	if te.embeddingProvider != nil {
		// Use vector search with embeddings
		log.Info().
			Str("session", sessionID).
			Str("query", query).
			Str("source_filter", sourceFilter).
			Int("limit", limit).
			Msg("Performing vector search with embeddings")
			
		queryVector, err := te.embeddingProvider.GetEmbedding(ctx, query)
		if err != nil {
			log.Warn().Err(err).Msg("Failed to get query embedding, falling back to keyword search")
			// Fall back to keyword search
			if inMemStore, ok := memStore.(*memory.InMemoryStore); ok {
				keywords := strings.Fields(query)
				searchResults = inMemStore.KeywordSearch(keywords, limit, filter)
			}
		} else {
			searchResults, err = memStore.Search(queryVector, limit, filter)
			if err != nil {
				return nil, fmt.Errorf("vector search failed: %w", err)
			}
		}
	} else {
		// Fallback to keyword search
		log.Info().
			Str("session", sessionID).
			Str("query", query).
			Msg("Performing keyword search (no embedding provider)")
			
		if inMemStore, ok := memStore.(*memory.InMemoryStore); ok {
			keywords := strings.Fields(query)
			searchResults = inMemStore.KeywordSearch(keywords, limit, filter)
		} else {
			return nil, fmt.Errorf("keyword search not supported for this memory store type")
		}
	}
	
	// Format results
	results := make([]map[string]interface{}, 0, len(searchResults))
	for _, result := range searchResults {
		resultMap := map[string]interface{}{
			"source":     result.Chunk.Metadata.Source,
			"content":    result.Chunk.Content,
			"similarity": result.Similarity,
			"reference":  formatChunkReference(result.Chunk),
		}
		
		// Add source-specific metadata
		switch result.Chunk.Metadata.Source {
		case "spreadsheet":
			resultMap["sheet_name"] = result.Chunk.Metadata.SheetName
			resultMap["cell_range"] = result.Chunk.Metadata.CellRange
			resultMap["is_formula"] = result.Chunk.Metadata.IsFormula
		case "document":
			resultMap["document_name"] = result.Chunk.Metadata.DocumentName
			resultMap["page_number"] = result.Chunk.Metadata.PageNumber
			resultMap["section"] = result.Chunk.Metadata.Section
		case "chat":
			resultMap["message_id"] = result.Chunk.Metadata.MessageID
			resultMap["role"] = result.Chunk.Metadata.Role
			resultMap["turn"] = result.Chunk.Metadata.Turn
		}
		
		// Include surrounding context if requested
		if includeContext && result.Chunk.Metadata.SourceMeta != nil {
			if context, ok := result.Chunk.Metadata.SourceMeta["context"]; ok {
				resultMap["context"] = context
			}
		}
		
		results = append(results, resultMap)
	}
	
	log.Info().
		Str("session", sessionID).
		Int("results_count", len(results)).
		Msg("Memory search completed")
	
	return map[string]interface{}{
		"results":       results,
		"query":         query,
		"source_filter": sourceFilter,
		"total_results": len(results),
	}, nil
}

// formatChunkReference formats a chunk's metadata into a readable reference
func formatChunkReference(chunk memory.Chunk) string {
	switch chunk.Metadata.Source {
	case "spreadsheet":
		if chunk.Metadata.SheetName != "" && chunk.Metadata.CellRange != "" {
			return fmt.Sprintf("%s!%s", chunk.Metadata.SheetName, chunk.Metadata.CellRange)
		}
		return chunk.Metadata.SheetName
	case "document":
		ref := chunk.Metadata.DocumentName
		if chunk.Metadata.PageNumber > 0 {
			ref += fmt.Sprintf(" (page %d)", chunk.Metadata.PageNumber)
		}
		if chunk.Metadata.Section != "" {
			ref += fmt.Sprintf(" - %s", chunk.Metadata.Section)
		}
		return ref
	case "chat":
		return fmt.Sprintf("Chat turn %d (%s)", chunk.Metadata.Turn, chunk.Metadata.Role)
	default:
		return chunk.Metadata.Source
	}
}

// executeTracePrecedents traces cells that feed into a given formula
func (te *ToolExecutor) executeTracePrecedents(ctx context.Context, sessionID string, input map[string]interface{}) (interface{}, error) {
	// Extract parameters
	cell, ok := input["cell"].(string)
	if !ok || cell == "" {
		return nil, fmt.Errorf("cell parameter is required")
	}

	includeValues := true
	if iv, ok := input["include_values"].(bool); ok {
		includeValues = iv
	}

	includeFormulas := true
	if inf, ok := input["include_formulas"].(bool); ok {
		includeFormulas = inf
	}

	maxDepth := 2
	if md, ok := input["max_depth"].(float64); ok {
		maxDepth = int(md)
		if maxDepth < 1 {
			maxDepth = 1
		} else if maxDepth > 5 {
			maxDepth = 5
		}
	}

	// Read the target cell to get its formula
	rangeData, err := te.excelBridge.ReadRange(ctx, sessionID, cell, true, false)
	if err != nil {
		return nil, fmt.Errorf("failed to read cell %s: %w", cell, err)
	}

	if rangeData == nil || len(rangeData.Values) == 0 || len(rangeData.Values[0]) == 0 {
		return nil, fmt.Errorf("cell %s not found or empty", cell)
	}

	// Get the formula
	var formula string
	if rangeData.Formulas != nil && len(rangeData.Formulas) > 0 && len(rangeData.Formulas[0]) > 0 {
		if f, ok := rangeData.Formulas[0][0].(string); ok {
			formula = f
		}
	}

	if formula == "" {
		return map[string]interface{}{
			"cell":        cell,
			"value":       rangeData.Values[0][0],
			"has_formula": false,
			"precedents":  []interface{}{},
			"message":     "Cell has no formula, therefore no precedents",
		}, nil
	}

	// Extract cell references from the formula
	precedents := te.extractPrecedentsFromFormula(formula, cell, maxDepth, sessionID, ctx, includeValues, includeFormulas)

	return map[string]interface{}{
		"cell":        cell,
		"formula":     formula,
		"value":       rangeData.Values[0][0],
		"precedents":  precedents,
		"depth_limit": maxDepth,
	}, nil
}

// executeTraceDependents traces cells that use a given cell
func (te *ToolExecutor) executeTraceDependents(ctx context.Context, sessionID string, input map[string]interface{}) (interface{}, error) {
	// Extract parameters
	cell, ok := input["cell"].(string)
	if !ok || cell == "" {
		return nil, fmt.Errorf("cell parameter is required")
	}

	includeValues := true
	if iv, ok := input["include_values"].(bool); ok {
		includeValues = iv
	}

	includeFormulas := true
	if inf, ok := input["include_formulas"].(bool); ok {
		includeFormulas = inf
	}

	searchAllSheets := false
	if sas, ok := input["search_all_sheets"].(bool); ok {
		searchAllSheets = sas
	}

	// For now, we'll do a simple implementation that searches the current sheet
	// In a full implementation, this would use Excel's dependency tracking
	
	// Get the current sheet's used range
	// This is a simplified approach - in practice, Excel APIs provide better dependency tracking
	searchRange := "A1:Z1000" // Default search range
	
	dependents := []map[string]interface{}{}
	
	// Read the search range
	rangeData, err := te.excelBridge.ReadRange(ctx, sessionID, searchRange, true, false)
	if err != nil {
		log.Warn().Err(err).Msg("Failed to read range for dependent search")
		// Return empty result instead of error
		return map[string]interface{}{
			"cell":       cell,
			"dependents": dependents,
			"message":    "Could not search full range, results may be incomplete",
		}, nil
	}

	// Search for formulas that reference the target cell
	cellPattern := regexp.MustCompile(fmt.Sprintf(`\b%s\b`, regexp.QuoteMeta(cell)))
	
	if rangeData != nil && rangeData.Formulas != nil {
		for row := 0; row < len(rangeData.Formulas); row++ {
			for col := 0; col < len(rangeData.Formulas[row]); col++ {
				if formula, ok := rangeData.Formulas[row][col].(string); ok && formula != "" {
					if cellPattern.MatchString(formula) {
						// Found a dependent
						depCell := getCellAddress(row+1, col+1) // Assuming A1 start
						
						dep := map[string]interface{}{
							"cell":    depCell,
							"formula": formula,
						}
						
						if includeValues && row < len(rangeData.Values) && col < len(rangeData.Values[row]) {
							dep["value"] = rangeData.Values[row][col]
						}
						
						dependents = append(dependents, dep)
					}
				}
			}
		}
	}

	result := map[string]interface{}{
		"cell":             cell,
		"dependents":       dependents,
		"dependents_count": len(dependents),
		"search_scope":     searchRange,
	}

	if searchAllSheets {
		result["message"] = "Note: Cross-sheet dependent search not yet implemented"
	}

	return result, nil
}

// extractPrecedentsFromFormula extracts and traces precedent cells from a formula
func (te *ToolExecutor) extractPrecedentsFromFormula(formula string, currentCell string, depth int, sessionID string, ctx context.Context, includeValues, includeFormulas bool) []map[string]interface{} {
	if depth <= 0 {
		return []map[string]interface{}{}
	}

	precedents := []map[string]interface{}{}
	
	// Extract cell references using regex
	// Matches: A1, $A$1, Sheet1!A1, 'Sheet Name'!A1
	cellRefRegex := regexp.MustCompile(`(?:'([^']+)'|(\w+))?!?(\$?[A-Z]+\$?\d+)`)
	matches := cellRefRegex.FindAllStringSubmatch(formula, -1)
	
	seenCells := make(map[string]bool)
	
	for _, match := range matches {
		var cellRef string
		if match[1] != "" || match[2] != "" {
			// Has sheet reference
			sheet := match[1]
			if sheet == "" {
				sheet = match[2]
			}
			cellRef = fmt.Sprintf("%s!%s", sheet, match[3])
		} else {
			// Same sheet reference
			cellRef = match[3]
		}
		
		// Avoid duplicates
		if seenCells[cellRef] {
			continue
		}
		seenCells[cellRef] = true
		
		precedent := map[string]interface{}{
			"cell":  cellRef,
			"depth": 3 - depth, // Convert remaining depth to current depth
		}
		
		// Get value and formula if requested
		if includeValues || includeFormulas {
			rangeData, err := te.excelBridge.ReadRange(ctx, sessionID, cellRef, includeFormulas, false)
			if err == nil && rangeData != nil && len(rangeData.Values) > 0 && len(rangeData.Values[0]) > 0 {
				if includeValues {
					precedent["value"] = rangeData.Values[0][0]
				}
				
				if includeFormulas && rangeData.Formulas != nil && len(rangeData.Formulas) > 0 && len(rangeData.Formulas[0]) > 0 {
					if f, ok := rangeData.Formulas[0][0].(string); ok && f != "" {
						precedent["formula"] = f
						
						// Recursively trace precedents
						if depth > 1 {
							subPrecedents := te.extractPrecedentsFromFormula(f, cellRef, depth-1, sessionID, ctx, includeValues, includeFormulas)
							if len(subPrecedents) > 0 {
								precedent["precedents"] = subPrecedents
							}
						}
					}
				}
			}
		}
		
		precedents = append(precedents, precedent)
	}
	
	return precedents
}

// getCellAddress converts row and column numbers to Excel cell address
func getCellAddress(row, col int) string {
	// Convert column number to Excel column letters (A, B, ..., Z, AA, AB, ...)
	columnName := ""
	for col > 0 {
		col-- // Adjust to 0-based
		columnName = string(rune('A'+(col%26))) + columnName
		col = col / 26
	}
	return fmt.Sprintf("%s%d", columnName, row)
}
