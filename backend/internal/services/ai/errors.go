package ai

import "time"

type ToolErrorType string

const (
	ToolErrorTypeInvalidInput   ToolErrorType = "invalid_input"
	ToolErrorTypeExecutionError ToolErrorType = "execution_error"
	ToolErrorTypeTimeout        ToolErrorType = "timeout"
	ToolErrorTypePermission     ToolErrorType = "permission_denied"
	ToolErrorTypeRateLimit      ToolErrorType = "rate_limit"
)

type ToolError struct {
	Type       ToolErrorType          `json:"type"`
	Message    string                 `json:"message"`
	Details    map[string]interface{} `json:"details,omitempty"`
	Retryable  bool                   `json:"retryable"`
	RetryAfter *time.Duration         `json:"retry_after,omitempty"`
	ToolName   string                 `json:"tool_name"`
	ToolID     string                 `json:"tool_id"`
}

func (e *ToolError) Error() string {
	return e.Message
}