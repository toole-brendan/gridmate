package websocket

import (
	"encoding/json"
	"time"
)

// MessageType defines the type of WebSocket message
type MessageType string

const (
	// Client to server message types
	MessageTypeAuth             MessageType = "auth"
	MessageTypeChatMessage      MessageType = "chat_message"
	MessageTypeCellUpdate       MessageType = "cell_update"
	MessageTypeRangeData        MessageType = "range_data"
	MessageTypeSelectionChanged MessageType = "selection_changed"
	MessageTypeGetCellValue     MessageType = "get_cell_value"
	MessageTypeGetRangeValues   MessageType = "get_range_values"
	MessageTypeSubscribe        MessageType = "subscribe"
	MessageTypeUnsubscribe      MessageType = "unsubscribe"
	MessageTypeApproveChanges   MessageType = "approve_changes"
	MessageTypeRejectChanges    MessageType = "reject_changes"
	MessageTypeToolResponse     MessageType = "tool_response"

	// Server to client message types
	MessageTypeAuthSuccess      MessageType = "auth_success"
	MessageTypeAuthError        MessageType = "auth_error"
	MessageTypeChatResponse     MessageType = "chat_response"
	MessageTypeCellValueUpdate  MessageType = "cell_value_update"
	MessageTypeRangeDataUpdate  MessageType = "range_data_update"
	MessageTypeError            MessageType = "error"
	MessageTypeNotification     MessageType = "notification"
	MessageTypeChangePreview    MessageType = "change_preview"
	MessageTypeApplyChanges     MessageType = "apply_changes"
	MessageTypeToolRequest      MessageType = "tool_request"
)

// Message is the base structure for all WebSocket messages
type Message struct {
	ID        string          `json:"id"`
	Type      MessageType     `json:"type"`
	Timestamp time.Time       `json:"timestamp"`
	Data      json.RawMessage `json:"data"`
}

// AuthMessage contains authentication credentials
type AuthMessage struct {
	Token string `json:"token"`
}

// ChatMessage represents a chat message from the user
type ChatMessage struct {
	Content      string                 `json:"content"`
	Context      map[string]interface{} `json:"context,omitempty"`
	SessionID    string                 `json:"sessionId"`
	AutonomyMode string                 `json:"autonomyMode,omitempty"`
}

// ChatResponse represents the AI's response to a chat message
type ChatResponse struct {
	Content     string                 `json:"content"`
	Suggestions []string               `json:"suggestions,omitempty"`
	Actions     []ProposedAction       `json:"actions,omitempty"`
	SessionID   string                 `json:"sessionId"`
}

// ProposedAction represents an action the AI wants to perform
type ProposedAction struct {
	ID          string                 `json:"id"`
	Type        string                 `json:"type"`
	Description string                 `json:"description"`
	Parameters  map[string]interface{} `json:"parameters"`
}

// CellUpdate represents an update to a cell value
type CellUpdate struct {
	Sheet    string      `json:"sheet"`
	Cell     string      `json:"cell"`
	Value    interface{} `json:"value"`
	Formula  string      `json:"formula,omitempty"`
	Format   CellFormat  `json:"format,omitempty"`
	Metadata Metadata    `json:"metadata,omitempty"`
}

// CellFormat represents cell formatting information
type CellFormat struct {
	NumberFormat string `json:"numberFormat,omitempty"`
	Font         string `json:"font,omitempty"`
	FontSize     int    `json:"fontSize,omitempty"`
	Bold         bool   `json:"bold,omitempty"`
	Italic       bool   `json:"italic,omitempty"`
	Color        string `json:"color,omitempty"`
	BgColor      string `json:"bgColor,omitempty"`
}

// RangeData represents data for a range of cells
type RangeData struct {
	Sheet    string          `json:"sheet"`
	Range    string          `json:"range"`
	Values   [][]interface{} `json:"values"`
	Formulas [][]string      `json:"formulas,omitempty"`
	Formats  [][]CellFormat  `json:"formats,omitempty"`
	Metadata Metadata        `json:"metadata,omitempty"`
}

// SelectionChanged represents a change in the user's cell selection
type SelectionChanged struct {
	Sheet        string   `json:"sheet"`
	SelectedCell string   `json:"selectedCell,omitempty"`
	SelectedRange string  `json:"selectedRange,omitempty"`
	MultipleRanges []string `json:"multipleRanges,omitempty"`
}

