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

// CompletionRequest represents a request for text completion
type CompletionRequest struct {
	Messages      []Message `json:"messages"`
	MaxTokens     int       `json:"max_tokens,omitempty"`
	Temperature   float32   `json:"temperature,omitempty"`
	TopP          float32   `json:"top_p,omitempty"`
	Stream        bool      `json:"stream,omitempty"`
	Model         string    `json:"model,omitempty"`
	SystemPrompt  string    `json:"system_prompt,omitempty"`
	StopSequences []string  `json:"stop_sequences,omitempty"`
}

// CompletionResponse represents a completion response
type CompletionResponse struct {
	ID       string    `json:"id"`
	Content  string    `json:"content"`
	Model    string    `json:"model"`
	Usage    Usage     `json:"usage"`
	Created  time.Time `json:"created"`
	Actions  []Action  `json:"actions,omitempty"` // Parsed suggested actions
}

// CompletionChunk represents a streaming chunk
type CompletionChunk struct {
	ID      string `json:"id"`
	Content string `json:"content"`
	Delta   string `json:"delta"`
	Done    bool   `json:"done"`
	Error   error  `json:"error,omitempty"`
}

// Message represents a conversation message
type Message struct {
	Role    string `json:"role"`    // "user", "assistant", "system"
	Content string `json:"content"`
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
	WorkbookName    string                 `json:"workbook_name"`
	WorksheetName   string                 `json:"worksheet_name"`
	SelectedRange   string                 `json:"selected_range"`
	CellValues      map[string]interface{} `json:"cell_values"`
	Formulas        map[string]string      `json:"formulas"`
	ModelType       string                 `json:"model_type"` // "DCF", "LBO", "M&A", etc.
	RecentChanges   []CellChange          `json:"recent_changes"`
	DocumentContext []string              `json:"document_context"` // Relevant document snippets
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