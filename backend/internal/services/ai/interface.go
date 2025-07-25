package ai

import (
	"context"
	"time"
)

// AIProvider defines the interface for AI service providers
type AIProvider interface {
	// GetCompletion gets a single completion response
	GetCompletion(ctx context.Context, request CompletionRequest) (*CompletionResponse, error)
	
	// GetStreamingCompletion gets a streaming completion response
	GetStreamingCompletion(ctx context.Context, request CompletionRequest) (<-chan CompletionChunk, error)
	
	// GetEmbedding generates embeddings for text
	GetEmbedding(ctx context.Context, text string) ([]float32, error)
	
	// GetProviderName returns the name of the provider
	GetProviderName() string
	
	// IsHealthy checks if the provider is available
	IsHealthy(ctx context.Context) error
}

// ToolChoice represents the tool selection strategy
type ToolChoice struct {
	Type string `json:"type"` // "auto", "any", "none", or "tool"
	Name string `json:"name,omitempty"` // For specific tool selection
}

// CompletionRequest represents a request for text completion
type CompletionRequest struct {
	Messages      []Message    `json:"messages"`
	MaxTokens     int          `json:"max_tokens,omitempty"`
	Temperature   float32      `json:"temperature,omitempty"`
	TopP          float32      `json:"top_p,omitempty"`
	Stream        bool         `json:"stream,omitempty"`
	Model         string       `json:"model,omitempty"`
	SystemPrompt  string       `json:"system_prompt,omitempty"`
	StopSequences []string     `json:"stop_sequences,omitempty"`
	Tools         []ExcelTool  `json:"tools,omitempty"`
	ToolChoice    *ToolChoice  `json:"tool_choice,omitempty"`
}

// CompletionResponse represents a completion response
type CompletionResponse struct {
	ID       string     `json:"id"`
	Content  string     `json:"content"`
	Model    string     `json:"model"`
	Usage    Usage      `json:"usage"`
	Created  time.Time  `json:"created"`
	Actions  []Action   `json:"actions,omitempty"` // Parsed suggested actions
	ToolCalls []ToolCall `json:"tool_calls,omitempty"` // Tool calls requested by the AI
	IsFinal   bool       `json:"is_final,omitempty"` // Indicates if this is the final response (no more tool calls expected)
}

// CompletionChunk represents a streaming chunk
type CompletionChunk struct {
	ID       string     `json:"id"`
	Content  string     `json:"content"`
	Delta    string     `json:"delta"`
	Done     bool       `json:"done"`
	Error    error      `json:"error,omitempty"`
	Type     string     `json:"type,omitempty"` // "text", "tool_start", "tool_progress", "tool_complete"
	ToolCall *ToolCall  `json:"tool_call,omitempty"`
}

// Message represents a conversation message
type Message struct {
	Role    string        `json:"role"`    // "user", "assistant", "system"
	Content string        `json:"content"`
	ToolCalls   []ToolCall    `json:"tool_calls,omitempty"`   // Tool calls made by assistant
	ToolResults []ToolResult  `json:"tool_results,omitempty"` // Results from tool execution
}

// Usage represents token usage statistics
type Usage struct {
	PromptTokens     int `json:"prompt_tokens"`
	CompletionTokens int `json:"completion_tokens"`
	TotalTokens      int `json:"total_tokens"`
}

// Action represents an AI-suggested action
type Action struct {
	Type        string                 `json:"type"`         // "cell_update", "formula", "create_chart", etc.
	Description string                 `json:"description"`  // Human-readable description
	Parameters  map[string]interface{} `json:"parameters"`   // Action-specific parameters
	Confidence  float32                `json:"confidence"`   // 0.0 to 1.0
	RequiresApproval bool              `json:"requires_approval"`
}

// FinancialContext represents financial modeling context
type FinancialContext struct {
	WorkbookName      string                 `json:"workbook_name"`
	WorksheetName     string                 `json:"worksheet_name"`
	SelectedRange     string                 `json:"selected_range"`
	CellValues        map[string]interface{} `json:"cell_values"`
	Formulas          map[string]string      `json:"formulas"`
	ModelType         string                 `json:"model_type"` // "DCF", "LBO", "M&A", etc.
	RecentChanges     []CellChange          `json:"recent_changes"`
	DocumentContext   []string              `json:"document_context"` // Relevant document snippets
	ModelStructure    *ModelStructure       `json:"model_structure,omitempty"` // Enhanced structure understanding
	PendingOperations interface{}           `json:"pending_operations,omitempty"` // Summary of queued operations
	NamedRanges       map[string]NamedRangeInfo `json:"named_ranges,omitempty"` // Named ranges in the workbook
	CrossSheetRefs    map[string]interface{} `json:"cross_sheet_refs,omitempty"` // Cross-sheet references and their values
	DataSummary       map[string]interface{} `json:"data_summary,omitempty"` // Statistical summary for large datasets
}