// Metadata contains additional information about cells or ranges
type Metadata struct {
	LastModified time.Time              `json:"lastModified,omitempty"`
	ModifiedBy   string                 `json:"modifiedBy,omitempty"`
	Comments     []Comment              `json:"comments,omitempty"`
	Tags         []string               `json:"tags,omitempty"`
	Custom       map[string]interface{} `json:"custom,omitempty"`
}

// Comment represents a comment on a cell or range
type Comment struct {
	ID        string    `json:"id"`
	Author    string    `json:"author"`
	Content   string    `json:"content"`
	Timestamp time.Time `json:"timestamp"`
	Resolved  bool      `json:"resolved"`
}

// ErrorMessage represents an error response
type ErrorMessage struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	Details string `json:"details,omitempty"`
}

// NotificationMessage represents a notification to the client
type NotificationMessage struct {
	Level   string `json:"level"` // info, warning, error
	Title   string `json:"title"`
	Message string `json:"message"`
	Actions []struct {
		Label  string `json:"label"`
		Action string `json:"action"`
	} `json:"actions,omitempty"`
}

// SubscriptionRequest represents a request to subscribe to cell/range updates
type SubscriptionRequest struct {
	Type   string   `json:"type"` // cell, range, sheet
	Sheets []string `json:"sheets,omitempty"`
	Cells  []string `json:"cells,omitempty"`
	Ranges []string `json:"ranges,omitempty"`
}

// ChangePreview represents a preview of changes to be applied
type ChangePreview struct {
	ID          string           `json:"id"`
	Changes     []CellChange     `json:"changes"`
	Description string           `json:"description"`
	Impact      ChangeImpact     `json:"impact"`
	SessionID   string           `json:"sessionId"`
}

// CellChange represents a single cell change in the preview
type CellChange struct {
	Sheet       string      `json:"sheet"`
	Cell        string      `json:"cell"`
	OldValue    interface{} `json:"oldValue"`
	NewValue    interface{} `json:"newValue"`
	OldFormula  string      `json:"oldFormula,omitempty"`
	NewFormula  string      `json:"newFormula,omitempty"`
	ChangeType  string      `json:"changeType"` // value, formula, format
}

// ChangeImpact describes the impact of proposed changes
type ChangeImpact struct {
	AffectedCells    []string `json:"affectedCells"`
	DependentCells   []string `json:"dependentCells"`
	RecalculationNeeded bool  `json:"recalculationNeeded"`
	RiskLevel        string   `json:"riskLevel"` // low, medium, high
}

// ApplyChangesRequest represents a request to apply previewed changes
type ApplyChangesRequest struct {
	PreviewID   string   `json:"previewId"`
	ChangeIDs   []string `json:"changeIds,omitempty"` // Optional: specific changes to apply
	SkipBackup  bool     `json:"skipBackup,omitempty"`
}

// ApplyChangesResponse represents the result of applying changes
type ApplyChangesResponse struct {
	Success      bool     `json:"success"`
	AppliedCount int      `json:"appliedCount"`
	FailedCount  int      `json:"failedCount"`
	BackupID     string   `json:"backupId,omitempty"`
	Errors       []string `json:"errors,omitempty"`
}

// ParseMessage parses a raw WebSocket message into the appropriate type
func ParseMessage(data []byte) (*Message, error) {
	var msg Message
	if err := json.Unmarshal(data, &msg); err != nil {
		return nil, err
	}
	return &msg, nil
}

// NewMessage creates a new message with the given type and data
func NewMessage(msgType MessageType, data interface{}) (*Message, error) {
	dataBytes, err := json.Marshal(data)
	if err != nil {
		return nil, err
	}

	return &Message{
		ID:        generateMessageID(),
		Type:      msgType,
		Timestamp: time.Now(),
		Data:      dataBytes,
	}, nil
}

// generateMessageID generates a unique message ID
func generateMessageID() string {
	// In production, use a proper UUID generator
	return time.Now().Format("20060102150405.999999999")
}

// ToolRequest represents a request to execute a tool on the client
type ToolRequest struct {
	RequestID string                 `json:"request_id"`
	Tool      string                 `json:"tool"`
	Input     map[string]interface{} `json:"input"`
}

// ToolResponse represents the response from a tool execution
type ToolResponse struct {
	RequestID string      `json:"request_id"`
	Success   bool        `json:"success"`
	Result    interface{} `json:"result,omitempty"`
	Error     string      `json:"error,omitempty"`
}