package services

import "time"

// SelectionChanged represents a cell selection change
type SelectionChanged struct {
	SelectedRange string `json:"selected_range"`
	SelectedCell  string `json:"selected_cell"`
}

// ChatMessage represents a chat message from a client
type ChatMessage struct {
	Content      string                 `json:"content"`
	SessionID    string                 `json:"session_id"`
	Context      map[string]interface{} `json:"context,omitempty"`
	AutonomyMode string                 `json:"autonomy_mode,omitempty"`
}

// ChatResponse represents a response to a chat message
type ChatResponse struct {
	Content     string           `json:"content"`
	Suggestions []string         `json:"suggestions,omitempty"`
	Actions     []ProposedAction `json:"actions,omitempty"`
	SessionID   string           `json:"session_id"`
	IsFinal     bool             `json:"is_final"`
}

// ProposedAction represents an action proposed by the AI
type ProposedAction struct {
	ID          string                 `json:"id"`
	Type        string                 `json:"type"`
	Description string                 `json:"description"`
	Parameters  map[string]interface{} `json:"parameters,omitempty"`
}

// CellUpdate represents a cell value update
type CellUpdate struct {
	Sheet string      `json:"sheet"`
	Cell  string      `json:"cell"`
	Value interface{} `json:"value"`
}

// RangeData represents data from a spreadsheet range
type RangeData struct {
	Sheet  string          `json:"sheet"`
	Range  string          `json:"range"`
	Values [][]interface{} `json:"values"`
}

// ApplyChangesResponse represents the result of applying changes
type ApplyChangesResponse struct {
	Success      bool     `json:"success"`
	AppliedCount int      `json:"applied_count"`
	FailedCount  int      `json:"failed_count"`
	BackupID     string   `json:"backup_id"`
	Errors       []string `json:"errors,omitempty"`
}

// Message represents a generic message structure
type Message struct {
	Type      string      `json:"type"`
	Data      interface{} `json:"data"`
	SessionID string      `json:"session_id,omitempty"`
	Timestamp time.Time   `json:"timestamp"`
}

// MessageType constants
const (
	MessageTypeChatRequest      = "chat_request"
	MessageTypeChatResponse     = "chat_response"
	MessageTypeSelectionChanged = "selection_changed"
	MessageTypeCellValueUpdate  = "cell_value_update"
	MessageTypeRangeDataUpdate  = "range_data_update"
	MessageTypeToolRequest      = "tool_request"
	MessageTypeToolResponse     = "tool_response"
	MessageTypeError            = "error"
)