// NamedRangeInfo represents information about a named range
type NamedRangeInfo struct {
	Name    string      `json:"name"`
	Address string      `json:"address"`
	Value   interface{} `json:"value,omitempty"`
	Formula string      `json:"formula,omitempty"`
	Scope   string      `json:"scope"` // "workbook" or sheet name
}

// ModelStructure represents the structural understanding of a financial model
type ModelStructure struct {
	DataDirection     string                     `json:"data_direction"`      // "horizontal", "vertical"
	PeriodColumns     []string                   `json:"period_columns"`      // ["B", "C", "D"] for time periods
	LabelColumns      []string                   `json:"label_columns"`       // ["A"] for row headers
	FirstDataCell     string                     `json:"first_data_cell"`     // "B3" - first actual data cell
	TimeOrientation   string                     `json:"time_orientation"`    // "columns", "rows"
	CellRoles         map[string]string          `json:"cell_roles"`          // cell -> "input", "calculation", "output"
	ModelSections     map[string]CellRange       `json:"model_sections"`      // "assumptions" -> range
	KeyCells          map[string]string          `json:"key_cells"`           // "wacc" -> "D15"
	Dependencies      []CellDependency           `json:"dependencies"`        // Formula dependency graph
	PeriodHeaders     []PeriodInfo               `json:"period_headers"`      // Time period information
}

// CellRange represents a range of cells in the model
type CellRange struct {
	StartCell string `json:"start_cell"`
	EndCell   string `json:"end_cell"`
	Address   string `json:"address"`   // Full range address like "A1:D10"
	Purpose   string `json:"purpose"`   // "assumptions", "calculations", "outputs", "headers"
}

// CellDependency represents a dependency between cells
type CellDependency struct {
	FromCell     string   `json:"from_cell"`      // Cell that depends on others
	ToCells      []string `json:"to_cells"`       // Cells it depends on
	Relationship string   `json:"relationship"`   // "direct", "growth", "ratio", "sum"
}

// PeriodInfo represents information about a time period in the model
type PeriodInfo struct {
	Column       string `json:"column"`         // "B", "C", "D"
	Header       string `json:"header"`         // "2024", "2025", "Q1 2024"
	PeriodType   string `json:"period_type"`    // "year", "quarter", "month"
	IsHistorical bool   `json:"is_historical"`  // true for historical periods
	IsProjected  bool   `json:"is_projected"`   // true for projected periods
	Order        int    `json:"order"`          // Sequential order (0, 1, 2...)
}

// CellChange represents a recent cell change
type CellChange struct {
	Address   string      `json:"address"`
	OldValue  interface{} `json:"old_value"`
	NewValue  interface{} `json:"new_value"`
	Timestamp time.Time   `json:"timestamp"`
	Source    string      `json:"source"` // "user", "ai", "formula"
}

// ProviderConfig holds configuration for AI providers
type ProviderConfig struct {
	APIKey      string        `json:"api_key"`
	Endpoint    string        `json:"endpoint,omitempty"`
	Model       string        `json:"model,omitempty"`
	Timeout     time.Duration `json:"timeout"`
	MaxRetries  int           `json:"max_retries"`
	RetryDelay  time.Duration `json:"retry_delay"`
}

// ErrorType represents different types of AI service errors
type ErrorType string

const (
	ErrorTypeAuth          ErrorType = "authentication"
	ErrorTypeRateLimit     ErrorType = "rate_limit"
	ErrorTypeInvalidInput  ErrorType = "invalid_input"
	ErrorTypeServerError   ErrorType = "server_error"
	ErrorTypeTimeout       ErrorType = "timeout"
	ErrorTypeUnavailable   ErrorType = "unavailable"
)

// AIError represents an AI service error
type AIError struct {
	Type       ErrorType `json:"type"`
	Message    string    `json:"message"`
	Code       string    `json:"code,omitempty"`
	RetryAfter int       `json:"retry_after,omitempty"` // seconds
	Underlying error     `json:"-"`
}

func (e *AIError) Error() string {
	return e.Message
}

func (e *AIError) Unwrap() error {
	return e.Underlying
}

// IsRetryable returns true if the error is potentially retryable
func (e *AIError) IsRetryable() bool {
	switch e.Type {
	case ErrorTypeRateLimit, ErrorTypeServerError, ErrorTypeTimeout, ErrorTypeUnavailable:
		return true
	default:
		return false
	}
}